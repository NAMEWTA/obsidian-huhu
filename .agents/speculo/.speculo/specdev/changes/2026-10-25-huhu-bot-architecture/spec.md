---
schema_version: 3
artifact: spec
change: 2026-10-25-huhu-bot-architecture
status: draft
ready_for_tickets: false
sources:
  - USER:LOG-017–024 独立规范、三协议、授权、恢复与删除
  - USER:LOG-030 完整 Spec 与现行工件一致
  - USER:LOG-032–035 首版完整多 Bot、协作工具、自动私有和确认全局记忆
  - CODE:66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93
  - ADR:ADR-001–026（012/015 已被替代）
  - USER:LOG-040 已确认 final 为唯一方案并要求固化文档
  - DESIGN:UI-001 已获设计确认；浏览器技术证据单独待补
  - USER:LOG-042 完整 Tickets、陌生功能先研究活跃开源、全 change 对齐
---

# HUHU Bot 首版规格

本文件是当前 change 的外部行为与验收权威。架构解释见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ARCHITECTURE.md</Path>，决策依据见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ADR.md</Path>。原始附件、历史 LOG 和 learning/01 保留原有时序，不是并行生效的合同；无需寻找 v1.0 才能实施本规格。

首版指 P1 完整交付，P0 是交付前的风险探针。当前已完成行为合同编写，产品尚未实现；UI 设计已由用户确认，整体仍因缺少可复核浏览器技术证据保持 draft；该技术状态不表示仍待选择方案。此状态不把已明确的多 Agent 或三协议需求降级为可选项。

实施就绪按 LOG-049 分支：本文件非 UI 外部行为已完整且由用户授权实施，T-01–19 依原 DAG/DoR 开工；UI 修复与最终整体验收仍受 P/S 门约束。全局 draft 不冒充 UI 技术或新摘要已获批准，也不改变任何 AC。

当前交付边界以 LOG-051 的最新 Goal 为准：完成全部 P1 代码、适用代码层检查和独立代码审查；真实模型、Obsidian 界面及用户环境的实际操作由用户后续验收。原产品行为/AC 不删减，未运行项如实记录且不阻塞本轮代码交付。

## 问题与目标

HUHU 当前有模块化工作台、CLI Agent/PTY、设置、通知和自动化；没有本规格的 Go Bot Runner、持久 Bot 目录、群聊协作和独立记忆。现有 `agent` 模块的 WorkspaceTab 不等于一个 Bot，通用设置存储也不能替代运行事务。

目标是让个人用户在现有 HUHU 工作台中完成以下任务：

- 选择或创建有独立人格、模型和记忆的 Bot，持续对话，并准确知道使用了哪些资料。
- 建立群聊，由协调者规划，或 @ 指定成员；看到成员的真实进度、阻塞、结果与费用。
- 让 Bot 发现和调用已有 Bot，必要时产生临时子执行；允许受控再委派，不要求为每次工作创建持久身份。
- 让各 Bot 自动维护自己的长期记忆，确认后才把内容写入 Profile 全局记忆；随时纠正、忘记和删除。
- 审批单笔记改写；在断线、取消、崩溃、重试时保留可解释状态，避免未知写入被自动重复。
- 后续 Web 能复用同一应用服务、状态和事件，P1 的内部业务不依赖 React、Obsidian 或 stdio。

成功以文末 AC 的可观察结果判定；“提示词要求了”“SDK 有此接口”“模型说完成了”均不是执行、授权或持久成功的证明。

## 解决方案与外部行为

### 1. 身份、启用与配置

一个 Vault 在本机绑定一个 Profile。Profile 是本机业务/配置域，Workspace 是资料授权域；复制 Vault 或 portable 不复制有效运行身份。UI 首次打开 Bot 才按需激活模块与 Runner；未启用/未激活时不预启动进程或模型连接。启用后的模块服务拥有运行生命周期，页面只是消费者。

首启创建一个稳定默认 Bot，用户可以改名、改描述、设人格和模型，再创建其他 Bot。普通导航、打开历史或编辑人格不触发模型调用。模型连接测试是明确动作，显示协议、endpoint 接收方与 modelId；不发送笔记、历史和记忆。无模型/缺凭证时保留配置草稿并解释缺项。

Bot 有不可复用 agentId、名称、用于发现的简述、PersonaRevision、ModelBindingRevision、允许工具/协作目标与可用状态。名称不是身份；重名可以显示 ID 后缀并要求选定，不凭模糊匹配执行。模型/人格改动生成修订，已受理 Run 固定其快照，新 Run 使用新修订。停用 Bot 阻止新派遣并先处理其活动任务；删除先预检关联会话、群成员和记忆，不连带删除其他 Bot。

创建持久 Bot 通过用户表单或“创建 Bot”提案确认。临时执行、转发消息、模型普通文字和一个含 `create` 的工具参数都不能自行证明用户要求永久新增身份。现有 CLI Agent 账号和 Bot 模型凭证互不自动继承。

### 2. 单聊、群聊与可见消息

Session 分为 direct/group。单聊选择一个 Bot；群聊选择已有成员并指定一个协调者，默认使用创建时选中的 Bot。协调者是角色，无额外权限。同一可见 Session 只允许一个活动前台根 Run；新发送遇忙返回 SESSION_BUSY，保留草稿并提供停止或等待，不默默排队成第二个收费意图。

群聊普通消息只唤醒协调者。用户 @ 一个或多个成员时，只调度这些成员；未 @ 的成员可见公共 transcript，但不会自动付费回复。@ token 绑定 agentId，解析结果在发送前可见；文字中恰好出现姓名不算定向指令。被 @ 的未知、停用或非成员目标在受理前拒绝并保留草稿，不静默改发协调者。

协调者可用工具制订任务、派遣、询问、汇总；其他成员使用同一工具。群聊由一个根 Run 拥有发送意图，多个成员回复作为该根的子执行，具备各自身份与状态。成员公共回复按服务端持久消息序号排序，任务卡显示来源/执行者/完成次序；并行执行不依赖 UI 收到 chunk 的先后决定权威顺序。

成员变更有 expectedRevision。新增成员只可见用户明确授予的群历史范围；UI 告知它会获得的上下文。移除成员立即阻止其后续新任务和群内结果投递，取消该群绑定的在途工作；旧回执仍可用于核查，不重新公开已撤权正文。协调者在活动根 Run 结束或停止后更换，避免在途汇总归属漂移。群内成员名单与调度策略分开。

历史分页可读，归档只是组织状态。编辑后重新发送创建新消息/Run，原记录保留并标关联。来源引用绑定发送时的内容修订和 originView；打开来源可显示“当前文件已变化”。不把隐含推理、SDK 私有日志或成员整段私聊作为群消息发布。

### 3. 协作工具与运行关系

持久 Agent、Session/工作线程、Delegation、Run 是四个不同身份。所有执行使用同一 Engine Port；引擎适配不拥有持久 Bot 创建、群权限或全局记忆批准。下列是本规格要求的语义工具名；实现生成 schema 后必须维持该语义，不能暴露绕过用例的 SDK 原生入口。

| 工具 | 输入与返回 | 执行合同 |
| --- | --- | --- |
| `agents.discover` | 查询/游标；返回 ID、简述、可用性、能力摘要、revision、nextCursor | 只列当前调用者可见且允许协作的身份，不返回人格正文、私有历史、凭证或记忆；空结果与读取失败分开 |
| `agents.message` | targetAgentId、关联任务、kind=notify/question/reply、显式内容；返回 messageId/投递状态 | notify 不自动形成新任务；question 的应答轮受同一根预算/次数/权限准入。投递不等于任务完成，不能把对方尚未执行的结果编造给用户 |
| `agents.delegate` | target=existing/temporary、已有 agentId 或临时配置、task、constraints、expectedOutput、ContextEnvelope；返回 delegationId/childRunId | 新工作线程隔离执行；不复用目标 Bot 的私聊上下文，不隐式新增持久 Bot；先持久受理再执行 |
| `tasks.get` / `tasks.list` | 受权任务 ID/根 ID、游标 | 返回持久状态、执行者、关系、可见结果和 unresolved 标记；不以内存 Promise 状态作权威 |
| `tasks.reply` | delegationId、结构化补充内容、expectedRevision | 只续接同一已授权任务线程；已终结任务的新工作产生新子 Run 并明确关联，不重开原终态 |
| `tasks.cancel` | delegationId、范围 | 停止该任务及其后代；不停止同一 Bot 的其他会话 |
| `agents.proposeCreate` | 名称、描述、人格、模型/工具请求 | 返回供用户确认的持久 Bot 草稿；未经用户确认不进入目录或取得权限 |

调用者/父 Run/权限由受信执行上下文注入，模型不能自报成另一个 Agent。工具描述说明“已有身份”和“临时执行”区别、何时选用、输入限制、返回状态和截断信息。Directory 摘要进入 prompt；较大目录通过分页发现，不把全量私有资料挤入系统提示词。

Delegation 固定 requesterAgentId、executorAgentId 或临时配置 ID、rootRunId、parentRunId、workThreadId、输入/结果范围、预算引用、配置修订、幂等身份和回执。相同工具调用的重复交付只得到原子任务；一次新的用户任务即使参数相同也是新意图，不能按任务正文 hash 吞掉它。

existing 目标取得自己的工作上下文与获准私有记忆；它不借用调用者私聊，也不能把自身更大权限传给本任务。temporary 目标使用任务级人格、能力和独立短期/任务记忆域，可落盘恢复；不继承所有 sponsor 长期记忆，只有 ContextEnvelope 显式传入且可外发的摘录。其结果可被持久 Bot 按来源规则学习，不能直接修改 sponsor 的记忆。

任一获准执行者均可再委派，包括子执行；不照搬参考项目一概禁止子代理派生的策略。应用层检查调用树深度、累计子任务数、并发、循环和预算；等待图不能形成 A 等 B、B 又等 A 的环。委派给同一 Bot 的新隔离线程并非必然循环，按真实任务关系判定。

默认限制作为首版可逆配置起点：调用树深度最多 3 层子执行、每根最多 32 个子任务、每根最多 4 个并发子执行、Profile 最多 8 个并发子执行，Agent 自动问答链最多 8 次消息唤醒。生效值由 `hello/service.status` 返回并写入根 Run 快照；排队不占模型并发槽。P0 在固定压力夹具下确认或收紧，任何调整必须更新 spec/协议夹具，不能以隐藏常量改变行为。这里是防无限扩张上限，非测得的性能保证。

### 4. 父子结果、费用、取消与恢复

子执行可以 queued/running/waiting_approval/blocked/terminal；对 UI 的状态投影从 Run 与 Delegation 派生，不维护另一套可矛盾的“任务完成库”。父 Run 等待子任务时为 waiting_children，模型可以让多个子执行并行，但写入仍逐项走 Broker。

根视图显示是谁派给谁、用哪些资料、正在做什么、需要谁处理和已返回结果。某个子任务失败后，协调者可说明失败并交付已有部分结果；不能暗中无限重试。新尝试有新 Run、retryOfRunId 和预算扣账。根 succeeded 要求没有活动后代、未决审批、dispatching/unknown 效果；失败/取消可以保留 effectsUnresolved，结果明确标“部分完成”。

所有主调用、子调用、协作问答、摘要、重试和记忆模型调用计入归属清楚的 usage 账本。根预算在并发请求前预留额度；已知 usage 结算并释放余量，Provider 不返回用量时保留 unknown/estimate，不显示零费用或声称精确美元封顶。达到预算/资源上限停止新调用并显示原因；不通过换模型、拆子任务或发消息绕开。

取消根 Run：提交取消屏障，停止本树新准入，传播所有已接纳后代；在途动作有界收尾，已发生写入不回滚。只取消某子任务时，其他同级可继续，父收到结构化取消结果。工具超时、网络断开、杀进程都不能直接推断“没有发生效果”。

崩溃恢复检查 Run 树、CP 兼容性、Grant、工具版本、任务投递回执和 Effect。已完成子结果按身份去重；对已 running 的树，安全核查通过后显示可恢复，等待用户点击，点击时再校验。accepted 的未领取意图继续扫描领取；waiting_approval 仍等待明确审批；已取消对象不因重启复活。

### 5. 记忆与上下文

| 层次 | 可读/可写规则 | 生命周期 |
| --- | --- | --- |
| 短期上下文 | agentId＋Session/工作线程隔离；由获准消息、来源、工作摘要组成 | 可为恢复持久化；压缩不自动生成长期事实 |
| Bot 私有长期记忆 | Bot 自动维护自己条目；用户可查看/纠正/固定/遗忘/暂停 | 有来源、修订、范围；自动来源条目随来源删除或撤权失效 |
| Profile 全局长期记忆 | 所有获准 Bot 可召回；Agent 的新增/修改/删除都先 proposal、用户确认 | 明确的独立内容和 scope；确认不等于发给所有 Provider 的通行证 |
| 临时任务记忆 | 临时执行独立命名空间，不直接修改持久 Bot | 随任务保留/删除，可恢复；不自动提升为持久身份或全局资料 |

“私有”限制 Bot 之间的直接访问，用户仍可管理自己的 Bot。普通 File/Vault/搜索工具不得绕过 Memory API 读取 Profile DB/Blob。协作只传递已选择消息、来源和获准摘录；结果发布到群聊、父任务或另一模型前再次检查来源与接收方。群公共 transcript 不构成所有成员私聊/记忆的合并库。P1 不另建自动群级长期记忆库；群长期规则可由成员私有且限定群范围的条目或用户确认的全局条目表达。

自动维护在已完成交互后产生可追踪的记忆作业，按来源 revision 去重。它使用所属 Bot 的模型与资料流向，另有明确的自动维护额度，计入 Profile 总账；设置中告知可能发生模型调用。额度未配置、用尽或自动维护暂停时不执行模型提炼，聊天结果仍成功，记忆页显示暂停原因。作业没有无限定时自唤醒，关闭模块即停止新作业；崩溃中已执行作业按同一手动恢复合同处理。

自动记忆记录区分观察/推断、来源、创建者和修订；并发更新按 expectedRevision 冲突处理，不按时间戳覆盖。人工固定项不能被自动维护静默改写；提出冲突候选供用户选择。用户纠正后形成新修订，旧版本不可继续召回。forget 使召回与索引失效并增加来源作业代数，禁止迟到作业重新创建同一被忘记事实；用户明确再次添加才产生新意图。

全局提案预览内容、来源、共享范围和目标修订。用户接受后一次事务提交条目/修订和确认回执；拒绝/过期/冲突不生效。原文变化需重新预览。Leader、工具参数或模型回复都不能代替用户确认。

### 6. 资料授权、模型与宿主

默认只使用用户明确附加的笔记/选区/资料。文件夹、全库分别授权；Grant 绑定资源范围、操作、接收方、适用 Bot/会话与撤销状态。所有搜索、索引/摘要、私有记忆召回、模型输入、子任务和结果投递均先过滤，不先处理全库再在界面隐藏。

每次发送固定 workspaceId、originClientId、originViewId、hostConnectionId、hostLeaseEpoch、SourceRef revision/hash。切换笔记/窗口不改变已受理资料；Host 离线或租约变化时停止宿主能力，不由 Go 偷偷直接写 Vault。给某个 Bot 的授权不自动扩展到其他 Bot/endpoint；传递资格是父范围、目标 Agent、目标模型接收方、任务和当前撤销状态的交集。

P1 三条协议分别必验：`openai-chat-completions`、`openai-responses`、`anthropic-messages`。ModelBinding 包含 providerId、protocol、endpoint、modelId、credentialRef、revision 和实际能力。不能用“兼容 OpenAI”推定 Responses 可用；不静默降级协议、换模型或 failover 到另一个接收方。上游适配器存在不等于取消/工具/恢复已通过。

Provider SDK、消息映射与 CP 编解码留在 Eino adapter。工具只通过 HUHU Broker 暴露；Provider 托管内建工具、任意远程 MCP、shell 或外部 Agent endpoint 不在 P1 范围。远端 response ID 可是适配元数据，不能成为读取本机历史的唯一前提。不同 Bot 可以绑定不同协议，委派仍通过同一用例与权限合同。

### 7. 写入、审批与未知结果

P1 支持单笔记创建/改写，必须预览目标、基线 revision、diff、资料来源和具体作用。用户审批绑定 effectId、参数摘要、能力版本、目标版本、策略和有效期。任一子 Agent 的审批也能在根任务视图处理，审批者仍为用户。

首个待审批效果出现后关闭该 Run 的后续效果准入。先安全写好不可变 CP，再用短事务发布 CP 引用、Approval、Run、Effect 和事件。拒绝、过期、取消解除等待但不执行该效果；模型可解释拒绝或提出另一个有明确新身份的动作。

批准与派发是两个时点：派发事务复查当前授权/取消/版本，Host 写前再检查真实内容和未保存编辑器状态。SOURCE_CHANGED、UNSAVED_EDITOR_CHANGES、Create 目标已存在时拒绝实际写入并要求重新预览。已有回执可复用；只有目标后置条件满足标 reconciled，不能冒充已收到原调用 committed 回执；完全不确定标 unknown_outcome。

Effect ID 随同一意图恢复保留。dispatching/unknown 必须先核查，不因 Retry、重连、取消或超时直接重发。核查事件可以在 Run 终态之后追加；终态编排结果不因此重开。

### 8. 原子受理、状态和事件

Run 合法状态为 accepted、preparing、running、waiting_approval、waiting_children、interrupted、recovering、blocked、canceling、succeeded、failed、canceled。所有非终态可取消。可恢复资格是恢复记录，不另造一套 UI 主状态。

StartRun 在认证、对象可见性和 schema 检查后，一笔事务优先读取 `profileId＋principalId＋method＋idempotencyKey` 回执；同输入返回原结果，异输入 IDEMPOTENCY_CONFLICT。随后校验 expectedRevision/Session 占用，同事务提交用户消息、根 Run、配置/资料引用、占用与修订、首事件和回执。唤醒丢失仍扫描 accepted。调用超时不能自动产生另一个 key。

FinalizeRun 在一笔事务保存完整或标注部分的助手消息、usage、终态事件并释放占用；磁盘满/提交失败不呈现“已保存成功”。模型网络、Host 调用和人工等待均不在 DB 事务内。子任务受理/结果投递也有各自原子回执和幂等身份。

每 Run 的事件先持久写入，再单调分配 seq 发布；内存广播仅唤醒。订阅使用数据库 cursor 尾读，初始补读和后续监听没有丢失窗口。重复按 runId＋seq/eventId 去重，乱序先补缺口；不能把更晚 chunk 当早期消息覆盖。CURSOR_EXPIRED 返回一致快照和 snapshotSeq；重建后应用后续事件。慢消费者有界断开，可重连续读。

订阅建立、分页、每次持续投递、快照和恢复都检查当前读权限；撤权后停止正文投递，客户端清理失效投影。子任务状态可汇入根事件作为引用，原子任务事件仍有自己 seq；客户端不可比较不同 Run 的 seq 大小来排序全局事实。

### 9. 公开接口与数据合同

TS 模块 `api.ts` 的 ServiceKey/BotClient、Go Application API 和 HAP wire schema 是三个边界。下表是待实现公共接口合同，尚无生成物；schema 必须落到 <Path>contracts/hap/v0.1/</Path>（规划路径）。客户端只传 DTO，不能传 Obsidian App、DOM、SQL 行、SDK 对象或 CP 字节。

| 方法组 | P1 方法 | 主要输入/结果与限制 |
| --- | --- | --- |
| 协议与服务 | `protocol.hello`、`service.health/status/diagnostics/shutdown` | 协议/构建/schema/能力/限制；仅受管 owner 可 shutdown，诊断脱敏 |
| Bot 与模型 | `agents.create/list/get/update/disable/deletePreview/delete`、`models.list/test/bind` | ID/revision、配置草稿、可用能力；创建需用户意图，删除需预检；不返回密钥 |
| 会话与成员 | `sessions.create/list/get/history/archive/updateMembers/setCoordinator` | direct/group、成员/协调者、expectedRevision、游标和范围；更换协调者需无活动根 Run |
| 运行 | `runs.start/get/subscribe/cancel/resume` | 幂等 key、意图、资料/配置、恢复代数；返回持久受理回执，绝不接收任意 CP |
| 协作 | `collaboration.discover/message/delegate/get/list/reply/cancel/proposeCreate` | 与工具的受信应用映射；普通客户端不能伪造运行中的模型身份 |
| 授权与审批 | `grants.list/create/revoke`、`approvals.list/get/resolve` | scope、接收方、预览摘要、expectedRevision/有效期；用户身份执行审批 |
| 记忆 | `memory.list/get/pin/correct/forget/setAutoMaintenance/proposeGlobal/resolveGlobal` | owner/scope/provenance/revision；提案未确认无召回资格；自动写接口只供受信工作用例 |
| 数据 | `sessions.deletePreview/delete`、`profile.deletePreview/delete/status`、`portable.export/importPreview/import` | 删除范围/保留项、预检 token、幂等回执、导入冲突；高权限用户动作 |
| Host | `host.attach/detach/invoke/queryReceipt` | 受信 Host 身份、能力租约、effectId 与受控资源引用；普通聊天连接无注册权 |

普通变更命令要求 commandId/idempotencyKey、profileId、commandEpoch、expectedRevision（适用时）。不可复用对象 ID 与 Profile 命令代数共同处理删除后重放：清除会话/记忆安全记录前增加命令代数，旧代数只返回 CONFLICT，不能重建已删除对象；活跃连接刷新后使用新代数。无破坏性 purge 的普通重试可查询原回执。Profile 清除关闭所有旧连接，重新安装获得新 Profile ID。

stdio 为 `u32 BE length + u8 kind + payload`，length 含 kind；P1 仅 JSON kind，采用 JSON-RPC envelope，请求 ID 字符串并分方向前缀。反向 host.invoke 返回同 ID 标准 response；无 ID 写通知不执行。hello 前业务请求拒绝。单帧 1 MiB、batch 至多 8 项为 P0 待测量冻结的候选值；超限立即明确拒绝，不静默截断，batch 各项独立并非事务。最终 schema/hello/夹具的值必须一致。

所有 opaque ID 为字符串，64 位 seq/revision 为十进制字符串，时间为 UTC RFC3339。SourceRef/ArtifactRef 表达资源，绝对路径不授予权限。错误为 JSON-RPC code＋`data.kind/reason/retryable/correlationId`；用户提示不含密钥/完整 prompt/私有正文。

本规格沿用已选错误 kind：INVALID_ARGUMENT、NOT_FOUND、CONFLICT、SESSION_BUSY、RUN_TERMINAL、IDEMPOTENCY_CONFLICT、CAPABILITY_DENIED、APPROVAL_EXPIRED、HOST_UNAVAILABLE、SOURCE_CHANGED、UNSAVED_EDITOR_CHANGES、MODEL_UNAVAILABLE、RESOURCE_LIMIT、UNKNOWN_EFFECT、RECOVERY_BLOCKED、INSTANCE_CONFLICT、PROTOCOL_INCOMPATIBLE、CURSOR_EXPIRED、STREAM_SLOW_CONSUMER。协作循环/预算/深度用 RESOURCE_LIMIT 的 reason 区分，成员/记忆写权限用 CAPABILITY_DENIED，不通过新增随意字符串形成第二错误体系。`retryable:true` 不等于准许重放写效果。

### 10. 本机数据、清除与迁移

Profile SQLite 是 Bot/Persona、会话、任务、运行、记忆、Grant/Approval/Effect、事件和回执的业务权威；CP/Blob 只由 DB 引用，Vault 是用户笔记权威。业务数据位于 OS 非同步根，路径规则见 ARCHITECTURE §10；共享 binaries 不放进单 Profile 清除范围。一个实际 DB 身份仅一个写者，不能用不同 path/symlink 启动两个进程。

默认保留历史，停用/卸载保留本机数据。永久删除先预检，再以短期预检 token/修订提交确认；范围改变时重新预检。存在活动任务先停止/收尾，禁止删除与继续派发竞争。无未决效果时删除会话正文、任务上下文/CP、仅归此来源的 Blob、自动记忆、摘要/索引、受管日志副本和自管备份中的内容；共享 Blob 根据仍有效引用处理。

自动条目跟随来源删除。人工固定或用户已确认全局条目在预检中逐条列出，用户选择保留或删除；保留时创建独立内容/范围，不能继续引用已删正文作为可召回依据。共享到其他会话的自动副本保留 provenance 并受传播清除；明确交付到 Vault 的笔记是用户内容，不被会话删除连带修改。

未知效果允许先清除正文，只留下 effect/command 身份、必要目标定位或受控指纹、状态、外部幂等/回执定位与核查证据；不能保留完整对话、正文或可继续执行 CP。UI 显示保留类别、原因与下一步。Profile 全清等待全部未决效果处理；核查完成后失效旧命令代数，再清除最小记录，不无限保存墓碑正文。

Profile 清除包括受管 DB/Blob/日志/自管备份与该 Profile 的凭证引用及独占秘密，解除绑定；共享 credential 先核对引用，不能删除其他 Profile 使用的秘密。清除中途失败保持受限状态，只可核查/重试清除，不能一边显示清除完成一边接受模型任务。范围不包含其他 Profile、用户导出、Provider 远端留存或 Vault 成果。

portable 明确选 Bot、人格、记忆和会话；冲突按 revision/hash 预览，不按 mtime 静默覆盖。成员/Agent/来源 ID 重映射，不导入有效 Grant/Approval、在途队列、CP、租约或秘密，导入后不自动执行任务。备份使用受支持一致流程及 Blob 清单/hash；迁移前停止新受理、处理在途、锁与备份，失败保留恢复路径。坏库不能覆盖为空库，不兼容 schema 拒绝旧 binary。

### 11. 生命周期、发行与未来客户端

页面关闭/隐藏、切换 Bot、Obsidian leaf 移动或客户端断线不取消 Run。Bot 模块停用、宿主退出、受管父 pipe EOF/失联进入统一有界关闭：停止新受理/派发，取消或持久中断，保存已知回执/unknown，关闭 DB 并释放锁。不能仅依赖 Obsidian 等待 async unload。强杀不证明效果结算成功，重启依持久事实核查。

binary 安装限定可信发布来源、目标平台、版本和校验，staging 后安全替换；失败保留可诊断旧版本，不回退 PATH 同名程序。启动使用明确环境 allowlist 和受控目录，不继承 CLI 密钥或 SDK 未配置环境回退。OS 密钥保护不可用时仅会话内存，明确显示不持久；原生跨平台行为须真实验证。

未来受管 Web 直接接同一个 Go Application API、RunExecutor、DB 和事件日志；可与 stdio 并存，不先要求独立常驻进程。网络入口显式启用、默认 loopback、配对/撤销和独立 Principal；读取权限不等于审批/Host 注册/清除权限。认证、Origin/CSRF/CORS/TLS/远程暴露由后续 Web 合同细化，P1 不启动 HTTP。Web Host 离线不绕回 Go 文件写入。P1 以可序列化 DTO/入口无关用例验证兼容性，不把原型窄屏宣称 Web 已交付。

### 12. UI 合同与设计绑定

设计规则归 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/DESIGN.md</Path> revision 2，UI-001/final 是用户在 LOG-040 确认的唯一界面；稳定选择 ID 保留 candidate-a。完整摘要与不可变确认快照见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/prototypes/UI-001/bindings.json</Path> 和同包 confirmation-final.md。其他候选不进入实现。

设计绑定：aa62a53b30d0ca32f03a5580be8ce5b4921b9c3c1767793b9173eadfde92dc6e；项目基线 DESIGN-0001 / ebaca5f2f15fe081bf393c892f8b6583d4f2c6ad12cd92cb55068005fe83a331；原型 UI-001 / 3c93a0c085cf3458148befdeb29ff445fe444601861c3bacb8dc9e421706444b。设计确认本身不授权启动产品代码实现。

| 页面 ID | 用户任务与状态 | AC |
| --- | --- | --- |
| BOT-CHAT | 左侧 Bot/群聊、单聊/群聊、附加与 @、流式、空/加载/失败/离线/恢复 | AC-005–008、AC-047–048、AC-051 |
| BOT-TASKS | 任务关系、既有/临时执行、等待/审批/失败/取消/结果/未知效果 | AC-010–017、AC-025–029、AC-049 |
| BOT-AGENT | 创建/编辑 Bot、模型/人格、停用与冲突 | AC-002–004、AC-023、AC-047 |
| BOT-MEMORY | 私有/全局/短期作用域、自动维护、来源、提案确认/纠正/遗忘 | AC-018–022、AC-050 |
| BOT-ACCESS | 附加范围、文件夹/全库授权、接收方、撤销和写入预览 | AC-022、AC-024–026、AC-031 |
| BOT-DATA | 删除预检、正文清除/最小记录、Profile 门禁、失败重试 | AC-038–041、AC-051 |

首版 UI 复用现有 Shell/token/控件，按叶子而非屏幕宽度响应；左侧为持久 Bot 与群聊，临时 sub-agent 仅在任务树。配置和记忆进入按需侧面板/页面，首屏主要是对话；无需常驻复杂任务墙。宿主状态条不再复制一条 Bot 状态栏。

## 验收合同

下列 AC 全属 P1，未来 Web 的约束由 AC-054 的兼容性探针覆盖，实际 Web 上线不混入 P1。表中 S1–S9 是下节定义的验证接缝；当前均为待实现验收，未宣称通过。

| ID | 前置条件 | 动作或事件 | 可观察结果 | 验证接缝 |
| --- | --- | --- | --- | --- |
| AC-001 | Bot 未激活、CLI agent 关闭 | 启动 HUHU 后再打开 Bot | 打开前无 Runner/模型请求；打开后 Bot 可独立配置和聊天 | S6/S8 |
| AC-002 | 已有默认 Bot | 用户创建、改名及生成临时任务 | 重启后持久 Bot 保留稳定 ID；临时任务不新增目录 Bot | S1/S2/S8 |
| AC-003 | Bot 正在运行 | 修改人格/模型并再发新任务 | 在途固定原修订，新任务使用新修订，冲突不覆盖 | S1/S2/S4 |
| AC-004 | Bot 有活动委派及群成员关系 | 停用或删除预检 | 阻止新派遣，说明并处置活动任务/数据；不删其他 Bot | S1/S2/S8 |
| AC-005 | 一个 Session 已有非终态根 Run | 用不同 key 再发送；用原 key 重试 | 新意图 busy 且草稿保留；原意图只返回原回执 | S2/S3/S8 |
| AC-006 | 群中 A 协调、B/C 成员 | 发送不含 @ 的消息 | 仅 A 自动回应；A 可派遣其他成员，公共 transcript 可追溯 | S1/S2/S4/S8 |
| AC-007 | 群有有效和无效 @ 目标 | 显式 @B，再发送含无效 token 的草稿 | 第一次仅 B 被调度；第二次受理前拒绝并保留草稿，不误发 A | S1/S3/S8 |
| AC-008 | 群任务进行中 | 移除成员、尝试改协调者 | 移除后无新派遣/正文投递并停止绑定工作；更换协调者需任务先结束 | S1/S2/S3 |
| AC-009 | 存在不可见、重名、停用 Bot | 发现/分页/选择目标 | 仅返回受权摘要；重名不猜测；无结果、失败、截断可区分 | S1/S3/S4 |
| AC-010 | A 派给已有 B | 同一工具交付重复两次 | 只受理一个委派/子 Run，有独立工作线程，未读取 B 私聊或新增身份 | S1/S2/S4 |
| AC-011 | 允许临时子任务 | 创建 temporary，再请求持久 Bot | 临时配置/上下文隔离可恢复；持久创建须用户确认明确意图 | S1/S2/S4/S8 |
| AC-012 | A/B 已有任务与消息工具 | notify/question/reply、重复投递 | 回执区分送达/应答/完成；问答受根限额，重复不无限唤醒 | S1/S2/S4 |
| AC-013 | 子执行可以再派遣 | 合法二次委派、循环/越深/越数量尝试 | 合法委派成功；其余 RESOURCE_LIMIT，未开始被拒的模型调用 | S1/S2/S4 |
| AC-014 | 并行子任务及有限额度 | 多个调用同时申请剩余额度 | 预算原子预留，额度不足停止新调用；总量可追踪，unknown 不计作零 | S2/S4 |
| AC-015 | 同级一个失败、另一个完成 | 协调者汇总或终结 | 展示部分结果及失败原因；有活动/未知效果后代时不能 succeeded | S1/S2/S8 |
| AC-016 | 一个 Bot 服务两棵调用树 | 取消其中根/一个子任务 | 仅指定树受屏障和取消；在途效果如实结算，无关树继续 | S1/S2/S4/S5 |
| AC-017 | 根/子运行中崩溃、部分结果已提交 | 重启核查、用户恢复 | 核查前不重派，安全后等点击，已完成子结果不复制；坏 CP blocked | S2/S4/S6 |
| AC-018 | A/B 以及 A 的两个工作线程 | 注入不同短期上下文、召回/压缩 | 不跨线程/Agent 混入私聊；摘要不无依据成为长期事实 | S1/S4 |
| AC-019 | 自动维护开启且有额度 | 完成聊天、提炼、重启、暂停维护 | 私有条目带来源/修订可读；重复作业去重、暂停后不发新模型请求 | S2/S4/S8 |
| AC-020 | Agent 提议全局增删改 | 未确认召回，随后确认/拒绝/冲突 | 未确认不可用；确认一次生效；拒绝/目标变化不写入 | S1/S2/S8 |
| AC-021 | 有自动条目、人工固定及迟到作业 | 修正/forget 后释放旧作业 | 新修订生效，旧索引失效；固定项不被自动覆盖，忘记项不复活 | S1/S2/S4 |
| AC-022 | B/不同 Provider 无来源授权 | 协作传递、记忆召回、摘要与群发布 | 在读取/外发前拒绝或过滤，不借 B 更大权限，不直接读另一 Bot 私有库 | S1/S3/S4 |
| AC-023 | 三条真实协议各有配置模型 | 流式、函数工具、审批/拒绝、取消、usage/error | 每协议独立证据；不静默换协议/endpoint，受控工具闭环成立 | S4 |
| AC-024 | 只附加两份资料 | 发送后切换笔记/窗口、请求全库、撤权 | 默认仅两份进入模型，origin/revision 固定；全库需新授权，撤权后过滤 | S4/S5/S8 |
| AC-025 | 模型或子 Agent 提议单笔记写 | 打开预览并批准/拒绝 | 目标/diff/来源明确；批准绑定确切效果，拒绝没有笔记修改 | S2/S5/S8 |
| AC-026 | 审批后源变化/未保存输入/Create 已存在 | 派发写入 | 拒绝实际写入且解释，重新预览后才能新审批 | S2/S5 |
| AC-027 | 可受理 Run/Delegation | 同 key 并发、异输入、提交后唤醒前崩溃 | 同输入一次提交、异输入冲突；扫描不丢消息/任务，终结失败不报保存成功 | S2/S3 |
| AC-028 | 一个响应含多个写工具 | 首个待审批与取消/批准竞争 | 准入门关闭，CP/票据原子可读；取消提交后无新派发资格 | S1/S2/S4 |
| AC-029 | 写成功但回执丢失 | 重连/取消/Retry/核查 | 不自动重复写；committed/reconciled/unknown 可区别，终态可收核查事件 | S2/S5/S8 |
| AC-030 | 补读时新事件产生、重复/乱序/慢消费 | 断线重连、过期游标、重建快照 | 不丢不重复最终状态；cursor 错误可恢复，跨 Run seq 不错误比较 | S2/S3 |
| AC-031 | 正在订阅有权正文 | 撤销权限再分页/持续投递/重连 | 服务端停止正文，客户端清理失效投影，快照不能绕过撤权 | S2/S3/S8 |
| AC-032 | Run 收尾时磁盘满/进程失败 | 提交终态 | 无虚假持久成功，重启依据旧事实核查，Session 不产生双占用 | S2/S6 |
| AC-033 | 多个可见页面与活动 Run | 关闭页面/模块/宿主或父 EOF | 页关闭继续；模块/宿主退出有界收尾，不依赖 async unload 被等待 | S6/S8 |
| AC-034 | 同 DB 有不同路径别名 | 启动两个独立 Runner | 第二写者 INSTANCE_CONFLICT，首实例和数据不被覆盖 | S2/S6 |
| AC-035 | 真实 TS/Go stdio 边界 | 分片/半帧/超限/非法 UTF-8/kind/JSON、反向请求 | 确定错误和关闭行为，stdout 无日志污染；hello 与 schema/类型一致 | S3/S6 |
| AC-036 | 模型超时、限流、工具/流中错误 | 调用与重试 | 原状态/部分内容保留且解释；只在已声明前提下重试，不跨目的地 | S4/S8 |
| AC-037 | 旧 schema、坏库和迁移失败 | 备份/升级/旧 binary 启动 | 一致备份可恢复；不兼容拒绝，坏库不初始化空库 | S2/S6 |
| AC-038 | 会话被复制到子任务/摘要/自动记忆 | 删除预检与正文清除 | 受管派生副本和旧作业同步失效；独立固定/全局条目按用户选择处理 | S2/S4/S8 |
| AC-039 | 存在未知写效果 | 删除正文、请求 Profile 全清、再完成核查 | 正文可删，仅列明最小记录保留；全清暂阻，核查后可清安全记录 | S2/S5/S8 |
| AC-040 | 全清过程可能失败，有旧连接/key | 清除、重连重放及新建 Profile | 失败不谎报；旧身份/代数不能复活数据；新 Profile ID 不同且不影响他者 | S2/S3/S6 |
| AC-041 | 导出含群聊、Bot 与记忆选择 | 导入重名/修订冲突包 | 预览冲突/ID 映射，权限重授，无秘密/有效审批/队列/CP且不自动运行 | S2/S3/S8 |
| AC-042 | OS 保护不可用/存在 CLI 环境密钥 | 配置与启动模型 | 明确会话内存模式；不自动继承，日志/HAP/CP/导出无秘密 | S3/S4/S6 |
| AC-043 | 下载损坏/平台不符/更新中断 | 安装或升级 binary | 不执行坏资产、不回退 PATH，保留诊断/兼容旧版本 | S6/S9 |
| AC-044 | 真实源码与依赖图 | 架构边界检查 | Domain/Application 无 SDK/SQL/Obsidian，跨模块只公开 API；fake/真实 Engine 同用例 | S1/S9 |
| AC-045 | 三协议/子任务/记忆作业有不同 usage | 查看 Run 树和诊断 | 可关联身份/修订/耗用、known/estimate/unknown，诊断不泄露私有正文 | S2/S4/S8 |
| AC-046 | 固定长历史/多任务/慢消费者夹具 | 测量启动、分页、取消/关闭与资源 | 记录环境/样本/指标，队列有界；无测量不宣称达到候选性能目标 | S2/S6/S8 |
| AC-047 | Bot/群聊/临时任务并存 | 左侧选择、搜索、创建和返回 | 列表只把持久身份当 Bot，选中/状态清楚，切换不重复执行，未保存表单有处理 | S7/S8 |
| AC-048 | 用户正在整理周报 | 附加、@、发送、展开计划和结果 | 主区对话清晰，资料/目标可见；审批前没有“已写入”，流式与保存状态分开 | S7/S8 |
| AC-049 | 同时存在既有/临时子执行 | 展开任务、查看审批、局部取消/恢复 | 父子身份/状态/结果可辨，操作范围明确，未知效果有核查入口 | S7/S8 |
| AC-050 | 私有与全局记忆、待确认提案 | 切 scope、纠正/忘记/确认 | 作用域、来源、自动/人工状态可见；确认前不显示全局已生效 | S7/S8 |
| AC-051 | 空/加载/失败/离线/权限不足/恢复状态 | 重试、关闭、返回、删正文 | 有上下文的下一步，保留草稿/有效数据，不用无限 spinner 或假成功代替 | S7/S8 |
| AC-052 | 叶子宽 1440/800/390、长中文、200% 缩放 | 切布局/主题/打开抽屉 | 桌面内联、中屏覆盖、窄屏组合抽屉；无意横溢/遮挡，控件可达 | S7/S8 |
| AC-053 | 仅键盘/IME/reduced motion | Tab/Enter/Escape、弹层开关、输入与触屏模拟 | 焦点可见/返回触发点，不误发 IME，焦点不穿 modal，触区/语义合格 | S7/S8 |
| AC-054 | 两个 fake 入站客户端及 Host 能力接缝 | 并发同 Session、撤权、Host 离线 | 同一用例/DB决定 busy/幂等；普通客户端不能成 Host，离线不直写 Vault | S2/S3/S5 |
| AC-055 | 每个拟发行 OS/架构 | 真机/对应环境启动、TLS、DB、凭证、退出与宿主 smoke | 逐目标记录实际通过；未通过不列支持，不以交叉编译替代 | S6/S8/S9 |

## 范围

**IN：** 完整 P1 Bot 工作台、三个模型协议、单聊/群聊、统一协作工具、已有/临时执行、受控再委派、自动私有/确认全局记忆、资料授权、单笔记审批写、持久执行/事件/恢复、永久清除、portable、原生安装和平台验证。

**REUSE：** 现有 ModuleRegistry/ServiceKey、Shell/导航/懒页、共享 UI/token/i18n、Vault API、HUHU 设置中的界面偏好与 Profile 绑定；原生安装只在出现真实共用消费者时提取低层机制，PTY 的私有协议和进程策略保持原 owner。

**OUT：** P1 不交付 HTTP/Web 服务、LAN/公网、多用户租户、独立常驻、外部 Slack/邮箱消息、任意 shell、通用 MCP/Skill 市场、全库自动索引、跨设备运行同步、批量移动/删除笔记、通用长期 Task 平台、自动化/通知集成。当前 change 已授权产出设计、离线原型、完整实施 Tickets、Goal Plan 与参考材料；本轮不授权产品实现/提交/发布/永久知识写入。

## 验证策略

| 接缝 | 层级与触发 | 覆盖合同 | 现有先例或待建设入口 | Evidence 类型 |
| --- | --- | --- | --- | --- |
| S1 领域/用例 | fake Engine/Host、确定事件序列、并发/限制 | AC-002–022、028、044 | 新 Go domain/application 接缝；通过公共 command/query 观测，不按私有 getter 镜像测试 | 状态转换与返回结果 |
| S2 SQLite/任务事务 | 独立进程故障点、磁盘失败、并发命令、重启回读 | AC-002–022、025–034、037–041、045–046、054 | 新 Store/UoW/RunExecutor 合同套件；真实 SQLite，不能内存 fake 证明原子性 | 事务前后 DB/事件/回执及故障注入 |
| S3 HAP/事件 | 真实 TS/Go 编解码、stdio、schema fixtures/fuzz、权限续读 | AC-005、007–009、022、027、030–031、035、040–042、054 | 新 contracts/hap 和跨进程测试；当前没有可冒用的 Bot HAP 测试 | 双端夹具、进程输出与错误 |
| S4 三模型/协作 | provider fixture＋每协议真实 endpoint/model；检查实际工具 schema/prompt | AC-003、006、009–024、028、036、038、042、045 | Eino adapter 合同待建设；锁版后分别记录三协议调用 | 脱敏请求/响应、工具轨迹、usage、取消/恢复 |
| S5 Host/效果 | 假 Host 故障窗口＋真实 Obsidian Vault 编辑 | AC-016、024–026、029、039、054 | 新 Host Bridge；现有 <Path>src/host/obsidian/references.ts</Path> 仅事实参考 | 基线/结果 hash、可信回执或核查类型 |
| S6 原生生命周期 | 启停/EOF/kill/锁/安装/迁移/凭证故障 | AC-001、017、032–035、037、040、042–043、046、055 | <Path>src/modules/agent/platform/desktop/pty/binary.test.ts</Path>、<Path>src/host/desktop/private-mode.test.ts</Path> 提供先例；Bot 新入口单列 | OS/版本/进程和文件证据 |
| S7 原型 | UI-001/final 实际浏览器操作；390/1440 必验，再测 800；旧 A 地址仅核对同源 | AC-047–053 | P materialize/check-preview/browser.json；不调用真实 API | 本地 PNG、页面状态/键盘/console/离线记录 |
| S8 真实产品 | 真实 Obsidian 主路径、多窗口/leaf/Portal、关闭/重开 | AC-001–007、015、019–025、029、031、033、036、038–041、045–053、055 | <Path>scripts/obsidian-acceptance/workbench-probe.mjs</Path> 是现有接缝参考，需增加 Bot 场景 | 宿主操作和实际持久结果；不能由 DOM mock 代替 |
| S9 工程/发行 | 依赖图、schema生成、包体、i18n、发布资产/许可 | AC-043–044、055 | `pnpm test:architecture`、`pnpm test:i18n`、`pnpm test:docs`、`pnpm check:bundle`；<Path>test/release/release-artifacts.test.ts</Path> | 实际命令回执/目标资产，Go 检查新增 |

以上是实施验证计划，未运行的新接缝不记作通过。当前 `pnpm check:native` 面向 Rust PTY，不能替代 Go 编译/测试。纯文档阶段只运行适用工件/引用/原型检查；不为文档改动重建 main.js。

### 原验收输入归并

原输入的 HB-AC 系列在下表仅列原序号，避免误作另一组现行 AC；原件保持不变。

| 原输入 HB 验收序号（已停止维护） | 当前验收 |
| --- | --- |
| 旧序号 01/02/03 | AC-001–003、019–023 |
| 旧序号 04/05/06 | AC-022–026 |
| 旧序号 07/08/09/10/11 | AC-005、016–017、027–029、032 |
| 旧序号 12/13 | AC-030–033 |
| 旧序号 14/15/16 | AC-037–041 |
| 旧序号 17/18 | AC-035、042–044、055 |
| 旧序号 19 | AC-054（入口兼容）；实际 Web 后续另立合同 |
| 旧序号 20 | AC-010–022、028–029（P1 协作）；通用 MCP/Skills 后续 |

## 约束与风险

- **DEC-001：** ADR-001–011、013–014、016–027 继续有效（ADR-006 的断电持久部分由 ADR-027 修订）；ADR-027 含 LOG-133 的检查点语义；ADR-012/015 的旧范围已替代。架构分层是依赖/权威约束，不要求照抄参考项目目录、SDK 或数据库。
- **NFR-001：** Profile/Run/工具/模型/事件队列和日志都有配置可见的边界；事件 retention 只清可重建投影并明确 cursor 失效，不能偷偷删除用户历史。已删内容的自管备份不能重新注入。
- **NFR-002：** P0 固定场景测未激活增量、spawn→ready、分页/DOM、事件/WAL、并发任务和有界关闭。原输入 ready p95≤3s 只作为探针目标，尚未实测；报告区分 Provider 网络与本机开销，实施冻结阈值后更新测试合同。
- **NFR-005（持久性，ADR-027）：** Profile 为 WAL + synchronous=NORMAL。已提交事务在进程崩溃后保留；断电/OS 崩溃最坏丢失最近若干次提交，数据库回到更早的一致状态，Run 可能退回 queued 并自动重跑，已返回的 accepted 回执可能需以原幂等 key 重试。模型请求出站、Host 效果派发、凭据写入/删除、Profile/Session 外部清理之前的提交是 FULL 屏障，断电后不会遗忘可能已发生的外部动作。正常关闭先 fsync WAL 文件再关闭，因此全部已提交事务落盘。提交与关闭路径不做自动检查点或关闭检查点：COMMIT 后 WAL 不小于 256 KiB 时执行一次 TRUNCATE 检查点，有快照阻挡时不报错。
- **NFR-003：** 原生运行根、二进制、Profile、凭证和 Vault 的权限/清除 owner 分开；stdout 仅协议、stderr 有界脱敏；可观测性不以复制私有正文为默认方案。
- **NFR-004：** UI 所有生产文案经 t() 与 en/zh，中文设计文档不替代英文词典。响应式测 leaf 宽度、Portal 绑定 owner Document、隐藏不重建运行；离线原型不证明这三类宿主行为。
- **技术风险：** Eino 固定版本的 Responses 执行路径需要桥接/替换 adapter 内部实现才能满足同等工具/取消/恢复合同；不能因上游现成能力缺口降低三协议范围。Go/SQLite/凭证版本及支持平台必须由 P0 锁定并给真实证据。
- **参考限制：** Hana/OpenBot/OpenClaw/DeepSeek-Bot 只提供机制证据；它们的 Leader 权限、群自动回复、记忆范围、文件访问和重试语义不自动成为 HUHU 规则。

### 实施规划与开源参考

完整实施范围由 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/tickets-map.md</Path> 的 28 张票承接，55 条 AC 各有主责和必需接缝；covered 只表示纳入计划。跨票 Gate、Agent Team 与实现/review 模型偏好由 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/goal-plan.md</Path> 编排，不改变本规格的产品 Bot 行为或限额。陌生功能先检索近两年活跃、许可证明确的 GitHub 项目，比较机制、依赖、已知问题，再采用已验证设计；参考与限制见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path>，活动/许可摘要见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/reference-audit.json</Path>。直接改编遵守项目许可规则，不复制来源不明或不兼容代码。

当前 dev/ui 规则针对已实现模块；Bot 的 OS Profile 与客户端投影是已接受的新增例外，由 T-27 在实际集成时同步当前工程文档与 Skill，并重绑受影响票摘要。T-01/08/09/10 负责依赖与协议探针，T-27/28 负责平台/宿主验收；参考存在不能替代这些实证。

### 就绪条件与未决项

已通过用户回答关闭的产品范围：完整多 Bot 协作、持久/临时区别、自动私有记忆、全局确认、三协议、默认附加、手动恢复和清除规则。单协调者、显式 @ 只唤醒选中成员、既有 Bot 委派新隔离线程已落实在用户确认的 UI-001/final 中。

方案选择和 DESIGN 确认已经完成；正式基线已引用，无待选择的 UI 分支。当前唯一 P 技术缺口是可回读的浏览器环境/尺寸/状态/键盘与截图证据，用户确认不能替代这些未提供的观察。补齐后运行 check-preview/check-ready 与 S readiness；在此之前保持 ready_for_tickets:false，不重复索取相同设计批准。本轮按用户完整材料已等价覆盖合同先形成最终 Ticket 计划；控制器仍因源 Spec 未 Ready 阻止派单，不能把非 UI 票自身合同 ready 当成绕过入口门禁。

P0 的真实模型/平台/性能探针属于实施验收义务，当前未调用模型、未发行 binary。任何探针迫使修改外部行为/范围/安全合同，返回用户决定；可逆 adapter 实现与测量细节由实施者在本合同内选择。
