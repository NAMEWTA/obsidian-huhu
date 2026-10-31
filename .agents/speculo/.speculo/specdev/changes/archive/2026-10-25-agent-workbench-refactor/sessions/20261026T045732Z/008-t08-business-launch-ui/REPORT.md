# 任务回报

Session: 20261026T045732Z  
Task: 008-t08-business-launch-ui  
Status: completed

## 聚焦交接

已完成 A32 中的四项业务命令、最终启动环境资格接线、原 editor/source join、控制工具与页面接线，并已明确向 Root 声明 A32 全部 SOURCE STOPPED。GUI 与 CLI 使用同一 ControlCommands/TerminalSession 业务路径；普通提交只调用原 NativeEditorBinding.submit，保留 adapter-applied/pty-written 的区别、原目标与首份可信回执。当前最终共同候选已通过真实官方 Pi main 的中文多行正常提交、working steer、完整原生回答、login/settings 选择器零输入拒绝及原生退出；控制工具和真实 new AgentController 的定向回归通过。下一步由 Root 生成根样式/插件产物，在停写候选上执行最终 Chrome（含真实浏览器 200% 缩放）、全局检查与独立审查；本报告不把这些待验项目记为通过。

## 产物与验证

### 输入与写集

- TASK 原件 SHA256：`4bac8521181d2aeca41bef6423ad524c93df39e359e8550524c0b77efc6f6b43`；A32 输入 SHA256：`fd61e3686a0bc16aefce49464cd5b0984768911d859fc11c4a4fdd4b0511e06e`。本次沿原 Sol/xhigh 身份实施，未派子 Agent、未操作 Git index、未提交/推送/发布/归档。
- A32 最终 25 路径变化、7 路径不变；完整 32 路径 before/after SHA、原字节 CAS、模式和精确 unified diff 见 `/tmp/huhu-t08-a-stage2-20261026T070746Z/a32-stopped.json`（SHA `681497944a255b2dc86004beac0fd91497511f12bb53510c1c3ad0bc29a20839`）、`a32-stopped.patch`（SHA `e30fbaaf502c1a2941f1e9d5fa727d18e095f837fd9e7e4beb7e7a5029e9466e`）。早期 `a32-final*.json` 是保留的阶段记录，最终以 stopped 清单为准。
- 不变路径为 core/control/context.ts、core/control/terminal-coordination.ts、pi-artifact-profiles.json、launcher.ts、launcher-space.test.ts、keyboard.ts、keyboard.test.ts，均在最终清单中逐项核对。本次没有为凑齐写集重写已接受的 raw/等待/键盘原语。profile JSON 仍为 `3924981f8ce59d0776c258dba19d7755986b4ad155cc63477111bb4a922f3eb3`；verifier 仅在原已核 launch 分支附带冻结 piArgs，供 Sessions 精确移除 Node entry。
- 实际使用了阻塞事实澄清 `evidence/T-08-blocking-observation-decision.md`。Root 的 sessions-cancellation.test.ts 单行 alias 修正是 Root 唯一写入，不在 A32；其最终 SHA `cb518cc481489a5d044c14fc77776d565f9b57ed480ab6b6dc816e893378c451` 已另存 CAS，A 未修改该文件。
- B/C 在本阶段并行演进，未把它们从阶段起点起声称为全文件冻结。最终 42 条工作依赖实源清单为 `source-stopped.json`（SHA `d106a27e04c6a4a8c20aec698b525b126082a4f17b2d5dd2b1b7a34c7b18e653`）；最终官方组合自身有完整静态编译闭包、输出 chunk 与工具/binary SHA，见下文。003/005、旧 TASK/REPORT 与正式 evidence 均未改写。

### 实际 API 与消费位置

- `captureControlExecutionContext(signal, timeoutMs)` 在 Router/native call capture 和 Controller.terminalControl 的首次同步栈捕获原 signal、单调 deadline。`observeControlPreparation(context, work)` 有限结束 scope/ensureControl/preflight 的逻辑观察；fulfilled 微任务也重查 deadline，不依赖 timer 一定先执行。原端口继续持有未完成物理 I/O，没有声称能强行取消任意 OS 文件调用；迟到完成不会继续输入。
- `captureTerminalCoordination` 在输入前预检完整 32768B 请求及 progress/final envelope，预留原 32 观察额度、捕获 tuple/N/初始 working，确认正确输入凭据后才 activate。独立 agent.wait 的 effect 始终 none；提交确认后的 timeout/cancel/source loss 保留 completed、receipt 和原 target。finished unknown 不伪造 settled；queued 取消只有原 owner 证明零执行才 none。
- ControlCommands 的 prompt/wait/send-text/send-keys 已有真实 handler，mutation 来自 descriptor.readOnly。ControlRouter 保留第一份正确 kind、非零 u32 op、同 target 的可信回执；冲突后续 progress/final 不能替换它，错误/容量路径也不降级已知 completed。错误类型、零 op、缺失凭据不会被转发成 completed。
- TerminalSession.bindEditor 只接受原 SID/runtime handle，ready/closed 生命周期不可换代。getEditorReadiness 严格 join 实际 sources 的 registration.sourceInstance/bindingId/programEpoch；双向到达未齐备时 not-ready，多源/换源/失效/活动 unknown/已知 blocked 均拒绝。已关闭 handle 的迟到 ready 不可复活。blocking unknown 只允许已核同源 Pi 路径进入 B 的最终同步 gate，未改成 clear 或 inputReady。
- Sessions.create 先汇总 hooks/control/env，使用原 helper generation.spawnEnvironment 的真实 snapshot；对冻结 file/args/cwd/env 运行原完整 profile 与 B 的 installedPiEditorExtension/piEditorArgumentsSupported，然后重查 signal、Space 授权、原 managed runtime、原 lease/helper/route。只有实际 editorTransactions 能力和资格均满足才附 editor；资格不满足保留原启动参数与人工启动，不追加 -ne/-e、不替用户禁用扩展。
- Controller.terminalControl 经真实 getControlScope→ensureControl→invokeLocal；目标/params/继续等待基线先冻结，取消不续期。真实 new AgentController 用例覆盖上述装配及原 show→attachManaged，没有为 fixture 新增生产 API。
- TerminalControlPanel 默认当前 Space、明确选择稳定目标，可显式同 Vault 全 Space；同名目标显示 Space/Provider/ID，切焦点不改目标。runtime/source 换代使工具失效并中止当前观察；继续等保留原 tuple/N，读屏不清掉它也不重发正文。raw 模式需明确选择、文本不加 Enter；定位走原 show，停止走原 confirm/terminal.stop。宽屏 312px、窄容器项目 Dialog 单实例、hide/unmount 观察清理与焦点约束接线齐备；所有新增 UI 字符串有 en/zh。

### 命令与红绿证据

统一证据根为 `/tmp/huhu-t08-a-stage2-20261026T070746Z`。`commands-stopped.json`（SHA `2c877cb01e474e3470d32a975900076661933f9c3997dce5113c6e6881d0db11`）收录 103 条实际验证/格式命令的 argv/cwd/UTC/exit、raw log、每次前后 42 源 SHA/CAS。Node 固定 `/home/wta/.volta/tools/image/node/26.11.1/bin/node`，pnpm 固定 Corepack JS；测试 TMPDIR 为本证据根下 tmp。正式官方检查显式设置 HUHU_PI_ARTIFACT_TEST_ROOT；真实组合另显式设置两个 immutable binary，未按 PATH 猜测。

| 最终检查 | 证据子目录 | 实际结果 |
| --- | --- | --- |
| Commands/Router/coordination/Session/Sessions/真实 Controller/launcher/keyboard/UI/workspace-view/prompt-port/prompt-runner 与相关生命周期 | business-final-r2 | 19 文件、284/284，exit 0；含 Root 修复夹具后的取消 3 项 |
| 官方完整 profile | profile-final-candidate | 33/33，exit 0；本次修改精确 piArgs 后重跑 |
| 隔离定向类型 | types-final-r2 | tsc --noEmit --skipLibCheck，exit 0 |
| 12 个生产 TS/TSX | lint-final-r3 | ESLint --max-warnings 0，exit 0 |
| 实际官方 main + 真 CLI 全业务链 | native-business-final-selectors-r2 | 必需黑盒 1/1，exit 0；无 skip |
| 最终 Chrome 脚本装配与语法 | chrome-final-home-prepare / chrome-final-check | --prepare-only 与 node --check 均 exit 0 |

有效目标红→绿包括：真实参数分支 piArgs、资格附带 editor、同步输入后新活动观察、首回执 op7 被后续 op8 替换、错误/零/缺失回执、closed 后迟到 ready、Controller 未释放 scope 时 abort/deadline 不结束、GUI 隐式首目标/继续等重发/unmount 不取消、GUI 旧源仍 current 时换源未失效。原日志按 ledger 中对应 `*-red`、`*-green*` 子目录保存；`router-microtask-deadline` 另核 timer 尚未执行时也不 admit。

初期失败没有删改或冒称产品红：例如 UI 文本匹配器、Sessions.create 返回 failed Session 而非 reject 的夹具预期、独立 native observer lease 不能监听别的 owner SID、Vitest 对生成 ESM 再变换 function.toString，以及扩展在不同 bundle 中的符号名差异都分别保留原日志。最终 native 组合已去掉临时额外资格 probe，只被动记录原 spawn、helper 原事件并原样转交业务 owner。最初未加 skipLibCheck 的检查同时列出第三方声明错误与当时本次类型错误；后者已修复，最终采用仓库正常构建相同的 skipLibCheck 方式通过。

`profile-final-candidate` 与 Chrome 格式化并行时存在不影响 profile 闭包的脚本源变化；格式化命令自身的源变化也如实列在 ledger，未宣称这些命令期间全 A32 静止。最终 native 完整编译输入对当前源复核无 drift。最终观察原件 `final-observation.json`（SHA `9703dbfdfd8d81a27b340d8def511e4779397f5684cd3afefd2cff5efdd19f80`）记录当时 profile/enrollment 测试目录均为 0，成功组合原 Node/helper PID 均已不存在；不删旧 tmp 证据。

### 官方 CLI 最终共同候选

最终根：`/tmp/huhu-t08-a-stage2-native-Dj5Qu0`。

- `manifest.json` SHA `a05de2df69888d5d1dc91caca9a3e608736bdd94035c2c28e0d04ecba0d67ca7`，含正常 import 的生产完整输入字节 CAS、esbuild metafile、所有 ESM 输出 SHA、测试源和 binary SHA。B 的独立 driver 编译闭包在 `official-driver/build/input-manifest.json`。本次 fixture 函数源来自自己测试文件，经 TS 编译；未摘取或重组任何生产类/方法。
- helper `/tmp/huhu-t08-c-stage2-linux-20261026T080715Z/huhu-pty`，SHA `f99ec633e2201d66ccd67605c65c709d6b25c443ec71978feff897fb27d315ca`；CLI 同目录 huhu，SHA `923ac2d6fbc4f472537c73236040a487b8d991e4226aec81d5ebda488e995eee`。不使用旧四项 unavailable 的中间 bin。
- `production-extension.txt` 74063B，SHA `e3c8a3596159dd92f6a1df9beb886fed5f9839bfe87f892d5a5011fa76affd4a`。它由独立 Node 加载本次实际完整业务 ESM 的 PI_EXTENSION 导出生成；命令原件为 extension-generation-command.json。经 Root/B 批准，B 唯一 installer 用现有 --baseline-extension 参数安装这份本次实际生产 bundle 生成扩展，非旧 baseline/诊断 app；严格 installed 字节比对未放宽。原因是同一生产函数的 toString 在不同 bundle 中会受符号名影响。B 默认直接 Binding 路径未替换。
- A 拥有真实 Host/lease/CLI/业务对象，B 拥有实际 HookSpool、生产扩展安装、隔离配置和 loopback SSE。真实 startup 为 idle、blocking unknown；两次中文多行分别在正常与真实 working 时通过 adapter-applied。只读 wait/read 为 none；raw 文本与单独 Enter 为 pty-written；旧 runtime 在输入前 none 拒绝。
- 随后经真实 CLI raw 命令打开 /login 与 /settings，先被动读到原生选择器 caption，再发 CLI agent.prompt；两个结果均 INPUT_NOT_READY/effect none，T06 blocking 均仍 unknown。原生 focus-changed 的 editor 回执与原屏幕均保存，Escape 恢复后 /quit 正常退出。`business-selector-refusals.json` SHA `362b1bbcc76924f3c34e583ecf15d3b0e1021e8efd8b82d7b582c26441448b43`。
- `business-root-process.json` 记录真实 Node root PID/exe/cmdline/stat，SHA `f27b466d772e50fc78fbb407dbabfd3fcf317d5f59cb891f02f1e58a413a045e`。business-startup.json 严格 join 真 AdapterStart 的 sourceInstance。`business-summary.json` SHA `42dbcf6a072aa0a4b1cdac5edeb82b59964b25a7f761a5aa914d95a324222a67`；B 的 summary.json 最终 failures=[]，actualModelConversation/nativeFullAnswer/businessPath/passed 均 true，独立验证两请求、单 UserPromptSubmit、两份完整原生答案及 AdapterClose。

这是真实官方 CLI main、生产 Host/helper/app 和业务服务，模型服务仅为受控本机 SSE；没有真实 Provider/Obsidian/五平台声明。官方 Pi/Jiti 原件只读复用 `/tmp/huhu-t08-b-producer-proof`，完整 profile/digest 算法沿已接受 003：SHA256(JSON.stringify(['huhu-pi-artifact-v1', pi.fileSetSha256, jiti.fileSetSha256])+'\n')，结果 `0b61d2d5fb74fef2e4c6d7df4f9e3788c7ecd74cb6e82addff1160a4bd2b33a3`。

### Design Conformance 与待验边界

控制工具遵循 DESIGN revision1 / PAGE-001/PAGE-003 的已批 candidate-a。复用右工具位、共享 Button/Input/Textarea/Select/Dialog、语义 token、单实例和原停止确认；activity 枚举已本地化，blocking unknown 保持事实，等待文案不暴露内部水位。compact 控件补 min-width/min-height 44，TabStrip 控制入口也有窄屏 44 规则。文档明确 Linux + 已验证 Pi/Jiti + regular TUI + 原有受支持扩展参数；不支持平台/版本/布局保留人工与明确 raw 路径，未宣称 macOS 可普通原生提交。profile 保守地只允许 Pi 内嵌 node_modules/jiti，普通 npm 布局可能因此不取得资格，已在用户文档说明。

Chrome 使用正常 import 的真实 Page/Panel/Router/Commands/Session/Workspace 与生产 captureForegroundIntent，controller port、Obsidian/native/provider/存储为明确受控边界；另用真实 new AgentController 覆盖正常装配。阶段 `chrome-script-final` 在旧 styles 上真实跑完 9 项交互通过，312px 与 44px 两项几何诚实失败，无 drift；未覆盖或覆盖后的材料均保留，没有用 class 镜像测试伪造几何。

最终脚本 SHA `6e8f32a220621cf89ac6ea6cc6cedd6cdefda3e1fd2d7edaa11fa759af603cc0`，支持完整 CR Enter packet、Tab trap、Esc 返回、亮暗宽窄截图，新增第二个全新隔离 Chrome 的真实 browser zoom 200% 分支。通过 Chromium partition.default_zoom_level.x 初始化页面缩放，记录 Browser.getWindowForTarget bounds、inner/outer、DPR、CSS zoom 和 visual scale，核实际重排后可见/无横向溢出与明确目标的读屏操作，产出 zoom-200-light/dark 图；不把 deviceScaleFactor 当缩放。实际缩放机制原件 `zoom-mechanism-proof.receipt.json`/raw.log 与新 profile 保留；最小页面观测 innerWidth600、DPR2、CSS zoom1（窗口参数1200）。最终页面的 200% 交互和新样式几何尚待 Root 运行，不能从该最小机制证明替代。最终脚本 Chrome HOME/XDG/TMP 另行隔离。

未由 A 执行：Root 根 build/styles/i18n/architecture/budget/notices、最终新样式 Chrome 全矩阵与独立 A/B 整合审查。真实 Obsidian、真实 Provider、OS 前台/IME 与五平台实机链由用户验收；encoder 单测不冒称 OS preedit 可观察。T09 面板协议、T10 邮箱、T11 历史及后继迁移未提前实现。

## 问题与下一步

A 范围无剩余计划写入。Root 已解决并回读取消测试夹具别名缺口，最终 284 项回归通过；其写集/GP/Map 行政增量由 Root 记录，原 TASK 未改。请 Root 以 stopped 源清单生成产物、运行最终 Chrome/全局检查并整合审查；若发现新问题，保留本次报告和证据，通过新授权续派处理。

SOURCE STOPPED
