---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: "ticket"
ui_change: true
design_ref: {"revision": 3, "digest": "49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66", "pages": ["agent"], "acceptance": ["UX-AGENT-1"]}
change: "2026-11-05-frontend-uiux-redesign"
id: "T-09"
title: "智能体工作区"
status: "done"
kind: "feature"
planning_depth: "standard"
planning_depth_reason: "按模块隔离写集的垂直替换切片"
ready: true
risk: "medium"
blocked_by: ["T-04", "T-15"]
contract_ids: ["AC-081", "AC-082"]
owner: "native:/root/terminal_native_repair"
expected_changes: ["<Path>src/modules/agent/ui/</Path>"]
writable_paths: ["<Path>src/modules/agent/ui/**</Path>", "<Path>src/modules/agent/styles/**</Path>", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-09/**</Path>"]
read_only_paths: ["<Path>src/modules/agent/api.ts</Path>", "<Path>src/modules/agent/services/**</Path>", "<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/DESIGN.md</Path>", "<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/prototypes/UI-002/design-system.md</Path>", "<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/prototypes/UI-002/final/**</Path>"]
shared_paths: ["<Path>src/modules/agent/i18n.ts</Path>", "<Path>main.js</Path>", "<Path>styles.css</Path>", "<Path>src/modules/agent/core/terminal/settings.ts</Path>", "<Path>src/modules/agent/core/terminal/terminal-core.test.ts</Path>", "<Path>src/modules/agent/ui/i18n.ts</Path>", "<Path>src/modules/agent/ui/settings-page.tsx</Path>", "<Path>src/modules/agent/ui/workbench-page.ts</Path>", "<Path>scripts/ui-review/run.mjs</Path>", "<Path>scripts/ui-review/run.test.mjs</Path>", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-09/electron-stub.ts</Path>", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-09/index.tsx</Path>", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-09/index.mjs</Path>", "<Path>src/ui/components/huhu/DetailPane.tsx</Path>", "<Path>src/ui/components/huhu/DetailPane.dom.test.tsx</Path>"]
shared_path_owners: ["<Path>src/modules/agent/i18n.ts</Path> => Lead", "<Path>main.js</Path> => Lead", "<Path>styles.css</Path> => Lead", "<Path>src/modules/agent/core/terminal/settings.ts</Path> => Lead", "<Path>src/modules/agent/core/terminal/terminal-core.test.ts</Path> => Lead", "<Path>src/modules/agent/ui/i18n.ts</Path> => Lead", "<Path>src/modules/agent/ui/settings-page.tsx</Path> => Lead", "<Path>src/modules/agent/ui/workbench-page.ts</Path> => Lead", "<Path>scripts/ui-review/run.mjs</Path> => Lead", "<Path>scripts/ui-review/run.test.mjs</Path> => Lead", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-09/electron-stub.ts</Path> => Lead", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-09/index.tsx</Path> => Lead", "<Path>scripts/ui-review/fixtures/frontend-redesign/T-09/index.mjs</Path> => Lead", "<Path>src/ui/components/huhu/DetailPane.tsx</Path> => Lead", "<Path>src/ui/components/huhu/DetailPane.dom.test.tsx</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "0c2a3309d1b00920539376a02c98485a98442c002945f0ee2e6ce8b816cfb744", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}, {"id": "ui", "path": "<Path>.agents/skills/ui/SKILL.md</Path>", "sha256": "ae158ca873e740b9f90a5247e53a92b994306d1b9d0efb628f7d18ff59bf7ebb", "phase": "implement", "operation": "apply-workbench-ui-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景", "change DESIGN 与 UI-002 原型"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---
# Ticket T-09: 智能体工作区

- **总体 Map：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/tickets-map.md</Path>`
- **Goal Plan：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/goal-plan.md</Path>`
- **上游 Spec：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/spec.md</Path>`
- **设计合同：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/DESIGN.md</Path>`
- **完成 Evidence：** `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/evidence/T-09.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

智能体页按 DESIGN §6 agent：会话目录、标签条、终端面板 token（`--hu-term-*`）、分屏、等待回答横幅、会话信息详情、历史/收件箱/用量页、设置与账号。

来源：Spec 对应章节与 AC；DESIGN §3–§7；交付包 `source/Frontend_Refactor_Plan.md.txt`（§5、§7、§9）。

## 行为与范围

IN：AgentWorkspacePage、pages/PageTabView、control/TerminalControlPanel、history、inbox、usage、settings；输入法与 PTY 焦点不回归；渲染不启动进程。

REUSE：`src/ui/components` 唯一实现、现有模块 `api.ts` 服务与命令、`src/ui/react/portal.ts`、`shared/feedback`。

OUT：xterm/PTY/CLI 服务（OOS-001、OOS-005）。

## 验收标准

- [x] `AC-081`：满足 Spec 验收合同 AC-081 的可观察结果。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 工作区与横幅 | DOM | `pnpm exec vitest run --project dom src/modules/agent` | 通过（退出码 0） | `<Path>.agents/dev/archive/changes/implemented/refactor_2026-11-05-frontend-uiux-redesign/evidence/T-09.md</Path>` |

- **E2E disposition：** required：agent 页全部状态 1440/390。
- **运行环境：** change README 选定的 change-workspace；所有执行者复用同一工作区。

## 执行约束

依赖、深度、路径所有权与 Skill 绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码与调用方。共同约束见 Map §1“总体实施背景”。同票删除被替换的旧实现、旧样式与旧测试选择器（ADR-001、DEC-001）；删除测试时说明原风险由哪个新测试承接。验证遵循 Map 的原子集成合同：本票检查必须通过，共享 API 切换导致尚未迁移消费者的已知整体编译错误逐条记账；T-13 前全部消除，T-14 全量 build/lint 必须通过。产物由 Lead 统一处理。

设计绑定：change DESIGN revision 3（designDigest `49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66`），页面 agent，验收 UX-AGENT-1。实现只读遵循 DESIGN 与 UI-002 final，不重选风格；完成时在 Evidence 写 Design Conformance（与原型的差异、视口、截图本地路径）。

## 未决事项与风险

复审风险与解除条件已写入本票补充合同与验证方法；不沿用初版无风险判断。

### 状态说明

复审问题已落实到 DESIGN revision 3、覆盖清单与本票补充合同；UI-002 与 DESIGN revision 3 已由用户确认（LOG-014，`prototypes/UI-002/approval.md`），DoR 已回读，规划 DoR 已满足；执行状态以 frontmatter 为准，按 Goal Plan 的既有授权、依赖与验收门推进。

### 未决问题

无。

## 实施补充合同（DESIGN revision 3）

补齐空间/新会话/历史恢复/收件箱收件人及发送回执/账号 CLI/技能/快捷命令/备份恢复/用量，agent/styles/agent.css 同票替换。默认等待回答只定位终端；不发明跨 CLI allow/deny 协议；移动能力明确不可用。panels 4 API 与 xterm 尺寸、销毁、隐藏恢复一起验。

本票 fixture 入口：`scripts/ui-review/fixtures/frontend-redesign/T-09/`（T-01 使用 shared）。T-01 完成 runner 后执行 `node scripts/ui-review/run.mjs --suite frontend-redesign --ticket T-09 --matrix redesign --out /tmp/huhu-frontend-redesign/T-09`。任何尚未实现的 CLI 参数不记为已通过。

- [x] `AC-082`：满足 Spec 中新增合同及本票的表面责任。
