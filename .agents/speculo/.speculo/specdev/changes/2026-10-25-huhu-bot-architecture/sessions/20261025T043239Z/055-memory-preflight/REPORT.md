# T14 / T15 记忆、来源与迟到作业预检

Session: 20261025T043239Z
Task: 055-memory-preflight
Status: completed

## 聚焦交接

**T11/T12 现在需要可信执行身份、实际输入的派生来源和独立维护用途/账户；不提前建记忆表。** 047 模型请求 Port 已足够，无需新 Provider DTO、引擎、默认额度或模型。item/job/forget代数/索引归 T14，global proposal/回执归 T15。精确形状与 owner 路径见 [interfaces-and-owners.md](interfaces-and-owners.md)。关键简讯已实际交 Root 并获接收。

本报告只读研究，不构成实现、测试通过或开工。HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`；TASK指定 Map13/Goal12，048修复期间读取。最后26份来源复核发现 `sqlite/grants/access.go` 已变；其空来源/recipient观察仅对应12:00:04 UTC读取版，不用于判断048最终候选。来源SHA/时点见 source-recheck.json；其余相同也不等于冻结或验收。

### 1. 已存在的接缝与准确缺口

完整回读 T14/T15；依据为 Spec §5:103–118、§6:122–124、§9:164–168、§10:180–186、相关 ARCH/ADR 行段（附件）。ADR-012 已被024替代，不能继续用“首版仅固定记忆”限制自动维护。首条简讯误写“Spec §6.3”，已更正为 **§5:114–116**。

当前尚无 T14/T15 记忆或 T12 逐请求账本的生产实现。八个 memory HAP 方法均 `implemented=false`。TS条目只有 private/global、可选 owner/session 与不完整 SourceRef；mutation 的 expectedRevision 尚非必填，维护配置只有 enabled，global提案只返回ID。这些是未来补齐项，不是现存漏洞。

现有 Executor 顺序为 PrepareContext → 同 Session 最近20条 ModelHistory → 合并来源/Grant → 再授权 → MarkRunning → Engine。ContextRecord/消息 provenance 能追 Host 来源，但不能表达“聊天消息→工作摘要→子结果→记忆修订”的派生关系。Host SourceSnapshot 验证只接受 note/selection，不应伪造 Host 身份来装记忆引用。Finalize 已在短事务中保存结果/事件、释放 Session 和配置 pin；没有维护 job 消费者。T02 的配置/pin owner 是 **foundation_go**，不是 credential_provider。

### 2. 上下文合成与每次外发

Spec 规定权限与所有权，没有规定记忆在 prompt 中必须排第几段。建议先确定可信 agent/temporary namespace、Session/workThread 和接收方，再选本线程获准消息、显式 ContextEnvelope、当前有效的工作摘要及允许召回的条目，最后做有界裁剪/摘要和模型编码。物理排列是实现选择，不能把记忆正文提升为指令或授权。

持久 Bot 可在其工作线程使用自己符合范围的私有记忆；调用者不能因此读取目标私聊，群也不能默认汇总成员私聊。临时执行只接显式获准摘录和自己的任务记忆，不继承 sponsor 长期库。全局条目“所有获准 Bot 可召回”仍有 scope 和接收方约束，不等于给所有 Provider 外发许可。群历史范围、当前成员谓词沿045；P1 不另建自动群级长期库。

T11 共享窗口只应实现消息/任务结果的真实消费者：应用生成 namespace、输入种类/持久ID/不可变 revision 或 hash，并携带 Source/Grant 约束；T14 再加入 memory revision。模型不能自报 owner、删减 provenance 或扩大 scope。无法可靠细分出处时，建议保守继承实际输入并集，不能改称“模型原创”脱离来源。

摘要、子结果和记忆即使换了措辞，仍须在召回、摘要调用前、每次模型实际出站、父/群结果投递时检查当前来源/Grant/接收方及清除代数。已授权给 B 的原文不自动授权给 A；用户能查看也不代表允许模型发送。无 Host 来源的正文仍须有 namespace/当前成员/Run 检查，不能借现有空 Sources 的快速返回绕过这些未来消费者。read/send/summarize/memory/delegate/deliver 继续按实际操作校验，不新增全库 write Grant。

### 3. 自动维护作业与同一预算路径

Spec §5:114 明确：交互完成后产生可追踪作业，按来源 revision 去重；用所属 Bot 的模型与资料流向，另有明确维护额度并计入 Profile 总账；未配置、耗尽、暂停均零提炼请求，聊天仍成功且原因可见。维护完成不能再无限生成维护作业，模块关闭停止新受理。不要把普通聊天最终状态绑定到后续提炼成功。

建议持久完成记录驱动去重受理，内存通知只加速。job 唯一键绑定 namespace、来源修订及触发身份，不单按正文 hash。受理固定自己的 pin、purpose/account、recipient、来源/授权与代数。聊天终结会释放旧 pin，不能事后借旧 token；采用原交互配置须先取得独立引用，采用 job 受理时配置须明确记录，Spec 未指定二者之一。运行/恢复不读最新配置。

job 独立关联来源 Run，不复活已结束聊天或占原前台 Session，也不冒充委派子任务套4/8。T12 复用047逐 attempt reserve→dispatch→settle；摘要、提炼、后续请求和 SDK 重试均计账。暂停挡新请求；已发取消经 Close/Wait 结算，未知费用不盲退或记零。纯等待不持模型在途槽。

模型返回只形成有界候选；T14 在提交时重查 job claim、cancel/recovery/source generation、目标 expectedRevision、当前授权和人工 pin，然后同事务写修订、来源边、索引有效性和 job 结果。网络、Host、模型不得放进 SQLite 事务。人工固定冲突形成候选；correct 产生新版本，旧版本不可召回。恢复使用同一 Executor：未领取可按当前条件处理，已执行后崩溃须沿 T16 核查并等待用户恢复，不能因维护是后台功能而自动收费重跑。

### 4. 全局提案必须闭合到可信用户事务

模型只能提出 create/update/delete。应用固定操作、正文、共享 scope、完整来源版本、目标 revision、proposal revision/到期与 previewHash；用户实际看到的内容必须与这些事实一致。只返回 proposalId 的预留接口不足以支持确认，T01/T15 需提供可回读预览；具体可复用查询或扩返回值，不必先增加无消费者方法。

resolve 按可信 RequestIdentity 区分用户与执行器，不信 payload、Leader 或模型“已批准”。短事务检查 Profile/epoch、原回执、proposal/hash、来源/目标版本与授权，写条目修订及确认回执。重复接受回原结果；异payload冲突；并发接受/拒绝只有一个决议。过期、拒绝、改源或目标冲突不改条目；变更须新预览。全局修改/删除也不能绕成 private correct/forget。

提案未确认不可召回；确认独立内容/scope仍非任意 Provider 的 send 授权。删源时，已确认全局及人工固定项进入明确保留/删除预览；保留须有独立内容与范围依据，不能仅靠旧正文指针。

### 5. forget、迟到作业与永久清除

T14要求 forget/correct 原子失效召回/索引并提升作业代数；Spec §5:116 禁止迟到作业重建被忘事实。事务边界：比较条目版本 → 失效/新修订 → 提升来源或namespace代数 → 关闭旧job/candidate提交 → 索引不可召回 → 回执。只取消goroutine、删索引或领取时查代数均不够。

**代数不能单独阻止重扫旧消息再新建 job。** 建议另持久保存无正文的处理水位/失效lineage或墓碑，旧来源/派生副本不得换job/item ID再提炼。无法细分事实时，可保守禁止该旧来源范围自动再提炼，保留其他来源正常作业；这是实现建议，不新增语义分类器。文本hash识别不了改写，也不能为匹配永久保存被忘全文。只有可信用户明确再添加才是新意图，重扫/重试/模型自称均不是。

来源边须能从 Session/消息/Source 遍历到工作摘要、私有条目、子结果、后续副本、候选/提案及 job 输入输出。T17 清除先停止新准入并排空相关执行，再清受管正文、CP/Blob 引用、摘要、自动记忆、索引、托管日志/备份；共享 Blob 按仍有效引用处理。不能只删根消息后让后续 Session 中的副本失去祖先关系。失败时进入受限状态重试清除，不重开模型。

forget 的召回失效不等同于已经执行 T17 物理清除。对未知外部效果可保留 ID、状态、目标指纹、外部回执查询信息等最小安全账本，不能保留完整正文或可恢复 CP；Profile 清除等待未知效果核查完成，再更新 epoch 清理旧命令依据。已交付的独立 Vault 文件不因 Profile/会话清除自动删除。保留费用元数据也不需要留下 prompt、候选或工具结果全文。

### 6. 检索、摘要与模型实际看到的结果

使用已有关系存储、范围与来源约束实现有界召回，不新增 embedding/vector 或全库索引。过滤 namespace、可见性、失效 revision、来源/接收方应先于正文匹配、摘要或模型编码；索引只是候选，回表再次核当前版本。缓存和 cursor 必须绑定当前身份、范围及相关权限/记忆水位，不能凭旧搜索页继续发送已撤权文本。

同时限制查询长度、页条数、条目/总正文 bytes、来源引用数量及摘要输入/输出；超限明确截断/分页或拒绝，不静默丢 provenance。当前 Host 单次 read 65536 bytes、PrepareContext 总256 KiB、history 页最多100条是已有实现边界，不是新记忆默认值。具体记忆上限由 owner 在实际 schema/consumer 上一致冻结。

模型工具若暴露记忆，只接有界查询/候选内容/版本等必要参数，owner/namespace/授权由绑定上下文提供。返回结构要区分空结果、truncated/nextCursor、冲突、撤权、取消和系统失败；不能把失败包装成空成功。维护候选明确 observation/inference、目标版本和来源映射，不让模型自行升级为 global。摘要也是派生工作上下文，不因压缩变长期事实；截断 JSON、未知字段、伪造引用、重复键歧义、超长输出应在提交前拒绝。

## 产物与验证

实际只读材料、时间、SHA256 和行段存于 observations.json/read-excerpts.log；wire-memory-slice.json 保存八个方法及完整对应 schema 切片；inventory.json 保存 HEAD 与文件清单命令实际退出0。interfaces-and-owners.md 给出纯合同、最小逻辑表职责及原 owner 请求，均为建议，不是已实现代码。

固定参考复用 Hana `9a6cabf8…`、OpenBot `46642d6c…`、DeepSeek-Bot `1bebe826…`，许可/近两年活动/完整SHA见 fixed-reference-sources.json，机制见learning/02:111–131的固定源码链接。借鉴owner＋来源授权，不照搬Hana目录隔离保证、DeepSeek admin写team或辅助任务直连HTTP。055无新网络读取或上游执行。

以下为后续临时 SQLite＋受控模型回调的故障矩阵，**全部未运行**。用可命名 barrier 控制竞态，不用 sleep 猜顺序；每项同时断言真实请求计数、持久修订/回执、可召回正文与 pin/attempt 终态。

| 故障点 | 必须观察的结果 / owner |
| --- | --- |
| 相同 Bot 两线程、A委派B、temporary、群/私聊混合 | 只见当前合法输入；源私人正文不因公共结果外泄；T11/T13/T14。 |
| 同完成事件重复/并发受理，崩溃丢内存通知 | 一个来源意图一个 job；补偿不再提炼已处理旧版本；T14。 |
| 未配/耗尽/暂停额度，维护失败 | 模型请求0或失败独立记账，聊天保持成功；T12/T14。 |
| job 固定配置后 Bot 换模型/删配置 | 旧 pin 可回读且新请求复核当前权限；无偷换模型；T02/T14。 |
| reserve 前后取消、已发断流、重复 settle | 未发才全退；已发 known/estimate/unknown，producer结束再释放；T12/T16。 |
| forget 与回调交错、重启后旧 claim、旧来源重扫 | 两种复活均零写；显式用户新意图可另建；T14。 |
| correct/pin 与自动候选并发 | CAS冲突，旧索引失效，固定项无静默覆盖；T14。 |
| Source撤权/清除后旧摘要、跨Session副本、CP继续 | 第二请求/再投递为0；谱系失效传播且取消不污染无关作业；T05/T14/T17。 |
| 两用户确认、模型伪造确认、预览改源/改scope/过期 | 可信用户一次事务一次结果；其余无全局写；T01/T15。 |
| 提案/条目写后回执前注入Tx失败，再重放命令 | 全部回滚或同原回执，无半条目/双修订；T15。 |
| 空/超长/截断/非法候选，分页时撤权/forget | 有界且状态明确，无解析半成品写库或旧页泄漏；T14/T15。 |
| 清除中崩溃、共享Blob、人工固定/全局保留、未知Effect | 可续清、无旧epoch复活；Vault独立文件不误删；无全文“账本”；T17。 |

只读命令为 rg/sed、Python 标准库 read/hash/JSON、git rev-parse。一次回读误用大写 SPEC.md 实际 exit1，定位小写 spec.md 后重读 exit0，见 command-observations.json；未隐藏失败。部分定位输出被终端限长，结论对应行段/JSON已单独回读留存。未执行产品 build/test、SQLite矩阵、fake模型回调、Provider、真实 keyring/D-Bus、Vault/Obsidian；历史平台未测边界保持。

交回命令/退出见 return.json/return.log；manifest.json 列字节数/SHA。本研究命令全部同步返回，无后台、待Wait会话或产品writer。

## 问题与下一步

没有新增产品决定或用户授权问题。Root 可先在 T01/T11/T12 窗口冻结可信 lineage 与用途/账户；T14 开工时再接记忆 namespace、持久去重/失效与真实模型消费者，T15 完成用户预览/确认链，T17 消费同一来源与代数，按原 owner 串行维护共享文件。

未验证项就是上述全部矩阵、真实 Provider/模型质量与收费、真实 Obsidian 和目标 OS。此研究不把预留 API、历史 fake Engine 或 002 编译探针作为记忆验收。完成实际 return 校验并发送 MESSAGE/FINAL 后停写，不等待后续生产票。
