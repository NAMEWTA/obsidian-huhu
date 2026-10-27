package grants

import (
	"context"
	"database/sql"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

type historicalTaskLineage struct{}

// replyParentInTx recognizes only a new, owned private root whose immutable
// retry relation was written by the original execution admission helper. A
// supplied ParentScope, old Grant ID or recipient cannot establish this proof.
func replyParentInTx(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, profile, run string) (string, error) {
	var parent string
	e := tx.QueryRowContext(ctx, `SELECT old.run_id FROM execution_runs n JOIN execution_runs old ON old.run_id=n.retry_of_run_id JOIN conversation_sessions ns ON ns.session_id=n.session_id JOIN conversation_sessions os ON os.session_id=old.session_id WHERE n.run_id=? AND n.root_run_id=n.run_id AND n.parent_run_id='' AND n.task_config_id<>'' AND n.work_thread_id=old.work_thread_id AND n.principal_id=? AND old.principal_id=n.principal_id AND ns.profile_id=? AND os.profile_id=ns.profile_id AND old.status IN('succeeded','failed','canceled') AND COALESCE(NULLIF(n.budget_root_run_id,''),n.root_run_id)=COALESCE(NULLIF(old.budget_root_run_id,''),old.root_run_id)`, run, id.PrincipalID(), profile).Scan(&parent)
	if e == sql.ErrNoRows {
		return "", nil
	}
	return parent, e
}
