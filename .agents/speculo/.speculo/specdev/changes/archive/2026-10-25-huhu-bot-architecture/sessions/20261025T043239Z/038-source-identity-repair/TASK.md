---
schema_version: 2
session: "20261025T043239Z"
task: "038-source-identity-repair"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-05
---

# 来源捕获对象身份竞争修复

## Goal
修复035固定候选中已证实的原合同缺陷，交回可复审代码，不扩产品范围。仅Root实际followup_task派遣后开始。

## Inputs
工作区/home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，base33c21e098ef3188cbab5a09f3e0a01fadb787715，Map10/Goal9。用户LOG047/051授权完整代码与Agent Team，现场由用户后验，不需再次许可。复用已读Map→dev适用参考→当前T01/T05与I风险/测试规则。035-chat-access-review固定输入evidence/T-03.md#review-input-r1（131文件/36来源，SHA2a43d12b56b6e68c676ef89348295bbacc5ad3e496d5599e0fece0846968401d）；完整报告与对应独立原反例须在实际派遣后回读，未派遣时不可自行开始。原失败输入和日志不改写。

## Workspace and Scope
你是原foundation_client。最小修复035的captureNote读取前后TFile身份替换竞态：Vault.read阻塞期间registry以同路径新对象替代旧对象，旧stat/path仍相同，新正文不得绑定原显式附加。检查真实来源捕获路径异步边界及受控缓存发布点，保留未保存编辑器快照合同；正常对象/切leaf等既有行为不回退。

只写src/modules/huhubot/platform/obsidian/sources/sources.ts、sources.test.ts及确需的services/host-read/host-read.test.ts。其它生产/协议/生成器/locks、正式状态/他人文件只读。037原Go/schema owner独立修长笔记range坐标上限，不能自行改schema、api.ts或method-validation。与037协作补永久生产captureSelection→HostReadService长笔记末尾1字节选区回归，131072/131073边界及实际上限都按生产合同；不是增加正文读取预算。

回放035原独立替换反例与未替换对照，先记录本修复前确实失败，再最小修复；同时覆盖异步发布期间重新定位的边界、quota/lease/缓存拒绝不泄漏。选取真实行为测试，不只镜像if。最终定向TS来源/Host/协议套件、双tsc、local lint、TS architecture按影响运行；Root串行build/lint，勿改共享产物。所有probe和Go/Node子进程退出Wait，离线Vault替身不冒充真实Obsidian。

如果037生成器尚未完成，身份修复可独立推进；长选区同一失败输入在其冻结后复验并记录对应SHA。

## Acceptance
原独立反例按相同输入转绿，正常/相邻负例保持，源码与相关生成物一致；所有实际命令/输入/退出码和未跑项可回读。沿原gpt-6.1-sol/xhigh实施偏好，不冒称底层模型鉴定。原035报告和未变证据保留；不得再委派、提交、推送、发布或归档。Root未要求全仓重复测试，按影响选择检查；不能以测试绿替代后续未参与实现者审查。

## Return
只写本TASK REPORT/logs及上列精确实现路径。REPORT首个h2前Session: 20261025T043239Z、Task: 038-source-identity-repair、Status: completed；h2聚焦交接、产物与验证、问题与下一步。给自有源文件和实际输入SHA、真实测试日志、共同接缝是否已冻结；所有writer/probe停止并Wait后，validate-dispatch return0，真实MESSAGE/FINAL交Root。不得写正式Ticket/Map/Goal/Evidence或他人报告，Root接收后才接纳候选。
