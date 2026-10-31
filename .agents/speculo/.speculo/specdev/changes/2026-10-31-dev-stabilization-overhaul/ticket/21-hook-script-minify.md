---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: ticket
ui_change: false
design_ref: null
change: 2026-10-31-dev-stabilization-overhaul
id: T-21
title: "Hook 字符串脚本构建期压缩"
status: ready
kind: refactor
planning_depth: standard
planning_depth_reason: "构建转换改变生成脚本字节，需证明协议行为不变"
ready: true
risk: medium
blocked_by: ["T-13", "T-02", "T-22"]
contract_ids: ["AC-332"]
owner: unassigned
expected_changes: ["<Path>esbuild.config.mjs</Path>", "<Path>src/modules/agent/platform/desktop/hooks/hook-spool.ts</Path>"]
writable_paths: ["<Path>esbuild.config.mjs</Path>", "<Path>src/modules/agent/platform/desktop/hooks/**</Path>", "<Path>scripts/build/**</Path>"]
read_only_paths: ["<Path>scripts/bundle-budget.json</Path>","<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/execution-boundaries.md</Path>","<Path>src/modules/browser/**</Path>","<Path>native/browser-runtime/**</Path>"]
shared_paths: ["<Path>main.js</Path>","<Path>styles.css</Path>","<Path>build/**</Path>","<Path>src/ui/styles/fonts.generated.css</Path>"]
shared_path_owners: ["<Path>main.js</Path> => Lead","<Path>styles.css</Path> => Lead","<Path>build/**</Path> => Lead","<Path>src/ui/styles/fonts.generated.css</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "9f2bd86d620ed274f75eecfeab254efce5a40fa2ad5c5d255c7f877a93848cc7", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---

# Ticket T-21: Hook 字符串脚本构建期压缩

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-21.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

对 `HOOK_PUBLISHER_SCRIPT`、`SPOOL_GUARD`、`HOOK_SCRIPT` 等字符串脚本采用有语义保障的构建期压缩，替代手工删空格。来源：#37 W7.2–W7.3；Spec AC-332。

## 行为与范围

IN：覆盖字符串、转义、正则、注释、自动分号与目标 Node 语法；生成脚本语法检查；真实发布/撤销/错误路径测试含 Windows 路径与引用；来源声明保留。OUT：其他减重（T-37）。

## 验收标准

- [ ] `AC-332`：压缩前后协议行为相同，语法检查与真实进程测试通过，来源声明保留。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 行为一致 | vitest 真实进程 | `pnpm vitest run src/modules/agent/platform/desktop/hooks` | 通过 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-21.md</Path>` |
| 包体 | 构建 | `冻结期构建序列 + pnpm check:bundle` | 记录差异 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-21.md</Path>` |

- **E2E disposition：** required：Lead 在 change-workspace 运行 “冻结期构建序列（execution-boundaries）” 与 hooks 测试。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

## 执行约束

依赖、深度及理由、路径所有权、资源声明和 Skill 调用绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。必需项目 Skill 按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 实际调用并保留证据。

不提高预算阈值。

**证据失效：** base/head 变化触及本票写集、上游 ADR/Spec 对应条目修订、或绑定 Skill 摘要变化时，本票已有验证需重跑。

## 未决事项与风险

无

### 未决问题

无。

## 本轮范围与共享执行约束（LOG-017、LOG-018）

必读 `<Path>{roots.state}/specdev/changes/{change}/execution-boundaries.md</Path>`：Browser 及其集成面冻结，优先于本票宽目录写集；shared_paths 仅由声明的 Lead owner 串行写入。构建、全量验证及共享组件变更遵守该文件，不通过修复浏览器解除其他票的阻塞。本轮只更新计划，生产实现和 Git/远程动作尚未授权。

冻结期不得因基线失败、中文路径扫描、minify、包体或全量测试失败修改 Browser。验收只对当前未冻结范围下结论，既有 Browser 相关检查若排除则列明命令和原因。
