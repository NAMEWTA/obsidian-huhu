# 任务回报

Session: 20261026T045732Z  
Task: 017-t08-native-shutdown-repair  
Status: completed

## 聚焦交接

F5 正常 helper EOF 残留 editor socket 的窄修候选完成，六个实际修改产品路径已 SOURCE STOPPED。listener 的 JoinHandle 现在由原 Service 持有；Session 原统一退出截止内观察线程完成，实际 join 后读取自身 inode 清理结果。自然退出和活动 editor 退出均无端点累积；外来替代实体保留，异常明确返回失败。原 F1–F4、TS/UI、协议、generated、旧证据和旧双 bin 均未修改。本报告只交本 F5 候选，T08 整票、Host/官方 Pi 重新组合和独立 R3 验收仍归 Root。

## 产物与验证

证据根为 `/tmp/huhu-t08-native-shutdown-20261026T113322Z`（以下 R）。`commands/<label>.receipt.json` 保存真实 argv、cwd、UTC、实际 exit、timeout 标记、完整 raw 及前后 native 源快照/CAS；失败原件不覆盖。`meta.json` 保留七个授权路径的真实前像，`diff-final/` 是相对此前像的差异。读取并沿用 I/dev、错误/并发/TDD/test-reliability 约束；无 UI 改动，不扩展职责或递归派遣。

本轮输入为 GP029/Map30、T08 恢复周期 1；旧 attempts3 停止点与 016 request-changes 原件保留。TASK SHA `1d2ec84bf8907a5af9c0450886d28aed01ab6d6a849ccf297c9e57551efdbd3f`；recovery1 packet SHA `9999200cf1b2590d84ab1357b2aa055237bfca5e124c2c39f9640e5e82bada67`；allocation-r3 SHA `bc61d993df11f88c6abb39f0f90a4ad4b86399d324de0d5184c45f46447eefcb`；完整 preflight2 输入 SHA `3b3274ac380bc9a8a266a478b6cb2f4d249903270e8b4e2781576f63c52a0064` 原样存 R/input.json。016 报告 SHA `30cc865bade17ba4c7cfa9b9b39201c785e2cfa7ac3131d070fb1e6f539d8a15` 与 Root audit SHA `5da903f71ad84795f1e6668b6067073953c778c2524f7ea6db9d694207625a6f` 为修复输入，不重写原 probe 或清它的资源。

### 设计与截止预算

比较了两种方案：保留原 listener JoinHandle，完成后 join 并取得清理结果；或增加显式停止完成 channel。后者还须协调通知、panic 和句柄所有权，重复已有完成状态。本次采用前者，未新增通道或协议。

- `editor.rs` 的 lazy runtime 保留 endpoint、worker 和缓存的实际 join/cleanup 结果。`shutdown()` 先发布 closing 并关闭原 binding；`finish_shutdown(deadline)` 只通过 `try_lock` 观察 runtime，在原截止内轮询 `is_finished`，之后实际 join。超时不清句柄、不缓存成功、不释放 binding/operation/frame。
- enrollment 保持 runtime 锁直到 capability 准备及 binding 插入，且取锁后再次拒绝 closing。listener 必须在成功 `try_lock` 的同一临界区重新检查 entries 为空，才允许结束。因此在途 enrollment 不能被先前的空表观察漏掉；阻塞的 enrollment I/O 也不会让 main 等 runtime 锁而无限悬挂。
- `Sessions::end_all` 在入口创建唯一原 `STOP_BUDGET`（8 秒）截止；原 Session/root/output/reply 退出轮询与 editor 完成观察共用它，没有先等满 Session 后再开一份 8 秒。原 stdout writer 的独立最多 5 秒尾部 flush 保持，不把整个进程退出冒称硬 8 秒保证。
- Unix listener 的显式 `close(self)` 返回原 dev/ino `remove_identity` 结果；替代 inode 拒绝删除且失败不被 Drop 的再次尝试掩盖。Drop 仍保留其他原调用者的兜底。Windows `close(self)` 仅完成原命名管道 RAII，未启用非 Linux editor 能力。
- main 在 editor 关闭异常/超时时打印 `editor service shutdown incomplete` 并最终 exit1；原 outbox finish/flush 顺序保持。正常 join 及 own-inode cleanup 成功才 exit0。

`is_finished` 是 join 的观察门，物理完成证据是之后的 join 结果和显式端点清理结果。它不是硬实时保证；OS 调度、内核文件 I/O 永久挂起、进程被外部强制结束仍属于边界。异常时保留未完成/残留事实，没有宽泛删 runtime 或提前宣称 binding 结算。原操作 queued none、dispatch unknown、app/local IO、root/cap/output 责任均沿原路径；本次未改它们的清槽条件。

### 真实红绿与命令

| 命令 label | 实际结果 | 证明或失败边界 |
| --- | --- | --- |
| 001-unmodified-native-eof-red | exit1，无 timeout | 原 immutable helper，普通自然退出→EOF，无 cap 替换/时序注入；同 0700 短 runtime 12 代死 socket 数为 1/2/2/3/4/5/6/6/7/8/9/10。先完整观察，再仅按记录的自身 dev/ino 且 ECONNREFUSED 清测试死 inode；删除后空目录不算产品通过。 |
| 002-source-native-eof-test-red | exit101，1 红/6 filtered | 未改生产源的真实 helper 回归，交替自然/活动 editor 的十代清理前检查出现残留。 |
| 003-replaced-endpoint-red | exit101，1 红/7 filtered | 未改生产源；替代 sentinel 保留但 helper exit0/无错误，实际断言“normal exit must not hide endpoint cleanup failure”红。 |
| 004-native-eof-green | exit0，2 项/6 filtered | 第一生产候选的两个真实 EOF 回归通过；后续预算修正前的阶段绿，不当最终候选证明。 |
| 005-owned-rustfmt | exit0 | 仅六个实际修改文件格式化，skip_children=true。 |
| 006-editor-shutdown-matrix | exit0，9 项 | 正常/活动十代、端点替换、cap 替换真实约 8 秒超时，以及原 auth/配额/取消/物理结算保护。阶段原件保留。 |
| 007-all-native-tests；008-linux-bin-build；009-windows-cross-check | 全 exit0 | 第一候选全测试、双 bin build、Windows compile check；后续预算修正后再跑最终 020–022。 |
| 010-locked-cargo-metadata | exit0 | `cargo metadata --locked --offline --format-version 1` 原始解析图；没有联网升级依赖。 |
| 011-test-observation-format | exit0 | 为异常 fixture 增补清理前目录/inode 观测后，仅格式化所属测试文件。 |
| 012-runtime-lock-budget-red | exit101，1 红/18 filtered | 持真实 runtime Mutex；关闭使用 30ms 截止，200ms 外层观测尚未返回。测试先释放锁、join 两个自身线程，再报告目标红，不靠强杀收尾。 |
| 013-runtime-budget-format；014-runtime-lock-budget-green | exit0；exit0，3 项/16 filtered | 关闭仅 try_lock，同一截止覆盖持锁/未完成 worker/异常 join；线程异常结果可重复观察。 |
| 015-inflight-empty-recheck-red | exit101，1 红/19 filtered | 确定性握手：先采空→在 runtime 锁内插入受控 map 标记→释放，旧退出 predicate 仍 true，实际断言 stale empty observation 红。 |
| 016-inflight-recheck-format；017-inflight-budget-green | exit0；exit0，4 项/16 filtered | 判空移至 runtime 同临界区；回调另断言执行时该锁确实被持有。调度测试只证明此锁/顺序合同，不冒充真实 app 或 Binding 事务。 |
| 018-dependency-tools-before | exit1，夹具错误 | 该环境解包目录没有 `.cargo-checksum.json`，初版采集器 FileNotFoundError；未修改生产源。原 raw 保留；改为锁定 `.crate` 归档及成员逐字节核对。 |
| 019-dependency-tools-before；026-dependency-tools-after | 全 exit0 | 88 个 registry 归档 hash 匹配 Cargo.lock；归档所有 regular 成员核实际解包内容；全部 8369 个现有依赖文件、实际工具/config/相关 env 前后无漂移。019 与 020 的只读采集有时间重叠；019 在最终 021 build 前结束，不追补为更早执行的运行前冻结。 |
| 020-final-all-native-tests | exit0，142 顶层执行 | 最终源全 native 测试，无 ignored/filter；具体分组见下。原嵌套 1 passed/5 filtered 不重复计数。 |
| 021-final-linux-build | exit0 | 最终源 `cargo build --locked ... --bins`；复用明确授权的原 Cargo target 缓存，未声称冷构建。020 已真实编译修改后的生产源，021 保存最终输出关联。 |
| 022-final-windows-check | exit0 | x86_64-pc-windows-gnu --tests 交叉检查；仅原 foreground.rs dead_code warnings，未关闭规则或修改未分配源。不声称 Windows 运行通过。 |
| 023-final-owned-fmt-check | exit0 | 六个实际修改文件 rustfmt --check，skip_children=true。 |
| 024-new-immutable-pair | exit0 | 真实 debug build 输出复制至全新目录、核同 SHA、chmod0555；旧 pair 未覆盖或改模式。 |
| 025-final-immutable-eof-probe | exit0 | 最终只读 helper，普通无注入自然退出→EOF，同短 0700 runtime 12 代全部清理前 socket 数 0；新 probe fixture cleanup 删除列表为空。 |
| 027-final-source-resource-audit | exit0 | 2144 基线输入/2072 产品核对，仅分配内六产品变化；前后快照、依赖、旧 pair、实际记录资源均核实。audit 自身回执另存，producer 不自引用。 |

最终 020 顶层为 lib20、huhu0、main71、control20、control_outbox7、control_protocol2、editor9、foreground2、inherited_fds1、session_tree6、stdio4、doc0，总计142。新增四个 shutdown 单测因原 editor.rs 同时属于 lib/main，在两个顶层各执行一次；原131 + 8次新增 shutdown 执行 + 3个真实 editor EOF 用例 =142。session_tree 子进程内部另输出的 1 passed/5 filtered 没有加到142。

真实十代测试交替：五代已经自然退出并收到 exit/reply-settled/editor-closed 后 EOF；五代已认证 editor 活动时 EOF。每代 helper 正常 wait、root PID gone 后，在 Fixture Drop 之前列自身 runtime 文件及 inode，要求为空。端点替代测试保留 sentinel 的 dev/ino/正文，helper exit1/identity changed；cap 替代测试保留正文/inode，真实约8秒 exit1/timeout，记录未完成端点/cap/original 文件，再由测试自身 Fixture Drop 清归属根。故异常剩余没有被隐藏为“产品清理成功”。Helper 的强杀仅是失败测试的最后兜底，正常和这些有界异常通过均未以强杀算成功。

普通 probe `R/eof-probe.py` 的原 source 未为绿灯改写；旧红 `eof-probe-huhu-pty-f99ec633e220.json` 与新绿 `eof-probe-huhu-pty-950b1832947e.json` 分名保存全部事件/PID/endpoint。work/ 是可复用夹具暂存，历史观测以各次独立 JSON/raw 为准。控制 Node 只读取自己 capability env 指定的文件以记录 endpoint 后自然退出；没有替代官方 Pi app、读取用户账号或注入 loader/strace。各 receipt 的 NODE_OPTIONS/LD_PRELOAD 为 null，probe 对子进程显式最小 env。

### 最终二进制、来源和清理

新只读 pair 目录 `/tmp/huhu-t08-native-shutdown-linux-20261026T115900Z`：

- `huhu-pty`：31119408 bytes，0555，SHA `950b1832947eaa287ef9c03499e9574a61ee7b7c4845a31ff422a350ce3af843`。
- `huhu`：15428448 bytes，0555，SHA `63db57114503eaedf757c6c087eef8c0c268d393dc86b58035de51c67fdacd74`。
- `producer.json`：0444，SHA `5d82fd3794c4109fbd02151e5d41e69adb67310bbff667c0dc03f40ac626f7c3`，含26份生产 Rust/Cargo 输入、测试输入/CAS、实际 build 输出、源快照、命令关联、工具/依赖摘要及边界。未覆盖原 C stage2 pair。

R/final-audit.json SHA `8f2fbfcfb7c747dfd01008f2c76422152d06231d58f0afcff0908253351bb594` 核验26条前序回执及 native 前后源摘要；027 自身回执另留。已记录139个 helper/root PID 全部不存在，7个已记录 fixture 根已不存在，R 自己的 runtime 无文件且 /proc/net/unix 无所属监听。只对已记录自身资源作此判断，不声称审计其他进程。旧 pair 的 SHA/0555 保持为原 f99ec6… / 923ac2…；所有旧报告、probe/bin和 Root 输入原件只读。

R/dependency-tools-before-final.json SHA `bf1cadc64a38fa4d6211f40e3f08c34c4f6d789c280cb29b34800204cf892a57` 与 after SHA `f995d8cdaa95f22b825e56b14ee8dda9ee98692f9cbfb3c7544707fa83adcd77` 保存 `.crate`、解包成员、真实 rustup 目标工具二进制 hash、配置存在/缺失及相关环境。cargo1.99.0/rustc1.99.0/rustfmt1.10.0-stable；实际工具不是只记 rustup wrapper。无 Cargo.toml/lock/registry 源修改，无新依赖，无 UI/TS/main.js/styles 构建。

最终前后像如下（完整路径、字节和可回读 CAS 在 audit/meta 与 diff-final）：

| 授权路径 | before SHA256 | final SHA256 |
| --- | --- | --- |
| `native/pty-server/src/editor.rs` | `b9218e18196ea5a38bd0c19e0d6a74e14701046acb23c867d8af31032d496c2b` | `08481e721741ce3abaa599d79b30ab89da3e92846446ee706709f16f281e6a56` |
| `native/pty-server/src/session.rs` | `6d55c7a5007b92ec6992ce091e26344ac6d6aa32e5fa53c11389ea837d28097d` | `62a706dce459a93bfe80bdf4fe4194c28c420de48c07dd2309a4afc0e243d87c` |
| `native/pty-server/src/main.rs` | `ab4bf0b00de0879e00e772adfdb90c76f997c8e6ad51f92ed460fb64558fa639` | `1a37e0ee6d4556b51d21404921fa9c2946138240764f28ee12749af16480d107` |
| `native/pty-server/src/control/unix.rs` | `a68693d73e044f870324342a9d2c81908e69e0b55cbd0260c0cb536adfcc8c7b` | `f99696d083b74e5863ba8e8812dc857fd27f977baf01839aabf3525b81c85e93` |
| `native/pty-server/src/control/windows.rs` | `00001ea83c0fd7523fecf935df167d31c94c1a9391403d8d99070ef58d8e3dc6` | `0627bcc1d001ccff77dfdbc5086df5f0123db3ae416e5df82570e86baa6d22ba` |
| `native/pty-server/tests/editor.rs` | `b9884d2aa504d16504858c61214f537a4f8f105a90f9c1ec2226f72aa9287b11` | `97931d5142112f7b8a9e3e823618d22dae4f3200a5c1558380d1153a0a274474` |
| `native/pty-server/tests/stdio.rs` | `b0489fa16f312db28238bfd633c33639cd52781abd9b0f597b1700d6b0f2b8b4` | `b0489fa16f312db28238bfd633c33639cd52781abd9b0f597b1700d6b0f2b8b4`（未改） |

## 问题与下一步

本017分配内无剩余实现或必需定向检查。Root 使用新 pair 重验 Host/F1/control 与完整官方 Pi 业务链，再由独立 R3 复核；原 TS/UI/build/lint/Chrome/预算若输入未变按 Root 影响闭包复用。本次没有执行真实 Provider/Obsidian/五平台验收。Windows 只交叉编译检查；Linux 外部强制退出、OS 调度或永久内核阻塞不保证无残留，main 会如实暴露可观察的超时/错误。

返回结构检查在本 REPORT 原子写后实际执行，独立存 R/commands/028-return-structure 与 delivery-receipt.json；不在写报告前预填通过。F5 候选不是 T08 独立审查通过或整票完成。

SOURCE STOPPED — 本017六个实际修改产品路径和未改的stdio路径均停止；原014 Host三路径及所有其他产品继续STOP。仅整理本次证据，等待 Root 接收，不自行开启下一任务。
