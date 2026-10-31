# T-21 独立双轴审查原始报告

Reviewer: native:/root/review_archives
Mode: native
Implementers: native:/root/audit_archives（按Lead TASK，真实派遣回执由Lead核验）
Review-Mode: working-tree
Base/Observed-HEAD: 265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa
Input-SHA256: fd770723cd6f7b0efede82b02f0ba78f5edf727b6bc31e756467095f0460dbb8

本人未参与T21实现、修复或测试编写，保持原生gpt-6.1-sol/high独立reviewer身份。未递归派遣；只新增本报告，未修改源码、正式Evidence/状态、Ticket/Map、旧输入/报告、生成物或Git index。

## review-input

完整冻结对象：[T-21-review-input.json](T-21-review-input.json)。上述摘要为完整对象经JSON.parse再JSON.stringify后的UTF-8 SHA256，区别于scope内部摘要。

开始与结束核验26个scope路径、61个来源原字节，全部MATCH。相对T17r2/T18r2/T19r3/T20r2联合前序，这26路径均为新增或变化；联合前序剩余34依赖路径的原字节仍MATCH。结束前按原显式26路径重跑review-scope，base_sha、observed_head、working_snapshot、index_sha256、tracked_diff_sha256均MATCH。未用共同HEAD代替工作副本核验。

采用已读且本轮摘要未变的code-review及working-tree/source-discovery/Fowler/risk/reviewer-contracts/review-evidence/result-reuse、错误/测试可靠性规则，AGENTS/dev/ui及其架构、宿主、测试与设计参考。规范来自固定T21、Spec/ADR/完整Issue3、SRC010、Map8、前序合同与原始审查、docs/contacts、DESIGN及封板原型。working-tree没有新增commit/远程PR来源，不虚构该来源；标准/规范均存在，无跳过轴。设计为revision2、digest f04a5aabaa7a57dbdaa17cb89ae611d40a7c32fe948317ac641818bd38224b9c、PAGE002。本轮未执行人工视觉验收。

实际追踪公开services→migration-store/authority→可见manifest/backup/关系→Vault process/原生门→完成/回退回执，以及legacy application/index/RecordDetail、ArchiveWorkspace/ArchiveMigration、提醒来源与导航消费者。T22的全面同步/分叉未纳入实施，但T21恢复所需的权威读取不能因此跳过。

## standards-output

Reviewer: native:/root/review_archives
Axis: standards
Result: request-changes
Input-SHA256: fd770723cd6f7b0efede82b02f0ba78f5edf727b6bc31e756467095f0460dbb8
Observed: 确认3项P1、2项P2，均有生产核心或真实组件反例；正常回归通过不能替代这些恢复/消费者边界。

### S-21-01 · P1 · 回退待完成可把已激活关系误判回staged并返回完整零条

- 位置：`src/modules/archives/core/migration-authority.ts:38`–`:59`（没有读取rollbackIntent）；`src/modules/archives/core/relation-store.ts:99`–`:102`；写入链`src/modules/archives/core/migration-store.ts:425`–`:439`。
- 生产反例：实际ContactsApplication+archiveServices、内存Vault端口，旧owner有1条任职。迁移只让“完成.md”创建报EIO，owner CAS已发生，公共relations为active 1条。再显式rollback，仅让最后“回退.md”创建报EIO，owner已恢复原v1且回退计划存在。此时migrations显示rollback-pending、verified=1/total=1；relations却返回count=0、isComplete=true、diagnostics=[]。
- 原始结果：`COMPLETE fault complete EIO / before rollback active 1 / ROLLBACK fault rollback receipt EIO / PENDING query {count:0,complete:true,diagnostics:[]} / PENDING list phase:rollback-pending / OWNER v1 true`。
- 原因/风险：authority只解释complete/rollback完成回执；没有complete时，只要owner呈v1就归staged。relation-store据此隐藏已激活事实，既未保留激活/回退待核验事实，也没有不完整诊断。只剩owner恢复与intent不能被当作已验证完成的回退。
- 同根因旧消费者补查：同一端口重开真实ContactsApplication，legacy index恢复inline=1、issues=[]，实际v1 basic save也成功，独立关系仍完整零条。inline编辑/删除的migrationRequired命令门仍在，未声称该门被打开。
- 依据：错误处理规则对部分成功/未知结果的保证；Issue3约630–648行读取不变量与回退，owner单独恢复v1不构成完成回退；T21 AC024/033保留已完成迁移事实。
- 满足条件：可见rollback intent与其前置owner/激活事实必须参与authority并有足够可携带信息区分从staged取消和从active回退；最终回退回执缺失、损坏、不可读时报告待核验/冲突，不能返回完整零条或静默恢复旧权威。完整修复同时覆盖旧inline读取/计数/写路由（见S-21-02），不是只取消relation-store的过滤。用迁移完成回执失败→回退owner成功→回退回执失败的组合故障，在重开后核对公共查询、旧详情与继续回退。

### S-21-02 · P1 · 旧index与基本字段写入口绕过已存在的迁移authority冲突

- 位置：`src/modules/archives/core/application.ts:256`–`:275`、`:309`–`:352`；实际显示`src/modules/archives/ui/RecordDetail.tsx:135`–`:151`、`:200`起；对照`src/modules/archives/core/catalog.ts:323`–`:325`。
- 独立反例：迁移完全成功（有有效complete），外部只把owner恢复为备份v1。新建ContactsApplication并ensureLoaded。generic snapshot正确给owner readOnly=true、migrationConflict；独立relations仍1条、readonly=true/isComplete=false。可是legacy index仍收录原inline=1且issues=[]，snapshot→clone改region→application.save成功。
- 原始结果：`REGRESS generic {readonly:true,codes:[migrationConflict]} / REGRESS new relations {count:1,complete:false,readonly:true} / REGRESS legacy {inline:1,issues:[]} / REGRESS legacy save ACCEPTED`。
- 风险：authority即使已正确判冲突，老RecordDetail/企业人员等index消费者仍重新解释旧表为普通权威资料并开放基本写入，形成与独立事实不一致的读/写路由。这是独立于S-21-01的消费者缺口，修复intent解析本身不会自动闭合。
- 依据：dev公共契约双方一致与数据owner；Issue3约639/644/648行，有完成回执而owner回v1需进入冲突，不能重启旧表权威；T21自身可恢复切换与旧消费者合同。
- 满足条件：legacy index、详情计数和旧snapshot/save/提醒等相关写入口统一消费可见迁移authority，保留冲突原文但不把旧inline恢复成活跃事实；冲突写路由在最终提交点也须拒绝。核对owner回v1/不同migrationId、rollback-pending及已验证rollback：前两类只读诊断，只有验证回退后才恢复合法v1基本字段编辑。不能永久禁掉所有未迁移v1基本写入。提醒冲突分支本轮仅源码追踪，未声称已实跑。

### S-21-03 · P1 · 迁移进行中仍可编辑实体，完成回调直接清掉新草稿

- 位置：`src/modules/archives/ui/ArchiveWorkspace.tsx:71`、`:93`–`:105`；`src/modules/archives/ui/ArchiveMigration.tsx:36`–`:39`；依赖组件`src/modules/archives/ui/ArchiveEntityForm.tsx:89`–`:96`。
- 真实组件反例：挂载ArchiveWorkspace initialPath=旧owner，经真实表单预检并确认迁移，在实际owner process前用barrier停住。此时Name输入disabled=false；输入USER DURING MIGRATION，释放barrier让迁移成功。onChanged调用exit，exit清理实体scope并退出表单。磁盘没有该文字，模块ArchiveDraftOwner的草稿Map也没有该文字。
- 原始结果：`BUSY name disabled false / BUSY value USER DURING MIGRATION / AFTER disk has draft false owner has draft false`。
- 原因/风险：起始dirty gate只阻止已有草稿时发起迁移；migrationBusy只汇总到Workspace，未传给实体控件/保存/返回。实体组件仍只看自己的busy。迁移成功无条件清scope，丢失进行中产生的用户草稿；原生buffer门无法保护React表单内存草稿。
- 依据：dev/UI状态归属、错误规则有效数据保留；AC033保留表单草稿；PAGE002中断/状态保护与前序T19 module owner承诺。
- 满足条件：迁移/回退busy必须锁住同实体受影响的编辑、保存和返回，或在完成后保留迁移期间产生的草稿并明确安全重基/比较；不能无条件clearScope清掉新输入。覆盖实际session入口、成功/失败、A→B→A重挂及迟到完成，不重播命令、不清其他scope。上述本轮实证为同一挂载成功路径，未把根切换成功分支说成已跑。

### S-21-04 · P2 · owner已切换后的自由正文改动让公开阶段退回staged

- 位置：`src/modules/archives/core/migration-store.ts:407`–`:409`，消费者`src/modules/archives/ui/ArchiveMigration.tsx:73`起；对照authority的语义switch判断。
- 生产反例：完成回执EIO后，公开migrations先为switched。owner只追加USER AFTER SWITCH自由正文并invalidate，再查询migrations变为staged、diagnostics=[]、verified=1/total=1；公共relations仍active 1条。
- 原因/风险：list用owner===plan.owner.raw判断switched，将未受管正文或合法后续编辑误当作从未切换。产品文案staged明确说原owner仍为权威，误导恢复判断。它与S-21-01的双回执故障是不同路径。
- 依据：Issue3 owner CAS就是激活事实，不因回执未到退staged；PAGE002中断显示实际完成数量与仍有效资料；错误规则不得用简化结果掩盖已发生副作用。
- 满足条件：list与共享authority基于同一可见身份/migrationId/预期关系集合解释阶段；owner已切换而内容后来改动时保持switched并给适当冲突/待验证信息，不能声称原owner权威。resume/rollback仍比较预期hash，不能为修正显示放宽覆盖用户新数据的门。测试回执失败后正文/字段/提醒变化及owner缺失/关系缺件的阶段与诊断。

### S-21-05 · P2 · 无关且身份明确的损坏实体阻止已通过预检的合法项分批迁移

- 位置：`src/modules/archives/core/migration-store.ts:207`–`:213`、`:335`–`:337`；后续迁移门`src/modules/archives/core/relation-store.ts:202`起及prepare的全局entities.isComplete。
- 生产反例：有效owner和唯一有效企业端点，另有无关v1文件Broken/基本信息.md，明确唯一huhu-id=broken，仅缺name。preflight输出canMigrate=true、damaged=1，诊断仅该无关path/nameRequired；确认migrate发布定义后被relations.query全库isComplete拒绝relationIncomplete，owner未切换。
- 原始结果：`UNRELATED preflight true {valid:2,damaged:1,duplicates:0,employments:1,relations:0,reminders:0} [Broken:nameRequired] / UNRELATED refused relationIncomplete`。
- 风险：预检和执行的相关性合同不同，用户按已通过的预检无法迁移合法项；Issue3承诺的分批迁移在库内一条无关已知坏字段下不可用。未要求忽略未知身份、重复身份、相关端点或图约束风险。
- 依据：Issue3约606–608行“对缺失定义和歧义不猜测；合法实体可以分批迁移，异常项保留诊断”；T21预检到确认/恢复的一致性。
- 满足条件：迁移使用有明确范围与证明的身份/端点/关系/图校验，使身份已知且与本迁移无关的实体字段诊断保持可见但不阻止合法项；未知ID/不可读可能藏重复、相关端点、全局图或真实歧义仍fail closed。不能仅把preflight改成全库有错一律false来删除分批合同。覆盖预检/确认/恢复一致性与坏文件原文不变。

## specification-output

Reviewer: native:/root/review_archives
Axis: specification
Result: request-changes
Input-SHA256: fd770723cd6f7b0efede82b02f0ba78f5edf727b6bc31e756467095f0460dbb8
Observed: 以下5项分别不满足本票完整迁移/读取/回退及草稿合同；详见同号独立反例。

1. **A-21-01 / P1**，位置同S-21-01：AC024/033、Issue3读取不变量与回退要求未闭合。双回执失败的rollback-pending不能把已激活关系隐藏成完整零条，更不能只靠恢复owner重开旧权威。满足条件同S-21-01。
2. **A-21-02 / P1**，位置同S-21-02：有完成事实而owner回v1，generic正确冲突但真实旧index与基本写路由不服从该结果；违反Issue3已完成迁移权威不得重启旧表。满足条件同S-21-02；不是把T22全面同步实现提前纳入。
3. **A-21-03 / P1**，位置同S-21-03：AC033与PAGE002/前序草稿owner保证要求保留用户表单草稿；迁移进行中可输入却在完成时被清掉，起始dirty门不能替代全过程保护。满足条件同S-21-03。
4. **A-21-04 / P2**，位置同S-21-04：owner CAS后的正文变化不能将实际switched展示为staged、无诊断。满足条件同S-21-04，仍保留hash冲突拒写。
5. **A-21-05 / P2**，位置同S-21-05：预检canMigrate与执行全库完整性门不一致，且阻断原文允许的合法分批迁移。满足条件同S-21-05，不放松未知身份安全门。

## 已确认的实现与未变边界

- 实际module注册的archiveServices公开preflight/migrate/resume/rollback/migrations，接同一ArchiveMigrationStore、队列、Vaultport和原生协调器；不是独立测试实现。预检只有读取/capture，用户确认才写；源/引用hash、缺失ID/链接与ID不符、重复ID/坏表/marker被具体诊断，手工行位置和显式rowId进入可见plan/provenance。
- 可见迁移恢复目录保存原字节，plan冻结operationId/源hash/目标type/owner与关系原文hash/依赖；重试读取同一计划，不重分配关系ID。关系先写逐项读回，迁移proof执行端点/身份/图/native门，再在owner Vault.process内CAS，最后写完成回执。未发生切换的staged不进入独立关系计数；切换但完成回执失败时，常规未再改变owner的路径可按identity保持active。
- 回退保留关系文件，通过可见intent、owner受guard恢复及完成回执退役；实际hash门拒绝owner/关系修改、删除、新增关系及最后窗口新到达关系。S-21-01指出其组合故障读取缺口，未误报回退在普通正常路径直接删除关系文件。
- supersedes在新预检明确显示，只纳入同owner未完成staged；原文件/映射保留；已完成、损坏/不可读回执、坏backup、rollback-pending、已改staged不得当作无证据。新owner的可见supersedes解释旧计划退役，未自动猜测重名或更改ownerID。
- v1基本字段仍用旧codec；inline编辑与删除的命令门明确migrationRequired，实际RecordDetail多处导向迁移入口。S-21-02要求在迁移冲突owner上额外接authority，不要求禁止正常未迁移v1基本编辑。当前RecordDetail个人关系行的编辑仍经view.edit→editBase拒绝而非直接迁移导航；本轮未将其当旁路。
- type-person/type-company与legacy person/company端点兼容；createdAt未知保留null，不编造时间；leader/report方向、自定义称谓、空keyRole、月/日、正文附件路径、提醒ID、BOM/CRLF/未知yaml沿原协议保留。迁移后提醒list/open/save/delete有实际公开消费者，提醒导航走相同身份；页面scope含root+具体path，根切换的原busy拒绝不写B、不自动重播。
- T20扫描baseline贯穿最终门、UI请求token与最小metadata补丁仍在；新增迁移proof沿该门，未退回原扫描竞态。T17/T18的schema/native/null补丁原边界仍可追踪。patchYamlValues为huhu标量使用YAML stringify以保持null等元数据类型；新增字段与实体正文以owned补丁处理，未整篇重写原始正文。
- 预计文件数产品文案明确“excluding shared definitions”，故未把共享定义文件不计入newFiles误报为缺陷。

## 本轮实际执行与原始证据

所有临时反例均esbuild write:false内存加载真实生产源码，未写测试或生成物；Vault端口为独立内存fixture，DOM为happy-dom+真实组件/TestProviders，不是Obsidian验收。

- 核心探针1：完成回执EIO→owner正文变化→阶段由switched退staged，公共关系仍active；另一个隔离fixture加入无关明确ID缺name文件，预检true但迁移拒绝relationIncomplete。
- 核心探针2：完成回执EIO→回退回执EIO→public relations完整零条，而migrations为rollback-pending。
- 核心探针3：同一pending状态重开实际ContactsApplication，legacy inline=1/issues=[]，v1 basic save成功。
- 核心探针4：完整完成后owner外部回v1，generic authority冲突与独立关系readonly正确，legacy inline/issues/basic save仍普通成功。
- DOM探针：真实ArchiveWorkspace session迁移owner process barrier，busy时可输入新Name，完成后磁盘和module owner都无该草稿。使用明确barrier/可见状态等待，无靠sleep碰竞态。
- 正常定向回归：`pnpm exec vitest run --project unit src/modules/archives/archives-migration.test.ts -t 'preflight is pure and public migration|verified rollback retires|company aliases'`，exit0，1文件通过，3 passed / 64 skipped（总67）。实际覆盖纯预检/重开、正常验证回退保留文件、person/company别名/自定义与report方向/提醒/BOM/CRLF等。未将skipped或未重跑项计作通过。

作者报告12files283tests、最后导航/忙迁移9+2、完整test tsc session39029、20生产lint/architecture1263/i18n5236/diffcheck exit0；本轮回读相关新增测试、真实接缝及配置，不无差别重跑这些有效检查，也不以其绿色替代上述组合故障/消费者反例。生产DocumentMutationCoordinator的多叶divergence/staged新叶/rollback ABA夹具已回读，未声称本人运行真实Obsidian或全部宿主场景。

## 未验证与交接

按SRC010及本轮授权，未运行真实用户迁移、真实Obsidian主窗/popout/原生buffer、实际平台、人工视觉/键盘焦点、性能或build；未写main/styles等生成物。必须的真实验收仍待用户执行，内存/DOM与正常定向回归不替代它。未跨改T06或启动T22。

以上5项均来自可达的本票新增路径，不借后续票删除本票恢复合同。保留固定输入及所有旧工件，仅新增本原始报告；结束核验后停写交Lead安排原作者修复与新冻结复审。
