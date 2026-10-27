---
schema_version: 2
session: "20261025T043239Z"
task: "037-source-coordinate-repair"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-01
---

# 长笔记来源坐标的唯一schema修复

## Goal
修复035固定候选中已证实的原合同缺陷，交回可复审代码，不扩产品范围。仅Root实际followup_task派遣后开始。

## Inputs
工作区/home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，base33c21e098ef3188cbab5a09f3e0a01fadb787715，Map10/Goal9。用户LOG047/051授权完整代码与Agent Team，现场由用户后验，不需再次许可。复用已读Map→dev适用参考→当前T01/T05与I风险/测试规则。035-chat-access-review固定输入evidence/T-03.md#review-input-r1（131文件/36来源，SHA2a43d12b56b6e68c676ef89348295bbacc5ad3e496d5599e0fece0846968401d）；完整报告与对应独立原反例须在实际派遣后回读，未派遣时不可自行开始。原失败输入和日志不改写。

## Workspace and Scope
你是原foundation_go，仅修复035确认的来源UTF16坐标上限与1MiB来源捕获上限不一致。131072原文字节末尾1字节选区正常，131073字节末尾1字节选区被host.read schema拒绝；不能通过放宽64KiB正文读取/搜索输出预算解决。先回读原反例及capture实际输入约束，确定start/end坐标的正确独立上限；所有协议生产字段仍严格校验。

只写contracts/hap/v0.1/generate.mjs及其6个原生成输出schema.json/methods.json/fixtures/golden.json/fixtures/methods.json、native/huhubot/internal/protocol/hap/schema_generated.json/methods_generated.go；必要永久生成边界反例放当前fixtures/methods.json的生成入口及原foundation/fixtures_test.go。不得改TS产品/测试、Go业务、旧SQL、lock/依赖、工程/正式状态或他人文件。生成输出由唯一generator更新，不手改绕过来源；不扩大其它计数/字节上限，不改wire版本。028原TS owner在038处理对象身份并补实际长选区消费者回归，原027在039处理Grant摘要；三者无同文件写入。发消息告Root/038合同已可消费，不自行启动下游票。

保留修复前独立失败证据并验证完全相同输入转绿，补最大合法坐标与越界拒绝的共享正负夹具、Go/TS真实schema消费者验证和隔离生成一致性。重跑实际受影响Go foundation/schema/architecture/vet；完整Go或插件build由Root汇合后按影响选择。已有pinned Python validator环境可复用，不能擅装新依赖。

## Acceptance
原独立反例按相同输入转绿，正常/相邻负例保持，源码与相关生成物一致；所有实际命令/输入/退出码和未跑项可回读。沿原gpt-6.1-sol/xhigh实施偏好，不冒称底层模型鉴定。原035报告和未变证据保留；不得再委派、提交、推送、发布或归档。Root未要求全仓重复测试，按影响选择检查；不能以测试绿替代后续未参与实现者审查。

## Return
只写本TASK REPORT/logs及上列精确实现路径。REPORT首个h2前Session: 20261025T043239Z、Task: 037-source-coordinate-repair、Status: completed；h2聚焦交接、产物与验证、问题与下一步。给自有源文件和实际输入SHA、真实测试日志、共同接缝是否已冻结；所有writer/probe停止并Wait后，validate-dispatch return0，真实MESSAGE/FINAL交Root。不得写正式Ticket/Map/Goal/Evidence或他人报告，Root接收后才接纳候选。
