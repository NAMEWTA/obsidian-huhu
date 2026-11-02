// Package mailbox owns the selection boundary shared by initial and resumed
// model context. A durable Agent mailbox is always scoped to one causal root.
package mailbox

import "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"

const InboxWhere = "principal_id=? AND (to_run_id=? OR (to_run_id='' AND kind='notify' AND root_run_id=? AND to_agent_id=? AND work_thread_id=?))"

func InboxArgs(principal string, run api.Run) []any {
	root := run.RootRunID
	if root == "" {
		root = run.ID
	}
	return []any{principal, run.ID, root, run.AgentID, "mailbox:" + run.AgentID}
}
