# T-05 native wire / 准入候选合同（只读，未冻结）

本提案供Root准入比较，不是API/阈值批准。T05仍锁；T04 source/target/原helper不动；A正修T04，其Session/调用端读数只代表本次时点。复用既有许可/机制研究，不增依赖、daemon或第二PTY平台。本轮无测试/build/cargo/helper/K03运行。预算字段仅给单位和含义，不给未经测量的数值。

## 1. 两条实际可做的方案

| | 远端 credit reservation | 相关序号 admission（推荐） |
|---|---|---|
| 准入 | hello给每SID/全局byte+slot credit；Node先扣再送，Rust消费后返还；多片需一次扣整笔总bytes+slot | begin带SID/op/总bytes；Rust原子预留总bytes+用户FIFO占位/结果槽，答reserved；片段完整且commit后答queued |
| 优势 | 本地即可明确拒绝，少一次正常输入RTT，steady state轻 | Rust仍是唯一真实容量owner；拒绝/取消/未知能对应同一笔，不依赖两份credit账本始终同步；更接近现有try_send+原SID错误路径 |
| 仍不可省 | 原子整笔reservation、返还代次/seq、resize占位、reply独立credit、丢连接credit失效；不能按收到片数返还使整笔超售 | 有界pending map和reservation到期；begin/commit往返，必须在Node本地先有界；只可在当前captured SID/transport路由 |
| 不适合的简化 | 把drain当返还credit；一边发送一边索取credit；只计条数不计bytes | 只给旧generic error加SID，或只把input:void改Promise；无法关联哪笔/是否有部分已经写入 |

**推荐相关序号方案。** 用户操作仍进原每SID FIFO，reply另有有限保留通道，resize进入同一顺序而不是第二业务队列。两方案都必须保留Node/全局Outbox总预算与公平调度，均不能从write(false)推断远端状态。credit可将来作优化，不先维护两套真相。

## 2. 候选 wire：复用现分配，不混入用户终端文本

实际源核对：shared `FRAME_CONTROL=1 / FRAME_INPUT=2 / FRAME_OUTPUT=3 / HELPER_PROTOCOL=3`；Rust同值，Agent core frames.ts仅重导出。当前没有4/5的分配；以下**4/5只是本提案的候选，须Root统一冻结，不是已存在事实**。长度仍4字节BE、kind1字节，既有16MiB是完整frame接受上限，不作为新操作/全局预算。

```text
hello request (kind1): {type:'hello',protocol:3,capabilities:{inputAdmission:1}}
hello response: existing fields + capabilities.inputAdmission=1
                + inputLimits:{operationBytes,fragmentBytes,sessionQueuedBytes,sessionQueuedOperations,
                               helperQueuedBytes,helperQueuedOperations,replyFrameBytes,
                               sessionReplyBytes,helperReplyBytes}
```

bytes字段为字节数、Operations为条目数，session/helper范围按字段显式分开，均为安全整数并检查跨字段关系；operation/fragment等必需容量不能用0假装可用，保留会话数/结果槽也须纳入预算。接收中/排队/执行中各阶段不能遗漏或重复计费。具体值准入测量后冻结；双端均支持才启用，新helper对旧hello保持legacy路径。termination capability/notice v1完全不改。

```text
kind1 input-begin   {sid,op,totalBytes}        // op: 当前SID单调非零u32；总长度u32且≤操作预算
kind1 input-state   {sid,op,state:'reserved'|'queued'|'started'|'written'|'none'|'unknown',reason?}
kind4 input-part    [sid:u32BE,op:u32BE,offset:u32BE,原始bytes...]
kind1 input-commit  {sid,op}
kind1 input-cancel  {sid,op}
kind5 parser-reply  [sid:u32BE,原始bytes...]    // 独立有限额度，不占user op顺序
kind1 resize       现有sid/cols/rows + op      // 与user op共享顺序
kind1 resize-state {sid,op,state:'queued'|'applied'|'superseded'|'none'|'unknown',reason?}
```

命名均候选。`input-state`等仍是kind1 JSON；4/5只走client→helper，Node decoder不能因此盲目接受server反向发4/5。parser-reply严格限小帧/总bytes；满额度或关闭须可观察诊断，不能用无界“urgent”队列躲过上限。ACK保持现有合计bytes控制消息；stop/force/cancel拥有有限保留槽且不等用户writer。

为何需要begin/commit而不是每片都说queued：按片入队会让前半笔已写入、后半笔才full，根本无法称整笔原子准入。begin预留整笔容量、FIFO占位与结果槽；在保留额度内收片，严格连续offset、准确总长度、单一commit；完整前不写任何payload到PTY。完整commit时在同一锁内替换该占位为原有Write操作，随后queued；后来的input/resize不越过占位。现有sync_channel不能凭空原地替换/撤销元素：实施可保留两槽channel、元素改有界OpHandle占位，worker等待该handle的ready/cancel（只堵本SID用户worker，绝不堵stdin/control）；容量slot在真实出队/结束时才返还，cancelled占位仍占物理槽期间不能超售。若改成有界deque也只替换native FIFO原语，不新增业务manager。超限/重复/乱序不重写已接纳数据，不杀共享helper；过期op不返回伪none，近期有界状态可答已有结果，超出保留窗口准确unknown/expired。op耗尽拒新操作，不能隐式重启helper。

## 3. 一笔操作的命运与取消

| 时点 | 对调用者的准确信息 |
|---|---|
| Node本地容量不足/尚未交pipe时取消 | none：整笔从未发送；不保留假排队、可明确报告容量/取消 |
| begin被Rust拒绝（总bytes/slot/关闭/旧SID） | none：未写任何用户payload；remote-full须返回同SID/op，不能只console.warn |
| reserved/正在收片 | 内部阶段，尚未宣称queued；取消经同一SID/op撤销占位与buffer，收到none才能证明没写 |
| commit完成但writer未claim | queued；允许cancel与writer claim在同一同步点竞争。cancel赢→none，writer赢→started，不能同时给两种事实 |
| writer已开始/可能写部分 | 不承诺取消回滚；written只说明本笔bytes完成PTY writer write+flush，不等于CLI消费/执行/模型成功。失败、断连、观察超时可能unknown；不自动Ctrl-C、换代次或重放 |

Node send queue中的每个encoded fragment只有一个ownership：调用stdin.write后无论true/false都不再放回待发队列；false只暂停**下一帧**，等drain。write callback用来释放本地in-flight byte账本；它不是remote queued回执。错误发生在begin/commit交出后但没有匹配状态时，保持unknown，不能因为本地队列空了便判none。只在当前transport进程/owner/SID/op解复用；新generation绝不继承旧pending操作。

signal用于明确发起“取消未开始的输入”时按上表处理；仅取消观察应有独立wait signal，不能暗中取消已queued输入（为T08保留）。stop继续沿T04同步关用户准入/清理未发送输入，对本方案已queued而未claim的操作发明确none/stopped-before-write；不能留下永远pending的receipt。force/重入不延首次deadline。

## 4. 最小TS接缝：保持旧入口，但必须增加可观察路径

当前真实 `NativeConnection.input/resize/reply`、`SessionPort.input/resize/reply` 均void；TerminalSession.input/paste也是void。建议**加能力/方法，保留旧void入口作兼容适配**，不直接把所有现有测试/调用者强制改成异步：

```ts
// 全部仅候选；result联合成员/原因名交Root冻结。
interface NativeInputSubmission {
  readonly op: number;
  readonly queued: Promise<Queued | None | Unknown>;
  readonly finished: Promise<Written | None | Unknown>;
  cancel(): void; // 尝试取消；实际none/unknown由上述结果确认
}
// NativeConnection / NativeTransport
readonly inputAdmission?: 1;
submitInput?(sid, data, options?): NativeInputSubmission;
submitResize?(sid, cols, rows): NativeResizeSubmission;
// 原input/resize/reply/ack/end形状保留；reply在新cap走kind5。
```

领域结果用discriminated union正常结算，真正程序错误可throw；不能有无人处理的Promise rejection。两个阶段有实际不同：queued是整笔remote入队，finished是write/取消/unknown；省掉finished则无法对“入队后取消/部分写失败”给准确可观察结果。无需为此新增第二runtime owner或持久input账本，handle是本代次有限内存对象。

具体调用端：

- `PtyHelper`建立有界op map，解析kind1状态并结算两个Promise；`NativeHost`仅捕获原owner/generation/sid，release后拒新user提交，保留既有handle/ACK/reply的有界结算。不把native sid/op当Space/runtime公开身份。
- `SessionPort`新增同样的可选submit方法；`TerminalSessions`捕获原helper转接；`TerminalSession`新增可返回handle的submit入口。**原input/paste:void可以保留，但必须真正观察提交结果并通知该Session准确失败/未知，不能再fire-and-forget后console.warn。** 新机器消费者用新入口，不用旧void推断queued；reply/ACK不经过用户门。
- UI `terminal-view.ts` 的onData/onBinary、paste、key、drop仍调用原Session入口，保持IME/快捷键字节和无Enter粘贴；无需让xterm callback await native。Session适配器处理可观察失败，必要文案由A/i18n owner统一。
- **两个必要旧生产者适配不能拖到T08：** `submitInteractivePrompt` (`prompt-runner.ts:27–28`) 与 `AgentRuntime`复用分支 (`agent-runtime.ts:406–407`) 目前paste后立刻单独input CR。新远端容量拒绝可能只拒前笔却接纳CR；应把既有pasteSequence(text)+CR作为**一笔**提交，并至少观察queued/失败再维持原回执。只做原行为的原子投递，不实现T08跨来源仲裁，不更换Provider启动/完整答案/usage/账号/完成判据。
- Controller `pasteInto/send` 目前返回同步boolean且只粘贴不Enter。可保留“已找到目标且本地提交”的旧boolean，不能升级含义为remote queued；晚到失败经同Session诊断可见，未来T08另取新receipt。若要求boolean本身保证remote queued则必然改成async并迁移消费者，不能由T05偷偷改变。默认不扩写Controller。

### 旧helper的准确退化

当前T04 helper只宣称terminalTermination=1，不能据此推断inputAdmission支持。新hello缺cap/未知版本/坏limits时不发kind4/5或begin：**要求强入队回执的新submit入口在发送前返回none/unsupported**，不得伪queued。旧UI input/paste仍可显式走原kind2 best-effort适配，保持一个旧frame/原字节顺序；不把旧frame自动拆成多个kind2来伪装原子事务（远端2槽可能只收前半）。本地writer已接纳后只能说未获远端准入证据，不能填queued/written；该兼容能力状态需可查询，实际错误反馈该Session，不能每次键盘都伪称成功，也不必每键弹窗。

旧reply沿kind2，明确不具远端独立保留保证；旧resize沿原消息，只能记录requested/unconfirmed。ACK/stop/T04旧helper保守cleanup规则不变，不为启用新能力重启/替换仍被Browser租约持有的helper，不重发既有用户输入。未来T08机器操作要求强receipt时拒unsupported，不偷偷降级；用户现有手动交互可保留旧能力下的准确best-effort语义。

## 5. resize/reply：解除软件等待环，不承诺抢占OS阻塞

新resize与input共享op顺序；只合并连续尾部、尚未执行的resize，`R1,R2,I1,R3,R4 → R2,I1,R4`，对被合并的旧op明确superseded。不能跨I1合并或把resize挪到半笔输入中；native应用失败通过resize-state回到A，不默默当PTY尺寸已改。

A屏幕队列只排序model output/resize提交，**不能await native input finished、OS resize或reply write后才继续parse/ACK/reply**。UI目标grid与native requested/applied/unknown应有区别；applied/error异步反馈如何投影/回退，在A/Root冻结屏幕合同，不由transport猜。`prepare_t05_screen`已只读确认不要求native output/resize ACK barrier，且会保留这一等待环边界；没有共同自行冻结DTO。

parser reply与用户FIFO分开预算、队列和dispatch，调度时优先于下一user操作，但不与另一user操作交错。**独立保留不等于物理可抢占**：portable-pty0.9公开take_writer只能取一次，返回blocking `dyn Write+Send`，Windows没有公开的通用raw writer handle/可取消write API；不能另取第二writer或靠并发write破坏字节顺序。即使拆成小write，也不能保证下一OS write不会因目标不读而阻塞。最小方案保持单writer、不在持锁区写、不让writer占stdin/stop/ACK/Outbox控制；reply准入不被user-full拒绝，但已阻塞OS write无法被队列优先级抢占，须有限unknown/沿T04 stop收束，不能声称“任何应用停读时reply都即时送达”。要承诺更强跨平台抢占需独立机制/实际验证与新增范围，当前不作为准入默认。

Outbox优先级仍必须守每SID输出屏障：OUTPUT先于该SIDdrained/truncated notice，再numeric exit；root notice可早发但output unknown。满队列不能阻塞监控执行真实scope收束，也不能把消费超时当清理成功。Browser已接纳Cookie/history lease和其他SID独立推进；物理pipe整体停读时只承诺有界+准确unknown，不承诺不可能的响应时限。

## 6. 结果producer：可先用现错误语义窄补，无需重复完整payload

**可以窄补。** 现`history-result/cookies-result`本就支持同rid的`error:string`，Node正确reject；先预留worker数量/单结果/共享bulk bytes，超限在producer构造前返回明确容量/too-large错误，不杀共享helper、不静默返回半个text/少Cookie行。JSON encoder也限bytes，不能只在Value完全建好后才拦；Cookie取String/Blob前检查field/row总bytes，history read取完整text前检查SQL byte长度（注意UTF-8/JSON转义预算），query页按整响应预算失败，scan warnings另有明确有界摘要而不伪装完整。

成功数据shape与完整内容保持，不反复构造Value→String→Vec的整份副本；有界serializer与同一owned byte buffer入队，Node decoder计中间副本。旧helper仍可读原result/error。除非产品决定必须承接超过预算的完整结果，本轮**不必新增bulk分块wire**；这种需求将来须同rid start/chunk/end、总量上限和单次重组，一次交付完整成功值，不能截断后仍resolve成功。现有query page=100/ Cookie≤50000行不是bytes上限。此response失败方案不改Provider原生完整答案服务，也不把screen read的limit套过去。

## 7. 需Root正式补齐的精确范围（全部尚未授权）

- shared：`src/shared/native/host.ts`、`frames.ts`、新增`frames.test.ts`，新单一wire fixture候选 `test/fixtures/native/terminal-input-admission-v1.json`（名称/字段亦待Root批准）；不改termination-v1 fixture冒充本协议。
- desktop：`src/host/desktop/native/helper.ts`、新增`helper-stream.test.ts`、既有`helper.test.ts`；`host.ts/host.test.ts/host.integration.test.ts`，有界op结果/代次路由/Node false-drain/legacy。
- Rust：当前Ticket已含session.rs/frame.rs/tests/**；必补`src/main.rs`、新增`src/outbox.rs`。producer预算另补`src/data.rs`、`src/cookies.rs`、`src/agent_data.rs`（仅read/query响应构造边界）及就近测试；新`tests/input_admission.rs`/`transport_pressure.rs`在既有tests/**内。无Cargo feature/新依赖需要。
- Agent当前session*.ts已有覆盖SessionPort/适配；必要新`session-input.test.ts`也在该glob。必须精确补`services/prompt-runner.ts`、`prompt-runner.test.ts`、`services/agent-runtime.ts`、`agent-runtime.test.ts`的既有paste+CR批次适配，不挪其业务owner；必要`src/modules/agent/i18n.ts`仅新投递失败反馈。UI原terminal-view已在票内；不默认纳Controller/API、Space、store、launcher或native job/bootstrap。

Root可在准入时选取签名与预算，A先跑K03，再做shared fixture纯schema红绿、Node false/drain只交一次、多片full/cancel/部分write失联、user满reply保留、resize顺序/失败不等parse、root-first输出屏障及Browser sibling。此处列的是待执行接缝，不是验收通过。

## 读取摘要（非freeze）

| 路径 | bytes | SHA256 | UTC | 边界 |
|---|---:|---|---|---|
| `src/shared/native/frames.ts` | 2905 | `b359fe1e2002d50a405f68cceac1538a93d344a39cb645d300a5f91d9ac32e12` | 2026-10-25T11:27:52.731655+00:00 | 只读观察，不构成新freeze |
| `src/shared/native/host.ts` | 3480 | `2e39c4f4c74b4c371b59ed16b76c60759ab90e19d232f58dc72d5744e7977eeb` | 2026-10-25T11:27:52.731760+00:00 | 只读观察，不构成新freeze |
| `src/host/desktop/native/helper.ts` | 11031 | `99c83f27f65ebc6203dda1f4f937f5159369cea656a31e63ba77c7beddd58167` | 2026-10-25T11:27:52.731793+00:00 | 只读观察，不构成新freeze |
| `src/host/desktop/native/host.ts` | 13023 | `d1c4b479b595fd3d18efd9a642ab1e4b34ca5840ac25bb7bdde386e147c1c36b` | 2026-10-25T11:27:52.731832+00:00 | 只读观察，不构成新freeze |
| `native/pty-server/src/frame.rs` | 4115 | `317e1168793d25fdd7012271c717865b17b21df63f13d95630f1e18e06774026` | 2026-10-25T11:27:52.731865+00:00 | 只读观察，不构成新freeze |
| `native/pty-server/src/main.rs` | 7582 | `ede0ebd60a46dd859772c028d9d6679be484edff10e4cd9146416bee82148f8b` | 2026-10-25T11:27:52.731890+00:00 | 只读观察，不构成新freeze |
| `native/pty-server/src/session.rs` | 33398 | `2589a3cbb077115653d8b080ed621a22aa8ca5d232f342ef35389f68927c0dfb` | 2026-10-25T11:27:52.731911+00:00 | 只读观察，不构成新freeze |
| `native/pty-server/src/data.rs` | 4190 | `22f48fd2b4b64e1e42769f44ca013ffd035ef82810b0bea9722fe3ba4abfa60f` | 2026-10-25T11:27:52.731960+00:00 | 只读观察，不构成新freeze |
| `native/pty-server/src/cookies.rs` | 4199 | `cf13ff8df8cdbf006139cb6e9c3f65ba0aca483dc67e963e9c19cfd8e74b6d39` | 2026-10-25T11:27:52.731979+00:00 | 只读观察，不构成新freeze |
| `native/pty-server/src/agent_data.rs` | 83199 | `12a184efb05a83ffdfee1eee70aefbd0a6e12921a86813cd05f7994a8e0f6080` | 2026-10-25T11:27:52.731997+00:00 | 只读观察，不构成新freeze |
| `src/modules/agent/core/terminal/frames.ts` | 50 | `be51d2bf292a253c08f97ce426cf1ff5f1b89b8d10e540d382b43840ccdbbb8f` | 2026-10-25T11:27:52.732117+00:00 | 只读观察，不构成新freeze |
| `src/modules/agent/services/terminal/session.ts` | 15892 | `b12a8b22b0c6371523cfbca8934b2ebddcb59bd9a24525c4620a42fe257163fa` | 2026-10-25T11:27:52.732142+00:00 | A当前修T04；仅时点观察 |
| `src/modules/agent/services/terminal/sessions.ts` | 26030 | `e1ad00a05bb4d6e604b2048c3b243b151b7adc5c46b417d3162ceab4a09a613f` | 2026-10-25T11:27:52.732297+00:00 | A当前修T04；仅时点观察 |
| `src/modules/agent/services/prompt-runner.ts` | 7898 | `588082628e0d24c33015217b9c1d056c0474b13212972e52ca2e17781bfd30dd` | 2026-10-25T11:27:52.732391+00:00 | A当前修T04；仅时点观察 |
| `src/modules/agent/services/agent-runtime.ts` | 23052 | `4df5489210382cc52e9276f96746f11a3757f27d9cde47acc6d58b78094a6c9c` | 2026-10-25T11:27:52.732440+00:00 | A当前修T04；仅时点观察 |
| `src/modules/agent/services/controller.ts` | 45720 | `4b3d245a36019b862cd1f13f88b7304945f1a8652bbf7f53dd8c6800ffebe010` | 2026-10-25T11:27:52.732480+00:00 | A当前修T04；仅时点观察 |
| `src/modules/agent/ui/terminal/terminal-view.ts` | 15353 | `1624981d8036026b02350507f376279a1af225f35c769494f7a78a2b66357356` | 2026-10-25T11:27:52.732534+00:00 | 只读观察，不构成新freeze |
| `/home/wta/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/portable-pty-0.9.0/src/lib.rs` | 13378 | `8b1d45c520f17c8be2d51069bb6ed46a6fa612d0395bc55a5b6e0ef30cc1c004` | 2026-10-25T11:27:52.732620+00:00 | 已固定依赖，只读相关trait/writer段 |
| `/home/wta/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/portable-pty-0.9.0/src/unix.rs` | 12978 | `14c85213b32074d71c8af334531fd027d6a0558dee830282620c88bab056c4b3` | 2026-10-25T11:27:52.732653+00:00 | 已固定依赖，只读相关trait/writer段 |
| `/home/wta/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/portable-pty-0.9.0/src/win/conpty.rs` | 2984 | `8af0d7654aad62aaa67685b7b8550bc638b732360f7de1357cc5b0a35bc47ca1` | 2026-10-25T11:27:52.732675+00:00 | 已固定依赖，只读相关trait/writer段 |

**READ-ONLY STOPPED。** 唯一写入为本 `/tmp` 提案；没有生产DTO/正式文档/源码/target/helper副本/依赖/Git变更，未运行任何验收程序。
