# 取消与恢复联合窗口（Map20 / Goal19）

078精确修复后079独立双轴审查已真实通过并由Root完整回读接纳；前置代码门为evidence/T-13-logs/code-gate-groups-r2.json，审查输入72a351ff35de4f24dfc5f459e92fb288c4d52207eadde7243591f14cad8571a7。本Map20/Goal19窗口按原DAG启动T16；实际代码写入仍以Root原生080/081/082派遣为准。28票55AC、原产品合同与LOG051用户后验边界不变，不提交、推送、发布或归档。

## 唯一行为合同与已有证据

Spec §4、§7–9，ADR007–011/019，原T16 AC016/017/033为权威。066-recovery-current-seams与076-recovery-client-seams均已完整交回并由Root接纳，但只是静态路径/风险准备；实现者须回读当前源，不能把旧行号或建议接口当成现有事实。T13最终群候选、073/074/075及077失败、078修复和后续独立复审报告、Root独立迁移/群公开链/效果核查证据也必须回读。

1. 取消先持久关闭指定真实树/子树的准入，再传播已受理后代并通知同一个Executor；另一棵树/同Bot另Session继续。覆盖所有Claim通道、delegate/approve/Attempt.Dispatch/写效果最后门，不只HAP handler。旧worker即使不合作也不能取得新资格。
2. 崩溃后按持久事实区分未领取accepted、正常waiting_approval、未消费children/question结果、已被领取后中断的模型续跑、纯编排根与终态。accepted仍扫描、正常审批仍需决定；已running且中断的恢复树核查通过也只能发布资格，等用户点击，不因启动扫描或子结果到达直接再调用模型。
3. 恢复资格绑定真实受影响Run集合、树/Run修订水位、CP与固定配置身份、当前来源/完整Group贡献闭包、工具兼容、未决效果/任务投递事实。事务外检查前后均短Tx CAS；点击再次核验。Run.revision、claim、cancel、approval generation、recoveryGeneration、event seq用途分开，旧代/旧CAS明确拒绝。
4. 用户resume沿唯一runs.resume，必需CAS，复用原Run/root/thread/config/budget/effect/结果投递身份并产生新claim。不能用StartRun、CloneTask、清零取消代、重置usage或重新投递已完成子结果绕过；相同命令重放原回执、不同输入冲突，响应丢失不自动换key。
5. 非执行claim的只读CP检查必须真实完整读取HUHUCP1 envelope及payload，检查hash/版本/配置/工具/adapter兼容并维护reader hold/Close。不得伪造claim、仅查ref或直接读裸文件规避Blob Port。兼容判断纯本机，不调用模型/工具；未来三协议adapter消费同一公共Port，不泄漏SDK类型。
6. dispatching/unknown效果按既有账本核查，不能重Invoke或把重启/kill当无效果。T13已使owned无正文Effects.Get/Reconcile在成员移除后仍可用，审批Preview保持严格当前权限。优先复用现有核查服务/接口；需要新内部纯Port时由原owner明确，不能伪造HAP用户命令或复制一套规则。终态只追加核查事实，不复开。
7. Group proof是实际消费后的持久完整元组集合；SourceRefs为空仍查当前成员，remove/rejoin不复活旧代，不能只核原树直接成员/启动时旧Work。新公共历史已发表仍保留，恢复资格不恢复已撤private正文/附件标签。纯编排root无模型CP/模型pin/成员私有消费，不要求假A权限；实际user_batch/temporary沿真实身份。
8. 统一停止先关新受理/领取/物理派发，再取消并有界等待真实producer。超时保持unknown、槽位/pin/DB/Profile锁及隔离；未结束不能先释放锁让新进程启动。实际producer结束后再清理；受管进程强杀只是终止后备，下一进程仍需核查。页面/可替换连接关闭不等于取消任务，受管父EOF/模块退出进入服务关闭。当前单stdio CLI的进程边界要准确表达，不新增常驻服务。
9. TS恢复消费者检查真实hello capability与服务端资格，同一次明确用户动作保留command/CAS/资格代；双击合并、uncertain不假成功。恢复后仅目标Run作当前权限重锚，不能把普通tail状态当CAS或旧缓存当资格，不建立第二状态机/投影库。T20未来负责模块组合/界面，本票不造页面。

## 写集与原owner

准备开放的维护票仅T01/T03/T04/T06/T11/T12，再加T16新实现；T27仍只在Root最终build窗口更新产物。T02配置/凭证、T05授权、T07Host/核查、T13群业务与客户端先只读复用。若当前实现确有不能复用的接口，作者提交实际调用点/最小路径/行为原因，Root按原owner补窗口后再写；不得仅因旧准备表列到就扩写。

- foundation_go：原T01公共API/api.ts/合同生成物、Go入站/CLI/core装配/迁移注册及foundation回归；原T03同一Executor/Run/会话执行存储和chat回归；原T06 Broker/审批/CP Blob/effects及approval回归。T01 TS协议/managed消费者由foundation_client独占；api.ts仍只由foundation_go维护。旧SQL、go.mod/go.sum、base/profile实现默认只读，按需要先提最小请求。
- credential_provider：T16新application/execution/cancel与recovery、domain/execution/recovery、sqlite/recovery、016正文及tests/contract/recovery；原T11 SQLite collaboration/应用delegate及T12 usage/消息/等待/结果/预算末门和对应回归。016正文只此作者，注册只foundation_go。T04 Go/T05/T13谓词读取复用，不直接改他人路径。
- foundation_client：T16新增services/recovery/**；原T01 core/protocol/{connection,codec,method-validation}.ts及相邻测试、platform/desktop/transport/managed.ts及测试；原T04 services/events/event-client.ts及测试。api.ts/schema只读，纯TS services/core不引入Node/宿主。T13 GroupClient/mentions、T07 Host、未来T20模块代码只读。

先双方Go owner冻结唯一Port、资格发布/点击代数、恢复阶段/屏障/关闭合同与016形状，再通知TS实际签名/hash。可使用自有报告的接口简报交流；不能在空假接口上抢跑消费者，也不能以Port单测替代真正公开消费者。

## 验证与交回

原066/076场景是起点，不限制发现或测试数量。真实Facade/SQLite/同Executor及生产TS→HAP→Go链验证取消与委派/审批交错、已完成子结果防重投、完整/缺损/不兼容CP、撤权/Host/凭证变化、资格核查后变更、旧代/双击/响应丢失、普通accepted/审批/问答通道、关闭超时实际join与持锁、进程重开。使用独立一次性Profile与可释放barrier；所有producer/Node/Runner必须Wait。实际三协议模型、Obsidian/目标OS由用户后验，受控Engine明确标识，不索取凭证。

迁移016的实际版本由T01按已接纳顺序注册，旧013及更早SQL不变。旧版本完整DB+CP必须是真实当前版本产物冻结后升级；保留旧fixture哈希，不能用新建空库或改schema_version冒充迁移。已有100/800来源250ms、270 delta和其他旧断言保持，不因重测试并发抬阈值。重检查由Root安排唯一窗口；代码写入和固定输入矩阵不能重叠。

作者交真实最终REPORT、精确自有及共享输入SHA、实际命令/Wait/原始红绿/失败分类和未运行项，结构return0后native MESSAGE+FINAL并停写。Root独立代码E2E/build/lint及未参与实现的双轴审查通过后才推进状态。任何真实失败沿原owner最小修复，不清除原失败、换key或以更换执行者假重置。
