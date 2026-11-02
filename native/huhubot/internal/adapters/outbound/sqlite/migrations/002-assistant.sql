CREATE TABLE agents (
 agent_id TEXT PRIMARY KEY,
 revision INTEGER NOT NULL CHECK(revision>0),
 persona_revision INTEGER NOT NULL CHECK(persona_revision>0),
 model_revision INTEGER NOT NULL CHECK(model_revision>=0),
 enabled INTEGER NOT NULL CHECK(enabled IN (0,1)),
 is_default INTEGER NOT NULL CHECK(is_default IN (0,1))
) STRICT;
CREATE UNIQUE INDEX agents_default ON agents(is_default) WHERE is_default=1;
CREATE TABLE persona_revisions (
 agent_id TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
 revision INTEGER NOT NULL,
 body TEXT NOT NULL,
 PRIMARY KEY(agent_id,revision)
) STRICT;
CREATE TABLE credential_metadata (
 credential_ref TEXT PRIMARY KEY,
 profile_id TEXT NOT NULL,
 mode TEXT NOT NULL CHECK(mode IN ('protected','session-memory')),
 state TEXT NOT NULL CHECK(state IN ('available','missing','failed','unknown')),
 reason TEXT NOT NULL,
 deleting INTEGER NOT NULL DEFAULT 0 CHECK(deleting IN(0,1))
) STRICT;
CREATE TABLE model_binding_revisions (
 agent_id TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
 revision INTEGER NOT NULL,
 body TEXT NOT NULL,
 credential_ref TEXT REFERENCES credential_metadata(credential_ref),
 PRIMARY KEY(agent_id,revision)
) STRICT;
CREATE TABLE config_snapshot_pins (
 token TEXT PRIMARY KEY,
 agent_id TEXT NOT NULL REFERENCES agents(agent_id),
 agent_revision INTEGER NOT NULL,
 persona_revision INTEGER NOT NULL,
 model_revision INTEGER NOT NULL,
 enabled INTEGER NOT NULL,
 is_default INTEGER NOT NULL
) STRICT;
CREATE INDEX config_snapshot_agent ON config_snapshot_pins(agent_id);
CREATE TABLE command_receipts (
 profile_id TEXT NOT NULL,
 principal_id TEXT NOT NULL,
 method TEXT NOT NULL,
 idempotency_key TEXT NOT NULL,
 input_hash TEXT NOT NULL,
 agent_id TEXT NOT NULL,
 result_json TEXT NOT NULL,
 PRIMARY KEY(profile_id,principal_id,method,idempotency_key)
) STRICT;
CREATE TABLE agent_deletion_previews (
 token TEXT PRIMARY KEY,
 profile_id TEXT NOT NULL,
 principal_id TEXT NOT NULL,
 agent_id TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
 command_epoch INTEGER NOT NULL,
 revision INTEGER NOT NULL,
 usage_hash TEXT NOT NULL,
 expires_at TEXT NOT NULL
) STRICT;
CREATE TABLE assistant_identity_tombstones(agent_id TEXT PRIMARY KEY) STRICT;

CREATE TABLE assistant_usage_clock(singleton INTEGER PRIMARY KEY CHECK(singleton=1), revision INTEGER NOT NULL) STRICT;
INSERT INTO assistant_usage_clock VALUES(1,1);
