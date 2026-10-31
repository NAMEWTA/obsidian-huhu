# T-04 A 交接

**SOURCE STOPPED**：全部仓库/target源码与产物停写；仅本/tmp交接材料。无commit、push、发布、归档。

观察UTC：2026-10-25T10:29:44.992586+00:00。A实际改动 **28 文件**；原分配中另 16 文件未变。Root/C/B未分配源不在A候选。

- source：`/tmp/huhu-t04-a-source.json` SHA256 `eb4062c8be3992ec74aef18e24284d3f735a39747f8fa08eba5c6b689aaaa04c`
- checks：`/tmp/huhu-t04-a-checks.json` SHA256 `f3c25da39db17ade12a35210e72fdebb59894e5e023caee096e8401a6eeebbe1`
- 精确源码原件：`/tmp/huhu-t04-a-final-source/`（逐文件path/bytes/SHA在source）
- 初始原件：`/tmp/huhu-t04-a-before/`（40个原有分配文件；未恢复/覆盖前序脏改）
- 原派单：`.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-04-dispatch-a.json` SHA256 `db6116b670c75fdd284e1bda70980a63d92f4cc37b974b49917016ef4d59b105`

## 实际闭合

SpaceService仍是唯一业务持久writer；prepareSession在同一verified commit保存runtime代次与unconfirmed attempt，TerminalSessions同步采用原runtimeId。未确认旧attempt不可覆盖。终止证据复用C的shared validator，记录state与root/cleanup严格对应，不把旧helper/numeric exit/null exit当清理完成。

TerminalSessions是唯一运行owner。停止同步关新用户输入/未发spawn，保留captured lease/SID的output→headless parser→reply/ACK。stop重入不重置deadline，短等待/取消只影响observer；pending取消可保存not-started，迟到准备不能重启/改新代次。保留退出前输出及旧numeric observer合同，remove不伪造exit(-1)，释放期间parser reply/ACK走专用drain通道。旧或断开的lease也保留用于准确报告清理拒绝。

previewArchive是短queue读取，零持久commit/准入gate。确认后同queue比较冻结成员/attempt并建立scope gate，覆盖commit→reserve间隙；停止等待不持磁盘queue。逐对象checkpoint可查，partial/unknown/保存失败不归档。最终flush后、queue内及首个写入前检查取消/原观察deadline，晚取消保留rows与partial；Space只父级archived，Session归档才标目标，不删除历史/布局。

公开四方法+只读openManagedRecord已由Root核读冻结，原DTO和UI签名未再变。无Pane持久记录可零helper/scan/spawn打开真实布局占位，pending仅报告而不注册未来显示continuation。恢复仍显式操作；fresh Restart清本次旧native来源，explicit Resume保留接受的N1，权威record不从旧Pane回填。旧attempt不能回写新来源。

Controller同步停止新动作，先stop/checkpoint/严格drain再释放native与writer；TerminalAutomationRuntime.dispose现返回幂等Promise并准确传播registry失败。末次保存失败保留预写unconfirmed底线。新增错误在report边界用messageKey本地化；完整自动化结果/receipt、原始prompt去重和只粘贴行为不改。

## 最终验证

| 检查 | 实际结果 | 原始记录 |
|---|---|---|
| 20个定向入口（含真实helper） | exit 0，140 tests passed，0 skipped | `/tmp/huhu-t04-a-final-combination.json` / `.log` |
| scoped生产与所有本轮modified测试类型 | exit 0 | `/tmp/huhu-t04-a-final-types-v3.json` / `.log` |
| 13个实际生产文件定向eslint，零警告 | exit 0 | `/tmp/huhu-t04-a-final-lint-v2.json` / `.log` |
| 显式缺失binary负例 | 预期exit 126，module load明确拒绝，0执行/不fallback | `/tmp/huhu-t04-a-native-explicit-missing.json` / `.log` |

checks中有 **53 条实际命令**，完整argv（含env）、UTC起止、exit、logSHA及recordSHA均保留；全部log逐字节核验匹配。不可将预期负例、筛选掉其他用例或fixture失败计为产品通过。

最后主要log SHA：
- `/tmp/huhu-t04-a-final-combination.log` `eb7d763e15656dd63c9fb4d4683217e2211efbbb576f9deb1a38d2a0e8851814`
- `/tmp/huhu-t04-a-final-types-v3.log` `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- `/tmp/huhu-t04-a-final-lint-v2.log` `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`

## Linux真实范围与清理

Root授权固定中间副本 `/tmp/huhu-t04-c-linux-candidate-20261025T101553Z`，22911832 bytes，SHA256 `b3a2049edabc03ddfabb8a111aae4686b3eb21cce18a15ccd7625919b4f09724`。首跑前工具核SHA；后续before/after原始命令SHA一致。A未运行cargo或写target。4文件5个真实Linux用例均在最终20入口中通过：PTY原入口、managed detach/attach、缺Shell可解释零进程、真实丢回复unknown、managed停止/归档/隔离/重载。

最终managed stop：Shell PID 1611929、另一Shell PID 1611937、helper PID 1611913。目标证据 root exited/code1/signal Hangup，cleanup unix-session confirmed/remainingKnown0，output drained；没有把停止映射成业务exit0成功。另一Session继续输入输出，Cookie capability只租用、不读账号/文件，PTY释放后仍alive。所有自建Shell/helper均确认退出，writer重获，隔离Vault删除；原始PID/证明在final-combination.log。

一次旧lost-reply fixture的finally因新增unknown release拒绝提前结束，保留原失败日志；随后确认该次两个自建PID均ESRCH、核对stable Session属于同/tmp fixture后删除。清理原件 `/tmp/huhu-t04-a-retained-fixture-cleanup.json`。改后fixture明确断言AggregateError并仍确认PID/helper退出，最终全绿。

所有本轮native测试均支持可选HUHU_TEST_PTY_BINARY；显式给定却不存在直接失败，无变量保留各自原开发发现。Root已告知C最终native候选即将交接；本报告的真实Linux通过仅绑定上述中间副本，不替代Root最终受影响组合重验或C跨平台验收。

## 红灯与失败历史

- durable attempt、archive gate、records跨字段、observer IO/根exit drain、pending stop迟到重试、registry strict drain、晚取消final flush/queued commit均有真实行为红灯与最终绿灯，精确配对在checks。
- N1 fresh Restart风险的有效红灯是 `red-restart-provenance-v2`：单变量旧行为留下N1；原fixture命名冲突导致的0tests失败不算行为红灯。修复后fresh restart拒绝旧N1、explicit resume保留N1、旧attempt fence均在最后140中通过。
- 原回归80中22失败、中间30中5失败/随后38中1失败、legacy73中5失败等都保留；包括旧fixture未协商capability/旧拒绝预期，及实际迟到/stale remove问题。没有删除历史或用skip掩盖。
- 最初默认生产tsc未skipLibCheck误用了较宽范围，依赖d.ts报错exit126；未生成产物，未改依赖。之后全部用/tmp scoped config。两轮定向lint的timer与rejection警告/错误已修，用注入owner window clock及worker兼容端口，不关闭规则。

## 后续边界

A无已知检查阻塞，保持SOURCE STOPPED。Root负责统一最终build/full lint/架构/Promise/bundle/正式状态及独立两轴审查。B已停写，C继续其独占原生边界；本A manifest只冻结A源。没有真实Obsidian、Provider账号、五平台用户E2E通过声明；这些仍按原合同由用户验收。
