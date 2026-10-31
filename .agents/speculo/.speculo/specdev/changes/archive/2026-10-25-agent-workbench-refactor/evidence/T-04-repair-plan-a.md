# T-04 A：独立审查 F1/F2/F3 的最小修复设计（只读）

当前仅设计，不实施。工作区 `/home/wta/orca/workspaces/obsidian-huhu/terminal`，branch/HEAD 沿 Root 已固定的 `NAMEWTA/terminal` / `33c21e098ef3188cbab5a09f3e0a01fadb787715`；GP-017 / Map18。生产输入仍为 Root 冻结的 `6b88551127001cc9d60ee42794f8d450adeaa2d6cbe900de6daed1d36d129516`。本轮没有运行 probe、测试、lint、build、helper、target 或 Git；没有写仓库/正式证据/native/UI。

已回读 `/tmp/huhu-t04-review-round1.md`、四组 probe 源码/日志和生产调用链。该报告当前两轴 request-changes；本方案响应其 F1/F2/F3 满足条件，不冒充第二次独立审查或新的验收结果。原 probe 实际 child exit 为 **126**，不能改写成 1；这里只复用原始红灯，不声称自行复现。最终 reviewer 回执及修复 Packet 仍由 Root 接续。

## 1. 修复边界与不变量

- 不引入新运行平台/持久 store/共享全局重试器；TerminalSessions 仍唯一运行 owner，SpaceService 原单 queue/verified JsonStore/WriterLease 仍唯一业务 writer。
- 请求结算不等于清理完成；root exit 不等于 cleanup confirmed。持久 Session、runtimeId、捕获 generation/lease+sid 三层身份保持。
- observer 的 timeout/abort 只停止观察；已接纳的 filesystem write、已发送 stop/spawn 不能被称为取消或回滚，不自动重发。
- 观察结束后仍未结算的写留在**原 owner 隔离**中；不得替换 queue tail、提前 close writer、允许第二实例覆盖，或释放 archive gate 后让旧取消标记/归档晚写穿透。
- native cleanup 不等待可能永久挂起的磁盘 Promise。保留 output→headless parse→captured ACK 与 parser reply 到原 native 清理结算，Browser Cookie/history lease 独立。
- 恢复底线仍为 spawn 前 verified unconfirmed attempt；新流程不能为了快速退出覆盖它为成功、伪造 exit、自动重启或按旧 PID 清理。

## 2. F1：partial/unknown 不能永久封闭原 scope 的显式 stop/force

### 实际链与根因

`WorkspaceService.stopManaged/archiveManaged → sessions.requestManagedStop`。`sessions.ts:424–426` 仅在 termination 缺失或 cleanup=pending 时 sendStop；自然 root code0、8s 后 partial 时首次请求零发送。`416–418` 的 force 仅允许 stop-requested，前一次马上 settled/partial 后升级也零发送。probe 的同 captured helper/sid 直接 force 后收到 confirmed/0，证明该场景 native 仍拥有可控范围；不需要改 C 源。

### 最小方案

1. 将“是否需要控制”与“上次观察是否结算”分开。跳过控制的充分条件是 `terminationConfirmed(evidence)`；仅 root exited、numeric exit、partial、unknown、stop.phase=settled 均不足。
2. 首次显式 stop 创建一次 requestId/requestedAt/deadline；stage reserved/preparing 仍直接 not-started/cancelled，不发送 native。spawn-sent/adopted 且 cleanup 未 confirmed 时，向 entry 捕获的 transport 发请求，不能转向 ensureHelper/current helper 或 Session.end（后者 connection=exited 时无效）。
3. force 从 false→true 的升级在未 confirmed 且原 scope 仍可控时允许发送，即使先前观察已 settled；保留原 requestId、requestedAt、deadline，不重置 native Stop.at。重复相同请求/force 不无限重发。无 transport/已失联不创建新 helper、不改用新 sid，保留 unknown/可查询失败。
4. 对“发请求之前已有 partial”的新 stop，避免立即用旧 evidence 又 settle 本次观察：内部记录本次发送前的 notice sequence（字段仅 ManagedEntry），在剩余预算内等待原 scope 的新 notice；旧 evidence 仍如实展示，不能先改成 confirmed。stopObservation 在 stop 正等待新证据时以该 stop 的 phase 为准，不再由任意旧 non-pending evidence 抢先判 settled。同步 fixture 回调也必须捕获：先登记 sequence/等待状态，再 send。
5. force 在旧截止时间之后仍可把明确控制意图送达同 scope，但不能重开观察预算；当前调用返回 partial/unknown/超时，后续真实新 evidence 可更新查询/同 attempt checkpoint。已有首次 stop 的重入不借 force 延长生命周期；自然 root 观察与**首次显式 stop**是原 C 已区分的阶段，不擅改 Rust deadline。
6. 旧 helper 即使 end 已发送，numeric exit 仍不能证明 cleanup；断线/不可控范围保留 unknown。新 notice 仍按原 runtime+route+sequence 校验，early exit7 与旧 SID 隔离不变。

此方案不更改公共 StopResult/四个 UI 方法或 native wire。

## 3. F2：有界 observer 与不可取消 write 的独立生命周期

### 已证和静态相邻路径

- 已证：archive 最终 persistence.flush 挂起后 timeout50ms/abort 不能返回；drainManaged 的 checkpointTail 挂起60s仍不返回。
- 同闭包裸 await：acquireArchive 排队、无 runtime 成员 checkpoint、最终 commitArchive；Controller 先 await runtime.dispose registry，再 await drain/flush，才 sessions.dispose，任一磁盘等待会挡 native 释放。
- 现 observeCheckpoint 已正确不取消底层 write，可复用其局部 observer 思路；但不能仅把所有 await 套 race 后放走 writer。
- `SpaceService.guardedStorage` 的 pendingWriteGuard 目前在第一次 write 前消费，JsonStore 随后可能 backup→primary。修复设计应把取消检查保留到每个相关物理 effect，特别是**primary 调用前**；此为满足 F2 的实现设计，不另冒称本轮已实跑的新 finding。

### 3.1 局部、可追踪的观察与真实结算

为每个 archive/关闭操作保留局部 token：固定 deadline、observer 状态、已冻结 targets、已启动 effects/rows，以及原 Promise 的真实 settlement。用两条 Promise 语义而非替换原 queue：

- `observed`：在 deadline/abort 或真实完成时有界结束，返回准确 incomplete/failed 与已知 effects。
- `settled`：仍是原 queue/port 的真实 Promise；始终有 rejection handler、原 owner 引用和 late-error 收集；不会被 timeout 当 fulfilled，也不会无处理地 fire-and-forget。

deadline 只捕获一次，各阶段消费剩余时间；零/短 timeout 不改变全局 native stop。不得用 reissueIfStalled 包 write；原 shared write queue/JsonStore 不做全仓改动。

### 3.2 Archive 的阶段化行为

| 观察结束位置 | 有界返回 | 晚到处理/隔离 |
|---|---|---|
| acquireArchive 仍排队、尚未 stop | incomplete + WAIT_*，effect none | token 已失效，队列内获取 gate 前重验；若刚取得 permit，原 continuation 仅释放它，禁止随后 stop/commit |
| 已有 stop、逐对象核实/checkpoint 未完成 | incomplete + 已冻结逐项 rows；已发生 stop/写不能报 none | stop 继续，不撤销；pending cancellation/checkpoint 写仍由原 queue 持有；gate 至安全 settlement 后才释放，避免 commit→reserve gap 穿透 |
| 最终 layout flush 或 archive commit 尚未执行 primary | incomplete + rows，通常 partial | timeout/abort 使 commit guard 永久失效；flush 晚完成不能自动调用 commitArchive；已排队 commit 在 queue 内及每次物理写前重验，不写归档 primary |
| **归档 primary write 已真实调用**、等待完成/readback | incomplete/failed + **effect unknown** + 可定位 scope/rows；不能声称无归档效果或回滚 | 这个 write 不可撤销；保持原 writer/gate，等原 write+验证真实结束。成功则采用真实 archived 事实；失败保留诊断/有效副本，不自动重试或反向写 unarchive |

精确实施点：

1. 从方法进入就观察 acquire、每个 row 的 checkpoint、最终 flush 与 commit，覆盖同一 deadline/signal；不只是 stop 等待。permit 获取/guard 可加内部可选 assertActive callback，不新增 UI 入口。
2. rows 在冻结成员基础上逐项登记，结束观察时返回**不可再被晚 continuation 改写的快照**。并发成员某项已停止/持久化成功、另一项卡住/抛错时仍保留前项真实 effect，不因 Promise.all 未返回而 rows=[]。
3. 复用 SpaceService 原 queue，在 commitArchive 的局部 receipt 记录 queued/preparing/**primary-started**/verified/failed。建议保留原 beforeCommit，增加内部 optional onPrimaryWrite callback：在 guardedStorage 对本 path 的 primary write 调用前、同同步段设置 primary-started；callback 与 guard 都只属于该 queue operation。guard 不在 backup 后提前清空，finally 才清理；不改 shared JsonStore。
4. 用户观察结束只 invalidate token，不释放仍有不可取消 side-effect 的 permit。原 settled finally 负责释放 gate；未接纳 primary 的 guard 允许实际 queue 走到取消并 settle。关闭发生时也使用同一规则，不能让另一实例趁旧 IO 未结束接管。
5. effect none 仅用于确实没有开始控制/写入的阶段；primary-started 的 unknown 与 rows 中已 confirmed 的停止证据可以并存。既有 ArchiveResult 能表达，不要求改 B UI DTO。失败详情保留 stage/未保存事实，顶层用已有本地化键。

**不可实现的承诺必须剔除：** 取消晚于不可取消 primary write 的调用时，不能保证文件永不变 archived。能保证的是未开始的归档永不晚开始；已开始者准确 unknown、受隔离并最终核实。若独立 reviewer 将“绝不晚归档”解释为已开始 OS write 也必须撤回，需 Root 将这项物理限制与原合同核对，不能伪造实现保证。本方案不新增产品决定/自动回滚。

### 3.3 有界关闭不被磁盘挡住 native cleanup

保持成功路径 strict drain→writer release；把**调用者观察**从实际收尾分开。建议 Controller.dispose 幂等，缓存同一个 observed 与原 settlement，重复调用不重跑 stop/flush/close。

1. 同步 stopped/quiesce，阻断 GUI/managed/旧低层新动作与用户输入；runtime.dispose 的现有同步 disposed/finish/hook close 立即执行，其 registry Promise 登记为 owned pending，**不先 await 它**。
2. 同步捕获当前 exact runtime 集合及已有恢复引用；启动 Workspace 收束与 checkpoint，同时启动 sessions.dispose 的 native cleanup。两者协作保留 parser/ACK/notice 路由；磁盘永不 settle 也不能阻挡 native request/release。不能等整段 drainManaged 后才启动 native release。
3. 需要的 registry、布局、Space checkpoint/flush 与其他本次关闭的原资源 Promise 立即登记；对同一 queue 仍原顺序执行，不改成并行写同文件。late completion 只能完成已接纳操作，不能再接纳 UI/Provider/归档动作。checkpoint 准入在最后 native evidence 捕获后关门，再结束 strict disk settlement。
4. 关闭 observer 用一次有限总封套，不给每个 await 重开预算。建议以既有 native observer10s + helper 物理关闭4+1s，固定**15s 的调用者观察上限**（Packet 冻结本地常量即可）；其含义仅为 bounded result，不承诺磁盘在15s内完成。真实 native 子预算仍不重置；不能声称整条关闭只有10s。
5. 到期返回/reject AggregateError，列 native/registry/checkpoint/layout 等未完成项、persisted=false 与现有 unconfirmed 恢复底线；native cleanup 继续完成其原有有界职责。同步移除外部 UI/命令监听，只保留完成已接纳写/捕获清理所需的私有 continuation，不恢复交互入口。
6. 底层 pending write 未 settle 时，SpaceService 的真实 tail 和 WriterLease 保持；不执行 lease.close。第二实例/重新启用必须得到 owner conflict/BUSY，不能让旧实例晚写污染新实例。只有所有同 owner 已接纳写实际 settle（成功或失败已收集）、native evidence 捕获停止后，原 settlement 才调用原 strict dispose/close writer；失败不会改写为成功。
7. checkpointTail 当前 catch(report) 会让 tail fulfilled，关闭还需本次 receipt 的错误账本：已失败 checkpoint/registry 即使后面某写成功也不能从 shutdown AggregateError 消失。late rejection 同样进入 report/retained receipt，禁止 unhandled rejection；不自动 retry，也不为“保持 unknown”再发一笔可能阻塞的新写。
8. 成功路径仍等验证完成才 release；失败的已接纳 write 真正结束后可安全释放 owner，但磁盘留下的 unconfirmed/partial 不允许新 activation 自动启动。永久不 settle 时 writer 持有至宿主生命周期结束是明确失败隔离，不能展示保存成功。

实现上可仅用 Controller/WorkspaceService 的 private observed/settlement/pending/error 字段与 SpaceService 原 tail，不需要新的全局 manager、socket/daemon 或 shared storage 改造。WorkspaceStore 若需要拆“停止接纳/退订”与“strict settlement→SpaceService.dispose”，仅调整原 bridge 的生命周期方法；不要把对同一 port 的早返回误当真实排空。

## 4. F3：所有 create 的最后门覆盖 closing

生产旧链真实存在：`controller.ts:231 → sessions.create`；AgentRuntime 的 agent automation 和 `startScript` 仍无 managed runtime。当前 `349–357` 与 post-spawn `365` 少 closing，不能以未来 T-14 删除/迁移旧链代替当前门。

最小实施：在 TerminalSessions 内用一个 private 生命周期检查复用到全部 request，覆盖：入口、ensureHelper 后、environment 后、request.prepare 后、hooks 完成后、beforeSpawn 完成后，并在**同同步段**最后检查→stage spawn-sent→native.spawn。无 runtime/无 beforeSpawn 也必须走最后检查；`await undefined` 的微任务恢复也不例外。检查包括 closing/disposed、signal、removing/map exact object 与 managed ref/stop（若有），不能只查 entry.stop。

- spawn 未调用：按失败/取消且 no-process 结算；managed attempt 用 not-started，旧请求沿既有 TerminalSession/automation 结果形状，不编造业务 Session 或配置绑定。已取得 hook 恰好 close 一次。
- spawn 已调用后 quiesce：post-reply 检查也包含 closing，禁止正常 adopt/打开/输入；只用捕获 helper/lease/sid 清理迟到进程。未知 spawn reply 仍 unknown，不标 failed/no-process；early root exit7 不被取消覆盖。
- hooks/beforeSpawn Promise 自身不可取消时，不允许它们晚完成后跨门。若关闭需要提前结束等待，只取消该 create 的观察/continuation资格，晚到 hook 只 close，不带 env 继续 spawn；不把 hook.prepare 或目录验证当可重发幂等任务。沿 F2 的 owned continuation 收集错误，不能丢 hook close。
- 已在本同步段发送 native 后才发生 quiesce，属于已开始副作用；必须清理而非宣称零 spawn。保留 output/reply/ACK 到清理期限，不跨代次重试。

## 5. 有意义的红绿与相邻回归

本表是获 Packet 后的执行计划，不是本轮已运行结果。先迁入四个原 probe 的真实断言，在冻结旧源产生正式 red，再最小修复及绿；保留原独立 probe/log 不覆盖。

| 范围 | 确定性/真实断言 | 防止“修到假绿” |
|---|---|---|
| F1 真实 native | 同固定 helper、根自然 code0→后代仍活→partial，首次stop与force到相同sid/requestId；后代实际结束、cleanup confirmed/0，Browser Cookie 请求仍可用 | finally 独立 captured-force 兜底且核 PID/helper 退出；不得以调用计数代替真正结束；显式 binary 不存在失败、不 skip |
| F1 状态表 | partial/unknown/legacy root-only、confirmed/not-started、无transport/断线；force前后同request/deadline，旧sequence/新runtime隔离 | confirmed不重复发送；dead transport不 ensureHelper；force不重置计时；旧partial不立刻伪结算新观察 |
| F2 archive pending | acquire排队、缺runtime checkpoint、final flush、commit排队分别deferred；timeout50ms与abort均在release barrier前返回 | 先断言返回/rows/effect，再释放 barrier；不能像现测试同时abort+release后才等结果 |
| F2 archive写阶段 | 在backup已调用但primary未调用时abort→primary归档永不调用；primary已调用后abort→bounded unknown，原write成功/拒绝分别晚结算 | 不报none/rollback；无自动unarchive/重发；gate/writer在真实settlement前不释放；第二activation拒绝 |
| F2 逐项 | A已stop/保存、B checkpoint挂起或抛错；cancel/timeout后返回每项准确rows；晚完成不修改已返回对象 | 保留已发生effect，不因Promise.all挂起或中途throw回空rows |
| F2 shutdown | registry或checkpoint或layout write分别永不settle；native still收到stop/release并保留drain，observer在固定总封套结束 | 不只测drainManaged：生产Controller.dispose组合必须证明后续native清理未被IO挡住；第二writer不能获得lease |
| F2 late结果 | timeout后write成功/拒绝；逐个释放barrier后旧owner真实close一次，下一activation读真实record，无迟到归档/旧attempt覆新 | unconfirmed预写仍可读；失败账本不被后续成功清空；无unhandled rejection；重开零spawn/旧PID kill |
| F3 matrix | managed/无runtime，各在hooks、beforeSpawn、prepare微任务后quiesce；均未发送时spawn0 | 精确保留现实 `kind:'script', automated:true, prepare:queueMicrotask(quiesce)`、无runtime/无beforeSpawn请求 |
| F3 late-send | managed/旧request的spawn reply deferred，先quiesce再回PID；不adopt connected、同capturedsid清理；generation切换不误杀新运行 | 真实生产TerminalSessions/NativeHost组合，保留cancel/dispose/crash三顺序与早exit7、reply/ACK断言 |

相关既有回归：`session.test.ts`、`sessions-space.test.ts`、`sessions-cancellation.test.ts`、`workspace-service-stop.test.ts`、`workspace-service-record-view.test.ts`、`workspace-service-stop-native.test.ts`、Space lifecycle/store、agent-runtime/prompt-runner 原结果合同。范围按实际修改选，不以整仓重跑替代上述精确负例。类型/生产 lint 由 A scoped，Root 在源冻结后统一生成/全检查和独立复审；native/UI 原件不变可按影响复用。

## 6. 候选精确写集（等待 Root Packet）

默认生产：

- `src/modules/agent/services/terminal/sessions.ts`（F1/F3；无 native wire）。
- `src/modules/agent/services/workspace-service.ts`（局部观察/owned settlement/rows/错误收集）。
- `src/modules/agent/services/spaces/space-service.ts`（archive queue guard、primary effect receipt、原 writer 的 strict settlement）。
- `src/modules/agent/services/controller.ts`（关闭立即启动 native 与 owned writes、幂等与 bounded observer）。
- `src/modules/agent/services/workspace-store.ts`（仅必要时拆 quiesce/strict dispose；原同Space merge/dirty算法不改）。

测试：`terminal/sessions-space.test.ts`、`terminal/sessions-cancellation.test.ts`；`workspace-service-stop.test.ts`、`workspace-service-stop-native.test.ts`；`spaces/space-service-lifecycle.test.ts`；`workspace-store-spaces.test.ts`；新建 `services/controller-stop-recovery.test.ts`（原 A Packet 已列但当前不存在）以生产 Controller 组合覆盖 registry/checkpoint stall。所有全路径均在上述 module 下。可优先复用现 controller-managed-runtimes fixture，避免复制账号/真实环境读取。

默认不改 core public DTO、i18n、AgentRuntime、prompt-runner、launcher、module：现有错误/效果形状可表达 unknown、WAIT_*、PERSISTENCE_FAILED、shutdownIncomplete；现 AgentRuntime.dispose 已同步关闭后返回registry Promise，Controller可不先await它。若实际实现证明需要调整其中某精确行，先向 Root 说明，不顺手扩功能。

**新增分配路径需求：无。** 新 controller-stop-recovery.test.ts 是既有 A 精确分配路径；本方案不需要 shared/json-store/write-queue/stall-guard、native/desktop Host 或 UI 写权。以上均为候选，当前不解锁任何源写。

## 7. 只读源观察

以下 SHA 为本方案读取时观察，不替代 Root 的完整57文件冻结输入，不将阅读记为测试通过。原独立报告可能在最后回执校核时追加文字；以这里实际观察为准，历史报告/日志不修改。

观察时刻：`2026-10-25T11:14:42.616979+00:00`。

| 路径 | SHA256 |
|---|---|
| `/tmp/huhu-t04-review-round1.md` | `2fd68b12ef9d8954fdfe60425235ea60502b41caca66aa8d60cb09f76e2d6772` |
| `/tmp/huhu-t04-review-probe-records.json` | `d76145cf45d347f3df0c957c0c8b73914f0f0b3d9f7656d0effd1adfb7276ccb` |
| `/tmp/huhu-t04-review-probe.test.ts` | `40216cda2d5af72861354c5f5e918208bcd08c8cc0c6bcb9c2710fc3ef1ebf6d` |
| `/tmp/huhu-t04-review-probe.log` | `28d5a61d4a376ba6727d4cb747d47e2d43221a24bf22e8714decfeed37d78342` |
| `/tmp/huhu-t04-review-bounds.test.ts` | `680c78fff581391ce51ba32b25154c8ab2f1e7f40c5be2e8f925d1e4a42a161d` |
| `/tmp/huhu-t04-review-bounds.log` | `29423ec42d827834e8b481108f661c528a0177f2a34e3de7d48caa0e3e849f00` |
| `/tmp/huhu-t04-review-quiesce.test.ts` | `ba23e4c6dfea2a442502d7715a404aec227e64305df58a7928d96104c0eb3df9` |
| `/tmp/huhu-t04-review-quiesce.log` | `9d96ba54e3344c1404eeddb8eb2d60b8ee4769e06205881789a088a4ace022a8` |
| `/tmp/huhu-t04-review-quiesce-legacy.test.ts` | `3edfed96ec3dcb66bdaca18ad5be8f35694162198385a246311194b0bc2b8f1b` |
| `/tmp/huhu-t04-review-quiesce-legacy.log` | `aff5510c83563cf3a1dc79dde585137f001d480d7ccf2b02e201f9c83b1239ec` |
| `src/modules/agent/services/terminal/sessions.ts` | `120bcb0746a47a92cd6059d239e1487a579836a1a539ac146ce067ea40d1b998` |
| `src/modules/agent/services/terminal/session.ts` | `b12a8b22b0c6371523cfbca8934b2ebddcb59bd9a24525c4620a42fe257163fa` |
| `src/modules/agent/services/terminal/sessions-space.test.ts` | `c426e4c687c39a9ba1a1585a899997611babc869dcaa4707890cfaaec926afc7` |
| `src/modules/agent/services/terminal/sessions-cancellation.test.ts` | `db65040d334382e42dd0e7a90ef4ebeff7f22f518d97a20f3e3323b6bd0e3b19` |
| `src/modules/agent/services/workspace-service.ts` | `28b54dbb8ec02e7114fd789886e1a58847f9f4afd889a25a4fdc710318187ab5` |
| `src/modules/agent/services/workspace-service-stop.test.ts` | `881aba4bef24aec8e44be6b45d2f8eb0021936da88d70650873437b5517d6f7a` |
| `src/modules/agent/services/workspace-service-stop-native.test.ts` | `c39e4ee735ea1bd9b525e10781c65f9d1c3ecfc8a55b913e7240f2600200e562` |
| `src/modules/agent/services/spaces/space-service.ts` | `f04d30a206782996c448aec8b7f7a5cf8501a730f54b7f51bce2e713aa17515a` |
| `src/modules/agent/services/spaces/space-service-lifecycle.test.ts` | `afd85ce623a4300f561707f008fce955fe866ee80eaef162f773b7e606807e7f` |
| `src/modules/agent/services/workspace-store.ts` | `ea30593109d884895bd0dc63fef4a257ee1b72059862a6947a833e5cc66fc307` |
| `src/modules/agent/services/controller.ts` | `1207b19bd828dfb90a1f3cb1ce68602db123750b4b65c0d89275e9c92b607c66` |
| `src/modules/agent/services/controller-managed-runtimes.test.ts` | `7aff7c1bd554d09f706c9e0e3d2cd93e3bc09463d947c4510095938349d44963` |
| `src/modules/agent/services/agent-runtime.ts` | `4df5489210382cc52e9276f96746f11a3757f27d9cde47acc6d58b78094a6c9c` |
| `src/modules/agent/services/launch/launcher.ts` | `80eaadf346cca9f3c39565ea6d53789010b511eeb904a7f6ef115143d43ec275` |
| `src/modules/agent/core/workspace/managed-runtime.ts` | `a543fc74b401d8eb5917286a2007db147442877bd6aeed38be3f3b39b66784fd` |
| `src/modules/agent/core/space/ports.ts` | `5bb0fb11e6dd8928f3adee6905824f2c1588ecf277d686dd07209b6c4fd4c5b1` |
| `src/modules/agent/module.ts` | `e5a1b8717022742d6796d8063cdaeb96bb8582f4b5bfb6aca16d89b5d77aeb00` |
| `src/shared/json-store.ts` | `74fef079c0f2bac8654081986b142455a1c2f6fbd0674f0c49f0b258e8052e53` |
| `src/shared/storage/write-queue.ts` | `0d30c9db993783ac08e4d10e051a9a95c5bef1d41bbdb6403efb220a878fc820` |
| `src/shared/storage/stall-guard.ts` | `fae44c8accbf8113d4f849377af9f59c944612825ff0c9983fb53ee09e3f329a` |
| `src/host/desktop/native/host.ts` | `d1c4b479b595fd3d18efd9a642ab1e4b34ca5840ac25bb7bdde386e147c1c36b` |
| `src/modules/agent/platform/desktop/spaces/writer-owner.ts` | `00dfd986d0ce4ea30d66b0752e799fd2783c41ffa9b4034bc37c0025a81332e7` |
| `native/pty-server/src/session.rs` | `2589a3cbb077115653d8b080ed621a22aa8ca5d232f342ef35389f68927c0dfb` |
| `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md` | `d204c7a0b3178a60ddeb291a8153f79cb8e3864427c5317b7660832182d12618` |
| `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md` | `f13ca8cf0ef1185065e7c6d4e537a787f50ac813678aec428e498c0a8f03e397` |
| `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/04-stop-and-recovery.md` | `b42456e70b8a15390f933f2821d180374daa8881e80ac3b5211bdc09aeda3879` |
| `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-dispatch-a.json` | `db6116b670c75fdd284e1bda70980a63d92f4cc37b974b49917016ef4d59b105` |

**READ-ONLY SOURCE STOPPED。等 Root 实际修复 Packet；不启动实施或检查。**
