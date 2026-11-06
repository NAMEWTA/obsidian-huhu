---
schema_version: 3
artifact: spec
change: 2026-11-05-frontend-uiux-redesign
status: ready
ready_for_tickets: true
sources:
  - USER-DECISION:2026-11-05 激活指令与交付包（LOG-001 至 LOG-005）
  - USER-DECISION:round 1 主题归属、审美基调、原型深度（LOG-006 至 LOG-008）
  - USER-DECISION:共识确认（LOG-009）；UI-001 历史批准（LOG-010）；审查修订授权（LOG-012）；diffs.com 差异技术栈（LOG-013）；最终文档整体确认（LOG-014）
  - DECISIONS:<Path>{roots.state}/specdev/changes/{change}/ADR.md</Path>
  - CONTEXT:<Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path>
  - DESIGN:<Path>{roots.state}/specdev/changes/{change}/DESIGN.md</Path>
---

# Spec: HUHU 前端彻底重构（纸 / 墨设计系统，全模块）

## 状态（2026-11-05）

审查 F-01–F-15 已落实到 DESIGN revision 3、UI-002、覆盖清单与复用决策；Git 差异改用 `@pierre/diffs`（ADR-006）。用户对最终文档整体确认（LOG-014），UI-002 与 DESIGN revision 3 的批准见 `prototypes/UI-002/approval.md`。本 Spec Ready；生产实现已获授权，实际进度从各 Ticket 与 Evidence 回读。

## 问题与目标

**谁受影响：** 在 Obsidian 中长期使用 HUHU 工作台的用户（任务、档案、日记、自动化、智能体、保险箱、版本、体检、通知、设置），以及维护 HUHU 前端的开发者。

**当前问题（基线 main `37fcede`，0.0.3）：** 颜色经 `src/ui/styles/tokens.css` 直接映射 Obsidian 变量，第三方主题会改变 HUHU 的层级与对比度；各模块局部颜色、字号与间距不一致；自动化详情会替换掉列表（`src/modules/automations/ui/AutomationsPage.tsx`）；21 个文件仍在使用浏览器原生 `type="date"`/`datetime-local`；主任务页没有统一的完成态；档案树的展开状态和大目录完整性不受控。交付包审计见 `source/Frontend_Refactor_Plan.md.txt` §2。

**目标：** 按已批准的 change DESIGN（revision 3，designDigest `49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66`，原型 UI-002 digest `c9fda6f653bafe1528841d67f03571a52f2663276fd2659743fd03b66e94005a`，基线 DESIGN-0002）一次性替换全部前端组件、CSS、布局和 UI 状态合同（ADR-001），领域服务、文件事务、数据根与密文仓库保持原 owner。

**成功标准：** 下列 AC 都有自动化测试、门禁命令或 UI runner 的实际证据；真实 Obsidian 宿主中的表现由用户验收，没有完成时保持“待用户验收”，不写成通过。

## 解决方案与外部行为

### 共同约束

- 分层沿用 `app / shell / ui / theme / host / shared / modules`，模块只经 `api.ts` 互访；React 19、Tailwind 4、shadcn/Radix；面向用户的文案用 `t()`，同时提供 `en` 与 `zh`。
- 视觉、token、组件规格、布局与页面状态**只以 DESIGN.md 为准**；实现不得重新选风格。原型 `prototypes/UI-002/final/` 是视觉与交互的参照，不是生产代码，不得复制进 `src/`。
- 新增 UI 依赖只有两项：`@daypicker/react` 10.x（ADR-002）与 `@pierre/diffs` 1.6.x（ADR-006），实施时锁定补丁版本并登记许可；同票移除 `@codemirror/merge`。其余依赖按 `reuse-decision.md` 升级到当日稳定版。原型中的 Air Datepicker 不进入生产，原型差异视图不内嵌 `@pierre/diffs`。
- 不建兼容层（ADR-001）：没有旧 UI、旧 CSS 回退、旧 UI 状态字段解码、新旧开关或旧路由映射。保留的领域数据合同（任务、档案、inbox、safe 密文、版本检查点）继续按当前格式读写，这不算兼容层。
- 不静默清空 `huhu/`、`.huhu/` 或保险箱；需要重置真实库时另行授权。

### 1. 设计 token 与主题（DESIGN §3，ADR-004）

`tokens.css` 改为定义 `--hu-*` 语义 token：纸/墨两套主题、6 种强调色族、密度（紧凑/舒适）、界面字号（13/14/15）、减少动效。旧工作台 `--nt-*` 与模块私有基础配色删除，正文外观方案不可被连带删除；看板 `--db-*` 改为从 `--hu-*` 派生。外观设置新增“配色来源：HUHU / 跟随 Obsidian”，跟随时按 DESIGN §3.4 映射宿主变量，正文/次级文字/按钮/状态/控件边界等前景背景对比度不足时整对回退到安全值。既有笔记正文外观功能单独保留与重排，不由 HUHU 主题覆盖。

### 2. 共享组件（DESIGN §5）

`src/ui/components` 中每类控件只保留一个实现，变体与尺寸按 DESIGN §5；新增 FormField、DetailPane（桌面为内联 aside，空间不足为 Sheet）、Notice、TaskContent。树行高在细指针下为 32/36，粗指针下至少 44，并同步虚拟器的实际估算。ARIA 按角色序列化：布尔 true/false、checkbox 可 mixed、树叶省略 expanded。

### 3. 日期组件族（DESIGN §5，ADR-002）

DateField / DateRangeField / DateTimeField 基于 DayPicker v10 与现有 Popover。DateField 值为 `YYYY-MM-DD | null`；Range 为 `{from:CalendarDate|null,to:CalendarDate|null}`，清空为两个端点都 `null`，不另设顶层空值；DateTime 为 `{date,time,timeZone} | null`，由既有领域时区逻辑转换，处理 DST 消歧；纯日历日不经 UTC 往返；手输草稿在失焦或回车时严格校验；单值字段清空为 `null`；范围结束早于开始时禁止应用；弹层挂到触发元素所属 Document 的 Portal；Esc 只关弹层。替换全部原生日期输入（基线 21 个文件）。

日期族对既有档案值的精度适配由 T-06 交付：纯月 `YYYY-MM` 使用共享 MonthField，不补日；带 `Z/±HH:mm`、秒/小数的 ISO 时刻用 DateField 日期部分与共享纯时间/偏移输入组合，由原档案 codec 验证并无损拼合。该表示不推断 IANA，不改成 epoch 或分钟精度，不变更原 DateTimeField 三字段/IANA 合同；非法草稿仍阻止保存旧有效值。共享 MonthField 交付前不得虚构现成导出；这是现有字段覆盖与 AC-024 组合规则的补全。

### 4. 工作台外壳（DESIGN §4）

图标轨 52、二级栏 272（220–480，可拖动、双击复位、方向键步进 8）、页头 52、右详情 360（最大 440）。按所属叶子宽度重排：≥960 内联；600–959 二级栏覆盖、详情为 Sheet；<600 图标轨与二级栏合并为左 Sheet、详情全宽。主区宽度减 360 小于 640 时详情改为 Sheet。无模态时 F6 循环区域，模态内不逃逸；Esc 由内向外关闭。没有二级导航的模块不显示空栏。状态仍贡献到 Obsidian 状态栏。

### 5. 模块页面（DESIGN §6）

按 DESIGN §6 的页面与状态替换：首页、任务（列表/看板/日历 + 右详情）、日记、档案（类型 → 记录树、记录编辑、归物、人物、类型设计器）、自动化（列表 + 右详情 + Switch；新建与全部运行记录为独立页面）、智能体（会话标签、终端、分屏、等待回答横幅、会话信息详情）、通知、保险箱、版本（Git 更改/提交历史/A⇄B 比较/笔记历史，差异统一由 `@pierre/diffs` 渲染，§6）、体检、宿主叶子（导航器、批注、版本历史）、设置（外观实时预览、设置搜索、图标、内容与受管文件）。

自动化日期映射以现有 `ScheduleSpec` 为边界：`once.at` 与 `recurring.start` 用 DateTimeField，`create-task.date` 用 DateField。DESIGN §6 的结束日期映射以领域存在对应字段为前提；当前模型没有 `end/until`，现有 RRULE 也不接受 `UNTIL/COUNT`，本轮不增加可编辑的结束日期、伪保存值或隐式调度字段。页面按实际能力说明限制，并在 Design Conformance 中记录原型与生产能力的差异，不宣称已实现原型的结束日期行为。这是 DESIGN §7 不改领域 schema 与能力状态合同的具体化，不改变已批准的视觉规则或摘要。

### 6. Git 差异与历史比较（DESIGN §3.7/§5/§6 versioning，ADR-006）

全部差异阅读用 DiffView（包装 `@pierre/diffs/react`）。行为如下：
- **显示**：分栏/堆叠，叶子宽 < 600 时自动堆叠；换行与词级高亮开关；未改动内容折叠并可按需展开；上一处/下一处改动；点行号选行、Shift 扩展，可复制所选行和位置。
- **更改页**：区分 index → 工作树、HEAD → index、冲突三种端点，按改动块暂存、取消暂存、还原。
- **历史**：提交历史与笔记历史的每一行都能设为比较端点 A 或 B，可交换，可把 B 设为工作树或当前快照；多文件比较用虚拟列表，可逐文件折叠。
- **主题**：经 `--diffs-*` 从 `--hu-*` 映射，语法高亮只打包语言白名单；组件懒加载，Worker 由所属窗口创建并在卸载时释放。

### 7. 清理（交付包 §9.2）

删除：`@codemirror/merge` 差异实现（diff-editors、CM Chunk diff-model、旧 diff Worker 与折叠样式）、各页原生日期分支、自动化“详情替换列表”分支、任务多套完成态样式、页面局部颜色/字号/间距、`iconSettingsTarget` 与旧图标页路由回退、旧 UI 状态字段与设置别名、外观导入的 v1 格式分支；同步更新文档、UI 规则与测试选择器。

## 验收合同

| ID | 前置条件 | 动作或事件 | 可观察结果 | 验证接缝 |
|---|---|---|---|---|
| AC-001 | 默认外观 | 渲染任一工作台页面 | 组件经 --hu-* 或集中定义的 Tailwind/shadcn 语义别名取色；模块无未豁免颜色字面量或私有基础配色（白名单见 DESIGN §3.4）（看板 `--db-*` 只从 `--hu-*` 派生） | `pnpm run lint:css` + `pnpm test:styles` + 新增 token 守卫测试 |
| AC-002 | 纸 / 墨 × 6 种强调色 | 计算主题矩阵对比度 | 正文 ≥7:1，次级与元信息 ≥4.5:1，控件边界 ≥3:1，主按钮文字 ≥4.5:1 | 主题矩阵单测（`src/theme/*.test.ts`） |
| AC-003 | 配色来源 = 跟随 Obsidian | 宿主主题正文对比度不足 | 语义 token 映射宿主变量；不足时回退 HUHU 安全值；笔记编辑器配色不变 | theme runtime DOM 测试 |
| AC-004 | 切换密度、界面字号、减少动效 | 修改外观设置 | 控件高、行高、内边距按 DESIGN §3.6 变化，字阶按 DESIGN 明确档位变化；减少动效时过渡为 0 | theme DOM 测试 + UI runner |
| AC-011 | 任意页面 | 审查按钮、输入、选择、开关、分段、标签页、卡片、表格、树、对话框、Sheet、Toast | 每类控件只有一个实现，尺寸与变体符合 DESIGN §5；模块不另造同类控件 | `pnpm test:architecture` + 组件 DOM 测试 |
| AC-012 | 开关、分段、树、选中行 | 读取 ARIA 与焦点 | 布尔 ARIA 正确输出；checkbox 可 mixed；树叶不带 expanded；树仅一个 Tab 入口；键盘焦点有 2px 强调色外框 | 组件 DOM 测试 |
| AC-013 | 有未保存输入的对话框或 Sheet | Esc、点遮罩或取消 | 先询问是否放弃；关闭后焦点回到触发元素 | dialog DOM 测试 |
| AC-021 | DateField | 输入 `2026-02-31`、`2026-11-20`、清空 | 非法值保留为草稿并报错（错误经 `aria-describedby` 关联），不滚到下月；合法值提交为 `YYYY-MM-DD`；清空为 `null`；必填为空时报错 | date-value 纯函数测试 + DateField DOM 测试 |
| AC-022 | DateRangeField | 结束早于开始；取消 | “应用”禁用并显示错误；取消不改变已提交范围；不交换用户手输的两个值 | DOM 测试 |
| AC-023 | Asia/Shanghai、UTC、含夏令时时区；弹出窗口 | 选择日期 / 日期时间 | 日历日不跨日；DateTimeField 保留领域时区语义；当前三字段值不能表达消歧，缺失/重复墙上时间均拒绝提交；弹层挂到所属 Document，窗口关闭后释放 | T-03 共享值/必需校验端口与双 Document 测试；T-05/T-07 真实领域 DST 转换回归 |
| AC-024 | 重构完成 | 检索源码 | `src/` 中没有 `type="date"`、`type="datetime-local"`；所有日期字段经 DateField 族，允许现有纯时间输入组合 | 源码守卫测试 |
| AC-031 | 宽叶子 | 拖动、双击、方向键调整二级栏 | 宽度限制在 220–480；双击复位 272；方向键步进 8；松手后保存 | shell DOM 测试 |
| AC-032 | 叶子宽度 1440 / 1100 / 820 / 390 | 打开带右详情的页面 | 按 Spec §4 规则内联或改为 Sheet；窄宽二级栏为左 Sheet；没有页面级横向溢出 | shell layout 单测 + UI runner |
| AC-033 | 任意页面 | F6；Esc | 无模态时 F6 在当前叶子区域循环；模态内限制在顶层；Esc 依次关闭日期弹层、对话框、导航 Sheet、详情，焦点回到来源 | shell DOM 测试 |
| AC-041 | 任务列表、看板、日历、首页小组件 | 完成 / 重新打开任务 | 标题与说明划线并降为次级色，日期与关联资料不划线；四处使用同一 TaskContent；重新打开立即恢复 | task DOM 测试 |
| AC-042 | “未完成”筛选；写入失败；连续点击 | 完成任务 | 提交中显示保存态并禁止重复；成功后保留约 1.4 秒再按筛选移除，提供撤销；失败恢复原状态并可重试；重复任务由任务域生成下一次实例 | task DOM 测试 + 现有 task 服务测试 |
| AC-043 | 当前 TaskFields | 切换列表/看板/日历并编辑 | 不产生 project/priority/tags 或 doing 状态；planDate/timezone/relations 与现有服务一致，晚到回执不覆盖新草稿 | T-05 DOM/领域测试 |
| AC-051 | 档案二级栏 | 方向键、Home/End、首字、点箭头、点名称、搜索、清空 | 展开与选中分离；搜索保留并展开祖先、高亮命中，清空后恢复手动展开状态；展开状态受控且有上限 | tree DOM 测试 + archives workbench 测试 |
| AC-052 | 编辑中的记录 | 修改字段后离开 | 出现未保存提示条且焦点不丢；离开前确认；保存产生新修订 | archives DOM 测试 |
| AC-053 | 某类型超过 500 条记录 | 浏览目录 | 显示已加载数与总数，可继续加载，不静默截断；虚拟化只影响渲染行数 | archives workbench 服务测试 |
| AC-061 | 自动化列表已滚动并筛选 | 打开、切换、关闭详情；运行 | 列表 DOM 不卸载，滚动与筛选保持；运行详情在右侧显示；关闭后焦点回到来源行 | automations DOM 测试 |
| AC-062 | 启停写入成功 / 失败 / 晚到 | 点击或按空格切换 Switch | 提交中 `aria-busy` 并禁止重复；失败时列表与详情恢复服务端真实值并提示；行点击不被触发；启停不取消已开始的运行 | automations DOM 测试 |
| AC-063 | 深链指向不存在的定义 | 打开 | 先建立列表，详情显示缺失状态 | automations DOM 测试 |
| AC-071 | 首页 | 进入编辑布局、增删排序小组件、在空看板操作 | 行为符合 UX-HOME-1/2；继续沿用 react-grid-layout，隐藏页暂停昂贵刷新 | home DOM 测试 |
| AC-072 | 首页完整 registry | 逐项添加、配置、编辑、移除 | 18 widgets + 14 sections 无遗漏；原字段、允许尺寸/多实例/依赖缺失/媒体与查询失败保留 | T-08 registry fixture 清单 |
| AC-081 | 智能体会话等待回答 | 渲染工作区 | 横幅、标签状态点、图标轨角标三处提示；默认动作定位对应终端，不发送臆造的允许/拒绝协议；渲染不启动进程 | agent DOM 测试 |
| AC-082 | 智能体工具入口 | 打开收件箱/账号/技能/命令/备份/空间 | 入口正确；投递明确收件人及回执，失败可重试；不跳到通知或外观冒充功能 | T-09 fixtures |
| AC-091 | 日记 | 翻天、写作、空白日期 | 书页阅读与写作符合 UX-DIARY-1；写入一日一文件，经现有周期笔记合同 | navigator DOM 测试 |
| AC-092 | 版本页 | 恢复检查点 | 先确认并写明后果；由领域保存检查点/回执；仅在源叶/正文/版本指纹仍一致时可撤销，有新编辑时提供比较/恢复副本 | versioning DOM 测试 |
| AC-093 | 宿主叶子 | 导航器、批注、版本标签页 | 使用相同 token；批注不改动正文 | comments/navigator DOM 测试 |
| AC-094 | Git 可用与不可用/未初始化 | 接入、暂存、提交、拉取/推送、历史/比较 | 全功能符合 DESIGN versioning；每种 diff 端点正确；错误/取消/冲突独立；只读浏览不改 index | T-16 DOM 与 Git 服务回归 |
| AC-095 | 笔记历史与比较 | 源叶变化、多窗口、恢复/撤销 | 固定当前快照；来源失效阻止覆盖；恢复与撤销依领域回执及重新核对 | T-16 宿主回归 |
| AC-096 | 更改页、提交详情、A⇄B 比较、笔记历史、revision-review 任一差异入口 | 切换分栏/堆叠、换行、词级高亮；展开未改动；上一处/下一处改动；点行号与 Shift 选行 | 所有入口行为一致，偏好跨入口保持；叶子宽 < 600 自动堆叠且分栏不可选；选行显示范围并可复制所选行/位置；只读浏览不改 index、不切分支；二进制、超过渲染上限、缺失端点分别显示原因 | T-16 DOM 测试 |
| AC-097 | 提交历史与笔记历史 | 在任一行设 A 或 B；交换；B 设为工作树/当前快照；A=B；合并提交切换父提交 | 端点胶囊、文件列表与 +/− 汇总立即更新，焦点留在按下的按钮；A=B 显示无差异空态；合并提交按所选父提交比较 | T-16 DOM 测试 |
| AC-098 | 更改页含未暂存、已暂存与冲突文件；写入成功/失败 | 暂存/取消暂存/还原某个改动块；冲突选择采用当前/采用传入/两者都保留 | 只作用于该改动块；还原先确认并建恢复检查点，可撤销；冲突写回前确认；写入经 versioning 领域并返回回执，失败时界面恢复原状并可重试 | T-16 DOM 测试 + versioning core/services 回归 |
| AC-099 | 构建产物与运行时 | 检查依赖、启动闭包、产物与窗口生命周期 | `src/` 无 `@codemirror/merge` 引用；`@pierre/diffs` 与 shiki 不进入启动闭包；产物只含语言白名单，不含 wasm/highlights 后端；Worker 由所属窗口创建并在卸载/关窗时终止；差异前景/背景在纸/墨 × 6 强调色下达对比度合同；NOTICE 已登记 | `pnpm run check:bundle` + `pnpm run check:notices` + `node --test scripts/diffs-languages.test.mjs` + 双 Document DOM 测试 |
| AC-101 | 通知 | 打开、全部已读、标为未读 | 已读状态与图标轨角标、状态栏同步 | notifications DOM 测试 |
| AC-102 | 保险箱已解锁 | 快速取密（键盘选择、回车、⇧回车）、锁定 | 复制密码或用户名，30 秒后仅清除仍为本次复制值的剪贴板内容；锁定后关闭选择器并清除明文；格式与密码学不变 | safe DOM 测试 + `pnpm test:safety-regressions` |
| AC-103 | 体检 | 扫描、取消、部分失败 | 取消后保留已完成的结果；部分失败写明失败项；修复前预览计划 | health DOM 测试 |
| AC-104 | health/safe 能力 | 扫描/修复/初始化/恢复 | 只用真实 HealthScope/RepairKind；密码失败不臆造次数，锁定不解密；移动不可用不启动桌面能力 | T-11 DOM/安全回归 |
| AC-111 | 外观设置 | 改来源、明暗、强调色、字号、字体、密度 | 立即作用于整个工作台，包括浮层、日期弹层和弹出窗口 | settings DOM 测试 + UI runner |
| AC-112 | 任意设置分组；窄宽 | 渲染 | 行为“标签 + 说明 \| 控件”，窄宽时上下排列；设置搜索高亮命中 | settings DOM 测试 |
| AC-113 | 外观导入 | 导入当前格式 / v1 格式 | 当前格式往返一致；v1 格式明确拒绝，不自动转换 | appearance 单测 |
| AC-114 | 全部设置与 onboarding | 搜索、跳转、首次配置 | 字段来源实际 schema，无通用假设置；保留正文外观；禁用模块/设备能力处理清晰 | T-12 设置索引 + T-04 首次启用 |
| AC-121 | 重构完成 | 检索源码与测试 | 不存在 `iconSettingsTarget`、旧 UI 状态解码分支、旧设置别名、旧样式选择器、失效测试探针；只有一条 UI 路径 | 源码守卫测试 + `pnpm test:architecture` |
| AC-122 | 重构完成 | 阅读文档 | `docs/design-system.md`、`docs/workbench.md` 描述新行为（含自动化右详情），链接有效；UI 技能源另由 AC-124 验收 | `pnpm test:docs` |
| AC-124 | 共享合同 T-01–T-04 已验收，模块页面（T-05–T-12、T-16）尚未开工 | 按批准的 DESIGN revision 3 与已实现的 token/组件/日期/外壳代码重构 `.agents/skills/ui/` | SKILL.md 与四份 references 一致且可执行；配色、组件、交互、布局、间距、字体、像素与页面组合都有唯一事实来源和验证接缝；下游 T-05–T-14、T-16 共 11 张票的 ui 绑定已刷新；T-14 核对技能与最终代码无漂移 | T-15 规则对照表与走查 + `pnpm test:docs` + 计划校验；T-14 漂移抽查 |
| AC-125 | 最终源码 | 与 frontend-inventory.json 对照 | 每个前端源文件/registry kind/settings group/contribution 有迁移/复用/删除与验证回执；新增源文件已归属 | T-13 覆盖报告 |
| AC-901 | 全部票完成 | 运行整体门禁 | `pnpm run build`、`lint`、`lint:css`、`test`、`test:styles`、`test:architecture`、`check:bundle`、`test:i18n`、`test:docs`、`check:notices` 全部退出码 0 | 命令与退出码 |
| AC-902 | 全部票完成 | 按 redesign 矩阵运行 UI runner | frontend-coverage.md 全表面及其 fixtures 均能渲染，无横向溢出，键盘可达，对比度与原型差异在 Evidence 中逐页记录 | `node scripts/ui-review/run.mjs --suite frontend-redesign --ticket T-14 --matrix redesign --out /tmp/huhu-frontend-redesign/T-14`（T-01 已交付 suite/matrix，最终各票 fixture 由 T-14 汇总） |
| AC-903 | 插件启用但未打开业务页 | 测量启动闭包与包体 | React、Radix、DayPicker、`@pierre/diffs`、shiki 不进入启动同步闭包；包体增长有差异与理由，不提高阈值 | `pnpm test:architecture` + `pnpm run check:bundle` |

## 范围

- **IN：** 上文 §1–§7；DESIGN §6/§7.1 与 frontend-coverage.md 的全部表面、独立 CSS、首页 32 项目录、实际模块设置、首次启用与宿主贡献；逐文件范围见 frontend-inventory.json。
- **REUSE：** `src/ui/components` 既有 Radix/shadcn 原语、Headless Tree 与 TanStack Virtual、react-grid-layout、react-resizable-panels、dnd-kit、cmdk、sonner、`src/ui/react/portal.ts` 所属窗口 Portal、`shared/feedback` 与 `host/obsidian/feedback.ts`、各模块现有 `api.ts` 服务与命令、`scripts/ui-review/run.mjs`、`scripts/obsidian-acceptance/*`。
- **OUT：**
  - OOS-001：领域服务、数据 schema、文件事务、任务重复规则、自动化调度、PTY、safe 密码学与格式、Git 恢复的重写（只允许为目标交互补充最小 API）。
  - OOS-002：笔记正文编辑器（CodeMirror）渲染内核重写；既有正文外观设置仍需保留、重排与验证边界。
  - OOS-003：新增模块或新业务功能；原型中的演示数据与模拟行为（终端、运行、复制、加密）。
  - OOS-004：真实用户库的数据重置或迁移脚本。
  - OOS-005：原生 helper（`native/pty-server`）。
  - OOS-006：发布、版本号、提交与推送（未授权）。

## 验证策略

| 接缝 | 层级 | 覆盖合同 | 现有先例或命令 | Evidence 类型 |
|---|---|---|---|---|
| theme/token 单测与守卫 | 单元 | AC-001–004 | `src/theme/*.test.ts`、`pnpm test:styles`、`pnpm run lint:css` | 命令与退出码 |
| 组件 DOM 测试 | DOM | AC-011–013、AC-021–023 | `src/ui/components/*.dom.test.tsx`、`pnpm exec vitest run --project dom` | 命令与退出码 |
| date-value 纯函数与时区参数化 | 单元 | AC-021、AC-023 | 新建，就近 `*.test.ts` | 命令与退出码 |
| shell DOM / layout 单测 | DOM/单元 | AC-031–033 | `src/shell/ShellRoot.dom.test.tsx`、`layout.test.ts` | 命令与退出码 |
| 模块 DOM 与服务测试 | DOM/单元 | AC-041–114 |
| 差异与打包 | DOM/单元/门禁 | AC-096–099 | `src/modules/versioning/**/*.dom.test.tsx`、`scripts/diffs-languages.test.mjs`、`pnpm run check:bundle` | 命令与退出码 | 各模块 `*.dom.test.tsx`、`pnpm test:safety-regressions` | 命令与退出码 |
| 源码守卫测试 | 单元 | AC-024、AC-121 | 新建（参照 `pnpm test:architecture` 守卫） | 命令与退出码 |
| 门禁 | 门禁 | AC-122、AC-901、AC-903 | `package.json` scripts | 命令与退出码 |
| UI runner | 组件 E2E | AC-004、AC-032、AC-111、AC-902 | `node scripts/ui-review/run.mjs --suite frontend-redesign --ticket T-14 --matrix redesign --out /tmp/huhu-frontend-redesign/T-14`（T-01 已交付 suite/matrix，最终各票 fixture 由 T-14 汇总） | 结论报告；截图留本地 |

宿主内真机（多窗口、触屏、真实第三方主题下的“跟随 Obsidian”）由用户验收；agent 环境具备时可以运行 `scripts/obsidian-acceptance/{workbench-probe,overflow-audit,theme-matrix}.mjs`，否则标为“待用户验收”，不把跳过或退出码 0 写成通过。

## 约束与风险

- **NFR-001 启动：** 新组件、DayPicker 与 `@pierre/diffs`/shiki 不进入插件启动同步闭包；验证 AC-903、AC-099。
- **NFR-002 无障碍：** 对比度按 AC-002；命中区桌面 ≥32、触控 ≥44；中文不小于 12px；200% 缩放（CSS 320px）无页面级横向溢出；减少动效时过渡为 0。
- **NFR-003 多窗口：** 所有 Portal 来自元素所属 Document，不在模块顶层缓存 window/document。
- **DEC-001 一次替换：** 每个替换票同票删除失效调用、样式与测试选择器（ADR-001）；不留“下一期再清理”。
- **DEC-002 UI 状态 schema：** 新布局与筛选偏好使用唯一新 schema，旧字段不读取，按新默认初始化；业务数据格式不变。
- **DEC-003 外观导入：** 只接受当前导出格式，删除 v1 读取分支（AC-113）。
- **风险：** 改动面广（约 8 万行 UI）——每票按模块隔离写集、共享文件由 Lead 串行处理；DayPicker v10 与 React 19、多窗口的兼容（T-03 先验证）；虚拟树行高变化导致滚动错位（T-02 同步 estimateSize）；跟随 Obsidian 下第三方主题对比度不足（AC-003 回退）；Shiki 在单个 CommonJS 产物中整体打包语言目录（T-16 先交付语言白名单插件，AC-099）。

产品与设计取舍已由用户确认（LOG-012–LOG-014）。生产集成与真实 Obsidian 宿主验收属于实施阶段，按各票与 G-FINAL 留证，不以原型浏览器结果代替。

### 未决问题

无。

## 实施验收定位

本规格的Ready表示需求合同已定稿，执行状态由各Ticket与README Outcome持有。当前逐AC验证、同构建858及真正宿主结果见 [最终实施验收](evidence/report-implementation-final.md) 和 [T-14](evidence/T-14.md)；原型保持批准依据，未替代生产验收。
