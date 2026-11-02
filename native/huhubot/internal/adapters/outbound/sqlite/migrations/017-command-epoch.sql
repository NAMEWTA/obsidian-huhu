CREATE TABLE purge_previews (
 token TEXT PRIMARY KEY,
 profile_id TEXT NOT NULL,
 command_epoch INTEGER NOT NULL CHECK(command_epoch>0),
 revision INTEGER NOT NULL CHECK(revision>0),
 selection_json TEXT NOT NULL CHECK(json_valid(selection_json)),
 unknown_effects INTEGER NOT NULL CHECK(unknown_effects>=0),
 expires_at TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN('pending','expired','executed','failed')),
 created_at TEXT NOT NULL
) STRICT;
CREATE INDEX purge_previews_profile ON purge_previews(profile_id,state,token);
