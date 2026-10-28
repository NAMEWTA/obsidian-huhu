---
schema_version: 2
session: "20261025T043239Z"
task: "098-chat-review"
kind: review
change: 2026-10-25-huhu-bot-architecture
ticket: T-08
---

# Chat 默认产品链独立双轴代码审查

## Goal
由未参与 T08 及本轮必要维护实现的 native:/root/recovery_review 独立判断标准轴和规范轴；这是 SpecDev I 的最终代码审查，不修改生产或永久测试，不再委派。复用用户 Agent Team 授权与既有 reviewer 偏好。Root 已实际收到092/093/094/095/096各原生MESSAGE+FINAL并全文回读/亲自return0；全部作者停写。

## Inputs
repo /home/wta/orca/workspaces/obsidian-huhu/bot；branch NAMEWTA/bot；HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715；Map23/Goal22，完整28票55AC不缩减。本次冻结 evidence/T-08-logs/review-input-chat-r1.json；Input-SHA256: 5f30fe1c5e4d8a359dbafde9c7a651bef03fcd878fdf5b8e4b50ffdd8a8d12ae。

先读 AGENTS 发现及实际 dev/testing/licensing、SpecDev I 审查/error/test-reliability/risk-review规则，T08与T01/02/03/12精确维护合同、Spec/架构中对应协议/预算/恢复条款。LOG051和用户刚再次确认：只要求代码开发与代码层总验收；真实模型、Obsidian、用户目标OS操作由用户后验，不索凭证，不以此阻塞代码门，也不能谎称现场通过。

完整读取092-engine-chat、093-engine-foundation、094-engine-policy、095-engine-notices、096-default-model-fixture的REPORT与对应关键原始日志、Root evidence/092至096-lead-return.json。T08私有冻结合同 evidence/T-08-logs/chat-private-contract-map22.md；047/087研究按真实必要点回读。原091/T16已接纳底座可按逐SHA和实际影响闭包复用，不能用历史绿掩盖新SDK接缝。

## Workspace and Scope
审查全部可达调用闭包，不按文件owner限制发现；实际新增主体为common/chat五生产和十二测试、bootstrap/core及Go锁、assistant service/ports与实际预算/Probe消费测试、旧chat workflow一处预期、实际依赖许可工具/声明。只读生产、永久测试、Skill、正式Evidence/Map/Goal和他人报告；仅写自己的REPORT/log和外部固定副本的定向探针。当前生产冻结，但097是只读下游准备，不是本票实现。

不提交/推送/发布/归档，不调用用户密钥/真实Provider/Vault/keyring。你可在本次唯一检查窗口自主选择有价值的定向反例；保留真实命令/env/exit/Wait，别重跑未失效大队列或无差别全模块race。任何源/锁/模式/HEAD漂移通知Root，不能继续把变动输入当本次固定审查。优先固定Go1.26.10，常规CGO0、race按实际CGO1；不能用local1.27诊断冒充正式绿。所有实际子进程、Body、SDK producer、settlement worker须结束或明确保留未结束事实。

## Acceptance
两个轴各自 pass 或 request-changes，不限制 findings 数量。每项先可证伪失败假设，沿真实调用入口、生产、测试、恢复找反例；给可达条件、路径行号、影响、严重性、最小修复和验证方法，实测/源码推断/未验证分开。不重复作者自报就判通过。

协议：仅显式Chat，不混协议/fallback/env默认；Persona原样，Intent一次；只发当前已授权History/Sources/消息/子任务约束；SDK私有。合法wire alias/摘要与AllowTools∩注册一致，严格schema/JSON/UTF8/连续index/原ID/type，整批预检后才能首Invoke。空{}、交错多工具、ID/name只首片、同index身份变化、重复ID、未知tool、额外身份和超量不执行部分效果。

每物理HTTP只Reserve→Dispatch→实际传输一次，实际SDK序列化完整UTF8 body收费（schema/history/results在内），无自动retry/redirect/endpoint切换。预发送可AbortUnsent、Dispatch已入即便网络0仍unknown；完整known0、缺usage/partial/错误unknown保守收费且真实SQL保留，不把非nil默认TokenUsage当known。撤权/群成员移除/暂停/缩额在后续模型实际准入再查，不能首次批准后无限请求。

生命周期：固定Ext/ACL producer在stream.Close返回之后最后sw.Close，精确reader io.EOF才ACK；cancel/sink error/panic仍排空，不能consumer.Close/网络EOF冒充完成。同步Stream错误在未创建producer时必须实际Close；正文/行/event/gzip解压/idle/总期限/工具参数/输出/CP均有限。所有context/secret副本/transport/body/callback值归属明确。metadata只GET显式单段model、无收费fallback，能力未测空，停止门从Resolve前覆盖至清零/实际返回。Core不能因超时释放仍在用的Profile/SQLite。

结算前实际producer结束；Settle持久失败不能假成功/退款/遗弃。保留同不可变观察的单本机worker并阻止Done，恢复SQL可自动结清，不新HTTP/Run，无并发map/wg死锁或停机泄漏。固定错误枚举防Provider/key/body泄露；区分MODEL_SETTLEMENT_FAILED与Executor最终公开MODEL_PRODUCER_UNSETTLED语义。

CP：内层完整消息/初始前缀/原批序/Next/已完成结果/pending effect+token或waitIDs、协议/Run/Session/config/tool摘要有自洽验证；完整新外壳/digest不能洗白语义损坏。纯Inspector零凭证/模型/工具/Host。特别检查初始前缀与Persona、合法角色、text/turns、最后pending和原工具结果对应，初始prefix不能被攻击性篡改变成插入历史的通道。Resume只消费原immutable Decision、children/question原WaitForIDs与身份顺序；不重Invoke已完成/待审批效果，不生成新Run/root/意图。CP写失败/SQLite发布失败不留假pending；旧fakeCP默认新引擎明确blocked，原Inspector控制ready，无新HTTP。

F01–F20按092表区分已实测/源码约束/既有基线复用/未逐一排列。11非2xx实际产品红与Go1.27诊断、06/14/17/19等fixture观察错误分别保留；不声称每个墙钟/panic/kill排列都新实测。093旧schema8/CLI/Probe join，094实际Budget并发/selector/metadata，096仅旧空模型负控且零attempt都检查必要闭包。旧T16真实crash/公平性无需机械重跑。

095精确40第三方模块/含Go runtime41；五目标实际GoFiles/模块union/许可证完整正文/来源摘要/未知版本failclosed，缺Ext根文用固定提交、Sonic Boost与附加署名、golang-asm Inferno、Logrus/MIT、YAML AND均检查。NOTICE/main/styles未变；未来协议进入闭包须再算，当前不等于T27最终发行完成。docs仍原6锚点加新1fixture分类，单独列remaining，不谎报绿色；此项原owner最终集成已追踪。

Root真实E2E：evidence/T-08-logs/lead-chat-e2e-r3.json，固定1985输入SHA fe7c6b9e4073ce94556033c10fb8c04c752092badcc87bfc7ddf5c1785a9b306，生产CLI+私有fd3/4+实际TS/HAP+SDK loopback+真实生产Host/read/write/receipt适配器（只Vault API受控）。7生成/1metadata、2次自然CLI exit0、审批原2calls一写一拒、重启历史/缺session key；SQLite7settled producer1、known4总58/unknown3总13102、committed/rejected各1、pin/slot/reserved0、integrityok/FK[]，sourceDrift[]。r1仅误用publicBinding含额外字段被HAP正确拒，r2误用小写rejected而实际安全APPROVAL_REJECTED，两次Root探针错误原始保留；r3复用同输入r1成功Go二进制，仅重打TS探针，无生产修复。不能把受控Vault说成真Obsidian。

## Return
REPORT首个h2前Session/Task/Status；standards-output与specification-output两个独立锚点，各含Reviewer: native:/root/recovery_review、Axis、Result、Input-SHA256: 5f30fe1c5e4d8a359dbafde9c7a651bef03fcd878fdf5b8e4b50ffdd8a8d12ae、Observed。记录原始探针/对照/限制，最终摘要复核；亲自return0、全部停止写入与进程结束后实际MESSAGE+FINAL。Root全文回读后才维护正式状态，不宣布后续Ticket或Goal完成。
