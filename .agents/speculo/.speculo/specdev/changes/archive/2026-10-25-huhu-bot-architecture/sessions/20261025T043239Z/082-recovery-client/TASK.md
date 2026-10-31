---
schema_version: 2
session: "20261025T043239Z"
task: "082-recovery-client"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-16
---

# 原Run恢复命令与客户端生命周期

## Goal
原 /root/foundation_client 实现T16真实TS恢复消费者及T01/T04必要接缝。Root已接纳079完整候选代码门；本TASK按正式窗口经Root原生派遣后开始实施。沿gpt-6.1-sol/xhigh偏好，不再委派。

## Inputs
repo /home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715。Map20/Goal19；079代码门已接纳。AGENTS发现→Map→dev→T16/T01/T04/I。完整读自己的075/076及066当前接缝、073/074/077/078和后续复审最终报告、Root代码门和evidence/T-16-logs/recovery-window-map20.md。实际API/schema需080先冻结后消费，不将预留runs.resume代理当可用服务。

## Workspace and Scope
T16新src/modules/huhubot/services/recovery/**；原T01 core/protocol/{connection,codec,method-validation}.ts及相邻测试、platform/desktop/transport/managed.ts及测试；原T04 services/events/event-client.ts及测试。上述路径都在src/modules/huhubot下。自有REPORT/log可写；api.ts/所有schema只读，由080唯一维护生成。T13 GroupClient/mentions、T07 Host、T05 sources、凭证实现、T20 module/runtime、UI/样式、产物和正式状态不写。更多接线需真实路径请求，不绕开owner。

先按076事实等待唯一资格查询/恢复代/CAS/error与关闭接口冻结。新增恢复controller直接消费真实BotClient；hello capability未启用不得发业务。同次用户动作保留原commandId/key/RunID/expectedRevision/recoveryGeneration，双击共享结果，uncertain不自动换key/StartRun/假成功。与081接真实TS→Go集成，不能仅以mock请求数通过。

恢复成功只使目标Run重新按当前权限重锚；普通tail状态不充当CAS，原group完整tuple、更高revision扩充、session变更全未公开缓存失效与已公开History保留不退化。只读复用现有GroupClient，若必要原T13集成先报Root。页面dispose不cancel/kill；managed close需区分受理shutdown、本地connection关闭、真实child exited、外部Host Promise排空。T20后续组合这些原语，本票不新增第二manager或模块入口。

## Acceptance
真实消费者验证capability门、缺CAS/旧资格/旧epoch、双击/原命令retry/响应丢失、同Run重锚/撤权旧页拒绝、断连不自动复播，以及真实child close/后备终止边界。当前075成功180项按影响选择复用/回归，不改旧断言抬门限。用唯一schema全正负样本/双tsc/适用lint/架构，Root最终build；测试重窗口由Root分配，所有子进程Wait。真实Provider/Obsidian/OS用户后验。

## Return
最终REPORT首h2前Session/Task/Status准确，完整自有SHA、实际冻结API摘要、命令/exit/Wait/原始红绿和边界；亲自return0后native MESSAGE+FINAL，所有作者进程结束并停写。不得将Port/mocks当服务端验证或宣布全票/Goal完成。


当前联合窗口 SHA256 `3befb9dca2031f81a4e3a0e02577cc80115955d2ef8ee6fd191faa6bedbdca63`；前置079 Input-SHA256 `72a351ff35de4f24dfc5f459e92fb288c4d52207eadde7243591f14cad8571a7`、REPORT SHA256 `d61215836a08969b7d7d8162845bcb7e6126ca2df16326099a436a599691cd1b`。本TASK冻结后由Root原生followup_task实际派遣，不以文件存在当已开工。
