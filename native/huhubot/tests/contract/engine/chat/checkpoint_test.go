package chat_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"

	blobs "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/blob/store"
	chatdriver "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/chat"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/common"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

type captureEngine struct {
	*common.Engine
	inputs        chan api.EngineInput
	prepare       func(api.EngineInput) api.EngineInput
	prepareResume func(api.EngineResumeInput) api.EngineResumeInput
}

func (e *captureEngine) Run(ctx context.Context, in api.EngineInput, sink func(api.EngineEvent) error) (api.EngineResult, error) {
	select {
	case e.inputs <- in:
	default:
	}
	if e.prepare != nil {
		in = e.prepare(in)
	}
	return e.Engine.Run(ctx, in, sink)
}

func (e *captureEngine) Resume(ctx context.Context, in api.EngineResumeInput, sink func(api.EngineEvent) error) (api.EngineResult, error) {
	if e.prepareResume != nil {
		in = e.prepareResume(in)
	}
	return e.Engine.Resume(ctx, in, sink)
}

func capturedFixture(t *testing.T, endpoint string, allowed []string, writer *noteWriter) (*fixture, *captureEngine, *atomic.Int32) {
	t.Helper()
	driver := chatdriver.NewDriver()
	var resolutions atomic.Int32
	engine := &captureEngine{Engine: common.NewEngine(singleRegistry(t, driver), func(ctx context.Context, ref string) ([]byte, api.CredentialStatus, error) {
		resolutions.Add(1)
		return literalResolver(ctx, ref)
	}), inputs: make(chan api.EngineInput, 1)}
	t.Cleanup(func() {
		engine.Stop()
		waitSignal(t, engine.Done())
		if err := engine.Close(); err != nil {
			t.Error(err)
		}
	})
	f := newFixtureWith(t, endpoint, bootstrap.Options{Engine: engine, EngineVersion: common.EngineVersion, Probe: driver, NoteWriter: writer}, allowed)
	return f, engine, &resolutions
}

func checkpointPayload(t *testing.T, f *fixture, run string) (api.CheckpointArtifact, []byte) {
	t.Helper()
	var raw string
	if err := fixtureDB(t, f).QueryRow("SELECT artifact_json FROM execution_checkpoints WHERE run_id=? ORDER BY ref LIMIT 1", run).Scan(&raw); err != nil {
		t.Fatal(err)
	}
	var a api.CheckpointArtifact
	if err := json.Unmarshal([]byte(raw), &a); err != nil {
		t.Fatal(err)
	}
	store, err := blobs.ReadOnlySource(f.locator)
	if err != nil {
		t.Fatal(err)
	}
	reader, err := store.Open(context.Background(), a)
	if err != nil {
		t.Fatal(err)
	}
	data, err := io.ReadAll(reader)
	closeErr := reader.Close()
	if err != nil || closeErr != nil {
		t.Fatal(err, closeErr)
	}
	return a, data
}

func TestCheckpointInspectionRejectsCompleteSemanticDamageWithoutIO(t *testing.T) {
	var requests atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests.Add(1)
		toolTurn(w, []map[string]any{noteCall(0, "saved-call", "resource:one", "content")})
	}))
	t.Cleanup(server.Close)
	writer := &noteWriter{}
	f, engine, resolutions := capturedFixture(t, server.URL+"/v1", []string{"note.write"}, writer)
	run := f.start(t).RunID
	approval := f.approval(t, run)
	input := <-engine.inputs
	artifact, payload := checkpointPayload(t, f, run)
	calls := resolutions.Load()
	q := api.CheckpointInspection{Run: api.Run{ID: run, SessionID: f.session}, Intent: input.Intent, Config: input.Config, Checkpoint: artifact, Position: api.ExecutionPosition{Phase: "continuation", Continuation: &api.RunContinuation{EffectID: approval.EffectID, Checkpoint: artifact}}}
	q.Reader = bytes.NewReader(payload)
	if err := engine.InspectCheckpoint(context.Background(), q); err != nil {
		t.Fatal("valid complete CP", err)
	}
	for _, tc := range []struct {
		name   string
		mutate func(map[string]any)
	}{
		{"version", func(s map[string]any) { s["Engine"] = "other" }},
		{"protocol", func(s map[string]any) { s["Protocol"] = "openai-responses" }},
		{"run", func(s map[string]any) { s["RunID"] = "run:other" }},
		{"tool_digest", func(s map[string]any) { s["ToolDigest"] = "sha256:" + strings.Repeat("0", 64) }},
		{"position", func(s map[string]any) { s["Next"] = 1 }},
		{"effect", func(s map[string]any) { s["Pending"].(map[string]any)["EffectID"] = "effect:other" }},
		{"original_id", func(s map[string]any) { s["Batch"].([]any)[0].(map[string]any)["ID"] = "call:changed" }},
		{"trailing_user_message", func(s map[string]any) {
			s["Messages"] = append(s["Messages"].([]any), map[string]any{"role": "user", "content": "SECRET_INJECTED_AFTER_PENDING"})
		}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var state map[string]any
			if err := json.Unmarshal(payload, &state); err != nil {
				t.Fatal(err)
			}
			tc.mutate(state)
			data, err := json.Marshal(state)
			if err != nil {
				t.Fatal(err)
			}
			// Publish a new, fully valid HUHUCP1 envelope/digest. Rejection below
			// must come from complete inner semantics, not corrupt outer bytes.
			store, err := blobs.New(f.locator)
			if err != nil {
				t.Fatal(err)
			}
			a, release, err := store.Publish(context.Background(), run, artifact.AttemptID, artifact.Metadata, bytes.NewReader(data))
			if err != nil {
				t.Fatal(err)
			}
			defer release()
			reader, err := store.Open(context.Background(), a)
			if err != nil {
				t.Fatal(err)
			}
			defer reader.Close()
			bad := q
			bad.Checkpoint = a
			bad.Reader = reader
			if err := engine.InspectCheckpoint(context.Background(), bad); err == nil {
				t.Fatal("semantically damaged CP accepted", tc.name)
			}
		})
	}
	for _, data := range [][]byte{payload[:len(payload)-1], append(append([]byte(nil), payload...), []byte(` {"extra":true}`)...)} {
		q.Reader = bytes.NewReader(data)
		if err := engine.InspectCheckpoint(context.Background(), q); err == nil {
			t.Fatal("truncated/trailing payload accepted")
		}
	}
	if requests.Load() != 1 || writer.calls.Load() != 0 || resolutions.Load() != calls {
		t.Fatal("pure inspection performed IO", requests.Load(), writer.calls.Load(), resolutions.Load(), calls)
	}
}

func TestCheckpointPublicationFailuresNeverPublishPendingApproval(t *testing.T) {
	for _, mode := range []string{"filesystem", "size", "transaction"} {
		t.Run(mode, func(t *testing.T) {
			var requests atomic.Int32
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				requests.Add(1)
				calls := []map[string]any{noteCall(0, "call-0", "resource:0", "body")}
				if mode == "size" {
					calls = nil
					for i := 0; i < 6; i++ {
						calls = append(calls, noteCall(i, fmt.Sprint("call-", i), fmt.Sprint("resource:", i), strings.Repeat("x", 120000)))
					}
				}
				toolTurn(w, calls)
			}))
			t.Cleanup(server.Close)
			writer := &noteWriter{}
			f := newFixtureWith(t, server.URL+"/v1", bootstrap.Options{NoteWriter: writer}, []string{"note.write"})
			db := fixtureDB(t, f)
			if mode == "filesystem" {
				if err := os.Rename(filepath.Join(f.locator, "checkpoints"), filepath.Join(f.locator, "checkpoints-unavailable")); err != nil {
					t.Fatal(err)
				}
			}
			if mode == "transaction" {
				if _, err := db.Exec("CREATE TRIGGER reject_cp BEFORE INSERT ON execution_checkpoints BEGIN SELECT RAISE(ABORT,'fixture cp failure'); END"); err != nil {
					t.Fatal(err)
				}
			}
			run := f.terminal(t, f.start(t).RunID)
			var pending int
			if err := db.QueryRow("SELECT count(*) FROM access_approvals WHERE run_id=?", run.ID).Scan(&pending); err != nil {
				t.Fatal(err)
			}
			if run.Status != "failed" || pending != 0 || writer.calls.Load() != 0 || requests.Load() != 1 {
				t.Fatal(run, pending, writer.calls.Load(), requests.Load())
			}
			if mode == "transaction" {
				if _, err := db.Exec("DROP TRIGGER reject_cp"); err != nil {
					t.Fatal(err)
				}
			}
		})
	}
}

func TestChatCheckpointSurvivesRestartAndOriginalDecision(t *testing.T) {
	var requests atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if requests.Add(1) == 1 {
			toolTurn(w, []map[string]any{noteCall(0, "original-call", "resource:one", "body")})
			return
		}
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Error(err)
		}
		found := false
		for _, v := range body["messages"].([]any) {
			m := v.(map[string]any)
			if m["role"] == "tool" && m["tool_call_id"] == "original-call" && strings.Contains(m["content"].(string), "APPROVAL_REJECTED") {
				found = true
			}
		}
		if !found {
			t.Error("restart lost original decision", body)
		}
		textTurn(w, "restarted safely", "stop", nil, true)
	}))
	t.Cleanup(server.Close)
	writer := &noteWriter{}
	f := newFixtureWith(t, server.URL+"/v1", bootstrap.Options{NoteWriter: writer}, []string{"note.write"})
	run := f.start(t).RunID
	approval := f.approval(t, run)
	artifact, before := checkpointPayload(t, f, run)
	if err := f.core.Close(); err != nil {
		t.Fatal(err)
	}
	waitSignal(t, f.core.Done())
	budget := api.BudgetPolicy{RootTokenLimit: "1000000", ProfileTokenLimit: "10000000"}
	core, err := bootstrap.OpenWithOptions(context.Background(), filepath.Dir(f.locator), f.locator, bootstrap.Options{ExecutorPaused: true, NoteWriter: writer, Budget: budget})
	if err != nil {
		t.Fatal(err)
	}
	f.core = core
	status, err := core.API.Service.Status(context.Background(), owner)
	if err != nil {
		t.Fatal(err)
	}
	f.epoch = status.Profile.CommandEpoch
	f.decide(t, approval, "reject")
	_, after := checkpointPayload(t, f, run)
	if !bytes.Equal(before, after) {
		t.Fatal("immutable CP changed after decision", artifact.Ref)
	}
	if err := core.Close(); err != nil {
		t.Fatal(err)
	}
	waitSignal(t, core.Done())
	// Session-memory refs cannot be reused after restart by design. This CP
	// test injects only the private resolver; SDK, broker, ledger and Executor
	// remain real. Default credential composition is covered independently.
	driver := chatdriver.NewDriver()
	engine := common.NewEngine(singleRegistry(t, driver), literalResolver)
	t.Cleanup(func() {
		engine.Stop()
		waitSignal(t, engine.Done())
		if err := engine.Close(); err != nil {
			t.Error(err)
		}
	})
	core, err = bootstrap.OpenWithOptions(context.Background(), filepath.Dir(f.locator), f.locator, bootstrap.Options{NoteWriter: writer, Engine: engine, EngineVersion: common.EngineVersion, Probe: driver, Budget: budget})
	if err != nil {
		t.Fatal(err)
	}
	f.core = core
	r := f.terminal(t, run)
	if r.Status != "succeeded" || writer.calls.Load() != 0 || requests.Load() != 2 {
		t.Fatal(r, writer.calls.Load(), requests.Load())
	}
}
