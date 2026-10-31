---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: ticket
ui_change: false
design_ref: null
change: 2026-10-31-dev-stabilization-overhaul
id: T-14
title: "可选初始化退出启动关键路径"
status: done
kind: refactor
planning_depth: standard
planning_depth_reason: "改变 home 启动装配与后台恢复生命周期，替代永久 ADR 的 5 秒等待"
ready: true
risk: medium
blocked_by: ["T-01"]
contract_ids: ["AC-161", "AC-162"]
owner: "host:codex/root"
expected_changes: ["<Path>src/modules/home/platform/desktop/netease-account.ts</Path>", "<Path>src/modules/home/module.ts</Path>", "<Path>src/modules/home/platform/music/music-service.ts</Path>", "<Path>scripts/verify-music-account.ts</Path>"]
writable_paths: ["<Path>src/modules/home/platform/desktop/**</Path>","<Path>src/modules/home/module.ts</Path>","<Path>src/modules/home/platform/music/music-service.ts</Path>","<Path>scripts/verify-music-account.ts</Path>","<Path>scripts/verify-workbench-lifecycle.ts</Path>","<Path>docs/e2e/dev-overhaul/startup/**</Path>","<Path>src/modules/home/module.test.ts</Path>","<Path>scripts/fixtures/dev-overhaul-startup/**</Path>"]
read_only_paths: ["<Path>src/modules/home/services/board-store.ts</Path>","<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/execution-boundaries.md</Path>","<Path>src/modules/browser/**</Path>","<Path>native/browser-runtime/**</Path>"]
shared_paths: []
shared_path_owners: []
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "9f2bd86d620ed274f75eecfeab254efce5a40fa2ad5c5d255c7f877a93848cc7", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---

# Ticket T-14: 可选初始化退出启动关键路径

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-14.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

首页与工作台激活不等待任何可选账号、网络或凭据读取。来源：ADR-005；LOG-008；#37 W4.1–W4.5；Spec AC-161、AC-162。

## 行为与范围

IN：音乐 Cookie 恢复移到模块 lifetime 拥有的后台任务，具备错误收敛、订阅通知、去重、销毁清理；保留迟到结果不能登录与窗口计时器；永不返回的 `cookies.get` 夹具直接断言可交互；审计其他模块的可选 I/O 并记录分模块时间（只记录，不无差别重写）。OUT：音乐小组件界面（W6）。

## 验收标准

- [x] `AC-161`：`cookies.get` 永不返回时首页/工作台立即可交互，无 5 秒等待。
- [x] `AC-162`：拒绝、迟到成功、销毁后完成、登录/登出竞争下迟到结果不覆盖用户决定。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 永不返回 | 验证脚本 | `pnpm test:music-account && pnpm test:workbench-lifecycle` | 不依赖时限通过 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-14.md</Path>` |
| 竞争 | 同上新增用例 | 同上 | 通过 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-14.md</Path>` |

- **E2E disposition：** required：Lead 在 change-workspace 运行 `pnpm test:workbench-entry` 与 `pnpm test:workbench-lifecycle`。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

## 执行约束

依赖、深度及理由、路径所有权、资源声明和 Skill 调用绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。必需项目 Skill 按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 实际调用并保留证据。

不使用无人负责的 `void promise` 或无限重试。永久 ADR 的替代只在归档时经 A 提升。

**证据失效：** base/head 变化触及本票写集、上游 ADR/Spec 对应条目修订、或绑定 Skill 摘要变化时，本票已有验证需重跑。

## 未决事项与风险

无

### 未决问题

无。

## 本轮范围与共享执行约束（LOG-017、LOG-018）

必读 `<Path>{roots.state}/specdev/changes/{change}/execution-boundaries.md</Path>`：Browser 及其集成面冻结，优先于本票宽目录写集；shared_paths 仅由声明的 Lead owner 串行写入。构建、全量验证及共享组件变更遵守该文件，不通过修复浏览器解除其他票的阻塞。本轮只更新计划，生产实现和 Git/远程动作尚未授权。
