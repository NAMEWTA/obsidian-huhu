# T-19 repair-2 独立双轴审查原始报告（r3）

Reviewer: native:/root/review_archives
Mode: native
Implementers: native:/root/audit_archives（按 Lead TASK；真实派遣回执由 Lead 核验）
Review-Mode: working-tree
Base/Observed-HEAD: 265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa
Input-SHA256: f1101d7e0fdd024102a1cdf273b8a5a44072a28c85e422e1acc16dc1683207b4

本人未参与 T19、repair-1 或 repair-2 的实现、修复与测试编写，保持原生 gpt-6.1-sol / high 独立 reviewer 身份。唯一写入为本 r3 报告；未改源码、正式 Evidence/状态、Ticket/Map、旧输入/报告、生成物或 Git index，未再派遣 Agent。

## review-input

完整冻结对象：[T-19-review-input-r3.json](T-19-review-input-r3.json)。上述摘要为完整对象经 JSON.parse 再 JSON.stringify 的 UTF-8 SHA256，区别于 scope 内部摘要。

开始与结束核对：27 个 scope 文件、52 个来源原字节全部 MATCH。相对 r2 只有 contacts-presentation.tsx、ArchiveTypeDesigner.tsx、archive-forms.dom.test.tsx 三文件变化；新来源为原 r2 报告，其余规范/标准/前序代码未变化。

结束前重跑原 review-scope 的同一显式27路径，base_sha、observed_head、working_snapshot、index_sha256、tracked_diff_sha256 全部 MATCH。未用同一 HEAD 代替工作副本字节检查。

来源仍为已绑定 AGENTS/dev/ui及分支规则、原T19/Spec/ADR/完整Issue3、Map、SRC010、DESIGN revision2/PAGE001002、批准封板与前序T17/T18/T19审查证据。本轮不新增UI范围，不重开关系、迁移或完整树壳任务。

## standards-output

Reviewer: native:/root/review_archives
Axis: standards
Result: pass
Input-SHA256: f1101d7e0fdd024102a1cdf273b8a5a44072a28c85e422e1acc16dc1683207b4
Observed: r2唯一新增root/context问题已修复；editor epoch的额外状态边界经源码与定向执行确认，本轮未发现新的需修正问题。
Findings: []

- 原 S-r2-01：ContactsPresentation.renderContent 以完整 draftContext+root 同时给 ArchiveWorkspace 的 key 与 draftScope。真实settings.subscribe触发重新渲染后，A根旧Workspace会卸载，B拥有全新的dirty/busy/forms/formLoaded/错误/请求与离开确认局部状态；共享owner中按根保留的A草稿不清除。根恢复时只重新挂载对应scope，旧请求的组件active清理与旧state closure不会写入B组件。
- 通过真实ContactsPresentation类的DOM harness定向运行A→B→A：B两种类型操作可用，旧离开确认消失且原leave promise返回false；A返回恢复原标签草稿。该harness保留真实settings订阅、renderContent与React组件组合；原生宿主Component/App为测试夹具，不冒充真实Obsidian。
- 额外editor epoch：ArchiveTypeDesigner本地publication counter参与DesignEditor key；消费已完成结果时先仅清当前设计scope，再推进epoch并把真实result交父级。即使父级当前revision已经等于result，旧useArchiveDraft初始fallback也不能继续把F1设计带入下一轮编辑。计数本身不触发publish、不清其他scope。
- 独立DOM探针预置A的F1基准+待消费F2结果，在requestedSnapshot已是F2时挂载真实Designer。消费后owner/base与可见标签均为F2，自动命令调用次数0；另一个rootB草稿仍KEEP ROOT B。下一次显式发布使用F2/H2且只调用1次，没有退回F1。
- 作者新增真实工作台测试已回读：type/forms四组busy成功/失败、迟到forms请求成功/失败、无改动发布、后续新草稿、A/B返回均以明确barrier和实际scope断言；旧失败草稿/错误只留A，成功结果回A消费，不自动重放。失败分支没有推进epoch或清scope。

## specification-output

Reviewer: native:/root/review_archives
Axis: specification
Result: pass
Input-SHA256: f1101d7e0fdd024102a1cdf273b8a5a44072a28c85e422e1acc16dc1683207b4
Observed: r2新增A-r2-01闭合；原五项已闭合证据在未变输入上仍成立；当前T19代码分项未发现新的规范缺口。
Findings: []

- 原 A-r2-01：PAGE001/002与T19的上下文/草稿导航保证同时满足“B独立可操作”和“A草稿可继续”，不通过丢掉owner全部草稿来清除旧dirty。真实工作台入口已有根key，与原已正确按root加key的设置入口保持一致。
- 结果消费：schema/form修订、用户草稿与实际完成结果仍对应。成功F2在返回A后被消费为真实新基准，不把成功后的视图重置成F1，也不把新一轮草稿误当旧结果清掉；无改动发布不会产生永久dirty锁。
- 失败与并发：busy期间A离开、在B收到A成功/失败，不改B的定义和交互状态；回A保留实际成功结果或原草稿/错误。只有显式发布才发命令；没有自动补发或为了保留草稿而偷偷提交。

## 未变范围的闭合证据复用

r1原五项的core/settings/磁盘源码与r2相同，来源摘要也匹配，故复用r2实际核验与原始生产反例，不无差别重跑：

1. staged新修订proof覆盖字节/hash/identity/stat/代次/原生叶与最终current门；首次/已有current都在失败前保留旧pointer，提交后未知有committed-unverified实际revision回执。
2. person/company创建在实际共享create队列与最终Vault.create核验form；旧模板排队变化后拒绝，无实体写入，仍用v1 codec。
3. 条件树校验与求值使用同一闭集op，非法节点发布前拒绝，不运行脚本。
4. 模块owner经真正CategoryContent/ModuleSettings卸载重挂保持草稿、root隔离、显式discard、dispose迟到set门；本轮扩展到workbench根局部状态。
5. 重复ID精确path只读浏览，唯一后才beginEdit，未放宽身份写门。

T17/T18的schema proof、字段级三方合并、草稿/complete、原生buffer/多叶/ABA最终同步门和null/YAML保真代码未改，未发现本轮状态修复撤回这些边界。所有codec、模板仅create、隐藏值保留、module入口/i18n和懒加载的前序结论依旧有效。

## 本轮实际执行与原始结果

执行命令：`pnpm exec vitest run --project dom src/modules/archives/ui/archive-forms.dom.test.tsx -t 'isolates dirty locks|consumes an unchanged publication'`。

```text
Test Files  1 passed (1)
Tests       2 passed | 18 skipped (20)
```

这是定向选中了真实工作台root隔离与无改动发布两项，其余18项未运行；不把过滤跳过记成20项通过。

另以Node/esbuild write:false内存bundle + happy-dom/Testing Library操作当前生产Designer与真实ArchiveDraftOwner，在待消费F2与已加载F2同revision的特定接缝核验：

```text
EPOCH restored result F2 visible F2 ACTUAL F2 LABEL automatic publish calls 0 other scope KEEP ROOT B
EPOCH next explicit publication base F2 H2 calls 1
base_sha MATCH
observed_head MATCH
working_snapshot MATCH
index_sha256 MATCH
tracked_diff_sha256 MATCH
byte check 27 52 MATCH
```

该探针对命令使用记录请求的接口夹具，证明UI实际使用的基准和调用次数；底层发布磁盘行为沿用未变r2证据。没有新增源码或测试文件。

## 未验证与全局检查边界

作者报告真实ContactsPresentation入口DOM20tests、限定档案tsc、2生产lint/diffcheck通过；本人未重复整套，只实际执行上述2项与独立epoch探针。全testtsc最后未通过，Lead说明exit126仅含T05活动测试的5处签名/implicit-any诊断，已归browser处理；本报告不把全仓类型检查记作通过，也不跨域修复或代跑。

真实Obsidian/多窗口平台、人工视觉、性能均依SRC010由用户执行，本轮禁止且未运行；DOM测试不证明宿主、布局、明暗、390/1440或性能验收。build/共享生成物仍归Lead/T32。

结论只针对r3固定T19代码范围：standards=pass，specification=pass。原r1/r2报告保持；不宣称全仓检查绿色、用户实机验收完成或整个change完成。后续源码、规范或依赖字节变化需Lead重新确认本报告适用性。完成本报告后停写交回。
