# 071 等待槽位测试同步修复

Session: 20261025T043239Z
Task: 071-delegation-wait-repair
Status: completed

## 聚焦交接

只修改 `native/huhubot/tests/contract/delegation/wait_test.go` 的 `TestChildCheckpointWaitReleasesAndAtomicallyReclaimsRootSlots`，及同文件必需的 database/sql import。此前已通过的 `TestExplicitCheckpointWaitResumesSameExecutorForChildrenAndAnsweredQuestions` 与辅助方法原字节保持。没有修改生产、调度顺序、权限、API、SQL、依赖、其他测试或正式状态，未再委派、提交、推送、发布。

已按 AGENTS / 当前 Map16 / Goal15、dev 测试参考、SpecDev I 与 test-reliability 读取本 TASK、070 完整两轴、原整包 race、原 isolated 通过和强制交错探针/输出。原059三项产品缺陷本次没有重开；070 唯一 P2 是测试未约束前提，不是产品 slot 死锁，也不是053早期终态/defer清槽缺陷。attempts2 与原 request-changes 结论保持，由Root管理新候选。

原文件 SHA `160126a3a10ec2dae92ba3a769bf92fdc18ae9991da620505653da0fbe3481bd`；最终 SHA **`7c5d9de337c41651384ef0c98c6dbd179887e6ce417daedd230f1b843f33fa1d`**。完整单文件差异见 05-single-file-repair.diff（历史日志已清理：`logs/05-single-file-repair.diff`），旧字节见 before-wait_test.go.txt（历史日志已清理：`logs/before-wait_test.go.txt`）。最终265文件清单 06（历史日志已清理：`logs/06-final-source-before-package-checks.json`） 的树摘要 `62aff51305e0af709247b797fa501c0f70bd953a6413216e386b70a491d2d5c9`；相比070仅该测试路径变化，其余264个文件（含全部冻结生产）逐SHA一致，Git文件模式不变。12末次回读/清理（历史日志已清理：`logs/12-final-source-and-cleanup.json`） 确认无漂移、gofmt0、无自有进程。

## 产物与验证

### 原红灯、因果与复用边界

精确复用070已有确定性红，不机械重跑旧测试择绿。01（历史日志已清理：`logs/01-before-current-input.json`） 先确认当前265个候选文件与070逐字节一致，070 REPORT SHA `7a5044ad9a4a22ec79b343216582a39a811e807dd8dd5821cc622865854deb07`；02（历史日志已清理：`logs/02-reused-deterministic-red.json`） 固定三个原始日志及原/强制探针、diff的SHA与解释：

- [原整包impact race](../070-notes-collaboration-r2-review/logs/impact-race.log) exit1，只有本用例5.36s报原死锁文案；当次未记录失败前SQL，不能事后声称其精确状态已知。
- [原受理顺序isolated观察](../070-notes-collaboration-r2-review/logs/slots-observed-race.log) exit0，存在正常顺序，但不能覆盖原整包失败。
- [合法强制交错](../070-notes-collaboration-r2-review/logs/slots-forced-schedule.log) 保持原5s判定，Root受理前四parent后等待四leaf真实进入，再受理末二。到原边界为 leaf running/slot1=4、parent waiting/slot0=4、parent accepted/slot0=2、root waiting/slot0=1，故“waiting必须7”不可达。原失败仍保留 exit1；随后真实release使root成功、calls13/resumes6/slots0，证明是测试持有leaf排除了合法时序。原完整 [探针diff](../070-notes-collaboration-r2-review/probes/wait-probe.diff) 只读。

这些原证据由070以go1.27.1执行；本作者完整回读并复用，没有假称自己以go1.26.10再执行旧探针。根因不是停止的parent占槽：占槽的四个真实leaf正由测试刻意持有。

### 新同步与原断言逐项承接

同一原测试保留两条实际公共Tools / 同Executor路径，均独立临时Profile：

| 场景 / 观察 | 同步与断言 |
|---|---|
| `batch-admission` | 原Root连续受理六parent，不改变生产排序。四leaf实际Engine握手、六parent受理完成握手与Root持久waiting共同建立稳定观察点；允许合法的waiting/queued分布，不假设所有parent已先运行。本轮各次实测parent waiting6 / queued0。 |
| `four-leaves-before-last-parents` | 原070强制交错直接成为永久控制：Root发出前四parent后等待四leaf已在Engine中取得slot，再受理末二。稳定点严格断言parent waiting4 / queued2、leaf running/slot1=4、root waiting/slot0=1、calls9/resumes0，随后才release。 |
| 原waiting与queued不占槽 | 两场景均保留所有waiting/accepted的slot必须0，且其真实task配置pin仍在；四个占槽者必须是实际leaf。原“同时7waiting”仅是错误前提，由两个可证明的分布替代，未移除槽位释放合同。 |
| 原根4 / Profile8及Resume重新领取 | 每次实际child Run / Resume开始读取自身持久running/slot1以及根/Profile计数，分别≤4/≤8；实际活动child计数也≤4。公开Run.limits仍为原4/8。此单根用例真实达到4；整包原多根压力用例仍验证Profile8，未声称本单根填满8。 |
| 完整CP及真实结果 | 六次Resume均Open并完整读取/Close原CP的child-state，检查唯一成功leaf结果、原文leaf及真实父子Run关系；没有注入虚假TaskOutcome。 |
| 原完整生命周期 | 每场景仍须13次Engine.Run、6次Engine.Resume、6个leaf、13个Run succeeded、最终slots0；并检查活动数0、maximum4、所有task/legacy配置pins0、wait edges0，实际Root历史包含全部六个joined且非partial。Root收尾不额外调用模型。 |

前缀所有握手和持久状态等待共用**原5秒预算**；终态沿用原wait helper。没有放宽超时、轮询重试整个测试、固定sleep碰顺序或吞掉失败。SQL状态仅作观察，未修改调度；5ms ticker只轮询已定义readiness。失败路径defer解除held leaf，Core.Close实际等待Executor；每个CP reader明确Close。引入的SQL观察错误从Engine回调返回，不在工作goroutine内调用Fatal。

### 实际命令与退出

均使用 `GOTOOLCHAIN=go1.26.10`，真实临时Profile / SQLite / 同Executor / bound Tools；`-count=1`，命令串行，所有执行进程实际Wait。

| 检查 | 真实日志 / 结果 |
|---|---|
| 最终定向normal：`CGO_ENABLED=0 go -C native/huhubot test -mod=readonly -timeout=45s -count=1 -v -run '^TestChildCheckpointWaitReleasesAndAtomicallyReclaimsRootSlots$' ./tests/contract/delegation` | [11](logs/11-final-target-normal.log) exit0，包0.445s；两场景均13/6/slots0 |
| 最终定向race：同定向命令加`-race`，CGO1 | [04](logs/04-target-race.log) exit0，包6.179s；两场景2.65/2.51s，原各自5s前缀预算保持，无race报告 |
| 整包normal：`CGO_ENABLED=0 go test -mod=readonly -timeout=6m -p=1 -count=1 -v ./tests/contract/delegation` | [08](logs/08-package-normal.log) exit0，wall6.491s；完整原用例及新两场景均通过 |
| 整包race：上一整包命令加`-race`，CGO1 | [09](logs/09-package-race.log) exit0，wall58.852s，包58.140s；目标两场景2.92/2.65s，无race报告 |

10命令回执（历史日志已清理：`logs/10-package-check-results.json`） 与唯一 07执行器（历史日志已清理：`logs/07-run-package-checks.py`） 记录整包前后同265输入无漂移，非零会停止，没有重复求绿。首轮 [03定向normal](logs/03-target-normal.log) exit0/0.451s 后仅把新增回调SQL错误从test.Fatal路径改为Engine错误返回；因此在最终字节上另留11的定向normal，不把中间字节冒称最终执行。

末次回读脚本最初误将Git100644直接对比文件系统0600，产生诊断exit1；源码SHA检查已通过。改为Git实际记录的可执行位比较后Git mode drift=[]，没有任何源文件或权限改动、没有为此重跑Go测试；事实记录在12，不冒称产品失败或隐去诊断错误。

## 问题与下一步

授权单文件修复与必要定向/整包普通和race验证已完成，测试、报告和日志停止写入，所有进程及reader实际收回；return结构校验见 13-return-validation.json（历史日志已清理：`logs/13-return-validation.json`）。Root接续固定候选3与独立审查，本报告不自改070 verdict、attempts2或正式票状态，不宣称全八票/28票完成。

没有运行不受影响的TS/build/lint/跨平台/迁移矩阵，也未访问真实模型、Provider、keyring、D-Bus、用户Vault/Obsidian或目标OS。它们的既有证据仅按摘要和本次测试专属影响复用；本次证明测试可靠地覆盖两种合法交错及既定生命周期合同，不新增产品调度约束。
