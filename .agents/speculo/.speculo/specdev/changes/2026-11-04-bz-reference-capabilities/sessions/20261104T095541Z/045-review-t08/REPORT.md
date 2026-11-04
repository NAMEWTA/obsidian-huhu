# 任务回报

Session: 20261104T095541Z
Task: 045-review-t08
Status: blocked

## 聚焦交接

已完整读取 TASK 并执行实质审查，确认 2 项 major、1 项 minor：默认归物表单无法直接保存有效新档案，生命周期迁移删除合法自定义历史列，状态标签误用任职状态翻译。15 文件 / 92 项相关回归、两套类型、全库 lint、架构、词典及内存包体检查通过；额外反例仍成立。写报告前复核发现 docs/third-party/bz.md 偏离冻结哈希，按 TASK 必须停止并以 blocked 返回，不能交付一份已完成的冻结输入验收。以下保留漂移前已确认的问题与实际证据，供 Lead 修复及重新冻结；仅写本 REPORT，未修改业务、TASK、正式状态或产物。

## 冻结输入阻塞

TASK 明确要求：“若发现输入中的文件在你审查期间被改动（内容与哈希不符），停止并以 Status: blocked 报告。”

- 文件：docs/third-party/bz.md。
- TASK 冻结 SHA-256：7866b035d9eae297bfa136d3b9e4307494bed6367a3769f184cc1af99dd3e8b1。
- 报告前实际 SHA-256：f123cc59060b1130b5c1aa21656bed6199be92791cd09825effef1364f885d0c。
- 开始及多次中途校验均为 21/21 匹配；首次报告写入前校验因该文件失败，尚未创建 REPORT。随后仅检查漂移范围，确认其余 20 个输入仍匹配；未继续审查新版本来源文件，未修改冻结 TASK 或还原他人改动。
- 当前两轴保留已确认的 request-changes findings，不代表完整冻结审查已经完成；需 Lead 重新冻结来源文件及修复后的候选，再完成复审。

## Review

Strategy: independent
Risk: high
Independence: required
Reviewer: 当前承接 045-review-t08 的 Codex 会话，未参与本票实现或修复；真实派遣身份由 Lead 回读核验，不虚构会话 ID。
Implementers: 038-implement-t08 与共享路径/来源登记集成 Lead；T-02/T-04 既有部分只复核波及。
Mode: working-tree
Base / observed HEAD: 29644dc5833bb209e6282f84fa71441a5a1b99d4，branch dev。
Input-SHA256: c1990bac2ac008fee5526ee7036c89e221c44189bac4f2a0f010e07bfbca5200（TASK 给定；当前完整输入已失配）。

完整读取 TASK、Ticket、038 实现交接，依据 AGENTS.md、dev Skill、reviewer-contracts/risk-review、domain-runtime、适用范围/测试合同，以及当前 Spec §3、AC-301–305/313、DEC-002、ADR-001、CONTEXT、Map/Goal 的领域与后续票边界。已读 AGENTS/dev/risk-review 内容摘要未变，按高风险展开金额精度、历史重放、数据保留、并发、幂等、CAS、恢复与真实调用入口审查。

追踪预设/defaultForms → 定义发布 → 通用创建/编辑与 EntityCommands → 生命周期 parse/transition → runtime.command/原子 process → 同一 Markdown 主记录 → 查询/统计/提交失效事件。读取冻结源码、测试、共享登记差异及黄金样本；额外只读追踪直接依赖 file-changes.ts、ArchivePage/RecordEditor/FieldRenderer、schema fields/definitions 与 test-port，未扩大写集。review-scope 使用指定 base 和 TASK 全部 21 个 --file，解析范围与 HEAD 正确。

额外调用方读取摘要（不冒称 TASK 固定输入）：

- src/modules/archives/services/generic/file-changes.ts：fabb67812c992d733930d392ea16b824d959b43253c50c24e12cd88936797830
- src/modules/archives/ui/generic/RecordEditor.tsx：56de422c4eb1772b09819e04e5556dc972a15c0845c8f352211be46c654dda3e
- src/modules/archives/ui/generic/ArchivePage.tsx：340bf6376100e5906fa56a2912d87f5b34602c7ab69601a17ca67ab3efd19d05

## Standards Axis

Result: request-changes
Reviewer: 当前 TASK 的独立 Codex reviewer
Input-SHA256: c1990bac2ac008fee5526ee7036c89e221c44189bac4f2a0f010e07bfbca5200

以下 findings 来自审查时匹配的业务输入；完整候选结论因上述来源文件漂移保持 blocked。

### B1 — major — 必填状态只读但未初始化，默认表单不能直接新建有效归物档案

- 文件:行：src/modules/archives/core/schema/presets.ts:198；src/modules/archives/core/belongings/preset.ts:8、:16。直接调用方：ArchivePage.tsx:294–307、RecordEditor.tsx:100。
- 问题：status 为 required，默认 full form 又将其设为 readOnly。安装只发布类型和表单，没有默认记录模板；通用新建会话从模板取得默认值，无模板时 draft={}。填完 name 后 status 仍未存储且无法在默认表单修改。RecordEditor 在 commands.create 前先 validateValues，已因缺 status 拒绝，EntityCommands.create 中的 initialBelongingValues 无法执行。
- 亲自复现：Vitest 内存 transform 向现有 archives-generic.dom.test.tsx 追加用例，保留真实组件、provider、memoryArchives 与 ArchivesApplication。安装归物后，按 ArchivePage 现有新建结构构造 draft={name:'Review item'} 的 creating 会话，以实际发布表单挂载 RecordEditor 并点击 Save as active。实际结果：

```text
statusControlsDisabled=true
alerts=["Operation stopped. Your draft is retained. required-field · Status · status", ...]
committed=0, entities=0
```

- 预期提交一次的行为断言失败，退出码 126；9 原用例仅按名称筛选未选。最终反例不是定位器/编译失败或 timeout。先存为 draft、改用其他表单等绕行不能证明默认新建流程可用。
- 建议修正：在表单校验前提供一致的归物初始值，例如经发布流程附带默认记录模板，或在创建会话/校验前共用领域初始化器；保留服务端状态保护。增加安装后经默认表单创建 active 归物的真实 DOM 回归，不能只直调 commands.create。
- 依据：AC-301 的预设/表单可用及通用档案入口兼容。现有创建服务测试跳过编辑器前置校验。

### B2 — major — 追加生命周期时重建旧行，删除合法自定义历史列

- 文件:行：src/modules/archives/core/belongings/lifecycle.ts:45、:67；写入链：services/generic/entities.ts:148–159。
- 问题：parseBelonging 用固定字段重新构造旧 row.values，丢弃该物品实际 schema 中的额外列；transitionValues 复制这份已裁剪 events 再整体写回。用户经定义发布合法增加可选历史列后，一次正常返库会静默删除旧列值，虽然 rowId 保留、提交成功。
- 亲自复现：Node stdin + esbuild write:false，加载真实应用/定义/实体/runtime/test-port。安装归物；publishDefinition 为 events 增加可选 text 列 customNote；创建物品并转卖；在其同一 Markdown 的 sold-one 历史行写入 schema 允许的 customNote='USER-HISTORY-NOTE'，模拟用户编辑合法 Markdown。flushEvents 后 beginEdit 成功，真实 baseValues 包含该值；携当前 baseHash 调用 transition(status='using', date='2026-01-03')：

```text
before.events[0].values.customNote = "USER-HISTORY-NOTE"
after.events[0].values.customNote = undefined
before.rowId = after.rowId = "sold-one"
after.events.length = 2
receipt.committed = true
```

- 探针断言确认丢失，退出码 0 表示反例成立；未 mock 迁移、序列化或写入核心。自定义列由真实发布接受，记录经真实 beginEdit 验证，不是非法 YAML 或未知 schema 反例。
- 建议修正：校验已知生命周期字段时保留完整旧行及合法扩展值，只追加新事件；分开计算投影与持久历史，或深拷贝原始完整历史。补自定义 table 列在返库/离场日期修订后的旧行值保留回归。
- 依据：AC-302 的追加且不抹历史、AC-313 的同一主记录互不覆盖、DEC-002 的用户定义兼容与持久用户数据保留。仅断言 rowId 数量不变不足以证明历史完整。

### B3 — minor — 物品状态显示为“任职状态”

- 文件:行：src/modules/archives/core/belongings/preset.ts:16、:24；对应词典 src/modules/archives/i18n.ts:50、:498。
- 问题：主状态字段和历史状态列复用 archives.preset.status，该键实际为 en='Employment status'、zh='任职状态'。labelKey 优先于 fallback 'Status'，因此物品表单显示错误的任职领域标签。
- 证据：B1 真实 RecordEditor 的 statusText 以 'Employment status *' 开头；en/zh 词典值已核对。词典门禁只证明键/占位符一致，不能排除此语义错配。
- 建议修正：新增并注册归物专用状态标签 en/zh 键，更新两处引用，保持任职关系原语义；增加实际渲染标签断言。
- 依据：预设须正确表达物品四态，用户文案须正确双语化；这是语义错误，不是风格偏好。

唯一 findings：major 2、minor 1、blocker 0；规范轴交叉引用不重复计数。另有冻结输入漂移这一审查执行阻塞。

## Specification Axis

Result: request-changes
Reviewer: 当前 TASK 的独立 Codex reviewer
Input-SHA256: c1990bac2ac008fee5526ee7036c89e221c44189bac4f2a0f010e07bfbca5200

| 合同 | 已执行部分的结论 |
|---|---|
| AC-301 | request-changes：类型、money/date/table、表单发布和用户改定义不覆盖测试通过；B1 使默认表单不能直接创建 active 物品，B3 标签错误。 |
| AC-302 | request-changes：四态、首次离场、离场互换保留日期、日期修订追加、返库保留 rowId 原测试通过；B2 删除合法旧行列值。 |
| AC-303 | pass（已检查路径）：相同命令队列内去重，同 ID 不同指纹拒绝；过期哈希和 read/process 竞争写拒绝，不覆盖新内容。 |
| AC-304 | pass（已检查口径）：BigInt 十进制、币种分栏、未知售价与 0 区分、月精度不伪造天数、零天/负值显式标记、六位日均舍入；未知购入价仍保留已知回收分栏。 |
| AC-305 | pass（已检查样本）：月末逐月重放，去年转卖/今年返库保留去年状态与净成本，不以当前投影反推历史，也不重复累计同周期回收。 |
| AC-313 | request-changes：不同字段三方合并、同字段冲突、竞争写、未知 YAML/自由 Markdown 及升级保护原测试通过；B2 仍违背合法自定义历史数据保留。 |
| AC-001 / 来源 | 漂移前两条归物映射已核对；当前 bz.md 已变，不对新版本给完整结论，待重新冻结。 |

范围仍是 archives 同一实体的预设/领域命令/统计/事件，未发现估值、汇率、自动记账或独立 belongings.json 越界。提交后 ID/hash 事件与失败不发布测试通过；file-changes.ts 为交接声明但 TASK 未冻结的直接依赖，本轮只读追踪并记录摘要。

漂移前来源核对：[types.ts](https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/belongings/types.ts)、[shared.ts](https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/belongings/shared.ts)、[report.ts](https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/belongings/report.ts)。上游有四态、出离日期、售价及共享日均函数，年度 report.ts 调用 report-stats；HUHU 的精确金额、币种与事件回放为本地重写。原冻结登记写明这些偏离，文件头有完整 SHA/MIT/版权，未声称复制其年度 DOM/浮点实现。首次 report.ts 请求 EOF，重取成功后才形成当时结论；漂移后没有继续读取/审查新登记。

## 黄金样本与设计边界

archives-v2 原测试正文仍为基线原文前缀，只追加第二个归物测试，原 inline snapshot 未改。新增外部快照此前不存在，锁定格式版本 2、type-belonging、精确字符串 12345678901234567890.0100、月精度 2026-01、已知 0.00 售价、稳定 rowId/命令指纹 table。encode→decode values 全等，无 -u 黄金测试通过；这是有意新增样本，没有重写旧样本，但未覆盖 B2 扩展列。

Design Conformance: not-applicable 于新增页面/视觉设计。Ticket ui_change=false、design_ref=null、E2E not-required；本轮 DOM 仅检查新增预设对既有编辑器的功能影响，未运行浏览器矩阵或宣称真实 Obsidian 通过。

## 产物与验证

仅写本 REPORT。未修改业务/测试/来源文件、TASK、既有报告、正式 Evidence/Ticket/Map/Goal、node_modules、main.js/styles.css；未安装依赖、执行禁止的 build/build:css/notices 或 Git 写操作、提交、推送、发布。额外探针与配置均 stdin/write:false/内存 transform，没有落仓库测试、配置、patch、过程 JSON 或日志。

| 亲自执行的命令/检查 | 退出码 | 实际结果 |
|---|---:|---|
| 冻结 21 路径原字节 SHA-256，多次 | 起初 0；报告前 1 | 开始及中途 21/21 匹配；最终 bz.md 漂移，停止，Status blocked |
| pnpm exec vitest run src/modules/archives test/golden/archives-v2.test.ts test/golden/archive-relation.test.ts src/app/main-events.dom.test.tsx src/host/obsidian/feedback.dom.test.tsx | 0 | 15 文件 / 92 项通过 |
| B1 内存 Vitest：真实默认表单/RecordEditor 创建 active 归物 | 126 | 1 项预期提交行为失败；status 未存储且只读，required-field，committed=0、entities=0；9 原项仅筛选未选 |
| B2 Node stdin：真实应用/自定义定义/Markdown/transition 探针 | 0 | 确认提交成功而旧 customNote 被删除；0 表示反例确认 |
| pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json | 0 | 生产类型通过 |
| pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json | 0 | 测试类型通过 |
| pnpm run lint | 0 | 全库零警告 |
| 初次定向 eslint 显式传 belongings.test.ts | 126 | 仅默认 ignore 提示触发零警告门，无代码错误；随后标准全库 lint 通过，未改配置 |
| pnpm test:architecture | 0 | 1318 模块，无分区/宿主/桌面/barrel/循环违规 |
| verify-i18n.mjs 内存等价执行（esbuild write:false，以内存 CJS 替代 outfile require，保留全部断言） | 0 | 33 词典 / 5349 键、占位符/引用匹配，不写 scripts/tmp；不排除 B3 语义错误 |
| node scripts/check-bundle.mjs --budget scripts/bundle-budget.json --enforce --json /tmp/huhu-review-045-t08-bundle.json | 0 | 正式内存门禁通过；archives activation 248425 ≤ 337920，startup 134641 ≤ 135168，output 7055332 |
| validate-specdev --review-scope --repo /home/wta/projects/obsidian-huhu --mode working-tree --base 29644dc5833bb209e6282f84fa71441a5a1b99d4 --file（逐个传 TASK 21 路径） | 0 | 固定范围/base/head 解析成功，当时输入匹配 |
| git diff --check 29644dc5833bb209e6282f84fa71441a5a1b99d4 --（TASK 21 路径） | 0 | 所查已跟踪差异无空白错误，新增文件另直接读取/类型/lint/测试 |
| gh Contents API 固定 SHA 读取 types.ts/shared.ts/report.ts | 最初 1；重取 0 | 首次 report.ts 网络 EOF；最终来源读取成功，未执行上游代码 |

B1 探针准备曾因根目录没有直接可导入的 vite 包、随后因误用 'Status *' 定位器而提前退出 126；这些不作为 finding 证据。最终改用内存编译配置及实际字段定位后，已真实挂载/点击保存，并取得 required-field 和预期提交断言失败；没有替换生产实现。

包体通过为本轮实际结果，未沿用前任务 safe 超限。预算文件读取摘要为 5662d6c21e8ca11c4433df7b5624ce5b45b0b2c7e01417df43b99e6d3ae73420，未修改或放宽；不对其他执行者候选作额外验收。本地过程材料：/tmp/huhu-review-045-t08-bundle.json（纯路径，不入库）。

未验证/未完成：完整冻结输入审查因 bz.md 漂移未完成；正式插件构建/最终产物、真实 Obsidian/移动端、规模验收、后续归物/年度报告 UI、完整许可/文档门禁及全仓 pnpm test 未运行。已通过项不代替 B1/B2/B3 修复后验收。

## 问题与下一步

恢复条件：Lead 重新冻结来源登记及修复后的候选，或派发明确的新冻结 TASK；本 reviewer 不修改现有 TASK、不还原他人文件。建议分别修复 B1 初始值/默认表单、B2 完整历史值保留、B3 专用状态标签，保留已有保护与回归，然后按新快照复审。正式 Evidence/Ticket、共享构建及整体验收由 Lead 维护；本轮按 TASK 返回 blocked。
