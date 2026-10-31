---
schema_version: 2
session: "20261025T043239Z"
task: "080-recovery-core"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-16
---

# 恢复公共合同、CP检查与同一执行器生命周期

## Goal
原 /root/foundation_go 维护T01/T03/T06并接通T16。Root已接纳079完整候选代码门；本TASK按正式联合窗口经Root原生派遣后开始实施。沿既有gpt-6.1-sol/xhigh偏好，不再委派。

## Inputs
repo /home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715。Map20/Goal19；079代码门已接纳。AGENTS发现→当前Map→dev适用参考→T16/维护票→I及error/test-reliability。完整读066/076报告与接口、073/074/075/078最终交接及077失败/079复审、Root代码门和evidence/T-16-logs/recovery-window-map20.md。旧静态接口不是当前源权威。LOG051真实操作user-owned/not-run。

## Workspace and Scope
T01：application/api/**、protocol/hap/**、adapters/inbound/**、cmd/huhubot/**、bootstrap/core.go、sqlite/migrations/*.go、tests/contract/foundation/**、contracts/hap/v0.1/**、src/modules/huhubot/api.ts。T03：domain/execution/run/**、application/execution/{commands,executor}/**、application/conversation/direct/**、sqlite/{conversation,execution}/**、tests/contract/chat/**。T06：application/tooling/broker/**、application/access/approvals/**、sqlite/effects/**、adapters/outbound/blob/store/**、tests/contract/approval/**。Go路径在native/huhubot/internal或tests下。仅维护上述当前恢复接缝；自有TASK REPORT/log可写。

TS协议/transport由foundation_client；T16新业务/016正文和T11/T12由credential_provider。T02/T05/T07/T13、旧全部SQL、go.mod/go.sum、base/profile默认只读，需更多原owner路径先提交实际最小请求。无正式Evidence/Map/他人报告、产物、提交推送发布写权。

先与业务owner确定唯一恢复查询投影、必需CAS的runs.resume、资格水位、检查/领取屏障、恢复阶段、完整无claim CP检查与停止排空Port；不得提前把implemented标true。016只由业务owner写正文，你唯一注册。api.ts与生成schema保持同源，通知TS实际签名/摘要；不复制SDK DTO或让客户端传CP/自报核查结果。完整行为/资源/验证合同见正式联合补充。

## Acceptance
同一Executor真实公开消费者证明：启动核查不触发中断模型，点击后同Run/newclaim、原配置/线程/预算/效果身份；accepted和正常审批/问答按事实继续；坏CP/撤权/unknown/旧资格不自动派发。关闭超时保持DB/Profile锁和unknown，真实producer结束才释放；实际stdin/credential EOF/managed shutdown路径一致。保留群编排根、事件accepted seq1与当前完整贡献proof。适用普通/race/vet与唯一生成复验，重检查由Root分配，所有进程Wait。

## Return
REPORT首h2前Session/Task/Status，聚焦交接、精确自有SHA、冻结接口、实际命令/exit/Wait/红绿与未运行项。先亲自return0，再native MESSAGE+FINAL，作者停写。completed只为切片交回，不代替Root固定E2E/双轴门或全Goal。


当前联合窗口 SHA256 `3befb9dca2031f81a4e3a0e02577cc80115955d2ef8ee6fd191faa6bedbdca63`；前置079 Input-SHA256 `72a351ff35de4f24dfc5f459e92fb288c4d52207eadde7243591f14cad8571a7`、REPORT SHA256 `d61215836a08969b7d7d8162845bcb7e6126ca2df16326099a436a599691cd1b`。本TASK冻结后由Root原生followup_task实际派遣，不以文件存在当已开工。
