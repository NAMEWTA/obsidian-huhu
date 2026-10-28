package access_test

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base"
	grantsstore "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/grants"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
)

func TestBatchReadDeadlinesPreserveSingleChecksAndRejectMixedProfiles(t *testing.T) {
	f := open(t)
	one := f.source("source:batch", "PRIVATE_BATCH_SOURCE")
	validGrant := f.grant(t, one, "batch-valid")
	revokedGrant := f.grant(t, one, "batch-revoked")
	_, e := f.c.API.Grants.Revoke(ctx, owner, api.GrantRevoke{CommandMeta: f.meta("batch-revoke", revokedGrant.Revision), ID: revokedGrant.ID})
	if e != nil {
		t.Fatal(e)
	}
	expiredGrant := f.grant(t, one, "batch-expired")
	// A second real SQLite UoW reads only this test's isolated Profile. Its
	// explicit fixture write supplies a past expiry without waiting on a clock.
	db, e := base.Open(ctx, &profile.Handle{DatabasePath: f.database})
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() {
		if e := db.Close(); e != nil {
			t.Error(e)
		}
	})
	if e = db.WithinTx(ctx, func(tx *sql.Tx) error {
		_, e := tx.ExecContext(ctx, "UPDATE access_grants SET expires_at=? WHERE grant_id=?", "2000-01-01T00:00:00Z", expiredGrant.ID)
		return e
	}); e != nil {
		t.Fatal(e)
	}
	checks := grantsstore.New(db)
	valid := f.input([]api.SourceSnapshot{one}, validGrant)
	plain := f.input([]api.SourceSnapshot{})
	wrongProfile := plain
	wrongProfile.ProfileID = "profile:other"
	invalid := valid
	invalid.Sources = append([]api.SourceSnapshot(nil), valid.Sources...)
	invalid.Sources[0].Hash = "sha256:invalid"
	changedRecipient := valid
	changedRecipient.Recipient.Endpoint = "https://different.invalid/v1"
	revoked := f.input([]api.SourceSnapshot{one}, revokedGrant)
	expired := f.input([]api.SourceSnapshot{one}, expiredGrant)
	parent := valid
	parent.ParentScope = &api.AccessScope{Sources: valid.Sources, GrantIDs: []string{revokedGrant.ID}}
	alternative := f.input([]api.SourceSnapshot{one}, expiredGrant, validGrant)
	reason := func(e error) string {
		if e == nil {
			return ""
		}
		var fault *api.Fault
		if !errors.As(e, &fault) {
			return "unexpected non-Fault: " + e.Error()
		}
		return fault.Kind + ":" + fault.Reason
	}
	for _, test := range []struct {
		name   string
		inputs []api.RunAccessInput
		want   string
	}{
		{"plain-and-source", []api.RunAccessInput{plain, valid}, ""},
		{"mixed-profile", []api.RunAccessInput{plain, wrongProfile}, "CAPABILITY_DENIED:PROFILE_MISMATCH"},
		{"invalid-source", []api.RunAccessInput{plain, invalid}, "INVALID_ARGUMENT:INVALID_SOURCE_SNAPSHOT"},
		{"changed-recipient", []api.RunAccessInput{plain, changedRecipient}, "CAPABILITY_DENIED:RECIPIENT_CHANGED"},
		{"revoked-grant", []api.RunAccessInput{plain, revoked}, "CAPABILITY_DENIED:GRANT_REVOKED"},
		{"expired-grant", []api.RunAccessInput{plain, expired}, "CAPABILITY_DENIED:GRANT_EXPIRED"},
		{"revoked-parent", []api.RunAccessInput{plain, parent}, "CAPABILITY_DENIED:GRANT_REVOKED"},
		{"valid-alternative-to-expired", []api.RunAccessInput{plain, alternative}, ""},
	} {
		t.Run(test.name, func(t *testing.T) {
			if e := db.WithinTx(ctx, func(tx *sql.Tx) error {
				var single error
				for _, in := range test.inputs {
					if _, single = checks.ReadDeadlineInTx(ctx, tx, owner, in); single != nil {
						break
					}
				}
				until, batch := checks.ReadDeadlineBatchInTx(ctx, tx, owner, f.profile, test.inputs)
				if got := reason(single); got != test.want || reason(batch) != got {
					t.Fatalf("single/batch mismatch: single=%v batch=%v want=%s", single, batch, test.want)
				}
				if batch == nil && (until.IsZero() || time.Until(until) > 250*time.Millisecond || !time.Now().Before(until)) {
					t.Fatal("batch returned an invalid delivery deadline", until)
				}
				return nil
			}); e != nil {
				t.Fatal(e)
			}
		})
	}
	if e := db.WithinTx(ctx, func(tx *sql.Tx) error {
		_, e := checks.ReadDeadlineBatchInTx(ctx, tx, owner, "profile:other", []api.RunAccessInput{plain})
		requireFault(t, e, "PROFILE_MISMATCH")
		return nil
	}); e != nil {
		t.Fatal(e)
	}
}

func TestBatchReadFactsKeepSingleDecoderRecipientAndCurrentTransactionSemantics(t *testing.T) {
	f := open(t)
	source := f.source("source:facts", "PRIVATE_FACTS")
	grant, e := f.c.API.Grants.Create(ctx, owner, api.GrantCreate{CommandMeta: f.meta("facts-grant", ""), WorkspaceID: source.WorkspaceID, Scope: "source", ResourceID: source.ResourceID, Recipients: []api.GrantRecipient{f.recipient}, Operations: []string{"read", "send"}})
	if e != nil {
		t.Fatal(e)
	}
	run, e := f.c.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: f.meta("facts-run", "1"), SessionID: f.session, Intent: "controlled source", SourceRefs: []api.SourceSnapshot{source}, GrantIDs: []string{grant.ID}})
	if e != nil {
		t.Fatal(e)
	}
	db, e := base.Open(ctx, &profile.Handle{DatabasePath: f.database})
	if e != nil {
		t.Fatal(e)
	}
	defer db.Close()
	checks := grantsstore.New(db)
	in := f.input([]api.SourceSnapshot{source}, grant)
	in.TaskID = run.RunID
	compare := func(t *testing.T, tx *sql.Tx, id api.RequestIdentity, input api.RunAccessInput, want string) {
		t.Helper()
		_, single := checks.ReadDeadlineInTx(ctx, tx, id, input)
		_, batch := checks.ReadDeadlineBatchInTx(ctx, tx, id, f.profile, []api.RunAccessInput{input, input})
		code := func(e error) string {
			if e == nil {
				return ""
			}
			var fault *api.Fault
			if !errors.As(e, &fault) {
				return e.Error()
			}
			return fault.Kind + ":" + fault.Reason
		}
		if code(single) != want || code(batch) != want {
			t.Fatalf("single/batch changed semantics: single=%v batch=%v want=%s", single, batch, want)
		}
	}
	for _, test := range []struct {
		name, table, keyColumn, key, column, value, want string
	}{
		{"valid", "", "", "", "", "", ""},
		{"grant-operations-json", "access_grants", "grant_id", grant.ID, "operations_json", "{", "CONFLICT:GRANT_STATE_INVALID"},
		{"grant-recipients-json", "access_grants", "grant_id", grant.ID, "recipients_json", "{", "CONFLICT:GRANT_STATE_INVALID"},
		{"grant-expiry", "access_grants", "grant_id", grant.ID, "expires_at", "not-a-date", "CONFLICT:GRANT_STATE_INVALID"},
		{"run-recipient-json", "execution_runs", "run_id", run.RunID, "recipient_json", "{", "CONFLICT:RUN_RECIPIENT_INVALID"},
		{"run-principal", "execution_runs", "run_id", run.RunID, "principal_id", "other", "CAPABILITY_DENIED:RUN_SCOPE_MISMATCH"},
	} {
		t.Run(test.name, func(t *testing.T) {
			if e := db.WithinTx(ctx, func(tx *sql.Tx) error {
				var original string
				if test.table != "" {
					if e := tx.QueryRowContext(ctx, "SELECT "+test.column+" FROM "+test.table+" WHERE "+test.keyColumn+"=?", test.key).Scan(&original); e != nil {
						return e
					}
					if _, e := tx.ExecContext(ctx, "UPDATE "+test.table+" SET "+test.column+"=? WHERE "+test.keyColumn+"=?", test.value, test.key); e != nil {
						return e
					}
				}
				compare(t, tx, owner, in, test.want)
				if test.table != "" {
					_, e := tx.ExecContext(ctx, "UPDATE "+test.table+" SET "+test.column+"=? WHERE "+test.keyColumn+"=?", original, test.key)
					return e
				}
				return nil
			}); e != nil {
				t.Fatal(e)
			}
		})
	}
	if e := db.WithinTx(ctx, func(tx *sql.Tx) error {
		compare(t, tx, api.NewConnectionIdentity("connection:foreign", "other", false), in, "CAPABILITY_DENIED:RUN_SCOPE_MISMATCH")
		missing := in
		missing.GrantIDs = []string{"grant:missing"}
		compare(t, tx, owner, missing, "NOT_FOUND:GRANT_NOT_FOUND")
		changed := in
		changed.Recipient.Endpoint = "https://different.invalid/v1"
		compare(t, tx, owner, changed, "CAPABILITY_DENIED:RECIPIENT_CHANGED")
		return nil
	}); e != nil {
		t.Fatal(e)
	}
	otherSession, e := f.c.API.Conversation.CreateSession(ctx, owner, api.SessionCreate{CommandMeta: f.meta("facts-other-session", ""), Kind: "direct", Title: "Other facts", MemberIDs: []string{f.agent.ID}, WorkspaceID: source.WorkspaceID})
	if e != nil {
		t.Fatal(e)
	}
	otherRun, e := f.c.API.Conversation.StartRun(ctx, owner, api.RunStart{CommandMeta: f.meta("facts-other-run", otherSession.Revision), SessionID: otherSession.ID, Intent: "same recipient", SourceRefs: []api.SourceSnapshot{source}, GrantIDs: []string{grant.ID}})
	if e != nil {
		t.Fatal(e)
	}
	if e := db.WithinTx(ctx, func(tx *sql.Tx) error {
		// Both genuine Runs have identical recipient_json. Only one persisted
		// owner is altered: sharing its decoder must never share the first ACL.
		if _, e := tx.ExecContext(ctx, "UPDATE execution_runs SET principal_id='other' WHERE run_id=?", otherRun.RunID); e != nil {
			return e
		}
		other := in
		other.SessionID, other.TaskID = otherSession.ID, otherRun.RunID
		if _, e := checks.ReadDeadlineInTx(ctx, tx, owner, in); e != nil {
			return e
		}
		_, single := checks.ReadDeadlineInTx(ctx, tx, owner, other)
		requireFault(t, single, "RUN_SCOPE_MISMATCH")
		_, batch := checks.ReadDeadlineBatchInTx(ctx, tx, owner, f.profile, []api.RunAccessInput{in, other})
		requireFault(t, batch, "RUN_SCOPE_MISMATCH")
		_, e := tx.ExecContext(ctx, "UPDATE execution_runs SET principal_id=? WHERE run_id=?", owner.PrincipalID(), otherRun.RunID)
		return e
	}); e != nil {
		t.Fatal(e)
	}
	_, e = f.c.API.Grants.Revoke(ctx, owner, api.GrantRevoke{CommandMeta: f.meta("facts-revoke", grant.Revision), ID: grant.ID})
	if e != nil {
		t.Fatal(e)
	}
	if e := db.WithinTx(ctx, func(tx *sql.Tx) error {
		compare(t, tx, owner, in, "CAPABILITY_DENIED:GRANT_REVOKED")
		return nil
	}); e != nil {
		t.Fatal(e)
	}
}

func TestBatchReadFactsChunkMoreThanEightHundredUniqueGrantsWithoutNewCap(t *testing.T) {
	f := open(t)
	source := f.source("source:chunks", "PRIVATE_CHUNK_SOURCE")
	seed := f.grant(t, source, "chunk-seed")
	db, e := base.Open(ctx, &profile.Handle{DatabasePath: f.database})
	if e != nil {
		t.Fatal(e)
	}
	defer db.Close()
	inputs := []api.RunAccessInput{}
	// Controlled fixture copies canonical Grant rows, not Host/Run bodies. Each
	// of 26 legal inputs has one source and 32 alternative valid Grants:832 IDs.
	if e := db.WithinTx(ctx, func(tx *sql.Tx) error {
		statement, e := tx.PrepareContext(ctx, "INSERT INTO access_grants SELECT ?,profile_id,principal_id,workspace_id,scope,resource_id,operations_json,recipients_json,session_id,task_id,state,revision,expires_at FROM access_grants WHERE grant_id=?")
		if e != nil {
			return e
		}
		defer statement.Close()
		for i := 0; i < 26; i++ {
			input := f.input([]api.SourceSnapshot{source})
			for j := 0; j < 32; j++ {
				id := fmt.Sprintf("grant:chunk-%d-%d", i, j)
				if _, e := statement.ExecContext(ctx, id, seed.ID); e != nil {
					return e
				}
				input.GrantIDs = append(input.GrantIDs, id)
			}
			inputs = append(inputs, input)
		}
		return nil
	}); e != nil {
		t.Fatal(e)
	}
	checks := grantsstore.New(db)
	if e := db.WithinTx(ctx, func(tx *sql.Tx) error {
		if _, e := checks.ReadDeadlineBatchInTx(ctx, tx, owner, f.profile, inputs); e != nil {
			return e
		}
		canceled, cancel := context.WithCancel(ctx)
		cancel()
		_, e := checks.ReadDeadlineBatchInTx(canceled, tx, owner, f.profile, inputs)
		if !errors.Is(e, context.Canceled) {
			t.Fatal("canceled batch continued reading facts", e)
		}
		return nil
	}); e != nil {
		t.Fatal(e)
	}
	t.Log("832 unique current Grants across26 legal source inputs accepted in bounded chunks; pre-canceled read rejected; no uniqueGrant<=800 rule")
}
