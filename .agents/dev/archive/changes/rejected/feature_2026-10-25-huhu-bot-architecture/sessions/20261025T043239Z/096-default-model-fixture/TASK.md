---
schema_version: 2
session: "20261025T043239Z"
task: "096-default-model-fixture"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-03
---

# T03 默认真实装配旧负控维护

## Goal

修正旧空模型默认未装配预期，使既有T03回归准确消费新默认Chat引擎；只维护一份原owner测试。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715。Map23/Goal22补充 evidence/T-08-logs/default-model-fixture-map23.md。093先结束并正式交回，然后Root原生派发本TASK才开始；不改093报告或TASK。原owner native:/root/foundation_go，用户已授权完整28票55AC代码和Agent Team，真实模型/Obsidian/目标OS用户后验，无提交推送发布归档。沿已读SpecDev I和dev测试/架构规则，读取本次精确窗口与T03当前票；无UI/新依赖/生产权限扩张。

原workflow_test.go SHA f71fde5f5b470d3bf54a20441af4ec22f4e7d2d92d4ce538fe795b280e19951b。092已独立实际重现空配置和不支持协议安全reason被泛化，负责在common下使用原MODEL_DRAFT_INCOMPLETE与ADAPTER_NOT_ASSEMBLED；本任务不得实现第二套处理或改Executor。当前092持唯一Go窗口，收到Root或092明确实际Wait/候选稳定通知后才运行本票单例。

## Workspace and Scope

仅 native/huhubot/tests/contract/chat/workflow_test.go 及本任务REPORT/logs。保持原两个partial子例、其他所有用例不变；只更新 `TestFailedPartialResultAndProductionUnavailableRemainHonest` 尾段默认seed空模型的理由预期与必要的真实attempt0断言，说明实际模型已默认装配，配置缺失拒绝仍诚实。所有生产、锁、API、Map/Evidence/Skill和他人文件只读。

## Acceptance

固定GOTOOLCHAIN=go1.26.10、-mod=readonly运行原单例；在当前生产合理配置缺失语义下通过，旧partial断言保持、默认缺配置usage=nil且实际attempt0，无外部网络。原生产目标红由092日志引用，不制造重复counterfactual或跑整个大队列包。保存修改前/后精确SHA和diff，实际输入/命令/exit/Wait与失败分类；若发现生产不满足合同则交092原owner，不越权修。

## Return

REPORT首h2前Session: 20261025T043239Z、Task: 096-default-model-fixture、Status。只写本任务报告/logs；交回精确一文件SHA/patch、实际命令与完整Wait、未运行项；亲自validate-dispatch return0后停写，native MESSAGE+FINAL。Root结合T08共同输入与独立审查推进正式状态，本候选不得自行宣称T03/T08完成。
