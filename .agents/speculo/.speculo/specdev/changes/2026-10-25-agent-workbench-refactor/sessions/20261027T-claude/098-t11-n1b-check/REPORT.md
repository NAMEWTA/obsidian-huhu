<!-- Saved by Lead from independent reviewer final reply (Opus 5.5, read-only). -->
**Standards verdict: pass.** N-1b, L-9 and L-11 are all closed, and I found no new issue of medium or higher severity.

**N-1b: closed.** `preview()` in `src/modules/agent/services/history-store.ts` (around lines 150–165) still spreads `transcriptDetails(full.text)`. It then sets `model: details.model ?? item.model` and `createdAt: details.createdAt ?? item.createdAt`, so the Markdown body's nulls no longer replace the scan-time native values. The `refresh` reuse branch (lines 57–81) is unchanged; it copies `kept.model` and `kept.createdAt`, which now hold the native values.
- **Test evidence:** the N-1 test in `history-store.test.ts` (lines 334–371) checks a row with model `gpt-5`, createdAt 100 and a native count of 4.
  - After `preview('old')` it asserts model `gpt-5`, createdAt 100, messageCount 1 and state `ready`.
  - After a second `refresh()` that reuses the row, it asserts the same values.
  - Without the fix, both checks would fail with model and createdAt set to null.

**L-11: closed.** The code now sets `messageCount: full.usage?.partial ? item.messageCount : details.messageCount`.
- **Test evidence:** the new L-11 test (lines 373–382) uses a native count of 40 and a one-turn body with `usage.partial: true`. After preview it asserts messageCount 40, model `m` and createdAt 5. Without the fix the count would be 1.
- A truncated row that is previewed and then refreshed is not tested separately. It takes the same reuse path the N-1 test already covers, so I'm not treating that as a finding.

**L-9: closed.** In `src/modules/agent/i18n.ts`, line 730 (en) reads "Incomplete export: the conversation was too large and was shortened." and line 1496 (zh) reads "导出不完整：对话过长，已截断。" The text now describes the size cap instead of suggesting a race. The key is still used in `platform/history/service.ts:476`, and the assertions in `native-history.test.ts` pass.

**Regressions: none found.**
- **S-2 unavailable path:** both the early return for a row whose source isn't available and the branch that marks a row unavailable when native read reports a status are unchanged. The two S-2 tests pass.
- **Annotations:** `annotate()` is unchanged, and the test where metadata-only rows keep their annotations passes.
- **previewState:** the idle, loading, ready and unavailable transitions are unchanged, and the P-6 test (a refresh keeps a previewed row ready) passes.
- In the non-partial case, messageCount still comes from the preview body. That behaviour existed before this round and the earlier review accepted it.

**Checks run:**
- `pnpm exec vitest run src/modules/agent/services/history-store.test.ts src/modules/agent/ui/history src/modules/agent/platform/desktop/server/native-history.test.ts`: 3 files, 24 tests, all passed.
- `pnpm exec tsc -p tsconfig.test.json --noEmit --skipLibCheck`: exit 0.

I did not run lint, the i18n check or a build, and I did not change any files.