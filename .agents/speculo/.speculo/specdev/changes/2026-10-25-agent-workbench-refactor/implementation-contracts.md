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

## 5. 数据演进与收缩条件

新自有数据继续属于 `.huhu/terminal-agent/` 的设备范围；账户、Hook、helper 和可见用户内容保持原 owner。T-02 只扩展版本化记录与隔离测试库，不直接覆盖旧 layout。T-15 在所有写入方明确后执行 stop-writer → 恢复副本 → 暂存转换 → 身份/引用/计数核对 → 单 writer 切换；T-16 导入复用同一预检与切换保证。

收缩条件是旧写入入口、旧 account 全量摄入入口和旧 Agent-owned browser/native 路由的实际引用扫描为零，真实调用方测试通过，原始数据/不可归属项有可回读报告。T-14 负责消费者兼容收缩，T-15 负责存储 writer 收缩。删旧代码不得删数据或去掉原测试代表的风险；新格式写入后回退必须先停写并保全新数据。

具体新文件名不是已存在事实；各票 expected_changes 是导航预测，新增目录在票中标为拟新增。若某实现需要越过写集或改变以上边界，由 Lead 回读上游并更新相应合同和受影响票，再继续。
