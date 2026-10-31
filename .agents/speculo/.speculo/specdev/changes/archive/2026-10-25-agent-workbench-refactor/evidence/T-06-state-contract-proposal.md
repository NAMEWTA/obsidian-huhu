# T-06 Session 状态与投影候选合同（只读，未冻结 API）

观察时间：2026-10-25T15:33Z。工作区 `/home/wta/orca/workspaces/obsidian-huhu/terminal`；Map 实际 revision20。T-05 全部 A/B 产品源继续 STOPPED；Root 当前仍整合/审查 T-05，T-06 未解锁。本轮只读源码并写本 `/tmp` 报告与 source-observation，没有运行测试、helper、Provider、build、cargo、Git，也没有写正式工件。复用既有 dev/ui/I 约束及已核 R-01/K-01/K-02；不把研究或源码阅读算作 T-06 验收。C hooks 提案实际 SHA 与 Root 给定 `21d96133eae44d3d6a0300bba0a4d79882f8d04f8c749012140fefce17c03076` 相符。

推荐继续由 **TerminalSession 拥有该 runtime 的活动事实、来源有效性和 seen 水位**，TerminalSessions 保留唯一 runtime/transport authority；WorkspaceService 只做持久 Session 对应、缓存投影、导航和持久提示 checkpoint。C 提供有归属的观察，B 消费投影，不另建 activity manager、检测轮询 store 或审批服务。下面均为候选，须 Root 准入并核实际落源后才冻结。

## 1. 最终 T-05 上可复用的真实接缝

| 真实源码 | 本轮核实结果及影响 |
|---|---|
| `services/terminal/session.ts:32–38,134–135,605–616` | 只有旧 Activity 枚举与 activityAt；setActivity 用本地时钟、running gate 和有限 title/message，缺来源、activitySequence、seen。初始 Shell idle 只是 Shell 展示，不是已发现 Agent idle。 |
| `session.ts:533–603`；`sessions.ts:563–646` | T-05 已在接受 exit 时同步固定 connection/输入门，屏幕 finalize/barrier 后才发旧 numeric/disconnected 事件；T-04 root notice、cleanup、stop 分开。T-06 必须在事实接受处立即撤销活动可信度，不能等屏幕排空，也不能改变 decoder→parse→ACK/reply→旧 exit 合同。 |
| `sessions.ts:221–240`；`workspace-service.ts:113–139` | managedSummary 与 cached getManagedSnapshot/subscribeManaged 已有生产链；查询不 acquire helper、不启动 Provider。新增 detail 从同一 Session 读出即可。 |
| `controller.ts:182–186`；`sessions.ts:91–102,497–502` | 交互入口只转发 hookActivity 能映射的事件，HookError 被忽略；Shell 没有 agentId，当前也不准备 Hook scope。不是已复现产品故障，但实现必须闭合错误和 Shell 来源接线。 |
| `status.ts`；`controller.ts:211,217–235` | 当前 done/exit0 在 30 分钟后显示 idle，系统通知按枚举变化去重。老化不能当新 Agent idle/输入就绪；同枚举的新活动也不能被旧 notification 去重吞掉。native exit0 只证明进程结果，不证明模型任务成功。 |
| `workspace-service.ts:655–705` | unread 属 tab；setVisible 按 tab 清除，sync 只在不可见 tab 首次转 done 时置位。无 Pane/background、同 tab 多 Pane、跨 Space completion 没有独立 runtime seen owner。不能拿这枚布尔值充当 activity 水位。 |
| `core/terminal/frames-screen.ts:4–7,158–162` | ScreenMark 使用 runtimeId/contentSequence；ScreenViewLease 是真实对象身份、只拥有可见/尺寸焦点。活动水位不得复用 contentSequence；尺寸 owner 或 UI 焦点不证明 OS 前台程序。 |
| `detection/probe.ts`；`shared/native/host.ts` 的实际能力 | probe 只解析可执行文件，现有 NativeConnection 没有查询当前 PTY foreground-program 的端口。不能据 installed/versionRegistry/标题/prompt mark/静默输出补造证明。 |

`setActivity` 仍被原 agent-runtime 调用；该路径的 HookError、子会话过滤、Pi/OpenCode settlement、原生完整答案和取消/receipt 保留。T-06 不把屏幕或 state wait 当作它的最终答案。

## 2. 最小纯 DTO 候选

推荐将以下纯类型就近加到现有 `core/workspace/managed-runtime.ts`，不新增状态类。它已有 AgentState/AgentId 和稳定目标，C platform 与 B UI 均可仅 type-import；不把 NativeHookEvent、TerminalSession 或 xterm 类型反向拉入 core。`ManagedRuntimeSummary.activity` 保留现有 AgentState 字段，新增 `activityDetail`，旧消费者可逐步读取同一投影。

```ts
interface ActivityMark {
  readonly runtimeId: string;
  readonly activitySequence: number;
}
type EvidenceSupport = 'observed' | 'unknown' | 'unavailable';
type ActivityInvalidReason =
  | 'not-observed' | 'unsupported' | 'legacy-unattributed' | 'hook-error'
  | 'source-mismatch' | 'program-changed' | 'expired' | 'capacity'
  | 'stop-requested' | 'runtime-ended' | 'transport-lost' | 'closed';
interface ActivitySource {
  readonly kind: 'native-hook' | 'foreground-process' | 'screen' | 'runtime' | 'legacy';
  readonly health: 'current' | 'unknown' | 'unavailable';
  readonly reason?: ActivityInvalidReason;
  readonly provider?: AgentId;
  readonly adapterRevision?: string;
  readonly observedVersion?: string;
  readonly bindingId?: string;          // opaque host binding, never spool token/path
  readonly programEpoch?: string;       // host lifetime generation, not nativeSessionId/PID
  readonly sourceInstance?: string;     // only when actually provided/proven
  readonly capabilities: Readonly<{
    activity: EvidenceSupport;
    blocking: EvidenceSupport;
    foreground: EvidenceSupport;
  }>;
}
interface RuntimeActivitySnapshot {
  readonly at: ActivityMark;
  readonly revision: number;            // also changes for seen-only updates
  readonly state: AgentState;           // effective current inference, not task success
  readonly observedAt: number;          // local adoption time
  readonly eventAt?: number;            // diagnostic source clock, not ordering authority
  readonly source: ActivitySource;
  readonly lastFact?: Readonly<{
    state: AgentState; observedAt: number; eventAt?: number; event?: string;
  }>;
  readonly blocking: Readonly<{
    state: 'yes' | 'no' | 'unknown';
    reason?: 'permission' | 'question' | 'login' | 'other';
  }>;
  readonly promptEvidence: Readonly<{
    foreground: 'confirmed' | 'changed' | 'unknown';
    inputReady: boolean;                // transport/parser readiness only
  }>;
  readonly completion?: ActivityMark;   // latest native completion hint; separate from seen
  readonly seenThrough: number;
  readonly unreadCompletion: boolean;
}
```

字段约束：

- `at.runtimeId` 是本 TerminalSession.id；业务 Session.id 和捕获 lease-generation/native SID 仍由原 owner 管，不塞进水位冒充同一种 ID。新 runtime 从 0 开始，旧 mark 永不跨代比较。
- activitySequence 在同一同步采纳点递增：新有效事件（即使仍是 working/permission）、来源失效、改变当前判断的 native 生命周期事实。重复 delivery、不相关输出、尺寸变化、普通查询、seen、ManagedSnapshot.revision、Date.now 均不代替它。seen-only 只推动 snapshot revision。
- `capabilities.* = observed` 只表示该精确 adapter/来源确有对应证据，不是安装成功、六家普遍支持，亦不等于当前输入安全。source current 需绑定/程序寿命仍有效；缺 observedVersion 就缺省，不填 registry 版本。
- lastFact 是保留的历史事实；source 失效后当前 state=unknown，lastFact 不被改写成 idle。若最后事实为权限/问题，失效不得当作已批准/解除：当前 blocking 转 unknown、保留 lastFact/处理入口，普通 prompt 仍不允许。明确可信的新事件或已核实生命周期才改变该事实，不用 TTL 解锁。
- completion 仅由相应可信完成事件产生；退出/连接证据独立展示，root exit0 不合成“本输入模型成功”。30 分钟淡化可保留为次要显示信息，不能改写权威 state、completion 或 sequence；不继续靠计时器把完成事实变成可提交证据。
- `unreadCompletion = completion.sequence > seenThrough`（同 runtime），不是 activity != idle，不是 mailbox unread。permission 等待处理也不能因 seen 而变为已解决。确认时间和状态都保留来源。

## 3. 唯一 owner 的方法与 C/B 接线候选

**Session 内部**推荐新增只读 getter 与同步原子 join；Workspace 继续用现有 sessions.subscribe 驱动缓存，不再叠一套 store：

```ts
TerminalSession.getActivitySnapshot(): RuntimeActivitySnapshot;
TerminalSession.observeActivity(
  changed: (snapshot: RuntimeActivitySnapshot) => void
): { readonly snapshot: RuntimeActivitySnapshot; dispose(): void };
// 内部方法：只接受绑定该 Session 对象的 producer closure，不公开按任意 ID 写状态
TerminalSession.bindActivitySource(meta: CapturedSource): ActivityBinding;
TerminalSession.invalidateActivity(reason: ActivityInvalidReason): void;
TerminalSession.markActivitySeen(at: ActivityMark): SeenUpdate;
```

observeActivity 在同一同步段注册并返回起始 snapshot，没有 await 空窗；已捕获的起始 snapshot 不在之后异步换成“最新状态”。调用者先拿 join 再判断当前/基线；T-08 独立 wait 可匹配 snapshot，prompt+wait 捕获提交前 at，之后只认更高水位并保留提交时已 working 的事实。有限 listener、有限元数据、无屏幕/答案复制和无限 backlog；复用轻量 invalidation，慢/抛错消费者只解除本观察，不阻止 native ACK、不更改 runtime。若最终设计要回放活动日志，须另冻结有限 ring/gap 合同，不能暗增无限历史；本候选不要求新增日志。

**C→A 的最小输入**是同一 `ActivityBinding` 的 `observe(observation)/invalidate(reason)/close()`。binding 由 Session 在 hook prepare 前同步建立，C 仅持 closure；不信事件内自报 Space/Session/runtime。观察携 Provider/adapter revision、真实可选 version/instance/sourceSequence、稳定 deliveryId、event/eventAt、有限摘要及可证明的活动/阻塞事实。observeAt 由 A 采纳时记录。C 可给 Provider 特有原始事件名作诊断，不能传全答案/凭据到 UI。A 在同一点验证当前 binding/programEpoch、去重、采纳、推进 sequence、发布 immutable snapshot。命令 Hook 子进程 PID/ppid、同 nativeSessionId、源 wallclock/文件 hrtime 都不足以证明当前 Provider 进程寿命或事件因果。

C 继续拥有原 NativeHookEvent/prepare(agent,env,receive) 兼容通道；旧 `setActivity` 可保留为明确 legacy 适配入口，不能顺便赋予 foreground/safe-prompt 能力或绕过停止门。新受管交互链必须走有来源的 binding，不继续让 Controller 只映射字符串并丢 HookError。旧 automation 原生结果不迁入活动快照。

**生命周期优先顺序**：

1. requestManagedStop 同步关闭输入/未开始 spawn，并立即使活动 source 失效；Session.running 目前不检查 managed stop，单靠 setActivity 的 running gate 不够。
2. root-exited notice 立即撤销程序活动/foreground 证据；不把 connection/decoder/model 提前结算，不阻断后代 drain 的输出、parser reply 或捕获 ACK。cleanup partial/unknown 仍由 T-04 保存/可查。
3. 接受 numeric exit/transport closed 时立即发布失效；disconnect 当前在 screen barrier 后才改 connection，因此不能仅等旧 onChange/最终 exit 再撤销活动证据。
4. 旧 sourceInstance、旧 binding、旧 runtime 的迟到 Stop/SessionStart/标题/恢复引用全部拒绝。adopt PID 不能复活 source。明确新的同 Shell 程序实例才能创建新 programEpoch；不能只见一个不归属的 SessionStart 就授权换源。
5. close/detach Pane 不关闭 binding、不停止 runtime；模块关闭、runtime 确定结束/失联才撤销 scope。C close/poll/prepare await 后重验有效性。溢出、畸形或去重可靠性失效标 capacity/unknown，不能忘掉去重信息后把旧完成当新完成。

**B 消费**只读 `ManagedRuntimeSummary.activityDetail`，新待处理索引基于全部 managed snapshot 的显式 spaceId，不复用“selected Space 且未附加”过滤；附加但非当前 Pane 的等待项也须出现。不因事件切 Space/Tab/leaf/focus，不自动调用原生输入。

## 4. seen 与持久化的最小闭包

建议 Workspace 增加 `markManagedSeen(ref: ManagedRuntimeRef, at: ActivityMark): Promise<ManagedSeenResult>`；结果至少包含 captured target、已推进 seenThrough、persisted 与准确错误。ref 与 at.runtimeId 必须相同，并在当前 runtime authority/持久提示的精确来源上核验；不能用“当前 Tab/当前 Space”补目标。

seen 只在真实原终端已呈现后上报：B 在所属 doc/leaf 的实际 Pane mount/visible 条件成立后，提交 **呈现时捕获** 的 activity mark；attach promise 成功、列表已渲染、选中 Space 或 screen stream applied 都不自动等同用户看过。可通过现有 Workspace visible owner 与对应 tab.sessionIds 验证显示引用；必要的 DOM/doc 当前性留 B 提供并回归。它是展示条件，不证明 PTY OS 前台程序。若上报 N 时新事件已到 N+1，只确认 N，N+1 的完成仍未读；seen 不推动 activitySequence、不清 blocking、不 ack 邮箱。pending/失败/迟到失效导航不自动 seen。

Spec§3.3 要求完成提示与是否看过分别保存；现有 tab.unread 无法承接无 Pane 的 completion。推荐在 **原 SessionRecord/SpaceService 单 writer** 添加一份有限、可选的最近完成提示 `{runtimeId, activitySequence, observedAt, seenThrough}`，不是第二数据库或运行状态恢复。活动热状态继续只属 Session，不把 hook token/source instance/真实 PID 持久为 authority。Workspace 以有界合并的最新提示 checkpoint，旧异步回调不能覆盖较新 marker/seen；保存失败保留原生事实，明确 persisted=false，不谎称已保存。恢复只读该提示及旧 attempt，source 当前为 unavailable/unknown、零 helper/spawn，也不凭旧 mark 继续运行。无需每个活动事件写盘或保存 turn 历史。

这会精确新增 Ticket 目前缺少的 records/SpaceService 测试范围，须 Root 在准入时补齐。若 Root 对“保存”仅采用运行内生命周期的解释，应在实施前明确验收边界；不能静默沿用 tab 布尔值后宣称后台与恢复均完整。常规字段命名/合并实现由 owner 决定，不需新增用户问题。

## 5. 精确 Pane 定位与异步意图

已确认的源码缺口：`workspace-service.ts:505–513` 的已有 runtime 分支只 `activate(found.id)`；`activate:637–642` 会选 tab 原 focusedSessionId。应在相同受控用例内对 **捕获 runtimeId 调用 focusSession(runtimeId)**，再核 `tab.sessionIds` 包含目标且 focusedSessionId 等于该 runtime；不能只从 attached/focused:true 推断正确 Pane。

复用 T-03 ForegroundIntent 与 presentationRevision，最小修复顺序：

- 调用最外层立刻复制 target/options、冻结 expectedRuntimeId、捕获显示 intent/revision，再进入任何 flush/select/共享 attaching promise 等待。捕获后不重新授权，不能晚到结果重新 capture 用户意图。
- `attaching` 当前按 stable Session 合并整份结果，后一个调用会直接继承前一个调用的 focus 结果。建议只共用“查找/建立唯一显示引用”的在途工作；每个调用各自持有 focus:false/true 和 intent，等待后再做该调用自己的有效性检查/精确 Pane 聚焦，不能借另一调用的前景授权。focus:false 永远不 select/show/focus。
- 跨 Space 先核 stable target 与当前 runtime，flush/select 后核预期 revision（包含本次受控 select）和原 intent；选中的不是目标时不把运行迁到当前 Space。布局等待期间 select/activate/close/restore/split/leaf/window 用户动作均使旧结果不再聚焦；目标运行继续可查。
- 创建/附加完成只是布局事实。需要 `launch.show` 时仍沿原捕获 intent 检查，不加无条件 Controller.open；显示失败保留真实运行/查看入口。自身受控弹层关闭恢复可用现有 allowWithin，不能因此忽略真实用户新焦点。
- pending 只返回 pending，无迟到自动跳转 continuation；not-running/stale 不自动 openManagedRecord/restart/fallback 到另一个 runtime。用户后续明确点击查看旧记录可复用 T-04 readonly record 路径。
- attach 无 spawn、不改 Space 归属；用户在原 TUI 按允许或拒绝，后续真实事件更新同 Session。T-06 不新增 Approval API，不代按允许键。

精确接缝是 WorkspaceService，而非 Sidebar 在 await 后 query textarea、换 tab 或“补一次” focus。B 用当前页面的真实 TerminalTabView→TerminalView focus 效果，测试必须覆盖 A/B 同 tab split（初始聚焦 A，选择 B 后仍同 tab、focusedSessionId/session.focused 皆 B），不能只断言 activeTabId。

## 6. safe-prompt 与能力缺口，及 T-08 边界

当前 `submitInteractivePrompt` 仅 running + bracketed paste/已有 Shell prompt mark，Session.submitInput 只管输入门/资源/native admission；这些不证明 blocked=false 或当前 Agent foreground。T-06 交付明确的证据查询和失效点，**不在本票提前实现 T-08 CLI prompt/wait/router 或重写原原生答案业务**。

T-08 真正提交前必须再次核精确 runtime、programEpoch、source 当前性、foreground 与 blocking；排队/等待期间有变更则拒绝尚未开始的整笔输入，已开始依原 native none/unknown 事实返回，不自动重发。已 working 不自动拒绝；仍须有原生程序确可安全接收输入的证据。unknown/权限/登录/问题不被普通正文回答。原始用户终端输入始终保留，用户明确操作原 TUI 与普通 Agent prompt 不混为同一能力。

**当前可实现上限**：有归属的 Hook 可发现某 Provider/部分活动与阻塞证据；Shell 的 scope 只应准备惰性 token/env，不改 HOME/账号/Manual/YOLO，不为被动发现安装六家配置。Command Hook 没有可靠进程实例时来源寿命/foreground 保持 unknown。Pi/OpenCode extension instance 可以区分来源生命周期，但仅凭 extension alive 仍不等于已核实 OS foreground。不支持就准确 unknown + 原终端入口，不能用新计时器/屏幕关键字制造支持。

如果 Root 要在 T-06 承诺正面的 foreground=confirmed/safe prompt 路线，需要先明确被证明的机制、平台与实际 producer seam；现有源没有该端口。本轮不要求另起 native 平台，也不把“全部系统任意程序都可识别”当验收门。真实 Codex/Claude 允许与拒绝、六家当前版本能力和五平台仍交用户验收；受控事件/配置成功不替代它们。

## 7. 准入时建议的精确 owner 写集

以下是建议补集，**不是写授权**；现 Ticket 只列 status*.ts/sessions/controller/Sidebar 等，不能直接跨写。

**A 唯一状态/业务 owner**：

- `src/modules/agent/core/workspace/managed-runtime.ts`：上述纯 DTO 与 ManagedRuntimeSummary.activityDetail/SeenResult。
- `src/modules/agent/services/terminal/session.ts`、`session.test.ts`；现有 `status.ts`、拟新增 `status.test.ts`：唯一活动采纳/来源失效/seen及兼容展示。
- `src/modules/agent/services/terminal/sessions.ts`；拟新增 `sessions-activity.test.ts`：绑定 C producer、stop/root/lost 优先、summary 投影；不写 native wire。
- `src/modules/agent/services/workspace-service.ts`；拟新增 `workspace-service-activity.test.ts`，及现有 `workspace-service-spaces.test.ts`：缓存、准确 split/cross-Space attach、seen/持久提示。`services/launch/foreground-intent.ts`/现有 `foreground-intent.dom.test.tsx` 仅实际需要修受控意图时补；优先沿用现合同。
- `src/modules/agent/services/controller.ts`；拟新增 `controller-activity.test.ts`，复用 `controller-managed-runtimes.test.ts` fixture：实际 HookError/生产 port/通知水位与焦点组装，不新造 controller facade。
- 为无 Pane 与恢复完成提示：`services/spaces/records.ts`、`records.test.ts`、`space-service.ts`、`space-service.test.ts`（本轮 inventory 已核这两个测试文件真实存在）。只复用单 queue 并纳入既有关闭 strict-drain，不动 T04 native cleanup。
- `src/modules/agent/i18n.ts`、`docs/agent-workbench.md`：A 唯一双语键/说明 owner。新键在实际 source 冻结回执给 B，不把此候选键名单当 freeze。

**C 唯一 producer owner**：现已列 `platform/desktop/hooks/**`、必要 `detection/**`；窄补现有 `platform/desktop/agents/accounts.ts`、`accounts.test.ts` 提取 Shell 独立 system runtime 根。C 管 provider attribution、原 hook 命令升级/移除、guard、实际 spool 与 sourceInstance/健康事件；保留用户同组命令、跨 Vault 全局命令、原账号和 native answer。无需借 account-permissions ACL 路径重做 YOLO。C 不写 A Session/Workspace，也不自己维护 activitySequence。

**B 唯一 UI consumer**：最小 `ui/sidebar/AgentSidebar.tsx`、`AgentSidebar.dom.test.tsx`，加 `ui/terminal/TerminalTabView.tsx`、`TerminalTabView.dom.test.tsx` 的实际呈现 seen 接线；若必须把真实 DOM 呈现回调放 TerminalView，则精确补 `ui/terminal/terminal-view.ts` 与现有 `ui/terminal/terminal-screen-xterm.dom.test.tsx` 的实际 view 组装入口，不能假定 A 已拥有 DOM。root 必须先核 DTO/方法/keys。

`ui/control/` 目前不存在，右侧没有 control host；T-06 待处理提示可就现侧栏闭合。若准入要求本票新增完整 DESIGN 控制页宿主，还需独立准确分配 `ui/AgentWorkspacePage.tsx/.dom.test.tsx`、`services/workspace-view.ts` 及测试，不能用 history drawer 冒充，也不能提前实现 T-08 输入/等待区。

## 8. 准入后的 meaningful 红绿与生产组装计划（本轮未执行）

1. Session 真对象：Agent 初始 unknown；输出/resize 不推 activitySequence；同枚举两条新 delivery 推两次、duplicate 不推；HookError/过期/换 source 各保留 lastFact+unknown，seen N 不清 N+1。fake clock 验 TTL，不以静默/30 分钟老化证明 idle。
2. 真实 TerminalSessions+NativeHost 受控 native events：hooks prepare/输出期间 stop/root-exit/lost 先来、旧事件后到，输入门立即拒绝且原 output→parse→captured ACK/reply/旧 numeric exit 顺序保持；不会复活 source/标题/native 恢复引用。Browser owner/原 stop cleanup 保留，不用 helper.alive 冒称完整 Cookie 操作。
3. 真 Controller + AutomationHooks 临时 spool + SpaceService/Workspace：Shell statusHooks env 不覆盖账号/HOME，adapter 缺失准确 unknown；临时 token close/poll/晚 prepare、HookError、归属错误、过大/重复事件；实际 managedSnapshot 可查来源/序号。测试通过只能证明本项目组装，不认证真实 Provider。
4. 生产 Workspace split 与并发：A/B 同 tab、B background 无 Pane、跨 Space focus:false、同 runtime 并发不同 focus 意图、deferred flush/select 后外部 leaf/window/新用户动作、close/split/restore竞争；零新增 spawn、目标 Pane 精确、晚结果不抢焦点、不误 seen。现 `controller-managed-runtimes` 与 `foreground-intent.dom` 提供可复用真实异步夹具。
5. 原单 writer 临时库：无 Pane completion 与 seen 分别保存、旧 marker 不覆盖新、N+1 事件和 N seen 并发、写失败保留状态/准确 persisted=false；重开零 acquire/helper/spawn，旧 runtime 提示不能变活动 authority。
6. B 生产 DOM：跨 Space/附加但未聚焦的待处理项、不同 blocked reason、来源 unknown、键盘定位准确 Pane、取消/卸载/陈旧 pending 无晚跳转；仅真正呈现清相应 completion，不清 mailbox、不发自动允许。沿现主题/尺寸/无障碍检查，不做整页重排。
7. 原 native answer/Pi settlement/OpenCode root/child、Manual/YOLO 首次确认、老系统 Hook 命令识别/用户配置保留用原真实接缝回归。T-08 再测 blocked=true 但 bracketedPaste=true、旧 Shell mark、前台换代/排队期间变更的普通 prompt 拒绝及不重放；本票不宣称已过。

需要 Root 在准入时收束的是**准确写集/持久提示字段归属、正面 foreground 机制的实际可证明范围、是否本票需要 control host**；其余是同合同下常规工程实现。无新增用户产品问题。本报告不是 API freeze、实施授权或验收结果。READ-ONLY SOURCE STOPPED。
