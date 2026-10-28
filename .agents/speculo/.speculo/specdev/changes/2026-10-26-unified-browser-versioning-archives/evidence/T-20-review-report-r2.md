# T-20 repair-1 独立双轴审查原始报告（r2）

Reviewer: native:/root/review_archives
Mode: native
Implementers: native:/root/audit_archives（按Lead TASK；真实派遣/返回回执由Lead核验）
Review-Mode: working-tree
Base/Observed-HEAD: 265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa
Input-SHA256: 069badbe6898da7dc1b9492d24816071f92ce6a6b6379025132636c5f1aa11f8

本人未参与T20及repair-1的实现、修复和测试编写，保持原生gpt-6.1-sol/high独立reviewer身份。唯一写入为本r2报告，未改源码、正式Evidence/状态、Ticket/Map、旧输入/报告、生成物或Git index，未递归派遣Agent。

## review-input

完整冻结对象：[T-20-review-input-r2.json](T-20-review-input-r2.json)。Input-SHA256为完整对象经JSON.parse再JSON.stringify后的UTF-8 SHA256，区别于scope内部摘要。

开始及结束：24个scope路径、57个来源原字节全部MATCH。相对r1仅四路径变化：relation-store.ts、ArchiveRelations.tsx、archives-relations.test.ts、archive-forms.dom.test.tsx；其余20路径不变。来源增加原r1报告；tickets-map由revision7更新为8，补核未来T24的home生产项目入口，未改变T20合同或DAG，其余来源摘要不变。T17r2/T18r2/T19r3联合前序剩余25个依赖文件全部仍MATCH。

结束前同一显式24路径重跑review-scope，base_sha、observed_head、working_snapshot、index_sha256、tracked_diff_sha256全部MATCH。未用共同HEAD替代工作副本字节证明。

本轮沿用并核对原code-review、AGENTS/dev/ui及其适用参考，完整Spec/ADR/Issue3、T20/前序Ticket、SRC010、docs/contacts和DESIGN/批准原型来源。DESIGN revision2/digest f04a5aabaa7a57dbdaa17cb89ae611d40a7c32fe948317ac641818bd38224b9c、PAGE001/AC021不变。working-tree无新增commit/远程PR来源，不虚构不可变commit diff；规范与标准均存在，无跳过轴。原始r1报告及独立身份、冻结输入和生产反例可回读；只对已证明未变的部分复用。

## standards-output

Reviewer: native:/root/review_archives
Axis: standards
Result: pass
Input-SHA256: 069badbe6898da7dc1b9492d24816071f92ce6a6b6379025132636c5f1aa11f8
Observed: 原3项问题均闭合；定向重演原反例、修复新增边界与正常发布路径后，本轮未发现新的需修正问题。
Findings: []

### S-20-01：闭合

`src/modules/archives/core/relation-store.ts:35`–`:50`建立并检查ScanBaseline，`:59`–`:65`以该基准的文件列表扫描，scan结束再次checkBaseline。基准保存root、mutation generation、根内完整Markdown文件对象/路径/stat，不再在旧scan后重新采样generation或inventory证明旧结果。

`prepare:169`–`:183`在取实体之前/之后检查state.baseline，最终capture继续使用同一个state.baseline；create/update的Vault create/process同步回调仍调用该check。deletion同样把state.baseline交capture，实际application.remove/trash最终门继续执行它。文件新增即使事件尚未调用invalidate也会被inventory长度/identity检查挡下；已有文件替换、改路径、stat或事件代次变化均失效。raw proof重读及native captureEditors/最终edit检查仍保留。

实际独立运行14个到达注入场景，均在预期relationChanged处拒绝，候选未新增、原关系与企业原文字节未变、trashCalls=0：create的基数/重复ID/重复operation/环，update的同四类，delete的restrict-context；同时包含create和delete无事件到达，以及create/update/delete三个最终提交窗口。使用真实ContactsApplication/公开服务和临时磁盘ContactsFiles夹具，注入在明确read/final guard接缝，不依赖随机延时。

定义发布的基准重建与此不同：自身不可变修订文件创建成功后，发布方读取新staged file并建立专用baseline/proof，再由此核验到current排他创建；它没有把旧关系图语义检查的扫描结果当成新基准事实。实际正常公开关系创建/重开查询和“指针EIO后复用相同修订、篡改staged禁止current”两项回归通过，未因新门把正确发布一律阻塞。这里仍保留定义hash/字节/file/stat/native proof及原root/active限制。

### S-20-02：闭合

`src/modules/archives/ui/ArchiveRelations.tsx:42`–`:46`为effect内每次load递增request，成功和失败同时要求active且token===request；cleanup失效旧effect并unsubscribe。依赖包含entity.id、entity.path、scope与refresh。一次load的relations/catalog/entities/archiveTypes共同受同一token约束，旧错误不能覆盖新成功，旧完整性诊断也不能把当前界面回滚。

实际运行3个明确barrier DOM场景：首次旧空成功、旧错误、旧不完整诊断分别晚于第二次反向端新成功；新role: LATEST保留，无“暂无独立关系”、无旧alert，Add relationship仍可用。active/root卸载边界与T19的draftContext+root key继续存在。

### S-20-03：闭合

`src/modules/archives/ui/ArchiveRelations.tsx:55`–`:61`以不可变draft.base.relation比较contextRefs、status及带precision的from/to，只把实际不同的metadata键写入changes。日期明确清空仍用null；context显式清空用{}；属性values仍为逐字段用户改动，不覆盖未编辑属性。没有变更原核心三方冲突规则。

实际运行4个不同字段合并DOM场景：外部单改status、validFrom、validTo（并转past）、contextRefs，本端只改Role。捕获的公开update请求只有values，磁盘同时保留外部metadata与USER ROLE。另1个场景清除两日期与context，实际提交{values:{},contextRefs:{},validFrom:null,validTo:null}并读回为空；随后真正同一validFrom被两端分别改动时仍拒绝，界面保留2022-03草稿，磁盘保留外部2023-04，没有把真实冲突吞成成功。

## specification-output

Reviewer: native:/root/review_archives
Axis: specification
Result: pass
Input-SHA256: 069badbe6898da7dc1b9492d24816071f92ce6a6b6379025132636c5f1aa11f8
Observed: 原A-20-01/02/03分别闭合；本轮修复满足其AC021、迟到读取与三方合并要求，未发现新的本票合同缺口。
Findings: []

- A-20-01闭合：已在本地提交前到达的关系不再被scan漏读后接受候选；基数、重复身份/operation、按类型环限制和context删除restrict共用同一开始基准。失败无候选写入/关系覆盖/实体删除。正常独立关系发布、创建、重开读回和partial定义续跑仍成立。
- A-20-02闭合：两端展示最新同一事实，不受较早空结果、错误或旧诊断覆盖。Issue3迟到读取代次规则适用于实际组件赋值，未靠只测试核心服务代替界面消费者。
- A-20-03闭合：关系表单只表达实际改动，满足Spec及Issue3实体/关系单文件保存中不同字段可合并、同字段冲突保留草稿；清空动作与未改动得到区分。

原r1已读的未变范围仍由其固定源码和证据支持：单一relationId可见Markdown与两端/context投影；公开服务→同一Vaultport/队列→真实RecordDetail/Workspace的消费者；唯一有效v1个人/企业及自定义v2项目端点；方向/对称、历史/当前、期间基数、草稿、重复角色/period/context、按类型图约束；未知YAML/评论/BOM/CRLF/自由正文和全部既有codec；operationId部分提交对账；不可变staged proof/最终原生叶/root生命周期；模块owner与A→B→A busy/成功/失败草稿保留和不重播。四文件修复未移除这些路径或更改其持久化协议。

范围解释保持原文：无迁移来源的新独立关系允许引用合法唯一v1/v2实体，只写新关系owner；旧inline编辑迁移gate与稳定迁移映射由T21完成，本票没有新增绕过。T23完整树壳、T30图不属于本轮执行，不用它们替代本票真实自定义RelationTypeDesigner→关系新建/编辑/归档→反向展示的既有代码与证据。

## 本轮实际执行

定向执行（两个独立Vitest进程，检查各自完整结果）：

1. `pnpm exec vitest run --project unit src/modules/archives/archives-relations.test.ts -t 'arriving during|partial relation definition creation|public relations use one visible fact'`
   - exit0，1文件通过，16 passed / 16 skipped（总32）。14项扫描/最终门到达负例与2项正常/发布恢复回归全部通过。
2. `pnpm exec vitest run --project dom src/modules/archives/ui/archive-forms.dom.test.tsx -t 'a late old relation|the real relation form'`
   - exit0，1文件通过，8 passed / 28 skipped（总36）。3项迟到读取、4项不同metadata合并及1项显式清空/真冲突通过。

本轮共亲自运行24项对应风险的测试，未把skipped计作通过。回读新增测试的生产接缝、barrier、实际磁盘/界面断言与清理；未以作者red→green或数量替代源码审查，未无差别重跑此前全部有效回归。

作者报告19项原反例red→green、3项finalbarrier、10files210tests、2生产lint、architecture1258/diffcheck通过；这些是作者/Lead的检查记录，不冒充本reviewer重跑。限定tsc曾受browser活动host-main unknown→number诊断影响而exit126；Lead告知该处已由browser作者修复，完整test tsc session77632 exit0、worker tsc exit0。本轮未重跑全局tsc、未跨域修改，历史失败仍保留，不把后续绿灯倒写成当时通过。

## 未验证项与交接

按SRC010及本轮授权，未运行真实Obsidian主窗/popout/原生buffer、平台实机、人工视觉/键盘焦点、性能规模或build；未写生成物。临时磁盘Vaultport夹具和happy-dom只证明相应生产核心/组件行为，不能当真实宿主验收。上述真实验收仍由用户执行，两轴pass仅针对冻结代码与本票合同审查。

结束已复核输入/源码/来源原字节与同scope快照。保留r1报告及所有旧工件，只新增本r2原始报告；报告完成后停写交Lead。
