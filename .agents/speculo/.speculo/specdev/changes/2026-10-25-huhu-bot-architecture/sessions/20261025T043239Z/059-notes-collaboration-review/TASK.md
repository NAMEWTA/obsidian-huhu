---
schema_version: 2
session: "20261025T043239Z"
task: "059-notes-collaboration-review"
kind: review
change: 2026-10-25-huhu-bot-architecture
ticket: T-07
---

# 单笔记效果与协作策略联合候选独立双轴审查

## Goal
由未参与生产实现的原 /root/foundation_review 对当前完整冻结候选执行标准轴与规范轴审查。仅 Root 实际 followup_task 启动；已接受的 gpt-6-astra/high 偏好沿用，不冒称运行时 attestation。不得实施修复或再委派。

## Inputs
repo /home/wta/orca/workspaces/obsidian-huhu/bot；branch NAMEWTA/bot，HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715。Map16/Goal15、LOG051和LOG072–082；28票/55AC不变。按AGENTS发现入口、当前Map、dev、T07/T11/T12及T01/T02/T03/T05/T06共同维护读取I最终审查、公共code-review与risk-review，T27只含051运行根、058三个路径与062两个精确测试夹具lint范围切片。不是另启C Work或reviews目录。

唯一候选输入将在 evidence/T-07.md#review-input-notes-r1 冻结，文件/来源数量与Input-SHA256由 evidence/T-07-logs/review-freeze-notes-r1.json 及Root实际派遣消息确认。准备TASK不表示输入已冻结或审查已开始。先核对真实输入摘要、HEAD、index与完整文件快照，不能只看git diff漏掉未跟踪的新Go/TS目录。

完整回读052-note-effects-go、053-collaboration-policy、054-note-effects-client、058-host-receipt-docs-cleanup最终REPORT及实际日志；另读061-ts-limit-fixture的单文件测试维护回执与062-native-fixture-lint的精确配置回执，确认src生产检查未被屏蔽；Root当前TS原150通过/1旧夹具失败与同生产字节E2E复用边界不可混称生产修复；052原审批后waiting红与同输入修复绿必须保留；287文件r2全Go的Assistant删除checkpoint自锁超时及原测试修复、LOG080取消/嵌套partial反例、LOG082的r3事件270/3s、来源800/250ms以及根终态后child_slot残留三项并发原失败及后续控制实验/处置也须保留并完整回读。051/056/057是已接纳的运行根/研究输入，研究故障矩阵不是实跑通过。LOG074的HMAC、LOG075的临时接收方与公开配置hash、LOG076的持久公共预算、LOG077的helper归属是明确Root决定，不再推断新的产品流程。

Root的独立固定输入E2E及全插件build/lint由派遣消息给出实际结果路径，未读不能当通过。 Root E2E r1取消回执误断言的真实exit1及修正说明保留；CancelTask是metadata-only，r2仍立即经公开GetTask严格核查取消Outcome，产品字节未改，不把该夹具失败混称产品缺陷。旧050已接纳的169文件/46来源输入和原046失败全部保留；旧证据只按当前摘要与影响闭包兼容逐项复用，不机械重跑无关平台/许可，也不把旧Go/TS通过当新候选通过。

## Workspace and Scope
只写自己的REPORT、原始日志和外部临时副本中的独立探针；产品源码/永久测试/规范/锁/其他报告/正式Evidence与Map只读。所有相关writer须已停止；发现漂移先通知Root，不能自行取新快照继续旧候选结论。用户未要求提交、推送、发布或归档。

完整范围按实际冻结清单检查，至少覆盖以下可达失败假设与实际消费者：

- 真实App factory→单BotHost/Source registry→HostWriteService→Vault.create/process，目标由可信UI捕获，prepare/check/invoke完整身份、lease、revision、内容与指纹一致；全部匹配编辑器叶子及deferred状态、重命名/替换/删除、异步间隙和同步CAS均不误写。批准仅一次，拒绝/取消不派发；写后回包丢失、磁盘回执丢失或新lease只走只读核查，不重放原效果。
- App共享真实在途quota和目标队列跨dispose/recreate持续约束；取消/逻辑deadline不能提前释放未结束的Vault promise。队列、事件listener、定时器、child和StdIO均有真实结束/Wait证据。严格每请求取消不杀兄弟连接；取消先/响应先、唯一迟到结果、TTL/容量/字节上界和未知关联均按严格HAP处理。
- 本机HMAC key与Vault回执分离，随机key仅App localStorage；received不能证明committed，只有匹配完整身份/指纹且有效签名completed可以。缺key/损坏key/篡改/cross-profile/device/epoch和写key失败不得虚假确认或覆盖旧key。无正文/CP/Provider secret落回执/key进HAP。051同步排除和058文档必须匹配真实实现；普通本机key不能被夸大为抵御OS/恶意插件控制。
- 旧schema5升级在迁移前产生独立完整DB+所有已登记CP的恢复集，包含已终结Run；完整编码artifact、大小/hash/清单最后发布、原DB锁与GC边界可核对。缺失/损坏/发布失败/无完整CP处理器均在迁移前安全失败；恢复副本不依赖live CP或硬链接。不要把当前迁移门当尚未实现T17清除/T19用户备份完整交付。
- 所有现有/随机临时/临时再委派走同一Executor与Engine，持久工作线程独立，不读B私聊/记忆，不创建伪持久Bot。临时配置与credential pin、Parent/Sponsor/currentrecipient及显式template映射从实际持久状态导出；自报hash不构成授权，grant撤销/过期/父来源收紧会在实际读取/发送/结果返回再次生效。公开配置hash的Go/TS完全相同且规范序列化有固定goldens。
- 原子受理、幂等tool intent、depth/total children/active children/wakes各自计数，accepted queued不占运行槽，真实producer结束后释放，waiting期间可继续子执行，恢复重新claim。取消子树屏障当前可达消费者不能绕过；不会因为等待CP或审批effect gate误封任务完成，也不能在父终态后继续新工作。queued/waiting/running子取消须原子留下无正文结构化Outcome并由普通父聚合/CP Resume/GetTask实际消费，同级成功不能掩盖取消或复活旧父；重复取消事件幂等、真实producer未结束不提前释放。succeeded+partial须作为持久事实逐层传播，不能仅按终态和正文是否为空推断；嵌套D取消/E成功→B partial→A partial须有实际证据。
- notify/question/reply的显式SourceRefs必须属于真实sender/admission范围，超范围不能静默忽略而接受正文；合法subset仍保留完整实际provenance，active/question及terminal用户/模型入口都检查。除tasks.reply外，agents.message kind=reply提前进入answerInTx的相邻入口及实际Tools/CP红绿也须核查；被拒绝时question/wait edge/receipt/message不变。wait-for图、终态Reply新私有Run与旧预算根、同Executor parent_results汇聚和可信来源投递；不能再次调用模型仅为伪造汇聚，不能隐式发布隐藏私聊/推理，任务查询/目录/提案权限与最小公开字段真实生效。
- 每次模型物理请求都经绑定AttemptPort，默认未配预算三项canonical零，3/32/4/8/8有效策略公开一致，新根受理同Tx固定并从Run.limits读回真实因果根策略；旧v5默认兼容策略是升级新事实而非伪造旧观测，重开不同Options不覆盖旧根。终态Reply的执行root限制与原budgetRoot账本各自保持归属。公共用户CAS配置可重开持久且不能被模型工具配置；同root/Profile/maintenance分别约束、最后额度竞争、Reserve后下调/暂停再Dispatch零新callback，原预留可幂等撤回；已发的unknown保守计费并等producer结束，不能取消或换root/重试绕账。
- 本轮修改触及原审批/来源/事件的真实影响闭包时，保留050已证明的100来源250ms normal/race、800 subjects批量、65000/65536正文同cursor有限重试和snapshot每消息source_json语义。不得抬原预算/删输入/少断言来消除新失败。

后续T08–10真实协议适配、T13群路由、T16完整用户恢复、记忆/清除/portable/模块UI/最终T27仍待后续票；明确OUT不当作本轮缺陷。现有已公开API的真实可达行为与安全/数据不变量不能用未来票搪塞。

## Acceptance
标准轴和规范轴分别pass / request-changes，所有finding带路径、触发、实际影响、严重性、依据及最小复现；无数量上限。先陈述可证伪假设再核查调用方、实现、测试、恢复，区分观察与推断。测试前协调独占重窗口，原始失败完整保留；不启动真实Provider/Obsidian/用户目标OS，不索取凭证，不接触真实keyring或默认D-Bus激活fixture。

最终复读候选文件和规范摘要、HEAD/index一致；每个自有进程Wait，探针停止，报告明示未运行现场验收。仅有作者全绿或语法/生成校验不足以替代独立代码审查。

## Return
REPORT首个h2前Session: 20261025T043239Z、Task: 059-notes-collaboration-review、Status: completed（或实际失败状态）；h2聚焦交接、产物与验证、问题与下一步。独立standards-output/specification-output锚点包含Reviewer/Axis/Result/Input-SHA256/Observed，摘要引用实际候选。运行return结构校验0后真实MESSAGE和FINAL；Root全读、核验后接纳。不得自行宣称T27整票或28票/55AC完成。
