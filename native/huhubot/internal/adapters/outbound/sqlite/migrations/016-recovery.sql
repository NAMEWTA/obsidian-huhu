-- Execution positions are captured by the sole executor before consuming a
-- continuation. An empty legacy value is inspected from existing durable facts;
-- it is never interpreted as permission to start a previously running model.
ALTER TABLE execution_runs ADD COLUMN execution_position_json TEXT NOT NULL DEFAULT '';

CREATE TABLE execution_recovery_trees (
 root_run_id TEXT PRIMARY KEY REFERENCES execution_runs(run_id),
 generation INTEGER NOT NULL CHECK(generation>0),
 state TEXT NOT NULL CHECK(state IN('checking','ready','blocked','resuming')),
 tree_revision TEXT NOT NULL DEFAULT '',
 affected_run_ids_json TEXT NOT NULL,
 interrupted_run_ids_json TEXT NOT NULL,
 reason TEXT NOT NULL DEFAULT '',
 checked_at TEXT NOT NULL DEFAULT ''
) STRICT;

-- This is the current Profile process's admission fence. Bootstrap resets it
-- only after obtaining the exclusive Profile lock and recovering old producers.
CREATE TABLE execution_recovery_runtime (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1),
 state TEXT NOT NULL CHECK(state IN('open','stopping'))
) STRICT;
INSERT INTO execution_recovery_runtime VALUES(1,'open');
