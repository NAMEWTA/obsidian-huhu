---
schema_version: 2
session: "20261105T094057Z"
task: "100-implement-t10-diary-notes"
kind: implementation
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-10"
---
## Goal
sol medium完整实现T10日记/导航器/批注/原生编辑器侧栏宿主垂直替换，严格批准UI002与全部现有能力；不只交计划、不保旧UI兼容。
## Inputs
先读workspace/catalog/AGENTS/dev/ui及适用参考（尤其editor-comments），SpecDev I/Map37/Goal/Spec/T10/DESIGN3/UI002/frontend-coverage。设计摘要49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66；dev0c2a3309d1b00920539376a02c98485a98442c002945f0ee2e6ce8b816cfb744、ui12621917181e3a74f3a410a710752e8e856d9a84af739ef6c97c85f79bca1ad4。用户medium实现/high独立审查全部16票、严格UI002、不随意发挥/造引擎。
T01/02/03/04/15及T05已done，T05最终094两轴+66/2583输入无漂移，允许消费CalendarMonth/TaskComposer/ProductCalendar/TaskContent实际导出。前置Navigator Calendar调用按新生产者迁移，所有周期/周条/周号/今天/current/hover/modifier-open/显式创建保留。T16 source已095独立通过，api提供版本页，你只负责editor panel-host外壳不重写Git/差异。
085纯UI词典懒加载预算已089独立通过；Map37释放navigator/ui/settings-page.tsx写权给你（原仅Root注册词典，现需要完整UI迁移），ui/i18n词典仍Root单写。另当前full lint旧债navigator/platform/vault-source.ts:45 unbound-method只读归后续T13；不要为过全仓改域外源。
## Workspace and Scope
仅T10 ticket writable：navigator/ui/**、comments/ui/**、comments/styles/**、app/editor-panel/**、comments-leaf.ts与dom、navigator-leaf.ts/NavigatorEmptyState.tsx、T10 fixture/**。所有词典由Root（发具体en/zh提案）；services/core/platform/api/persisted schema、Task/Home Calendar生产者、T16 UI、全局shared/theme/shell/build/config/资产/state/Evidence/index只读。先保存真实dirty baseline bytes/mode，检查入口调用/依赖并简列影响范围。无delegation/commit/push/worktree/node_modules/真实用户vault/clipboard。共享缺口精确提案Root，继续独立工作，不新造日期/树/焦点/diff引擎。
## Acceptance
AC091/093、UX-DIARY1/UX-NOTES1完整：书页/写作全部日/周/月/季/年与空日期；按已有page flip能力与批准书页token，搜索/切期/翻页/滚动/编辑状态，不改周期规则。导航树搜索/选中/日历/缓存/所有设置与生产力页面，旧commands/hover/拖拽/键盘/undo/实际文档打开不丢。批注完整创建/回复/孤立锚点/解决/删除确认、gutter/hover/reading/编辑器侧栏多窗口owner与释放；不写原笔记/改锚点业务算法，不改Markdown/CodeMirror内核。新共享Button/Badge/Date族/DetailPane及Radix唯一Portal，13/14/15字阶/≥12中文、2px focus/独立32/44 hit、spacing/color只批准--hu，清旧局部CSS与native date/datetime-local。全表单字段、校验、错误、取消、草稿与过期操作归属完整保留。
editor panel宿主批注/T16版本标签仅真实api装配/ownerDocument和主题，不复制版本页。hide与close/unmount生命周期有区别，迟到结果不污染新文件/新leaf，取消恢复保留原风险断言。复用真实service/api，不把mock图当服务/宿主通过。
按实际风险定向DOM/unit/types/lint与注释存储锚点/黄金样本（未改格式应保持）；重要行为用真实组件有意义红绿，不写镜像测试；旧选择器随新UI修改而业务断言保留。创建完整T10浏览器fixture，真实UI+内存host ports（主/第二Doc、1440/390全部状态）；worker只--check，Root跑66/真实Obsidian。全仓迁移债逐项台账，不提高门槛/兼容shim求绿。足够即冻结停止待high，不扩推测状态树。
## Return
/tmp/huhu-t10-implementation存真实baseline/candidate/完整差异、mode/hash与全部表面映射。不可覆盖REPORT含聚焦交接/产物与验证/问题与下一步，实际命令退出/来源/未测native或宿主边界/源删除风险承接。Root统一Evidence/state/产物。return验证0后停写待独立审查。
