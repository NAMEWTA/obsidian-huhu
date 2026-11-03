# T-39 删除盘点（终版，只读）

- **基线：** dev 当前 checkout（盘点起点 `3712d67`，复跑于 `7e90d3b` 工作区）。`docs/e2e/` 已删除，本目录是清单的唯一位置。
- **机读清单：** `inventory.json`（逐文件处置：`path` 精确项 382 条，`glob`+`count` 目录项 7 条，覆盖全部 1151 个命中文件）。
- **检索脚本：** `residual-scan.mjs`（`git ls-files` + 关键词规则，范围外 `.agents/speculo/**`、二进制）。三种用法：列出命中；`--inventory inventory.json` 比对未分类（≠0 即失败）；`--residual` 供 T-46 使用，只允许 `keep` 项命中。`--self-test` 19 项通过。
- **ADR-011：** 不保留、迁移、回读任何发布前旧数据；下文提到的旧目录/旧字段只用于定位待删代码，旧消费者一律直接删。
- **对规划期初稿的修正：** 初稿数字沿用旧 commit；本稿重新逐文件确认。主要修正见第 9 节。

## 1. 总量

| 票 | 删除文件 | 改写文件 | 说明 |
|---|---|---|---|
| T-40 | 131 | 约 24（含与 T-42/T-44 共有） | `src/modules/huhubot` 126 + 测试/验收脚本 5 |
| T-41 | 540 | 约 14（共有） | `native/huhubot` 501、`contracts/hap` 10、Go 许可原文 19、Bot 脚本与工作流 |
| T-42 | 21 | 约 100 | Browser 入口、外链、D-018 Home 网页分区与网易云 |
| T-43 | 13 | 约 85 | Agent 浏览器标签、资料移交、Cookie 链、旧标签夹具 |
| T-44 | 155 | 约 25 | `src/modules/browser` 117、`native/browser-runtime` 9、根产物 5、会话宿主、构建/CI |
| T-45 | 14 | 25 | 文档、开发规则、资产 |
| Lead | — | 3 | `main.js`、`main.css`、`styles.css` 生成产物 |
| 保留 | — | — | 88 个命中文件（OUT 与通用用语，理由逐条写在清单） |

`superbot`：全仓（含本稿范围外的 specdev 历史）无独立代码；它是 huhubot 的 superhuhu 重构方向，随 huhubot 删除覆盖。

## 2. 模块外消费者

### 2.1 serviceKey / 贡献点（`rg -w` 逐个核对）

| 名称 | 模块外使用文件 | 处置 |
|---|---|---|
| `BROWSER_WORKSPACE` | `agent/services/controller.ts`、`app/workbench/compose-workbench.ts`、`app/workbench/browser-contribution.test.ts` | compose-workbench 在 T-42 摘除，controller 在 T-43，测试在 T-42 删 |
| `BROWSER_OPEN` | `app/main.ts`、`home/services/home-host.ts`、`automations/services/action-host.ts`、`agent/services/controller.ts` | 三处已有系统浏览器兜底（`window.open`）；T-42 改为直接系统浏览器，controller 在 T-43 |
| `BROWSER_AGENT_ACCESS` | 无（仅 browser 模块内） | 随 T-44 |
| `BROWSER_MATERIAL_CONSUMERS`（贡献点） | `agent/manifest.ts`、`agent/module.ts` | T-43 |
| `AGENT_BROWSER_TABS` | `agent/api.ts`、`agent/module.ts`（唯一读者是 Browser 模块） | T-43 删除 |
| `NATIVE_HELPER_SQLITE` | `agent/api.ts`、`agent/module.ts`、`controller-native.test.ts`；**全仓无任何读取方**（初稿"读取方为 Browser 身份导入"不再成立） | T-43 删除服务及测试断言 |
| `BOT_CLIENT`、`BOT_RUNTIME` | 无 | 随 T-40 |
| `BrowserOpener`（类型） | `agent/core/terminal/links.ts` | T-43：终端链接直接走 `fallback()`（系统浏览器），去掉 `browser` 参数 |

### 2.2 动态入口 / 注册

- `src/app/manifests.ts`：`browserManifest`（startup）、`huhubotManifest`（on-demand）。manifest 内 `load: () => import('./module')` 随模块删除。
- `src/app/workbench/compose-workbench.ts`：`huhubotPage` 工厂调用 `plugin.activateModule('huhubot')`（T-40）；`BROWSER_WORKSPACE` 贡献与 `closeResource` 绑定（T-42）。
- `src/app/contracts/module.ts`、`workbench.ts`：`ModuleId`/`FeatureId` 中的 `'browser'`、`'huhubot'` 与 feature→module 映射。
- ViewType：`src/modules/browser/ui/workbench-page.tsx`、`src/modules/huhubot/ui/**/workbench-page.ts`、`agent-page.tsx`、`group-page.tsx`，均在被删模块内。
- 命令 `open-browser`（`app/commands.ts`）、ribbon `globe`（`app/ribbon.ts`）、`PluginMain.openBrowser`（`app/main.ts`）：T-42。

### 2.3 导航、设置、i18n、存储常量

- `shell/navigation-state.ts`：`browser: [spaces, identities, files]`、`huhubot: [chat, agents, groups, tasks, memory, access, approvals, data]`。
- 设置：`app/settings/runtime.ts`（`browser` 命名空间，含 `ns.browser.touch()`）、`nav.ts`/`nav.test.ts`（`SettingsProduct` 的 `browser`、`huhubot` 与 ORDER）、`react/BuiltInSettings.tsx`（Globe 分类）、`workbench/settings-categories.ts`（`browser.title`、`settings.productHuhuBot`）。
- i18n：整文件删 `shared/i18n/browser.ts`、`shared/i18n/lazy/browser.ts`；改 `shared/i18n/{runtime,huhu,workbench,settings}.ts`、`lazy/{migration,backup,native}.ts`、`agent/i18n.ts`、`automations/i18n.ts`、`home/i18n.ts`（含 `web.browser_session_*`、`quickActions.open.tab`、`home.dashboard.browserTab`、netease/music/`settings.*cookie` 中网易云相关键；TickTick 的 `ticktickCookie` 是现行功能，保留）。`home/module.ts` 还通过 `registerMessages(browserStrings)` 依赖 `lazy/browser`，T-42 同步删除。
- `shared/storage/vault-layout.ts`：`BROWSER_ROOT`、`BROWSER_MATERIALS_ROOT`（仅 `agent/platform/desktop/browser-material.ts` 使用）、`HUHUBOT_RUNTIME_ROOT`（仅 `versioning/core/excludes.ts` 使用）。
- 无关键词命中但耦合：`shell/ShellRoot.tsx`、`shell/page/ResourceTabs.tsx`、`app/workbench/workbench-leaf.ts`、`app/contracts/workbench-host.ts` 的"资源页标签/closeResource"机制目前唯一使用者是 Browser；T-42 删除 `browserTabs()`/`closeResource` 时需确认其他功能没有使用，没有再使用者则一并删（属可选收缩，必要时单独列出，勿夹带重构）。

## 3. 构建、脚本与配置

| 文件 | 处置 |
|---|---|
| `package.json` | `build` 去掉 `tsc -p tsconfig.browser-worker.json && node scripts/build-browser-runtime.mjs && node scripts/build-browser-client.mjs`；删 `build:browser`、`check:browser-native`、`accept:browser-native`、`build:huhu-bot`、`check:huhu-bot`、`test:huhu-bot-tooling`、`test:huhu-bot-architecture`、`bench:huhu-bot`（T-41/T-44）；删 `test:web-section`、`test:music-account`、`test:music-client`（T-42，对应脚本同删）。 |
| `scripts/dev.mjs` | 去掉 browser runtime/client 重建与 `modules/browser` 监视（T-44） |
| `scripts/third-party-notices.mjs` | 去掉 `browser-cli-options`、`huhu-bot-notices` 导入及 browser 入口、Rust browser crate、Go 包段（T-41/T-44） |
| `scripts/documentation-policy.mjs` | 去掉 `native/browser-runtime`、`native/huhubot` 分类 |
| `scripts/verify-release-artifacts.mjs`（+`.d.mts`） | `pluginAssets` 去 4 个 browser 文件；去 `verifyBotAssets` 与 `--bot` |
| `scripts/bundle-budget.json` | 仅删除 `moduleActivationBytes.browser`、`huhubot`（不得提高阈值） |
| `scripts/module-strings.ts` | 去 browser、huhubot、lazy/browser 词典导入（T-40 先删 huhubot，T-44 删 browser，两票都需写权限） |
| `vitest.config.ts` | 去 `huhuBotIntegrationTests`、huhubot runner 三项、`huhu-bot-integration` project；`react-resizable-panels.browser` 别名保留 |
| `eslint.config.mts` | 去 `modules/browser/platform/desktop/{cli,provider-copy}.ts` 规则、`browser-worker.cjs`/`browser-cli.cjs`/`native/huhubot/...` ignores；`globals.browser` 保留 |
| `esbuild.config.mjs` | **无命中**（主包不含 Browser 入口，worker/CLI 由 `scripts/build-browser-*.mjs` 构建）；无需改动 |
| `src/styles.json` | 去 `huhubot/styles/{agent,tasks,data}.css` 与 `browser/styles/browser.css` |
| `.gitattributes`/`.gitignore` | 去 browser 产物与 `native/browser-runtime/target/` 规则（T-44；当前不在 T-44 写集） |
| `tsconfig.browser-worker.json` | 删（`tsconfig.json`/`tsconfig.test.json` 无 browser 引用） |

构建链顺序：`tsc -p tsconfig.browser-worker.json` 与 `build-browser-*` 先于 tailwind/styles/esbuild，T-44 必须一次性移除，否则 `pnpm build` 失败。T-44 前不要运行会生成 Browser 资产的 `pnpm build` / `build:browser`。

## 4. 依赖

| 依赖 | 验证 | 结论 |
|---|---|---|
| npm `ajv`、`ajv-formats` | `rg`：仅 `huhubot/core/protocol/{method-validation.ts,memory-validation.test.ts}` | T-41 从 `package.json`/`pnpm-lock.yaml` 删除（T-40 删代码之后） |
| npm `zod` | 仅 `browser/core/protocol.ts`、`protocol-results.ts` | T-44 删除 |
| 其余 dependencies/devDependencies | 逐个检查，均有模块外消费者（`react`、`zustand`、`lucide-react` 等） | 保留；`@types/node`、`tslib`、`@eslint/js`、`@tailwindcss/cli`、`@types/react*` 为工具链/类型包，不属本次范围 |
| Go | `native/huhubot/go.mod` 唯一 Go module | 随 `native/huhubot` 整体删除；`lint.yml` 的 `setup-go` 与 Go 测试步骤同删；`docs/third-party/licenses/go/**`（19 文件）与 `docs/third-party/huhu-bot.md` 随删 |
| cargo `native/browser-runtime/Cargo.toml`+lock | 独立 crate，仅 Browser 使用 | 随目录删除 |
| cargo `native/pty-server` | `rusqlite` 仍被 `agent_data.rs` 使用 | **保留依赖**；仅删 `cookies.rs`、`mod cookies`、`Message::Cookies` |
| `third-party/`（github-theme、suliworld） | 无 browser/bot 命中 | 保留 |

## 5. 测试与验收脚本

- 随功能整体删除：`test/release/browser-client.test.ts`、`browser-operation-ledger-process.fixture.ts`、`test/huhu-bot-integration/architecture.test.ts`、`test/agent-migrations/legacy-browser.test.ts`、`test/fixtures/browser-protector.ts`、`src/host/desktop/browser-session*.test.ts`、`retained-browser-file.test.ts`、`src/app/workbench/browser-contribution.test.ts`、`shared-browser-close.test.ts`、`agent/**/browser*.test.*`、Home `WebPanel.dom.test.tsx`、`media.dom.test.tsx`、`session-lifetime.test.ts` 与音乐/网页脚本及桩。原风险（Browser/Bot/网易云行为）随功能消失。
- `test/golden/__snapshots__/browser-{assistant,synthesis}.md`：`rg` 未发现任何读取方（`golden` 测试逐名读取其他快照），为孤儿文件，T-44 直接删。
- 混合测试需改而非删（保留非 Browser 风险）：`test/release/{release-artifacts,workflow-gates,documentation-policy,documentation-checker}.test.ts`、`test/agent-backup/*`、`test/agent-migrations/{fixtures,legacy-migration}.test.ts`、`test/sync/git-flow.test.ts`、`src/modules/versioning/**` 排除测试、`src/modules/agent/**` 各工作区/Omnibox/侧栏测试、`src/app/settings/**`、`src/shell/**`。
- 真实 Obsidian 验收脚本：删 `agent-browser-v2.mjs`（T-44）、`huhu-bot{,-note-effects,-sources}.mjs` 与 `fixtures/huhu-bot/**`（T-40）；改 `terminal-merge.mjs`（T-40）及含 `modules: {browser: …}`/设置分类 `browser` 的夹具（T-42：`agent-system-account`、`content-move-boundaries`、`content-renames`、`overflow-audit`、`p3-shell`、`release-vault-install`、`sync-autostash`、`vault-storage`、`workbench-probe`、`home-d2a`、`home-d2b-fixture`）。`agent-workbench-*`、`cdp.mjs` 里的 `browser` 是 puppeteer/CDP 目标类型（OUT，已标 keep）。

## 6. CI 与发行

- 删除：`browser-phase2-{apply,checks,workspace}.yml`、`browser-runtime-build.yml`（T-44）；`huhu-bot.yml`、`huhubot-storage-windows.yml`（T-41）。
- `release.yml`：删 `browser`、`bot` 两个 reusable job，`needs` 去掉两项，`git diff` 的 browser 产物列表，`cp` 清单中的 4 个 browser 文件与 browser 运行时 tar/attest、`native/huhubot/dist` 下载与 `verify-huhu-bot` 步骤。
- `lint.yml`：删 `setup-go`/Go 测试、`check:huhu-bot`/`build:huhu-bot`/`verify-huhu-bot` 步骤及 `git diff` 的 browser 产物。
- 保留：`perf-sampling.yml`（独立 Chrome）、`terminal-build.yml`、`hook-windows.yml`、`highlights-workspace.yml`。
- 发行资产：`verify-release-artifacts.mjs` 的 `pluginAssets` 与 `--bot`、`test/release/{release-artifacts,workflow-gates}.test.ts` 期望同步。

## 7. D-018 共享宿主能力去留结论

| 项 | 使用者（已核实） | 结论 |
|---|---|---|
| `src/host/desktop/browser-session.ts` | 仅 Home `platform/desktop/{netease-account,session}.ts`、`ui/web/WebPanel.tsx` 与 4 个同名测试 | **删除（T-44）**。T-42 先删三处使用者。其存储根 `.huhu/browser/<device>/profiles/` 与 Browser 数据同根，随 `BROWSER_ROOT` 一并不再有读写方；不建立保留/迁移（ADR-011）。 |
| `browser-session-migration.ts`（+test） | `browser-session.ts`、`agent/platform/desktop/agents/legacy-accounts.ts`（`retainLegacyDirectory`） | **删除（T-44）**。前置：T-43 在 `legacy-accounts.ts` 删掉对 plugin `accounts`/`binaries` 旧目录的"保留"段及相关断言（ADR-011），其余账号绑定逻辑不动。 |
| `retained-browser-file.ts`（+test） | 仅 `agent/platform/desktop/files.ts` 的路径解析回退 | **删除（T-44）**；T-43 先去掉 `files.ts` 回退与 `files.test.ts` 的 `.huhu/browser/other/legacy-runtime` 夹具。 |
| `shared/native/cookies.ts`（+test）、`agent/.../cookie-client.ts` | 唯一生产出口 `NATIVE_HELPER_SQLITE`（无读取方）；其余使用者皆为测试 | **删除（T-43）**。 |
| `native/pty-server/src/cookies.rs`、`main.rs` 的 `Message::Cookies` | 仅上述客户端 | **删除（T-43）**；`rusqlite` 依赖保留。 |
| 原生 `cookies` capability（`NativeCapability`、`NativeCookieReader`、`helper.ts`/`host.ts` 的 `'cookies'`） | 生产无调用；约 20 个原生/Agent 测试把 `acquire('cookies')` 当作"第二能力租约" | **删除（T-43）**；这些测试改用 `history` 能力承担同类租约/并发/取消断言，不得靠删断言换绿。`test/fixtures/native/control-v1.json`、`control-wire.test.ts`、`lazy-host.test.ts`、`pty-server/tests/{control,control_outbox,editor}.rs` 同步。 |
| `app/contracts/shared-workspace.ts` | `app/main.ts`、`contracts/module.ts`、`agent/module.ts`、`agent/services/migrations/entry.ts` | **改写（T-43），不删除**：删 `SharedBrowserTab`、`SharedBrowserPort`、`owner.browser`；`SharedWorkspaceOwner`（spaces/workspaceStore/recoveryOwner/setSpaceChooser/dispose）仍是 Agent 的应用级 owner，`main.ts` 的 `ensureSharedWorkspace` 保持。 |
| 网页快捷卡（D-021） | 卡片类型 `web`、`quickActions.type.url` | 保留；只删 `openIn` 的 HUHU 浏览器选项，`home-host.openBrowser` 收缩为 `window.open`。已验证不依赖 Browser 运行时，仅依赖 `BROWSER_OPEN` 的可选 peek。 |

## 8. 给 T-40–T-45 的最终写集修订建议

按"该票必须写、但当前 frontmatter 未覆盖"计算（`residual-scan` 配套的覆盖检查，glob 语义同 `**`/`*`）。顺序仍为 T-40 → T-41 → T-42 → T-43 → T-44 → T-45 → T-46，不需调整依赖。

- **T-40 增加：** `src/styles.json`（先去 huhubot css 条目，否则样式检查失败）、`scripts/obsidian-acceptance/terminal-merge.mjs`。输出路径 `docs/e2e/...` 改为 `temp/dev-overhaul/T-40/`。
- **T-41 增加：** `docs/third-party/huhu-bot.md`、`docs/third-party/licenses/go/**`；T-41 删除 `ajv`、`ajv-formats`。
- **T-42 增加：** `src/app/modules/registry.test.ts`、`src/app/recovery.test.ts`、`src/app/workbench/focus-state.ts`、`src/app/workbench/settings-categories.ts`、`src/app/settings/react/{BuiltInSettings.tsx,SearchableSetting.dom.test.tsx,SettingsPage.dom.test.tsx}`、`src/shell/host/workbench-pages.ts`、`src/shell/host/workbench-pages.dom.test.tsx`、`src/shell/layout.test.ts`、`src/shell/navigation-state.test.ts`、`src/shell/page/ResourceTabs.dom.test.tsx`、`src/shared/i18n/lazy/**`（`browser.ts` 本身已在）、`src/modules/automations/core/actions/{definition,open-url,registry.test}.ts`、`core/documents{,.test}.ts`、`i18n.ts`、`platform/definitions.test.ts`、`src/modules/home/platform/board/sync.ts`、`platform/rss/rss-service.ts`（注释）、`src/modules/home/i18n.ts`（Lead 独占，允许直接改并报告键）、`scripts/fixtures/dev-overhaul-startup/activation.test.ts`、`scripts/verify-issue-regressions.ts`、`scripts/obsidian-acceptance/{agent-system-account,content-move-boundaries,content-renames,home-d2a,home-d2b-fixture,overflow-audit,p3-shell,release-vault-install,sync-autostash,vault-storage,workbench-probe}.mjs`。
- **T-43 增加：** `src/host/desktop/native/{helper.ts,host.ts,helper-control.test.ts,helper-stream.test.ts,host-control.test.ts,host-control.integration.test.ts,host-editor.integration.test.ts,host-stream.integration.test.ts,host.test.ts,host.integration.test.ts,runtime.test.ts}`（`host.integration.test.ts` 已在写集）、`native/pty-server/tests/{control_outbox,editor}.rs`、`src/shared/native/{control-wire.test.ts,lazy-host.test.ts}`、`test/fixtures/native/control-v1.json`、`src/shared/i18n/lazy/{backup,migration,native}.ts`、`src/modules/agent/platform/desktop/files.test.ts`、`hooks/reader-lease.ts`、`spaces/writer-owner.ts`（端口段注释）、`test/agent-backup/{failure,roundtrip}.test.ts`、`fixtures.ts`、`test/agent-migrations/{fixtures,legacy-migration}.test.ts`、`legacy-browser.test.ts`（删）、`agent/platform/desktop/agents/legacy-accounts.test.ts`、`test/agent/accounts-launch.test.ts`、`agent/platform/desktop/server/native-history.test.ts`（如受 `retainLegacyDirectory` 影响）。`vault-layout.ts` 的 `BROWSER_MATERIALS_ROOT` 已在其写集。
- **T-44 增加：** `.gitattributes`、`.gitignore`、`NOTICE`（删除 Browser 衍生归属段）、`scripts/module-strings.ts`、`scripts/verify-reliability.ts`、`scripts/obsidian-acceptance/versioning-history.mjs`、`src/host/desktop/private-mode.ts`、`src/host/obsidian/storage/{device-id.ts,device-id.test.ts,private-storage.ts}`、`src/shared/storage/{vault-identity.ts,vault-identity.test.ts,huhu-paths.test.ts}`（`legacyBrowserVaultId` 旧身份字段，ADR-011 直接删）、`src/modules/versioning/core/{excludes.ts,core.test.ts,local-history.test.ts}`、`platform/desktop/excludes.test.ts`、`platform/obsidian/history-capture.test.ts`、`test/sync/git-flow.test.ts`、`zod` 依赖。
- **T-45：** 现有写集覆盖；另含 `docs/assets/browser/**` 与 `docs/images/readme/browser.png` 的删除。`NOTICE`、`THIRD-PARTY-NOTICES.md` 的归属在 T-44 处理，T-45 只复核。
- **T-46：** 以 `residual-scan.mjs --residual --inventory inventory.json` 作为残留门；输出路径改 `temp/dev-overhaul/T-46/`。

## 9. 对初稿的修正与待 Lead 决策

1. `NATIVE_HELPER_SQLITE` 无读取方（初稿写"读取方为 Browser 身份导入"），可直接删。
2. 原生 `cookies` 能力在测试里被当作通用第二租约，删除时须迁移断言到 `history`，初稿未提。
3. `retainLegacyDirectory` 由 Agent `legacy-accounts.ts` 使用，导致 `browser-session-migration.ts` 不能先于 T-43 删除；初稿未提。
4. 新发现可删依赖：npm `ajv`、`ajv-formats`（huhubot）、`zod`（browser）。
5. 初稿的"删除 `docs/e2e` 25 个截图"已不适用（目录已删）。
6. `docs/third-party/licenses/go/**` 19 个文件、`docs/third-party/huhu-bot.md` 属 T-41 写集缺口。
7. **待 Lead 决策（隐私）：** `versioning/core/excludes.ts` 与 Git 同步托管忽略块当前排除 `.huhu/browser/`、`.huhu/browser-materials/`、`.huhu/huhubot/`。按 ADR-011 默认全部删除；但开发期遗留的 `.huhu/browser/**/Cookies` 若仍在库中，删除排除后会被 Git 同步当作普通文件暂存。如需零风险，可在 T-44 保留单行 `.huhu/browser*` 排除并在 T-46 登记为 keep；默认按"直接删除"。
8. `main.js`、`styles.css`、`main.css` 在清单中为 Lead 生成产物；它们在 T-46 前由 Lead 重建后应不再命中规则（`--residual` 会验证）。

## 10. OUT / 保留项（均在清单中标 keep 并写明理由）

Obsidian 内置 Web viewer（`tab-icon-manager.ts` 的 `webviewer`）、`scripts/perf/**`、`scripts/ui-review/**`、`perf-sampling.yml`、`test/host/computed-surface.test.ts` 的独立 Chrome；`pi-artifact-profiles.json`（Pi CLI 档案内的 `open-browser.js` 文件名）；Navigator 的"属性 browser"、IME/滚动条等 DOM 通用用语；TickTick `ticktickCookie`；`redact.ts` 的敏感键脱敏；Issue 模板/SECURITY 的 Cookie 提示；图标关键词与 Iconic 上游文案；上游 apex-dashboard 归属注释；`GitWorkbench.tsx` 内部同名类型 `SharedWorkspaceProps`。
