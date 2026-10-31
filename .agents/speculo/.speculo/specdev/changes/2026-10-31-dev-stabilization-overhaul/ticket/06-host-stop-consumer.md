---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: ticket
ui_change: false
design_ref: null
change: 2026-10-31-dev-stabilization-overhaul
id: T-06
title: "TS 宿主消费分阶段停止"
status: done
kind: refactor
planning_depth: standard
planning_depth_reason: "宿主侧调用合同迁移，跨 TS↔Go 边界但局限于 huhubot 桌面平台层"
ready: true
risk: high
blocked_by: ["T-04"]
contract_ids: ["AC-281", "AC-282"]
owner: "host:codex/root"
expected_changes: ["<Path>src/modules/huhubot/platform/desktop/transport/managed.ts</Path>", "<Path>src/modules/huhubot/platform/desktop/runtime/client-runtime.ts</Path>"]
writable_paths: ["<Path>src/modules/huhubot/platform/desktop/transport/**</Path>","<Path>src/modules/huhubot/platform/desktop/runtime/**</Path>","<Path>src/modules/huhubot/services/events/runner.test.ts</Path>"]
read_only_paths: ["<Path>native/huhubot/internal/bootstrap/core.go</Path>","<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/execution-boundaries.md</Path>","<Path>src/modules/browser/**</Path>","<Path>native/browser-runtime/**</Path>"]
shared_paths: []
shared_path_owners: []
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "9f2bd86d620ed274f75eecfeab254efce5a40fa2ad5c5d255c7f877a93848cc7", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---

# Ticket T-06: TS 宿主消费分阶段停止

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-06.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

宿主重开、临时目录删除和 Profile 再次获取等真实完成或明确进入恢复流程；UI 关闭不等于进程结束。来源：ADR-002；#37 W2.1、W2.3；Spec AC-281、AC-282。

<a id="review-behavior"></a>
## 行为与范围

IN：TS 宿主按 T-04 的阶段合同等待与报告；超时后保留“仍在停止/刷盘”状态并交给资源 owner；测试夹具同步。OUT：界面呈现（W6 huhubot 票）。

## 验收标准

- [x] `AC-281`：宿主在 Profile 释放前不重开、不删除临时目录。
- [x] `AC-282`：调用方先超时再等完成的路径有测试。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 宿主等待 | vitest | `pnpm vitest run src/modules/huhubot/platform/desktop` | 新用例通过 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-06.md</Path>` |
| TS↔Go | huhubot 检查 | `pnpm check:huhu-bot` 与真实 desktop transport/credentials/events runner Vitest | 退出码 0 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-06.md</Path>` |

- **E2E disposition：** required：Lead 在 change-workspace 运行 `pnpm check:huhu-bot` 及真实 desktop transport/credentials/events runner Vitest；前者只运行Go，不代替TS↔Go。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

<a id="review-constraints"></a>
## 执行约束

依赖、深度及理由、路径所有权、资源声明和 Skill 调用绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。必需项目 Skill 按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 实际调用并保留证据。

不以 UI 关闭作为进程结束依据。

**证据失效：** base/head 变化触及本票写集、上游 ADR/Spec 对应条目修订、或绑定 Skill 摘要变化时，本票已有验证需重跑。

## 未决事项与风险

无

### 未决问题

无。

## 本轮范围与共享执行约束（LOG-017、LOG-018）

必读 `<Path>{roots.state}/specdev/changes/{change}/execution-boundaries.md</Path>`：Browser 及其集成面冻结，优先于本票宽目录写集；shared_paths 仅由声明的 Lead owner 串行写入。构建、全量验证及共享组件变更遵守该文件，不通过修复浏览器解除其他票的阻塞。本轮只更新计划，生产实现和 Git/远程动作尚未授权。

<a id="review-integration"></a>
## 原子集成门

T-04 与本票属于同一停止合同集成批次；统一生产者、消费者、生成类型、夹具和文档后，Lead 在稳定输入运行 Go 合同、TS runner/runtime 用例及真实 TS↔Go 夹具，再允许批次进入 dev。票级完成不授权单独提交不一致中间态，不保留双协议兼容分支。
