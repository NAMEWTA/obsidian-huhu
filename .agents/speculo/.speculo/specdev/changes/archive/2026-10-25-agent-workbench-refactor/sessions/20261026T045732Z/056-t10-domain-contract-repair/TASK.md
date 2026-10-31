---
schema_version: 2
session: "20261026T045732Z"
task: "056-t10-domain-contract-repair"
kind: implementation
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-10"
---

# T10 domain contract repair after independent review

## Goal
修复 T10 独立双轴审查报告 055 的领域与协议接缝问题，保持唯一 SpaceService writer、显式 Space/Session 目标和旧入口必须先选择 Space 的规则。完成后让主记录缺失的 freshness、UTF-8 诊断预算、ack canonical 上限、message.send 取消传播和分页结果语义可回读。

## Inputs
回读 055 `REPORT.md`（Input-SHA256 `5e0038ad9eea81a6f9198bd7116fc70a4e428ab2d3d9be6767563b6033b49202`）及当前冻结源。只处理 S1 的领域/分页返回语义、S2、S3、S4、P1；UI 的 S1 消费、P2/P3/P4 由后继 057 处理。不得按 cwd/current view 猜测 Space。

## Workspace and Scope
工作区 `/home/wta/orca/workspaces/obsidian-huhu/terminal`，branch `NAMEWTA/terminal`，复用 T10 current change workspace。只允许修改：

- `src/modules/agent/core/inbox/model.ts`
- `src/modules/agent/core/inbox/model.test.ts`
- `src/modules/agent/services/spaces/space-service.ts`
- `src/modules/agent/services/spaces/space-service-inbox.test.ts`
- `src/modules/agent/services/spaces/space-service-recovery.test.ts`
- `src/modules/agent/services/inbox/service.ts`
- `src/modules/agent/services/inbox/service.test.ts`
- `src/modules/agent/services/inbox/presentation.ts`
- `src/modules/agent/services/inbox/presentation.test.ts`
- `src/modules/agent/services/control/inbox.ts`
- `src/modules/agent/services/control/inbox.test.ts`
- 本任务 `REPORT.md`

其它 UI、canonical schema/生成物、Root 产物、正式 Evidence/Goal/Map/Ticket、依赖、Git index 只读；不提交/推送/发布。

## Acceptance
1. `InboxListResult` 的稳定分页仍有明确 `afterSequence`/`nextSequence` 语义，返回受限 summary 或等价不含正文/引用的列表行；消息数量超过单页上限时不会宣称一次返回全量。保持 `highWaterSequence` 与 freshness。
2. `readPrimaryRecords`/`freshInboxPrimary` 能区分首次已知空库、已有主记录后缺失以及写入/读取不确定：无法证明是首次空库时不得把缺失返回为 authoritative fresh empty；补 primary missing/unknown 回归，不恢复旧数据、不写 recovery。
3. 所有诊断截断按 UTF-8 byte 上限执行，4096 个多字节字符不会突破 `presentationDiagnosticBytes`；reserve/update/complete 使用同一 bounded helper，补边界测试。
4. Inbox core ack validator 使用 canonical `messageAckBytes` 的同值（当前批准值 256）并补边界测试；不修改 schema/generated 文件，若发现 canonical 不一致先停止并在报告中说明。
5. `InboxService.send` 与 `ControlInboxHandler.message.send` 将 `AbortSignal` 传入唯一 owner 的 `SpaceService.sendInbox`，保留 admitted writer 的取消/晚到写入 effect unknown 语义；补 handler/service/owner 取消回归，不创建 queue/writer。
6. 运行受影响 Vitest、architecture、ESLint、`tsc --skipLibCheck` 与适用生成检查，报告真实退出码、未验证项及源停写时间。不得宣称 UI、真实 Obsidian/Provider/OS IME/五平台 E2E 或独立复核已通过。

## Return
一次性写本目录 `REPORT.md`，使用协调回报模板的“聚焦交接”“产物与验证”“问题与下一步”三节，Status 只能为 completed/blocked/failed/cancelled；completed 只表示候选交回 Lead 接收，不推进 T10 状态。报告前运行 `validate-dispatch.mjs --stage return` 并保存真实回执；源停写后通过原生通道返回 `codex:/root`，不得递归派遣。
