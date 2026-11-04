# legacy-archives 报告

## 删除的文件
- `src/modules/archives/core/generic/legacy.ts`（v1 个人/企业适配、投影、patchLegacy）
- 已无生产引用的 v1 并行实现：`core/application.ts`、`core/index-store.ts`、`core/model.ts`、`core/search-text.ts`(+test)、`core/persist/*`（markdown.ts、column-labels.ts、format-guide 中英文）、`platform/controller.ts`、`contrib/reminders-source.ts`
- 测试：`archives.test.ts`（全部针对 v1）、`core/generic/markdown.test.ts`、`test/golden/archive-migration.test.ts`、`__snapshots__/archive-migration-v2.md`、`__snapshots__/archives.md`
- `scripts/accept-contacts-scale.ts`，以及 `package.json` 中的 `accept:contacts-scale`

## 改写
- `core/generic/index.ts`：去掉 `person/company` 解析、legacy 投影/依赖追踪、虚拟边、staged 可见性、migration-id/provenance 诊断。
- `core/generic/markdown.ts`：去掉 `huhu-migration-id`、`huhu-expected-relations`、`huhu-provenance`；EntityRecord 去掉 `format`、`migrationId`、`expectedRelationIds`；RelationRecord 去掉 `legacy`、`provenance`。
- `core/generic/operations.ts`：操作种类只剩 `schema-upgrade`/`relation-upgrade`，去掉 `edges`。
- `core/generic/paths.ts`：去掉旧中文 `迁移记录/原文` 排除。
- `core/schema/{commands,model,presets}.ts`：去掉 MigrationPreflight*/PrepareMigration、`migration-conflict`、legacyTypeId/legacySchemaId。
- `services/generic/{recovery,entities,runtime,definitions,relation-commands,application}.ts`：删除 preflight/prepareMigration/format===1 分支；`recovery.ts` 只保留 schema/关系升级的执行与回滚。
- `ui/generic/{RecoveryPanel,ArchivePage,RelationPanel}.tsx`：删除预检/迁移按钮与旧关系只读提示。
- `i18n.ts`：删除 legacyRelation、preflight、migrate、migrateAll、migrationHint、migrationConfirm、v1、v2、rows、manualRows、blocked（en/zh 同删）；`recovery` 改为"恢复"，新增 `recoveryHint`；`state-staging` 文案改为"准备写入"。
- `ContactsError` 移到 `core/files.ts`；`ContactsFiles.formatGuide` 与 `vaultContactsFiles` 的 guide 参数删除。
- 测试：`application.test.ts` 删除 v1 迁移用例和 v1 预设集合用例，改为升级的断点恢复、源文件变更的用例，另加"v1 文件按未知记录报告且不改写"；`archives-v2.test.ts`、`user-formats.test.ts`（删除 v1 档案快照用例）、`default-paths.test.ts`、`vault-files.test.ts`、`settings-page.dom.test.tsx` 适配。

## 保留及理由
- schema/关系升级及其 `migrations/` 路径、`archive-migration` 标签、`pending-migration` 诊断、`ResourceClass 'migration'`：是当前格式的可恢复升级机制，不是旧数据迁移。改名会改变当前文件格式，故不动。
- `preset-*-v2` 预设修订 id、`huhu-format-version: 2`：当前版本字段。
- `ARCHIVE_PATHS.guide`（vault-layout，非本区）与 home 的 recent-doc-policy 引用：不属本区，未动。
- `ArchiveError('future-format')`：当前格式校验。

## 行为变化
- `huhu-type: person|company` 的旧文件现在按 `unknown-record` 诊断报告，不建立实体、不投影关系、不改写。
- 档案页不再提供迁移入口；恢复页只处理升级操作。
- `ArchivesCommands.preflightMigrations`、`prepareMigration` 从公共 API 移除。
- 已落盘的旧 `edges` 字段在操作计划中被忽略；`huhu-provenance` 等旧键不再校验。

## 越区改动（最小）
- `package.json`：删 `accept:contacts-scale` 一行。
- `scripts/verify-build-text.mjs`：改用 home 的 apex 模板夹具。
- `scripts/verify-docs.mjs`：去掉 format-guide 的特例。
- `scripts/accept-archives-v2-scale.ts`：删 `format: 2`。
- `docs/data.md`：只改档案相关的 3 处（档案行、默认子目录、定义标签句）。
- `docs/contacts.md`、`docs/archives-implementation.md`、`.agents/skills/dev/references/{architecture,testing}.md`：同步当前实现。

## 验证
- `pnpm exec tsc -noEmit -skipLibCheck`：archives 范围无错误。全仓曾有一处 `scripts/verify-card-move.ts` 的 `widgetMigration` 错误，属其他区。
- `pnpm exec tsc -skipLibCheck -p tsconfig.test.json`：无错误。
- `pnpm exec vitest run src/modules/archives test/golden`：10 个文件、68 项通过。
- `pnpm exec eslint --max-warnings 0 src/modules/archives`：通过。
- `pnpm test:i18n`、`pnpm test:docs`、`pnpm test:architecture`、`node scripts/verify-build-text.mjs`：通过。

## 未处理
- `prettier --check` 对 archives 下 11 个文件报告格式问题，多数是未改动的既有文件，未处理。
- `docs/archives-implementation.md` 第 7 行的 2026-10-28 PR 核查是历史记录，原文保留。
- 未运行 `pnpm build`，产物 `main.js` 待 Lead 统一生成。
- v1 并行实现带走了资源导入/删除的旧测试，当前实现中同类覆盖未补。
