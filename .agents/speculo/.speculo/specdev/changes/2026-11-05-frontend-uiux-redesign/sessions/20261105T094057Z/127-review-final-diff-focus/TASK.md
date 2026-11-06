---
schema_version: 2
session: "20261105T094057Z"
task: "127-review-final-diff-focus"
kind: review
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-16"
---
## Goal
high独立审125真实连续重绘焦点修复，复用105/095其它结论；顺便实际测量Shadow行号目标是否满足严格NFR002。
## Inputs
AGENTS/dev/ui/testing、Map48/Goal/Spec/本票、DESIGN3/UI002摘要49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66；用户medium实现/high审持续。
125 REPORT SHA0eadeafb48b40fff85f97b89ecc71321f4ad6da0940ecd5aa02deff24eaec363；/tmp/huhu-final-diff-focus/candidate-manifest.json两源已Root按before+afterSHA/mode精确合入。真实timeline两次postRender，旧rAF第一次release后第二次删焦，第二paint仍红；新postRender全部绑定后同步恢复、持有owner到外移/identity/隐藏/unmount，不循环不延时。旧产品+新两帧严格driver仍红，候选完整exercise/晚forceRender/Shift/IME/外焦/隐藏/identity/cleanup绿、types/lint0。
## Workspace and Scope
repo只读，仅本不可覆盖REPORT+/tmp/127-review-final-diff-focus；不委派/真数据/state/Evidence/assets/index写入。冻结keyboard.ts与T16 index.mjs及必要真实FileDiff上下文，repo源码只读。Root正式第二轮66全case过但exercise172失败，原结果保留在/tmp/huhu-t16-lead-theme-final。
## Acceptance
焦点必须连续paint稳定与2px outline，不能抢其它owner/line/identity/隐藏用户焦点，off/unmount资源0；原真实负控制仍能失败。另有限实测实际Shadow .huhu-diff-gutter clickable role=button rect fine/coarse，源码lineHeight22未在旧DOM常规button guard范围，DESIGN453/NFR002严格32/44无已知豁免；若不足客观列finding与最小解除条件，不默认inline例外、不改代码。不要无限扩树，不跑66/全仓。
## Return
三节聚焦交接/产物与验证/问题与下一步，独立性/始末hashmode/drift/逐轴结论/实际命令退出/局限，return0明确释放停止。
