---
schema_version: 2
session: "20261025T043239Z"
task: "101-recovery-intent-foundation"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-01
---

# 原owner内部恢复Intent透传

## Goal

关闭F-098-01的可信原请求供给缺口，原同Tx数据库事实到纯Inspector，不造新公共合同。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715。Map24/Goal23，evidence/T-08-logs/chat-repair-map24.md；098完整REPORT及两真实红探针与日志。沿已读SpecDev I/dev/testing/risk规则复用；新原生派遣才开工。原28票55AC/Agent Team授权持续，用户最新明确代码开发和本地验收、真实模型/Obsidian/目标OS自行验收。无提交推送发布归档。

## Workspace and Scope

原owner native:/root/foundation_go。仅internal/application/api/recovery.go（T01两内部Inspection结构加Intent string）、internal/adapters/outbound/sqlite/execution/recovery.go（T03同一既有SELECT读取intent）、internal/application/tooling/broker/recovery.go（T06透传q.Intent）和新增tests/contract/foundation/recovery_intent_test.go。路径均前缀native/huhubot/。无需改sqlite/recovery/snapshot.go、public Run、HAP或bootstrap，其他源码只读。请先以这三个最小编辑完成结构透传，告知100和Root稳定SHA后再写自有精确测试。

类型接缝稳定前不执行Go产品命令，两方各自改动结束通知Root冻结；必须等待Root唯一Go检查窗口。固定GOTOOLCHAIN=go1.26.10、GOFLAGS=-mod=readonly、GOWORK=off、GOEXPERIMENT为空，race明确CGO1。无新依赖/迁移/HAP字段，其他源码只读。只写本任务REPORT/logs，不写Map/Ticket/Evidence正式状态。

## Acceptance

实际Repository→Broker→捕获Inspector的合法恢复路径能观察原受理Intent，同一原Run/Config/Position保持；不得从CP复制Intent。测试通过真实受理/Checkpoint发布/恢复资格消费者，不用SQL改状态伪造可恢复事实。其余现有legacy/fake兼容不变。100负责Engine否定控制，双方原owner测试都交Root统一安排一次最终Go窗口；完成编辑先通知，不自行跑Go。

保留实际输入/SHA/命令/原始log/exit/Wait、正反控制与失败分类；98原红可直接复用，无必要不再制造同输入红。检查全过程不得遗留Core/Engine/SDK/HTTP/settlement/子进程；不要不必要全量重跑旧大队列。若另需路径先提精确最小请求，不越权。

## Return

REPORT首h2前Session: 20261025T043239Z、Task: 101-recovery-intent-foundation、Status。记录dev真实调用与本次风险验证，精确自有文件SHA/diff、只读接缝摘要及artifact manifest。亲自validate-dispatch return0后原生MESSAGE+FINAL并停写；Root全文回读再更新正式状态，局部候选不冒充全票或28票完成。未运行现场检查user-owned/not-run。
