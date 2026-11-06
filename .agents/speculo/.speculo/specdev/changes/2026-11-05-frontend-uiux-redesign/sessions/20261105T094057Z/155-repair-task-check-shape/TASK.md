---
schema_version: 2
session: "20261105T094057Z"
task: "155-repair-task-check-shape"
kind: implement
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-05"
---
## Goal
sol medium修任务完成checkbox圆形/18px一致性，复用现有Radix Checkbox，不造新控件。
## Inputs
AGENTS/dev/ui/testing、Map当前/Goal/Spec/DESIGN3/UI002，152最终图审已明确VIS01–03三类四位置（REPORT即将返回，Root已有确切源和截图），153/154另修通用focus，当前Root唯一matrix仍冻结，禁止实际写源。Root单写所有源/状态/产物，私有候选不扰当前输入；无新设计/领域决定。
## Workspace and Scope
repo完全只读，仅本REPORT与各task专用/tmp候选/过程，禁止实际源/资产/状态/Evidence/index/原报告/用户库/账号/clipboard/委派。不正式66/858/真正宿主。只按本task精确候选写集，其他只读；before/afterSHA/mode、ready.patch/manifest独占冻结不覆盖，Root等152/当前parent终结后批量应用。
## Acceptance
候选先报准确路径：TaskPage.tsx与calendar/TaskRow.tsx（本票原写集），必要HomePM ProjectBoard.tsx由Root补精确shared，先实际分类它是todo/milestone完成还是普通设置，不按所有Checkbox泛改。DESIGN§5：18px、默认圆角4，任务为圆形，保存中虚线。TaskPage现仅pending border-dashed无圆形；calendar任务completion同义需一致；PM现size14应至少回已批准18，是否task圆形按真实todo/milestone语义说明。非任务布尔设置/filter/全选checkbox仍方。保callbacks/checked/disabled/ARIA/pending/TaskContent metadata/所有领域格式，class组合最小，不新增shape框架/依赖/仓库。用当前真实组件/临时fixture确认任务borderRadius≥视觉宽一半、18px、pending虚线及false/true/disabled，不新增只检class字符串的镜像测试；必要既有task/calendar/PM DOM+CSS验证。只私有精准候选，矩阵Root最终跑。
## Return
不可覆盖三节REPORT，真实差异/调用/验证退出/未验边界；return0停写释放，不裁定本票/整个T14通过。四个155–158可同一medium依次完成，各自报告/冻结包独立，不能跨ticket夹带。
