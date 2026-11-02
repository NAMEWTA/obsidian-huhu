---
schema_version: 2
session: "20261025T043239Z"
task: "125-memory-foundation-contract"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-01
---

# 记忆与短期上下文唯一公共合同

## Goal

原owner native:/root/foundation_go 实施115+123的唯一公共纯DTO、严格HAP/TS形状及T03 adapter-only最小合同，给T14/共同Engine/权限消费者稳定接缝。这个切片不是全记忆完成，既有业务/旧CP继续保持。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot；branch NAMEWTA/bot；HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715。Map31/Goal30、evidence/T-14-logs/memory-window-map31.md；Root实际G2代码门已接纳，2063产品文件/模式当前再次核对无漂移。115 interface-contract.md SHA406bdd596fd3bd93702c487ab7e996b8be78d9702be584cc3b3e46f9d3acdfc4；123 short-term-contract.md SHA68333f6840ff76a67b5c8fc5ccee67fb2da95d7622e6e9f3fe968fbff07e9d7b（你原作者，全文已接纳）。123 Plan/Seal替换115 PrepareInTx，同一MemoryHooks，不造第二套。

按Map→dev→T01/T03→Goal，执行I/preflight/真实合同TDD/边界规则；旧未变规约可复用。完整28票55AC、Agent Team、代码总验收授权持续；真实Provider/Obsidian/目标OS用户后验。不索凭证、不提交推送发布归档、不再委派。

## Workspace and Scope

仅下列产品路径可写（实际无需改者保持）：
- native/huhubot/internal/application/api/{types,conversation,recovery,events,collaboration,attempts,memory,context}.go；新增纯类型/helper可在memory.go/context.go，不扩大SDK/sql依赖。
- native/huhubot/internal/adapters/inbound/hap/{router,memory}.go；contracts/hap/v0.1/{methods.json,schema.json,generate.mjs,validate.py,fixtures/**}；相应internal/protocol/hap/{schema_generated.json,methods_generated.go}、src/modules/huhubot/api.ts。
- native/huhubot/internal/adapters/outbound/sqlite/execution/{maintenance,context}.go只声明115/123的adapter-only契约，暂不启用Run调度/来源选择/写库。
- native/huhubot/tests/contract/foundation/**内必要memory契约控制；src/modules/huhubot/core/protocol/method-validation.test.ts用于真实生成形状的正负边界；如实际生产method-validation.ts必须变动，先给Root最小请求，原TS owner窗口另定。
- 自己本目录REPORT/logs/manifest。TASK与正式Evidence/Map/Goal只读。

Core/迁移注册/旧SQL/locks/Go依赖/common/三driver/stdio、执行器其余文件、其他业务/测试、main/styles/root配置只读。不得改旧CP fixture/golden字节；新增memory样本与未实施预留DTO有意替换分开。六方法只做真实Facade路由/严格验证，默认未装配仍诚实不可用，T15两方法保持false；没有memory实现前不能写implemented=true。新EngineInput字段nil不改变legacy运行。

## Acceptance

1. 单一Memory类型与Kind=context投影/分页、Run.ContextUsage、EngineInput/Result与两个Inspection的Memory/ShortTerm按115/123；API不含SQL/SDK/特定框架。统一标准库CanonicalMemoryInputBinding/CanonicalShortTermBinding及短期固定渲染；原Ref.Hash与实际TextHash/spans各自校验职责清楚，不能声称纯helper读到了原数据库正文。
2. 八个既有wire方法的新严格schema/TS/Go转换与独立DTO校验。恰一pointer、主动/forgotten/redacted分支、namespace/scope/正Decimal CAS、context-only Cursor/Limit、UTF8 byte/数组总界、null/未知字段/额外权限字段拒绝。T15/global分支未装配错误不能伪成功，context写只读拒绝。旧非memory合同字节/行为不无故漂移。
3. HAP真实router用显式fake MemoryAPI证明路由/身份/各分支与输出校验（清楚仅契约，不冒称真正记忆）；默认Core仍未装配控制。先捕获目标缺失/旧形状的有意义红，不用缺类型/编译失败充当行为红。真实Go与TS边界正负样本包含中文/组合emoji和字节限额。
4. T03同Store MemoryHooks具有123 Plan/Seal/ReadContext和115 completion/admission/bind/read/commit/output唯一接口；仅sqladapter可见，不提前复制Run/预算/来源状态机。014由T14写正文、注册由你后续窗口；本任务只核当前schema9/下一10，不写空DDL。
5. 先完成最小纯类型/契约并通过定向检查，及时给Root/126具体签名和SHA供消费；所有验证唯一窗口Root授予后执行，固定输入/原日志/实际exit+Wait。Go1.26.10、GOWORK off、GOEXPERIMENT空、GOFLAGS=-mod=readonly，normal CGO0/race CGO1。不tidy。新TS最终lint/build由T27原owner收口，不省略、不抢共享产物。

## Return

先原生ACK，确认收到Root实际Go窗口后运行产品命令。REPORT首h2前Session/Task/Status与聚焦交接、产物与验证、问题与下一步。列精确已变文件、API/生成输出摘要、实际红绿/旧合同控制/未实施边界、每命令actual exit与Wait，manifest。亲自validate-dispatch return0后原生MESSAGE+FINAL并停写。原作者完整历史保持，本切片不签T14/整票通过。
