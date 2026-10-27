# 等待父任务公平分页修复

Session: 20261025T043239Z
Task: 090-recovery-parent-repair
Status: completed

## 聚焦交接

本任务修复 089 已确证的等待父任务前页遮蔽：每轮仍最多检查 128 个真实候选，按稳定 `(created_at,run_id)` keyset 跨 Claim 前进，短页耗尽后回卷；等待关系、当前恢复/权限/取消门与子槽仍逐项在真实 SQL 事务内检查。T12 不持有独立进程游标，也不缓存资格。唯一原 T03 消费者在外层事务真正 commit 后才发布进度；最后 Claim 拒绝或 SQL/commit 失败整笔回滚。

作者 `/root/credential_provider`，按 [TASK](TASK.md)、[精确补充](../../../evidence/T-16-logs/parent-scan-supplement-map21.md)、既有 dev/testing 与 SpecDev I/TDD/可靠性合同实施，未另派代理。原 089 [报告](../089-recovery-parent-diagnosis/REPORT.md) SHA256 `abf2fb2d24d1dd20305b306ca092436abdff5f2cbddd7782272dfbd1065abe29`、原探针/红灯/无关前根单动作控制全部只读保留；本任务不改正式状态，不宣称 T12/T16/G1 代码门通过。

### 唯一内部合同与精确写集

088 原 owner 唯一维护 adapter-only `execution.ParentCursor{CreatedAt,RunID string}`、`ParentReady{RunID string,Result *api.EngineResult,Next ParentCursor}` 和 `ReadyParentInTx(ctx,tx,after)(ParentReady,error)` 的 TreeControl/Claim 接缝。T03 私有 `parentAfter` 只在 `WithinTx` 返回成功后发布；原最后 Claim 门继续保留并以错误使已选中结果整 Tx 回滚。没有新增公共 Application/HAP DTO、schema、SQL 迁移或依赖。

本作者仅写三个文件，最终 SHA 在 [12 自有冻结 r2](logs/12-own-freeze-r2.json)，tree `a4f3236a1ca31ea7ca7fde24e436c32095ef696cafbb310b4d23c18295cdc627`；[02 初版冻结](logs/02-own-freeze-before-checks.json) 保留，r2仅测试准备预算变化、两生产不变：

| 文件 | 本次改变 | SHA256 |
| --- | --- | --- |
| `native/huhubot/internal/adapters/outbound/sqlite/usage/waits.go` | 既有 selector 增加实际 keyset 与 Next；满页保末 key、提前选中停在该项、短页完全耗尽才置零回卷；原 SQL 状态/producer 条件与 waitReady/Claim 检查保留。 | `8f5e2f60e82f84e76561e7bea57da185f01e083393f114857032530d2a2b8ed2` |
| `native/huhubot/internal/adapters/outbound/sqlite/usage/finalize.go` | 唯一公开 adapter 方法消费 Next，并把原结果汇合主体提为私有 helper；原正文/partial/CP/来源/权限/派生/结果消费逻辑没有改写。 | `65c14df39912133c10437cb49d5a04e7621793f3dc2fb1f002992366565d9536` |
| `native/huhubot/tests/contract/collaboration-policy/parent_page_test.go` | 公开 128 根/129 父公平页与回卷永久例；真实中断树恢复闭门不遮蔽新 ready 父的永久例。 | `85abbca8ebe2e99536223d4e77cbf8a6d50010d6a9b3973fc9c4a960bf7c3a02` |

[00 实施前摘要](logs/00-own-before.json)、[waits 最小差异](logs/waits-minimal.diff)、[finalize 最小差异](logs/finalize-minimal.diff) 可回读。088 的七个文件由其本人实现和冻结，不计本作者写集。

## 产物与验证

### 永久反例先在原输入真红

Root 授予联合源码编辑窗口后，两位完成签名切换并停止写入，才另明确授予本作者唯一旧源检查窗口。只向独立 083 复制件添加**初版同一份永久测试文件**，未恢复/变异共享新源；[01 输入](logs/01-old-permanent-input.json) 原 280 文件树 `f9853dac6bedee5433f1811b665057fa6c93bee7291e6b1eb2c62eed44584a69`，测试 SHA `b16d8bfe2b1956f60dd4c5effd7151e8935a7d37fd31c9acb18c2b2efc82afbe` 与02初版一致、没有新 ParentCursor 编译依赖。后续 r2 只改准备预算，该次旧红已真正到达同一129父触发前提并失败在不变的5秒结果断言，Root明确接纳旧SHA/原始红按影响复用，不机械重复。

```text
GOTOOLCHAIN=go1.26.10 CGO_ENABLED=0 go test ./tests/contract/collaboration-policy -run '^TestWaitingParentBeyondOnePageReclaimsReadyResultAndRevisitsEarlierWaiters$' -count=1 -v -timeout=120s
```

[03 原始红](logs/03-old-permanent-red.log) / [04 实际命令回执](logs/04-old-permanent-result.json)：**actual exit1、Wait10.375s，case8.67s**。真实公开受理达 128 根、257 Run/Engine257、129 waiting parent、128 pending approval、slot0、目标 rank129 后，仅取消目标唯一叶；原父在永久完成断言的 5 秒有界等待后仍 `waiting_children/CHILDREN_ACTIVE`。这是目标行为真红，不是编译、初始化或超时强杀；没有取消无关前根来造绿。

旧副本全部 280 原字节前后 drift=[]；Core.Close/Done 和 Go 子进程全部 Wait。[05 回读](logs/05-own-after-old-red.json) 记录共享三文件也无漂移。窗口已实际交还 Root，再由其授予 088 唯一联合检查，未另跑新源定向绿或并行 race。

### 永久覆盖与联合验证接缝

- 主例 `TestWaitingParentBeyondOnePageReclaimsReadyResultAndRevisitsEarlierWaiters` 经公开 Assistant/Session/StartRun、真实同 Executor delegate/Broker/完整 CP 形成 129 个等待父。保持 3/32/4/8/8、Worker16、活动根队列128；pending 审批寿命1小时且最早仍余超过30分钟，不靠过期推动。修复后仅取消目标叶，原父/根应成功，127 个前根仍等待；保 Engine257/Resume0/Invoke0、原结果正文、结构化 partial、唯一投递/完成事件和目标 pin 释放。随后只取消最早叶，验证回卷重新发现旧 key，模型调用仍不增加。
- `TestClosedRecoveryParentDoesNotHideLaterNewReadyParent` 从真实运行叶 Close/Done 后重开产生恢复树屏障，公开取消其叶使旧父关系 ready，但仍不点击 resume；另一公开新父实际等待、实际子结果返回后应汇合。旧父结果仍 waiting、旧树不重新执行、body-free 取消结果唯一、槽归零，证明游标不代替当前恢复资格。
- 088 维护的原 chat 事务例覆盖真实 ReadyParent 已占 slot/消费结果后 StopAdmission 使最后 Claim 拒绝、整 Tx 回滚，以及真实 commit 失败和取消边界；本任务不在另一 owner 测试里复制相同 seam。

共同输入由 088 采 [11-joint-before-checks.json](../088-recovery-claim-repair/logs/11-joint-before-checks.json)：381 文件 tree `23f19c050ee6e58ee9295c77a84b97d939304d0adae45bcd63e2a6c7b6ca88fb`，双方 3/7 文件 SHA 全匹配，相对前轮精确十路径差异。[06 本作者独立回读](logs/06-joint-readback.json) 逐项 drift=[]。

088 的 [12 normal 原始日志](../088-recovery-claim-repair/logs/12-joint-normal.log) / [命令回执](../088-recovery-claim-repair/logs/12-joint-normal-result.json)：Go1.26.10、CGO1、`go test -mod=readonly -p 1` 七包 chat/approval/recovery/delegation/collaboration-policy/groups/effect-reconcile **actual exit0、Wait42.818s**，381 sourceDrift=[]。新主例3.55s、恢复闭门新父例0.10s，真实结果、回卷与所有原调用/slot/partial/pin断言均绿。这是 088 实际执行，本作者按同一输入回读引用，不冒称自行重跑。

首轮五包 race [13 原始输出](../088-recovery-claim-repair/logs/13-joint-race.log) 实际 exit1、Wait368.610s，381 sourceDrift=[]。approval/recovery/delegation 包通过；chat 的 `TestClaimPassesClosedRecoveryPagesWithoutChangingOtherTrees` 两子例在 setup 屏障失败（`n=2` 是第3棵 root，先前消息误述第2棵已纠正），本任务主例也在行172等不到 targetLeaf 信号（case48.42s），尚未形成129个等待父的触发前提；小恢复闭门例1.48s通过。不能把这个 setup 超时当父分页主断言失败或永久死锁，亦不能据 normal 绿称首轮 race 绿。该失败及相关原始输出均保留。

随后 Root 明确交接给本作者唯一父 case 诊断窗。[07 准备输入](logs/07-parent-diagnostic-prepared.json) 是独立固定381复制件，只替换同一测试文件的失败分支日志，原30秒与全部成功断言未改。[08 实际输出](logs/08-parent-observe-race.log) / [09 回执](logs/09-parent-observe-result.json) `-race` actual exit1、Wait49.063s（case46.08s），无DATA RACE。超时只读同一 SQL 快照显示：目标根 waiting_children，B仍 accepted/revision1/空claim/slot0，尚未进入 Engine；总 accepted40、preparing2、running6、waiting_approval80、waiting_children128，槽恰为合法上限8；普通127叶中80已完成真实CP待审批，39 queued、8进行中，无 Engine error。它还没构造出129父的触发前提，不能解释为已ready父被分页拒绝；单现场亦未单独证明未来一定完成。[10 回读](logs/10-after-diagnostic-readback.json) 外部381、共享381、自有三文件均 drift=[]，所有进程Wait后立即释放窗口。

### 仅测试准备预算修正及最终局部绿灯

Root完整回读上述现场后接纳 [11 最小差异](logs/11-setup-budget-proposed.diff)：从 startGate 释放起使用**单个90秒总 setup context**，替代原三个各30秒准备分段；不逐阶段刷新预算。128个真实CP与SQL事务在-race下的准备进度是该修改依据，不是 Spec 生产吞吐保证，不能宣传为生产性能优化。两生产文件从初版起未改，原目标/回卷5秒以及257/129/128、rank129、slot0、审批未过期、结果/partial/pin/调用不变量完全保留。Root待088实际释放后才准许精确应用唯一测试文件；这不是无改动择绿或继续调阈值。

最终 [13-joint-input-r2.json](logs/13-joint-input-r2.json)：381文件 tree `c2ca2c43d48ac50f3181109f7abd638d00ecaf97bd5b6732c80229946edc56c8`，较088共同11仅此测试准备预算变化。本作者按Root唯一窗口顺序运行两个新用例，Go1.26.10/CGO1、`-mod=readonly -count=1 -timeout=180s`，进程预算覆盖setup与cleanup；任一失败即停止后续。真实结果在 [16 汇总](logs/16-parent-checks-r2.json)：

| 检查 | 实际结果 |
| --- | --- |
| 两新例 normal，[14日志](logs/14-parent-normal-r2.log)/[回执](logs/14-parent-normal-result-r2.json) | **exit0、Wait4.159s**，381 sourceDrift=[]。 |
| 相同两新例 `-race`，[15日志](logs/15-parent-race-r2.log)/[回执](logs/15-parent-race-result-r2.json) | **exit0、Wait73.669s**；主例70.38s、小例1.43s，无DATA RACE，381 sourceDrift=[]。 |

最终race真实形成完整前提后，只有目标叶取消即使原父/根成功，127个无关前根仍等待；257次Engine/0Resume/0Invoke、原结果/partial唯一、目标pin释放、slot0与随后早key回卷全部通过，没有靠取消无关前根或重开任务解锁。全部实际Core.Close/Done、Go命令与生产者已Wait，窗口已明确释放。

初轮七包normal与approval/recovery/delegation三包race的生产/用例字节未因该测试准备修正变化，按Root允许的精确影响复用；不声称在r2重跑七包/五包矩阵。chat两setup失败由088原owner收口，剩余全候选vet/Go架构由088执行，本报告完成时尚未接收其最终回执；整体候选验收不能由本局部两例绿替代。

## 问题与下一步

当前自有生产/测试已停止写入，无 Go/Node/Runner/producer；原始失败、只观测overlay和准备预算差异均保留。未运行真实模型、Obsidian、用户 Vault、目标 OS 或任何凭证/keyring/D-Bus 探针，未提交/推送/发布/归档。公共 TS/API/schema/build 未变的证据按精确 SHA 复用，不把本次 Go 结果当用户现场验收。

本任务局部修复与必要normal/race已交付，按Root要求不再等待088才归还实现槽；最终自有摘要/命令Wait及亲自return结构回执随交接日志可回读。后续全候选vet/架构、Root固定输入E2E和独立复审、当前T12/T16/G1代码门及正式Evidence仍由Root组合接纳。`completed`仅表示090派遣交付，不把整体未完成项写成通过。
