ALTER TABLE conversation_sessions ADD COLUMN body_deleted INTEGER NOT NULL DEFAULT 0 CHECK(body_deleted IN(0,1));
ALTER TABLE execution_effects ADD COLUMN reconciliation_fingerprint TEXT NOT NULL DEFAULT '';
CREATE TABLE session_deletions (
 token TEXT PRIMARY KEY,
 profile_id TEXT NOT NULL,
 principal_id TEXT NOT NULL,
 session_id TEXT NOT NULL,
 request_hash TEXT NOT NULL,
 retention_json TEXT NOT NULL CHECK(json_valid(retention_json)),
 receipt_json TEXT NOT NULL CHECK(json_valid(receipt_json)),
 source_ids_json TEXT NOT NULL CHECK(json_valid(source_ids_json)),
 state TEXT NOT NULL CHECK(state IN('pending','complete'))
) STRICT;
