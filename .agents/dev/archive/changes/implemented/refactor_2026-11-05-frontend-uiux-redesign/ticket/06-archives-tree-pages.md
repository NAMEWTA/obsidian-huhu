---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: "ticket"
ui_change: true
design_ref: {"revision": 3, "digest": "49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66", "pages": ["archives"], "acceptance": ["UX-ARCH-1", "UX-ARCH-2", "UX-ARCH-3"]}
change: "2026-11-05-frontend-uiux-redesign"
id: "T-06"
title: "档案：目录树、记录编辑、归物与人物"
status: "done"
kind: "feature"
planning_depth: "standard"
planning_depth_reason: "按模块隔离写集的垂直替换切片"
ready: true
risk: "high"
blocked_by: ["T-03", "T-04", "T-15"]
contract_ids: ["AC-051", "AC-052", "AC-053"]
owner: "native:/root/repair_t06_final"
expected_changes: ["<Path>src/modules/archives/ui/</Path>", "<Path>src/modules/archives/services/generic/workbench.ts</Path>", "<Path>src/modules/archives/services/generic/workbench.test.ts</Path>"]
writable_paths: ["<Path>src/modules/archives/ui/**</Path>", "<Path>src/modules/archives/services/generic/workbench.ts</Path>", "<Path>src/modules/archives/services/generic/workbench.test.ts</Path>", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-06/**</Path>"]
read_only_paths: ["<Path>src/modules/archives/api.ts</Path>", "<Path>src/modules/archives/core/**</Path>", "<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/DESIGN.md</Path>", "<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/prototypes/UI-002/design-system.md</Path>", "<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/prototypes/UI-002/final/**</Path>"]
shared_paths: ["<Path>src/modules/archives/i18n.ts</Path>", "<Path>src/shell/panel/SidePanel.tsx</Path>", "<Path>main.js</Path>", "<Path>styles.css</Path>", "<Path>src/app/contracts/workbench.ts</Path>", "<Path>src/shell/panel/SidePanel.dom.test.tsx</Path>", "<Path>src/ui/components/huhu/date/MonthField.tsx</Path>", "<Path>src/ui/components/huhu/date/MonthField.dom.test.tsx</Path>", "<Path>src/ui/components/huhu/date/date-value.ts</Path>", "<Path>src/ui/components/huhu/date/date-value.test.ts</Path>", "<Path>src/ui/components/huhu/date/index.ts</Path>", "<Path>src/shared/i18n/lazy/ui.ts</Path>", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-06/index.mjs</Path>"]
shared_path_owners: ["<Path>src/modules/archives/i18n.ts</Path> => Lead", "<Path>src/shell/panel/SidePanel.tsx</Path> => Lead", "<Path>main.js</Path> => Lead", "<Path>styles.css</Path> => Lead", "<Path>src/app/contracts/workbench.ts</Path> => Lead", "<Path>src/shell/panel/SidePanel.dom.test.tsx</Path> => Lead", "<Path>src/ui/components/huhu/date/MonthField.tsx</Path> => Lead", "<Path>src/ui/components/huhu/date/MonthField.dom.test.tsx</Path> => Lead", "<Path>src/ui/components/huhu/date/date-value.ts</Path> => Lead", "<Path>src/ui/components/huhu/date/date-value.test.ts</Path> => Lead", "<Path>src/ui/components/huhu/date/index.ts</Path> => Lead", "<Path>src/shared/i18n/lazy/ui.ts</Path> => Lead", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-06/index.mjs</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "d217057f068f3fe9e59205fa372896c298dcd9afda5da1c46f7e441d5018283e", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}, {"id": "ui", "path": "<Path>.agents/skills/ui/SKILL.md</Path>", "sha256": "12621917181e3a74f3a410a710752e8e856d9a84af739ef6c97c85f79bca1ad4", "phase": "implement", "operation": "apply-workbench-ui-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景", "change DESIGN 与 UI-002 原型"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---
# Ticket T-06: 档案：目录树、记录编辑、归物与人物

- **总体 Map：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/tickets-map.md</Path>`
- **Goal Plan：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/goal-plan.md</Path>`
- **上游 Spec：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/spec.md</Path>`
- **设计合同：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/DESIGN.md</Path>`
- **完成 Evidence：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/evidence/T-06.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

档案页按 DESIGN §6 archives：PanelTree 受控展开（有界、过滤已删除节点）、搜索临时展开、分页继续加载；类型表格/卡片、记录编辑（字段网格、关联、修订）、归物、人物阅读、类型设计器、恢复中心；日期字段改为 DateField。

来源：Spec 对应章节与 AC；DESIGN §3–§7；交付包 `source/Frontend_Refactor_Plan.md.txt`（§5、§7、§9）。

## 行为与范围

IN：ArchivePage、RecordEditor、FieldRenderer、RelationPanel、DefinitionStudio、FieldDesigner、QueryBuilder、RecoveryPanel、belongings/*、person/*、settings-page；workbench 服务去掉静默 limit 截断；同票删除旧平铺导航与局部样式。

REUSE：`src/ui/components` 唯一实现、现有模块 `api.ts` 服务与命令、`src/ui/react/portal.ts`、`shared/feedback`。

OUT：档案领域模型与命令（OOS-001）。

## 验收标准

- [x] `AC-051`：满足 Spec 验收合同 AC-051 的可观察结果。
- [x] `AC-052`：满足 Spec 验收合同 AC-052 的可观察结果。
- [x] `AC-053`：满足 Spec 验收合同 AC-053 的可观察结果。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 树与未保存 | DOM | `pnpm exec vitest run --project dom src/modules/archives` | 通过（退出码 0） | `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/evidence/T-06.md</Path>` |
| 大目录完整性 | 单元 | `pnpm exec vitest run src/modules/archives/services/generic/workbench.test.ts` | 通过（退出码 0） | `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/evidence/T-06.md</Path>` |
| 格式回归 | 单元 | `pnpm exec vitest run test/golden` | 通过（退出码 0） | `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/evidence/T-06.md</Path>` |

- **E2E disposition：** required：archives 页全部状态 1440/390。
- **运行环境：** change README 选定的 change-workspace；所有执行者复用同一工作区。

## 执行约束

依赖、深度、路径所有权与 Skill 绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码与调用方。共同约束见 Map §1“总体实施背景”。同票删除被替换的旧实现、旧样式与旧测试选择器（ADR-001、DEC-001）；删除测试时说明原风险由哪个新测试承接。验证遵循 Map 的原子集成合同：本票检查必须通过，共享 API 切换导致尚未迁移消费者的已知整体编译错误逐条记账；T-13 前全部消除，T-14 全量 build/lint 必须通过。产物由 Lead 统一处理。

设计绑定：change DESIGN revision 3（designDigest `49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66`），页面 archives，验收 UX-ARCH-1, UX-ARCH-2, UX-ARCH-3。实现只读遵循 DESIGN 与 UI-002 final，不重选风格；完成时在 Evidence 写 Design Conformance（与原型的差异、视口、截图本地路径）。

## 未决事项与风险

复审风险与解除条件已写入本票补充合同与验证方法；不沿用初版无风险判断。

### 状态说明

复审问题已落实到 DESIGN revision 3、覆盖清单与本票补充合同；UI-002 与 DESIGN revision 3 已由用户确认（LOG-014，`prototypes/UI-002/approval.md`），DoR 已回读，规划 DoR 已满足；执行状态以 frontmatter 为准，按 Goal Plan 的既有授权、依赖与验收门推进。

### 未决问题

无。

## 实施补充合同（DESIGN revision 3）

frontend-coverage.md 中类型管理、全部字段编辑器、归物年度报告、人物纪事、恢复中心均在范围内；表格/卡片/详情/表单共用模板，动态字段与分页按 API 枚举逐项验证。

本票 fixture 入口：`scripts/ui-review/fixtures/frontend-redesign/T-06/`（T-01 使用 shared）。T-01 完成 runner 后执行 `node scripts/ui-review/run.mjs --suite frontend-redesign --ticket T-06 --matrix redesign --out /tmp/huhu-frontend-redesign/T-06`。任何尚未实现的 CLI 参数不记为已通过。

### 058 预检后的树分页与日期保真合同（Map revision 18）

Lead 在既有 PanelTree/SidePanel 接缝支持显式已加载/总数/加载中/失败重试/加载更多模型；如按类型分页，动作和稳定类型ID保持对应，不伪装记录选择。Tree 的受控 expandedIds/onExpandedChange 在 SidePanel 按叶/模型身份持有，有界、去重、裁掉已删除branch，并保留搜索临时展开/清空恢复；不能放进单例 ArchivesWorkbench污染多个叶子。复用现有Headless Tree与虚拟器；模块从现有offset/limit/total查询分批获取，不能放宽core限制或只取500当全量。全库搜索需域query并显式结果界限/可继续加载，不用仅加载子集判断不存在。具体模型签名在本票实施前由Lead与worker固化，新增相邻DOM测试覆盖两叶隔离、prune与>500真实加载。

日期按现有codec无损适配：day值用DateField；month值YYYY-MM使用共享日期族MonthField（本票由Lead交付，预检时尚无该导出，现已由Lead交付），组合既有Input/Select/Popover并沿用日期族外观/校验/IME/owner规则，不补1日、不经UTC、不用模块私有月选择器或原生month控件。mixed精度显式选择，切为day必须由用户提供有效日，不能自动补日或静默重写原值。MonthField只做纯月语法/范围，领域codec仍最终校验；新增MonthField/相邻测试/date-value/index/UI词典由Lead单写，旧DateField/Range/DateTime公开合同不变并按影响重验。

archive datetime原始值是带Z或固定±HH:mm的ISO字符串，保留时分秒、小数1–3位及原偏移拼写；不存IANA，不有意改领域schema。UI用DateField日期部分 + 同一共享Input/FormField的纯时间/偏移控件组合，由本模块现有codec验证和原值组件无损拼合。未编辑值必须原样保存；编辑日期只替换日期，编辑时间/偏移只替换相应原始部分。无需IANA/epoch转换、不得伪造DateTimeField validator成功或把秒/偏移降到HH:mm。清除是完整值的显式操作。所有非法临时draft必须进入本票现有表单错误/dirty/离开/恢复流程，不能因为子组件onChange未触发就保存旧有效值。此为Spec AC-024允许纯时间组合的领域适配，不另造日期或时区引擎。

本票不新增sharingScope或archive IANA resolver，不改core/entity/codec/恢复数据。至少以月/混合精度、2026-11-06T01:02:03.450+05:30、Z值、非法date/time/offset、未编辑精确回存和显式部分编辑做真实codec+表单回归；保留missing/null/空值/false/0区别与13字段覆盖。

### 最终native驱动诊断（Map revision 28）

T06源码078已独立通过；正式66最后第二Document月份打开超时仍待定位。Lead独占fixture/index.mjs的最终诊断/协议修复，实际共享组件缺陷则回生产者；不得把65组通过当66全过，不能用重试吞掉真实点击或削弱断言。

### 收口回执

078源码独立双轴通过；Lead严格等Date原trigger回焦后，正式完整66（含最后第二Document月份交互）全部退出0。2611实际输入与最终56路径快照匹配，evidence/T-06.md记录本票通过及全局/真实宿主边界。
