---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: ticket
ui_change: false
design_ref: null
change: 2026-10-31-dev-stabilization-overhaul
id: T-03
title: "行为参考与采用材料的来源记录收口"
status: done
kind: documentation
planning_depth: standard
planning_depth_reason: "涉及许可核对与 README 双语一致，需区分四类使用性质"
ready: true
risk: medium
blocked_by: []
contract_ids: ["AC-271"]
owner: "host:codex/root"
expected_changes: ["<Path>docs/references.md</Path>", "<Path>README.md</Path>", "<Path>README.ZH.md</Path>", "<Path>docs/third-party/</Path>"]
writable_paths: ["<Path>README.md</Path>","<Path>README.ZH.md</Path>","<Path>docs/third-party/**</Path>","<Path>scripts/documentation-policy.mjs</Path>","<Path>scripts/verify-docs.mjs</Path>","<Path>test/release/documentation-policy.test.ts</Path>","<Path>test/release/documentation-checker.test.ts</Path>"]
read_only_paths: ["<Path>NOTICE</Path>","<Path>THIRD-PARTY-NOTICES.md</Path>","<Path>scripts/third-party-notices.mjs</Path>","<Path>.agents/skills/dev/references/licensing.md</Path>","<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/execution-boundaries.md</Path>","<Path>src/modules/browser/**</Path>","<Path>native/browser-runtime/**</Path>"]
shared_paths: ["<Path>docs/references.md</Path>"]
shared_path_owners: ["<Path>docs/references.md</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "9f2bd86d620ed274f75eecfeab254efce5a40fa2ad5c5d255c7f877a93848cc7", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---

# Ticket T-03: 行为参考与采用材料的来源记录收口

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-03.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

补齐 #27 清单（Notebook Navigator、Obsidian Copilot、Marginalia、Hover Annotations、Margin Annotations、Side Note、Commentator、Smart Composer、dbx、Windows Terminal）的稳定来源记录。来源：#37 W8.1–W8.4、W8.6；Spec AC-271。

## 行为与范围

IN：在 `docs/references.md` 区分“运行依赖 / 复制或改编源码样式 / 素材字体 / 仅公开行为或视觉参考”，记录仓库、版本或 commit、原路径、作者版权、许可核对状态、采用方式、HUHU 对应位置；README 中英文致谢指向完整记录。REUSE：已有 Notebook Navigator 等记录做整合，不重复建表。OUT：W6 中 Galaxy/Radix/Primer 的实际采用登记（随对应 UI 票）；不推测未核实的许可。

## 验收标准

- [x] `AC-271`：每个清单项有使用性质与核对状态或经核对的不适用说明；README.md 与 README.ZH.md 链接一致指向 `docs/references.md`。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 来源与链接 | 文档与通知检查 | `pnpm test:docs && pnpm check:notices && pnpm test:license-texts` | 退出码 0 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-03.md</Path>` |
| 双语一致 | 人工比对 | 比对 README.md 与 README.ZH.md 的致谢段 | 两份指向同一记录 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-03.md</Path>` |

- **E2E disposition：** required：来源内容为文档；T03-DOC-01新增检查器接缝后，由Lead实际运行完整docs CLI，负向断链由临时仓库CLI回归覆盖。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

## 执行约束

依赖、深度及理由、路径所有权、资源声明和 Skill 调用绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。必需项目 Skill 按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 实际调用并保留证据。

仅行为参考不伪装成随包分发代码；未核实许可写“待核实”。维护文档用中文，根 README 中英同步。

**证据失效：** base/head 变化触及本票写集、上游 ADR/Spec 对应条目修订、或绑定 Skill 摘要变化时，本票已有验证需重跑。

## 未决事项与风险

外部仓库许可可能已变更；记录核对时间与 commit。

### 未决问题

无。

## 本轮范围与共享执行约束（LOG-017、LOG-018）

必读 `<Path>{roots.state}/specdev/changes/{change}/execution-boundaries.md</Path>`：Browser 及其集成面冻结，优先于本票宽目录写集；shared_paths 仅由声明的 Lead owner 串行写入。构建、全量验证及共享组件变更遵守该文件，不通过修复浏览器解除其他票的阻塞。本轮只更新计划，生产实现和 Git/远程动作尚未授权。

### T03-DOC-01：归档位置感知的链接核验

实际来源登记已交回。必需docs门的12处失败来自已记录的归档层级移动，按evidence/T-03.md偏差修正现役检查器：消费真实归档Source/Target，保留历史字节，继续检查实际目标/锚点/仓库边界与负向用例。不得跳过归档或只白名单错误。
