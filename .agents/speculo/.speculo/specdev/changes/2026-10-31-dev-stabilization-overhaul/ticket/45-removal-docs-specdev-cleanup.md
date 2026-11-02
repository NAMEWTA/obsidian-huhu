---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: ticket
ui_change: false
design_ref: null
change: 2026-10-31-dev-stabilization-overhaul
id: T-45
title: "清理文档、开发规则与 specdev 历史中的悬挂引用"
status: draft
kind: documentation
planning_depth: standard
planning_depth_reason: "跨用户文档、根说明、项目 Skill 与历史档案，需区分现行说明与历史原文"
ready: false
risk: medium
blocked_by: ["T-44"]
contract_ids: ["AC-406", "AC-407"]
owner: unassigned
expected_changes: ["<Path>README.md</Path>", "<Path>README.ZH.md</Path>", "<Path>AGENTS.md</Path>", "<Path>docs/architecture.md</Path>", "<Path>docs/data.md</Path>", "<Path>docs/development.md</Path>"]
writable_paths: ["<Path>README.md</Path>", "<Path>README.ZH.md</Path>", "<Path>AGENTS.md</Path>", "<Path>docs/**</Path>", "<Path>.agents/skills/dev/**</Path>", "<Path>.agents/skills/ui/**</Path>", "<Path>scripts/verify-docs.mjs</Path>", "<Path>docs/e2e/dev-overhaul/removal/T-45/**</Path>"]
read_only_paths: ["<Path>.agents/speculo/.speculo/specdev/adr/**</Path>", "<Path>.agents/speculo/.speculo/specdev/context/**</Path>", "<Path>.agents/speculo/.speculo/specdev/design/**</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/archive/**</Path>"]
shared_paths: ["<Path>docs/references.md</Path>"]
shared_path_owners: ["<Path>docs/references.md</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "9f2bd86d620ed274f75eecfeab254efce5a40fa2ad5c5d255c7f877a93848cc7", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---
# Ticket T-45: 清理文档、开发规则与 specdev 历史中的悬挂引用

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **主线决策：** `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>` ADR-010；盘点初稿 `<Path>{roots.state}/specdev/changes/{change}/removal-inventory.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-45.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

让现行文档与功能一致：删除 Browser/Bot 专属文档与资产，改写混合文档中的 Browser/Bot 段落，给出遗留用户数据的手动清理说明，并处理 specdev 历史档案和永久知识中的悬挂引用（历史原文保留，永久 ADR/context 只经 A 网关）。来源：#41 R7；ADR-010；Spec AC-406、AC-407。

## 行为与范围

IN：
- 删除 `docs/browser.md`、`browser-protocol.md`、`browser-runtime.md`、`browser-verification.md`、`browser-phase2.md`、`browser-phase2-traceability.md`、`huhu-bot-acceptance.md`、`huhu-bot-performance.md`、`third-party/huhu-bot.md`、`docs/assets/browser/**`、`docs/images/readme/browser.png`，以及只被这些文档引用的 `docs/e2e/*browser*.png`、`huhubot-chat.png`、`recheck-bot.png`、`round2-bot.png` 等截图（逐个核对引用）。
- 改写 `README.md`/`README.ZH.md`（双语）、`AGENTS.md`（项目与结构段的 `native/huhubot`、Bot Runner、Bot Profile、`contracts/hap` 描述）、`docs/README.md`、`architecture.md`、`data.md`（删除 Browser/Bot 数据表行，新增“已移除功能的遗留数据”小节列出 `.huhu/browser*`、`.huhu/huhubot/`、本机 Bot Profile、localStorage 键、userData 目录及安全手动清理方法；保留 Home 会话目录说明）、`development.md`、`privacy.md`、`workbench.md`、`agent-workbench.md`、`dashboard.md`、`sync.md`、`automation.md`、`archives-implementation.md`、`third-party/orca-terminal-workbench.md`；`docs/references.md` 由 Lead 串行更新。
- 项目 Skill：`.agents/skills/dev/{SKILL.md,references/{architecture,testing,build-and-release,licensing,settings-and-i18n,module-authoring}.md}`、`.agents/skills/ui/references/shell.md` 删除已移除模块的规则与命令；改动后同步更新所有绑定该 Skill 的 Ticket 摘要（skill_bindings sha256）。
- specdev：`changes/archive/**` 与本 change 历史 LOG/会话/证据保留原文，不改写历史；如 `pnpm test:docs` 或 specdev 校验因删除出现新的断链，按检查器既有归档规则处理（例如把指向已删文件的链接转为纯文本路径并注明“已随 ADR-010 删除”），不跳过检查。永久 `specdev/adr/**`（4 份涉及）与 `context/**`（3 份涉及）只整理“需要 A 标记为 superseded 的条目清单”交用户授权后由 A 执行。

OUT：生产代码；永久知识直接写入；GitHub Issue/PR/Release 文案（远程动作需用户授权）。

## 验收标准

- [ ] `AC-406`：`docs/data.md` 准确列出遗留数据位置与手动清理方法，且明确插件不会自动删除。
- [ ] `AC-407`：现行文档、根说明与项目 Skill 不再描述已删功能或命令；`pnpm test:docs` 相比 dev 基线无新增失败；历史档案原文保留；永久知识修订清单已交付待 A 执行。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 文档 | 脚本 | `pnpm test:docs` | 无新增失败（与 T-01 基线逐项对比） | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-45.md</Path>` |
| 残留 | 只读检索 | `node docs/e2e/dev-overhaul/removal/residual-scan.mjs --scope docs` | 0 未批准命中 | 同上 |
| specdev | 校验器 | `node .agents/speculo/workflows/specdev/common/tools/validate-specdev.mjs --repo . <change>` | 0 错误 | 同上 |

- **E2E disposition：** not-applicable：纯文档；可观察结果由 T-46 一并复核。
- **运行环境：** change README 选定的 change-workspace（当前 `dev`）；本票检查与 Lead-owned E2E 在固定输入上执行。

## 执行约束

依赖、深度及理由、路径所有权、资源声明和 Skill 调用绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前以 T-39 盘点终版核对实际代码。必需项目 Skill 按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 实际调用并保留证据。

当前维护文档只保留中文，根 README 保持双语（AGENTS.md 文档规则）。删除重复版本前合并仍成立的独有信息。

- 删除即删除：不保留空壳模块、开关、别名、兼容分支、“已移除”占位页或旧协议转接（ADR-001、ADR-010）。
- 不删除、移动、覆盖任何用户数据目录或本机 Profile（ADR-010 D-019）；代码删除与数据清理是两件事。
- 不通过删除仍有效的非 Browser/Bot 测试换绿灯；被删测试只能是随被删功能一起消失的测试，Evidence 逐个列出并说明原风险是否随功能消失。

**证据失效：** base/head 变化触及本票写集或盘点清单、ADR-010/Spec AC-4xx 修订、绑定 Skill 摘要变化时，本票已有验证需重跑。

## 退出条件

文档检查与残留检索通过，永久知识修订清单交付；Skill 摘要与票据绑定一致。

## 未决事项与风险

`test:docs` 在 dev 基线已有失败（归档断链），必须逐项区分新增与既有；改动 dev Skill 会使所有绑定票的 sha256 漂移，需同批更新。

### 未决问题

无。
