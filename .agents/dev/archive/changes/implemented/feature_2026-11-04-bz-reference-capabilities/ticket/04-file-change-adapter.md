---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: "ticket"
ui_change: false
design_ref: null
change: "2026-11-04-bz-reference-capabilities"
id: "T-04"
title: "文件变化适配与 archives 首个接入"
status: "done"
kind: "feature"
planning_depth: "deep"
planning_depth_reason: "影响档案索引正确性，涉及事件乱序与卸载清理"
ready: true
risk: "high"
blocked_by: ["T-03", "T-02"]
contract_ids: ["AC-121", "AC-122", "AC-123", "AC-124"]
owner: "herdr:impl1"
expected_changes: ["<Path>src/host/obsidian/file-changes.ts</Path>", "<Path>src/modules/archives/module.ts</Path>", "<Path>src/modules/archives/services/generic/</Path>"]
writable_paths: ["<Path>src/host/obsidian/file-changes*.ts</Path>", "<Path>src/modules/archives/services/**</Path>", "<Path>scripts/accept-archives-v2-scale.ts</Path>", "<Path>src/modules/archives/core/generic/**</Path>"]
read_only_paths: ["<Path>src/modules/navigator/platform/vault-index.ts</Path>", "<Path>src/modules/versioning/**</Path>"]
shared_paths: ["<Path>src/app/main.ts</Path>", "<Path>src/modules/archives/module.ts</Path>", "<Path>main.js</Path>", "<Path>styles.css</Path>"]
shared_path_owners: ["<Path>src/app/main.ts</Path> => Lead", "<Path>src/modules/archives/module.ts</Path> => Lead", "<Path>main.js</Path> => Lead", "<Path>styles.css</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "d217057f068f3fe9e59205fa372896c298dcd9afda5da1c46f7e441d5018283e", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---
# Ticket T-04: 文件变化适配与 archives 首个接入

- **总体 Map：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/tickets-map.md</Path>`
- **Goal Plan：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/goal-plan.md</Path>`
- **上游 Spec：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/spec.md</Path>`
- **完成 Evidence：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-04.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

统一文件变化事件并让 archives 索引接入（Spec 1 节、OOS-008）。参考 bz `src/core/obsidian-adapter.ts`（https://github.com/yeshimei/bz/tree/d76a0870329403247917a00c43019e203a2560a4/src/core/obsidian-adapter.ts）区分原文件变化与 metadata 就绪。

## 行为与范围

IN：create/modify/delete/rename/目录移动/metadata 就绪/批次失效；rename 失效新旧范围；路径合并、有界队列、最大等待、溢出保守 rescan；私有写入由 repository 主动失效；卸载清理与 generation 防护；archives 的 `vault.on`/`metadataCache.on` 改为经适配器。OUT：其他模块监听迁移。

## 验收标准

- [ ] `AC-121`：满足 Spec 验收合同 AC-121 的可观察结果。
- [ ] `AC-122`：满足 Spec 验收合同 AC-122 的可观察结果。
- [ ] `AC-123`：满足 Spec 验收合同 AC-123 的可观察结果。
- [ ] `AC-124`：满足 Spec 验收合同 AC-124 的可观察结果。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 事件时序/合并/溢出 | 单元 | `pnpm exec vitest run src/host/obsidian/file-changes` | 通过 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-04.md</Path>` |
| archives 索引正确 | 服务 | `pnpm exec vitest run src/modules/archives test/golden/archives-v2.test.ts test/golden/archive-relation.test.ts` | 通过 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-04.md</Path>` |
| 生命周期 | 门禁 | `pnpm test:workbench-lifecycle` | 通过 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-04.md</Path>` |
| 规模 | 验收脚本 | `pnpm accept:archives-v2-scale` | 无退化 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-04.md</Path>` |

- **E2E disposition：** not-required：行为由服务与规模测试覆盖；宿主内真实同步属用户验收。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

## 执行约束

依赖、深度、路径所有权与 Skill 绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。共同约束见 Map §1“总体实施背景”。复制或改编 bz 内容时在文件头署名并在 `<Path>docs/third-party/bz.md</Path>` 追加条目（AC-001）。改动 TS/TSX 时运行 `pnpm run build` 与 `pnpm run lint`，重建的 `main.js`/`styles.css` 由 Lead 统一处理。

## 未决事项与风险

索引漏更新：以目录 rename/移出根目录用例承接；回退方式为恢复 archives 原监听实现。

### 未决问题

无。
