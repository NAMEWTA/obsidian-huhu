package approval_test

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"testing"
	"time"

	blobstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/blob/store"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	brokerapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/tooling/broker"
)

type protocolMetadataRepository struct {
	brokerapp.Repository
	artifact api.CheckpointArtifact
}

func (r *protocolMetadataRepository) Publish(_ context.Context, x api.ToolExecution, _ string, a api.CheckpointArtifact, _ time.Time) error {
	if a.RunID != x.Run.ID {
		return fmt.Errorf("publication changed original Run")
	}
	r.artifact = a
	return nil
}
func (r *protocolMetadataRepository) Referenced(_ context.Context, ref string) (bool, error) {
	return r.artifact.Ref == ref, nil
}
func (r *protocolMetadataRepository) InspectCheckpointReference(_ context.Context, q api.RecoveryInspection) error {
	if q.Position.Continuation == nil || q.Position.Continuation.Checkpoint != r.artifact {
		return fmt.Errorf("inspection lost published artifact")
	}
	return nil
}

type protocolMetadataInspector struct{ seen []api.CheckpointInspection }

func (i *protocolMetadataInspector) InspectCheckpoint(_ context.Context, q api.CheckpointInspection) error {
	body, e := io.ReadAll(q.Reader)
	if e != nil || string(body) != "controlled checkpoint" {
		return fmt.Errorf("inspection did not read complete original payload: %v", e)
	}
	q.Reader = nil
	i.seen = append(i.seen, q)
	return nil
}

func protocolMetadataExecution(protocol string) api.ToolExecution {
	a := api.Agent{ID: "agent:controlled", Name: "controlled", Persona: "unchanged", PersonaRevision: "1", ModelBindingRevision: "1"}
	if protocol != "" {
		a.Model = &api.ModelBinding{ModelBindingDraft: api.ModelBindingDraft{Protocol: protocol, ProviderID: "controlled", ModelID: "controlled", Endpoint: "http://127.0.0.1:1/v1"}}
	}
	return api.ToolExecution{Identity: owner, Run: api.Run{ID: "run:controlled", SessionID: "session:controlled", AgentID: a.ID}, ClaimToken: "claim:controlled", Access: api.RunAccessInput{TaskID: "run:controlled"}, Agent: a, Config: api.TaskConfigSnapshot{ID: "snapshot:controlled", SubjectID: a.ID, Agent: a}}
}

func TestBrokerProtocolMetadataUsesPinnedIdentityForBindPublicationAndInspection(t *testing.T) {
	const chatVersion = "huhu-eino-0.9.22-chat-bridge-v1"
	const responsesVersion = "huhu-openai-go-3.44.0-responses-bridge-v1"
	cases := []struct {
		name, protocol, legacy, want string
		callback                     bool
	}{
		{"chat", "openai-chat-completions", "wrong-global-fallback", chatVersion, true},
		{"responses", "openai-responses", "wrong-global-fallback", responsesVersion, true},
		{"legacy_default", "", "", "huhu-engine-v1", false},
		{"legacy_explicit_with_responses_model", "openai-responses", "controlled-legacy-version", "controlled-legacy-version", false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			blobs, e := blobstore.New(t.TempDir())
			if e != nil {
				t.Fatal(e)
			}
			repository := &protocolMetadataRepository{}
			options := brokerapp.Options{EngineVersion: tc.legacy}
			protocols := []string{}
			if tc.callback {
				options.EngineVersionForProtocol = func(protocol string) (string, error) {
					protocols = append(protocols, protocol)
					switch protocol {
					case "openai-chat-completions":
						return chatVersion, nil
					case "openai-responses":
						return responsesVersion, nil
					default:
						return "", &api.Fault{Kind: "MODEL_UNAVAILABLE", Reason: "ADAPTER_NOT_ASSEMBLED"}
					}
				}
			}
			service := brokerapp.New(repository, blobs, nil, nil, nil, options)
			inspector := &protocolMetadataInspector{}
			service.SetCheckpointInspector(inspector)
			x := protocolMetadataExecution(tc.protocol)
			session, e := service.Bind(ctx, x)
			if e != nil || session.Checkpoints == nil {
				t.Fatal("metadata binding unavailable", e)
			}
			t.Cleanup(func() { _ = session.Close() })
			metadata := session.Checkpoints.Metadata()
			if metadata.EngineVersion != tc.want || metadata.FormatVersion != "1" || metadata.DefinitionDigest == "" {
				t.Fatal("wrong trusted identity", metadata)
			}
			artifact, e := session.Checkpoints.Publish(ctx, bytes.NewBufferString("controlled checkpoint"))
			if e != nil {
				t.Fatal(e)
			}
			suspension := api.EngineSuspension{Token: "suspension:controlled", Checkpoint: artifact}
			if e = service.PublishSuspension(ctx, x, suspension); e != nil || repository.artifact != artifact {
				t.Fatal("publication did not use same metadata", e)
			}
			q := api.RecoveryInspection{Run: x.Run, Intent: "original accepted intent", Config: x.Config, Position: api.ExecutionPosition{Phase: "resume", Continuation: &api.RunContinuation{Checkpoint: artifact}, Decision: &api.ToolResult{Status: "denied", Reason: "APPROVAL_REJECTED"}}}
			if e = service.InspectRecovery(ctx, q); e != nil || len(inspector.seen) != 1 || inspector.seen[0].Checkpoint != artifact || inspector.seen[0].Intent != q.Intent {
				t.Fatal("inspection selected another metadata identity", e, inspector.seen)
			}
			forged := artifact
			forged.Metadata.EngineVersion = "artifact-cannot-choose-version"
			suspension.Checkpoint = forged
			expect(t, service.PublishSuspension(ctx, x, suspension), "CHECKPOINT_INCOMPATIBLE")
			q.Position.Continuation.Checkpoint = forged
			expect(t, service.InspectRecovery(ctx, q), "CHECKPOINT_INCOMPATIBLE")
			if len(inspector.seen) != 1 || repository.artifact != artifact {
				t.Fatal("forged identity reached consumer")
			}
			if tc.callback && len(protocols) != 5 {
				t.Fatal("one shared identity resolver was not consumed by every path", protocols)
			}
			for _, protocol := range protocols {
				if protocol != tc.protocol {
					t.Fatal("callback input came from artifact instead of pinned model", protocols)
				}
			}
			if e = session.Close(); e != nil {
				t.Fatal(e)
			}
			if n, e := blobs.Collect(ctx, func(context.Context, string) (bool, error) { return false, nil }); e != nil || n != 1 {
				t.Fatal("bound/inspection retained a Blob hold after completion", n, e)
			}
		})
	}
}

type protocolMetadataAttempts struct{ api.ModelAttempts }
type protocolMetadataBinder struct {
	attempts api.ModelAttempts
	calls    int
}

func (b *protocolMetadataBinder) BindAttempts(context.Context, api.ToolExecution) (api.ModelAttempts, error) {
	b.calls++
	return b.attempts, nil
}

func TestBrokerUnavailableIdentityKeepsAttemptsButNeverSwallowsUnexpectedCallbackErrors(t *testing.T) {
	unexpected := errors.New("controlled identity failure")
	wrongKind := &api.Fault{Kind: "INVALID_PARAMS", Reason: "ADAPTER_NOT_ASSEMBLED"}
	for _, tc := range []struct {
		name, protocol string
		callbackErr    error
		emptyVersion   bool
		unavailable    bool
	}{
		{name: "nil_model", unavailable: true},
		{name: "empty_protocol", protocol: "empty", unavailable: true},
		{name: "unsupported", protocol: "anthropic-messages", callbackErr: &api.Fault{Kind: "MODEL_UNAVAILABLE", Reason: "ADAPTER_NOT_ASSEMBLED"}, unavailable: true},
		{name: "unexpected", protocol: "openai-responses", callbackErr: unexpected},
		{name: "wrong_fault_kind", protocol: "openai-responses", callbackErr: wrongKind},
		{name: "empty_version", protocol: "openai-responses", emptyVersion: true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			callbackCalls := 0
			service := brokerapp.New(nil, nil, nil, nil, nil, brokerapp.Options{EngineVersionForProtocol: func(string) (string, error) {
				callbackCalls++
				if tc.emptyVersion {
					return "", nil
				}
				return "", tc.callbackErr
			}})
			marker := &protocolMetadataAttempts{}
			binder := &protocolMetadataBinder{attempts: marker}
			service.SetAttempts(binder)
			x := protocolMetadataExecution(tc.protocol)
			if tc.name == "empty_protocol" {
				x.Agent.Model.Protocol = ""
			}
			session, e := service.Bind(ctx, x)
			if tc.unavailable {
				if e != nil || session.Tools == nil || session.Attempts != marker || session.Checkpoints != nil || session.Close == nil || binder.calls != 1 {
					t.Fatal("known unavailable path lost original ports", session, e, binder.calls)
				}
				if e = session.Close(); e != nil {
					t.Fatal(e)
				}
			} else if e == nil || session.Tools != nil || session.Attempts != nil || session.Checkpoints != nil || binder.calls != 0 || tc.callbackErr != nil && !errors.Is(e, tc.callbackErr) {
				t.Fatal("unexpected metadata error was swallowed", session, e, binder.calls)
			}
			if (tc.name == "nil_model" || tc.name == "empty_protocol") && callbackCalls != 0 {
				t.Fatal("incomplete model reached protocol resolver")
			}
			artifact := api.CheckpointArtifact{RunID: x.Run.ID, AttemptID: x.ClaimToken}
			suspension := api.EngineSuspension{Token: "controlled", Checkpoint: artifact}
			q := api.RecoveryInspection{Run: x.Run, Config: x.Config, Position: api.ExecutionPosition{Phase: "resume", Continuation: &api.RunContinuation{Checkpoint: artifact}, Decision: &api.ToolResult{}}}
			q.Config.Agent = x.Agent
			for _, err := range []error{service.PublishSuspension(ctx, x, suspension), service.InspectRecovery(ctx, q)} {
				if tc.unavailable || tc.emptyVersion {
					expect(t, err, "CHECKPOINT_INCOMPATIBLE")
				} else if !errors.Is(err, tc.callbackErr) {
					t.Fatal("publication/inspection hid unexpected resolver failure", err)
				}
			}
		})
	}
}
