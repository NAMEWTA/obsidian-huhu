# T-21 repair-1 独立双轴审查原始报告（r2）

Reviewer: native:/root/review_archives
Mode: native
Implementers: native:/root/audit_archives（按Lead TASK，真实派遣/返回回执由Lead核验）
Review-Mode: working-tree
Base/Observed-HEAD: 265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa
Input-SHA256: c827e36fe7b834e4d2a688004036c69a7b16975c3d2ba1dea03cdb54ce2cfd45

本人未参与T21及repair-1的实现、修复或测试编写，保持原生gpt-6.1-sol/high独立reviewer身份。未递归派遣；唯一写入为本r2报告，未修改源码、正式Evidence/状态、Ticket/Map、旧输入/报告、生成物或Git index。

## review-input

完整冻结对象：[T-21-review-input-r2.json](T-21-review-input-r2.json)。Input-SHA256为完整对象经JSON.parse再JSON.stringify后的UTF-8 SHA256，区别于scope内部摘要。

开始与结束核验27个scope路径、63个来源原字节，全部MATCH。相对r1变更13路径：migration-authority/model/store、catalog/application/relation-store、reminders-source、ArchiveEntityForm/ArchiveWorkspace/ArchiveMigration、i18n、migration tests、forms DOM；其中ArchiveEntityForm是本轮新增触及路径，其余候选不变。T17r2/T18r2/T19r3/T20r2联合前序剩余33依赖路径原字节仍MATCH。结束前同一显式27路径重跑review-scope，base_sha、observed_head、working_snapshot、index_sha256、tracked_diff_sha256均MATCH。

实际Map为revision9，来源原字节SHA256 a04e4c75fa2d5a1d337095cbf2207bf593591effae4af06277f23e8c11d7435a，与本输入相同。原r1“Map8”文字笔误及独立追加核验已由[T-21-review-errata.md](T-21-review-errata.md)保存；本轮绑定原r1报告与该勘误，不修改旧原始工件。

标准/规范来源沿用并核对固定AGENTS/dev/ui、code-review及其working-tree/source-discovery/Fowler/risk/reviewer-contracts/review-evidence/result-reuse、错误/测试可靠性参考、项目配置，以及完整T21/Spec/ADR/Issue3/SRC010、前序合同与独立报告、docs/contacts、DESIGN及封板原型。无缺失规范轴；working-tree没有新增commit/远程PR来源，不虚构该来源。设计仍为revision2/digest f04a5aabaa7a57dbdaa17cb89ae611d40a7c32fe948317ac641818bd38224b9c/PAGE002。本轮读取T-21.md最终停写回执及环境记录，未把作者绿色替代实际语义审查。

## standards-output

Reviewer: native:/root/review_archives
Axis: standards
Result: request-changes
Input-SHA256: c827e36fe7b834e4d2a688004036c69a7b16975c3d2ba1dea03cdb54ce2cfd45
Observed: 原S-21-01/03/04/05闭合；S-21-02的写入和重开保护已修复，metadata通过rename到达时旧读取/计数刷新仍遗漏。保留以下1项P2，未重复列出已修复的P1。

### S-r2-01 · P2 · 迁移回执重命名移入目录时未刷新旧inline投影

- 位置：`src/modules/archives/core/application.ts:112`–`:134`，主要`:119`与`:125`；对照create/modify/delete的刷新`:97`、`:103`。真实事件分发`src/modules/archives/platform/controller.ts`的vault rename handler会在新路径位于root时调用此方法。
- 机制：fileRenamed只通过fileDeleted(oldPath)检查旧路径是否位于迁移记录；没有检查newPath。新文件位于迁移记录时，inside(newPath)为false，后续候选readFile也不会更新owner的legacyProjection。archives已invalidate、页面已emit，但旧index中的inline投影未重算。
- 独立生产反例：实际ContactsApplication+公开archiveServices、隔离内存ContactsFiles。先完整迁移，保存有效complete原文；将owner恢复原v1并移走complete，使当前可见事实为staged，重开application后index inline=1/errors=[]。把有效complete从`Incoming/receipt.md`重命名到`档案/迁移记录/renamed-receipt-完成.md`，保持真实文件对象并调用fileRenamed(file,old,new)。等待该方法最终emit完成后，generic snapshot已migrationConflict，而旧index仍inline=1/errors=[]。随后仅补发fileChanged(newfile)作为对照，旧index立即inline=0/errors=[migrationConflict]。
- 原始输出：`RENAME before 1 []`；`RENAME after {inline:1,errors:[],generic:[migrationConflict]}`；`RENAME fileChanged control 0 [migrationConflict]`。探针使用订阅等待rename最终emit和对照状态，无sleep。初版探针错误等待两次emit，因batching只发布一次而退出未完成；该夹具等待失败不是产品证据。调整为实际最终emit后取得上述结果。
- 风险：RecordDetail、企业人员列表等真实legacy index消费者继续显示已不应活跃的旧inline事实和计数，与同一磁盘事实的generic authority冲突不一致。用户把可见恢复/回执文件移动到正确位置或通过rename恢复时可达。基本字段/提醒等最终authority写门现已存在，本轮未声称该反例可以绕过修复后的写门。
- 依据：原S-21-02要求旧读取/计数与可见authority一致；dev公共契约消费者/数据owner、Issue3完成事实到达后不得重启旧表权威；T21自身恢复读取与AC024，不以T22全面同步为豁免。
- 满足条件：fileRenamed识别旧路径或新路径涉及迁移记录的文件/目录移动，并触发同一合并刷新，使相关旧投影与计数最终一致。至少覆盖普通目录或root外→迁移目录的receipt rename、metadata目录rename；保持移出/删除现有行为、原文/文件identity/root与最终写门。用明确事件等待证明新complete到达后inline去活跃、诊断出现，无需额外owner edit/fileChanged；同时验证移除/已验证回退能合法恢复v1基本编辑。

## specification-output

Reviewer: native:/root/review_archives
Axis: specification
Result: request-changes
Input-SHA256: c827e36fe7b834e4d2a688004036c69a7b16975c3d2ba1dea03cdb54ce2cfd45
Observed: 原A-21-01/03/04/05闭合；A-21-02部分闭合，仍有下列P2读/计数消费者缺口。

### A-r2-01 · P2 · 同一可见完成事实经rename到达后，旧inline仍显示为活跃

位置、实证及满足条件同S-r2-01。Issue3读取不变量要求完成事实与owner回v1时进入冲突，不重新启用旧表；T21实际恢复消费者必须遵守。当前generic查询已经冲突，但旧index未刷新，不能用正确的generic输出代替实际旧详情/企业人员数据源的一致性。此项只要求本票事件链对已实现authority重新投影，不要求提前完成T22的全面同步/分叉功能。

## 原五项逐项复核

1. **S/A-21-01闭合。** rollback intent新增可见huhu-activation，固定sourcePhase(active/staged)、owner/migration身份、关系ID集合及预期ownerHash并验证。authority读取intent，把pending/损坏或不可读final receipt解释为pending/conflict，不退staged完整零条；活跃来源的关系保留可见且只读诊断，staged取消仍不制造active关系。旧projection隐藏active回退的inline；公开rollback在同一可见计划下可继续，完成后才退役关系且保留文件。实际重演双回执EIO/重开/继续、损坏/不可读final、staged取消，以及真实session继续pending rollback，均通过。
2. **S/A-21-02部分闭合。** application.readFile经legacyProjection给旧index附authority诊断并去活跃inline；snapshot/save/legacy reminder、迁移后v2字段/提醒都消费captureAuthority最终门。proof含开始generation/inventory、真实metadata/owner字节与native检查，晚到complete/rollback intent拒绝实际process写入。提醒list也排除authority冲突；重开及create/modify/delete metadata刷新已有。完成后回v1的原反例、旧计数对照及最终回调负例通过；rename入目录遗漏由本轮唯一finding保留。
3. **S/A-21-03闭合。** ArchiveWorkspace同步订阅owner中对应实体migration busy，并传externalBusy到真实ArchiveEntityForm；表单输入/模板/保存/完成/返回禁用，save及字段onChange也直接检查busy。ownBusy与externalBusy分离避免回调自锁；ArchiveRelations亦被迁移busy fieldset锁住。成功消费result后退出不再能丢掉迁移中产生的实体输入；失败解锁保留后续用户草稿。实际DOM覆盖输入/保存/返回锁、成功及失败A→B→A恢复锁与其他root设计草稿保留、命令只执行一次，均通过。
4. **S/A-21-04闭合。** list消费共享ownerSwitched/authority，语义identity+migrationId+预期关系集合认定switched；正文、字段或提醒变化后保持switched并给migrationChanged。resume/rollback仍要求原hash，不覆盖后续改动；缺失/冲突映射为显式phase/diagnostic，不以完整原文相等决定是否切换。三种修改与严格拒写均通过。
5. **S/A-21-05闭合。** provedSnapshot的迁移scope仅容忍身份明确、唯一且不在相关scope的nameRequired/invalidField；所有可疑entity路径重新真实read并与已解析原文对照，unknownIdentity/readfail/duplicates及相关端点/图仍失败。迁移query和proof保持相关关系约束，零关系owner也重证全部身份并把proof带到同一scan baseline最终门。无关已知坏字段合法batch迁移/重开resume通过；未知ID/不可读/重复/坏端点在写定义前拒绝，plan写后注入重复身份的零关系owner未切换。

## 未变范围及修复影响

相同冻结源码与来源上复用前序独立证据，不无差别重跑：纯预检不写、原始backup/可见plan/稳定row映射/provenance与operation重试、staged不双计、关系逐项验证→owner Vault.process CAS→完成回执；校验回退保留关系文件、用户新增/修改/删除hash冲突拒绝；supersedes仅同owner可解释未提交计划并保留原映射；v1基本codec/inline命令与UI gate、person/company别名、未知createdAt=null、leader/report/custom称谓/空keyRole、正文/附件/BOM/CRLF/未知yaml/提醒ID保真及导航；T17/T18 schema/native/null保护、T19模块草稿owner和T20同开始scan baseline最终门均未被本修复删除。

新migrationReceipt增加conflict/superseded阶段，UI/i18n对应分支及中断时的真实下一动作已回读。PAGE002实际public服务、旧详情和Workspace入口仍接同owner；本报告的rename缺口属于其真实旧index消费者。未扩大到T22分叉、真实用户迁移或其他活跃票修改。

## 本轮实际执行

1. `TMPDIR=/dev/shm pnpm exec vitest run --project unit src/modules/archives/archives-migration.test.ts -t 'activated migration stays|legacy index, snapshot|semantic switched|known unrelated|unverified active rollback|staged cancellation|late completion fact|metadata events|batch migration still|migrated .* writes reject|zero-relation owner'`
   - exit0；1文件通过，19 passed / 67 skipped（总86），duration14.54s。覆盖本轮核心原反例及新最终门/身份边界。
2. `pnpm exec vitest run --project dom src/modules/archives/ui/archive-forms.dom.test.tsx -t 'migration busy locks|migration busy restores|real session can explicitly finish'`
   - exit0；1文件通过，4 passed / 40 skipped（总44），duration14.15s。覆盖真实组件锁、根切换和pending回退继续。
3. 独立rename生产probe与fileChanged对照：esbuild write:false内存加载实际application/公开服务，隔离内存Vaultport，状态输出见S-r2-01，未写源码、测试或生成物。一次工具store未承接旧fixture导致fixture未定义、一次等待emit次数错误，均不计作产品反例；最终有效probe确实执行并观察了目标错误与正向对照。
4. 完整canonical输入摘要、27路径/63来源始终核验、前序联合33依赖字节及同显式scope摘要，全部MATCH。

亲自运行合计23项风险相关测试，未把skipped计为通过；回读新增测试的实际生产接缝、barrier和外部状态断言，未机械重复完整308项或全局类型检查。

作者最终报告12files308tests、全test tsc、11生产lint/architecture1263/i18n5240/diffcheck通过；本轮读取最终Evidence回执，未冒充这些检查均由reviewer重跑。历史ENOSPC、整组270通过/38失败与此前超时原记录保留；没有证据把全部历史超时强行归因空间。作者最终同组和本轮unit定向使用/dev/shm的真实临时文件IO，属于tmpfs，不证明断电持久性。review时df显示根盘约35G可用、/dev/shm约16G可用；这是当前观察，不倒写旧环境。

## 未验证与交接

按SRC010与本轮授权，未运行真实用户迁移、真实Obsidian主窗/popout/原生buffer、平台实机、人工视觉/键盘焦点、性能或build；未写生成物。临时文件/内存Vault和happy-dom只证明相应核心/组件行为，不等同真实宿主。真实验收仍由用户完成。

原五项闭合与唯一残余已分别保留；本轮两个request-changes仅因确认的P2 rename消费者缺口，不因约定未运行项。保留旧输入/报告/勘误，只新增本r2原始报告；结束复核后停写交Lead安排最小repair-2。
