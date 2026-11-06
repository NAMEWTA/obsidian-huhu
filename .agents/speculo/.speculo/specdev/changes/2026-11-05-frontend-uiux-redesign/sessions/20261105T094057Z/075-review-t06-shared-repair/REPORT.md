# 任务回报

Session: 20261105T094057Z
Task: 075-review-t06-shared-repair
Status: completed

## 聚焦交接

Reviewer：native:/root/review_toolchain，原069 gpt-6.1-sol high独立审查者；未参与074/Root修复，未委派。**standards：request-changes；specification：request-changes。** 069的S01、S03、S04、S05在本次有界源码/定向行为范围关闭；S02就地编辑已修复，但真实恢复草稿仍有一个原问题残留。另确认一个Root关闭去重的新回归；共两项P2，均有生产路径反例和正控制，不是推测新功能。

**明确释放本次40项档案、8项Root及复用的12项共享输入冻结，供各owner继续修复。** 首尾原字节、模式核对无漂移。仓库只写本不可变REPORT，其余仅在/tmp/huhu-t06-shared-repair-review；未改源码、配置、资产、依赖、Git/index、正式状态或Evidence。原069和074报告不变。没有把本次源码审查或DOM通过写成T06/T05/NOTICE/宿主最终验收通过。

## 产物与验证

### 固定输入与复用

Review mode: source-files；Risk: high；Independence: required；Strategy: independent。真实派遣为075 TASK及Lead消息；dispatch结构校验不替代身份/授权。标准来源沿用AGENTS、dev、新ui及公共review/risk规则；规范来源为当前Map23/Goal/Spec、T05/T06/T07/T16适用条款、批准DESIGN3/UI-002。本次复用069中未变的全字段、Tree、MonthField、strictCalendar、架构/领域边界等证据；只扩大到实际改变的端口、生命周期与恢复风险。

074清单/tmp/huhu-t06-repair/frozen-manifest.json SHA256 **9a1e70c55271d567357aafc086629f25257bc39a6ccfd41f471508fac1899e12**，40项与frozen副本和工作区逐字、模式匹配。实际起点startpoint-manifest.json SHA256 **585a0ce1d906f7c3b95f673aa445c2bb5f738333950d69cf1344512961d878e8**；原35项与069释放候选比对，变更5、新增5、未变30、删除0。5项改变为ArchivePage、FieldRenderer、RecordEditor、RelationPanel、T06/index.mjs；5项新测为offset-draft、discard-lifetime、editor-reload、entity-picker、relation-session DOM。其余35候选保留原证据，不重新把全部既有Git脏状态当本次变更。

Root清单/tmp/huhu-shared-review-repair/frozen-manifest.json SHA256 **2b015ea4a85b2cb6ed4ff79b8d25fc20ced4cfb7cb7e0eb35b6461faab0baf27**，8项逐字、模式匹配frozen副本：DateField、DateTimeField及测试；workbench-host、workbench-pages及测试；third-party-notices及新测试。相较真实before/为修改7、新增1、删除0；没有使用假Git固定点。其余069的12项共享源/测试逐项SHA未变并保存reused-shared-manifest.json。

自己的48项快照candidate/、manifest.json SHA256 **8afa13f4c519c0d3edb56a520c793a7329b5969277101e6dc3356b43f6f05219**；全部18项变化的实际前后SHA与diff保存在changes.json/diffs/，changes清单SHA256 **27110746db28e42035a3878f6688f0543f609ad9bd6e440fc782f91badcc2928**。final-verification.json核对48+12输入无漂移；这不是全工作区clean或完整浏览器依赖图证明。T07/T16活跃的其它源码/词典不冻结、不归因本次修复。

已读074最终REPORT及实际红绿日志，不把作者声明当独立通过。十份权威文档私有保存authority/及清单（SHA256 **18dae31fac09251b8a3e042c736a6884747e9c934ced7e2d87e2b0f8c52b36c8**）。与069已存文档比较，DESIGN/UI-002字节完全不变；Map23新增共享reset/用户close/双Worker NOTICE分工，T06只换owner，T05补精确生产者路径。Goal风险表移除旧“降级主窗口/纯文本/按需分包”措辞，改为按T16现有批准合同定位真实图与Document问题、保持白名单/后端/单main/预算并保留未验收状态；没有据失败重选设计或增加领域能力。

### standards 输出

Reviewer: native:/root/review_toolchain
Result: request-changes
Findings: R01/P2, R02/P2

**R01/P2 — S02仍在真实恢复草稿时重新把未完成offset归入time。**

位置：src/modules/archives/ui/generic/FieldRenderer.tsx:253–264。新增parts state正确保住同一已挂载控件的编辑片段，但初始化与外部值解析仍只识别完整Z/±HH:mm。实际生产RecordEditor中把2026-11-01T01:30:05.120-04:00的偏移改成“+”，等待真实commands.drafts()保存，再卸载并用该真实FormSession恢复：存储值保持2026-11-01T01:30:05.120+，恢复后输入成为date=2026-11-01、time=01:30:05.120+、offset空串。只编辑offset却在恢复后改变未编辑time的分段，原S02没有完整关闭。这里没有声称整个raw字符串丢失或非法值被codec保存为有效记录。

证据：私有offset-recovery.dom.test.tsx/log，使用真实memoryArchives、Application、publish/create/beginEdit、RecordEditor与恢复草稿查询；未mock领域函数。实际OFFSET_RESTORE打印上述存储值和三个输入。原069就地“+”反例及两个完整编辑正控制现在均绿，说明新问题是相同已授权草稿的恢复边界，而非原修复完全无效。

满足条件：同一序列化草稿在初始化、恢复或外部reset时也保留可辨识的未完成偏移片段，至少本反例“+”不得再吞进时间；完整Z/正负偏移、秒/小数与raw字符串仍无损交原codec，非法值保持非法。不新增领域字段/持久schema、IANA推断或转换；增加真实保存草稿→恢复的回归，同时保留现有就地片段和合法外部reset正控制。

**R02/P2 — 没有可选canClose的页面，重复close提前完成，不再共享待完成清理。**

位置：src/shell/host/workbench-pages.ts:238–246。新close先查entries，找不到即Promise.resolve；而没有canClose的既有binding在第一次close中同步进入closeEntry并移除entries，然后才await实际surface.onClose。此时同key第二次close看不到entry，立即完成；它没有等待第一次清理/后续导航。调用方await第二次close会把仍未完成的页面清理当完成，破坏原关闭Promise语义。可选canClose不应成为正确去重的前提。

证据：私有close-lifetime.dom.test.tsx/log，经真实WorkbenchPages和NativeSurface，仅把surface.onClose外部生命周期port挂起。无guard反例为secondSettled=true、teardownFinished=false、samePromise=false；有async canClose的配对控制通过。同一两测试通过Vite load仅加载Root实际before/workbench-pages.ts的原字节，before两项均绿（close-before.log），确认这是此次entries/pending查询顺序的新回归。不是仅断言Promise对象相等的形式测试。

满足条件：同entry的待完成close在其entries已移除、onClose/后续导航尚未settle期间仍返回同一待完成结果；同时保留新修复的entry身份校验，同key替代页面不得合并到旧决策，旧finally不得删除新close登记。没有canClose、guard接受/veto、强制清理与同key替代四类控制都应保留。

**其余修复结论：**

- S01关闭：DateTimeField用draftRevision传DateField.draftResetKey，外部time-only/zone-only同日reset同时更新可见raw和通知；删除key重挂，实际同input/焦点/IME及clear控制通过。原私有两测试也通过；三字段/IANA成功值和caller validator未变。
- S03关闭：确认后固定旧session id，允许已授权旧draft port完成；晚到UI close/error仅对alive原session，父层取消按id清除。原port已调用→卸载→resolve反例现在不cancel，持续挂载正常cancel；关联实现使用对应检查，正常discard控制通过。没有把强制宿主关闭误称可取消。
- S04关闭：记录/关联的schema快照按session id保留，记录forms同时稳定；真实reload期间同DOM、dirty文本、焦点保留，loading和read-failed时禁用并在save函数本身阻止写入。诊断读取改为完整index.diagnostics，失败后重试仍保留input；真实自定义类型/关联控制通过。未改变领域hash、恢复格式或schema。
- S05关闭：真实offset=page*50/limit50/total分页，移除slice150；121个同名实体三页全部可达，每项完整path/ID消歧可见，最后Next禁用，selected pin仍可达。原069“单页必须52 options”不是唯一修复形式；保留原历史红材料，用被要求的可继续分页可达性证明关闭，没有提高硬限额。
- canClose新端口其余边界符合：只从用户close询问，pending决策veto不销毁；await前后核对alive/current entry，强制availability/dispose绕过询问且旧决策不作用于同key新页面；隐藏仅保留并通知visible。新旧测试覆盖已打开和打开失败、旧决策与替代页。R02仅为无guard时pending清理去重的明确残留，未据此否定已验证的veto/强制清理逻辑。
- NOTICE源修复符合：CLI默认buildMain仍用真实pluginBuildOptions与write:false/meta；统一buildDistributedGraphs显式包含main、官方高亮Worker及parse:true真实parser Worker；npm包枚举继续使用这三张实际输出input图，没有改成测试提供的假范围。独立测试真实构建两Worker，主图被测试stub不影响这条源级事实；这项测试绝不证明main/最终NOTICE资产通过。T09/T12旧消费者仍可能阻止真实CLI全图，最终check:notices/资产留给Root。
- T06 fixture只补Enter text/unmodifiedText、iframe层级与父文档命中断言，没有删280/312/日期键盘/双Document断言。未运行本次native；Root另报告普通动效320样本在精确宽度采样失败并正在定位，本文不宣称该fixture或正式66已经通过。

### specification 输出

Reviewer: native:/root/review_toolchain
Result: request-changes
Findings: V01/P2（R01）, V02/P2（R02）

- **V01：T06日期保真补充合同的恢复流程仍不完整。** 合同要求编辑偏移只替换相应原始部分，所有非法临时draft进入原错误/dirty/离开/恢复流程；R01的实际保存/恢复把仅编辑的“+”换入未编辑时间。S02不能仅凭就地编辑变绿关闭。它不要求新增领域数据模型，只要求现有草稿在新控件里保持该片段身份。
- **V02：原用户关闭完成语义与075同entry合并要求未完全保留。** R02证明可选端口缺席的既有页面重复close不等实际清理。Map23新增可选veto不能使原无guard调用的完成Promise退化。修复仍需维持当前已正确的同key新entry与强制清理隔离。

其余原069规范缺口在上述定向范围关闭；Map23实际写集、owner、批准设计和无领域schema变更方向成立。全宿主、像素/命中、最终资产和整体类型迁移仍未据此验收；未把未运行项记为not-applicable，也未修改设计去消除finding。

### 实际验证与限制

全部原始材料在/tmp/huhu-t06-shared-repair-review：

| 命令/检查 | 实际结果 |
| --- | --- |
| pnpm exec vitest run --project dom src/modules/archives/ui/generic | 0；8文件29测试；archives-dom.log，含074五个新增回归 |
| pnpm exec vitest run --project dom src/ui/components/huhu/date/DateTimeField.dom.test.tsx src/ui/components/huhu/date/DateField.dom.test.tsx src/shell/host/workbench-pages.dom.test.tsx | 0；实际只匹配2文件13测试（DateField这个精确测试路径不存在，未把它算入）；shared-dom.log |
| pnpm exec vitest run --project dom src/ui/components/huhu/date | 0；实际5文件32测试；date-family.log，覆盖实际日期族回归 |
| pnpm exec vitest run --config 私有vitest.config.mts（新增当前两个反例之前） | 0；原069四份代码原样复制，4文件8测试；original-counters.log。原S05单页数量断言不适用分页修复，用121条真实可达测试替代而未删除历史材料 |
| 同私有config，仅close-lifetime.dom.test.tsx | **126**；1失败/1配对控制通过；close-lifetime.log，对应R02 |
| --config 私有before-close.config.mts，仅同一close-lifetime.dom.test.tsx | 0；同两测试通过；close-before.log；只将实际Root before源经load返回，无共享写入/无替代业务函数 |
| 同私有config，仅offset-recovery.dom.test.tsx | **126**；1失败；offset-recovery.log，对应R01，真实草稿链 |
| node --test scripts/third-party-notices.test.mjs | 0；1测试；notices.log；真实两Worker构建，主图测试stub；不是check:notices通过 |
| pnpm exec tsc --skipLibCheck -p /tmp/huhu-shared-review-repair/tsconfig.json | 0；shared-types.log为空；指定共享/host图，不是全仓type pass |
| pnpm exec eslint --max-warnings 0 <8项改变的生产TS/TSX源> | 0、零警告；lint.log；不把被配置忽略的测试/fixture算lint通过 |
| validate-dispatch.mjs --stage dispatch（当前075） | 0；errors=[]/warnings=[]；dispatch.json |
| 48候选+12未变共享首尾字节/模式 | 无漂移；final-verification.json；完整历史起点/前后hash在私有清单 |

074报告的全档案50DOM/3paging及356条跨模块旧类型诊断、Root的i18n/docs与其它类型/host报告作为已读背景保留，不冒称本reviewer重跑全部或全绿。未重复已接受T03/T04完整66，未跑本次native或写资产。两Worker测试使用当前真实外部entry实现，而T16其它实现仍活跃；它不是完整交付图的固定验收。Root当前T06完整矩阵首320/fine/en/paper普通动效case精确280几何断言失败的消息保留为未验收；是否为动画采样仅为Root待证假设，不能当已修或源码缺陷定论。

## 问题与下一步

R01交档案owner修复恢复时的片段解析，R02交Root修复无guard重复close的完成等待。两个实际反例及正控制均保留本次私有目录；没有source修复或新授权请求。所有review输入现在明确释放，Lead可分别执行最小修复，再冻结变化输入复审；原069/074/075报告保持不变。

S01、S03、S04、S05的此轮源码/定向证明可在字节未变时复用。Root继续负责最终T06矩阵、fixture动画诊断、真实宿主/视觉及NOTICE/main/styles和全仓迁移门，不能以本次局部通过宣布票据或G-MODULES完成。
