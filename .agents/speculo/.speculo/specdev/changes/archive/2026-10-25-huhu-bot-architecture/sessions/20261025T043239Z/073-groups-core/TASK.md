---
schema_version: 2
session: "20261025T043239Z"
task: "073-groups-core"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-13
---

# 群聊公共合同与同一执行器装配

## Goal
原 /root/foundation_go 在原owner范围维护T01/T02/T03，接通T13群聊。此文件仅准备；只有Root确认072候选3代码门、Map17/Goal16及实际followup_task后才开工。沿现有gpt-6.1-sol/xhigh偏好，不再委派。

## Inputs
工作区 /home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715。读AGENTS发现、Map17/Goal16、dev适用参考、T13及原T01/T02/T03维护、I。Spec/ARCH/ADR为产品权威；完整读取060 REPORT和interfaces-and-owners，已漂移旧观察须回读最终当前代码，不拿研究矩阵作通过证据。当前以068/069修复、070确认原产品问题关闭、071测试修复及072完整接纳后的真实共享合同为准；委派要求须保持到达Engine、模型工具白名单继续生效，可信用户批量边不借模型工具越权。LOG051仍仅代码交付，真实模型/Obsidian/目标OS用户后验，不索取凭证。

## Workspace and Scope
唯一自有：T01 application/api/**、protocol/hap/**、adapters/inbound/hap/**、bootstrap/core.go、sqlite/migrations/*.go、tests/contract/foundation/**、contracts/hap/v0.1/**、src/modules/huhubot/api.ts（Go路径均native/huhubot/internal或tests内）；T02 application/assistant/{ports,service}.go、sqlite/assistant/store.go、tests/contract/assistant/assistant_test.go；T03 domain/conversation/direct/**、domain/execution/run/**、application/conversation/direct/**、application/execution/executor/**、sqlite/conversation/**、sqlite/execution/**、tests/contract/chat/**。以正式Map/Ticket精确writable为准，额外stdio或新路径先提实际接缝由Root维护。自有TASK REPORT/log可写。
T13 group目录/013正文及原T04 Go/T05/T11/T12由credential_provider，T01 TS协议消费者/T04 TS/mentions由foundation_client；api.ts只由你生成。T06/T07/凭证实现/旧001/002/003/005/006/011/012 SQL只读；T27产物由Root最终build，不越权更改正式Evidence/Map/其他报告，不提交推送发布。

先与原业务owner冻结唯一API、Session/member历史范围、可信用户批量受理边、持久群绑定及共享Executor/public publisher窄Port和013形状，再通知TS消费者实际摘要。普通无@只调用协调者A；显式@B/C一个用户根只调用B/C，不能虚构A模型/claim/Grant或以A模型协作allowlist限制用户指令。A未配置模型、仅B/C有来源Grant时仍须合法零A调用；任何目标无效/停用/非成员/授权缺失则全体同Tx拒绝。区分编排根角色与真实Engine执行，Claim/配置读取/结果汇聚/预算都消费实际角色，不只跳过Engine却仍借A权限读正文。
根/子任务、工作线程、配置pin、限制快照、预算账户、Session占用、回执、用户消息同一既有UoW；不另建执行器。group成员incarnation/history授权沿所有派生任务保持，移除后防新准入/真实Dispatch/公共发布/物理正文发送，emptySource也不能跳过。组装原effects取消窄Port，T06不改时只复用；需改则先Root明确窗口。
当前068/069已要求带parent/task配置的实际委派Run具备可回读持久Delegation输入关系；群可信用户批量子任务须在唯一受理事务内形成对应事实或由双方明确等价的可信读取合同，不能仅创建孤立child Run而在Claim永久CONFLICT。纯编排根角色须显式区分，不能靠给旧执行器塞假的模型输入消除错误。

公共消息持久seq和每Run事件seq分离，按真实发布事务定序并以稳定child result身份去重；公共结果不能要求A再付费汇聚。保留用户已合法公开记录，撤销的未公开正文不迟到出现。协调者CAS与根受理争同一事务，waiting/blocked/interrupted仍占用根，不能默换协调者。T02真实SnapshotUsage需纳入群引用且维护usage clock；新成员历史明确none或同群有界消息范围，不能隐含开放全历史。

## Acceptance
真实公开API/SQLite/同Executor和生产TS-Go集成覆盖默认A/@B/@B,C、零A成本、整批原子失败、busy/幂等、公共seq乱序完成、成员移除/重加/另群同Bot不受影响、历史隔离/撤权物理fence与coordinator忙态。按实际影响跑普通/race/vet和严格schema生成一致性，保留既有100/800来源250ms、270 delta及其他原门，不抬阈值。重检查与业务owner/Root串行；所有进程Wait。Root在实际交回后做独立E2E、build/lint和独立双轴审查。

## Return
REPORT首h2前Session/Task/Status准确，列实际自有文件SHA、合同冻结、命令/exit及原始红绿、当前共享输入、复用范围和未运行真实操作。return0后真实MESSAGE+FINAL；作者停写/自有进程Wait，Root完整回读后接纳。不得自称T13整票或后续T16完成。
