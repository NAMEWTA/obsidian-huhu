CREATE TABLE access_grants (
 grant_id TEXT PRIMARY KEY,
 profile_id TEXT NOT NULL,
 principal_id TEXT NOT NULL,
 workspace_id TEXT NOT NULL,
 scope TEXT NOT NULL CHECK(scope IN('source','folder','vault')),
 resource_id TEXT NOT NULL,
 operations_json TEXT NOT NULL,
 recipients_json TEXT NOT NULL,
 session_id TEXT NOT NULL,
 task_id TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN('active','revoked')),
 revision INTEGER NOT NULL CHECK(revision>0),
 expires_at TEXT NOT NULL
) STRICT;
CREATE INDEX access_grants_subject ON access_grants(profile_id,principal_id,grant_id);
CREATE TABLE access_grants_clock (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1),
 revision INTEGER NOT NULL CHECK(revision>0)
) STRICT;
INSERT INTO access_grants_clock VALUES(1,1);
