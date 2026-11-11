# 任务回报

Session: 20261026T045732Z  
Task: 012-t09-protocol-preparation  
Status: completed

## 聚焦交接

本次只读准备已完成，没有实现 T09、改变产品/规范/Ticket 状态，也没有修复 T08。六个 pane 操作已经在单源公共 descriptor 中声明且 available=false；Rust CLI 的通用语法已能解析，但 TS ControlCommands 尚无 handler，工作台布局也没有独立持久 Pane ID。最短路线是沿现有布局单 writer、WorkspaceService 与 T07 control 路由补垂直接线，在既有 pane 元数据保存独立 opaque ID，并保留当前 Session 去重与 attach 幂等。Root 可在 T08 关闭并重冻输入后，采用下述工程决定和增补写集派实现；本准备报告不替代 DoR 或 T08/T09 验收。

## 产物与验证

只写本 REPORT 和 `/tmp/huhu-t09-protocol-preparation-20261026T101530Z`（下称 R）。R/input.json 是实际 T08 review 输入原件，SHA `67522a2ee5d8579aca8469511d6529d6425b40fd6cd265db784e7900a9c0cf26`；其 full_manifest SHA `4f0cdfd3f76a7a67517042fe3a975f8ee307b4569db0c09eb86b091862ded181`。本轮按 workspace/catalog、Map28、dev/ui 与原 I 预检边界回读，随后核 Ticket09、AC009/061、公共合同与 DESIGN PAGE001/003；复用既有 Skill 规则，不新建 workflow/change，不派子 Agent。实际 HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`、NAMEWTA/terminal；Ticket 内 66083 仅规划基线。

R/sources-complete.json 保存 76 份关键来源的真实路径/大小/SHA/CAS，包含所读规范、Skill、源码、真实测试入口及官方参考来源记录。初次 74 项与 T08 full_manifest 对应项逐一相等、drift=[]；另两份就近测试补充只读记录。不是把当前源码追补成以前运行过的证据。R/web/ 保存本轮三次官方网页读取原文；R/commands/ 与 probe-index.json 保存八个有限只读探针的绝对 argv、完整隔离 env、UTC、exit、stdout/stderr 原件及 SHA。没有 build、修改 generated、启动 helper/账号/Vault 或跑测试套件。

### 1. 当前能力事实与消费者闭包

| 实际来源 | 当前事实 | T09 最小接线 |
| --- | --- | --- |
| control-schema.json:1634–1720 | pane.list/attach/focus/split/resize/close 都存在；仅 list readOnly=true，六者 transport=ordinary、available=false。target paneId 已是统一 ControlTarget 字段；split direction=row/column；resize ratio=.01–.99。 | 改这一 canonical 源，再生成既有 TS/Rust；不手抄第二套 pane wire/协议。准备阶段不翻 available。 |
| generate-control-protocol.mjs:400；control-wire.ts；Rust control/codec.rs | 生成器只输出 control-wire.generated.ts 与 wire_generated.rs；现有 object/number/enum 已能覆盖 pane 参数。TS/Rust 均按有限同源 grammar 校验。 | 预计不必改生成器逻辑或 codec；只有需要未支持构造才另提真实理由。生成检查与共用 fixture 必须随实际合同更新。 |
| control/cli.rs:85–238、help:286–310 | 通用 group.command、--pane、number/enum 解析已存在；space 默认继承目前只覆盖 required-space 与 session/agent list，**不覆盖 pane.list**。help 总使用提示还没列 --pane。 | 补 pane.list 的同次 Space hint 消费/无 hint 错误及帮助，不改显式 pane/session 目标为当前焦点。 |
| ControlCommands:31–56、111–115、307–461 | CONTROL_HANDLERS 没有六 pane；现有 commands.test.ts:204 明确断言 pane.split 为 CAPABILITY_UNAVAILABLE。capabilities 返回实际 handlers，而非把 declared 当 available。 | 六 handler 与 capability 一起交；预检/预算/capture 仍走原 PreparedControlCommand。 |
| ControlRouter:35–122、150–231 | ACK/forward 栈内捕获 prepared，先 scope/preflight，再 admit；已有本机 invokeLocal 与完整 final/progress 预算。 | 扩展业务 capture/run，复用原 envelope、取消、期限、effect/错误，不另开 pane endpoint。 |
| WorkspaceState/model.ts:7–42；terminal/layout.ts:7–16 | tab ID、runtime 叶 key、pane 元数据 keyed by session；LayoutNode pane 仅 {session}，没有独立 Pane ID。ResumeInfo 提供 spaceId/persistentSessionId 等恢复元数据。 | stable paneId 应与这些运行/路径引用区分，不能把 runtimeId、tabId 或 first/second path 当永久 Pane ID。 |
| WorkspaceService:679–792、873–982 | attachManaged 只附加既有运行，不 spawn；attaching 按 runtime 共享创建，非当前 Space 用 spaces.updateLayout，focus 时切原所属 Space；openManagedRecord 可显示停止/恢复记录，不自动执行。 | 活动 Session attach 复用前者，停止/恢复记录显示复用后者，明确 pending/失联/缺记录结果；重复调用返回同一显示，避免新进程/新重复 Pane。 |
| WorkspaceService:1808–1881 | 现 GUI splitPane(id,direction) 会 admit 并 launch **一个新 Shell**。 | 不能直接当 CLI split 指定 Session 的实现。新增同 owner 的“把已存在目标插入当前布局”业务方法，复用纯 split 数学，保留 GUI 原“新 Shell”动作。 |
| WorkspaceService:1883–1915、1700–1716 | closePane 多 Pane 时删对应叶；最后一个调用 close(tab)；close 只移显示到 closedTabs，不 stop。resizePane 接 tabId+split path。 | close 为 detach；最后叶/组折叠沿旧纯操作，停止仍显式 session/runtime。CLI resize 要由 stable pane 查到**当前**父 split/path/side，而非接受旧 path。 |
| workspace-store.ts:111起；SpaceService:495–511；layout-merge.ts:10–52 | selected Space 有 dirty draft/flush，其他 Space 有同一 records.layouts；远程 append/本地编辑经同一单 writer 与三方 merge，冲突保留双方。 | 不建另一份 pane layout/持久 owner，不越过当前 dirty draft 直接读旧 disk 当查询真值。提交回执要等待实际 flush/保存结算。 |
| TerminalTabView.tsx:919–966；WorkspaceLayout.tsx:45起 | 现 runtime key 驱动 TerminalHost 与焦点/尺寸 owner；UI 通过 WorkspaceService.resizePane 写布局，实际 Panel minSize=15。 | 继续这一渲染/输入 owner；可加 data-pane-id 做稳定映射观察，保留 data-terminal-host/runtime key，不为多 Pane 重写 xterm。 |
| WorkspaceService:129–145、317–364；controller.ts:999–1025；TerminalTabView.tsx:157–254 | foreground intent 捕获原 leaf/doc/window，UI 真实 View/textarea 校验后才 presentManagedFocus；committed 请求与 DOM 实际消费是两个阶段。 | pane.focus 复用此机制及 shell.open，不把仅改 selectedSpace/activeTab 或 attach 返回 focused 当实际 DOM 焦点已成功。 |

端到端建议路径：

```text
真实 huhu CLI
  → generated descriptor/parse → 既有 authenticated broker
  → NativeHost captured call → ControlRouter.capture / preflight / admit
  → ControlCommands 的薄 pane adapter
  → WorkspaceService（唯一布局/稳定目标/显示意图 owner）
  → 现 workspace store + SpaceService 单 writer/merge
  → Zustand 同状态 → WorkspaceLayout / TerminalTabView
  → 原 leaf/textarea 的真实呈现回执 → 原 progress/final envelope
```

### 2. 建议的最小 Pane 身份兼容方案

**优先候选：在现有 ResumeInfo/panes[displayKey] 中增加 bounded opaque paneId。** displayKey 仍服务现有 runtime 叶/TerminalView；paneId 是显示身份，tabId/Space/persistent Session/runtime/path 是引用或解析结果。CLI 查询从唯一活动布局派生有限索引，不再拥有一份可单独漂移的映射或布局。

建议约束：

1. 新 Pane 在 WorkspaceService 所属布局单 writer 中分配 UUID，并连同既有 metadata/layout 一次保存；保存成功前不把稳定 ID 当持久成功回执。selected Space 要覆盖当前 draft，非 selected Space 走现 updateLayout/merge。
2. reorder、group move、resize、切 Space 不改 paneId。原 Session 运行重启若沿同一显示槽，可保留显示 paneId，但必须以新的 runtime tuple 重建解析；旧 captured {paneId,spaceId,tabId,persistentSessionId,displayKey,runtimeId} 不得被拿去作用新代次。是保留显示身份，不是重用旧运行映射。
3. close 后只查活动 layouts，closedTabs 内旧 ID 不再可寻址。reopen 当前会原样复用旧 tab metadata（WorkspaceService:2058–2072）；须为重开显示分配新 paneId，避免旧关闭地址复活。tab 历史 ID 可保留。
4. normalizeWorkspace/resumeInfo 当前会丢弃未知字段，必须显式保留/校验新字段，并在同 Space/全实例活动布局检查重复/畸形 ID。无 ID 的旧布局不要在每次 render/查询随机补 ID；在一次受控 writer commit 完成前按 legacy/unavailable 处理，完成后发布稳定 ID。
5. runtime metadata 的重建点要一起覆盖：terminalTab、openManagedRecord、restore、rehydrate/reconcile、sync、reopen。尤其 restore:2029–2037 当前会删除 old key 并重新 metadata(session)，必须显式承接显示身份并让旧运行 capture 失效。
6. T09 只对当前 Space records 的布局格式做有意兼容。SpaceRecords 现 version2、嵌入 WorkspaceState version1（records.ts:33/102）；可保持外层版本并增加可兼容字段，或选择显式新 layout revision，但须由 Root 固定一种读写/降级规则。**不**扫描迁移旧 v1 writer 文件、不接管旧业务配置；T15 的 stop-writer/恢复副本/单 writer 切换仍归 T15。不得同时留下会剥新 ID 的第二 writer。

备选“直接在 LayoutNode pane leaf 增加 id”更直观，但会触及 core/terminal/layout.ts 的全部构造/纯函数、normalize、所有 fixtures/renderer，写集更大；当前无必须为此重塑渲染身份的需求。纯内存 map 或由 runtime/path 拼出 ID 无法跨恢复/重排保持生命周期，故不建议。是否采用 metadata 字段方案是 Root 的本地工程决定；本报告未修改冻结规范，也不把 Root 倾向当批准。

### 3. 六操作的具体建议

| 操作 | 建议业务路径与结果 | 关键约束 |
| --- | --- | --- |
| pane list [--space] | WorkspaceService 从同一当前 draft/records layouts 给有限 Pane summary，ControlPaging 生成 rows/cursor；默认捕获调用 Space hint，显式 space 按原 scope 校验。 | 至少带 paneId、Space/tab、persistent Session、当下 runtime/placeholder、attached/focused 与布局定位事实。应给 pane.list 复用既有 cursor/limit 参数及 layout revision；200 tabs×4 panes 已可能超 49152B，不能无界整图回执。不是另建公开布局 DTO。 |
| pane attach --session | 由持久 Session 解析原 Space；live 用 attachManaged，stopped/restored 用 openManagedRecord 显示记录，pending 明确 pending/不可用，不 spawn。 | 保留现有 Session 去重/attach 幂等；若用 attachManaged 默认 focus=true，应把窗口/实际焦点阶段明确回执，不能只报告请求已提交。 |
| pane focus --pane | stable pane 捕获归属，必要时 selectSpaceForPresentation，激活原 tab/叶；用原 foreground intent + show + presentManagedFocus。 | 跨 Space 仅切显示；不改 Session.spaceId 或控制抽屉显式 target。无 live renderer/失效 leaf/窗口变更不能假称物理 focus 成功；已改布局则 partial 并保留已知 pane target。 |
| pane split --pane --session --direction | 在原 pane 归属 Space 内，把给定**既有**目标插到当前叶旁；重用纯 split、MAX_PANES=4 和 SpaceService 写入。 | 不调用新 Shell splitPane。新 Session 必须属于同 Space（跨 Space focus 允许，跨 Space 搬 Session 不允许）。目标已显示优先明确拒绝/已存在无效果，保留现去重；不新增同 Session 多独立 Pane 产品要求。第三对象 C 必须显示 C，原 A/B 各一次；可保留原输入焦点（DESIGN允许）。 |
| pane resize --pane --ratio | 每次由稳定 Pane 定位最近父 split，确认 first/second；ratio 若指目标叶的份额，second 必须换成 1-ratio 再调旧纯函数。无父 split 明确不可 resize。 | 建议与真实 .15–.85 对齐，schema 拒绝超界；或者回显 requested/applied 的准确实际值。不能接收 .01 却声称已应用 .01。NaN/Infinity 在原 codec 即拒绝。path 仅内部瞬时结果，不能当永久 selector。 |
| pane close --pane | 捕获当前布局引用，调用同 owner detach，折叠空 split/group/tab；flush 后给原 pane/Session/Space 和 detached 事实。 | 最后显示也不 stop、不 archive、不删 Session；之后 session.get/terminal.get 仍查原运行，CLI stop 仍要明确 runtime。旧 ID 再用应 not found，不自动找“最近相似”对象。 |

这些建议均可在现有 response target、phase listed/read/completed、effect 和 data 中表达，不需要增加第二协议或先增加 phase。最终字段与 attach/focus 行为需 Root 在派单前固定；不把命令名之外未定的返回数据当已发布合同。

### 4. 风险、反例与可观察断言

**实际关键反例（001，exit0，未修改源码）：** 直接通过 Node 26 类型擦除导入纯 terminal/layout.ts，无编译产物、helper 或 UI。现已有 A/B 叶时，再调用 split(A,row,B) 得 [A,B,B]；插入 C 则 [A,C,B]。当前 GUI split 的“新 Shell 唯一 runtime”避免这一前提，但未来 CLI 若直接拿既有 Session 套旧 helper，会重复旧对象。因此新业务必须先检查目标重复/归属/当前树；建议断言重复 split effect none、pane 数量与 Session/runtime/PID 均不变，第三 C 正例恰好 A/B/C 各一次。

同一探针真实 setRatio(.01)=.15、setRatio(.99)=.85；005 原 immutable CLI 接受 .1 grammar 后仅因无 instance 返回 TARGET_REQUIRED，而非 ratio-invalid，证明 wire/UI 范围确实不同。没有把该探针说成当前 pane CLI 已可执行。

其余建议必须覆盖：

- capture→scope/flush 期间 Pane 被关闭、重排、重开或 runtime 换代：按原稳定 ID/捕获 tuple 拒绝过期，不能用旧 first/second 改另一个 split。
- attach 并发两次：同一 Session、同一次持久显示 ID、同一原 runtime，spawn count 不变；不通过另造多 Pane/input owner 化解。
- 跨 Space focus 到 B：selectedSpace=B，Session.spaceId 仍 B，明确输入 target 仍是调用前所选 A；UI 下拉若不可见必须显示 scope/归属或禁发（Ticket LOG028）。停/删目标同样不静默换目标。
- 已停止/缺失 Session：停止/恢复显示只给记录/状态，缺引用准确 not-found；不自动 reserveManaged/launch/resume 替代 attach。
- 最后 Pane 关闭：布局空态正确、原后台仍运行，重新 attach/reopen 是明确动作，旧 ID 不能阴魂复用。
- dirty GUI resize/rename 与 CLI split/close 并发：复用 flush/merge；真实冲突保留本地与已提交远端并回执失败，不能整图覆盖或“成功”但回读旧图。
- 失效 UI 叶、隐藏/断开 renderer、多个窗口：只用捕获窗口/leaf/doc/textarea 的原 presentation receipt；不全局 querySelector 后 focus 另一个窗口；焦点失败与已落盘布局副作用分别回执。
- ratio 边界/嵌套 second leaf：实际渲染、store、pane list 一致；“目标叶份额”和“父 first ratio”不能混淆。
- 提交前取消 effect none；admit 后只取消观察，不自动撤销或重放已落盘布局。落盘成功但窗口 focus 失败须 partial/准确 target，断线未知用 unknown 并提示先 list/get。复用原 Router/Host 完整 envelope 预算；不要把 T08 completed-input receipt 规则错误套到 pane mutation。

### 5. 最小写集修订建议与唯一 owner

现 Ticket09 的通配已覆盖 core/workspace、services/control、workspace-service、UI workspace/AgentWorkspacePage/control、i18n/styles/docs-agent-workbench、main.js/styles.css。下列是准确的**缺项或需显式分配的既有闭包**，仅建议 Root 改原 Ticket/Map/Goal 后再实现：

| owner 建议 | 最小文件/组 | 理由/是否现写集外 |
| --- | --- | --- |
| P：canonical/Rust CLI | src/shared/native/control-schema.json；src/shared/native/control-wire.generated.ts；native/pty-server/src/control/wire_generated.rs | 六 availability、pane.list 参数/ratio 精度及同源生成。三条都在现 T09 写集外；generated 不手改。 |
| P | native/pty-server/src/control/cli.rs；native/pty-server/tests/control.rs | pane.list 默认 Space、--pane 帮助、显式 pane/session 不被环境/焦点重写。写集外。 |
| P | test/fixtures/native/control-v1.json；src/shared/native/control-wire.test.ts；test/native/control-protocol.test.ts；native/pty-server/tests/control_protocol.rs | shared raw fixture、TS/Rust 边界/生成一致性回归；写集外。 |
| P | docs/agent-workbench-cli.md | 真实命令/能力/阶段/ratio/关闭只显示说明；写集外。 |
| B：布局/业务唯一 owner | src/modules/agent/core/workspace/model.ts、ops.ts/ops.test.ts；可在此现目录加小纯 pane 查询/身份 helper | metadata Pane ID、normalize、唯一活动索引、去重；已在通配内。不要另造 layout manager。 |
| B | src/modules/agent/services/workspace-service.ts 及就近测试；src/modules/agent/services/control/commands.ts、router.ts、paging.ts 及就近测试 | capture/commit/flush/effects/六 handler、稳定分页 revision、真实 CLI 场景；已覆盖，router/paging 仅按实际必要变更。 |
| B | src/modules/agent/services/workspace-store.ts、workspace-store-spaces.test.ts；services/spaces/space-service.ts、layout-merge.ts 及相关 tests；services/spaces/records.ts（仅若格式验证需变） | 当前 draft、跨 Space 同一 writer、metadata 保存/merge兼容；这些 store/spaces 路径不全在当前 workspace-service*.ts 通配内，需增补。 |
| U：GUI/显示唯一 owner | src/modules/agent/services/controller.ts；src/modules/agent/ui/terminal/TerminalTabView.tsx 及其 DOM tests | 新 Pane port 对接原 foreground/show、稳定 data-pane-id、真实 ratio/焦点/关闭呈现。两条核心都在现写集外。 |
| U | ui/workspace/WorkspaceLayout.tsx、AgentWorkspacePage.tsx、ui/control/TerminalControlPanel.tsx 及对应 DOM tests；agent/i18n.ts | GUI/CLI同布局、scope与显式target、空态/键盘/窗口，不改已有操作能力；已在现通配内。services/workspace-view.ts 仅在真实缺 view-port 时条件增补。 |
| U/Root | scripts/obsidian-acceptance/agent-workbench-panels.mjs（拟新）；docs/agent-workbench.md | 用户真实 Obsidian 步骤与稳定生产 probe；已列写集。 |
| Root | main.js/styles.css、必要 notices/bundle-budget 等 | build/root integration 唯一 owner；main/styles已列，budget/notices 只在真实产物差异需要时补明确路径，不预先任意放宽。 |

生成器与 control codec/Host/helper 当前均可复用，**不建议为了面板操作预先增加其产品写权限**。若采用 leaf ID 备选或统一 ratio 常量，才条件补 core/terminal/layout.ts 及 terminal-core.test.ts；不能在 metadata 方案下把整片 terminal 渲染/输入无谓改写。Controller/WorkspaceStore 不应被 P 与 U/B 同时写。建议顺序是 Root 先固定 pane 身份/生命周期/ratio/list/部分回执的小合同；P 冻结 canonical 后，B 完成并冻结实际 service port，U 独占 controller/renderer接线，Root 串行生成产物与全局验证。可并行的是不相交测试/UI部分，不能通过删资源锁或新 DTO 绕过真实共享路径。

### 6. 后续适用验证（本次未执行，不写成通过）

1. 单元：core/workspace/ops、terminal-core、pane metadata normalize/去重/close/reopen；WorkspaceService 稳定 ID/attach/splitExisting/ratio/关闭最后叶；workspace-store-spaces 的 dirty/append/flush conflict 用例；ControlCommands/Router 的 scope/capture/预算/partial/unknown。原就近文件可扩，未必要新建整套 harness。
2. 协议：generator --check，既有 TS/Rust 同 raw fixture，Rust control CLI parse 对 pane.list Space hint、foreign pane/session、数值/enum/重复flag/过长ID/额外字段的实际正反例；capabilities/help/schema 与六实际 handlers 一致。缺能力期间继续 available=false。
3. DOM：现 AgentWorkspacePage.dom、WorkspaceLayout.dom、TerminalTabView.dom、TerminalControlPanel.dom、router-foreground.dom、workspace-service-foreground.dom 与 keyboard-scope/shortcuts。重点测试原确认/抽屉焦点返回、跨 Space 显式target、renderer丢失/多窗口/隐藏/取消后不复活焦点，以及 ratio在UI回调与CLI回读一致。
4. 真 native CLI：复用 services/control/control-native.test.ts 的真实 NativeHost/PtyHelper/SpaceService/store/Router/Commands 和隔离目录 fixture，显式冻结并记录**两个 binary env/argv/SHA**；六 pane操作顺序、第三C、不重spawn、close后原PID存活、query/stop活性。Fake transport 只测边界，不代替该组合；无需再次触 Pi 模型才能证明纯 pane API。
5. 本轮八个 probe 只证明已有纯函数/grammar现状，不是新T09实现测试。根 build/lint、生成物/预算/适用i18n样式由实际写入后按 testing 选择；本次都未跑。
6. 用户真实 Obsidian：按原 Ticket V08 的宽>=960/600–959/<600、亮暗、200%缩放/减少动效、真实主窗口/专注叶与GUI/CLI相互回读。仍留用户，不伪造截图；PAGE001/003、DESIGN digest `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab` 保持。

### 7. 外部机制与采用理由

R01/R02/R03/K06 本地 reference-notes/reference-sources 是 2026-10-25 原研究，活动分别有 2026-10-23 Herdr commit、2026-04-16 Wave release、2026-10-24 tmux commit，均在两年窗口；固定 commit/许可/依赖摘要与来源 SHA 在本轮 sources-complete.json。不是本轮新跑外部产品测试，也不把网页没显示的日期假称本次重新核验。

- 本轮重新打开 [Herdr 固定 LICENSE](https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/LICENSE) 确认 Apache-2.0；其 runtime/registry 与面板分离机制继续引用本地 R01 固定研究。采用运行独立于显示思路；不引入 ratatui/Ghostty/Tokio UI或 vendor 代码，HUHU close-view 仍是 detach。
- 实读 [Wave focusblock](https://raw.githubusercontent.com/wavetermdev/waveterm/97e560027f494d20fed347b2d6b72b6bcb3e50e0/cmd/wsh/cmd/wshcmd-focusblock.go)：该文件标 Apache-2.0，以 block ID 经 tab 路由发焦点命令并设有限期限。采用稳定目标与视图路由分离；保留 HUHU 的 Rust/Zustand/Obsidian，拒绝搬 Go/Jotai/SQLite 栈。
- 实读 [tmux Control Mode](https://github.com/tmux/tmux/wiki/Control-Mode)：pane ID 与 pane number 区分，命令结果有配对边界，输出事件分流。采用稳定寻址与结果/异步事件分开；不是新增 tmux 运行依赖，也不复制终端源码。
- 实读 [Wave v0.14.5](https://github.com/wavetermdev/waveterm/releases/tag/v0.14.5) 修复记录，保留本地 K06 对网页前进后退/复制尾空白/设置缺失的回归线索；不把外部修复当HUHU复现或扩进本次历史/网页迁移范围。

本次只借机制，无新增依赖、外部源码复制或许可声明改动。官方读取结果在 R/web/001–003，不以网页打开成功推导运行/性能通过。

### 8. 实际有限命令和关键 SHA

命令 raw/完整 env/SHA 在 R/commands，隔离 HOME/XDG/runtime 只在 R 内，未继承真实账号。实际 huhu 路径 `/tmp/huhu-t08-c-stage2-linux-20261026T080715Z/huhu` SHA `923ac2d6fbc4f472537c73236040a487b8d991e4226aec81d5ebda488e995eee`；对应 helper SHA `f99ec633e2201d66ccd67605c65c709d6b25c443ec71978feff897fb27d315ca` 仅作 provenance，**没有启动**。

| probe | 实际 exit | 观察 |
| --- | --- | --- |
| 001 actual pure layout | 0 | duplicate/第三对象/ratio断言与原导出一致，无编译产物。 |
| 002 huhu --json schema | 0 | 六 pane 原定义都 available=false；保存完整descriptor。 |
| 003 huhu --json help | 0 | 原公共帮助/操作声明。 |
| 004 pane list 无context | 3 | TARGET_REQUIRED，candidates=[]，effect none；没有连真实实例。 |
| 005 pane resize --pane P --ratio .1 | 3 | grammar已接受，随后缺instance；不代表resize已实施。 |
| 006 ratio NaN | 2 | INVALID_ARGUMENT，effect none。 |
| 007 ratio 1 | 2 | schema超界，effect none。 |
| 008 split direction diagonal | 2 | enum拒绝，effect none。 |

关键当前源 SHA；其余含规范/Skill全部在 sources-complete.json：

| 文件 | SHA256 |
| --- | --- |
| `src/shared/native/control-schema.json` | `7583a7daba90fd889acecfb7cfc43c09d935811b94168da137e2859047d97671` |
| `scripts/generate-control-protocol.mjs` | `2c3c931c4bd27babd77386054a5513c0c11b118ac820d7d73679908b048b7f52` |
| `src/shared/native/control-wire.generated.ts` | `77f39b0934238a05b09c641fa47023cd1d022aa44c24244ce372e9eff24cc8b2` |
| `native/pty-server/src/control/wire_generated.rs` | `9e31826753ff7abe88e7461357bb07e4442d3e3f86401cef69bcb0cb2f3e659a` |
| `native/pty-server/src/control/cli.rs` | `676025a9d39e3f754f6b2a7543cea6d366cf97a83933f793e0dbf20a5713ae32` |
| `src/modules/agent/services/control/commands.ts` | `f3be6061aad02297f122d738db24d1f1da2d6d9587050645b042449b3e0132ac` |
| `src/modules/agent/services/control/router.ts` | `f20bd3a448f4dc6d8b0b139d51a5305ca6ebe89df372095befd0ce36e7bb685b` |
| `src/modules/agent/core/workspace/model.ts` | `a01440053e123ef09a85beb767732e5f3822b0084e25d0b1dfbd7a087757618a` |
| `src/modules/agent/core/workspace/ops.ts` | `d7e191afac0e92a9374cf7fabc1e841a7995f4277071430749f028f34f3ac037` |
| `src/modules/agent/core/terminal/layout.ts` | `b9b31b4c7af67d04b4b2843df1973d7eaf8ba6fe6ba811322e8a33ede8ea6994` |
| `src/modules/agent/services/workspace-service.ts` | `4ac850819ab7454891471d625960e6fd600946a512c0973567d6cf5d95885070` |
| `src/modules/agent/services/workspace-store.ts` | `ea30593109d884895bd0dc63fef4a257ee1b72059862a6947a833e5cc66fc307` |
| `src/modules/agent/services/spaces/space-service.ts` | `97b9a09a7a08ed6abbc783f8a6b1ec58eb4c7b370e16a1cc68e5040a95c55dd3` |
| `src/modules/agent/services/spaces/layout-merge.ts` | `06baad04a1741894e8d5dec412fbdd284768391e944a0a727475dd7f87942af1` |
| `src/modules/agent/services/controller.ts` | `6a4e343e60a3f23155f8b9238a0e384c8579ff4cb53182f31158273469c6d077` |
| `src/modules/agent/ui/terminal/TerminalTabView.tsx` | `7a7aa74f727596fc135e3bd9ac75d340e84841454c7fd9a6a938f8eb8d98eaec` |

## 问题与下一步

本只读准备无剩余工作。Root 已通知 T08 整票独立审查实际发现 helper retireSession/editor-closed 迟到时的本地映射回收缺口；本轮继续保持所有产品 STOP，没有改或测试修复。T09 真 native transport 验证必须等 T08 正式修复/独立回读后重新冻结最终 pair/源码，不能把当前输入当最终无缺陷能力。其余 Pane 身份、ratio、分页与 UI回执候选由 Root 在原规范/写集决定后落盘，无须再次询问用户；此报告只给实施依据，不抢 writer、不改 DoR、不推进票状态。

READ-ONLY SOURCE STOPPED — 原 B15 与全部产品保持 STOP；012 报告交回后不自动开始实现。
