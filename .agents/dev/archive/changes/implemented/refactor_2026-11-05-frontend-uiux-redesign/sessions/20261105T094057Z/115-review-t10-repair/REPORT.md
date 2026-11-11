# T-10 修复及独立根可见性生产者复验

Session: 20261105T094057Z
Task: 115-review-t10-repair
Status: completed

## 聚焦交接

Reviewer：native:/root/review_toolchain，109原完整审查者，既有gpt-6.1-sol high独立角色；未参与112实现、六源生产者合入或114 fixture修复，没有实施或委派。**standards：pass；specification：pass；本次范围无新增已验证finding。** 109 ST-01至05实际行为问题及SP-01严格gutter命中问题在本次固定输入下关闭；109原报告保持当时request-changes，不覆盖历史。

**明确释放112的84候选、Root六源及本次必要只读source context的review冻结。** 当前复合90源及18上下文始末字节/模式核验drift=[]。只写本不可变REPORT和 /tmp/huhu-t10-repair-high；未改源码、fixture、配置、资产、依赖、Git/index、正式状态或Evidence；未使用用户vault/clipboard，没有运行66。Root独占词典/fixture/产物未被本review冻结。

亲自重跑相关19文件179 DOM、原五组私有反例10项、补充实际路径3项，均通过；生产tsc、聚焦测试types、16生产源lint、comments CSS均0。未变67候选源沿109完整审查有界复用，不重新审计整个T10或T16。source/DOM通过不等于Obsidian、多叶/popout、像素/可信指针或最终资产通过；这些仍由Root验收。

## 产物与验证

### 输入、真实差异与来源

Review mode: source-files；Risk: high；Independence: required；Strategy: independent。真实派遣为115 TASK及Lead工具消息；标准为AGENTS/workspace/catalog、dev/ui/editor-comments/testing及SpecDev C/公共独立审查合同；规范为Task、Map/Goal/Spec/T10/T16、DESIGN3/UI002。批准摘要仍 **49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66**。当前Map快照header为43，T10生效的41/42条目明确规定EditorPanelHandle、实际内容可见性与T13 gutter说明交接；不以并行票据/后续编辑推断新的产品授权。source-files模式无commit/PR来源发现需求，没有缺规范或跳轴。

- 112 candidate-manifest.json SHA256 **91610a84495965300738a551f02b8d9dd11e1ee94cbcf97a929c4e585ccdec7a**，84项，17路径实际修复差异全部回读；自有candidate/与diffs/保存实际字节。112 dirty baseline清单82项原字节逐项匹配，baseline-verification.json drift=[]。候选新纳入visibility/gutter/runtime-lazy三测试，原baseline的navigator/ui/i18n.ts是Root独占词典而被候选清单排除，**文件仍在，不是删除**；不把82→84误报为仅新增两文件或生产删除。
- Root producer-root-receipt六源after/mode全部与实际源相同；producer-before及producer-visible-before六份真实before也逐项匹配声明。已读完整两份producer patch及其实际调用方，不只接受matches=true声明。六源为EditorContext合同、comments API/module、versioning module/history-panel-page/NoteHistoryPanel；Root实际合入候选被纳入本次source审查，而非私有提案通过就宣称产品通过。
- 90项复合manifest.json SHA256 **a165fad609c62486825576cdad25343889539e5a3d967bac6565e0829b05f741**；与109最终候选对照67项字节/模式相同，17项修复/新增测试和6项生产者分别重新审查，reuse109.json保留实际集合。109原REPORT SHA256 **c542d261167d025bade779d00d4605f53afec0516e3a8195da6c984724f84bff**。
- 扩展18个必要source context：真实navigator模块/API、周期/diary写作搜索、comments store/service/overlay/anchor，providers/visibility、DateField/date-value、Calendar真实公开组合、periodic-paths与命令ID。context.json SHA256 **0a13d6d171b0de9fd5b7cdb8d6ce622302c708a4256865f5e4fbc941aee03d03**。DateField受控raw与vault-source owner绑定分别来自108/110，111独立报告已回读，按当前相同实际能力复用；本次仍检验SearchWritePanel真实消费，不以生产者通过代消费者通过。
- 公共review-scope108项退出0，review-scope.json SHA256 **d332528614fa682df61951e9142517d874aff29bbdc9e20558a67323d9e51cda**；authority.json SHA256 **a5d4ceaf22bea43398f067b4c2cfee8f8baee5e1a8321b5a308b745bd2fc7463**。review-input.json Input-SHA256 **286aa4ac386bca83b2f3a84faedc02e40b452fdb460a9fea2886d4ba3e1d7f59**，绑定候选、上下文、规范、独立性与真实基线，不伪造Git固定点。

114 fixture、UI词典与最终JS/CSS是Root独占且排除项，不将其并行变化算本冻结漂移。本次没有重跑fixture --check或native，不拿109 startup缺端口失败当生产失败，也不把114诊断当本reviewer完成最终native。

### standards 输出

Reviewer: native:/root/review_toolchain
Axis: standards
Result: pass
Input-SHA256: 286aa4ac386bca83b2f3a84faedc02e40b452fdb460a9fea2886d4ba3e1d7f59
Findings: []。

**109 ST-01关闭：raw、semantic日期与草稿身份同时守住提交。** SearchWritePanel.tsx:35–40实际持有writeRaw，DateField配对draftValue/onDraftChange；save及Save disabled均要求parseDate(raw)===writeDate、draft.date===writeDate。原真实Navigator模块→Workbench→Tools→Write反例仅调整已失效的“非法日期也等Save启用”前置，保留真实旧文件不得出现marker、无success receipt断言，并加Mod+Enter路径控制。非法2026-02-31时点击/快捷键均不写旧2026-11-04；合法控制继续成功。另真实配对流程从非法raw修为2026-11-03，正文保留且只追加11-03、11-04不变。没有仅禁按钮而让handler绕过，也未默认改日期或造新日期验证器。

**109 ST-02关闭：按周期服务实际文件身份读页。** DiaryReader.tsx:51–52使用periodic.inspect(period,selected).path与列表entry.path匹配，已有期间笔记不再依赖月中日期等于月首canonical字符串。该修法使用领域已有路径身份，允许原jump保留实际选择日期；无需UI复制周/月/季/年起止算法。原真实monthly/2026/2026-11.md在11-17及11-01均显示；仓库回归同时检查read-only，已有open仍重核inspect/path。周/月/季/年共用该路径判定已源审，但本次不假称逐个新增实际反例或重新运行全周期native。

**109 ST-03关闭：真实贡献边界和内容都消费可见性。** EditorPanelContribution现在必需mount(container,documents,initialVisible):EditorPanelHandle，只有setVisible/dispose，没有旧function兼容分支。Host layout effects在挂载时传最新visible，切tab调用handle，替换/卸载dispose；两个visited root仍保实例。

实际comments runtime保留最新visible，在lazy import完成时才按该值挂载；先dispose或runtime关闭则拒绝迟到挂载，panels集合在dispose移除。独立comments mount沿原ContainerProviders渲染visible，不增加Provider/Portal系统；CommentsPanel的eager批次和NoteThreads读取实际用useVisible，隐藏取消后不发下一批，恢复保筛选。六源中T16 root同样传visible，NoteHistoryPanel真实读取effect隐藏先abort、停止新query，恢复重新请求。不是只增加接口而内容仍默认true。

证据包括：原真实host→mountNoteHistoryPanel反例/正常控制均绿；仓库实际initial-hidden、恢复、comments隐藏后新增文件不触发load/恢复保search、runtime迟到挂载/取消/portal释放全部通过。额外私有真实History根最初hidden不读，恢复发真实query，pending时hide令其signal.aborted，外部query迟到成功不显示结果，再恢复重新读当前other.md，卸载listeners=0。versioning module的lazy closure同样检查closed/disposed、挂载读最新visible，handle与真实mount的dispose均幂等；实际生产调用者已经迁移。未重新代审T16整个history/domain，也未将DOM当Obsidian多叶证明。

**109 ST-04关闭：note回执只确认同owner同草稿revision。** ThreadCard.tsx:38–48捕获revision及env/path/thread owner，真实durable flush回来时仅在alive、身份及revision仍一致才退出编辑。输入、再次Edit和取消都推进revision，卸载/owner变化有layout lifecycle。原真实CommentStore/CommentsService等待外部FS写盘时编辑Latest note draft，旧First note ack不再关闭新编辑器；未继续编辑的控制仍正常落盘/关闭。未改旁路存储格式或失败重试服务。本问题原本是保留旧路径缺口，本次关闭不把它改写成100新回归。

**109 ST-05关闭：每个selection事务拥有独立幂等key。** CommentPopover.tsx:22以request身份分配并捕获paletteKey；同request失败重试保持key，新B不再共享A的acceptedHighlights。原真实service/store下A已接受而durable flush暂停、B选Yellow，A/B分别有自己记录，串行控制也保持。旧请求的catch/finally/close继续检查channel当前request，已有“旧ack不能关闭后续request”回归仍通过；没有删除幂等机制或复制存储队列。

未变范围沿109完整审查复用：Diary全部周期/书页缓存、搜索/写作取消/冲突/模板、Navigator树/搜索/设置/缓存/undo、共享Calendar实际消费、批注锚点/reading/回复/解决/删除/重锚及宿主generation清理。当前179 DOM包含原风险回归与新增修复测试，没有以删除断言、降低日期校验、冻结交互或核心服务mock得到绿色。

### specification 输出

Reviewer: native:/root/review_toolchain
Axis: specification
Result: pass
Input-SHA256: 286aa4ac386bca83b2f3a84faedc02e40b452fdb460a9fea2886d4ba3e1d7f59
Findings: []。

**109 SP-01关闭：18px gutter已经是非交互图像，而非被豁免的小目标。** gutter.ts真实创建role=img、带名span，无button/tabstop/keydown/click，空行add marker不再生成；gutter扩展没有domEventHandlers，HoverTracker仅接受正文highlight而不接受marker。CSS pointer-events:none且去掉cursor/focus/hover动作，没有重叠伪元素、不改CodeMirror正文行高。实际CodeMirror gutter DOM回归确认语义与click/Enter不打开；这里没有把18px图像报告为32/44交互尺寸通过。

精确能力仍沿已有生产入口：ADD_COMMENT命令调用openComposer，空选择保当前line anchor；comments-at-cursor真实加载后取当前行threads，next/previous保定位；选区highlight工具条、面板/浮层真实讨论/回复/重锚/解决/删除共享控制保持。私有实际CodeMirror/命令注册控制证明第2行光标添加得到lineHint=2，真实store已有该行批注时光标命令打开其thread ID及实际ownerDocument；不是仅检索命令名字或复制新editor引擎。批准NFR严格32/44仍适用于其余真实控制，未以等价入口为仍可点击的18px marker创造例外。

Map41/42将该重复触发入口调整与后续T13说明交接明确化，DESIGN摘要不变，领域字段/锚点与编辑器内核没有修改。当前docs/comments.md及dev editor-comments仍有旧gutter点击/悬停说明，Root已接收T13更新；原未使用emptyHint词典也由Root更新。本结论只关闭本次产品修复的合同问题，**不宣称这些后续文档或整票native已经完成**。

ST-01至05对应的非法raw不得写旧值、全部周期真实消费、隐藏保实例/暂停读取、草稿及迟到回执合同均由上述真实生产组合通过。未发现新设计偏离；源级Design Conformance满足本次增量。像素/320/200%/纸墨/动效、可信鼠标触摸/2px实际绘制、Obsidian/popout/owner adoption与最终同构建矩阵仍归Root，无视觉整体pass声明。

### 实际检查与边界

| 实际命令/检查 | 结果 |
| --- | --- |
| pnpm exec vitest run --config /tmp/huhu-t10-high-review/vitest.config.mts --project dom src/modules/navigator src/modules/comments src/app/editor-panel src/app/workbench/comments-leaf.dom.test.tsx src/modules/versioning/ui/history | 0；19文件179/179；dom.log；临时config沿生产Vitest项目，仅缓存/tmp |
| pnpm exec vitest run --config /tmp/huhu-t10-repair-high/counter.config.mts | 0；最终4文件13/13；own-controls-settled.log；原五组10项+隐藏pending History/精确命令/修正raw三项；此前10/10、12/12为同一私有集逐步补充，不累计成35项 |
| pnpm exec tsc --noEmit --skipLibCheck --pretty false | 0；production-types.log空；真实当前生产图，无资产生成 |
| pnpm exec tsc -p /tmp/huhu-t10-review-repair/tsconfig.tests.json --pretty false | 0；test-types.log空；聚焦测试图，非全仓test-types |
| pnpm exec eslint --max-warnings 0 <16个变动生产TS/TSX> | 0、零警告；lint.log空；10消费者+6生产者，未把test/mjs算lint |
| pnpm exec stylelint --max-warnings 0 src/modules/comments/styles/comments.css | 0；css.log空 |
| baseline82原字节、producer-before六源、candidate84+producer六源及18context字节/模式 | 通过；初末drift=[]，真实before/after保存；Root独占词典/fixture不在冻结集 |
| validate-specdev --review-scope --mode source-files | 0；108存在路径；review-scope.json/err |
| validate-dispatch --stage dispatch | 0；errors=[]/warnings=[]；dispatch.json |

107单元、comment-storage/handoff核心本次未改，复用109亲自通过证据及112同输入107绿记录；没有冒称本次重跑它们。架构、词典、fixture --check与正式66由Root处理，不因本次production types0宣称旧fixture已迁移。检索发现旧scripts/ui-review/fixtures/T-34.tsx:128、T-35.tsx:143仍用旧mount调用，已交Root纳入既定T13旧入口清理；它们不是当前frontend-redesign最终fixture或生产调用方，本次不为其加兼容分支。114独占driver及Root最终词典/资产变化不纳入本结论。

私有测试沿109真实模块/服务/存储及独立root，外部Obsidian/FS/query端口由已有fixture提供；本次没有模拟被修函数或降低数据/receipt断言。只把非法Save可用前置改为断言禁用，仍实际发点击和快捷键并核实旧文件/回执。没有全仓build、生成main.js/styles.css、真实Obsidian/popout、OS/clipboard、真实用户数据或66；也没有无限扩展历史/日期/编辑器边界。未持有初始live index字节指纹，不把“未写Git/index”的操作事实冒充独立前后hash证明。

## 问题与下一步

本次两轴通过，109五行为及gutter问题均已关闭；冻结明确释放，原109/112及本REPORT保持不可变。Root可继续合入114真实fixture诊断、完成最终同输入native/资产/Design Conformance并按正式流程收尾T10。

T13沿既定范围更新gutter视觉/命令说明、旧未使用点击提示及T-34/T-35旧fixture入口；本轮不修改文档、正式状态或补旧API兼容。若84产品或六源可见性/实际内容再改变，则按真实影响重新冻结复验；未变范围继续复用，不重开完整T10/T16审计。
