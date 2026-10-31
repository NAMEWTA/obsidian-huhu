---
schema_version: 3
plan_contract_version: 1
resource_claims: ["agent:hook-spool-protocol"]
artifact: ticket
ui_change: false
design_ref: null
change: 2026-10-31-dev-stabilization-overhaul
id: T-13
title: "Hook 发布池可靠性修复"
status: ready
kind: bug
planning_depth: deep
planning_depth_reason: "改共享发布/消费池，涉及路径安全校验与资源所有权"
ready: true
risk: high
blocked_by: ["T-12"]
contract_ids: ["AC-311", "AC-312"]
owner: unassigned
expected_changes: ["<Path>src/modules/agent/platform/desktop/hooks/hook-spool.ts</Path>", "<Path>src/modules/agent/platform/desktop/hooks/spool-guard.ts</Path>"]
writable_paths: ["<Path>src/modules/agent/platform/desktop/hooks/**</Path>", "<Path>.github/workflows/hook-windows.yml</Path>", "<Path>docs/e2e/dev-overhaul/hook/**</Path>"]
read_only_paths: ["<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/execution-boundaries.md</Path>","<Path>src/modules/browser/**</Path>","<Path>native/browser-runtime/**</Path>"]
shared_paths: []
shared_path_owners: []
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "9f2bd86d620ed274f75eecfeab254efce5a40fa2ad5c5d255c7f877a93848cc7", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---

# Ticket T-13: Hook 发布池可靠性修复

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-13.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

原规格 96 个小事件突发 96/96 送达、每 scope 有序、无重复、无遗留槽位/lease。来源：#37 W3.3–W3.7；Spec AC-311、AC-312。

## 行为与范围

IN：依据 T-12 的分段数据减少持有 collector 时的重复同步 I/O 与不必要序列化；复用 50ac0fe 的祖先检查优化；检查缓存祖先信息后的替换、符号链接/重解析点、撤销与 generation 边界；容量不足/超时准确失败；真实进程测试保持隔离串行编排；多轮压力。OUT：关闭 Defender、扩大所有容量、放宽时限、接受少收事件。

## 验收标准

- [ ] `AC-311`：Windows runner ≥20 轮记录 96/96、有序、无重复、无遗留；Linux/macOS 无退化。
- [ ] `AC-312`：容量满、撤销、generation 变化、路径替换下准确失败且可定位，已接收事件不丢。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 突发 | vitest 真实进程 | `pnpm vitest run src/modules/agent/platform/desktop/hooks` | 通过 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-13.md</Path>` |
| Windows 多轮 | GitHub Actions | `hook-windows.yml` 循环 20 轮 | 全部通过并记录 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-13.md</Path>` |
| 安全边界 | vitest | `spool-guard` 与 hook 测试 | 校验仍拒绝越界 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-13.md</Path>` |

- **E2E disposition：** required：Lead 在 change-workspace 运行 `pnpm test:unit` 中 agent hooks 子集与 `pnpm test:safety-regressions`。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

## 执行约束

依赖、深度及理由、路径所有权、资源声明和 Skill 调用绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。必需项目 Skill 按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 实际调用并保留证据。

不移除任何输入、scope、大小、槽位或 reader 所有权校验。

**证据失效：** base/head 变化触及本票写集、上游 ADR/Spec 对应条目修订、或绑定 Skill 摘要变化时，本票已有验证需重跑。

## 未决事项与风险

有限轮次全过不写成绝对无偶发。

### 未决问题

无。

## 本轮范围与共享执行约束（LOG-017、LOG-018）

必读 `<Path>{roots.state}/specdev/changes/{change}/execution-boundaries.md</Path>`：Browser 及其集成面冻结，优先于本票宽目录写集；shared_paths 仅由声明的 Lead owner 串行写入。构建、全量验证及共享组件变更遵守该文件，不通过修复浏览器解除其他票的阻塞。本轮只更新计划，生产实现和 Git/远程动作尚未授权。
