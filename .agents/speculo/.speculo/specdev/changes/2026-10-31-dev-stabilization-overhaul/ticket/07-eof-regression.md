---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: ticket
ui_change: false
design_ref: null
change: 2026-10-31-dev-stabilization-overhaul
id: T-07
title: "子进程中途 EOF 的确定性回归与诊断关联"
status: "draft"
kind: bug
planning_depth: "deep"
planning_depth_reason: "高风险 EOF 根因未确认；先诊断，再补生产修复写集和稳定 Windows 回归门"
ready: false
risk: high
blocked_by: ["T-04", "T-06"]
contract_ids: ["AC-301"]
owner: unassigned
expected_changes: ["<Path>native/huhubot/tests/contract/effect-reconcile/</Path>", "<Path>src/modules/huhubot/platform/desktop/transport/runner.test.ts</Path>"]
writable_paths: ["<Path>native/huhubot/tests/contract/effect-reconcile/**</Path>","<Path>src/modules/huhubot/platform/desktop/transport/runner.test.ts</Path>","<Path>docs/e2e/dev-overhaul/eof/**</Path>","<Path>.github/workflows/huhu-bot.yml</Path>"]
read_only_paths: ["<Path>native/huhubot/tests/contract/foundation/</Path>","<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/execution-boundaries.md</Path>","<Path>src/modules/browser/**</Path>","<Path>native/browser-runtime/**</Path>"]
shared_paths: []
shared_path_owners: []
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "9f2bd86d620ed274f75eecfeab254efce5a40fa2ad5c5d255c7f877a93848cc7", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---

# Ticket T-07: 子进程中途 EOF 的确定性回归与诊断关联

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-07.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

让 #30 的 EOF 有确定性根因回归，或明确记录剩余风险并保持未完成。来源：#37 W2.11–W2.13；Spec AC-301。

## 行为与范围

IN：复用 Run 退出码 4、Close 退出码 5、信号与 stderr，关联最后请求/响应、关闭请求与退出阶段；真实 TS↔Go 夹具覆盖父管道仍打开、stdin EOF、正常停止、异常退出、停止中断流、退出后重开与效果对账。OUT：不硬套 WAL 根因；不靠重跑绿色关闭。

## 验收标准

- [ ] `AC-301`：Windows runner 上各退出路径有确定性用例；根因结论或剩余风险写入 `docs/e2e/dev-overhaul/eof/`；重连不造成重复外部动作。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 退出路径 | Go 合同 + vitest | `cd native/huhubot && go test ./tests/contract/effect-reconcile/...`；`pnpm vitest run src/modules/huhubot/platform/desktop/transport/runner.test.ts` | 通过 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-07.md</Path>` |
| Windows | GitHub Actions | `huhu-bot.yml` 的 Windows job 显式运行 `pnpm exec vitest run src/modules/huhubot/platform/desktop/transport/runner.test.ts`，并保留 Go effect-reconcile 与真实进程用例 | 日志可定位 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-07.md</Path>` |

- **E2E disposition：** required：Lead 在 change-workspace 运行 `pnpm check:huhu-bot`。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

## 执行约束

依赖、深度及理由、路径所有权、资源声明和 Skill 调用绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。必需项目 Skill 按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 实际调用并保留证据。

未知原因保持未知；A30 只在有确定性回归或明确剩余风险记录时才可评估。

**证据失效：** base/head 变化触及本票写集、上游 ADR/Spec 对应条目修订、或绑定 Skill 摘要变化时，本票已有验证需重跑。

## 未决事项与风险

Windows 上可能仍无法复现；如实记录。

### 未决问题

先经 D 在 diagnosis.md 的 T-07 条目记录复现、因果实验和剩余风险。Lead 按根因补本票实际生产修复文件、调用方/测试与恢复合同，重新校验写集、DAG 和 DoR 后才置 ready；当前测试写集不是生产修复授权。无法确定根因时保持未完成。Windows job 的 Vitest 步骤由本票负责，CI 不可达则保留未验收。

## 本轮范围与共享执行约束（LOG-017、LOG-018）

必读 `<Path>{roots.state}/specdev/changes/{change}/execution-boundaries.md</Path>`：Browser 及其集成面冻结，优先于本票宽目录写集；shared_paths 仅由声明的 Lead owner 串行写入。构建、全量验证及共享组件变更遵守该文件，不通过修复浏览器解除其他票的阻塞。本轮只更新计划，生产实现和 Git/远程动作尚未授权。
