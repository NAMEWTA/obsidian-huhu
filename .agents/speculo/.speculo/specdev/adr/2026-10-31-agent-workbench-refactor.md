# 终端协作与身份边界

状态：Accepted（已采纳决策；实现和验收状态沿来源分别核验）

日期：2026-10-31

内容 owner：来源 change 的已接受 ADR；提升网关：specdev/archive-and-consolidate，codex:/root。

来源：[2026-10-25-agent-workbench-refactor / ADR.md](../changes/archive/2026-10-25-agent-workbench-refactor/ADR.md)，原始字节 SHA-256 `2a9102daf6454c1b7f295c333317e96ef221b756ce2d64cfe99cdeaff9d48bde`。授权与归档范围见[原请求](../changes/archive/2026-10-25-agent-workbench-refactor/archive-approval.md)。

本条保留长期取舍、边界与恢复义务；归档不证明下述目标已全部实现。原始理由、被拒方案、研究引用及验证合同随来源保留；本次未重新联网核验历史外部资料。

## ADR-002: 保留显式授权的库外工作目录

**Status:** accepted
**Source:** LOG-004
**Supersedes:** none

### Decision
Space 允许绑定显式授权的库外本机目录。Vault/Space 身份仍决定历史归属，cwd 不作为会话合并或身份依据。

### Context / Trade-off / Consequences
实际备选是只允许 Vault 内目录，或保留用户授权的库外目录。前者会收窄当前交互终端能力；采纳后者，代价是不同入口均需核对目录绑定，不能将路径碰巧相同视为同一会话。范围是当前 Vault 所属 Space 的工作目录选择，不扩大为跨 Vault 控制。

### Verification / Migration
核对交互启动、历史继续、自动化入口对已授权目录的处理，验证库外路径存在性、规范路径和失效提示；旧记录保留来源身份，不因 cwd 相同错误合并。


## ADR-003: 备份 HUHU 自有数据与来源引用

**Status:** accepted
**Source:** LOG-006
**Supersedes:** none

### Decision
首轮备份与恢复保全 HUHU 完整自有业务数据及来源引用，明确提示原生完整 transcript 与账号凭证另行备份。按 ADR-001/008 和现有数据约定，首轮沿用 Vault 中的自有业务数据归属，不要求搬迁到新本机业务 DB；活动 IPC 与锁属于本机运行设施。

### Context / Trade-off / Consequences
实际备选是备份 HUHU 自有数据与引用，或额外打包 Provider 原生完整对话。用户选择前者，避免把外部账号历史打包作为自身备份的前置；代价是仅有此备份时，原生正文和登录环境可能不可用。范围涵盖实际存在的 HUHU 业务记录，不要求为备份先创建完整 Run/Outbox 模型。

### Verification / Migration
导出后导入能够恢复自身记录；原生来源缺失时保持引用与准确状态，不能用空会话冒充恢复成功。


## ADR-004: 首轮支持在 HUHU 内处理人工审批

**Status:** accepted
**Source:** LOG-008
**Supersedes:** none

### Decision
后台任务需要审批时，在 HUHU 内给出可达的人为批准/拒绝入口，并继续对应会话/任务。不得自动替用户放行，也不得切后端重复执行来伪装继续成功。

### Context / Trade-off / Consequences
实际备选是首轮提供 HUHU 内处理入口，或仅运行预授权任务并报告审批受阻。用户选择前者，因此后台状态必须能引导用户处理对应会话，不能只显示永久等待。结合已采纳的终端主轴，首轮采用提示并定位原终端，由用户在原生 TUI 批准或拒绝；不以完整结构化 Provider UI 为前置。具体布局由 P 的 DESIGN 管理。

### Verification / Migration
对实际支持的 Provider 核对审批识别、定位、批准、拒绝与继续；检测不明时显示未知并允许查看终端，不把未知猜为成功。终端内人工操作与结构化能力都须作用于原会话，不能重开任务替代继续。


## ADR-005: 网页标签由独立共享容器承载

**Status:** accepted
**Source:** LOG-009
**Supersedes:** none

### Decision
保留浏览器入口和标签体验，提取独立共享视图承载；无 Space 或 Agent 停用时仍可打开网页。旧浏览器标签的布局和资料引用需要保全。

### Context / Trade-off / Consequences
实际备选是保留共享标签，或迁往独立浏览器页面/强制归属 Space。用户选择前者，维持既有操作路径；代价是需要将当前由 Agent 持有的布局和共享 native 资源所有权分开。范围是网页视图及其已有依赖，不为网页建立 Agent Session。

### Verification / Migration
检查无 Space 打开网页、Agent 停用后网页继续使用、旧标签恢复与 Cookie 服务可用；关闭一个终端或停用 Agent 不得误回收 Browser 仍在使用的资源。


## ADR-006: 被动消息默认主动读取

**Status:** accepted
**Source:** LOG-010
**Supersedes:** none

### Decision
被动消息默认由 Agent 显式读取和确认读取，界面显示未读状态。不默认自动注入上下文，也不因消息送达自动启动推理任务。

### Context / Trade-off / Consequences
实际备选是主动读取，或在下一次输入时自动注入。用户选择主动读取，输入内容与推理启动保持可解释；代价是接收方未调用邮箱时不会自动获知消息正文。此条保留轻量通知能力，不以持久任务投递与结果保证为前提。

### Verification / Migration
核对发送后的未读提示、读取及确认状态；消息到达时不自行向终端输入或唤起模型，终端已结束时也不自动重启。相应 CLI 应说明读取与确认的区别。


## ADR-007: 正式版保留五种平台组合

**Status:** accepted
**Source:** LOG-011
**Supersedes:** none

### Decision
首个正式版包含 Windows x64、macOS x64/arm64、Linux x64/arm64。可以按平台推进技术验证，发布支持承诺以实际端到端证据为准。

### Context / Trade-off / Consequences
实际备选是保留五种组合作为首个正式版门槛，或分平台正式交付。用户选择前者以维持现有发行范围；代价是平台差异和验收资源影响正式版完成时间。现有 CI 构建矩阵不能代替新行为的运行证据。

### Verification / Migration
五种组合分别记录终端启动/输入/输出/调整尺寸/停止、原生继续和共享资源隔离的端到端结果；未验证的组合保留待验收状态，不能因其他平台通过而宣布完成。


## ADR-008: 首轮采用 Herdr 式终端协作

**Status:** accepted
**Source:** LOG-015；事实前置 LOG-013 / LOG-014
**Supersedes:** none

### Decision
首轮采用对受管真实终端发送输入、等待状态、读取输出或检查产物的协作方式。输入提交成功只表示输入阶段完成；状态等待满足条件不保证其对应刚发送的某条任务，也不证明任务成功。结果由调用方结合实际输出或产物核对。

持久 Run/Outbox、新任务数据库和结构化 Provider 平台均不作为首轮前置。已有会话、历史、被动邮箱和备份需求按其自身必要性保存数据，不因为采用终端协作而取消。原方案中逐任务可靠性机制保留为输入参考，未来确有需求时另行决定。

### Context / Trade-off / Consequences
实际备选是 Herdr 式终端级控制，或首轮即提供逐任务持久受理、可靠投递与最终结果关联。用户在明确 wait 的语义限制后答复“采用”，选择前者以控制复杂度、复用现有终端能力。代价是调用方必须核对输出，不能把空闲、blocked 或等待返回当成某个任务的最终成功证明。

此决定适用于本 change 的首轮 Agent 协作。库外目录授权、Vault 归属、人工审批、共享网页、主动读取通知与五平台范围继续遵守 ADR-002–007；不扩大至任意系统终端或跨 Vault 控制。

现有业务消费者的 `AGENT_PROMPT_RUNNER` 原生结果、自动化 invocation/执行记录及其取消/执行期限合同保留；首轮简化针对新增终端协作，不把已有结果降级成屏幕文本。来源与承接见 LOG-016、Spec §3.10。

### Verification / Migration
验证 GUI 与 CLI 指向同一受管终端，文本与提交动作保持顺序；区分写入完成、Agent 状态与任务结果。覆盖启动未就绪、已在工作中、blocked、未知状态、前台进程变化和等待超时等情形；超时后先核实终端与产物，不能因未收到完成回执自动重发。

将上述语义写入实际 CLI 帮助、机器可读响应与后续验收条件；实现中仍需验证错误与关闭路径，不把静态参考当作运行证明。既有布局、历史与来源引用需要保全，本决定不要求账号或数据库搬迁。


## ADR-009: 允许同 Vault 跨 Space 明确寻址

**Status:** accepted
**Source:** LOG-017
**Supersedes:** none

### Decision
CLI 默认查询当前 Space；明确指定稳定目标后，可以控制本 Vault 其他 Space 的受管终端、Agent 与面板，也可向该范围的会话发送通知。跨 Vault 不支持；操作不会迁移会话或历史归属，同名歧义需消歧。

### Context / Trade-off / Consequences
原输入仅同 Space 的规则与 Herdr 同 server 跨 workspace 控制不同。用户明确选择同 Vault 跨 Space，便于编排；代价是调用方必须清楚目标归属，命令结果和 UI 需要显示实际 Space。以本机当前用户受控入口和 Vault 实例路由为边界，不建立自建协作者专有角色体系。

### Verification / Migration
验证默认查询范围、明确跨 Space 控制、同名冲突、错误 Vault/过期实例拒绝；发送通知和控制面使用同一寻址语义。原文 `CROSS_SPACE_DENIED` 不进入当前发行接口，跨 Vault 与失效目标仍须可判定拒绝。
