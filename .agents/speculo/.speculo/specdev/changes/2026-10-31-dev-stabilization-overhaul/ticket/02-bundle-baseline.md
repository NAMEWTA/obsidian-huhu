---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: ticket
ui_change: false
design_ref: null
change: 2026-10-31-dev-stabilization-overhaul
id: T-02
title: "包体基线重建与预算理由校正"
status: done
kind: operations
planning_depth: lite
planning_depth_reason: "只重建报告并修正理由文本，不改阈值或产品代码"
ready: true
risk: low
blocked_by: []
contract_ids: ["AC-331"]
owner: "host:codex/root"
expected_changes: ["<Path>scripts/bundle-budget.json</Path>", "<Path>docs/e2e/dev-overhaul/bundle/</Path>"]
writable_paths: ["<Path>scripts/bundle-budget.json</Path>", "<Path>docs/e2e/dev-overhaul/bundle/**</Path>"]
read_only_paths: ["<Path>scripts/check-bundle.mjs</Path>","<Path>esbuild.config.mjs</Path>","<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/execution-boundaries.md</Path>","<Path>src/modules/browser/**</Path>","<Path>native/browser-runtime/**</Path>"]
shared_paths: ["<Path>main.js</Path>","<Path>styles.css</Path>","<Path>build/**</Path>","<Path>src/ui/styles/fonts.generated.css</Path>"]
shared_path_owners: ["<Path>main.js</Path> => Lead","<Path>styles.css</Path> => Lead","<Path>build/**</Path> => Lead","<Path>src/ui/styles/fonts.generated.css</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "9f2bd86d620ed274f75eecfeab254efce5a40fa2ad5c5d255c7f877a93848cc7", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---

# Ticket T-02: 包体基线重建与预算理由校正

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-02.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

用当前锁定工具链重建 JS/CSS、eager closure 与各模块 activation 报告，作为 W7 的起点；校正 `outputBudgetReason` 中“8058 KiB”与实际上限 8,252,416 B（8059 KiB）不一致。来源：#37 W7.1、W7.5；triage 已核对的不一致；Spec AC-331、NFR-003。

## 行为与范围

IN：运行 “冻结期构建序列（execution-boundaries）” 与 `pnpm check:bundle`，保存 metafile 摘要、各模块 activation 余量与环境；只修正 `outputBudgetReason` 文本使其与数值一致。REUSE：现有预算与 forbidden eager areas。OUT：任何阈值调整、减重（T-37）。

## 验收标准

- [x] `AC-331`：报告记录各项实测值与余量，`outputBudgetReason` 与阈值一致，阈值未改变。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 报告重建 | 构建与预算检查 | `冻结期构建序列 + pnpm check:bundle` | 退出码 0 或如实记录超限 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-02.md</Path>` |
| 阈值未放宽 | diff 检查 | `git diff scripts/bundle-budget.json` | 只有 reason 文本变化 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-02.md</Path>` |

- **E2E disposition：** not-required：无运行时行为变化。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

## 执行约束

依赖、深度及理由、路径所有权、资源声明和 Skill 调用绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。必需项目 Skill 按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 实际调用并保留证据。

构建由 Lead 按 execution-boundaries 的冻结期序列执行；main.js/styles.css 是 Lead-owned shared_paths，不是只读输入。产物与源码保持一致并留在工作区；本票不改变 Browser 预算项或资产，不提交产物。

**证据失效：** base/head 变化触及本票写集、上游 ADR/Spec 对应条目修订、或绑定 Skill 摘要变化时，本票已有验证需重跑。

## 未决事项与风险

无

### 未决问题

无。

## 本轮范围与共享执行约束（LOG-017、LOG-018）

必读 `<Path>{roots.state}/specdev/changes/{change}/execution-boundaries.md</Path>`：Browser 及其集成面冻结，优先于本票宽目录写集；shared_paths 仅由声明的 Lead owner 串行写入。构建、全量验证及共享组件变更遵守该文件，不通过修复浏览器解除其他票的阻塞。本轮只更新计划，生产实现和 Git/远程动作尚未授权。
