# T-03 A 同 owner 修复交接（SOURCE STOPPED）

GP-014 / Map15 / attempt3；只修 STD-01/SPEC-01 与 STD-02/SPEC-02。A 已停止源码及检查写入，仅整理 /tmp。无 T-04、新产品范围、提交、推送、依赖或正式工件写入；不声明独立审查通过或 Ticket done。

## 修复结果

**STD-01 / SPEC-01：** Rust `spawn-failed` 增加可选 `failure:{code,effect}`。`pty-unavailable`、`directory-unavailable`、`program-rejected` 只有在可证明未创建子进程的分支才是 native effect:none；重复 sid 保守为 unknown。reader/writer 的全部可失败初始化提前到 `spawn_command` 之前，之后没有返回 spawn-failed 的初始化步骤。原函数在锁定 portable-pty 0.9.0 的 Unix/ConPTY 实现中返回 Err 时没有已接纳存活子进程；异常崩溃/传输丢失仍无拒绝证据，归 unknown。

TS helper 校验有限 code/effect 组合后才构造 `NativeSpawnError`，NativeHost 原样传递；旧 helper 缺字段、未来 code、无效 effect 都保守 unknown。没有解析 ENOENT、中文或任何人类错误字符串。TerminalSessions 用结构化证据区分 known failed 与 disconnected；Workspace 正常返回已存 Session 的 partial、SOURCE_UNAVAILABLE/program-rejected、configure-program，而非谎称整个动作 effect:none。DTO/public方法/keys不变，en/zh 无需新增。失败记录可查，已知拒绝允许用户修正配置后显式复用同 stable Session；unknown 仍禁止盲目新代次。early exit7、numeric SessionEvent 和旧 helper SID generation fencing 保持。

**STD-02 / SPEC-02：** 附加 metadata 的 shell/agent/account 来自持久 Session 已接纳记录；同 Space、跨 Space、前台、后台首次 attach、detach/reattach 走同一来源。显式 restore 的 bound.shell 再从 admission.record.shell 读取，因此旧显示布局即使丢字段也不回落全局默认。cwd 仍来自新的授权 admission，不从旧 Pane 授权。没有建立第二持久 store 或从当前默认反推选择。

## 实际验证与边界

- 两产品反例先正式红：真实旧helper缺 Shell 得 unknown（预期 partial/failed），Shell五路径均丢 bash。Codec 的结构化/旧格式兼容另有正式红→绿。原诊断“断言错误行为”的脚本没有当验收。
- 新 debug helper：`2a243ab1714400d8ad31ea7dabafd71e7b8aa997772486a7eeafc02c12af118f`。`cargo build --locked`、`cargo test --locked`、`verify-pty-helper` 实际 exit0；Rust 32 unit + 1 inherited-fds + 3 stdio 全过/0 ignored。stream reader/writer 故障注入证明 spawn 回调未被调用；stdio 真缺程序得到 machine none 并能复用 sid 启动 exit7。未声称在各 OS 注入真实文件描述符故障。
- 定向回归 **14文件89 tests passed / 0 skip**。包含原 early exit/unknown exit/旧 sid/取消/latecleanup、Controller/Workspace/Space组合及原低层真实helper入口。Shell五变体的默认刻意不同，断言原 choice 与实际传给 native 的 file；其中落盘读回创建全新 Space/Workspace/TerminalSessions，普通 open 零 spawn，显式 restart 保留原选择。此 Shell配置矩阵的 native transport 为参数记录夹具，不冒称真实 bash/zsh切换或宿主重启。
- 新真实生产组合从 physical Space/JsonStore admission 到 NativeHost/PtyHelper：缺 Shell→保存记录 partial failed→同 stable Session显式修正后真实 sh exit7；另一场景真实 bash 已启动后测试层故意丢弃 reply/exit证据并关闭实际传输→unknown/disconnected、拒绝盲重试。helper 与 Shell PID 均 kill(pid,0)=ESRCH，临时库已删；日志记录PID和清理断言。
- 生产 tsc、全测试 tsc、定向生产 ESLint 全 exit0。测试 tsc 首次报原 connected assert 导致新增有界等待比较被窄化，改为通过 manager 重读状态后全类型绿，无 cast/忽略诊断；受影响两个真实helper文件最终再验3 tests/0 skip。其余测试无新风险，不重复无关检查。
- Rust cargo test 仍输出未改动 `agent_data.rs:1233` 的既有 unused_assignments 警告，本件不声称 Rust零警告。原 round1 两次集成失败、33命令证据及修复前source保留，不覆盖。没有运行 build main/styles、全 lint/architecture/Promise或调整预算；Root负责统一整合。
- 真实 Obsidian、六 Provider实际登录/TUI、Windows/macOS/五平台 E2E仍由用户验收。此轮是Linux进程级隔离自动化及其余平台源码边界核对。

## 冻结原件

- 完整A24源manifest（原16+本轮新增归属8）：`/tmp/huhu-t03-a-repair-source.json`，SHA256 `f71c1f946a7a2978d0241c3cab87da76a65275e7dd3090a1fe1bf47535b3dbf9`。
- 17次实际argv/UTC/exit/logSHA与前后源SHA：`/tmp/huhu-t03-a-repair-checks.json`，SHA256 `ee04c69d48a434042cfff069bfbf4db5f36be03a629dbd14f0bad7b26291d2d0`。
- 近两年活跃且MIT官方上游机制/锁定版本记录：`/tmp/huhu-t03-repair-research.json`，SHA256 `6ed8f1be3e928d87b858c1b0877c687dfb0fff44728970a3a80163032f1155d3`。
- 本轮只改12个授权路径；原A16中其余12文件逐个SHA未变，允许但未用的session.ts/sessions-space.test.ts/i18n.ts未变；B8/C2也逐个匹配Root冻结SHA。完整当前源码原件在 `/tmp/huhu-t03-a-repair-source-snapshot/`，修复前授权路径原件在 `/tmp/huhu-t03-a-repair-before/`，新二进制原件在 `/tmp/huhu-t03-a-repair-output/huhu-pty`（同SHA）。
- 每条检查由直接argv runner记录真实UTC起止、exit和原始合并输出；无shell重建字符串、失败码归一化、隐藏失败或跳过补算。源码→binary绑定见native-build记录；后续只有stdio测试文件增加，未改变binary源。
- 官方活动证据为2026-09-12 commit c8c592d19298cb68b8370f4e151f1591333b7f4a，锁定0.9.0对应 f8921727a11b9f8b073e8c24821d72fd41283500；只借鉴原生API/错误保证，无复制外部实现或新依赖。primary URL及源码/许可摘要详见research JSON。

## 检查原件摘要

| 检查 | exit | 原始log | SHA256 |
|---|---:|---|---|
| red-missing-shell | 126 | `/tmp/huhu-t03-a-repair-red-missing-shell.log` | `52137f01a01ebdc12d39c525594af1ae06dc3be0be2773a3155ab268ee598e05` |
| red-shell-choice | 126 | `/tmp/huhu-t03-a-repair-red-shell-choice.log` | `6a3dc7067a535b52e8e41cf97bb455f4014d7043395afbab9804f2f253fa41ce` |
| red-wire | 126 | `/tmp/huhu-t03-a-repair-red-wire.log` | `3ffc9e4816ed372c6069e728bc62117aac7129320edaeb6b16eeda3baf798aab` |
| regression | 0 | `/tmp/huhu-t03-a-repair-regression.log` | `51ce73c0323b8cb5228392dd3d738b8fae7e8e264ba61b53ea2e0a168cdd7fc1` |
| native-build | 0 | `/tmp/huhu-t03-a-repair-native-build.log` | `3749aecdcf583498efafc42addb1669a304bdf8ecd2dc7227a37c04316333bf2` |
| native-tests | 0 | `/tmp/huhu-t03-a-repair-native-tests.log` | `c30e25830de7622ca429d2982b936c903d60ed97b97c14672bb3b7a771052078` |
| verify-pty | 0 | `/tmp/huhu-t03-a-repair-verify-pty.log` | `f5fb71cb0a761f6e210ed6655d3657558f80b328aba2dbc3cd9e16012df4f17e` |
| production-types | 0 | `/tmp/huhu-t03-a-repair-production-types.log` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| test-types | 126 | `/tmp/huhu-t03-a-repair-test-types.log` | `9bf192e945c7fd237dcbb5f981b46d3216a4f3f279fae843448b00b183db7bca` |
| test-types-green | 0 | `/tmp/huhu-t03-a-repair-test-types-green.log` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| lint | 0 | `/tmp/huhu-t03-a-repair-lint.log` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| e2e-final | 0 | `/tmp/huhu-t03-a-repair-e2e-final.log` | `e06f5d5db51917371084e928f0895221d896b88f6f4182bbfadbfab043a48979` |

无剩余实施阻塞；等待 Root 重新整合、冻结输入与独立审查。SOURCE STOPPED。

## Root 派单回执观察时点

checks.dispatch_sha256=`7300eb9545f600e1216f62e086eab758646b9689e0e2ed2a3e29ff001184381d` 是 2026-10-25T08:52:06.951487+00:00 初始化索引时的派单；source.dispatch_sha256=`917b7b395978cb19d14e3be11816a52bd9d37644fe88ba4f845e04b1be02ed43` 是 2026-10-25T09:04:54.236834+00:00 收尾观察。差异精确仅 Root 补写 `actual_tool=collaboration.followup_task`、`actual_handle=/root/prepare_t03`、`dispatched=true` 三个回执字段，before15/inputs10及授权内容未变。移除这三字段并按原格式序列化后的字节 SHA 完全复得初始7300摘要；已将这个可验算原始字节保存 `/tmp/huhu-t03-a-repair-dispatch-pre-receipt.json`，当前回执字节保存 `/tmp/huhu-t03-a-repair-dispatch-with-receipt.json`。历史 checks/source 字段值均未改写。
