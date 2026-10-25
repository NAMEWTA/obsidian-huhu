---
schema_version: 3
artifact: spec
change: 2026-10-25-agent-workbench-refactor
status: ready
ready_for_tickets: true
sources:
  - USER-DECISION:以Herdr为主要参照增强现有终端并控制复杂度
  - USER-DECISION:Q1-Q10及明确激活S与P的请求
  - CHANGE:ADR-001至ADR-009
  - CHANGE:LOG-001至LOG-026
  - USER-DECISION:形成GoalPlan并允许AgentTeam及指定实现review模型分工
  - USER-DECISION:激活T形成最终票据并全面对齐change文档
  - USER-DECISION:陌生功能先检索近两年活跃且许可明确的同类GitHub项目
  - CHANGE:reference-notes与implementation-contracts及tickets-map
  - USER-DECISION:UI-001采用A并发布六条基线完成P与S封板
  - DESIGN:revision-1与DESIGN-0001及UI-001精确绑定见第7节
  - SOURCE:inputs/HUHU-智能体终端-完整架构与重构方案.md
  - CODE:66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93
  - REFERENCE:herdrdev/herdr@2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01
---

# Spec：HUHU 终端 Agent 工作台

## 1. 问题与目标

HUHU 用户需要在 Obsidian 内组织多个真实终端和 Agent：创建工作空间、切换或分屏、查看后台状态、让 Agent 经 CLI 操作其他面板和终端，并从当前 Vault 的历史继续工作。当前实现已有 PTY、xterm、标签分屏、六种 CLI、账号、Hook、历史和自动化服务；缺少统一的 Space 归属与外部控制面，部分浏览器及共享原生资源仍由 Agent 生命周期承载。

本次以 Herdr 的终端组织和 CLI 控制机制为主要参照，保留 HUHU 的宿主、设计系统和数据约定。成功的主路径是：用户建立两个 Space，在其中启动 A、B 和 Shell；A 能通过 HUHU CLI 明确找到 B、发送输入、等待状态、读取输出或检查产物；用户切换 Space 或关闭显示面板后 B 继续运行；需要人工处理时可回到原终端；右侧可预览当前 Vault 历史并明确继续。用户也能明确寻址同 Vault 另一个 Space 的终端。

这为后续智能体编排提供可组合的终端能力。首轮不承诺每条输入与最终结果的持久关联，不建设完整任务调度平台。

### 1.1 当前权威与阅读方式

- 本文件唯一负责当前外部行为、范围及验收合同；局部架构约束见 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/ADR.md</Path>，规范术语见同 change 的 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/CONTEXT.md</Path>。
- 视觉与具体交互由 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/DESIGN.md</Path> 负责。用户已明确采用 UI-001/final 的 A 方案，并授权发布 6 条公共设计基线及完成 P/S 封板。项目基线 DESIGN-0001 已发布，精确设计引用见 §7；Ready 表示合同可供下游使用，产品实现仍须按本 Spec 验收。
- <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/LOG.md</Path> 保存历史与用户原话。设计树保存问题及答复，不是第二份行为合同；其中旧题面/推荐不覆盖最终答复。
- `inputs/` 原方案是逐字节保全的历史输入。其“明确决策”、旧错误码、类型、SQL 表和实施阶段均不能直接用作当前施工合同；处置映射见 §10。原文不改写，历史角色见 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/inputs/README.md</Path>。
- 本轮源码基线仍是上列 HUHU commit；相关生产路径无未提交差异。已有 `AGENTS.md` / `.gitignore` 改动不属本次写集。Herdr 原研究在 LOG-013；T 补充的开源活动/许可/机制与问题比较见 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/reference-notes.md</Path>。这些是固定版本只读研究，不是跨平台运行报告。

### 1.2 用户故事

| ID | 用户或调用者需要 | 验收 |
|---|---|---|
| US-001 | 以 Space 组织工作，目录相同也能分别管理 | AC-001–004 |
| US-002 | 继续使用真实 Shell、原生 Agent TUI、现有账号和终端输入习惯 | AC-005–009、AC-030–032 |
| US-003 | 通过 CLI 控制面板、终端和 Agent，进行可核对的协作 | AC-010–019 |
| US-004 | 在 HUHU 内处理后台审批并继续原会话 | AC-020–022 |
| US-005 | 给另一个 Agent 留消息，接收方自行读取 | AC-023–025 |
| US-006 | 关闭显示、切换 Space 和停止运行有明确区别 | AC-026–029 |
| US-007 | 在右侧查看当前 Vault 历史并准确继续 | AC-033–040 |
| US-008 | 网页、素材、首页和自动化继续可用 | AC-041–045 |
| US-009 | 迁移、备份和重启保留我的数据，失败可恢复 | AC-046–053 |
| US-010 | 大输出、慢视图、进程退出和资源故障不会使工作台失控 | AC-054–060 |
| US-011 | 在正式支持的平台上获得一致、可操作且可访问的能力 | AC-061–064 |

## 2. 范围

### IN

Space 与持久会话引用；真实 PTY；标签/面板控制；前后台 Agent 状态；本机 CLI 和机器可读查询；同 Vault 内精确寻址；终端输入/按键/读取/等待/停止；轻量通知邮箱；人工审批入口；当前 Vault 历史抽屉及精确恢复；独立共享网页承载；共享 native 资源所有权；懒加载、旧数据迁移、自有数据备份；现有消费者兼容；五平台验收与配套 CLI 使用 Skill。

### REUSE

TypeScript/React、项目组件与语义 token、Zustand 服务状态、xterm/headless、现有 Rust helper 发行链、原生历史解析、系统/托管账号、状态 Hook、技能管理、快捷命令、终端输入与渲染选项、首页/自动化接口和现有测试接缝。内部类名可变，已承诺行为与用户数据必须承接。

六种现有 CLI 入口为 Claude Code、Codex、Gemini CLI、OpenCode、Pi、Grok。保留它们已有的启动、账号和可用能力；不把“入口保留”解释为六者所有版本都提供相同状态/恢复接口。首条真实协作验收可从一个 Provider 开始，产品验收至少覆盖 Codex 与 Claude Code 两种实际 CLI，并记录版本及能力限制；现有其他 Provider 的已实现行为须回归。

### OUT

| ID | 首轮不提供或不作为前置 | 原因 |
|---|---|---|
| OOS-001 | 持久任务 Run/Outbox、自动任务重放、exactly-once、逐任务最终答案关联、通用 DAG 编排 | ADR-008；终端状态不是任务账本 |
| OOS-002 | 自定义 Chat 取代原生 TUI、完整结构化 Provider 执行平台 | ADR-001/008；先增强真实终端 |
| OOS-003 | 跨 Vault/跨机器控制、SSH 管理、云端协作、Obsidian 退出后 daemon 保活 | 当前宿主与作用域边界 |
| OOS-004 | 自动迁出业务数据、迁移已有账号、复制系统登录、新细粒度角色权限平台 | 用户纠偏及现有数据合同 |
| OOS-005 | 插件市场、自动 worktree 编排、Git 合并、替用户批准权限、共享目录写冲突自动解决 | CLI 控制不等于自治工作流 |
| OOS-006 | 重写终端图形引擎、完整终端图形协议、换桌面外壳、无关模块改版 | 复用当前工程与 UI 基底 |
| OOS-007 | 默认完整屏幕录制、所有来源的全文搜索、删除 Provider 原始对话、保证跨设备登录可移植 | 数据与来源能力有明确边界 |

以上不撤销现有自动化的 invocation/run 记录及原生结果合同；OOS-001 针对新增终端协作体系。

## 3. 解决方案与外部行为

### 3.1 最小对象与身份

| 对象 | 当前语义与最低信息 | 边界 |
|---|---|---|
| Vault | 已有逻辑 Vault 身份、设备及当前物理目录绑定 | 路由同时验证活动实例；复制 Vault 不能接管原 endpoint |
| Space | 稳定 ID、名称、目录绑定、归档状态 | 名称/cwd 均不是身份；新建可为空 |
| Session | Space 下一个 Agent 或 Shell 的持久记录；稳定 ID、类型、标题、启动配置引用、可选原生来源 | 不要求额外的 AgentInstance/Run 实体；不以 Pane 或 PID 作持久 ID |
| Terminal runtime | 当前运行身份/代次、进程、屏幕和状态 | 同 Session 每次显式启动/继续产生新的运行代次；迟到旧事件不能修改新代次 |
| Tab / Pane | 展示与布局引用 | 不拥有进程存活；移动 Pane 不改变 Space 或历史归属 |
| Agent | 受管终端中的已识别 Agent 程序及能力 | 可识别手动在受管 Shell 中启动的程序；未识别时仍是可操作终端 |
| Native reference | Provider、账号/来源 namespace、来源设备、原生会话 ID、必要 locator | 同 ID 不同账号不能合并；引用不是正文备份 |
| Notification | messageId、目标 Session、正文、来源信息、创建顺序及读取确认 | 轻量持久通知，不是可调度任务；发送者描述不替代 IPC 访问校验 |

数据是逻辑最低要求，不是指定物理表、类名或逐文件目录。

### 3.2 创建、布局与面板控制

1. 顶层创建 Space；Space 内创建 Shell/Agent。空 Space 只保存记录，不启动进程。交互式“新建 Agent”直接打开原生 TUI，不另造前置 Chat 输入框。
2. 无 Space 时 GUI 引导显式创建第一个 Space；CLI 返回缺少目标的可处理结果。旧布局迁移产生“导入空间 · 旧工作台”属于兼容转换例外，不能变成新用户的静默默认空间。
3. 目录可为 Vault 内或用户显式授权的库外目录。启动/继续时核对规范路径、真实目录及原授权；符号链接或 junction 改指向后重新核对，不用字符串前缀判断。目录绑定不是 OS 沙箱。
4. 用户启动默认显示新终端；Agent 创建协作者默认后台、不抢焦点。后台 Session 立即可查询，并在 Space 中可定位。
5. 保留标签排序、分组、分屏、比例调整、键盘切换、搜索、复制粘贴和终端设置。新增 CLI 可查询并操作面板焦点、附加/关闭视图、分屏/调整布局；它与 GUI 使用同一布局与会话身份。
6. 同 Space 内重排仅改布局；首轮不支持把运行中的 Session 拖到其他 Space 造成归属迁移。跨 Space 控制一个终端不改变其所属 Space。
7. 后台启动、状态变化和消息到达不会强行切换用户焦点；需要处理时显示可定位提示。焦点切换不能把输入发送到上一个已失效 runtime。

### 3.3 生命周期与状态

| 操作 | 结果 | 失败时仍应成立 |
|---|---|---|
| 切换 Space、隐藏工作台、关闭某个 Pane/Tab | 释放显示绑定；Session 与 runtime 保留 | 能从侧栏/CLI 再附加同一运行 |
| 停止运行 | 对明确的 runtime 关闭新输入，发停止并核实进程退出 | 停止请求不等于已退出；未核实残留可见 |
| 归档 Session/Space | 收束所属运行，再提交归档；历史与标注保留 | 运行未收束不声称归档已完成；失败项可继续核实 |
| 停用 Agent | 拒绝新 Agent 操作，停止其拥有的运行与等待，保存数据 | Browser 等其他 owner 继续使用共享设施 |
| 关闭 Obsidian | 结束宿主管理的进程；保存可恢复元数据 | 不宣称宿主之外继续运行 |
| 重启 | 恢复 Space/Session/布局；旧运行显示已结束或失联 | 不自动重新发送提示词或启动历史 Agent |

区分四组状态：连接/运行状态、Agent 活动状态、未读状态、来源可用性。Agent 的工作中、空闲、待处理、未知来自可解释证据；原生事件优先，前台进程与屏幕检测只能按实际能力辅助。输出安静或进程存在均不能独自证明任务成功。完成提示和“是否看过”分别保存；查看终端只清理相应完成提示，不替 Agent 确认邮箱消息已读。

### 3.4 终端协作、等待与结果核对

协作路径为：发现目标 → 必要时启动 → 确认输入可用 → 输入文本并提交 → 等待状态 → 读取终端/检查产物。正常执行不要求另建持久任务对象。

- `prompt` 的语义是一次有顺序的“文本 + 提交”，成功回执只证明本次输入操作完成。用户键盘、粘贴与 CLI 输入共享仲裁，不能把两段文本交错成第三条命令。
- 已识别 working 不必等同拒绝；目标程序确实可接收输入且非 blocked 时可遵循其原生输入行为。HUHU 不因此承诺 TUI 队列中的任务顺序或结果关联，也不新增自己的持久待执行队列。
- 启动未就绪、已退出、前台程序/运行代次变更、无法确认安全提交或已知 blocked 时，普通 Agent prompt 明确拒绝。待处理权限问题不能被下一条协作 prompt 回答。
- `prompt + wait` 需使用提交前的运行身份及活动水位，避免直接把已存在的 idle 当作新活动已结束；它仍不追踪单个 turn。发送时已经 working 的场景必须在返回中保留该事实，调用者不能据此认定自己的输入已完成。
- 独立 `wait` 可以在当前状态已经匹配时立即返回；返回匹配状态和目标身份。blocked 是需要处理的结果，unknown 是无法判断，均不是任务成功。
- 等待超时、终止 CLI 或 Ctrl-C 只结束该等待，不默认停止目标。显式 stop 才请求终止。写入/启动响应丢失时保留可查询身份和“效果未知”，先检查现状，不能自动重发。
- `read` 默认是有界的权威终端文本/屏幕快照，包含运行身份、截断与查询位置。首轮不采用为读取而滚动原生 TUI 的主动历史抓取；更多原生正文走历史读取。屏幕输出不得冒充 Provider 的完整答案。
- Shell 的执行/原始按键是另一种明确终端操作，具有实际执行副作用。普通查询、定位面板和打开历史不得隐式运行命令。

### 3.5 作用域、CLI 与本机入口

采用 ADR-009：默认查询当前 Space，明确指定稳定目标后可以操作当前 Vault 其他 Space 的终端与面板。名称只用于发现；同名歧义要求选择，不猜测。跨 Vault 目标、外部未托管系统终端和已失效运行身份拒绝。

本机 IPC 以当前 OS 用户的受保护入口为边界，遵循 Herdr 的简单控制面；不添加“只允许管理自己创建协作者”的角色体系。当前 Vault、物理绑定、设备、实例和协议版本要能校验。普通路由环境变量不是认证凭据；同用户控制面也不是针对恶意同账号进程的沙箱。

Unix 使用受保护的本地 socket，Windows 使用限定当前用户/SYSTEM 的本地 pipe 或等价已验证机制；不开放公网 HTTP。确切传输实现可由实现者选择，但不能降低访问、寻址及关闭合同。locator、临时 socket、锁和认证设施按本机临时状态处理，不放入可携带业务备份；这不要求搬迁业务数据与账号。

| 能力组 | 首轮公共行为 | 结果要求 |
|---|---|---|
| 发现与诊断 | 版本、能力、连接诊断、当前 Vault/Space、列表/查询 | 失效 endpoint 与版本不匹配可区分；不自动启用模块 |
| Space / Session | 创建、列出、查询、重命名、归档、定位 | 明确持久身份；后台创建不抢焦点 |
| 面板 | 列出、附加、聚焦、分屏、布局调整、关闭视图 | 反馈目标布局；关闭视图不结束运行 |
| Terminal / Agent | 启动、输入、按键、读取、等待、停止、解释状态 | 身份/运行代次、实际阶段、能力限制与未知结果 |
| 通知 | 发送、列出、读取、确认 | messageId、未读状态、可分页；不启动模型 |
| 历史 | 查询、预览、定位、继续、显式导入/归属 | 来源状态与准确目标；预览无进程副作用 |

以上是目标语义，不是假称已发行的命令名。T 已在 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/implementation-contracts.md</Path> 固定计划 CLI v1 的命令、机器回执、错误分类及退出码；T-07/08 建立 schema 与黑盒契约测试，后续垂直票接入各自命令，T-17 校验帮助/示例/Skill 同源一致。它是未发行的实施约定；若工程调整改变外部行为，先回本 Spec 处理。不得沿用原输入的 `run submit`、`CROSS_SPACE_DENIED` 等已失效示例。

CLI 需要版本化机器输出、稳定可解析错误分类、stderr 人类诊断、stdin/文件传入长正文和有界分页。字段至少表达目标身份、操作阶段、状态/能力、是否截断、错误的已知副作用及下一步。不得通过解析本地化展示文案选择重试。明确区分未发生、部分发生、已完成和未知效果；不凭空承诺任务幂等。

配套 HUHU 控制 Skill 仅在明确操作 HUHU 终端时触发，使用真实发行 CLI 和能力发现结果，示例经过契约测试。首次未使用工作台时，外部 CLI 不负责唤醒整个模块；提示用户打开入口。只读发现不安装 CLI、不下载 helper、不启动 Agent。

### 3.6 通知邮箱与人工审批

通知保存正文与来源引用，面向 Session，不面向某个显示 Pane。发送成功代表通知已持久保存；读取可以查看而不确认，ack 才更新读取确认。ack 可重复，不能被解释为模型理解或任务完成。接收者停止时消息仍保留，不会因此自动启动；归档对象拒绝新的通知并说明原因，现有消息可查。

邮箱按稳定顺序分页；重复发送是否已发生不明确时先查记录，不盲重试。无需为通知附加任务 Outbox、自动上下文注入或 Run。正文/附件有界，引用读取仍核对来源与授权，不把任意机器路径开放成文件接口。

人工审批首轮采用“待处理提示 → 定位原终端 → 用户在原生 TUI 批准/拒绝”。原生事件可靠时可提供辅助摘要；无需每种 Provider 的结构化审批卡。协作自动输入不代替用户批准；已知审批阻塞时不执行普通 prompt。拒绝后按 Provider 的真实状态显示，不能改换后端重放。识别不可靠时显示未知与查看入口，不编造审批原因或自动放行。原有 Manual/YOLO 设置及其首次确认保留，不因重构自动改变。

### 3.7 历史与精确继续

右侧“本 Vault 会话历史”默认覆盖各 Space、归档会话和已可靠归属 Vault 的未归类记录。默认 Agent，可选择包含普通终端元数据。基本信息为标题、Provider、所属 Space/未归类、更新时间、运行/来源状态；标题搜索和 Provider/Space/时间/归档筛选首轮提供。正文支持情况、全文搜索覆盖和截断必须可见。

摄入按明确 HUHU 绑定 → 可验证 Vault 内真实 cwd → 用户显式导入精确来源的顺序判断。已授权库外 Space 的新 Session 按 Vault/Space 身份归属；不能据它的 cwd 顺手导入全账号的库外历史。最小元数据不足时只做有界解析，不把无归属正文写入当前 Vault 索引。索引重建不覆盖自有标题、收藏、标签、归档与来源引用。

预览只读；“打开会话”附加已有运行；“继续”才启动精确 native resume。继续前核对 Provider 能力、账号/设备来源、cwd 和原生引用；原生会话已被 HUHU 活动运行占用时定位原会话或报告冲突，不重复写入。本机跨 HUHU 实例的占用核对不能被单个 Vault 的表唯一键替代；不能约束不参与协议的外部 Provider 程序。

未导入历史预览不创建 Session；用户继续时明确选 Space，按完整 native reference 去重导入。来源丢失/损坏/版本不支持时保留元数据与标注并说明限制，不偷建空会话。Provider 只支持 fork 时明确创建新 Session 与来源关系。复制/导出恢复命令使用正确账号与字面 argv，不把不可信标题或路径拼成可执行 shell 片段。

### 3.8 持久化、备份与迁移

沿用项目两块数据根：HUHU 自有 Agent 数据及设备布局仍属于 `.huhu/terminal-agent/<device-id>/` 或该 owner 下的版本化子结构；系统账号沿用本机 CLI home，托管账号沿用 `.huhu/agents/`，helper 安装位置沿用现状。普通笔记与可见导出仍经 Vault API。此次不新建任务业务 SQLite 或要求业务数据迁出 Vault；历史 SQLite 可以继续作为可重建索引。具体文件拆分为实现细节，不能把多个业务文件同时提交声称成数据库事务。

| 数据 | 保存与恢复合同 |
|---|---|
| Space/Session、原生引用、标题/收藏/归档、通知与 ack、HUHU 已拥有的结果/标注 | 版本化自有业务记录；保存失败不回报成功；更新保留可恢复旧版本 |
| 布局、焦点、显示偏好 | 设备展示状态；不可据布局缺失删除会话或终止进程 |
| 原生 transcript、账号凭证 | 原 owner 保持；只读引用或原有账号服务管理；不自动打包或迁移 |
| 查询缓存/索引 | 可重建，来源失败可局部降级，不删除用户事实 |
| 活动 endpoint、锁、runtime、屏幕热状态 | 本机运行设施；重启/导入不恢复成仍在运行的事实 |

创建持久记录成功后才允许关联外部启动；持久化失败不先启动不可追踪的新进程。进程创建与记录写入不是一个原子事务：启动中断或关闭竞争通过运行身份核实、清理，不能伪造“全部回滚”。同一物理 Vault 同设备的并发写入只有一个活动 owner；第二个实例明确冲突，不覆盖 endpoint 或覆盖新记录。文件系统/同步冲突保留两份有效输入并报告，不用空默认值覆盖损坏文件。

导出提供版本化包与清单，包含 HUHU 实际存在的完整业务数据、布局、通知、标注、结果及来源引用；明确列出原生全文、登录凭证、正在运行的进程和可重建缓存等未包含项。导入先预检版本、摘要、身份碰撞、路径和来源，显示范围后原子切换可用版本或保留原状；不会自动启动 Agent，库外目录在目标机器重新核对授权。导出不创造当前不存在的 Run/Outbox 数据。

迁移遵循：停止旧 writer → 一致恢复副本 → 转换到新版本暂存 → 计数/身份/引用校验 → 切换单一 writer。保留旧 group/tab 布局；无 Space 的旧记录放入明确命名的导入空间；同 cwd 不合并。无法归属 Vault 的旧 account 索引/标注进入迁移报告与保留副本，不混入新 Drawer，也不静默丢弃。迁移按来源摘要可重入，失败不会重复导入。新版已有新数据后回滚需先停写与备份，旧程序不得写新格式；程序回滚不等于新数据已逆向转换。

### 3.9 原生资源与屏幕

PTY/runtime 的 owner 独立于 React、Pane 和 Space 可见性。共享 helper 的 PTY、历史和 Cookie 工作分别有 owner/能力使用记录；最后一个终端结束不等于所有原生消费者结束。Agent 停用只释放自身使用，Browser 正在读取 Cookie 时 helper 不能被误杀；全部 owner 释放后再退出。

屏幕使用现有 headless 作为权威解析模型；视图收到已解析快照与之后的连续增量。建立订阅、resize、重连、UTF-8/ANSI 边界、备用屏幕和 reset 都不得丢字或重复。设备查询只回答一次；可见 xterm 不能再把协议响应当用户输入回灌。多观察者只有一个明确的尺寸 owner，跟随视图不能来回争抢尺寸。

输出、输入、请求、历史页和缓存均有界；慢观察者可丢弃可重建展示帧再同步，不能丢未解析原始字节。单终端压力不能堵住其他终端、停止与退出事件。若 CLI gateway 经 Rust 转 TS 又调用 Rust，双向分派不得因等待响应占住整个读循环；磁盘扫描不得阻断控制通道。

关闭先停止接纳、取消未开始启动/等待、拒绝新输入，保留输出与退出事件处理直至确认或有限清理预算耗尽。迟到 spawn 仍须按准确身份清理。Host 崩溃通知各 owner，各自显示失联/查询失败；恢复 helper 不自动重放旧输入。

### 3.10 兼容与懒加载

| 消费者/旧能力 | 必须保持的外部行为 |
|---|---|
| `AGENT_PROMPT_RUNNER` | 现有一次性业务执行仍以完整原生答案返回；缺失/超大/无效结果明确失败；取消、执行期限、上下文租约撤销保持，不改成屏幕文本 |
| `AGENT_DISPATCH` / 自动化 runtime | 已有 invocation 去重与执行记录保留；fresh 执行，existing 只附加材料不回车；投递等待超时不冒充取消 |
| `AGENT_SESSIONS` / Browser 素材 | 在目标输入区完整附加一次，不自动提交；旧会话失效时准确失败 |
| Home 的 directory/skills/skill-catalog/quick-commands/usage | 入口、列表和启用行为继续存在；只读列表不启动 Agent，移动端轻量技能不被撤销 |
| `AGENT_WORKBENCH` / Shell 状态与标题 | 标题、后台工作/待处理、用量订阅可用；恢复与懒加载不会让入口静默消失 |
| Browser 标签与 Cookie | 网页原入口、标签/分屏体验、资料引用保留；无 Space、Agent 关闭时仍可用 |
| 原账号、Hook、技能与安装检测 | 登录引用/隔离、状态 Hook 的来源保护、技能副本标记、程序路径/参数、安装升级能力及安全边界保留 |

模块启用但从未使用时不创建 PTY、运行 Provider、扫描原生历史、下载 helper 或登记活动 gateway；轻量服务描述与必要宿主注册允许存在。首次打开工作台、历史或明确执行消费者用例才激活相关能力；每种能力按需取得资源。Browser 独立使用 native 不等于 Agent 被激活。单文件打包中的初始化懒加载不冒充物理 chunk 拆分。

## 4. 验收合同

下表均为待实现验收；原型、单元测试、真实 CLI 与真实宿主证据分别记录，不能互相替代。`V-*` 为 §5 的验证接缝。

| ID | 前置条件 | 动作或事件 | 可观察结果 | 验证接缝 |
|---|---|---|---|---|
| AC-001 | 无 Space | 新建空 Space | 记录存在；无 PTY/Agent；可重命名且 ID 不变 | V-01、V-08 |
| AC-002 | 两个 Space 同 cwd | 分别创建会话 | ID、布局、邮箱与归属独立；不按目录合并 | V-01、V-02 |
| AC-003 | 已选择合法库外目录 | 显式授权并启动/继续 | 使用该目录，历史仍归当前 Vault/Space；目录被替换/撤销时拒绝 | V-01、V-04 |
| AC-004 | 无目标或同名歧义 | GUI/CLI 创建或寻址 | GUI 引导选择；CLI 给缺目标/歧义结果；不猜 Space | V-01、V-02、V-08 |
| AC-005 | 已登记的六种 Provider/系统 Shell | 打开原有启动入口 | 账号/程序配置保留；缺程序或缺能力可解释；实际 CLI TUI 可操作 | V-03、V-08、V-10 |
| AC-006 | 当前 Space 有前台 A | CLI 后台创建 B | B 无可见 Pane 也运行/可查；不抢 A 焦点 | V-02、V-03、V-08 |
| AC-007 | 受管 Shell 手动启动 Agent | 检测前台程序 | 能力按证据更新；不支持时显示未知且保留原始终端控制 | V-03、V-06 |
| AC-008 | 已有活动 Session | 再打开/聚焦/附加 | 附加原 runtime；不启动第二个进程 | V-01、V-02、V-08 |
| AC-009 | 标签与分屏存在 | GUI 或 CLI 重排/分屏/聚焦 | 两端查询一致；目标稳定；不改变 Session 的 Space 归属 | V-01、V-02、V-08 |
| AC-010 | CLI 指向活动实例 | 发现/握手/能力查询 | 协议与 Vault/物理绑定一致；失效或错实例明确拒绝 | V-02、V-06 |
| AC-011 | 本 Vault 两个 Space | 默认查询与显式跨 Space 控制 | 默认范围当前 Space；明确目标可跨 Space；结果带原归属 | V-02、V-03 |
| AC-012 | 外 Vault/未托管终端/重用旧 ID | 发送或停止 | 无越界效果；错误说明目标不属当前实例或已失效 | V-02、V-06 |
| AC-013 | 输入就绪的 B | prompt 文本并提交 | 文本+提交顺序一致；返回输入阶段信息，不宣称任务成功 | V-02、V-03、V-06 |
| AC-014 | A/B 输入竞争 | 键盘、粘贴与 CLI 同时到达 | 操作不交错成第三条命令；取消未开始输入后不迟到提交 | V-03、V-06 |
| AC-015 | B 未就绪、blocked 或前台已改变 | 普通 Agent prompt | 明确拒绝；不向权限/登录界面注入任务正文 | V-02、V-03 |
| AC-016 | B 起初 idle 或已 working | prompt 后等待；单独 wait | 不把旧 idle 当新完成；独立 wait 可立即匹配；已有 working 情况可见 | V-02、V-03 |
| AC-017 | wait 中 | 超时、Ctrl-C、断开 CLI | 结束当前等待；B 继续；不自动重发/停止；查询仍可核对 | V-02、V-03、V-06 |
| AC-018 | 输出多于请求上限 | read/分页 | 输出有界，身份/截断/位置准确；不主动滚动 TUI 或把屏幕称为完整答案 | V-02、V-06 |
| AC-019 | CLI 控制面已实现 | 运行 help/schema/配套 Skill 示例 | 命令与发行版本一致；stdin 长正文可用；错误分类不依赖中文文案 | V-02、V-11 |
| AC-020 | 后台 B 遇权限提示 | 观察并打开待处理项 | 在 HUHU 定位原终端；用户能批准或拒绝并继续该会话 | V-03、V-08、V-10 |
| AC-021 | blocked/unknown 或用户拒绝 | 协作输入/处理权限 | 不自动放行、不换后端重放；未知准确显示；失败留查看入口 | V-02、V-03、V-08 |
| AC-022 | 新旧账号和 Manual/YOLO 设置 | 迁移/启动 | 保留选择与首次确认；不无声升级权限 | V-04、V-07、V-08 |
| AC-023 | 接收 Session 停止或运行 | 发送通知并重开界面 | 持久通知与未读可见；无 PTY 输入/模型启动 | V-01、V-02、V-07 |
| AC-024 | 有未读通知 | list/read/ack，重复 ack | 读取与确认分开；ack 重复无额外副作用；分页稳定 | V-01、V-02 |
| AC-025 | 归档目标、过大消息、失效附件 | 发送/读取 | 可判定拒绝或来源失效；未发生写入不报成功；效果未知不盲重发 | V-02、V-04、V-07 |
| AC-026 | B 在后台运行 | 关 Pane/Tab、隐藏/切 Space | 进程继续；可接回同一屏幕与运行；有后台提示 | V-03、V-06、V-08 |
| AC-027 | Session 活动运行 | 明确停止并发生退出竞争 | 区分请求和已退出；只处理目标代次；失败/残留可见 | V-03、V-06 |
| AC-028 | Space 含多个活动会话 | 归档或取消归档操作 | 取消无影响；归档先收束，部分失败不伪称完成；历史/消息保留 | V-01、V-03、V-08 |
| AC-029 | 原运行已停且新代次启动 | 旧 Hook/退出事件迟到 | 新状态、标题和终端不被旧事件污染 | V-03、V-06 |
| AC-030 | 中文 IME/多行/转义字符 | 输入、粘贴、中断与快捷键 | 保留现有输入保护；组字不提前提交；复制与中断语义不退化 | V-06、V-08、V-10 |
| AC-031 | 多视图观察同一终端 | resize/备用屏/reset/查询回复 | 尺寸 owner 明确；屏幕一致；设备回复一次 | V-06、V-08 |
| AC-032 | 正在输出并创建订阅 | 快照与增量并发、重连 | 无丢失/重复；UTF-8/ANSI 完整；失同步可重建展示 | V-06 |
| AC-033 | 多 Space 与归档/未归类历史 | 打开右侧历史 | 默认本 Vault 全 Space；可筛选；读历史不启动 PTY | V-04、V-08 |
| AC-034 | 同账号含其他 Vault 与库外历史 | 扫描/重建索引 | 不把无归属正文摄入当前库；授权库外 Session 依绑定归属 | V-04、V-07 |
| AC-035 | 来源失效/损坏/轮转/不支持 | 查询与预览 | 元数据/标注保留；准确缺失/部分/不支持；其他来源继续可用 | V-04、V-08 |
| AC-036 | 列表变化、滚动与搜索并发 | 翻页、刷新、切筛选 | 稳定分页或明确刷新；不静默重行漏行；结果与筛选一致 | V-04、V-08 |
| AC-037 | 历史对应活动或已结束 Session | 打开/继续 | 活动只附加；已结束精确 resume；保持 Session 身份、新代次 | V-03、V-04、V-08 |
| AC-038 | 同原生引用同时被继续 | 同/跨 HUHU 实例尝试 | 至多一个 HUHU 可写运行；其他定位或报冲突；无隐式 fork | V-04、V-06、V-10 |
| AC-039 | 来源/账号/cwd 不满足继续 | 点击继续 | 明确失败，不新建空会话替代；fork 仅显式操作 | V-04、V-08 |
| AC-040 | 原生历史未归类 | 只读预览、选 Space 导入 | 预览不建 Session；导入精确去重；保留源与归属证据 | V-01、V-04、V-07 |
| AC-041 | 无 Space 或 Agent 关闭 | 打开/恢复网页、导入 Cookie | 网页独立可用；Cookie 不激活 Agent；原入口/标签体验保留 | V-05、V-08 |
| AC-042 | 终端/网页/笔记素材 | 附加到已有会话 | 一次粘贴、不回车；就绪超时/会话失效准确失败 | V-03、V-05 |
| AC-043 | 自动化一次性执行 | 成功/无原生答案/取消/执行超时 | 原生完整答案及原失败语义保留；不以屏幕文本冒充答案 | V-03、V-05 |
| AC-044 | Home/Shell/自动化列表与快捷命令 | 读取、执行、重开与关闭 | 原服务消费者可用；existing 投递仍只粘贴；只读不启动模型 | V-05、V-08 |
| AC-045 | 移动端或桌面只读技能入口 | 激活/打开技能列表 | 轻量技能继续可用；无 Node/PTY/桌面控制器加载 | V-05 |
| AC-046 | 新建持久记录遇磁盘满/只读 | 创建 Session/保存通知 | 不返回成功；不先启动关联新进程；保留旧数据和诊断 | V-01、V-07 |
| AC-047 | 旧布局/标注/账号/技能/自动化数据 | 执行迁移预检与转换 | 导入空间、身份与旧布局可核对；敏感源和原生日志保持 | V-04、V-05、V-07 |
| AC-048 | 迁移损坏或中断 | 重开/重试迁移 | 保留源与恢复副本；不默认空对象覆盖；不重复导入 | V-07 |
| AC-049 | 新版已有新数据 | 回滚或恢复旧版 | 先保全新版；不允许旧 writer 写新格式；限制清晰 | V-07 |
| AC-050 | HUHU 业务数据含消息/标注/来源 | 导出后导入空环境 | 自有数据完整；清单明确外部正文/凭证缺项；不启动任何 Agent | V-07、V-08 |
| AC-051 | 包损坏/版本不支持/身份冲突 | 导入预检或写入失败 | 不覆盖有效数据；失败可重试/恢复；外部目录重新核对 | V-04、V-07 |
| AC-052 | 复制/移动 Vault、旧 endpoint | 激活和 CLI 发现 | 不误连接原实例；业务身份可恢复；物理绑定与授权可核对 | V-02、V-07、V-10 |
| AC-053 | 同物理 Vault 同设备两个实例 | 并发激活/写入 | 唯一活动 writer 或明确冲突；不互盖 locator/记录 | V-02、V-07 |
| AC-054 | 一终端持续高输出/慢观察者 | 同时操作其他终端/stop/resize | 缓存有界；其他控制可完成；慢视图独立重同步 | V-06、V-09 |
| AC-055 | native gateway、扫描与控制并发 | Rust→TS→Rust 回入 | 无全局读循环/锁死锁；控制和退出不被慢扫描挡住 | V-02、V-06 |
| AC-056 | disable 与 spawn/等待竞争 | 停用 Agent | 拒绝新动作；等待有界结束；迟到进程按身份清理 | V-03、V-05、V-06 |
| AC-057 | Browser 持有 native 能力 | 结束最后 PTY/停用 Agent | Browser 请求继续；全部 owner 释放后 helper 才结束 | V-05、V-06 |
| AC-058 | Host 崩溃 | 查询状态、恢复 Host | 各 owner 收到准确失败；屏幕/状态标失联；不重放输入 | V-03、V-05、V-06 |
| AC-059 | Agent 已启用但从未使用 | 插件启动、渲染非 Agent 页面 | 无扫描/下载/Provider/PTY/活动 gateway 副作用 | V-05、V-08 |
| AC-060 | 活动会话/网页布局 | 退出并重开 Obsidian | 进程随宿主退出；恢复记录/网页；Agent 需明确继续 | V-05、V-06、V-08、V-10 |
| AC-061 | 新 UI 宽/窄、亮/暗、长文本 | 主任务及键盘/200%缩放/减少动效 | 无无意横向溢出/遮挡；焦点可见与返回；状态非仅颜色 | V-08、V-12 |
| AC-062 | helper/CLI 协议或发布资产不匹配 | 下载/握手/离线复用 | 延续摘要校验；无效二进制不执行；明确兼容错误 | V-06、V-10、V-11 |
| AC-063 | 首个正式版候选 | 在五种 OS/架构执行场景 | 每组合有实际端到端证据；缺项不宣称正式通过 | V-10 |
| AC-064 | 源码、产物、帮助、许可、Spec | 交付一致性检查 | 用户文案 en/zh；旧示例被替换；改编来源许可可追踪；无 GPL 终端代码 | V-11 |

## 5. 验证策略

每个 AC 表中的多接缝共同提供必要证据。下面命令是后续实现的真实入口/先例，本次文档工作没有执行产品验收。缺失的新 CLI、Space、邮箱和迁移能力明确为待建设接缝，不把旧测试名称当作已覆盖新行为。

| 接缝 | 层级 / 入口与触发 | 覆盖合同 | 现有先例或命令 | Evidence 类型 |
|---|---|---|---|---|
| V-01 | Space/Session/布局公共服务；创建、附加、归档、保存失败 | AC-001–004、008–009、023–024、028、040、046 | <Path>src/modules/agent/services/workspace-service.test.ts</Path>、<Path>src/modules/agent/core/workspace/ops.test.ts</Path>；新身份/邮箱接缝待建设 | 返回值、持久文件、事件与故障注入 |
| V-02 | 新 CLI/IPC 黑盒进程；发现、寻址、输入、等待、断连、版本 | AC-002、004、006、009–019、021、023–025、052–053、055 | 现有 <Path>native/pty-server/tests/stdio.rs</Path> 是 stdio 先例；CLI/pipe/socket 契约测试待建设 | stdout/stderr/退出、目标进程效果、断连前后查询 |
| V-03 | Agent 执行/输入公共服务与实际 CLI | AC-005–008、011、013–017、020–021、026–029、037、042–043、056、058 | <Path>src/modules/agent/services/prompt-runner.test.ts</Path>、<Path>src/modules/agent/services/agent-runtime.test.ts</Path>；`pnpm exec vitest run src/modules/agent/services` | 原生事件、输入序列、退出与结果；真实 Provider 另记 |
| V-04 | 历史来源/目录/账号边界与恢复命令 | AC-003、022、025、033–040、047、051 | <Path>src/modules/agent/platform/desktop/history/scope.test.ts</Path>、<Path>src/modules/agent/platform/desktop/history/resume-command.test.ts</Path>、<Path>src/modules/agent/services/history-store.test.ts</Path> | 隔离 fixture、只读来源摘要、归属和恢复参数 |
| V-05 | 跨模块公开服务及启停 | AC-041–045、047、056–060 | <Path>src/modules/agent/api.ts</Path>、<Path>src/modules/agent/module.test.ts</Path>、<Path>src/modules/agent/services/prompt-port.test.ts</Path>、<Path>src/modules/browser/services/host.test.ts</Path>、<Path>test/automations/calendar-delivery.test.ts</Path> | 真实调用方结果、订阅与资源 owner 计数 |
| V-06 | headless/真实 PTY/helper；并发、分片、退出、崩溃 | AC-007、010、012–014、017–018、026–027、029–032、038、054–058、060、062 | <Path>src/modules/agent/services/terminal/session.test.ts</Path>、<Path>src/modules/agent/services/terminal/sessions.e2e.test.ts</Path>、<Path>native/pty-server/tests/stdio.rs</Path>；`pnpm run check:native`；`node scripts/verify-pty-helper.mjs <实际二进制>` | 解析后屏幕、序号、输入字节、进程退出、缓冲水位 |
| V-07 | 新数据版本、备份与导入迁移；磁盘失败/中断/重入 | AC-022–023、025、034、040、046–053 | <Path>src/shared/json-store.test.ts</Path>、<Path>src/shared/storage/vault-identity.test.ts</Path>、<Path>src/modules/agent/platform/desktop/agents/legacy-accounts.test.ts</Path>、<Path>test/golden/user-formats.test.ts</Path>；新增迁移/导入接缝待建设 | 原件/副本摘要、计数、身份映射、恢复演练 |
| V-08 | React 任务交互 + 真实 Obsidian 叶子/重启 | AC-001、004–006、008–009、020–022、026、028、030–031、033、035–037、039、041、044、050、059–061 | <Path>src/modules/agent/ui/AgentWorkspacePage.dom.test.tsx</Path>、<Path>src/modules/agent/ui/workspace/WorkspaceLayout.dom.test.tsx</Path>、<Path>scripts/obsidian-acceptance/workbench-probe.mjs</Path>、<Path>scripts/obsidian-acceptance/browser-cookie-import.mjs</Path> | DOM 证明交互；宿主截图/运行记录证明原生边界 |
| V-09 | 可控大输出与慢观察者负载；并发操作其他终端 | AC-054 | V-06 的真实 PTY 接缝；压力场景待建设 | 原始样本、工作量、缓存峰值、控制完成与端到端响应 |
| V-10 | Windows x64、macOS x64/arm64、Linux x64/arm64；隔离 Vault/测试账号 | AC-005、020、030、038、052、060、062–063 | <Path>.github/workflows/terminal-build.yml</Path>；<Path>scripts/obsidian-acceptance/terminal-reliability.mjs</Path> 为 Windows 真实下载先例，不能原样宣称覆盖其他平台 | OS/架构/CLI 版本、二进制摘要、真实任务、退出与恢复证据 |
| V-11 | 构建、协议/帮助、发行与来源核查 | AC-019、062、064 | `pnpm run build`、`pnpm run lint`、`pnpm test:architecture`、`pnpm test:i18n`、`pnpm test:docs`、`pnpm run check:notices`；新 CLI Schema/Skill 一致性待建设 | 实际退出码、生成物差异、兼容与来源声明 |
| V-12 | P 离线 UI 原型真实浏览器 | AC-061 的设计意图；辅助其他 UI AC | 当前 change 的 DESIGN 与 `prototypes/UI-001`；P 的物化/预览验证工具 | 1440/390、主题/键盘/缩放/状态截图；不能替代 V-08/V-10 |

选择规则以 <Path>.agents/skills/dev/references/testing.md</Path> 为准。生产 TS/TSX 修改才要求相应构建/lint；本次只运行文档与原型检查。没有真实 Provider 或五平台环境时，验收项保持待验证，不能用模拟状态动画或 CI 交叉编译代替。

## 6. 约束、非功能要求与风险

| ID | 合同 | 来源与验证 |
|---|---|---|
| NFR-001 | 每个输入/输出/查询/缓存有有限容量与可取消等待；达到容量时明确背压/拒绝，不无限增长 | 原文可靠性目标、Herdr 机制；V-02/V-06/V-09 |
| NFR-002 | 停止与关闭有限结束，残留/未知持续可见；失败不抹掉有效记录 | ADR-008、原文生命周期；V-03/V-06 |
| NFR-003 | 默认本 Vault、摄入前判定、敏感凭证不进入普通日志/argv/备份清单正文；诊断包含必要身份而非完整提示词与环境 | ADR-002/003/009、现有数据规则；V-04/V-07/V-11 |
| NFR-004 | 复用 xterm、现有组件和 Rust 发行；独立错误边界、类型化公开入口；不增加未经论证的运行服务 | ADR-001/008；V-05/V-06/V-11 |
| NFR-005 | 继承 HUHU 亮暗、字号、焦点和减少动效；终端热路径无装饰动画；用户文案通过 t() 双语 | UI 规则与 DESIGN；V-08/V-11/V-12 |
| NFR-006 | UI 状态、输入提交与业务成功严格分开；未知、部分发生、超时和残留均可定位 | ADR-004/008；V-02/V-03/V-06 |
| NFR-007 | 每个正式平台独立证据；遇到陌生功能先检索近两年活跃、许可明确的同类 GitHub 项目，比较机制、依赖和已知问题。实际改编逐文件核对许可/署名，不复制 GPL 终端或来源不明、不兼容代码 | ADR-001/007、用户最新要求、AGENTS；V-10/V-11；参考与票据逐项承接 |

不把原方案 §17.2 未实测的时延、内存、吞吐数字当作已批准发布门槛。后续性能验收先固定机器、容器尺寸、输出工作量、冷暖状态与原始样本；容量与超时默认值需公布、可回归验证，改变公共行为时更新相应合同。禁止以“实现者再决定”为由删掉有界性、可取消和控制优先级要求。

主要风险：原生 TUI/Hook 版本变化；状态误判；不完整屏幕快照；Windows 子进程回收；同时打开物理 Vault；旧 account 历史混入；共享 helper 错误回收；自动化结果合同降级。已分别绑定 AC 与验证接缝。终端中的 Agent 可改同一工作目录文件，HUHU 不提供事务化文件合并；调用者自行分工与核对产物。

## 7. UI 设计绑定与状态覆盖

当前设计采用用户已选择的 UI-001/final（candidate-a），继承现有 HUHU shell/token/组件。以下引用已经从获批工件与发布后的永久快照回读核对；下游消费时应再次核对摘要，不能仅凭文件名或 ready 字样接受漂移内容。

| 工件 | 固定版本与规范摘要 |
|---|---|
| <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/DESIGN.md</Path> | revision 1，approved；digest `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab` |
| <Path>{roots.state}/specdev/design/revisions/DESIGN-0001.md</Path> | DESIGN-0001，DS-001–DS-006；digest `ebaca5f2f15fe081bf393c892f8b6583d4f2c6ad12cd92cb55068005fe83a331` |
| <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/prototypes/UI-001/design-system.md</Path> | UI-001，ready，candidate-a；prototype digest `b8bcf55791eabb1d620c990e2aaaad49f7ccec9ab6a0f557e65ba3baa12fe1af` |

完整批准记录为 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/prototypes/UI-001/approval.md</Path>；发布、回读和浏览器证据由 UI-001 的 `evidence/preview-binding.json`、`publication-receipt.json`、`browser.json` 与 `validation.md` 保存。首次发布只涉及已确认的 6 条共享规则。

| 设计页面/任务 | 必需覆盖状态 | Spec 合同 |
|---|---|---|
| PAGE-001 终端工作台与 Space 导航 | 默认、空 Space、后台、停止、长名称、加载/失联、跨 Space 目标 | AC-001–019、026–032、054、059、061 |
| PAGE-002 本 Vault 历史抽屉 | 默认、搜索无结果、加载、部分来源失败、缺失、恢复/取消、只读预览 | AC-033–040、060–061 |
| PAGE-003 协作、通知与人工处理 | 发送/输入完成、等待/超时、blocked、拒绝、邮箱未读/读取/ack、失败重试 | AC-013–025、027、043、061 |
| PAGE-004 共享网页与恢复入口 | 网页标签、Agent 关闭、无 Space、重启继续、备份/迁移说明 | AC-041–042、047–053、057、060–061 |

这些是任务面，不要求四个新路由。原型通过同一页面的抽屉、对话框和状态演示覆盖 DESIGN 的 40 个状态，fixture 与模拟边界见原型包。S 已回读获批设计并固定引用；改变布局或交互导致摘要变化时，由对应 owner 局部更新并验证受影响内容，必要时重新确认。

## 8. 就绪结论与接续

- 产品范围：已确认至 Q10；用户已激活 G/S/P/T，并要求最终票据、研究先行与全面文档对齐。既有产品与设计确认无需重复；本轮仍不包含产品实现授权。
- Spec：11 个用户故事、64 项 AC、12 个验证接缝与 7 项非功能要求已形成可消费合同；高影响未决问题为零，`ready_for_tickets: true`。
- UI：UI-001 为 ready，DESIGN revision 1 为 approved；A 已采用，6 条首次永久基线经 A 网关发布为 DESIGN-0001，精确引用见 §7。原型证据只验证展示和模拟交互。
- 票据：<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/tickets-map.md</Path> 已将全部 64 项 AC 分配至 18 张完整 Ticket，每项有主要责任，UI 票固定 DESIGN 引用；逐票状态与依赖从原票回读。
- 编排：<Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/goal-plan.md</Path> 已形成正式计划，拥有 Gate/Wave、Agent Team 与用户指定的实现/review 模型安排；实际实现由获授权的 I 承接。后续必须完成真实 PTY、Provider、数据恢复和五平台等产品验收；本轮 plan 不自动实现、提交、推送或发布产品。

### 未决问题

无。

## 9. 文档一致性与下游使用规则

README 只导航与记录整体 Outcome；Spec 管外部行为；CONTEXT 管名词；ADR 管已采纳取舍；DESIGN 管已选择的视觉/交互；原型包管可运行源码/证据；implementation-contracts 管从 Spec 派生的跨票工程约定，Ticket 管本票交付且 Map 只导航；goal-plan 管跨票 Gate/Wave、团队与模型分工、调度和恢复；reference-notes 管研究证据；LOG 与输入只解释出处。后续资料时间较新但没有用户确认或没有对应事实，不能自动覆盖这些 owner。

本次保留原始输入字节与用户原答复。旧待答状态、旧实施阶段和推演仅作为历史，必须与下表处置一起阅读。产品实现前需要同步维护项目 `docs/agent-workbench.md`、`docs/data.md` 及受影响消费者文档；它们目前说明旧实现，不在这次纯规格/设计/票据工作中改成新功能已交付。T-01–18 已按实际改动分配对应文档维护，原型的历史验证记录仍只表示当时结果。

## 10. 原始方案处置映射

### 10.1 核心需求 U1–U7

| 原条目 | 最新处理 |
|---|---|
| U1 | 保留空 Space、稳定 ID、同 cwd 多 Space：AC-001–004 |
| U2 | 保留持久 Session 与真实终端；简化重叠实体：§3.1–3.2 |
| U3 | 以终端输入/状态等待/读取替换持久任务队列与关联结果；另保留被动邮箱：AC-010–025、ADR-008/009 |
| U4 | 保留当前 Vault 右侧历史、归属、预览与继续：AC-033–040 |
| U5 | 保留视图/进程分离及明确停止：AC-026–029、056–060 |
| U6 | 保留现有技术栈、公共边界和共享资源 owner；不强制五领域目录重写：NFR-004 |
| U7 | 保留账号/布局/标注/消费者与可恢复迁移：AC-041–053 |

### 10.2 原架构摘要 A01–A13

| 原条目 | 最新处理与依据 |
|---|---|
| A01 Session 脱离 Pane/PTY | 保留最小持久身份与运行代次；不据此引入业务 Run：§3.1、ADR-008 |
| A02 模块化单体/垂直领域 | 保留边界目标；具体文件布局由实现者决定：NFR-004 |
| A03 保留 TS/React/Rust | 保留，不更换终端引擎或桌面外壳：§2 |
| A04 Rust SQLite 新业务事务库 | 退出首轮前置；自有数据遵循当前 Vault 数据根，历史缓存继续按需使用 SQLite：§3.8 |
| A05 共享 NativeHost | 保留资源 owner 隔离和按能力取得/释放：§3.9 |
| A06 结构化适配优先 | 被终端优先替代：ADR-001/008；既有原生结果消费者保持 |
| A07 Message/Run/Receipt/Outbox | 任务平台退出；轻量通知/ack 保留，现有自动化账本保留：§3.6、3.10 |
| A08 右侧 Vault 历史 | 保留为首轮行为：§3.7 |
| A09 Rust Gateway 转 TS | 保留本机受控 IPC 与统一用例；传输实现不作为额外框架前置，回入不得死锁：§3.5、3.9 |
| A10 未激活 CLI 不自动唤醒 | 保留：§3.5、3.10 |
| A11 业务 DB/locator 全迁本机私有目录 | 业务数据/账号迁移撤回；仅活动 IPC/锁等运行设施是本机临时状态：§3.8、ADR-001/003 |
| A12 重启不重放任务 | 保留，适用于输入和外部副作用：AC-058、060 |
| A13 关闭视图 detach | 保留并覆盖 Pane/Tab；显式 stop/归档另有收束：§3.3 |

### 10.3 原测试场景 T01–T32

| 原场景 | 当前 AC / 处置 |
|---|---|
| T01 空 Space | AC-001 |
| T02 同 cwd | AC-002；通信边界更新为 Q10，不再只限同 Space |
| T03 后台协作 | AC-006、013、016、018；删除持久关联结果保证 |
| T04 同键 submit | 不再提供任务 submit 幂等；通知/ack 与现有自动化按各自合同验证，AC-024、043–044 |
| T05 commit 后响应丢失 | 新输入效果未知先核实、不自动重发：AC-017；不承诺返回原 Run |
| T06 投递崩溃 | AC-017、058、060；不再有任务队列/fence 数据模型前置 |
| T07 等待超时/Ctrl-C | AC-017；与现有执行期限区分 AC-043 |
| T08 cancel/completion 竞争 | 终端 stop 与退出核实 AC-027；保留旧一次性执行合同 AC-043 |
| T09 busy/blocked | AC-015–016、021；原生可输入 working 不自动排入 HUHU 队列 |
| T10 输入竞争 | AC-014、030 |
| T11 同步任务依赖环 | 没有持久任务 DAG；各 wait 必须可超时/取消，AC-017；不虚构全局环检测 |
| T12 停止/归档 queued | 无持久待执行队列；不自动唤醒，AC-025、027–028 |
| T13 关闭/切 Space | AC-026 |
| T14 重复恢复 | AC-037–038 |
| T15 迟到 Hook | AC-029 |
| T16 历史首屏 | AC-033 |
| T17 account 索引污染 | AC-034、047 |
| T18 来源异常 | AC-035、039 |
| T19 预览/继续 | AC-037、039–040 |
| T20 输出/慢观察者 | AC-054 |
| T21 快照/resize/查询回复 | AC-031–032 |
| T22 Rust↔TS 回入 | AC-055；不强制新的业务 DB |
| T23 disable/spawn | AC-056 |
| T24 Browser 导入隔离 | AC-041、057 |
| T25 Host 崩溃 | AC-058 |
| T26 磁盘满 | AC-046；保证先保存关联身份，不再宣称任务受理事务 |
| T27 同物理 Vault 多实例 | AC-053 |
| T28 复制 Vault/过期 endpoint/重名 | AC-004、010、012、052 |
| T29 非法路径/链接 | AC-003、025、039、051 |
| T30 迁移重入/回滚 | AC-047–051 |
| T31 未使用时无副作用 | AC-059 |
| T32 CLI/Skill 不匹配 | AC-019、064 |

原文附录 A 的任务类型、附录 B 的 `run submit` 与幂等任务示例、§16 的结构化 Provider/事务库实施顺序均由上述新合同替代。原文性能数字是历史建议。原文“仅同 Space”、Agent 自建协作者权限推演和未来独立 Chat 不再是当前限制。代码路径与研究证据保留在 LOG，不因此宣称已实现。
