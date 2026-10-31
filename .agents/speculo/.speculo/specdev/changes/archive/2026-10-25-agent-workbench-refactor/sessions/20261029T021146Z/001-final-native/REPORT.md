Session: 20261029T021146Z
Task: 001-final-native
Status: completed
Reviewer: codex:/root/review_native
Model: gpt-6-astra / high
Input-SHA256: 39f060d78d5d3ff466dd833bd2925fff76c69b2adb011c3985c4f6dcc5bc0193

# 原生、终端与 CLI 独立最终审查

本报告仅交回审查结果，completed 不表示产品验收通过。standards: **request-changes**；specification: **request-changes**。共五项独立问题：high 两项、medium 三项；标准轴四项，规范轴五项引用相同根因，不重复计数。无 low 项。不采用历史 123 中断审查作为通过证据。

## 固定输入与独立身份

- review_mode: working-tree；分支 NAMEWTA/terminal。
- base: 33c21e098ef3188cbab5a09f3e0a01fadb787715；Observed HEAD: 78102da2811953e72fe317cd08cd91311d9cac0d。
- 使用 review-input.json 中原样 tracked_diff_command（显式 447 产品路径，git diff 对上述 base）；输出 SHA256: ec52894864d037aefc179329bad109e96b1c8258e9f72902144fe97fb0652510。
- 完成前重新核对 447 项 working_snapshot 的 after 字节/删除状态、9 项 sources 摘要、HEAD、diff 摘要：全部匹配，drift=[]。Input-SHA256 是 JSON.stringify(JSON.parse(review-input.json)) 的摘要，不是文件字节摘要。
- 本 reviewer 是 Lead 原生派遣的新独立任务 codex:/root/review_native，未参与历史实现、提交或修复；历史实现者由派遣上下文确认为旧 Codex/Claude、其实现子 agent 与用户提交。本任务未递归派遣，未修改产品、Git 或正式 Evidence。
- 78102da 相对 1f98811 的合并回退与本次新确认问题分开：F1 属于该回退；F2–F5 为当前候选另外存在的问题。只读 git show 1f98811 用于解释 F1，不据此认证任何恢复后的候选。

## 一、standards

结果：**request-changes**。

### F1 · high · CLI 安装与宿主公开接口断裂

位置：`src/host/desktop/native/binary-cli.ts:5`、`:91`；`src/shared/native/host.ts:233`；`src/shared/native/lazy-host.ts:10`；`src/host/desktop/native/runtime.ts:10`；消费者 `src/modules/agent/ui/settings/TerminalSettings.tsx:181`。

`binary-cli.ts` 仍导入并调用 ensureVerifiedAsset/AssetSpec/VerifiedAsset，但当前 binary.ts 已不提供它们，错误分类也缺兼容项；NativeHost/lazy host/runtime 没有 CLI 安装接口。controller 的 CLI 环境注入和 checkCli 亦已删除，设置页却继续调用 checkCli。首次安装/检查 CLI 因此不是可用的降级路径：安装调用抛 TypeError；点击检查先设置 checking 状态，再调用不存在的方法，无法进入原 promise 收尾。新终端也失去预期的已验证 CLI PATH 接线。

直接运行 lazy-host-cli 与 binary-cli 测试得到 2 个文件失败，8 失败/1 通过；核心错误为 `host.cli is not a function`、`ensureVerifiedAsset is not a function`。Lead 另外报告类型检查缺失 AssetSpec/NativeCliState/checkCli，本报告不冒充自行执行的全量检查。git diff 1f98811..78102da 显示这些接口和接线被删除，git show 1f98811 可找到先前实现。

依据：AGENTS/dev 对公开模块合同、源码/产物/测试一致性的要求；错误不能通过缺失方法逃逸既定失败合同。满足条件：恢复一致的资产校验安装、host/lazy/controller CLI 接口与环境接线，保持设置消费者有效；上述定向测试通过，并由 Lead 完成类型/构建验证。仅删掉调用方或失败测试不满足已承诺能力。

### F2 · high · Hook reader 在进程崩溃后永久阻止新终端启动

位置：`src/modules/agent/platform/desktop/hooks/hook-spool.ts:193`（尤其 211、215）；生产调用链 `src/modules/agent/platform/desktop/hooks/automation-hooks.ts:242`、`:343` → `src/modules/agent/services/terminal/sessions.ts:558`、`:574`；持久根 `src/modules/agent/platform/desktop/agents/accounts.ts:74`。

acquireReader 通过持久 `reader/` 目录排他，claim 只记随机 nonce；只要目录存在就抛 hookReaderBusy。正常 release 依赖当前进程内 readerNonce 等状态。若持有 active scope 时进程崩溃，新进程既不能证明/处理已死 owner，也没有其他生产恢复入口，后续每次 prepare 都被相同目录拒绝。

这不是同进程已有 manager 的正常互斥：隔离反例让第一进程调用生产 hookSpool/prepare 成功，记录 claim 后 SIGKILL 整个进程组（退出 -9），确认 reader/claim.json 仍存在；第二个全新进程两次 prepare 均得到 hookReaderBusy。原 reader PID 29325，claim nonce 6566d5f2-bd45-4bcd-bcd2-ed2c72d1e93a；完整脚本和日志见验证表。

生产 prepareRuntimeHooks 等待 prepareSlot，后者等待该 pool.prepare；TerminalSessions 在 spawn 前 await hooks，错误向启动失败传播。statusHooks 默认 true；同一 vault/device 固定 resource-v1 根使问题跨重启保留，受管理的 Shell/Agent 新启动均受影响。用户需手动清理运行目录才能绕过，目前没有受支持恢复路径。

依据：dev 生命周期与故障恢复、common error-handling/risk-review；进程死亡后的资源恢复不能只依赖 finally。满足条件：在不夺取活 owner 的前提下提供可验证的死亡回收或明确、可操作的安全恢复；覆盖真实跨进程崩溃/重开、并发活 reader 不被抢占、晚到 publisher 隔离、不重放输入，并验证真实生产 prepare→spawn 链恢复。单纯按目录年龄或 PID 数字盲删不足以满足。

### F3 · medium · --file 在检查正文上限之前无界分配

位置：`native/pty-server/src/control/cli.rs:560`（std::fs::read），上限检查在 `:574`。

message.send 的 16 KiB 限制只在完整读入文件后执行。用户给出大文件时，进程先按整个文件分配，足够大则在产生稳定容量错误前耗尽内存；特殊文件/增长流也不受该限制保护。当前二进制读取 64 MiB 稀疏文件后才退出 2/CAPACITY_EXCEEDED，实测 maxrss=68756 KiB。该反例无需连接 locator 或 IPC。

依据：dev 资源边界与风险审查要求、已有 16 KiB 正文限制的实际语义。满足条件：对文件读取使用有限预算（例如最多读取 limit+1），过限明确拒绝，不先分配全文件；验证超大文件与临界值、UTF-8 和失败无 IPC 副作用。与 F4 的取消要求同时成立。

### F4 · medium · 本地 stdin 阶段吞掉 Ctrl-C，慢输入可无限挂起

位置：`native/pty-server/src/control/cli.rs:469`（信号 handler）、`:532`–`:535`（阻塞 read_to_end）。

CLI 注册 Ctrl-C handler 后只设置 AtomicBool；message.send 的 stdin 阻塞读取不检查该标志。上游管道写入一个字节而不关闭时，CLI 持续阻塞，Ctrl-C 默认退出行为已被替换，却没有取消读操作。实测给 --timeout-ms 20，200 ms 后仍存活；发送 SIGINT，再等 300 ms 仍存活；只有关闭 stdin 才结束。此时得到 CONNECTION_UNAVAILABLE/exit 4，而非取消结果。timeout 观察用于说明本地读与请求阶段不同，不把未声明的本地 deadline 语义另算缺陷。

依据：公共取消/错误合同、common error-handling 中的取消传播与有界等待。满足条件：输入阶段能被 Ctrl-C 取消，返回稳定 WAIT_CANCELLED/130、effect none，并保留预分配 messageId；未形成正文不得开始 IPC。测试必须保持管道打开并在真实进程发送信号，不能只测 EOF 后的请求取消。明确 --timeout-ms 对本地输入是否生效。

Low：无。

## 二、specification

结果：**request-changes**。不将标准轴修复自动视为全部 64 AC 通过。

| Finding | 严重度与定位 | 不符合的合同、影响及满足条件 |
| --- | --- | --- |
| F1 | high；binary-cli.ts:5、:91；lazy-host.ts:10；TerminalSettings.tsx:181 | Spec AC-019、AC-062、AC-064；implementation-contracts §1/§2/§4；T-17 的已验证 CLI 安装、环境及诊断交付。当前安装/检查/接线断裂使发行 CLI 能力无法从插件路径正常到达。须恢复完整链并复验，不能只证明独立 huhu 二进制可执行。 |
| F2 | high；hook-spool.ts:193/211/215；sessions.ts:558/574 | Spec §3.3、AC-058/060 的崩溃/重开恢复及 AC-005 基本启动；固定运行根的死 reader 阻断后续人工启动。须给出不夺活 owner、不重放的崩溃恢复反例通过证据；生产调用链见标准轴 F2。 |
| F3 | medium；control/cli.rs:560 | NFR-001 明确每个输入有有限容量。docs/agent-workbench-cli.md 的本地有限正文读取承诺不能由事后长度检查兑现。满足条件为有限内存读取、过限稳定错误、无 IPC 副作用。 |
| F4 | medium；control/cli.rs:469/532 | NFR-001 的可取消等待及 implementation-contracts 的取消/退出码合同。须在持有未关闭 stdin 的真实进程上验证 SIGINT 可终止本地等待，稳定返回 130/WAIT_CANCELLED，保留 messageId/effect none。 |
| F5 | medium；control/cli.rs:195–205 | 详见下项：Agent prompt 与终端 send-text 缺少规范明确要求的 stdin/file 入口。 |

### F5 · medium · agent prompt / terminal send-text 缺失长正文输入合同

位置：`native/pty-server/src/control/cli.rs:195`–`:205`（仅 message.send 特判 stdin/file）；`src/shared/native/control-schema.json` 的 agent.prompt/terminal.send-text 参数；配套 `src/modules/agent/core/control/skill/huhu-control.en.md:25`。

implementation-contracts.md:30 明确 `terminal send-text --stdin` 或 `--file`；:31 明确 `agent prompt (--stdin|--file <path>)`。Spec.md:156 和 AC-019 要求 stdin/文件长正文入口。目前只 message.send 有 CLI 本地输入转换，prompt/send-text 仍只接收 --text，配套 Skill 的 prompt 示例也是 argv 文本。

当前二进制分别执行 `huhu --json agent prompt --session s --runtime r --stdin`、`huhu --json terminal send-text --session s --runtime r --stdin` 均直接退出 2/INVALID_ARGUMENT，无需实例即可重现。没有发现授权缩减这两项合同的规范变更。只证明 message.send 的 stdin 可用不满足对应命令。

满足条件：两类命令提供明确的本地 stdin/file 入口与 text/stdin/file 互斥规则，保留 UTF-8/多行正文；沿用 F3/F4 的容量与取消约束；同步 schema/help/中英文 Skill/文档并从真实 CLI 验证目标和正文传递。无需将文件路径传给 IPC owner。

Low：无。

## 来源发现与实际检视范围

按 AGENTS 先读取 workspace roots、catalog，再读取选中的运行指南与 common code-review Skill。读取 source-discovery、fowler-smells、risk-review、reviewer-contracts、working-tree-review、review-evidence，以及 error-handling/test-reliability；应用 dev，涉及设置/UI 消费者时结合 ui。没有据此启动新 Change/实现流程。

权威来源为 review-input 的全部 9 项：AGENTS、dev/ui、spec、DESIGN、implementation-contracts、ADR、goal-plan、tickets-map；结合 T-17/T-18 Evidence 和 AC 矩阵核对入口。任务文本“全部18票done”与 Lead 发现的 T-18 ready/Evidence done 不一致，不据此认证交付；相关状态修订由 Lead 处理。change/source.md 不存在；base..HEAD 的提交记录未给出 Issue/PR 规范引用。补充读取当前 CLI/工作台文档、第三方来源说明、package/Cargo 配置与发行 workflow；没有把未访问的外部来源作为通过依据。

本任务覆盖原生/终端/CLI 分区，并沿真实消费者追踪：Rust control parser/client/locator/Unix IPC/broker/Windows ACL 与管道、session 输入/创建/停止/排空、job/foreground/editor 关键身份约束与 outbox 容量；TS host/lazy/runtime/binary 资产链、helper 控制接缝、终端 Sessions/activity/screen/cancellation/coordination、控制 router/commands/paging、Hooks spool 与 AutomationHooks、CLI schema/Skill 及 CI 资产兼容与来源。bootstrap/helper 的部分区域为符号/调用链检查，不声称逐行通读全部。历史数据适配与 UI 是跨域消费者追踪，数据迁移/全部 UI/自动化由其他审查分区负责，不冒充本任务完整覆盖。

Fowler 启发式结合公开合同、资源归属、取消、错误、并发与恢复风险检查；没有仅因代码长度/命名制造风格 finding。真实 Pi 前台资格、权限状态以及 macOS/Windows 运行时不能由 Linux 静态检查认证。

## 验证与原始证据

本任务没有运行 build、全量 Vitest、lint 或全量类型检查。使用 Lead 由当前源码成功构建的 release 二进制，未自行修改/构建：

- huhu SHA256：6f42ad4645aab14942b1d03d40e57c45733eed8efe5a474007017f2a906c78d3。
- huhu-pty SHA256：90972428d88a06e3d3dbb336c0081bb12a5d6bbd173c5ef0f6083f6774c64aae。
- 路径均为 native/pty-server/target/release/。Lead 的构建日志 /tmp/huhu-final-checks-20261029/native-build.log 为来源交接，本报告不将其算作 reviewer 自行构建。

| 实际命令/探针 | 退出与观察 |
| --- | --- |
| `pnpm exec vitest run src/shared/native/lazy-host-cli.test.ts src/modules/agent/platform/desktop/pty/binary-cli.test.ts --reporter=dot` | 执行工具报告退出 126；Vitest 输出 2 文件失败，8 tests failed / 1 passed。失败原因为 F1 缺失方法/导出；工具原始输出保留在本任务执行记录，未虚构磁盘日志。 |
| 设置 HUHU_TEST_PTY_BINARY 与 HUHU_TEST_CONTROL_BINARY 为上述当前 release 路径后，`pnpm exec vitest run src/modules/agent/services/control/control-native.test.ts src/modules/agent/services/control/control-coordination-native.test.ts src/modules/agent/services/control/control-panels-native.test.ts src/modules/agent/services/terminal/session-coordination.test.ts src/modules/agent/services/terminal/session-screen.test.ts src/modules/agent/services/terminal/sessions-cancellation.test.ts src/modules/agent/platform/desktop/control/environment.test.ts src/host/desktop/native/host-control.test.ts --reporter=dot` | 退出 0；6 文件 passed / 2 skipped，76 tests passed / 2 skipped。日志 `/tmp/huhu-001-final-native/targeted.log`。control-native 经生产 owner 实际创建/读取/重命名/停止 2 个终端；spawnCount=2，stops=2，清理 failures=0。 |
| `python /tmp/huhu-001-final-native/cli-input-probe.py` | 探针退出 0；正文 64 MiB 文件子进程退出 2、RSS 68756 KiB；SIGINT 后仍存活，EOF 后退出 4；prompt/send-text stdin 各退出 2。日志 `/tmp/huhu-001-final-native/cli-input-probe.log`。 |
| `pnpm exec vitest run --config /tmp/huhu-001-final-native/vitest.config.mts --reporter=dot` | 退出 0，1 test passed；人为预留死 claim 的生产 HookSpool 反例。日志 `/tmp/huhu-001-final-native/stale-reader.log`。测试通过表示确认现状缺陷，不能算恢复行为验收通过。 |
| `python /tmp/huhu-001-final-native/crash-reader-probe.py` | 探针退出 0；原生产 reader 进程组 SIGKILL 后退出 -9；新进程实际 prepare 两次均 hookReaderBusy，验证该现状的 Vitest 退出 0。日志 `/tmp/huhu-001-final-native/crash-reader-probe.log`；对应 crash-reader.test.ts/crash-vitest.config.mts 同目录。隔离运行根在探针结束删除。 |
| 完成前 Node 按 frozen command 重新 hash HEAD、447 after 项、9 sources 和 tracked diff | 退出 0；均匹配，drift=[]。 |

两项跳过：真实 Pi coordination 需要 HUHU_PI_ARTIFACT_TEST_ROOT；pane native 需要 HUHU_TEST_PANE_EVIDENCE/HUHU_TEST_EDITOR_RUNTIME_DIR。没有将 skip 当作通过。Hook 崩溃反例是运行生产 spool 的真实 Node 进程崩溃/重开，非真实 Obsidian 整体 E2E；通过源码追踪确认其启动阻断链，仍须修复后补充对应集成验收。

未使用用户真实 vault/Provider，未联网下载安装资产、未执行真实权限批准、未操作用户任务。真实 Obsidian 完整流程、真实 Provider 状态与多平台发行验收依 Spec §11 留给相应用户验收；这不削弱本报告五项已实证缺陷，也不被局部测试通过替代。任何后续恢复 39 文件或修复都会形成新候选，需要重新冻结并独立复核相关轴。
