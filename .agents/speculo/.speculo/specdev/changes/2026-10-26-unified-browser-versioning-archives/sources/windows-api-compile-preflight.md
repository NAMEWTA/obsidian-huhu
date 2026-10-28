# T09 Windows API compile-only 可行性回执

2026-10-27，native:/root/implement_t01（gpt-6.1-sol/high）执行；Lead 已实际回读 PROBE.md 与 final-check/final-build 日志。该探针未启动 T09，不是生产实现或平台验收。独占临时目录 `/tmp/huhu34-win-api-probe-4Eqsjx`，约30MiB，无运行进程或证据外引用，可在后续作者读取后回收。当前保留。

最终离线 cargo check --all-targets exit0（1.88s），cargo build Windows GNU链接 exit0（1.77s，日志保留等待cargo目录锁）；没有执行生成程序。

实际文件SHA256：

- `src/main.rs`：`80dfeec63f3d4146d81d5fc7d1c0630031638e8a343267474a93ed5f5d1daa4c`
- `Cargo.lock`：`6fc492d615bd98c448d83d7f7ae86488d20669cc1fe80a32c541fb9ef9791167`
- `PROBE.md`：`2e5fc4f7a6b35b5f78fcb709bc47d7266f51684f969392c4164b890136010995`

以下原样保留Agent探针说明和一手来源；编译产物不作为最终native运行包。

# Windows Rust API 临时编译探针

仅供 T09 API/feature/link 可行性参考，不是生产 launcher、管道连接或回收实现。未执行生成的 Windows 程序、helper、Chromium、Obsidian 或真实平台验收；仓库未修改。源码为本次独立 API shape fixture，没有复制参考项目代码。临时目录及所有产物可整目录回收；回收前由 Lead 保存所需摘要。

环境实际观察：Linux x86_64，/tmp 可用约 33 GiB；rustc 1.99.0，已安装 x86_64-pc-windows-gnu；存在 x86_64-w64-mingw32-gcc。仅用现有缓存，Cargo 参数 --offline，无依赖下载/安装。

固定依赖 windows-sys =0.60.2，缓存依赖解析为 windows-targets 0.53.5、windows_x86_64_gnu 0.53.1。features：Win32_Foundation、Win32_Security、Win32_System_JobObjects、Win32_System_Threading、Win32_System_Pipes、Win32_System_IO、Win32_Storage_FileSystem。

命令：

```sh
cargo check --offline --target x86_64-pc-windows-gnu --manifest-path /tmp/huhu34-win-api-probe-4Eqsjx/Cargo.toml --all-targets
cargo build --offline --target x86_64-pc-windows-gnu --manifest-path /tmp/huhu34-win-api-probe-4Eqsjx/Cargo.toml
```

初版两命令分别 exit0（1.33s / 2.21s）。最终增加双向 pipe access 与 ConnectNamedPipe symbol 后的实际结果由 final-check.log/final-build.log 保存。main 只 black_box 函数地址，不调用 Win32 shape 函数；本轮没有执行 main。链接产物是 x86-64 PE32+；objdump 只静态读取 imports，已看到 CreateProcessW/UpdateProcThreadAttribute/CreateJobObjectW/SetInformationJobObject/GetProcessTimes/CreateNamedPipeW/WriteFile/CancelIoEx/GetOverlappedResult。

API shape：Job 采用 null security attributes＋清除/读回 HANDLE_FLAG_INHERIT；extended attribute list 同时携带 JOB_LIST 与两个 child pipe endpoint HANDLE_LIST；CreateProcessW bInheritHandles=TRUE，STARTUPINFOEXW.cb=结构大小，flags 包含 EXTENDED_STARTUPINFO_PRESENT/CREATE_SUSPENDED/CREATE_UNICODE_ENVIRONMENT/CREATE_NO_WINDOW。没有 create 后 AssignProcessToJobObject 步骤。Job/parent pipe 不在继承白名单中；数组存储保持到 DeleteProcThreadAttributeList。

GetProcessTimes 创建 FILETIME 合并为 u64 十进制 birth 字符串。named pipe server 可按方向配置 FILE_FLAG_OVERLAPPED，child 端同步；连接握手、secure DACL、名称碰撞防护及 cleanup 仍不在探针中。默认 named-pipe DACL 不是严格私有证明；生产不能直接照抄该 skeleton。

有界 I/O shape：每次 WriteFile 带 caller-owned 稳定 OVERLAPPED/bytes/event，WaitForSingleObject(150)，超时 CancelIoEx，再 GetOverlappedResult(FALSE)。若仍 ERROR_IO_INCOMPLETE，必须继续持有内存/event/handle，不能释放、伪报取消或重放半帧。探针不实现 production completion owner；150ms cancellation request 不是 150ms 完成/回收保证。独立控制 lane、partial-write/outcome_unknown、终止 Job 后完成收束仍需实码与平台证据。

一手来源（只借鉴 API 契约，未复制示例代码）：

- JOB_LIST/HANDLE_LIST 支持、flags/lifetime：https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-updateprocthreadattribute
- Job-before-primary-thread 与 suspended→Assign 崩溃窗口解释：https://devblogs.microsoft.com/oldnewthing/20230209-00/?p=107812
- 最后 Job handle 关闭收容、nested/breakaway：https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects
- CreateProcessW writable command line、UTF-16 env、handle ownership：https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-createprocessw
- Handle inherit flag：https://learn.microsoft.com/en-us/windows/win32/api/handleapi/nf-handleapi-sethandleinformation
- Process FILETIME：https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-getprocesstimes
- Overlapped pipe 与默认 DACL：https://learn.microsoft.com/en-us/windows/win32/api/namedpipeapi/nf-namedpipeapi-createnamedpipew
- 取消不等于完成、不可提前释放：https://learn.microsoft.com/en-us/windows/win32/api/ioapiset/nf-ioapiset-cancelioex
- 完成状态查询：https://learn.microsoft.com/en-us/windows/win32/api/ioapiset/nf-ioapiset-getoverlappedresult

边界：编译/链接不能证明 Windows 运行成功、Chromium pipe/sandbox/nested-job 兼容、初始线程之外的所有执行路径或 CreateProcessW 内任意中断点的结果、进程树清零时序、强杀/崩溃矩阵、ACL 隔离与原生 150ms 预算。JOB_LIST 的公开契约支持创建期关联和 primary-thread ordering，不把它扩写为所有微时序的形式化证明。
