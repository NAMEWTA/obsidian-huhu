# 任务回报

Session: 20261026T045732Z  
Task: 006-t08-host-pi-editor  
Status: completed

## 聚焦交接

B15 已完成 Host/helper 的真实 editor 事务与捕获环境端口、Pi 认证应用 gate、有限安装/参数预检，以及可重建官方完整 CLI main 的受控流式验证脚本。最终生产源保持只写 B15；实际改动 11 条，另外 4 条保持原件并纳入定向回归，没有改 shared/C/A、依赖、第三方包、main.js 或正式 Ticket 状态。最终同源 native 双 bin 下，官方原默认 regular editor 的正常中文多行与 working steer 都经过真实 Host→helper→native→app→原 editor/AgentSession，完整回答仍由生产 Hook/原生 transcript 返回；真实用户 Obsidian、Provider 和五平台仍未验。A 已消费两个冻结出口，业务模块测试接缝亦已落地，A 的最终业务生产 bundle 原件安装组合由 A 独立持有并回报。此 REPORT 后 B 产品与夹具停止修改，下一步由 Root 回读本候选并安排独立审查/全局检查。

## 产物与验证

所有本轮原命令、cwd、UTC、退出码、stdout/stderr 原文和每次 B15/harness 前后 SHA 均在 `/tmp/huhu-t08-b-stage2-20261026T065140Z`（下称 R）。`commands/<label>.receipt.json` 给 argv/原始日志及 SHA；同名前后 JSON 指向去重 CAS。`meta.json` 保存初始 15 条及原快照，`B15-final.diff` 是相对该真实初始快照的完整差异，不以 HEAD 的混合工作区差异冒充本轮写集。59 条命令全部保留，失败、诊断、timeout 没有覆盖。

- Task SHA：`719e12eb586e55a39c55298423bad88471cf8c9ee157202aae18332115cb8313`；stage2 输入 SHA：`592f39ae5e435e4d090e0b2ebdccb2733bfde6b1977ce29ec588dabcc2a01ed3`。
- 基线 HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`，branch `NAMEWTA/terminal`，原共享工作区既有 dirty 保留；无提交/推送/发布/归档。
- `final-audit.json` SHA `a89461008a2a4b6b91fccc31453bdfae8607b299f19f76b0cd14b9a0b835df96`，实际核验 58 条前序命令原件、2118 条前后快照项、13 份完整 compiled-run 输入闭包，errors=[]。059 是该审计自身的第 59 条命令，其独立 receipt 另保留，避免自引用伪造。
- 审计记录 49 个本轮 driver/helper/Pi PID 均不存在，17 个记录的 loopback 端口均不再监听，并扫描 /proc 未发现 HOME 在本轮隔离根内的剩余进程；原报告、红灯、旧证据未删除。
- 官方原件 Pi 1279 文件/23419059 字节与 Jiti 16 文件/1751293 字节逐路径/长度/SHA 对旧实际 vendor-before 清单全等，未写第三方。058 初次审计按数组排序误报；逐路径核对确认 0 added/removed/changed，059 改为路径映射比较通过，保留 058 原错误。

### 冻结 API 与实际机制

`automation-hooks.ts` 的两个实际出口不再改签名：

```ts
piEditorArgumentsSupported(args: readonly string[], extension: string, cwd: string): boolean;
installedPiEditorExtension(
  frozenEnv: Readonly<Record<string, string>>,
  options: Readonly<{ signal?: AbortSignal; deadline: number }>,
): Promise<string | undefined>;
```

`args` 是排除 Node/CLI entry 后的 Pi 参数。有限 parser 与 app 共用同一 `piEditorArgumentGate`，消费官方已核选项值，精确处理作为值的 -ne/-e、-- 边界、重复/额外扩展、cwd/安装物理规范路径；未知组合与显式 fullscreen 返回 false，不添加用户 flags。安装读取只用 Host 同次捕获并合并后的 frozenEnv，既有文件的有限大小、期限/取消检查、逐祖先 symlink 检查、NOFOLLOW/NONBLOCK、lstat/open/fstat/dev/ino 和读后身份、当前 bundle 生成 PI_EXTENSION 完整字节相等；不安装、不读取后来 process.env、不泄漏环境。Root 的先行小接口审计 SHA `ff1db6a0dc18dd93cf1f68bc233319aa3ca8eb3eff2123861f5fbe2f74d0c951`。

Host 只对原 lease/generation/SID/runtime enrollment 返回捕获 handle，spawn 写前已登记，早 ready/closed 按原 owner 路由。同步 close 撤准入，numeric exit/release/失联不重新查找新 owner；foreign SID 抛原 owner 错误。helper 仅按 hello 实际返回能力广告 editorTransactions；请求 capability 不等于获准。原 helper spawn env 保存冻结快照并委托 C 的 snapshotSpawnEnvironment，不引入平行 DTO。

editor metadata 严格消费 C codec/direction/descriptor，body 复用原 kind4，每段完整 helper wire 是 17+payload 字节（descriptor 13 不含前置 length 4），app part 完整 header 9 字节。raw/editor 共享原 session/helper 次数及字节额度，复制/编码前取额；lifecycle/receipt 各自有限 permit，逐帧 callback+drain 与 native editor-settled 双重完成后才归还。finished timeout/unknown 不偿还物理占用、不重放。native 从未创建 binding 的 failed-none 请求，只有原最终 reply/termination/output fence 全过且从无 editorId 时才能收束本地 pending ready/closed；已出现 ID 仍等原生 editor-closed。

Host 控制兜底保持已可信 completed input receipt 的 kind/op/target，后续 progress/final 不得降级、擦除或换目标；只有 agent.prompt/terminal send 两类可信 input-submitted receipt 才可记住，op 必须 1..u32。纯 readOnly wait 的取消和失败始终 effect none；callback fallback 的 EFFECT_UNKNOWN 在明确 none/completed 情况规范成 CONNECTION_UNAVAILABLE。026/027 与 030/031 是实际目标红绿。

Pi cap 分支惰性导入正式虚拟 SDK，认证与 AdapterStart 共用同一个 nativeSource UUID。只读受保护单运行 app cap，严格 huhu-editor purpose，不读 CLI locator/token，不把 cap secret 放日志或 Hook。直接观察原 widget/TUI/focus，严格同官方执行实例的 `CustomEditor.prototype` 与 `TuiMainScreen.prototype`；不使用类名、duck typing、另载 SDK、SessionProxy、手工 editor、替换 onSubmit/handleInput/session.prompt 来制造正例。完整 body/UTF8、剩余期限、取消、空白也算草稿、overlay/selector/autocomplete/blocking、Enter 真实 keybinding 与更早动作重叠，都在同步 gate 核验后才完整 paste + 一次 Enter；同一无 await 段保留原编辑器行为。app 只保留一笔事务，释放临时 body/string 引用后发 result/settled，当前物理 metadata IO permit 等 callback+drain。

真实 `SessionStart` 的 pi/session_start 才提供 idle 事实；AdapterStart 仍 unknown，T06 blocking unknown 没被伪造 clear。遵从 `evidence/T-08-blocking-observation-decision.md`：A 只把已核同 binding/source Pi 的 blocking unknown 交给本最终同步 gate；activity/source unknown 仍拒绝。036 的真实 login/settings selector 保持该初始 unknown，app 仍零输入 none/focus-changed。

### 官方源码身份和观察边界

`source-locators.json` SHA `c193d7715621accabf609db6dc5990148d34efd213b0b2a9ac8bcbaffb945178` 保存 24 处确切 UTF8 字节范围、行、文件 SHA 与原文。下列 offset 均为文件内 UTF8 字节、零基：

- `chunk-T726RZZU.js` SHA `b09f9387bb838ee733d15a63d1af07876e0932381c2a9b7d42f74f22cd4d2947`，69369（line 6）导出 TuiMainScreen；官方 `virtual-modules-BQKXTZUC.js` SHA `f829c82d856f279e8e930614b2fe2c764127f995f076f3565a8b6c82cd63850d`，1154（line 2）把 @earendil-works/pi-tui 映射到这一 dist_exports 实例。
- `chunk-MM3LKT73.js` SHA `aa4c8b091657bda611f6fd58343561fa44cda1070ae4cd5dbd09ffe1d9a34aab`：2599196 factory、2880498 services/resourceLoader.reload、3527307 main create-services、3530528 create-runtime、3533092 new InteractiveMode。后续 constructor 3214014 创建 TUI，init 3224913 调 ui.start；T726 的 ProcessTerminal.start 331406 才 setEncoding/resume，332577 注册原 stdin data listener。因此 capability 分支的被动 observer 在 factory 同步安装，早于此 main-screen 原 StdinBuffer 的首个输入消费。若已有 data listener 或 readableFlowing，初始 uncertain 直接拒绝，不猜 prior parser clear。
- T726 325520 的 StdinBuffer 在 bracketed paste end 前缓存，不向 SDK onTerminalInput 发出；032 真 CLI 证明旧 SDK-only 观察会误提交。现在用公开 EventEmitter.prependListener 观察 process.stdin data，避开 Readable.on 的启流副作用，不消费/改写输入，回调 catch 后记 unknown 而不抛出阻断原 listener，退出只撤自己的 listener。只留最多 5 字符 marker tail，不读私有 pasteBuffer。
- T726 206946 的 Editor.setText 不清 jumpMode；MM3 2971043 的 CustomEditor 在 super.handleInput 前处理 clipboard 等动作。已知 jump/history/tab/clipboard/external-editor 进入不可证明清除的状态后，本 binding 保持 not-ready；不擅自清草稿、不把它称作权限 blocked。原人工终端仍可操作/退出。
- 公开 stdin data 位于 Node StringDecoder 之后：尚未 emit 的不完整 UTF8 尾和 OS preedit 不可见，不声称已经观察或安全清除。041 只证明完整分片 UTF8 交付后的中文草稿拒绝。首版仅已验 regular 分支；fullscreen 未证明完整 gate。官方异步 right-click paste 还有 Windows/non-vscode 条件，不声称 Linux fullscreen 实际发生过该异步负例。

### 实际正例、负例与生命周期

最终正式 native pair：`/tmp/huhu-t08-c-stage2-linux-20261026T080715Z/huhu-pty` SHA `f99ec633e2201d66ccd67605c65c709d6b25c443ec71978feff897fb27d315ca`，同目录 huhu SHA `923ac2d6fbc4f472537c73236040a487b8d991e4226aec81d5ebda488e995eee`，producer SHA `56585e57c763749a70a07bccc04bc5ed60b63eec2d2adb88f68f6ecc2c15e2aa`。最终 B 正例及负例都直接 Node PTY root，没有 strace wrapper/LD_PRELOAD/NODE_OPTIONS；`driver-launch.json` 记录隔离 whitelist，`root-process.json` 记录实际 /proc/exe/stat/cmdline（Pi 会设置 process.title=pi）。

`official-split-marker-01`（055）是最新完整输入闭包示例：16 份实际 esbuild onLoad 输入均存 CAS，metafile 与捕获集合完全相等，涵盖 Host/helper、C shared/generated/input、A program-identity/profile JSON、HookSpool 等，production.mjs SHA `5d872acb87b4047b76e4a0648b1d9de621aa836f7fd77182fd0c3580e969b29d`；同包还记录 Node/esbuild 工具/helper SHA。033 以后完整 closure 保存于每个 run 的 `build/input-manifest.json`/`metafile.json`，不拿当前源追补旧 025 的先前缺口。

055 同一运行先送真实人工分片 ESC[20，再补 0~human-paste-buffer；两个认证请求分别 none/not-ready。每次 raw 写完后对原 TTY 只读 FIONREAD 等 0，原文件保留 observation；不把 PTY write 充当 app 消费证据。补全 paste end、原人工 Backspace 清完该已知 fixture 草稿后，认证 normal 正文 `你好，正常输入\n第二行保留中文` 完整提交，随后首 SSE 在 `09:01:55.402Z` 开流；working 请求正文 `正在工作时的新输入\n仍走原生 steer` 于同刻开始提交，`09:01:55.436Z` 取得 adapter-applied+settled 后才解除首 SSE barrier。真实模型服务恰好两请求，第二个原会话请求包含两份逐字中文多行 user 文本；生产 Hook 恰好单 agent_start/UserPromptSubmit。原 transcript 包含两份完整 assistant 回答，Stop.last_assistant_message 等于完整第二份回答。`/quit` 在 `09:01:55.728Z` exit0，旧 handle 随即 none/closed。原 requests/responses/hooks/submissions/PTY/registration/native-exit 全部独立保存。这些分别证明完整官方 main/default editor、真实工作中 AgentSession steer 和原完整回答通道，受控 loopback 不是真实 Provider/Obsidian 验收。

| 命令/目录 | 实际验证 |
| --- | --- |
| 032 → 033 / official-partial-01-red → official-partial-02-green | 真实 partial paste 目标红：旧 gate 实际 adapter-applied 并触发 HTTP；修复后 none/not-ready、零 agent_start/HTTP，随后原正例全绿。红 run 失败 finally 的 Killed 清理不冒充正常退出。 |
| 034 → 035 / host-editor.integration.test.ts | 最终 native bin 下 entry inode 被替换，前置 spawn-none 最终 reply fence 后旧代码留下幽灵 handle；修复后 ready 拒绝、closed/close 收束且 enrollment 删除。 |
| 036 / official-gates-01 | blank/control/trailing-backslash、严格空白草稿、真正 /login 的 Select authentication method 和 /settings 原生 selector，均零输入；Escape 恢复后两请求及 quit0。 |
| 040 / official-overlap-01 | 隔离 keybindings.json 把 clipboard 动作绑 Enter；app none/unsupported、零模型请求，原 CtrlD 正常 exit0。 |
| 041 / official-split-utf8-01 | 原 raw 0xe4 后 0xb8 0xad 完整组成中文草稿，gate draft-present；删除该 fixture 字符后原两请求及 quit0。未在未 emit 中间态冒充观察。 |
| 042/043/049 / official-jump/history/tab-01 | 真正原人工 key 触发后 app not-ready，原 CtrlC/CtrlD 路径 exit0；不猜私有状态已经清除。 |
| 047/048 / official-clipboard/external-01 | 原 clipboard/external key 走真实异步公开工具路径；隔离假 termux-clipboard-get/EDITOR 用本轮文件 barrier 控制，pending 时零输入，返回后仍 not-ready，原 CtrlD0。无 DISPLAY/WAYLAND；官方 Linux getNativeClipboard 需 DISPLAY，未加载真实系统 clipboard helper。 |
| 050 / official-receipt-pressure-01 | app 完整接收 256KiB 无效 body；256KiB+1 在 Node 前置拒绝；连续 64 个真实 app none receipt/settled 再接正常/steer。逐次 helper editorOperations/operationBytes 归零，未复现所提示的 app-settled 可见与 callback/drain 间相位重叠，不据猜测改 current 清槽。 |
| 054 / official-reload-01 | 真 /reload 撤旧 app 连接，旧 binding closed/not active，旧 handle none/closed，不自动再认证，人工 quit0。 |
| 046 / real Host/helper + controlled app | 错 purpose 与 control-auth role 外部 peer 被 native 拒绝，随后正确同 source UUID 认证；真实已 queued 事务 cancel 在首 op 过期前得到 none/cancelled、body 未交 app。dispatch timeout 的首 op finished unknown、物理占用保留，迟到真实 app result+settled 才归还，finished 仍 unknown。期间 reply lane、另一 SID 输出 ACK、Cookie 查询失败响应、stop+最终 reply fence 活跃。此 controlled app 仅证明 native/Host 生命周期，不拿它证明 Pi SDK gate。 |
| 039 / helper-editor.test.ts | fake external stdio 只隔离 IO：两个 256KiB editor body 占满 session 512KiB，raw/editor 共同拒绝溢出；timeout 后额度不归还，迟到 native result+settled 才释放。017/018 原取消红绿另证明迟到 reserved 不再编码 body。 |

025 的早阶段完整官方正例保留在 official-attempt-04-production，使用旧 intermediate bin `806324…`，只能按 Root 已接受阶段事实引用。022 ready 旧路径超时、023/024 官方 SDK namespace 诊断全部保留：TUI undefined 是真实发现，改为同一 official virtual TuiMainScreen 严格身份才得到 025，不扩大原型支持。没有将旧004 strace/LD_PRELOAD 或 SessionProxy 研究当本正式通道通过。

### A 的实际业务模块接缝

脚本默认直连 binding 仍保留；显式 `--business-module /absolute/local.mjs` 仅本次有限本地 fixture。B 仍拥有生产扩展安装、loopback SSE、配置和 HookSpool，并独立核两份真实模型请求、完整原生回答与 close；A run(ctx) 持有真正 Host/lease/Sessions/Router/Commands/CLI 资源且 finally 清理，可注册 fallback cleanup。上下文只给 root/repo/artifact/helperBinary/可选 cliBinary、实际生产 api、冻结原 file/argv/cwd/env launchHint、两份 fixture 正文、实际 onHook、stream barrier、有限 cleanup 注册。模块返回值不参与通过判定，不能替换 app/安全提交或注入结果。

A 已报告并可回读 `/tmp/huhu-t08-a-stage2-native-Obnh5R` 的 native-business-final：manifest SHA `ce3312b1d5488036c28ada05b150338fa8e242d214bdefd28231053d76eab7de`，同实际业务 bundle 生产导出扩展 production-extension.txt SHA `e3c8a3596159dd92f6a1df9beb886fed5f9839bfe87f892d5a5011fa76affd4a`，official-driver/summary.json 为 passed/failures[]。A 本轮实际 command/完整静态 closure 在其目录，此处作为外部 owner 证据引用，不计入 B59 命令。不同 bundle 对共用 gate 的 toString 局部变量重命名会导致字节差异；installed 严格拒绝是正确行为。Root 已同意用现 --baseline-extension 安装这个同实际业务 bundle 的生产原件，安装与验证来源保持一致，未放宽内容匹配、另写 app 或用旧诊断扩展。后续 A settings/login/focus 业务负例由 A 继续，B 不写其路径。

### 统一检查与全部原命令索引

051：10 文件/131 项定向 Vitest 全绿，真实同源双 bin 的两个 Host/helper integration 文件也在内。053：四份生产 TS 定向 ESLint --max-warnings 0，exit0。056：完整 B15 TS 依赖范围的隔离 tsc --noEmit --skipLibCheck，exit0（同仓库 build 已有参数）；057：node --check verifier，exit0。052 未传既有 skipLibCheck 仅报外部 Obsidian .d.ts HistoryHandler 接口错误；原件保留，不称 B 源通过。旧失败 Corepack/pnpm wrapper exit126 的 raw 仍确实执行对应 Vitest/ESLint 断言，不改写成工具没跑。根 build/全局 lint/test 由 Root 在 writer 停止后执行。

每条命令实际 argv/cwd/env/UTC/exit/raw 见 R/commands 对应 receipt；下表不省略失败：

| label | exit | timeout |
| --- | --- | --- |
| 001-enrollment-preflight-red | 126 | 无 |
| 002-enrollment-preflight-green | 0 | 无 |
| 003-preflight-regression-green | 0 | 无 |
| 004-preflight-production-lint | 126 | 无 |
| 005-preflight-production-lint-green | 0 | 无 |
| 006-helper-environment-red | 126 | 无 |
| 007-helper-environment-green | 0 | 无 |
| 008-host-environment-red | 126 | 无 |
| 009-host-environment-green | 0 | 无 |
| 010-installation-budget-red | 126 | 无 |
| 011-installation-budget-green | 0 | 无 |
| 012-small-interfaces-lint | 0 | 无 |
| 013-editor-transport-red | 126 | 无 |
| 014-editor-transport-green | 0 | 无 |
| 015-current-scoped-types | 126 | 无 |
| 016-types-with-project-declarations | 126 | 无 |
| 017-cancel-late-reservation-red | 126 | 无 |
| 018-cancel-late-reservation-green | 0 | 无 |
| 019-inert-hook-and-parser-regression | 0 | 无 |
| 020-current-types | 0 | 无 |
| 021-current-production-lint | 126 | 无 |
| 022-official-main-authenticated-editor | -15 | timeout |
| 023-adapter-initialization-diagnostic | 1 | 无 |
| 024-sdk-namespace-observation | 1 | 无 |
| 025-official-editor-regular-sdk | 0 | 无 |
| 026-host-completed-receipt-red | 126 | 无 |
| 027-host-completed-receipt-green | 0 | 无 |
| 028-native-session-start-idle-red | 126 | 无 |
| 029-native-session-start-idle-green | 0 | 无 |
| 030-readonly-wait-cancellation-red | 126 | 无 |
| 031-readonly-wait-cancellation-green | 0 | 无 |
| 032-partial-paste-real-red | 1 | 无 |
| 033-partial-paste-real-green | 0 | 无 |
| 034-native-pre-enrollment-red | 126 | 无 |
| 035-native-pre-enrollment-green | 0 | 无 |
| 036-real-official-gates | 0 | 无 |
| 037-real-host-editor-liveness | 126 | 无 |
| 038-real-host-editor-liveness-corrected | 0 | 无 |
| 039-helper-budget-lifetime | 0 | 无 |
| 040-real-overlapping-keybinding | 0 | 无 |
| 041-real-split-utf8 | 0 | 无 |
| 042-real-jump-state | 0 | 无 |
| 043-real-history-state | 0 | 无 |
| 044-official-source-locators | 0 | 无 |
| 045-real-native-auth-queued-cancel | 126 | 无 |
| 046-real-native-auth-queued-cancel-before-expiry | 0 | 无 |
| 047-real-async-clipboard | 0 | 无 |
| 048-real-async-external | 0 | 无 |
| 049-real-tab-state | 0 | 无 |
| 050-real-app-body-receipt-pressure | 0 | 无 |
| 051-b15-targeted-regression | 0 | 无 |
| 052-b15-types | 126 | 无 |
| 053-b15-production-eslint | 0 | 无 |
| 054-real-reload-revocation | 0 | 无 |
| 055-real-split-paste-marker | 0 | 无 |
| 056-b15-types-build-options | 0 | 无 |
| 057-verifier-syntax | 0 | 无 |
| 058-final-evidence-audit | 1 | 无 |
| 059-final-evidence-audit-order-corrected | 0 | 无 |

### B15 精确前后

完整绝对路径、大小、初始/最终 CAS 在 meta.json、final-audit.json。仅下列 15 路径是 B 产品写集；Root 与 A/C 的共享工作区其他变更不归 B：

| 路径 | 本轮状态 | before SHA256 | after SHA256 |
| --- | --- | --- | --- |
| `src/host/desktop/native/host.ts` | 修改 | `96cd8255ce6dcfbb046750d41a9746a646559d72c4737c27a625a53ce9530b36` | `82338f7b1c909a6854562398f15c7cfe859f5ad8767ff36dc4d334706a7e5b9b` |
| `src/host/desktop/native/helper.ts` | 修改 | `f1c4f034bf567b936c1642e3fb4b7054e50f81491c413a2f65ced85a552eb107` | `08e33ff99d94f6b7e41438ce297c536b0ec2a3fb861a9ea469d0a54d81a2edd8` |
| `src/host/desktop/native/host.test.ts` | 修改 | `e0f792e962d4ae4c61eb9f1920af354c5779477ace3c14972cf07e1d0323adc5` | `e830331ac13858af44baa77c6f1359cdfd07ba3b1d727c89a0577da9449d96b0` |
| `src/host/desktop/native/helper-stream.test.ts` | 未改，已回归 | `e4567c686d0b1ed8bc118c4c04454bfa6f2a0d2b56251f981b451bb3e77feb59` | `e4567c686d0b1ed8bc118c4c04454bfa6f2a0d2b56251f981b451bb3e77feb59` |
| `src/host/desktop/native/helper-control.test.ts` | 修改 | `729defa1b85eefc1dfa0b143c3d7b9ee020e2cd62fd33cbd2aa39d17c8cdad01` | `b63f6966704ebcfa5b7c0fc369bbb99b72ab88b29e9a34fb8357653f5c9e5ab6` |
| `src/host/desktop/native/host-control.test.ts` | 修改 | `1b9000aa60bb19646524c6040c0a6e619417d2a5120703476f717e5552ff003d` | `f21450e2f2540d14fb978c8023403ccd60e5a0950e37e2aa86899512e175d321` |
| `src/host/desktop/native/host-control.integration.test.ts` | 未改，已回归 | `0b934ce860fe0eba90ce606dfe404a9cfd99ede7e42f73d8f7faf7d5313849cc` | `0b934ce860fe0eba90ce606dfe404a9cfd99ede7e42f73d8f7faf7d5313849cc` |
| `src/host/desktop/native/helper-editor.test.ts` | 修改 | `missing` | `cf0f59619b5e1c34a8369f9458d3fe1d3c0a7e464d7dd5c88c9a5afece842a50` |
| `src/host/desktop/native/host-editor.integration.test.ts` | 修改 | `missing` | `d9c94777f1ae97a83f4a0ec4c0bc5fae46971036299030b1c4b6b97b58701ad5` |
| `src/shared/native/lazy-host.test.ts` | 未改，已回归 | `d40a9be14c351d4ea19cedb8fa1926c3a82cb2eade1d32f7638962d36a01f990` | `d40a9be14c351d4ea19cedb8fa1926c3a82cb2eade1d32f7638962d36a01f990` |
| `src/modules/agent/platform/desktop/hooks/native-extensions.ts` | 修改 | `ea204539ccd9f450c596e04039ee379e79e58a979aacd754534610ce91d08b8b` | `6e9ae14942323f0d0586e482c0de6fbfa76d7d6a69b8d9fc0a0e8fc377b19def` |
| `src/modules/agent/platform/desktop/hooks/native-extensions.test.ts` | 未改，已回归 | `54d1e3b76fb59938ffa6bff5f5b6855c72f83bf4ac55f76cefa8a3121b44e18e` | `54d1e3b76fb59938ffa6bff5f5b6855c72f83bf4ac55f76cefa8a3121b44e18e` |
| `src/modules/agent/platform/desktop/hooks/automation-hooks.ts` | 修改 | `f1687e9992843acbb2ed28e6c20634ea51e0d60a68a5a1a636f1a60591cfb804` | `0458559c14dcc13f9fea2f806089db49e824b6e9094e2e0451be7d9da3e1618e` |
| `src/modules/agent/platform/desktop/hooks/automation-hooks.test.ts` | 修改 | `bdfa4a53f210d391d2dc7cbd57c55e43f88c6b13ff9312083401377aa4c3b849` | `3f6fd3de5fa5b42ceb1af4f53d0dd57b0260c0c5eb5a277c5dd287331714e06d` |
| `scripts/verify-pi-editor.mjs` | 修改 | `missing` | `7247d6f3761a7ce777ac1257ec959bd340593fc2ae8ac4a3420f1d2f92755f65` |

## 问题与下一步

B 分配内无剩余实现或必需定向检查。仅支持已核官方 Pi 1.4.0/Jiti 2.7.0、显式无其他扩展且唯一 HUHU 扩展、运行时同实例原默认 regular editor；fullscreen、未知 flags、非 Linux/未协商 transport、非原焦点、已知不可证明清除的输入状态明确拒绝并保留人工路径。未交付到公开 stdin 的 OS preedit/Node decoder 尾不可见，未冒称已验；真实 Provider/Obsidian/五平台仍由用户执行。最终 T-08 全链/业务/UI、独立审查、根构建和正式 Ticket 状态由 Root/A 合并验收，本 completed 仅为候选交回。

SOURCE STOPPED — B15 产品与本轮运行夹具停止修改，等待 Root 回读；不自动开始下一任务。
