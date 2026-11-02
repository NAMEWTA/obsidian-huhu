# T16 恢复完整候选独立双轴审查

Session: 20261025T043239Z
Task: 083-recovery-review
Status: completed

## 聚焦交接

独立审查已完成，标准轴和规范轴均为 **request-changes**，有一个经公开 API、真实 SQLite、同 Executor 与真实重启确认的调度活性缺陷。较早恢复树中的不可领取 accepted 子任务占满固定 128 项扫描页，后部无关树的合法 accepted 子任务不会被领取。现有迁移、回执、CP、停止及单树恢复通过证据不覆盖该多树反例，不能据其宣布 T16 代码门通过。本 reviewer 未参与任何产品实现、没有修复生产或永久测试，仅写本 REPORT/log 和外部固定副本的探针。

Reviewer 为原生 `/root/recovery_review`；作者为 `/root/foundation_go`、`/root/credential_provider`、`/root/foundation_client`，086 测试维护仍归原作者。沿 Root 派遣的独立 review / gpt-6-astra high 偏好；工具没有可独立核验的底层模型标识，不作实际模型证明。Root 已收到原生 ACK，完成后另以原生 MESSAGE 与 FINAL 返回。

## 输入、依据与可证伪假设

- review_mode: working-tree；branch `NAMEWTA/bot`；base/head `33c21e098ef3188cbab5a09f3e0a01fadb787715`。
- 固定输入：`evidence/T-16.md#review-input-recovery-r1`，Input-SHA256 `5283c6f2df32207a609142551375684c980b972471ff1026290bfd0c7b07ab2b`，337 文件、107 来源。TASK SHA256 `3c7add3072de844a7bf6320fa0a54d904825ec66580fedbffc474eeae8dd0716`。
- 已依 AGENTS 读取 workspace/catalog、runtime、dev/testing、SpecDev I 及独立 code-review/risk/error/test-reliability/Fowler/working-tree/source-discovery/coordination 合同。当前是 I 的固定未提交候选审查，不从空 HEAD diff 推导 no-diff。该范围没有新的 commit 引用要解析；本地 Spec、T16、Map20/21 的窄窗口和维护补充是明确存在的权威来源。未发现 native/contracts/该 TS 模块下另有 AGENTS、CONTRIBUTING 或 CODING_STANDARDS。机械 lint/type/build 复用 Root 实际记录，不制造风格 findings。
- 行为依据：Spec §4、§7–11，T16 AC-016/017 与 AC-033 接缝，以及 `evidence/T-16-logs/recovery-window-map20.md`。测试维护依据为 `map21-fixture-maintenance.md`、`events-lane-supplement-map21.md` 和 `python-validator-supplement-map21.md`。
- 完整阅读080/081/082/085/086 REPORT、作者交回 SHA/Wait/return0 记录和 Root 接收凭据。Root 的 `lead-recovery-e2e-r2.json`、普通/race原始结果、生产 TS→HAP→stdio→Go→SQLite 观测、build/lint、r1原始失败及诊断一并核对。079只作历史背景，没有把它的 pass 直接复用为 T16 新行为通过。

先提出以下可证伪假设，再追踪真实调用与既有反例：

| 假设 | 实际追踪与结论 |
| --- | --- |
| 旧 worker、Background context 或 Stop SQL 失败能重新准入 | Core.RequestStop 同步关进程门；execution/effects/usage 的真实 claim/Reserve/Dispatch 事务读门；唯一 drain 重试持久 Stop。Root 的真实 trigger/晚 Dispatch、新root拒绝和实际 producer 持锁反例支持该保证；未在本轮发现新增旁路。 |
| ready 会自动执行，或资格核查后变化仍能释放旧代 | Recovery.Get 两短 Tx 包完整 Inspector/Context 检查；Resume 先查原持久 receipt，再核 CAS/资格代/tree watermark，事务外重查后再次 capture/currentInTx；成功原子更新原位置和回执。现有坏CP、成员变更、不同key并发与receipt trigger反例有针对性。 |
| 恢复创建新Run、重复子结果、丢原Decision或重派未知效果 | execution position 与 legacy reconstruction 保持 claimed/completed 原事实；审批 completed 但 SaveResume 失败窗口重建原Decision；unknown/dispatching 在 currentInTx 阻断。Root旧schema8实际Resume后kill来源与新claim/原CP/原投递/unknown7+known2持久回读支持身份保持。 |
| CP只查引用、绕 Blob Port 或外部资源兼容 | Broker.InspectRecovery 通过引用关联、Blob.Open完整 HUHUCP1/hash/长度验证、pure Inspector并持reader到完成；缺 Inspector/坏CP拒绝。当前 Source lease 固定且真实重开新lease明确blocked，无静默重绑。 |
| 多个恢复树的 closed accepted 行让无关任务永远不被扫描 | **确证 F-083-01**，详见下文；原单树 fresh-accepted 回归未覆盖固定候选页装满。 |
| 断线、双击或投影失败改变命令身份/错误恢复正文 | RecoveryClient 保留 prepared command、Profile/epoch、unresolved与同Promise；setClient 不自动resume，dispose使旧generation无效。持久receipt先accepted，重锚失败不转unknown；EventClient仅目标失效并当前权限重新读取。真实TS链与Peer测试证据分开。 |

<a id="standards-output"></a>

## 标准轴

Reviewer: native:/root/recovery_review
Axis: standards
Result: request-changes
Input-SHA256: 5283c6f2df32207a609142551375684c980b972471ff1026290bfd0c7b07ab2b
Observed: F-083-01 为已实测的正确性/活性缺陷。固定128项候选页先截断后过滤，循环扫描没有推进，合法后部工作可无限饥饿；符合 dev 的行为正确性、独立执行归属及 risk-review 的并发/恢复反例审查范围。

### F-083-01 — P1：恢复屏障占满候选页后，无关 accepted 工作永久饥饿

**位置：** `native/huhubot/internal/adapters/outbound/sqlite/execution/executor.go:80` 的 `SELECT ... status IN('accepted','recovering') ... LIMIT 128`，以及102–128行过滤；调用方 `internal/application/execution/executor/executor.go` 的 scan 每100ms重试同一 Claim。原 SQL适用所有 accepted/recovering，恢复检查位于取页之后；遇 `RECOVERY_REQUIRED` 只 continue，没有游标或下一页。当整页均被恢复屏障拒绝，后续 Ready/parent 路径不能领取页外 accepted 行。

**真实可达触发：** 公开受理6个独立 direct root（当时仅6条活动行，未绕过 RUN_QUEUE_LIMIT），随后用同一受控 Engine 的 channel barrier 逐树真实 `agents.delegate` 32次，limits为 MaxChildren32/RootChildren1/ProfileChildren8。前5树各有1个真实运行child与31个未领取child；第6树的32child均为原始 accepted，父已正常保存 application result 并等待子结果。真实 Core.Close/Done 与重开使前5树的实际运行child interrupted、整树blocked；第6树没有被中断的执行位置，`runs.recovery` 明确为 none，理应扫描原accepted。

**实测：** [05原始日志](logs/05-starvation.log) 与 05实际回执（历史日志已清理：`logs/05-result.json`），Go actual exit1，subprocess.run真实Wait，16.669秒；目标六树子case在正常6秒观察内保持父 waiting_children、Engine调用0，SQL回读5个blocked tree、0个resuming tree、187条accepted（前方155+目标32）。这是目标行为断言失败，不是编译、setup、超时杀进程或SQL状态伪造。

**单变量反向控制：** 同一进程、同一目标Run/DB/Engine，只有一次公开 `runs.cancel` 取消最前方一个无关blocked root，将前方闭门accepted从155降至124；没有对第6树调用resume、换Run、改SQL、替换worker或改变预算。随后目标原32child全部执行一次，父succeeded。四树正常控制则为前方93条闭门accepted，最后树cancel不可恢复leaf、合法CAS/generation resume后原31个queued child全部完成；其余3树继续blocked，未越门。

**影响：** 用户已受理的独立树会停滞，必须处理不相关恢复树才能推进。重试连接、重复查询或延长等待无效：同一有序前128行始终不变。有限观察本身不证明无限时间，但静态的固定页选择与每次重新从第一页扫描给出了持续饥饿机制；单变量取消前方树对照独立支持该因果。

**最小修复方向：** 在维持短事务、最终权限/恢复/取消/slot检查的前提下，让候选扫描能够越过不可领取页，例如稳定keyset分页或持久/内存公平游标；或在LIMIT之前安全排除确定闭门的候选，同时处理slot不满足的前页。不能只把128调大、自动释放别树恢复门、降低全局准入限制或要求用户取消无关任务。相同“先LIMIT后skip”的审批Ready与waiting parent路径应一并检查实际可达性，但本报告未将未实测的同类可能性另列为已确认缺陷。

**修复验证条件：** 固定05公开构造在原输入上保持红；修复后第6树在不取消/恢复前5树的情况下原32child一次完成，前5树保持blocked/零新模型；保留4树正常CAS恢复对照。再覆盖前页slot满、取消/Stop期间的最后事务门、原receipt/CP/预算及单树测试；按实际最小影响运行normal/race。Reviewer没有实施候选修复或给出未经验证的SQL替换。

<a id="specification-output"></a>

## 规范轴

Reviewer: native:/root/recovery_review
Axis: specification
Result: request-changes
Input-SHA256: 5283c6f2df32207a609142551375684c980b972471ff1026290bfd0c7b07ab2b
Observed: 同一F-083-01独立违反Spec §4及T16的“accepted未领取继续扫描”“仅指定树受屏障，无关树继续”合同；恢复屏障事实上阻塞了第6棵无恢复记录的树。AC-016/017的本票代码门尚不能通过，不宣称其他UI/Provider/宿主接缝已完成。

该判断不是把全局队列容量要求扩大为无限容量：所有root在合法容量内经公开API先受理；后代经既有32-child政策逐一真实接纳；第6树工作也早已持久接纳。问题发生在领取已受理工作，而非额外拒绝新用户请求。初始两个尝试在新root准入阶段命中RUN_QUEUE_LIMIT，与最终可达反例明确分开。

其余本轮重点边界的静态/证据核验如下，不能抵消此finding：

- 016以唯一Version9登记，旧SQL保持；原schema8实际Resume/Dispatch后kill fixture有真实来源manifest。完整DB+CP备份在DDL前，迁移同Tx失败回滚；不以新空库或修改schema_version伪造旧状态。
- Get资格与Resume命令分离，重复稳定query不会仅因checkedAt提高generation；watermark包括Run/配置pin/凭证、完整成员、Grant clock、CP/continuation、approval/effect、attempt、消息/结果投递与预算policy。整个真实受影响集合明示，非父子“显示一棵、释放另一棵”。
- 纯编排application结果不制造模型CP；正常waiting approval/未消费children与实际Resume中断不同。现有子结果重建读取原claimed投递，原unknown账不归零。
- 取消先递归持久关闭目标子树再通知同Executor；已派发模型attempt的Settle不再要求新准入，unknown不当零。Host侧实际vault.process回调/create前再次校验signal、lease/target/expiry及编辑器/内容，已发生不可取消写入仍按回执/unknown落账。
- Stop同步进程门、单drain持久Stop重试、等待executor/Inspector/真实HTTP producer，然后GC/Provider/DB/Profile；Close超时与Done分离。CLI EOF/shutdown等待实际drain，managed close与exited分离。没有因为Close返回就推断资源已经释放。
- TS使用实际144形状/276共享样本；Python修复仅重用唯一生成器正向fixture并严格校验定义覆盖、无重复，25decimal负例与276共享正反例仍由独立引擎执行。未改schema/固定样本迎合旧非法none+range构造。
- 086两种合法公开History顺序通过真实publication/Host.Read屏障控制；新增严格Derived映射逐项核kind/id/hash/namespace/thread，保留两child succeeded、完整来源/权限和附件断言。event仅270事务正确性case用6秒，其余helper3秒和100/800来源250ms产品门不变；三条normal/race/观察竞争成本支持该lane选择，不把诊断10秒当原3秒通过。

## 产物与验证

独立探针固定副本在 `/tmp/huhu-review083-yi8bg_f3`；原始复制清单 00-probe-input.json（历史日志已清理：`logs/00-probe-input.json`）。源码、配置、原永久测试全按输入复制，未修改；仅新增外部 `tests/contract/recovery/reviewer_starvation_test.go`。每次实际执行的探针原字节均保存为相应 `logs/NN-starvation-probe.go.txt`，最终05 SHA256 `56ce8e2540bdaf22d9b267c59de4d195d28e55b10c29e2b1dfb94d2042a04275`。

所有独立Go命令均为 `GOTOOLCHAIN=go1.26.10 go test -mod=readonly ./tests/contract/recovery -run '^TestReviewerRecoveryQueueDoesNotStarveIndependentRoot$' -count=1 -timeout=60s -v`，在外部固定副本 `native/huhubot` 执行；没有改原性能门，没有重跑无关全矩阵，没有真实网络模型、OS keyring或用户Vault。

| 记录 | actual exit / Wait | 如实分类 |
| --- | --- | --- |
| 01 | 1 / true / 6.076s | 先串行扩满树后才新受理root，被既有RUN_QUEUE_LIMIT拒绝；探针前提错误，不算产品红。 |
| 02 | 1 / true / 3.707s | 改成group新root仍被相同容量门拒绝；同样不是调度finding。 |
| 03 | 1 / true / 0.154s | 外部探针误用不存在的Conversation.CancelRun方法，编译失败；改为真实Approvals.Cancel，非产品修复。 |
| 04 | 1 / true / 17.793s | 四树控制通过；六树等待第6首child进入失败。说明原“六树均有运行child”的前提不成立，未冒称最终恢复反例。 |
| 05 | 1 / true / 16.669s | 保留第6原32个accepted，核资格none、真实重启后的0调用，再公开取消前方无关树使其32次完成。有效产品红与同进程反向控制。 |

05日志末尾模板字符串把六个已创建root统称“6 interrupted trees”，措辞不准确：实际SQL和前置断言为**5个interrupted/blocked树+第6个none资格树**。原日志不覆盖；本报告按真实代码/SQL说明。04与05未改生产，仅修正观察前提；绝不把01–04失败冒称产品修复历程。

原证据失败也完整保留并分类：080两处真正业务红（completed approval后SaveResume失败、Stop后unknown结算）有相同输入修复绿；旧normal/r2能力与版本断言是测试过时；081预算/Source recipient/连接identity夹具错误不是产品红。原events首次3秒没有原Run/SQL现场，受控MarkRunning写竞争实验只确证该交错机制，原事故同源仍推断。085群旧Derived恰1主动拒绝合法晚读已被086精确承接；事件race持续推进而3秒deadline先到期，joined guard仍红不能称优化成功。082ignored测试文件lint误调用保留，后生产lint实际0。Root r1的Kind/Reason混用和interrupted pin应清零误判均属探针错误，原unknown/known和pin保留事实没有因r2修探针改成产品修复。

Root独立E2E的普通/race四组与真实TS链实际0、build/lint实际0只证明它们覆盖的场景，本次F-083-01仍有效。本文不声称重新执行其命令，也不声称最终输入新跑过一轮完整全模块normal或11包race。首轮失败normal仅顶层Go Wait可证、历史嵌套CLI Wait未证实的限制保留，不用后来无进程倒推历史。

最终 06-final-input-process.json（历史日志已清理：`logs/06-final-input-process.json`） 重新执行固定输入校验：337文件/107来源无漂移，HEAD不变，index SHA256 `10a283748f5edff250e8b5af2378b1c3d898beaf650c92826a5885b282a8ead1`，外部原始源码也无漂移。五次Go命令全部真实subprocess.run返回并Wait；当前自有进程为空。Core的清理使用立即登记的Close与协作ctx，最终05在失败断言后继续控制与Close/Done，没有kill冒充join；无独立HTTP/Node/Runner子进程。

## 问题与下一步

请Root按原owner派发F-083-01最小调度修复及有效反例承接，修复后冻结新输入，再由未参与修复者复审。生产/永久测试/正式Evidence/Map/Goal均未被本reviewer改写；所有探针已结束，后续只做REPORT结构return与原生交回，不再占用重检查窗口。

真实Provider、真实Obsidian、目标macOS/Windows、SDK生产CP语义与T20/T23未来组合仍为user-owned/not-run或后续票；不索凭证、不宣称现场验收。全局计划/UI/doc锚点的既有诊断不由本报告关闭。本报告Status completed表示独立审查交付完成，**不表示T16、维护票、AC或Goal完成**。
