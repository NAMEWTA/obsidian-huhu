---
schema_version: 2
session: "20261025T043239Z"
task: "027-access-implementation"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-05
---

# T-05 资料与接收方交集授权

## Goal
实现T05 Go来源/Grant/上下文过滤与Host读取桥接；不得用路径白名单、全库先读后过滤或更大权限Bot绕过明确附加与当前撤权。先与共享API owner及TS Host方冻结精确端口。

## Inputs
工作区 /home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，初始base33c21e098ef3188cbab5a09f3e0a01fadb787715。用户LOG-047/050/051授权完整28票代码与Agent Team，本轮代码层验收，真实模型/Obsidian/目标OS操作留user-owned；不得索密钥或重复实施批准。先读当前Map→dev/architecture/testing/licensing→当前Ticket→相关Spec/ARCH/ADR及I implementation-procedure/execution-preflight/TDD/风险参考。当前Map10/Goal9，LOG060依赖门已关闭，产品r2由033两轴pass，工程slice3由030两轴pass，Root当前全部校验0（evidence/T-02-logs/code-gate-r2.json）。本TASK仍以真实Lead followup_task为启动信号。依赖证据在evidence/T-01.md/T-02.md，实际当前快照以派遣消息为准；不能拿旧r3冒称新共享代码已通过。另完整回读031-chat-access-preflight/REPORT.md；参考evidence/chat-access-preflight.md与IMPLEMENTATION-REFERENCES.md固定来源/近两年活动/许可/采用差异；陌生点先查官方源码与维护/许可，必要时最小探针，不复制不明代码。

## Workspace and Scope
唯一Go写集为domain/access/grants、application/access/grants、application/access/context、adapters/outbound/hostbridge/read、sqlite/grants、005-grants.sql、tests/contract/access；本任务报告/日志可写。API/schema/router/protocol/Go锁/CLI/bootstrap/迁移注册只读，请求026原foundation_go维护；TS Sources/host-read由028负责，不跨写。原T02凭证adapter本任务不改。

真实持久Grant绑定workspace/resource scope/operations/recipient endpoint/agent/session/撤销状态与revision。默认只明确附加资料；folder/vault需要额外授权。每次来源读取、构造摘要/记忆输入、外发/子任务与结果投递的资格是父范围、接收Agent/模型endpoint、当前任务和撤销状态交集；不能仅校验创建时或只信传入sourceRefs。为后续领域提供有真实消费者的窄Port，不造通用权限框架。

SourceRef发送快照绑定workspace/originClientId/originViewId/hostConnectionId/hostLeaseEpoch/revision/hash；客户端草稿不能自封可信身份。Host由受管连接建租约，变更或离线立即使能力/旧缓存资格失效；Go没有Vault filesystem fallback。只在前置权限通过后调用Host read/search，再核对回执的快照身份及范围，避免校验前读取。origin/变化/撤权结果稳定且无私有正文泄漏。与026联动Session/Run公共入口当前权限Port，两个入站不能绕过共同业务；使用T02实际Bot/模型配置，不复制配置表。

005 SQL正文仍独占；真实SQLite版本由026连续分配（本阶段003→Version3，005→Version4），不自行跳user_version或造空004。不同fixture仅用各自独立临时Profile。新增read/search专用反向DTO与SourceSnapshot强身份/Grant接收方字段由026统一冻结，不能用写入HostReceipt承载正文。005 schema注册交026串行；读取/权限调整/派发竞争要有明确序列与失败封闭边界，不能把缓存当权威。公开DTO与方法仍原owner统一维护；实际Host能力只走既有双向连接。

## Acceptance
从真实Facade/HAP及SQLite验证明确附加2份且第三份零读取/零外发、两个客户端同一判断、同key/CAS、撤权/过期/接收endpoint或Bot变化、移除旧来源、跨workspace/伪造绝对路径/旧lease拒绝、Host掉线无Go文件访问。权限更大接收方也不能扩父范围；当前读取权限覆盖重连/分页消费者。以真实Go↔TS Host可控夹具验证帧和来源快照，实际Obsidian由用户后验。定向access/assistant/foundation/chat受影响回归、race/vet/架构；模拟Host不是现场验收通过。

## Return
不要改正式Ticket/Map/Goal/Evidence、别人的TASK/REPORT、根package/lock/build/notices/current文档；不提交/推送/发布/归档，不再委派。仅写准确生产/测试写集与本TASK的REPORT/原始日志/快照。REPORT首个h2前保留Session: 20261025T043239Z、Task: 027-access-implementation、Status: completed；h2为聚焦交接、产物与验证、问题与下一步。报告源码路径/hash、实际红绿/命令exit/观察/故障恢复/依赖变更、未运行项与剩余接缝；completed只是候选交回，不自行done。最后validate-dispatch --stage return，确认所有测试子进程退出、production writer停写，再通知root。超出写集先提交精确路径和理由，由Lead处理，不能另造API/表/进程绕过owner。

## 当前依赖接纳与协作顺序

LOG060接纳产品r2 SHA886b568a11a1cbe8209412e02b1ee00bcf09b68cdbc2dc5c50f0c8a75b21387b与工程slice3 SHA29f9eedca116923c1ceb15a7855944ae9fa4bc3c0a221b63414996e5b35c9a18；原候选完整保存，LOG061为新维护阶段。026唯一共享Go/API/schema/注册writer；027/028先与026交换精确字段/方法请求，冻结后再写依赖新DTO的消费者，独立研究/纯策略和本任务测试准备可并行。不可重新运行历史默认dbus --session探针，不访问真实keyring/Vault/模型；若确需T02回归仅使用当前禁止service activation的安全fixture。每个测试进程退出并Wait后再交回；不机械重跑未变检查。

当前补充Map10/Goal9（LOG062）只给028原T01 TS owner method-validation.ts固定方法形状总数维护；本任务写集与已协商接口不受影响。026冻结schema后告知028精确总数，一处同步，不并发改TS validator。
