# 删除盘点初稿（规划期，只读）

- **基线：** dev `21336514`（2026-11-02 09:18 +0800）
- **性质：** T-39 的输入与 T-40–T-46 写集依据。由规划期 `git ls-files` 与 `rg` 只读检索生成，未逐文件确认语义；逐文件终版与残留检索脚本由 T-39 交付到 `docs/e2e/dev-overhaul/removal/`。
- **检索词：** browser 用 `browser-runtime|BrowserRuntime|BROWSER_|browserSettings|BrowserWorkspace|BrowserTab|browser-client|browser-worker|BrowserMaterial|BrowserOpen|webview|WebPanel`；huhubot 用 `huhubot|huhu-bot|HuhuBot|huhuBot|BotClient|\bHAP\b|bot-runner`；superbot 用 `super[-_ ]?bot|superhuhu`。

## 1. 整目录删除

| 目录/文件 | 文件数 | 行数 | 负责票 |
|---|---|---|---|
| `src/modules/browser/` | 117 | 18812 | T-44 |
| `src/modules/huhubot/` | 126 | 23507 | T-40 |
| `native/browser-runtime/` | 9 | 1670 | T-44 |
| `native/huhubot/` | 501 | 124938 | T-41 |
| `contracts/hap/` | 10 | 37158 | T-41 |
| 根产物 `browser-worker.cjs`、`browser-cli.cjs`、两份 `.sha256`、`tsconfig.browser-worker.json` | 5 | — | T-44 |

superbot：全仓（含 git 历史提交说明）检索 `super[-_ ]?bot` 0 命中；superbot 即 huhubot 的“superhuhu 全量重构”方向，由 huhubot 删除覆盖。

## 2. 服务键、贡献点与动态入口

| 名称 | 定义 | 模块外消费者 | 负责票 |
|---|---|---|---|
| `BROWSER_WORKSPACE` (`browser.workspace`) | `src/modules/browser/api.ts` | `src/app/workbench/compose-workbench.ts`、`src/modules/agent/services/controller.ts`、`src/app/workbench/browser-contribution.test.ts` | T-42/T-43 |
| `BROWSER_OPEN` (`browser.open`) | 同上 | `src/app/main.ts`、`src/modules/home/services/home-host.ts`、`src/modules/automations/services/action-host.ts`、`src/modules/agent/services/controller.ts` | T-42/T-43 |
| `BROWSER_AGENT_ACCESS` (`browser.agent-access`) | 同上 | 仅 browser 模块内 | T-44 |
| `BROWSER_MATERIAL_CONSUMERS`（贡献点） | 同上 | `src/modules/agent/manifest.ts`、`module.ts`、`services/browser-material-consumer.ts` | T-43 |
| `AGENT_BROWSER_TABS` (`agent.browser-tabs`) | `src/modules/agent/api.ts` | `src/modules/agent/module.ts` | T-43 |
| `NATIVE_HELPER_SQLITE` (`agent.native-helper-sqlite`) | `src/modules/agent/api.ts` | `module.ts`、`controller-native.test.ts`；读取方为 Browser 身份导入 | T-43（待 T-39 确认） |
| `BOT_CLIENT` / `BOT_RUNTIME` (`huhubot.*`) | `src/modules/huhubot/api.ts` | 仅 huhubot 模块内；`HUHUBOT_RUNTIME_ROOT` 被 `src/modules/versioning/core/excludes.ts` 使用 | T-40 |
| manifest 注册 | `browserManifest`（`activation: startup`）、`huhubotManifest`（`on-demand`） | `src/app/manifests.ts` | T-40/T-42 |
| 动态加载 | `plugin.activateModule('huhubot')` 页面工厂 | `src/app/workbench/compose-workbench.ts` | T-40 |
| 命令/ribbon | `open-browser`（`src/app/commands.ts`）、`globe`（`src/app/ribbon.ts`） | — | T-42 |
| ViewType | `src/modules/browser/ui/workbench-page.tsx`、`src/modules/huhubot/ui/**/workbench-page.ts`、`agent-page.tsx`、`group-page.tsx` | 随模块删除 | T-40/T-44 |
| 导航段 | `src/shell/navigation-state.ts`：`browser: [spaces, identities, files]`、`huhubot: [chat, agents, groups, tasks, memory, access, approvals, data]` | — | T-40/T-42 |
| 设置 | `src/app/settings/runtime.ts` 的 `browser` 命名空间；`src/app/settings/nav.ts` 的 `browser`、`huhubot` 产品；`settings-categories.ts` 的 `settings.productHuhuBot` | — | T-40/T-42 |
| 存储常量 | `src/shared/storage/vault-layout.ts`：`BROWSER_ROOT`、`BROWSER_MATERIALS_ROOT`、`HUHUBOT_RUNTIME_ROOT` | Agent 资料移交、versioning 排除；`BROWSER_ROOT` 同根被 Home 库内会话使用（随 D-018 一并删除） | T-40/T-43/T-44 |

## 3. 模块外混合文件（命中行数）

### 3.1 browser

| 文件 | 命中 |
|---|---|
| `.github/workflows/browser-phase2-apply.yml` | 1 |
| `.github/workflows/browser-phase2-checks.yml` | 3 |
| `.github/workflows/browser-phase2-workspace.yml` | 3 |
| `.github/workflows/browser-runtime-build.yml` | 20 |
| `.github/workflows/lint.yml` | 1 |
| `.github/workflows/release.yml` | 8 |
| `eslint.config.mts` | 1 |
| `package.json` | 4 |
| `scripts/assemble-browser-runtime.mjs` | 8 |
| `scripts/build-browser-runtime.mjs` | 3 |
| `scripts/dev.mjs` | 4 |
| `scripts/documentation-policy.mjs` | 1 |
| `scripts/install-browser-runtime.mjs` | 3 |
| `scripts/obsidian-acceptance/agent-browser-v2.mjs` | 13 |
| `scripts/obsidian-acceptance/cdp.mjs` | 1 |
| `scripts/obsidian-acceptance/versioning-history.mjs` | 1 |
| `scripts/perf/worker.mjs` | 1 |
| `scripts/third-party-notices.mjs` | 3 |
| `scripts/verify-browser-runtime-native.mjs` | 10 |
| `scripts/verify-issue-regressions.ts` | 8 |
| `scripts/verify-release-artifacts.mjs` | 2 |
| `scripts/verify-reliability.ts` | 1 |
| `scripts/verify-web-section.ts` | 1 |
| `src/app/commands.ts` | 1 |
| `src/app/contracts/shared-workspace.ts` | 4 |
| `src/app/main.ts` | 3 |
| `src/app/settings/runtime.ts` | 4 |
| `src/app/workbench/browser-contribution.test.ts` | 4 |
| `src/app/workbench/compose-workbench.ts` | 5 |
| `src/host/desktop/browser-session-concurrency.test.ts` | 9 |
| `src/host/desktop/browser-session-main.test.ts` | 4 |
| `src/host/desktop/browser-session-migration.test.ts` | 15 |
| `src/host/desktop/browser-session-migration.ts` | 33 |
| `src/host/desktop/browser-session-recovery.test.ts` | 3 |
| `src/host/desktop/browser-session.ts` | 19 |
| `src/host/desktop/retained-browser-file.test.ts` | 2 |
| `src/host/desktop/retained-browser-file.ts` | 1 |
| `src/host/obsidian/storage/private-storage.ts` | 1 |
| `src/modules/agent/api.ts` | 2 |
| `src/modules/agent/core/terminal/links.ts` | 2 |
| `src/modules/agent/core/workspace/model.ts` | 2 |
| `src/modules/agent/i18n.ts` | 6 |
| `src/modules/agent/manifest.ts` | 2 |
| `src/modules/agent/module.ts` | 16 |
| `src/modules/agent/platform/desktop/agents/legacy-accounts.ts` | 1 |
| `src/modules/agent/platform/desktop/browser-material.test.ts` | 4 |
| `src/modules/agent/platform/desktop/browser-material.ts` | 6 |
| `src/modules/agent/platform/desktop/files.ts` | 1 |
| `src/modules/agent/services/browser-material-consumer.test.ts` | 15 |
| `src/modules/agent/services/browser-material-consumer.ts` | 8 |
| `src/modules/agent/services/controller.ts` | 9 |
| `src/modules/agent/services/spaces/space-service-recovery-owner.test.ts` | 9 |
| `src/modules/agent/services/workspace-service-spaces.test.ts` | 2 |
| `src/modules/agent/services/workspace-service.test.ts` | 3 |
| `src/modules/agent/services/workspace-service.ts` | 5 |
| `src/modules/agent/ui/browser/BrowserTabView.dom.test.tsx` | 5 |
| `src/modules/agent/ui/browser/BrowserTabView.tsx` | 6 |
| `src/modules/agent/ui/browser/BrowserWorkspaceTab.tsx` | 6 |
| `src/modules/agent/ui/create/NewTabMenu.dom.test.tsx` | 1 |
| `src/modules/agent/ui/create/Omnibox.dom.test.tsx` | 1 |
| `src/modules/agent/ui/create/Omnibox.tsx` | 5 |
| `src/modules/agent/ui/settings/TerminalSettings.tsx` | 1 |
| `src/modules/agent/ui/tabs/TabStrip.tsx` | 2 |
| `src/modules/agent/ui/terminal/TerminalTabView.tsx` | 1 |
| `src/modules/agent/ui/workspace/WorkspaceLayout.dom.test.tsx` | 2 |
| `src/modules/agent/ui/workspace/WorkspaceLayout.tsx` | 2 |
| `src/modules/automations/services/action-host.ts` | 2 |
| `src/modules/home/core/board/types/model.ts` | 2 |
| `src/modules/home/i18n.ts` | 24 |
| `src/modules/home/module.test.ts` | 2 |
| `src/modules/home/platform/audio/chime.ts` | 1 |
| `src/modules/home/platform/desktop/netease-account.ts` | 9 |
| `src/modules/home/platform/desktop/session-lifetime.test.ts` | 1 |
| `src/modules/home/platform/desktop/session.ts` | 5 |
| `src/modules/home/services/board-repairs.dom.test.tsx` | 4 |
| `src/modules/home/services/board-store.ts` | 1 |
| `src/modules/home/services/home-host.ts` | 4 |
| `src/modules/home/ui/cards/Card.tsx` | 2 |
| `src/modules/home/ui/rss/RssSection.tsx` | 1 |
| `src/modules/home/ui/sections/P1Section.tsx` | 3 |
| `src/modules/home/ui/ui/floating-panel-utils.ts` | 1 |
| `src/modules/home/ui/web/WebPanel.dom.test.tsx` | 2 |
| `src/modules/home/ui/web/WebPanel.tsx` | 8 |
| `src/modules/home/ui/web/web-precheck.ts` | 1 |
| `src/modules/icons/platform/managers/tab-icon-manager.ts` | 1 |
| `src/shared/i18n/lazy/browser.ts` | 28 |
| `src/shared/storage/vault-layout.ts` | 2 |
| `src/shell/host/workbench-surface.tsx` | 2 |
| `test/agent-backup/fixtures.ts` | 3 |
| `test/release/browser-client.test.ts` | 13 |
| `test/release/documentation-policy.test.ts` | 3 |
| `test/release/release-artifacts.test.ts` | 2 |
| `test/release/workflow-gates.test.ts` | 3 |

### 3.2 huhubot

| 文件 | 命中 |
|---|---|
| `.github/workflows/huhu-bot.yml` | 13 |
| `.github/workflows/huhubot-storage-windows.yml` | 5 |
| `.github/workflows/lint.yml` | 6 |
| `.github/workflows/release.yml` | 7 |
| `eslint.config.mts` | 4 |
| `package.json` | 5 |
| `scripts/bench-huhu-bot.mjs` | 4 |
| `scripts/build-huhu-bot.mjs` | 10 |
| `scripts/bundle-budget.json` | 1 |
| `scripts/documentation-policy.mjs` | 2 |
| `scripts/huhu-bot-build.test.mjs` | 14 |
| `scripts/huhu-bot-notices.mjs` | 4 |
| `scripts/huhu-bot-notices.test.mjs` | 1 |
| `scripts/module-strings.ts` | 2 |
| `scripts/obsidian-acceptance/huhu-bot-note-effects.mjs` | 6 |
| `scripts/obsidian-acceptance/huhu-bot-sources.mjs` | 3 |
| `scripts/obsidian-acceptance/huhu-bot.mjs` | 30 |
| `scripts/obsidian-acceptance/terminal-merge.mjs` | 1 |
| `scripts/third-party-notices.mjs` | 1 |
| `scripts/verify-huhu-bot-architecture.mjs` | 4 |
| `scripts/verify-huhu-bot.mjs` | 9 |
| `scripts/verify-release-artifacts.mjs` | 2 |
| `src/app/contracts/module.ts` | 2 |
| `src/app/contracts/workbench.ts` | 2 |
| `src/app/manifests.ts` | 2 |
| `src/app/settings/nav.test.ts` | 3 |
| `src/app/settings/nav.ts` | 4 |
| `src/app/workbench/compose-workbench.ts` | 16 |
| `src/app/workbench/settings-categories.ts` | 1 |
| `src/modules/versioning/core/excludes.ts` | 2 |
| `src/modules/versioning/platform/desktop/excludes.test.ts` | 2 |
| `src/shared/i18n/settings.ts` | 2 |
| `src/shared/i18n/workbench.ts` | 18 |
| `src/shared/storage/vault-layout.test.ts` | 3 |
| `src/shared/storage/vault-layout.ts` | 1 |
| `src/shell/navigation-state.ts` | 1 |
| `src/styles.json` | 3 |
| `test/huhu-bot-integration/architecture.test.ts` | 2 |
| `test/release/documentation-checker.test.ts` | 7 |
| `test/release/documentation-policy.test.ts` | 8 |
| `test/release/workflow-gates.test.ts` | 2 |
| `vitest.config.ts` | 6 |

误报与允许候选（T-39 复核）：`src/modules/icons/platform/managers/tab-icon-manager.ts` 的 `webviewer` 是 Obsidian 内置视图；`scripts/perf/**` 与 `.github/workflows/perf-sampling.yml` 的 browser 指独立 Chrome 采样；`src/modules/home/platform/audio/chime.ts` 注释；`eslint.config.mts` 的 `globals.browser`；`vitest.config.ts` 的 `react-resizable-panels.browser`。

## 4. 构建、CI 与发行

- `package.json`：`build` 含 `tsc -p tsconfig.browser-worker.json && node scripts/build-browser-runtime.mjs && node scripts/build-browser-client.mjs`；另有 `build:browser`、`check:browser-native`、`accept:browser-native`、`build:huhu-bot`、`check:huhu-bot`、`test:huhu-bot-tooling`、`test:huhu-bot-architecture`、`bench:huhu-bot`。
- 脚本：`scripts/{assemble-browser-runtime,build-browser-runtime,build-browser-client,browser-cli-options,install-browser-runtime,verify-browser-runtime-native}.mjs`、`scripts/{build-huhu-bot,huhu-bot-build.test,huhu-bot-notices,huhu-bot-notices.test,verify-huhu-bot,verify-huhu-bot-architecture,bench-huhu-bot}.mjs`；混合：`scripts/dev.mjs`、`third-party-notices.mjs`（browser 入口、Rust browser crate、Go 包段）、`verify-release-artifacts.mjs`（`pluginAssets` 含 4 个 browser 文件、`verifyBotAssets`）、`documentation-policy.mjs`（`native/browser-runtime`、`native/huhubot` 分类）、`module-strings.ts`、`bundle-budget.json`（`moduleActivationBytes.browser`/`huhubot`）。
- 工作流：删除 `browser-phase2-apply.yml`、`browser-phase2-checks.yml`、`browser-phase2-workspace.yml`、`browser-runtime-build.yml`、`huhu-bot.yml`、`huhubot-storage-windows.yml`；改写 `release.yml`（`browser`、`bot` job 与资产）、`lint.yml`（`setup-go`、Go 测试、huhu-bot 构建校验、`git diff` 中的 browser 产物）。
- 测试：`test/release/{browser-client.test.ts,browser-operation-ledger-process.fixture.ts,release-artifacts.test.ts,workflow-gates.test.ts,documentation-policy.test.ts,documentation-checker.test.ts}`、`test/huhu-bot-integration/architecture.test.ts`、`test/agent-migrations/legacy-browser.test.ts`、`test/fixtures/browser-protector.ts`、`test/golden/__snapshots__/browser-{assistant,synthesis}.md`（生成者待确认）、`src/host/desktop/browser-session-*.test.ts`。
- 真实 Obsidian 验收脚本：`scripts/obsidian-acceptance/{agent-browser-v2,huhu-bot,huhu-bot-note-effects,huhu-bot-sources}.mjs`、`fixtures/huhu-bot/seed.json`；`terminal-merge.mjs`、`versioning-history.mjs`、`cdp.mjs` 含零星引用待核。
- 原生：`native/pty-server/src/cookies.rs` 与 `main.rs` 的 `Cookies` 消息、`tests/control.rs` 的 cookies 用例，读取方为 Browser 身份导入（经 `src/shared/native/cookies.ts`、Agent `cookie-client.ts`）。

## 5. 文档与知识

- 删除候选：`docs/browser.md`、`browser-protocol.md`、`browser-runtime.md`、`browser-verification.md`、`browser-phase2.md`、`browser-phase2-traceability.md`、`huhu-bot-acceptance.md`、`huhu-bot-performance.md`、`third-party/huhu-bot.md`、`docs/assets/browser/**`（5）、`docs/images/readme/browser.png`、`docs/e2e/` 下 25 个 browser/bot 截图（逐个核对引用）。
- 改写：`README.md`、`README.ZH.md`、`AGENTS.md`、`docs/{README,architecture,data,development,privacy,references,workbench,agent-workbench,dashboard,sync,automation,archives-implementation}.md`、`docs/third-party/orca-terminal-workbench.md`、`THIRD-PARTY-NOTICES.md`；项目 Skill `.agents/skills/dev/**`（SKILL.md 与 6 份参考）、`.agents/skills/ui/references/shell.md`。
- specdev：永久 `adr/` 6 份中 4 份、`context/` 5 份中 3 份涉及 Browser/Bot（只经 A）；`changes/archive/2026-10-25-huhu-bot-architecture`、`2026-10-26-unified-browser-versioning-archives` 等历史档案保留原文。

## 6. 发布前旧数据/旧格式范围（ADR-011）

HUHU 尚未正式发布，开发期旧 Browser/Bot/Profile、旧目录、旧看板设置与工作区布局均非受支持的历史版本。实施仅支持当前规格，**无需任何遗留数据保留、兼容、迁移、回读、旧库夹具或数据不变性验收**（ADR-011）。当前有效数据写入、权限、隐私和外部动作安全要求保持。

旧 `.huhu/browser*`、`.huhu/huhubot/`、Bot Profile、Electron Cookie、localStorage、旧看板 `openIn`/`web`/`music*` 及 Agent `kind: 'browser'` 仅作为待删代码/引用的定位依据。旧目录是否仍位于开发环境不作为工程验收事项；不要求旧配置加载或清理向导。

## 7. D-018 修订：Home 网页嵌入分区与网易云音乐（2026-11-02）

| 类别 | 文件（规划期检索，T-39 复核） | 负责票 |
|---|---|---|
| 网页嵌入分区 | `src/modules/home/ui/web/{WebPanel.tsx,WebPanel.dom.test.tsx,web-precheck.ts}`；`ui/sections/{P1Section.tsx,registry.ts,Section.tsx}` 的 web 分支；`core/board/{widget-table.ts,card-kind.ts}`；`core/board/parser/{syntax.ts,parse.ts,extract-card-parts.ts,generate-default-markdown.ts}` 的 `web` 分区与 `parseWebConfig`；`core/board/types/model.ts` 的 `WebEmbedConfig`/`webConfig`；`platform/board/sync.ts` 的 `updateWebConfig`；`scripts/verify-web-section.ts`；`scripts/obsidian-acceptance/home-d2b-fixture.mjs` | T-42 |
| 网易云音乐 | `platform/music/{music-service,netease-client,media-bytes}.ts`；`ui/music/MusicPanel.tsx`；`ui/widgets/MusicWidget.tsx`；`platform/desktop/{netease-account,session}.ts`、`session-lifetime.test.ts`；`module.ts`、`module.test.ts`、`services/instances.ts`、`settings.ts`；`core/board/{widget-table,widget-members}.ts`(+test)；`ui/canvas/{widget-components.ts,AddWidgetPanel.tsx,TileFrame.tsx}`；`ui/widgets/{WidgetBackground.tsx,media.dom.test.tsx,widget-background.dom.test.tsx}`；`ui/settings/{ServiceSettings.tsx,service-settings.dom.test.tsx}`；模型 `music*` 字段；`scripts/{verify-music-account,verify-music-client,music-network-stub,music-electron-stub,music-vault-fixture}.ts`；`package.json` 的 `test:music-account`、`test:music-client`、`test:web-section` | T-42 |
| 宿主会话 | `src/host/desktop/browser-session.ts`、`browser-session-migration.ts` 及 `browser-session-{main,concurrency,migration,recovery}.test.ts`；`retained-browser-file.ts`(+test)（T-43 后无消费者时） | T-44 |
| 保留 | “网页快捷卡”（卡片类型 `web`）与 `quickActions.type.url`：只删 `openIn` 选项（D-021） | T-42 |
