---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: "ticket"
ui_change: false
design_ref: null
change: "2026-11-04-bz-reference-capabilities"
id: "T-03"
title: "实例作用域的类型化领域事件端口"
status: "done"
kind: "feature"
planning_depth: "standard"
planning_depth_reason: "新增共享原语与生命周期绑定"
ready: true
risk: "medium"
blocked_by: []
contract_ids: ["AC-111", "AC-112"]
owner: "herdr:impl1"
expected_changes: ["<Path>src/shared/events/</Path>", "<Path>src/app/contracts/module.ts</Path>"]
writable_paths: ["<Path>src/shared/events/**</Path>"]
read_only_paths: ["<Path>src/app/contracts/**</Path>"]
shared_paths: ["<Path>src/app/main.ts</Path>", "<Path>main.js</Path>", "<Path>styles.css</Path>"]
shared_path_owners: ["<Path>src/app/main.ts</Path> => Lead", "<Path>main.js</Path> => Lead", "<Path>styles.css</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "d217057f068f3fe9e59205fa372896c298dcd9afda5da1c46f7e441d5018283e", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---
# Ticket T-03: 实例作用域的类型化领域事件端口

- **总体 Map：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/tickets-map.md</Path>`
- **Goal Plan：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/goal-plan.md</Path>`
- **上游 Spec：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/spec.md</Path>`
- **完成 Evidence：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-03.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

提供领域事件端口（Spec 1 节、ADR-004）。改编 bz `src/core/domain-bus.ts`（https://github.com/yeshimei/bz/tree/d76a0870329403247917a00c43019e203a2560a4/src/core/domain-bus.ts）的订阅快照、幂等退订、异常隔离核心，升级为实例化、类型化、受生命周期控制。

## 行为与范围

IN：事件 key 类型与 payload 由所属域声明的机制；订阅返回幂等 disposer，可绑定 AbortSignal 与模块 lifetime；同步异常/异步拒绝隔离；app 为每个插件实例创建端口。OUT：替换 zustand subscribe / ServiceAccess.watch。复制部分须在文件头署名并在 bz.md 登记。

## 验收标准

- [ ] `AC-111`：满足 Spec 验收合同 AC-111 的可观察结果。
- [ ] `AC-112`：满足 Spec 验收合同 AC-112 的可观察结果。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 订阅/退订/中止/异常隔离 | 单元 | `pnpm exec vitest run src/shared/events` | 通过 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-03.md</Path>` |
| 无全局单例 | 门禁 | `pnpm test:architecture` | 通过 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/T-03.md</Path>` |

- **E2E disposition：** not-required：无 UI。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

## 执行约束

依赖、深度、路径所有权与 Skill 绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。共同约束见 Map §1“总体实施背景”。复制或改编 bz 内容时在文件头署名并在 `<Path>docs/third-party/bz.md</Path>` 追加条目（AC-001）。改动 TS/TSX 时运行 `pnpm run build` 与 `pnpm run lint`，重建的 `main.js`/`styles.css` 由 Lead 统一处理。

## 未决事项与风险

无。

### 未决问题

无。
