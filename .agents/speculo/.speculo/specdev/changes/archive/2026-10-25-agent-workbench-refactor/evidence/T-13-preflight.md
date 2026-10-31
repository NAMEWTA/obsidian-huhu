# T-13 independent-browser：只读预检

2026-10-25；`/root/prepare_t02`，沿用 6.1-sol/xhigh。workspace `/home/wta/orca/workspaces/obsidian-huhu/terminal`；branch/base/HEAD 取 Root 派单事实 `NAMEWTA/terminal` / `33c21e098ef3188cbab5a09f3e0a01fadb787715`，没有运行 Git 核实。回读 Map revision14 / GP013、T-13、dev/ui 及绑定 architecture/licensing/testing/shell/design-system/motion-a11y、Spec §3.3/3.8–3.10/§11、implementation-contracts、reference-notes、DESIGN rev1 PAGE-001/004 和 T09/T14 预检。DESIGN 仍为已批 A、摘要 `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab`。

**结论：现有 BrowserEngine、profile/session、Cookie 及 retained guest 都可复用；阻碍在 Agent-owned 的标签路由、布局实例及页面生命周期。不要创建第二 Browser owner/cache，也不要仅把 acquire 改成 peek 就声称完成。T-13 依赖 T-09；目前尚无其冻结共享布局/renderer 接口，下面是工程接线要求，未假称存在未来 API。**

## 当前生产链和真实 owner

| 链路 | 已观察事实及影响 |
|---|---|
| 独立入口 | `app/commands.ts:28` 的 `open-browser` 和 `main.ts:283` 的 openBrowser 已存在，先 acquire `BROWSER_OPEN`。Browser 是 startup/defaultEnabled/desktop 模块，提供 BROWSER_HOST/OPEN/PROFILES。**Browser 没有自己的工作台 page contribution**。其 `module.ts:25` 的 open 再 acquire `AGENT_BROWSER_TABS`；Agent 关闭时无法打开，Agent 启用但 idle 时会激活 Agent。网页链接/新窗口经同一 BrowserWorkspacePort.open 返回这条链。 |
| Agent 标签适配 | `agent/module.ts:85–96` 发布 AGENT_BROWSER_TABS：等待 persistence.ready → 当前布局 URL/profile reuse 或 newBrowser → shell.open(terminal) → 返回当前 browser pageId；list/activate/close/sessionOrder 也只查当前布局。独立入口不能保留这一 acquire 作为必需前置，也不能把当前布局 list 冒充所有 Space 或所有 leaf 的 registry。旧 URL/profile reuse、返回 pageId 和可定位失败必须保留。 |
| 页面及路由 | `compose-workbench.ts:73` 的 terminal contribution 为 Agent availability，create 调 Agent module page；`workbench.ts:11` FEATURE_MODULES.terminal=agent。compose 的 prepareModuleChanges 据此把 terminal 加入 disabled；`shell/host/workbench-pages.ts:170` 真正关闭并 retain 页面。只改可用性还不够，显式停模块分支也会卸载网页 React。唯一宿主 view 仍是工作台；不增加 view 类型、不回到 ItemView 嵌套。 |
| 布局持久 owner | `AgentController:165` 创建真实 desktop SpacePorts → SpaceService → createSpaceWorkspaceStore → WorkspaceService。SpaceService 独占 v2 队列、permit、owner、scope/version/recovery 门；Records 包含 per-Space layouts 和 sharedLayout。无 Space 的 browser/page 已可存在 sharedLayout，`SpaceEmptyState` 也有 browser action；**这不等于 Agent-off 独立**，实例仍随 Controller dispose 严格 flush/SpaceService.dispose。BrowserStore 只持 history/permissions，profiles.json 只持 profile 元数据，均不是标签布局 owner。 |
| 页面承载 | WorkspaceLayout 与 TabStrip 分别直接选择 BrowserTabView、BrowserWorkspaceTab。两者都依赖 Agent workspace context/controller；BrowserTabView 通过公开 BROWSER_HOST 获 page、renderChrome，并把 page.store 更新写回 WorkspaceService.updateBrowser。新共享 carrier 应借公开端口注入 renderer/操作，不能由 shell 静态导入这些模块实现。 |
| 网页引擎 | BrowserEngine 每 Browser activation 一份 pages Map / prepared sessions Map；createPage 按 restoreId 复用 PageHandle。Browser dispose 才 abort imports、dispose pages/session bindings、shutdown profiles/history。Agent 停用应释放 Agent runtime/观察者而保持此 Browser owner。不要把关闭一个 pane 的 T03 detach 语义套成“不许关网页”：网页 close 仍关闭该 page，并保留进行中下载的确认；terminal close 仍仅 detach。 |
| Cookie/native | T01 已完成：BrowserEngine 构造 nativeCookieReader(context.native, Browser lifetime)，readCookies 每次 acquire('cookies')，finally release；无 Agent service acquire。仅 Browser 激活不取得 helper。module.test 的真 BrowserEngine + TerminalSessions + NativeHost（只换 framed I/O）已有 Cookie 等 Agent dispose 后完成的用例。NATIVE_HELPER_SQLITE 旧兼容键仍在 Agent，但本条生产 Cookie 路径不再依赖它。不要重做 NativeHost 或增加常驻 Browser helper lease。 |

## 必须保留的原生与恢复边界

- **两种 owner 不合并：** native helper 的 cookies capability lease，与 Chromium profile/session lease 是不同设施。后者由 `host/desktop/browser-session.ts` 的主进程 session runtime、BrowserEngine preparedSession 和每 guest binding 管理；同设备/profile 的 windows 共用库内显式 session 目录，不改成默认 Obsidian session，也不新增 Browser partition/cache。
- **main webContents 只是绑定锚点：** prepared-session 为目标 popout 和持久 broker 的 webContents 注册带随机 partition token 的 will-attach-webview 绑定，随后替换为已验证显式 native session；这适配 Obsidian 从主 renderer adopt 构造器的情况。不要把宿主主 webContents 本身当 Browser page、替它导航/关停、改默认 session 或装全局 guest 控制器。guest-policy 校验 `getType()==webview`、nodeIntegration=false、session storagePath 相同，只约束实际 guest/允许的子窗口。
- BrowserPage 的 DOM listener/尺寸 timer 属 guest 所在窗口；IPC/state callback 经持久 broker window。RetainedPage 在同 Document 内保持 webview 父节点不变，隐藏/inert 只隐藏 retained host；跨 Document 必须重建 guest，保留 URL/profile/zoom 及**内存** navigationHistory，不承诺保留表单、脚本状态。BrowserTabView 在 adoption/layout-change/window-close 后重新提供正确 ownerDocument；HuhuProviders 的 PortalRoot 按 Document 引用计数。迁移到共享 carrier 时保留这一闭包与 late async cancellation，不能用 module-top-level document。
- 当前布局记录 browser pageId/url/title/profileId/zoom/favicon，未将 Chromium pageState 或完整后退历史写盘。恢复用相同 pageId 查/建 page；不得调用正常 newBrowser 再生成另一组 ID。浏览历史 state.json 不是 tab registry。恢复 browser 可以创建网页 guest，不应启动 PTY/Provider/原生历史扫描；Browser native Cookie 明确使用不算 Agent 激活。
- v1 workspace.json 当前保留隔离；v2 envelope 内嵌 WorkspaceState.version=1 是布局 schema，**不是旧 v1 writer**。T13 做旧 browser route/布局兼容适配，正式转换、恢复副本和 writer 收缩归 T15。不能借迁移之名让 shell/Browser 再写 v1 或新建 browser-layout.json。T02 unknown version/foreign scope 零恢复写、EIO 显式重试、同 selectedID merge/dirty/in-flight save 与 owner drain 必须原样维持。

## 最小保兼容路线和派单前缺口

1. **先消费 T09 的真实最终 layout/renderer 接缝。** 它至少要给共享 carrier 同一个只读 snapshot+subscribe、按捕获 scope 的 tab/group open/update/activate/move/close、明确 group/focus、严格 flush/lifetime 借用。名称和 DTO 待 T09 固定；不创建 T07 registry/CLI 的替代品，不把 T03 managed runtime 转交 Browser。当前 terminal 路由可以在 shared carrier 下保留，Browser 通过原 command/链接独立进入；是否另加 feature id 应由实际既定接缝决定，不是本轮新增产品需求。
2. **把一份布局 repository 的 lifetime 提升到共享宿主，再让 Agent 借用。** 开关切换只撤销 Agent renderer/操作/runtime，保留 Browser renderer/记录/队列；最后宿主 shutdown 才 drain/dispose。同一个物理 Vault/device 继续只有 T02 那个 owner。不能同时保留 Controller 自建 SpaceService 又让 Browser 自建同文件 owner；“同进程所以安全”也不成立。首次使用及空 Space 不启动 helper/provider；shared store 只做必要轻量加载，首次写再取得 OS owner。
3. Browser.module 的 workspace port 接真实 shared carrier，BROWSER_OPEN 不依赖 Agent。Browser page/chrome/profile/tools 保持现有引擎；Agent UI 的 browser adapter 逐步只做代理。既有 AGENT_BROWSER_TABS 可短期变薄适配层，保留实际调用方兼容，不能提前删公共 API；最终收缩由 T14/T15 的引用与 writer 证据决定。
4. restore/disable 在 shared carrier 上保留既有 tab/group/focus、未落盘编辑与当前 pageId。Agent renderer 不可用时只降级 Agent 区域，不能关闭整个含 Browser 的 carrier。Browser 模块自身关闭才卸载网页能力；重开采用同一持久布局，失败不能用空布局覆盖。

**当前票 writable_paths 并未覆盖所有实际源 owner。下列是精确需核对的缺口，不是本轮授权，也不建议预先整目录扩写：**

- `src/modules/agent/services/controller.ts`：现在唯一实例化和关闭 SpaceService/bridge 的位置；`src/modules/agent/services/controller-space.test.ts`：真实 dispose/严格失败清理。若 T09 未迁移该 lifetime，T13 必须补此源+相邻测试，单改 workspace-service 不足。
- `src/modules/agent/services/workspace-store.ts`、`workspace-store-spaces.test.ts`：同一 v2 bridge/dirty/in-flight 协调与 dispose ownership。若只把 bridge 作为共享宿主借用可避免改 merge 实现；若移动其 owner，必须补精确源路径并保留原回归。不能把这份实现复制为第二套。
- `src/app/contracts/module.ts`、`src/app/main.ts`：目前 ModuleContext/ShellAccess 没有共享布局 access；app main 负责建 ModuleContext 和 unload。若用注入把同一 host port 交给 Browser/Agent，需这两条，不仅当前已准的 workbench*.ts/compose。不新增 app serviceKey owner（ModuleId 没有 app）；用宿主注入/既有合法契约，不能 fake acquire Agent。
- `src/modules/agent/ui/AgentWorkspacePage.tsx` 及其现有 `.dom.test.tsx`（如实际采用的就近测试）：当前 `ui/workbench-page.ts` 只有 re-export，实际 root/导航 Portal/确认队列在 AgentWorkspacePage。若抽共享 root，只改 re-export 不会迁走 Agent context。`src/modules/agent/ui/tabs/TabStrip.tsx` 与 `WorkspaceTab.tsx` 是原 tab dispatch/菜单源；需要移动/委托时也应精确补，不删原菜单另造精简替身。
- 当前 model/ops/layout-merge 都在 Agent 私有目录，且 ops 含 provider/terminal normalize 依赖。shell 不能直接导入。**先看 T09 实际交付是否已有中立纯 DTO/算法及 renderer 注入**；如没有，Root 需先确定一次有意提取的源/目标精确路径与引用变更，不能把私有树原封复制到 shell 或先开放整个 agent/shared。当前预检不足以把这些未来移动名当已批准写路径。
- 当前票的 Browser host*.ts/ui/**、Agent ui/browser/**/ui/workspace/**、api/module/compose 与 app/workbench contracts 已覆盖大部分适配。新增 `browser/module` 行为回归不在 `module.ts` 的 exact path；建议补 `src/modules/browser/module.test.ts`。新增 app contribution 生命周期回归建议就近精确 `src/app/workbench/browser-contribution.test.ts`（拟新增，尚无文件）。若需要调整原生 guest 行为而非仅复用，Browser platform/desktop 与 host/desktop 并不在 T13 写集，先提交实际必要路径；目前未见必须重写它们的理由。

## 材料、菜单与焦点交接

Browser.module 仅 **peek** AGENT_SESSIONS：list 返回当前交互 Agent；同组 sessionOrder 只是排序，不是默认目标。DesignTools 展示选择并传选中 runtime id；BrowserEngine.attach 先保存图片，再调用 SessionMaterialService。后者捕获原 session 对象/agentId，保留 pending reservation、10s 就绪等待、换代/退出/busy/cancelled 拒绝，最终单次 paste，不发 Enter；明确投递会定位该目标。无 Agent 时只显示无可投递目标，网页/复制/截图仍可用，不能 acquire Agent 或 fresh fallback。

T14 负责稳定 Space/Session/runtime 适配；T13 要保留原 API 和公开接线，不根据当前网页/焦点重绑。T03 detach 后运行可能没有 tab，因此“同组优先”和“定位投递目标”不能继续把展示 tab 当唯一存在证明；T13 接 T09 最终投影，T14 做旧服务目标映射。异步选目标/图片保存/页面打开期间切 Space、切 tab、popout 关闭，必须仍只向捕获目标投递，失败准确保留材料；query/后台恢复不抢焦点。明确投递成功后的定位可以保留原产品行为，不能用新的后台消息规则悄悄删掉。

保留 BrowserWorkspaceTab 的 reload/copy URL/copy Markdown/external/duplicate/profile-switch/split right+down/close+others+right、pin 保护与下载确认，以及 Chrome 地址建议/历史/切 tab、前后退、刷新停止/强刷、站点权限、Cookie、profile、新 profile、抓取/标注/绘制/截图、viewport、find、zoom、downloads 和设置。原生 main-process popup/shortcut policy、Obsidian Scope/IME、popout Portal 一并保留。现有 tab close 图标部分视觉尺寸很小；共享迁移的受影响控件仍须测 32px/44px，不把旧尺寸直接当设计豁免。

## 可复用真实接缝与需要补的验证（本轮均未运行）

| 验证层 | 现有真实资产及最小新增断言 |
|---|---|
| Browser/native owner | `browser/module.test.ts` 真装配 + `host/desktop/native/host.test.ts`（Cookie 完成、最后 owner 释放、crash 代次）；补 Agent disabled 时 open/restore 能走共享 carrier，服务 acquire spy 不出现 Agent，激活/普通网页打开零 PTY/provider/history/helper。Cookie read 的实际 native 租约可以按明确动作启动 helper，不能把零 helper 断言套到 Cookie 执行期间。 |
| 单 writer/恢复 | T02 `workspace-store-spaces.test.ts`、`workspace-service-spaces.test.ts` 真 FS/owner/JsonStore 集成，保留 future/foreign、EIO、strict drain、两个 append、select 与 dirty/in-flight merge。补 Browser open→Agent disable→Browser navigate/rename/move/close→flush→新 host restore 的同一仓储链，primary/backup 旧数据保全，Agent re-enable 不创建第二 writer；保存故障/owner lost 可定位、不声称成功。不能整个布局 service mock 后宣称此链已通过。 |
| guest/Document | `BrowserTabView.dom.test.tsx` 只 mock page、证明 ownerDocument adoption；`retained-page.dom.test.tsx`、`page-lifecycle.dom.test.tsx` 证明位置/历史/初始化失败 retry；`prepared-session.test.ts` 证明主窗+popout 独立 binding；`host/desktop/browser-session-main.test.ts` 用真实 bundled policy + injected electron/fs，证明显式 session/下载/最后 guest teardown。保留同文档 guest 不重建、跨文档 guest 重建且 history/profile/zoom 正确、host main 不被关停。 |
| 原导航与菜单 | `BrowserChrome.dom.test.tsx` 地址 dirty/非法 URL；browser.test.ts URL/material/queue/guest-policy；note-links.dom.test.tsx 多窗监听释放；shell navigation-state 与 workbench-surface tests 的 latest-navigation-wins、模块失效、Portal关闭/页面保留。WorkspaceLayout 当前 DOM **mock 了 BrowserTabView/BrowserWorkspaceTab**，不能当网页集成。需真实 shared root + Browser renderer 的生产组件 DOM，覆盖原菜单/下载取消/晚恢复不切新 leaf；材料保留 session-material.test 的一次 paste/no Enter/取消/失效。 |
| Cookie 数据及脚本 | cookies/write.test/snapshot.test/cdp.test 等现有 exact-domain/rollback/锁/清理断言可复用，未知新路径不扩写。`browser-cookie-import.mjs` 当前 fixture agent=true，且 Edge mixed result 是 canned result；应扩 Agent-off/no-space 检查并保留隔离来源，但不能把它的原结果称为独立 Browser 已通过。脚本真实 Obsidian 执行由用户按 §11；Agent 做脚本可运行性/代码自动化与 Root 构建，未跑不得记 pass。 |

UI 局部生产组件矩阵：PAGE001/004 的正常/空/noSpace/Agent-off、Browser-off、loading、加载失败+retry、保存失败+恢复入口、长中文/title、菜单/材料无目标与迟到失败。≥960、600–959、<600（含约320宽/200%等价）、亮暗+代表性主题、en/zh、reduced-motion；tab/group/Chrome 横向溢出、32px desktop/44px coarse、IME 不误导航、Arrow/Home/End/Delete/中键、Esc/Tab 与 focus return。所属主窗/popout document 和主 webContents 策略可用隔离 DOM/Chrome+注入边界自动化分层证明；真实 Obsidian guest、登录/Cookie、重启与五平台实机仍交用户，不拿本地 harness 冒充。

## 参考采用与停止边界

复用 reference-notes 已固定 R02 Wave `97e560027f494d20fed347b2d6b72b6bcb3e50e0`（Apache-2.0）的 controller/view 分离机制及 K06 v0.14.5 的网页前后退、剪贴板与焦点回归线索；不搬 Wave 的 Electron app、Go/SQLite/Jotai，不改 HUHU 宿主/依赖。HUHU 现有 Orca 适配 retained guest/chrome/menu 已有固定来源头，本轮只定位，不新增复制。没有遇到需新外查才能判断的陌生实现；未浏览外网、未引入新来源/依赖，也未把历史外部 Issue 当 HUHU 已复现 bug。

97 份输入的全文件时点 SHA/字节见 `/tmp/huhu-t13-source-observation.json`，SHA256 `4b0ab7d1fd942e3b32c746db1bfc150a6d934819d63aec6b0be121b5f605909f`。包括全文/相关段/定向检索及 hash 观察，**不是冻结审查输入、不是测试证据**；T03 正独立 review，T09 未实施，派单时须回读实际交付。

本轮只读仓库；仅写本报告及上述 JSON。未运行 tests/lint/build/helper/provider/native/宿主进程、未改 Git/deps/正式 C/生成物，未派 Agent。未解锁 T13，未修改任何 T03 源。

**READ-ONLY STOPPED**
