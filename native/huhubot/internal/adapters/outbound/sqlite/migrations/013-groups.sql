-- The migration runner controls foreign-key enforcement outside this atomic
-- rebuild and verifies the complete foreign-key graph before committing it.
CREATE TABLE conversation_sessions_v8 (
 session_id TEXT PRIMARY KEY,
 profile_id TEXT NOT NULL,
 principal_id TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN('direct','group')),
 title TEXT NOT NULL,
 workspace_id TEXT NOT NULL,
 revision INTEGER NOT NULL CHECK(revision>0),
 archived INTEGER NOT NULL CHECK(archived IN(0,1)),
 active_run_id TEXT,
 message_seq INTEGER NOT NULL DEFAULT 0,
 coordinator_id TEXT NOT NULL DEFAULT ''
) STRICT;
INSERT INTO conversation_sessions_v8(session_id,profile_id,principal_id,kind,title,workspace_id,revision,archived,active_run_id,message_seq)
 SELECT session_id,profile_id,principal_id,kind,title,workspace_id,revision,archived,active_run_id,message_seq FROM conversation_sessions;
DROP TABLE conversation_sessions;
ALTER TABLE conversation_sessions_v8 RENAME TO conversation_sessions;

CREATE TABLE conversation_members_v8 (
 session_id TEXT NOT NULL REFERENCES conversation_sessions(session_id),
 agent_id TEXT NOT NULL,
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)),
 incarnation TEXT NOT NULL DEFAULT '1' CHECK(CAST(incarnation AS INTEGER)>0 AND CAST(CAST(incarnation AS INTEGER) AS TEXT)=incarnation),
 history_revision INTEGER NOT NULL DEFAULT 1 CHECK(history_revision>0),
 history_json TEXT NOT NULL DEFAULT '{"kind":"none"}',
 join_seq INTEGER NOT NULL DEFAULT 1 CHECK(join_seq>0),
 PRIMARY KEY(session_id,agent_id)
) STRICT;
INSERT INTO conversation_members_v8(session_id,agent_id) SELECT session_id,agent_id FROM conversation_members;
DROP TABLE conversation_members;
ALTER TABLE conversation_members_v8 RENAME TO conversation_members;
CREATE INDEX conversation_member_agent ON conversation_members(agent_id,active);

ALTER TABLE execution_runs ADD COLUMN execution_role TEXT NOT NULL DEFAULT 'execution' CHECK(execution_role IN('execution','orchestration'));
ALTER TABLE execution_runs ADD COLUMN admission_kind TEXT NOT NULL DEFAULT 'model' CHECK(admission_kind IN('model','user_root','user_batch'));
ALTER TABLE execution_runs ADD COLUMN group_binding_json TEXT NOT NULL DEFAULT 'null' CHECK(json_valid(group_binding_json));
CREATE INDEX execution_group_active ON execution_runs(session_id,status) WHERE group_binding_json<>'null';
ALTER TABLE conversation_messages ADD COLUMN attachments_json TEXT NOT NULL DEFAULT 'null';
ALTER TABLE collaboration_messages ADD COLUMN group_binding_json TEXT NOT NULL DEFAULT 'null';

-- A terminal member result is admitted to the public transcript once. The
-- message's sequence is allocated by the existing Session message writer.
CREATE TABLE group_publications (
 child_run_id TEXT PRIMARY KEY REFERENCES execution_runs(run_id),
 session_id TEXT NOT NULL REFERENCES conversation_sessions(session_id),
 message_id TEXT UNIQUE REFERENCES conversation_messages(message_id),
 public_seq INTEGER,
 status TEXT NOT NULL,
 created_at TEXT NOT NULL,
 CHECK((message_id IS NULL AND public_seq IS NULL) OR (message_id IS NOT NULL AND public_seq>0))
) STRICT;
CREATE INDEX group_publication_order ON group_publications(session_id,public_seq);
