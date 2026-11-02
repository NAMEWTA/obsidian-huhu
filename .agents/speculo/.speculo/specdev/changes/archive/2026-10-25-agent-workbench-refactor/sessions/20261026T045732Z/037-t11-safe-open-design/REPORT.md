# 任务回报

Session: 20261026T045732Z  
Task: 037-t11-safe-open-design  
Status: completed

## 聚焦交接

037只读工程准备已交付。选定候选为固定root能力、一次稳定SQLite syscall router、history专用薄VFS转发包装，以及不池化的私有SourceSqlite连接/单源DB门；继续复用默认Unix/Win32 VFS的锁、WAL与事务，不重写六Provider或WAL协议。**完整薄VFS尚未实施或证明，不能把候选称为fail-closed已通过或T11 Ready。** T11未激活，产品/正式状态未写入。

核心真实发现：锁定SQLite3.46.0中，READONLY|NOFOLLOW在parent于OS open前被换链接后仍读到FOREIGN-SECRET；主DB打开后，延迟WAL/SHM也会真实打开outside对象。rootfd openat路由保留正常未checkpoint WAL，能阻止这两个确定替换窗口；但已有SHM会绕过open hook、Connection逸出TLS后会再次委托打开outside sidecar。因此不能只加NOFOLLOW、事后stat或constructor TLS就关闭工程门。immutable实验实际漏掉wal-fresh，排除该捷径。

A候选的完整性门已写明：主FD/WAL xOpen成功却没有本scope实际安全open provenance时，不能向SQLite继续暴露文件方法；首次SHM没有实际安全打开或本file此前已验证对象时，不得把映射pointer交给SQLite。每个IO/SHM/close回调从文件持有的root能力恢复上下文，禁源写/删除、SHM-unmap强制不删除；SourceSqlite不向外返回Connection/Statement，close成功后才能释放同源门。单独router和这些完整门不是同一份已测能力；复用/mmap、Windows、macOS、取消/close等仍需真实实施验证。

同时给出可行B：所有cache/history/Cookie SQLite任务统一gate后临时装卸public hooks；它需要扩大Cookie与cache触点并串行阻塞，故不选。完整自写VFS更复杂，不选。保持六Provider正常格式支持；只读WAL/SHM缺失或需恢复不能伪装主DB完整成功，更不能永久删OpenCode支持。

## 产物与验证

证据根 R=`/tmp/huhu-t11-safe-open-hkbob7fw`。

- `R/SAFE-OPEN-DESIGN.md` SHA256 `c74ddac404b0e65f533d3730a2da1e7c604f07458555588157baba22a8599fc3`：方案比较、root/parent/leaf边界、每回调绑定、主FD/首次SHM provenance拒绝门、全局安装/委托/恢复/panic、取消close、只读WAL、metadata/body与跨平台候选。
- `R/SOURCE-OPEN-MAP.md` SHA256 `351fb79b965c0178b9f682f661813e721406c29219c135ff44426598f081b1ae`：原agent_data全部生产打开点、scope/cache区别、data线程与Cookie/main接缝、锁定库符号/许可。
- 固定inputs原字节SHA256 `8ee6478181f347476de784d7118da6f8971496859be3a6bfca174d1a3d9b6f7a`；10个实际snapshot摘要全核，mismatches=[]。TASK SHA256 `748e1a7b7655fd92a8cc1143abcc1fa52748cf3069615b78de04e89e973bec08`，Root034接受audit `b2b6ff0911afcf547e3937d43b07324c0b8307923dbd6938924a290e636ea5b2`。复用已读规则并核未变化，见rules-reuse-verification；原034不改写。
- 现有安装源码/许可证/版本原字节见registry-manifest（SHA256 `6e0203d5057bc6157c5de6fd4a87de298c1b0e6e931992b8c0d3ca8f43515bc8`）；补读main/cookies/host路径入口先保存path/原SHA再读，见new-observation-manifest。这里只是固定观察，不宣称T09/T10未来接口已稳定。

最接近真实实现的本轮probe是自有Rust程序，原Cargo依赖集合及原lock、--locked --offline、独立target，仅运行safe-open-probe和其合成DB writer子进程，未编译或启动HUHU helper。实际链接rusqlite0.32.1/libsqlite3-sys0.30.1（bundled SQLite3.46.0）与libc0.2.190。源码SHA256 `5854751666d5ca98a3149169351d6cb176bb07c01ffee7a610513e1eb237d091`，保留二进制SHA256 `7898642775539bdf307929d4e1f7790969b1693be4b3d7fa7d654ead51c3068b`。

13个case各有真实argv/cwd/UTC/exit/raw/binary/source SHA回执，汇总probe-results及mechanism-assertions（SHA256 `01145b808b061dec54c19f47d104449023750d472a8dfa43fee0e0788791b29c`）：

- normal实际返回base+wal-fresh；snapshot在另一进程append后事务内仍2条、COMMIT后3条。
- nofollow-parent-main真实打开outside并读取FOREIGN-SECRET；nofollow-parent-wal真实打开outside WAL/SHM。secure-parent-main/wal则只返回原pinned root的fd并读取base+wal-fresh。
- leaf WAL/SHM变symlink时当前原VFS及安全router都CannotOpen，fd=-1；不把这两项称原leaf漏洞。
- reuse已有连接保留SHM时新scope不触发SHM open仍成功；escape连接逸出TLS后query实际委托打开outside WAL/SHM。它们是实际反例，exit0只表示探针观察完成，不是安全通过。
- immutable只返回base，证明漏WAL；所有case结束后scope外own-cache CRUD仍正常delegate。该CRUD不是生产Cookie测试。

另有file-probe.py实际exit0：rootfd下JSONL parent替换仍读原对象；leaf symlink ELOOP；保持inode/size/mtime时正文SHA仍改变。输入SHA及实际stat/digest见file-probe.raw/receipt。它是Linux OS机制，不是六Provider parser测试。

build-001实际exit101（临时probe statement借用生命周期错误）及原源码/raw保留；窄修后build-002真实exit0。没有再次扩大构建。编译消费保存原lock/manifest、691项实际.d文件身份、Cargo fingerprints、registry SQLite C源码与工具字节/version；compile-consumption SHA256 `396b9b9162dd121e3df44158a7f7c5d56919e572617409d5d1bbc0fc26278f10`。非verbose build没有逐条记录C编译器子命令，.d清单不是完整OS读取trace。DB/WAL输入由保存的生成器源码及各case argv约束，WAL运行中间态未另做字节快照；fixture-final-manifest明确只是writer退出后的最终状态，不冒充中间输入快照。

外部仅查官方API文档，7个GET均HTTP200，URL/获取UTC/HTML原字节SHA见official-sources（SHA256 `05a0ef5e839ebd528321820fdea173b45a784b9f261ba3295e67d02b88b8a988`）。[SQLite VFS](https://sqlite.org/c3ref/vfs.html)、[IO方法](https://sqlite.org/c3ref/io_methods.html)支持公开包装接缝；具体全局函数表/延迟SHM/复用行为来自锁定3.46源码与本地probe，不能扩大成API通用线程保证。[WAL官方说明](https://sqlite.org/wal.html)说明只读WAL侧文件条件；[一致性风险](https://sqlite.org/howtocorrupt.html)约束独立fd close与快照；[POSIX openat](https://pubs.opengroup.org/onlinepubs/9799919799/functions/open.html)和[用户态NtCreateFile](https://learn.microsoft.com/en-us/windows/win32/api/winternl/nf-winternl-ntcreatefile)给相对目录能力的官方依据。只读URI行为与immutable限制另见已存官方URI页。未添加依赖或复制第三方生产实现。

资源已清理：13个父probe和各自writer子进程均实际退出/wait，未超时；按Root磁盘约束，在固定源码/消费/raw/回执/hash后删除仅本037的target（逻辑326,596,852B）与合成fixture树，保留10,135,952B二进制与必要证据，见cleanup.json。Python自己的file-fixtures也已删除。未接触其它任务目录、真实账号、历史、Vault、Provider、Chrome或Obsidian。

本REPORT一次性原子落盘后实际运行validate-dispatch --stage return，原raw/argv/UTC/exit/validator与TASK/REPORT摘要保存在R/return.raw.log和R/return.receipt.json；本报告不预填尚未运行的退出码。结构检查不代表候选安全或AC接受。

## 问题与下一步

Root可据候选先补精确native写集：history_source/mod.rs、unix.rs、windows.rs、sqlite.rs；原agent_data.rs/main.rs，以及现有windows-sys的Wdk_Foundation/Wdk_Storage_FileSystem/Win32_System_IO features。现有windows-sys0.60.2绑定实际提供ntdll NtCreateFile RootDirectory，版本/许可证不变，但本轮没有Windows编译/ABI/运行证明。

正式DoR仍须验证完整A：薄VFS文件布局与转发、主FD与首次SHM复用拒绝发生于core消费之前、延迟IO/close上下文、无连接逸出/池化、全局init/委托跨线程、取消与close失败、只读SHM missing/corrupt/recovery、limits、Windows/macOS及六Provider正常fixture。拒绝返回不能冒称从未打开或映射过旧对象；本轮只对明确新open窗口有fd trace证据，没有完整shim的零越界读取证明。若这些门不能证明，保留候选/来源限制与未验状态，不能把设计推导写成fail-closed完成。

SQLite metadata查询仍可能触及同page中的其它原始字节；本合同是不解码/投影/索引未准入正文，不伪称整个账号DB字节从未进pager，也不copy/deserialize全库。所有Provider正常格式/正文支持最终仍由原native parser测试关闭；本轮不替代T11代码、真实CLI/native消费者、用户Provider/Obsidian/OS IME/五平台验收。Root拥有正式接收、DoR与最终代码验收；没有正式状态、提交、推送、发布或归档动作。

SOURCE READ ONLY。
