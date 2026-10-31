---
schema_version: 1
artifact: change-design
change: 2026-10-31-browser-shared-session-space
revision: 1
status: draft
scope:
- huhu.browser
baseline:
  revision: DESIGN-0002
  digest: 1aa986e5c576aef9e590e473695941c8ad7812570df100b7edfe2d21f421f9cb
prototype_ref:
  id: UI-001
  digest: null
selection:
  candidate_id: candidate-a
tokens:
  radius:
    badge: 6
    control: 8
    panel: 12
    dialog: 14
    checkbox: 5
  spacing:
  - 4
  - 8
  - 12
  - 16
  - 20
  - 24
  - 32
  control_height: 36
  rail_width: 52
  sidebar_width: 280
  header_height: 44
pages:
- id: PAGE-001
  route: browser/space/page
  task: 同一页面的人机交接
  states:
  - human
  - agent
  - revoking
  - paused
  - outcome-unknown
  - personal
  - loading
  - offline
  - error
  - crashed
  - owner-elsewhere
  - unsupported
  - cleanup-pending
  acceptance:
  - AC-002
  - AC-003
  - AC-008
  - AC-010
  - AC-017
  - AC-022
  - AC-026
  - AC-029
  - AC-035
overrides: []
confirmation: null
updated_at: '2026-10-31'
---

# Browser change design · DESIGN-0002 增量草案

## 权威与绑定

原始基线：.agents/speculo/.speculo/specdev/design/DESIGN.md，固定读取 dev `974105b47e03c108df0f5e0c3fc9606fe4b79aee`，revision DESIGN-0002，官方索引 digest `1aa986e5c576aef9e590e473695941c8ad7812570df100b7edfe2d21f421f9cb`。直接参考用户指定 stabilization-overhaul 的 UI-001 final/index.html、styles.css 与 app.js；其中 index blob d84f0070e317e2ffd2dba99a411e9897e6dd8cfc，CSS blob 03ef61ad780e99f1a58a028a0fa58116e0d8c86b，JS blob 2cdd564d08991a2e941cd15e2c43e00a968e241f。

参考不是另一套浏览器界面：它涵盖组件/gallery/list/safe/home/bot/terminal。本设计复刻其布局语法、tokens、状态和交互品质，再新增浏览器场景。没有复制另一 change 的批准记录，也没有改永久设计。

prototype_ref.digest 当前 null，是尚未通过仓库官方 design-artifacts 工具生成 canonical prototype digest 的明确缺口，不可据此判 Ready。文件 byte hash 见 UI-001 evidence/content-manifest.json，只用于完整性；不会拿它冒充用户批准摘要。confirmation 为空，D-013 未回答。

## Tokens 与组件合同

| 维度 | 必须继承 | 浏览器映射 |
|---|---|---|
| 圆角 | badge 6；button/input 8；panel 12；Dialog 14；checkbox 5 | tab 上角 8；Space 行 8；框架 12。仅 switch/radio 可全圆，不做胶囊按钮/卡片 |
| 字号 | 页面 20、标题 16、正文 14、密集 13、辅助 12，行高约 1.5 | HUHU UI 主操作至少 13；虚构网页有独立站点排版，不反向修改宿主字级 |
| 间距 | 4/8/12/16/20/24/32 | 地址栏与控制条紧凑；不靠大空白/渐变装饰制造层级 |
| 控件 | 默认 36，至少 32，触控 44 | icon hit area 与文本按钮同级；图标 16 / stroke 1.75 |
| Shell | rail 52、sidebar 280（实际可调整 220–500）、header 44 | >=960 同栏，600–959 导航弹层，<600 合并导航选择 |
| 颜色 | Obsidian 背景/文字/border/accent/on-accent/status 语义 token | 独立 HTML 仅提供参考原型相同的亮暗 fallback；生产不得硬编码替代用户主题 |
| 字体 | Geist + 系统中英回退；mono 用于诊断 ID | 本包不包含字体，不外链字体，不新增字体资源依赖 |
| 动效 | 120ms color/border/background/opacity/transform；不 transition:all | 无持续炫光/悬浮放大；reduced-motion 关闭非必要过渡 |
| 焦点/对比 | 3px accent ring + 1px offset；文字 4.5:1、控件/大字 3:1 目标 | Dialog 初始焦点/ESC/返回；实际主题对比与原生 guest 焦点由后续实机覆盖 |
| 层级 | 只有 overlay/浮层使用柔和阴影 | 普通卡片、Space 行与工具栏用边框和底色分层 |

## 页面、动作与状态

**PAGE-001 常规工作台。** Space 导航、网页 tab、真实目标地址、共享控制条、原生 surface 区域与资源归属。普通浏览无需选择外部浏览器或安装 runtime。地址编辑草稿不随 title/loading 更新被覆盖；长地址可聚焦、选中和横向查看。HTTP 必须标识为不安全，不能一直显示 HTTPS 锁。

**PAGE-002 可信交接。** 明确实际 Agent/Task、Space 内页面范围、能力、有效期和可见网页进入模型的风险。只有“允许本次交接/取消”，没有“始终允许”。支付、消息和上传不因浏览授权得到无限效果授权。接管按钮始终可达；撤权 ACK 前显示进行中，不能先把人工输入放开。

**PAGE-003 个人空间。** Agent 读取/截图/创建/控制均拒绝。转换确认明确保留现有登录态及其风险，转换不自动 grant。UI 分类同步到任务空间；切换空间后不恢复 personal 标签与实际控制不一致的假象。

**PAGE-004 权限、文件与材料。** 权限弹窗显示实际 origin/frame，允许本次或拒绝；Agent 不能批准。下载显示运行/完成/失败/取消与部分文件归属；下载完成不是文件读取授权。材料先固定采集，再选目标并确认，只进入输入框、不发送；未知交付不重加。

**PAGE-005 清理与异常。** 删除显示范围、保留项与不可逆风险；cleanup-pending 保留列表和原因，关闭准入；重试只处理未完成阶段，不吞失败。页面错误/offline/crashed/unsupported/owner-elsewhere/outcome-unknown 分别显示具体恢复动作；未知不出现一键重放提交。没有隐藏 Native fallback。

## 候选与推荐

A：完整 Space 工作台，控制条贴近网页，常规首选。B：压缩 Space 导航为选择器，增加网页宽度；C：宽屏额外常驻任务摘要，利于长任务观察但占网页空间。三者共享所有 token、虚构内容和动作；没有用三套视觉主题假装候选差异。推荐 A 是设计建议，不是用户已批准。

## 交互与可达性

Dialog 使用当前窗口门户与 focus management；产品实现采用既有 React/Radix 原语，不把原型原生 DOM 代码搬进生产。Tab 键盘支持左右/Home/End；所有 icon button 有名称；错误状态不只依赖颜色或 toast。禁用、busy、paused、unknown 含文本；主动作不被长文案挤出。窄容器折叠 sidebar，而不是裁掉地址/接管。

原型覆盖亮/暗、420/600 容器与桌面、长中英、44px 触控、CSS 200% zoom、reduced-motion、键盘弹窗、清理失败。CSS zoom 不等同 Obsidian 实际缩放，自动化输入中文不等同真实 IME。真实 guest 遮挡 Dialog、系统焦点/快捷键、跨窗口 Portal 和用户主题仍为 T-13 Gate。

## 非功能与复用边界

既有 Shell、主题、控件与模块基础设施优先复用；不新增 ViewType，不注入远端 HTML 到宿主 DOM，不在全局 document 渲染 Portal。原型中出现的页面为原创虚构资料，所有操作只改内存，不发外部请求。

## 批准与回读

待用户 D-013 一次集中确认后，先在真实 checkout 运行官方物化/设计包/原型验证，再记录 design/prototype/baseline 的规范摘要与真实确认来源。改动交互或基线后重新验证绑定。该确认只批准设计，不批准产品实施、归档移动、合并或数据清理。
