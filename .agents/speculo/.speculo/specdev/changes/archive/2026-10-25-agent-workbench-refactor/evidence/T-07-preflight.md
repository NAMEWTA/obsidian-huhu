# T-07 本机 CLI / gateway 只读预检简报

范围：GP-010 / Map revision 11 下的 T-07 提前工程核验。工作区 `/home/wta/orca/workspaces/obsidian-huhu/terminal`；本次未修改仓库、未改 Git/index/ref、未构建、未测试、未启动 helper/CLI/宿主/用户 Vault、未访问真实账号或凭据、未派子 Agent。唯一写入为本 `/tmp` 报告。T-07 仍依赖 T-06，本文不授予实施或冻结前序草稿。

已复用并回读本会话的 AGENTS 能力发现、dev 的架构/许可/测试规则；本次回读 workspace/catalog、T-07、implementation-contracts CLI/错误/关闭/有界合同、Spec §3.5/§3.9/§5/§11、T-01 交付、native 实际主循环/帧/测试、NativeHost/PtyHelper 真实代码、T-17、CI/发行脚本与现有 R 参考。T-02 源码仍在变化；下面只固定 T-03–06 必须提供的语义，不将当前 SpaceService/运行接口当最终 API。

## 1. 建议 Root 提前冻结的最小路线

保留现有 `native/pty-server` Cargo package，显式增加第二个 `huhu` bin；helper 继续拥有本机 socket/pipe 与 stdio broker，CLI 仅发现/验证/组装请求/打印结果，Agent 的 TypeScript 用例拥有业务。不要另起 daemon、Web/HTTP 服务、业务数据库或第二个 PTY owner。

```text
huhu（独立 Rust CLI，单次调用）
  → 受保护 Unix socket / Windows named pipe
  → huhu-pty 的有界连接 worker / pending registry
  → stdio control-request 帧（立即回到 helper stdin 读循环）
  → NativeHost 的 control 租约 → Agent TS router / 生产用例
  → 需要时 TS 调原 NativeConnection.spawn/history/end
  → helper stdin 仍可读，处理该 native 子请求并响应
  → TS 完成外部回执 → stdio control-result
  → broker 找到原连接 → huhu 打印一个 JSON / 对应退出码
```

有三项真实工程阻碍不能留到临时拼接：

1. 现有 `src/shared/native/host.ts` 只认识 `pty | history | cookies`，NativeEvents 没有请求回入，NativeConnection.request 仅支持 history/cookies。T-07 当前写集只有 `host/desktop/native/**`，缺共享纯 control 合同的写入路径。
2. T-03–06 尚未交付最终可调用的管理用例，尤其无 Pane 后台 create/get、稳定 Session/runtime 身份、expected-runtime 校验、状态/屏幕查询、准确停止。T-07 不应重写这些业务。
3. 现有 Rust 测试 CI 没装 pnpm/TS 依赖，而 T-07 验证文字把 `control.rs` 写成启动 TS harness；必须区分 Rust 传输黑盒与 Node/Vitest 的真实 TS 生产链，不能在干净 CI 中静默 skip。

## 2. 当前代码、Cargo / bin 与 T-17 分工

### 已存在的事实

- `native/pty-server/Cargo.toml` 是 package `huhu-pty` 0.0.1、edition2021、publish=false，只有显式 `[[bin]] huhu-pty → src/main.rs`，尚无 src/lib.rs、src/bin/huhu.rs 或 control 目录。
- 正常依赖：portable-pty0.9、serde1(derive)、serde_json1、rusqlite0.32(bundled)；Unix libc0.2；Windows windows-sys0.60，当前锁定0.60.2，已启用 Foundation/Security/JobObjects/Threading；uuid(v4)目前仅 dev-dependency。
- helper 的 `main.rs` 使用 module 私有定义，`PROTOCOL=3`；stdin/stdout 长度帧，kind=1控制、2输入、3输出，body上限16MiB；独立 stdout writer 从 mpsc channel 消费。main 在任何线程/PTY前清理继承 fd，并设置 Windows 子进程 Job；EOF/shutdown 后 end_all、有界等 writer 退出。
- Message 当前只有 Hello/Spawn/Resize/Ack/End/History/Cookies/Shutdown。History.handle 登记 rid/cancel flag 后起线程，只有 scan 持 writer mutex，query/read独立；Cookies也异步处理。helper没有任何业务TCP/socket listener，顶部“never opens a port”需随本机IPC新事实更新，不能改成公网端口。
- `PtyHelper.receive()` 同步解帧并分派 spawned/exit/history-result/cookies-result；pending requests Map 使用独立UUID，history取消会发 cancel。NativeHost 用 capability owner + generation 隔离，只有该 owner 的sid可输入/结束，释放control能力也必须保持其他owner。

### 最小 Cargo 组织建议

```text
native/pty-server/
  Cargo.toml                原 package；显式两个 [[bin]]
  src/main.rs               huhu-pty 入口，只装配 helper
  src/bin/huhu.rs           独立 CLI 入口；不启动 helper / Obsidian
  src/lib.rs                公开 control/wire、client 所需窄模块
  src/control/
    mod.rs                  窄 API，不把全部 helper 私有模块公开
    wire.generated.rs       单源描述产出
    commands.rs / cli.rs    描述驱动 parser / help
    client.rs               discovery、连接、单次请求、退出映射
    server.rs / broker.rs   helper gateway、pending关联、取消
    ipc.rs + unix.rs + windows.rs
    locator.rs              本机临时状态，非业务持久记录
```

src/lib.rs 只让两个 bin 共享 control wire/传输；无需把 session/data/cookies 整体搬为公共库。main的frame/session/data模块可继续私有，通过注入 Outbox / 回执入口接 broker；或小范围抽 frame 为库内公共，不重复两份帧解析。CLI 的 main 不调用 `kill_children_with_helper`、不取得 PTY、无自动 spawn helper。可把 uuid v4移到正常依赖生成请求/实例随机ID，或复用实际已有的安全随机来源；不以PID/时间戳作唯一运行身份。

helper内部stdio协议3与对外控制协议major1是不同层。新增 gateway 消息须进行内部能力握手/兼容核验：不能因为旧helper也回答protocol3就当它支持control。可增 hello capabilities 并在 control acquisition 时要求，或经统一源有意提升helper协议；不要把对外major直接写成3，也不要只手改TS常量。未匹配的已安装旧helper必须准确 unavailable/protocol mismatch，不静默挂起。

### T-07 / T-17 边界

T-07交付可本地构建的两个bin、协议/路由/能力/诊断与进程级黑盒；不需要等T-17才能有真实CLI。T-17负责五平台同SHA资产、CLI安装/路径发现/离线验证、正式help/schema/Skill示例、兼容表和发布校验。不得将T-07“本地编译存在”称为已发布或已在PATH安装。

当前 `.github/workflows/terminal-build.yml` 五个native runner都执行 `cargo test --locked --target ...` 与 `cargo build --locked --release --target ...`；增加显式bin后 build 默认会构建两个，但打包步骤**只复制 huhu-pty**。matrix为linux x64/arm64、darwin x64/arm64、win32 x64；每包只有helper和sha256。`scripts/verify-release-artifacts.mjs` 的 terminalAssets严格要求正好五个helper+五个checksum，额外CLI文件会失败。release.yml下载 terminal-*、再次核验、只运行Linux helper探针后复制资产。T-17需把这些改成十个binary及各自摘要，并补CLI探针；当前T-07不能提前把现有校验器的严格性删掉。

T-17当前写集含terminal-build、verify-release-artifacts、verify-pty-helper、release fixtures、notices与binary安装器；**没有 `.github/workflows/release.yml`**，若要增加packaged CLI smoke步骤，此处也是未来需要补的精确路径。T-07只需明确交接资产命名建议 `huhu-<platform>-<arch>[.exe]`、binary名字huhu、CLImajor及helper能力值，不升版本、不发版。

## 3. Unix/Windows 访问保护与依赖选择

### 推荐机制与备选

建议优先用经过核验的 `interprocess 2.4.6`（固定commit `dc7bf100a1fba7062c024b26b6a23091d387a761`），不启tokio/async，复用其同步/非阻塞本机socket/pipe和安全描述符封装；保持bounded worker/轮询，而非引入异步运行时。它正是固定Herdr的本机IPC依赖之一。备选是Unix std::os::unix::net + 原有libc、Windows扩现有windows-sys0.60的feature直接调用API；依赖更少，但unsafe handle、DACL、异步取消和Windows轮询均需自行严密实现。不要只为了少一个crate而省掉ACL/截止时间，也不要为了IPC引入Tokio/大型RPC栈。

interprocess新成本明确：Cargo.toml显示0BSD OR Apache-2.0、Rust≥1.75、default=[]；Windows使用windows-sys0.61、recvmsg、widestring；Unix libc≥0.2.183；tokio/futures-core是可选。会多一版windows-sys及新声明，不应顺手升级全项目0.60。SDDL构造如使用U16CString，Windows侧需要直接widestring依赖；取当前Token SID可继续使用已存在windows-sys并补Security_Authorization等feature。正式实现者应按实际调用选择最少feature，不把全套Win32打开。

### Unix的最小保护

- 使用**文件系统路径** Unix socket；Linux abstract namespace不受文件mode保护，也不适合macOS，不作为跨平台默认。
- 用户runtime根：优先验证过owner/mode的XDG_RUNTIME_DIR；回退短的本机临时用户目录。目录0700，socket0600，locator0600；目录和locator创建时显式mode。socket先bind在已验证的0700父目录中，立即设0600且成功后才publish，避免未保护父目录中的chmod窗口。不可对多线程进程临时全局改umask。
- 验证父目录/文件类型、当前uid、非symlink；同名非本owner文件或活跃socket拒绝，不盲unlink。cleanup只在创建时记录的dev/ino仍一致时删除。可从Herdr同固定commit借其identity-checked cleanup机制，不能照搬其先prepare路径的任意删除行为。
- socket路径需足够短以兼容Linux/macOS sun_path上限；用短namespace+随机instance目录/文件，不把完整Vault路径编码进socket名字。目录、marker、locator都是本机临时设施，不进`.huhu`可携带业务包。
- interprocess的reclaim默认行为需要明确设置为不抢占；只有本owner记录与dead检查确定的旧对象才可清理。同用户控制面不防恶意同账号进程；文件权限是跨用户边界，必要时可加peer uid核对，不能拿名称当认证。

### Windows必须在CreateNamedPipe时设DACL

- `\\.\pipe\huhu-...`，只本机，明确reject remote clients，不使用null/default security descriptor。Microsoft官方说明默认DACL还会给Everyone/anonymous读权，不能据“系统默认”宣称限当前用户。
- 当前用户从OpenProcessToken(TOKEN_QUERY)/GetTokenInformation(TokenUser)获得SID，DACL仅允许该SID与LocalSystem；可构造受保护DACL SDDL并在创建时传入。当前用户/服务器账号可拥有create-instance权；不加入Everyone/Users/Authenticated Users/Administrators宽泛allow。SID不是凭据，不打印token内容。
- 可用interprocess的 `ListenerOptionsExt.security_descriptor`，SecurityDescriptor::deserialize封装Win32；若直接windows-sys，补 `Win32_Security_Authorization`、`Win32_System_Pipes`、`Win32_Storage_FileSystem`、`Win32_System_IO` 等实际APIfeature；原有Security/Foundation/Threading继续复用。转换返回的SD、token/pipe handle必须RAII释放。
- interprocess PipeListenerOptions 具备accept_remote=false默认、inheritable=false、security_descriptor与instance_limit。不要依赖默认无限instance；设有限并发。其注释说明instance_limit=1会破坏accept，选择≥2且另有受控admission，不能机械设1。
- connect/read/write/accept必须能deadline退出；同步ReadFile阻塞不能仅设置Rust通道超时然后遗留永久线程。可用nonblocking/polling或正确取消IO，listener关闭唤醒accept，断线检测区别空闲与broken pipe。elevation/普通用户访问失败准确诊断，不能退到不受保护TCP或放宽ACL。
- locator父目录与文件也需要当前用户/SYSTEM ACL；只有pipe DACL而locator任人覆盖仍会污染发现结果。无需读取真实用户资料即可在隔离目录测试descriptor构造/枚举ACE；不同OS用户、真实WindowsACL/高低权限组合由用户实机验收。

可复用机制不等于复制源码。若实际引入interprocess/ctrlc或改编Herdr代码，T-07当票就需生成notices和记录来源；不能一直等T-17才让当前crate许可集合正确。

## 4. Rust→TS→Rust回入、取消与关闭

### 主循环不可等待TS

Rust stdin读循环只做：验证外层消息 → 在短mutex内lookup/enqueue/resolve → 返回。不得在Message::ControlRequest中 `recv()` 等业务回执；否则TS await `spawnSession/history`时其响应永远无法被读到。

外部socket连接worker可以等待自己的结果，**等待期间不得持有** gateway pending map /sessions.live /History writer /stdout writer锁。broker对每连接分配内部bridgeId，外部requestId只是相关性：不同客户端可碰撞，不可用它直接覆盖一个全局Map。关联至少含helper generation、control lease/controlId、connectionId、bridgeId；迟到旧result/cancel只丢弃或准确失败，不能送到新连接或新owner。

TS的 `PtyHelper.receive/control` 同样只同步解析/路由，不await Agent业务；先登记请求控制器，再用Promise任务运行router，finally发送result并清pending。spawned/exit/history-result仍可立即消费。不要把gateway handler塞进现有 `createSerialQueue()`：该队列**有意等待前任务完成**，若把整个native读取/业务分派都串在它后面，慢扫描/长wait会堵住stop。只允许每Session的必要mutation/input串行，查询和取消走独立可执行路径。

原helper stdout仍只有一个帧writer，其他线程不能直接println写协议；对外CLI stdout更不能混入helper日志。慢外部客户端的write只能卡自己的bounded队列/worker，不得在stdio接收回调中直接write该socket，也不能持全局锁等它消费。新的外部连接/请求/输出缓冲均要bounded，达到容量返回明确unavailable/busy分类并effect=none，不无限起线程。

### 最小请求状态机与effect

```text
validated → queued → admitted → executing → replied
    \          \           \              \
     reject     cancel       observer gone  response lost
     none       none         operation may continue / unknown
```

- 排队未开始的动作取消后不得迟到执行。已接纳的start/input/commit不能因为CLI超时或断线自动重发；spawn已经发生时不把CLI终止当stop，也不清除可查询Session。
- wait超时/取消/CLI Ctrl-C仅撤销该次wait/订阅：WAIT_TIMEOUT exit6，WAIT_CANCELLED exit130；运行继续。普通副作用请求在传出后失去回执应EFFECT_UNKNOWN exit8并尽量带已知target/phase，不能一概none。启动中若已知record-saved，后续先query，requestId不是跨崩溃幂等保证。
- socket EOF要及时发内部control-cancel以释放TS等待，但取消token与stop token分离；已完成的result/cancel竞态应至多完成一次promise和一次输出。客户端自动reconnect只可用于新的只读探测，不重放历史mutation。
- CLI需捕获Ctrl-C而不只是靠默认进程退出；推荐小型 `ctrlc3.5.1` 或直接平台信号适配，handler仅发一个取消通知/原子标记，主流程完成一个JSON与exit130。ctrlc实现有独立signal线程，不在handler里写socket/JSON/做业务。杀CLI进程强退时可能没有JSON，但服务器EOF必须清等待、不停目标。
- `version` / `schema` / `--help`应可离线从编译描述输出；doctor在无endpoint时只给MODULE_INACTIVE/CONNECTION_UNAVAILABLE及打开入口建议，不启动module/helper/下载。capabilities来自当前已注册生产handler，不能仅因命令名存在就宣布可用。

### 关闭次序

control owner停止：同步关admission → 注销/使locator不可发现 → 停listener接新连接 → cancel未开始动作与wait → 对已接纳业务按现有有界关闭合同结算/标未知 → 清pending、关闭connection → 仅在身份匹配时清locator/socket → release control lease。Agent停用还按T-04收束自己的PTY；Browser/history/cookies独立owner继续，不能让gateway.shutdown误调用全helper.shutdown。

helper崩溃：fail该generation全部gateway请求、失效locator、状态失联；新helper注册全新controlId/instance generation，不自动补发旧请求。stdioEOF仍是宿主退出的真实硬边界，native listener不能让孤儿helper脱离宿主存活。T-01的首用factory/租约与原create取消竞态修复必须保留。

## 5. locator、物理Vault与Space寻址

T-02确定TCP端口只用于writer互斥：实际 `platform/desktop/spaces/writer-owner.ts` key是namespace/deviceId/root.dev/root.ino的hash，监听127.0.0.1、连接立即destroy。**禁止把它升级成业务HTTP/TCP控制入口**，也不能扫描端口范围猜活动Vault。gateway socket/pipe与locator独立，但业务mutation仍必须通过同一个SpaceService单writer准入。

建议冻结一个纯Binding DTO，模块从T-02生产owner取得并映射给host（host不能import Agent core）：logical vaultId、deviceId、instanceId、当前root物理身份、规范/打开路径核对所需引用、helper/control generation、controlProtocolMajor；endpoint随机命名，locator记录endpoint/受支持版本和必要诊断。PID只观察，不作身份；复制来的Vault ID、endpoint字符串或环境变量都不是充分证明。

发现流程：

1. CLI读取显式 `--instance` 或HUHU受管终端创建时冻结的实例提示；没有上下文则列出候选供用户明确选择，**即使仅一个也不猜**。只枚举受保护本机locator根，别扫所有Vault/账号/目录。
2. locator先做文件类型/owner/权限/长度/JSON版本核验，再连接。连接后比较服务握手中的logical+physical+device+instance+protocol/control generation，不只比较vaultId。
3. TS接纳每请求前精确验证target。默认Space来自受管终端创建时冻结的stable spaceId；不是当前GUI焦点、cwd或唯一候选。显式Session/Pane目标可跨同Vault Space，结果仍带原spaceId；跨Vault拒绝。
4. 操作runtime必须同时带stableSessionId和expected runtimeId，旧runtime拒绝STALE_RUNTIME。启动/继续前再次调用目录授权/writer校验；CLI不能用任意库外cwd字符串mint grant。
5. root物理绑定被替换、vault复制且logicalID相同、device/instance不符、旧locator/重启generation变化时，均在业务副作用前拒绝。正确显式选择原实例本身仍指原实例，不能用“当前shell cwd像新Vault”偷偷改路由；复制场景测试应带新物理绑定而尝试旧endpoint，证明SCOPE_MISMATCH且无效果。

T-02目前vault和instanceId是SpaceService内部事实；T-03–06交付时应有可只读取得的稳定scope快照/assert接口，避免T-07另造第二个实例ID或私读store以为取得writer。gateway注册是否需要held writer应由同owner生产准入决定：只读查询不能无理由创建业务文件，mutation必须持唯一writer；先注册也不能绕过后来owner冲突。绑定与owner生命周期变化要使control准入失效。

受管终端env应从已确认绑定生成，只作路由提示且保留只读身份；用户env不得覆盖验证后的scope。当前 `HUHU_SESSION_ID` 明确装的是TerminalSession/runtime ID，T-07不能无声改成持久Session ID；可新增明确persistent session/runtime字段，统一写在wire描述/上下文端口并有回归。如T-03未留上下文注入端口，T-07需要扩写最终实际terminal create文件；不要在六Provider各复制一套env拼接。

locator/socket/锁/可能的认证设施不进入业务备份、同步、Session schema或诊断敏感正文。建议用受保护本地目录中的随机instance文件，原子publish前先收到native注册ack；cleanup核对instance/content或dev/ino，迟到旧owner不能删除新实例文件。无效locator不会自动发命令探测或重新enable Agent。

## 6. schema / 命令描述同源与后票扩展

建议选一份**中立纯数据**为权威，例 `src/shared/native/control-schema.json`（拟新增），保存control major、request/response target与effect、错误→退出码、命令语法/互斥参数/作用域/limits、en/zh描述key；一个确定生成器输出Rust wire枚举/结构、TS wire类型/验证数据、CLI parser/help描述、公开JSON Schema。Rust include和TS导入均由此产生；不要在Rust Message、TS union、help文案和docs另抄字段。实际目录名Root可决定，不应未经修票就写。

轻量生成器只覆盖本协议实际用到的结构/枚举，不自建通用JSON Schema平台。备选是Rust serde结构为源再用现成typegen/JSONSchema导出，但需要新增build依赖与类型/运行时validator配套；若采用需同样证明生成可重现。这里优先纯描述+小生成器：项目已resolveJsonModule=true，Rust/TS都无须引入完整RPC框架。

最少保证：

- `huhu schema` 的major/字段/required/limits与Rust parser、TS validator读取同一产物；生成器 `--check` 只比字节，不在普通测试中偷偷重写源码。正常/错误/重复字段/unknown命令/上限共用一套fixture两端执行。
- 外部响应严格沿公共合同：protocolVersion/requestId/ok/operation/target/phase/effect/data/error；effect=none|partial|completed|unknown；target只含实际验证身份，省略不适用字段；错误code→exit2/3/4/5/6/7/8/130单源，不解析中文文案。JSON模式stdout只有完整一条记录，日志stderr。
- 请求可以用operation+params+target，但具体字段由同源描述一次固定；helper stdio wrapper使用内部bridgeId/controlId，不能污染对外target或把cookie/history rid复用为业务requestId。
- T-07建立按operation注册的TS handler registry；方法描述静态已知、当前handler可用性动态投影。不存在的后票能力明确unavailable，不假成功；capabilities按真正注册的handler过滤。
- T-08给terminal input/wait/read闭环接相同registry；T-09注册pane命令；T-10注册message/inbox；T-11/12注册history/resume；各票同时补命令描述/参数/结果schema/fixtures和真实GUI/CLI测试，CLI无需新增一套业务switch。T-17验证最终所有help/Skill示例与描述一致。
- 保留runtimeId/contentSequence/activitySequence不混用；T-07只将T-05/06输出DTO传输，不在Rust自行解析终端屏幕/猜Agent状态。

一个schema不是取消语义的替代物：queued/admitted/executing和副作用未知仍由生产用例状态机确认。JSON反序列化要拒绝歧义身份（重复requestId/target字段、非字符串ID）；先parse成Value再读字段会丢重复键信息，需在入口有明确策略及负例。

## 7. T-07原写集缺的精确路径与规则

当前已有范围覆盖native control/**、bin/huhu.rs、lib/main/frame/Cargo、tests/control*.rs，Agent core/platform/services control/**，host/desktop/native/**，module/controller，CLI docs及Root产物。以下至少需Root在正式派单前按实际方案修原Ticket/Map：

| 精确路径/拟文件 | 为什么 |
|---|---|
| `src/shared/native/host.ts` | 新control capability/lease/events的纯宿主无关合同；现有仅pty/history/cookies，host不能反向import模块 |
| `src/shared/native/control-schema.json`、`control-wire.generated.ts`（或Root定下的等价纯位置） | 唯一wire/错误/命令描述，供host与Agent共享；Agent core控制类型不能被host导入 |
| `src/shared/native/frames.ts`及邻近协议测试 | helper消息/能力握手需同步，现有HELPER_PROTOCOL=3；若仅新增control JSON消息而帧/版本不变可不改帧实现，但仍需契约测试 |
| `src/shared/native/lazy-host.test.ts` | 未显式使用不启动gateway，control首用/迟到dispose不泄漏；实现lazy-host.ts若接口无需变更可保持不动 |
| `src/modules/agent/module.test.ts`、`services/controller-native.test.ts`或拟controller-control.test.ts | 实际装配/懒加载/停用/Browser独立owner/未使用无gateway的生产消费者证据 |
| `src/modules/agent/i18n.ts` | 插件gateway失败/不可用/配置提示如对用户显示，必须t()+en/zh；Rust CLI描述可从单源双语数据生成 |
| `scripts/generate-control-protocol.mjs`与对应fixture/test（拟新增） | 真正同源生成/--check；现有无协议生成脚本，不能宣称单源只是注释 |
| `package.json`（若接新check/test脚本） | 当前check:native仅cargo test；需要明确跨语言harness和协议生成一致性入口 |
| `THIRD-PARTY-NOTICES.md`、必要时`NOTICE`、`docs/third-party/**`、sources.json | 新正常crate或实际改编进入当前binary时就需一致，不等T-17；只借机制不新增NOTICE改编条目 |

其他按前序最终交付判断：

- 最终运行文件（现为 `services/terminal/sessions.ts`、`services/launch/launcher.ts`）若未留control scope/env注入与managed start生产API，需要精确补写；当前T-07未覆盖terminal/launch。首选T-03先留小端口，T-07只注入。
- `services/spaces/space-service.ts` / records读取API如缺scope/实例/getSession/精确resolve接缝，必须由前序owner先完成或Root扩写；不让T-07直接导入其私有records并写盘。
- `src/app/native.ts`、`src/app/contracts/module.ts`：现有app.native只传通用host且ModuleContext.native引用共享接口，若新增control仍通过同一acquire，通常不需要改；若选独立app-owned注册API才扩。`agent/api.ts`也不是必写，gateway在本模块内消费用例即可，跨模块使用才经api。
- `scripts/third-party-notices.mjs`若仍单package正常依赖图就会覆盖两个bin的依赖并集，不需要为了第二个bin重写生成器；只有分workspace/featuregraph使它漏包时才扩。当前不推荐新workspace。
- `.github/workflows/lint.yml`或terminal-build.yml若要CI先造两个bin再跑生产TS进程测试，需要Root明确把最小验证装配提前归T-07或留T-17并记录本票本地必跑入口；不能把真实回归永远变skip。Rust crate测试不应依赖未安装pnpm。

工程规则：host只依赖host/shared；shared纯wire不依赖Agent core/app/contracts；Node/Electron只在desktop，CLI Rust中不需要Obsidian；module.ts自身的UI仍动态import；普通激活/只读列表不得acquire control或登记endpoint。更改跨区公共类型/装配后architecture/bundle检查；新crate当票notices；全部UI用户文案t()。T-07 ui_change=false无需为socket工作扩大视觉流程。大份schema/命令描述只在control显式激活后加载；api/启动路径仅类型和键，不能因共享wire把协议表或Node依赖拉进启动求值。

## 8. T-03–06必须先交付的生产接缝

这里是语义清单，签名等前票验收后回读；不批准当前T-02草稿为稳定接口。报告完成时T-02 owner另通知：SessionRecord及prepareSession/SessionAdmission接缝已稳定可只读、ResumeInfo实际为spaceId/persistentSessionId，beforeSpawn也核对当前持久Session；仍未停写/未done。此消息可作后续回读导航，不能绕过前票完成门。

- **T-02**：明确Space精确解析；未绑定交互式选择/取消；后台无绑定拒绝；目录grant校验；持久Session先commit/readback；共享单writer准入；可读scope含logical/physical/device/instance且不暴露秘密。
- **T-03**：managed start/create/Session get/list；后台不attach/open/focus；无Pane也可查pending/failed/current runtime；稳定Session/runtimeId分离；重复附加只复用；每运行可注入固定路由上下文；缺程序/能力准确失败。
- **T-04**：expected runtime停止、拒绝新输入、已请求/已退出/失联区分；module关闭先关admission且有界收束；迟到spawn准确清理；重启不自动执行。gateway只调用这些用例，不另写native.end逻辑冒充业务stop。
- **T-05**：有界screen snapshot /cursor /contentSequence /runtimeId；同一权威headless，不把持续输出阻塞其他控制；CLI读屏不主动滚动TUI。
- **T-06**：真实activity/capabilities/explain，runtimeId/activitySequence，blocked与unknown区别。T-07只传证据，不把process存在/静默当idle或成功；普通prompt安全提交由T-08完成。

若前票缺API，这属于Root可在当前计划内收束的工程接缝；不向用户重新询问已定的Space、scope、权限或E2E分工。T-14仍负责原一次性/自动化/quick-command消费者的明确Space适配，不能在T-07增加无Space例外。

## 9. 同票可安全拆分与先冻的纯wire

可拆两位实现者，先由一位单点冻结描述/端口，再并行互不重叠写集；Root独占正式工件、main.js/styles.css与全局集成。reviewer另为只读。

- **A：Rust/传输 owner。** native control/**、src/bin/huhu.rs、lib/main/frame、Cargo/lock、tests/control*.rs；负责Unix/Windows、locator、broker、CLI parser/输出/取消。schema canonical、生成器及两端生成物由Root明确交给A作为唯一writer，B只消费。
- **B：TS/用例接线 owner。** Agent core/platform/services control/**、host/desktop/native/**、shared/native宿主合同、module/controller及相关TS测试、i18n。B不改Rust/Cargo/schema生成物，也不自行定义另一份wire。
- **集成前停止双方writer。** A/B不能同时改shared/native/host.ts或canonical JSON。若这两个职责在原方案无法分净，先A/Root落纯接口后再解锁B；接口变化回单writer，不用双方各加可选字段“兼容”。

必须先冻结的最小合同：

1. 外部request/response envelope、target/scope/错误/effect/退出码与limits、命令描述；对外major1与helper内部version/capability区别。
2. stdio `register/registered/unregister/request/cancel/result`消息的字段、control lease/controlId、bridgeId及helper generation相关性；handler与发送reply能力只属于原lease。
3. Host的纯control注册/请求事件/取消端口，JS回调不得await主receive；module注入router，host不了解Space业务。
4. locator格式、用户runtime根/权限策略、endpoint生成与publish/cleanup owner；Scope DTO从T-02映射规则，不能新造平行instance identity。
5. request状态机，disconnect只cancel observer，哪些未开始动作可撤销，未知效果何时报告，超时/取消回执优先级。
6. T-03–06生产用例端口（只读DTO+动作），capability registry及T09–12扩展规则；集成TS harness的binary路径/env、消息观测与故障注入边界。

不要把handler注册闭包/React或ModuleContext整体传给host；只传纯scope、必要消息与函数接口。后台任务、真实持久化与input arbitration仍在TS原owner，Rust只传输/资源保护。

## 10. 最小Linux进程黑盒与平台边界

这是后续实施验收建议，**本次没有运行任何一条**。

### 两层测试需要分别存在

1. `native/pty-server/tests/control*.rs`：cargo可独立运行，使用 `CARGO_BIN_EXE_huhu` / `CARGO_BIN_EXE_huhu-pty`，隔离临时目录；测试socket/pipe、协议握手、bounds、stdout/stderr/退出码、注册/取消/清理和迟到关联。TS业务可用严格标注的受控stdio responder验证传输，但不能据此称生产业务已通过。
2. `src/modules/agent/platform/desktop/control/gateway-process.test.ts` + `gateway-process.fixture.ts`（拟新增，当前platform allowlist内）：Node子进程装配真实NativeHost、gateway/TS router、T-02 SpaceService、T-03 runtime与真实helper；用隔离storage/目录/账号fixture启动真实 `/bin/sh`。测试调用外部huhu进程，观察真实Session/runtime/PID和持久记录；不是用一个echo JSON responder替代TS。可用现有esbuild打包fixture到测试临时目录，所有文件仅fixture根，显式超时/清理。

CI真实差异必须处理：terminal-build的Rust test步骤在setup-node前且完全没pnpm install；lint.yml先test:all、后check:native，干净checkout的JS进程测试可能还没有binary。应有明确前置build --bins或独立必跑检查，缺binary时报“未运行/必需前置缺失”，不以skip exit0冒充AC-055。所有测试缓存/编译产物与实际候选hash对应，不能拿旧helper测新TS。

### Linux最小真实链

- 同一cargo构建产出两个bin；CLI version/schema/help离线可用，未开gateway时doctor准确失败且无helper/模块自动启动。
- 隔离TS harness显式打开gateway并注册scope，两个不同Space（可同cwd）；前台A固定焦点，真实CLI后台start B，再get/list验证B无Pane、space/runtimeId正确且A焦点不变。
- 同名Space缺稳定target报ambiguous、无Space报required；同Vault显式B可查，跨Vault/复制logicalID但不同physicalroot/旧instance/旧runtime/错controlmajor拒绝且spawn/input/文件计数零增。
- 发一个要求TS再调用helper.history或spawn的CLI请求，同时另一个请求query/stop；用可控gate固定慢history，证明nested native响应、exit和stop能在gate释放前处理。不能仅用“请求最后都结束”证明无阻塞。
- wait取消/Ctrl-C/kill CLI：观察listener/pending归零，目标shell仍活、没有额外input/spawn；断掉副作用结果回路后CLI回EFFECT_UNKNOWN，之后query能核对原Session且不自动重试。
- 暂不读/写半个超长frame/大量并发外部连接：有界拒绝或单连接超时，其他client的get/stop仍能完成；慢socket不能卡stdio和process exit。记录实际limits和峰值，不发布未经测试的性能数字。
- 关gateway /Agent disable时立刻拒新请求并清自身locator，Browser cookie/history租约可继续；最后owner结束helper退出，旧owner cleanup不删除新generation locator；helperstdinEOF后无孤儿listener/process。
- Unix mode/owner/symlink/替换socket文件检查；若测试环境允许第二OS uid可额外验证拒绝跨用户，否则明确只核验权限事实，不伪称做过跨用户攻击测试。

macOS/Windows代码层至少按cfg编译、协议单测、DACL构造/ACE解析/accept_remote设置测试，CI可用native runner真实跑传输；本预检的Linux经验不证明WindowsACL、ConPTY、高低权限或macOS临时路径行为。真实Obsidian、Provider、第二终端使用和五平台E2E按Spec§11仍交用户；模拟TS harness与Rust进程测试只能说明各自接缝。

## 11. 新研究的一手证据与采用理由

活动窗口2024-10-25—2026-10-25；本次公开GitHub GET无外部写入。已有R-01–05活动/许可/依赖与reference-sources.json未变可复用，不把旧文档检查当产品测试。

- **interprocess2.4.6**：[官方release](https://github.com/kotauskas/interprocess/releases/tag/2.4.6)，GitHub API本次取得published_at=`2026-10-16T17:19:50Z`，repo archived=false，tag commit=`dc7bf100a1fba7062c024b26b6a23091d387a761`。实读固定 [Cargo.toml](https://github.com/kotauskas/interprocess/blob/dc7bf100a1fba7062c024b26b6a23091d387a761/Cargo.toml)、[Apache全文](https://github.com/kotauskas/interprocess/blob/dc7bf100a1fba7062c024b26b6a23091d387a761/LICENSE-APACHE.txt)、[Windows listener options](https://github.com/kotauskas/interprocess/blob/dc7bf100a1fba7062c024b26b6a23091d387a761/src/os/windows/named_pipe/listener/options.rs)。采用统一本机传输与显式SD，保留本项目有限队列/身份；不用其默认无限instances或可选Tokio。2.4.5修正Apple peer credentials解释，2.4.6修ARMv7构建，说明最新并不自动证明本五平台已验收。
- **Windows原API备选**：官方windows-rs [release69](https://github.com/microsoft/windows-rs/releases/tag/69)，API取得published_at=`2025-09-04T20:27:26Z`，archived=false，固定commit=`4113a57c55398ad539ac04bfb729c3aa960684b6`；[MIT全文](https://github.com/microsoft/windows-rs/blob/4113a57c55398ad539ac04bfb729c3aa960684b6/license-mit)、[Pipes绑定](https://github.com/microsoft/windows-rs/blob/4113a57c55398ad539ac04bfb729c3aa960684b6/crates/libs/sys/src/Windows/Win32/System/Pipes/mod.rs)已读。是可信Win32绑定来源；本项目仍锁0.60.2，不能把参考0.61版本当成已经升级。直接API方案减少新crate，代价是自身维护unsafe/取消/ACL。
- **Windows官方机制**：[Named Pipe Security](https://learn.microsoft.com/en-us/windows/win32/ipc/named-pipe-security-and-access-rights)、[CreateNamedPipe](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-createnamedpipea)、[GetTokenInformation](https://learn.microsoft.com/en-us/windows/win32/api/securitybaseapi/nf-securitybaseapi-gettokeninformation)、[SDDL转换](https://learn.microsoft.com/en-us/windows/win32/api/sddl/nf-sddl-convertstringsecuritydescriptortosecuritydescriptorw)。分别支持DACL访问检查/默认宽权限、reject remote flag、TokenUser查询、SD分配释放要求；使用W版处理Unicode，不复制平台代码。
- **Herdr固定参考**：[src/ipc.rs](https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/ipc.rs)、[src/api/server.rs](https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/api/server.rs)本次实读：显式private DACL、非抢占名称、socket身份核对cleanup、连接worker与app响应channel、初始请求长度/超时、断线等待测试。借这些机制；HUHU必须额外保持bounded worker/TS↔Rust回入及稳定Vault/Space，不搬其unbounded app channel、UI/依赖栈或具体权限别名。活动和Apache全文沿本change同日既有R-01证据复用。
- **CLI Ctrl-C推荐候选**：官方 [ctrlc3.5.1 release](https://github.com/Detegr/rust-ctrlc/releases/tag/3.5.1)，本次API取得published_at=`2025-10-28T20:36:33Z`，archived=false，固定commit=`c619fb2dd196228b193cb2f2762baac51f97c1d9`；[Cargo](https://github.com/Detegr/rust-ctrlc/blob/c619fb2dd196228b193cb2f2762baac51f97c1d9/Cargo.toml)、[MIT全文](https://github.com/Detegr/rust-ctrlc/blob/c619fb2dd196228b193cb2f2762baac51f97c1d9/LICENSE-MIT)、[机制](https://github.com/Detegr/rust-ctrlc/blob/c619fb2dd196228b193cb2f2762baac51f97c1d9/src/lib.rs)已读。Rust≥1.69，Unix nix0.30、Apple dispatch2、Windows windows-sys0.61；安装一个signal线程，适合独立CLI，不给helper安装会改全局信号语义的handler。备选直接libc/Windows console handler要额外维护跨平台信号安全。Redox已知问题不属于本五平台；WindowsCTRL_CLOSE不当成Ctrl-C等价保证。

上述是设计/依赖可行性证据，没有安装依赖、复制代码或运行外部项目测试。最终依赖/feature/limits由实施者在实际候选上确认并留证，Root不需要为常规工程选择再问用户。

## 12. Root派单前最小收束清单

1. 补共享Native control/wire/测试及生成器真实写集；明确canonical描述与两端产物唯一writer。
2. 冻结control租约和stdio回入消息，确保两个读循环都只登记/分派而不等待业务；外部worker等待不占全局锁。
3. 前票交付稳定scope、managed后台创建/查询、expected-runtime停止、screen/activity DTO及ctx注入；不能以T-02在写源作为最终签名。
4. 选interprocess同步/非阻塞或直接Win32方案，显式WindowsDACL+本机限定+有限instances；本机locator权限与cleanup也纳入同一owner。
5. 分开Rust传输测试与真实TS生产harness，修CI前置顺序，不能缺binary就skip闭合AC。
6. 维持T-17打包/安装/兼容/Skill分工；新依赖许可当票一致，T-07不升版不发版。T-02的TCP互斥不承载业务控制。
