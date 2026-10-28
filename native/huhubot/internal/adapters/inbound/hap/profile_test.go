package hap_test

import (
	"context"
	"encoding/json"
	"testing"

	hap "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/inbound/hap"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	wire "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap"
)

type profileStub struct {
	previewCalls int
	deleteCalls  int
	preview      api.ProfileDeletePreviewRequest
	command      api.ProfileDeleteCommand
}

func (s *profileStub) DeletePreview(_ context.Context, _ api.RequestIdentity, request api.ProfileDeletePreviewRequest) (api.DeletionPreview, error) {
	s.previewCalls++
	s.preview = request
	return api.DeletionPreview{
		Token: "preview:one", Revision: "1", ExpiresAt: "2026-10-27T00:00:00Z",
		Categories: []api.DeletionCategory{{Kind: "profile", Count: 1}},
	}, nil
}

func (s *profileStub) Delete(_ context.Context, _ api.RequestIdentity, command api.ProfileDeleteCommand) (api.Receipt, error) {
	s.deleteCalls++
	s.command = command
	return api.Receipt{CommandID: command.CommandID, ReceiptID: "receipt:one", Revision: "2"}, nil
}

func profileRouter(t *testing.T, profile api.ProfileAPI) *hap.Router {
	t.Helper()
	host := api.NewHostService()
	app := &api.Facade{Service: api.NewService(memoryResultProfile{}, host), Host: host, Profile: profile}
	r := hap.New(app, api.NewConnectionIdentity("profile-test", "user", false))
	id := "hello"
	hello := r.Dispatch(context.Background(), wire.Envelope{ID: &id, Method: "protocol.hello", Params: json.RawMessage(`{"protocolVersion":"0.1","client":{"name":"profile-test","version":"1"}}`)}, nil)
	if hello.Error != nil || !r.Ready() {
		t.Fatalf("hello: %+v", hello.Error)
	}
	return r
}

func TestProfileMethodsAreNotAdvertisedWithoutAssembly(t *testing.T) {
	r := profileRouter(t, nil)
	id := "preview"
	response := r.Dispatch(context.Background(), wire.Envelope{ID: &id, Method: "profile.deletePreview", Params: json.RawMessage(`{"profileId":"profile"}`)}, nil)
	if response.Error == nil || response.Error.Data.Reason != "METHOD_NOT_AVAILABLE" {
		t.Fatalf("unassembled profile capability was exposed: %+v", response)
	}
}

func TestProfileMethodsMapWireDTOsAndValidateResults(t *testing.T) {
	stub := &profileStub{}
	r := profileRouter(t, stub)

	id := "preview"
	preview := r.Dispatch(context.Background(), wire.Envelope{ID: &id, Method: "profile.deletePreview", Params: json.RawMessage(`{"profileId":"profile"}`)}, nil)
	if preview.Error != nil || stub.previewCalls != 1 || stub.preview.ProfileID != "profile" {
		t.Fatalf("profile preview failed: error=%+v calls=%d request=%+v", preview.Error, stub.previewCalls, stub.preview)
	}

	id = "delete"
	deleteResponse := r.Dispatch(context.Background(), wire.Envelope{ID: &id, Method: "profile.delete", Params: json.RawMessage(`{"id":"profile-delete","previewToken":"preview:one","retainMemoryIds":["memory:one"],"commandId":"command:one","idempotencyKey":"key:one","profileId":"profile","commandEpoch":"1","expectedRevision":"1"}`)}, nil)
	if deleteResponse.Error != nil || stub.deleteCalls != 1 {
		t.Fatalf("profile delete failed: error=%+v calls=%d", deleteResponse.Error, stub.deleteCalls)
	}
	if stub.command.CommandID != "command:one" || stub.command.IdempotencyKey != "key:one" || stub.command.ProfileID != "profile" || stub.command.CommandEpoch != "1" || stub.command.ExpectedRevision != "1" || stub.command.ID != "profile-delete" || len(stub.command.RetainMemoryIDs) != 1 || stub.command.RetainMemoryIDs[0] != "memory:one" {
		t.Fatalf("wire command was not mapped: %+v", stub.command)
	}
}
