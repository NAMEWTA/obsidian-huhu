---
schema_version: 3
plan_contract_version: 1
resource_claims: ["huhubot:profile-lock"]
artifact: ticket
ui_change: false
design_ref: null
change: 2026-10-31-dev-stabilization-overhaul
id: T-11
title: "新 schema 使用隔离的新 Bot Profile"
status: ready
kind: feature
planning_depth: deep
planning_depth_reason: "改变 Profile 位置解析，必须证明旧 Profile 字节不变，数据安全风险"
ready: true
risk: high
blocked_by: ["T-10", "T-06", "T-04", "T-16"]
contract_ids: ["AC-293", "AC-902"]
owner: unassigned
expected_changes: ["<Path>native/huhubot/cmd/huhubot/main.go</Path>", "<Path>src/modules/huhubot/platform/desktop/runtime/client-runtime.ts</Path>", "<Path>src/modules/huhubot/i18n.ts</Path>", "<Path>docs/data.md</Path>"]
writable_paths: ["<Path>native/huhubot/cmd/huhubot/**</Path>","<Path>native/huhubot/internal/bootstrap/**</Path>","<Path>src/modules/huhubot/platform/desktop/runtime/**</Path>","<Path>src/modules/huhubot/i18n.ts</Path>","<Path>docs/data.md</Path>","<Path>scripts/build-huhu-bot.mjs</Path>","<Path>scripts/huhu-bot-build.test.mjs</Path>"]
read_only_paths: ["<Path>native/huhubot/internal/adapters/outbound/profilecleanup/cleaner.go</Path>","<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/execution-boundaries.md</Path>","<Path>src/modules/browser/**</Path>","<Path>native/browser-runtime/**</Path>"]
shared_paths: []
shared_path_owners: []
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "9f2bd86d620ed274f75eecfeab254efce5a40fa2ad5c5d255c7f877a93848cc7", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---

# Ticket T-11: 新 schema 使用隔离的新 Bot Profile

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-11.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

## 目标与来源

新版本在按 schema 版本隔离的新 Profile 位置运行；旧 Profile 原样保留只读，首次启动告知位置。来源：ADR-007；LOG-010；Spec AC-293、AC-902。

## 行为与范围

IN：Profile 位置按 schema 版本命名；不对旧 Profile 加锁、写入、清理；首次启动用 `t()` en/zh 文案提示；`docs/data.md` 记录新位置。OUT：迁移器、双读；界面呈现超出提示的部分（W6）。

## 验收标准

- [ ] `AC-293`：存在旧 Profile 的夹具下：旧 Profile 字节不变、未被加锁；新 Profile 在独立位置创建；提示可见。
- [ ] `AC-902`：Profile 切换符合 ADR-001/007，无覆盖或清空。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 隔离 | Go + vitest 夹具 | `cd native/huhubot && go test ./internal/bootstrap/...`；`pnpm vitest run src/modules/huhubot/platform/desktop/runtime` | 旧目录哈希不变 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-11.md</Path>` |
| 词典 | i18n | `pnpm test:i18n` | 退出码 0 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-11.md</Path>` |

- **E2E disposition：** required：Lead 在 change-workspace 运行 `pnpm check:huhu-bot`。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

## 执行约束

依赖、深度及理由、路径所有权、资源声明和 Skill 调用绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。必需项目 Skill 按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 实际调用并保留证据。

profilecleanup 不得把旧 Profile 当作可清理对象。

**证据失效：** base/head 变化触及本票写集、上游 ADR/Spec 对应条目修订、或绑定 Skill 摘要变化时，本票已有验证需重跑。

## 未决事项与风险

无

### 未决问题

无。

## 本轮范围与共享执行约束（LOG-017、LOG-018）

必读 `<Path>{roots.state}/specdev/changes/{change}/execution-boundaries.md</Path>`：Browser 及其集成面冻结，优先于本票宽目录写集；shared_paths 仅由声明的 Lead owner 串行写入。构建、全量验证及共享组件变更遵守该文件，不通过修复浏览器解除其他票的阻塞。本轮只更新计划，生产实现和 Git/远程动作尚未授权。

新 schema 版本须同步 Bot 构建资产元数据及其校验，避免 Profile 目录、运行时和 manifest 版本不一致；只改 huhu-bot 构建链，Browser 链冻结。
