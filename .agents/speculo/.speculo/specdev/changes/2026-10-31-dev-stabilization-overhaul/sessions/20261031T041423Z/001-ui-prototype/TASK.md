---
schema_version: 2
session: "20261031T041423Z"
task: "001-ui-prototype"
kind: planning
change: 2026-10-31-dev-stabilization-overhaul
---

# 任务简报

## Goal

- **Lead：** `host:claude-code/main-agent`（本 change Goal Plan 的 Lead）。
- **执行者职责：** 作为受派 subagent（模型 Sonnet 5.5，用户指定），执行 SpecDev P 原型 Work 的 UI 分支，**做到“集中确认”之前为止**，为用户评审准备材料。
- **目标：** 为 #37 W6 全插件 UI 统一产出 `UI-001` 设计包，内容包括：
  1. **组件渲染画廊**：以离线可打开的 HTML 渲染基础控件的全部状态，供用户逐个评审。覆盖 Button 与图标按钮；Input、Textarea、日期字段、路径字段；Checkbox、Switch、Radio、Select；Tabs；Dialog、Sheet、Popover、Menu、Tooltip；Table、ScrollArea；状态徽标、空态、骨架屏；设置行与分组。状态包括 default、hover、focus-visible、active、disabled、busy/loading、error、read-only，以及适用时的 selected/checked/indeterminate。
  2. **#37 W6.18 三个真实内容原型**：
     - 任务/自动化密集列表：须含约 420px 窄容器、长英文名、Through 日期完整显示、运行时名称快照通知；
     - 保险箱长表单：长备注自适应、可选字段、生成/复制按钮、危险操作确认；
     - home 小组件集合：须含天气七种状态（未配置、等待启动、加载、有缓存且刷新中、成功、离线/失败、已失效）、Home 区域不整块触发 tooltip 的命名方式、音乐账号后台恢复状态。
  3. **复杂状态验证页**：BOT 流式消息与审批，以及终端状态分层（正常简洁、停止中、停止未确认、清理失败、异常退出；技术详情可展开）。
  4. **候选与推荐**：用户未指定数量，按 Work 缺省给出 **3 个候选**视觉方向，提供 comparison 页面与推荐的 final。三个候选都必须在 #37 §10.1 定下的方向内：圆润、克制、内容优先的桌面工作台。
- **成功定义：**
  - 设计包、comparison、final HTML 都能离线打开；
  - 亮/暗主题、中/英文、长文本、宽屏/420px、200% 缩放、reduced-motion 均可切换或已演示；
  - 已用真实浏览器做过桌面与窄屏检查并保存截图证据；
  - change `DESIGN.md` 草案写好规则；
  - 设计包校验脚本中，批准之前就能跑的检查全部通过。
- **不在本任务内：** 用户批准、首次永久基线发布（A 网关）、设置 ready，以及任何生产 UI 实现。

## Inputs

**必须先读的 Work 入口**（按其中引用逐步读取，不跳步）：
- `.agents/speculo/workflows/specdev/specdev-p-prototype/SKILL.md`（UI 分支）
- 该入口要求的 `.agents/speculo/workflows/specdev/common/rules/domain-runtime.md`、`activation-and-memory.md`、`design-contract.md`、`error-handling.md`
- `references/detect-existing-style.md`、`references/style-selection-protocol.md`、`references/generate-design-package.md`
- `design-library/INDEX.md` 与选中的模板
- 模板资产：`assets/change-design-template.md`、`assets/design-system-template.md`、`assets/design-package.schema.json`

**本 change 的已锁定决定**（只读；目录 `.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/`）：
- `spec.md`：AC-201、AC-202、AC-211、AC-221、AC-231、AC-241、AC-262、AC-351–353
- `ADR.md`：尤其 ADR-001，不保留兼容层，可删除 `--db-*` 旧别名
- `LOG.md`：LOG-007 视觉方向与禁止项；LOG-011 通知名称快照；LOG-013 本流程定位
- `CONTEXT.md`
- `source.md` 的 W6 章节（§10.1–§10.7）与 W5.2–W5.7

**项目设计事实：**
- 永久基线（只读）：`.agents/speculo/.speculo/specdev/design/DESIGN.md`（DESIGN-0001，scope 仅 `huhu.workbench`，规则 DS-001–DS-006）
- `docs/design-system.md`
- `.agents/skills/ui/SKILL.md` 及其 `references/`：design-system、motion-a11y、shell、theme
- `src/ui/styles/`、`src/ui/tailwind/index.css`、`src/theme/`、`src/ui/components/`、`src/ui/components/huhu/`
- 用于确定真实内容与字段：`src/modules/safe/ui/`、`src/modules/automations/ui/`、`src/modules/task/ui/`、`src/modules/home/ui/`、`src/modules/huhubot/ui/`、`src/modules/agent/ui/`

**视觉禁止项（LOG-007）：**
- 不用紫蓝霓虹渐变、发光边线、大面积玻璃模糊、卡片套卡片、巨大欢迎标题、持续跳动动画；
- 不用 `transition: all`，hover 不改变元素尺寸；
- 不把所有控件做成药丸形。

**尺寸起点：**
- 控件 32/36/40px，4px 间距网格；
- 桌面命中区至少 32px、触控至少 44px；
- 正文不小于 13px，关键内容不压到 10–11px；
- 对比度：普通文本 4.5:1，大文本与非文本 3:1。

**颜色：** 绑定 Obsidian 语义变量（DS-002）。原型可以提供预览用的回退色，但必须标注“仅预览”。

**外部材料：**
- 不加载 CDN，不运行第三方演示脚本；
- Galaxy、Radix Themes、Primer 只作比例与交互参考，不复制代码；
- 如在 comparison 中提及参考来源，记录名称与用途，不下载。

## Workspace and Scope

**工作区：** 项目根 `/home/wta/projects/obsidian-huhu`，当前 checkout（分支 `dev`）。审查基线是开始时的 `git rev-parse HEAD`，在 REPORT 中记录。

**允许写入（只限这些）：**
- `.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/DESIGN.md`（change DESIGN 草案，`UI-001` 是本 change 内最小未占用编号）
- `.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/prototypes/UI-001/**`：`design-system.md`、`comparison/`、`final/`、candidates、浏览器证据与截图
- 本任务的 `REPORT.md`（路径见 Return）

**只读：** 其他所有路径，包括全部 `src/`、`styles.css`、`main.js`、永久 `.agents/speculo/.speculo/specdev/design/`、`adr/`、`context/`，本 change 的其他工件，以及本 TASK.md。

**允许的动作：**
- 读取文件；
- 运行 P Work 自带脚本：`materialize-prototype.mjs`，以及 `validate-design-package.mjs` 中批准前可运行的检查；
- 用本机 `/usr/bin/google-chrome` 或 Playwright Chromium 做无头浏览器检查与截图，可以启动临时本地静态服务器，结束后关闭；
- 运行 `node .agents/speculo/workflows/specdev/common/tools/validate-specdev.mjs --stage prototype --prototype-id UI-001 --repo . <change 目录>`，只读诊断，失败如实记录。

**禁止：**
- 修改生产代码或样式；`pnpm build` 等会改动 `main.js`/`styles.css` 的命令；
- 安装依赖；访问网络或 CDN；
- 任何 git 写操作（add/commit/checkout/stash）；
- 写永久设计、ADR、context；调用 A 网关；
- 把设计包或 DESIGN 设为 approved/ready；
- 修改 Ticket、Map、Goal Plan、README 或 Evidence；
- 再次派遣其他 agent。

**停止条件：**
- 需要的输入缺失，或 Work 规则要求用户决定时：停止该分支，在 REPORT 写明问题、推荐答案与依据，其余独立部分继续；
- 校验脚本因“需要批准”而失败属于预期，记录即可，不要绕过；
- 发现需要越权写入时：停止并在 REPORT 说明。

## Acceptance

- `final/` 与 comparison 能离线打开；`materialize-prototype.mjs --check` 通过（或如实记录失败原因）。
- `validate-design-package.mjs` 批准前可执行的检查（如 `--check-preview`）通过。不通过时给出原因，不得通过修改检查规则来变绿。
- 浏览器证据：至少桌面宽度（约 1440px）与窄屏（约 420px）各一组截图，亮、暗主题各一；记录有无空白、遮挡、无意横向溢出。
- change `DESIGN.md` 草案覆盖：字体、间距、圆角、色彩与层级、控件状态、异步反馈、响应式、键盘与 focus、reduced motion、对比度目标，以及每个原型页面 ID 与 Spec AC 的对应。
- 设计包中不得出现机器绝对路径、敏感值或真实用户数据（用虚构数据）。
- **Lead 负责的部分：** 回读与复核、向用户展示、取得批准、A 网关发布、设置 ready、`--stage prototype` 最终验证。执行者的自报不代替验收。

## Return

- **REPORT 位置：** `.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/sessions/20261031T041423Z/001-ui-prototype/REPORT.md`
- **格式：** 按 `.agents/speculo/references/coordination/report-template.md` 一次性写入。必须包含：
  - 实际执行者与模型、基线 SHA；
  - 产出文件清单，使用项目相对路径；
  - 三个候选各一句话的差异与推荐理由；
  - 每个评审页面的入口路径（组件画廊、三个真实内容原型、复杂状态页、comparison、final）；
  - 运行过的命令与退出码、浏览器证据路径；
  - 未验证项；
  - **需要用户评审决定的问题**：编号，附推荐答案；
  - 下一安全动作。
- **交付后：** 回读 REPORT，在最终回复中给出任务身份 `001-ui-prototype`、实际状态（completed / blocked / partial）、REPORT 路径和一句话摘要。
