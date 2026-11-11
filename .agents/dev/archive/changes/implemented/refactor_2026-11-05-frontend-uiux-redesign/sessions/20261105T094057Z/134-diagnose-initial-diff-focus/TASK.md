---
schema_version: 2
session: "20261105T094057Z"
task: "134-diagnose-initial-diff-focus"
kind: implement
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-16"
---
## Goal
fresh medium仅诊断并最小私有修复首次聚焦→Enter的剩余diff键盘失败；Root单写，不能猜根因。
## Inputs
AGENTS/dev/ui/testing、Map51/Goal/Spec/T16、DESIGN3/UI002摘要49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66。用户明确medium实现/high审查所有16票。
130 v8四源已实际Root核hash/mode合入，无overlay差异：/tmp/huhu-virtual-hunk-focus/candidate-v8-manifest.json。最后同源私有final-v8-exercise首次main Enter copy bar超时（未到新F7），旧v8-complete曾过；Root13票done，T16仍in_progress，正式66已有2次（原pass、第二全case过但exercise失焦），不得浪费最后一次。125/127已修Enter后连续重绘owner：keyboard.ts a160dad6... onPostRender绑定完同步恢复、owner持续到外移/hidden/identity/unmount；但owner当前仅在Enter handler里建，初次focus到Enter间若异步highlight回收还无owner，这是待验证假设，不可当结论。
## Workspace and Scope
repo全只读，只写本REPORT+/tmp/huhu-initial-diff-focus；候选限src/modules/versioning/ui/diff/keyboard.ts、必要相邻DOM、Root T16 index.mjs。130四源由133high冻结只能读，不改Multi/DiffSurface/theme/worker/core/公共API；若真实缺口超范围发精确请求。不得读写原Claude transcript，不修改任何其它任务/源/资产/state/Evidence/index，不委派/创建Goal。
## Acceptance
用当前实际workspace（Root已合130，无私有override）原1case完整exercise与纯观察同operation timeline：focusin/blur、Shadow原gutter连接/active、highlight/postRender、可信Enter实际target/selected(copybar)；制造确定性late forceRender在首次focus后/Enter前，区分driver过早或overlay与实际用户Tab/焦点失去。若确实回收导致首次键丢失，沿现有keyboard owner/onPostRender接缝捕获真实focus，不造焦点/虚拟引擎、不sleep/循环重focus；复用现owner guard，多Doc/外焦不抢/metadata/hide/unmount及listener0。旧源同负控必须红、新正常/负控绿，不改selection API/删2px或尺寸断言。只私有candidate before/afterSHA/mode/冻结patch；真实Root单组可读，不正式66/全仓/真实用户vault/CLI账号/剪贴板。
## Return
不可覆盖三节聚焦交接/产物与验证/问题与下一步REPORT，真实source/命令退出/输入hashmode/逐轴或红绿结论/未闭边界；return0明确停写释放。ready候选路径冻结后不能覆盖。
