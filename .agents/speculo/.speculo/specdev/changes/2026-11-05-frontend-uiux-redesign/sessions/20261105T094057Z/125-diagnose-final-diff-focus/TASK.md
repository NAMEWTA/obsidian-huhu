---
schema_version: 2
session: "20261105T094057Z"
task: "125-diagnose-final-diff-focus"
kind: implement
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-16"
---
## Goal
medium沿102原focus修复诊断T16最终66后原生键盘失败，先判真实产品问题或driver过早观测，再私有最小候选；repo只读，Root单写。
## Inputs
AGENTS/dev/ui/testing、Map47/Goal/Spec/T16/DESIGN3/UI002摘要49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66。你102/105原WeakMap+rAF focus修复及控制未变；Root新真实ThemeRuntime helper81b451ca...经120/122独立审。/tmp/huhu-t16-current-native原1case+完整exercise passed，但/tmp/huhu-t16-lead-theme-final/result.json 66全case passed后exercise第172行失败：主Doc Enter copy bar已出现，立即proof keyboardFocus undefined/outline none，before真active DIFFS-CONTAINER和gutter，resources293 created/291terminated/live2。完整错误/PNG保留，不覆盖。
当前代码keyboard.ts在postRender后rAF恢复，并有owner/隐藏/用户移动/身份守卫；driver只等copy bar后立即读取shadow.activeElement。既可能读在恢复rAF之前，也可能真实连续重画丢焦。不能猜根因，实测同operation timeline/microtask/frame和真实当前activeElement，明确区分。不要先改生产/塞sleep/重试点击/放宽focus断言。
## Workspace and Scope
repo全只读，仅本REPORT+/tmp/huhu-final-diff-focus；必要候选限src/modules/versioning/ui/diff/keyboard.ts、src/modules/versioning/ui/DiffSurface.tsx、就近review-repairs.dom.test.tsx/相应真实控制、Root拥有T16 index.mjs（私有patch）；MultiDiffView只读，不复制引擎。保存真实before字节/hashmode、冻结proposed/patch，交付后不覆盖候选。
不跑正式66/全仓/真vault/系统服务，不碰其它Root正在跑的T09/T11/T12矩阵。可私有单case做等价先前churn/原完整exercise+真实Chrome trusted keys，保全部focus/2px outline、ShiftRange/IME、external focus不抢、多Doc、unmount listener0断言。
## Acceptance
用实际事件/时序配对证明根因。若仅driver读取在既定rAF前，最小等真实生命周期完成/两帧稳定再同严格断言，不能轮询到一次偶然focus就称稳定；负控制在真正产品丢焦时仍失败。若产品真实丢焦，修原owner/focus契约而非延时/循环，回原库生命周期保持库复用。Source/driver归因诚实，原66失败仍保留；新候选须原风险和正常控制均过。
## Return
不可覆盖REPORT三节聚焦交接/产物与验证/问题与下一步，真实症状/事件与时间线/单变量红绿/未知、命令退出、冻结before/afterSHA/mode/私有边界，return0停止。
