# 下一窗口公共合同准备

Session: 20261025T043239Z
Task: 057-notes-collaboration-contract-prep
Status: completed

## 聚焦交接

本次仅只读准备，未启动052。已完整回读T07/T11/T12、036/041/045/047/055最终报告、055附件及Root两份研究接纳，复核当前代码。当前事实与建议分列在[合同草案](contract-draft.md)；公共类型/精确字段尚须052/053/054实际派遣后共同冻结。050复审窗口中未写任何产品/schema/测试、未启动DB或重测试、未唤醒其他作者。交回前Root通知050接纳与Map14生效，只改变后续派遣前提，不追认本研究有实现写权。

优先三处：同一个Executor接真实child/thread/config与逐HTTP attempt能力；T07单请求取消不能关闭共享Host连接；011/012迁移前必须备份完整DB+CP恢复集。另已向Root报告temporary凭证引用遗漏原删除屏障的问题，并取得准确owner安排。

## 产物与验证

**现存事实。** `api/tooling.go`的ToolExecution只有Identity/Run/Access/Claim/Agent，ToolCall/Result偏note.write；`api/conversation.go`尚无逐请求Port，EngineInput.Agent只表达持久Bot。`sqlite/execution/store.go:169`仍将RootRunID设自身；003约束direct Session、一Session一非终态Run，不能直接放child。`assistant/store.go:481–545`只有Agent-only pin/read/release。`executor`已有唯一Claim/Finalize/Resume和审批continuation，worker=2不是Spec子并发4/8。注册当前Version5，011/012应按实际6/7连续注册，历史SQL不改。

**共同合同建议。** Executor从持久事实绑定principal/Profile/epoch、agent或temporary subject/sponsor、root/parent/run/workThread、claim/cancel代数、固定配置/recipient与实际有效输入；再向Engine给受限Tools/Attempts。工具参数不接caller/root/预算/approved；用严格具名args/result多态扩目录、委派、消息、取消，不另建执行器。DirectoryEntry只摘要，不回完整Agent人格/credentialRef。temporary有独立TaskConfigSnapshot和任务namespace，不新增agents行或读取Sponsor长期库。

**同Tx边界。** 053的collaboration Repository在一个短Tx调用052的配置pin、AddChild/LoadWork及原event/receipt helper，与T12计数/额度一起提交root/parent/thread/config/lineage/Delegation/accepted/回执/首事件；commit后只Wake，扫描补偿。可见Session与隔离workThread分开，不能以B私聊当工作线程。取消先同Tx关闭指定子树准入并纳入并发受理的后代，后取消contexts，不波及兄弟。父终结由真实后代、审批、dispatching/unknown及费用事实守卫，partial/失败可回读；正常审批Resume保留，运行过的树人工恢复仍T16。

**来源与记忆边界。** ContextEnvelope的messageIds/摘录从实际父线程解析；输出保存所消费消息/子结果的种类、稳定ID、hash/revision和namespace及祖先约束，模型不能删refs洗白。任务文本、问答、回程结果各次取当前read/send/delegate/deliver与父范围交集，不照抄不匹配child接收方的旧Grant IDs。T14未来加memory revision；现在不造memory表或伪造Host SourceSnapshot。

**逐请求与限制。** Reserve→Dispatch→Settle绑定真实claim/config/recipient/provenance/purpose/account；同模型回合的HTTP重试每次新attempt，任务Retry才新Run且保留原预算归属。known退确认余量，estimate/unknown保留负担；已发取消不能全退或记0。producer实际退出才释放HTTP槽。建议子执行占位以已领取资格计数：queued不占，持久wait且producer已停才释放，唤醒同Tx重领；累计32不返还。此计数谓词待业务owner冻结，不能把4/8偷换成所有HTTP默认并发。根0层、3/32/4/8/8保持；维护单独purpose/account并入Profile总账，未配/暂停/耗尽零请求，不借终结聊天余额。

**T07闭环。** 可信prepare/check派生完整全文baseline、opaque目标及原lease/版本，不把selection hash当全文CAS。invoke绑定profile/workspace/origin、effect/approval、参数/预览/内容指纹、工具实现/策略/目标版本和expiry；Host最后同步CAS检查真实对象及所有编辑器。query带当前连接资格但查原fingerprint，只读；可信completed才committed，现状符合仅reconciled，否则unknown。公开核查只收effect身份/CAS，不收客户端自造成功证据；终态只追加ledger、不重开Run/pin。

**反向RPC。** Go `stdio/server.go:469/491`取消仍Close，TS `connection.ts:413`非read abort仍finish。建议增加严格单ID取消控制与有限late关联；仅同连接原method/fingerprint/generation可匹配，未知/重复仍fail-closed，关联满则拒新请求。取消不能释放尚未settle的Vault任务quota或制造第二次response；迟到写证据记原effect，关联过期后依持久query核查。

**准确owner请求。** 052独占`api/**`、api.ts/唯一schema生成、HAP/stdio/bootstrap；原`assistant/store.go`配置pin、`execution/**`统一scanner/child helper、`conversation/**`线程加载、Broker/effects核查及`migrations/embed.go`注册。053独占011/012正文、collaboration/messages/usage与T05；Root已同意其窄维护`sqlite/assistant/credentials.go`和原guard测试，使temporary引用进入同Tx删除/配置回收屏障，raw provider只读，不能为避写集缩减temporary合同。054持TS HostWrite/note-effects、原connection与sources目标准备；051/T27持receipt根/排除/工程，不另造根。

**迁移新增接缝。** `base/store.go:74–98`目前只VACUUM DB，`bootstrap/core.go`随后Collect。按Root已定方案，052沿原base/effects/blob/store及foundation/approval tests，迁移前从旧DB副本枚举CP并复用Artifact校验，独立复制完整HUHUCP1编码文件，DB/Blob大小/hash/版本/Profile/epoch清单最后发布同步后才迁移。缺失/损坏/失败停止迁移；备份不在live GC目录。T17清全部完成/半成品恢复集，T19完整恢复后续；不新增公开backup API，不持旧文件锁rename替库。

实际只执行文件读取、rg定位、标准库hash和Git HEAD核对；HEAD为33c21e098ef3188cbab5a09f3e0a01fadb787715。[sources.json](sources.json)保存来源SHA/字节数与Root给定候选2标识b7701a79…de33，属于观察摘要，不认证050。一次猜错T12文件名后已定位完整读取；若干长输出截断均分段补读。作者native:/root/foundation_go，沿既定gpt-6.1-sol/xhigh派遣偏好，不冒称实际模型认证。所有读取命令已Wait，无后台进程。

## 问题与下一步

无新增用户产品决定。只待实际派遣后由唯一owner冻结typed args、temporary引用形状、子等待/重领计数、写fingerprint与取消关联界限；这是实施合同收敛，不是再次用户审批。本片completed仅代表准备交回。047/055及本草案全部故障矩阵仍未运行，真实模型/Host/OS/keyring亦未接触；没有生成、build/test、DB、提交、正式状态或永久知识写入。Root接收后另派052，当前停写。
