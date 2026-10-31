---
schema_version: 1
artifact: change-design
change: 2026-10-25-huhu-bot-architecture
revision: 2
status: approved
scope: [huhu-workbench-bot, bot-chat, bot-collaboration, bot-memory]
baseline: {"revision":"DESIGN-0001","digest":"ebaca5f2f15fe081bf393c892f8b6583d4f2c6ad12cd92cb55068005fe83a331"}
prototype_ref: {"id":"UI-001","digest":"3c93a0c085cf3458148befdeb29ff445fe444601861c3bacb8dc9e421706444b"}
selection: {candidate_id: candidate-a}
tokens:
  layout: {rail: 52px, sidebarDefault: 280px, sidebarMin: 220px, sidebarMax: 500px, header: 44px, readingMax: 760px, wideFrom: 960px, mediumFrom: 600px}
  light: {background: "#ffffff", foreground: "#0a0a0a", sidebar: "#fafafa", card: "#ffffff", popover: "#ffffff", primary: "#171717", onPrimary: "#fafafa", secondary: "#f5f5f5", muted: "#6e6e6e", border: "#e5e5e5", ring: "#a1a1a1"}
  dark: {background: "#131416", foreground: "#d7d7db", sidebar: "#19191c", card: "#1b1b1e", popover: "#1e1e20", primary: "#d0d0d6", onPrimary: "#131416", secondary: "#2a2a2d", muted: "#97989d", border: "#2c2d30", ring: "#85868b"}
  fixtureStatus: {lightSuccess: "#28734b", lightWarning: "#8a5b0a", lightInfo: "#245f99", darkSuccess: "#84c79e", darkWarning: "#e9bd69", darkInfo: "#95bce8"}
  shape: {small: 6px, medium: 8px, large: 10px, extraLarge: 14px}
  type: {sans: Geist, mono: Geist Mono, body: 14px, dense: 13px, small: 12px, meta: 11px, time: 10px}
  control: {desktopMin: 32px, touchMin: 44px}
  spacing: {unit: 4px, rowGap: 8px, sectionGap: 24px}
pages:
  - id: BOT-CHAT
    route: workbench/huhubot/chat
    task: 选择 Bot 或群聊，附加资料、@ 成员并持续对话
    states: [normal, empty, loading, error, offline, permission, recovery, long]
    acceptance: [AC-005, AC-006, AC-007, AC-008, AC-047, AC-048, AC-051]
  - id: BOT-TASKS
    route: workbench/huhubot/tasks
    task: 理解父子关系、处理审批、取消、结果与未知效果
    states: [approval, running, completed, canceled, unknown, temporary]
    acceptance: [AC-010, AC-011, AC-015, AC-016, AC-017, AC-025, AC-029, AC-049]
  - id: BOT-AGENT
    route: workbench/huhubot/agent
    task: 创建/编辑持久 Bot 的职责、模型与可用性
    states: [normal, creating, editing, disabled]
    acceptance: [AC-002, AC-003, AC-004, AC-023, AC-047]
  - id: BOT-MEMORY
    route: workbench/huhubot/memory
    task: 管理自动私有记忆，确认全局提案并纠正或遗忘
    states: [private, global, short, pending, forgotten]
    acceptance: [AC-018, AC-019, AC-020, AC-021, AC-022, AC-050]
  - id: BOT-ACCESS
    route: workbench/huhubot/access
    task: 核对资料、模型接收方、范围授权和撤销
    states: [attached, grant, denied]
    acceptance: [AC-022, AC-024, AC-025, AC-026, AC-031]
  - id: BOT-DATA
    route: workbench/huhubot/data
    task: 预览永久清除，区分正文删除与最小安全记录
    states: [preflight, retained, purged]
    acceptance: [AC-038, AC-039, AC-040, AC-041, AC-051]
overrides: []
confirmation: {"by":"user","at":"2026-10-25T03:27:53.383Z","record":"prototypes/UI-001/confirmation-final.md","digest":"aa62a53b30d0ca32f03a5580be8ce5b4921b9c3c1767793b9173eadfde92dc6e","record_digest":"29a16e6190948b8e1444028afa4673c835c944b359a8092cab2809af5a1cb46c"}
updated_at: 2026-10-25T03:27:53.383Z
---

# HUHU Bot 视觉与交互合同

## Scope and Baseline

用户在现有 HUHU 工作台中选择助手、持续对话、组织协作、核对写入与维护记忆。成功是知道“谁在做什么、使用哪些资料、何时需要我处理”，并能够在失败、取消和恢复后继续。此页属于操作与阅读任务，不采用营销页或大仪表盘布局。

baseline 字段固定引用已发布的 <Path>{roots.state}/specdev/design/revisions/DESIGN-0001.md</Path>，采用 DS-001–006。此次核对正式基线与所选 final 的工具轨、侧栏、宿主主题、共享控件、响应式和键盘规则一致，不重新发布基线，也不沿用此前未发布的同名候选。

源码检测依据是 Shell、tokens、现有 Agent 侧栏行密度与共享组件；现有 CLI 会话模型不作为 Bot 身份模型。原型用当前 Pearl 色盘演示明暗主题，生产颜色继续服从宿主语义 token。owner Document、业务组件和页面状态由本 change 的下列合同补充。

行为与 AC 归 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md</Path>；架构身份关系与权限归 ADR-023–025；设计解释不另增一个服务、引擎或状态库。原型位于 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/prototypes/UI-001/design-system.md</Path>。

## Selected Direction

用户已明确确认 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/prototypes/UI-001/final/index.html</Path> 为唯一方案，保留稳定标识 candidate-a。界面使用图标轨＋Bot/群聊目录＋主对话。常驻侧栏列持久 Bot，行显示名称、职责与状态；群聊单独成组。临时 sub-agent 不挤入目录，只出现在关联任务里。检索无结果与真正空目录分开，创建按钮保持可达。

```text
┌────┬─────────────────┬─────────────────────────────────┐
│轨  │ Bot / 搜索      │ 群名 / 协调者           任务 详情 │
│    │ 协调员          ├─────────────────────────────────┤
│    │ 资料助手        │ 用户消息 + 两份附加资料           │
│    │ 写作助手        │ 协调者的简洁说明                 │
│    │ 审校助手        │ ┌任务摘要：已有 Bot / 临时任务──┐ │
│    │                 │ └完成、等待、审批与结果─────────┘ │
│    │ 群聊            │ 写入预览入口                     │
│    │ 周报协作        │                                 │
│    │ 阅读小组        │ 附加资料 / @成员                  │
│    │ 记忆            │ 消息输入                    发送 │
└────┴─────────────────┴─────────────────────────────────┘
```

只维护这一套界面：对话内展示协作摘要，完整任务通过“任务”入口展开。独立任务页仍属于所选方案；不增加另一套首页布局或常驻右侧检查器。其他候选文件和仅供其使用的样式、脚本分支已移除。

## Tokens and Components

frontmatter tokens 是原型解析后的精确值。生产主题使用现有 `--background/--foreground/--sidebar/--border/--primary` 等语义映射，不能把演示 Pearl hex 散落到模块组件。fixtureStatus 仅补离线宿主缺失的语义状态颜色；生产接 StatusDot/宿主 color 变量，不新增 Bot 品牌色。

字体复用本地 Geist/Geist Mono，中文系统回退；名字/列表 13px、说明 12px、元信息 11px，正文 14px。10px 仅用于低优先级时间和辅助提示，不能承载关键状态。密度通过减少重复说明控制，不通过缩小所有控件。

| 组件 | 复用与新组合 |
| --- | --- |
| Button/Input/Textarea | 使用共享语义、disabled/invalid/focus；发送、停止各有明确 accessible name |
| Dialog/AlertDialog/Sheet | Bot 表单、资料授权、写入预览、全局确认、删除预检；焦点约束与恢复 |
| StatusDot/Badge | 名册和任务的状态文字；颜色只辅助，不独自承担含义 |
| SettingsSection/SettingsRow | Agent、模型、记忆和本机数据的低频管理 |
| EmptyState | 新会话、未配置、无结果、清除后落点，提供真实下一步 |
| 新领域组合 | BotDirectoryRow、CollaborationSummary、TaskRelation、ApprovalPreview、MemoryScopeView；由既有原语组合 |

普通内容靠间距/边框组织，只有任务摘要、审批与弹层使用卡片表面。左栏与正文不出现两套重复顶级导航；无新增 Obsidian 视图类型和自造底部状态栏。

## Pages and Interaction

### BOT-CHAT：单聊与群聊

点击 Bot 打开其单聊；点击群聊打开群公共记录。主标题明确对象，群详情说明协调者和成员。创建 Bot 与创建群聊入口分开；描述告诉用户前者是持久身份、后者使用已有身份。表单必填/未保存状态不能因切换无声丢弃。

输入区上方显示明确附加资料，`@` 选择器仅列有效目标，选中的目标以 token/姓名显示。未 @ 时提示发给协调者；@ 后仅选中者回应。Enter 发送、Shift+Enter 换行，IME 组合输入不发送。Session 忙时保留草稿并提示去处理当前运行，不把输入框清空后偷偷排队。

流式生成与已保存是不同状态；主消息不持续朗读每个 token，只在关键阶段用 polite 状态提示。对话显示来源而非模型私有推理。离开、切换、隐藏或关闭页面不会隐式停止任务。

空态说明能做什么并给可编辑示例；loading 保持页面结构；error/offline 保留已保存内容与草稿；权限不足明确范围/接收方入口；恢复说明可能继续产生调用，只有点击后继续。长中文和模型输出自动换行，长名字提供全名/省略。

### BOT-TASKS：计划、子任务与审批

对话内摘要显示任务名、执行者、已有/临时、状态和可展开详情。独立任务页适合查看调用树和所有待处理项。与模型“规划好了”的文本相比，任务卡状态必须来自持久 Delegation/Run，只有实际受理后才出现执行身份。

子任务详情写清发起者、执行者、共享上下文、结果回投目标与取消范围。停止整项任务与停止单个子任务用不同文案；其他会话不受影响。已完成/失败/取消允许阅读已返回结果，部分结果不装成全部完成。

审批弹层先给目标、操作、来源、diff，再给拒绝/确认。按钮不与文件预览链接混淆；冲突回到重新预览，不重复用旧批准。未知效果显示“待核查”，不提供直接重试写入；核查区分可信回执与后置条件。根与子任务的恢复入口解释范围。

### BOT-AGENT：持久身份

详情展示职责、人格修订、模型协议和状态。编辑不改变 agentId，在途使用旧修订；停用说明活动任务门禁与保留范围。模型测试是明确动作，缺凭证和服务失败不能画成已连接。创建永久 Bot 需明确提交，临时任务不能在后台把目录扩成一长列。

### BOT-MEMORY：作用域与可纠正性

顶部选择 Bot，分为私有长期、全局长期、本轮上下文三个入口。每条显示内容、来源、修订、自动/人工与作用域；私有页可暂停自动维护并说明调用额度。临时任务记忆在任务详情关联，不伪装成持久 Bot 的共享记忆。

全局提案使用待确认区域，确认前不可显示已生效。确认弹层展示内容/来源/共享范围，拒绝移除提案但不生成条目。修正形成新修订，forget 解释退出召回与原会话删除的区别；忘记后空态提供清晰反馈。调用方是协调者不改变全局确认规则。

### BOT-ACCESS：资料与权限

默认附加资料明示。扩大到文件夹或全库单独选择并确认接收方；不得预勾选全库。撤销后提示后续读取/外发停止，已外发内容不伪装为召回。不同 Bot 的模型接收方可查，缺授权时先停止而非自动替换 Provider。

### BOT-DATA：删除与核查

会话与 Profile 清除分开，预检列明消息、子上下文、自动来源记忆、固定/全局独立记忆和 Vault 成果边界。未知效果时明确“只清正文，最小记录暂存”；整 Profile 清除门禁有去核查入口。失败保留受限/可核查状态，不能提前显示已全部清空。原型清除只修改内存示例，刷新可以重置；生产确认必须依据实际预检 token 与 revision。

## Responsive and Accessibility

- 以叶子容器宽度为准：≥960px 轨＋内联侧栏；600–959px 轨常驻、侧栏覆盖；<600px 合并导航抽屉。宽度范围/默认值沿 Shell，键盘方向键 8px，Home/End 到两端，双击复位。
- 主对话保持可读行长；独立任务页在窄叶子中从多列重排为顺序列表。协作详情经内联摘要或任务入口展开，不设置常驻右侧检查器；不能用页面横向滚动补救布局。
- 覆盖抽屉只遮当前叶子；modal 有名称、Escape 关闭、焦点约束与返回触发点，背景 inert。生产 Portal 挂在 owner Document；真实弹出窗口迁移另以 Obsidian 验证。
- 所有关键动作可键盘完成；可见 focus ring，触屏热区≥44px、桌面≥32px。图标按钮有名称，文字状态不依赖颜色。标题层级、输入标签、错误说明与 polite 通知可被辅助技术识别。
- 检查 1440、800、390px、200% 缩放、长中文/英文、明暗、键盘/IME、reduced motion。仅使用 transform/opacity 的短动画，reduced motion 下关闭非必要位移。

验证方式与观察入口在 UI-001 的用户检查指南；未取得的浏览器/触屏/多窗口观察不由静态代码代证。

## Baseline Overrides

none。沿用共享语言与叶子响应式；新增 Bot 目录、任务和记忆组合属于本 change 的业务内容，不替换其他工作台页面。原型检查工具条在产品画面之外，仅用于离线切换示例状态，正式产品不出现它。

## Confirmation and Handoff

用户确认来源为 LOG-040，原文与本次固化摘要保存在 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/prototypes/UI-001/confirmation-final.md</Path>。确认覆盖所选 final 的视觉/交互，以及用户要求的单方案清理和相关文档修正。本 revision 绑定正式基线、原型及确认快照；设计选择已完成，不再要求重复选择方案。

正式基线已存在且核对兼容，本 change 仅引用其不可变版本；本轮不进行永久基线写入。设计批准和技术验收分别记录，用户确认不被扩写为未提供的浏览器/设备测试报告。

浏览器/响应式/键盘的可复核证据仍独立保存在 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/prototypes/UI-001/REVIEW.md</Path> 和设计包的 Validation and Handoff；不虚构 browser.json、截图或通过状态。生产模型调用、任务/记忆隔离、Go/Host/多窗口仍由 Spec 的 S1–S9 验证。

可以提出只影响局部的修改；影响 HTML、交互、页面状态或基线的修改要重算摘要并重新检查对应范围。归档时只评估实际采纳且可跨 change 复用的规则。
