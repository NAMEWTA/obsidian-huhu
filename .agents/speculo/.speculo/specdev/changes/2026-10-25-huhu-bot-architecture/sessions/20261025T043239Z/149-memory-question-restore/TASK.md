---
schema_version: 2
session: "20261025T043239Z"
task: "149-memory-question-restore"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-14
---

# 问答后的实际记忆恢复拒绝

## Goal

原Memory owner native:/root/foundation_research 接148精确错误，定位问答后中层B恢复的 `CONFLICT: MEMORY_INPUT_STATE_INVALID` 真正分支并作最小修复。保留已经通过的143性能/资格合同，不以变更timeout、CP前缀或吞掉校验绕过。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，HEAD33c21e098ef3188cbab5a09f3e0a01fadb787715，Map39/Goal38/LOG127。全部28票55AC、Agent Team、代码层交付已授权，真实操作用户后验；无真实Provider/凭证、提交推送发布归档、再委派。按Map→dev/testing→T14/T03/T12/T16实际边界。143旧REPORT/manifest不动。

148 REPORT与logs/04-question-diagnostic-go.jsonl、08-claim-diagnostic-go.jsonl：原 `TestQuestionTaskReplyUsesActualSenderScopeAndSupportsWaitingUserAnswer/waiting-user` 已正确投递question答案/真实message ID/hash/revision/thread，释放leaf后leaf succeeded，B waiting_children/root waiting_children。实际Core `ReadyParentInTx` 回滚Tx返回B/resume_children/err nil；随后真实Claim work=nil、api.Fault CONFLICT MEMORY_INPUT_STATE_INVALID。两次390输入无漂移，Wait约9.46/9.37秒，原8秒等待/2次Resume均保持。临时unsafe诊断已全部清理，145原reply_sources_test.go SHA a58064f3ac83296d4ad5acdceb32021c45cdd5c64e987c5857668de71df52b19恢复。

注意：question metadata revision+1不是已证根因；memory/sources.go对thread_message稳定body Ref.Revision='1'。仍需实际分辨ReadInput、ReadContext或其内部资格的拒绝点。原148报告只定位到边界，不冒称完整根因。

## Workspace and Scope

仅原T14生产 `native/huhubot/internal/adapters/outbound/sqlite/memory/` 内实际命中的最小文件及对应private-memory测试；可在该本包新增有意义回归。原delegation/reply_sources_test.go作为真实消费者只读，原8秒/2次Resume/来源/资源断言不改。API/Executor/usage/grants/common/DDL/锁只读，越界需Root协调。可为精确诊断在本人Memory源临时加观察，但必须保留原字节/patch/执行输入、最终清除观察并回读；不得把仅诊断过的字节冒称最终绿。

146目前source-only写API/Executor/usage/messages，147在冻结API上写common和两个协议checkpoint；你先只读定位并准备最小反例，不能运行Go/Node/DB。报告必要实验后Root冻结所有写入再授唯一Go窗。实际生产修复保持原权限、来源、manifest/body hash、初始prefix与稳定origin；不新schema/第二writer。

## Acceptance

先锁定可证伪的实际拒绝分支和单变量因果，再最小修复。授窗后原waiting-user完整树能成功、两次Resume、slots/pins归零；当前资格与正文/身份冲突负控仍拒绝。对受影响ReadInput/ReadContext已有安全测试作定向回归；不重复无关800性能，除非修复改变祖先算法或风险。实际Go1.26.10固定输入/原日志/exit/Wait；重检查均Root唯一窗，结束立即停写归还。Root最后共同回归/三协议E2E/独立双轴，不以本候选签整票。

## Return

先ACK与实际方案，报告已写/未写边界；最终REPORT首h2前Session:20261025T043239Z、Task:149-memory-question-restore、Status:completed，逐源前后hash/mode、真实根因/对照/安全负控/未验证边界。亲自validate-dispatch return0后MESSAGE+FINAL。
