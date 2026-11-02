package chat_test

import (
	"bytes"
	"context"
	"encoding/json"
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
	"github.com/cloudwego/eino/schema"
)

type legacyCompatibilitySample struct {
	Input      api.EngineInput
	Resume     api.EngineResumeInput
	Inspection api.CheckpointInspection
	Artifact   api.CheckpointArtifact
}

func readLegacySample(t *testing.T) (legacyCompatibilitySample, []byte) {
	t.Helper()
	var sample legacyCompatibilitySample
	data, err := os.ReadFile(filepath.Join("testdata", "chat-v1", "trusted-inputs.json"))
	if err != nil || json.Unmarshal(data, &sample) != nil {
		t.Fatal("read frozen trusted sample", err)
	}
	payload, err := os.ReadFile(filepath.Join("testdata", "chat-v1", "checkpoint.json"))
	if err != nil {
		t.Fatal(err)
	}
	return sample, payload
}

type legacyCheckpointAccess struct {
	payload, published []byte
	artifact           api.CheckpointArtifact
}

func (c *legacyCheckpointAccess) Metadata() api.CheckpointMetadata { return c.artifact.Metadata }
func (c *legacyCheckpointAccess) Open(context.Context, api.CheckpointArtifact) (io.ReadCloser, error) {
	return io.NopCloser(bytes.NewReader(c.payload)), nil
}
func (c *legacyCheckpointAccess) Publish(_ context.Context, r io.Reader) (api.CheckpointArtifact, error) {
	var err error
	c.published, err = io.ReadAll(r)
	return c.artifact, err
}

type invokeFunc func(context.Context, api.ToolCall) (api.ToolResult, error)

func (f invokeFunc) Invoke(ctx context.Context, c api.ToolCall) (api.ToolResult, error) {
	return f(ctx, c)
}

func TestLegacyChatCheckpointBytesInspectorAndResumeStayCompatible(t *testing.T) {
	sample, payload := readLegacySample(t)
	var old struct {
		ToolDigest string
		Messages   []*schema.Message
		Batch      []struct{ Result *api.ToolResult }
		Pending    struct{ EffectID, Token string }
	}
	if err := json.Unmarshal(payload, &old); err != nil {
		t.Fatal(err)
	}
	if old.ToolDigest != "sha256:a44fe0c483fdea2896c66cf9070454768e893e18e1353d0f01a5fcf55ac2e80a" || len(old.Batch) != 2 || old.Batch[0].Result == nil || old.Batch[1].Result != nil {
		t.Fatal("frozen pre-change digest/position changed")
	}
	var sends, resolutions, invokes atomic.Int32
	driver := chatdriver.NewDriverWithTransport(transportFunc(func(req *http.Request) (*http.Response, error) {
		if req.URL.String() != sample.Input.Agent.Model.Endpoint+"/chat/completions" {
			t.Error("changed captured destination", req.URL)
		}
		var wire map[string]any
		if err := json.NewDecoder(req.Body).Decode(&wire); err != nil {
			t.Error(err)
		}
		recorder := httptest.NewRecorder()
		if sends.Add(1) == 1 {
			toolTurn(recorder, []map[string]any{noteCall(0, "legacy-first", "resource:legacy-first", "first"), noteCall(1, "legacy-second", "resource:legacy-second", "second")})
		} else {
			found := []string{}
			for _, v := range wire["messages"].([]any) {
				m := v.(map[string]any)
				if m["role"] == "tool" {
					found = append(found, m["tool_call_id"].(string))
				}
			}
			if strings.Join(found, ",") != "legacy-first,legacy-second" {
				t.Error("old results lost original order", found)
			}
			textTurn(recorder, "legacy resumed", "stop", nil, true)
		}
		return recorder.Result(), nil
	}))
	engine := common.NewEngine(singleRegistry(t, driver), func(ctx context.Context, ref string) ([]byte, api.CredentialStatus, error) {
		resolutions.Add(1)
		return literalResolver(ctx, ref)
	})
	defer func() {
		engine.Stop()
		waitSignal(t, engine.Done())
		if err := engine.Close(); err != nil {
			t.Error(err)
		}
	}()
	q := sample.Inspection
	q.Reader = bytes.NewReader(payload)
	if err := engine.InspectCheckpoint(context.Background(), q); err != nil {
		t.Fatal("actual old CP rejected", err)
	}
	for _, mode := range []string{"opaque", "intent", "protocol"} {
		var state map[string]any
		if err := json.Unmarshal(payload, &state); err != nil {
			t.Fatal(err)
		}
		switch mode {
		case "opaque":
			state["ProtocolState"] = `{"opaque":"must not enter Chat v1"}`
		case "intent":
			state["Messages"].([]any)[int(state["Initial"].(float64))-1].(map[string]any)["content"] = "REPLACED_INTENT"
		case "protocol":
			state["Protocol"] = common.ResponsesProtocol
		}
		bad, err := json.Marshal(state)
		if err != nil {
			t.Fatal(err)
		}
		q.Reader = bytes.NewReader(bad)
		if err = engine.InspectCheckpoint(context.Background(), q); err == nil {
			t.Fatal("bad old CP accepted", mode)
		}
		resume := sample.Resume
		resume.Input.Checkpoints = &legacyCheckpointAccess{payload: bad, artifact: sample.Artifact}
		resume.Input.Attempts = &recordingAttempts{}
		resume.Input.Tools = invokeFunc(func(context.Context, api.ToolCall) (api.ToolResult, error) {
			invokes.Add(1)
			return api.ToolResult{}, nil
		})
		if _, err = engine.Resume(context.Background(), resume, nil); err == nil {
			t.Fatal("bad CP resumed", mode)
		}
	}
	if resolutions.Load() != 0 || sends.Load() != 0 || invokes.Load() != 0 {
		t.Fatal("inspection/invalid Resume performed IO")
	}
	if err := driver.ValidateState(context.Background(), common.StateView{}, []byte("opaque")); err == nil {
		t.Fatal("Chat accepted sidecar")
	}
	// Regenerate the old position from its exact accepted input and recorded
	// tool results. This tests the new encoder against independent old bytes.
	checkpoints := &legacyCheckpointAccess{payload: payload, artifact: sample.Artifact}
	in := sample.Input
	in.Attempts, in.Checkpoints = &recordingAttempts{}, checkpoints
	in.Tools = invokeFunc(func(_ context.Context, call api.ToolCall) (api.ToolResult, error) {
		invokes.Add(1)
		if call.ID == "legacy-first" {
			return *old.Batch[0].Result, nil
		}
		if call.ID == "legacy-second" {
			return api.ToolResult{Status: "approval_required", EffectID: old.Pending.EffectID, SuspensionToken: old.Pending.Token}, nil
		}
		return api.ToolResult{}, api.Denied("UNEXPECTED_CALL")
	})
	result, err := engine.Run(context.Background(), in, nil)
	if err != nil || result.Status != "suspended" || !bytes.Equal(checkpoints.published, payload) {
		t.Fatalf("legacy encoding/digest changed: result=%#v err=%v\nnew=%s\nold=%s", result, err, checkpoints.published, payload)
	}
	resume := sample.Resume
	resume.Input.Checkpoints = checkpoints
	resume.Input.Attempts = &recordingAttempts{}
	resume.Input.Tools = invokeFunc(func(context.Context, api.ToolCall) (api.ToolResult, error) {
		t.Error("completed old effects invoked again")
		return api.ToolResult{}, nil
	})
	result, err = engine.Resume(context.Background(), resume, nil)
	if err != nil || result.Status != "finished" || result.Text != "legacy resumed" || sends.Load() != 2 || resolutions.Load() != 2 || invokes.Load() != 2 {
		t.Fatal("actual old CP Resume did not preserve position", result, err, sends.Load(), resolutions.Load(), invokes.Load())
	}
}

type legacyCaptureEngine struct {
	*common.Engine
	inputs  chan api.EngineInput
	resumes chan api.EngineResumeInput
}

func (e *legacyCaptureEngine) Run(ctx context.Context, in api.EngineInput, sink func(api.EngineEvent) error) (api.EngineResult, error) {
	e.inputs <- in
	return e.Engine.Run(ctx, in, sink)
}
func (e *legacyCaptureEngine) Resume(ctx context.Context, in api.EngineResumeInput, sink func(api.EngineEvent) error) (api.EngineResult, error) {
	e.resumes <- in
	return e.Engine.Resume(ctx, in, sink)
}

func withoutLegacyPorts(in api.EngineInput) api.EngineInput {
	in.Tools, in.Checkpoints, in.Attempts = nil, nil, nil
	return in
}

// This opt-in capture is run before the protocol interface changes. The saved
// bytes are produced by the real old SDK/Executor/Broker/SQLite path, rather
// than by a new codec round trip. Ordinary tests never overwrite this baseline.
func TestCaptureLegacyChatCompatibilitySample(t *testing.T) {
	if os.Getenv("HUHU_CAPTURE_LEGACY_CHAT") != "1" {
		t.Skip("explicit pre-change legacy producer capture only")
	}
	if _, err := os.Stat(filepath.Join("testdata", "chat-v1", "checkpoint.json")); err == nil {
		t.Fatal("legacy baseline is frozen and cannot be recaptured")
	}
	var requests atomic.Int32
	wire := make(chan json.RawMessage, 2)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var raw json.RawMessage
		if err := json.NewDecoder(r.Body).Decode(&raw); err != nil {
			t.Error(err)
		}
		wire <- raw
		if requests.Add(1) == 1 {
			toolTurn(w, []map[string]any{noteCall(0, "legacy-first", "resource:legacy-first", "first"), noteCall(1, "legacy-second", "resource:legacy-second", "second")})
			return
		}
		textTurn(w, "legacy resumed", "stop", nil, true)
	}))
	t.Cleanup(server.Close)
	driver := chatdriver.NewDriver()
	engine := &legacyCaptureEngine{Engine: common.NewEngine(singleRegistry(t, driver), literalResolver), inputs: make(chan api.EngineInput, 1), resumes: make(chan api.EngineResumeInput, 2)}
	t.Cleanup(func() {
		engine.Stop()
		waitSignal(t, engine.Done())
		if err := engine.Close(); err != nil {
			t.Error(err)
		}
	})
	writer := &noteWriter{}
	f := newFixtureWith(t, server.URL+"/v1", bootstrap.Options{Engine: engine, Probe: driver, EngineVersion: common.EngineVersion, NoteWriter: writer}, []string{"note.write"})
	run := f.start(t).RunID
	first := f.approval(t, run)
	f.decide(t, first, "approve")
	second := f.approval(t, run)
	if writer.calls.Load() != 1 || requests.Load() != 1 {
		t.Fatal("old producer did not reach one committed/one pending batch position")
	}
	input := <-engine.inputs
	// This batch has two immutable artifacts; select the Run's exact current
	// checkpoint rather than the generic fixture helper's first lexical ref.
	var artifactJSON string
	if err := fixtureDB(t, f).QueryRow("SELECT c.artifact_json FROM execution_checkpoints c JOIN execution_runs r ON r.checkpoint_ref=c.ref WHERE r.run_id=?", run).Scan(&artifactJSON); err != nil {
		t.Fatal(err)
	}
	var artifact api.CheckpointArtifact
	if err := json.Unmarshal([]byte(artifactJSON), &artifact); err != nil {
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
	payload, readErr := io.ReadAll(reader)
	closeErr := reader.Close()
	if readErr != nil || closeErr != nil {
		t.Fatal(readErr, closeErr)
	}
	q := api.CheckpointInspection{Run: api.Run{ID: run, SessionID: f.session}, Intent: input.Intent, Config: input.Config, Checkpoint: artifact, Position: api.ExecutionPosition{Phase: "continuation", Continuation: &api.RunContinuation{EffectID: second.EffectID, Checkpoint: artifact}}, Reader: bytes.NewReader(payload)}
	if err := engine.InspectCheckpoint(context.Background(), q); err != nil {
		t.Fatal("old producer sample inspection", err)
	}
	f.decide(t, second, "reject")
	result := f.terminal(t, run)
	if result.Status != "succeeded" || writer.calls.Load() != 1 || requests.Load() != 2 {
		t.Fatal("old real resume", result, writer.calls.Load(), requests.Load())
	}
	resume := <-engine.resumes
	if resume.CheckpointRef != artifact.Ref {
		resume = <-engine.resumes
	}
	if resume.CheckpointRef != artifact.Ref || resume.Decision.Status != "denied" || resume.Decision.Reason != "APPROVAL_REJECTED" {
		t.Fatal("missing exact accepted decision for saved old CP", resume.CheckpointRef, resume.Decision)
	}
	q.Reader = nil
	resume.Input = withoutLegacyPorts(resume.Input)
	sample := legacyCompatibilitySample{Input: withoutLegacyPorts(input), Resume: resume, Inspection: q, Artifact: artifact}
	dir := filepath.Join("testdata", "chat-v1")
	if err := os.MkdirAll(dir, 0700); err != nil {
		t.Fatal(err)
	}
	encoded, err := json.MarshalIndent(sample, "", "  ")
	if err != nil {
		t.Fatal(err)
	}
	for name, data := range map[string][]byte{"checkpoint.json": payload, "trusted-inputs.json": append(encoded, '\n'), "request-initial.json": <-wire, "request-resumed.json": <-wire} {
		if err := os.WriteFile(filepath.Join(dir, name), data, 0600); err != nil {
			t.Fatal(err)
		}
	}
	t.Logf("captured actual Chat v1 CP bytes=%d; HTTP=2; physical mutation=1; second rejected; true Core/Engine cleanup waits registered", len(payload))
}
