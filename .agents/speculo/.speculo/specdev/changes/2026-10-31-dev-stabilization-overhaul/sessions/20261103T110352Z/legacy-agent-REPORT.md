# legacy-agent 报告

## 已删除/改写
- 删除：`services/migrations/legacy-workbench.ts`、`desktop-startup.ts`，`core/migrations/legacy-layout.ts`，`ui/settings/LegacyImportSection.tsx`（及 dom 测试），`platform/desktop/agents/legacy-default.ts`，`services/workspace-store.test.ts`（仅测 v1 写入口），`test/agent-migrations/` 下 `legacy-*.test.ts` 与 `fixtures.ts`。
- `services/workspace-store.ts`：删除 v1 `createWorkspaceStore`/`LegacyWriterRefused`（生产无调用），`WorkspaceStore` 改为显式类型。
- `services/migrations/entry.ts`、`module.ts`：删除旧导入入口 `runStartupLegacyMigration`/`loadLegacyImport`。
- `src/app/recovery-start.ts`：`afterSettings` 只注册设置 owner，不再探测 `workspace.json`/`legacy-import.json`。
- `ui/settings-page.tsx`：删除“旧数据导入”页签。
- `controller.ts`、`accounts.ts`、`platform/history/service.ts`：删除 `LEGACY_VAULT_ACCOUNT`、旧默认账号收养、旧会话回落、`historyAccountEnv`；相关测试用例与 mock 同步删除。
- `lazy/migration.ts` 只留 `agent.migration.blocked`（恢复被阻止提示，现行）；删除其余键、`agent.manage.tab.import`、`agent.legacy*`、`agent.manage.legacyVaultAccount`；备份排除类别 `legacy-stats` 及词条。
- 验收脚本 `agent-system-account.mjs`：删除旧默认账号步骤与相关检查。
- 文档：`docs/data.md`、`docs/agent-workbench.md`（改为“恢复协议”）、`docs/agent-workbench-acceptance.md`（删 M-13）。

## 保留
- `services/migrations/agent-owners.ts`、`entry.ts` 的 `registerSpaceOwner/registerLiveOwners`：现行恢复 owner（目录名仍叫 migrations，未改名）。
- `test/agent-migrations/fault-storage.ts`：被 `src/app/recovery.test.ts`、`src/shared/storage/recovery-transaction.test.ts`、agent-backup 引用，原位保留；建议 Lead 日后迁出。
- pane-identity 的 `legacyPaneId`/`raw.resume` 兜底、`ResumeInfo` 注释：当前新建 pane 也走该派生 id，删除会改变现行行为，未动。
- 终端 `legacy` 键盘编码、session-screen `registerLegacy`、controller `admitLegacyLaunch`、`legacy-unattributed/unconfirmed` 证据原因、hook-spool `generations-v2`、system-hooks 旧命令形态清理（幂等，现行 hook 安装）、`isNeverStartedImport`（原生会话导入，现行功能）、`pi-artifact-profiles.json`。

## 行为变化
旧 `workspace.json`、旧默认账号目录不再被检测或导入，也不再有提示；旧文件原样留在磁盘。

## 验证
- vitest（src/modules/agent、test/agent-backup、src/app、src/shared/storage）：207 文件通过，退出 0。
- eslint（agent、recovery-start、lazy）零警告；`test:i18n`、`test:architecture`、`test:docs` 通过。
- 两个 tsc：agent 区域无错误；全仓有 archives/dashboard 等他区在途错误。
- 未跑原生集成测试与真实 Obsidian 验收。

## 复核修正
- `agent-runtime.test.ts` 7 例失败的原因：不是旧默认账号/旧会话回落/`historyAccountEnv` 的删除，而是他区在途改动（`src/host/obsidian/storage/device-id.ts` 去掉了 `legacyDeviceId`/`loadLocalStorage('huhu.device-id')`）。测试夹具靠 `loadLocalStorage` 返回固定设备 id `0000…`，现在设备 id 改为新生成，固定路径对不上 registry 文件。生产代码无回归。
- 修复（仅测试）：`agent-runtime.test.ts` 与 `platform/history/service.test.ts` 改为初始化后用 `vaultIdentity(app).deviceId` 推导文件路径，去掉 `loadLocalStorage`。两文件全部通过。
- 其余 agent 全量复跑的失败：`workspace-service-panes.test.ts`（4095/4096/4097）与 `ownership.test.ts` 为负载下 5 秒超时（单独或放宽超时均通过，ownership 约 4 秒，机器负载 6-8）；`pty/binary.test.ts` 的 "retained legacy helpers" 失败来自他区对 `src/host/desktop/native/binary.ts` 的在途改动，未处理。
