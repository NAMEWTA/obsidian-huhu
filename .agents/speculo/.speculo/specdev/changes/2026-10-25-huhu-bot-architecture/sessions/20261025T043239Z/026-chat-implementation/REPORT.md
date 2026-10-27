# T-03 单聊与共享底座候选交回

Session: 20261025T043239Z
Task: 026-chat-implementation
Status: completed

## 聚焦交接

T-03 已从真实公共 Conversation Facade/HAP 装配到同一 SQLite：受理事务持久化配置 pin、Session 占用、Run、用户消息、首事件及幂等回执；有界执行器扫描 accepted，事务外准备资料和调用纯 HUHU Engine，终结事务同时保存消息/usage/事件/终态并释放占用。生产 Engine 当前明确 `ADAPTER_NOT_ASSEMBLED`，只有测试显式注入 fake，无生产假回答。与027/028共同冻结 SourceSnapshot、Scope、Grant、Host read/search、lease、历史访问和 cursor 合同；资料历史外发按当前固定接收方重新检查 read+send，实际消费来源写入派生回答。

所有本片生产/测试 writer 已停止，现交回候选供 Lead E2E、工程接纳及独立双轴审查；`completed` 不表示自行推进 Ticket。联合源码快照为 [logs/source-snapshot.json](logs/source-snapshot.json)，105 files，tree SHA256 `4187569a76a91f343b456a7e930f58b21c2cabd5120060ea95c4be038dd9585c`。这是明确范围的 Go/合同/public API 源码快照，不冒充发行资产 hash；不包含 TS 消费者、dist、正式状态或他人报告。

## 产物与验证

### 实际代码与所有权

- T-03 新建 `native/huhubot/internal/domain/conversation/direct/**`、`domain/execution/run/**`、`application/conversation/direct/**`、`application/execution/{commands,executor}/**`、`adapters/outbound/sqlite/{conversation,execution}/**`、`migrations/003-conversation-run.sql`、`tests/contract/chat/**`。未修改 T05 owner 的 app/store/domain/bridge/005 正文或其测试。
- 原 T01 owner 维护 `internal/application/api/{access,conversation,assistant,types,service,host_read}.go`、inbound HAP router/conversation、stdio server、protocol HAP types/生成产物、`internal/bootstrap/core.go`、base migration backup 命名与唯一 registry；公共 `src/modules/huhubot/api.ts`、`contracts/hap/v0.1/**` 同步。Foundation 原未装配断言改为仍未装配的 `runs.resume`，保持 `runs.start` 新能力真实声明。
- 经 LOG061 的 T02 精确维护：`sqlite/assistant/store.go` 提供 adapter-only `PinInTx/ReadPinInTx/ReleaseInTx` 与同事务 UsageReader；`application/assistant/{ports,service}.go` 接纳真实 usage 与规范化 digest。SQL 类型未进入 application/domain，`credentials.go`、002 历史迁移、凭证实现/测试、TS transport/Host/client 均未由本片修改。
- 003/005 文件分别注册 SQLite Version3/4，`CurrentVersion=4`，001/002 未改、未创建空004。HAP v0.1 的 wire schema version 仍为1，63 methods /126 params-result definitions；新增实际正向装配的7个会话/Run方法和3个Grant方法，反向 Host 新增 read/search。内部 `ContextAccess.Search(..., cursor ...string)` 支持当前授权下逐页查询，无新增公开 HAP 方法。
- 此票未增加依赖，go.mod/go.sum 无本轮变动；无提交、推送、发布或正式状态写入。统一 schema SHA256 `99c47f8c6f2b5e12860e8c71111e74bd8fa77d63b747c034c8965b89625e2ba8`，public api.ts `8bc03dfb02ecf1177cc2c2e35447bce60ffde979a2c3b73d16e302e1c0f5d05f`，完整文件 SHA 见快照。

### 原子性、权限与生命周期

同 key 先查原回执再判断 busy/CAS；同输入不同 commandId 返回同 Run，异输入冲突，新 key 即使正文相同也是新意图。StartRun 同事务读取真实 enabled/head 并 pin immutable persona/model，提交后 wake 只是优化；受理失败不残留 pin、消息、首事件或回执。Session/direct 成员与 principal/Profile 隔离，队列128、并发2，分页有界且无模型调用。

执行器只领取 accepted，启动将 preparing/running 保留为 interrupted，不自动重放付费动作；Client EOF 不取消已受理 Core 工作。Engine Run/Resume 只收 HUHU 数据和 HUHU event/result，不暴露 SDK/CP 字节；suspended 只保留内部 checkpoint reference 与占用，恢复/取消由后续 T16 完成。完整/明确 partial 消息在终结事务写入；无 partial 的失败不伪造回答。未知 usage 省略；部分已知/estimated 保留，真正测得0是显式字符串 `"0"`，非法计数不转成精确零。

Prepare 后和真正 Engine 前重验 read+send、固定 recipient、父范围及当前 lease；MarkRunning 又在同库事务复验。确定撤权以失败终结释放占用，claim 冲突尊重已有赢家，原始存储失败保留旧事实。UI History 仅按当前 read 过滤；ModelHistory 逐条用服务器持久的 sources/scopes/grants、当前 Run recipient 与 read+send/lease 筛选。来源预算32，超过时丢整条旧来源消息；合法历史消费并入 effective_source/scope/grants，派生回答继承来源。Scope 本身不触发自动全库扫描。

### 真实验证回执

| 命令/证据 | Exit | 实际观察 |
| --- | --- | --- |
| 初始 `go test ./tests/contract/chat`，[logs/01-chat-red.log](logs/01-chat-red.log) | 1 | 公共 Conversation Facade 尚未装配的有效行为 red；非 setup/fixture 错误。 |
| 定向完整 chat `-v`，[logs/02-chat-progress.log](logs/02-chat-progress.log) | 0 | 同库原子受理、配置 pin、Usage、历史外发/派生来源、编辑/Retry/归档及故障窗口通过；当时尚未加入最后两项 transport/concurrency 测试，最终由下列全套覆盖。 |
| `go test ./tests/contract/chat ./tests/contract/foundation ./tests/contract/assistant -count=1`，[logs/03-affected-go.log](logs/03-affected-go.log) | 0 | chat1.718s、foundation3.991s、assistant17.248s，含新 HAP EOF/并发上限路径。 |
| `go test ./... -count=1`，[logs/04-all-go.log](logs/04-all-go.log) | 0 | access2.076s、assistant18.068s、chat1.545s、foundation4.479s、credentials8.246s；使用当前安全 fixture，无真实 OS/keyring/model。 |
| `go test -race ./tests/contract/chat ./tests/contract/foundation ./tests/contract/assistant -count=1`，[logs/05-race.log](logs/05-race.log) | 0 | chat5.514s、foundation25.510s、assistant32.227s，无 race 报告。 |
| `go vet ./...`，[logs/06-vet.log](logs/06-vet.log) | 0 | 无输出、无诊断。 |
| Python 固定 venv `.../bin/python contracts/hap/v0.1/validate.py`，[logs/07-schema-pinned.log](logs/07-schema-pinned.log) | 0 | 126 method shapes、3 frame goldens、25 decimal negatives、174 shared method cases 全部一致。系统 python 首次缺 jsonschema，原 setup 错误保留 [logs/07-schema.log](logs/07-schema.log)，不算生产 red。复用既有固定工具 venv，不加项目 runtime 依赖。 |
| `node scripts/verify-huhu-bot-architecture.mjs`，[logs/08-architecture.log](logs/08-architecture.log) | 0 | 24 production files 检查通过，application/domain 无 SQL/宿主/adapter 越界。 |
| [logs/check-generated.py](logs/check-generated.py)，[logs/09-generator-reproducible.log](logs/09-generator-reproducible.log) | 0 | 隔离临时目录重新生成，6份 schema/method/golden/Go 输出逐字节相同；临时目录自动删除。 |
| `gofmt -l native/huhubot` | 0 | 无输出；未为检查改写源码。 |

关键反例单列，避免混淆证明范围：

- `TestIndependentProcessCommitExitBeforeWakeScansOnce` 真正启动测试二进制子进程。生产 Facade 的 StartRun 已 commit，wake callback 在交付 wake 前 `os.Exit(23)`，没有执行 SQLite/Profile 清理；父进程 `CombinedOutput` 完成 Wait，保留 WAL 重开后 scanner 只调用一次 fake Engine。Run=1、用户/回答消息=2、终态 pin=0，原 key 仍返回同回执。旁边 `TestCommitAfterIntentBeforeWakeReopenScansAcceptedExactlyOnce` 是同进程 Close/reopen，单独保留，未冒称进程故障证据。
- `TestRealSQLiteFullRollsBackFinalizationAndReopenKeepsUnknownUsage` 用生产连接 `PRAGMA max_page_count=current` 实际触发 `sqlite3: database or disk is full`。终结回滚后仍 running、仅用户消息、pin=1、事件=3、usage未知；重开变 interrupted、无虚假精确零，Session 仍 busy。首事件 trigger 故障另证 StartRun 整体回滚、原 key 可原样重试，无泄漏/新 key 兜底。
- `TestSendRevokedAtFinalAdmissionWindowsFailsAndReleases` 两个真实 SQLite 窗口：Prepare 已完成后撤销仅 send Grant；最后 Admission 已过、MarkRunning 开始前提交撤销。两者 Engine=0、无回答、failed/ACCESS_REVOKED、pin与Session占用释放，无伪造 running 事件。
- `TestModelHistoryRequiresCurrentSendAndRecipient` 通过公共 Facade 运行两次：旧消息来源的 send 已撤、read仍保留；或绑定新 endpoint/revision。用户仍见旧历史，第二个无附件 Run 的真实 fake Engine 输入 History=0/Context Sources=0。`TestLegalHistoryInheritanceRetainsDerivedProvenanceAfterReopen` 反向证明合法历史确实进入模型、第二回答保存来源；撤 read 后历史只剩用户独立输入，重开仍过滤派生正文。
- immutable 配置 old/new head、同 key 两入站并发、同正文新 key、真实删除预览 active-runs/related-sessions、partial失败、未知/部分估计/测得0 usage、RetryOfRunID/编辑 supersedes 重开、归档/分页、HAP EOF 后继续完成、Core cancel join后重开不自动重放、并发2与第三 accepted 扫描均有实际回归。

### Skill、参考与作者

执行 dev（当前 SHA256 `5df9ccddd677ad4cea397a31e7e668d97b125e8ae26b3c72c38d791be9066293`）及 SpecDev I，按 architecture/testing/licensing、已读 TDD/风险规则实际实现并验证；T01 日期/Unicode/身份锁/背压由最终 foundation 回归保持。复用031及固定 `evidence/chat-access-preflight.md`、`IMPLEMENTATION-REFERENCES.md` 的 Eino/OpenBot/OpenHanako 比较：采用持久 accepted 扫描与独立 receipt，不照搬内存 stream/SDK lifecycle 为业务事实；无外部源码复制、新许可或依赖。

实际本片作者是 native agent `/root/foundation_go`；Lead 派遣记录 requested model=`gpt-6.1-sol`、reasoning_effort=`xhigh`。这是派遣请求记录，工具没有暴露可核验的实际底层 model attestation。027/028 产物与验证由其各自报告承担，不能将本片共享快照冒称独立审查。

## 问题与下一步

无已知本片阻断缺陷。Lead 继续基于冻结输入做独立 E2E、build/lint、T27五目标资产与双轴审查；本报告不提前声称这些已通过。真实 Provider、OS keyring、目标 OS 真机、真实 Obsidian 操作均 user-owned / not-run；本票没有索取凭证，没有运行默认 D-Bus 探针。公共 runs.cancel/resume、CP/approval/effect、事件续读等后续票能力仍不装配，不假装本票已实现它们。

T04 复用 `sqlite/execution.AddEventInTx(ctx,tx,runID,type,body)`：单 Run 持久 counter 在同事务分配 seq，首次 accepted 固定seq1；后续 event 和 Run/Session 变更同事务，续读以 `execution_events` 为唯一事实，广播只是提示。T06 的 CP/Approval/Effect 与首审批关闭效果准入应在未来同一 base.Store/UoW 内组合此 seam，不能另建事件权威；本票没有提前实现审批状态机。T16 对 interrupted/blocked 的核查需尊重现有 intent/receipt/pin/占用，不能自动收费重放。

本片启动的所有子进程均已退出并 Wait，执行器/stdio 测试协程均关闭或 join，临时 Profile 由测试清理。最终源码保持停写；没有未请求的提交/推送/发布。return 结构校验结果另见同目录日志。
