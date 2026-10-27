// Package migrations is the single owner of the ordered Profile schema registry.
package migrations

import _ "embed"

//go:embed 001-core.sql
var Core string

//go:embed 002-assistant.sql
var Assistant string

//go:embed 003-conversation-run.sql
var Conversation string

//go:embed 005-grants.sql
var Grants string

//go:embed 006-approval-effect.sql
var ApprovalEffect string

//go:embed 011-delegation.sql
var Delegation string

//go:embed 012-budget-message.sql
var BudgetMessage string

//go:embed 013-groups.sql
var Groups string

//go:embed 016-recovery.sql
var Recovery string

//go:embed 014-memory.sql
var Memory string

//go:embed 015-global-memory.sql
var GlobalMemory string

//go:embed 017-command-epoch.sql
var Purge string

const CurrentVersion = 12

// ApplicationID is the SQLite application_id "HUHU".
const ApplicationID = 0x48554855

// Ordered is updated by the migration owner when accepting a later ticket.
// Version numbers must be contiguous; old SQL remains immutable.
type Migration struct {
	Version            int
	SQL                string
	RebuildForeignKeys bool
}

var Ordered = []Migration{{Version: 1, SQL: Core}, {Version: 2, SQL: Assistant}, {Version: 3, SQL: Conversation}, {Version: 4, SQL: Grants}, {Version: 5, SQL: ApprovalEffect}, {Version: 6, SQL: Delegation}, {Version: 7, SQL: BudgetMessage}, {Version: 8, SQL: Groups, RebuildForeignKeys: true}, {Version: 9, SQL: Recovery}, {Version: 10, SQL: Memory}, {Version: 11, SQL: GlobalMemory}, {Version: 12, SQL: Purge}}
