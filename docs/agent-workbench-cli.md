# 工作台本机 CLI

`huhu` 通过当前用户可访问的 Unix socket 或 Windows named pipe 操作当前 HUHU 工作台。CLI 不会自动启用 Agent 模块、启动 helper 或下载程序；首次使用先在 Obsidian 打开工作台。此处描述协议 v1；发布资产与兼容规则见“发布资产与兼容”，HUHU 只在自己启动的终端环境里注入 `PATH` 与 `HUHU_CLI`（见“终端里如何找到 huhu”），不修改用户的 Shell 配置、全局 PATH 或账号技能目录。

## 身份与目标

每个新 Shell、Agent 和一次性运行都必须绑定有效 Space。受管终端继承已经捕获的 Vault、实例和 Space 提示；它们只帮助寻址，不能代替认证。普通外部终端没有上下文时必须明确选择实例与 Space；即使只有一个候选，也不会按当前目录或 GUI 焦点猜测。

Space 名称用于发现，稳定 ID 用于操作。同 Vault 可明确寻址其他 Space；已指定 Session ID 时解析它原有的 Space，不能借输入改变归属。操作现有运行的查询、读屏和停止还须携带当前 runtime ID。跨 Vault、复制 Vault 后的旧物理绑定、错误实例和过期 runtime 都会在业务效果前拒绝。

`HUHU_STABLE_SESSION_ID` 是持久 Session；`HUHU_SESSION_ID` 是当前 runtime。请保留受管环境的路由变量，不把变量当认证令牌，也不要把 locator 或认证资料放进备份。

## 命令

使用 `--json` 读取机器回执。例如本地构建完成后：

```sh
./native/pty-server/target/debug/huhu --json version
./native/pty-server/target/debug/huhu --json schema
./native/pty-server/target/debug/huhu --json doctor
./native/pty-server/target/debug/huhu --json space list
./native/pty-server/target/debug/huhu --json session list --all-spaces
./native/pty-server/target/debug/huhu --json terminal start --space <space-id>
./native/pty-server/target/debug/huhu --json terminal get --session <session-id> --runtime <runtime-id>
./native/pty-server/target/debug/huhu --json terminal read --session <session-id> --runtime <runtime-id>
./native/pty-server/target/debug/huhu --json terminal stop --session <session-id> --runtime <runtime-id>
```

Windows 对应程序名为 `huhu.exe`。`version`、`schema` 和帮助可离线运行；`doctor` 和 `capabilities` 只报告当前实际连接与能力，未开启模块或未注册入口时准确失败。完整帮助和 schema 与协议描述同源。

本切片接入 Space 的列出、查询、创建、重命名和归档；Session 的列出、查询、重命名和归档；Terminal 的启动、查询、读屏和停止；Agent 的启动、列出、查询及状态解释。CLI 创建默认后台，不创建可见 Pane，也不抢走用户焦点；只有显式前台意图且仍有效时才显示。被动邮箱的 v1 协议、限额和 CLI 帮助已冻结；`message.send`、`inbox.*` 已完成 owner、handler 与协议接线，canonical capability 已启用。

普通提交、等待、原始文本与命名按键已接入；邮箱协议、业务 handler 与生产消费者已闭合。命令描述存在不等于当前能力可用；以 `capabilities` 为准。未注册能力返回 `CAPABILITY_UNAVAILABLE`，不会伪造成功。普通 get/read/explain 不附加视图、不清理未读提示、不刷新 Provider 目录。

创建 Space 的 `--cwd` 仅指 Vault 内相对目录；库外目录使用用户已经确认的 `--directory <grant-id>`，任意 cwd 字符串不能授予权限。Provider/account 使用原目录服务的标识，argv 不放凭据。

## 历史

```sh
huhu --json history list (--space <space-id> | --unassigned) [--provider <id>] [--query <text>] [--filter all|active|archived|favorite] [--limit <n>] [--cursor <token>]
huhu --json history preview --space <space-id> --key <key> [--source-ref <ref>]
huhu --json history import --space <space-id> --source <source-ref>
huhu --json history resume --space <space-id> --source <source-ref>
huhu --json history open --session <session-id>
```

在 HUHU 受管终端里（环境里有 `HUHU_SPACE_ID`），普通的 `history list`、`history import`、`history resume` 会沿用该环境的 Space；`history list --unassigned` 不会附加环境 Space，因此在受管终端里也能直接使用。`--space` 与 `--unassigned` 二选一（同时给出为 `INVALID_ARGUMENT`），不从界面焦点或当前目录推断。`--unassigned` 只列出当前库投影里尚未归属任何 Space 的行（库外且未绑定的记录不在投影内，因此不会出现），行里没有 `spaceId`，其 `sourceRef` 供 `history import` 使用。缺失为 `TARGET_REQUIRED`（退出码 3），未知 Space 为 `TARGET_NOT_FOUND`。列表只含持久绑定到该 Space 的历史行，同 cwd 的其他 Space 或未归属记录不会出现；读取历史不会启动任何终端或 Agent。会话尚未扫描过时，首次调用会先做一次有界的扫描与归属绑定。

列表行只含公开字段：`key`、`sourceRef`、`agentId`、`sessionId`、`title`、`cwd`、`modifiedAtMs`、`spaceId`、`sourceStatus`、`sourceReason`、`favorite`、`archived`；不返回账号环境字段、转录路径字段或 Provider 来源清单。`key` 与 `sourceRef` 是不透明的稳定标识，内部包含账号引用和转录位置，只用于回传给 `preview`，请不要解析或在日志里公开；`cwd` 与 `title` 会被截断到有界长度。`--limit` 为 1–1000（默认 100），实际页会收缩到响应 49152 字节以内，请始终以 `nextCursor` 判断是否还有下一页。cursor 记录原生索引中下一行的准确位置，并绑定原查询（`--query`、`--filter`、`--provider`）、索引修订和标注修订；任一变化后返回 `STALE_RUNTIME`（退出码 3），应从头重新列出。`--limit` 越界为 `INVALID_ARGUMENT`（退出码 2）。

`preview` 的 `key` 来自 `list`；给出 `--source-ref` 时必须一致。未绑定到该 Space、来源不一致或已不存在为 `TARGET_NOT_FOUND`。回执 `status` 为：`available`（完整正文）、`partial`（正文因响应上限被截断，`reason` 为 `response-capacity`）、`unavailable`（`text` 为空，`sourceStatus` 为 `missing`、`changed`、`unsupported`、`permission-denied` 或 `unknown`，`sourceReason` 说明原因）。读取时才发现的来源变化同样返回 `unavailable`，不会返回未经核对的内容。

### 导入、继续与打开

`--source` 是 `list` 返回的 `sourceRef`（不透明，不要解析）。三条命令都经过与历史抽屉相同的服务路径，且只在明确给出 `--space`（`open` 为 `--session`）时执行，不按界面焦点或 cwd 猜测。

- `import`：把一个未归属的精确来源绑定到你指定的 Space（先用 `history list --unassigned` 找到它的 `sourceRef`；该 Space 授权的目录必须正是这段对话的工作目录，否则以 `DIRECTORY_NOT_AUTHORIZED` 拒绝，且不留下任何绑定），并保存来源与归属证据（Provider、账号命名空间、设备、原生会话 ID、来源引用）。完整原生引用相同即同一条记录，重复导入返回同一 `sessionId`（`created: false`），标注不受影响；同一来源已属于另一个 Space 为 `OWNER_CONFLICT`（退出码 5）。预览（`preview`）从不创建 Session。回执 `phase` 为 `record-saved`，`data` 含 `spaceId`、`sessionId`、`created`。
- `resume`：来源必须已导入该 Space（否则 `SOURCE_UNAVAILABLE`，退出码 5，不会新建空会话顶替）。对应运行仍在时只定位并附加（`phase: running`，`data.mode: attached`），不会再启动；已结束时按 Provider 的精确恢复参数（字面数组，不拼 shell 字符串）启动同一个 Session 的新运行代次（`phase: launch-pending`，`data.mode: resumed`，`runtimeId` 为新代次，`previousRuntimeId` 为上一代次）。CLI 默认后台启动，不抢焦点；首次需要权限确认的 Provider 返回 `AGENT_BLOCKED`，由用户在界面确认。
- `open`：定位一个已有 Session 的原生历史。运行中则附加其显示（`data.state: live`，`attached: true`），否则只描述（`ended` 或 `unconfirmed`），不启动任何进程。

`resume` 在启动前按顺序核对：来源状态、Provider 是否支持恢复与是否启用、账号/设备引用与转录、工作目录是否正是该 Space 授权的目录（`DIRECTORY_NOT_AUTHORIZED`）、原生引用占用。任何一项不满足都会明确失败，不创建 Session、不启动进程、不释放无关的锁。上一次运行未确认结束（连接丢失等）时拒绝继续（`SOURCE_UNAVAILABLE`）。

同一条原生对话在本机至多一个 HUHU 可写运行，跨 HUHU 实例和不同的库都有效：占用以提供方的真实存储位置（转录文件的规范真实路径）加原生会话 ID 为准，与库、设备标识或库内账号根无关，所以两个库共用同一个系统账号时也只有一个能继续。其他实例已占用时返回 `OWNER_CONFLICT`，回执的 `message` 是本地化的说明；占用者的 Space、Session 与实例标识目前只出现在 GUI 的提示里，协议回执尚不携带 `details`（已记为后续协议工作），不会隐式分叉出第二个运行。标签页的“恢复会话”、自动化的指定会话续接（旧定义没有保存转录路径时，从当前库的历史投影里查找，找不到则明确失败），以及新启动的会话（一旦知道原生会话 ID 和转录路径就取得占用）走同一把占用，被占用时同样被拒绝（自动化为 `busy`）。占用记录保存在用户级的操作系统应用状态目录（不在库内，位置见[库之外的数据](data.md#库之外的数据)），只有占用进程被证实已退出才会被接管；无法核实时一律按冲突处理。

## 面板与布局

以下六条命令通过原 WorkspaceService 与布局 owner 执行，实际可用性以 `capabilities` 为准。布局引用与运行 Session 分开管理。

```sh
huhu --json pane list --space <space-id> --limit 25 --cursor <cursor>
huhu --json pane attach --session <session-id>
huhu --json pane focus --pane <pane-id>
huhu --json pane split --pane <source-pane-id> --session <inserted-session-id> --runtime <inserted-runtime-id> --direction row
huhu --json pane resize --pane <pane-id> --ratio 0.35
huhu --json pane close --pane <pane-id>
```

`pane list` 的 `--space` 缺省时只冻结原受管环境的 Space 提示；无提示就明确要求目标，不按 cwd 或 GUI 焦点猜测。`limit` 沿既有 1–1000 整数范围，`cursor` 沿既有限长不透明字符串；使用原有有界 cursor 池，按完整 49152B 回执缩页；真实布局（含 GUI 未保存编辑）版本变化后旧 cursor 失效，跨 Space、scope 或 limit 查询不能复用。查询不取 writer、不写盘、不生成 Pane ID。

其它面板命令必须显式给出 `--pane` 或 `--session`，不继承调用者的 Session/runtime，也不自动附加调用者 Space；显式传入的 Space 仍须与目标原归属一致。Pane ID 是区分大小写、保留 Unicode 的不透明标识，兼容 `lp1.`，允许至多 4096 个 UTF-8 字节；不把 UUID、标题或分屏路径当唯一合法格式。CLI 拒绝 U+0000–001F 和 U+007F、超长 ID、重复 flag、缺值、未知字段与 `--` 位置参数，不裁剪或折叠标识。以 `--pane=--help` 可保留形似 flag 的字面 ID。

通用 wire 解码只校验 DTO 形状与字节边界；能解码转义控制字符不代表 Pane 身份有效。实际路由和布局 owner 使用同一身份规则校验，不能绕过 CLI 直接提交非法 ID。

`pane attach` 只附加已有 Session 的显示引用，重复附加幂等，不启动进程或抢输入焦点；输入焦点另由 `pane focus` 明确请求。`pane split` 在源 Pane 旁插入明确的第三 Session，`--direction` 仅为 `row|column`；可选 `--runtime` 约束插入 Session，源 Pane 的显示代次独立捕获。不得把 GUI 的“创建新 Shell 分屏”快捷动作当作这个命令。

split 请求中的 `target.paneId` 是源 Pane，而 `target.sessionId/runtimeId` 是插入目标。响应的顶层 `target` 必须回到源 Pane 原有完整 tuple；`data.insertedPane` 单独给插入 Pane/Session 的身份。下面仅为协议示意，固定夹具也明确标注示例身份，不是实际 handler 回执：

```json
{
	"target": { "spaceId": "B", "paneId": "pane-B", "sessionId": "session-B", "runtimeId": "runtime-B" },
	"data": {
		"insertedPane": { "spaceId": "B", "paneId": "pane-C", "sessionId": "session-C", "runtimeId": "runtime-C" }
	}
}
```

`pane resize --ratio` 是目标叶最近父 split 中、包含该叶的子树份额；目标在第二侧时对应模型中的 `1-ratio`。公开范围为 **0.15–0.85（含端点）**，非法数值、NaN、Infinity 或越界拒绝，不静默 clamp；无父 split 应准确报告没有比例效果。`pane close` 只 detach/fold 显示，不 stop、archive 或删除 Session。变更回执包含 `layoutPublished`、`persisted`、`revision`，以及 `pane`/`insertedPane` 的完整身份 tuple；不会重复列表中的标题和内部布局材料。`effect` 保留原 owner 的 none/partial/unknown/completed：已发布、在途写和确认保存后的呈现失败不会被抹为 none。focus 只有原终端叶实际消费一次性呈现请求才返回 `focused: true`；选中布局但未取得真实输入焦点只返回 partial，停止记录不会自动启动。

## 被动邮箱协议（v1）

协议保留四个独立操作：

```sh
huhu --json message send --to-session <session-id> --stdin [--message <message-id>]
huhu --json message send --to-session <session-id> --file <path> [--message <message-id>]
huhu --json inbox list --session <session-id> [--cursor <token>] [--limit <n>]
huhu --json inbox read --message <message-id>
huhu --json inbox ack --message <message-id>
```

`--stdin` 和 `--file` 只在 CLI 本地读取有限正文；宿主不会按本机路径打开文件。正文上限为 16KiB UTF-8，`messageId` 上限为 128 UTF-8 字节，source 上限为 512 字节，引用最多 8 条且每条完整 JSON 不超过 1KiB。超出边界在连接前拒绝。

收件人必须显式选择 Session；没有目标时要求选择，不按 cwd、当前界面或调用者的 `HUHU_STABLE_SESSION_ID` 猜 Space。`--to-session` 与 `--session` 同时出现会拒绝。发送省略 `--message` 时，CLI 在读取 stdin/file 和本地 IPC 前生成一次业务 messageId；`requestId` 仍只是请求关联 ID。生成 ID 后的本地读取、断线、超时或取消失败，会在 JSON `error.details.messageId` 和普通 stderr 中保留该 ID。读取不会确认；重复确认返回 `already-acked`/`none` 的业务事实且不产生额外写入。四项能力已完成真实 owner、handler、CLI 与生产消费者接线，并由 canonical capability 宣布可用。

## 提交、等待与原始输入

```sh
huhu --json agent prompt --session <session-id> --runtime <runtime-id> --text '完整任务正文' --wait done
huhu --json agent prompt --session <session-id> --runtime <runtime-id> --file <path> --wait done
huhu --json agent wait --session <session-id> --runtime <runtime-id> --state done
huhu --json terminal send-text --session <session-id> --runtime <runtime-id> --text '只粘贴材料'
huhu --json terminal send-text --session <session-id> --runtime <runtime-id> --stdin
huhu --json terminal send-keys --session <session-id> --runtime <runtime-id> --keys 'Enter'
```

`agent prompt`、`terminal send-text` 和 `message send` 都必须在 `--text <text>`、`--stdin`、`--file <path>` 中选择一种正文来源，不能组合。stdin/file 在本地读取非空 UTF-8，保留多行和末尾换行；读取最多正文预算加 1 字节，文件路径不会交给宿主。通知预算为 16384 字节，prompt/send-text 为 262144 字节；最终完整请求仍须符合 32768 字节 JSON 帧限制，转义后的正文和目标身份也占该帧预算，超限以 `CAPACITY_EXCEEDED` 在 IPC 前拒绝。

`--timeout-ms` 也限制本地正文读入，默认 30000 毫秒；完成读入后，请求观察另用相同的超时预算。上游管道未关闭或正文文件是等待写入的 FIFO 时，本地超时返回 `WAIT_TIMEOUT`/6，Ctrl-C 返回 `WAIT_CANCELLED`/130，均为 `effect: none`，不连接目标、不发送正文。通知的失败回执保留读入前分配的 `messageId`。

普通 `agent prompt` 首版仅支持 Linux、经过完整文件校验的官方 Pi 1.4.0 / Jiti 2.7.0 与 regular TUI。用户必须已有 `-ne` 或 `--no-extensions`，且唯一显式扩展是当前 HUHU 生产扩展；启动参数不会被改写，也不会替用户关闭其他扩展。默认模式仍须在运行时核验原始 regular TUI 与默认编辑器。全屏、其他版本、其他 Provider、未认证连接或不能确认的编辑器状态保留人工终端操作。

校验绑定实际 helper 的最终继承环境、原启动 file/argv/cwd、Node 与入口身份，以及 Pi/Jiti 完整文件闭包。改变 Node/Jiti 加载行为的环境不取得普通提交资格；明确的 `JITI_FS_CACHE=false` 可用。当前 profile 对 Pi 包内部 `node_modules` 仅允许 Jiti 的保守布局；含其他嵌套依赖的普通 npm 布局可能不能取得资格，人工启动照常。不会靠版本号、PATH 中碰巧同名的程序或终端标题猜测资格。

提交只调用已认证的原编辑器事务一次。已知权限/问题阻塞、登录或设置选择器、焦点不满足、草稿、未闭合粘贴和不明确的输入模式会在输入前拒绝。已观察到历史跳转、异步剪贴板或外部编辑器等状态、且公开 API 无法证明它们清除时，该连接持续不可用于协作提交；不会清除草稿或改变人工操作。活动阻塞为 unknown 只表示尚无阻塞起止事实，仍须原编辑器在最终同步检查中证明安全。

`adapter-applied` 回执仅证明原编辑器接受本次提交；`pty-written` 仅证明原始文本或按键已写入 PTY，两者不可互换。原始文本不附加 Enter；需要提交时用户另发明确命名按键。普通提交不可用时不会自动退回 raw 输入，也不自动批准原生权限。

等待状态包括 idle、working、waiting、permission、done、failed、interrupted、unknown、blocked。`done` 只表示原生活动结束，不证明任务结果正确；请读屏或检查产物。`interrupted` 是目标原生活动被中断的状态，与本次观察取消或输入取消的回执分别记录；取消观察不表示目标已中断。`prompt --wait` 在提交前捕获同一代活动观察点，只匹配该点之后的新事实；启动时已 working 会保留事实提示。独立 `agent wait` 是只读观察，可以立即匹配当前状态。控制工具中的“继续等”沿用原目标与观察点，只重新开始观察，不重发正文；取消或超时不会停止原运行。

右侧控制工具默认只列当前 Space，用户可明确切换为同 Vault 的所有 Space；必须手动选择目标。名称相同时显示 Space、Provider 与稳定 ID。切换终端焦点不会改变目标；runtime 或来源换代后须重新选择。定位回到原终端，停止仍使用原确认。屏幕读取是被动、有界的屏幕快照，显示目标、行范围、cursor 与截断；不是完整答案接口。

## 回执、取消与限额

JSON 回执包含协议版本、requestId、operation、target、phase、effect，以及 data 或 error。`effect` 区分 `none`、`partial`、`completed`、`unknown`；操作完成不等于模型任务完成。普通提交保留原生权限与登录流程，不会自动批准。

CLI 超时、Ctrl-C 或断线只撤销这次观察，不停止已经接纳的业务、不回滚已经保存的记录，也不自动重发。回执丢失可能得到 `EFFECT_UNKNOWN`；请先用原 Session/runtime 查询现状。显式 `terminal stop` 才请求停止，停止请求和已经退出仍须区分。

| 退出码 | 分类                                        |
| ------ | ------------------------------------------- |
| 0      | 本次操作完成，继续核对 phase/data           |
| 2      | 参数、schema 或容量不合法                   |
| 3      | 缺少、歧义、错误作用域或过期目标            |
| 4      | 模块、能力、协议或连接不可用                |
| 5      | 当前状态、授权、writer 或容量占用不允许操作 |
| 6      | 等待超时，目标继续                          |
| 7      | 持久化或导入预检失败                        |
| 8      | 效果未知，先查询，不自动重发                |
| 130    | 观察取消，不等于停止运行                    |

运行请求 whole UTF8 JSON 上限 32768 字节，响应 49152 字节，深度 32、节点 8192；内部 wrapper 单列，不能扩大外部限制。屏幕读取分页绑定同一快照与 runtime，cursor 过期后明确重同步；不会静默截断身份或漏过正文。离线 schema 独立上限 1MiB。入口最多 8 个连接、16 个未结算请求；取消观察后的未结算业务和慢客户端仍占原额度。达到容量会准确拒绝，不能承诺恶意同账号占满入口时仍有无条件停止时延。

## 发布资产与兼容

每个版本的 Release 为五个平台（Windows x64、macOS x64/arm64、Linux x64/arm64）各发布两个原生程序，同一次 `terminal-build` 构建：

| 资产 | 内容 |
|---|---|
| `huhu-pty-<平台>-<架构>[.exe]` + `.sha256` | 终端 helper |
| `huhu-<平台>-<架构>[.exe]` + `.sha256` + `.compat.json` | 本机控制 CLI 与兼容记录 |

`.compat.json` 由 CI 对刚构建的二进制运行 `--json version` 生成，字段为 `schema`、`asset`、`cliProtocol`、`helperProtocol` 与该二进制的 `sha256`，不由人手写。`verify-release-artifacts` 要求十个程序、全部校验值、五份兼容记录恰好齐全；记录必须指向自己的资产与摘要，并且协议主版本等于 `control-schema.json` 的 `protocolVersion`（当前 1），配对的 helper 协议等于其 `helperProtocol`（当前 3）。

插件侧 `ensureCli` 沿用 helper 的下载管线：先取正式摘要，再取兼容记录，**在下载可执行文件之前**核对摘要一致、CLI 协议主版本与 helper 协议；任一不符以 `incompatible` 拒绝；Release 没有发布该 CLI（`.sha256` 或兼容记录返回 HTTP 404，例如旧版 Release 只有 helper）或记录无效，则以 `compatMissing` 拒绝（“此版本没有发布命令行工具”），都不写入也不执行。网络错误、超时和 5xx 不属于这种事实，只算 `downloadFailed`，可稍后重试。通过后的兼容事实随受保护回执保存，离线复用与同机再次使用都会重新核对；被改动的文件、缺失回执不被信任。旧版 helper 搭配新版 CLI（或相反）因 helper 协议不同而被拒绝，已验证的 helper 不受影响。诊断结果只返回状态码（`ready`、`unsupported`、`offlineMissing`、`incompatible`、`compatMissing`、`checksumMissing`、`checksumMismatch`、`downloadFailed`、`unavailable`），不依赖本地化文案。

构建机验证：`node scripts/verify-pty-helper.mjs <huhu-pty> <huhu>` 在 helper 握手之外检查 CLI 版本与协议配对、`schema` 与规范 schema 逐字一致、`help` 列出每个操作与参数、16 KiB stdin 正文通过本地容量检查而 16 KiB + 1 字节以 `CAPACITY_EXCEEDED`（退出码 2）拒绝，以及错误类别与退出码一致。这些命令只在本机平台运行；其余平台由 CI 的各自矩阵项运行，本地结果不代表它们通过。

## 终端里如何找到 `huhu`

HUHU 通过与 helper 相同的懒加载路径调用 `ensureCli`（下载、摘要、回执和离线规则相同），通过后把已验证文件暴露为 `.huhu/helpers/<device>/<平台-架构>/<版本>/bin/huhu[.exe]`。暴露时与 `ensureCli` 验证所用的摘要比对：已有副本不符则修复，新副本先对该摘要校验再替换，验证之后被改动的字节不会被暴露。就绪后在终端环境中：

- 把这个 `bin` 目录放在 `PATH`（Windows 为 `Path`）最前面；
- 设置 `HUHU_CLI` 为该文件的绝对路径。

路由变量（`HUHU_INSTANCE_ID`、`HUHU_VAULT_ID`、`HUHU_SPACE_ID`、`HUHU_STABLE_SESSION_ID`、`HUHU_SESSION_ID`、`HUHU_CONTROL_LOCATOR`）仍由控制环境注入。工具未就绪（协议不匹配、缺少兼容记录、离线且未安装、校验失败、下载失败）时什么都不加：终端照常打开，不会经 HUHU 到达未验证的二进制，并按状态和版本只弹一次本地化提示（含下一步）。设置里的“终端组件 / 命令行工具”行可随时检查并显示同样的状态与下一步。不写用户的 Shell 配置，也不改全局 PATH。

**启动从不等待安装。** 终端或运行时启动最多等待约 300 毫秒的本地已校验检查（可随启动取消）；下载、取兼容记录等网络工作在后台继续，只有之后启动的终端才获得 `huhu`，因此第一次使用时最先打开的终端可能还没有该命令。未就绪的结果（拒绝、离线缺失、下载失败）在本次模块运行期间被记住，后续终端不再等待也不再重试；设置里的“检查工具”是显式重试，成功后恢复。开发时可用 `HUHU_CLI_BINARY`（与 `HUHU_PTY_BINARY` 同理）指向自己构建的 `huhu`：它跳过发布摘要与兼容记录，仅用于本地开发，不应在发行环境设置。

## 随插件打包的 Skill

`src/modules/agent/core/control/skill/huhu-control.{en,zh}.md` 是随插件打包、按需懒加载的 HUHU 控制 Skill（`loadControlSkill`）。它只在用户明确要求操作 HUHU 终端或智能体时触发。技能页刷新时，HUHU 只把它写到自己的 `.huhu/skills/huhu-control/`（按界面语言，内容不变则不重写）作为一个可选来源；只有用户在技能页对某个智能体点击启用，才会走既有的复制流程写入该智能体的技能目录，不会静默写入任何账号目录。内容强调：`wait` 只是观察，`done` 不等于任务成功；`blocked`/`permission`/`AGENT_BLOCKED` 需要人；等待超时（退出码 6）不重发；`EFFECT_UNKNOWN`（退出码 8）先查询；长正文走 `--stdin`。`test/release/control-skill.test.ts` 把其中每一条示例命令连同占位符替换，交给真实 `huhu` 与真实 helper/宿主传输逐条执行，并核对退出码与 canonical schema 一致、命令只转发一次。

## 本地代码验证与平台边界

先构建并测试两个 native binary，再给 Node 的必需黑盒提供准确路径：

```sh
pnpm run check:native
HUHU_TEST_PTY_BINARY="$PWD/native/pty-server/target/debug/huhu-pty" \
HUHU_TEST_CONTROL_BINARY="$PWD/native/pty-server/target/debug/huhu" \
pnpm exec vitest run src/modules/agent/services/control/control-native.test.ts src/host/desktop/native/host-control.integration.test.ts
```

必需黑盒缺任一 binary 时失败并说明前置命令，不会 skip 记为通过。`scripts/obsidian-acceptance/agent-workbench-control.mjs` 仅作真实输入预检、CLI 进程与证据装配；业务断言由生产 TS 服务测试拥有。

同用户 IPC 不是恶意同账户进程的沙箱。Unix 权限与身份核对、Windows 当前用户/SYSTEM ACL 和仅本机 pipe 的代码检查，不替代真实多用户及高低权限验收。真实 Obsidian、Provider 和 Windows x64、macOS x64/arm64、Linux x64/arm64 主链仍由用户验收；本环境的代码与进程测试不宣称五平台实机通过。逐平台的人工清单见《[工作台五平台人工验收清单](agent-workbench-acceptance.md)》。
