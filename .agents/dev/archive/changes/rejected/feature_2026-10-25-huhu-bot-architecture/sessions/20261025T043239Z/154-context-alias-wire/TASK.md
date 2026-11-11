---
schema_version: 2
session: "20261025T043239Z"
task: "154-context-alias-wire"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-01
---

# 合法空intent_alias的HAP与TS结果合同

## Goal

T01共同合同责任内，由 native:/root/foundation_client 修复151独立确认的合法空intent_alias无法通过wire结果校验。生成源是唯一事实源，生成物必须由原generator真实产生；不改变模型输入、Memory持久来源、初始前缀或私有正文要求。Root/151原红不覆盖，153另修Memory两个集成问题，152另诊断非法补充等待。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot；HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715，branch NAMEWTA/bot；Map39/Goal38；28票55AC与Agent Team授权持续。真实Provider/Obsidian/目标OS用户后验，不索凭证、不提交推送发布归档。

workspace/catalog、Map → dev/testing/architecture → T01 → I实际修复规则，已读未变复用。规范为Spec、115/123、125纯合同、136/137结果边界、151 TASK/REPORT/日志。固定候选f0db44427b4ba9d0290571b922254780c0f098a1d833300a9ab2b710c5322e37在evidence/T-14-logs/review-freeze-memory-full-r1.json。

Root新物理CLI r2已实际5个Chat HTTP、三Run succeeded、slot/pin/activeSessionRun0，后续HAP返回INVALID_APPLICATION_RESULT，完整失败不改写为通过。151随后用真实aliasQuestionFixture的公共Memory.Get返回：1个readable intent_alias Text为空，DisplaySlice0..0/PartCount1；ValidateMemoryResult通过，1572字节真实JSON被wire.ValidateMethod(memory.get,result)拒绝。三类证据是实际producer→typed→wire差异，不是手造失真对象。

根源候选：generator memoryBound对context entry text只设maxLength4096，通用text仍minLength1；四处生成schema由此拒绝合法空alias。Go typed与TS memoryContext语义均允许该空显示字符串，待你核对全部真实来源后局部修复。

## Workspace and Scope

初始只读分析与/tmp备测试；Root在151正式回收后才开放source-only写入。共享生成、Go/TS检查均等Root明确资源窗口，禁止与152/153固定输入检查漂移。

可写生成源 `contracts/hap/v0.1/generate.mjs`，及它真实重建的 `schema.json`、`methods.json`、`fixtures/methods.json`、`native/huhubot/internal/protocol/hap/{methods_generated.go,schema_generated.json}` 和 `src/modules/huhubot/api.ts`；无变化的文件保留字节，不为了列入写集而改动。可写现有 `src/modules/huhubot/core/protocol/memory-validation.test.ts`，必要最小协议测试到 `native/huhubot/internal/adapters/inbound/hap/` 的新context-alias测试或原memory_result_validation_test.go。生产TS校验/API Go/Memory Store/Runtime/Engine/DDL/锁/其它fixture只读；如现有类型确有问题先向Root给精确请求，不扩大字段/身份/API方法。

## Acceptance

1. 以151实际红为有效缺失行为，修生成源后真实重建，并核生成diff仅修合法context显示的界限，不修改旧无关方法和T15未装配标志。
2. 同一实际alias结果经Go typed与wire通过；生产TS MethodValidation接受同一合法空alias/0..0片段，并可沿Root物理CLI最终回读。其它非空合法页/Unicode/249642B最大页仍保留已有效合同，不新增任意额外页/entry上限。
3. 空私有MemoryBody、无text的readable非attachment、坏displaySlice/partCount/hash/namespace、正文超过4096字节和redacted带正文仍拒绝；不要为单一正控放宽整个memory文本族或绕过schema/后置语义校验。既有Go严格metadata和TS错误隔离保持。
4. 限定Node检查需先确认实际编译输入与活动Go闭包可分；generator会写Go embed所以必须Root协调后才运行。Go使用绝对1.26.10/GOTOOLCHAINlocal/GOWORKoff/GOEXPERIMENT空/GOFLAGSreadonly/GOPROXYoff。所有实际进程Wait、保存原输出及源/mode/生成差异，不把脚本退出0当行为通过。若只有生成schema而无生产TS行为源变化，不机械重跑全lint/build；Root按实际打包输入判断必要产物。

## Return

REPORT首h2前Session: 20261025T043239Z、Task: 154-context-alias-wire、Status；聚焦交接/产物与验证/问题与下一步，包含具体旧错误和对照、真实生成命令/源前后hash/mode、实际checks/exit/Wait/原日志、未验边界。亲自validate-dispatch return，冻结manifest及报告后原生消息归窗停写。Root负责新共同候选的独立复审和最终CLI验证；本任务不关闭T14或Goal。
