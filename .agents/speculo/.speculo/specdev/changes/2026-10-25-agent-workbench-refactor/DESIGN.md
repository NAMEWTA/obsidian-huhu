---
schema_version: 1
artifact: "change-design"
change: "2026-10-25-agent-workbench-refactor"
revision: 1
status: "approved"
scope: ["huhu.agent-workbench", "huhu.shared-web-tabs"]
baseline: {"revision":"DESIGN-0001","digest":"ebaca5f2f15fe081bf393c892f8b6583d4f2c6ad12cd92cb55068005fe83a331"}
prototype_ref: {"id":"UI-001","digest":"b8bcf55791eabb1d620c990e2aaaad49f7ccec9ab6a0f557e65ba3baa12fe1af"}
selection: {"candidate_id": "candidate-a"}
tokens: {"preview_dark": {"background_primary": "#1e1e20", "background_secondary": "#252527", "background_primary_alt": "#232325", "text_normal": "#e6e6e9", "text_muted": "#aeafb8", "text_faint": "#888a96", "border": "#39393f", "hover": "#303035", "accent": "#ab9bff", "on_accent": "#201b36", "success": "#8ecaa7", "warning": "#edbd80", "error": "#f3a1ab", "info": "#9abffc", "working": "#dfcf81", "terminal": "#19191b", "preview": "#141416", "selected": "#333044"}, "preview_light": {"background_primary": "#ffffff", "background_secondary": "#f4f4f6", "background_primary_alt": "#f8f8fa", "text_normal": "#25252c", "text_muted": "#595b68", "text_faint": "#6b6d79", "border": "#dedee5", "hover": "#eaeaf0", "accent": "#6651bd", "on_accent": "#ffffff", "success": "#27784c", "warning": "#925b16", "error": "#b13d4e", "info": "#3162a7", "working": "#796515", "terminal": "#fafafd", "preview": "#ededf1", "selected": "#eae6f8"}, "rail_width": "52px", "preview_sidebar_width": "232px", "inspector_width": "312px", "standard_toolbar_height": "44px", "panel_header_min": "34px", "control_min_desktop": "32px", "control_min_touch": "44px", "spacing_unit": "4px", "radius_control": "6px", "radius_panel": "8px", "radius_dialog": "10px", "focus_ring": "3px", "font_ui": "Geist, 系统中文 sans-serif", "font_terminal": "GeistMono, 系统中文 monospace", "font_body": "13px", "font_terminal_size": "12px", "font_auxiliary": "11px", "font_metadata": "10px", "breakpoint_sidebar": "960px", "breakpoint_sheet": "600px"}
pages: [{"id": "PAGE-001", "route": "工作台 / 空间 / 原生终端面板", "task": "创建和组织会话，控制面板，明确区分显示与运行", "states": ["default", "empty", "no-spaces", "loading", "disconnected", "background", "detached", "stopped", "restored", "long-text", "cross-space"], "acceptance": ["AC-001", "AC-002", "AC-003", "AC-004", "AC-005", "AC-006", "AC-007", "AC-010", "AC-011", "AC-012", "AC-026", "AC-027", "AC-029", "AC-061"]}, {"id": "PAGE-002", "route": "右侧工具 / 当前 Vault 历史", "task": "搜索、只读预览与明确继续历史会话", "states": ["default", "loading", "empty", "partial-error", "missing-source", "preview", "resume-confirmation", "resume-cancelled", "resumed"], "acceptance": ["AC-033", "AC-034", "AC-035", "AC-036", "AC-037", "AC-038", "AC-039", "AC-040", "AC-061"]}, {"id": "PAGE-003", "route": "右侧工具 / 控制与通知 / 原生终端审批", "task": "明确目标后提交输入、等待并核对，或发送被动通知", "states": ["default", "input-submitted", "waiting", "matched", "timeout", "wait-cancelled", "blocked", "approved", "denied", "unread", "read", "acknowledged", "notification-sent", "stop-confirmation", "stop-cancelled", "retried"], "acceptance": ["AC-013", "AC-014", "AC-015", "AC-016", "AC-017", "AC-018", "AC-020", "AC-021", "AC-022", "AC-023", "AC-024", "AC-025", "AC-027", "AC-061"]}, {"id": "PAGE-004", "route": "共享标签 / 参考资料与模块设置", "task": "独立使用网页并理解恢复和备份边界", "states": ["default", "agent-disabled", "no-spaces", "data-summary"], "acceptance": ["AC-041", "AC-042", "AC-047", "AC-048", "AC-049", "AC-057", "AC-060", "AC-061"]}]
overrides: []
confirmation: {"by":"user","at":"2026-10-25T03:13:11.528Z","record":"prototypes/UI-001/approval.md","record_digest":"5c84504ba7fb6911c8a5789953125d867c2d69db342d83e174585ec4d939bde3","digest":"f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab"}
updated_at: "2026-10-25T03:16:25.000Z"
---

# Change DESIGN：HUHU 终端 Agent 工作台

## 1. 任务、基线与范围

用户希望以 HUHU 当前前端为基底复现 Herdr 式终端、面板和 Agent 控制，为后续编排提供组合能力。任务模式是高密度操作：看到空间和会话，找到准确对象，操作原生终端，读回可观察结果。

本合同使用 baseline 所绑定的 DESIGN-0001 中 DS-001–DS-006。已有规则来源为 `docs/design-system.md`、`src/ui/styles/tokens.css`、`src/modules/agent/ui/workspace/WorkspaceLayout.tsx` 与 UI Skill。具体业务边界以同 change `spec.md`、ADR-001/004/006/008/009 和 CONTEXT 为准；DESIGN 不扩充 IPC 权限、任务队列或原生能力。

保持 Obsidian 宿主、HUHU 模块轨、可调整侧栏、工作区页签、原生终端与主题语言。新增的是明确的 Space/Session 导航、终端控制、主动邮箱和本 Vault 历史入口。网页标签使用共享承载。原型中的宿主页签及底部状态栏只是外框示意，生产不会新增 HUHU 全局状态页脚。

首次基线候选是 `prototypes/UI-001/baseline-draft.md`，只提取稳定的现有工作台规则，不提升 Herdr 配色、原型 fixture 或本次一次性交互为永久规则。基线的发布状态由原型包记录，正式发布只经 A 网关。

## 2. 选择方向与结构

采用 candidate-a：左侧空间与会话树，中间原生终端标签及分屏，右侧按需打开控制/通知/历史。宽屏初始展开控制工具，突出本轮新增能力；它可关闭，继续沿用用户当前布局，不要求每次打开强制展开。

主任务结构采用 dense-ide；主视觉完全继承 HUHU。Herdr 负责终端协作机制参照，不复制其原生应用外壳、整套配色、许可受限终端代码或所有附加功能。候选 B 把运行列表常驻于终端上方，适合轮询后台会话；C 用命令入口和底部工具，适合键盘单终端。候选组成与差异只在 UI-001 包维护。

主要路径：选择 Space → 创建 Shell/Agent → 发现并明确目标 → 提交输入 → 等待状态 → 读屏或核对产物。不是先填写聊天任务才能看到终端。创建协作者时后台模式不抢焦点。

## 3. Token、控件与复用

frontmatter 的 `preview_dark`/`preview_light` 是离线 HTML 的宿主回退值，生产继续映射宿主语义变量。工作中、空闲、待确认和状态未知均有文字标签；颜色是辅助。数字、ID 和终端使用等宽字体，中文系统回退。辅助 10/11px 信息不是唯一操作提示；主要操作与正文保持 12/13px，支持缩放。

继承共享 Button、Input、Textarea、Select、Tabs、Dialog、Sheet、Tooltip 和可调整面板。图标沿用现有线性语汇；HTML 图标为本包绘制，正式实现复用项目图标组件。原型使用本地复制的 Geist / GeistMono，保留 SIL OFL 原文。

Space 是导航对象；Session 行显示名称、Provider、活动状态和后台标记。当前显示焦点以面板边框及文字表示。工具目标选择与当前输入焦点分别保存：点另一个面板不会暗中换掉控制目标。目标显示所属 Space、Provider 与可复制的稳定 ID；跨 Space 另外标明“同 Vault”。不建立额外的权限角色或重复审批。

默认侧栏宽度与范围继承基线。截图中的 232px 是范围内的调整结果；原型没有模拟侧栏拖拽，但分屏比例滑杆可操作。生产需保留现有侧栏/分屏调整、拖拽重排、标签分组及快捷键，不得以原型简化控件为由删除。

## 4. 页面与状态合同

### PAGE-001：空间、会话和终端面板

入口是现有智能体模块。Space 列表上方有新建；先命名并选择目录，创建空 Space 不启动进程。库外目录经过本机选择与明确授权；原型以固定演示目录展示确认步骤，不能据此实现任意文本路径授权。

新建终端直接选择 Shell 或既有六个 Agent 入口与可选名称；默认用户创建立即显示，可选择后台创建。已有账号与高级终端设置沿用现状，不在首屏重复配置。Provider 是否能恢复、报告状态或统一审批由能力决定。

会话列表显示后台终端。打开会话附加同一运行；分屏控制和方向控制操作布局；键盘或面板头明确转移输入焦点。分屏显示目标可保留当前焦点，跨 Space 定位会切到目标所属 Space；归属不迁移。关闭面板只解除显示，提示可从会话列表恢复；停止运行放在明确目标的控制工具中并确认。

空 Space 提供创建终端；无 Space 提供创建空间与网页入口。加载状态不允许输入。失联保留已知会话/内容与“状态未知”，可重新核对，不显示成功。停止后仍显示记录并提供明确继续；重启恢复布局不自动启动进程或重发提示词。长名称在列表省略、完整名称可通过标题及详情访问，不能挤压关闭按钮或身份信息。

前台终端持续输出、关闭面板与空间切换的生产可靠性属于 Spec 验收；原型只证明显示及输入路径。`background`、`detached`、`stopped`、`restored` 不能合并为同一种状态。

### PAGE-002：本 Vault 历史

保持右侧抽屉入口，不引入账号总历史页面。标题固定为“当前 Vault 历史”，列出当前 Vault 的投影。搜索首轮覆盖标题与元数据，空结果有清除入口。读取来源时显示加载，部分失败仍保留其他记录及重试；缺失来源的元数据/标注仍可读，不伪造正文或可继续状态。

点记录先只读预览。预览显示 Provider、账号/设备、Space 与来源；继续按钮是明确的进程启动动作，确认对话框显示目标与目录，取消不启动。已有同源受管运行则定位它。继续失去原目录授权或来源不可用时说明原因并保持记录。

HUHU 标注与原生正文分开，标注可保存。原型模拟保存于本页内存，刷新会清空；不将模拟作为生产持久化验收。原型有三条 fixture，无分页性能证据；真实长历史仍按 Spec 分页/虚拟化。

### PAGE-003：控制、通知和原生人工处理

控制先选“当前空间”或“本 Vault 的所有空间”，再明确选择目标。默认不会查询其他 Vault。名称重复不能静默取第一个；UI 需展示唯一身份，CLI 需返回歧义。原型使用不同名称，跨 Space 演示选择“文档助手”。

输入区标明原生终端提交。按钮区分“只发送”与“发送并等待”。提交回执表示输入完成；等待显示等待中的对象和可取消操作。超时说明目标可能继续运行，重试只继续等状态、不重发输入。空闲匹配后引导读屏或检查产物。屏幕快照显示会话身份、范围和截断，不包装为完整答案。

待确认状态阻止普通协作输入，并提供回到原终端入口。原型中“允许本次/拒绝”位于原生 TUI 示意区域，只表示人在 HUHU 的终端中处理当前审批；它不定义所有 Provider 通用的离线授权 API。生产有可靠原生审批适配的可提供统一入口，否则保留原终端操作与准确能力提示。Agent 不能代替用户批准权限。

停止对话框显示会话名称、Space、稳定身份及停止影响；取消保持原运行。确认后先显示停止中，核实退出才标已停止；原型直接模拟核实成功，不证明真实终止可靠性。

通知按接收 Session 显示。未读 → 主动读取 → 确认收到分别可见；读取不自动 ack。发送消息只写被动邮箱，不启动目标运行或输入 prompt。后台通知不抢焦点；当前数量可见，实际接口仍按 Spec 做幂等/归属验证。

### PAGE-004：共享网页与恢复说明

网页保留在工作区标签中。无 Space 也能打开；停用 Agent 后仍保留网页及独立入口。原型的网页完全离线，用示例文章代替真实网站；生产沿用 Browser 现有能力与数据，不能从示例推导额外浏览服务。

设置说明保留已有终端选项，并解释 HUHU 自有数据/来源引用与原生全文/凭证备份的区别。生产导出清单应有实际缺项和恢复信息，原型仅验证说明入口；迁移幂等、回滚、五平台 helper、账号登录和原生恢复均需实施阶段证据。

## 5. 响应式、键盘与可访问性

- 宽屏保持 52px 工具轨和现有侧栏。右侧工具宽 312px，可收起；低宽度时以 Dialog 展开，避免挤压终端。生产按容器宽度处理，原型以独立窗口 viewport 等价演示。
- 600–959px 保留工具轨，侧栏从按钮打开为 Sheet；低于 600px 隐藏工具轨，空间按钮打开合并列表。该窄屏是桌面小窗口/布局适应验收，不承诺 iOS/Android 原生 PTY。
- 窄屏将并排终端上下排列，工具抽屉为模态层；各终端各自滚动。标题及工具栏允许换行，禁止全页意外横向溢出，终端原生不换行的长行可内部水平滚动。
- 按钮、图标按钮、选择项和弹层关闭控件有可访问名称；可点击目标桌面至少 32px，窄屏至少 44px。主路径不用 hover 才能操作。
- Ctrl/⌘ K 打开命令面板；Alt+1 空间、Alt+2 终端、Alt+3 控制为本原型演示键位。生产在既有快捷键配置中解决冲突，不覆盖宿主快捷键。工具标签支持左右箭头；Esc 关闭弹层；Dialog/Sheet 约束并返回焦点。
- 200% CSS 缩放及等效窄 viewport 检查可操作性；reduced motion 关闭动效。原型本身不加标签切场动画；触屏仅做模拟点击检查，不把 CDP 当真实设备验收。

## 6. 基线例外与模拟边界

无 DS 规则例外。侧栏预览调整值、候选结构和独立宿主回退色均是局部演示，不改变基线默认值。与生产组件不同的静态 HTML、原生 `<dialog>`、固定状态计时器和原生 TUI 内容均只用于离线验证；正式实现继续使用项目的 React、Radix 和 xterm。

本原型不执行 IPC、PTY、账号登录、文件系统授权、真实审批、真实 Provider、历史扫描、备份导出、生产迁移、性能或五平台测试。它验证用户能否找到并理解已约定行为，不能代替 Spec 的实现验收。

## 7. 确认与下游引用

本合同绑定 UI-001、candidate-a 以及 frontmatter 的 prototype/baseline 摘要。具体 HTML、比较入口、截图与验证位于 `prototypes/UI-001/design-system.md`、`comparison/index.html`、`final/index.html` 和 `evidence/browser.json`。

用户已明确采用 final 的 A 方案；选择原话与摘要记录在 UI-001 的 approval-ui.md。首次基线的永久写入范围另按发布网关确认，不能将页面选择扩大解释为永久写入批准。下游 Spec/Ticket 必须回读本 revision 的摘要与上述 PAGE/AC；实现中的页面、状态或交互变化由对应 owner 局部更新并重新验证。首次基线只提升 DS-001–DS-006，不包含生产实现、提交、发布或整个 change 归档授权。
