---
schema_version: 2
session: "20261025T043239Z"
task: "126-private-memory"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-14
---

# 私有记忆与实际短期上下文

## Goal

native:/root/foundation_research 作为T14实施者，完成本票domain/application/sqlite/014/test自有范围：真实隔离上下文与摘录、私有修订/召回/暂停/忘记、同Executor维护作业Hooks、当前事实/恢复水位和实际context查询。Root是唯一状态/E2E/团队协调owner。你的117三协议交付已接纳；新任务不能仅交准备报告或空接口即称完成。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot；branch NAMEWTA/bot；HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715；Map31/Goal30/LOG118，evidence/T-14-logs/memory-window-map31.md。G2代码门输入2a649a6cf8959681c6dc87f5dc59151f3895c8c7938eab5e98e9ab36a2c2c1b4已接纳，Root开窗前再核2063源/模式无漂移。

按Map→dev→T14→Goal，I/preflight/codebase设计/TDD/风险/异步生命周期执行；旧未变规则可复用。产品权威Spec §5/6、AC018/019/021/022、ADR024、DESIGN记忆的实际上下文读取；既有055/099研究仅历史索引。当前完整实施合同：115-memory-interface-contract/interface-contract.md SHA406bdd596fd3bd93702c487ab7e996b8be78d9702be584cc3b3e46f9d3acdfc4，123-short-term-context-contract/short-term-contract.md SHA68333f6840ff76a67b5c8fc5ccee67fb2da95d7622e6e9f3fe968fbff07e9d7b。全文读取；123 Plan/Seal具体化替代115对应PrepareInTx，不重做广泛研究/长期方案选择。

125原foundation_go已实际ACK、独占检查窗口，正在写公共纯DTO/严格wire/生成及SQLite execution adapter-only Hooks。当前你只读准备真实源和这些合同，可写本目录计划/测试设计材料；**等Root通知125具体稳定源与交还检查窗后才写产品/测试或运行Go/产品Node**。待依赖不算取消任务，主动给Root具体接口/消费者问题，不重复要用户授权。完整28票55AC、团队与代码总验收授权持续；真实模型/Obsidian/目标OS由用户后验。

## Workspace and Scope

只可写T14原路径：native/huhubot/internal/domain/memory/private/**、internal/application/memory/context/**、internal/application/memory/private/**、internal/application/memory/maintenance/**、internal/adapters/outbound/sqlite/memory/**、internal/adapters/outbound/sqlite/migrations/014-memory.sql、tests/contract/private-memory/**（均以native/huhubot为根）；及本目录REPORT/logs/manifest。不改TASK或正式Evidence/票/Map/Goal/永久知识。

公共API/HAP/生成TS/Core/迁移注册、Go锁、T03执行器/Run配置/pin、T04事件/stdio、T05 grants、T08 common/各driver、T11–13传播/usage、T16 recovery均只读，缺接缝精确请求原owner。无需复制Run/Attempt/Group/Grant状态机，不新建worker、Engine或独立提炼HTTP。014正文由你拥有，当前schema9，原foundation_go后续串行注册实际10；旧SQL不改。不使用真实Profile/keyring/Vault/Provider。

## Acceptance

1. 115六个Memory用例和123同方法Kind=context实际本域实现。可信身份/namespace/scope、虚拟默认true但无额度eligible=false及只读无写、receipt优先于CAS、明确用户add独立意图、correct保留受限祖先、pin/forgotten安全stub、真实来源/immutable revision/各字节页预算；T15 proposal/global写尚未装配不能假成功。当前读取/物理投递依T05同fence，不把query通过当dequeue通过。
2. 新014表/索引/唯一性支撑item/revision/candidate/outbox/job/initial manifest/context entries/effective dependencies/suppression。独立revisionID、stable origin双防复活、人工修订保护即使unpinned、循环/坏JSON/缺关系/超限明确失败；oldhead audit不误当active ancestor。忘记是逻辑失效，T17物理清除另票，不保存被忘正文/语义向量做抑制匹配。
3. 同Store实现115+123 MemoryHooks：真实completion去重outbox、bounded admission、job→独立Run绑定、Plan只读短Tx、Seal同MarkRunning原子、immutable ReadInput/ReadContext、Commit二次当前验证、实际输出依赖。Plan→Host→Seal及Run writer在T03；T14不得HTTP/Host入SQL。新job对source scope/temporary/maintenance循环要按实际资格保守。维护配置/费用由原owner独立pin/可信budget family接入，不假造现有权限。
4. ShortTerm按本Agent+真实Session/workThread/group代隔离，candidate 3×20、近期8整文/旧32可核UTF8首尾摘录及明确遗漏；原Intent/Persona/要求/显式Source/当前inbox完整。原Derived.Hash保完整原文，TextHash/spans独立；manifest无重复body，source重读验证。精确来源去重，不能凭hash或祖先相同丢不同revision。context实际list摘要/get entry片段分页、redacted安全stub/独立用户原文、pending/legacy无伪History补填；实际entryID支持物理fence。
5. T05 MemoryFactsReader、T16 RecoveryWatermark及usage引用本域实现按115/123；纯读本域持久事实不递归调用公开T05检查。闭包/批量SQL和800/250ms门避免N+1/扩大范围；恢复只读本树实际来源，新的缺manifest不能legacy降级。API/Prepare/Commit真实生命周期同步StopAdmission+Done，已发费用结算不因停Memory而丢失；无独立后台goroutine。
6. 沿公共API或稳定adapter消费者有意义红→绿，先private显式管理切片、再short-term、completion/commit/抑制与完整共同Runner链。不得用编译缺类型当行为红。实际SQLite/并发CAS、statement/commit故障、迟到callback/新job旧origin、授权变更和正常独立origin对照；源/Scope不泄漏。完整三协议loopback/context/费用、物理stdio、恢复/Stop需要共同owner，给Root最小请求与确切准备好边界，不能拿未装配当通过。
7. 125纯类型稳定后尽快交014和Store接口的阶段SHA给Root，由原foundation_go注册/接入；不能为了独占整任务使原owner长期无输入。唯一Go检查窗口按Root消息，固定Go1.26.10/GOWORK off/GOEXPERIMENT空/GOFLAGS=-mod=readonly，normal CGO0/race CGO1；不tidy。每次固定输入/原日志/实际exit和Wait，失败保持。旧未变重型队列不机械重跑；新失败/风险驱动扩展。

## Return

先原生ACK并确认只读准备/等待125窗口。持续原生消息报告真实切片、最小共享请求、命令/进程结束，不能只发计划。完成自有实现后报告首h2前Session/Task/Status，正文聚焦交接、产物与验证、问题与下一步；精确路径/最终源SHA/工件manifest/每命令actual exit和Wait/真实已跑、旧证据复用、共同门及用户现场未验界限。亲自validate-dispatch return0后MESSAGE+FINAL并停写。Root固定最终输入独立E2E与双轴后才签T14，不提交推送发布归档、不再委派。
