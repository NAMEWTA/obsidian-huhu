---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: "ticket"
ui_change: false
design_ref: null
change: "2026-11-04-bz-reference-capabilities"
id: "T-08"
title: "归物预设、生命周期命令与统一统计"
status: "done"
kind: "feature"
planning_depth: "deep"
planning_depth_reason: "新增档案预设与数据口径，涉及金额与历史重放"
ready: true
risk: "high"
blocked_by: ["T-04"]
contract_ids: ["AC-301", "AC-302", "AC-303", "AC-304", "AC-305", "AC-313"]
owner: "herdr:impl1"
expected_changes: ["<Path>src/modules/archives/core/schema/presets.ts</Path>", "<Path>src/modules/archives/core/belongings/</Path>", "<Path>src/modules/archives/api.ts</Path>", "<Path>test/golden/</Path>"]
writable_paths: ["<Path>src/modules/archives/core/**</Path>", "<Path>src/modules/archives/services/**</Path>", "<Path>src/modules/archives/api.ts</Path>", "<Path>test/golden/archives-v2.test.ts</Path>", "<Path>test/golden/__snapshots__/**</Path>"]
read_only_paths: []
shared_paths: ["<Path>src/modules/archives/i18n.ts</Path>", "<Path>main.js</Path>", "<Path>styles.css</Path>"]
shared_path_owners: ["<Path>src/modules/archives/i18n.ts</Path> => Lead", "<Path>main.js</Path> => Lead", "<Path>styles.css</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "d217057f068f3fe9e59205fa372896c298dcd9afda5da1c46f7e441d5018283e", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---
# Ticket T-08: 归物预设、生命周期命令与统一统计

- **总体 Map：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/tickets-map.md</Path>`
- **Goal Plan：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/goal-plan.md</Path>`
- **上游 Spec：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/spec.md</Path>`
- **完成 Evidence：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-08.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

归物本数据层（Spec 3 节、ADR-001、DEC-002）。业务理念改编 bz `src/belongings/types.ts`、`shared.ts`、`report.ts`（https://github.com/yeshimei/bz/tree/d76a0870329403247917a00c43019e203a2560a4/src/belongings），金额改用十进制＋币种。

## 行为与范围

IN：物品类型预设（经定义发布流程，不覆盖用户修改）；生命周期 `table` 字段；transition 命令（预期哈希、operationId 幂等、日期与状态校验、返库追加）；纯统计模块（币种分栏、未知≠0、精度、日均净成本、历史重放）；在 `api.ts` 暴露归物查询/命令；归物变更事件。OUT：估值、汇率、自动记账（OOS-006）。

## 验收标准

- [ ] `AC-301`：满足 Spec 验收合同 AC-301 的可观察结果。
- [ ] `AC-302`：满足 Spec 验收合同 AC-302 的可观察结果。
- [ ] `AC-303`：满足 Spec 验收合同 AC-303 的可观察结果。
- [ ] `AC-304`：满足 Spec 验收合同 AC-304 的可观察结果。
- [ ] `AC-305`：满足 Spec 验收合同 AC-305 的可观察结果。
- [ ] `AC-313`：满足 Spec 验收合同 AC-313 的可观察结果。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 生命周期与幂等 | 单元 | `pnpm exec vitest run src/modules/archives/core` | 通过 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-08.md</Path>` |
| 统计口径 | 单元 | 统计纯函数测试 | 通过 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-08.md</Path>` |
| 格式与互不覆盖 | 格式 | `pnpm exec vitest run test/golden/archives-v2.test.ts` | 通过；新增样本差异已核对 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-08.md</Path>` |

- **E2E disposition：** not-required：无 UI。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

## 执行约束

依赖、深度、路径所有权与 Skill 绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。共同约束见 Map §1“总体实施背景”。复制或改编 bz 内容时在文件头署名并在 `<Path>docs/third-party/bz.md</Path>` 追加条目（AC-001）。改动 TS/TSX 时运行 `pnpm run build` 与 `pnpm run lint`，重建的 `main.js`/`styles.css` 由 Lead 统一处理。

## 未决事项与风险

预设升级：DEC-002；数值口径以纯函数单测锁定。

### 未决问题

无。
