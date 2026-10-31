---
schema_version: 8
artifact: goal-plan
change: 2026-10-31-dev-stabilization-overhaul
status: ready
modes: ["migration", "high-assurance"]
orchestration: lead-directed
lead: "host:codex/root"
integration_attempt_limit: 3
ticket_execution: auto
ready_for_execution: true
---

# Goal Plan: #37 dev 稳定性、性能、功能修复与全界面统一

- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **Tickets Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Ticket 目录：** `<Path>{roots.state}/specdev/changes/{change}/ticket/</Path>`
- **Evidence 目录：** `<Path>{roots.state}/specdev/changes/{change}/evidence/</Path>`

## 1. Outcome and Authority

### Outcome

在当前 dev 上处理 #37 归并的 18 个原 Issue 中本次未冻结范围，并以 `docs/e2e/dev-overhaul/ledger.md` 统一账本给出 A16、A19–A35 与 G1–G3 的证据或明确未验收缺口。按批次 PR 合入 dev，每个 PR 引用 #37。

### Success and False Completion

**成功：** Spec AC-001 至 AC-903 中 agent 负责的部分全部有固定 commit 或快照上的命令、退出码与 Evidence；用户真机验收项在账本中如实标为待用户验收。

**伪完成（禁止）：**
- 原 Issue 已关闭、新增了测试文件、或代码看起来合理；
- 删断言、无条件重试或放宽时限换来的绿灯；
- 用 Linux 结果代替 Darwin 或 Windows 结论；
- 用 CI 或 DOM 结果冒充真机通过；
- 提高包体阈值换绿灯；
- 票全部 done 就视为 Goal 完成。

### Non-goals

- Spec 的 OOS-001 至 OOS-007（含 Browser 全面暂停）；
- 提交、推送、PR、发版与升版本（需另行授权）；
- 关闭 #37：需等用户完成真机验收，由用户决定。

### Authoritative Inputs

| 优先级 | 来源 | 负责内容 | 冲突处理 |
|---|---|---|---|
| 1 | 用户最新明确决定（LOG-001 至 LOG-018 及本次“允许 agent team 或 sub agent 派遣”） | 产品取舍与批准 | 更新真正拥有该决策的工件 |
| 2 | `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>` 与 `<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>` | 当前 change 架构决定与领域语义 | 返回 `<Path>{roots.workflows}/specdev/specdev-g-grill-with-docs/SKILL.md</Path>` 更新真正 owner |
| 3 | `<Path>{roots.state}/specdev/adr/</Path>` 与 `<Path>{roots.state}/specdev/context/</Path>` | 已毕业的永久决定与领域知识（尤其 Bot ADR-027、首页可选恢复时限 ADR-001） | 当前 change 替代时在 `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>` 与 `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>` 明示（ADR-005 已明示） |
| 4 | `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>` | 外部行为、范围与验收 | 下游不得改写 |
| 4a | `<Path>{roots.state}/specdev/changes/{change}/DESIGN.md</Path>` 与 `<Path>{roots.state}/specdev/changes/{change}/execution-boundaries.md</Path>` | 批准 UI 合同、冻结范围与共享执行边界 | 设计漂移返回 P；冻结只由用户解除 |
| 5 | `<Path>{roots.state}/specdev/changes/{change}/ticket/</Path>` | 单 Ticket 契约 | Goal Plan 只编排 |
| 6 | `<Path>{roots.state}/specdev/changes/{change}/diagnosis.md</Path>`（T-07、T-18、T-19 诊断后产生）与当前代码/运行事实 | 已验证根因、现状与可行性 | 冲突时触发偏差并返回真正 owner |

## 2. Execution Graph

### DAG and Critical Path

完整分层 DAG 见 Tickets Map §3。以下为编排视图：

```text
G-BASELINE: T-01, T-02  (T-03 独立)
   │
   ├─ 存储轨: T-04 → T-06 → T-07 ─┐
   │          T-05 → T-08          ├→ T-22 → T-21 ─┐
   │          T-09 ┐                │                │
   │          T-05 ┴→ T-10 → T-11   │                │
   ├─ Hook 轨: T-12 → T-13 ────────┘                │
   ├─ 启动/功能轨: T-14, T-15, T-16 → T-17           │
   ├─ 测量轨: T-20                                    │
   ├─ 诊断轨: D(T-18), D(T-19)  ──(重审)──┐          │
   └─ 设计轨: P 原型 + change DESIGN ─ G-DESIGN ─┐   │
                                                 ▼   │
        UI: T-23 → T-24 (G-UI-BASE) → T-25…T-35 → T-36 → T-37 → T-38 (G-FINAL)
```

关键路径：G-DESIGN → T-23 → T-24 → T-26 → T-28 → T-36 → T-37 → T-38。非 UI 最长链为 T-01 → T-04 → T-06 → T-07 → T-22 → T-21 → T-37。

### Waves and Ownership

Wave 是候选，不是要求填满的槽位；Lead 只推进 Ready、依赖已满足、写集与语义资源无冲突的票。

| Wave | Ticket | 前置条件 | 项目写路径 | Shared owner | Gate/集成序号 |
|---|---|---|---|---|---|
| W0 | T-01、T-02、T-03 | 实施授权；工作区已记录 | 账本/基线、`scripts/bundle-budget.json` 理由、来源文档 | 账本：T-01 建立后归 Lead | G-BASELINE（T-01、T-02） |
| W1 | T-04、T-05、T-09、T-12、T-14、T-15、T-16、T-20 | G-BASELINE | worker 写集按 frontmatter；T-04/T-05 语义互斥 | Lead 共享写入见 execution-boundaries | 1 |
| W1-只读诊断 | T-07、T-18、T-19 的 D 诊断 | 当前基线与各票前置 | diagnosis.md 中各票条目；Browser 排除 | Lead | D 诊断门；P 原型已批准，不重复建设 |
| W2 | T-06、T-08、T-10、T-13、T-17 | 各自前置 | 同上 | 无 | 2 |
| W3 | T-07、T-11 | 各自前置 | 同上 | 无 | 3；关闭 G-STORAGE 需 T-04–T-08、T-10、T-11 |
| W4 | T-22 → T-21 | T-07、T-12、T-13 | 同上 | 无 | 4；关闭 G-HOOK 需 T-12、T-13、T-21 |
| U1 | T-23 → T-24 | G-DESIGN；逐票 DoR 重审及实际 blocked_by | ui/theme、独立 runner、Shell 与非 Browser app 入口 | 设计系统：T-23；来源/产物：Lead | G-UI-BASE |
| U2 | T-25、T-26、T-31、T-32、T-34、T-35 | G-UI-BASE + 各自前置 | 未冻结 UI/作者样式/词典，按各票写集 | 来源/Home 词典/产物：Lead | 5 |
| U3 | T-27、T-28、T-29、T-30、T-33 | T-26 或 T-11 等前置 | 未冻结子项 UI/词典，按各票写集 | 来源/Home 词典/产物：Lead | 6 |
| U4 | T-36 | 全部未冻结 UI 模块票 | 共享 ui/theme、样式清单；冻结引用保持 | 源码：T-36；生成产物：Lead | 7 |
| F | T-37 → T-38 | T-36、T-21、T-02；全部叶子 | 预算、构建配置、账本 | Lead | G-FINAL |

### Ticket Quick Reference

未来 draft 票在原 Ticket 的未决问题中记录：待交付的上游产物、生产者 Ticket、所需证据和 DoR 重审条件。此表只导航原 Ticket/Evidence；状态、Ready、执行 owner 与工作区结果不复制到 Goal，不以 Goal Ready 代替逐票 Ready。

| ID | Ticket | Evidence |
|---|---|---|
| T-01 | `<Path>{roots.state}/specdev/changes/{change}/ticket/01-baseline-ledger.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-01.md</Path>` |
| T-02 | `<Path>{roots.state}/specdev/changes/{change}/ticket/02-bundle-baseline.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-02.md</Path>` |
| T-03 | `<Path>{roots.state}/specdev/changes/{change}/ticket/03-source-records.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-03.md</Path>` |
| T-04 | `<Path>{roots.state}/specdev/changes/{change}/ticket/04-runner-stop-phases.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-04.md</Path>` |
| T-05 | `<Path>{roots.state}/specdev/changes/{change}/ticket/05-checkpoint-maintenance.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-05.md</Path>` |
| T-06 | `<Path>{roots.state}/specdev/changes/{change}/ticket/06-host-stop-consumer.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-06.md</Path>` |
| T-07 | `<Path>{roots.state}/specdev/changes/{change}/ticket/07-eof-regression.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-07.md</Path>` |
| T-08 | `<Path>{roots.state}/specdev/changes/{change}/ticket/08-macos-durability.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-08.md</Path>` |
| T-09 | `<Path>{roots.state}/specdev/changes/{change}/ticket/09-dependency-scale-harness.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-09.md</Path>` |
| T-10 | `<Path>{roots.state}/specdev/changes/{change}/ticket/10-dependency-model.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-10.md</Path>` |
| T-11 | `<Path>{roots.state}/specdev/changes/{change}/ticket/11-isolated-profile.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-11.md</Path>` |
| T-12 | `<Path>{roots.state}/specdev/changes/{change}/ticket/12-hook-publish-measurement.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-12.md</Path>` |
| T-13 | `<Path>{roots.state}/specdev/changes/{change}/ticket/13-hook-publish-reliability.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-13.md</Path>` |
| T-14 | `<Path>{roots.state}/specdev/changes/{change}/ticket/14-optional-init-off-critical-path.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-14.md</Path>` |
| T-15 | `<Path>{roots.state}/specdev/changes/{change}/ticket/15-weather-lifecycle.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-15.md</Path>` |
| T-16 | `<Path>{roots.state}/specdev/changes/{change}/ticket/16-default-paths-and-names.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-16.md</Path>` |
| T-17 | `<Path>{roots.state}/specdev/changes/{change}/ticket/17-automation-notification-names.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-17.md</Path>` |
| T-18 | `<Path>{roots.state}/specdev/changes/{change}/ticket/18-split-command.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-18.md</Path>` |
| T-19 | `<Path>{roots.state}/specdev/changes/{change}/ticket/19-task-projection.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-19.md</Path>` |
| T-20 | `<Path>{roots.state}/specdev/changes/{change}/ticket/20-perf-sampling.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-20.md</Path>` |
| T-21 | `<Path>{roots.state}/specdev/changes/{change}/ticket/21-hook-script-minify.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-21.md</Path>` |
| T-22 | `<Path>{roots.state}/specdev/changes/{change}/ticket/22-diagnostics-convergence.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-22.md</Path>` |
| T-23 | `<Path>{roots.state}/specdev/changes/{change}/ticket/23-tokens-base-components.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-23.md</Path>` |
| T-24 | `<Path>{roots.state}/specdev/changes/{change}/ticket/24-global-shell.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-24.md</Path>` |
| T-25 | `<Path>{roots.state}/specdev/changes/{change}/ticket/25-agent-ui.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-25.md</Path>` |
| T-26 | `<Path>{roots.state}/specdev/changes/{change}/ticket/26-home-frame.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-26.md</Path>` |
| T-27 | `<Path>{roots.state}/specdev/changes/{change}/ticket/27-home-content.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-27.md</Path>` |
| T-28 | `<Path>{roots.state}/specdev/changes/{change}/ticket/28-home-planning-task.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-28.md</Path>` |
| T-29 | `<Path>{roots.state}/specdev/changes/{change}/ticket/29-home-media.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-29.md</Path>` |
| T-30 | `<Path>{roots.state}/specdev/changes/{change}/ticket/30-home-misc-viz.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-30.md</Path>` |
| T-31 | `<Path>{roots.state}/specdev/changes/{change}/ticket/31-automations-notifications-ui.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-31.md</Path>` |
| T-32 | `<Path>{roots.state}/specdev/changes/{change}/ticket/32-archives-safe-ui.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-32.md</Path>` |
| T-33 | `<Path>{roots.state}/specdev/changes/{change}/ticket/33-huhubot-ui.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-33.md</Path>` |
| T-34 | `<Path>{roots.state}/specdev/changes/{change}/ticket/34-browser-comments-icons-ui.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-34.md</Path>` |
| T-35 | `<Path>{roots.state}/specdev/changes/{change}/ticket/35-navigator-versioning-ui.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-35.md</Path>` |
| T-36 | `<Path>{roots.state}/specdev/changes/{change}/ticket/36-ui-contract-cleanup.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-36.md</Path>` |
| T-37 | `<Path>{roots.state}/specdev/changes/{change}/ticket/37-bundle-reduction.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-37.md</Path>` |
| T-38 | `<Path>{roots.state}/specdev/changes/{change}/ticket/38-overall-acceptance.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-38.md</Path>` |

## 3. Gates and Completion Evidence

### Overall Definition of Done

- 全部 38 张票为 done 或经用户批准 cancelled，并各有 Evidence；
- G-FINAL 关闭；
- 账本中 agent 负责的 AC 都有结果；真机验收项明确标为“待用户真机验收”；
- 按 `<Path>{roots.workflows}/specdev/common/rules/change-completion.md</Path>` 通过整体验收后，Lead 才能把 README 的 Outcome 改为 completed；
- 票全部 done 本身不等于 Goal 完成。

### Gates

| Gate | 开启条件 | 关闭证据 | 阻塞范围 | Lead/批准人 | 失败恢复 |
|---|---|---|---|---|---|
| G-BASELINE | 实施授权 + README Execution Context 已记录 | T-01、T-02 Evidence；账本存在；基线命令退出码已记录 | 全部代码票（`blocked_by` T-01） | Lead | 基线失败只记录不修；工作区不干净时先记录 `git status` |
| D 诊断门 | G-BASELINE | T07/T18的实际诊断；T19已由用户明确结束跟进，见Evidence | T07及其依赖闭包；T18已完成；T19 cancelled后不再阻塞T28 | Lead | 无法复现保留事实；用户取消独立记录，不伪称修复 |
| G-DESIGN | P 原型 W6.18 三个真实内容原型 | 用户批准当前 change DESIGN；沿用 DESIGN-0002 人工发布例外，UI 票固定 design_ref，Browser 排除 | T-23–T-36；T-18 共享规则可复用，具体页面仍待 D 诊断 | 用户批准；Lead 核对 | 摘要漂移返回 P |
| G-STORAGE | T-04–T-08、T-10、T-11 done | `pnpm check:huhu-bot`、`pnpm bench:huhu-bot`、Go 全量测试通过；Windows 联合重测分别报告模型收益与 I/O 收益 | 存储批次的合入 PR | Lead | 回到失败票；不与 UI 大改同提交 |
| G-HOOK | T-12、T-13、T-21 done | Windows runner ≥20 轮记录；安全回归通过 | Hook 批次合入 PR | Lead | 回到 T-13 |
| G-UI-BASE | T-23、T-24 done | 样板全状态与多窗口检查通过 | T-25–T-35 | Lead | 回到 T-23/T-24 |
| G-FINAL | T-38 前置全部 done | T-38 Evidence；冻结期适用全量检查（execution-boundaries）、冻结期构建序列（execution-boundaries）、`pnpm check:bundle`、Go 全量通过 | change 完成 | Lead | 按失败项 replan |

### Contract and Reference Coverage

| 合同或参考要求 | 覆盖 Ticket | 验证接缝 | Evidence | 状态 |
|---|---|---|---|---|
| AC-001–AC-903（全 38 条） | 见 Tickets Map §4（脚本核对无 uncovered） | 见各票验证方法 | 各票 `<Path>{roots.state}/specdev/changes/{change}/evidence/</Path>` | covered |
| ADR-001–ADR-009 | T-04、T-05、T-10、T-11、T-14、T-16、全部 UI 票 | 同上 | 同上 | covered |
| 永久 ADR-027（持久性） | T-04、T-05、T-08 | Go 合同与 durability 测试 | T-05、T-08 Evidence | covered；回写经 A |
| DESIGN revision 2 / DESIGN-0002 / UI-001 | T-23–T-36；T-18 诊断后绑定 | Design Conformance | UI 票 Evidence | G-DESIGN 当前批准见 LOG-017/018；原视觉批准见 LOG-016 |

## 4. Execution and Integration Protocol

**执行入口：** 获得实现授权后，Lead 与实现执行者读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`，再按当前输入实际调用适用项目 Skill。I 负责实现、风险适配双轴审查、验证与 Evidence；计划本身不授予实现或 Git 操作权限。

### Lead Orchestration

执行方式与下方工作区策略相互独立。默认按当前宿主正常执行（mode: host）。

**本 change 明确允许 subagent 与 agent team 派遣。** 用户在 2026-10-31 的请求中写明“允许 agent team 或者 sub agent 派遣”。具体含义：

1. **授权范围：** Lead 可以通过宿主原生能力派遣 subagent，或组建 agent team，用于实现、只读调研、诊断、测试观察和独立审查。这是允许，不是强制。Lead 按上下文连续性、依赖、并行收益和恢复需要决定直接执行、派一个执行者还是派多个；一个执行者可以连续做多张票，一张票也可以由多人协作。CLI、Herdr、Orca 通道未被选择，用户另行要求时才使用。
2. **推荐的派遣场景：**
   - W1 经实际写集与资源检查的独立票（存储轨 T-04/T-05 不并发改合同，T-09、Hook 轨 T-12、启动/功能轨 T-14/T-15/T-16、测量轨 T-20），可分给并行执行者；
   - T-07、T-18、T-19 的 D 诊断，以及 W1.1 消费者盘点，适合只读 subagent；
   - deep/high 风险票（T-04、T-05、T-10、T-11、T-13、T-16）适合派独立 reviewer 做双轴审查；
   - U2/U3 的各模块 UI 票，在 G-UI-BASE 之后可由 team 并行推进。
3. **Dispatch Packet：** 每次派遣按 `<Path>{roots.references}/coordination/task-brief.md</Path>` 绑定以下内容：
   - Ticket 路径、Map `plan_revision`、Spec、相关 ADR；
   - 依赖票的 Evidence、不可变基线 SHA、change 工作区；
   - 本票 `writable_paths`（未分配路径默认只读）、必需 Skill（dev，UI 票再加 ui）、验证命令、停止条件、返回位置。
4. **交接形式：** 按 `<Path>{roots.references}/coordination/session-files.md</Path>` 选择：
   - 并行写入、长时或需恢复的派遣，使用持久的 `TASK.md`/`REPORT.md`，放在 `<Path>{roots.state}/specdev/changes/{change}/sessions/</Path>` 下（轮次 `YYYYMMDDTHHMMSSZ`，任务 `NNN-<topic>`）；
   - 短时同步的只读任务用即时返回。
5. **执行者边界：**
   - 只写分配的写集和自己的 REPORT；
   - 不写 Ticket 状态、Evidence、账本、README Outcome 或永久知识；
   - 不做暂存、提交、checkout、merge；
   - 不递归派遣，除非 Lead 明确授予能力、预算、权限与写集；
   - 共享语义资源（见 Tickets Map §5）同一时刻只有一个 owner。
6. **回收与验收：**
   - REPORT 写 completed、进程 idle 或退出码，都不等于票 done。Lead 回读真实文件与命令结果，在稳定输入上完成审查和检查后，才写 Evidence 和状态。
   - 同一 blocker 没有新证据时停止重复派遣；只换 Agent 不算恢复。

| 项目 | 决定 | 事实依据 |
|---|---|---|
| Lead | `host:codex/root` | 唯一 SpecDev 状态、Evidence、账本与交付验收 owner |
| Ticket scheduling | `ticket_execution: auto`；用户未要求票据上限，不设 max_parallel_tickets | DAG、路径/资源、用户与项目要求 |
| Implementation agents | 用户允许 subagent 与 agent team（2026-10-31 请求）；未指定人数，不设 concurrent_implementation_limit；受宿主实际能力约束，Lead 参与实现时计入 | 不从票数或工作区数量推导 |
| Integration attempts | `3` | execution-policy 缺省值；config 无更严格上限 |
| Read-only agents | 只读调研、诊断、测试观察、审查 agent 不额外占票据槽；review 中的票仍计入 | 当前 Work 的独立审查要求仍生效 |
| Dispatch | execution-time dynamic：宿主原生 subagent / agent team，按事实逐票决定；provider 与模型不预分配 | 用户允许；coordination-contract |

### Change Workspace and Verification

- **工作区：** 只在 change README 的 Execution Context 记录，所有票据与执行者复用。用户未指定，因此默认 current（当前 `dev` checkout）。只有用户明确要求才创建一个 change worktree。并行和派遣都不增加工作区。
- **调度：** serial 完成当前票的实现、审查和验证后，才开始下一票。auto/parallel 推进无冲突的 Ready 票。
- **串行协调：** shared owner、Git index 操作与全局验证由 Lead 串行协调；审查和整体测试前，先让相关 writer 停写。
- **验收输入：** 验收基于真实 commit 或未提交快照。Lead 负责的 E2E 在稳定的 change-workspace 上执行，不创建 candidate checkout。
- **真机验收：** 由用户自行完成，不在本计划的执行与跟踪范围内（LOG-012）。

### Authorization Matrix

| 动作 | 状态 | 目标与条件 |
|---|---|---|
| Planning / design scope amendment | authorized | LOG-017/018；仅当前 change 文档、绑定与验证 |
| Browser development / repair | paused-by-user | ADR-009；后续一般实施授权不自动恢复 |
| Change workspace implementation | authorized | 2026-10-31 当前用户请求完成全部票据；Browser 冻结继续生效 |
| Change worktree creation | not-requested | 默认 current |
| Change workspace verification | authorized | 当前用户实施请求；固定输入、适用双轴审查与 Lead E2E |
| Implementation commit | not-requested | 仅明确要求且获授权时执行；提交说明用 `type(scope): 说明` |
| Merge / parent update | not-requested | 合入 dev 按批次另行授权 |
| Push / PR / remote merge | not-authorized | PR 引用 #37，不写自动关闭关键词；需另行授权 |
| Branch/worktree cleanup | not-authorized | 精确授权目标 |
| Deploy / migration / production actions | not-authorized | 不发版、不升版本 |
| Subagent / agent team dispatch | allowed | 2026-10-31 用户请求；只在实施或只读调研已获授权的范围内使用，派遣本身不扩大写权限 |

### Evidence Return

任务执行者只返回候选事实与 checkpoint/快照：实际实现者、改动路径、dirty 状态、命令与退出码、未验证项、blocker。Lead 独立核对后写 Evidence、状态与账本，并做最终验收。

## 5. Constraints, Risk and Recovery

### Non-negotiable Constraints

- ADR-001 至 ADR-008：不保留兼容层；停止分阶段如实报告；检查点不属于业务提交；依赖不逐条落库闭包；可选初始化不在关键路径；固定英文路径；旧目录与旧 Profile 不读写不删。
- 永久 Bot ADR-027 持久性语义不变。
- NFR-001 至 NFR-004：数据安全、诊断脱敏、不提高预算、存储与 UI 不同提交。
- 不改插件 id、不换技术栈、不复制 GPL 终端代码、不提交密钥。
- 面向用户的文案用 `t()`，同时提供 en/zh。

### Verification Integrity

- **判卷接缝：** 见各票验证方法与 Tickets Map §4。
- **基线：** T-01 在任何代码改动前采集。
- **禁止的伪绿色：**
  - 删断言、无条件重试、全局放宽时限；
  - 关闭 Defender、扩大所有容量；
  - 提高预算阈值；
  - 用 Linux 结果代替其他平台，用 CI/DOM 结果冒充真机。
- **验证边界：** 每票验证在 change-workspace 的固定输入上执行；整体门由 Lead 在 G-STORAGE、G-HOOK、G-FINAL 执行。

### Migration or Release Sequence

- **数据格式：** T-10 新 schema → T-11 隔离新 Profile（旧 Profile 原样保留）。T-16 默认路径改名，不检测、不迁移旧目录。两者都没有迁移器，也没有兼容窗口；收缩条件即“代码中零旧路径或旧 schema 引用”，由 T-16 的残余扫描和 T-38 的引用清点证明。
- **合入顺序：** 按批次 PR 合入 dev：存储（G-STORAGE）、Hook（G-HOOK）、启动/功能修复、UI 底座、UI 模块、收口。存储与 UI 不进同一提交。
- **发布：** 本计划不包含发布。

### Risks, Monitoring and Recovery

| 风险 | 监控 | 恢复 |
|---|---|---|
| 停止阶段漏报，导致宿主提前重开 Profile | T-04/T-06 失败注入测试 | 回到 T-04 合同 |
| 依赖新模型破坏撤权或清除 | T-10 合同回归 | 回滚 T-10 提交，旧 Profile 不受影响（ADR-007） |
| Windows 证据不可得（runner 不稳定） | CI 日志 | 账本标未验收，不阻塞其他批次 |
| 设计批准摘要漂移 | 当前 DESIGN/Ticket 引用 | 只暂停受影响 UI 子项并返回 P；当前批准不重复创建 |
| 包体预算被修复挤爆 | 每票 `pnpm check:bundle` 差异 | 报告差异，交 T-37；不提高阈值 |
| 并行派遣写到他人写集 | Lead 回收时用 `git status` 比对写集 | 停止该执行者，按 deviation-control 处理，不暂存他人改动 |

### Deviation Control

遵循 `<Path>{roots.workflows}/specdev/common/rules/deviation-control.md</Path>`。

## 6. Progress and Decisions

### Current Status

- **规划状态：** 规划完成，当前用户已授权实施（`status: ready`，`ready_for_execution: true`）。Spec ready，设计树 consensus，Tickets Map ready。
- **票状态：** 以各 Ticket frontmatter 与 ticket-control 只读输出为准；本轮修订 T-23–T-36 的设计绑定、写集和验证接缝；逐票状态与未完成门以 Ticket 为准。T-07/T-18/T-19 诊断门、T-37/T-38 上游门保留。
- **执行 owner：** Lead 为 host:codex/root；各票实际实现者见原 Evidence 与派遣 TASK。

### Pending Decisions and Blockers

- **实施授权（全局执行门）：** 当前用户已授权。README 已记录 current 工作区，基线 86c500556db1d64865c4cc7f1aff1dd83de071fa；执行模型为 gpt-6-astra low。
- **G-DESIGN：** 已关闭（LOG-016）。本轮用户“全部按你的推荐落盘”确认九项推荐；UI-001 ready，change DESIGN approved，DESIGN-0002 已按用户批准的实施前发布例外人工落盘并回读，标准 promotion 预检失败仍保留。T-23–T-36 已绑定；T-18 仍由诊断门负责其具体行为设计。
- **T-37 写集：** 待 T-36 完成后，按实际减重目标重新划定。

### Resume Protocol

1. 读取本 Goal Plan、README 的 Execution Context、Tickets Map（核对 `plan_revision`）、当前 Ticket 及其 Evidence 中的 Workspace Execution Record，以及 `<Path>{roots.state}/specdev/changes/{change}/sessions/</Path>` 下未回收的 TASK/REPORT。
2. 核对实际 Git 分支与 HEAD、dirty 状态，以及仍可能在写入的执行者。结果未知的派遣先查询原调用，不重复派遣。
3. 从最后一个可信的 checkpoint 或快照继续，运行 `<Path>{roots.workflows}/specdev/common/tools/ticket-control.mjs</Path> --map` 重新计算 eligible。

## Assumptions

- 默认工作区为当前 `dev` checkout（current）：低影响，可逆，用户可在授权实施时另行指定。
- GitHub Actions 的 Windows、macOS、Linux runner 可用于新增的独立工作流：低影响，授权后由 T-05、T-12、T-20 首次运行时验证；不可用时在账本中标为未验收。

本计划没有高影响假设。若出现高影响假设，`ready_for_execution` 必须为 `false`。

## Execution Policy Source

- **ticket_execution: auto**：用户未指定，取 execution-policy 默认值。
- **票据上限、实现者人数上限：** 用户未指定，因此不记录 max_parallel_tickets 和 concurrent_implementation_limit。实际受宿主能力约束。
- **派遣：** 用户在 2026-10-31 请求中写明“编排计划需要强调：允许 agent team 或者 sub agent 派遣”，记录为允许宿主原生 subagent 与 agent team（非强制）。
- **integration_attempt_limit: 3**：execution-policy 缺省值。`<Path>.agents/speculo/config.json</Path>` 没有 execution 段，不另建配置。
- **工作区：** 见 change README 的 Execution Context（实施开始时由 Lead 记录）。

## 本轮实施边界（LOG-017、LOG-018）

- `<Path>{roots.state}/specdev/changes/{change}/execution-boundaries.md</Path>` 是全部派遣任务的必读输入；Browser 直接路径和混合文件中相关段落冻结，shared_paths 由 Lead 独占写入。指派前核对冻结项与本票实际写集，执行者不以共享 UI 或清理名义扩大范围。
- T-04/T-06 在同一集成批次完成联合验证后才能进入 dev；T-04 的阶段性检查不冒充 TS 消费者已迁移。T-04/T-05 的停止生命周期合同资源互斥。
- UI 共享 runner 由 T-23 建设；其他 UI 票写所属 fixture/组件/词典/样式，Lead 固定输入后做独立 Chromium 验收。用户真机项不产生 agent 额外清单或跟踪任务。
- 来源登记、Home 词典、生成产物分别由 Lead 串行写；原型验证复用仍有效证据，生产验证不能复用原型截图。默认 pnpm build 会生成 Browser 资产，冻结期仅执行 execution-boundaries 的替代序列。
- Browser 冻结及依赖其变更的共享子项不计作本 change 已完成；在账本标“用户暂停、后续重构”，从当前交付完成门排除。其余未冻结 AC 必须满足实际证据；本次引入回归必须修正非 Browser 变更。
- 修订后仍不授权生产实现、提交、推送、PR、远程 CI dispatch 或发版；未来实施授权不能覆盖 Browser 暂停。保留 38 个稳定 Ticket ID，不为暂停项建立假的 done 票。

## 本次执行授权与恢复事实（2026-10-31）

用户已明确要求按全部票据实施，指定实现模型 gpt-6-astra、reasoning low；Lead 为 host:codex/root。当前实施与本地验证 authorized，替代上文规划阶段 not-authorized；Browser 冻结、Git/远程副作用限制保持。采用 current 工作区、原生 subagent、auto 调度。实际票级状态与 Evidence 是唯一进度来源。

预检修正 T-04 API 实际路径与 T-14 音乐恢复直接调用方；Map revision 4。对应偏差在各票 Evidence；无 Spec 行为变更，根票基线证据不失效。

Map revision5修正T-04停止合同真实消费者与持久化注入接缝、T-14真实Home装配测试路径；来自004/005只读预检，不改变Spec/AC。

revision5控制校验发现base文件交集，已将既定T-04/T-05串行顺序固化为T-05依赖T-04（T-08继承），并重算DAG；其他独立根分支不受影响。

## 用户处置与本地继续（2026-10-31）

2026-10-31 用户答复：“我也不知道，如果没重现的话，就先默认完成，先不管”。据此结束T19本轮调查/修复要求；工程状态为用户批准取消（cancelled），不是已复现并修复，也不是完整AC261通过。保留现有诊断和生产行为，不再追问或安排复现。
Map23移除T28的T19前置。远程CI暂不运行（用户明确答复），T12 Windows证据继续待验收；不再请求同一授权，不把本地结果代替平台证据。其余已授权本地工作继续。
