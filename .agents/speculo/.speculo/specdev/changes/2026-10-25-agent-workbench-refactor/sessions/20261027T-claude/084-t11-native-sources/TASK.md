# 084 — T-11 native: provenance admission, non-available source rows, OpenCode snapshot reads
Ticket: CHG/ticket/11-vault-history.md (AC-034, AC-035, AC-036). Read common rules: ../COMMON.md.
Prior context: CHG/evidence/T-11.md; review CHG/sessions/20261026T045732Z/075-t11-stage1-independent-review-final/REPORT.md (S-075-1, S-075-2, F1/F2/F3). Lead decision recorded as GP040 in CHG/goal-plan.md.

File: native/pty-server/src/agent_data.rs (+ data.rs if needed). Baseline (git HEAD) read OpenCode's SQLite DB directly; stage1 changed it to explicit reject pending safety items F1 (shm side effects on the source), F2 (lock ownership on source fd), F3 (connection/OS close + error telemetry).

## Deliver
1. S-075-1: legacy/old-index rows without verifiable provenance (empty `sources`, no system_base, etc.) must NOT be admitted in vault scope query/read. Either reject them or force rescan. Regression tests: legacy row with cwd inside Vault + non-managed transcript is excluded from query and read.
2. S-075-2: produce persistent non-available status. When a previously indexed source is missing / changed (size/mtime/inode drift) / permission denied / unsupported format, keep the row's metadata (and never delete HUHU-owned annotations) with `source_status` set accordingly and no body; preview/read returns the status, not stale or fabricated text. Other sources continue. Tests for each status you emit (at least missing, changed, unsupported, permission-denied where the platform allows; skip-with-reason only for genuinely platform-impossible cases).
3. OpenCode via snapshot copy (closes F1/F2/F3): copy `<db>` and, if present, `<db>-wal` (never create/touch `-shm` or the source dir) into a private temp dir (std::env::temp_dir + unique name, mode 0700 on unix), open the COPY with rusqlite, run the same admission (vault/account scope, cwd, children exclusion as in baseline `opencode()` at git HEAD), drop the connection, remove the temp dir in all paths (Drop guard). Source files are only opened read-only via std::fs for copying. Detect concurrent change (stat before/after copy; on mismatch retry once, then emit `changed`). Size cap the copy (pick a sane bound, e.g. 512 MiB, document it) → over cap = `unsupported` with reason. Tests: source dir unchanged after read (no -shm/-journal created, file list + mtimes equal), temp dir cleaned on success and on error, WAL contents visible, concurrent-modification path, children excluded, other-vault excluded.
4. Keep metadata-only list / lazy preview / revision fence behavior and existing 23 agent_data tests green. Keep DTO field names (`source_status`, `source_ref`, camelCase on the wire as today) — the TS side (task 084's sibling 083) relies on them. If you must add a field, note it in REPORT.

## Write set
native/pty-server/src/agent_data.rs, native/pty-server/src/data.rs, native/pty-server/tests/** (new files ok). Cargo.toml/Cargo.lock only if a dependency is truly required (prefer std; `tempfile` already in dev-deps? check) — if you add one, note license in REPORT.
NOT yours: anything under src/ (task 083), native/pty-server/src/control/**.

## Checks
`cargo test --locked --manifest-path native/pty-server/Cargo.toml` (full native suite, not only agent_data), `cargo clippy --locked --manifest-path native/pty-server/Cargo.toml -- -D warnings` if CI uses it (see .github/workflows), `cargo fmt --check`.

REPORT: CHG/sessions/20261027T-claude/084-t11-native-sources/REPORT.md
