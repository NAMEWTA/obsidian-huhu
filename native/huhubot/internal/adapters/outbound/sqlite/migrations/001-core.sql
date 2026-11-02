CREATE TABLE profile_metadata (
 singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
 profile_id TEXT NOT NULL UNIQUE,
 command_epoch INTEGER NOT NULL CHECK (command_epoch > 0),
 revision INTEGER NOT NULL CHECK (revision > 0),
 created_at TEXT NOT NULL
) STRICT;
