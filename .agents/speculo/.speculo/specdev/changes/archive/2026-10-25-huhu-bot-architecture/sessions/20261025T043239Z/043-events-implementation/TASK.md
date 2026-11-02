---
schema_version: 2
session: "20261025T043239Z"
task: "043-events-implementation"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-04
---

# Go持久事件与当前权限投递

## Goal
交付本票和精确原owner维护的完整可审代码，保持28票与55AC全部范围。

## Inputs
工作区 /home/wta/orca/workspaces/obsidian-huhu/bot、branch NAMEWTA/bot、base33c21e098ef3188cbab5a09f3e0a01fadb787715。仅 Root 实际 followup_task 后启动；TASK 的存在不表示已派遣。实际启动须 Map11/Goal10 和 LOG066 的 T01/T02/T03/T05 代码门。用户 LOG051 明确全部28票/55AC代码实现，真实模型/Obsidian/目标OS现场由用户后验，不索取凭证或新增审批。复用原native身份与gpt-6.1-sol/xhigh偏好，不冒称 runtime attestation。

完整读取当前 Map→dev适用架构/测试/许可/风险→本票、Spec/ARCHITECTURE/ADR相关部分、034-events-approval-preflight完整REPORT/observations；不重复无影响材料。陌生机制先复用固定许可明确参考。034仅研究，建议需落实真实消费者，不能把其未跑矩阵标pass。依赖当前门和历史失败均保留，不能重跑旧默认D-Bus探针或触碰真实keyring。正式Ticket/Map/Goal/Evidence由Root写；仅精确授权产品写集、自有REPORT/日志/临时Profile，不改他人报告、不再委派、不提交/推送/发布。

## Workspace and Scope
/root/credential_provider 持T04 Go自有 application/execution/events/**、sqlite/events/**、tests/contract/events/**；兼原T05 owner仅 application/access/context/**、application/access/grants/**、sqlite/grants/**与适用tests/contract/access/**的当前权限/到期/撤权投递fence。旧005 SQL、Host sources/read实现、凭证、go.mod/sum/公共API/schema/stdio/bootstrap不写。

与042/044先协调唯一有界tail/快照/错误和delivery fence合同，042冻结API/schema/路由/stdio/bootstrap后消费，不能复制DTO或自行改共享类型。T03 sqlite/execution helper由042原owner维护，单SQL连接不嵌套调用AuthorizeRead造成死锁。需要额外迁移必须以真实需求说明，不创建空004；默认复用execution_events与Run.event_seq。

## Acceptance
实现DB-first尾读、同事务snapshotSeq+snapshot、未来/过期cursor明确错误、有限页字节和事件数，nextSeq只指已交付事实。每个Run独立BigInt seq；内存wake仅优化，有界重复tail补读交界不丢事件，最终态后核查事件仍可见。压缩策略仅处理可从持久状态准确重建的前缀；不能删除active正文后伪造快照。

所有list/tail/snapshot/currentdelivery按有效派生来源和当前read资格检查，与T05保持会话/原授权scope/recipient边界。队列后撤权、到期无clock变化、等待中撤权均需真正停止正文并给客户端非正文失效/错误；与042原stdio owner实现writer dequeue fence，保证撤权提交与发送线性顺序且SQL事务不包pipe等待，permit有时限/取消/清理。不要只最终UI隐藏或仅订阅时检查。

公共Facade+真实SQLite及实际TS-Go联调覆盖补读新增/丢wake、snapshot一致、duplicate/gap/future/expiredcursor、撤权排队/到期、慢消费者字节/队列/超时、关闭不取消Run、重启继续。新增/维护全部测试落本写集，复用已有安全私有fixtures不访问真实服务；关键并发race、适用Go test/vet/架构。与044共享测试协议但不同时写同文件。

## Return
REPORT首个h2前 Session: 20261025T043239Z、Task: 043-events-implementation、Status: completed；h2聚焦交接、产物与验证、问题与下一步。报告实际作者/文件SHA/写集/共享合同摘要、完整命令与退出码、红绿故障证据及未跑边界。所有writer停写、子进程Wait/资源清理、return校验0后真实MESSAGE/FINAL交回。候选不是正式done；Root独立回放和未参与实现者双轴审查随后进行。需要超出写集时先发准确路径/理由，继续独立已授权部分。
