---
schema_version: 2
session: "20261025T043239Z"
task: "039-grant-idempotency-repair"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-05
---

# Grant重试意图摘要修复

## Goal
修复035固定候选中已证实的原合同缺陷，交回可复审代码，不扩产品范围。仅Root实际followup_task派遣后开始。

## Inputs
工作区/home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，base33c21e098ef3188cbab5a09f3e0a01fadb787715，Map10/Goal9。用户LOG047/051授权完整代码与Agent Team，现场由用户后验，不需再次许可。复用已读Map→dev适用参考→当前T01/T05与I风险/测试规则。035-chat-access-review固定输入evidence/T-03.md#review-input-r1（131文件/36来源，SHA2a43d12b56b6e68c676ef89348295bbacc5ad3e496d5599e0fece0846968401d）；完整报告与对应独立原反例须在实际派遣后回读，未派遣时不可自行开始。原失败输入和日志不改写。

## Workspace and Scope
你是原credential_provider。最小修复035的Grants.Create/Revoke对相同idempotencyKey和业务参数、仅更换传输commandId返回IDEMPOTENCY_CONFLICT的问题。按照既有业务命令合同区分attempt与intent，摘要只排除传输尝试身份，不能通过忽略真正业务输入/expectedRevision/profile/epoch绕过冲突和CAS。

只写native/huhubot/internal/application/access/grants/service.go与native/huhubot/tests/contract/access/access_test.go；如确需本application目录的针对性测试可新建service_test.go。不改共享API/schema/commands组件、SQLite实现/005迁移/其他凭证实现/Go锁/工程/正式状态或他人文件。复用现有成熟归一化机制或最小纯处理，保持包边界和错误处理。

从真实公共Facade/SQLite记录Create和Revoke仅换commandId的原失败/正常原ID对照；最小修复后同意图只得到原Grant/Receipt、无额外持久变更，异业务输入仍冲突，已撤销create重放不恢复active，旧epoch不重放。保留已有并发/CAS检查，检查必要race/vet及完整access suite；无新的真实keyring/模型/Vault活动。Root最终统一集成和独立复审。

## Acceptance
原独立反例按相同输入转绿，正常/相邻负例保持，源码与相关生成物一致；所有实际命令/输入/退出码和未跑项可回读。沿原gpt-6.1-sol/xhigh实施偏好，不冒称底层模型鉴定。原035报告和未变证据保留；不得再委派、提交、推送、发布或归档。Root未要求全仓重复测试，按影响选择检查；不能以测试绿替代后续未参与实现者审查。

## Return
只写本TASK REPORT/logs及上列精确实现路径。REPORT首个h2前Session: 20261025T043239Z、Task: 039-grant-idempotency-repair、Status: completed；h2聚焦交接、产物与验证、问题与下一步。给自有源文件和实际输入SHA、真实测试日志、共同接缝是否已冻结；所有writer/probe停止并Wait后，validate-dispatch return0，真实MESSAGE/FINAL交Root。不得写正式Ticket/Map/Goal/Evidence或他人报告，Root接收后才接纳候选。
