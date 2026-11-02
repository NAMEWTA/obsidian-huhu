---
schema_version: 2
session: "20261025T043239Z"
task: "146-resume-inbox-runtime"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-03
---

# 恢复同一任务时保留可信补充消息

## Goal

原T01/T03 owner native:/root/foundation_api_repair 修复真实waiting补充消息在Prepare之后遗漏的问题。维持初始ShortTerm与CP前缀，建立可持久重放、按真实身份去重的内部恢复包，由147原Engine owner消费。不是把旧Input.Messages重新开放。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot；branch NAMEWTA/bot；HEAD33c21e098ef3188cbab5a09f3e0a01fadb787715；Map39/Goal38/LOG127。用户已授权全部28票55AC、Agent Team和代码层总验收，真实Provider/Obsidian/目标OS用户后验，无凭证问题，无提交推送发布归档，无再委派。按Map→dev/testing→T01/T03/T12/T14/T16的实际接缝，沿用123/130已锁定short-term合同与139组件兼容证据。

Root原红evidence/T-14-logs/lead-memory-regression-r1.json和145原日志；145事实：usage/messages读取to_run_id全部消息，没有已投递标志，ConsumePrivate只是幂等合并effective/lineage；execution/context.go无条件Messages=nil；一般waiting补充不在Children。原两个目标为TestTaskReplySourceBoundaryAndWaitingUserSupplementReachActualResume和TestUserSupplementToWaitingGroupMemberReachesSameCheckpointThread。question答案已有Children路径应独立处理。窗口evidence/T-14-logs/resume-inbox-window-map39.md。

## Workspace and Scope

所有以下源加native/huhubot前缀：internal/application/api/tooling.go及必要新增resume_inbox.go纯DTO/验证；internal/application/execution/executor/{ports,executor}.go；internal/adapters/outbound/sqlite/execution/{context,executor,recovery}.go；必要internal/adapters/outbound/sqlite/usage/messages.go。新增tests/contract/foundation/resume_inbox_test.go及同文件必要夹具。其余产品与旧SQL/迁移/锁/外部wire只读；如实际需要额外路径先报Root。common与协议由147单写，145原delegation/groups测试仍归145，不同改。

可写本任务REPORT/logs/manifest与resume-inbox-contract.md；纯合同是唯一146/147交接，先固定字段、权威来源、去重、大小和恢复语义，不创建平行事实源。正式Evidence/状态只Root。

## Acceptance

1. 当前145独占Go，开始只读设计，不写生产/测试、不跑Go/Node/生成/DB。Root明确归窗后才准source-only；先比较复用ExecutionPosition.Decision/完整CP与新SQL投递表，选择最小可证明方案，合同冻结交147。无必要不迁移schema，不新恢复writer。
2. 实际Claim已通过当前recipient/Grant/Group/父scope/source/read/send的消息才可成包。按真实ID/body revision/hash/thread确定身份；sealed初始inbox、先前CP已呈现消息和question答案不重复。正文相同但ID不同不得误丢；身份矛盾拒绝。lineage、时间或字符串不是已呈现证明。
3. 原SaveResume在Engine之前持久决策；RecoveryDecision存在时只重放原包，不能并入后来新inbox。跨两次正常挂起不重复注入，原CP prefix和BindingDigest保持。Current qualification、来源传播、资源上界与失败/撤权body-free保持，不能修改旧测试期望掩盖真实缺口。
4. 协同147形成实际默认Core/SQLite→Executor→SDK三协议的补充正文消费者。你负责生产Runtime与真实状态持久/重启/撤权的窄测试，147负责三SDK模型可见性/CP兼容；共用一份真实合同，不用假Engine通过代替模型可见。原145红在最终消费者观察合法Decision/后缀后应绿，不删原CP/Run计数/来源/slots/pins约束。
5. 授窗后Go1.26.10固定实际输入、原输出、exit/Wait/零漂移；先有意义反例再实现，保留原红。Go检查串行按Root授窗，完成即冻结归还。Root执行共同门；无真实Provider/Obsidian。

## Return

先ACK，先交只读方案与最小合同；最终REPORT首h2前Session:20261025T043239Z、Task:146-resume-inbox-runtime、Status:completed。按共享模板写聚焦交接/产物与验证/问题与下一步，逐源前后hash/mode、命令实际Wait、未验边界。亲自validate-dispatch return0后MESSAGE+FINAL；旧144报告不覆写。
