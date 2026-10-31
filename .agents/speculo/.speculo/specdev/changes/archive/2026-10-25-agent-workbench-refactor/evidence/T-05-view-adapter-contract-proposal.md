# T-05 Route C：visible xterm 适配窄合同提案

2026-10-25，只读；补充 `/tmp/huhu-t05-screen-algorithm-proposal.md`。T-04 仍复审、T-05 未准入。以下方法名与 DTO 字段都是候选语义，不冻结 API/阈值；本轮未改仓库、未运行 K03/测试/build/helper/cargo。

建议 B 只新增一个生产适配文件：`src/modules/agent/ui/terminal/terminal-screen-xterm.ts`，集中所有 xterm 私有访问。`TerminalView` 保留真实 xterm、textarea、现有键盘/IME/paste/URL/文件链接/WebGL；`TerminalPresentation` 只负责帧顺序/容量/可见性；适配器独占目标 buffer 写入、链接注册与提交事件。raw 永不进入这个已投影的 display parser；不复制 parser，不每帧 reset/full snapshot。

## 1. 对 A DTO 的最小语义需求与 B 的窄入口

适配器候选仅三个入口：`installSnapshot(snapshot)`、`applyDelta(delta)`、`dispose()`。创建时接收真实 Terminal、SearchAddon；返回提交水位或明确的断序/不支持错误，不暴露 `_core` 给其他代码。snapshot 只用于首次加入/明确 resync；正常 delta 是真实 cell/row edits。

A 候选帧至少要提供：runtime/水位、权威 geometry、active buffer、normal/alt 的最终 cursor/base/行内容与 extended attrs、link dictionary，以及**可靠的结构语义**（真实 trim/append/activate/reflow，或必须 replacement 的明确标记）。不能从 LCP/LCS 推断 marker 应当怎样迁移；内容恰好相等不证明同一历史行。普通 cell overwrite 不能伪装为删行再插行。

输入模式与显示事件分开：application cursor/keypad、paste、mouse protocol/encoding、focus、光标 flags/应用覆盖；live focus-report request、2026 h/l 命令效应、a11y/bell 等须有可去重身份。snapshot 保存当前状态与最后 sync 命令标识，不重放历史 focus/a11y/bell。已与 A（`prepare_t03`）交换这些语义，双方未冻结命名。

应用顺序：检查 from/runtime/容量 → 暂存本地 scroll/selection 状态 → 必要 `term.resize` → buffer activation 的真实副作用 → row/cell/结构 patch → 链接/模式/appearance → 本地 viewport/selection → 事件桥与 dirty refresh → 提交 to 水位。同步提交内不能 await、不能调用用户 listener；出错撤销该 view 的消费并要求 resync，不能接着应用不连续 delta。

## 2. 双 buffer 的 OSC8：无需默认 patch 依赖的具体候选

### 2.1 实际路径与限制

从 `term as InternalTerminal` 进入 `._core`：

- `core.buffers.normal / alt / active`；实际 `BufferSet` 有 `_activeBuffer`。
- `core._oscLinkService.registerLink(data)`、`addLineToLink(id, absoluteRow)`、`getLinkData(id)`。
- `buffer.addMarker(absoluteRow)`、`buffer.markers`；marker 的 `dispose()` 自动调用 service 清理回调。

`registerLink` 取 `this._bufferService.buffer`，初始 marker 固定在该 buffer 的 `ybase+y`；`addLineToLink` 也隐式使用 active buffer，并且只以行号去重。**把 inactive normal 的 link 在 active alt 时注册，会把 marker 挂错 buffer；同一个 link ID 在两 buffer 的相同行号还会错误去重。** 不可照常调用一次就算完成。

### 2.2 本地集中适配实现步骤

候选使用一个极窄、同步、try/finally 的 `withBufferLinkContext(buffer, absoluteRow, fn)`：

1. 保存 `BufferSet._activeBuffer` 与该 buffer 的 `ybase/y`；验证目标行存在。
2. **只在此次调用期间**将 `_activeBuffer` 置为指定 buffer，`ybase=0,y=absoluteRow`；调用现有 `registerLink/addLineToLink`；finally 完整恢复。期间不发 activation/cursor/scroll 事件、不刷新、不 await。原实现的这些 registry 方法不发外部事件；此假设要列入固定版本 shape/行为验证。
3. 目标 link key 按 `(runtime/投影代次, bufferType, sourceLinkKey)` 分开。向 service 使用适配器生成的局部 `id`，保留原 URI；原 OSC id 另外保存在自有字典中。这样 normal/alt 同 URI、同源 ID、同绝对行也不共用 registry entry。不同 buffer 的 hover 本就不会同时发生，不削减同一 buffer 的链接分组。
4. `registerLink` 前后记录该 buffer 新增的 marker 对象，只拥有自己创建的 marker。后续 `addLineToLink` 同样收集新增 marker；一行只注册一次。用真实 CircularList insert/delete/trim 事件移动/释放 marker；不要直接换 `_array`，也不要把源 marker 实例共享给目标。
5. 每次受影响行 patch 后更新该行的 link 引用集。某 marker 对应行已无该 link 时，仅 dispose **适配器自己**的 marker；service 的既有 `_removeMarkerFromLink` 在最后一个 marker 消失时清理两张 map。绝不 `clearAllMarkers()`，否则会删掉 SearchAddon/其他装饰的 marker。
6. 缓存 target ID 前先 `getLinkData(id)` 验证仍存活；trim/alt clear 已可能使它失效。snapshot/resync 时 dispose 旧投影所拥有的全部 link markers，再按当前两 buffer 的实际引用建立映射。dispose adapter 同理。
7. 每个 cell 的 extended.urlId 改写成该 buffer 的 target ID；保留有效 underline 属性。`sourceId -> URI` 缺失时显式报不完整投影，不能猜 URI 或静默变成普通文本。

这是**待红绿证明的可实施窄适配**，不是已执行结果。它只临时改变链接服务查找上下文，不用 `activateNormalBuffer/activateAltBuffer` 来回注册；后者会清空 alt/复制 cursor 并发送真实切换通知。真正的 buffer 切换只按帧执行一次，先执行其副作用，再导入该帧最终状态。

若 Root 不接受临时 private context，或发布包不满足此同步假设，明确缺口就是现 service 方法没有 `(buffer, absoluteRow)` 参数。最窄依赖扩展候选是 `OscLinkService.registerLinkForBuffer(data, buffer, row)` / 对应 addLine，并将去重域包含 buffer；不是改 parser 或搬整个 engine。当前**未证明必须 patch**，不预设 patch/新依赖。

## 3. 单适配器事件桥：实际访问点与调用时机

只在一整帧 rows/metadata 已完成后通知；下面 private 路径全部锁在适配器中并 shape guard。6.0.0 / search0.16.0 同一固定 commit。

| 功能 | 最小实际路径 / 顺序 | 避免的错误 |
|---|---|---|
| 搜索 line cache | 有真实内容/结构变化时，先 `search._lineCache.value?._destroyLinesCache()`；这是当前私有方法，清 cache/TTL/其事件订阅 | 不能仅 fire onWriteParsed，它只调度 matches，不保证行 cache 已毁；不能伪造 LF |
| 搜索匹配与现有 onWriteParsed 消费者 | 完整 commit 后 `core._onWriteParsed.fire()` 一次；现 SearchAddon 已监听并走自己的 `_updateMatches()` / debounce | 不重建 SearchAddon，不每帧清查询/选择/装饰；不需要空 write 排 display parser |
| 光标、IME textarea | cursor/viewport/光标所在格宽变化后 `core._onCursorMove.fire()`；现监听器调用 `_renderService.handleCursorMove()` 与 `_syncTextArea()` | 不手写 textarea CSS；`_syncTextArea` 自己在 composition 进行中跳过，不能 blur/reset/替换 textarea |
| scrollbar、selection redraw、a11y 行文档 | 最终 `ydisp` 与 `isUserScrolling` 确定后，必要时 `core._onScroll.fire({position: ydisp})`；现 CoreBrowserTerminal 的监听器会 `_selectionService.refresh()`、`_viewport.queueSync()`，AccessibilityManager 也刷新行文档 | source viewport 不能覆盖每个 view 的本地滚动；extent 改变即使 ydisp 相同也须同步 scrollbar |
| 普通 selection | cell overwrite 保留 `_selectionService` 的完整 model/active mode/拖选监听，只 `refresh()`；真实 trim 交 `lines.trimStart` 原事件处理；真实 alt switch/rows resize 复用 stock 清理 | 不每帧调用 public `select()` 把列选择/拖选压成普通选择；不每帧 disable/enable selection |
| resync selection | 优先按仍保留的行身份映射；没有可靠映射时，只在明确 resync 清理一次，保持现 replay 已有的失效边界；常态 patch 不清理 | 不宣称任何结构重排都能保持选择；新范围不自动扩大产品承诺 |
| mouse | `core.coreMouseService.activeEncoding` 先更新；protocol 仅实际变化/初始化时设 `activeProtocol`，由现 onProtocolChange 绑定 mouse events、选择开关和 CSS | 同值每帧 setter 也会触发 selection.disable 并清选择；不能每帧赋一次 |
| focus/input | application cursor/keypad/paste 等直接镜像有效状态；live `onRequestSendFocus` 效应在模式已更新后，经 `core._inputHandler._onRequestSendFocus.fire()` 走现 `_reportFocus`；按 effect ID 去重 | 重复 ?1004h 是命令效应，不能仅 bool diff；snapshot 不补发旧 focus 请求；保留 onData/onBinary/IME/paste |
| palette | 只将已解析 SET/RESTORE 交 `core._handleColorEvent(event)`；REPORT 绝不传入 | REPORT 会由 browser 生成 device reply，破坏单权威回复 |
| 链接 hover | dirty rows 经普通 `term.refresh(start,end)` 产生现 onRenderedViewportChange，当前 Linkifier 会清受影响 hover 并重新 ask provider；结构变更至少刷新可见范围 | 不私改 link cache map、不重装 URL/文件 provider；仍需静止鼠标上的链接改写样本 |
| live a11y/bell | 完成去重后走 `core._onA11yCharEmitter.fire(text)` / `_onA11yTabEmitter.fire(count)` / `_onBell.fire()`；真实 LF 的语音可走 a11y char `\n`，不当作新的 target VT LF | 不能为搜索 invalidation 造 LF。target onLineFeed 还可能挂 Windows wrapping heuristic；重复执行会改已导入 isWrapped。source 已计算的 wrapping 为权威 |

LF 桥的边界必须明确：本产品现有 search cache 由上述显式 invalidation 保留，a11y 用既有浏览器 a11y emitter 保留；target 的 Windows wrapped heuristic 不应对最终源格子再运行一次。若以后新增依赖 `term.onLineFeed` 的消费者，必须进入此适配合同；不能无审查地再次 fire 通用 LF。这里不复制 WindowsMode 代码，也不重写辅助功能引擎。

`core._onCursorMove.fire()` 不是缓存失效工具：不需要为每个普通字变化强造 cursor 事件；搜索走其明确 cache 方法。a11y live events 的积压有自身限额，resync 不重读过去输出；内容/事件断序要明确失同步，不能无限存事件。

### 3.1 2026：利用 stock RenderService，保留本地 timeout

- A 以已完成 CSI 模式命令记录有序 h/l effect，snapshot 带当前 bit 和最后命令标识。B 保存 last-applied sync token；**只因新命令或首次 bootstrap**设 `core.coreService.decPrivateModes.synchronizedOutput`。
- 该位 true 时，正常 `term.refresh(dirty)` 自动进入 `_renderService._syncOutputHandler.bufferRows`，复用其 timer。下一个 l 设 false，再 refresh 一次，由现 `refreshRows` flush 已缓存范围。
- 现 timeout 会把 **target** 的 bit 置 false。后续普通 patch 不再从 source 的 true 覆盖它；resync 若仍是同一个 enable token，也不重启/延后既有 timer。若确有更新的 h token，则按新命令处理。
- snapshot 安装在当前同步输出中可启动该新观察者自己的有限显示周期；不能宣称跨观察者共享相同 wall-clock deadline。隐藏/销毁不留适配器自建 timer；使用原 RenderService dispose 生命周期。
- 不直接调用 `_syncOutputHandler`、不自行发明第二套 timeout 阈值、不每帧 reset renderer。h/l 在同一提交内的排序与 coalescing 留给实际红绿验证。

## 4. View / Presentation / Fit 的最小接线

以下是方法需求，不是新冻结公共 DTO：

1. **runtime view lease（A 负责）**：取得绑定 runtime 的可释放 token；设置 visible/focused；提交稳定 grid proposal；收到 owner/权威 geometry 变化。尺寸资格不能由 native sid 或 Pane ID 充当。只有 owner proposal 被接纳，无可见 view 保留最后 grid。
2. **TerminalView**：创建 lease 与适配器；新增 `setFocused(boolean)`（或等价 eligibility 更新）；textarea focus 继续 host.focused，同时更新自身资格。隐藏先撤资格/cancel fit，再退订；dispose 释放 stream/lease/adapter。键盘输入、paste、Kitty/win32、文件/URL handler 原逻辑保留。
3. **TerminalTabView**：现 useEffect 已有 active/focused；显式传二者给 view，不能只用 `.focus()` 的副作用猜 owner。失去 focused 必须可见地撤资格；无新增全局 focus store。
4. **StableTerminalFit**：现 propose/current/measurable/apply/request/cancel 足够复用。`apply(grid)` 改成 lease.proposeGrid，不再 term.resize→session.resize→presentation.refresh。owner 资格变化时 request/cancel；迟到 fit 捕获 token/generation，资格失效即拒绝。
5. **geometry 投影**：所有 view 仅因有序 frame 的 geometry 更新让 adapter 调 `term.resize`；follower 不反向 fit PTY。owner 本地 proposal 也等权威模型 geometry frame 后才 resize display，避免将旧序 delta 按新格解释。是否 OS 已确认由 A/native 合同另定，UI 不 await OS 完成阻塞 parse。
6. **TerminalPresentation**：保留 generation/隐藏退订/串行消费；将旧 text/reset/write port 换成 typed snapshot/patch 消费。验证 runtime/from/to；断序/容量超限仅本 view resync。新 snapshot 分块完整后一次安装，后续 patch 不插入半份 snapshot。不要在每个 resize refresh 做无条件 reset/replay，也不要每次 afterReplay 都 scrollToBottom。

## 5. 精确文件与必要验证接缝

建议 B 最小新增：

- `src/modules/agent/ui/terminal/terminal-screen-xterm.ts`：单一生产适配器，含 shape guard、buffer-aware link context、事件桥、选择/滚动本地状态和同步输出 token。
- `src/modules/agent/ui/terminal/terminal-screen-xterm.dom.test.tsx`：真实 xterm/生产 TerminalView 组合场景（需要 Root 批准写集和实际 DOM 能力后实施）。不能用只 mock TerminalView 的 TabView 测试替代。

精确既有修改：`terminal-view.ts`、`terminal-presentation.ts`、`terminal-scheduling.test.ts`、必要时 `stable-terminal-fit.ts`；`TerminalTabView.tsx`/其 `.dom.test.tsx` 只传资格与断言。A 的 `services/terminal/session-screen*.ts` 是类型/源导出归属，B 不写；不新增 manager/store/browser/native owner。

仅当本地集中适配无法安全实现才考虑的依赖缺口：OSC link service 无显式 buffer/row 参数；SearchAddon 无公开 cache-invalidate；CoreBrowserTerminal 无公开 state-import-complete（cursor/scroll/a11y/writeParsed）入口。现字段方法都实际存在，可以先做固定版本本地兼容层，**没有证据要求现在 patch 依赖**。若以后 patch，只列对应服务/addon方法及 bundle/typings/锁定补丁/许可，先由 Root 正式修订；不改 parser/Reflow/Unicode。

准入后且 K03 首步完成后，B 的最小失败接缝：

- normal inactive、alt active、同源 URI/同绝对行注册；切屏、trim/overwrite/resync/dispose 后自有 marker/service entry 回收且其他 Search marker 保留。
- 同一光标位置改内容后立即搜索（含 wrapped/中文）；鼠标静止的 OSC8/URL/文件链接更新；普通/列选择与拖选期间 patch，trim/alt/rows resize 与明确 resync 的行为。
- 中文 IME composition 中的 cursor/cell-width patch；onData、paste、application cursor/keypad、mouse SGR_PIXELS/focus 生效且 native device reply 总数为一。
- 2026 h→patch→browser timeout→继续 patch，不重新开启；resync 同 token不延后；新 h/l 正常；两个 view 独立 timeout/hidden/dispose。
- 两个生产 view 不同尺寸，焦点/隐藏/卸载/晚 fit 不争抢；失同步慢 view 重订阅不影响另一个 view，native resize/stop 不等 display。

以上均未执行，不能作为验收通过。

## 6. 本轮来源 SHA

完整 bytes/UTC/SHA 清单：`/tmp/huhu-t05-view-adapter-source-observation.json`。关键 SHA256：

| 源 | SHA256 |
|---|---|
| xterm `src/common/services/OscLinkService.ts` | `559eae342ee18934af8e1e22f6f03425f229b71a0161eb6de304863f4e2ebcda` |
| xterm `src/common/buffer/Buffer.ts` | `7d48cc12cf3c32b9cac1b6f6cfcee01215a1edb66e0dab48ceb3f87d9c25b422` |
| xterm `src/common/buffer/BufferSet.ts` | `65876e87f6b8e6e71b90c953a380a48f8689cee3d4467ae91e04ce88ec0f1bd2` |
| xterm `src/browser/CoreBrowserTerminal.ts` | `15c1149d38db18e9aa2c4a896e6c69c5cc40fb73a3fa01bb0602828cae3210a1` |
| xterm `src/browser/services/RenderService.ts` | `c2c30de3a383d7d848b20a1789f6c54aa28f93ec979d5f8665a31d256f0630a4` |
| search `src/SearchLineCache.ts` | `20cd1205c3146834ad556c5ec0a5bd829a33f5817a7cdc2e9c8c85cfdeedacac` |

所有路径以本工作区 `node_modules/@xterm/` 为根；经 symlink 可读，需要搜索时使用 `rg -L --no-ignore`。版本仍为 xterm/headless6.0.0、search0.16.0、同 commit `f447274f430fd22513f6adbf9862d19524471c04`，MIT。复用原报告已核的 R-04 许可/活动证据；无新网络检索、依赖或代码复制。

**READ-ONLY SOURCE STOPPED。**
