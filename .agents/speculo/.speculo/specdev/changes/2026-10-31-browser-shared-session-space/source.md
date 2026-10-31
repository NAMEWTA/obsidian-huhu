---
schema_version: 1
artifact: source
change: 2026-10-31-browser-shared-session-space
source_type: github-issue
canonical_locator: https://github.com/NAMEWTA/obsidian-huhu/issues/38
captured_at: '2026-10-31'
content_sha256: c8387d59de6dce2edea0b6758c023b357c05d1f2181d279c98db78117940c9fa
remote_state: open
close_capability: unavailable
---

# Source: Issue #38

## Capture Metadata

- Capture method：GitHub 连接器 fetch_issue；正文按连接器文本转录，换行规范化为 LF，保留末尾 LF。摘要对象是 Original Content 的正文文本，不是原始 HTTP 字节或整份 source.md。
- Author：NAMEWTA。创建／更新时间均为 2026-10-31T05:58:32Z。
- Labels：无。附件：无独立附件。Redactions：无。
- Pagination：正文完整读取；fetch_issue_comments 返回空数组，共 0 条评论。捕获日期：2026-10-31，未把无法确定的秒级读取时间编造为事实。
- Issue 历史审查基线：2670440678e5819a680024978b5feb2491ce7a35。本次规划基线：974105b47e03c108df0f5e0c3fc9606fe4b79aee。
- 本快照不可覆盖。来源变化时新增 sources/SRC-002.md 并记录 supersedes_source。

## Original Content

# HUHU 浏览器全量重构：Obsidian/Electron 原生共享 Space

> **本 Issue 是浏览器完整替换的架构、实施和验收总纲，不是已经完成重构的声明。**
>
> **最终目标：一个 Space、一套 Electron Session、一组真实页面，人和 Agent 使用同一份登录状态并交替控制同一个页面。** 不再为 HUHU 维护独立 Chromium 发行版、Native supervisor、进程树协议或身份复制系统。
>
> **不要求任何旧实现兼容。** 可以直接更换浏览器领域模型、API、协议、目录和持久化格式；全部生产者与消费者同步更新，旧实现最终物理删除。没有永久兼容层、双运行时、旧协议转接器或失败后回退 Native 的路径。
>
> **不兼容不等于静默删除用户文件。** 删除旧代码与销毁旧浏览器数据是两件事；用户数据清理必须明确范围、由用户确认，并且不得触及其他模块。

## 0. 基线、范围与证据边界

| 项目 | 约定 |
|---|---|
| 仓库 | `NAMEWTA/obsidian-huhu` |
| 本次静态审查基线 | `dev`，[`2670440678e5819a680024978b5feb2491ce7a35`](https://github.com/NAMEWTA/obsidian-huhu/commit/2670440678e5819a680024978b5feb2491ce7a35) |
| 核对日期 | 2026-10-31 |
| 实施分支 | 从实施时最新 `dev` 分出，最终合入 `dev`；每批记录实际 SHA 和与本基线的差异 |
| 本次已做 | 核对当前模块规范、浏览器公共 API、装配、桌面宿主桥、身份作用域、构建入口及 Electron 官方能力边界 |
| 本次未做 | 未修改产品代码，未启动真实 Obsidian，未运行构建、单元测试、三平台验收或性能实验 |
| 证据性质 | 本文区分已读源码事实、官方能力说明、拟采用设计与待验证条件；不将设计目标写成已经支持 |

GitHub Issue 本身不绑定代码分支。“基于 dev”是后续实现与验收的约定，不能用默认分支或历史浏览器 PR 代替实际基线。

### 0.1 与其他工作的关系

- [#37 总收口计划](https://github.com/NAMEWTA/obsidian-huhu/issues/37) 继续拥有全局设计系统、UI 一致性、公共生命周期与包体治理。本 Issue 拥有浏览器运行时和浏览器内部架构；两者复用同一组件体系，不重复重写 Shell。其对旧浏览器平台/运行时的描述是历史基线，不限制本次经用户明确提出的完整替换。
- [#36 Personal Agent 升级](https://github.com/NAMEWTA/obsidian-huhu/issues/36) 继续拥有 BOT 的 Go/Eino/HAP 执行体系。本 Issue 提供新的浏览器公共能力，更新其浏览器接入假设；不重写 Bot 引擎、调度器或效果存储。
- 不在创建本 Issue 时关闭其他 Issue，不把旧需求关闭当作新实现完成。历史浏览器计划中与本 Issue 冲突的“独立运行时、身份种子、人工镜像输入”等方向，不再作为新实现约束；仍有价值的用户流程和故障场景转为回归用例。

## 1. 产品结论与非目标

### 1.1 本次必须交付

1. **真实共享浏览。** 人工登录、Agent 操作、人工接管、再交回 Agent，始终使用同一 Space 的 Session；对同一 `pageId`，操作的是同一个实际 guest WebContents，而不是另开一个隐藏浏览器。
2. **Space 内共享、Space 间隔离。** 人和 Agent 之间不复制 Cookie；个人/任务分类是授权策略，不是同一 Space 内的两个 profile。
3. **普通浏览器体验。** 鼠标、键盘、中文输入、选择、滚动和网页交互由真实嵌入页面处理，不再经过截图帧与输入重放协议。
4. **Obsidian 内完整工作台。** 沿用现有 browser 页面、模块生命周期、设置、命令、主题、分屏和材料贡献点；不另起独立桌面应用。
5. **桌面跨平台目标。** 面向 Windows、macOS、Linux，使用实际宿主自带的 Electron/Chromium；不下载额外浏览器或要求安装系统 Chrome。
6. **彻底删除旧链路。** Native 浏览器、utility worker、bundle 安装/校验、独立 profile、sealed identity、帧查看器及其专属协议、测试和发布资产全部退场。

### 1.2 明确不做

不建设另一个浏览器内核、云浏览器、远程桌面或无头守护服务；不开放整个系统桌面控制；不强制引入 Playwright/Puppeteer 浏览器发行版；不修改 Obsidian 安装包；不依赖 Obsidian 核心 Web viewer 的私有内部对象；不把网页直接放进拥有 Node 权限的宿主 DOM。

本期不承诺 Chrome 扩展生态、完整密码管理器、全站登录兼容、所有 DRM/通行密钥/验证码场景、应用退出后继续执行，以及移动端浏览器自动化。插件整体仍保持现有非 desktop-only 定位；浏览器能力在不支持的平台明确不可用，不影响其他模块。

## 2. 必须先澄清的技术语义

| 常见简化说法 | 本方案采用的准确合同 |
|---|---|
| Space 就是一份 partition | Space 还包含页面目录、用户授权和显示元数据；partition 负责浏览器会话，不负责业务标签和控制权 |
| 相同 partition 下所有存储都共享 | 共享同一 Session 的存储环境；Cookie 仍遵循 domain/path/SameSite 等规则，localStorage/IndexedDB 仍按 origin 等浏览器存储规则隔离。不是不同网站互读数据 |
| 相同 Session 就是同一页面 | 不成立。页面 JS 内存、滚动、表单草稿以及通常的 sessionStorage 不是单靠 partition 就能共享；同一 `pageId` 必须绑定同一活跃 guest |
| Electron 支持，插件就能直接调用 | 不成立。Session、WebContentsView 等有主进程边界；还要验证 Obsidian 对 webview、桥接和宿主窗口的实际开放情况 |
| 复用 Electron 就没有子进程 | 不成立。Electron 自身仍可创建 renderer/GPU 等进程；删除的是 HUHU 额外管理的 Chromium 可执行文件、supervisor 和独立进程树 |
| 加上 persist: 就完成持久化验收 | 不成立。要在真实 Obsidian 完整退出、重新启动后验证，还要考虑网站自身会话有效期；插件热重载不是等价测试 |
| 接管能取消 Agent 已做的一切 | 不成立。可撤销后续命令和未派发操作，不能撤回已提交的网页请求或保证任意脚本产生的后台副作用被清除 |
| 清空 Session 就删除了所有磁盘痕迹 | 不成立。必须按实际 Electron API 核对数据类型、错误和残留；不能虚构 `session.destroy()` 或承诺磁盘安全擦除 |

Electron partition 与主进程语义参见 [E1]；webview 的启用、异步行为与维护风险参见 [E2]；WebContentsView 的主进程和原生视图性质参见 [E3]。以上说明是架构边界，不是降低本次人机共享的目标。

## 3. 当前源码事实与复用边界

以下入口均固定到本次基线，实施前仍须扫描完整调用图。

| 当前事实 | 对重构的决定 |
|---|---|
| `browser/module.ts` 已独立激活，通过 `pages.browser` 动态加载工作台，通过 `context.shell.open({feature:'browser',resourceId,focusId})` 导航 [S4] | 复用模块和页面入口，不新增浏览器 ViewType |
| `api.ts` 提供 `BROWSER_WORKSPACE`、`BROWSER_AGENT_ACCESS`、`BROWSER_OPEN`、`BROWSER_MATERIAL_CONSUMERS` [S5] | 保留有价值的集成位置，重写契约；保留服务键名称不等于保留旧 API 兼容 |
| 当前 Workspace API 同时包含安装运行时、身份导入、控制租约、帧订阅和材料发送 [S5] | 按普通浏览、Agent 授权和材料消费拆清职责，删除 Native 专属概念 |
| `platform/desktop/composition.ts` 装配 runtime factory、credential store、native reader、staging、cleanup 和 RPC [S6] | 整体替换装配，不在旧 factory 内增加一个 Electron 分支 |
| `src/host/desktop/electron-main.ts` 已有 `desktopRemote(win)` 与仅执行固定打包代码的 `bundledMain()` [S7] | 审查后复用窄宿主桥；不另造通用远程 require/eval 服务，不把 Agent 输入拼成主进程代码 |
| `vaultIdentity(app)` 已由宿主初始化，提供 Vault/设备身份 [S8] | 复用身份来源；另外防止复制 Vault 后同 ID 的本机 partition 冲突，不再建一套品牌级身份系统 |
| 当前浏览器根为 `.huhu/browser/<deviceId>/v2` [S6] | 不迁移旧 profile；新元数据与 Electron-managed Session 存储分开定义 |
| `build-browser-runtime.mjs` 生成根目录 worker、摘要及打包主进程源码 [S10] | 旧 worker/原生监督桥全部删除；新方案确需的固定安全桥必须单独缩小和重建 |
| `build-browser-client.mjs` 构建现有 CLI/MCP 产物 [S11] | 删除旧协议客户端；需要保留外部接入时改成薄客户端，不能顺手把运行时职责带回来 |

### 3.1 不变的工程约束

依据 [S1]–[S3]、[S9]：继续 TypeScript、React 19、现有 zustand/vanilla 服务状态、Tailwind/shadcn/Radix 设计系统、esbuild、pnpm、Vitest。跨模块仅经 `api.ts`；Node/Electron 代码只能位于 `desktop/` 目录且只在桌面端到达。

只使用现有 `huhu-workbench-view` 承载浏览器产品页面，不新增第四种 Obsidian ViewType。`module.ts` 不静态导入 UI；`api.ts` 只暴露类型、服务键及贡献点。设置经 `context.settings.bind('browser', schema)`，不直接 `saveData`。

浏览器自身可以重写；`native/pty-server`、`native/huhubot`、普通模块服务 lease、公共秘密保护器以及其他模块的执行账本不属于删除对象。

## 4. 关键架构决策

| 编号 | 决策 |
|---|---|
| D01 | 仅使用 Obsidian 当前宿主的 Electron/Chromium；不安装、下载或启动第二份浏览器运行时 |
| D02 | 一个持久 Space 对应一个受命名空间约束的 persistent partition；人和 Agent 不分 profile |
| D03 | 一个活跃 Page 对应一个 canonical guest；UI 和 Agent 都通过 registry 定位它 |
| D04 | 首选通过能力门禁的 `<webview>`；WebContentsView 是经过实测才可选择的替代表面，不同时维护两套生产引擎 |
| D05 | 用户默认直接浏览；任务 Space 显式交给 Agent 后进入单写者控制状态；人工可随时收回 |
| D06 | 个人 Space 默认且在公共 Agent API 层禁止自动读取/控制；授权不能只靠 UI 隐藏按钮 |
| D07 | 标准 Agent 接口使用结构化动作；任意 JavaScript、原始 CDP、Cookie 导出、任意文件路径不属于最小集 |
| D08 | 业务元数据由 browser owner 管理；浏览器网站数据由 Electron Session 管理，不再维护 Chromium profile 文件格式 |
| D09 | 内部 BOT/CLI/MCP 适配复用同一个授权与命令入口，不各自持有浏览器或第二套状态 |
| D10 | 全链路一次切换，不保留旧 schema reader、旧 wire adapter、旧运行时回退或双写 |
| D11 | 移除进程模型复杂性，但保留真实撤权、资源所有权、未知效果和敏感信息边界 |
| D12 | 有限、可证实的能力优于伪装支持；宿主能力缺失必须有准确错误和诊断，不偷偷降级到旧方案 |

### 4.1 为什么仍以 webview 作为首选候选

HUHU 是已有 Obsidian 窗口里的插件，不拥有 Electron 应用启动配置。webview 更适合嵌入当前 DOM 布局，但 Electron 官方目前明确不推荐将其作为一般新项目的默认选择，原因涉及渲染、导航与事件路由稳定性；它还需要宿主启用 `webviewTag`。[E2]

因此这里不是“无条件押注 webview”，而是：**先验证宿主能力和关键用户流程，再冻结唯一生产表面。** 不把官方警告写成已经移除 webview，也不忽略这个风险。

WebContentsView 是主进程原生 View，不是 React 组件或可直接放进 DOM 的标签；需要处理 native bounds、缩放、裁剪、层级、隐藏、弹层遮挡和宿主窗口归属。[E3] 如果最终选用它，必须通过同样的真实宿主门禁，不能因为名称更新就假定更适合 Obsidian 插件。

不选择普通 iframe 作为完整浏览器替代，也不通过关闭 webSecurity 或删除网站安全头解决嵌入限制。

## 5. P0 宿主可行性门禁：先证明，不先堆架构

在一次性测试 Vault 中实现最小探针，保存环境、步骤和结果。当前仓库的 `minAppVersion` 为 `1.13.0`；最新 Electron 文档不等于该宿主实际具备全部 API。记录 Obsidian 应用版本、安装器/实际 Electron 与 Chromium 版本、OS、架构、显示缩放及窗口类型。[S2]

| 门禁 | 必须证明 |
|---|---|
| F01 嵌入 | 主窗口和支持的弹出窗口能创建真实 guest，partition 在首次导航前设定，页面运行于正确 Session |
| F02 持久化 | 在测试站写 Cookie/localStorage/IndexedDB，完整退出所有 Obsidian 进程并重开后读取；不是只重载插件 |
| F03 共享/隔离 | 同一 Space 两页同 origin 共享预期状态；另一 Space、另一 Vault 不共享；不污染宿主 defaultSession |
| F04 宿主桥 | 主进程 Session、guest WebContents、输入、截图、权限和销毁能力能通过窄桥使用，缺失时明确失败 |
| F05 安全 | 在网页第一次加载前固定 guest 安全配置、导航/新窗口和权限策略；不能导航后再补保护 |
| F06 人机共作 | 人工在页面输入/登录，Agent 对同一 webContentsId 操作，接管不换页面、不刷新、不复制登录态 |
| F07 真实交互 | 中文 IME、焦点、滚动、选区、缩放、文件选择、网页对话框、常见登录跳转均有结果 |
| F08 弹窗认证 | 受控 popup/新页保持正确 Session；需要 opener/postMessage 的认证流程不因简单“取消后另开 URL”被破坏 |
| F09 生命周期 | 切标签、隐藏、关闭、React 更新、模块停用、guest 崩溃与宿主退出没有重复实例、泄漏或假成功 |
| F10 控制屏障 | 人工接管优先于等待中的 Agent 队列；旧凭据、迟到响应和已过期元素引用失效 |
| F11 删除 | 在 guest、下载及网站后台活动收敛后清理指定 Session，验证已清范围与残留，不触及其他 partition |
| F12 多窗口 | 验证同页第二入口、窗口关闭和页面归属；不能用重建 URL 冒充无损迁移 |

退出条件：形成明确的宿主能力表及表面选择结论。若 webview 不能满足必要条件，测试 WebContentsView 的同一合同并明确改选；若两者在目标宿主均无法满足，记录发布阻断及所需宿主条件。**不得为让计划“完成”重新引入 Native，或在没有三平台证据时声称已跨平台可用。**

## 6. 目标架构与唯一事实来源

```text
Obsidian 工作台 / ReactSurface / 命令 / 设置
                │
                ▼
  Browser Workspace（浏览、页面、显式用户授权）
  Browser Agent Access（已授权的结构化动作）
  Browser Material Consumers（显式材料交付）
                │
                ▼
  Browser Application Services
  ├─ Space 元数据与生命周期
  ├─ 控制权协调、动作队列、结果与投影
  └─ 材料/下载/调用方适配
                │ 窄端口
                ▼
  Desktop Electron Adapter（在现有 Obsidian 进程中）
  ├─ 固定主进程安全桥与授权 fence
  ├─ Session Registry：Space → partition/session
  ├─ Page Registry：Page → 唯一 live guest
  ├─ Surface：选定的 webview 或 WebContentsView
  └─ Driver：同一 guest 上的结构化读取、输入与截图
                │
                ▼
       Obsidian 自带 Electron / Chromium

可选外部 CLI/MCP → 有限本地 Broker → 同一 Browser Agent Access
没有 Browser Worker、Native supervisor 或第二套 Chromium。
```

### 6.1 所有权必须分开

| 对象 | 唯一 owner | 其他层可以做什么 |
|---|---|---|
| Space/页面的持久元数据 | browser repository + application service | UI/Agent 读投影、发命令，不自行写 JSON |
| Session、guest、监听和原生表面句柄 | Electron adapter registry | 上层只持稳定 ID 和能力结果，不持裸 Electron 对象 |
| 活跃控制权及操作准入 | control service 与其单一主进程执行屏障合同 | UI/BOT/CLI 不自行授予；主进程仅保存必要的当前授权代次和资源归属，不复制业务数据库 |
| 网页 Cookie/站点存储 | Electron Session | 不镜像到身份仓，不解析宿主 SQLite 文件 |
| React 状态 | 已提交事实/运行事件的投影 | 不成为第二个 Page Registry，不根据按钮颜色推断控制权 |
| BOT Run/效果事实 | 现有 huhubot owner | 浏览器返回准确回执，不创建第二套 Go Run 或持久效果账本 |

控制撤销必须在最终执行边界形成屏障：服务层取消与主进程撤权确认使用同一代次，撤权确认后旧代次不能再派发。这个少量内存校验不是保留旧 Native 协议，更不是新建监督进程。

## 7. 符合当前规范的目标目录

以下为目标职责布局；新文件是拟新增，不表示当前已存在。实际实现可合并没有独立职责的小文件，禁止为目录树空建框架。

```text
src/modules/browser/
  manifest.ts                         # 纯数据、桌面能力声明、lazy load
  api.ts                              # 公共类型、ServiceKey、ContributionPoint
  module.ts                           # 装配、激活、撤销、释放；动态加载 UI/desktop
  settings.ts                         # browser 命名空间
  i18n.ts                             # en / zh

  core/
    model.ts                          # Space/Page/状态/持久元数据
    control.ts                        # 纯控制状态转移和约束
    commands.ts                       # 结构化动作及参数校验
    observation.ts                    # 页面快照、元素引用、覆盖范围
    ports.ts                          # Session/Page/driver/storage 窄端口
    errors.ts                         # 稳定错误码和结果类别

  services/
    create-workspace.ts               # 继续作为应用装配入口，内容重写
    workspace-service.ts              # Space/Page 用户动作与状态投影
    control-service.ts                # 显式委托、撤权、单写者与 fence 协调
    agent-access.ts                   # 授权校验、队列、期限、受控结果
    material-service.ts               # 捕获、来源绑定、交付，不自动发送对话

  platform/
    note-links.ts                     # 保留有价值的笔记链接入口并更新契约
    desktop/
      composition.ts                  # 仅装配新 Electron 能力
      capabilities.ts                 # 宿主能力探针，不做 OS 字符串硬编码支持判断
      metadata-repository.ts          # 有界元数据、原子写入和删除恢复标记
      electron/
        host-bridge.ts                # 复用 desktopRemote/bundledMain 的窄封装
        host-policy.ts                # 固定主进程策略；不接收任意源码
        session-manager.ts            # partition/Session 生命周期与清理
        page-registry.ts              # 唯一 guest、窗口与页面归属
        webview-surface.ts             # 若 P0 选 webview，则唯一生产表面
        page-driver.ts                # 导航、输入、观察、截图
        permissions.ts                # request/check、origin/frame/用户决定
        navigation-policy.ts          # URL、redirect、popup、外部协议
        downloads.ts                  # Session 下载和受控文件映射
      transport/
        broker.ts                     # 可选本地外部接入；按需启停
        cli.ts                        # 无状态薄客户端，不启动浏览器

  contrib/                            # 仅放真实需要的贡献适配
  ui/
    workbench-page.ts                 # 现有 PageCreate/ReactSurface loader
    BrowserWorkspacePage.tsx
    SpaceNavigation.tsx
    BrowserToolbar.tsx
    PageTabs.tsx
    BrowserSurface.tsx                # 稳定挂载/订阅，不能 render 时创建 guest
    ControlStatus.tsx
    DownloadsPanel.tsx
    settings-page.tsx
  styles/                             # 必要的作用域样式，接 src/styles.json
```

如果 P0 选择 WebContentsView，则以相应 surface 文件替换 webview-surface，而不是两个引擎长期并存。只保留一个小而明确的 surface 合同，不开发通用浏览器后端插件平台。

`src/host/desktop/electron-main.ts` 仍是通用宿主能力，不能反向 import browser 业务或 `app/contracts`。browser 特有策略归 browser/platform/desktop。需要构建固定主进程策略时可有一个小的生成步骤，但不能沿用旧 runtime worker/hash/监督系统作为容器。

测试按当前规范邻近源码放 `*.test.ts`、`*.dom.test.tsx`；共享 fixture/集成放既有 `test/`，真实宿主验证延续 `scripts/obsidian-acceptance/` 和 `docs/e2e/` 体系。不要建立另一套平行测试工程。

## 8. 数据模型、partition 与持久化

### 8.1 核心模型

拟议模型至少区分：

```ts
interface BrowserSpaceRecord {
  id: string;
  label: string;
  kind: 'personal' | 'task';
  storageGeneration: string;
  createdAt: string;
  // 不包含 Cookie、控制 token、裸 Electron 对象或原生进程身份。
}

interface BrowserPageRecord {
  id: string;
  spaceId: string;
  restorableUrl?: string;
  // URL 恢复政策必须排除认证回调和敏感临时参数。
}

interface BrowserPageRuntime {
  pageId: string;
  ownerWindowId: string;
  documentId: string;
  status: 'creating' | 'ready' | 'loading' | 'crashed' | 'closing' | 'closed';
  // guest 句柄只在 desktop adapter 内部；此处是业务投影。
}
```

类型名称是设计建议，不要求机械照抄；关键是不再把 `runtimeId/profilePath/sealedIdentity/workerConnection` 作为 Space 的中心。

### 8.2 Partition 命名

示例：

```text
persist:huhu.browser.<vaultScope>.<deviceId>.<spaceId>.<storageGeneration>
```

- Space ID、存储代次使用不可猜测的稳定随机 ID；不使用用户标题、网站域名或顺序数字作为隔离身份。
- `vaultScope` 复用已有 vaultId，并绑定本机规范化 Vault 根的隔离信息，例如对 `vaultId + canonicalVaultRoot` 做固定编码的摘要。不能只使用可能随复制一同复制的 vaultId/deviceId。
- 规范化规则必须覆盖 Windows 路径大小写/分隔、符号链接和重复打开；不在日志中输出原始私人路径。路径搬迁后的默认行为是安全的新绑定，不自动寻找并接管旧 Session；需要保留时走显式本机重新绑定，并检查旧 owner 已退出。
- rename Space 不改 partition；删除后不复用旧 storageGeneration。Agent 不能指定 partition、storagePath 或任意已有 webContentsId。
- 禁止空 partition、`defaultSession` 和复用 Obsidian 主窗口会话。其他插件、Vault、Space 的数据不能因“复用宿主”而自动混用。
- partition 在创建 guest/首次导航前固定；不能把切换账号实现成修改已有 webview 的 partition。[E1][E2]

### 8.3 数据位置重新定义

| 数据 | 新归属 |
|---|---|
| Space 元数据、恢复偏好、清理状态 | 新格式 `.huhu/browser/<deviceId>/workspace.json` 等最小文件；不读旧 `v2` |
| Cookie、localStorage、IndexedDB、站点 cache 等 | 由 Obsidian/Electron 为该 partition 管理的本机存储；不再置入 HUHU 自管 Chromium profile |
| 控制 token、动作队列、元素引用、临时截图 | 当前运行实例内存，有界、可撤销，默认不持久化 |
| 临时下载/上传授权映射 | browser 的设备级受控文件区域；显式导出才进入用户选定位置 |
| 用户明确保存的网页材料/附件 | 经已有资料/附件 owner 写入目标，不自动把全网页复制到普通笔记或 BOT 历史 |
| 外部接入发现信息 | 仅必要的本机受限范围；不把长期 bearer token 写进可同步 Vault 文件 |

**这是对当前“浏览器网站数据全部在 .huhu”约定的有意修改。** 在同一实现中更新 `docs/data.md`、浏览器文档和相关开发规则；明确 Session 数据不随 Vault 自动携带，备份 Vault 不等于备份网页登录状态。不得用 `app.setPath('userData'/'sessionData')` 全局改 Obsidian 的路径。[S2][S6]

使用 Electron 给出的实际存储位置作本地诊断，不硬编码系统目录或自己操作 Cookie 数据库。元数据文件损坏不得静默覆盖为空库；保留诊断及原文件。

标题、URL、查询参数也可能敏感。持久页面恢复采用明确设置与过滤策略：认证回调、一次性 code/token、密码重置 URL 和临时页面不落恢复清单；需要保护的元数据复用现有秘密保护能力，不重新发明 sealed identity。保护能力不可用时不静默明文降级。

### 8.4 第一版不引入临时 Space 的第二套复杂语义

正常个人/任务 Space 默认均持久化。任务结束默认只撤销 Agent，不自动删除登录态。用户可选择显式清空/删除。

若后续需要内存临时 Space，再以明确 retention 类型扩展，不继续沿用“凭据保护不可用就自动切 ephemeral”的隐式行为。核心共享与清理合同必须先完整成立。

## 9. Space、页面与窗口生命周期

### 9.1 Space 生命周期

`创建元数据 → 按需建立 Session/安全策略 → 打开页面 → 普通使用 → 关闭页面但保留 Session 数据 → 再次打开`。

创建 Space 不要求立即创建网页或访问网络；插件启动不扫描系统浏览器、不恢复所有网页、不安装 runtime，也不启动外部 broker。Session 策略在第一次加载网页前安装。

“个人”与“任务”仅改变授权边界。同一任务 Space 内人工登录后直接交给 Agent，不做身份保存/套用。用户需要让已有个人 Space 用于任务时，可在可信 UI 显式转换并确认可访问范围；转换保持当前 partition，撤销旧控制凭据，再重新授权。Agent 自己不能转换、复制或偷偷选择个人 Space。

### 9.2 唯一 live Page

PageRegistry 维护 `pageId → spaceId + ownerWindow + guest + document generation`。人看到、Agent 点击、工具截图都来自这个条目。

- React render、地址栏编辑、状态更新不得重复设置 `src` 或重建 guest；将 `src` 设为自身也可能触发重载。[E2]
- 切同一窗口内的标签默认保留 guest，不用卸载再按 URL 重建来节省组件代码。
- 页面恢复描述不是 live 页面；重启后可按设置重新导航，但不能声称恢复了 JS 堆、未提交表单或所有 sessionStorage。
- 暂停 Agent 不销毁页面；关闭一个观察入口不自动终止其他页和无关任务。
- 关闭真实 Page 时处理网站 beforeunload/未保存提示；Agent 不能悄悄确认丢弃用户输入。删除 Space 的强制关闭属于独立确认动作。
- guest 崩溃进入 crashed，撤销相关动作，允许明确重载；不回退 Native、不无限自动重启、不重放未知点击。

### 9.3 多窗口的诚实语义

同一个 live webview 不应被假定能无损跨 Document 搬运。第一版采用**单 owner surface**：其他工作台/Agent 标签引用同一 pageId；无法安全展示同一 live guest 时，提供“前往所在窗口”并聚焦 owner，不另开一个隐藏副本。

同一 Space 可以在不同窗口打开**不同页面**，它们共享 Session，但各自页面状态不同。用户选择“新开同地址页面”必须是新的 pageId，并明确不是接管原页。

跨窗口迁移只有在选定表面的实测确认能够保持同一 WebContents 时才启用；否则要求用户确认重新载入或先收回 Agent。不得用相同 Cookie 掩饰页面内存丢失。

窗口关闭、模块卸载和多次启停均由 owner 生命周期释放监听、计时器、guest、下载及 broker；处理其他窗口/同一 Vault 的重复 owner 竞争，不能两份模块实例各自管理同一 registry。

## 10. 控制权状态机：简化机制，不弱化撤权

### 10.1 默认单写者

第一版以 Space 为控制范围，避免同 Space 的多个页面被不同 Agent 同时写入而互相改变登录态。不同 Space 可独立运行。

```text
human
  └─ 用户明确交给某个 Agent/任务 → agent-controlled
agent-controlled
  ├─ 用户接管 → human
  ├─ 暂停/失联/权限失效 → paused
  └─ 任务结束 → human
paused
  ├─ 用户继续自己操作 → human
  └─ 用户重新交给 Agent → agent-controlled（新凭据）
任何状态 ── 模块关闭/Space 删除/owner 失效 → closed/unavailable
```

个人 Space 不进入 agent-controlled，除非用户先完成明确的产品分类转换。所有读写工具都必须经过授权，不将“只读截图”默认为无隐私风险。

### 10.2 授权合同

一次授权绑定运行实例 nonce、vault/space、实际 agent/task、允许动作/观察范围、当前控制代次及有效期/调用方生命期。凭据随机且短期，不由模型提供可信身份，不持久化为可复活的长期连接。

- 可信 UI 发起 handoff；模型工具不能申请给自己授权、恢复旧凭据或提高范围。
- 每次排队、真正派发、关键异步后续和结果交付都核对授权及资源归属。
- 人工接管走高优先级撤权通道，**不能排在一个 30 秒 wait 后面等待**。撤权改变代次，拒绝旧动作，取消等待，丢弃过期读取结果，再完成 UI 交接。
- 主进程派发屏障与服务层共享同一明确生效点；测试覆盖“校验后、实际输入前发生撤权”。不能只在 HTTP 接收时检查一次 token。
- 接管默认撤销 Agent 的读取和写入，避免人在输入验证码/密码时旧 Agent 仍截图。另行开放只读观察必须是独立、可见授权，不沿用旧控制 token。
- 交回时生成新 token/代次；旧队列和旧页面引用不会自动恢复。Agent 重新观察当前页面再继续。
- 已发出的网络请求、已执行的点击和页面自行启动的副作用不能回滚；返回结果未知时如实标记，禁止自动再次提交。

### 10.3 人工观察与输入门禁

Agent 控制时，人仍能实时看到同一网页；网页操作面先处于观察态，显眼且可键盘到达的“接管”始终可用。点击接管不是克隆浏览器，也不是切换 Cookie。

不能只用 `pointer-events:none` 假装锁住输入：要覆盖已经在 guest 内的键盘焦点、滚轮、触屏、菜单、导航按钮和快捷键。webview 内部事件不等同普通 DOM 冒泡事件，[E2] 因而必须以实际表面焦点/输入门禁和主进程能力验证，不在父 DOM 上监听一下就宣称全面受控。

人机共作表示共享上下文并可靠交替控制，不表示两位操作者同时向同页输入。正常人工浏览不再需要申请旧 viewer lease 或发送 `HumanInput` 帧协议。

## 11. 最小 Agent API：结构化动作，而不是只给 executeJavaScript

### 11.1 第一版能力集

| 能力 | 建议动作 | 合同 |
|---|---|---|
| 可用性 | `capabilities` | 返回实际支持/原因，不暴露其他 Space 秘密 |
| 页面目录 | `pages.list/open/activate/close` | 限已授权任务 Space；页面与人工标签完全一致 |
| 导航 | `navigate/back/forward/reload/stopLoading` | 使用同一 guest，校验 URL 和当前代次 |
| 页面观察 | `observe` | 标题、地址、加载态、有限文本/可交互元素、frame 覆盖和截断信息 |
| 截图 | `screenshot` | 当前页面实际 viewport/显式 clip，有大小限制与来源身份 |
| 元素交互 | `click/fill/type/press/select/check` | 优先绑定观察生成的元素 ref；有可见性、可用性、frame 和文档检查 |
| 页面移动 | `scroll` | 有界方向/距离，避免无限循环 |
| 等待 | `waitFor` | 明确条件、总 deadline、取消；不用一律 network-idle 判断所有现代页面 |
| 文件反馈 | `downloads.list/cancel` | 只列当前授权范围；文件路径不等于读取授权 |
| 上传 | `upload`，仅在 grant 能力完整时开放 | 用户选定文件或既有可信文件 grant；模型不能传任意系统路径 |

第一版必须打通真实浏览/交互/观察与人工接管。高级 cross-origin frame、开发者 evaluate、系统 Cookie 提取、任意下载目录和全浏览器设置修改不在最小集中。

### 11.2 请求与结果示意

```ts
// 示例是合同说明，不是已经存在的源码。
interface AgentActionEnvelope {
  requestId: string;
  pageId: string;
  expectedDocumentId?: string;
  action: BrowserAction;
  timeoutMs?: number;
}
// agent/task/space/controlGeneration 来自可信调用上下文，
// 不能靠模型填字段就获得授权。

type ActionOutcome<T> =
  | { status: 'succeeded'; requestId: string; value: T }
  | { status: 'rejected'; requestId: string; code: string }
  | { status: 'cancelled'; requestId: string; dispatched: false }
  | { status: 'outcome-unknown'; requestId: string; code: string };
```

操作结果还应携带实际 page/document 身份、当前状态及适用的效果信息。`succeeded` 只表示定义的动作和后置条件成立；点击成功不自动证明业务订单/表单提交成功。

稳定错误类别至少覆盖 `browser_unavailable`、`personal_space_forbidden`、`control_revoked`、`page_closed`、`stale_document`、`stale_element`、`unsupported_frame`、`permission_denied`、`deadline_exceeded`、`outcome_unknown` 和 `cleanup_pending`。错误不夹带 Cookie、token 或完整页面原文。

### 11.3 Driver 的实现边界

内部可使用固定、受审查的 `executeJavaScript`/frame 执行脚本进行 DOM 读取或定位，也可使用经过验证的 guest 输入能力。但标准工具不接受任意源码，不暴露任意 `sendCommand`、`require`、网络请求脚本或主进程执行口。

不要把 `element.click()`、直接设置 value 或 synthetic KeyboardEvent 宣称为对所有网站都等价的真实用户输入。对表单框架、组合输入、文件选择、焦点和网页 user-activation 要有真实 fixture；选定正确驱动路径，不能不支持时静默假成功。[E4]

读取脚本尽量在受控执行世界运行；所有来自页面的文本、节点属性及返回结构都是不可信数据，需校验类型、大小、深度及截止时间。不能把网页给出的 selector、partition、权限声明或 JS 字符串直接执行。

### 11.4 元素引用与 frame

元素 ref 绑定 Space、Page、documentId、frame、观察批次及有效期。导航、guest 重建、frame 替换和控制代次变化后失效；同文档 DOM 更新也要验证节点仍存在且语义匹配，不能只保存一个易漂移的数组下标。

第一版至少完整支持主文档、实际可访问的同源 frame 和公开 shadow root；跨源 frame 若宿主提供合法且可绑定的 frame 能力，则在授权范围内实现，否则明确返回 unsupported 并允许人工处理。禁止关闭 webSecurity 解决跨源问题，禁止省略 frame 却声称观察了全页。

坐标点击只能绑定明确 viewport/缩放和观察版本；页面滚动、重排后不能继续使用旧截图坐标。截图和语义观察记录是否同批次，不把两次采集假装原子快照。

### 11.5 轻量去重与未知效果

保留有界内存 requestId 去重：作用域含运行实例/授权代次，重复请求需匹配同一参数摘要；同 ID 不同参数拒绝。记录 queued/dispatched/completed/unknown，用于当前连接重试与诊断，不保留 Native prepare/execute 双阶段账本。

发生派发后超时、断连或崩溃时，不把结果一律当作“未执行”；不可幂等动作禁止自动重放。宿主重启后旧凭据和内存记录不可恢复，调用方先重新观察/对账。BOT 原有领域效果记录可引用浏览器回执，但不得谎称任何网页动作都有通用 exactly-once 保证。

## 12. 网页安全与权限：复用宿主不等于继承宿主权力

### 12.1 guest 固定安全配置

对 HUHU 创建的 guest，在首次加载前强制安全选项：关闭 Node integration 及 subframe Node，启用 context isolation、sandbox、web security；不使用远程 preload，不向网页暴露 Electron、Obsidian、Vault、文件系统、控制 token 或原始 IPC。[E5]

若使用 webview，`will-attach-webview` 等需要同步生效的检查必须在固定主进程策略中执行；不能把远端异步回调当成同步安全拦截。当前 `bundledMain()` 只允许打包策略代码，路径和网页数据走参数而非源码拼接。[S7]

默认不启用无约束 `allowpopups`。确有认证弹窗需求时，只能在确认主进程 handler 已先安装、继承安全设置且可跟踪其所有权的实现中开启对应能力；这是一项单独审查的例外，不是全局打开开关。

主进程桥按可信 embedder、已登记 guest 和当前授权核验请求。不得枚举任意宿主 webContents 再按外部给出的 ID 操作；其他插件的页面不属于 HUHU。

### 12.2 权限、导航与新窗口

- Session 的 permission request 和 permission check 都由同一策略处理；默认拒绝，用户明确允许时绑定 Space、真实 requesting origin/frame、权限种类和有效期。多个页面不能重复覆盖同一 Session handler。[E1]
- 摄像头、麦克风、定位、屏幕捕获、通知、剪贴板、USB/HID/串口及文件系统权限逐项声明支持；没有实现审批即不可用，不回退自动允许。
- 允许正常 http/https 浏览并显式标示不安全 HTTP；`about:blank` 仅用于受控初始化。`file:`、`javascript:`、`data:` 顶层导航、宿主内部协议及任意自定义 scheme 默认拒绝；下载用途的 blob 等另走有限策略。
- 导航和 redirect 都重新验证协议及授权范围。网站子资源遵循浏览器安全模型，不通过修改全局 Session 绕过证书/CSP/同源策略。
- 外部协议打开必须经可信 UI 确认和协议白名单，不能将网页返回的字符串直接送 `shell.openExternal`。[E5]
- 新页必须在接受网页内容前登记 Space/Page/Session 和权限。OAuth 所需 opener 语义要保留或明确标为不支持；不能用不可靠的 URL 重放掩盖失败。
- 网页 alert/confirm/prompt、beforeunload、HTTP auth 和证书错误有真实反馈；Agent 不自动批准危险系统提示，不全局忽略证书错误。

### 12.3 共享登录态的真实风险

将任务 Space 交给 Agent，意味着它可以在授权范围内以该 Space 已登录的用户身份操作网站。页面提示词不是授权；网站文本也不能扩大文件、系统或其他 Space 权限。

标准观察不返回密码字段值、隐藏认证字段或原始 Cookie。截图与普通可见网页内容仍可能敏感，不能承诺自动完美脱敏；授权界面必须说明数据可能进入所选 Agent/模型，捕获和日志有明确留存策略。

人工接管处理登录/MFA 时停止旧 Agent 观察；交回后 Agent 才继续使用新登录状态。支付、发消息、上传等高风险动作沿调用方已有审批策略，不把“拥有 Space 控制权”自动等同于同意任意外部效果。

这不是对同一 OS 用户下恶意程序或其他高权限 Obsidian 插件的强安全沙箱；安全声明必须与实际信任边界一致。

## 13. 下载、上传、材料与 Obsidian 集成

### 13.1 下载/上传

Session `will-download` 按已登记 guest 映射到 Space/Page，未知归属拒绝或要求人工决定。文件名不能作为路径授权；对路径穿越、重名覆盖、符号链接/重解析点、大小/数量、取消和部分文件清理设边界。[E1]

用户手动下载可使用现有桌面保存对话框；Agent 下载进入用户批准的任务范围，再通过明确文件 handle 交付。下载完成、已导出、已授权读取是不同状态，不能默认把下载目录暴露给所有 Agent。

上传只接受可信文件选择或现有受限文件 grant；网页、模型、CLI 参数不能随意读取任意本机路径。暂未具备可靠上传适配时返回不可用并交给人工，而不是临时关闭 sandbox。

浏览器关闭/Space 删除时处理活动下载与部分文件；已经显式导出到用户位置的文件不因删除 Space 被悄悄连删。

### 13.2 材料发送

保留 `BROWSER_MATERIAL_CONSUMERS` 的实际价值及 `activate:false` 发现方式，避免启用 browser 就唤醒所有 Agent。[S4][S5]

“发送选区/截图/页面材料到某个输入框”继续是用户明确动作，**只填入选定输入，不自动发送会话**。改写来源结构：保留 Space/Page、documentId、URL、采集时间、选择/clip、覆盖和截断；删除仅服务于旧 runtime/frame 传输的身份字段。

捕获、目标确认、真正交付之前验证页面/授权/目标仍有效；目标模块卸载或目标切换不得串会话。交付结果未知时不得自动重复附加材料。网页文本用安全文本/受控 Markdown，不把任意 HTML 放进宿主 React DOM。

### 13.3 已有消费者同步改造

全库扫描 `BROWSER_*`、旧 BrowserWorkspace/AgentAccess 方法、`runtimeId`、`RunGrant`、`ControlLease`、`subscribeFrames`、`renderViewer`、`copyAgentConnection` 等真实引用。

- browser 独立页面与 Agent 工作区内的浏览器标签只引用同一 Space/Page；不各自 new 一个 browser runtime。
- 笔记链接打开、地址输入、搜索、已有工作台导航和设置入口改用新公开接口。
- CLI Agent 工具使用新的结构化能力；BOT 如尚未接入，则增加一条实际可验证的适配链，不把规划中的功能说成已存在。
- huhubot 经现有 Host/HAP 边界调用公开 browser 能力；Go 不直接持有 Electron、扫描 Cookie 数据库或启动浏览器。
- 服务获取继续使用现有 ModuleRegistry/ServiceKey/lease.revoked；**删除浏览器旧控制租约不等于删除整个项目的模块服务撤销机制**。
- 模块 disabled、unsupported、permission denied、empty result 分开；禁止偷偷唤醒 Native 或系统 Chrome 补功能。

## 14. 外部 Agent 接入：一个 Broker，多个薄适配

内部调用直接走公开服务。外部 CLI/MCP 不是核心架构前提，但已有 CLI 消费路径不能留在旧协议上；实施清单必须明确哪些已迁移、哪些经产品决策后置。

需要外部接入时：仅在用户启用并授权任务 Space 后，开启属于本插件实例的本地 Broker。默认采用单一 loopback HTTP/JSON 传输方案，避免同时维护 Unix socket、named pipe、WebSocket 和多种发现协议。

安全与生命周期：

- 只绑定 loopback，使用随机端口和随机短期凭据；loopback 本身不等于授权。
- 验证 Host/Origin，拒绝网页跨源调用，默认不开 CORS；防止 DNS rebinding、超大请求、并发滥用和未知方法。
- 凭据绑定实例、Space、Agent/任务、代次和权限；接管/停用立即失效。通过受限本机引导/句柄交付，不放 URL、模型提示、日志或普通命令行参数。
- 发现信息不携带可跨设备复用的长期秘密；必要文件使用当前 OS 合适权限/ACL，并说明同用户进程边界。
- 解析 Schema、请求大小、并发、队列、超时、响应大小和结果缓存有上限；读写使用同一最终准入校验，不额外实现一套授权。
- 模块停止时停止准入、撤权、关闭连接和 listener；应用不运行时返回不可用，不尝试启动 browser/runtime。

CLI 只进行参数解析、认证引导、序列化和结果展示；MCP 只映射同一动作 Schema；skill 是使用说明，不是授权。可以重建一个小的 `browser-client.cjs` 发行资产，但它没有浏览器内核、Worker 或 supervisor。

高级 MCP 能力可以后置，必须明确状态；不保留空壳工具、假成功按钮或旧运行时客户端作为临时兼容方案。

## 15. Cookie 导入的取舍

**优先级：直接在任务 Space 登录 > 共享控制闭环 > 可选 Cookie 导入。** 登录一次即可人工/Agent 共用，才是核心体验；导入不是人机共享成立的必要条件。

第一版不扫描系统 Chrome/Firefox、不读取/解密其数据库、不恢复 Native SQLite reader，也不把完整 Chrome profile 复制给 Electron。这样可避免把刚删除的跨平台系统依赖再加回来。

后续可选导入先支持用户主动提供、格式明确的 Cookie 导出文件：预览目标 Space、域名、数量、有效期、风险和覆盖规则，用户确认后由 Session cookies API 写入。导入材料不进入模型、通知和普通日志；源文件不自动删除，临时明文不持久化。

必须校验 secure/httpOnly/SameSite、域/path、过期和大小，逐项报告成功/失败；网站登录可能还依赖 IndexedDB/localStorage、设备绑定或浏览器策略，因此不能承诺“导入 Cookie 等于完整迁移登录态”。不得假造源浏览器数据或绕过其 OS 保护机制。[E1]

本项列为明确后置增强，不阻塞核心重构关闭；实现前另补跨平台与隐私验收。

## 16. 清理 Session、删除 Space 与卸载

### 16.1 删除状态机

```text
用户确认删除范围
  → 记录 deleting/tombstone，停止新操作
  → 撤销 Agent / 关闭连接 / 停止页面和下载
  → 收敛该 Session 的网站后台活动与句柄
  → 调用宿主支持的数据清理能力并验证
  → 清理本模块拥有的临时文件/元数据
  → 标记完成，或保留 cleanup-pending 与重试入口
```

删除不能先去掉元数据再把真实清理失败藏起来。删除中的 Space 不能重新导航；每一步可重试，失败保留所有权和有限诊断。最终不能再通过旧 ID/代次接管同一 Session。

### 16.2 清理范围与真实性

按照实际 Electron 版本组合所需 API，覆盖 Cookie、localStorage、IndexedDB、service workers、cache storage、HTTP cache、适用的认证/连接缓存，以及模块自己的下载临时材料；新版 `clearData` 等不能未经能力检查直接用于所有支持版本。[E1]

仅 `clearCache()` 不是登出；仅删 Cookie 不是清空网站数据；仅关闭 webview 不证明 service worker 已停止。清理时防止后台页面重新写入，在测试站验证存储哨兵、活跃请求和重新打开后的状态。

Session API 不等于通用 partition 析构器。可以准确承诺“指定网站数据清除成功”，不能无证据承诺全部物理目录消失或磁盘不可恢复；若产品要求完整移除目录，必须单独证明该宿主/平台在所有句柄释放后安全支持，并且只能操作已登记的该 Space 路径，不能递归删除整个 Obsidian userData。

能力不足或清理失败显示真实状态，必要时要求完整退出宿主后继续处理；不提供一个永远显示成功的删除按钮。

### 16.3 模块停用与卸载

停用：立即拒绝新请求并撤权，终止队列/等待/订阅，关闭拥有的 guest/弹窗/下载/broker，释放自有监听与定时器；默认保留持久 Session 数据和 Space 元数据。

停用不等于清空账号。卸载插件也不保证宿主自动清理 partition，设置页提供明确的“清除浏览器数据”入口和说明。Session 无需持久化重建目录时，不假装调用不存在的 destroy API。

关停失败必须保留可诊断的未完成状态；不提前宣称全部资源已释放，不影响其他模块，不杀 Obsidian 进程。重复启用前防止残留 owner 与新实例同时持有同一页。

## 17. 全面删除清单：删除实现，而不是把名字改成 Electron

以下为已确认入口及必须全库查找的依赖范围。P0 产出最终逐文件清单，实施 PR 逐项登记删除/重写/保留理由。

| 范围 | 必须处理 |
|---|---|
| `native/browser-runtime/` | 整目录删除：supervisor、独立 Chromium 管理、native cookie reader、对应 Cargo 配置/测试/说明；不保留空目录和失效入口 |
| `src/modules/browser/platform/desktop/runtime/` | 旧 adapter/factory、worker、host-main 监督逻辑、进程协议、bundle 管理和生成文件全部删除/替换；不是新增 backend 分支 |
| 根 `browser-worker.cjs`、`browser-worker.cjs.sha256` | 删除发行/提交产物与所有安装、摘要校验、复制、打包引用 |
| `runtime/worker-digest.generated.json`、`runtime/main-source.generated.json` | 删除旧生成内容与生成路径；需要的新小型固定安全策略重新命名并独立审查，不包裹旧 supervisor |
| `scripts/build-browser-runtime.mjs` | 删除旧构建脚本；新桥如需生成，用准确名称和最小输入实现 |
| `tsconfig.browser-worker.json` | 移除旧 worker 项目及所有构建链引用；普通 TS 检查继续存在 |
| `package.json` 的 `build`/`build:browser`/`check:browser-native`/`accept:browser-native` | 删除 Native/worker 步骤，替换为实际新实现检查；不能留下 `build` 还执行已经删除的 tsconfig/script |
| `scripts/verify-browser-runtime-native.mjs` 及 Native 专属 fixture | 删除旧专项测试并由新 Electron/真实宿主验收接替；保留有意义行为场景，不保留错误架构断言 |
| 旧 `browser-cli.cjs` 及其旧协议摘要/客户端实现 | 删除旧运行时客户端；需要外部接入时重建薄 client，重写 `build-browser-client.mjs`/选项/发布清单，不能兼容旧 RPC |
| `platform/desktop/identity/`、`cookies/` 中旧导入链 | 删除 sealed credential store、source reader、系统浏览器探测、原生解密/SQLite 读取及其专属依赖；后置导入不依赖这套代码 |
| `core/identity` 及导入/staging 模型 | 删除身份种子、封存/套用、导入计划/临时运行时等旧核心概念与 API |
| 旧 persistence、cleanup-jobs、profile/recovery 逻辑 | 删除独立用户目录、进程回收、runtime ownership 恢复等实现；新 Session 删除 tombstone 是新最小合同，不复刻旧状态机 |
| 旧帧 UI/传输 | 删除 BrowserFrame、subscribeFrames、HumanInput 重放、viewer/window/frame 租约、帧序号/压缩/轮询等人工浏览链路 |
| 旧 Agent 操作账本 | 删除只服务于 Native 的 prepare/execute/operation、进程 heartbeat/RunGrant 等协议与存储；保留必要的新授权代次及未知效果结果 |
| 设置/i18n/帮助/命令 | 删除安装运行时、选择 bundle、Linux-only、sealed identity、导入浏览器 profile 等失效入口及中英词条 |
| 构建/CI/发布 | 清理 workflows、安装/卸载、runtime 资产下载、manifest/checksum、缓存键、release 附件、打包复制和平台分发判断 |
| 依赖与许可证 | 删除仅由旧 browser 链使用的依赖、锁文件条目和分发声明；共享依赖/历史来源不得误删，按真实新分发内容重新生成 notices |
| 文档/技能/样本 | 重写当前 browser/data/架构/验收说明和黄金样本；失效运行时文档删除或明确归档历史，不让当前入口继续引导安装旧运行时 |
| `main.js`/`styles.css` 等产物 | 按正常构建重生成，证明旧 runtime 未仍被打包；不得只删 TS 而保留可执行旧产物 |

### 17.1 明确禁止误删

`native/pty-server`、`native/huhubot`、Go/Eino/HAP、其他模块的真实执行/存储机制、`host/desktop/secret-protector`、通用 `desktopRemote/bundledMain`、文件授权与模块 ServiceLease 不能仅因含有 native/lease/credential 等词就删除。

旧源码中可复用的纯 URL 校验、材料交付或文件边界逻辑可以经审查提取，但不能保留整个旧目录“以后可能用”。保留的每个浏览器组件必须有新架构中的实际生产调用方、清晰职责和测试；没有调用方即删除。

### 17.2 静态清理验收

新增对生产源码、入口依赖图和发行包的禁止项检查：旧 Native 可执行文件名、runtime bundle、旧 profile 路径、worker/帧订阅/身份封存协议不再可达。历史记录/删除验收文档可显式列入说明性例外，不能以全局字符串零出现误删历史证据。

扫描不只查 import，也查生成代码、脚本字符串、动态路径、发布附件和 CLI 提示。不得以改名、注释掉、feature flag 永久关闭或移到 legacy/ 目录算“彻底删除”。

## 18. 无兼容升级与旧数据处理

新实现直接使用新元数据模型与新 partition 命名空间，不读取或迁移旧 sealed identities、Chromium profiles、操作账本和连接凭据；首次需要用户在新 Space 登录。

升级说明明确：旧运行时先正常停止并完整退出旧宿主，避免旧进程与新实现并行。新浏览器不再为了旧数据恢复而启动旧 supervisor，也不提供旧协议回退。

源码删除立即执行；用户磁盘旧数据默认保留且不被新实现读取。提供明确的人工清理说明或受限、显式确认的旧目录清理动作；范围仅限已确认属于该 Vault/设备的旧浏览器目录，先显示将删除内容及风险。不得删除整个 `.huhu`、系统 Chrome/Firefox profile、其他 Space 或 Obsidian 全部数据。

无需自动迁移、不做双读双写，也无需让旧版本理解新数据。允许按提交撤回代码，但旧二进制不能自动接管新 Session；撤回不等于破坏用户当前数据。

## 19. UI 与交互：像一个普通浏览器，而不是运维控制台

浏览器使用现有工作台页面/侧栏槽位、ReactSurface、shadcn/Radix、语义 token 和 `.huhu-ui` 隔离；按照 #37 的统一语言实现，绝不增加第二套主题或把第三方网页改成 HUHU 皮肤。[S9]

主要界面包含 Space 导航、页面标签、后退/前进/刷新/停止、地址/搜索输入、可读的页面状态、明确的人工/Agent 控制状态、接管/交回和下载入口。

正常人工模式不显示 runtime、租约、进程 ID、profile 路径等旧内部字段。高级诊断集中到详情，展示宿主版本、能力、页面归属和可复制脱敏错误；不能为了简洁隐藏正在撤权、关停未完成或清理失败。

必须覆盖：空 Space、未创建页、加载、离线、导航失败、guest 崩溃、权限等待/拒绝、Agent 暂停、接管中/完成、下载中/失败、删除中/失败及平台不支持。

地址栏显示真实目标，编辑草稿不被每次 title/loading 事件覆盖；长 URL/标题可查看完整内容，认证参数不进入普通日志。刷新/关闭明确作用于当前 pageId，不因切换状态串页。

Portal、计时器、监听和原生表面使用 ownerDocument/ownerWindow；主题更新不重载网页。验证窄面板、长中英文文案、键盘、中文 IME、200% 缩放、亮暗/用户主题、reduced-motion，以及原生表面对 Dialog/菜单的遮挡。

工作台“观察这个 Page”不会默认创建第二个 guest；不支持的位置提供聚焦 owner 的明确动作，而非截图镜像伪装成可交互网页。

## 20. 实施批次与依赖

可以形成一个重构分支并逐步 commit，也可拆出不引入双运行时的前置 PR；最终产品只有新实现。不要在 dev 长期同时发布两套 browser 后端。

| 批次 | 工作 | 退出条件 |
|---|---|---|
| P0 证据与宿主门禁 | 固定最新 dev；完整消费者/删除清单；F01–F12 探针；三平台环境；表面与存储决定 | 核心能力有实际证据，未验项明确；选择唯一生产表面 |
| P1 Session + 人工浏览 | 新核心模型、持久元数据、命名空间、Session/Page registry、普通工作台 UI | 同 Space 登录共享、不同 Space/Vault 隔离、全宿主重启持久化、普通浏览成立 |
| P2 控制权 + Agent Driver | 单写者状态机、最终派发 fence、结构化动作、观察/截图/引用、取消和未知效果 | 人工→Agent→人工→Agent 在同一 guest 完整通过，旧 token 和迟到动作失效 |
| P3 消费者与真实流程 | browser/agent 标签、笔记链接、材料、文件、现有 CLI；适用 BOT 桥；必要认证弹窗 | 所有现有入口不再调用旧协议，至少一个实际 Agent 任务闭环 |
| P4 清理与发布链 | 删除第 17 节旧代码/生成物/依赖/CI/文档；新能力和数据说明 | 无旧运行时生产可达路径，构建/发行不包含浏览器 Native/worker |
| P5 全体验收 | 三平台真实 Obsidian、故障注入、多窗口、规模/预算、安全和完整重启 | 所有核心验收有证据，未完成项没有被填写通过；只在此阶段关闭 Epic |

P1–P4 可以在同一未合入重构分支迭代，但每个合同变更要同步生产者/消费者。删旧实现并不意味着第一步把 dev 变成不可构建状态；不完整中间提交可留在 PR，合入必须是完整纵向切换。

Cookie 导入、任意 evaluate、高级 MCP 和全面跨窗口无损迁移是明确后置项，不作为核心交付前置。已有外部调用入口若被后置，必须记录范围决定、移除失效 UI 并提供明确说明，不能悄悄遗漏。

每批 PR 写明对应任务、实际 SHA、变更调用方、删除清单、检查结果、实机证据、未验项及包体差异。部分 PR 使用 Refs，不提前自动关闭整个 Epic。

## 21. 必须完成的验收矩阵

下表为待执行要求，不是已经通过。每项记录 commit/PR、环境、fixture、步骤/命令和结果。

| ID | 场景 | 必须结果 |
|---|---|---|
| B01 | 无 Chrome、无 HUHU runtime 的干净桌面环境 | 浏览器可直接使用，不下载/启动独立 Chromium |
| B02 | 同 Space 人工登录后 Agent 读取/点击 | 相同 partition、相同 pageId 的 live webContentsId；无需保存/套用身份 |
| B03 | Agent 修改表单后人工接管，再交回 | 页面不重建，表单/滚动/上下文保留；新凭据继续，旧凭据失败 |
| B04 | 同 Space 同源多页 | Cookie/localStorage/IndexedDB 按真实浏览器规则共享；不把 tab-local 状态误判为必须共享 |
| B05 | 不同 Space、不同 Vault、复制 Vault | 不串登录；复制同身份文件不意外接管原 partition |
| B06 | Obsidian 完整退出并重启 | 持久站点数据按合同保留；控制授权不恢复；过期网站会话不被伪报已登录 |
| B07 | React 更新、切标签、隐藏/显示 | 不重复导航、不新建 guest，不丢页面内存；资源数量有上限 |
| B08 | 个人 Space 被 Agent 读取/截图/打开/控制 | 公共服务及外部 transport 均拒绝，不泄漏标签/标题/内容 |
| B09 | 任务 Space 未授权、授权给另一任务 | 拒绝；模型伪造 taskId/spaceId 不获得能力 |
| B10 | Agent 队列等待时人工接管 | 接管不排队；待派发动作取消，旧异步后续不继续输入 |
| B11 | 校验后派发前撤权竞态 | 最终主进程 fence 拒绝旧代次，不仅前端 token 检查通过 |
| B12 | 点击已派发后断连/超时 | 准确 unknown，不自动再点击；可以重新观察/人工确认 |
| B13 | 相同 requestId 重试/不同参数 | 合法重试不重复派发，不同参数冲突拒绝；缓存有界 |
| B14 | 页面跳转、frame 替换、DOM 节点替换 | 旧 ref/document 失效，不点击错节点；明确覆盖范围 |
| B15 | 长页面、SPA、跨源 iframe、shadow root | 已支持范围正确，未支持显式说明；不降安全配置 |
| B16 | 原生输入、中文 IME、选择/滚动/焦点 | 普通人工体验成立；Agent 表单操作经过真实框架 fixture |
| B17 | Agent 观察态的人类键盘/滚轮/触控 | 不混入写入；接管入口始终可用，guest 内已有焦点也受处理 |
| B18 | 登录跳转、OAuth popup、opener/postMessage | 同 Session、所有权明确；不支持路径准确反馈，不静默改坏认证 |
| B19 | 网页试图获得 Node/remote/IPC/文件系统 | 无宿主权限泄漏，任意主进程脚本入口不存在 |
| B20 | 导航到危险 scheme、重定向、外部协议 | 按策略拒绝/确认；证书错误不全局绕过 |
| B21 | permission request/check、多 frame、多页 | 策略一致、origin 精确，未知权限默认拒绝，不污染其他 Session |
| B22 | 手动登录/MFA 期间旧 Agent 截图 | 已撤权，迟到图片/文本不再交付；交回后重新授权 |
| B23 | 网页/模型提示要求升级权限或选其他 Space | 数据不变成指令或 grant，最终服务拒绝 |
| B24 | 文件上传、下载、重名、越界路径、取消 | 只操作授权文件；无穿越覆盖，部分文件有归属/清理 |
| B25 | 材料目标切换/禁用/交付不确定 | 不串会话、不自动提交、不盲目重复附加；来源准确 |
| B26 | 同一 Page 从两个入口/两个窗口打开 | 唯一 guest，或明确聚焦 owner；新开页面明确是新 pageId |
| B27 | owner 窗口关闭、guest 崩溃、未保存网页 | 状态与实际资源一致，有恢复/确认，不误停无关任务 |
| B28 | 模块 disable/re-enable、多次加载 | 无重复事件/guest/broker，无旧 token 复活；失败不影响其他模块 |
| B29 | Session 删除时存在 worker/下载/连接 | 先撤权并收敛再清理，无法完成保持 cleanup-pending；重新打开不恢复已清数据 |
| B30 | 清理失败、进程退出中断、元数据损坏 | 有恢复标记与原文件保护，不显示假成功/空库 |
| B31 | 清空/删除一个 Space | 其他 Space、Vault、Obsidian、系统浏览器及导出文件不受影响 |
| B32 | 外部 Broker 未授权/恶意 Origin/Host/超大请求 | 拒绝且有界，页面不能使用本地接口提升权限 |
| B33 | 外部连接接管/过期/模块卸载后重连 | 旧凭据失效；应用离线不启动隐藏 runtime |
| B34 | 浏览器未启用、移动端、缺少宿主能力 | 明确 unsupported/unavailable；不加载 Node/Electron 到移动端路径 |
| B35 | 亮暗、窄面板、长文案、缩放、IME、多窗口 Portal | 主操作/真实地址可达，弹层不被原生 surface 穿透或遮挡 |
| B36 | 源码/产物/发行包全局清理 | 无独立 browser executable、bundle、worker、sealed identity 及旧协议可达路径 |
| B37 | 正常退出/重启与任务恢复 | 仅恢复允许的元数据和网站数据，不自动恢复 Agent 控制或重放外部效果 |
| B38 | 日志、通知、文件、诊断秘密哨兵 | 无 token/Cookie/密码/认证回调和不必要页面正文泄漏；显式材料留存另有授权 |
| B39 | 多 Space/多标签规模与空闲 | 单 Page 单 guest，无帧轮询/无界等待；停止后资源回落，预算有前后证据 |
| B40 | 终端与 HUHU Bot 回归 | 未误删它们的 Native/Go/HAP、服务 lease、文件权限或效果保护 |

跨平台记录至少覆盖项目实际发布的 Windows、macOS、Linux 环境，并分别记录 x64/arm64 中实际支持的组合。不能因为无 Native 编译步骤就直接把未测架构标为支持。最小声明宿主版本和代表性当前安装器都要验证，尤其是权限、持久化、输入和弹窗。

## 22. 测试、性能与质量门禁

### 22.1 三层测试

- 纯逻辑/合同：Space 分类、URL 策略、控制转移、代次撤权、去重、错误、数据校验、删除恢复。
- Electron 适配集成：真实 Session/guest、权限、输入、截图、崩溃、下载与清理。独立 Electron fixture 仅证明适配行为，不能替代 Obsidian 宿主验证。
- 真实 Obsidian：完整重启、宿主桥、工作台、跨窗口、IME、Portal/原生表面、真实 Agent 调用和平台差异。

happy-dom/模拟 webview 无法证明真实 partition 或登录共享。测试站使用可控 Cookie/存储哨兵、表单/SPA、同源与跨源 frame、popup、下载、权限和延迟请求；不用真实用户账号/秘密做自动化 fixture。

### 22.2 性能原则

删除全程截图帧推送、人工事件序列化和额外 runtime 下载/启动；改为原生页面交互、按需截图及事件订阅。收益必须通过同机前后采样报告，不预先承诺固定节省百分比或“零开销”。

限制活跃 guest、队列长度、并发、快照文本/节点、图片大小、下载和结果缓存；新增未活跃页可以只建元数据再按需加载。休眠/丢弃真实页会丢页面内存，必须作为明确功能，不对正在执行或有未保存输入的页面悄悄发生。

记录冷/热启动、打开浏览器、首个页面、接管延迟、输入响应、截图耗时、内存、空闲 CPU、guest/监听数量及 JS/CSS/eager/activation 预算。复用 #37 的预算治理，不静默扩大阈值；单文件发布中动态 import 不自动证明 main.js 变小。

### 22.3 基线已有检查命令

以下来自当前 `package.json` [S12]，是后续按影响范围执行的检查，不是本次已经运行的结果：

```bash
pnpm lint
pnpm format:check
pnpm test:unit
pnpm test:architecture
pnpm test:i18n
pnpm test:docs
pnpm test:workbench-entry
pnpm test:workbench-lifecycle
pnpm test:safety-regressions
pnpm lint:css
pnpm check:styles
pnpm test:ui-styles
pnpm test:ui-adapters
pnpm test:ui-runtime
pnpm test:styles
pnpm check:notices
pnpm test:license-texts
pnpm build
pnpm check:bundle
```

实际触及 BOT/CLI/终端契约时追加其现有专项验证；收口执行适用的 `pnpm test:all`。`pnpm build` 自身要先随本次改造去掉旧 worker/native 步骤。

新浏览器/Electron/宿主验收脚本是待实现内容，命名须在实现中登记，不能把不存在的 `test:browser-electron` 写成当前已运行命令。旧 `check:browser-native`/`accept:browser-native` 随旧实现删除，不能继续作为新架构通过依据。

## 23. 四个开放问题的明确建议

| 问题 | 本 Issue 的决定 |
|---|---|
| 仅 executeJavaScript 是否足够？ | 不足。标准接口采用结构化观察/导航/交互/截图/等待/文件动作；JS 仅作内部受控实现。任意 evaluate 不是第一版能力 |
| 是否保留个人 Space 硬限制？ | 保留，涵盖读取与控制，服务端落实。用户可显式转换为任务 Space，但 Agent 不能自我授权 |
| Cookie 导入优先级？ | 后置。先在任务 Space 直接登录，完成共享与接管；不为导入恢复 Native reader/系统数据库提取 |
| webview 长期风险怎么办？ | P0 实机门禁、窄 surface 合同、宿主版本记录和升级 smoke tests；WebContentsView 经同样验证后可改选，不同时养两套实现，更不回退独立 Chromium |

## 24. 完成定义与关闭条件

- [ ] F01–F12 核心宿主可行性有实际证据，唯一生产表面及支持版本边界已确定。
- [ ] 人工与 Agent 在同一任务 Space、同一 live Page 完整交替控制，不复制 Cookie，不创建隐藏 Agent 浏览器。
- [ ] 个人 Space 授权限制、即时撤权、旧凭据失效、元素过期和未知效果合同全部落实。
- [ ] 正常人工浏览、登录、标签、输入、截图、文件和材料流程可用；特殊网站限制如实记录。
- [ ] 当前所有浏览器消费者已同步切换；没有旧 API 包装、双协议、双状态真相或悬空入口。
- [ ] `native/browser-runtime`、旧 worker、bundle、profile/identity、帧显示和专属账本从源码与发行包物理删除。
- [ ] 通用宿主桥、终端 Native、Go Bot、模块服务撤销和其他安全机制没有被误删。
- [ ] Session 持久化、Space/Vault 隔离、完整重启、清理失败与卸载说明准确；无静默删除用户数据。
- [ ] B01–B40 逐项有代码及测试/实机结果，三平台实际支持组合得到验证；缺环境的项目保持未完成。
- [ ] 启动与资源、包体、样式、架构、i18n、许可、构建和生成产物一致，没有通过放宽门禁掩盖问题。
- [ ] 当前维护文档与开发规则已更新；历史运行时说明不再被当作操作指南。

**关闭标准不是“已经渲染了一个 webview”，而是浏览器的唯一实现已经变成宿主原生共享会话架构，关键人机流程与资源/安全边界得到验证，并且旧运行时整条链路确实不存在。**

## 25. 固定源码与官方资料

### 当前仓库

[S1]: https://github.com/NAMEWTA/obsidian-huhu/blob/2670440678e5819a680024978b5feb2491ce7a35/AGENTS.md
[S2]: https://github.com/NAMEWTA/obsidian-huhu/blob/2670440678e5819a680024978b5feb2491ce7a35/.agents/skills/dev/SKILL.md
[S3]: https://github.com/NAMEWTA/obsidian-huhu/blob/2670440678e5819a680024978b5feb2491ce7a35/.agents/skills/dev/references/architecture.md
[S4]: https://github.com/NAMEWTA/obsidian-huhu/blob/2670440678e5819a680024978b5feb2491ce7a35/src/modules/browser/module.ts
[S5]: https://github.com/NAMEWTA/obsidian-huhu/blob/2670440678e5819a680024978b5feb2491ce7a35/src/modules/browser/api.ts
[S6]: https://github.com/NAMEWTA/obsidian-huhu/blob/2670440678e5819a680024978b5feb2491ce7a35/src/modules/browser/platform/desktop/composition.ts
[S7]: https://github.com/NAMEWTA/obsidian-huhu/blob/2670440678e5819a680024978b5feb2491ce7a35/src/host/desktop/electron-main.ts
[S8]: https://github.com/NAMEWTA/obsidian-huhu/blob/2670440678e5819a680024978b5feb2491ce7a35/src/host/obsidian/storage/device-id.ts
[S9]: https://github.com/NAMEWTA/obsidian-huhu/blob/2670440678e5819a680024978b5feb2491ce7a35/.agents/skills/ui/SKILL.md
[S10]: https://github.com/NAMEWTA/obsidian-huhu/blob/2670440678e5819a680024978b5feb2491ce7a35/scripts/build-browser-runtime.mjs
[S11]: https://github.com/NAMEWTA/obsidian-huhu/blob/2670440678e5819a680024978b5feb2491ce7a35/scripts/build-browser-client.mjs
[S12]: https://github.com/NAMEWTA/obsidian-huhu/blob/2670440678e5819a680024978b5feb2491ce7a35/package.json

入口：[仓库规则][S1] · [开发规则][S2] · [导入与模块边界][S3] · [浏览器装配][S4] · [旧公共契约][S5] · [旧桌面装配][S6] · [现有宿主桥][S7] · [Vault 身份][S8] · [UI 规范][S9] · [旧 worker 构建][S10] · [旧客户端构建][S11] · [现有命令][S12]。

### Electron 官方文档

[E1]: https://www.electronjs.org/docs/latest/api/session
[E2]: https://www.electronjs.org/docs/latest/api/webview-tag
[E3]: https://www.electronjs.org/docs/latest/api/web-contents-view
[E4]: https://www.electronjs.org/docs/latest/api/web-contents
[E5]: https://www.electronjs.org/docs/latest/tutorial/security

资料：[Session/partition/清理/权限][E1] · [webview 启用与维护警告][E2] · [WebContentsView][E3] · [WebContents 输入/执行/截图][E4] · [Electron 安全建议][E5]。

这些链接是能力语义参考，不是 HUHU 当前宿主已支持所有最新 API 的证明；实现必须以 P0 记录的实际 Obsidian/Electron 版本和结果为准。

## Source Comments

无。截至捕获时已读取全部评论，共 0 条。

## PR Evidence

不适用；来源是 Issue，不是 PR。
