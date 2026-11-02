package events_test

import (
	"context"
	"database/sql"
	"errors"
	"path/filepath"
	"reflect"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	eventsstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/events"
	grantsstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/grants"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	eventsapp "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/execution/events"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
)

type controlledProposalReader func(context.Context, *sql.Tx, api.RequestIdentity, string, []string) (time.Time, error)

func (f controlledProposalReader) ReadProposalDeadlineBatchInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile string, ids []string) (time.Time, error) {
	return f(ctx, tx, id, profile, ids)
}

func TestMixedRunAndProposalDeliveryKeepsBothCurrentQualificationFamilies(t *testing.T) {
	f := open(t)
	db, err := base.Open(ctx, &profile.Handle{DatabasePath: filepath.Join(f.locator, "profile.sqlite3")})
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	checks := grantsstore.New(db)
	store := eventsstore.New(db, checks)
	service := eventsapp.New(store)
	proposalIDs := []string{"proposal:mixed-first", "proposal:mixed-last"}
	calls := 0
	var refusal error
	store.SetGlobalProposalReader(controlledProposalReader(func(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile string, ids []string) (time.Time, error) {
		calls++
		if !reflect.DeepEqual(ids, proposalIDs) || id.PrincipalID() != owner.PrincipalID() || profile != f.profile {
			return time.Time{}, api.Denied("MEMORY_NAMESPACE_DENIED")
		}
		var count int
		if err := tx.QueryRowContext(ctx, "SELECT count(*) FROM execution_runs WHERE run_id=?", f.run.RunID).Scan(&count); err != nil {
			return time.Time{}, err
		}
		if count != 1 {
			return time.Time{}, errors.New("original Run was not present in the shared Tx")
		}
		return time.Now().Add(time.Second), refusal
	}))
	subjects := []api.DeliverySubject{{Kind: "memory_proposal", ID: proposalIDs[0]}, {Kind: "run", ID: f.run.RunID}, {Kind: "memory_proposal", ID: proposalIDs[1]}}
	writes := 0
	ordinary := api.NewConnectionIdentity("events:ordinary-owner", owner.PrincipalID(), false)
	write := func(ctx context.Context) error {
		if _, err := db.ReadMetadata(ctx); err != nil {
			return err
		}
		writes++
		return nil
	}
	if err = service.WithDelivery(ctx, ordinary, subjects, write); err != nil || writes != 1 || calls != 1 {
		t.Fatal("ordinary same-owner connection could not qualify the complete mixed page", writes, calls, err)
	}
	refusal = api.Denied("MEMORY_PROPOSAL_NOT_PENDING")
	if err = service.WithDelivery(ctx, owner, subjects, write); err == nil || writes != 1 || calls != 2 {
		t.Fatal("a legal Run masked a decided proposal", writes, calls, err)
	}
	refusal = nil
	bad := append([]api.DeliverySubject(nil), subjects...)
	bad[1].ID = "run:missing"
	if err = service.WithDelivery(ctx, owner, bad, write); err == nil || writes != 1 || calls != 2 {
		t.Fatal("pending proposals masked a missing Run", writes, calls, err)
	}
	// A proposal handle never becomes a confirmed revision through its spelling.
	if err = service.WithDelivery(ctx, owner, []api.DeliverySubject{{Kind: "memory_revision", ID: proposalIDs[0]}}, write); err == nil || writes != 1 || calls != 2 {
		t.Fatal("unconfirmed proposal was treated as a memory revision", writes, calls, err)
	}
}
