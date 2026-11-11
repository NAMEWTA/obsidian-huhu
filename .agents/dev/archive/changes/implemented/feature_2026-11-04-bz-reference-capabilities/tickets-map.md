---
schema_version: 3
plan_contract_version: 1
plan_revision: 15
requested_deliverables: []
deliverable_policy: "用户未指定交付数量（2026-11-04 请求：生成 Spec、Tickets、Goal Plan 文件）"
artifact: tickets-map
change: 2026-11-04-bz-reference-capabilities
status: ready
---

# Tickets Map: 借鉴 bz 的公共基建、密码本、归物本、书页日记、人物阅读层与数据体检（#17）

- **Map：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/tickets-map.md</Path>`
- **Spec：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/spec.md</Path>`
- **Ticket 目录：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/ticket/</Path>`
- **Evidence 目录：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/evidence/</Path>`
- **Goal Plan：** `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/goal-plan.md</Path>`

## 1. 目标与拆分策略

**执行入口：** 获得实现授权后，Lead 与实现执行者读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`，再按当前输入实际调用适用项目 Skill。I 负责实现、风险适配双轴审查、验证与 Evidence；计划本身不授予实现或 Git 操作权限。

交付 Spec 第 1–7 节。按用户确定的顺序（LOG-015）：公共基建 → 密码本 → 归物本 → 书页日记 → 人物阅读层 → 体检。切片原则：共享合同（反馈协议、事件端口、文件适配、通知协议、health provider 契约）由单一 owner 票先交付，再扇出消费者；每个功能拆成“数据/领域票（非 UI，可立即 Ready）”与“页面票（UI，等 G-DESIGN）”。通知泛化按 DEC-001 在一票内完成协议与自动化消费者迁移，不留兼容别名。

### 总体实施背景

- 分层与边界：`app / shell / ui / theme / host / shared / modules`；模块只经对方 `api.ts` 互访；`manifest → module → core/platform/services/ui`；core/shared 不依赖 Obsidian/React/DOM；React、Radix、page-flip 不进启动同步闭包（Spec NFR-001）。
- 技术栈：React 19、Tailwind 4、shadcn/Radix、`<Path>src/ui/components/huhu/</Path>` 组件；文案用 `t()` 并给 `en`/`zh`。
- 数据：档案 Markdown 由 `ARCHIVES_COMMANDS` 写入（预期哈希、三方合并）；日记正文是周期笔记，写入经 `<Path>src/host/obsidian/document-mutation.ts</Path>`；safe 格式与密码学不变；不在插件目录存业务数据。
- 复用 bz：参考 `https://github.com/yeshimei/bz/tree/d76a0870329403247917a00c43019e203a2560a4`（MIT）。交互/布局按其 `src/*/` 单源 UI（ui.ts、render.ts、styles.css）复刻（`prototypes/` 已于上游 ADR-0276 删除，LOG-022），纯逻辑可复制改编，文件头署名并在 `<Path>docs/third-party/bz.md</Path>` 登记（ADR-003、AC-001）。
- 构建产物 `main.js`、`styles.css` 与 lockfile、NOTICE 等共享文件由 Lead 统一处理（见各票 shared_path_owners）。
- 不做：huhubot/AI、私密加密集合、外部通知渠道实现、safe 格式变更（Spec OOS-001–008）。

### 项目 Skill 读取矩阵

| Applies To | Project Skill | Trigger / Scope | Read Timing | Purpose |
|---|---|---|---|---|
| ALL | `<Path>.agents/skills/dev/SKILL.md</Path>` | 改插件代码、设置、测试、构建 | 实现前 | required：AGENTS.md 规定改插件代码读开发规则 |
| T-06, T-07, T-09, T-10, T-12, T-13, T-15, T-19 | `<Path>.agents/skills/ui/SKILL.md</Path>` | 改工作台页面、面板、对话框或样式 | 实现前 | required：AGENTS.md 规定改界面读界面规则 |

## 2. 执行清单

| ID | Ticket | 跨票 Gate/依赖导航 |
|---|---|---|
| T-01 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/ticket/01-bz-source-register.md</Path>` | 依赖 无；Goal Plan §3 |
| T-02 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/ticket/02-operation-feedback.md</Path>` | 依赖 无；Goal Plan §3 |
| T-03 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/ticket/03-domain-events.md</Path>` | 依赖 无；Goal Plan §3 |
| T-04 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/ticket/04-file-change-adapter.md</Path>` | 依赖 T-03, T-02；Goal Plan §3 |
| T-05 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/ticket/05-notification-infrastructure.md</Path>` | 依赖 T-02；Goal Plan §3 |
| T-06 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/ticket/06-safe-quick-pick.md</Path>` | G-DESIGN；依赖 T-02；Goal Plan §3 |
| T-07 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/ticket/07-safe-workspace.md</Path>` | G-DESIGN；依赖 T-06；Goal Plan §3 |
| T-08 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/ticket/08-belongings-domain.md</Path>` | 依赖 T-04；Goal Plan §3 |
| T-09 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/ticket/09-belongings-page.md</Path>` | G-DESIGN；依赖 T-08, T-02；Goal Plan §3 |
| T-10 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/ticket/10-belongings-report.md</Path>` | G-DESIGN；依赖 T-09, T-14, T-18；Goal Plan §3 |
| T-11 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/ticket/11-periodic-batch-volumes.md</Path>` | 依赖 无；Goal Plan §3 |
| T-12 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/ticket/12-diary-book-reader.md</Path>` | G-DESIGN；依赖 T-11；Goal Plan §3 |
| T-13 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/ticket/13-diary-search-write.md</Path>` | G-DESIGN；依赖 T-12, T-02；Goal Plan §3 |
| T-14 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/ticket/14-person-journal-data.md</Path>` | 依赖 T-08, T-09；Goal Plan §3 |
| T-15 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/ticket/15-person-reading-page.md</Path>` | G-DESIGN；依赖 T-14, T-02；Goal Plan §3 |
| T-16 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/ticket/16-health-module-core.md</Path>` | 依赖 T-02, T-05；Goal Plan §3 |
| T-17 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/ticket/17-health-providers.md</Path>` | 依赖 T-16, T-08, T-11；Goal Plan §3 |
| T-18 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/ticket/18-health-limited-repair.md</Path>` | 依赖 T-17, T-14；Goal Plan §3 |
| T-19 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/ticket/19-health-page.md</Path>` | G-DESIGN；依赖 T-18；Goal Plan §3 |
| T-20 | `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/ticket/20-docs-overall-acceptance.md</Path>` | 依赖 T-01, T-02, T-03, T-04, T-05, T-06, T-07, T-08, T-09, T-10, T-11, T-12, T-13, T-14, T-15, T-16, T-17, T-18, T-19；Goal Plan §3 |

本表只导航。状态、Ready、owner、深度、风险及写集从 Ticket frontmatter 回读，结果从 Evidence 回读。

## 3. 依赖 DAG

```text
基建：  T-01（来源登记，独立）
        T-02 反馈 ──→ T-05 通知 ──┐
        T-03 事件 ──→ T-04 文件适配(archives，+T-02)
密码本：T-02 ─→ T-06 快速取密 ─→ T-07 三段式工作区            [UI，G-DESIGN]
归物本：T-04 ─→ T-08 归物领域 ─→ T-09 归物页(+T-02) ─→ T-10 年度报告   [T-09/T-10 UI]
日记：  T-11 批量列表/分卷 ─→ T-12 书页阅读 ─→ T-13 搜索与写作(+T-02)   [T-12/T-13 UI]
人物：  T-08 ─→ T-14 纪事数据 ─→ T-15 人物阅读页(+T-02)             [T-15 UI]
体检：  T-02,T-05 ─→ T-16 health 核心 ─→ T-17 provider(+T-08,T-11) ─→ T-18 有限修复 ─→ T-19 体检页 [UI]
收尾：  T-01…T-19 ─→ T-20 文档与整体验收
```

Shared contract 生产者：T-02（反馈协议）、T-03（事件端口）、T-04（文件适配）、T-05（通知协议，expand+migrate+contract 同票）、T-16（provider 契约）。关键汇合点：T-17、T-20。T-14 依赖 T-08 仅因档案预设与服务写集串行，不是行为依赖。

## 4. 合同覆盖矩阵

| Contract ID | 覆盖 Ticket | 验证接缝 | 状态 | 说明 |
|---|---|---|---|---|
| AC-001 | T-01, T-20 | 见 Spec 验收合同 | covered | 由多票共同维护，T-20 最终核对 |
| AC-101 | T-02 | 见 Spec 验收合同 | covered |  |
| AC-102 | T-02 | 见 Spec 验收合同 | covered |  |
| AC-103 | T-02 | 见 Spec 验收合同 | covered |  |
| AC-104 | T-02 | 见 Spec 验收合同 | covered |  |
| AC-105 | T-02 | 见 Spec 验收合同 | covered |  |
| AC-111 | T-03 | 见 Spec 验收合同 | covered |  |
| AC-112 | T-03 | 见 Spec 验收合同 | covered |  |
| AC-121 | T-04 | 见 Spec 验收合同 | covered |  |
| AC-122 | T-04 | 见 Spec 验收合同 | covered |  |
| AC-123 | T-04 | 见 Spec 验收合同 | covered |  |
| AC-124 | T-04 | 见 Spec 验收合同 | covered |  |
| AC-131 | T-05 | 见 Spec 验收合同 | covered |  |
| AC-132 | T-05 | 见 Spec 验收合同 | covered |  |
| AC-133 | T-05 | 见 Spec 验收合同 | covered |  |
| AC-134 | T-05 | 见 Spec 验收合同 | covered |  |
| AC-201 | T-06 | 见 Spec 验收合同 | covered |  |
| AC-202 | T-06 | 见 Spec 验收合同 | covered |  |
| AC-203 | T-06 | 见 Spec 验收合同 | covered |  |
| AC-204 | T-06 | 见 Spec 验收合同 | covered |  |
| AC-211 | T-07 | 见 Spec 验收合同 | covered |  |
| AC-212 | T-07 | 见 Spec 验收合同 | covered |  |
| AC-213 | T-07 | 见 Spec 验收合同 | covered |  |
| AC-214 | T-07 | 见 Spec 验收合同 | covered |  |
| AC-301 | T-08 | 见 Spec 验收合同 | covered |  |
| AC-302 | T-08 | 见 Spec 验收合同 | covered |  |
| AC-303 | T-08 | 见 Spec 验收合同 | covered |  |
| AC-304 | T-08 | 见 Spec 验收合同 | covered |  |
| AC-305 | T-08 | 见 Spec 验收合同 | covered |  |
| AC-311 | T-09 | 见 Spec 验收合同 | covered |  |
| AC-312 | T-09 | 见 Spec 验收合同 | covered |  |
| AC-313 | T-08 | 见 Spec 验收合同 | covered |  |
| AC-321 | T-10 | 见 Spec 验收合同 | covered |  |
| AC-401 | T-11 | 见 Spec 验收合同 | covered |  |
| AC-402 | T-11 | 见 Spec 验收合同 | covered |  |
| AC-411 | T-12 | 见 Spec 验收合同 | covered |  |
| AC-412 | T-12 | 见 Spec 验收合同 | covered |  |
| AC-413 | T-12 | 见 Spec 验收合同 | covered |  |
| AC-414 | T-12 | 见 Spec 验收合同 | covered |  |
| AC-421 | T-13 | 见 Spec 验收合同 | covered |  |
| AC-422 | T-13 | 见 Spec 验收合同 | covered |  |
| AC-423 | T-13 | 见 Spec 验收合同 | covered |  |
| AC-501 | T-15 | 见 Spec 验收合同 | covered |  |
| AC-502 | T-14 | 见 Spec 验收合同 | covered |  |
| AC-503 | T-14 | 见 Spec 验收合同 | covered |  |
| AC-504 | T-15 | 见 Spec 验收合同 | covered |  |
| AC-601 | T-16 | 见 Spec 验收合同 | covered |  |
| AC-602 | T-16 | 见 Spec 验收合同 | covered |  |
| AC-603 | T-16 | 见 Spec 验收合同 | covered |  |
| AC-604 | T-19 | 见 Spec 验收合同 | covered |  |
| AC-611 | T-17 | 见 Spec 验收合同 | covered |  |
| AC-612 | T-17 | 见 Spec 验收合同 | covered |  |
| AC-621 | T-18 | 见 Spec 验收合同 | covered |  |
| AC-622 | T-18 | 见 Spec 验收合同 | covered |  |
| AC-623 | T-18 | 见 Spec 验收合同 | covered |  |
| AC-624 | T-19 | 见 Spec 验收合同 | covered |  |
| AC-631 | T-19 | 见 Spec 验收合同 | covered |  |
| AC-901 | T-20 | 见 Spec 验收合同 | covered |  |
| AC-902 | T-20 | 见 Spec 验收合同 | covered |  |
| AC-903 | T-20 | 见 Spec 验收合同 | covered |  |

未覆盖：无。

## 5. 并行与路径所有权

- 票据调度 `auto`；工作区复用 current（见 README Execution Context，执行时记录）。
- 所有写集重叠对（T-04/T-08、T-04/T-14、T-06/T-07、T-08/T-14、T-09/T-10、T-11/T-13、T-12/T-13、T-16/T-18、T-16/T-19、T-17/T-18、T-01/T-20）均由依赖边串行化；`src/modules/*/module.ts`、`manifest.ts`、`i18n.ts`、`src/app/**` 注册点、lockfile、NOTICE、构建产物为 shared，唯一 owner 为 Lead。

| Ticket A | Ticket B | Writable 交集 | 真实依赖 | 处理 |
|---|---|---|---|---|
| T-02 | T-03 | 无 | 否 | 可并行 |
| T-01 | T-02/T-03/T-11 | 无 | 否 | 可并行 |
| T-06 | T-08 | 无 | 否 | 可并行 |
| T-08 | T-11 | 无 | 否 | 可并行 |
| T-09 | T-12 | 无 | 否 | 可并行 |
| T-15 | T-16 | 无 | 否 | 可并行 |
| T-06 | T-17 | 无（`safe/module.ts` 为 Lead shared） | 否 | 可并行，shared 由 Lead 串行合入 |

## 6. Gate、Wave 与集成点

Gate（G-BASE、G-DESIGN、G-FEATURE、G-FINAL）与 Wave 由 `<Path>.agents/dev/archive/changes/implemented/feature_2026-11-04-bz-reference-capabilities/goal-plan.md</Path>` §2–§3 负责。

## 7. 横切契约与风险

- 共享协议变更（T-02/T-03/T-04/T-05/T-16）完成并有 Evidence 后，消费者票才能开始；消费者不得修改协议，发现缺口返回生产者票。
- 隐私：密码、账号名、日记正文不进入反馈、事件 payload、通知、体检报告、日志（NFR-002）。
- 启动与包体：新 UI、page-flip、health 扫描不进启动闭包；包体增长有理由（NFR-001、NFR-003）。
- 档案预设修订经定义发布流程，不覆盖用户已修改的预设（DEC-002）。
- 黄金样本 `test/golden/` 的有意格式变化（T-08、T-14）须在 Evidence 中列出差异。

## 7.1 修订记录

- plan_revision 2（2026-11-04，Lead 执行预检）：T-02 的“首批两个真实消费者（safe、archives）”与其只读路径矛盾（ticket-invalid）；为 T-02 增加 safe/archives 相关写集与 i18n shared，T-04 增加依赖 T-02 以串行 archives/services 写入。T-02 之前无交付，无证据失效。

- plan_revision 3（2026-11-04）：T-11 漏列 NAVIGATOR_PERIODIC 真实装配点 `src/modules/navigator/module.ts`（004 REPORT B），补为 shared（Lead）。

- plan_revision 4（2026-11-04）：T-05 迁移 NotificationChannelId 的真实消费者 `src/shared/automation/metadata.ts`、`src/modules/automations/core/actions/definition.ts` 补入写集（018 REPORT，ticket-invalid）。

- plan_revision 5（2026-11-04）：T-12 是 navigator 首个工作台页面，补入路由注册点 `src/app/contracts/workbench.ts`、`src/app/workbench/compose-workbench.ts`、`src/shell/navigation-state.ts`（shared:Lead）与 `src/modules/navigator/module.test.ts`、UI fixture（017 REPORT）。后续新增页面的票（T-19）沿用同一 shared 所有权并串行。

- plan_revision 6（2026-11-04）：T-16 新增模块须登记启动词典 `src/shared/i18n/huhu.ts`、测试词典 `scripts/module-strings.ts` 与 `scripts/bundle-budget.json` 的新模块条目（dev Skill module-authoring；033 REPORT B1/B2），补为 shared:Lead。

- plan_revision 7（2026-11-05）：T-09 缺产品入口接线（`ui/generic/workbench-page.tsx`、`services/generic/workbench.ts`）与 owner 条件补偿（撤销）命令（054 REPORT）；扩 T-09 写集到归物领域 api/core/belongings/services 以交付撤销命令及测试；T-14 因共享 archives core/services/i18n 写集改为依赖 T-09。

- plan_revision 8（2026-11-05）：T-10 缺年度统计生产者（T-08 只有截止日累计口径）与报告入口（070 REPORT B1/B2）；扩 T-10 写集到 `core/belongings/statistics.ts`、`services/generic/belongings.ts`、`api.ts`、`ui/belongings/BelongingsPage.tsx`，因与 T-14 共享 archives core/services/api 而改为依赖 T-14。

- plan_revision 9（2026-11-05）：T-18 缺 health 修复公共契约与 archives owner 修复命令（072 REPORT）；扩写集到 `health/api.ts`、`archives/api.ts`、`services/generic/{entities,runtime,belongings,repair}.ts` 与 health module/i18n shared，因共享 archives api/services 改为依赖 T-14；T-10 同样共享 `archives/api.ts`、`belongings.ts`，改为依赖 T-18 串行。

- plan_revision 10（2026-11-05）：T-15 缺人物详情默认分派入口（077 REPORT），补入 `src/modules/archives/ui/generic/ArchivePage.tsx` 最小接缝写集。

- plan_revision 11（2026-11-05）：T-19 为 health 首个工作台页面，参照 T-12 预先补入路由注册点 `src/app/contracts/workbench.ts`、`src/app/workbench/compose-workbench.ts`、`src/shell/navigation-state.ts` 及 health `module.ts`/`manifest.ts`/`api.ts`（shared:Lead）与 UI fixture。

- plan_revision 12（2026-11-05）：Lead 全量测试发现 T-05 未更新 `src/shared/automation/metadata.test.ts`（渠道校验合同已变），重新打开 T-05 并补该测试写集。

- plan_revision 13（2026-11-05）：G-FINAL 整体审查 101 F1（默认扫描静默省略未激活/已禁用模块的检查，违反 AC-603），重新打开 T-16 修复，并补 `docs/health.md` 写集。

- plan_revision 14（2026-11-05）：G-FINAL 复审 103 F2（T-15 UI runner fixture 连续点击缺渲染就绪等待，Lead 复跑 3 次均失败），重新打开 T-15 修复 fixture。

- plan_revision 15（2026-11-05）：重新打开 T-04 以真实证明“规模无退化”——`pnpm accept:archives-v2-scale` 在基线即失败于 `first.isComplete`；补 `scripts/accept-archives-v2-scale.ts` 与 `src/modules/archives/core/generic/**` 写集用于诊断与最小修复。

## 8. 维护规则

- Ticket 进度只更新原 Ticket/Evidence，Map 不缓存状态；
- 新增/移除票、依赖或合同覆盖变化时修复本 Map 与 DAG，并递增 plan_revision；
- G-DESIGN 完成后 UI 票绑定 `design_ref` 并重审 DoR，不修改本 Map 的结构；
- 依赖、覆盖或所有权变化后运行 `<Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path>`；
- 内部工件不使用相对 Markdown 链接。

## 9. 总控与恢复

从本 Map 进入 `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/SKILL.md</Path>` 的 plan/run/resume/replan/verify。先运行 `<Path>{roots.workflows}/specdev/common/tools/ticket-control.mjs</Path>` 的 `--map` 只读检查，再按 `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/map-control.md</Path>` 调用 I。全部票 done 后仍需 G-FINAL 整体验收。
