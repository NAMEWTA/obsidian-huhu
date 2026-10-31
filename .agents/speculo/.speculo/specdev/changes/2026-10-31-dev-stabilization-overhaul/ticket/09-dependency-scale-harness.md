---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: ticket
ui_change: false
design_ref: null
change: 2026-10-31-dev-stabilization-overhaul
id: T-09
title: "依赖存储规模基准（prefactor）"
status: done
kind: refactor
planning_depth: standard
planning_depth_reason: "为 T-10 提供改前基线与结构性断言接缝，独立可验证"
ready: true
risk: medium
blocked_by: ["T-01"]
contract_ids: ["AC-291"]
owner: "host:codex/root"
expected_changes: ["<Path>native/huhubot/tests/contract/performance/</Path>"]
writable_paths: ["<Path>native/huhubot/tests/contract/performance/**</Path>", "<Path>docs/e2e/dev-overhaul/storage-scale/**</Path>"]
read_only_paths: ["<Path>native/huhubot/internal/adapters/outbound/sqlite/memory/</Path>","<Path>scripts/bench-huhu-bot.mjs</Path>","<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/execution-boundaries.md</Path>","<Path>src/modules/browser/**</Path>","<Path>native/browser-runtime/**</Path>"]
shared_paths: []
shared_path_owners: []
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "9f2bd86d620ed274f75eecfeab254efce5a40fa2ad5c5d255c7f877a93848cc7", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---

# Ticket T-09: 依赖存储规模基准（prefactor）

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-09.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

在改模型之前提交可复跑的 50/100/200 Run 规模用例，记录当前模型的行数、WAL 增量、阶段耗时与峰值内存，为 T-10 的结构性断言提供基线。来源：#37 W1.6；Spec AC-291。

## 行为与范围

IN：覆盖链式、分支委派、共享来源、多来源和撤权的虚构数据；输出每阶段 `memory_dependencies` 行数等。OUT：模型修改（T-10）。

## 验收标准

- [x] `AC-291`：规模用例在当前模型上可复跑并产出基线表，断言接缝可由 T-10 收紧。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 规模用例 | Go 测试 | `cd native/huhubot && go test ./tests/contract/performance/... -run DependencyScale` | 产出基线表 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-09.md</Path>` |
| 基准脚本 | pnpm | `pnpm bench:huhu-bot` | 退出码 0 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-09.md</Path>` |

- **E2E disposition：** not-required：测试与测量基础设施。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

## 执行约束

依赖、深度及理由、路径所有权、资源声明和 Skill 调用绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。必需项目 Skill 按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 实际调用并保留证据。

只用虚构数据。

**证据失效：** base/head 变化触及本票写集、上游 ADR/Spec 对应条目修订、或绑定 Skill 摘要变化时，本票已有验证需重跑。

## 未决事项与风险

无

### 未决问题

无。

## 本轮范围与共享执行约束（LOG-017、LOG-018）

必读 `<Path>{roots.state}/specdev/changes/{change}/execution-boundaries.md</Path>`：Browser 及其集成面冻结，优先于本票宽目录写集；shared_paths 仅由声明的 Lead owner 串行写入。构建、全量验证及共享组件变更遵守该文件，不通过修复浏览器解除其他票的阻塞。本轮只更新计划，生产实现和 Git/远程动作尚未授权。
