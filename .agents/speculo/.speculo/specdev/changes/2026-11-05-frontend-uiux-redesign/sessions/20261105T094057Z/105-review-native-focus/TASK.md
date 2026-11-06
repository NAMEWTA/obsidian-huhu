---
schema_version: 2
session: "20261105T094057Z"
task: "105-review-native-focus"
kind: review
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-07"
---
## Goal
独立high窄审102四源焦点修复，两票各自两轴；复用101/095未变完整审查，不重跑矩阵。
## Inputs
AGENTS/dev/ui/独立合同、Map38/Goal/Spec/T07/T16/UI002摘要49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66；用户medium实现/high审查持续。
102不可变REPORT SHA c336bd7d2f4388de895390d6eba63bd1d2512fe64208818604d099505a09ac9a。/tmp/huhu-native-focus-repair/owned-candidate.json SHA9af473ee84c7051f8206b60cd5ce94a71d759bd218fc6e294664882cac3946d3，4修改：EditorView.tsx/RetainedEditorDialog.tsx/automation-redesign.dom.test.tsx/keyboard.ts。完整T07 61候选SHAf1f4f80cdabcf7bea224573cca13b13cc9263acbf19bc8e503b5170b4a132d30、T16 69候选SHA1482bfee799e5314c6f2b3d4a5db0cc2d109e54cb42a15d9f3941531199e529b；Root085入口叠加及Root-exclusive-drivers明确。102后没有其它产品source改写。
T07实际原因：EditorView mount自focus内容早于Radix onOpenAutoFocus捕获来源，dialog现在由RetainedEditorDialog同一onOpenAutoFocus捕获来源后focus内容，不改共享引擎。原mouse/touch/prefocused-touch/keyboard四模式真实native红→绿，101原counter可复跑；单dirty/保稿/隐藏不退。
T16纠正调用链：原show('diff')实际DiffSurface FileDiff而非MultiDiffView。最终仅keyboard.ts节点WeakMap/owner-rAF恢复重绘后的同line gutter；MultiDiff逐字恢复自身baseline，DiffSurface未写。两消费者现有bind/unbind复用。原actual trusted Enter后copy条出现却BODY/none的反例转绿：两Doc同line/solid2px；Shift范围1→3/IME不选/真实外部button不抢焦/切identical卸载0临时focusin监听都已测。33DOM/scoped types/lint0；Root正式66待source通过。
## Workspace and Scope
只读4源及必要生产调用，完整61/69按未变范围复用前review；只写105不可覆盖REPORT与/tmp/huhu-native-focus-high。两个index.mjs Root仍诊断可变，不冻结整工作区。无source/assets/state/Evidence/index写入，不委派，不跑原66/用户数据。必要私有单native允许，原process材料不写evidence。
## Acceptance
T07精确真实来源回焦与初始Textarea，同一guard await/retained portal捕获时序正确；关闭栈/dirty单次/IME/隐藏保持，未连接/换leaf/Doc有界fallback，不抢旧leaf。T16用现库selection+onPostRender，焦点恢复绑定node/id/line/side/connected/可见/owner及真实用户移焦，无全局Doc/私有焦点引擎；unbind清rAF/listener，虚拟行/比较切换不迟到抢焦，Shift/IME不退。不以没有报错替代exact/2px断言。
核实际差异与必要真实控制，两票两轴分别结论；未变域测试不无差别重跑，不无限推测树。source/iframe不代表完整Obsidian/popout，Root另验。
## Return
不可覆盖REPORT聚焦交接/产物与验证/问题与下一步、independence/两票两轴/finding位置归因或PASS/实际命令退出/源hashmode/drift/局限；return0并释放停止。
