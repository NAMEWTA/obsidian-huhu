---
schema_version: 2
session: "20261025T043239Z"
task: "150-resume-inbox-consumers"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-12
---

# 原协作补充消息消费者验证

## Goal

原145/148 owner native:/root/memory_access_repair 在146/147可信ResumeInbox合同上完成原两个补充消息红例的消费者迁移，原源码/API/权限/费用/Run与CP断言不弱化。148诊断已交149修Memory原拒绝点，不能覆写其历史。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，HEAD33c21e098ef3188cbab5a09f3e0a01fadb787715，Map39/Goal38/LOG127。用户授权完整28票55AC/Agent Team/代码层交付，真实操作后验；无Go后台窗口、提交推送发布归档或再委派。按Map→dev/testing→T11/T12/T13及146 resume-inbox-contract.md / api/resume_inbox.go实际冻结接口。普通补充经Decision.ResumeInbox.Messages进入原工具结果；Input.Messages继续空，初始ShortTerm/CP prefix不改；question答案仍在Children并有明确AnswerReceipts，不能猜Derived全表为已呈现。

原145两个目标：TestTaskReplySourceBoundaryAndWaitingUserSupplementReachActualResume（三变体）及TestUserSupplementToWaitingGroupMemberReachesSameCheckpointThread。148另一个question目标保持原断言，149已报告最小span修复后该原目标绿，最终回执以Root核验为准。

## Workspace and Scope

仅native/huhubot/tests/contract/delegation/reply_sources_test.go、tests/contract/groups/reply_test.go及这两个包已有short_term_assert_test.go内必要helper；所有生产/API/SQL/锁/其他测试只读。允许自己的REPORT/logs/manifest。原145/148材料不改，正式状态只Root。

## Acceptance

当前149独占Go并编译上述delegation原文件，开始必须只读，不写测试、不运行Go/Node/DB。Root明确149归窗后才能source-only；新断言逐项验证真实Decision packet的ID、Ref.kind/revision1/hash/thread、原正文、当前来源，并要求legacy Messages为空。不能只检查文本字符串出现。原CP内容、同线程、Run计数、来源越界拒绝、幂等回执、已结束model claim拒绝、slots/pins清理保持。重复同文不同ID不能误删，当前question答案另按原Children路径。

单纯迁移观察字段不能关闭真实SDK缺口；147三协议已实际SDK红，最终绿与146实际SaveResume持久记录必须共同核验。你只改测试并明确产品验证范围。Go检查待Root单独授窗，使用Go1.26.10固定输入/原输出/exit/Wait；先原精确目标与必要相关消费者，不全仓、不自行race/vet，结果后立即归窗。

## Return

先ACK与源码改动计划；最终REPORT首h2前Session:20261025T043239Z、Task:150-resume-inbox-consumers、Status:completed，包含原红/逐断言迁移/实际结果/未验边界/逐源hash。亲自validate-dispatch return0后MESSAGE+FINAL；不能签T14/Goal门。
