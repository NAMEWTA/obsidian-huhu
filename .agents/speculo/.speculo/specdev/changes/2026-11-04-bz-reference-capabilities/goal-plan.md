---
schema_version: 8
artifact: goal-plan
change: 2026-11-04-bz-reference-capabilities
status: completed
modes: ["migration", "high-assurance", "reference-conformance"]
orchestration: lead-directed
lead: "herdr:w3:p1/claude"
integration_attempt_limit: 3
ticket_execution: auto
ready_for_execution: false
---

# Goal Plan: 借鉴 bz 的公共基建、密码本、归物本、书页日记、人物阅读层与数据体检（#17）

- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **Tickets Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Ticket 目录：** `<Path>{roots.state}/specdev/changes/{change}/ticket/</Path>`
- **Evidence 目录：** `<Path>{roots.state}/specdev/changes/{change}/evidence/</Path>`

## 1. Outcome and Authority

### Outcome

Spec 第 1–7 节全部交付：统一基建（反馈、领域事件、文件变化、通知基础设施）、密码本快速取密与三段式工作区、归物本、书页日记、人物阅读层、health 只读扫描与有限修复，以及 bz 来源登记；AC-001 至 AC-903 均有 Evidence。

### Success and False Completion

成功：每个 AC 有命令与退出码或 UI runner 结果；G-FINAL 整体门禁通过；宿主内表现明确标注“待用户验收”。以下不算完成：只新增测试文件；UI 仅原型而无生产实现；包体靠提高阈值通过；写入路径只用 mock 证明零写入；票全部 done 但 G-FINAL 未跑。

### Non-goals

Spec OOS-001–008：huhubot/AI、私密加密集合、外部通知渠道实现、bz 整体移植及装饰功能、safe 格式变更、估值与自动记账、禁止的自动修复、一次性迁移全部 Vault 监听。不提交、不推送、不发版（未授权）。

### Authoritative Inputs

复刻参考固定为 bz `d76a0870329403247917a00c43019e203a2560a4`（https://github.com/yeshimei/bz/tree/d76a0870329403247917a00c43019e203a2560a4 ，MIT）；`src/{password-vault,belongings,diary,people,checkup}/` 单源 UI 与 `docs/adr/adr-0230-diary-book-ui.md` 是 G-DESIGN 的输入（上游 `prototypes/` 已于 ADR-0276 删除，LOG-022）。采用新上游提交前须记录差异（LOG-008）。

| 优先级 | 来源 | 负责内容 | 冲突处理 |
|---|---|---|---|
| 1 | 用户最新明确决定（LOG-001–021） | 产品取舍与批准 | 更新真正拥有该决策的工件 |
| 2 | `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>` 与 `<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>` | 当前 change 架构决定与领域语义 | 返回 `<Path>{roots.workflows}/specdev/specdev-g-grill-with-docs/SKILL.md</Path>` 更新真正 owner |
| 3 | `<Path>{roots.state}/specdev/adr/</Path>` 与 `<Path>{roots.state}/specdev/context/</Path>` | 已毕业的永久决定与领域知识 | 当前 change 替代时在 `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>` 与 `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>` 明示 |
| 4 | `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>` | 外部行为、范围与验收 | 下游不得改写 |
| 5 | `<Path>{roots.state}/specdev/changes/{change}/ticket/</Path>` | 单 Ticket 契约 | Goal Plan 只编排 |
| 6 | 当前代码/运行事实（基线 `29644dc`） | 现状与可行性 | 冲突时触发偏差并返回真正 owner |

## 2. Execution Graph

### DAG and Critical Path

```text
T-03 → T-04 → T-08 → T-14 → T-15
T-02 → T-05 → T-16 → T-17 → T-18 → T-19 → T-20
T-02 → T-06 → T-07          T-08 → T-09 → T-10
T-11 → T-12 → T-13          T-11, T-08 → T-17
G-DESIGN（P 原型 UI-001，单包九页）→ 全部 UI 票 DoR 重审
```

关键路径：T-02 → T-05 → T-16 → T-17 → T-18 → T-19 → T-20（T-17 同时汇合 T-08、T-11）。

### Waves and Ownership

Wave 是候选顺序，遵循用户顺序（LOG-015）；auto 调度下可提前推进依赖已满足、无冲突的 Ready 票。

| Wave | Ticket | 前置条件 | 项目写路径 | Shared owner | Gate/集成序号 |
|---|---|---|---|---|---|
| W1 | T-01 |  | <Path>docs/third-party/bz.md</Path>, <Path>docs/third-party/licenses/bz-MIT.txt</Path> | Lead | G-FEATURE |
| W1 | T-02 |  | <Path>src/shared/feedback/**</Path>, <Path>src/host/obsidian/feedback*.ts</Path>, <Path>src/host/obsidian/feedback*.test.ts</Path> | Lead | G-BASE |
| W1 | T-03 |  | <Path>src/shared/events/**</Path> | Lead | G-BASE |
| W1 | T-11 |  | <Path>src/modules/navigator/api.ts</Path>, <Path>src/modules/navigator/core/**</Path>, <Path>src/modules/navigator/services/**</Path> | Lead | G-FEATURE |
| W2 | T-04 | T-03 | <Path>src/host/obsidian/file-changes*.ts</Path>, <Path>src/modules/archives/services/**</Path> | Lead | G-BASE |
| W2 | T-05 | T-02 | <Path>src/modules/notifications/**</Path>, <Path>src/modules/automations/services/**</Path>, <Path>src/modules/automations/contrib/**</Path> | Lead | G-BASE |
| W3 | T-06 | T-02；G-DESIGN | <Path>src/modules/safe/ui/**</Path>, <Path>src/modules/safe/services/safe-service.ts</Path>, <Path>src/modules/safe/services/safe-service.test.ts</Path> | Lead | G-DESIGN→G-FEATURE |
| W3 | T-08 | T-04 | <Path>src/modules/archives/core/**</Path>, <Path>src/modules/archives/services/**</Path>, <Path>src/modules/archives/api.ts</Path> … | Lead | G-FEATURE |
| W4 | T-07 | T-06；G-DESIGN | <Path>src/modules/safe/ui/**</Path> | Lead | G-DESIGN→G-FEATURE |
| W4 | T-09 | T-08, T-02；G-DESIGN | <Path>src/modules/archives/ui/belongings/**</Path> | Lead | G-DESIGN→G-FEATURE |
| W4 | T-12 | T-11；G-DESIGN | <Path>src/modules/navigator/ui/diary/**</Path> | Lead | G-DESIGN→G-FEATURE |
| W4 | T-14 | T-08 | <Path>src/modules/archives/core/**</Path>, <Path>src/modules/archives/services/**</Path>, <Path>test/golden/archives-v2.test.ts</Path> … | Lead | G-FEATURE |
| W5 | T-10 | T-09；G-DESIGN | <Path>src/modules/archives/ui/belongings/report/**</Path> | Lead | G-DESIGN→G-FEATURE |
| W5 | T-13 | T-12, T-02；G-DESIGN | <Path>src/modules/navigator/ui/diary/**</Path>, <Path>src/modules/navigator/services/**</Path> | Lead | G-DESIGN→G-FEATURE |
| W5 | T-15 | T-14, T-02；G-DESIGN | <Path>src/modules/archives/ui/person/**</Path>, <Path>src/modules/archives/ui/generic/RecordEditor.tsx</Path> | Lead | G-DESIGN→G-FEATURE |
| W5 | T-16 | T-02, T-05 | <Path>src/modules/health/**</Path> | Lead | G-FEATURE |
| W6 | T-17 | T-16, T-08, T-11 | <Path>src/modules/archives/contrib/health*.ts</Path>, <Path>src/modules/navigator/contrib/**</Path>, <Path>src/modules/safe/contrib/**</Path> | Lead | G-FEATURE |
| W7 | T-18 | T-17 | <Path>src/modules/health/core/**</Path>, <Path>src/modules/health/services/**</Path>, <Path>src/modules/archives/contrib/health*.ts</Path> | Lead | G-FEATURE |
| W8 | T-19 | T-18；G-DESIGN | <Path>src/modules/health/ui/**</Path>, <Path>src/modules/health/contrib/**</Path> | Lead | G-DESIGN→G-FEATURE |
| W9 | T-20 | T-01…T-19 | <Path>docs/safe.md</Path>, <Path>docs/contacts.md</Path>, <Path>docs/navigator.md</Path> … | Lead | G-FINAL |

### Ticket Quick Reference

UI 票（T-06、T-07、T-09、T-10、T-12、T-13、T-15、T-19）当前为 draft：待 G-DESIGN 产出 change DESIGN 后绑定 design_ref 并按 ticket-readiness 重审。

| ID | Ticket | Evidence |
|---|---|---|
| T-01 | `<Path>{roots.state}/specdev/changes/{change}/ticket/01-bz-source-register.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-01.md</Path>` |
| T-02 | `<Path>{roots.state}/specdev/changes/{change}/ticket/02-operation-feedback.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-02.md</Path>` |
| T-03 | `<Path>{roots.state}/specdev/changes/{change}/ticket/03-domain-events.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-03.md</Path>` |
| T-04 | `<Path>{roots.state}/specdev/changes/{change}/ticket/04-file-change-adapter.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-04.md</Path>` |
| T-05 | `<Path>{roots.state}/specdev/changes/{change}/ticket/05-notification-infrastructure.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-05.md</Path>` |
| T-06 | `<Path>{roots.state}/specdev/changes/{change}/ticket/06-safe-quick-pick.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-06.md</Path>` |
| T-07 | `<Path>{roots.state}/specdev/changes/{change}/ticket/07-safe-workspace.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-07.md</Path>` |
| T-08 | `<Path>{roots.state}/specdev/changes/{change}/ticket/08-belongings-domain.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-08.md</Path>` |
| T-09 | `<Path>{roots.state}/specdev/changes/{change}/ticket/09-belongings-page.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-09.md</Path>` |
| T-10 | `<Path>{roots.state}/specdev/changes/{change}/ticket/10-belongings-report.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-10.md</Path>` |
| T-11 | `<Path>{roots.state}/specdev/changes/{change}/ticket/11-periodic-batch-volumes.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-11.md</Path>` |
| T-12 | `<Path>{roots.state}/specdev/changes/{change}/ticket/12-diary-book-reader.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-12.md</Path>` |
| T-13 | `<Path>{roots.state}/specdev/changes/{change}/ticket/13-diary-search-write.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-13.md</Path>` |
| T-14 | `<Path>{roots.state}/specdev/changes/{change}/ticket/14-person-journal-data.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-14.md</Path>` |
| T-15 | `<Path>{roots.state}/specdev/changes/{change}/ticket/15-person-reading-page.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-15.md</Path>` |
| T-16 | `<Path>{roots.state}/specdev/changes/{change}/ticket/16-health-module-core.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-16.md</Path>` |
| T-17 | `<Path>{roots.state}/specdev/changes/{change}/ticket/17-health-providers.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-17.md</Path>` |
| T-18 | `<Path>{roots.state}/specdev/changes/{change}/ticket/18-health-limited-repair.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-18.md</Path>` |
| T-19 | `<Path>{roots.state}/specdev/changes/{change}/ticket/19-health-page.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-19.md</Path>` |
| T-20 | `<Path>{roots.state}/specdev/changes/{change}/ticket/20-docs-overall-acceptance.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-20.md</Path>` |

## 3. Gates and Completion Evidence

### Overall Definition of Done

全部 20 张票 done 且 Evidence 可回读；G-BASE、G-DESIGN、G-FEATURE、G-FINAL 关闭；AC-001–AC-903 均有证据或经用户批准 deferred；文档与来源登记描述当前实现；README Outcome 经 change-completion 判定。

### Gates

| Gate | 开启条件 | 关闭证据 | 阻塞范围 | Lead/批准人 | 失败恢复 |
|---|---|---|---|---|---|
| G-BASE | T-02、T-03 可开始 | T-02–T-05 Evidence；`pnpm test:architecture`、`pnpm test:safety-regressions`、notifications/automations 套件通过 | 所有消费共享协议的票 | Lead | 协议缺口回到生产者票修订，消费者不自行扩协议 |
| G-DESIGN | 现在即可开启（不依赖代码） | 执行 `<Path>{roots.workflows}/specdev/specdev-p-prototype/SKILL.md</Path>`，产出 `<Path>{roots.state}/specdev/changes/{change}/DESIGN.md</Path>` 与单个原型包 UI-001（页面 SAFE-QUICK、SAFE-WORKSPACE、BELONGINGS、BELONGINGS-REPORT、DIARY-READER、DIARY-SEARCH-WRITE、PERSON-READING、HEALTH-SCAN、HEALTH-REPAIR；方法合同一个 change DESIGN 只绑定一个原型包，LOG-022）；每页单一候选以 bz 单源 UI 为蓝本；批准记录引用 LOG-013 的用户预先批准；`--stage prototype` 校验通过 | 全部 UI 票 | Lead；批准人为用户（已预先批准） | 设计漂移或校验失败时修订原型包，不让实现者重选风格 |
| G-FEATURE | 某功能全部票 done | 该功能 AC 证据齐全；UI runner 通过；`pnpm run build`、`pnpm run lint` 通过 | 该功能后续票与 T-20 | Lead | 失败票回到 in_progress，不复用失效证据 |
| G-FINAL | T-01–T-19 done | T-20 Evidence：Spec AC-901 整体命令全部退出码 0、AC-902 文档、AC-903 UI 汇总 | change 完成 | Lead | 记录失败项并回到对应票 |

### Contract and Reference Coverage

| 合同或参考要求 | 覆盖 Ticket | 验证接缝 | Evidence | 状态 |
|---|---|---|---|---|
| Spec AC 全量 | 见 Tickets Map §4 | 见各票验证方法 | 各票 Evidence | planned |
| bz 原型复刻（reference-conformance） | G-DESIGN + UI 票 | DESIGN 验收 + UI runner | 原型包 evidence 与 UI 票 Evidence | planned |
| 来源登记 AC-001 | T-01、T-20 及各复用票 | `pnpm check:notices`、`pnpm test:license-texts` | T-01/T-20 Evidence | planned |

## 4. Execution and Integration Protocol

**执行入口：** 获得实现授权后，Lead 与实现执行者读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`，再按当前输入实际调用适用项目 Skill。I 负责实现、风险适配双轴审查、验证与 Evidence；计划本身不授予实现或 Git 操作权限。

### Lead Orchestration

执行方式：Herdr（用户 2026-11-04 /goal 指定，required）。实现执行者：Herdr 托管的 codex（model gpt-6.1-sol，model_reasoning_effort=medium）；审查者：codex（gpt-6.1-sol，high），与实现者为不同会话，不参与被审票实现。Lead 只派遣、核验与写正式状态/Evidence。

| 项目 | 决定 | 事实依据 |
|---|---|---|
| Lead | herdr:w3:p1/claude（claude-code session 0d3e464c-990f-4b4b-9075-426344da0c9c） | 唯一 SpecDev 状态、Evidence 与交付验收 owner |
| Ticket scheduling | `ticket_execution: auto` | DAG、写集均已串行化（Map §5） |
| Implementation agents | 未指定人数限制；Lead 按写集与构建资源实际并行 2–3 个实现会话 | 用户未规定人数 |
| Integration attempts | 3 | 沿用模板默认，config 无更严格限制 |
| Read-only agents | 不占票据槽 | I 的独立审查要求仍生效 |
| Dispatch | execution-time dynamic | 按事实选择 |

### Change Workspace and Verification

使用 current（`/home/wta/projects/obsidian-huhu` 的 dev 分支，基线 `29644dc`），执行时写入 README Execution Context。auto 调度推进无冲突 Ready 票；shared owner（Lead）串行合入 `main.js`、`styles.css`、lockfile、NOTICE、各模块 `module.ts`/`manifest.ts`/`i18n.ts` 与 `src/app/**` 注册点。

### Authorization Matrix

| 动作 | 状态 | 目标与条件 |
|---|---|---|
| Change workspace implementation | allowed | 用户 2026-11-04 /goal：实现全部 Ticket 完成整个 change；写集按各票 |
| Change worktree creation | not-requested | 使用 current |
| Change workspace verification | allowed | 固定工作副本快照；共享构建（`pnpm run build` 写 main.js/styles.css）仅 Lead 串行执行 |
| Implementation commit | not-requested | 用户要求时再执行 |
| Merge / parent update | not-requested | — |
| Push / PR / remote merge | not-authorized | — |
| Branch/worktree cleanup | not-authorized | — |
| Deploy / migration / production actions | not-authorized | 不发版 |

### Evidence Return

任务执行者只返回候选事实与快照；Lead 独立核对并写 Evidence、状态和最终验收。Evidence 只入库结论报告（AGENTS.md SpecDev evidence 规则），截图、日志等留本地。

## 5. Constraints, Risk and Recovery

### Non-negotiable Constraints

AGENTS.md 分层、`api.ts` 边界、`t()` 双语、只做被要求的改动；safe 密码学与格式不变；日记正文单一来源；档案经 `ARCHIVES_COMMANDS` 写入；隐私 NFR-002；启动 NFR-001；包体 NFR-003。

### Verification Integrity

判卷接缝见各票。禁止：提高包体阈值换绿灯、以 mock 代替写 API spy 证明零写入、用原型截图代替生产组件 UI runner、把宿主内表现写成已验证。

### Migration or Release Sequence

DEC-001：通知协议在 T-05 一票内完成扩展、迁移自动化消费者与收缩旧类型；之后 T-16/T-19 才使用新来源。DEC-002：档案预设（T-08 归物、T-14 人物纪事）经定义发布流程，不覆盖用户修改。无发版步骤。

### Risks, Monitoring and Recovery

| 风险 | 监测 | 恢复 |
|---|---|---|
| safe 秘密泄露或锁定回归 | safe 全量 + `test:safety-regressions` + 哨兵测试 | 回退本票 UI 改动 |
| 档案索引漏更新（T-04） | 目录 rename/移出用例、`accept:archives-v2-scale` | 恢复 archives 原监听 |
| 日记正文被覆盖（T-13） | 写 API spy、未保存编辑器用例 | 停止写作入口，保留阅读 |
| 体检修复误改数据（T-18） | 旧哈希拒绝、部分失败回执 | 恢复事务 |
| 包体增长（T-12） | `check:bundle` 差异 | 改为按需分包或降级为 CSS 动效（需返回 G） |
| bz 上游变化 | 固定 SHA | 采用新提交前记录差异 |

### Deviation Control

遵循 `<Path>{roots.workflows}/specdev/common/rules/deviation-control.md</Path>`。

## 6. Progress and Decisions

### Current Status

已完成（2026-11-05）。G-BASE、G-DESIGN、G-FEATURE、G-FINAL 全部关闭：20 张 Ticket done，各票结论 Evidence 在 `<Path>{roots.state}/specdev/changes/{change}/evidence/</Path>`；G-FINAL 独立整体审查（sessions 101→103→105，herdr:rev1）结论 pass，整体结论见 `<Path>{roots.state}/specdev/changes/{change}/evidence/final-review.md</Path>`。未提交、未推送、未发版（not-requested）。

### Pending Decisions and Blockers

- 实施授权：未给出（本次只要求生成文件），因此 `ready_for_execution: true`。
- 计划质量审查（plan-quality-review，2026-11-04）：背景与边界 pass（Spec IN/REUSE/OUT 与基线复核）；变更影响 pass（各票 expected/read_only 列消费者）；研究与复用 pass（bz 固定 SHA 与具体路径在使用处）；Skill 方法 pass（dev/ui required 绑定含 sha256）；执行计划 pass（DEC-001/002 顺序）；控制图 pass（DAG 无环，写集重叠均有依赖边，shared 归 Lead）；验收与数量 pass（AC 全覆盖，用户未指定数量）；权限 pass（实施未授权）；恢复 pass（固定基线与 Gate 恢复）。UI 票按设计门暂不 Ready，非缺陷。

### Resume Protocol

恢复时读取本 Goal Plan、README 的 Execution Context、当前 Ticket 和原 Evidence 的 Workspace Execution Record，核对工作区、实际 Git 与 writer；从最后可信快照及未决事项继续。

## Assumptions

- 低影响：`scripts/ui-review/run.mjs` 可承载新页面 fixture（T-06 起逐票扩展）；验证方式为首个 UI 票运行通过。
- 低影响：page-flip 接入采用 npm 依赖或 vendor 由实现按仓库依赖惯例决定（LOG-018）。

## Execution Policy Source

用户未指定票数或人数；`.agents/speculo/config.json` 无执行限制字段。ticket_execution 取默认 auto；integration_attempt_limit 3 为模板默认；工作区见 change README（current）。
