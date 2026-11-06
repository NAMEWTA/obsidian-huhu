---
schema_version: 2
session: "20261105T094057Z"
task: "086-repair-t05-review"
kind: implementation
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-05"
---
## Goal
修084已验证三个P2，最小TaskPage生命周期/窄屏状态分段改动；不要重做066/071/080或Root29预算改动。
## Inputs
AGENTS/dev/ui/SpecDev I及适用测试合同；Map29/Goal/Spec/T05、DESIGN3/UI002摘要49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66。dev新SHA0c2a3309d1b00920539376a02c98485a98442c002945f0ee2e6ce8b816cfb744，ui12621917181e3a74f3a410a710752e8e856d9a84af739ef6c97c85f79bca1ad4。用户medium实现/high审查/全部16票授权。
完整084REPORT SHA1de8290b7d8ab249576e47ebae4d99e0ad2ccaedb7664c9e3edb3c429025f562及/tmp/huhu-t05-high-review/page-lifetime.dom.test.tsx真实TaskPage+TaskService反例（仅外部execute延迟）：稳定selectedId深链A时Close/本地切B被effect旧A重开；Alpha completion pending切Beta查询后held追加Alpha污染Beta；本地普通关闭与不换query正控制绿。第三项Lead真实/tmp/huhu-t05-lead-hit-final/result.json/failure.png：320fine scrollWidth365>320，TaskPage状态SegmentedControl未用已有wrap。084已明确释放52输入。
Root29已合入task纯UI错误词典，仅ui/i18n.ts/workbench-page.tsx入口注册+i18n/script接缝，TaskPage未变。以当前dirty字节为起点；不要将这组Root变化算自己。080 day/TaskRow已修命中，43原候选在/tmp/huhu-t05-hit-repair，原ProductCalendar/TaskRow不再改。共享日期/strict service已078pass，T06正式66已通过。
## Workspace and Scope
仅TaskPage.tsx及必要最近DOM回归（可新增相邻测试）；若fixture确有同步需要先交Root，不自行放宽native断言。REPORT及/tmp/huhu-t05-review-repair。Root独占i18n/ui/i18n/workbench-page预算入口、共享组件、资产/脚本/正式状态；不改core/services/api、其它票、node_modules/index/worktree/提交/vault，不委派。
## Acceptance
真实深链与本地选择单一事实源，关闭不被同一未变化selectedId立即重开、切本地记录不回旧A；外部新的route请求与异步加载到达仍能正确定位，不仅删effect依赖躲问题。 pending completion只作用原查询/selection owner，切search/filter/view后不得注入旧record或影响新detail；取消/错误/晚到结果保持真实服务与undo原协议，不新造业务store。
状态分段直接复用共享wrap能力，使320fine/390coarse/字体与200%不全页横溢，保留四选项计数/可达键盘/选中状态与批准样式，不隐藏Overdue、改基础组件或删页宽断言。原private2red/2green转绿，补必要route/query边界，108 owned等无变化证据可复用，选择适用DOM/types/lint并诚实记录图外旧迁移债；worker仅--check或必要单组诊断，Root最终66。修复充分即冻结，不扩推测scope。
## Return
不可覆盖REPORT含聚焦交接/产物与验证/问题与下一步、逐项红绿/命令退出/限制、真实baseline/完整候选源模式hash与新增删除。原始code/log/JSON/PNG/hash仅/tmp。Root写正式Evidence/state/资产；return校验后停止供high。
