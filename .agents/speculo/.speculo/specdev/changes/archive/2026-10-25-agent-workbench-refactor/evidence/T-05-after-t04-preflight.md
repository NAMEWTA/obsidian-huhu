# T-05：T-04 冻结候选之后的只读预检增量

本报告补充原 `C/evidence/T-05-preflight.md`，不覆盖原件，不解锁 T-05。C 指 `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor`。Root 提供的 T-04 review input 为 `6b88551127001cc9d60ee42794f8d450adeaa2d6cbe900de6daed1d36d129516`，57 文件冻结、独立审查进行中；这里不推断 T-04 已验收。实际源 SHA/字节及与旧观察逐项比较见旁附 JSON。

建议继续使用现有**每 runtime 单一 headless 模型**，在 TerminalSession 内补有序屏幕提交与有界观察协议。T-04 已完成的重要生命周期边界应复用；当前主要工作仍是屏幕水位、订阅重建、尺寸 owner 和各层队列总量。没有发现必须引入第二个运行 manager、持久屏幕 store、终端引擎或平台的理由。

## 1. 哪些旧观察失效，哪些仍有效

旧观察的 29 个路径中，12 个 SHA 已变、17 个未变；这些数字含规格、测试和依赖文件，不是本票改动数量。Ticket/Spec/implementation-contracts/reference-notes 与 lockfile 均未变；旧报告的许可/参考研究可复用，未重新联网检索。

| 旧观察 | T-04 后的真实接缝 | T-05 处置 |
|---|---|---|
| Rust 主读循环直接 `write_all` PTY，输入可阻塞其他控制 | 已失效。`session.rs:223` 为每 SID 预约 2 槽 `sync_channel`，专属 worker 执行 write/resize；`main.rs` 输入用 `try_send`，spawn 先同步预约后独立线程；stop/ACK 不经过此队列 | 不重复实施“把 PTY 写移出主循环”。改验队列满、单帧大小、跨终端公平、resize 合并及错误可见性 |
| stop/exit 可能提前切断 parser reply/ACK | 原风险描述须更新为已落地的守恒边界：Session.closeInput 只关用户输入；captured reply/ACK 可在 lease release 后 drain；root notice 不等于最终 numeric exit | T-05 新调度层必须保持 output→headless parse callback→captured ACK，以及独立 parser reply，不能被 UI 隐藏、用户输入门或尺寸 owner 阻挡 |
| Session/runtime 身份和移除时机尚待前票 | 已有 stable Session / runtimeId / captured lease+sid 三层身份；TerminalSessions 是唯一 runtime owner，pending/stop/unknown 仍可定位；remove 不伪造 exit(-1) | 屏幕序号、cursor、view lease 均绑定 exact runtime；detach 只注销观察与尺寸资格，不 dispose model/decoder/PTY |
| native 常态 credit 可直接概括为任何阶段均不丢 raw bytes | 需分阶段。常态仍有 1 MiB/256 KiB credit；停止 drain 时解除 credit 等待，超过窗口会显式标记 truncated 并丢弃后续 drain 读块，受原 8s/10s 有限结算约束 | 活跃运行不得因慢视图丢未解析 raw。停止后的截断必须保留 T-04 output evidence，不得投影成完整屏幕/完整回答，也不在本票暗改停止合同 |
| public snapshot/stream 不含水位；每 view 都能 resize | 仍有效，见下文真实代码 | 本票主要闭包 |
| 原 UI 正常/错误/恢复状态仍是旧 TabView | 已失效。T-04 TerminalTabView 新增 stop、恢复占位、继续/重启门禁；其 DOM 夹具仍 mock TerminalView | 尺寸/stream UI 应叠加接线，保留这些行为和全部原菜单，不回退到旧文件 |

新增的 transport 观察：`helper.ts:96–99` 仍直接 `child.stdin.write(bytes)`，未消费 false/drain；`main.rs:198` 仍为共享无界 `mpsc::channel<Vec<u8>>` 串行 stdout writer。每 SID credit、2 槽输入或 16 MiB 单 frame 上限均不等于端到端总内存上限。输入 queue full 目前生成 generic error，helper 只 console.warn；不能声称输入已可靠接纳。以上是需测量/设计的生产路径，**不是本轮已复现的故障或内存结论**。

## 2. 可直接复用的屏幕路径与未闭合点

- `session.ts:292–299` 仍由一个 TextDecoder 与一个 headless 处理原始 output，并在 model.write callback ACK；但 fanout/旧 observe 在 callback 前发生。新 contentSequence 应表示解析实际提交，不是收到 chunk、fanout 次数、时间戳或 activity。
- `session.ts:390–405` 先登记 subscriber，再 write('') barrier，发 serialize snapshot 与 backlog；backlog 没有字节/条目上限，snapshot/delta 只有 string。`text(lines=200)` 也没有响应硬字节上限、范围或 cursor。
- resize 是直接 model.resize→native resize；reset/writeLocal、clearScrollback、scrollback 设置另走路径。它们要进入同一个屏幕顺序，不能在排队 output 中间同步改几何后再给旧几何 delta 编新序号。
- `terminal-presentation.ts` 的 generation、隐藏退订、慢渲染串行与溢出重取可保留。现有 2,000,000 是**增量字符数**，不含 snapshot/action，不是总 bytes/任务数上限。
- `terminal-view.ts:169–183` 每个 fitter 都 term.resize→session.resize→refresh。StableTerminalFit 只抑制单 view 抖动，不仲裁多 view。TerminalTabView 已有 active/focused，textarea focus 回调也存在，可在这些接缝传递资格；无需新建全局焦点 store。
- visible xterm 的查询抑制仍存在，但“两个真实 renderer 观察时设备回复一次”仍需生产路径证明。不能把 visible term 的所有 onData 一律禁用而破坏键盘、IME、粘贴与快捷键。

## 3. 两个可执行方案

### A：单 headless + 有序提交、可重建增量与每 view 尺寸 lease（推荐）

TerminalSession 内唯一屏幕提交队列统一 output、resize、reset/clear/设置变更；只在解析提交点推进 sequence。先登记有界订阅，再在同一顺序取 snapshot/watermark，后续 frame 从该水位连续。慢 view 只撤销其展示增量并明确 resync，不撤销权威解析、ACK、其他 observer 或 native 控制。保留现有 TerminalPresentation 调度和 StableTerminalFit，给它们接 typed frame/geometry/resize lease。

必须先用分片 CSI/OSC/DCS/UTF-8 的红绿决定增量编码：**parse callback 不证明 parser 已回到 ground state**；SerializeAddon snapshot 通常不包含未完成 escape 的解析器内部状态。不能简单把 callback 前的 raw text 搬到 callback 后便宣称任意加入点可重放。可在同一 authority 边界保留有界、可验证的重放前缀/安全提交段，或在无法证明可重放时发规范 resync/replacement；不得使用 xterm 私有 parser 字段或另造完整 VT 解释器。冻结公共 DTO 时不要把每个 delta 永久定义为“收到的原始 chunk”。

优点：最大程度复用现有路径、原始解析/设备回复仍一次；能逐层测量上限。代价：必须真正证明 partial ANSI 加入点与结构变更的重建，不能只验证普通字符串。

### B：单 headless + 提交后合并的 snapshot replacement 流

每个解析提交只标记屏幕 dirty；每 observer 最多保留一个待发送的当前水位 replacement，序列化一次 bounded viewport/scrollback，分块或分页传输，旧 replacement 可被更新水位取代。渲染端 reset 后应用同一水位快照，不依赖接上半截 ANSI；读取、尺寸 lease、设备回复仍复用同一个模型。

此法可作为 A 的失同步 fallback，加入点正确性更直观，但大屏高输出时 serialize/reset 成本更高，cursor/选择/可视滚动也更易抖动。若独立选用，须额外证明 AC-032 所需的连续增量语义与 AC-054 压力界限；**不能把每次全量换个名称当增量验收**。因此不建议把它作为整票默认实现，也不建议为减少序列化再创建第二个 headless。

## 4. 先冻结的最小公共合同（提案，尚无新 API 落源）

建议纯 DTO 放 `services/terminal/session-screen.ts`（现有 session*.ts 写集可覆盖），TerminalSessions 提供 exact-runtime 适配，TerminalSession 持有模型和状态。不要把 native sid/PID 暴露为屏幕 authority，不在 WorkspaceService 再缓存第二份屏幕。

必须先共同固定这些语义，再让 UI/native 并行：

1. **身份/水位。** `ScreenWatermark { runtimeId, epoch, contentSequence }`；sequence 单调、每次可见结构/内容提交一次，resize/reset/clear/scrollback 变更也有顺序。epoch 是内存屏幕/保留窗口失效标识，不是持久 Session ID。旧 runtime/cursor 显式 STALE_RUNTIME/CURSOR_EXPIRED 或 resync-required，绝不静默定位新 runtime。
2. **snapshot/read。** snapshot 含 watermark、权威 cols/rows、active buffer、确切 line/range、编码、payload、truncated 与可选 cursor。read 请求明确 format、范围与 limitBytes；返回严格 UTF-8 byte 上限、完整码点，不切坏 ANSI 控制序列。多块 snapshot 的总量也有限，start/chunk/end 同一水位，只有 end 后可视化提交。截取历史不滚动 TUI、不变更 PTY。
3. **stream。** 首个完整 snapshot 与后续 frame 是一个原子握手；delta 含 from/to watermark，geometry/reset 等有序控制与 snapshot 共用同一序列。观察者若跟不上收到 resync-required；overflow 仅丢可重建展示帧，不能丢未解析原始 output。listener 退订、abort 或抛错只影响自身。终止 evidence 与 screen EOF 分开，root-exited 期间仍可能输出。
4. **resize owner。** 每个 mounted view 有可 dispose token，绑定 runtime/generation，显式 visible/focused 资格；最近一次有效焦点取得资格，无焦点时保留仍可见 owner，否则按稳定登记顺序选下一可见者；无人可见时保留最后 grid。所有 owner 转移都不操作 UI focus。只有 owner 的稳定 fit 可提交 PTY resize；followers 使用权威 grid，不反向 fit PTY。隐藏/卸载释放资格、旧 token 和迟到 fit 必须拒绝。
5. **限额。** 导出单一 `SCREEN_LIMITS`（units 必须写明 bytes/frames/lines），涵盖单 read、整 snapshot、订阅 backlog、单 view pending、journal 保留、单 input、transport 待写总量与控制保留空间。实现者以现有阈值作为起点记录压力样本后冻结数值，不能拿 2M 字符或 16MiB frame 当总量承诺；本只读报告不编造测量或产品性能数字。
6. **兼容。** 原 `observe`、automation `text`、prompt 全文/receipt 合同先保持；新 bounded screen API 不冒充原生完整答案。captured reply/ACK 不经过用户 input gate、foreground 意图或 resize lease。所有重试仅重建展示，绝不重放输入/spawn/stop。

可用方法形状（命名可在准入时一次冻结，不是当前已存在 API）：

```ts
// TerminalSessions adapter validates ManagedRuntimeRef; TerminalSession uses its captured runtimeId.
readScreen(ref: ManagedRuntimeRef, request: ScreenReadRequest): Promise<ScreenReadResult>;
subscribeScreen(ref: ManagedRuntimeRef, request: ScreenSubscribeRequest,
  listener: (frame: Readonly<ScreenFrame>) => void): () => void;
openScreenView(ref: ManagedRuntimeRef, viewId: string): ScreenViewLease;
// lease: setVisible(boolean), setFocused(boolean), proposeGrid(cols, rows), dispose()
```

`ScreenFrame` 应至少可区分 snapshot start/chunk/end、delta、geometry/reset 与 resync-required；错误分类区分不存在/旧代、cursor 过期、limit/尺寸非法和 transport 不可用。具体编码如何证明 ANSI 连续性属于方案 A 第一轮红绿，DTO 不先固化错误假设。resize 的 latest-wins 合并不得顺带重排用户输入或吞 parser reply；native 满队列的明确拒绝/重试安全必须与 C 冻结同一 wire，不各自猜字段。

## 5. 建议最小写集与唯一 owner

T-05 现票 session*.ts 已覆盖 session.ts/sessions.ts/同名前缀测试和拟新增 session-screen.ts；不要因 T-04 新文件变多就搬入整个 Space/Workspace/NativeHost 范围。

| Owner | 主闭包（建议） | 接线依赖 |
|---|---|---|
| A 业务/屏幕 | `services/terminal/session.ts`、`sessions.ts`、新增 `session-screen.ts` 与 `session*.test.ts`；`sessions.e2e.test.ts`；有需要才改 `core/terminal/frames*.ts`；用户文档 | 先冻结 §4；旧 observe/stop/managed 生命周期回归；不复制 native DTO/codec |
| B UI | `terminal-view.ts`、`terminal-presentation.ts`、`stable-terminal-fit.ts`；`terminal-scheduling.test.ts`；新增真实 view DOM 测试；为传 active/focused 资格窄改 `TerminalTabView.tsx` 及其 DOM | 消费 A typed stream/lease，保留 T-04 stop/恢复/焦点与全部菜单；不写 A/i18n/native |
| C native/transport | `native/pty-server/src/session.rs`、`frame.rs`、必要 `main.rs` 与 `tests/**`；`desktop/native/helper.ts`、必要 shared/native/desktop host 合同与测试 | 先冻结有界写队列/控制优先/resize 合并/满队列错误；保留 termination-v1、原 deadline、Browser lease 隔离与捕获代次 |
| Root 集成 | shared packet/正式材料、`main.js`/`styles.css`、全构建及统一检查 | 所有 writer STOPPED 后串行生成；真实用户 E2E 仍交用户 |

**现票之外应预先精确补齐的最小路径：**

- `src/modules/agent/ui/terminal/terminal-scheduling.test.ts`（已有，验证新的 frame/owner 调度）。
- `src/modules/agent/ui/terminal/terminal-view.dom.test.tsx`（新增，直接测生产 TerminalView；TabView 的 mock 不能证明两 renderer/设备回复）。
- `src/modules/agent/ui/terminal/TerminalTabView.tsx`、`TerminalTabView.dom.test.tsx`（建议纳入，显式 active/focused 资格与迟到 token 生命周期）。
- `src/host/desktop/native/helper.ts`、`src/host/desktop/native/helper-stream.test.ts`（新增测试名建议；Node stdin 待写量的实际边界在此，不在 module/core frames）。
- `native/pty-server/src/main.rs`（共享 output outbox/control 调度的真实 owner，原“同步 input”理由已失效，但本路径仍可能是全链路有界必需）。

**仅当实际方案触及才补，不先扩大：** `src/shared/native/host.ts`、`src/host/desktop/native/host.ts` 及 `host.test.ts`/`host.integration.test.ts`（新增 typed admission/control bounds 时由 C 独占）；`src/shared/native/frames.ts`、`frames.test.ts`（wire 编解码确需变更）；`src/modules/agent/core/terminal/terminal-core.test.ts`（现票 frames*.ts 不覆盖）；`src/modules/agent/i18n.ts`（新增用户状态文案必须 en/zh，同一 owner）。现有 frame 编码无缺陷证据时不改协议；若需新增共享 JSON fixture，应先给 Root 精确路径与字段再派单。

不需要将 SpaceService/records/workspace-store/launcher/controller/agent-runtime 纳入默认 T-05 写集；screen 不写持久 owner。将来 CLI T-07 可通过已冻结 adapter 接入，此票不提前做 gateway、send-text 回执、T-06 activity 或 T-12 历史摄入。依赖升级仍须 K-03 本地证据和 Root 写集授权。

## 6. 准入后的红绿顺序（本轮均未执行）

1. **第一步 K-03：** 锁定现有 xterm/headless 6.0.0，真实 headless scrollback+rows 增长的最小反例，检查内容、wrapped 行和异常；记录复现/不复现。当前旧预检明确没有实测，本轮只读也没跑；现有相关测试未新增该证据。外部 Issue 6063 不能作为 HUHU 缺陷或先升级库的理由。
2. **屏幕：** UTF-8 逐 byte、半截 CSI/OSC/DCS 加入、alternate/reset/clear、同时 resize 与 subscribe；以完整解析 authority 为 oracle，对 snapshot+frame 重建后的格子/光标/模式进行比较，证明水位不丢重。cursor 过期、旧 runtime、超限和 unsubscribe 真实负例。
3. **尺寸与回复：** 两个真实 TerminalView、不同大小、焦点/隐藏/卸载/晚 fit；一个 owner、followers 同 geometry；查询回复只有 headless 发送一次；IME/粘贴/快捷键不回归。模拟 TabView 本身不够。
4. **有界压力：** 记录 raw bytes/输入大小、队列各自单位/峰值与总量；一个高输出 PTY + 快/慢 observer，同时第二 PTY stop/resize。慢 observer 独立 resync，活跃 raw 全部解析后 ACK；snapshot/action/Node stdin/Rust outbox 也必须在预算内。丢弃是可重建展示，停止截断须声明。
5. **T-04 相邻门：** stop 后用户输入关闭但 reply/ACK drain 继续；早 root notice→后 output→最终 numeric exit；late spawn/旧 SID/旧 runtime 不串代；Browser Cookie/history lease 不被 terminal resync/释放影响。不要重设 8s/10s 或把 numeric exit 当 cleanup 完成。
6. **原生/宿主边界：** Root 交接新冻结 helper 后才做真实 Linux 组合，显式 HUHU_TEST_PTY_BINARY 不存在必须失败，有限等待/finally 清理自己的 PID。其余平台仅代码层/可用 CI 的真实证据，不能写五平台 E2E 通过。局部生产 UI 验证用当前组件，真实 Obsidian 两 leaf 仍按 Spec §11 留给用户。

## 7. 交付与停止

本报告只做影响分析。没有运行测试、lint、构建、helper、target 或 Git，没有网络重查，没有改源码、正式证据或状态；不声称 T-05 ready/done/验收通过。R/K 参考复用未变化证据。唯一新增文件为本报告及 `/tmp/huhu-t05-after-t04-source-observation.json`。

**READ-ONLY SOURCE STOPPED。** T-04 审查、G01 与 T-05 解锁由 Root 决定。
