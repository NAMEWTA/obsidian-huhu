// Package responses implements the stateless Responses protocol behind the
// shared HUHU model/tool loop. Provider items never become application DTOs.
package responses

import (
	"context"
	"net/http"
	"net/url"
	"strings"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/common"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/httpcall"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	openai "github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/option"
	"github.com/openai/openai-go/v3/packages/ssestream"
	sdk "github.com/openai/openai-go/v3/responses"
)

const (
	Protocol      = "openai-responses"
	EngineVersion = "huhu-openai-go-3.44.0-responses-bridge-v1"
	StateFormat   = "huhu-openai-responses-state-v1"
)

// Driver owns one shared HTTP runtime. Stop closes admission; Done includes
// actual body closure and outstanding settlement. Close requires Done.
type Driver struct{ runtime *httpcall.Runtime }

// NewDriver returns no partially owned runtime on failure. A successful caller
// must transfer the driver to a Registry or Stop, await Done, and Close it.
func NewDriver() (*Driver, error) {
	return driverFromRuntime(httpcall.NewRuntime(runtimeLimits()))
}

// NewDriverWithTransport retains the same bounded shared HTTP runtime while
// allowing infrastructure tests to observe the real provider body's lifetime.
// It does not replace request admission, cleanup, or settlement.
func NewDriverWithTransport(transport http.RoundTripper) (*Driver, error) {
	return driverFromRuntime(httpcall.NewRuntimeWithTransport(runtimeLimits(), transport))
}

func runtimeLimits() httpcall.Limits {
	return httpcall.Limits{
		RequestBytes: common.MaxRequestBytes, ResponseBytes: common.MaxResponseBytes,
		LineBytes: common.MaxLineBytes, EventBytes: common.MaxEventBytes,
		RequestTimeout: common.RequestTimeout, IdleTimeout: common.IdleTimeout,
		CleanupTimeout: common.CleanupTimeout,
	}
}

func driverFromRuntime(runtime *httpcall.Runtime, err error) (*Driver, error) {
	if err != nil {
		return nil, err
	}
	return &Driver{runtime: runtime}, nil
}

func (*Driver) Identity() common.ProtocolIdentity {
	return common.ProtocolIdentity{Protocol: Protocol, EngineVersion: EngineVersion, StateFormat: StateFormat}
}
func (d *Driver) Stop()                 { d.runtime.Stop() }
func (d *Driver) Done() <-chan struct{} { return d.runtime.Done() }
func (d *Driver) Close() error          { return d.runtime.Close() }

func validModel(model api.ModelBindingDraft, credential []byte) error {
	u, err := url.Parse(model.Endpoint)
	if model.Protocol != Protocol || err != nil || u.Host == "" || (u.Scheme != "http" && u.Scheme != "https") || u.User != nil || u.RawQuery != "" || u.Fragment != "" || model.ModelID == "" || model.ProviderID == "" || len(credential) == 0 {
		return common.Fault("MODEL_CONFIG_INVALID")
	}
	return nil
}

func sdkOptions(model api.ModelBindingDraft, credential []byte, client option.HTTPClient) []option.RequestOption {
	return []option.RequestOption{option.WithBaseURL(strings.TrimRight(model.Endpoint, "/") + "/"), option.WithAPIKey(string(credential)), option.WithHTTPClient(client), option.WithMaxRetries(0)}
}

func (d *Driver) Generate(ctx context.Context, generation common.Generation) (result common.TurnResult, err error) {
	if err = validModel(generation.Model, generation.Credential); err != nil {
		return result, err
	}
	if err = d.ValidateState(ctx, generation.View, generation.PriorState); err != nil {
		return result, err
	}
	request, err := buildRequest(generation)
	if err != nil {
		return result, err
	}
	assembly := newStreamState(generation.Model.ModelID, generation.EmitText)
	call, err := d.runtime.BeginGeneration(ctx, httpcall.RequestSpec{
		URL:      strings.TrimRight(generation.Model.Endpoint, "/") + "/responses",
		Attempts: generation.Attempts, LogicalCallID: generation.LogicalCallID,
		OutputBound:  common.MaxOutputTokens,
		ValidateBody: func(body []byte) error { return validateRequest(body, generation.Model.ModelID) },
		ObserveEvent: assembly.observe,
	})
	if err != nil {
		return result, err
	}
	var stream *ssestream.Stream[sdk.ResponseStreamEventUnion]
	defer func() {
		if recover() != nil {
			err = common.Fault("MODEL_STREAM_FAILED")
		}
		call.Cancel()
		cleanup := call.Finish(func() error {
			if stream != nil {
				return stream.Close()
			}
			return nil
		}, func() api.AttemptObservation { return assembly.observation })
		if cleanup != nil {
			err = cleanup
		}
		if err != nil {
			result = common.TurnResult{}
		}
	}()
	// Services do not read environment defaults; NewClient does, even when its
	// endpoint and key are overridden later (organization/custom headers remain).
	service := sdk.NewResponseService(sdkOptions(generation.Model, generation.Credential, call.Client())...)
	stream = service.NewStreaming(call.Context(), request)
	for stream.Next() {
		if call.Context().Err() != nil {
			return result, common.Fault("MODEL_CANCELED")
		}
		event := stream.Current()
		if err = assembly.consume(event); err != nil {
			return result, err
		}
	}
	if admission := call.AdmissionError(); admission != nil {
		return result, admission
	}
	if assembly.wireError != nil {
		return result, assembly.wireError
	}
	if call.Context().Err() != nil {
		return result, common.Fault("MODEL_CANCELED")
	}
	if stream.Err() != nil {
		return result, common.Fault("MODEL_STREAM_FAILED")
	}
	message, round, err := assembly.finish()
	if err != nil {
		return result, err
	}
	round.Turn = generation.View.Turns + 1
	round.MessageIndex = len(generation.View.Messages)
	state, err := appendRound(generation.PriorState, round)
	if err != nil {
		return result, err
	}
	return common.TurnResult{Message: message, ProtocolState: state}, nil
}

func (d *Driver) Probe(ctx context.Context, model api.ModelBindingDraft, credential []byte) (capabilities []string, err error) {
	if err = validModel(model, credential); err != nil {
		return nil, err
	}
	if strings.ContainsAny(model.ModelID, "/\\?#%") || model.ModelID == "." || model.ModelID == ".." {
		return nil, common.Fault("MODEL_ID_INVALID")
	}
	call, err := d.runtime.BeginProbe(ctx, strings.TrimRight(model.Endpoint, "/")+"/models/"+url.PathEscape(model.ModelID))
	if err != nil {
		return nil, err
	}
	defer func() {
		if recover() != nil {
			err = common.Fault("MODEL_PROBE_FAILED")
		}
		call.Cancel()
		if cleanup := call.Finish(func() error { return nil }); cleanup != nil {
			err = cleanup
		}
		if err != nil {
			capabilities = nil
		}
	}()
	service := openai.NewModelService(sdkOptions(model, credential, call.Client())...)
	value, err := service.Get(call.Context(), model.ModelID)
	if err != nil || value == nil || value.ID != model.ModelID {
		return nil, common.Fault("MODEL_PROBE_FAILED")
	}
	return []string{}, nil
}

var _ common.ProtocolDriver = (*Driver)(nil)
