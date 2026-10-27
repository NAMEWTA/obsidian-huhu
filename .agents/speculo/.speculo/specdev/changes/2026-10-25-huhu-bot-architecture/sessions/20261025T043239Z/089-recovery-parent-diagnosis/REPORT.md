# 等待父任务候选页：公开可达性诊断

Session: 20261025T043239Z
Task: 089-recovery-parent-diagnosis
Status: completed

## 聚焦交接

**已确认原 T12 等待父任务扫描存在可公开到达的前页遮蔽。** 在未改动的 083 固定生产输入上，128 个公开受理的根真实产生 129 个 waiting parent。目标父任务位于第 129 位；其唯一叶任务公开取消后，目标已经具备完整、无正文的取消结果且所有 child slot 为 0，仍停在 waiting_children。随后只公开取消一个无关前根，同一个目标父/根便完成应用汇合，没有新增 Engine 调用。不是队列受理失败、模型并发耗尽、审批过期或实际效果派发。

本任务只诊断。生产、永久测试、081/085/086 等旧报告、正式 Evidence/Map/Goal 均未写入；未实施修复或推进 T12/T16/G1。原 owner `/root/credential_provider` 执行，按 [TASK](TASK.md)、dev/testing、SpecDev D 和测试可靠性规则保留真实失败与单变量控制，未另派代理。Root 在 088 实际检查 Wait 后明确交接唯一窄窗口才执行；Root 收到结果后明确要求封存，不追加 127 根重复正控。

### 固定输入与真正可达的前提

[00-input.json](logs/00-input.json) 从 083 只读快照复制其原 280 文件到本任务独立临时目录：树 SHA256 `f9853dac6bedee5433f1811b665057fa6c93bee7291e6b1eb2c62eed44584a69`，原/复制件逐文件均无漂移。原清单为 [083 输入](../083-recovery-review/logs/00-probe-input.json)，不是在 088 活跃共享源上取不稳定输入。原 `usage/waits.go` SHA256 `fc6161d2b6db30ff30402cfe6485bf148ed73b5b649875f43620ccea9b36325f`。

唯一新增文件是外部 `tests/contract/recovery/diagnosis089_parent_test.go`，完整执行字节保存在 [01 探针](logs/01-parent-probe.go.txt)，SHA256 `9d578468a9a1b8fa72c076ba13865e7bd68756095f41115468ceaadb9c0b2c7e`。没有 overlay 修改生产谓词，也没有伪造 SQL Run/parent/CP 状态。

1. `ExecutorPaused` 下经公开 Assistant/CreateSession/StartRun 受理 128 个独立 direct 根；每次根受理前的活动队列不超过既有 128 上限，没有先塞满队列后再非法新增晚根。关闭该 Core 并等待 Done 后，以同一 Profile、同一个真实 Executor 启动全部根。
2. 127 个前根各真实 delegate 一个叶；第 128 个根 delegate B，B 再 delegate 叶。根与 B 实际 Engine 返回 finished 后，由原 Finalize 持久 waiting_children/parent_result；每棵树累计最多 2 个子任务、深度最多 2，保留配置 3/32/4/8/8 及本机 WorkerCapacity16。
3. 每个叶通过真实 `note.write` Broker 生成效果、发布完整 CP，再进入 pending approval。受控 NoteWriter 只提供 Preview，实际 Invoke 必须为 0。审批寿命为 1 小时，触发时最早审批仍余超过 30 分钟；没有靠过期或已批准 continuation 推动任务。
4. 全部准备事实才触发取消：257 个真实 Run、Engine.Run257、129 个 waiting parent、128 个 waiting_approval/pending approval、child_slot 全为 0、accepted/preparing/running 全为 0。128 个根在任何子任务创建前已持久，目标 B 的实际 `(created_at,run_id)` 排位为 129。

## 产物与验证

唯一 Go 命令使用 Go1.26.10、`CGO_ENABLED=0`，只运行新诊断 case：

```text
go test ./tests/contract/recovery -run '^TestDiagnosis089WaitingParentBeyondFirstPage$' -count=1 -v -timeout=120s
```

实际工作目录/环境/探针 SHA 在 [02 原始输出](logs/02-parent-original-red.log) 与 [03 命令回执](logs/03-parent-original-result.json)。**真实 Go exit1，外层耗时 7.796 秒，case 5.82 秒，subprocess.run 已返回并完成 Wait**；没有用包装器 exit0 冒充业务成功。

| 阶段 | 真实观察与断言 |
| --- | --- |
| 取消目标唯一叶 | 公开 runs.cancel 同事务生成 canceled Run 和唯一 body-free `collaboration_result_deliveries`；目标父直接子任务非终态计数为 0。前 128 个父仍各有非终态子任务；目标父 rank129。 |
| 原行为红灯 | 有界观察 1.524852826 秒，目标始终 waiting_children；等待父计数仍 129，所有 child slot 为 0，Engine 调用仍 257。探针显式 `t.Errorf` 保存此实际遮蔽，再继续执行控制，因此后面的成功没有覆盖 exit1。 |
| 同 DB 单动作反向控制 | 只公开取消 `roots[0]`，即一个与目标无关的前根；没有重开、resume、SQL 修改、批准目标、变更限额或增加任务。排在前面的等待根由 128 减为 127，同一目标父与原目标根随后 succeeded。 |
| 结果与清理 | Engine.Run257 不变、Engine.Resume0、Host Invoke0；目标父原始 `TARGET_PARENT_RESULT` 保留，唯一 succeeded/partial 结果及 `CHILD_PARTIAL_FAILURE` 正确保留，父完成事件只有 1 条。剩余 pending approval126、expired0、child_slot0。实际 Engine producer 均已返回，Core.Close/Done 完成。 |

本轮不是另一份审批扫描或 accepted/recovering 扫描反例：触发时 accepted/preparing/running 为 0，所有审批均未决，目标父是**无 CP 的实际应用汇合**。088 正修的原 T03/T06 主扫描问题不会改变本次已固定的原 T12 查询事实。

### 因果结论与证据界限

原 `nextReadyParentInTx` 先按 `(created_at,run_id)` 取 `LIMIT 128`，关闭 rows 后才对这 128 个候选调用 `waitReadyInTx` 和当前 `ClaimInTx`。前 128 个全部不 ready 时返回 nil，没有下一页或跨 Claim 游标；Executor 下次仍从相同前缀开始。目标虽 ready，却没有进入资格/slot 判定。一个无关前根取消后退出该 WHERE 集合，目标刚好进入第一页并完成，直接区分了页遮蔽与目标自身不可执行。

| 候选解释 | 当前区分性事实 |
| --- | --- |
| 固定前页导致后方 ready 父不可见 | 129 个真实父、目标 rank129；仅取消一个无关前根即同身份完成，符合该机制。 |
| 4/8 子槽或 Worker16 被等待任务占死 | 触发与观察期间 child_slot0，所有 producer 已结束；没有活跃模型，控制也没有释放在途 producer。 |
| 目标 CP、效果、来源或持久结果损坏 | 目标是无 CP 的应用结果汇合；同一持久结果无需新模型即成功，完整原正文/partial/唯一投递保持，实际 Invoke0。 |
| 审批到期或隐含新工作解锁 | 寿命 1 小时、expired0、Engine257 不变；控制仅一个公开取消动作。 |

1.525 秒是本诊断的有界观察，不是 Spec 的吞吐 SLA，也不单独声称实测了无限等待。确认结论由稳定前提、实际失败、查询/循环结构和同 DB 单动作反向控制共同支持；本轮只执行一次该最小页数边界构造，不宣称复现率或所有等待类型均已覆盖。未运行 127 根额外控制、race、全矩阵、真实模型、用户 Vault、Obsidian、目标 OS 或任何凭证探针。

[04 源回读与 Wait 回执](logs/04-source-readback-and-wait.json) 证实原 083 快照及执行副本的全部 280 原文件前后 SHA 无漂移。共享 checkout 正由 088 按其他授权维护，本报告不把他人的变更冒称为“全仓零变化”。本任务没有活跃 Go/Node/Runner 或遗留 producer；独立外部源码复制件保留供复验，完整探针和输入 SHA 亦在本任务 logs。唯一 Go 窗口已实际通知 Root 和 088 释放。

## 问题与下一步

请求 Root 为原 T12 owner 开精确实现窗口，而非本任务直接修生产。最小业务 seam 是 `native/huhubot/internal/adapters/outbound/sqlite/usage/waits.go` 的等待父候选页，必要时原 `usage/store.go` 保存私有扫描状态；若公平游标需外层 Claim 的提交成功回调，应由 088 原 T03 owner 协调 `execution/executor.go` 的 adapter-only 合同，不另造公共 API 或改 SQL 迁移。

修复应保留每页有限（当前 128），跨轮 keyset 前进并能有界回卷；不能因为不 ready、当前恢复闭门或暂时 slot 满就永远重扫同一前缀。当前 owner/Grant/recovery/cancel、wait relation、真实 slot 和最终 claim 仍在同一事务内重验，禁止跨请求缓存“已授权”。游标只在外层 Claim 真正 commit 成功后发布；最终 Claim 拒绝或 SQL/commit 失败不得提交已消费 parent_result、来源/派生事实或槽位而返回无 Work。不能通过删前项、抬容量/并发、无界单事务扫描或吞 SQL 故障掩盖问题。

永久回归可继承本真实 128 根/129 父构造，修复后取消目标叶即可完成，其他前根仍等待；保留唯一结果、无额外 Engine、CP/partial/derived、slot/pin 与幂等事实，并验证取消前项、分页回卷、新候选、当前权限/恢复门、statement/commit 失败不推进游标或消费结果。具体写集、验收闭包和独立审查由 Root 后续任务确定。`completed` 仅表示本次只读诊断已交付。
