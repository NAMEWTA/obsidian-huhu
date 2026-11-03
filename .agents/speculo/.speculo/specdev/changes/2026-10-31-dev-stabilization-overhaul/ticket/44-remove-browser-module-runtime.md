---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: ticket
ui_change: false
design_ref: null
change: 2026-10-31-dev-stabilization-overhaul
id: T-44
title: "删除 Browser 模块、原生运行时、构建产物与发行链"
status: done
kind: refactor
planning_depth: deep
planning_depth_reason: "删除整模块、Rust 运行时、根目录提交产物和 4 个工作流，改变默认构建命令"
ready: false
risk: high
blocked_by: ["T-43", "T-41"]
contract_ids: ["AC-405"]
owner: unassigned
expected_changes: ["<Path>src/modules/browser/</Path>", "<Path>native/browser-runtime/</Path>", "<Path>browser-worker.cjs</Path>", "<Path>browser-cli.cjs</Path>", "<Path>tsconfig.browser-worker.json</Path>", "<Path>package.json</Path>"]
writable_paths: ["<Path>src/host/desktop/browser-session*</Path>", "<Path>src/host/desktop/retained-browser-file*</Path>", "<Path>src/modules/browser/**</Path>", "<Path>native/browser-runtime/**</Path>", "<Path>browser-worker.cjs</Path>", "<Path>browser-worker.cjs.sha256</Path>", "<Path>browser-cli.cjs</Path>", "<Path>browser-cli.cjs.sha256</Path>", "<Path>tsconfig.browser-worker.json</Path>", "<Path>scripts/assemble-browser-runtime.mjs</Path>", "<Path>scripts/build-browser-runtime.mjs</Path>", "<Path>scripts/build-browser-client.mjs</Path>", "<Path>scripts/browser-cli-options.mjs</Path>", "<Path>scripts/install-browser-runtime.mjs</Path>", "<Path>scripts/verify-browser-runtime-native.mjs</Path>", "<Path>scripts/dev.mjs</Path>", "<Path>scripts/third-party-notices.mjs</Path>", "<Path>scripts/verify-release-artifacts.mjs</Path>", "<Path>scripts/verify-release-artifacts.d.mts</Path>", "<Path>scripts/documentation-policy.mjs</Path>", "<Path>scripts/bundle-budget.json</Path>", "<Path>scripts/obsidian-acceptance/agent-browser-v2.mjs</Path>", "<Path>package.json</Path>", "<Path>pnpm-lock.yaml</Path>", "<Path>eslint.config.mts</Path>", "<Path>THIRD-PARTY-NOTICES.md</Path>", "<Path>.github/workflows/browser-phase2-apply.yml</Path>", "<Path>.github/workflows/browser-phase2-checks.yml</Path>", "<Path>.github/workflows/browser-phase2-workspace.yml</Path>", "<Path>.github/workflows/browser-runtime-build.yml</Path>", "<Path>.github/workflows/release.yml</Path>", "<Path>.github/workflows/lint.yml</Path>", "<Path>test/release/**</Path>", "<Path>test/fixtures/browser-protector.ts</Path>", "<Path>test/golden/__snapshots__/browser-assistant.md</Path>", "<Path>test/golden/__snapshots__/browser-synthesis.md</Path>", "<Path>src/styles.json</Path>", "<Path>src/host/desktop/browser-session-migration.ts</Path>", "<Path>src/host/desktop/retained-browser-file.ts</Path>", "<Path>src/host/desktop/retained-browser-file.test.ts</Path>", "<Path>src/host/desktop/browser-session-migration.test.ts</Path>", "<Path>src/host/desktop/browser-session-concurrency.test.ts</Path>", "<Path>src/host/desktop/browser-session-main.test.ts</Path>", "<Path>src/host/desktop/browser-session-recovery.test.ts</Path>", "<Path>docs/e2e/dev-overhaul/removal/T-44/**</Path>"]
read_only_paths: ["<Path>native/pty-server/**</Path>"]
shared_paths: ["<Path>main.js</Path>", "<Path>styles.css</Path>", "<Path>build/**</Path>", "<Path>src/ui/styles/fonts.generated.css</Path>"]
shared_path_owners: ["<Path>main.js</Path> => Lead", "<Path>styles.css</Path> => Lead", "<Path>build/**</Path> => Lead", "<Path>src/ui/styles/fonts.generated.css</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "5c60d84fe28cfc8b8653e8813127a870f0483b40cae8e823d8e8e48bc83c1d0f", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---
# Ticket T-44: 删除 Browser 模块、原生运行时、构建产物与发行链

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **主线决策：** `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>` ADR-010；盘点初稿 `<Path>{roots.state}/specdev/changes/{change}/removal-inventory.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-44.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

物理删除 HUHU Browser 本体：`src/modules/browser/**`（约 1.9 万行）、`native/browser-runtime/**`（Rust supervisor）、根目录提交的 `browser-worker.cjs`/`browser-cli.cjs` 及校验和、`tsconfig.browser-worker.json`、专用构建/装配/安装/验证脚本、4 个 Browser 工作流与 `release.yml`/`lint.yml` 中的 Browser 段，恢复不含 Browser 生成段的默认 `pnpm build`。来源：#41 R6；ADR-010；Spec AC-405；AC-406 已由 ADR-011 撤回。

## 行为与范围

IN：
- 删除上述目录、产物与脚本；`package.json` 的 `build` 去掉 `tsc -p tsconfig.browser-worker.json && node scripts/build-browser-runtime.mjs && node scripts/build-browser-client.mjs`，删除 `build:browser`、`check:browser-native`、`accept:browser-native`；`scripts/dev.mjs` 删除 Browser 重建；移除只被 Browser 使用的 npm 依赖（逐包证明，更新锁文件）。
- `third-party-notices.mjs` 删除 browser 入口与 `browserCrates` 段并重新生成 `THIRD-PARTY-NOTICES.md`；`verify-release-artifacts.mjs` 的 `pluginAssets` 去掉 4 个 browser 文件与校验；`documentation-policy.mjs` 删除 `native/browser-runtime` 分类；`release.yml` 删除 `browser` job、runtime 归档/attest/上传与 `git diff` 中的 browser 文件；`lint.yml` 同步；`test/release/**` 同步。
- `bundle-budget.json` 删除 `moduleActivationBytes.browser`，按实测重写 output/eager 理由（只降不升）；`eslint.config.mts` 删除 browser 文件规则与忽略项；`src/styles.json` 删除 Browser 样式源。
- `src/host/desktop`：删除 `browser-session.ts`、`browser-session-migration.ts` 及其 main/concurrency/migration/recovery 测试（D-018：Home 消费者已由 T-42 删除）；`retained-browser-file.ts` 若在 T-43 后无消费者一并删除。无需支持或验收发布前旧会话目录与旧分区数据（ADR-011）。
- 旧 Browser、userData、runtime 和 Cookie 目录均不构成保留、迁移或兼容验收；删除旧访问逻辑，不提供手动清理说明（ADR-011）。

OUT：Home 网页分区与网易云音乐的模块内代码（T-42 前置）；Agent 集成（T-43 前置）；文档（T-45）。

## 验收标准

- [ ] `AC-405`：`pnpm build` 不再执行任何 Browser 生成段并成功；发行资产只含 `main.js`、`manifest.json`、`styles.css` 等非 Browser 文件；仓库对 Browser 模块/runtime/产物/工作流的残留检索为 0（允许清单除外）。


## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 默认构建 | 构建 | `pnpm build` | 成功，无 browser 段 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-44.md</Path>` |
| 发行 | vitest | `pnpm exec vitest run test/release` | 通过 | 同上 |
| 旧路径零消费者 | 静态检索 | 检索 Browser/Profile/会话路径及旧依赖 | 当前产品不再引用旧路径 | 同上 |
| 包体/通知 | 脚本 | `pnpm check:bundle` + `pnpm check:notices` | 通过 | 同上 |

- **E2E disposition：** required：T-46 在当前格式新库中运行真实 Obsidian E2E，不进行旧数据字节不变性测试（ADR-011）。
- **运行环境：** change README 选定的 change-workspace（当前 `dev`）；本票检查与 Lead-owned E2E 在固定输入上执行。

## 执行约束

依赖、深度及理由、路径所有权、资源声明和 Skill 调用绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前以 T-39 盘点终版核对实际代码。必需项目 Skill 按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 实际调用并保留证据。

与 T-41 共享发行/通知/包体/lint 文件，依赖 T-41 串行；`main.js`/`styles.css` 只由 Lead 经构建链更新。

- 删除即删除：不保留空壳模块、开关、别名、兼容分支、“已移除”占位页或旧协议转接（ADR-001、ADR-010）。
- 本项目未正式发布，不对旧数据、旧 Profile、旧配置、旧布局提供保留、迁移、回读、兼容或字节不变验收（ADR-011）；当前格式的数据写入、隐私与权限安全仍须保证。
- 不通过删除仍有效的非 Browser/Bot 测试换绿灯；被删测试只能是随被删功能一起消失的测试，Evidence 逐个列出并说明原风险是否随功能消失。

**证据失效：** base/head 变化触及本票写集或盘点清单、ADR-010/Spec AC-4xx 修订、绑定 Skill 摘要变化时，本票已有验证需重跑。

## 退出条件

Browser 本体与构建发行链删除完毕，默认构建/发行测试/包体/通知/Home 会话回归通过。

## 未决事项与风险

删除默认构建段后 Execution Boundaries 的“冻结期构建序列”失效，需同步改为 `pnpm build`；npm 依赖移除需逐包证明无他用。

### 未决问题

DoR 重审条件：T-39 确认 npm 依赖与 `host/desktop` 会话代码的全部消费者（D-018 已决定删除）后由 Lead 改为 ready。

## D-018 修订（2026-11-02，LOG-022）

库内会话不再保留：本票在 T-42 删完 Home 消费者后删除 `src/host/desktop/browser-session*.ts`。状态仍为 draft（待实施）。
