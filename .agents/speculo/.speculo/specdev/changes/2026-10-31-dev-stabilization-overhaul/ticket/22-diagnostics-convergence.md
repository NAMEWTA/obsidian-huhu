---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: ticket
ui_change: false
design_ref: null
change: 2026-10-31-dev-stabilization-overhaul
id: T-22
title: "失败诊断收口与偶发失败验证"
status: ready
kind: refactor
planning_depth: standard
planning_depth_reason: "跨 Go 合同测试与 TS 测试的诊断收敛，需保持测试语义"
ready: true
risk: medium
blocked_by: ["T-07", "T-13", "T-12"]
contract_ids: ["AC-321"]
owner: unassigned
expected_changes: ["<Path>native/huhubot/tests/contract/effect-reconcile/child_test.go</Path>", "<Path>src/modules/agent/services/workspace-service-stop-native.test.ts</Path>"]
writable_paths: ["<Path>native/huhubot/tests/contract/effect-reconcile/**</Path>","<Path>native/huhubot/tests/contract/foundation/**</Path>","<Path>native/huhubot/tests/contract/events/**</Path>","<Path>native/huhubot/tests/contract/approval/**</Path>","<Path>src/modules/agent/services/workspace-service-stop-native.test.ts</Path>","<Path>src/modules/agent/platform/desktop/hooks/hook-spool.test.ts</Path>","<Path>docs/e2e/dev-overhaul/diagnostics/**</Path>","<Path>.github/workflows/dev-overhaul-diagnostics.yml</Path>"]
read_only_paths: ["<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/execution-boundaries.md</Path>","<Path>src/modules/browser/**</Path>","<Path>native/browser-runtime/**</Path>"]
shared_paths: []
shared_path_owners: []
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "9f2bd86d620ed274f75eecfeab254efce5a40fa2ad5c5d255c7f877a93848cc7", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---

# Ticket T-22: 失败诊断收口与偶发失败验证

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-22.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

#37 §4.1 诊断清单 6 处逐项做保留/收敛/删除决定；成功路径安静，失败输出有上限且脱敏；`workspace-service-stop-native` 偶发失败有独立验证结论。来源：#37 W0.4–W0.6；Spec AC-321。

## 行为与范围

IN：统一诊断字段（运行/请求标识、阶段、退出码/信号、耗时、WAL 字节、连接等待、Hook 等待/持有、缺失事件 ID、有限 stderr/栈）；协议 stdout 不混入诊断；approval 测试不再读取无意义占位 id。OUT：改变任何测试断言语义。

## 验收标准

- [ ] `AC-321`：决定表写入 `docs/e2e/dev-overhaul/diagnostics/`；成功路径无多余输出；偶发失败未复现时不写成已修复。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| Go 诊断 | Go 合同 | `cd native/huhubot && go test ./tests/contract/...` | 通过 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-22.md</Path>` |
| TS 诊断 | vitest | `pnpm vitest run src/modules/agent/services/workspace-service-stop-native.test.ts src/modules/agent/platform/desktop/hooks/hook-spool.test.ts` | 通过 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-22.md</Path>` |
| 偶发验证 | Ubuntu Node 22 runner 多轮 | 本票新增 dev-overhaul-diagnostics.yml：Ubuntu + Node 22，20 轮运行本票两个 TS 诊断用例并上传逐轮退出码 | 记录轮次与失败数 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-22.md</Path>` |

- **E2E disposition：** not-required：测试与诊断。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

## 执行约束

依赖、深度及理由、路径所有权、资源声明和 Skill 调用绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。必需项目 Skill 按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 实际调用并保留证据。

保留约 256 KiB 栈上限、终端尾部截取等既有边界；不写入凭据、完整笔记或环境变量全集。

**证据失效：** base/head 变化触及本票写集、上游 ADR/Spec 对应条目修订、或绑定 Skill 摘要变化时，本票已有验证需重跑。

## 未决事项与风险

无

### 未决问题

无。

## 本轮范围与共享执行约束（LOG-017、LOG-018）

必读 `<Path>{roots.state}/specdev/changes/{change}/execution-boundaries.md</Path>`：Browser 及其集成面冻结，优先于本票宽目录写集；shared_paths 仅由声明的 Lead owner 串行写入。构建、全量验证及共享组件变更遵守该文件，不通过修复浏览器解除其他票的阻塞。本轮只更新计划，生产实现和 Git/远程动作尚未授权。
