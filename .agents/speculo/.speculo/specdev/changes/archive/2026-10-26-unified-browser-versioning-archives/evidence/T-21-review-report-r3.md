# T-21 repair-2 独立双轴审查原始报告（r3）

Reviewer: native:/root/review_archives
Mode: native
Implementers: native:/root/audit_archives（按Lead TASK，真实派遣/返回回执由Lead核验）
Review-Mode: working-tree
Base/Observed-HEAD: 265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa
Input-SHA256: 6ab4637ece0ded5dae818d48d63255a3d8d8261cab30649d2e917c29000e54e9

本人未参与T21及repair-1/repair-2的实现、修复或测试编写，保持原生gpt-6.1-sol/high独立reviewer身份。未递归派遣，只新增本r3报告；未改源码、正式Evidence/状态、Ticket/Map、旧输入/报告、生成物或Git index。

## review-input

完整冻结对象：[T-21-review-input-r3.json](T-21-review-input-r3.json)。Input-SHA256为完整对象经JSON.parse再JSON.stringify后的UTF-8 SHA256，区别于scope内部摘要。

开始与结束核验27个scope路径、64个来源原字节，全部MATCH。相对r2仅core/application.ts和archives-migration.test.ts两路径变化，其余25文件相同；来源新增原r2报告，其余原文未变。Map9及其来源SHA a04e4c75fa2d5a1d337095cbf2207bf593591effae4af06277f23e8c11d7435a不变，原r1文字勘误仍按独立errata保留。T17r2/T18r2/T19r3/T20r2联合前序剩余33依赖文件原字节仍MATCH。

结束前按同一显式27路径重跑review-scope，base_sha、observed_head、working_snapshot、index_sha256、tracked_diff_sha256全部MATCH。未用共同HEAD替代工作副本字节检查。

采用固定AGENTS/dev/ui、code-review及适用参考、完整T21/Spec/ADR/Issue3/SRC010、Map9、前序合同/独立原始报告和勘误、docs/contacts与DESIGN/封板原型。来源发现和标准/规范范围与r2相同，无缺失轴或虚构远程commit来源。设计仍为revision2/digest f04a5aabaa7a57dbdaa17cb89ae611d40a7c32fe948317ac641818bd38224b9c/PAGE002。已回读T-21.md repair-2最终停写回执；新输入新增的r2原始报告SHA与实际文件相同。

## standards-output

Reviewer: native:/root/review_archives
Axis: standards
Result: pass
Input-SHA256: 6ab4637ece0ded5dae818d48d63255a3d8d8261cab30649d2e917c29000e54e9
Observed: r2唯一残余rename消费者问题已闭合；定向生产反例、目录边界、移出与回退对照通过，未发现新需修正问题。
Findings: []

### 原S-r2-01闭合

`src/modules/archives/core/application.ts`新增migrationMetadata(path)，同时识别当前root下迁移记录目录本身及其子路径。fileChanged/fileDeleted复用该分类；fileRenamed在处理前核对oldPath或newPath，任一涉及metadata就触发原refreshLegacyAuthority。这样普通目录/root外→metadata、metadata→外部，以及整个metadata目录移入/移出均能重算legacyProjection。

原coalesced刷新门仍在：同步重复调用由authorityRefreshPending合并，微任务执行时检查active并枚举当前root的inside文件；旧异步readFile继续以generation/version/file identity/inside检查失效，不把旧root文件加入新root。rename原batching与最后emit保留，未新增写操作。源代码核对未移除旧snapshot/save/reminder或迁移最终authority/native检查。

独立重演原生产probe：实际ContactsApplication+公开archiveServices、隔离内存ContactsFiles，完整迁移后暂移走complete并恢复owner原v1，再将同一个有效complete文件从Incoming/receipt.md rename到迁移目录，等待实际投影订阅事件；未补发fileChanged。结果：

```text
RENAME before 1 []
RENAME after {inline:0, errors:[migrationConflict], sameIdentity:true,
              sameBytes:true, ownerProjectionPasses:1}
RENAME moved out 1 []
```

反例由r2的“generic冲突而legacy仍inline1”转为同一事件后去活跃inline并诊断；原文件identity/原文不变，owner投影仅调用一轮。随后移出同一回执，合法staged旧投影恢复，无需额外owner edit。

新增真实临时文件用例已逐项读实现并独立运行：root外和root内普通目录各一项rename入/出，metadata目录本身入/出/删除，一项已验证rollback receipt到达后恢复合法v1基本编辑及删除后回到pending。夹具用实际fs.rename保持文件对象身份，订阅实际投影条件，无sleep、无额外fileChanged。

## specification-output

Reviewer: native:/root/review_archives
Axis: specification
Result: pass
Input-SHA256: 6ab4637ece0ded5dae818d48d63255a3d8d8261cab30649d2e917c29000e54e9
Observed: 原A-r2-01闭合；已确认修复使本票可见迁移事实经rename到达时的旧读取/计数与authority一致，前序五项闭合证据保持有效。
Findings: []

AC024、Issue3读取不变量与T21真实旧消费者合同：完成事实从普通/root外路径rename到达后，generic冲突与legacy inline去活跃同步成立；不会重新启用旧表权威。移出/目录删除会重新核验当前可见事实，已验证回退到达后才开放对应正常v1编辑，回执删除后转pending/拒写。不是只更新generic查询或仅增加独立测试入口。

该修改只补已有authority的事件分类与刷新，不提前实现T22分叉/全面同步，也不改变迁移存储协议、原始关系文件、source hash、owner CAS或回执对账规则。

## 原五项与未变证据复用

r2已经完整核验且本轮相关源码/来源原字节相同的部分，按result-reuse保留原结果，不机械重跑308项：

1. 原S/A-21-01：可见rollback activation区分active回退与staged取消；双回执EIO、损坏/不可读final不退完整零条；pending保留关系与诊断，真实session可继续同一rollback，最终回执才退役关系。
2. 原S/A-21-02：legacyProjection、旧snapshot/save/reminder及迁移后v2字段/提醒统一authority与最终native/字节/generation门；晚到complete/intent拒绝process写入。r2残余的rename读/计数刷新由本轮单独闭合，create/modify/delete保护保持。
3. 原S/A-21-03：EntityForm externalBusy覆盖输入、模板、保存、完成、返回及处理器；A→B→A成功/失败锁和其他scope草稿保留、不重播已在r2实际DOM验证，相关UI未变。
4. 原S/A-21-04：list语义switched不因正文、字段、提醒变化降staged，给migrationChanged且resume/rollback严格hash门不放宽。
5. 原S/A-21-05：合法batch容忍无关已知唯一身份字段错误，未知/不可读/重复/相关端点图仍fail closed；零关系owner也重证全局身份并带proof到最终门。

AC023/024/033的其余正常、失败、恢复与兼容链路继续由前序实际审查支持：纯预检不写、可见plan/原始backup/稳定row映射与operation/provenance、staged不双计、逐项关系验证→owner Vault.process CAS→完成回执、显式恢复/回退保留用户新增修改删除、supersedes仅可解释未提交计划、v1基本codec/inline双gate、别名/未知createdAt/旧方向称谓/keyRole/正文附件/提醒身份保真与真实导航。T17/T18/T19/T20的schema/native/null/草稿owner/scan baseline最终门未被本轮删除。

## 本轮实际执行

1. `TMPDIR=/dev/shm pnpm exec vitest run --project unit src/modules/archives/archives-migration.test.ts -t 'receipt rename from|renaming the metadata directory|verified rollback receipt arriving by rename'`
   - exit0，1文件通过，4 passed / 86 skipped（总90），duration1.69s。仅计4项通过，不计skipped。
2. 独立原生产probe及移出对照：esbuild write:false加载实际application/公开服务，内存Vaultport、真实订阅事件、文件identity/字节与legacyProjection次数断言；输出见上。未写源码、测试或生成物。
3. 27路径/64来源始终核验、同scope摘要及前序联合33依赖字节核验，全部MATCH。

作者报告新增rename4项、相关旧事件/最终门2files8passed/124skipped、全test tsc、application lint及diffcheck exit0；本轮回读对应测试与最终停写回执。全局类型/其余旧回归未再次执行，未冒充由reviewer重跑。初审和r2所有原始报告、失败记录与勘误保留。

## 未验证与交接

/dev/shm的临时文件用例执行真实IO，但为tmpfs，不证明断电持久性；历史ENOSPC与超时原记录不改写、不把全部超时归因空间。独立内存端口证明指定事件/投影语义，不等同真实Vault宿主。

按SRC010与本轮授权，未运行真实用户迁移、真实Obsidian主窗/popout/原生buffer、实际平台、人工视觉/键盘焦点、性能或build，未写生成物。真实验收仍由用户执行；两个pass仅针对此固定代码/合同审查。未启动T22或跨改其他票。

结束复核后仅新增本r3原始报告并停写，交Lead核验正式回执。
