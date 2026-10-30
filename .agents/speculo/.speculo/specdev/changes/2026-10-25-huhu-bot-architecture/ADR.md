# HUHU Bot：change 内架构决策

本文件保存用户提交的设计中已明确的架构主张及本轮明确回答。`accepted` 表示作为本 change 的设计约束，不表示实现或永久知识已完成；LOG-029 的初版共识已由 LOG-033–034 扩展；最新外部行为与验收由本 change 的 spec.md 负责。用户已授权按当前代码全面重构规范；对范围和行为的新增取舍以逐轮回答为准。

原件和来源：<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/source.md</Path>。讨论与事实依据：<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/LOG.md</Path>。本文不改写永久 ADR。

## ADR-001: 模块化单体与业务所有权

**Status:** accepted
**Source:** LOG-001；SRC-001 §0、4、5、11；用户本轮提交并要求提炼的完整设计
**Supersedes:** none

### Decision

Go Runner 持有 Bot 业务状态；Obsidian 的 huhubot 模块只负责客户端投影、交互和宿主能力。保持一个仓库、一个 Go module、一个业务数据库；Bot 基础聊天独立于现有 agent/PTY。

### Context / Trade-off / Consequences

保留现有模块系统，避免再造 TS 后端或独立微服务。代价是需要维护跨进程合同与原生资产。

### Verification / Migration

验证关闭 agent 后 Bot 基础聊天仍可用；Bot 关闭后释放其进程、服务租约与监听器。

## ADR-002: 向内依赖与引擎边界

**Status:** accepted
**Source:** LOG-002；SRC-001 §4、6、8、13、16；用户本轮提交并要求提炼的完整设计
**Supersedes:** none

### Decision

Domain 保存业务不变量；Application 编排用例、事务与消费者 Port；Adapter 负责外部协议与实现；Bootstrap 只装配。Eino/EinoExt 限于 outbound/eino 子树，Domain/Application 不依赖 SDK 或 HAP DTO。

### Context / Trade-off / Consequences

采用源文已选择的分层；不额外引入通用 Repository 框架、Service Locator 或无消费者的空包。

### Verification / Migration

静态检查真实 import graph；fake Engine 与真实 Engine 使用同一应用用例；SDK 类型不得通过 any 逃逸。

## ADR-003: SQLite 权威与设备本地 Profile

**Status:** accepted
**Source:** LOG-003；SRC-001 §5.1、12；用户本轮提交并要求提炼的完整设计
**Supersedes:** none

### Decision

每个 Profile 的 SQLite 是业务事务权威，放在 OS 本地非同步数据根；Vault 正文仍归宿主。Markdown、UI store 和索引都是导入导出或投影，不能成为第二份消息/事件权威。

### Context / Trade-off / Consequences

这是对当前 huhu/.huhu 数据合同的 Bot 专用新增例外，不是已实现事实；接受的是本 change 的设计目标。代价是迁移、备份和卸载需显式说明。

### Verification / Migration

实施时同步 docs/data.md 与开发数据规则；验证一致备份、坏库不重建为空库、导入修订冲突和权限重新授予。

## ADR-004: 按实际数据库身份保持单写者

**Status:** accepted
**Source:** LOG-004；SRC-001 §0.1、2 A01、12.5、15.4；用户本轮提交并要求提炼的完整设计
**Supersedes:** none

### Decision

写锁绑定规范化实际数据根与数据库身份，不能按 Workspace 分片；别名、软链接和不同 Workspace 不能得到同库第二写者。数据库约束与 CAS 处理进程内竞争。

### Context / Trade-off / Consequences

单写进程不能替代事务并发保护；发现文件只是 locator。

### Verification / Migration

覆盖同库多路径、第二进程、过期发现信息与进程异常退出；验证锁顺序、属主和 schema 预检。

## ADR-005: 统一 HAP 语义与可替换传输

**Status:** accepted
**Source:** LOG-005；SRC-001 §6.1、10、15.3；用户本轮提交并要求提炼的完整设计
**Supersedes:** none

### Decision

HAP 使用版本化 JSON-RPC 语义，schema/fixtures 是共同权威；P1 framed stdio，多视图共用连接，第二独立进程返回 INSTANCE_CONFLICT。后续 IPC/HTTP 作为相同应用用例的入站适配。

### Context / Trade-off / Consequences

P1 不承诺跨进程 stdio attach。Go 领域对象、HAP DTO 和 React ViewModel 分开；传输切换不复制业务。

### Verification / Migration

验证双向请求、无 ID 写通知不执行、batch fixtures、hello 前拒绝业务、版本组合拒绝与生成漂移。

## ADR-006: 原子受理和终结

**Status:** accepted；断电持久部分由 ADR-027 修订
**Source:** LOG-006；SRC-001 §7、8、12.4；用户本轮提交并要求提炼的完整设计
**Supersedes:** none

### Decision

StartRun 在同一短事务保存幂等回执、用户消息、Run、Session 占用与首事件；终结事务同时保存最终消息、终态、事件并释放占用。每 Session 至多一个活动前台 Run，冲突返回 SESSION_BUSY。

### Context / Trade-off / Consequences

accepted 表示持久受理；模型返回不等于持久完成。使用应用层 UoW，不以多个 Service 独立提交模拟原子性。

### Verification / Migration

验证重复 key、异输入冲突、Session 竞争、提交后唤醒前崩溃、终结提交失败和恢复扫描；事务内禁止外部 I/O。

## ADR-007: 效果账本主导恢复

**Status:** accepted
**Source:** LOG-007；SRC-001 §7.3、9、13.5；用户本轮提交并要求提炼的完整设计
**Supersedes:** none

### Decision

外部效果以稳定 effectId 记录意图、派发和证据。无法证明结果时保留 unknown_outcome；重连、超时和 Checkpoint 都不自动授权重放。reconciled 只证明目标状态，committed 需要可信回执。

### Context / Trade-off / Consequences

Host 回执和笔记写入没有共同事务，不承诺天然 exactly-once。Retry 新建 Run；Resume 保留 Run/effect 身份并重验资格。

### Verification / Migration

覆盖写成功回执丢失、发送前崩溃、旧 epoch 响应、取消后未知效果、同资源跨会话冲突；不得通过换 Run 绕过核查。

## ADR-008: 审批、暂停门与派发竞争

**Status:** accepted
**Source:** LOG-008；SRC-001 §9.3–9.5；用户本轮提交并要求提炼的完整设计
**Supersedes:** none

### Decision

Checkpoint Blob 先就绪，再事务公布 Approval、Effect、Run 与事件；批准和实际派发各自校验并 CAS。P1 同 Run 副作用串行，出现审批意图立即关闭后续效果准入门。

### Context / Trade-off / Consequences

只加 mutex 不能覆盖一轮多个工具调用；批准不是执行回执，也不是未来同类调用的永久许可。

### Verification / Migration

验证批准/取消竞争、目标/策略/能力变化、过期审批及孤儿 Blob；取消提交后不得领取新派发资格，在途动作按真实结果结算。

## ADR-009: 先持久化再发布事件

**Status:** accepted
**Source:** LOG-009；SRC-001 §10.5–10.6；用户本轮提交并要求提炼的完整设计
**Supersedes:** none

### Decision

公开可续读事件先进入 run_events 再发布；内存发布只作唤醒。每 Run 使用单调 seq，客户端去重，断线从 cursor 有界补读，snapshotSeq 与快照来自一致短读。

### Context / Trade-off / Consequences

保留一套持久游标，避免内存流和数据库历史争夺权威；慢客户端不能拖住所有 Run。

### Verification / Migration

覆盖补历史/直播交界、丢唤醒、重复投递、慢消费者、过期游标和终态后效果核查事件。

## ADR-010: 执行生命周期归 Runner

**Status:** accepted
**Source:** LOG-010；SRC-001 §7、8.3、15.4；用户本轮提交并要求提炼的完整设计
**Supersedes:** none

### Decision

Run 使用 Runner 执行管理器拥有的 context；页面、连接和请求只拥有自身资源。P1 停用 Bot 或退出 Obsidian 时有界关闭受管 Runner，所有非终态可取消。

### Context / Trade-off / Consequences

取消意味着停止编排与阻止新派发，不能说明既有外部效果撤销；后续独立服务模式另定义进程 owner。

### Verification / Migration

验证页面关闭继续、模块停用收尾、退出 Obsidian 无隐形常驻、崩溃限速重启和 pending RPC 全部结束。

## ADR-011: 宿主资源按发起上下文绑定

**Status:** accepted
**Source:** LOG-011；SRC-001 §7.4、11.2–11.3；用户本轮提交并要求提炼的完整设计
**Supersedes:** none

### Decision

SourceRef 在发送时绑定 Workspace、发起视图、Host 租约及内容修订。Vault 操作只经 Host Bridge；改写先预览和批准，实际写前重验版本与未保存输入。

### Context / Trade-off / Consequences

宿主离线不得自动切到 Go 文件系统；Go 负责模型与计算，TS 负责必要且有界的宿主 I/O。

### Verification / Migration

验证焦点切换不改当前资料、旧 Host 回应被拒绝、UNSAVED_EDITOR_CHANGES、SOURCE_CHANGED、create 不覆盖现有笔记。

## ADR-012: 人格、记忆与迁移采用显式修订

**Status:** superseded
**Superseded by:** ADR-024（保留当时决定以供追溯，不再作为现行约束）
**Source:** LOG-012；SRC-001 §5、12.1–12.3、14.1–14.3；用户本轮提交并要求提炼的完整设计
**Supersedes:** none

### Decision

Persona 与手动记忆保存在 SQLite 并使用不可变修订；P1 只自动使用已固定的记忆。迁移通过显式导入导出，权限、有效审批、租约、运行队列和 CP 不随普通 portable 自动生效。

### Context / Trade-off / Consequences

Context 压缩不是新事实；forget 撤出召回与派生索引，不伪造历史从未发生。

### Verification / Migration

验证重启持久性、修订冲突、撤权索引失效、旧候选不复活及导出不含秘密；会话与 Profile 删除另见用户决定。

## ADR-013: 统一能力授权与分类扩展

**Status:** accepted
**Source:** LOG-013；SRC-001 §9.1、13.3–13.6、14.4、15.1；用户本轮提交并要求提炼的完整设计
**Supersedes:** none

### Decision

工具操作经同一 Broker，权限取用户、Agent、Session/Workspace、撤销、Provider 流向和预算的交集。Tool、Skill、MCP 和模板分别建模；安装或文本本身不授予执行权限。

### Context / Trade-off / Consequences

MCP 重新连接与写调用重放分开；无沙箱本地进程按高信任代码管理。所有重试、摘要与子 Agent 请求计入统一预算。

### Verification / Migration

实际枚举内建及 middleware/fork 工具路径；验证无透明写重试、模型覆盖不越权、数据外发目的地校验与父级预算。

## ADR-014: 凭证通过受保护提供方取得

**Status:** accepted
**Source:** LOG-014；SRC-001 §13、15.2；用户本轮提交并要求提炼的完整设计
**Supersedes:** none

### Decision

业务层只保存 credentialRef；Provider adapter 按需解析秘密。可靠 OS 保护不可用时使用会话内存，不静默明文落盘，也不默认导入 CLI 账号或全局 AI 环境。

### Context / Trade-off / Consequences

保护实现必须验证各平台行为，Electron 可解密不等于独立 Go 已可解密。

### Verification / Migration

检查 HAP/日志/CP/导出中无秘密，SDK 不从环境回退获取其他身份或 endpoint；验证缺 keyring 的明确降级。

## ADR-015: 分阶段扩展与现有模块归属

**Status:** superseded
**Superseded by:** ADR-023（保留当时决定以供追溯，不再作为现行约束）
**Source:** LOG-015；SRC-001 §0.2、11.4、18；用户本轮提交并要求提炼的完整设计
**Supersedes:** none

### Decision

先落地可靠单助手闭环，再扩展知识/MCP、深度工作与独立服务。Automations 保持触发/重试 owner，Bot 接受幂等执行并报告真实完成；Notifications 通过新的可判别目标跳转 Run。

### Context / Trade-off / Consequences

不把 runId 填进 terminalId 或伪造 automationId；不提前创建无消费者的 Task、HTTP 和插件市场包。Web 入口的兼容性由本轮新增设计展开。

### Verification / Migration

阶段分别验收；现有 agent、自动化与通知合同保持兼容，提交 accepted 不得上报任务 succeeded。

## ADR-016: 发行能力由实际证据声明

**Status:** accepted
**Source:** LOG-016；SRC-001 §3、16.3、17、18.1、19.2；用户本轮提交并要求提炼的完整设计
**Supersedes:** none

### Decision

工具链与依赖精确锁版；候选组合必须经构建、运行和安全合同验证后进入支持矩阵。五平台分别验收，已有 Rust helper 的证据不代表 Go Runner 通过。

### Context / Trade-off / Consequences

原报告版本仅作为候选输入，不沿用其未经本轮复验的已发布或性能结论。二进制校验、可信来源、协议/DB 兼容分开。

### Verification / Migration

覆盖真实宿主、TLS、取消、数据库、安装升级、坏资产、许可与源码来源；性能记录硬件和测量口径。



## ADR-017: 首版三个模型协议，适配与运行分开验证

**Status:** accepted
**Source:** LOG-018、LOG-023、LOG-027
**Supersedes:** none

### Decision

P1 同时支持 OpenAI Chat Completions、OpenAI Responses 和 Anthropic Messages；Provider 协议映射与 Agent 执行循环是两个接缝，均留在 Eino adapter 内。上游适配器存在不代表审批、取消和恢复已经满足。

### Context / Trade-off / Consequences

用户明确选择三协议，取代原输入仅一个真实 Provider 的首版范围。优先复用 EinoExt；Responses 路径有已定位的执行差异，不能因实现困难静默推迟。

### Verification / Migration

P0 对三协议分别验证文本/工具流、Broker 准入、审批、取消、CP 恢复、错误和 usage；适配路径及依赖图实际验证后锁版。

## ADR-018: 默认附加资料授权，范围与接收方共同约束

**Status:** accepted
**Source:** LOG-019
**Supersedes:** none

### Decision

默认只使用用户明确附加的资料；文件夹或全库访问由用户另授。授权覆盖读取及发送到选定模型目的地，检索、摘要、重试和未来委派都遵守相同范围。

### Context / Trade-off / Consequences

用户选择可扩展的显式授权体验，未选择默认全库访问，也未把首版限制为永远只能逐次附加。读取历史、订阅事件、审批和清除权限分别判断。

### Verification / Migration

覆盖无授权搜索、附加后焦点变化、撤销、切换 Provider/endpoint、持续事件订阅撤权及旧索引失效。

## ADR-019: 崩溃中断的执行由用户确认恢复

**Status:** accepted
**Source:** LOG-020
**Supersedes:** none

### Decision

原 running Run 崩溃后先核查 CP、效果、权限和配置；即使可安全恢复，也等待用户点击继续，再重新校验并 CAS。accepted 的持久意图扫描领取与原待审批流程保持各自合同。

### Context / Trade-off / Consequences

用户选择控制继续执行与潜在后续费用。自动检查可运行，模型和效果派发不能把检查通过当继续执行授权。

### Verification / Migration

测试无客户端点击时不发新模型请求或效果；点击与取消/撤权竞争，旧终态不复活。

## ADR-020: 删除正文与保留最小核查记录

**Status:** accepted
**Source:** LOG-021、LOG-024
**Supersedes:** none

### Decision

P1 提供单会话与本机 Profile 永久清除。仍有未决效果时允许删除正文，保留明确列出的最小核查/防重放记录；核查完成后可完整清除，不能把部分清除显示成全部抹除。

### Context / Trade-off / Consequences

用户选择同时支持内容删除与未决效果核查。会话正文、派生内容、人工独立记忆、交付到 Vault 的笔记及外部导出分别有清楚范围；整 Profile 清除不影响其他 Profile。

### Verification / Migration

覆盖活动 Run 收尾、CP/索引/备份删除传播、后台作业不复活、未知效果残留说明、删除中断恢复与旧身份/key 不重建。

## ADR-021: 多客户端共享统一应用入口，宿主能力独立

**Status:** accepted
**Source:** LOG-022、LOG-025、LOG-026
**Supersedes:** none

### Decision

Obsidian、未来 Web 与 CLI 通过各自入站适配进入同一个 Application API，使用相同用例、执行器和数据库。TS 模块 api.ts、Go 应用 API 与 HAP wire 是三个不同公共面；Web 访问与独立常驻模式分开。

### Context / Trade-off / Consequences

符合用户明确要求的高内聚、低耦合与未来 Obsidian 打开时 Web 可访问。统一出口使用窄接口组合而非巨大 Manager；Web 不自行取得 Host/Vault 能力。

### Verification / Migration

同一命令从不同 adapter 得到同一授权/幂等/状态结果；跨客户端竞争、撤权事件过滤、Host 离线和受管退出有合同测试。

## ADR-022: 受管进程退出不依赖宿主等待异步清理

**Status:** accepted
**Source:** LOG-026；ADR-010 的落地约束
**Supersedes:** none

### Decision

Runner 在插件请求 shutdown 之外，检测父 pipe EOF/受管父失联并自行进入有界关闭；宿主仍在时由 Supervisor 提供超时终止与重启限速。进程环境显式 allowlist，不能直接复用继承 process.env 的 PTY wrapper。

### Context / Trade-off / Consequences

当前 ModuleRegistry 的 disposeNow 明确不等待异步 unload；现有 PTY wrapper 是私有专用协议且继承环境。这里补齐 ADR-010 的必要实现约束，不声称宿主可等待所有落盘。

### Verification / Migration

验证正常停用、插件卸载、宿主强退、父 pipe 异常及退出期间外部效果未知；旧数据库和回执可恢复，停止后不遗留新派发。

## ADR-023: 同一引擎承载持久 Bot、临时子执行与群聊协作

**Status:** accepted
**Source:** LOG-032、LOG-033、LOG-035；用户明确将完整多 Agent 能力纳入首版
**Supersedes:** ADR-015 的首版单助手/群聊后置范围；其自动化与通知归属由本条保留

### Decision

P1 提供多个持久 Bot、单聊、群聊及基于发现/通信/派遣工具的协作。所有参与者共享 Engine Port、Broker、Run/Effect 和模型适配。Leader 仅为可指定的群聊协调者，不获得特殊引擎或更高权限。既有 Bot 派遣只创建子 Run/工作线程；临时 sub-agent 使用任务级配置，持久 Bot 新建需用户明确意图。

Application 增加窄 CollaborationAPI 与协作上下文；它持有委派/消息/回执及父子关系，execution 仍拥有 Run、取消与效果。群聊可见 transcript 与成员私有工作上下文分开。提示词负责选择与规划，真实工具负责验证和执行；支持有界再委派。

### Context / Trade-off / Consequences

增加首版实现量，但符合用户的核心产品形态。防止“Agent 等于 Run”“Leader 等于超级管理员”与任意读其他 Bot 记忆三种混淆。根调用树统一预算、深度、数量、并发、取消和恢复；不依赖 prompt 自觉遵守安全边界。目录只含可访问身份的描述与能力，不包含私有记忆/人格正文。

Automations 仍拥有触发/重试，Notifications 使用可判别目标；这两类集成为后续范围。已出现真实协作消费者，不再禁止首版有窄 Delegation 模型，但不提前建设通用 Task 平台。

### Verification / Migration

验证两 Bot 双向派遣、临时子执行与持久新建的差异；群聊 @、协调者替换、并行子任务、再委派/循环限制、重复投递、父子取消/崩溃恢复和跨模型资料流向。每个可见会话只有一个活动根 Run；同 Bot 的无关任务不被误取消。

## ADR-024: 自动私有记忆与人工确认的 Profile 全局记忆

**Status:** accepted
**Source:** LOG-032、LOG-034
**Supersedes:** ADR-012 的首版人工固定范围；修订、遗忘及导入安全合同继续有效

### Decision

各 Bot 的短期上下文按工作线程隔离，私有长期记忆可自动维护；用户可查看、修正、固定、遗忘和暂停自动维护。全局长期记忆在当前 Profile 内共享，Agent 的新增、修改和删除提议均需用户确认。私有记忆不能通过目录、通信、群聊或直接路径读取越权访问。

所有长期条目有 owner/scope、来源、修订和召回资格。自动提炼不被包装成人工确认事实；其质量可被用户纠正。来源派生权限限制召回与发布，授权撤销、删除和忘记会使旧作业/索引失效。临时 sub-agent 使用独立任务记忆，不自动合并到任何持久 Bot；其结果可由目标 Bot 在获准范围内提炼。

### Context / Trade-off / Consequences

自动记忆改善连续体验，同时引入来源传播、冲突和后台调用预算的义务。摘要不等于事实，全局可见也不等于允许发送给任意模型。用户明确固定/确认的独立记忆在删除预检中逐条选择保留或清除；自动来源记忆随来源删除。

### Verification / Migration

验证 A/B Bot 与群聊的隔离、全局写入未确认不可召回、并发修订、撤权后召回与投递过滤、forget 不复活、删除跨子任务/摘要/索引/备份传播。portable 不携带有效权限、审批、运行队列、租约、CP 或秘密；导入不启动协作或记忆作业。

## ADR-025: 左侧 Bot 目录与以对话为主的协作投影

**Status:** accepted
**Source:** LOG-032 的左侧 Agent List 要求；LOG-033 的单聊/群聊；LOG-040 对 final 唯一方案的确认；当前 HUHU Shell/UI 源码
**Supersedes:** none

### Decision

Bot 页面接入 HUHU 现有工作台，左侧列持久 Bot 和群聊；临时 sub-agent 出现在任务树中。对话中渐进展开计划、子任务、审批和恢复，记忆区区分私有/全局/临时上下文。UI 只投影应用权威，离开页面不取消任务。具体布局与交互以已获用户确认的 DESIGN revision 2 和 UI-001/final 为准。保留对话内协作摘要与独立任务页，其他候选的首页分栏和常驻右侧检查器不进入本次交付；批准证据归 UI-001/confirmation-final.md。

### Context / Trade-off / Consequences

继承 52px 图标轨、280px 默认侧栏、叶子宽度响应式与共享 token/组件。现有 AgentSidebar 的 WorkspaceTab/CLI 账号语义不能复用为 Bot 身份模型；不替换现有 CLI 工作台，不增加 Obsidian 叶子类型，也不将插件改成网页应用。

### Verification / Migration

通过 UI 原型检查桌面/窄屏、状态和键盘，再在真实 Obsidian 验证 Portal、owner Document、多窗口、隐藏/卸载和 Host 生命周期。离线原型不证明真实模型、调度、记忆或跨窗口验收。

## ADR-026: 陌生能力先核验开源机制，再实现

**Status:** accepted
**Source:** LOG-042；用户新增项目工程要求与完整 Tickets 请求
**Supersedes:** none

### Decision

对不熟悉的功能，先检索 GitHub 上执行日近两年内有维护活动、许可证明确的同类项目，比较实现思路、依赖、限制/已知问题，优先借鉴经过验证的设计。固定版本、原文件和采用/拒绝原因写入负责 Ticket 的 Evidence；不直接复制不兼容或来源不明代码。

### Context / Trade-off / Consequences

<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path> 与 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/reference-audit.json</Path> 提供本轮九仓核验，覆盖模型、协作、群聊、记忆、SQLite 和凭证。源码事实不等于运行通过，MIT/Apache 等项目许可也不自动覆盖每个传递依赖。已确认的 HUHU 权限、记忆和三协议合同优先，不照搬外部 Leader 权限或数据路径；不因调研引入新框架/服务。

### Verification / Migration

T-01/08/09/10 比较并锁定依赖，T-11–15 用既定合同验证协作/记忆，T-02/20/27 验证凭证/平台，T-27 更新实际分发许可声明。新的陌生点在写代码前补来源和限制；只有直接改编才记录源码对应与署名，不把纯学习写成已包含第三方代码。全部票与责任见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/tickets-map.md</Path>；本决策不授权实现或发布。


## ADR-027: Profile 数据库 WAL + synchronous=NORMAL，外部动作前设持久屏障

**Status:** accepted
**Source:** LOG-132；用户 2026-10-30 拍板“方案 B”
**Supersedes:** ADR-006 中“accepted 表示持久受理”的断电部分（原子性、单 UoW 与进程崩溃语义不变）

### Decision

Profile 数据库保持 WAL，连接级 `synchronous` 由 FULL 改为 NORMAL：普通 `WithinTx` 提交原子、有序、进程崩溃后仍在，但不各自刷盘。紧接外部非幂等动作之前的提交改用 `WithinDurableTx`：仅这一次提交以 FULL 提交（随后恢复 NORMAL，恢复失败则丢弃连接），WAL 刷盘覆盖整个文件，此前所有 NORMAL 提交一并落盘。屏障点：模型请求出站前的 attempt `dispatched`（含额度扣记）、Host 效果的 `ClaimDispatch`（`dispatching`）、凭据目录 `Reserve`（写 OS 密钥存储之前）与 `BeginDelete`（删除之前）、Profile 清除 `BeginCleanup`、Session 删除 `Delete`（外部清理之前）。迁移仍在默认 FULL 下完成后才切换；正常关闭的最后检查点会刷盘全部提交。798e1ba 的“观察提交”专用路径因此并入普通提交并删除。

### Context / Trade-off / Consequences

Windows Runner 上每次 FULL 提交一次 `FlushFileBuffers`（约 20–50ms）。一个 Run 的生命周期就有 Claim、PrepareAndMarkRunning、Finalize、ProducerEnded 四次写提交；32 个子任务的委派共 184 次写提交，串行在唯一连接上，超过 10 秒。NORMAL 下这些只写入 WAL；SQLite 保证 WAL+NORMAL 不会损坏，也不会乱序。

断电（或 OS 崩溃）时最坏丢失最后一个屏障/检查点之后的若干次提交，数据库回到更早的一致状态：
- 丢失 Claim 等生命周期推进时，Run 退回 queued，重启后由执行器自动重新领取并重跑。屏障保证此时没有已出站的模型请求或已派发的效果。
- 已有屏障（模型请求或效果已派发）的 Run 至少停在 running/dispatching，按 ADR-022/007 走 interrupted、unresolved 与用户继续，不会被当作未发生而盲目重跑。
- 进程内已返回给客户端的 accepted 回执、消息、终态或事件可能丢失；客户端以原幂等 key 重试会重新受理。界面可能短暂显示过此后被回退的状态。
- 凭据目录行先于密钥落盘，不会留下目录不知道的密钥；删除先落 `deleting=1`。

进程崩溃（含强杀）语义与 FULL 相同，不丢已提交事务。

### Verification / Migration

`TestDurableTxRaisesOnlyItsOwnCommit` 断言 WAL、普通提交为 NORMAL、屏障提交为 FULL、其后（包括屏障失败后）恢复 NORMAL。`TestExternalActionCommitsAreDurableBarriers` 解析源文件，断言上述六个屏障点各自只用 `WithinDurableTx`。既有恢复、效果账本、幂等与委派合同测试不改断言。无数据迁移：`synchronous` 是连接级设置，旧 Profile 下次打开即生效。
