package hap_test

import (
	"context"
	"encoding/json"
	"fmt"
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
	return portable.ImportPreviewResult{Token: "preview:one", MappingMode: "copy-candidate", Mappings: []portable.IDMapping{{Kind: "agent", From: "agent:one", To: "agent:copy"}}, Conflicts: []portable.ImportConflict{{ID: "agent:one", Revision: "1", Hash: "sha256:" + strings.Repeat("0", 64), Kind: "agent", ExistingID: "agent:existing", Reason: "NAME_CONFLICT", NeedsReview: true}}}, nil
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

type largePreview struct{ *portableStub }

func (s largePreview) ImportPreview(context.Context, api.RequestIdentity, portable.ImportPreviewRequest) (portable.ImportPreviewResult, error) {
	out := portable.ImportPreviewResult{Token: "preview:bounded", MappingMode: "copy-candidate", Mappings: []portable.IDMapping{}, Conflicts: []portable.ImportConflict{}}
	for i := 0; i < portable.MaxItems; i++ {
		old := fmt.Sprintf("agent:%032x", i)
		target := fmt.Sprintf("agent:%032x", i+portable.MaxItems)
		copy := fmt.Sprintf("agent:%032x", i+2*portable.MaxItems)
		out.Mappings = append(out.Mappings, portable.IDMapping{Kind: "agent", From: old, To: copy})
		out.Conflicts = append(out.Conflicts, portable.ImportConflict{ID: old, Revision: "1", Hash: "sha256:" + strings.Repeat("0", 64), Kind: "agent", ExistingID: target, Reason: "NAME_CONFLICT", NeedsReview: true})
	}
	return out, nil
}
func TestPortablePreviewRespectsHAPFrameBound(t *testing.T) {
	r := portableRouter(t, largePreview{&portableStub{}})
	id := "review"
	response := r.Dispatch(context.Background(), wire.Envelope{ID: &id, Method: "portable.importPreview", Params: json.RawMessage(`{"profileId":"profile","artifact":{"artifactId":"artifact:one","mediaType":"application/json","size":"1"}}`)}, nil)
	if response.Error == nil || response.Error.Data.Kind != "RESOURCE_LIMIT" || response.Error.Data.Reason != "PORTABLE_PREVIEW_TOO_LARGE" {
		t.Fatalf("oversized application preview was exposed as success: %+v", response.Error)
	}
	var frame strings.Builder
	if err := wire.WriteFrame(&frame, response); err != nil {
		encoded, _ := json.Marshal(response)
		t.Fatalf("preview result cannot be delivered: bytes=%d frameLimit=%d error=%v responseError=%+v", len(encoded), wire.MaxFrameBytes, err, response.Error)
	}
	status := r.Dispatch(context.Background(), wire.Envelope{ID: &id, Method: "service.status", Params: json.RawMessage(`{}`)}, nil)
	if status.Error != nil {
		t.Fatal("bounded preview error broke subsequent requests", status.Error)
	}
	if err := wire.WriteFrame(&frame, status); err != nil {
		t.Fatal(err)
	}

}

type budgetPreview struct {
	*portableStub
	result portable.ImportPreviewResult
}

func (s budgetPreview) ImportPreview(context.Context, api.RequestIdentity, portable.ImportPreviewRequest) (portable.ImportPreviewResult, error) {
	return s.result, nil
}
func TestPortablePreviewBudgetAllowsMaximumHAPBatch(t *testing.T) {
	result := portable.ImportPreviewResult{Token: "preview:batch", MappingMode: "copy-candidate", Mappings: []portable.IDMapping{}, Conflicts: []portable.ImportConflict{}}
	count := portable.MaxPreviewBytes / 128
	if count > portable.MaxItems {
		count = portable.MaxItems
	}
	for i := 0; i < count; i++ {
		result.Mappings = append(result.Mappings, portable.IDMapping{Kind: "agent", From: fmt.Sprintf("agent:%032x", i), To: fmt.Sprintf("agent:%032x", i+count)})
	}
	if err := portable.ValidatePreviewBudget(result); err != nil {
		t.Fatal(err)
	}
	router := portableRouter(t, budgetPreview{&portableStub{}, result})
	responses := []hap.Response{}
	for i := 0; i < wire.MaxBatchItems; i++ {
		id := fmt.Sprint("batch:", i)
		response := router.Dispatch(context.Background(), wire.Envelope{ID: &id, Method: "portable.importPreview", Params: json.RawMessage(`{"profileId":"profile","artifact":{"artifactId":"artifact:one","mediaType":"application/json","size":"1"}}`)}, nil)
		if response.Error != nil {
			t.Fatal(response.Error)
		}
		responses = append(responses, response)
	}
	var frame strings.Builder
	if err := wire.WriteFrame(&frame, responses); err != nil {
		t.Fatal("individually bounded previews overflowed the batch frame", err)
	}
}
