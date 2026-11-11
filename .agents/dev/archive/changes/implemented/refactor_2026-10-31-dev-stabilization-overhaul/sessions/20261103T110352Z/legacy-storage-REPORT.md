# legacy-storage 区域报告（safe + versioning + storage + host + 其余）

## 删除/改写

- safe：删除 `core/migration.ts`、`core/migration.test.ts`、`fixtures/v1-vault.json`；`crypto.ts` 直接 `validatePayload`（只认载荷版本 3，其余为 `invalid-format`）；`safe-service.ts` 去掉 `upgradePending`/`upgraded` 状态与 preupgrade 副本；`cipher-repository.ts` 的 `commitKeeping` 只剩 `preimport`；`cipher-files.ts` 文件名白名单去掉 `preupgrade-`；`SafePage.tsx` 去掉升级提示；`i18n.ts` 删除 `safe.upgradeNotice`（en/zh）；测试改为旧结构被拒绝且不写文件。
- versioning：`device-state.ts` 去掉 `.git/huhu-sync.json` 迁移（回执、rename、恢复副本）；`GitHost.loadDevice(cwd)` 去掉 legacyPath；`sync-service.ts` 去掉 `STATE_FILE`；`device-state.test.ts` 重写为当前行为。
- shared/storage：`vault-identity.ts` 删除 `legacyDeviceId`；`recovery-contracts.ts` 注释去掉旧迁移说明。
- host：`device-id.ts` 不再读/清 localStorage `huhu.device-id`；`preferences.ts` 去掉 localStorage 迁移与 `migrated` 字段，`LEGACY_PREFERENCE_KEYS` 改名 `PREFERENCE_KEYS`；`native/binary.ts` 去掉 `legacy-plugin` 旧目录字节复用；`huhu-paths.ts` 注释；删除无引用的 `secret-protector.ts`。
- 测试/脚本：`test/fixtures/vault-storage.ts`、`src/app/settings/runtime.test.ts`（改用真实 deviceId）、`scripts/obsidian-acceptance/vault-storage.mjs`（去掉旧偏好/旧 Git 状态迁移检查）。
- 文档：`docs/safe.md`（删升级章节、preupgrade 行、旧版备份导入）、`docs/settings.md`（删「升级后的设置」）、`docs/sync.md`（删「设置与升级边界」、状态迁移句）。

## 保留（理由）

- `.huhu/migrations/` 排除与 `vault-layout.ts` 的 `migrations` 路径：仍被 agent/archives/home 使用，由其区域处理。
- `shared/native` 的 `legacy-helper`、control-wire legacy 帧判别、`helper-*` 测试中的 legacy 分支：属现行 helper 协议对缺能力对端的降级，未删，建议另行评估。
- `onWindowMigrated`（窗口迁移）、`content-moves`（用户移动文件）、automations 中无 Space 的已接受调用历史测试：非旧数据迁移。
- `scripts/regressions/issue-content-targets.mjs` 验证旧 Markdown 不被导入，属当前行为。
- `docs/data.md` 第 71/170 行等归属 home/archives；`scripts/ui-review/fixtures/T-29.tsx` 仍带 `migrated: true` 字段（无害，待 home/ui 区域清理）。

## 行为变化

- 旧结构（载荷版本 1/2 或无版本）保险箱解锁/导入：报 `invalid-format`，原文件不改写。
- 旧 `.git/huhu-sync.json`、localStorage 偏好与设备 id 不再读取；设备 id 首次随机生成。

## 验证

- tsc 两个：本区域无错误（仓库其他错误来自 archives/home 在途改动）。
- vitest（safe/versioning/shared/host/app/test/sync/test/fixtures/automations/task/notifications，设置了 HUHU_TEST_*_BINARY）：1288 通过，4 失败，均非本次改动：`obsidian-status.dom.test.tsx`（usage 按钮）、`automations/.../precheck.test.ts` 3 例（进程回收）。
- eslint 改动文件 0 警告（测试文件被忽略模式跳过）；`test:i18n`、`test:docs`、`test:architecture` 通过。
- `test:safety-regressions` 失败于 `scripts/regressions/dashboard-conflict.mjs`（home 区域在途改动），未能越过该项。

## 第二轮：native 协议 legacy 分支（结论：未删除，需 Lead 决定范围）

核对结果（未改任何文件，因此未跑 cargo/vitest）：

- `control-wire.ts` 的 "legacy" 指 `{type: ...}` 形式的 JSON 控制消息（如 `history-result`）。Rust `control/codec.rs` 的 "legacy control dispatcher" 仍是这些消息的现行派发路径，不是旧 helper 兼容，必须保留。`frames.test.ts`、`control-wire.test.ts` 里对应用例是现行语义测试。
- `termination.ts` 的 `'legacy-helper'` 是协议枚举值，Rust `session.rs` 的校验白名单和 `sessions.ts` 的退出兜底都在用。兜底在 helper 未发出终止证据就退出时触发，现行 helper 崩溃也会走到，因此不是只服务旧 helper；仅名字有误导。改名要同步 Rust 白名单、夹具和 TS 类型。
- `session.rs` 的 `legacy()` 是无准入的输入写入入口，被 `write()` 用，属现行实现。
- 真正只服务旧 helper 的是握手能力协商：`helper.ts` 的 `inputAdmission` / `outputAbandon` / `replySettlement` / `localControl` / `editorTransactions` / `terminalTermination` 降级分支。插件发出 hello 时总是请求全部能力，Rust 只回显插件请求过的能力。要改成“能力必须齐全，否则按协议不符报错”，需同时改：
  - `helper.ts`（31 处）、`host.ts`（17 处）、`agent/services/terminal/session(s).ts`（7 处）；
  - `helper-stream.test.ts` 里 `helperFixture(false)` 等降级用例（至少 11 处）；
  - Rust `main.rs` 握手的条件回显，其中 `terminalTermination` 在 `platform` 不一致时被有意忽略，不能一概当旧兼容。
- `test/fixtures/native/*-v1.json`：当前协议版本的夹具，保留。
- `scripts/generate-control-protocol.mjs` 只含一句注释里的 "legacy"，不涉及兼容逻辑。

未执行原因：上述改动横跨 TS 宿主、agent 终端服务和 Rust 握手，影响面大，需要你确认是否按“能力齐全才接受 helper”的方案推进，我再单独做并跑 cargo test、`check:native` 与带二进制的 vitest。

## 第三轮：helper 握手能力必须齐全

- `src/host/desktop/native/helper.ts`：握手后若 helper 未声明 `inputAdmission`、`outputAbandon`、`replySettlement`、`localControl`、`editorTransactions` 或未给出有效 `inputLimits`，按启动失败报错（"does not declare the required capabilities ... Install the matching release"）。这五项在 `PtyHelper` 上改为恒为 1，删除 `input`/`resize` 的无准入旧写入分支、`encodeInput` 回复回退、`unsupported` 提交回退、`?? NATIVE_INPUT_LIMITS` 兜底及各处 `=== 1` 判断。`terminalTermination` 仍按平台一致才启用（保留）。
- 测试：新增 `test/fixtures/native/hello.ts`（当前握手夹具），`helper*.test.ts`、`host-control.test.ts` 的 hello 改用它；`helper-stream.test.ts` 删除 legacy 提交与"无新 wire 的旧对端"用例，旧的降级用例改为"能力不全即报错"回归（修复前 `helperFixture(false)` 可正常启动，修复后拒绝）；`helper-editor.test.ts` 一例因终止栅栏现恒协商，补上终止与回复栅栏的驱动。
- 保留：`host.ts`、`shared/native/host.ts`、agent 终端端口里的可选能力字段与 `=== 1` 判断。它们是 NativeHost/端口抽象，大量 agent 测试用不带这些能力的模拟 helper，真实 `PtyHelper` 已恒满足；清理它们需重写这些模拟，收益小，未动。
- Rust：`main.rs` 握手按插件请求回显能力的逻辑未改。`huhu` 控制客户端等其他对端仍可能只请求部分能力，裁剪对其有意义；当前插件请求全部能力，因此行为不变。Rust 无仅为旧插件存在的分支，`cargo test` 全部通过。
- 验证：`cargo test` 通过；`vitest run src/shared/native src/host src/modules/agent`（带二进制）1647 通过，1 例失败 `agent/platform/history/ownership.test.ts` 为 5s 超时（单独运行 4.4s 通过，与真实 helper 启动负载相关，非本次逻辑）；`check:native` 通过；两个 tsc 本区域无错误；`helper.ts` eslint 零警告；`test:architecture` 通过。

## 第四轮：宿主与 Agent 会话层的"能力缺失"分支

- 类型：`shared/native/host.ts` 的 `NativeConnection`/`NativeTransport` 中 `editorTransactions`、`replySettlement`、`outputAbandon`、`inputAdmission`、`localControl` 改为必需的 `1`，`inputLimits`、`abandonOutput`、`editorBinding`、`submitInput`、`submitResize`、`reply`、`prepareControl` 改为必需；`SessionPort`（`agent/services/terminal/session.ts`）同样。`terminalTermination`、`requestStop` 仍可选（平台差异，保留）。
- `host/desktop/native/host.ts`：删除 `localControl`/`replySettlement`/`editorTransactions` 的 `=== 1` 判断与缺能力分支，连接对象直接声明全部能力；`submitInput`/`submitResize`/`reply` 直接转发给 helper，不再有 `unsupported` 结果与 `reply ?? input` 回退；`ioDrained`、`retire` 恒要求输出已确认与回复栅栏。`finishDrain` 在无终止能力（平台不一致）时不再要求终止通知，与 `exit` 处理一致。
- `agent/services/terminal/session.ts`、`sessions.ts`：删除 `input()` 的无准入旧写入分支及 `legacy-unconfirmed` 诊断类型、`submitInput` 的 `none('unsupported')`、`submitResize` 缺能力分支及 `'unsupported'` 结果（`ScreenGeometryResult.native` 与 `requestSize` 的联合类型同步收窄）、`outputAbandon`/`editorTransactions` 的条件判断、`reply ?? input` 回退。`NativeInputNoneReason` 的 `'unsupported'` 是 helper 线上协议值，保留。
- 测试：新增 `test/fixtures/native/current.ts`（`CURRENT_NATIVE` 当前能力模拟，`settledExit` 在退出后补回复栅栏），约 30 个测试文件的模拟 helper/端口展开 `CURRENT_NATIVE` 并在退出处用 `settledExit`；删除 `sessions-control.test.ts` 的 `capability-absent` 场景（只验证能力缺失）；少数用例补回复栅栏或让 `submitResize` 保持挂起以保持原断言。
- 复查：`rg "inputAdmission|outputAbandon|replySettlement|localControl|editorTransactions" src --glob '!**/*.test.*'` 仅剩类型声明、握手请求/校验和 `PtyHelper`/`NativeHost` 的恒定声明。
- 验证：两个 tsc 在这些目录无错误；带二进制的 `vitest run src/shared/native src/host src/modules/agent test/agent test/agent-backup` 1744 通过，1 例失败仍是 `ownership.test.ts` 的 5s 超时（单独约 4.4s 通过）；`check:native`、`test:architecture` 通过；改动源文件 eslint 零警告。未再改 Rust。
