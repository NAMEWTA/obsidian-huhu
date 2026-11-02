# 任务回报

Session: 20261026T045732Z  
Task: 030-t13-browser-preparation  
Status: completed

## 聚焦交接

030 的有界只读准备已完成，未开启或实施 T13，未运行测试、构建、Chrome、PTY、helper、Provider 或 Obsidian。推荐从原 WorkspaceLayout 提取纯共享标签/分组渲染接缝，由 Browser 贡献自己的 renderer，并以独立 Browser 工作台页面作为同一承载的可恢复入口；保持原 workbench-v2 记录与布局的唯一 writer，只调整其轻量生命周期，不能新建 Browser/Agent 两份布局。Cookie 独立能力租约已经完成，保留 T08 R5/F7 的原读取错误与清理错误聚合；旧 T13 文中的“Cookie 走 Agent”只适用于旧探索基线。实施前须回读 T09 最终的原布局 owner/Pane API，并由 Root 补齐下述生命周期与注入所必需的精确路径；这不是新的产品决定或额外服务需求。

本报告只证明候选路线和真实静态起点，不证明 AC-041/061、T13 或 Goal 通过。Root 仍是唯一状态/Evidence owner；T09 A/B 可以继续各自写入，030 不声称动态工作区无漂移或全仓停写。实际 worker 为 `/root/prepare_t13_browser`，请求模型为 `gpt-6.1-sol` / `xhigh`，原生派遣句柄与模型回执由 Root 工具记录拥有，worker 未另外探测模型或创建会话定位文件。

## 产物与验证

证据根为 `/tmp/huhu-t13-browser-preparation-20261026T160524Z`（以下称 R）。本次只写本 REPORT 和全新 R，产品、正式合同/状态、旧研究/证据、Git/index、依赖、Cargo 缓存和既有 bin 均只读。

### 输入与来源边界

- bootstrap 实读 workspace/catalog，随后回读完整 Map34、dev/ui、T13、GP033、Spec §3.1–3.3/§3.8/AC-041/061、公共合同、DESIGN PAGE001/004，以及 012/013/024 原研究。只读规则核对不产生 Skill implement/verify passed 记录。
- TASK SHA256 为 `6716add12ab7844ae77760889ed459b2cb5c5e1964f0a684940aa236452d2037`，已实际核验。指定 T09 起点 manifest SHA256 为 `aec8e02b821c7ea7869e0c153e213acc655fb60e1e9347cd78919577462acfc8`，同样核验；其 HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715` / `NAMEWTA/terminal` 是本次使用的输入 provenance，未靠 Git 操作重新冻结工作区。
- 所有讨论的产品源均取该 manifest 指向的原 snapshot 字节，没有读取 T09 中途修改内容或追逐 diff。R/selected-input-manifest.json 保存 232 项唯一输入（其中 199 项为 manifest 产品/规则快照）、约 2.77 MB、各 path/SHA/bytes/原模式/实际 snapshot 模式/CAS；其 SHA256 为 `0eb4c36e3e8e0c436e09803df18bef8d1a959ca85def8df57ce7960a74536660`。本地 CAS 重算 hash errors=[]；所列产品初始模式与当前路径 lstat 模式差异=[]。模式一致不表示内容无漂移。
- Map/Goal 作为行政输入另存：Map34 SHA `8ef0da615ac6d8aaf45e66f48de33f6a18dc72d4abfe69e72fb6eafbd6b6ee1c`，GP033 SHA `d41caa13f843d9cce43c664cf2ab87b11f9163ef221eb31837698b932d51f384`。未重写 TASK、Map、Goal 或 Ticket。
- R/objects 为选定原始字节；R/inputs.jsonl 为逐次来源；R/commands 保存实际 argv/cwd/UTC/exit/stdout/stderr 原件，R/command-index.json 为索引。初始 bootstrap/路径发现先于捕获器，没有独立 raw 文件及 UTC 开始值；权威输入随后已重采，未补造原开始时间。首次并行捕获 Map/Goal 时文件编号冲突，后续改成 PID 唯一名并串行重采两者；不声称初始两条收据都完整。

下列行号均指 R 中的 T09 起点 snapshot，而非当前 T09 最终源码。

### 一、真实最小调用链

```text
命令 / Home URL卡片与RSS / automation.openUrl / 笔记或终端链接
  → app.openBrowser 或公开 BROWSER_OPEN / BrowserEngine.routeLink
  → browser.module.open.acquire(AGENT_BROWSER_TABS)
  → agent.module: workspace.persistence.ready / reuse查找 / newBrowser
  → 原 WorkspaceService + SpaceWorkspaceStore
  → context.shell.open({ feature: 'terminal' })
  → composeWorkbench.modulePage('agent','terminal')
  → AgentWorkspacePage → WorkspaceLayout / TabStrip / BrowserTabView
  → 公开 BROWSER_HOST → BrowserEngine.getPage/createPage
  → PageHandle → RetainedPage / BrowserPage / 原 Electron guest

page.store变化 → BrowserTabView订阅 → WorkspaceService.updateBrowser
  → 同 draft/merge/saveLayout → SpaceService唯一队列
  → .huhu/terminal-agent/<device-id>/workbench-v2.json

Browser Cookie UI → BrowserEngine.readCookies
  → shared/native/nativeCookieReader → native.acquire('cookies')
  → read → 等待本lease.release；与Agent页/Provider/PTY无必然关系
```

| 层 | 起点事实与准确阻断 |
| --- | --- |
| 模块激活 | `browser/module.ts:20–24` 的网页打开依赖 Agent-owned service；registry `acquire` 会在 Agent 已启用时激活它，Agent-off 时返回 undefined。Browser 自身 activate 只装配 Engine/Profile/历史及笔记链接观察，没有页面贡献。仅把 acquire 改 peek 不能获得独立承载。 |
| 页面导航 | `agent/module.ts:113–127` 打开后强制 terminal feature；`compose-workbench.ts:71–85` 将 terminal availability 绑定 Agent，pages loader 先 prepareWorkbench。`workbench.ts:5–21` 没有 Browser feature。Agent-off 的实质阻断是服务路由和页面可用性，不能把它描述为 Cookie 不能运行。 |
| 无 Space | `WorkspaceService.newBrowser:1547–1570` 没有 requireSpace/Session admission；`workspace-store.ts:99–102` 在 selectedSpaceId 缺失时读 records.sharedLayout，选中 Space 时读 layouts[spaceId]。所以“无 Space 一律被业务 Space 选择阻断”不符合起点；它仍依赖 Agent Controller 和 writer 生命周期。新运行绑定 Space 的规则不适用于纯网页。 |
| 渲染 owner | `BrowserTabView.tsx:12–15/56–105` 从 Agent context 取 BrowserHost，并把页面状态回写 Agent workspace。具体 guest 由 BrowserEngine/PageHandle 拥有，Agent UI 是显示适配器。`PageHandle.mount:368–420` 按 ownerDocument 重建 guest、保留 history；同 pageId 只能有一个当前 placeholder。 |
| Agent 停用 | shell prepareModuleChanges/refreshAvailability 将 terminal page retain后关闭；组件 unmount 将网页 unmount。Controller dispose 最终 workspace.dispose→persistence.dispose→spaces.dispose，写入订阅及 lease 结束。起点 WorkspaceService.dispose 没有循环 dispose BrowserEngine.pages，因此不能据静态源声称 Agent-off 必杀掉网页进程；准确缺口是可见独立入口、重新挂载和持续保存。 |
| Browser 停用 | `BrowserEngine.dispose:322–332` abort自己的Cookie请求，dispose pages，等待imports、prepared sessions并关闭Profile/历史store；它没有拥有全宿主 NativeHost 的 dispose 权。关闭单网页沿 WorkspaceService.close:1700–1714，保留进行中下载确认后只 dispose该page。 |
| 重启/叶子状态 | WorkbenchView `getState/setState/disposeSurface` 保存 ShellSurface 页面状态；WorkbenchPages 用 contribution.stateKeys清理后恢复。Agent页 getState仅 control/history/width，网页tab/组/比例从workbench-v2恢复，再由BrowserTabView按restoreId重建。仅把网页URL放进叶子state无法替代原布局，未贡献独立Browser路由也无法在Agent-off重启恢复可见网页。恢复网页不得调用创建/继续Agent。 |

Cookie 现状由 `browser/services/host.ts:56/210–213` 与 `shared/native/cookies.ts:3–37` 直接证明；不是只引用旧验收自报。F7 路径等待最后释放，读取失败+清理失败用 AggregateError 保留 errors 和 cause；成功读取但清理失败仍拒绝。Browser关闭只取消自己的能力请求/释放自己的资源，不能调用全局host.dispose、关闭其他owner租约，Agent关闭也不能释放Browser租约。

### 二、两条候选与推荐

| 候选 | 在现有owner内的改造 | 合同与成本 |
| --- | --- | --- |
| A：提取纯共享布局和renderer注入 | 从原WorkspaceLayout/TabStrip分出只接收只读布局快照、动作回调、header/content renderer的共享React承载；原Space/Session/Pane用例仍在原服务，Browser renderer移回browser/ui并经公开api/模块pages装配。轻量记录/布局owner的生命周期独立于Agent Controller。 | 原tabId/groupId、顺序/分组/比例、pin/color、关闭/重开、键盘和drag只有一个投影与一组动作。可同时满足同一标签体验及Agent-off，所需变更多于只搬一个组件，但没有第二管理器。推荐。 |
| B：Browser独立工作台页面复用承载 | 添加Browser-owned feature/pages入口，由原modulePage加载，沿现有WorkbenchView/Shell保存恢复；页面使用A的同一共享树及同一writer。Agent页面继续贡献终端/页面renderer。 | 独立入口/恢复是必要外壳；如果只做单网页resourcePages或把Agent布局过滤复制到BrowserStore，会失去混合分组/分屏或形成两份布局。B单独不足；应作为A的入口，而非另写一套Browser Workspace。 |

推荐 **A + B的薄入口**：共享的是原布局显示与动作，不是新增Session/运行管理。BrowserEngine仍是唯一BrowserPage/Profile/guest owner；终端仍由Agent原TerminalTabView/headless/尺寸与输入owner管理。Shell不识别Provider、不触碰Session启动、不导入任一模块内部；App只经公开api、类型合同、ModuleInstance.pages/贡献装配。`api.ts`只导出类型与键，不得为绕过Agent-off在Agent api里放一个导入controller的factory，也不能隐藏激活Agent以取得数据。

**持久化生命周期是必须先落的接缝。** 原SpaceService `load/mutate/flush`、writer lease和JsonStore队列同时拥有sharedLayout及Space记录，不能Browser再用一个JsonStore写同文件。应把这一原有轻量记录owner从Controller私有销毁链中提取/延长到工作台宿主生命周期，由Agent运行层与Browser共享承载经明确端口使用同一个实例/同一队列；运行、Hook、Provider、历史scanner不得随这个轻量数据接缝被创建。实现位置需遵守现有矩阵：宿主不能导入Agent内部，纯持久记录类型/校验若下沉应有唯一shared定义，App/模块以app contracts注入，Shell只持渲染合同；不是仅把SpaceService在模块内部改成永不dispose。

这是一项原owner的生命周期提取，不建议新`BrowserWorkspaceManager`、第二业务文件镜像、daemon或额外数据库。本准备不假称已有`SharedWorkspaceAccess`等export；接口命名及提取最小单元由Root在T09最终API上确定。若不允许补齐原owner相关路径，T13现有写集不足以完整交付Agent-off持久化，不能用只移动UI掩盖该缺口。

### 三、T09交界与兼容边界

1. T09原Space布局/Pane是权威。保留每个Space的tree、draft、revision、merge/flush/commit回执；网页shared kind只表达展示项，不能充当Space、持久Session或runtime。T09起点叶key是runtime/恢复key，不是新paneId；012早期“查询时补ID/只读map”等建议已被Root后续真实反例取代，不可直接实施。
2. 无Space使用原sharedLayout，网页不调用requireSpace，也不静默生成导入Space。已有Space内混合网页与终端的原tab/group引用保留；Agent-off只投影网页/明确不可用的Agent内容，不迁移Session归属、删除终端布局或复制网页到另一套树。是否显示原选中Space的网页或共享树，须由原布局scope引用解析，不能把二者同名合并。
3. GUI drag/resize/close、Browser open/reuse/list/activate、CLI Pane操作最终仍读回同一scope的同一draft/commit。共享树renderer用kind区分内容；网页不申请终端input arbiter、runtime size owner、PTY attach或headless设备回复权。终端独有的Pane关闭语义不被Browser disposePage替代。
4. Agent-on/off、terminal route与Browser route切换时，同pageId转交显示位置，而非创建两个guest或让两个React effect互相unmount。必须协调原placeholder的释放/新位置挂载，隐藏页保留但不抢显示；浏览器资源销毁与仅隐藏/切路由分开。
5. 保留BrowserTabView现有ownerDocument订阅、主workspace document MutationObserver、layout-change/window-close、RAF取消及HuhuProviders portal归属；popout关闭/DOM adoption时即使非活动tab也淘汰旧guest。BrowserChrome已有browser Scope和工作台Scope的优先级、输入法组合、隐藏/inert过滤必须保留，不靠window顶层捕获。
6. 保留BrowserWorkspaceTab的pin/color/自定义标题、profile切换确认、复制URL/Markdown、关闭其它/右侧跳过pinned、拖放group与分屏、duplicate/profile。原tab/group id及pageId是展示/页面身份，不按URL去重整个持久记录；reuse沿原url+profile约定且不跨scope偷拿别的对象。

**待T09最终API重核：** 原SpaceWorkspaceStore对current draft与非selected Space的只读投影/编辑/保存方法、shared scope的精确类型、Pane身份分配/关闭重开/失效及列表过滤、GUI/CLI flush回执、foreground呈现token与noSpace空态。030只基于指定起点，未验证028/029当前或最终实现，不阻止其writer。

### 四、单writer、旧布局与数据归属

| 数据 | 起点路径/owner | T13约束 |
| --- | --- | --- |
| 当前设备Space/Session/布局及无Space网页 | `agentWorkbenchPath(deviceId)`→`.huhu/terminal-agent/<device-id>/workbench-v2.json`；WorkbenchRecords version2的layouts[spaceId]与sharedLayout，唯一SpaceService队列，SpaceWorkspaceStore是dirty draft适配 | 共用原实例/队列与写lease，Agent-off时由提取后的原轻量owner继续订阅/保存，Agent运行层只释放自身消费。关闭所有显示也要保存真实错误/有效草稿，不能吞错报已持久化。 |
| 旧工作空间 | `createWorkspaceStore`保留`.huhu/terminal-agent/<device-id>/workspace.json`；当前Controller使用createSpaceWorkspaceStore而非它 | T13如需呈现旧网页，仅由一个有界兼容reader/投影读取原件，按版本/来源保留ID与原组引用；不恢复旧v1 writer、不读一次就回写。正式导入Space/迁移标记/备份/回滚和writer切换归T15。坏/未知版不当空对象覆盖。 |
| Browser自身数据 | `.huhu/browser/<device-id>/profiles.json`、`state.json`、profiles/<id>/session与downloads、tmp；原BrowserEngine/ProfileStore/BrowserStore | 继续原owner，state.json的浏览历史/站点权限不是共享workspace替身；不复制workbench tree进去。Cookie/缓存/下载不因布局提取而迁移或进入普通备份。 |
| 叶子state | Obsidian保存单一huhu-workbench-view；target/pages/stateKeys保留轻量视图状态 | 保存稳定scope/页面引用和必要有界UI偏好，不再存一份业务布局。恢复Browser feature仅加载Browser和轻量布局，不create/resume/prompt Agent。 |

设备是本机布局来源边界，不用当前设备覆盖其它设备的记录。T13不实现T15完整迁移、不进行真实Vault升级、不重新解释旧账号/原生会话归属。仅兼容读取也须按真实版本/上限校验，旧terminal条目不在网页恢复中变成新Session。

### 五、原URL、资料引用与素材消费者

最小必须回归的原链：`src/app/commands.ts:28` → app.openBrowser；Home `board-store.ts:467`/Card/RSS/P1 → home-host.openBrowser；automation action-host `openUrl:53–56` → BROWSER_OPEN.open；note-links observer和terminal web-link → BrowserEngine.routeLink → workspace.open。保留原huhu/system/copy菜单、搜索/URL归一化、reuse和profile，新标签的window-open同样沿BrowserWorkspacePort。Home当前是peek并保留window.open fallback，纯打开接口调整不能顺手更改它的启用策略；T14完整消费者收缩另做。

素材仍沿 `BrowserEngine.attach:278–287` 保存图像文件→browserAgentMaterial→Browser.module注入的AGENT_SESSIONS.attachMaterial。纯浏览或列可选目标只peek已存在Agent服务，不acquire Agent；Agent-off可以浏览、复制与取得资料，附加动作无可用目标时准确说明不可用。原AGENT_BROWSER_TABS.sessionOrder只是同组Session排序，迁到共享布局只读投影后仍按原目标身份排序，不能把tabId当SessionId。

`session-material.ts:27–78` 已有同目标pending gate、原session对象/agentId校验、10秒就绪期限、取消、只paste一次且不回车；新Browser renderer只调用公开AGENT_SESSIONS，不重复附加、不新建Session、不换目标、不改为prompt提交。图像/选区/URL及笔记资料引用维持原格式；`host/obsidian/references.ts`的笔记/文件选择路径不需要因共享网页提取而重写。

### 六、精确候选写集与唯一owner建议

以下是Root后续收敛范围的候选，不是030写权限；没有分派实现者。建议同一位受托源writer完成共享承载/原记录生命周期提取以避免同文件并写，Root独占main.js/styles.css与正式文档/状态整合。若拆UI子组，必须等其依赖API冻结并按整文件独占，不能按同文件不同方法分工。

| 路径 | 必要职责与原Ticket范围 |
| --- | --- |
| `src/app/contracts/workbench.ts`、`workbench-host.ts`；拟新增`workbench-shared-workspace.ts` | Browser feature/availability/有界恢复引用，以及不带实现的共享布局/renderer端口；在T13原workbench*.ts范围。新文件是候选位置，无既有export。 |
| `src/app/workbench/compose-workbench.ts` | 原modulePage加载Browser page、入口/导航/停用时的网页呈现转交；经公开api，沿单WorkbenchView。原范围。 |
| `src/shell/shared-workspace/SharedWorkspace.tsx`（拟新增） | 从原tree/tab/group组合提取纯呈现及动作委托，不拥有磁盘/store/Session；原shared-workspace/**范围。若拆header/keyboard文件，Root先给完整精确名单。 |
| `src/modules/browser/api.ts`、`module.ts`、`services/host.ts`；拟新增`ui/BrowserTabView.tsx`、`ui/BrowserWorkspaceTab.tsx`、`ui/workbench-page.tsx` | Browser贡献renderer/独立page及原BrowserWorkspacePort接线，移除生产打开对AGENT_BROWSER_TABS的acquire；Engine/profile/native能力复用。原范围。 |
| `src/modules/agent/ui/browser/BrowserTabView.tsx`、`BrowserWorkspaceTab.tsx`；`ui/workspace/WorkspaceLayout.tsx`、`workspace-context.tsx`、`ui/workbench-page.ts` | 替换为薄适配/贡献，保留原终端renderer与keyboard/retention。现有原范围；具体context文件以最终T09目录重核。 |
| `src/modules/agent/services/workspace-service.ts`、`workspace-store.ts`；`src/modules/agent/api.ts`、`module.ts` | 从同一owner委托browser动作/兼容AGENT_BROWSER_TABS，原dirty draft/merge保留；原范围。不能在兼容service里又维护一份tabs。 |
| **需Root先补** `src/modules/agent/services/controller.ts`、`services/spaces/space-service.ts`、`services/spaces/records.ts` | 原writer实例/队列/释放链在这些路径，不在T13旧writable_paths；只是UI移位不够。原owner提取须明确由谁创建/注入/最终dispose，同一records schema与队列。 |
| **需Root按选定提取补** `src/app/contracts/module.ts`、`src/app/main.ts`，以及下沉的纯记录合同/原队列实现路径 | 当前只有native为模块独立注入。若采用相同原则提供轻量布局端口，context与composition root要改；不得api暗藏factory、registry特判Agent关而偷偷创建controller。原队列若下沉至shared/host，先确定最小真实文件名/导入闭包再扩范围，030不预授权未知目录。 |
| **可能需补** `src/modules/agent/ui/AgentWorkspacePage.tsx`、`ui/tabs/TabStrip.tsx`、`ui/tabs/WorkspaceTab.tsx`、`core/workspace/model.ts`、`ops.ts`、`shortcuts.ts` | 原共享视觉、菜单/快捷键、tab类型耦合实际落在这些路径；T09最终接口可减少改动。不是机械全加，按最终diff所需精确补；不为共享renderer复制一套ops。 |
| `src/modules/browser/i18n.ts`、`docs/browser.md`、`docs/architecture.md`、`scripts/obsidian-acceptance/browser-cookie-import.mjs` | 原范围；更新独立页面/恢复与数据owner事实、双语文案及用户宿主脚本。架构永久ADR/context不在普通实现改写。 |
| **需补实际测试路径** Browser module/host/新page DOM、原BrowserTabView DOM、workspace-store-spaces、app贡献/registry、shell恢复测试 | 原Ticket只给browser/ui/**和host*.ts等部分范围，module.test.ts、原store tests及app回归不全；Root须绑定确切名单。测试必须经过真实装配，不能只测自己新接口的mock。 |
| `main.js`、`styles.css` | Root唯一生成物writer；源冻结后按testing选择表实际生成，030未构建。 |

没有建议改native/Rust/Cookie解密/Provider/终端parser。若新依赖或模块骨架成为必要，应先重新论证；当前证据没有这种需要。

### 七、已有测试与未来验证矩阵（全部未运行）

可复用的真实接缝包括Browser `module.test.ts`（真实BrowserEngine与TerminalSessions/NativeHost装配，替换framed I/O）、`services/host.test.ts`（inactive profile lazy切换）、原`agent/ui/browser/BrowserTabView.dom.test.tsx`（DOM adoption）、Browser `page-lifecycle.dom.test.tsx`（导航历史/崩溃/retry/guest初始化）与`retained-page.dom.test.tsx`（hide/move/resize/final release）、`browser-key-scope.test.ts`、BrowserChrome DOM、`shared/native/cookies.test.ts`（F7双失败/cause/release/abort）、`agent/services/session-material.test.ts`、`workspace-store-spaces.test.ts`（dirty draft/在途save/合并冲突）、app `agent-contribution.test.ts` 与Shell `workbench-pages/workbench-surface`测试。

现有Browser.module测试验证Cookie读在Agent终端cleanup期间存活，不等于ModuleRegistry的Agent-off后网页打开/恢复完整路径。原host.test只有一个inactive profile测试，不能据它证明T13生命周期。现`browser-cookie-import.mjs`启用agent=true，混合结果一支为canned；要增Agent-off/noSpace场景才具有对应意义。它调用真实Obsidian，按本轮用户分工交用户运行，030未执行。

| 验证面 | 后续可观察断言与层级 |
| --- | --- |
| 真module-off/noSpace打开 | 自动化经过真实ModuleRegistry、Browser module、共享owner与贡献/页面装配，将Agent flag设off而非仅mock browserHost。无Space能open/reuse/list/activate并保存；Agent factory/Controller/Provider/PTY/历史扫描/helper下载计数为0。Cookie明确使用时才有cookies能力。DOM可证接线，真实Obsidian仍由用户核验。 |
| Agent关闭网页存活 | 已有混合组打开网页，实际prepareModuleChanges+registry停Agent，网页仍可见/交互、pageId/URL/profile/group/pin/color不变，网页变化继续落原writer；Agent资源按原合同停止。再启Agent读同布局，不复制/丢组/自动spawn。共享pageId在两个路由之间不得双mount互相unmount。 |
| Cookie独立与退出 | 没有Agent/Space时仅获取cookies lease；关Agent不取消Browser读，关Browser只取消自己的请求/资源，其他PTY/history lease继续；最后owner释放才停helper。保留F7原read与cleanup双失败、cause、成功后cleanup失败和abort路径。隔离传输unit可验owner；真实Cookie/加密平台由用户测试账号核验。 |
| 原URL/资料/素材 | 命令、Home卡片/RSS、automation.openUrl、note/terminal链接及网页window-open仍走原公开开页。对精确既有Session附加一次只paste不回车；busy/timeout/取消/目标换代准确失败，Agent-off纯浏览不被附加目标缺失阻塞。材料服务真实fixture与原URL消费者回归，Provider真实结果交用户。 |
| 同布局双向读回 | GUI标签顺序/分组/split/比例/pin/color/关闭重开后，原布局服务/CLI适用查询读回同ID/树/比例；反向原动作修改订阅到GUI。覆盖dirty save、选Space变化、重排并发、冲突/磁盘失败、旧ID失效；网页不出现在终端input/size owner索引。依赖T09最终API，不能照旧runtime key写断言。 |
| 保存/重启/旧路径 | 关闭叶子/宿主再恢复Browser feature，引用、activeTab、tabId/pageId/group及profile/zoom保持；Agent启动/输入为0。旧v1 fixture仅兼容读取且原字节/mtime不变，未知版/损坏/外设备准确降级；新旧writer不同时写同一文件。不在本票跑正式T15迁移。 |
| 宽窄与键盘 | 受控Chrome用真实生产组件及端口fixture验1440/390、600/960附近、亮暗/长URL/空/加载/错误/Agent-off/noSpace、200%缩放与减少动效；tab切换/关闭/重开、Ctrl/Cmd+L/F/R、网页前后退、drag与resize及焦点返回可达。DOM证明逻辑，不证明几何/实际Obsidian Scope。 |
| 主窗/popout/portal | DOM adoption能先覆盖ownerDocument变更、失活tab迁移、迟到chrome Promise及清理监听。真实受控Chrome可验多Document/portal和focus，真实Obsidian popout/window-close/Scope、webview、OS IME、下载/剪贴板归用户，不将iframe mock称宿主通过。 |
| 架构与产物 | 实施后由Root串行运行适用定向Vitest（DOM用--project dom）、architecture、i18n/styles/workbench入口、build/lint及bundle检查，核惰性边界和源码/产物一致。只有新增改动或失败才扩大检查，不因本准备报告运行全仓测试。 |

### 八、有限复用研究与实际命令结果

沿用已保存的R-02/K-06：Wave固定`97e560027f494d20fed347b2d6b72b6bcb3e50e0`/v0.14.5，原reference-sources记录未归档、2026-04-16正式release/commit满足近两年窗口。已从024原临时根复制并核SHA：blockcontroller源码`c9cb274dba7c4757d959c393436a505b6c7f8a08381c7d6158c6f56643176ebf`、Apache-2.0 LICENSE `2961c11688c782253260f3094ef85163871b9bcef1cfc21f8e0650170c736828`、go.mod `bd8a310fa177a32408e98b52bcfb265d2ff9a8d55f1e57a967d55696834610c7`，连同外部原manifest及012原官方网页raw保存R/CAS。

[Wave block controller](https://github.com/wavetermdev/waveterm/blob/97e560027f494d20fed347b2d6b72b6bcb3e50e0/pkg/blockcontroller/blockcontroller.go)的controller registry、版本化RuntimeStatus与显式start/stop支持“持久布局与运行/显示分离”的思路；其自动start逻辑不能搬成HUHU网页恢复附带Agent启动。[固定许可](https://github.com/wavetermdev/waveterm/blob/97e560027f494d20fed347b2d6b72b6bcb3e50e0/LICENSE)与[依赖](https://github.com/wavetermdev/waveterm/blob/97e560027f494d20fed347b2d6b72b6bcb3e50e0/go.mod)已回读，保留HUHU React/Zustand/Rust/Obsidian，不引入Go、Jotai或业务SQLite。K-06的[发布记录](https://github.com/wavetermdev/waveterm/releases/tag/v0.14.5)关于网页鼠标前后退、复制尾空白、缺失设置文件的修复只作为回归线索，不是HUHU已复现缺陷或最新版仍有问题的证据。已有012/013/024及本仓库接缝足够选择路线，本030未新增外部网络请求、依赖或源码复制，未读取/移植GPL终端。

实际仅执行静态读取/查询、原字节复制与hash/模式检查、报告落盘及随后return结构校验。四次静态探查exit1保留在R/commands：027猜测不存在的spaces/store.ts导致该批次中止，028在失败批次尚未登记输入时查询触发KeyError，051一次regex转义错误，068把workbench-surface.tsx误写成.ts；随后按manifest真实路径/字面匹配纠正，原stderr未删。这些不是测试失败，也未转成产品红灯。所有其他捕获命令的实际退出码可回读，不宣称读取命令exit0等于行为验收。

报告后实际运行只读`validate-dispatch.mjs --stage return --repo /home/wta/orca/workspaces/obsidian-huhu/terminal --scope-root .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor --session 20261026T045732Z --task 030-t13-browser-preparation`；结果保存R/delivery/return.stdout.raw、stderr.raw及receipt.json，以其真实输出为准。该命令只检查TASK/REPORT身份与结构，不检查产品行为或T13完成。

## 问题与下一步

无新的用户产品决定。Root已收到原writer生命周期/旧写集不足的发现，并要求本准备收尾；应先等T09最终接缝冻结，精确补齐原owner与context/测试写集，按实际API形成T13实施Packet，再执行单writer实现、适用检查和独立审查。当前不派生实施、不提前变更T14全部消费者、不做T15正式迁移，不改变T13/Goal状态。真实Obsidian/Provider、OS IME和五平台均未运行，按用户分工保留待用户验收。

READ-ONLY SOURCE STOPPED（仅030研究已收束，无产品writer、进程、监听或服务需要清理；不表示T09 A/B停写）。
