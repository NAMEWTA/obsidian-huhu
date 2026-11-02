package chat_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

func TestExpiredReplayedAndUnknownApprovalKeepOriginalEffect(t *testing.T) {
	for _, mode := range []string{"expired", "reject_replay", "unknown"} {
		t.Run(mode, func(t *testing.T) {
			var requests atomic.Int32
			var resultText atomic.Value
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if requests.Add(1) == 1 {
					toolTurn(w, []map[string]any{noteCall(0, "original-decision-call", "resource:one", "body")})
					return
				}
				var body map[string]any
				if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
					t.Error(err)
				}
				for _, v := range body["messages"].([]any) {
					m := v.(map[string]any)
					if m["role"] == "tool" {
						if m["tool_call_id"] != "original-decision-call" {
							t.Error("decision lost original call", m)
						}
						resultText.Store(m["content"].(string))
					}
				}
				textTurn(w, "decision acknowledged", "stop", nil, true)
			}))
			t.Cleanup(server.Close)
			writer := &noteWriter{unknown: mode == "unknown"}
			options := bootstrap.Options{NoteWriter: writer}
			if mode == "expired" {
				options.ApprovalLifetime = 300 * time.Millisecond
			}
			f := newFixtureWith(t, server.URL+"/v1", options, []string{"note.write"})
			run := f.start(t).RunID
			a := f.approval(t, run)
			switch mode {
			case "unknown":
				f.decide(t, a, "approve")
			case "reject_replay":
				q := api.ApprovalResolve{CommandMeta: f.meta(a.Revision), ID: a.ID, EffectID: a.EffectID, Decision: "reject", PreviewHash: a.Preview.PreviewHash}
				for i := 0; i < 2; i++ {
					if _, err := f.core.API.Approvals.Resolve(context.Background(), owner, q); err != nil {
						t.Fatal(err)
					}
				}
			}
			r := f.terminal(t, run)
			if mode == "unknown" {
				if r.Status != "failed" || !r.EffectsUnresolved || requests.Load() != 1 || writer.calls.Load() != 1 {
					t.Fatal(r, requests.Load(), writer.calls.Load())
				}
				var count int
				if err := fixtureDB(t, f).QueryRow("SELECT count(*) FROM execution_effects WHERE run_id=? AND state='unknown_outcome'", run).Scan(&count); err != nil || count != 1 {
					t.Fatal(count, err)
				}
			} else {
				if r.Status != "succeeded" || requests.Load() != 2 || writer.calls.Load() != 0 {
					t.Fatal(r, requests.Load(), writer.calls.Load())
				}
				reason := "APPROVAL_REJECTED"
				if mode == "expired" {
					reason = "APPROVAL_EXPIRED"
				}
				content, _ := resultText.Load().(string)
				if !strings.Contains(content, reason) {
					t.Fatal("lost explicit durable decision", content, reason)
				}
			}
		})
	}
}
