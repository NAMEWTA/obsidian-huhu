# T-05 屏幕协议算法提案（只读）

观察日：2026-10-25。C = `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor`。本任务仅研究，不实施 T-05，不解锁 Ticket，不冻结 DTO、容量、调度频率或验收结论。T-04 正在同一工作区修复，本报告的源观察是文件摘要，不是冻结实现快照；完整清单见 `/tmp/huhu-t05-screen-algorithm-source-observation.json`。

**建议 Root 优先评估方案 C：固定 xterm 6.0.0、集中隔离一个小型状态投影适配层，发送已解析 buffer 的真实行/格 patch，同时同步输入、光标、链接与必要显示事件。** 不恢复 parser，也不把未来 raw 接在不完整 SerializeAddon 快照后面。方案 A、B 的算法都能实施，但其完整能力边界不同：A 在公开可观察状态上可精确重建，不能独自保留全部既有 xterm 功能；B 的完整原点重放在日志保留窗口内成立，日志用尽后仍须可靠的语义投影。二者不能在未覆盖这些缺口时被写成整票通过。

Root 后续明确：不用私有 parser 字段是研究中的技术偏好，不是用户 Spec 的明文禁令。这里因此补充 C；不把该偏好升格为审批或整票 blocked。用户硬边界仍是每 runtime 一个 headless 权威、raw 只进入该权威解析一次、设备回复一次、连续可重建、有界流控及保留既有终端行为；不 fork 完整引擎。

## 1. 实际读到的事实

已按 AGENTS 先读 workspace/catalog、运行指南、I 入口、dev 与许可参考，再读 T-05 Ticket、两份 preflight、Spec/implementation-contracts 的屏幕约束和 reference-notes。此次没有执行 I 的实施、验证或状态写入分支。

| 事实 | 本地来源 |
|---|---|
| `session.ts` 有一个流式 TextDecoder、一个 headless、一个 SerializeAddon；`receive` 的 raw 经 decoder 后只写该模型一次，ACK 放在 write callback；现 fanout 在 callback 前 | `src/modules/agent/services/terminal/session.ts:125,292` |
| subscribe 先登记，再用空 write 屏障发 serialize snapshot；backlog 是无显式上限的 string[]；没有水位 | 同文件 `:390` |
| resize 直接改 model，clear 是 `model.clear()` 加展示 `CSI 3J`，reset 走本地 RIS；这些路径尚未纳入统一屏幕事务 | 同文件 `:373,455` |
| presentation 已有串行 write、generation 失效、隐藏退订和超限重取；现上限是 delta 字符数，snapshot/action 不在其中 | `terminal-presentation.ts` |
| 每个 view 的 fit 仍直接改 term/session geometry 并 refresh；键盘/IME 的 onData/onBinary 保留，paste 走 session.paste，Kitty/win32 用 session.keyboard | `terminal-view.ts:136,169,241`、`core/terminal/keyboard.ts` |
| headless / browser xterm 为 6.0.0，SerializeAddon 为 **0.14.0**，三者包内 commit 均指向 `f447274f430fd22513f6adbf9862d19524471c04` | 三份 `node_modules/@xterm/*/package.json` |
| write callback 只承诺本批 data 被 parser 处理；`onWriteParsed` 甚至可能在仍有其他 writes pending 时发生 | headless typings `:733,835`；`WriteBuffer.ts:221` |
| OSC/DCS 的公共 hook 只在成功完成后调用，公开 API 没有 parser-state snapshot/import | headless typings `:1245–1292` |
| SerializeAddon 输出两种 buffer 的行/格、当前 cursor style 的 SGR 和公开 modes 子集；没有导出未完成 escape、tabs、saved cursor、charset、scroll margins、完整 extended attrs/OSC8 link table | `addon-serialize/src/SerializeAddon.ts:428–588` |
| 公开 IBufferCell 有 chars/width、fg/bg 与基本样式；没有 underline color/style、hyperlink ID/URI。内部 CellData/AttributeData 有这些内容 | headless typings `:1079–1179`；`CellData.ts`、`AttributeData.ts`、`Types.ts` |
| 公开 IModes 包含 application cursor/keypad、paste、mouse tracking、focus 等，但没有 mouse encoding；内部 CoreMouseService 公开于 core 的 getter 可读 DEFAULT/SGR/SGR_PIXELS | headless typings `:1335`；`CoreMouseService.ts` |
| 6.0.0 的 1005/1015 已不支持；不可将它们列成需要恢复的现有有效模式。1006/1016 有效 | `InputHandler.ts:1941,2166` |
| SearchAddon 依赖 onWriteParsed/onResize；SearchLineCache 还依赖 onLineFeed。直接改 cells 后只 refresh 不能保证搜索缓存正确 | `addon-search/src/{SearchAddon,SearchLineCache}.ts` |

以上是静态源事实。没有运行反例、测试或真实 renderer；行号只是本次观察的导航，SHA 才是来源标识。

### 1.1 两种不同的不完整状态

1. **未完成解析状态**：例如 authority 已吃下 `ESC [`，此时 snapshot 没有这段 pending CSI。新 view 从干净 parser 恢复 snapshot 后收到 `31mX`，不等价于 authority 接续该 CSI。OSC/DCS 的部分 payload 以及 decoder 未完成 UTF-8 也不能靠一个 contentSequence 恢复。这个例子是静态反例推演，未运行。
2. **已完成但未序列化的持久 VT 状态**：即使找到 ground，之前的 DECSTBM、保存光标、tab stops、DEC charset 等也会影响以后的 raw。仅 SerializeAddon + ground-safe cut 不足。例如先设小 scroll region，加入后再 LF；先 DECSC，加入后 DECRC；先选择线框字符集，加入后输出 ASCII。没有导出这些态，不能证明接续等价。

“最后一个 ESC 起的尾巴”也不是可靠 replay prefix：CSI 内允许执行 LF/CR 等 C0，若 snapshot 已包含它们的效果再重放完整 prefix 会重复；OSC/DCS 中 C0 的处理又不同，ST/CAN/SUB/C1/ESC 的转移也不同。要把任意未完成 tail 规约成可恢复态，需要精确语法状态；即使做到了，第二类持久态仍在。不能以私写的半套 tokenizer 冒充证明。

### 1.2 纯公共 snapshot + 有界 raw suffix 的能力上限

若两个 authority 内部态有相同公共快照，但下一相同 raw 输入产生不同屏幕，则该快照不是 raw continuation 的充分状态。这正是上述 margins/charset/saved cursor 的情形。另一方面，任意未闭合 OSC/DCS 不能保证在有限等待或固定 replay 窗口内出现新安全起点。保留完整 raw 直到自然 reset 会随 runtime 年龄增长；只等安全点可能永不完成 attach。xterm 自己对特定 hook payload 的 10 MB 限制也不等于“所有解析状态都可用小尾巴恢复”。

因此在当前公开 API 下，没有依据承诺同时做到：任意长运行、任意加入点、全部已有 VT 行为、固定 raw 内存，并永远仅用 SerializeAddon+raw 重建。这是所选编码的技术限制，**不是** T-05 必须 blocked 的产品结论。

## 2. 三案共同遵守的事务与资源顺序

以下只有语义，不冻结接口名：

1. 每个 runtime 的 output、模型 resize、reset、clear、scrollback 设置进同一模型事务顺序。只允许一个 write 在当前事务内提交；取投影时立即复制 primitives，不把会继续变化的 BufferLine/CellData 引用作为历史 snapshot。空 write 可以排队，但不能当作 ground 证明。
2. 解析 callback 确认该事务已处理，推进本 runtime 的模型水位。没有可见变化的事务也可产生空 patch/metadata commit；合并多个事务时明确覆盖的 from/to 区间。连续指 `apply(P[from,to], state[from]) = state[to]`，不能无标记跨过缺口。
3. native ACK 只依赖权威 parse，不依赖 observer write callback；parser reply 保留单独通道。屏幕队列不得 await 用户 PTY write、OS resize 完成或某个 view 的显示速度。ConPTY 初始 CPR 等路径可能同时依赖 parse/reply，不能造等待环。
4. bootstrap 在同一顺序复制状态 S_N 并安装 N 后订阅；随后只发从 N 连续的帧。snapshot 分块必须属于同一 N，完成前不让后续 patch 修改半份状态；一份 snapshot 有总量/TTL/并发上限，不能为每个读取者长期钉住整屏副本。
5. journal 以总 bytes、frames、保留水位计数；observer 只有有界引用队列、一个正在渲染的任务和一个 resync 标志。超限只断该 observer 的可重建展示，淘汰其积压，允许重新取当前 S_M；不丢活跃 raw、不等它清空后才 stop。listener 抛错只释放自身。
6. snapshot、patch、输入、Node stdin、Rust outbox 都分别计量。headless scrollback 行数有限不等于 bytes 有限：列数、单 cell combining string、hyperlink URI/表、单查询和复制中峰值均要计入。权威模型在恶意无限 combining 数据下是否有严格字节界，现代码/公开 API 并未证明；不可仅以行数宣称解决。具体上限从压力样本固定，本报告不设数值。
7. 每 view 的 owner lease 绑定 runtime。owner 请求 geometry 变化在模型事务中生效，followers 接同一 geometry；无可见 owner 保留最后 grid。PTY resize 若只有准入、没有成功回执，不能把本地模型 geometry 标成“OS 已确认”；Root 与 native owner 在实施前统一 requested/applied/unknown 语义。不得等待 OS 回执才继续 parse。
8. 断流/旧 runtime/cursor 过期明确要求 resync。重建只重放显示，不重发用户输入、spawn、stop 或设备回复。T-04 停止后的显式 output truncation 保留，不改写成完整屏幕或 Provider 完整答案。

## 3. 方案 A：公开行文档 + 真正的 splice/cell/metadata delta

### 算法

1. 每个选定的模型提交点，读取公开 normal/alternate buffer 的 geometry、baseY、cursor、各行 isWrapped、各 cell chars/width/fg/bg/基本样式以及 IModes，组成一个有界、不可变行文档。它是已解析数据的投影，不是另一个 VT parser。
2. 初始 snapshot 传整份指定保留范围的文档。此后的 delta 只携变更：行 splice/trim/append、变更 cell runs、active-buffer/geometry/cursor/input-mode metadata。纯光标移动只有 metadata；进度条只改其 cells；正常 append 是尾部 patch。不得每次把整屏都塞入 replace 字段。
3. 最简单正确的编码器可扫描整个有界文档，用逐 cell 精确相等产生 diff。行 hash 只能加速定位，命中后仍核实 equality，不能以 hash 碰撞风险冒充数学等价。滚动可用显式 trim+append，或在旧新数组中找可证相等的移位行块；未找到就发真实受影响行段。
4. consumer 先在自己的无 VT 文档应用 patch，再提交渲染。geometry、buffer switch、reset/clear 都是同一序列中的结构变更。任意半截 ANSI/UTF-8 留在 authority，下一次完成后自然反映为后续 patch；consumer 无需知道它们。

### 用既有 xterm 作 display 的具体路径

可先采用规范化 ANSI materializer，而不是写新 DOM 终端：公开 term API 维持 input/IME/selection/search/link addon。普通尾部更新从 viewport 内首个 dirty row 定位、清理必要区域、写出已解析的对应完整 wrap-connected 行段；普通 viewport 修改可在受影响区域用规范化行重写。绘制前将 display parser 置于已知输出环境（绝对 origin、replace、正常 scroll margins、预期 charset 等），画完恢复 cursor 与输入模式。

**这不是已证明的万能导入器**：公开 API 不能直接设任意历史行/首行 wrapped flag，也不能修改 scrollback 中部。resize/reflow、跨历史 wrap 修改、复杂结构变更需要一次明确的完整 replacement。replacement 是结构变化/失同步 fallback，常态 patch 必须真实增量；若每次 LF 都退回完整 replacement，则本方案没有完成其常态目标。首次实施必须先在 production xterm 的 append、scroll、progress、wrap 和 alt 样本上证明这些分支，不用单纯 DTO 单测代替。

### 输入和既有功能的边界

- application cursor/keypad、bracketedPaste、sendFocus、mouseTracking 从 IModes 提取，向 view 发送规范化模式设置，不把绘制所需 origin/insert 等输出状态误当输入需求。Kitty/win32 继续 session.keyboard；键盘未被 encodeKey 接管的分支仍交 xterm；IME 仍走 textarea/onData，paste 仍先由 session.paste 生成 sanitized/bracketed 输入。
- mouse **encoding** 不在 IModes。可以从 runtime 创建起以公开 CSI hooks 观察明确支持的 1006/1016 与 reset，做一个有限状态 sidecar；这是观测已完成模式命令，不是解析 raw。缺失历史 sidecar 时不能猜 DEFAULT。1005/1015 在本版本无效。
- 现有 URL 文本链接、文件引用 provider 可以继续在准确的显示 buffer 上工作；OSC8 每 cell link association、underline style/color 不能从公开 cells 完整导出。仅记录“当前 OSC8 URI”还不能知道后来 cursor/erase/insert/reflow 如何搬动每个带链接 cell。补这一点将接近自己维护第二套 VT 状态，不能建议这样做。
- scroll/selection 必须保存 view 本地锚点，patch 未触及的行保持身份；裁剪的选择才失效。不能在每帧 afterReplay 都 scrollToBottom。原 prompt jump 的行号也须映射到该显示范围。公开 select/getSelectionPosition 可以恢复普通选择，但列选择、拖选进行中和复杂 reflow 仍需 production 验证。

**可证明**：在定义的公开投影域，精确 diff 的归纳重建成立，任意分片 join 不依赖 parser ground。

**不能声称**：公开投影等于全部 xterm 呈现/交互状态；ANSI materializer 已保留全部 wrapped/history/selection；缺失 OSC8/扩展样式不会影响用户。故 A 可作为正确性核心和协议基线，但单独采用它不能据此验收“全部既有功能保留”。

**代价**：保守全扫描为 O(保留行数×cols) / 导出批次；immutable old/new/patch 的峰值要计入；只保留变更行比全量 serialize/reset 减少消费端重绘，但实际 CPU 未测量。

## 4. 方案 B：完整原点日志快路 + 明确的语义 fallback

### 算法

1. 只把**构造时的已知空 terminal**或用户明确请求、作为独立模型事务完成的 RIS 当完整 raw replay anchor。记录同样的 constructor options、geometry 及后续有序 events：decoded strings、resize、clear、scrollback 设置等。日志有全局硬容量。
2. 加入者的 bootstrap 是 `anchor + events through N`，不是“当前 SerializeAddon 字符串后接尾巴”。它可同时带当前只读 snapshot 供 read 使用，但 renderer 必须从原点完整重放这一窗口。这是一个 replay 编码的 snapshot envelope。
3. renderer 在同一初始环境依次处理保留事件到 N，再接 N 后 raw delta。若 N 位于 CSI/OSC/DCS 中间，完整日志里已经有起始前缀，parser 自然保留相同中间态；UTF-8 使用 authority 已完成 decoder 的 string 片段，不能另把未完成 byte decode 成 replacement char。
4. 所有原始设备查询只由 authority 回复；display 不向 native 转发解析引出的 device response。现有 swallowQueries 清单需要双真实 renderer 验证，不能为容易通过禁用整个 onData/onBinary。raw 的 authority 解析仍一次；显示 xterm 仅做既有展示重放，不再建立第二个 headless。
5. 在日志容量将满之前，发送一个有序 mode-switch，从当前语义 snapshot 转入 A（或 C）的 patch 流，然后才能淘汰旧日志。已有 raw view 也可继续自己的连续 raw 流，但其一旦失同步，只能按当前可用的正确 bootstrap 路径重建。不能无限为它保留旧原点。
6. 不向程序注入 RIS 换取压缩点；应用在同一 raw chunk 中发 RIS 后又有数据，公开 parser hook 不给原始 offset，不能仅因观察到一次 RIS 就把整个 callback 末尾当空状态。只使用确知的独立操作边界，或另行证明完整事件切分。

**可证明**：原点窗口内，在 options/事件/顺序相同且无显示设备回复回灌时，stock xterm 保留其自身 charset、margins、saved cursor、OSC8、mouse 等行为；加入点可以任意分片，不需要导出 parser。它复用成熟引擎，重放不是重解释。

**不能声称**：这是无限运行的完整解决方案。没有 A/C 或另一可靠状态投影，日志满后只能拒绝新加入或永久阻塞输出，两者都不能作为完整 T-05 交付。使用 A fallback 时仍继承 A 的功能缺口；使用 C 则成为 C 的可选快速路径。自然 reset 不是可用性的保证。

**代价**：附加日志上限、join 时 O(窗口 raw) CPU、数据双份（权威 buffer+日志）、快慢两种 display 状态、mode-switch 和超限验证更复杂。对高输出且较少 attach 的旧路径较友好；对长寿命 shell/TUI 不能仅靠它省掉语义重建工作。

## 5. 方案 C：版本固定的最小 xterm 状态投影适配（推荐评估）

### 5.1 为什么不必复制完整 parser

将 A 的投影扩成**所有 display/input 所需的已解析状态**，并在 visible xterm 导入这些 state patches。authority parser/decoder 保留原对象，未来 raw 永不交给已导入 state 的 display parser。于是 charset、scroll margins、saved cursor、pending CSI/OSC/DCS、UTF-32 join state、DCS handler 的累积 payload **不需要传输或恢复**；它们只在 authority 中决定下一个已解析 patch。

这是一层已有 xterm 对象的导出/投影适配，不实现 VT 命令解释、Unicode width、reflow 或鼠标协议编码；后者仍由 source/headless 与 target/browser 的 stock 实现负责。与 A 不同，C 可以从内部已解析 cells 得到精确 wrapped/extended/link 状态，也能对目标 buffer 作真实局部更新，避免每帧 synthetic repaint。

若反过来要求“导入后继续让 display 消费任意 raw”，则除完整 buffer 外还需 parser state/collect/params、OSC/DCS 累积数据及 handler state、decoder/join state、当前/erase attrs、charset service、saved cursor/tabs/margins 等；回调闭包与活动 async handler 栈不是普通 JSON。SerializeAddon 加几个字段并不能解决，且耦合面远大于下面的 state projection；不推荐这条恢复路线。

### 5.2 集中读取的最小状态面

所有 `_core`/内部类型访问集中一个有明确 6.0.0 shape guard 的适配边界；业务层/UI 其他文件只见自有 primitives DTO，不能扩散 any/private 访问。

| 来源 | 导出什么 | 为什么需要 |
|---|---|---|
| `core.buffers.{normal,alt,active}`、BufferLine.loadCell、CellData | 行 length/isWrapped；cell content/fg/bg/combinedData；extended 的有效 underline style/color/variant 与 link reference；buffer x/y/ybase/length，active type | 保留宽字符/组合字符、空格属性、软换行、两屏幕、准确格子和光标；不能把源 BufferLine/ExtendedAttrs 实例直接共享给 target |
| `core.coreService` | input modes、decPrivateModes 的输入/呈现相关项、isCursorHidden、isCursorInitialized | 普通键盘、focus、synchronized output 与光标显示；公开 IModes 可读部分优先公开读 |
| `core.coreMouseService.activeProtocol/activeEncoding` | NONE/X10/VT200/DRAG/ANY 与 DEFAULT/SGR/SGR_PIXELS | 让目标仍使用 stock mouse encoding/onBinary/onData，保留像素模式；不自行写鼠标编码器 |
| `core._oscLinkService.getLinkData(id)` | 每个仍被保留 cell 引用的 URI、可选 OSC id、局部稳定 link key | 不能把 authority 的整数 ID 直接当作目标已注册 link；正常/备用 buffer 的引用与释放须有界 |
| `core._inputHandler.onColor`，必要的已解析 cursor/bell/a11y 事件 | SET/RESTORE 颜色状态和有限显示事件；REPORT 不转发成 view 的查询 | headless 没有 browser themeService，palette 变化不能只从当前 cell palette index 反推；需要从 runtime 创建就保存有界 sidecar。现 Session 自定义颜色 handlers 已消费的命令保持当前语义 |
| `core.coreService.decPrivateModes.cursorStyle/cursorBlink`，view 设置 | 应用覆盖与本地字体/主题/光标偏好的优先级 | 不能用 headless 默认 options 覆盖用户现有 view 设置；应用明确设置的 cursor override 才跟随 runtime |

buffer 的 source viewportY 不应覆盖每个 view 的本地滚动位置。scrollTop/scrollBottom、saved cursor、tabs 等可为诊断导出，但只要不接未来 raw 就不是 display continuation 的必需恢复态。

`ExtendedAttrs.ext` 在 urlId 非零时会提供链接派生的下划线样式；若采用“有效呈现 DTO”导出可以如此定义，若要求内部位值完全相同，还要区分底层 `_ext` 与派生 ext。不得混用两种 equality。这里不冻结 wire 位布局。

### 5.3 target 导入与刷新顺序

1. 校验版本/shape、runtime、from 水位和整帧容量。只在自身 display 事务串行执行；不排新 raw write。已有 presentation 中正在处理的旧写须结束或销毁该 presentation，再换代，不能在 pending parser write 上直接覆盖 cells。
2. 用公开 `term.resize` 设置同一权威 geometry。它可能 reflow target 旧数据，所以必须在导入 source 的最终 rows 之前；import 后不能再让 follower 独立 fit/reflow。K-03 在任何依赖适配前仍需首步真实复现。
3. 处理 buffer activation，再应用 source buffer rows/metadata。`BufferSet.activateNormalBuffer()` 会复制 alt cursor 并清空 alt；`activateAltBuffer()` 会填行/复制 cursor，故不能先导入 alt 再随意切回 normal。必须按源此次切换的真实顺序处理，并在其副作用后恢复本帧 rows/cursor；仅换 `_activeBuffer` 指针会漏 public buffer change、selection/search 等通知。
4. 用目标自己的 `getBlankLine`/`getNullCell`/clone 与 `setCell` 构造新行；不 deep-import 包未导出的类，不共享 authority 行实例。对已有行执行真实 cell patch；对结构执行 `CircularList.splice/trimStart/push` 等已有操作，保证 insert/delete/trim 事件与 marker 生命周期。直接替换 `_array` 会绕过这些事件，不能采用。
5. 重建 OSC8 映射。目标 `registerLink` 的 marker 绑定**当时 active buffer 的 ybase+y**；`addLineToLink` 同样用 active buffer。必须按正确 buffer/绝对行注册并重映射 cell link ID；inactive normal 在 active alt 下更新等情况需要集中适配，不能假设一个 URI 注册一次就覆盖两种 buffer。可选择小型 buffer-aware link helper；此处是明确未验证的窄缝，不跳过。
6. 同步 input/presentation modes、cursor flags、palette 与本地 view 状态。输入模式可通过无查询的规范化 mode commands 让 stock xterm 触发正确 mouse/focus wiring，也可在适配边界调用相同服务 setter。禁止把 parser device REPORT 事件重播给 view。sendFocus、mouse enable classes/selection disable、cursor blink 等不能仅赋字段而漏掉事件。
7. 恢复各 view 的滚动/选择锚点，更新 scrollbar/viewport、cursor render 和 IME textarea 位置，再刷新 dirty viewport。源码中 cursor move 还调用 `_syncTextArea`；`term.refresh` 自身没有承诺这些副作用。需要集中 bridge source 相应 cursor/scroll/linefeed/a11y 事件，或通过已验证的内部方法完成等价通知。
8. 通知 SearchAddon/缓存/装饰。空 `term.write('')` 可触发既有 onWriteParsed 路径，但 **不能仅凭此认定 SearchLineCache 已失效**，其还按 onLineFeed 等事件清缓存；结构变更与 cursor events 必须测到真正的搜索结果。`onBufferChange`、选择锚点、链接 hover cache/WebGL atlas/屏幕阅读事件也在同一适配闭包。
9. `2026 synchronizedOutput` 要保留 mode edge 与 stock RenderService 的 timeout 行为。该 RenderService 在超时时可把目标同步位复位；若每次 patch 机械复制 authority 的 true，会不断重启/延后显示策略。应复用已解析模式 edge 或明确等价的一次 flush 策略，不能只把一个 bool 每帧赋过去。
10. 只在全部 rows/metadata/link 更新完毕后提交 to 水位并使该 frame 可见。容量不足/shape 不匹配/旧水位，只让该 view 退出并明确 resync/unsupported；不丢 authority raw、不重放输入、不静默回退到不安全 snapshot+raw。

这给出具体触点与恢复顺序，但不是已跑过的实现。特别是 buffer-aware link marker、selection/search/IME/event bridge、synchronized-output 的闭包必须以 production xterm 证据验证；不得因 cells equality 已过就宣布这些功能保留。

### 5.4 维护、许可与最小范围

- 锁定 `@xterm/headless=6.0.0`、`@xterm/xterm=6.0.0`、SerializeAddon0.14.0 与相同 commit；依赖升级必须显式重审 adapter shape、字段/事件语义及回归，不用 best-effort 猜字段继续运行。
- 首选项目自有的集中适配 addon（实现 ITerminalAddon/内部兼容层），不改 node_modules、不 fork xterm。生产 bundle 只携小层读写适配，解析器仍是原依赖。可向上游提出公开 screen-state projection API，但当前不能把未存在 API 当可用。
- 暂无证据证明**必须** patch 依赖。若项目本地适配因缺少正确通知/marker API 无法安全闭合，最窄候选为：`OscLinkService.ts` 的 buffer-aware link registration；`CoreTerminal/CoreBrowserTerminal` 的原子 state-patch 完成通知（cursor/scroll/linefeed/writeParsed/viewport）；必要 `BufferSet` 的 side-effect-aware activation/import helper。不修改 parser、InputHandler VT dispatch、Unicode 或 BufferReflow 算法。目标源码与发布 bundle/typings 的对应补丁、pnpm patchedDependencies/lock/patch 文件、许可/通知都须由 Root 先正式列入写集后实施。本轮不修改这些材料。
- 所有参考仍是现有 R-04 的 MIT xterm 固定提交。本轮读了包内 MIT LICENSE 和有 MIT header 的具体实现，没有复制外部代码。若以后改编其代码，按 dev/licensing 记录文件路径/完整 commit/版权，在 NOTICE、docs/third-party 与生成 notices 中保存适用声明；不能以原依赖已经 MIT 为由省略新增改编归属。
- C 的新项目源路径仅供 Root 定位：例如 `services/terminal/session-screen-xterm.ts` 与 `ui/terminal/terminal-screen-xterm.ts` 及对应测试。前者可能落现有 session*.ts 通配，后者不在原票明确写集。这里只列需要决定的窄缝，不授权创建，不扩大到 manager/store/SpaceService。

### 5.5 C 的证明边界与成本

**可论证**：authority 的 pending parser 状态不必被克隆；source 的当前完整已解析 display/input 状态若被无损导出，target 对相同状态 patch 的归纳重建与输入模式等价可以分开验证；设备查询不进入 target，天然不因多观察者重复设备回复。正常 delta 是局部 buffer edits，没有“每帧 reset+full snapshot”。

**仍未知**：上述内部 API 在发布包中的稳定 shape、所有事件副作用能否在小型 adapter 中完整闭合、复杂 selection/marker/OSC8/IME/屏幕阅读/WebGL 的 production 行为与真实 CPU/内存。固定版本降低变化面，不自动证明正确。

初版仍可完整扫描有界 buffer 比较；后续可在同一集中适配里利用已存在的 dirty row/line events 优化，但不要先把私有 dirty tracker 当真实完整变更日志（resize/trim/inactive buffer 也会变化）。直接 patch 减少重复 ANSI parse 与全量 reset，可保留目标 scrollback/selection；增加内部兼容层维护与事件验收成本。CPU/scroll/selection 的优劣必须由样本测量，不能静态承诺更快。

## 6. 决策建议与后续实际验证顺序

| 路线 | 任意分片 join | 长期有界 | 全部既有功能 | 建议用途 |
|---|---|---|---|---|
| A 公开语义行 patch | 公开投影域成立 | 协议可设硬限；authority 字节界仍待证明 | OSC8/扩展 attrs/复杂历史 materializer 有公开 API 缺口 | DTO/差分核心；不能单独冒充完整保真 |
| B 完整原点日志 | 日志窗口内成立 | 必须转 A/C 或明确不可用 | 窗口内最大程度复用 raw xterm；fallback 能力另算 | 可选短期快路；不是长期 bootstrap 主方案 |
| C 固定版本完整 state projection | 无需 parser 恢复，可论证 | 协议/投影/sidecar 可有界；authority/transport仍单独验 | 能覆盖已定位的缺口；production 事件闭包待实测 | 推荐 Root 准入时优先验证的小型适配路线 |

本报告不建议以削减鼠标、链接、键盘、光标、选择或滚动换取 A 的表面通过。若 C 的最小兼容边界实测过大，应由 Root 根据证据收敛实现与票据写集；不把当前研究偏好转成用户审批问题。

准入后建议保持 Ticket 原顺序：

1. **第一步仍是 K-03**：真实锁定依赖上复现 scrollback + rows 增长，记录复现/不复现；本任务没有代跑，也不预先决定升级。
2. 先建立失败接缝：每 byte UTF-8；CSI/OSC/DCS 的每个分割点 join；CSI 内已执行 C0；超长/未闭合字符串；CAN/SUB/ST；已完成 scroll margins/saved cursor/tab/charset 后 join；alternate/reset/clear/resize 的并发顺序。比较完整 source authority 与新 observer 文档/production xterm 的 cells、width、wrapped、cursor、两 buffer 和必要 modes，不能只比较 plain text。
3. 两个真实 TerminalView，不同速度/尺寸；在 join、mode change、resync 前后实际键盘、IME、paste、application cursor/keypad、Kitty/win32、mouse DEFAULT/SGR/SGR_PIXELS、focus、cursor style/visibility、OSC8/文本URL/文件链接、搜索、选择、prompt jump、用户滚动与2026。保留 native query reply 计数为一，用户恰好键入相同 bytes 不得被错误过滤。
4. 压力测量输出 raw、authority pending、投影复制、journal、snapshot/read、每 observer、Node/Rust 队列的单位/峰值；慢 observer 超限独立 resync；同时第二 runtime stop/resize 完成；停止截断保持 T-04 原证据。
5. 三个平台/更多平台只能按真实可用证据报告；真实 Obsidian E2E 仍按 Spec §11 交用户，本研究没有替代宿主操作/截图。

## 7. 来源与未执行项

外部活动/许可继续复用 `C/reference-notes.md` 与 `C/evidence/reference-sources.json`：R-03 tmux，固定 `7f2a35ad3321f9ba57a1062ca73b1f3ff26aca53`，ISC/逐文件；R-04 xterm，固定 `f447274f430fd22513f6adbf9862d19524471c04`，MIT，现有记录的 2026-10-13 维护 commit `991857a1b1cacf06f9531ba74a6e927a7a6398bb` 满足两年窗口。官方 Flow Control 与 Control Mode 的机制证据、K-03/K-04 的状态沿用现存工件；没有伪造重新联网日期，也没有把外部 Issue 当本地复现。

此次新增的源码核对只来自已安装的同一 MIT xterm 包，不引入新项目、依赖或外部代码；没有另行联网引用活动/许可事实。source observation JSON 保留这些复用证据的路径、SHA 与既有来源 URL。本报告的所有性能/正确性判断均标为静态论证或待验证，没有测试通过声明。

**未执行**：K-03、Vitest/其他测试、lint/build、helper/PTY/Provider、cargo/native build、宿主 UI/E2E、生成物、Git commit/push、正式材料/状态/锁写入、API/阈值冻结。唯一写入为本报告与 `/tmp` observation JSON。

**READ-ONLY SOURCE STOPPED。**
