---
schema_version: 2
session: "20261026T045732Z"
task: "008-t08-business-launch-ui"
kind: "implementation"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-08"
---

## Goal

Lead codex:/root；沿原003/005实施身份与用户指定 gpt-6.1-sol/xhigh，负责 T08 A32 的业务命令、启动接线、控制工具与定向验证。已授权全部18票 Agent Team 和代码验收，真实 Obsidian/Provider/五平台 E2E 由用户进行。不再派子Agent，不提交、推送、发布、归档，不操作真实库/账号。交付是 T08 候选，正式票状态仅由 Root 验收后推进。

## Inputs

唯一项目根 `/home/wta/orca/workspaces/obsidian-huhu/terminal`；change `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor`。按 workspace/catalog → Map 背景与 Skill 矩阵 → dev/ui 及适用 architecture/testing/settings-and-i18n/licensing/a11y → T08 → Goal §4，执行实际 SpecDev I procedure/preflight、TDD 与 coordination；已读且未变规则复用，不递归通读。GP026 / Map27，HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`，branch `NAMEWTA/terminal`。T01–07 done，T08 in_progress。

外部合同为 spec §3.4/3.5/11、implementation-contracts、T08；工程决定为 evidence/T-08-engineering-packet.md、T-08-editor-transaction-decision.md、T-08-launch-identity-environment-decision.md、T-08-progress-receipt-decision.md。DESIGN revision1 / digest `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab`，PAGE-001/PAGE-003，已批准 candidate-a，不修改原型来迁就实现。

001 已交的纯等待/raw primitives 及 Root 接受范围见 sessions/20261026T045732Z/001-t08-business-stage1/REPORT.md。003/005 是你自己的 profile 与临时安装清理；依 evidence/T-08-profile-root-audit.json、T-08-profile-cleanup-root-audit.json 读取实际最终API，不覆盖旧命令/证据。001只证明 PTY-written；prompt 的 adapter-applied 必须独立表示，不强转成 PTY-written。

002 实际共享端口已接受，见 evidence/T-08-stage2-input.json（SHA `592f39ae5e435e4d090e0b2ebdccb2733bfde6b1977ce29ec588dabcc2a01ed3`）、T-08-c-stage1-root-audit.json、`/tmp/huhu-t08-c-stage1-api.md`；实际 shared/input.ts、shared/host.ts、control-wire.ts/generated.ts 是字段权威。C007 正在实现原生，B006 正在实现 Host/helper/app；共享签名已经冻结，需改时先报 Root，不复制另一套 DTO。

本次实际 A32 冻结输入为 `/home/wta/orca/workspaces/obsidian-huhu/terminal/.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-08-a-stage2-input.json`，SHA `fd61e3686a0bc16aefce49464cd5b0984768911d859fc11c4a4fdd4b0511e06e`；全部A路径仍与Root前次停止点一致。B006小出口已回读并接受，`/home/wta/orca/workspaces/obsidian-huhu/terminal/.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-08-b-small-api-root-audit.json` SHA `ff1db6a0dc18dd93cf1f68bc233319aa3ca8eb3eff2123861f5fbe2f74d0c951`，12命令/365保存描述/71独立对象核验无drift；011实际25测试全过、012三生产TS lint0。B继续Host/app其余实现，不把局部交付当整票完成。

实际 `platform/desktop/hooks/automation-hooks.ts` 导出：
`piEditorArgumentsSupported(args: readonly string[], extension: string, cwd: string): boolean`（args只含Pi参数，不含Node后CLI entry）；
`installedPiEditorExtension(frozenEnv: Readonly<Record<string,string>>, options: Readonly<{signal?: AbortSignal; deadline: number}>): Promise<string|undefined>`（实际Host snapshot.values，只读已有生产扩展，有限读取/取消/逻辑2秒预算，返回canonical路径）。后者不安装、不改flags，未支持返回undefined；逻辑deadline不承诺强制打断blocked OS FS call。函数签名与消费合同已冻结，详细实际源/测试快照见audit，不依赖旧候选接口。Helper/Host现spawnEnvironment实际实现已回读。

原真实官方 Pi/Jiti 来源与完整 CLI 正例可复用 evidence/T-08-b-producer-proof-root-audit.json、T-08-full-cli-root-audit.json；首版正式支持 profile、用户已有 -ne/--no-extensions 且唯一显式 HUHU 扩展。旧004有 strace PTY根/LD_PRELOAD/raw输入，只是机制研究，不能冒充正式编辑器事务正例；不得放宽 profile 迁就旧 fixture。

## Workspace and Scope

本次只解锁 evidence/T-08-write-allocation.json 中完整 A 数组32路径，最终TASK以下展开；B独占15条Host/helper/扩展，C独占33条canonical/shared/Rust，Root独占正式工件和 main.js/styles.css/bundle-budget/notices。除了本次REPORT和自己的新 `/tmp/huhu-t08-a-stage2-*`，未分配路径只读。不改 package/lock/node_modules、Git index、旧证据或不可变bin，不跑根build/全局检查。需要越界路径或更改共享行为，先报Root协调。不要改未分配 TerminalView 来追补本票纯 keyCode229 encoder 之外的 DOM 结论。

业务与启动：

- 实现 agent.prompt、agent.wait、terminal.send-text、terminal.send-keys，复用 terminal.read。CONTROL_HANDLERS 与真实业务齐备后报告 Root，由 C 唯一 owner 切换 canonical available 并重生成；不得自行改 schema 或用本地开关绕过。readOnly 是 descriptor 的单独事实，不能再用 transport !== query 判断 agent.wait 副作用。CLI 与 GUI 共用实际服务方法，不建第二运行管理器。
- 在原 call capture 的同步栈冻结 context（首次 performance.now deadline 和原 call.signal），scope/preflight/admission await 不续期。捕获原 Vault/instance/Space/Session/runtime，等待和输入期间不按焦点、cwd、名称或首项重新定位。明确同Vault全Space；跨Vault拒绝。用户已决定“必须绑定 Space，旧入口先选择”，LOG030 的T14/15兼容迁移仍由后继票负责，不在本票偷建无Space例外。
- Sessions.create 在 hooks/control/env 都准备好后，用原 helper generation 的 spawnEnvironment(overrides) 核验本次 file/args/cwd/env。values 是原helper实际继承env加overrides；Windows unverified-platform拒绝普通prompt资格，unix-shell-default仅表示未知SHELL，不能称全部最终env逐项已知。使用已有 verifyPiArtifact 和B交付的实际有限参数/扩展检查；B检查函数只接Pi参数，direct Node要去除已核entry，direct CLI/bin-link则不去除。可在本A verifier已核分支返回精确参数偏移/捕获Pi参数，不凭原file字符串猜分支或另做未核路径解析。desktop能力惰性加载，普通启动/人工终端在不支持profile时继续原行为，不能因普通prompt资格失败破坏六Provider启动。
- 预检捕获的输入与实际spawn一致；完成所有异步核验后重查 signal、Space授权、原managed runtime、原lease/generation、control route/current，不能在检查后重新解析到另一程序或更改Node/Jiti加载环境。不静默追加-ne/-e或关闭第三方扩展。把有效 NativeEditorLaunch 随现 spawnSession 输入；不在spawn时编造bindingId/programEpoch。
- 用 NativeConnection.editorBinding(sid) 取得原handle。ready.sourceInstance 必须严格join实际 RuntimeActivitySnapshot.sources[].meta.lifetime.registration 的同一 sourceInstance，读取真实 bindingId/programEpoch；unknown、blocked、缺registration、多源冲突、source/reload/原handle失效均拒绝，无raw fallback。顺序可能ready早于Hook或Hook早于ready；两边事实尚未齐备时明确未就绪，不猜source或让挂起无限续期。
- agent.prompt经原NativeEditorBinding.submit，body只送一次，完成仅据原 adapter-applied 回执；不调用模型API、不额外发送Enter、不清除草稿。working原生可接受时允许，blocked/permission/login/unknown/unsupported准确拒绝，保留定位原终端。提交前完整body与最终progress/final envelope先计量，运行CLI请求仍受32768B总包限制，不能用256KiB editor上限绕过。
- prompt+wait在任何输入效果前取得原32观察额度并捕获真实tuple/N、初始working。只在可信输入确认后 activate；仅同代N之后事实可匹配，不把旧idle当新结果。原input回执后超时/取消/源失效保持 completed+receipt+原target；只读wait始终none。独立wait当前匹配，GUI继续等保留原tuple/N且只取新观察deadline，不重发、不stop。
- queued取消只有原owner证明零执行才none；dispatch后失联unknown，不等于失败无输入。原Submission.finished与settled不同，未知不伪造physicalsettle。业务观察可结束但旧原生操作仍按Host/native持槽。Router异常路径、容量失败和最终result不能丢掉已可信completed receipt或改成另一目标；与C broker最终guard一致。用type区分PTY-written与adapter-applied，保留完整receipt.kind/op。
- raw text/keys复用TerminalSession与原有界输入仲裁，named-key先完整校验编码；材料仅粘贴、Ctrl-C复制/中断、Kitty/Win32、原IME处理不退化，不凭单元encoder测试声称实际OS preedit可观测。terminal.read被动有界，返回捕获身份/位置/cursor/截断，不主动滚动TUI，不称完整答案。

控制工具与页面：

- 现 AgentWorkspacePage、workspace-view、TabStrip 中复用右工具位，宽屏初始展开控制312px，尊重保存关闭和历史已打开状态，不同时挤出第二块右栏。容器宽<600px使用ownerDocument的项目Dialog；只挂一个控制实例，不以隐藏副本重复监听/请求。
- 控制范围默认当前Space，可明确同Vault全Space；用户明确选稳定目标，名称重复可区分Space/Provider/ID。控制目标与当前终端焦点独立，切焦点不改目标；Space范围切换、runtime换代、source失效显示失效并禁止迟到操作，不自动选列表首项。无Space/空态/加载/错误、unsupported/blocked/unknown准确呈现。
- 输入区“只发送”“发送并等待”，默认等待原生活动done，文案说明需读屏/查产物核对；显示提交阶段/初始working/等待对象。取消只结束等待；timeout/cancel可只继续等原tuple/N，禁止重发。只读屏显示身份/范围/截断；定位走已有原终端入口，停止复用原确认与实际终止合同，不新增通用批准/拒绝。
- hide/close/unmount清理自己的观察/监听并中止尚未交付的本次用户操作，保持已提交的原运行继续；无挂起 Promise 或幽灵异步写入UI。保持原标签拖拽、分组、分屏、历史、创建Shell/六Provider等行为。T09面板协议/T10邮箱/T11历史等不得提前做。
- 复用共享控件/图标/语义tokens，所有用户文案t()且所属词典en/zh。桌面32px、窄屏44px目标；Tab/Enter/Esc、Dialog焦点约束与返回、主题/长名称/错误/200%等效缩放。更改TSX类只在已分配路径，Root在停写后统一生成样式。

本次完整产品写集（A唯一writer）：

- `src/modules/agent/core/control/context.ts`
- `src/modules/agent/core/control/terminal-coordination.ts`
- `src/modules/agent/services/control/commands.ts`
- `src/modules/agent/services/control/router.ts`
- `src/modules/agent/services/control/terminal-coordination.ts`
- `src/modules/agent/services/control/commands.test.ts`
- `src/modules/agent/services/control/router.test.ts`
- `src/modules/agent/services/control/terminal-coordination.test.ts`
- `src/modules/agent/services/control/control-coordination-native.test.ts`
- `src/modules/agent/services/terminal/session.ts`
- `src/modules/agent/services/terminal/sessions.ts`
- `src/modules/agent/services/terminal/session-coordination.test.ts`
- `src/modules/agent/services/terminal/sessions-control.test.ts`
- `src/modules/agent/services/controller.ts`
- `src/modules/agent/services/controller-control.test.ts`
- `src/modules/agent/platform/desktop/agents/program-identity.ts`
- `src/modules/agent/platform/desktop/agents/program-identity.test.ts`
- `src/modules/agent/platform/desktop/agents/pi-artifact-profiles.json`
- `src/modules/agent/services/launch/launcher.ts`
- `src/modules/agent/services/launch/launcher-space.test.ts`
- `src/modules/agent/core/terminal/keyboard.ts`
- `src/modules/agent/core/terminal/keyboard.test.ts`
- `src/modules/agent/i18n.ts`
- `docs/agent-workbench-cli.md`
- `src/modules/agent/ui/control/TerminalControlPanel.tsx`
- `src/modules/agent/ui/control/TerminalControlPanel.dom.test.tsx`
- `src/modules/agent/ui/AgentWorkspacePage.tsx`
- `src/modules/agent/ui/AgentWorkspacePage.dom.test.tsx`
- `src/modules/agent/services/workspace-view.ts`
- `src/modules/agent/services/workspace-view.test.ts`
- `src/modules/agent/ui/tabs/TabStrip.tsx`
- `scripts/obsidian-acceptance/agent-workbench-coordination.mjs`

## Acceptance

每个高风险接缝有能失败的目标red→green，保留真实argv/cwd/UTC/exit/rawlog与运行前后源SHA；对依赖B/C正在变动的检查明确drift，不拿旧bin/stub证明实际新能力。定向CLI/router/commands/Session/Sessions/controller/launcher/wait/raw与UI DOM、隔离types/生产定向ESLint，回归现材料prompt-port/prompt-runner与相关生命周期。已接受不变profile测试无需无理由重跑；修改其依赖/行为后再选对应检查。

实际新测试含：精确目标与旧代拒绝、ready/Hook双向到达、profile/env缺失/unsupported保留人工启动、预检期间取消/Space撤准入；旧idle/初始working/独立wait/同步事件/32观察额度；queued取消零输入、已提交后超时/Ctrl-C保留completed receipt；完整progress/final提前容量校验、source/runtime更换、无重复Enter/重发；UI一实例、目标不追焦点、明确跨Space、继续等不重发、可定位与被动读屏。

新增 scripts/obsidian-acceptance/agent-workbench-coordination.mjs 使用真实生产组件与明确受控后端，支持Root在writer停止后真实Chrome验证。沿原T06 activity脚本的CDP完整Enter packet及真实controller foreground意图，不通过替换生产控制组件造假；报告fixture与真实Obsidian/Provider边界。Root负责最终宽/窄亮暗截图、键盘与整体验证，你可在自己稳定依赖范围调试脚本但不自行写根产物。

control-coordination-native.test.ts 在C交同源不可变T08双bin、B交app后走真CLI→broker→Host→ControlRouter/Commands→真实TerminalSession→native→官方Pi默认editor，验证中文多行、真实working steer与完整原生回答保持；假loopback服务/tmp HOME/XDG/假fixture凭据隔离。native组合暂缺时继续独立业务/UI，不把未运行项标通过。B脚本verify-pi-editor.mjs由B独占，联调用其实际接口；如需调整先报Root/B。

磁盘仅余约8GiB，新快照按SHA复用CAS，临时安装目录用例后清理，不删旧证据或未知tmp。不得用skip、mock或构建退出0替代指定生产接缝。根build/lint/architecture/i18n/styles/bundle/notices/native组合与Astra/high独立双轴review由Root在稳定候选上收束，真实Obsidian/Provider/五平台未运行交用户。

## Return

问题/阶段真实接口通过原生collaboration发/root；业务handlers齐备及时通知Root协调C available切换。最终一次性写 `/home/wta/orca/workspaces/obsidian-huhu/terminal/.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/sessions/20261026T045732Z/008-t08-business-launch-ui/REPORT.md`，按report-template：实际API与消费位置、32路径before/after和精确diff、命令/原日志/快照、真实支持/拒绝边界、Design Conformance与未验项，明确SOURCE STOPPED。不能修改TASK/其他REPORT/正式Evidence，不猜session-locator。Root回读后正式验收，不自行推进Map/Goal/Ticket。
