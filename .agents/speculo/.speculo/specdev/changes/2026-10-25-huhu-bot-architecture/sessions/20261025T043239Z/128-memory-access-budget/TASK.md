---
schema_version: 2
session: "20261025T043239Z"
task: "128-memory-access-budget"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-05
---

# 记忆的当前权限、投递、传播与维护预算

## Goal

原owner native:/root/credential_provider 完成T14必要的T04/T05/T11/T12/T13共同消费者，先落唯一adapter-only事实/预算接口供126实现，再接实际Grant/Group/source、物理出队与每HTTP账户族。不得另写Memory业务库/Run/Engine，也不以接口阶段冒称功能完成。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot；branch NAMEWTA/bot；HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715。Map32/Goal31/LOG119、evidence/T-14-logs/memory-consumers-map32.md。G2三协议代码门已接受，122测试维护已回读；你原T04/T05/T11/T12/T13历史职责保持。

按Map→dev→T05及T04/T11/T12/T13→Goal与I/TDD/风险/异步规则。全文读115-memory-interface-contract/interface-contract.md SHA406bdd596fd3bd93702c487ab7e996b8be78d9702be584cc3b3e46f9d3acdfc4与123-short-term-context-contract/short-term-contract.md SHA68333f6840ff76a67b5c8fc5ccee67fb2da95d7622e6e9f3fe968fbff07e9d7b；Root已正式接纳，123增加context_entry及Plan/Seal，不重开默认/权限/费用产品选择。

125 foundation_go持唯一Go/产品检查，写公共DTO/HAP/生成与execution Hooks；126 foundation_research本域Memory/014待接口；127 foundation_client已有限只读准备并停turn，待schema后做TS字节校验。**当前你只读真实源/合同，自己目录可记录精确接口；须Root给125稳定源与产品写/Go窗口后才改产品/测试或运行检查**。不占槽忙等：可消息交回具体稳定接口候选后停turn，业务仍未完成，Root原followup续同TASK。

## Workspace and Scope

均以native/huhubot为根，只可按实际需要写：
- internal/adapters/outbound/sqlite/grants/{store,access,delivery,groups,lineage,memory}.go；memory.go新增本合同Facts接口/本域依赖注入/原授权消费，不存T14表。
- internal/adapters/outbound/sqlite/usage/{store,budget,recover,messages,finalize,waits}.go，可新增memory.go保存trusted AttemptBinding/Eligibility窄接缝；不复制Run状态或配置pin。
- internal/adapters/outbound/sqlite/collaboration/{store,messages,answer,followup,message_read}.go、sqlite/groups/{history,publication,access}.go仅实际跨正文来源继承点。
- internal/application/execution/events/service.go、internal/adapters/outbound/sqlite/events/store.go，原真实batch/短fence新kind消费者。
- tests/contract/access/**、events/**、collaboration-policy/**、delegation/**、groups/**内必要Memory消费者测试；先核真实目录，不造空测试套件。
- 本目录REPORT/logs/manifest。其他产品、TASK/正式Evidence/Map/Goal/旧报告只读。

API/HAP/生成TS/Core/stdio/迁移注册与SQL正文、execution/Broker/recovery/config/credentials、Memory三个层/014、common/三driver、locks、UI/主产物均只读。原owner精确请求由Root转交；不改现有Grant权限规则或授Sponsor私有继承。

## Acceptance

1. 先给126唯一grants.MemorySubject/Witness/Requirement/Facts/MemoryFactsReader、SetMemory和CheckMemoryInTx签名；包含context_entry。T14只给本域当前事实、完整祖先与watermark，不递归调用公开T05；T05继续真实旧Grant/Group/recipient/parent/Host范围。新helper切分避免T14→公开Check→T14回环，不把缺reader/表偷偷当已有新功能。
2. 每次模型read/send与维护summarize/memory都用实际当前targetRun/claim/config；UI read用真实author/published关系并只核read，空target仅可信用户页。原task-bound Grant不能伪别名跨到新维护根，资格不够明确blocked；group published合法历史与private contributors分开，temporary无Sponsor默认库。CheckInTx在空Sources快返前核实际run deps，坏JSON/未知SQL不吞成可过滤缺项。
3. 真实T11/T13返回/投递正文时才把memory_revision+完整祖先并入目标effective/lineage/Run.revision；后来取得依赖不能只靠初始Memory字段，group/child/message副本同步传播。普通独立用户原文和合法已公开history不得被整Run依赖一刀切隐藏。旧Derived键矛盾/闭包溢出明确拒，不截来源换成功。
4. T04 WithDelivery显式分组run/message/memory_revision/memory_candidate/context_entry，不让新ID落默认Run分支。共享800 subjects/250ms/当前expiry门保持，SQL在物理fn前关闭，不N+1扫描每项祖先；batch按Kind+ID和完整proof去重，不能首份nil吞后正文。带Memory空Source页也受真实fence；只有metadata的safe stub不携旧body。
5. T12 trusted AttemptBinding从实际memory_jobs.run_id/claim/pin/settings代和当前profile读取；普通main/child/question仍root账户，maintenance独立maintenance:profile，同一family下summary/retry不切回root。Reserve/Dispatch重核job/auto/额度/源/当前接收方，RetryOf必须同Run/claim/account，q.AccountID不可越族；默认额度0/暂停callback0。已发HTTP照原Settle/unknown责任，不因stop/forget/cancel退款或阻断落账。Eligibility只读无Reserve或Probe。
6. 接真实126表/hooks和原foundation_go Run/独立pin后，捕获实际loopback HTTP+SQLite account_id，正控/伪purpose/跨账户/旧claim/跨Run RetryOf/summary/retry/Reserve与Dispatch间pause；物理stdio页→forget/revoke后旧body不出及正常800旧路径控制，由你真实组件测试和Root E2E共同完成。组件fake仅限定Facts接口边界，不冒称完整实际Memory集成；所有新目标先有意义红，再绿。
7. 首个Facts/预算纯adapter契约稳定即给Root/126路径SHA，不待整票才共享；完整生产/测试改动按Root唯一窗口和固定输入，Go1.26.10/GOWORK off/GOEXPERIMENT空/GOFLAGS=-mod=readonly，normal CGO0/race CGO1，不tidy。实际exit与Wait、原失败/并发故障留存，旧未变重型队列不机械重复。

## Return

先ACK只读边界，完整任务未实施前不写completed REPORT。阶段通信给真实类型、具体消费者、待原owner依赖；Root通知产品窗后推进实现。最终REPORT首h2前Session/Task/Status、聚焦交接/产物与验证/问题与下一步；精确源/manifest、命令/实际exit与Wait/未验证项，亲自return0后MESSAGE+FINAL停写。Root固定最终源E2E与独立双轴后签共同门。真实Provider/Obsidian/目标OS用户后验，不索凭证、不提交推送发布归档、不再委派。
