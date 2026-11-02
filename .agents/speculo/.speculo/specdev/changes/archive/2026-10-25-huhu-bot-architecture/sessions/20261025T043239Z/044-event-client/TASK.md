---
schema_version: 2
session: "20261025T043239Z"
task: "044-event-client"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-04
---

# TS事件投影与恢复消费者

## Goal
交付本票和精确原owner维护的完整可审代码，保持28票与55AC全部范围。

## Inputs
工作区 /home/wta/orca/workspaces/obsidian-huhu/bot、branch NAMEWTA/bot、base33c21e098ef3188cbab5a09f3e0a01fadb787715。仅 Root 实际 followup_task 后启动；TASK 的存在不表示已派遣。实际启动须现行 Map12/Goal11（继承 Map11/Goal10 窗口）和 LOG066 的 T01/T02/T03/T05 代码门。用户 LOG051 明确全部28票/55AC代码实现，真实模型/Obsidian/目标OS现场由用户后验，不索取凭证或新增审批。复用原native身份与gpt-6.1-sol/xhigh偏好，不冒称 runtime attestation。

完整读取当前 Map→dev适用架构/测试/许可/风险→本票、Spec/ARCHITECTURE/ADR相关部分、034-events-approval-preflight完整REPORT/observations；不重复无影响材料。陌生机制先复用固定许可明确参考。034仅研究，建议需落实真实消费者，不能把其未跑矩阵标pass。依赖当前门和历史失败均保留，不能重跑旧默认D-Bus探针或触碰真实keyring。正式Ticket/Map/Goal/Evidence由Root写；仅精确授权产品写集、自有REPORT/日志/临时Profile，不改他人报告、不再委派、不提交/推送/发布。

## Workspace and Scope
/root/foundation_client 持T04 TS自有 src/modules/huhubot/core/events/**、services/events/**；兼原T01 TS owner只core/protocol/{codec.ts,codec.test.ts,connection.ts,connection.test.ts,method-validation.ts,method-validation.test.ts}以及需要的platform/desktop/transport/runner.test.ts维护。公共api.ts/唯一schema由042写；不改Host sources/read、credentials、UI或根工程。实际TS-Go测试harness新增于本票自有core/events或services/events测试目录，Go测试由043写，避免同文件writer。

与042/043在共享API冻结前先读合同并发送精确需求；冻结后实现，不能发明平行DTO。034默认bounded重复tail请求，push非必需，不为轮询增加通知总线。严格typed cursor错误详情保持安全schema边界与固定总数，不能放宽未知字段校验。

## Acceptance
实现可供T21真实BotClient消费的事件服务和纯reducer：每Run独立seq，重复去重、洞补读、乱序不覆盖、snapshotSeq绑定恢复，future/expiredcursor处理，terminal后仍接收核查更新。慢消费者/失效/断线重连、页detach/dispose/lease变化清待发/缓存，迟到批次不可复活撤权正文。权限失效删除本地正文投影同时保留允许的非正文状态，不把用户笔记或服务器事实删除。

端到端使用真实HapConnection→Go生产bootstrap/stdio/Facade/SQLite（只外部Host/Engine受控），和043协作覆盖正常续读、快照、排队撤权/到期、错误严格编解码、大seq跨Run、断开不取消Run。测试不可只mirror reducer实现；适用vitest/双tsc/局部lint/架构，Root最后全插件build/lint。真实Obsidian与UI装配属后续，保留明确factory/消费Port并证明服务实际调用链。

## Return
REPORT首个h2前 Session: 20261025T043239Z、Task: 044-event-client、Status: completed；h2聚焦交接、产物与验证、问题与下一步。报告实际作者/文件SHA/写集/共享合同摘要、完整命令与退出码、红绿故障证据及未跑边界。所有writer停写、子进程Wait/资源清理、return校验0后真实MESSAGE/FINAL交回。候选不是正式done；Root独立回放和未参与实现者双轴审查随后进行。需要超出写集时先发准确路径/理由，继续独立已授权部分。


Map12/Goal11只追加042 Go三平台stdout适配，044写集保持；042/043已经实际开工并收敛delivery fence，公共事件API已落 api/events.go，实际消费前仍等042合同冻结消息。041只读研究已实际交回释放槽位，Root后续原生followup为本任务启动。
