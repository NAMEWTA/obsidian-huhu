package approval_test

import (
	"context"
	"errors"
	"reflect"
	"testing"
	"time"

	execution "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

func TestDeliveryBatchMatchesSingleReaderOwnershipAndDecodeRules(t *testing.T) {
	f := open(t, engine{run: func(context.Context, api.EngineInput, func(api.EngineEvent) error) (api.EngineResult, error) {
		return api.EngineResult{Status: "finished", Text: "plain"}, nil
	}, resume: finished}, time.Minute)
	r, e := f.core.API.Conversation.StartRun(ctx, owner, f.command)
	if e != nil {
		t.Fatal(e)
	}
	waitRun(t, f, r.RunID, "succeeded")
	d := db(t, f)
	cases := []struct {
		name, sql, profile, run, reason string
		identity                        api.RequestIdentity
	}{
		{name: "valid", profile: f.command.ProfileID, run: r.RunID, identity: owner},
		{name: "profile", profile: "profile:wrong", run: r.RunID, identity: owner, reason: "PROFILE_MISMATCH"},
		{name: "missing", profile: f.command.ProfileID, run: "run:missing", identity: owner, reason: "RUN_NOT_FOUND"},
		{name: "foreign", profile: f.command.ProfileID, run: r.RunID, identity: api.NewConnectionIdentity("other", "other", false), reason: "SESSION_READ_DENIED"},
		{name: "run-owner", sql: "UPDATE execution_runs SET principal_id='other'", profile: f.command.ProfileID, run: r.RunID, identity: owner, reason: "SESSION_READ_DENIED"},
		{name: "session-owner", sql: "UPDATE conversation_sessions SET principal_id='other'", profile: f.command.ProfileID, run: r.RunID, identity: owner, reason: "SESSION_READ_DENIED"},
		{name: "session-profile", sql: "UPDATE conversation_sessions SET profile_id='profile:wrong'", profile: f.command.ProfileID, run: r.RunID, identity: owner, reason: "PROFILE_MISMATCH"},
		{name: "missing-member", sql: "DELETE FROM conversation_members", profile: f.command.ProfileID, run: r.RunID, identity: owner, reason: "SESSION_NOT_FOUND"},
		{name: "recipient-json", sql: "UPDATE execution_runs SET recipient_json='{broken'", profile: f.command.ProfileID, run: r.RunID, identity: owner, reason: "RUN_CONTEXT_INVALID"},
		{name: "source-json", sql: "UPDATE execution_runs SET effective_source_json='{broken'", profile: f.command.ProfileID, run: r.RunID, identity: owner, reason: "RUN_CONTEXT_INVALID"},
		{name: "scope-json", sql: "UPDATE execution_runs SET effective_scope_json='{broken'", profile: f.command.ProfileID, run: r.RunID, identity: owner, reason: "RUN_CONTEXT_INVALID"},
		{name: "grant-json", sql: "UPDATE execution_runs SET effective_grants_json='{broken'", profile: f.command.ProfileID, run: r.RunID, identity: owner, reason: "RUN_CONTEXT_INVALID"},
		{name: "usage-json", sql: "UPDATE execution_runs SET usage_json='{broken'", profile: f.command.ProfileID, run: r.RunID, identity: owner, reason: "RUN_USAGE_INVALID"},
	}
	for _, test := range cases {
		t.Run(test.name, func(t *testing.T) {
			tx, e := d.BeginTx(ctx, nil)
			if e != nil {
				t.Fatal(e)
			}
			defer tx.Rollback()
			if test.sql != "" {
				if _, e = tx.ExecContext(ctx, test.sql); e != nil {
					t.Fatal(e)
				}
			}
			_, single, singleErr := execution.ReadInTx(ctx, tx, test.identity, api.IDQuery{ProfileID: test.profile, ID: test.run})
			batch, batchErr := execution.ReadAccessBatchInTx(ctx, tx, test.identity, test.profile, []string{test.run})
			if test.reason == "" {
				if singleErr != nil || batchErr != nil || !reflect.DeepEqual(single, batch[test.run]) {
					t.Fatal("single/batch diverged", single, batch, singleErr, batchErr)
				}
				return
			}
			var a, b *api.Fault
			if !errors.As(singleErr, &a) || !errors.As(batchErr, &b) || a.Reason != test.reason || b.Reason != a.Reason || b.Kind != a.Kind || batch != nil {
				t.Fatal("single/batch error diverged", singleErr, batchErr, batch)
			}
		})
	}
	for _, ids := range [][]string{nil, {r.RunID, r.RunID}, {""}, make([]string, 801)} {
		tx, e := d.BeginTx(ctx, nil)
		if e != nil {
			t.Fatal(e)
		}
		_, e = execution.ReadAccessBatchInTx(ctx, tx, owner, f.command.ProfileID, ids)
		_ = tx.Rollback()
		expect(t, e, "INVALID_DELIVERY_RUNS")
	}
}
