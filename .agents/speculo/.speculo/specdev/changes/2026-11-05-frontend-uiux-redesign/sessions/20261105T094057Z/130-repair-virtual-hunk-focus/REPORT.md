# 长文件改动块焦点与 Shadow 命中候选

Session: 20261105T094057Z
Task: 130-repair-virtual-hunk-focus
Status: completed

## 聚焦交接

**固定 v8 候选已交付并停止写入；最后完整 native 检查未通过，T16 不能据此 done。** 根因与修复均有区分性证据：原 move 对已展开文件仍发布新 Set，React 更新使 CodeView 的旧 scroll anchor 与刚发出的 public scrollTo 竞争；旧 header 实际被回收。仅 preventScroll 的 v1 仍红，避免无变化 collapse 更新的 v2 连续八块通过；最终只在确需展开时于 layout commit 后滚动，并由现有 header ref/onPostRender/owner RAF 完成焦点转移。

Lead 明确追加了共享 theme.ts 的父 separator/button/grid 与对应 metric 范围，并确认 Multi 根应具备真实局部 F7/Shift+F7。最终复用现有 IME 端口与 public CodeView containerRef，局部快捷键消费已处理事件，允许旧 source 已断开时库将焦点回退到该精确 container；外焦、pointerdown、另一 Doc/window blur、hidden、identity、unmount 均取消请求。不复制虚拟化/键盘/焦点引擎，不注册全局 F7，不改 DiffSurface/keyboard/Worker/core、32/36/44主网格或产物。

按钮与真实 trusted F7/Shift+F7 双路线、两种宽度/缩放边界曾完整通过16主 hunk 的连续两 paint，并通过返回、折叠后展开定位、上下文折叠后定位、IME/editable与五取消控制。**但最后冻结源上的 final-v8-exercise 在原125 main Enter copy bar前置超时，未到新增F7步骤。** 目前不能断言是初次 highlight 重画、private overlay、源码差异或130引入；原失败保留，未改受保护的 gutter 接缝、未用重试 focus 掩盖。按 Lead 最后指示只交候选/事实，由 Root 合入后派新窄诊断，尚不启动最后正式66。

## 产物与验证

### 固定输入与交付

cwd 为 /home/wta/projects/obsidian-huhu；仓库始终只读，唯一写入为本 REPORT。原128冻结候选、v5/v6/v7和失败历史均未覆盖。before/ 与 before.json 是真实六路径开工字节/模式，final-verification.json 最后读回 readOnlyDrift=[]。当前 DESIGN3/UI002 绑定继续为 49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66。

最终目录 /tmp/huhu-virtual-hunk-focus/candidate-v8；补丁 candidate-v8.diff；清单 candidate-v8-manifest.json SHA256 **8298326e8a9aee3f41e4f935809bff9d0724bbb58888849060a40546f7015b9b**。

| 路径 | before SHA256 | after SHA256 | mode |
|---|---|---|---|
| src/modules/versioning/ui/diff/MultiDiffView.tsx | 3005c02b731757a8911972e5ea6ca2c4f4acd3d51bbc524b2ea0fa1d34088b25 | acfc418f09a316ba16540172c0b544b0b7f2c8f6e0c9c2a58d08e3871b47f380 | 0o664 |
| src/modules/versioning/ui/diff/theme.ts | c53348ce47cb9171dd70416dd56fe6570c126b6cbfee3bc84e53d0eb9d163913 | 2b97a74118546d6d819bc5cd7c25f9864f88942d912b9953af117a96510d60dc | 0o664 |
| scripts/ui-review/fixtures/frontend-redesign/T-16/index.tsx | 54eb635cf6bb167bc47600b87d79d9abd94f7882988ba5f5c8868bc59cf912f1 | 2197e9cb685c2ef73bce486187686615a076431652b2f326579790cbf8c31d6b | 0o664 |
| scripts/ui-review/fixtures/frontend-redesign/T-16/index.mjs | bae6d10921a49d62f15ce895cdd4adc8cf0c793bfe958fdd1eb67bf7d300f73b | eb6a806da4a05031cb58d37fa524de217159eee56ed5373f781828b4469678bb | 0o664 |

只有以上四项交付。Multi 使用 public scrollTo、containerRef 与现有 header refs；pending 请求绑定 comparison/Document/source，真实展开提交后再滚动，不对已展开文件制造无变化 React 更新。theme 通过公开 unsafeCSS 将 separator 高度、expand grid列宽、button最小宽度统一到既有 --diffs-line-height，Multi hunkSeparatorHeight 同步；实际 expand 原宽32、父高32/子高44，点击后行数20→34，证明是真交互缺陷。候选父/子均44，不撑出父行，不加+1。

采用依据为已安装 @pierre/diffs1.6.4 的 CodeView.js、style.js、公开类型，以及已实读的[官方文档](https://diffs.com/docs) CodeView、Post Render Lifecycle、Styling。库 root 的原生 keydown 无条件 clearPendingScroll；React portal 先触发本地 React F7 handler 再冒泡到该 root，因此 v6 仅 preventDefault 时新 scroll 被同一事件清空。v7 仅对已处理 F7 加 stopPropagation 后真实键跨四块通过；不是依据先前的“connected误判”猜测修复。原直接 keyCode 读取触发弃用 lint，v8 改复用 src/ui/react/ime.ts，未关闭规则或改共享端口。

### 最小真实证据与命令

所有 native 均为 --suite frontend-redesign --ticket T-16 --matrix redesign，固定一个初始 case 加原完整 exercise/定向控制；没有正式66或全仓执行。浏览器为 Chrome153.0.8010.47；记录实际 pointer:none/coarse，未冒称真 fine。320 CSS px、scale2 是既定缩放边界；真实 Obsidian fine/popout/OS仍由 Root T13/T14 验收。

- observed/result.json：原Source真实红，工具退出126。b0在1389.5ms已 focus并清 pending；1420.4ms b被 unmount、1422.2ms回到a，MutationObserver记录b0/b1物理断开，第二paint退容器/工具栏。v1-long（仅preventScroll）仍红；v2-long（仅避免无变化Set）八块两paint绿。
- v6-actual-keys 与 v6-fallback-observed：真实F7在a0后超时；focusin观测无 pending 被取消，撤回“connected误判为本次原因”的假设。库原生 keydown 取消新 scroll 的单变量 v7-key-propagation通过16主块，形成键路径红→绿。
- negative-old-hunk、negative-old-expand、negative-old22：同永久 driver 的私有单变量反例均工具退出126。旧 hunk在b0第二paint无file/outline；旧expand父32子36越父行，coarse原宽32；旧22实际bbox<32且内部点误行。不是编译失败或未触及路径。
- node /tmp/huhu-virtual-hunk-focus/v8-runner.mjs ... --out /tmp/huhu-virtual-hunk-focus/v8-complete：退出0；同一v8实现完整exercise，16主hunk两paint、button与trusted F7/ShiftF7、1440与320@2x、previous、折叠文件后展开、上下文后定位通过。它在最后缩进整理/快照记录前执行，不能冒充最后冻结源的完整通过。
- node /tmp/huhu-virtual-hunk-focus/verified-v8-runner.mjs ... --out /tmp/huhu-virtual-hunk-focus/final-v8-exercise：**工具退出126，result.status=failed；Timed out: main keyboard selection copy bar。** 该次未到130新增F7步骤，不能跳过、归为“既有driver”或计作绿色。
- node /tmp/huhu-virtual-hunk-focus/verified-v8-cancel-runner.mjs ... --out /tmp/huhu-virtual-hunk-focus/final-v8-cancellation：退出0；外控件、另一Doc、hidden、identity、unmount均不迟到抢焦；卸载/最终dispose后 focusin、pointerdown、window blur计数均0。
- node /tmp/huhu-virtual-hunk-focus/verified-v8-guards-runner.mjs ... --out /tmp/huhu-virtual-hunk-focus/final-v8-guards：退出0；isComposing、229均保持原hunk；真实F7在input/contenteditable内未被页面消费或导航。正向键为CDP trusted；composition/229为真实Chrome中构造的native KeyboardEvent，不冒充OS IME。
- node /tmp/huhu-virtual-hunk-focus/v8-check-types.mjs：退出0，真实模块路径0diagnostics，包含两生产源与真实fixture声明；私有CompilerHost仅替换候选文本，无假类型。
- pnpm exec vitest run --config /tmp/huhu-virtual-hunk-focus/v8-vitest.config.mts --project dom src/modules/versioning/ui/diff.dom.test.tsx src/modules/versioning/ui/review-repairs.dom.test.tsx src/modules/versioning/ui/diff/ConflictDiffView.dom.test.tsx：退出0，3files/31tests。
- pnpm exec eslint --stdin --stdin-filename src/modules/versioning/ui/diff/MultiDiffView.tsx --max-warnings 0 < /tmp/huhu-virtual-hunk-focus/v8/MultiDiffView.tsx：退出0；theme.ts同样检查退出0。v7曾有keyCode弃用告警，不计通过；已由共享IME端口消除，v8-lint-multi.log为空。

### 永久 driver 与 private 边界

fixture 新增独立 target-long 分支，使用真实 MultiDiffView、2×2000行合成查询、真实解析/Worker/CodeView，不改常规 states 数组或生产领域数据。永久 driver 检查 line、expand、expand-content 的严格bbox>=32/44、父行包含、无重叠、实际可见控件的1 CSS px内部点命中，并与普通相邻div同点配对。部分滚出原生scroll viewport的行仍检查bbox/重叠，命中仅检查完整可见区域；没有将不可见部分算通过。Chrome0.5px边界量化限制沿128证据保留，未加33/37/45或降低尺寸阈值。

CodeView滚动期有真实 pointer-events:none；driver通过有界 MutationObserver等待其实际解除后再做严格可信点击，不用sleep/焦点重试。wrapper只是库的gutter锚点，交互内容按原库布局可横跨代码行；验证实际行/viewport边界与separator父高，未把窄锚点误作整行宽度。

verified-v8三个结果新增 actualSourceOverrides，四项SHA/模式精确等于候选清单，并记录实际runtime driver与private runner哈希。原 result.inputs 仍是原runner读取的仓库上下文路径，不能把其 inputDigest 当成私有覆盖候选的完整哈希；应以 actualSourceOverrides、清单和 runtime-v8-fixture（仅两处import路径改写）联合回读。所有探针、截图、JSON、编译物仅留/tmp。

## 问题与下一步

Root已指示停止130写入，原子合入固定v8并交high审已修的真实F7/命中；最后原125 copy bar超时作为未闭条件单独窄诊断，不能凭早前绿色跳过。下一步需同 operation timeline 区分首次 Enter 前真实 highlight回收、private overlay或实际源码差异；若用户首次聚焦/Tab即丢，也属于同一键盘合同，沿实际 keyboard owner接缝处理。本任务没有无证据改该受保护源，也没有启动最后正式66或宣称总体完成。
