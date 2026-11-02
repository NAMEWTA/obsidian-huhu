---
schema_version: 2
session: "20261025T043239Z"
task: "134-memory-runtime-consumers"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-03
---

# 接续真实记忆运行集成并补历史与能力消费者

## Goal

原owner native:/root/foundation_go完成129未完成的全部运行集成与本轮新增精确消费接缝。129已交18源安全checkpoint、不写完成REPORT；132纯API任务先独立交回，随后才能开始本134。不覆盖任何旧TASK/报告。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot；branch NAMEWTA/bot；HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715；Map37 / Goal36 / LOG124。完整28票55AC与Agent Team、本轮代码层总验收授权持续；真实模型/Obsidian/目标OS由用户后验，无提交推送发布归档，无再委派。

按Map→dev/testing→T01/T03等原票与既有I规则；115/123及129 TASK全部原验收要求继续有效。129 logs/03-runtime-source-checkpoint.json SHA755460c3c63300e5a4e23add8895d3031084c5240a707d47a0b132307d6134e2，04-runtime-checkpoint-handoff.md SHAc18851603cd612250087a1d53dfacdc61bf2bfbe6f041fa0e34d635346e561e3，18源均未编译。126 logs/05-first-hooks-candidate.json SHA6b97f10ac7ab9e24b5a89a1093df7e0cbbce5d7b524e7d03157496342d4200d5和06-first-hooks-checkpoint.md SHA4b903ee99740a8562ddb88b9d1fec23f39e7458099f19ebc265c0eb0e50ea45b为首次完整20源候选。128原owner仍完成真实权限/账户消费者，以其新checkpoint为实际依赖。132返回的纯helper/旧输入兼容保持只读。

精确接缝与资源边界：evidence/T-14-logs/history-runtime-window-map37.md、memory-consumer-port-clarification.json、memory-metadata-witness-contract.json。Root及128已实际定位direct/service.go的History和ModelHistory两处SourceRefs空快路；不能靠只收拢最终物理fence代替应用层正确过滤。

## Workspace and Scope

接续129 TASK原列的Core/迁移注册/stdio、Executor、execution SQL、recovery、broker recovery、assistant/store.go最小usage与测试写集；新增native/huhubot/internal/application/conversation/direct/{ports,service}.go及contracts/hap/v0.1/generate.mjs。methods.json和native/huhubot/internal/protocol/hap/methods_generated.go仅由真实生成改变六private方法implemented，不手改生成文件。测试新增/维护仅129原范围加direct历史消费者所属tests/contract/chat/**。

133冻结的纯API、HAP typed路由、common/driver、schema/TS/fixtures及纯foundation memory_contract/memory_binding/memory_router三个测试只读；这些在129历史写集但本134明确排除。其他Memory业务/014正文/grants/usage/collaboration/groups/锁/旧SQL/TS产品和正式状态只读。自己的134 REPORT/logs/manifest可写。生成器会重写只读输出，因此实际generation必须等Root单独协调生成窗；预期其余输出字节不变，如变了立即停下报根因，不静默接受。

## Acceptance

1. 完成129 TASK全部8项原合同及其当前适用验证，报告清晰归集129既有18源与134实际变化。默认Memory实际装配/关闭/失败清理、同两Tx Plan/Seal、同Executor维护、同Finalize候选和原账户/producer/恢复/stdio安全边界不能省略。原已通过G2组件/旧底座只按真实输入复用。
2. application-private HistoryMemoryPort使用128提供的`ReadHistoryMemory(ctx,id,profile,targetRunID,[]api.VisibleMessage)([]api.VisibleMessage,map[string][]api.DerivedInput,error)`，不把adapter/SQL类型引入Application。Core显式装配真实grants Store。History在SourceRefs空快路之前逐消息资格过滤，保留原来源和Group规则；DeliverySubjects仅来自最终实际visible项及最终附件，不为被过滤项留下proof。旧失效消息不抹掉独立user意图，不吞未知错误。
3. ModelHistory在source快路前做纯资格读取，target使用当前实际Run且read/send，保留原来源预算；只对最终预算保留的消息合并完整Memory祖先与原message Ref，严格同key一致、去重及128上限，不静默截断。lookahead/被source或Group过滤/预算挤掉的消息不增加Run资格要求；真正持久化仍原Run writer。新普通extractive流程不能为修legacy重复注入旧History。
4. GetRun通过126 ContextUsageInTx(ctx,tx,id,profileID,runID)(*api.ContextUsage,error)读取安全manifest计数，已失效正文不阻塞查询终态；Engine/Recovery仍严格ReadInput/ReadContext，不变成空成功。实际维护NewRun/Memory.BindRun之后调用128 DeriveMaintenanceInTx(ctx,tx,id,in)，由你唯一Run writer同外层Tx保存来源/effective GrantIDs再complete Check；不清task scope、不伪造Parent/namespace，不让Memory业务写execution_runs。
5. 真正装配可用后，只在generator implemented Set添加memory.list/get/pin/correct/forget/setAutoMaintenance六字面量，真实生成methods两文件，schema/API/fixtures字节不变；T15两个方法继续false。用真实默认Core/HAP验证hello与方法调用一致，而未装配Facade仍确定拒绝。任何旧fixture失败先区分夹具错误，不能放宽产品断言。
6. 初始仅source-only；133可能进行纯组件审查，不能运行Go/Node/build/generation/混合CLI。新增消费者回归先写源码，尽早交第一可编译checkpoint，Root冻结126/128/134后给实际联合Go窗口；真实编译失败保留，不冒充行为红。定向normal/race/vet按风险，所有命令实际Wait/hash漂移，固定Go1.26.10/GOWORKoff/GOEXPERIMENT空/GOFLAGSreadonly/CGO0或race1，不tidy。正式RootCLI/E2E另由Root执行。

## Return

先原生ACK。若交阶段候选，明确source checkpoint与待验，不写completed报告。最终完成时停写全部产品并等待实际命令结束；REPORT首h2前Session: 20261025T043239Z、Task: 134-memory-runtime-consumers、Status，包含聚焦交接/产物与验证/问题与下一步，精确来源/改动/红绿/实际exit与Wait/未验边界；亲自validate-dispatch return actual0后原生MESSAGE+FINAL。Root统一回读、E2E与独立审查后签共同门。
