---
schema_version: 2
session: "20261025T043239Z"
task: "130-memory-common-engine"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-08
---

# 三协议共用的上下文、记忆维护与Checkpoint绑定

## Goal

原owner native:/root/engine_adapter 实施115/123的共同Engine消费者，复用三协议既有Registry、真实Attempts、取消与CP，不改driver或增加独立Engine。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot；branch NAMEWTA/bot；HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715。Map33/Goal32/LOG120，evidence/T-14-logs/memory-runtime-map33.md。完整28票55AC、Agent Team、代码层总验收授权持续。真实Provider/Obsidian/目标OS由用户后验；不索凭证、不提交推送发布归档、不再委派。

按Map→dev→所属Ticket→Goal与I真实消费者/TDD/风险规则。115 interface-contract.md SHA406bdd596fd3bd93702c487ab7e996b8be78d9702be584cc3b3e46f9d3acdfc4与123 short-term-contract.md SHA68333f6840ff76a67b5c8fc5ccee67fb2da95d7622e6e9f3fe968fbff07e9d7b全文已接纳，123 Plan/Seal替代115 Prepare，其余沿115。125当前API候选还在收口，以Root接纳最终源为实际输入，不自行更改公共合同。

当前125仍持唯一检查窗，初始仅有限只读准备；自己目录可以记录精确消费计划和最早可观察红，产品/测试零写入、Go/Node检查零执行。Root交最终125源与写/检查窗口后再进入实现。128权限/预算、126私有Store与129运行装配各有原owner，任何缺口向Root给真实最小请求。

## Workspace and Scope

仅 native/huhubot/internal/adapters/outbound/eino/common/** 的实际必要生产/测试路径，优先engine.go/checkpoint.go/tools.go及必要protocol.go；tests/contract/engine/chat/**中必要共同路径黑盒控制。自己目录REPORT/logs/manifest可写。

三driver/httpcall/Registry协议tuple、API/SQL/Core/Executor/Broker/TS、依赖锁、旧CP fixture/golden、正式Evidence/Map/Goal/TASK只读。真正发现driver不支持空Tools时先报告，不改协议规避。

## Acceptance

1. 新普通输入按Persona→原显式Sources→delegation requirements→ShortTerm→Memory→Intent一次；既有inbox不重复、alias只metadata。用125纯helpers验证canonical binding/固定标记，原source hash与render hash职责保持；把资料作为数据块，不赋新工具/权限。
2. nil Memory/ShortTerm的旧序列化保持原Chat v1与Responses/Anthropic v2有效字节；新块CP记录绑定并在Resume和纯Inspector对真实DB提供输入逐一核对。篡改mode/job/namespace/ref/text/spans/digest拒绝且新HTTP0，不靠更新golden。
3. maintenance经可信Memory.Mode输入，用原Engine/Registry/每HTTP Attempts；空工具定义，不执行任何tool call，不发布text_delta到用户。严格解析有界MemoryCandidateSet，只允许服务器Targets及规定operation/provenance，重复/未知/null/超字节/坏Unicode拒；输出只有MemoryCandidates，Text空。普通Run不产维护Candidates。
4. 绑定用途由128实际DB负责，Engine不以q.Purpose自行绕账户；summary/retry保持同attempt family，实际已Dispatch失败/取消照原Settle排空，不改变已验gzip尾部/unknown边界。
5. 从真实Engine/public接口捕获内容与工具请求；正控ShortTerm/Memory正确顺序、128KiB候选输入界、维护空工具候选；非法输出/绑定/CP控制callback0或明确失败。同公共consumer先真红后绿，三driver共用机制可定向真实SDK loopback验证，旧nil fixture控制保留。完整默认Core/SQL账户与记忆持久由126/128/129+Root共同E2E，不以fake单测代替。
6. Root唯一检查窗口，相关writer停写，Go1.26.10/GOWORK off/GOEXPERIMENT空/GOFLAGS=-mod=readonly，CGO0 normal/CGO1 race；固定源/actual exit与Wait，不tidy。不为无新风险重复整个三协议既有重型队列。

## Return

先原生ACK。尚有跨owner依赖可交具体签名/缺口后结束只读回合，不写completed REPORT；Root followup续同未完成TASK。最终REPORT首h2前Session/Task/Status、聚焦交接/产物与验证/问题与下一步，精确源/manifest、真实红绿/每命令actual exit与Wait/未验边界。亲自validate-dispatch return0后MESSAGE+FINAL停写；Root固定源代码E2E和独立双轴才签共同门。
