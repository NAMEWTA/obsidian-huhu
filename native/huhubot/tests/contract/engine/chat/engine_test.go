package chat_test

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

var owner = api.NewConnectionIdentity("chat-protocol", "owner", true)

func chatShortTerm(t *testing.T, message any, intent string) api.ShortTermInput {
	t.Helper()
	encoded, err := json.Marshal(message)
	if err != nil {
		t.Fatal(err)
	}
	var envelope struct{ Role, Content string }
	if err = json.Unmarshal(encoded, &envelope); err != nil || envelope.Role != "user" || !strings.HasPrefix(envelope.Content, api.ShortTermMarker) {
		t.Fatal("missing actual short-term protocol block", string(encoded), err)
	}
	var block api.ShortTermInput
	if err = json.Unmarshal([]byte(strings.TrimPrefix(envelope.Content, api.ShortTermMarker)), &block); err != nil {
		t.Fatal("invalid short-term protocol block", err)
	}
	digest, err := api.CanonicalShortTermBinding(block)
	if err != nil || block.BindingDigest != digest || block.IntentHash != fmt.Sprintf("sha256:%x", sha256.Sum256([]byte(intent))) {
		t.Fatal("short-term binding or accepted intent changed", block, err)
	}
	return block
}

type fixture struct {
	core                                    *bootstrap.Core
	profile, epoch, agent, session, locator string
	sequence                                int
}

func newFixture(t *testing.T, endpoint string) *fixture {
	return newFixtureWith(t, endpoint, bootstrap.Options{}, nil)
}

func newFixtureWith(t *testing.T, endpoint string, options bootstrap.Options, allowed []string) *fixture {
	t.Helper()
	root := filepath.Join(t.TempDir(), "profiles")
	if err := os.Mkdir(root, 0700); err != nil {
		t.Fatal(err)
	}
	f := &fixture{locator: filepath.Join(root, "one")}
	var err error
	options.Budget = api.BudgetPolicy{RootTokenLimit: "1000000", ProfileTokenLimit: "10000000"}
	f.core, err = bootstrap.OpenWithOptions(context.Background(), root, f.locator, options)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := f.core.Close(); err != nil {
			t.Error("core drain", err)
		}
		select {
		case <-f.core.Done():
		case <-time.After(5 * time.Second):
			t.Error("core did not actually drain")
		}
	})
	status, err := f.core.API.Service.Status(context.Background(), owner)
	if err != nil {
		t.Fatal(err)
	}
	f.profile, f.epoch = status.Profile.ProfileID, status.Profile.CommandEpoch
	workspace := ""
	if writer, ok := options.NoteWriter.(*noteWriter); ok && writer != nil {
		writer.host = f.core.API.Host
		workspace = "workspace:fixture"
		if _, err = f.core.API.Host.Attach(context.Background(), owner, api.HostAttachCommand{WorkspaceID: workspace, Capabilities: []string{"note.write"}}, noHost{}); err != nil {
			t.Fatal(err)
		}
	}
	ref := "credential:11111111111111111111111111111111"
	if _, err = f.core.Credentials.Register(context.Background(), f.profile, ref, "session-memory", []byte("synthetic-key")); err != nil {
		t.Fatal(err)
	}
	agent, err := f.core.API.Assistant.Create(context.Background(), owner, api.AgentCreate{CommandMeta: f.meta(""), Draft: api.AgentDraft{Name: "protocol", Persona: `Keep literal {"sample":{"x":1}}.`, AllowedTools: allowed, Model: &api.ModelBindingDraft{ProviderID: "fixture", Protocol: "openai-chat-completions", Endpoint: endpoint, ModelID: "fixture-model", CredentialRef: ref}}})
	if err != nil {
		t.Fatal(err)
	}
	f.agent = agent.ID
	session, err := f.core.API.Conversation.CreateSession(context.Background(), owner, api.SessionCreate{CommandMeta: f.meta(""), Kind: "direct", Title: "protocol", MemberIDs: []string{agent.ID}, WorkspaceID: workspace})
	if err != nil {
		t.Fatal(err)
	}
	f.session = session.ID
	return f
}

func (f *fixture) meta(rev string) api.CommandMeta {
	f.sequence++
	key := fmt.Sprintf("chat:%d", f.sequence)
	return api.CommandMeta{CommandID: key, IdempotencyKey: key, ProfileID: f.profile, CommandEpoch: f.epoch, ExpectedRevision: rev}
}

func (f *fixture) start(t *testing.T) api.RunReceipt {
	t.Helper()
	s, err := f.core.API.Conversation.GetSession(context.Background(), owner, api.IDQuery{ProfileID: f.profile, ID: f.session})
	if err != nil {
		t.Fatal(err)
	}
	r, err := f.core.API.Conversation.StartRun(context.Background(), owner, api.RunStart{CommandMeta: f.meta(s.Revision), SessionID: f.session, Intent: "one intention", SourceRefs: []api.SourceSnapshot{}})
	if err != nil {
		t.Fatal(err)
	}
	return r
}

func (f *fixture) terminal(t *testing.T, id string) api.Run {
	t.Helper()
	deadline := time.NewTimer(8 * time.Second)
	defer deadline.Stop()
	tick := time.NewTicker(5 * time.Millisecond)
	defer tick.Stop()
	for {
		r, err := f.core.API.Conversation.GetRun(context.Background(), owner, api.IDQuery{ProfileID: f.profile, ID: id})
		if err != nil {
			t.Fatal(err)
		}
		if r.Status == "succeeded" || r.Status == "failed" || r.Status == "canceled" {
			return r
		}
		select {
		case <-tick.C:
		case <-deadline.C:
			t.Fatal("run did not terminate", r)
		}
	}
}

func TestOneHTTPPersistsLiteralPersonaAndSettledUsage(t *testing.T) {
	var requests atomic.Int32
	captured := make(chan map[string]any, 1)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests.Add(1)
		if r.URL.Path != "/v1/chat/completions" || r.Header.Get("Authorization") != "Bearer synthetic-key" {
			t.Error("explicit destination/credential missing", r.URL.Path)
		}
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Error(err)
		}
		captured <- body
		w.Header().Set("Content-Type", "text/event-stream")
		fmt.Fprint(w, "data: {\"id\":\"fixture\",\"choices\":[{\"index\":0,\"delta\":{\"role\":\"assistant\",\"content\":\"durable answer\"},\"finish_reason\":null}]}\n\n")
		fmt.Fprint(w, "data: {\"id\":\"fixture\",\"choices\":[{\"index\":0,\"delta\":{},\"finish_reason\":\"stop\"}]}\n\n")
		fmt.Fprint(w, "data: {\"choices\":[],\"usage\":{\"prompt_tokens\":9,\"completion_tokens\":4,\"total_tokens\":13}}\n\ndata: [DONE]\n\n")
	}))
	t.Cleanup(server.Close)
	f := newFixture(t, server.URL+"/v1")
	r := f.terminal(t, f.start(t).RunID)
	if r.Status != "succeeded" {
		t.Fatalf("real Chat adapter did not finish: %#v; HTTP=%d", r, requests.Load())
	}
	if requests.Load() != 1 {
		t.Fatal("unexpected physical HTTP count", requests.Load())
	}
	body := <-captured
	if body["max_completion_tokens"] != float64(4096) || body["stream"] != true {
		t.Fatal("finite streaming request", body)
	}
	msgs := body["messages"].([]any)
	if len(msgs) != 3 || msgs[0].(map[string]any)["content"] != `Keep literal {"sample":{"x":1}}.` || msgs[2].(map[string]any)["content"] != "one intention" {
		t.Fatal("literal persona/current intention changed", msgs)
	}
	if block := chatShortTerm(t, msgs[1], "one intention"); len(block.Entries) != 0 {
		t.Fatal("first Run invented prior short-term history", block)
	}
	h, err := f.core.API.Conversation.History(context.Background(), owner, api.HistoryQuery{PageQuery: api.PageQuery{ProfileID: f.profile}, SessionID: f.session})
	if err != nil || len(h.Items) != 2 || h.Items[1].Text != "durable answer" {
		t.Fatal("durable messages", h, err)
	}
	if r.Usage == nil || r.Usage.Knowledge != "known" || r.Usage.InputTokens != "9" || r.Usage.OutputTokens != "4" {
		t.Fatal("ledger usage", r.Usage)
	}
	db, err := sql.Open("sqlite3", filepath.Join(f.locator, "profile.sqlite3"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	var count int
	if err = db.QueryRow("SELECT count(*) FROM model_attempts WHERE run_id=? AND state='settled' AND producer_ended=1 AND input_tokens='9' AND output_tokens='4'", r.ID).Scan(&count); err != nil || count != 1 {
		t.Fatal("physical producer settlement", count, err)
	}
}
