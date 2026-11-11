---
schema_version: 2
session: "20261105T094057Z"
task: "128-repair-diff-targets"
kind: implement
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-16"
---
## Goal
medium私有最小修复127实际Shadow行号命中P2。repo只读/tmp候选，Root单写；不删DESIGN规定可聚焦行号/Enter/Shift选择能力、不发明目标豁免。
## Inputs
AGENTS/dev/ui/testing/复用合同、Map48/Goal/Spec/T16/DESIGN3/UI002摘要49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66。127真实测主Doc/iframe .huhu-diff-gutter rolebutton 68.5×22；coarse媒体真仍22高，中心±21.5命中第2/4行，桌面32/触控44都不足。NFR002/DESIGN453严格无例外。只扩大重叠伪命中会选错行，不可采用。
125焦点修复Root已合入：keyboard.ts a160dad6...；T16 driver bae6d109...；127正在只读冻结此2源直至REPORT，不可改repo。Root T08正式66在跑，不改styles/assets/其它fixtures。成熟Pierre 1.6.4现API源与官方diffs.com/docs优先，外部采用保原引用；不重写渲染/virtualizer/选区。
已有共享hook src/ui/react/use-density.ts:useDensityRowHeight(ref)精确owner Document/adoption/pointer cleanup，返回compact32/comfortable36/coarse44。优先复用此hook和库公开CSS --diffs-line-height/实际metric合同，保证整条代码/行号对齐而非只gutter撑高。MultiDiffView目前itemMetrics.lineHeight22，须与实际CSS行高一致避免虚拟错位；不复制测量引擎，按实际库合同核对必要header等metric。字体/配色/字节模型不改。
## Workspace and Scope
repo全只读，只写本REPORT+/tmp/huhu-diff-target-repair。候选限ui/DiffSurface.tsx、ui/diff/MultiDiffView.tsx、ui/diff/theme.ts、必要相邻DOM与Root拥有T16 index.tsx/index.mjs实际测量断言；keyboard.ts/worker/parser/core/API只读。若需共享hook改动先具体报告，不越权。交付前存真实before/hashmode/after/冻结patch，ready路径不覆盖。
## Acceptance
可私有真实Chrome单case/定向controls（不正式66/全仓），保125同源focus/Shift/IME/外移/identity/hide/unmount，以及晚重画稳定。测主Doc/iframe fine/coarse、compact/comfortable、动态媒体改变，实际32/36/44目标、相邻目标中心±边界命中独立行，不重叠/不误选；代码/行号同排、虚拟长文件定位/折叠/上下文/改动块跳转不漂移、资源清理0。原source真实22红→新绿，不以CSS变量名存在代真实几何。
## Return
不可覆盖REPORT三节聚焦交接/产物与验证/问题与下一步；实际库引用/单变量方案取舍与风险/完整before+afterSHA/mode/红绿命令退出/私有边界，return0停写。不改正式state/Evidence/产物/index，不委派。
