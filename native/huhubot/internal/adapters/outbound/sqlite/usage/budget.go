package usage

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strconv"

	conv "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/conversation"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/execution/commands"
	policy "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/domain/collaboration/policy"
)

func validBudget(p api.BudgetPolicy) bool {
	for _, v := range []string{p.RootTokenLimit, p.ProfileTokenLimit, p.MaintenanceTokenLimit} {
		if _, ok := policy.Quantity(v); !ok {
			return false
		}
	}
	return true
}
func (s *Store) BudgetInTx(ctx context.Context, tx *sql.Tx, profile string) (api.BudgetSettings, error) {
	out := api.BudgetSettings{Limits: s.limits}
	if _, e := conv.Metadata(ctx, tx, profile); e != nil {
		return out, e
	}
	var raw string
	if e := tx.QueryRowContext(ctx, "SELECT policy_json,CAST(revision AS TEXT) FROM model_budget_policy WHERE singleton=1 AND profile_id=?", profile).Scan(&raw, &out.Revision); e != nil {
		return out, e
	}
	if raw == "{}" {
		out.Policy = s.budget
	} else if json.Unmarshal([]byte(raw), &out.Policy) != nil || !validBudget(out.Policy) {
		return out, fail("CONFLICT", "BUDGET_POLICY_INVALID")
	}
	return out, nil
}
func (s *Store) Budget(ctx context.Context, id api.RequestIdentity, q api.BudgetQuery) (api.BudgetSettings, error) {
	var out api.BudgetSettings
	if !id.Valid() {
		return out, api.Denied("IDENTITY_REQUIRED")
	}
	e := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		var e error
		out, e = s.BudgetInTx(ctx, tx, q.ProfileID)
		if e != nil || q.RunID == "" {
			return e
		}
		r, _, e := execution.ReadInTx(ctx, tx, id, api.IDQuery{ProfileID: q.ProfileID, ID: q.RunID})
		if e != nil {
			return e
		}
		out.Limits, e = s.rootLimitsInTx(ctx, tx, r.RootRunID)
		if e != nil {
			return e
		}
		root := r.BudgetRootRunID
		if root == "" {
			root = r.RootRunID
		}
		if root == "" {
			root = r.ID
		}
		out.RootRunID = root
		out.AccountID = "root:" + root
		var maintenance int
		if e = tx.QueryRowContext(ctx, "SELECT count(*) FROM memory_jobs j JOIN memory_namespaces n ON n.namespace_id=j.namespace_id WHERE j.run_id=? AND n.profile_id=? AND n.principal_id=? AND n.kind='agent' AND n.subject_id=?", r.ID, q.ProfileID, id.PrincipalID(), r.AgentID).Scan(&maintenance); e != nil {
			return e
		}
		if maintenance == 1 {
			out.AccountID = "maintenance:" + q.ProfileID
		}
		e = tx.QueryRowContext(ctx, "SELECT CAST(token_limit AS TEXT),CAST(reserved_tokens AS TEXT),CAST(charged_tokens AS TEXT) FROM model_budget_accounts WHERE account_id=? AND profile_id=?", out.AccountID, q.ProfileID).Scan(&out.RootTokenLimit, &out.ReservedTokens, &out.ChargedTokens)
		if errors.Is(e, sql.ErrNoRows) {
			out.RootTokenLimit = "0"
			out.ReservedTokens = "0"
			out.ChargedTokens = "0"
			return nil
		}
		if e != nil {
			return e
		}
		var unknown, estimated int
		if e = tx.QueryRowContext(ctx, "SELECT COALESCE(sum(CASE WHEN knowledge IN('','unknown') THEN 1 ELSE 0 END),0),COALESCE(sum(CASE WHEN knowledge='estimate' THEN 1 ELSE 0 END),0) FROM model_attempts WHERE account_id=? AND state IN('dispatched','settled')", out.AccountID).Scan(&unknown, &estimated); e != nil {
			return e
		}
		out.Knowledge = "known"
		if estimated > 0 {
			out.Knowledge = "estimate"
		}
		if unknown > 0 {
			out.Knowledge = "unknown"
		}
		return nil
	})
	return out, e
}
func (s *Store) ConfigureBudget(ctx context.Context, id api.RequestIdentity, c api.BudgetConfigure) (api.BudgetSettings, error) {
	var out api.BudgetSettings
	if e := commands.Validate(id, c.CommandMeta, true); e != nil {
		return out, e
	}
	if !validBudget(c.Policy) {
		return out, api.Invalid("INVALID_BUDGET_POLICY")
	}
	e := s.base.WithinTx(ctx, func(tx *sql.Tx) error {
		if _, e := conv.Epoch(ctx, tx, c.CommandMeta); e != nil {
			return e
		}
		hash := commands.Hash(c)
		found, e := conv.Receipt(ctx, tx, id, c.CommandMeta, "collaboration.configureBudget", hash, &out)
		if e != nil || found {
			return e
		}
		old, e := s.BudgetInTx(ctx, tx, c.ProfileID)
		if e != nil {
			return e
		}
		if old.Revision != c.ExpectedRevision {
			return fail("CONFLICT", "REVISION_CONFLICT")
		}
		if _, e = tx.ExecContext(ctx, "UPDATE model_budget_policy SET policy_json=?,revision=revision+1 WHERE singleton=1", encode(c.Policy)); e != nil {
			return e
		}
		for _, p := range []struct{ purpose, value string }{{"root", c.Policy.RootTokenLimit}, {"profile", c.Policy.ProfileTokenLimit}, {"maintenance", c.Policy.MaintenanceTokenLimit}} {
			n, configured := policy.Quantity(p.value)
			if _, e = tx.ExecContext(ctx, "UPDATE model_budget_accounts SET token_limit=?,configured=?,paused=?,revision=revision+1 WHERE profile_id=? AND ((?='profile' AND purpose='profile') OR (?='maintenance' AND purpose='maintenance') OR (?='root' AND purpose NOT IN('profile','maintenance')))", n, boolInt(configured && n > 0), boolInt(c.Policy.Paused), c.ProfileID, p.purpose, p.purpose, p.purpose); e != nil {
				return e
			}
		}
		out = api.BudgetSettings{Revision: strconv.FormatInt(parseRevision(old.Revision)+1, 10), Policy: c.Policy, Limits: s.limits}
		return conv.SaveReceipt(ctx, tx, id, c.CommandMeta, "collaboration.configureBudget", hash, "", out)
	})
	return out, e
}
func parseRevision(s string) int64 { n, _ := strconv.ParseInt(s, 10, 64); return n }
