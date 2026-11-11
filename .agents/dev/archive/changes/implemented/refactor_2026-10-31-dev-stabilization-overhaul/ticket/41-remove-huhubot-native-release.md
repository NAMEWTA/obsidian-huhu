---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: ticket
ui_change: false
design_ref: null
change: 2026-10-31-dev-stabilization-overhaul
id: T-41
title: "删除 huhubot Go 运行时、HAP 合同与构建发行链"
status: done
kind: refactor
planning_depth: deep
planning_depth_reason: "删除独立 Go module、版本化 wire 合同、CI 工作流与发行资产，影响 release 门禁"
ready: true
risk: high
blocked_by: ["T-40"]
contract_ids: ["AC-405"]
owner: unassigned
expected_changes: ["<Path>native/huhubot/</Path>", "<Path>contracts/hap/</Path>", "<Path>scripts/build-huhu-bot.mjs</Path>", "<Path>.github/workflows/huhu-bot.yml</Path>", "<Path>.github/workflows/release.yml</Path>", "<Path>package.json</Path>"]
writable_paths: ["<Path>native/huhubot/**</Path>", "<Path>contracts/hap/**</Path>", "<Path>scripts/build-huhu-bot.mjs</Path>", "<Path>scripts/huhu-bot-build.test.mjs</Path>", "<Path>scripts/huhu-bot-notices.mjs</Path>", "<Path>scripts/huhu-bot-notices.test.mjs</Path>", "<Path>scripts/verify-huhu-bot.mjs</Path>", "<Path>scripts/verify-huhu-bot-architecture.mjs</Path>", "<Path>scripts/bench-huhu-bot.mjs</Path>", "<Path>scripts/third-party-notices.mjs</Path>", "<Path>scripts/verify-release-artifacts.mjs</Path>", "<Path>scripts/verify-release-artifacts.d.mts</Path>", "<Path>scripts/documentation-policy.mjs</Path>", "<Path>scripts/bundle-budget.json</Path>", "<Path>package.json</Path>", "<Path>pnpm-lock.yaml</Path>", "<Path>eslint.config.mts</Path>", "<Path>.github/workflows/huhu-bot.yml</Path>", "<Path>.github/workflows/huhubot-storage-windows.yml</Path>", "<Path>.github/workflows/lint.yml</Path>", "<Path>.github/workflows/release.yml</Path>", "<Path>THIRD-PARTY-NOTICES.md</Path>", "<Path>test/release/workflow-gates.test.ts</Path>", "<Path>test/release/release-artifacts.test.ts</Path>", "<Path>test/release/documentation-policy.test.ts</Path>", "<Path>test/release/documentation-checker.test.ts</Path>", "<Path>docs/e2e/dev-overhaul/removal/T-41/**</Path>"]
read_only_paths: ["<Path>src/**</Path>", "<Path>native/pty-server/**</Path>", "<Path>native/browser-runtime/**</Path>"]
shared_paths: ["<Path>main.js</Path>", "<Path>styles.css</Path>", "<Path>build/**</Path>", "<Path>src/ui/styles/fonts.generated.css</Path>"]
shared_path_owners: ["<Path>main.js</Path> => Lead", "<Path>styles.css</Path> => Lead", "<Path>build/**</Path> => Lead", "<Path>src/ui/styles/fonts.generated.css</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "d217057f068f3fe9e59205fa372896c298dcd9afda5da1c46f7e441d5018283e", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---
# Ticket T-41: 删除 huhubot Go 运行时、HAP 合同与构建发行链

- **总体 Map：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/tickets-map.md</Path>`
- **Goal Plan：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/goal-plan.md</Path>`
- **上游 Spec：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/spec.md</Path>`
- **主线决策：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/ADR.md</Path>` ADR-010；盘点初稿 `<Path>.agents/dev/archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/removal-inventory.md</Path>`
- **完成 Evidence：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/evidence/T-41.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

删除 Bot Runner 底座 `native/huhubot`（独立 Go module，约 12.5 万行，含 SQLite/WAL/检查点/依赖存储/合同测试）、`contracts/hap/v0.1` wire 合同，以及仅为它存在的构建、通知、验证、基准、CI 与发行资产。T-05/T-07/T-08/T-10/T-11 的优化与修复随之取消，不再实施。来源：#41 R3；ADR-010；Spec AC-405。

## 行为与范围

IN：
- 删除 `native/huhubot/**`、`contracts/hap/**`。
- 删除 `scripts/{build-huhu-bot,huhu-bot-build.test,huhu-bot-notices,huhu-bot-notices.test,verify-huhu-bot,verify-huhu-bot-architecture,bench-huhu-bot}.mjs`；`package.json` 删除 `build:huhu-bot`、`check:huhu-bot`、`test:huhu-bot-tooling`、`test:huhu-bot-architecture`、`bench:huhu-bot`。
- `scripts/third-party-notices.mjs` 删除 Go 包段（`goNoticeSection/goPackages`）并重新生成 `THIRD-PARTY-NOTICES.md`；`scripts/verify-release-artifacts.mjs` 删除 `--bot`/`verifyBotAssets`；`scripts/documentation-policy.mjs` 删除 `native/huhubot` 分类及其测试用例。
- CI：删除 `.github/workflows/huhu-bot.yml`、`huhubot-storage-windows.yml`；`lint.yml` 删除 `setup-go`、Go 测试与 `check:huhu-bot`/`build:huhu-bot`/`verify-huhu-bot` 步骤；`release.yml` 删除 `bot` job、`huhu-bot-*` 资产下载/校验/上传及 `needs` 中的 `bot`；同步 `test/release/workflow-gates.test.ts`、`release-artifacts.test.ts`。
- `scripts/bundle-budget.json` 删除 `moduleActivationBytes.huhubot` 并按真实构建重写理由（不提高任何阈值）；`eslint.config.mts` 删除 `native/huhubot/tests/contract/effect-reconcile/*-fixture.mjs` 忽略项。

OUT：插件侧（T-40，前置）；Browser 链（T-44）；历史证据 `docs/e2e/dev-overhaul/baseline/test-huhu-bot-*.json` 与已完成票 T-04/T-06/T-09 的 Evidence 保留为历史（T-45 处理悬挂链接）。

## 验收标准

- [ ] `AC-405`：仓库不再含 Go module 与 HAP 合同；CI/发行不再构建、校验或上传 huhu-bot 资产，Go 工具链不再是任何工作流的依赖；`pnpm check:notices`、`test/release/**`、lint 通过；`bundle-budget.json` 无 huhubot 项且理由与实测一致。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 发行门 | vitest | `pnpm exec vitest run test/release` | 通过 | `<Path>.agents/dev/archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/evidence/T-41.md</Path>` |
| 通知 | 脚本 | `pnpm check:notices` | 通过 | 同上 |
| 工作流 | 静态 | `rg -n 'setup-go|huhu-bot|huhubot' .github` | 0 命中 | 同上 |
| 包体 | 构建 | 构建序列 + `pnpm check:bundle` | 通过 | 同上 |

- **E2E disposition：** required：本票运行 release/notices/lint/包体检查；远程 CI 仅在用户授权时运行。
- **运行环境：** change README 选定的 change-workspace（当前 `dev`）；本票检查与 Lead-owned E2E 在固定输入上执行。

## 执行约束

依赖、深度及理由、路径所有权、资源声明和 Skill 调用绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前以 T-39 盘点终版核对实际代码。必需项目 Skill 按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 实际调用并保留证据。

与 T-44 共享 `package.json`、`release.yml`、`lint.yml`、`verify-release-artifacts.mjs`、`third-party-notices.mjs`、`bundle-budget.json`、`eslint.config.mts`、`test/release/*`，T-44 依赖本票串行执行。不预先修改远程 Release 或已发布资产。

- 删除即删除：不保留空壳模块、开关、别名、兼容分支、“已移除”占位页或旧协议转接（ADR-001、ADR-010）。
- 当前仅支持开发中的最新格式；无需对发布前旧目录、Profile、设置或工作区承担保留/兼容/迁移/字节不变责任（ADR-011）。当前功能的数据正确性、权限与隐私合同仍然有效。
- 不通过删除仍有效的非 Browser/Bot 测试换绿灯；被删测试只能是随被删功能一起消失的测试，Evidence 逐个列出并说明原风险是否随功能消失。

**证据失效：** base/head 变化触及本票写集或盘点清单、ADR-010/Spec AC-4xx 修订、绑定 Skill 摘要变化时，本票已有验证需重跑。

## 退出条件

Go/HAP/huhu-bot 构建与发行链完全移除，相关检查通过；Evidence 列出删除的测试及其原风险随功能消失的说明。

## 未决事项与风险

`release.yml` 与 `workflow-gates` 测试同时含 Browser 段，需只删 bot 部分保持可运行；已发布 Release 中的 bot 资产不在本票处理范围。

### 未决问题

无。
