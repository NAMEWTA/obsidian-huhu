---
schema_version: 2
session: "20261025T043239Z"
task: "042-approval-implementation"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-06
---

# 审批、不可变检查点与正常恢复闭环

## Goal
交付本票和精确原owner维护的完整可审代码，保持28票与55AC全部范围。

## Inputs
工作区 /home/wta/orca/workspaces/obsidian-huhu/bot、branch NAMEWTA/bot、base33c21e098ef3188cbab5a09f3e0a01fadb787715。仅 Root 实际 followup_task 后启动；TASK 的存在不表示已派遣。实际启动须 Map11/Goal10 和 LOG066 的 T01/T02/T03/T05 代码门。用户 LOG051 明确全部28票/55AC代码实现，真实模型/Obsidian/目标OS现场由用户后验，不索取凭证或新增审批。复用原native身份与gpt-6.1-sol/xhigh偏好，不冒称 runtime attestation。

完整读取当前 Map→dev适用架构/测试/许可/风险→本票、Spec/ARCHITECTURE/ADR相关部分、034-events-approval-preflight完整REPORT/observations；不重复无影响材料。陌生机制先复用固定许可明确参考。034仅研究，建议需落实真实消费者，不能把其未跑矩阵标pass。依赖当前门和历史失败均保留，不能重跑旧默认D-Bus探针或触碰真实keyring。正式Ticket/Map/Goal/Evidence由Root写；仅精确授权产品写集、自有REPORT/日志/临时Profile，不改他人报告、不再委派、不提交/推送/发布。

## Workspace and Scope
/root/foundation_go 持 T06 原票全部写集，并兼原 T01 Go/公共合同 owner、原 T03 执行器 owner。T01仅 api/**、contracts/hap/v0.1/**及双端生成物、src/modules/huhubot/api.ts、protocol/hap/**、inbound/hap的相关路由/错误映射与新增events/approvals文件、inbound/stdio/server.go、bootstrap/core.go、migrations/embed.go及适用foundation测试。T03仅 application/execution/executor/**、sqlite/execution/**、domain/execution/run/state.go和相关chat测试。历史001/002/003/005 SQL不改，go.mod/sum不扩写；需要新依赖先说明实际必要性由原owner/Root接纳。

先与043/044通过真实消息收敛唯一 Events/Approvals/Tool/Checkpoint API，默认实现有界重复tail请求，不另建push框架。freeze明确API/schema/typed CURSOR_EXPIRED details/TS公共类型后通知consumer，schema最终生成与数量门一致。实现stdIO writer出队权限检查接缝时与043的当前读授权/撤权/到期fence协作；不得拿队列前的一次检查证明撤权后无正文。共享API/注册只有你写，其他人只消费。

## Acceptance
实现 T06 全部代码：可信运行上下文绑定Broker，稳定intent/effect身份，首个待审批关闭整个Run后续效果准入；受限CP bytes在Profile私有根不可覆盖发布，验证摘要/格式、fsync和在途/已引用GC保护；CP/Approval/Effect/Run/事件同一短事务发布，失败不呈现半张pending。纯Application无SDK/SQL/Obsidian类型；Eino在T08装配，当前fake Engine也必须经同一Broker/CP纯Port。拒绝bare checkpointRef冒充成功。006正文next DB Version5，只有你串行注册。

审批resolve绑定确切预览/目标/能力/参数/版本/expiry和用户Principal，幂等意图与command attempt分离。dispatch另一次短事务重验当前来源Grant/取消/目标及能力，事务外Host；read/send不是写批准，不新增全库write Grant。T07真实Host写入未实现仍用受控fake Host。真实持久取消屏障用于批准/取消竞争，T16后续扩展调用树恢复而非替本票补正常链路。

等待保留同一pin/Session且不占执行槽；批准/拒绝/过期产生持久continuation，由同一Executor实际Engine.Resume消费并最终原子释放pin/占用一次。取消不裸Resume；stale claim/迟到结果不能覆盖新事实；拒绝/过期没有效果派发。重启waiting_approval仍等用户，running中断不自动收费。把旧suspended→genericFinalize路径维护正确，别另造一套执行器。

从公共Facade/真实SQLite/受控Host及Engine证明AC025/028本票合同、两写工具闸门、发布各故障、同effect身份恢复、批准vs拒绝/过期/取消CAS、Grant或能力变更后0Host调用、pin/占用与CP GC；关键并发race，适用Go tests/vet/架构/schema/generator。源树冻结后再交候选，根全局build由Root窗口执行。

## Return
REPORT首个h2前 Session: 20261025T043239Z、Task: 042-approval-implementation、Status: completed；h2聚焦交接、产物与验证、问题与下一步。报告实际作者/文件SHA/写集/共享合同摘要、完整命令与退出码、红绿故障证据及未跑边界。所有writer停写、子进程Wait/资源清理、return校验0后真实MESSAGE/FINAL交回。候选不是正式done；Root独立回放和未参与实现者双轴审查随后进行。需要超出写集时先发准确路径/理由，继续独立已授权部分。


## 原owner精确追加窗口（Map12 / Goal11）

Root接收042真实stdout deadline不支持probe后，授权仅新增/维护native/huhubot/internal/adapters/inbound/stdio/output_unix.go、output_windows.go、output_other.go及既有server.go唯一接入；原foundation测试已在写集。保证真实IO停止才释放权限permit，有限时/expiry且不占SQL；实现选择自行收敛，测试真实慢管道，不能只race goroutine返回或持gate无限等。原inbound/**属T01，consumer只读，不改CLI/依赖/其他共享范围。实际派遣身份保持，TASK原文改动在此前完整任务之上补充，不冒称原摘要未变。


## 原owner精确追加窗口（Map13 / Goal12）

Root确认你的请求并授权原T03 native/huhubot/internal/application/conversation/direct/service.go及必要ports.go、原T01 native/huhubot/internal/adapters/inbound/hap/conversation.go。仅从过滤后可见HistoryPage.Access取得可信TaskID，MessagePage.DeliveryRunIDs为Go内部json忽略，传入现有writer gate；旧SQL与存储查询不改，api/**已有写权。与043协调history默认20/max100及HAP batch的guard计数边界（当前8可能不足），测试超过8个实际来源Run与其中一个撤权。既有具体任务和返回要求保持；正式文件由Root维护。


同一Map13窗口的内部合同收敛：042/043真实消息确认改用DeliverySubject{Kind:run|message,ID}；history只标记服务端可见message IDs，在043现有events Store同gate读取持久message来源和关联身份/精确scopes/grants。无新增路径或wire字段，无需原sqlite/conversation/store.go写权。最初TaskID/DeliveryRunIDs是候选实现建议，现由此精确逐消息方案替代；权限行为/固定800主体及有限总deadline不变。
