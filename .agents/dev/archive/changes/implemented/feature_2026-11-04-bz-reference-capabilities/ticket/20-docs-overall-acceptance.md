---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: "ticket"
ui_change: false
design_ref: null
change: "2026-11-04-bz-reference-capabilities"
id: "T-20"
title: "用户文档与整体验收"
status: "done"
kind: "documentation"
planning_depth: "standard"
planning_depth_reason: "跨模块文档与整体门禁"
ready: true
risk: "medium"
blocked_by: ["T-01", "T-02", "T-03", "T-04", "T-05", "T-06", "T-07", "T-08", "T-09", "T-10", "T-11", "T-12", "T-13", "T-14", "T-15", "T-16", "T-17", "T-18", "T-19"]
contract_ids: ["AC-001", "AC-901", "AC-902", "AC-903"]
owner: "herdr:impl3"
expected_changes: ["<Path>docs/safe.md</Path>", "<Path>docs/contacts.md</Path>", "<Path>docs/navigator.md</Path>", "<Path>docs/data.md</Path>", "<Path>docs/architecture.md</Path>", "<Path>docs/health.md</Path>", "<Path>docs/third-party/bz.md</Path>"]
writable_paths: ["<Path>docs/safe.md</Path>", "<Path>docs/contacts.md</Path>", "<Path>docs/navigator.md</Path>", "<Path>docs/data.md</Path>", "<Path>docs/architecture.md</Path>", "<Path>docs/health.md</Path>", "<Path>docs/third-party/bz.md</Path>", "<Path>docs/README.md</Path>"]
read_only_paths: ["<Path>src/**</Path>"]
shared_paths: ["<Path>README.md</Path>", "<Path>README.ZH.md</Path>", "<Path>docs/references.md</Path>", "<Path>NOTICE</Path>", "<Path>main.js</Path>", "<Path>styles.css</Path>"]
shared_path_owners: ["<Path>README.md</Path> => Lead", "<Path>README.ZH.md</Path> => Lead", "<Path>docs/references.md</Path> => Lead", "<Path>NOTICE</Path> => Lead", "<Path>main.js</Path> => Lead", "<Path>styles.css</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "d217057f068f3fe9e59205fa372896c298dcd9afda5da1c46f7e441d5018283e", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---
# Ticket T-20: 用户文档与整体验收

- **总体 Map：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/tickets-map.md</Path>`
- **Goal Plan：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/goal-plan.md</Path>`
- **上游 Spec：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/spec.md</Path>`
- **完成 Evidence：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-20.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

收尾：文档描述当前实现、来源登记完整、整体门禁通过（Spec AC-901–903）。

## 行为与范围

IN：更新 Spec AC-902 所列文档并新增体检文档；核对 bz.md 与实际复制/改编一致；运行整体门禁与 UI runner 汇总。OUT：发版、提交、推送。

## 验收标准

- [ ] `AC-001`：满足 Spec 验收合同 AC-001 的可观察结果。
- [ ] `AC-901`：满足 Spec 验收合同 AC-901 的可观察结果。
- [ ] `AC-902`：满足 Spec 验收合同 AC-902 的可观察结果。
- [ ] `AC-903`：满足 Spec 验收合同 AC-903 的可观察结果。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 整体门禁 | 门禁 | `pnpm run build && pnpm run lint && pnpm test && pnpm test:architecture && pnpm test:i18n && pnpm test:docs && pnpm check:styles && pnpm check:bundle && pnpm check:notices` | 全部通过 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-20.md</Path>` |
| UI 汇总 | 组件 E2E | `node scripts/ui-review/run.mjs` | 全部 UI 票通过 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-20.md</Path>` |

- **E2E disposition：** required：汇总各 UI 票 runner 结果；宿主内表现标待用户验收。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

## 执行约束

依赖、深度、路径所有权与 Skill 绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。共同约束见 Map §1“总体实施背景”。复制或改编 bz 内容时在文件头署名并在 `<Path>docs/third-party/bz.md</Path>` 追加条目（AC-001）。改动 TS/TSX 时运行 `pnpm run build` 与 `pnpm run lint`，重建的 `main.js`/`styles.css` 由 Lead 统一处理。

## 未决事项与风险

无。

### 未决问题

无。
