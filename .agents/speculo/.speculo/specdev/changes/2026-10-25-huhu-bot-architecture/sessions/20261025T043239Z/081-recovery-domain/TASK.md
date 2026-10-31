---
schema_version: 2
session: "20261025T043239Z"
task: "081-recovery-domain"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-16
---

# 调用树资格、取消与持久恢复用例

## Goal
原 /root/credential_provider 实现T16新业务并维护T11/T12实际消费者。Root已接纳079完整候选代码门；本TASK按正式窗口经Root原生派遣后开始实施。沿gpt-6.1-sol/xhigh偏好，不再委派。

## Inputs
repo /home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715。Map20/Goal19；079代码门已接纳。AGENTS发现→当前Map→dev→T16及原维护票/I。完整读066/076静态准备、073/074/075最终群合同、077失败、078修复及079复审与Root代码门、evidence/T-16-logs/recovery-window-map20.md；回读当前源再设计。Spec §4/7–9及ADR007–011/019为行为权威。真实模型/宿主/目标OS用户后验。

## Workspace and Scope
T16新application/execution/{cancel,recovery}/**、domain/execution/recovery/**、sqlite/recovery/**、migrations/016-recovery.sql及tests/contract/recovery/**。原T11 application/collaboration/delegate/**、sqlite/collaboration/**、tests/contract/delegation/**；原T12 application/collaboration/{messages,scheduler,finalize}/**、application/execution/usage/**、sqlite/usage/**、tests/contract/collaboration-policy/**。Go路径在native/huhubot/internal或tests下。自有REPORT/log可写。

T01公共合同/配置CP/执行器/生命周期及T06原接缝由foundation_go，TS由foundation_client；T04 Go/T05/T13当前资格谓词只读复用，旧SQL/凭证/T07/依赖与产物/正式状态只读。需要新增原路径须真实最小请求，不能因本作者过去写过就扩大本窗口。016正文你唯一写入，T01唯一注册；不得复制任务完成库或另一Executor。

先与080冻结树水位/CAS、资格/阶段、事务外核查与全部Claim/Dispatch消费合同；按正式补充使取消屏障进入真实祖先关系、用户群边/临时子任务和所有预算/问答/子结果消费者。恢复原身份和原账本，不回滚已送结果/usage、不清取消代。纯编排root与真实模型Run分开，完整Group贡献闭包和来源资格按当前数据库读取。安全核查只发布资格，用户点击再次核验且同命令幂等。

## Acceptance
真实Facade/SQLite/同Executor，以及与082合作的生产TS/HAP消费者，覆盖取消与delegate/approve/Dispatch竞争、两树隔离、accepted/pending审批/children正常路径、同Run点击恢复/双击/回包丢失、已完成结果不重投、坏CP/撤权/成员重加/unknown/旧资格、关闭时已dispatch拒停producer。016真实旧完整DB+CP迁移与故障回滚；保留原事件/权限/性能断言。所有barrier可释放、进程实际Wait，重检查唯一窗口由Root分配。场景清单不限制新发现。

## Return
REPORT准确Session/Task/Status、精确自有/shared SHA、实际入口及原始命令/exit/Wait/红绿、复用边界和未运行项；亲自return0后真实MESSAGE+FINAL，停写。Root独立E2E/build及双轴审查另行，不能自称整票/Goal已完成。


当前联合窗口 SHA256 `3befb9dca2031f81a4e3a0e02577cc80115955d2ef8ee6fd191faa6bedbdca63`；前置079 Input-SHA256 `72a351ff35de4f24dfc5f459e92fb288c4d52207eadde7243591f14cad8571a7`、REPORT SHA256 `d61215836a08969b7d7d8162845bcb7e6126ca2df16326099a436a599691cd1b`。本TASK冻结后由Root原生followup_task实际派遣，不以文件存在当已开工。
