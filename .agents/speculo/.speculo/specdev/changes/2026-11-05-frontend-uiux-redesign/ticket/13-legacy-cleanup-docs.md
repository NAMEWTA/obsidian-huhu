---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: "ticket"
ui_change: false
design_ref: null
change: "2026-11-05-frontend-uiux-redesign"
id: "T-13"
title: "旧入口清理、守卫与文档"
status: "done"
kind: "refactor"
planning_depth: "standard"
planning_depth_reason: "收尾切片"
ready: true
risk: "medium"
blocked_by: ["T-05", "T-06", "T-07", "T-08", "T-09", "T-10", "T-11", "T-12", "T-16"]
contract_ids: ["AC-024", "AC-121", "AC-122", "AC-125"]
owner: "native:/root/cleanup_final"
expected_changes: ["<Path>src/app/contracts/workbench.ts</Path>", "<Path>src/app/workbench/</Path>", "<Path>src/shell/navigation-state.ts</Path>"]
writable_paths: ["<Path>docs/comments.md</Path>", "<Path>.agents/skills/dev/references/editor-comments.md</Path>", "<Path>.agents/skills/dev/references/build-and-release.md</Path>", "<Path>src/app/contracts/workbench.ts</Path>", "<Path>src/app/workbench/**</Path>", "<Path>src/shell/navigation-state.ts</Path>", "<Path>test/guards/**</Path>", "<Path>docs/design-system.md</Path>", "<Path>docs/workbench.md</Path>", "<Path>docs/architecture.md</Path>", "<Path>docs/sync.md</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/frontend-inventory.json</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/frontend-coverage.md</Path>", "<Path>src/shell/navigation-state.test.ts</Path>"]
read_only_paths: ["<Path>src/modules/**</Path>"]
shared_paths: ["<Path>scripts/verify-architecture.mjs</Path>", "<Path>src/ui/styles/base.css</Path>", "<Path>src/ui/components/scroll-area.tsx</Path>", "<Path>scripts/ui-review/fixtures/T-34.tsx</Path>", "<Path>scripts/ui-review/fixtures/T-35.tsx</Path>", "<Path>scripts/obsidian-acceptance/agent-page-tabs.mjs</Path>", "<Path>scripts/obsidian-acceptance/agent-skills-settings.mjs</Path>", "<Path>scripts/obsidian-acceptance/agent-system-account.mjs</Path>", "<Path>scripts/obsidian-acceptance/agent-tools.mjs</Path>", "<Path>scripts/obsidian-acceptance/automation-layout.mjs</Path>", "<Path>scripts/obsidian-acceptance/comments-edges.mjs</Path>", "<Path>scripts/obsidian-acceptance/comments-fuzzy-performance.mjs</Path>", "<Path>scripts/obsidian-acceptance/comments-v2.mjs</Path>", "<Path>scripts/obsidian-acceptance/content-move-boundaries.mjs</Path>", "<Path>scripts/obsidian-acceptance/content-renames.mjs</Path>", "<Path>scripts/obsidian-acceptance/home-canvas-switch-dialog.mjs</Path>", "<Path>scripts/obsidian-acceptance/home-canvas-switch.mjs</Path>", "<Path>scripts/obsidian-acceptance/home-d2a.mjs</Path>", "<Path>scripts/obsidian-acceptance/home-d2b.mjs</Path>", "<Path>scripts/obsidian-acceptance/home-fd.mjs</Path>", "<Path>scripts/obsidian-acceptance/home-grid.mjs</Path>", "<Path>scripts/obsidian-acceptance/home-widgets-c2.mjs</Path>", "<Path>scripts/obsidian-acceptance/inbox-card.mjs</Path>", "<Path>scripts/obsidian-acceptance/navigator-journal.mjs</Path>", "<Path>scripts/obsidian-acceptance/navigator-notes.mjs</Path>", "<Path>scripts/obsidian-acceptance/navigator-restored-leaf.mjs</Path>", "<Path>scripts/obsidian-acceptance/overflow-audit.mjs</Path>", "<Path>scripts/obsidian-acceptance/p3-shell.mjs</Path>", "<Path>scripts/obsidian-acceptance/release-vault-install.mjs</Path>", "<Path>scripts/obsidian-acceptance/status-bar.mjs</Path>", "<Path>scripts/obsidian-acceptance/storage-layout.mjs</Path>", "<Path>scripts/obsidian-acceptance/sync-autostash.mjs</Path>", "<Path>scripts/obsidian-acceptance/sync-clone.mjs</Path>", "<Path>scripts/obsidian-acceptance/tasks-calendar.mjs</Path>", "<Path>scripts/obsidian-acceptance/terminal-reliability.mjs</Path>", "<Path>scripts/obsidian-acceptance/theme-matrix.mjs</Path>", "<Path>scripts/obsidian-acceptance/vault-storage.mjs</Path>", "<Path>scripts/obsidian-acceptance/workbench-probe.mjs</Path>", "<Path>scripts/obsidian-acceptance/workbench-window-owner.mjs</Path>", "<Path>scripts/obsidian-acceptance/workspace-refinement.mjs</Path>", "<Path>src/app/workbench/compose-workbench.ts</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/frontend-inventory.json</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/frontend-coverage.md</Path>"]
shared_path_owners: ["<Path>scripts/verify-architecture.mjs</Path> => Lead", "<Path>src/ui/styles/base.css</Path> => Lead", "<Path>src/ui/components/scroll-area.tsx</Path> => Lead", "<Path>scripts/ui-review/fixtures/T-34.tsx</Path> => Lead", "<Path>scripts/ui-review/fixtures/T-35.tsx</Path> => Lead", "<Path>scripts/obsidian-acceptance/agent-page-tabs.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/agent-skills-settings.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/agent-system-account.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/agent-tools.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/automation-layout.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/comments-edges.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/comments-fuzzy-performance.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/comments-v2.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/content-move-boundaries.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/content-renames.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/home-canvas-switch-dialog.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/home-canvas-switch.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/home-d2a.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/home-d2b.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/home-fd.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/home-grid.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/home-widgets-c2.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/inbox-card.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/navigator-journal.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/navigator-notes.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/navigator-restored-leaf.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/overflow-audit.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/p3-shell.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/release-vault-install.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/status-bar.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/storage-layout.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/sync-autostash.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/sync-clone.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/tasks-calendar.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/terminal-reliability.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/theme-matrix.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/vault-storage.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/workbench-probe.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/workbench-window-owner.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/workspace-refinement.mjs</Path> => Lead", "<Path>src/app/workbench/compose-workbench.ts</Path> => Lead", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/frontend-inventory.json</Path> => Lead", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/frontend-coverage.md</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "0c2a3309d1b00920539376a02c98485a98442c002945f0ee2e6ce8b816cfb744", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}, {"id": "ui", "path": "<Path>.agents/skills/ui/SKILL.md</Path>", "sha256": "ae158ca873e740b9f90a5247e53a92b994306d1b9d0efb628f7d18ff59bf7ebb", "phase": "implement", "operation": "apply-workbench-ui-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景", "change DESIGN 与 UI-002 原型"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---
# Ticket T-13: 旧入口清理、守卫与文档

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **设计合同：** `<Path>{roots.state}/specdev/changes/{change}/DESIGN.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-13.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

删除 `iconSettingsTarget` 与旧图标页路由回退、旧 UI 状态字段解码、旧设置别名、残留旧样式选择器与失效测试探针；新增源码守卫（无原生日期输入、无旧入口）；更新设计系统与工作台文档（含自动化右详情）；UI 技能及 references 由前置 T-15 独占维护；后续漂移回到 T-15 修订。

来源：Spec 对应章节与 AC；DESIGN §3–§7；交付包 `source/Frontend_Refactor_Plan.md.txt`（§5、§7、§9）。

## 行为与范围

IN：全部调用点改写到新目标后再删除函数；守卫测试；docs 文档改为新行为；不写 `.agents/skills/ui/`（T-15）。

REUSE：`src/ui/components` 唯一实现、现有模块 `api.ts` 服务与命令、`src/ui/react/portal.ts`、`shared/feedback`。

OUT：新增功能；UI 技能重构（T-15）。

## 验收标准

- [x] `AC-024`：满足 Spec 验收合同 AC-024 的可观察结果。
- [x] `AC-121`：满足 Spec 验收合同 AC-121 的可观察结果。
- [x] `AC-122`：满足 Spec 验收合同 AC-122 的可观察结果。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 守卫 | 单元 | `pnpm exec vitest run test/guards` | 通过（退出码 0） | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-13.md</Path>` |
| 文档 | 门禁 | `pnpm test:docs` | 通过（退出码 0） | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-13.md</Path>` |
| 架构 | 门禁 | `pnpm test:architecture` | 通过（退出码 0） | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-13.md</Path>` |

- **E2E disposition：** not-required：纯清理与文档，UI 由 T-14 汇总。
- **运行环境：** change README 选定的 change-workspace；所有执行者复用同一工作区。

## 执行约束

依赖、深度、路径所有权与 Skill 绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码与调用方。共同约束见 Map §1“总体实施背景”。同票删除被替换的旧实现、旧样式与旧测试选择器（ADR-001、DEC-001）；删除测试时说明原风险由哪个新测试承接。验证遵循 Map 的原子集成合同：本票检查必须通过，共享 API 切换导致尚未迁移消费者的已知整体编译错误逐条记账；T-13 前全部消除，T-14 全量 build/lint 必须通过。产物由 Lead 统一处理。

## 未决事项与风险

复审风险与解除条件已写入本票补充合同与验证方法；不沿用初版无风险判断。

### 状态说明

复审问题已落实到 DESIGN revision 3、覆盖清单与本票补充合同；UI-002 与 DESIGN revision 3 已由用户确认（LOG-014，`prototypes/UI-002/approval.md`），DoR 已回读，规划 DoR 已满足；执行状态以 frontmatter 为准，按 Goal Plan 的既有授权、依赖与验收门推进。

### 未决问题

无。

## 实施补充合同（DESIGN revision 3）

核对 frontend-inventory.json 每个文件的迁移/复用/删除回执、新文件映射与所有独立 CSS；全部旧工作台 token 清零，但保留正文外观功能、第三方来源与用户自定义色。更新 docs/sync.md 关于已实现本地历史的陈旧描述。全量编译与样式守卫此时必须清零，所有过渡失败台账关闭。

- [x] `AC-125`：满足 Spec 中新增合同及本票的表面责任。

差异引擎替换后（T-16），`docs/sync.md` 等维护文档中关于版本比较的描述改为 `@pierre/diffs` DiffView，并说明历史 A/B 比较入口。源码守卫新增：`src/` 中不再出现 `@codemirror/merge` 引用。
