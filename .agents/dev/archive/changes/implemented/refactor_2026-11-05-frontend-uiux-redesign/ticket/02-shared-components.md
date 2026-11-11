---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: "ticket"
ui_change: true
design_ref: {"revision": 3, "digest": "49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66", "pages": ["tasks", "automations", "archives", "settings"], "acceptance": ["UX-TASK-1", "UX-AUTO-2", "UX-ARCH-1", "UX-SET-2"]}
change: "2026-11-05-frontend-uiux-redesign"
id: "T-02"
title: "共享组件统一（按钮、字段、开关、树、浮层等）"
status: "done"
kind: "feature"
planning_depth: "standard"
planning_depth_reason: "按模块隔离写集的垂直替换切片"
ready: true
risk: "high"
blocked_by: ["T-01"]
contract_ids: ["AC-011", "AC-012", "AC-013"]
owner: "native:/root/integration_final"
expected_changes: ["<Path>src/ui/components/</Path>", "<Path>src/ui/react/</Path>", "<Path>src/ui/lib/</Path>"]
writable_paths: ["<Path>src/ui/components/dialog.dom.test.tsx</Path>", "<Path>src/ui/components/sheet.dom.test.tsx</Path>", "<Path>src/ui/components/resizable.dom.test.tsx</Path>", "<Path>src/ui/react/**</Path>", "<Path>src/ui/lib/**</Path>", "<Path>src/ui/components/accordion.tsx</Path>", "<Path>src/ui/components/alert-dialog.tsx</Path>", "<Path>src/ui/components/badge.tsx</Path>", "<Path>src/ui/components/button.dom.test.tsx</Path>", "<Path>src/ui/components/button.tsx</Path>", "<Path>src/ui/components/card.tsx</Path>", "<Path>src/ui/components/checkbox.tsx</Path>", "<Path>src/ui/components/collapsible.tsx</Path>", "<Path>src/ui/components/command.tsx</Path>", "<Path>src/ui/components/context-menu.tsx</Path>", "<Path>src/ui/components/dialog.tsx</Path>", "<Path>src/ui/components/dropdown-menu.tsx</Path>", "<Path>src/ui/components/hover-card.tsx</Path>", "<Path>src/ui/components/huhu/ActionButton.tsx</Path>", "<Path>src/ui/components/huhu/AgentIcon.tsx</Path>", "<Path>src/ui/components/huhu/AgentQuestionIcon.tsx</Path>", "<Path>src/ui/components/huhu/AgentWorkingSpinner.tsx</Path>", "<Path>src/ui/components/huhu/Choice.tsx</Path>", "<Path>src/ui/components/huhu/ColorField.tsx</Path>", "<Path>src/ui/components/huhu/ConfirmDialog.tsx</Path>", "<Path>src/ui/components/huhu/EmptyState.tsx</Path>", "<Path>src/ui/components/huhu/IconPicker.tsx</Path>", "<Path>src/ui/components/huhu/InlineRename.tsx</Path>", "<Path>src/ui/components/huhu/NumberField.tsx</Path>", "<Path>src/ui/components/huhu/ObsidianIcon.tsx</Path>", "<Path>src/ui/components/huhu/PathPicker.dom.test.tsx</Path>", "<Path>src/ui/components/huhu/PathPicker.tsx</Path>", "<Path>src/ui/components/huhu/RelativeTime.tsx</Path>", "<Path>src/ui/components/huhu/SegmentedControl.tsx</Path>", "<Path>src/ui/components/huhu/SettingsBadge.tsx</Path>", "<Path>src/ui/components/huhu/SettingsDisabledControlTooltip.tsx</Path>", "<Path>src/ui/components/huhu/SettingsFormControls.tsx</Path>", "<Path>src/ui/components/huhu/SettingsRow.tsx</Path>", "<Path>src/ui/components/huhu/SettingsSection.tsx</Path>", "<Path>src/ui/components/huhu/SettingsSubsectionHeader.tsx</Path>", "<Path>src/ui/components/huhu/SettingsSwitchRow.tsx</Path>", "<Path>src/ui/components/huhu/ShortcutKeyCombo.tsx</Path>", "<Path>src/ui/components/huhu/StatusDot.tsx</Path>", "<Path>src/ui/components/huhu/VaultPathField.tsx</Path>", "<Path>src/ui/components/huhu/WorkspaceUsage.tsx</Path>", "<Path>src/ui/components/huhu/agent-icons/**</Path>", "<Path>src/ui/components/input.tsx</Path>", "<Path>src/ui/components/label.tsx</Path>", "<Path>src/ui/components/popover.tsx</Path>", "<Path>src/ui/components/progress.tsx</Path>", "<Path>src/ui/components/resizable.tsx</Path>", "<Path>src/ui/components/scroll-area.tsx</Path>", "<Path>src/ui/components/select.tsx</Path>", "<Path>src/ui/components/separator.tsx</Path>", "<Path>src/ui/components/sheet.tsx</Path>", "<Path>src/ui/components/skeleton.tsx</Path>", "<Path>src/ui/components/slider.tsx</Path>", "<Path>src/ui/components/sonner.tsx</Path>", "<Path>src/ui/components/switch.tsx</Path>", "<Path>src/ui/components/table.tsx</Path>", "<Path>src/ui/components/tabs.tsx</Path>", "<Path>src/ui/components/textarea.tsx</Path>", "<Path>src/ui/components/toggle-group.tsx</Path>", "<Path>src/ui/components/toggle.tsx</Path>", "<Path>src/ui/components/tooltip.tsx</Path>", "<Path>src/ui/components/tree.dom.test.tsx</Path>", "<Path>src/ui/components/tree.tsx</Path>", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-02/**</Path>", "<Path>src/ui/native-surface.ts</Path>", "<Path>src/ui/components/huhu/FormField.tsx</Path>", "<Path>src/ui/components/huhu/FormField.dom.test.tsx</Path>", "<Path>src/ui/components/huhu/DetailPane.tsx</Path>", "<Path>src/ui/components/huhu/DetailPane.dom.test.tsx</Path>", "<Path>src/ui/components/huhu/Notice.tsx</Path>", "<Path>src/ui/components/huhu/Notice.dom.test.tsx</Path>", "<Path>src/ui/components/huhu/TaskContent.tsx</Path>", "<Path>src/ui/components/huhu/TaskContent.dom.test.tsx</Path>"]
read_only_paths: ["<Path>src/ui/components/huhu/date/**</Path>", "<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/DESIGN.md</Path>", "<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/prototypes/UI-002/design-system.md</Path>", "<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/prototypes/UI-002/final/**</Path>"]
shared_paths: ["<Path>vitest.config.ts</Path>", "<Path>src/shared/i18n/lazy/ui.ts</Path>", "<Path>main.js</Path>", "<Path>styles.css</Path>", "<Path>src/ui/styles/base.css</Path>", "<Path>src/ui/styles/neutralize.css</Path>", "<Path>src/ui/tailwind/index.css</Path>"]
shared_path_owners: ["<Path>vitest.config.ts</Path> => Lead", "<Path>src/shared/i18n/lazy/ui.ts</Path> => Lead", "<Path>main.js</Path> => Lead", "<Path>styles.css</Path> => Lead", "<Path>src/ui/styles/base.css</Path> => Lead", "<Path>src/ui/styles/neutralize.css</Path> => Lead", "<Path>src/ui/tailwind/index.css</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "0c2a3309d1b00920539376a02c98485a98442c002945f0ee2e6ce8b816cfb744", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}, {"id": "ui", "path": "<Path>.agents/skills/ui/SKILL.md</Path>", "sha256": "ae158ca873e740b9f90a5247e53a92b994306d1b9d0efb628f7d18ff59bf7ebb", "phase": "implement", "operation": "apply-workbench-ui-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景", "change DESIGN 与 UI-002 原型"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---
# Ticket T-02: 共享组件统一（按钮、字段、开关、树、浮层等）

- **总体 Map：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/tickets-map.md</Path>`
- **Goal Plan：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/goal-plan.md</Path>`
- **上游 Spec：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/spec.md</Path>`
- **设计合同：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/DESIGN.md</Path>`
- **完成 Evidence：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/evidence/T-02.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

DESIGN §5 的组件规格落到 `src/ui/components`：每类控件一个实现；新增 FormField、DetailPane、Notice、TaskContent；树行高 32/36 并同步虚拟器；ARIA 值为字符串；Dialog/Sheet 脏数据确认与焦点回归。

来源：Spec 对应章节与 AC；DESIGN §3–§7；交付包 `source/Frontend_Refactor_Plan.md.txt`（§5、§7、§9）。

## 行为与范围

IN：button/input/select/textarea/checkbox/switch/SegmentedControl/tabs/card/badge/table/tree/dialog/sheet/popover/dropdown/tooltip/sonner/command/EmptyState/Settings* 视觉与行为对齐 DESIGN；同票删除旧变体与重复实现，更新组件 DOM 测试。

REUSE：`src/ui/components` 唯一实现、现有模块 `api.ts` 服务与命令、`src/ui/react/portal.ts`、`shared/feedback`。

OUT：日期组件（T-03）；页面组合（T-04 起）。

## 验收标准

- [x] `AC-011`：满足 Spec 验收合同 AC-011 的可观察结果。
- [x] `AC-012`：满足 Spec 验收合同 AC-012 的可观察结果。
- [x] `AC-013`：满足 Spec 验收合同 AC-013 的可观察结果。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 组件行为与 ARIA | DOM | `pnpm exec vitest run --project dom src/ui` | 通过（退出码 0） | `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/evidence/T-02.md</Path>` |
| 单一实现 | 门禁 | `pnpm test:architecture` | 通过（退出码 0） | `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/evidence/T-02.md</Path>` |

- **E2E disposition：** required：组件在 1440/390 的焦点、溢出（T-14 汇总）。
- **运行环境：** change README 选定的 change-workspace；所有执行者复用同一工作区。

## 执行约束

依赖、深度、路径所有权与 Skill 绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码与调用方。共同约束见 Map §1“总体实施背景”。同票删除被替换的旧实现、旧样式与旧测试选择器（ADR-001、DEC-001）；删除测试时说明原风险由哪个新测试承接。验证遵循 Map 的原子集成合同：本票检查必须通过，共享 API 切换导致尚未迁移消费者的已知整体编译错误逐条记账；T-13 前全部消除，T-14 全量 build/lint 必须通过。产物由 Lead 统一处理。

设计绑定：change DESIGN revision 3（designDigest `49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66`），页面 tasks, automations, archives, settings，验收 UX-TASK-1, UX-AUTO-2, UX-ARCH-1, UX-SET-2。实现只读遵循 DESIGN 与 UI-002 final，不重选风格；完成时在 Evidence 写 Design Conformance（与原型的差异、视口、截图本地路径）。

## 未决事项与风险

主题与组件是全部页面的共享合同；合同变化须回到本票修订，消费者票不得自行扩展。

### 状态说明

复审问题已落实到 DESIGN revision 3、覆盖清单与本票补充合同；UI-002 与 DESIGN revision 3 已由用户确认（LOG-014，`prototypes/UI-002/approval.md`），DoR 已回读，规划 DoR 已满足；执行状态以 frontmatter 为准，按 Goal Plan 的既有授权、依赖与验收门推进。

### 未决问题

无。

## 实施补充合同（DESIGN revision 3）

仅拥有 frontmatter 枚举的共享组件；日期族归 T-03，calendar 归 T-05，analytics 归 T-08。复用 Radix 顶层模态、ownerDocument Portal、Headless Tree roving 焦点；Command 子确认层必须可见、Esc 不穿透、F6 不逃逸。密度/指针行高与虚拟器一致。T-01 runner 就绪后交付组件 fixtures。

本票 fixture 入口：`scripts/ui-review/fixtures/frontend-redesign/T-02/`（T-01 使用 shared）。T-01 完成 runner 后执行 `node scripts/ui-review/run.mjs --suite frontend-redesign --ticket T-02 --matrix redesign --out /tmp/huhu-frontend-redesign/T-02`。任何尚未实现的 CLI 参数不记为已通过。

### 写集预检补全（2026-11-05）

正文已明确要求新增 FormField、DetailPane、Notice、TaskContent，但原枚举写集遗漏四者及其 DOM 测试；当前源码尚不存在这些文件。现补齐精确目标路径，不扩大行为范围。实际实现仍须保持领域服务与数据在所属模块，不能借共享组件跨模块导入内部实现。T-01 未 done 前不派发本票。

### 验证与文案写集补全

补齐 Dialog、Sheet、resizable 三个相邻 DOM 测试路径；通用未保存确认文案由 Lead 写入 src/shared/i18n/lazy/ui.ts 的 en/zh 词典。共享 panels 包装在本票升级至 v4；agent 直接导入旧 panels API 的两个消费者由 T-09 迁移，保留实际整体检查失败，不加兼容别名。

测试接缝：v4 不再提供 v3 的 browser.development 路径；Lead 移除 vitest.config.ts 的失效别名，使 DOM 测试走安装包正式入口，验证真实 v4 而非替身。

### DetailPane 叶子与主区宽度合同

023只读预检确认两种宽度不能混用。DetailPane新增显式必需leafWidth:number，由拥有叶子的外壳/页面装配提供；组件观察父级主区可用宽度。只有leaf>=960且主区>=1000才内联；leaf<600才全宽Sheet；如leaf620/main568应为360（最大440）覆盖详情。共享组件不导入shell或假定ShellRoot的React context能跨独立页面根传播。T-04负责提供真实叶子尺寸，T-02拥有该生产者实现与测试。
