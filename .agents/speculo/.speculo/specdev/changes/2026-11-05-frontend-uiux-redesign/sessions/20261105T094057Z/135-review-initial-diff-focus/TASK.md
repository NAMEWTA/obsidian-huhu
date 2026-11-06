---
schema_version: 2
session: "20261105T094057Z"
task: "135-review-initial-diff-focus"
kind: review
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-16"
---
## Goal
high窄审134一源首次focus→重画→Enter缺口；复用133/127/095其它结论，不扩查/66/全仓。
## Inputs
AGENTS/dev/ui/testing、Map51/Goal/Spec/T16/DESIGN3/UI002摘要49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66。用户medium实现/high审持续。
133 REPORT SHAe72bc8487952bfc9dd1f2d73b4b174031b1786a984d9574f2c94a993c2557bf9：真实F7/展开/取消/严格Shadow目标与metric9项冻结源双轴PASS，但首次focus缺口未闭。134 REPORT在134-diagnose-initial-diff-focus，/tmp/huhu-initial-diff-focus/ready-manifest.json目标keyboard.ts before a160dad6...→after8dc703e02946e352c879f065bdad801ce83aff0938f6aaa08ee09bc7a5a12efc，mode664；Root核before/afterSHA+mode、冻结patch并实际合入。
确定性真实无overlay当前workspace旧baseline原exercise可过；focus后真实FileDiff forceRender再可信Enter，旧源active BODY/copybar超时；可信CDP Tab进入同样旧红。候选仅既有owner建块从Enter移到gutter.onfocus，Enter仍只调用原选择API，unbind清onfocus；两Doc旧红新绿，原完整99states/16virtualhunks、12取消轴/cleanup listener0、私有types/lint0。不追溯声称130那次缺事件链的偶发失败已知原因。
## Workspace and Scope
repo全只读，仅本不可覆盖REPORT+/tmp/huhu-initial-diff-focus-high；冻结keyboard.ts和必要DiffSurface/Multi/theme/fixture只读上下文，Root只读实际单组并行。无source/assets/state/Evidence/index写入，不委派。
## Acceptance
真实首次聚焦/Tab尚未Enter时也能按同owner/file/line/side保焦点，初次高亮/后续重画稳定；外焦/同shadow外控/异Doc/metadata/hidden/unmount取消，解绑onfocus与listener0，Enter/Shift/IME不改，无新引擎/sleep/循环refocus。有限真实负对照旧源仍红，新正控制过；source/DOM/native边界诚实，133其余已独立Source/目标/F7复用。准备最后正式66前给标准/规范各结论。
## Return
不可覆盖三节聚焦交接/产物与验证/问题与下一步REPORT，独立性、始末hashmode、逐症状结论、实际命令退出与局限，return0明确释放停止。
