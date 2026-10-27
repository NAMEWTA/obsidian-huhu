# 短期上下文与压缩消费者合同准备

Session: 20261025T043239Z
Task: 123-short-term-context-contract
Status: completed

## 聚焦交接

已完成[123 TASK](TASK.md)的只读补齐，形成唯一[short-term-contract.md](short-term-contract.md)候选：**同一准备流程中的有界近期整文选择＋可验证原文摘录式工作摘要，不增加模型调用**。这不是已实现压缩，也不以当前20条历史limit代替T14义务。长期记忆继续复用115，未重做099泛研究、未改115或其他历史文件。

原T03实际链路已追到ModelHistory/群none-range、Claim真实inbox/DelegationInput、PrepareContext、MarkRunning、common模型排序、CP及纯恢复。当前只有有界选择，没有独立压缩或可供“本轮上下文”读取的已冻结manifest；附件§1分清现状、缺口与推荐。T14仍未激活，本任务完成仅是候选可派单程度。

只读入口沿workspace/catalog与dev/I准备规则复用，产品权威为Spec §5/AC-018、ADR-024和DESIGN BOT-MEMORY；无Go、产品Node、DB、SDK/Host、网络、依赖操作、源码写或再委派。123期间Root通知121双轴接纳、T10/G2代码门成立；此为Root正式基线事实，本作者未将只读准备扩大为T14实施或产品验收。

## 产物与验证

[合同](short-term-contract.md)共228行，当前SHA256 `68333f6840ff76a67b5c8fc5ccee67fb2da95d7622e6e9f3fe968fbff07e9d7b`。只写本目录合同、来源、报告、manifest/结构回执；未写产品、锁、schema、数据库或正式状态。

| 具体交接 | 唯一候选与消费者 |
|---|---|
| §2–3 选择与压缩 | 3×20有界候选，先当前授权；近期8条整文、旧消息最多32条可验证UTF8首尾摘录，明确遗漏。完整accepted Intent、Persona、委派要求、原显式Source、当前inbox保持；A两线程/B/temporary/group范围按真实namespace，不用Sponsor替私有主体。 |
| 原来源与表示 | Derived.Hash始终完整原对象hash，TextHash/spans独立；摘录不伪装原消息、不截provenance、不生成长期事实。相同key矛盾报错，不first-wins；已有消费闭包不因本轮选择变少而缩减。 |
| §4 同一UoW | 具体化115唯一Prepare为同Store只读Plan短Tx→事务外原Host身份授权→Seal/manifest/依赖/唯一MarkRunning同Tx；无第二Executor或摘要机制。Memory在同规划中精确去重，独立Memory绑定算法保持。 |
| §5 CP/恢复 | 014同一run initial manifest增加无重复body的refs/spans/metadata及entry索引；实际仍schema9之后连续版本10（实施时重核）。新受理policy标记区分需要manifest的新Run与nil legacy；从DB读原Intent/config/manifest，三个CP旧DTO/身份/字节不改。已发无CP不自动重放。 |
| §6 DESIGN真实读取 | 同Memory API窄增只读Kind=context；get ID=实际RunID，list只列真实manifest摘要，get按entry+UTF8片段分页。pending/sealed/redacted/legacy_untracked分明，temporary走任务实际namespace，orchestration无A模型上下文。上下文entry物理fence，不能用sessions.history拼假实际输入。 |
| §7 原owner请求 | T01唯一纯DTO/严格wire/生成；T03/T16输入UoW/受理标记/恢复水位；T14本域planner/manifest/投影/014；原T05/T11–13资格/消费与T04投递；T08共同层渲染/Inspector；T24只消费真实页。精确路径与顺序均写明，未授写权。 |

[40项来源指纹](sources.json)tree `065d99fe176de1bde51c5b12ac52fa5d1719fbb3b3157874c3ce1be26d7e7ab8`；[索引](sources.md)标实际读取range/search，未把哈希核对冒称全文件审查。[00](logs/00-115-source-recheck.json)另对115的55文本来源逐字节核验，只有Core119第三driver已知差量，115接口合同SHA严格保持 `406bdd596fd3bd93702c487ab7e996b8be78d9702be584cc3b3e46f9d3acdfc4`。没有执行原型app.js或重跑旧产品验证。

本次实际验证仅：文本读取、来源SHA/末次无漂移回读、交接内部链接检查，以及亲自[return结构校验](logs/01-return-result.json)。它们不证明任何新产品行为。§8的C1–C7隔离/真实模型输入、UTF8压缩、当前失效、Memory组合、事务/Stop、CP/legacy和UI物理页消费者**全部not-run**；无任何模型、数据库、网络或并发通过声明。最终来源/链接结果见[02](logs/02-final-source-readback.json)，所有交接工件SHA见[manifest.json](manifest.json)。

## 问题与下一步

现存ModelHistory/完整inbox等是已接纳旧行为，本准备指出尚缺T14消费者，不把未装配功能冒称已发现产品漏洞。首版选择确定性摘录而非生成式摘要，所以没有summary HTTP、maintenance额度或新账本责任；若未来另选模型压缩，必须新建真实同Run summary阶段/原root账户/独立HTTP Attempt与恢复合同，不能借115维护账户。本附件不为该未来路线作空承诺。

T14实施时由Root先接纳本候选并按T10最终源开精确owner窗口；T01公共DTO/严格wire和Plan/Seal最小合同先行，再交memory owner及原T05/T12/T08共同消费者。T24的本轮上下文须读实际manifest/安全投影，不能把当前历史页或摘要字面误当长期事实。ctx展示分页与模型选择分别有界；授权变化后旧正文物理阻断和合法用户原文保留须由真实红绿证明。

无用户默认/预算/权限决定需要重复询问。候选界限、类型、错误/旧CP分支均已具体化；生产接口、014和全部消费者尚未实现/执行。实际结构return后原生MESSAGE+FINAL并停止本目录写入；T14/全Goal正式状态、后续代码门与用户现场后验仍归Root/用户。无提交、推送、发布或归档。
