---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: ticket
ui_change: false
design_ref: null
change: 2026-10-31-dev-stabilization-overhaul
id: T-17
title: "自动化通知使用运行时名称快照"
status: done
kind: bug
planning_depth: standard
planning_depth_reason: "改变通知记录的数据语义与运行事件适配"
ready: true
risk: medium
blocked_by: ["T-01", "T-16"]
contract_ids: ["AC-231"]
owner: "host:codex/root"
expected_changes: ["<Path>src/modules/automations/services/runtime.ts</Path>", "<Path>src/modules/notifications/core/</Path>"]
writable_paths: ["<Path>src/modules/automations/services/**</Path>", "<Path>src/modules/automations/core/**</Path>", "<Path>src/modules/automations/i18n.ts</Path>", "<Path>src/modules/notifications/core/**</Path>", "<Path>src/modules/notifications/i18n.ts</Path>", "<Path>test/automations/**</Path>"]
read_only_paths: ["<Path>src/modules/notifications/ui/</Path>","<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/execution-boundaries.md</Path>","<Path>src/modules/browser/**</Path>","<Path>native/browser-runtime/**</Path>"]
shared_paths: []
shared_path_owners: []
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "9f2bd86d620ed274f75eecfeab254efce5a40fa2ad5c5d255c7f877a93848cc7", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---

# Ticket T-17: 自动化通知使用运行时名称快照

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-17.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

通知主文案为运行时名称快照与结果，详情按稳定 ID 解析现名或“已删除”。来源：LOG-011；#37 W5.4；Spec AC-231。

## 行为与范围

IN：通知记录保存名称快照；空名称用本地化“未命名自动化”并保留可复制 ID；toast 与持久通知语义一致；成功不早于实际结果；保持去重、未读与关联身份；不含敏感参数。OUT：通知中心/详情的视觉呈现调整（T-31）；若现有 UI 无法显示新字段，只记录缺口交 T-31。

## 验收标准

- [x] `AC-231`：改名、删除、空名称、超长名称、多次运行的用例通过；失败在 toast 消失后可在通知中心找到；无敏感泄漏。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 通知语义 | vitest | `pnpm vitest run src/modules/automations src/modules/notifications test/automations` | 通过 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-17.md</Path>` |
| 词典 | i18n | `pnpm test:i18n` | 通过 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-17.md</Path>` |

- **E2E disposition：** not-required：数据与语义层；呈现随 T-31 验收。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

## 执行约束

依赖、深度及理由、路径所有权、资源声明和 Skill 调用绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。必需项目 Skill 按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 实际调用并保留证据。

无

**证据失效：** base/head 变化触及本票写集、上游 ADR/Spec 对应条目修订、或绑定 Skill 摘要变化时，本票已有验证需重跑。

## 未决事项与风险

无

### 未决问题

无。

## 本轮范围与共享执行约束（LOG-017、LOG-018）

必读 `<Path>{roots.state}/specdev/changes/{change}/execution-boundaries.md</Path>`：Browser 及其集成面冻结，优先于本票宽目录写集；shared_paths 仅由声明的 Lead owner 串行写入。构建、全量验证及共享组件变更遵守该文件，不通过修复浏览器解除其他票的阻塞。本轮只更新计划，生产实现和 Git/远程动作尚未授权。
