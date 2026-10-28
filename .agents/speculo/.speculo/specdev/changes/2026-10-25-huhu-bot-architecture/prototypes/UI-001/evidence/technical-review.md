# UI-001 浏览器技术记录

结果：**实测完成，Ready 仍未通过**。检查时间为 2026-10-25 04:39 UTC 左右；原始时间逐条记录于 `observations.json`。正式状态、设计合同、源码块、bindings 与确认快照保持只读。

## 环境和复跑

使用已有 Google Chrome 153.0.8010.47、Node v26.11.1、Xvfb 1920×1200×24、Python 标准库 ctypes/XTest；未安装依赖。`run-browser-check.mjs` 从文件所在目录解析包路径，只向本包 evidence 写检查材料。它临时启动仅服务 final/comparison 的 loopback HTTP server 与隔离 Chrome profile，结束时关闭 Chrome/Xvfb/server 并删除临时 profile。

从仓库根运行：

```sh
node .agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/prototypes/UI-001/evidence/run-browser-check.mjs
node .agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/prototypes/UI-001/evidence/create-contact-sheets.mjs
```

脚本 exit 0 表示检查进程成功完成并保存记录，不表示全部验收通过。第二轮实际输出为 `cases:58, findings:5, errors:0, sourceUnchanged:true`。其中 3 项为确定合同偏差，2 项为原生 dialog 的 BODY 焦点边界观察。第一次检测器曾遗漏 Enter 的 CDP text 参数，并把正常的浏览器 chrome 焦点边界当成产品失败；保留 `first-pass-observations.json`，第二轮明确修正输入事件后，Shift+Enter 插入换行、Enter 发送均通过，不把测试器问题归因于产品。

## 覆盖与证据含义

实际入口为 `final/index.html` 和 `comparison/variants/candidate-a.html`，后者分别在 1440×960、390×844 打开。final 六页在 1440、800、390 CSS px 检查；DESIGN 声明的 29 个 page:state 全部在 final 实际出现，自动映射检查的 missingStates 为空。

正常、空、加载、失败重试、离线、权限不足、恢复、长文本；任务审批/进行中/完成/取消/未知效果/临时身份；Bot 创建/修订/停用；记忆私有/全局/提案/本轮/遗忘；资料附加/授权/拒绝；删除预检/最小记录保留/Profile 清除均有真实操作与截图。真实操作还包含忙时保留草稿、审批拒绝与确认、停止单个子任务、跨 Bot 自动记忆开关隔离、记忆来源与修订、全局提案拒绝/确认、授权接收方默认未勾选、未知写入核查与 Profile 删除门禁。

`browser.json` checks 不来自统一默认全 true：

| 字段 | 实际证据范围 |
| --- | --- |
| rendered | 每个 case 读取主内容的有效几何尺寸并截图 |
| no_overflow | 每个 case 比较 document/workspace 的 clientWidth 与 scrollWidth；58 个 case 均无水平溢出 |
| keyboard / focus | 每个 case 从可见页面/弹层控件按 Tab，回读 activeElement、`:focus-visible` 与 outline；创建表单首焦点另测，`agent-creating.focus=false` 如实投影该失败 |
| states | case 的页面与状态通过真实动作到达；`unsaved-form-after.states=false` 明确保留未保存表单状态丢失 |
| long_text | **共享横切检查**：`chat-long`、`long-800`、`long-390`、`long-message-1440`、`long-message-390` 检查长中文、长英文标识片段；不是宣称每个弹层都重复插入长文本 |
| zoom | **共享横切检查**：`native-200pct`，XTest 发送 Chrome 原生 Ctrl+= 五次；CSS viewport 1440×897→720×448、DPR 1→2，外窗口保持 1440×1040；不是 CSS zoom 或 pinch 模拟，也不是声称全部状态逐一缩放 |
| reduced_motion | **共享横切检查**：所有 reset 使用 emulated reduced-motion；专门回读 media matches=true、sidebar transition=0s、messages scrollBehavior=auto；不是物理系统设置变更 |

`console_errors=[]` 是实际订阅 Runtime/Log 事件所得。页面网络记录仅含临时 loopback 服务资源，无外网请求；`offline=true` 表示原型离线资源闭包，不表示真实后端离线恢复能力。`rechecked=false` 保留未修复缺陷；浏览器证据当前故意不满足 schema 的全通过常量，不可用于提升 Ready。

## 确定偏差与定位

| ID | 操作和实测 | 只读定位 | 后续验证 |
| --- | --- | --- | --- |
| PV-001 | 点击创建 Bot，填写 `#bot-name`，Escape，重开；字段为空 | `final/app.js:108–110` 的 `showDialog/closeDialog/cancel`，创建表单的 `new-bot/edit-bot` 分支 | 重跑 `unsaved-form-before/after`；应明确处置 dirty state，不能无声丢弃 |
| PV-002 | 390px + touch emulation，发送按钮宽高 40×44 | `final/styles.css:10` `.composer-tools .send-button{width:40px}`；coarse rule 只把 `.icon-button` 设为 44px，发送按钮无该类 | 重跑 `touch-emulation`，宽高均 ≥44px，兼顾相邻元素与布局 |
| PV-003 | 创建表单打开后首焦点为关闭按钮 | `final/app.js:108` `modal.showModal()` 后没有表单主输入焦点策略 | 重跑 `bot-initial-focus`，主输入 `#bot-name` 首焦点；同时保留关闭后触发点恢复 |

两次 dialog-focus-trap 观察只到 BODY，没有背景业务控件被聚焦，保留为待解释边界，不列入确定产品缺陷。正式共享 Dialog 的 Obsidian/owner Document 焦点验收仍由产品实现负责。

## 机械验证和字节保留

`materialize-prototype --check` 实际 exit 0，输出 `verified 3 prototype files`。`validate-design-package --check-preview` 与 `--check-ready` 的 shell 工具实测均返回 exit 126，输出相同：`ready prototype requires browser evidence`；这是当前包 frontmatter 的 `browser_evidence:null`，本任务无权修改该元数据。具体命令见 `validation.log`。

独立检查证实 prototype digest 仍为 `3c93a0c085cf3458148befdeb29ff445fe444601861c3bacb8dc9e421706444b`，DESIGN 页面状态没有缺项。对 browser.json 的 schema 实测失败，原因是创建表单 focus=false 与 rechecked=false；随后根据相同观察额外将未保存表单的 states=false 投影进去，不伪造为全通过。三源码文件、design-system、DESIGN 和 bindings 的完整 SHA-256 前后相同，均记在 observations.sourceHashes。

未验收范围：物理触屏；系统 IME（仅模拟 isComposing 事件不发送，不能替代真输入法）；读屏；真实模型/写入/Vault；Obsidian 多窗口/Portal/卸载；所有状态逐个 zoom 与长文本组合。完整生产验收继续由 Lead 管理。
