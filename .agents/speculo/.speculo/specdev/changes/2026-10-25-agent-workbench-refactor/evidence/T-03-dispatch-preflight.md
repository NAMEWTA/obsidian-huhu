# T-03 同票 A/B 最小派单建议（只读，未解锁）

本报告供 Root 形成具体 Dispatch Packet。它不修改 Ticket 状态，不把 T-03 标成 ready/done，也不是新代码或测试证据。T-02 A 仍在最终检查；必须由 Root 确认其 writer 停止、前序验收完成后才允许 T-03 写入。

工作区：`/home/wta/orca/workspaces/obsidian-huhu/terminal`。本次只读取源码/Ticket/原预检，唯一写入 `/tmp/huhu-t03-dispatch-ready.md`；未构建、未测试、未启动实例、未改 Git/正式材料/产物、未派子 Agent。原预检 `/tmp/huhu-t03-preflight.md` 的 SHA256 仍为 `41ba3c3dcfd62e946002ef232964018af8a9eb93bd58c1373dfe69cd209e2bac`；本文以现在的实际接线更新其中早期草稿判断。

## 1. 可以直接采用的编排决定

**两位实现者可以同票并行，但先让 A 单点落地纯 DTO、公开方法签名和 en/zh key 清单，冻结后才解锁 B。** A 独占运行/服务/共享接线/词典，B 独占当前 create/sidebar/TerminalTabView UI。Root 独占正式 Evidence/计划/构建产物与最后集成。T-02 writer 与 T-03 任一 writer 不并行。

最小方案不需要修改 NativeHost、native Rust、SpaceService/records、模块 API/serviceKey、module.ts 或新的设置 schema。复用 T-02 的持久 Session 与 admission、T-01 的原生 owner，以及现有 TerminalSession/headless。只增加一个模块内 managed 运行接缝，不能另建业务 Session store/writer 或把 Pane 作为运行 owner。

## 2. 当前 T-02 已交付到源码的必需接缝

以下均已实际读取；是否正式通过仍由 T-02 Evidence/Root 决定。

- `SpaceService.prepareSession(spaceId, input, existingSessionId?)` 返回 `SessionAdmission { record, cwd, beforeSpawn }`，持久 Session 经过 JsonStore verified commit 后才返回。SessionRecord有稳定id、spaceId、kind/title、agent/account/shell与可选native来源引用；不持久化runtime/PID/screen。
- `beforeSpawn()` 在最后边界重新检查 writer、物理目录/授权、当前Space/Grant及持久Session仍存在；controller已把此callback传到Shell/Agent/restore。`TerminalSessions.create()`在helper/environment/Hook准备后、`helper.spawnSession`前实际await它，且随后再次检查abort/disposed。
- `WorkspaceService.newAgent()`已经用 `admission.record.accountId` 传给launcher，避免账号等待期间从当前设置重算归属。`launchAgent`仍经过confirmLaunchPermissions → resolveCli → accountEnv → accountArgs/launchArgs，原六Provider链保持。
- `ResumeInfo`的真实字段是 `spaceId?` / `persistentSessionId?`。不是原预检早期预测的stableSpaceId/stableSessionId。
- 新布局经 `createSpaceWorkspaceStore()` 写到SpaceService的v2 layouts/sharedLayout；旧v1 createWorkspaceStore留作legacy，不承接新Space。切Space先flush再select，adopt只在selectedSpace变化时重载显示；T-03不得用旧源码覆盖这条接线。
- GUI `Omnibox`在执行瞬间从已选Space取得稳定ID并显式传给newTerminal/newAgent；SpaceEmptyState也显式传selected.id。service当前不再用selectedSpace兜底：newTerminal/newAgent只捕获options.spaceId，缺失时通过requireSpace(interactive:true)让人明确选择。T-03的后台公共用例必须另有strict入口，不能直接把这个交互wrapper当后台服务。

**结论：前序没有阻止 T-03 最小实现的必需 API 洞。** 可以从SpaceService公开只读store取得SessionRecord并调用prepareSession；不必为了getter而扩写其目录。未来T-07需要scope/instance快照属于后续接口，不应本票额外改T-02。若实际实现想持久化新的Session字段或改记录模式，再由Root评估精确扩写；最小方案无此必要。

## 3. 现在仍存在、由 T-03 必须修的五个接线点

| 当前事实 | 必须发生的改变 |
|---|---|
| WorkspaceService.identities只在 `await launch.shell/agent` 返回后bindIdentity | 已提交的Session进入启动阶段时，同一同步段分配runtimeId、登记launch-pending与stableSession/Space映射，再允许Provider/权限/helper/environment/Hook的任何await。保存失败前不创建运行；“早于await”指早于外部启动准备等待，不绕过必要的持久提交 |
| TerminalSessions.create先await helper/environment才构造TerminalSession | managed registry先保留runtimeId和pending记录，底层create接受保留的id/绑定或受控prepare回调；即使helper或账号准备失败，Session/runtime尝试仍可准确查询。不要等TerminalSession对象建成后才有全部身份 |
| WorkspaceService.close/closePane最终sessions.remove；remove会end并dispose headless | 关闭Tab/Pane仅删显示引用/renderer；原runtime/PID/headless持续存在、继续receive/ack。明确stop/module dispose才走运行收束。关闭期间晚到启动不能被当“关闭显示”杀掉或晚到抢焦点 |
| restore/open仍可调用launcher/resume创建新进程；去重只按当前Tab | 先按稳定Session→当前runtime查询；活动/launch-pending只附加或返回pending。重复/并发打开不spawn；显式restart不能在旧代次仍活动时暗建第二进程。没有活动runtime时显示未运行/需明确继续，普通打开不自动resume |
| attach总activate/focus；controller.start总place/open；Sidebar/status只遍历tabs | strict后台create跳过attach/selectSpace/open/focus，立即可查且无Pane；Sidebar与controller.status改消费Session+runtime投影。背景状态事件只刷新投影，不改焦点。当前GUI/前台显现动作继续明确执行 |

不要通过建一个“隐藏Tab”伪装无Pane后台。也不要通过拆卸React时保存屏幕字符串、重新创建TerminalSession来冒充同一runtime：renderer可重建，headless权威对象必须保留。

## 4. A 的最小写集：运行与服务唯一 writer

以下全部已在当前 T-03 writable_paths 内（新增文件位于已授权glob）；Root可按此分配，不把整个模块泛放给A：

| 路径 | A 的职责 |
|---|---|
| `src/modules/agent/core/workspace/managed-runtime.ts`（拟新增） | 唯一纯DTO/请求/结果/错误键类型；先落后冻，B只读消费 |
| `src/modules/agent/services/terminal/managed-runtimes.ts`（拟新增） | 最小Session→当前runtime/pending映射与只读投影；只引用现有TerminalSession，不复制PTY/存储owner。若A能在既有TerminalSessions干净完成，可不新增此文件，但不可同时维护两套current映射 |
| `src/modules/agent/services/terminal/sessions.ts` | 保留T-01租约与代次，接受保留runtime身份/启动接缝，helper准备失败也准确通知managed owner；持续原bySid事件路由 |
| `src/modules/agent/services/terminal/session.ts` | 仅在实际需要补只读稳定绑定/运行状态通知时修改；保持headless/snapshot/input/键盘语义 |
| `src/modules/agent/services/workspace-service.ts` | 注入managed接缝，strict create/get/list/attach；close-view与stop分离；新/旧GUIwrapper、split/restore/reopen适配；跨Space显示写原layout、不改归属 |
| `src/modules/agent/services/controller.ts` | managed装配、后台不open、不focus；status由registry投影；直达start与show路径不能绕过新身份；保持T-02清理聚合与懒加载 |
| `src/modules/agent/services/launch/launcher.ts` | 保持六Provider argv/account/permission链；如需typed started/cancelled/unavailable结果与后台首确认拒绝，在此做窄改，不重写Provider实现 |
| `src/modules/agent/services/workspace-service.test.ts` | 旧close/restore测试有意转成新合同，同时保留module dispose晚到spawn清理风险 |
| `src/modules/agent/services/terminal/managed-runtimes.test.ts`（拟新增） | 早期pending身份、同Session去重、失败可查、后台查询/原屏保留、旧事件隔离 |
| `src/modules/agent/services/terminal/sessions*.test.ts`、`session.test.ts` | 仅改目标行为相关测试；T-01取消/owner回归继续保留，不删风险 |
| `src/modules/agent/services/launch/launcher.test.ts`（拟新增） | catalog六入口参数矩阵、账号冻结、Manual/YOLO、缺程序/取消及字面中文路径 |
| `src/modules/agent/services/controller-managed-runtimes.test.ts`（拟新增，当前不存在） | 实际controller注入链、background不调用shell.open/focus，直达start/cleanup接线 |
| `src/modules/agent/core/workspace/*.test.ts` | 只有实际改变layout metadata/normalizer才写；其他已有行为只回归 |
| `src/modules/agent/i18n.ts` | A独占en/zh，先给B冻结key清单，B不同时改 |
| `docs/agent-workbench.md` | 与最终前台/后台、关闭显示/停止说明一致；真实E2E留用户 |

A不写UI TSX、不生成main.js/styles.css、不改正式票据/Evidence。native session.rs虽在原票范围，当前没有T-03最小修改理由；如果没有实际native变化保持不动。

## 5. B 的最小写集：显示消费者唯一 writer

| 路径 | B 的职责 |
|---|---|
| `src/modules/agent/ui/create/Omnibox.tsx` | 沿现有六入口/账号设置，增加可选名称和明确后台创建；提交前捕获显式spaceId，消费A冻结方法，后台成功不导航到新运行 |
| `src/modules/agent/ui/create/Omnibox.dom.test.tsx` | 新建名称/前后台选项、明确Space、取消/失败不错误关闭、IME/键盘与原分组回归 |
| `src/modules/agent/ui/create/NewTabMenu.tsx` | 如需，调整菜单关闭后的焦点恢复，只返回原仍有效前台终端；不将后台新runtime作为focus目标 |
| `src/modules/agent/ui/sidebar/AgentSidebar.tsx` | 管理会话按稳定Session与A的runtime投影显示，包括无Pane后台、detached、pending/failed/恢复记录；打开调用attachManaged，不调用launcher。Browser/page原导航继续沿当前模型 |
| `src/modules/agent/ui/sidebar/AgentSidebar.dom.test.tsx` | pending前可查、后台行键盘打开、同Session不重复、不同Space归属、无强制焦点与状态文字、长名称可访问 |
| `src/modules/agent/ui/terminal/TerminalTabView.tsx` | 关闭只是close-view；pending/failed/disconnected/未运行状态如实呈现，普通打开不自动spawn；保留renderer所属窗口与卸载边界 |
| `src/modules/agent/ui/terminal/TerminalTabView.dom.test.tsx` | 关闭/卸载不end、不dispose runtime，重挂同TerminalSession；旧多窗口renderer回归保持 |

B不写controller/services/core/i18n，不调用store.setState、SpaceService.persist或native，不创建第二套Session store。原有ui/create/**允许SpaceEmptyState最小调用调整，但已有“空Space新Shell”可继续走前台wrapper，**最小方案不需要改它**。

T-02新加 `SpaceNavigation.tsx` 保持不动，AgentSidebar可在其下用当前selectedSpace的managed rows；本票不重排为完整T-09新版树。`ui/workspace/WorkspaceLayout.tsx`也无需默认写入，现有renderer已支持卸载/隐藏。若A最终接口迫使这些变动，Root先扩精确路径，不让B临时越界。

## 6. 解锁 B 前必须冻结的最小 DTO / 方法

下列是可直接由A转成声明的窄建议，实际名字由Root/A一次决定；此报告不是已存在API。

### 纯 DTO：`core/workspace/managed-runtime.ts`

- `ManagedSessionSummary`：稳定 `sessionId`（明确等于SessionRecord.id）、`spaceId`、`kind`、`title`、可选agentId/accountId；可选 `runtimeId`、`pid`；connection/phase、`inputReady`、有界errorCode/显示key；显示事实 `viewState`。
- `viewState`最少区分 `background | attached | detached | restored`：后台创建从未有Pane、已有显示、最后显示已关闭、宿主恢复记录而无活动runtime。它与运行connection分开，不能把detached当exited，也不能把恢复记录当活动运行。
- connection/phase需包括 `launch-pending`、真实connected、failed/disconnected/exited、无活动runtime。若UI文案叫“就绪”，必须冻结它仅表示哪一阶段；不能以spawn成功宣称Agent可安全prompt。`inputReady`单独暴露现有真实检查，不替代后票blocked识别。
- 不把TerminalSession、env、文件系统port、Zustand mutation或shell argv放进B的DTO；原账号配置引用可显示，凭据不进入投影。

### A 提供给 B 的方法/状态

推荐落在现有 `WorkspaceService` 上，UI不需另一服务定位器：

```ts
// strict：已明确有效Space，后台/程序入口不弹选择，不读取当前焦点兜底。
createManaged(request: {
  spaceId: string;
  kind: 'shell' | 'agent';
  agentId?: AgentId;        // agent分支实际应由discriminated union要求
  accountId?: string;      // 未给时在接纳前冻结当前配置引用
  shell?: ShellChoice;
  title?: string;
  foreground?: boolean;    // strict公共用例默认false；GUI显式true
}): Promise<ManagedSessionSummary | undefined>;

getManaged(sessionId: string): ManagedSessionSummary | undefined;
listManaged(spaceId: string): readonly ManagedSessionSummary[];
attachManaged(sessionId: string, options?: {
  expectedRuntimeId?: string;
  focus?: boolean;
}): Promise<string | undefined>; // 返回Pane/Tab显示引用，不返回新runtime
```

UI需要一份service拥有的可订阅只读managed snapshot（例如同模块 `managedStore`，仅getState/subscribe供useStore读取）；或 `subscribeManaged/getManagedSnapshot`，但snapshot必须缓存并在变化时替换，不能每次get都新建数组导致useSyncExternalStore循环。B不得自己把SpaceStore+sessions map+layout拼成另一份权威current registry。

旧 `newTerminal/newAgent` 可保留原返回runtime ID的兼容形态，作为交互wrapper先requireSpace(interactive:true)再委托strict create；B同一票内如新增foreground/title选项由A先声明。后台程序调用只能走strict显式Space入口。`close/closePane`可保留原签名以减调用方波及，但terminal分支不再用结束文案确认，也不remove/end；Browser下载确认不受这个语义变更影响。

### 冻结后不可留给 B 猜的具体边界

1. `sessionId`稳定业务ID、`runtimeId`一次启动ID、layout现有sessionIds目前仍是runtime引用；ResumeInfo用spaceId/persistentSessionId，UI不得交换三者。
2. pending记录在commit成功后、任何launcher/helper准备await前同步登记并发布；helper没起来也可query pending/failed。底层TerminalSession构造稍后完成不影响早期身份。
3. 同Session的并发attach/start共享一个pending/current实例或返回明确冲突，不只用最后map覆盖；不同Session即使同cwd仍各自独立。
4. attach只附加活动/可查看的已有runtime，pending可返回pending不产生第二启动；无活动runtime时保持恢复记录并给明确继续入口，普通open不自动resume。显式restart仍需旧代次安全收束，不能冒用attach绕过。
5. 后台绝不调用selectSpace/attach/open/focus；前台启动等待期间用户切Space/关闭意图改变时，晚到结果只留原Space显示或后台，不夺回焦点。显式用户“定位/打开”可切到原Space，归属不迁移。
6. 关闭最后Pane只令viewState从attached→detached，继续后台解析/ack；后台创建为background。重附加runtimeId/PID与headless对象不变；关闭Tab/切Space不触发Session删除。
7. 原运行的Hook/output/exit闭包只写原runtime；新一代不复用runtimeId。T-01原helper.alive检查及租约清理保留。
8. Six-provider准备失败/禁用/缺程序/权限取消区分；失败Session保留且不说connected，不因响应丢失自动重启。GUI用户取消选择零启动，后台缺/失效Space配置失败。

## 7. A 独占词典，先冻结这些键/语义

可选prefix为 `agent.managed.*`；若复用现有键有同义文案可保留，不能复用旧“结束进程”表达close-view。建议A在解锁B前提供以下en/zh清单：

| key后缀 | en | zh |
|---|---|---|
| name | Name (optional) | 名称（可选） |
| backgroundChoice | Start in background | 在后台启动 |
| starting | Starting… | 启动中… |
| connected | Connected | 已连接 |
| failed | Start failed | 启动失败 |
| disconnected | Disconnected | 已断开 |
| exited | Exited | 已退出 |
| background | Background | 后台 |
| detached | View closed | 视图已关闭 |
| restored | Restored record · not running | 已恢复记录 · 未运行 |
| open | Open terminal | 打开终端 |
| closeView | Close view | 关闭视图 |
| closeViewHint | The process keeps running. Reopen it from the session list. | 进程会继续运行，可从会话列表重新打开。 |
| notRunning | No active terminal. Start or continue explicitly. | 当前没有活动终端，请明确启动或继续。 |
| permissionRequired | Confirm permissions before starting this agent. | 启动此智能体前需要确认权限。 |
| programMissing | The configured program is unavailable. | 配置的程序不可用。 |
| unavailable | This terminal capability is unavailable. | 当前终端能力不可用。 |

“进程会继续运行”的hint仅在关闭活动runtime时显示，已退出/失败记录使用真实phase文案；后台标签本身不宣称运行成功。A冻结错误code→显示key映射，B不原样吐env/完整错误对象。现有 `agent.workspace.closeConfirm` 明确写着process will stop，terminal close-view不能继续调用；`agent.endConfirm`仍用于真实明确结束，不把stop换成detach。

## 8. 六 Provider 原链不动的最低验收面

A不得为了统一managed入口重写Provider行为。复用catalog六项（Claude Code、Codex、Grok、OpenCode、Gemini、Pi）、resolveCli、launchArgs、accountEnv、accountArgs与原Hook。保留系统空accountId与命名托管账号的不同HOME/凭据继承规则；entry.env→accountEnv原覆盖顺序；Manual/YOLO的实际argv判断和首次确认。

特别保留Codex托管file credential/sqlite/log参数及`--`边界；Grok prompt separator、OpenCode/Gemini原prompt flag只属于原输入路径，交互创建不添加伪prompt；Pi原生继续仍依transcript locator。T-03当前launcher已接收显式cwd/accountId，runtimeidentity改造应包住其现有产出，而非为每Provider新拼命令。

账号/CLI/权限设置在接纳时冻结到请求/记录；等待中更改GUI设置不会让同Session忽然启动另一账号。Space最终beforeSpawn必须仍在native spawn紧邻位置，不因新增managed callback退回到权限等待前。启动env身份字段由A集中注入；`HUHU_SESSION_ID`当前是runtime ID，不能无声改成持久Session语义影响旧Hook。

## 9. 最小验证分工（后续执行，本报告未运行）

A的服务/集成测试至少应给出：保存失败无spawn；pending在deferred launcher/helper/Hook期间按稳定ID可查；并发同Session只spawn一次；后台B无Pane且A的selectedSpace/activeGroup/Tab/focused runtime不变；关Tab/Pane后原对象继续收输出，重附加ID/PID/headless及spawn count不变；旧代次事件隔离；真实controller后台不调用shell.open；T-02目录/owner失效在beforeSpawn准确拒绝；六Provider argv/account fixture保持。

B的DOM测试至少应给出：名称/后台选择、明确Space与取消/错误；后台行启动中即显示；关闭视图后的提示与键盘重新打开；不产生第二Pane/runtime；后台状态刷新不移动activeElement；renderer卸载只dispose renderer，重挂拿同runtime；长名称、状态文字、en/zh键和所属窗口焦点保留。

旧 `workspace-service.test.ts` 中“close确认后remove所有进程”和“restore时关闭Tab杀晚到进程”代表已变更语义，需改成detach/不晚到聚焦断言。**module dispose晚到spawn必须收束**的风险测试仍保留，不能随旧close测试一起删除。

Root最后以实际SpaceService+WorkspaceService/managed registry+TerminalSessions生产对象跑一条关闭/后台/重附加集成，再串行build/lint/适用架构词典样式及产物核对。真实Obsidian/Provider/IME/五平台E2E按Spec§11交用户，不能用DOM或skip的helper用例冒称通过。

## 10. 精确额外路径结论

当前T-03 Ticket已包含原预检指出的四项扩展：AgentSidebar.tsx、AgentSidebar.dom.test.tsx、TerminalTabView.dom.test.tsx、controller-managed-runtimes.test.ts。上述A/B最小分工都已被当前glob/精确条目覆盖，**没有新的必需额外路径**。

默认不扩写：SpaceService/records、SpaceNavigation、WorkspaceLayout、workspace-store、module/api、host/shared/native、native Rust、平台账号与resolver。新增 DTO/managed runtime/helper测试位于现有core/workspace或services/terminal、launch glob内。

仅在实际方案需要时再由Root扩精确文件：

- `services/spaces/space-service.ts`及邻近测试：新增持久Session更新/重命名等当前接口外动作时；单纯create/query/attach无此必要。
- `ui/sidebar/SpaceNavigation.tsx`及新增DOM测试：如果本票决定把Session行直接嵌入其内部树，而非AgentSidebar当前Space列表；不是最小实施前置。
- `ui/workspace/WorkspaceLayout.tsx`及DOM测试：只有实际mount/空态合同需要改，不为后台概念泛放。
- `services/workspace-store.ts`及测试：只有实际改布局adopt/写入策略。运行registry应独立于布局，不靠改writer来保活。
- `services/workbench.ts`及测试：如把既有WorkbenchTarget.resourceId从runtime改为稳定Session，必须同步标题/定位；最小方案保留resourceId旧语义，另提供managed API。
- `module.ts/api.ts/module.test.ts`：本票若真的新增跨模块服务才写；T-07同模块可调production用例，不必提前注册serviceKey。

所有额外路径都是工程选择，先由Root修原owner再授权。它们不是需要用户再次回答的产品决定。

## 11. 读取范围与源摘要

核心读取范围：SpaceService/records/TerminalSessions/WorkspaceService/launcher/workspace-store全文；controller装配、start/show/newShell/newAgent/restore/status/dispose段；TerminalSession权威screen与subscribe/dispose段；AgentSidebar投影/动作、Omnibox提交段、TerminalTabView既有renderer生命周期、SpaceNavigation/SpaceEmptyState现有调用、相关测试定位、T-03 Ticket及原预检。大文件的SHA256覆盖完整文件字节，但不把“计算完整hash”冒充全文审查。

本次前后重复取样的核心七文件（SpaceService、records、WorkspaceService、controller、TerminalSessions、launcher、workspace-store）摘要一致。T-03 Ticket在报告期间由初读摘要48fd000e…变为表中dbdf0c05…；已重新回读当前frontmatter/相关正文，写集与目标行为仍与本建议一致，不把Ticket称为前后一致。T-02仍未宣告最终停写；正式Packet仍须Root在writer停止后重新核对这些hash与最终Evidence，不能以本表冻结别人正在写的源。

| 实际文件 | SHA256 |
|---|---|
| `src/modules/agent/services/spaces/space-service.ts` | `8712c1981016dff663fb688cf69de038d053b11e1dbd6427f3cf064abdde2de7` |
| `src/modules/agent/services/spaces/records.ts` | `1f6ac211a8ba2933532acb1fe70e124297e2f975952bc6c12f75a46fd1c795b3` |
| `src/modules/agent/services/workspace-service.ts` | `3a62ab673d88bc04e5ff7c5019aeae1cb2d0d256fbc4211e3e926a906f2e163f` |
| `src/modules/agent/services/workspace-store.ts` | `cd0eba9b220e237ea69f464eb80eefee729ce7e2440f41947674516dd59bc11a` |
| `src/modules/agent/services/terminal/sessions.ts` | `94069dfd409b84eb96314d0fa827e9fcf01e3a6a0e9ea2c913c4cc0f1f61d323` |
| `src/modules/agent/services/terminal/session.ts` | `483203afdcb172c92e934bd2db6c95ef180fdc703f1e53eea4a9f9da2277072b` |
| `src/modules/agent/services/controller.ts` | `4aaeae21fe5c032d4df4944fd7c6e3502d09a01fda0be453374a83d7c9c48336` |
| `src/modules/agent/services/launch/launcher.ts` | `70ec678f407c442f7bdfd1f7f586b5c2541e8f40c0c7dc9c65c5de11f1b38dc3` |
| `src/modules/agent/core/workspace/model.ts` | `a01440053e123ef09a85beb767732e5f3822b0084e25d0b1dfbd7a087757618a` |
| `src/modules/agent/ui/sidebar/AgentSidebar.tsx` | `29e6842a70efca313e8e5ca5f19682f464c20b062bb88e43700d964ee33b5a3a` |
| `src/modules/agent/ui/sidebar/SpaceNavigation.tsx` | `9cfb58d9798b82c59b29bfedabdfb1fa816d64eb9ad9ee9fe5afd9071ef4ddaa` |
| `src/modules/agent/ui/create/Omnibox.tsx` | `9a070017f6272694033f120c0750cdb2b844205cd2fccd9ca7aa5483f5be99b2` |
| `src/modules/agent/ui/create/SpaceEmptyState.tsx` | `9734d3964a4f718301cf9d9cefb35d18ed30c51444c10a96bc0a4ee134fac388` |
| `src/modules/agent/ui/terminal/TerminalTabView.tsx` | `5a6e005dd77ff978f0daf1ba49742d10ab0ace4e4e31a85b18d2ffa4434ed53f` |
| `src/modules/agent/ui/terminal/terminal-view.ts` | `1624981d8036026b02350507f376279a1af225f35c769494f7a78a2b66357356` |
| `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/03-managed-runtimes.md` | `dbdf0c05167acb300d004dd09df771184a46c2b735eda9b89fb32a8ee90e1ca1` |
| `/tmp/huhu-t03-preflight.md` | `41ba3c3dcfd62e946002ef232964018af8a9eb93bd58c1373dfe69cd209e2bac` |
