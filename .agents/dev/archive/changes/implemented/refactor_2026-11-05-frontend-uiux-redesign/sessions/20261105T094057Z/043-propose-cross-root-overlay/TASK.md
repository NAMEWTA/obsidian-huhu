---
schema_version: 2
session: "20261105T094057Z"
task: "043-propose-cross-root-overlay"
kind: implementation
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-04"
---
## Goal
由既有gpt-6.1-sol medium准备跨React根弹层层级修复候选，Lead负责正式共享源集成。只写私有候选/证明，不改当前共享工作区源；不委派。
## Inputs
T04实际src/shell/cross-root-overlay.dom.test.tsx反例与/tmp/huhu-t04-implementation/cross-root-menu-red.log：独立导航React根物理进入NavSheet后，Dropdown层31低于Sheet40。读取当前modal-layer/Popover/Menu/Tooltip/Portal/provider及真实调用；批准DESIGN3和dev/ui/I规则。T03日期12路径冻结，独立审查正在核对其证明；禁止干扰。
## Workspace and Scope
current main37fcede4210a19bcc2a74809e7fdd301e5717957。仓库所有业务/配置/资产/依赖/测试源只读，仅本REPORT可写；候选代码、补丁、临时定向测试/构建在/tmp/huhu-cross-root-overlay-proposal。不得新工作树、安装、修改node_modules/Git/正式状态。共享源最终由Lead单写。
## Acceptance
沿真实反例比较局部方案，选择最小充分修复并产出可应用patch、固定原始摘要和真实红绿。复用现有Document modal stack、严格owner/可见性和Radix；逻辑层级应从实际触发/内容所属区域推导，覆盖Dropdown/Popover/Tooltip/ContextMenu实际相关入口。不得盲目把同Document所有popup提高到另一个无关modal之上，不新建trap/全局焦点引擎或第二设计系统。上下文不能跨React根是事实，不靠Shell私有z覆盖。
在私有代码上使原独立根反例和配对普通/同根/多Document/关闭与owner销毁控制通过；支持新候选未来独立high复审。使用真实组件/当前守卫，不把mock样式当浏览器层级验证。若暂时只有DOM证明，明确留下真实浏览器命中/Esc门。提出任何必需额外共享路径及原因，绝不自行写入。
## Return
一次写REPORT，含## 聚焦交接、## 产物与验证、## 问题与下一步，候选patch/原始SHA/真实验证/未验证项和Lead集成接缝。仅候选，不宣布T04或Goal完成。
