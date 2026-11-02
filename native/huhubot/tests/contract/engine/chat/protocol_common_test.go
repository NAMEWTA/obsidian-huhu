package chat_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"
	"sync/atomic"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/common"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/cloudwego/eino/schema"
)

func singleRegistry(t *testing.T, driver common.ProtocolDriver) *common.Registry {
	t.Helper()
	r, err := common.NewRegistry(driver)
	if err != nil {
		driver.Stop()
		waitSignal(t, driver.Done())
		_ = driver.Close()
		t.Fatal(err)
	}
	return r
}

type recordingAttempts struct {
	mu                      sync.Mutex
	requests                []api.AttemptRequest
	observations            []api.AttemptObservation
	dispatches, aborts      int
	reserveErr, dispatchErr error
	failSettle              atomic.Bool
}

func (a *recordingAttempts) Reserve(_ context.Context, q api.AttemptRequest) (api.AttemptReservation, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.reserveErr != nil {
		return api.AttemptReservation{}, a.reserveErr
	}
	a.requests = append(a.requests, q)
	return api.AttemptReservation{ID: fmt.Sprint("attempt:", len(a.requests)), RunID: "run:fixture"}, nil
}
func (a *recordingAttempts) Dispatch(ctx context.Context, _ api.AttemptReservation, send func(context.Context) error) error {
	a.mu.Lock()
	a.dispatches++
	err := a.dispatchErr
	a.mu.Unlock()
	if err != nil {
		return err
	}
	return send(ctx)
}
func (a *recordingAttempts) Settle(_ context.Context, _ api.AttemptReservation, o api.AttemptObservation) (api.AttemptReceipt, error) {
	if a.failSettle.Load() {
		return api.AttemptReceipt{}, errors.New("synthetic local ledger outage")
	}
	a.mu.Lock()
	a.observations = append(a.observations, o)
	a.mu.Unlock()
	return api.AttemptReceipt{State: "settled"}, nil
}
func (a *recordingAttempts) AbortUnsent(context.Context, api.AttemptReservation) error {
	a.mu.Lock()
	a.aborts++
	a.mu.Unlock()
	return nil
}
func (a *recordingAttempts) snapshot() ([]api.AttemptRequest, []api.AttemptObservation, int, int) {
	a.mu.Lock()
	defer a.mu.Unlock()
	return append([]api.AttemptRequest(nil), a.requests...), append([]api.AttemptObservation(nil), a.observations...), a.dispatches, a.aborts
}

type protocolFixtureDriver struct {
	identity      common.ProtocolIdentity
	generate      func(context.Context, common.Generation) (common.TurnResult, error)
	validate      func(context.Context, common.StateView, []byte) error
	probe         func(context.Context, api.ModelBindingDraft, []byte) ([]string, error)
	done          chan struct{}
	stopOnce      sync.Once
	stops, closes atomic.Int32
}

func newProtocolFixture(protocol string) *protocolFixtureDriver {
	id := common.ProtocolIdentity{Protocol: common.ChatProtocol, EngineVersion: common.EngineVersion}
	if protocol == common.ResponsesProtocol {
		id = common.ProtocolIdentity{Protocol: protocol, EngineVersion: common.ResponsesEngineVersion, StateFormat: common.ResponsesStateFormat}
	}
	return &protocolFixtureDriver{identity: id, done: make(chan struct{})}
}
func (d *protocolFixtureDriver) Identity() common.ProtocolIdentity { return d.identity }
func (d *protocolFixtureDriver) Generate(ctx context.Context, g common.Generation) (common.TurnResult, error) {
	return d.generate(ctx, g)
}
func (d *protocolFixtureDriver) ValidateState(ctx context.Context, v common.StateView, p []byte) error {
	if d.validate != nil {
		return d.validate(ctx, v, p)
	}
	return nil
}
func (d *protocolFixtureDriver) Probe(ctx context.Context, m api.ModelBindingDraft, key []byte) ([]string, error) {
	if d.probe != nil {
		return d.probe(ctx, m, key)
	}
	return []string{}, nil
}
func (d *protocolFixtureDriver) Stop()                 { d.stopOnce.Do(func() { d.stops.Add(1); close(d.done) }) }
func (d *protocolFixtureDriver) Done() <-chan struct{} { return d.done }
func (d *protocolFixtureDriver) Close() error          { d.closes.Add(1); return nil }

func TestRegistryRejectsInvalidConstructionWithoutTakingOwnership(t *testing.T) {
	for _, kind := range []string{"empty", "nil", "typed_nil", "duplicate", "version", "format", "unknown"} {
		t.Run(kind, func(t *testing.T) {
			d := newProtocolFixture(common.ChatProtocol)
			drivers := []common.ProtocolDriver{d}
			switch kind {
			case "empty":
				drivers = nil
			case "nil":
				drivers = append(drivers, nil)
			case "typed_nil":
				var n *protocolFixtureDriver
				drivers = append(drivers, n)
			case "duplicate":
				drivers = append(drivers, d)
			case "version":
				d.identity.EngineVersion = "other"
			case "format":
				d.identity.StateFormat = "opaque"
			case "unknown":
				d.identity.Protocol = "anthropic-messages"
			}
			if r, err := common.NewRegistry(drivers...); r != nil || err == nil {
				t.Fatal("invalid registry constructed", r, err)
			}
			if d.stops.Load() != 0 || d.closes.Load() != 0 {
				t.Fatal("failed constructor took ownership")
			}
			d.Stop()
			waitSignal(t, d.Done())
			if err := d.Close(); err != nil {
				t.Fatal(err)
			}
		})
	}
}

func TestRegistryKeepsPinnedRoutingAndWaitsForProbe(t *testing.T) {
	chat, responses := newProtocolFixture(common.ChatProtocol), newProtocolFixture(common.ResponsesProtocol)
	entered, release := make(chan struct{}), make(chan struct{})
	var releaseOnce sync.Once
	unblock := func() { releaseOnce.Do(func() { close(release) }) }
	defer unblock()
	responses.probe = func(_ context.Context, m api.ModelBindingDraft, _ []byte) ([]string, error) {
		if m.Protocol != common.ResponsesProtocol {
			t.Error("probe crossed registry")
		}
		close(entered)
		<-release
		return []string{}, nil
	}
	r, err := common.NewRegistry(chat, responses)
	if err != nil {
		t.Fatal(err)
	}
	// Freeze the original identity, independently of later caller mutation.
	responses.identity.EngineVersion = "mutated caller copy"
	if version, err := r.EngineVersionForProtocol(common.ResponsesProtocol); err != nil || version != common.ResponsesEngineVersion {
		t.Fatal("mutable registry identity", version, err)
	}
	if r.SupportsProtocol("anthropic-messages") || !r.SupportsProtocol(common.ChatProtocol) {
		t.Fatal("placeholder or missing selector")
	}
	for _, d := range []*protocolFixtureDriver{chat, responses} {
		protocol := d.identity.Protocol
		d.generate = func(_ context.Context, g common.Generation) (common.TurnResult, error) {
			if g.Model.Protocol != protocol || g.View.Turns != 0 {
				t.Error("pinned route/turn crossed", g.Model.Protocol, protocol)
			}
			if err := g.EmitText(protocol); err != nil {
				return common.TurnResult{}, err
			}
			result := common.TurnResult{Message: schema.AssistantMessage(protocol, nil)}
			if protocol == common.ResponsesProtocol {
				result.ProtocolState = []byte("native")
			}
			return result, nil
		}
	}
	engine := common.NewEngine(r, literalResolver)
	closed := false
	t.Cleanup(func() {
		unblock()
		engine.Stop()
		waitSignal(t, engine.Done())
		if !closed {
			_ = engine.Close()
		}
	})
	sample, _ := readLegacySample(t)
	var wg sync.WaitGroup
	for _, protocol := range []string{common.ChatProtocol, common.ResponsesProtocol} {
		wg.Add(1)
		go func(protocol string) {
			defer wg.Done()
			in := sample.Input
			model := *in.Agent.Model
			model.Protocol = protocol
			in.Agent.Model = &model
			in.Config.Agent = in.Agent
			in.Attempts = &recordingAttempts{}
			out, err := engine.Run(context.Background(), in, nil)
			if err != nil || out.Status != "finished" || out.Text != protocol {
				t.Error("routed run", out, err)
			}
		}(protocol)
	}
	wg.Wait()
	probeReturned := make(chan struct{})
	go func() {
		defer close(probeReturned)
		_, _ = r.Probe(context.Background(), api.ModelBindingDraft{Protocol: common.ResponsesProtocol}, []byte("synthetic"))
	}()
	waitSignal(t, entered)
	engine.Stop()
	select {
	case <-engine.Done():
		t.Fatal("probe still executing but Engine.Done closed")
	default:
	}
	if err := engine.Close(); err == nil {
		t.Fatal("Close replaced join")
	}
	unblock()
	waitSignal(t, probeReturned)
	waitSignal(t, engine.Done())
	if err := engine.Close(); err != nil {
		t.Fatal(err)
	}
	closed = true
	if chat.stops.Load() != 1 || responses.stops.Load() != 1 || chat.closes.Load() != 1 || responses.closes.Load() != 1 {
		t.Fatal("not all registered drivers stopped/closed")
	}
}

func TestRegistryThirdProtocolUsesExactIdentityAndSharedLifecycle(t *testing.T) {
	// Use the frozen literal here so the pre-registration test compiles and
	// fails on behavior, independently of constants introduced by the repair.
	thirdIdentity := common.ProtocolIdentity{Protocol: "anthropic-messages", EngineVersion: "huhu-anthropic-sdk-go-1.56.0-messages-bridge-v1", StateFormat: "huhu-anthropic-messages-state-v1"}
	chat, responses, third := newProtocolFixture(common.ChatProtocol), newProtocolFixture(common.ResponsesProtocol), newProtocolFixture(common.ChatProtocol)
	third.identity = thirdIdentity
	drivers := []*protocolFixtureDriver{chat, responses, third}
	entered, release := make(chan struct{}), make(chan struct{})
	var releaseOnce sync.Once
	unblock := func() { releaseOnce.Do(func() { close(release) }) }
	var engine *common.Engine
	var registry *common.Registry
	closed := false
	defer func() {
		unblock()
		if closed {
			return
		}
		if engine != nil {
			engine.Stop()
			waitSignal(t, engine.Done())
			_ = engine.Close()
		} else if registry != nil {
			registry.Stop()
			waitSignal(t, registry.Done())
			_ = registry.Close()
		} else {
			// A failed constructor must leave every driver owned by its caller.
			for _, d := range drivers {
				d.Stop()
				waitSignal(t, d.Done())
				_ = d.Close()
			}
		}
	}()
	var err error
	registry, err = common.NewRegistry(chat, responses, third)
	if err != nil {
		for _, d := range drivers {
			if d.stops.Load() != 0 || d.closes.Load() != 0 {
				t.Error("failed registry took driver ownership")
			}
		}
		t.Fatal("exact third identity must register", err)
	}
	expected := []common.ProtocolIdentity{chat.identity, responses.identity, thirdIdentity}
	third.identity.EngineVersion = "mutated caller identity"
	for _, id := range expected {
		got, err := registry.Identity(id.Protocol)
		version, versionErr := registry.EngineVersionForProtocol(id.Protocol)
		if err != nil || versionErr != nil || got != id || version != id.EngineVersion || !registry.SupportsProtocol(id.Protocol) {
			t.Fatal("pinned identity/selector changed", id, got, version, err, versionErr)
		}
	}
	if registry.SupportsProtocol("unknown-protocol") {
		t.Fatal("unknown protocol advertised")
	}
	probes := []*atomic.Int32{{}, {}, {}}
	for i, d := range drivers {
		protocol, counter := expected[i].Protocol, probes[i]
		d.generate = func(_ context.Context, g common.Generation) (common.TurnResult, error) {
			if g.Model.Protocol != protocol {
				t.Error("third registry generation crossed pinned route", g.Model.Protocol, protocol)
			}
			if err := g.EmitText(protocol); err != nil {
				return common.TurnResult{}, err
			}
			result := common.TurnResult{Message: schema.AssistantMessage(protocol, nil)}
			if protocol != common.ChatProtocol {
				result.ProtocolState = []byte("native")
			}
			return result, nil
		}
		d.probe = func(_ context.Context, m api.ModelBindingDraft, _ []byte) ([]string, error) {
			if m.Protocol != protocol {
				t.Error("third registry probe crossed pinned route", m.Protocol, protocol)
			}
			counter.Add(1)
			if protocol == thirdIdentity.Protocol {
				close(entered)
				<-release
			}
			return []string{}, nil
		}
	}
	engine = common.NewEngine(registry, literalResolver)
	sample, _ := readLegacySample(t)
	var runs sync.WaitGroup
	for _, id := range expected {
		runs.Add(1)
		go func(protocol string) {
			defer runs.Done()
			in := sample.Input
			model := *in.Agent.Model
			model.Protocol = protocol
			in.Agent.Model = &model
			in.Config.Agent = in.Agent
			in.Attempts = &recordingAttempts{}
			out, err := engine.Run(context.Background(), in, nil)
			if err != nil || out.Status != "finished" || out.Text != protocol {
				t.Error("third registry run route", protocol, out, err)
			}
		}(id.Protocol)
	}
	runs.Wait()
	for _, id := range expected[:2] {
		if _, err := registry.Probe(context.Background(), api.ModelBindingDraft{Protocol: id.Protocol}, []byte("synthetic")); err != nil {
			t.Fatal(err)
		}
	}
	probeReturned := make(chan struct{})
	go func() {
		defer close(probeReturned)
		_, _ = registry.Probe(context.Background(), api.ModelBindingDraft{Protocol: thirdIdentity.Protocol}, []byte("synthetic"))
	}()
	waitSignal(t, entered)
	engine.Stop()
	select {
	case <-engine.Done():
		t.Fatal("third probe still live but Engine.Done closed")
	default:
	}
	if err := engine.Close(); err == nil {
		t.Fatal("third driver Close replaced join")
	}
	unblock()
	waitSignal(t, probeReturned)
	waitSignal(t, engine.Done())
	if err := engine.Close(); err != nil {
		t.Fatal(err)
	}
	closed = true
	for i, d := range drivers {
		if d.stops.Load() != 1 || d.closes.Load() != 1 || probes[i].Load() != 1 {
			t.Fatal("not all three owned drivers joined/closed", expected[i].Protocol, d.stops.Load(), d.closes.Load(), probes[i].Load())
		}
	}
	for _, kind := range []string{"version", "format", "duplicate"} {
		t.Run(kind, func(t *testing.T) {
			d := newProtocolFixture(common.ChatProtocol)
			d.identity = thirdIdentity
			args := []common.ProtocolDriver{d}
			switch kind {
			case "version":
				d.identity.EngineVersion = common.EngineVersion
			case "format":
				d.identity.StateFormat = common.ResponsesStateFormat
			case "duplicate":
				args = append(args, d)
			}
			if r, err := common.NewRegistry(args...); r != nil || err == nil {
				t.Fatal("third identity whitelist widened", kind, r, err)
			}
			if d.stops.Load() != 0 || d.closes.Load() != 0 {
				t.Fatal("failed third constructor took ownership")
			}
			d.Stop()
			waitSignal(t, d.Done())
			_ = d.Close()
		})
	}
}

func TestCandidateProtocolStateAndWholeBatchPrecedeFirstInvoke(t *testing.T) {
	for _, kind := range []string{"candidate_state", "second_arguments", "text_state"} {
		t.Run(kind, func(t *testing.T) {
			sample, payload := readLegacySample(t)
			var old struct {
				Initial  int
				Messages []*schema.Message
			}
			if err := json.Unmarshal(payload, &old); err != nil {
				t.Fatal(err)
			}
			d := newProtocolFixture(common.ResponsesProtocol)
			var validations, invokes atomic.Int32
			d.validate = func(_ context.Context, view common.StateView, _ []byte) error {
				validations.Add(1)
				if view.Turns > 0 {
					return common.Fault("CHECKPOINT_INVALID")
				}
				return nil
			}
			d.generate = func(_ context.Context, g common.Generation) (common.TurnResult, error) {
				message := old.Messages[old.Initial]
				if kind == "second_arguments" {
					message.ToolCalls[1].Function.Arguments = "{"
				}
				if kind == "text_state" {
					_ = g.EmitText("partial native text")
					message = schema.AssistantMessage("partial native text", nil)
				}
				return common.TurnResult{Message: message, ProtocolState: []byte("native")}, nil
			}
			engine := common.NewEngine(singleRegistry(t, d), literalResolver)
			defer func() { engine.Stop(); waitSignal(t, engine.Done()); _ = engine.Close() }()
			in := sample.Input
			model := *in.Agent.Model
			model.Protocol = common.ResponsesProtocol
			in.Agent.Model = &model
			in.Config.Agent = in.Agent
			in.Attempts = &recordingAttempts{}
			in.Tools = invokeFunc(func(context.Context, api.ToolCall) (api.ToolResult, error) {
				invokes.Add(1)
				return api.ToolResult{}, nil
			})
			out, err := engine.Run(context.Background(), in, nil)
			want := "CHECKPOINT_INVALID"
			count := int32(2)
			if kind == "second_arguments" {
				want, count = "TOOL_ARGUMENT_INVALID", 1
			}
			if err != nil || out.Status != "failed" || out.Reason != want || validations.Load() != count || invokes.Load() != 0 {
				t.Fatal("batch/state admitted effects", out, err, validations.Load(), invokes.Load())
			}
		})
	}
}

func TestProtocolStateCopyAndFinalEncodedCheckpointBound(t *testing.T) {
	for _, kind := range []string{"copy", "escaped_size"} {
		t.Run(kind, func(t *testing.T) {
			sample, payload := readLegacySample(t)
			var old struct {
				Initial  int
				Messages []*schema.Message
			}
			if err := json.Unmarshal(payload, &old); err != nil {
				t.Fatal(err)
			}
			value := "original opaque state"
			if kind == "escaped_size" {
				value = strings.Repeat("\\", 350<<10)
			}
			original, err := json.Marshal(map[string]string{"Format": common.ResponsesStateFormat, "Opaque": value})
			if err != nil {
				t.Fatal(err)
			}
			expected := string(original)
			if len(original) >= common.MaxCheckpointBytes {
				t.Fatal("test must fit raw state but exceed final CP after escaping")
			}
			d := newProtocolFixture(common.ResponsesProtocol)
			d.validate = func(_ context.Context, view common.StateView, raw []byte) error {
				if view.Turns == 0 {
					return nil
				}
				if string(raw) != expected {
					return common.Fault("CHECKPOINT_INVALID")
				}
				// Mutate the driver-owned returned buffer after common copied it.
				// The candidate and later saved CP must retain the original bytes.
				if kind == "copy" {
					for i := range original {
						original[i] = 'x'
					}
				}
				return nil
			}
			d.generate = func(context.Context, common.Generation) (common.TurnResult, error) {
				return common.TurnResult{Message: old.Messages[old.Initial], ProtocolState: original}, nil
			}
			engine := common.NewEngine(singleRegistry(t, d), literalResolver)
			defer func() { engine.Stop(); waitSignal(t, engine.Done()); _ = engine.Close() }()
			in := sample.Input
			model := *in.Agent.Model
			model.Protocol = common.ResponsesProtocol
			in.Agent.Model = &model
			in.Config.Agent = in.Agent
			artifact := sample.Artifact
			artifact.Metadata.EngineVersion = common.ResponsesEngineVersion
			checkpoints := &legacyCheckpointAccess{artifact: artifact}
			in.Attempts, in.Checkpoints = &recordingAttempts{}, checkpoints
			in.Tools = invokeFunc(func(context.Context, api.ToolCall) (api.ToolResult, error) {
				return api.ToolResult{Status: "approval_required", EffectID: "effect:state-copy", SuspensionToken: "token:state-copy"}, nil
			})
			out, err := engine.Run(context.Background(), in, nil)
			if kind == "escaped_size" {
				f, ok := err.(*api.Fault)
				if !ok || f.Reason != "CHECKPOINT_SIZE_LIMIT" || len(checkpoints.published) != 0 {
					t.Fatal("only raw state size was bounded", out, err, len(checkpoints.published))
				}
				return
			}
			if err != nil || out.Status != "suspended" {
				t.Fatal("copied state position", out, err)
			}
			var saved struct{ Format, Engine, ToolDigest, ProtocolState string }
			if err = json.Unmarshal(checkpoints.published, &saved); err != nil {
				t.Fatal(err)
			}
			if saved.Format != "huhu-model-state-v2" || saved.Engine != common.ResponsesEngineVersion || saved.ProtocolState != expected || saved.ToolDigest == "sha256:a44fe0c483fdea2896c66cf9070454768e893e18e1353d0f01a5fcf55ac2e80a" {
				t.Fatal("state copy/new identity not persisted", saved)
			}
			q := api.CheckpointInspection{Run: sample.Inspection.Run, Intent: in.Intent, Config: in.Config, Checkpoint: artifact, Reader: bytes.NewReader(checkpoints.published), Position: api.ExecutionPosition{Phase: "continuation", Continuation: &api.RunContinuation{EffectID: "effect:state-copy", Checkpoint: artifact}}}
			if err = engine.InspectCheckpoint(context.Background(), q); err != nil {
				t.Fatal("new native CP inspector", err)
			}
		})
	}
}
