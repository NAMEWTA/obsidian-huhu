package assistant_test

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

func TestDefaultMetadataProbeUsesOnlyExplicitGETAndDoesNotInferCapabilities(t *testing.T) {
	var requests atomic.Int32
	type request struct{ method, path, authorization, body string }
	captured := make(chan request, 4)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests.Add(1)
		body, e := io.ReadAll(r.Body)
		if e != nil {
			t.Error(e)
		}
		select {
		case captured <- request{r.Method, r.URL.RequestURI(), r.Header.Get("Authorization"), string(body)}:
		default:
			t.Error("unexpected metadata request overflow")
		}
		w.Header().Set("Content-Type", "application/json")
		if r.URL.Path == "/v1/models/metadata-model" {
			io.WriteString(w, `{"id":"metadata-model","object":"model","owned_by":"controlled"}`)
			return
		}
		w.WriteHeader(http.StatusNotFound)
		io.WriteString(w, `{"error":{"message":"PROBE_POLICY_FAKE_PRIVATE_KEY raw provider detail","type":"invalid_request_error"}}`)
	}))
	t.Cleanup(server.Close)
	c := openProbePolicy(t, nil)
	profile, m := probePolicyModel(t, c)
	m.Endpoint = server.URL + "/v1"
	if _, e := c.API.Assistant.Create(ctx, owner, api.AgentCreate{CommandMeta: meta(t, c, "metadata-private-agent", ""), Draft: api.AgentDraft{Name: "private metadata fixture", Persona: "PRIVATE_PERSONA_MUST_NOT_REACH_PROBE", Model: &m}}); e != nil {
		t.Fatal(e)
	}
	listed, e := c.API.Assistant.ListModels(ctx, owner, api.PageQuery{ProfileID: profile})
	if e != nil || len(listed.Items) != 1 || !listed.Items[0].Available || requests.Load() != 0 {
		t.Fatalf("default protocol discovery: %#v %v; HTTP=%d", listed, e, requests.Load())
	}
	tested, e := c.API.Assistant.TestModel(ctx, owner, api.ModelTest{ProfileID: profile, Model: m})
	if e != nil || !tested.Available || tested.Capabilities == nil || len(tested.Capabilities) != 0 {
		t.Fatalf("metadata access is not capability proof: %#v %v", tested, e)
	}
	if requests.Load() != 1 {
		t.Fatal("metadata request count", requests.Load())
	}
	first := <-captured
	if first != (request{http.MethodGet, "/v1/models/metadata-model", "Bearer PROBE_POLICY_FAKE_PRIVATE_KEY", ""}) {
		t.Fatalf("metadata request changed explicit destination or included input: %#v", first)
	}
	m.ModelID = "missing-model"
	_, e = c.API.Assistant.TestModel(ctx, owner, api.ModelTest{ProfileID: profile, Model: m})
	fault(t, e, "MODEL_PROBE_FAILED")
	encoded, encodeErr := json.Marshal(e)
	if encodeErr != nil || strings.Contains(string(encoded), "PROBE_POLICY_FAKE_PRIVATE_KEY") || strings.Contains(string(encoded), "raw provider") {
		t.Fatalf("unsafe metadata error: %s %v", encoded, encodeErr)
	}
	if requests.Load() != 2 {
		t.Fatal("failed metadata lookup retried or generated", requests.Load())
	}
	second := <-captured
	if second.method != http.MethodGet || second.path != "/v1/models/missing-model" || second.body != "" {
		t.Fatalf("metadata failure changed route: %#v", second)
	}
	m.Protocol = "openai-responses"
	_, e = c.API.Assistant.TestModel(ctx, owner, api.ModelTest{ProfileID: profile, Model: m})
	fault(t, e, "MODEL_PROBE_FAILED")
	encoded, encodeErr = json.Marshal(e)
	if encodeErr != nil || strings.Contains(string(encoded), "PROBE_POLICY_FAKE_PRIVATE_KEY") || strings.Contains(string(encoded), "raw provider") {
		t.Fatalf("unsafe Responses metadata error: %s %v", encoded, encodeErr)
	}
	if requests.Load() != 3 {
		t.Fatal("Responses metadata lookup retried or generated", requests.Load())
	}
	third := <-captured
	if third != (request{http.MethodGet, "/v1/models/missing-model", "Bearer PROBE_POLICY_FAKE_PRIVATE_KEY", ""}) {
		t.Fatalf("Responses metadata failure changed explicit destination or included input: %#v", third)
	}
}
