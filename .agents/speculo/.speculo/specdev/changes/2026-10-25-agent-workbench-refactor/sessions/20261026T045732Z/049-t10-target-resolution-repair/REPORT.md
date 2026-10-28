# 任务回报

Session: 20261026T045732Z
Task: 049-t10-target-resolution-repair
Status: completed

## 聚焦交接
已按 implementation-contracts §2/§4.1 与 B10 真实 CLI/schema 修复 Control inbox 的 Session→原 Space 解析：`message.send --to-session` 与 `inbox list --session` 只需稳定 `sessionId`，从持久 `records.sessions[sessionId].spaceId` 得到 Space，不读取 cwd、当前选择或当前界面；旧入口缺 Session 仍为 `TARGET_REQUIRED`。message-only read/ack 继续按存储消息原收件人，显式 session-only/full target 会校验归属且不要求 runtime；send/list 返回 resolved `{spaceId,sessionId}`。已加入目标 mismatch/missing、同 cwd 不同 Space、消失目标、body/reference 本地失败的 messageId 身份测试，源停点为 2026-10-26T20:51:57Z；候选交回 Lead，canonical 四项 `available:false` 保持不变。

## 产物与验证
- 修改或成果：
  - `src/modules/agent/services/control/inbox.ts`：session-only target 解析持久 Space；显式 Space mismatch、归档/缺失目标、message-only read/ack target 校验；send 在 body/reference/target/service 错误后保留 messageId、已解析 recipient、text/diagnostic；既有 ack/paging/unknown 语义保留。
  - `src/modules/agent/services/control/inbox.test.ts`：CLI-shaped session-only send/list、同 cwd 双 Space、旧缺 Session、target mismatch/missing、message-only read mismatch、capture 后目标消失、malformed body/reference identity 测试；实际 Router→ControlCommands→InboxService seam 仍覆盖。
  - `src/modules/agent/services/control/control-inbox-native.test.ts`：canonical wire 编解码回归改为 session-only send/list target，并继续断言四项 `available:false`。
  - 未写 schema/generated、B10 CLI/native、A17 service、controller、A/U/Root、正式状态/Evidence/Goal/Map/Ticket、main/styles/依赖/Git index。
- 验证：
  - `pnpm exec vitest run src/modules/agent/services/control/inbox.test.ts src/modules/agent/services/control/control-inbox-native.test.ts src/modules/agent/services/control/paging.test.ts src/modules/agent/services/control/commands.test.ts src/modules/agent/services/control/router.test.ts test/native/control-protocol.test.ts --testTimeout=30000`；cwd `/home/wta/orca/workspaces/obsidian-huhu/terminal`；退出码 `0`；6 files / 39 tests passed。
  - `pnpm test:architecture`；退出码 `0`；`Architecture: 1253 modules; no zone, host-package, desktop-only, barrel or cycle violations.`
  - `pnpm exec eslint src/modules/agent/services/control/inbox.ts`；退出码 `0`；无输出/无警告。
  - `pnpm exec tsc -p tsconfig.test.json --noEmit --skipLibCheck`；退出码 `0`；无诊断。
- 未完成或未验证：未运行 full plugin build/lint、未重建 `main.js`/`styles.css`、未运行 cargo/native helper、未改或运行 CLI/native 实现、未做真实 CLI→Host→Controller 实例装配、U14 consumer、UI/Chrome、真实 Obsidian/Vault/Provider、OS IME、五平台宿主或独立双轴 review；未声称这些通过。A17 `InboxService.send` 无 AbortSignal 参数的既有限制仍由 046 REPORT 记录，本修复未越写集修改共享 contract。

## 问题与下一步
无本阶段源阻塞。请 Lead 回读 049 允许路径与 39 项 focused 证据，确认真实 Controller 继续注入唯一 `InboxService`、session-only CLI target 在最终 Host seam 解析持久 Space、旧无 Session 入口保持 `TARGET_REQUIRED`，并继续保持 availability=false 直至生产 consumer 闭合。`completed` 仅表示候选交回，业务完成由 Lead 验收。
