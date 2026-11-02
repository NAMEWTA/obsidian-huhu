package usage

import (
	"context"
	"database/sql"
)

// PendingProducers reports actual separately dispatched transports, not the
// lifetime of the model Engine goroutine. Shutdown must join both before the
// Profile database/lock can be released.
func (s *Store) PendingProducers(ctx context.Context) (int, error) {
	var n int
	e := s.base.Database().QueryRowContext(ctx, "SELECT count(*) FROM model_attempts WHERE state='dispatched' AND producer_ended=0").Scan(&n)
	return n, e
}

// RecoverAttemptsInTx runs only from bootstrap's original Executor.Recover,
// after the Profile's process lock proves that no prior producer remains here.
// It reconciles accounting facts; it never invokes a model or resumes a Run.
func (s *Store) RecoverAttemptsInTx(ctx context.Context, tx *sql.Tx) error {
	rows, e := tx.QueryContext(ctx, "SELECT a.attempt_id,a.account_id,b.profile_id,a.reserved_tokens,a.state,a.run_id FROM model_attempts a JOIN model_budget_accounts b ON b.account_id=a.account_id WHERE a.state IN('reserved','dispatched')")
	if e != nil {
		return e
	}
	type pending struct {
		id, account, profile, state, run string
		amount                           int64
	}
	all := []pending{}
	for rows.Next() {
		var p pending
		if e = rows.Scan(&p.id, &p.account, &p.profile, &p.amount, &p.state, &p.run); e != nil {
			rows.Close()
			return e
		}
		all = append(all, p)
	}
	e = rows.Err()
	rows.Close()
	if e != nil {
		return e
	}
	for _, p := range all {
		charge := int64(0)
		if p.state == "dispatched" {
			charge = p.amount
		}
		for _, account := range []string{p.account, "profile:" + p.profile} {
			if _, e = tx.ExecContext(ctx, "UPDATE model_budget_accounts SET reserved_tokens=reserved_tokens-?,charged_tokens=charged_tokens+?,revision=revision+1 WHERE account_id=?", p.amount, charge, account); e != nil {
				return e
			}
		}
		if p.state == "reserved" {
			_, e = tx.ExecContext(ctx, "UPDATE model_attempts SET state='aborted',producer_ended=1,revision=revision+1 WHERE attempt_id=?", p.id)
		} else {
			_, e = tx.ExecContext(ctx, "UPDATE model_attempts SET state='settled',knowledge='unknown',charged_tokens=reserved_tokens,producer_ended=1,settlement_hash='process-interrupted',revision=revision+1 WHERE attempt_id=?", p.id)
		}
		if e != nil {
			return e
		}
		if e = s.cleanupInTx(ctx, tx, p.run); e != nil {
			return e
		}
	}
	_, e = tx.ExecContext(ctx, "UPDATE execution_runs SET child_slot=0 WHERE child_slot<>0")
	return e
}
