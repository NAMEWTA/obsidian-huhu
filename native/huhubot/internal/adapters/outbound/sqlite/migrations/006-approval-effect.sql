ALTER TABLE execution_runs ADD COLUMN admission_closed INTEGER NOT NULL DEFAULT 0 CHECK(admission_closed IN(0,1));
ALTER TABLE execution_runs ADD COLUMN cancel_epoch INTEGER NOT NULL DEFAULT 0;
ALTER TABLE execution_runs ADD COLUMN resume_generation INTEGER NOT NULL DEFAULT 0;
ALTER TABLE execution_runs ADD COLUMN effects_unresolved INTEGER NOT NULL DEFAULT 0 CHECK(effects_unresolved IN(0,1));
CREATE TABLE execution_effects (
 effect_id TEXT PRIMARY KEY,
 run_id TEXT NOT NULL REFERENCES execution_runs(run_id),
 tool_call_id TEXT NOT NULL,
 principal_id TEXT NOT NULL,
 command_epoch TEXT NOT NULL,
 input_hash TEXT NOT NULL,
 suspension_token TEXT NOT NULL UNIQUE,
 preview_json TEXT NOT NULL,
 lease_json TEXT NOT NULL,
 state TEXT NOT NULL,
 receipt_json TEXT NOT NULL DEFAULT '',
 reason TEXT NOT NULL DEFAULT '',
 UNIQUE(run_id,tool_call_id)
) STRICT;
CREATE TABLE execution_checkpoints (
 ref TEXT PRIMARY KEY,
 run_id TEXT NOT NULL REFERENCES execution_runs(run_id),
 artifact_json TEXT NOT NULL
) STRICT;
CREATE TABLE access_approvals (
 approval_id TEXT PRIMARY KEY,
 effect_id TEXT NOT NULL UNIQUE REFERENCES execution_effects(effect_id),
 run_id TEXT NOT NULL REFERENCES execution_runs(run_id),
 principal_id TEXT NOT NULL,
 revision INTEGER NOT NULL CHECK(revision>0),
 expires_at TEXT NOT NULL,
 status TEXT NOT NULL,
 checkpoint_ref TEXT NOT NULL REFERENCES execution_checkpoints(ref)
) STRICT;
CREATE INDEX approval_expiration ON access_approvals(status,expires_at);
CREATE TABLE execution_continuations (
 effect_id TEXT PRIMARY KEY REFERENCES execution_effects(effect_id),
 approval_id TEXT NOT NULL REFERENCES access_approvals(approval_id),
 run_id TEXT NOT NULL REFERENCES execution_runs(run_id),
 decision TEXT NOT NULL,
 generation INTEGER NOT NULL,
 state TEXT NOT NULL,
 claim_token TEXT NOT NULL DEFAULT '',
 checkpoint_ref TEXT NOT NULL REFERENCES execution_checkpoints(ref)
) STRICT;
CREATE INDEX continuation_ready ON execution_continuations(state,run_id);
