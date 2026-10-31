---
schema_version: 3
plan_contract_version: 1
resource_claims: ["huhubot:sqlite-write-connection","huhubot:stop-lifecycle-contract"]
artifact: ticket
ui_change: false
design_ref: null
change: 2026-10-31-dev-stabilization-overhaul
id: T-05
title: "检查点与业务提交分离为有界维护"
status: review
kind: refactor
planning_depth: deep
planning_depth_reason: "改变 SQLite 存储 adapter 的提交与维护路径，涉及持久性与隐私清除"
ready: true
risk: high
blocked_by: ["T-01", "T-04"]
contract_ids: ["AC-283", "AC-284"]
owner: "host:codex/root"
expected_changes: ["<Path>native/huhubot/internal/adapters/outbound/sqlite/base/store.go</Path>", "<Path>.github/workflows/huhubot-storage-windows.yml</Path>", "<Path>docs/huhu-bot-performance.md</Path>"]
writable_paths: ["<Path>native/huhubot/internal/adapters/outbound/sqlite/base/**</Path>","<Path>.github/workflows/huhubot-storage-windows.yml</Path>","<Path>docs/huhu-bot-performance.md</Path>","<Path>docs/e2e/dev-overhaul/storage/**</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/portable/store.go</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/portable/backpressure_test.go</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/assistant/store.go</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/assistant/checkpoint_test.go</Path>","<Path>native/huhubot/internal/bootstrap/checkpoint_stop_test.go</Path>"]
read_only_paths: ["<Path>native/huhubot/internal/bootstrap/core.go</Path>","<Path>native/huhubot/internal/adapters/outbound/sqlite/purge/</Path>","<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/execution-boundaries.md</Path>","<Path>src/modules/browser/**</Path>","<Path>native/browser-runtime/**</Path>"]
shared_paths: []
shared_path_owners: []
skill_bindings: [{"id": "dev", "path": "<Path>.agents/skills/dev/SKILL.md</Path>", "sha256": "9f2bd86d620ed274f75eecfeab254efce5a40fa2ad5c5d255c7f877a93848cc7", "phase": "implement", "operation": "apply-plugin-engineering-rules", "inputs": ["当前 Ticket", "tickets-map 总体实施背景"], "outputs": ["本票 Evidence 的 Skill Execution Records"], "required": true, "on_failure": "block-ticket"}]
---

# Ticket T-05: 检查点与业务提交分离为有界维护

- **总体 Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **上游 Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **完成 Evidence：** `<Path>{roots.state}/specdev/changes/{change}/evidence/T-05.md</Path>`
- **执行入口：** 获得实现授权后读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`；按 Map → 适用项目 Skill → 当前 Ticket 读取输入。项目 Skill 调用不能替代 I 的实现、风险适配的双轴审查及完成流程。

<a id="goal"></a>
## 目标与来源

`withinTx` 不再在 COMMIT 后持连接同步 TRUNCATE；检查点成为 adapter 拥有、可合并、有背压、有停止归属的维护任务。来源：ADR-003；#37 W2.6–W2.10；Spec AC-283、AC-284。

<a id="behavior"></a>
## 行为与范围

IN：分阶段采样（连接等待、提交、FULL 屏障、检查点、关闭 WAL 同步）；维护调度；隐私清除要求的截断不被跳过；新增独立 Windows 工作流测量 PASSIVE/RESTART/TRUNCATE 与阈值；更正“WAL 受阈值控制等于 flush 延迟受限”等误导说明。REUSE：`WithinDurableTx` 六个屏障点、单写连接串行约束、256 KiB/4 MiB 节奏的既有测试。OUT：第二条写连接；改变 NORMAL/FULL 承诺。

## 验收标准

- [ ] `AC-283`：维护失败或超时不改写已提交业务结果、不触发业务重试；长读者下 WAL 不无限增长；隐私清除仍截断。
- [ ] `AC-284`：Windows runner 记录各模式吞吐、读者阻塞、FULL 屏障、磁盘占用与恢复代价。

## 验证方法

| 行为或风险 | 验证接缝 | 命令或步骤 | 预期结果 | Evidence |
|---|---|---|---|---|
| 提交与维护分离 | Go 单测 | `cd native/huhubot && go test ./internal/adapters/outbound/sqlite/base/...` | checkpoint/durability 新用例通过 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-05.md</Path>` |
| 长读者与清除 | Go 单测 | 同上 | WAL 有界，清除后截断 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-05.md</Path>` |
| Windows 测量 | GitHub Actions | `huhubot-storage-windows.yml` 手动触发 | 产出测量表 | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-05.md</Path>` |

- **E2E disposition：** required：Lead 在 change-workspace 运行 `pnpm check:huhu-bot` 与 `pnpm bench:huhu-bot`，比较基线。
- **运行环境：** change README 选定的 change-workspace；本票的检查和 Lead-owned E2E 在固定输入上执行，所有执行者复用该工作区。

<a id="constraints"></a>
## 执行约束

依赖、深度及理由、路径所有权、资源声明和 Skill 调用绑定以 frontmatter 为准；`expected_changes` 仅作导航，实现前核对实际代码。必需项目 Skill 按 `<Path>{roots.workflows}/specdev/common/rules/skill-invocation.md</Path>` 实际调用并保留证据。

候选模式不预先当作有效修复；与 T-10 的联合重测分别报告模型收益与 I/O 收益。

**证据失效：** base/head 变化触及本票写集、上游 ADR/Spec 对应条目修订、或绑定 Skill 摘要变化时，本票已有验证需重跑。

## 未决事项与风险

后台维护与停止交错可能遗留匿名任务；停止归属须经 T-04 的阶段合同验证。

### 未决问题

无。

## 本轮范围与共享执行约束（LOG-017、LOG-018）

必读 `<Path>{roots.state}/specdev/changes/{change}/execution-boundaries.md</Path>`：Browser 及其集成面冻结，优先于本票宽目录写集；shared_paths 仅由声明的 Lead owner 串行写入。构建、全量验证及共享组件变更遵守该文件，不通过修复浏览器解除其他票的阻塞。本轮只更新计划，生产实现和 Git/远程动作尚未授权。

与 T-04 共用停止/维护生命周期语义资源；未冻结接口前不并行修改该合同。实现可独立调查，关闭顺序及 timeout 后 owner 责任在存储联合门复核。

<a id="checkpoint-decisions"></a>
### T05-D01 实际事务消费者与验收解释

027预检发现portable两处直接BeginTx绕过统一准入、assistant.delete独立TRUNCATE；补这两个生产文件及窄测试，bootstrap只新增停止测试，core.go保持只读。T04/T06当前已完成同批联合验收，停止合同写入互斥解除。

ADR003/AC283/W2.9要求长读者下不持续无限追加，未规定固定字节硬上限H。实施必须证明同一单写连接在提交前准入、达到高水位后后续业务work不再进入，有限在途事务完成后WAL不随排队请求继续增长；单个已准入大事务可能越过阈值，该观测/可用性代价须明确，不能宣称配置硬字节上限。不引入额外VFS写预算以满足原合同不存在的硬限。若真实现有写入绕过统一准入使这一性质不成立，先报告实际路径再扩围。

隐私清除仍是必须完成的TRUNCATE义务，不能降为可丢弃wake，也不能以事后维护失败撤销已COMMIT业务事实。保留现有EraseWAL cleanup-pending语义；assistant.delete原已提交结果仍成功，尚未清除必须归属唯一maintenance owner并可观察/重试，不吞失败。阈值/模式仍为待Windows测量的候选，AC284未运行不通过。
