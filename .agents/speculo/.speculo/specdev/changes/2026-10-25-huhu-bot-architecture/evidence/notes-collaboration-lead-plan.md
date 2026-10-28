# 单笔记与联合协作：Lead 验证输入

Map14/Goal13，行为权威为 Spec 与 T07/T11/T12；以下是未运行的验收设计，代码交回后在固定输入上实施。Root 拥有整体 E2E，作者定向测试保留并按输入复用。真实 Provider、Obsidian UI 和目标 OS 按 LOG051 为 user-owned / not-run。

| 跨边界场景 | 必须实际观察 | 主要入口与证据 |
| --- | --- | --- |
| 写预览、批准与拒绝 | 批准只改原确切目标；拒绝零 mutation；CP/审批/事件/回执一致 | 真实 TS HAP＋Go Facade/Broker/SQLite，生产 HostWriteService＋受控 Vault API |
| 源变化、同路径对象替换、所有编辑器脏内容、create 碰撞 | 写前拒绝、无隐式换目标/文件名；新预览才形成新审批 | Host adapter 同步 CAS 与公开错误、前后内容 hash/mutation 计数 |
| 写后回执丢失、旧连接关闭、新连接核查 | 原 effect 不重发；可信 completed 为 committed，仅后置条件为 reconciled，否则 unknown；终态只追加核查事实 | 同一持久 Profile 和本机最小回执，多代真实 pipe 连接；回读原 Run 与事件 |
| 单 child 取消与迟到 Vault promise | 兄弟任务/其他 root 连接存活；真正 promise settle 前占位不释放；迟到证据归原 effect | 两个真实反向请求及独立退出/cleanup 观测 |
| 同工具重复与新用户相同正文 | 同身份一次受理、异参冲突；新用户意图新 child；accepted 提交后丢 Wake 仍可扫描 | 公共协作用例、真实 SQLite，同一 Executor；重开后任务/消息/回执/配置 pin |
| existing 与 temporary 隔离 | existing 不读目标私聊；temporary 不增加 Bot、任务配置重开可读、未终结引用阻止凭证删除 | Engine 实际输入捕获、目录计数和原凭证元数据 guard；无 OS keyring |
| 父历史、消息、子结果来源逐跳传播 | 明确实际消费的来源进入 child/回程/下一模型准入；撤权不泄露旧正文，不能改接收方洗白 | 当前 T05 实际应用/SQLite gates、真实 Engine input/dispatch callback 计数 |
| notify/question/reply 与等待图 | notify 零模型唤醒；重复有限；送达/应答/完成不同；同 Bot 新线程合法、真实环 RESOURCE_LIMIT | 同一个 Executor、持久投递/消费回执及根限制快照 |
| 深度/累计/并发/自动唤醒、最后额度竞争 | 3/32/4/8/8 生效值与 hello/status/根快照一致；wait/reclaim 不死锁；被拒请求未发送 | 固定压力输入、实际 callback 并发与持久预算/席位，不以 Engine.Run 次数冒充 HTTP attempt |
| 已发/未发取消、缺 usage、维护未配置 | 已发保留 unknown/estimate 负担；未发幂等退款；producer 实际结束才释在途位；维护零出站 | Reserve/Dispatch/Settle 消费者＋真实 SQLite，带 root/config/purpose/claim 归属 |
| 父终结与子树屏障竞争 | 活动后代/待审批/unknown 时不 succeeded；结构化局部结果；并发受理后代在屏障内且 sibling 不取消 | 公开 cancel/查询与同 Tx 子树事实，Model/Host 回调计数 |
| schema 5 升级至实际 6/7 | 一致 DB＋全部 registry 引用完整 HUHUCP1 副本＋最后清单；缺失/损坏/发布故障阻止迁移；后续 live GC 不破坏副本 | 原 Profile 锁/base/bootstrap/effects/Blob，真实旧 schema fixture 和独立文件/hash/关系检查 |

最终冻结范围包括本次公共合同、Go 实现/测试、TS 协议与 Host 服务、051 五路径和适用工程输入。Root 验证完成后，由未参与实现者对固定同一候选做标准/规范两轴审查；作者完成声明或结构校验为 0 均不替代该门。新发现只使受影响证据失效，历史 046 失败与 050 修复接纳保留。
