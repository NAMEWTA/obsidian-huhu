# 差异行号命中修复私有候选

Session: 20261105T094057Z
Task: 128-repair-diff-targets
Status: completed

## 聚焦交接

候选仅修改 DiffSurface.tsx 与 MultiDiffView.tsx，复用现有 useDensityRowHeight(owner ref)，通过 Pierre 的继承 CSS 变量同时设置整条代码和行号为 compact32、comfortable36、真实 coarse44；CodeView 估算同步 lineHeight 与库默认 header 的 1lh+24px，并撤销没有对应自定义 CSS 的固定 separator36。没有扩大重叠伪目标、改字体、复制测量/虚拟化引擎、触及 125 keyboard/driver 或改仓库。候选主 Doc/iframe 动态媒体与密度 12 组实际尺寸、同排和独立内部命中均通过，125 同源焦点生命周期控制、完整单 case exercise、31 DOM、types/lint 通过。

0.5px 边界采样发现 Chrome 对普通相邻 div 也会提前归入下一行。按 Root 的明确测量决定，最终保留精确 32/36/44，实际尺寸仍严格断言，独立命中改在距共享边界至少1 CSS px的确定内部点，普通 div 逐组同点配对；没有把 pointer:none 冒充 fine，也没有声称0.5px点通过。

**长文件 F7 稳定性仍须 Root/high 验收，不能宣称本票全部门已闭合。** 2000行×2、展开上下文、四个改动块的候选实际遍历两次通过，header68/按需渲染行1891附近正确；但最后一次重复有第三块 wait 已见正确焦点、两帧后退到工具栏的失败。原22基线同一 long-only 也在第三块超时，证明不是只见候选失败就能归因新尺寸逻辑；现有 MultiDiffView 的 hunk RAF/虚拟重绘接缝保留不稳定，未在本冻结候选中扩修焦点引擎。completed 仅表示本次私有候选与事实交回；原必需长文件稳定边界明确待验。

## 产物与验证

### 复用依据与最小写集

按 AGENTS/dev/ui/testing/调研复用合同、当前 TASK 与 DESIGN3/UI002 摘要 49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66 核对实际入口、两消费者、共享 hook 与已安装 @pierre/diffs 1.6.4。官方 [Styling](https://diffs.com/docs#styling) 允许在父组件 style 上声明 CSS 变量并继承进 Shadow DOM；[CodeView File & Diff Size Estimation](https://diffs.com/docs#file--diff-size-estimation) 说明 itemMetrics 只是虚拟估算，真实布局仍由库测量修正，不能只改估算而不改 CSS。2026-11-06 实读当前官方文档，并以本地固定1.6.4声明/源交叉核对；没有使用不在当前导出中的能力。

- src/ui/react/use-density.ts 负责当前元素的 owner Document、祖先 density、pointer media、adoption 与 cleanup；原样复用，未改共享 hook。
- src/modules/versioning/styles/diff.css 既有22px桥接被两个表面的 inline --diffs-line-height 精确覆盖，所有代码/行号共用同一公开变量，不触及全局 stylesheet/产物或其它模块。
- 已安装 node_modules/@pierre/diffs/dist/style.js 的默认 header min-height 为 1lh + 3×8px；实际 coarse 长文件测得68px。因此 MultiDiff itemMetrics.diffHeaderHeight=rowHeight+24；lineHeight=rowHeight；spacing 保留8。types.d.ts 明示 hunkSeparatorHeight 只在自定义 separator CSS 时设置，所以去掉原36，恢复库测量而非新造布局。
- DiffSurface 在现有 surface ref、MultiDiffView 在现有 root ref 上调用 hook，真实 root style 将同一数值传到库；没有单独撑高 gutter、负 margin、伪元素扩区或破坏代码对齐。

### 冻结候选与仓库边界

过程根 /tmp/huhu-diff-target-repair。before/ 与 before.json 保存六个真实开工输入的字节、SHA/模式；repo-verification.json 和最终回读均 drift=[]。仓库始终只读，唯一仓库写入是本 REPORT；无提交、构建、正式66、全仓检查、其它票矩阵、用户 vault、系统服务、委派或状态/Evidence 修改。

最终不可覆盖目录 proposed/，补丁 candidate.diff，清单 candidate-manifest.json SHA256 **f8fabbcf2cb07dd3c9129c84e5eac85b40b4e4d98d928a60f350230afdb6fbbc**：

- src/modules/versioning/ui/DiffSurface.tsx：before SHA256 2e57a0ba23f42723649e1fda4f2d9c1689de729b591cadb8194df476d4088a45；candidate **33eb8bf7aa3b3b6067b17b86fa3317167c99ddf9775198234755bd78d562ffe0**；mode0o664。
- src/modules/versioning/ui/diff/MultiDiffView.tsx：before SHA256 7f1ad4a1ae3dae319cb7bbe4dc791a50a482c1affa57766729867dee4043b681；candidate **3005c02b731757a8911972e5ea6ca2c4f4acd3d51bbc524b2ea0fa1d34088b25**；mode0o664。

只读 theme.ts、keyboard.ts、T16 index.tsx/index.mjs 与上述 baseline 核对未变。所有 esbuild/Vite/TypeScript 私有 override 都从 working/ 注入同一真实模块路径，只用于观测/测试；proposed/ 不含 stress 模式、focusHandles 或探针。没有把私有 fixture 的合成领域内容冒充真实 vault。

### 实际红→绿、环境与测量取舍

Chrome153.0.8010.47；所有 native runner 使用 --suite frontend-redesign --ticket T-16 --matrix redesign，固定一个390/zh/paper/coarse初始 case，再运行定向控制或原完整 exercise，不是正式66。headless touch disabled 时实际 pointer:none=true/fine=false，touch enabled 时 coarse=true/none=false；真 fine 未覆盖，保留 Root T14/真实 Obsidian Xvfb 补验，不为此启动失败的 headed Chrome 或伪造 matchMedia。

- node /tmp/huhu-diff-target-repair/baseline-runner.mjs ... --out /tmp/huhu-diff-target-repair/red：预期红，工具退出126；原22px <32px，规范点落第2/4行。
- node /tmp/huhu-diff-target-repair/coarse-red-runner.mjs ... --out /tmp/huhu-diff-target-repair/coarse-red：预期红，工具退出126；coarse真实为true，原22px <44px；即使最终距共享边界1px的±21采样，仍命中第2/4行，故测量取舍未放过原缺陷。
- node /tmp/huhu-diff-target-repair/candidate-runner.mjs ... --out /tmp/huhu-diff-target-repair/virtual-long-final：退出0。12组 main/second × compact/comfortable × none→coarse→none，实际32/36/44，codeHeight相同、yDelta=0、宽度≥最小目标；同一已挂载表面响应动态媒体与 density，没有依赖每组 remount。
- 最终 geometry-control 的独立行点为中心±15/17/21与中心，距共享边界1px；每组相邻普通 div 使用相同3点均命中自身。plain-quantization/result.json 表明普通32px div 在y31命中第一行、31.25/31.5命中第二行，库 span/gutter rect 完全同界，没有子节点溢出。quantization-control 在 DPR2 的可信鼠标也复现 bottom−0.5 归邻行。geometry-detail/quantization-control 的0.5点失败均保留；没有声称这一点绿色。
- 33/37/45 的中间 +1 试验曾全绿，但 Root 明确要求保持共享主网格与精确32/36/44，所以撤回；最终候选不含+1，不能用该实验充当最终证据。
- 原库实际大小/同排成功后，2000行×2展开上下文四块依次 a0/a1/b0/b1，按需渲染行1891附近，coarse行44/header68；真实折叠上下文按钮 pressed=true、expander40；最终 worker live=0、URL=0、已计 pointerup监听=0。private stress fixture 只提供合成 domain queries，解析、CodeView、scrollTo、annotation、折叠和虚拟化均为真实生产代码/库。

### 焦点与局部回归

- node /tmp/huhu-diff-target-repair/exercise-runner.mjs ... --out /tmp/huhu-diff-target-repair/exercise-final：退出0，原生产 T16 fixture 单 case +完整 exercise 全断言通过，125两个连续paint的严格focus/solid/2px断言保留。
- node /tmp/huhu-diff-target-repair/focus-controls-runner.mjs ... --out /tmp/huhu-diff-target-repair/focus-final：退出0，125真实 FileDiff 晚重绘、main/second、Shift范围、IME忽略、外焦不抢、hidden/new metadata/unmount释放控制原样通过；keyboard实际源与125 a160dad6...一致，只在私有构建暴露实际instance供控制，没有更改候选焦点实现。
- pnpm exec vitest run --config /tmp/huhu-diff-target-repair/vitest.config.mts --project dom src/modules/versioning/ui/diff.dom.test.tsx src/modules/versioning/ui/review-repairs.dom.test.tsx src/modules/versioning/ui/diff/ConflictDiffView.dom.test.tsx：退出0，3files/31tests。私有Vite load只换两源，保留仓库原DOM项目与测试；未写镜像实现的样式测试。
- node /tmp/huhu-diff-target-repair/check-types.mjs：退出0，types-final.log为真实模块路径0diagnostics；CompilerHost只注入两私有候选，其它依赖为真实声明。
- pnpm exec eslint --stdin --stdin-filename src/modules/versioning/ui/DiffSurface.tsx --max-warnings 0 < /tmp/huhu-diff-target-repair/working/src/modules/versioning/ui/DiffSurface.tsx，以及同样命令检查 ui/diff/MultiDiffView.tsx：各退出0，lint-surface.log/lint-multi.log为空。

### 未闭合的长文件稳定边界

最后同源重复 frozen-geometry/result.json 的12组几何仍全部通过，但第三块曾被 waitFor 捕获为正确焦点，随后两帧后 active退到工具栏（y53，file缺失），失败保留，不被早前绿色覆盖。最小隔离候选 candidate-long-only/result.json 四块再通过；原未改 baseline-long-only/result.json 则第三块 virtual hunk focus 超时，之前 a0/a1已通过。说明原 MultiDiff 的 hunk focus/虚拟重绘路径本已有失效证据，但本次不具备把候选偶发失败排除出必需门的依据。因此只交正确尺寸/估算候选，**不宣称 F7稳定通过**，也不为此越过已冻结范围延伸新焦点引擎。已逐项工具通知 Root。

## 问题与下一步

Root 可核对 frozen manifest 后单写应用两源，再由 high129客观审查尺寸修复及测量取舍；0.5px边缘限制、真实fine补验与长文件F7不稳定均必须保留。长文件稳定验收由 Root 决定继续独立复验或新建窄修接缝任务，当前原必需边界仍待验；本报告不把它降级为已通过或以一次绿色替代稳定结论。保留全部红/绿和私有源，停止覆盖候选；正式资产、矩阵、真实Obsidian多叶/popout/OS由Root继续。
