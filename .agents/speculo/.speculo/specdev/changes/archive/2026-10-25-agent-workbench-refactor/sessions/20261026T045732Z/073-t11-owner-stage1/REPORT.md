# 任务回报

Session: 20261026T045732Z  
Task: 073-t11-owner-stage1  
Status: blocked

## 聚焦交接

本任务完成了 T11 当前票据、T11-preflight、037 safe-open design、041 safe-open review 与当前 T09/T10 动态接口/native 源的回读，并交付了当前写集内可闭合的历史增量；业务源在本报告前已停止写入。列表现在先取元数据，正文只在显式展开/preview 时读取；分页、取消、来源状态/provenance 与显式 Space adapter 已补上。route A SQLite F1/F2/F3 仍未闭合：OpenCode 生产摄入在 safe VFS gate 安装前明确 warning/拒绝，未把默认 VFS 读写冒称安全。需要扩写集和跨平台 SQLite owner/VFS 后才能解除本任务阻塞。

## 产物与验证

- 修改或成果：
  - `src/modules/agent/core/history/types.ts`：`HistorySourceStatus`/`HistoryProvenance` DTO。
  - `src/modules/agent/platform/desktop/server/agent-data-client.ts`：summary `sourceStatus/sourceRef/spaceId` 与 `HistoryFence`；`src/modules/agent/platform/history/service.ts` 向 native query 传 `expectedRevision`。
  - `src/modules/agent/services/history-store.ts`：metadata-only list、显式 `preview(key)`、generation/Abort 晚到写回门、首分页 revision fence；对应 `history-store.test.ts` 更新与 fence/preview fixture。
  - `src/modules/agent/services/control/history.ts`、`history.test.ts`：只读 CLI/control adapter；要求显式 `spaceId`，只接受 owner 回传的 Space 归属及 sourceRef，不从 cwd/current UI 猜测，不创建 Session/PTY。
  - `src/modules/agent/ui/history/SessionHistoryPanel.tsx` 与 `src/modules/agent/i18n.ts`：展开行触发 preview、来源状态中英文文案。
  - `native/pty-server/src/agent_data.rs`：有限 metadata-first admission（文本首部预算 64KiB；Gemini JSON 同预算；Grok metadata 先验），summary provenance 字段，revision fence 校验；OpenCode `execute(scan)` 在 route A 未安装时返回明确 warning 并跳过默认 SQLite VFS；新增 metadata-budget 与 SQLite-reject fixtures。
  - `native/pty-server/src/data.rs` 当前 dirty 是先前 T09/T10 共享改动，本任务未编辑；`main.js`/`styles.css`、依赖、正式 Evidence/Goal/Map/Ticket、用户数据与 Git 未改。
- 精确未闭 blocker：
  - **F1 SHM 副作用**：默认 SQLite `xShmMap` 可能在外层 provenance 检查返回前扩展/写入/建立映射；sidecar `symlink_metadata` 不能撤销该副作用，也没有当前 per-source `xShmUnmap`/清理 owner。
  - **F2 rejected-fd/同 inode 锁**：当前公开层拿不到默认 VFS fd/lock owner；拒绝后直接 `close(2)` 可能清掉本进程另一个 SQLite 连接的 POSIX 锁，不 close 又会无界悬挂。路径 canonicalize 与 `data.rs` writer mutex 不提供该证明。
  - **F3 SQLite close vs OS close**：rusqlite Connection close/Drop 只覆盖 SQLite handle；默认 VFS 可能延迟 fd、吞 OS close 错误或复用 fd，当前没有稳定 router 的底层 close owner/error telemetry。
  - 最小新增写集建议已回报 Root：`native/pty-server/src/history_source.rs`（SourceRoot/SourceSqlite owner/VFS gate）、`native/pty-server/src/history_sqlite_unix.rs`、`native/pty-server/src/history_sqlite_windows.rs`、`native/pty-server/src/lib.rs` module wiring、native fixture tests；若共享 SQLite 使用者必须纳入，还需 `native/pty-server/src/cookies.rs` 与其 tests。未自行改 Ticket/写集。
- 实际验证：
  - `pnpm exec vitest run src/modules/agent/services/history-store.test.ts src/modules/agent/services/control/history.test.ts src/modules/agent/platform/desktop/server/native-history.test.ts`：最终 exit 0，3 files/10 tests。
  - `cargo test --locked agent_data::tests`（`native/pty-server`）：最终 exit 0，23 passed/0 failed；覆盖 metadata budget、SQLite explicit reject、现有 scope/sidecar/summary 回归。
  - `pnpm exec tsc --noEmit --skipLibCheck`：exit 0。
  - `pnpm exec eslint --no-warn-ignored <affected source/tests>`：exit 0。
  - `pnpm test:architecture && pnpm test:i18n && git diff --check`：exit 0；architecture 1254 modules/no violations，i18n 31 dictionaries/4823 keys，diff check clean。
  - `pnpm exec prettier --write <affected TS>`：exit 0；首次 `prettier --check` 曾 exit 126 并报 7 个未格式化文件，已修复后重跑 ESLint/TS/tests。
  - 首轮 Vitest 在新 fence fixture 混合 account/vault 调用时 exit 1，已修正后最终通过；一次 `cargo test` 传两个 TESTNAME 参数 exit 1（命令用法），未被计为测试结果，随后单一过滤完整通过。
- 未完成或未验证：未运行完整 `pnpm test`、`pnpm run lint`、`pnpm run build`、Windows/macOS/native 五平台、真实 Obsidian/Provider/CLI/IME/PTY、真实 Vault/账号；未把 037 旧 probe exit 0 当作当前 route A 通过。CLI adapter 尚未接入 `commands.ts`/generated control schema，因为该路径不在本票冻结 writable_paths。

## 问题与下一步

当前状态是 blocked：业务历史增量可由 Root 回读，但 T11 首阶段不能宣称 fail-closed SQLite source admission。恢复条件是 Lead 扩写并冻结跨平台 VFS/router 与 SourceSqlite 生命周期 owner，覆盖 F1 `xShmMap` 前门/拒绝清理、F2 rejected-fd 同 inode 锁归属、F3 SQLite/OS close 事实及 shared cache/Cookie consumers；之后以隔离 mixed-source/SHM/close failure fixtures 证明 source 无外部读写删、原连接锁保持、资源有界，再恢复 OpenCode 与后续完整 T11 接线。SOURCE STOPPED；本任务未修改正式状态。
