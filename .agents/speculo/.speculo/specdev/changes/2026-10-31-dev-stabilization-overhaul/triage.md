---
schema_version: 3
artifact: triage
change: 2026-10-31-dev-stabilization-overhaul
mode: intake
disposition: ready-for-human
verification: pending
remote_actions: []
source: <Path>{roots.state}/specdev/changes/{change}/source.md</Path>
classification: mixed
risk: high
route: specdev/grill-with-docs
ready_for_implementation: false
updated_at: 2026-10-31T03:55:00Z
---

> 当前范围修订：本简报保留初始分诊事实；Browser 及其集成面的开发和修复已由 LOG-018 / ADR-009 全面暂停。执行以当前 spec.md、tickets-map.md 和 execution-boundaries.md 为准，不按本简报旧范围恢复 Browser 工作。


# Triage: dev 稳定性、性能、功能修复与全界面统一（#37 总收口）

## 当前判定

- **影响：** 跨 Bot Runner 存储与生命周期（Go/SQLite）、Windows Hook 发布链、首页/天气异步生命周期、7 个可见功能缺陷、全插件 UI 统一、包体预算与来源文档。涉及用户资料目录、Bot Profile 数据格式、持久性承诺和发布门禁，事故半径大。
- **紧急度：** scheduled。#37 自述 P0 为安全/生命周期合同与发布阻断；没有已观察到的数据丢失（#34 是验证缺口）。
- **请求是否成立：** 成立。#37 是维护者（仓库 OWNER）发布的总计划，18 个原 Issue 已以 `closed / duplicate` 归并到此处（见来源评论 1）。未发现已有实现、重复 change 或既往拒绝：active changes 为空；archive 中无 #37/#28/#29/#35 的 locator。
- **当前证据（本次在 HEAD `86c5005` 实际核对源码，仅确认机制，不代表复现了故障）：**
  - `Core.Close()` 先 `RequestStop()`，再用固定 3 秒 `context.WithTimeout` 等待 `WaitClosed`，超时返回 `RECOVERY_BLOCKED / EXECUTOR_STOP_TIMEOUT`（`<Path>native/huhubot/internal/bootstrap/core.go</Path>`）。
  - `Store.Close()` 先 `syncWAL` 再关闭；`withinTx` 在提交后仍持有连接执行 `PRAGMA wal_checkpoint(TRUNCATE)`，已有 `WithinDurableTx` 屏障（`<Path>native/huhubot/internal/adapters/outbound/sqlite/base/store.go</Path>`）。
  - `sealEntries` 对每个条目调用 `closure(graph, …)` 并 `insertDependencies(…, "effective", refs)`（`<Path>native/huhubot/internal/adapters/outbound/sqlite/memory/context_view.go</Path>`）。
  - 天气单请求 12 秒超时（`<Path>src/modules/home/platform/widgets/weather-service.ts</Path>`）；网易云恢复默认 `restoreDeadlineMs = 5_000`（`<Path>src/modules/home/platform/desktop/netease-account.ts</Path>`）。
  - `splitRight/splitDown` 已在 `<Path>src/modules/agent/ui/AgentWorkspacePage.tsx</Path>` 分派，命令词条已有 en/zh。
  - `<Path>scripts/bundle-budget.json</Path>` 的 `outputBytes` 为 8,252,416 B（= 8059 KiB），而 `outputBudgetReason` 写“8058 KiB”；已提交 `main.js` 为 8,252,256 B。未重新构建。
  - `<Path>src/shared/storage/vault-layout.ts</Path>` 注释明确“Folder names are Chinese on purpose: they are the user's vault structure, not interface text”，默认可见目录为 `huhu/日志`、`huhu/档案` 等；`<Path>src/modules/archives/core/resources.ts</Path>` 硬编码 `个人档案/企业档案/基本信息.md`。这与 #37 W5.1“语言无关固定规范”需要显式裁决。
- **相关永久决定（只读）：**
  - `<Path>{roots.state}/specdev/adr/2026-10-31-home-cookie-restore-deadline.md</Path>` ADR-001 规定启动恢复“最多等待 5 秒”；#37 W4.1/A16 要求可选恢复完全退出关键路径，属于对该永久决定的替代提案，只能经 A 提升。
  - `<Path>{roots.state}/specdev/adr/2026-10-31-huhu-bot-architecture.md</Path>` ADR-027（WAL + NORMAL + 外部动作 FULL 屏障、正常关闭 fsync WAL）是 W2 必须保留的持久性合同；W2.17 回写也经 A。
  - `<Path>{roots.state}/specdev/design/DESIGN.md</Path>` DESIGN-0001 的 scope 仅 `huhu.workbench`；W6 覆盖全插件 13 模块与 home 子项，超出当前基线范围。

## 未知项

- **可发现事实：**
  - 当前 dev 的基线测试/构建结果（W0.3）、Windows CI 是否真正执行到 32×3 Hook 用例（W3.1）、重建后的 JS/CSS/eager/activation 报告（W7.1）。
  - #19–#26 在当前基线上的动态复现与根因（W5 各项，需真实 Obsidian）；#30 EOF 根因（W2.11–W2.12）。
  - 依赖消费者全量清单（W1.1）、ncruces/SQLite Darwin VFS `xSync` 路径（W2.14）。
- **需要用户决定（已转入 G 设计树）：** 默认可见目录名规范与旧库处理（D-008/D-009）、Bot Profile 新 schema 切换方式（D-010）、自动化通知名称语义（D-011）、平台/实机验收的执行者与可接受证据（D-012）、全插件 UI 设计基线的产出与批准路径（D-013）。
- **低影响实现细节：** `Close()` 是重构还是删除并迁移调用方（受 ADR-002 合同约束）、诊断字段命名、fixture 目录组织、账本放在 `docs/e2e/` 的具体文件名。

## 路由

- **下一 Work：** `<Path>{roots.workflows}/specdev/specdev-g-grill-with-docs/SKILL.md</Path>`，随后 `<Path>{roots.workflows}/specdev/specdev-s-spec/SKILL.md</Path>`。
- **理由：** 目标与大部分方向已由维护者在 #37 中锁定，可直接进入访谈记录这些决定；仍有 5 项影响数据、迁移、验收与设计基线的高影响决定。用户要求以单一 change 承载 #37，故不走 Wayfinder 拆分 change；规模由 Spec 之后的 Tickets + Goal Plan（按 #37 §13 的 B0–B7 批次）承接。W6 的 UI 部分还需 `<Path>{roots.workflows}/specdev/specdev-p-prototype/SKILL.md</Path>` 产出 change DESIGN。

## 实施简报

- **现状与目标：** 现状与目标逐项见来源 §2 映射表与 §4–§12。目标是在当前 dev 上重新确认、实际解决并以同一账本验收 A16、A19–A35 与 G1–G3；归并关闭原 Issue 不算完成。
- **核验：** 本次只读核对了上列源码机制（`git rev-parse HEAD` = `86c5005`；`git diff --stat 505d51b HEAD -- src native scripts package.json` 输出为空）。未运行构建、测试、性能采样或任何平台/真实 Obsidian 复现，因此 verification=pending。
- **范围与实现方向：** 按 #37 W0–W8；批次 B0（基线账本、预算重测、UI 清单）→ B1（依赖模型）/B2（生命周期）/B3（Hook，可并行）→ B4（启动/天气/功能修复）→ B5（Token/组件/Shell）→ B6（全模块迁移）→ B7（收口）。不包含 #36、#9、#17 的新业务能力；不换技术栈、不改插件 id、不重写终端/编辑器。
- **验收：** 以 `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>` 的验收合同为准，逐项对应 #37 §15 的 A/G 编号。
- **风险：** 用户资料目录改名与 Bot Profile 格式切换可能让旧资料“看似丢失”；持久性承诺在 macOS 断电模型上无法用 Linux 证据替代；UI 全量迁移与存储大改不能进入同一难以回滚的提交；包体余量仅约 160 B，任何修复都可能触发预算门禁。

## 打标回执

未请求。`<Path>.agents/speculo/config.json</Path>` 没有 `github.labels` 映射，即使请求也会阻塞远程打标；本地分析不受影响。未对 #37 执行评论、标签或关闭操作。
