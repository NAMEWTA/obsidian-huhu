# T16 在 T07/T11/T12 之后的最小恢复接缝

Session: 20261025T043239Z
Task: 066-recovery-current-seams
Status: completed

## 聚焦交接

本次只读更新045/047/060，不代替059独立审查，也不激活T13/T16。按TASK沿用Map16/Goal15；当前源码由作者停写供059审查，正式代码门是否接纳由Root决定。产品依据仍是Spec第4节95–101行、第7节132–138行和第11节192行：取消限指定树，已运行树核查后等用户恢复，普通等待不能丢失，未知写入不自动重发，关闭须有界且持久事实可信。

**现存事实与已解决旧观察。** 取消已由`CancelTask/Approvals.Cancel → CancelSubtreeInTx`覆盖已接纳后代；同事务关闭准入、增加cancel_epoch、取消审批/continuation、dispatching转unknown，提交后才CancelRun。060提出的取消结果缺口已有`usage.CanceledInTx`：按child_run_id唯一写无正文取消结果，GetTask和ReadyParent读取同一账本；Finalize也强制保留子失败/取消/partial，不能被模型一次finished抹掉。045的“只能取消单Run”“子结果账本尚未来”不再代表现状。

问答/children等待已有持久CP、wait edges和parent_results，正常就绪由同一Executor领取并调用Engine.Resume；无CP的已完成聚合走CompletedResult，跳过模型。普通审批的批准/拒绝/过期也有pending→claimed→Continue→Resume生产链。T07已经提供`effects.reconcile`，区分可信committed、后置条件reconciled与unknown，终态只追加核查事实。旧Host反向请求取消关闭共享连接的观察已解决为按requestId发送`$/cancelRequest`并记录迟到关联，不能继续把旧问题列为当前缺陷。

**启动恢复仍缺整树资格控制。** 当前Recover仅把preparing/running改为interrupted、清claim；随后RecoverAttemptsInTx退还reserved，把dispatched按原预留额结为unknown并标旧进程producer已结束，最后清旧child_slot。其前提是已取得Profile进程锁，不可拿来处理仍活着的同进程producer。Claim已有interrupted/blocked祖先检查，但这不是完整树恢复记录：例如根waiting_children、一子中断、另一子accepted，仅检查后者祖先不能表达整棵受影响树的用户恢复屏障。

T16应先按真实root/parent关系分类，再开放领取。独立且从未领取的新根accepted继续扫描；pending审批继续等明确决定；已决但未领取的审批、正常就绪问答/children continuation沿原扫描自动消费。只有已领取却未确定完成的执行及其受影响树进入核查/用户屏障；不能批量把waiting都改interrupted，也不能把正常pending记录标claimed后放弃领取。已取消对象保持终结；已完成子结果按原身份复用。恢复不调用StartRun/CloneTask制造新意图，不重置预算根。

**需冻结的最小事实和Port。** `runs.resume`目前只有wire/TS预留，implemented=false；Go没有用户恢复API或资格查询，expectedRevision在预留形状中仍可省略。建议由T01补纯应用用例及现有Run查询中的资格/原因/代数投影：用户只交Run ID、CommandEpoch、expectedRevision、recoveryGeneration和幂等标识，不交CP或可信核查结论。短事务固定树范围、水位和阻塞状态，事务外检查，另一短事务CAS发布资格；点击时再检查并领取同Run的新claim。资格代与Run revision、cancel_epoch、审批resume_generation、问答parent_results.generation、attempt/claim各自比较，不得混用或清零。核查期间发生撤权、取消或效果结算应使旧资格失效。

CP已有不可变完整文件、摘要/大小/归属验证、已发布引用和reader hold；旧配置可从ReadExecutionConfigInTx及pin读取。缺的是**不要求执行claim的只读恢复检查Port**：Broker.Bind现在要求真实claim，不能伪造一个用来预检。纯Port应持有完整CP reader直到兼容检查消费结束，并验证引擎/格式/图与工具定义及payload语义；目前Metadata等值和默认huhu-engine-v1并不证明真实SDK兼容。先用受控Engine验证该Port和同Executor恢复，T16无需等待T08真实协议而成环。实际协议桥仍复用047结论，无法证明可重入或CP损坏时blocked，不靠试调用Resume检查。

恢复保留旧配置/工作线程/Recipient，重查当前Grant与有效来源、工具能力、Host绑定和凭证状态；旧pin不是永久授权。session-memory重启已标missing，TaskConfig中的旧凭证状态也不能代替当前Provider检查。本任务没有调用Provider.Status（它会实际Resolve）。真实发送继续经过Attempt.Dispatch，已发unknown费用不退、不清零；效果dispatching/unknown先沿T07核查，不能借新Host租约再次Invoke。完成结果、原effectId和核查回执保留，晚到可信效果只补事实，不重开终态。T13群身份尚未落地，最终incarnation/历史授权接口须待其冻结后回读；这里只保留“恢复资格与发送时都检查当前群边界”的消费者要求。

**关闭服务需要原owner统一。** Router已按Service.Stopping拒新HAP请求，但Shutdown只置位；单独Server.Close只关传输/断Host，当前CLI唯一stdio退出才defer Core.Close，不能把临时连接EOF等同进程关闭。Core现依次Executor.Close、GC、Provider.Close、DB.Close、Profile.Close；即使Executor三秒超时也继续关闭后者。T16不能在真实producer仍运行时照搬此顺序。最小统一服务由API shutdown、Core关闭和受管父EOF进入：关受理/claim/子准入/实际派发→cancel并有界排空→保存interrupted、已知回执或unknown→确认本进程producer结束→关闭DB并释放锁。超时保留未知及资源隔离，交受管进程终止后由下次持锁启动核查，不能宣称“超时即排空”。临时读者/页面离开不进入这条服务。TS已有close/exited及TERM/KILL后备，但T20模块生命周期和目标OS仍后续；进程退出不证明外部写入或费用已结清。

## 产物与验证

[接口与owner附件](interfaces-and-owners.md)给准确现有签名、最小维护路径与建议边界；[来源记录](observations.json)和read-excerpts.log保留时间/字节/SHA及读取段；[wire切片](wire-recovery-slice.json)记录resume预留；[最终来源复核](source-recheck.json)逐文件判断是否漂移。[命令记录](command-results.md)、command-observations.json、return-validation.json与manifest-verification.json保存实际退出及自有产物核验。

仅运行读取、rg、标准库摘要/自有文档处理、Git身份读取与return结构校验。未运行测试、构建、数据库/产品进程、模型、Vault、keyring、D-Bus或子代理。059的257文件/65来源及Input-SHA256来自TASK，未冒称本任务重算了其审查集合。真实模型、Obsidian与目标OS均user-owned/not-run，不索取凭证。本报告没有产品验收结论。

本次52个来源、60次读取观察在交回前复核均与最后读取SHA一致；完整摘要及UTC时点见source-recheck.json。HEAD为33c21e098ef3188cbab5a09f3e0a01fadb787715，branch为NAMEWTA/bot。摘要一致只支持本报告的静态观察，不代表059通过。

## 问题与下一步

下一窗口先由原owner冻结树资格/claim、CP只读检查、正常continuation恢复位置和统一关闭合同；T13最终群绑定另行回读。T16新目录/016正文owner由Root指定，旧SQL与正式状态未改。本次未复现或定案当前059问题；上述未装配能力是T16集成需求。

最小公共消费者场景共八组，**全部未运行**：

1. 新accepted根可继续；中断树中的accepted后代/兄弟不能绕屏障，无关树继续。
2. pending审批、已决未claim审批、正常问答等待重启不丢；claim后在Continue/Resume之间崩溃须用户恢复，效果不重发。
3. 缺失/坏/不兼容CP、检查中GC、未发布CP均安全拒绝；完整reader hold与旧配置保持，零模型请求。
4. 双击/重放/旧generation、revision、epoch及cancel竞争只产生一次合法推进；旧worker不能改新claim，同Run/effect身份不变。
5. 写成功丢回执、仅后置条件匹配、仍未知三分；终态核查不重新发布模型结果或重复Host写。
6. reserved/dispatched重启、迟到结算和子取消保留正确费用/partial；producer未结束不退占用、不提前释放pin。
7. 核查后Grant、能力、来源、凭证改变使资格失效；T13完成后再加入群移除/重加与零来源正文检查。
8. 临时EOF/页面关闭与受管EOF/shutdown区分；拒绝停止的producer、关闭超时、下一进程取锁及强杀后unknown均如实保留。
