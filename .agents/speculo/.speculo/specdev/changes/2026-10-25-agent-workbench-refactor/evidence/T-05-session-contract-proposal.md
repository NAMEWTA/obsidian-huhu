# T-05 Session 合同候选（只读，未冻结）

观察日：2026-10-25。供 Root 正式准入后冻结 A/B/C 接缝；本轮没有修改仓库，没有运行 K03、测试、构建或 helper。采用 Root 首选：固定现有 xterm 6.0.0，单 headless 解析，集中私有状态投影；native 采用相关整笔输入准入。不是第二个模型、parser、runtime manager 或持久 store。

## 1. 当前接缝与建议 DTO

`session.ts:292` 已有单 decoder/model 和 parse callback ACK，但字符串 fanout 在 callback 前；`:390` 的 serialize+string backlog 没水位/容量；`:374` resize 只有下限；`:437–448` reset/clear/scrollback 未统一排队。`sessions.ts:320–325` 已捕获 lease/helper/SID，并为 T04 drain 保留专用 reply/ACK。保留后者，不让展示 backpressure 进入这条链。

建议纯合同放 **`src/modules/agent/core/terminal/frames-screen.ts`**（已在 `frames*.ts` 票范围内），与现有仅 re-export native frames 的 `frames.ts` 分开。以下是候选名称，Root 尚未冻结：

```ts
type BufferName = 'normal' | 'alternate';
type ScreenMark = Readonly<{ runtimeId: string; contentSequence: number }>;
type ScreenCell = Readonly<{
  chars: string; width: 0 | 1 | 2;
  fg: number; bg: number; // pinned xterm6 fg/bg primitive bit words
  extended?: Readonly<{
    underlineStyle: number; underlineColor: number; underlineVariantOffset: number;
  }>;
  linkKey?: string; // runtime-local projection key, never target xterm urlId
}>;
type ScreenRow = Readonly<{
  key: string; isWrapped: boolean; cells: readonly ScreenCell[];
}>;
type BufferHeader = Readonly<{
  name: BufferName; length: number; baseY: number; cursorX: number; cursorY: number;
}>;
type ScreenLink = Readonly<{ key: string; uri: string; oscId?: string }>;
type ScreenSnapshot = Readonly<{
  version: 1; engine: 'xterm-6.0.0'; at: ScreenMark;
  geometry: Readonly<{ cols: number; rows: number }>;
  active: BufferName; buffers: readonly BufferHeader[];
  state: ScreenState; links: readonly ScreenLink[];
  // rows supplied through bounded pages/chunks, not a per-observer full clone
}>;
type ScreenFrame = Readonly<{
  kind: 'patch'; version: 1; from: ScreenMark; to: ScreenMark;
  operations: readonly ScreenOperation[]; effects: readonly ScreenEffect[];
}>;
```

`fg/bg` 精确保留基础颜色模式/位值与 bold、inverse、blink、invisible、italic、dim、strike、protected、overline 等；扩展 DTO 选择**有效显示属性**，不冒充底层 `_ext` 相等。source urlId 转 linkKey，target 分配自己的 urlId；不得共享 CellData/ExtendedAttrs/BufferLine/markers 或源对象。数字的有效范围、双方 engine/shape guard 与 bit-word 语义写入同一纯合同测试。空格、NUL cell、宽字符 continuation、combining string 不互相归一化。

`ScreenState` 的最小明确字段：applicationCursor/applicationKeypad、bracketedPaste、sendFocus、mouseTracking 与 encoding（DEFAULT/SGR/SGR_PIXELS）、cursor visible/initialized/style/blink、应用颜色覆盖/调色板 sidecar、`syncOutput:{enabled,lastCommandId}`。Kitty/win32 继续 Session 现有 keyboard authority；可见目标仍保留 stock xterm 键盘、鼠标、IME、selection/search/link addons。**不传 parser/margins/charset/saved cursor 供 target 接续 raw**；未来 raw 永远只交 source，以上状态由 source 决定后续 cells。

`ScreenOperation` 是有序 union：`geometry`、`activate-buffer`、`trim-start`、`append-rows`、`splice-rows`、`replace-cell-run`、`set-row-wrap`、`buffer-header`、`link-upsert/remove`、`state`；结构性 reset/clear/reflow 可发带明确原因的 `replace-buffer`。结构 op 必须来自真实 source 结构操作/事件记录，或承认是完整 replacement；**不能由 LCP/LCS 猜 splice，再声称等价 marker/selection 变换**。row.key 在真实保留行上稳定；reflow 没有可靠映射时显式新 keys/replacement，B 清理受影响锚点。普通尾部输出、进度条和 cursor 更新必须增量，不能每帧整屏替换。

`ScreenEffect` 带递增 effectId：已解析 DEC2026 enable/disable 命令、live focus-report 请求等必要事件；相同命令仍可能有语义。snapshot 不重播过去 device/focus 报告。重同步保留 lastCommandId，使已有 view 不因 source bit 仍 true 而反复重启 browser sync timeout；mouse setter 同值不重复触发清 selection。具体事件桥接由 B 的集中 adapter 证明，禁止伪造 onLineFeed 刷 Search（WindowsPty 也订阅它）。

## 2. join、stream、read 的最小公开候选

```ts
// TerminalSession；runtimeId 就是该对象 id，不是持久 Session.id/native SID。
openScreen(options: Readonly<{ after?: ScreenMark }>, sink: ScreenSink): ScreenStream;
readScreen(request: ScreenReadRequest): Promise<ScreenReadResult>;
getScreenUsage(): Readonly<ScreenUsage>;

interface ScreenStream {
  readonly runtimeId: string;
  applied(mark: ScreenMark): void; // 仅此 observer 的展示进度，不是 native ACK
  resync(): void;
  dispose(): void;
}
type ScreenReadRequest = Readonly<{
  expectedRuntimeId: string; cursor?: string; buffer?: BufferName;
  maxRows?: number; maxBytes?: number;
}>;
// result: ok{at,buffer,range,text,truncated,nextCursor?,outputCompleteness}
//       | resync-required{reason:'stale-runtime'|'expired-cursor'|'retention-gap'}
//       | rejected{reason:'invalid-limit'|'resource-limit'|'disposed'}
```

Sink 收 `snapshot-begin{snapshotId,header,totalRows/bytes}`、`snapshot-links`、`snapshot-rows{snapshotId,buffer,start,column,rows}`、`snapshot-end{snapshotId,at}`、连续 patch、`resync-required{current,reason}`；全都携 runtime/同一 snapshot 水位，links 不塞进无界 begin header，chunk 有单帧与总量限制。长 row/cell combining text/URI 允许按明确 offset 分片，在验证声明总量/片数预算后组装，不能因单值超帧而静默截断。单个 patch commit 超 frame cap 则分有限 commit parts，全部到齐才推进 to；预算不足改明确 snapshot/resync，不拆成几个假连续水位。终止/断联/T04 output truncated 作为准确元数据展示，不把 root exit 当屏幕 parse 已完成。

join 在模型事务内复制 S_N 并安装 N 后的 journal 接缝；N 之前 effects 不重复，首个 patch.from=N。`after` 仅在同 runtime 且完整 retained journal 可用时续接，否则明确 snapshot。target 只有完整提交 snapshot-end 才可发布 N，半份不对用户宣称一致。patch 必须 `from===lastApplied` 且同 runtime，否则丢该展示队列并重同步，不尝试补 raw。

每 runtime 最多一份共享不可变 snapshot 在制/保留（有限总 bytes/TTL、有限 join/read tokens）；每 observer 只有有限 frame 引用、一个 in-flight 和一个 resync 标记。`applied()` 只回收该 observer 引用，权威不等它；队列超限淘汰该 observer 的**可重建帧**，不丢 raw，不阻塞别的 view、Session 或 stop。snapshot 过期/复制预算不足返回 busy/resync，不在未预算内先完整复制。隐藏 view 退订；再次可见按当前水位 join。原 `subscribe(string)` 应由 B 全部改接新流后退出展示生产路径，不能留 serialize+未来 raw 的错误 fallback。

read 是纯权威文本分页，cursor 绑定 runtime+snapshotId+buffer+行/列+expiry，不能跨代次。稳定有限 snapshot 页避免翻页期间 trim 导致重/漏；过期要求重新取，不静默换水位。对超长一行也按 UTF-8 code point/byte 上限切片并返回列/字符串 offset 与 continuation，不能只限制 rows 后输出无限字符串。cursor/token 数和 pinned-copy 总量有上限；取消仅释放该 read，不 stop、不 spawn。现 `text(200)`/原 automation native 全文不是这个 read 的替代品；不在 T05 变更原 native 答案合同。

## 3. 单模型事务与唯一 geometry owner

所有 `receive`（保留原 byte-credit）、本地提示、resize、reset、clear、scrollback 变更进入同一 runtime 顺序器。一个 headless write 在途；callback 后收集结构日志/精确 primitives，推进 safe-integer contentSequence（无显示变化也有有序 commit），publish immutable frame。累计计数禁止溢出回绕；到上限明确资源故障。source 每批只解析一次；snapshot/目标 import 不调用 authority parser，也不重发用户输入/设备回复。

ACK 捕获本批 port/SID/bytes，**只在该批实际 parse 后**发送；若输入 UTF-8 分片暂没字符仍归属该解析事务。ACK 不等投影复制、listener、target import/render、NativeSubmission.finished 或 OS resize。reply 继续专用 captured reply 通道，不经过用户仲裁/stop input gate，也不因 lease.alive=false 丢弃 T04 drain 的 reply/ACK。parse transaction 禁止 await PTY write、view applied 或 native resize finished；legacy numeric exit 必须在此前 output 解析事务与最终 local notice 完成后向原 observer 结算。

```ts
registerView(viewId: string): ScreenViewLease;
setViewVisible(lease: ScreenViewLease, visible: boolean): void;
claimSizeOwner(lease: ScreenViewLease, reason: 'focus'): boolean;
requestViewSize(lease: ScreenViewLease, grid: Grid): GeometrySubmission;
unregisterView(lease: ScreenViewLease): void;
```

lease 含 runtimeId/viewId 与不可伪复用的内部代次 token。注册/可见/收到 resize 不自动抢 owner；只有当前可见 view 的明确 focus 入口可 claim。失去可见性/卸载撤销 owner 和旧 queued request，无 owner 保留最后 geometry，不轮询挑唯一可见 view。UI 受控 focus 要沿 T03 当前文档/叶子有效意图，旧 async 回调不得重获 owner。followers 只按权威 geometry 改自己的 term，不 fit 后反向 reflow authority；本地 viewport 的 scroll/selection/ydisp 不写回 model。

`requestViewSize` 验证有限整数、上下限、总 cells 及 lease 后，在同一事务变更 model geometry 并提交 C 的整笔 resize，返回 model watermark 和 native `queued/applied/none/unknown/superseded` 状态。模型尺寸不是 OS 成功证据，不因模型 resize 伪造 native applied；失败可见，不自动重发/回滚已解析屏幕。不能等待 OS 回执才能 parse ConPTY 初始 CPR。连续尾部 resize 的 native coalescing 由 C 唯一负责；不能越过 input，不能静默取消旧 receipt。旧 `resize(cols,rows)` 只作迁移 wrapper：已有 owner 时拒绝无 lease 调用；生产 view 全迁移后内部 bootstrap 走明确独立事务，不保留第二尺寸权威。

## 4. 有界性：必须计量模型，不能只限制 journal

现 scrollback 默认 **5000**，normalizer 范围 **100..10000**；并未约束 cols/rows 上限。包内 `BufferLine` 每 cell 三个 Uint32（12B），但应计 `_data.buffer.byteLength`，不能只计当前 slice.length；还有 `_combined` 与 `_extendedAttrs`。本地源码显示 combining 会反复 `+=`，OSC8 表/marker 可累积；OSC/DCS handler 各自 payload 上限 10,000,000 UTF-16 units，WriteBuffer 约 50M 门只是抛错兜底，不是本项目完整界限。

建议 `ScreenLimits/ScreenUsage` 暴露以下真实计数，runtime 与全 Agent 聚合均有 admission cap，数值在准入后 K03/压力样本固定：

| 面 | 计量/准入点 |
|---|---|
| geometry/model | maxCols/maxRows/maxModelCells；normal+alt 的实际分配 typed-array bytes、行/extended entry 数、全部 combining UTF-16 units（含当前 attrs/保留对象）；constructor/resize/scrollback 先预算，拒绝无穷/NaN/溢出组合 |
| links/parser | link entry/URI+OSC id units/marker 数；所有实际活动 OSC/DCS handlers 的 retained units（多 handler 重复计）、decoder remainder、parseBuffer/writeBuffer/pending raw bytes/本地提示字符；不能只数已完成链接 |
| projection | snapshot 复制峰值（源+export+编码/target import）、共享 pinned copies、journal bytes/frames/水位、link/row identity sidecar；申请前收费、释放后退费 |
| observers/read | 每 observer 引用和 in-flight bytes、observers 数、snapshot/read tokens/并发/TTL、单页 rows/bytes、pending control requests/result slots |
| native input/output | C 的全 helper/每 SID ops、reserved/staged/inflight/writer/result/outbox 与 reply 保留预算；不能用 Node.write(false) 当丢弃/重发许可 |

使用 `status:'ok'|'pressure'|'resource-limit'` 和 `reason/counters/limits/at` 可观测；view/read 超限只 resync/reject 自己。**模型超限不能修剪一个 cell、重置 parser、截断 OSC 或 ACK 未解析字节后假装完整。** 最小候选为：硬 geometry admission；小而有限的 parse chunks；每批后精确计量；soft pressure 前关新增用户输入并按 T04 captured runtime 请求 stop，保留最后可查询模型/水位和准确资源错误。容量须为已准入 native credit、在途批次、parser 最坏增长与有限 cleanup 留 reserve，不把 raw 当可重建缓存。

这仍有一个必须实测/证明的窄门：单 parse 批次造成的 combining/link/handler/临时拷贝增长上界与 cleanup reserve。解析后才测不能防止单批峰值；若在 6.0.0 集中 adapter 无法枚举/证明该界，就不能宣称全部 model bytes 有界。应先缩小 ingress chunk、在 write 前按最坏增长预留并限制 handler 注册集合；若仍不足，给 Root 精确最小引擎限额 hook/patch 缺口再决定，不能以统计 V8 heap 或静默丢 raw 代替。资源错误后有限 T04 cleanup 的 output truncated 也必须显式保留，不能暗改为“完整解析”；运行期间的 raw 无丢弃合同不降低。逻辑 payload/typed-array 计量与 V8 总 heap/RSS 实测分开报告。

## 5. SessionPort 输入、旧入口与两处整笔提交

C 唯一提供 wire/owner/队列与 receipt；A 只做 runtime fence、paste 编码与消费，不另做 op manager。候选 additive 接口：

```ts
interface SessionPort { // 原 input/reply/resize/acknowledge/end 保留
  submitInput?(sid: number, data: string | Uint8Array,
    options?: Readonly<{ signal?: AbortSignal }>): NativeInputSubmission;
  submitResize?(sid: number, cols: number, rows: number): NativeResizeSubmission;
}
// TerminalSession；handle 再绑定 readonly runtimeId，op 与 native SID 无关
submitInput(data: string | Uint8Array, options?: InputOptions): SessionInputSubmission;
submitPaste(text: string, options?: InputOptions & { appendEnter?: boolean }): SessionInputSubmission;
// NativeInputSubmission：queued Promise<queued|none|unknown>，
// finished Promise<written|none|unknown>，cancel():void；正常失败用 union，不悬空 reject。
```

`submitPaste` 在接纳时冻结 bracketedPaste，sanitize 后**一次**组装 `pasteSequence(text,mode)+(appendEnter?'\r':'')`；UTF-8 bytes 超 operation limit 则 0 effect。submit 不绕过 T04 closeInput/真实 connection。取消观察不等于取消写；仅 C 的 reserved/unclaimed 明确 none 才可说未写；written 仅代表 PTY write+flush，不代表 CLI 已执行或任务完成。代次失效、断线/响应丢失 unknown，不能自动重发。无 inputAdmission 能力的强接口明确 none/unsupported，不拿 terminalTermination 能力或 void return 冒充 queued。

原 `input()/paste():void` 可留兼容 wrapper：同步创建一次 submission并观察 queued/finished，将失败/unknown 暴露为 runtime inputDiagnostic/onChange（结构化 reason+effect+本地化 key），而非无声 return/console.warn。legacy helper 手工键盘可沿一次旧 kind2 best-effort，但只能标 unconfirmed/unknown；不能强装 queued，不拆多个旧帧。GUI 不 await；失败提示合并，不能每键弹一条 Notice。Controller.pasteInto/send 的原 boolean 仅表示找到目标/尝试本地投递，不能改称远端 receipt；Browser/素材粘贴保持**不回车**。

本票必须精确补两个调用端，不能推迟至 T08/T14：

1. `services/prompt-runner.ts:27–28`：InteractivePromptTarget 增 `submitPaste`，原两次 paste/input 改 `submitPaste(text,{appendEnter:true})`；`submitInteractivePrompt` 候选改为 `Promise<{status:"not-ready"}|{status:"queued";runtimeId:string;op:number}|{status:"none"|"unknown";runtimeId:string;reason:string}>`。Controller `typeWhenReady():534–536` 是唯一生产调用端，须精确适配此 union：只有 not-ready 显示原 quick.notReady；none/unknown 用 agent 输入错误的 t() 分类，不能误报“先登录”。因此 **Controller 的该窄边界需要补写集**；这比保留 boolean 再旁路猜失败原因更小、更可测。
2. `services/agent-runtime.ts:406–407` reuse：同一 submitPaste+appendEnter，await queued 后才沿原“已提交”业务路径；none/unknown 进入原明确失败合同，不能自动 retry。native 全文结果、cancel/timeout/context、invocation 去重不改。可沿原业务失败码并在现有 errorParams 保存 reason/effect/runtimeId/op，Session diagnostic 提供准确本地化文案；若正式落码发现原结果合同不能携带这些证据，再给 Root 精确缺口，不擅改 AutomationError/跨模块结果 schema。

## 6. 建议独占写集与先后门

| Owner | 最小生产闭包及真实测试位置 |
|---|---|
| **A Session/纯 DTO** | 现 `services/terminal/session.ts`、`sessions.ts`；新 `core/terminal/frames-screen.ts`、`services/terminal/session-screen.ts`、`session-screen-xterm.ts`；session*.test.ts 覆盖事务/stream/read/owner/limits/input，既有 sessions.e2e.test.ts 保留 T04 native 接缝；精确额外 `services/prompt-runner.ts/.test.ts`、`agent-runtime.ts/.test.ts`、`controller.ts` 的 typeWhenReady 窄边界及 `controller-native.test.ts`、`i18n.ts`；`docs/agent-workbench.md` A 唯一写。若要对 scrollback 设置提前拒绝，可在 Session admission做，不先扩 settings schema。 |
| **B visible projection** | 现 `ui/terminal/terminal-view.ts`、`terminal-presentation.ts`、`stable-terminal-fit.ts`、`terminal-scheduling.test.ts`；精确新增 `terminal-screen-xterm.ts`、`terminal-screen-xterm.dom.test.ts`；必要 `TerminalTabView.tsx`/`.dom.test.tsx` 接 lease/诊断/权威 geometry、`TerminalSearch.dom.test.tsx` 复核缓存。B 不写 Session/DTO/i18n。Search/OSC8/marker/events 私有 target 操作只集中该 adapter，不向全 UI 扩散。 |
| **C native/wire** | 按 native proposal：shared/native host/frames + codec tests；desktop/native helper/host + stream/integration tests；native session/frame/main/new outbox、data/cookies/agent_data 预分配上限及 tests；唯一 `test/fixtures/native/terminal-input-admission-v1.json`；verify-pty-helper 脚本 C 单 owner。C 不写 A Session/纯 screen DTO/B。 |
| **Root** | formal Ticket/Map/evidence、依赖/patch/lock（如证明必需）、全局脚本与 main/styles 生成；Obsidian acceptance script 选 Root 或单独明确 owner，避免 A/B/C 交叉。 |

**相对当前 Ticket 需精确补齐**：A 的 prompt-runner(.test)/agent-runtime(.test)/controller.ts/typeWhenReady 与 controller-native.test.ts/i18n；B target adapter+DOM、TerminalTabView+DOM、TerminalSearch DOM；C shared/native+desktop/native、main/outbox/data/cookies/agent_data+唯一 fixture（细目沿 native proposal）。`core/terminal/frames-screen.ts`、A session*.ts 已在原 glob 内。默认不需 WorkspaceService/SpaceService、Controller 其他业务/生命周期、job/bootstrap、Cargo/dependency 升级或 settings 持久格式更改。

先正式准入并跑 **K03**（本轮未运行，外部 issue 不是 HUHU 已证缺陷），再固定 profile/adapter shape 风险。A/C 先落各自纯真实 types+最小 fixture，由 Root 核读统一 freeze；B 等 ScreenFrame/stream/lease/state/effects 冻结后接线。A 不自行向 B/C 宣布本候选已冻结。随后红绿顺序：任意 UTF/半 CSI/OSC/DCS join；已完成 margins/charset/saved cursor 的后继输出；两 buffer/resize/reset/clear/scrollback 连续性；真 source+两 visible xterm 的 links/extended/search/selection/IME/mouse/focus/2026；慢 observer 独立 resync 与第二 Session stop；整笔 prompt+CR、no-effect/unknown/cancel、native stdin false/drain、reply 与 stop 独立；最后 finite profile 下 model/parser/clone 峰值及真实 PTY 压力。以上均是待实施验证，不是本轮通过。

## 源观察 SHA-256

以下是本轮实际回读输入；未使用 Git/index，不将静态阅读冒充产品验收。文件可能包含 Root 已冻结的前序脏改。

| 路径 | SHA-256 |
|---|---|
| `C/evidence/T-05-screen-algorithm-proposal.md` | `7c73c94c45bae6b3b2d77953539f66fe5bc133fec7f4df42bb13a2be7fc32d4d` |
| `C/evidence/T-05-native-contract-proposal.md` | `187cea36a018e6de361f2a83de68eac5051d4113fb5da40e07581a5645408770` |
| `C/ticket/05-screen-stream.md` | `0befe4d829122ff34476866765844e620e2974e85690e1aea2168b070e822952` |
| `C/spec.md` | `d204c7a0b3178a60ddeb291a8153f79cb8e3864427c5317b7660832182d12618` |
| `C/implementation-contracts.md` | `f13ca8cf0ef1185065e7c6d4e537a787f50ac813678aec428e498c0a8f03e397` |
| `src/modules/agent/services/terminal/session.ts` | `b12a8b22b0c6371523cfbca8934b2ebddcb59bd9a24525c4620a42fe257163fa` |
| `src/modules/agent/services/terminal/sessions.ts` | `421fe822d75bb0e737740aaf93374b1f22dd90d4ac23d9b9f95d7af7344e50bf` |
| `src/modules/agent/core/terminal/settings.ts` | `e043e495e9df1afc64689fab82459134c6f9baf4938456783134df78e4b4bd1c` |
| `src/modules/agent/core/terminal/frames.ts` | `be51d2bf292a253c08f97ce426cf1ff5f1b89b8d10e540d382b43840ccdbbb8f` |
| `src/modules/agent/services/prompt-runner.ts` | `588082628e0d24c33015217b9c1d056c0474b13212972e52ca2e17781bfd30dd` |
| `src/modules/agent/services/agent-runtime.ts` | `4df5489210382cc52e9276f96746f11a3757f27d9cde47acc6d58b78094a6c9c` |
| `src/modules/agent/ui/terminal/terminal-view.ts` | `1624981d8036026b02350507f376279a1af225f35c769494f7a78a2b66357356` |
| `src/modules/agent/ui/terminal/terminal-presentation.ts` | `c8b2623e10adb94535d26f83647cfb998846612fbda51c193808f47c33d0b6fc` |
| `src/modules/agent/ui/terminal/TerminalTabView.tsx` | `aeab120959e66cc22c8ce453e44bc2d57e37893d0a07fd535f632e982feb772b` |
| `src/shared/native/host.ts` | `2e39c4f4c74b4c371b59ed16b76c60759ab90e19d232f58dc72d5744e7977eeb` |
| `src/host/desktop/native/helper.ts` | `99c83f27f65ebc6203dda1f4f937f5159369cea656a31e63ba77c7beddd58167` |
| `src/host/desktop/native/host.ts` | `d1c4b479b595fd3d18efd9a642ab1e4b34ca5840ac25bb7bdde386e147c1c36b` |
| `node_modules/@xterm/headless/package.json` | `6c39530ee759998113bd8bcc306d1b725c0b1d5b0cdc04e071f6945a5f5edf1a` |
| `node_modules/@xterm/xterm/package.json` | `f5a0dde40a146d6c7a86b22daf6e5740517e5d708ec1d162197e0445431d8f4f` |
| `node_modules/@xterm/xterm/src/common/buffer/BufferLine.ts` | `e4b521b257c499f89c75d995bff9c14ae0d4fac21abece2f592e36d57be033d5` |
| `node_modules/@xterm/xterm/src/common/buffer/Buffer.ts` | `7d48cc12cf3c32b9cac1b6f6cfcee01215a1edb66e0dab48ceb3f87d9c25b422` |
| `node_modules/@xterm/xterm/src/common/buffer/AttributeData.ts` | `3dae22272066c4d816177c9461fe0e0bb1070fc3870d5bb593f19123d832d16f` |
| `node_modules/@xterm/xterm/src/common/services/OscLinkService.ts` | `559eae342ee18934af8e1e22f6f03425f229b71a0161eb6de304863f4e2ebcda` |
| `node_modules/@xterm/xterm/src/common/input/WriteBuffer.ts` | `c1c7726e5271fd37f254768a3a21323c1edc2a9bef52a55800dc20652285910f` |
| `node_modules/@xterm/xterm/src/common/parser/Constants.ts` | `41a050f183a84c0198b74274029f9017debebd8c8cade95182b8542f9b71b32f` |
| `node_modules/@xterm/xterm/src/common/parser/OscParser.ts` | `a79d19c62ef4a27df2649582165b08755ec07c5ac19be544696b98751b03e5fd` |
| `node_modules/@xterm/xterm/src/common/parser/DcsParser.ts` | `e39bda12f93d2ac4049ade0809034d6b8120ab2a1092c336fd99746121213e00` |
| `node_modules/@xterm/xterm/src/common/parser/EscapeSequenceParser.ts` | `c50c159ec6fb209a1be4f1fb4266c84865e4460d8b82f54e3d429b760386e4ef` |
| `node_modules/@xterm/xterm/src/common/InputHandler.ts` | `b03afd5d38dd708440699e81135f1735626d55ffdf24621fbd54cfbc41320925` |

| `src/modules/agent/services/controller.ts` | `1645905e8e0ccef0c75451d6a29192a7154d8938f8a78f64e6d1a25080f03709` |
| `src/modules/agent/services/prompt-runner.test.ts` | `c8b32d4c302b4bef0c5794de9a8fd9fa695d35a4280034a06eaf9ef72c773712` |
| `src/shared/automation/errors.ts` | `724e61bd5edd6ced3421ac30b7d0af05d421bd97dfbeb07fe0938ef9a2533123` |

READ-ONLY STOPPED。仅生成本 /tmp 提案；无仓库写入、无 K03/测试/构建/helper/依赖变更。
