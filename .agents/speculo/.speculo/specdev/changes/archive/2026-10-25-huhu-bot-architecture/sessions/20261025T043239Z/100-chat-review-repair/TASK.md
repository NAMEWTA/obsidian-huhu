---
schema_version: 2
session: "20261025T043239Z"
task: "100-chat-review-repair"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-08
---

# T08两项审查缺陷修复

## Goal

关闭F-098-01/F-098-02，保留原完整Chat产品行为和兼容身份。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715。Map24/Goal23，evidence/T-08-logs/chat-repair-map24.md；098完整REPORT及两真实红探针与日志。沿已读SpecDev I/dev/testing/risk规则复用；新原生派遣才开工。原28票55AC/Agent Team授权持续，用户最新明确代码开发和本地验收、真实模型/Obsidian/目标OS自行验收。无提交推送发布归档。

## Workspace and Scope

原owner native:/root/engine_adapter。仅common/{checkpoint,engine,tools}.go、chat/{body,driver}.go及tests/contract/engine/chat/**。101负责api.RecoveryInspection与CheckpointInspection统一加Intent string、SQLite读取既有受理Intent并Broker透传，先协商确认消费；你不写其文件。

类型接缝稳定前不执行Go产品命令，两方各自改动结束通知Root冻结；必须等待Root唯一Go检查窗口。固定GOTOOLCHAIN=go1.26.10、GOFLAGS=-mod=readonly、GOWORK=off、GOEXPERIMENT为空，race明确CGO1。无新依赖/迁移/HAP字段，其他源码只读。只写本任务REPORT/logs，不写Map/Ticket/Evidence正式状态。

## Acceptance

同一纯common校验在Inspector/Resume把最后初始user正文与可信Intent精确比较，坏CP在Resolve/HTTP/工具前安全拒绝。正常审批/原CallID/合法历史改变保持。原始解压后SSE在SDK前验证UTF8，支持合法中文跨任意Read及EOF残行；两tool batch后项非法=>零Invoke/effect/approval、Run安全失败、attempt unknown结算/producer结束。safeerror不带Provider正文。补精确per-byte Reader、非法wire、实际生产链和原审批恢复控制；保持Chat v1/EngineVersion/ToolDigest，不扩大完整history真实性承诺。检查由Root在101稳定后授窗。

保留实际输入/SHA/命令/原始log/exit/Wait、正反控制与失败分类；98原红可直接复用，无必要不再制造同输入红。检查全过程不得遗留Core/Engine/SDK/HTTP/settlement/子进程；不要不必要全量重跑旧大队列。若另需路径先提精确最小请求，不越权。

## Return

REPORT首h2前Session: 20261025T043239Z、Task: 100-chat-review-repair、Status。记录dev真实调用与本次风险验证，精确自有文件SHA/diff、只读接缝摘要及artifact manifest。亲自validate-dispatch return0后原生MESSAGE+FINAL并停写；Root全文回读再更新正式状态，局部候选不冒充全票或28票完成。未运行现场检查user-owned/not-run。
