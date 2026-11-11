---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: "ticket"
ui_change: true
design_ref: {"revision": 3, "digest": "49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66", "pages": ["tasks", "automations"], "acceptance": ["UX-TASK-3"]}
change: "2026-11-05-frontend-uiux-redesign"
id: "T-03"
title: "日期组件族（DayPicker v10）"
status: "done"
kind: "feature"
planning_depth: "standard"
planning_depth_reason: "按模块隔离写集的垂直替换切片"
ready: true
risk: "high"
blocked_by: ["T-02"]
contract_ids: ["AC-021", "AC-022", "AC-023"]
owner: "native:/root/implement_t02_primitives"
expected_changes: ["<Path>src/ui/components/huhu/date/</Path>"]
writable_paths: ["<Path>src/ui/components/huhu/date/**</Path>", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-03/**</Path>"]
read_only_paths: ["<Path>src/ui/react/portal.ts</Path>", "<Path>src/ui/components/popover.tsx</Path>", "<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/DESIGN.md</Path>", "<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/prototypes/UI-002/design-system.md</Path>", "<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/prototypes/UI-002/final/**</Path>"]
shared_paths: ["<Path>src/shared/i18n/lazy/ui.ts</Path>", "<Path>scripts/verify-architecture.mjs</Path>", "<Path>package.json</Path>", "<Path>pnpm-lock.yaml</Path>", "<Path>THIRD-PARTY-NOTICES.md</Path>", "<Path>main.js</Path>", "<Path>styles.css</Path>"]
shared_path_owners: ["<Path>src/shared/i18n/lazy/ui.ts</Path> => Lead", "<Path>scripts/verify-architecture.mjs</Path> => Lead", "<Path>package.json</Path> => Lead", "<Path>pnpm-lock.yaml</Path> => Lead", "<Path>THIRD-PARTY-NOTICES.md</Path> => Lead", "<Path>main.js</Path> => Lead", "<Path>styles.css</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "d217057f068f3fe9e59205fa372896c298dcd9afda5da1c46f7e441d5018283e", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}, {"id": "ui", "path": "<Path>.agents/skills/ui/SKILL.md</Path>", "sha256": "123781b61a8bd3b40af9ff6161b1dc981c446f13c2ef3b2f49995630cd2f2c44", "phase": "implement", "operation": "apply-workbench-ui-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景", "change DESIGN 与 UI-002 原型"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---
# Ticket T-03: 日期组件族（DayPicker v10）

- **总体 Map：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/tickets-map.md</Path>`
- **Goal Plan：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/goal-plan.md</Path>`
- **上游 Spec：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/spec.md</Path>`
- **设计合同：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/DESIGN.md</Path>`
- **完成 Evidence：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/evidence/T-03.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

新增 DateField / DateRangeField / DateTimeField 与 `date-value.ts`，使用 `@daypicker/react` 10.x（锁定补丁版）与现有 Popover，视觉按 DESIGN §5。

来源：Spec 对应章节与 AC；DESIGN §3–§7；交付包 `source/Frontend_Refactor_Plan.md.txt`（§5、§7、§9）。

## 行为与范围

IN：受控值合同（Date=`YYYY-MM-DD | null`；Range=`{from,to}`；DateTime=`{date,time,timeZone} | null`）、严格解析、min/max、必填、只读、禁用、错误关联；范围草稿与应用/取消/预设；日期时间与时区说明；所属 Document Portal；Esc 只关弹层；中文 locale 与周起始日设置；许可登记。

REUSE：`src/ui/components` 唯一实现、现有模块 `api.ts` 服务与命令、`src/ui/react/portal.ts`、`shared/feedback`。

OUT：各模块替换调用（T-05–T-12 逐票完成）；Air Datepicker 不进入生产。

## 验收标准

- [x] `AC-021`：满足 Spec 验收合同 AC-021 的可观察结果。
- [x] `AC-022`：满足 Spec 验收合同 AC-022 的可观察结果。
- [x] `AC-023`：满足 Spec 验收合同 AC-023 的可观察结果。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 值与时区 | 单元 | `pnpm exec vitest run src/ui/components/huhu/date` | 通过（退出码 0） | `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/evidence/T-03.md</Path>` |
| 弹层、键盘、双 Document | DOM | `pnpm exec vitest run --project dom src/ui/components/huhu/date` | 通过（退出码 0） | `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/evidence/T-03.md</Path>` |
| 依赖与许可 | 门禁 | `pnpm run check:notices` + `pnpm run check:bundle` | 通过（退出码 0） | `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/evidence/T-03.md</Path>` |

- **E2E disposition：** required：日期弹层在对话框内与窄宽（T-14 汇总）。
- **运行环境：** change README 选定的 change-workspace；所有执行者复用同一工作区。

## 执行约束

依赖、深度、路径所有权与 Skill 绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码与调用方。共同约束见 Map §1“总体实施背景”。同票删除被替换的旧实现、旧样式与旧测试选择器（ADR-001、DEC-001）；删除测试时说明原风险由哪个新测试承接。验证遵循 Map 的原子集成合同：本票检查必须通过，共享 API 切换导致尚未迁移消费者的已知整体编译错误逐条记账；T-13 前全部消除，T-14 全量 build/lint 必须通过。产物由 Lead 统一处理。

设计绑定：change DESIGN revision 3（designDigest `49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66`），页面 tasks, automations，验收 UX-TASK-3。实现只读遵循 DESIGN 与 UI-002 final，不重选风格；完成时在 Evidence 写 Design Conformance（与原型的差异、视口、截图本地路径）。

## 未决事项与风险

主题与组件是全部页面的共享合同；合同变化须回到本票修订，消费者票不得自行扩展。

### 状态说明

复审问题已落实到 DESIGN revision 3、覆盖清单与本票补充合同；UI-002 与 DESIGN revision 3 已由用户确认（LOG-014，`prototypes/UI-002/approval.md`），DoR 已回读，规划 DoR 已满足；执行状态以 frontmatter 为准，按 Goal Plan 的既有授权、依赖与验收门推进。

### 未决问题

无。

## 实施补充合同（DESIGN revision 3）

遵循 DESIGN §7 三类值合同；DateTime 不得被降格为日期字符串。DayPicker 10 的时间输入组合既有 Input/Select；在 America/New_York 春季缺失/秋季重复时间、Asia/Shanghai 与 UTC 中验证领域转换，覆盖清除/校验/取消/跨窗口。只做 UI 适配，不自造时区算法。

本票 fixture 入口：`scripts/ui-review/fixtures/frontend-redesign/T-03/`（T-01 使用 shared）。T-01 完成 runner 后执行 `node scripts/ui-review/run.mjs --suite frontend-redesign --ticket T-03 --matrix redesign --out /tmp/huhu-frontend-redesign/T-03`。任何尚未实现的 CLI 参数不记为已通过。

### 018 预检后的边界补充（Map revision 10）

来源为本轮018只读报告及Lead回读的task/core/time.ts、automations/core/schedule/zoned-occurrences.ts。DateTimeField采用必需的caller-owned validateValue端口，接收结构化值并返回稳定错误（或无错误）；共享组件负责显示关联错误、拒绝提交，不导入模块或计算epoch，不复制时区算法。日期/时间/时区语法校验仍由日期族承担。

AC-023分工：本票证明日历日不跨日、DateTime结构/时区保留、校验端口必需且实际调用、双Document/卸载；T-05与T-07证明真实领域DST转换。消费者对不存在或重复的墙上时间采取拒绝策略，因为既定三字段值不能表达earlier/later。两个模块票最小扩展现有候选检查的opt-in严格能力并接到UI校验端口，保留原内部调度策略及既有测试；不修改持久schema。不能拿mock端口通过声称真实DST转换通过，最终G-MODULES/G-FINAL仍需实际领域证据。

日历桌面保持280px/34px格；coarse的独立命中区至少44。320窄文档下采用无格间隙、7×44=308px网格、总外框312px（边框+内边距合计4），四周至少4px；Popover通过所属Document Portal定位，可越过叶子内容内边距，但不能越出所属叶子/文档可用边界。更宽的Range表单窄宽纵向排列。真实浏览器测格子命中、坐标选择及零横向溢出，不以重叠的34px格命中区冒充44。数值是既定触控要求的响应式实现处置，不改变桌面视觉基线。

Lead负责UI词典和架构UI依赖包守卫；版本已核对10.0.2，实际安装仍在本票实施时由Lead完成。优先用v10 classNames与语义token，不引入未隔离的全局包CSS。
