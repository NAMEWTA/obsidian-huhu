---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: "ticket"
ui_change: true
design_ref: {"revision": 2, "digest": "1e3b5ef5fb4c6ec033ff6a1d9f164a7f3692cc679b71e2d54771c1ea46082c00", "pages": ["DIARY-READER"], "acceptance": ["AC-411", "AC-412", "AC-413", "AC-414"]}
change: "2026-11-04-bz-reference-capabilities"
id: "T-12"
title: "书页日记阅读页"
status: "done"
kind: "feature"
planning_depth: "deep"
planning_depth_reason: "新增第三方翻页库、包体与启动闭包风险"
ready: true
risk: "high"
blocked_by: ["T-11"]
contract_ids: ["AC-411", "AC-412", "AC-413", "AC-414"]
owner: "herdr:impl3"
expected_changes: ["<Path>src/modules/navigator/ui/diary/</Path>", "<Path>src/modules/navigator/manifest.ts</Path>", "<Path>package.json</Path>"]
writable_paths: ["<Path>src/modules/navigator/ui/diary/**</Path>", "<Path>src/modules/navigator/module.test.ts</Path>", "<Path>scripts/ui-review/fixtures/T-12.mjs</Path>", "<Path>scripts/ui-review/fixtures/T-12.tsx</Path>"]
read_only_paths: ["<Path>src/modules/navigator/core/**</Path>", "<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/DESIGN.md</Path>", "<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/prototypes/UI-001/design-system.md</Path>", "<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/prototypes/UI-001/final/**</Path>", "<Path>.agents/speculo/.speculo/specdev/design/revisions/DESIGN-0002.md</Path>"]
shared_paths: ["<Path>package.json</Path>", "<Path>pnpm-lock.yaml</Path>", "<Path>src/modules/navigator/i18n.ts</Path>", "<Path>docs/third-party/licenses/sources.json</Path>", "<Path>NOTICE</Path>", "<Path>src/modules/navigator/manifest.ts</Path>", "<Path>src/modules/navigator/module.ts</Path>", "<Path>main.js</Path>", "<Path>styles.css</Path>", "<Path>src/app/contracts/workbench.ts</Path>", "<Path>src/app/workbench/compose-workbench.ts</Path>", "<Path>src/shell/navigation-state.ts</Path>"]
shared_path_owners: ["<Path>package.json</Path> => Lead", "<Path>pnpm-lock.yaml</Path> => Lead", "<Path>src/modules/navigator/i18n.ts</Path> => Lead", "<Path>docs/third-party/licenses/sources.json</Path> => Lead", "<Path>NOTICE</Path> => Lead", "<Path>src/modules/navigator/manifest.ts</Path> => Lead", "<Path>src/modules/navigator/module.ts</Path> => Lead", "<Path>main.js</Path> => Lead", "<Path>styles.css</Path> => Lead", "<Path>src/app/contracts/workbench.ts</Path> => Lead", "<Path>src/app/workbench/compose-workbench.ts</Path> => Lead", "<Path>src/shell/navigation-state.ts</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "d217057f068f3fe9e59205fa372896c298dcd9afda5da1c46f7e441d5018283e", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}, {"id": "ui", "path": "<Path>.agents/skills/ui/SKILL.md</Path>", "sha256": "123781b61a8bd3b40af9ff6161b1dc981c446f13c2ef3b2f49995630cd2f2c44", "phase": "implement", "operation": "apply-workbench-ui-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景", "change DESIGN 与对应 UI 原型"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---
# Ticket T-12: 书页日记阅读页

- **总体 Map：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/tickets-map.md</Path>`
- **Goal Plan：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/goal-plan.md</Path>`
- **上游 Spec：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/spec.md</Path>`
- **完成 Evidence：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-12.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

复刻 bz 书页日记（https://github.com/yeshimei/bz/tree/d76a0870329403247917a00c43019e203a2560a4/src/diary 的 ui.ts、render.ts、docs/adr/adr-0230-diary-book-ui.md），Spec 4 节“阅读”，LOG-018。

## 行为与范围

IN：navigator 工作台页面；宽双页、窄单页；翻页按钮/方向键/书口月索引/日历跳日；page-flip（MIT）按需加载与无动画回退；有限 DOM 与预取；隐藏无动画循环；打开同一周期笔记。OUT：搜索与写作（T-13）、贴纸/信封/撕页/手写字体（OOS-004）。

## 验收标准

- [ ] `AC-411`：满足 Spec 验收合同 AC-411 的可观察结果。
- [ ] `AC-412`：满足 Spec 验收合同 AC-412 的可观察结果。
- [ ] `AC-413`：满足 Spec 验收合同 AC-413 的可观察结果。
- [ ] `AC-414`：满足 Spec 验收合同 AC-414 的可观察结果。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 交互与回退 | DOM | `pnpm exec vitest run --project dom src/modules/navigator` | 通过 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-12.md</Path>` |
| 启动闭包与包体 | 门禁 | `pnpm test:architecture && pnpm run build && pnpm check:bundle` | 通过，增长有理由 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-12.md</Path>` |
| 规模 | DOM | 1,000 篇 fixture 节点数与 rAF 计数 | 有界 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-12.md</Path>` |
| 许可 | 门禁 | `pnpm check:notices` | 通过 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-12.md</Path>` |
| UI runner | 组件 E2E | `node scripts/ui-review/run.mjs` | DESIGN 验收通过 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-12.md</Path>` |

- **E2E disposition：** required：宽/窄、reduced-motion、键盘。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

## 执行约束

依赖、深度、路径所有权与 Skill 绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。共同约束见 Map §1“总体实施背景”。复制或改编 bz 内容时在文件头署名并在 `<Path>docs/third-party/bz.md</Path>` 追加条目（AC-001）。改动 TS/TSX 时运行 `pnpm run build` 与 `pnpm run lint`，重建的 `main.js`/`styles.css` 由 Lead 统一处理。

## 未决事项与风险

包体增长：NFR-003；引擎失败回退由测试承接。

G-DESIGN 已关闭（2026-11-04）：design_ref 绑定 change DESIGN revision 2（digest 1e3b5ef5fb4c…）、页面 DIARY-READER；实现须只读遵循 `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/DESIGN.md</Path>` 与 UI-001 final，不重选风格；完成时在 Evidence 写 Design Conformance。

### 未决问题

无。
