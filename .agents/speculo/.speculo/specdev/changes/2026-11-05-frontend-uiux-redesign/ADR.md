# ADR: 2026-11-05-frontend-uiux-redesign

## ADR-001: 前端一次性替换，不建兼容层

**Status:** accepted
**Source:** LOG-001
**Supersedes:** none

### Decision
全部前端组件、CSS、布局与 UI 状态合同一次替换为新实现，不保留旧 UI、旧样式回退、旧 UI 状态读取回退或新旧切换开关。领域服务、文件事务、数据根与密文仓库按原 owner 保留。

### Context / Trade-off / Consequences
双轨能分期验收，但两套视觉会长期共存，而且旧选择器会让测试失真。代价是要按 `source/Frontend_Refactor_Plan.md.txt` §9.2 的删除清单逐项验证，并用一次性测试库验收；旧布局与筛选偏好按新默认初始化。

### Verification / Migration
源码中不再有旧 UI 状态 schema 的解码分支；旧主题导入 v1 格式会被明确拒绝。不静默清空真实库，需要重置时另行授权。

## ADR-002: 日期字段统一为 DayPicker v10 + Radix Popover

**Status:** accepted
**Source:** LOG-003
**Supersedes:** none

### Decision
生产环境只有一个日期组件族（DateField / DateRangeField / DateTimeField），由 `@daypicker/react` 10.x 与现有 Popover 组合，替换全部原生 `type="date"` 和 `datetime-local`。原型里离线嵌入的 Air Datepicker 3.6.0 只是视觉与行为规格的载体。

### Context / Trade-off / Consequences
React Aria 和 Air Datepicker 的比较见 `source/Reuse_Research.md.txt` §4.2。选 DayPicker 是因为它与现有 React、Portal、测试体系同栈。代价是要核对 v10 API、中文 locale 和多窗口 Portal。

### Verification / Migration
需验证闰年、非法日期、空值、最小/最大值、反向范围和跨时区本地日，以及弹层所属 Document。

## ADR-003: 自动化详情与列表并列

**Status:** accepted
**Source:** LOG-004
**Supersedes:** none

### Decision
自动化列表常驻；点击实例在右侧打开 360px 详情（宽度不够时改为覆盖 Sheet），启停只用共享 Switch。这取代现有 shell 规则中“自动化详情为独立页面”的约定；完整运行历史和新建自动化仍是独立页面。

### Verification / Migration
详情打开、切换、关闭时，列表 DOM 不卸载，筛选和滚动位置保持；启停失败时恢复服务端真实值。

## ADR-004: HUHU 自有主题为主，跟随 Obsidian 为可选模式

**Status:** accepted
**Source:** LOG-006, LOG-007
**Supersedes:** none（归档时由 A 评估取代永久 DESIGN-0002 DS-002）

### Decision
HUHU 维护自己的语义 token 和两套精调主题（浅色“纸”、深色“墨”），以暖中性为基调，默认强调色为墨青，并默认生效。外观设置提供“跟随 Obsidian”模式，开启后语义 token 改为映射宿主变量。组件在两种模式下都只消费语义 token。

### Context / Trade-off / Consequences
完全跟随宿主会让第三方主题决定 HUHU 的观感，无法保证审美与对比度；HUHU 独占则会与用户的 Obsidian 主题割裂。代价是要维护两套主题矩阵，并在跟随模式下回退到对比度安全值。

### Verification / Migration
浅/深 × 6 种强调色 × 跟随模式下，正文对比度 ≥ 7:1，次级文字 ≥ 4.5:1，控件边界 ≥ 3:1；切换主题后，树、日期、表单、抽屉、toast、弹出窗口同步更新。


## ADR-005: 按真实领域修订全表面设计，采用受支持的稳定依赖组合

**Status:** accepted
**Source:** LOG-012（用户要求直接按最新审查修改）
**Supersedes:** 初版中未对齐现有代码的字段、页面遗漏与版本假设；不撤销纸/墨方向。

### Decision

采用 DESIGN revision 2：任务只映射现有 TaskFields；首页内容收件箱、智能体投递与系统通知独立；版本管理覆盖完整 Git 与独立笔记比较；体检仅现有 owner 修复；正文外观与 HUHU 主题分离。全部源码以 frontend-inventory.json 和 frontend-coverage.md 查漏；设置字段与业务校验以现有领域为准。

技术栈升级以 reuse-decision.md 的官方版本/peer/许可核实为依据，TypeScript 采用 lint 工具支持的 6.0.3，不强装越界的 7.0.2。T-01 前置 runner 新 suite/matrix，T-01–T-13 按 Map 原子集成合同交付，T-15 独占 UI 技能，T-14 最终全量验收。

### Verification / Consequences

本决定接受用户授权下的修订取舍，不伪造新 HTML 的具体批准：UI-001/DESIGN revision 1 作为历史快照保留，UI-002/revision 2 以新摘要单独记录，生产实现尚未开始。模板共享不等于删掉未逐字段绘制的现有功能。


## ADR-006: Git 差异与历史比较统一采用 @pierre/diffs

**Status:** accepted
**Source:** LOG-013（用户：“关于 git 部分的对比，请你学习使用 https://diffs.com/docs 这个 diff 技术栈，展现出更好的 git diff 的对比历史选择效果”）
**Supersedes:** ADR-005 与 reuse-decision 初稿中“差异沿用 CodeMirror 6 merge + 自写 Worker”的部分。

### Decision

versioning 的全部差异阅读（更改、提交详情、A⇄B 比较、笔记历史、revision-review）改用 `@pierre/diffs` 1.6.4（Apache-2.0，npm 2026-11-04 发布；React 19 peer；依赖 diff 9、shiki 3/4）。具体取用：
- 单文件用 `MultiFileDiff`/`FileDiff`；
- 多文件用 `CodeView` 虚拟列表；
- 合并冲突用 `UnresolvedFile`；
- 改动块的暂存和还原用 `diffAcceptRejectHunk` 计算目标内容；
- 展开未改动用 `loadDiffFiles`；
- 选行用 `selectedLines`；
- 主题用 `registerCustomCSSVariableTheme` 与 `--diffs-*` 变量，从 `--hu-*` 映射。

同一张票（T-16）完成以下替换：
- 删除 `@codemirror/merge` 依赖；
- 删除 `diff-editors.ts`、自写的未改动折叠 widget、改动块 gutter 和基于 CM `Chunk` 的 diff-model；
- 改动块恢复的映射改为 Pierre 的 hunk 结构。

宿主编辑器里的冲突标记扩展与批注装饰仍属于 Obsidian CodeMirror 6，不受影响。

### Context / Trade-off

候选比较以 2026-11-05 的 npm registry 为准：

| 候选 | 版本 / 许可 | 评估 |
|---|---|---|
| `@codemirror/merge` | 6.12.3（MIT） | 现状方案。是编辑器级合并视图，词级强调、多文件列表、选行、改动块操作和冲突界面都要自写，这正是现在的 340 行 `diff-editors.ts` 与自写 Worker |
| `@git-diff-view/react` | 0.1.8（MIT） | 能力接近，但仍是 0.x |
| `react-diff-view` | 3.3.3（MIT） | 偏底层，主题与虚拟化需要自建 |
| `diff2html` | 3.4.56（MIT） | 只输出静态 HTML，不支持交互改动块 |
| `react-diff-viewer-continued` | 4.4.0（MIT） | 缺多文件虚拟化与冲突界面 |
| `@pierre/diffs` | 1.6.4（Apache-2.0） | 与 diffs.com 文档对应，上述能力都现成，且有 React 19 入口与 Worker 池；最符合“不重复造轮子” |

代价与约束：
- **Shiki 按需加载**：插件是单个 CommonJS 产物，Shiki 的按需语言加载会被整体打进去。实施时必须把 `shiki/langs` 解析到 HUHU 维护的语言白名单（markdown、yaml、json、css、javascript、typescript、html、shellscript），其余文件按纯文本显示，并固定 `shiki-js` 后端。
- **Worker**：沿用 `scripts/versioning-worker.mjs` 的 blob 构建，而不是直接内嵌 1.3 MB 的 `worker-portable.js`。
- **包体**：只在打开差异时懒加载，不进入启动闭包；versioning 激活预算如需提高，必须在 `scripts/bundle-budget.json` 写明实测与理由。

### Verification / Migration

- T-16 的 DOM 测试覆盖：各差异端点、分栏/堆叠、窄宽自动堆叠、展开未改动、改动块暂存/还原/取消暂存、冲突三种写回、选行、A/B 端点选择与交换、A=B 空态、二进制/超限/缺失。
- 双 Document 测试：shadow DOM 与 Portal 挂在所属窗口，关闭窗口时 Worker 释放。
- 主题矩阵：纸/墨 × 6 强调色下，差异前景与背景对比度达标。
- 门禁：`check:bundle` 中启动闭包不含 shiki/@pierre/diffs；`check:notices` 登记 Apache-2.0 NOTICE。

用户数据、Git 语义与恢复回执格式不变。
