---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: "ticket"
ui_change: true
design_ref: {"revision": 3, "digest": "49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66", "pages": ["home"], "acceptance": ["UX-HOME-1", "UX-HOME-2"]}
change: "2026-11-05-frontend-uiux-redesign"
id: "T-08"
title: "首页看板与小组件"
status: "done"
kind: "feature"
planning_depth: "standard"
planning_depth_reason: "按模块隔离写集的垂直替换切片"
ready: true
risk: "medium"
blocked_by: ["T-05"]
contract_ids: ["AC-071", "AC-072"]
owner: "native:/root/implement_t08"
expected_changes: ["<Path>src/modules/home/ui/</Path>", "<Path>src/ui/components/huhu/analytics/</Path>"]
writable_paths: ["<Path>src/modules/home/ui/**</Path>", "<Path>src/ui/components/huhu/analytics/**</Path>", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-08/**</Path>"]
read_only_paths: ["<Path>src/modules/home/api.ts</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/DESIGN.md</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/prototypes/UI-002/design-system.md</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/prototypes/UI-002/final/**</Path>"]
shared_paths: ["<Path>src/modules/home/i18n.ts</Path>", "<Path>main.js</Path>", "<Path>styles.css</Path>", "<Path>src/modules/home/ui/i18n.ts</Path>", "<Path>scripts/module-strings.ts</Path>", "<Path>src/ui/components/huhu/date/DateField.tsx</Path>", "<Path>src/shared/automation/types.ts</Path>", "<Path>src/modules/automations/module.ts</Path>", "<Path>src/modules/automations/core/service.ts</Path>", "<Path>src/ui/components/huhu/date/date-draft.dom.test.tsx</Path>", "<Path>src/modules/automations/core/next-scheduled.test.ts</Path>", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-08/index.tsx</Path>", "<Path>src/ui/components/huhu/analytics/Analytics.tsx</Path>", "<Path>src/ui/components/huhu/analytics/Analytics.dom.test.tsx</Path>", "<Path>src/modules/home/ui/canvas/BoardCanvas.tsx</Path>"]
shared_path_owners: ["<Path>src/modules/home/i18n.ts</Path> => Lead", "<Path>main.js</Path> => Lead", "<Path>styles.css</Path> => Lead", "<Path>src/modules/home/ui/i18n.ts</Path> => Lead", "<Path>scripts/module-strings.ts</Path> => Lead", "<Path>src/ui/components/huhu/date/DateField.tsx</Path> => Lead", "<Path>src/shared/automation/types.ts</Path> => Lead", "<Path>src/modules/automations/module.ts</Path> => Lead", "<Path>src/modules/automations/core/service.ts</Path> => Lead", "<Path>src/ui/components/huhu/date/date-draft.dom.test.tsx</Path> => Lead", "<Path>src/modules/automations/core/next-scheduled.test.ts</Path> => Lead", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-08/index.tsx</Path> => Lead", "<Path>src/ui/components/huhu/analytics/Analytics.tsx</Path> => Lead", "<Path>src/ui/components/huhu/analytics/Analytics.dom.test.tsx</Path> => Lead", "<Path>src/modules/home/ui/canvas/BoardCanvas.tsx</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "0c2a3309d1b00920539376a02c98485a98442c002945f0ee2e6ce8b816cfb744", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}, {"id": "ui", "path": "<Path>.agents/skills/ui/SKILL.md</Path>", "sha256": "12621917181e3a74f3a410a710752e8e856d9a84af739ef6c97c85f79bca1ad4", "phase": "implement", "operation": "apply-workbench-ui-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景", "change DESIGN 与 UI-002 原型"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---
# Ticket T-08: 首页看板与小组件

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **设计合同：** `<Path>{roots.state}/specdev/changes/{change}/DESIGN.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-08.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

首页按 DESIGN §6 home：问候区、12 栏小组件、统一卡片头与菜单、编辑布局（手柄、移除、撤销）、空看板；全部小组件与编辑面板换用共享组件与 DateField。

来源：Spec 对应章节与 AC；DESIGN §3–§7；交付包 `source/Frontend_Refactor_Plan.md.txt`（§5、§7、§9）。

## 行为与范围

IN：DashboardPage、canvas、widgets、cards、sections、pm、pipeline、expense、media、settings 等 home/ui 子目录；沿用 react-grid-layout/resizable/dnd-kit；隐藏页暂停昂贵刷新；同票删除局部颜色与原生日期。

REUSE：`src/ui/components` 唯一实现、现有模块 `api.ts` 服务与命令、`src/ui/react/portal.ts`、`shared/feedback`。

OUT：首页日历组件（T-05 已完成）；看板数据模型（OOS-001）。

## 验收标准

- [x] `AC-071`：满足 Spec 验收合同 AC-071 的可观察结果。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 小组件与编辑 | DOM | `pnpm exec vitest run --project dom src/modules/home` | 通过（退出码 0） | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-08.md</Path>` |

- **E2E disposition：** required：home 页全部状态 1440/390。
- **运行环境：** change README 选定的 change-workspace；所有执行者复用同一工作区。

## 执行约束

依赖、深度、路径所有权与 Skill 绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码与调用方。共同约束见 Map §1“总体实施背景”。同票删除被替换的旧实现、旧样式与旧测试选择器（ADR-001、DEC-001）；删除测试时说明原风险由哪个新测试承接。验证遵循 Map 的原子集成合同：本票检查必须通过，共享 API 切换导致尚未迁移消费者的已知整体编译错误逐条记账；T-13 前全部消除，T-14 全量 build/lint 必须通过。产物由 Lead 统一处理。

设计绑定：change DESIGN revision 3（designDigest `49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66`），页面 home，验收 UX-HOME-1, UX-HOME-2。实现只读遵循 DESIGN 与 UI-002 final，不重选风格；完成时在 Evidence 写 Design Conformance（与原型的差异、视口、截图本地路径）。

## 未决事项与风险

复审风险与解除条件已写入本票补充合同与验证方法；不沿用初版无风险判断。

### 状态说明

复审问题已落实到 DESIGN revision 3、覆盖清单与本票补充合同；UI-002 与 DESIGN revision 3 已由用户确认（LOG-014，`prototypes/UI-002/approval.md`），DoR 已回读，规划 DoR 已满足；执行状态以 frontmatter 为准，按 Goal Plan 的既有授权、依赖与验收门推进。

### 未决问题

无。

## 实施补充合同（DESIGN revision 3）

逐项重绘 widget-table.ts 的 18 widgets + 14 sections，包含所有配置弹窗、ThemeStudio、记录/媒体/查询/项目/流程等操作。既有 schema 与允许尺寸不变，--db-* 只从 --hu-* 派生。首页收件箱不可链接通知冒充内容处理。排除日历写集（T-05），复用其成果。

本票 fixture 入口：`scripts/ui-review/fixtures/frontend-redesign/T-08/`（T-01 使用 shared）。T-01 完成 runner 后执行 `node scripts/ui-review/run.mjs --suite frontend-redesign --ticket T-08 --matrix redesign --out /tmp/huhu-frontend-redesign/T-08`。任何尚未实现的 CLI 参数不记为已通过。

- [x] `AC-072`：满足 Spec 中新增合同及本票的表面责任。
