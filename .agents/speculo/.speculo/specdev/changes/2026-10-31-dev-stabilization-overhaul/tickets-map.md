---
schema_version: 3
plan_contract_version: 1
plan_revision: 23
requested_deliverables: []
deliverable_policy: "用户未指定 Ticket 或产物数量（2026-10-31 请求“请你进行拆票和编排计划”）；票数由垂直切片规则决定"
artifact: tickets-map
change: 2026-10-31-dev-stabilization-overhaul
status: ready
---

# Tickets Map: #37 dev 稳定性、性能、功能修复与全界面统一

- **Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **Ticket 目录：** `<Path>{roots.state}/specdev/changes/{change}/ticket/</Path>`
- **Evidence 目录：** `<Path>{roots.state}/specdev/changes/{change}/evidence/</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`（Wave、Gate、Lead 与派遣的编排权威）

## 1. 目标与拆分策略

**执行入口：** 获得实现授权后，Lead 与实现执行者读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`，再按当前输入实际调用适用项目 Skill。I 负责实现、风险适配双轴审查、验证与 Evidence；计划本身不授予实现或 Git 操作权限。

共同交付 Spec 的 AC-001 至 AC-903（对应 #37 的 A16、A19–A35 与 G1–G3）。按 #37 §13 批次拆为 38 张垂直切片票：B0 基线（T-01–T-03）、存储与生命周期（T-04–T-11）、Hook（T-12、T-13、T-21）、启动与功能缺陷（T-14–T-19）、测量与诊断（T-20、T-22）、UI（T-23–T-36）、收口（T-37、T-38）。
Prefactor：T-09 先建立依赖规模基准，T-12 先测量 Hook 发布分段，供 T-10、T-13 收紧断言。共享合同先行：T-04 拥有停止阶段合同（含可能的 HAP wire 变更），T-06 再迁移 TS 消费者。不采用 expand-contract 兼容层（ADR-001）：合同变更在同一集成批次更新全部生产者与消费者；T-04/T-06 分票实现，联合验收前不独立合入 dev。收缩：T-36 清理 UI 旧实现，T-37 结构减重。

### 总体实施背景

- **模块边界：** 模块之间只经 `api.ts`；React store 只是业务事实投影（LOG-005）。Go 侧遵守永久 Bot ADR-001–ADR-027，尤其 ADR-004 单写者、ADR-027 WAL + NORMAL + 外部动作 FULL 屏障。
- **关键不变量：** 超时不等于已停止；检查点不属于业务提交；条目不逐条落库闭包；可选初始化不在启动关键路径；`huhu/` 下 HUHU 生成的默认路径为固定英文 kebab-case；旧中文默认目录与旧 Profile 不读不写不删（ADR-001–ADR-008）。
- **证据纪律：** 五类证据分开（CONTEXT“证据等级”）；不靠删断言、无条件重试或放宽时限取得绿灯；真机验收（真实 Obsidian、Windows/macOS 实机、虚拟机骤停）由用户完成，agent 不执行不跟踪（LOG-012），agent 验证止于自动化测试与 GitHub Actions runner。
- **账本：** T-01 建立 `docs/e2e/dev-overhaul/ledger.md` 后由 Lead 独占维护；其他票把结果交给 Lead 写入，不直接改账本。
- **基线顺序：** 所有代码票 `blocked_by` T-01，确保基线在任何代码改动之前采集。
- **UI 门：** G-DESIGN 已关闭（LOG-016）；T-23–T-36 已填写批准设计引用并完成本轮 DoR 复核。执行仍读取 Ticket 的 ready/blocked_by，不绕过上游与 Goal 授权门。T-07/T-18/T-19 保持诊断门，具体页面变更及 AC-251 设计映射在诊断后处理。
- **诊断门：** T-07、T-18、T-19 根因未知，先经 `<Path>{roots.workflows}/specdev/specdev-d-diagnose-bugs/SKILL.md</Path>` 复现后再重审。
- **预算：** 任何票都不提高 `scripts/bundle-budget.json` 阈值（NFR-003）；包体增长先报告差异。

### 项目 Skill 读取矩阵

| Applies To | Project Skill | Trigger / Scope | Read Timing | Purpose |
|---|---|---|---|---|
| ALL | `<Path>.agents/skills/dev/SKILL.md</Path>` | 插件代码、设置、测试、构建、Go/Rust 原生、依赖与来源 | 实现前与选择验证时 | required: 根 AGENTS.md 规定改插件代码、测试、构建须遵循开发规则；验证选择以其 testing.md 为唯一选择表 |
| T-18 T-23 T-24 T-25 T-26 T-27 T-28 T-29 T-30 T-31 T-32 T-33 T-34 T-35 T-36 | `<Path>.agents/skills/ui/SKILL.md</Path>` | 工作台页面、面板、对话框、组件、主题或 CSS | 实现前 | required: 根 AGENTS.md 规定改工作台界面须遵循界面规则 |

## 2. 执行清单

| ID | Ticket | 跨票 Gate/依赖导航 |
|---|---|---|
| T-01 | `<Path>{roots.state}/specdev/changes/{change}/ticket/01-baseline-ledger.md</Path>` | G-BASELINE；本 Map 第 3、6 节 |
| T-02 | `<Path>{roots.state}/specdev/changes/{change}/ticket/02-bundle-baseline.md</Path>` | G-BASELINE；本 Map 第 3、6 节 |
| T-03 | `<Path>{roots.state}/specdev/changes/{change}/ticket/03-source-records.md</Path>` | 无；本 Map 第 3、6 节 |
| T-04 | `<Path>{roots.state}/specdev/changes/{change}/ticket/04-runner-stop-phases.md</Path>` | G-STORAGE；本 Map 第 3、6 节 |
| T-05 | `<Path>{roots.state}/specdev/changes/{change}/ticket/05-checkpoint-maintenance.md</Path>` | G-STORAGE；本 Map 第 3、6 节 |
| T-06 | `<Path>{roots.state}/specdev/changes/{change}/ticket/06-host-stop-consumer.md</Path>` | G-STORAGE；本 Map 第 3、6 节 |
| T-07 | `<Path>{roots.state}/specdev/changes/{change}/ticket/07-eof-regression.md</Path>` | G-STORAGE；本 Map 第 3、6 节 |
| T-08 | `<Path>{roots.state}/specdev/changes/{change}/ticket/08-macos-durability.md</Path>` | G-STORAGE；本 Map 第 3、6 节 |
| T-09 | `<Path>{roots.state}/specdev/changes/{change}/ticket/09-dependency-scale-harness.md</Path>` | 无；本 Map 第 3、6 节 |
| T-10 | `<Path>{roots.state}/specdev/changes/{change}/ticket/10-dependency-model.md</Path>` | G-STORAGE；本 Map 第 3、6 节 |
| T-11 | `<Path>{roots.state}/specdev/changes/{change}/ticket/11-isolated-profile.md</Path>` | G-STORAGE；本 Map 第 3、6 节 |
| T-12 | `<Path>{roots.state}/specdev/changes/{change}/ticket/12-hook-publish-measurement.md</Path>` | G-HOOK；本 Map 第 3、6 节 |
| T-13 | `<Path>{roots.state}/specdev/changes/{change}/ticket/13-hook-publish-reliability.md</Path>` | G-HOOK；本 Map 第 3、6 节 |
| T-14 | `<Path>{roots.state}/specdev/changes/{change}/ticket/14-optional-init-off-critical-path.md</Path>` | 无；本 Map 第 3、6 节 |
| T-15 | `<Path>{roots.state}/specdev/changes/{change}/ticket/15-weather-lifecycle.md</Path>` | 无；本 Map 第 3、6 节 |
| T-16 | `<Path>{roots.state}/specdev/changes/{change}/ticket/16-default-paths-and-names.md</Path>` | 无；本 Map 第 3、6 节 |
| T-17 | `<Path>{roots.state}/specdev/changes/{change}/ticket/17-automation-notification-names.md</Path>` | 无；本 Map 第 3、6 节 |
| T-18 | `<Path>{roots.state}/specdev/changes/{change}/ticket/18-split-command.md</Path>` | G-DESIGN、D 诊断门；本 Map 第 3、6 节 |
| T-19 | `<Path>{roots.state}/specdev/changes/{change}/ticket/19-task-projection.md</Path>` | D 诊断门；本 Map 第 3、6 节 |
| T-20 | `<Path>{roots.state}/specdev/changes/{change}/ticket/20-perf-sampling.md</Path>` | 无；本 Map 第 3、6 节 |
| T-21 | `<Path>{roots.state}/specdev/changes/{change}/ticket/21-hook-script-minify.md</Path>` | G-HOOK；本 Map 第 3、6 节 |
| T-22 | `<Path>{roots.state}/specdev/changes/{change}/ticket/22-diagnostics-convergence.md</Path>` | 无；本 Map 第 3、6 节 |
| T-23 | `<Path>{roots.state}/specdev/changes/{change}/ticket/23-tokens-base-components.md</Path>` | G-DESIGN、G-UI-BASE；本 Map 第 3、6 节 |
| T-24 | `<Path>{roots.state}/specdev/changes/{change}/ticket/24-global-shell.md</Path>` | G-DESIGN、G-UI-BASE；本 Map 第 3、6 节 |
| T-25 | `<Path>{roots.state}/specdev/changes/{change}/ticket/25-agent-ui.md</Path>` | G-DESIGN；本 Map 第 3、6 节 |
| T-26 | `<Path>{roots.state}/specdev/changes/{change}/ticket/26-home-frame.md</Path>` | G-DESIGN；本 Map 第 3、6 节 |
| T-27 | `<Path>{roots.state}/specdev/changes/{change}/ticket/27-home-content.md</Path>` | G-DESIGN；本 Map 第 3、6 节 |
| T-28 | `<Path>{roots.state}/specdev/changes/{change}/ticket/28-home-planning-task.md</Path>` | G-DESIGN；本 Map 第 3、6 节 |
| T-29 | `<Path>{roots.state}/specdev/changes/{change}/ticket/29-home-media.md</Path>` | G-DESIGN；本 Map 第 3、6 节 |
| T-30 | `<Path>{roots.state}/specdev/changes/{change}/ticket/30-home-misc-viz.md</Path>` | G-DESIGN；本 Map 第 3、6 节 |
| T-31 | `<Path>{roots.state}/specdev/changes/{change}/ticket/31-automations-notifications-ui.md</Path>` | G-DESIGN；本 Map 第 3、6 节 |
| T-32 | `<Path>{roots.state}/specdev/changes/{change}/ticket/32-archives-safe-ui.md</Path>` | G-DESIGN；本 Map 第 3、6 节 |
| T-33 | `<Path>{roots.state}/specdev/changes/{change}/ticket/33-huhubot-ui.md</Path>` | G-DESIGN；本 Map 第 3、6 节 |
| T-34 | `<Path>{roots.state}/specdev/changes/{change}/ticket/34-browser-comments-icons-ui.md</Path>` | G-DESIGN；本 Map 第 3、6 节 |
| T-35 | `<Path>{roots.state}/specdev/changes/{change}/ticket/35-navigator-versioning-ui.md</Path>` | G-DESIGN；本 Map 第 3、6 节 |
| T-36 | `<Path>{roots.state}/specdev/changes/{change}/ticket/36-ui-contract-cleanup.md</Path>` | G-DESIGN；本 Map 第 3、6 节 |
| T-37 | `<Path>{roots.state}/specdev/changes/{change}/ticket/37-bundle-reduction.md</Path>` | 无；本 Map 第 3、6 节 |
| T-38 | `<Path>{roots.state}/specdev/changes/{change}/ticket/38-overall-acceptance.md</Path>` | G-FINAL；本 Map 第 3、6 节 |

本表只导航实际 Ticket 和跨票合同。状态、Ready、执行 owner、深度、风险及本票写集从 Ticket frontmatter 回读，实际 workspace/集成结果从本票 Evidence 回读；不在 Map 缓存或随进度更新。Map frontmatter 的 status 表示本 Map 的结构/合同就绪与验收，不汇总或代替单票进度。

## 3. 依赖 DAG

按最长前置链分层（箭头左侧为前置）：

```text
L0: T-01  T-02  T-03
L1: T-04←[T-01]  T-09←[T-01]  T-12←[T-01]  T-14←[T-01]  T-16←[T-01]  T-18←[T-01]  T-19←[T-01]  T-20←[T-01]  T-23←[T-01]
L2: T-15←[T-01,T-16]  T-05←[T-01,T-04]  T-06←[T-04]  T-13←[T-12]  T-17←[T-01,T-16]  T-24←[T-23,T-16]
L3: T-07←[T-04,T-06]  T-08←[T-05]  T-10←[T-09,T-05]  T-25←[T-24,T-18]  T-26←[T-24,T-15]  T-31←[T-24,T-17]  T-32←[T-24,T-16]  T-34←[T-24]  T-35←[T-24]
L4: T-11←[T-10,T-06,T-04,T-16]  T-22←[T-07,T-13,T-12]  T-27←[T-26,T-16]  T-28←[T-26]  T-29←[T-26,T-14]  T-30←[T-26]
L5: T-21←[T-13,T-02,T-22]  T-33←[T-24,T-11]
L6: T-36←[T-25,T-26,T-27,T-28,T-29,T-30,T-31,T-32,T-33,T-34,T-35]
L7: T-37←[T-36,T-21,T-02]
L8: T-38←[T-03,T-08,T-11,T-20,T-22,T-37]
```

- **根：** T-01（基线）、T-02、T-03。
- **prefactor：** T-09 → T-10；T-12 → T-13。
- **共享合同：** T-04 → T-06 → T-07 / T-11。
- **汇合点：** T-10（T-05 + T-09）、T-11（T-04 + T-06 + T-10 + T-16）、T-22（T-07 + T-12 + T-13）、T-36（全部 UI 模块票）、T-38（全部叶子）。
- **关键路径：** T-01 → T-23 → T-24 → T-26 → T-28 → T-36 → T-37 → T-38（受 G-DESIGN 控制）；非 UI 最长链 T-01 → T-04 → T-06 → T-07 → T-22 → T-21 → T-37。
- **收缩：** T-36（UI 旧实现）、T-37（结构减重）。

## 4. 合同覆盖矩阵

| Contract ID | 覆盖 Ticket | 验证接缝 | 状态 | 说明 |
|---|---|---|---|---|
| AC-001 | T-01, T-38 | 账本回读 | covered | — |
| AC-002 | T-01 | 命令退出码与 CI 日志 | covered | — |
| AC-161 | T-14 | `pnpm test:music-account` | covered | — |
| AC-162 | T-14 | `pnpm test:music-account` | covered | — |
| AC-163 | T-20 | `scripts/perf/` + CI | covered | 真机部分属用户真机验收 |
| AC-191 | T-16 | vitest + `pnpm test:i18n` | covered | — |
| AC-192 | T-16 | 旧目录夹具 | covered | — |
| AC-201 | T-25 | agent UI DOM | covered | 共享设计见 G-DESIGN 回执；生产验收仍由本票负责 |
| AC-202 | T-25 | agent UI DOM | covered | 共享设计见 G-DESIGN 回执；生产验收仍由本票负责 |
| AC-211 | T-26, T-35 | DOM 可访问名称 | covered | 共享设计见 G-DESIGN 回执；生产验收仍由本票负责 |
| AC-221 | T-15, T-26 | `pnpm test:weather-mapping` / dashboard-isolation | covered | 共享设计见 G-DESIGN 回执；生产验收仍由本票负责 |
| AC-231 | T-17, T-31 | automations/notifications vitest | covered | 共享设计见 G-DESIGN 回执；生产验收仍由本票负责 |
| AC-241 | T-31 | 容器宽度 DOM + 独立组件 UI runner | covered | 共享设计见 G-DESIGN 回执；生产验收仍由本票负责 |
| AC-251 | T-18 | workspace 模型测试 | covered | 共享规则已批准；本票具体页面/AC-251 绑定仍待诊断 |
| AC-261 | T-19 | 既有诊断回放 | covered | 用户于2026-10-31结束未复现问题跟进；T19 cancelled，不宣称AC通过 |
| AC-262 | T-28 | DOM 布局 + 独立组件 UI runner | covered | 共享设计见 G-DESIGN 回执；生产验收仍由本票负责 |
| AC-271 | T-03 | `pnpm check:notices` / `test:docs` | covered | — |
| AC-281 | T-04, T-06 | Go 合同 + `pnpm check:huhu-bot` | covered | — |
| AC-282 | T-04, T-06 | Go 合同 + TS 宿主测试 | covered | — |
| AC-283 | T-05 | `sqlite/base` 测试 | covered | — |
| AC-284 | T-05, T-10 | Windows runner | covered | 真机部分属用户真机验收 |
| AC-291 | T-09, T-10 | Go 规模测试 | covered | — |
| AC-292 | T-10 | Go 合同 | covered | — |
| AC-293 | T-11 | Go/TS 隔离夹具 | covered | — |
| AC-301 | T-07 | effect-reconcile 合同 | covered | — |
| AC-311 | T-12, T-13 | hook-spool 真实进程 + Windows runner | covered | 真机部分属用户真机验收 |
| AC-312 | T-13 | hook/spool-guard 测试 | covered | — |
| AC-321 | T-22 | 诊断决定表 + 测试 | covered | — |
| AC-331 | T-02, T-37 | `pnpm check:bundle` | covered | — |
| AC-332 | T-21 | hooks 真实进程测试 | covered | — |
| AC-341 | T-08 | 审计记录 | covered | — |
| AC-342 | T-08 | macOS runner | covered | 真机部分属用户真机验收 |
| AC-351 | T-23, T-24, T-25, T-26, T-27, T-28, T-29, T-30, T-31, T-32, T-33, T-34, T-35 | 样式/运行时检查 + 独立组件 UI runner | covered | 共享设计见 G-DESIGN 回执；生产验收仍由本票负责 |
| AC-352 | T-23, T-24 | 设计检查 + DOM 几何 | covered | 共享设计见 G-DESIGN 回执；生产验收仍由本票负责 |
| AC-353 | T-36 | `pnpm lint:css` / `check:styles` | covered | 共享设计见 G-DESIGN 回执；生产验收仍由本票负责 |
| AC-901 | T-38 | 引用清点 | covered | — |
| AC-902 | T-11, T-16, T-38 | 隔离/旧目录夹具 | covered | — |
| AC-903 | T-38 | 冻结期适用全量检查 | covered | — |

## 5. 并行与路径所有权

- 按 <Path>{roots.workflows}/specdev/common/rules/execution-policy.md</Path> 分别决定票据调度、Agent 编排和 change 工作区。默认 auto；serial 逐票完成，parallel 仅推进已就绪且无冲突的票，不强制多 Agent。
- `max_parallel_tickets` 只计量票据；项目明确的实现者人数限制独立适用。一张票可由一个 Agent、subagent 或团队协作，按用户/项目/Work 要求选择。本 change 用户已允许 subagent 与 agent team 派遣，细则见 Goal Plan §4。
- 所有票据引用 change README 的唯一工作区；current 可在 main 或已有 checkout，明确选择的 change worktree 创建一次后持续复用。并行和派遣不增加 worktree。
- shared owner 按 Ticket frontmatter 声明；共享来源、Home 词典和生成产物归 Lead，详见 execution-boundaries。Lead 是正式状态与 Evidence owner，Git index 操作和全局验证协调串行。
- 只读 research/review 不构成实现票据并发，当前 Work 的独立审查要求继续生效。
- 语义资源：`huhubot:stop-lifecycle-contract`、`huhubot:profile-lock`（T-04、T-05、T-11；同资源排他，T-11 另受 DAG 约束）；`huhubot:sqlite-write-connection`（T-05）；`huhubot:memory-schema`、`huhubot:migration-sequence`（T-10）；`agent:hook-spool-protocol`（T-13）；`storage:vault-layout`（T-16）。
- 脚本对全部 38 票做了写集交叉检查：worker 写集相交由 DAG 排序；Lead-owned shared_paths 按 execution-boundaries 串行，冻结排除项优先。

| Ticket A | Ticket B | Writable 交集 | 真实依赖 | 处理 |
|---|---|---|---|---|
| T-04 | T-05 | base/store.go、durability_test.go；共享停止生命周期 | T-05 blocked_by T-04 | 合同与持久化接缝先完成，再改检查点维护；调查可并行 |
| T-04 | T-09 | 无 | 否 | 可并行 |
| T-05 | T-09 | 无 | 否 | 可并行（T-10 汇合） |
| T-12 | T-14 | 无 | 否 | 可并行 |
| T-14 | T-15 | 无（home/platform/desktop vs board-store、weather-service） | 否 | 可并行 |
| T-15 | T-16 | board-store.ts / board-store.test.ts | 是 | T-15 blocked_by T-16，默认路径先收口 |
| T-16 | T-17 | 无直接交集；T-17 读 T-16 改过的 automations 路径 | 是 | T-17 blocked_by T-16 |
| T-11 | T-16 | `docs/data.md` | 是 | T-11 blocked_by T-16 |
| T-21 | T-22 | `hook-spool.test.ts` | 是 | T-21 blocked_by T-22 |
| T-01 | 其余 | 账本 | 是 | 账本建立后由 Lead 独占 |

## 6. Gate、Wave 与集成点

Wave、Gate、Lead 与派遣边界以 `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>` §2–§4 为准。候选行为里程碑：G-BASELINE（T-01、T-02）→ G-STORAGE / G-HOOK / 启动与功能缺陷并行 → G-DESIGN → G-UI-BASE（T-23、T-24）→ UI 模块 → G-FINAL（T-38）。

## 7. 横切契约与风险

- **数据：** 路径改名与 Profile 隔离都不读写旧数据（ADR-006/007/008）；任何票不得默认覆盖、移动或清空用户文件（NFR-001）。
- **共享接口：** 停止阶段合同由 T-04 唯一修改；T-04 更新 Go/wire/生成类型与夹具，T-06 更新 TS 宿主；两票联合验收后同批完整集成。
- **持久性：** ADR-027 语义不变；W2 结论回写永久 ADR 只在归档时经 A。
- **诊断与隐私：** 失败输出有上限且脱敏（NFR-002）。
- **提交边界：** 存储大改与 UI 大改不进同一提交；同一合同的生产者/消费者完整提交（NFR-004）。PR 引用 #37，不写自动关闭关键词。

## 8. 维护规则

- Ticket 进度改变时只更新原 Ticket/Evidence；查看进度或恢复时重新读取它们，Map 保持不变；
- Ticket 新增、移除、ID/路径或依赖合同变化时，修复本 Map 的导航、DAG 与覆盖；不从旧 Map 恢复票级状态；
- 项目 Skill 新增、移动、删除、触发范围变化或实现中发现新的适用 Skill 时，先同步读取矩阵并重新校验；
- Goal Plan 存在时，Wave、Gate 和 owner 以 `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>` 为编排权威；
- 依赖、合同覆盖或路径所有权变化后运行 `<Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path>`；
- 内部工件不得使用相对 Markdown 链接。

## 9. 总控与恢复

从本 Map 进入 `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/SKILL.md</Path>` 的 plan/run/resume/replan/verify。先运行 `<Path>{roots.workflows}/specdev/common/tools/ticket-control.mjs</Path>` 的 `--map` 只读检查，再按 `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/map-control.md</Path>` 调用 I 和真实 Skill、验收、更新状态直到完成或明确阻塞；此工具本身不执行代码。

- requested_deliverables 为空：用户未提出数量要求，依据见 deliverable_policy。
- 变更范围或验收后递增 plan_revision 并重算受影响闭包；原完成证据保留，失效证据不得复用。
- 共享语义资源在 Ticket resource_claims 声明；不把“不同文件”视为互不冲突。
- 未闭合事务先查原网关，其他任务冲突只暂停相关部分；全部票 done 后仍需整体 Gate 与集成验收。

## 10. 初版检查记录（plan_revision 1，已由 LOG-017/018 修订）

下表保留初版判断作为历史；“无阻塞/全部通过”不代表当前所有具体修复已就绪。当前执行以修订后的 Ticket 与第 12 节为准。

按 `<Path>{roots.workflows}/specdev/common/skills/plan-quality-review/references/checklist.md</Path>` 只读检查全部 38 票：

| 检查轴 | 结论 | 证据 |
|---|---|---|
| 背景与边界 | pass | 每票“目标与来源”引用 #37 W 编号、Spec AC、ADR/LOG；IN/REUSE/OUT 明确 |
| 变更影响 | pass（附注） | 入口经源码检索核对（core.go、store.go、context_view.go、vault-layout.ts、hook-spool.ts 等）；检查中发现 HAP wire 合同位于仓库根 `contracts/hap/v0.1`，已补入 T-04 写集。T-16 写集来自中文路径字面量检索，以“残留扫描零命中”验收兜底；T-37 写集待 T-36 后重划（draft） |
| 研究与复用 | not-applicable | 本计划只用本地源码事实与 #37 已有依据；Galaxy 固定 commit 来源沿 UI-001 保存；只参考形态，实际复制前由实施票复核许可 |
| Skill 方法 | pass | dev（ALL）与 ui（UI 票）为 required 绑定，含 SHA-256；来源为根 AGENTS.md |
| 执行计划 | pass | 共享合同先行（T-04→T-06）、prefactor（T-09、T-12）、收缩（T-36、T-37）；T-10 内含 ADR-004 决策门 |
| 控制图 | pass | DAG 无环；初版脚本核对；本轮 worker 相交由 DAG 排序，shared_paths 唯一 Lead owner，语义资源另检查 |
| 验收与数量 | pass | 38 条 AC 全部 covered；用户无数量要求 |
| 权限 | pass | 实施、提交、推送均未授权；派遣仅为允许，不扩大写权限 |
| 恢复 | pass | 基线 T-01 先行；Goal Plan §6 Resume Protocol；持久 TASK/REPORT 位置已定 |

阻塞项：无。剩余 draft 票的缺口为 D 诊断门与上游完成，各票“未决问题”写明解除条件。

## 11. 当前 G-DESIGN 绑定（plan_revision 3）

当前固定设计：`<Path>{roots.state}/specdev/changes/{change}/DESIGN.md</Path>` revision 2，designDigest `566034f112192e7d062540a1ce9051674b061d0475e61bf2a794825aad46f77b`；基线 DESIGN-0002，digest `ef5e5080f6c1a8f967397af72fca0050820b9ad4d9a4f57451be3a63ab55b2b1`；原型 UI-001。批准及 A 发布回执：`<Path>{roots.state}/specdev/changes/{change}/prototypes/UI-001/evidence/approval-scope-revision-2.md</Path>`、`<Path>{roots.state}/specdev/changes/{change}/prototypes/UI-001/evidence/publication-receipt.json</Path>`。

| 票 | 已读页面合同 | 范围说明 |
|---|---|---|
| T-23 | UI-GALLERY | 页面任务与状态；其余模块入口继承共享规则并逐项验收 |
| T-24 | UI-GALLERY | Shell、app 设置/外观/引导；Browser 相关入口冻结 |
| T-25 | UI-TERMINAL、UI-GALLERY | 页面任务与状态；其余模块入口继承共享规则并逐项验收 |
| T-26 | UI-HOME | 页面任务与状态；其余模块入口继承共享规则并逐项验收 |
| T-27 | UI-HOME | 页面任务与状态；其余模块入口继承共享规则并逐项验收 |
| T-28 | UI-LIST、UI-HOME | 页面任务与状态；其余模块入口继承共享规则并逐项验收 |
| T-29 | UI-HOME | 页面任务与状态；其余模块入口继承共享规则并逐项验收 |
| T-30 | UI-HOME | 页面任务与状态；其余模块入口继承共享规则并逐项验收 |
| T-31 | UI-LIST | 页面任务与状态；其余模块入口继承共享规则并逐项验收 |
| T-32 | UI-SAFE、UI-GALLERY | 页面任务与状态；其余模块入口继承共享规则并逐项验收 |
| T-33 | UI-BOT、UI-TERMINAL | 页面任务与状态；其余模块入口继承共享规则并逐项验收 |
| T-34 | UI-GALLERY | 仅 Comments/Icons；Browser 全部暂停 |
| T-35 | UI-HOME、UI-GALLERY | 共享规则/组件映射；本模块实际页面在实施时验收 |
| T-36 | UI-GALLERY | 共享规则/组件映射；本模块实际页面在实施时验收 |

本轮 plan-quality-review 只重审设计绑定受影响范围：背景/边界、变更影响、方法绑定、验收、权限、恢复均通过；当时 14 张票的 IN/OUT、依赖、写集与数量保持；本次 LOG-017/018 已修订范围、写集和依赖，以当前 frontmatter 为准。dev/ui Skill 摘要已重算无漂移，设计 AC 映射逐项核对。控制图与路径交叉检查复用原计划并运行 tickets/ticket-control 校验；无生产 Evidence 被提升。Ready 是计划可执行性，调度仍须依赖完成。T-18 的 D 诊断与后续页面设计绑定不因本轮批准自动完成。

## 12. 一致性修订与冻结（LOG-017、LOG-018）

必读 `<Path>{roots.state}/specdev/changes/{change}/execution-boundaries.md</Path>`；Browser 及其集成从本 change 的实际交付中排除，不能用全插件 UI、依赖收缩、测试修复或包体减重恢复。T-34 保留 ID/文件名但只实施 Comments/Icons，T-29 排除 WebPanel。Spec 的 38 条 AC 均已映射，AC-351–353 与总体验收按未冻结范围判定。

| 审计问题 | 当前负责位置/处理 |
|---|---|
| 真机/DOM 混淆 | execution-boundaries：独立组件 runner；UI 票不运行 Obsidian overflow-audit |
| 停止合同原子性 | T-04/T-06 分票、同批联合验收；T-04/T-05 语义资源互斥 |
| token 顺序 | T-23 建立规范，模块随票迁移，T-36 零引用后清理；冻结消费者延期 |
| UI 文件覆盖 | T-24 app 设置/外观/引导，T-26 Home 根入口，T-34/T-35 作者样式；其余按当前写集 |
| 词典/来源 | 各模块词典随票；Home 词典和 docs/references 归 Lead 串行 |
| 生成产物 | Lead-owned shared_paths 与冻结期构建序列 |
| EOF | T-07 先 D 再补生产写集和 DoR；Windows Vitest workflow 归本票 |
| 性能 | T-20 独立 fixture 的计时点、命令、输出和三平台趋势，不冒充宿主性能 |
| 设计发布 | DESIGN-0002 保留已批准人工发布例外；不再次发布永久文件 |
| 陈旧状态 | 38 AC；T-18 只保留真实诊断/页级绑定缺口；最新决定 LOG-017/018 |

上述为规划修订，不是生产验收。根因待确认的 T-07/T-18/T-19 和依赖上游的 T-37/T-38 保持各自门禁；Goal 实施授权仍未开启。

## 实施预检路径修订（plan_revision 4）

- T-04: 现存 API 定义在 internal/application/api；原票 internal/api 不存在。只纠正同一停止合同入口，不改变行为范围。
- T-14: module.ts 等待 MusicService.load；真正 await account.restore 位于 platform/music/music-service.ts:166。为实现已批准非阻塞恢复需包含这个直接调用方，Browser 服务合同不变。

Lead 按真实入口批准；依赖、AC、冻结边界与共享所有权不变。当前根票派单 revision 3 的合同仍有效，后续使用 revision 4。

## 实际消费者与验证接缝修订（plan_revision 5）

T-04按004-stop-preflight纳入HAP/stdio真实入口、TS协议生成真源、recovery旧超时断言和停止持久化窄接缝；T-14按005-startup-preflight纳入真实Home装配测试。行为/AC/DAG不变。base/store.go在T-04/T-05之间继续由同一停止生命周期资源串行保护，不并发实施。T-01/02/03合同与基线证据有效。

T-04新增持久化窄接缝形成真实文件交集，T-05显式依赖T-04（继而T-08受序）；不能仅靠语义资源掩盖路径冲突。上图从全部Ticket当前blocked_by重算，保留T-24既有T-16依赖。

### Revision 6 执行预检修正

T03-DOC-01经Lead批准，仅增加归档相对引用检查器及负向回归写集，以完成来源文档必需验证；不修改历史档案或跳过断链。其余依赖、资源、Spec及在行T04/T14/T23合同不变。

### Revision 7 Go调用方补全

T04-D04补tests/contract/approval/checkpoint_inspection_test.go中的旧Close超时断言调用方，属于T04已定的全Go消费者迁移。无其他写集、依赖或公共行为变化。

### Revision 8 T18诊断回归与DoR

T18-D01真实单标签静默拒绝已复现并经差分确认，补真实service/消费者/测试及词典写集，绑定既有UI-TERMINAL控件/无障碍合同；不改Spec/DESIGN/Browser范围。T18 ready，T07/T19仍保留诊断门。其余在行合同不变。

### Revision 9 T14验证工具归位

T14-D02增加scripts/fixtures/dev-overhaul-startup/**，把新增Node验证工具从文档目录移到现有工具区域；不改全局lint规则或产品合同。T18未决问题段与已完成D诊断同步，其他在行任务不变。

### Revision 10 T04并发屏障回归接缝

T04-D05新增stdio同包server_lifecycle_test.go以确定性验证独立审查发现的受理/关闭竞争；生产合同与其他票依赖不变。

### Revision 11 T16 默认路径真实调用方

T16-D01补充路径/显示/导出碰撞/隐藏空名保护消费者与回归；标签显示绑定既有 UI-GALLERY 控件合同，不扩展视觉设计。新增 board-store 交集使 T15 显式依赖 T16；T26 的最长层级仍为 L3，后续闭包不变。在行 T04/T23 输入不受影响；T14 已完成源码不变。

### Revision 12 T16 现役JSON名收拢

T16-D02增加6个现役Model/RecordStorage调用方的常量引用接缝，固定文件名保持，无持久化格式变化或新增依赖冲突；未使用的旧常量不作顺手清理。T03严格分类新增HAP Markdown是已批准检查器内部必要处理，不扩写集。

### Revision 13 T03 检查器实际验收

T03的文档门修复包含检查器行为，原纯文档E2E描述同步为Lead完整docs CLI必需检查；已实际执行0。写集/风险/来源合同与依赖不变，未豁免任何原验证。

### Revision 14 T06 真实停止消费者

017预检补events/runner.test.ts唯一目录外旧shutdownGraceMs消费者，允许该旧参数及真实退出清理最窄迁移。E2E明确Go脚本不能代替TS↔Go，增加实际Vitest runner集合；其他范围/DAG不变。T18已确认D状态的旧draft叙述同步，正式派遣不改变原AC/视觉合同。

### Revision 15 T16 当前用户文档同步

补12个现役用户/架构文档中的固定默认路径描述，与已实施单表同步；历史档案/ADR/context及Browser正文不动。路径文档更正及已授权Inbox空名入口的就近DOM回归；不增加行为范围或新依赖。原T16下游排序继续满足写集冲突。

### Revision 16 T16 默认路径调用方回归补全

收拢navigator设置周期预览W/Q到单表，以及12个实际创建/加载默认根的现役回归；必须先观察具体默认路径断言失败再改预期，显式自定义/旧根保护不批替换。空收件箱沿用现有inbox.dom.test fixture，不新建重复suite。其他DAG/行为及在行T06/T18合同不变。

## 实施偏差 D17（2026-10-31）

T12测量runner落在docs使全仓lint失败，增加scripts/fixtures/dev-overhaul-hook/run-measurement.mjs精确写集，迁入工具区并同步workflow/复跑说明，不改lint配置；docs只留证据。T16 Lead四模块+golden验收183文件/1284例通过，唯一失败为expense/records.dom.test.tsx仍mock旧writeVaultFile，生产CSV已改create-only端口；补该实际消费者测试路径，保持筛选和CSV内容断言并检查无覆盖。修正后窄重跑即可，失败输入/日志保留，其他1284例无变化不重复。DAG与风险不变。

## 实施偏差 D18（2026-10-31）

T24按031真实消费者预检补intro-modal.dom.test.tsx及scripts/ui-review/fixtures/T-24.tsx/.mjs。Browser共用外框/导航视觉依既有冻结合同延期，独立设置/外观/引导叶层继续迁移，真实Shell交互照常验证。UI-GALLERY及原DS001/004等设计引用、DAG、共享产物所有权不变。T16已done，T24依赖满足。

## 实施偏差 D19（2026-10-31）

T05按027预检补portable/store.go、assistant/store.go及各窄测试，另可新增bootstrap/checkpoint_stop_test.go但core生产只读。原AC要求长读者下停止持续追加，不承诺固定字节硬限；提交前准入及有限在途事务的越阈值边界在Ticket D01明确。T04/T06联合验收已完成，停止资源仍由T05单独拥有。依赖/DAG/风险不变。

## 实施偏差 D20（2026-10-31）

T24真实外观预览需要脚本宿主getIcon导出，Lead独占共享stub补空注册表端口；新增精确shared_path/owner，无产品视觉、DAG或Browser范围变化。

## 实施偏差 D21（2026-10-31）

T15按真实天气全链预检补现有weather-store.test.ts和weather-service.test.ts，用确定性缓存读写挂起及代次/Vault接缝验证；复用既有storageWriteQueue，明确已进入I/O不可撤销而同key不得反覆盖的边界。DAG/AC/UI冻结范围不变。

## 实施偏差 D22（2026-10-31）

T24 Lead检查发现Intro静态React/UI链会进入app启动集合，补intro-content.tsx以动态加载内容并验证晚到卸载；Appearance同文件测试用真实SettingsStore持久化失败合同。无视觉/AC/DAG改动，保持Browser共用分支冻结。wave5构建尚未执行，不能把旧77例当此修后结论。

## 实施偏差 D23（2026-10-31）

2026-10-31 用户答复：“我也不知道，如果没重现的话，就先默认完成，先不管”。据此结束T19本轮调查/修复要求；工程状态为用户批准取消（cancelled），不是已复现并修复，也不是完整AC261通过。保留现有诊断和生产行为，不再追问或安排复现。
T28移除T19前置，只依赖T26；该取消不被当作成功前置自动满足。其他DAG/设计/生产写集不变。T12远程CI获用户明确“暂不运行远程 CI，继续本地任务”，保留Windows待验收并继续独立本地工作。
