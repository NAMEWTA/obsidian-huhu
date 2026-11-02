package chat_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

// The real Broker still publishes a new, valid HUHUCP1 and reference. This
// bounded seam simulates a payload producer error before immutable publication.
type intentPayload struct {
	api.CheckpointAccess
	mode string
}

func (p intentPayload) Publish(ctx context.Context, reader io.Reader) (api.CheckpointArtifact, error) {
	data, err := io.ReadAll(reader)
	if err != nil {
		return api.CheckpointArtifact{}, err
	}
	var s map[string]any
	if err = json.Unmarshal(data, &s); err != nil {
		return api.CheckpointArtifact{}, err
	}
	messages := s["Messages"].([]any)
	initial := int(s["Initial"].(float64))
	switch p.mode {
	case "intent":
		messages[initial-1].(map[string]any)["content"] = "REPLACED_PRIVATE_PROVIDER_INTENT"
	case "persona":
		messages[0].(map[string]any)["content"] = "REPLACED_PRIVATE_PERSONA"
	case "tail":
		s["Messages"] = append(messages, map[string]any{"role": "user", "content": "REPLACED_PRIVATE_TAIL"})
	}
	data, err = json.Marshal(s)
	if err != nil {
		return api.CheckpointArtifact{}, err
	}
	return p.CheckpointAccess.Publish(ctx, bytes.NewReader(data))
}

func TestCheckpointIntentUsesAcceptedRunBeforeResumeIO(t *testing.T) {
	for _, mode := range []string{"normal_reject", "normal_approve", "history_refresh", "intent", "persona", "tail"} {
		t.Run(mode, func(t *testing.T) {
			var requests atomic.Int32
			resumed := make(chan map[string]any, 1)
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if requests.Add(1) == 1 {
					toolTurn(w, []map[string]any{noteCall(0, "bound-intent-call", "resource:one", "original body")})
					return
				}
				var body map[string]any
				if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
					t.Error(err)
				}
				resumed <- body
				textTurn(w, "original task completed", "stop", nil, true)
			}))
			t.Cleanup(server.Close)
			writer := &noteWriter{}
			f, engine, resolutions := capturedFixture(t, server.URL+"/v1", []string{"note.write"}, writer)
			engine.prepare = func(in api.EngineInput) api.EngineInput {
				if mode == "history_refresh" {
					// This deliberately exercises the supported legacy adapter input.
					// A legacy History and a sealed ShortTerm cannot coexist.
					in.ShortTerm = nil
					in.History = []api.VisibleMessage{{Role: "user", Text: "approved prior history"}, {Role: "assistant", Text: "prior answer"}}
				}
				in.Checkpoints = intentPayload{CheckpointAccess: in.Checkpoints, mode: mode}
				return in
			}
			if mode == "history_refresh" {
				engine.prepareResume = func(resume api.EngineResumeInput) api.EngineResumeInput {
					resume.Input.ShortTerm = nil
					resume.Input.History = []api.VisibleMessage{{Role: "user", Text: "newly filtered history"}}
					return resume
				}
			}
			run := f.start(t).RunID
			a := f.approval(t, run)
			input := <-engine.inputs
			artifact, payload := checkpointPayload(t, f, run)
			before := resolutions.Load()
			q := api.CheckpointInspection{Run: api.Run{ID: run, SessionID: f.session}, Intent: input.Intent, Config: input.Config, Checkpoint: artifact, Reader: bytes.NewReader(payload), Position: api.ExecutionPosition{Phase: "continuation", Continuation: &api.RunContinuation{EffectID: a.EffectID, Checkpoint: artifact}}}
			if mode != "history_refresh" {
				q.ShortTerm = input.ShortTerm
			}
			bad := mode == "intent" || mode == "persona" || mode == "tail"
			inspectErr := engine.InspectCheckpoint(context.Background(), q)
			if (inspectErr != nil) != bad {
				t.Fatal("pure accepted-intent check", mode, inspectErr)
			}
			if resolutions.Load() != before || requests.Load() != 1 || writer.calls.Load() != 0 {
				t.Fatal("inspection performed IO")
			}
			// Current filtered history can legitimately differ after suspension. It
			// is not substituted for the saved prefix or compared as a frozen hash.
			decision := "reject"
			if mode == "normal_approve" {
				decision = "approve"
			}
			f.decide(t, a, decision)
			r := f.terminal(t, run)
			if bad {
				if r.Status != "failed" || requests.Load() != 1 || resolutions.Load() != before || writer.calls.Load() != 0 {
					t.Fatal("damaged CP reached Resume IO", r, requests.Load(), resolutions.Load(), writer.calls.Load())
				}
			} else {
				if r.Status != "succeeded" || requests.Load() != 2 || resolutions.Load() != before+1 {
					t.Fatal("accepted original task failed", r, requests.Load(), resolutions.Load())
				}
				wantHost := int32(0)
				if mode == "normal_approve" {
					wantHost = 1
				}
				if writer.calls.Load() != wantHost {
					t.Fatal("effect replayed", writer.calls.Load())
				}
				body := <-resumed
				intentCount := 0
				originalCall := false
				oldHistory := false
				for _, v := range body["messages"].([]any) {
					m := v.(map[string]any)
					text, _ := m["content"].(string)
					if text == input.Intent {
						intentCount++
					}
					if strings.HasPrefix(text, api.ShortTermMarker) {
						block := chatShortTerm(t, m, input.Intent)
						if mode == "history_refresh" || len(block.Entries) != 0 {
							t.Fatal("ordinary checkpoint invented prior history", block)
						}
					}
					if text == "approved prior history" {
						oldHistory = true
					}
					if strings.Contains(text, "REPLACED_PRIVATE") {
						t.Fatal("modified payload escaped", text)
					}
					if m["role"] == "tool" && m["tool_call_id"] == "bound-intent-call" {
						originalCall = true
						if mode != "normal_approve" && !strings.Contains(text, "APPROVAL_REJECTED") {
							t.Fatal("decision lost", m)
						}
					}
				}
				if intentCount != 1 || !originalCall || (mode == "history_refresh" && !oldHistory) {
					t.Fatal("original task/call/prefix not retained", intentCount, originalCall, oldHistory)
				}
			}
			var attempts, ended int
			if err := fixtureDB(t, f).QueryRow("SELECT count(*),sum(CASE WHEN state='settled' AND producer_ended=1 THEN 1 ELSE 0 END) FROM model_attempts WHERE run_id=?", run).Scan(&attempts, &ended); err != nil {
				t.Fatal(err)
			}
			if int32(attempts) != requests.Load() || ended != attempts {
				t.Fatal("producer not settled", attempts, ended, requests.Load())
			}
			if err := f.core.Close(); err != nil {
				t.Fatal(err)
			}
			waitSignal(t, f.core.Done())
			engine.Stop()
			waitSignal(t, engine.Done())
		})
	}
}
