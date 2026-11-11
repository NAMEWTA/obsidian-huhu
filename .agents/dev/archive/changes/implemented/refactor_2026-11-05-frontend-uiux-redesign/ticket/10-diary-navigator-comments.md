---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: "ticket"
ui_change: true
design_ref: {"revision": 3, "digest": "49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66", "pages": ["diary", "notes"], "acceptance": ["UX-DIARY-1", "UX-NOTES-1"]}
change: "2026-11-05-frontend-uiux-redesign"
id: "T-10"
title: "日记、导航器与批注"
status: "done"
kind: "feature"
planning_depth: "standard"
planning_depth_reason: "按模块隔离写集的垂直替换切片"
ready: true
risk: "medium"
blocked_by: ["T-03", "T-04", "T-05", "T-15"]
contract_ids: ["AC-091", "AC-093"]
owner: "native:/root/implement_t10"
expected_changes: ["<Path>src/modules/navigator/ui/</Path>", "<Path>src/modules/comments/ui/</Path>"]
writable_paths: ["<Path>src/modules/navigator/platform/vault-source.ts</Path>", "<Path>src/modules/navigator/ui/**</Path>", "<Path>src/modules/comments/ui/**</Path>", "<Path>src/modules/comments/styles/**</Path>", "<Path>src/app/editor-panel/**</Path>", "<Path>src/app/workbench/comments-leaf.ts</Path>", "<Path>src/app/workbench/comments-leaf.dom.test.tsx</Path>", "<Path>src/app/workbench/navigator-leaf.ts</Path>", "<Path>src/app/workbench/NavigatorEmptyState.tsx</Path>", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-10/**</Path>"]
read_only_paths: ["<Path>src/modules/navigator/api.ts</Path>", "<Path>src/modules/comments/api.ts</Path>", "<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/DESIGN.md</Path>", "<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/prototypes/UI-002/design-system.md</Path>", "<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/prototypes/UI-002/final/**</Path>"]
shared_paths: ["<Path>src/modules/navigator/i18n.ts</Path>", "<Path>src/modules/comments/i18n.ts</Path>", "<Path>main.js</Path>", "<Path>styles.css</Path>", "<Path>src/modules/navigator/ui/i18n.ts</Path>", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-10/index.tsx</Path>", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-10/index.mjs</Path>", "<Path>src/app/contracts/editor-context.ts</Path>", "<Path>src/modules/comments/api.ts</Path>", "<Path>src/modules/comments/module.ts</Path>", "<Path>src/modules/versioning/module.ts</Path>", "<Path>src/modules/versioning/ui/history/history-panel-page.tsx</Path>", "<Path>src/modules/versioning/ui/history/NoteHistoryPanel.tsx</Path>"]
shared_path_owners: ["<Path>src/modules/navigator/i18n.ts</Path> => Lead", "<Path>src/modules/comments/i18n.ts</Path> => Lead", "<Path>main.js</Path> => Lead", "<Path>styles.css</Path> => Lead", "<Path>src/modules/navigator/ui/i18n.ts</Path> => Lead", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-10/index.tsx</Path> => Lead", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-10/index.mjs</Path> => Lead", "<Path>src/app/contracts/editor-context.ts</Path> => Lead", "<Path>src/modules/comments/api.ts</Path> => Lead", "<Path>src/modules/comments/module.ts</Path> => Lead", "<Path>src/modules/versioning/module.ts</Path> => Lead", "<Path>src/modules/versioning/ui/history/history-panel-page.tsx</Path> => Lead", "<Path>src/modules/versioning/ui/history/NoteHistoryPanel.tsx</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "0c2a3309d1b00920539376a02c98485a98442c002945f0ee2e6ce8b816cfb744", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}, {"id": "ui", "path": "<Path>.agents/skills/ui/SKILL.md</Path>", "sha256": "12621917181e3a74f3a410a710752e8e856d9a84af739ef6c97c85f79bca1ad4", "phase": "implement", "operation": "apply-workbench-ui-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景", "change DESIGN 与 UI-002 原型"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---
# Ticket T-10: 日记、导航器与批注

- **总体 Map：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/tickets-map.md</Path>`
- **Goal Plan：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/goal-plan.md</Path>`
- **上游 Spec：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/spec.md</Path>`
- **设计合同：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/DESIGN.md</Path>`
- **完成 Evidence：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/evidence/T-10.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

按 DESIGN §6 diary/notes 重做书页日记与写作、导航器树与搜索、批注面板与编辑器侧栏宿主。版本/Git 与全部差异阅读已拆到 T-16（ADR-006）。

来源：Spec 对应章节与 AC；DESIGN §3–§7；交付包 `source/Frontend_Refactor_Plan.md.txt`（§5、§7、§9）。

## 行为与范围

IN：navigator/ui（diary、NavigatorRoot、settings）、comments/ui（panel、浮层、settings）、`src/app/editor-panel/**` 面板宿主（承载批注与 T-16 提供的版本标签页，本票只负责宿主外壳与 token）；日期改为 DateField；同票删除局部样式。

REUSE：`src/ui/components` 唯一实现、现有模块 `api.ts` 服务与命令、`src/ui/react/portal.ts`、`shared/feedback`。

OUT：versioning 全部界面与差异引擎（T-16）、周期笔记合同、宿主编辑器内核（OOS-001、OOS-002）。

## 验收标准

- [x] `AC-091`：满足 Spec 验收合同 AC-091 的可观察结果。
- [x] `AC-093`：满足 Spec 验收合同 AC-093 的可观察结果。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 页面行为 | DOM | `pnpm exec vitest run --project dom src/modules/navigator src/modules/comments src/app/editor-panel src/app/workbench` | 通过（退出码 0） | `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/evidence/T-10.md</Path>` |

- **E2E disposition：** required：diary/notes 全部状态 1440/390。
- **运行环境：** change README 选定的 change-workspace；所有执行者复用同一工作区。

## 执行约束

依赖、深度、路径所有权与 Skill 绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码与调用方。共同约束见 Map §1“总体实施背景”。同票删除被替换的旧实现、旧样式与旧测试选择器（ADR-001、DEC-001）；删除测试时说明原风险由哪个新测试承接。验证遵循 Map 的原子集成合同：本票检查必须通过，共享 API 切换导致尚未迁移消费者的已知整体编译错误逐条记账；T-13 前全部消除，T-14 全量 build/lint 必须通过。产物由 Lead 统一处理。

设计绑定：change DESIGN revision 3（designDigest `49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66`），页面 diary, notes，验收 UX-DIARY-1, UX-NOTES-1。实现只读遵循 DESIGN 与 UI-002 final，不重选风格；完成时在 Evidence 写 Design Conformance（与原型的差异、视口、截图本地路径）。

## 未决事项与风险

复审风险与解除条件已写入本票补充合同与验证方法；不沿用初版无风险判断。

### 状态说明

复审问题已落实到 DESIGN revision 3、覆盖清单与本票补充合同；UI-002 与 DESIGN revision 3 已由用户确认（LOG-014，`prototypes/UI-002/approval.md`），DoR 已回读，规划 DoR 已满足；执行状态以 frontmatter 为准，按 Goal Plan 的既有授权、依赖与验收门推进。

### 未决问题

无。

## 实施补充合同（DESIGN revision 3）

覆盖日记全部周期（日/周/月/季/年）与空日期写作；导航器搜索、选中、日历与缓存状态；批注回复、孤立锚点、解决状态与删除确认；宿主 panel-host、导航和批注贡献的多窗口与卸载。更新独立 comments CSS。服务规则不改写。

本票 fixture 入口：`scripts/ui-review/fixtures/frontend-redesign/T-10/`（T-01 使用 shared）。T-01 完成 runner 后执行 `node scripts/ui-review/run.mjs --suite frontend-redesign --ticket T-10 --matrix redesign --out /tmp/huhu-frontend-redesign/T-10`。任何尚未实现的 CLI 参数不记为已通过。

### 共享日历消费顺序（Map revision 17）

Navigator 直接消费 T-05 拥有的共享 CalendarMonth/TaskComposer。T-05 完成并冻结 DayPicker 产品日历合同后再实施本票，按其最终公开API迁移 Navigator 调用；保留周期笔记、周条/周号、当前笔记定位、modifier-open、hover与显式创建能力，不保留旧UI renderer。该边仅补齐真实生产者依赖，不扩大本票模块写集。
