package responses_test

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"reflect"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	blobs "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/blob/store"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/common"
	driver "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/responses"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
)

type captureEngine struct {
	*common.Engine
	inputs  chan api.EngineInput
	prepare func(api.EngineInput) api.EngineInput
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

func waitSignal(t *testing.T, signal <-chan struct{}) {
	t.Helper()
	select {
	case <-signal:
	case <-time.After(5 * time.Second):
		t.Fatal("producer barrier not reached")
	}
}

func newResponseEngine(t *testing.T, resolve common.CredentialResolver) (*common.Engine, *common.Registry) {
	t.Helper()
	d, err := driver.NewDriver()
	if err != nil {
		t.Fatal(err)
	}
	r, err := common.NewRegistry(d)
	if err != nil {
		d.Stop()
		waitSignal(t, d.Done())
		_ = d.Close()
		t.Fatal(err)
	}
	e := common.NewEngine(r, resolve)
	t.Cleanup(func() {
		e.Stop()
		waitSignal(t, e.Done())
		if err := e.Close(); err != nil {
			t.Error(err)
		}
	})
	return e, r
}

func capturedResponseFixture(t *testing.T, endpoint string, allowed []string, writer *fixtureWriter) (*responseFixture, *captureEngine, *atomic.Int32) {
	t.Helper()
	var resolutions atomic.Int32
	e, r := newResponseEngine(t, func(context.Context, string) ([]byte, api.CredentialStatus, error) {
		resolutions.Add(1)
		return []byte("synthetic-responses-key"), api.CredentialStatus{State: "available"}, nil
	})
	engine := &captureEngine{Engine: e, inputs: make(chan api.EngineInput, 1)}
	f := newResponseFixture(t, endpoint, bootstrap.Options{Engine: engine, EngineVersion: driver.EngineVersion, Probe: r, NoteWriter: writer}, allowed)
	return f, engine, &resolutions
}

func checkpointPayload(t *testing.T, f *responseFixture, run string) (api.CheckpointArtifact, []byte) {
	t.Helper()
	var raw string
	if err := responseDB(t, f).QueryRow("SELECT c.artifact_json FROM execution_checkpoints c JOIN execution_runs r ON r.checkpoint_ref=c.ref WHERE r.run_id=?", run).Scan(&raw); err != nil {
		t.Fatal(err)
	}
	var artifact api.CheckpointArtifact
	if err := json.Unmarshal([]byte(raw), &artifact); err != nil {
		t.Fatal(err)
	}
	store, err := blobs.ReadOnlySource(f.locator)
	if err != nil {
		t.Fatal(err)
	}
	reader, err := store.Open(context.Background(), artifact)
	if err != nil {
		t.Fatal(err)
	}
	data, err := io.ReadAll(reader)
	closeErr := reader.Close()
	if err != nil || closeErr != nil {
		t.Fatal(err, closeErr)
	}
	return artifact, data
}

type publishedCheckpoint struct {
	api.CheckpointAccess
	store *blobs.Store
}

func (p publishedCheckpoint) Open(ctx context.Context, artifact api.CheckpointArtifact) (io.ReadCloser, error) {
	return p.store.Open(ctx, artifact)
}

func TestCompleteResponsesCheckpointRejectsSemanticDamageBeforeResumeIO(t *testing.T) {
	var requests atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests.Add(1)
		stream := mixedTurn(mixedItems())
		stream.write(w)
	}))
	t.Cleanup(server.Close)
	writer := &fixtureWriter{}
	f, engine, resolutions := capturedResponseFixture(t, server.URL+"/v1", []string{"note.write"}, writer)
	run := f.start(t)
	approval := f.approval(t, run)
	input := <-engine.inputs
	artifact, payload := checkpointPayload(t, f, run)
	baselineResolutions := resolutions.Load()
	q := api.CheckpointInspection{Run: api.Run{ID: run, SessionID: f.session}, Intent: input.Intent, Config: input.Config, Checkpoint: artifact, Reader: bytes.NewReader(payload), Position: api.ExecutionPosition{Phase: "continuation", Continuation: &api.RunContinuation{EffectID: approval.EffectID, Checkpoint: artifact}}}
	if err := engine.InspectCheckpoint(context.Background(), q); err != nil {
		t.Fatal("actual complete Responses CP", err)
	}
	var original map[string]any
	if json.Unmarshal(payload, &original) != nil || original["Format"] != "huhu-model-state-v2" || original["Engine"] != driver.EngineVersion || original["ProtocolState"] == "" {
		t.Fatal("Responses identity or required opaque state absent")
	}
	for _, mode := range []string{"missing_state", "state_format", "extra_state_field", "turn", "message_position", "missing_item", "output_index", "reordered_items", "call_id", "incomplete_item", "program_context", "unknown_phase", "forged_projection", "accepted_intent", "protocol"} {
		t.Run(mode, func(t *testing.T) {
			var outer, state map[string]any
			_ = json.Unmarshal(payload, &outer)
			_ = json.Unmarshal([]byte(outer["ProtocolState"].(string)), &state)
			round := state["Rounds"].([]any)[0].(map[string]any)
			items := round["Items"].([]any)
			mutateItem := func(index int, change func(map[string]any)) {
				saved := items[index].(map[string]any)
				var value map[string]any
				_ = json.Unmarshal([]byte(saved["Raw"].(string)), &value)
				change(value)
				encoded, _ := json.Marshal(value)
				saved["Raw"] = string(encoded)
			}
			switch mode {
			case "state_format":
				state["Format"] = "other"
			case "extra_state_field":
				state["HiddenExecution"] = true
			case "turn":
				round["Turn"] = 2
			case "message_position":
				round["MessageIndex"] = 0
			case "missing_item":
				round["Items"] = items[:3]
			case "output_index":
				items[1].(map[string]any)["OutputIndex"] = 0
			case "reordered_items":
				items[1], items[3] = items[3], items[1]
				items[1].(map[string]any)["OutputIndex"] = 1
				items[3].(map[string]any)["OutputIndex"] = 3
			case "call_id":
				mutateItem(1, func(m map[string]any) { m["call_id"] = "forged-call" })
			case "incomplete_item":
				mutateItem(1, func(m map[string]any) { m["status"] = "incomplete" })
			case "program_context":
				mutateItem(1, func(m map[string]any) { m["caller"] = map[string]any{"type": "program", "caller_id": "hidden"} })
			case "unknown_phase":
				mutateItem(2, func(m map[string]any) { m["phase"] = "execute" })
			case "forged_projection":
				outer["Text"] = "forged"
				outer["Messages"].([]any)[int(outer["Initial"].(float64))].(map[string]any)["content"] = "forged"
			case "accepted_intent":
				outer["Messages"].([]any)[int(outer["Initial"].(float64))-1].(map[string]any)["content"] = "forged intent"
			case "protocol":
				outer["Protocol"] = "openai-chat"
			}
			encoded, _ := json.Marshal(state)
			outer["ProtocolState"] = string(encoded)
			if mode == "missing_state" {
				delete(outer, "ProtocolState")
			}
			bad, err := json.Marshal(outer)
			if err != nil {
				t.Fatal(err)
			}
			store, err := blobs.New(f.locator)
			if err != nil {
				t.Fatal(err)
			}
			// The outer HUHUCP1 envelope and digest are freshly valid. Both
			// consumers must reject inner semantics before resolving any key.
			a, release, err := store.Publish(context.Background(), run, artifact.AttemptID, artifact.Metadata, bytes.NewReader(bad))
			if err != nil {
				t.Fatal(err)
			}
			defer release()
			reader, err := store.Open(context.Background(), a)
			if err != nil {
				t.Fatal(err)
			}
			inspection := q
			inspection.Checkpoint, inspection.Reader = a, reader
			inspectErr := engine.InspectCheckpoint(context.Background(), inspection)
			closeErr := reader.Close()
			if inspectErr == nil || closeErr != nil {
				t.Fatal("pure Inspector accepted semantic damage", mode, inspectErr, closeErr)
			}
			in := input
			in.Checkpoints = publishedCheckpoint{CheckpointAccess: input.Checkpoints, store: store}
			_, err = engine.Resume(context.Background(), api.EngineResumeInput{Input: in, CheckpointRef: a.Ref, Checkpoint: a, Decision: api.ToolResult{Status: "denied", EffectID: approval.EffectID, Reason: "APPROVAL_REJECTED"}}, nil)
			if err == nil {
				t.Fatal("Resume accepted semantic damage", mode)
			}
			if resolutions.Load() != baselineResolutions || requests.Load() != 1 || writer.writes.Load() != 0 {
				t.Fatal("checkpoint validation performed IO", mode, resolutions.Load(), requests.Load(), writer.writes.Load())
			}
		})
	}
}

func TestTwoCallCheckpointReopensAndResumesOriginalOpaqueDecisions(t *testing.T) {
	items := mixedItems()
	var requests atomic.Int32
	bodies := make(chan map[string]json.RawMessage, 3)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" || r.URL.Path != "/v1/responses" {
			t.Error("local checkpoint must not query remote history", r.Method, r.URL.Path)
		}
		var body map[string]json.RawMessage
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Error(err)
		}
		bodies <- body
		if requests.Add(1) == 1 {
			stream := mixedTurn(items)
			stream.write(w)
			return
		}
		w.Header().Set("Content-Type", "text/event-stream")
		fmt.Fprint(w, successfulTextStream)
	}))
	t.Cleanup(server.Close)
	writer := &fixtureWriter{}
	f := newResponseFixture(t, server.URL+"/v1", bootstrap.Options{NoteWriter: writer}, []string{"note.write"})
	run := f.start(t)
	first := f.approval(t, run)
	f.decide(t, first, "approve")
	second := f.approval(t, run)
	if second.EffectID == first.EffectID || writer.writes.Load() != 1 || requests.Load() != 1 {
		t.Fatal("original batch not at second gate", first, second, writer.writes.Load(), requests.Load())
	}
	artifact, before := checkpointPayload(t, f, run)
	closeCore(t, f.core)
	budget := api.BudgetPolicy{RootTokenLimit: "1000000", ProfileTokenLimit: "10000000"}
	core, err := bootstrap.OpenWithOptions(context.Background(), filepath.Dir(f.locator), f.locator, bootstrap.Options{ExecutorPaused: true, Budget: budget})
	if err != nil {
		t.Fatal(err)
	}
	f.core = core
	status, err := core.API.Service.Status(context.Background(), responsesOwner)
	if err != nil {
		t.Fatal(err)
	}
	f.epoch = status.Profile.CommandEpoch
	current, err := core.API.Assistant.Get(context.Background(), responsesOwner, api.IDQuery{ProfileID: f.profile, ID: f.agent})
	if err != nil || current.Model == nil || current.Model.CredentialStatus.State != "missing" || requests.Load() != 1 {
		t.Fatal("default restart must lose session-memory secret", current.Model, err, requests.Load())
	}
	f.decide(t, second, "reject")
	_, after := checkpointPayload(t, f, run)
	if !bytes.Equal(before, after) {
		t.Fatal("approval decision rewrote immutable checkpoint", artifact.Ref)
	}
	closeCore(t, core)
	// This is an explicit synthetic credential-provider positive control, not
	// a product mechanism for restoring session-memory secrets or reusing refs.
	entered, release := make(chan struct{}), make(chan struct{})
	var once, enteredOnce sync.Once
	unblock := func() { once.Do(func() { close(release) }) }
	defer unblock()
	e, registry := newResponseEngine(t, func(ctx context.Context, _ string) ([]byte, api.CredentialStatus, error) {
		enteredOnce.Do(func() { close(entered) })
		select {
		case <-release:
			return []byte("synthetic-responses-key"), api.CredentialStatus{State: "available"}, nil
		case <-ctx.Done():
			return nil, api.CredentialStatus{State: "missing"}, ctx.Err()
		}
	})
	core, err = bootstrap.OpenWithOptions(context.Background(), filepath.Dir(f.locator), f.locator, bootstrap.Options{Engine: e, EngineVersion: driver.EngineVersion, Probe: registry, Budget: budget})
	if err != nil {
		t.Fatal(err)
	}
	f.core = core
	waitSignal(t, entered)
	// The same pinned ref/profile must be currently available before the fake
	// provider releases the secret. No Run/config/decision/attempt is rewritten.
	db, err := sql.Open("sqlite3", "file:"+filepath.Join(f.locator, "profile.sqlite3")+"?mode=rw")
	if err != nil {
		t.Fatal(err)
	}
	result, err := db.Exec("UPDATE credential_metadata SET state='available',reason='' WHERE credential_ref=? AND profile_id=?", current.Model.CredentialRef, f.profile)
	if err != nil {
		_ = db.Close()
		t.Fatal(err)
	}
	changed, err := result.RowsAffected()
	closeErr := db.Close()
	if err != nil || closeErr != nil || changed != 1 || requests.Load() != 1 {
		t.Fatal("controlled current metadata not installed before HTTP", changed, err, closeErr, requests.Load())
	}
	unblock()
	terminal := f.terminal(t, run)
	if terminal.Status != "succeeded" || writer.writes.Load() != 1 || requests.Load() != 2 {
		t.Fatal("restart repeated original effect or lost continuation", terminal, writer.writes.Load(), requests.Load())
	}
	<-bodies
	var input []json.RawMessage
	if err := json.Unmarshal((<-bodies)["input"], &input); err != nil || len(input) != 9 {
		t.Fatal("restart omitted full local items", len(input), err)
	}
	responsesInitialPrefix(t, input, "one intention")
	for i, item := range items {
		var original, replay any
		_ = json.Unmarshal(item, &original)
		_ = json.Unmarshal(input[i+3], &replay)
		if !reflect.DeepEqual(original, replay) {
			t.Fatal("restart changed raw native item", i, string(input[i+3]))
		}
	}
	for i, id := range []string{"call_first", "call_second"} {
		var value map[string]any
		_ = json.Unmarshal(input[7+i], &value)
		output, _ := value["output"].(string)
		if value["type"] != "function_call_output" || value["call_id"] != id || len(value) != 3 || strings.Contains(output, "Token") || i == 0 && !strings.Contains(output, first.EffectID) || i == 1 && !strings.Contains(output, "APPROVAL_REJECTED") {
			t.Fatal("restart result identity or decision changed", value)
		}
	}
}
