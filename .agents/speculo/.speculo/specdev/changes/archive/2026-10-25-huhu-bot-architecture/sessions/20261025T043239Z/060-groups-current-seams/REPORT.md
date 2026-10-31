# T13 群路由：T11/T12 落地后的增量接缝

Session: 20261025T043239Z
Task: 060-groups-current-seams
Status: completed

## 聚焦交接

范围是当前 Map16/Goal15 的只读增量核对。复用045，未激活T13、未打开依赖门。Spec第2节（55–65行）已明确无@只调用协调者、显式@只调用目标、全部目标受理前校验、一根意图、成员撤销与公共历史；第3节（89–95行）约束调用树和等待；112行隔离群公开记录与私聊/私有记忆。下述建议仅为这些既有行为找当前消费者。

**1. 现有合同能承载目标，尚不能承载群受理。** `SessionCreate` 已有kind/memberIds/coordinatorId，`RunStart` 已有targetAgentIds；TS与wire也预留updateMembers/setCoordinator，但methods.json标为未实现，Go `ConversationAPI`/HAP尚无方法。direct域校验拒绝group，多处存储读取只取一个成员；003表约束kind=direct、成员session_id唯一。需要013演进及群路由入口，不能只放宽DTO。成员/协调者变更须实际CAS，新增成员历史明确选择“不提供”或确定区间；当前可省略expectedRevision、可空historyScope的预留形状不够。mentions绑定agentId，普通姓名不触发；沿用一次runs.start提交所有目标。

**2. 显式@B/C不能把协调者A伪装成父模型。** 当前direct只接一个目标，且必须等于首成员；受理pin首成员并由其模型生成Recipient。`PinInTx`本身允许Model=nil：带来源时，后续Validate才拒绝未配置Recipient；A有模型但来源只授权B/C时，同样会按A权限拒绝。即使越过受理，`NewChildInTx`要求preparing/running父及真实claim；Delegate还检查A的AllowedCollaborationTargets。DeriveChild及后续派生授权复核父read/send/delegate，清空父来源又会因子输入超出父范围被拒。ReadyParent拼接结果还按父Recipient检查read/send/deliver。故这些路径不能直接拼成用户@广播。

最小方向是**可信用户批量受理编排根**：同一事务校验全部成员、分别固定B/C配置与Recipient/Grant、创建群绑定子任务、根预算/limits及命令回执；任一目标失败整笔不受理。编排根只承担意图、占位、树控制，不读取来源正文、不调用A Engine、不创建虚假A claim、不扩大A Grant。需持久区分“用户批量受理边”和“模型委派边”，由服务器事实构造授权；现有ParentScope契约不能简单置空绕过。B/C再委派仍走原模型父证明。普通无@路径仍由A真实执行并使用现有工具。

**3. 同Executor可复用的部分已经真实存在。** 独立TaskConfig/workThread、root/budgetRoot、根limits快照、子执行槽位、parent_result及`Work.CompletedResult`均已接入。后者可在Context/Engine前直接Finalize，但Claim当前仍先读取执行配置，不能假定裸编排根已受支持。群根需原owner补执行角色/配置读取和批量子受理合同；不另造Executor。全部群子任务继承同一预算根及原3/32/4/8/8限制，不给每个成员重置额度；等待/取消后实际producer结束再释放占用。当前子结果只回父，Finalize仅把顶层Session执行写公共message；ReadyParent按child_run_id聚合也不是群完成顺序。T13须独立公共发布消费者，复用`MessageInTx`的Session seq并以稳定子Run/结果标识去重；群公共发布不应强迫正文流经A模型。

**4. 成员身份是新增的持久条件，不能依赖来源非空。** 当前Context/RunAccessInput无membership incarnation或历史授权版本；Attempt.Dispatch已在发送线性化事务内重读claim、取消代数、Recipient和Grant，可接群当前成员谓词。应把可信群绑定（Session、成员agentId、incarnation、历史授权版本）沿派生工作保存，依次检查于历史组装/PrepareContext、实际Dispatch、最终公共发布、history/snapshot/tail物理发送。现有空来源快速返回、direct ModelHistory空来源直通、delivery仅检查Session有成员，均须由群消费者先检查身份/历史范围。复用T04 WithDelivery及读fence，避免另造推送机制。区分成员模型可见历史与用户已合法公开历史：移除成员阻止旧incarnation未发布正文，不能因此抹掉用户此前合法可读记录；重加成员产生新incarnation，不能复活旧工作。

**5. 子树取消已有实现，不必等待T16。** `CancelSubtreeInTx`关闭任务/效果准入、增加cancel_epoch、取消审批/continuation，已dispatch效果保留unknown；调用者提交后逐Run调用Executor.CancelRun。群移除需在同读fence和事务内先撤销该成员incarnation，定位本群绑定的相关子树，再复用此helper及提交后取消；不能按agentId取消其他群或私聊。当前active_run_id非空即busy，waiting_children/blocked/interrupted仍占位，协调者CAS需沿用；根终结或明确停止后方可切换。保留unknown、回执、pin与在途结算语义，不以逻辑cancel冒称外部副作用已撤回。

**另列作者正在修正的现状假设：** 最初所读4a81a605…版本的`effects.cancelOne`未发布结构化子任务结果，而ReadyParent依赖结果表；Root已交052/053核查。最终复核发现文件变为87f6406c…，15:27:29 UTC回读已出现同事务`CanceledInTx`钩子及非根未装配拒绝。因此旧“取消结果没有发布入口”观察失效；钩子下游及运行闭环仍由原作者验证，本任务不定案。它与T13“成员结果公开到群”的新增消费者不同，不能互相替代。

## 产物与验证

[签名与owner清单](interfaces-and-owners.md)列现有签名和建议方向；[observations.json](observations.json)记录逐文件时间/字节/SHA，完整已读段在read-excerpts.log；[wire切片](wire-group-slice.json)保留相关预留合同；[最终来源复核](source-recheck.json)记录漂移。

实际只读命令与自有文件校验见[command-results.md](command-results.md)、return-validation.json、manifest-verification.json。未运行构建、产品/数据库进程、测试、Provider、Vault、keyring或D-Bus；未再委派。所有故障场景均未跑。结构return只证明交接格式，不是产品验收。HEAD为33c21e098ef3188cbab5a09f3e0a01fadb787715，branch为NAMEWTA/bot。

观察期间usage/store.go从c3b98108…变为89e791c3…，assistant/store.go从646bce8c…变为ec8e245d…，effects/approvals.go发生上述取消钩子变更。已分别回读相关limits/Dispatch/current、Pin与cancel段；旧版本观察不能用于最终候选。完整摘要和时点见附件；最终复核中若matchesLastRead=false，则该路径此前观察失效、待原owner复核。052/053仍可能写入，这只是时点证据，不能宣称冻结。

15:28:15 UTC最终摘要另发现`usage/finalize.go`由40f50f64…变为f042f984…、`collaboration/store.go`由6f98fee7…变为2f6cc2df…；未继续追读活跃修复。涉及Delegate校验、父结果聚合/ReadyParent和GetTask结果的上述描述均是**旧版本接缝索引，已失去当前候选证明效力**。取消outcome修复及这些路径的最终行为由052/053交回与独立审查核验；本报告不会抢占其窗口。

## 问题与下一步

先由原owner联合冻结“用户批量受理边、编排根角色、可信群绑定、公共发布/取消outcome”最小合同，再开T13实现。T01/T02 pin/T03/T06属foundation_go；T04 Go/T05 Go/T11/T12属credential_provider；T01/T04 TS与mentions属foundation_client。新群业务/013正文可由credential_provider维护，迁移注册仍T01；旧001/002/003/005/006/011/012不得改写。

后续必要场景均**未运行**：①A无模型且只有B/C来源授权时@B/C成功、A零调用，缺C权限整笔拒绝，无@仍A执行；②成员撤销分别卡在Context、实际Dispatch、Finalize、物理发送前，包含零SourceRefs和重加入；③其他群/私聊不受取消影响，unknown与回执保留；④waiting/blocked/interrupted期间协调者CAS拒绝、明确停止后可变更；⑤B/C反序完成公共seq稳定、重复完成不重复发布、断线分页/快照不遗漏或暴露私有子线程；⑥当前取消子任务outcome由原作者先证伪/修正，再验证群消费者，不能用未来T16掩盖。
