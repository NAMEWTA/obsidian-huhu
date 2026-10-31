---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: ticket
ui_change: false
design_ref: null
change: 2026-10-31-dev-stabilization-overhaul
id: T-19
title: "任务保存、列表与计数投影一致"
status: cancelled
kind: bug
planning_depth: standard
planning_depth_reason: "根因待复现，涉及写入/查询/订阅链"
ready: false
risk: medium
blocked_by: ["T-01"]
contract_ids: ["AC-261"]
owner: "host:codex/root"
expected_changes: ["<Path>src/modules/task/services/service.ts</Path>", "<Path>src/modules/task/core/query.ts</Path>"]
writable_paths: ["<Path>src/modules/task/services/**</Path>", "<Path>src/modules/task/core/**</Path>", "<Path>src/modules/task/platform/**</Path>"]
read_only_paths: ["<Path>src/modules/home/ui/tasks/</Path>","<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/execution-boundaries.md</Path>","<Path>src/modules/browser/**</Path>","<Path>native/browser-runtime/**</Path>"]
shared_paths: []
shared_path_owners: []
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "9f2bd86d620ed274f75eecfeab254efce5a40fa2ad5c5d255c7f877a93848cc7", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---

# Ticket T-19: 任务保存、列表与计数投影一致

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-19.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

保存后列表与计数来自同一领域结果，无重复行，失败保留输入。来源：#37 W5.7；Spec AC-261。

## 行为与范围

IN：记录保存完成、事件发布、索引更新、渲染、计数各阶段；以同一领域结果或版本化投影更新；乐观更新时定义回滚、并发版本与重复提交规则。OUT：`setTimeout`、重复全量扫描或假成功；日期宽度（T-28）。

## 验收标准

- [ ] `AC-261`：创建/编辑/完成/删除、筛选内外下列表与计数一致，无重复行。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 投影一致 | vitest | `pnpm test:task` | 通过 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-19.md</Path>` |

- **E2E disposition：** required：Lead 在 change-workspace 运行 `pnpm test:task` 与 `pnpm test:card-panels`。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

## 执行约束

依赖、深度及理由、路径所有权、资源声明和 Skill 调用绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。必需项目 Skill 按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 实际调用并保留证据。

不复制 task store。

**证据失效：** base/head 变化触及本票写集、上游 ADR/Spec 对应条目修订、或绑定 Skill 摘要变化时，本票已有验证需重跑。

## 未决事项与风险

无

### 未决问题

D 诊断门：先用 `<Path>{roots.workflows}/specdev/specdev-d-diagnose-bugs/SKILL.md</Path>` 在当前基线复现并确认根因（结果写入 `<Path>{roots.state}/specdev/changes/{change}/diagnosis.md</Path>` 的本票条目）；Lead 回读后按 ticket-readiness 重审本票。

## 本轮范围与共享执行约束（LOG-017、LOG-018）

必读 `<Path>{roots.state}/specdev/changes/{change}/execution-boundaries.md</Path>`：Browser 及其集成面冻结，优先于本票宽目录写集；shared_paths 仅由声明的 Lead owner 串行写入。构建、全量验证及共享组件变更遵守该文件，不通过修复浏览器解除其他票的阻塞。本轮只更新计划，生产实现和 Git/远程动作尚未授权。

## 用户处置（2026-10-31）

2026-10-31 用户答复：“我也不知道，如果没重现的话，就先默认完成，先不管”。据此结束T19本轮调查/修复要求；工程状态为用户批准取消（cancelled），不是已复现并修复，也不是完整AC261通过。保留现有诊断和生产行为，不再追问或安排复现。
证据见 <Path>{roots.state}/specdev/changes/{change}/evidence/T-19.md</Path>。原验收复选框保留未验证；日期宽度/界面迁移T28仍继续，其T19前置由Lead明确移除。
