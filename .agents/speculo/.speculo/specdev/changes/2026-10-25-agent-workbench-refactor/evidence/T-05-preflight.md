# T-05 权威屏幕、stream、resize 与背压：只读预检

2026-10-25，`/root/implement_t01`，沿指定 6.1-sol/xhigh。本轮未获 T-03/04/05 实施授权，仅写本报告与 `/tmp/huhu-t05-source-observation.json`；未改仓库、正式工件、Git或生成物，未构建、运行测试或启动 helper/PTY/Provider。以下源事实来自本次只读观察；建议不是已冻结接口，静态风险不是已复现缺陷。

`prepare_t02` 正在修改 SpaceService/WorkspaceService，本轮**不以这两份可变源作稳定结论**。terminal/session、native、presentation 等按当前冻结输入检查；与 T-04 观察中相同的文件摘要未变。完整29份读取源的SHA/字节/时间附后。

## 合同与可复用能力

T-05完整负责AC-031/032/054及局部AC-061。Spec §3.4/3.9、NFR-001与implementation-contracts规定：headless是解析权威；snapshot携runtimeId/contentSequence/范围，增量从同一水位连续；resize/备用屏/reset/UTF-8/ANSI边界与重连不丢重；只有一个尺寸owner，设备回复一次；可丢弃的只有可重建展示帧，未解析原始字节不能丢。read有界，cursor限本runtime，过期要求重取，不滚动原生TUI抓历史，也不把屏幕作为Provider完整答案。stop/exit不能被慢输出或慢视图挡住。

| 当前真实能力 | 源位置 | 复用而非重写 |
|---|---|---|
| xterm/headless + SerializeAddon，流式TextDecoder，headless负责DA/DSR/颜色/尺寸/Kitty等回复 | `session.ts:125–197,223–225,280–288` | 保留唯一权威模型；native ACK在headless write callback之后，不依赖可见视图解析速度 |
| subscribe先登记观察者，`model.write('')`作屏障，再给snapshot/backlog | `session.ts:366–381` | 已有基本快照→增量接缝及对应测试；缺显式runtime/sequence及完整边界证明 |
| 每个可见视图有独立串行presentation；隐藏即退订，超限重新取完整snapshot | `terminal-presentation.ts:19–130` | 默认增量预算2,000,000 **chars**；不切割escape；dispose处理被xterm丢弃的callback，已有调度测试 |
| 局部resize请求合并、两个稳定grid后应用，最迟8帧、窗口内取消 | `stable-terminal-fit.ts` | 保留本地抖动控制；它不等于跨视图的尺寸owner仲裁 |
| visible xterm安装swallowQueries；用户键盘/粘贴/输入走session.input/paste | `terminal-view.ts:38–51,136–147,179–182` | 已尝试隔离设备回复；需生产多renderer测试证明一次回复，不能删掉IME/Kitty/粘贴保护 |
| 隐藏WebGL LRU仅保留2个renderer | `hidden-renderer-retention.ts` | 这限制GPU上下文，不限制所有队列/屏幕query，不能当全链路内存证明 |
| 每sid credit：PAUSE_AT=1MiB，RESUME_AT=256KiB，READ_CHUNK=64KiB | Rust `session.rs:18–64,134–175` | 原始输出受headless ACK控制；保留output/exit路径与每sid隔离 |
| framed stdio按sid分流，单帧16MiB上限 | `shared/native/frames.ts`、Rust `frame.rs`、host helper | 保留T-01 owner/generation边界；旧`core/terminal/frames.ts`已只是shared重导出 |

锁定的headless/xterm均为6.0.0。复用reference-notes固定的R-03 tmux（ISC/逐文件许可）、R-04 xterm（MIT，6.0.0固定源码）、R-05 portable-pty（MIT）及K-03/04/05证据；只采用重同步/flow-credit机制，不新增依赖或引入终端引擎。K-03 scrollback+增高rows仍需按本票顺序在实际依赖先复现，不能直接断言HUHU有此缺陷或先升级库；K-05旧Windows报告也不是当前结论。本轮无新增外部研究/代码复制。

## 真正缺口与待验证风险

1. **屏幕水位/读取元数据缺失。** `snapshot()`返回ANSI字符串，`text(lines=200)`只有文本，subscribe回调只有string；没有runtimeId/contentSequence、buffer/geometry/range/truncated/cursor。read参数无硬查询字节上限；现有scrollback设置100–10000行虽有限，不能替代每次响应大小限制。
2. **commit边界未显式化。** receive先排headless.write，再立即fanout/observe；reset/writeLocal、resize各自修改模型。现有基础测试覆盖普通先snapshot再delta，但未覆盖逐字节UTF-8、ANSI未完成边界、同时resize/reset/订阅。显式sequence应对应实际解析提交，不用Date.now/activityAt/消息到达次数冒充。序号本身不证明parser状态可重建，订阅恰落在未完成CSI/OSC等位置必须验证；本轮不宣称已丢字。
3. **尺寸owner未建立。** 每个TerminalView的fitter都直接调用session.resize；session只去重相同尺寸，无owner token、转移或follower geometry同步。两个不同大小的可见视图存在争抢的静态路径，尚未复现。需明确可见/焦点owner规则、隐藏/销毁释放、无视图保留最后grid；follower只能跟随权威geometry，不能反向fit PTY。
4. **背压只是局部已有。** presentation的pending delta有预算，但snapshot不计入该预算，action队列未计数；Session初始snapshot前的backlog无显式上限，callbacks同步fanout。不能把2M chars写成字节/总内存上限。应为snapshot/read、delta/backlog、订阅/待处理action和必要输入队列分别设可测边界；超限只让该观察者重同步，保持已提交权威模型/原始字节完整。
5. **真实transport需核对。** host helper.write目前直接child.stdin.write且不使用其背压结果；native主读循环同步调用session.write_all。有单帧上限不等于有总队列上限或stop优先。需要受控慢读PTY/输出/多终端负载验证，按结果改真实owner；静态调用链不能当作已复现死锁。不要把阻塞替换为一个无界async队列。
6. **设备回复仍缺双真实renderer证据。** 当前查询吞咽有具体清单，且term.onData/onBinary仍入用户input。已有headless单模型计数测试不能独立证明所有可见xterm不会回灌回复。测试必须包括真实模型/renderer的DA/DSR/窗口尺寸/颜色/Kitty等，区分用户键入同样bytes与协议生成的回复，不能靠禁用整个用户onData过门。

不建议重建屏幕平台。最小路线是在现有session同目录增加小的屏幕frame/read契约与串行提交/订阅接缝，TerminalPresentation继续消费可重建流；保留原observe的旧消费者合同，避免为新screen stream改坏自动化原生结果。容量/范围单位和实际样本先固定，限制公开供T-07/schema使用，不编造未经测量的性能目标。

## T-03/04 现在必须保留的最小接缝（未来建议）

- **generation**：持久Session与每次runtimeId分开；模型/decoder/序号/几何/订阅都属于该runtime。read/subscribe/input/resize/stop接收或捕获expected runtime；旧回调不可更新新代，旧cursor不可跨代使用。
- **长期screen owner**：后台/无Pane仍保留同一headless、输出接收和ACK。detach只退显示订阅；re-attach读同模型不spawn。T-04 stop-requested期间继续接收/解析/ACK/退出，直到该代确认退出或有限清理后标lost；不能先dispose模型丢掉回收所需事件。
- **可等待解析边界**：保留内部parse barrier或等效可await方法，供T-05在同一提交点取得snapshot+contentSequence并建立连续订阅。resize/reset/clear等结构变更要能加入同一运行顺序；不把public synchronous snapshot永久固定成无法等待的唯一入口。
- **有界read/stream入口**：T-05可在准确runtime上新增readScreen({limit,cursor})与可释放subscribeScreen，不触发helper获取/历史扫描/输入。返回运行身份、水位、范围、截断及几何；过期定位明确resync。无需T-03/04提前实现分页，也不为此持久化热屏幕。
- **输入与回复分路**：保留user input admission、协议reply、flow ACK三个内部通道；T-04可关用户输入而让输出/ACK继续。T-05可为用户输入增加有界接纳/失败回执，T-08以后再完成公共prompt+submit仲裁；不得把input accepted等同模型任务完成。
- **resize owner接缝**：每个观察view有稳定且可释放的owner token，焦点/可见性变化可明确转移；权威grid可订阅给followers。T-03不要将Pane ID当runtime ID，T-04不要在detach时删运行，否则T-05无法做多视图。
- **控制不绑显示队列**：stop/exit/lost及连接撤销不能等待某个renderer.write callback；取消read/stream只结束该订阅，不停止目标、不重发输入。旧代清理仍用捕获lease/sid，绝不取新helper补发。

这些接缝可留在TerminalSessions/TerminalSession原owner，不要求新manager/公开CLI/数据库，也不改T-02三份目录/owner端口。

## 精确写集核对（仅建议，需Root派单前批准）

现有`services/terminal/session*.ts`通配实际覆盖session.ts、sessions.ts、就近测试及拟新增`session-screen.ts`，可在此完成大多数权威屏幕逻辑。`terminal-view.ts`、presentation、stable-fit和Rust session/frame也已授权；不用为新功能放大全模块。

| 缺失路径 | 何时/为何确需 |
|---|---|
| `src/modules/agent/ui/terminal/terminal-scheduling.test.ts` | 已有presentation/fit风险承接；当前只有生产3文件，未授权修改这个真实测试 |
| `src/modules/agent/ui/terminal/terminal-view.dom.test.tsx`（拟新增） | 真renderer回复隔离/多视图尺寸owner需生产view测试；现有TerminalTabView.dom测试mock整个TerminalView，不能当这项通过 |
| `src/modules/agent/ui/terminal/TerminalTabView.tsx`及其`.dom.test.tsx` | 仅若owner转移/几何UI接线落到React宿主；能在既有TerminalView/session闭合就不扩生产路径 |
| `src/host/desktop/native/helper.ts`、拟新增`helper-stream.test.ts` | 输入写缓冲、stdio drain/优先级或transport压力修复必须改真实wire owner，旧Agent helper路径不是owner；达到这条路线前先核准 |
| `src/shared/native/frames.ts`、拟新增`frames.test.ts` | 仅当帧大小/编码/增量decoder边界要改；core/terminal/frames*.ts是重导出，不能在那里重建第二份协议 |
| `src/modules/agent/core/terminal/terminal-core.test.ts` | 若需扩当前帧/输入回归，旧frames*.ts授权不覆盖该测试；原测试可只运行复用，无需为了改名编辑 |
| `native/pty-server/src/main.rs` | 若需让慢PTY input不阻塞控制调度、处理有界队列拒绝，真实dispatch在此；当前只列session/frame/tests，不能越权改main |
| `src/modules/agent/i18n.ts` | 仅当新增超限/重同步/owner错误用户反馈，需en/zh；不能把raw英文传输错误直接当产品文案 |

默认无需修改NativeHost/shared host接口、Controller/API：先从准确runtime的现有服务方法供GUI接线，T-07再投影CLI。若输入admission/public类型确需改变，先由唯一writer修`shared/native/host.ts`与真实消费者并冻结，不能另手抄一套NativeConnection。依赖升级未获授权，若K-03复现迫使升级再走原依赖/许可合同；预算和main/styles仍Root拥有。

## 未来自动化与真实helper夹具（本轮全部未运行）

| 接缝/未来命令 | 可验证内容 | 边界 |
|---|---|---|
| `pnpm exec vitest run src/modules/agent/services/terminal/session.test.ts` | 实际headless回复、基本snapshot/live、reset、输入保护；扩逐byteUTF/ANSI/alternate/resize、序号/读截断/过期cursor | 当前feed部分依固定延迟；新增异步验证应等parse callback/barrier，保留原风险断言 |
| `pnpm exec vitest run src/modules/agent/ui/terminal/terminal-scheduling.test.ts src/modules/agent/core/terminal/terminal-core.test.ts` | 受控慢write callback、overflow完整重取、隐藏/销毁、fit取消、帧分片/上限 | 都是稳定接缝测试，不是真renderer或真实PTY |
| 拟新增`terminal-view.dom.test.tsx` + 生产TerminalView | 两view/不同尺寸、焦点转移、设备回复一次、隐藏follower | happy-dom不能冒充WebGL/Obsidian多叶子真实行为；现有TerminalTabView DOM mock只证明生命周期接线 |
| `services/terminal/sessions.e2e.test.ts`、Rust session单测/stdio测试 | 真PTY输出/input/resize/exit/credit | 前者binary缺或Windows时skip；Rust大部分shell分支cfg(unix)，不能作五平台通过 |
| `node scripts/verify-pty-helper.mjs <匹配二进制>` | 有Unix/Windows shell与flood分支，1MiB附近暂停/ACK恢复、stdin关闭等exit | 不skip未知binary；当前脚本自行回复ConPTY cursor查询，不经过真实headless，所以不能证明设备回复只有一个权威。state保存输出累积，只用于有限工作量验收，扩压力应记录峰值并清理finally |
| `host/desktop/native/host.integration.test.ts` | 真PTY停止与Browser Cookie在途共存、最终helper退出 | SQLite/runtime能力依赖和binary不足会阻塞/skip，需记录实际原因，不是Provider/TUI证明 |

最小新增压力样本：两个真实自有PTY + 两个不同速度observer；固定原始bytes/速率/持续量与scrollback/geometry，一边连续高输出，一边stop/resize第二终端；断言所有原始bytes先进入权威解析、ACK与输出量核对，慢视图只丢可重建delta且可恢复同一水位，记录各队列峰值/单位与控制完成。还需K-03 scrollback+增高rows、reset/alternate、重订阅落在UTF-8/ANSI边界及旧runtime cursor负例。不要用sleep后“看起来好了”代替确定解析/退出事件。

T-04刚只读记录debug helper存在（SHA `5f01f05d62625f4199eb3a61866bbbc94697536446dfe7972f4d74cb63aafe91`），release缺；本轮未启动或验证其与未来源码一致。后续由Root/owner先构建匹配二进制再用临时目录运行夹具，只清理自己创建的进程且等待exit。真实Obsidian两叶子、Windows/macOS、IME/WebGL/Provider及五平台仍交用户；未运行、skip、mock与实际通过分别记录。

## 停止与源摘要

只读预检结束；没有解锁或完成T-03/04/05，没有建立新schema/冻结公共API。T-02 B继续停写，等待Root派单。源观察表如下（不含可变的T-02 Space/WorkspaceService）：

| 源 | SHA256 |
|---|---|
| `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/05-screen-stream.md` | `0befe4d829122ff34476866765844e620e2974e85690e1aea2168b070e822952` |
| `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md` | `d204c7a0b3178a60ddeb291a8153f79cb8e3864427c5317b7660832182d12618` |
| `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md` | `f13ca8cf0ef1185065e7c6d4e537a787f50ac813678aec428e498c0a8f03e397` |
| `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md` | `f54b94009192820a3f8a82ab24a62b6c36502443b77e30fbb2326aee2bd45fa8` |
| `src/modules/agent/services/terminal/session.ts` | `483203afdcb172c92e934bd2db6c95ef180fdc703f1e53eea4a9f9da2277072b` |
| `src/modules/agent/services/terminal/sessions.ts` | `94069dfd409b84eb96314d0fa827e9fcf01e3a6a0e9ea2c913c4cc0f1f61d323` |
| `src/modules/agent/services/terminal/session.test.ts` | `eaa3321c19ee9477cc2b2e595551403f22a7b74e0d49b2cc13506e60ad98e22d` |
| `src/modules/agent/ui/terminal/terminal-view.ts` | `1624981d8036026b02350507f376279a1af225f35c769494f7a78a2b66357356` |
| `src/modules/agent/ui/terminal/terminal-presentation.ts` | `c8b2623e10adb94535d26f83647cfb998846612fbda51c193808f47c33d0b6fc` |
| `src/modules/agent/ui/terminal/stable-terminal-fit.ts` | `d0196ed9f9ea16256bf950f74f7e5f143538f7775887c41b156c596316fda6ca` |
| `src/modules/agent/ui/terminal/terminal-scheduling.test.ts` | `8e8bc24f84e626dc4fd6aa54c0aff278b93d8b994974815e3295aececc0109aa` |
| `src/modules/agent/ui/terminal/hidden-renderer-retention.ts` | `183418dbf9e4fae1cf47931ada09ffa0054f962a0dbe3cf4c7fa94895742937c` |
| `src/modules/agent/ui/terminal/TerminalTabView.tsx` | `5a6e005dd77ff978f0daf1ba49742d10ab0ace4e4e31a85b18d2ffa4434ed53f` |
| `src/modules/agent/ui/terminal/TerminalTabView.dom.test.tsx` | `83c4396b94611b006490f9ad80eb1b2edb5d57f86da1b2deb1a28ff9a3d9023f` |
| `src/modules/agent/core/terminal/frames.ts` | `be51d2bf292a253c08f97ce426cf1ff5f1b89b8d10e540d382b43840ccdbbb8f` |
| `src/modules/agent/core/terminal/terminal-core.test.ts` | `3403fd74537b8e05643d04f48d3dcde113e9c68094ea509ce2e9d4bedbf86d8a` |
| `src/modules/agent/core/terminal/settings.ts` | `e043e495e9df1afc64689fab82459134c6f9baf4938456783134df78e4b4bd1c` |
| `src/shared/native/frames.ts` | `b359fe1e2002d50a405f68cceac1538a93d344a39cb645d300a5f91d9ac32e12` |
| `src/shared/native/host.ts` | `c764fc8f62a70450febd87c7f15df896266ea46fbea46559ac839fb32b757569` |
| `src/host/desktop/native/host.ts` | `0255c0fb39186e2d6ca5e9cec6e3e0a74f8ad0bf7183462f6b5cedcaecc0b068` |
| `src/host/desktop/native/helper.ts` | `1ee73cae6ec255f5cf91678b61b55f3de0b10d41e7fedc1eb0f482a08b17e8b1` |
| `native/pty-server/src/session.rs` | `e66231fc943fc37e2db244bec8fd67111a7a97cb986cf43fc06f532c0db8c928` |
| `native/pty-server/src/frame.rs` | `317e1168793d25fdd7012271c717865b17b21df63f13d95630f1e18e06774026` |
| `native/pty-server/src/main.rs` | `cc4080ae15d34684f9216710f916b21bd8f5e9530c668b149837640a428cb1fe` |
| `native/pty-server/tests/stdio.rs` | `821862321ebd753a2216d743ee0ba91e97ad2626e36e99a7e1e7677d83859049` |
| `src/modules/agent/services/terminal/sessions.e2e.test.ts` | `b65aed981f4756a913579043c9992d92585cd9b748e48b2bbc86969c06957c9f` |
| `src/host/desktop/native/host.integration.test.ts` | `d47756c71903e37437832a9afa51b2769bb797e064a09060c9347ab5a170e9b5` |
| `scripts/verify-pty-helper.mjs` | `728164f4df30b8045f44a396782119edccecda48a2a9801982a3402c697316a1` |
| `pnpm-lock.yaml` | `114f1ce8ebcbedaa2ac5834ab14575584bea6bf37dc44221b3617d7e657985fb` |

Observation SHA256：`147ab5ba2b97a401f01bba4176752b01e195229ae10dd7d8115ce2d66367066a`。
交接前核对：以上源无漂移。
