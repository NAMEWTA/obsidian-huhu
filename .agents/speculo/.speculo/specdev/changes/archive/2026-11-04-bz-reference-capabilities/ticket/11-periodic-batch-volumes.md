---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: "ticket"
ui_change: false
design_ref: null
change: "2026-11-04-bz-reference-capabilities"
id: "T-11"
title: "周期日记只读批量列表与分卷"
status: "done"
kind: "feature"
planning_depth: "standard"
planning_depth_reason: "扩展 navigator 公共 API"
ready: true
risk: "medium"
blocked_by: []
contract_ids: ["AC-401", "AC-402"]
owner: "herdr:impl3"
expected_changes: ["<Path>src/modules/navigator/api.ts</Path>", "<Path>src/modules/navigator/core/periodic.ts</Path>", "<Path>src/modules/navigator/core/diary-volumes.ts</Path>", "<Path>src/modules/navigator/module.ts</Path>"]
writable_paths: ["<Path>src/modules/navigator/api.ts</Path>", "<Path>src/modules/navigator/core/**</Path>", "<Path>src/modules/navigator/services/**</Path>"]
read_only_paths: ["<Path>src/shared/periodic-paths.ts</Path>", "<Path>src/modules/home/**</Path>"]
shared_paths: ["<Path>src/modules/navigator/module.ts</Path>", "<Path>main.js</Path>", "<Path>styles.css</Path>"]
shared_path_owners: ["<Path>src/modules/navigator/module.ts</Path> => Lead", "<Path>main.js</Path> => Lead", "<Path>styles.css</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "d217057f068f3fe9e59205fa372896c298dcd9afda5da1c46f7e441d5018283e", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---
# Ticket T-11: 周期日记只读批量列表与分卷

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-11.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

为书页日记提供数据（Spec 4 节、ADR-002）。分卷改编 bz `src/diary/volume.ts`（https://github.com/yeshimei/bz/tree/d76a0870329403247917a00c43019e203a2560a4/src/diary/volume.ts）。

## 行为与范围

IN：`NAVIGATOR_PERIODIC` 增加按日期范围的只读列表（路径/日期/摘要，零写入）；按天/月分卷与月份跨度纯函数。OUT：UI。

## 验收标准

- [ ] `AC-401`：满足 Spec 验收合同 AC-401 的可观察结果。
- [ ] `AC-402`：满足 Spec 验收合同 AC-402 的可观察结果。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 零写入 | 单元 | `pnpm exec vitest run src/modules/navigator`（写 API spy） | 通过 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-11.md</Path>` |
| 分卷边界 | 单元 | 分卷纯函数测试 | 通过 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-11.md</Path>` |

- **E2E disposition：** not-required：无 UI。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

## 执行约束

依赖、深度、路径所有权与 Skill 绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。共同约束见 Map §1“总体实施背景”。复制或改编 bz 内容时在文件头署名并在 `<Path>docs/third-party/bz.md</Path>` 追加条目（AC-001）。改动 TS/TSX 时运行 `pnpm run build` 与 `pnpm run lint`，重建的 `main.js`/`styles.css` 由 Lead 统一处理。

## 未决事项与风险

home 日历消费者只读核对，不改。

### 未决问题

无。
