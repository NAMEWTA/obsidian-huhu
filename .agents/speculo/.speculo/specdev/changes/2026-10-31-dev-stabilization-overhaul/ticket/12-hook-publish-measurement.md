---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: ticket
ui_change: false
design_ref: null
change: 2026-10-31-dev-stabilization-overhaul
id: T-12
title: "Hook 发布链分段测量与 Windows CI 到达性"
status: in_progress
kind: investigation
planning_depth: standard
planning_depth_reason: "需在 Windows 上独立运行 32×3 用例并分解发布路径耗时，为 T-13 提供证据"
ready: true
risk: medium
blocked_by: ["T-01"]
contract_ids: ["AC-311"]
owner: "host:codex/root"
expected_changes: ["<Path>.github/workflows/hook-windows.yml</Path>", "<Path>src/modules/agent/platform/desktop/hooks/hook-spool.test.ts</Path>"]
writable_paths: ["<Path>.github/workflows/hook-windows.yml</Path>","<Path>src/modules/agent/platform/desktop/hooks/hook-spool.test.ts</Path>","<Path>docs/e2e/dev-overhaul/hook/**</Path>","<Path>scripts/fixtures/dev-overhaul-hook/run-measurement.mjs</Path>"]
read_only_paths: ["<Path>src/modules/agent/platform/desktop/hooks/hook-spool.ts</Path>","<Path>src/modules/agent/platform/desktop/hooks/spool-guard.ts</Path>","<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/execution-boundaries.md</Path>","<Path>src/modules/browser/**</Path>","<Path>native/browser-runtime/**</Path>"]
shared_paths: []
shared_path_owners: []
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "9f2bd86d620ed274f75eecfeab254efce5a40fa2ad5c5d255c7f877a93848cc7", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---

# Ticket T-12: Hook 发布链分段测量与 Windows CI 到达性

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-12.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

确认 Windows CI 是否完整执行 32 scopes × 3 ordered events，并分解等待 collector、持有 collector、路径校验、token 校验、写入发布、消费回收各段耗时。来源：#37 W3.1–W3.2；Spec AC-311。

## 行为与范围

IN：独立 Windows 工作流单独运行目标用例；测试内加分段计时诊断（不改变时限或成功断言）；结果写入 `docs/e2e/dev-overhaul/hook/`。OUT：产品修复（T-13）。

## 验收标准

- [ ] `AC-311`：Windows runner 上目标用例确实执行，分段耗时与失败数有记录。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 到达性 | GitHub Actions | 手动触发 `hook-windows.yml` | 日志含 32×3 用例执行行 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-12.md</Path>` |
| 诊断不改语义 | vitest | `pnpm vitest run src/modules/agent/platform/desktop/hooks/hook-spool.test.ts` | 断言与时限未变 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-12.md</Path>` |

- **E2E disposition：** not-required：测量票。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

## 执行约束

依赖、深度及理由、路径所有权、资源声明和 Skill 调用绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。必需项目 Skill 按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 实际调用并保留证据。

诊断输出有上限，不含路径外敏感信息。

**证据失效：** base/head 变化触及本票写集、上游 ADR/Spec 对应条目修订、或绑定 Skill 摘要变化时，本票已有验证需重跑。

## 未决事项与风险

无

### 未决问题

无。

## 本轮范围与共享执行约束（LOG-017、LOG-018）

必读 `<Path>{roots.state}/specdev/changes/{change}/execution-boundaries.md</Path>`：Browser 及其集成面冻结，优先于本票宽目录写集；shared_paths 仅由声明的 Lead owner 串行写入。构建、全量验证及共享组件变更遵守该文件，不通过修复浏览器解除其他票的阻塞。本轮只更新计划，生产实现和 Git/远程动作尚未授权。

## 远程执行决定（2026-10-31）

用户对035具体四文件临时分支Windows验证方案明确答复：“暂不运行远程 CI，继续本地任务”。未创建远程分支/提交/推送或触发job；Windows AC311仍待验收。本地20轮真实观察及方案保留，不把延期当通过；继续其他已授权本地工作。
