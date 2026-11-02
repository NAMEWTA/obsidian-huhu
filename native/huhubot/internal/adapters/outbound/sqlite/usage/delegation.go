package usage

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

// DelegationInputInTx reads only this Run's durable admission. Claim invokes
// the same reader for initial execution and continuations, including reopen.
// Nothing is reconstructed from the caller's transient request or a Bot inbox.
func (s *Store) DelegationInputInTx(ctx context.Context, tx *sql.Tx, runID string) (*api.DelegationInput, error) {
	var input api.DelegationInput
	var parent, config string
	var delegation, constraints, expected sql.NullString
	e := tx.QueryRowContext(ctx, "SELECT r.parent_run_id,r.task_config_id,r.intent,d.delegation_id,d.constraints_json,d.expected_output FROM execution_runs r LEFT JOIN collaboration_delegations d ON d.child_run_id=r.run_id WHERE r.run_id=?", runID).Scan(&parent, &config, &input.Task, &delegation, &constraints, &expected)
	if e != nil {
		return nil, e
	}
	if !delegation.Valid {
		if parent != "" || config != "" {
			return nil, fail("CONFLICT", "DELEGATION_INPUT_INVALID")
		}
		return nil, nil
	}
	input.DelegationID = delegation.String
	input.ExpectedOutput = expected.String
	if !constraints.Valid || !expected.Valid || json.Unmarshal([]byte(constraints.String), &input.Constraints) != nil {
		return nil, fail("CONFLICT", "DELEGATION_INPUT_INVALID")
	}
	if input.Constraints == nil {
		input.Constraints = []string{}
	}
	if !api.ValidDelegationInput(input) {
		return nil, fail("CONFLICT", "DELEGATION_INPUT_INVALID")
	}
	return &input, nil
}
