---
schema_version: 2
session: "20261025T043239Z"
task: "017-foundation-lease-repair"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-01
---

# T-01 第二轮独立审查修复

## Goal
修复014 STD/SPEC-R2-01：schema通过但无法有限解析的expiresAt不能取得Host调用资格；严格防止NaN落入未过期分支。

## Inputs
工作区/home/wta/orca/workspaces/obsidian-huhu/bot、base33c21e098ef3188cbab5a09f3e0a01fadb787715。复用已读当前dev/T-01及references，Map8仅新增T02未来测试路径。完整读014 REPORT和raw-probes对应反例；原008四项已独立通过，不重复重写。原用户LOG-051要求完整代码层交付，仍使用既有requested gpt-6.1-sol/xhigh实现身份。

## Workspace and Scope
唯一TS owner：src/modules/huhubot/core/protocol/connection.ts及相关connection/runner测试。可维护desktop/transport/runner.test.ts以验证016实际Go Unicode修复，其他API/schema/package/Go只读；不得自行收窄RFC3339公共schema。只对租约消费加明确finite/期限判断，安装与每次Host invoke/queryReceipt都安全。Go在015释放前冻结，先独立完成期限修复；Unicode真实TS→Go测试等016通知修复就绪再执行。

## Acceptance
先保留2016-12-31T23:59:60Z真实连接反例红灯；安装及派发检查parse结果finite，闰秒不可解析/普通过去值都不调用Host；合法未来lease仍可正常invoke/queryReceipt。错误回执不包含私密原值，不修改已有capability/workspace/lease边界。与016协调ASCII/中文/补充平面128/129的四普通字段真实TS→Go行为，wire字节cap保持。定向新例、完整huhubot测试、production/test tsc、定向lint/架构；full build/lint由root串行汇合。

## Return
仅写所属生产/测试文件及本任务REPORT/原始红绿日志/源码hash，不改正式Ticket/Map/Evidence/其他TASK。REPORT首个h2前Session: 20261025T043239Z、Task: 017-foundation-lease-repair、Status: completed；三标题聚焦交接、产物与验证、问题与下一步。列实际命令/exit/测试观察与未验证项，completed只是候选返回。最终return校验、停止所有writer/子进程并报冻结。不要再派遣，不提交/推送/发布；真实用户模型/Obsidian/OS操作留user-owned。
