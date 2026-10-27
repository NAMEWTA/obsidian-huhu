# 群聊完整候选2独立双轴复审

Session: 20261025T043239Z  
Task: 079-groups-r2-review  
Status: completed  
Reviewer: native:/root/foundation_review（未参与实现，未再次委派）  
Input-SHA256: 72a351ff35de4f24dfc5f459e92fb288c4d52207eadde7243591f14cad8571a7

## 聚焦交接

**标准轴 pass；规范轴 pass。STD-077-01 / SPEC-077-01 关闭，未发现新的需修改 finding。** 两轴结论面向当前完整303文件/91来源候选，未影响路径按逐SHA与实际调用闭包复用077的独立观察；不是仅认可作者的新测试。

唯一输入为 [T-13 review-input-groups-r2](../../../evidence/T-13.md#review-input-groups-r2)，HEAD/base `33c21e098ef3188cbab5a09f3e0a01fadb787715`、Map19/Goal18。相对077旧299文件，仅 `native/huhubot/internal/adapters/outbound/sqlite/collaboration/store.go` 改动，另新增四个groups测试；298旧文件及87旧来源不变。当前生产store SHA `796d3790ef825f42a670e07120534cbe1f2e53c88f086fd76e10eb038b674ac0`。新增四来源均为本次修复/补验材料，不重新定义产品合同。

已完整回读TASK、077失败双轴报告、078最终报告/精确差异/四项永久测试、Root真实交接和补验原始输出；复用已读未变的AGENTS发现、dev、I最终审查及risk/error/test-reliability规则。077报告SHA `79025664b38e2ff00a3360e775c64f0e74f74ceb4b14f2c67e85388ec22bb5ec`，078报告SHA `bc1d95b2c24ee23d0d1ae2f14b0e2e39231a906818c331d05af77599179f1f89`，均实际核验。既有gpt-6-astra/high派遣偏好不是运行时模型attestation。

<a id="standards-output"></a>
## 标准轴原始结果

Reviewer: native:/root/foundation_review  
Axis: standards  
Result: pass  
Input-SHA256: 72a351ff35de4f24dfc5f459e92fb288c4d52207eadde7243591f14cad8571a7  
Observed: 原STD-077-01已用真实相同字节边界、实际成员移除与生产Attempt.Dispatch闭环关闭；重复页/跨页、当前资格、整事务回滚与完整候选复用闭包未发现新缺陷。

### 原P2关闭依据

`store.go:432`的原读取入口仍默认消费；新增私有helper只将消费块设为可延后。`ListTasks`在同一个WithinTx先通过原Task/Root/Principal/Profile、origin read、接收方read/send/deliver及结果解码，再按原524288-byte预算选页；`store.go:600`只对实际返回的非空正文重走原完整消费。当前claim/Group/source/scope/grants/derived验证仍在消费路径执行，完整tuple并集和revision更新没有减弱。GetTask与metadata-only行为保留，用户Facade查询不改变模型proof。两次读取在同一事务快照；没有把来源缓存当当前授权，也没有catch并忽略SQL/Commit错误。

独立探针 [源码](probes/reviewer_replay_test.go.txt) 在精确外部副本经公开群、原绑定 `i.Tools.Invoke`、生产Executor/SQLite执行。仍为四份合法131072-byte结果，limit100，原页预算；用户GetTask等待四份结果时SQL确认B只有自身proof。遗漏者从 **admitted减实际returned** 获取，修后仍真的调用成员更新移除，不依赖旧phantom是否存在。

| 独立控制 | 真实持久状态及效果 |
| --- | --- |
| 第一页，再重读第一页，移除未返回成员 | 三份正文；B+三个完整tuple、三个task_result派生，revision 3→6→6；实际移除后B仍running，使用Background context的实际Dispatch回调1。 |
| 第一页，再重读第一页，移除已返回成员 | 相同页与资格；真正贡献者仍构成依赖，实际Dispatch回调0。 |
| 第一页、重读、下一页、再重读旧第一页，移除原遗漏成员 | 两页五个Delegation元数据/四份正文无漏重；第二页才新增第四贡献，revision 3→6→6→7→7；旧页DTO相同，不丢失新资格；实际Dispatch回调0。 |

每阶段直接读SQL完整成员三元组、派生计数和revision，所有控制都真实终结并断言slots/pins=0。[初版race原始输出](logs/page-replay-race.log) exit0，包6.708s；[最终探针normal](logs/page-replay-final-normal.log) exit0，包0.436s。初版race后仅外部探针把向pages channel发送改为可响应context取消，以确保早期Fatal清理；当前normal与下述负向控制使用该最终版本，没有把后写清理冒称已被初版race覆盖。

为证伪测试只会绿，使用Go overlay只替换成077精确旧store，其余当前输入与最终探针不变：[负向原始输出](logs/old-store-negative.log) exit1，包0.120s，stage0直接指出phantom第五成员。它在真正remove之前由原资格断言终止，**不将此负向运行声称为执行了remove**；当前候选三控制与078/Root四控制均实际执行了remove。该早期失败还实际完成清理/Wait，没有阻塞Core.Close。最初overlay命令误在repo根执行、未进入Go module的exit1另存 [cwd错误](logs/negative-command-cwd-error.log)，不是产品失败。

### 相邻风险及完整候选判断

选页阶段仍检查未装入候选的当前权限/解码，错误不能被分页吞掉；消费阶段任一后项失败仍整体回滚。独立核读078的首项控制字符编码过大、后项坏derived、真实remove后当前Group拒绝，以及第二次union SQLite ABORT测试及真实输出：分别保留TASK_PAGE_TOO_LARGE、LINEAGE_STATE_INVALID、GROUP_MEMBER_REMOVED和原SQL错误，调用前后完整Group/source/scope/grants/derived/revision一致。Root在当前2070输入实际重跑077独立SQL故障探针，第一项已执行union也回滚。未宣称穷举所有Commit故障。

原旧ToolExecution连续读取C+D、再派生temporary的六控制由Root当前race再次执行，实际B/后代完整tuple、正常Dispatch1/撤销任一贡献者Dispatch0、公开正文0和slot/pin0均保留。GetTask默认消费、只读Facade无消费、空正文与metadata-only路径静态闭包保持；第二遍消费没有提高页/正文/事件/并发预算。原计数limit3控制由078及Root当前四控制覆盖，随机无正文B元数据位置会令返回私有正文为2或3份，按实际返回计算依赖而非硬编码数量。

完整候选的其余标准轴观察复用 [077完整报告](../077-groups-review/REPORT.md#标准轴原始结果)及其精确证据，逐项判断影响：

- 群受理默认A/显式B,C、全目标原子性、可信user_batch、纯编排root无模型/费用/假资格、配置pin与共同Executor深度3/总32/根4/Profile8/wakes8，均不依赖新分页顺序；原受理/配置/调度证据仍有效。
- 成员代/rejoin、AgentMessage私有贡献、CP/真实用户问答恢复、当前DB末门、temporary祖先和物理writer fence不变；受本次影响的私有结果消费由上述新探针与当前SQL/union控制补证。撤销与结果发布未被放宽，Engine之后实际父结果聚合仍按所有将交付结果当前授权。
- 公共transcript独立seq/去重/none与明确历史、Source撤权、私聊隔离、标签与模型正文分离、stdio完整附件并集及部分frame关闭，以及TS稳定ID/UTF16、busy草稿、BigInt有界缓存、更高revision严格proof扩充和Session缓存重锚不变；新分页只使消费者资格更准确，不改变这些DTO或事件合同。
- body-free Effects.Get/Reconcile仍限定真实owner/Profile/Run，Host lease/workspace/fingerprint、CAS/幂等、仅QueryReceipt不重Invoke，Approval正文门未松开；013迁移完整DB+5CP备份、专用连接FK切换/同Tx检查/回滚/恢复与startup窄reason原样不变。Root原真实旧v7/CP与效果Profile重开、生产TS→HAP→Go→Host合成Vault证据可按闭包复用。
- T01/T02/T03/T04/T05/T06/T07/T11/T12已审共享身份/令牌/lease、stdio/EOF、凭证隔离取消、来源Grant、白名单、queued撤权、raw与材料化Task、CP/槽位和错误分类没有本轮新增调用差异。原072及更早有效观察沿077明确复用链承接；不以旧通过代替本次新增分页行为证据。

<a id="specification-output"></a>
## 规范轴原始结果

Reviewer: native:/root/foundation_review  
Axis: specification  
Result: pass  
Input-SHA256: 72a351ff35de4f24dfc5f459e92fb288c4d52207eadde7243591f14cad8571a7  
Observed: SPEC-077-01关闭；实际返回的私有正文才增加消费者资格，下一页消费与真实撤销一致，当前完整候选未发现新增规范差距。

[private-provenance-supplement](../../../evidence/T-13-logs/private-provenance-supplement.md)要求每份实际私有贡献并入实际模型Run，完整tuple和同Tx revision不得缺失；未向模型返回的页候选不是消费。当前三类真实移除控制分别证明“不读不依赖”“已读必须依赖”“下一页读到才依赖”，重复读与回读旧页不伪增或倒退。STD与SPEC是同一原P2的两个判定，不计成两个新缺陷。077原request-changes及红日志保持历史事实。

T13无@/明确@、全目标一事务、一根用户意图、独立公开历史/私有边界/协调者CAS，map18-window、stdio-delivery、managed-startup、private-provenance及Map19 effect-owner-reconciliation的已锁定合同，与上述当前代码/消费者和077可复用观察仍相容。修复没有新wire字段、扩权限或提高预算；共享API仍71方法/142验证器/266样本，wire0.1/schemaVersion1与SQLite8区别保持。合同比较与旧SQL逐SHA证据沿077复用，没有重新生成后冒称新验证。

真实Provider/模型、Obsidian、用户Vault及目标OS/keyring均未运行，按用户约定后验；无索凭证、旧默认D-Bus或真实模型请求。受控Engine/合成数据只能证明代码行为。当前通过不等于T16、T27、未来T08–10等范围或全28票完成；原六处docs锚点和全局计划校验诊断保留，不称全局绿色。

## 产物与验证

独占窗口内自有测试串行，Go1.26.10 linux/amd64、CGO_ENABLED=1，外部cwd `/tmp/huhu-groups-r2-review/repo/native/huhubot`。所有命令/退出/工具Wait标识及版本区别见 [independent-runs.json](logs/independent-runs.json)，所有原始输出与两版探针已保存。只写079与隔离/tmp，未写产品、永久测试、正式状态或他人报告。

[reuse-readback.json](logs/reuse-readback.json)亲自逐SHA核对078最终352支持文件、Root当前2070输入、插件1873输入及main.js/styles.css两产物、241个原始外部副本及工作区对应文件，errors均为空。078最终完整tree为 `674dc115fcc0ba1a3debed82e73768a39d7a74a90b53c33af8ce8f14bb95c665`。078三包normal/race及全Go vet是作者实跑，后续仅测试失败清理改变，作者另跑最终四控制normal/race；分别承接，未称旧矩阵含后写cleanup。本review未机械重跑这组矩阵。

Root [当前补验](../../../evidence/T-13-logs/lead-groups-e2e-candidate2.json)四公开分页控制normal0、合并四控制/六union/SQL rollback的race0及Wait事实已回读。Root旧全E2E和插件build/lint的复用由实际原执行者、逐输入SHA及不调用新模型字节分页的闭包支撑，不冒称本轮新跑完整TS或真实平台。078原红、误插Directory导致编译失败、清理准备匹配错误，Root旧夹具busy kind/缺description、073旧single/batch reason真实红均在原位置保存并按原性质区分，没有择绿覆盖失败。

## 问题与下一步

当前无待修复finding；Root可按本报告接纳本固定候选，正式状态由Root维护。末次完整303/91、HEAD/index/mode核验和进程清理记录在本目录logs；全部自有Go/probe已真实退出并Wait，正常和负向失败均关闭Core/DB、释放握手和临时Profile，无后台执行。末次return校验实际exit0后原生MESSAGE+FINAL交回并停写。
