---
schema_version: 2
session: "20261025T043239Z"
task: "141-memory-physical-delivery"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-04
---

# 验证实际记忆删除与物理 stdio 投递交错

## Goal

由 native:/root/foundation_api_repair 接续其已完成 140 的 foundation/stdio 测试职责，补一项真实消费者验证：实际 MemoryStore 已返回正文、stdio 尚未物理写出期间发生 public Forget，原 Events/Grant/Memory 当前资格在 dequeue gate 拒绝过期正文；保留未删除正例。此任务不是新产品范围，也不重做已过组件与 CLI。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot；branch NAMEWTA/bot；HEAD 33c21e098ef3188cbab5a09f3e0a01fadb787715；Map37/Goal36/LOG125。原完整 28 票/55 AC、Agent Team 与代码总验收授权持续；真实模型、Obsidian、目标 OS 操作由用户后验，无提交/推送/发布/归档。无再委派。

按现有 Map → dev/testing → T04/T14 和 I 方法继续。140 REPORT 已由 Root 全读，24 源/32 工件和最终238输入核验，Root return0；evidence/140-lead-return.json。126 两批8top/12sub实际全绿并归还 Go 窗；126/138只写交接报告，全部生产源停写。Root 默认CLI管理和三协议真实SDK/localhost/SQLite维护与次次召回 E2E 已绿，见 evidence/T-14-logs/lead-memory-management-r1-accepted.json、lead-memory-model-r2-accepted.json；不冒称真实 Provider 验收。

现有 tests/contract/foundation/memory_delivery_test.go 的 TestStdioMemoryAndContextProofsDoNotCollapseIntoRunOrMessage 仅验证 Kind+ID 联集，替换了 Memory 与 Events 两端，不能证明真实数据库当前资格。保留它的有效职责，新增实际消费者；不修改它来伪造旧证据。

## Workspace and Scope

仅可新增 native/huhubot/tests/contract/foundation/memory_physical_delivery_test.go 与自己的141 REPORT/logs/manifest。实际 Core、Memory、Events、grants、stdio、API、SQL、TS、锁、生成器以及其他测试全部只读。缺生产接缝或观察到有效产品失败，立即保留反例并向 Root 报具体路径/owner，不扩大写集。原140已完成的 TASK/REPORT/manifest 保持原字节。

## Acceptance

1. 使用真实默认 Core/SQLite、真实 Memory 管理 API 和真实 stdio.Server（net.Pipe 可以作为实际可控传输）。需要 context 时经原 StartRun/Executor/受控 Engine 生成真实 sealed context，不手工捏造执行表、proof、Memory/Grant 结果。
2. 可以包装真实 EventsAPI.WithDelivery 以提供显式入队/写前 barrier，释放后必须委托原真实 EventsAPI.WithDelivery；不能以假拒绝回调、Memory fake 或直接私有函数替代 SQL 当前资格。证明 barrier 时旧响应已经包含受保护正文，再通过同 Core 的 public Forget 改变真实资格，随后释放实际 gate。
3. 正例返回实际 item/context 正文；负例不写出已遗忘正文，结果为真实安全拒绝或原合同允许的安全重锚行为。至少覆盖 memory_revision 与 context_entry 两类正文来源，并确认真实 Kind+ID subjects；同一 batch 可组合。保留当前权限/250ms原合同，不人为放宽超时或等待来掩盖失败。取消与退出全部有实际 ACK/Wait，不留下 Server/Core/DB/producer。
4. 此任务已授唯一 Go 窗用于自己精确测试：先 go1.26.10 version，固定真实编译/embed 输入和模式，再运行单目标及必要子例。原始首次失败、修正理由、exit/Wait、前后漂移真实记录；不要全仓 normal/race/vet/生成。实际消费者正常通过后立即归窗并停写，Root负责共同回归/必要race与独立审查。

## Return

先原生 ACK，尽快完成有意义的消费证据。完成后正式 REPORT 在首h2前含 Session: 20261025T043239Z、Task: 141-memory-physical-delivery、Status: completed；用聚焦交接/产物与验证/问题与下一步交事实、命令/结果/Wait/来源SHA/未验边界。亲自 validate-dispatch return actual0，再原生 MESSAGE+FINAL。Root核验后签T14，不在本报告宣称整票或整体Goal完成。
