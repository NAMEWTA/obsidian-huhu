# 任务回报

Session: 20261104T095541Z
Task: 051-rereview-t08
Status: completed

## 聚焦交接

已完成 T-08 的独立复审，标准轴与规范轴均为 pass，原 B1/B2/B3 均关闭。真实默认表单能够创建 active 归物，生命周期追加保留完整旧历史和合法扩展列，主状态及历史状态均正确显示 en/zh 标签。亲自运行的 16 文件、97 项相关回归、两套类型、lint、架构与 i18n 均通过，未发现新的可操作问题。本次仅写本 REPORT；正式 Evidence、Ticket 状态与共享构建仍由 Lead 验收处理。

## Review

- Strategy: independent；Risk: high（金钱精度、历史保留、CAS/幂等与并发写）；Independence: required。
- Reviewer: Codex / 051-rereview-t08，未参与本票实现或修复，不编造会话/provider ID。
- Review mode: working-tree；base_sha 与 observed_head 均为 `29644dc5833bb209e6282f84fa71441a5a1b99d4`。
- Input-SHA256: `126c491d8bdf990ae9ab1f64c29b37f8e373b3799791a78b346791adbe989819`（TASK 给定）。
- TASK 全部 20 个冻结文件开始经 sha256sum、中途及报告前按原始字节 SHA-256 核对，均匹配，无输入漂移；review-scope 工具确认相同范围与固定点。
- 对照 045 冻结清单，8 个业务路径改变：lifecycle/model/preset/statistics、belongings 服务及服务测试、schema labels、archives 词典；与 047 修复交接一致。bz.md 按新 TASK/LOG-023 不再属于冻结清单，本轮只核对其中两行归物登记的内容，不沿用旧任务的来源冻结阻塞。

完整读取本 TASK、045 审查与 047 修复报告、当前 Ticket、修复实现与测试；依据 Spec §3/AC-301–305/313、DEC-002、ADR-001、Map/Goal、AGENTS.md、dev Skill、reviewer-contracts/risk-review 及已读运行/范围/测试合同审查。沿默认定义/记录模板 → ArchivePage/RecordEditor → EntityCommands → 生命周期/统计 → runtime 原子写入与事件追踪，复核升级和通用编辑保护。

047 新增的 `src/modules/archives/services/generic/belongings.dom.test.tsx` 未列入本 TASK 的 20 路径；作为直接回归上下文读取并随相关套件执行，单独记录 SHA-256 `c13b1ca1a5e976edbd2fb38e9d1b252855a7c1dad1095b03f84221d30ec012c4`，报告前复核未变，不伪称它是 TASK 冻结输入。只读检查该测试不扩大写集。

## Standards Axis

Result: pass

### B1 — 原 major：已关闭

- 位置：`src/modules/archives/core/belongings/preset.ts:9`、`:33`；`src/modules/archives/services/generic/belongings.ts:24`。
- 类型现在指定 `defaultTemplateId=template-belonging-default`；记录模板由同一个 initialBelongingValues 生成 using、空出离日、null 售价和空历史，通过既有 DefinitionCommands 安装。
- 通用页面在编辑器前置校验之前已取得初始值，不需要绕过 validateValues，也未取消服务端状态保护或默认表单只读规则。
- 实际通过的直接回归：`belongings.dom.test.tsx:17` 从真实 ArchivePage 点击新建、填写名称、Save as active，等待提交/导航，公开查询确认一条 using 物品。不是仅直接调用 commands.create。
- 既有用户定义仍不覆盖；新增 `belongings.test.ts:88` 进一步确认用户改过的默认模板在重装时保持原值、没有额外写入。

### B2 — 原 major：已关闭

- 位置：`src/modules/archives/core/belongings/lifecycle.ts:45`–`:46`，以及 model 的可扩展历史类型、statistics 的 `sale ?? null` 读取。
- 已知生命周期字段继续严格验证，随后深拷贝完整旧行；不再用固定列重建历史。缺省的可选 sale 只在计算中按未知处理，不为计算方便补写进旧持久行。
- 实际通过的回归：`belongings.test.ts:156` 经真实定义发布增加 customNote，创建并转卖物品，在同一 Markdown 的旧事件增加 USER-HISTORY-NOTE、删除可选 sale，再修订出离日和返库。断言旧行深相等、历史依次增长到 2/3 行、公开查询仍保留扩展值。
- EntityCommands 的追加、三方合并与最终 process 校验保持；原 B2 的合法扩展列丢失反例在当前回归中不再成立。

### B3 — 原 minor：已关闭

- 位置：`src/modules/archives/core/belongings/preset.ts:17`、`:25`；`src/modules/archives/i18n.ts:20`、`:469`。
- 主状态与历史状态改用已注册的 `archives.preset.belongingStatus`，en='Status'、zh='状态'；原任职状态键的语义保留。
- `belongings.dom.test.tsx:39` 以真实已发布类型/表单渲染 ValueForm，两种语言均找到两个正确命名且禁用的状态控件，并确认没有任职状态文案。i18n 静态门禁也通过。

### 回归与其他风险

- operationId/指纹仍在读阶段与队列内重检，相同请求不追加重复事件，不同负载复用 ID 拒绝；预期哈希过期及 read/process 间竞争写均拒绝覆盖。
- 通用编辑只允许未受保护字段的三方合并；伪造生命周期和升级绕过均拒绝。未知 YAML、自由 Markdown 及合法扩展历史保留测试通过。
- 金额继续用 BigInt 十进制运算、币种分栏、未知与零分离；持有天数按周期累计，月精度不伪造精确天数；逐月回放不借用今天的投影。
- 修复没有增加监听器/计时器、数据根、持久格式或跨模块内部依赖，未夹带 UI 重排。提交事件仍只带 ID/hash，失败不发成功事件。
- 当前未发现需修正的 blocker、major 或 minor finding；此结论限定于本次范围与已验证接缝。

## Specification Axis

Result: pass

| 合同 | 复核证据 |
|---|---|
| AC-301 | pass。定义/表单/默认记录模板经原发布流程安装；真实默认表单创建 active 物品通过，状态双语正确；用户类型与模板均不覆盖。 |
| AC-302 | pass。四态、首次离场默认日、离场态互换保留日期、日期修订、返库追加及 rowId 保留通过；B2 新回归补齐完整旧行/扩展列/缺省可选值保留。 |
| AC-303 | pass。并发重试只有一个事件；同 ID 不同指纹、过期哈希及竞争写拒绝，不覆盖新内容。 |
| AC-304 | pass。精确小数与超出 Number 安全整数的金额、币种分栏、未知售价/0、月精度日期、零天、负净成本及未知购入价的已知回收分栏均有测试。 |
| AC-305 | pass。逐月独立重放；去年转卖/今年返库的样本仍保持去年状态、持有日与净成本，不由今日状态反推。 |
| AC-313 | pass。同一主记录的通用字段三方合并、同字段冲突、竞争修改、升级保护、未知 YAML/正文保留通过；B2 的历史扩展值保留已补齐。 |

范围仍为 archives 中同一物品主记录的预设、领域命令、统一统计和事件，没有新增 belongings.json、估值、汇率或自动记账。归物页、年度报告 UI 与撤销界面属于后续票，不在本票宣称完成。

### 来源、黄金样本与设计边界

按 TASK 只读核对 bz.md 两行：types.ts/shared.ts → model.ts（档案实体、rowId 历史、十进制/币种、专用迁移）；shared.ts/report.ts → statistics.ts（精度、未知、周期持有日、事件回放）。固定 SHA、改编方式、落点、偏离及验证均有记录；对应文件头保留 MIT、版权和完整 SHA。复用 045 已记录的固定来源核对，不声称本轮重新获取上游；本次为本地兼容修复，没有新增外部复制。

原 archives-v2 测试是当前文件的逐字节前缀，未改原 inline snapshot；新增归物样本与 045 相同，047 未修改黄金测试/快照。本次无 -u 运行通过，保留格式版本 2、精确金额字符串、月精度日期、0.00 售价、稳定 rowId/指纹及 encode→decode 全等。

Design Conformance: not-applicable。Ticket ui_change=false、design_ref=null、E2E not-required；DOM 仅验证预设对既有编辑器的功能影响，不以此宣称浏览器视觉或真实 Obsidian 已验收。

## 产物与验证

唯一写入产物为本 REPORT；未修改业务文件、测试、TASK、来源登记、正式 Evidence/Ticket/Map/Goal、依赖或生成物，未执行 Git 写操作、安装、提交、推送或发布。

| 亲自执行的命令/检查 | 退出码 | 实际观察 |
|---|---:|---|
| `sha256sum -c -`（20 路径）及 Python 原始字节复核 | 0 | 冻结输入持续匹配；额外 DOM 测试另记录上下文摘要。 |
| `pnpm exec vitest run src/modules/archives test/golden/archives-v2.test.ts test/golden/archive-relation.test.ts src/app/main-events.dom.test.tsx src/host/obsidian/feedback.dom.test.tsx` | 0 | 16 文件、97 项全部通过，含 B1/B2/B3 与既有统计/并发/恢复/事件/黄金回归。 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json` | 0 | 生产类型通过。 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json` | 0 | 测试类型通过。 |
| `pnpm run lint` | 0 | 全库零警告通过。 |
| `pnpm test:architecture` | 0 | 1318 模块，无分区/宿主/桌面/桶文件/循环违规。 |
| `pnpm test:i18n` | 0 | 33 词典、5350 键，双语/插值/引用通过，另有上述真实双语标签断言。 |
| `validate-specdev.mjs --review-scope --repo /home/wta/projects/obsidian-huhu --mode working-tree --base 29644dc5833bb209e6282f84fa71441a5a1b99d4 --file <逐个传入 TASK 20 路径>` | 0 | 固定点与范围解析成功。 |
| `git diff --check 29644dc5833bb209e6282f84fa71441a5a1b99d4 -- <TASK 20 路径>` | 0 | 已跟踪差异空白检查通过，新增文件另经读取/type/lint/测试。 |
| Python 对照固定 base 的黄金测试前缀、当前来源行和相关摘要 | 0 | 原测试字节保留，两条归物来源登记存在，额外 DOM 测试内容未变。 |

未执行/未验证：禁止的 build/build:css/notices、完整 check:bundle/许可/文档门禁、全仓 pnpm test、规模验收、真实 Obsidian/移动端及后续页面。本复审没有重跑来源抓取或假借旧报告宣称当前产物/包体通过；共享构建与最终集成由 Lead 处理。

## 问题与下一步

无当前复审阻塞或待修复 finding。Lead 可接收 B1/B2/B3 关闭及双轴 pass，继续正式 Evidence/状态与共享集成验收；Status completed 只表示本次审查回报已交付，不替代整票正式完成判定。
