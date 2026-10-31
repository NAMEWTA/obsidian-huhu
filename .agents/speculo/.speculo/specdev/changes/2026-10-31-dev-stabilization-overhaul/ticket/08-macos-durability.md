---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: ticket
ui_change: false
design_ref: null
change: 2026-10-31-dev-stabilization-overhaul
id: T-08
title: "macOS 持久性 VFS 审计与崩溃模型测试"
status: ready
kind: investigation
planning_depth: standard
planning_depth_reason: "需按锁定版本审计第三方 VFS 并新增崩溃模型测试，断电部分属用户真机验收"
ready: true
risk: high
blocked_by: ["T-05"]
contract_ids: ["AC-341", "AC-342"]
owner: unassigned
expected_changes: ["<Path>native/huhubot/internal/adapters/outbound/sqlite/base/durability_test.go</Path>", "<Path>docs/e2e/dev-overhaul/durability/</Path>"]
writable_paths: ["<Path>native/huhubot/internal/adapters/outbound/sqlite/base/durability_test.go</Path>", "<Path>docs/e2e/dev-overhaul/durability/**</Path>"]
read_only_paths: ["<Path>native/huhubot/go.mod</Path>","<Path>native/huhubot/go.sum</Path>","<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/execution-boundaries.md</Path>","<Path>src/modules/browser/**</Path>","<Path>native/browser-runtime/**</Path>"]
shared_paths: []
shared_path_owners: []
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "9f2bd86d620ed274f75eecfeab254efce5a40fa2ad5c5d255c7f877a93848cc7", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---

# Ticket T-08: macOS 持久性 VFS 审计与崩溃模型测试

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-08.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

按锁定的 Go、SQLite/ncruces 版本审计 Darwin `xSync`、`fullfsync`/`checkpoint_fullfsync` 路径，并在 macOS runner 上验证正常关闭与进程崩溃模型。来源：#37 W2.14–W2.17；Spec AC-341、AC-342；永久 ADR-027。

## 行为与范围

IN：审计记录（源码位置、版本、实际配置）；macOS runner 上正常关闭与 kill 进程后重开的测试。OUT：系统/虚拟机骤停（用户真机验收，agent 不执行）；ADR-027 回写只形成提案，经 A 提升。

## 验收标准

- [ ] `AC-341`：审计记录可回读且版本与 `go.mod` 一致。
- [ ] `AC-342`：macOS runner 上正常关闭与进程崩溃模型分别有证据；骤停部分标为用户真机验收。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 审计 | 文档回读 | 核对 `docs/e2e/dev-overhaul/durability/` 中的源码定位 | 与锁定版本一致 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-08.md</Path>` |
| 崩溃模型 | Go 测试 + macOS runner | `cd native/huhubot && go test ./internal/adapters/outbound/sqlite/base/ -run Durab` | 通过 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-08.md</Path>` |

- **E2E disposition：** not-required：单元与 runner 级证据；骤停属用户真机验收。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

## 执行约束

依赖、深度及理由、路径所有权、资源声明和 Skill 调用绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。必需项目 Skill 按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 实际调用并保留证据。

不用 Linux 测试代替 Darwin 结论；`CHECKPOINT_MISSING` 的历史时序修复不得解释成数据丢失。

**证据失效：** base/head 变化触及本票写集、上游 ADR/Spec 对应条目修订、或绑定 Skill 摘要变化时，本票已有验证需重跑。

## 未决事项与风险

无

### 未决问题

无。

## 本轮范围与共享执行约束（LOG-017、LOG-018）

必读 `<Path>{roots.state}/specdev/changes/{change}/execution-boundaries.md</Path>`：Browser 及其集成面冻结，优先于本票宽目录写集；shared_paths 仅由声明的 Lead owner 串行写入。构建、全量验证及共享组件变更遵守该文件，不通过修复浏览器解除其他票的阻塞。本轮只更新计划，生产实现和 Git/远程动作尚未授权。
