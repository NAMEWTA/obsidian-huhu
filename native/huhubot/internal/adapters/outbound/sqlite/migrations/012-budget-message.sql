CREATE TABLE collaboration_policy_roots (
 root_run_id TEXT PRIMARY KEY REFERENCES execution_runs(run_id),
 policy_json TEXT NOT NULL,
 child_count INTEGER NOT NULL DEFAULT 0 CHECK(child_count>=0),
 wake_count INTEGER NOT NULL DEFAULT 0 CHECK(wake_count>=0)
) STRICT;
-- This upgrade first enables a fixed compatibility policy for legacy roots.
-- These defaults do not reconstruct limits observed at their v5 admission.
INSERT INTO collaboration_policy_roots(root_run_id,policy_json)
 SELECT run_id,'{"maxDepth":3,"maxChildren":32,"rootChildren":4,"profileChildren":8,"maxWakes":8}' FROM execution_runs WHERE parent_run_id='';

CREATE TABLE model_budget_policy (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1),
 profile_id TEXT NOT NULL,
 policy_json TEXT NOT NULL,
 revision INTEGER NOT NULL CHECK(revision>0)
) STRICT;
INSERT INTO model_budget_policy SELECT 1,profile_id,'{}',1 FROM profile_metadata WHERE singleton=1;
CREATE TABLE model_budget_accounts (
 account_id TEXT PRIMARY KEY,
 profile_id TEXT NOT NULL,
 root_run_id TEXT NOT NULL,
 purpose TEXT NOT NULL,
 configured INTEGER NOT NULL CHECK(configured IN(0,1)),
 paused INTEGER NOT NULL CHECK(paused IN(0,1)),
 token_limit INTEGER NOT NULL CHECK(token_limit>=0),
 request_limit INTEGER NOT NULL CHECK(request_limit>=0),
 reserved_tokens INTEGER NOT NULL DEFAULT 0 CHECK(reserved_tokens>=0),
 charged_tokens INTEGER NOT NULL DEFAULT 0 CHECK(charged_tokens>=0),
 charged_requests INTEGER NOT NULL DEFAULT 0 CHECK(charged_requests>=0),
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0)
) STRICT;
CREATE TABLE model_attempts (
 attempt_id TEXT PRIMARY KEY,
 run_id TEXT NOT NULL REFERENCES execution_runs(run_id),
 root_run_id TEXT NOT NULL,
 account_id TEXT NOT NULL REFERENCES model_budget_accounts(account_id),
 logical_call_id TEXT NOT NULL,
 request_hash TEXT NOT NULL,
 retry_of_attempt_id TEXT NOT NULL,
 purpose TEXT NOT NULL,
 claim_token TEXT NOT NULL,
 cancel_epoch INTEGER NOT NULL,
 config_json TEXT NOT NULL,
 recipient_json TEXT NOT NULL,
 provenance_json TEXT NOT NULL,
 reserved_tokens INTEGER NOT NULL CHECK(reserved_tokens>0),
 state TEXT NOT NULL,
 knowledge TEXT NOT NULL DEFAULT '',
 input_tokens TEXT NOT NULL DEFAULT '',
 output_tokens TEXT NOT NULL DEFAULT '',
 charged_tokens INTEGER NOT NULL DEFAULT 0 CHECK(charged_tokens>=0),
 producer_ended INTEGER NOT NULL DEFAULT 0 CHECK(producer_ended IN(0,1)),
 settlement_hash TEXT NOT NULL DEFAULT '',
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
 created_at TEXT NOT NULL,
 UNIQUE(run_id,claim_token,logical_call_id)
) STRICT;
CREATE INDEX model_attempt_inflight ON model_attempts(root_run_id,run_id,state,producer_ended);
CREATE TABLE collaboration_messages (
 message_id TEXT PRIMARY KEY,
 root_run_id TEXT NOT NULL REFERENCES execution_runs(run_id),
 from_run_id TEXT NOT NULL REFERENCES execution_runs(run_id),
 to_run_id TEXT NOT NULL,
 work_thread_id TEXT NOT NULL,
 from_agent_id TEXT NOT NULL,
 to_agent_id TEXT NOT NULL,
 principal_id TEXT NOT NULL,
 delegation_id TEXT NOT NULL,
 question_id TEXT NOT NULL,
 kind TEXT NOT NULL,
 status TEXT NOT NULL,
 text TEXT NOT NULL,
 source_json TEXT NOT NULL,
 derived_json TEXT NOT NULL,
 intent_id TEXT NOT NULL,
 input_hash TEXT NOT NULL,
 revision INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL,
 UNIQUE(from_run_id,intent_id)
) STRICT;
CREATE INDEX collaboration_message_thread ON collaboration_messages(work_thread_id,message_id);
CREATE TABLE collaboration_wait_edges (
 from_run_id TEXT NOT NULL REFERENCES execution_runs(run_id),
 to_run_id TEXT NOT NULL REFERENCES execution_runs(run_id),
 reason_id TEXT NOT NULL,
 PRIMARY KEY(from_run_id,to_run_id,reason_id)
) STRICT;
CREATE TABLE collaboration_parent_results (
 run_id TEXT PRIMARY KEY REFERENCES execution_runs(run_id),
 result_json TEXT NOT NULL,
 checkpoint_json TEXT NOT NULL DEFAULT '',
 state TEXT NOT NULL,
 generation INTEGER NOT NULL DEFAULT 1
) STRICT;
CREATE TABLE collaboration_result_deliveries (
 child_run_id TEXT PRIMARY KEY REFERENCES execution_runs(run_id),
 parent_run_id TEXT NOT NULL REFERENCES execution_runs(run_id),
 status TEXT NOT NULL,
 partial INTEGER NOT NULL DEFAULT 0 CHECK(partial IN(0,1)),
 reason TEXT NOT NULL,
 text TEXT NOT NULL,
 source_json TEXT NOT NULL,
 scope_json TEXT NOT NULL,
 grants_json TEXT NOT NULL,
 derived_json TEXT NOT NULL,
 consumed INTEGER NOT NULL DEFAULT 0 CHECK(consumed IN(0,1))
) STRICT;
