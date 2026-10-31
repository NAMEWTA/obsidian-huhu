# 原生浏览器平台实现的前置复用线索

查证：2026-10-27。Lead 在 T04/T15/T19 并行期间只读补查，供 T09–11 实施者继承；不表示这些票已开始、设计已锁定或平台验证通过。研究范围是 Windows 管道继承/进程收容及成熟启动器的退出方式，停止条件为找到有明确许可、两年内活跃的一手实现与系统文档，识别不可直接移植的部分。macOS 收容与凭据仍由对应实施票继续按实际缺口核验。

## 项目现状

实际读取 `native/browser-runtime/Cargo.toml` 和 `src/process.rs`：当前只有 unix libc 依赖；进程实现直接使用 pipe2、/proc、prctl、setsid 和 Unix 文件权限。Windows/macOS 不能只移除 main 的平台拒绝来获得支持。现有 profile、签名 owner receipt 和 birth 校验应保留，扩平台必须有等价真实接缝。此段为项目代码事实。

## 已核验候选与差异

- chromedp：GitHub API 当日返回非归档、最新提交 `7862adfd3424d6f379af01f4276a87019b08c507`（2026-10-11），[MIT 原文](https://raw.githubusercontent.com/chromedp/chromedp/7862adfd3424d6f379af01f4276a87019b08c507/LICENSE)已读。[Windows 管道实现](https://raw.githubusercontent.com/chromedp/chromedp/7862adfd3424d6f379af01f4276a87019b08c507/pipe_windows.go)显式把两个子端句柄传给 `--remote-debugging-io-pipes`，父端取消继承，并使用 Go 的额外句柄继承机制。适合借鉴管道方向及最小继承集合；HUHU 是 Rust，不能把 Go 调用复制当作完成 Windows 启动。暂不新增运行依赖、不复制代码。
- Playwright：GitHub API 当日返回非归档、最新提交 `e14be57ce6162c2ef588a8e63238f1d07c470712`（2026-10-26），[Apache-2.0 原文](https://raw.githubusercontent.com/microsoft/playwright/e14be57ce6162c2ef588a8e63238f1d07c470712/LICENSE)已读。[固定版本 processLauncher](https://raw.githubusercontent.com/microsoft/playwright/e14be57ce6162c2ef588a8e63238f1d07c470712/packages/utils/processLauncher.ts)用非 Windows detached 进程组和组信号，Windows teardown 使用 taskkill；保留退出等待与临时目录清理，也显式处理隐藏控制台。可借鉴正常退出/失败清理分离。该实现不是 HUHU 所需的持久 owner、PID 复用防护或 Windows Job 自动收容证明，不能替换这些合同。

## Windows 系统依据与实施待核验

[Microsoft Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects)说明最后一个 Job handle 关闭时，可通过 KILL_ON_JOB_CLOSE 终止其关联进程。[AssignProcessToJobObject](https://learn.microsoft.com/en-us/windows/win32/api/jobapi2/nf-jobapi2-assignprocesstojobobject)说明嵌套 Job、子进程继承、breakaway 与分配失败条件。

据此提出的待验证设计是：创建受控 Job，子进程首次执行前加入，失败时终止并清理，限制句柄继承；这是项目推断，不是已实现事实。必须核对所选 Rust Win32 绑定/API、挂起创建与恢复线程、Chromium 自身 sandbox/nested Job 兼容、helper 猝死、身份收据与清理失败保留。不可只凭 taskkill 或 PID 相同就删除 profile。实际 Win/mac 实机验证按 SRC010 由用户负责，自动编译/代码及故障测试仍需完成。

本次 Chromium 官方具体 pipe 源文件工具读取超时/不可达，未冒称已读；已有 chromedp 一手实现足以定位管道机制，实施者仍须针对项目固定 Chromium 版本核验真实支持。未执行外部代码、安装依赖或修改生产文件。

## 本仓库可复用的 Windows 接缝

进一步只读检索找到 `native/pty-server/src/job.rs` 与 Cargo.toml：终端 helper 已使用 windows-sys 0.60，启动时将自身加入 KILL_ON_JOB_CLOSE Job，handle 保持到进程退出；main.rs 在入口调用。可比较“helper 自身先进入 Job，再创建受控后代”和“挂起创建后逐个加入”的适配成本，不必从陌生 FFI 全部重写。

当前该终端函数对 CreateJobObject 失败直接返回，并未核验 SetInformationJobObject/AssignProcessToJobObject 的结果。因此它只是现有接口与生命周期模式的复用依据，不能作为浏览器严格收容已成立的证据。T09 应在自身范围实现明确失败、非继承handle、正常关闭与最终清理的合同；不因这次只读发现顺手修改终端模块。Windows Chromium sandbox/nested Job 的真实兼容仍待对应平台验收，不据代码推断通过。

## 原生 Agent 只读接缝预查

2026-10-27，`/root/implement_t01`（gpt-6.1-sol/high）只读回执；未写生产文件、安装依赖、编译或运行 helper/Chrome/Obsidian。以下是预查事实与待实现设计，不构成 T09–11 开始或验收通过。

- `native/browser-runtime/src/main.rs` 的 process/run/reclaim 仅编入 Linux；`host-main.ts` 的 availability/recoverEphemeral、`assets.ts` 的 manifest/parser、assemble/install 与 browser workflow 同样限定 Linux x64。须同时适配实际宿主消费者、独立 reclaim、资产与安装，不能只放开入口。公共 gate/framing/cookies/receipt 可复用。
- `.github/workflows/release.yml` 当前只下载、证明、发布 Linux browser artifact，原不在 T09–11 或 T32 写集，Lead 已按 Map revision 7 归入 T32 串行集成；本轮未修改流水线，也未授权自动发布。
- `ownership.ts` 对密钥无条件执行 POSIX mode 检查，Windows 需要等价的实际权限/系统保护方案。现有资产 symlink 仅接受直指库存文件；尚未读取 macOS 归档，须核验 `.app`/框架链接链、签名和 quarantine，不能任意放宽链接验证。
- `cookies.rs` 为跨平台 rusqlite 只读命令，`cookies/keys.ts` 已有 Keychain/DPAPI 分支；T05 稳定后复用，不绕过系统保护或对不支持的密文版本降级。

### Windows 待验证方案

浏览器专属 Job 可保留 helper 确认通道；若把 helper 自身也加入 Job，终止 Job 会同时终止确认通道。单纯 suspended-child→Assign→Resume 又存在分配前 helper 猝死留下挂起进程的窗口。可核对 Windows 10+ 创建期 `PROC_THREAD_ATTRIBUTE_JOB_LIST` 配合 `HANDLE_LIST`、挂起创建和逐项失败清理；这只是建议，Chromium nested-job/sandbox 兼容仍未知。[Microsoft 创建属性](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-updateprocthreadattribute)

进程 birth 可通过真实 handle 的创建时间编码为十进制字符串。匿名管道同步写在缓冲区满时可能阻塞，必须实现有界、可取消写入，保留 outcome_unknown 与独立控制 lane，不能直接把 WriteFile 当作有限写。[GetProcessTimes](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-getprocesstimes)、[CreatePipe](https://learn.microsoft.com/en-us/windows/win32/api/namedpipeapi/nf-namedpipeapi-createpipe)

### macOS 待验证方案

复用 Unix 进程组、fd3/4 与父控制通道 EOF，pipe＋fcntl 替代 pipe2。缓存 libc 0.2.191 具有 `proc_pidinfo`、`proc_bsdinfo`、`proc_listpgrppids`；Apple 固定源码提供相同 API，可核验创建时间与组成员，不以 shell/ps 猜测。仅借 API 事实，不复制 APSL 代码。[固定 proc_info.h](https://raw.githubusercontent.com/apple-oss-distributions/xnu/f6217f891ac0bb64f3d375211650a4c1ff8ca1ea/bsd/sys/proc_info.h)、[固定 libproc.h](https://raw.githubusercontent.com/apple-oss-distributions/xnu/f6217f891ac0bb64f3d375211650a4c1ff8ca1ea/libsyscall/wrappers/libproc/libproc.h)

kqueue/NOTE_EXIT 只是退出通知，不能代替 supervisor 自身崩溃后的独立 reaper；保留宿主→stop→认证 receipt reclaim 链。helper/宿主组合强杀、脱组后代及签名/quarantine 仍需平台证明，无法确认应保持 quarantined。[Apple kqueue](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man2/kqueue.2.html)

### 资产与自动编译边界

Agent 读取的[官方固定版本元数据](https://googlechromelabs.github.io/chrome-for-testing/156.0.8078.47.json)包含 156.0.8078.47、revision 1706539 的 win64/mac-arm64/mac-x64 下载项；未下载归档、未取得 SHA256，不能复用 Linux hash。

本机 Linux x86_64，rustc/cargo 1.99.0；安装有 Linux x64/Windows GNU targets、mingw GCC，缓存 windows-sys 0.60.2。Windows GNU 限定编译具备工具条件，依赖闭包尚未编译证明。未发现 Apple target、clang、xcrun，macOS 编译需原生 CI；当前非 Linux 编译若只覆盖 unsupported 分支，不是适配证据。
