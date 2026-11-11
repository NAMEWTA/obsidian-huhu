---
schema_version: 2
session: "20261105T094057Z"
task: "121-repair-theme-fixture-retry"
kind: implement
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-12"
---
## Goal
medium修复120已实证T12 fixture故障注入接缝，repo只读/tmp冻结候选，由Root单写合入；不改变生产/规范。
## Inputs
AGENTS/dev/ui/testing、Map46/Goal/Spec/T12，DESIGN3/UI002摘要49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66。120当前14源仍high冻结，不能改repo。高审真实红/tmp/huhu-final-seams-high/t12-failure/result.json：trusted reduceMotion后原persistent save failure超时，motion=reduce、ownerStoreStatus=idle、alerts=[]、oneTheme=true。Root已应用117 shared/helper/T12共享theme，故owner.fail只影响旧owner.store，真正ThemeHandle在fixtureTheme.settings另一个真实store。117仅theme探针绿未原T12exercise，不能叫原失败重试门通过。
## Workspace and Scope
repo全只读，仅本REPORT+/tmp/huhu-theme-fixture-retry；精确候选scripts/ui-review/fixtures/frontend-redesign/shared/fixture-theme.ts、T-12/index.tsx及必要T-12/index.mjs状态oracle。保真实before/hashmode/proposed/patch；交付一经ready完全冻结不可覆盖，用新文件名迭代。无source/assets/state/Evidence/index写入，不委派/66/真实用户数据。
## Acceptance
故障注入接到UI与ThemeRuntime共用真实SettingsStore.save；失败保最新主题草稿，明确Retry经同一个handle实际持久化/状态/错误清除，driver不看无关旧store.status。保一真ThemeHandle、原explicit Retry与失败断言，不回镜像、不删风险、不造主题引擎。shared helper新增故障能力默认false，T09/T11/T16其它语义不变；正确hostKeys模块作用域。
按当前真实source+私有overlay先复现原红再同一单变量绿，跑原T12完整exercise+1case；可加真实store失败状态/实际成功save次数对照（内存边界），不将仅alert关闭算persist通过。定向typeconfig含src d.ts且typeRoots指repo，避免丢ambient的伪错误。
## Return
不可覆盖REPORT三节聚焦交接/产物与验证/问题与下一步，逐症状归因/命令退出/冻结before+after SHA/mode/原风险映射/私有与真实workspace区别/未做66边界。return0释放。
