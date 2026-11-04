---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: "ticket"
ui_change: true
design_ref: {"revision": 2, "digest": "1e3b5ef5fb4c6ec033ff6a1d9f164a7f3692cc679b71e2d54771c1ea46082c00", "pages": ["BELONGINGS-REPORT"], "acceptance": ["AC-321"]}
change: "2026-11-04-bz-reference-capabilities"
id: "T-10"
title: "归物年度报告"
status: "done"
kind: "feature"
planning_depth: "lite"
planning_depth_reason: "消费既有统计的只读视图"
ready: true
risk: "low"
blocked_by: ["T-09", "T-14", "T-18"]
contract_ids: ["AC-321"]
owner: "herdr:impl4"
expected_changes: ["<Path>src/modules/archives/ui/belongings/report/</Path>"]
writable_paths: ["<Path>src/modules/archives/ui/belongings/report/**</Path>", "<Path>src/modules/archives/core/belongings/statistics.ts</Path>", "<Path>src/modules/archives/core/belongings/statistics.test.ts</Path>", "<Path>src/modules/archives/services/generic/belongings.ts</Path>", "<Path>src/modules/archives/services/generic/belongings.test.ts</Path>", "<Path>src/modules/archives/api.ts</Path>", "<Path>src/modules/archives/ui/belongings/BelongingsPage.tsx</Path>", "<Path>scripts/ui-review/fixtures/T-10.mjs</Path>", "<Path>scripts/ui-review/fixtures/T-10.tsx</Path>"]
read_only_paths: ["<Path>.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/DESIGN.md</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/prototypes/UI-001/design-system.md</Path>", "<Path>.agents/speculo/.speculo/specdev/changes/2026-11-04-bz-reference-capabilities/prototypes/UI-001/final/**</Path>", "<Path>.agents/speculo/.speculo/specdev/design/revisions/DESIGN-0002.md</Path>"]
shared_paths: ["<Path>src/modules/archives/i18n.ts</Path>", "<Path>main.js</Path>", "<Path>styles.css</Path>"]
shared_path_owners: ["<Path>src/modules/archives/i18n.ts</Path> => Lead", "<Path>main.js</Path> => Lead", "<Path>styles.css</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "d217057f068f3fe9e59205fa372896c298dcd9afda5da1c46f7e441d5018283e", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}, {"id": "ui", "path": "<Path>.agents/skills/ui/SKILL.md</Path>", "sha256": "123781b61a8bd3b40af9ff6161b1dc981c446f13c2ef3b2f49995630cd2f2c44", "phase": "implement", "operation": "apply-workbench-ui-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景", "change DESIGN 与对应 UI 原型"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---
# Ticket T-10: 归物年度报告

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-10.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

复刻 bz 归物年度报告（https://github.com/yeshimei/bz/tree/d76a0870329403247917a00c43019e203a2560a4/src/belongings/report.ts、layouts/poster），Spec 3 节。

## 行为与范围

IN：购入/离场、月度金额、分类分布、回收、持有时间；与卡片同一口径。REUSE：`src/ui/components/huhu/analytics`。OUT：海报导出。

## 验收标准

- [ ] `AC-321`：满足 Spec 验收合同 AC-321 的可观察结果。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 报告口径 | DOM | `pnpm exec vitest run --project dom src/modules/archives` | 通过 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-10.md</Path>` |
| UI runner | 组件 E2E | `node scripts/ui-review/run.mjs` | DESIGN 验收通过 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-10.md</Path>` |

- **E2E disposition：** required：宽/窄与亮暗。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

## 执行约束

依赖、深度、路径所有权与 Skill 绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。共同约束见 Map §1“总体实施背景”。复制或改编 bz 内容时在文件头署名并在 `<Path>docs/third-party/bz.md</Path>` 追加条目（AC-001）。改动 TS/TSX 时运行 `pnpm run build` 与 `pnpm run lint`，重建的 `main.js`/`styles.css` 由 Lead 统一处理。

## 未决事项与风险

无。

G-DESIGN 已关闭（2026-11-04）：design_ref 绑定 change DESIGN revision 2（digest 1e3b5ef5fb4c…）、页面 BELONGINGS-REPORT；实现须只读遵循 `<Path>{roots.state}/specdev/changes/{change}/DESIGN.md</Path>` 与 UI-001 final，不重选风格；完成时在 Evidence 写 Design Conformance。

### 未决问题

无。
