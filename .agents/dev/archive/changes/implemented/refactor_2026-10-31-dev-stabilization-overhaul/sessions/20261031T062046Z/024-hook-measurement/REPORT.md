# 任务回报

Session: 20261031T062046Z
Task: 024-hook-measurement
Status: completed

## 聚焦交接

本地测量与 Windows 专用 workflow 候选已准备，源码/runner/workflow 停写。completed 仅表示本地候选交回；AC311 未通过，Windows 未运行。20 轮 Linux 原测试均通过、共 1920/1920 事件；独立顺序观察在 15 轮发现 41 个 scope-round 不匹配，测量 runner exit 1。保留为 T13 线索，不判根因、不修生产 Hook。完整 Hook 回归 20 例通过。最新全测试类型检查被并行 Bot 文件 TS2367 阻断，需 Lead 后续类型验收。

## 产物与验证

### 范围和来源

先读 TASK/Ticket12、Spec AC311、ADR005、执行边界、dev/testing、T01 CI 核验及真实 publisher/guard/reader/test/CI 消费链，按原生消息列影响后实施。Lead 批准测试内薄包装，并明确 guard 余项不可冒称独立 token CPU。ADR005 不直接规定本测量实现，未据此添加产品机制。复用当前生产脚本和现有测试/CI action 版本，无上游代码引入、依赖升级或新产品遥测。

最初写集为 workflow、hook-spool.test.ts、hook 证据和本报告；Lead Map17/T12-D01 后明确增加 `scripts/fixtures/dev-overhaul-hook/run-measurement.mjs`，runner 从 docs 迁入该唯一工具路径。产品 hook-spool.ts/spool-guard.ts/automation-hooks.ts 全程只读，git diff 前两项为空；无 Git 写操作、远程动作、真实 Obsidian、生成物写入或递归派遣。T12 中途按要求停写完成独立 T16 026 复审，再恢复本票；两票边界保持。

### 具体实现与边界

- 测试仅在 HUHU_TEST_HOOK_TIMING=1 开启测量。保留完整原 publisher 字节和函数体，在现有函数声明之后插入包装；移除包装必须逐字节等于原脚本。Reflect.apply 透传参数/this/返回值/异常，文件系统观察返回原 Promise，不向原调用链增加 await。原 96 事件发布顺序、原数量/唯一性/故障断言、原 15 秒测试及发布/排空时限均不变。
- 路径/guard/publish 为同步包含区间；collectorWait 为首次尝试到成功获取，collectorHeld 为成功获取到释放；消费回收为 ready→consuming rename 成功到全局槽 rmdir 成功；cleanupWall 是 scope.close 加临时夹具清理。guardRemainder 是包含 token/metadata/结构等的余项。多进程并行和嵌套累计不能相加为墙钟，不声称纯 IO/token CPU。
- 每个 publisher 输出限制 16 KiB，无 token、真实用户路径或内容；顺序明细只含最多 32 个夹具 scope、每项最多 4 个事件 ID。错误、缺失测量、未回收数保留，不用缺失样本伪造完整分段。
- runner 每轮精确选中完整测试名，验证实际目标到达/计数/回收/测量完整性，独立检查顺序。原 Vitest exit 与测量 exit 分离；原测试未加顺序 assert。每轮独立进程、失败不重试；详细日志和 JSON 全部保留。
- workflow 仅 workflow_dispatch，Windows latest、Node 24.x、项目 pnpm、frozen lockfile，直接执行目标，无 Bot/构建/其他 suite 前置阻断。rounds 默认 20、允许 1–100，低于 20 不满足完整轮数验收；job 20 分钟、每轮外部容器 60 秒、artifact 14 天，只读 contents，checkout github.sha 且不持久凭据。单轮日志上限 8 MiB。完整命令、资源和测量限制见 `docs/e2e/dev-overhaul/hook/README.md`。

### 固定候选与证据

| 路径 | SHA256 |
|---|---|
| .github/workflows/hook-windows.yml | ccb772674fe5eea8784892bec8cba33074525e7230ef77a780934c49a84a8a24 |
| scripts/fixtures/dev-overhaul-hook/run-measurement.mjs | 61bc9288aadd76693013cdc021da9792c7bad9cc49960125addc7de31d4cccb4 |
| src/modules/agent/platform/desktop/hooks/hook-spool.test.ts | 5f20073bdb211b3013028dd1bd154a3592a6975182168cd1ef65ef8f85d68950 |
| src/modules/agent/platform/desktop/hooks/hook-spool.ts（只读） | 03a68cc53b0f63c649f3fd3da3f618355c26e81ef01475c934a01686448751bc |
| src/modules/agent/platform/desktop/hooks/spool-guard.ts（只读） | 747de474d7f1128bdd9221667f4824bd8b68cbf99e602c6b0ef01524c1614a12 |
| src/modules/agent/platform/desktop/hooks/automation-hooks.ts（只读） | dd031426b88be16826e33cae9530cd719323475b3d13f11c1fbcf428553e8044 |

证据目录每份文件的精确路径/SHA 列于 `docs/e2e/dev-overhaul/hook/artifacts-sha256.json`；每轮 summary 另含测试、产品、package、锁文件和 Vitest 配置摘要。原 publisher SHA 为 `9b4a4b4a3e383aafd313a9ae66e883e13e20be7b206c7a49e8ee26f59e8c8008`，测量脚本 SHA 为 `c40d23a945a794f4876d0b3a1ba442d202c5a76e7343d86e4be20b0659a0dc33`。

### 实际命令与结果

以下目标名均为 `32 scopes accept three ordered short events each through the shared bounded collector and fair reader`，文件为 `src/modules/agent/platform/desktop/hooks/hook-spool.test.ts`。

| 命令/检查 | 结果与证据 |
|---|---|
| Node24 PATH，HUHU_TEST_HOOK_EVIDENCE=local-before，pnpm exec vitest run 文件 -t '^目标名$' --reporter=verbose | exit 0，1 通过/19 未选中；local-before/command.log/.exit |
| 同命令加 HUHU_TEST_HOOK_TIMING=1，输出 local-measured | exit 0，96/96；首次独立顺序异常 2 个 scope；local-measured/timing-sample.json，不追溯修改 |
| HUHU_HOOK_EXPECT_PLATFORM=linux HUHU_HOOK_ROUNDS=20 HUHU_TEST_HOOK_EVIDENCE=docs/e2e/dev-overhaul/hook/local-rounds，Node24 node scripts/fixtures/dev-overhaul-hook/run-measurement.mjs | driver exit 1；20 轮原 Vitest 全 exit 0，全部目标到达，各 96/96；15 轮测量观察失败；driver.log/.exit、每轮 command.json/.log/.exit 与 vitest/timing JSON |
| Node24 pnpm exec vitest run 文件 --reporter=verbose，不启用测量 | exit 0，20 例全过，18.83s；full-hook/command.log/.exit |
| node --check scripts/fixtures/dev-overhaul-hook/run-measurement.mjs | exit 0；runner-syntax.log/.exit |
| 使用已有 yaml 解析 workflow 并断言手动唯一入口、Windows、win32、默认20、Node24、精确 runner 命令 | exit 0；workflow-static.log/.exit；不是远程运行 |
| pnpm exec tsc -skipLibCheck -p tsconfig.test.json | exit 126；types.log/.exit；唯一错误为并行变化的 src/modules/huhubot/platform/desktop/runtime/client-runtime.ts:213 TS2367，Hook 无类型错误；未擅自修 Bot |
| git diff --check -- 本任务测试/workflow/runner | exit 0 |

机器 Linux x64、kernel 7.0.0-38-generic、8 CPU；测量 Node v24.22.1。20 轮累计：path 73356 次/5476.229ms；guard 25092 次/11839.076ms；guard 余项 25092 次/7628.784ms；publish 1920 次/9555.587ms；collectorWait 1920 次/95138.205ms；collectorHeld 1920 次/53162.769ms；consumeReclaim 1920 次/4409.018ms。轮内墙钟 893.670–1353.124ms；均为测量观察，非 Windows 性能结论。后半部分与完整 Hook 回归并发，已在 aggregate.json 注明，不能视为隔离性能基准。

20 轮共 1920 事件，test/publisherExit/missingMeasurement/hookFaults/reader 均 0；41 个 scope-round 顺序不符。例如第 1 轮 scope 5 为 `5:0,5:2,5:1`，完整明细保留。尚未确定是否为原调度行为或测量开销暴露的竞争，不据此修改生产/放宽时限。Linux 回归通过不能替代 Windows/macOS 实机验收。

### 真实失败历史

Lead wave3 首轮测试类型检查指出 availableParallelism 不在 Node16 类型中，已改 os.cpus().length；全仓 lint 首轮被证据 .cjs 缓存阻断，已将两份缓存移至 OS 临时目录，cache-relocation.json 保留原位置/hash；第二轮被 docs 下 runner 工具位置阻断，按新增精确授权迁移。均未改类型依赖或 lint 配置。最终全仓 lint 由 Lead 执行，不在此提前宣称通过。历史 CI 曾实际运行 Windows 目标（T01 记录 96/96、5460ms），本次新增 workflow 只改善直接可达与多轮测量，不否定历史证据。

## 问题与下一步

Windows 20 轮远程运行尚未授权/执行，AC311 保持待验收；Linux 独立顺序观察失败交 T13 调查。具体待授权动作已形成：审查本候选后，确定可运行远程 ref 及放置代码方式，手动运行 Hook Windows measurement、rounds=20，并取回命名 artifact。未推送/触发，不提前请求泛化授权。Lead 还需完成最新 Bot 类型问题修复后的共享类型与全仓 lint 验收；本人不因其他票改写 T12 结果。源码、runner、workflow 与证据停止写入，交 Lead。
