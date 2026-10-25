# HUHU Bot 设计日志

来源 SRC-001：<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/inputs/HUHU-Bot_架构审核与工程设计规范_v1.1.md</Path>。本轮时间：2026-10-25，Asia/Taipei。源文明确的主张按用户“已设计好并要求形成 ADR”的请求提炼；这些决定尚未实现。用户后续允许重新构造规范，未明确改变的核心不变量继续沿用。

## LOG-001 — 2026-10-25 — 模块化单体与业务所有权

- **设计树节点：** D-101
- **轮次与依赖：** round 1 / 无；来自已提交设计。
- **状态：** confirmed
- **问题：** 模块化单体与业务所有权采用何种合同？
- **事实与来源：** 用户初始请求；SRC-001 §0、4、5、11。
- **选项：** 仅记录源文实际表达的选择与限制，不补造用户未考虑的方案。
- **推荐：** 沿用源文明确决定。
- **结论：** Go Runner 持有 Bot 业务状态；Obsidian 的 huhubot 模块只负责客户端投影、交互和宿主能力。保持一个仓库、一个 Go module、一个业务数据库；Bot 基础聊天独立于现有 agent/PTY。
- **原因：** 保留现有模块系统，避免再造 TS 后端或独立微服务。代价是需要维护跨进程合同与原生资产。
- **影响工件：** ADR-001、设计正文及相应术语。
- **约束或不变量：** 验证关闭 agent 后 Bot 基础聊天仍可用；Bot 关闭后释放其进程、服务租约与监听器。
- **后续：** 实施阶段验证；本轮没有执行产品实现。
- **替代/被替代：** 无。

## LOG-002 — 2026-10-25 — 向内依赖与引擎边界

- **设计树节点：** D-102
- **轮次与依赖：** round 1 / 无；来自已提交设计。
- **状态：** confirmed
- **问题：** 向内依赖与引擎边界采用何种合同？
- **事实与来源：** 用户初始请求；SRC-001 §4、6、8、13、16。
- **选项：** 仅记录源文实际表达的选择与限制，不补造用户未考虑的方案。
- **推荐：** 沿用源文明确决定。
- **结论：** Domain 保存业务不变量；Application 编排用例、事务与消费者 Port；Adapter 负责外部协议与实现；Bootstrap 只装配。Eino/EinoExt 限于 outbound/eino 子树，Domain/Application 不依赖 SDK 或 HAP DTO。
- **原因：** 采用源文已选择的分层；不额外引入通用 Repository 框架、Service Locator 或无消费者的空包。
- **影响工件：** ADR-002、设计正文及相应术语。
- **约束或不变量：** 静态检查真实 import graph；fake Engine 与真实 Engine 使用同一应用用例；SDK 类型不得通过 any 逃逸。
- **后续：** 实施阶段验证；本轮没有执行产品实现。
- **替代/被替代：** 无。

## LOG-003 — 2026-10-25 — SQLite 权威与设备本地 Profile

- **设计树节点：** D-103
- **轮次与依赖：** round 1 / 无；来自已提交设计。
- **状态：** confirmed
- **问题：** SQLite 权威与设备本地 Profile采用何种合同？
- **事实与来源：** 用户初始请求；SRC-001 §5.1、12。
- **选项：** 仅记录源文实际表达的选择与限制，不补造用户未考虑的方案。
- **推荐：** 沿用源文明确决定。
- **结论：** 每个 Profile 的 SQLite 是业务事务权威，放在 OS 本地非同步数据根；Vault 正文仍归宿主。Markdown、UI store 和索引都是导入导出或投影，不能成为第二份消息/事件权威。
- **原因：** 这是对当前 huhu/.huhu 数据合同的 Bot 专用新增例外，不是已实现事实；接受的是本 change 的设计目标。代价是迁移、备份和卸载需显式说明。
- **影响工件：** ADR-003、设计正文及相应术语。
- **约束或不变量：** 实施时同步 docs/data.md 与开发数据规则；验证一致备份、坏库不重建为空库、导入修订冲突和权限重新授予。
- **后续：** 实施阶段验证；本轮没有执行产品实现。
- **替代/被替代：** 无。

## LOG-004 — 2026-10-25 — 按实际数据库身份保持单写者

- **设计树节点：** D-104
- **轮次与依赖：** round 1 / 无；来自已提交设计。
- **状态：** confirmed
- **问题：** 按实际数据库身份保持单写者采用何种合同？
- **事实与来源：** 用户初始请求；SRC-001 §0.1、2 A01、12.5、15.4。
- **选项：** 仅记录源文实际表达的选择与限制，不补造用户未考虑的方案。
- **推荐：** 沿用源文明确决定。
- **结论：** 写锁绑定规范化实际数据根与数据库身份，不能按 Workspace 分片；别名、软链接和不同 Workspace 不能得到同库第二写者。数据库约束与 CAS 处理进程内竞争。
- **原因：** 单写进程不能替代事务并发保护；发现文件只是 locator。
- **影响工件：** ADR-004、设计正文及相应术语。
- **约束或不变量：** 覆盖同库多路径、第二进程、过期发现信息与进程异常退出；验证锁顺序、属主和 schema 预检。
- **后续：** 实施阶段验证；本轮没有执行产品实现。
- **替代/被替代：** 无。

## LOG-005 — 2026-10-25 — 统一 HAP 语义与可替换传输

- **设计树节点：** D-105
- **轮次与依赖：** round 1 / 无；来自已提交设计。
- **状态：** confirmed
- **问题：** 统一 HAP 语义与可替换传输采用何种合同？
- **事实与来源：** 用户初始请求；SRC-001 §6.1、10、15.3。
- **选项：** 仅记录源文实际表达的选择与限制，不补造用户未考虑的方案。
- **推荐：** 沿用源文明确决定。
- **结论：** HAP 使用版本化 JSON-RPC 语义，schema/fixtures 是共同权威；P1 framed stdio，多视图共用连接，第二独立进程返回 INSTANCE_CONFLICT。后续 IPC/HTTP 作为相同应用用例的入站适配。
- **原因：** P1 不承诺跨进程 stdio attach。Go 领域对象、HAP DTO 和 React ViewModel 分开；传输切换不复制业务。
- **影响工件：** ADR-005、设计正文及相应术语。
- **约束或不变量：** 验证双向请求、无 ID 写通知不执行、batch fixtures、hello 前拒绝业务、版本组合拒绝与生成漂移。
- **后续：** 实施阶段验证；本轮没有执行产品实现。
- **替代/被替代：** 无。

## LOG-006 — 2026-10-25 — 原子受理和终结

- **设计树节点：** D-106
- **轮次与依赖：** round 1 / 无；来自已提交设计。
- **状态：** confirmed
- **问题：** 原子受理和终结采用何种合同？
- **事实与来源：** 用户初始请求；SRC-001 §7、8、12.4。
- **选项：** 仅记录源文实际表达的选择与限制，不补造用户未考虑的方案。
- **推荐：** 沿用源文明确决定。
- **结论：** StartRun 在同一短事务保存幂等回执、用户消息、Run、Session 占用与首事件；终结事务同时保存最终消息、终态、事件并释放占用。每 Session 至多一个活动前台 Run，冲突返回 SESSION_BUSY。
- **原因：** accepted 表示持久受理；模型返回不等于持久完成。使用应用层 UoW，不以多个 Service 独立提交模拟原子性。
- **影响工件：** ADR-006、设计正文及相应术语。
- **约束或不变量：** 验证重复 key、异输入冲突、Session 竞争、提交后唤醒前崩溃、终结提交失败和恢复扫描；事务内禁止外部 I/O。
- **后续：** 实施阶段验证；本轮没有执行产品实现。
- **替代/被替代：** 无。

## LOG-007 — 2026-10-25 — 效果账本主导恢复

- **设计树节点：** D-107
- **轮次与依赖：** round 1 / 无；来自已提交设计。
- **状态：** confirmed
- **问题：** 效果账本主导恢复采用何种合同？
- **事实与来源：** 用户初始请求；SRC-001 §7.3、9、13.5。
- **选项：** 仅记录源文实际表达的选择与限制，不补造用户未考虑的方案。
- **推荐：** 沿用源文明确决定。
- **结论：** 外部效果以稳定 effectId 记录意图、派发和证据。无法证明结果时保留 unknown_outcome；重连、超时和 Checkpoint 都不自动授权重放。reconciled 只证明目标状态，committed 需要可信回执。
- **原因：** Host 回执和笔记写入没有共同事务，不承诺天然 exactly-once。Retry 新建 Run；Resume 保留 Run/effect 身份并重验资格。
- **影响工件：** ADR-007、设计正文及相应术语。
- **约束或不变量：** 覆盖写成功回执丢失、发送前崩溃、旧 epoch 响应、取消后未知效果、同资源跨会话冲突；不得通过换 Run 绕过核查。
- **后续：** 实施阶段验证；本轮没有执行产品实现。
- **替代/被替代：** 无。

## LOG-008 — 2026-10-25 — 审批、暂停门与派发竞争

- **设计树节点：** D-108
- **轮次与依赖：** round 1 / 无；来自已提交设计。
- **状态：** confirmed
- **问题：** 审批、暂停门与派发竞争采用何种合同？
- **事实与来源：** 用户初始请求；SRC-001 §9.3–9.5。
- **选项：** 仅记录源文实际表达的选择与限制，不补造用户未考虑的方案。
- **推荐：** 沿用源文明确决定。
- **结论：** Checkpoint Blob 先就绪，再事务公布 Approval、Effect、Run 与事件；批准和实际派发各自校验并 CAS。P1 同 Run 副作用串行，出现审批意图立即关闭后续效果准入门。
- **原因：** 只加 mutex 不能覆盖一轮多个工具调用；批准不是执行回执，也不是未来同类调用的永久许可。
- **影响工件：** ADR-008、设计正文及相应术语。
- **约束或不变量：** 验证批准/取消竞争、目标/策略/能力变化、过期审批及孤儿 Blob；取消提交后不得领取新派发资格，在途动作按真实结果结算。
- **后续：** 实施阶段验证；本轮没有执行产品实现。
- **替代/被替代：** 无。

## LOG-009 — 2026-10-25 — 先持久化再发布事件

- **设计树节点：** D-109
- **轮次与依赖：** round 1 / 无；来自已提交设计。
- **状态：** confirmed
- **问题：** 先持久化再发布事件采用何种合同？
- **事实与来源：** 用户初始请求；SRC-001 §10.5–10.6。
- **选项：** 仅记录源文实际表达的选择与限制，不补造用户未考虑的方案。
- **推荐：** 沿用源文明确决定。
- **结论：** 公开可续读事件先进入 run_events 再发布；内存发布只作唤醒。每 Run 使用单调 seq，客户端去重，断线从 cursor 有界补读，snapshotSeq 与快照来自一致短读。
- **原因：** 保留一套持久游标，避免内存流和数据库历史争夺权威；慢客户端不能拖住所有 Run。
- **影响工件：** ADR-009、设计正文及相应术语。
- **约束或不变量：** 覆盖补历史/直播交界、丢唤醒、重复投递、慢消费者、过期游标和终态后效果核查事件。
- **后续：** 实施阶段验证；本轮没有执行产品实现。
- **替代/被替代：** 无。

## LOG-010 — 2026-10-25 — 执行生命周期归 Runner

- **设计树节点：** D-110
- **轮次与依赖：** round 1 / 无；来自已提交设计。
- **状态：** confirmed
- **问题：** 执行生命周期归 Runner采用何种合同？
- **事实与来源：** 用户初始请求；SRC-001 §7、8.3、15.4。
- **选项：** 仅记录源文实际表达的选择与限制，不补造用户未考虑的方案。
- **推荐：** 沿用源文明确决定。
- **结论：** Run 使用 Runner 执行管理器拥有的 context；页面、连接和请求只拥有自身资源。P1 停用 Bot 或退出 Obsidian 时有界关闭受管 Runner，所有非终态可取消。
- **原因：** 取消意味着停止编排与阻止新派发，不能说明既有外部效果撤销；后续独立服务模式另定义进程 owner。
- **影响工件：** ADR-010、设计正文及相应术语。
- **约束或不变量：** 验证页面关闭继续、模块停用收尾、退出 Obsidian 无隐形常驻、崩溃限速重启和 pending RPC 全部结束。
- **后续：** 实施阶段验证；本轮没有执行产品实现。
- **替代/被替代：** 无。

## LOG-011 — 2026-10-25 — 宿主资源按发起上下文绑定

- **设计树节点：** D-111
- **轮次与依赖：** round 1 / 无；来自已提交设计。
- **状态：** confirmed
- **问题：** 宿主资源按发起上下文绑定采用何种合同？
- **事实与来源：** 用户初始请求；SRC-001 §7.4、11.2–11.3。
- **选项：** 仅记录源文实际表达的选择与限制，不补造用户未考虑的方案。
- **推荐：** 沿用源文明确决定。
- **结论：** SourceRef 在发送时绑定 Workspace、发起视图、Host 租约及内容修订。Vault 操作只经 Host Bridge；改写先预览和批准，实际写前重验版本与未保存输入。
- **原因：** 宿主离线不得自动切到 Go 文件系统；Go 负责模型与计算，TS 负责必要且有界的宿主 I/O。
- **影响工件：** ADR-011、设计正文及相应术语。
- **约束或不变量：** 验证焦点切换不改当前资料、旧 Host 回应被拒绝、UNSAVED_EDITOR_CHANGES、SOURCE_CHANGED、create 不覆盖现有笔记。
- **后续：** 实施阶段验证；本轮没有执行产品实现。
- **替代/被替代：** 无。

## LOG-012 — 2026-10-25 — 人格、记忆与迁移采用显式修订

- **设计树节点：** D-112
- **轮次与依赖：** round 1 / 无；来自已提交设计。
- **状态：** confirmed
- **问题：** 人格、记忆与迁移采用显式修订采用何种合同？
- **事实与来源：** 用户初始请求；SRC-001 §5、12.1–12.3、14.1–14.3。
- **选项：** 仅记录源文实际表达的选择与限制，不补造用户未考虑的方案。
- **推荐：** 沿用源文明确决定。
- **结论：** Persona 与手动记忆保存在 SQLite 并使用不可变修订；P1 只自动使用已固定的记忆。迁移通过显式导入导出，权限、有效审批、租约、运行队列和 CP 不随普通 portable 自动生效。
- **原因：** Context 压缩不是新事实；forget 撤出召回与派生索引，不伪造历史从未发生。
- **影响工件：** ADR-012、设计正文及相应术语。
- **约束或不变量：** 验证重启持久性、修订冲突、撤权索引失效、旧候选不复活及导出不含秘密；会话与 Profile 删除另见用户决定。
- **后续：** 实施阶段验证；本轮没有执行产品实现。
- **替代/被替代：** 无。

## LOG-013 — 2026-10-25 — 统一能力授权与分类扩展

- **设计树节点：** D-113
- **轮次与依赖：** round 1 / 无；来自已提交设计。
- **状态：** confirmed
- **问题：** 统一能力授权与分类扩展采用何种合同？
- **事实与来源：** 用户初始请求；SRC-001 §9.1、13.3–13.6、14.4、15.1。
- **选项：** 仅记录源文实际表达的选择与限制，不补造用户未考虑的方案。
- **推荐：** 沿用源文明确决定。
- **结论：** 工具操作经同一 Broker，权限取用户、Agent、Session/Workspace、撤销、Provider 流向和预算的交集。Tool、Skill、MCP 和模板分别建模；安装或文本本身不授予执行权限。
- **原因：** MCP 重新连接与写调用重放分开；无沙箱本地进程按高信任代码管理。所有重试、摘要与子 Agent 请求计入统一预算。
- **影响工件：** ADR-013、设计正文及相应术语。
- **约束或不变量：** 实际枚举内建及 middleware/fork 工具路径；验证无透明写重试、模型覆盖不越权、数据外发目的地校验与父级预算。
- **后续：** 实施阶段验证；本轮没有执行产品实现。
- **替代/被替代：** 无。

## LOG-014 — 2026-10-25 — 凭证通过受保护提供方取得

- **设计树节点：** D-114
- **轮次与依赖：** round 1 / 无；来自已提交设计。
- **状态：** confirmed
- **问题：** 凭证通过受保护提供方取得采用何种合同？
- **事实与来源：** 用户初始请求；SRC-001 §13、15.2。
- **选项：** 仅记录源文实际表达的选择与限制，不补造用户未考虑的方案。
- **推荐：** 沿用源文明确决定。
- **结论：** 业务层只保存 credentialRef；Provider adapter 按需解析秘密。可靠 OS 保护不可用时使用会话内存，不静默明文落盘，也不默认导入 CLI 账号或全局 AI 环境。
- **原因：** 保护实现必须验证各平台行为，Electron 可解密不等于独立 Go 已可解密。
- **影响工件：** ADR-014、设计正文及相应术语。
- **约束或不变量：** 检查 HAP/日志/CP/导出中无秘密，SDK 不从环境回退获取其他身份或 endpoint；验证缺 keyring 的明确降级。
- **后续：** 实施阶段验证；本轮没有执行产品实现。
- **替代/被替代：** 无。

## LOG-015 — 2026-10-25 — 分阶段扩展与现有模块归属

- **设计树节点：** D-115
- **轮次与依赖：** round 1 / 无；来自已提交设计。
- **状态：** confirmed
- **问题：** 分阶段扩展与现有模块归属采用何种合同？
- **事实与来源：** 用户初始请求；SRC-001 §0.2、11.4、18。
- **选项：** 仅记录源文实际表达的选择与限制，不补造用户未考虑的方案。
- **推荐：** 沿用源文明确决定。
- **结论：** 先落地可靠单助手闭环，再扩展知识/MCP、深度工作与独立服务。Automations 保持触发/重试 owner，Bot 接受幂等执行并报告真实完成；Notifications 通过新的可判别目标跳转 Run。
- **原因：** 不把 runId 填进 terminalId 或伪造 automationId；不提前创建无消费者的 Task、HTTP 和插件市场包。Web 入口的兼容性由本轮新增设计展开。
- **影响工件：** ADR-015、设计正文及相应术语。
- **约束或不变量：** 阶段分别验收；现有 agent、自动化与通知合同保持兼容，提交 accepted 不得上报任务 succeeded。
- **后续：** 实施阶段验证；本轮没有执行产品实现。
- **替代/被替代：** 无。

## LOG-016 — 2026-10-25 — 发行能力由实际证据声明

- **设计树节点：** D-116
- **轮次与依赖：** round 1 / 无；来自已提交设计。
- **状态：** confirmed
- **问题：** 发行能力由实际证据声明采用何种合同？
- **事实与来源：** 用户初始请求；SRC-001 §3、16.3、17、18.1、19.2。
- **选项：** 仅记录源文实际表达的选择与限制，不补造用户未考虑的方案。
- **推荐：** 沿用源文明确决定。
- **结论：** 工具链与依赖精确锁版；候选组合必须经构建、运行和安全合同验证后进入支持矩阵。五平台分别验收，已有 Rust helper 的证据不代表 Go Runner 通过。
- **原因：** 原报告版本仅作为候选输入，不沿用其未经本轮复验的已发布或性能结论。二进制校验、可信来源、协议/DB 兼容分开。
- **影响工件：** ADR-016、设计正文及相应术语。
- **约束或不变量：** 覆盖真实宿主、TLS、取消、数据库、安装升级、坏资产、许可与源码来源；性能记录硬件和测量口径。
- **后续：** 实施阶段验证；本轮没有执行产品实现。
- **替代/被替代：** 无。

## LOG-017 — 2026-10-25 — 独立重构规范

- **设计树节点：** D-001
- **轮次与依赖：** round 1 / 无。
- **状态：** confirmed
- **问题：** v1.1 未展开的 v1.0 需求/验收是否继续继承？
- **事实与来源：** 用户本轮明确回答，原文如下。

> 你就把这份文档当成一个全新的文档，可以进行全面的优化、重改、重构，对不清晰的内容进行全面的清理清除。

- **选项：** 该轮实际问题及用户自由文本回答；未选建议不视为决定。
- **推荐：** 以当前文档形成独立合同，不推定缺失旧条款。
- **结论：** 用户要求把文档当成全新文档，可全面优化、重改、重构，全面清理不清晰内容；原文件仍按初始请求原样保留。
- **原因：** 以用户明确选择为合同。
- **影响工件：** 新设计正文、ADR、CONTEXT、设计树。
- **约束或不变量：** 待验证技术事实不标为通过；D-002 和 D-005 的后续问题独立保存。
- **后续：** 按本轮结论收敛正文；待决项继续访谈。
- **替代/被替代：** SRC-001 与本结论冲突的部分由本结论取代；原件不变。

## LOG-018 — 2026-10-25 — 首版模型服务覆盖

- **设计树节点：** D-002
- **轮次与依赖：** round 1 / 无。
- **状态：** confirmed
- **问题：** P0/P1 首先兼容哪些 Provider？
- **事实与来源：** 用户本轮明确回答，原文如下。

> 先兼容openAI 和Anthropic。你现在有的这个架构里面，应该有这种模型适配层吧？应该可以直接去拿取使用吧

- **选项：** 该轮实际问题及用户自由文本回答；未选建议不视为决定。
- **推荐：** 优先复用实际可用适配器，按真实协议分别验收。
- **结论：** 首版同时兼容 OpenAI 和 Anthropic；优先利用现有模型适配层及 EinoExt，具体 OpenAI API 范围另由 D-006 澄清。
- **原因：** 以用户明确选择为合同。
- **影响工件：** 新设计正文、ADR、CONTEXT、设计树。
- **约束或不变量：** 待验证技术事实不标为通过；D-002 和 D-005 的后续问题独立保存。
- **后续：** 按本轮结论收敛正文；待决项继续访谈。
- **替代/被替代：** SRC-001 与本结论冲突的部分由本结论取代；原件不变。

## LOG-019 — 2026-10-25 — 默认资料授权

- **设计树节点：** D-003
- **轮次与依赖：** round 1 / 无。
- **状态：** confirmed
- **问题：** 首版默认允许模型读取和外发哪些资料？
- **事实与来源：** 用户本轮明确回答，原文如下。

> 默认只使用明确附加的资料；可另授文件夹或全库权限

- **选项：** 该轮实际问题及用户自由文本回答；未选建议不视为决定。
- **推荐：** 仅明确附加资料；文件夹/全库另行授权。
- **结论：** 默认只使用明确附加的资料；可另授文件夹或全库权限。
- **原因：** 以用户明确选择为合同。
- **影响工件：** 新设计正文、ADR、CONTEXT、设计树。
- **约束或不变量：** 待验证技术事实不标为通过；D-002 和 D-005 的后续问题独立保存。
- **后续：** 按本轮结论收敛正文；待决项继续访谈。
- **替代/被替代：** SRC-001 与本结论冲突的部分由本结论取代；原件不变。

## LOG-020 — 2026-10-25 — 崩溃后恢复策略

- **设计树节点：** D-004
- **轮次与依赖：** round 1 / 无。
- **状态：** confirmed
- **问题：** 原 running Run 崩溃后，安全核查通过是否自动继续模型调用？
- **事实与来源：** 用户本轮明确回答，原文如下。

> 核查通过后等待用户点击恢复

- **选项：** 该轮实际问题及用户自由文本回答；未选建议不视为决定。
- **推荐：** 等待用户点击恢复。
- **结论：** 核查通过后等待用户点击恢复；已约定的 accepted 扫描领取与 waiting_approval 流程保持各自语义。
- **原因：** 以用户明确选择为合同。
- **影响工件：** 新设计正文、ADR、CONTEXT、设计树。
- **约束或不变量：** 待验证技术事实不标为通过；D-002 和 D-005 的后续问题独立保存。
- **后续：** 按本轮结论收敛正文；待决项继续访谈。
- **替代/被替代：** SRC-001 与本结论冲突的部分由本结论取代；原件不变。

## LOG-021 — 2026-10-25 — P1 永久清除

- **设计树节点：** D-005
- **轮次与依赖：** round 1 / 无。
- **状态：** confirmed
- **问题：** P1 是否提供本机数据永久清除？
- **事实与来源：** 用户本轮明确回答，原文如下。

> P1 提供永久清除；涉及未决效果时再细化删除约束

- **选项：** 该轮实际问题及用户自由文本回答；未选建议不视为决定。
- **推荐：** 提供单会话和整 Profile 清除，并澄清未决效果约束。
- **结论：** P1 提供永久清除；涉及未决效果时继续细化删除约束。默认长期保留，停用/卸载保留数据。
- **原因：** 以用户明确选择为合同。
- **影响工件：** 新设计正文、ADR、CONTEXT、设计树。
- **约束或不变量：** 待验证技术事实不标为通过；D-002 和 D-005 的后续问题独立保存。
- **后续：** 按本轮结论收敛正文；待决项继续访谈。
- **替代/被替代：** SRC-001 与本结论冲突的部分由本结论取代；原件不变。

## LOG-022 — 2026-10-25 — 按当前项目解耦并统一对外入口

- **设计树节点：** D-008
- **轮次与依赖：** round 1 / 无。
- **状态：** confirmed
- **问题：** 架构优化的方向和未来客户端兼容边界是什么？
- **事实与来源：** 用户本轮明确回答，原文如下。

> 注意一下，你这份架构文档也需要根据当前项目的实际代码情况，进行相关的调整、优化和升级，只要能满足核心的功能需求就可以了。
> 
> 说白了，就是要做到高内聚、低耦合，层级关系清晰，相关的领域架构和分层关系也清晰。这样便于扩展，也便于之后开发时设计模式的使用。
> 
> 举个简单的例子，比如领域层、应用层、适配层，以及对外提供服务的统一出口。因为未来我不只要支持 Obsidian 的访问，可能还会支持 Web 端（即 Obsidian 打开之后，Web 端也能进行访问）。这些都是未来可能会支持的，所以你就得设计好解耦和兼容性的问题。

- **选项：** 该轮实际问题及用户自由文本回答；未选建议不视为决定。
- **推荐：** 统一应用用例出口；协议、传输和 Host 能力分离。
- **结论：** 用户要求根据实际代码调整、优化和升级，只要满足核心需求；领域层、应用层、适配层和统一对外出口清晰，高内聚低耦合；预留 Obsidian 打开时 Web 访问。
- **原因：** 以用户明确选择为合同。
- **影响工件：** 新设计正文、ADR、CONTEXT、设计树。
- **约束或不变量：** 待验证技术事实不标为通过；D-002 和 D-005 的后续问题独立保存。
- **后续：** 按本轮结论收敛正文；待决项继续访谈。
- **替代/被替代：** SRC-001 与本结论冲突的部分由本结论取代；原件不变。



## LOG-023 — 2026-10-25 — 三协议都是首版硬要求

- **设计树节点：** D-006
- **轮次与依赖：** round 2 / D-002。
- **状态：** confirmed
- **问题：** OpenAI 首版是否包含 Responses？
- **事实与来源：** 用户本轮明确回答。

> 首版同时支持 Chat Completions、Responses 和 Anthropic Messages

- **选项：** 以本轮真实问题与回答为依据。
- **推荐：** 原建议先交付两协议；用户明确选择三协议，本决定优先。
- **结论：** 首版同时支持 Chat Completions、Responses 和 Anthropic Messages。
- **原因：** 用户明确选择。
- **影响工件：** ADR-017、新设计第 1/7/14 节。
- **约束或不变量：** 已确认设计与尚未执行的技术验收分开。
- **后续：** 完成正文及工件一致性检查后，确认整体共识。
- **替代/被替代：** 前轮相关开放问题已由本条关闭；原始文件保留。

## LOG-024 — 2026-10-25 — 未知效果允许删正文，保留最小记录

- **设计树节点：** D-007
- **轮次与依赖：** round 2 / D-005。
- **状态：** confirmed
- **问题：** 有未知效果时允许怎样的永久删除？
- **事实与来源：** 用户本轮明确回答。

> 可删正文，保留最小安全记录；核查完成后可完整清除

- **选项：** 以本轮真实问题与回答为依据。
- **推荐：** 正文和核查依据分开；部分清除如实说明。
- **结论：** 可删正文，保留最小安全记录；核查完成后可完整清除。
- **原因：** 用户明确选择。
- **影响工件：** ADR-020、新设计第 10/14 节。
- **约束或不变量：** 已确认设计与尚未执行的技术验收分开。
- **后续：** 完成正文及工件一致性检查后，确认整体共识。
- **替代/被替代：** 前轮相关开放问题已由本条关闭；原始文件保留。

## LOG-025 — 2026-10-25 — 将 HanaAgent 源码学习纳入本 change

- **设计树节点：** D-009
- **轮次与依赖：** round 2 / 无。
- **状态：** confirmed
- **问题：** 是否研究相近开源项目以完善当前架构？
- **事实与来源：** 用户本轮明确回答。

> 你可以整体地去学习一下 OpenHanako 或者 HanaAgent 这种 GitHub 开源项目的整体实现思路，因为它们的产品形态跟我的十分相近。

- **选项：** 以本轮真实问题与回答为依据。
- **推荐：** 固定源码版本，区分可借鉴模式与项目特定取舍，不把参考特性自动纳入 P1。
- **结论：** 用户要求整体学习 OpenHanako 或 HanaAgent 的实现思路；作为本轮架构调整的来源，保存在当前 change 的 learning。
- **原因：** 用户明确选择。
- **影响工件：** learning 图解及索引、新设计第 15 节。
- **约束或不变量：** 已确认设计与尚未执行的技术验收分开。
- **后续：** 完成正文及工件一致性检查后，确认整体共识。
- **替代/被替代：** 前轮相关开放问题已由本条关闭；原始文件保留。


## LOG-026 — 2026-10-25 — 当前 HUHU 代码事实与设计接缝

- **设计树节点：** 不适用；为 D-008 和已有架构决定补足可发现事实。
- **状态：** researched（源码核验，不是运行验收）。
- **问题：** 原报告与当前代码是否一致，哪些机制可复用，哪些需要新合同？
- **范围：** 当前 HEAD `66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93`；输入报告基线 `88c90cd319e1b37a627aeeabd7b1146c42bfaa5c`。
- **方法：** 主会话按 G 访谈规则委派独立只读事实探索，并回读关键源码；通过 rg、git diff 和精确文件读取交叉检查。子任务 `/root/bot_baseline_facts` 没有写入生产代码或本 change。
- **观察：** 两个提交之间只有 Speculo 安装更新；排除 .agents 后的文件名差异为空。当前代码没有 HUHU Bot/Go Runner 实现。仓库当前可检索文件与 Git 历史未找到原件所依赖的 D0 v1.0，故按 LOG-017 的用户决定独立重写。

| 事实 | 可回读依据 | 设计影响 |
| --- | --- | --- |
| 模块清单、ServiceKey、激活与撤回已有合同；api.ts 是进程内公共面 | <Path>src/app/contracts/module.ts</Path>；<Path>src/app/modules/registry.ts</Path>；<Path>src/modules/notifications/api.ts</Path> | 复用 Registry；另外定义 Go 应用 API 与 HAP，三者不能混淆 |
| 页面与模块生命周期分别管理，页面有自己的 owner 与取消信号 | <Path>src/shell/host/workbench-pages.ts</Path> | Run 不能归 React 页面所有 |
| disposeNow 明确不等待异步 onUnload，先 abort/withdraw 再调用模块 dispose | <Path>src/app/modules/registry.ts</Path> 约 210–233 行；<Path>src/app/main.ts</Path> | Runner 增加父 pipe EOF/失联收尾；ADR-022 |
| 当前引用工具有全局活动视图与 leaf 回退，UI 表面带 App/DOM/Window | <Path>src/host/obsidian/references.ts</Path>；<Path>src/ui/native-surface.ts</Path> | 新 HostContext 必须固定发起视图与版本，不能将宿主对象发给 Web |
| PTY 安装、进程与会话是 agent 私有实现；spawn 合并 process.env | <Path>src/modules/agent/platform/desktop/pty/binary.ts</Path>；<Path>src/modules/agent/platform/desktop/pty/helper.ts</Path>；<Path>src/modules/agent/services/terminal/sessions.ts</Path> | 不能跨模块调用私有 helper；可按真实双消费者提取安装机制，Bot 保持独立环境与监督 |
| 当前私有路径、Windows ACL 与目录保护合同限定 Vault 内 .huhu | <Path>src/host/desktop/huhu-paths.ts</Path>；<Path>src/host/desktop/owned-permissions.ts</Path> | OS 本地 Bot Profile 需新路径/权限合同，不能把现成 API 当通用安全容器 |
| 设置已有库/设备命名空间；普通设置更新先通知内存，再异步持久化 | <Path>src/app/settings/runtime.ts</Path>；<Path>src/shared/settings/store.ts</Path> | 设置存绑定与 UI 偏好，不能作为业务受理成功的事务权威 |
| agent 的 NativeHelperSqlite 面向只读 cookie 查询 | <Path>src/modules/agent/api.ts</Path> | 不能冒充可直接复用的 Bot 业务 SQLite |
| 自动化执行目标和通知导航仍带 terminalId / automationId 语义 | <Path>src/modules/automations/api.ts</Path>；<Path>src/modules/notifications/api.ts</Path> | 后续扩展判别联合和导航合同，不能偷填 ID |
| 原生目录只有 Rust PTY，现有辅助程序不监听端口 | <Path>native/pty-server/</Path> | 新 Go Runner 与 Web 接入均需真实实现/验证 |
| 模块分区和懒加载有实际检查，插件整体仍兼容移动端 | <Path>scripts/verify-architecture.mjs</Path>；<Path>manifest.json</Path> | TS 沿现有 core/platform/services/contrib/ui；desktop 能力不能泄露到移动入口 |

- **结论：** 保留模块化单体；把业务、UI 投影、传输和 Host 能力分开。代码中可发现的事实不转成用户问题。
- **影响工件：** 新架构第 2–6、12–14 节；ADR-021/022；领域上下文。
- **限制：** 没有执行插件构建、模型调用、Go 编译或宿主生命周期测试；这些仍是未来实施验收。
- **后续：** 新设计只形成目标合同，现有实现事实和未来目录明确分开。

## LOG-027 — 2026-10-25 — 外部技术与相近产品源码研究

- **设计树节点：** 为 D-002、D-006、D-008、D-009 提供事实；不代替用户选择。
- **状态：** researched（只读）。
- **调用方：** G；学习图解追加由同一主会话按 L 保存到当前 change。
- **承载工件：** 本 LOG；展开图解为 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/learning/01_HanaAgent整体架构与HUHU取舍.md</Path>。
- **方法：** 官方文档与固定提交源码；独立探索 `/root/hana_core_research` 和 `/root/bot_baseline_facts` 分别核对执行/记忆/权限与多端服务/生命周期，主会话回读关键实现。临时浅克隆仅用于只读研究；未安装、运行或复制上游实现。

### Research: 模型接缝与多客户端架构

- **Decision / target:** 支撑三协议首版、向内分层、Web 共用服务、Host 能力、恢复与删除设计；target 为本 LOG 和同 change 的 ARCHITECTURE。
- **Scope / version:** HUHU 当前 HEAD；Eino `0a5ca53b9d3bf7b661dccc863465ec568a421eea`；EinoExt `eee37f63ff9548c5eaec48fc157863339f8eda07`；HanaAgent `9a6cabf8c513db5edc6cf8179a538c9075885c6e`；官方 OpenAI 文档读取日 2026-10-25。
- **Questions:** 既有适配器覆盖哪些协议？是否有同等执行/取消/恢复能力？相近项目怎样组织多客户端、应用入口、工具权限、数据和生命周期？哪些机制与 HUHU 已确认合同不同？
- **Stop condition:** 每项问题有固定来源和适用限制，能够形成设计取舍与验证义务；不为文档研究扩展到安装外部项目或真实模型调用。

### R-001 — 模型协议适配器已有，但不是同一执行路径

- **Claim:** EinoExt 的 openai/claude 提供 ToolCallingChatModel；agenticopenai 提供 Responses 与 Chat 入口，agenticclaude 提供 Messages 的 AgenticModel。协议能力存在不等于已适配 HUHU Broker 与恢复。
- **Type:** code fact。
- **Source:** [OpenAI 适配](https://github.com/cloudwego/eino-ext/blob/eee37f63ff9548c5eaec48fc157863339f8eda07/components/model/openai/README.md)、[Claude 适配](https://github.com/cloudwego/eino-ext/blob/eee37f63ff9548c5eaec48fc157863339f8eda07/components/model/claude/README.md)、[Agentic OpenAI](https://github.com/cloudwego/eino-ext/blob/eee37f63ff9548c5eaec48fc157863339f8eda07/components/model/agenticopenai/README.md)、[Agentic Claude](https://github.com/cloudwego/eino-ext/blob/eee37f63ff9548c5eaec48fc157863339f8eda07/components/model/agenticclaude/README.md)。
- **Confidence:** 高；为固定源码声明。
- **Limits:** 未编译子模块组合，未验证任何真实 endpoint/modelId；不能把默认参数或环境回退当 HUHU 已批准行为。
- **Artifact impact:** ADR-017；模型与 Engine 两个接缝留在 outbound/eino。

### R-002 — Responses 不能只以文本冒烟代替工具合同

- **Claim:** Eino 的标准 Message 路径有完整工具循环；固定源码对 AgenticMessage 路径注明采用单轮链路，模型流取消监控/重试尚未覆盖。OpenAI 官方同时区分 Responses 与 Chat Completions 的工具和结果形状。
- **Type:** code fact / official fact。
- **Source:** [Eino 类型与限制](https://github.com/cloudwego/eino/blob/0a5ca53b9d3bf7b661dccc863465ec568a421eea/adk/chatmodel.go#L386-L392)、[OpenAI 迁移指南](https://developers.openai.com/api/docs/guides/migrate-to-responses)。
- **Confidence:** 高；对读取版本成立。
- **Limits:** 这是集成缺口证据，不证明所有可能的桥接实现都不可行；没有运行三协议测试。
- **Artifact impact:** P0 分别验证三协议的受控工具、审批、取消与恢复。用户已选择三协议，研究不再将 Responses 静默推迟。

### R-003 — 同一服务承载多端，能力连接与普通客户端不同

- **Claim:** HanaAgent 的 Electron、CLI 与 Web/PWA 访问同一个 Server；路由有 composition context，传输身份、scope 与事件订阅限制分开；内部浏览器能力有单独升级与认证入口。
- **Type:** code fact。
- **Source:** [服务装配](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/server/composition/open-root.ts#L69)、[CLI](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/cli/client.ts#L14)、[移动页面](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/server/routes/mobile-static.ts#L51)、[事件 scope](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/server/ws-scope.ts#L55)、[能力入口](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/server/index.ts#L1118)。
- **Confidence:** 高；对入口组织的判断有多文件依据。
- **Limits:** 没有做认证安全审计或运行 PWA；不宣称所有路由完全解耦。
- **Artifact impact:** ADR-021；未来受管 Web 可直接挂到同一 Go Runner，不能伪造 Host。

### R-004 — 门面、短期去重与记忆机制需要按 HUHU 合同调整

- **Claim:** 上游门面委派 Manager，但仍有 SDK 私有存储耦合；工具去重和流缓冲存在内存中，删除会话派生信息会保留聚合记忆；Electron 的退出控制与 Obsidian 插件不同。
- **Type:** code fact / inference（适用于 HUHU 的差异）。
- **Source:** [门面](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/core/engine.ts#L1)、[SDK 私有字段](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/core/session-jsonl-file.ts#L306)、[工具去重](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/lib/pi-sdk/session-options.ts#L101)、[流缓冲](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/server/session-stream-store.ts#L1)、[派生删除](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/lib/memory/session-derived-state.ts#L6)、[桌面退出](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/desktop/main.cjs#L6306)。
- **Confidence:** 高；具体实现可定位；适配建议是对用户合同与源码差异的推导。
- **Limits:** 本次不评价上游整体质量，也不声称上游所有其他持久层都缺少去重；结论限定到所引用路径。
- **Artifact impact:** HUHU 保持纯领域与窄应用入口，持久 Effect/RunEvent、删除传播和父失联收尾。

### Conflicts and Unknowns

- 原输入只要求首个真实 Provider，LOG-023 已明确更新为三协议；输入原件仍保持不变。
- HanaAgent 使用的 TypeScript SDK 与 HUHU 选定 Eino 不是同一技术栈；借鉴职责与行为，不能把源码直接当 Go adapter。
- 固定 Eino/EinoExt 的依赖组合、CP 兼容与三协议完整闭环尚未运行验证；实现前探针负责。
- 三协议实际服务模型、五个平台的工具链/凭证/SQLite 行为和未来 Web 的完整认证合同仍需各阶段验收。
- 研究范围已覆盖本轮问题；不存在必须由用户替我们调查的源码事实。

### Recommendation

将多端共享服务、窄门面、工具身份绑定和宿主能力分离纳入已授权的架构优化；对内存去重、SDK 存储耦合、删除和退出策略按 HUHU 合同增强。学习产物不自动扩大 P1，也不证明参考项目或 HUHU 已通过运行测试。

## LOG-028 — 2026-10-25 — 工件结构核验与草稿修复

- **设计树节点：** 不适用；本轮文档质量检查。
- **状态：** recorded。
- **观察：** 首次 grill 与 learn 均以 126 退出，原因是 source.md 缺少规定的元数据和三个章节；没有产品验收失败。路径回读发现一处 HUHU 设置存储路径误记；学习图解中三处记忆源码链接也在交付前修正。
- **处置：** 按 source schema 补齐本轮来源记录，source_type 为 conversation，content_sha256 对应原始请求正文；输入附件另有独立 SHA-256。修复前来源记录完整保存到 inputs/source-capture-initial.md，未丢弃原文或改变原始附件。LOG-026 的设置存储定位改为 src/shared/settings/store.ts。
- **完整性：** 输入与副本仍为 93844 字节，SHA-256 为 a85a57648a00942a44c3df89c52804d13d129e7e31262a73feb91ccc7f1516cc。
- **设计澄清：** 将持续事件撤权过滤写入正文第 11.3 节；核查完成后可以清除安全记录，以过期/失效命令和不可复用身份防止删除后重放，不无限保留已无必要的会话核查元数据。均落实已确认的权限与删除选择，不新增用户范围。
- **后续：** 使用实际最终工件重新运行结构与引用检查；最终结果记录在 README 的独立验证观察中。

## LOG-029 — 2026-10-25 — 用户确认整体设计共识

- **设计树节点：** 全部已回答分支的最终确认；不重复创建决定节点。
- **状态：** confirmed。
- **问题：** 当前架构、三模型协议、统一入口与未来 Web、资料授权、手动恢复和删除规则是否已覆盖核心需求，可将本轮 G 标记为达成共识？
- **来源：** 本轮 request_user_input_async 的问题 call_b4303c8bea394bc49cb335b4549718d3 / item 0，用户明确回答。

> 确认这版设计共识

- **结论：** 25 个节点的 frontier 为空；用户最终确认成立，design-tree.status 更新为 consensus。
- **范围：** 仅完成 G 的架构与领域共识，不证明产品实现或运行验收。
- **后续：** 用户随后明确激活 S，继续在同一 change 生成全面详细 Spec，并要求全部现行工件以最新决定一致。

## LOG-030 — 2026-10-25 — 启动完整 Spec 与一致性整理

- **状态：** requested。
- **来源：** 用户本轮续发请求。

> /home/wta/projects/obsidian-huhu/.agents/speculo/workflows/specdev/specdev-s-spec/SKILL.md 激活。针对/home/wta/projects/obsidian-huhu/.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture 生成全面详细的spec，注意这个change里所有的文档都不能存在冲突，以最新的为准，如果存在无法抉择的请你问我

- **结论：** 在原 change 写完整 spec.md，取代 README 对现行规格的职责；架构和 ADR 提供设计依据，历史 LOG 与原件继续作为有明确时序的来源。高影响无法裁决的行为才询问用户，不用旧原件覆盖已确认的新决定。
- **授权范围：** 规格及同 change 文档协调；不启动产品代码、提交、发布或永久知识提升。

## LOG-031 — 2026-10-25 — S 阶段曾确认 UI 设计后置

- **状态：** superseded-by-LOG-032（范围时序）。
- **来源：** 用户回答 call_a4a61e776579499da86443910ecfb391 / item 0。

> 先完成完整 Spec，UI 设计留作后续就绪条件（推荐）

- **说明：** 此为用户当时的安排；随后用户明确激活 P 并要求继续完成 Spec/Design，后续以 LOG-032 为准。不再用本条阻止当前原型设计。

## LOG-032 — 2026-10-25 — 激活 P 并扩展多 Agent、Leader 与记忆模型

- **状态：** requested；已明确 UI 方向，首版范围和记忆写入策略进入补充访谈。
- **来源：** 用户最新请求。

> 激活 /home/wta/projects/obsidian-huhu/.agents/speculo/workflows/specdev/specdev-p-prototype/SKILL.md 基于当前项目的整体的前端的布局交互作为基底，为我设计。针对的/home/wta/projects/obsidian-huhu/.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture 你可以参考 Grokbot、MERS 以及 DSH-BOT 等开源项目的交互方式。 1. 核心架构与记忆机制： 整体的 Agent 引擎是一样的。每个 Agent 都有自己独立的长期和短期记忆，同时也会有一些全局的长期记忆。 2. 团队分工与调度模式： 关于 Agent 的组合与分工方式，我给你发一个链接你可以参考。这有点像一个 Agent Team，只不过这个团队有一个类似于 Leader 的 Agent。Leader 可以通过提示词进行规划和分析，并派遣不同的 Agent 去执行定制化的任务。 3. UI 交互设计： 整体的 UI 交互也遵循这种模式，风格更加简洁，左侧有 Agent List区域。
>
> 继续完成这个change里 spec design等相关的产物和文档

- **确定约束：** 继承 HUHU 工作台；简洁左侧 Agent List；统一 Agent 引擎实现；各 Agent 独立短期/长期记忆与 Profile 内全局长期记忆；Leader 规划并派遣任务。
- **影响：** 旧单助手 P1 与手动记忆范围需要按新答复修订；G 原有共识保留历史，本次新增分支未答前不假装仍为整体 consensus。
- **已提问：** D-010 首版实际派遣范围；D-011 长期记忆写入。参考项目与用户提及的 Team 链接待准确 URL，公开搜索存在同名项目，未将任一候选冒认为用户指定。
- **继续工作：** 检测现有布局/token/组件，读取 P 模板与合同，准备相同任务的三个结构候选；只写本 change 和原型，不写生产 UI。

## LOG-033 — 2026-10-25 — 首版完整协作：已有 Bot 与临时 sub-agent

- **设计树节点：** D-010。
- **状态：** answered。
- **来源：** 用户回答 call_621c7cfdd4f740a3a98042bdf23b98d6 / item 0。

> 首轮就支持完整的这个功能。但是你要搞明白的是，Agent 和 sub-agent 的这种机制，它本身应该都是自备的。其实相当于每个它都是 Agent，都可以去通信其他的 Agent。
>
> 你去查看一下这种 Agent 的设计，它应该并不是特意设计的，而是类似于内置了一种工具，可以让它和其他的 Agent 进行相关的交互。
>
> 比如说，我创建了很多 Agent，那在组成上下文的时候，这些 Agent 的描述可能就会进入它的上下文，然后可以通过这个工具去跟这些 Agent 进行相关的对话。所以，它应该是提示词和工具的产物，类似于 sub-agent 的派遣。关于 sub-agent 的派遣，它也可以派遣给其他的 Agent。主 Agent 和这种交互模式的区别在于：主 Agent 可以自己生成相关的 sub-agent 去执行完成任务；而这种交互模式，除非用户指定生成 Agent，不然它更多是根据已经创建好的 Agent 去进行任务分派，也就是“已有”和“新建”的区别。我不知道怎么去说明这个，你可以在 GitHub 上搜索一下相关的开源热门项目，看看它们整体是怎么实现的。
>
> 所以，它具有很强的可扩展性，既可以支持独立的 Agent，也可以支持 Agent 的群聊协作。你也看一下 HANA agent、open hanako，看看它们这种群聊的交互方式是怎么实现的。

- **结论：** 首版包含持久 Bot 管理、单聊、群聊、协调者、已有 Bot 发现/通信/派遣、临时子任务创建及受控再委派。所有执行者共用同一引擎合同；Leader 是群聊内可指定的协调角色，不是另造一种高权限引擎。
- **身份边界：** 为已有 Bot 创建子执行不等于创建 Bot；临时 sub-agent 默认不进入长期 Agent List，持久 Bot 新建需用户明确意图。提示词负责选择与规划，工具及应用用例负责实际受理、权限、预算、取消和持久效果。
- **替代：** ADR-015 的“首版单助手、群聊后置”由 ADR-023 替代。新合同不自动扩大到独立常驻、外部消息平台或通用自动化。

## LOG-034 — 2026-10-25 — 自动私有长期记忆与确认全局写入

- **设计树节点：** D-011。
- **状态：** answered。
- **来源：** 用户回答 call_621c7cfdd4f740a3a98042bdf23b98d6 / item 1。

> Agent 自动维护自己的长期记忆，全局写入需确认

- **结论：** 持久 Bot 可以自动维护自己的长期记忆，用户可查看、修正、遗忘、暂停自动维护；各 Bot 的短期工作上下文独立。全局长期记忆属于当前 Profile，任何 Agent 提议的写入/修改/删除均需用户确认；群聊与委派不授予直接读取其他 Bot 私有记忆的权限。
- **替代：** ADR-012 的“P1 只使用人工固定记忆”由 ADR-024 替代；修订、来源、遗忘不复活及 portable 不携带运行权限继续成立。

## LOG-035 — 2026-10-25 — 参考项目由源码研究确定

- **状态：** requested。
- **来源：** 用户回答 call_621c7cfdd4f740a3a98042bdf23b98d6 / item 2。

> 你自己去全面搜索一下 DeepSeek BOT，或者目前开源的比较热门的类似实践案例。
>
> 看看 Grok BOT 这种交互的实现方式，是不是也有类似 Open BOT 这样的项目。重点看一下这些热门开源项目，具体来说这种交互是怎么实现的。
>
> 我个人感觉，其实可能是有类似工具的，比如：
> 1. Sub-agent 工具
> 2. Agent team 工具
>
> 这些工具可以实现 Agent 与 Agent 之间的交互，能够探查已有的 Agent，并在有必要时新建 Agent。在这个项目里面，Agent 其实就是一个个的 BOT。

- **处理：** 不再等待用户提供 URL。主来源选择固定提交的 HanaAgent、DeepSeek-Bot、OpenBot、OpenClaw，逐项区分身份、会话、Run、消息和工具。Grokbot/MERS 未唯一定位，不伪造该项目实现，也不以星标证明质量。
- **研究边界：** 只读上游源码与官方文档，不运行上游、安装依赖或复制其实现；UI 保持 HUHU 现有设计。

## LOG-036 — 2026-10-25 — 用户接手浏览器验证

- **状态：** assigned-to-user；不是已验证或批准。
- **来源：** 用户回答 call_50a76301fb224281ae3da274ec983b7e / item 0。

> 我自己去验证吧。

- **背景：** 浏览器库存为空；尝试 IAB 与 Chrome 均返回 Browser is not available。离线三个候选与 final 已生成后，主会话询问是否改用本机无头 Chromium/Playwright；用户选择自己验证。
- **处理：** 不启动替代浏览器、不伪造截图/browser.json；继续全部独立文档、源码物化与静态检查，提供 REVIEW.md。UI-001 的浏览器/确认门保持未闭合，DESIGN/spec 为 draft。
- **范围：** 该回答没有选择候选、批准实际 HTML、批准新增整版设计共识或授权永久基线发布。

## LOG-037 — 2026-10-25 — 多 Bot 与群聊源码事实

- **状态：** researched（只读）。
- **目标：** 区分 Agent 身份/会话/任务/执行；理解发现、通信、派遣、Leader/群调度及记忆 scope；用于 ADR-023–025、Spec 和 UI-001。
- **方法：** G 独立事实探索分别核查 Hana/OpenClaw、OpenBot；主会话选择并捕获 DeepSeek-Bot，独立探索继续逐文件核验；主会话回读关键工具/群调度/记忆 review 路径。未运行参考项目或测试。
- **版本与完整来源：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/learning/02_多Bot协作与记忆隔离.md</Path> 保存固定 commit 与逐项链接。

| 项目 | 源码事实 | 本项目处理 |
| --- | --- | --- |
| HanaAgent @9a6cabf8 | subagent 调用已有 Agent 并创建 child thread；dm 是通知；群 @ 优先并仍可分发其他成员；私有目录不证明所有路径工具保密隔离 | 身份/执行分开，消息/委派分开；按用户要求允许受控再委派；使用本项目严格 scope |
| OpenClaw @090e6213 | agents_list、sessions_send、sessions_spawn 分开；spawn 新 Session 不新增未配置身份 | 发现目录与执行生成分开，工具参数不自授权限 |
| OpenBot @46642d6c | 持久 AgentProfile、message_bot 的结构化信封/临时线程、逐跳授权及持久队列；群共享记录与各自线程分开 | 采用有界任务/回执与身份状态展示；不把它等同 Grokbot 或宣称已有特权 Leader |
| DeepSeek-Bot @1bebe826 | 默认 admin 回应、@ 调度、长任务后台回投 askedBy；own/group/team 记忆与自动 review；Main/admin 可直接写 team | 借鉴群交互，拒绝照搬高权限 Leader、自动持久创建和未经用户确认的全局记忆写入 |

- **推论：** 协作可由同一引擎、提示词、目录摘要和受控工具形成，不需另造“团队引擎”；应用层仍需真实的身份、任务、授权、预算、取消和恢复模型。
- **限制：** 未建立上游性能/安全/持久恢复通过结论；Grokbot/MERS 未唯一定位，不编造其源码。UI 的最终可用性由本轮用户检查。
- **停止条件：** 核心概念、交互机制和不适用边界已有固定源码证据；不继续无目标扩大参考项目集合。

## LOG-038 — 2026-10-25 — 完整 Spec、设计包与现行工件协调

- **状态：** authored；产品未实现，UI 尚未批准。
- **交付：** spec.md 包含 55 条 AC、9 个验证接缝；DESIGN revision 1 覆盖六页面；UI-001 三个同任务候选与推荐 A，含本地字体/许可、源码块、基线候选、绑定摘要和用户检查指南；追加 learning/02。
- **一致性：** 新增 ADR-023–025；ADR-012/015 标 superseded。ARCHITECTURE 更新六领域、多 Bot/群聊、waiting_children、自动记忆和删除传播；旧 HB-AC 归并到 Spec。CONTEXT-MAP 与独立 context 同步，design-tree 27 节点均 answered，旧答复注明替代。
- **权威：** Spec 唯一拥有行为/验收；DESIGN 拥有视觉/交互；源码包拥有源码/证据；README 只导航和记录当前接续。inputs/source/历史 LOG/learning01 不改原始内容；历史范围由本条及最新文档显式界定。
- **P 状态：** 用户自验安排不等于通过；browser_evidence/confirmation 为空，首次 baseline 未发布。完成静态验证后才写实际回执，不填写 UI Ready 或产品实现通过。

## LOG-039 — 2026-10-25 — 静态核对与用户自验交接

- **状态：** static-checked；browser/approval pending。
- **通过：** G/L 工件校验各 0 errors/0 warnings；JS 语法、三源码块连续两次物化一致；基线候选/草稿 DESIGN/设计包结构；55 AC、25 ADR、27 answered 节点及引用；原件 93844 字节及 SHA-256 一致；本地字体/许可与项目原件一致。
- **修正：** 原型按 Bot 隔离记忆开关，修正新群与会话空态、记忆修正回填、完成/取消状态、清除范围展示和模拟任务回调的会话隔离。只做源码检查，不冒充浏览器实测。
- **未通过：** preview 缺 browser evidence；S 缺 UI Ready 与 approved DESIGN；`pnpm test:docs` 仅报告原附件 6 处既有目录锚点错误。保持原件字节，不改检查器或隐藏错误。
- **绑定：** prototype digest `1d7381b712e67c6a57d2e14cca8c7da1e6931f168dcf38fc430ddd27772b85ef`；DESIGN revision 1 / digest `7af779b352b4ab40fca6884d31e0bda4c3419bbd16e282d126d717c7a9278b16`。
- **证据：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/prototypes/UI-001/evidence/static-validation.md</Path>；自验步骤见同包 REVIEW.md。
- **边界：** 未改产品代码、永久 ADR/context/design；未启动浏览器替代方式、模型、服务器或实施。沿用用户自行验证安排，收到实际反馈后继续 P；未取得具体 HTML/交互与首次基线批准。

## LOG-040 — 2026-10-25 — 用户确认 final 唯一方案并要求固化

- **状态：** confirmed-design；来自本轮用户直接消息。
- **设计树节点：** D-012。

> 我已经确认了我所需要的就是 /home/wta/projects/obsidian-huhu/.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/prototypes/UI-001/final 请你帮我落盘，只要这一套的元素，完善并修正相关的这些文档。

- **执行范围：** final 为唯一界面；移除其他候选与专用布局分支，保留原 final 的任务页/记忆/权限/清除功能；完善当前 Spec、DESIGN、ADR、架构、来源说明与导航。
- **批准：** 本条是真实设计确认，不再沿用“待用户选择/确认”的旧状态。确认快照与固化摘要见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/prototypes/UI-001/confirmation-final.md</Path>。用户没有提供浏览器版本/尺寸/逐项截图，不能补造这些技术证据。
- **基线处理：** 当前正式 DESIGN-0001 已存在，核对后引用其不可变快照；移除本包未发布的同名候选，不覆盖永久基线。此为文档协调，不扩张所选界面的视觉/交互范围。
- **兼容：** comparison 旧地址仅保留指向同一 final 的导航与同源 A 投影，无另一套样式或交互实现。日常入口只有 final。
- **技术边界：** 设计批准与技术 Ready 分开；后续只补实际技术观察或处理具体缺陷，不重复询问相同选择。本轮不实施产品或提交发布。

## LOG-041 — 2026-10-25 — 唯一方案固化与确认校验

- **状态：** design-approved；技术浏览器证据仍 pending。
- **落盘：** final 为唯一维护源；删除未选 HTML、旧比较页 CSS 与专用布局分支，保留同源旧 A 地址；用户选择的产品任务区 HTML 未改变。DESIGN revision 2 为 approved，批准来源是 LOG-040，原文与确定摘要固定在 confirmation-final.md。
- **基线：** 引用已发布 DESIGN-0001，designDigest `ebaca5f2f15fe081bf393c892f8b6583d4f2c6ad12cd92cb55068005fe83a331`；移除本包旧候选，未改永久知识。
- **绑定：** DESIGN digest `aa62a53b30d0ca32f03a5580be8ce5b4921b9c3c1767793b9173eadfde92dc6e`；prototype digest `3c93a0c085cf3458148befdeb29ff445fe444601861c3bacb8dc9e421706444b`。Spec 同步硬引用，当前批准校验已通过。
- **验证：** 已批准 DESIGN/正式基线/包结构、源码两次物化、JS 语法、资源闭包、原件/字体完整性、55 AC/25 ADR/28 设计节点与 G 校验通过。preview/S 只剩浏览器证据和由其导致的 UI Ready 条件；仓库文档检查仍仅报原附件既有六处锚点错误。
- **证据：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/prototypes/UI-001/evidence/finalization-validation.md</Path>。确认前 static-validation.md 仅为历史，不继续作当前状态依据。
- **边界：** 用户确认没有被扩写成未观察的浏览器通过记录；产品实现、提交、发布、归档均未执行。

## LOG-042 — 2026-10-25 — 用户要求最终 Tickets、开源检索与全面对齐

- **状态：** 用户直接授权本轮 T 规划。
- **请求：** 激活 specdev-t-tickets，针对本 change 形成最终 tickets；遇到不熟悉的功能先检索 GitHub 上近两年活跃且许可证明确的同类项目，比较实现、依赖和已知问题，优先借鉴验证过的设计，不直接复制不兼容或来源不明代码；全面对齐 change 文档并把参考引用写入对应工件。
- **继承：** LOG-033/034 的完整多 Bot 与记忆规则、LOG-040 的 final 唯一设计保持；不将本轮规划理解成产品实现/提交/发布授权。

## LOG-043 — 2026-10-25 — 开源复核与完整计划落盘

- **研究：** 九个仓库的固定提交、活动时间、LICENSE 与依赖清单已核验，具体机制/限制和采用责任见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path>、<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/reference-audit.json</Path>。Eino #1119 网页状态为 Closed，只作历史回归线索；没有安装运行上游或调用真实模型。
- **规划：** 28 张行为票、55 AC 全覆盖，每项有主责和必需接缝；三协议分票，核心跨域用例与 UI 消费者分工，API/装配/根产物有共享 owner；Skill 使用真实 dev/ui 与摘要。
- **对齐：** Spec、ARCHITECTURE、ADR-026、六 context、README、学习索引/当前说明和原型 REVIEW 统一指向最新计划及参考。旧 HB 验收在映射表只列原序号，避免被当作第二套现行 AC；原输入不改。
- **保留：** DESIGN revision 2、final/源码块/绑定与不可变确认快照保持字节；历史来源/日志/早期静态证据不篡改。当前 Spec 的 browser 技术门禁仍未解除。
- **核验：** 最终检查及逐文档审查记录在 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/tickets-planning-validation.md</Path>；不把计划 covered 或读取 Skill 记作实现通过。

## LOG-044 — 2026-10-25 — 全票计划审查与门禁回读

- **已核验：** 28 票、55 AC、36 个真实 Skill 绑定、34 个共享表面 owner、DAG 无环、T-28 汇合其余 27 票、写集无交集；已批准 DESIGN 与原型摘要保持，19 个受保护来源/批准/原型/历史文件逐字未变。
- **质量审查：** 按 plan-quality-review 全轴审查，修正旧 HB 编号识别、模型接入预算/恢复前置、早期 Host 探针与模块/页面验收分责；详见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/tickets-planning-validation.md</Path>。
- **真实结果：** G stage 通过；T stage 仅余既有 P 浏览器/Ready 两项门禁，控制器 frontier 为空；文档检查仅余原附件六个既有锚点。未跳过/修改校验器或伪造 browser evidence。
- **状态含义：** 最终规划已交付；20 张非 UI 票自身合同 ready，8 张 UI 相关票 blocked，源 Spec 仍未 Ready，不能派单。产品实现/真实模型/宿主/平台验收均尚未启动。
- **范围：** 本轮只写本 change，外部用户改动、其他 change 和永久 ADR/context/design 均保留。

## LOG-045 — 2026-10-25 — 用户要求 Goal Plan 与 Agent Team 安排

- **状态：** 用户直接授权 plan 文档；未要求产品实施。
- **原话：**

> /fast /home/wta/projects/obsidian-huhu/.agents/speculo/workflows/specdev/specdev-p-goal-plan/SKILL.md 激活这个，形成一个 goal plan，然后里面强调一下可以调用 agent team。比如说：
> 1. 实现部分：可以使用 codex GPT-6.1-sol X high。
> 2. review 部分：可以是 6 Astra high。

- **落盘含义：** 生成完整单 change Goal；后续允许调用原生 Agent Team，实现模型优先 gpt-6.1-sol/xhigh，未参与对应实现的独立 reviewer 优先 gpt-6-astra/high；实际派单动态核对可用性，Lead 保留状态与验收责任。
- **工程修正：** T-27 的现有工程准备不再以 T-01 done 为开始前置，解决首票构建支持互相等待；Go 资产子步骤仍等 T-01，最终完成门仍等全部生产输入。Map revision 2，不改变 28 票/55 AC 或产品范围。
- **授权边界：** 延续 current 工作区、用户自行检查原型的安排、所有既有产品决定；本次没有派遣实现/审查团队，没有开启产品实现或提交发布。

## LOG-046 — 2026-10-25 — Goal Plan 与完整票据对齐核验

- **交付：** Goal revision 1 / Map revision 2；W1–W7、T-27 共享集成、G0–G6；动态 Agent Team 与实现 GPT-6.1-sol/xhigh、独立 review GPT-6-Astra/high 偏好，统一 Lead 和 current 工作区。
- **修正：** T-27 的现有工程准备提前，Go 子步骤和最终验收保留真实输入门；词典/模块注册明确仍归 T-20。28 票/55 AC、写集与产品范围保持。
- **审查：** plan-quality-review 各适用规划轴已检查；DAG 无环、T-28 汇合其他 27 票、36 项 Skill 绑定、34 个共享表面和 19 个保护文件均复核。实际证据见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/goal-planning-validation.md</Path>。
- **真实检查：** Goal stage 仅余原型 Ready/browser 两项失败；控制器 frontier 为空；文档检查仍只有原附件六项既有锚点；git diff --check 通过。未将局部结构通过冒充整体 Ready。
- **状态：** 本次 plan 文档交付完成，Goal 保持 draft / ready_for_execution:false；没有产品实现、团队调用、真实模型/宿主/平台验收或提交发布。后续只补已记录技术前置并按实际实施授权推进，不重问设计选择和团队偏好。
