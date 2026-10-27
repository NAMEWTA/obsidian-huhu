# 048 来源历史交付与消息快照修复报告

Session: 20261025T043239Z
Task: 048-source-delivery-repair
Status: completed

## 聚焦交接

交回 046 的 STD-01 / SPEC-01（来源 History 投递成本）和 STD-03 / SPEC-03（快照消息来源）修复候选；STD-02 / SPEC-02 的 EventClient 生产修复由 049 原 TS owner 完成，本作者只维护正式授权的 Go `ts_test.go` 真实联调。执行身份为 native `/root/credential_provider`，复用 dev / SpecDev I、当前 Map13 / Goal12 及 048 TASK。未再委派、提交、推送、发布或修改正式状态。

完整回读 046 最终两轴 REPORT、三个原始失败日志和两个 Go probe / 大事件消费者源码。046 REPORT SHA 为 `6d5f6e72de4379fee1dbae92c71ba808cdb5e940c1ba78de7af862217e49588d`，原候选输入 `a129b2b03c62625b541392a92321f9cf16d74383d2de85dbd3c3b44f92339371`。自有隔离副本 `/tmp/huhu-source-delivery-048/repo/native/huhubot` 从 reviewer 只读副本复制；132 个 native 输入与当前起始文件逐项一致、两个正式 probe 逐字节一致，证据 [01](logs/01-copy-integrity.json)。没有改原 046 报告、原 probe 或原临时目录。

仅写 TASK 列出的 8 个文件（4 生产、4 测试），无新 helper 文件、迁移、公开 DTO/Port、schema、锁或依赖。原 T03 execution scanner/batch helper保持冻结。生产/测试已停写，8 文件与最终普通/race/vet开始时摘要无漂移，全部进程 Wait；精确差异 [repair.diff](logs/repair.diff)、起始/最终 SHA [input-sha.json](logs/input-sha.json) / [source-snapshot.json](logs/source-snapshot.json) / [18](logs/18-final-freeze.json)。候选待 Root 固定联合 r2、Lead 回放和 050 独立审查，不当作正式双轴 pass 或全票 done。

18 的汇总命令实际 exit1：仅 Root-owned `goal-plan.md` 的起止 checkpoint 改变，`unchanged:false` 原样保留。Root 已实际确认 `/tmp/huhu-record-events-review-failure.mjs` 更新 046 回修导航，仍 Map13/Goal12，未启 Map14；见 [20](logs/20-navigation-change-classification.json)。这不是源码漂移或产品失败，也不宣称全规范来源未变。8 源码/测试、冻结锁、原 execution helper、046 REPORT/两 probe/TASK未变；049 两 TS SHA 在18明确单独登记。

## 产物与验证

**来源投递。** 旧批路径只合并 profile / Run / message 元数据；每份有来源的 input 仍读 Run recipient 和 Grant，期限计算再读一次同 Grant。现在只在同一个短事务内收集并批取不可变的原始 RunRecipient / Grant 事实，SQL 参数化、每 chunk 最多256项，rows在下一查询及外部 IO 前关闭。没有 `uniqueGrant<=800` 新规则；总引用数服从原每 input/parent 上限和800主体，收集前完整验证，chunk前与逐项都有取消检查。事实 map 不放在 Store 字段、不跨事务/请求、不存“已允许”。

Grant JSON 的单读/批读共用 scanner / decoder，完整 `recipient_json` 仅复用解码；每条仍核本 Run 的 principal/profile/session、固定 recipient/agent/model。相同 recipient JSON 的另一条 Run 不继承首条 ACL。Grant→domain 与 expiry 解析可复用不可变表示，坏 JSON / expiry 错误保留；每条仍运行 `policy.Authorize(..., now)`、父 Grant 当前状态/到期和实际 coverage选择，旧公开单读 `CheckInTx` / `ReadDeadlineInTx` 路径、reason保持。Domain policy只读Operations/Recipients/Scopes，未原地排序、修改或把 verdict 复用。

每个 exact input 在 `loadReadFacts` 前置收集时独立完整 `access.Validate` 一次；完成后不再窄化/改写，私有批事实仅免除自身新引入的第二次重复纯验证。`facts=nil` 单读仍执行原Validate，当前权限/时间检查不跳过。此边界已由 Root 明确确认，invalid / mixed / parent 与批单负例实际运行。

`readMessagesInTx` 仍逐条读取自己的持久 source_json，只按同次调用内完整原 JSON 字节复用不可变解码slice。`HistoryReadInput` 按值复制、Scopes新建，后续校验/策略只读嵌套来源，因此不污染同 Run 或另一条消息；每条当前授权仍运行。保留原250ms / 800subjects、精确消息来源、外人/缺失拒绝、SQL不跨physical writer与撤权同gate。

**快照。** Snapshot现在读取各条 `conversation_messages.source_json`，空用户来源保持 `[]`，assistant派生来源保持其持久值，与公开History/SQLite逐消息一致。仍先过整个Run当前read gate；消息来源还必须是已授权effective事实的精确子集，坏/空null JSON、未知或重复provenance安全返回 `CONFLICT/MESSAGE_CONTEXT_INVALID`。没有用用户消息空来源放松整个恢复正文的读资格。snapshotSeq、messages、facts仍在原同一事务，真实270事件压缩/CURSOR_EXPIRED路径覆盖。

**TS消费者。** 只读消费049冻结生产 `event-client.ts` SHA `9976369d282bb08345d597d79489647e1200d7fdcfff63a9b87e2135b51852b2` 与其测试 SHA `58324e7d050a833012a0cb5dfe2434564f1e33b44fdc816bcaeac71ea73277fb`。永久Go fake Engine发出单个65000、65536、控制字符/引号/反斜杠混合65536 UTF8 bytes，以及带真实Source metadata的65536事件。生产EventClient/HapConnection/HostReadService ↔ Go bootstrap/stdio/Executor/SQLite 全链最终均seq5/succeeded、正文exact，下一refresh不重复，并用已有524288页RPC作对照；原11项权限/Broker/Cancel/BigInt行为仍通过，合计15观察。

旧TS生产已先打包固定 [05](logs/05-old-ts-bundle.log) / [摘要](logs/old-ts-bundle-sha.json)，再由真实Go child执行新永久fixture；[07](logs/07-large-old-ts-red.log) Node实际exit126，65000对照先通过，65536四次refresh在seq3/running与paused/seq0/EVENT_PAGE_TOO_SMALL之间重复。因断言早退，旧TS红中尚未执行escaped/Source后续向量，不冒称四项都红；新TS最终四项及其余11项全真。旧bundle仍可回读，不受049后续生产写入影响。

永久新增/扩展入口：

| 文件 / 测试 | 实际边界 |
|---|---|
| `events/history_test.go` `TestSingleSessionHundredSourceMessagesReachActualHistoryWriter` | 一个Session、50个已完成公开Run、100条带来源History，原250ms gate及真正HAP100 items |
| 同文件 `TestEightHundredActualSourceMessagesFitGateAndRecheckRevocation` | 400个独立Session/实际Source+Grant Run、800持久来源消息，直接gate上界；下一Tx撤权拒绝。不是一条跨Session HAP History请求 |
| `access/delivery_test.go` `TestBatchReadFactsKeepSingleDecoderRecipientAndCurrentTransactionSemantics` | 真SQLite批单：坏operations/recipients JSON、坏expiry、Run recipient JSON/principal、外人/缺失Grant/recipient变化；同recipient JSON不同Run owner仍拒绝；跨Tx公开Revoke后不复用旧资格 |
| 同文件 `TestBatchReadFactsChunkMoreThanEightHundredUniqueGrantsWithoutNewCap` | 显式fixture复制 canonical Grant行，26个合法来源input×32替代Grant＝832 unique IDs 分块可用、预取消拒绝；此为adapter数据边界测试，不冒充832次公开Grant.Create |
| `events/events_test.go` `TestCursorSnapshotPreservesEachDurableMessageSourceAndRejectsBadFacts` | 明确来源正常对照、第二Run显式空来源而合法继承、真实270事件CURSOR_EXPIRED seq274；每条SQL/History/snapshot相等，bad/null/unknown/duplicate失败，撤权仍拒整个Run |
| `events/ts_test.go` `TestActualTSClientConsumesDurableGoEventsSnapshotsAndLateFacts` | 生产TS/Go真子进程15观察；有限fake Engine/HostSources/NoteWritePort，四个大事件向量含转义及Source开销；Node/Runner Wait |

所有性能/race窗口先与Root协调独占，Root build/lint及049 TS检查错开。随机ID/时间和一次性Profile不同，不要求输出字节相同；原probe代码与接受断言未改。Go工具链 `GOTOOLCHAIN=go1.26.10`，`-mod=readonly`；普通 `CGO_ENABLED=0`，race `CGO_ENABLED=1`。日志有完整命令/exit，原始失败均保留：

| 命令 / 输入 | 结果 / 日志 |
|---|---|
| 自有原probe `go test -mod=readonly -p=1 -v ./tests/contract/events -run '^TestReviewSourceBearingMaximumDelivery$' -count=1` | [02](logs/02-source-two-normal-original.log) exit0，100门21.54215ms、HAP100 items正常对照 |
| 同命令加 `-race` | [03](logs/03-source-two-race-original-red.log) exit1，100门250.455853ms/writer0，实际HAP HOST_UNAVAILABLE/REQUEST_CANCELED；2/20条正常 |
| 原probe `go test -mod=readonly -p=1 -v ./tests/contract/events -run '^TestReviewSnapshotPreservesMessageProvenance$' -count=1` | [04](logs/04-provenance-original-red.log) exit1，SQL/History[]而typed cursor snapshot给1来源 |
| 原两个probe仅替换自有副本的4生产文件，同原命令/断言 | [08](logs/08-source-two-normal-original-green.log) normal exit0，100门3.179791ms；[09](logs/09-source-two-race-original-green.log) race exit0，100门38.558368ms/HAP100；[10](logs/10-provenance-original-green.log) exit0，seq274 user[]正确 |
| 新旧TS实际链 | [06](logs/06-old-ts-probe-build.log) `go test -c` exit0；[07](logs/07-large-old-ts-red.log) 同永久fixture旧TS Node exit126，child Wait未报错；新TS最终15/16两套都15观察全真 |
| 首轮 `go test -mod=readonly -p=1 -v ./tests/contract/access ./tests/contract/events -count=1` | [11](logs/11-access-events-ordinary.log) exit0，access1.631s/events14.539s；source1002.806ms、source80029.191ms |
| 首轮同两包 `-race` | [12](logs/12-access-events-race.log) exit1：access绿，events仅新source800251.380989ms超时；source10036.626ms/HAP100、其余全部绿，无data race。失败后按计划未继续vet |
| 完整source_json纯解码复用后，仅新800 `go test -mod=readonly -p=1 -race -v ./tests/contract/events -run '^TestEightHundredActualSourceMessagesFitGateAndRecheckRevocation$' -count=1` | [14](logs/14-source-eight-hundred-race-after-json-reuse.log) exit0，229.663508ms；仍约20ms余量风险，Root接受后继续不可变表示/重复纯验证收敛，没有无改动择绿 |
| **最终** `go test -mod=readonly -p=1 -v ./tests/contract/access ./tests/contract/events -count=1` | [15](logs/15-final-access-events-ordinary.log) exit0；access1.798s/events14.359s，source1002.869248ms、source80020.740525ms |
| **最终** `go test -mod=readonly -p=1 -race -v ./tests/contract/access ./tests/contract/events -count=1` | [16](logs/16-final-access-events-race.log) exit0；access7.700s/events95.779s，无data race；source10025.031113ms/HAP100，source800202.843077ms<250，source-free800120.835043ms；所有外人/缺失/mixed/撤权/自然到期/parent/替代Grant及真实OS pipe/TS15同输入绿 |
| **最终** `go vet -mod=readonly ./internal/adapters/outbound/sqlite/grants ./internal/adapters/outbound/sqlite/events ./tests/contract/access ./tests/contract/events` | [17](logs/17-final-vet.log) exit0 |
| repo根 `node scripts/verify-huhu-bot-architecture.mjs` | [19](logs/19-architecture.log) exit0，38 production files checked |
| scoped `git diff --check` / `gofmt -l` / 8文件起止核对 | 18内格式/差异检查均exit0、无格式输出、源码drift[]；外围Goal变化导致汇总exit1已按20分类，未改写原观察 |

最终命令汇总 [final-checks-r2.json](logs/final-checks-r2.json)。Root已报告独占间隙全插件build39.787s/lint73.385s均exit0、TS/工程漂移[]且Wait；这是Root执行，非本作者重跑。未额外重复全Go/平台资产/旧凭证探针，不用无来源800绿代替来源性能。

最终8文件SHA256（以 `native/huhubot/` 为根，原值及bytes见18）：

| 文件 | SHA256 |
|---|---|
| `internal/adapters/outbound/sqlite/grants/access.go` | `cbe238f519d9571718a9b28c06c6cdf6f0b7c3545c98c69b60f16810f290c90a` |
| `internal/adapters/outbound/sqlite/grants/delivery.go` | `487e5d89363b92b5700b5909dd4eee8e2e7dd5dc7fda8b1ba5d4e0384931e890` |
| `internal/adapters/outbound/sqlite/grants/store.go` | `49b8d6d18eaeeae417839b6c57f7be5db0f84f5d24b7ab82f5e661e95ceedf02` |
| `internal/adapters/outbound/sqlite/events/store.go` | `51ba3bac4c9bef741fae5eff57316a5cf85874f4b4bfbd386957a876b83ba0a8` |
| `tests/contract/access/delivery_test.go` | `b6f4b2e792dd1ce21304a38b393442c0d7f5c9ae5154c09da81101b0d38c1052` |
| `tests/contract/events/history_test.go` | `5e61949b538bb78088b2ddb199d2d619ed47027d98b158c359e2600185098cd6` |
| `tests/contract/events/events_test.go` | `7ace033d16b2ad1c9dca62c853cb0a7d67afb10d9fa4778aa5834e73c6c6299f` |
| `tests/contract/events/ts_test.go` | `b0e05a54592767f00531e082cbb8556ef300c9e830b20abe1939e76f556988f0` |

来源/许可：本轮仅对既有仓内实现做局部批取/纯转换复用及投影修复，无外部代码复制/改编、无第三方import/新依赖/锁变动。事实解码和domain策略复用现有实现，T03 scanner/Port没有复制或越权修改。性能数值只说明这次受控窗口，不宣称不同机器/任意多来源组合恒定耗时；总permit仍严格250ms，不足时fail closed。

## 问题与下一步

本轮两个Go finding已按原反例红→绿，049大事件修复经本作者新增真实消费者向量验证；最终受影响普通/race/vet全0，无未解决实现失败。原046、首轮新800失败及中间余量风险日志均保留。没有用放宽预算、缩页、删source、跳race、隐藏API错误或UI清正文替代修复。

所有本轮Go/Node/child及pipe/worker已Wait，源码/测试停写；有限fake Engine/Host/NoteWriter不是真实模型或Obsidian/Vault效果。真实模型、用户库、目标Windows/Darwin/keyring现场按LOG051由用户后验，未访问凭证、旧默认D-Bus或用户存储。Root随后固定联合r2、独占回放046三项并交050独立复审；本作者仅完成REPORT/return/实际MESSAGE与FINAL，不改正式接纳状态。
