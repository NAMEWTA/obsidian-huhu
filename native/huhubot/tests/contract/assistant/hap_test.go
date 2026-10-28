package assistant_test

import (
	"bytes"
	"encoding/json"
	"testing"

	inbound "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/inbound/hap"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	wire "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap"
)

func TestAssistantHAPStrictDTOAndNoSecretSurface(t *testing.T) {
	c, _, _ := open(t)
	router := inbound.New(c.API, owner)
	call := func(method string, p any) inbound.Response {
		t.Helper()
		body, e := json.Marshal(p)
		if e != nil {
			t.Fatal(e)
		}
		id := "c:" + method
		return router.Dispatch(ctx, wire.Envelope{JSONRPC: "2.0", ID: &id, Method: method, Params: body}, nil)
	}
	hello := call("protocol.hello", map[string]any{"protocolVersion": "0.1", "client": map[string]any{"name": "test", "version": "1"}})
	if hello.Error != nil {
		t.Fatal(hello.Error)
	}
	created := call("agents.create", api.AgentCreate{CommandMeta: meta(t, c, "hap-create", ""), Draft: api.AgentDraft{Name: "hap", Persona: "body"}})
	if created.Error != nil {
		t.Fatal(created.Error)
	}
	a := created.Result.(api.Agent)
	checks := []struct {
		method string
		params any
	}{
		{"agents.create", map[string]any{"CommandId": "bad", "idempotencyKey": "bad", "profileId": meta(t, c, "bad", "").ProfileID, "commandEpoch": "1", "draft": map[string]any{"name": "wrong-case", "description": "", "persona": ""}}},
		{"agents.update", map[string]any{"commandId": "bad", "idempotencyKey": "bad", "profileId": meta(t, c, "bad", "").ProfileID, "commandEpoch": "1", "id": a.ID, "draft": map[string]any{"name": "no-cas", "description": "", "persona": ""}}},
		{"agents.create", map[string]any{"commandId": "bad", "idempotencyKey": "bad", "profileId": meta(t, c, "bad", "").ProfileID, "commandEpoch": "1", "secret": sentinel, "draft": map[string]any{"name": "secret", "description": "", "persona": ""}}},
		{"models.test", map[string]any{"profileId": meta(t, c, "bad", "").ProfileID, "model": map[string]any{"modelId": "m", "providerId": "p", "endpoint": "https://fixture.invalid", "protocol": "openai-responses", "capabilities": []string{}, "apiKey": sentinel}}},
	}
	for _, check := range checks {
		r := call(check.method, check.params)
		if r.Error == nil || r.Error.Data.Reason != "INVALID_METHOD_PARAMS" {
			t.Fatalf("strict DTO %s %#v", check.method, r)
		}
		b, _ := json.Marshal(r)
		if bytes.Contains(b, []byte(sentinel)) {
			t.Fatal("secret echoed by error")
		}
	}
	got := call("agents.get", api.IDQuery{ProfileID: meta(t, c, "get", "").ProfileID, ID: a.ID})
	if got.Error != nil {
		t.Fatal(got.Error)
	}
	failed := call("models.test", api.ModelTest{ProfileID: meta(t, c, "probe", "").ProfileID, Model: api.ModelBindingDraft{ModelID: "m", ProviderID: "p", Endpoint: "https://fixture.invalid", Protocol: "openai-responses", Capabilities: []string{}}})
	if failed.Error == nil || failed.Error.Data.Kind != "MODEL_UNAVAILABLE" || failed.Error.Data.Reason != "CREDENTIAL_MISSING" {
		t.Fatal("false model success", failed)
	}
}
