---
schema_version: 2
session: "20261025T043239Z"
task: "048-source-delivery-repair"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-04
---

# 046 来源历史投递与恢复快照修复

## Goal
按046最终正式finding修复原T04 Go与T05投递授权接缝。原 /root/credential_provider；仅Root实际派遣后启动。沿实现模型偏好，不再委派，不进入下一功能阶段。

## Inputs
repo /home/wta/orca/workspaces/obsidian-huhu/bot；HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715，Map13/Goal12。AGENTS、已读dev/I与T04/T05合同沿用。完整读046-events-approval-review最终REPORT及对应独立probe/原日志，固定原候选T06#review-input-r1 SHA a129b2b03c62625b541392a92321f9cf16d74383d2de85dbd3c3b44f92339371。Root实际交回接纳失败后才打开本写窗，当前模板不代表授权启动。

## Workspace and Scope
精确可写：native/huhubot/internal/adapters/outbound/sqlite/grants/access.go、delivery.go、store.go；native/huhubot/internal/adapters/outbound/sqlite/events/store.go；native/huhubot/tests/contract/access/delivery_test.go；native/huhubot/tests/contract/events/history_test.go、events_test.go、ts_test.go；本TASK REPORT/log。如必须新私有helper文件先报准确路径/用途给Root登记。T01API/schema、原T03execution scanner/batch helper、其它Go、TS客户端、锁/SQL/正式状态均冻结，不自行改。

1. 实际公开单Session、50个已完成Run/100条History、真实Source/Grant的独立输入在-race超250ms，真实HAP history返回REQUEST_CANCELED、writer0。保留原250ms、800subjects和全部权限断言，不用放宽时间/跳race/缩页/删source修复。先原封回放红灯，再分析重复SQL/解析。可以只在同一短Tx内批取不可变化的原始持久事实并复用decoder；仍逐消息校验Profile/Principal/Session-member/实际RunRecipient/recipient当前语义、parent/revoke/expiry/coverage/来源子集，时间要当前检查，不能缓存跨事务资格或省略缺失/外人/混合错误。
2. Snapshot把Run effective sources覆盖各条message。应从该message持久source_json给出真实来源，与History/SQLite一致；空来源保持空，派生assistant来源依其持久值。不仅改测试预期，不能将整个Run provenance误当每条message，也不能放松当前snapshot/body整体读取权限。

保持并行负载可解释：重ordinary/race性能窗口先协调Root，与049 TS轻测试/Root全构建错开。新的批取上界仍支持合法协议组合，不偷加“unique Grant最多800”等会拒绝本来合法800subjects多来源页的限制；有限chunks/内存和取消路径明确。旧CheckInTx/ReadDeadlineInTx单读所有校验与reason应保持，新增batch/单读等价与负例，参数化SQL/rows关闭不跨外部IO。

与049 TS owner配合：你唯一拥有Go tests/contract/events/ts_test.go，可加入其正式大事件修复需要的真实TS-Go回归（生产TS归049）。避免双方写同一测试。最终两作者停写后Root固定联合r2，全插件build/lint和受影响Lead真实重放，再050独立复审；本任务不自行宣称独立通过或全票done。

## Acceptance
046实际原输入红→绿：单Session100带来源History在-race同250ms正常送达，普通对照；尽可能兼顾已有最大800真实来源组合、有界分块和最末外人/缺失/撤权/到期/父撤权/替代Grant/mixed来源cache不污染。Snapshot公开CURSOR_EXPIRED压缩路径与History、SQLite同message sourceRefs完全一致，正文/seq/facts与授权保持。适用access/events普通/race/vet全部0、无数据race，保存输入/命令/exit；原无来源800绿不当作有来源覆盖。

## Return
REPORT首个h2前Session: 20261025T043239Z、Task: 048-source-delivery-repair、Status: completed；h2聚焦交接、产物与验证、问题与下一步。包含精确diff/hash、每finding归属/反例/修复证据、最终输入/工具链/原始命令exit和性能负载窗口。所有进程Wait、产品停写；return0后真实MESSAGE/FINAL，Root全读核验。真实模型/Obsidian/目标OS按LOG051用户后验，不访问凭证或旧默认D-Bus。
