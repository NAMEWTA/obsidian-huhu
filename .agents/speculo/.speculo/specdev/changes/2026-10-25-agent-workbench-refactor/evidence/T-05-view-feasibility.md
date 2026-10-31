# T-05 visible xterm 接缝：真实 Chrome 可行性核验

2026-10-25，仅 `/tmp` fixture；未修改仓库、UI/production source、node_modules 或正式材料。没有使用 A 未冻结 DTO，没有实施 production adapter。真实 Google Chrome **153.0.8010.47**（headless、新隔离 profile）、Node **v26.11.1**，直接加载当前安装的 **@xterm/xterm6.0.0 / @xterm/addon-search0.16.0** 发布 bundle 与原 CSS；同 commit `f447274f430fd22513f6adbf9862d19524471c04`。真实 Blink/DOM、实测 cell metrics；不是 jsdom/mock。未加载 WebGL、Obsidian 或 HUHU 生产组件。

**结论：本次覆盖的 OSC8 buffer context/marker 回收、Search cache、2026 token、mouse protocol guard 接缝可在当前发布包执行。cursor/scroll bridge 与 stock xterm 相同，存在一个 stock 本来就有的滚动位置限制；没有发现该限制是投影新增回归。不能据此宣布 production B 或 IME 完整验收通过。**

## 1. 原始证据与命令

- 来源 SHA/bytes/UTC：`/tmp/huhu-t05-view-feasibility-source-observation.json`。
- 逐项汇总：`/tmp/huhu-t05-view-feasibility-checks.json`。
- 运行/command/UTC/exit/产物 SHA：`/tmp/huhu-t05-view-feasibility-logmanifest.json`；每次原始 `checks.ndjson`、`results.json`、`chrome.stderr.log`、`chrome-exit.json`、截图与 `logmanifest.json` 均保留。
- 完成的综合接缝 run：`/tmp/huhu-t05-view-feasibility-run03/`。
- stock/临时投影 target 对照：`/tmp/huhu-t05-view-feasibility-run04-baseline/`。
- 加强 target cell URI 断言的最终 OSC8 run：`/tmp/huhu-t05-view-feasibility-fixture/`。

实际执行入口均为 `node /tmp/huhu-t05-view-feasibility-fixture/driver.cjs`，完成后将旧 run 目录整体改名以保留证据；manifest 记录当时实际 launch path/flags/localhost URL。综合 run03、baseline run04、最终 OSC8 run 的 Node、Chrome 与工具退出均为 **0**。Chrome 只访问 loopback fixture；通过本地 CDP 取真实 browser version/截图，baseline 另用 CDP 发送输入/IME 模拟事件。

前两次失败没有丢弃：`run01` 的 undefined URI，`run02` 的诊断指明 alt 字符在 col6，均因 fixture 忘记 alt activation 会复制 normal cursor x；并非 registry/context 失败。run02 Node 自记录 exit1，外层工具报告126；原始失败和命令保留。修正独立的 `CUP H` 后继续验证。后续还加强了目标 cell→URI 断言，修正 fixture 内复用 null cell 的构造顺序，见下文；最终结论采用加强后的 run。

## 2. OSC8：active/inactive、marker 与复制

在真实浏览器 donor xterm 生成 normal row0 的 `https://normal.example/a` 和 alt row0 的 `https://alt.example/b`。target 保持 alt active；临时 helper 用同步 try/finally 切 `BufferSet._activeBuffer`/登记行坐标，再调用原 `_oscLinkService.registerLink/addLineToLink`，随后恢复原 pointer/base/y。两 buffer 使用不同的局部 target key。

实际结果：

- normal inactive 的 entry marker 确实属于 normal.markers；alt entry 属于 alt.markers，绝对行均为0，target ID分别1/2；故意 throw 后原 active pointer/base/y 均恢复。
- 最终 run **直接断言目标 cell.extended.urlId 解得对应 URI**，没有仅以 registry map 有 entry 代替 cell 关联。
- 使用目标自己的 line/cell/extended 对象；修改目标 underlineColor 后 donor primitives/extended 未变，行与 extended 也不为同一对象。
- 真正 activateNormalBuffer 后 alt link entry 释放、normal entry保留；normal 真正 trimStart(1) 后 normal link entry释放。适配器外创建的 marker 仍存活，行号从1移到0。
- **不能依赖 stock resize 自动释放所有 link**：从 rows4缩到2时，原 row3 entry仍存在（Buffer.resize 的 pop 路径）。显式 dispose 自有 marker 后该 entry消失；reset前、dispose前清理自有marker也使 service map归零。未调用 clearAllMarkers，没有销毁非本 adapter 的 marker。

最小实现要求仍是原提案的 owned-marker reconciliation：根据最终保留的 cell/link引用收回本 adapter 的失效 marker；fixture 直接调用了该清理动作，**没有实现或验收生产引用扫描/预算算法**。inactive/active context 在本次发布 bundle内可行，当前无证据要求 dependency patch；生产仍须真实结构 op/reflow/resync/所有权接线测试。

一个实测 fixture 构造陷阱需交给 B：`Buffer.getNullCell()` 返回复用对象。先向它装载 extended/urlId，再调用 `getBlankLine(getNullCell())` 会重置尚未写入的 attrs。最终 helper改成**先构造 blank line，再装载目标自己的 cell primitives，最后 setCell**；随后读取目标 cell 并断言 URI。不能缓存这个 null-cell对象当不可变 DTO。

## 3. 搜索、2026、mouse：正例与负对照

| 接缝 | 真实 Chrome 观察 | 边界 |
|---|---|---|
| Search cache | 先搜索 ALPHA 建真实 cache，直接改格成 OMEGA且不移动cursor；未失效时找不到 OMEGA。调用 `search._lineCache.value._destroyLinesCache()` 后 fire `core._onWriteParsed`，能找到OMEGA、找不到ALPHA；LF计数为0 | 使用真实 SearchAddon；没有 production帧调度、中文/wrapped/search decorations组合验收 |
| 禁止 fake LF | Windows wrapping heuristic负对照中，fire通用 `core._onLineFeed` 会把目标行 isWrapped 从false改true；仅 writeParsed不改 | 这证明不能用伪LF清缓存；不是本轮修改Windows行为 |
| 2026 same token | 原 RenderService timer句柄在两次同token普通同步/重订阅模拟中保持相同；约1142ms后target位自动false；同token再apply仍false且不启动timer；新h token能启动新timer，l能flush | 检验的是最小token helper与真实RenderService；没有生产snapshot分块/队列/隐藏调度验收，也未冻结timeout |
| mouse protocol guard | 在VT200下用 public select模拟已有选择；guard跳过同值setter后“select”保留；负对照直接重复设置VT200会把选择清空 | 实际调用原 mouse/selection服务；未执行真实拖选/强制选择键/鼠标坐标上报E2E |

2026 使用的是包内现有1000ms安全timer，未改依赖或设置新阈值。同token的“resync”在此是重复状态/token应用，不是 A/B未来生产resync合同已验收。

## 4. cursor / scroll / composition：与未改 stock 对照

普通底部 viewport 下，cursor bridge 驱动现 `_syncTextArea`：cell宽8.45px、高19px，cursor(x3,y2)处宽字符使 textarea left25.35px、top38px、width16.9px。compositionstart时 guard 阻止 cursor patch改动textarea位置，结束后可再次同步。这一项只先用了浏览器合成CompositionEvent，不能冒充系统IME。

随后按 Root 要求做单变量 baseline：

- **stock** 只走原 write：6行 → CUP(1,2) → scrollToTop；不导入状态、不额外fire cursor/scroll事件。
- **projected** 从stock读取 primitives，复制到自己的 buffer；相同本地滚动后调用候选 cursor/scroll bridge。无源行/cell对象共享，没有 raw接续或parser复制。
- 两者依次 focus，调用 Chrome CDP `Input.imeSetComposition(text='中')`、取消composition，再由 `Input.dispatchKeyEvent` 输入真实浏览器 a键。日志记录 compositionstart/update/beforeinput/input 的 `isTrusted=true`；这里是 Chromium CDP输入模拟，**仍不是操作系统IME或真实中文候选窗**。

| 时点 | stock | projected | 判断 |
|---|---|---|---|
| 底部 | ybase2/y0/ydisp2；textarea top0 | 相同 | 与可见cursor行0对齐 |
| 滚到顶部 | ybase2/y0/ydisp0；可见cursor行2，应38px；实际top0 | 相同 | 已有stock表现；未发现投影新增偏差 |
| compositionstart/update后 | isComposing=true；ydisp0；textarea/composition top仍0 | 相同 | 同一已有局限，不能写成IME位置全正确 |
| 首个可信浏览器a键后 | onData='a'；ydisp回2；textarea top0 | 相同 | 原scrollOnUserInput使两者回到底部，恢复对齐 |

源码 `_syncTextArea` 与 CompositionHelper 都使用 buffer.y，而不是 `ybase+y-ydisp`，与此观察一致。该差异已在出现后立即通知Root，现经未改stock对照归为上游现有限制。本轮**没有修改IME、CSS、依赖或提出无关生产修复**。B后续须保留baseline并核真实生产接线；不能以当前bridge测试声称IME完整通过。

scroll事件确实执行并保存了相同ydisp；本轮没有对 scrollbar DOM物理高度作完整断言，也没有验证WebGL、屏幕阅读器、列选择/拖选、复杂reflow或Obsidian两个叶子。相关项目不能写成已通过。

## 5. 复用与停止

后续执行者可将所需 run 里的 `index.html / fixture.js / driver.cjs` 复制到新的空 `/tmp` 目录，再 `node <新目录>/driver.cjs`；driver从仓库只读服务发布bundle/CSS，使用自身目录的隔离profile、localhost server与日志。run03覆盖综合接缝；run04只执行stock对照；最终fixture只执行加强OSC8断言。不要共用profile或覆盖原始日志。

未运行 K03、项目测试、lint/build、helper/PTY/Provider、cargo、HUHU生产UI、宿主E2E；没有使用未冻结 DTO或更改 production adapter。没有新增外部来源/依赖/代码复制；仅已安装 MIT xterm包。所有结论限定为本次临时fixture。

**READ-ONLY SOURCE STOPPED。**
