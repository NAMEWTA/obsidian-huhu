# 任务回报

Session: 20261031T062046Z
Task: 040-checkpoint-review
Status: completed

## 聚焦交接

审查结论 request-changes；不是 T05 done。

### 固定输入与方法

Reviewer 为 native:/root/baseline，未参与 T05 实现；作者为 native:/root/sources。应用 dev 与 SpecDev code-review 的高风险双轴规则，不递归派遣。只写本 REPORT；T15 六文件仍冻结，未改产品、测试、正式 Evidence/Ticket、Git、共享产物或远程状态。

实际解析 Evidence T-05#review-input，逐项读取并重算 20 个 working_snapshot 文件 SHA256，20/20 相同；实际执行记录中的 git diff argv，结果 SHA256 为 `648dd49d31f282a7a1c892ea93d6c01ab4dfcaab39700422cc9f01e7622c371b`，与冻结值相同。使用原工具 readArtifactSectionSync 核对全部 10 个来源，10/10 相同；reviewInputDigest 实际结果 `5c2c9085d209396bf1d53841fb9d42dcb12f9699d31ebedf201a4b99e5533cbb`。base/head 均为 `86c500556db1d64865c4cc7f1aff1dd83de071fa`。初次手写 section 截取及 sorted JSON 的摘要不同，查回原序列化/section 工具后全部匹配；不是输入漂移。

来源发现：本任务是显式 working-tree 文件集合，没有新增 commit message 需追溯；采用明确提供的完整 Ticket05/D01、Spec AC283/284、ADR003、AGENTS、dev/testing、execution-boundaries，并读取 027/037 报告、当前存储文档及实际 T04/T06 Core/Store 停止链。未发现 native/.github 下额外 AGENTS/CONTRIBUTING（rg 无匹配退出 1）。没有 UI 范围。外部 API 来源采用已有锁定依赖与 027/037 已保留资料；本轮不新增外部代码或授权。

<a id="original-standards-output"></a>
## Original Standards Output

Reviewer: native:/root/baseline
Axis: standards
Result: request-changes
Input-SHA256: 5c2c9085d209396bf1d53841fb9d42dcb12f9699d31ebedf201a4b99e5533cbb
Observed: 生产事务、维护和停止机制未发现需阻断的新增缺陷；首次 Windows 执行方案存在 F1 范围错误，需修正后再作为可审查远程方案。

### F1 — P2：首次 push 方案漏算通用构建，不能按“这一个 workflow”授权

位置：`docs/e2e/dev-overhaul/storage/README.md:48`，结合新增 `.github/workflows/huhubot-storage-windows.yml:8`；实际外部消费者为现有 `.github/workflows/lint.yml:6`、`:24`、`:71`。

可复现路径：按 README 在首次注册时 push `codex/dev-overhaul-storage-validation`。storage workflow 的精确分支匹配，但 lint.yml 的 `push.branches: ["**"]` 也匹配；其 build 没有 job-level 排除此 ref，会生成 Ubuntu Node22、Ubuntu Node24、Windows Node24 三项，且执行 `pnpm run build`。因此当前候选不是文档请求授权的“这一个 workflow 和 artifact”范围，并会进入 execution-boundaries 禁止的默认 Browser 生成链。其余 workflow 的 push 分支/tag 已只读核对，没有为此分支发现另一个匹配项。

这不是要求现在执行 CI，也不是要求修改通用 lint 生产配置；用户已明确暂停远程 CI。最小修正可以仅改授权内 storage README：明确当前首次 push 尚未形成可执行的单 workflow 方案，记录 lint 触发冲突，并要求在后续独立授权的 remote-only overlay/明确扩大且符合冻结约束的方案固定后才请求执行。若后续选 overlay，必须另获精确路径授权、核对所有 lint job skip，并保留其他分支行为；本 review 不自行扩围。

验证要求：本地解析准备推送的真实 workflow 集合，对专用 ref 枚举匹配 workflow/job；结果须与最终授权范围一致，不能只验证新 workflow 自身的 branches。当前没有远程副作用，F1 是本地候选说明/首次运行计划缺陷。

### 已检查的生产风险与反例

- 唯一连接：Open 设置 MaxOpenConns/Idle 为 1；运行期写口搜索及消费者追踪表明 WithinTx/WithinDurableTx/WithinErasingTx 和 portable 两入口均走 register→admittedConn→owned Transaction。迁移事务仅在 Store 启动、维护 owner 创建前运行。没有新增第二 writer。
- 容量和背压：slots32 包含在途/等待，满时 work 前拒绝；取得唯一连接后检查实际 WAL，超水位归还连接再等 changed。wake1、单 worker、单 timer；retry 非空时新 wake 不绕过 100ms。已准入单大事务可超过阈值，后续 work 停止，符合 D01 而非固定字节 H。
- 提交事实：成功 Commit 不读取 caller ctx 来改判；checkpoint 不在返回链、无 work 自动重跑。FULL 在 BEGIN 前设置，结束时恢复 NORMAL，恢复失败标 ErrBadConn；六个既有外部动作屏障的真实调用位置未改。
- portable：BeginForPrincipal/BeginImport 获取 owned lease；元数据/预览失败路径 rollback；Commit 初步 UPDATE 失败结束 lease，后续 receipt 错误保留给 application portable.Import 的 deferred Rollback。真实 application 入口在成功提交前始终保有该 defer。取消不依赖 database/sql 自动 rollback，显式结束归还 lease；Close 等 active，不遗弃事务。
- 清除：WithinErasingTx 在 COMMIT 成功后、release 前登记 generation。checkpoint 捕获 generation，成功只完成那一代；更晚请求继续 pending。EraseWAL 取消只结束观察，失败返回 retryable cleanup-pending，owner 保留重试。assistant 实际 agents.delete 路由使用此入口，已有 canary 测试检查逻辑删除、pinned WAL 保留和释放后 DB/WAL 字节消失。其他 MutateInTx 调用为 create，不构成 delete 绕过。
- assistant 内存债务不跨进程持久化，沿用原 best-effort 的崩溃边界；与 purge 的持久 preview/session cleanup 义务区分。purge 在 EraseWAL 成功前不标 complete，未将它降级成可丢弃普通 wake。
- Close 封准入、取消等待者、等 active、停 worker/join、必要最终清除、真实 sync、db.Close；errors.Join 的参数全部执行，不因清除或 sync 错误跳过关闭。sync.Once 使重复/并发调用等待同一结果。Core 在 producer/recovery 最终写入阶段仍保留维护，之后 Store close，最后 Profile lock release。无限 reader 可使最终写入一直等待，未虚称有限停止时长。

<a id="original-specification-output"></a>
## Original Specification Output

Reviewer: native:/root/baseline
Axis: specification
Result: request-changes
Input-SHA256: 5c2c9085d209396bf1d53841fb9d42dcb12f9699d31ebedf201a4b99e5533cbb
Observed: AC283 服务机制与 D01 的软高水位解释一致；F1 不符合执行边界和候选授权范围。AC284 仍未在 Windows 执行，不能判完成；这里的 request-changes 包含可在本地修正的 F1，不要求违反用户决定运行远程 CI。

AC283：提交/维护分离、队列有界、长 reader 后停止后续追加、隐私 TRUNCATE 和停止归属均有真实实现与机制证据；没有把“单笔可越界”误作持续增长合规，也没有要求规范不存在的固定 H。未修改 NORMAL/FULL 承诺、schema、Profile 数据格式或 T09 历史基线。

AC284：18 项为 SQLite 原语候选矩阵，非 production scheduler 吞吐或模型收益。真实计时范围分开记录 conn/begin/work/commit/FULL 切换、checkpoint、close；admission 包含 checkpoint、close total 包含 sync，文档已说明不能相加。pinned 项少提交一部分，不能与完整项直接作吞吐胜负。磁盘 allocation 使用 OS 元数据，错误字段与逻辑长度分开；当前 JSON 18 项无负时长，TRUNCATE 的 0 allocation 对应收尾空 WAL，不是假负值修零。

恢复 probe 真实启动自有子进程、64 行 NORMAL commit 后 ready，父进程只 Kill 自己的 Process 并 Wait，随后 Open/quick_check/读回；不是断电模拟。**恢复成本当前只有矩阵外单个共同 fixture 值，未逐模式/阈值测量**，不能据此声称候选模式之间恢复代价相同或已有完整比较。此边界与 Windows 尚未运行一起保留给最终 AC284 证据评价；未把它推断成生产恢复缺陷。

Windows 文件本身是 contents:read、固定 github.sha、无持久凭据、单 windows job、Go1.26.10、20min、失败也上传已有 artifact；crosscompile 不证明实际 Windows 锁/I/O 行为。F1 修正后也仍是待运行候选，不能使 AC284 通过。Lead 全 Go exit0 可复用，bench/Windows 结果分别由 Lead 留证，未以源审查代替最终验收。

## 产物与验证

1. Python 逐项 SHA 与执行冻结 git diff 命令：退出 0，20 个 True；diff 匹配。临时完整 JSON `/tmp/huhu-t05-review-input.json`，diff `/tmp/huhu-t05-review.diff`。
2. Node 原工具 readArtifactSectionSync + reviewInputDigest：退出 0，10 个 true，digest 与上文相同。初次手写 section/排序 JSON 只是错误摘要算法观察，已明确纠正；一条 rg 不存在 lib glob 退出 2，没有把它当覆盖证据。
3. 独立 overlay probe（只在 OS 临时目录写入）：`GOTOOLCHAIN=go1.26.10 GOWORK=off go -C native/huhubot test -overlay=/tmp/huhu-t05-independent/overlay.json -race ./internal/adapters/outbound/sqlite/base -run '^TestIndependent' -count=1 -timeout=30s`，退出 0。原始输出：`ok github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/base 2.104s`。源码/overlay/log/exit 留 `/tmp/huhu-t05-independent/`，未向仓库增加测试文件。
4. 独立 probe 的第一用例在 held checkpoint 捕获第一代后登记第二代，取消两个 observer，释放后断言至少两次 checkpoint 且债务清零，再 8 个并发 Close 全部成功；第二用例验证 caller 取消后的 statement 报 context.Canceled，显式 Rollback 后下一真实事务能获取连接。所有 goroutine/Store 真正 join，测试 TempDir 正常清理，工具 session 已退出。
5. 只读回读 `/tmp/huhu-t05-lead-full.log/.exit`：全包输出存在，exit 0；未重复全 Go。实际读取固定矩阵 18 项、恢复64行，RecoveryNS=3841223，样本无负 ns；不将时间作跨并行环境性能比较。
6. 实际 git diff、rg/sed/cat 追踪生产/测试/调用方、全 workflow push 条件和文档；搜索无结果退出 1 为无匹配，不算测试失败或通过。没有使用真实 Obsidian/Browser、网络 CI、Git 写操作或构建生成物。

## 问题与下一步

本报告完成停写。建议仅针对 F1 修正文档并固定增量输入复核；生产机制候选可保留，Windows/最终性能验收仍待后续明确允许执行时处理。未自行修复，未标 Ticket done。
