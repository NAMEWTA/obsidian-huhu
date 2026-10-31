# Change-local 架构决定

状态：以下为 Issue/本轮用户已明确的设计约束，**不是已实现或实测通过**。永久 ADR 只读；未来归档需要真实证据和用户批准。

## ADR-001：仅宿主 Electron，共享 Session 与唯一 live Page

- 来源：https://github.com/NAMEWTA/obsidian-huhu/issues/38 §1–6。
- 选择：一个 Space 一个受隔离命名的 Session；一个 pageId 一个 canonical guest；没有 Agent 隐藏浏览器。
- 备选及拒绝：独立 Chromium 增加分发/进程模型且违背目标；相同 Cookie 的第二页丢失 JS/表单上下文；iframe 不能代替完整浏览器；关闭 webSecurity 不可接受。
- 代价：受 Obsidian 实际桥、Electron 版本、原生表面和窗口归属约束。
- 验证：T-01 F01–F12；尚未定案 webview 生产可用性。

## ADR-002：最终准入屏障与短期单写者授权

- 来源：Issue §10–12；继承而非新增兼容协议。
- 选择：Space 级控制，可信 handoff；主进程同步准入代次与服务撤权共享生效点。每个异步续步与结果交付重新校验。
- 拒绝：UI token 只在 HTTP 入口检查、长等待阻塞接管、只有鼠标遮罩、旧截图继续到模型、重启恢复 token。
- 代价：少量内存 fence/去重状态仍必要，不是新监督进程；已发生外部效果无法回滚。
- 验证：B08–B13、B17、B22–B23；未知结果严禁盲重放。

## ADR-003：元数据与站点数据分离；显式破坏性清理

- 来源：Issue §8、§16、§18。
- 选择：业务元数据在设备级 .huhu；网站数据由 Electron 管理；旧 v2 不读不迁移；默认保留旧磁盘数据。
- 有意替代：当前 dev 开发规则中“全部浏览器 Cookie/cache 都在 .huhu”的约定。实际实现时由 T-12 同步 docs/data 和开发规则；本 PR 不改永久规则或现行产品说明。
- 拒绝：app.setPath 全局重定向、读取 Cookie SQLite、清整棵 userData、清理失败先删元数据、声称磁盘安全擦除。
- 代价：Vault 备份不携带登录态；搬 Vault 默认安全新绑定，显式重新绑定另行验证 owner 已退出。
- 验证：B05–B06、B29–B31、B37。

## ADR-004：单公共服务与薄外部适配

- 来源：Issue §13–14；现有模块 API 与材料贡献点。
- 选择：内外部调用统一 BrowserAgentAccess；既有 CLI 切换；可选 Broker 按需启停；Bot 继续 Go/HAP，不持 Electron。
- 拒绝：多 transport、多独立状态库、访问核心 Web Viewer 私有对象、其他插件 WebContents、长期全局 bearer。
- 验证：T-09/T-10 的真实消费链；ModuleRegistry 服务撤销仍保留。

## ADR-005：继承 DESIGN-0002，不另建主题或永久规则

- 来源：用户指定 UI-001；DESIGN-0002 digest `1aa986e5c576aef9e590e473695941c8ad7812570df100b7edfe2d21f421f9cb`。
- 选择：圆角 6/8/12/14、控制 36、rail 52/sidebar 280/header 44、语义 token、可达焦点、明确未知和清理失败。
- 代价：参考原型没有浏览器页面；本次复刻的是其工作台语言并新增浏览器任务布局，不谎称已复制一个现成浏览器屏幕。
- 验证：本地离线截图和交互；原生 guest/Portal 遮挡仍需 T-13 实机。新布局批准待用户。

## 未定案：唯一表面实现

webview 是 Issue 指定首选候选，不是本文擅自冻结的最终实现。Electron 明确提示稳定性风险；WebContentsView 属主进程原生视图。证据不足时保持 T-01 Gate 打开；两者均不通过时阻断，不返回 Native。依据：https://www.electronjs.org/docs/latest/api/webview-tag 、https://www.electronjs.org/docs/latest/api/web-contents-view 。
