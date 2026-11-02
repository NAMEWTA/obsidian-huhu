---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: ticket
ui_change: false
design_ref: null
change: 2026-10-31-dev-stabilization-overhaul
id: T-39
title: "Browser / huhubot 删除盘点（逐文件）"
status: ready
kind: investigation
planning_depth: deep
planning_depth_reason: "跨 TS/Go/Rust/构建/发行/文档/用户数据的不可逆删除，需先锁定完整影响面与依赖顺序"
ready: true
risk: high
blocked_by: ["T-01"]
contract_ids: ["AC-401"]
owner: unassigned
expected_changes: ["<Path>docs/e2e/dev-overhaul/removal/inventory.md</Path>", "<Path>docs/e2e/dev-overhaul/removal/inventory.json</Path>"]
writable_paths: ["<Path>docs/e2e/dev-overhaul/removal/inventory.md</Path>", "<Path>docs/e2e/dev-overhaul/removal/inventory.json</Path>", "<Path>docs/e2e/dev-overhaul/removal/residual-scan.mjs</Path>"]
read_only_paths: ["<Path>src/**</Path>", "<Path>native/**</Path>", "<Path>contracts/**</Path>", "<Path>scripts/**</Path>", "<Path>test/**</Path>", "<Path>.github/workflows/**</Path>", "<Path>docs/**</Path>", "<Path>package.json</Path>", "<Path>pnpm-lock.yaml</Path>", "<Path>README.md</Path>", "<Path>README.ZH.md</Path>", "<Path>AGENTS.md</Path>", "<Path>.agents/skills/**</Path>"]
shared_paths: []
shared_path_owners: []
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "9f2bd86d620ed274f75eecfeab254efce5a40fa2ad5c5d255c7f877a93848cc7", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---
# Ticket T-39: Browser / huhubot 删除盘点（逐文件）

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **主线决策：** `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>` ADR-010；盘点初稿 `<Path>{roots.state}/specdev/changes/{change}/removal-inventory.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-39.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

用户 2026-11-02 决定整体移除 browser（HUHU 浏览器）、huhubot 与 superbot（即 huhubot 的 superhuhu 重构方向，仓库内无独立 superbot 代码），并按 D-018 一并盘点 Home 网页嵌入分区与网易云音乐。本票在任何删除前，基于最新 dev 真实代码完成逐文件盘点，给后续删除票锁定写集、依赖顺序和残留检索规则。来源：#41 R1；ADR-010；LOG-020；Spec AC-401；盘点初稿 removal-inventory.md（规划期只读检索，未逐文件确认）。

## 行为与范围

IN：
- 逐文件列出 `src/modules/browser/**`（117 文件）、`src/modules/huhubot/**`（126）、`native/browser-runtime/**`（9）、`native/huhubot/**`（501）、`contracts/hap/**`（10）以及仓库根产物 `browser-worker.cjs`/`browser-cli.cjs`/`*.sha256`、`tsconfig.browser-worker.json`，每个文件标注 删除 / 改写 / 保留（附理由）。
- 模块外消费者：静态 import、`serviceKey`（`browser.workspace`、`browser.agent-access`、`browser.open`、`huhubot.client`、`huhubot.runtime`、`agent.browser-tabs`、`agent.native-helper-sqlite`）、contribution point（`BROWSER_MATERIAL_CONSUMERS`）、动态入口（`activateModule('huhubot')`、manifest `load: () => import('./module')`、页面工厂）、命令 `open-browser`、ribbon `globe`、ViewType/`getViewType()`、导航与设置分类、`navigation-state` 段、i18n 键（`browser.*`、`workbench.huhubot*`、`settings.productHuhuBot`、`agent.browser.*`、`quickActions.open.tab`、`home.dashboard.browserTab` 等）、设置命名空间 `browser` 与模块开关、`vault-layout` 常量（`BROWSER_ROOT`、`BROWSER_MATERIALS_ROOT`、`HUHUBOT_RUNTIME_ROOT`）。
- CLI 与构建字符串：`package.json` 的 `build`/`build:browser`/`check:browser-native`/`accept:browser-native`/`build:huhu-bot`/`check:huhu-bot`/`test:huhu-bot-*`/`bench:huhu-bot`，`scripts/dev.mjs` 内的 browser 重建，`esbuild` 入口、`third-party-notices.mjs` 的 browser 入口与 Go/Rust crate 段、`documentation-policy.mjs` 的 native 分类、`vitest.config.ts` 的 `huhuBotIntegrationTests`、`eslint.config.mts` 的 browser/huhubot 条目、`scripts/module-strings.ts`。
- 依赖：npm（只出现在 Browser/Bot 的包，需逐一 `rg` 验证无其他消费者后才可移除）、Go module（整个 `native/huhubot/go.mod`）、cargo（`native/browser-runtime/Cargo.toml`；`native/pty-server` 内仅服务 Browser 的 `cookies.rs` 等需按消费者确认）。
- 测试与验收脚本：`test/release/browser-*`、`test/huhu-bot-integration/**`、`test/agent-migrations/legacy-browser.test.ts`、`test/fixtures/browser-protector.ts`、`test/golden/__snapshots__/browser-*.md`（确认生成者）、`scripts/obsidian-acceptance/{agent-browser-v2,huhu-bot,huhu-bot-note-effects,huhu-bot-sources}.mjs` 与 `fixtures/huhu-bot/**`、`scripts/verify-browser-runtime-native.mjs`、`scripts/verify-huhu-bot*.mjs`，以及混合测试中的 Browser/Bot 用例。
- 发行资产与 CI：`.github/workflows/{browser-phase2-apply,browser-phase2-checks,browser-phase2-workspace,browser-runtime-build,huhu-bot,huhubot-storage-windows}.yml`，`release.yml` 的 browser/bot job 与资产，`lint.yml` 的 Go 步骤，`scripts/verify-release-artifacts.mjs`、`test/release/{release-artifacts,workflow-gates}.test.ts`。
- 共享宿主能力的归属判定：`src/host/desktop/browser-session.ts`（Home 网页嵌入分区与网易云音乐共用的库内 Electron 会话，D-018 用户决定删除）、`browser-session-migration.ts`、`retained-browser-file.ts`（Agent 旧浏览器文件解析/旧账号保留）、`src/shared/native/cookies.ts` + `native/pty-server/src/cookies.rs` + Agent `cookie-client`（初稿判断只服务 Browser 身份导入）、`src/app/contracts/shared-workspace.ts`。
- 发布前旧数据范围：旧 Browser/Bot/Profile、旧看板字段及 Agent 布局仅用于定位需要删除的消费者；不建立保留、迁移、回读或兼容测试（ADR-011）。
- 产出可复跑的残留检索脚本 `docs/e2e/dev-overhaul/removal/residual-scan.mjs`（只读，输出命中与允许清单），并给出 T-40–T-45 的最终写集修订建议。

OUT：任何删除或改写（T-40–T-45）；永久 ADR/context 写入（只经 A）；Obsidian 内置 Web viewer（`tab-icon-manager.ts` 的 `webviewer` 是 Obsidian 核心视图，非 HUHU Browser）、`scripts/perf` 与 UI runner 使用的独立 Chrome/Chromium（验证工具，非产品功能）、Agent 的 Pi CLI 档案（`pi-artifact-profiles*`，属终端 Agent 程序识别，与已删除的 huhubot 重构方向无关）。

## 验收标准

- [ ] `AC-401`：逐文件清点代码、构建、脚本、测试、发行与文档命中和处置，残留检索可复跑；D-018 共享消费者有去留结论，D-019 旧数据保留要求已被撤回（ADR-011）。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 清单完整 | 只读检索 | `node docs/e2e/dev-overhaul/removal/residual-scan.mjs --inventory docs/e2e/dev-overhaul/removal/inventory.json` | 未分类命中为 0 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-39.md</Path>` |
| 消费者 | `rg` + `tsc --noEmit` 依赖图 | 记录命令与命中数 | 与清单一致 | 同上 |

- **E2E disposition：** not-applicable：只读盘点，不改生产代码；E2E 由 T-46 负责。
- **运行环境：** change README 选定的 change-workspace（当前 `dev`）；本票检查与 Lead-owned E2E 在固定输入上执行。

## 执行约束

依赖、深度及理由、路径所有权、资源声明和 Skill 调用绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前以 T-39 盘点终版核对实际代码。必需项目 Skill 按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 实际调用并保留证据。

只读执行；不得为了盘点修改源码或生成物。规划期初稿 `removal-inventory.md` 只是起点，结论以本票实际检索为准，发现初稿错误时在 Evidence 记录并修正清单。

- 删除即删除：不保留空壳模块、开关、别名、兼容分支、“已移除”占位页或旧协议转接（ADR-001、ADR-010）。
- 当前仅支持开发中的最新格式；无需对发布前旧目录、Profile、设置或工作区承担保留/兼容/迁移/字节不变责任（ADR-011）。当前功能的数据正确性、权限与隐私合同仍然有效。
- 不通过删除仍有效的非 Browser/Bot 测试换绿灯；被删测试只能是随被删功能一起消失的测试，Evidence 逐个列出并说明原风险是否随功能消失。

**证据失效：** base/head 变化触及本票写集或盘点清单、ADR-010/Spec AC-4xx 修订、绑定 Skill 摘要变化时，本票已有验证需重跑。

### D-018 盘点要求（2026-11-02 用户决定删除）

盘点须覆盖 Home 网页嵌入分区与网易云音乐的全部文件、设置字段、小组件注册、词典键、样式、脚本与测试，并确认：含 `web` 分区/`music` 小组件/`music*` 字段的旧看板与设置在删除后的加载与保存行为；`.huhu/browser/<device>/profiles/home-*` 与旧分区 `persist:huhu-dashboard-*` 的实际位置。“网页快捷卡”（D-021）按保留处理，若发现其依赖 Browser 或会话则上报。

## 退出条件

清单与脚本提交到工作区并经 Lead 回读；后续删除票写集与依赖按清单修订（必要时递增 Map plan_revision）；旧数据位置仅用于定位废弃代码，不恢复 D-019 保护合同（ADR-011）。

## 未决事项与风险

混合文件（Agent、Home、app/shell）耦合深，漏判会在删除批次中造成编译失败或用户数据误伤；`browser-session.ts` 的存储根 `.huhu/browser/<device>/profiles/` 与 Browser 数据同根，需特别标注。

### 未决问题

无。
