---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: "ticket"
ui_change: false
design_ref: null
change: "2026-11-04-bz-reference-capabilities"
id: "T-14"
title: "人物纪事字段与命令"
status: "done"
kind: "feature"
planning_depth: "standard"
planning_depth_reason: "人物预设修订，经定义发布流程"
ready: true
risk: "medium"
blocked_by: ["T-08", "T-09"]
contract_ids: ["AC-502", "AC-503"]
owner: "herdr:impl3"
expected_changes: ["<Path>src/modules/archives/core/schema/presets.ts</Path>", "<Path>src/modules/archives/services/</Path>"]
writable_paths: ["<Path>src/modules/archives/core/**</Path>", "<Path>src/modules/archives/services/**</Path>", "<Path>test/golden/archives-v2.test.ts</Path>", "<Path>test/golden/__snapshots__/**</Path>"]
read_only_paths: []
shared_paths: ["<Path>src/modules/archives/i18n.ts</Path>", "<Path>main.js</Path>", "<Path>styles.css</Path>"]
shared_path_owners: ["<Path>src/modules/archives/i18n.ts</Path> => Lead", "<Path>main.js</Path> => Lead", "<Path>styles.css</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "d217057f068f3fe9e59205fa372896c298dcd9afda5da1c46f7e441d5018283e", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---
# Ticket T-14: 人物纪事字段与命令

- **总体 Map：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/tickets-map.md</Path>`
- **Goal Plan：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/goal-plan.md</Path>`
- **上游 Spec：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/spec.md</Path>`
- **完成 Evidence：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-14.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

人物阅读层的数据部分（Spec 5 节、DEC-002）。

## 行为与范围

IN：人物预设新增纪事 `table` 字段（日期、标题、内容、关联实体）并经修订发布；纪事增删改经 `ARCHIVES_COMMANDS` 预期哈希写入；未涉及字段与正文不变。OUT：私密材料、AI（OOS-001/002）。

## 验收标准

- [ ] `AC-502`：满足 Spec 验收合同 AC-502 的可观察结果。
- [ ] `AC-503`：满足 Spec 验收合同 AC-503 的可观察结果。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 写入与不变量 | 服务 | `pnpm exec vitest run src/modules/archives` | 通过 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-14.md</Path>` |
| 格式 | 格式 | `pnpm exec vitest run test/golden/archives-v2.test.ts` | 通过 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-14.md</Path>` |

- **E2E disposition：** not-required：无 UI。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

## 执行约束

依赖、深度、路径所有权与 Skill 绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。共同约束见 Map §1“总体实施背景”。复制或改编 bz 内容时在文件头署名并在 `<Path>docs/third-party/bz.md</Path>` 追加条目（AC-001）。改动 TS/TSX 时运行 `pnpm run build` 与 `pnpm run lint`，重建的 `main.js`/`styles.css` 由 Lead 统一处理。

## 未决事项与风险

预设升级：DEC-002。

### 未决问题

无。
