# Chat 默认装配与固定依赖

Session: 20261025T043239Z
Task: 093-engine-foundation
Status: completed

## 聚焦交接

按本 [TASK](TASK.md)、Map22正式窗口和[私有接缝补充](../../../evidence/T-08-logs/chat-private-contract-map22.md)，仅维护原T01固定依赖、bootstrap与foundation测试。沿已读dev、许可/测试、SpecDev I执行/错误/可靠性规则；不再委派，不改正式状态。最小真实默认CLI、旧CP兼容和Core生命周期必要检查已通过；最终真实imports的锁分类也已闭合，共同SDK完整故障矩阵、许可与Root整体验收由总控组合。

默认装配从真实store metadata取ProfileID，私有provider只通过绑定Profile的Resolve闭包交给common.Engine；同Engine用于Executor和Inspector，同chat.Driver提供metadata Probe。实际生产兼容身份为`huhu-eino-0.9.22-chat-bridge-v1`，显式Options.Engine/Probe测试注入保留。仅必要默认侧创建并管理driver；没有新增public API、wire、SQL或SDK秘密字段。

Core同步关闭Assistant Probe与model runtime准入/cancel。单一drain沿现有Executor/Inspector/未结算producer门，额外等待Assistant.ProbeDone及model.Done，然后释放idle transport、provider、SQLite、Profile锁；三秒Close不是完成信号。Open中途失败也关闭新建runtime并实际等Done。T02 Service与T08内部driver/Engine分别由094/092维护，非本作者写集。

## 产物与验证

- [00读取与合同输入](logs/00-read-input-and-contract.json)核TASK/正式窗口摘要，记录初始自有生产/规则/087来源。重新读取Root固定SDK末端producer writer-close说明并接受直接Ext.Stream路线；SDK/HTTP/body EOF不单独作为join。没有复制三协议全锁或改module cache。
- [01精确依赖安装](logs/01-fixed-dependencies.log) / [结果](logs/01-fixed-dependencies-result.json)：四既定版本`go get` actual0/Wait14.210s。
- [02实际选中模块](logs/02-selected-modules.log)、[03图](logs/03-module-graph.log) / [结果](logs/03-dependency-window-result.json)：go list-m及mod graph均0/Wait，98选中模块，四pin一致；这是MVS而非最终分发闭包。
- [04真实imports tidy](logs/04-real-import-tidy.log) / [结果](logs/04-real-import-tidy-result.json)：actual0/Wait2.641s。Eino/Ext/fork由真实代码直接消费、ACL为Ext真实传递依赖。04时点锁为go.mod `69c9b24a9265a7d8295aedaa1eb0f8594fd08336b3002a9f334fd3c6ba499632`、go.sum `a5547b752487c8ab3e116b95f30d95f460ca58e3a7a0c6487a2a1272f89b3937`，其他既有直接版本保持。
- [05短编译输入](logs/05-before-command-build.json)仅固定共同8生产/锁文件，区别于最终联合测试输入。[06真实cmd依赖](logs/06-real-cmd-deps.log)、[07真实cmd构建](logs/07-real-cmd-build.log) / [实际结果](logs/07-command-build-result.json)均0/Wait（10.403/16.899s），GOTOOLCHAIN=go1.26.10、CGO_ENABLED=0，sourceDrift=[]；临时binary已清理，未运行功能测试。
- [08首轮编译时点host实际runtime模块](logs/08-actual-runtime-module-handoff.json)：Linux/amd64、CGO0的真实cmd图413 packages/38第三方模块；四SDK pins均实际import。已交Root/T27，明确其它四平台及最终notice/licence尚待owner处理。
- [09两例实际输入](logs/09-foundation-target-input.json)固定180来源（production Go/SQL、foundation测试、实际只读schema8输入及锁）tree `fb8a9b29e9d33a70c451c08bf60ed7e218ac31a800f4a16a6d3088743acd2512`。[10两例首跑](logs/10-foundation-target-first.log) / [结果](logs/10-foundation-target-first-result.json) actual0/Wait6.059s、sourceDrift=[]。父go test明确GOTOOLCHAIN=go1.26.10、CGO_ENABLED=1；nested CLI build继承固定toolchain而将CGO_ENABLED覆盖为0，不能把整轮统称CGO0。

新增foundation/default_engine_cli_test.go使用真正cmd/huhubot、原私有fd3/fd4通道注册session-memory合成key、公开HAP预算/配置/会话/Run和loopback元数据GET/SSE，核默认Engine/Resolver、Persona字面JSON、每次真实请求及持久known attempt、最终消息与实际process Wait。测试没有Options.Engine或Provider注入；10实际通过1.29s，正常CLI自然退出且真实Wait，服务端恰1元数据GET/1模型POST，完整usage10+2持久known/settled/producer_ended，Persona字面JSON恰一次、原Intent一次、n1和output4096、公开持久回复均实际核对。Windows CRT现场另行后验。

新增default_engine_compatibility_test.go只复制现有recovery/testdata/schema8/inflight真实历史Profile和完整HUHUCP1；10实际0.05s通过两个控制：default生产兼容身份对旧fake payload明确blocked/CHECKPOINT_INCOMPATIBLE，显式旧受控Inspector仍ready，原fixture SHA不变、无新Run/attempt且原unknown7保留。没有声称新生产Engine支持旧fake SDK payload。

新增default_probe_lifecycle_test.go通过Core组合控制：受控Probe忽略cancel，private Resolve已进入后原Close3s确实超时，captured Background调用被同步拒、provider/catalog/Profile保持；实际返回和secret清零后Done才释放，随后重开。失败清理也等待该Probe goroutine，不让断言失败跳过实际join。它不替代092真实SDK producer-owned ACK/HTTP body.Close故障验证。

[12单变量patch](logs/12-probe-join-counterfactual.patch)及[14实际输入](logs/14-lifecycle-input.json)仅在外部Go overlay删除Core.drain的一处ProbeDone等待，保留StopProbes/其它门/全部断言。[15反事实实际红](logs/15-probe-join-counterfactual-red.log) / [结果](logs/15-probe-join-counterfactual-red-result.json) actual exit1/Wait1.413s，精确因Close过早返回nil而失败，清理实际释放/join Probe；这不是历史产品红灯，也没有修改生产文件。

[16当前实现与原生命周期回归](logs/16-current-lifecycle-green.log) / [实际结果](logs/16-current-lifecycle-green-result.json) actual0/Wait8.549s，178来源tree `a0b279ac9bcc3e234d68a7aab5ef3bdfcf8709c5693b20d0d96e694b131e4e1c`无漂移：新Probe3.05s、原held Engine3.04s、Stop事务失败0.18s、真实CLI父pipe保持/EOF重开1.21s。父go test为固定go1.26.10/CGO1，原runner子构建CGO0继承相同工具链；三个实际CLI进程（10一次、16两次）均正常退出并真实Wait，测试受控Probe/Engine均实际结束。未因新SDK全量重复未变旧底座。

[13自有生产精确差异](logs/13-owned-production-diff.patch)对初始三个文件SHA反推，初始副本与00一致。写集只有go.mod/go.sum、bootstrap/core.go和三个新增foundation测试；没有修改T03/T06/T02/T12生产或公共API。

只读探索中猜错087报告/执行器/凭证独立文件名的ENOENT已改由rg发现实际路径，初始摘要记录该过程；没有把失败读取或搜索摘要作为结论。

## 问题与下一步

本作者已完成默认CLI、旧完整fake CP兼容和Core关闭组合的实际必要检查，所有自有产品命令均Wait；当前仅收口报告/结构回执。092/094的真实HTTP/工具/CP细节各归实际作者，Root另组合最终共同稳定输入、完整许可闭包及独立E2E/审查。

04 tidy基于当时真实初始imports；随后092 common/tools.go新增对既有`github.com/eino-contrib/jsonschema v1.0.3`的直接import。本作者向Root提出该实际差异，等092全部命令Wait/暂停生产后，按额外唯一极短窗口执行[17最终tidy](logs/17-final-real-import-tidy.log) / [结果](logs/17-final-real-import-tidy-result.json) actual0/Wait0.136s：只有该模块indirect→direct，全模块版本集合零变化、go.sum逐字节不变、四SDK精确pins保持，没有额外重编译或测试。最终go.mod `75386c4e53aa851394ed6fa7ae167c0822c530690e4e240b83ace65c97154814`，go.sum `a5547b752487c8ab3e116b95f30d95f460ca58e3a7a0c6487a2a1272f89b3937`。已把新锁及08/17原始清单交Root和095/T27，不留已知tidy差异到下一轮。

最终[18自有六文件](logs/18-own-final-source.json) tree `e86b42e7603628a8af6e348dc6512171dbe95075ece411107d31eab69213147a`，精确[最终生产diff](logs/18-final-production-diff.patch)只涉及3个生产文件；三个新foundation测试之外没有改其它原测试。当前T08作者仍推进剩余故障矩阵，因此没有伪造全产品最终joint清单；09/14是各自当时实际命令的冻结输入，每轮drift=[]。17纯锁分类变化不重新声称10/16在新hash重跑，其版本/模块内容与执行语义未变，按Root影响复用。未运行本任务新例的race、全模块test/vet、其它四平台闭包、最终notices或Root E2E；这些不能被构建/局部normal绿冒充，后续按Root固定共同输入实际安排。08仅当前host实际编译清单，T27最终许可必须处理，包括EinoExt子模块缺本地license文本时的固定根Apache来源；本作者未改notices/NOTICE或他人源码。未运行真实Provider/Obsidian/keyring或目标OS；不请求用户凭证、不提交/推送/发布。默认最小CLI产品链已绿，092完整工具/CP/HTTP故障矩阵仍开发中；Root另发现旧T03无模型负控需随默认装配区分MODEL_DRAFT_INCOMPLETE与未支持协议，已交092并准备原owner测试窄窗口，本作者未修改或声称验证该相邻用例。当前不宣称T08/T01/Goal验收完成。
