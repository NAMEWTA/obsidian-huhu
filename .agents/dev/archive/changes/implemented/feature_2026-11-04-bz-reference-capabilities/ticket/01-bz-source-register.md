---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: "ticket"
ui_change: false
design_ref: null
change: "2026-11-04-bz-reference-capabilities"
id: "T-01"
title: "bz 来源登记骨架与许可"
status: "done"
kind: "documentation"
planning_depth: "lite"
planning_depth_reason: "纯文档与许可文本，无运行时行为"
ready: true
risk: "low"
blocked_by: []
contract_ids: ["AC-001"]
owner: "herdr:impl1"
expected_changes: ["<Path>docs/third-party/bz.md</Path>", "<Path>docs/third-party/licenses/bz-MIT.txt</Path>", "<Path>docs/third-party/licenses/sources.json</Path>", "<Path>NOTICE</Path>", "<Path>docs/references.md</Path>"]
writable_paths: ["<Path>docs/third-party/bz.md</Path>", "<Path>docs/third-party/licenses/bz-MIT.txt</Path>"]
read_only_paths: []
shared_paths: ["<Path>docs/third-party/licenses/sources.json</Path>", "<Path>NOTICE</Path>", "<Path>docs/references.md</Path>", "<Path>main.js</Path>", "<Path>styles.css</Path>"]
shared_path_owners: ["<Path>docs/third-party/licenses/sources.json</Path> => Lead", "<Path>NOTICE</Path> => Lead", "<Path>docs/references.md</Path> => Lead", "<Path>main.js</Path> => Lead", "<Path>styles.css</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "d217057f068f3fe9e59205fa372896c298dcd9afda5da1c46f7e441d5018283e", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---
# Ticket T-01: bz 来源登记骨架与许可

- **总体 Map：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/tickets-map.md</Path>`
- **Goal Plan：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/goal-plan.md</Path>`
- **上游 Spec：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/spec.md</Path>`
- **完成 Evidence：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-01.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

建立 bz 来源登记，后续每张复用 bz 的票在其中追加条目。来源：Spec 第 7 节、ADR-003、LOG-008；上游 https://github.com/yeshimei/bz/tree/d76a0870329403247917a00c43019e203a2560a4（MIT，版权 `Copyright (c) 2026 叫我包仔`）。

## 行为与范围

IN：`docs/third-party/bz.md` 骨架（固定 SHA d76a087、条目表头：上游路径/虎虎落点/方式 复制|改编|交互复刻|未采用/偏离原因/验证）；预登记已确定“未采用”项（插件目录 storage、全局 DOM 单例、手写字体、加密日记）；保存 bz LICENSE 原文；按 `pnpm notices` 机制更新 NOTICE、`docs/references.md`、`sources.json`。OUT：具体复制条目由各实现票追加。

## 验收标准

- [ ] `AC-001`：满足 Spec 验收合同 AC-001 的可观察结果。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 许可与通知 | 门禁 | `pnpm check:notices && pnpm test:license-texts` | 通过 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-01.md</Path>` |
| 文档链接 | 门禁 | `pnpm test:docs` | 通过 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-01.md</Path>` |

- **E2E disposition：** not-required：纯文档。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

## 执行约束

依赖、深度、路径所有权与 Skill 绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。共同约束见 Map §1“总体实施背景”。复制或改编 bz 内容时在文件头署名并在 `<Path>docs/third-party/bz.md</Path>` 追加条目（AC-001）。改动 TS/TSX 时运行 `pnpm run build` 与 `pnpm run lint`，重建的 `main.js`/`styles.css` 由 Lead 统一处理。

## 未决事项与风险

无。

### 未决问题

无。
