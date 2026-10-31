# T-02 A round-1 修复交接：已停止项目写入

修复授权来自 Root 的正式解冻 Task Brief，输入是 C/evidence/T-02-review-round1.md（已回读，原 SHA `d79c69efb2bebc6ec7e637e84d0fee1137e6c3378b0e16f42675ae90c224bef3`），审查输入 `227ffc61fba2b7b6ec52c68dcaca698ee253f86ea92d2fb09ce55e4ab3996931`。工作区/branch/base 延续原 T-02，不建新 worktree、不提交/推送。

本轮真实只写四文件，均在批准的 services/spaces/** 与 services/workspace-service*.ts 内：

- `src/modules/agent/services/spaces/space-service.ts`
- `src/modules/agent/services/spaces/space-service-recovery.test.ts`（新增）
- `src/modules/agent/services/workspace-service.ts`
- `src/modules/agent/services/workspace-service-spaces.test.ts`

没有改 B、core 纯合同、UI/词典、正式 docs/C、预算或 main/styles。A 原 33 文件中的其余 30 文件摘要未变化；full A v2 清单含 34 文件：`/tmp/huhu-t02-a-source-manifest-v2.json`，SHA256 `2cdf1076296e6cc47ff89e30b41798f9a54248410445300229d0d669b292aeba`。Root 可直接合并 B 和生成物后冻结；本报告不自行标 done。

## 三项修复的实际行为

### S01/C01：持有 permit 时拒绝未知格式与错 scope

新增统一 `decodeStored` 在普通 read-only ready 与 writer 内分类：解析失败是可用有效备份恢复的损坏；可解析且不是 version2 是 `PERSISTENCE_FAILED:unsupported-version`；已知 v2 在 schema validator 之前核对 logical vaultId、deviceId 及 physicalRoot 的 canonicalPath/dev/ino，错作用域直接 `SCOPE_MISMATCH`。完整 scope 门不藏在 JsonStore 的 boolean validator 里，因而不会被 decode 的 catch 转成“可恢复 corrupt”。

writer 的 guardedStorage 对 primary/backup 的每次读取执行该门，覆盖初次 load、暖实例 commit 合并读取、needsRecovery 的内部 reload、恢复读取和 readback。JsonStore 可能不读旧 backup 就覆盖它，因此 write/mkdir 前还在同一 active permit 内读取并验证 primary+backup 两个现存输入；corrupt 保存也经过该门。新加的只读 existence/read 复用已有 `reissueIfStalled`，不重发任何写入。所有检查仍由同一业务队列/permit 拥有，没有新增业务 manager。

正式回归：cold/warm × primary/backup × future version/foreign vault/foreign device/physical ino/dev/canonicalPath，连续两次显式操作均明确拒绝，effects（包括 mkdir/write）为空，文件 Map 逐字节不变；needsRecovery 分支也逐类验证拒绝零效果，再明确恢复有效原件后可保存。真实 FS + WorkspaceService 创建组合另观察 future/vault/device/physical 置换时零 adapter write/mkdir、零 helper acquire/spawn，primary/backup 字节保持。

### S02/C02：首次 writer load 的失败候选不缓存

JsonStore 现在是局部 candidate；只有 load、scope 和末次 permit 检查全部成功后才赋给 `this.disk`。一次 EIO 后不会保留 loadFailed=true 的无效实例；下一次由用户明确发起的操作重新加载，不自动重放旧业务。已初始化 disk 的 needsRecovery 仍由 JsonStore 自己的恢复路径处理，但每次读/写都经过上述版本/scope 门。

正式回归在 ready 成功后只注入一次 writer read EIO：首次无持久效果；同实例显式再次 create 完成 verified commit，flush 成功、error 清除。原 owner-lost 不可恢复测试仍通过。

### S03/C03：后台追加在单队列内变换最新布局

SpaceService 新增模块内 `updateLayout(spaceId, transform)`，在 mutate 执行时取得该 Space 最新布局并应用变换。WorkspaceService 后台 attach 只排入 `layout => openTab(layout, ..., tab)`；不在调用者处提前捕获旧布局再做全量 saveLayout 替换。普通 UI 的全量布局保存入口保持原样，core/desktop 端口无变更。

正式真实 WorkspaceService/SpaceService/JsonStore/desktop factory 组合：A 的两个启动均提交 Session 后等待，切到 B 并打开 Browser，两个启动一起完成。A 保存两个 tab/独立 Session 引用，B 的布局逐值不变、selectedSpace 仍 B；重选 A 可见两个 tab。未把假 native transport 的确定时序当作真实 Provider E2E。

## 先红后绿与检查

先新增正式目标回归而未改实现：`/tmp/huhu-t02-a-repair-red.log`，工具实际 exit126，2 文件内 21 failed / 7 passed。该126是调用工具报告，不能当真实 TCP 竞争子进程的 exit1 或成功；本轮没有重跑未变的 B OS 子进程套件。

最小修复后首轮目标回归 exit0，2 files/28 tests（`repair-green-first.log`）。补齐 physical dev/path 及生产创建零 native 效果后，最终相关回归 **exit0，12 files / 94 tests，0 skip**：`/tmp/huhu-t02-a-repair-unit-v2.log`。涵盖原 T-02 故障/旧 workspace 与 T-01 cancellation 风险；不是整仓测试。

- 生产 tsc `node node_modules/typescript/bin/tsc -noEmit -skipLibCheck`：exit0，`/tmp/huhu-t02-a-repair-type-v2.log`。
- 测试 tsc `node node_modules/typescript/bin/tsc -skipLibCheck -p tsconfig.test.json`：exit0，`/tmp/huhu-t02-a-repair-test-types-v2.log`。
- 定向生产 ESLint（services/spaces 与 workspace-service.ts，零警告）：exit0，`/tmp/huhu-t02-a-repair-lint-v2.log`。测试仍按项目 ESLint ignore，由 tsc/Vitest 检查，没有关闭规则。
- 原 UI 组件回归：exit0，2 files/8 tests，`/tmp/huhu-t02-a-repair-dom.log`。没有重拍未变化的 UI 截图，也没有重跑 B 的已冻结22条测试。
- 窄路径 `git diff --check`：exit0，输出为空。

**逐次完整 argv/重定向命令、工具 exit、所有原日志字节数及 SHA256**：`/tmp/huhu-t02-a-repair-commands.json`。含14条实际执行的红灯、首绿、两轮类型/lint、相关回归、DOM、review probe 重打包与执行。原红灯/首绿没有被最终结果覆盖。

## 原审查探针的新输出

`node /tmp/huhu-t02-review-rebuild-probes.mjs`：exit0，只重打包 /tmp 当前生产探针，原 stdout 副本仍保存在 C/evidence/T-02-logs，未覆盖历史副本。新运行分别写新的 repair stdout，不复用旧构建产物冒充修复。

- `/tmp/huhu-t02-a-repair-storage-probe.stdout`（exit0 是 observational probe 收集完成，不单独等于合同通过）：`schema-changed-after-ready` 现在返回 `PERSISTENCE_FAILED:unsupported-version`，primary 仍 version3/preserve=future，没有 corrupt；transient-read attempt0 EIO、attempt1 succeeded；foreign-scope cold/warm 两轮均 `SCOPE_MISMATCH:vault-changed` 且 `primaryChanged:false`。
- `/tmp/huhu-t02-a-repair-layout-probe.stdout`：两个 startedRuntimeIds、两个 savedSessions、两个 savedTabs，selected=B；重选 A 后 visibleTabs=2/running=2。

探针 entry 未改；相关重打包和新输出 SHA 在命令清单内。正式新增测试才是可断言的回归证据。

## 留给 Root

A 已停止项目源写。Root 独占全构建、全 lint/样式/包体预算与独立双轴复审；本轮没有运行完整 build，没有借失败清理吞掉错误或自动重放业务。真实 Obsidian/原生目录交互/Provider 与跨平台 E2E 仍按既有用户分工由用户进行。本轮没有新增产品范围或平台。
