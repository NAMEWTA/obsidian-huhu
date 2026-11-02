# 跨票工程合同

本文件由 T 管理，只固定供实施使用的接线与公共接口默认值。外部保证仍由 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/spec.md</Path> 的 64 个 AC 拥有。以下 CLI 是**计划中的 v1，尚未发行、不可当作当前可运行命令**。T-07 负责 schema/实现，T-17 负责发行资产、帮助及使用 Skill 一致性；增加或改变行为时先回 S，不能仅修改本文件绕过 Spec。

## 1. 边界与接线

| 接缝 | 负责切片 | 固定约束 |
|---|---|---|
| 共享 NativeHost | T-01 | 由宿主生命周期拥有，懒取得 PTY/history/cookie 能力租约；模块停用释放自己的租约，最后 owner 退出才收束 helper。传输实现落在 <Path>src/host/desktop/</Path>，纯类型/端口可放 <Path>src/shared/</Path>；host 不反向导入 app/contracts 或模块。app/模块装配负责注入。 |
| 业务记录与单 writer | T-02 | Space/Session 是持久身份，runtime/Pane 是独立引用；保存成功后才允许启动。逻辑 Vault + 规范物理目录 + device/instance 校验活动 owner，不能只按复制过来的 Vault ID 定位。多个业务文件不伪装成原子事务。 |
| 运行与停止 | T-03/04 | runtimeId 每次启动唯一，PID 只作观察；close-view 不结束运行，stop 收束指定代次；归档先收束后写记录。重启只恢复记录，不自动 spawn/prompt。 |
| 屏幕 | T-05 | headless 为解析权威；快照携 runtimeId/contentSequence 与范围；订阅从同一水位接增量。多观察者只有一个尺寸 owner，设备回复只由 headless 进入 native I/O。 |
| 状态证据 | T-06 | 活动状态、连接、未读、来源状态分开；状态附来源、更新时间、runtimeId/activitySequence。unknown 不自动转 idle；完成提示 seen 不等于邮箱 ack。 |
| 本机控制 | T-07/08 | 独立 `huhu` Rust CLI 与现有 helper 同批构建，复用宿主控制协议；业务处理仍由 TS 用例拥有。Unix socket / Windows pipe 限当前用户，Rust→TS→Rust 不能同步阻塞读循环；关闭入口先拒新请求再收束已有操作。 |
| 布局与网页 | T-09/13 | GUI/CLI 消费同一布局服务；网页由独立共享承载保存与恢复，Agent 停用不关网页。UI 仅引用模块公开 api，保留既有 shell 三栏与 A 方案。 |
| 历史与备份 | T-11/12/15/16 | 原生正文只读、按引用恢复；HUHU 标注另存。迁移/导入先预检和恢复副本再切 writer；活动 endpoint、锁、凭证、运行不随业务包恢复。 |

共享函数名和文件拆分由 I 按现有惯例确定；表中的 owner、身份、动作和失败保证不能省略。新增契约的源与 schema 必须由同一处生成或契约测试比对，不能分别手抄 Rust/TS 两套字段。

## 2. CLI v1 计划语法

全局 `--json` 输出机器记录；`--instance <id>` 在已发现的本机 HUHU 实例中选择，校验 Vault/物理绑定。普通调用继承本 HUHU 受管终端的实例/Space 提示，但环境变量不是认证凭据。无上下文时明确选择，不扫描后猜一个实例，不唤醒 Agent 模块。

| 命令组 | 计划命令与主要参数 | 提供者 |
|---|---|---|
| 诊断 | `version`；`capabilities`；`doctor`；`schema` | T-07，T-17 完成发行与示例 |
| 空间 | `space list`、`space get --space <id>`、`space create --name <text> --cwd <vault-relative>` 或 `--directory <grant-id>`、`space rename`、`space archive` | T-02/04，经 T-07 接线 |
| 会话 | `session list [--all-spaces]`、`session get --session <id>`、`session rename`、`session archive` | T-03/04，经 T-07 接线 |
| 启动 | `terminal start --space <id> [--name <text>]`；`agent start --space <id> --provider <id> [--account <id>] [--name <text>] [--foreground]` | T-03/07；CLI 创建默认后台 |
| 终端 | `terminal get`、`terminal read [--cursor <token>] [--limit <n>]`、`terminal send-text --stdin` 或 `--file <path>`、`terminal send-keys --keys <keys>`、`terminal stop` | T-05/07/08；运行操作使用 `--session <id> --runtime <id>` |
| Agent | `agent list [--all-spaces]`、`agent get`、`agent explain`、`agent prompt (--stdin\|--file <path>) [--wait <state>] [--timeout-ms <n>]`、`agent wait --state <state> --timeout-ms <n>` | T-06/07/08；prompt/get/explain/wait 同样明确 session/runtime |
| 面板 | `pane list [--space <id>]`、`pane attach --session <id>`、`pane focus --pane <id>`、`pane split --pane <id> --session <id> --direction row\|column`、`pane resize --pane <id> --ratio <value>`、`pane close --pane <id>` | T-09；close 仅关闭显示 |
| 通知 | `message send --to-session <id> (--stdin\|--file <path>)`；`inbox list --session <id> [--cursor <token>] [--limit <n>]`、`inbox read --message <id>`、`inbox ack --message <id>` | T-10；读取不隐式 ack |
| 历史 | `history list [--space <id>] [--provider <id>] [--query <text>] [--cursor <token>] [--limit <n>]`；`history preview --source <ref>`；`history open --session <id>`；`history resume --source <ref> --space <id>`；`history import --source <ref> --space <id>` | T-11/12；未归类精确来源只可显式导入；resume 需通过权限/cwd/占用核对 |

T-07 提供统一路由和命令描述扩展接缝；尚未完成的能力不在 capabilities 中声明为可用，调用返回 unavailable，不返回伪造成功。T-09/10/11/12 的垂直切片必须把自己的 GUI/CLI 两端都接通，不能只交付孤立接口。上述稳定拼写是计划默认值；确需改名时由 T-07/T-17 同步本文件、schema、帮助、示例及测试，保持 Spec 语义。

`--directory` 只能引用用户已通过本机目录选择确认的授权绑定；CLI 不能通过任意 `--cwd` 字符串授予自己库外权限。Provider/account 是已有目录服务中的标识，不在 argv 放凭证。正文文件由 CLI 在明确请求下读入，不开放任意 server 文件读取接口。

本机 API 不提供“替用户批准 Provider 权限”动作；原生审批在 HUHU 内由用户操作。原始按键的控制权限不得让配套 Skill 在已知审批界面自动按下允许键。

## 3. 机器回执与错误

计划响应 envelope：`protocolVersion`、`requestId`、`ok`、`operation`、`target`、`phase`、`effect`、`data`、`error`。target 在可用时包含 vaultId/instanceId/spaceId/sessionId/runtimeId/paneId；不适用字段省略，不能以空字符串表示已验证身份。phase 是动作实际阶段，如 record-saved、launch-pending、input-submitted、state-matched、stop-requested、exited。

effect 仅取 `none | partial | completed | unknown`，描述本次操作的已知副作用；`input-submitted` 的 completed 也不表示模型任务成功。error 提供稳定 `code`、可本地化 `message`、可机读 `details` 与 `nextAction`，不由中文文案决定重试。requestId 用于相关性，不承诺跨崩溃任务幂等。

| 退出 | 错误/结果分类 | 使用规则 |
|---|---|---|
| 0 | 请求操作完成或 wait 条件匹配 | 回读 phase/data，不推导模型任务成功；blocked 若是调用者明确等待的状态可作为匹配返回 |
| 2 | `INVALID_ARGUMENT` | 格式、互斥参数、上限或不支持 schema 输入 |
| 3 | `TARGET_REQUIRED`、`TARGET_AMBIGUOUS`、`TARGET_NOT_FOUND`、`SCOPE_MISMATCH`、`STALE_RUNTIME` | 寻址失败/失效，无跨域副作用；不静默换当前目标 |
| 4 | `MODULE_INACTIVE`、`CAPABILITY_UNAVAILABLE`、`PROTOCOL_MISMATCH`、`CONNECTION_UNAVAILABLE` | 能力或连接不可用；诊断不自动启动模块 |
| 5 | `INPUT_NOT_READY`、`AGENT_BLOCKED`、`DIRECTORY_NOT_AUTHORIZED`、`OWNER_CONFLICT`、`SOURCE_UNAVAILABLE` | 现状不允许操作；返回明确处理入口 |
| 6 | `WAIT_TIMEOUT` | 只结束等待，目标继续；后续先 query/read，不自动重发 |
| 7 | `PERSISTENCE_FAILED`、`INVALID_IMPORT` | 保存或预检失败；保留旧有效数据与恢复信息 |
| 8 | `EFFECT_UNKNOWN` | 连接中断等导致动作可能已发生；携已知目标/阶段，不自动重试有副作用操作 |
| 130 | `WAIT_CANCELLED` | 用户中断等待；不是 stop，不重发输入 |

错误集合允许在同一协议 major 下追加文档化的细分类，但客户端必须认识顶层分类与 effect，不能假定所有非零退出都“未发生”。stdout 在 `--json` 下只给完整 JSON 记录；日志/诊断去 stderr，不输出 token、环境全集或完整敏感正文。

## 4. 有界性、等待与兼容

- limits 在 capabilities/schema 中公开：正文/帧、排队操作、屏幕读取、通知页、历史页与缓存的最大值。T-05/07 用项目既有边界和压力样本固定具体配置；不是承诺未经实测的时延或吞吐门槛。
- `prompt --wait` 在提交前捕获 runtimeId/activitySequence，操作回执之后观察新活动；独立 wait 可匹配当前状态。初始 working 需在回执保留，不能把之后 idle 解释成特定输入结果。
- wait 取消/断线只取消订阅；prompt 效果未知不能盲重放。snapshot cursor 是 runtime 内的有界视图定位，过期明确要求重取，不能跨代次复用。
- T-07 的协议 major1 与 T-17 的插件/helper/CLI 兼容表绑定；错 major 在任何业务副作用前拒绝。新增能力经 capabilities 发现，未实现字段不提供假值。
- `AGENT_PROMPT_RUNNER` 和自动化现有原生全文结果/执行期限/取消/去重仍走原业务合同；上述 terminal read/wait 不替代它们。

### 4.1 旧业务入口的明确 Space（LOG-030）

T-02 提供可复用 Space 列表/精确解析与选择接缝；T-03 提供先提交 Session 再启动的生产用例；T-14 将原业务消费者迁入这些用例。`AgentPromptRequest`、fresh dispatch、持久 automation agent/script action 和 terminal quick-command 按实际调用路径携带稳定 spaceId。旧文档可读并保留未绑定状态，不能把兼容读取解释为允许无归属启动。

交互流程在创建/接纳新的 invocation 前完成选择，取消无进程、无已接纳投递；保存绑定只在用户已明确确认的原配置 owner 中进行。后台无绑定/归档/删除/授权失效返回明确需要配置的错误，不弹出无人可处理的自动确认、不暂停后盲重试。已有 session 由完整稳定 ID 解析其原 Space，输入不能改变归属；fresh 请求不得根据 cwd 合并。绑定在调用开始时冻结，后续 UI 切换不参与重算。

invocation identity 包含显式 Space；同 invocationId 携不同目标继续按原冲突语义拒绝。旧 invocation/receipt 作为历史保留，不能为补 spaceId 改写已经接纳的旧请求或重放；用户配置后发起新的明确调用。一次性结果仍由原生结果通道返回，所有 runtime 可按 Session/Space 定位和停止，历史继续使用完整来源tuple。T-15 对旧自动化/快捷定义保留“待选择 Space”，不靠迁移导入空间或 cwd 自动补绑定。

## 5. 数据演进与收缩条件

新自有数据继续属于 `.huhu/terminal-agent/` 的设备范围；账户、Hook、helper 和可见用户内容保持原 owner。T-02 只扩展版本化记录与隔离测试库，不直接覆盖旧 layout。T-15 在所有写入方明确后执行 stop-writer → 恢复副本 → 暂存转换 → 身份/引用/计数核对 → 单 writer 切换；T-16 导入复用同一预检与切换保证。

收缩条件是旧写入入口、旧 account 全量摄入入口和旧 Agent-owned browser/native 路由的实际引用扫描为零，真实调用方测试通过，原始数据/不可归属项有可回读报告。T-14 负责消费者兼容收缩，T-15 负责存储 writer 收缩。删旧代码不得删数据或去掉原测试代表的风险；新格式写入后回退必须先停写并保全新数据。

具体新文件名不是已存在事实；各票 expected_changes 是导航预测，新增目录在票中标为拟新增。若某实现需要越过写集或改变以上边界，由 Lead 回读上游并更新相应合同和受影响票，再继续。


## 6. 跨 owner 业务包与恢复（LOG-029）

T-15 提供迁移的严格停写、恢复副本、暂存、校验、可恢复切换与启动恢复门；T-16 将现有 automations、notifications 等真实 owner 接入同一协议。各模块只通过自己的 api 暴露受控操作，app 负责装配，shared 只承载纯协议/恢复状态机；不让 Agent 读取或改写别的模块私有状态，不新增 Run 平台/业务数据库。

### 数据范围与身份

包清单按 Vault、源设备和 owner 枚举实际存在的全部相关集合：Space/Session/mailbox及ack，设备与共享网页布局，历史标注及完整账号/设备/native引用，自有统计与automation-session登记，agent设置的可携带部分，现有automation definitions/runs/cursors/invocation request/receipt/完整结果/usage/timeline/taskDelivery，以及 notifications 的 records/read/receipts（含已删除可见通知的去重墓碑）。通知清单明确包含整个 HUHU 通知集合；自动化定义由原 Markdown 仓储导出，来源笔记仅保留引用。不凭运行缓存替代定义原件，不漏掉非当前设备的已存相关业务集合；不能安全取得某集合就报告不可用/BUSY，不能静默给空数组或声称完整。

源 device 作为 provenance，不覆盖目标设备身份。导入清单明确源到目标设备/Space/Session的映射；默认保留业务ID，当前设备展示布局从用户明确选择的源设备采用，其他设备状态保留来源归档。首版接受空目标或同摘要的幂等重试；不同内容的身份碰撞在写有效数据前拒绝，不自动合并、重命名或覆盖。数据库缓存、原生全文/account home/登录凭证、浏览器Cookie/缓存、helper/CLI、活动endpoint/锁/runtime/热屏不恢复。包中路径只作声明，不决定任意磁盘读写位置。

### 活动与一致性

迁移、导入和导出先对全部参与 owner 执行 preflight；有活动 PTY/Agent/automation action 或无法冻结的 writer 时返回 BUSY 并列出工作，不替用户停止。无活动工作时短暂关 admission、排空已接纳持久写入，再共同快照/暂存；普通查询不启动 Provider、scheduler 或 native 扫描。冻结与排空有界，超时/失败撤销门禁并保留有效旧数据。其他设备/实例的活动 owner 或快照期间外部源摘要漂移同样拒绝，不能把跨进程一致性当作单进程锁已解决。

最小公开语义为：inspect/preflight → quiesce(token) → strict drain → snapshot 或 stageRestore → commit/adopt → release/abort。所有参与 owner 关门并排空后才取共同快照；不能边解锁边读取下一 owner。drain 对 workspace/stats/history/settings/registry/notifications 的写入失败必须 reject，既有吞错flush不能作为成功证据。quiesce覆盖内存 mutation、UI/CLI/后台入口和晚到回调；已接收操作应完成或准确失败，不能静默丢弃。

恢复 journal 记录 operation、参与文件的旧/新摘要与阶段；所有 staging/恢复副本先验证，再提交。多个真实目录不声称靠一次 rename 原子切换：相关 reader 在 adoption 完成前受门禁约束；中断后在业务 owner 加载前从 journal 恢复全旧或全新版本，无法确定时保持恢复门并给报告。全部 owner 的内存、写队列、JsonStore基线/设置namespace缓存必须同步采用，防止旧缓存下一次写回覆盖恢复结果。仅更新 agent 设置 namespace，其他模块设置不受覆盖。

### 无副作用恢复与权限

恢复不调用正常 invoke、publish、spawn、schedule action、浏览器导航或用户脚本。原活动状态作为来源事实保留，恢复后呈非活动/待确认；导入操作和下一次启动都不能补执行历史任务、补发消息或自动启动 Agent。导入定义的自动执行保持停用，保留来源启用意图供用户明确恢复；必要的禁止补发/provenance标记属于原 owner 恢复元数据，不把未发送的通知伪称 sent。原 invocationId 同请求仍返回原 receipt、异请求仍冲突；导入不经普通提交的历史裁剪路径，不遗漏包中存在的记录。

可携带 agent 设置采用白名单codec：保留外观、普通命令文本、Provider/account标识引用及权限模式意图；排除结构化 env 值和凭据，清单列出未导出的字段类别（不输出秘密）。目标机器的外部目录授权、账号可用性和首次YOLO确认必须重新核对，不能通过导入自动授予。权限模式意图与有效授权分开，不能无声提升权限；普通命令文本不靠内容猜测任意删改。

具体已有位置与风险依据见 <Path>{roots.state}/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/backup-owner-analysis.md</Path>。其中“建议”已由本节落定的内容优先；原分析不替代生产实现或测试。
