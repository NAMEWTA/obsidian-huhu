# 099：记忆票在当前执行底座上的只读接缝准备

Session: 20261025T043239Z  
Task: 099-memory-preparation  
Status: completed

## 聚焦交接

**推荐以完成事实 outbox 接入同一 Executor 的独立维护 Run；保留现有预算/恢复权威，T14只拥有记忆数据与提交资格。** 当前还不能把 maintenance 账户分支当成已可运行的记忆作业：真正的可信 binder、独立受理、记忆当前代数检查和公共 Memory 用例均未实现。详见 [interfaces-and-owners.md](interfaces-and-owners.md)，每个C/D/W/E编号对应 [sources.md](sources.md) 的真实路径与完整读取 SHA。

本次于 Map23/Goal22 派遣为只读准备，T14/T15未激活；没有生产/测试/锁/schema/数据库写入、产品命令、模型或Host请求。094报告保持冻结，098独占检查窗未被占用。收尾期间Root接纳098并开启Map24/Goal23的T08 Intent/UTF8窄修；本报告不追逐该轮新代码或等待其验收。本报告和附件中的新接口/DDL都是实施建议，不是已装配类型或写授权。

### 055 与当前的准确差量

| 主题 | 已存在的真实接缝 / 仍缺内容 |
| --- | --- |
| 身份、lineage、namespace | C01/C03 的 ToolExecution/ExecutionLineage；C10/C12 的实际消息/History引用；C19/C20 的真实 inbox/子结果/回答；C26/C27 的实际私有贡献消费与Group tuple并集；C36持久lineage。已有message/task_result，不是memory revision、namespace表或自动记忆授权。 |
| 固定配置 | C13/C15已有独立task snapshot/pin，临时subject不等于Sponsor，终态真producer结束才释放。source聊天旧pin不能事后借用；推荐明确选“job实际受理时当前Bot配置”，再独立pin并固定，之后不换模型。 |
| 预算 | C04/C16–18已有真实逐HTTP reserve/dispatch/settle、maintenance账户分支、Profile总账、公开配置、晚结算/unknown恢复。**BindAttempts仍只推main/child/question**，调用者不能自改purpose/account借maintenance；T14必须补真实job关联后由T12绑定。 |
| 恢复/停止 | C28–31已有整树水位、affected IDs、用户CAS/generation、ready闭门、纯检查；C14持久实际continuation/resume/application位置；C35等待原Executor/Inspector/Probe/真实producer再释放Profile。014的job/forget/namespace事实尚不在水位中；ready不是HTTP额度许可。 |
| 模型消费者 | C32–34已有默认Chat与有限真实HTTP，C33核config/tool/程序位置。T14还要提供受信记忆输入/维护目的与候选格式，并纳入CP/Inspector；不另连SDK或用Probe提炼。其他协议不由此宣称已可用。 |
| 公共Memory | W01–03八个方法仍全部implemented=false；C07 Facade无MemoryAPI。旧形状缺完整来源/临时namespace/严格CAS/可回读proposal与job状态，不能让未来TS消费一个假接口。 |

055当时“尚无T12账本/可信派生”的观察已过时；其归属/修订/撤权、独立维护额度、forget双重防复活与全局用户确认合同仍适用（D06–08）。ADR024仍为权威，不能退回已被替代的仅人工固定范围（D01–05）。

### 最小执行与事务建议

完成聊天时只写去重completion/outbox，维护失败不撤销已完成聊天；之后用同一有界扫描器受理真实新Run、独立thread/configpin，不写原Session.active_run_id、不复活terminal、不冒充Delegation。群纯orchestration根没有模型owner，不为未点名A产生维护调用；真正B/C按各自合法结果处理。temporary只用其独立任务namespace，不触发Sponsor长期库。唯一比较的替代方案是额外worker直接调Engine，它会复制Claim/恢复/Stop权威，因此不推荐。

C10当前Group非空就取群ModelHistory，PrepareContext也会读Access的Host正文；**只换workThread不足以隔离维护输入**。T03须为受信maintenance分支只装入固定的真实选中消息/结果/摘录，保留来源作资格，不能顺带重扫群/私聊或附上全部来源全文。短期模型压缩归当前Run的summary/root费用，长期提炼才归maintenance额度；现有purpose可选值不等于当前已存在压缩阶段。

T14本域最小职责为namespace/settings、item/head＋immutable revision、completion/job、candidate、实际input/dependency、可删派生index、无正文suppression。Run/费用/配置/Effect仍只用原权威。建议每个memory revision有独立不可变ID，再用新Derived kind引用，避免当前Kind+ID去重及lineage主键丢掉同item两版本。

correct/forget同Tx核epoch/receipt/CAS，提交head/索引失效、source/job代、候选提交关闭、无正文水位和回执。旧callback查旧代；新job即使拿新代仍查祖先suppression，不能换job/item/hash重扫复活。保守抑制受影响旧来源闭包，独立来源继续；不能为匹配长期保留被忘全文。人工pin冲突只形成候选；用户明确private add才新意图。forget是逻辑失效，T17物理清除另行实施。

### 当前权限与公共接口缺口

记忆检查必须进入T05空Sources快返前，并由DB事实生成实际消费引用，继承Host来源/Grant和私有Group贡献；下一次真实Reserve/Dispatch、AppendEvent/Finalize、候选提交、页实际出帧和恢复click均重验。T14检查不能递归调用自身聚合T05入口；返回可信有界来源事实交原Grant/Group校验。旧800/250ms热路径保持，不用长模型stream占短delivery fence。

两个需要Root/T01/T05在实施窗口先冻结的具体补口：

- 原task-bound Grant目前只通过真实delegation/reply继承（C25），新的maintenance根不自动有资格。推荐不放宽：同Session/Profile合法scope可用，缺精确适用Grant或明确持久继承证明则blocked；不能改TaskID/假ParentScope。若要让仅原Task授权支持独立维护/跨Session召回，需要明确的用户memory授权与窄证明，不能由研究或模型替用户扩大范围。
- 八预留方法没有忘记后的显式重新添加、proposal/job重开回读入口。建议在correct中新增仅用户private add分支，并给list/get严格objectKind与有界preview/job安全状态；pin/correct/forget/settings/resolve严格CAS。global增改删始终proposal＋可信用户确认，未确认不可召回。T01可冻结最终表示，本研究不新增公有方法或自动写入口。

DTO具体推荐上限与原owner精确路径在附件§5–6：item≤64KiB、页≤50项/256KiB、recall≤20项/128KiB；来源/Grant/Derived/Group沿现32/64/128/100，外层仍守现HTTP/CP限制。014正文归T14，T01注册到当前真实schema9之后（C38），不因文件名014改旧SQL或跳版本。T15的015、T17清除遍历合同仅设计，不实施。

模型选择建议是沿所属Bot实际受理时的精确配置，不引入默认model/endpoint、免费额度或新Probe用途；维护和摘要仍由现Engine计费。实施者可沿原owner执行偏好，不由本研究评估真实模型质量或索取账户。

## 产物与验证

- [sources.json](sources.json) / [sources.md](sources.md)：54个已读来源快照、UTC时点、完整SHA；C/W读集逐项匹配Root的T08冻结输入 `5f30fe1c5e4d8a359dbafde9c7a651bef03fcd878fdf5b8e4b50ffdd8a8d12ae`（D09）。这是所读集合对照，不是独立复验整2032源或T08审查通过。
- [wire-memory-current.json](wire-memory-current.json)：从当前registry/schema直接抽出的八方法与params/results；mutation现expectedRevision非必需、SourceRef不完整等均可回读。
- [interfaces-and-owners.md](interfaces-and-owners.md)：上述真实接缝/缺口、两方案比较、事务与权限、DTO和T01/T02/T03/T05/T08/T11/T12/T16/T04精确未来请求。没有把请求当写授权。
- [failure-matrix.md](failure-matrix.md)：18组后续故障/公开消费者窗口，**全部未运行**。优先公开private CAS→同Executor真实SDK维护→forget callback/重扫→global确认后另一Bot真实输入四条垂直切片。
- [source-recheck.json](source-recheck.json)：54源收尾核SHA，C06 `api/recovery.go` 与C14 `sqlite/execution/recovery.go`在Root合法100/101窗口内变化，其余读取源相同；保留原读取SHA和新SHA，未扩读新内容。涉及新增Intent/资格字段的最终类型在T14实施前须由原owner重读冻结，不能把本报告说成当前全源无漂移审查。
- [manifest.json](manifest.json)最后仅核hash时另记录C32/C33的合法变更，共4个源偏离读取快照；没有扩读这些新版本或继续追踪改动。全部结论绑定sources.json的读取版本，最终shared API/Engine合同由原owner交回后再冻结。
- 只读命令为rg/sed/cat、Python标准库read/hash/JSON和结构回执；若干定位尝试使用不存在的`.../tickets`、`application/recovery`、`execution/config.go`等路径，随后按真实目录定位；没有运行失败的产品探针或把缺文件当空实现。部分大批输出被截断，关键T15正文/lineage/配置/恢复段已窄回读，不以截断输出声称全库阅读。

复用证据严格限定：E01/E02是094实际固定Go1.26.10/CGO0、默认SDK＋公开预算＋真实loopback/SQLite的HTTP0、最终bytes＋4096、末额度单请求、unknown整额计费；它不证明maintenance binder已存在。E03/E04是Root已接纳的091恢复/事务/Claim独立normal/race和既有实际恢复链，保留其原范围/输入；不能证明新memory代数或job恢复通过。本研究没有重跑这些检查，也不把任何旧fake Engine/Port通过冒认为新记忆消费者通过。

## 问题与下一步

没有用户凭证/现场验收请求。实现前由Root正式激活T14并派原owner窗口，先冻结maintenance受理/purpose、Task scope与Memory DTO；再按附件请求维护唯一API/执行器/恢复/授权，T14实现自身数据与真实消费者，T15随后闭合确认。现阶段只交准备，不宣布T14/T15、Ticket、Goal或产品矩阵通过。

真实Provider、模型质量/费用、Obsidian、目标OS、所有SQLite/SDK/HAP新故障矩阵和T17清除均未运行。结构return完成后所有自有文档停写，全部同步只读命令已返回，无后台或待Wait产品进程。最终来源复核、manifest、实际return结果另存本目录回执。
