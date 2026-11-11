<!-- Saved by Lead from independent reviewer final reply (Opus 5.5, read-only). -->
The Lead asked me to re-check the frozen scope before finishing: `sha256sum -c` still passes on all 24 files, so nothing drifted during the review. The full report follows.

# T-11 re-review (Round 2): vault history ingestion, search and read-only preview

**Verdict: request-changes on both axes, for three medium defects.** Two I reproduced with probes and one I confirmed by reading the code. All four previous high findings (S-1 to S-4) are closed or reduced to a medium remainder, and P-1 to P-7 are closed or mostly closed. Each remaining defect has a small, local fix.

Reviewer: independent and read-only; I implemented none of this. No repository files were modified. The pre-existing `M` state of `Cargo.lock`/`Cargo.toml` was not caused by me; all my cargo runs used `--locked`. Build output I created (esbuild bundles, a crate copy and a cargo target dir) has been deleted. The two probe sources are kept in `/tmp/claude-1000/-home-wta-orca-workspaces-obsidian-huhu-terminal/1014f108-976c-447a-9758-2c1df63a45cf/scratchpad/t11r2/` as `probe.mjs` and `opencode-owned-probe.rs`.

## Frozen scope
`sha256sum -c 096-t11-rereview/SCOPE.sha256` passed 24/24, both at the start and when re-run at the end of the review.

## Checks run
| Check | Result |
|---|---|
| `cargo test --locked … agent_data` | 40 passed, 0 failed |
| vitest on the 6 scope dirs/files, with debug helper binaries | 193 passed, 3 skipped (env-gated) |
| `tsc -p tsconfig.test.json --noEmit --skipLibCheck` | exit 0 |
| `eslint --no-warn-ignored` on 12 scope source files | exit 0 |
| TS probe: esbuild bundle of `history-store.ts` and `control/history.ts` | **CLI**: 3 Space-owned rows paged with limit 1 return a1, a2, a3 (none lost). A read-time `missing` gives `status:'unavailable', sourceStatus:'missing'`. limit 0 gives INVALID_ARGUMENT; a foreign key gives TARGET_NOT_FOUND. **Drawer store:** a native row with `model:'gpt-5', messageCount:4, createdAtMs:1` comes out as `model=null, messageCount=0, createdAt=null` (see N-1). |
| Native probe: scratch crate copy plus one test, OpenCode vault scope | Before binding: total 1 (`main`). After adding `ownedSessions:[{opencode, foreign}]` and rescanning: still total 1, and `read foreign` gives "session outside vault". A third scan also gives 1 (see N-2). |

No real Obsidian, provider or CLI end-to-end runs were done; per LOG-027 those belong to you.

## Previous findings: closure

### Standards findings
| ID | Status | Evidence |
|---|---|---|
| S-1 cursor skips rows | **closed** | `history.ts` `list` sets `next = offset + index` at the first row not returned. The cursor carries the Space, native revision, annotation revision and filter tag. Probe and test `S-1: … a page full of owned rows loses none` confirm it. |
| S-2 read-time status ignored | **closed** | `HistoryStore.preview` checks `full.sourceStatus` and sets `unavailable` with localized text. Details come from `transcriptDetails(full.text)`; the second file read is gone. CLI `preview` returns `unavailable` with `sourceStatus`/`sourceReason`. Probe and tests confirm. One residual on the export path: **N-3**. |
| S-3 metadata-only scan regression | **native closed; consumer not closed** | The scan stores title, model, usage, messageCount and createdAtMs with an empty body (`index_text_source`, `read_snapshot`); test `scan_stores_title_usage_model_and_message_count_without_the_body` passes. However, `HistoryStore.refresh` overwrites model, messageCount and createdAt with `transcriptDetails('')`, so those three never reach the drawer. Usage and title do arrive. Remainder: **N-1**. |
| S-4 one binding failure breaks refresh | **closed** | `bindHistorySources` skips bad rows with reasons in one durable write, and archived Spaces may still bind. `bindHistoryOwners` catches errors per row and per batch. `HistoryStore.refresh` turns failures into `history-owner:*` warnings. Tests S-4 and the archived batch pass. |
| S-5 case-sensitive search over JSON | **closed** | The `body` column is now lowercased `title\ncwd\nsessionId`, matched with `instr(body, lower(query))`. Test `search_uses_lowercased_metadata_columns_only` passes. |
| S-6 CLI errors lose codes | **closed** | `ControlProtocolError` now uses TARGET_REQUIRED, TARGET_NOT_FOUND, STALE_RUNTIME and INVALID_ARGUMENT, and native revision text maps to STALE_RUNTIME. Probe and tests confirm. |
| S-7 response cap exceeded | **closed** | `HistoryRowView` is a projection with clipped fields. Each page shrinks to `responseBytes - 4096`. Preview is binary-search truncated with `partial`/`response-capacity`. There are tests with real-sized rows. Residual doc inaccuracy: **L-2**. |
| S-8 snapshot leak and docs | **closed** | `sweep_stale_snapshots()` runs at every scan. It removes only prefix-named, non-symlink directories whose pid is dead or that are older than 1 h, and never this process's own. `docs/data.md:142` and `agent-workbench.md` (OpenCode row) describe the temp copy. Snapshot reuse per fingerprint was not done; that was optional. |
| S-9 read capacity check / admission order | **closed** | `read` loads only summary and stamp. Admission runs first, and every unknown or out-of-scope key answers "session outside vault". The final serialized response is measured, and the OpenCode body uses `push_capped`/`BODY_CAP`. A test covers this. |
| S-10 deleted sessions stay `available` | **closed** | `scan_opencode` marks absent session ids `missing`. `reconcile_root` marks a replaced JSONL key `changed`. A test covers this. |
| S-11 tests did not prove their claims | **closed** | The DOM tests now drive the menu and row expansion with real `user.keyboard` events. There are tests for S-1, S-2, S-4, S-7, S-5 and S-3 (native), and a cursor annotation-revision fence. **Gap:** no test checks that the drawer row keeps native model/messageCount (N-1). |

### Specification findings
| ID | Status | Evidence |
|---|---|---|
| P-1 owned out-of-vault sessions | **closed for JSONL/JSON providers; not closed for OpenCode** | `Scope.admits` = vault cwd OR `(agentId, sessionId)` owned. Admission happens on the bounded head before body parsing; `session_admitted` keeps provenance and confinement checks; `purge_inadmissible` runs after vault scans. Test `vault_projection_admits_space_owned…` passes. **N-2:** a newly owned OpenCode session is never indexed while the db fingerprint is unchanged. |
| P-2 unattributed history shown | **closed for drawer and CLI** | `historyStore === workspaceHistoryStore` (vault scope, `workspace-index.sqlite`). The "all" toggle and `inVault` filter are gone. CLI and export use `workspaceHistoryService()`. Unbound out-of-vault rows are neither indexed in `workspace-index.sqlite` nor readable (native test). The account index state is given below. |
| P-3 paging consistent with filter | **closed** | Stable cursor; `provider` implemented; limit 1–1000 in both schema and code; page shrinking. |
| P-4 accurate missing/partial/unsupported | **closed for preview and CLI; not closed for export** | Export remains open: **N-3**. |
| P-5 CLI wiring | **closed** | `HistoryCommands.ready()` runs `workspaceHistoryStore.refresh(false)` when `NativeHistory.stale` (never scanned, or the owned set changed). The archived-Spaces group is in the filter. `samePath` uses realpath. The CLI accepts archived Spaces (preflight checks existence only). |
| P-6 PAGE-002 conformance | **closed** | Fixed title 当前 Vault 历史; a loading state; error with retry; empty search with "clear search"; a one-line partial-failure summary with details (max 20); detail rows for provider/account/Space/source; an expanded row reloads after refresh; DOM tests. |
| P-7 docs | **mostly closed** | `agent-workbench.md` (原生历史), `agent-workbench-cli.md` (历史) and `data.md` were updated. Remaining inaccuracies are listed under L-2 and L-3. |

## New findings

**N-1 (medium, standards): the drawer throws away native model, messageCount and createdAt** (`src/modules/agent/services/history-store.ts`, `refresh`, the `enriched` map)
- **What happens:** `{...row, ...(reuse ? kept : transcriptDetails(''))}` spreads `{model:null, createdAt:null, messageCount:0}` over the native fields that S-3 now provides. Those fields are also missing from `NativeSessionSummary` (`agent-data-client.ts`). The probe reproduces it.
- **Effect until each row is previewed:**
  - "Hide empty sessions" hides every row.
  - "Sort by created" does nothing.
  - Every subtitle shows the model as "Unknown".
  - Search by model never matches.
- **Docs:** `agent-workbench.md` (原生历史) advertises created sort and says model is part of the stored metadata.
- **Fix condition:** add `model?`, `messageCount?` and `createdAtMs?` to the DTO. Map them as `model: row.model || null`, `messageCount: row.messageCount ?? 0`, `createdAt: row.createdAtMs || null`, and only let preview details override them. Add a history-store test.

**N-2 (medium, specification / AC-034): a newly owned out-of-vault OpenCode session is not admitted until `opencode.db` changes** (`agent_data.rs`, `scan_opencode` → `cached_row`)
- **What happens:**
  - One db holds many sessions, and `cached_row` is true whenever *any* indexed row has this source and stamp.
  - The stamp does not include the owned set.
  - So after a scan that indexed in-vault OpenCode rows, adding `ownedSessions:[{opencode, X}]` and rescanning skips the database entirely.
  - The same happens when a binding is purged and later restored.
- **Evidence:** native probe — total stays 1 and `read X` gives "session outside vault".
- **Real-world case:** HUHU records the `nativeSessionId` after the last db write, for example once the user has gone idle. The Space's own session then stays out of the drawer and out of CLI `history list`, even though TS marks the index `stale` and rescans.
- **Fix condition:** include a digest of the owned OpenCode ids in the OpenCode stamp (or skip `cached_row` for OpenCode when the owned set differs). Add a native test that binds after a cached scan.

**N-3 (medium, specification / AC-035): exporting an unavailable row writes an empty transcript** (`platform/history/service.ts`, `export`)
- **What happens:** since 084, native `read` *resolves* for `missing`/`changed`/`permission-denied`/`unsupported` rows, with `text:''`. `export` ignores `full.sourceStatus` and creates `huhu/导出/智能体/<agent>-<id>.md` containing only `# title`, then reports success.
- **Where it shows:** the drawer's row menu always offers Export, including on rows already labelled "Source missing". A truncated body (`usage.partial`) is also exported without any marker.
- **Why it matters:** this contradicts the contract that a bad source is never shown as an empty log (`agent-data-client.ts` DTO comment).
- **Fix condition:** when the status is not available, throw `agent.exportReadFailed` with the localized source status. Optionally mark partial exports. Add a test.

### Low / non-blocking
- **L-1:** `controller.resume` takes the resumed tab's title from the account-scope instance's `this.history().meta(row.key).title`. That instance keeps a separate in-memory copy of the same `history.json`, loaded once, so a rename made in the drawer does not reach the resumed tab's title. Both instances also hold their own `JsonStore` on one file; only the vault instance writes now.
- **L-2:** the CLI doc says list rows return "no account environment or transcript path". But `key` embeds the `accountKey` env JSON, and `sourceRef` is `agentId:accountKey:transcriptPath`. Fix the wording or the projection.
- **L-3:** `agent-workbench.md` (额度与用量 section) says usage analytics accept only sessions whose cwd is inside the vault. The vault projection behind the usage store now also includes Space-owned out-of-vault sessions. Line 107 still calls `index.sqlite` simply "the rebuildable index" without separating it from the workspace index.
- **L-4:** `bindHistoryOwners` awaits `samePath` (two `realpath` calls) for each unbound candidate, one after another, on every refresh. This is fine at current sizes.
- **L-5:** text-source admission uses the cwd from the head read, while the stored row uses the cwd from the full parse. If they differ, the row can be indexed and then refused at query time, or skipped. Edge case.
- **L-6:** when the empty state is caused by filters other than search (Space, hide-empty, agents), there is no "reset filters" action; "Reset" is only in the menu.
- **L-7:** controller dispose calls `dispose()` twice on the same store (`historyStore === workspaceHistoryStore`). Harmless.
- **L-8:** `recentHistory`, `findHistory` and `refreshHistory` in the controller have no remaining callers outside the controller.

## Account-scope index (reported as found; disposition is T-14)
- `.huhu/terminal-agent/<device>/index.sqlite` (account scope, separate from `workspace-index.sqlite`) is still written by `controller.history()` scans. The scans come from:
  - `agent-runtime.listSessions`: the automation editor's SessionField.
  - `agent-runtime.sessionUsage`: automation runs.
  - `controller.resume`: transcript lookup when a record has no `transcriptPath`.
  - `refreshHistory`: no callers outside the controller remain.
- Account scope admits every session of every configured account, including the system account's machine-wide provider history and other vaults' sessions.
- Because of the S-3 fix, those rows now store **title = first 100 characters of the first user prompt**, plus model, usage, cwd, ids and paths. Before Round 2 the title was the session id. Body text is not stored (`history_text` is empty).
- Vault scans never touch this file. Since it is a separate file, `purge_inadmissible` does not clean it.
- The drawer, board, palette, usage, CLI and export do not read it. The drawer and CLI show no unattributed out-of-vault body or preview.

## Verdicts
| Axis | Verdict | Blocking |
|---|---|---|
| standards | **request-changes** | N-1 (medium; remainder of S-3) |
| specification | **request-changes** | N-2 (AC-034, OpenCode), N-3 (AC-035, export) |

**After the fixes:** N-1 and N-3 can be re-checked by unit tests. N-2 needs a native test, and the current debug binaries would need a rebuild.