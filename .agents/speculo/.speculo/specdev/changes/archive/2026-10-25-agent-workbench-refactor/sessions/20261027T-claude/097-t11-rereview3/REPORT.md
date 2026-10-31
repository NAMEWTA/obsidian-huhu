<!-- Saved by Lead from independent reviewer final reply (Opus 5.5, read-only). -->
# T-11 re-review, Round 3: vault history ingestion, search and read-only preview

**Verdict: specification passes; standards still needs changes.** Round 3 closed N-2 and N-3, both with evidence. N-1 is only partly fixed. Before any preview, native model, messageCount and createdAt now reach the drawer. Opening a preview still sets model and createdAt to null, and they stay null for every later refresh. I reproduced this with a probe. It is the same defect N-1 described, now limited to rows the user has expanded. Because the drawer and the usage page share one store, it also affects the usage page.

I reviewed this independently and read-only; I implemented none of it, and I modified no repository files. The pre-existing `M`/`D`/`??` working-tree state is not mine, and every cargo run used `--locked`. I deleted the scratch crate copy, the cargo target directory and the esbuild bundles. The probe sources are kept at:
- `/tmp/claude-1000/-home-wta-orca-workspaces-obsidian-huhu-terminal/1014f108-976c-447a-9758-2c1df63a45cf/scratchpad/t11r3/probe.rs`
- `/tmp/claude-1000/-home-wta-orca-workspaces-obsidian-huhu-terminal/1014f108-976c-447a-9758-2c1df63a45cf/scratchpad/t11r3/probe.mjs`

## Frozen scope
`sha256sum -c 097-t11-rereview3/SCOPE.sha256` passed 24/24, both at the start and at the end of the review.

Compared with the 096 scope, Round 3 changed these files:
- `agent_data.rs`
- `agent-data-client.ts`
- `service.ts`
- `history-store.ts` and its test
- `native-history.test.ts`
- `SessionHistoryPanel.tsx` and its DOM test
- `controller.ts`
- `i18n.ts`
- `docs/agent-workbench.md` and `docs/agent-workbench-cli.md`

## Checks run
| Check | Result |
|---|---|
| `cargo test --locked … agent_data` | 41 passed, 0 failed |
| vitest on the 6 scope dirs/files, with the debug helper binaries | 29 files passed, 2 skipped; 196 tests passed, 3 skipped. The skips are opt-in tests: `control-panels-native` (needs `HUHU_TEST_PANE_EVIDENCE`), `control-coordination-native` (needs `HUHU_PI_ARTIFACT_TEST_ROOT`), and one PowerShell test in `resume-command`. |
| `tsc -p tsconfig.test.json --noEmit --skipLibCheck` | exit 0 |
| `eslint --no-warn-ignored --max-warnings 0` on 15 scope TS files | exit 0 |
| Debug binary freshness | `huhu-pty` was built at 00:53:39, one second after the last change to `agent_data.rs`, so it is current |
| Native probe (`probe.rs`): scratch crate copy, `wal_only_database` fixture, vault scope | See N-2 below |
| TS probe (`probe.mjs`): esbuild bundles of `history-store.ts` and `control/history.ts` | See N-1 below; it also re-confirms S-1, S-2 and S-6 |

No real Obsidian, provider or CLI end-to-end runs were done; per LOG-027 those belong to you.

## Blocking findings from 096

### N-1 (medium, standards): partly closed; the remaining defect blocks
**Closed part:**
- `NativeSessionSummary` now has `model?`, `messageCount?` and `createdAtMs?`.
- In `HistoryStore.refresh`, rows that have not been previewed map `model: row.model || null`, `createdAt: row.createdAtMs || null` and `messageCount: row.messageCount ?? 0`.
- The probe shows `model=gpt-5 messageCount=4 createdAt=1` before preview.
- The test `N-1: … before any preview` passes. It covers both hide-empty and sort-by-created.

**Remaining defect, N-1b (medium), in `src/modules/agent/services/history-store.ts` `preview()`:**
- `preview()` spreads `...transcriptDetails(full.text)` over the row.
- The native `read` body is the normalised Markdown transcript (`\n## user\n\n…`, built by `add_message` in `agent_data.rs`).
- For Markdown input, `transcriptDetails` always returns `model: null, createdAt: null`; only JSON entries carry those fields.
- So after preview the native values are replaced by null. On the next `refresh` the `reuse` branch copies `kept.model` and `kept.createdAt` forward, so the nulls survive refreshes.

Probe output:
```
before preview: model=gpt-5 createdAt=1 messageCount=4
after preview: state=ready model=null createdAt=null messageCount=2
after refresh: state=ready model=null createdAt=null
```

Effect of expanding a row:
- **Drawer:** the subtitle and the expanded detail line both change from the model to "Unknown" (`SessionHistoryPanel.tsx`, lines 135 and 167).
- **Sort by created:** the row drops to the bottom (line 290).
- **Search by model:** the row no longer matches.
- **Usage page:** `UsageStatsPage` reads the same `workspaceHistoryStore` rows, and the "By model" grouping in `aggregate.ts` (line 49) then counts that session's tokens under Unknown model.

The N-1 test checks only `messageCount` after preview, so this was not caught.

**Fix condition:**
- In `preview`, keep the native values when details lack them: `model: details.model ?? item.model` and `createdAt: details.createdAt ?? item.createdAt`.
- Optionally keep the native `messageCount` when `usage.partial` is set.
- Add assertions after preview and refresh to the N-1 test.

### N-2 (medium, spec AC-034): closed
`scan_opencode` in `agent_data.rs` now appends `|o:<FNV-1a digest of the sorted, deduplicated owned OpenCode ids>` to the stamp. The digest ignores bindings for other agents. Every fingerprint comparison strips that suffix with `base_stamp`:
- `source_state`
- `stamp_identity` and `drift_verifies`
- the reconcile check

So the suffix never makes a row look `changed`.

The native test `binding_an_opencode_session_reindexes_an_unchanged_database_and_unbinding_purges` passes. My earlier probe, re-run against the new code:
```
before-owned total=1
after-owned total=2 [(foreign, available), (main, available)]
read foreign = Ok(foreign, available, 15 bytes)
third (same owned) total=2
plus-codex total=2        (an unrelated codex binding does not disturb OpenCode)
unbound total=1 read=Some("session outside vault")
rebound total=2
```

### N-3 (medium, spec AC-035): closed
- `NativeHistory.export` in `platform/history/service.ts` throws `agent.exportReadFailed` with the localised source status in two cases:
  - **Already known bad:** the row is already marked non-available. Nothing is read and nothing is created.
  - **Bad at read time:** the read itself returns a non-available status.
- A body marked `usage.partial` gets a localised `agent.exportPartialNote` quote line, with both en and zh strings.
- The row menu hides Export unless `sourceStatus` is available. A read-time status found by preview updates `row.sourceStatus`, so the menu hides Export for that row too.
- Tests in `native-history.test.ts` and the DOM test pass.

## Low findings from 096: handling
| ID | Status |
|---|---|
| L-2 | **Closed in docs.** `agent-workbench-cli.md` line 46 now says `key` and `sourceRef` are opaque identifiers that embed the account reference and transcript location, should not be parsed or logged, and exist only to pass back to `preview`. Keeping the projection as is was acceptable. |
| L-3 | **Closed.** `agent-workbench.md` lines 92, 107 and 113 now describe the vault projection (vault cwd plus authorised Space-owned out-of-vault sessions). They also separate `workspace-index.sqlite` (used by the drawer, CLI, export and usage) from the account-level `index.sqlite` (used by the runtime and resume lookup). |
| L-5 | **Closed.** `index_text_source` now re-runs `scope.admits` with the cwd and session id from the full parse before storing the row. |
| L-7 | **Closed.** `controller.dispose` skips `historyStore.dispose()` when it is the same object as `workspaceHistoryStore`. |
| L-1, L-4, L-6, L-8 | Not addressed. They stay non-blocking as before; L-1 and L-8 relate to the account index and belong to T-14. |

## Regression check (S-1 to S-11, P-1 to P-7)
None of the previously closed items regressed.

- **S-1:** the TS probe pages `a1, a2, a3` at limit 1 without losing a row.
- **S-2:** a read-time `missing` gives `unavailable` / `sourceStatus:missing` with empty text.
- **S-6:** `INVALID_ARGUMENT` and `TARGET_NOT_FOUND` codes are intact.
- **S-3, S-5, S-8, S-9, S-10 and P-1:** all native tests pass (41/41). Changes from the stamp suffix are confined to the OpenCode path, and drift checks use `base_stamp`.
- **S-4, S-7, S-11 and P-3, P-5, P-6:** history, control, spaces and DOM tests pass.
- **Panel:** the only Round 3 change is the conditional Export entry. PAGE-002's fixed title, loading, error with retry, empty search and partial-failure summary are unchanged and covered by the DOM tests.
- **P-4:** now closed for export as well.

## New lows (non-blocking)
- **L-9:** the en/zh wording of `agent.exportPartialNote` ("source was truncated while it was read" / "读取时来源被截断") suggests a race. `usage.partial` actually means the body hit the helper's size cap (`BODY_CAP`). Suggested wording: "the conversation was too large and was shortened".
- **L-10:** after L-5, a text source whose head is admitted but whose full parse is rejected is never cached. It is re-parsed on every scan, and an older row from the same path keeps its previous status. This is an edge case.
- **L-11:** the post-preview `messageCount` (turns in the capped Markdown body) can be lower than the native count when `usage.partial` is set. It is covered by the optional part of the N-1b fix.
- **L-12:** the OpenCode digest covers every owned OpenCode id, including sessions in other OpenCode accounts or databases. Binding any OpenCode session therefore re-snapshots every OpenCode db once. This affects efficiency only.

## Verdicts
| Axis | Verdict | Blocking |
|---|---|---|
| standards | **request-changes** | N-1b (medium): preview erases native model and createdAt, which affects the drawer, sort-by-created and the usage page's per-model grouping. |
| specification | **pass** | AC-033 to AC-036 and the PAGE-002 part of AC-061 are met. N-2 and N-3 are closed with tests and probes. The account-scope `index.sqlite` belongs to T-14 and is not blocking. |

**Next step:** N-1b is a two-line change in `HistoryStore.preview` plus test assertions after preview and refresh. It can be re-checked with a unit test alone; no native rebuild is needed.