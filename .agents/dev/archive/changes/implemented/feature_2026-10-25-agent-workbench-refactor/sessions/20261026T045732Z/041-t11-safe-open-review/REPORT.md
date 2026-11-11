# 任务回报

Session: 20261026T045732Z  
Task: 041-t11-safe-open-review  
Status: completed

## 聚焦交接

结论：**A（稳定 syscall router + 私有 SourceSqlite + 默认 VFS 转发）可作为第一实施阶段的路线；本次未发现公开 FFI/布局或 Windows 绑定使它硬不可行。037 不能原样当作安全性完成合同：必须把下述三项补入冻结实施合同及首阶段真实红绿门。** 不要求先完成完整 VFS 或六 Provider 才允许 Root 做正式 DoR；允许 Root 据修订后的合同开始窄实施，首阶段不通过就不进入 Provider 接线/产品能力开放。完整薄 VFS 仍未实施、未证明。本报告不是 T11 Ready、AC 通过或最终两轴代码审查。

本次独立于 034/037 研究实现；工具身份及用户指定模型由 Root 的实际派遣核验，不以报告自报认证。遵循 TASK 的只读范围，未读 T09 当前动态 workspace-service 源，未写产品、Spec、Ticket、Goal、旧证据、Git/index。采用 dev、I/P 相关入口、codebase-design/risk-review 的工程规则进行规划预审，不另建 Change/原型或递归派遣。

三项必须修订的内容是：默认 SHM 方法返回之前的副作用和拒绝清理；被拒绝原始 fd 的 POSIX 锁所有权；SQLite close 与 OS close 的不同完成语义。它们均有固定源码依据；本文给的是静态失败序列与实施门，**不是新探针已经复现成功**。

## 工程发现与最小修订

### F1：事后 SHM provenance 门能挡住 pager 消费，不能独自挡住默认方法内部副作用（高）

037 §4.2.6 在 base.xShmMap 返回后才判断是否观察到安全 SHM open。原 037 reuse 已证明该调用可复用无本 scope provenance 的对象。锁定 sqlite3.c 的 unixOpenSharedMemory:43035–43170、unixShmMap:43189–43306，以及 winOpenSharedMemory:50575 起、winShmMap:50863–51000 表明：复用对象的 isReadonly 来自旧对象，不会因新连接 URI readonly_shm 自动重写；请求新区域且 bExtend/isWrite 非零时，Unix 在返回前直接 seekAndWriteFd 扩展，Windows 直接 winTruncate；随后可能建立可写映射。外层 xWrite/xTruncate 拒绝并不经过这些内部调用。只在返回后清空 *pp，不能撤销它们。该失败序列需要已有可写 SHM、增长/不足的区域和新 scope 请求，普通已映射第一页的 reuse 探针不证明这一分支已安全。

另一个独立窄副作用：Unix 新 SHM 在 sqlite3.c:43133 调用 robustFchown；38960 明确其在 HAVE_FCHOWN 且 euid=0 时执行 osFchown。037 探针 uid=1000 没有覆盖此分支。macOS findInodeInfo:39795 附近还有零长 msdos 文件的内部 osWrite。后者通常会被真正 O_RDONLY fd 拒绝，但再次说明“外层方法没有写”不是完整证明。

最小修订：

- source xShmMap 只请求已有区域（向 base 传 bExtend/isWrite=0），不足则明确来源恢复限制，绝不能随后以可写扩展重试；记录这条对正常 live WAL 的真实兼容门。既有安全只读 SHM 的 SQLITE_READONLY + 非空 pointer 是正常 SQLite 协议，不能一律改成 IOERR。
- scope 内底层写入/截断/所有权修改/路径删除必须受稳定 router 的明确策略约束；当前允许配置的 Unix syscall 表在 38775–38945，Windows 同类接缝已有。只读禁止真实 fchown，不能借更改全局 euid 实现。若要声明“不映射无 provenance 对象”，还须在 mmap/CreateFileMapping 调用前核实其 fd/HANDLE provenance；单纯事后门最多证明 pointer 未交给 core。不需要读取 unixFile/winFile 私有布局。
- main/WAL xOpen 的 provenance 必须绑定本次调用、文件角色和实际对象，不能凭 scope 曾经成功打开某个 fd 就放行。xShmMap 每次都先置 *pp=NULL；无 provenance 时 sticky fail，之后不继续 metadata/body。
- 清理不能直接跳到 base.xClose：一次失败的 base.xShmMap 也可能已挂上 pShm。先用 base.xShmUnmap(file,0) 拆掉本连接引用，再按 base.xClose 清理，均恢复同 scope。unixClose:40560 后明确 assert(pFile->pShm==0)。不要把整个共享节点当成本 scope 私有对象释放；base 的引用计数/锁归属必须保留。内存不足、READONLY_CANTINIT、复用拒绝等返回均纳入该状态机。

关闭本 finding 的证据必须同时观察：无未授权内容结果、原 source/sidecar 字节与长度/必要元数据未变化、已有连接仍能继续读写、外部进程的锁竞争仍正确。不能只断言错误码。

### F2：在 router 内拒绝后直接 close 新 fd，可能破坏其它 SQLite 连接的 POSIX 锁（高，静态可达前提需实际测试）

失败序列：同进程 cache/另一个连接持有 SQLite inode 的 POSIX 锁；恶意/违例 hardlink 或路径替换让 source 的真实 open 获得同 inode；router fstat 后因 expected identity/owner 不匹配拒绝，并自己 close 该 fd。POSIX close 会清除该进程在同一文件上的锁；其它连接仍可能认为锁有效。要求“禁止 source/cache alias”只决定返回拒绝，不解决拒绝动作本身。主库 extra probe-fd 已被037排除，但真实 open 的失败清理也有同一风险。

依据：原官方 howtocorrupt §2.2；sqlite3.c:40534–40566 的 unixClose 在 pInode->nLock 非零时把 fd 放 pUnused，避免直接 close；44443–44490 的 findReusableFd 会从这条队列取回。safe root 目录能力防路径逃逸，本身不隔离 hardlink 的物理 inode。此问题不是 Windows HANDLE 的同等断言。

最小修订：一旦 fd 已交给 base，所有终结必须经 base 的默认关闭协议，不能包装层 RAII 再 close 一次；main 的身份拒绝尽可能在 base 初始化成功后、core 首次 xRead 前完成，由 base.xClose 收尾。**这仍不自动解决 router 尚未交出的拒绝 fd、SHM alias、或普通日志 reader 的同 inode close。** 第一实施阶段须选择并实现这些 fd 的具体 owner/安全延迟清理策略，例如有界地隔离该 fd 至同 inode 的 SQLite 占用已经实际结束；不能按固定超时猜结束，不能无限堆积泄漏。需要知道的 owner 事实应来自受控打开/关闭记录与门，不从私有结构强读。若该方案需要额外同步触点，由 Root 先冻结；不把“预计没有 alias”写成已证安全。

最低反例使用本进程持锁连接 + 同 inode 被拒 source + 另一进程争锁，并在拒绝后继续原连接事务；应保持锁有效、无源读结果、无 fd 无界增长。默认 VFS 已拥有的 deferred fd 必须照默认协议回收。若 A 在此门不能实现，可重新比较 B 的所有 SQLite 连接完整生命周期串行门；不得悄悄只锁 history 并宣称覆盖了 cache/Cookie。

### F3：Connection::close 成功不是底层 fd 全部关闭证明（中高）

rusqlite inner_connection.rs:150–175 只在 sqlite3_close 成功后清 handle，这支持处理 SQLITE_BUSY 的活连接重试。但 sqlite3.c:39696 的 robust_close 对 osClose 失败只记日志；40499–40529 的 closeUnixFile 随后清空结构、返回 SQLITE_OK。40534 的 unixClose 还可合法将 fd 延迟给其它连接。因此仅看 rusqlite close 的 Result，不能实现037所述完整 drain/close失败归属。

最小修订：稳定 router 对真实 close/CloseHandle 的结果和 fd/HANDLE 归属记录必要的独立错误/生命周期事实。区分：SQLite BUSY（连接仍活，可保留 owner 等待 statements 收尾）；SQLite 已销毁但 OS close 失败/不确定（不能再调用死 Connection/基址，应保留明确失败与隔离占用）；正常由默认 VFS 接管的 deferred close（不能由 scope 自行关 fd）。错误记录不能持有已释放 scope 的裸指针。原源码特别说明 EINTR 后 fd 可能被其它线程复用，**不得盲目重试 close**。失败影响应限制在该来源 owner，未 scope Cookie/cache 继续按原语义运行。全局 router 直到进程退出保持有效。

此处需要实际故障注入，证明 close 错误不会被吞成成功、不会双关或误关复用 fd；对默认延迟关闭与取消后关闭也要观察最终 owner 状态。不能把保留 gate 等同于保留已销毁连接。

## 其它可实施性判断与冻结细节

**公开布局与 FFI。** 可以不解释私有结构：外层 repr(C) 以 sqlite3_file 为首成员，保存独立的 base 指针及 scope owner；内层使用 SQLite 自己的分配器分配至少 base.szOsFile 字节并清零，避免 Rust Vec<u8> 的不明对齐或自行计算私有尾部。将原 base VFS 指针/pAppData 传给 base.xOpen，按内层实际 io_methods 的 iVersion/可选方法建立转发，外层存储与内层存储各有唯一释放者。返回失败仍必须设置外层 pMethods 为有效表或 NULL；若已手动清理内层，则置 NULL 防 core 再 close。原 VFS/IO 官方合同与 ffi 公开类型支持这一接缝。禁 xFetch 或返回 OK+NULL 让 pager 回 xRead；xUnfetch、xSectorSize、xDeviceCharacteristics、xFileControl 也需明确处理，不能只列出 xRead/Lock。FileControl 只转发所需且安全的操作，审计会改变 mmap/锁配置或暴露 VFS/文件指针的命令，禁止外部使用裸 Connection/Statement/Blob/备份对象。原 SQLite filename/URI 内存的寿命必须覆盖 base 使用期，不能把临时 CString 地址存进去。

**延迟回调与线程。** SourceSqlite 是本 worker 的短生命 owner：固定 SQL/参数、只读事务内 metadata→准入→body，所有 prepare/step/finalize/rollback/close 期间的文件回调从文件持有 owner 恢复 TLS。VFS 的 xOpen/xAccess/xFullPathname 等则从其 pAppData 恢复。只在构造连接时设 TLS 已被原 escape 反例排除。取消禁止新工作，但必须允许安全的释放/解锁收尾，否则会制造资源泄漏。同物理源 gate 以对象 identity 为准，字符串路径不能覆盖 alias；禁止池化和裸对象逃逸，使编译期接口尽量关闭该通道。回调不得 panic、使用会 panic 的借用/毒锁 unwrap 或无界分配；release panic=abort 不能由 catch_unwind 挽救。

**全局安装和无 scope 委托。** 初始化在 helper 第一个 SQLite 使用者/工作线程之前完成，而不仅是“第一次 history 查询之前”；读取并校验默认 VFS 版本、所有需要的 hook 与原指针，安装失败在未并发阶段回滚。稳定回调用精确 C/System ABI，尤其不要把 variadic fcntl 等随意强转成不匹配签名；若补 hook 需要 C trampoline/额外构建触点，必须由 Root 扩精确写集，不能假称纯 Rust 强转已正确。无 scope 分支保持原参数、返回值、errno/GetLastError，不以 ambient cwd/账号推断来源。scope 栈恢复必须包含失败与嵌套；路由与记录不可持锁再重入 SQLite 导致锁顺序反转。模块 dispose 不卸载 router；隔离测试用新进程，只有所有 SQLite 使用者真正结束后才恢复表。原 unscoped fixture CRUD 不替代真实同 helper cache/Cookie 并发测试。

**Windows。** 固定 windows-sys0.60.2 的 Wdk/Storage/FileSystem:614 确实有用户态 NtCreateFile，所需 feature 与037列举一致，未见必须换 crate/私有 winFile 的障碍。逐组件 RootDirectory+FILE_OPEN+FILE_OPEN_REPARSE_POINT，验证返回 handle 类型/file identity/reparse tag后交给默认 CreateFileW 调用方；成功 transfer 后只由 SQLite 关闭，失败由尚持有者关闭，目录 HANDLE 独立。需要准确保留读访问、share flags及同步语义（同步 NtCreateFile 配 SYNCHRONIZE）、UNICODE_STRING 长度、NTSTATUS→Win32 error与 INVALID_HANDLE_VALUE 约定。不得把 RW CreateFileW 请求偷偷降成只读后仍向 SQLite 报“RW成功”；应拒绝，让默认 winOpen 自己走只读 fallback 并设置正确 outFlags。原 winOpenSharedMemory:50620 确有 readonly_shm 分支；Windows SHM复用按不区分大小写文件名匹配（50600附近），所以不能仅以物理 source gate 认为不存在复用。UNC、大小写敏感目录、junction/leaf reparse、mapping与close都待实际平台验证。

**只读 WAL 与恢复。** 保留默认 WAL 事务/锁，不用 immutable/nolock/只读主库回退，不另写 WAL parser，不复制全账号 DB。原 normal/snapshot 只证明该 Linux 环境已有 live writer/WAL/SHM 条件；只读 SHM 无其它进程 DMS 锁时会出现 READONLY_CANTINIT，缺区域/损坏/恢复必须有明确结果。readonly_shm 是锁定实现行为，不扩称永恒公共 URI API。不得以缺失恢复测试为由永久删除 OpenCode 支持；六 Provider 正常 fixture 和真实未 checkpoint WAL仍是后续完整T11门。

**准入与版本。** 冻结 Spec AC-033–036、PAGE-002/AC-061、034 的 list/preview、单 owner 和有界协议不变。metadata 只提取白名单身份字段/标量；pager可能触及同页其它字节，但不将未准入正文解码为消息、投影/搜索/索引或落 UI。sourceVersion 对实际读过的 metadata/body coverage 计算 digest，不以 mtime/size 或“查询事务成立”冒充内容版本，不为了 digest 在 metadata阶段全库读/复制。SQLite digest须标识本次快照下实际获准行/内容覆盖；JSON/JSONL同句柄读取后核变化线索，Grok伴随/Gemini注册各自固定。named locator被换后即使旧 pinned root仍安全，也不能冒称当前来源可继续。来源失败保留HUHU标注，不污染其它来源。

**A/B/C 比较。** A 仍是首选，因为保留默认 WAL/锁，只对来源 capability、回调和 owner 收口；不过“约二十个转发方法”不能当完整工作量估计，F1–F3会增加必要的底层生命周期门。B 所有 SQLite 任务从 open 到 close 的全局门可收紧并发，但Cookie/cache全入口、取消和滞留连接都得纳入；它不是只给 history 加 mutex。C 完整安全 VFS可实现，却承担另一套平台锁/SHM协议，现无证据值得为本票引入。若A首阶段反例门失败，Root重新评估A/B，不以全库copy或移除Provider伪造通过。

## 最小可执行阶段门与下一步

1. **冻结后即可开始第一阶段。** Root接收修订A，冻结 F1–F3、SourceRoot/SourceSqlite所有权、错误DTO、只读SHM限制、phase预算、精确native/main/Cargo写集；T09/T10动态接口在接线前重核。此时不要求已有完整生产实现，也不开放history能力。
2. **第一阶段真实实现门。** 使用锁定 bundled SQLite 的实际生产安全接缝和合成隔离fixtures：普通主库/live WAL与并发append快照必须成功；原 parent-main/parent-wal、leaf、reuse、escape 必须拒绝或安全绑定；新增SHM缺region/增长/readonly/error-return清理、main deferred-fd复用、F2同inode拒绝后外部争锁、F3故障close、取消/重开/失败回滚；所有路径核源文件无写删、没有无provenance结果、他人锁未失效、资源有界。每个负例必须先能使未防护实现失败；exit0观察反例不算保护通过。
3. **同helper隔离门。** source作用域与无scope生产cache/Cookie SQLite入口在不同线程实际并发，验证读写/锁/error保持原行为；嵌套/失败TLS恢复、早期安装失败回滚及测试进程退出。测试只能使用合成隔离数据，不触真实账号。第一阶段未通过，暂停依赖它的Provider实施，保留可运行失败证据，不重复跑037旧probe代替新shim。
4. **后续T11代码验收门。** 接六Provider真实metadata/body parser、同inode/size/mtime内容变更、准入前不建正文对象/索引、有界coverage、取消与来源恢复、真实native/CLI消费者和页面局部自动化；源码与适用产物一致后由Root最终独立审查。Windows编译/feature闭包/ABI与平台可执行自动化属于实现验证；环境未提供则准确待验，不把Linux成功外推。
5. **用户实机门。** 真实 Provider/Obsidian、OS IME、Windows x64/arm64及macOS两架构等原约定五平台操作仍由用户验收；交接具体未验场景和已通过自动化。本次不执行这些操作，不将它们全部转给用户替代Agent应完成的源码/自动化门。

## 产物与验证

本041证据根 R=`/tmp/huhu-t11-safe-open-review-q6ifvnja`，只新增静态记录、本文草稿及return回执。正式REPORT按TASK要求无覆盖原子写入本041目录。

- TASK SHA256 `521f3064b9c99fc791ca7b9125f8547810073cd45714a765a75a098c7fdedbe7`。实际只读 `git rev-parse HEAD` 为 `33c21e098ef3188cbab5a09f3e0a01fadb787715`。
- Root inputs SHA256 `dd928f8c0a095a14aa01085233b31322ad60fd700389c47dd96f5fd339b77d53`；12个固定snapshot逐字节核验，mismatch=0，见 R/input-verification.json。包括037 REPORT `bdfe5467…4947`、设计 `c74ddac4…9fc3`、SOURCE-OPEN-MAP `351fb79b…1ae`、Root audit `8ea991cb…b4c0`、034 audit `b2b6ff09…a5b2`、Spec `d204c7a0…2618`、Ticket及implementation-contracts。完整digest及路径在该清单，不依赖动态源。
- 定向读取原034工程合同：其audit引用snapshot `1a8378c840497b32dd66b3cfa5622407009572c5b3eb10cf49cbb81bd96d574b`；未通读其它票。
- R/sources-manifest.json 核验56个规则/原库/原官方文档/旧probe raw的身份，已给expected项mismatch=0。registry-manifest `6e0203d5057bc6157c5de6fd4a87de298c1b0e6e931992b8c0d3ca8f43515bc8`。大库未重新复制；定向阅读原SQLite C（SHA256 `c01235302fe80da901fb70c7622c39147e29d9f29b7f6eb746b23517f320c90d`）、公开FFI/头、rusqlite close及Windows NtCreateFile绑定。R/sqlite-static-excerpts.txt按原行号保存本次关键静态分支；摘要核验不声称对所有56项作全文语义审计。
- 复用原037的13个Linux probe真实回执与raw；回读 reuse/escape 原文及mechanism-assertions。其证明范围仍是 Linux router机制和反例。所有原raw摘要与原receipt一致；本次未重跑任何probe，未构建Rust/native/helper/插件、未测试、未启动浏览器、未安装依赖、未操作Provider/Vault/账号数据。原官方文档本地原字节足够本轮锁定版本判断，没有重新联网搜索或声称最新API验证。
- 许可只读取原锁定 MIT 的 rusqlite/libsqlite3-sys、SQLite公共领域头及windows-sys现有许可/元数据；没有复制外部生产实现或引入依赖。工程预审不运行dev实现收尾/构建。
- 正式REPORT写入后实际执行原 `validate-dispatch --stage return`，命令、raw/exit、UTC及TASK/REPORT/validator摘要写 R/return.receipt.json 和 R/return.raw.log。本文不预填尚未运行的结果；结构校验不认证工具身份或业务安全通过。

## 问题与下一步

Root接收的是可据冻结合同开始第一阶段的工程判断，以及三项首阶段必须解决的具体风险。F1–F3不靠更新文案关闭；需要新真实shim及上述验证。未发现必须新建第二WAL实现、解析私有布局或换依赖的硬阻碍；也没有证据让完整A现在获得fail-closed声明。若F2安全清理或F3底层归属不能在有界实现中建立，停止对应路线并重新比较A/B，不默认降级为不支持OpenCode。正式DoR、写集更新、T09/T10衔接和最终T11验收仍由Root负责。

SOURCE READ ONLY。
