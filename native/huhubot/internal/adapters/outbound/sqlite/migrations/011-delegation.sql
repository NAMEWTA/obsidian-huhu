ALTER TABLE execution_runs ADD COLUMN root_run_id TEXT NOT NULL DEFAULT '';
ALTER TABLE execution_runs ADD COLUMN parent_run_id TEXT NOT NULL DEFAULT '';
ALTER TABLE execution_runs ADD COLUMN work_thread_id TEXT NOT NULL DEFAULT '';
ALTER TABLE execution_runs ADD COLUMN task_config_id TEXT NOT NULL DEFAULT '';
ALTER TABLE execution_runs ADD COLUMN parent_scope_json TEXT NOT NULL DEFAULT 'null';
ALTER TABLE execution_runs ADD COLUMN derived_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE execution_runs ADD COLUMN child_slot INTEGER NOT NULL DEFAULT 0 CHECK(child_slot IN(0,1));
ALTER TABLE execution_runs ADD COLUMN budget_root_run_id TEXT NOT NULL DEFAULT '';
ALTER TABLE execution_runs ADD COLUMN task_admission_closed INTEGER NOT NULL DEFAULT 0 CHECK(task_admission_closed IN(0,1));
UPDATE execution_runs SET root_run_id=run_id,work_thread_id=session_id,budget_root_run_id=run_id;
DROP INDEX execution_one_active_root;
CREATE UNIQUE INDEX execution_one_active_root ON execution_runs(session_id) WHERE parent_run_id='' AND task_config_id='' AND status NOT IN('succeeded','failed','canceled');
CREATE UNIQUE INDEX execution_one_active_thread ON execution_runs(work_thread_id) WHERE work_thread_id<>'' AND status NOT IN('succeeded','failed','canceled');
CREATE INDEX execution_tree ON execution_runs(root_run_id,parent_run_id,run_id);

CREATE TABLE task_config_snapshots (
 snapshot_id TEXT PRIMARY KEY,
 profile_id TEXT NOT NULL,
 principal_id TEXT NOT NULL,
 subject_id TEXT NOT NULL,
 sponsor_agent_id TEXT NOT NULL,
 agent_id TEXT NOT NULL DEFAULT '',
 persona_revision TEXT NOT NULL,
 model_binding_revision TEXT NOT NULL,
 credential_ref TEXT NOT NULL,
 config_json TEXT NOT NULL,
 state TEXT NOT NULL,
 created_at TEXT NOT NULL
) STRICT;
CREATE INDEX task_config_credential ON task_config_snapshots(credential_ref,state);
CREATE TABLE task_config_pins (
 token TEXT PRIMARY KEY,
 snapshot_id TEXT NOT NULL REFERENCES task_config_snapshots(snapshot_id),
 run_id TEXT NOT NULL UNIQUE REFERENCES execution_runs(run_id)
) STRICT;
CREATE TABLE collaboration_threads (
 thread_id TEXT PRIMARY KEY,
 root_run_id TEXT NOT NULL REFERENCES execution_runs(run_id),
 visible_session_id TEXT NOT NULL REFERENCES conversation_sessions(session_id),
 principal_id TEXT NOT NULL,
 subject_id TEXT NOT NULL,
 created_at TEXT NOT NULL
) STRICT;
CREATE TABLE collaboration_delegations (
 delegation_id TEXT PRIMARY KEY,
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
 root_run_id TEXT NOT NULL REFERENCES execution_runs(run_id),
 parent_run_id TEXT NOT NULL REFERENCES execution_runs(run_id),
 child_run_id TEXT NOT NULL UNIQUE REFERENCES execution_runs(run_id),
 work_thread_id TEXT NOT NULL REFERENCES collaboration_threads(thread_id),
 requester_agent_id TEXT NOT NULL,
 executor_agent_id TEXT NOT NULL,
 target_agent_id TEXT NOT NULL,
 principal_id TEXT NOT NULL,
 intent_id TEXT NOT NULL,
 input_hash TEXT NOT NULL,
 constraints_json TEXT NOT NULL,
 expected_output TEXT NOT NULL,
 context_json TEXT NOT NULL,
 created_at TEXT NOT NULL,
 UNIQUE(parent_run_id,intent_id)
) STRICT;
CREATE INDEX delegation_root ON collaboration_delegations(root_run_id,delegation_id);
CREATE TABLE access_delegation_grants (
 child_run_id TEXT NOT NULL REFERENCES execution_runs(run_id),
 grant_id TEXT NOT NULL REFERENCES access_grants(grant_id),
 parent_task_id TEXT NOT NULL REFERENCES execution_runs(run_id),
 recipient_json TEXT NOT NULL DEFAULT '',
 configuration_hash TEXT NOT NULL DEFAULT '',
 snapshot_id TEXT NOT NULL DEFAULT '',
 PRIMARY KEY(child_run_id,grant_id)
) STRICT;
CREATE TABLE collaboration_lineage (
 output_run_id TEXT NOT NULL REFERENCES execution_runs(run_id),
 input_kind TEXT NOT NULL,
 input_id TEXT NOT NULL,
 revision TEXT NOT NULL,
 content_hash TEXT NOT NULL,
 namespace TEXT NOT NULL,
 work_thread_id TEXT NOT NULL,
 PRIMARY KEY(output_run_id,input_kind,input_id)
) STRICT;
CREATE TABLE collaboration_proposals (
 proposal_id TEXT PRIMARY KEY,
 profile_id TEXT NOT NULL,
 principal_id TEXT NOT NULL,
 run_id TEXT NOT NULL REFERENCES execution_runs(run_id),
 revision INTEGER NOT NULL DEFAULT 1,
 draft_json TEXT NOT NULL,
 preview_hash TEXT NOT NULL,
 state TEXT NOT NULL,
 agent_id TEXT NOT NULL DEFAULT '',
 expires_at TEXT NOT NULL,
 created_at TEXT NOT NULL
) STRICT;
