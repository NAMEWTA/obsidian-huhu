# T06 UI：captured N → markManagedSeen 呈现接缝

只读收口，UTC 2026-10-25T17:44:32.207246+00:00，`/root/prepare_t05_screen`。v2 候选 SHA `92da6dc480c537f4a7bda7132efdf1d9e60b1c4b5ec57e1300c60a95b3379b92`，正式副本字节一致。复用前份 after-T05 UI 研究和已批准 PAGE003 原生人工处理子范围。以下是待 Root 统一冻结的最小 UI 工程建议，不是现有 API/实现/验收。没有改仓库、运行测试/build/Chrome/helper，T05/T06 源保持停止。

**结论：沿已有 TerminalHost → TerminalView 接一个“提交后捕获 N，真正 render 后回报 N”的双向本地桥即可；不必改屏幕 DTO、TerminalPresentation 协议、renderer 算法或几何 owner。**Workspace 的 seen 是可信内部 B 调用：A 验证身份/布局/可见登记与水位，B 负责实际 paint/doc/leaf 判断；A 不能仅凭 tabId 或 attach.focused 证明 paint。A 已通过只读消息确认此责任划分，planned T07 CLI 不自动公开 markSeen。

## 1. 实际已有接缝与差距

- `terminal-presentation.ts:120–143` 的 acknowledge 在完整 snapshot/patch 安装成功后报 `status('ready')`，之后才微任务 applied。**ready/applied 都不表示 renderer 已画出。**不拿它们直接 markSeen。
- `terminal-view.ts:207–230` 可在现有 port 包装处记录本视图当前安装成功/错误、重订阅代次；`XtermScreenTarget.watermark` 已有公开 getter（第183行），可读已安装 ScreenMark。xterm 公开 `onRender` 才是 renderer 输出完成的适当回调；离屏/2026 暂停时不以一次 RAF 或 requestAnimationFrame 排队成功替代它。
- `TerminalTabView.tsx:97–132` 已按 Session/doc 创建并销毁 TerminalView，已有跨 document remount；其 `PaneTree` 第539行附近给出 exact tab/pane 的 active/focused，`WorkspaceLayout` 将页面 useVisible 与各组 activeTab 合成为 active。UI 当前没有 captured activity N 或 presented 回调。
- `WorkspaceUI` 已带 `chrome.context`，可取得真实 `NativeSurfaceContext.leaf/contentEl/app`；OwnerDocumentContext、useVisible 都现成。无需改 AgentWorkspacePage/context/shell 公共合同。当前未提供候选 `markManagedSeen`，须等 A 实际字段/签名冻结。

## 2. 最小 public UI 桥（名字仍是建议）

仅在 `terminal-view.ts` 的 UI 接口内增加：

```ts
// ActivityMark、ScreenMark 复用各自已有/候选类型，不合并水位。
TerminalView.presentActivity(mark: ActivityMark | undefined): void;
TerminalViewHost.presented?(view: TerminalView,
  receipt: Readonly<{ at: ActivityMark; installed: ScreenMark }>): void;
```

`at` 是本次 UI commit 复制的活动水位；`installed` 是 arm 此次刷新前已成功安装的只读屏幕水位，只作同 runtime/ready 基线。公开 onRender 不携 content watermark，绘制时屏幕可已到更高版本；不宣称它精确确认某 contentSequence，更不把该序号换算成 activitySequence。无需公开“ready=true”可变 getter，也不新增屏幕帧字段。

建议顺序：

1. TerminalHost 的本次 React render 使用一个不可变 managed.activityDetail；在该次 `useLayoutEffect` 复制 `{runtimeId,activitySequence:N}`。只有确有 unreadCompletion（或未读原 hint），且实际显示的 completion/状态属于此快照才 arm；没有未读完成则不因普通活动/重绘发 seen。Sidebar 点击只捕获导航 triple；点击时的旧 N 不应在 attach 后被偷偷当成 pane 已展示的 N。
2. 将复制的 N 交给 View。View 需已有完整初始安装、当前 generation 有效且实际可见，才为该 N 请求一次公开 `term.refresh`。它不解析 raw、不请求 resize、不调用 setFocused，不改变几何 owner。尚未 ready 则只保留一份待呈现标记。
3. 对应公开 `onRender` 到达且覆盖请求的整 viewport 后，View 按捕获对象回调 `{at:N,installed}`；Host 立即重新检查下节的当前性，再调用 v2 `markManagedSeen({target,at:N,view:{tabId,paneSessionId}})`。不等于 attach resolved、不等于 DOM focus、不等于用户已理解内容。
4. hide/error/resync/dispose/doc 更换会撤销该呈现代次；初始 snapshot 安装不完整、gap recovery 或旧 onRender 均不提交。重显后重新安装/捕获/绘制，不沿用旧 ready。

内部最多一个不可变 in-flight render 标记 + 一份最新 pending 标记；**不能在旧 render 回调里从最新 props/服务重读 N+1。**如果 N 已等待 render 而 N+1 已 commit，旧回调只报 N，再按有界 pending 为 N+1 请求后续 render。每帧/每条 patch 不堆 Promise、markSeen 或 ActivityJoin。

`presented` 回调自身不 await 磁盘。Host 最多一个在途 seen 观察及一份合并后的待提交 mark；同 N 的重绘/seen-only revision 不反复上报。A 管实际 writer/waiter 上限与 persisted 结果。hide/dispose 的 AbortSignal 只撤 UI waiter，不声称取消已经开始的写或回滚内存 seen；失败显示准确 persisted=false，不循环重试。

## 3. 真实 visible / doc / leaf / pane 闸

这些检查只决定“本 HUHU UI 呈现是否成立”，**永远不写 foreground=observed，不给 Provider/CLI 输入授权**：

| owner | 每次 arm/回调/异步回执前需复核 |
|---|---|
| View | 未 disposed；本轮 presentation 安装完整且 watermark.runtimeId 等于 at.runtimeId/Session.id；setVisible(true)；元素连接、非 hidden/inert、有效矩形；所属 document 中真实 IntersectionObserver 相交。公开 onRender 实际发生。 |
| TerminalHost | useVisible/active 仍真；owner doc 与 host/View/context contentEl 当前一致，doc.visibilityState 为 visible 且 doc.hasFocus()；context.leaf 与现有 `app.workspace.getMostRecentLeaf()` 当前相同，leaf 的真实容器仍包含该 page/pane。无 chrome/leaf 事实时不自动 seen。 |
| exact pane | selected Space、tabId、tab 中 runtime/paneSessionId 都仍匹配捕获 triple；当前 tab/pane 路径仍挂载。原生待处理定位路径继续核既有 focused 条件：workspace.active.id==tabId 且 tab.focusedSessionId==runtimeId；不能用 textarea focus 或当前 size owner 代替它。 |

监听 doc visibilitychange、所属 window focus/blur、active-leaf-change、元素相交和布局 active/focused 变化，唤醒/撤销本地呈现标记；所有监听/IO/RAF 在原 View/Host 生命周期清理。window blur 立即撤销本轮 pending 资格。doc.hasFocus 只是 UI 保守门，不是 OS foreground 进程证明；IO 不证明无其他窗口/弹层遮挡，更不证明人眼阅读。

本方案不从 setViewFocused/尺寸 lease 读取“已读”，不在这些监听里授予尺寸 owner。`TerminalView.focused` 是输入/尺寸行为，继续由既有 explicit focus 路径拥有。

## 4. N/N+1、split、readonly 与双观察者

- **N/N+1：**已提交 UI N→画面回调 N 之间出现新 completion N+1，markManagedSeen 仍发 N；A 只推进 throughN，并在 queue 写前重读 exact attempt/hint，保留 N+1 未读。seen-only revision 不制造新 activity/render。旧请求的晚成功/失败只更新自己的本地回执，不清 N+1 或新 runtime 错误。
- **split：**当前 `attach` existing-tab 分支仍仅 activate(tab)，可能停在 A pane；候选 A 必须最终同步段调用 focusSession(exact runtime)，同时确认布局与 Sessions.focus。每调用者独立显示意图；合并只共享 ensure-pane。B 不用 attach 返回值兜底 markSeen，也不复捕获用户已经撤销的前景意图。
- **两 observer：**同 runtime 两个视图各自有独立 render generation/mark。非当前 leaf/doc 或 follower pane 不借另一个视图的 ready 去 seen；同时合法的重复 N 由 A 单调/幂等，B 不建全局 renderer/seen manager。旧 document adoption 的 view.dispose 后回调必须失效，新 doc 从实际快照/commit 重来。
- **readonly hint：**占位若实际展示 completionHint，另走该 React commit 的原 hint runtime/sequence tuple；同样检查 visible/doc/leaf/pane，不能冒称 terminal screen ready，更不能 mint Session/新 runtime。当前占位只显示标题/cwd，未显示 hint 时不 mark。实时 Session 路径与 restored-hint 回执按 A 返回 mode 区分。

## 5. unknown 的曾 blocked 不能消失

待处理索引仍读全 Vault managed.sessions，覆盖 background/detached、已附加但非聚焦 split、跨 Space；不复用旧 ManagedSessions 的当前 Space+排除 attached 过滤。

当前 `blocking.state==='unknown'` 或 source.health unknown/unavailable，**不排除** `lastFact.blocking.state==='blocked'` 的项；聚合 lastFact 不可归属时，查看有限 sources[].lastFact，保留各自出处，不按最近事件挑主。显示“曾观察到权限/问题；当前状态未知”，保留 exact triple 的“查看原终端”。四 command/unproven 的历史 permission/waiting 也只能按 A 明列的 lastFact 展示为历史提示，不从 event 字符串猜可靠审批。

因此 A 必须在失效时保留 v2 已承诺的 lastFact/各 source 的历史 blocked 事实；若 reducer 把所有事实抹成 unknown，B 无法合法重建，不用屏幕关键字补造。只有同 binding 的真实匹配 clear 才能消除对应当前门；seen 只处理 completion，不能把“已看过”变成 clear。runtime 已结束/换代则显示准确无法附加/原记录入口，不自动重启或换 backend。

## 6. 精确未来文件与验证方法（本轮未执行）

B 的最小六条路径与 v2 一致，不增新文件：

- `ui/terminal/terminal-view.ts`：上述本地双向桥、公开 onRender/IO/本地 generation、常数 pending；保留 T05 parse/ACK/size owner。
- `ui/terminal/TerminalTabView.tsx`：commit 捕获 N、context doc/leaf/exact pane 闸、seen 调用/abort/有界回执；readonly hint 实际渲染后才允许其路径。
- `ui/sidebar/AgentSidebar.tsx`：全 Vault 待处理/历史不确定项、明确来源与原终端定位；没有 click→seen。
- 对应既有 `terminal-screen-xterm.dom.test.tsx`、`TerminalTabView.dom.test.tsx`、`AgentSidebar.dom.test.tsx`：补下列行为，原测试不删。

验证接缝：

1. 真 Session/Presentation/target 初始 snapshot 未完成、只 ready、gap/resync/error 都不 seen；模拟公开 renderer 边界 onRender 后才出一次捕获 N，普通重复 render 不洪泛。现 TabView DOM 测试 mock TerminalView，只能证明桥接/路由，不能冒称真实 paint；真实 View/第三方 renderer 的行为另在生产 DOM/后续 Root Chrome 证明。
2. deferred onRender N，提交活动 N+1 后释放旧回调；assert seen 请求仍为 N。再 deferred A writer，使 N 的晚成功/失败不能全清 N+1；A 的真实 `workspace-service-activity.test.ts` 负责 queue/attempt/hint 持久结果。
3. split A→点击 pending B：实际 WorkspaceService + Sessions 保证精确 B，源/attach 成功本身零 seen；只有 B ready/render/当前闸后提交。两调用者不同 focus、跨 Space flush 中用户改焦点都拒绝迟到前景操作，零 spawn/input fallback。
4. 真实 hidden/inert/IO false、doc hidden/blur、非当前 leaf、尺寸为零、doc adoption、dispose 后晚 onRender/seen resolve，均无新提交/错误写入。两 observer 只有有资格者提交，旧 view 不替新 view；监听/RAF/IO/waiter 都被清理，不改变 size owner。
5. current unknown + lastFact 曾 blocked、两个竞争 source 中一个曾 blocked、unproven 历史 PermissionRequest，仍有准确 manual entry；seen 不消除该入口，不把 current unknown 称已批准/安全输入。真实 clear 后按新快照更新。
6. readonly completionHint 原 tuple、换 runtime、hint N→N+1 及缺 hint 占位；不启动 helper/Session。persisted=false 展示与有界显式重试不重放输入。

需要实际 Chrome/onRender/多窗口或 Provider 时由 Root 在正式准入与稳定组合后安排；这里不运行、不提前占任何脚本或宿主写集。真实 OS 前台/Provider 人工批准仍不由 DOM 夹具认证。A/C 的 hook/profile/CLI 研究不重复，来源摘要只记录本次实际读闭包。

来源：完整26份 SHA/字节/UTC 见 `/tmp/huhu-t06-ui-presentation-seam-source-observation.json`。**READ-ONLY SOURCE STOPPED；所有接口名字仍候选，Root 冻结后才可能派单。**
