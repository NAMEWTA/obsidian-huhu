# 153 Memory 集成修复交付

Session: 20261025T043239Z
Task: 153-memory-integration-repair
Status: completed

## 聚焦交接

已修复151独立审查的F1、F2，交回本域作者候选。合法128来源的普通聊天现在能完成并保留全部输出依赖；无法再容纳输出自身Ref的维护作业记录为终态拒绝，不回滚聊天。具有真实Sponsor群绑定的temporary可读取当前获准公开群历史，仍保留自己的namespace/thread与私有隔离。只修改 `memory/completion.go`、`memory/context_plan.go`，新增两份本域真实Core测试。API/Executor/usage/grants/groups/Engine/SQLschema/锁及143祖先算法、149alias修复未改。F3由154负责，155的Core修复由其原owner负责；本报告不代替Root组合门与独立复审。

原红复用151实际探针，不形式化重跑：第64轮127来源成功，第65轮合法128来源在完成时被新增输出Ref推至129，`RecordCompletionInTx`错误使同一Finalize事务回滚；原probe未配置模型，不能将其说成pin泄漏证据。另一探针已证明temporary的Sponsor与Group.Members匹配，却因原agent-only分支得到空ShortTerm。原始来源摘要见只读记录（历史日志已清理：`logs/01-source-read.json`），151材料保持原字节。

F1只转换 `mergeRefs(consumed, source.Ref)` 的精确 `RESOURCE_LIMIT / MEMORY_PROVENANCE_LIMIT`。已校验的全部128 consumed refs仍保存于输出和拒绝job的origin关系；新输出的六字段完整身份保存在原completion outbox。job使用已有 `admission=blocked, commit_state=discarded, reason=MEMORY_PROVENANCE_LIMIT`，无Run、task config、input JSON或digest；没有伪造可执行的129输入，也没有丢掉一个祖先腾位置。扫描仅接受pending commit，显式ReadAdmission同样拒绝此终态。source/scope/materialize/outbox/job/dependency/水位与未知SQL错误继续向外传播，由原事务整体回滚。坏JSON和实际SQL失败反例已经覆盖。

F2只把公开群页的audience从agent限定推广至实际Recipient：普通Agent使用AgentID，temporary使用已固定SponsorAgentID，且必须在真实Group.Members中。后续沿原PublicMessageVisible、当前成员代数/历史范围、sourceAccess与完整祖先检查。未替换temporary的身份、namespace或thread，未查询Sponsor私聊/私有Memory来填充，也未给群外existing默认群页。

## 产物与验证

两生产完整patch（历史日志已清理：`logs/02-completion.go.patch`）、群页patch（历史日志已清理：`logs/02-context_plan.go.patch`）、原完整字节和四源最终冻结（历史日志已清理：`logs/13-final-source.json`）均可回读。四源mode均为0664，最终tree为 `c0292e5278035c80099db9bf8d85efa944f84eecac3aaef301919afd8ed2da0b`。

| 文件 | 修改前SHA256 | 最终SHA256 |
| --- | --- | --- |
| memory/completion.go | 2fc5014951de8c08c6baef060871056bf2dba99feaca62741e791c9d10e11f67 | 04de5507ad5c67b28f54c75623df8401c6d2e8c01109133d33284fa872c7d81b |
| memory/context_plan.go | 5dd204fa11fa3bd0110325c51e4f5761679731975195710d56447dca8033fd95 | ed9c80e7882559fa2903e626b659ce3b37602572f1d7d5facd52e5830a320e34 |
| private-memory/completion_capacity_test.go | 新文件 | 6a6e101cf5bb748a987986227dd6dda263a09ec2598708ed86906573fba01c62 |
| private-memory/temporary_group_context_test.go | 新文件 | 0b657e400a13dc2eb45a4ea240381d215cf68050d5c69e6ed1e7d8464e362ffc |

与149接纳的31源逐项比较，只有上述两生产变化，加两新测试成为33源，详见本域逐源对照（历史日志已清理：`logs/15-domain-comparison.json`）。`dependencies.go`仍为 `2fdae080990d702d2d8cc41ec3e2d5487985c1821d28fd87b06a1b0875c75d0e`，`context_view.go`仍为 `6642a95211d695d0d20bcd8c64fa1f6ceb64db48a28813254651baf745e22f46`。没有新增生产import、build tag、embed、模块依赖或迁移。唯一Go窗口开始时先核03冻结，再gofmt四源，实际diff为空；随后只有群测试的观察方式发生修正，生产和长链测试始终保持首候选字节。

先实跑Go版本（历史日志已清理：`logs/05-go-version-result.json`）：绝对路径Go1.26.10，环境为GOTOOLCHAIN=local、GOWORK=off、GOEXPERIMENT空、GOFLAGS=-mod=readonly、GOPROXY=off、CGO_ENABLED=0。实际 `go list -deps -test -json` 为483包，仓库编译/embed/锁/本包fixture闭包207文件；不是把准备时的估计数量当事实，外部模块与toolchain选择保留于原Go list。所有测试串行 `-p=1 -count=1 -json`，群命令90s、长链命令240s上限，既有每次等待7s与关闭6s未延长。

| 实际命令记录 | exit / 实际Wait秒 | 包时间秒 | 结果与分类 |
| --- | --- | --- | --- |
| 07 群初测（历史日志已清理：`logs/07-group-initial-result.json`） | 1 / 2.515141451 | 1.241 | 4子场景过；两次正文拒绝已过，末尾公开GetRun也被当前成员代数门拒绝，新测试观察方式错误 |
| 08 SQL观察初版（历史日志已清理：`logs/08-group-fixed-result.json`） | 1 / 9.631627675 | 8.306 | 错将编排根也要求canceled/closed；原7s到期，保存interrupted原日志 |
| 09 单场景状态观察（历史日志已清理：`logs/09-group-state-observation-result.json`） | 1 / 8.614702457 | 7.274 | 无正文观察确认helper已canceled/closed/slot0；当时root preparing，不以当时值代替最终值 |
| 10 终态观察（历史日志已清理：`logs/10-group-terminal-result.json`） | 1 / 2.559543802 | 1.284 | 重新加入命令与正常Finalize竞争session revision，得到合法REVISION_CONFLICT |
| 11 群最终（历史日志已清理：`logs/11-group-fixed-result.json`） | 0 / 2.567252955 | 1.283 | 1顶层、5子场景全部通过 |
| 12 长链首次（历史日志已清理：`logs/12-capacity-initial-result.json`） | 0 / 156.699423503 | 155.665 | 1顶层、2子场景全部通过；70轮45.49s，含私有Memory的70轮及Forget后第71轮110.16s |

群测试修正保留前置实际公开publication、两次 `ReadContext=nil` 加 `GROUP_MEMBER_REMOVED / GROUP_MEMBER_GENERATION_CHANGED`、私有正文隔离和原期限。仅以真实SQL观察取消helper终态、编排根合法终态；重入放到原本要求的终态barrier之后，固定session revision，不加sleep/重试。08/09的“root也必须closed”是新增测试额外假设，已去除，未改产品生命周期。最终实测helper与Sponsor为canceled/RUN_CANCELED/claim0/closed1/slot0；root为succeeded/CHILD_PARTIAL_FAILURE/claim1/closed0/slot0，历史wait-edge=0、可调度父执行=0。此处claim1不是活动producer证明；实际Core Stop/WaitClosed后pin/slot均0。各轮原字节、ZIP、分类和完整测试修正patch（历史日志已清理：`logs/10-group-fixture-final.patch`）保留。

最终两个永久消费者的覆盖：

- `TestTemporaryContextUsesOnlyItsCurrentSponsorsPublicGroupAudience`：已加入者读取公开哨兵、加入前none拒绝、明确range准入、群外existing不获默认页、撤销并重入后旧binding继续拒绝。真实API先创建Sponsor私聊、另一子线程、session/profile私有Memory，实际temporary输入不得混入这些正文；ShortTerm保持自身subject/thread/session，旧History/Messages为空。受控Engine下model_attempts为0，证明提取上下文本身未启动模型请求。
- `TestCompletedChatKeepsFullProvenanceWhenMaintenanceCannotFit`：两组各70真实普通Run，第一组精确保留64=127/65=128边界，全部成功结果、assistant行、outbox/job、runs.start回执、Session释放及完整Run/output来源逐项核对，饱和job的origin与全部128消费来源精确相等。公共History读到140消息与饱和输出，ReadFacts返回完整128祖先，下一轮整体省略超限可选条目并计入OmittedAuthorized；拒绝job不进入扫描且ReadAdmission拒绝。第二组公开Forget后ReadFacts返回MEMORY_FORGOTTEN，History过滤旧输出，第71轮不再消费旧revision。两组均实际关闭Core并暂停重开，读取同一discarded/no-Run拒绝。

长链Engine是显式受控进程内实现；它使用实际Attempts Reserve/Dispatch/Settle，Dispatch回调不发HTTP。分别70和71次普通attempt各known 1+1、producer ended、reserved0；每轮在运行中确实看到1个配置pin，终态全部pin/slot为0。维护额度0，maintenance attempt、绑定维护Run、新candidate及agent写入revision均0；direct场景的child slot零只是负向资源控制，不冒称发生过子槽占用。没有真实Provider/Host请求。SQL故障控制在已停止Core后的真实第二Memory adapter事务中注入并整体回滚，原70 outbox和拒绝job恢复；坏derived JSON仍报MEMORY_STATE_INVALID。

6次命令输入均drift=[]，6个ZIP各207文件的字节数、SHA与mode已逐项核验；最终11/12共同输入tree为 `74348654e5838f8f6e254b26595088a77a4d8a5771574eb096d1d8bb5b8d7a0a`，当前输入逐项相同，见归档核验（历史日志已清理：`logs/14-archive-verification.json`）。全部子进程实际Wait，所有测试Core均退出，归窗时无Go/compiler/test活动，见进程观察（历史日志已清理：`logs/17-process-observation.json`）。已明确向Root归还Go窗口；此后只收口本任务文档和[产物manifest](manifest.json)。亲自结构return结果保存于 `logs/18-return-result.json`，结构通过不替代行为验收。

## 问题与下一步

本范围两项发现已具备实际绿证据，无未解决的本域实现失败。初测额外失败均已保留并分类，未扩大128、削掉祖先、放宽成员权限或延长等待。discarded不重调度由实际扫描/显式受理负控及固定终态共同证明；重开为ExecutorPaused的持久状态读取，不冒称重启worker已执行，也不冒称恢复session secret。此次新增当前失效控制是实际Memory Forget与群成员撤销/代数，不冒称重跑外部Grant撤销全矩阵。

Root负责复用最终精确输入的长链结果并完成其余共享测试、物理CLI/三协议组合E2E与独立复审。本任务未运行全量SDK、旧800性能矩阵、race/vet、Node产品测试或插件构建；143/149未变源码与既有证据按影响保留。真实Provider、Obsidian编辑器及目标OS均由用户现场后验，不索取凭证。本报告不宣称T14或28票/55AC整体完成，不修改正式票据、Map/Goal、永久知识或发布产物。
