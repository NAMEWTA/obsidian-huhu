# T-03 只读实施前简报

核验时间：2026-10-25；工作区 `/home/wta/orca/workspaces/obsidian-huhu/terminal`，分支 `NAMEWTA/terminal`，base/HEAD 仍为 `33c21e098ef3188cbab5a09f3e0a01fadb787715`。本简报不是 T-03 的启动授权、最终接口、代码审查或通过证据。没有改仓库、Git、构建产物，没有启动测试实例、真实账号或用户 Vault。唯一交付写在 `/tmp`。

已按 AGENTS 的 workspace.json 解析 roots、catalog 发现，再回读 Map revision 9、dev/ui 与本票相关规则、T-03 全票、Spec §3/§5/§11、implementation-contracts §1–5、DESIGN PAGE-001、reference-notes、T-01 最终 Evidence 及 T-02 Evidence/ports-draft。Cloud environment_status 工具未提供，`/etc/codex/network-policy.json` 不存在；未凭此推断凭据或网络就绪。公开 GitHub 资料经 web 工具读取，无外部写入。

## 1. 当前可直接执行的结论

T-03 尚未解锁，必须等 T-02 完成、writer 停止及 Root 回读最终接口后实施。目前最小改造不是另造终端后端：保留 TerminalSessions 的 native 租约和 TerminalSession/headless，把它们明确作为 runtime registry；持久 Session 交给 T-02 SpaceService；显示布局仅保留稳定身份与 runtime 的引用。创建、查询、attach、focus、close-view 必须成为分开的动作。

下述生产接线首次读取时尚未接入 T-02；T-02 在本预检期间继续合法改写相同文件，文中旧行号仅作定位线索，最后观察见 §3 补充。三条核心缺口在最后观察时仍成立：

1. `WorkspaceService.close()` / `closePane()` 会调用 `sessions.remove()`，后者 end 进程并 dispose headless。需要将关闭显示改成仅改布局，既不 remove runtime，也不删除持久 Session。
2. `WorkspaceService.attach()`、`newTerminal()`、`newAgent()` 目前总激活 Tab、调用 focus；`AgentController.start()` 还会 open 工作台。后台创建不能走这些无条件显现路径。
3. Sidebar 和 controller.status 从 layout.tabs 枚举。只有 runtime registry 而没有 Pane 的后台会话虽然能被 sessions.list() 看到，却不会出现在当前导航/后台状态。必须从持久 Session + runtime 投影生成会话树，Pane 只提供“正在显示”事实。

T-03 不应扩大成 T-04 的完整 stop/recovery、T-05 屏幕序列/背压、T-06 Provider 识别或 T-12 精确历史 resume；但其所交付的运行身份、查询、保留屏幕和新行为回归必须真实可用，不能等后票补齐本票能力。

## 2. 真实生产接线与可复用对象

| 事实 | 当前路径与接缝 | T-03 处理 |
|---|---|---|
| 唯一桌面控制器装配 | `src/modules/agent/module.ts` 惰性创建 `AgentController`，发布 AGENT_WORKBENCH / AGENT_SESSIONS 等；`services/controller.ts:142–185` 装配 TerminalSessions 与 WorkspaceService | 保持模块懒加载。新增 runtime 用例可先是 controller/WorkspaceService 的模块内公共方法，不必另造服务平台 |
| Shell 启动 | controller constructor 的 WorkspaceLaunchPort.shell → `resolveShell()` → `sessions.create()` | 使用 T-02 提交后的 Session + 最后目录重验；不能继续使用 sessionDirectory 的 home/cwd 回退来赋予新 Session 归属 |
| 六 Provider 启动 | WorkspaceLaunchPort.agent → `services/launch/launcher.ts:34 launchAgent()` → confirmLaunchPermissions / resolveCli / accountEnv / accountArgs → 捕获 LaunchRequest → sessions.create | 保留原账号/CLI/权限/argv 组合；准备启动与显现分开；缺程序、能力不可用、用户取消、spawn 失败可区分 |
| 另一个直达入口 | controller.start():503 直接 sessions.create → workspace.attach → controller.open | 必须纳入新的 managed admission，用 foreground 参数决定 attach/open。否则新接口仍会被旧 start 抢焦点 |
| 原生运行创建 | `services/terminal/sessions.ts:175 create`：ensureHelper → environment → allocateSessionId → new TerminalSession(random id) → 注册 Map/bySid → prepare → Hook → helper.spawnSession → session.attach | map 是可复用的 runtime owner。随机 TerminalSession.id 可作为 runtimeId，sid 是 helper 协议 ID，二者都不是持久 Session ID。增加稳定 Session/Space 关联与同 Session pending-start 去重 |
| 原生事件 | NativeHost 持有 PTY lease；bySid 路由 output/exit；每次 create 捕获原 helper；Hook 只更新捕获的 session | 保留 T-01 原代次租约。新一代不能复用旧 runtimeId；旧 output/exit/Hook 只影响旧对象，不能查“当前会话”后改新对象 |
| 视图生命周期 | `ui/terminal/TerminalTabView.tsx:69–96` 挂/卸 TerminalView；`terminal-view.ts:441 dispose` 清理 renderer/presentation/DOM，不调用 session.end/dispose | 这是正确显示边界，继续复用；卸载 renderer 不应使 runtime 消失 |
| 屏幕 owner | `services/terminal/session.ts:74` 的 headless Model、SerializeAddon、decoder、native 引用；receive 永久解析，subscribe 先 snapshot 后增量；dispose 才销毁 model | detach 不 dispose，背景继续 receive/ack。重新创建可见 xterm 可行，但必须附加同一个 TerminalSession/headless，不能“从历史重建一个运行” |
| 现有 close 语义 | `workspace-service.ts:274–295 close` 询问结束并 remove 所有 terminal ids；`394–419 closePane` 同样确认并 remove | 改成 close-view；明确保留后台及可再次打开提示。end 操作继续独立，后续 T-04 强化代次/核实退出 |
| 现有 attach | `workspace-service.ts:101` 按 session.id 查现有 Tab，找到即 activate；未找到 openTab 后 sessions.focus | 前台可复用；无焦点附加要显式 option。重新打开稳定 Session 先查 registry，不能调用 launcher/resume |
| 现有恢复 | `workspace-service.ts:427 restore` 依据 ResumeInfo 调 resume/agent/shell，新 runtime 替换旧 pane id，再 remove(oldId) | 活动 Session 的“打开”应绕开此 spawn 路径。没有活动运行的“继续/重启”是独立明确操作，不因 attach 隐式启动 |
| 导航/状态盲点 | `ui/sidebar/AgentSidebar.tsx:228` 遍历 state.tabs；SessionCard 依赖 workspace.group(tab.id)；`controller.ts:866 status` 也只遍历 tabs | 后台行不能伪装成一个未显示 Tab，否则会污染焦点/布局。用独立 Session 行模型，显示 stable id / Space / Provider / runtime connection / background |
| 仍属后票的低层消费者 | controller.ts:243 把 sessions.create/remove 注给 TerminalAutomationRuntime；`services/agent-runtime.ts:428/510` 是一次性/fresh/script 运行 | T-14 负责全部旧消费者 Space 适配。T-03 新 managed 用例不得引入无 Space 例外；也不能误称本票已解决全库旧业务绑定 |

T-01 最终证据已回读：code done，两轴 pass，输入摘要 `fc8df230d0ade566b6a291d90e1c73ca396d36fdec52ab31a531e2b749833749`；修复是 create 的 abort 回调只在原 helper.alive 时 end。其生产 NativeHost/TerminalSessions/Browser 取消竞态回归应复用并随 sessions 生命周期改动重跑。不能恢复旧的 helper.close/全局 session ID 分配，也不能用 this.helper 替代 create 捕获的旧 lease。

## 3. T-02 接续：已冻结与尚未冻结

T-02 A（`/root/prepare_t02`）本轮消息确认并且实际源文件已回读的冻结合同：

- `src/modules/agent/core/space/model.ts`：SpaceRecord / VaultBinding / SpaceDirectory / DirectoryGrant / ResolvedDirectory / SpaceChoice。
- `src/modules/agent/core/space/ports.ts`：DirectoryPort（resolveDirectory 等）、WriterOwnerPort.acquire、WriterLease（lost / assertHeld / close）、SpaceChooser。
- `src/modules/agent/core/space/errors.ts`：SpaceError 与稳定 code/reason/details。

它们与 ports-draft 相同，desktop/spaces 由 B 独占，T-03 不需更改这些端口。A 明确“业务 Session.id/spaceId 经 JsonStore commit 验证成功后进入 runtime launch；TerminalSession.id 仅是运行引用；ResumeInfo 将保留 stableSpaceId/stableSessionId”。这是 owner 的接口意图，尚不是已验收的实现。

最初读取时只看见 `services/spaces/space-service.test.ts` 新稿，随后写报告期间实现文件已经出现，见本节补充。**这些都仍在 T-02 实施中，未由 owner 宣布冻结或验收。** T-02 Evidence 仍 in_progress。正式派单前请 Root 回读最终文件和 Evidence，不要求 A 为预检改变正在实施的设计。

T-03 的最小接续顺序应是：

```text
明确 spaceId（旧交互先选；后台不选）
  → T-02 精确解析与绑定/授权验证
  → 持久 Session 提交并 readback 成功
  → 注册可查询 runtimeId / launch-pending（同 Session 串行/去重）
  → 账号、CLI、权限准备（可 await；不占持久写队列）
  → T-02 最终 beforeSpawn：writer/physical binding/directory 再验
  → 捕获返回 cwd，立即 spawn 原 argv/env
  → 真连接后 ready；失败保留 Session 与准确失败/未知阶段
  → foreground 才 attach / select Space / focus；background 只登记与通知订阅
```

Root 需要在 T-02 最终交接中确认：admission 是否可在 helper/environment/Hook 等异步准备后、真正 helper.spawnSession 之前调用；返回的 cwd 如何传递且不被后续 options.cwd/sessionDirectory 覆盖；是否有单次使用/取消约束。不要仅在 WorkspaceService 开始时验证一次，然后经过权限 dialog/环境等待用陈旧 cwd spawn。

同一稳定 Session 的重复 attach 应返回同 runtime。并发两个“启动同 Session”需共享 pending Promise 或明确冲突，不仅靠 JS map 最终覆盖；Map 中也不能把两次新建不同 Session 的合法启动错误去重。新业务 ID 不按 cwd、标题、当前焦点、唯一候选推断；两个同 cwd Space 必须独立。

T-03 接手前不覆盖 T-02 正在写的 workspace-service/controller/core/workspace/sidebar/create 文件；T-02 完成后才由新票唯一 writer 顺序修改。不要复制 T-02 SpaceService、重定义 DirectoryGrant/SpaceError，或将 v2 identity 写回旧 workspace.json writer。新格式保留 `.huhu/terminal-agent/<device>/workbench-v2.json` 的最终 owner；路径以 T-02 实际交付为准。


### 最后只读观察补充（05:57 UTC，T-02 仍在写，非冻结回执）

- 已实际读到 `services/spaces/records.ts` 的 `SessionRecord`：id、spaceId、kind shell|agent、title、可选 agentId/accountId/shell/nativeSessionId/transcriptPath、createdAt。WorkbenchRecords 是 v2，额外含 sharedLayout，与按 Space 的 layouts 分开。
- 已实际读到 `space-service.ts` 的 `SessionAdmission { record; cwd; beforeSpawn: () => Promise<void> }`，`prepareSession(spaceId, input, existingSessionId?)` 先持久 mutate，再返回 admission；beforeSpawn 重验 lease / current Space / directory，并核对 cwd 不变。`requireSpace(spaceId?, {interactive?, signal?})` 是生产选择接缝。完整最终行为仍待 T-02 验收。
- 实际 ResumeInfo 命名现在是 **spaceId / persistentSessionId**，不是消息里较早的 stableSpaceId/stableSessionId。T-03 应以最终源码命名为准，不复制本简报中的概念名。WorkspaceService 以私有 identities Map 关联 runtime id 与这两项，目前在 create 完成后 bindIdentity；T-03 要让 launch-pending 也可按稳定 Session 查询，需要将关联时机前移到新 managed registry/admission 接缝。
- `CreateSession.beforeSpawn?` 已由 T-02 添加，并实际在 Hook/环境准备之后、helper.spawnSession 之前 await；controller 的 Shell/Agent/restore 注入均传递该 callback。这解决了本简报最初提出的最终边界位置问题，正式接手时只需验证未漂移并覆盖故障链，不必重新设计第二套 callback。
- T-02 当前 newTerminal/newAgent 在调用开始捕获 options.spaceId 或已持久选中的 Space，admit 使用 interactive=true，然后仍无条件 attach。后台公共入口必须明确传 spaceId、使用 interactive=false，且不调用 selectSpace/attach/open；不能直接把当前 GUI helper 当成后台用例。
- 新 WorkspaceService.attach 已出现“原 Space 非当前时写原 Space layout”的分支，依旧是创建 Pane 的动作。后台无 Pane 需要彻底跳过 attach，而不是依赖这个分支。T-03 应保留 T-02 的归属/布局持久化，不从旧源码覆盖整个文件。

## 4. 写集需要补充的精确路径

当前 T-03 已覆盖 services/terminal/**、services/launch/**、controller.ts、workspace-service*.ts、core/workspace/**、ui/create/**、TerminalTabView.tsx、i18n、native session.rs、docs 与产物。优先使用这些邻近位置，不新增大平台。

**可确定需要补到原 Ticket/Map 的源码/测试路径：**

| 路径 | 原因 |
|---|---|
| `src/modules/agent/ui/sidebar/AgentSidebar.tsx` | 展示无 Pane 的持久 Session/运行、后台/分离标记、重新附加；当前按 Tab 模型无法完成 AC-026 |
| `src/modules/agent/ui/sidebar/AgentSidebar.dom.test.tsx` | 键盘打开后台行、保留归属、没有 focus 的状态更新、长名称/状态文字等局部 UI 验证 |
| `src/modules/agent/ui/terminal/TerminalTabView.dom.test.tsx` | 当前仅生产 TSX 在 allowlist；必须新增关闭只 detach、重挂同 runtime/renderer 生命周期等断言 |
| `src/modules/agent/services/controller-native.test.ts`（或同目录 `controller-managed-runtimes.test.ts` 新文件） | 实际 controller 的 foreground/background/open 分支与 launch admission 接线需要生产消费者级测试；仅 sessions mock 不覆盖 controller.start 抢焦点 |

**待 T-02 最终 diff 后按实际方案添加，不应提前改的路径：**

- `src/modules/agent/services/spaces/space-service.ts`、`records.ts` 及邻近测试：仅在 T-02 最终 admission/Session 数据缺少 T-03 必需的读取/更新能力时扩写；优先消费公开方法，不让 UI/runtime 直接改 records。
- `src/modules/agent/ui/workspace/WorkspaceLayout.tsx` 及 `.dom.test.tsx`：若 T-02 的 Space 切换/空态尚不能对后台 Session attach，或本票需要在空 Space 面板给后台启动入口才扩。若仅修改已有 NewTabMenu/Omnibox 与 Sidebar 即可则不用。
- `src/modules/agent/services/workbench.ts` 及邻近测试：若 resourceId 从 runtimeId 迁到 stable Session ID，需要标题/定位投影同步；status 本身在 controller 内修改已属当前写集。
- `src/modules/agent/api.ts`、`module.ts`、`module.test.ts`：**不是必然要写。** T-07 与 T-03 同属 agent，可先调用模块内 controller 用例；若本票决定新增跨模块 serviceKey 或变更既有公开 DTO，则这些是必须扩的真实发布点，不能只在 services 新建一个不可达 API。api.ts 只存类型/键，不能导出 TerminalSession、Zustand store 或静态导入服务/UI。
- `src/modules/agent/core/launch/*.test.ts`、`platform/desktop/agents/{accounts,account-args,resolver}.test.ts`、`platform/desktop/pty/*.test.ts`：已有行为未变可只运行；只有实际修正 argv/env/检测或新增覆盖时扩对应精确文件，不为了“六 Provider”泛放整个目录。

`native/pty-server/src/session.rs` 已在 allowlist，但当前 Rust 按独立 sid 管理 live Session，不认识 Pane；不需要为了 detach 去改 native。若 TS 完成即可，保留 native 不动。main.js/styles.css 仍 Root 独占生成；Root 根据真实最终 diff 修订正式工件后才发新写授权。

## 5. 最小实现与验收接缝

建议最小内部合同（字段/方法名由 T-02 交付后冻结，不是本简报预先批准的 public schema）：

- managed create 输入固定 spaceId、kind/Provider/account 配置引用、foreground 布尔值和可选名称；不得以 cwd 代替 Space。GUI 默认前台，可选后台；程序用例默认后台。返回稳定 sessionId、spaceId、runtimeId 与实际 phase/connection，不能仅返回 Tab ID。
- registry 持有 `stableSessionId → current runtimeId/TerminalSession` 和 `runtimeId → captured runtime`，对 launch-pending 也可查；运行身份每次明确启动唯一，PID 可选观察字段。TerminalSession 可增加 stableSessionId/spaceId，保持它的 id 为 runtime 身份。
- attach 输入 stable Session ID（可带 expected runtimeId），只绑定现有 runtime；没有 runtime 时返回未运行/需要明确启动。重复 attach 不 spawn；跨 Space 显式定位可切至原 Space，但绝不改 session.spaceId。
- close-view 移除 Pane/Tab 以及 renderer 引用，保留 runtime/headless；用文字告知后台可恢复。后台状态变化、权限/完成提示不调用 activate/open/focus；所有 `onCloseAutoFocus` 都只恢复仍在的原前台输入，不指向新后台 runtime。
- list/get 由持久 Session 和 registry 联合投影。没有 Pane 仍可查 phase、Provider、归属和 runtime。不要从布局缺失推导 ended，不把模型 unknown 改为 idle；不把 connection connected 直接声称 Agent 可安全输入。

| 必须证明的行为 | 推荐自动化接缝与具体断言 |
|---|---|
| 保存失败无启动 | T-02 production SpaceService + managed use case，故障注入 readback/write；spy native acquire/spawn 为零，旧持久记录不变 |
| 目录/writer 在准备中失效 | 权限确认/环境/Hook deferred 后撤销 grant/owner，再放行；最终 beforeSpawn 拒绝，绝不 home 回退或新建第二个 Space |
| 用户取消零启动 | 无绑定选择取消 / 无 Space 创建取消 / YOLO 确认取消；无新 PTY、无新已接纳业务 invocation；若 Session 已保存，准确显示未启动而不假称连接 |
| 后台创建不抢焦点 | 真 WorkspaceService/controller 与前台 A；后台 B 运行后 activeSpace/group/tab/focusedSession、DOM activeElement 不变，Pane 数不增加，registry get/list 返回 B |
| 关视图同 runtime/headless | 真 TerminalSession 对象，先输出标记 → close Tab/Pane → 后台输出标记 → attach；spawn count 仍 1，runtimeId/PID 不变，snapshot/text 包含前后标记，native end/remove/dispose 未调用 |
| 重复/并发 attach | 同 Session 同时两次 attach/重复菜单打开，至多一个显示绑定，spawn 为 1；pending 同 Session 的明确 start 也不能双 spawn |
| 关闭期间晚到启动 | 旧 workspace-service.test 的“close tab kills late process”必须改为新合同：显示关闭后不晚到抢焦点，已接纳 runtime 留后台；模块 dispose 的“晚到启动被收束”旧风险仍保留并另测 |
| 代次隔离 | old output/Hook/exit 到达不会污染新 runtime 的标题/connection/activity；从 capture 原 session 路由，不能按 stable id 查最新对象后写入 |
| 失效状态准确 | helper unavailable、missing executable/cwd、spawn error 时持久 Session 可查；connected/ready 不提前宣称，已知错误/效果未知不自动 retry |
| 六 Provider 配置 | 用现有 catalog 驱动 fixture，捕获真实 launcher LaunchRequest / CreateSession 参数；系统/命名账号、权限与 argv/env 字节保持，中文/空格路径作为字面 file/cwd，不拼 shell |
| UI 局部合同 | Sidebar/background、空 Space、新建后台、loading/error/detached；真实词典 en/zh、键盘与焦点归还、名称省略且完整可访问；DOM 只说明组件行为，实机截图留用户 |

后续实施的适用检查：定向 workspace/managed controller/terminal/launcher 测试及受影响 DOM，T-01 sessions-cancellation + native host/Browser owner 回归；生产 TS/TSX 后 Root build/lint；导入/API/装配有变化加 architecture/bundle；词典加 i18n；TSX 类变化按样式流程。Rust 真改才 check:native 和 helper 校验。`sessions.e2e.test.ts` 现有测试会在无 helper 或 Windows skip，退出 0 不能算真实 helper 通过；Agent 本轮仍需明确哪些自动化跑过及 skip，真实 Shell/Provider/IME/五平台由用户按 Spec §11 验收。

## 6. 六 Provider、账号/权限/环境/输入兼容底线

现有 Provider 正好是 Claude Code、Codex、Grok、OpenCode、Gemini、Pi；不要以四种有 Hook 或两种已做真实 E2E 取代六入口保留。

| Provider | 原路径/参数要点（当前本地 catalog/flags/account-args 事实） |
|---|---|
| Claude Code | detect/launch `claude`；YOLO `--dangerously-skip-permissions`；托管 CLAUDE_CONFIG_DIR、临时目录和凭据隔离保留 |
| Codex | `codex`；YOLO `--dangerously-bypass-approvals-and-sandbox`；命名账号 CODEX_HOME，以及 accountArgs 附加 file credential stores / sqlite_home / log_dir；这些覆盖位于 `--` 之前，不能移到 prompt 后 |
| Grok | `grok`；YOLO `--permission-mode bypassPermissions`；一次性 prompt 的 `--` 分界由旧 runtime 合同拥有；交互式创建无需伪造 prompt |
| OpenCode | `opencode`；catalog 无 YOLO 旗标，原 promptFlag `--prompt` 只在已有自动化输入路径使用；不为了统一模式自造绕过权限参数 |
| Gemini | `gemini`；catalog 无 YOLO 旗标，promptFlag `--prompt-interactive`；托管 GEMINI_CLI_HOME 保留 |
| Pi | `pi`；catalog 无 YOLO 旗标；托管 PI_CODING_AGENT_DIR / SESSION_DIR；历史继续按 transcript locator 属 T-12，不把普通 attach 变成 resume |

`launchArgs` 优先 argsOverride，再 extraArgs，再有效 permissionMode 的默认 YOLO flags；`needsYoloConfirmation` 看实际 argv 且保留 yoloAcknowledgedAgents。不要重置 override/确认，不因后台启动无声提升权限。后台若需要首个手工确认应返回清晰需要配置/确认状态，不自动点击许可。

空 accountId 是本机系统账号，保留真实 HOME、XDG、Provider home 和已导出凭据；命名账号为 `.huhu/agents/<device>/accounts/...` 管理，managedHomes 隔离 HOME/USERPROFILE/APPDATA/XDG/TMP/Provider homes，ISOLATED_CREDENTIAL_ENV 清空继承凭据。entry.env 与 accountEnv 的覆盖次序保持；env 仅在启动时使用，不写入 Session/布局/查询回执/日志。账号身份是 Provider+账号/namespace 的引用，不以 cwd 或 PID 合并。

普通 Shell 保留 terminalEnvironment/login-shell PATH 与默认 shell 参数；启动目录仍必须来自明确 Space 及授权，不能用 sessionDirectory 的 permissive fallback 代替。PTY env 当前设置 TERM=xterm-256color、COLORTERM=truecolor、TERM_PROGRAM=huhu、HUHU_SESSION_ID=runtime id；新增 space/session 标记不能让用户 env 覆盖已验证身份。未来 CLI 路由标记不是认证，不在 T-03 假设 gateway 已存在。

输入仍沿用 TerminalSession.input/paste、keyboard/Kitty/Win32、bracketed paste 与 headless 单设备回复。TerminalView 是 renderer，重挂不把查询回复再次当用户输入。inputReady 当前仅依据连接+bracketedPaste；本票只如实给出 launch-pending/connected/failed，不能承诺所有 Provider 安全输入或任务成功。Prompt 仲裁、blocked 拒绝和完整原生结果由 T-06/08/14 保持；T-03 不将屏幕文本替代一次性答案。

## 7. 同票 Agent Team 的不重叠拆分建议

可以拆，但先冻结小接口后并行；比按“后端/前端”都改 controller 更安全。推荐两位实现者，Root 仅集成与产物、正式状态，reviewer 另为只读。

- **A：运行与接线唯一 owner。** services/terminal/**、services/launch/**、workspace-service*.ts、controller.ts、core/workspace/**，必要的 controller 测试、docs 和 i18n。先冻结 runtime DTO/用例签名及 WorkspaceService 的 attach/background options，再实现 registry/admission/事件与失败路径。T-02 spaces 当作稳定依赖。
- **B：显示消费者唯一 owner。** ui/create/**、ui/terminal/TerminalTabView.tsx 及 DOM 测试、ui/sidebar/AgentSidebar.tsx 及 DOM 测试；只有确有需要才 ui/workspace/WorkspaceLayout。B 不改 services/controller/i18n，不创建第二份 Session store；使用 A 给定的词典 key 清单，A 一次落词典。
- **Root：** main.js/styles.css、预算必要调整、正式 Ticket/Map/Evidence、最后集成测试/快照。api.ts/module.ts 若需要由 A 独占，不双方各改一半。

开始 B 前必须冻结：

1. 稳定 Session summary / runtime summary 的只读字段、lookup 与订阅；后台/分离是显示事实，不新增持久 Run。
2. managed create 的 spaceId、provider/account、foreground、返回值与取消/失败语义；B 不读当前焦点自动补目标。
3. attach(existing stable Session, expected runtime?)、close-view、显式 focus 的方法签名；B 不直接调用低层 sessions.create/remove。
4. T-02 spaceId/persistentSessionId 在 ResumeInfo 的最终命名（概念为稳定 Space/Session），以及布局中的 runtime 引用如何查询。
5. en/zh key 清单、错误 code 到显示文案映射；B 只消费，不在 UI catch 原样显示 env/凭据。

接口变动由 A 单点改、通知 B；有变动的 B 部分暂停，不能各自增加兼容字段来掩盖分叉。A/B 都完成后还必须以实际 T-02 SpaceService + A runtime + B UI 跑一条关闭/后台/重附加链，不能两个 mock 子报告相加就算本票通过。

## 8. 开源复用核验与差异

现有 reference-notes / evidence/reference-sources.json 已保存近两年活动、逐文件许可和依赖比较，可按未变化证据复用。本次另实际搜索官方 GitHub，回读以下固定源码/许可/发布页，没有复制外部代码。

- Herdr：官方 [runtime_registry.rs](https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/terminal/runtime_registry.rs)（同 commit 的 raw URL 可解析）把 durable terminal id 对应的 live runtimes 放在 AppState 之外；PTY/parser/detector/channels 属运行 registry。采用身份/状态与活动资源分离；HUHU 用现有 TypeScript Map/headless/native owner，不移植 Ghostty/Tokio/UI 或热 handoff。根 [LICENSE](https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/LICENSE) 已实际确认 Apache-2.0，vendor 不在此许可推断内。同日既有 evidence 保存 2026-10-23 commit `5608de...` 的时间 `2026-10-23T21:54:08Z`；本次该官方 commit 页可读但 web 文本不显示日期，日期复用原记录，未冒称重新取得 API 日期。
- Wave：官方 [blockcontroller.go](https://github.com/wavetermdev/waveterm/blob/97e560027f494d20fed347b2d6b72b6bcb3e50e0/pkg/blockcontroller/blockcontroller.go)，raw 实读证实 registry、运行状态版本、每 block resync mutex、复用 existing controller 后才 Start；可借 registry 和同目标并发收束。HUHU 不采其 block-close→Destroy、done resync 自动 restart 或 force restart，也不引入 Go/DB/remote 栈。该文件头 SPDX 与根 [LICENSE](https://github.com/wavetermdev/waveterm/blob/97e560027f494d20fed347b2d6b72b6bcb3e50e0/LICENSE) 都是 Apache-2.0。官方 [v0.14.5](https://github.com/wavetermdev/waveterm/releases/tag/v0.14.5) 本次可读，原 evidence 的 published_at=2026-04-16T16:01:54Z、commit97e560... 满足窗口。
- 既有 R-04/R-05 复用：xterm/headless6 + serialize 和 portable-pty0.9 已在 HUHU 使用，继续保留。活动/许可 primary URLs 在 reference-sources.json；不新增依赖。K-02 的 [Herdr v0.9.5](https://github.com/herdrdev/herdr/releases/tag/v0.9.5) 本次回读保留为 IME/Windows 非 ASCII/PATH 风险来源，不能当 HUHU 已通过测试；K-05 是旧 portable-pty0.8.1 Windows 报告，不宣称 0.9 当前缺陷。T-05 负责 K-03 resize 回归。

研究采用的是生命周期/注册表机制。若实施者实际改编源码或新引依赖，仍需逐文件许可/固定 commit/NOTICE/第三方对应说明；目前没有该必要。GPL/AGPL 终端源码没有打开。

## 9. Root 需要在派单前收束的工程缺口

1. **等 T-02 真正完成。** 回读 Session schema、prepareSession/最终 beforeSpawn 与稳定布局字段；确定不能在最终检查后又执行未受约束的异步准备再 spawn。测试草稿不足以冻结此合同。
2. **修订真实写集。** 至少补 Sidebar 与其 DOM 测试、TerminalTabView DOM 测试、controller managed 接线测试；是否 api/module/WorkspaceLayout 由具体公共用例方案决定。正式状态/计划由 Root 写，不让实施者自行越界。
3. **冻结最小 runtime/显示合同。** 明确 stable Session ID 与 runtimeId，重复 attach/并发 start、foreground/background、close-view 的返回与失败阶段；不需要上升为新用户产品问题。
4. **保留阶段边界。** T-03 新运行必须明确 Space；T-14 仍负责所有既有一次性/自动化/quick-command 消费者的完整适配。不要因还没完成后票，就声称当前全库已满足硬约束；也不要在 T-03 偷做整个 T-14 或为保编译创建无 Space 例外。
5. **测试语义有意更新。** 当前 close-confirm/remove 与“晚到 restore 杀进程”的测试体现旧设计，要改成新行为断言，同时保留模块关闭/失败清理风险测试；不能直接删除这些测试。真实 helper skip 与用户 E2E 待验收须分别记。

以上都是既有规格内的工程决策；不需要重新向用户询问已决定的 Space、后台、close-view 或 E2E 分工。
