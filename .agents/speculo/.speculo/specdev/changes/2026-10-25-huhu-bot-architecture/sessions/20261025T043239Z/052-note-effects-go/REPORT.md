# 052 T07 与原共享 owner 候选交回

Session: 20261025T043239Z
Task: 052-note-effects-go
Status: completed

## 聚焦交接

T07 Go 默认 Host 写桥、只读效果核查、单请求取消、迁移前完整 CP 恢复集以及 T11/T12 所需共享 API/配置/执行器装配已完成候选实现。新协作仍使用同一个 Executor/Claim/Finalize/Resume，已通过真实公共 Facade、SQLite、生产 TS Host 与 stdio HAP 消费者验证。052 自有 59 路径已冻结，最终联合 291 文件 r5 摘要已固定，053/054 同步停写，所有测试与受控子进程均已 Wait。当前 Go 普通/race/vet/五目标编译和复用边界列于下方；Root 的独立 E2E、当前插件 build/lint、059 双轴审查仍待执行。这里 completed 仅表示候选交回，不代表 Lead 已接纳产品代码门。

## 产物与验证

### 身份、规则与源码冻结

- 作者：`native:/root/foundation_go`。派遣请求 `model=gpt-6.1-sol / reasoning_effort=xhigh`，仅记录派遣偏好，工具未提供实际底层 model 证明。
- 未提交、推送、发布或改正式状态；HEAD 保持 `33c21e098ef3188cbab5a09f3e0a01fadb787715`，分支 `NAMEWTA/bot`。沿 Root 工作副本实施，没有另建源码工作树。
- 复用 dev 与 SpecDev I 已读规则，起始 Map14/Goal13；058 后依 Root Map16/Goal15 重绑定架构来源。起始 architecture SHA `6f64334012acc1cb213bfa72fdc7bf214e96e07d0c2c9738b26c9ffebc420ce0`，当前 `0c63bf9d63eb8626351b29cbdb980cfed0f9cede5e712c5de6d61eac35ec7b42`，新增 HostReceiptStore/ReceiptAuthority 两行 owner，无 Go 边界变化。规则/旧输入（历史日志已清理：`logs/23-immutable-and-rules.json`）、最终只读检查（历史日志已清理：`logs/51-own-readonly-checks.json`）。
- 自有路径以 59 文件 manifest（历史日志已清理：`logs/42-own-source-r4.json`） 为准，tree SHA `df4e76f45619a9869855f089e39d86541440e371c2b52e91a0abaa0d4fc331ca`。它包含本票新增/修改的 API/schema/Go 共享与 T07 源/测试，不等于全仓 Git 差异。r5 未改这些路径。
- 最终 联合 r5 manifest（历史日志已清理：`logs/50-joint-source-r5-final.json`）：291 文件，tree SHA `d167e50122ba1edbfdf84f9bc45144f4fa4dcf5deb1b7f656f83151257982ac9`。r4 十项检查输入为 291 文件 r4（历史日志已清理：`logs/42-joint-source-r4.json`） `5aeef292e5966d9127ad51efe7aff67448970eb80c22926e26000bd39d3ef3a0`；r5 相对它仅 053 的 `answer.go` 与 `reply_sources_test.go` 两路径变化，由其新增 delegation 全包普通/race覆盖。
- r3 全 Go/race历史输入：own（历史日志已清理：`logs/31-source-freeze-r3.json`） 与 joint289（历史日志已清理：`logs/32-joint-source-r3.json`），后者 SHA `1ea371fb9ec6bca1dbbfb5d382e87ba28c315cd0072d3b5fc3b0d054f863ce52`。r1/r2 与失败输入仍保留在 22、26、27，不覆盖为最终结果。
- 48 边界核对（历史日志已清理：`logs/48-immutable-boundaries-r4.json`） 证明 T04 七个源/测试与接纳050逐 SHA 相同，旧 SQL001/002/003/005/006 与 go.mod/go.sum 也完全相同；没有写 raw credentials。053 独占 credentials.go guard、协作/预算与011/012，054独占生产TS Host/protocol/source/hash切片，未把它们归为052作者。

### 公共合同与入口

当前 71 个显式方法、142 个方法参数/结果 validator、255 个共享方法样本。唯一 `api.ts` SHA `40452f41168ce8d6afc1e8a4b1acf4b786dc05fcb6ec35daa76bd26034aaa80c`；schema 与 Go 内嵌同字节 SHA `4f373cb78cc7f8345192e5c0d54a77315ccfd064cf73b8fb9b94dc6f305cf8dc`。六个生成输出的实际独立临时目录重生成及逐字节一致证据在 34（历史日志已清理：`logs/34-isolated-generation-r3.json`），最终七个 API/生成物摘要在 49（历史日志已清理：`logs/49-final-freeze-and-cleanup-r4.json`）；r4/r5未改公共合同。Go/TS共享消费 task-config v1 八组、effect fingerprint 四组黄金向量，保持 Unicode/控制/HTML/顺序/省略默认语义，未使用 JSON 排序替代冻结算法。

永久真实 TS-Go 入口：`go test -run '^TestActualTSGoProductionNoteHost$' ./tests/contract/effect-reconcile`。用户后验可用 `go test -c -o <绝对路径> ./tests/contract/effect-reconcile` 构建受控测试 child，参数 `-test.run=^TestNoteEffectChild$`，环境 `HUHU_NOTE_EFFECT_CHILD=1`、`HUHU_NOTE_EFFECT_PROFILE_ROOT`、`HUHU_NOTE_EFFECT_PROFILE`；此 child stdout 仅 HAP、退出前不会输出 Go 测试 PASS。生产 `registerObsidianNoteHost` 与默认 writebridge 均真实装配，只有模型 Engine 和 Obsidian App/Vault 外边界受控；没有增加生产 probe RPC。真实运行用户 probe 仍由用户后验。

### 已实现的原 owner 共同接缝

T07使用生产默认Host writebridge，经同一个Broker、SQLite效果/审批事务与反向stdio HAP调用生产TS registerObsidianNoteHost。可信prepare绑定Profile/epoch/device/workspace/origin/lease/opaque对象、真实全文基线、目标版本、工具版本与确切参数；审批继续时重新核当前read/send、租约、取消门、指纹及Host目标。仅可信匹配completed证据可committed，只有后置条件命中为reconciled，其余unknown。reconcile只读，不重发写、不复活终态Run或pin。

单请求取消使用无id通知 $/cancelRequest {requestId:s:...}，双方保持有界await/settled关联与TTL。合法取消/响应交错不会关闭sibling；真实Vault Promise未结算仍占Host quota，晚到只写本机回执、不发第二响应；未知/重复/非法late frame仍fail-closed。独立UNSAVED_EDITOR_CHANGES kind+reason没有折叠成CONFLICT。

共享Collaboration/Messages/ConfigurationHash/Budget API与typed temporary Grant模板、TaskConfigSnapshot/独立temporary主体、Root/Parent/WorkThread/BudgetRoot/Derived、实际模型attempt Port已落在唯一API和schema。无fake Agent行、无第二团队引擎。existing子执行使用隔离thread；temporary可用不同协议/endpoint/credential，配置pin和credentials删除guard确实关联。053拥有全部协作/预算业务与011/012正文，我仅维护同Tx配置/执行helper、唯一注册实际Version6/7、共同装配。

根/子受理、首event、receipt、配置pin与占用在同库事务；accepted扫描绕过暂不可领child，不产生队首阻塞。16个内部worker只表示本地有界工作容量，产品限制仍3/32/4/8/8且由持久policy控制。根受理同Tx持久实际limits，公开Run返回该快照；v5升级首次启用兼容默认3/32/4/8/8，不宣称v5当时已经保存或观测。预算根与因果根分离，终态reply新Run可复用旧预算账户但不复活旧Run/旧claim/旧pin。

父finished仍有child时持久waiting_children，全部完成后应用汇合零额外模型；显式children/question CP走原Blob/registry→Broker→effects Tx→usage等待关系→同Executor.Engine.Resume。当前intent、实际选入history/message/child结果携稳定派生身份，后续外发与汇合用真实effective来源和当前授权；用户历史read与模型send不混用。T13/T14/T16尚未实现，不提前声称群调度、记忆作业或树恢复已完成。

逐实际HTTP attempt Port绑定可信run/root/claim/config/purpose/account/recipient/provenance；reserve→dispatch→settle/abort，未知用量不补零、取消不退款已发请求。Root已确认这是可信Go Engine Port，调用方必须在真实producer结束后才传ProducerEnded结算；不是模型wire自报字段。现有受控真实HTTP持有/取消/晚结算验证保留，未来T08–T10真实HTTP adapter还须遵守此义务。本轮只验证共同Port/受控Engine消费者，不声称真实三协议adapter或真实模型通过。

### 迁移完整恢复集

启动仍持实际Profile锁、尚未启动Executor/GC时，先VACUUM INTO一致旧DB，枚举旧execution_checkpoints并验证DB关联，按现有Artifact校验复制完整HUHUCP1编码文件至独立.migration-v*目录；DB与Blob的大小、整文件hash、Artifact、schema/app版本、Profile/epoch清单最后发布并同步，之后才迁移。缺失、损坏、manifest发布失败或旧CP缺completer均停迁移，保留旧DB和故障证据。副本不在live checkpoints内，GC不删除恢复集；没有改旧inode锁下rename换DB。未来T17统一清除完成/半成品恢复集，完整T19恢复管理/API/UI仍后续。

本票永久恢复集测试基于受控DB降低版本标记再触发迁移，证明恢复集发布早于迁移与GC；不冒充Root真实schema5升级E2E。Root保有公开旧版waiting/terminal真实fixture，候选归还后独立跑。

### 已完成证据及保留失败

- 01实际缺manifest红→02/09完整CP、GC隔离、missing/corrupt/manifest/no-completer绿。
- 05实际waiting_approval挂起源于T12错误混用effect与task门；053拆分task_admission_closed后06/07绿。
- 14–16跨进程实际Host写后丢回执红：错误Invoke保存零值HostReceipt，公开effects.get被严格结果验证拒绝。修后17/20生产TS factory↔stdio↔Go完整链绿；零值旧证据只当缺失，绝不补伪committed。25六种证据边界含legacy zero绿。
- 永久跨进程链覆盖批准/拒绝/脏编辑器/源变化/create冲突/exact create、写后丢回执→断连Wait→新进程新lease只读核查，以及真实mutation已发生但Promise未settle时单树取消、同连接sibling继续、晚到本机回执与终态只读核查。所有Node/Go child均Wait，控制对象边界只替代Obsidian App/Vault及模型Engine，不替代HostWrite/桥/数据库/路由。
- 18旧2worker压力夹具失败后按实际16worker填满并证明第17条accepted和释放后扫描（19绿）；这是旧夹具适配，不放宽child/HTTP限制。
- 29全Go在assistant删除测试真实5分钟超时，定位同Tx helper内错误执行wal_checkpoint阻塞单连接。把checkpoint移回公开Mutate事务提交后；30原case0.029s绿，33全Go普通r3退出0。
- 053的39六类取消缺TaskOutcome真红、40仅回调后CP/嵌套partial仍红，42完整8场景绿。052 cancelOne同Tx只从实际canceled Run调用原Tree.CanceledInTx写无正文结果，未知effect/用量/真实producer槽不清；partial真实持久逐级传播，模型plain finished不能抹掉。
- 35九包race r3退出1，无data race报告，三项实际失败：270事件/3s原case、source800/250ms原门、delegation终态可见时slot未清。先前口述“其他8包全绿”为漏读，已明确更正，结构化36记录七包绿/两包失败。
- 36相同r3只隔离270原case，仍3s/270/原断言，退出0（case2.87s）；仅证明此次隔离未复现，不能删除整组失败。
- 37复制并逐SHA核对完整289文件r3；38外部临时副本只省delivery批读的Run-only policy投影，800真实有来源message/400FacadeRun原250ms门通过203.733626ms，撤权仍拒绝。一次结果支持额外投影成本假设，不把全部耗时差当确定因果量。
- Root批准39生产2文件最小收敛：同一core列与同scanner，公开Run保留真实limits投影，adapter-only access批读不返回limits故使用空占位。没有改T04、门或断言。

04/10–13/24为编译、bundle路径或夹具契约错误，原日志保留，不冒充有效行为红灯。旧SQL001/002/003/005/006、go.mod/go.sum均与接纳050摘要相同，23记录。新SQL011/012唯一作者为053。


### 最终实际检查与复用边界

工具链为 Go1.26.10 / linux amd64，普通/交叉编译 `CGO_ENABLED=0`，race/vet 为 `CGO_ENABLED=1`；Node26.11.1、pnpm11.1.3。重检查由052独占、`-p=1` 串行，所有命令均实际 Wait；41 调度脚本（历史日志已清理：`logs/41-run-r4-checks.py`） 与 47 命令/env/exit/耗时清单（历史日志已清理：`logs/47-r4-checks.json`） 可直接回读。

| 输入与检查 | 实际结果 | 原始证据 |
| --- | --- | --- |
| r3 `go test -timeout=5m -p=1 -count=1 ./...` | 全 Go 普通 exit0 | [33](logs/33-all-go-r3.log) |
| r3 九包 `go test -race -timeout=8m -p=1 -count=1 -v ...` | exit1，七包通过；events 两项和 delegation slot 一项失败，无 data race 报告 | [35](logs/35-race-r3.log)、36 完整分类（历史日志已清理：`logs/36-race-failures-and-isolation.json`） |
| r4 access/events/delegation/collaboration-policy 普通 | exit0，23.785s | [43](logs/43-affected-normal-r4.log) |
| r4 同四包 race | exit0，215.283s；原270=2.77s/3s，来源100 gate28.115306ms，来源800 gate225.426984ms/250ms，无来源800 gate118.226101ms；原4/8 slots、held HTTP、Reply来源/等待均通过 | [44](logs/44-affected-race-r4.log) |
| r4 单/批 scanner ACL/损坏JSON/错Profile/缺失Run/无member/外人等价，普通与race | 两项exit0 | [45 普通](logs/45-delivery-reader-normal-r4.log)、[45 race](logs/45-delivery-reader-race-r4.log) |
| r4 `go vet ./...` | exit0 | [46](logs/46-vet-r4.log) |
| r4 `go build -trimpath ... ./cmd/huhubot` | linux amd64/arm64、darwin amd64/arm64、windows amd64 五目标均exit0 | 五份 `46-build-*-r4.log`、47（历史日志已清理：`logs/47-r4-checks.json`） |
| r5 053 最小 answer guard 与真实 Tools/question/CP 消费者 | 原49两向量真红；50 delegation完整ordinary exit0/3.607s，51完整race exit0/46.201s，全部Wait | [053红](../053-collaboration-policy/logs/49-agent-answer-source-red.log)、[普通](../053-collaboration-policy/logs/50-delegation-answer-final-ordinary.log)、[race](../053-collaboration-policy/logs/51-delegation-answer-final-race.log)、r5冻结（历史日志已清理：`../053-collaboration-policy/logs/52-own-final-freeze-r5.json`） |

r4范围外复用的是 r3 已通过的 chat/approval/effect-reconcile/foundation/assistant 完整 race；access/policy 则在 r4再跑，approval 的共享 scanner 边界也在 r4补跑。r3全Go普通结合r4受影响闭包和r5 delegation闭包使用，不声称在最终r5重跑了全module全部检查。原T07真实TS-Go链、完整恢复集与全部错误证据没有被删减或改期望。

最后相邻来源支路准确区分：053 的45 Reply红→46/47绿只闭合 Reply/followup；其后发现 `Send(kind=reply)` 直接answer的入口同样需要subset校验。r5仅在 `answer.go` 复用现有 `checkReplySources` 三行，真实Tool/question/CP的foreign SourceRefs在任何message/receipt/question/waitedge写前拒绝；合法空/完整actual provenance与幂等保持。无API、SQL、limits、T04或052源变化，故不重复events/平台检查。

49（历史日志已清理：`logs/49-final-freeze-and-cleanup-r4.json`） 记录每项r4检查前后291摘要无漂移、05347文件无漂移、外部成本副本和五目标临时编译资产实际删除；50（历史日志已清理：`logs/50-joint-source-r5-final.json`） 再次证明05259文件和053最终47文件无漂移。受控Node/Go/HTTP/真实os.Exit测试的清理均走实际Wait，当前没有运行中的作者测试/产品/probe。编译结果不冒充目标OS运行或最终发行资产，后续资产由Root/T27处理。

## 问题与下一步

当前没有已知未闭合的052自有代码问题。r3的270/3s超时未确定唯一因果；原输入单次隔离与最终r4整组都通过，保留原失败，不把它武断归因环境或断言49ms差全由policy投影造成。其余真实缺陷的产品红灯、最小修复和同路径消费者绿灯均保留。

Root 下一步在最终r5固定输入运行已准备的真实旧schema5升级、公开Facade/SQLite、TS→stdio→Go→Host选择性E2E、当前TS严格消费者与插件build/lint，再交059未参与实现者双轴审查。054的119 tests/tsc/lint属于其最终报告固定输入；后加Run.limits/schema的当前严格TS与整体构建由Root补验，不能把旧报告当当前全量结果。

真实模型、真实Obsidian/Vault、真实系统keyring与非Linux目标OS运行均未执行，由用户后验；未请求秘密，未将这些现场验收作为代码开工门。未来T08–T10每个实际HTTP消费者必须在物理producer结束后才Settle，含cancel/retry；现有受控held producer/unknown/晚结算pin测试不代替未来真实协议adapter。T13/T14/T16/T17/T19功能继续其后续票，当前接口与恢复集不冒称那些业务已实现。归还后保持所有源/测试冻结，等待Root实际反馈；未提交、推送或发布。
