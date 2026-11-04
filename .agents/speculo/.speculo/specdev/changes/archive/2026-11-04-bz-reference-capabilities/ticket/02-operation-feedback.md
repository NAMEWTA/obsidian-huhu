---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: "ticket"
ui_change: false
design_ref: null
change: "2026-11-04-bz-reference-capabilities"
id: "T-02"
title: "统一操作反馈协议与宿主适配"
status: "done"
kind: "feature"
planning_depth: "standard"
planning_depth_reason: "新增被多个模块消费的共享协议"
ready: true
risk: "medium"
blocked_by: []
contract_ids: ["AC-101", "AC-102", "AC-103", "AC-104", "AC-105"]
owner: "herdr:impl2"
expected_changes: ["<Path>src/shared/feedback/</Path>", "<Path>src/host/obsidian/feedback.ts</Path>", "<Path>src/app/main.ts</Path>"]
writable_paths: ["<Path>src/shared/feedback/**</Path>", "<Path>src/host/obsidian/feedback*.ts</Path>", "<Path>src/host/obsidian/feedback*.test.ts</Path>", "<Path>src/modules/safe/ui/**</Path>", "<Path>src/modules/safe/services/**</Path>", "<Path>src/modules/archives/ui/generic/**</Path>", "<Path>src/modules/archives/services/**</Path>"]
read_only_paths: ["<Path>src/ui/components/sonner.tsx</Path>"]
shared_paths: ["<Path>src/app/main.ts</Path>", "<Path>main.js</Path>", "<Path>styles.css</Path>", "<Path>src/modules/safe/i18n.ts</Path>", "<Path>src/modules/archives/i18n.ts</Path>"]
shared_path_owners: ["<Path>src/app/main.ts</Path> => Lead", "<Path>main.js</Path> => Lead", "<Path>styles.css</Path> => Lead", "<Path>src/modules/safe/i18n.ts</Path> => Lead", "<Path>src/modules/archives/i18n.ts</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "d217057f068f3fe9e59205fa372896c298dcd9afda5da1c46f7e441d5018283e", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---
# Ticket T-02: 统一操作反馈协议与宿主适配

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-02.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

提供统一操作反馈（Spec 1 节“操作反馈”、ADR-004）。行为参考 bz `src/core/notice.ts`（https://github.com/yeshimei/bz/tree/d76a0870329403247917a00c43019e203a2560a4/src/core/notice.ts）的同键合并、原位进度→结果、按字数调整时长；不复制其全局 DOM 与 z-index 方案。

## 行为与范围

IN：shared 纯协议与策略（操作 ID、去重键作用域与时间窗、级别、来源域、目标窗口、可本地化文案、确定/不确定进度、动作、终态、隐私级别）；host 适配：工作台内 sonner、工作台外 Notice；app 注入并随插件生命周期清理；以 safe 复制失败与 archives 保存失败作为首批两个真实消费者接入。REUSE：现有 sonner 组件与外观。OUT：全量替换 106 处 Notice（后续票在其触达范围内迁移）。

## 验收标准

- [ ] `AC-101`：满足 Spec 验收合同 AC-101 的可观察结果。
- [ ] `AC-102`：满足 Spec 验收合同 AC-102 的可观察结果。
- [ ] `AC-103`：满足 Spec 验收合同 AC-103 的可观察结果。
- [ ] `AC-104`：满足 Spec 验收合同 AC-104 的可观察结果。
- [ ] `AC-105`：满足 Spec 验收合同 AC-105 的可观察结果。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 合并、终态、敏感哨兵 | 单元 | `pnpm exec vitest run src/shared/feedback` | 通过 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-02.md</Path>` |
| 双 Document 与清理 | DOM | `pnpm exec vitest run --project dom <feedback dom 测试>` | 通过 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-02.md</Path>` |
| notifications 禁用仍报错 | 单元 | 对应模块生命周期测试 | 通过 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-02.md</Path>` |
| 架构边界 | 门禁 | `pnpm test:architecture && pnpm run lint` | 通过 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-02.md</Path>` |

- **E2E disposition：** not-required：外观沿用现有 sonner，行为由 DOM 测试覆盖。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

## 执行约束

依赖、深度、路径所有权与 Skill 绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。共同约束见 Map §1“总体实施背景”。复制或改编 bz 内容时在文件头署名并在 `<Path>docs/third-party/bz.md</Path>` 追加条目（AC-001）。改动 TS/TSX 时运行 `pnpm run build` 与 `pnpm run lint`，重建的 `main.js`/`styles.css` 由 Lead 统一处理。

## 未决事项与风险

首批消费者改动只限错误反馈路径，不改 safe/archives 其他行为。

### 未决问题

无。
