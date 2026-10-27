# 群来源夹具修复与事件等待成本交接

Session: 20261025T043239Z
Task: 086-recovery-fixture-repair
Status: completed

作者 `/root/credential_provider`；沿用户请求的gpt-6.1-sol/xhigh偏好执行，工具未提供实际底层模型身份核验。依据 [冻结TASK](TASK.md) SHA256 `ba8a6706b9e50cb094f07c5e6c7f004938fa7610278c68f6f8063498d2d76b96` 与Map21/Goal20正式窗口 `700fd303c43c72463671940d652ca59645f29e1e3172701a8073fd9a84d430de`；事件两测试路径由Root在量化后原生追加授权，不修改冻结TASK/正式状态。

## 聚焦交接

仅维护原T13/T04测试；生产、joined guard候选和081/085报告保持冻结。群夹具已改为真实根message与全部实际授权History的严格Derived对应，并用永久同文件barrier覆盖早/晚两合法读取顺序。事件成本三条外部诊断已完成，Root已正式授权局部夹具预算方案；全部三个永久测试路径已停写，同一冻结输入的两包normal/race已实际exit0并Wait。

## 产物与验证

输入377文件/树 `02eb94d9c8f4f6caeb2ca378554ad2f9f39c6b65847e7801be622787f0803dea` 固定于 [00](logs/00-input.json)，沿085已接纳的真实负向控制。来源测试精确diff [01](logs/01-groups-change.patch) 保留原整批缺Grant零写、A零模型/B及C各一次、History3项、完整附件originView、撤权/安全文字/实际出帧拒绝断言。新断言核每个实际child succeeded，并核实际History长度为[1,1]或[1,2]；后者在第二个Host.Read返回前等待真实已提交publication，不凭Engine进入计数伪造公开就绪。失败清理先释放fixture barrier再Core.Close。

[02普通](logs/02-groups-normal.log)actual exit0/Wait0.755s；[03 race](logs/03-groups-race.log)actual exit0/Wait4.280s，两个永久子case均绿，完整计数/来源/附件/撤权路径保留。原085旧谓词的late红/both绿不覆盖。

事件外部overlay及原/替换SHA在 [cost输入](probes/cost-input.json)。仅诊断把compact等待最多10秒以取得完整实际成本，永久原3秒未改；成功不是原3秒测试绿。270、seq274、来源/坏JSON等业务断言仍全部真实执行，无joined guard或产品语义变更。

| 单变量lane | 实际270 emit | AppendEvent 270次事务wall累计 | 其BeginTx累计 | 整体等待/实际GetRun次数 |
| --- | --- | --- | --- | --- |
| normal+原5ms观察，[05](logs/05-events-normal-poll.log) | 0.299161s | 0.263194s | 0.035567s | 0.307507s/41 |
| -race+原5ms观察，[06](logs/06-events-race-poll.log) | 3.262485s | 1.889086s | 1.371694s | 3.420863s/142 |
| 同-race，先等真实270 emit完成再观察，[07](logs/07-events-race-after-emits.log) | 2.049602s | 1.966170s | 0.081931s | 2.170343s/2 |

三条实际exit0并Wait，完整命令及有界lane参数在原日志，汇总 [08](logs/08-cost-results.json)/[09](logs/09-cost-summary.json)。均为单次样本，不当容量保证。插桩字段ConnectionWait实际度量db.BeginTx全过程（取连接等待与BEGIN），未独立隔离纯连接排队；Transaction为工作/commit及立即清理的wall时间，不是CPU profile。事务计数在compact Engine开始重置，实际观察调用数从waitTerminal入口计，二者边界不同。-race多约7倍的交易wall成本，加上5ms轮询在Base单连接上约134次GetRun（emit结束时累计事务0.930039s），与AppendEvent发生可观察竞争；减少观察后270原业务仍完整，Emit耗时显著下降。

冻结清单 [11](logs/11-own-before-matrix.json) 包含三路径前后SHA，自有tree `ae58ad9d2c6d24cda7373bd79573d2b0b3973c276f4b8ad9aaf3ae08a59b8ffd`；377联合tree `01c841f6c6eb51f180daacc2828703c83a12716044bfac272ecbb47360cd5f97`。相对080最后输入仅这三个测试文件变化，全部生产字节未改。两个包顺序-p1的 [12普通](logs/12-two-package-normal.log)/[13 race](logs/13-two-package-race.log)实际exit0并Wait，22.008s/261.758s，前后377源drift=[]，汇总 [14](logs/14-check-results.json)。race各包groups56.555s/events203.793s；原270正确性case4.02s，真实CURSOR_EXPIRED seq274、逐条SQL/History/Snapshot来源一致及坏/未知/重复来源与撤权拒绝均绿。实际800无来源subject门123.431ms、同Session100来源门34.926ms/HAP100项、400实际Run/800来源门213.628ms均小于原250ms；下一事务撤权仍拒写。这些是原门下实测，不修改或推广为其他机器性能保证。

## 问题与下一步

3秒来自history_test.go夹具，不是Spec/T04的270事务吞吐要求；Spec的spawn→ready与实际800subject/250ms投递产品门均未改。Root明确授权后已落地最小测试方案，精确diff见 [10](logs/10-events-budget-change.patch)：history_test.go只提取waitTerminalFor(t,run,budget)，原waitTerminal仍3秒；events_test.go仅此来源快照case第二compactRun显式6秒（本轮-race观察3.421秒留有限余量），保持原270/seq274/坏JSON/所有来源与撤权断言，不新增全仓race变量/build tags。短注释明确其为270真实事务及race轮询下的正确性等待，而不是吞吐性能要求。其余已过9包依未变输入复用，不重跑11包矩阵。

真实模型/Provider、Obsidian、用户库、OS keyring及目标macOS/Windows均未操作。没有提交、推送、发布或另开Executor；T16/T13联合代码门、080剩余静态检查和Root独立E2E/build/review仍由原owner完成，不将此测试维护交付当全Goal通过。

本任务所有7条Go命令及测试内实际子进程均已完成Wait，无仍在跑的实验/producer；三个永久路径停止写入。原085的受控旧谓词红、04/05原3秒红、08/10joined仍红完整保留且081/085报告SHA未改；本任务未用无改动重复择绿。Root已转交唯一Go窗口给080完成剩余vet/生成/架构，本作者不重复这些检查、不自行跑插件build/lint。最终冻结/输入回读与实际return另有本任务回执。
