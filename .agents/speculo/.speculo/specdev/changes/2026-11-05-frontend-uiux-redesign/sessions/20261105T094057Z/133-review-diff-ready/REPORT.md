Session: 20261105T094057Z
Task: 133-review-diff-ready
Status: completed
Reviewer: native:/root/review_t11
Risk: high
Strategy: independent
Review-mode: working-tree

## 聚焦交接

结论：T-16 本次 128/130 修复的**标准轴 PASS、规范轴 PASS（限冻结写集及下述实测边界）**，未发现新增可复现产品缺陷。127 的连续 postRender gutter 焦点 PASS、095 的未变引擎结论继续复用；127 的 HIT-01（真实 22px Shadow 行号目标）已由本次严格尺寸实测确认修复。**不据此宣称 T-16 整体完成**：130 最后 `final-v8-exercise` 在首个 Enter copybar 超时、未到新 F7 的事实仍保留，交 134 诊断。Root 后来当前源单组完整 driver 退出 0 是补充集成证据，不消除该未归因失败。

范围是130四源与128必要上下文的只读独立 high 复验，不写源码、产物、state/index、真实 vault 或 clipboard，不跑66/全仓，不委派。所有 native 使用真实 React/FileDiff/CodeView、真实 parser/worker 和 Chrome CDP；第二 Document 是同源 iframe，不是 Obsidian popout。测试源直接取当前仓库，私有 runner 已删除130 candidate onLoad overlay；没有用未合入候选替代当前源。

复用依据：127 REPORT SHA `ba77450330e6e32b25d772ce700006eb1e7528b9fd78618b8baa018821d027d3`，130 REPORT SHA `143a6def472349bcd01b266f2af15cfd132205b9bda65d0cd7cdb4291276c3ac` 与 TASK 输入相符。dev/ui 技能分别仍为 `0c2a3309d1b00920539376a02c98485a98442c002945f0ee2e6ce8b816cfb744` / `12621917181e3a74f3a410a710752e8e856d9a84af739ef6c97c85f79bca1ad4`；复用已读测试、UI002/DESIGN3/Spec/T16 合同，不启动新工作流。

## 产物与验证

起止冻结清单在本地 `/tmp/huhu-diff-ready-high/start-manifest.json` 与 `end-manifest.json`；以下9项 SHA 与 mode 全部起止一致。前四项与130 v8 afterSHA 精确相同，DiffSurface 与128候选相同，keyboard 与127已验版本相同。

| 输入 | SHA-256 | mode |
| --- | --- | --- |
| `src/modules/versioning/ui/diff/MultiDiffView.tsx` | `acfc418f09a316ba16540172c0b544b0b7f2c8f6e0c9c2a58d08e3871b47f380` | 0o664 |
| `src/modules/versioning/ui/diff/theme.ts` | `2b97a74118546d6d819bc5cd7c25f9864f88942d912b9953af117a96510d60dc` | 0o664 |
| `scripts/ui-review/fixtures/frontend-redesign/T-16/index.tsx` | `2197e9cb685c2ef73bce486187686615a076431652b2f326579790cbf8c31d6b` | 0o664 |
| `scripts/ui-review/fixtures/frontend-redesign/T-16/index.mjs` | `eb6a806da4a05031cb58d37fa524de217159eee56ed5373f781828b4469678bb` | 0o664 |
| `src/modules/versioning/ui/DiffSurface.tsx` | `33eb8bf7aa3b3b6067b17b86fa3317167c99ddf9775198234755bd78d562ffe0` | 0o664 |
| `src/modules/versioning/ui/diff/keyboard.ts` | `a160dad6b91b9ca2fe91493e2ae4908d31690a30112f19dc8972e5876dc7d304` | 0o664 |
| `src/ui/react/use-density.ts` | `8254409bc39dc0319725ef76bb31031b16b9a6be9f15aa9a4244199790533a5e` | 0o664 |
| `src/ui/react/ime.ts` | `691391c22470320fe694da75db5ec6f2135c83192e2f7f6738a6b889029eb0c7` | 0o664 |
| `styles.css` | `27887ebaa9b4a5879cb1a9455a19f46680f690795c6cb2f8d70aba84ddfa6e95` | 0o664 |

以下命令均以 `node /tmp/huhu-diff-ready-high/<runner> --suite frontend-redesign --ticket T-16 --matrix redesign --out /tmp/huhu-diff-ready-high/<out>` 执行，只选一组390/zh/paper/coarse作启动验证，随后运行对应窄控制；不是66矩阵。五个成功结果的真实编译图 `inputDigest` 一致：`1914cbe3402fa966337f6b4240ef8637199ea0bd416ffea8445d38c70c623af1`。私有 driver 只将永久 driver 的两个相对 adapter import 改为绝对路径，另导出原私有辅助函数以单独调用；SHA `135e4cc8ae984a45a6fe487d2c7c2b1eb33085e59a51ecb3745505471b9a3cc3`。原完整 `exercise` 的 Enter copybar 断言未改、未删除；这些窄控制不冒充完整 exercise 通过。

| runner → out/result.json | 实际退出码 | 实证 |
| --- | --- | --- |
| `targets-runner.mjs` → `targets/result.json` | 0 | 原新增 virtual-hunk helper：1440@1x、320@2x；按钮与**CDP真实 F7/Shift+F7** 两路；2×2000行4hunk，共16主目标，每目标两个连续 paint 均 exact file/hunk、connected、solid 2px；前一处、折叠文件后展开并定位、折叠上下文后循环定位均通过；8组 Shadow 尺寸/命中 proof。 |
| `cancel-runner.mjs` → `cancel/result.json` | 0 | pending 请求后同 Doc 外部按钮获得焦点、另一 Doc 获得焦点、hidden→visible、比较 identity 更新、卸载，均未被晚 header 抢焦点；外按钮确实保持 active，另一 Doc 时主 Doc active 为 IFRAME；卸载和最终 dispose 后 focusin/pointerdown/window blur 三类自建 listener 均0。 |
| `guards-runner.mjs` → `guards/result.json` | 0 | 真实首个 F7 可导航；合成 isComposing 与 keyCode229 均不导航且未 preventDefault；input/contenteditable 内真实 F7 不移动且到达 Doc guard 时仍未 preventDefault。 |
| `geometry-runner.mjs` → `geometry/result.json` | 0 | 当前 DiffSurface 双 Doc；pointer none→coarse→none × compact/comfortable，共12组：实际 gutter/code高严格32/36/44，yDelta0，gutter宽≥所需；1px内边缘/中心命中及相邻普通div对照全部通过。 |
| `multi-runner.mjs` → `multi-corrected/result.json` | 0 | 当前 MultiDiff 双 Doc × compact32/comfortable36/coarse44 共6组，每组54个实际 Shadow line/expand/content目标；全部严格尺寸、无重叠、父行容纳、可见目标1px内部四向命中，普通div对照通过；真实点击 expand 六次，旧按钮全部断开且实际 gutter数20→34。 |

补充 Multi 实际像素如下（两 Doc 相同）：

| 模式 | line gutter | expand | expand-content高 / 父 separator高 | code高 / yDelta | diff header高 |
| --- | --- | --- | --- | --- | --- |
| compact、非coarse | 68.5×32 | 32×32 | 32 / 32 | 32 / 0 | 56 |
| comfortable、非coarse | 68.5×36 | 36×36 | 36 / 36 | 36 / 0 | 60 |
| coarse | 68.5×44 | 44×44 | 44 / 44 | 44 / 0 | 68 |

expand-content宽为130.90625/139.46875/152.25，均≥对应32/44下限。与生产 `itemMetrics` lineHeight=rowHeight、diffHeaderHeight=rowHeight+24、hunkSeparatorHeight=rowHeight、spacing8一致；实际 separator 和 code/gutter像素也已测，不只检查 CSS 字符串。NFR002 尺寸未用31.x容差或+1改值豁免；边缘点仅按TASK在1 CSS px内测。非coarse的真实媒体是 pointer:none、fine=false；coarse真实为true。未把 headless none 冒称实际 fine，实际 fine/Obsidian popout边界继续保留。

补充脚本首轮 `/tmp/huhu-diff-ready-high/multi/result.json` 实际退出126：到第二 Doc前私有控制重复声明顶层 `const f`，SyntaxError。第一 Doc 32px与真实expand当时已通过；将私有 evaluate 包进IIFE后，以上六组完整通过。没有修改产品或削弱断言；首轮结果仍保留。五次成功结果 `errors=[]`；Multi dispose 后两 Doc Worker created=terminated=33、live=0、URL=0，pointerup listener=0。

源码生命周期审查与实证对应：

- `move` 只在目标文件真的 collapsed 时创建新 Set，避免无变化 React item 更新触发 CodeView旧 scroll-anchor恢复；展开分支先保存 public scroll target，经 layout commit 确认目标已不collapsed且 comparison/owner/active有效后消费一次并scroll。原target-long四hunk跨回收、展开commit与前后导航均实测通过。
- F7只在本组件内处理，组合路径含本 owner HTMLElement editable 时跳过；复用共享IME守卫。handled F7 preventDefault+stopPropagation保留；本地Pierre真实 `CodeView` 在root keydown订阅 `clearPendingScroll`，其实现会清 pendingScrollTarget/pendingLayoutAnchor/scrollAnimation，故不应让已处理F7继续进入该竞争路径。真实键盘跨长文件与按钮同样绿；未以程序调用move替代键事件。
- header恢复仅由真实render/ref调度单次owner rAF，不循环轮询。pending严格带comparison、Document、source；focus前再核active/visible/isConnected/ownerDocument。public `containerRef`对应Pierre公开容器；仅原source已断开且新focus目标恰为该容器，才接受库回收fallback，不接受任意外部focus。外pointerdown capture、owner window blur均清pending；effect退出移除监听并清pending，另清rAF。外部focus/另一Doc/hidden/identity/unmount的实际路径已验；pointerdown单独取消分支与window blur订阅的资源闭合以源码审查为依据，不额外冒称独立真实外pointer race测试。
- 密度hook按真实owner Doc的coarse媒体/祖先density变化更新，使用既有共享hook；本次动态12组与两个Document精确尺寸证明未只套外壳高度。Shadow theme只对Pierre separator/button公开data槽做行高/列宽对齐，不改原引擎。127 keyboard owner持有/同步postRender恢复源未变，本次未回归重写该层。

## 问题与下一步

本次冻结修复范围无新增 finding。两轴通过不能扩大为全部T16的最终交付结论：最后一次130 Enter copybar超时仍未归因，134负责在focus→Enter间确定性late redraw的有限独立诊断；本报告不将它判成driver失误，也不以Root后续单绿消除。必要闭环是合并134实证，再由Root判断剩余验收及更新票据；不恢复已被22px反例推翻的旧无条件全绿结论。

未重跑66/全仓/build/lint；按只读窄审复用130已记录types/31DOM/scoped lint与095未变引擎结论，不把复用标成独立重跑。未覆盖真实Obsidian窗口popout、实际fine媒体设备与真实系统clipboard。没有写入真实vault、clipboard、源码、资产或state/index。报告读回并return校验后停写，释放本任务冻结。

Return 前 Root 补充134回执：确定性“初次 focus/可信 Tab→真实 forceRender→Enter”在当前旧 keyboard 源落 BODY/copybar 超时，私有 onfocus 复用既有owner候选两 Doc 通过；该候选尚未应用，Root 等本任务释放后合入并交135单文件 high 审。本133未独立复现该新控制，不把134回执写成自身实测；首焦点缺口仍作为整体未闭条件，以上128/130窄范围结论不变。
