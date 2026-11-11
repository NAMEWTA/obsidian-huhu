---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: "ticket"
ui_change: false
design_ref: null
change: "2026-11-04-bz-reference-capabilities"
id: "T-18"
title: "体检有限修复流程"
status: "done"
kind: "feature"
planning_depth: "deep"
planning_depth_reason: "修改用户数据，需 owner 重验与恢复"
ready: true
risk: "high"
blocked_by: ["T-17", "T-14"]
contract_ids: ["AC-621", "AC-622", "AC-623"]
owner: "herdr:impl1"
expected_changes: ["<Path>src/modules/health/core/repair.ts</Path>", "<Path>src/modules/archives/contrib/health.ts</Path>"]
writable_paths: ["<Path>src/modules/health/core/**</Path>", "<Path>src/modules/health/services/**</Path>", "<Path>src/modules/archives/contrib/health*.ts</Path>", "<Path>src/modules/health/api.ts</Path>", "<Path>src/modules/archives/api.ts</Path>", "<Path>src/modules/archives/services/generic/entities.ts</Path>", "<Path>src/modules/archives/services/generic/runtime.ts</Path>", "<Path>src/modules/archives/services/generic/belongings.ts</Path>", "<Path>src/modules/archives/services/generic/repair.ts</Path>", "<Path>src/modules/archives/services/generic/repair.test.ts</Path>"]
read_only_paths: []
shared_paths: ["<Path>src/modules/archives/module.ts</Path>", "<Path>main.js</Path>", "<Path>styles.css</Path>", "<Path>src/modules/health/module.ts</Path>", "<Path>src/modules/health/i18n.ts</Path>"]
shared_path_owners: ["<Path>src/modules/archives/module.ts</Path> => Lead", "<Path>main.js</Path> => Lead", "<Path>styles.css</Path> => Lead", "<Path>src/modules/health/module.ts</Path> => Lead", "<Path>src/modules/health/i18n.ts</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "d217057f068f3fe9e59205fa372896c298dcd9afda5da1c46f7e441d5018283e", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---
# Ticket T-18: 体检有限修复流程

- **总体 Map：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/tickets-map.md</Path>`
- **Goal Plan：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/goal-plan.md</Path>`
- **上游 Spec：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/spec.md</Path>`
- **完成 Evidence：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-18.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

有限修复（Spec 6 节、OOS-007）。不照搬 bz 集中修复函数。

## 行为与范围

IN：计划→预览→确认→owner 当前哈希重验→备份/恢复事务→修改→复查；逐项提交回执；首批：档案索引重建、归物状态投影纠正。OUT：§12.3 禁止项。

## 验收标准

- [ ] `AC-621`：满足 Spec 验收合同 AC-621 的可观察结果。
- [ ] `AC-622`：满足 Spec 验收合同 AC-622 的可观察结果。
- [ ] `AC-623`：满足 Spec 验收合同 AC-623 的可观察结果。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 修复流程/旧哈希/部分失败 | 集成 | `pnpm exec vitest run src/modules/health src/modules/archives` | 通过 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-18.md</Path>` |
| 安全回归 | 门禁 | `pnpm test:safety-regressions` | 通过 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-18.md</Path>` |

- **E2E disposition：** not-required：UI 在 T-19。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

## 执行约束

依赖、深度、路径所有权与 Skill 绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。共同约束见 Map §1“总体实施背景”。复制或改编 bz 内容时在文件头署名并在 `<Path>docs/third-party/bz.md</Path>` 追加条目（AC-001）。改动 TS/TSX 时运行 `pnpm run build` 与 `pnpm run lint`，重建的 `main.js`/`styles.css` 由 Lead 统一处理。

## 未决事项与风险

数据修改：只开放可证明可重建项；回退为恢复事务。

### 未决问题

无。
