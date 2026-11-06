---
schema_version: 2
session: "20261105T094057Z"
task: "156-repair-notification-panel"
kind: implement
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-04"
---
## Goal
sol medium移除违反批准设计的通知二级栏，保现有main toolbar与路由/来源/计数。
## Inputs
AGENTS/dev/ui/testing、Map当前/Goal/Spec/DESIGN3/UI002，152最终图审已明确VIS01–03三类四位置（REPORT即将返回，Root已有确切源和截图），153/154另修通用focus，当前Root唯一matrix仍冻结，禁止实际写源。Root单写所有源/状态/产物，私有候选不扰当前输入；无新设计/领域决定。
## Workspace and Scope
repo完全只读，仅本REPORT与各task专用/tmp候选/过程，禁止实际源/资产/状态/Evidence/index/原报告/用户库/账号/clipboard/委派。不正式66/858/真正宿主。只按本task精确候选写集，其他只读；before/afterSHA/mode、ready.patch/manifest独占冻结不覆盖，Root等152/当前parent终结后批量应用。
## Acceptance
候选仅Root共享compose-workbench.ts与其相邻test（先准确接口影响），不改通知领域/服务/实际InboxPanel。DESIGN§4通知不显示二级栏；现compose notifications panel重复Unread/All，navigation.children亦有两项，须追真实WorkbenchSurface panel fallback，不能只删panel后又自动从children生栏。保快速导航/section路由/toolbar筛选与轨道/状态badge，若children纯导航元数据无panel可以保留；若必须调整children则用现有toolbar/直接路由承接，不添长期compat。现有surface/compose测试覆盖通知无panel/正常路由与相邻页面panel仍保，实际生产nativeRoot最终87与专图重跑。不要新写一套导航或全局禁panel。
## Return
不可覆盖三节REPORT，真实差异/调用/验证退出/未验边界；return0停写释放，不裁定本票/整个T14通过。四个155–158可同一medium依次完成，各自报告/冻结包独立，不能跨ticket夹带。
