---
schema_version: 3
plan_contract_version: 1
plan_revision: 60
requested_deliverables: [{"name": "UI 技能重构票据", "count": 1}]
deliverable_policy: "保留原 14 张；按用户要求新增 1 张 UI 技能票 T-15；按用户的 diffs.com 差异技术栈要求，把版本/Git 从 T-10 拆为 T-16，共 16 张"
artifact: tickets-map
change: 2026-11-05-frontend-uiux-redesign
status: ready
---

# Tickets Map: HUHU 前端彻底重构（纸 / 墨设计系统，全模块）

- **Map：** `<Path>{roots.state}/specdev/changes/{change}/tickets-map.md</Path>`
- **Spec：** `<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>`
- **Ticket 目录：** `<Path>{roots.state}/specdev/changes/{change}/ticket/</Path>`
- **Evidence 目录：** `<Path>{roots.state}/specdev/changes/{change}/evidence/</Path>`
- **Goal Plan：** `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>`

## 复审结论

全面复审已闭环：F-01–F-15 落实到 DESIGN revision 3；Git 差异改用 `@pierre/diffs`（ADR-006），版本/Git 拆为 T-16；T-15 UI 技能票前移到模块页面之前，使后续页面统一遵循新规则。用户已对最终文档整体确认（LOG-014），16 张票的规划均已就绪；实施状态仍从各票 frontmatter 回读，不表示所有票当前都处于 ready 或已经完成。source → 模板 → 票据的责任见 frontend-coverage.md 与 frontend-inventory.json。

## 1. 目标与拆分策略

**执行入口：** 获得实现授权后，Lead 与实现执行者读取并执行 `<Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>`，再按当前输入实际调用适用项目 Skill。I 负责实现、风险适配双轴审查、验证与 Evidence；计划本身不授予实现或 Git 操作权限。

交付 Spec §1–§7，顺序如下：
1. T-01（token 与主题）、T-02（共享组件）、T-03（日期组件族）、T-04（外壳与布局）交付共享合同。
2. T-15 依据批准的设计和这些共享代码重构 UI 技能，作为后续页面的统一规则。
3. 模块页面扇出替换：T-05–T-12，以及 T-16 版本与差异。
4. T-13 清理旧入口与 docs。
5. T-14 整体验收，并核对技能是否漂移。切片原则：共享合同由单一 owner 票交付；每个模块票是一个垂直切片，同票替换并删除旧实现（ADR-001、DEC-001），不按技术层拆空票。

### 总体实施背景

- **设计权威**：已批准的 change DESIGN revision 3（designDigest `49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66`），原型 UI-002（digest `c9fda6f653bafe1528841d67f03571a52f2663276fd2659743fd03b66e94005a`，`prototypes/UI-002/final/index.html` 离线可打开），基线 DESIGN-0002（被 DESIGN §8 替换的规则逐条列出）。所有 UI 票只读遵循，不重选风格。
- **分层**：`app / shell / ui / theme / host / shared / modules`；模块只经 `api.ts` 互访；core/shared 不依赖 React/DOM；React、Radix、DayPicker、`@pierre/diffs`、shiki 不进入启动同步闭包（NFR-001、AC-903、AC-099）。
- **token 合同**：组件只消费 `--hu-*`；模块不得写颜色字面量或私有颜色体系；z 层级与动效时长只用 token（DESIGN §3.6）。
- **组件合同**：每类控件在 `src/ui/components` 只有一个实现；消费者票发现组件缺口时回到 T-02/T-03 修订，不在模块内另造。
- **数据边界**：领域服务、文件事务、数据根与密文格式不变（OOS-001）；UI 布局与筛选偏好使用唯一新 schema（DEC-002）。
- **多窗口**：Portal 来自元素所属 Document（`src/ui/react/portal.ts`），不缓存全局 window/document（NFR-003）。
- **文案**：`t()` 同时给 `en` 与 `zh`。
- **共享文件**：`main.js`、`styles.css`、`package.json`、`pnpm-lock.yaml`、`THIRD-PARTY-NOTICES.md`、各模块 `i18n.ts`、`src/app/workbench/compose-workbench.ts`、`scripts/verify-architecture.mjs`、`scripts/esbuild-options.mjs`、`scripts/bundle-budget.json` 由 Lead 串行处理（各票 shared_path_owners）。
- **T-16 最小接缝**：036 发布包预检补齐既有改动块/冲突/工作树比较所需的精确领域 API、装配和真实 Git 测试权限；不重写事务或数据格式。diffs 的 realm 适配（文件名 `diffs-owner-document`）、中央适配器守卫和 runner 接入均归 Lead，实际双 Document 失败后才修改。大输入 parser 与高亮 Worker 分工、2MiB 读取硬上限与渲染阈值分别见 T-16 补充合同。
- **不做**：Spec OOS-001–006。

### 项目 Skill 读取矩阵

| Applies To | Project Skill | Trigger / Scope | Read Timing | Purpose |
|---|---|---|---|---|
| ALL | `<Path>.agents/skills/dev/SKILL.md</Path>` | 改插件代码、设置、测试、构建 | 实现前 | required：AGENTS.md 规定改插件代码读开发规则 |
| T-01, T-02, T-03, T-04, T-05, T-06, T-07, T-08, T-09, T-10, T-11, T-12, T-13, T-14, T-15, T-16 | `<Path>.agents/skills/ui/SKILL.md</Path>` | 改工作台页面、面板、对话框、样式或 UI 规则 | 实现前 | required：AGENTS.md 规定改界面读界面规则。T-01–T-04 读旧技能，冲突处以已批准 DESIGN 为准；T-15 完成后，T-05–T-14、T-16 读新技能（Lead 刷新绑定） |

## 2. 执行清单

| ID | Ticket | 跨票 Gate/依赖导航 |
|---|---|---|
| T-01 | `<Path>{roots.state}/specdev/changes/{change}/ticket/01-design-tokens-theme.md</Path>` | 依赖 无；G-CONTRACT |
| T-02 | `<Path>{roots.state}/specdev/changes/{change}/ticket/02-shared-components.md</Path>` | 依赖 T-01；G-CONTRACT |
| T-03 | `<Path>{roots.state}/specdev/changes/{change}/ticket/03-date-field-family.md</Path>` | 依赖 T-02；G-CONTRACT |
| T-04 | `<Path>{roots.state}/specdev/changes/{change}/ticket/04-workbench-shell.md</Path>` | 依赖 T-02；G-CONTRACT |
| T-15 | `<Path>{roots.state}/specdev/changes/{change}/ticket/15-ui-skill-contract.md</Path>` | 依赖 T-01, T-02, T-03, T-04；UI 技能唯一写入票；G-CONTRACT |
| T-05 | `<Path>{roots.state}/specdev/changes/{change}/ticket/05-tasks-calendar.md</Path>` | 依赖 T-03, T-04, T-15；G-MODULES |
| T-06 | `<Path>{roots.state}/specdev/changes/{change}/ticket/06-archives-tree-pages.md</Path>` | 依赖 T-03, T-04, T-15；G-MODULES |
| T-07 | `<Path>{roots.state}/specdev/changes/{change}/ticket/07-automations-inspector.md</Path>` | 依赖 T-03, T-04, T-15；G-MODULES |
| T-08 | `<Path>{roots.state}/specdev/changes/{change}/ticket/08-home-dashboard.md</Path>` | 依赖 T-05；G-MODULES |
| T-09 | `<Path>{roots.state}/specdev/changes/{change}/ticket/09-agent-workspace.md</Path>` | 依赖 T-04, T-15；G-MODULES |
| T-10 | `<Path>{roots.state}/specdev/changes/{change}/ticket/10-diary-navigator-comments.md</Path>` | 依赖 T-03, T-04, T-05, T-15；G-MODULES |
| T-11 | `<Path>{roots.state}/specdev/changes/{change}/ticket/11-notifications-safe-health.md</Path>` | 依赖 T-04, T-15；G-MODULES |
| T-12 | `<Path>{roots.state}/specdev/changes/{change}/ticket/12-settings-appearance-icons.md</Path>` | 依赖 T-01, T-03, T-04, T-15；G-MODULES |
| T-16 | `<Path>{roots.state}/specdev/changes/{change}/ticket/16-versioning-git-diffs.md</Path>` | 依赖 T-03, T-04, T-15；G-MODULES |
| T-13 | `<Path>{roots.state}/specdev/changes/{change}/ticket/13-legacy-cleanup-docs.md</Path>` | 依赖 T-05–T-12, T-16；G-FINAL |
| T-14 | `<Path>{roots.state}/specdev/changes/{change}/ticket/14-integration-acceptance.md</Path>` | 依赖 T-13；G-FINAL |

本表只导航。状态、Ready、owner、深度、风险及写集从 Ticket frontmatter 回读，结果从 Evidence 回读。

## 3. 依赖 DAG

```text
T-01 token/主题 ─→ T-02 共享组件 ─┬─→ T-03 日期组件族 ─┐
                                  └─→ T-04 外壳与布局 ─┴─→ T-15 UI 技能（统一实施规则）
T-15 ─→ T-05 任务/日历 ─┬→ T-08 首页看板
                         └→ T-10 日记/导航器/批注
T-15 ─→ T-06 档案 · T-07 自动化 · T-09 智能体
T-15 ─→ T-11 通知/保险箱/体检 · T-12 设置/外观/图标 · T-16 版本/Git 差异（@pierre/diffs）
T-05…T-12 + T-16 ─→ T-13 旧入口清理与 docs ─→ T-14 整体验收（含技能漂移核对）
```

Shared contract 生产者：T-01（token）、T-02（组件）、T-03（日期）、T-04（布局与 DetailPane 宽度规则）、T-15（UI 实施规则）。关键汇合点：T-15、T-13、T-14。T-08 依赖 T-05 有两个原因：首页日历组件与 `home/ui/**` 写集重叠；首页任务小组件要复用 TaskContent。T-16 的模块依赖显式列出 T-03、T-04，是因为 versioning 设置与接入页用到 DateField 与 DetailPane。

## 4. 合同覆盖矩阵

| Contract ID | 覆盖 Ticket | 验证接缝 | 状态 | 说明 |
|---|---|---|---|---|
| AC-001 | T-01 | 见 Spec 验收合同 | planned |  |
| AC-002 | T-01 | 见 Spec 验收合同 | planned |  |
| AC-003 | T-01 | 见 Spec 验收合同 | planned |  |
| AC-004 | T-01 | 见 Spec 验收合同 | planned |  |
| AC-011 | T-02 | 见 Spec 验收合同 | planned |  |
| AC-012 | T-02 | 见 Spec 验收合同 | planned |  |
| AC-013 | T-02 | 见 Spec 验收合同 | planned |  |
| AC-021 | T-03 | 见 Spec 验收合同 | planned |  |
| AC-022 | T-03 | 见 Spec 验收合同 | planned |  |
| AC-023 | T-03, T-05, T-07 | 共享值/时区/校验端口 + 真实领域 DST 适配 | planned | T-03 不冒充域转换通过；T-05/T-07 的 opt-in 严格校验拒绝缺失/重复墙上时间 |
| AC-024 | T-13 | 见 Spec 验收合同 | planned |  |
| AC-031 | T-04 | 见 Spec 验收合同 | planned |  |
| AC-032 | T-04 | 见 Spec 验收合同 | planned |  |
| AC-033 | T-04 | 见 Spec 验收合同 | planned |  |
| AC-041 | T-05 | 见 Spec 验收合同 | planned |  |
| AC-042 | T-05 | 见 Spec 验收合同 | planned |  |
| AC-043 | T-05 | Spec 新增合同与覆盖清单 | planned | |
| AC-051 | T-06 | 见 Spec 验收合同 | planned |  |
| AC-052 | T-06 | 见 Spec 验收合同 | planned |  |
| AC-053 | T-06 | 见 Spec 验收合同 | planned |  |
| AC-061 | T-07 | 见 Spec 验收合同 | planned |  |
| AC-062 | T-07 | 见 Spec 验收合同 | planned |  |
| AC-063 | T-07 | 见 Spec 验收合同 | planned |  |
| AC-071 | T-08 | 见 Spec 验收合同 | planned |  |
| AC-072 | T-08 | Spec 新增合同与覆盖清单 | planned | |
| AC-081 | T-09 | 见 Spec 验收合同 | planned |  |
| AC-082 | T-09 | Spec 新增合同与覆盖清单 | planned | |
| AC-091 | T-10 | 见 Spec 验收合同 | planned |  |
| AC-092 | T-16 | 见 Spec 验收合同 | planned |  |
| AC-093 | T-10 | 见 Spec 验收合同 | planned |  |
| AC-094 | T-16 | Spec 新增合同与覆盖清单 | planned | |
| AC-095 | T-16 | Spec 新增合同与覆盖清单 | planned | |
| AC-096 | T-16 | DOM：差异显示一致性 | planned | DiffView |
| AC-097 | T-16 | DOM：历史 A/B 选择 | planned | CompareEndpoints |
| AC-098 | T-16 | DOM + versioning core/services 回归 | planned | 改动块与冲突 |
| AC-099 | T-16 | check:bundle、check:notices、语言白名单单测、双 Document | planned | T-14 在 AC-903 复核 |
| AC-101 | T-11 | 见 Spec 验收合同 | planned |  |
| AC-102 | T-11 | 见 Spec 验收合同 | planned |  |
| AC-103 | T-11 | 见 Spec 验收合同 | planned |  |
| AC-104 | T-11 | Spec 新增合同与覆盖清单 | planned | |
| AC-111 | T-12 | 见 Spec 验收合同 | planned |  |
| AC-112 | T-12 | 见 Spec 验收合同 | planned |  |
| AC-113 | T-12 | 见 Spec 验收合同 | planned |  |
| AC-114 | T-12 | Spec 新增合同与覆盖清单 | planned | T-04 共同承接 onboarding |
| AC-121 | T-13 | 见 Spec 验收合同 | planned |  |
| AC-122 | T-13 | 见 Spec 验收合同 | planned |  |
| AC-124 | T-15 | 规则映射/场景走查/文档与计划校验 | planned | 仅该票写 UI 技能；模块页面前完成；T-14 核对漂移 |
| AC-125 | T-13 | Spec 新增合同与覆盖清单 | planned | |
| AC-901 | T-14 | 见 Spec 验收合同 | planned |  |
| AC-902 | T-14 | 见 Spec 验收合同 | planned |  |
| AC-903 | T-14 | 见 Spec 验收合同 | planned |  |

AC 的 planned 表示实施责任，不表示生产通过；现有前端已逐文件映射，最终新增文件仍需 T-13 查漏。AC-024（无原生日期输入）由 T-05–T-12、T-16 逐票替换，T-13 以源码守卫最终判定。

## 5. 并行与路径所有权

- 票据调度 `auto` 只决定依赖顺序，不授权启动额外 agent；工作区复用 current（执行时写入 README Execution Context）。
- 写集重叠均由依赖边（含传递依赖）串行化；shared 文件唯一 owner 为 Lead。

| Ticket A | Ticket B | Writable 交集 | 真实依赖 | 处理 |
|---|---|---|---|---|
| T-04 | T-13 | `src/shell/** ∩ src/shell/navigation-state.ts` | 是（传递依赖） | 按依赖串行 |
| T-05 | T-08 | `src/modules/home/ui/calendar/** ∩ src/modules/home/ui/**` | 是（直接依赖） | 按依赖串行 |
| T-10 | T-13 | `src/app/workbench/comments-leaf.ts ∩ src/app/workbench/**` | 是（直接依赖） | 按依赖串行 |
| T-12 | T-13 | `src/app/workbench/settings-categories.ts ∩ src/app/workbench/**` | 是（直接依赖） | 按依赖串行 |
| T-10 | T-16 | 无（`src/app/editor-panel/**` 归 T-10，`src/modules/versioning/**` 归 T-16） | 否 | 无写集冲突；版本标签页由 T-16 提供，经 versioning `api.ts` 挂入 panel-host |
| T-05 | T-10 | 无写集交集；共享 CalendarMonth/TaskComposer API | 是（直接依赖） | 生产者冻结后迁移 Navigator 消费者 |
| T-05、T-06、T-07、T-09、T-10、T-11、T-12、T-16 的其余组合 | — | 无 | 除上列依赖外无 | 无写集冲突；是否并行委派须另有明确授权 |

依据：2026-11-05 对 16 张票 writable_paths 的前缀求交（无依赖的票对之间交集为空）。shared 文件不在 writable，统一由 Lead 处理。

### 原子集成与检查范围

T-01–T-13 与 T-16 是同一个不可发布的前端替换集成单元。每票删除自己替换的旧实现；共享 API 切换时不建立长期适配层。实施者先列出全部受影响消费者与迁移票，原始全量检查保留失败输出；只有清单中尚未迁移消费者的已知错误可记录为“整体检查待集成”，不能写成通过。切片交付必须通过自身 DOM/单元/fixture，不能免除本票错误。T-13 前全部消费者完成并清空台账，T-14 对整个插件执行完整门禁；此之前不能把构建产物作为可发布成果。无法隔离的共享改动与调用方作为同一集成批次串行完成。

T-01 先拥有 runner 参数/matrix 与 shared fixture；T-02–T-12、T-16 拥有各自 `fixtures/frontend-redesign/T-xx/**`；T-14 仅拥有 integration fixture。既有旧 suite 与默认参数继续用于其原有验收，不复用相同 Ticket ID 冒充本次覆盖。矩阵宽度 320/390/600/820/960/1100/1440，纸/墨、密度、字号、coarse、减少动效、长文本与关键嵌套模态按风险组合；全状态至少 1440/390。

## 6. Gate、Wave 与集成点

Gate（G-CONTRACT、G-MODULES、G-FINAL）与 Wave 由 `<Path>{roots.state}/specdev/changes/{change}/goal-plan.md</Path>` §2–§3 负责。

## 7. 横切契约与风险

- 共享合同票（T-01–T-04）与 T-15 完成并有 Evidence、Lead 刷新 ui 绑定后，模块票才能开始；模块票不得修改共享合同，发现缺口回到生产者票修订（plan_revision）。
- 每个模块票同票删除被替换的旧组件、旧样式、旧日期输入和旧测试选择器；删除测试须说明风险由哪个新测试承接。
- safe 锁定与剪贴板、任务重复实例、自动化启停语义、档案修订不得因视觉改版回归（`pnpm test:safety-regressions` 与模块服务测试承接）。
- 包体与启动：DayPicker 与 `@pierre/diffs` 按需加载；Shiki 只打包语言白名单；包体增长在 Evidence 中给出差异与理由，不提高阈值（AC-903、AC-099）。

### UI 技能唯一 owner 与实施期间的优先级

T-15 独占 `.agents/skills/ui/**`，T-13 只维护 docs，T-14 核对技能与最终代码是否漂移。各阶段的规则来源：
- **T-01–T-04 执行期间**：已批准 DESIGN 对明确列出的视觉差异覆盖旧 ui 技能；生命周期、作用域、许可等不冲突的规则继续有效。
- **T-15 完成后**：Lead 审阅技能差异，刷新 T-05–T-14、T-16 的 ui binding sha256，再运行计划校验。之后模块页面一律以新技能和 DESIGN 为准。
- **发现漂移时**：后续共享接口变化、规则冲突，或 T-14 发现漂移，都回到 T-15 修订（replan）。不能关闭 required，也不能修改历史 Evidence 来绕过失效。

## 7.1 修订记录

- plan_revision 1（2026-11-05）：初版，14 张票，绑定 UI-001 / DESIGN revision 1。
- plan_revision 2（2026-11-05）：全面复审回退待修订；新增 T-15（UI 技能），AC-124 归 T-15。
- plan_revision 3（2026-11-05）：落实审查修订；绑定 DESIGN revision 2 / UI-002，补齐源码与 AC、独立 CSS、runner 前置责任和原子集成合同。
- plan_revision 4（2026-11-05）：采用 `@pierre/diffs`（ADR-006，LOG-013），版本/Git 从 T-10 拆为 T-16（AC-092、AC-094–AC-099）；T-15 前移到模块页面之前，T-14 改为依赖 T-13 并核对技能漂移；绑定 DESIGN revision 3；用户整体确认后（LOG-014）全部票 Ready。

## 8. 维护规则

- Ticket 进度只更新原 Ticket/Evidence，Map 不缓存状态；
- 新增/移除票、依赖或合同覆盖变化时修复本 Map 与 DAG，并递增 plan_revision；
- DESIGN revision 或 designDigest 变化时，全部 UI 票的 `design_ref` 失效，回到 P 重新确认后再重审 DoR；
- 依赖、覆盖或所有权变化后运行 `<Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path>`；
- 内部工件不使用相对 Markdown 链接。

## 9. 总控与恢复

从本 Map 进入 `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/SKILL.md</Path>` 的 plan/run/resume/replan/verify。先运行 `<Path>{roots.workflows}/specdev/common/tools/ticket-control.mjs</Path>` 的 `--map` 只读检查，再按 `<Path>{roots.workflows}/specdev/specdev-p-goal-plan/references/map-control.md</Path>` 调用 I。全部票 done 后仍需 G-FINAL 整体验收。

- plan_revision 5（2026-11-05）：实施核实 T-01 升级需要适配器守卫/源码摘要与 pnpm-workspace.yaml 共享构建接缝，补齐 Lead 所有权；DAG、AC 与批准设计不变。

- plan_revision 6（2026-11-05）：按独立审查 S-01 补齐 T-01 的宿主 datetime 类型边界、三个调用点与主题循环入口共享写集；后续模块票顺序不变。

- plan_revision 7（2026-11-05）：预检补齐 T-02 正文已要求的四个新共享组件及 DOM 测试精确写集；不新增行为或依赖，T-01 完成门不变。

- plan_revision 8（2026-11-05）：T-02 预检补齐 Dialog/Sheet/resizable DOM 测试路径和 Lead 所有的共享 UI 词典写集；API 消费者迁移责任与 DAG 不变。

- plan_revision 9（2026-11-05）：T-02 的 panels v4 DOM 测试发现 Vitest 残留 v3 专用入口；补充 Lead 所有的 vitest.config.ts 写集并移除失效别名，不改测试门槛或产品合同。

- plan_revision 10（2026-11-05）：018预检补齐T-03的Lead词典/依赖守卫写集、coarse日历窄宽处置；AC-023拆明共享控件与真实领域DST验证，T-05/T-07追加既有候选解析接缝及相邻测试的最小opt-in严格校验权限。DAG、持久schema与批准三字段值结构不变。

- plan_revision 11（2026-11-05）：023预检补齐T-04的workbench-host/纯状态接缝、实际词典、两宿主探针和相邻测试权限；SidePanel在T-04由worker独占、T-06共享调整由Lead，清除跨阶段owner歧义。DetailPane生产者显式leafWidth由T-02完成。未改DAG或业务数据。

- plan_revision 12（2026-11-05）：036固定1.6.4发布包预检发现T-16只读领域写集不能完成既有AC-097/098，补齐最小history/repo/query/sync/restore/module接缝和真实Git测试；中央owner适配/守卫/runner/架构守卫归Lead。明确官方高亮池不承担双文本解析、每端2MiB读取上限保留、双Document先实测及语言/后端图门。不新增票或行为，不改DAG、设计摘要、持久schema、普通恢复拒绝冲突规则或预算阈值。

- plan_revision 13（2026-11-05）：T-04实际独立页面根/日期Portal边界和导航Sheet区域F6证明需要两个共享薄入口，补充Lead所有use-leaf-metrics与其DOM测试、modal-layer严格区域聚焦export；复用既有DOM/可见性原语，无新provider、持久状态、兼容路径或DAG改变。

- plan_revision 14（2026-11-05）：T-04 实际跨 React 根导航弹层与设备/欢迎界面的卸载证明暴露共享接缝，补齐 Lead 所有六个非模态入口、浮层所属回归及 main/main-events 路径；严格物理 owner 和异步取消合同，不改 DAG、设计、领域数据或预算。

- plan_revision 15（2026-11-05）：T-04 真实大窗口窄叶子证明发现详情 Sheet 的全宽仍绑定视口，补充 Lead 所有 DetailPane.tsx 的精确修订权限，按既有 leafWidth 纠正几何；不新造 Portal、焦点、持久状态或改变批准尺寸。

- plan_revision 16（2026-11-06）：047 真实恢复失败反例补齐 Lead 所有 recovery-start.ts 的原生 Notice 取消边界；与 main 统一处理卸载后的迟到拒绝，保留活动失败回执及已有领域事务，不改 DAG/领域数据/设计。

- plan_revision 17（2026-11-06）：055/056真实调用预检选择 T-05 在 calendar/** 交付薄 DayPicker 基座与产品月历，Lead 最小提取 date/Calendar 消费并保留原选择器回归，补两处实际词典/相邻日期验证共享路径。Navigator 直接消费该生产者，T-10 增加 T-05 依赖；不新增库/票/数据模型，完整月与任意周条可行性分开验收，禁止保留第二旧渲染/键盘引擎。

- plan_revision 18（2026-11-06）：058实际13字段/树调用预检补齐T-06 Lead的PanelTree/SidePanel分页与受控按叶展开测试接缝；纯月由共享日期族MonthField交付，offset/Z秒小数ISO用DateField+共享纯时间/偏移控件和原codec无损组合，不虚构IANA、改数据格式或补日。新增精确日期族/词典路径均Lead单写，DAG及已验收三种日期值合同不变。

- plan_revision 19（2026-11-06）：062独立前向试用确认DateTimeField未暴露无效草稿，补齐T-05 Lead对DateTimeField及相邻DOM测试的精确共享写集；Lead先串行冻结端口再由任务/自动化消费，值形状、引擎、默认fold-earlier与DAG不变。Spec/T-07明确结束日期当前无领域字段，依DESIGN §7不造假控件/调度schema，DesignConformance保留原型差异；批准视觉摘要不变。

- plan_revision 20（2026-11-06）：T-05真实Home快捷创建调用只经TaskCalendarService，补齐Lead对core/calendar类型与services/calendar及相邻测试的最小共享写集。新UI用可选strictTime拒绝gap/fold并返回稳定timeReason，复用原wallTime，不让共享UI跨模块导入core；默认内部earlier、持久schema、DAG和批准设计不变。

- plan_revision 21（2026-11-06）：T-16新增真实Git改动块/锁竞态测试需沿既有native-integration隔离，补Lead的vitest.config.ts共享路径，仅登记git-hunks.test.ts；无新并发/时限策略、DAG或设计变化。

- plan_revision 22（2026-11-06）：T-16已有二进制系统打开交互缺独立desktop端口，补system-files及相邻测试精确写集；仅当前工作树普通文件，经原仓库/路径与symlink边界，拒绝历史blob/缺失伪路径，测试不实际启动程序。无域schema、DAG或视觉摘要变化。

- plan_revision 23（2026-11-06）：069/070实际反例补齐三个Lead接缝：DateField显式草稿重置令同日DateTime受控更新保持同一输入DOM；WorkbenchPageBinding可选canClose仅在用户关闭前询问，隐藏保留草稿、强制清理不阻塞；NOTICE显式统计高亮与parser两类Worker并有相邻测试。既有领域格式、宿主SDK边界、DAG、设计摘要与预算不变。T-06/T-16交回修复新owner，旧候选/REPORT不可变。

- plan_revision 24（2026-11-06）：076真实theme能力预检确认正文custom值存在但应用缺失，补T-12 Lead对custom/settings及相邻测试、runtime DOM/正文CSS的精确共享写集与真实lazy appearance词典；仅正文custom，不恢复旧UI palette。按实际SettingsHandle publish/persist语义保留失败草稿与Retry，不伪称磁盘回滚或扩展事务。设计、DAG、用户内容格式及预算不变。

- plan_revision 25（2026-11-06）：T12动态正文custom不属于静态CSS palette，补Lead对editor-presets测试的精确写集，保留完整静态与动态token验证；真实appSchema fixture图暴露runner缺生产已有的electron external/.md text loader，补中央run与相邻测试shared归属。库/设计/领域格式/DAG与适配器真实图数量门不变。

- plan_revision 26（2026-11-06）：真实T12 MANIFESTS测试图补Lead的obsidian-stub实际缺失公开export，仅链接边界且未实现解析被调用会失败，不冒充宿主；ColorField原生color input用--hu-hit满足已要求44触控，补共享控件精确归属，T12以实际几何验收。不改业务功能/SDK版本/设计/DAG。

- plan_revision 27（2026-11-06）：T12新日期校验文案需在Iconic既有完整词典oracle的HUHU增补区精确加en/zh，补Lead测试写集，不改upstream夹具/断言。T09实际终端默认仍14/1.15，Lead对settings及原测试按批准13/21设置新默认/无效fallback；保留显式用户自定义，不改PTY/格式/预算/设计/DAG。

- plan_revision 28（2026-11-06）：真实字节诊断揭示6项超预算；T16用成熟MIT fflate 0.8.3对内嵌静态grammar/Worker作无损传输压缩、原图许可与实际字节仍统计，不改引擎/同步owner Factory/预算阈值；具体activation接缝先按真实图再精确修订。T06最后native超时保留待验收，Lead单写测试驱动，生产组件问题仍回生产者。不改设计/DAG/用户数据。

- plan_revision 29（2026-11-06）：085真实私有图给出26文件最小预算补丁，Lead统一合入两个保持原字节的Iconic JSON构建压缩与5组纯UI词典实际入口注册；原源/许可、默认对象语义、领域/命令/激活UI键保留，全部文案合并集合严格相同。新增/触及共享入口明确归Lead，不与消费者并写。开发规则同步非UI/module与纯UI/真实入口分工并刷新未完成票dev绑定；既有完成票保留当时调用记录。预算、设计、DAG、用户数据格式不变；Root在实际工作区复跑门禁并独立审查，不以私有绿灯代替正式验收。

- plan_revision 30（2026-11-06）：087已核对9条实际纯UI文案，Lead单写notifications/safe/health的ui/i18n与测试集中注册，worker在自身真实UI入口导入；不增加启动/activation词典负担、不改域字段/持久数据或DAG。

- plan_revision 31（2026-11-06）：实际main与两类Worker的许可生成图发现headless-tree 1.8.0与lru_map 0.4.1发布包未带全文，补Lead的许可证来源bank精确共享写集。仅按npm gitHead固定上游提交逐字节保存原MIT全文、版本来源及摘要；不改引擎、域语义、DAG、设计或预算。

- plan_revision 32（2026-11-06）：实际@pierre/diffs发布元数据使用小写apache-2.0，按SPDX 2.3.1 Annex D.2仅将已允许identifier大小写归一，保留运算符大小写与未知/限制分支拒绝，补Lead的license-texts及相邻正反测试写集；不改变允许许可集合。

- plan_revision 33（2026-11-06）：093独立审查确认T11 InboxPanel现在消费真实provider，T07原automation.test.ts的SSR呈现测试需补宿主provider包装；仅加入该既有测试精确写集，不改领域逻辑或放宽断言。

- plan_revision 34（2026-11-06）：T09真实Chrome启动显示Electron external不能在浏览器执行，补Lead对中央runner与T09专用不可调用Electron边界stub的精确共享写集。仅frontend-redesign/T09别名，任何系统调用仍抛错；不模拟真实宿主或改变T16/其它票分支。

- plan_revision 35（2026-11-06）：T08实际页面需要8条纯UI双语键，Lead单写home/ui/i18n及测试注册，worker在真实入口导入；T09 fixture缺Obsidian toggleClass、T11内存CipherFiles使用同一stage ID导致嵌套backup写覆盖临时stage，Lead接管这两处测试接缝与相邻fixture，保留真实生产服务/断言，不改产品域规则。

- plan_revision 36（2026-11-06）：T09真实focused renderer需要所属leaf与getMostRecentLeaf测试端口，T11菜单为role=menuitem而非button，补Lead的T11 fixture driver精确接管；按真实语义/owner构造与选择，不删除状态、降断言或模拟实际Electron动作。

- plan_revision 37（2026-11-06）：T10开始完整导航器设置迁移，Lead释放085仅注册词典的settings-page.tsx消费者入口写权给T10实现者，实际ui/i18n词典仍Lead单写。保留纯UI入口注册与激活边界；DAG、schema、批准设计不变。

- plan_revision 38（2026-11-06）：T07/T09/T16候选已冻结，Lead接管各票index.mjs的最终真实浏览器驱动，仅依据保留的失败诊断修正owner/键盘/等待等驱动缺口；产品问题回原实现者，保持全部断言和覆盖。

- plan_revision 39（2026-11-06）：107真实raw跨卸载/首页摘要缺口由108最小生产者提案承接；Lead单写DateField受控draftValue与原测试、新AutomationUiPort只读nextScheduled及service/module真实门控与测试。复用原scheduler，不改执行/调度/持久格式。另接管T07/T10最终fixture的缺失真实宿主端口与驱动，产品源仍原owner；不改设计摘要/DAG/预算。

- plan_revision 40（2026-11-06）：实际最终类型/lint仅余T05 Effect显式返回与Navigator宿主idle方法绑定、Health六处无消费者旧hit自定义属性。T05窄重开类型修复且Calendar/TaskContent冻结不变；T10仅加vault-source.ts既有宿主绑定行精确权限。110按无行为清理回收，不改领域或设计，独立审/实际生产门补证后关闭。

- plan_revision 41（2026-11-06）：109真实独立贡献根隐藏仍查询反例，112给出五源最小producer patch；Lead单写EditorPanelHandle与两模块API/懒加载/历史根入口，所有mount显式初始visible，后续setVisible+dispose保同root与最新lazy状态，不保旧function返回兼容。T10自己Host/comments UI原子消费，复用ContainerProviders；不改领域/DAG/批准设计。

- plan_revision 42（2026-11-06）：112真实跨root反例确认传visible之外，NoteHistoryPanel内容请求还需实际消费；Lead补该单源精确共享写集，隐藏先abort并暂停query，恢复复用同root。T13补comments使用文档与dev editor-comments参考的实际gutter视觉/命令入口说明，旧点击提示双语由Lead原键修正；不豁免严格32/44、不改编辑器行高或领域行为。

- plan_revision 52（2026-11-06）：132只读入口预检后的T14最小接缝收敛：中央runner两源和八个既有宿主probe/launcher由Lead单写，integration固定13个独立CLI子进程复用原生产fixture与66矩阵，不造空TSX/第二套runner；T13收口后才实施和冻结同构建验收。宿主脚本只迁当前语义，独立Xvfb/新vault/HOME，无真实账号或用户剪贴板。设计/DAG/领域/预算不变。

- plan_revision 53（2026-11-06）：137最终规则窄审后，T15按原owner重开并由139仅修五技能的已交付Month/产品日历/Pierre/strict-v2及raw/reset事实，无产品/设计变化；Lead刷新本轮T13/T14/T15的ui绑定至ae158ca8完整摘要，已完成模块保留其真实历史调用。138发现T13日期守卫相对Input导入漏检与Analytics分类陈旧，140仅在原三路径修guard/投影，新增DateInput透明包装的精确调用闭合检查；不改生产字段值域/领域/预算/DAG。

- plan_revision 54（2026-11-06）：T14真正fine宿主可信键盘暴露共享焦点outline-style none，T02回原生产者窄修；Lead仅补base/neutralize/tailwind三CSS入口共享权限，146先精确诊断与原有按钮/输入3px光晕区分，不改批准2px+2px或扩大领域。T14正式858尚未执行，原全仓/build/许可与工具预检保留历史；修复后按真实影响刷新产物/覆盖与验收。终端从Home重显卡住仍待确定性栈，不猜根因、不扩大超时。

- plan_revision 55（2026-11-06）：144在预启Debugger/Profiler的独立新vault确定性捕获终端Home→重显时FocusScope.handleFocusOut与RovingFocusGroup.focusFirst同步抢焦循环；T09回原UI生产者147窄诊断修复，先限已有ui/styles写集，共享缺口凭具体调用补精确权限。无Rust/协议/领域/计时变动。T02/T09的旧全仓/矩阵保留历史，T14正式858仍0次，当前仅工具预检13child/0case通过；修复后刷新统一构建/清单与真正宿主门。

- plan_revision 56（2026-11-06）：147真实Debugger闭包确认旧Sheet已detached但FocusScope passive trap未清，持久DetailPane host已移ASIDE并在ref同步恢复到Roving Tabs，造成递归抢焦。仅补DetailPane与相邻DOM测试两个Lead共享生产者路径；其本来归T02，Root在T02修复批次单写，T09消费者无需源码改动。146仅Tailwind outline-2生产修复及T02 fixture，双方私有候选不重叠；不加sleep/超时/新键盘引擎，输入glow和批准样式不变。

- plan_revision 57（2026-11-06）：152最终逐页批准对照确认Task圆形复选、通知禁二级栏及Git/Health同区双primary偏差，分别回T05/T04/T16/T11原owner私有窄修（155–158）；153另证实裸button通用focus低于neutralize，154回T02只修base fallback/回归。Root等当前完整矩阵及图审终结后单写批量应用，当前输入不动。T05仅补HomePM ProjectBoard完成checkbox的精确Lead共享（非设置checkbox不改），T04仅compose及相邻测试的Lead共享；不改领域/批准设计/键盘引擎/阈值。

- plan_revision 58（2026-11-06）：第一轮最终矩阵858行为/几何passed，但152独立设计双轴request-changes三类四位置，连同153裸focus回原票155–158/154批修，不以矩阵绿替代设计符合。159仅补runtime sample.id与T11主题状态capture唯一命名，保已有主图/66断言，借必要新输入轮消除留存覆写；不因此单独重复已过矩阵。160在155同三路径补18视觉/32-44独立hit的必要布局实测与最小精修，旧155包/REPORT保留不应用。Root全部私有候选之后单写，新样式/源码一同冻结再最终完整验收。

- plan_revision 59（2026-11-06）：160真实原源coarse确认HomePM窄pane正文覆盖（非18圆形改动引入），Root授权同一ProjectBoard局部窄栅格行min-content修复，不改dashboard CSS/业务；最终max901移除旧desktop单1fr行并auto rows max，保持既有overflow auto和全部操作。Calendar44共享边0.5量化用DOM quad/内部1px/可信触摸区分，不添加无谓间距。Root实际单写154/160/156/157/158/159六冻结包共14源，保全部before/afterSHA/mode与原staged88，155旧包不应用；新样式后独立批次复验，未把旧858当新输入。

## Map revision60：实际重开缺陷回共享生产者

T-14第三轮有界事件轨迹确认Keepediting原点击正确，子Alert卸载后父Sheet的deferred pointerdown-outside又请求关闭，重开dirty确认。171以真实Radix路径确定性旧red/候选green验证。共享ModalLayer和Dialog/Sheet/Alert内容转发均在T-02既有写集，owner为native:/root/integration_final，T-04只消费并保原完整断言；不改批准设计/布局或领域值。原三轮历史和实际exit保留；新的producer修复输入经独立审查后另有可回读checkpoint/恢复轮，禁止对旧输入继续盲试、删断言或扩超时。

## 最终执行证据导航

Map revision60的执行结果见各票frontmatter/Evidence与 [最终实施验收](evidence/report-implementation-final.md)。本Map的ready/planned描述定稿的计划责任，不替代逐票done或实际Gate结果；未新增兼容分支、Git交付或归档动作。
