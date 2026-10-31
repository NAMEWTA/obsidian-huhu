---
schema_version: 1
artifact: change-design
change: 2026-10-31-huhubot-pi-refactor
revision: 1
status: draft
scope:
- huhu.workbench.huhubot
baseline:
  revision: DESIGN-0002
  digest: ef5e5080f6c1a8f967397af72fca0050820b9ad4d9a4f57451be3a63ab55b2b1
prototype_ref:
  id: UI-001
  digest: a6d236fb41ba8d5f5df4c37da6894ad44ca5d45c11f48183a653cfe1dd7accda
selection:
  candidate_id: candidate-a
tokens:
  reference: DESIGN-0002; no permanent token changes
  spacing_px:
  - 4
  - 8
  - 12
  - 16
  - 20
  - 24
  - 32
  radius_px:
    badge: 6
    control: 8
    panel: 12
    dialog: 14
  control_height_px:
  - 32
  - 36
  - 40
  touch_target_min_px: 44
  shell_px:
    rail: 52
    sidebar: 280
    header: 44
pages:
- id: BOT-CHAT
  route: '#chat'
  task: 带来源的聊天、草稿与可控执行
  states:
  - loading
  - empty
  - queued
  - running
  - waiting_approval
  - failed
  - interrupted
  - cancelled
  - read_only
  acceptance:
  - AC-002
  - AC-003
  - AC-009
  - AC-024
  - AC-026
- id: BOT-RUN
  route: '#runs'
  task: 分离会话历史、执行树图与通信，审查交付
  states:
  - waiting_children
  - waiting_user
  - submitted
  - reviewed
  - cancelled
  acceptance:
  - AC-014
  - AC-015
  - AC-016
  - AC-017
  - AC-025
- id: BOT-APPROVAL
  route: '#approvals'
  task: 单次审批、失效与效果核对
  states:
  - pending
  - approved
  - rejected
  - revision_changed
  - unknown_effect
  acceptance:
  - AC-007
  - AC-009
  - AC-010
  - AC-011
  - AC-012
- id: BOT-MEMORY
  route: '#memory'
  task: 确认、修改、忘记事实与追溯来源
  states:
  - candidate
  - confirmed
  - edited
  - forgotten
  - learning_paused
  - empty
  acceptance:
  - AC-019
  - AC-020
- id: BOT-PROFILE
  route: '#bots'
  task: 持久Bot与临时Team的身份/权限分离
  states:
  - configured
  - form_preview
  - temporary_agent
  acceptance:
  - AC-005
  - AC-014
- id: BOT-SETTINGS
  route: '#settings'
  task: 模型/凭据/工具/Skill/MCP/预算
  states:
  - unconfigured
  - configured
  - disabled
  - enabled_mock
  - snapshot_changed
  acceptance:
  - AC-007
  - AC-013
  - AC-018
  - AC-020
  - AC-023
- id: BOT-BROWSER
  route: '#browser'
  task: 同Space/Page人机共作与提交审批
  states:
  - awaiting_fill
  - draft_filled
  - awaiting_approval
  - mock_committed
  acceptance:
  - AC-009
  - AC-021
- id: BOT-AUTOMATION
  route: '#automation'
  task: 既有occurrence幂等与通知回链
  states:
  - empty
  - accepted
  - duplicate_delivery
  - host_offline_explained
  acceptance:
  - AC-022
  - AC-024
- id: BOT-DATA
  route: '#data'
  task: 四类数据、恢复降级与旧数据保护
  states:
  - healthy_mock
  - index_corrupt
  - control_unavailable
  - jsonl_tail_corrupt
  acceptance:
  - AC-006
  - AC-011
  - AC-027
  - AC-028
overrides: []
confirmation: null
updated_at: '2026-10-31T12:32:46.841546+00:00'
---

# Change DESIGN：虎虎 BOT 的统一交互

## 状态与权威

本文件是本 change 的设计规则草案，**尚未获本轮用户批准**。推荐 `candidate-a` 不是冒充用户已经选择。继承用户指定的稳定性 change UI-001 / 已有 DESIGN-0002；既有批准只适用于旧内容。本次不修改永久基线、不改变全局 token，不形成一套“AI 风格”的独立皮肤。

prototype_ref.digest 当前记录可复现的本地源码集合摘要，算法与逐文件 hash 位于 <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/prototypes/UI-001/evidence/source-manifest.json</Path>。正式 SpecDev 语义摘要、--check-preview/--check-ready 尚未执行；有完整工具闭包后核对其算法并更新绑定，再请求/记录正式批准，禁止把 source-set hash 当作已获批准的 designDigest。

## 已有风格证据

固定 dev `974105b47e03c108df0f5e0c3fc9606fe4b79aee`。读取项目设计 DESIGN-0002、旧 change DESIGN、旧 UI-001 design-system.md 与 final/styles.css 的实际预览 token。React/shadcn/Tailwind 约束由项目 UI skill 拥有；本 HTML 仅离线原型，生产必须复用已有组件，不把此脚本移入产品。

| 规则 | 本次应用 | 复刻与差异边界 |
|---|---|---|
| 字体和密度 | Geist + 系统中文回退；body14、dense13、meta12、title20 | 没有下载或分发字体；以用户已安装字体回退 |
| 圆角 | badge6、control8、panel12、dialog14 | 不用全屏大胶囊卡；圆形仅适合switch/radio等几何语义 |
| 间距 | 4px节奏、8/12/16/20/24/32 | 容器padding按密度响应，避免无意义装饰留白 |
| 颜色 | 宿主语义token；离线预览沿用原UI-001 light/dark fallback | 不覆盖生产宿主主题；状态有文本，不靠颜色单独表达 |
| 层次 | 默认边框与平面；仅Dialog有柔和阴影 | 无装饰光晕/渐变、无新增全局页脚 |
| 壳 | rail52 / sidebar280 / header44；默认聊天+可收起详情 | 页面不是独立Web产品，不新增Obsidian叶子类型 |
| 响应式 | workspace容器≥960导航侧栏；600–959侧栏入口；<600合并导航Dialog | 容器而非仅viewport；窄pane也可用 |
| 输入与焦点 | button/label/tab/dialog真实语义；3px focus outline；Escape返回触发点 | 按钮至少32px，触控预览44px；实际屏幕阅读器待实机 |
| 动效 | 短暂背景/边框/颜色反馈；reduced-motion关闭transition | 不缩放 hover，不使用transition:all |

## 页面合同与生产映射

页面表与状态由frontmatter列出，AC编号在spec。默认聊天，不以复杂执行图作为首屏。会话导航只选择对象；运行状态来自服务投影。侧栏与portal必须使用实际所属ownerDocument；原型的一个document不能证明多窗口正确。

聊天保留未发送草稿与来源；附加来源不自动发送，IME组字Enter不发送，steer与follow-up区分。单次审批先展示目标、diff、接收方、scope、有效期与revision。未知效果禁止重复批准，核对按钮也不伪造成功。

执行关系拆为 Pi会话分支、Run/Attempt委派、通信覆盖；布局不改历史关系。子任务未提交时不可验收根任务；用户勾选已检查产物后才演示验收。固定mock图不是生产图算法。

长期记忆从候选确认到事实；修改产生revision，忘记清理检索内容并阻止自动重学，原会话另管。MCP默认关闭且需显式启用；设置页不接受真实密钥。Browser/Automation展示已有公共能力边界，不复制其实现。

## 状态和负向路径

顶端预览控制可切换loading、queued、running、retrying、waiting_user/children、read_only、interrupted、failed、cancelled、unknown_effect。失败保留输入；已批准、拒绝、来源变更与未知效果各自可见。只读不得新审批；模型未配置阻止发送但不清空历史。

数据页分别演示index坏但会话可读、state坏则副作用fail-closed、JSONL尾损坏先隔离；备份与旧数据说明不提供隐式删除操作。production不存在“所有错误都自动重试”的通用按钮。

## 候选与推荐

三个候选遵守同一风格、同一任务与数据，不重新探索品牌：A详情并置，B详情按需，C审批优先。推荐A：与既有工作台信息层次一致，也保留源上下文后审批。B适合专注但增加详情操作；C更快定位审批但容易跳过背景。正式选择/组合由用户针对实际HTML确认；默认推荐不代替批准。

## 验证边界与确认

浏览器补充检查结果见 <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-huhubot-pi-refactor/prototypes/UI-001/evidence/browser-results.json</Path>。真实宿主、系统IME、读屏、大数据量、四平台、Pi/SQLite/MCP/Browser实现均未验收。原型只证明其显示与交互，不证明产品运行。

需用户集中确认：**采用推荐A的页面与关键交互，并继续保持本次既有UI-001视觉体系吗？** 此确认只覆盖实际展示的设计与HTML，不授予生产实现、永久知识提升、发布/merge或用户数据操作权限。正式批准绑定当时源码/设计摘要；后续有影响的修改重新验证与确认。
