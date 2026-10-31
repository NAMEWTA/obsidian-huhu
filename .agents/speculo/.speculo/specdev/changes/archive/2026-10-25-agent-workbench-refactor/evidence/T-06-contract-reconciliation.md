# T06 三候选接缝核对（只读）

GP019/Map20不变，T06未解锁；T05 C仍可能写其原范围。仅本报告写入/tmp，未跑测试/编译/build/Chrome/helper/Provider，未改源码、target或正式状态。

**结论：没有必须另做产品决定的相互矛盾。**A v2、B presentation、C profile可按下列工程约定合并冻结；当前Ticket精确写集仍不足。以下是建议准入合同，不冒充已落源API/验收。

## 可冻结的准确接缝

| owner/边界 | 准确候选及责任 |
|---|---|
| A → C | 复用v2 `RuntimeHooksPort.prepareRuntimeHooks(request:RuntimeHooksRequest,binding:RuntimeActivityBinding):Promise<PreparedRuntimeHooks>`；request保留target/env/initialProvider并有`signal?:AbortSignal`；返回`env`和`close():Promise<void>`。close首个await前同步撤slot/binding，重入返回同一真实cleanup Promise。binding.close仍同步void，只撤证据，不假称磁盘已清。 |
| C → A | 仅v2 `bindSource(meta)`得到捕获source binding，调用`observe(ActivityObservation)`/`invalidate(ActivityReason)`/`close()`。provider来自审定adapter；registration UUID/真实sourceSequence与unproven严格区分。C不造activitySequence，不直接改managed/UI store；A不重读spool或复制C的D-ID Set。 |
| A唯一状态 | `getActivitySnapshot`、`observeActivity(listener):ActivityJoin`同步注册+返回immutable snapshot；`markActivitySeen(ActivityMark)`只推进捕获N。ManagedRuntimeSummary.activityDetail、ManagedSessionSummary/SessionRecord.completionHint仍为可选；旧AgentState/记录兼容。sources有限，聚合不择最后事件；foreground固定unknown。 |
| A → B | 沿v2 `getManagedSnapshot/subscribeManaged`、`attachManaged(target,{expectedRuntimeId,focus,groupId?})`、`markManagedSeen(request,options?)`与原result union。ManagedSeenRequest仍`{target:ManagedRuntimeRef,at:ActivityMark,view:{tabId,paneSessionId}}`，不新增客户端可伪造“已paint”字段，不对计划CLI暴露seen。 |
| B本地桥 | `TerminalView.presentActivity(mark:ActivityMark|undefined):void`；`TerminalViewHost.presented?(view:TerminalView,receipt:Readonly<{at:ActivityMark;installed:ScreenMark}>):void`。React commit捕获N；View完整安装后请求刷新，经公开onRender覆盖viewport，再回报N。installed只是同runtime安装基线，onRender不证明精确contentSequence。 |
| seen证明分工 | B核render generation/可见/IO/doc focus/current leaf/exact pane，并在回调再核；A独立核稳定tuple/布局/既有可见登记/水位。ready、applied、attach.focused、tabId均不能单独证明呈现。readonly hint按实际React提交展示的原tuple走内部seen，绝不伪称terminal screen ready或mint Session。 |
| 真实异步关闭 | C的`AutomationHooks.dispose():Promise<void>`同步撤自己全部scope/callback，返回实际自有cleanup/失败，不dispose其他实例scope。A必须修改`AgentRuntime.hookClose?:()=>Promise<void>`及其remove/late-prepare/dispose收集；`AgentRuntime.dispose():Promise<void>`幂等并收集hooks与registry两者结果，不能先等registry才启动Hook cleanup。Controller现`settle('hooks',()=>this.hooks.dispose())`可承接Promise。 |

A split成功必须最终同步`focusSession(exact runtime)`；每次attach调用独立捕获intent，合并只ensure-pane，不共享聚焦结果。背景/迟到失效不select/open/focus。B不兜底抢焦点；PAGE003仍只承接原TUI人工处理/准确能力提示，不新增右控制宿主或自动输入。

## 必须在正式packet写清的四项工程约定

1. **一runtime一份prepared scope。**新managed路径的完整原生答案/活动摘要共享同一物理publication分流，不为两条通道各prepare一份。legacy原生答案消费者可保持原入口，但同一新Session不能既由typed observation又由旧hookActivity→setActivity再次推进同一活动。Controller替换/适配该重复路径；原AgentRuntime receipt/full-answer/cancel保持。
2. **来源额度同寿命。**A的8 source-lifetime槽与C的8 registrations/scope采用同一runtime/scope寿命，已close的identity/high-water fence仍占累计槽，直到该runtime binding/scope真实收束；不能close/rebind/换UUID洗额度。D=4096只用于无真实序号的活动摘要；registration使用high-water+8份reorder。raw通道由consume/nonce fence与原turn合同去重，不依赖遗忘D，不承诺全局exactly-once。共享32 scopes必须覆盖Controller和AgentRuntime两个AutomationHooks实例，含preparing/closing/orphan。
3. **显式语义而非映射猜测。**C保留真实Pi prompt start/end与blockId配对，A核同binding/epoch/registration和未闭合block；generic PreToolUse/Stop/seen/TTL不能clear。turn-finished仅传真实允许的完成事件；四command unproven、StopFailure/取消/HookError不晋升为成功completion。并存来源/缺序号/超限均unknown且保留各source lastFact曾blocked入口。C内部spool envelope/SourceStart/close编码由C唯一生成/验证，A只消费上述typed端口；不需要另一份跨owner原始JSON声明。
4. **两层有限异步保留。**B每View一个render in-flight+一个latest pending、每Host一个seen观察+一个合并mark；A单writer提示调度一个真实在途、每目标一份合并、dirty-target≤32/waiter≤32（数值候选），不按事件enqueue。UI abort/超时仅移除观察，C closing仍占scope，A已接纳磁盘写仍归原owner隔离；真实settlement/strict-drain前不释放writer、不清最后notice或失败。A保留persisted=false和晚错误，B不能因内存seen已变就宣称保存成功。

其中第2项消除C“关闭待回收”可能被读成可复用槽的歧义；第1项避免真实双计；B的onRender是对A v2“安装ready”简写的必要收紧。均可采用上述唯一建议，无需向用户新增产品问题。C small8/128(64KiB)、large2/4(16MiB+64KiB)、collector4、每轮small16+large1与A 8KiB摘要不冲突；完整答案2MiB独立。逻辑副本/文件额度不等于V8/RSS，B呈现桥不复制spool/原文。

## 当前写集与精确新增路径

当前`ticket/06-activity-and-approval.md`仍仅含hooks/detection/status*/sessions/controller/sidebar/control/account-permissions等旧范围，**不足以实施三候选**。Root正式增补时，已有宽glob内文件不需重复扩大权限，但packet应锁唯一owner。

以下以`src/modules/agent/`为根，均需在当前Ticket范围之外明确加入：

- **A既有文件：**`core/workspace/managed-runtime.ts`；`services/terminal/session.ts`、`session.test.ts`；`services/workspace-service.ts`、`workspace-service-spaces.test.ts`；`services/spaces/records.ts`、`records.test.ts`、`space-service.ts`、`space-service.test.ts`；**Root已确认必须加入的`services/agent-runtime.ts`、`agent-runtime.test.ts`**，不再写成条件式申请。
- **A准确新增测试：**`services/terminal/sessions-activity.test.ts`、`services/workspace-service-activity.test.ts`、`services/controller-activity.test.ts`。另`services/terminal/status.test.ts`为新文件但已被原`status*.ts`覆盖。无必须新建的活动manager/reducer生产文件。
- **C既有文件补集：**`platform/desktop/agents/accounts.ts`、`accounts.test.ts`。**C准确新增内部文件：**`platform/desktop/hooks/hook-spool.ts`、`hook-spool.test.ts`（已在hooks/**范围内；仅同owner共享pool/生成脚本/reader，不是新服务）。既有automation-hooks/native-extensions/event-payload/system-hooks/remove-status-hooks测试继续原hooks写集。
- **B既有四路径补集：**`ui/terminal/terminal-view.ts`、`TerminalTabView.tsx`、`TerminalTabView.dom.test.tsx`、`terminal-screen-xterm.dom.test.tsx`；Sidebar两文件已在原范围。不需新B文件、不改screen DTO/target renderer/geometry owner。

i18n/docs仍A唯一；module/controller原装配保持懒加载。AgentWorkspacePage、workspace-view、ui/control、NativeHost/shared/native/Rust/依赖不因T06本收口新增写权。`services/launch/foreground-intent.ts`及其既有DOM测试只在实际精确intent闭包需要时另补，三候选没有证明现在必须改它，不能先把预备可能路径写成必改。

准入顺序可直接为：Root明确上述工程约定/路径→A落纯DTO/公开API与词典实际SHA→C生产typed binding/async清理+资源池同源脚本→B消费真实API；A/C业务内部可按不重叠路径并行，跨owner字段更改先回Root。T05未停源前不开始任何步骤。

## 来源核对与停止

观察UTC：2026-10-25T18:01:48.506086+00:00。三候选原件SHA均匹配；后三区为本轮只读源码/票据观察，不是新freeze。

- `/tmp/huhu-t06-activity-api-candidate-v2.md`：35407B，SHA256 `92da6dc480c537f4a7bda7132efdf1d9e60b1c4b5ec57e1300c60a95b3379b92`。
- `/tmp/huhu-t06-ui-presentation-seam.md`：12394B，SHA256 `c5401c9c40da0ccfbf387c876dacffe72b685be5b00f2dcd80b974aeb9654290`。
- `/tmp/huhu-t06-hook-resource-profile.md`：16117B，SHA256 `f3f61cea0acba0ed9ab60e76775ce93452efcde04511b94ced032769fabe576e`。
- `src/modules/agent/services/agent-runtime.ts`：23866B，SHA256 `285225bb4ea081dccbd4931184e0dd49a7cd0db5f38a08709c40542f3377d113`。
- `src/modules/agent/ui/terminal/terminal-view.ts`：20005B，SHA256 `5bd0a7545b4b564fda870b26be5b3b9e8a11580f1df83e9fccd0142ad7c209de`。
- `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/ticket/06-activity-and-approval.md`：16717B，SHA256 `11a3692deee000f7062d64107ea2d086d1bfa02558b758d63397932e7c829760`。

发现命令曾使用不存在的ticket/06-activity-state.md，已按rg定位并回读06-activity-and-approval.md；没有把该发现错误当产品测试。仅本报告为本轮输出。READ-ONLY SOURCE STOPPED。
