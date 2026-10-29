# T-04 native C 最终交接

**SOURCE STOPPED；cargo/debug binary lane 已释放。** 本报告只交付实现及本地自动化证据，不替 Root 标 Ticket done。最终源码 17 项在 `/tmp/huhu-t04-native-source.json`，逐文件 path/bytes/SHA256/只读时点副本均可回读。`frames.ts` 沿原 protocol=3、未改字节。

## 实际生产接线

- 共享 DTO/strict codec/单一 35-case 正负 fixture 同时由 TS 与 Rust 验证。hello 为 protocol3 + capabilities.terminalTermination=1；缺失/legacy/错误类型/数组枚举/过期 sequence/错 sid、platform/跨字段冲突不成为 cleanup 成功。只读持久 validator 与 wire validator 已被 A 消费，公开签名沿 v3；最后只是用等价 charCodeAt 校验 C0/DEL，清除 no-control-regex，不增加 API。最终公开源摘要另见 `/tmp/huhu-t04-c-public-api-final.json`。
- NativeHost 将 root wait、scope cleanup、output settlement 分开；release 只在匹配 scope confirmed 且后置 numeric exit 均到达才成功，缺任何条件为 NativeReleaseError。partial/unknown/timeout 的 captured owner/generation/sid 路由及责任保留，Browser sibling 不受目标 stop/Agent lease release 影响；新用户动作拒绝后，captured ACK/reply 仍能在有限 drain 窗口处理，transport 终结后不重连/重放。
- Host 记录每个 SID 首次 end/requestStop 的 monotonic 时间，force 升级及 release 复用剩余观察窗口。native GRACE=2s、DRAIN=3s、单次 stop 总期限=8s；Host 每 SID stop 观察上限=10s。**最后 owner 的 helper 物理退出另有既有 4s+1s 阶段，release 极端最坏约 15s，不能宣称整个 release 总计 10s。** 只剩尚未 stop 的 SID 才从首次 release 发 stop 开始计时。
- Unix 用 birth/SID/TTY 捕获与发送前复核，按目标 Session 的受管组 HUP→真实 SIGKILL。根先退仍保留 scope；TTY 在 leader 退出后被 OS 清为0的子孙仍可按原 SID 收束；job-control 另组覆盖。已捕获 PID 确定不存在与读取/解析失败严格区分：后者 scope-unverified；全局扫描无权读取的无关进程不会永远阻断正常 Scope。已知 setsid 脱离保持 partial/escaped-member，不按 kill 返回或 PID 不可见假报成功。
- Windows 同一已验证 helper 内部 bootstrap，在随机私有、当前账号+SYSTEM DACL 的 gate 生效前不启动 payload；helper 先检查/分配 perSession Job，再放 gate。父进程从 captured anchor HANDLE 主动 DuplicateHandle 并有限 ACK，返回真实 payload PID，并用真实 payload handle wait；bootstrap PID 不冒充 payload。分配/取消/gate/status/handle 失败清理受管 Job 与捕获 anchor，不裸启动 fallback；helper-wide checked RAII Job 仅做 helper 死亡兜底。Job query/terminate 错误不成为 count0。未宣称恶意同账号防护。
- reader 和输入 worker 在 bootstrap 握手阶段已经工作，CPR/device reply 不需等 spawned；同步预约 SID 后异步执行 PTY spawn，紧随 spawn 的 resize/input 经同一有限 FIFO（两项，帧大小沿原上限）保持顺序。容量/关闭错误带原 SID 返回，不重放。pending stop 立即关准入；首次 stop 时间不重置，未发送的旧输入丢弃，live drain reply 仍可走捕获通道。ConPTY close/resize/input 等阻塞工作不占 stdin/global live 锁；force 与 Cookie 仍可 dispatch。
- root-exited notice 可先到；**先发布 drained/truncated 证据，再发送旧 numeric exit**。根先退而后代持 PTY 的测试真实复现旧顺序错误。读取异常保守标 truncated；output 截断与 scope 成功相互独立。

## 最终同源验收（实际 exit 均 0）

完整 argv/cwd/UTC/exit/stdout SHA 在 `/tmp/huhu-t04-native-checks.json`（所有历史失败也保留）；下列记录及同名 `.log` 为最终有效选择：

| 检查 | 原记录 | 结果 |
|---|---|---|
| cargo test --locked（等价 check:native） | `/tmp/huhu-t04-c-native-source-frozen.json` | Linux 38 unit +1 fd +4 tree/frame +3 stdio；0 ignored |
| verify-pty-helper.mjs 最终正常 binary | `/tmp/huhu-t04-c-verify-helper-frozen.json` | stdin/input/env/exit/flow/关闭实际通过 |
| Windows GNU target cargo check --locked --tests | `/tmp/huhu-t04-c-windows-frozen.json` | 仅交叉类型检查；包含 cfg Windows API 失败/私有对象用例，未执行 Windows |
| rustfmt --check skip_children=true | `/tmp/huhu-t04-c-rustfmt-frozen.json` | 只核本票 Rust 源/测试 |
| Host/Helper/Termination 定向 Vitest | `/tmp/huhu-t04-c-ts-post-lint.json` | 3 files /20 tests；单 fixture 内35真实JSON case |
| 定向测试 TS 闭包 | `/tmp/huhu-t04-c-types-post-lint.json` | `/tmp/huhu-t04-c-tsconfig.json`；不生成产物 |
| scoped ESLint，零警告 | `/tmp/huhu-t04-c-lint-green.json` | 仓库既有测试忽略保持，测试由 tsc/Vitest 覆盖 |
| 最终只读 binary 副本真实 Host/PtyHelper+Cookie | `/tmp/huhu-t04-c-fixed-copy-host.json` | 1 test、Linux、0 skip；已接受 SQLite Cookie 读在 Agent release 后完成 |

Linux 真树 fixture 独立子进程设 subreaper，只标记/信号/等待自己的 helper/子孙；验证 HUP/TERM 忽略后的真实 SIGKILL、root先退+job-control另组、先截断声明再numeric exit、已知setsid逃逸不成功、peer继续输出。所有等待有界；finally kill+wait 自有 helper、对已确认为本进程子代的标记 PID 收束，并 wait 到 ECHILD。原 stdio 测试也补了失败路径 own-helper RAII reaping。

主要真实红灯原件：`known-observation-red` (101: unreadable 被当 Ok([]))；`native-force-mutation-red` (101: 将 SIGKILL 临时改成 HUP，HUP-ignore 断言拒绝，原字节已恢复)；`exit-output-truncation-red` (101: 根先退持PTY，numeric 早于截断声明)；`stdio-first` (101: 新异步 spawn 丢立即 input/resize，另有旧测试未认识新 notice)；`drain-timeout-red` (126: confirmed但缺numeric被放行)；`first-stop-deadline-red` (126: 重开观察窗口)。codec/helper/owner drain 其余红绿及 Windows 初次歧义编译错误均在总 checks 原件中，未改 exit。早期部分 red 文件名实际上是夹具/导入/超时设置失败，普通 `exit-output-order-red` 实际 exit0，均不当行为红灯或通过替代品。

## 最终 helper、写集事故与边界

最终不可改写副本：`/tmp/huhu-t04-c-linux-final-20261025T103906Z`，**23217880 bytes**，SHA256 `ce263fd68bdbd792d2b36f675d2ee838ff39052926ce688dcb06b086eb076343`。生产者 `cargo test --locked --manifest-path native/pty-server/Cargo.toml`，原记录 `/tmp/huhu-t04-c-native-source-frozen.json`；11项 Rust/Cargo 全输入、producer record SHA、target与副本一致校验见 `/tmp/huhu-t04-c-final-binary.json`。当前 target 已恢复正常，绝非负向 mutation 产物；不再写 target/该副本。早期 candidate 只代表当时时点，Root 最终组合应使用此 final 副本。

曾有一次 rustfmt(main.rs) 未加 skip_children 导致非写集 cookies/data/frame/inherited_fds 四文件仅格式漂移。已主动报告，Root 独立核对这些路径 T04 起点 clean 且等于固定33c21e原文，并明确授权精确恢复；当前均恢复原 SHA、无净差异。原文/漂移副本/diff/逐文件恢复时间和 SHA 全见 `/tmp/huhu-t04-c-format-incident.json` 与 Root `/tmp/huhu-t04-root-format-audit.json`。最后全部 native 验收发生在恢复后。不掩盖此越界事故；此后所有 rustfmt 都 skip_children=true。

未修改正式 Change、Git/index/ref、main.js/styles.css/budget、依赖版本、A/B业务/UI文件；Cargo 仅增加既有 windows-sys 的 Memory/Authorization/Cryptography feature。没有复制 GPL、增加 daemon、第二 PTY 平台或 crate。沿已核验 portable-pty0.9 实际源码和 native-design 官方 Win32/Job/ConPTY、Linux/macOS观察资料；来源/许可/采用理由见 Root 已保存 `C/evidence/T-04-native-design.md` 及 source-observation/materials，无新来源代码复制。

Windows/macOS/Obsidian/真实 Provider/五平台 E2E 未执行，由用户完成；Windows crosscheck 不证明 ConPTY/Job 实机行为。Windows3项实际Win32 cfg测试只交付并编译；Linux执行的是共用 gate 编排故障注入2项。Unix只保证已界定可观察受管 scope；不承诺任意未捕获 daemon/主动脱离均可被绝对证明不存在。已知逃逸或身份不可核实时保持 partial/unknown、不归档成功。预存 Rust agent_data.rs 的 unused_assignments 警告保留，不越界修它。Root 负责全库 build/lint/架构/Promise/bundle 与独立 review；本 worker 未跑全库构建或用户宿主操作。

### 补充：Cargo.lock 区块顺序事故

Root 最终审计发现 Cargo.lock 的 huhu-pty package 被规范排序，内容/依赖版本未变。原锁95dc808b...与diff已保留；mtime与首次省略 --locked 的 known-observation-red 相差28ms，构成高置信归因，但没有逐命令写文件审计，不能把时间关联伪装 syscall 追踪。隔离相同manifest+固定base锁执行 metadata --locked 保留原SHA；后续隔离 test --locked --offline --no-run 也保留固定base。Root独立tomllib比对后明确授权恢复52fbd40...，已精确恢复。记录 `/tmp/huhu-t04-c-lock-audit.json`、`lock-cargo-timeline.json`、`lock-restore.json` 与对应原锁/diff；保留 `/tmp/huhu-t04-native-handoff-pre-lock-audit.md` 的原陈述供审计纠正。

**95dc...原producer记录及原冻结helper完全保留，不覆盖。** 该二进制确由当时仅顺序不同的锁产生；17份T04源未变，依赖树语义等价，不能把原producer输入SHA静默改为52fb...。Root可按恢复后的锁绑定后续整合检查；若需新producer，只创建增量记录与新副本，不改原件。

**SOURCE STOPPED / NATIVE LANE RELEASED。**
