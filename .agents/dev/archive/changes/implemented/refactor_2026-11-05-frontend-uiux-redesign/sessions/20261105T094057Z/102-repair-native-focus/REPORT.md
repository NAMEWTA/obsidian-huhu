# 原生焦点接缝修复候选

Session: 20261105T094057Z
Task: 102-repair-native-focus
Status: completed

## 聚焦交接

仅修复 T07 关闭回错来源和 T16 选行重绘丢 gutter 焦点，两项均已在真实 Chrome 153.0.8010.47 建立原始基线红→当前候选绿。T07 将 Dialog 内初始聚焦交给既有 onOpenAutoFocus，先由共享 ModalLayer 捕获来源，再聚焦既有内容字段；独立页面、新建与 retained 输入选择模型保持。T16 实际原反例是 DiffSurface 的 FileDiff（show('diff')），不是 MultiDiffView；沿真实调用纠正后，仅在两个消费者共有的 keyboard.ts 利用既有 onPostRender bind/unbind 生命周期恢复本次键盘操作。同一 FileDiff metadata、Document、宿主节点、line/side 与可见性守卫限制恢复，外部移焦与 unmount 释放监听器和 RAF。

本轮产品与测试写入现已停止，候选等待 high 独立双轴审查；completed 仅表示候选交回。未写正式 Ticket、Map、Goal、Evidence、index、词典、产物、services/core 或用户 vault，未提交、构建、委派。MultiDiffView 的探索改动已按自身开工 baseline 逐字撤回，DiffSurface 未发生写入。

## 产物与验证

### 最小写集、归因与固定候选

修改前按 AGENTS、workspace/catalog、dev/ui、SpecDev I、当前 TASK 与批准 DESIGN3 核对接缝，设计绑定继续为 49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66。本轮不改变布局、设计系统、选行引擎、公共 API 或数据。

- src/modules/automations/ui/editor/EditorView.tsx：Dialog 内不在子 effect 提前 focus，表单标记既有实体以保持内容字段优先。
- src/modules/automations/ui/editor/RetainedEditorDialog.tsx：首次自动聚焦在共享来源捕获之后执行，保留原 retained field/selection 分支和 hide 时抑制恢复。
- src/modules/automations/ui/automation-redesign.dom.test.tsx：新增实际页面键盘打开/关闭后 exact opener 回归。
- src/modules/versioning/ui/diff/keyboard.ts：节点级 WeakMap 仅存当前键盘选行 pending 操作；真实 onPostRender 后 owner RAF 查同 line/side 替换 gutter。原节点仍连接、metadata 改变、Document 改变、隐藏/inert、用户移焦、文档失焦、卸载均不恢复。重复选择不留下 pending，unbind 取消 RAF 与临时 focusin。

只读调用方为 AutomationsPage、composer-page、共享 Dialog/ModalLayer、DiffSurface、MultiDiffView 及已安装 @pierre/diffs FileDiff/React 实现。实际原型/宿主及全量资产仍由 Root 验收；此处没有新建焦点或 Portal 引擎。

本地 /tmp/huhu-native-focus-repair：

- baseline/、baseline.json、git-status.txt：真实 dirty 开工四源快照。新增测试的开工原文从本轮追加边界恢复，并逐字 SHA 核对 101 final-snapshot 中的 2f2239701c750924eeb2716d615632fa5de1566b4b59af832cbb577c1041111a，未用 HEAD 冒充开工内容。
- owned-candidate.json：四路径最终 hash/mode，SHA256 9af473ee84c7051f8206b60cd5ce94a71d759bd218fc6e294664882cac3946d3；repair.diff SHA256 c9a8124c327c2177717fcc2900a3121cd6860844fb98324de2f1cd4886fe091b。
- t07-candidate.json：完整继承 096 的 61 项，SHA256 f1f4f80cdabcf7bea224573cca13b13cc9263acbf19bc8e503b5170b4a132d30。
- t16-candidate.json：完整继承 082 的 69 项及 095 已核验的三个 Root 纯 UI 词典入口叠加，SHA256 1482bfee799e5314c6f2b3d4a5db0cc2d109e54cb42a15d9f3941531199e529b。
- candidate/：完整各票当前存在文件副本，manifest 保留删除项与模式。两个 index.mjs 是 Root 独占且持续诊断的只读上下文，标为 Root-exclusive-driver；此副本不冻结其后续 Root 写入。
- final-verification.json：四路径最终字节/模式 drift=[]，MultiDiffView 与自身 baseline 相同。

### 真实红→绿与控制

私有 runner 复用 Root 生产 fixture 与原生 CDP，不修改其两个 index.mjs。baseline runner 只通过构建 onLoad 从本轮开工副本注入两项自动化源或 keyboard.ts，磁盘产品源不来回替换；其余真实依赖、宿主 CSS、生产 React/Radix/差异库一致。

- node /tmp/huhu-native-focus-repair/t07-baseline-runner.mjs --suite frontend-redesign --ticket T-07 --matrix redesign --out /tmp/huhu-native-focus-repair/t07-red2：预期红，工具退出 126，result.status=failed，原断言未放松。mouse、touch、prefocused-touch、keyboard 四模式均原按钮 connected，Esc 后却回 Workbench navigation。
- node /tmp/huhu-native-focus-repair/t07-runner.mjs --suite frontend-redesign --ticket T-07 --matrix redesign --out /tmp/huhu-native-focus-repair/t07-final2：退出 0；四模式均 exact=true，初始聚焦 TEXTAREA，关闭回同一编辑按钮。
- node /tmp/huhu-native-focus-repair/t16-baseline-runner.mjs --suite frontend-redesign --ticket T-16 --matrix redesign --out /tmp/huhu-native-focus-repair/t16-red：预期红，工具退出 126；实际 trusted Enter 已出现选行复制条，但 active=BODY、无 shadow focus、outline=none。
- node /tmp/huhu-native-focus-repair/t16-runner.mjs --suite frontend-redesign --ticket T-16 --matrix redesign --out /tmp/huhu-native-focus-repair/t16-frozen：退出 0；main、second 两 Document trusted Enter 后同 line gutter 焦点、solid、2px，未放松原 outline 断言。
- node /tmp/huhu-native-focus-repair/t16-extra-runner.mjs --suite frontend-redesign --ticket T-16 --matrix redesign --out /tmp/huhu-native-focus-repair/t16-extra-frozen：退出 0；Shift+Enter 将 1 扩到 3 并保留 line3 焦点/2px；isComposing Enter 不选行；在 keydown 微任务移焦到真实外部 button 后不抢回；同次事件切到 identical 卸载后无迟到恢复；两项临时 focusin 监听计数均 0。

最初无效 MultiDiff 探索和错误时间点 RAF 的红结果保留在 t16-first/second/trace/keytrace，仅作诊断；它们不被计算为绿色证据。t07-final 的私有键盘控制遗漏 Enter text 导致超时，修正原生事件参数后用 final2/red2 同一控制取得有效对照，未改产品或断言。

### 本地检查

- pnpm exec vitest run --project dom src/modules/automations/ui/automation-redesign.dom.test.tsx src/modules/automations/ui/navigation.dom.test.tsx src/modules/versioning/ui/review-repairs.dom.test.tsx src/modules/versioning/ui/diff/ConflictDiffView.dom.test.tsx：退出 0，4 files、33 tests 通过；包含 retained draft/selection、dirty confirmation、取消与隐藏的既有测试。
- pnpm exec tsc -p /tmp/huhu-native-focus-repair/tsconfig.json：退出 0，types-final.log 为空。首次 scoped config 缺少 Electron/virtual 类型声明且 range 推断失去联合字面量；已给 range 明确 SelectedLineRange 并把真实 src/types 声明加入私有配置，未伪造模块桩。
- pnpm exec eslint src/modules/automations/ui/editor/EditorView.tsx src/modules/automations/ui/editor/RetainedEditorDialog.tsx src/modules/versioning/ui/diff/keyboard.ts --max-warnings 0：退出 0，lint-final.log 为空。

## 问题与下一步

没有遗留已知目标缺陷。Root 接收上述完整复合候选，安排 high 双轴审查，再统一产物和正式矩阵/宿主门。实际 Obsidian 多叶、popout、OS IME、来源删除/跨窗口完整组合、本轮完整 66 矩阵与全仓 build/lint 未在此派单重跑；这些边界没有用 Chrome iframe、DOM 或 scoped types 冒充。既有独立 101/095 通过项仅在未变化输入与范围内复用。
