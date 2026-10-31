---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: ticket
ui_change: false
design_ref: null
change: 2026-10-31-dev-stabilization-overhaul
id: T-01
title: "基线账本与当前 dev 基线运行"
status: done
kind: operations
planning_depth: standard
planning_depth_reason: "18 个 A 编号的统一账本是所有批次的证据入口，需要覆盖 CI 到达性核查"
ready: true
risk: medium
blocked_by: []
contract_ids: ["AC-001", "AC-002"]
owner: "host:codex/root"
expected_changes: ["<Path>docs/e2e/dev-overhaul/README.md</Path>", "<Path>docs/e2e/dev-overhaul/ledger.md</Path>", "<Path>docs/e2e/dev-overhaul/baseline/</Path>"]
writable_paths: ["<Path>docs/e2e/dev-overhaul/README.md</Path>", "<Path>docs/e2e/dev-overhaul/ledger.md</Path>", "<Path>docs/e2e/dev-overhaul/baseline/**</Path>"]
read_only_paths: ["<Path>docs/e2e/README.md</Path>","<Path>package.json</Path>","<Path>.github/workflows/</Path>","<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/execution-boundaries.md</Path>","<Path>src/modules/browser/**</Path>","<Path>native/browser-runtime/**</Path>"]
shared_paths: ["<Path>main.js</Path>","<Path>styles.css</Path>","<Path>build/**</Path>","<Path>src/ui/styles/fonts.generated.css</Path>"]
shared_path_owners: ["<Path>main.js</Path> => Lead","<Path>styles.css</Path> => Lead","<Path>build/**</Path> => Lead","<Path>src/ui/styles/fonts.generated.css</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "9f2bd86d620ed274f75eecfeab254efce5a40fa2ad5c5d255c7f877a93848cc7", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---

# Ticket T-01: 基线账本与当前 dev 基线运行

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-01.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

在任何代码改动之前，固定实施 SHA 并建立 #37 的统一账本：每个 A 编号一行“报告环境 / 当前复现步骤 / 证据等级 / 根因状态 / 实施任务 / PR / 验收结果”，并在未修改的 dev 上运行适用的现有测试与构建，记录基线失败。来源：#37 W0.1、W0.3；Spec AC-001、AC-002；LOG-006 证据纪律。

## 行为与范围

IN：`docs/e2e/dev-overhaul/` 下的账本与基线记录；运行 冻结期适用全量检查（execution-boundaries）（或按 dev 技能 testing.md 选择的等价集合）、“冻结期构建序列（execution-boundaries）”、`pnpm check:bundle`、`native/huhubot` 下 `go test ./...`；读取最近 Windows/macOS CI 日志，核实 `hook-spool.test.ts` 的 32×3 用例与 `workspace-service-stop-native` 是否真正执行到。REUSE：`docs/e2e/README.md` 现有体系，不新建第二套进度真相。OUT：任何产品代码修改；W0.2 fixture 随消费它的票建设；真机复现（用户负责）。账本建立后由 Lead 独占维护，其他票把结果交给 Lead 写入。

## 验收标准

- [x] `AC-001`：账本覆盖 A16、A19–A35 共 18 项及 G1–G3，记录实施 SHA 与相对 `505d51b` 的差异。
- [x] `AC-002`：基线命令的退出码与失败用例逐项记录；Windows CI 是否到达目标用例有日志定位，不只看 job 颜色。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 账本完整 | 回读 `docs/e2e/dev-overhaul/ledger.md` | 逐行检查 18 个 A 编号与 3 个 G 编号 | 每行字段齐全，证据等级取五类之一 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-01.md</Path>` |
| 基线运行 | pnpm 与 go 命令 | 冻结期适用全量检查（execution-boundaries）；“冻结期构建序列（execution-boundaries）”；`pnpm check:bundle`；`cd native/huhubot && go test ./...` | 退出码与失败用例原样记录，不重试掩盖 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-01.md</Path>` |
| CI 到达性 | GitHub Actions 日志 | `gh run list` / `gh run view --log` 只读查询 | 目标用例是否执行有定位行 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-01.md</Path>` |

- **E2E disposition：** not-required：本票只建立账本与运行现有检查，无跨边界新行为。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

## 执行约束

依赖、深度及理由、路径所有权、资源声明和 Skill 调用绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。必需项目 Skill 按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 实际调用并保留证据。

必须在本 change 第一处代码改动之前完成基线运行；若工作区已有改动，先记录 `git status` 并只对未改动的 HEAD 运行。不得把历史报告数字写成本次测量。

**证据失效：** base/head 变化触及本票写集、上游 ADR/Spec 对应条目修订、或绑定 Skill 摘要变化时，本票已有验证需重跑。

## 未决事项与风险

基线可能本身不全绿；如实记录，不在本票修复。

### 未决问题

无。

## 本轮范围与共享执行约束（LOG-017、LOG-018）

必读 `<Path>{roots.state}/specdev/changes/{change}/execution-boundaries.md</Path>`：Browser 及其集成面冻结，优先于本票宽目录写集；shared_paths 仅由声明的 Lead owner 串行写入。构建、全量验证及共享组件变更遵守该文件，不通过修复浏览器解除其他票的阻塞。本轮只更新计划，生产实现和 Git/远程动作尚未授权。

冻结期不得因基线失败、中文路径扫描、minify、包体或全量测试失败修改 Browser。验收只对当前未冻结范围下结论，既有 Browser 相关检查若排除则列明命令和原因。
