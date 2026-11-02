# 任务回报

Session: 20261031T062046Z
Task: 018-host-stop-consumer
Status: completed

## 聚焦交接

T06 的10项候选已交回并全部停写，completed 不代表独立双轴或联合验收通过。正常停止现在由唯一 managed session 持续观察 Go 四阶段，保留进程及 Host 清理所有权；caller 超时/取消只结束该次观察。移除了正常 close 的4秒TERM+1秒KILL升级，跨runtime的同Profile reservation在阶段成功、真实进程退出和Host清理完成后才释放，失败明确阻断自动重开。最终 desktop+events 11文件59测试、测试类型、架构及lint适用验证均通过；Lead需固定新快照交未参与者独立审查。

## 产物与验证

### 范围与方法

唯一current/dev，base HEAD 86c500556db1d64865c4cc7f1aff1dd83de071fa；输入018 TASK/Map14/Ticket06、017预检、T04验收合同、ADR002、dev/testing/architecture与execution-boundaries。沿用既有Go阶段合同与平台owner，没有外部依赖或代码复用来源新增。未改Go/T04、公共api.ts/wire/schema、module、UI、PTY、Browser或T03四项，没有Git写入、递归派遣或共享生成物写入。events/runner仅迁移旧强杀参数和停止/退出消费者。

实际10项写集及SHA见末尾：3个生产文件（managed.ts、managed-stop.ts、client-runtime.ts），7个同范围测试。没有新模块公共API；新增的stop/stopFacts/retainUntil均为既有desktop session/runtime局部合同。

### 最终行为与所有权

1. `managed-stop.ts`：每session只创建一次清理promise，使用waitMs=1000与独立RPC期限持续获取真实快照；只有finished且四阶段全真、failures为空，并确认实际child close的code=0、无signal/forced，才有正常停止成功。RPC EOF/失败不补造阶段事实，转EOF清理仍等进程；终态失败不抢先关闭其他在途回复。快照复制failures数组，caller的timeout/signal不传给owner、不取消Go清理。
2. `managed.ts`：`exited`仍明确只是物理close信号；新增结构化`exit`保留code/signal/forced。普通断连只关闭管道，不定时发信号。`forceTerminate`是明确恢复/失败测试路径，结果forced=true不能成为成功持久化；没有新增UI强杀入口。managed:false和通用BotClient.close不自动发managed shutdown。
3. managed session接收runtime登记的Host cleanup barrier；最终事实和child exit不能越过它释放Profile reservation。注册阶段晚返回的cleanup、refreshHost、自然退出cleanup和重连旧owner均结算同一barrier。正常close只触发同一session.stop；完整结果通过stop等待而不是把void close当完成。
4. `client-runtime.ts`：stop保留唯一owner及其promise，重复stop各自观察同一过程；disposed同步拒绝新工作，stopping只在实际owner完成后转closed。等待晚到launch/onConnect、真实退出及Host cleanup；错误保持failed，后续同实例不能绕过failed owner重开。尚未hello的进程仍通过EOF清理并收割，但exit0缺少最终阶段事实时返回STOP_FACTS_UNAVAILABLE，不伪称正常停止。runtime.exited在停止期间仍可观察，stopFacts保留实际阶段快照。
5. desktop模块内按规范化绝对Profile路径登记reservation（Windows统一大小写）；先登记再launch，第二runtime不能静默接管/停掉前owner。正常阶段+进程+Host全部成功后删除reservation；阶段/退出/Host失败保存failure/facts/exit并返回HUHUBOT_RECOVERY_REQUIRED。普通模块停用/启用不会自动清除ES module缓存，因此不会清除该记录。
6. 恢复边界：本票没有定义或实现加载期内解除失败reservation的公共API，也没有自动恢复。reservation属于进程内当前实际模块缓存，直到该缓存真实被销毁或宿主进程退出；不能把普通模块重启等同缓存销毁，更不能把reload当已验证恢复证据。后续T33需消费failed/recovery-required及真实阶段，恢复流程须另明确；Go锁与正常Open/SQLite恢复仍是独立后续关卡。本票未验证插件重载或宿主重启恢复。

### 红灯、修正与失败记录

全部原始输出保存在`/tmp/huhu-t06-*.log`，不写旧REPORT或正式Evidence。

- 初始重复stop回归退出126/内部1：子进程exit gate未释放时state已closed；`red.log`。共享owner修复后转绿。
- 自查重连/握手边界新增真实红灯：旧stop失败后第二次实际launch计数2，`relaunch-red.log`；pre-hello EOF+exit0的stop意外resolve，`owner-red.log`。sticky recoveryRequired与无事实保守失败修复后，控制测试转绿。
- 跨session reservation控制测试初轮2失败：前owner尚未退出/前owner已失败时，第二launchManagedBotSession仍resolve；`reservation-red.log`。登记owner并等待真实完成后转绿。另以两个实际createBotRuntime+实际Go、同本机Profile确认：caller先超时仍不第二次launch，child已退出但Host gate未释放时仍不launch，Host清理释放后正常第二次启动；明确force第二个自有进程后，第三runtime拒绝并报告recovery-required。
- 第一轮真实Go暂停/重开测试9过1失败：创建记录使Profile revision由1变2，测试误拿创建前快照比较；`real-runner.log`。修正为比较已提交后service.status的真实Profile快照，并检查重开后记录title，没有放松revision或持久化断言。
- Lead中间全仓lint发现新helper误用全局timer、未知reject/throw值及未绑定方法；改node:timers、Error规范化和显式闭包。一次本worker定向lint显式列出被全仓规则忽略的events测试路径，只报ignored warning；`target-lint.log`，没有改变全局规则。
- 新Host gate初轮纯测试的mock未消费拒绝导致1个unhandled rejection；`host-gate.log`。让mock遵循实际retainUntil责任后又暴露旧连接重连分支未结算Host gate，5秒真实超时；`host-gate-green.log`与`final-tests.log`。该次完整观察在读取控制红灯前已启动，诚实保留2失败/57通过，不把它算最终通过。修复实际重连结算，mockReset清除失败用例留下的未消费once队列；不扩大时限。随后控制21测试0，完整59测试0。

### 实际验证与拓扑

Linux、Node26.11.1、pnpm11.1.3。先等Lead session72395的原入口全量Go结束（Lead报告0：private-memory239.097s、foundation30.002s、全部包通过），才启动本票真实runner构建；没有重复全量Go。真实TS↔Go使用现有Vitest huhu-bot-integration项目，fileParallelism=false、maxWorkers=1、groupOrder=2，固定Go1.26.10、CGO_ENABLED=0，沿原fixture构建入口。类型/lint与Vitest只读检查有并行；不同Go真实runner由现有项目串行。

| 命令/范围 | 结果与证据 |
|---|---|
| 初轮`vitest run .../runtime/client-runtime.test.ts -t 'keeps repeated stop pending'` | 126/内部1，closed≠stopping真红灯 |
| 三组控制文件runtime/client-runtime、transport/managed-stop、managed-session | 修后0，21测试；`host-gate-retry.log` |
| 单独`vitest run .../transport/managed.test.ts` | 0，4测试；`child.log`；真实子进程在EOF后4200ms仍活着且未收到TERM，释放文件门后exit0；明确force另断言SIGKILL/forced |
| 单独真实runner/credentials/events轮次 | runner最终11测试0（`real-runtime.log`），credentials4测试0，events1测试0；追加最终联合轮覆盖后续Host gate修正 |
| 最终`pnpm exec vitest run src/modules/huhubot/platform/desktop src/modules/huhubot/services/events/runner.test.ts` | 0；11文件59测试，22.25s；`final-tests-retry.log` |
| 最终`pnpm exec tsc -skipLibCheck -p tsconfig.test.json` | 0；`final-types-retry.log` |
| `pnpm test:huhu-bot-architecture` | 0，77生产文件；最终`final-architecture.log` |
| `pnpm run lint` | 0；`final-lint.log`。其运行期间最后runtime重连结算有修正，故另对最终3生产文件复核，不伪称整轮全仓固定输入 |
| 最终3生产文件`pnpm exec eslint .../managed.ts .../managed-stop.ts .../client-runtime.ts --max-warnings 0` | 0，零警告；`final-lint-delta.log`，补齐最后增量 |
| 本10项`git diff --check` | 0 |

真实慢证据边界：Linux SIGSTOP/CONT只控制本测试直接启动且持有transport handle的Go子进程；暂停期间短caller超时、真实竞争Go writer仍INSTANCE_CONFLICT，恢复后同owner最终完成、进程成功退出、Profile可重开且记录仍在。它不是慢fsync实验；超过3秒的实际WAL Sync接缝证据仍来自T04，不新增生产CLI开关。Linux专属暂停/信号/shebang用例在本机实际执行，其他平台会skip，不能据此声称Windows/macOS进程语义通过；基础阶段/owner控制测试没有平台skip。

所有fixture先等待实际child close，再删除临时根；失败清理仅能显式恢复本测试直接持有的child。真实暂停用例finally保证SIGCONT，并在明确失败清理中force+await exit后才释放目录，不按未知PID或路径猜进程。

### 共享构建观察（Lead来源）

Lead在本票中间可编译节点冻结9项运行非Browser等价构建，生产/测试类型、样式校验、esbuild退出0。该中间预算仍有3项超限：main19187B、eager1165B、agent激活3494B；阈值未改，Lead归T37/T38。构建后本票继续修复，故该观察不代表最终T06资产完成，worker未改生成物；最终构建/预算由Lead协调。

## 问题与下一步

候选已停写，交未参与实现者独立两轴审查，Lead再完成最终构建/联合验收。未执行新的全量Go；Lead已有原入口Go通过只是Go证据，本票另有真实TS↔Go59测试，不混同命令覆盖。没有真实Obsidian、Windows/macOS或显式重载恢复证据；UI和恢复提示留T33，失败reservation不自动清除。T04旧全量混合输入失败及T03历史证据原样保留。T09 owner已获通知本票所有验证进程结束，可另行协调无并发重负载的规模测量。

### 停写候选摘要（10项）

```text
e49c012d9a5a9d13e151189835ac08cf40c751a2e7b8c48de9ac46138169cab0  src/modules/huhubot/platform/desktop/runtime/client-runtime.ts
6e6c2005fab6faa446c5451d77ab9f0b9f6c0cd32e0429d1a8bc322b8fa81a2a  src/modules/huhubot/platform/desktop/runtime/client-runtime.test.ts
e31e38f2e1ccac82b27f0e02e7ebebbc49550c87c3eba7fe8fff1d4814084d57  src/modules/huhubot/platform/desktop/transport/managed.ts
1a21bdae29af6f89d9c8242e414d3713cb39dbe1c58188ce082656bb55c75b96  src/modules/huhubot/platform/desktop/transport/managed-stop.ts
f7e3efc5b6f61618edc638a4ef7f8ae13a011e7326fa868c84122cbf899384eb  src/modules/huhubot/platform/desktop/transport/managed-stop.test.ts
9bc713eac4aa69cd85c791b873a44915743f4fbedb69f7f0317ba78625137af3  src/modules/huhubot/platform/desktop/transport/managed-session.test.ts
2c4a772b84d2ac94941b6c9a66345f0ea8fd879fa9f23accd608d051199308a8  src/modules/huhubot/platform/desktop/transport/managed.test.ts
5dea9d68f367632c31d3d239cda36f4420110d6845e18a64d31e50110cd5685a  src/modules/huhubot/platform/desktop/transport/runner.test.ts
d16319eab8490858d1f716d65230a6cc4fb7026d6cdabf2dd65d7ff964762ed8  src/modules/huhubot/platform/desktop/transport/credentials-runner.test.ts
837fcb37938341596b2b84b263425d194ffd8a651af477b7631dd80527be64e3  src/modules/huhubot/services/events/runner.test.ts
```
