# T-18 AC 对账矩阵（代码层）

Round 2 固定输入：`styles.css` sha256 `a2fa403761ee87f9f5ab879e060abc67f31f1592e358432dac7df868a50715b3`（由 `node scripts/build-tailwind.mjs && node scripts/build-styles.mjs --write` 重建，1,423,871 B）；`main.js` sha256 `13adfbab0b41660ffb62ea68ee113c0ce59d161cc70a8695d789a5a5f2bdd92d`（Lead 于 Round 2 后重建，含本轮 TSX 改动；早前 `bb8491fc…` 为重建前）；非 `.agents/` 改动路径摘要 `48fbd2325321ac1a6ec2914ce24d313f7b5c10c3b9c6f60402ca57e3eed8c1e8`。以下 Round 1 摘要保留作历史：base `207371164a68152d2756ace78cca2011bb32b04d`（HEAD）+ 工作区未提交改动（非 `.agents/` 的 55 个路径在派工开始时的摘要 `021a4bc8991c4aa995aeb254cbfb08c82721baa38005c499cdeb7c03ee2468af`，由 `git ls-files -m -o --exclude-standard` 逐文件 sha256 再汇总得到）；`main.js` sha256 `ac59749c086978b23fb1c5b3060eb7be52daf9725dc70714e307b2d03601604a`，`styles.css` sha256 `2eb07b0ffedbec772a348003362574f431a0a43211738399cc12945a76a48a19`。机器 Linux x86_64，Node v26.11.1。本表只汇总各票 Evidence 的 Acceptance Verification JSON；T-01..T-17 各 AC 的来源列直接抄自原 Evidence，本次对其中全部路径做了存在性核对（0 缺失）。

状态词：`passed-code` = 代码/自动化层通过；`open-finding` = 本票审计发现未决问题；右列“用户待验收”均为**未运行**，由用户按 `docs/agent-workbench-acceptance.md` 执行，不得写成已通过。

汇总（Round 2）：63 个 `passed-code`；AC-061 `passed-code`（F-1、S-1 已修并复验）；AC-063 为“代码交付完成，AC 待用户端到端”，不计入已通过；0 个失败；0 个实机/Provider/五平台项已执行。

| AC | 主责票 | 测试 / 证据来源 | 代码层状态 | 用户待验收（未运行） |
|---|---|---|---|---|
| AC-001 | T-02 | src/modules/agent/services/spaces/space-service.test.ts；src/modules/agent/services/workspace-service-spaces.test.ts；src/modules/agent/ui/create/SpaceForm.dom.test.tsx；evidence/T-02.md#verification-layout | passed-code | 真实 Obsidian 创建/重命名 Space |
| AC-002 | T-10 | evidence/T-10.md#verification-final-code | passed-code | 真实同 cwd 多 Space 邮箱 |
| AC-003 | T-02 | src/modules/agent/platform/desktop/spaces/directories.test.ts；src/modules/agent/services/workspace-service-spaces.test.ts；src/modules/agent/services/terminal/sessions-space.test.ts；evidence/T-02.md#verification-layout | passed-code | 真实目录选择器与系统权限 |
| AC-004 | T-07 | src/modules/agent/services/spaces/space-service-control.test.ts；src/modules/agent/services/control/control-native.test.ts | passed-code | 真实 CLI 缺目标引导 |
| AC-005 | T-03 | src/modules/agent/services/launch/launcher-space.test.ts；src/modules/agent/services/controller-managed-runtimes.test.ts；src/modules/agent/services/workspace-service-launch-failures.test.ts；src/modules/agent/services/workspace-service-spaces.test.ts；evidence/T-03.md#verification-repair | passed-code | 真实 Codex/Claude TUI 与账号 |
| AC-006 | T-07 | src/modules/agent/services/control/control-native.test.ts；src/modules/agent/services/control/router-foreground.dom.test.tsx | passed-code | 真实 CLI 后台创建不抢焦点 |
| AC-007 | T-06 | src/modules/agent/services/terminal/status.test.ts；src/modules/agent/services/terminal/sessions-control.test.ts；src/modules/agent/platform/desktop/hooks/automation-hooks.test.ts；src/modules/agent/services/terminal/session.ts；evidence/T-06-review-round2.md#standards | passed-code | 真实 Provider 状态证据 |
| AC-008 | T-03 | src/modules/agent/services/workspace-service-native.test.ts；src/modules/agent/services/workspace-service-spaces.test.ts；evidence/T-03-checks-root-repair.json | passed-code | 真实 Provider 重新附加 |
| AC-009 | T-09 | evidence/T-09.md#verification-final-code | passed-code | 真实 Obsidian 双向面板 |
| AC-010 | T-07 | test/native/control-protocol.test.ts；native/pty-server/tests/control.rs；evidence/T-07-review-r2-report.md#specification | passed-code | 五平台 locator 与 ACL |
| AC-011 | T-07 | src/modules/agent/services/control/commands.test.ts；src/modules/agent/services/control/control-native.test.ts | passed-code | 真实跨 Space 控制 |
| AC-012 | T-07 | native/pty-server/tests/control.rs；src/modules/agent/services/control/router.test.ts | passed-code | 真实跨实例拒绝 |
| AC-013 | T-08 | evidence/T-08-a-stage2-root-audit.json；evidence/T-08-b-stage2-root-audit.json；evidence/T-08-root-recovery1-integration2-audit.json | passed-code | 真实 Provider 提交 |
| AC-014 | T-08 | evidence/T-08-a-stage2-root-audit.json；evidence/T-08-c-stage2-root-audit.json | passed-code | 真实并发输入 |
| AC-015 | T-08 | evidence/T-08-a-stage2-root-audit.json；evidence/T-08-b-stage2-root-audit.json；evidence/T-08-root-recovery1-integration2-audit.json | passed-code | 真实登录/权限界面 |
| AC-016 | T-08 | evidence/T-08-a-stage2-root-audit.json；evidence/T-08-root-recovery1-integration2-audit.json | passed-code | 真实 Provider 完成状态 |
| AC-017 | T-08 | evidence/T-08-a-stage2-root-audit.json；evidence/T-08-c-stage2-root-audit.json；evidence/T-08-review-r5-report.md#specification | passed-code | 真实取消/Ctrl-C |
| AC-018 | T-08 | evidence/T-08-a-stage2-root-audit.json；evidence/T-08-root-recovery1-integration2-audit.json | passed-code | 真实 TUI 读屏 |
| AC-019 | T-17 | evidence/T-17.md | passed-code | 五平台真实 CLI 黑盒 |
| AC-020 | T-06 | src/modules/agent/ui/sidebar/AgentSidebar.dom.test.tsx；src/modules/agent/ui/sidebar/AgentSidebar.tsx；src/modules/agent/services/workspace-service.ts；scripts/obsidian-acceptance/agent-workbench-activity.mjs；evidence/T-06-review-round2.md#specification | passed-code | 真实 Provider 审批后继续 |
| AC-021 | T-08 | evidence/T-08-blocking-observation-decision.md；evidence/T-08-b-stage2-root-audit.json | passed-code | 真实 Provider 审批阻塞 |
| AC-022 | T-06 | src/modules/agent/platform/desktop/hooks/system-hooks.test.ts；src/modules/agent/platform/desktop/agents/accounts.test.ts；src/modules/agent/platform/desktop/hooks/system-hooks.ts；src/modules/agent/platform/desktop/agents/accounts.ts；src/modules/agent/services/controller.ts；evidence/T-06-review-round2.md#specification | passed-code | 真实账号权限模式 |
| AC-023 | T-10 | evidence/T-10.md#verification-final-code | passed-code | 真实通知 |
| AC-024 | T-10 | evidence/T-10.md#verification-final-code | passed-code | 真实读取/确认 |
| AC-025 | T-10 | evidence/T-10.md#verification-final-code | passed-code | 真实来源失效 |
| AC-026 | T-03 | src/modules/agent/services/workspace-service-native.test.ts；src/modules/agent/ui/sidebar/AgentSidebar.dom.test.tsx；src/modules/agent/ui/terminal/TerminalTabView.dom.test.tsx；evidence/T-03.md#design-conformance | passed-code | 真实宿主关面板后持续输出 |
| AC-027 | T-04 | src/modules/agent/services/workspace-service-stop-native.test.ts；src/modules/agent/services/workspace-service-stop.test.ts；native/pty-server/tests | passed-code | 五平台真实进程树停止 |
| AC-028 | T-04 | src/modules/agent/services/workspace-service-stop.test.ts；src/modules/agent/services/spaces/space-service-lifecycle.test.ts；evidence/T-04-visual/behaviors.json | passed-code | 真实归档与历史保留 |
| AC-029 | T-04 | src/modules/agent/services/terminal/sessions-space.test.ts；src/modules/agent/services/workspace-service-stop.test.ts | passed-code | 真实重启/迟到事件 |
| AC-030 | T-08 | evidence/T-08-a-stage2-root-audit.json；evidence/T-08-b-stage2-root-audit.json | passed-code | OS 输入法 preedit |
| AC-031 | T-05 | src/modules/agent/services/terminal/session-screen.test.ts；src/modules/agent/ui/terminal/terminal-screen-xterm.dom.test.tsx；scripts/obsidian-acceptance/agent-workbench-screen.mjs | passed-code | 真实宿主 xterm 尺寸/设备回复 |
| AC-032 | T-05 | src/modules/agent/services/terminal/session-screen.test.ts；src/modules/agent/services/terminal/session-screen-native.test.ts；src/modules/agent/ui/terminal/terminal-scheduling.test.ts | passed-code | 真实长输出与 OS 终端行为 |
| AC-033 | T-11 | evidence/T-11.md#8 | passed-code | 真实历史来源 |
| AC-034 | T-11 | evidence/T-11.md#8 | passed-code | 真实库外 Session |
| AC-035 | T-11 | evidence/T-11.md#8 | passed-code | 真实来源缺失 |
| AC-036 | T-11 | evidence/T-11.md#8 | passed-code | 真实长历史分页 |
| AC-037 | T-12 | evidence/T-12.md | passed-code | 真实 Codex/Claude 停止后继续 |
| AC-038 | T-12 | evidence/T-12.md | passed-code | 真实跨实例冲突与五平台锁 |
| AC-039 | T-12 | evidence/T-12.md | passed-code | 真实继续失败 |
| AC-040 | T-12 | evidence/T-12.md | passed-code | 真实导入 |
| AC-041 | T-13 | evidence/T-13.md#7 | passed-code | 真实 Obsidian 重载/弹窗/下载、Cookie |
| AC-042 | T-14 | evidence/T-14.md | passed-code | 真实 Provider 投递 |
| AC-043 | T-14 | evidence/T-14.md | passed-code | 真实完整答案 |
| AC-044 | T-14 | evidence/T-14.md | passed-code | 真实旧入口消费者 |
| AC-045 | T-14 | evidence/T-14.md | passed-code | 移动端轻量技能 |
| AC-046 | T-10 | evidence/T-10.md#verification-final-code | passed-code | 真实持久化故障 |
| AC-047 | T-15 | evidence/T-15.md | passed-code | 真实旧库升级演练 |
| AC-048 | T-15 | evidence/T-15.md | passed-code | 真实中断与回滚 |
| AC-049 | T-15 | evidence/T-15.md | passed-code | 旧版本写端被拒 |
| AC-050 | T-16 | evidence/T-16.md | passed-code | 两库真实往返、库外目录 |
| AC-051 | T-16 | evidence/T-16.md | passed-code | Windows/移动、外部目录重新授权 |
| AC-052 | T-07 | native/pty-server/tests/control.rs；src/modules/agent/platform/desktop/control/environment.test.ts；src/host/desktop/native/host-control.test.ts | passed-code | 复制/移动库的真实宿主 |
| AC-053 | T-02 | src/modules/agent/platform/desktop/spaces/writer-owner.test.ts；src/modules/agent/platform/desktop/spaces/writer-process.test.ts；src/modules/agent/services/workspace-service-spaces.test.ts；evidence/T-02-checks-b.json；evidence/T-02.md#b-handoff | passed-code | Windows/macOS 双实例写端口竞争 |
| AC-054 | T-05 | native/pty-server/src/outbox.rs；native/pty-server/src/session.rs；src/host/desktop/native/host-stream.integration.test.ts；src/modules/agent/services/terminal/session-screen-native.test.ts | passed-code | 真实负载与内存 |
| AC-055 | T-07 | native/pty-server/tests/control_outbox.rs；src/host/desktop/native/helper-control.test.ts；evidence/T-07-review-r2-report.md#standards | passed-code | 五平台控制面负载 |
| AC-056 | T-04 | src/modules/agent/services/controller-managed-runtimes.test.ts；src/modules/agent/services/terminal/sessions-space.test.ts；evidence/T-04-review-round2.md#standards | passed-code | 五平台关闭竞态 |
| AC-057 | T-01 | src/host/desktop/native/host.integration.test.ts；src/modules/browser/module.test.ts；src/modules/agent/services/terminal/sessions-cancellation.test.ts；evidence/T-01.md#verification-v3 | passed-code | 真实宿主：Browser 关闭期间 Cookie 请求、helper 退出 |
| AC-058 | T-04 | src/host/desktop/native/host.test.ts；src/modules/browser/module.test.ts；src/modules/agent/services/terminal/sessions-space.test.ts；evidence/T-04.md#design-conformance | passed-code | 真实 helper 崩溃 |
| AC-059 | T-01 | src/modules/agent/services/controller-native.test.ts；src/shared/native/lazy-host.test.ts；evidence/T-01-logs/huhu-t01-startup-boundary.log；evidence/T-01.md#verification-v3 | passed-code | 真实宿主：仅启用其他页面时无 Agent/下载副作用 |
| AC-060 | T-04 | src/modules/agent/services/workspace-service-stop-native.test.ts；src/modules/agent/services/workspace-service-stop.test.ts | passed-code | 真实宿主重启后恢复 |
| AC-061 | T-18 | 各票 PAGE DOM/Chrome 证据；Round 2：`agent-workbench-coordination.mjs`（15 项，0 失败）、`agent-workbench-panels.mjs`（39 项，0 失败，含各宽度工具栏/窗格/标签栏/快捷命令 ≥44px 且不溢出标签栏）、`StatusDot.dom.test.tsx`、`SessionHistoryPanel.resume.dom.test.tsx`（确认对话框） | passed-code（F-1、S-1、P-2a、P-2b 已关闭） | 真实宿主视口/主题/键盘/截图（M-17） |
| AC-062 | T-17 | evidence/T-17.md | passed-code | 五平台下载/摘要/兼容 |
| AC-063 | T-18 | .github/workflows/terminal-build.yml；test/release/cli-assets-workflow.test.ts；test/release/platform-acceptance.test.ts；docs/agent-workbench-acceptance.md；scripts/verify-pty-helper.mjs | code deliverables complete; AC pending user E2E | 五组合真实端到端（M-01..M-17） |
| AC-064 | T-17 | evidence/T-17.md | passed-code | 真实宿主文案检查 |

## 跨票组合切片（Map §4）

| AC | 先行切片 | 最终组合 | 回读结论 |
|---|---|---|---|
| AC-002 | T-02 同 cwd 独立 Space | T-10 邮箱按显式 Space/Session 隔离 | 两票证据均 passed；全量 Vitest 同一输入上未失效 |
| AC-004 | T-02 GUI 引导 | T-07 CLI 缺目标/歧义 | 同上（`control-native.test.ts` 在 HUHU_TEST_* 二进制下 5 文件 17 测试通过） |
| AC-006 | T-03 后台创建 | T-07 CLI 创建无 Pane 的 B | 同上 |
| AC-021 | T-06 状态/未知/待处理 | T-08 CLI 阻塞拒绝 | 同上 |
| AC-046 | T-02 保存失败零启动 | T-10 通知提交/确认失败 | 同上 |

## NFR 闭包（代码层）

| NFR | 覆盖票 | 代码层结论 |
|---|---|---|
| NFR-001 有界容量与取消背压 | T-05/07/08/10/11 | 各票 Evidence 有界断言；全量 Vitest 与 native `cargo test`（173 通过）在固定输入上通过；真实负载归用户（M 清单无专门压测项，列为残余） |
| NFR-002 有限停止、残留可见 | T-04/12 | T-04 AC-027/056/058/060 passed-code；真实多平台进程树清理归用户 |
| NFR-003 本 Vault、凭证不入日志/备份 | T-02/07/11/12/15/16/17 | T-16 清单列 13 项排除；`check:notices`、docs 检查通过 |
| NFR-004 复用既有栈 | T-01/03/13/14/17 | 架构检查通过（1294 模块无区、宿主、桶、环违规） |
| NFR-005 主题/语言/焦点/减少动效 | UI 各票 | `test:i18n` 33 词典 5082 键通过；`test:ui-styles/adapters/runtime` 通过；Chrome 生产组件 harness 见页面审计；实机归用户（M-17） |
| NFR-006 效果与业务结果分离 | T-06/07/08 | 回执 phase/effect 断言见 T-07/T-08；实机 Provider 归用户 |
| NFR-007 五平台分层证据与来源 | T-17/18 | CI 五行配置核对 + 来源表见 T-17；五平台实机全部未运行 |

## AC-063 说明

AC-063 在本票的含义是“每个组合的代码路径、构建/验证配置与人工步骤可回读”，不是实机通过。证据：

- `.github/workflows/terminal-build.yml` 五行矩阵（ubuntu-22.04 x64、ubuntu-24.04-arm arm64、macos-15-intel x64、macos-15 arm64、windows-latest x64），含 `cargo test --locked`、release 构建、`verify-pty-helper.mjs`（helper+CLI）、打包 `.sha256` 与由已构建二进制生成的 `.compat.json`；
- 新增 `test/release/platform-acceptance.test.ts`：矩阵 runner/target/扩展名自洽，清单逐行包含 CI 的 runner、target、两个资产名且结果列均为“待填”，17 个场景齐全；
- `docs/agent-workbench-acceptance.md`：逐平台人工清单。
- 本机（Linux x64）实际执行：`cargo test --locked`（173 通过）、`cargo build --locked --release`、`node scripts/verify-pty-helper.mjs`（exit 0，CLI 0.0.1 protocol 1，helper linux 0.0.1）。其余四组合：CI 配置核对，**未运行**。

## Design Conformance（PAGE-001 / PAGE-002 / PAGE-003 / PAGE-004）

DESIGN revision 1，baseline DESIGN-0001，UI-001/candidate-a，摘要 `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab`，绑定 AC-061。下列均为生产组件的 DOM 测试与本机 Chrome 受控 harness（Obsidian/native/Provider 端口为 fixture），**不是**真实 Obsidian 宿主验收，也没有伪造截图；原型 mock 不作验收依据。

本次在固定输入上重跑：

| 命令 | 结果 |
|---|---|
| 全量 `pnpm exec vitest run`（首次，未设 HUHU_TEST_*） | 512 文件：506 通过、4 跳过、2 失败；4807 测试通过、6 失败。失败仅为 `host-editor.integration.test.ts`（5）与 `host-control.integration.test.ts`（1）缺 `HUHU_TEST_PTY_BINARY/HUHU_TEST_CONTROL_BINARY`（环境前置，非回归），exit 1 |
| 设置二进制后重跑这两个文件 + `sessions.e2e.test.ts` + `release-artifacts.test.ts` + `control-native.test.ts` | 5 文件 17 测试通过，exit 0 |
| `agent-workbench-screen.mjs` | 20 项检查，0 失败，exit 0 |
| `agent-workbench-panels.mjs`（需 `HUHU_PANELS_STYLES_SHA256`） | 30 项，exit 0；`--inbox` 变体 exit 0 |
| `agent-workbench-activity.mjs --enter-packet=complete` | 11 项，0 失败，exit 0 |
| `agent-workbench-coordination.mjs` | 14 项，**13 通过，1 失败**：`narrow controls at least 44 by 44`（F-1），exit 1 |
| `test:ui-styles` / `test:ui-adapters` / `test:ui-runtime` | 均通过 |
| `test:styles`（Round 1） | 失败：`styles.css` 缺 `.border-destructive/50`；Round 2 重建后通过（见 Round 2 表） |

harness 本身有两处漂移，已在本票写集内修复（均为测试装配，不改产品）：panels/coordination 的 obsidian 边界桩缺 `FileSystemAdapter` 导出；panels/coordination/activity 的浏览器 bundle 因 T-12 之后桌面模块（`native-reference/occupancy`、`hooks`、`system-homes`）在导入期引用 `node:*`，现统一用 `external: ['node:*']` 加 banner 代理，任何实际调用 Node 的路径会明确抛错，不会静默。

**F-1（Round 1 发现，Round 2 已修复，见文末）**：窄于 600px 时，工具栏“终端控制”按钮实测 32×32，DESIGN §5 与 `agent.css` 的 `@container agent-workspace (width < 600px)` 规则要求 ≥44×44。根因（Chrome 匹配规则回读）：共享 UI 的 `.huhu-ui :is(button, …)` 命中规则设置 `min-width/min-height: var(--nd-hit-size)`（非触屏为 32px），其选择器（`:is(...)` 取列表中最高特异度的成员）特异度高于 agent.css 的 `.huhu-ui .huhu-workspace-toolbar button`（0,2,1），尽管后者在样式表中更靠后，仍然落败（计算值 32px）。修复需改 `src/modules/agent/styles/agent.css`（提高特异度或改用 `--nd-hit-size`），不在本票写集；修复后需重建 `styles.css` 并重跑 coordination harness。同类规则（`.huhu-agent-pane-header button`、`[data-group-strip] button`）可能同受影响，panels harness 的关闭目标检查通过，不能由此推断其余按钮合格。

| 页面 | 状态/行为（DESIGN） | 生产组件与自动化证据 | 结论 |
|---|---|---|---|
| PAGE-001 空间/会话/终端面板 | default、empty、no-spaces、loading、disconnected、background、detached、stopped、restored、long-text、cross-space | `SpaceForm.dom`、`SpaceNavigation.dom`、`AgentSidebar.dom`、`NewTabMenu.dom`、`Omnibox.dom`、`TerminalTabView.dom`、`WorkspaceLayout.dom`、`WorkspaceToolbar.dom`、`AgentWorkspacePage.dom`；T-02/03/04/09 的 Chrome 图集（`T-0x-visual/`）；本次 panels harness 覆盖 empty/noSpace/loading/error/disconnected/stopped/restored、1440–390 视口、200% 缩放；`background`/`detached` 由 T-03 与 panels 的“关最后窗格后原运行仍 running” | 代码层通过；F-1 影响窄屏工具栏 |
| PAGE-002 当前 Vault 历史 | default、loading、empty、partial-error、missing-source、preview、resume-confirmation、resume-cancelled、resumed | `SessionHistoryPanel.dom`（默认/加载/错误/空搜索/部分失败汇总/键盘展开/导出可见性）、`SessionHistoryPanel.resume.dom`（确认含目录、取消不启动、Escape、焦点返回、冲突可关闭、导入、缺源不可继续） | 代码层通过。偏差待 Lead 判断：T-12 记录的继续确认是行内确认，DESIGN 写“确认对话框” |
| PAGE-003 控制/通知/审批 | default、input-submitted、waiting、matched、timeout、wait-cancelled、blocked、approved、denied、unread、read、acknowledged、notification-sent、stop-confirmation、stop-cancelled、retried | `TerminalControlPanel.dom`（显式目标、重名、取消/继续不重发、换代失效）、`InboxPanel.dom`（读取不确认、同名 Space、未知保留）、T-04 停止/归档确认与取消、T-06 待处理导航；本次 coordination（13/14）与 activity（11/11）、panels `--inbox` | 代码层通过；F-1 为该页窄屏唯一失败项 |
| PAGE-004 共享网页与恢复说明 | 网页独立、设置说明、导出清单、恢复 | `BrowserTabView.dom`、`BackupSection.dom`（loading/失败/清单含缺项/校验后才导入/损坏拒绝/部分导入重试/中英键一致）、`LegacyImportSection.dom`、T-13 无新增 UI | 代码层通过 |

i18n：`test:i18n` 33 词典 5082 键，占位符一致；`BackupSection.dom` 另断言中英键完全相同。可访问性：Dialog 焦点陷阱与 Escape 返回触发器、reduced-motion 真实 matchMedia、状态带文字标签均由上述 DOM/Chrome 检查覆盖。真实宿主视口、主题、IME、多窗口留给用户（M-17）。


## AC-063 补充：各平台代码路径

资产选择 `src/host/desktop/native/binary.ts` / `binary-cli.ts`（五个 `huhu-pty-*`、`huhu-*` 名称与 `.exe` 后缀）；控制通道 Unix 系 `native/pty-server/src/control/unix.rs`（Linux x64/arm64、macOS x64/arm64），Windows `native/pty-server/src/control/windows.rs`；CI 五行与 `verify-pty-helper.mjs`；用户清单 `docs/agent-workbench-acceptance.md`（已加“各平台的代码路径”表）。AC-063 本身需要用户在每个组合上的端到端结果，目前为空。

## Round 2（评审 121 request-changes 的处理）

DESIGN 决定：
- **P-2a**：T-12 的行内继续确认改为 AlertDialog 确认对话框（与 DESIGN 一致）。标题、目录、Provider 在对话框内；焦点默认落在“取消”（安全项）；取消与 Escape 经 `onCloseAutoFocus` 返回“继续”按钮；`SessionHistoryPanel.resume.dom.test.tsx` 更新（4 条用例）并通过。
- **P-2b**：状态不再只靠颜色。`StatusDot` 的 done=勾选圆、failed=叉圆、interrupted=暂停圆、idle=灰点、working=旋转、blocked/permission=问号、unknown=虚线圆；`aria-label` 与提示保留；侧栏与窗格头同一组件。`StatusDot.dom.test.tsx` 断言 7 个状态在 sm/md 两个尺寸下形状互不相同且带标签。

S-1 修复：
- 窗格标题按钮去掉固定 `min-h-8`，标签栏左右滚动按钮去掉 `min-h-8 min-w-8`（Tailwind 的 ID 级工具类会盖过 agent.css）；快捷命令外层由固定 `h-7` 改为 `min-h-7`，窄屏不再溢出标签栏。
- agent.css 窄屏规则改为三重根类（0,4,1），注释更正为：共享命中尺寸规则是 (0,3,1)，此前双根类是平手后靠源序取胜，现在不依赖顺序。
- 两个 harness 的窄屏几何检查扩展到工具栏、窗格头、标签栏、快捷命令和关闭按钮，并检查没有离开标签栏。未做反向对照（未恢复旧类名重跑）。

S-2：M-12 改为 `huhu --json message send --to-session … --stdin`（16 KiB 与 +1 字节），并说明 `agent prompt --text` 受 32768 字节请求上限；M-17 加入窄屏 44px 与状态形状；端口处理措辞改为“先释放端口，重启仅对短暂/残留 HUHU 占用者有效”（docs 与 data.md）。

Round 2 命令（Linux x64，固定输入如上）：

| 命令 | 退出 | 结果 |
|---|---|---|
| `tsc -p tsconfig.test.json --noEmit --skipLibCheck` | 0 | 通过 |
| `pnpm run lint` | 0 | 通过 |
| `pnpm run lint:css` | 0 | 22 文件，无新增违规 |
| `pnpm run test:styles` | 0 | styles.css 与 23 个来源一致（1,423,871 B） |
| `pnpm run test:i18n` | 0 | 33 词典 5082 键 |
| `test:architecture` / `test:ui-styles` | 0 / 0 | 通过 |
| `vitest run src/modules/agent/ui src/ui test/release` | 0 | 43 文件 337 测试通过 |
| coordination harness（TMPDIR=/tmp/c1） | 0 | 15 项，0 失败 |
| panels harness / `--inbox` | 0 / 0 | 39 项，0 失败 / 通过 |
| activity / screen harness | 0 / 0 | 11 项 / 通过 |
| `check-bundle.mjs --budget scripts/bundle-budget.json` | 0 | within limits；startup-evaluated 122.9 KB，lazy 6412.7 KB，agent 激活 1337.2 KB（+1539.6 KB 延迟）；Lead 于 Round 2 后重建 `main.js`（`13adfbab…`）并复测 `--enforce`：within limits |
| `pnpm run test:docs` | 1 | 仅剩 huhu-bot-architecture 输入文档的 6 个锚点（范围外） |
