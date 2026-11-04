# 任务回报

Session: 20261031T062046Z
Task: 006-runner-stop
Status: completed

## 聚焦交接

T-04 Go 停止和 wire 候选已交付；completed 仅表示候选交回，不是 Ticket 完成或联合验收。Core 保留唯一 drain，删除 Close 的固定三秒整体超时，新增调用者期限内的真实事实快照；HAP 能在停止和数据库关闭后继续观察，正常终态响应与已受理在途响应写完后才关闭连接。实际 WAL 文件同步接缝已做超过三秒的阻塞、重复停止、锁竞争和错误事实验证，原 Host/HTTP/Probe 生产者回归义务保留。全部24项业务交付已停写，正式状态、独立双轴审查、插件构建与 T-06 联合验收由 Lead 负责。

## 产物与验证

### 工作区与范围

- current/dev，HEAD `86c500556db1d64865c4cc7f1aff1dd83de071fa`；无暂存、提交、推送、checkout 或独立工作区。
- 输入为006 TASK的Map revision5，另按Lead消息与Evidence的T04-D04使用revision7追加`native/huhubot/tests/contract/approval/checkpoint_inspection_test.go`。旧004/002 TASK和REPORT未修改。
- dev Skill SHA-256仍为 `9f2bd86d620ed274f75eecfeab254efce5a40fa2ad5c5d255c7f877a93848cc7`；应用architecture/testing/build-and-release、SpecDev I设计/TDD/测试可靠性规则。依据change ADR-002与永久Bot ADR-027复用现有单drain和WAL同步，不引入依赖或外部代码。
- 24项实际文件见末尾摘要。未改Browser、阈值、检查点策略、TS平台宿主消费者或生成的main.js/styles.css。工作区styles.css存在其他owner改动，不属于本票。

### 前后行为与设计边界

1. `Core.RequestStop`仍同步关准入、先取消executor再关其依赖。`WaitStopped(ctx)`返回`StopStatus`和等待错误；观察者取消/期限结束不取消drain。`Close()`现在真正等资源清理结束，要求期限的Go调用改用RequestStop/WaitStopped。除独立Executor自身Close外，全部`EXECUTOR_STOP_TIMEOUT`引用已从Runner/调用合同移除。
2. 四个独立事实：requested；executionDrained（executor、inspection、Probe、memory、真实producer ledger、models已收敛）；persistenceComplete（WAL同步及DB关闭成功）；profileReleased（Profile释放成功确认）。finished只表示清理过程结束，不等于成功。快照用锁保护并复制failures切片；最终等待优先读取已完成结果。
3. 清理错误聚合而不是覆盖，wire/CLI仅保留固定步骤原因。保持既有错误路径清理顺序：WAL同步失败仍关闭DB并尝试释放Profile，结果可为persistenceComplete=false、profileReleased=true、finished=true，并包含PERSISTENCE_CLOSE_FAILED。未擅自引入保锁重试/恢复方案。CLI清理错误退出1，不再一概日志EXECUTOR_STOP_TIMEOUT。
4. `Store.CloseWithSync`提供实际打开的WAL文件同步接缝；生产默认仍调用真实f.Sync，测试在此边界挂起后调用真实f.Sync。测试不是仅在Core.Close外套一个hold，也不声称模拟了内核/物理磁盘真实慢fsync；它证明持久化调用边界超过3秒时的owner/锁/观察语义。没有撤去刷盘或改检查点。
5. `service.shutdown` params的waitMs为0–30000整数，默认0；结果替换旧accepted-only合同为四事实、finished和固定failures。仅hello后的managed owner可调用；在stopping时仍可达，不访问关闭DB的guard/metadata。Router在实际RequestStop前标记显式观察，防止旧回复抢先断开；stdio待终态响应及全部在途响应写完才关。Profile删除等未开启显式观察的停止仍保留原有写后关闭行为。
6. `BotMethodMap`是生成真源；schema、Go generated类型/嵌入schema、fixtures同步。methods.json/golden.json重新生成后字节未变，因此不产生人为修改。TS method-validation直接消费该schema，无需另写一份校验。新增`contracts/hap/v0.1/shutdown.md`说明期限、错误事实、EOF/信号和后续宿主责任。

### 红灯、失败与修正记录

- 初始`go test ./tests/contract/foundation -run '^TestShutdownReturnsCompletedFacts$' -count=1`：退出1，旧生产路径返回`INVALID_METHOD_PARAMS`拒绝waitMs；实现后同用例退出0（0.158s）。
- `TestStopDeadlineRetainsProfileThroughSlowActualWALSync`真实WAL接缝挂起3100ms，caller超时、另一Open冲突、重复请求一次sync、后续完成与重开均通过。受控变异把旧3秒等待放回Core.Close，退出1，断言`Close abandoned actual sync: context deadline exceeded`；finally恢复并核对源码SHA-256 `cff2d581a4e53a983a8becd7de1839d238e75aa3a9f0baf6691d0c325d9d0723`，后续race绿灯。
- 并发终态回复反例：仅释放barrier后马上读的初稿不能确定触发窗口；加入barrier未释放期间连接开放断言后，旧关闭逻辑准确退出1：`in-flight reply dropped before barrier release: EOF`。修复为终态ACK+全部在途回复写完才关。
- 该并发测试第一轮race补测曾因`wire.ReadFrame`将故意读deadline包装为`HAP: TRUNCATED_FRAME`而失败；改用原始client.Read观察开放连接，保留超时/EOF区分，未放宽时限或删断言，随后退出0。
- 非显式观察停止反例初始退出1：`unobserved stop kept transport: read pipe: i/o timeout`；恢复未观察停止的写后关闭行为后定向race通过。
- 全量Go观察又暴露该新增fixture的时序问题。该次原输入核心片段为：`hello(t, client); _ = core.RequestStop(); send(... service.health ...)`。server可能仍在hello写后检查，合法关闭后health发送在`stop_phases_test.go:35`报`io: read/write on closed pipe`。修正为测试Service wrapper在已受理Health handler内调用真实Core.RequestStop，消除外部stop/hello竞争，保留50ms EOF断言。修后完整foundation与该用例race均通过。全量运行期间仅此测试文件发生上述修正，不能把旧全量其余输出合称新快照全量通过。

### 实际命令与结果

全部Go命令前置`GOTOOLCHAIN=go1.26.10 GOWORK=off`并在`native/huhubot`运行（实际使用`go -C native/huhubot`）；Linux x86_64，Node26.11.1/pnpm11.1.3。重型Go/race按顺序运行，没有重复启动同套件。

| 命令/范围 | 退出码与结果 |
|---|---|
| `go test -p 1 ./internal/bootstrap ./tests/contract/foundation ./tests/contract/recovery ./internal/adapters/outbound/sqlite/base ./internal/protocol/hap -count=1` | 0；bootstrap4.495s、foundation17.069s、recovery3.228s、base0.539s；hap无测试文件 |
| `go test -race -p 1 ./internal/bootstrap ./tests/contract/foundation ./tests/contract/recovery -count=1` | 0；21.317s /107.430s /31.530s。此为追加最终stdio修正前的广泛race结果 |
| 追加`-race -p 1 ./internal/bootstrap ./tests/contract/approval -run 'Test(FinalStopReplyDoesNotDropAnotherInflightReply\|ShutdownCanObserveAgainAfterDeadlineAndDatabaseClose\|StopDeadlineRetainsProfileThroughSlowActualWALSync\|StopSyncFailureDoesNotClaimPersistence\|StoppingHostProducerPersistsUnknownBeforeProfileRelease)$' -count=1` | 修复测试观测错误后0；bootstrap7.527s、approval2.337s |
| 追加`-race -p 1 ./internal/bootstrap ./tests/contract/foundation -run 'Test(FinalStopReplyDoesNotDropAnotherInflightReply\|ShutdownCanObserveAgainAfterDeadlineAndDatabaseClose\|StopWithoutShutdownObservationClosesAfterReply\|ShutdownReturnsCompletedFacts\|ManagedShutdownAndCleanEOF)$' -count=1` | 0；3.102s /3.719s；非显式停止fixture后来由全量暴露并修正，不能单凭此轮证明旧fixture可靠 |
| `go test -p 1 ./... -count=1` | 1；唯一失败为上文新增foundation fixture，所有其他包通过，private-memory218.992s。此为修前/混合期间集成观察；-p1用于共享环境资源协调，不声称修复默认并发全量的基线时限失败 |
| 修后`go test ./tests/contract/foundation -count=1` | 0，14.732s；覆盖本次全量失败所属完整包 |
| 修后`go test -race ./tests/contract/foundation -run '^TestStopWithoutShutdownObservationClosesAfterReply$' -count=1` | 0，2.512s |
| `pnpm exec vitest run src/modules/huhubot/core/protocol` | 0；5文件85用例通过 |
| `node contracts/hap/v0.1/generate.mjs`及生成前后6文件SHA对比 | 0；75方法、324方法DTO用例；二次生成字节一致 |
| `pnpm test:huhu-bot-architecture` | 0；77生产文件检查 |
| `pnpm test:huhu-bot-tooling` | 0；24用例通过 |
| `pnpm exec tsc -skipLibCheck -p tsconfig.test.json` | 0 |
| `pnpm exec eslint src/modules/huhubot/api.ts --max-warnings 0` | 0 |
| `pnpm run lint` | 编排126/内部lifecycle1；仅并行任务`docs/e2e/dev-overhaul/startup/vitest.config.mjs`的node:path/node:fs两警告。已交Lead协调009任务处理，不改全局规则 |
| `python3 contracts/hap/v0.1/validate.py` | 1；缺`jsonschema`，未安装依赖。独立Python校验未完成，不能写通过 |
| `git diff --check -- native/huhubot contracts/hap src/modules/huhubot/api.ts` | 0 |

有效行为覆盖：真实Profile锁与重开；真正WAL文件的延迟同步和故障；并发重复RequestStop；晚HTTP/Host/Probe/memory生产者；SQL stop fence失败不推进阶段；同HAP连接期限后重试及DB关闭后的最终查询；两个并发终态ACK；非显式停止仍退出；生成的waitMs负值/非整数/超界、未知failure和旧accepted-only负例。

## 问题与下一步

- Lead已要求并开始固定24项交付供独立两轴审查；本worker不宣称审查已通过。后续修复须先使旧快照失效。
- T-06必须迁移正常client-runtime/managed transport生产路径，不能继续首个ACK后close或固定4秒强杀后宣称closed。旧TS runner.test.ts的accepted-only精确预期尚未迁移，属T-06；本票没有运行其生产消费者联合测试。原合同`go test ./...`默认拓扑和完整TS↔Go联合验收留给稳定最终输入，不能由本轮-p1观察替代。
- 插件构建/预算由Lead负责；schema可能增加main.js，T-02仅余160B，已主动报告风险，未提高阈值或生成插件资产。需要实际构建测量。
- 没有Windows/macOS/真实Obsidian证据；没有把callback边界延迟称为真实磁盘性能。Profile释放失败的OS层故障、CLI清理失败的真实子进程注入没有专门实测；固定错误映射通过代码核对，WAL失败事实有测试。
- 全仓lint跨任务警告与可选Python环境缺失如实保留。新引入的Go测试时序问题已修复并复验；没有保留已知失败的本票行为。
- 报告交回后不再写入，未运行或未知的项目不当通过。

### 候选文件摘要

```text
e863c01bbc629543d13c1568d3d6c094d82a0debaf3e318e49c420b669db067f  contracts/hap/v0.1/fixtures/methods.json
e6878fcbb1b1d1e2dccc16291af1df31b2b9ee13085b959d57334271efbd45bf  contracts/hap/v0.1/generate.mjs
bdc850e7794ddfd2cb808786158817655a3c3f1cf657e87c652f08bb0d02d21a  contracts/hap/v0.1/schema.json
e429bdc0b28bf659fe2079168cfd8bb7268c28050e654f0158b691bb71266a91  contracts/hap/v0.1/shutdown.md
3e84d2515b1365fea6005286911484fb652fa49a7ea15e3612a8e1a860eb5aab  native/huhubot/cmd/huhubot/main.go
234ce257c3e389ac9cca71e3900c8e31383c8d948c085cd55df78e3e2f8096e8  native/huhubot/internal/adapters/inbound/hap/router.go
73854e724d4fb3deb04d23cba01ad2960bda18c2d18aa8b857c92fbc3b102367  native/huhubot/internal/adapters/inbound/stdio/server.go
d342d1766df3511b5fb80982c1d989385d9b423944c239ff56ffd86123ce52ca  native/huhubot/internal/adapters/outbound/sqlite/base/store.go
dfd17b10a402b6b64c4b15ac357b5d36772f3a5087cd15905980d721de2c21ed  native/huhubot/internal/application/api/service.go
f3a083208215e977c7ddca75193b6baecfc9647879827d2c89b1a0d5ac776b7a  native/huhubot/internal/application/api/types.go
cff2d581a4e53a983a8becd7de1839d238e75aa3a9f0baf6691d0c325d9d0723  native/huhubot/internal/bootstrap/core.go
8bffedb6e358adf94e7b60f25b598451f595b11de23781fe888af5491e019618  native/huhubot/internal/bootstrap/stop_phases_test.go
3da741b95b812ee711a0276bbb77a96afa55fe96f6c2f2ef708045fccbe9c0b1  native/huhubot/internal/protocol/hap/methods_generated.go
bdc850e7794ddfd2cb808786158817655a3c3f1cf657e87c652f08bb0d02d21a  native/huhubot/internal/protocol/hap/schema_generated.json
ce2a0ffa7d4e6b42704a46de9d8a204dc904a85305aefa68fae71d9f0f6641cd  native/huhubot/internal/protocol/hap/types.go
1d9e08cd52abe6eae925226daf89b717fe6c45c78adb9e88e9f589b23f03ba9c  native/huhubot/tests/contract/approval/checkpoint_inspection_test.go
de95aa370629e8d811a0cd70ba46c7e39e769154fe6dc686660816982f2bb900  native/huhubot/tests/contract/foundation/default_engine_cli_test.go
91857b636130dc89aceca3110bd79a9c81445a9b54f2f788330892809b252c4d  native/huhubot/tests/contract/foundation/default_probe_lifecycle_test.go
3a38a22aef94dea4a21ed128bfcac12317631ab724a825c74f2fe6c868cd08ba  native/huhubot/tests/contract/foundation/duplex_test.go
693fe6d967d759c557b4f45dc85f59c5e043f9809e580173212329ecd407548f  native/huhubot/tests/contract/foundation/recovery_lifecycle_test.go
9f6354a55582d8bd701a2d317ba66c8ca667cc0871de7c7099273c059a02eec9  native/huhubot/tests/contract/foundation/runner_test.go
16c0accff81ac158c77c3b53821680021d60819f09adcfa1966b086e7308072d  native/huhubot/tests/contract/foundation/stop_phases_test.go
2f181d5dea616bf9786b93a9387cbe5ad9d8f5cc9df568db1bca9aa95f6795dc  native/huhubot/tests/contract/recovery/producer_test.go
42ae627b43bfb394c27f4976e02e7d0ec52ba0e21dd64d888de1beda6eba448c  src/modules/huhubot/api.ts
```
