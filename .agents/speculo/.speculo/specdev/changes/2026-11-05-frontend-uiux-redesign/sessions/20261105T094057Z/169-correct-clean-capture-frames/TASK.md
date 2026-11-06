---
schema_version: 2
session: "20261105T094057Z"
task: "169-correct-clean-capture-frames"
kind: implement
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-14"
---
## Goal
sol medium 接受168发现166原helper在无效帧更新previous，实际可能仅2个净帧拍图，精确满足关闭/动画清零后3个稳定帧；仅一个QA脚本最小hunk，不改产品或预算。
## Inputs
168发现Rootautomations trace末3帧closing=[2,0,0]，当前三坏图已正常不是新产品故障；166真实helper源码after46fcf0555a856ec7388867a3a199963c92ceda551e0a6eb951b94105c653108a/mode0664，Root已应用并真正87通过（/tmp/huhu-root-final3-host-workbench-stable），所有固定3产物未变。168会完成request-changes并释放，Root之后才应用本候选。
## Workspace and Scope
仓库只读，仅本REPORT与/tmp/huhu-canonical-clean-frames候选；唯一文件scripts/obsidian-acceptance/workbench-probe.mjs。不得正式源/状态/Evidence/index/旧report/包/产物/原型，不委派，不build/正式native/66/858。只私有helper正负控制与Nodecheck/gitapplycheck；Root同产物自己复跑87并交独立审，不需你重复native-03。
## Acceptance
在closing或finite animation存在帧清除previous（或等价最小明确逻辑），之后至少连续3个全部有效且几何相同帧才capture；任何无效或几何变动断连续。原共享15s deadline、finite检测/原动画/87/48输出/overflow/错误不变。纯Node从实际helper提取段验证：无效→净1→净2不得拍，净3可拍；中间无效/geometry变动重置；永久closed/持续移动超时仍不拍；无需通用框架/永久镜像测试。保原166/168历史准确，不称原两净帧画面坏或产品修复。
独占ready.patch/manifest beforeafterSHA/mode/gitapplycheck0，实际报告差异和控制。Root等168释放后单写应用、原生87与高审，不提前passT14。
## Return
不可覆盖三节REPORT/命令退出/原样边界/未验；return0后停读写释放。

## Root 接受同helper的预算边界修订

168直接提取真实helper的负控显示3次evaluate各5s，第三帧在deadline15000返回仍会拍。纳入本169最小修法：await采样后及开始runtime.shot前检查同一个原deadline，已过期走现有timeout，不扩预算；不要求截图RPC完成也落在ready预算内。补真实控制确认到期/跨期不拍，净3帧原预算内可拍。
