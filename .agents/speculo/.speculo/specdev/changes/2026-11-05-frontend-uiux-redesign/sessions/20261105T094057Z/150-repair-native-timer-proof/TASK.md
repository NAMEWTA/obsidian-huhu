---
schema_version: 2
session: "20261105T094057Z"
task: "150-repair-native-timer-proof"
kind: implement
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-14"
---
## Goal
sol medium只修148 NATIVE01：真实Safe驱动second-copy timer下界验收缺口，不改产品或时钟。
## Inputs
AGENTS/dev/ui/testing、Map56/Goal/T14，148 REPORT唯一P2及 /tmp/huhu-native-acceptance-high 纯Node反例。144九源已Root应用后148冻结已释放，当前host-boundaries.mjs SHA dfd1b94662851caffc7c1919b7f015f71eab8902de6973734318b6ef4e4c1ef2/mode0644。原其余8源结论有界复用，原实际30s产品timer未疑错，缺的是驱动下界。
## Workspace and Scope
repo只读，仅本REPORT与/tmp/huhu-native-timer-proof私有候选，唯一候选scripts/ui-review/fixtures/frontend-redesign/integration/host-boundaries.mjs。Root单写应用；不动8其它probe/产品/producer/clock/timeout常量/状态/Evidence/index/原报告，不build/正式native/858/委派/用户clipboard。可纯Node受控时钟模型跑原片段正负，不冒真正timer通过。
## Acceptance
记录第二次真实copy已完成时刻，原15s recopy与old timer不误清风险保留，第二次30s前明确nonce仍在并以实际elapsed下界/合理上界校验清空。测量允许有限本地轮询/调度容差且解释，不把18s或旧owner30s错误模型当绿；实际产品CLIPBOARD_CLEAR_MS不改、不fakeClipboard/加速时钟，不循环重试copy。用直接原脚本片段/导出小函数的纯Node控制验证correct30s绿、18s红、oldowner红、late红，避免新复杂计时框架。其它Safe/modal/lock/hidden/migrate/close/restart/assert/currentreceipt保持。Root最终独立Xvfb假记录真实时间再跑。before/afterSHA/mode/ready.patch/manifest独占冻结，不覆盖148/144候选。
## Return
不可覆盖三节REPORT，真实差异/命令退出/模型与未验；return0停写释放，不称T14或真实clipboard通过。
