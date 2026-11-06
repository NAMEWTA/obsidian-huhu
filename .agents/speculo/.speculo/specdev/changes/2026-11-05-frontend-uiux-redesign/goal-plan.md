---
schema_version: 8
artifact: goal-plan
change: 2026-11-05-frontend-uiux-redesign
status: ready
modes: ["migration", "high-assurance", "reference-conformance"]
orchestration: lead-directed
lead: "native:/root"
integration_attempt_limit: 3
ticket_execution: auto
ready_for_execution: true
---

# Goal Plan: HUHU 前端彻底重构（纸 / 墨设计系统，全模块）

- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`
- **Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **Tickets Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Ticket 目录：** `<Path>{roots.state}/specdev/changes/{change}/ticket/</Path>`
- **Evidence 目录：** `<Path>{roots.state}/specdev/changes/{change}/evidence/</Path>`

## 1. Outcome and Authority

### Outcome

Spec §1–§7 全部交付，包括：
- HUHU 自有纸/墨 token 与主题（含跟随 Obsidian）；
- 共享组件统一、DayPicker 日期组件族、工作台外壳与右详情布局；
- 依据新设计重构的 UI 技能；
- 12 个页面按 DESIGN §6 替换，其中 Git 差异与历史 A/B 比较改用 `@pierre/diffs`；
- 旧入口、样式与状态清理，文档更新。

AC-001 至 AC-903 均有 Evidence。

### Success and False Completion

成功：每个 AC 有有效证据，G-FINAL 通过；必需宿主项仍待用户验收时只记录实现检查完成，整体不能完成，除非用户明确接受该项 deferred。以下不算完成：只改 token 而页面仍用旧组件；新旧两套 UI 共存或保留开关；包体靠提高阈值通过；用原型截图代替生产 UI runner；票全部 done 但 G-FINAL 没跑。

### Non-goals

Spec OOS-001–006：领域服务与数据格式重写、笔记编辑器配色、新功能与原型演示行为、真实库重置或迁移、原生 helper、发布与 Git 远程操作。

### Authoritative Inputs

| 优先级 | 来源 | 负责内容 | 冲突处理 |
|---|---|---|---|
| 1 | 用户最新明确决定（LOG-001–014） | 产品取舍与批准 | 更新真正拥有该决策的工件 |
| 2 | `<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>` 与 `<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>` | 架构决定与术语 | 返回 `<Path>{roots.workflows}/specdev/specdev-g-grill-with-docs/SKILL.md</Path>` |
| 3 | `<Path>{roots.state}/specdev/changes/{change}/DESIGN.md</Path>`（revision 3，approved，designDigest `49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66`）与 UI-002（ready，digest `c9fda6f653bafe1528841d67f03571a52f2663276fd2659743fd03b66e94005a`） | 视觉、token、组件与页面状态 | 返回 `<Path>{roots.workflows}/specdev/specdev-p-prototype/SKILL.md</Path>` |
| 4 | `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>` | 外部行为、范围与验收 | 下游不得改写 |
| 5 | `<Path>{roots.state}/specdev/changes/{change}/ticket/</Path>` | 单 Ticket 契约 | Goal Plan 只编排 |
| 6 | 当前代码与运行事实（基线 main `37fcede`） | 现状与可行性 | 冲突时触发偏差并返回真正 owner |

## 2. Execution Graph

### DAG and Critical Path

```text
T-01 → T-02 → T-03 ─┐
             T-04 ─┴→ T-15 → T-05 ─┬→ T-08 ─┐
                                  └→ T-10 ─┤
                         T-06, T-07, T-09, T-11, T-12, T-16 ─┴→ T-13 → T-14
```

关键路径：T-01 → T-02 → T-03 → T-15 → T-05 → T-08 → T-13 → T-14。T-08 首页小组件最多，是最长的模块票；T-16 风险最高（新依赖、Worker 与打包约束），建议在 W5 最先开工。

036固定发布包预检后，Map revision 12与T-16补齐既有改动块/冲突/工作树比较的最小领域API及真实Git测试权限、中央适配器所有权、大输入计算取消和双Document实测门。前置依赖与功能范围不变；先做真实库/窗口/构建spike，再按证据采取最小适配。普通恢复保护、读取硬上限与现有预算保持。

### Waves and Ownership

Wave 是候选顺序；auto 调度下可提前推进依赖已满足、写集无冲突的 Ready 票。

| Wave | Ticket | 前置条件 | 项目写路径（节选） | Shared owner | Gate |
|---|---|---|---|---|---|
| W1 | T-01 |  | <Path>src/ui/styles/**</Path>, <Path>src/theme/**</Path>, <Path>src/ui/tailwind/**</Path> | Lead | G-CONTRACT |
| W2 | T-02 | T-01 | <Path>src/ui/components/**</Path>, <Path>src/ui/react/**</Path>, <Path>src/ui/lib/**</Path> | Lead | G-CONTRACT |
| W3 | T-03 | T-02 | <Path>src/ui/components/huhu/date/**</Path> | Lead | G-CONTRACT |
| W3 | T-04 | T-02 | <Path>src/shell/**</Path> | Lead | G-CONTRACT |
| W4 | T-15 | T-01, T-02, T-03, T-04 | <Path>.agents/skills/ui/**</Path> | Lead | G-CONTRACT |
| W5 | T-16 | T-03, T-04, T-15 | <Path>src/modules/versioning/ui/**</Path>, <Path>src/modules/versioning/styles/**</Path>, <Path>scripts/versioning-worker.mjs</Path>, <Path>scripts/diffs-languages.mjs</Path> | Lead | G-MODULES |
| W5 | T-05 | T-03, T-04, T-15 | <Path>src/modules/task/ui/**</Path>, <Path>src/ui/components/huhu/calendar/**</Path>, <Path>src/modules/home/ui/calendar/**</Path> | Lead | G-MODULES |
| W5 | T-06 | T-03, T-04, T-15 | <Path>src/modules/archives/ui/**</Path>, <Path>src/modules/archives/services/generic/workbench.ts</Path>, <Path>src/modules/archives/services/generic/workbench.test.ts</Path> | Lead | G-MODULES |
| W5 | T-07 | T-03, T-04, T-15 | <Path>src/modules/automations/ui/**</Path> | Lead | G-MODULES |
| W5 | T-09 | T-04, T-15 | <Path>src/modules/agent/ui/**</Path> | Lead | G-MODULES |
| W5 | T-10 | T-03, T-04, T-05, T-15 | <Path>src/modules/navigator/ui/**</Path>, <Path>src/modules/comments/ui/**</Path>, <Path>src/app/editor-panel/**</Path> | Lead | G-MODULES |
| W5 | T-11 | T-04, T-15 | <Path>src/modules/notifications/ui/**</Path>, <Path>src/modules/safe/ui/**</Path>, <Path>src/modules/health/ui/**</Path> | Lead | G-MODULES |
| W5 | T-12 | T-01, T-03, T-04, T-15 | <Path>src/app/settings/**</Path>, <Path>src/modules/icons/ui/**</Path> | Lead | G-MODULES |
| W6 | T-08 | T-05 | <Path>src/modules/home/ui/**</Path>, <Path>src/ui/components/huhu/analytics/**</Path> | Lead | G-MODULES |
| W7 | T-13 | T-05–T-12, T-16 | <Path>src/app/contracts/workbench.ts</Path>, <Path>src/app/workbench/**</Path>, <Path>src/shell/navigation-state.ts</Path> | Lead | G-FINAL |
| W8 | T-14 | T-13 | <Path>scripts/ui-review/fixtures/**</Path> | Lead | G-FINAL |

### Ticket Quick Reference

| ID | Ticket | Evidence |
|---|---|---|
| T-01 | `<Path>{roots.state}/specdev/changes/{change}/ticket/01-design-tokens-theme.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-01.md</Path>` |
| T-02 | `<Path>{roots.state}/specdev/changes/{change}/ticket/02-shared-components.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-02.md</Path>` |
| T-03 | `<Path>{roots.state}/specdev/changes/{change}/ticket/03-date-field-family.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-03.md</Path>` |
| T-04 | `<Path>{roots.state}/specdev/changes/{change}/ticket/04-workbench-shell.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-04.md</Path>` |
| T-05 | `<Path>{roots.state}/specdev/changes/{change}/ticket/05-tasks-calendar.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-05.md</Path>` |
| T-06 | `<Path>{roots.state}/specdev/changes/{change}/ticket/06-archives-tree-pages.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-06.md</Path>` |
| T-07 | `<Path>{roots.state}/specdev/changes/{change}/ticket/07-automations-inspector.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-07.md</Path>` |
| T-08 | `<Path>{roots.state}/specdev/changes/{change}/ticket/08-home-dashboard.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-08.md</Path>` |
| T-09 | `<Path>{roots.state}/specdev/changes/{change}/ticket/09-agent-workspace.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-09.md</Path>` |
| T-10 | `<Path>{roots.state}/specdev/changes/{change}/ticket/10-diary-navigator-comments.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-10.md</Path>` |
| T-11 | `<Path>{roots.state}/specdev/changes/{change}/ticket/11-notifications-safe-health.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-11.md</Path>` |
| T-12 | `<Path>{roots.state}/specdev/changes/{change}/ticket/12-settings-appearance-icons.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-12.md</Path>` |
| T-13 | `<Path>{roots.state}/specdev/changes/{change}/ticket/13-legacy-cleanup-docs.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-13.md</Path>` |
| T-15 | `<Path>{roots.state}/specdev/changes/{change}/ticket/15-ui-skill-contract.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-15.md</Path>` |
| T-14 | `<Path>{roots.state}/specdev/changes/{change}/ticket/14-integration-acceptance.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-14.md</Path>` |
| T-16 | `<Path>{roots.state}/specdev/changes/{change}/ticket/16-versioning-git-diffs.md</Path>` | `<Path>{roots.state}/specdev/changes/{change}/evidence/T-16.md</Path>` |

## 3. Gates and Completion Evidence

### Overall Definition of Done

16 张票全部 done 且 Evidence 可回读；G-CONTRACT、G-MODULES、G-FINAL 关闭；AC-001–AC-903 均有证据或经用户批准 deferred；文档描述新行为；README Outcome 经 change-completion 判定。

### Gates

| Gate | 开启条件 | 关闭证据 | 阻塞范围 | Lead/批准人 | 失败恢复 |
|---|---|---|---|---|---|
| G-DESIGN（已关闭） | UI-002 与 DESIGN revision 3 完成 | `prototypes/UI-002/approval.md`（用户 LOG-014 整体确认，绑定 designDigest、prototype digest 与 DESIGN-0002）；F-01–F-15 关闭记录见 evidence/report-final-review.md；UI-001 的 approval.md 只证明旧快照 | 全部 UI 票 | 用户 | DESIGN 再变化时回到 P，UI 票 design_ref 失效 |
| G-CONTRACT | 获得实现授权 | T-01–T-04 自身测试与 runner 新 suite/matrix Evidence；DayPicker 在 React 19 与双 Document 下通过；T-15 新技能完成，Lead 已刷新 T-05–T-14、T-16 的 ui binding 且计划校验通过。全局样式/编译的过渡失败按 Map 记账，不能记为通过 | 全部模块票 | Lead | 合同缺口回到生产者票修订，消费者不自行扩展 |
| G-MODULES | 某模块票 done | 该票 AC 与独立 fixtures 通过；全量编译按 Map 原子集成合同记账，T-13 清零 | T-13 | Lead | 失败票回到 in_progress，不复用失效证据 |
| G-FINAL | T-01–T-12、T-15、T-16 done | T-13 守卫与 docs；T-14 的 AC-901 整体命令全部退出码 0、AC-902 UI runner、AC-903 包体与启动，以及技能漂移核对 | change 完成 | Lead | 记录失败项并回到对应票 |

### Contract and Reference Coverage

| 合同或参考要求 | 覆盖 Ticket | 验证接缝 | Evidence | 状态 |
|---|---|---|---|---|
| Spec AC 全量 | 见 Tickets Map §4 | 见各票验证方法 | 各票 Evidence | planned |
| UI-002 视觉与交互一致（reference-conformance） | 全部 UI 票 + T-14 | Design Conformance + UI runner | UI 票与 T-14 Evidence | planned |
| 无兼容层（migration） | T-05–T-13、T-16 | AC-121 源码守卫；AC-099 无 `@codemirror/merge` | T-13、T-16 Evidence | planned |
| diffs.com 差异技术栈（reference-conformance） | T-16 + T-14 | AC-096–AC-099 + UI runner | T-16、T-14 Evidence | planned |

## 4. Execution and Integration Protocol

**执行入口：** 获得实现授权后，Lead 与实现执行者读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`，再按当前输入实际调用适用项目 Skill。I 负责实现、风险适配双轴审查、验证与 Evidence；计划本身不授予实现或 Git 操作权限。

### Lead Orchestration

| 项目 | 决定 | 事实依据 |
|---|---|---|
| Lead | native:/root | 唯一 SpecDev 状态、Evidence 与交付验收 owner |
| Ticket scheduling | `ticket_execution: auto` | DAG 与写集已串行化（Map §5） |
| Implementation agents | 宿主原生 subagent；gpt-6.1-sol medium 实现，gpt-6.1-sol high 独立审查 | 本轮用户明确指定模型与职责 |
| Integration attempts | 3 | 模板默认 |
| Read-only agents | 不占票据槽 | I 的独立审查要求仍生效 |
| Dispatch | execution-time dynamic | 按事实选择 |

### Change Workspace and Verification

使用 current（`/home/wta/projects/obsidian-huhu`，当前分支 main，基线 `37fcede`），实际执行时写入 README Execution Context。执行时核对实际分支和未提交内容；不引用当前 AGENTS.md 中不存在的分支规则。共享构建（`pnpm run build` 会写 `main.js`/`styles.css`）只由 Lead 串行执行。

### Authorization Matrix

| 动作 | 状态 | 目标与条件 |
|---|---|---|
| Change workspace implementation | authorized | 用户已明确要求完成全部 16 票，按 DAG 实施 |
| Change worktree creation | not-requested | 使用 current |
| Change workspace verification | authorized | 随实现授权进行逐票与整体验证 |
| Implementation commit | not-requested | 用户要求时再执行 |
| Merge / parent update | not-requested | — |
| Push / PR / remote merge | not-authorized | — |
| Branch/worktree cleanup | not-authorized | — |
| Deploy / migration / production actions | not-authorized | 不发版，不重置真实库 |

### Evidence Return

执行者只返回候选事实与快照；Lead 独立核对并写 Evidence、状态与最终验收。Evidence 只入库结论报告，截图和日志留本地。

## 5. Constraints, Risk and Recovery

### Non-negotiable Constraints

AGENTS.md 分层、`api.ts` 边界、`t()` 双语、只做被要求的改动；DESIGN 是唯一视觉权威；不建兼容层（ADR-001）；领域服务与数据格式不变（OOS-001）；NFR-001–003。

### Verification Integrity

禁止：提高包体或样式阈值换绿灯；跳过或删除测试而不说明风险承接；用原型 HTML 代替生产页面的 UI runner；把宿主内表现写成已验证。

### Migration or Release Sequence

DEC-001：每个模块票同票替换并删除旧实现，T-13 以守卫确认没有残留。DEC-002：UI 状态 schema 一次切换，旧字段不读取。DEC-003：外观导入删除 v1 分支（T-12）。无发版步骤。

### Risks, Monitoring and Recovery

| 风险 | 监测 | 恢复 |
|---|---|---|
| 共享组件变化引起大面积回归 | `pnpm exec vitest run --project dom` 全量 + UI runner | 回到 T-02 修订，模块票暂停 |
| DayPicker v10 与 React 19 / 多窗口不兼容 | T-03 双 Document 测试 | 返回 G 重新选型，日期替换暂停 |
| Shiki 语言目录被整体打进单个 CommonJS 产物 | T-16 metafile 与 `check:bundle` | 回到T-16核对主包与两Worker真实图、裁剪白名单外依赖；保留批准的语言/后端与预算，未通过不验收 |
| `@pierre/diffs` 在弹出窗口的 shadow DOM / Worker 异常 | T-16 双 Document 测试 | 保留待验收，回到T-16定位所属Document/Worker并按实际失败作最小适配；不降成静默主窗口路径 |
| 技能与最终代码漂移 | T-14 抽查 T-15 对照表 | 回到 T-15 修订（replan） |
| 树行高变化导致滚动与焦点错位 | tree DOM 测试 + 大数据 fixture | 回到 T-02 同步 estimateSize |
| safe、任务、自动化语义回归 | `pnpm test:safety-regressions` + 模块服务测试 | 回退该票 UI 改动 |
| 包体增长 | `pnpm run check:bundle` 差异 | 回到责任票裁剪未用依赖与重复实现，保持单main.js交付及现有预算后复验 |
| 跟随 Obsidian 下第三方主题对比度不足 | AC-003 回退测试 | 使用安全回退值 |

### Deviation Control

遵循 `<Path>{roots.workflows}/specdev/common/rules/deviation-control.md</Path>`。

## 6. Progress and Decisions

### Current Status

2026-11-05 全面复审完成并定稿：
- DESIGN revision 3 与 UI-002 已由用户整体确认（LOG-014），G-DESIGN 关闭；
- Spec、16 张票、Map 与本计划都是 Ready；
- 已获得全部票实施授权，按 DAG 推进共享合同、模块替换与最终集成；各票实时进度以 Ticket frontmatter 与 Evidence 为准，不在计划中复制状态。

### Pending Decisions and Blockers

- 实施方式已确定：原生 subagent，按用户指定模型分工，复用 current main；不提交、不推送。
- 实施日依赖集成与真实 Obsidian 宿主验收，按各票与 G-FINAL 分别留证，不沿用原型模拟结果。

### Resume Protocol

恢复时读取本 Goal Plan、README 的 Execution Context、当前 Ticket 和原 Evidence 的 Workspace Execution Record，核对工作区、实际 Git 与 writer；从最后可信快照及未决事项继续。

## Assumptions

- 已决定：T-01 先交付 runner suite/matrix 契约；模块票逐项提供 fixtures；T-14 只汇总。不再假定旧 runner 已支持新矩阵。
- 低影响：DayPicker 以 npm 依赖引入并按需加载，实际补丁版在 T-03 锁定。
- 已决定：`@pierre/diffs` 1.6.x 在 T-16 锁定补丁版本；Worker 沿用现有 blob 构建，不内嵌 `worker-portable.js`。

## Execution Policy Source

用户要求新增 1 张 UI 技能票，并指定 Git 差异采用 diffs.com 技术栈（拆出 T-16）；未指定执行人数；`.agents/speculo/config.json` 无执行限制字段。ticket_execution 取默认 auto；integration_attempt_limit 3 为模板默认；工作区见 change README（current）。

## 本轮实施授权（2026-11-05）

用户明确授权 Lead 派遣 gpt-6.1-sol medium 实现全部 16 票、gpt-6.1-sol high 独立审查。覆盖上文历史 not-requested 的实施与验证项；复用 current，按 auto DAG 推进，不提交、推送、发版。共享构建由 Lead 串行负责。

### Map revision 17 的日历交接补充

T-05 交付共享产品 CalendarMonth/TaskComposer 与 DayPicker 薄基座，T-10 Navigator 为其真实调用者，按新依赖待 T-05 完成冻结后再启动；T-08 仍依赖 T-05。Lead 处理 date/Calendar 的最小共享提取和原 T-03 行为回归，不将完整月私有证明当任意周条已实现，不在 T-15 虚构尚未交付的导出。G-CONTRACT 的 T-01–T-04、T-15 门不变。

### G-CONTRACT 实施验收回执（2026-11-06）

Lead已核对T-01–T-04和T-15全部done/Evidence，T-15五源经060/061/062/064/065闭环，11张未执行下游ui绑定刷新。tickets、implement（documentation）、ticket-control最终均退出0/无错误，见evidence/T-15.md。G-CONTRACT关闭，按DAG进入模块替换；Map19的共享DateTime草稿端口由Lead先交付冻结后再给任务/自动化消费。全局旧消费者债、原生产矩阵与真实Obsidian的边界按各原Evidence保留，G-MODULES/G-FINAL尚未关闭。

T-06 收口回执（2026-11-06）：067/074/077实施与078独立双轴闭环，Lead正式66通过/2611输入无漂移；本票done。G-MODULES仍待其它模块，不以单票通过关闭全局门；真实Obsidian及最终整体构建归T14。

T-05/T-12收口回执（2026-11-06）：094/089独立双轴通过，Lead各原66通过；本票均done，证据和输入归属差异见各Evidence。T05产品日历冻结，T08/T10依赖解锁。G-MODULES其余仍待验收，T14继续负责最终同构建/真实宿主门。

### Map revision60：有因果的新输入恢复

原T-14三轮完整保留：第一轮旧输入858 JSONpassed但tool143；第二轮父126/T04 failed5；第三轮加入167观测后T04 failed32，证实Alert实际关闭后被父Sheet迟到outside重开。171真实Radix调用栈与确定性旧red/候选green提供新信息，回T-02共享producer最小修复。旧父轮子进程结束清理前保持runtime原输入；只有修复实际应用、独立审查和新source/main摘要存在后，才启动新checkpoint恢复轮。原三轮次数不抹去，新输入范围integration_attempt_limit仍3，不对同一未变输入继续盲试。保持全量DOM/整体门、完整13组原66和真正宿主责任，不改变批准设计或领域范围，不产生Git/发布授权。

### Map60新checkpoint验证输入

171修复已由172独立双轴通过并实际应用，Root新main SHA08971ebc7f7e7b11f22d8e751ab0b321de9293b6ae0ffd0389306884850f8ffe；styles与此前批准实现相同。新10工程门与4804测试通过，九组同资产真正宿主通过；最终完整矩阵和G-FINAL仍待实际父CLI与13子CLI全部结束后回读，当前不预先关闭。文稿/过程快照不代替该最终退出。

### 最终Gate验收依据

G-CONTRACT：T-01–T-04和T-15共享合同及技能已验收；G-MODULES：T-05–T-12、T-16及原字段/服务边界已验收；G-FINAL：T-13清理与inventory7、T-14新checkpoint完整858真实父/子CLI0、同资产九组真正宿主和10整体门0已通过。实际结果、历史失败和未验平台均见 [最终实施验收](evidence/report-implementation-final.md) 与 [T-14](evidence/T-14.md)。最终Outcome仍由Lead按change-completion核对独立就绪回执与完成校验后原子转换，不代表已提交或已归档。
