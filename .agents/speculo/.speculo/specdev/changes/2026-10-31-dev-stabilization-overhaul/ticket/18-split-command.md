---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: ticket
ui_change: true
design_ref: {"revision":2,"digest":"566034f112192e7d062540a1ce9051674b061d0475e61bf2a794825aad46f77b","pages":["UI-TERMINAL"],"acceptance":["AC-351","AC-352"]}
change: 2026-10-31-dev-stabilization-overhaul
id: T-18
title: "分屏命令目标、执行与反馈统一"
status: done
kind: bug
planning_depth: standard
planning_depth_reason: "真实服务/模型已确认静默拒绝，需覆盖四入口和窗口目标"
ready: true
risk: medium
blocked_by: ["T-01"]
contract_ids: ["AC-251"]
owner: "host:codex/root"
expected_changes: ["<Path>src/modules/agent/core/workspace/ops.ts</Path>", "<Path>src/modules/agent/services/controller.ts</Path>", "<Path>src/modules/agent/ui/AgentWorkspacePage.tsx</Path>"]
writable_paths: ["<Path>src/modules/agent/core/workspace/**</Path>","<Path>src/modules/agent/services/controller.ts</Path>","<Path>src/modules/agent/ui/AgentWorkspacePage.tsx</Path>","<Path>src/modules/agent/services/workspace-service.ts</Path>","<Path>src/modules/agent/services/workspace-service.test.ts</Path>","<Path>src/modules/agent/services/controller-control.test.ts</Path>","<Path>src/modules/agent/ui/AgentWorkspacePage.dom.test.tsx</Path>","<Path>src/modules/agent/ui/workspace/WorkspaceLayout.tsx</Path>","<Path>src/modules/agent/ui/workspace/WorkspaceLayout.dom.test.tsx</Path>","<Path>src/modules/agent/ui/tabs/WorkspaceTab.tsx</Path>","<Path>src/modules/agent/ui/tabs/WorkspaceTab.dom.test.tsx</Path>","<Path>src/modules/agent/ui/sidebar/AgentSidebar.tsx</Path>","<Path>src/modules/agent/ui/sidebar/AgentSidebar.dom.test.tsx</Path>","<Path>src/modules/agent/ui/jump/JumpPalette.tsx</Path>","<Path>src/modules/agent/ui/jump/JumpPalette.dom.test.tsx</Path>","<Path>src/modules/agent/i18n.ts</Path>"]
read_only_paths: ["<Path>src/modules/agent/core/workspace/shortcuts.ts</Path>","<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/execution-boundaries.md</Path>","<Path>src/modules/browser/**</Path>","<Path>native/browser-runtime/**</Path>"]
shared_paths: []
shared_path_owners: []
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "9f2bd86d620ed274f75eecfeab254efce5a40fa2ad5c5d255c7f877a93848cc7", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}, {"id": "ui", "path": "<Path>.agents/skills/ui/SKILL.md</Path>", "sha256": "ee5c7facae34a008a21c5c4b4c3a1b80afe617148c299fe4dcb08d7a6f6840ff", "phase": "implement", "operation": "apply-workbench-ui-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---

# Ticket T-18: 分屏命令目标、执行与反馈统一

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-18.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

命令面板、快捷键、菜单、拖拽复用同一分屏业务动作，目标明确、无静默无效。来源：#37 W5.6；Spec AC-251。

## 行为与范围

IN：追踪活动窗口/工作区/tab/group/焦点；单标签组、最后一个标签、多组、固定标签、非终端页、弹出窗口；不能执行时给出原因。OUT：重新注册同名命令。

## 验收标准

- [x] `AC-251`：四种入口同一业务动作；成功有布局变化与合理焦点；不能执行时有原因；不误停终端。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 模型 | vitest | `pnpm vitest run src/modules/agent/core/workspace` | 通过 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-18.md</Path>` |

- **E2E disposition：** required：宿主内分屏属用户真机验收；agent 在 change-workspace 完成模型与 DOM 测试。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

## 执行约束

依赖、深度及理由、路径所有权、资源声明和 Skill 调用绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。必需项目 Skill 按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 实际调用并保留证据。

不修改其他窗口的活动对象。

**证据失效：** base/head 变化触及本票写集、上游 ADR/Spec 对应条目修订、或绑定 Skill 摘要变化时，本票已有验证需重跑。

## 未决事项与风险

D已确认单标签自分屏保护与void调用链丢失原因；额外宿主焦点假设不由此诊断代为确认。

### 未决问题

无。

### 本轮设计批准的影响

共享基线 DESIGN-0002 与 change DESIGN revision 2 已批准（LOG-016）。T18-D01已完成精确D诊断并通过DoR，现有design_ref绑定UI-TERMINAL的控件/无障碍合同；AC-251仍由Spec及实际四入口行为验收。不以 T-23–T-36 的就绪替代本票诊断。

## 本轮范围与共享执行约束（LOG-017、LOG-018）

必读 `<Path>{roots.state}/specdev/changes/{change}/execution-boundaries.md</Path>`：Browser 及其集成面冻结，优先于本票宽目录写集；shared_paths 仅由声明的 Lead owner 串行写入。构建、全量验证及共享组件变更遵守该文件，不通过修复浏览器解除其他票的阻塞。本轮只更新计划，生产实现和 Git/远程动作尚未授权。

### D诊断与DoR复核（T18-D01）

2026-10-31 Lead回读diagnosis.md及diagnostics/T-18/：真实move/update单标签split静默无效已红灯复现，两标签与直接模型差分确认拒绝结果缺失。允许进入局部修复；宿主焦点的其他可能原因仍靠票级回归验证，不宣称全部历史原因已确认。补齐真实service、四入口及其测试/词典最小写集。Browser相关分支、标签组件与共享行为保持不变，不能由此扩展冻结范围。

设计映射复用批准UI-TERMINAL的AC-351/352（控件、键盘、焦点与反馈），功能验收仍为Spec AC-251；本票不改变布局风格、不新增视觉状态方向，不改DESIGN摘要。不能执行时通过已有可访问反馈与明确原因解释；沿用DESIGN“反馈与异步合同”，而非原型模拟终端作为运行证据。旧段落的draft说明为本轮诊断前记录，以此DoR复核和frontmatter为准。
