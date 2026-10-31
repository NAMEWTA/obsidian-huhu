---
schema_version: 3
artifact: spec
change: 2026-10-31-browser-shared-session-space
status: draft
ready_for_tickets: false
sources:
- <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/source.md</Path>
- <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/sources/USER-001.md</Path>
- <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/ADR.md</Path>
- <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/DESIGN.md</Path>
---

# Spec：共享 Session Space 的外部行为合同

## 问题与目标

来源 <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/source.md</Path> 与 <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/sources/USER-001.md</Path>。浏览器最终应像普通嵌入浏览器：人登录，指定 Agent 在同一 live Page 操作，人接管时保持草稿与页面上下文，再明确交回；不安装额外浏览器、不复制登录态。当前本轮只制定合同与原型。

## 解决方案与外部行为

用户创建个人或任务 Space，按需开网页；个人 Space 在公共 Agent 层始终拒绝读取/控制。任务 Space 点击“交给 Agent”，可信 UI 显示实际接收者、Space 内页面范围、可见内容可能进入模型、有效期和高风险动作边界。确认后进入单写者观察态。人工“接管”立即走撤权屏障，确认屏障生效才显示人工可操作；旧图片/读结果和未派发动作失效。交回使用新凭据且重新观察。任一未知网页效果保持 unknown，不把重试作为默认修复。

Space 内多页共享站点 Session，但每页 JS 内存不同；同 pageId 多入口只聚焦/展示同一 owner guest。切标签、主题更新、地址栏编辑不重建 guest。退出重开仅恢复合规站点数据/元数据；不恢复控制权、不重放效果。网站登录有效期与特殊认证限制如实提示。

删除显示具体范围并确认；先 tombstone/撤权/收敛再清理；无法完成保留可见 cleanup-pending。停用只关资源，不清账号。旧磁盘文件默认保留，不读旧 schema。下载/上传/材料均有独立文件或交付授权，材料只填指定输入框，不发送对话。

## 验收合同

B 编号来自 Issue §21，逐项绑定同序 AC；下表的要求均为待验证，**不是通过记录**。可复现步骤与 fixture 在 acceptance-matrix，未来 evidence 必须固定 commit 和真实环境。

| ID / 来源 | 前置条件与动作 | 可观察结果 | 验证接缝 / 首要票 |
|---|---|---|---|
| AC-001 / B01 | 无 Chrome、无 HUHU runtime 的干净桌面环境 | 浏览器可直接使用，不下载/启动独立 Chromium | 真实 Obsidian / T-02 |
| AC-002 / B02 | 同 Space 人工登录后 Agent 读取/点击 | 相同 partition、相同 pageId 的 live webContentsId；无需保存/套用身份 | 真实 Obsidian / T-04 |
| AC-003 / B03 | Agent 修改表单后人工接管，再交回 | 页面不重建，表单/滚动/上下文保留；新凭据继续，旧凭据失败 | 真实 Obsidian / T-04 |
| AC-004 / B04 | 同 Space 同源多页 | Cookie/localStorage/IndexedDB 按真实浏览器规则共享；不把 tab-local 状态误判为必须共享 | 真实 Obsidian / T-02 |
| AC-005 / B05 | 不同 Space、不同 Vault、复制 Vault | 不串登录；复制同身份文件不意外接管原 partition | 真实 Obsidian / T-02 |
| AC-006 / B06 | Obsidian 完整退出并重启 | 持久站点数据按合同保留；控制授权不恢复；过期网站会话不被伪报已登录 | 真实 Obsidian / T-02 |
| AC-007 / B07 | React 更新、切标签、隐藏/显示 | 不重复导航、不新建 guest，不丢页面内存；资源数量有上限 | 真实 Obsidian / T-03 |
| AC-008 / B08 | 个人 Space 被 Agent 读取/截图/打开/控制 | 公共服务及外部 transport 均拒绝，不泄漏标签/标题/内容 | 服务/适配集成 + 必要宿主验证 / T-04 |
| AC-009 / B09 | 任务 Space 未授权、授权给另一任务 | 拒绝；模型伪造 taskId/spaceId 不获得能力 | 服务/适配集成 + 必要宿主验证 / T-04 |
| AC-010 / B10 | Agent 队列等待时人工接管 | 接管不排队；待派发动作取消，旧异步后续不继续输入 | 真实 Obsidian / T-04 |
| AC-011 / B11 | 校验后派发前撤权竞态 | 最终主进程 fence 拒绝旧代次，不仅前端 token 检查通过 | 真实 Obsidian / T-04 |
| AC-012 / B12 | 点击已派发后断连/超时 | 准确 unknown，不自动再点击；可以重新观察/人工确认 | 服务/适配集成 + 必要宿主验证 / T-05 |
| AC-013 / B13 | 相同 requestId 重试/不同参数 | 合法重试不重复派发，不同参数冲突拒绝；缓存有界 | 服务/适配集成 + 必要宿主验证 / T-05 |
| AC-014 / B14 | 页面跳转、frame 替换、DOM 节点替换 | 旧 ref/document 失效，不点击错节点；明确覆盖范围 | 服务/适配集成 + 必要宿主验证 / T-05 |
| AC-015 / B15 | 长页面、SPA、跨源 iframe、shadow root | 已支持范围正确，未支持显式说明；不降安全配置 | 真实 Obsidian / T-05 |
| AC-016 / B16 | 原生输入、中文 IME、选择/滚动/焦点 | 普通人工体验成立；Agent 表单操作经过真实框架 fixture | 真实 Obsidian / T-05 |
| AC-017 / B17 | Agent 观察态的人类键盘/滚轮/触控 | 不混入写入；接管入口始终可用，guest 内已有焦点也受处理 | 真实 Obsidian / T-04 |
| AC-018 / B18 | 登录跳转、OAuth popup、opener/postMessage | 同 Session、所有权明确；不支持路径准确反馈，不静默改坏认证 | 真实 Obsidian / T-06 |
| AC-019 / B19 | 网页试图获得 Node/remote/IPC/文件系统 | 无宿主权限泄漏，任意主进程脚本入口不存在 | 真实 Obsidian / T-06 |
| AC-020 / B20 | 导航到危险 scheme、重定向、外部协议 | 按策略拒绝/确认；证书错误不全局绕过 | 服务/适配集成 + 必要宿主验证 / T-06 |
| AC-021 / B21 | permission request/check、多 frame、多页 | 策略一致、origin 精确，未知权限默认拒绝，不污染其他 Session | 真实 Obsidian / T-06 |
| AC-022 / B22 | 手动登录/MFA 期间旧 Agent 截图 | 已撤权，迟到图片/文本不再交付；交回后重新授权 | 真实 Obsidian / T-04 |
| AC-023 / B23 | 网页/模型提示要求升级权限或选其他 Space | 数据不变成指令或 grant，最终服务拒绝 | 服务/适配集成 + 必要宿主验证 / T-06 |
| AC-024 / B24 | 文件上传、下载、重名、越界路径、取消 | 只操作授权文件；无穿越覆盖，部分文件有归属/清理 | 真实 Obsidian / T-07 |
| AC-025 / B25 | 材料目标切换/禁用/交付不确定 | 不串会话、不自动提交、不盲目重复附加；来源准确 | 真实 Obsidian / T-08 |
| AC-026 / B26 | 同一 Page 从两个入口/两个窗口打开 | 唯一 guest，或明确聚焦 owner；新开页面明确是新 pageId | 真实 Obsidian / T-03 |
| AC-027 / B27 | owner 窗口关闭、guest 崩溃、未保存网页 | 状态与实际资源一致，有恢复/确认，不误停无关任务 | 真实 Obsidian / T-03 |
| AC-028 / B28 | 模块 disable/re-enable、多次加载 | 无重复事件/guest/broker，无旧 token 复活；失败不影响其他模块 | 真实 Obsidian / T-11 |
| AC-029 / B29 | Session 删除时存在 worker/下载/连接 | 先撤权并收敛再清理，无法完成保持 cleanup-pending；重新打开不恢复已清数据 | 真实 Obsidian / T-11 |
| AC-030 / B30 | 清理失败、进程退出中断、元数据损坏 | 有恢复标记与原文件保护，不显示假成功/空库 | 真实 Obsidian / T-11 |
| AC-031 / B31 | 清空/删除一个 Space | 其他 Space、Vault、Obsidian、系统浏览器及导出文件不受影响 | 真实 Obsidian / T-11 |
| AC-032 / B32 | 外部 Broker 未授权/恶意 Origin/Host/超大请求 | 拒绝且有界，页面不能使用本地接口提升权限 | 服务/适配集成 + 必要宿主验证 / T-10 |
| AC-033 / B33 | 外部连接接管/过期/模块卸载后重连 | 旧凭据失效；应用离线不启动隐藏 runtime | 服务/适配集成 + 必要宿主验证 / T-10 |
| AC-034 / B34 | 浏览器未启用、移动端、缺少宿主能力 | 明确 unsupported/unavailable；不加载 Node/Electron 到移动端路径 | 真实 Obsidian / T-02 |
| AC-035 / B35 | 亮暗、窄面板、长文案、缩放、IME、多窗口 Portal | 主操作/真实地址可达，弹层不被原生 surface 穿透或遮挡 | 真实 Obsidian / T-13 |
| AC-036 / B36 | 源码/产物/发行包全局清理 | 无独立 browser executable、bundle、worker、sealed identity 及旧协议可达路径 | 服务/适配集成 + 必要宿主验证 / T-12 |
| AC-037 / B37 | 正常退出/重启与任务恢复 | 仅恢复允许的元数据和网站数据，不自动恢复 Agent 控制或重放外部效果 | 真实 Obsidian / T-02 |
| AC-038 / B38 | 日志、通知、文件、诊断秘密哨兵 | 无 token/Cookie/密码/认证回调和不必要页面正文泄漏；显式材料留存另有授权 | 服务/适配集成 + 必要宿主验证 / T-05 |
| AC-039 / B39 | 多 Space/多标签规模与空闲 | 单 Page 单 guest，无帧轮询/无界等待；停止后资源回落，预算有前后证据 | 真实 Obsidian / T-13 |
| AC-040 / B40 | 终端与 HUHU Bot 回归 | 未误删它们的 Native/Go/HAP、服务 lease、文件权限或效果保护 | 真实 Obsidian / T-09 |

F01–F12 是全链实施前置 Gate，不以 B 测试映射覆盖掉其环境证明义务；完整合同见 <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/acceptance-matrix.md</Path>。个人→任务转换属于 AC-008/009 的授权子场景：可信 UI 明确告知现有登录范围，保留 partition，撤销旧代次后新授权；Agent 不可自行转换。

## 范围

**IN：** Issue 核心共享/隔离、真实人工浏览、结构化 Agent、撤权、文件/材料、既有消费者、外部 CLI、真实清理、旧链删除与三平台证据。**REUSE：** 现有模块装配、workbench ViewType、ServiceKey/lease、vaultIdentity、窄宿主桥、秘密保护、文件 grant、设计系统和已有测试体系。**OUT：** 本轮产品实施；以后核心版的 Cookie 导入、系统浏览器扫描/解密、任意 evaluate/CDP、全扩展生态、移动端自动化、应用退出后守护运行、未经证明跨窗口无损搬页、高级 MCP；不后置既有 CLI 的切换责任。

## 验证策略

| 层级 | 负责证明 | 不能替代 |
|---|---|---|
| 纯逻辑/合同 | 分类、授权、URL、代次、去重、错误、元数据和删除状态 | 实际 Chromium Session/原生输入 |
| Electron 适配集成 | 真实 guest、permission、driver、popup、下载、清理及竞态 | Obsidian 宿主开放程度与窗口行为 |
| 真实 Obsidian | 完整重启、IME、主/弹出窗口、原生表面与 Portal、真实 Agent、平台差异 | 未测 OS/架构/安装器 |
| 本轮离线原型 | 设计、按钮路径、焦点、响应式、显式状态 | 所有 F/B 产品验收 |

采用仓库实际已有 pnpm 脚本，命令以实施时 package.json 再核对；本轮无 pnpm/product build 运行结果。新宿主探针由 T-01 创建后才登记为可运行命令。

## 约束与风险

<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/ADR.md</Path> 为本 change 架构约束；<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/DESIGN.md</Path> 为浏览器视觉增量草案。Node/Electron 仅 desktop；不新增 ViewType；生产 UI 用 React/shadcn/Tailwind/Radix、模块 t() 双语；prototype 的静态 DOM 不成为生产架构。数据路径改变必须同步实际文档。性能目标用同机基线与 #37 预算，不编造固定节省比例。

## 未决问题

D-013 新原型集中批准待用户；T-01 实机事实待生产者；完整调用图与写集待冻结。ready_for_tickets=false 表示未满足正式 Ready 发布门；用户要求的完整 future draft 拆分已保存，不能据此执行。
