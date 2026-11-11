---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: "ticket"
ui_change: true
design_ref: {"revision": 3, "digest": "49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66", "pages": ["tasks"], "acceptance": ["UX-TASK-1", "UX-TASK-2", "UX-TASK-3"]}
change: "2026-11-05-frontend-uiux-redesign"
id: "T-05"
title: "任务与日历：统一完成态、视图与详情"
status: "done"
kind: "feature"
planning_depth: "standard"
planning_depth_reason: "按模块隔离写集的垂直替换切片"
ready: true
risk: "medium"
blocked_by: ["T-03", "T-04", "T-15"]
contract_ids: ["AC-023", "AC-041", "AC-042", "AC-043"]
owner: "native:/root/cleanup_final"
expected_changes: ["<Path>src/modules/task/ui/</Path>", "<Path>src/ui/components/huhu/calendar/</Path>", "<Path>src/modules/home/ui/calendar/</Path>"]
writable_paths: ["<Path>src/modules/task/core/time.ts</Path>", "<Path>src/modules/task/core/time.test.ts</Path>", "<Path>src/modules/task/ui/**</Path>", "<Path>src/ui/components/huhu/calendar/**</Path>", "<Path>src/modules/home/ui/calendar/**</Path>", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-05/**</Path>"]
read_only_paths: ["<Path>src/modules/task/api.ts</Path>", "<Path>src/modules/task/services/**</Path>", "<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/DESIGN.md</Path>", "<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/prototypes/UI-002/design-system.md</Path>", "<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/prototypes/UI-002/final/**</Path>"]
shared_paths: ["<Path>src/modules/task/i18n.ts</Path>", "<Path>main.js</Path>", "<Path>styles.css</Path>", "<Path>src/shared/i18n/lazy/calendar.ts</Path>", "<Path>src/modules/home/i18n.ts</Path>", "<Path>src/ui/components/huhu/date/Calendar.tsx</Path>", "<Path>src/ui/components/huhu/date/Calendar.dom.test.tsx</Path>", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-03/**</Path>", "<Path>src/ui/components/huhu/date/DateTimeField.tsx</Path>", "<Path>src/ui/components/huhu/date/DateTimeField.dom.test.tsx</Path>", "<Path>src/modules/task/core/calendar.ts</Path>", "<Path>src/modules/task/services/calendar.ts</Path>", "<Path>src/modules/task/services/calendar.test.ts</Path>", "<Path>src/ui/components/huhu/date/DateField.tsx</Path>", "<Path>src/modules/task/ui/i18n.ts</Path>", "<Path>src/modules/task/ui/workbench-page.tsx</Path>", "<Path>src/modules/home/ui/pm/ProjectBoard.tsx</Path>"]
shared_path_owners: ["<Path>src/modules/task/i18n.ts</Path> => Lead", "<Path>main.js</Path> => Lead", "<Path>styles.css</Path> => Lead", "<Path>src/shared/i18n/lazy/calendar.ts</Path> => Lead", "<Path>src/modules/home/i18n.ts</Path> => Lead", "<Path>src/ui/components/huhu/date/Calendar.tsx</Path> => Lead", "<Path>src/ui/components/huhu/date/Calendar.dom.test.tsx</Path> => Lead", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-03/**</Path> => Lead", "<Path>src/ui/components/huhu/date/DateTimeField.tsx</Path> => Lead", "<Path>src/ui/components/huhu/date/DateTimeField.dom.test.tsx</Path> => Lead", "<Path>src/modules/task/core/calendar.ts</Path> => Lead", "<Path>src/modules/task/services/calendar.ts</Path> => Lead", "<Path>src/modules/task/services/calendar.test.ts</Path> => Lead", "<Path>src/ui/components/huhu/date/DateField.tsx</Path> => Lead", "<Path>src/modules/task/ui/i18n.ts</Path> => Lead", "<Path>src/modules/task/ui/workbench-page.tsx</Path> => Lead", "<Path>src/modules/home/ui/pm/ProjectBoard.tsx</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "0c2a3309d1b00920539376a02c98485a98442c002945f0ee2e6ce8b816cfb744", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}, {"id": "ui", "path": "<Path>.agents/skills/ui/SKILL.md</Path>", "sha256": "ae158ca873e740b9f90a5247e53a92b994306d1b9d0efb628f7d18ff59bf7ebb", "phase": "implement", "operation": "apply-workbench-ui-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景", "change DESIGN 与 UI-002 原型"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---
# Ticket T-05: 任务与日历：统一完成态、视图与详情

- **总体 Map：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/tickets-map.md</Path>`
- **Goal Plan：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/goal-plan.md</Path>`
- **上游 Spec：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/spec.md</Path>`
- **设计合同：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/DESIGN.md</Path>`
- **完成 Evidence：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/evidence/T-05.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

任务页按 DESIGN §6 tasks：列表分组、看板、日历、工具栏（搜索/完成状态/日期范围/排序）、右详情自动保存；所有入口使用 TaskContent 完成态；日期字段改为 DateField 族。

来源：Spec 对应章节与 AC；DESIGN §3–§7；交付包 `source/Frontend_Refactor_Plan.md.txt`（§5、§7、§9）。

## 行为与范围

IN：TaskPage、TaskEditor、TaskEditorForm、共享 TaskRow、首页日历组件；提交中/失败/撤销；同票删除旧完成态样式与原生日期输入。

REUSE：`src/ui/components` 唯一实现、现有模块 `api.ts` 服务与命令、`src/ui/react/portal.ts`、`shared/feedback`。

OUT：首页其他小组件（T-08）；任务服务与重复规则（OOS-001）。

## 验收标准

- [x] `AC-041`：满足 Spec 验收合同 AC-041 的可观察结果。
- [x] `AC-042`：满足 Spec 验收合同 AC-042 的可观察结果。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 完成态与筛选 | DOM | `pnpm exec vitest run --project dom src/modules/task src/ui/components/huhu/calendar` | 通过（退出码 0） | `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/evidence/T-05.md</Path>` |
| 任务服务回归 | 单元 | `pnpm exec vitest run src/modules/task` | 通过（退出码 0） | `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/evidence/T-05.md</Path>` |

- **E2E disposition：** required：tasks 页全部状态 1440/390。
- **运行环境：** change README 选定的 change-workspace；所有执行者复用同一工作区。

## 执行约束

依赖、深度、路径所有权与 Skill 绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码与调用方。共同约束见 Map §1“总体实施背景”。同票删除被替换的旧实现、旧样式与旧测试选择器（ADR-001、DEC-001）；删除测试时说明原风险由哪个新测试承接。验证遵循 Map 的原子集成合同：本票检查必须通过，共享 API 切换导致尚未迁移消费者的已知整体编译错误逐条记账；T-13 前全部消除，T-14 全量 build/lint 必须通过。产物由 Lead 统一处理。

设计绑定：change DESIGN revision 3（designDigest `49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66`），页面 tasks，验收 UX-TASK-1, UX-TASK-2, UX-TASK-3。实现只读遵循 DESIGN 与 UI-002 final，不重选风格；完成时在 Evidence 写 Design Conformance（与原型的差异、视口、截图本地路径）。

## 未决事项与风险

复审风险与解除条件已写入本票补充合同与验证方法；不沿用初版无风险判断。

### 状态说明

复审问题已落实到 DESIGN revision 3、覆盖清单与本票补充合同；UI-002 与 DESIGN revision 3 已由用户确认（LOG-014，`prototypes/UI-002/approval.md`），DoR 已回读，规划 DoR 已满足；执行状态以 frontmatter 为准，按 Goal Plan 的既有授权、依赖与验收门推进。

### 未决问题

无。

## 实施补充合同（DESIGN revision 3）

以 task/core/model.ts TaskFields 为准，不引入 project/priority/tags。列表/看板/日历只是日期、状态与关联投影；保留 cancelled、recurrence、planDate、reminderAt/timezone。任务表单的晚到回执不能覆盖新草稿。

本票 fixture 入口：`scripts/ui-review/fixtures/frontend-redesign/T-05/`（T-01 使用 shared）。T-01 完成 runner 后执行 `node scripts/ui-review/run.mjs --suite frontend-redesign --ticket T-05 --matrix redesign --out /tmp/huhu-frontend-redesign/T-05`。任何尚未实现的 CLI 参数不记为已通过。

- [x] `AC-043`：满足 Spec 中新增合同及本票的表面责任。

### DateTime领域校验责任（018预检）

追加AC-023的真实DST集成验证。只最小扩展上述现有时间候选解析接缝及相邻测试，为新DateTimeField的caller-owned validateValue提供opt-in严格拒绝不存在/重复墙上时间的能力；不复制或重写时区算法，不改变内部调度默认策略、已有数据schema或既有调度测试。模块UI适配以本模块core接缝验证并转换，泛型ui不得反向导入模块。对应UI显示本模块en/zh错误并阻止非法提交，错误保留草稿。

覆盖America/New_York 2026-03-08 02:30缺失、2026-11-01 01:30重复均被新交互明确拒绝，以及UTC/Asia/Shanghai正常值；已有内部earlier策略回归保持。必须真实函数与生产表单/服务入口联合验证，不以共享控件的mock回调当领域证据。新增core写集仅为这项最小API接缝，不授权领域重构。

### 055/056 预检后的日历复用合同（Map revision 17）

本票在已有 huhu/calendar/** 写集中交付一个无业务薄 DayPicker 基座，日期选择器与产品月份/周条分别组合外观和内容；不把任务内容联合塞进 DateField 的 CalendarProps，不新装库或复制日期、焦点、键盘引擎。产品层负责 anchor、周期笔记、周号、预览和任务投影；任务按钮与日期 DayButton 为兄弟节点，复用公开 Day/DayButton 等端口。基座的 locale/lang/timeZone/defaults 归属须在实现前明确，纯日历日保留已验收组件转换。

Lead 在基座可编译后串行让 date/Calendar.tsx 消费它，并重验原 T-03 单/范围、280/312/44、焦点绘制、IME、时区与双 Document 证明；日期公开值/props 不变。这是本票共享接缝，不把原 T-03 选择器误称已有完整业务月历。必要相邻日期测试/fixture 与上述两个新增词典路径由 Lead 单写；worker 仍不越界。

完整月份的公开组件槽已有私有可行性证明，但 1–5 周条裁 DOM/hidden matcher 在 2027-01-31 ArrowRight 停住的反例仍须本票解决。保留跨边界 Arrow/PageUpDown、所有 weekStart、领域周号/周期笔记、定位、hover/菜单的可达行为，不以回退旧 renderer、平行键盘引擎或忽略按键换绿。窄卡/272 panel 不强塞312控件，44目标和320/200%页面无横溢仍以批准设计为准；056私有局部横滚小样不是批准的最终产品呈现。

Home calendar/** 由本票完整迁移、外部 CalendarWidget props 留给 T-08；Navigator 是真实 CalendarMonth/TaskComposer 消费者。T-10 在本票共享日历合同冻结后开始，可按新合同迁移其调用，不要求长期旧UI兼容。T-05完成须明确传递最终API与保留功能/验证责任，不能把未记账破坏留到后票。

### 062 前向试用后的日期时间草稿接缝（Map revision 19）

现有 DateTimeField 只输出成功提交值，尚未向外报告日期/时间/zone 的原始草稿。Lead 在上述共享 DateTimeField 与相邻 DOM 测试中补齐可选草稿通知端口，沿用已有 DateField.onDraftChange 与真实 validateValue，不修改三字段/IANA 值合同、日期引擎或领域数据。端口覆盖无效/未完成输入、IME、清空、外部受控 reset、只读与卸载；只通知草稿，不把无效值作为 onChange 输出。模块以该信号阻止其它字段保存时带走旧有效时间，并用真实表单联合验证。Lead 串行交付冻结后，T-05/T-07 接入同一端口，消费者不各写 DOM 捕获或第二校验引擎。

062 的真实 gap/fold 探针确认内部默认 fold-earlier 仍存在，正是本票及 T-07 已授权 opt-in 严格端口的基线；不能改动内部默认策略，也不能把尚未交付的新 UI 严格适配当作现有生产事实。

### 日历快捷创建的严格时间端口（Map revision 20）

Home/共享TaskComposer只经TaskCalendarService调用，不反向导入task/core。Lead最小扩展CalendarTaskInput的可选strictTime与CalendarFailure的稳定timeReason，并在既有calendar服务中对新UI显式选择的严格输入复用wallTime的reject端口；到期与提醒均在execute前校验，拒绝时不产生写入。未选择严格模式的内部既有调用保持默认earlier。纯日日期保持原字符串，任务schema/API服务类型的再导出路径不变；新增精准core/calendar、services/calendar及相邻test共享路径，不开放其余服务写集。新UI显式启用严格模式，真实服务测试覆盖NYgap/fold无写、UTC/Shanghai正常及默认earlier控制。

### 审查修复共享接缝（Map revision 23）

069共享反例确认同日外部time/zone重置时嵌套日期仍保留旧非法草稿；Lead在DateField增加显式草稿重置端口，由DateTimeField统一驱动，保留原input DOM/焦点/IME，不用key重挂或消费者DOM改写。
