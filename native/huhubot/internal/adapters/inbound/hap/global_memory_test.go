package hap_test

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"testing"

	hap "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/inbound/hap"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	wire "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap"
)

type globalOwnerStub struct {
	proposal api.MemoryProposal
	proposes int
	resolves int
}

func (s *globalOwnerStub) ProposeGlobal(context.Context, api.RequestIdentity, api.MemoryGlobalProposal) (api.MemoryProposal, error) {
	s.proposes++
	return s.proposal, nil
}
func (s *globalOwnerStub) ResolveGlobal(context.Context, api.RequestIdentity, api.MemoryResolve) (api.Receipt, error) {
	s.resolves++
	return api.Receipt{CommandID: "command:one", ReceiptID: "receipt:one", Revision: "2"}, nil
}

func globalOwnerPreview() api.MemoryProposal {
	text := "owner-visible global preview"
	return api.MemoryProposal{
		ID: "proposal:one", Revision: "1", Operation: "create", Scope: api.MemoryScope{Kind: "profile"},
		Body:        &api.MemoryBody{Text: text, Hash: fmt.Sprintf("sha256:%x", sha256.Sum256([]byte(text))), Provenance: "user", CreatorKind: "user", SourceRefs: []api.SourceSnapshot{}, SourceScopes: []api.SourceScope{}, Derived: []api.DerivedInput{}},
		PreviewHash: fmt.Sprintf("sha256:%x", sha256.Sum256([]byte("fixed preview"))), ExpiresAt: "2027-01-01T00:00:00Z", State: "pending",
	}
}

func globalRouter(t *testing.T, owner *globalOwnerStub, managed, installOwner bool) *hap.Router {
	t.Helper()
	host := api.NewHostService()
	app := &api.Facade{Service: api.NewService(memoryResultProfile{}, host), Host: host, GlobalMemory: owner}
	id := api.NewConnectionIdentity("owner-connection", "principal", managed)
	var r *hap.Router
	if installOwner {
		r = hap.NewOwner(app, id, owner)
	} else {
		r = hap.New(app, id)
	}
	helloID := "hello"
	hello := r.Dispatch(context.Background(), wire.Envelope{ID: &helloID, Method: "protocol.hello", Params: json.RawMessage(`{"protocolVersion":"0.1","client":{"name":"global-owner-test","version":"1"}}`)}, nil)
	if hello.Error != nil || !r.Ready() {
		t.Fatalf("hello: %+v", hello.Error)
	}
	return r
}

func TestGlobalMemoryRouterRequiresExplicitOwnerCapability(t *testing.T) {
	params := json.RawMessage(`{"commandId":"command:one","idempotencyKey":"key:one","profileId":"profile","commandEpoch":"1","expectedRevision":"1","operation":"create","scope":{"kind":"profile"},"text":"a fact","sources":[]}`)
	for _, managed := range []bool{false, true} {
		owner := &globalOwnerStub{proposal: globalOwnerPreview()}
		plain := globalRouter(t, owner, managed, false)
		id := "propose"
		denied := plain.Dispatch(context.Background(), wire.Envelope{ID: &id, Method: "memory.proposeGlobal", Params: params}, nil)
		if denied.Error == nil || denied.Error.Data.Reason != "METHOD_NOT_AVAILABLE" || owner.proposes != 0 {
			t.Fatalf("plain Router reached owner: managed=%t response=%+v calls=%d", managed, denied.Error, owner.proposes)
		}
		trusted := globalRouter(t, owner, managed, true)
		proposed := trusted.Dispatch(context.Background(), wire.Envelope{ID: &id, Method: "memory.proposeGlobal", Params: params}, nil)
		if proposed.Error != nil || owner.proposes != 1 || len(proposed.DeliverySubjects) != 1 || proposed.DeliverySubjects[0] != (api.DeliverySubject{Kind: "memory_proposal", ID: "proposal:one"}) {
			t.Fatalf("owner proposal not fenced: managed=%t response=%+v subjects=%+v", managed, proposed.Error, proposed.DeliverySubjects)
		}
		resolveID := "resolve"
		resolve := trusted.Dispatch(context.Background(), wire.Envelope{ID: &resolveID, Method: "memory.resolveGlobal", Params: json.RawMessage(fmt.Sprintf(`{"commandId":"command:one","idempotencyKey":"resolve:key","profileId":"profile","commandEpoch":"1","expectedRevision":"1","id":"proposal:one","decision":"approve","previewHash":%q}`, owner.proposal.PreviewHash))}, nil)
		if resolve.Error != nil || owner.resolves != 1 || len(resolve.DeliverySubjects) != 0 {
			t.Fatalf("owner resolve failed: managed=%t response=%+v", managed, resolve.Error)
		}
	}
}

func TestGlobalMemoryRouterRejectsInvalidPreviewBeforePhysicalSubject(t *testing.T) {
	owner := &globalOwnerStub{proposal: globalOwnerPreview()}
	owner.proposal.Body.Hash = fmt.Sprintf("sha256:%x", sha256.Sum256([]byte("forged")))
	r := globalRouter(t, owner, false, true)
	id := "propose"
	response := r.Dispatch(context.Background(), wire.Envelope{ID: &id, Method: "memory.proposeGlobal", Params: json.RawMessage(`{"commandId":"command:one","idempotencyKey":"key:one","profileId":"profile","commandEpoch":"1","expectedRevision":"1","operation":"create","scope":{"kind":"profile"},"text":"a fact","sources":[]}`)}, nil)
	if owner.proposes != 1 || response.Error == nil || response.Error.Data.Reason != "INVALID_APPLICATION_RESULT" || len(response.DeliverySubjects) != 0 {
		t.Fatalf("invalid preview escaped output gate: calls=%d error=%+v subjects=%+v", owner.proposes, response.Error, response.DeliverySubjects)
	}
}

func TestGlobalMemoryRouterReadsMetadataOnlyDeleteWithoutBodySubject(t *testing.T) {
	deletePreview := globalOwnerPreview()
	deletePreview.Operation, deletePreview.TargetItemID, deletePreview.TargetRevision = "delete", "item:revoked", "4"
	deletePreview.Body = nil
	owner := &globalOwnerStub{proposal: deletePreview}
	r := globalRouter(t, owner, false, true)
	id := "delete"
	proposed := r.Dispatch(context.Background(), wire.Envelope{ID: &id, Method: "memory.proposeGlobal", Params: json.RawMessage(`{"commandId":"command:delete","idempotencyKey":"key:delete","profileId":"profile","commandEpoch":"1","expectedRevision":"4","operation":"delete","targetItemId":"item:revoked","scope":{"kind":"profile"},"sources":[]}`)}, nil)
	if proposed.Error != nil || owner.proposes != 1 || len(proposed.DeliverySubjects) != 0 {
		t.Fatalf("metadata-only owner delete incorrectly exposed body subject: error=%+v subjects=%+v", proposed.Error, proposed.DeliverySubjects)
	}
	reader := &memoryResultAPI{object: api.MemoryObject{Kind: "proposal", Proposal: &deletePreview}}
	readRouter := memoryResultRouter(t, reader)
	getID := "get-delete"
	got := readRouter.Dispatch(context.Background(), wire.Envelope{ID: &getID, Method: "memory.get", Params: json.RawMessage(`{"profileId":"profile","namespace":{"kind":"global","id":"profile"},"kind":"proposal","id":"proposal:one"}`)}, nil)
	if got.Error != nil || reader.calls != 1 || len(got.DeliverySubjects) != 0 {
		t.Fatalf("global proposal metadata read blocked or mislabeled: error=%+v calls=%d subjects=%+v", got.Error, reader.calls, got.DeliverySubjects)
	}
}
