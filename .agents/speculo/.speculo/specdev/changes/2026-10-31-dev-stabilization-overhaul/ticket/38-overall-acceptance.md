---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: ticket
ui_change: false
design_ref: null
change: 2026-10-31-dev-stabilization-overhaul
id: T-38
title: "总体验收收口（G1–G3）"
status: draft
kind: review
planning_depth: standard
planning_depth_reason: "汇总全部批次证据并执行全量门禁"
ready: false
risk: high
blocked_by: ["T-03", "T-08", "T-11", "T-20", "T-22", "T-37"]
contract_ids: ["AC-001", "AC-901", "AC-902", "AC-903"]
owner: unassigned
expected_changes: ["<Path>docs/e2e/dev-overhaul/ledger.md</Path>"]
writable_paths: ["<Path>docs/e2e/dev-overhaul/**</Path>"]
read_only_paths: ["<Path>src/</Path>","<Path>native/</Path>","<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/execution-boundaries.md</Path>","<Path>src/modules/browser/**</Path>","<Path>native/browser-runtime/**</Path>"]
shared_paths: ["<Path>main.js</Path>","<Path>styles.css</Path>","<Path>build/**</Path>","<Path>src/ui/styles/fonts.generated.css</Path>"]
shared_path_owners: ["<Path>main.js</Path> => Lead","<Path>styles.css</Path> => Lead","<Path>build/**</Path> => Lead","<Path>src/ui/styles/fonts.generated.css</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "9f2bd86d620ed274f75eecfeab254efce5a40fa2ad5c5d255c7f877a93848cc7", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---

# Ticket T-38: 总体验收收口（G1–G3）

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-38.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

18 个 A 编号与 G1–G3 均有证据或明确未验收缺口。来源：#37 §15；Spec AC-001、AC-901–903。

## 行为与范围

IN：账本终版；无兼容层/双实现/失联旧样式的引用清点；数据切换与权限检查；冻结期适用全量检查（execution-boundaries） 与原生检查；标出用户真机验收项（agent 不执行）。OUT：关闭 #37（用户真机验收完成后由用户决定）。

## 验收标准

- [ ] `AC-001`：账本终版每项有证据定位。
- [ ] `AC-901`：无兼容层与双状态真相。
- [ ] `AC-902`：数据切换与用户资料保护符合 ADR-001/006/007/008。
- [ ] `AC-903`：全量检查一致，未验项未填成通过。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 全量 | pnpm 与 go | `冻结期适用全量检查 + 冻结期构建序列 + pnpm check:bundle`；`cd native/huhubot && go test ./...` | 通过 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-38.md</Path>` |

- **E2E disposition：** required：Lead 在 change-workspace 执行全量门禁。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

## 执行约束

依赖、深度及理由、路径所有权、资源声明和 Skill 调用绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。必需项目 Skill 按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 实际调用并保留证据。

无

**证据失效：** base/head 变化触及本票写集、上游 ADR/Spec 对应条目修订、或绑定 Skill 摘要变化时，本票已有验证需重跑。

## 未决事项与风险

无

### 未决问题

依赖 T-18、T-19 及全部 UI 票经各自 Gate 重审后完成；在 T-37 完成前保持 draft。

## 本轮范围与共享执行约束（LOG-017、LOG-018）

必读 `<Path>{roots.state}/specdev/changes/{change}/execution-boundaries.md</Path>`：Browser 及其集成面冻结，优先于本票宽目录写集；shared_paths 仅由声明的 Lead owner 串行写入。构建、全量验证及共享组件变更遵守该文件，不通过修复浏览器解除其他票的阻塞。本轮只更新计划，生产实现和 Git/远程动作尚未授权。

冻结期不得因基线失败、中文路径扫描、minify、包体或全量测试失败修改 Browser。验收只对当前未冻结范围下结论，既有 Browser 相关检查若排除则列明命令和原因。
