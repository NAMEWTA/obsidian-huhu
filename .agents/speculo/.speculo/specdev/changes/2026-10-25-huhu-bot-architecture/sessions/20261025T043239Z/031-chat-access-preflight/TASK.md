---
schema_version: 2
session: "20261025T043239Z"
task: "031-chat-access-preflight"
kind: research
change: 2026-10-25-huhu-bot-architecture
ticket: T-03
---

# T03/T05同库消费接缝只读预检

## Goal
在024独立审查与025工程接纳期间，原共享Go/assistant owner只读明确下一阶段最小事务/权限接口与写集请求。T03/T05仍ready未启用生产writer，不改T02当前冻结91文件或规范来源。

## Inputs
项目 /home/wta/orca/workspaces/obsidian-huhu/bot，HEAD33c21e098ef3188cbab5a09f3e0a01fadb787715，Map8/Goal7。先沿AGENTS发现、Map→dev/适用架构测试许可→T03/T05，读026/027/028预备TASK、evidence/chat-access-preflight.md和019最终REPORT。复用既有固定官方开源研究；陌生新点仅查官方来源，不扩产品决定。

## Workspace and Scope
全部产品/测试/API/schema/锁/工程文件、正式Ticket/Map/Goal/Evidence及他TASK只读。唯一可写本TASK REPORT与原始只读观察日志；无生产修复、无测试生成物落源码、无提交/发布/再委派。必要离线探针在外部临时目录，不能触用户keyring/模型/Vault。

重点回读base.WithinTx、assistant Acquire/Release/Mutate/Credential BeginDelete、纯API端口和HAP双向Host生命周期。给Lead精确最小写集/owner请求：T03 StartRun如何让同一SQL事务一次提交固定配置pin/Session占用/Run/首事件/receipt，旧receipt优先、busy失败零pin、disable/delete/credential删除无竞态；不得用跨事务Acquire后补偿冒充原子性。T02自有文件若需原owner维护，逐路径说明必要改动，不能未获维护窗口先写。

T03/T05资源并行需要把各自003/005迁移文件、唯一embed/版本分配、共享API先冻结、不同一次性Profile的资源实例和串行窗口写清。给现有SourceRef/ContextEnvelope/Grant/Host/API缺失字段与最小兼容变更建议、TS/Go双方握手顺序，不另造并行权限或表。明确后续业务不装配/Host离线时真实错误、同库UsagePort消费者及纯Engine测试注入接缝；没有fake生产回答。

## Acceptance
结果能直接用于Lead修改原票/Map的精确资源/路径合同并发出026/027/028；区分现存源码事实、拟议方案和仍需实施验证，不把预检当T03/T05完成。列已有测试可复用与必须新增的实际并发/崩溃/撤权/第三份零读取反例；无新问题不重复测试T02。024若有finding可及时接收但本任务不得自行修复。

## Return
REPORT首个h2前 Session: 20261025T043239Z、Task: 031-chat-access-preflight、Status: completed；h2聚焦交接、产物与验证、问题与下一步。带准确路径/端口/owner、来源与必要实施顺序。validate-dispatch return0，所有探针退出、仅报告写入停止后工具交回root。
