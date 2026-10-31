# T-20 独立双轴审查原始报告

Reviewer: native:/root/review_archives
Mode: native
Implementers: native:/root/audit_archives（按 Lead TASK；真实派遣与返回回执由 Lead 核验）
Review-Mode: working-tree
Base/Observed-HEAD: 265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa
Input-SHA256: 62ed8e4bf5c1517ecd33f26a0d09230562c5ea4e35eb7f60a7644435d9254eee

本人未参与 T20 实现、修复或测试编写，沿用原生 gpt-6.1-sol / high 独立 reviewer 身份。未递归派遣；唯一写入为本报告，未修改源码、正式 Evidence/状态、Ticket/Map、旧输入/报告、生成物或 Git index。

## review-input

完整冻结对象：[T-20-review-input.json](T-20-review-input.json)。Input-SHA256 是完整对象经 JSON.parse 再 JSON.stringify 后的 UTF-8 SHA256，区别于 scope.input_sha256。

开始与结束核对：24 个实际 scope 路径及 56 个来源原字节全部 MATCH。按 T17r2、T18r2、T19r3 联合快照比较，这24个路径均为新增或变化；联合前序剩余25个依赖文件原字节仍 MATCH。实际读源码追踪了 api → archiveServices → ArchiveRepository/RelationRepository → ContactsFiles/Vault 端口/DocumentMutationCoordinator，以及 module → ContactsHost → ContactsPresentation/RecordDetail → ArchiveWorkspace → ArchiveEntityForm/ArchiveRelations/RelationTypeDesigner 与模块草稿 owner。

结束前以同一显式24路径重跑 review-scope；base_sha、observed_head、working_snapshot、index_sha256、tracked_diff_sha256 全部 MATCH。未用共同 HEAD 代替完整工作副本检查。

来源发现：本轮是 working-tree，未虚构新增 commit/远程 PR；规范来自冻结 T20、Spec、ADR、完整 Issue3、SRC010、tickets-map、既有 docs/contacts 与设计资料。标准来自 AGENTS、dev/ui、架构/宿主/测试/UI 参考、项目 lint/type/test 配置，以及 code-review 的 working-tree/source-discovery/Fowler/risk/reviewer-contracts/review-evidence/result-reuse 与错误/测试可靠性规则。所用来源均在固定输入中；无缺失规范轴。DESIGN revision2、digest f04a5aabaa7a57dbdaa17cb89ae611d40a7c32fe948317ac641818bd38224b9c、PAGE-001 与本票 AC-021 为设计依据；未进行人工视觉验收。

## standards-output

Reviewer: native:/root/review_archives
Axis: standards
Result: request-changes
Input-SHA256: 62ed8e4bf5c1517ecd33f26a0d09230562c5ea4e35eb7f60a7644435d9254eee
Observed: 已确认1项P1、2项P2。正常服务与界面链路存在，但扫描前置条件、界面读取代次与实际字段补丁有可达缺陷。

### S-20-01 · P1 · 关系扫描开始后到 prepare 采样前的新增文件可绕过最终约束门

- 位置：`src/modules/archives/core/relation-store.ts:49`、`:54`、`:93`、`:159`、`:168`；最终门 `:34`，删除消费者 `:193`/`:198`。
- 实际行为：scan 只遍历一次 getMarkdownFiles 返回的列表，返回时仅 guard(root)，没有保存并核验扫描开始的 inventory/generation。prepare 在 scan 已完成后重新采样 generation，capture 又以当时的 inventory 为基准。因此扫描途中新增的关系文件可以既不进入 state.relations/ids/operations，也不触发后续 generation/inventory 拒绝。所有已读取文件的 proof 正确并不能证明没有漏读新文件。
- 独立生产反例：用实际 ContactsApplication、公开 archiveServices 和内存 ContactsFiles 发布 sourceMax=1、scope=current 的类型；先取得一条 external 关系合法原文并从夹具移除。create(candidate，另一个 target) 的 ensureType 扫描正常结束；在随后队列内 scan 读取该类型 current pointer 时，插入 external 文件并调用 app.archives.invalidate()，模拟 Vault create 事件。候选提交仍成功。最终公共 query 返回 external 与 candidate 两条关系，二者均 readOnly=true，出现基数诊断。输出为 `injected during queue scan 2 / RACE accepted candidate / QUERY external:true,candidate:true`。
- 风险：本地已到达且已发事件的独立事实未参与检查，基数/重复/环与唯一身份门可能被绕过。deletion 同样在 scan 后以新基准 capture，源代码上也存在漏掉新 restrict 引用的窗口；该删除分支未另行运行生产反例，不把它写成已实证删除。
- 依据：dev 持久化/生命周期与不可读事实不得当空值；风险审查的并发、事务与数据安全；Issue3 单文件保存前置校验及外部事件 generation/version 保护（约421–449行）；T20 非法端点、基数冲突和部分失败不得伪成功。
- 满足条件：把完整扫描事实与其开始代次/文件 inventory 绑定，扫描结束及最终同步提交都校验同一基准；或者在漂移后重扫并重新执行全部语义校验，不能在旧扫描之后采样新代次作为证明。create/update/delete 的共用路径应覆盖扫描中途新增关系、重复ID/operationId、基数/环和 restrict context 引用；确认拒绝时磁盘没有新增候选或删除实体。

### S-20-02 · P2 · 同一挂载内较早关系读取可覆盖较新的关系与诊断

- 位置：`src/modules/archives/ui/ArchiveRelations.tsx:41`–`:45`（主要赋值行`:43`）。
- 实际行为：每次 query.subscribe 都可并发执行 load；active 只阻止卸载后的 setState，不能区分同一组件中的多个请求。旧读晚完成后同时覆盖 snapshot/types/entities/archiveTypes/readError。
- 独立生产组件 DOM 反例：挂载真实 ArchiveRelations/TestProviders，公开服务夹具将首次 relations 读取停在 barrier。触发订阅并让第二次返回包含 `role: LATEST` 的新关系，确认界面已显示；再释放首次旧的空快照。界面随后显示 `No independent relations yet.`，LATEST 消失，无后续事件可纠正。输出 `STALE after latest true / STALE after old false No independent relations yet.`。这不是未挂载、选择器失败或真实宿主探针。
- 风险：用户看到已经过期的两端关系/完整性诊断或可编辑状态；晚到错误同样可覆盖较新的成功。核心提交校验仍在，故未声称它单独能越过写入门。
- 依据：dev 生命周期/状态归属；Issue3 迟到事件的 generation/version 保护与已提交变更更新UI；既有 T19 对读请求失效控制的保证。
- 满足条件：为同一 effect 中的每次 load 分配递增请求代次，只有当前最新请求可提交成功、失败和读取状态；卸载和 entity/root 切换仍失效。用明确 barrier 覆盖旧成功晚于新成功、旧失败晚于新成功，及反向端关系/诊断更新。

### S-20-03 · P2 · 关系表单把未修改的 metadata 当修改提交，阻止不同字段合并

- 位置：`src/modules/archives/ui/ArchiveRelations.tsx:49`、`:54`；冲突消费点 `src/modules/archives/core/relation-markdown.ts:49`–`:52`。
- 实际行为：edit 把 contextRefs/status/from/to 初始化为基准值；save 每次都把这四组值写进 changes，即使用户只修改某个属性。核心正确把“提交的 status 与外部新值不同”视为同字段冲突，但 UI 没有表达该字段实际上未改。
- 独立真实组件+核心反例：实际 ContactsApplication/公开服务创建 role=Before、status=current 的关系；在真实 ArchiveRelations 打开编辑。另一端通过公开 updateRelation 只把 status 改为 past；当前表单只把 Role 改为 USER ROLE，再点 Mark complete。界面提示同字段冲突，磁盘保持 past/Before，角色草稿保留，未得到应允许的 past/USER ROLE。该 DOM 探针观察到目标结果，但初版探针有 React act 警告和展示等待，不把它计作绿色 Vitest 回归。
- 无定时器的生产补丁对照进一步确认：相同 base/current，传 UI 的完整 metadata changes 得到 `conflict status`；只传实际修改的 values 得到 `past USER ROLE`。因此拒绝源于 UI 的补丁表达，不是核心不支持三方合并。
- 依据：dev 数据保真/公共契约双方一致；Spec 保存不同字段可合并、同字段冲突保留草稿；Issue3 约421–432行单文件实体或关系更新仅合并互不冲突字段。
- 满足条件：关系编辑跟踪各 metadata 的实际变更，只提交用户改动的键；或由表单在提交前与不可变基准比较构造最小 changes。清空日期/context 仍需明确表达；未改字段应保留并发新值。覆盖“另一端改状态/日期/context、本端改属性”合并以及真正同字段冲突保留原草稿的负例。

## specification-output

Reviewer: native:/root/review_archives
Axis: specification
Result: request-changes
Input-SHA256: 62ed8e4bf5c1517ecd33f26a0d09230562c5ea4e35eb7f60a7644435d9254eee
Observed: 完整AC-021与原关系条款未因拆票缩减；本轮确认以下3项不满足，详见同编号独立反例。

### A-20-01 · P1 · AC-021 的基数与最终提交保证存在窗口

位置同 S-20-01。T20要求新增/编辑/归档关系遵守单份真源、端点/基数/图约束与失败负例；Issue3允许跨设备最终到达冲突诊断，但本反例中的文件已在本次本地提交前到达并触发 invalidation。不能把本地漏读已知文件解释为跨设备强一致不保证。满足条件同 S-20-01，且包括删除/context 影响的共用门。

### A-20-02 · P2 · 双向展示可被过期空结果或旧诊断覆盖

位置同 S-20-02。AC-021、Issue3单份事实两端同步显示和迟到读取失效要求不满足。实际组件已显示新事实后退回空列表；未声称磁盘事实丢失。满足条件同 S-20-02。

### A-20-03 · P2 · 实际编辑入口未保持关系字段三方合并语义

位置同 S-20-03。Spec保存合同与Issue3实体/关系更新合同要求互不冲突字段可合并。角色属性与当前/曾任状态是不同业务字段；用户未修改状态却被旧表单值强行加入补丁，不能把它当作真正同字段冲突。满足条件同 S-20-03。

## 已确认的实现与范围边界

- 公开 api/catalog/query/commands 由实际 module 注册的 archiveServices 接到同一 ArchiveRepository/RelationRepository、Vault port 与串行写队列。关系文件位于可见的“关联记录”，定义位于可见“档案定义/关系”；两端与 context 由索引投影同一文件，不写第二份实体镜像。快照 structuredClone，不暴露可写 Map。
- 定义发布校验稳定ID、字段codec、端点类型、方向/对称约束、两端基数、草稿计数、重复维度、context角色、删除政策与特定类型环限制。不可变修订内容hash/路径、staged字节/file/stat/native proof和新current排他创建均存在；partial revision可用相同内容续跑。未声称已支持关系类型定义分叉编辑。
- 新独立关系可以连接唯一有效v1个人/企业与自定义v2项目。Issue3约642行明确允许无迁移来源的新独立关系引用合法v1/v2；它只写新owner。旧inline编辑迁移gate与稳定迁移映射仍属T21，本轮未新增该旁路，也未要求把新独立关系的合法v1端点强制迁移。T23树壳、T30图及真实用户迁移未纳入本票执行。
- 关系ID与operationId在创建请求中预分配；相同完整请求已写入但返回失败后，公开create可返回replayed，改变请求或重复身份拒绝。读失败/未来格式/损坏/重复关系保留diagnostics与原文，不以缺件作零条；端点/context不唯一、只读或类型不符拒绝，外部删除后的事实可留在只读诊断中。删除restrict/retain进入实际legacy deletion/remove最终门，但扫描中途新增引用仍受S-20-01影响。
- 月/日有效期、历史/当前、角色/context重复维度、对称/有向投影、期间交集基数与特定类型环检查代码均存在。普通关系不会一律禁环。字段使用既有codec，金额/decimal保留字符串精度、false/null不过滤，Markdown区域与未知YAML/评论/BOM/CRLF/自由正文通过补丁而非整篇重写；golden覆盖精确金额、前导零、false、月/日与正文。
- RecordDetail 的 Independent relations 按钮调用实际 ContactsPresentation.openGeneric(record.path)，进入同一 ArchiveWorkspace、ArchiveEntityForm、ArchiveRelations与host.drafts；不是另建一个仅测试入口。RelationTypeDesigner提供所有本票约束的无代码控件和发布预览，已接实体新建/编辑/归档与反向展示。
- T19的draftContext+root React key仍在，模块owner按root/entity保存关系/定义草稿、busy与错误。源码及作者新增barrier用例覆盖A→B→A成功/失败、迟到完成不污染B、不自动重播和dispose迟到set门。关系编辑已接dirty/busy聚合，但仍需修复本报告同一挂载内的迟到读取与补丁表达。
- T17/T18的v1/future拒写、实体schema proof、null/YAML补丁与最终原生叶保护依赖原字节未变；T20提取共享字段补丁后仍通过同一实体identity校验。关系create/update/deletion使用最终captureEditors和root/active/file identity/stat/generation检查；S-20-01指出其扫描基准缺口，未把已有原生叶门误报为缺失。

## 本轮实际执行与证据限制

1. 完整输入canonical SHA与24路径/56来源始终字节检查；前序联合依赖25路径检查；同显式scope重跑，全部MATCH。
2. 独立生产核心注入反例：扫描中途新增关系并invalidate，候选错误接受，最终两条readOnly（S-20-01）。esbuild write:false内存加载，未改源码/测试/生成物。
3. 独立生产组件DOM barrier反例：新关系成功显示后，被迟到旧空快照覆盖（S-20-02）。首次探针因未补Obsidian createDiv夹具初始化失败，补齐与项目dom-setup等价的DOM扩展后获得上述目标结果；初始化失败未作为产品finding。
4. 独立真实组件+核心不同字段编辑反例及无定时器生产patch对照（S-20-03）。React act警告/初版展示等待的限制已明确，核心对照无这些依赖。
5. 定向现有生产入口正常回归：`pnpm exec vitest run --project dom src/modules/archives/ui/archive-forms.dom.test.tsx -t 'the real workspace relation dialog|the real legacy detail entry'`，exit0，1文件通过，2 passed / 26 skipped（总28）。实际覆盖从反向端编辑并归档同一事实、v1原文字节未改，以及旧RecordDetail实际入口与根切换草稿隔离。未声称本人运行完整28项。

作者报告14files227tests、最后生命周期35与完整DOM28、限定档案tsc、19生产lint、architecture1258/i18n5192通过；本轮回读相关测试与配置，未无差别重跑这些有效检查，不以作者绿色替代上述语义审查。未新跑全局类型/全量测试，未对其他活跃票作全局通过断言。

按SRC010与Lead授权，未运行真实Obsidian主窗/popout/原生buffer、实际平台、人工视觉/键盘焦点、性能规模或构建。DOM/内存Vault夹具只证明相应组件与核心行为，不等同真实宿主。真实验收仍待用户执行；本次两个request-changes结论来自已确认的代码问题，不来自这些约定未运行项。

最终处置：保留原输入和所有旧报告；仅新写本报告。完成始终核验后停写，交Lead安排原作者修复和新冻结复审。
