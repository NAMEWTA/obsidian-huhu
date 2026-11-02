Session: 20261029T021146Z
Task: 004-repair-native
Status: completed
Implementer: codex:/root/repair_native
Model: gpt-6.1-sol / xhigh

## 聚焦交接

F2–F5 的候选修复和正式回归已交回，completed 只表示本分配任务交付候选，不代表 T-18/G-06 已验收。
CLI 三种正文命令共用 canonical metadata、有界本地读入和取消/超时；Hook 以宿主进程持有的内核租约串行所有当前代次，用不同目录隔离旧发布者。
本范围最终 Rust 38 条、Hook 47 条回归通过，生产 Hook 源的局部 ESLint 零警告通过。
源码已停止写入；下一步由 Lead 冻结完整候选、串行完成全局类型/lint/build、真实生产整合和独立双轴复核，宿主/Provider/五平台真实 E2E 仍待用户验收。

## 产物与验证

### 授权、工作区与 Skill 实际执行

- 当前工作区 `/home/wta/orca/workspaces/obsidian-huhu/terminal`，分支 `NAMEWTA/terminal`；HEAD `78102da2811953e72fe317cd08cd91311d9cac0d`。未切换工作区/分支，未修改 Git index，未提交/推送/发布/归档，未操作用户真实库、账号或 Provider。
- 复用 README Execution Context 的 current/base `33c21e098ef3188cbab5a09f3e0a01fadb787715`。Lead 已先恢复的 37 文件及其他 writer 的修改全部保留。
- TASK 的 `native/pty-server/src/cli.rs` 不存在；写前向 Lead 报告，Lead 通过原生消息明确授权真实路径 `native/pty-server/src/control/cli.rs` 并承诺修正 T-18 导航。冻结 TASK 未被覆盖。
- 实际调用 `.agents/speculo/workflows/specdev/specdev-i-implement/SKILL.md` 的修复/TDD流程：读取 Map/本票与 GP-044/Map41、真实 dev/ui 入口、原始 001 报告；展开预检、codebase-design、TDD/test-design/mocking、错误/可靠性/agent-experience/注释规则；以公共 CLI 和生产 Hook prepare 接缝建立行为 red 后修复 green。
- 实际调用 `.agents/skills/dev/SKILL.md` 的 implement/verify：沿桌面 Node 生命周期与 Rust CLI 边界实现，回归取消、有限容量、活 owner、崩溃和清理失败原风险；读取 testing/licensing 参考并执行下表定向验证。ui 入口已按票矩阵读取，本分配未修改渲染、交互布局、颜色、CSS 或用户 UI 词典；四页 DESIGN 与生产浏览器验收归 Lead。
- 仅允许路径内写入下列 7 个产品/测试文件，以及本 REPORT。`src/bin/huhu.rs` 已读但无需更改；原 `main` 的 `std::process::exit(run(...))` 正是本地取消时结束阻塞读线程的生产出口。

### 完整修改路径与 owner

1. `native/pty-server/src/control/cli.rs`：本地三选一正文来源、有限读入、取消/deadline、canonical metadata、human help；没有将 stdin/file 放入 wire 参数。
2. `native/pty-server/tests/cli_input.rs`：新增六条正式真实 CLI 进程回归。
3. `src/modules/agent/platform/desktop/hooks/hook-spool.ts`：内核租约、不同 generation 目录、有界旧代次清理与原生命周期衔接。
4. `src/modules/agent/platform/desktop/hooks/reader-lease.ts`：新内部本地 lease；不提供请求处理或业务端口协议。
5. `src/modules/agent/platform/desktop/hooks/hook-reader.fixture.ts`：真实生产 HookSpool reader 子进程夹具。
6. `src/modules/agent/platform/desktop/hooks/hook-recovery.test.ts`：新崩溃/活 owner/晚到 publisher/旧代次清理回归。
7. `docs/agent-workbench-cli.md`：仅在“提交、等待与原始输入”补 stdin/file 示例、三选一、UTF-8/请求帧与本地 deadline 语义。该文件其余相对 HEAD 的大量恢复内容由 Lead 先恢复，不冒称为本 worker 新写。

canonical `control-schema.json`、generator、生成的 Rust/TS 描述、`test/native/control-protocol.test.ts` 和中英 `huhu-control` Skill 由 Lead 独占更新，本 worker只读取其最终 `cli.textInput`，未写这些共享路径。未改原始报告、TASK、正式 Evidence、README/Map/Goal/Spec/DESIGN、main.js/styles.css 或其他 writer 文件。

### Finding → 修复与正式反例

| Finding | 有效 red | 修复及 green |
| --- | --- | --- |
| F2 · 崩溃后 reader 永久 Busy | 首次正式 `hook-recovery.test.ts`：真实子进程调用生产 HookSpool.prepare 后 SIGKILL；父进程走生产 `AutomationHooks.prepareRuntimeHooks`，在崩溃后仍抛 `hookReaderBusy`，Vitest 1 failed，工具 exit 126。 | 相同真实路径 green。活 reader 时另一进程的生产 prepare 明确拒绝且旧 claim 保留；SIGKILL/close 确认后新 prepare 成功，继承新 env 的真实 Node 进程能启动。独立旧 publisher 在新代次启动后实际尝试发布，返回 false；旧目录清理完成。另以 31 个遗留代次的未消费数据证明清理不回放，legacy nonce-only claim 原样保留。 |
| F3 · file 无界分配 | 首条 `cli_input` 正式测试以 64 MiB 稀疏文件和 32 MiB RLIMIT_AS 启动真实 huhu；修前 exit 5/SOURCE_UNAVAILABLE，未达到期望的稳定容量错误，断言 red。没有把 OOM/编译失败冒称容量验证通过。 | 文件和 stdin 都最多读正文 limit+1，先拒绝过限；同一受限地址空间下 exit 2/CAPACITY_EXCEEDED、effect none、保留 messageId，且无 locator/IPC 副作用。补了 16384/16385 UTF-8 字节临界、非法编码与空正文。 |
| F4 · 未关闭 stdin 无法退出 | 两条真实进程 red：写一个字节后始终保持 stdin 打开；`--timeout-ms 20` 或已安装 handler 后发送真实 SIGINT，3 秒仍未自行退出，清理 kill 后目标断言失败。 | 有界 reader 线程与主线程可取消等待；默认本地预算 30000ms，明确 timeout 可生效。未关闭管道时 timeout 以 6/WAIT_TIMEOUT、SIGINT 以 130/WAIT_CANCELLED 退出，effect none，messageId 保留，无 IPC。deadline 用例覆盖 message/prompt/send-text 全三处；另覆盖没有 writer 的 --file FIFO 打开阶段。 |
| F5 · prompt/send-text 缺本地正文入口 | 真实 CLI→受保护本机 IPC 的正式测试修前首条 prompt stdin 直接 exit 2/INVALID_ARGUMENT，预期成功断言 red。 | prompt/send-text 各 stdin/file 四组合均 exit 0；真实 Unix IPC 接收的 `params` 仅含完整 `text`，中文、多行、末尾换行与明确 Session/runtime 逐字保持。三命令的 text/stdin/file 两两组合均 INVALID_ARGUMENT；schema metadata、help 和 Lead 同步的中英 Skill 共同描述来源。 |

测试修建过程中出现过局部 Rust 借用编译错误和 IPC 夹具把 big-endian 帧长度误作 little-endian，均已修正；这些失败没有计作产品 red。局部 ESLint 首次包含忽略的测试文件时有 1 warning，之后只选实际可 lint 的生产/fixture 路径；新增 cleanup 的 no-unsafe-finally 诊断也已修正。最终命令为零警告通过。

### 局部设计、恢复与降级保证

- 复用项目 `spaces/writer-owner.ts` 已有的本机内核 listener 独占思路，使用 canonical physical root + dev/ino + 固定协议 key 派生端口；不以年龄/PID 猜死亡。端口被活 owner 或无关占用时 `hookReaderBusy` 明确拒绝，不连接对方、不抢锁、不重试猜目标；监听不可用准确失败。
- 每个当前 HookSpool 使用 `generations-v2/<random UUID>` 目录；同进程两个 AutomationHooks 通过 canonical-root pool map 共用它与 32 scopes/4 collectors 的既有预算。不同进程必须先持有同一物理 root 的 lease，死进程由 OS 释放该资源。
- 旧 nonce-only `resource-v1/reader` 无充分安全死亡证据，原样保留；新协议的物理代次独立，因此它不再阻断默认新运行。不会抢占 legacy owner，也不采用按时间删锁。
- 持有 lease 后最多检查 32 个当前代次目录，清理其他 UUID 目录；失败或异常条目明确拒绝，没有无限重试、没有读取或回放旧事件。被拒绝的空 contender 目录当场清理。generation 名永不重用，旧 publisher 即使迟到或持有旧 fd，也不会触及新 scope 的槽位；原 token/ingress guard 继续有效。
- 最后 scope、in-flight reader 和 retiring cleanup 完成后才 await lease.close；原 reader claim 删除失败的重试所有权、slot预算、双 AutomationHooks 和消费者失败回归继续通过。lease 失效时不再向消费者递交事件。
- 本地输入的单个 worker 读取最多 limit+1；若 OS 读阻塞，主 CLI 在取消/本地 deadline 后返回，由生产 main 的 process::exit 结束整个独立进程，既不等待 EOF，也不开始 IPC。读入完成后请求观察另用同一 timeout 数值，文档已明确，并非把 timeout 宣称为整个 CLI 的统一总预算。
- 通知正文上限来自 canonical metadata 16384，prompt/send-text 来自其 262144；完整 JSON 请求仍必须满足 32768 字节帧预算。较长文本可能先触发帧容量；没有扩宽公共 wire 上限。

### 适用研究与采用理由

本次未复制外部源码、未新增依赖；现有 Node/Rust 标准读入与项目已有 lease 思路足以修复。

| 项目/来源 | 活动、许可与机制 | 本项目处置 |
| --- | --- | --- |
| [VS Code instance ownership](https://github.com/microsoft/vscode/blob/b6bfa95ebee8b183d65dee4997c0527eadfe5384/src/vs/code/electron-main/main.ts) | GitHub API 实查未归档，commit `b6bfa95...` 为 2026-10-29；[MIT](https://github.com/microsoft/vscode/blob/b6bfa95ebee8b183d65dee4997c0527eadfe5384/LICENSE.txt)。内核 IPC 占用与 EADDRINUSE 能明确区分现存实例；相关进程生命周期由宿主拥有。 | 采用内核拥有资源和明确冲突的机制；实际实现复用本仓库已有 lease 结构，不引入 VS Code 服务或复制实现。 |
| [Deno 跨进程文件锁](https://docs.deno.com/examples/file_locking/) | GitHub API 实查 denoland/deno 未归档，commit `e7b39eb...` 为 2026-10-26；[MIT](https://github.com/denoland/deno/blob/e7b39ebd55c85aaf6a29290c1f5a99e2e21e09dd/LICENSE.md)。原生 FsFile lock/tryLock 通过 OS 串行访问，依赖 Deno 原生资源 API。 | 属于合理的内核文件锁方案；Obsidian Node 没有该 Deno API，引入新运行时/native binding代价超出当前修复，故不采用。 |
| [proper-lockfile](https://github.com/moxystudio/node-proper-lockfile) 与 [stale race issue](https://github.com/moxystudio/node-proper-lockfile/issues/121) | MIT；GitHub API 的最新 commit 为 `9f8c303...`、2021-01-25，不满足近两年维护 commit 条件。mtime/过期清理与并发 stale 路径还有相应公开风险讨论。 | 作为检索出的反例排除；没有引入该依赖，不按目录年龄回收 Hook reader。 |

以上只说明机制/许可和适配选择，不冒充这些外部项目在 HUHU 的运行证据。

### 实际命令与结果

所有命令在本 current 工作区；Rust 全程 `CARGO_TARGET_DIR=/tmp/huhu-004-repair-native-cargo`，不触碰另一 Rust writer 的产物目录。

| 命令 | 实际结果 |
| --- | --- |
| `CARGO_TARGET_DIR=/tmp/huhu-004-repair-native-cargo cargo test --locked --manifest-path native/pty-server/Cargo.toml --test cli_input -- --nocapture`（首轮 F3） | exit 101，1 failed：期望 capacity，实际 SOURCE_UNAVAILABLE/5；修复后同测试通过。 |
| 同上，加入 F4 两项后 | exit 101，1 passed / 2 failed：开放 stdin 的 deadline 与 SIGINT 均未退出；随后 3/3 green。 |
| `CARGO_TARGET_DIR=/tmp/huhu-004-repair-native-cargo cargo test --locked --manifest-path native/pty-server/Cargo.toml --test cli_input prompt_and_send_text -- --nocapture`（F5 首轮） | exit 101，因真实 CLI 返回 INVALID_ARGUMENT 而失败；修复和夹具修正后 exit 0。 |
| `CARGO_TARGET_DIR=/tmp/huhu-004-repair-native-cargo cargo test --locked --manifest-path native/pty-server/Cargo.toml --test cli_input --test control_protocol --test control` | exit 0；cli_input 6、原 control 26、原 control_protocol 6，共 38 passed。最后仅将既有 deadline 回归扩为三命令后，再跑 `--test cli_input` exit 0、6 passed。 |
| `pnpm exec vitest run src/modules/agent/platform/desktop/hooks/hook-recovery.test.ts --reporter=dot`（F2 首轮） | 工具 exit 126，1 failed；崩溃后生产 prepareRuntimeHooks 仍 hookReaderBusy。修复后新2条均通过。 |
| `pnpm exec vitest run src/modules/agent/platform/desktop/hooks/hook-recovery.test.ts src/modules/agent/platform/desktop/hooks/hook-spool.test.ts src/modules/agent/platform/desktop/hooks/automation-hooks.test.ts --reporter=dot`（最终生产源） | exit 0，3 files、47 tests passed，无 skip。真实32-scope样本收到96条且无重放，peakCollectors=4。 |
| `pnpm exec eslint src/modules/agent/platform/desktop/hooks/hook-spool.ts src/modules/agent/platform/desktop/hooks/reader-lease.ts src/modules/agent/platform/desktop/hooks/hook-reader.fixture.ts --max-warnings=0` | 最终 exit 0，零警告。测试文件按仓库配置忽略，测试类型由 Lead 全局类型检查承接。 |
| `rustfmt --edition 2021 native/pty-server/src/control/cli.rs native/pty-server/tests/cli_input.rs` | exit 0，仅格式化本 worker 两个 Rust 路径，未 cargo fmt 全树。 |
| `git diff --check -- native/pty-server/src/control/cli.rs native/pty-server/tests/cli_input.rs src/modules/agent/platform/desktop/hooks docs/agent-workbench-cli.md` | exit 0。 |

这些结果的原始输出在本次工具执行记录中；未伪造历史磁盘日志。最终可供 Lead 复用的本机 debug binary 为 `/tmp/huhu-004-repair-native-cargo/debug/huhu` 和 `huhu-pty`；发行/release 构建与最终资产摘要仍由 Lead 拥有。

### 候选字节快照

以下是停止源写入时的内容摘要，包含 docs 中 Lead 已有恢复内容，供 Lead 回读整合时识别漂移。

| 路径 | SHA-256 |
| --- | --- |
| `native/pty-server/src/control/cli.rs` | `4c5535122bf3866d4c12953fdef15cb0a0151f5a41acb80ee0369cfd93dd2a9f` |
| `native/pty-server/tests/cli_input.rs` | `ee8d7caa26f0682e9590f9fa9723e4b48acfcc8fd6a0a460f44c9addd08e9ba6` |
| `src/modules/agent/platform/desktop/hooks/hook-spool.ts` | `e62aa60cf33b7bcdd5d299871f06092539aa25b759329a38e6d29c08e9c3514c` |
| `src/modules/agent/platform/desktop/hooks/reader-lease.ts` | `e97a2325bd2d16511fdb45040e0fba119603c1e266a246baebdbec2ea3eb6772` |
| `src/modules/agent/platform/desktop/hooks/hook-reader.fixture.ts` | `8f6d8f913326ad9aafb3d48cd935b03bea1710def563797634db8bb71e304ac4` |
| `src/modules/agent/platform/desktop/hooks/hook-recovery.test.ts` | `1604292a22a1a474a02d83c05b5f385081abb94ae0d26a19088af2ab3b16c9fd` |
| `docs/agent-workbench-cli.md` | `6238fe32fda651367c2c94a5d36bd46bdb4207e0751e3601ffc9d447e6f2a487` |

## 问题与下一步

本分配无已知剩余 blocker，SOURCE STOPPED；不自行将 Ticket done/verified。

未执行全量 Vitest、全局 lint/types/build、文档全局脚本、根产物生成或独立 review，这些按 TASK 归 Lead 串行整合。未运行真实 TerminalSessions→native PTY 的完整崩溃重启 E2E；本次真实进程证明的是生产 HookSpool/AutomationHooks.prepareRuntimeHooks 准备与之后的 OS spawn，原 TerminalSessions 调用点已只读追踪且未改写，最终整合可运行既有 Sessions/native 测试补证。

本机 Linux SIGINT/RLIMIT_AS、Unix IPC/FIFO 已运行；Windows/macOS 的实际信号、listener 绑定及文件删除语义，真实 Obsidian/Provider/人工权限和五平台主链均未验证。内核端口碰撞、监听受限、清理权限错误或未知代次文件仍会准确拒绝，未将这些未知情形改为成功或盲目重试。
