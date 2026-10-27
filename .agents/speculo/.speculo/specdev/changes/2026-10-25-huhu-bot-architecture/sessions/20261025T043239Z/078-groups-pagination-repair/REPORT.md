# 078 任务列表分页的实际消费边界

Session: 20261025T043239Z
Task: 078-groups-pagination-repair
Status: completed

## 聚焦交接

本票只修复077的同源 P2 STD/SPEC-077-01：字节预算未返回的私有结果被记为模型已消费贡献。已完整读取078 TASK、077两轴报告/原分页、条数控制、多贡献者和SQL探针、074最终交回及当前 T13 review-input-groups-r1；沿用未变的 AGENTS发现/dev/I/error/test-reliability、Map19/Goal18与T11/T13边界。无委派、正式票/失败attempts维护、提交、推送或发布，T16未开工。

077 REPORT SHA `79025664b38e2ff00a3360e775c64f0e74f74ceb4b14f2c67e85388ec22bb5ec`；其独立review input `bac9f195888efe857183f3ff4e5e9ba05ba263a77ea9aba7ad81fd52a2611bc5`。本作者修改生产前 [01-current-input-before.json](logs/01-current-input-before.json) 固定299代码文件，逐项匹配077 frozen working_snapshot，drift=[]；87来源的完整核验来自Root/077交接，不冒称本作者重新跑077全套审查。

生产唯一变更 `sqlite/collaboration/store.go`，前SHA `c747f0b3cd7288cb756294f32ccae6e9e1b4d323ac57b8cc4508703c94748aa9`，后SHA `796d3790ef825f42a670e07120534cbe1f2e53c88f086fd76e10eb038b674ac0`；[精确差异](logs/07-production.diff)。另新增四个groups永久回归，无旧测试断言改动。初始冻结 [09](logs/09-final-source-before-checks.json) 含5自有文件SHA/352支持输入，除了该生产文件，旧299代码及原348支持集其余347字节不变。最终测试清理补充及最终摘要在下文，09原输入保留。

## 产物与验证

### 最小产品变化

`readTaskInTx` 的默认行为保持完整读取/授权/消费，GetTask及已有metadata-only调用不变。新增私有 `readTaskWithConsumptionInTx` 仅允许列表候选不执行消费步骤：真实Task/Root/Principal/Profile、origin当前read、bound接收方read/send/deliver、结果/usage/derived解码全部仍走原路径。没有清空、缩减或缓存有效资格。

ListTasks在同一短事务先读取授权候选并确定页，再只对**实际进入返回页且有正文**的条目重走原完整读取/ConsumePrivateInTx。调用者的当前claim、完整Group/source/scope/grants/derived与Run.revision提升保持原规则；旧ToolExecution可严格subset于实际持久proof，但实际末门仍核全部当前依赖。未返回候选不贡献成员、task_result派生或revision。

返回Delegation/Page DTO、结果正文和序列化字段不变；仍原524288-byte页预算、1024-byte游标余量、limit1..100及同Root/Principal opaque cursor。不截断正文、不加wire字段、不放宽权限/预算。资格更新不影响返回DTO内容；同事务重新读取不存在另一次快照。候选读取、选中项的第二次授权或消费发生任何原Fault/SQL错误都会返回并回滚整个事务，不跳过错误或部分提交。首项编码过大仍TASK_PAGE_TOO_LARGE。

### 原红与永久回归

[01-reviewer-probe-source.json](logs/01-reviewer-probe-source.json) 固定077原探针逐字节来源；首次复制到自有groups测试路径，旧生产未改，用 `GOTOOLCHAIN=go1.26.10 CGO_ENABLED=0 go -C native/huhubot test -mod=readonly ./tests/contract/groups -run '^TestReviewerListPageDoesNotConsumeOmittedResult$' -count=1 -v -timeout=45s` 真实复现。[02](logs/02-original-review-red.log) exit1/Wait，包0.260s；不移除对照通过，页返回三份131072-byte结果却记录四位贡献者；只移除未返回成员后actual Dispatch0、原want1失败，slots/pins仍0。原探针备份在[02源码](logs/02-original-review-probe.go.txt)，旧077材料只读；临时复制测试随后被独立永久例替代，没有把它修后“找不到phantom就不remove”的行为作为成功证明。

永久 `TestTaskListBytePageConsumesOnlyReturnedBodiesAndNextPageCreatesRealDependency` 从**admitted delegation IDs减actual returned IDs**得到未返回项，修后也真的移除该成员。四个真实公共群/同Executor/绑定Tools控制：

| 控制 | 持久资格与真实效果 |
|---|---|
| 仅第一页、移除未返回成员 | 本页三份正文，proof只有B+三位实际返回贡献；遗漏者没有task_result派生、没有额外revision。实际remove遗漏者后B在Dispatch前仍running，回调1。 |
| 移除第一页已返回成员 | 真正已读的成员仍是依赖；actual Dispatch0，不削弱撤销门。 |
| 请求真实nextCursor、再移除原遗漏成员 | 两页无重复、全部5个Delegation元数据/4份正文无遗漏；第二页才加第四位贡献；实际remove后Dispatch0。 |
| limit=3条数控制 | 本页2或3份正文（取决于B自身无正文元数据排序），只记录实际返回者；移除admitted-returned得到的真实遗漏者，Dispatch1。 |

每组均保用户Facade GetTask等待结果不消费模型proof，原绑定Tools不换新对象，合法131072-byte结果、原页预算、全部生产者终态slot/pin0。Root只要求修实际读取前的错误取消；Engine返回后的原implicit父结果聚合仍必须当前授权全部将交付的私有子结果，未放宽该后续边界。

[03](logs/03-permanent-page-red.log) 在旧生产真实exit1/Wait，包0.352s：前三控制均指出phantom/revision/派生错误，且首组实际执行remove并观察Dispatch0。修后[05b](logs/05b-permanent-page-green.log) 三控制exit0；补条数控制的[08](logs/08-four-page-controls-green.log) 四组exit0/Wait，包0.473s。05首次修复编译失败是本作者文字替换误将消费块插到同文件Directory分页，见[05](logs/05-permanent-page-green.log)；只移至ListTasks后通过，最终07差异没有Directory改动。没有将该编译错误称为产品反例。

[06](logs/06-page-fault-union-controls.log) exit0/Wait，包0.835s：

- `TestTaskPageOversizeAndLaterAuthorizationOrDecodeFailureLeaveNoConsumption`：首项合法raw131072-byte但控制字符JSON超页、后项坏derived JSON、实际公开remove使后项当前Group资格拒绝，分别原样返回TASK_PAGE_TOO_LARGE / LINEAGE_STATE_INVALID / GROUP_MEMBER_REMOVED；调用前后完整Group/derived/source/scope/grants/revision逐字节相同。仅恢复测试故障后终结并释放slot/pin。
- `TestPrivateTaskPageConsumptionSQLFailureRollsBackWholeRead`：由077独立rollback探针整理；真实SQLite第二次union UPDATE触发ABORT，第一条已执行union也完整回滚，原SQL错误未吞。无额外账本或mock Repo。
- `TestPrivateTaskPagesKeepTwoContributorsInOriginalBindingAndTemporaryDescendant`：由077独立union探针整理，tasks.get/list各自保留none/removeC/removeD六控制。原旧ToolExecution连续读取C+D后再派生temporary，B与实际后代均完整B/C/D tuple，revision提升；合法callback1，移除任一真实贡献callback0，公开正文0，终态slot/pin0。

06命令在相同环境为 `go -C native/huhubot test -mod=readonly ./tests/contract/groups -run 'TestTaskPageOversize|TestPrivateTaskPageConsumptionSQLFailure|TestPrivateTaskPagesKeepTwoContributors' -count=1 -v -timeout=90s`；08 selector为该完整分页test名，timeout45s。所有完整原始输出保留，不择绿重跑。

### 冻结影响检查

352输入初始tree `1f425c1252f3a58632eb0eb3768e39887272491d929523058d4c58788200e67f`，自有5文件tree `eb47abb3de3957f3f6164e2fffad442bdec062cb8dfd52c32f3f3fe9fc21ca2f`，见09。唯一串行执行器[10](logs/10-run-affected-checks.py)每条前后回读全部352路径；环境Go1.26.10 Linux，模块cwd=`native/huhubot`。实际[14-check-results.json](logs/14-check-results.json)三条全部exit0/Wait、before/each/after drift=[]：

| 固定GOTOOLCHAIN=go1.26.10，模块cwd执行 | 实际结果 |
|---|---|
| `CGO_ENABLED=0 go test -mod=readonly -p 1 ./tests/contract/groups ./tests/contract/delegation ./tests/contract/access -count=1 -v -timeout=5m` | [11](logs/11-affected-normal.log)，exit0，wall13.491s |
| `CGO_ENABLED=1 go test -mod=readonly -race -p 1 ./tests/contract/groups ./tests/contract/delegation ./tests/contract/access -count=1 -v -timeout=8m` | [12](logs/12-affected-race.log)，exit0，wall145.961s，无race detector报告 |
| `CGO_ENABLED=0 go vet -mod=readonly ./...` | [13](logs/13-vet.log)，exit0，wall0.359s |

Root在矩阵期间只读指出新测试的失败清理遗漏：Engine等待next请求，但cleanup只释放allowRead/release。当前矩阵全部Wait后只给测试next缓冲channel补非阻塞false释放；[15精确差异](logs/15-test-cleanup.diff)不改生产/断言，仅保证较早Fatal也能在Core.Close前释放实际producer。初次匹配预备脚本误按多行cleanup，断言在改源前失败，随后shell仍额外跑了一次旧输入normal，[15-old](logs/15-preparation-old-input-normal.log)保留且不计作新cleanup验证；没有修改产品或重新择绿跑矩阵。

最终[16-final-source-r2.json](logs/16-final-source-r2.json)逐项固定5自有/352支持文件：自有tree `f1ee260b63ddb27c7853f76cc07a1f7e34aea71d8c9a1aed3f5bf482d94f23fa`、完整支持tree `674dc115fcc0ba1a3debed82e73768a39d7a74a90b53c33af8ce8f14bb95c665`。相对09仅该新测试cleanup变动，生产SHA、所有旧断言与另外351输入完全不变。

相同GOTOOLCHAIN及模块cwd，用 `go test -mod=readonly ./tests/contract/groups -run '^TestTaskListBytePageConsumesOnlyReturnedBodiesAndNextPageCreatesRealDependency$' -count=1 -v -timeout=60s`，先CGO0普通、再CGO1加`-race`：[17](logs/17-cleanup-normal.log)/[18](logs/18-cleanup-race.log)分别exit0/Wait、wall1.078s/8.238s，四控制均实际remove并保持全部原断言；[19](logs/19-cleanup-check-results.json)每条后352输入drift=[]。因此14其余checks按纯测试清理影响复用，不宣称14当时已包含尚未写入的cleanup。最终回读、资源和return回执见[20](logs/20-final-source-readback.json)与[21](logs/21-return-validation.json)。

## 问题与下一步

本票不宣称当前联合候选或全Goal通过。Root随后独立复验、固定下一审查输入；077的request-changes和原attempts保留，原074/077报告不改。共享API/schema/TS、013/旧SQL、依赖、原250ms/800/并发/CP阈值、原测试字节未变；影响外的073全矩阵/075 TS及Root E2E/build/lint按其原执行者、固定摘要和实际闭包复用，没有重跑无关旧全矩阵。

测试使用临时独立Profile、合成资料与controlled Engine/实际Tools/Attempt callback/SQLite；没有真实provider模型、用户Obsidian/Vault或目标OS/keyring操作。未新增依赖或复制外部项目代码；两个回归有清楚077仓内探针来源。所有Go/Node/Runner已实际Wait，无自有后台probe；最终report/return校验完成后原生MESSAGE+FINAL停写交回。源码在09固定后保持停止，唯一后续变化是Root精确允许的测试失败cleanup；最终16输入保持不变。
