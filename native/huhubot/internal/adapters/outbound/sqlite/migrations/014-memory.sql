-- T14 owns these facts. Run, attempt, configuration and publication state keep
-- their original writers. The migration registry assigns the actual version.
ALTER TABLE execution_runs ADD COLUMN context_policy_version TEXT NOT NULL DEFAULT '';

CREATE TABLE memory_namespaces (
 namespace_id TEXT PRIMARY KEY,
 profile_id TEXT NOT NULL REFERENCES profile_metadata(profile_id),
 principal_id TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN('agent','temporary','global')),
 subject_id TEXT NOT NULL,
 catalog_revision INTEGER NOT NULL DEFAULT 1 CHECK(catalog_revision>0),
 settings_revision INTEGER NOT NULL DEFAULT 1 CHECK(settings_revision>0),
 suppression_revision INTEGER NOT NULL DEFAULT 1 CHECK(suppression_revision>0),
 enabled INTEGER NOT NULL CHECK(enabled IN(0,1) AND (kind='agent' OR enabled=0)),
 UNIQUE(profile_id,principal_id,kind,subject_id)
) STRICT;

CREATE TABLE memory_items (
 item_id TEXT PRIMARY KEY,
 namespace_id TEXT NOT NULL REFERENCES memory_namespaces(namespace_id),
 scope_kind TEXT NOT NULL CHECK(scope_kind IN('profile','session','work_thread')),
 scope_id TEXT NOT NULL DEFAULT '',
 state TEXT NOT NULL CHECK(state IN('active','forgotten')),
 pinned INTEGER NOT NULL DEFAULT 0 CHECK(pinned IN(0,1)),
 head_revision_id TEXT NOT NULL REFERENCES memory_revisions(revision_id) DEFERRABLE INITIALLY DEFERRED,
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
 CHECK((scope_kind='profile' AND scope_id='') OR (scope_kind!='profile' AND scope_id!=''))
) STRICT;
CREATE INDEX memory_items_namespace ON memory_items(namespace_id,state,item_id);

CREATE TABLE memory_revisions (
 revision_id TEXT PRIMARY KEY,
 item_id TEXT NOT NULL REFERENCES memory_items(item_id),
 ordinal INTEGER NOT NULL CHECK(ordinal>0),
 content_hash TEXT NOT NULL,
 provenance TEXT NOT NULL CHECK(provenance IN('observation','inference','user')),
 creator_kind TEXT NOT NULL CHECK(creator_kind IN('user','agent','temporary')),
 creator_agent_id TEXT NOT NULL DEFAULT '',
 job_id TEXT NOT NULL DEFAULT '',
 source_json TEXT NOT NULL DEFAULT '[]',
 scope_json TEXT NOT NULL DEFAULT '[]',
 derived_json TEXT NOT NULL DEFAULT '[]',
 created_at TEXT NOT NULL,
 UNIQUE(item_id,ordinal)
) STRICT;
CREATE INDEX memory_revisions_item ON memory_revisions(item_id,revision_id);
CREATE TABLE memory_revision_bodies (
 revision_id TEXT PRIMARY KEY REFERENCES memory_revisions(revision_id),
 text TEXT NOT NULL
) STRICT;
CREATE TABLE memory_index (
 item_id TEXT PRIMARY KEY REFERENCES memory_items(item_id),
 revision_id TEXT NOT NULL UNIQUE REFERENCES memory_revisions(revision_id),
 validity_revision INTEGER NOT NULL CHECK(validity_revision>0)
) STRICT;

CREATE TABLE memory_completion_outbox (
 completion_id TEXT PRIMARY KEY,
 namespace_id TEXT NOT NULL REFERENCES memory_namespaces(namespace_id),
 source_run_id TEXT NOT NULL REFERENCES execution_runs(run_id),
 source_kind TEXT NOT NULL CHECK(source_kind IN('message','task_result')),
 source_id TEXT NOT NULL,
 source_revision TEXT NOT NULL,
 source_hash TEXT NOT NULL,
 source_namespace TEXT NOT NULL,
 source_work_thread_id TEXT NOT NULL,
 scope_kind TEXT NOT NULL CHECK(scope_kind IN('profile','session','work_thread')),
 scope_id TEXT NOT NULL DEFAULT '',
 rule_version TEXT NOT NULL,
 created_at TEXT NOT NULL,
 UNIQUE(namespace_id,source_kind,source_id,rule_version)
) STRICT;

CREATE TABLE memory_jobs (
 job_id TEXT PRIMARY KEY,
 namespace_id TEXT NOT NULL REFERENCES memory_namespaces(namespace_id),
 completion_id TEXT NOT NULL UNIQUE REFERENCES memory_completion_outbox(completion_id),
 source_run_id TEXT NOT NULL REFERENCES execution_runs(run_id),
 generation INTEGER NOT NULL DEFAULT 1 CHECK(generation>0),
 settings_revision INTEGER NOT NULL CHECK(settings_revision>0),
 run_id TEXT UNIQUE REFERENCES execution_runs(run_id),
 task_config_id TEXT NOT NULL DEFAULT '',
 admission TEXT NOT NULL DEFAULT 'pending' CHECK(admission IN('pending','bound','blocked')),
 commit_state TEXT NOT NULL DEFAULT 'pending' CHECK(commit_state IN('pending','committed','candidate','discarded')),
 reason TEXT NOT NULL DEFAULT '',
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
 input_json TEXT NOT NULL DEFAULT '',
 input_digest TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL,
 CHECK((admission='bound' AND run_id IS NOT NULL AND task_config_id!='') OR (admission!='bound' AND run_id IS NULL))
) STRICT;
CREATE INDEX memory_jobs_admission ON memory_jobs(admission,created_at,job_id);
CREATE INDEX memory_jobs_namespace ON memory_jobs(namespace_id,job_id);

CREATE TABLE memory_candidates (
 candidate_id TEXT PRIMARY KEY,
 namespace_id TEXT NOT NULL REFERENCES memory_namespaces(namespace_id),
 job_id TEXT NOT NULL REFERENCES memory_jobs(job_id),
 ordinal INTEGER NOT NULL CHECK(ordinal>=0),
 generation INTEGER NOT NULL CHECK(generation>0),
 scope_kind TEXT NOT NULL CHECK(scope_kind IN('profile','session','work_thread')),
 scope_id TEXT NOT NULL DEFAULT '',
 operation TEXT NOT NULL CHECK(operation IN('create','correct')),
 target_item_id TEXT NOT NULL DEFAULT '',
 target_revision INTEGER NOT NULL DEFAULT 0 CHECK(target_revision>=0),
 target_revision_id TEXT NOT NULL DEFAULT '',
 target_pinned INTEGER NOT NULL DEFAULT 0 CHECK(target_pinned IN(0,1)),
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN('pending','applied','superseded','blocked')),
 reason TEXT NOT NULL DEFAULT '',
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
 content_hash TEXT NOT NULL,
 provenance TEXT NOT NULL CHECK(provenance IN('observation','inference')),
 creator_kind TEXT NOT NULL CHECK(creator_kind IN('agent','temporary')),
 creator_agent_id TEXT NOT NULL,
 source_json TEXT NOT NULL DEFAULT '[]',
 scope_json TEXT NOT NULL DEFAULT '[]',
 derived_json TEXT NOT NULL DEFAULT '[]',
 created_at TEXT NOT NULL,
 UNIQUE(job_id,ordinal),
 CHECK((operation='create' AND target_item_id='' AND target_revision=0) OR (operation='correct' AND target_item_id!='' AND target_revision>0))
) STRICT;
CREATE INDEX memory_candidates_namespace ON memory_candidates(namespace_id,candidate_id);
CREATE TABLE memory_candidate_bodies (
 candidate_id TEXT PRIMARY KEY REFERENCES memory_candidates(candidate_id),
 text TEXT NOT NULL
) STRICT;

CREATE TABLE memory_run_contexts (
 run_id TEXT PRIMARY KEY REFERENCES execution_runs(run_id),
 namespace_id TEXT NOT NULL REFERENCES memory_namespaces(namespace_id),
 policy_version TEXT NOT NULL,
 manifest_revision INTEGER NOT NULL DEFAULT 1 CHECK(manifest_revision=1),
 sealed INTEGER NOT NULL CHECK(sealed=1),
 short_term_json TEXT NOT NULL DEFAULT '',
 short_term_digest TEXT NOT NULL DEFAULT '',
 memory_json TEXT NOT NULL DEFAULT '',
 memory_digest TEXT NOT NULL DEFAULT '',
 job_id TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL
) STRICT;
CREATE TABLE memory_context_entries (
 entry_id TEXT PRIMARY KEY,
 run_id TEXT NOT NULL REFERENCES memory_run_contexts(run_id),
 ordinal INTEGER NOT NULL CHECK(ordinal>=0),
 kind TEXT NOT NULL CHECK(kind IN('intent','inbox','recent','working_summary','memory_recall','attachment')),
 origin_kind TEXT NOT NULL CHECK(origin_kind IN('run_intent','conversation_message','thread_message','task_result','memory_revision','attachment')),
 origin_id TEXT NOT NULL,
 body_revision TEXT NOT NULL,
 source_hash TEXT NOT NULL,
 representation TEXT NOT NULL CHECK(representation IN('full','excerpt','intent_alias','metadata')),
 spans_json TEXT NOT NULL DEFAULT '[]',
 metadata_json TEXT NOT NULL,
 UNIQUE(run_id,ordinal)
) STRICT;
CREATE INDEX memory_context_origin ON memory_context_entries(origin_kind,origin_id,body_revision);

CREATE TABLE memory_dependencies (
 owner_kind TEXT NOT NULL CHECK(owner_kind IN('run','message','private_result','memory_revision','memory_candidate','job','context_entry')),
 owner_id TEXT NOT NULL,
 ancestor_kind TEXT NOT NULL CHECK(ancestor_kind IN('message','task_result','memory_revision')),
 ancestor_id TEXT NOT NULL,
 ancestor_revision TEXT NOT NULL,
 content_hash TEXT NOT NULL,
 namespace TEXT NOT NULL,
 work_thread_id TEXT NOT NULL,
 relation TEXT NOT NULL CHECK(relation IN('effective','origin','audit')),
 PRIMARY KEY(owner_kind,owner_id,ancestor_kind,ancestor_id,ancestor_revision,relation)
) STRICT;
CREATE INDEX memory_dependencies_reverse ON memory_dependencies(ancestor_kind,ancestor_id,owner_kind,owner_id);

CREATE TABLE memory_suppressions (
 namespace_id TEXT NOT NULL REFERENCES memory_namespaces(namespace_id),
 origin_kind TEXT NOT NULL CHECK(origin_kind IN('message','task_result','memory_revision','user_intent')),
 origin_stable_id TEXT NOT NULL,
 rule_kind TEXT NOT NULL CHECK(rule_kind IN('deny_automatic','protect_item')),
 generation INTEGER NOT NULL CHECK(generation>0),
 receipt_key TEXT NOT NULL,
 protected_item_id TEXT NOT NULL REFERENCES memory_items(item_id),
 PRIMARY KEY(namespace_id,origin_kind,origin_stable_id,rule_kind)
) STRICT;
