---
schema_version: 3
plan_contract_version: 1
resource_claims: ["huhubot:stop-lifecycle-contract", "huhubot:profile-lock"]
artifact: ticket
ui_change: false
design_ref: null
change: 2026-10-31-dev-stabilization-overhaul
id: T-04
title: "Runner 分阶段停止合同（Go）"
status: done
kind: refactor
planning_depth: deep
planning_depth_reason: "改变 Runner 公共停止语义与调用合同，涉及 Profile 锁与资源释放，事故半径大"
ready: true
risk: high
blocked_by: ["T-01"]
contract_ids: ["AC-281", "AC-282"]
owner: "host:codex/root"
expected_changes: ["<Path>native/huhubot/internal/bootstrap/core.go</Path>", "<Path>native/huhubot/cmd/huhubot/main.go</Path>"]
writable_paths: ["<Path>native/huhubot/internal/bootstrap/**</Path>","<Path>native/huhubot/cmd/huhubot/**</Path>","<Path>native/huhubot/internal/application/api/**</Path>","<Path>native/huhubot/tests/contract/foundation/**</Path>","<Path>contracts/hap/**</Path>","<Path>native/huhubot/internal/protocol/hap/**</Path>","<Path>src/modules/huhubot/core/protocol/**</Path>","<Path>native/huhubot/internal/adapters/inbound/hap/router.go</Path>","<Path>native/huhubot/internal/adapters/inbound/stdio/server.go</Path>","<Path>src/modules/huhubot/api.ts</Path>","<Path>native/huhubot/tests/contract/recovery/producer_test.go</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/base/store.go</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/base/durability_test.go</Path>","<Path>native/huhubot/tests/contract/approval/checkpoint_inspection_test.go</Path>","<Path>native/huhubot/internal/adapters/inbound/stdio/server_lifecycle_test.go</Path>"]
read_only_paths: ["<Path>scripts/build-huhu-bot.mjs</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/execution-boundaries.md</Path>", "<Path>src/modules/browser/**</Path>", "<Path>native/browser-runtime/**</Path>"]
shared_paths: []
shared_path_owners: []
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "9f2bd86d620ed274f75eecfeab254efce5a40fa2ad5c5d255c7f877a93848cc7", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---

# Ticket T-04: Runner 分阶段停止合同（Go）

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-04.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

让调用方分别观察到“停止请求已接收、执行器已排空、持久化已完成、Profile 已释放”四种事实，替换 `Core.Close()` 固定 3 秒整体封装。来源：ADR-002；#37 W2.1–W2.5；Spec AC-281、AC-282；永久 ADR-027。

## 行为与范围

IN：扩展现有 `RequestStop/Done/WaitClosed`，用调用方期限观察阶段；`Close()` 重构或删除并迁移全部 Go 调用方（实现自定）；超时返回当前真实阶段，不报假成功，也不统一报 `EXECUTOR_STOP_TIMEOUT`；资源 owner 在调用方超时后继续清理。若阶段需要经 HAP 暴露给宿主，本票拥有 wire 合同变更：同票更新 `contracts/hap/v0.1`（schema、methods、fixtures、`generate.mjs` 产物）、Go `internal/protocol/hap` 与 TS `src/modules/huhubot/core/protocol` 校验，平台层消费在 T-06。REUSE：单一 drain、停止准入、`Done` 在清理与 Profile 解锁后关闭的语义。OUT：检查点调度（T-05）；TS 宿主（T-06）。

## 验收标准

- [x] `AC-281`：注入慢于 3 秒的刷盘时，调用方拿到真实阶段，之后可观察到真实完成；Profile 释放前无法再次获取。
- [x] `AC-282`：重复 stop、退出中到达的响应、生产者未收敛、重启竞争下无重复提交、无提前重开。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 慢刷盘 | Go 合同测试 | `cd native/huhubot && go test ./internal/bootstrap/... ./tests/contract/foundation/...` | 新用例在旧实现上失败、新实现通过 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-04.md</Path>` |
| 竞争与重复 stop | Go 合同测试 | 同上，含 `-race` | 无数据竞争、无重复提交 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-04.md</Path>` |
| 集成前观察 | 全量 Go（含 TS↔Go fixture） | `cd native/huhubot && go test ./...` | 本票 Go/wire 失败须修；确属待迁移 TS 消费者的用例逐项定位为等待 T-06，最终由 T-06 验收退出码 0 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-04.md</Path>` |

- **E2E disposition：** required：Lead 运行本票 bootstrap/foundation 的真实 Go 停止夹具、wire 及生成类型检查；T-04 的票级完成只覆盖这些阶段性产出。全量 `pnpm check:huhu-bot` 作为集成前观察，旧 TS 消费者夹具若因新合同失败，准确记录为等待 T-06，不能报全链通过。T-04 不单独合入 dev；T-06 完成后由 Lead 运行新合同的 TS↔Go 启停、超时与 Profile 重开联合验收。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

## 执行约束

依赖、深度及理由、路径所有权、资源声明和 Skill 调用绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。必需项目 Skill 按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 实际调用并保留证据。

不默认撤关闭刷盘或提前解锁；自动强杀只能是带恢复信息的最后手段。wire 合同若变化，本票更新 Go 生产者、生成类型、Go/wire 夹具与文档；TS 消费者归 T-06。完整合同验收与提交属于两票共同批次，不保留旧版本运行链（ADR-001）。

**证据失效：** base/head 变化触及本票写集、上游 ADR/Spec 对应条目修订、或绑定 Skill 摘要变化时，本票已有验证需重跑。

## 未决事项与风险

停止阶段漏报会让宿主提前重开 Profile；以失败注入测试覆盖。

### 未决问题

无。

## 本轮范围与共享执行约束（LOG-017、LOG-018）

必读 `<Path>{roots.state}/specdev/changes/{change}/execution-boundaries.md</Path>`：Browser 及其集成面冻结，优先于本票宽目录写集；shared_paths 仅由声明的 Lead owner 串行写入。构建、全量验证及共享组件变更遵守该文件，不通过修复浏览器解除其他票的阻塞。本轮只更新计划，生产实现和 Git/远程动作尚未授权。
