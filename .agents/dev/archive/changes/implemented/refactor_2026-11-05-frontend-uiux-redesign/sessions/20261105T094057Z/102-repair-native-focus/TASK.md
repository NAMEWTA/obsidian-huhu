---
schema_version: 2
session: "20261105T094057Z"
task: "102-repair-native-focus"
kind: implementation
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-07"
---
## Goal
sol medium仅修两项实际Chrome153产品焦点缺陷：T07 clean editor关闭回错来源；T16键盘选行后gutter焦点丢失。两票已有独立全source审查，最小接缝修复，不重做UI或库。
## Inputs
AGENTS/dev/ui及SpecDev I，Map38/Goal/Spec/T07/T16/UI002/DESIGN3摘要49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66。用户medium实现/high审查全部16持续。
T07完整072/093基线，096只修导航取消signal+fixture扩展+真实provider测试，61候选/tmp/huhu-t07-navigation-repair/final-candidate.json，163/164旧报告不覆盖；099通知exact去重后原样23files164/164与scoped types0，combined-verification.json有事实。101独立在/tmp/huhu-t07-t11-final-high/native-focus/result.json实证：trusted mouse、trusted touch与预先focus触发button的touch三控制均focusin/click=Edit notify automation，clean editor Esc后却active=Workbench navigation，原button仍connected。不是touch不focus；原真实driver /tmp/huhu-t07-retained-native/result.json exact edit source focus超时。101正式报告SHAa7d5054f4cb180290830c15a36678034829f4ccc8ecd6719b6aa5c8acb3961d5，已释放105产品冻结。可复跑单控制focus-runner.mjs+focus-control.mjs在/tmp/huhu-t07-t11-final-high。只复用未变已通过项。
T16 095独立双轴通过（REPORT SHAdeaf9d7d58aab86e10256d39644dde67434f3d260e14c29e9ee2c4dd9b84af40），69候选加Root085纯UI词典叠加已冻结。Root真实/private /tmp/huhu-t16-focus-diagnostic/result.json：beforeKeyboard main docFocus=true、doc.activeElement=DIFFS-CONTAINER、shadowRoot.activeElement=可访问tabindex0 gutter；trusted Enter后复制选行条出现，但shadow active undefined/outline none。原assert没放松，proof保留before/after，失败在T16 driver172。实际MultiDiffView.onSelectedLinesChange=setSelection、inline options/onPostRender与keyboard.ts setSelectedLines路径需核对库重绘；当前keyboard binder没有重绘焦点还原。不要把静态DOM keydown测试当native焦点通过。
## Workspace and Scope
只写T07 automations/ui实际openEditor/EditorView/RetainedEditorDialog最小相关源+相邻DOM；T16 versioning/ui/diff/keyboard.ts、MultiDiffView.tsx与必要相邻DOM。完整各票原候选保留，先保存真实dirty baseline/hash/mode。Root独占两个index.mjs（诊断仍会追加，不可改/重置），全局shared/Portal/modal引擎、core/services/api/schema、词典/资产/state/Evidence/index只读。过程/tmp/huhu-native-focus-repair。无delegation/提交/worktree/node_modules/用户vault。共享缺口精确提案Root，不能私造focus/Portal engine。
## Acceptance
T07在真实异步dirty guard/独立Root/retained Dialog下精确保留实际opener，normal mouse/touch/keyboard close回仍connected当前实体；hide/unmount/换Doc/实体已删除按现有可靠fallback，不把焦点拉回旧leaf。不破坏Tab trapping/单dirty确认/焦点层级/IME与hide保留draft。最小有意义实际原反例和正常控制。
T16复用库selection/virtualization与onPostRender生命周期，仅修gutter键盘在实际重绘后焦点/2px可见outline；Enter与ShiftEnter范围、IME忽略保持。按实际owner/id/file/line/side归属，用户已移焦到别处/隐藏/换比较/虚拟行卸载不抢焦、不留DOM监听。不写通用焦点引擎、不保留全局Document引用、不改库源/样式尺寸或降低原断言。
风险适量DOM/types/lint，并可运行Root原private单控制（不是66），保留原native before/after对照。重要缺陷需真实红→绿，不扩无限状态树；足够即冻结完整复合candidate/差异/modehash，停止待high。Root统一CSS/main与正式全矩阵/宿主。
## Return
不可覆盖REPORT含聚焦交接/产物与验证/问题与下一步，两票各自baseline/candidate与归因/命令退出/实际native控制/未测边界。return验证0后停写待high，不改正式Evidence/state。
