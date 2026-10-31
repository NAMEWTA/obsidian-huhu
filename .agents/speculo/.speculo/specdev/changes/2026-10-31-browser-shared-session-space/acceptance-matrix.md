# 验收矩阵与证据协议

**本文件全部产品 F/B 项当前 NOT RUN。** 离线原型验证另存 UI-001 evidence，只能证明原型，不得回填这里。每项将来记录 commit、平台、安装器、fixture、步骤、退出码/观察、截图/日志、清理及失败分类。无环境=未验，不是通过。

## 环境登记

| 组合 | 最小宿主 1.13.0 | 代表性当前安装器 | 状态 |
|---|---|---|---|
| Windows / 实际发布架构 | 未运行 | 未运行 | 支持范围未证实 |
| macOS / 实际发布架构 | 未运行 | 未运行 | 支持范围未证实 |
| Linux / 实际发布架构 | 未运行 | 未运行 | 支持范围未证实 |

逐环境记录 OS/架构、Obsidian 应用和安装器版本、实际 Electron/Chromium、显示缩放、主/弹出窗口、插件 commit。x64/arm64 不因去掉 Native 编译就默认全部通过。一次性 Vault 与虚构账号/本地 fixture，不能使用真实密码或个人 Cookie。

## Fixture 规格（待 T-01/T-05 建立）

fixture-host：受控同源 A/A2、不同 origin B、跨源 frame、开放 shadow root；Cookie/localStorage/IndexedDB/cache storage/service worker 哨兵；SPA 表单、未提交草稿、滚动、组合输入；OAuth popup opener/postMessage；download/upload、permission；延迟提交/延迟截图；超大/恶意 DOM 返回；beforeunload/crash。记录哨兵摘要而非秘密明文。Electron 独立 fixture 与真实 Obsidian 结果分开。

## P0 宿主门禁

| Gate | 证明对象 | 必须结果 | 证据 / 状态 |
|---|---|---|---|
| F01 | 嵌入 | 主窗口和支持的弹出窗口能创建真实 guest，partition 在首次导航前设定，页面运行于正确 Session | evidence/T-01.md#f01（未来）；NOT RUN |
| F02 | 持久化 | 在测试站写 Cookie/localStorage/IndexedDB，完整退出所有 Obsidian 进程并重开后读取；不是只重载插件 | evidence/T-01.md#f02（未来）；NOT RUN |
| F03 | 共享/隔离 | 同一 Space 两页同 origin 共享预期状态；另一 Space、另一 Vault 不共享；不污染宿主 defaultSession | evidence/T-01.md#f03（未来）；NOT RUN |
| F04 | 宿主桥 | 主进程 Session、guest WebContents、输入、截图、权限和销毁能力能通过窄桥使用，缺失时明确失败 | evidence/T-01.md#f04（未来）；NOT RUN |
| F05 | 安全 | 在网页第一次加载前固定 guest 安全配置、导航/新窗口和权限策略；不能导航后再补保护 | evidence/T-01.md#f05（未来）；NOT RUN |
| F06 | 人机共作 | 人工在页面输入/登录，Agent 对同一 webContentsId 操作，接管不换页面、不刷新、不复制登录态 | evidence/T-01.md#f06（未来）；NOT RUN |
| F07 | 真实交互 | 中文 IME、焦点、滚动、选区、缩放、文件选择、网页对话框、常见登录跳转均有结果 | evidence/T-01.md#f07（未来）；NOT RUN |
| F08 | 弹窗认证 | 受控 popup/新页保持正确 Session；需要 opener/postMessage 的认证流程不因简单“取消后另开 URL”被破坏 | evidence/T-01.md#f08（未来）；NOT RUN |
| F09 | 生命周期 | 切标签、隐藏、关闭、React 更新、模块停用、guest 崩溃与宿主退出没有重复实例、泄漏或假成功 | evidence/T-01.md#f09（未来）；NOT RUN |
| F10 | 控制屏障 | 人工接管优先于等待中的 Agent 队列；旧凭据、迟到响应和已过期元素引用失效 | evidence/T-01.md#f10（未来）；NOT RUN |
| F11 | 删除 | 在 guest、下载及网站后台活动收敛后清理指定 Session，验证已清范围与残留，不触及其他 partition | evidence/T-01.md#f11（未来）；NOT RUN |
| F12 | 多窗口 | 验证同页第二入口、窗口关闭和页面归属；不能用重建 URL 冒充无损迁移 | evidence/T-01.md#f12（未来）；NOT RUN |

## B01–B40 逐项验收

### B01 / AC-001：无 Chrome、无 HUHU runtime 的干净桌面环境

**要求：** 浏览器可直接使用，不下载/启动独立 Chromium

**步骤：** 在没有系统 Chrome 与 HUHU runtime 的一次性环境启动浏览器；监控下载/进程树，禁止出现独立浏览器可执行文件。

**责任与证据：** 首要 T-02；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-02.md#b01`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B02 / AC-002：同 Space 人工登录后 Agent 读取/点击

**要求：** 相同 partition、相同 pageId 的 live webContentsId；无需保存/套用身份

**步骤：** 人工在 fixture 填写状态并记录 registry 的 pageId/guest 身份；交给真实 Agent 读取和点击；对照同一身份与会话，不用 Cookie 拷贝。

**责任与证据：** 首要 T-04；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-04.md#b02`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B03 / AC-003：Agent 修改表单后人工接管，再交回

**要求：** 页面不重建，表单/滚动/上下文保留；新凭据继续，旧凭据失败

**步骤：** Agent 改表单并滚动；人工接管、输入草稿再交回；比较 guest/document 和草稿，发送旧/新凭据各一次。

**责任与证据：** 首要 T-04；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-04.md#b03`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B04 / AC-004：同 Space 同源多页

**要求：** Cookie/localStorage/IndexedDB 按真实浏览器规则共享；不把 tab-local 状态误判为必须共享

**步骤：** 同 Space 两个同源页面写读三类持久站点存储；另测 sessionStorage/JS 不要求跨 tab 共享。

**责任与证据：** 首要 T-02；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-02.md#b04`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B05 / AC-005：不同 Space、不同 Vault、复制 Vault

**要求：** 不串登录；复制同身份文件不意外接管原 partition

**步骤：** 建立两个 Space、两个 Vault 及复制身份文件的 Vault；登录哨兵互查；Windows 路径/符号链接场景也覆盖。

**责任与证据：** 首要 T-02；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-02.md#b05`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B06 / AC-006：Obsidian 完整退出并重启

**要求：** 持久站点数据按合同保留；控制授权不恢复；过期网站会话不被伪报已登录

**步骤：** 写站点存储；完整退出全部 Obsidian 进程；重开读回；同时断言旧 grant 不可用，不把网站过期当失败的持久化证据。

**责任与证据：** 首要 T-02；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-02.md#b06`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B07 / AC-007：React 更新、切标签、隐藏/显示

**要求：** 不重复导航、不新建 guest，不丢页面内存；资源数量有上限

**步骤：** 计数 guest 和导航事件；输入未提交值；反复 React 状态更新、切标签、隐藏/展示/改主题；计数不增加、值保留。

**责任与证据：** 首要 T-03；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-03.md#b07`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B08 / AC-008：个人 Space 被 Agent 读取/截图/打开/控制

**要求：** 公共服务及外部 transport 均拒绝，不泄漏标签/标题/内容

**步骤：** 分别从内部服务和 Broker 对个人 Space 调用 list/observe/screenshot/open/control；断言无标题/内容泄漏；可信 UI 转换后才可重新授权。

**责任与证据：** 首要 T-04；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-04.md#b08`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B09 / AC-009：任务 Space 未授权、授权给另一任务

**要求：** 拒绝；模型伪造 taskId/spaceId 不获得能力

**步骤：** 用未授权、另一任务、伪造模型 taskId 调每类读写；结果拒绝且无真实副作用。

**责任与证据：** 首要 T-04；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-04.md#b09`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B10 / AC-010：Agent 队列等待时人工接管

**要求：** 接管不排队；待派发动作取消，旧异步后续不继续输入

**步骤：** 阻塞普通 waitFor；触发人工接管；记录撤权时间与队列顺序，旧 wait/queued 输入取消且不等待普通队列。

**责任与证据：** 首要 T-04；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-04.md#b10`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B11 / AC-011：校验后派发前撤权竞态

**要求：** 最终主进程 fence 拒绝旧代次，不仅前端 token 检查通过

**步骤：** 测试 seam 在校验后、主进程输入前挂 barrier；撤权后释放 barrier，旧代次必须在最终 fence 被拒绝。

**责任与证据：** 首要 T-04；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-04.md#b11`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B12 / AC-012：点击已派发后断连/超时

**要求：** 准确 unknown，不自动再点击；可以重新观察/人工确认

**步骤：** 派发提交后主动断连接或让响应超时；服务器记副作用次数；回执 unknown，客户端不得重发。

**责任与证据：** 首要 T-05；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-05.md#b12`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B13 / AC-013：相同 requestId 重试/不同参数

**要求：** 合法重试不重复派发，不同参数冲突拒绝；缓存有界

**步骤：** 同 requestId+参数重复发、同 ID 换参数、跨代次重放；测缓存过期/容量与响应，真实派发不重复。

**责任与证据：** 首要 T-05；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-05.md#b13`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B14 / AC-014：页面跳转、frame 替换、DOM 节点替换

**要求：** 旧 ref/document 失效，不点击错节点；明确覆盖范围

**步骤：** 观察后导航、替换 iframe、替换同位置 DOM 节点；旧 ref 全拒绝，重新观察定位新节点。

**责任与证据：** 首要 T-05；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-05.md#b14`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B15 / AC-015：长页面、SPA、跨源 iframe、shadow root

**要求：** 已支持范围正确，未支持显式说明；不降安全配置

**步骤：** 长页/SPA/同源与跨源 frame/open shadow；核对覆盖列表、截断与 unsupported；验证 webSecurity 未变。

**责任与证据：** 首要 T-05；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-05.md#b15`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B16 / AC-016：原生输入、中文 IME、选择/滚动/焦点

**要求：** 普通人工体验成立；Agent 表单操作经过真实框架 fixture

**步骤：** 真实人工中文 IME、复制选区/滚动/缩放；Agent 在受控框架输入，核验真实事件/值和焦点，不只 synthetic event。

**责任与证据：** 首要 T-05；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-05.md#b16`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B17 / AC-017：Agent 观察态的人类键盘/滚轮/触控

**要求：** 不混入写入；接管入口始终可用，guest 内已有焦点也受处理

**步骤：** 授权前让焦点留在 guest；Agent 控制时尝试键盘、滚轮、触控、菜单和导航快捷键；不能混入写入，接管可键盘触达。

**责任与证据：** 首要 T-04；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-04.md#b17`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B18 / AC-018：登录跳转、OAuth popup、opener/postMessage

**要求：** 同 Session、所有权明确；不支持路径准确反馈，不静默改坏认证

**步骤：** 受控 OAuth popup 与 opener/postMessage 完成；记录 Session/owner；不支持路径明确错误，不能以 URL 重开当成功。

**责任与证据：** 首要 T-06；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-06.md#b18`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B19 / AC-019：网页试图获得 Node/remote/IPC/文件系统

**要求：** 无宿主权限泄漏，任意主进程脚本入口不存在

**步骤：** 恶意网页探测 require/remote/IPC/文件路径/宿主对象；导航前安全属性已固定，访问拒绝。

**责任与证据：** 首要 T-06；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-06.md#b19`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B20 / AC-020：导航到危险 scheme、重定向、外部协议

**要求：** 按策略拒绝/确认；证书错误不全局绕过

**步骤：** 顶层危险 scheme、HTTP redirect、外部协议、证书错误；校验逐次策略，外部程序只在可信 UI 白名单确认后打开。

**责任与证据：** 首要 T-06；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-06.md#b20`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B21 / AC-021：permission request/check、多 frame、多页

**要求：** 策略一致、origin 精确，未知权限默认拒绝，不污染其他 Session

**步骤：** 同 Session 多页、不同 frame 请求与 check 同权限；确认 origin/frame/期限匹配，未知权限拒绝且别的 Session 不变。

**责任与证据：** 首要 T-06；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-06.md#b21`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B22 / AC-022：手动登录/MFA 期间旧 Agent 截图

**要求：** 已撤权，迟到图片/文本不再交付；交回后重新授权

**步骤：** 开始延迟 capture/observe 后接管输入 MFA；释放旧响应；调用方不能收到迟到正文/图片；新授权后重新采集。

**责任与证据：** 首要 T-04；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-04.md#b22`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B23 / AC-023：网页/模型提示要求升级权限或选其他 Space

**要求：** 数据不变成指令或 grant，最终服务拒绝

**步骤：** 页面与模型返回伪造管理员指令/文件路径/Space ID；验证不改变 scope/token/权限审批。

**责任与证据：** 首要 T-06；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-06.md#b23`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B24 / AC-024：文件上传、下载、重名、越界路径、取消

**要求：** 只操作授权文件；无穿越覆盖，部分文件有归属/清理

**步骤：** 下载取消/超限/重名/路径穿越/符号链接，上传错误 grant；验证受控路径与部分文件清理、导出授权分离。

**责任与证据：** 首要 T-07；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-07.md#b24`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B25 / AC-025：材料目标切换/禁用/交付不确定

**要求：** 不串会话、不自动提交、不盲目重复附加；来源准确

**步骤：** 材料 capture 后切目标、禁用模块、交付后模拟 ACK 丢失；只填原确认输入、不发送、不再次追加。

**责任与证据：** 首要 T-08；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-08.md#b25`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B26 / AC-026：同一 Page 从两个入口/两个窗口打开

**要求：** 唯一 guest，或明确聚焦 owner；新开页面明确是新 pageId

**步骤：** browser 与 Agent 标签同时打开同 pageId；另一窗口引用；比较 guest 数；不支持跨窗显示时只聚焦 owner。

**责任与证据：** 首要 T-03；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-03.md#b26`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B27 / AC-027：owner 窗口关闭、guest 崩溃、未保存网页

**要求：** 状态与实际资源一致，有恢复/确认，不误停无关任务

**步骤：** 关闭 owner/kill guest/beforeunload 拒绝丢弃；观察 paused/crashed/closed 与真实句柄一致，不关闭其他任务。

**责任与证据：** 首要 T-03；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-03.md#b27`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B28 / AC-028：模块 disable/re-enable、多次加载

**要求：** 无重复事件/guest/broker，无旧 token 复活；失败不影响其他模块

**步骤：** 模块连续 disable/enable 并故障注入 dispose；统计 listener/guest/broker，旧 token 永不复活，其他模块继续工作。

**责任与证据：** 首要 T-11；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-11.md#b28`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B29 / AC-029：Session 删除时存在 worker/下载/连接

**要求：** 先撤权并收敛再清理，无法完成保持 cleanup-pending；重新打开不恢复已清数据

**步骤：** Service worker 持续写、活动下载与连接时删除；测试收敛和存储哨兵；未完成必须 cleanup-pending。

**责任与证据：** 首要 T-11；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-11.md#b29`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B30 / AC-030：清理失败、进程退出中断、元数据损坏

**要求：** 有恢复标记与原文件保护，不显示假成功/空库

**步骤：** 在 tombstone/关闭/清理各阶段中断；损坏元数据；重启重试，保留原文件及阶段，不显示空库/假成功。

**责任与证据：** 首要 T-11；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-11.md#b30`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B31 / AC-031：清空/删除一个 Space

**要求：** 其他 Space、Vault、Obsidian、系统浏览器及导出文件不受影响

**步骤：** 在其他 Space/Vault/system browser/user exports 放哨兵；仅删除目标 Space 后比较所有非目标未变。

**责任与证据：** 首要 T-11；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-11.md#b31`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B32 / AC-032：外部 Broker 未授权/恶意 Origin/Host/超大请求

**要求：** 拒绝且有界，页面不能使用本地接口提升权限

**步骤：** 无 token、错误 Host/Origin、深层/超大 JSON、并发与未知方法；Broker 有界拒绝，无网页提权。

**责任与证据：** 首要 T-10；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-10.md#b32`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B33 / AC-033：外部连接接管/过期/模块卸载后重连

**要求：** 旧凭据失效；应用离线不启动隐藏 runtime

**步骤：** 先建外部连接，再接管/过期/卸载并重连；旧授权拒绝；宿主离线 CLI 明确不可用，不启动后台浏览器。

**责任与证据：** 首要 T-10；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-10.md#b33`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B34 / AC-034：浏览器未启用、移动端、缺少宿主能力

**要求：** 明确 unsupported/unavailable；不加载 Node/Electron 到移动端路径

**步骤：** disabled、移动端、桥/能力缺失分别测试；结果明确，Node/Electron 不进入移动端模块到达图。

**责任与证据：** 首要 T-02；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-02.md#b34`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B35 / AC-035：亮暗、窄面板、长文案、缩放、IME、多窗口 Portal

**要求：** 主操作/真实地址可达，弹层不被原生 surface 穿透或遮挡

**步骤：** 真实 Obsidian 亮暗/用户主题、窄页/长中英文、200%缩放、中文 IME、弹出窗口 Portal；菜单/Dialog 不被原生 guest 穿透。

**责任与证据：** 首要 T-13；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-13.md#b35`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B36 / AC-036：源码/产物/发行包全局清理

**要求：** 无独立 browser executable、bundle、worker、sealed identity 及旧协议可达路径

**步骤：** 对实际源码/动态引用/生成产物/发行包扫描；核对每条旧清单与说明性例外；禁止仅改名或 legacy 目录。

**责任与证据：** 首要 T-12；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-12.md#b36`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B37 / AC-037：正常退出/重启与任务恢复

**要求：** 仅恢复允许的元数据和网站数据，不自动恢复 Agent 控制或重放外部效果

**步骤：** 结束 task、正常退出与恢复；站点/过滤 metadata 可恢复，控制 token/操作不恢复，不自动重放未知效果。

**责任与证据：** 首要 T-02；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-02.md#b37`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B38 / AC-038：日志、通知、文件、诊断秘密哨兵

**要求：** 无 token/Cookie/密码/认证回调和不必要页面正文泄漏；显式材料留存另有授权

**步骤：** 往 token/Cookie/password/OAuth callback/页面正文注入秘密哨兵；扫描日志、通知、文件、diagnostic；显式材料另按授权留存。

**责任与证据：** 首要 T-05；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-05.md#b38`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B39 / AC-039：多 Space/多标签规模与空闲

**要求：** 单 Page 单 guest，无帧轮询/无界等待；停止后资源回落，预算有前后证据

**步骤：** 同机多 Space/多标签负载，记录 guest/监听/内存/CPU/队列/打开与接管延迟；空闲/关闭资源回落，按 #37 现有预算判断。

**责任与证据：** 首要 T-13；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-13.md#b39`；未来创建，不预造通过记录。**当前：NOT RUN。**

### B40 / AC-040：终端与 HUHU Bot 回归

**要求：** 未误删它们的 Native/Go/HAP、服务 lease、文件权限或效果保护

**步骤：** 运行真实终端、Bot/HAP、模块 lease 与文件授权/效果保护回归；确认未被 Native/lease 关键词误删。

**责任与证据：** 首要 T-09；最终 T-13 汇总固定 commit。Evidence 目标为 `evidence/T-09.md#b40`；未来创建，不预造通过记录。**当前：NOT RUN。**

## 性能与预算

冷/热启动、打开工作台、首个网页、接管延迟、输入、截图、内存、空闲 CPU、guest/listener、JS/CSS eager/activation 包体同机前后采样。采用相同站点 fixture、窗口和标签数、版本与采样方法；报告分布与失败，不只均值，不承诺预设省内存百分比。#37 预算不能静默调宽。活跃 guest/请求/图片/下载/队列有上限；自动休眠会丢内存，未经明确产品合同不得悄悄丢弃有草稿页面。

## 命令与证据真实性

源 Issue 已列 lint、format:check、test:unit、architecture、i18n、docs、workbench、safety、styles、notices、build、bundle 等现有命令。实施时按 package.json 和测试参考选择；本轮没有运行它们。不能把尚不存在的新 browser-electron 测试命令写成已通过。官方 SpecDev 检查与离线自检分开，详见 <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/validation/report.md</Path>。
