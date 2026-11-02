package privatememory_test

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
	"testing"

	entrance "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/inbound/hap"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
	wire "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/protocol/hap"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
)

var owner = api.NewConnectionIdentity("memory-contract", "owner", true)

func call(t *testing.T, router *entrance.Router, method string, value any) entrance.Response {
	t.Helper()
	params, err := json.Marshal(value)
	if err != nil {
		t.Fatal(err)
	}
	id := "request:memory"
	return router.Dispatch(context.Background(), wire.Envelope{ID: &id, Method: method, Params: params}, nil)
}

func result[T any](t *testing.T, response entrance.Response) T {
	t.Helper()
	if response.Error != nil {
		t.Fatalf("expected real memory result, got %s/%s", response.Error.Data.Kind, response.Error.Data.Reason)
	}
	raw, err := json.Marshal(response.Result)
	if err != nil {
		t.Fatal(err)
	}
	var value T
	if err = json.Unmarshal(raw, &value); err != nil {
		t.Fatal(err)
	}
	return value
}

func routerFor(t *testing.T, core *bootstrap.Core) *entrance.Router {
	t.Helper()
	router := entrance.New(core.API, owner)
	hello := call(t, router, "protocol.hello", map[string]any{"protocolVersion": "0.1", "client": map[string]string{"name": "memory-contract", "version": "1"}})
	if hello.Error != nil {
		t.Fatal(hello.Error)
	}
	return router
}

func namespaceCount(t *testing.T, directory string) int {
	t.Helper()
	db, err := sql.Open("sqlite3", filepath.Join(directory, profile.DatabaseName))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	var present int
	if err = db.QueryRow("SELECT count(*) FROM sqlite_master WHERE type='table' AND name='memory_namespaces'").Scan(&present); err != nil {
		t.Fatal(err)
	}
	if present == 0 {
		return 0
	}
	var count int
	if err = db.QueryRow("SELECT count(*) FROM memory_namespaces").Scan(&count); err != nil {
		t.Fatal(err)
	}
	return count
}

func TestDefaultMemorySettingsAreVirtualAndPrivateManagementIsDurable(t *testing.T) {
	ctx := context.Background()
	root := filepath.Join(t.TempDir(), "profiles")
	if err := os.Mkdir(root, 0700); err != nil {
		t.Fatal(err)
	}
	directory := filepath.Join(root, "one")
	core, err := bootstrap.OpenWithOptions(ctx, root, directory, bootstrap.Options{ExecutorPaused: true})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := core.Close(); err != nil {
			t.Error(err)
		}
		<-core.Done()
	})
	status, err := core.API.Service.Status(ctx, owner)
	if err != nil {
		t.Fatal(err)
	}
	meta := api.CommandMeta{ProfileID: status.Profile.ProfileID, CommandEpoch: status.Profile.CommandEpoch, CommandID: "agent:create", IdempotencyKey: "agent:create"}
	agent, err := core.API.Assistant.Create(ctx, owner, api.AgentCreate{CommandMeta: meta, Draft: api.AgentDraft{Name: "private memory", Persona: "A user-owned memory consumer"}})
	if err != nil {
		t.Fatal(err)
	}
	namespace := api.MemoryNamespace{Kind: "agent", ID: agent.ID}
	router := routerFor(t, core)
	before := namespaceCount(t, directory)
	settings := result[api.MemoryObject](t, call(t, router, "memory.get", api.MemoryGet{ProfileID: meta.ProfileID, Namespace: namespace, Kind: "settings"}))
	if settings.Kind != "settings" || settings.Settings == nil || settings.Settings.Revision != "1" || !settings.Settings.Enabled || settings.Settings.Eligible || settings.Settings.Reason != "BUDGET_NOT_CONFIGURED" {
		t.Fatalf("virtual default/independent budget: %#v", settings)
	}
	page := result[api.MemoryPage](t, call(t, router, "memory.list", api.MemoryQuery{ProfileID: meta.ProfileID, Namespace: namespace, Kind: "item"}))
	if page.NamespaceRevision != "1" || page.Items == nil || len(page.Items) != 0 || namespaceCount(t, directory) != before {
		t.Fatalf("read materialized private memory: %#v", page)
	}
	meta.CommandID, meta.IdempotencyKey, meta.ExpectedRevision = "memory:add", "memory:add", "1"
	text := "独立用户事实：喜爱 é 与 👩‍💻，不隐含模型或来源权限。"
	item := result[api.MemoryItem](t, call(t, router, "memory.correct", api.MemoryCorrect{CommandMeta: meta, Namespace: namespace, Action: "add", Scope: &api.MemoryScope{Kind: "profile"}, Text: text}))
	hash := sha256.Sum256([]byte(text))
	if item.ID == "" || item.RevisionID == "" || item.ID == item.RevisionID || item.Revision != "1" || item.State != "active" || item.Body == nil || item.Body.Text != text || item.Body.Hash != "sha256:"+hex.EncodeToString(hash[:]) || item.Body.Provenance != "user" || item.Body.CreatorKind != "user" || item.Body.SourceRefs == nil || item.Body.SourceScopes == nil || item.Body.Derived == nil {
		t.Fatalf("durable user revision: %#v", item)
	}
	if namespaceCount(t, directory) != before+1 {
		t.Fatal("first write did not materialize exactly one namespace")
	}
	if err = core.Close(); err != nil {
		t.Fatal(err)
	}
	<-core.Done()
	reopened, err := bootstrap.OpenWithOptions(ctx, root, directory, bootstrap.Options{ExecutorPaused: true})
	if err != nil {
		t.Fatal(err)
	}
	core = reopened
	read := result[api.MemoryObject](t, call(t, routerFor(t, core), "memory.get", api.MemoryGet{ProfileID: meta.ProfileID, Namespace: namespace, Kind: "item", ID: item.ID}))
	if read.Item == nil || !reflect.DeepEqual(*read.Item, item) {
		t.Fatalf("reopen lost exact private revision: %#v != %#v", read.Item, item)
	}
}
