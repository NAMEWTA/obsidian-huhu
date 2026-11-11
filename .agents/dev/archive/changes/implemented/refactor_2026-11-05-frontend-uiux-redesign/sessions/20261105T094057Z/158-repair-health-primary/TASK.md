---
schema_version: 2
session: "20261105T094057Z"
task: "158-repair-health-primary"
kind: implement
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-11"
---
## Goal
sol medium修体检恢复dialog同区双primary，只改备用操作外观。
## Inputs
AGENTS/dev/ui/testing、Map当前/Goal/Spec/DESIGN3/UI002，152最终图审已明确VIS01–03三类四位置（REPORT即将返回，Root已有确切源和截图），153/154另修通用focus，当前Root唯一matrix仍冻结，禁止实际写源。Root单写所有源/状态/产物，私有候选不扰当前输入；无新设计/领域决定。
## Workspace and Scope
repo完全只读，仅本REPORT与各task专用/tmp候选/过程，禁止实际源/资产/状态/Evidence/index/原报告/用户库/账号/clipboard/委派。不正式66/858/真正宿主。只按本task精确候选写集，其他只读；before/afterSHA/mode、ready.patch/manifest独占冻结不覆盖，Root等152/当前parent终结后批量应用。
## Acceptance
候选仅src/modules/health/ui/HealthPage.tsx（747–755）。继续事务保持主操作，恢复备份选择合适secondary（按已存在危险确认语义，不改授权/确认流程）；原handlers/busy/plan freshness/TTL/restore数据与所有状态不变，不写领域/新确认/新按钮组件/文案。低影响一prop不写镜像单测；既有Health DOM相关回归/截图验证真实分组，Root最终矩阵/原生。
## Return
不可覆盖三节REPORT，真实差异/调用/验证退出/未验边界；return0停写释放，不裁定本票/整个T14通过。四个155–158可同一medium依次完成，各自报告/冻结包独立，不能跨ticket夹带。
