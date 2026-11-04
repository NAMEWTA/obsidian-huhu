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
