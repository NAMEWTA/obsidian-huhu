# T09 第二轮完整独立双轴审查

Session: 20261026T045732Z
Task: 043-t09-full-review-r2
Status: completed

Reviewer: `codex:/root/review_t10_plan`，用户指定 `gpt-6-astra/high`；未参与 T09 实现、039 修复或 042 修复。
Review mode: 只读固定输入审查；不修改产品、Ticket、Map、正式 Evidence 或旧报告。

## 聚焦交接

本轮完整核对固定 R2 语义包及其 57 条产品路径的 before/after 快照、完整源码/生成物 diff、Spec/Ticket/Engineering Packet、039/042 交接和 Root integration3 构建/预算/架构/CLI-native/生产 DOM-Chrome 证据。标准轴结论为 `pass`，规范轴结论为 `pass`，未发现需要 request-changes 的 material finding。036 R1 的 F1（非活动 group/foreground API 接缝）与 F2（4096 全局准入）均在当前候选中有相应修复证据；历史红灯仍作为历史证据保留，不重分类为最终通过或重新计数。真实 Obsidian、Provider、OS IME、五平台和用户指定端到端仍按合同未运行。

## 产物与验证

### 固定输入与范围

- 任务文件：`.../sessions/20261026T045732Z/043-t09-full-review-r2/TASK.md`，实际 SHA256 `242904ee77a042731a65b30b5bc91564332317cdbbcffdf593d810c33b291793`。
- 任务声明的规范化 Input-SHA256：`93e1e440fedd424babf8db69d571b33e010c5a0d5cb2bfbed66dbf582f9bb2e3`。
- 固定语义包 `evidence/T-09-review-input-r2.json`：文件 SHA256 `4ba9030e5dfbcf80b55844fea0aceb63278f29f405eae5182733800d3574a816`；包内 final manifest SHA `cb4b6c44f7b6e9dd810f201c8973af5daea79fd5a4fd0d655f7503b22780b0f9`。
- 固定 canonical markdown `evidence/T-09-review-input-round2.md`：SHA256 `6ff3c59394fa26c984733c43f49c42e3d823f5ffb27627f3d2cc0bca3af010e7`。
- 固定 final manifest `/tmp/huhu-t09-root-integration3-postchecks-inputs.json` 与任务声明 SHA 一致；Root 记录 `outside_allocation_changes: []`、final source drift `[]`。

R2 `files` 数为 57，覆盖 A14/B18/U20/Root5 的完整写集；新路径 8，既有路径 49。106 个存在的 before/after snapshot 全部按 descriptor SHA256 重新核对，0 个 hash error；8 个新增路径的 before 按 packet 标为 missing。所有文件的完整差异以固定 `T09-complete-source.diff`（SHA `62038e67e0260b813e2b063f6163184eb4760343e3accc88bf65351231dfc372`）读取，生成物差异以 `T09-generated-artifacts.diff`（SHA `5f4819242556240c2403334dc87172e07b7b9043f0071c49097be27ba1bd867e`）读取。快照核验、每文件行数和路径清单保存在新临时证据 `/tmp/huhu-t09-r2-review-20261027/`，不属于正式 Evidence。

完整读回的规范与依据包括：AGENTS、dev/ui 规则及 architecture/testing/licensing/build/shell/design-system/motion-a11y；Spec、implementation-contracts、ADR、CONTEXT、reference-notes、tickets-map、goal-plan、T-09 Ticket、DESIGN revision1、UI-001 approval/design-system/approval-ui/PAGE-003 及 T-09 engineering packet。完整证据来源含 036 R1、039、042 报告和 Root integration3 receipts；没有消费 039 正在修改的工作副本。

### Standards axis: PASS

逐项核对结果如下：

- **功能与容量：** `pane-identity.ts` 的 4096 有界计数和 WorkspaceStore 的 `checkPaneCapacity` 统一覆盖真实 active Space、shared view、draft 优先与候选发布；`editLayout`、同步 `updateLayout`、Pane API `attach/split`、GUI direct attach/split/reopen 均在发布前重核。达到 4096 后新增拒绝不写，旧超限图允许减少叶恢复；042 的容量红绿证据包含满额 split、last-slot、跨 Space 竞争、GUI attach、reopen 与 old-overlimit recovery。没有发现只查 local Space 或只查 pre-index 的复现路径。
- **身份、group 和 foreground：** 新叶 ID 只在明确 mutation 物化，legacy ID 读时投影；close/reopen 不复活旧 ID。`ensureManagedPane` 原样传 groupId；Pane attach 对显式 group 在队列内重核并返回 `TARGET_NOT_FOUND/missing-group`，不存在时不回退 active group。focus 仍经 `ForegroundIntent`、consumed 观察和绝对 deadline；layout selection 与实际终端焦点分离。042 004/005/008 及 Root Chrome pointer/group/focus 证据均闭合。
- **并发、晚到和取消：** Space-specific edit tail、pending save、remote merge、signal/deadline 复核和 candidate publish 由原 WorkspaceStore 持有；split 的 spawn 后竞争保持已发生 runtime 事实、发布前拒绝新增叶，不假称 spawn 未发生或自动 stop。`WorkspacePanes` capture 使用 WeakSet 捕获对象和 runtime/session generation，延迟操作重核 scope/identity；没有新 writer 或第二 persistence manager。
- **持久化、dirty drafts、effect：** 布局查询只读 snapshot；mutation 走 `editLayout`/原 `saveLayout` 与 reconciliation，成功保存点设置 persisted，后续 rebase/观察错误保留事实。close/reduction 不触发新增容量准入，故旧超限图可恢复；保存只作用于目标 Space，不全局 flush 无关 Space。
- **错误、清理和模块边界：** 统一 `PaneCommandError`、WorkspaceStore owner、ControlCommands 薄适配和 controller 原装配；CLI/GUI 共用 WorkspaceService.panes。所有新增 focus observers、ResizeObserver、Chrome/server/profile 在 fixed receipts 中有 cleanup/drift 证据。没有发现 runtime stop/archive/delete 被 Pane close 偷换，亦没有新增 Pane DB、Outbox、缓存 writer 或跨层复制 DTO。
- **协议、CLI/native 和生成物：** canonical schema、TS wire、Rust descriptor/CLI、fixtures、control tests 与 ControlCommands/Router 同步；pane target 不继承 caller Session/runtime，只有 `pane.list` 可用显式或当前 Space hint，split 的 source Pane 与 inserted Session 分开返回。Root final architecture2 exit 0、bundle budget2 exit 0，生成物 diff 已被固定输入纳入。
- **测试与真实受控 UI：** 042 final owner/GUI/foreground 149/149、Pane 24/24、types/lint 均有 receipt。Root integration3 Chrome2 exit 0，30 项 production checks、实际 pointer pane/group resize、tab drag、last-pane detach、empty/noSpace/loading/error/disconnected/stopped/restored、200% reflow、reduced-motion 均 `ok: true`；cleanup browsers/server/errors 全部闭合。受控 Chrome 不冒称真实宿主 E2E。
- **预算和结构：** Root `test:architecture` 及 `check:bundle --enforce` 均 exit 0；预算按最小 KiB 上调且有 T09 attribution 记录，未发现 forbidden eager area、依赖锁或第三方许可未解释的路径。

### Specification axis: PASS

- **范围与 AC：** 57 路径均属于 T-09 Ticket 的 IN（Space/Session 导航、控制抽屉、面板命令、焦点/宽窄/主题）和 REUSE（原 tabs/groups/shortcuts/store）；没有发现把 T-10 inbox、T-13 browser 或用户真实宿主验收写入 T-09 产品路径。AC-009 的 GUI/CLI 同一 WorkspaceService 与稳定 Pane identity 在 A/B/U/Root 接缝均可追溯；AC-061 页面部分由最终 DOM/Chrome 证据覆盖，真实 E2E 留给用户。
- **所有权与写集：** 真实 allocation 为 A14/B18/U20/Root5，57 个路径唯一；Root 仅拥有 main.js/styles.css/budget/notices/vitest config，B 独占 canonical/生成物/native/CLI adapter，U 独占生产 UI/i18n/Chrome，A 独占原 WorkspaceStore/WorkspaceService/Pane identity。R2 final manifest outside allocation 为空，没有隐含额外 writer。
- **Space 语义和 CLI/native 兼容：** pane.list 默认冻结调用 Space，其他 Pane target 不从 cwd/caller Session/runtime 推断；native parser 明确 pane operation target required/控制字符/无关字段拒绝，opaque Pane ID 保留 UTF-8 4096-byte 边界。GUI 与 CLI 返回完整源 Pane/insertedPane 身份，未把源 ID 和插入 Session 拼为伪 target。close 仅 detach；Session/Space 归属和后台 runtime 保留。
- **UI/design 合同：** WorkspaceLayout/TerminalTabView 使用真实 React resizable panels、原 Shell 600/960 档位、312px/窄 Dialog、Pane header 与焦点/键盘/200%/reduced-motion 要求；PAGE-001/PAGE-003、DESIGN candidate-a 和本票 Design Conformance 约束均被固定输入和最终受控 Chrome 消费。未以 prototype mock 代替生产页面。
- **验证 disposition：** fixed packet 明确历史 worker/fixture failure 不得冒充 final green；Root integration3 receipts 是最终候选检查。`Real Obsidian`、`Real Provider`、`OS IME/preedit`、`five-platform live acceptance` 未运行，符合 Ticket 与 Spec 的用户-owned E2E disposition。036 两轴 R1 的 F1/F2 作为历史 request-changes 保留；当前对应来源、测试和整合证据显示已关闭。

## Findings

无。两轴均 `pass`。

## 未运行项与限制

本轮没有运行 build、lint、Vitest、Rust/Cargo、Native helper、Chrome、formatter、generator、Git 变更命令或任何产品入口；所有最终检查结论均来自固定 Root/worker receipts，不将静态审查冒称重新执行。未运行真实 Obsidian、Provider、OS IME/preedit 或五平台 live acceptance；用户仍需按既定合同执行。没有执行修改、提交、推送、发布、正式状态或 Evidence 更新。

## 问题与下一步

无审查阻塞。Root 可按固定 R2 报告结果继续其正式 T09 DoR/状态流程；不要把本报告的双轴 pass 直接当作用户真实 E2E 通过或 T10 Ready。此报告交回后停止源码读取。
