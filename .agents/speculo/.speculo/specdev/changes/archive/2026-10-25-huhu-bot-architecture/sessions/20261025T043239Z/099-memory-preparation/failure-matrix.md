# 099：后续必要故障矩阵（全部未运行）

本研究没有产品命令、SQLite操作、模型或Host请求。以下是未来 T14/T15 开工时的验证计划；新套件路径来自票据，当前不存在不算测试失败。固定 Go1.26.10/按race需要CGO、共享输入/窗口由Root协调。默认装配的真实SDK、公开HAP和SQLite要参与，不能用fake ToolResult或API stub证明业务链完成。

| 窗口 / 真实入口 | 必须断言的持久与外部事实 |
| --- | --- |
| A两个工作线程、A委派B、temporary、群成员B/C；实际默认Engine请求捕获 | 只出现当前合法消息与selected memory；temporary不继承Sponsor库，群不合并私聊。namespace不能由工具ownerId或模型输出伪造。 |
| 公开memory.list/get→真实HAP/stdio；分页后forget/撤Grant/移除成员 | 当前页/下一页/cursor安全拒绝或重锚，未发旧正文；UI read不等于模型send。合法公开transcript范围仍可用，不因作者移除一刀切隐藏。 |
| 公开pin/correct/forget，并发同expectedRevision | 一次CAS；新head、索引有效性、generation、receipt同Tx；旧body不召回，固定项只形成候选冲突。重复同命令原回执、改payload冲突、commandEpoch旧代拒绝。 |
| completion/outbox后实际进程崩溃；重开 | 原聊天身份/成功/消息不依赖维护模型；持久去重补偿丢通知，只一来源意图受理；maintenance结束不再生成maintenance。 |
| outbox期间Bot换模型/disable/delete/credential删除 | admission-time配置选择准确；受理后独立pin不换最新模型；删除usage预检包含新引用；source旧pin释放不影响新pin。新endpoint缺精确Grant零HTTP。 |
| 无维护额度、额度耗尽、owner或Profile暂停 | public settings/job原因可回读；提炼HTTP0，普通聊天仍成功。不是默认无限额度或改purpose借普通root余额。 |
| 两维护作业争最后额度，公开下调介于Reserve与Dispatch | 最多一个实际HTTP；后者safe budget reason/未发可幂等Abort；已发producer照原账结算，不退款为零。与094真实预算消费者结合，不只数fake callback。 |
| defaultSDK成功/尾usage缺失或部分/HTTP断流/取消＋延迟body.Close | 每真实请求一个attempt；完整最终序列化bytes＋4096有限输出；只有完整usage known，其他unknown/estimate非零；最终producer ACK与body.Close前不Settle/释放pin/关Profile。 |
| settlement SQL statement或deferred FK Commit失败 | 原attempt dispatched/余额完整保留；只能重试会计，不重发HTTP；Core仍等未决producer/账本。 |
| 已recall→forget/correct→同当前Engine下一工具/HTTP或结果提交 | 原Run实际memory输入保持可达；当前代拒后续HTTP；旧callback不能新建item/新id复活；AppendEvent/Finalize/候选/物理投递不输出失效正文。 |
| forget后重新扫描原message/source/其跨Session摘要副本 | 新job拿新generation仍因无正文suppression拒绝；不能换hash/jobID逃逸。独立无关来源继续。用户明确private add才是新意图。 |
| 模型候选空/未知字段/重复JSON键/超长/截断/伪owner/ref/global/pinned | 无半解析写入；不信模型来源或批准；候选数/body/Derived预算保持，原job可读safe reason。 |
| private item被明确分享给B；B实际SDK输入后原source/Group成员代变更 | 不借B更大Grant续权；实际贡献的完整tuple/源闭包传给B与后代，零Host Source也检查成员；第二HTTP0/结果bodyfree，兄弟合法Run继续。 |
| maintenance真正Run/Resume/Dispatch后kill+Wait，再Open | 同一个root/account/job/config/CP/Decision；启动只核查无模型，ready仍闭门；用户旧CAS/水位/epoch拒绝，正确CAS同Run新claim；旧unknown费用保留。缺CP不能自动重新提炼。 |
| ready后forget、pin/目标修订、源/成员/配置兼容或job代变化 | click与最终Dispatch都拒；检查/点击作用域准确是该maintenance根树，普通未领取无关树继续；不泛阻全Profile。旧Host lease新接入明确blocked而非换字段。 |
| Stop持久事务失败、后台Background callback、慢HTTP与Close超时 | 同步进程门零新受理/Dispatch，实际producer结束前Profile锁/DB不释放；允许已派发真实Settle；outbox不自开第二scheduler。 |
| 全局proposal→公开预览→真实用户resolve | 未确认不可召回；双击/并发accept-reject只一决议；改scope/源/targetRevision/过期需新预览；同Txitem/revision/index/receipt，模型冒充用户0写。 |
| 用户保留fixed/global或T17清除受管来源 | 仅设计的遍历合同先验证可列全依赖；后续T17实际证明跨Session副本、candidate/job/CP/index/受管备份无遗漏，保留最小无正文费用/effect核查，不误删独立Vault文件。本票不实现清除。 |

建议最先四条垂直切片：公开用户private add/correct/forget＋真实SQLite；完成聊天→outbox→同Executor maintenance→真实loopbackSDK→item→下一聊天recall；forget barrier挡callback与重扫；全局proposal未确认/确认后另一Bot真实模型输入。这些切片先红再实现，随后只扩大实际影响闭包（private-memory/global-memory、policy、delegation/groups/access/events与recovery相关case）；不机械重跑不变的全仓检查。

物理页门需保留原800 subjects/250ms事实，不把长LLM事务塞进fence；新增memory输入为空时旧批量性能不能退化。控制真实顺序使用named barrier并清理producer/HTTPserver/Core，所有失败路径也Wait；测试准备预算与产品限额分别说明，不用任意sleep判完成。
