---
schema_version: 2
session: "20261025T043239Z"
task: "129-memory-runtime-integration"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-03
---

# 记忆接入唯一执行、恢复与装配路径

## Goal

原owner native:/root/foundation_go 完成T01/T02/T03/T06/T16的115/123消费者。126拥有Memory Store/014；128拥有当前权限/预算；130拥有共同Engine。保持真实生产唯一writer与原生命周期。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot；branch NAMEWTA/bot；HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715。Map33/Goal32/LOG120，evidence/T-14-logs/memory-runtime-map33.md。完整28票55AC、Agent Team、代码层总验收授权持续。真实Provider/Obsidian/目标OS由用户后验；不索凭证、不提交推送发布归档、不再委派。

按Map→dev→所属Ticket→Goal与I真实消费者/TDD/风险规则。115 interface-contract.md SHA406bdd596fd3bd93702c487ab7e996b8be78d9702be584cc3b3e46f9d3acdfc4与123 short-term-contract.md SHA68333f6840ff76a67b5c8fc5ccee67fb2da95d7622e6e9f3fe968fbff07e9d7b全文已接纳，123 Plan/Seal替代115 Prepare，其余沿115。125当前API候选还在收口，以Root接纳最终源为实际输入，不自行更改公共合同。

125实际交回并获Root授窗后开始。先与126给出Memory构造/API/生命周期、usage同Tx组合和RecoveryWatermark实际接缝；不得为消除编译错误装空成功实现。126第一条默认Core公共管理用例的真实红→绿需要你注册014与装配，协调同一次源码窗口，不让其手工测试DDL冒称默认成功。

## Workspace and Scope

均以native/huhubot为根，仅实际需要的路径：
- internal/bootstrap/core.go；internal/adapters/outbound/sqlite/migrations/embed.go；internal/adapters/inbound/stdio/server.go；contracts/hap/v0.1/methods.json仅六方法真实装配后implemented标志及其生成methods_generated.go，不改公共形状/旧golden。
- internal/application/execution/executor/{ports,executor}.go；internal/adapters/outbound/sqlite/execution/{store,executor,recovery,maintenance,context,children,groups}.go。
- internal/adapters/outbound/sqlite/recovery/{store,snapshot,commands}.go；internal/application/tooling/broker/recovery.go只传真实Memory/ShortTerm到Inspector。
- internal/adapters/outbound/sqlite/assistant/store.go仅实际必需配置pin/usage组合，不改凭证Provider；优先复用现PinTask/ReadTask/ReleaseTask。
- tests/contract/foundation/**、chat/**、recovery/**、approval/**中本次接缝必要行为测试；assistant/**仅新记忆使用/删除预检控制，原其他测试只读。
- 自己目录REPORT/logs/manifest，TASK/正式Evidence/Map/Goal只读。

Memory三层/014正文、grants/usage/collaboration/groups业务、common/driver、锁、其他SQL、TS产品/主产物只读。公共API如需增加真实窄hook先向Root报精确需求，不绕125稳定合同。来源决定/Store内存状态不复制到Core。

## Acceptance

1. schema现9，接受126实际014后唯一注册10；旧SQL保持。默认Core六API实际可用，T15两个仍false；Memory StopAdmission同步闭门并等待真实Done再关DB/Profile，原已Dispatch结算不中断，失败装配资源实际排空。
2. 新普通execution Run写context_policy_version=extractive-v1，旧Run空值保持legacy、orchestration不建模型manifest；维护只Memory不ShortTerm。既有claim inbox/ancestry保留。旧Repository测试走原MarkRunning，真实Store同一markRunningInTx。
3. 普通原显式Host PrepareContext仍事务外，Memory.PlanInTx短Tx→关闭→已注入ContextAccess.AuthorizeAdmission完整Access→Seal与MarkRunning同Tx。Seal不能添来源，最多一次有界重规划；不能为历史Host授权再次注入其全文。真正读取者验证原Hash/spans，原Intent一次。Run.ContextUsage从已封manifest投影，不拿Engine自报当事实。
4. 同Finalize在实际已接受正文后RecordOutput/Completion同Tx；maintenance自身/纯orchestration无循环outbox，用户原文不绑整Run依赖。真实维护Candidates仅同job/claim/配置/代/权限通过后Commit；ordinary带Candidates或maintenance带Text明确INVALID_ENGINE_RESULT。未知SQL整Tx回滚，有限业务失效body-free终结，不吞全部错误。
5. 同Claim一页≤32/keyset且每轮最多新建一维护根；先交互/审批/父工作，Profile最多一个可运行或producer未排空维护，占同16池。NewMaintenance只jobID，实际ReadAdmission、当前PinTask独立snapshot/root/thread、model admission、无parent/Delegation、不占Session.active_run_id；BindRun同Tx。原pin唯一release，不新worker/自发HTTP/无限retry。
6. T16同Tx读真实ReadInput/ReadContext，缺新manifest不是legacy；本树MemoryRecovery水位与两短Tx/纯Inspector共用，原Run/job/claim/账户/配置恢复；无CP已发HTTPblocked，unknown不退款。T06把Memory/ShortTerm原样转纯Inspector。Agent SnapshotUsageInTx组合实际项/job/candidate与revision，同Tx无嵌套，装配前不能假清Unassembled。
7. stdio新subject保持Kind+ID全部proof合并、800/250ms/SQL关闭后物理写；不能让memory/context落Run分支或首份nil吞后正文。128是唯一当前事实/fence消费者。
8. 先外部可观察缺失行为红，再相同实际组件绿；默认Core真实SQLite、旧legacy、跨prepare撤权、关闭/恢复竞态按风险定向。由Root协调唯一产品检查窗口，所有相关writer停写后Go1.26.10/GOWORK off/GOEXPERIMENT空/GOFLAGS=-mod=readonly，normal CGO0/race CGO1，不tidy；不因共享TS未完成省略最终T27 lint/build。

## Return

先原生ACK。尚有跨owner依赖可交具体签名/缺口后结束只读回合，不写completed REPORT；Root followup续同未完成TASK。最终REPORT首h2前Session/Task/Status、聚焦交接/产物与验证/问题与下一步，精确源/manifest、真实红绿/每命令actual exit与Wait/未验边界。亲自validate-dispatch return0后MESSAGE+FINAL停写；Root固定源代码E2E和独立双轴才签共同门。
