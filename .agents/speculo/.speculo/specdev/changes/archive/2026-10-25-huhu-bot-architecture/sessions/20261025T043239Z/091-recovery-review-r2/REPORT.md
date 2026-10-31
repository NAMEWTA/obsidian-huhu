# T16 恢复候选二独立双轴复审

Session: 20261025T043239Z
Task: 091-recovery-review-r2
Status: completed

## 聚焦交接

标准轴 **pass**，规范轴 **pass**，本轮没有新增 finding。原 F-083-01 的有效红与单变量控制保持；当前候选通过稳定分页跨过闭门 accepted、审批槽满及未就绪父任务，仍在实际领取事务重新检查门。父结果最终领取拒绝改为整事务回滚，独立新增的真实 Commit 失败、事务取消和同 Store 并发领取反例均未击穿该保证。

本结论仅覆盖本 TASK 的 T16 及 T01/T03/T04/T06/T11/T12/T13 必要维护代码候选，不把 28 票/55AC、全局 UI/doc 诊断或真实 Provider/Obsidian/目标 OS 验收宣称完成。Root 全文回读本报告和原始日志后维护正式状态。本 reviewer 未参与实现，未写生产、永久测试、正式 Evidence/Map/Goal、他人报告，未提交、推送、发布或归档。

Reviewer: native:/root/recovery_review。已原生 ACK，沿用户既有独立 reviewer 模型偏好；运行工具不提供可核验的底层模型标识，不将派遣偏好冒称模型实际证明。本轮没有再次委派。

## 固定输入与审查依据

- working-tree，branch `NAMEWTA/bot`，base/HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`，index SHA256 `10a283748f5edff250e8b5af2378b1c3d898beaf650c92826a5885b282a8ead1`。
- 固定 `evidence/T-16.md#review-input-recovery-r2`，Input-SHA256 `a62e8c7de0b7ca0542f418e239344eb0ea2625f11d6f6e8ccc6872eb573db89a`，349 文件、122 来源；TASK SHA256 `43fe0e29a000935a8cb462fd2237f3b82cf88abdee6cc3796a65e45be6353783`。
- 已按 workspace/catalog 发现，适用 dev/testing、SpecDev I 最终审查、独立 code-review/risk/error-handling/test-reliability/source-discovery/Fowler/working-tree 与协作合同。原 107 来源全部逐 SHA 未变；新增 15 来源及本 TASK、claim/parent/race-fixture 补充已读。没有把 discovery 当新建 Work 的授权。
- 权威行为依据仍为 Spec §4、§7–11、T16 AC-016/017、AC-033 接缝和 recovery-window-map20；本轮 Map21 三份领取/父队列/测试分层补充只明确现有合同与必要内部维护，没有改变 Application/HAP、schema、迁移、依赖和限额。
- 080/081/082/085/086 的完整报告、原始失败与已核调用链沿本 reviewer 原 083 审查复用；它们及原规范逐 SHA 未变。083 原有效失败全文回读；088/089/090 完整报告、具体修复/诊断及新红绿日志、Root 088/090 实际接收凭据、r3 原始输出和插件复用记录另行回读。

逐项比较（历史日志已清理：`logs/04-r1-r2-scope-comparison.json`） 确认：旧 337 文件中 331 个原字节/模式未变，仅 6 个生产文件变化，新增 12 个测试/夹具文件，无删除。6 个生产文件是 effects/continuations.go、execution/children.go、execution/executor.go、execution/store.go、usage/finalize.go、usage/waits.go；已完整比较旧固定副本与当前字节并重新追踪其现有调用闭包。其余恢复/CP/取消/Host/TS 路径不是以旧 pass 代替 T16：使用原 083 对同字节的具体审查和本轮 Root r3 对真实生产链的证据。079 仅作历史背景。

## 可证伪假设与实际结果

| 假设 | 证伪边界及观察 |
| --- | --- |
| 固定 128 页仍会挡住合法尾部 accepted/recovering | Claim 按不可变 created_at/run_id 推进到实际检查位置；满页保留尾 key，短页耗尽回卷。原 083 六树 0/32 红及只取消无关前树恢复的控制保留；088 新停滞语义在旧源仍实际红；当前作者及 Root r3 六树均在不释放前五树下完成原 32 child，五树仍 blocked、155 accepted、其他模型 0。 |
| 审批首项 slot 不满足仍挡住另一树 | ReadyInTx 仅返回 run_id 有界页，Claim 逐项实时 recovery/slot 检查，暂满 continue。088 原红与修复绿、Root 普通/race 的两个公开拒绝审批反例覆盖实际 CP/Resume 各一次、Host 写入 0。 |
| 父任务页推进漏掉新 ready 的旧 key，或释放闭门树 | usage.nextReadyParentInTx 返回实际进度，execution 在成功提交后发布；下一短页回卷重新检查关系与当前门。090 公开 128 根/257 Run/129 等待父/rank129 反例只取消目标叶即可完成原 B/root，127 无关根仍等；再取消最早叶检验回卷。另一个真实重启小例保留旧恢复父闭门，新的 ready 父成功。Root r3 独立普通构造复验 rank129。 |
| 已消费父结果后最后 Claim 拒绝仍会提交无 Work | ReadyParent 的槽/结果消费与第二 Claim、真正 Work 在同一 Base.WithinTx。第二 Claim 拒绝返回 RUN_CLAIM_CHANGED。088 实际 StopAdmission 在消费之后的旧红确认原结果被 claimed/slot 悬置；修复绿核回滚后原结果可重领。 |
| Commit 失败或 context 取消会错误发布 parent cursor/Work | 本 reviewer 外部探针真实构造 A→B→C，C 完成后在 B 实际 result=claimed、slot=1 的同事务窗口分别插入 deferred FK 故障或取消事务 context。实际错误分别为 SQLite Commit FK 失败/context canceled；Work=nil，持久 B 仍 waiting_children/result waiting，slot=0。去掉唯一故障后保留同一 execution/policy/cursor 对象，重领同 B，再回卷同 A，一次完成；没有新建 Run/改写 SQL 业务事实。普通/race 均通过。 |
| 新 Claim 串行门导致取消等待卡死或并发重复 Work | 本 reviewer 在首 Claim 的真实 inbox 事务设置外部屏障；8 个取消调用在屏障释放前返回 context.Canceled。17 个并发 Claim 调用最终只返回两个原 Run 的不同 claim，余 15 个 nil，持久 preparing/event 各 2，无伪造模型 attempt；正常 Finalize 后原两 Run 成功/pin0，迟到 Claim 无重复。所有 goroutine Wait，普通/race 均通过。该 probe 不声称每个调用都已在取消前进入 gate 等待。 |

<a id="standards-output"></a>

## 标准轴

Reviewer: native:/root/recovery_review
Axis: standards
Result: pass
Input-SHA256: a62e8c7de0b7ca0542f418e239344eb0ea2625f11d6f6e8ccc6872eb573db89a
Observed: 6 个生产变更及实际调用闭包未发现新增正确性、并发、错误处理、资源归属或边界问题；原 F-083-01 与相邻已证实问题的机制已修复。独立真实父消费后 Commit/context 回滚和并发 Claim 正反控制 normal/race 均 exit0，完整固定输入无漂移。无新增 findings。

游标是 execution Store 的私有调度状态，未混入 Run revision、资格 generation、claim、取消代或 HAP。claimGate 覆盖 SQL 事务和提交后的三游标发布，等待可由 ctx 结束；回滚分支不发布游标，也不返回未提交 Work。重开从零游标只重新检查，不能重置业务事实。全页后过滤仍保持每次最多 128 项，不通过增加上限掩盖旧反例。

内部 Control.ReadyInTx 的唯一实现为 effects，唯一实际消费者为 execution；它不提前消费 continuation。ParentCursor/ParentReady 是 adapter-only，usage 的唯一 ReadyParent 消费保持原来源派生、完整结果、结构化 partial 与唯一投递逻辑；最终消费 helper 的既有主体没有因提取而改语义。没有另建平行选择器、数据库、公共合同或依赖。

错误仍分开处理：已知 inbox 权限拒绝原子终结对应 Run 后继续；未知 I/O/SQL/context 错误回滚，不能伪装为业务成功。父结果第二次门失败需要显式错误，不能以 nil Work/nil error 提交已消费结果。本次独立 Deferred FK 是实际数据库提交错误，未让测试包装器直接返回预设错误替代 Commit。

测试处置与实际风险相符：normal 保留公开高密度构造；race 只从生成的完整不可变 Profile 准备，目标重开/Recover/Cancel/CAS/原身份消费仍在 race 二进制。loader 验文件、archive、原 Run/根/限制/阶段/slot 及来源摘要，拒绝非本地路径、重复/遗漏/未绑定条目和非正常文件，独立复制，不注入 SQL 业务状态。生成在真实 Close/Done 后捕获，只有目标用例及全部清理通过才发布，manifest 最后写入。历史 generation SHA 是来源记录，未伪称未来代码与其相同。6 秒只由原 ID 首次持久成功刷新，90 秒总界限；最终仍要求当前全体成功和原父成功，没有把 Engine 入口/累计历史当完成。

<a id="specification-output"></a>

## 规范轴

Reviewer: native:/root/recovery_review
Axis: specification
Result: pass
Input-SHA256: a62e8c7de0b7ca0542f418e239344eb0ea2625f11d6f6e8ccc6872eb573db89a
Observed: 在本次明确代码验收范围内，未领取 accepted 可跨闭门树推进、正常审批/未消费父结果继续原生命周期、真实中断仍需显式原 CAS/generation 恢复；资格/权限/取消/Stop 与物理派发末门未因公平扫描放宽，原身份、CP、回执、预算与未知效果保持。原 F-083-01 不再阻塞当前候选；真实 Provider/Obsidian/目标 OS 仍未验，不宣布其他票或 Goal 完成。

沿实际公开路径的复核如下：

- TS RecoveryClient→既有 HAP/stdio→Recovery Service/Get/Resume→recovery Store。Get 只查资格，两短 Tx 包住完整 Inspector/当前 Context 检查；Resume 先查同原 durable receipt，再核 revision、generation、完整树 watermark、事务外复查和短 Tx 再捕获。新分页不缓存任何资格，不自动释放 ready 树。Root r3 实际双击同 Promise、丢 receipt、uncertain、拒换 key、原命令重放、目标投影重锚成立。
- 公开取消先持久递归关指定树/子树，再通知同 Executor；Claim/MarkRunning、delegate、question/approval/parent 消费及 usage.Reserve/Dispatch 的原门仍生效。usage.ClaimInTx 在 slot 幂等快速返回前检查 Stop、恢复、任务与祖先门，故旧 slot 不成为通行证。Host 真正 process/create 前的 signal、lease、目标及内容末检未变。已派发后的 known/unknown Settle 不错误要求新准入，不能把 kill 当无效果。
- 原 schema8 在真实 Resume/Dispatch 后 kill 的 fixture、完整 DB+CP 备份与 016 同 Tx 迁移未变。Root r3 复用其原 manifest SHA，真实 upgrade 后相同 Run/config/CP/child decision/private proof，旧 unknown charge7 与新 known2 保持，3 个 Run 成功、唯一 child 投递、pin/slot0、integrity ok。不是修改 schema_version 或新空库代替迁移。
- Broker.InspectRecovery 仍经 Blob Port 完整读取 HUHUCP1 envelope/payload/hash/版本、pure Inspector，完整 reader hold 到结束；坏 CP/缺 Inspector 明确 blocked。旧 Source connection/lease/epoch 固定，新 lease 不被默默重绑；真实旧 lease 拒绝的 Read/Engine/Dispatch0 证据沿同字节复用。Group 后来实际消费的零 Source/private/temporary 贡献者参与校验，remove/rejoin 拒旧代，公开历史不因私有缓存失效被清空。
- 正常 waiting approval、未消费 children/question 与实际 Resume 中断的位置保持区别；恢复原 Run/root/thread/config/budget/CP/Decision/投递，用新 claim，未 Clone/清账/重置 claimed 结果。纯编排 root 仍无需模型 CP/pin/假 A 权限。
- Core.RequestStop 同步关 execution/effects/usage/recovery/协作准入后由单 drain 重试持久 Stop；等待 Executor、Inspector、真实 HTTP producer，最后释放 DB/Profile。Root r3 真实 Stop 写失败、晚 Background Dispatch 与新 root 拒绝、Close 超时仍持锁至实际 join 的 normal/race 通过，未以 disposed/Close 返回代替真实 Done。CLI EOF/shutdown 和 managed close/exited 的未变代码审查沿原证据承接。
- TS 与144形状/276共享样本合同未变；Profile/epoch、显式 retry、dispose/迟到响应、receipt 已知后重锚失败保持身份与正文边界。真实 TS→Go 链不同于 Peer 单测，T20/T23 后续 UI 组合不在本票被宣称完成。

## 产物与验证

自有副本 `/tmp/huhu-review091-orc789t5/native/huhubot` 复制全部 292 个原 module 文件，摘要 `4f239abfd02ba785ed8525ff4676c1af23d8f6069cac93474d8190dc61a44d92`。唯一新增外部文件为 `tests/contract/chat/review091_test.go`；原生产、测试与 fixture 字节均未改。公开三层准备代码复用现有 Stop 测试，独立增加父消费后的真实 Commit/cancel 故障及同对象重试断言、并发领取观察。这个复用不被冒称为完全独立重写的公开 E2E。

自有工件：

- 00 副本输入（历史日志已清理：`logs/00-probe-input.json`），01 实际探针（历史日志已清理：`logs/01-independent-probe.go.txt`），探针 SHA256 `d877c08c5f32f8f40aef2e28f040e8b9b0105e82ad6ff588d0a5936bae720cfe`。
- [02 normal 输出](logs/02-independent-normal.log) 与 实际回执（历史日志已清理：`logs/02-independent-normal.json`）：`go test -mod=readonly ./tests/contract/chat -run '^TestReview091' -count=1 -timeout=45s -v`，actual exit0、Wait true、2.501 秒。
- [03 race 输出](logs/03-independent-race.log) 与 实际回执（历史日志已清理：`logs/03-independent-race.json`）：同命令加 `-race`，actual exit0、Wait true、6.597 秒。仅这组受新并发状态直接影响的小反例，没有重跑大队列或无关全矩阵。
- 04 范围比较（历史日志已清理：`logs/04-r1-r2-scope-comparison.json`），05 最终输入/进程复核（历史日志已清理：`logs/05-final-input-process.json`）：349/122、HEAD/index 全一致；外部及仓库原 292 文件无漂移。独立复核 Root r3 的2116输入、插件1875输入和 main.js/styles.css 都无漂移；作者报告、15+3自有文件和088回执68工件 SHA 无漂移。090工件未在05再次全量核哈希，沿 Root 已接纳30工件回执与本轮所读关键原始日志使用，未冒称独立全量重核。

其他实际验证按输入及影响复用，而非本 reviewer 重跑：088 最终 normal 0/8.437s；旧源相同6秒停滞判据预期红1/15.022s；race完整4/6消费0/84.838s，vet/Go架构0。090 两父例 normal0/4.159s、race0/73.669s。Root r3 普通完整大队列/129父/旧恢复/审批边界0/21.950s，不同旧崩溃/坏CP/drain/Stop/审批 race0/19.503s；Runner build0/.548s、TS bundle0/.488s、生产 TS/HAP/stdio0/.625s。真实 Model 入口1/恢复请求2/真实 Provider0；所有实际 Runner/Core Wait，无强杀。插件 build0/36.094s、lint0/64.110s 按1875相同输入与产物复用，明确未重跑。

自有两条 Go 命令均已真实 subprocess.run 返回、Wait；17+8并发 Claim goroutine 在正常和 cleanup 分支均 WaitGroup.Wait。父结果探针使用生产 Store/UoW，未启动 Engine/Core/HTTP/Runner producer，不把手动 Store 反例冒称物理模型 E2E。所有临时 DB/Profile cleanup 已在 Go 退出前运行。当前没有自有活跃测试进程；不以当前进程不存在倒推历史 Wait。最终 return validator 输出另存本目录 logs/06-return-result.json，只有实际 exit0 后才原生 MESSAGE/FINAL 交回并停写。

## 原失败保留与限制

083 原五次探针全部保留：01/02 RUN_QUEUE_LIMIT 是未达前提，03 API 名误用是编译错误，04 六树都已领取的前提错误；05 是5个闭门树加第6个 none 树的真实饥饿反例。旧日志“6 interrupted trees”的措辞不作事实使用。本轮不是覆盖原 request-changes，而是对不同 SHA 的修复候选重新作双轴判断。

088 的07/13 race 准备失败保留：13日志 n=2 是第三根，approval/recovery/delegation通过不等于chat及collaboration-policy通过。16 的持续进展、19 暂停扫描控制支持争用成本但未完整归因；19只有5个Engine入口不是31child完成，外部 seam 未进生产。最终固定 Profile 分层和原 ID 持久进度判据有明确补充与旧源真红支持。090准备改为单个90秒总预算，原触发后5秒目标未放宽；当前通过不能抹去原准备失败。

原080业务红/测试过时、081 fixture错误、085严格Derived/事件观察竞争、086测试lane维护、082 ignored-test lint误调用与Root r1的Kind/Reason、interrupted pin误判仍按083完整分类。原events首次3秒无现场，受控同类竞争原因不能倒推首次事故；旧首次normal仅顶层Wait可证，历史嵌套CLI Wait未证的限制保留。Python先缺包与后正向sample非法none+range分开，最终唯一生成器正向覆盖、25decimal负例、276共享例不改变schema。没有称一轮全模块/11包矩阵全部绿，也没有将无 DATA RACE 输出替代成功退出。

## 问题与下一步

无新增 finding，无需本 reviewer 修生产。Root 可在完整回读、确认原生 MESSAGE/FINAL 与 return0 后，按既定工作流接纳本次代码门并继续剩余已授权票。真正 Provider、Obsidian、目标 OS 现场验收仍由用户后验，不索取凭证。全局计划/UI/doc锚点诊断、T20/T23组合及剩余28票Goal工作不由此报告完成或归档。
