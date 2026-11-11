---
schema_version: 2
session: "20261105T094057Z"
task: "098-implement-t08-home"
kind: implementation
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-08"
---
## Goal
按批准UI002完成T08首页完整垂直重构，同票迁移全部18widgets+14sections/配置/记录能力，不保留旧UI兼容。不做仅规划交付。
## Inputs
先读workspace/catalog/AGENTS/dev/ui与适用reference、SpecDev I；本change Map34/Goal/Spec/T08/DESIGN3/UI002和frontend-coverage/inventory。设计摘要49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66；dev0c2a3309d1b00920539376a02c98485a98442c002945f0ee2e6ce8b816cfb744、ui12621917181e3a74f3a410a710752e8e856d9a84af739ef6c97c85f79bca1ad4。用户明确sol medium实现/high独立审查全部16票，严格UI002、不自选风格、不从头造引擎。
前置T05已done：094独立双轴PASS、最终66/2583inputs无漂移，Evidence T05；CalendarMonth/TaskComposer/TaskContent/ProductCalendar已冻结，用实际导出。T01/02/03/04/15均done。核心来源src/modules/home/core/board/widget-table.ts，只读所有尺寸/多实例与域schema；DashboardPage→ThemeBridge→BoardCanvas/widgets/sections实际调用。061/065已验新UI规则，075/078共享dates/canClose未变可复用。Root当前T07/T09/T11/T16独立修复/检查分离。
## Workspace and Scope
current shared repo，仅T08 writable：src/modules/home/ui/**（明确排除calendar/**和所有i18n词典）、src/ui/components/huhu/analytics/**、T08 fixture/**与必要同范围测试。先保存真实dirty baseline原字节+mode，列最小写集/受影响调用。services/core/api/data只读；其它模块/全局shared/theme/shell/scripts/config、Root词典/产物/state/Evidence/index不写。无delegation、commit/push/worktree/node_modules/真实用户vault。共享缺口发精确类型/调用/路径提案Root，不能另造私有引擎。已有calendar全只读，不重复重构。
## Acceptance
完整交付AC071/072和UX-HOME1/2：问候区、12栏、统一卡片头/菜单、编辑手柄/移除/撤销/空板；react-grid-layout/resizable/dnd-kit现成复用。全部18widgets+14sections逐项表面/字段/动作对应：inbox内容捕捉处理不可跳通知代替，闪念便笺习惯记账阅读番茄，目录资料项目查询流程RSS媒体/缺失依赖/错误/删除确认/多实例/配置与ThemeStudio。域模型/保存格式/allowed尺寸/命令能力不变；--db仅--hu派生，不保留局部颜色体系。时间纯Date改DateField，绝不靠native date/datetime-local或伪epoch；Task UI用实际TaskContent/Calendar生产者。所有按钮/色/字号/焦点/44px独立hit与间距照UI002与现导出。
隐藏暂停昂贵刷新、ownerDocument/Portal与真正卸载清理、草稿失败/迟到/新board代际隔离；不因隐藏而破坏应保留draft或删功能。原真实字段/业务规则都保留，原型只代表模板。
新增文案先发具体en/zh键提案给Root，优先实际现有键，不将测试预载作为真实词典注册证明。按现有测试TDD重要行为，低风险同构替换不镜像堆test。至少真实BoardStore/DashboardPage的新布局编辑/取消/保存失败/正常控制，覆盖18+14全部state fixture（主第二Doc、真实UI、受控IO/no系统副作用），worker只--check不跑66、不改CSS/main产物。定向types/lint/模块DOM/unit与持久golden按实际风险，全仓图外迁移债明确台账，不放松断言求绿。足够即冻结候选，停止待high，不无限探索推测边缘。
## Return
完整真实baseline与candidate/差异/mode SHA在/tmp/huhu-t08-implementation，新增/删除说明及覆盖32项表面映射；不可覆盖REPORT含聚焦交接/产物与验证/问题与下一步、真实命令退出、来源引用、未测native/宿主。Root统一Evidence/state/build。validate-dispatch return后停止写入待独立审查。
