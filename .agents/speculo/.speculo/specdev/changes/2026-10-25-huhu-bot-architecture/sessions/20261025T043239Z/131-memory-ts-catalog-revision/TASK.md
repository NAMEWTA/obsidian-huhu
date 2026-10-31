---
schema_version: 2
session: "20261025T043239Z"
task: "131-memory-ts-catalog-revision"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-01
---

# 修正记忆列表 namespaceRevision 的客户端范围校验

## Goal

原 TS owner native:/root/foundation_client 修正 127 交回后 Root 实际发现的单一协议语义缺口。只维护原两个 TS 文件；127 的已完成 REPORT、日志和 manifest 保持原样。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot；branch NAMEWTA/bot；HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715。Map35 / Goal34 / LOG122，T-01/T-14 均仍 in_progress。完整28票55AC、Agent Team、代码层总验收授权持续；真实操作由用户后验，无提交、推送、发布或再委派。

沿已读 Map→dev→T-01 的现行规则；本次只补原校验器，不重做设计或扩展公共合同。127 REPORT SHA a7279197827b5963c301ca4a81a72081e1d2e55f01eed76a9027a3206329730b；生产 TS SHA 3cde7ada5998348cfe388bd99effa4819b250a2ece632473e2c3e4dcd4226b5e；测试 SHA 2589db68fde2eaf0f957904ffc60d2716bc8f3939f0a8fb88a02afdf8baec787。125 R3 API/schema 保持冻结。

真实缺口：schema 的 memory.list.result.namespaceRevision 为普通非负 Decimal；Go api.ValidateMemoryResult(MemoryPage) 的 memoryDecimal 要求 1..9223372036854775807；127 TS positiveDecimals 未覆盖 namespaceRevision 且没有拒绝0。Root evidence/T-14-logs/127-namespace-revision-red.json 与 .log 已通过真实 MethodValidation 的 Node bundle 调用观察到：1 和 MaxInt64 正控通过，0、MaxInt64+1、20位数字全部被错误放行。真实进程 actualExit126、Wait 已结束，输入漂移[]。Root 没有运行 Go，Go 范围来自实际 api/memory.go:217/430 回读。

## Workspace and Scope

仅 src/modules/huhubot/core/protocol/method-validation.ts 与 memory-validation.test.ts 可写，以及本 TASK 目录内 logs/REPORT/manifest。公共 schema、api.ts、Go、生成脚本、旧共享测试、依赖与锁、正式状态/Evidence、127 已完成目录均只读。

## Acceptance

1. MemoryPage.namespaceRevision 精确接受 1..9223372036854775807 的 canonical 正十进制字符串；0、上界+1、超过19位均拒绝。既有 schema 继续拒绝空串、负号、小数及前导零；不改变非 Memory 方法的 Decimal 语义。
2. 在公共 MethodValidation 消费者新增有正控的回归；先在127真实实现运行并保存本地红，再做最小修复。通过真实 HapConnection/BotClient 的受控帧至少验证一次非法 list result 被拒绝，复用既有传输测试设施，不 mock validator。
3. 本任务沿 Map34 的独立 TS/Node 检查窗：只运行限定 memory-validation/method-validation/codec/connection 文件和必要类型检查。实际输入含 schema/配置/依赖，检查时自身停写并核 hash；不得运行 Go、混合跨语言 harness、generation、全 lint/build。Go 源码 writer 在其他路径工作不构成这组测试的输入。
4. 127 的有效73 tests 与双 tsc 作为历史保留；仅新增变化失效的检查再验。记录每次实际 exit、Wait、输入与日志；生产/测试类型检查按实际改动选择，不将未跑检查报通过。

## Return

先原生 ACK；完成后停止两文件写入和全部产品进程。REPORT 首 h2 前 Session/Task/Status，精确 聚焦交接/产物与验证/问题与下一步；列真实红绿、源/工件 hash、未验边界。亲自 validate-dispatch return actual0 后 MESSAGE+FINAL；Root 回读收口，不直接改 Map/Ticket/Evidence。
