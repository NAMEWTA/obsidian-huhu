# 旧数据兼容整体删除：检验结论报告

Lead: host:claude-code/root。日期：2026-11-04。依据：用户 2026-11-04 指示"针对旧数据的问题，请你完成整体的重构删除，无需兼容任何旧数据……不需要什么 V1 适配，因为我还没有最终发版"；ADR-011（发布前无历史兼容义务）。执行：4 个 sonnet 执行者按区域并行（agent、archives、home+comments+icons+navigator、safe+versioning+storage+host），派遣约束见 `sessions/20261103T110352Z/LEGACY-REMOVAL.md`，各区域报告见同目录 `legacy-<area>-REPORT.md`。

## 结论

Result: passed。发布前旧持久化格式、旧路径/设置键、版本升级链、旧数据导入界面、旧 helper 降级路径与旧字段兜底已删除；遇到旧数据时走当前"无效/损坏/不可识别"路径，不覆盖、不静默改写用户文件。当前有效数据写入、隐私、权限与外部动作安全未降级（一处删除误伤已发现并修复，见"回归与修复"）。

## 提交

| 提交 | 区域 | 主要删除 |
|---|---|---|
| b79c3e3 | storage | 保险箱升级链（只认当前载荷版本，旧结构 invalid-format 拒绝）、`.git/huhu-sync.json` 迁移、`legacyDeviceId` 与 localStorage 迁移、旧偏好迁移、legacy-plugin 助手复用、无引用 secret-protector |
| bbf9556 | agent | 旧工作台导入链、旧默认账号/historyAccountEnv/旧会话回落、v1 写入口、旧数据导入设置页 |
| 634099e | archives | v1 个人/企业适配器、迁移预检、整套无生产引用的 v1 并行实现与 golden |
| 876bd4d | home | 旧看板转 grid、widget 迁移、退役 widget 替换、旧 tile/成员/weather kind 兼容、评论 v1/v2 迁移与备份 |
| 2e171b4 | agent | 恢复 owner 目录 migrations→recovery，fault-storage 夹具移出 agent-migrations |
| d2e74f4 | archives | 旧删除端口、person/company 旧导航映射、query.kind/selectedPath 回退与旧 stateKeys；补 5 项资源导入测试 |
| 158638f | home | 退役 TickTick/微信读书集成（含凭据字段、286 个词典键）；设置归一化只保留当前字段（防旧凭据写回库内设置） |
| f0dfaad、a8df267 | native | helper 握手缺必需能力即启动失败；宿主与会话层能力改为必需、删除能力缺失降级分支；验收清单删除旧迁移场景并重编号 |
| c05d522 | home | 资料库模板只读写 templatePaths；pipeline 删除 templatePath 回退、sortBy ctime 与单数 filter 旧形态 |
| 5e86577 | agent | Space 记录 inbox 必需，缺失按 inbox-invalid |
| fae97ef | home | 修复 replaceData 误删（见下）并补单元回归 |

## 回归与修复

- `pnpm test:safety-regressions` 的 dashboard-conflict 失败。用带 TS 加载器的 worktree 二分定位到 876bd4d：执行者用 `sed` 按关键词删除 `freezeLegacyWeatherLocations` 调用时误删了 `SyncEngine.replaceData` 中唯一的 `this.data = …newData`，导致看板编辑不采用新数据。修复为补回 `this.data = newData;`；新增 `src/modules/home/platform/board/sync-replace.test.ts`，去掉修复时失败、恢复后通过。另对全部删除提交中"赋值包裹旧函数"的被删行做了审计，其余均位于整段删除的旧函数内部或已有等价赋值。
- `test/release/platform-acceptance.test.ts`：验收清单删除旧迁移场景后编号断档且仍要求"迁移"主题，已重编号并移除该主题。

## 保留项（现行逻辑，非旧数据）

档案用户自定义类型的 schema 升级恢复（`migrations/` 路径、pending-migration 诊断）；native control-wire JSON 控制消息、`'legacy-helper'` 枚举与崩溃兜底、`session.rs` 输入入口、按平台忽略的 terminalTermination；终端 legacy 键盘编码；`legacyPaneId` 位置派生；Obsidian `onWindowMigrated`；Gemini CLI 旧项目哈希目录读取（第三方工具数据）；评论 `legacy` 颜色 id（表示无颜色）；navigator 可丢弃缓存版本重建；Agent 交互式启动 API 内部名 `admitLegacyLaunch`/`legacyManagedResult`（现行路径，仅命名含 legacy）。

## 验证（最终，低负载）

`pnpm exec tsc -noEmit -skipLibCheck`、`tsc -p tsconfig.test.json`、`pnpm build`、`pnpm lint`、`pnpm test:docs`、`pnpm test:i18n`、`pnpm check:bundle`、`pnpm check:notices`、`pnpm test:license-texts`、`pnpm test:architecture`、`pnpm run check:native`、`pnpm test:safety-regressions`（7/7）、`pnpm test:dashboard-isolation`、`pnpm test:weather-mapping` 均为 0；全量 `pnpm test`（带原生 helper 环境变量）结果见本文件末节。高负载并发时出现的超时类失败均在低负载单独重跑通过（12 文件 166 例）。

## 未验证项

真实 Obsidian 宿主与 Windows/macOS 实机未运行；本轮未触发远程 CI。旧凭据可能残留在开发者本机设备设置文件中：现已不被读取，且下次保存时不再写回。

## 全量测试最终结果

两次低负载干净全量 `pnpm test`（带 HUHU_TEST_PTY_BINARY/HUHU_TEST_CONTROL_BINARY）：各 4079 例通过、41 跳过，每次各有 1 例时序敏感用例失败且不相同——第一次 `automations/platform/desktop/precheck.test.ts`（650ms 上限，单独连跑 5/5 通过；本轮对其仅有 `shared/native/host.ts` 类型声明改动，无运行时影响），第二次 `agent/platform/history/ownership.test.ts`（5 秒默认上限；HEAD 单独约 2.8s，本轮开始前 e81cd32 约 3.9s，未变慢）。二者为既有的负载敏感用例，与旧数据删除无关；未放宽任何时限或断言。`pnpm build` 0（含 `tsc -p tsconfig.test.json`，修正了新增 sync-replace 测试的类型）。

## 干净全量通过记录（补充）

- `agent/platform/history/ownership.test.ts` 在 4 次默认并行全量运行中 3 次超过 5 秒默认上限。对照测量：本轮开始前 e81cd32 单独 3604–4887ms，HEAD 单独 4177–5014ms，无可测差异，属既有问题——用例执行 5 次历史操作，每次对全部 Agent 账号做真实文件系统解析与符号链接校验（安全校验，不能以缓存省略）。按项目惯例（真实进程/文件系统集成用例逐条声明时限，如 hooks 与 documentation-checker 的 30000）为该条声明 30000，断言与全局配置不变。
- 清理了残留 10 小时的 UI runner 无头 Chrome（`/tmp/huhu-ui-review-*`）。机器上另有其他会话进程，默认 8 worker 全量时负载 2.5–6，每次随机有不同的超时类用例越界（precheck、library、calendar、obsidian-status、archives-generic 等，均单独重跑通过）。
- 以相同测试内容、相同时限与断言、仅降低并行度运行：`HUHU_TEST_PTY_BINARY=… HUHU_TEST_CONTROL_BINARY=… pnpm exec vitest run --maxWorkers=3` → 退出码 0，520 文件通过、3 跳过，4080 例通过、41 跳过（318.8s）。
