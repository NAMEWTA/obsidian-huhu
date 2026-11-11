---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: "ticket"
ui_change: false
design_ref: null
change: "2026-11-04-bz-reference-capabilities"
id: "T-05"
title: "通知基础设施泛化与渠道贡献点"
status: "done"
kind: "refactor"
planning_depth: "deep"
planning_depth_reason: "共享合同变更，需迁移现有自动化消费者"
ready: true
risk: "high"
blocked_by: ["T-02"]
contract_ids: ["AC-131", "AC-132", "AC-133", "AC-134"]
owner: "herdr:impl2"
expected_changes: ["<Path>src/modules/notifications/api.ts</Path>", "<Path>src/modules/notifications/core/</Path>", "<Path>src/modules/notifications/platform/delivery.ts</Path>", "<Path>src/shared/automation/types.ts</Path>", "<Path>src/modules/automations/</Path>"]
writable_paths: ["<Path>src/modules/notifications/**</Path>", "<Path>src/modules/automations/services/**</Path>", "<Path>src/modules/automations/contrib/**</Path>", "<Path>src/shared/automation/metadata.ts</Path>", "<Path>src/modules/automations/core/actions/definition.ts</Path>", "<Path>src/modules/automations/core/**/*.test.ts</Path>", "<Path>src/shared/automation/metadata.test.ts</Path>"]
read_only_paths: ["<Path>src/modules/home/contrib/automation-source.ts</Path>"]
shared_paths: ["<Path>src/shared/automation/types.ts</Path>", "<Path>main.js</Path>", "<Path>styles.css</Path>"]
shared_path_owners: ["<Path>src/shared/automation/types.ts</Path> => Lead", "<Path>main.js</Path> => Lead", "<Path>styles.css</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "d217057f068f3fe9e59205fa372896c298dcd9afda5da1c46f7e441d5018283e", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---
# Ticket T-05: 通知基础设施泛化与渠道贡献点

- **总体 Map：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/tickets-map.md</Path>`
- **Goal Plan：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/goal-plan.md</Path>`
- **上游 Spec：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/spec.md</Path>`
- **完成 Evidence：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-05.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

把通知泛化为统一基础设施（Spec 1 节、ADR-005、DEC-001、LOG-017/020）。

## 行为与范围

IN：请求的来源/目标改为可辨别类型（自动化运行为一种）；opener 按类型贡献；`NOTIFICATION_CHANNELS` 渠道贡献点，`in-app`/`system` 迁为首批实现；`NotificationChannelId` 移出 `shared/automation`；automations 迁到新协议；inbox 路径与幂等语义不变；不保留旧类型别名。OUT：外部渠道实现（OOS-003）。

## 验收标准

- [ ] `AC-131`：满足 Spec 验收合同 AC-131 的可观察结果。
- [ ] `AC-132`：满足 Spec 验收合同 AC-132 的可观察结果。
- [ ] `AC-133`：满足 Spec 验收合同 AC-133 的可观察结果。
- [ ] `AC-134`：满足 Spec 验收合同 AC-134 的可观察结果。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 自动化通知回归 | 单元 | `pnpm exec vitest run src/modules/notifications src/modules/automations` | 通过 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-05.md</Path>` |
| 非自动化来源与测试渠道 | 单元 | 新增 notifications 单测 | 通过 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-05.md</Path>` |
| 安全回归 | 门禁 | `pnpm test:safety-regressions && pnpm test:architecture` | 通过 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-05.md</Path>` |

- **E2E disposition：** not-required：通知中心界面不变。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

## 执行约束

依赖、深度、路径所有权与 Skill 绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。共同约束见 Map §1“总体实施背景”。复制或改编 bz 内容时在文件头署名并在 `<Path>docs/third-party/bz.md</Path>` 追加条目（AC-001）。改动 TS/TSX 时运行 `pnpm run build` 与 `pnpm run lint`，重建的 `main.js`/`styles.css` 由 Lead 统一处理。

## 未决事项与风险

共享类型迁移影响 automations/home：DEC-001 要求本票内完成全部消费者迁移并通过类型检查。

### 未决问题

无。
