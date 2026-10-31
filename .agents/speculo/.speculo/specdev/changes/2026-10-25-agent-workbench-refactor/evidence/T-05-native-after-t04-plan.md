# T-05 native/transport：T-04 后的最小容量与公平方案（只读提案）

当前 GP017/Map18，T04仍在独立审查，T05锁定。复用 after-T04 与原T05预检、R-03/04/05、K-03/04 及刚完成的T04实际接线；不重新设计运行/屏幕 owner。**以下是静态源事实与待测方案；未复现OOM、未测吞吐或控制延迟，未固定新DTO/数值。K03仍须由A在准入后第一步实测，本轮没有运行。** 逐路径 SHA/bytes/UTC 见 `/tmp/huhu-t05-native-after-t04-source-observation.json`。

## 1. 当前真实链及容量单位

| 环节/单位 | 全部直接 producer → consumer；真实边界 |
|---|---|
| Node→helper stdin，encoded **bytes** | hello、spawn、用户input、headless reply、resize、ACK、end/requestStop、history(scan/query/read/cancel)、Cookie read → `PtyHelper.write` → Node Writable/OS pipe → Rust `frame::read_frame`/main dispatch。当前只调用 write，忽略 false/drain；无总待写字节限额。spawns/requests Map也无数量上限，request超时120s不是容量限额。 |
| Rust stdin 单 **frame bytes** | 长度字段包含kind，reader接受≤16MiB；INPUT还含4字节SID。必须先读完整frame再dispatch，不能在半帧内识别stop。两个encoder没有等价出站大小检查；此上限不是总队列或输入可靠接纳。 |
| 每SID pending/live 输入，**2项命令**+1个在执行 | `reserve`创建同一sync_channel；Write(Vec<u8>,Instant)与Resize(PtySize)共用FIFO → 单SID worker执行write_all/flush或master.resize。主循环try_send失败发原SID generic error；Node仅console.warn，void input调用拿不到关联拒绝。若单输入接近frame上限，两槽仍约32MiB载荷，另有执行中/Node/编码副本；N个SID不能乘后当固定总量。reply现在仍编码成普通INPUT，与用户输入共享这两槽；非独立保留通道。 |
| 每SID output credit，**原始bytes计数** | PTY reader每次≤64KiB → flow.sent →共享Outbox；Node stdout→FrameDecoder→NativeHost route→TerminalSession TextDecoder/headless.write callback→ACK→flow.acknowledged。常态1MiB暂停/256KiB恢复，读块可有一块越界；不依赖UI解析完成。stop/root drain解除credit等待，超过窗口显式truncated、丢其后drain块（T04既定语义）。 |
| Rust→Node 共享Outbox，**Vec<u8>条目/bytes** | 每SID reader OUTPUT；每SID monitor termination/legacy exit；main hello/输入和resize错误；spawn worker spawned/spawn-failed；History worker result/error；Cookie worker result/error；上述都进同一个无界mpsc Sender → 单stdout writer write_all+flush → Node decoder。每SIDcredit只约束一类producer；metadata/control/result不受它控制。 |
| 大结果及并发，**jobs/rows/serialized bytes** | History每个rid起thread，scan在writer mutex后串行，但排队thread/jobs无总限；Cookie每请求起thread，SQL限50001行后整体collect，行数不是byte上限；history read读取完整text，query一页100摘要，scan返回warnings。结果先构成Value，再control序列化成完整String/Vec。仅在共享Outbox后设限，不能证明这些构造过程也有总内存上限。 |
| Node raw→屏幕→view，**raw bytes/字符串chars/任务数** | decoder当前先拼接buffer、返回整帧数组并复制payload；一个模型异步解析，fanout/observe在parse callback前；subscribe初始backlog无上限。TerminalPresentation只计增量2,000,000 chars，snapshot/action不计。慢UI必须只使自身resync，不能暂停Node stdout或停止权威headless ACK。 |

Node的本地类型声明与其内嵌官方API说明（`@types/node/stream.d.ts:599–654`）明确：**write(false)的当前chunk已经被接纳**，应等drain后再送下一chunk，不能重写当前chunk；drain也不等于Rust已经接纳/PTY已经执行。highWaterMark是阈值，writableLength不含OS pipe、Rust队列或PTY设备缓冲。此为API语义引用，不是本轮压力结果。

## 2. 两条路线与推荐

**A：保留同一helper/stdio/protocol3，以可协商增量能力补本地字节预算和公平调度（推荐）。** Node增加唯一有界writer（总bytes+条目，计入已交Node且callback未完成/in-flight的一帧），Rust把Sender alias换成一个共享、有界、可唤醒的Outbox；按SID round-robin调度OUTPUT，控制/小回复保留独立额度，bulk按rid调度。只用现有标准库机制，不新增依赖/daemon/PTY平台。user FIFO、parser reply、ACK、stop各有明确准入；接纳时预留完成/失败结果槽，过载先拒新工作，不能挤掉已接受的Cookie请求或终止证据。控制也要有限：ACK可按SID合计，stop/force只合并升级且保留原deadline，termination只保留合法最新状态/单调sequence；terminal slot在对应SID准入时预留，不能无限承诺控制容量。

**不能仅把mpsc::channel改sync_channel再处处send**：满队列会阻塞stdin/monitor，使stop/ACK再次卡在慢stdout后。reader可以在独立路径等数据额度，stdin/control producer必须非阻塞、有保留槽或准确拒绝；绝不持live/master/Outbox锁做write_all、ConPTY close或等drain。正常活跃raw不丢，只有该SID reader停读；慢view不参与这层credit。

**B：同helper增加物理独立的控制流与bulk流。** 可避免控制帧被已经写入同一pipe的大帧挡住，仍需两边各自byte预算/准入。代价是Node额外stdio、Unix inherited-fd白名单、Windows合法句柄与bootstrap继承、双流代次/屏障/关闭的新合同；无法解决整个JS event loop或OS完全停读。当前没有证据需要扩大到这条跨平台改造，不推荐作为T05默认路线。

A保留单pipe的诚实限制：**优先级只能作用于尚未写入的完整帧，不能越过Node/OS已接纳的字节，也不能中断writer正在写的一帧。** 故必须限制一次不可抢占帧/用户input分片大小和总in-flight，按有限批次yield；大Cookie/history结果需可协商分块或在构造前准确too-large拒绝，不能把16MiB monolithic frame与“控制有保留槽”当作严格时间保证。若Node/pipe整体不消费，native仍须按T04执行scope收束，TS观察超时准确unknown；不承诺此时所有跨pipe操作仍能完成。

## 3. 准入/新wire/排序必须先共同确定

- **新wire并非所有改动都需要。** Node writer总量、Outbox公平及内部output屏障可保持现frame envelope；现hello已有capabilities扩展点，保持protocol3/termination-v1。但要把“原输入被接纳或拒绝”可靠反馈到调用者，现裸INPUT只有SID、异步generic error不能关联哪次write，**至少须选一种协商的远端credit/reservation，或可相关输入序号+原子queue-admission结果**；还须区分user input与parser reply，才能给后者真正独立额度。仅把void方法改Promise或等Node drain都不能证明远端准入。具体字段/名称/错误码由Root+A/C准入时冻结，本报告不造既成DTO。
- 建议新增的最小传输阶段是“本地拒绝/本地接纳/远端入队/写入失败或效果未知”；远端入队不等于PTY完成，更不等于模型成功。只有入队前明确拒绝才能称none；一旦交给Node或PTY写部分后断连，保持captured generation/sid/原序号的unknown，**不自动重放到原/新runtime**。本地队列未发时取消可移除该条；已接纳输入在同一SID保持顺序，容量失败不得静默丢掉先前已承诺条目。T08再消费阶段结果，不在T05提前实现业务输入仲裁。
- resize latest-wins仅合并**同一顺序段尾部连续、未执行的resize**；例 `R1,R2,I1,R3,R4` 可化为 `R2,I1,R4`，不能化为 `I1,R4`。已执行/被input或reply等屏障分开的resize不跨段移动；段/条目/bytes同样有限，超限明确拒绝新提议。原screen owner的几何提交必须知道native排队/应用失败，不能本地改grid后吞native失败；如何与解析提交对齐由A的单一屏幕顺序共同冻结，不能在等待resize期间阻塞必需device reply。
- ACK/stop/cancel走控制额度，设备reply走独立保留且有限的输入额度，不能被满用户FIFO拒绝；控制泛滥也要限/合并，不能另造无界高优先队列。多SID按公平配额推进，bulk不能永久饿死；现已接受的Browser Cookie/history lease继续持有到结果/准确失败，与view resync/Agent释放无关。
- **优先调度不能破坏每SID output barrier。** 已排队OUTPUT必须先发完，随后才可发该SID drained/truncated声明及legacy numeric exit；否则高优先exit会让parser提前结束。内部入队水位/屏障即可实现，不一定新增wire序号。早期root notice可先发但output仍unknown；若停止时确需丢队列中raw，必须由T04路径显式记truncated并先声明，不能由通用调度器偷丢。8s native、首次stop起10s观察、最后helper独立4+1s阶段及captured drain责任保持，不用重新连接/重发改变结算。

**总量验收应给账本而非一个阈值：** Node自有queued bytes + Node writable/in-flight bytes（防双计） + decoder拼接/帧副本 + Rust全局Outbox bytes + 每SID读块/in-flight + 用户/reply input bytes + pending请求数/结果构造预算 + headless待解析raw + 屏幕journal/每observer任务。模型/PTY/系统pipe基数与历史扫描内部集合另列，不从队列预算虚称整个进程RSS硬上限。具体常量先以现64KiB chunk/1MiB credit作样本起点，准入后测量再冻结，不在本报告编造值。

## 4. 精确写集缺口与验证接缝（未授权/未运行）

当前Ticket已含Rust session.rs/frame.rs/tests/**、Agent session*.ts、core frames*.ts及UI三文件；native闭包真正新增建议：

1. `src/host/desktop/native/helper.ts`；就近新增 `helper-stream.test.ts`：Node writer byte计数、false/drain只写一次、公平/错误关闭及pending请求限额。
2. `native/pty-server/src/main.rs`；新增 `native/pty-server/src/outbox.rs`（scheduler/byte预算单owner，标准库即可）；`tests/transport_pressure.rs`：主循环准入、输出公平、单SID输出屏障、跨会话stop/Cookie/history；已有tests/**覆盖新测试。
3. 若冻结新入队/分块能力：`src/shared/native/{host.ts,frames.ts,frames.test.ts}`、desktop `host.ts/host.test.ts/host.integration.test.ts`，一个新精确wire fixture需先由Root定名/补合同，不能复制termination fixture或在消费者猜字段。
4. **端到端结果生产预算不能遗漏：** `native/pty-server/src/data.rs` 与 `cookies.rs` 的并发/结果预留及有界生产；确要在SQL取String前限制单结果，则另精确加入 `agent_data.rs`（仅read/query响应预算检查，不改历史索引/归属/Provider解析）及对应就近测试。generic bounded serializer只控制编码增长，不能消除已构造的巨大Value；若暂不纳入这些路径，只能诚实宣称transport队列有界，不能宣称所有producer总量已闭合。历史数据/完整答案语义保持，超限必须明确失败或协商分块，不套屏幕read上限静默截断原接口。

不需默认扩到Space/Controller/store/UI其他路径；A/B screen API仍沿after-T04预检讨论，未冻结签名。新增额度拒绝如何呈现给用户，需A窄适配SessionPort调用结果，必要i18n路径由Root另授，不在shared/host反向导入Agent。

准入后的最小红绿：①K03由A先做；②fake Writable多次false/drain、EPIPE、已接纳后断连，证明chunk只写一次且账本≤预算；③Rust可控慢writer与多SID/多rid，停读一条并持续填bulk，证明保留控制/公平/byte峰值，无任何全局send阻塞；④队列满时input正确关联拒绝、reply/ACK仍能推进，R/R/I/R合并次序可观测；⑤root先退+持PTY+满Outbox，证明最后OUTPUT→trunc/drain notice→numeric exit顺序和原deadline；⑥固定helper副本真实Linux flood+快慢observer+第二SID stop+已接受Cookie，保存各层峰值，不把crosscheck或skip当Windows实跑。物理stdout整体停读时只能验证有界内存/真实native收束与TS unknown，不设不可能的控制响应保证。

本轮无tests/build/lint/cargo/helper/Provider/K03运行，无仓库/正式记录/Git/target写入，无新依赖或外部代码复制；既有T04原始helper副本完全未动。采用已核许可的R03慢客户端/控制分流与R04解析ACK思路，不直接拷贝任何实现。

**READ-ONLY SOURCE STOPPED。**
