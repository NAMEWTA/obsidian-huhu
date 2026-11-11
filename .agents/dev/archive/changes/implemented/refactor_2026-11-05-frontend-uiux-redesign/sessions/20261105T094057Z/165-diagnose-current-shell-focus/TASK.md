---
schema_version: 2
session: "20261105T094057Z"
task: "165-diagnose-current-shell-focus"
kind: implement
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-04"
---
## Goal
sol medium 只读诊断最终新输入T04第二Document Keep editing focus失败，精确区分driver实际点击/产品焦点与调度，不猜成flake、不盲重试或删断言。
## Inputs
Map59/Goal/DESIGN3/UI002/dev/ui/testing；当前/tmp/huhu-t14-root-final3-artifacts三manifest固定；当前新整体matrix/tmp/huhu-t14-root-final3-matrix仍执行其它子票。T04在children-eQduAX/T-04/result.json failed5组，390 en paper，Error Timed out second Keep editing focus（index.mjs558）。trace在末case actions keep-editing-failure。第1旧输入整体13*66结果全部passed但父tool晚回收143，历史边界保持。不复用旧passed称当前通过。
## Workspace and Scope
repo只读，仅本REPORT及/tmp/huhu-final-shell-focus-diagnosis。Root源/资产/QA冻结，高164只读图审，不改源/脚本/状态/Evidence/index/旧报告、不build正式资产、不新整套66/858/native、不委派。可独立最小私有fixture限定失败1组真实生产组件/同driver配对，CPU负载当前3Chrome但不增加全矩阵。先消费完整trace/源调用后确定最小需要，读取失败图必要时view_image。
## Acceptance
给出明确可复现因果、预期/实测，当前源与driver精确SHA、是否可信点击落点/动画/跨Doc失焦/产品focus顺序。只调试必要单组，不扩大timeout/重试换绿、不将CSS可见focus改动推定事件行为。若源码/driver需修复先报告精确文件/最小hunk与依据，未经Root接受不在此改正式源。可私有补诊断而不弱化原合同。若输入不变的环境/事件竞争，应有真实trace与对照，不能仅单次再跑过就判flake。结论和未验准确。
## Return
三节不可覆盖REPORT/输入/实际命令/失败与结果/下一步；dispatch/return0后停读写释放。不裁定T04/T14通过。

## Root 有界范围补充

接受在私有候选按原前5组顺序执行一次完整verify/原timeout与eventtrace，用于检验第5组序列依赖；不是66矩阵，不裁通过或推定flake。单组fresh未复现是事实，仍需给真实因果或保持未确定。
