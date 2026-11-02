package assistant

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	app "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/assistant"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
)

func TestAgentDeleteRetainsBusyErasureDebtAndEventuallyRemovesCanary(t *testing.T) {
	ctx := context.Background()
	path := filepath.Join(t.TempDir(), "profile.sqlite3")
	if err := os.WriteFile(path, nil, 0600); err != nil {
		t.Fatal(err)
	}
	b, err := base.Open(ctx, &profile.Handle{DatabasePath: path, New: true})
	if err != nil {
		t.Fatal(err)
	}
	defer b.Close()
	s := New(b)
	const canary = "assistant-delete-physical-canary-8491"
	draft, _ := json.Marshal(api.AgentDraft{Name: "probe", Persona: canary})
	if err = b.WithinTx(ctx, func(tx *sql.Tx) error {
		if _, e := tx.Exec("INSERT INTO agents VALUES('agent:probe',1,1,0,0,0)"); e != nil {
			return e
		}
		_, e := tx.Exec("INSERT INTO persona_revisions VALUES('agent:probe',1,?)", string(draft))
		return e
	}); err != nil {
		t.Fatal(err)
	}
	metadata, err := b.ReadMetadata(ctx)
	if err != nil {
		t.Fatal(err)
	}
	identity := api.NewConnectionIdentity("connection", "principal", true)
	now := time.Now()
	preview, err := s.Preview(ctx, identity, api.IDQuery{ProfileID: metadata.ProfileID, ID: "agent:probe"}, "usage", nil, now)
	if err != nil {
		t.Fatal(err)
	}
	reader, err := sql.Open("sqlite3", path)
	if err != nil {
		t.Fatal(err)
	}
	defer reader.Close()
	pinned, err := reader.BeginTx(ctx, &sql.TxOptions{ReadOnly: true})
	if err != nil {
		t.Fatal(err)
	}
	defer pinned.Rollback()
	var body string
	if err = pinned.QueryRow("SELECT body FROM persona_revisions WHERE agent_id='agent:probe'").Scan(&body); err != nil {
		t.Fatal(err)
	}
	result, err := s.Mutate(ctx, app.Mutation{Kind: "agents.delete", Identity: identity, Meta: api.CommandMeta{ProfileID: metadata.ProfileID, CommandEpoch: metadata.CommandEpoch, ExpectedRevision: "1", CommandID: "delete", IdempotencyKey: "delete"}, ID: "agent:probe", PreviewToken: preview.Token, UsageHash: "usage", InputHash: "delete", Now: now})
	if err != nil || result.Receipt.ReceiptID == "" {
		t.Fatal("committed deletion failed", result, err)
	}
	deadline := time.Now().Add(3 * time.Second)
	for b.MaintenanceStatus().Attempts == 0 && time.Now().Before(deadline) {
		time.Sleep(time.Millisecond)
	}
	status := b.MaintenanceStatus()
	if !status.ErasurePending || status.LastError == nil {
		t.Fatal("busy debt lost", status)
	}
	wal, err := os.ReadFile(path + "-wal")
	if err != nil || !bytes.Contains(wal, []byte(canary)) {
		t.Fatal("canary not pinned", err)
	}
	var count int
	if err = b.Database().QueryRow("SELECT count(*) FROM persona_revisions WHERE agent_id='agent:probe'").Scan(&count); err != nil || count != 0 {
		t.Fatal("logical delete failed", count, err)
	}
	if err = pinned.Rollback(); err != nil {
		t.Fatal(err)
	}
	deadline = time.Now().Add(3 * time.Second)
	for b.MaintenanceStatus().ErasurePending && time.Now().Before(deadline) {
		time.Sleep(time.Millisecond)
	}
	if status = b.MaintenanceStatus(); status.ErasurePending || status.LastError != nil {
		t.Fatal("debt not retried", status)
	}
	for _, file := range []string{path, path + "-wal"} {
		data, e := os.ReadFile(file)
		if e != nil {
			t.Fatal(e)
		}
		if bytes.Contains(data, []byte(canary)) {
			t.Fatalf("canary remains in %s", file)
		}
	}
}
