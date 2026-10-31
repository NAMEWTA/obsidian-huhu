# T09 GUI 容量准入窄修候选交付

Session: 20261026T045732Z
Task: 042-t09-gui-capacity-repair
Status: completed

## 聚焦交接

在 039 F2 之后的真实 GUI 入口核查中，统一补齐了 splitPane、reopen、同步直接 attach 及 Pane API 的新增叶容量准入。原 WorkspaceStore 的同步候选发布在新增叶时重用同一全局扫描，GUI split 在 Session 准备前做预检并在发布前重核；恢复/关闭、旧超限图减少叶数以及无新增编辑仍可继续。原 009 同字节 GUI 反例 2/2 已绿，新增容量边界、竞争、旧图恢复及焦点/组风险均通过；A14 于 **2026-10-26T19:18:22.606261Z SOURCE STOPPED**。本报告只交回候选，Root负责统一构建、CLI/DOM/Chrome、独立 R2 和正式状态。

## 产物与验证

### 输入、写集和精确增量

工作区 `/home/wta/orca/workspaces/obsidian-huhu/terminal`，HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`，branch `NAMEWTA/terminal`。完整读取042 TASK SHA `0c6d209714e91abec6010e50d570a50c22daa48e47dc7c16e41c7ef0cf363c93`、039原REPORT SHA `c5561c750e57c650f2c31f0f5bdf1157ebfdd45b4ee0c01e22ffa9bb7efda584`、Root042输入 SHA `95b5f28aa4af744c2937138ce13f074de54c0c5194d02842f63a81b2a220fbf1`、完整停源基线 SHA `74cc783ea0cf180f9d92759ad09744f73dd542957ad172cf5527b7a395e1b494`。039原REPORT、009 raw/fixture/primary及正式状态均未改。复用039同 SHA 工具/CAS，没有复制大闭包、安装依赖、提交、推送、构建产物、Cargo、Chrome、真实 Vault/账号或递归派遣。

本轮证据根 `R=/tmp/huhu-t09-gui-capacity-repair-20261026T190808Z`。A14 停源完整清单与 CAS 在 `a14-before.json`/`a14-after.json`/`source-stopped.json`，manifest SHA `79eabd5a010cd6f070caf2a15e7c87c475b1a2af5b53922c960fe73012ea31de`，分配外产品 drift=[]。只有5路径变化：

| 路径 | before SHA256 / mode | stopped SHA256 / mode |
| --- | --- | --- |
| src/modules/agent/core/workspace/pane-identity.ts | 474c970c5e8a8506c7ef226920921ab84f7d1c3ccc07ddec3dd8c0d184a7fef6 / 0o664 | fb75fc8bf057ba7fc798382d9fc76cf935c29c16583487e184c9b06516708e75 / 0o664 |
| src/modules/agent/services/workspace-store.ts | 5530cf719ad7a74a7b10084535ed40eb522a48f7568b734cde8d16b54635c921 / 0o600 | c12935e80756d6af37719f9a3f3ed80e1ad6643b9c4224cdd26779be9271cd48 / 0o600 |
| src/modules/agent/services/workspace-service.ts | 9fc4f50579c73a8ab313b11e655e4f9aa16ceba810ee3037382ee43778f674fd / 0o600 | 09bef60fc3eadb9064e3aa83d505150a2195d262a737488fbff4aa27e820437d / 0o600 |
| src/modules/agent/services/workspace-service-panes.ts | b75513725460b9c5c1553db7c426c72f69ceb09ad48a7288c08b9fda3341a409 / 0o664 | a56b0127ec46c8b0ce2ced00e8ae453ca73b32c77b730002e9a0bedf79287aa1 / 0o664 |
| src/modules/agent/services/workspace-service-panes.test.ts | 9be90d7596bf1997dc6de4c12dadf18f3d6da4d62169ba1153907dd1d4834cfc / 0o664 | 671f53f939332732a25e5a3b63ed932e2577e698637fe6d74ab505655770b404 / 0o664 |

`repair.patch` 是实际字节增量；没有修改 model/ops、旧报告或 B/U/Root 路径。

### 统一准入行为

- `pane-identity.ts` 新增有界 `MAX_INDEXED_PANES=4096`、实际 view 叶计数与 `assertPaneCapacity(views, additional)`；容量仍是既有4096，不放宽、不建第二索引。`PaneCommandError` 移到 A core identity 并由 `workspace-service-panes.ts` 原名 re-export，保留现有 `instanceof` 与 B/Router 消费形状。
- `WorkspaceStore` 新增可选 `assertPaneCapacity(additional)`。它读取各 Space 当前 draft/view（缓存优先，未缓存规范化投影），在实际 `editLayout`/同步 `updateLayout` 发布前仅对新增叶执行全局检查；减少叶、关闭旧超限图和元数据编辑不触发新增配额守卫，保留恢复能力。检查和候选 transform 在同一同步 owner 边界内完成，未插入 await。
- `WorkspaceService.panes.attach`/`split` 原候选索引仍是最终发布前重核；`ensureManagedPane` 把 GUI groupId 原样传给 attach。同步 `attach` 对容量错误返回 `undefined`并沿原 `report`，已有同Session显示不占名额，非当前 Space 先读实际 owner 做幂等判断。`splitPane` 在 admission/Session reserve 前预检，之后若跨 Space 等待造成名额变化，发布前 Store/Pane 再拒绝；已生成 runtime 不伪称未发生、不自动 stop/remove。`reopen` 对新增叶预检，容量失败保留 closedTabs 与原 view，走原 report。
- 旧超限图仍允许关闭减少叶；达到合法4096后 list/capture/close 可恢复。Pane API 与 GUI focus/group 语义不变：后台 attach 不切 active/focus，foreground create 仍沿 original ForegroundIntent consumed；无group attach 默认原活动组。

### 红绿、真实入口和消费闭包

001 先在生产真实 WorkspaceService/SpaceWorkspaceStore/TerminalSessions/NativeHost 夹具中让全部新增目标失败：满额 split 仍 spawn、last-slot attach/split 越界、GUI 直接 attach、跨 Space 等待名额及旧超限 recovery 目标；没有把类型/装配失败算目标红。002 同一6目标绿；003 新增队列中组被移除的准确目标诊断红（被通用转换成 prepare-failed），004 沿既有 SpaceError 保留 `TARGET_NOT_FOUND/missing-group` 后9目标绿。009 原039同字节 GUI splitPane/reopen 2/2 green。

最终004全路径覆盖后，005 owner/GUI/foreground 9 文件 **149/149** 绿，008 Pane 专项 **24/24** 绿，007测试types **exit0**，006生产定向 ESLint 两条生产源 `--max-warnings 0` **exit0、零警告**。005测试types首跑因新增测试 mock 返回 undefined 而 exit2，原件保留；随后只改该测试专属 mock，007最终 types 绿。没有放宽旧断言或删旧风险。完整旧 A14 风险、F1 非活动组/焦点、dirty/base/pending/effects、取消迟到和原代 capture 仍在004/005集合中。

| 命令 | exit | 实际摘要 |
| --- | --- | --- |
| 001-gui-unified-admission-red | 1 | ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 5 ⎯⎯⎯⎯⎯⎯⎯ / Test Files  1 failed (1) / Tests  5 failed | 1 passed | 17 skipped (23) |
| 002-gui-unified-admission-green | 0 | Test Files  1 passed (1) / Tests  6 passed | 17 skipped (23) |
| 003-original-gui-probe-green | 0 | Test Files  1 passed (1) / Tests  2 passed (2) |
| 004-final-owner-gui-foreground | 0 | Test Files  9 passed (9) / Tests  149 passed (149) |
| 005-final-test-types | 2 | src/modules/agent/services/workspace-service-panes.test.ts(360,107): error TS2322: Type 'Mock<() => undefined>' is not assignable to type '(() => ForegroundIntent) | undefined'. |
| 006-final-production-lint | 0 | 见 raw.log |
| 007-final-test-types-green | 0 | 见 raw.log |
| 008-final-pane-tests | 0 | Test Files  1 passed (1) / Tests  24 passed (24) |
| 009-final-test-types | 0 | 见 raw.log |

真实同字节对照 003 使用039保存的原 `gui-capacity-probe.test.ts` 原字节 SHA（见 `original-gui-probe-provenance.json`），正常导入现生产类和同一 fixture，不以重新编写的 probe 替代原反例。测试 Node 固定 `/home/wta/.volta/tools/image/node/26.11.1/bin/node`；R 内 config 仅增加观察与临时 cache，工具/依赖同 SHA 复用既有 CAS。新源码/测试的实际 transform/read 闭包保存在各 command compile-index，累计6048 path+SHA变体；不声称捕获所有 transitive、异步 FS、Node 内建或 OS 库字节。

### 并发、迟到和资源边界

跨 Space 竞争用真实 storage.write barrier 保持第一保存未决，发布前只允许一个候选占最后名额；晚到 split 的 Session/runtime 已发生事实保留，未自动 stop。满额 split 的预检在 `prepareSession`/spawn 前，旧布局、记录和焦点保持。039工具 outer 180s预算未触发；本任务9条 runner PID 均已退出。HOME/USERPROFILE/TMPDIR、Vite cache、GUI cache 和任务依赖 symlink 均在自有 R 内清理，路径/mode/SHA 在 `cleanup-final.json`。没有删除旧 tmp/原报告/共享资源。

## 问题与下一步

本 A14 候选没有已知未完成修复；F2 的 split/reopen/直接 attach GUI 缺口已补齐并停源。Root 仍须在默认配置下运行完整构建、CLI/native/DOM/Chrome、影响闭包与独立 R2；真实 Obsidian、Provider、OS IME 和五平台仍由用户验收。正式 T09 状态、发布、提交、推送和归档未触碰。
