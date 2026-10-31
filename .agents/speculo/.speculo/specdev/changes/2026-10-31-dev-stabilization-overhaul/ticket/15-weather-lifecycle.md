---
schema_version: 3
plan_contract_version: 1
resource_claims: []
artifact: ticket
ui_change: false
design_ref: null
change: 2026-10-31-dev-stabilization-overhaul
id: T-15
title: "天气完整请求生命周期（服务层）"
status: done
kind: bug
planning_depth: standard
planning_depth_reason: "多阶段异步状态机与多看板隔离，需逐阶段故障注入"
ready: true
risk: medium
blocked_by: ["T-01","T-16"]
contract_ids: ["AC-221"]
owner: "host:codex/root"
expected_changes: ["<Path>src/modules/home/services/board-store.ts</Path>", "<Path>src/modules/home/platform/widgets/weather-service.ts</Path>"]
writable_paths: ["<Path>src/modules/home/services/board-store.ts</Path>","<Path>src/modules/home/platform/widgets/weather-service.ts</Path>","<Path>scripts/verify-weather-mapping.ts</Path>","<Path>scripts/verify-dashboard-isolation.ts</Path>","<Path>src/modules/home/services/weather-store.test.ts</Path>","<Path>src/modules/home/platform/widgets/weather-service.test.ts</Path>"]
read_only_paths: ["<Path>src/modules/home/ui/canvas/ClockWidget.tsx</Path>","<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/execution-boundaries.md</Path>","<Path>src/modules/browser/**</Path>","<Path>native/browser-runtime/**</Path>"]
shared_paths: ["<Path>src/modules/home/i18n.ts</Path>"]
shared_path_owners: ["<Path>src/modules/home/i18n.ts</Path> => Lead"]
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "9f2bd86d620ed274f75eecfeab254efce5a40fa2ad5c5d255c7f877a93848cc7", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---

# Ticket T-15: 天气完整请求生命周期（服务层）

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-15.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

天气状态覆盖未配置、等待启动、加载、有缓存且刷新中、成功、离线/失败、已失效；任何阶段挂起都能到达终态或可恢复状态。来源：#37 W4.6–W4.10；Spec AC-221。

## 行为与范围

IN：服务层状态投影；完整请求预算（缓存读、主备 Provider、缓存写、发布）；可丢弃缓存写入不阻止显示且不跨 Vault/代次；保留 request sequence、board generation、location key、disposed/visibility 保护；错误类别与重试入口的数据（文案键在 `src/modules/home/i18n.ts`）。OUT：`ClockWidget.tsx` 呈现（W6 home 外框票）。

## 验收标准

- [x] `AC-221`：两看板、多实例下成功、未配置、主备失败、缓存读/写挂起、旧请求晚到、切换/隐藏恢复均到达明确状态，不跨看板串数据，旧缓存带时间。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 故障注入 | 验证脚本 | `pnpm test:weather-mapping && pnpm test:dashboard-isolation` | 新增挂起用例通过 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-15.md</Path>` |
| 词典 | i18n | `pnpm test:i18n` | 通过 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-15.md</Path>` |

- **E2E disposition：** not-required：服务层；界面呈现随 W6 票验收。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

## 执行约束

依赖、深度及理由、路径所有权、资源声明和 Skill 调用绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。必需项目 Skill 按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 实际调用并保留证据。

不伪造天气；旧缓存标注过期。

**证据失效：** base/head 变化触及本票写集、上游 ADR/Spec 对应条目修订、或绑定 Skill 摘要变化时，本票已有验证需重跑。

## 未决事项与风险

无

### 未决问题

无。

## 本轮范围与共享执行约束（LOG-017、LOG-018）

必读 `<Path>{roots.state}/specdev/changes/{change}/execution-boundaries.md</Path>`：Browser 及其集成面冻结，优先于本票宽目录写集；shared_paths 仅由声明的 Lead owner 串行写入。构建、全量验证及共享组件变更遵守该文件，不通过修复浏览器解除其他票的阻塞。本轮只更新计划，生产实现和 Git/远程动作尚未授权。

T15-D01：真实缓存读写端口无取消，原Promise.all/await write会卡loading；加入两个既有就近天气suite精确写集，用fake clock和held gates验证全预算/代次/Vault边界。复用底层storageWriteQueue，不另造缓存队列；已进入存储API的写不能物理撤销，必须固定捕获旧Vault/location、同key有序，晚到不反盖后继写或当前投影，尚未发起的旧代写应guard拒绝。报告明确这一I/O边界，不能以丢弃Promise冒称旧写不发生。未扩host API/界面。
