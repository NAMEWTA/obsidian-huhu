# T-04 A：F1/F2/F3 修复候选交接

**SOURCE STOPPED。** 唯一 writer `/root/prepare_t03`，gpt-6.1-sol / xhigh；GP-017 / Map18；同工作区/branch/base，未提交、推送、发布或归档。本轮只写 Packet 16 条路径中的 **11 条**；未写 native/target/shared/UI/依赖/正式工件/生成物。Root 已在源停写后接管第三轮整合。

## 候选与结果

- F1：未 confirmed 的 captured scope 可收到首次 stop 与 force；观察 settled 不再封死控制，requestId/requestedAt/deadline 不重置；旧 evidence 不提前结算新观察。confirmed/no-process 不重复控制，断线仍 unknown，不新建 helper 或重放 spawn。
- F2：archive acquire、checkpoint、flush、commit 都受同一 observer deadline/signal 约束；逐项 rows 是返回快照。原 write 保留真实 settlement 和原 writer/gate：primary 未开始时取消永久阻止晚归档；primary 已调用则只能回 unknown，再采用真实成功/失败，不宣称回滚。
- F2 关闭：Controller 幂等同步关门，同时启动 registry/managed/layout/native 等原 owner 收尾；磁盘挂起不再阻断 native cleanup。调用者15s观察结束不等于取消IO；实际写未settle时仍隔离writer，晚错误留记录并本地化报告。成功仍strict drain后释放writer。最后native notice、resume provenance、输出/reply/ACK已通过生产Controller组合验证。
- F3：所有 create 的最后发送门与迟到reply门均检查 closing，含无runtime/无beforeSpawn的真实script/automated/prepare微任务形状；未发送零spawn，已发送仅按captured sid清理而不正常adopt。T14配置迁移未提前实施。

公共 managed DTO/五个方法/词典/native wire 均未变。只增加内部 SpaceService acquire guard、commit primary-start callback，以及 clock 中的有界观察工具与15s常量。原单queue/JsonStore/TerminalSessions owners保持。docs同步说明不可取消磁盘、占用隔离和unknown。

## 实际验证

- 受影响21入口：**171 passed / 0 skipped**，exit0，`/tmp/huhu-t04-a-repair-final-combination.log`，SHA `e0524c072aa75ab1bef156d36f1bf3530c0e44834261027b1780fd043c595899`。
- 最后只给native测试补own-PID退出断言/日志后，精确该文件再跑：**2 passed / 0 skipped**，exit0，`/tmp/huhu-t04-a-repair-native-cleanup-final.log`，SHA `2114b1d51cbd48f92805c4463cfe75e847bb55a515f56496faad289cc8d41d90`。不能把重复执行累加成173个不同测试。
- scoped生产tsc、最终scoped测试tsc与5个改动生产文件eslint均exit0/零warning；见checks所有真实argv/cwd/UTC/exit/logSHA。
- 初次红灯与中间失败均保留：9个F1/F2/F3行为红、3个Controller持久化stall红、backup→primary取消红；首轮闭包30绿/1旧timeout0夹具失败；原Node types/TS7030、happy-dom win类型失败。没有覆盖或把exit126改写成1。旧多对象故障测试改50ms保留全部effect/逐项/1request断言，另有0预算零effects独立覆盖，Root已接受。

### 真实 helper、Cookie 与清理

固定只读 helper `/tmp/huhu-t04-c-linux-final-20261025T103906Z`，23217880B，SHA `ce263fd68bdbd792d2b36f675d2ee838ff39052926ce688dcb06b086eb076343`，与Packet一致；本轮无cargo/target/native源改。

真实Cookie请求并非仅alive推断：`src/modules/agent/services/workspace-service-stop-native.test.ts` 的 natural-root-exit 用例调用并 **await** `browser.value.request('cookies','read',{path,kind:'firefox'})`，随后断言真实临时SQLite行。最终native日志原样记录 `cookieReceipt.rows`：name=`owned`、value=`fixture`。同日志记录两次同requestId stop/force，root code0、cleanup confirmed/0、output truncated。

最终F1 root1716487 / child1716490 / helper1716482均退出；同文件managed Space归档组合的shell1716697 / 1716703 / helper1716692也确认退出并重获writer。所有本轮原生日志中可定位的23个自有PID，经仅signal0复核全gone，原件 `/tmp/huhu-t04-a-repair-process-audit.json`，SHA `5bb29ac8601bbeccb9a40055cc72e1ea59ad5ac284960edf280bf1913600f4df`。该复核没有发送kill或触碰其他进程。

## 原件索引

- 全部当前A累计28源与本轮modified11子集：`/tmp/huhu-t04-a-repair-source.json`，SHA `217262ff07d8ef4b955756bf796cb087e9a0cee1846afe6551769fd259a18bb3`。原A其余路径只读保留；Packet未创建的controller-stop-recovery仍未创建，生产组合直接扩展原controller-managed-runtimes夹具。
- 精确命令与全部失败/通过：`/tmp/huhu-t04-a-repair-checks.json`，SHA `9e93a6e06a1980838dc655fd2613fe558409152fc37afe2b64afed60599bfc07`，共20条实际命令。
- 最终源原件：`/tmp/huhu-t04-a-repair-final-source`；本轮前16分配路径原件：`/tmp/huhu-t04-a-repair-before`；diff：`/tmp/huhu-t04-a-repair.diff`，SHA `094f1796eb586c1b3fb7ae7ec3131ffd196a1dd6cc0321482f9f3649db001dc3`。
- 首次新增测试的red修订未单独复制成执行时快照；原始工具编辑记录、未变reviewer probes/日志与冻结生产before原件均可回读，最终扩展测试在final-source。不将重建文件冒充原始捕获。
- prepared/首次观察/当前dispatch SHA分别在source/checks保留；Root只追加实际派遣回执，未归一化历史值。旧handoff/checks、reviewer probes和正式输入未覆盖。

## 边界与接续

永不settle的写不会被伪称取消；关闭observer失败后，该原owner可继续保持隔离至写实际settle或宿主结束。归档primary已接纳后物理上不可撤回，返回unknown并核实，而非承诺磁盘不会再变。测试覆盖pending/late success/late rejection和第二owner冲突；真实磁盘故障、Obsidian/Provider/账号/五平台E2E未运行，仍由用户负责。

A未运行全局build/lint/架构/Promise/bundle或生成main/styles；这些由Root统一整合。独立双轴复审尚待Root派遣，本候选不自行标T04done或G01通过。没有新写集/DTO/native/UI阻塞。

**SOURCE STOPPED；只读回执及/tmp交接完成，等Root接收。**
