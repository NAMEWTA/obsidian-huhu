<!-- Saved by Lead from independent reviewer final reply (Opus 5.5, read-only). -->
# T-11 independent review: vault history ingestion, search and read-only preview

Both axes are **request-changes**. All seven earlier findings (S-075-1/2, P-075-1/2, F1/F2/F3) are closed, but the review found new high-severity defects. I reproduced two of them in the TS code, and confirmed two others in a scratch copy of the native crate.

Reviewer: new read-only Opus reviewer that implemented none of this scope. I modified no repository files. My probes ran only in the scratchpad: an esbuild bundle of `history.ts`, and a copy of the native crate with one extra test, whose build output I deleted afterwards.

## Frozen scope
- First `sha256sum -c` of `093-t11-review/SCOPE.sha256`: 20/20 OK.
- A re-check at the end of the review showed drift in **`src/modules/agent/i18n.ts`** (FAILED). The file's mtime is 20:26, which falls during this review, so this is likely the concurrent agent's edit. The history keys this ticket depends on are still present in both en and zh (`agent.historyUI.source.*`, `agent.historyUI.space.*`, for example at lines 411/418 and 1173/1180). Everything else in this report was reviewed against the frozen bytes.

## Checks run
| Command | Result |
|---|---|
| `cargo test --locked --manifest-path native/pty-server/Cargo.toml agent_data` | 34 passed, 0 failed |
| `pnpm exec vitest run` on the six scope dirs and files you listed | 28 files and 173 tests passed; 2 files (3 tests) skipped (env-gated native tests) |
| `pnpm exec tsc -p tsconfig.test.json --noEmit --skipLibCheck` | exit 0 |
| `pnpm exec eslint --no-warn-ignored` on 11 scope source files | exit 0 |
| Scratch probe on bundled `history.ts`: 4 rows, 3 owned by Space a, limit 1 | Returns `['a1']` with `nextCursor: undefined`, so **a2 and a3 are silently lost**. A read that resolves `sourceStatus:'missing'` comes back as `status:'available'` with `text:''`. |
| Scratch native test: scan, query, read on a managed Claude JSONL (vault scope) | Indexed `title="ABC-123"` (the session id); usage `known:false`, `input:0`. A query for `abc` or `ABC` matches 0 rows, and so does `fix` (the title text was never indexed); a query for `available` matches the row (a JSON value). `read` then gives `title="Custom Title"` and `input:10, output:5`, but nothing writes these back. |

Real Obsidian, provider and CLI end-to-end runs were not done; per LOG-027 those belong to you.

## Earlier findings: closure
| ID | Status | Evidence |
|---|---|---|
| **S-075-1** | **closed** | `session_allowed` refuses any row without an explicit `source_status` (`agent_data.rs:875-890`). `account_session` and `system_session` require the first source to be the transcript, required and confined (`852-864`, `970-982`). `history_sources` no longer has a "plain vault" path (`983-1030`). The new `sources-v2` stamp forces old rows to be rescanned. Test `legacy_rows_without_verifiable_provenance_are_not_admitted_in_vault_scope` passes. |
| **S-075-2** | **closed for statuses written at scan time** | `reconcile_root` and `apply_statuses` (`1706-1776`) persist missing, changed, unsupported and permission-denied, and bump the revision. `read` returns these rows with metadata and no body (`330-340`). The UI subtitle and `HistoryStore.preview` short-circuit them. A status that only appears at read time is still wrong; see new finding **S-2**. |
| **P-075-1** | **closed** | `history.list` and `history.preview` are in `CONTROL_HANDLERS` (`commands.ts:52-53`). `captureHistory` is at `commands.ts:359-450`, and `controller.ts:670` passes `historyControl()`. The schema marks both `available:true` with `target:["spaceId"]`. A missing Space gives TARGET_REQUIRED and an unknown one gives TARGET_NOT_FOUND (tested at `commands.test.ts:623`). New defects in this path: **S-1, S-6, S-7**. |
| **P-075-2** | **closed as a mechanism** | Ownership is persisted in `records.historyOwners`. `SpaceService.historySpaceFor` and `bindHistorySource` exist, and `controller.bindHistoryOwners` matches on `nativeSessionId` plus `transcriptPath`. There is a production-chain test, and nothing is guessed from cwd. Robustness gaps: **S-4, P-5**. |
| **F1** | **closed** | The OpenCode source is never opened by SQLite; only a temp copy is. The test checks that no `-shm`/`-journal` appears and that the directory listing (names, sizes, mtimes) is unchanged (`opencode_snapshot_sees_wal_leaves_source_untouched_and_cleans_up`). |
| **F2** | **closed** | The only handle on the source is a plain read-only `O_NOFOLLOW` file descriptor. No SQLite lock is ever taken on the source inode in this process, so closing a stray descriptor cannot drop a lock. |
| **F3** | **closed** | The copy's connection is closed with an explicit `db.close()`, and a close error is reported as `unsupported` before the directory is removed (`agent_data.rs:1988-1992`). One residual issue: **S-8**. |
| Baseline OpenCode history | **restored** | Scan, query and read all work through the snapshot copy. Child sessions and other-vault sessions are excluded in vault scope, and usage is still computed at scan time for OpenCode. |

---

## Standards axis: **request-changes**

**S-1 (high): CLI `history list` silently skips rows.** `src/modules/agent/services/control/history.ts:80-81`
- **What happens:** rows owned by the Space are cut with `slice(0, limit - rows.length)`, but `offset` still advances by the whole native page (`page.rows.length`, up to 100).
- **Failure:** with limit 10 and a native page holding 30 rows for the Space, the caller gets 10 rows. The cursor points past the other 20, which are never returned. If the page was the last one, there is no `nextCursor` at all. The scratch probe reproduced this.
- **Even the default limit is affected:** with limit 100, 60 owned rows on page 1 and 60 on page 2, 20 rows are lost.
- **Why tests miss it:** they use 2-row pages built so that this case never occurs.
- **Fix condition:** the cursor must record the exact native position of the last returned row (offset within the page). Add a test where one native page holds more owned rows than the limit.

**S-2 (high): preview ignores the status that native `read` reports at read time.** `src/modules/agent/services/history-store.ts:108-114`, `history.ts:111-112`, `platform/desktop/history/details.ts`
- Since 084, native `read` *resolves* with `sourceStatus` missing, changed or permission-denied and `text:""`.
- **Drawer:** `HistoryStore.preview` never checks `full.sourceStatus`. It calls `history.details()`, which reads the transcript file again from TS, directly from disk.
  - If the source was replaced by another session or truncated, native refuses with "changed: source identity can no longer be verified". The drawer still reads the current file and shows that file's first prompt and turns as `ready` under this row.
  - That is an unverified body, possibly from a different session.
  - If the file is gone, the drawer shows a raw, untranslated ENOENT string instead of "Source missing".
- **CLI:** `HistoryCommands.preview` returns `status:'available'` with empty text (reproduced).
- **Fix condition:**
  - When the read result is not `available`, set `previewState:'unavailable'` with the localized status and never call `details`.
  - The CLI returns `unavailable` plus the status and `sourceReason`.
  - Details must come from the verified native text, not a second file read.
  - Add tests for the changed, missing and permission-denied cases at read time.

**S-3 (high): metadata-only scan regresses baseline behavior.** `agent_data.rs:259` (`parse_metadata`) and the `parse_with_body` branch with `load_body=false` (about 1388-1500)
- For Claude, Codex, Gemini, Pi and Grok, the scan no longer runs `consume`/`add_message`. Every indexed row therefore has `title = sessionId` and usage `known:false` with all token counts 0 (probe-verified).
- **Consequences:**
  - Drawer titles are now session ids.
  - Usage analytics (`workspace-usage-store.ts`, `UsageStatsPage`) shows zero or unknown tokens.
  - "Hide empty sessions" hides every row that has not been previewed, because `messageCount` is 0 (`transcriptDetails('')`).
  - "Created" sort has no data.
  - Native `read` produces the correct title and usage, but nothing writes them back.
- The planning constraint was "do not read the full text and then filter". Admission already happens on bounded metadata before any body is read, so the admitted rows can safely be parsed for title and usage.
- **Fix condition:** after admission, compute and store title, model and usage without storing the body text. Add a scan-level native test that asserts title and usage.

**S-4 (high): one owner-binding failure breaks the whole history refresh.** `controller.ts:386-399`, `history-store.ts:70`, `space-service.ts:466-475,495`
- `bindHistoryOwners` awaits `bindHistorySource` with no error handling, and `HistoryStore.refresh` awaits that inside its main try block.
- `resolve()` rejects archived Spaces with TARGET_NOT_FOUND. Your own test (`space-service-history.test.ts:79`) confirms an archived Space cannot take new bindings.
- **Failure:** archive a Space whose sessions have no binding yet (for example, every session from before this feature). The next drawer or usage refresh rejects; the drawer shows an error and no rows. A `PERSISTENCE_FAILED` or codec rejection does the same; `historyOwners` has a 4096-character limit per sourceRef and a cap of 10,000 entries, and neither is checked at bind time.
- **Fix condition:** handle binding failures per row (skip archived or invalid ones, log diagnostics) without failing the refresh. Add a test with a session in an archived Space.

**S-5 (medium): native search compares a lowercased query against original-case JSON.** `agent_data.rs:752`
- The baseline searched the lowercased `body` column. The new predicate runs `instr(summary, lower(query))` against the raw summary JSON.
- **Failure:** any uppercase character in a title, cwd or id makes a match impossible: both `abc` and `ABC` miss `ABC-123`. Field values also match, so `available` returns every available row. Paths, `sourceRef` and `accountKey` contents are searched too.
- This affects CLI `--query` and the `controller.ts:1150` lookup.
- **Fix condition:** search a lowercased, metadata-only column (title, cwd, id). Add a mixed-case native test.

**S-6 (medium): CLI history errors lose their machine-readable codes.** `history.ts:38-50,74,121`, `router.ts:254`
- "history revision changed; refresh required", "cursor expired", "not admitted to this Space" and "invalid history limit" are all thrown as plain `Error`s.
- The router maps plain errors to CONNECTION_UNAVAILABLE (exit 4). A required refresh therefore looks like a dead helper, and a non-admitted row does not return TARGET_NOT_FOUND (exit 3).
- **Fix condition:** throw `ControlProtocolError` with STALE_RUNTIME (or an agreed code) for refresh-required or expired cursors, TARGET_NOT_FOUND for not-admitted rows, and INVALID_ARGUMENT for a bad limit. Test the codes.

**S-7 (medium): CLI responses exceed the 49,152-byte response cap.** `commands.ts:397-410`, `history.ts`
- **List:** each row carries the full native summary: `accountKey` (managed-account env JSON), the `key` tuple, `sourceRef`, `sources`, and system paths. That is roughly 1–4 KB per row, so the default `limit:100` exceeds `responseBytes` 49,152 and fails with CAPACITY_EXCEEDED. `pane list` shrinks its page to fit the receipt; history does not.
- **Preview:** there is no truncation, so any transcript over about 48 KB fails. The `'partial'` status is never produced, and native truncation (`usage.partial`) is not surfaced.
- The preflight size check uses an empty `rows` array, so it proves nothing.
- **Fix condition:**
  - Return a projection containing only public fields.
  - Shrink the page to fit the receipt.
  - Truncate preview text with `status:'partial'` plus a reason.
  - Add tests with real-sized rows.

**S-8 (medium): OpenCode snapshot copies leak and are expensive.** `agent_data.rs:1797-1833,1895-1943`
- **Leak:** the `Drop` guard does not run on SIGKILL, crash or power loss, and nothing sweeps stale `huhu-opencode-*` directories. A full copy of the OpenCode DB (up to 512 MiB, containing every project's conversations, not only this vault's) can stay in the OS temp directory indefinitely.
- **Cost:** every preview copies the whole DB plus WAL, even when only one session is wanted.
- **Docs:** `docs/data.md` (the out-of-vault data section) and `docs/agent-workbench.md:99` still describe this as "只读打开 `opencode.db`" (opened read-only in place).
- **Fix condition:** sweep stale `huhu-opencode-*` directories older than the process at helper start, and document the temp-copy boundary. Optionally reuse a snapshot per fingerprint.

**S-9 (low): the read capacity check measures the wrong thing.** `agent_data.rs:287-300,2044-2055`
- Scan no longer stores body text, so the read's capacity pre-check only ever measures empty stored text.
- The reparsed OpenCode body (`s.text.push_str` with no limit) is not checked at all; it relies on the outbox send failing.
- The two "oversized" tests exercise a code path production no longer reaches.
- The capacity and "Query returned no rows" errors also fire before admission, so they reveal whether an out-of-scope key exists. The keys embed the session id, so the risk is low.
- **Fix condition:** check `result_capacity` on the final read response; cap the OpenCode body the same way `add_message` does; run admission before any key-specific error.

**S-10 (low): deleted sessions keep `available` status.** `agent_data.rs:1735-1739`
- `reconcile_root` skips any row whose transcript path was seen in this pass.
- A session deleted from the OpenCode DB (or a JSONL file replaced by a different session id) keeps `available` in the list. Preview then reports `changed` rather than `missing`.
- **Fix condition:** reconcile OpenCode rows by session id against the snapshot, and mark replaced JSONL keys.

**S-11 (low): the tests do not prove their claims.**
- The drawer test named "keyboard-reachable" (`SessionHistoryPanel.dom.test.tsx:87`) uses only mouse clicks.
- There are no tests for: S-1 with more owned rows than the limit, S-2 status at read time, S-4 bind failure, S-5 case, S-7 real-sized receipts, or the metadata-only regression in S-3.
- Between CLI pages, annotation changes (favorite, archived or title with `--filter`/`--query`) are not covered by the revision fence, so offsets can shift.

## Specification axis: **request-changes**

**P-1 (high): AC-034, part two.** Authorized out-of-vault Space sessions are not attributed by their binding. (Files: `history.ts:72-79,102`, `agent_data.rs:910-914`, `SessionHistoryPanel.tsx` scope filter.)
- CLI list and preview always query with scope `'vault'`, and native drops any row where `inside(vault, cwd)` fails. A Space with a granted out-of-vault directory can never list or preview its own bound history.
- The drawer's default "本库" (this vault) view uses the same native vault filter (`inVault`). Such sessions show up only under "全部" (all), mixed with unattributed rows.
- **Fix condition:** the vault projection = vault-cwd rows ∪ rows bound to an existing Space. Test that a bound out-of-vault row is listed and an unbound out-of-vault row is not.

**P-2 (medium-high): AC-034 and the ticket goal.** Unattributed history is still ingested and shown. (Files: `controller.ts:363-368` uses the account-scope `historyStore` for the drawer; `SessionHistoryPanel.tsx` has the `vault|all` toggle; `docs/agent-workbench.md:90`.)
- **Ingestion:** the drawer's account-scope scan still writes rows for every system-account and managed-account session, including other vaults' sessions, into the vault's synced `.huhu/terminal-agent/<device>/index.sqlite`. Those rows carry cwd, ids and OpenCode's generated titles.
- **Display:** the "全部" (all) toggle lists those rows and previews their bodies inside a page that is meant to show only the current Vault. The ticket says "右侧只列当前 Vault … 外库正文不污染索引" (the right panel lists only the current Vault; other vaults' bodies must not enter the index). DESIGN PAGE-002 says "不引入账号总历史页面" (no account-wide history page).
- **Docs:** they still state that the index "包含库外会话的内容" (contains out-of-vault session content).
- **Fix condition:** the drawer uses a vault projection (see P-1) and drops the account-wide toggle (or gates it behind an explicit, separately approved behavior). Unattributed out-of-vault rows are neither indexed in the vault nor previewed. Update the docs.

**P-3 (high): AC-036, stable paging consistent with the filter.**
- S-1 silently skips rows, and S-7 makes the default limit fail.
- The schema accepts `provider` (`control-schema.json`, `history.list`), but `HistoryCommands` ignores it, so results do not match the requested filter.
- The schema allows `limit` 1–1000, while the code rejects anything above 100.
- **Fix condition:** close S-1 and S-7, implement or remove `provider`, and align the limit bounds.

**P-4 (medium): AC-035, accurate missing/partial/unsupported.** S-2 (wrong status at read time, unverified body shown) and S-7 (no partial or truncation status) both apply. Persisted statuses and "other sources continue" are met.

**P-5 (medium): AC-033 and CLI wiring.**
- Owner binding (`bindHistoryOwners`) and the scan run only inside `HistoryStore.refresh`, which the UI drives. CLI `history list` never scans or binds. On a fresh start, or for a new session, the CLI returns no rows for the Space until the drawer or usage page has refreshed.
- In the drawer, rows owned by an archived Space are absent from the Space filter menu and do not count as unassigned, so they are reachable only through "All Spaces". AC-033 names archived history explicitly.
- Matching requires the HUHU record's `transcriptPath` to equal the native path exactly. Path spelling differences such as symlinked vault roots, or OpenCode records without a transcript path, will leave rows unassigned. I inferred this; I did not verify it.
- "Reading history spawns no PTY" is met: `historyClient` takes a helper lease without creating a session, and the chain test asserts `spawn` was never called.

**P-6 (medium): AC-061 page part (PAGE-002 conformance).**
- The title is "History" / "历史" rather than DESIGN's fixed "当前 Vault 历史" (current Vault history).
- An empty search result has no clear action.
- The first load shows no loading state in the list (only the refresh icon spins).
- Partial failures are rendered as up to 128 raw warning lines.
- The preview does not show account/device, Space or source/status (DESIGN requires Provider, 账号/设备 (account/device), Space and 来源 (source)).
- After any refresh, an expanded row resets to `idle` and shows "No conversation preview available": an inaccurate "no body" state.
- DOM tests cover only the Space filter. There is no automation for the normal, error, loading, empty, keyboard or size states.

**P-7 (medium): docs do not match behavior.**
- `docs/agent-workbench.md`, 原生历史 (native history) section, lines 90–99, still describes:
  - prompt text being indexed;
  - first prompt and model being searchable;
  - "hide empty" working;
  - OpenCode "只读打开" (opened read-only in place).
- `docs/data.md` does not mention the OpenCode temp copies.
- `docs/agent-workbench-cli.md` has no `history list` / `history preview` usage (flags, cursor and refresh semantics, `--key`/`--source-ref`).

**What does meet the spec:**
- History commands require an explicit Space: missing gives TARGET_REQUIRED, unknown gives TARGET_NOT_FOUND, with no cwd or focus guessing (LOG-030).
- Unbound, other-Space and sourceRef-mismatched rows are denied, including when they share a cwd.
- The en/zh strings for statuses and the Space filter are present.
- The drawer lists metadata only and loads the body lazily.
- OpenCode history capability is restored.

## Summary
| Axis | Verdict | Blocking findings |
|---|---|---|
| standards | **request-changes** | S-1, S-2, S-3, S-4 (high); S-5, S-6, S-7, S-8 (medium) |
| specification | **request-changes** | P-1, P-3 (high); P-2 (medium-high); P-4, P-5, P-6, P-7 (medium) |

S-075-1, S-075-2 (for statuses persisted at scan time), P-075-1, P-075-2, F1, F2 and F3 are all closed. The scope drift in `src/modules/agent/i18n.ts` happened during the review and did not touch the history keys.

Probe scripts: `/tmp/claude-1000/-home-wta-orca-workspaces-obsidian-huhu-terminal/1014f108-976c-447a-9758-2c1df63a45cf/scratchpad/skip.mjs` (TS pagination and status repro) and `/tmp/claude-1000/-home-wta-orca-workspaces-obsidian-huhu-terminal/1014f108-976c-447a-9758-2c1df63a45cf/scratchpad/native/pty-server/src/agent_data.rs` (copy with the `zz_review_probe` test added).