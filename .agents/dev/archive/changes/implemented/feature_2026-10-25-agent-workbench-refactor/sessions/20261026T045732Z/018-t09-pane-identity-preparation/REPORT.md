# 任务回报

Session: 20261026T045732Z
Task: 018-t09-pane-identity-preparation
Status: completed

## 聚焦交接

推荐采用 **新显示用短opaque ID，旧合法叶使用无写入的确定性兼容身份；兼容身份只存在于读描述投影，首次显式布局编辑才物化到原布局元数据**。所有Space的Pane读写统一经过现有SpaceWorkspaceStore草稿owner，最终仍由SpaceService原writer/JsonStore保存，不建立Pane数据库、第二writer或全库初始化写入。

这修订012及Root草稿中“旧缺ID先在load取得writer、补齐flush后再公布”的倾向：当前load/getControlScope明确只读，不能为了pane.list改成自动取得租约。也不能把虚拟ID先塞进clean draft.view——本次调用真实merge确认，这会让远端close凭空产生本地冲突。下面给出一套可实施合同，不留给用户选择工程方案；仍是准备建议，未写T09生产代码、未开启T09或推进任何状态。

### 1. 当前真实落点与探针结论

- `SpaceService.ts:115–140`直接读取记录并publish；`getControlScope:293–326`只检查scope/现有lease，`mutate:214–264`才调用 `owners.acquire(vault, instance)`、创建受保护JsonStore并commit。租约是当前Vault/device业务文件的原单writer，不是另造每Space租约。
- `workspace-store.ts:87–101,167–194`已有按Space保存的 `{base,view,dirty,pending,conflict,remote}`，当前UI只暴露选中Space的store；未选中Space也可能有在途/失败dirty草稿。`SpaceService.updateLayout:505–509`直接操作records布局，不知道该草稿。
- `ops.ts:241–257,304–347`目前会剥掉未声明的paneId；`records.ts:101–103`只验证嵌入WorkspaceState基本形状，实验确认可容纳可选元数据，不需要为此改外层version2/WorkspaceState version1。
- `closeTab:137–145`把完整tab保存在closedTabs，`WorkspaceService.reopen:2058–2069`直接open原payload；若仅新增字段而不改reopen，旧ID会复活。
- 当前实际controller已经传入 `createSpaceWorkspaceStore(spaces,...)`；新端口可由这一原owner提供，不需要为身份/草稿另改controller装配。真正pane.focus的显示回执仍另循原foreground路径，committed不是consumed。

两份有限探针均正常import/打包执行上述生产导出，使用内存TextStorage与受控目录/租约/时钟端口，不复制生产merge或保存实现：

| 实际观察 | 对推荐的约束 |
| --- | --- |
| load→getControlScope→store.ready→两次normalize→clean flush：acquire=0、write=0 | list不应要求首个writer，更不能靠select另一个Space来查询它 |
| fixture加入静态paneId后，records验证通过、normalize丢字段 | 必须在ResumeInfo与normalizer保留已显式保存的有效ID；不靠外层格式迁移 |
| 用投影view充当merge baseline，新增字段被远端缺字段覆盖；raw base + 显式编辑value保留字段 | 首次物化的base必须是原持久基线，不能把尚未保存的投影冒作disk事实 |
| raw base + 仅虚拟ID的“clean local”与远端close合并，抛DocumentConflict；未加入虚拟字段则正常采用close | read描述不能写进clean draft.view，也不能凭query使draft dirty |
| A dirty rename→切B→A自动保存EIO→直接updateLayout(A,close)成功落盘；cached A仍有旧Pane/标题，flush冲突 | 不能给新CLI直接复用records.layouts/updateLayout旁路；必须先协调同一A草稿 |
| closeTab后openTab原closed payload仍带同一fixture ID | reopen必须克隆并分配新ID，closedTabs不能进入活动ID索引 |

这些是现有实现/错误接法的观察，**不是新Pane算法或CLI已经实施的通过证据**。fixture中的固定字符串只用于检验原normalizer/merge行为。

### 2. 兼容身份：具体编码、边界与生命周期

新字段仍放 `ResumeInfo.paneId?: string`；内部LayoutNode.session/runtime叶key继续服务原TerminalView，不重写终端树或输入/尺寸owner。新Pane默认由服务的有界allocator分配 `pn1.<UUID>`（约40 ASCII字符）；UUID只是生成方式，不成为公共输入格式要求，已经存在的非空有界opaque字符串也接受。不要把随机分配放进通用metadata()、normalize、render或query。

旧Pane缺字段时，纯描述helper使用完整持久四元组：

```text
T = [kind, owningSpaceId, persistedTabId, persistedLeafKey]
kind = "space"；shared布局使用不同kind="shared"且Space位为空
bytes = UTF8(JSON.stringify(T))
legacyPaneId = "lp1." + base64url(bytes)   // canonical、无padding
```

- owningSpaceId来自布局owner的key，绝不使用当前选中Space、cwd、标题或焦点。tab必须原键与tab.id一致；leafKey必须来自原持久paneLayout可达叶，且在该tab中唯一。不是把Session ID当Pane ID：Space+Tab+原叶引用标识显示位置，持久Session/runtime只是可变引用。整Tab移动到别组不改变材料；不存在的跨Tab Pane移动不新增。
- 这个ID只在当前已认证Vault/device/instance scope内解释；跨Space材料包含不同Space key。跨Vault/复制目录继续由原ControlScope/物理绑定拒绝，ID不是凭据。不能解码请求ID后直接信任其中Space或runtime，仍查当前活动引用。
- 使用JSON固定数组、原字符串大小写/Unicode和canonical base64url，不做Unicode归一、大小写折叠、截断、排列编号或哈希。JSON会转义控制字符及孤立代理项，UTF8/base64可逆；因此两个合格四元组不会因编码碰撞。路径变化、组顺序与当前runtime值都不是重算已物化ID的依据。
- 长度：prefix为4，n字节的无padding base64url长度为 `4*floor(n/3)+(n%3 ? n%3+1 : 0)`。因此 **n≤3069时完整ID≤4096字符/ASCII字节；n=3070必须拒绝**。编码前先检查四个字符串总UTF-16长度≤3069，再生成有界JSON/UTF8并检查n，避免坏数据先分配巨量编码。超过上限返回CAPACITY_EXCEEDED/identity-unaddressable，不裁切、不用弱哈希替代。
- 合成的 `restored-${id}`、normalize修补出的不存在原叶、重复原叶key、缺少/不一致tab身份都不能宣称有稳定兼容ID；返回有界诊断，保留用户布局/人工显示，不清空整图。显式paneId字段存在但非法时也不能悄悄按“缺字段”生成兼容别名。
- 对不可兼容的超长/非法身份，明确的原Session attach或已有GUI显示编辑可在**原owner获准的mutation**中，凭完整原显示/Session引用建立短新ID；没有可靠Session/原叶引用则准确拒绝，不猜cwd或调用者焦点。query只报告原因和可行入口，不触发此准入。
- 有效显式ID原样保留，包括非UUID及看似lp1的字符串。全Vault活动解析若同一ID对应两个不同引用，必须TARGET_AMBIGUOUS；不能因为默认Space、扫描顺序或额外hint就任选。索引取每Space唯一有效来源（cached draft覆盖records，不把两者重复计数），排除closedTabs。未能在预算内完成唯一性核对时返回capacity/timeout，不能冒称not-found或unique。使用Map/精确字符串匹配，包含`__proto__`等字符串也不进入对象原型查找。

| 阶段 | 唯一推荐的事实流 |
| --- | --- |
| load | SpaceService读取原records；不补ID、不取新lease、不改变磁盘 |
| normalize | 纯同步清理结构并保留有效显式paneId；缺字段仍缺，不能产生随机/虚拟字段写入clean view |
| readOnly list | 从同一owner取得当前真实view，临时派生上面的兼容描述；无缓存Space只临时normalize/描述，不创建draftMap条目，不flush/mark dirty、不调用Pane allocator |
| first mutation | 先协调原Space的pending/conflict，再捕获最新真实view；获准后把**相同lp1值**物化到保留的旧叶元数据，之后才做布局/恢复变换；raw base保持原磁盘基线 |
| flush/merge | candidate中ID是本次真实编辑的一部分；走原SpaceService.saveLayout/lease/JsonStore，不能用投影当base，不能跳过既有dirty编辑 |
| reload | 成功保存的paneId原样读取；未改动/未保存的旧布局继续派生同一完整四元组ID，不因进程重启或查询次数改变 |
| 同视图runtime替换 | **先物化/捕获旧显示ID，再替换leaf runtime key**，明确复制到新ResumeInfo；旧captured runtime代次仍失效，不跟随新代 |
| close/reopen | close移除活动引用并保存，不stop；closed payload可以保留历史信息但不被查询索引。reopen克隆每叶并分配新短ID，更新resume指针；不复用原ID/兼容别名。分配须避开活动ID与本次closed payload旧ID，坏allocator重复时有限失败 |

“首次mutation”包括有意义的GUI布局编辑、恢复/同视图runtime替换，绝不能只给CLI写字段。具体分配/承接点为terminalTab、新的split-existing、openManagedRecord新显示、restore、reopen，以及GUI rename/move/resize/focus/close的原layout admission。sync/reconcile/状态刷新仅保留已有字段，不额外mint ID；restore当前2027–2031重建metadata必须显式承接旧显示ID。若mutator在闭包外预先捕获旧tab，不能仅在private update内部补字段后又被该旧对象覆盖。现move是整Tab，保持tab.id，无需预增跨Tab移动能力。

### 3. 最小双端口与同Space保存顺序

在现有WorkspaceStore类型增加可选的原布局owner端口；只由 `createSpaceWorkspaceStore` 实现，旧v1 store/旧测试夹具没有端口时Pane能力明确不可用，不偷偷落到旧writer。名字可随项目惯例，语义固定：

**readLayout(spaceKey)**（等待既有ready后纯读取）：

1. 有cached draft就以draft.view为布局真值，带dirty/saving/conflict与当前revision；不能读records旧值覆盖它。
2. 未缓存Space从当前records.layout取raw，做临时纯normalize与Pane描述；不调用ensureDraft，不分配随机ID，不扩大draftMap，不改变选中Space或创建lease。
3. 返回有界不可变读快照/描述；兼容ID是旁路描述字段，不塞入layout.view。非法/超长身份有诊断而非静默省略后声称完整。
4. Pane list/paging的revision要覆盖实际GUI草稿修改和remote采用，不能只复用ControlCommands当前records引用revision。最低可用owner内全局单调layout revision（不因query递增）；变化时旧cursor准确stale。查询派发的原ControlPaging临时cursor可用随机token，与禁止随机**Pane ID**是两回事。

**editLayout(spaceKey, capturedRef, transform, originalContext)**（显式mutation）：

1. 为被明确编辑的一个Space取得/创建原Draft，挂到该Space的编辑顺序；既有SpaceService仍是唯一跨Space磁盘队列。当前/非当前Space都用这条路，不能临时select去编辑，也不能直接set records.layouts。
2. 若该Space已有pending保存，先等待其真实结算；等待可以逻辑观察取消，取消的本次transform之后不再执行，原GUI保存仍由原owner收束。reconcile pending积存的remote；已有conflict则拒绝新编辑，保留双方数据/错误，不用“只读最新磁盘”避开冲突。其他Space不因这一操作新建draft。
3. 在最新view上复核原Pane/Space/tab引用与可选runtime代次、scope、signal及原deadline。此同步接纳前取消/超时是none；不能让稍后pending完成触发迟到编辑。定位split路径此时重算，不能按旧序号改邻居。
4. 接纳后一次性构造candidate：先物化需保留的兼容身份，保留已有本地dirty编辑，再执行transform，分配本次真正新叶的ID。UUID只分配一次，失败重试保留该已接纳草稿，不自动重发命令。
5. 沿现有GUI模型发布candidate到同一Draft，标dirty；若仍选中这个Space则在applying保护下同步发布当前store，否则只更新该Space草稿/owner revision，不切Space/抢焦点。此时仅内存布局已发生，不能报持久completed。
6. 只保存这个Space：截获 `{base: 原raw baseline, value: submitted candidate}` 调原saveLayout；保留在途期间更晚的GUI编辑，沿现有afterSubmit/rebase规则采用真实回执。需要 `flushLayout(key)`/等价局部save，不用全局flush让无关Space的冲突拖住本次请求；dispose仍严格flush全部。
7. saveLayout成功是持久化确认点，在执行后续view rebase前就记录persisted=true和提交版本/快照。若后续rebase发现真正冲突，保留已写事实与本地view，返回明确部分结果；不能把它当未写或清空本地。成功回执须带原Pane/Space以及实际已提交事实，当前view若被更晚用户动作改变也要准确说明版本。

现有save的pending/remote/afterSubmit逻辑已经处理大部分顺序，不重写通用threeWayMerge。需要的是让新Pane消费者进入这个owner，并把本次发布/写入确认与最终观察分开记录。

### 4. 取消、错误与effect边界

| 观察时点 | 本次操作必须怎样报告/收束 |
| --- | --- |
| 等待ready/原pending，尚未发布本次candidate | 取消/期限结束→none；本次不修改view、不产生新写；原有写可能继续，不冒称被取消 |
| candidate已发布，但尚能证明未提交任何写 | partial，layoutPublished=true、persisted=false；不能退回none |
| 保存已经交给原owner、未收到确认 | disk结果可能未知，准确unknown/EFFECT_UNKNOWN并保留layoutPublished与原tuple；停止观察不撤销/重试已接纳写，不声称取消任意OS调用 |
| saveLayout确认，owner已一致采用 | 布局变更completed；后来取消观察不抹去已知提交。若本动作还有焦点阶段，分别表达其结果 |
| 保存已确认但后续rebase/呈现失败 | partial且persisted=true/准确版本，保留冲突双方；不能因抛一般SpaceError被Router统一改成“未知磁盘结果” |
| 保存失败且不能证明primary未改变 | unknown、保留脏草稿/恢复信息；不重发或声称回滚 |

持久化在途取消后，本次save/merge promise仍归原owner，必须被观察并在关闭/排空时收束；不能留下无人消费的late continuation。ControlCommands薄adapter最好将owner结果完整返回，而不是在已确认保存后抛一般SpaceError；当前Router:269–271会把admitted PERSISTENCE_FAILED提升unknown。Pane操作不伪造输入专属receipt，不套T08的adapter-applied/pty-written确认规则。真正pane.focus还需等待原presentation请求consumed或明确partial，`commitPresentation:371`发布committed/1000ms并不证明DOM已聚焦。

## 产物与验证

证据根 `/tmp/huhu-t09-pane-identity-20261026T113128Z`。按Map30→既读未变dev规则→T09→GP029及Spec§3.1/3.3/3.5回读，复用012/013固定研究与适用保存/架构规则，不下载依赖、不开外部网页、无Provider或真实Vault。

- TASK SHA `a50750126019076f1f89a09a8aa196720ff867b55f17e9b32513ba4c8baac4dc`。
- 012 REPORT SHA `c6d87003fab9d7c824ae913ac00e5c2364a6452ccd3a61d4ac0b6550f35c3408`；013 REPORT SHA `083ebd64199d22942dfa7fc57ef84c46813323c88c72656f69a989498083f2ce`；combined Root audit SHA `ec26fa7eb1bbde94a6405656794b71e0f45d5198cf4230256e9920cf2f86239c`，均实际核对。
- source-before.json初始31来源；加实际编译闭包与router补读，共47个不同真实文件，含自身probe入口与外部Root草稿，source-after.json SHA `a61658f4dc839e1f401e7624760a52224bda8caaeaf96c5f5926408e06a4036a`。所有所读生产源无漂移，不宣称整库冻结，017 native七路径不属于本次观察范围。
- 唯一观察漂移是Root已通知的临时工程草稿追加焦点两段：`18f3755b2c1a5954b3406a33325bdfca5a05f0d2cc11b55b13c57d71a87aa6df`→`66427d5750df0474604fc8d2caaf5ce919db31c61057339996a6d50cac9977ef`；前后CAS与011补读保留，未修改草稿。

| 关键生产源 | SHA256 |
| --- | --- |
| core/workspace/model.ts | `a01440053e123ef09a85beb767732e5f3822b0084e25d0b1dfbd7a087757618a` |
| services/workspace-store.ts | `ea30593109d884895bd0dc63fef4a257ee1b72059862a6947a833e5cc66fc307` |
| services/workspace-service.ts | `4ac850819ab7454891471d625960e6fd600946a512c0973567d6cf5d95885070` |
| services/spaces/space-service.ts | `97b9a09a7a08ed6abbc783f8a6b1ec58eb4c7b370e16a1cc68e5040a95c55dd3` |
| services/spaces/records.ts | `a6ef4a9d57fa8c217150aa5a3fe95bb41f096717e692cece5f075223b7961b0d` |
| services/spaces/layout-merge.ts | `06baad04a1741894e8d5dec412fbdd284768391e944a0a727475dd7f87942af1` |

全部11个编号命令exit0：001–007/009/011为真实源/合同选读；008打包并执行生产store探针；010打包并执行纯merge反例。每项保存完整argv/cwd/UTC/exit/raw与31来源前后SHA/CAS。

- 008：23个真实esbuild输入，`probe-inputs.json`、`probe-metafile.json`与原字节CAS；bundle SHA `82dc22a7617d931e711e7a4a5844611c0a00e0531545e56735c2d4eeede2d4e1`。原stdout在probe.stdout.log，读写计数、EIO、旁路close、冲突与fake lease关闭均保留。
- 010：7个真实输入，overlay-inputs/metafile及CAS；bundle SHA `d00aeb0ab60b02172d35e3e24dce6e5a8e56312306662c9df482a58c1fc29522`，overlay.stdout.log明确DocumentConflict与raw采用close的差别。
- 子进程均使用实际绝对Node26.11.1及bundle路径，显式隔离HOME/USERPROFILE/TMPDIR和PATH，完整env/开始结束/exit0在probe-run.json与overlay-run.json。两个运行均完成，受控gate全部释放、真实生产dispose调用后fake lease close=1。自有runtime-home/runtime-tmp已删除，cleanup.json实际观察二者不存在；没删旧tmp。编译产物只是本任务tmp实验，不是插件build或T09产品实现。

未运行测试套件、插件构建/生成、真实Chrome/Obsidian/native helper/Provider，也不把本实验当T09验收。源与计划状态全只读；仅本REPORT及新tmp写入。

## 问题与下一步

### 最小写集与owner/API顺序建议

| 唯一owner | 最小必要路径/阶段 | 当前T09写集 |
| --- | --- | --- |
| Backend布局owner | `core/workspace/model.ts`、`ops.ts`及原tests；可新增同目录小 `pane-identity.ts`/tests容纳纯描述与编码/验证 | 已在core/workspace通配内 |
| 同Backend | **`services/workspace-store.ts`、`workspace-store-spaces.test.ts`**：read/edit局部端口、同Space pending/conflict协调、局部保存/版本、身份投影与首次物化 | **现write集遗漏，须Root精确增补**；不泛解锁所有services |
| 同Backend | `services/workspace-service.ts`与相关spaces/foreground tests：GUI与CLI都经原端口；ensureManagedPane:775及attach:1411的非当前Space updateLayout改走同owner；managed summary的非当前layout读取也统一 | 已在workspace-service*.ts范围；此处与UI/controller门面不按方法并行写 |
| Protocol/adapter | `services/control/commands.ts`/tests，必要paging revision接线；复用012的canonical/generated/CLI最小增补 | commands范围已有；canonical/CLI缺项沿012由Root先修票，不改本轮native七路径 |
| UI消费者 | 复用013建议的TerminalTabView等实际必要路径，以原服务的Pane描述/Ref显示/捕获，不在render创建ID | TerminalTabView仍为已知缺项；焦点展示由真实原消费入口完成 |
| Root | 正式合同/精确路径、根产物与统一验收 | 不在本准备实现 |

**当前无需为这套身份/草稿接缝修改** `SpaceService.ts`、`records.ts`、`layout-merge.ts`、共享three-way-merge、controller工厂、core/terminal/layout、TerminalView或Host/helper：优先复用其既有API/算法。saveLayout Promise成功后即可在原store保存阶段记录确认，不需要另建持久提交owner。若后续真实红例要求窄改上述源，再由Root补精确路径；不预设Root草稿所有候选都必写。

实施顺序建议：Root固定本报告的身份/读写/effect约束并补workspace-store两路径→Backend先冻结真实readLayout/editLayout/PaneRef端口及生命周期回归→Protocol薄接线与有界列表/cursor→UI消费真实接口。新availability必须等整条消费者闭合。i18n、Controller门面与根构建仍指定唯一writer，不让Protocol/UI各自造草稿或Pane DTO。

### 最能击穿错误方案的后续测试（本次未执行）

1. 旧合法布局首次load/list，多次query、allSpaces读取、reload：Pane ID相同，Pane allocator/lease acquire/write/dirty为0；未缓存Space不进入draftMap；无Space/default hint错误不通过select造writer。分页cursor的临时RNG与Pane allocator分开观察。
2. 编码：不同Space相同tab/leaf、分组重排、标题/cwd/焦点变化、Unicode/控制符/孤立代理项、3069/3070字节边界、超长原key；完整字段不截断。同ID对应两活动引用、显式伪造lp1 ID、任意非UUID与`__proto__`必须精确处理；closedTabs不计活动重复。
3. first mutation从raw base物化再flush/reload，ID不变；只读描述不改变clean draft，所以远端close正常采用，不产生synthetic-ID DocumentConflict。两实例首次合法物化生成同lp1，不因随机ID互相冲突；真实并发冲突不吞掉。
4. 首次GUI rename/resize/group move、恢复及同视图runtime替换：旧兼容ID先承接，新runtime叶key改变而Pane ID不变；原runtime capture失效。新pane/重复attach/reopen：同Session去重保持、只真实新显示分配ID、旧ID不复活；不新增跨Tab移动或多input owner。
5. 非当前A dirty→切B，原A pending/EIO与CLI resize/close/attach三序列；先协调原draft，再编辑，不能复现本探针“disk close成功、UI还旧Pane”。同字段冲突在发布前拒绝且保留双方；不同Space操作不会因全局flush被无关冲突阻塞。
6. 初始deadline/abort保持原pending不resolve：本次及时none，释放等待后零迟到transform。分别在candidate已发布、写未确认、确认后rebase失败处取消/断线，检查partial/unknown/completed与persisted事实，不回滚/重发/新租约。所有晚到save由原owner收束。
7. GUI更晚编辑发生于提交在途：afterSubmit只重放真正后续编辑，不覆盖已确认ID/关闭事实；Pane capture后close/reopen/换代不命中新对象。list revision覆盖dirty view，旧cursorstale，不能只盯records版本。
8. pane.focus的committed与原DOM consumed分开；失败窗口/leaf/替换请求准确partial；真实CLI与生产GUI同布局回读由后续T09统一验收，不能用本tmp探针或原型替代。

准备工作已完成；Root可据此定案和更新T09派单，仍须等T08关闭。正式源、旧授权和旧REPORT均保持只读。报告原子写入后执行return结构校验，输出单独交Root。

READ ONLY — SOURCE STOPPED
