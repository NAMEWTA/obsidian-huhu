# T04 TS事件客户端候选交回

Session: 20261025T043239Z
Task: 044-event-client
Status: completed

## 聚焦交接

已交付按Run独立游标的纯投影与实际BotClient事件服务，并维护原T01严格错误编解码和关闭生命周期。TS生产/测试共11文件已冻结；本票83项定向检查、双tsc、lint与架构检查通过，真实CLI及原Runner10项回归也已完成。**这不是T04/T06联合验收完成：Root随后以实际Go writer字段发现T06状态事件命名不一致；042正在统一生产事件，043与Root负责冻结后真实Facade→TS及全局组合检查。**本票保留该反例，不用现有绿灯覆盖它。

作者为实际受派的 `native:/root/foundation_client`，沿gpt-6.1-sol/xhigh偏好，不声称runtime模型鉴定。工作区为当前 `NAMEWTA/bot`，HEAD/base `33c21e098ef3188cbab5a09f3e0a01fadb787715`；以044实际派遣、Map12/Goal11、LOG066为入口，后续Go内部DeliverySubject/history fence维护由Root另行控制。本票没有修改公共API/schema/Go/依赖/工程产物/正式状态，没有再委派、提交或发布。

## 产物与验证

修改范围与实际输入全部SHA见 [23-source-input.json](logs/23-source-input.json)，26文件，manifest本身SHA256 `28204f95c2b7317b3ef4ee63ba17baed7044909a8f0d99e56cd7ae1daa048e40`；11个自有文件都逐项列在其中。规范输入见 [24-normative-input.json](logs/24-normative-input.json)：dev及适用架构/测试/许可参考、I入口、当前Map/Goal/T04、Spec/ARCHITECTURE/ADR、034完整报告和observations、044不可变TASK。034的52来源索引及原始行是研究输入，未把其未运行矩阵记成通过；采用其DB-first、bounded tail、丢wake仍查DB与Run+seq去重思路，未复制OpenBot/Eino源码或引依赖。

| 生产文件 | 交付行为 | SHA256 |
| --- | --- | --- |
| core/events/reducer.ts | 按Run的64位十进制序号、排序去重、洞补读、快照与后续事实、正文清除 | 756036a598c5e18e41fc5540c92c9c994f7d263183ccb6ad4c8dacd0c4d43301 |
| services/events/event-client.ts | 真实BotClient尾读、分页恢复、页面与连接生命周期、稳定冻结selector快照 | e5c8c7690898f4eee4fcc1d5a65a92d453c76e85d1567249ae6469d72381c93b |
| core/protocol/codec.ts | 同一schema校验typed错误详情，未知字段仍拒绝 | 71de23b98671357c2ee454a3be4fcabd84860294a1d9d8070a2854599caa2d1d |
| core/protocol/connection.ts | 公共BotClient.onClose、一次通知/解绑、合法typed错误不破坏后续连接 | c6c86847e673fc6c5c35399a29bb05079d99f843723715c62a8904359fc663c9 |
| core/protocol/method-validation.ts | 唯一Ajv实例、126方法缓存及额外固定1个BotErrorData validator | 390e5688de1d6bdc8029ffc5e9f512cfec9206f03ab0af0c8076fd29145bf33d |

另外6个测试文件为上述5份生产代码对应测试，以及 `services/events/runner.test.ts`。原desktop/transport/runner.test.ts只读执行，没有改写；Host sources/read和credentials均未写。

具体合同与消费方式：

- `EventClient(bot,timers)` 默认每Run最多一个未完成的bounded `bot.runs.subscribe`，默认limit64/maxBytes65536/waitMillis1000，RPC timeout3000。`attach(runId)` 返回 `getSnapshot/subscribe/refresh/dispose`；`getSnapshot`稳定且深冻结，页面selector可直接消费，不另造事实库。`poll:false`供显式刷新和可重复进程夹具。
- 只在当前Run应用连续序号；洞后事件不缓冲正文，而从最后成功cursor重读。BigInt处理至有符号64位上限，绝不跨Run比较序号。正文仅累加text/delta/token/text.delta/chunk；审批/效果/未知事实有界保存于facts，不能把ledger.text当流正文。裸Run状态事件更新Run状态；ledger自身status/reason不覆盖Run终态。终态后仍尾读核查事实。
- CURSOR_EXPIRED的snapshot和snapshotSeq一起重建，含后来不能从Run/messages重建的snapshot.events；之后仅应用新序号。future cursor实际reason `EVENT_CURSOR_AHEAD` 清可疑投影，从0重新取得有权页；过期错误没有合法快照或资源/权限错误时暂停并显式可重试，不自动写重放。
- 每client最多16 Run、每Run16 owner/256 listener、facts最多128、流正文256KiB、单投影1MiB；同Run共享读取而页面独立detach。listener只收到变更通知，没有响应正文队列；异常listener不能阻止后续检查。最后detach只abort读取，不调用runs.cancel或关闭Runner。
- `setClient`解绑旧连接hook并清正文，Profile更换连非正文旧元数据也重置；`leaseChanged()`供T20组合Host lease hook，立即清正文/待发并停止该轮；`dispose`释放timer/listener/controller。BotClient.onClose由042唯一API owner声明、044 connection实现，EOF立即清所有Run（包括idle页），不是只等当前RPC失败。generation+AbortSignal使旧连接/旧lease/卸载后迟到批次不能恢复正文。允许的非正文状态与引用可保留，用户笔记、用户历史和服务端事实不删除。
- `HapProtocolError`定义移到已授权method-validation.ts，codec继续re-export同一类，原imports/instanceof保持；依赖单向，无循环初始化。唯一canonical `$defs.BotErrorData`由042维护；codec没有另造snapshot字段表。126方法固定缓存/懒编译、Ajv无coerce/remove/default和格式检查保持，额外错误validator仅1个固定入口。

共享冻结合同：`api.ts` SHA256 `3a0404c4aa9c0ecc1fed687cf73330ad82da50767a79c19474688fae8f40a40c`；schema SHA256 `5a2d1c410dd4c5dbf811933d3938673205dc264055dd70b18a10688be232e863`；63 methods/126方法形状、234共享method cases、4有效frame goldens、12 invalid frames。onClose仅本地hook，不进HAP；本票未改变wire字段/预算。最终Go内部fence尚由042/043收敛，不将这组TS输入摘要冒充最终全Go tree。

实际执行与原始日志：

| 检查 | 结果 |
| --- | --- |
| 合法typed cursor error原回归 | [01-codec-red.log](logs/01-codec-red.log)：旧codec拒收合法details，真实断言红灯，工具exit126；[02](logs/02-protocol-green.log)修复后0。 |
| 最终来源、Host、事件及协议局部套件 | [18-local-final.log](logs/18-local-final.log)：exit0，7文件83 tests，2.97s。含重复、乱序/洞、大seq多Run、snapshotSeq/latefact、future/expired、terminal核查、撤权正文、idle EOF、旧连接迟到、lease/detach/dispose、Profile隔离、稳定冻结snapshot与原Unicode/Host等风险回归。 |
| 实际CLI与原Runner套件 | [12-real-runner.log](logs/12-real-runner.log)：exit0，2文件10 tests，33.78s。真实生产HapConnection→managed transport→Go CLI/bootstrap/Facade/SQLite；新事件例用生产UnavailableEngine，受理后真实failed，page detach不取消，未来cursor错误后health仍可用，退出Wait后同Profile重开续读。没有假成功模型handler。 |
| 最终生产tsc | [19](logs/19-production-final.log)：exit0，无输出，会话32519已Wait。 |
| 最终测试tsc | [20](logs/20-test-final.log)：exit0，无输出，会话71092已Wait。 |
| 最终局部eslint | [21](logs/21-lint-final.log)：exit0，5份生产文件零警告，会话65873已Wait。 |
| 最终TS architecture | [22](logs/22-architecture-final.log)：exit0，1206 modules，无zone/host/desktop/barrel/cycle违规，会话83846已Wait。 |

01是既有生产缺陷的真实红灯；新增纯reducer/service测试首次运行即绿，没有倒造不存在模块的“行为红灯”。中间静态失败原日志完整保留：05为原非法kind测试在增强wire type后需要显式负例cast；09为新Runner夹具误认launchBotClient返回含transport（已改为现有DesktopHapTransport+HapConnection，不造process manager）；15为增强error.data类型后旧断言已无必要。均不是隐瞒的最终失败，也没有削弱规则。03/07/11/17等各中间绿灯只表示当时输入，不替代18最终结果。

**CLI证据范围：** 12基于042当时明确build-ready的Go窗口；随后Go内部DeliverySubject/history gate及T06状态事件正在维护。之后044只读静态/局部检查基于上述冻结TS输入；没有声称12已经覆盖随后Go变更。Root将共同冻结后的完整Runner/Go集成、全插件build/lint统一执行，避免循环构建半成品。CLI临时Profile/二进制目录由afterAll删除，两个transport都await exited；所有本票测试/命令已完成，无持有进程。

**043跨端证据来源：** 043消息报告 `tests/contract/events/ts_test.go::TestActualTSClientConsumesDurableGoEventsSnapshotsAndLateFacts` 首轮0，09-actual-ts-go-first.log，实际bundle消费本票EventClient/reducer/HapConnection→Go test child真实bootstrap/stdio/SQLite，覆盖Unicode页、重复、终态压缩快照、latefact、大seq及detach不取消running Run。我只读回读其永久夹具；新增真实Source+Grant允许正文→revoke/expiry→TS清pendingText/messages/facts、保留succeeded状态，以及同时大/小Run验证由043继续完成并向Root交最终日志。外部Engine/有限Host替身和明确大seq/latefact SQL夹具不冒充用户真实Vault/模型；本agent没有执行其Go测试，最终结论请回读043报告/Root重跑。

## 问题与下一步

Root最新独立反例已回读、只读复制为 [25-root-state-observations.json](logs/25-root-state-observations.json)：实际生产reducer上，匹配Go writer的synthetic `approval.pending/status waiting_approval` 和 `run.canceled/status canceled` 两输入，seq推进但projection.status仍running。它是Root的synthetic字段向量，**不是live Go wire，也不是本agent执行**；83绿不覆盖该T06消费缺口。

042已选择统一生产合同：Run状态永远裸type=Run.status；Publish同事务先保存 `approval.pending/status pending` ledger，再追加 `waiting_approval/status waiting_approval`；Cancel发 `canceled/status canceled`。044保持冻结，不能把任意effect.status提升为Run状态；已请求042/043基于真实审批/取消Facade经当前TS服务证明修复，而不是只增加手造事件向量。该联合补验及Go fence最终状态归Root收口，本票候选不宣称联合gate已关闭。

无本票TS写入阻塞，所有生产和测试writer已停。下一步Root固定042/043/044共同输入、回读交叉来源、执行组合build/lint/E2E与未参与实现者双轴review。T20/T21实际组合与Host lease绑定、真实Obsidian页面/用户Vault、真实模型和目标OS现场仍为后续票或user-owned/not-run；当前只交可消费代码与生产进程验证，未把替身当现场。

最终源输入再核验、进程清理与实际return结构回执见 [26-return.log](logs/26-return.log)。completed只表示044候选交回，正式状态由Root维护。
