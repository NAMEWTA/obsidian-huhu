-- Pending global proposals are fixed previews, never recallable facts.
-- Confirmed facts remain exclusively in 014 memory_items/revisions/bodies/index.
CREATE TABLE memory_global_proposals (
 proposal_id TEXT PRIMARY KEY,
 profile_id TEXT NOT NULL REFERENCES profile_metadata(profile_id),
 principal_id TEXT NOT NULL,
 namespace_id TEXT NOT NULL REFERENCES memory_namespaces(namespace_id),
 actor_kind TEXT NOT NULL CHECK(actor_kind IN('owner','tool')),
 actor_run_id TEXT NOT NULL DEFAULT '',
 actor_subject_id TEXT NOT NULL DEFAULT '',
 operation TEXT NOT NULL CHECK(operation IN('create','update','delete')),
 target_item_id TEXT NOT NULL DEFAULT '',
 target_revision INTEGER NOT NULL DEFAULT 0 CHECK(target_revision>=0),
 target_revision_id TEXT NOT NULL DEFAULT '',
 target_body_hash TEXT NOT NULL DEFAULT '',
 catalog_revision INTEGER NOT NULL CHECK(catalog_revision>0),
 scope_kind TEXT NOT NULL CHECK(scope_kind IN('profile','session','work_thread')),
 scope_id TEXT NOT NULL DEFAULT '',
 frozen_json TEXT NOT NULL,
 preview_json TEXT NOT NULL,
 preview_hash TEXT NOT NULL,
 expires_at TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN('pending','accepted','rejected','expired','conflicted')),
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
 decided_receipt_key TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL,
 CHECK((actor_kind='owner' AND actor_run_id='' AND actor_subject_id='') OR
       (actor_kind='tool' AND actor_run_id!='' AND actor_subject_id!='')),
 CHECK((operation='create' AND target_item_id='' AND target_revision=0 AND target_revision_id='' AND target_body_hash='') OR
       (operation!='create' AND target_item_id!='' AND target_revision>0 AND target_revision_id!='' AND target_body_hash!='')),
 CHECK((scope_kind='profile' AND scope_id='') OR (scope_kind!='profile' AND scope_id!='')),
 CHECK(json_valid(frozen_json) AND json_valid(preview_json)),
 CHECK((state='pending' AND decided_receipt_key='') OR state!='pending')
) STRICT;
CREATE INDEX memory_global_proposals_owner_page
 ON memory_global_proposals(profile_id,principal_id,proposal_id);
CREATE INDEX memory_global_proposals_pending_expiry
 ON memory_global_proposals(state,expires_at,proposal_id);
