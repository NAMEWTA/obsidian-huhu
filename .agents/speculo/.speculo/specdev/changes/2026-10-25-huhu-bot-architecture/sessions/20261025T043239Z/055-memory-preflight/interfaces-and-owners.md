# 055 附件：最小纯合同与原 owner 请求

性质：实施建议；不是现存类型、DDL、已开工写集或审批要求。权限继续来自 Root 正式派遣。证据定位见 observations.json；来源基线 T14/T15 完整回读、Spec §5 与清除合同。Go 路径前缀为 `native/huhubot/internal/`，TS 前缀为 `src/modules/huhubot/`。

## 先冻结 T11/T12 的最小共享语义

| 形状（名称可改） | 最少需要的事实 | 当前与未来边界 |
| --- | --- | --- |
| Execution binding | Profile/commandEpoch、可信 principal、agent 或 temporary execution、Session/workThread、Run/root/parent、claim/cancel/recovery 代数、配置pin、固定recipient | 复用041/047合同；不能从工具参数声明身份。此表不要求全部字段重复上wire。 |
| Input reference | 类型、稳定对象ID、已验证不可变 revision 或 content hash；归属namespace；引用可定位其派生来源 | T11只持久真实选入的消息/任务结果。当前消息无独立revision，使用实际稳定ID/内容指纹，不凭空伪造版本。memory revision类型由T14加入。 |
| Derived context provenance | 当前输出ID→实际选入的有界 Input references；继承 Host SourceSnapshot/SourceScope/GrantIDs；scope/recipient来自应用绑定 | 不是模型自报的sourceRefs。重复复制保留祖先关系；不可归因时保守并集。适合存于协作/消息既有权威记录或来源边，具体SQL形状由原owner决定，不预造memory表。 |
| Model purpose/account | 主/子/问答/摘要/重试/维护的可信用途，关联持久预算账户；attempt lifecycle沿047 | 维护独立额度＋Profile总账已是Spec要求。账户未配/耗尽/暂停无真实请求。此时不造设置UI、新默认额度、Provider请求字段。 |
| Current-input check | 在准备、实际发送、派生结果提交/投递处，按当前持久来源/权限/代数核查同一绑定 | 047的run-bound capability可携带受限校验能力；无需另造公开模型API。T14将自己的memory/source-generation谓词接入，不能把现有Host-only检查当已支持记忆。 |

不能只保存“source hash数组”而无对象/namespace可达关系；不能只把memory正文拷进一个允许发送的user message后丢失祖先。也不要求现在建立通用任意图服务：T11的来源接缝首先服务其已有消息/子结果消费者；有界、只由应用产生、可按当前权限回读即可。

## 留 T14/T15 的逻辑记录与生命周期

下表是最小职责，不是要求每行独立新表；复用既有 Run、command receipt、attempt ledger 和Blob权威，禁止复制一套事实。

| 归属 | 持久事实 | 必要约束 |
| --- | --- | --- |
| T14 namespace/config | Profile内持久Bot/临时任务区分；owner、可见scope、auto-maintenance开关及明确预算账户引用、相关generation | 从执行身份绑定；temporary不会变成sponsor长期库；额度数据由T12账本权威管理，不双存余额。 |
| T14 memory item/revision | stable ID、revision、namespace、正文、observation/inference/user、creator、pinned、有效状态、来源引用 | expectedRevision CAS；自动不能静默覆盖人工固定；旧revision/失效项不召回。 |
| T14 lineage/watermark | 原始/派生对象的种类、ID、revision/hash、代数、处理/失效水位；必要无正文墓碑 | 既挡旧job回调也挡旧来源重扫；不能靠语义正文永久墓碑；Profile epoch更新与执行排空后可清理过期依据。 |
| T14 maintenance job | job/触发身份、owner/namespace、源Run/来源版本集合、固定pin与recipient、purpose/account、claim/状态/代数、候选结果引用/原因 | 源意图唯一，Run/attempt关联复用；在途取消不抹费用；成功/取消/阻塞/待人工恢复可区分；真实终结才释放资源。 |
| T14 派生索引 | item/revision及有效水位、可删除索引数据 | 非授权事实库；查询回表校验。forget/correct提交后旧索引即使尚待物理清理也不可返回正文；T17另负责清除。 |
| T15 proposal/decision | 固定operation/text/scope/source versions/targetRevision、previewHash、状态/revision/到期、可信用户decision及回执 | proposal不参与recall；同Tx改item/revision/receipt；回执与条目不分开提交。不能让提案ID、时间戳或模型说“批准”取代用户身份与版本。 |

建议 job 流程：受控完成输入 → 持久去重受理并pin → claim → 重新授权/额度 → 同Engine逐请求 → 有界候选 → 提交时CAS来源/条目/代数 → 原子修订与job终态。具体状态名不新增产品约定。

工作摘要和自动提炼是不同用途：前者服务当前短期上下文，后者写长期候选；前者不能自动晋升。两者都经同一预算/模型Port并继承实际输入lineage。模型返回schema只描述候选，不授予写权限。

完成记录驱动受理应可补偿漏通知。job受理采用当时所属Bot固定配置，或承接原交互的独立配置引用，两者必须明确选定并能回读；Spec没有指定两者之一。严禁聊天Finalize释放后继续借旧pin、或维护运行期间每次读最新模型。原会话成功不等待模型提炼，不能在Finalize事务中执行模型/网络。

## 准确原 owner 与最早消费者

| 原 owner / 最早消费者 | 精确维护请求 | 最小范围与时点 |
| --- | --- | --- |
| T01 Go / foundation_go；T11/T12先 | `application/api/{conversation,access,tooling}.go`，必要本域纯API新增文件 | 可信执行/派生来源引用、047 model capability；T14才补memory业务DTO。Application不出现sql.Tx/SDK类型。 |
| T03 / foundation_go；T11先、T14后 | `application/execution/executor/{executor,ports}.go`；`adapters/outbound/sqlite/execution/{store,executor}.go`；`application/conversation/direct/{service,ports}.go`；`adapters/outbound/sqlite/conversation/store.go` | selected-message/子结果provenance与workThread隔离；维护完成触发、独立执行归属/最终提交接缝按T14消费者维护。保持唯一Run/事件权威；不重写历史003迁移。 |
| **T02配置/pin / foundation_go**；T14 | `application/assistant/{ports,service}.go`；`adapters/outbound/sqlite/assistant/store.go` | job固定配置真实引用、删除预检/usage与释放依赖；现有PinInTx/ReadPinInTx/ReleaseInTx优先复用。不是credential_provider配置owner。 |
| T05 / credential_provider；T11/T12先 | `application/access/context/service.go`；`adapters/outbound/sqlite/grants/{access,delivery,store}.go`；`domain/access/grants/policy.go`仅实际规则需要时 | 以既有操作校验read/send/summarize/memory；来源派生与当前recipient，T14再接memory代数。共享api/access.go仍T01。250ms读投递fence不能套整个长模型stream。 |
| T11正式owner；现在 | 规划 `application/collaboration/{delegate,discover,proposecreate}/**`、`adapters/outbound/sqlite/collaboration/**`、`migrations/011-delegation.sql` | 仅真实消息/任务的输入输出身份和lineage；无需提前创建memory item/job。具体协作工具目录沿原票与041，不由研究另授写权。 |
| T12正式owner；现在 | 规划 `application/execution/usage/**`、`application/collaboration/{messages,scheduler,finalize}/**`、`adapters/outbound/sqlite/{usage,messages}/**`、`migrations/012-budget-message.sql` | 独立维护purpose/account可绑定；逐attempt准入/结算/取消与费用质量。4/8是并发子执行限制，不擅自改成维护请求统一默认值。 |
| T14正式owner；未来 | `domain/memory/private/**`、`application/memory/{context,private,maintenance}/**`、`adapters/outbound/sqlite/memory/**`、`migrations/014-memory.sql`、`native/huhubot/tests/contract/private-memory/**` | 本域item/revision/job/lineage失效、自动额度配置引用、归属召回与候选提交；无新Provider/embedding依赖。 |
| T15正式owner；未来 | `domain/memory/global/**`、`application/memory/global/**`、`adapters/outbound/sqlite/globalmemory/**`、`migrations/015-global-memory.sql`、`native/huhubot/tests/contract/global-memory/**` | 固定预览/可信确认/一次事务/当前授权召回；不复制T06 Host note effect账本或套Host写审批。 |
| T01 schema/Go + TS foundation_client；T14/T15消费时 | 仓库 `contracts/hap/v0.1/{schema,methods}.json`、受影响fixtures与`generate.mjs`；Go `protocol/hap/{types,schema,methods_generated}.go`与`schema_generated.json`；TS `api.ts`、`core/protocol/{codec,method-validation}.ts`及对应测试 | 补齐真正消费的Memory DTO、CAS必需项、scope/来源/额度状态、可回读proposal预览；只按实际装配切implemented。不要先把全部预留方法声明可用。 |
| T01 inbound与T20组合owner；T14/T15装配窗口 | `adapters/inbound/hap/router.go`、所需本域adapter；`bootstrap/core.go` | 现有Facade/真实用例接线，可信用户确认与内部自动写区分。新文件先进入正式准确写集，不用“在已有目录”绕过owner。 |
| T01 migration owner / foundation_go；T14/T15 | `adapters/outbound/sqlite/migrations/embed.go` | 注册014/015串行；各票只写自己的SQL，不改002/003/005等历史正文；文件票号不是数据库user_version。 |
| T08公共Engine/协议owner；T14消费者 | 规划 `adapters/outbound/eino/common/**` 与实际工具装配处 | 将上下文/摘要/提炼作为同Engine受限用途；schema/prompt/实际模型输入受控验证。没有记忆业务默认直连HTTP。 |
| T16/T17/T20正式owner；后续 | 原票恢复、清除、组合根准确写集；本次不扩写 | T14任务纳入恢复/停止；T17按来源闭包删除正文与索引、拒绝旧epoch；最低安全账本无正文/可恢复CP。 |

T14/T15当前票不含独立通用memory工具目录；如实际消费需要，Root先在原owner正式维护窗口补准确路径。不因研究提出形状就自动新增API方法、表、依赖、状态或许可。

## 关键来源行段

| 来源 | 本报告所用行段 |
| --- | --- |
| spec.md | 69–89身份/委派；93–101树预算/恢复；103–118四类记忆/自动维护/forget/global；122–124来源逐跳；164–168 API/epoch；180–186清除与Vault边界。 |
| ARCHITECTURE.md | 164–172隔离/记忆；236–247纯Engine/模型治理；345–365清除；492–501参考取舍。 |
| ADR.md | 206–222旧012已被替代；317–369来源/恢复/清除；429–447当前024。 |
| T14 / T15 | 全文，重点44–60范围与顺序、共享路径归属。 |
| T17 | 36–70、83–89，仅来源传播/正文清除交集。 |
| 当前代码 | api/access.go:128–161；api/conversation.go:1–60/90–135；executor/executor.go:115–190；sqlite/execution/executor.go:160–250；sqlite/conversation/store.go:285–350；sqlite/assistant/store.go:481–545；context/service.go:44/171–250；grants/access.go:25–104。 |
| wire与TS | api.ts:66–98/250–278/338–348/538–558；全部memory schema/registry切片见wire-memory-slice.json。 |
| 固定参考 | IMPLEMENTATION-REFERENCES与reference-audit.json的REF03/04/05；learning/02:111–131。复用原固定SHA/许可/活动与原始源码链接，055未重联网。 |
| 先前研究 | 041:71–88委派来源/等待；045:55–69成员隔离、75–89恢复分类；047:17–42模型Port/费用/并发语义、136–156owner。采用045/047对041配置owner误标的更正。 |
