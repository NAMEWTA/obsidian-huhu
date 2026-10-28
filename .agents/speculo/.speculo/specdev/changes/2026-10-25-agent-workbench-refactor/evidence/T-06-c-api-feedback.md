# T06 C producer 契约反馈（只读建议，未冻结 API）

结论：同意 A 候选的 Session 单一活动序列/来源绑定、逐能力三态、摘要与旧原生答案分路。当前 Hook 端口不能可靠生产 `foreground=confirmed`；T06 保持 unknown，T08 必须补至少 Linux 的真实正向 prompt 路径及变组/换实例负例，不能以全部拒绝代替 AC013。下列“建议”均未落产品代码；不改变 GP019/Map20、当前 API 或既有 helper。

依据为候选 SHA `b3e651be…`、Root 准入/foreground 研究及本次真实源码回读。逐文件 SHA/字节/UTC、范围和前后漂移在配套 observation；源引用行号为本次时点。没有运行测试、构建、cargo、helper、Provider、账号或用户库操作，没有新外部研究/能力认证。

## 1. 六 adapter 的 provider / instance / sequence

| 来源 | 当前可证事实 | 给 A 的最小 producer 保证/调整 |
|---|---|---|
| Claude Code | 配置 SessionStart、UserPromptSubmit、PermissionRequest、PreToolUse、Stop/StopFailure；command 只传 event | 新格式明确固定 `provider=claude-code`；每次命令进程仍 `lifetime:unproven`、无 sourceSequence |
| Codex | 配置同类事件，结束含 Interrupt；不是当前 CLI 实跑认证 | 固定 `provider=codex`；同上，不由配置存在声称版本/能力可用 |
| Gemini | BeforeAgent/BeforeTool、Notification、AfterAgent；Notification 未带可信权限/问题分类 | 固定 `provider=gemini`；同上；waiting 不统一称 permission |
| Grok | SessionStart、UserPromptSubmit、Stop/StopFailure/StopCancelled，没有 PermissionRequest 配置 | 固定 `provider=grok`；同上，blocking 能力不补造 |
| Pi | extension 回调维护 pending/answer/settled；目前 envelope 无实例/序号，shutdown 不发结束事件 | 可在**本次 initializer 注册寿命**生成 UUID 与单调安全整数、显式注册/关闭通知；这是拟新增保证，不是当前进程寿命或 foreground 证明 |
| OpenCode | extension 闭包串行 event，过滤 child session，busy/retry、permission/question、idle 取原生答案；目前无实例/序号/结束通知 | 可在**本次 plugin initializer 寿命**生成 UUID/序号；明确 root native session 与 registration 不是同一身份，多 root/重载并存不能选“最后来者” |

事实位置：`automation-hooks.ts:38–67,189–223`、`native-extensions.ts:6–79`。当前六者都没有可消费的真实 instance/sequence；四类 command 的 `eventAt`、文件 hrtime、Hook PID/ppid、nativeSessionId 均不得替代。`HUHU_NATIVE_OWNER` 只用 PID 存在性避免嵌套 owner（native-extensions:18–23），不是寿命/前台凭证。adapterRevision 只标识实际识别的 HUHU adapter/envelope 格式修订，不是 Provider 版本；旧格式明确标 legacy。未实测的 observedVersion 缺省；检测 probe/resolver 只找到可执行文件，不证明正在运行版本或支持能力。

**同意** `ActivitySourceMeta.lifetime` 联合和可选 sourceSequence，无需给四个 command 伪填字段。provider 必须来自被审定的 adapter 固定标识；旧格式不能从 SessionStart 名字或 initialProvider 猜成新 producer。迁移命令时，managed 与全局脚本均显式识别“原精确命令 + 新版 provider/event 精确命令”，安装替换自己的旧命令，remove 识别两代；保留同组用户 command/matcher/其他字段。全局路径与命令继续跨 Vault 相同；extension 仍只更新模板相同或已记 digest 且未被用户改写的副本（system-hooks:40–78,223–259,287–355）。不能每 Vault 写一份全局身份。

## 2. 生命周期、切源、blocking.clear

同意 A 的 bindingId/programEpoch 由宿主分配，C 只对捕获的 binding 投递。事件最多证明“该 adapter 在该 scope 产生了该事实”，不证明仍是当前前台。无实例 command 可显示最近事实，但 health/current-state 与 prompt 凭据保持 unknown；不能把无法归属当前程序的旧 Stop 计成当前完成。Stop/AfterAgent 是一轮结束，不是来源进程退出；同 nativeSessionId resume 也不证明同一寿命。

- 实际 close、stop/root-exit/lost、HookError、容量/读取故障、真实来源切换或 freshness 到期撤销当前可信度，保留 lastFact/诊断。C 不生成 activitySequence。旧 binding 迟到/close 只作用自己，不撤销后来的 binding；两个来源并存而无法可靠选择即 source-mismatch/unknown，不自动切给新事件。
- Pi `session_shutdown` 目前仅 pending=false（:46），未来可发本注册来源结束；其缺失不能由静默补成退出。OpenCode 当前没有可证的 plugin shutdown 通知；失联/重载保持 unknown。新增 SourceStart/close 可作为 C 调 bind/close 的内部元数据，不需要给原完整答案 consumer 发一个虚构 Stop。
- **当前没有跨六家通用 blocking.clear 证据。**Pi 已有 `ui_prompt_start/end` 回调接缝（:34–35），建议保留真实事件类别，在同实例、已知未闭合的 UI prompt 配对成立时 clear；未认证具体 prompt 语义时 reason=other，不统称权限。不能把旧映射后的任意 PreToolUse 当此证据。OpenCode 当前把 permission/question 都映为 PermissionRequest（:65），建议保留 subtype，但当前未实现对应回答/清除事件，不发明外部 API。running/idle/Stop、seen、TTL、quiet 都不清 block；失效为 unknown。

这与 A 现有联合兼容；建议将规则写进 reducer 的采纳门，而不是从 capability=observed 推导 foreground/clear。真实 adapter 实例和 blocking 配对新增后仍需本地夹具与用户真实 Provider 验证，不在本报告认证。

## 3. 有限 spool、delivery 去重和错误

**现状风险为静态事实，未复现容量故障：**post 无总量预留、catch 静默；poll 全目录 readdir/sort、lstat 后 readFile、unlink 错误吞掉（automation-hooks:43–50,225–265）。因此目前不能保证总文件/字节有界、单次真实读取不越过 lstat 大小，或 unlink 失败不再投递。UUID 文件名可标记一次物理投递，但 hrtime 不是跨进程序号。

建议保持同一 AutomationHooks owner，生产/消费共同实施一个明确有限 profile，不只在 reader 事后拒绝：

1. scope 最多 N 个已占用发布槽、每 envelope≤E 字节、总新分配/落盘≤N×E 加固定元数据；publisher 用已有 exclusive-create 原语（settings-write:39 的 wx）原子取得槽，完整写后 publish。并行 writer 不能靠 readdir-count 判断还有额度。`.pending` 崩溃占槽保留至该 scope 收束，不按 PID/mtime 抢占；另保留常数级 overflow/fault 标记。N/E/batch/dedupe 阈值待 Root 准入，不在此预填验收值。旧完整答案 2MiB、旧输入 16MiB 是当前独立上限，不等于总 spool 预算。
2. reader 每轮最多 B 个/有限字节；检查实际打开的同一文件并限读 E+1，再解码/校验，不能 lstat 后无界 readFile。需有限调度不同 scope，回调不能无限占轮询。publisher 无法写 fault 标记也不能承诺立即可见，最终 freshness 失效兜底，绝不能继续宣称 current。
3. 稳定 deliveryId 写进 envelope，同一文件重读相同；接收方在回调前记为已消费。unlink 失败保留 tombstone/槽占用，有限重试后降 unknown，不把它作为新活动再次交付。callback 失败不自动重放原生答案/输入。去重记录达到 D 时 fail closed 当前来源，不能 LRU 遗忘后接纳旧 Stop；只由真实新 scope/来源寿命重新建立 fence，不能为了清表虚造 instance。
4. 真 instance 的 sourceSequence 用于同实例去重/旧序号 fence；发布、读取重排也要有有限窗口，缺段/超界降 unknown，不以事件时间填洞。四类 command 没有此能力。超过数量/大小、JSON/来源不合法、真实读取或清理失败均要有准确诊断并失效，不转 idle。旧 adapter 未升级不能声称 publisher 已受新上界约束。

同意现 ActivityObservation 的 deliveryId/sourceSequence 与 ActivityAdoption 返回，无需 A 无限保存日志。摘要校验需编码前有界；nativeSessionId/instance 不截断后继续采纳。新的硬 profile 与生命周期测试要在 C 实施时给 Root 实测冻结，此处仅保证方向。

## 4. prepare / close、Shell env 所有权

当前 prepare 先 resolveAccountEnv/核对账号，再建立 `.HUHU_ACCOUNT_ROOT/runtime/hooks/terminal-*`、可能安装该 Provider 配置，返回仅 DIR/TOKEN/NODE（automation-hooks:122–167）；close 同步撤 slot，异步 rm 只 console.error，dispose 也没有可 await 的清理完成。TerminalSessions 目前只在 hooks+agentId 时调用（sessions:498–504），因此 Shell 尚没有准备。`spool-guard.ts:3–6` 强制账号根；不能给 Shell 编造 Provider 账号绕过它。

**建议 A 类型的两处最小调整：**`RuntimeHooksRequest.signal?: AbortSignal`；`PreparedRuntimeHooks.close(): Promise<void>`。close 的撤销/停止回调必须在首个 await 前同步发生、幂等复用同一 cleanup Promise；Promise 表示实际自有 scope 清理完成或准确失败，由原 TerminalSessions/AutomationHooks 生命周期收集和等待，不无主 fire-and-forget。原 `prepare(agent,env,receive)` 的 legacy close 形状可保留 wrapper，但其后台清理仍由同一 AutomationHooks 统一持有；不能把现 void 宣称为清理已完成。若 Root 保持新 close:void，必须另有该同一 owner 的可 await drain 接缝，不可省掉责任。

Shell 只在显式 admitted runtime/statusHooks 开启时准备 spool：从 accounts.ts:48–54 提取不依赖 AgentId 的 system-runtime 根，复用 `.huhu/agents/<device>/system/runtime/hooks`，建议增加独立 `HUHU_HOOK_ROOT` 供 guard 检查；返回新增环境仅 ROOT/DIR/TOKEN/NODE。账号 Agent 继续原已核账号根，旧 guard 可受控兼容。不得改 HOME/USERPROFILE/Provider homes/凭据、argv/permissions，也不为手动发现被动安装六家配置。没有实际 adapter 的 Shell 即 unknown。

prepare 每个 await 后、入 slot 前、poll 回调前检查 signal/disposed、捕获 slot 对象、binding.active/runtime；prepare 迟到只清理自己刚建 scope，绝不接到新 runtime。close 撤销后已取出的文件不能继续投递。已启动的全局安装仍受原安装 owner 收束，不反向删除另一个 Vault 共享配置。A 继续在 beforeSpawn 前后重验其真实 runtime/Space 门。

## 5. 有限活动摘要与旧完整答案

同意保留 `NativeHookEvent {event,at,data}` 和原 prepare 完整答案接口。一次有限读取/JSON 校验后由同一 owner 分流：原始事件保持原合同；新 activity 仅取经白名单的有限 metadata，不含原生答案、prompt、工具输入或环境全集。两个 consumer 分别隔离错误；摘要拒绝/容量失效不丢弃已合法的原生完整答案，也不把摘要失败改成一个成功 Stop。

`event-payload.ts:2–18` 当前答案上限2MiB；`agent-runtime.ts:177–248` 保留旧 turn since/子会话过滤、HookError→失败、native session/transcript 引用、原生答案完成与取消。Pi settled 只结算一次；OpenCode 仍须 root session 和真实已完成答案。新 producer 不替这些 receipt、取消、usage/账号合同作决定，不改为“屏幕 idle 即答案”。C 的去重针对同一次物理投递；A 独占活动 sequence/completion/seen，不能让一次新摘要再次触发原完整答案执行。

## 跨票依赖：正向 prompt 归 T08，非 T06 假确认

**已证事实：**当前 NativeConnection/NativeInputOptions 没有 foreground 查询/claim guard（shared/native/host.ts:70–96、input.ts:55–63）。同一 helper 的 Unix MasterPty 已有 process_group_leader/as_raw_fd，portable-pty 0.9 实现确为 tcgetpgrp；job.rs 已有 SID/TTY/birth 观察，但当前是内部 cleanup 观察，尚未输出 prompt 凭证。仅 Node 读一个 spawned.pid 的 /proc 不能补原 helper 捕获的 PTY/寿命身份。

**最小建议：**T06 C 只产实际 hook/activity/source 和失效，foreground unknown。T08 由现有业务 owner 做 target/activity 仲裁，由同一 native/Node owner 给 captured generation/SID/runtime/programEpoch 的有界前台观察：从实际 PTY master 取 foreground group，核同一 OS session/TTY、成员 birth 与已验证的程序/启动包装身份；歧义、不可读、缺身份、多个候选全部 unknown。优先交付明确可识别的 Linux 受管 Agent 路径，再覆盖 Shell 手动启动的已证来源；不能只看 basename/后代存在，也不能假定六家相同能力。

UI 的 finite freshness 只表示最近观察。T08 输入进入实际 writer claim 前（包括 FIFO 等待之后）必须重新观察同一 group/身份/binding/blocking 门；换组/换实例/失效/过期在零 PTY 字节时准确拒绝，已部分写入后为 unknown 且不重发。A 仍唯一核对 hook/source/blocking 门，并在来源变化时取消捕获的尚未 claim 输入；native claim 只证明它重新核对的 OS 身份，不能伪造 A 的权限事实或保证跨进程取消原子。跨非阻塞续写再次检查可限制旧凭据继续使用。查询 OS 状态与写 PTY **不是原子操作**，不能保证检查后一瞬间永不切前台、不能把 written 当 Agent 消费/执行；若要求强原子接收者确认，还需另经验证的 Provider 协作通道，当前没有此公共能力。

Root 已确认必须落入 T08 的依赖：**至少 Linux 生产真实正向 prompt（准确目标、queue/written，不只 mock accepts）及变组/换实例负例**；另有旧证据/blocked/迟到来源/部分写入不重放。不得以全部 unknown 拒绝冒充 AC013。macOS 可复用 Unix tcgetpgrp 与现有 bsdinfo 身份路径，但需编译/夹具和用户实机核验；Windows 固定 Herdr 的 descendants/runtime-marker/Git Bash 路线是启发式，GetConsoleProcessList 也不是前台输入 owner，现阶段应明确 unknown/unavailable，不能将 Linux 通过写成 Windows 通过。Windows 正向能力须在 T08 交付边界另列实际已验证路径/限制，不能无证据声称全平台同等能力。

未来精确补集（Root 准入后才可写）：

- T06 C：`platform/desktop/hooks/{automation-hooks,native-extensions,event-payload,spool-guard,system-hooks}.ts`；现有精确测试 `hooks/{automation-hooks,native-extensions,event-payload,system-hooks,remove-status-hooks}.test.ts`；`platform/desktop/agents/accounts.ts`/`accounts.test.ts` 的纯根提取。上述 hooks 测试路径同在 `platform/desktop/`，完整前缀均为 `src/modules/agent/`。`hook-entries.ts`、`settings-write.ts` 与检测 probe/resolver 只读复用，暂无必须改写理由，不为安装状态新增假能力字段。A 接 `core/workspace/managed-runtime.ts`、`services/terminal/{session,sessions}.ts` 和 `services/controller.ts` 的同一生产链及活动测试；不新增 manager。
- T08 native/Node 最小候选：`native/pty-server/src/{job,session,main,frame}.rs` 与 `native/pty-server/tests/stdio.rs` 的确定性协议/真 PTY用例；`src/shared/native/{host,input}.ts`，拟新增纯 `foreground.ts`/`foreground.test.ts`；`src/host/desktop/native/{helper,helper-stream.test,host,host.test}.ts`；拟新增共同 `test/fixtures/native/terminal-foreground-v1.json`。现 kind1 可承载，`frames.ts` 无已知必须修改。A 原 Session/TerminalSessions/Controller 与 T08 现有输入仲裁路径需消费该一次性 guard；不在本报告发明文件或冻结 wire 字段/阈值。

固定研究复用：Herdr commit `2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01` 的 Apache-2.0 源只比较设计，没有复制代码；Linux foreground 与 prompt 检查见本次 observation 的 agents/platform 精确范围，Windows 降级未改名成证明。依赖 tcgetpgrp 事实来自当前 portable-pty 源。官方事实沿 Root 已核的 [Linux /proc](https://www.kernel.org/doc/html/v6.15/filesystems/proc.html) 与 [GetConsoleProcessList](https://learn.microsoft.com/en-us/windows/console/getconsoleprocesslist)，本轮没有新增联网研究。未认证任何当前 Provider 版本/六家完整能力或五平台 E2E，真实宿主/Provider 验收仍由用户承担。

READ-ONLY SOURCE STOPPED。只写本报告与配套 observation；未更改仓库、正式工件、Git、依赖、产物、target 或任何 helper 副本。
