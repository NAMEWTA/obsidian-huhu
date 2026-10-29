# T-04 单 Session 原生收束：只读设计核验

**结论：** 保留现有 portable-pty/ConPTY 与共享 helper。Windows 可优先评估“同一 huhu-pty 内部 bootstrap + 私有 gate + 独立 Session Job”，只有成功分配 Job 后才运行用户程序；直接对已运行 payload 做 Assign 不能消除逃逸窗口。Unix 最小修复是显式向已验证自有进程组发真正 SIGKILL、根退出后仍保留清理责任，再结合本机只读观察处理同 Session 的其他 job-control 组；主动脱离/证据不足保持 partial/unknown，不承诺不可核验的 daemon 树。以下均是建议，未选定接口、未实施或改 Spec。

上下文：工作区 `/home/wta/orca/workspaces/obsidian-huhu/terminal`；Root 派遣 HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`；复用原 `/tmp/huhu-t04-preflight.md`、T04/实施合同与 dev 规则。采样时 T03 A 的 native session/main 结构化 spawn 失败修复仍属活跃观察；收尾时 Root 已通知其停写及定向检查通过，本报告没有代跑/复核该验收，仍不冻结候选。完整本机/依赖源码、原始官方页面与 GitHub 响应在 `/tmp/huhu-t04-native-materials/`；33 项文件快照 SHA/UTC 与 40 项联网响应/错误在 `/tmp/huhu-t04-native-source-observation.json`，SHA256 `3bbc17864083185aef68f6b9db72c26529112c9b70efbf21f76722f40d24cdea`。抓取首末比对未见这批快照漂移，不代表 A 已停写；先于快照的 section 阅读不冒充已冻结。所有命令只读或写这些 /tmp 材料，没有 cargo/test/build/target/进程执行。

## 1. 真实底层事实

- 本地 Cargo.lock 的 portable-pty **0.9.0** 源在 cargo registry，VCS 为 `f8921727a11b9f8b073e8c24821d72fd41283500`。其 `src/lib.rs:130–157` 的 Windows Child 提供 `as_raw_handle()`，可直接关联已捕获子进程，不需 PID 搜索/重开。Unix `clone_killer` 走 `ProcessSignaller::kill`（`:324–335`），仅向根 PID 发 **SIGHUP**；不是对子孙 SIGKILL。普通 Child::kill 的不同实现不能代替实际 clone_killer 路径。
- 本地 `src/unix.rs:238–273` 的 pre_exec 做 setsid/controlling tty；根初始 PID=SID=PGID。`MasterPty.process_group_leader` 实际是 tcgetpgrp（`:374–379`），只是当前前台组，不是整棵树/所有后台组。shell job-control 可以产生别的 PGID。
- 本地 `win/psuedocon.rs:115–177`（0.9 拼写如此）只设置 pseudoconsole 属性，立即 `CreateProcessW`，无 CREATE_SUSPENDED 或 JOB_LIST，随后关闭主线程句柄。CommandBuilder 没有公开 creation-flags/Job-list hook。上游现行固定提交也仍在 `pty/src/win/pseudocon.rs` 直接创建进程；不能假设升级即可获得该 hook。
- 项目 `session.rs` 快照 `960ebfcb8c82e24615c976014f3e700b59067bbaaf351f97237e86d9f7a412c5`：GRACE=2s、DRAIN=3s；end(force) 调 clone killer；宽限只在根未 exited 时再 kill。wait 根后设置 exited、最终移除 live，即使子孙仍持 PTY。故根先退后既可能跳过强制，又可能失去该 sid 的清理入口。这是源码推导，本轮没跑反例。
- `job.rs` SHA `49c9fecfc1c9d5a931f3aebd4786f2791186b04ad614b3595e05959e4accd540` 只有 helper-wide KILL_ON_JOB_CLOSE，Create 失败静默返回，SetInformation/Assign 返回未核对。它可作宿主死亡兜底的起点，不能作为 Browser Cookie owner 尚在时 stop 某 Session 的手段。
- T01 NativeHost 的严格 capability/owner/sid 与 helper generation 要保留。`host.ts` 当前 release 等 owner.running 的根 exit，超时5s；这个 promise 不证明 native tree 全部收束。history/cookie lease 与 PTY 不得合并；单 Session stop 不能 shutdown helper 或 Terminate helper-wide Job。

## 2. 新研究与采用理由（只借机制，不复制）

| 一手来源 | 固定版本、许可与近两年维护证据 | 观察与 HUHU 选择 |
|---|---|---|
| [WezTerm](https://github.com/wezterm/wezterm/commit/e2a98e1b8af156988ad0ac778658ac27b60a55fb) | 2026-10-10；[根 MIT](https://github.com/wezterm/wezterm/blob/e2a98e1b8af156988ad0ac778658ac27b60a55fb/LICENSE.md) 与 [pty/Cargo.toml MIT](https://github.com/wezterm/wezterm/blob/e2a98e1b8af156988ad0ac778658ac27b60a55fb/pty/Cargo.toml) 已实际抓取，不靠仓库 NOASSERTION 标签猜许可 | 复用已依赖的 PTY、Child 原生句柄；[当前 spawn 源](https://github.com/wezterm/wezterm/blob/e2a98e1b8af156988ad0ac778658ac27b60a55fb/pty/src/win/pseudocon.rs) 不提供 Session Job 原子分配。保留库，不引入 GUI/新平台。 |
| [Alacritty](https://github.com/alacritty/alacritty/commit/542147067dd016fc5f49120ef0ba605a98a4e3a7) | 2026-10-16，未归档；[LICENSE-APACHE](https://github.com/alacritty/alacritty/blob/542147067dd016fc5f49120ef0ba605a98a4e3a7/LICENSE-APACHE) 已读取 | [conpty.rs](https://github.com/alacritty/alacritty/blob/542147067dd016fc5f49120ef0ba605a98a4e3a7/alacritty_terminal/src/tty/windows/conpty.rs) 与 [child.rs](https://github.com/alacritty/alacritty/blob/542147067dd016fc5f49120ef0ba605a98a4e3a7/alacritty_terminal/src/tty/windows/child.rs) 分开控制台资源与根 handle 的退出观察；ConPTY drop 明记排空死锁风险。借此分离证据/资源，不搬其 PTY。所引 [PR3084](https://github.com/alacritty/alacritty/pull/3084) 为2019年已合并旧修复，不冒充0.9/当前 Windows 的实测。 |
| [Microsoft Terminal](https://github.com/microsoft/terminal/commit/98c8c795ebc2560af55e72beba3fa5fd31ceef64) | commit 2026-10-23；[MIT LICENSE](https://github.com/microsoft/terminal/blob/98c8c795ebc2560af55e72beba3fa5fd31ceef64/LICENSE) 与文件头已核对；仓库2026-10-24仍 push | [ConptyConnection.cpp](https://github.com/microsoft/terminal/blob/98c8c795ebc2560af55e72beba3fa5fd31ceef64/src/cascadia/TerminalConnection/ConptyConnection.cpp) 分别保留 root process handle 与 HPCON Close。它不是 HUHU 共享 helper 的 Session Job 完成证明；不引入 C++/WinRT/terminal 服务。 |

GitHub 元数据、license 原件、相关源码、原始 UTC/摘要均在材料清单。复用既有 reference-notes R01/R05 的运行与显示分离；没有新增依赖或 GPL 终端源码。官方文档作 API 语义权威，上述同类项目只作实现取舍参照。Open Group 页面403已保留失败，Unix 改用 Apple 官方 man 与 Linux kernel 文档；Microsoft Q&A 搜索结果不作为规范保证。

## 3. Unix：可落实的最小范围与证据

保留根 Child 的真实 wait 状态，同时保留 runtime→captured helper/sid→PTY/SID/PGID 的清理对象，直到收束完成或明确 unknown。stop 同步关该运行新输入；先 HUP 已验证自有组，必要时 CONT 已停止作业使宽限可运行；deadline 后对仍需收束的自有组发 **libc SIGKILL**。强制判定基于清理范围，不再基于“根是否已 exited”。停止定时器携 runtime/native generation，不能在 root 退出/ID复用后无验证地 kill 一个缓存数字。

| 场景 | 最小可做动作与必须保留的结果 |
|---|---|
| 正常子孙留在初始组 | 组信号覆盖；根 wait 记录真实状态。宽限结束后即使根已退也处理该组残余；仍持 PTY 的读端不应导致提前删 live。kill 返回仅是请求结果，不能直接回 exited/归档完成。 |
| 同 OS Session 的 job-control 另组 | 只打初始组或 tcgetpgrp 都不足。可用受限 OS 观察发现与该已创建 SID/TTY/出生身份相符的组，逐次重验后发组信号；Linux /proc stat 可提供 SID/PGID/TTY/starttime，macOS 可评估 libproc 的组/TTY与出生信息。观察失败、身份漂移或仍有成员时保留 partial/unknown，不猜 PID。 |
| 主动 setsid、daemonize、跨进程服务启动 | 可能脱离原 SID/TTY，也可能已不可归属。没有权限/容器/常驻监控的本项目不承诺任意树完全控制；已捕获的残留列诊断，未能证明没有残留就不把 stop/归档写成完整成功。不扩大到杀同用户进程或全局扫描匹配命令行。 |

这里的 OS 观察用于界定/重验作用域和发现残留，**一次/两次 PID 快照、kill(0) 或 EOF 均不是进程树退出确认**。根 wait、合法组/会话观察、已知子进程证据和 PTY 排空分别保存；没有足够证据就准确返回未知，不能用“根0退出”覆盖清理失败。Linux 自动化可用隔离 fixture 的真实子孙 wait 提供更强测试证据，但不能把测试 fixture 的全知能力写成生产保证。

依据：[Apple kill](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man2/kill.2.html)、[wait](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man2/wait.2.html)、[setsid](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man2/setsid.2.html) 只分别承诺信号范围、child 状态和新 Session；没有 kill whole-session API。[Linux proc](https://docs.kernel.org/filesystems/proc.html) 明说打开 /proc/PID 并不阻止数字复用。Apple 官方 [libproc.h](https://github.com/apple-oss-distributions/xnu/blob/f6217f891ac0bb64f3d375211650a4c1ff8ca1ea/libsyscall/wrappers/libproc/libproc.h) / [proc_info.h](https://github.com/apple-oss-distributions/xnu/blob/f6217f891ac0bb64f3d375211650a4c1ff8ca1ea/bsd/sys/proc_info.h)（2025-10-16，文件声明 APSL2.0）有组枚举/出生字段，但头文件自称 private interfaces；只能评估窄适配和实机回归，不把它冒充稳定跨平台强 containment。没有复制其中代码。

Linux [cgroup v2](https://docs.kernel.org/admin-guide/cgroup-v2.html) 的 kill+populated 可提供更强组树范围，但要求合法 delegation/部署条件；迁移单 PID也不带走已存在后代。本轮不为口头“全树”引入系统权限、systemd 服务或 cgroup 依赖，不将 Linux 专有路线当 macOS 保证。

## 4. Windows 最小候选及替代路线

[AssignProcessToJobObject](https://learn.microsoft.com/en-us/windows/win32/api/jobapi2/nf-jobapi2-assignprocesstojobobject) 需要原生 handle 的 SET_QUOTA/TERMINATE 权限；已运行程序在 assign 前创建的后代不会被自动追溯移动。默认新后代继承所在 Job chain，nested 有顺序/限制；Session Job 不设 breakaway/UI limits，不为兼容而静默放开。参见 [Nested Jobs](https://learn.microsoft.com/en-us/windows/win32/procthread/nested-jobs)。

| 路线 | 取舍 |
|---|---|
| 真实 payload spawn 后立刻 Assign | 源改最少，但有真实抢跑窗口；Assign失败时历史后代可能仍在 outer Job。只可报告降级/未知，不作为完整方案。 |
| CreateProcess + PROC_THREAD_ATTRIBUTE_JOB_LIST | Windows10 的 Job-list 在初始线程运行前分配 Job，直接关闭目标抢跑窗口；[官方属性 API](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-updateprocthreadattribute)、[Raymond Chen说明](https://devblogs.microsoft.com/oldnewthing/20230209-00/?p=107812) 支持该顺序。但0.9公开层没有 hook/HPCON，需上游小扩展/经批准依赖补丁；不在仓库重造第二套 ConPTY。只用 CREATE_SUSPENDED 仍有创建到 Assign 的 creator-crash 窗口，且现库隐藏线程 handle，不能假装可直接恢复。 |
| 同程序受控 bootstrap + Session Job + 私有 gate | 不改 registry、不换 PTY、不增 daemon；只允许可信内部进程在分配前运行，用户程序永远在 Job 生效后才创建。增加内部控制/状态回传和一个有限生命周期 anchor，是当前最小本地候选，仍需 owner 选择和 Windows 实机。 |

**受控 bootstrap 建议顺序（尚未实施）：**

1. helper 的外层 KILL_ON_JOB_CLOSE Job 改为检查每个 Win32 返回值、非继承 handle、无 breakaway、RAII 持有。外层用于整个 helper/宿主死亡，不能在单 Session stop 时终止。若不能建立所需 containment，明确拒绝 PTY 启动，不杀仍可提供 Cookie/history 的共享 helper。
2. 每次 native sid 创建独立空 Session Job，检查 Create/SetInformation；先创建私有 `Local\` 随机名 gate（不含业务秘密、初始 nonsignaled、唯一冲突拒绝、适当当前用户/SYSTEM DACL），再经 portable-pty 启动 **同一已验证 huhu-pty 可执行文件** 的内部 bootstrap 模式。该模式在普通 stdio/helper初始化之前分支，只等待 gate/关闭/有限期限；不启动 Shell/Provider、不执行用户 hooks、不读终端输入作控制。
3. helper 用该 Child 的原生 handle Assign 到 Session Job并核验成功，原子检查本运行仍准许启动后才 SetEvent。bootstrap 此后才用已冻结的 literal file/argv/cwd/env 创建目标，子进程默认继承已生效的 Session Job chain。外层 Job继承兜底 bootstrap-before-assign 的 helper crash；宽限内 gate 未到则内部进程自行失败退出。不可将 helper 自身临时 Assign 到 Session Job：Job不能 unassign，会把其他 Session/Cookie 错纳入。
4. 0.9 CreateProcessW 的 bInheritHandles=FALSE，**不能只把父进程 handle 数值放 argv 当作已继承**。可按 [CreateEventW](https://learn.microsoft.com/en-us/windows/win32/api/synchapi/nf-synchapi-createeventw) 用命名事件 OpenEvent；也可用 [DuplicateHandle](https://learn.microsoft.com/en-us/windows/win32/api/handleapi/nf-handleapi-duplicatehandle) 向捕获 child handle 明确复制，但仍需私有通道传达目标上下文的 handle值。事件不是对恶意同账号进程的沙箱，遵守已有控制面边界。
5. gate 只能传放行，不能谎报实际 PID/退出。需有私有小状态回路：例如事件+固定上限的 [named shared memory](https://learn.microsoft.com/en-us/windows/win32/memory/creating-named-shared-memory)，或受限管道，传 bootstrap-ready/payload-spawned(actual PID)/payload-exit/OS-error。不得混入用户 PTY 输入/屏幕；字段有版本/长度/生命周期、访问权与同步保证。准确区分 bootstrap anchor PID、用户程序 PID和两者 wait 结果，不悄换现有 PID 意义。路径/argv/env继续沿原字面参数/账号 owner，内部对象不进入目标 env。
6. bootstrap 等用户程序并回传原 code，根程序退出时子孙仍由 Session Job 持有。helper 保留 Job 到整个范围结束；只关闭该 Session 的 HPCON/输入请求优雅退出，期限后 `TerminateJobObject(sessionJob)`，绝不操作外层。调用成功只表示终止请求；根真实 wait + Job 活动数归零才形成该 containment 范围的收束证据。
7. `QueryInformationJobObject(JobObjectBasicAccountingInformation)` 的 ActiveProcesses 是范围内证据；[会计字段](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-jobobject_basic_accounting_information) 与 [Query API](https://learn.microsoft.com/en-us/windows/win32/api/jobapi2/nf-jobapi2-queryinformationjobobject) 可作有界重验。已结束的本地过程句柄/引用及时释放，避免计数迟降；不要把“拿着所有重复 handle”误当稳妥。IOCP 可降低等待开销，但 [官方明确普通通知不保证投递](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-jobobject_associate_completion_port)，不能只等 ACTIVE_PROCESS_ZERO 通知。
8. Create/Set/Assign/gate/状态通道/目标 spawn 任一步失败都关本次 admission、保留 OS error/阶段，收束本次 Job或尚未入 Job的可信 bootstrap，等真实 handle 退出；不能补发用户程序或退回裸 spawn。只有确认没有晚到用户启动且清理结算，才按 T03 最终失败 codec 判断 effect=none；否则 unknown。stop 与 gate 并发、目标已产生后的取消，也沿该已捕获 Job 收束。

[TerminateJobObject](https://learn.microsoft.com/en-us/windows/win32/api/jobapi2/nf-jobapi2-terminatejobobject) 作用于该 Job及子 Job，不包括共享 helper 的 sibling Jobs。[ClosePseudoConsole](https://learn.microsoft.com/en-us/windows/console/closepseudoconsole) 会发 CTRL_CLOSE，但 Win11 24H2前可能无限等待，24H2起返回即刻；必须在独立清理路径关闭，继续读/丢弃已声明截断的剩余输出，不能让 credit暂停或持锁 drop 卡住全局 dispatch/Cookie/force deadline。HPCON关闭、根 wait、Job空三者分别记录；不能用 EOF 证明脱离 console 的 Job成员已结束。WMI/计划任务/服务/WSL guest 等非正常 CreateProcess 继承路径不凭此承诺完整树控制。

## 5. 原生/TS 接缝及精确路径

保持业务 expected-runtime → captured generation/sid。建议终态至少分别表达 root wait 状态、cleanup 范围/结果（confirmed/partial/unknown）、剩余/错误/截断；名称与 schema 交原 owner 冻结，以上不是现有协议。根先退出时仍可继续 stop/cleanup，旧sid仅清理旧对象，不触及新runtime。不能当前 exit 一到就丢弃 native清理对象/NativeHost等待；可扩已有 exit携证据或分 root-exit/cleanup-result，但宿主与 Rust必须一致且兼容表显式更新。T03 A 的结构化 spawn failure 未交付前不抢改其字段。业务仅在确认目标范围无活动后归档；timeout/lost不当成功，不为一条 stop 释放 Cookie lease。

当前 T04 已包含 `native/pty-server/src/{session,job,main}.rs`、`native/pty-server/tests/**`、services/terminal/**。需要 Lead 精确补齐的候选：

- `native/pty-server/src/bootstrap.rs`（若拆文件，仅 Windows 的内部模式/状态握手）；可将小 Job封装继续留 job.rs，不为设计形式增加第二 runtime manager。
- `native/pty-server/Cargo.toml`：现有 windows-sys0.60已有 Foundation/Security/JobObjects/Threading，Create/Open/SetEvent、Wait、DuplicateHandle、Job查询/终止的基本路径已在这些 feature；若选 mapping则加 **Win32_System_Memory**，若选特定ACL/pipe/IOCP函数才按真实API加 Authorization/Pipes/IO/FileSystem等最小 feature。无须现在安装或升依赖；不改 registry/node_modules/lock来做预检。
- `src/shared/native/host.ts`、`src/shared/native/frames.ts`，`src/host/desktop/native/{host,helper}.ts` 及其就近 `.test.ts` / `host.integration.test.ts`：退出/收束证据贯穿租约等待，不吞未确认失败，保持Browser并存。真实协议常量在 frames.ts，**不存在 shared/native/protocol.ts**。可能还需 native main.rs 的 PROTOCOL 同步；由 Root 以 T03最终产物为输入授权。
- 精确新增 native 测试可为 `native/pty-server/tests/session_tree.rs`、`tests/windows_session_job.rs` 及 `tests/support/tree_fixture.rs`（后者如实际需要）；终端服务测试落现已授权 terminal/**。不因为此研究自动扩 spaces/UI/其他票。

## 6. 有界验证计划与剩余未知

**Linux 可运行的未来测试，当前全部未运行：** 在隔离临时根由测试 fixture 启动自己的 helper、两个PTY和Cookie owner；只使用本测试启动的 Shell/子孙。覆盖根先退而后代继续持PTY、HUP忽略后期限SIGKILL、job-control另组、主动setsid的明确partial/unknown；第二PTY持续echo和Cookie在途完成；stop重入、晚spawn、流控暂停、helper关闭及runtime/SID旧事件不误杀。每步deadline，总预算统一，不串联无限等待。

确认测试进程退出应基于自己创建的 child/handle 的 wait；Linux可让**单独隔离的测试协调进程**作为subreaper，仅领收/等待本次后代（不在共享 cargo runner 进程设置影响并行用例），按 fixture 明确登记的子孙逐一wait核对。不能以 ps/kill返回/PID消失替代该证据，finally也等本次helper实际退出再删自有临时目录。真实Cookie共存可复用 host.integration.test.ts 的SQLite阻塞夹具；不用真实账号/Provider。此 Linux夹具的可证清理不自动成为生产全树承诺。

**Windows 代码自动化可交付但此机不能声称已跑：** 平台无关的 stop/gate 状态机与可注入 Win32 adapter 故障序列（Create/Set/Assign失败、已占事件名、gate取消、helper死亡、目标启动失败、晚回执）；`#[cfg(windows)]`真实 Job/ConPTY fixture验证父/子/孙、nested允许/拒绝、breakaway不放行、根先退、Job零计数、单Session stop不终止Cookie/另PTY、句柄释放、实际payload PID/exit。不同祖先Job限制、Win10/Win11<24H2/24H2+ ClosePseudoConsole、中文/空格argv与实际Provider进程树需要Windows用户实机；交叉编译/skip不是运行通过。macOS同样保留job-control/TTY/libproc权限与归档边界的用户实机验收。

尚需 owner 选择/核验：bootstrap私有状态通道与PID语义；Unix在目标macOS SDK上的最小可用观察接口和未确认分支；退出/cleanup协议与T01 5s预算如何协调；Windows实际祖先Job、控制台/pipe排空与合法继承。不能用这些未知放宽生产门，也不因此替用户修改产品合同。**READ-ONLY STOPPED：未修改仓库/正式记录/Git/deps/target，未运行测试、构建、helper、Provider、native或用户进程，未派Agent。**
