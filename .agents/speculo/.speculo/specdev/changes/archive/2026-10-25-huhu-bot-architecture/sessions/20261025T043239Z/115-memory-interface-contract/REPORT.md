# 记忆实施前共享接口合同候选

Session: 20261025T043239Z
Task: 115-memory-interface-contract
Status: completed

## 聚焦交接

只读准备已完成，交付一份[单一接口合同候选 v1](interface-contract.md)。所有新增类型/签名/DDL/测试都是 proposed / not-run，T14/T15/T17均未实现、未激活；不把本研究完成当作票或Goal完成。原T01/T03/T06/T16 owner未被转交，也未再委派。后续先T10，再由Root采纳并给实际owner维护窗。

沿[冻结TASK](TASK.md)完整读099 REPORT、interfaces-and-owners、failure-matrix，再只读当前实际差量；不是重复055/099泛研究。复用dev架构/测试与I只读准备规则，不触发产品实现。读集实际路径/SHA/覆盖见[sources.json](sources.json)及[索引](sources.md)，共55项；没有把截取章节或reused来源说成全库通读。少量旧猜测路径不存在后已按实际目录纠正，未当产品空实现或运行失败。

三个先冻结的核心结论：

- **默认开启与可运行资格分离。** 批准原型UI-001/final/app.js的autoEnabled默认true；Spec §5要求未配/耗尽维护额度或暂停时零提炼HTTP，现usage.New也将空维护额度转0。settings返回enabled/eligible/reason；099默认off只是建议，本候选不采纳，不需新用户审批或免费额度。
- **完成outbox→同Executor独立维护Run。** source终态不借旧pin，受理时固定所属Bot当前配置、真实新pin/thread/root；不写Session.active_run_id、不假Delegation、不为群A空根计模型、不把temporary当Sponsor。现013 admission_kind CHECK无需为此重建，唯一memory_jobs.run_id作为可信purpose依据。Profile内部最多一个可运行维护作业，原16池/用户交互与既有3/32/4/8/8语义保持。
- **可信账户族和当前依赖。** T12 binder必须从真实job/claim/config判maintenance账户族；summary/retry仅子用途，不能把q.Purpose再交给当前root/maintenance分支选银行。这是尚未装配maintenance时的未来接缝要求，不是现产品漏洞。T05在空Sources快返前核实际memory依赖，当前Grant/Group/范围仍唯一；独立维护没有真实delegation映射，原task-bound Grant不能暗继承。

## 产物与验证

接口附件给出：

1. T01唯一Go/HAP/TS DTO、六个MemoryAPI和T15两个GlobalMemoryAPI；严格Kind/分支/CAS/UTF8字节与完整页预算，item不可变revisionID、forgotten安全stub、settings、job与pin冲突candidate可回读。add是用户独立意图；correct/apply_candidate/pin/forget不让模型自证owner/来源/批准。八方法当前false事实另存现状快照（历史日志已清理：`logs/00-current-memory-methods.json`）。
2. 原T03 adapter-only MemoryHooks及完整参数/返回，RecordCompletion、bounded admission、NewMaintenanceInTx、PrepareAndMarkRunning、实际输出关联、同Finalize Commit；T02独立PinTask与usage/凭证屏障、未知SQL整体回滚和commit后cursor发布。
3. 纯ExecutionMemoryInput/候选格式、可信摘要与原Intent：common无工具提炼经原Attempts输出候选到同Finalize，模型不选bank。推荐在已有Messages内加入独立固定绑定块，由DB受信参数在Inspector/Resume核完整字节，不改EngineVersion或旧Chat v1/Responses v2 DTO编码。Memory=nil旧路径保持字节；带引用却缺manifest不能降legacy；无完整CP的在途维护崩溃仍blocked，不自动重播收费HTTP。
4. T14本域Facts→T05原Grant/Group校验的非递归边界、memory_revision/candidate物理subjects、复用现250ms短fence和stdio writer生命周期；原用户文字与已公开历史按实际message依赖，避免整Run一刀切。原800subjects热路径要求批读取/真实回归，未运行性能测试。
5. T16两短Tx水位/点击CAS/generation、同Run/job/account/CP/Decision和Core Stop/Done；014最小表/不可变修订/唯一键/无正文suppression。correct保护人工head并阻旧origin换新ID，forget同时挡迟到callback及新job重扫，不存被忘全文匹配。T17只接遍历与逻辑失效，未声称物理清除。
6. 原owner精确写集/串并行阶段及五条最小红→绿消费者。T04由043 TASK明确归credential_provider，stdio归foundation_go；T14新owner待Root分配。已按真实目录纠正generate.mjs、groups/publication.go、events/service.go内Repository等路径。三协议driver预计无需新改动；实际T10交回后再复核。

**只读检查范围：**本任务仅cat/sed/rg、Python标准库读/hash/JSON及自己的交接结构校验；没有Go、Node产品检查、数据库操作、网络/依赖下载、SDK/Host/Provider调用或真实Vault操作。所有候选消费者均not-run，无产品红绿、性能或编译通过声明。唯一Node调用是TASK明确要求的本任务validate-dispatch return，不属于产品检查；实际结果另存本目录日志。

读集捕获时点的SHA为`49385af11e952888ac109dfa3462265acd3523b1b11d55dced3031fe46adac1a`，只代表所列55个来源。TASK所述112冻结输入78900740…是Root声明，本作者未独立核整2048/32。期间Root关闭T09、Map28/Goal27转Map29/Goal28并开启T10，118给protocol.go加3个Anthropic literal、registry.go加精确tuple；两文件pre118基线与post118实际SHA均留sources，StateView/Generation/CP签名未变。不是本作者漂移，也不把本读集称最终产品冻结。

## 问题与下一步

本准备范围没有未完成调查或必需产品验证。产品权威已定，不请求用户决定；页界限、一次一个维护根、虚拟默认元数据、CP绑定块及表形状是待Root采纳的实现选择。T10真实交回后，先统一API/UoW/可信bank/Memory facts/恢复水位，再激活T14、派原owner写精确路径；T15和T17随后独立，不能由研究附带开工。

最终来源回读/相对链接/产物SHA及亲自return0保存于本目录。全部只读命令已实际返回，没有待Wait进程；原始历史报告、产品/测试/锁/schema/正式Evidence/Map/Goal/永久知识均未写入。完成原生MESSAGE+FINAL后本作者停止写入，留槽给Root后续119。真实Provider/Obsidian/目标OS仍user-owned/not-run，无凭证请求、提交、推送、发布或归档。
