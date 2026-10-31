# T16 下一窗口的 TS 恢复与关闭接缝

只读准备，非T16开工/代码审查/验收。行号对应本次 [observations.json](observations.json) 的完整SHA；073/074仍写Go，原生行号/SHA只是时点观察。075九文件逐SHA对照差异=[]；不重跑075测试。P=`src/modules/huhubot/`，G=`native/huhubot/internal/`，N=`native/huhubot/`。

## 当前入口与真实缺口

| 入口、当前输入→出口 | 现有行为 | 下一窗口最小请求、owner |
| --- | --- | --- |
| `P/api.ts:703` `runs.resume`，`CommandMeta & {id,recoveryGeneration}`→RunReceipt；`api.ts:229` Run | expectedRevision仍继承optional；Run有revision/group与interrupted/recovering/blocked/canceling状态，**没有恢复资格/资格代查询字段**。`contracts/hap/v0.1/methods.json:291` implemented=false。 | foundation_go/T01唯一owner先冻结：资格从哪里查询、CAS必填、资格代失效、稳定错误、同Run回执与幂等；不能让UI从status/reason猜可恢复，不能发CP或自报核查结论。DTO字段目前没有这些能力，不假设已存在。 |
| `P/core/protocol/connection.ts:120,135,195` connect/request/client | hello后建立真实BotClient；runs.resume已在:213代理，参数/结果走唯一schema。通用request没有hello.capabilities本地门；未装配方法仍可发到服务端并收到BotRpcError。 | foundation_client原T01消费冻结合同。未来恢复consumer应显式检查实际hello capability（复用GroupClient.requireBot:70模式），不能因代理存在就显示可用。仅改DTO属性通常不需要新代理或更改142缓存数。 |
| `P/core/protocol/codec.ts:84`、`method-validation.ts:14,48,61`；`connection.ts:294` | RECOVERY_BLOCKED已是合法kind；严格ErrorData只有CURSOR_EXPIRED可携typed run-cursor details，其它恢复错误目前只能kind/reason等安全字段。RPC错误不会自动close；坏形状关闭。 | 需要新typed资格/详情时只能由T01更新canonical schema/API，TS复用原validator；不把恢复数据塞进cursor详情、不建第二错误框架。 |
| `P/services/groups/group-client.ts:89,106,137,166,218` | 当前只有发送/显式原命令retry、Session CAS、watchRun、History和换client；**没有resume消费者**。发送retry保留原command/expectedRevision，不等于手动继续旧Run。 | foundation_client/T13窄维护仅负责刷新Session、把服务器当前Run传给watchRun及保持draft/History。若需要单聊/群共用的恢复命令controller，请Root另登记一个最小 `services/recovery/**` 路径；本076不创建、不取得写权，不把恢复伪装runs.start/retrySend。 |

owner顺序：foundation_go/T01冻结公共合同和同Executor/关闭接缝；credential_provider按066原T05/T11/T12、当前T13职责提供当前Grant/群资格/Attempt派发谓词；foundation_client只消费真实BotClient与投影；Root未来指定T20 runtime owner组合已有原语。这里不转移原owner，也不把075切片接纳当T13 Go已冻结。

当前71方法/142方法validator的计数来自唯一合同。若T01最终新增查询方法，才由owner串行生成并由原TS validator owner同步固定计数及共享样本；不能提前猜新总数。当前没有公共 `runs.snapshot` 或通用“按commandId查回执”方法：run-cursor Snapshot经CURSOR_EXPIRED错误抵达；runs.get只给当前Run，不能单靠状态证明某次uncertain命令已受理。

## 同Run恢复的命令与投影

- **命令身份**：未来consumer先读服务端权威资格与当前Run/epoch，再由明确用户动作提交一次resume；同一次动作保留原commandId/idempotencyKey/id/recoveryGeneration/expectedRevision。双击合并或重放同payload；uncertain只做状态核查、或明确按服务端幂等合同重试原命令，不自动生成新ID，不改CAS绕过冲突。究竟是否需要额外命令回执查询由T01定，当前没有此查询。Run.revision、recoveryGeneration、审批generation、cancel/claim代和事件seq各自有用途，不可互换。
- **现有forward等待边界**：`connection.ts:160–180` Abort/timeout只结束本地等待，最多32个abandoned关联保留30秒，:284–290只接收一次合法迟到响应；不是runs.cancel，也没有取消已接受业务的证明。新transport不自动重放。恢复consumer必须保留uncertain状态而非“取消成功”。
- **当前group资格**：`EventClient.attach:54`接服务器Run.group/revision；`bindGroup:119`较旧revision忽略，相同revision不同proof拒绝，仅更高revision完整tuple严格superset可增长。`anchorRun:139`核当前Session全tuple；`sessionChanged:149`在fingerprint变化时先abort并清该群所有未决缓存，避免本地未知贡献者遗漏；已知失效sticky denied。不能在新revision无依据删tuple、把旧incarnation改为重加的新incarnation、把orchestration根扩全员。
- **当前重新读取**：`EventClient.refresh:207`在需要anchor时先runs.get，再以原Run ID从seq0续读；`setClient:96`重连清body且group需重锚。Snapshot :245–253先核其中当前Run proof/revision再还原；过期cursor和新Run revision不是同一代数。普通tail页不携Run.revision/proof，`projection.run`只在Snapshot中赋值（`reducer.ts:99`），所以不能把EventView.status当作新CAS或资格记录。
- **恢复成功接线缺口**：目前没有“仅指定Run恢复后主动重锚”的本地公共方法；existing accessChanged按Session/all清理，attach仅在proof增长时清理，普通同proof新revision不会自行清空旧流。由foundation_client原T04窄维护提供最小指定Run失效/重新读取接缝，接T01权威结果；先abort旧页，当前授权重读后恢复，不为此新建第二投影库或执行器。
- **来源与History**：`GroupClient.permissionsChanged:217`/History权限失败:205清公开缓存及Run流；成员变化:137保留已合法公共Transcript，但Run流全清并当前重读。`transcript.ts:24`按独立公共seq合并。恢复不得恢复旧private正文、被撤附件labels或来源缓存；新资格不是永久Grant。未来runtime/UI owner必须把真实权限/Session更新接到这些hook，不能UI自行核资格。
- **事件状态合同**：`reducer.ts:7–9,60–78`只把裸Run状态event.type视作状态，五种text事件追加正文；approval/effect/recovery前缀事实不自动升格Run状态。T16仍应发既有裸recovering/blocked等状态；已完成子结果和late effect fact走同一事实/公共publisher，恢复不复制成第二条正文。

## close、EOF、排空各自的责任

| 当前路径/函数 | 能证明什么、不能证明什么 | 维护归属 |
| --- | --- | --- |
| `P/services/events/event-client.ts:83,164,190` subscription.dispose/client.dispose/invalidate；`GroupClient:230` drained | 页面解绑停止本地poll/监听并清缓存，不发runs.cancel/不关闭进程。GroupClient.drained只等待它跟踪的请求Promise，**不是Engine/Host producer排空**。 | T04/T13原owner保持。页面关闭只退租约；完整模块owner不能借页面dispose停止Runner。 |
| `P/core/protocol/connection.ts:484,515` finish/close | 拒pending、abort反向Host、清关联/lease、一次onClose，再transport.close；这是连接结束，不是业务取消。反向Host逻辑cancel唯一reply、真实Promise占quota至settle（:465–471）。 | T01原TS owner窄维护。不能将“本地closed”升格成子树canceled/写入无效果。 |
| `P/platform/desktop/transport/managed.ts:96,270,301` exited/fail/close | close是同步void；停止队列、关私有credential client、stdin.end，并默认4秒后TERM、再1秒SIGKILL后备。exited等子进程close事件（含句柄）；计时器是终止后备，不是外部Host/Vault/费用确定结果。必须close后实际await exited，不能只等shutdown回包。 | T01 transport原owner复用既有单process manager；新超时结果/关闭状态若确需改变先冻结合同，不另造管理器。 |
| `managed.ts:307,333` launchBotClient/launchManagedBotSession | 成功的前者只返BotClient；后者已返{client,credentials,exited,close}，失败均close并await exited。模块级需真实退出等待时应持已有session/transport句柄，不从BotClient.state猜退出。 | T20未来runtime owner选择并组合现有入口，T01按精确请求维护；不在services/core引入Node。 |
| `N/cmd/huhubot/main.go:78–99`、`stdio/server.go:73,303,361,485` | Server.Close只关闭连接/Host与pending；当前CLI只有一个stdio Server，任何该Run返回都defer Core.Close，因此实际关闭此受管stdin也会结束Runner。`--managed`身份不是独立多连接守护进程；普通CLI EOF同样走当前唯一进程退出。private credential ServeChannel返回在main:90–93 cancel整个Runner。 | T01 Go owner明确受管父EOF与可替换连接EOF的应用语义；TS不会假设临时任意EOF都取消任务。 |
| `G/application/api/service.go:47`、`inbound/hap/router.go:122`、`stdio/server.go:485` | shutdown受managed owner限制，只置stopping并回{accepted:true}，HAP拒新请求，写出回复后Server关闭。ack表示受理关闭，非producer排空证明。 | T01与T16联合统一关闭服务；沿066所列同服务端屏障/排空/事实合同，不在TS补假成功。 |
| `G/bootstrap/core.go:182`、`execution/executor/executor.go:300` | 当前executor取消并最多等3秒，超时RECOVERY_BLOCKED/EXECUTOR_STOP_TIMEOUT；Core仍继续GC/provider/DB/Profile关闭。此处是066已有T16集成需求，不是本次审查结论，当前Go未最终冻结。 | T16/原Go owner冻结producer真实结束、资源释放和超时unknown/隔离顺序，T20消费结果；不能让TS强杀证明已经无效果。 |
| `P/services/host-write/host-write.ts:85,86`、`obsidian-host.ts:39` | dispose撤lease/abort；writes.drained等待真实Host Promise，uncancelable Vault仍占App quota。HapConnection关闭或Runner exited都不能代表Obsidian侧Promise已结束。 | T07原owner只读复用；T20组合注册器、bounded等待与最终本机receipt，不删除未settle占位、不补第二reply。 |

完整模块的懒激活/关闭顺序、listener与Host生命周期、退避重启/坏CP停止、宿主unload不等待async的后备退出、安装资产与移动端隔离由 **T20**；当前module.ts/manifest.ts/services/runtime/platform/desktop/runtime均不存在，只有ModuleId类型已包含huhubot。原T01只维护具体transport/wire/连接原语，T16负责服务端取消/恢复/有界stop合同；本076不开任一实施窗口。

## 最小可证伪窗口（全部not-run）

1. **唯一合同先行**：T01 owner冻结resume资格/代数/CAS与错误，补共享schema正负例（缺CAS、旧代/epoch、未知字段）；真实HapConnection验证capability关闭时不发业务、合法错误保留uncertain/用户意图。预留代理不等于执行成功。
2. **同Run真链**：T16 recovery contract child＋生产TS客户端＋SQLite/受控Engine，重启核查只发布资格；用户点击后同Run/newclaim继续，双击/同command重放只一次，回包丢失后明确原命令重试，旧CAS/新epoch拒绝。已有正常审批/children continuation不得被用户恢复屏障吞掉，无第二StartRun/预算根。
3. **当前授权与投影**：真实Group贡献者增长（含第100tuple）、客户端未见增长时移除依赖、source revoke/重加入新incarnation、资格核查后再撤权；实际EngineInput/Delivery零旧正文，旧页/snapshot不得覆盖新proof，公开合法History不被一律删除。复用074群真实fixture及075 frozen TS，不以Mock请求计数代替Go权限。
4. **持久事件**：同Run恢复前后>2^53 seq、cursor expired snapshot、已完成结果复用及late effect facts，逐公共seq/事件seq验证无正文重复；不要新增推送/另一个transcript。
5. **关闭故障**：受控真实stdio/Host Promise，用barrier分别卡在派发、Host已写未回、producer拒停；shutdown ack、连接EOF、受管父EOF、credential EOF和TERM/KILL分别观察，全部await实际child close；只有确认producer结束后才能声称排空/释放。下一进程取锁/unknown核查与用户T20真实宿主unload另验。

## 本次关键输入SHA

| 文件 | SHA256 |
| --- | --- |
| `src/modules/huhubot/api.ts` | `9cf6d25e4783e203bf47a475852bed436490da4892eaec86c1ba2b78739d4f34` |
| `src/modules/huhubot/core/protocol/connection.ts` | `c515e32ec0a632fe5259ee65b2d82c930859a7ed13ad15aa93f1240823c6e655` |
| `src/modules/huhubot/core/protocol/method-validation.ts` | `db90d2096e7c1f65b78d10500b380d84934ee4b1cec2dd0b8a124d275feba9f8` |
| `src/modules/huhubot/core/events/reducer.ts` | `756036a598c5e18e41fc5540c92c9c994f7d263183ccb6ad4c8dacd0c4d43301` |
| `src/modules/huhubot/core/events/transcript.ts` | `44223f4725cfeaaedaac4080a139d97db74a69619699abd3296778652d4dd428` |
| `src/modules/huhubot/services/events/event-client.ts` | `1c4813afb2c8a5df25dbec9825c9c286d0d6d1d4892c2184a00aad62ecd1dae0` |
| `src/modules/huhubot/services/groups/group-client.ts` | `9a951074020c491e9a96e237589ee613da4df461a7a079dc8ca04115d3f3ca33` |
| `src/modules/huhubot/platform/desktop/transport/managed.ts` | `f74ced41a9bf78c5d191ef2164ba7973018e76e8cefd992142a79be44714e989` |
| `contracts/hap/v0.1/schema.json` | `d45693a3b4b2abbe635cf2f8b4655b63a4419458bb1e4854723f786a63ed1217` |
| `contracts/hap/v0.1/methods.json` | `1a85dee850427b234f7795075b860051575977640768ccc18e0847463567ea1e` |
| `native/huhubot/cmd/huhubot/main.go` | `7e141fcc3662257193f402f1a25af7353cdef3e3692b08266c9731b554f7d28f` |
| `native/huhubot/internal/application/api/service.go` | `b6d5cfeee2479d380f8dc6b02c6bb2bd7c99aa4a4fe613d8b1f8f6e9d4ce7521` |
| `native/huhubot/internal/bootstrap/core.go` | `36fbd3262599e2f2143555ec1c7e771b92cddc0ea3ac89b7dabf905688684148` |
| `native/huhubot/internal/adapters/inbound/stdio/server.go` | `3404bd3043f9d54af2037937408c9f2e7c08f07a76fa1677142773ff20419076` |
| `native/huhubot/internal/application/execution/executor/executor.go` | `68a364c7f2d3aa58b50e2ff25ae07c41a4954c2e61cb827b878152886fa9049e` |

全43个只读来源和075九文件摘要见observations.json；这些是静态事实，不是测试或产品pass。所有建议自动化、真实Provider/Obsidian/目标OS均not-run。
