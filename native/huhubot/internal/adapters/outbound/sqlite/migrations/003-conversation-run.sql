CREATE TABLE conversation_sessions (
 session_id TEXT PRIMARY KEY,
 profile_id TEXT NOT NULL,
 principal_id TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind='direct'),
 title TEXT NOT NULL,
 workspace_id TEXT NOT NULL,
 revision INTEGER NOT NULL CHECK(revision>0),
 archived INTEGER NOT NULL CHECK(archived IN(0,1)),
 active_run_id TEXT,
 message_seq INTEGER NOT NULL DEFAULT 0
) STRICT;
CREATE TABLE conversation_members (
 session_id TEXT PRIMARY KEY REFERENCES conversation_sessions(session_id),
 agent_id TEXT NOT NULL
) STRICT;
CREATE INDEX conversation_member_agent ON conversation_members(agent_id);
CREATE TABLE conversation_messages (
 message_id TEXT PRIMARY KEY,
 run_id TEXT NOT NULL,
 session_id TEXT NOT NULL REFERENCES conversation_sessions(session_id),
 seq INTEGER NOT NULL,
 role TEXT NOT NULL CHECK(role IN('user','assistant','system')),
 text TEXT NOT NULL,
 created_at TEXT NOT NULL,
 agent_id TEXT NOT NULL,
 source_json TEXT NOT NULL,
 partial INTEGER NOT NULL CHECK(partial IN(0,1)),
 supersedes_message_id TEXT NOT NULL,
 UNIQUE(session_id,seq)
) STRICT;
CREATE TABLE execution_runs (
 run_id TEXT PRIMARY KEY,
 session_id TEXT NOT NULL REFERENCES conversation_sessions(session_id),
 principal_id TEXT NOT NULL,
 user_message_id TEXT NOT NULL,
 recipient_json TEXT NOT NULL,
 agent_id TEXT NOT NULL,
 persona_revision INTEGER NOT NULL,
 model_revision INTEGER NOT NULL,
 pin_token TEXT UNIQUE REFERENCES config_snapshot_pins(token) ON DELETE SET NULL,
 status TEXT NOT NULL,
 revision INTEGER NOT NULL CHECK(revision>0),
 intent TEXT NOT NULL,
 source_json TEXT NOT NULL,
 scope_json TEXT NOT NULL,
 grants_json TEXT NOT NULL,
 effective_source_json TEXT NOT NULL,
 effective_scope_json TEXT NOT NULL,
 effective_grants_json TEXT NOT NULL,
 retry_of_run_id TEXT NOT NULL,
 claim_token TEXT NOT NULL,
 reason TEXT NOT NULL,
 usage_json TEXT NOT NULL,
 checkpoint_ref TEXT NOT NULL,
 event_seq INTEGER NOT NULL CHECK(event_seq>0),
 created_at TEXT NOT NULL
) STRICT;
CREATE UNIQUE INDEX execution_one_active_root ON execution_runs(session_id) WHERE status NOT IN('succeeded','failed','canceled');
CREATE INDEX execution_scan ON execution_runs(status,created_at,run_id);
CREATE TABLE execution_events (
 run_id TEXT NOT NULL REFERENCES execution_runs(run_id),
 seq INTEGER NOT NULL CHECK(seq>0),
 event_type TEXT NOT NULL,
 created_at TEXT NOT NULL,
 body_json TEXT NOT NULL,
 PRIMARY KEY(run_id,seq)
) STRICT;
