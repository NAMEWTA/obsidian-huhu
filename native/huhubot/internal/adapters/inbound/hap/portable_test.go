package hap_test

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	hap "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/inbound/hap"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	portable "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/data/portable"
	wire "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap"
)

type portableStub struct {
	exports, previews, imports int
}

func (s *portableStub) Export(context.Context, api.RequestIdentity, portable.ExportRequest) (portable.ExportResult, error) {
	s.exports++
	return portable.ExportResult{Artifact: portable.ArtifactRef{ArtifactID: "artifact:one", MediaType: "application/json", Size: "1"}}, nil
}
func (s *portableStub) ImportPreview(context.Context, api.RequestIdentity, portable.ImportPreviewRequest) (portable.ImportPreviewResult, error) {
	s.previews++
	return portable.ImportPreviewResult{Token: "preview:one", Conflicts: []portable.ImportConflict{{ID: "agent:one", Revision: "1", Hash: "sha256:" + strings.Repeat("0", 64)}}}, nil
}
func (s *portableStub) Import(context.Context, api.RequestIdentity, portable.ImportRequest) (portable.ImportResult, error) {
	s.imports++
	return portable.ImportResult{CommandID: "command:one", ReceiptID: "receipt:one", Revision: "2"}, nil
}

func portableRouter(t *testing.T, service portable.API) *hap.Router {
	t.Helper()
	host := api.NewHostService()
	app := &api.Facade{Service: api.NewService(memoryResultProfile{}, host), Host: host}
	id := api.NewConnectionIdentity("portable-test", "user", false)
	r := hap.NewWithPortable(app, id, service)
	helloID := "hello"
	hello := r.Dispatch(context.Background(), wire.Envelope{ID: &helloID, Method: "protocol.hello", Params: json.RawMessage(`{"protocolVersion":"0.1","client":{"name":"portable-test","version":"1"}}`)}, nil)
	if hello.Error != nil || !r.Ready() {
		t.Fatalf("hello: %+v", hello.Error)
	}
	return r
}

func TestPortableMethodsAreNotAdvertisedWithoutAssembly(t *testing.T) {
	r := portableRouter(t, nil)
	id := "export"
	response := r.Dispatch(context.Background(), wire.Envelope{ID: &id, Method: "portable.export", Params: json.RawMessage(`{"commandId":"command:one","idempotencyKey":"key:one","profileId":"profile","commandEpoch":"1","agentIds":[],"memoryIds":[],"sessionIds":[]}`)}, nil)
	if response.Error == nil || response.Error.Data.Reason != "METHOD_NOT_AVAILABLE" {
		t.Fatalf("unassembled portable capability was exposed: %+v", response)
	}
}

func TestPortableMethodsUseInjectedServiceAndWireContract(t *testing.T) {
	stub := &portableStub{}
	r := portableRouter(t, stub)

	id := "export"
	export := r.Dispatch(context.Background(), wire.Envelope{ID: &id, Method: "portable.export", Params: json.RawMessage(`{"commandId":"command:one","idempotencyKey":"key:one","profileId":"profile","commandEpoch":"1","agentIds":[],"memoryIds":[],"sessionIds":[]}`)}, nil)
	if export.Error != nil || stub.exports != 1 {
		t.Fatalf("portable export failed: %+v calls=%d", export.Error, stub.exports)
	}

	id = "preview"
	preview := r.Dispatch(context.Background(), wire.Envelope{ID: &id, Method: "portable.importPreview", Params: json.RawMessage(`{"profileId":"profile","artifact":{"artifactId":"artifact:one","mediaType":"application/json","size":"1"}}`)}, nil)
	if preview.Error != nil || stub.previews != 1 {
		t.Fatalf("portable preview failed: %+v calls=%d", preview.Error, stub.previews)
	}

	id = "import"
	imp := r.Dispatch(context.Background(), wire.Envelope{ID: &id, Method: "portable.import", Params: json.RawMessage(`{"commandId":"command:one","idempotencyKey":"key:two","profileId":"profile","commandEpoch":"1","previewToken":"preview:one","resolutions":[]}`)}, nil)
	if imp.Error != nil || stub.imports != 1 {
		t.Fatalf("portable import failed: %+v calls=%d", imp.Error, stub.imports)
	}
}
