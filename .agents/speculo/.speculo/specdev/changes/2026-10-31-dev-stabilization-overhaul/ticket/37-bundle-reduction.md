---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: ticket
ui_change: false
design_ref: null
change: 2026-10-31-dev-stabilization-overhaul
id: T-37
title: "包体结构减重与可解释余量"
status: draft
kind: refactor
planning_depth: standard
planning_depth_reason: "跨模块去除重复实现与非必要激活代码，需检查真实产物"
ready: false
risk: medium
blocked_by: ["T-36", "T-21", "T-02"]
contract_ids: ["AC-331"]
owner: unassigned
expected_changes: ["<Path>scripts/bundle-budget.json</Path>", "<Path>esbuild.config.mjs</Path>"]
writable_paths: ["<Path>scripts/bundle-budget.json</Path>", "<Path>esbuild.config.mjs</Path>", "<Path>docs/e2e/dev-overhaul/bundle/**</Path>"]
read_only_paths: ["<Path>src/</Path>","<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/execution-boundaries.md</Path>","<Path>src/modules/browser/**</Path>","<Path>native/browser-runtime/**</Path>"]
shared_paths: ["<Path>main.js</Path>","<Path>styles.css</Path>","<Path>build/**</Path>","<Path>src/ui/styles/fonts.generated.css</Path>"]
shared_path_owners: ["<Path>main.js</Path> => Lead","<Path>styles.css</Path> => Lead","<Path>build/**</Path> => Lead","<Path>src/ui/styles/fonts.generated.css</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "9f2bd86d620ed274f75eecfeab254efce5a40fa2ad5c5d255c7f877a93848cc7", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---

# Ticket T-37: 包体结构减重与可解释余量

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-37.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

去除重复实现、废弃路径与非必要激活代码，建立可解释的开发余量。来源：#37 W7.4–W7.6；Spec AC-331。

## 行为与范围

IN：真实产物核对（单文件发布中 `import()` 不自动等于 main.js 变小）；确需增长单独记录差异、价值、替代方案与批准；同步预算理由。OUT：提高阈值换绿灯。

## 验收标准

- [ ] `AC-331`：报告与理由一致，无静默放宽，启动闭包无新禁止依赖。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 预算 | 构建 | `冻结期构建序列 + pnpm check:bundle` | 通过 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-37.md</Path>` |

- **E2E disposition：** required：Lead 在 change-workspace 运行 “冻结期构建序列（execution-boundaries）” 与 冻结期适用全量检查（execution-boundaries）。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

## 执行约束

依赖、深度及理由、路径所有权、资源声明和 Skill 调用绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。必需项目 Skill 按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 实际调用并保留证据。

无

**证据失效：** base/head 变化触及本票写集、上游 ADR/Spec 对应条目修订、或绑定 Skill 摘要变化时，本票已有验证需重跑。

## 未决事项与风险

无

### 未决问题

写集需在 T-36 完成后按实际减重目标重新划定（可能触及多个模块源码），届时 Lead 重审 DoR。

## 本轮范围与共享执行约束（LOG-017、LOG-018）

必读 `<Path>{roots.state}/specdev/changes/{change}/execution-boundaries.md</Path>`：Browser 及其集成面冻结，优先于本票宽目录写集；shared_paths 仅由声明的 Lead owner 串行写入。构建、全量验证及共享组件变更遵守该文件，不通过修复浏览器解除其他票的阻塞。本轮只更新计划，生产实现和 Git/远程动作尚未授权。

冻结期不得因基线失败、中文路径扫描、minify、包体或全量测试失败修改 Browser。验收只对当前未冻结范围下结论，既有 Browser 相关检查若排除则列明命令和原因。
