---
schema_version: 2
session: "20261105T094057Z"
task: "167-observe-shell-click-identity"
kind: implement
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-04"
---
## Goal
sol medium 根据165因果未定报告，仅为下一必要原T04全66增加精确失败当次click/节点身份/Alert开闭观测，保持原行为断言/预算，不凭未复现修产品。
## Inputs
165 REPORT及/tmp/huhu-final-shell-focus-diagnosis/diagnostic-manifest.json、trace-summary、run2-first5，当前正式failed T04 result。原失败active button失去review，不能判仅focus/flake；私有前5组20click全部正常。当前第二轮matrix其余票仍执行，所有生产/QA源冻结。
## Workspace and Scope
仓库只读，仅本REPORT及/tmp/huhu-shell-click-observation候选；唯一候选scripts/ui-review/fixtures/frontend-redesign/T-04/index.mjs。正式原driver beforeSHA必须准确，生产TSX/source/assets不动；不build/正式66/858/native、不委派。Root收到候选/高审后在当前父matrix结束释放输入才应用，并作为下一正式T04原66必要运行，新增方法而非盲重试。无需造新测试框架/镜像产品行为。
## Acceptance
从165私有诊断收敛最小监听：只Keep editing步骤本ownerDoc的pointer/mouse/click与focus、Alert节点/状态/目标身份，记录操作前、点击前后及失败当次；每次立即登记finally abort/disconnect，事件上限有界，不能泄露草稿/用户内容或改变focus/DOM/业务。原click/CDP路径、Keepediting关闭+exact draft focus/dirty+discard/2Doc/两motion/全部66及原超时不变，原fail抛出。可额外准确要求点击target身份/回调事件不丢，不能靠删断言/重试/延时/强制focus/手动close换绿。用实际现成私有前5诊断证明观测能分辨正常buttonidentity/Alert关闭；对观测收集/清理做必要限定控制或Nodecheck，避免冗长无效框架。候选只有一个driver精确hunk，ready.patch/manifest beforeafterSHA/mode独占冻结，gitapplycheck0，完整无法复现边界保留，不宣称原缺陷已修复。Root正式66保留本次丰富trace用于判因；不预先宣布T04/T14pass。
## Return
不可覆盖三节REPORT/精确行为未变/观测与清理/输入与命令退出/未验；return0停读写。166只修原生截图另一QA文件，不触碰。
