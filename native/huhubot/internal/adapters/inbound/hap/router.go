// Package hap maps versioned wire DTOs to the entrance-neutral application API.
package hap

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"sync/atomic"
	"unicode/utf8"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	portabledomain "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/data/portable"
	wire "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap"
)

var ImplementedMethods = []string{"protocol.hello", "service.health", "service.status", "service.diagnostics", "service.shutdown", "profile.status", "host.attach", "host.detach"}

type Response struct {
	JSONRPC          string                `json:"jsonrpc"`
	ID               *string               `json:"id"`
	Result           any                   `json:"result,omitempty"`
	Error            *wire.RPCError        `json:"error,omitempty"`
	DeliverySubjects []api.DeliverySubject `json:"-"`
}
type Router struct {
	App         *api.Facade
	Identity    api.RequestIdentity
	ready       atomic.Bool
	ownerGlobal api.GlobalMemoryAPI
	portable    portabledomain.API
}

func New(app *api.Facade, id api.RequestIdentity) *Router { return &Router{App: app, Identity: id} }

// NewOwner is used only by the local stdio user-command composition. The
// capability is a constructor argument, never decoded from HAP request data.
func NewOwner(app *api.Facade, id api.RequestIdentity, global api.GlobalMemoryAPI) *Router {
	r := New(app, id)
	r.ownerGlobal = global
	return r
}

// NewWithPortable installs the optional portable artifact service. Portable
// methods are advertised only when the artifact store and profile transaction
// have actually been assembled.
func NewWithPortable(app *api.Facade, id api.RequestIdentity, p portabledomain.API) *Router {
	r := New(app, id)
	r.portable = p
	return r
}

func NewOwnerWithPortable(app *api.Facade, id api.RequestIdentity, global api.GlobalMemoryAPI, p portabledomain.API) *Router {
	r := NewOwner(app, id, global)
	r.portable = p
	return r
}
func (r *Router) Ready() bool { return r.ready.Load() }
func Failure(id *string, code int, kind, reason string, retryable bool) Response {
	return Response{JSONRPC: "2.0", ID: id, Error: &wire.RPCError{Code: code, Message: "Request rejected", Data: wire.ErrorData{Kind: kind, Reason: reason, Retryable: retryable, CorrelationID: api.NewID("correlation:")}}}
}
func FromError(id *string, err error) Response {
	var f *api.Fault
	if errors.As(err, &f) {
		code := -32000
		if f.Kind == "INVALID_ARGUMENT" {
			code = -32602
		}
		response := Failure(id, code, f.Kind, f.Reason, f.Retryable)
		if f.Kind == "CURSOR_EXPIRED" && f.Details != nil {
			response.Error.Data.Details, _ = json.Marshal(f.Details)
		}
		return response
	}
	if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
		return Failure(id, -32000, "HOST_UNAVAILABLE", "REQUEST_CANCELED", true)
	}
	return Failure(id, -32603, "CONFLICT", "INTERNAL_ERROR", false)
}
func metadata(p api.ProfileMetadata) wire.ProfileMetadata {
	return wire.ProfileMetadata{ProfileID: p.ProfileID, CommandEpoch: p.CommandEpoch, Revision: p.Revision, CreatedAt: p.CreatedAt}
}
func (r *Router) dispatch(ctx context.Context, e wire.Envelope, remote api.HostRemote) Response {
	response := Response{JSONRPC: "2.0", ID: e.ID}
	fail := func(err error) Response { return FromError(e.ID, err) }
	if e.Method != "protocol.hello" && !r.ready.Load() {
		return Failure(e.ID, -32000, "PROTOCOL_INCOMPATIBLE", "HELLO_REQUIRED", false)
	}
	if r.App.Service.Stopping() {
		return Failure(e.ID, -32000, "CONFLICT", "SERVICE_STOPPING", false)
	}
	switch e.Method {
	case "protocol.hello":
		if r.ready.Load() {
			return Failure(e.ID, -32000, "CONFLICT", "HELLO_ALREADY_COMPLETE", false)
		}
		p, err := wire.DecodeParams[wire.HelloParams](e.Params)
		if err != nil || p.Client.Name == "" || p.Client.Version == "" || utf8.RuneCountInString(p.Client.Name) > 128 || utf8.RuneCountInString(p.Client.Version) > 128 {
			return fail(api.Invalid("INVALID_HELLO"))
		}
		if p.ProtocolVersion != wire.ProtocolVersion {
			return Failure(e.ID, -32000, "PROTOCOL_INCOMPATIBLE", "PROTOCOL_VERSION_UNSUPPORTED", false)
		}
		s, err := r.App.Service.Status(ctx, r.Identity)
		if err != nil {
			return fail(err)
		}
		policy, err := r.policyStatus(ctx, s.Profile.ProfileID)
		if err != nil {
			return fail(err)
		}
		response.Result = wire.HelloResult{Policy: policy, ProtocolVersion: wire.ProtocolVersion, BuildVersion: wire.BuildVersion, SchemaVersion: wire.SchemaVersion, Profile: metadata(s.Profile), Capabilities: r.availableMethods(), Limits: wire.Limits{MaxFrameBytes: wire.MaxFrameBytes, MaxBatchItems: wire.MaxBatchItems}}
	case "service.health", "service.status", "profile.status", "service.diagnostics", "service.shutdown":
		if _, err := wire.DecodeParams[wire.EmptyParams](e.Params); err != nil {
			return fail(api.Invalid("INVALID_SERVICE_PARAMS"))
		}
		switch e.Method {
		case "service.health":
			if err := r.App.Service.Health(ctx, r.Identity); err != nil {
				return fail(err)
			}
			response.Result = wire.HealthResult{Status: "ok"}
		case "service.status", "profile.status":
			s, err := r.App.Service.Status(ctx, r.Identity)
			if err != nil {
				return fail(err)
			}
			policy, err := r.policyStatus(ctx, s.Profile.ProfileID)
			if err != nil {
				return fail(err)
			}
			if e.Method == "profile.status" {
				response.Result = struct {
					Policy        *wire.RuntimePolicyStatus `json:"policy,omitempty"`
					SchemaVersion int                       `json:"schemaVersion"`
					State         string                    `json:"state"`
					Profile       wire.ProfileMetadata      `json:"profile"`
				}{policy, wire.SchemaVersion, s.State, metadata(s.Profile)}
			} else {
				response.Result = wire.StatusResult{Policy: policy, SchemaVersion: wire.SchemaVersion, State: s.State, Profile: metadata(s.Profile), HostAttached: s.HostAttached}
			}
		case "service.diagnostics":
			d, err := r.App.Service.Diagnostics(ctx, r.Identity)
			if err != nil {
				return fail(err)
			}
			response.Result = wire.DiagnosticsResult{ProtocolVersion: wire.ProtocolVersion, SchemaVersion: wire.SchemaVersion, ActiveConnections: d.ActiveConnections, HostAttached: d.HostAttached}
		case "service.shutdown":
			if err := r.App.Service.Shutdown(ctx, r.Identity); err != nil {
				return fail(err)
			}
			response.Result = wire.ShutdownResult{Accepted: true}
		}
	case "host.attach":
		p, err := wire.DecodeParams[wire.HostAttachParams](e.Params)
		if err != nil {
			return fail(api.Invalid("INVALID_HOST_PARAMS"))
		}
		l, err := r.App.Host.Attach(ctx, r.Identity, api.HostAttachCommand{WorkspaceID: p.WorkspaceID, Capabilities: p.Capabilities}, remote)
		if err != nil {
			return fail(err)
		}
		response.Result = wire.HostLease{HostConnectionID: l.HostConnectionID, LeaseEpoch: l.LeaseEpoch, LeaseID: l.LeaseID, WorkspaceID: l.WorkspaceID, Capabilities: l.Capabilities, ExpiresAt: l.ExpiresAt}
	case "host.detach":
		p, err := wire.DecodeParams[wire.HostDetachParams](e.Params)
		if err != nil || p.LeaseID == "" {
			return fail(api.Invalid("INVALID_HOST_PARAMS"))
		}
		if err = r.App.Host.Detach(ctx, r.Identity, p.LeaseID); err != nil {
			return fail(err)
		}
		response.Result = wire.HostDetachResult{Detached: true}
	case "host.invoke", "host.queryReceipt", "host.read", "host.search", "host.prepareWrite", "host.checkWrite":
		return Failure(e.ID, -32000, "CAPABILITY_DENIED", "REVERSE_METHOD_ONLY", false)
	default:
		if result, ok := r.profile(ctx, e); ok {
			return result
		}
		if result, ok := r.portableHandle(ctx, e); ok {
			return result
		}
		if result, ok := r.memory(ctx, e); ok {
			return result
		}
		if result, ok := r.collaboration(ctx, e); ok {
			return result
		}
		if result, ok := r.events(ctx, e); ok {
			return result
		}
		if result, ok := r.approvals(ctx, e); ok {
			return result
		}
		if result, ok := r.conversation(ctx, e); ok {
			return result
		}
		if result, ok := r.grants(ctx, e); ok {
			return result
		}
		if result, ok := r.assistant(ctx, e); ok {
			return result
		}
		// No success placeholders: schema knowledge does not imply assembled capability.
		if strings.Contains(e.Method, ".") {
			return Failure(e.ID, -32601, "CAPABILITY_DENIED", "METHOD_NOT_AVAILABLE", false)
		}
		return Failure(e.ID, -32601, "INVALID_ARGUMENT", "METHOD_NOT_FOUND", false)
	}
	return response
}

// Dispatch validates against the public schema before interpreting any typed DTO.
func (r *Router) Dispatch(ctx context.Context, e wire.Envelope, remote api.HostRemote) Response {
	if e.Method != "protocol.hello" && !r.Ready() {
		return r.dispatch(ctx, e, remote)
	}
	installed := false
	for _, method := range r.availableMethods() {
		if e.Method == method {
			installed = true
			break
		}
	}
	if installed {
		params := e.Params
		if len(params) == 0 {
			params = json.RawMessage(`{}`)
		}
		if wire.ValidateMethod(e.Method, "params", params) != nil {
			if e.Method == "protocol.hello" {
				var raw map[string]json.RawMessage
				var version string
				if json.Unmarshal(params, &raw) == nil && json.Unmarshal(raw["protocolVersion"], &version) == nil && version != wire.ProtocolVersion {
					return Failure(e.ID, -32000, "PROTOCOL_INCOMPATIBLE", "PROTOCOL_VERSION_UNSUPPORTED", false)
				}
			}
			return FromError(e.ID, api.Invalid("INVALID_METHOD_PARAMS"))
		}
	}
	response := r.dispatch(ctx, e, remote)
	if installed && response.Error == nil {
		encoded, err := json.Marshal(response.Result)
		if err != nil || wire.ValidateMethod(e.Method, "result", encoded) != nil {
			return Failure(e.ID, -32603, "CONFLICT", "INVALID_APPLICATION_RESULT", false)
		}
		if e.Method == "protocol.hello" {
			r.ready.Store(true)
		}
	}
	return response
}

func (r *Router) policyStatus(ctx context.Context, profileID string) (*wire.RuntimePolicyStatus, error) {
	if r.App.Collaboration == nil {
		return nil, nil
	}
	p, e := r.App.Collaboration.Budget(ctx, r.Identity, api.BudgetQuery{ProfileID: profileID})
	if e != nil {
		return nil, e
	}
	l := p.Limits
	return &wire.RuntimePolicyStatus{Limits: wire.ExecutionLimits{MaxDepth: l.MaxDepth, MaxChildren: l.MaxChildren, RootChildren: l.RootChildren, ProfileChildren: l.ProfileChildren, MaxWakes: l.MaxWakes}, BudgetConfigured: p.Policy.RootTokenLimit != "" && p.Policy.RootTokenLimit != "0" && p.Policy.ProfileTokenLimit != "" && p.Policy.ProfileTokenLimit != "0", BudgetPaused: p.Policy.Paused}, nil
}
