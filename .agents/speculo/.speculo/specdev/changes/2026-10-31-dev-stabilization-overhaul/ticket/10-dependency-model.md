---
schema_version: 3
plan_contract_version: 1
resource_claims: ["huhubot:memory-schema", "huhubot:migration-sequence"]
artifact: ticket
ui_change: false
design_ref: null
change: 2026-10-31-dev-stabilization-overhaul
id: T-10
title: "依赖存储新模型：不再逐条落库传递闭包"
status: ready
kind: refactor
planning_depth: deep
planning_depth_reason: "改 schema 与撤权/清除/恢复链路，数据完整性与隐私风险高"
ready: true
risk: critical
blocked_by: ["T-09", "T-05"]
contract_ids: ["AC-291", "AC-292", "AC-284"]
owner: unassigned
expected_changes: ["<Path>native/huhubot/internal/adapters/outbound/sqlite/memory/context_view.go</Path>", "<Path>native/huhubot/internal/adapters/outbound/sqlite/memory/dependencies.go</Path>", "<Path>native/huhubot/internal/adapters/outbound/sqlite/migrations/</Path>"]
writable_paths: ["<Path>native/huhubot/internal/adapters/outbound/sqlite/memory/**</Path>", "<Path>native/huhubot/internal/adapters/outbound/sqlite/migrations/**</Path>", "<Path>native/huhubot/internal/adapters/outbound/sqlite/purge/**</Path>", "<Path>native/huhubot/tests/contract/performance/**</Path>", "<Path>native/huhubot/tests/contract/private-memory/**</Path>", "<Path>native/huhubot/tests/contract/purge/**</Path>", "<Path>docs/e2e/dev-overhaul/storage-scale/**</Path>"]
read_only_paths: ["<Path>native/huhubot/internal/adapters/outbound/sqlite/base/</Path>","<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/execution-boundaries.md</Path>","<Path>src/modules/browser/**</Path>","<Path>native/browser-runtime/**</Path>"]
shared_paths: []
shared_path_owners: []
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "9f2bd86d620ed274f75eecfeab254efce5a40fa2ad5c5d255c7f877a93848cc7", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---

# Ticket T-10: 依赖存储新模型：不再逐条落库传递闭包

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-10.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

条目只保存表示与来源版本引用，不再为每个条目写完整 effective 闭包。来源：ADR-004；#37 W1.1–W1.4、W1.6；Spec AC-291、AC-292；与 T-05 联合重测（AC-284）。

## 行为与范围

IN：先完成 W1.1 消费者盘点与决策记录（写入本票 Evidence；若证据不支持直接图，按 ADR-004 改用共享不可变子图并证明共享身份与失效规则）；新 schema、边身份、索引、去重、循环检测与资源上限；替换写入链；收紧 T-09 的结构性断言；联合重测 Windows WAL。OUT：旧 Profile 处理（T-11）；永久双读双写。

## 验收标准

- [ ] `AC-291`：同一来源闭包不随条目逐条复制，结构性行数断言与增长曲线证明。
- [ ] `AC-292`：编辑、撤权、删除预览、物理清除、跨 namespace、revision/hash 错配、检查点恢复回归通过，无无界递归。
- [ ] `AC-284`：与 T-05 联合重测时分别报告模型收益与 I/O 收益。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 结构断言 | Go 规模测试 | `cd native/huhubot && go test ./tests/contract/performance/... -run DependencyScale` | 行数不再随条目重复增长 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-10.md</Path>` |
| 正确性回归 | Go 合同 | `cd native/huhubot && go test ./...` | 退出码 0 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-10.md</Path>` |
| 联合重测 | Windows runner | `huhubot-storage-windows.yml` | 两类收益分别报告 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-10.md</Path>` |

- **E2E disposition：** required：Lead 在 change-workspace 运行 `pnpm check:huhu-bot` 与 `pnpm bench:huhu-bot`。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

## 执行约束

依赖、深度及理由、路径所有权、资源声明和 Skill 调用绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。必需项目 Skill 按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 实际调用并保留证据。

共享缓存不能绕过撤权检查；应删除内容、派生副本和引用不能成为不可追踪残留。单纯外包缓存而落库量不变不算完成。

**证据失效：** base/head 变化触及本票写集、上游 ADR/Spec 对应条目修订、或绑定 Skill 摘要变化时，本票已有验证需重跑。

## 未决事项与风险

决策记录若指向共享子图，需在 Evidence 证明失效规则；该选择在 ADR-004 授权内，不需新用户决定。

### 未决问题

无。

## 本轮范围与共享执行约束（LOG-017、LOG-018）

必读 `<Path>{roots.state}/specdev/changes/{change}/execution-boundaries.md</Path>`：Browser 及其集成面冻结，优先于本票宽目录写集；shared_paths 仅由声明的 Lead owner 串行写入。构建、全量验证及共享组件变更遵守该文件，不通过修复浏览器解除其他票的阻塞。本轮只更新计划，生产实现和 Git/远程动作尚未授权。
