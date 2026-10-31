# Browser #38：共享 Session 全量重构实施计划

## 0. 交付状态与实施基线

本文件对应 [Issue #38](https://github.com/NAMEWTA/obsidian-huhu/issues/38) 及两条 hello-halo 补充研究评论。实施基线为 `dev@974105b47e03c108df0f5e0c3fc9606fe4b79aee`，核对日期为 2026-10-31。Issue 原文的 `2670440…` 不是本次提交的父基线。

**本批是已实现的 P0 探针和全量实施计划，不是生产浏览器已经完成替换的声明。** 当前没有改写 `src/modules/browser`、没有删除 Native 链路、没有重建 `main.js/styles.css`，也没有完成真实 Obsidian 或三平台验收。PR 必须保持 Draft，使用 `Refs #38`，不得以本批关闭 Epic。

已读取现有 `AGENTS.md`、开发/测试规则、browser 公共 API、module 装配、desktop composition、通用主进程窄桥、一次性 Vault 启动器与旧浏览器验收入口。完整消费者调用图、逐文件删除清单与发行可达性扫描仍是 P0 待完成项；本文件不会把 Issue 提到的路径冒充为本批已全面审计的结果。

| 当前交付 | 真实状态 |
|---|---|
| 固定主进程策略探针、合成站点、真实宿主执行脚本 | 已编写；脚本策略和站点测试已执行，真实宿主执行未完成 |
| 授权代次、最终派发检查、迟到结果丢弃与原页输入清理 | 探针实现与 mock 合同测试通过；不是生产 Agent 接线 |
| 一次性 Vault 启动器 | 增加保留 sandbox、要求正常退出两个可选参数，原调用默认参数保持不变 |
| 无 Obsidian 时的报告 | 非零退出，明确 `blocked`；不把跳过写成通过 |
| P1–P5 产品实施 | 未完成，以下任务和退出条件是必须落实的剩余工作 |

运行方法和证据边界见 [P0 验收说明](../e2e/browser-shared-session.md)。

## 1. 不再讨论的产品与架构合同

最终只有一条链：现有工作台/内部 Agent/薄外部适配 → browser 公共服务 → 授权与动作入口 → Obsidian Electron 内的 Session/Page registry → 同一个真实 guest。没有第二份 Chromium、Native supervisor、帧浏览器、身份复制或旧协议回退。

一个持久 Space 对应一份命名空间内的 Electron Session；一个 live `pageId` 对应唯一 guest。共享 Session 不等于共享页面内存，同 URL 也不等于同页。人工登录、Agent 操作、接管和再次交回不得更换 guest、刷新页面或复制 Cookie。

个人 Space 禁止 Agent 观察和操作；任务 Space 必须由可信 UI 显式委托。以 Space 为单写者范围。接管优先于等待队列；主进程最终派发边界执行代次检查；撤权后不再交付旧截图、文本或观察。已发出的网页请求与已经发生的点击不能回滚，不确定效果不得自动重试。

使用既有 TypeScript/React、模块生命周期、工作台 ViewType、服务键、i18n 和设计系统。Node/Electron 产品代码仅在 `desktop/` 下，移动端只得到明确不可用，不影响其他模块。浏览器不依赖某个 Agent harness；本批不改写 BOT 引擎或 Go/HAP 体系。

## 2. 当前代码与必须改造的边界

以下入口已读取到本次基线，后续提交必须同时修改生产者和消费者，而非给旧 runtimeFactory 增加 backend 分支。

| 入口 | 当前事实 | 目标处理 |
|---|---|---|
| `src/modules/browser/api.ts` | Workspace 混合安装运行时、身份导入、帧订阅、控制租约；Agent 使用 prepare/execute 旧合同 | 保留有价值的服务键，重写类型和方法；删除旧合同，不做 wire 兼容 |
| `src/modules/browser/module.ts` | browser 独立激活，UI/desktop 动态加载，材料发现 `activate:false` | 保留这些集成位置，重写装配；不新增 ViewType，不启用全部 Agent 模块 |
| `src/modules/browser/platform/desktop/composition.ts` | 装配 runtime、凭据、系统浏览器读取、staging、旧持久化与 RPC | 整体替换为 Session/guest/元数据/文件授权适配 |
| `src/host/desktop/electron-main.ts` | 现有 `desktopRemote` 和固定源码 `bundledMain` | 复用通用桥；浏览器策略归 browser，不将模型参数拼入主进程源码 |
| `scripts/obsidian-acceptance/fresh-vault.mjs` | 真实宿主一次性 Vault/profile/证据机制 | 复用，不另建真实宿主测试工程；安全探针不得用关闭 sandbox 获得假阳性 |
| `scripts/obsidian-acceptance/agent-browser-v2.mjs` | 旧验收依赖完整 Native bundle | 提取仍成立的用户场景；完成新验收后退出旧架构专属脚本 |

消费者扫描不能只搜索 `BROWSER_*`，还需查类型导入、动态入口、CLI 构建字符串、服务获取和发行资产。必须记录：文件、旧方法、目标新方法、所有者、对应测试、删除/重写/保留理由。至少覆盖 browser 页面、Agent 浏览器标签、笔记链接、材料 consumer、CLI/MCP 说明、HAP 调用边界、设置和安装/发行脚本。不存在的 BOT 集成不得标成“已迁移”。

## 3. P0：先取得真实宿主证据

### 3.1 本批已经实现的纵向实验

`browser-shared-session.mjs` 使用现有一次性 Vault 启动器，安装固定主进程策略，创建真实 webview 候选，访问只含合成数据的 loopback 测试站。策略与页面数据分离；没有生产外部 broker，也不下载浏览器。

主进程策略只处理本探针命名空间和合法一次性 attach token，设置安全 webPreferences，保留其他插件监听和 guest。Session permission request/check 默认拒绝。页面导航只允许当前测试站和受控初始地址；popup、下载均明确拒绝。

脚本尝试验证同 Space 多页存储共享、不同 Space 隔离、同页隐藏/恢复、AX/CDP 点击/截图、接管旧凭据拒绝、正常完整退出后的 Cookie/localStorage/IndexedDB、重启不恢复旧授权、指定 Space 清理后另一 Space 保留。

这套程序不导入生产插件，不是一套临时生产后端，不提供可直接合并的完整浏览器。测试站 `seed/inspect` 是可信测试功能，不是允许 Agent 任意读写网页的公共 API。其固定随机 namespace 也不能代替生产 Vault 根绑定方案。

### 3.2 必须逐项补齐的宿主门禁

| 门禁 | 自动探针提供的验证入口 | 仍需的真实证据 |
|---|---|---|
| F01 嵌入 | 主窗口真实 webview/Session 归属 | 所支持弹出窗口、缩放、最小宿主版本 |
| F02 持久化 | 正常退出重开后读三种存储哨兵 | 三平台安装器及异常退出区别；不能只热重载 |
| F03 共享与隔离 | 同 Space 两页与另一 Space | 实际第二 Vault、复制 Vault、路径规范化和重复 owner |
| F04 主进程桥 | 固定策略、AX、CDP、capture | 目标安装器实际可用性与失败诊断 |
| F05 安全 | attach 前选项、策略单测、有效配置读取 | 恶意页面测试、OS sandbox、其他插件并存、重定向/frame |
| F06 人机共作 | 同 guest 的测试写入/点击/接管 | 人工登录与真实 Agent 公开服务闭环，不能用合成 seed 替代 |
| F07 原生交互 | 合成按钮点击 | 中文 IME、焦点、选区、滚轮、文件框、网页对话框 |
| F08 OAuth popup | 本批明确阻止，未支持 | 正确 Session、opener/postMessage 和关闭行为 |
| F09 生命周期 | 固定 DOM 节点隐藏/恢复 | 实际 React、模块启停、崩溃、超时 attach、owner 关闭 |
| F10 撤权屏障 | 派发/结果检查和竞态单测 | 长等待队列、真实键盘/滚轮/触摸输入门禁及调用方生命期 |
| F11 删除 | 空闲合成站点清理与失败传播 | 活跃 service worker/下载/连接、恢复标记与中断后重试 |
| F12 多窗口 | 未覆盖 | 同页第二入口聚焦 owner，不创建替身页 |

所有平台实机项目前均为**未执行**。脚本成功也只写 `automated-probe-passed`，始终保留 `p0Complete:false`，不能自动批准唯一生产表面或关闭 Epic。

首选 webview 仍须正面处理 Electron 官方维护警告和宿主 `webviewTag` 条件。若不满足必要门禁，在同一合同下验证 WebContentsView，再冻结唯一表面；不是同时发布两套实现。二者都不能满足时记录发布阻断，不恢复 Native。

## 4. P1：Session、唯一 Page 与普通人工浏览

### 4.1 领域与存储

拟落点：`core/model.ts`、`core/ports.ts`、`core/errors.ts`、`platform/desktop/metadata-repository.ts`、`electron/session-manager.ts`、`electron/page-registry.ts`。小职责可合并，不预建空目录。

Space 记录包含随机 id、label、personal/task、storageGeneration、时间和删除状态。Page 持久记录与运行态分离；运行态包含 owner、documentGeneration、creating/ready/loading/crashed/closing/closed。裸 Electron 对象只在 adapter 内。

partition 采用 `persist:huhu.browser.<vaultScope>.<deviceId>.<spaceId>.<storageGeneration>`。`vaultScope` 绑定既有 vaultId 与规范化本机 Vault 根，覆盖 Windows 大小写/分隔、符号链接、复制身份和重复打开。路径搬迁默认产生安全的新绑定，不偷偷寻找旧 Session。日志不输出原始私有路径。

元数据新格式位于 `.huhu/browser/<deviceId>/workspace.json`，使用原子写入、严格 schema、并发 owner 与删除恢复记录。损坏文件保留并报错，不覆盖为空库。网站存储由 Electron 管理，明确不随 Vault 同步；不调用全局 `app.setPath`。恢复 URL 过滤认证回调/一次性 token，保护不可用时不明文降级。

### 4.2 页面与 UI

按 P0 冻结的表面建立稳定 guest owner。React 只绑定展示位置，重渲染不重复写 `src`，切标签不重建页面。跨窗口同页默认聚焦 owner；“新开同地址”产生新 pageId，不伪装成迁移。

重写工作台为 Space 导航、页签、真实地址、前进/后退/刷新/停止、加载/错误、控制状态、下载入口。复用 `.huhu-ui`、现有圆角/语义 token、Radix Portal 与 en/zh，不照搬第三方主题。地址草稿不随 title/loading 事件被覆盖。原生表面对菜单/Dialog 的遮挡、ownerDocument、窄面板、200% 缩放、reduced-motion 必须实测。

退出条件：真实人工浏览成立；同 Space 共享、跨 Space/Vault 隔离和完整重启有证据；一个 pageId 只有一个 guest；未支持平台显示准确原因。P1 不授予 Agent 控制。

## 5. P2：控制权、Agent Driver 与两个 Action

### 5.1 控制服务和最终屏障

拟落点：`core/control.ts`、`services/control-service.ts`、`services/agent-access.ts`、`platform/desktop/electron/host-policy.ts`、`operation-scope.ts`。

状态 human → 用户明确 handoff → agent-controlled；接管/结束回 human，异常转 paused/unavailable。个人 Space 需先由可信 UI 显式转换类型，转换保持 Session 并撤销旧凭据。模型无授予/续期/提权入口。

授权绑定实际调用方、任务、实例 nonce、Space、允许动作、控制代次及期限。服务和最终主进程屏障约定同一生效点；排队、派发、异步续步、结果交付重复校验。撤权不排队，旧等待立即取消；交回生成新 token/代次并重新观察。已经派发的副作用返回未知，不宣称取消等于回滚。

Agent 模式保留真实页面可见，处理 guest 已有焦点、键盘、滚轮、触控和工具栏；不能只用 `pointer-events:none`。输入资源只向原 guest 释放本操作按下状态，不跟随 active tab。Debugger 有明确 owner，detach 后暂停并废弃引用，不抢占 DevTools 或其他调试器。

### 5.2 结构化动作和观察

拟落点：`core/commands.ts`、`core/observation.ts`、`core/tool-catalog.ts`、`electron/cdp-session.ts`、`snapshot.ts`、`page-driver.ts`、`input/`。

最小动作：页面目录/open/activate/close，navigate/back/forward/reload/stop，observe/screenshot，click/fill/type/press/select/check/scroll/waitFor。每个动作有参数、队列、时间、输出大小上限和稳定错误码。上传仅在 file grant 完整时开放。模型不能传任意 JS、CDP method、系统路径、Cookie 或 webContentsId。

AX 引用绑定 Space/Page/document/frame/observation/controlGeneration，限制节点、文本与深度，默认不返回密码和隐藏认证值；导航/frame/DOM 改变后复核。至少主文档、实际支持的同源 frame、公开 shadow root 有真实 fixture；跨源不支持时明确说明，不关闭 webSecurity。

内存 requestId 去重作用域含实例/授权代次，同 ID 不同参数拒绝，有界缓存记录 queued/dispatched/completed/unknown。调用方重试不可重复点击；重启不恢复旧授权或重放效果。

### 5.3 Action 和人机请求

只先做两项：页面材料提取（预览后填入选定输入框，不发送会话）；测试站声明字段填写（读回校验、逐项部分结果、不提交）。Action 目录同时驱动工具、UI 菜单和状态卡；包含 id/version、Schema、origin、能力、效果与确认要求。

首选 TypeScript 组合既有结构化动作，逐步回到撤权边界；不引入 DSL/Agent loop。短页面函数必须固定、审核和有界；任意文件脚本/动态 evaluate 不作为默认能力。脚本超时不等于页面 fetch 已取消。

“查看”只聚焦确切 pageId；“我来操作”撤权；“我已处理，继续”新授权、新观察；“停止任务”不关页、不删登录；关页与删 Space 单独确认。人工登录/MFA 留在网页，不要求把秘密输入聊天卡。用户请求绑定任务/页面/操作版本，过期回答不能解锁新任务。

退出条件：人工→Agent→人工→Agent 的真实同页闭环、读写撤权竞态、未知效果、Action 部分失败均通过；不仅仅工具返回没报错。

## 6. P3：消费者、文件和外部接入同步切换

`api.ts` 保留 `BROWSER_WORKSPACE`、`BROWSER_AGENT_ACCESS`、`BROWSER_OPEN`、`BROWSER_MATERIAL_CONSUMERS` 的集成价值，不保留旧方法语义。

browser 页面与 Agent 页签只引用同一 registry。笔记链接经新 opener。材料贡献保持惰性发现，采集来源绑定文档与时间；捕获、选目标、交付前均检查生命期；交付未知不自动重复附加。安全文本/Markdown 进入宿主，不直接插入网页 HTML。

Session 下载按登记 guest 映射 Space/Page；未归属下载拒绝。用户手动保存与 Agent 受控文件 handle 分离，文件名不是路径授权；覆盖、穿越、符号链接、数量/大小、部分文件与取消有测试。上传只接受用户选择或已有可信 grant。已导出文件不因删 Space 连带删除。

内部 BOT 经现有 Host/HAP 边界调用公开服务，不让 Go 持 Electron 或读系统 Cookie。应补一条实际 Agent 任务闭环；具体调用方接口以消费者扫描结果为准，不随本次浏览器工作替换 BOT 引擎。

已有 CLI 不得继续使用旧 wire。确需外部接入时仅建一个按需 loopback HTTP broker，随机端口、短期凭据、Host/Origin、无 CORS、限流/队列/请求体/响应体上限和即时撤权。CLI 是薄客户端；MCP 使用项目可接受的锁定 SDK、映射同一 catalog，不将普通 JSON HTTP 自称 MCP。明确记录外部能力实现/移除/后置决定，不留失效按钮。

退出条件：消费者清单全部有结果，无旧 API 引用；公开服务、外部入口使用同一权限合同；真实文件与材料任务无串页/串会话。

## 7. P4：清理、无兼容切换与发行链

### 7.1 新 Session 删除流程

可信 UI 确认范围 → 写 deleting/tombstone → 拒绝新操作并撤权 → 收敛 guest/下载/站点后台活动 → 宿主支持的 storage/cache/auth/connection 清理 → 验证 → 清理自有临时文件/元数据。失败保留 `cleanup-pending` 和重试，不先删元数据掩盖失败。

不假造 `session.destroy()`，不承诺物理目录全部消失或安全擦除，不递归删除 Obsidian userData。停用默认保留网站数据，但撤销授权和释放自有资源。卸载不等于清空账号，设置/文档说明残留与显式清理方法。

### 7.2 必须完成的物理删除清单

| 范围 | 删除/替换内容 | 结束证据 |
|---|---|---|
| `native/browser-runtime/` | supervisor、Chromium 管理、cookie reader、专属 Cargo/测试/说明 | 源码和发布资产均不存在 |
| `browser/platform/desktop/runtime/` | adapter/factory、worker、host-main、进程协议、bundle 与旧生成文件 | 无旧目录生产可达入口 |
| 根 worker 资产与 worker tsconfig | `browser-worker.cjs`、摘要、`tsconfig.browser-worker.json`、旧 digest/main-source 生成路径 | 构建、安装、摘要校验不再引用 |
| browser 构建/检查脚本 | 旧 runtime builder、Native verify/accept、package scripts | 新构建完整运行，无失效命令 |
| 旧 CLI/RPC | 旧 client/摘要、协议客户端、说明和发行引用 | 替换为新薄适配或明确移除 |
| identity/cookies/core identity | sealed identity、系统 profile 扫描、native SQLite/解密、staging | 新 Session 不依赖旧身份代码 |
| 旧 persistence/profile/recovery | 独立 profile、进程回收、runtime ownership 账本 | 新格式不双读双写，不启动旧 supervisor |
| 帧与人工输入链 | BrowserFrame、subscribeFrames、HumanInput、viewer/window/frame 租约 | 人工浏览使用真实 guest，无帧轮询 |
| 旧 Native Agent 账本 | prepare/execute、heartbeat、RunGrant wire 及存储 | 新授权/未知效果合同实际替代 |
| UI/设置/i18n/帮助 | bundle 安装、Linux-only、保存/套用身份等失效入口 | en/zh 与能力显示一致 |
| CI/release/依赖许可 | 附件、复制、缓存、manifest/checksum、Native 专属依赖 | 发行目录与依赖图扫描，notices 按实际内容更新 |
| 文档与构建产物 | browser/data/开发规则/样本；重新生成 `main.js/styles.css` | 不只删 TS 而继续发布旧可执行代码 |

禁止误删 `native/pty-server`、`native/huhubot`、Go/HAP、通用 ServiceLease、文件授权、`secret-protector` 和通用桌面窄桥。不能按 native/lease/credential 关键词全库盲删。

旧用户 `.huhu/browser/<device>/v2` 默认保留且新实现不读取；不迁移、不静默删除。清理须明确确认范围，不触及其他模块/系统浏览器。升级前正常停旧运行时并退出宿主，避免残留；撤回代码不等于让旧版本接管新 Session。

生产可达性扫描同时覆盖 TS import、字符串动态路径、生成代码、构建脚本、发行附件和 CLI 提示。历史证据可列说明性例外；不靠改名、legacy/、注释或永久 flag 算删除。

## 8. P5：验收、预算与合入条件

| 验收组 | Issue 对应 | 验证方式 |
|---|---|---|
| 真共享与持久化 | B01–B07、H01/H04/H10 | 实际主/弹出窗口，真实同页状态，完整退出重启，跨 Vault |
| 授权和效果 | B08–B14、B17/B22/B23、H03/H06–H08/H13/H14 | 最终派发竞态、长等待中接管、迟到响应、幂等/未知结果 |
| 页面与输入 | B15/B16/B18–B21、H05/H16/H17 | iframe/shadow/IME/焦点、权限、重定向、OAuth、其他插件并存 |
| 文件和材料 | B24/B25、H09/H11/H12 | 文件 grant、越界/取消、目标切换、Action 身份和版本 |
| 生命周期清理 | B26–B31/B37、H02/H15 | owner 关闭、React 竞态、禁用/重启、活跃后台清理、损坏恢复 |
| 外部和支持边界 | B32–B35 | broker Host/Origin/体积/撤权，移动端不可达，主题/缩放/Portal |
| 全局收口 | B36/B38–B40 | 源码/发行扫描、秘密哨兵、资源/性能预算、终端/BOT 回归 |

每项记录实际 commit、平台/架构、Obsidian 应用与安装器/Electron/Chromium、fixture、步骤和结果。Windows/macOS/Linux 未测组合保持未测，不因为不再编译 Native 就标支持。

生产 TS 改动执行 `pnpm run build`、`pnpm run lint`，按风险执行 browser/消费者 Vitest、`pnpm test:architecture`、`pnpm test:i18n`、`pnpm test:docs`、`pnpm run check:bundle` 及样式/发行检查。最终原生边界和全量切换扩大到仓库全量回归。每个退出码与实际覆盖分别记录，跳过不是通过，mock 不是实机。

预算记录同机前后冷/热启动、首屏、接管、截图、输入延迟、guest/监听数量、空闲 CPU/内存和包体；不预设节省百分比、不调高阈值掩盖退化。限制活跃页、队列、快照、截图、下载与缓存；不能为节省内存静默丢弃含未保存表单的 live 页。

## 9. 推荐提交序列与阻断规则

| 提交批次 | 主要变更 | 前置和退出条件 |
|---|---|---|
| C0：本批 | 计划、独立 P0 探针、测试与证据说明 | 可审查但不表示 P0/产品完成 |
| C1 | 完整影响清单、P0 宿主证据、唯一表面决定、许可记录 | 必需宿主门禁通过；缺证据不伪造批准 |
| C2 | 新模型/元数据/Session/guest/人工工作台 | P1 共享、隔离、稳定生命周期 |
| C3 | 公共 API、授权屏障、AX/输入/截图、控制 UI | P2 同页完整闭环和竞态测试 |
| C4 | 两个 Action、材料、文件、Agent/CLI/MCP 接线 | 所有生产者/消费者同步，无双协议 |
| C5 | Native/worker/身份/帧物理删除、构建/CI/notices/文档/产物 | P4 静态和发行清理通过 |
| C6 | 三平台实机、完整重启、故障/安全/性能/其他模块回归 | P5 全矩阵有证据后转 Ready，才允许关闭 #38 |

可以在同一重构分支逐步 commit，但不能把不完整中间态合入 dev。合入前再次记录 dev SHA 并审查并行变更，尤其 #37 设计系统与 BOT 引擎改造；不在本分支重复重写它们。

## 10. 复用、来源与许可

Halo 固定参考 `openkursar/hello-halo@476291ca8380a9540ffde1aa82ee098456169a9f`。本批只借鉴 attach 前同步策略、唯一 guest 和直接 CDP 的设计，没有复制上游代码。其 LICENSE 含 MIT 正文及 Additional Terms，不能标为无附加条款的标准 MIT。本批不作法律兼容性批准。

后续优先逐文件评估 `ai-browser/snapshot.ts`、`browser-input/*`、`browser-host/manager.ts`、`renderer/browser-host/host.ts`、context 的操作目标/取消部分、tools Schema 和 live-view 测试。每次迁入记录完整来源、固定 revision、许可全文、改动与测试；必要澄清未完成时不进行代码复制。不要把许可风险当成从零搭建庞大框架的理由：先复用既有宿主桥/生命周期和接口行为，保持差异最小。

不迁入全局 `persist:browser`、hidden window 替身、应用窗口管理、Claude harness、默认审批、任意 evaluate/run 和闲置工具。

主要证据入口：

- [Issue 总纲](https://github.com/NAMEWTA/obsidian-huhu/issues/38)，[架构/CDP/MCP 研究](https://github.com/NAMEWTA/obsidian-huhu/issues/38#issuecomment-6542282954)，[Action/人机交互研究](https://github.com/NAMEWTA/obsidian-huhu/issues/38#issuecomment-6542309509)。
- [当前 API](https://github.com/NAMEWTA/obsidian-huhu/blob/974105b47e03c108df0f5e0c3fc9606fe4b79aee/src/modules/browser/api.ts)、[装配](https://github.com/NAMEWTA/obsidian-huhu/blob/974105b47e03c108df0f5e0c3fc9606fe4b79aee/src/modules/browser/platform/desktop/composition.ts)、[宿主窄桥](https://github.com/NAMEWTA/obsidian-huhu/blob/974105b47e03c108df0f5e0c3fc9606fe4b79aee/src/host/desktop/electron-main.ts)。
- [Halo host 源码](https://github.com/openkursar/hello-halo/blob/476291ca8380a9540ffde1aa82ee098456169a9f/src/main/services/browser-host/manager.ts)、[完整许可证](https://github.com/openkursar/hello-halo/blob/476291ca8380a9540ffde1aa82ee098456169a9f/LICENSE)。
- Electron 官方 [webview](https://www.electronjs.org/docs/latest/api/webview-tag)、[Session](https://www.electronjs.org/docs/latest/api/session)、[Debugger](https://www.electronjs.org/docs/latest/api/debugger)。最新版文档用于 API 研究，不替代所支持 Obsidian 安装器的实测结果。
