---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: "ticket"
ui_change: true
design_ref: {"revision": 3, "digest": "49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66", "pages": ["home", "tasks", "diary", "archives", "automations", "agent", "notifications", "safe", "versioning", "health", "notes", "settings"], "acceptance": ["UX-HOME-1", "UX-TASK-1", "UX-DIARY-1", "UX-ARCH-1", "UX-AUTO-1", "UX-AGENT-1", "UX-NOTIFY-1", "UX-SAFE-1", "UX-VER-1", "UX-VER-2", "UX-VER-3", "UX-HEALTH-1", "UX-NOTES-1", "UX-SET-1"]}
change: "2026-11-05-frontend-uiux-redesign"
id: "T-14"
title: "整体集成与验收"
status: "done"
kind: "review"
planning_depth: "standard"
planning_depth_reason: "收尾切片"
ready: true
risk: "medium"
blocked_by: ["T-13"]
contract_ids: ["AC-901", "AC-902", "AC-903"]
owner: "native:/root/integration_final"
expected_changes: ["<Path>scripts/ui-review/fixtures/</Path>"]
writable_paths: ["<Path>scripts/ui-review/fixtures/frontend-redesign/integration/**</Path>"]
read_only_paths: ["<Path>src/**</Path>", "<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/DESIGN.md</Path>", "<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/prototypes/UI-002/design-system.md</Path>", "<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/prototypes/UI-002/final/**</Path>"]
shared_paths: ["<Path>main.js</Path>", "<Path>styles.css</Path>", "<Path>scripts/ui-review/bounded-startup.mjs</Path>", "<Path>scripts/ui-review/bounded-startup.test.mjs</Path>", "<Path>scripts/ui-review/fixtures/frontend-redesign/shared/fixture-theme.ts</Path>", "<Path>src/shared/native/control-wire-editor-codec.generated.ts</Path>", "<Path>src/app/main.ts</Path>", "<Path>src/host/obsidian/feedback.dom.test.tsx</Path>", "<Path>test/agent-backup/failure.test.ts</Path>", "<Path>test/host/computed-surface.test.ts</Path>", "<Path>src/shared/file-type-icons.test.ts</Path>", "<Path>scripts/ui-review/run.mjs</Path>", "<Path>scripts/ui-review/run.test.mjs</Path>", "<Path>scripts/obsidian-acceptance/workbench-probe.mjs</Path>", "<Path>scripts/obsidian-acceptance/workbench-window-owner.mjs</Path>", "<Path>scripts/obsidian-acceptance/terminal-merge.mjs</Path>", "<Path>scripts/obsidian-acceptance/versioning-history.mjs</Path>", "<Path>scripts/obsidian-acceptance/theme-matrix.mjs</Path>", "<Path>scripts/obsidian-acceptance/navigator-restored-leaf.mjs</Path>", "<Path>scripts/obsidian-acceptance/comments-edges.mjs</Path>", "<Path>scripts/obsidian-acceptance/fresh-vault.mjs</Path>", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-11/index.mjs</Path>"]
shared_path_owners: ["<Path>main.js</Path> => Lead", "<Path>styles.css</Path> => Lead", "<Path>scripts/ui-review/bounded-startup.mjs</Path> => Lead", "<Path>scripts/ui-review/bounded-startup.test.mjs</Path> => Lead", "<Path>scripts/ui-review/fixtures/frontend-redesign/shared/fixture-theme.ts</Path> => Lead", "<Path>src/shared/native/control-wire-editor-codec.generated.ts</Path> => Lead", "<Path>src/app/main.ts</Path> => Lead", "<Path>src/host/obsidian/feedback.dom.test.tsx</Path> => Lead", "<Path>test/agent-backup/failure.test.ts</Path> => Lead", "<Path>test/host/computed-surface.test.ts</Path> => Lead", "<Path>src/shared/file-type-icons.test.ts</Path> => Lead", "<Path>scripts/ui-review/run.mjs</Path> => Lead", "<Path>scripts/ui-review/run.test.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/workbench-probe.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/workbench-window-owner.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/terminal-merge.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/versioning-history.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/theme-matrix.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/navigator-restored-leaf.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/comments-edges.mjs</Path> => Lead", "<Path>scripts/obsidian-acceptance/fresh-vault.mjs</Path> => Lead", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-11/index.mjs</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "0c2a3309d1b00920539376a02c98485a98442c002945f0ee2e6ce8b816cfb744", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}, {"id": "ui", "path": "<Path>.agents/skills/ui/SKILL.md</Path>", "sha256": "ae158ca873e740b9f90a5247e53a92b994306d1b9d0efb628f7d18ff59bf7ebb", "phase": "implement", "operation": "apply-workbench-ui-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景", "change DESIGN 与 UI-002 原型"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---
# Ticket T-14: 整体集成与验收

- **总体 Map：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/tickets-map.md</Path>`
- **Goal Plan：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/goal-plan.md</Path>`
- **上游 Spec：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/spec.md</Path>`
- **设计合同：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/DESIGN.md</Path>`
- **完成 Evidence：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/evidence/T-14.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

运行 AC-901 全部门禁、AC-902 UI runner（12 页 × 1440/390，与原型逐页对照）、AC-903 启动闭包与包体（含 @pierre/diffs/shiki 不进入启动闭包）；在 Evidence 写 Design Conformance 与未验证项。

来源：Spec 对应章节与 AC；DESIGN §3–§7；交付包 `source/Frontend_Refactor_Plan.md.txt`（§5、§7、§9）。

## 行为与范围

IN：UI runner 的 integration/index.mjs 汇总入口（固定T-01–T-12与T-16共13个既有CLI子进程，各自实际编译/渲染生产TSX与原verify/exercise；不创建空TSX，不借旧同号票据证据）；整体命令；对照原型的差异清单；宿主探针在环境具备时运行。

REUSE：`src/ui/components` 唯一实现、现有模块 `api.ts` 服务与命令、`src/ui/react/portal.ts`、`shared/feedback`。

OUT：修复功能缺陷（发现问题回到对应票）。

## 验收标准

- [x] `AC-901`：满足 Spec 验收合同 AC-901 的可观察结果。
- [x] `AC-902`：满足 Spec 验收合同 AC-902 的可观察结果。
- [x] `AC-903`：满足 Spec 验收合同 AC-903 的可观察结果。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 整体门禁 | 门禁 | `pnpm run build && pnpm run lint && pnpm run lint:css && pnpm test && pnpm test:styles && pnpm test:architecture && pnpm run check:bundle && pnpm test:i18n && pnpm test:docs && pnpm run check:notices` | 通过（退出码 0） | `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/evidence/T-14.md</Path>` |
| UI runner | 组件 E2E | `node scripts/ui-review/run.mjs --suite frontend-redesign --ticket T-14 --matrix redesign --out /tmp/huhu-frontend-redesign/T-14` | 通过（退出码 0） | `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/evidence/T-14.md</Path>` |

- **E2E disposition：** required：12 页 × 1440/390。
- **运行环境：** change README 选定的 change-workspace；所有执行者复用同一工作区。

## 执行约束

依赖、深度、路径所有权与 Skill 绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码与调用方。共同约束见 Map §1“总体实施背景”。同票删除被替换的旧实现、旧样式与旧测试选择器（ADR-001、DEC-001）；删除测试时说明原风险由哪个新测试承接。验证遵循 Map 的原子集成合同：本票检查必须通过，共享 API 切换导致尚未迁移消费者的已知整体编译错误逐条记账；T-13 前全部消除，T-14 全量 build/lint 必须通过。产物由 Lead 统一处理。

设计绑定：change DESIGN revision 3（designDigest `49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66`），页面 home, tasks, diary, archives, automations, agent, notifications, safe, versioning, health, notes, settings，验收 UX-HOME-1, UX-TASK-1, UX-DIARY-1, UX-ARCH-1, UX-AUTO-1, UX-AGENT-1, UX-NOTIFY-1, UX-SAFE-1, UX-VER-1, UX-VER-2, UX-VER-3, UX-HEALTH-1, UX-NOTES-1, UX-SET-1。实现只读遵循 DESIGN 与 UI-002 final，不重选风格；完成时在 Evidence 写 Design Conformance（与原型的差异、视口、截图本地路径）。

## 未决事项与风险

T-15 在模块页面开工前已重构 UI 技能，Lead 在 G-CONTRACT 已刷新本票的 ui binding。本票另外核对技能与最终代码是否漂移：token、组件导出、布局入口、DiffView 与验证命令的描述应与实际代码一致，不一致时回到 T-15 修订（Map replan），不在本票改技能。F-11 的 runner 视口与 fixture 建设由共享/模块票前移完成；本票汇总，不能到最后才发现前置票无法验收。必需宿主验证未通过时保留待验收，不标 done。

### 状态说明

复审问题已落实到 DESIGN revision 3、覆盖清单与本票补充合同；UI-002 与 DESIGN revision 3 已由用户确认（LOG-014，`prototypes/UI-002/approval.md`），DoR 已回读，规划 DoR 已满足；执行状态以 frontmatter 为准，按 Goal Plan 的既有授权、依赖与验收门推进。

### 未决问题

无。

## 实施补充合同（DESIGN revision 3）

只汇总已由各模块票交付的 fixtures，不把新 fixture 建设拖到最终验收。使用 frontend-redesign suite 的 integration 入口覆盖全部表面，含 T-16 的 versioning 差异与历史 A/B 状态；按 T-15 的规则对照表抽查技能漂移。真实 Obsidian 多窗口/主题/触屏/恢复必需项未通过时 G-FINAL 保持未完成，不能以原型截图或 skip 代替。

## 最终入口合同（Map revision 52）

中央run.mjs只为frontend-redesign/T-14委托integration/index.mjs；原单票CLI不提取/重写。固定13子票，各用独立Node/Chrome/profile/port0/输出目录，默认并发2、最高3；透传--check只产生preflight，不算E2E。父检查实际退出、完整66个planned/cases、errors、真实production entry与输入SHA/统一styles/host样式，缺失或失败不得passed。原adapterCounts与T09 Electron边界不变。最终同构建冻结后一次运行原13组66；真正跨页组合与popout/PTY/历史/剪贴板由隔离Xvfb、全新vault/HOME的宿主probe补证。重用fresh-vault/CDP，不新建launcher、引擎或模拟页；旧宿主脚本只按真实当前语义修正，产品失败回所属票，保留既有风险断言。
