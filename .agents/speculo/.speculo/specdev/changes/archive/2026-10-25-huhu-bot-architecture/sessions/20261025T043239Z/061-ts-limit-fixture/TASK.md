---
schema_version: 2
session: "20261025T043239Z"
task: "061-ts-limit-fixture"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-01
---

# 当前限制合同的 TS 测试夹具维护

## Goal
原 /root/foundation_client 在当前 Map16/Goal15 已打开的 T01 维护内，修正原054测试仍使用旧限制值导致的实际消费失败；沿原实现模型偏好，不再委派。

## Inputs
repo /home/wta/orca/workspaces/obsidian-huhu/bot，HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715。AGENTS、dev、I、T01原TS精确写集、LOG079/082及当前唯一api.ts/schema只读；054已交回，报告及原始日志保持历史。Root实际 `evidence/T-07-logs/lead-current-ts-consumers-r1.log` 为151测试中150通过、1失败，进程exit126/Wait，不把退出码猜为环境故障。connection.test.ts:98的4/16/32/64/16越过当前3/32/4/8/8 schema，预算响应被严格拒绝。Root真实TS-Go预算/limits消费已绿，当前没有证据要求放宽产品校验。

## Workspace and Scope
唯一产品仓库可写路径：src/modules/huhubot/core/protocol/connection.test.ts。只将该初始预算测试的限制夹具改为真实默认3/32/4/8/8；原CAS、严格响应、断言保持。若有其他实际原因先报告Root，不放宽validator、不改API/schema或生产代码。自有TASK/REPORT/log可写，其他作者报告、正式Evidence/Map、锁、构建产物只读；不提交推送发布。

## Acceptance
先完整读Root原红日志和实际schema，保留其SHA。只运行该connection.test.ts真实Vitest定向并记录实际退出/Wait与前后单文件diff/摘要；Root随后运行151全消费者及build/lint，不重复Go/Host E2E。该修复为测试输入跟随已批准共享合同，不能冒称发现产品权限放宽问题。所有进程停止后交回。

## Return
REPORT首h2前Session/Task/Status完整，列旧/新单文件SHA、当前schema/api摘要、实际命令/退出与原失败处置；return0后实际MESSAGE+FINAL。原054 REPORT不修改，以本次独立小任务记录当前维护。真实Provider/Obsidian/目标OS仍用户后验。
