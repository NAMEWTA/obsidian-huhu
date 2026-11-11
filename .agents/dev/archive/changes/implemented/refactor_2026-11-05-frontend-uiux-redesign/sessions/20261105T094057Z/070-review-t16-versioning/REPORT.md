# T-16 独立高风险双轴审查

Session: 20261105T094057Z
Task: 070-review-t16-versioning
Status: completed

## 聚焦交接

结论：standards=request-changes，specification=request-changes。已独立复核068的67文件候选及Root中央依赖/Worker/owner/守卫/词典接缝，发现8项需要处理的问题；其中缺失端点块还原、rename块写入拒绝和历史A/B来源行卸载属于实际合同缺口。新建的只读观察测试重现了6个DOM问题样本与1个临时Git反例；这些测试断言的是缺陷现象存在，其退出0不表示行为符合规格。既有90单元、55 DOM、87临时Git测试和15个语言/owner/runner Node检查仍通过，不能覆盖上述缺口。未修代码、资产、依赖或状态；最终生产构建、NOTICE资产、完整矩阵与真实Obsidian仍归Root，本次交回释放本review冻结。

## 产物与验证

### 审查身份、来源与固定输入

- Strategy: independent；Risk: high；Independence: required；Reviewer: native:/root/forward_test_ui_rules；实现者为068 implement_t16与Root中央接缝owner，本审查者未参与这些实现。没有委派或自行修复。
- Mode: source-files（未提交工作副本）。实际HEAD=37fcede4210a19bcc2a74809e7fdd301e5717957；该HEAD不是dirty源码起点，未拿HEAD差异冒充068全部起始内容。候选按/tmp/huhu-t16-implementation/baseline.json与candidate-manifest.json定位；后者SHA256精确为05d5b60eb669ed7654418362137ea87fc56493b8db83495ddfa98102095cb411，67项全部与当前字节/删除状态吻合：28新增、34修改、5删除。只读api.ts及core/hunk-restore.ts与候选声明一致。
- 删除文件：src/modules/versioning/ui/diff-editors.ts、diff-model.test.ts、diff-model.ts、diff-worker-factory.ts、diff-worker.ts。源码全局检索仅余readonly raw helper的CM历史说明注释，不存在@codemirror/merge运行导入或旧fold/render/worker实现；host conflict-extension不在替换范围。
- 冻结范围85路径（67候选+readonly合同+Root中央接缝），清单在/tmp/huhu-t16-high-review/source-baseline.json。初始source-start.json SHA=5c2d49a31b780fb2143c739c66986195b805c99b51fc51cefbc0a67388f26172。与Root协调后只重新冻结src/modules/versioning/i18n.ts：9908e29c209cc5d121af23ed1c0f7896d01417745a0595c18eeb100005895508，确实只补moreContext/expandContext/expandAll三对，原unchangedLines保留。正式baseline及final的字节摘要均a4309355357b3e6051a6a5426b7d6865f6ea74d2887ad11c1db4252530467a94；其余文件无漂移。
- `validate-specdev.mjs --review-scope --repo /home/wta/projects/obsidian-huhu --mode source-files`，对80个存在文件逐项传--file，退出0；5个删除由原候选manifest与单独删除清单核对。真实返回/tmp/huhu-t16-high-review/scope.json。Input-SHA256=2530f3bd1161683721f4aace3bb2481ce3316ec44b0ce5077855a43182f5edc6；完整输入/tmp/huhu-t16-high-review/review-input.json。
- 规范发现：commit引用对本文件快照模式不适用；显式Spec、T-16（含036/Map12/21/22补充）、Map22、Goal、DESIGN3/UI-002均找到并使用，非缺规范跳过。具体规范为change/spec.md AC-092、094–099，ticket/16-versioning-git-diffs.md，DESIGN §3.7/5/6/7。已读068REPORT及允许的原始过程材料，没有读取其它reviewer输出。
- 标准来源：AGENTS、dev/ui技能及相关shell/design-system/theme/motion-a11y/testing/licensing；公共reviewer/source-discovery/risk/Fowler/review-evidence合同；实际TypeScript/Vitest/build/adapter配置。正式规范及规则原文摘要在review-input.json。Fowler仅作启发式，无纯风格finding。
- 固定安装包version=1.6.4、license=apache-2.0；lock SRI为sha512-RsKoruCOp50qaDM3a7BQan5K77xMkGWT1NF01fiYP1PfT3v4CvIjwytNk5WjZG0BesBkMOP2UbrBIDigB1k0ug==。参考https://diffs.com/docs的FileContents/cacheKey/React生命周期说明，但具体API以安装包components/UnresolvedFile.d.ts、react/FileDiff及UnresolvedFile声明、worker/WorkerPoolManager声明和实际源码为准；没有拿在线文档的未来版本覆盖固定包。

### 标准轴

Reviewer: native:/root/forward_test_ui_rules
Axis: standards
Result: request-changes
Input-SHA256: 2530f3bd1161683721f4aace3bb2481ce3316ec44b0ce5077855a43182f5edc6

**ST-01 · P2 · “下一处”可抢到另一叶的焦点。**
位置：src/modules/versioning/ui/diff/MultiDiffView.tsx:95（focusHeader）。函数在整个ownerDocument中寻找相同file.id/hunk，而没有限于本MultiDiffView。两个保留的比较页显示同一文件时，在第二页点击“下一处”，会focus到第一页的同名annotation；隐藏叶也可能被命中。实测DOM观察已重现，第二个容器的操作后document.activeElement落在第一个容器。最小满足：持有当前viewer/页面根ref，只在本owner根内查询，异步回焦同时校验当前identity/可见/挂载代次；补同Document双叶与隐藏页反例。只换成所属Document仍不足。

**ST-02 · P2 · 隐藏的多文件比较继续发起读取与解析。**
位置：src/modules/versioning/ui/diff/MultiDiffView.tsx:111–126；相同父比较查询在src/modules/versioning/ui/GitWorkbench.tsx:1120附近。MultiDiffView未订阅useVisible，effect仅看cancelled，false VisibilityContext仍执行queries.compare，并能继续parser队列与owner池。实际隐藏上下文观察确认首次读取启动且signal未取消；父CompareWorkspace同样不检查visible。违反ui/shell隐藏页暂停活动的owner约束，也与已在单文件DiffSurface/useRepositoryHistory实施的行为不一致。最小满足：查询、逐文件解析与测量按useVisible启停，隐藏时abort本代，恢复后按原identity加载，保留组件/滚动；补“进行中隐藏→无后续文件/计算、重新显示、关闭”测试。

**ST-03 · P2 · NOTICE生成器没有枚举parser Worker图。**
位置：scripts/third-party-notices.mjs:24–26。仅调用默认buildVersioningWorker()加入高亮图，遗漏buildVersioningWorker({parse:true})，与T-16/Map12“两类Worker图、许可与字节均计入门禁”不符。独立构建两图发现当前高亮838903 bytes、parser20209 bytes，parser当前没有独有package；这只能说明当前包名集合重合，不能把未枚举图称为已覆盖全部分发入口。最小满足：生成器显式纳入两图并由测试证明真实parser入口参与；再由Root生成/核对NOTICE。没有断言当前已造成某个独有parser许可证丢失。实际--check还被5个已知旧消费者构建错误阻断，见下文，未以此伪造许可证通过。

标准轴已确认的良好边界：applyIndexHunks走原queue，在队列内校验repository、HEAD、index/worktree identity、intent/direction、原始全文/selected proof；Git binary patch按旧OID在index锁下CAS，保留其它路径、工作区、既有模式。ordinary restoreGate仍拒绝conflict/operation；conflictAdmission只接受当前普通冲突文件与源token，再交原RestoreService做checkpoint/receipt/undo。system-files只接当前工作树端点，realpath/lstat/范围与inode检查后调用注入opener，没有将历史blob伪装成系统路径。测试/源码支持这些具体边界，不保证不存在其它竞态。

### 规范轴

Reviewer: native:/root/forward_test_ui_rules
Axis: specification
Result: request-changes
Input-SHA256: 2530f3bd1161683721f4aace3bb2481ce3316ec44b0ce5077855a43182f5edc6

**SP-01 · P1 · 新文件/删除文件的块还原被直接隐藏。**
位置：src/modules/versioning/ui/diff/GitHunkControls.tsx:153–156，及operate内仅双text准入。missing↔text能生成完整metadata/proof并显示stage，但只有双text才显示“还原此块”。两个独立DOM输入（new/deleted）均观察到stage存在、restore不存在。AC-098没有排除这些未暂存文本块；DESIGN §6要求还原块先确认、建检查点、可撤销。整文件discard不提供相同块语义与checkpoint/receipt/undo，不能代替。068诚实披露边界，但披露不等于满足合同。最小满足：沿现有领域恢复链精确表达missing和empty、创建/删除目标及条件撤销，保持其它hunk/模式/路径；现RestorePlan.afterText/receipt对象已有null语义，应先复用真实能力，不为省事把缺失端点继续隐藏。若确需改变行为范围，必须原Spec/设计owner明确决定，不能由本review自行降AC。

**SP-02 · P1 · 重命名文件中可见的块取消暂存必然被服务拒绝。**
位置：src/modules/versioning/services/sync-service.ts:708–711；调用方src/modules/versioning/ui/GitWorkbench.tsx:309–322与diff/GitHunkControls.tsx。changeComparison为rename正确构造left.path=old、right.path=new，服务却要求两端path都等于request.path。真实TEMP Git反例：HEAD old.md→已暂存new.md（保留30行，改1行，Git识别rename），用真实reader/库parser/proof发送取消暂存该内容块，失败`invalid hunk comparison`，index保持未操作。未暂存rename还会在UI提前把新路径index与旧路径源ID比较后拒绝。AC-094端点正确及AC-098块操作没有授权用新路径强行替代历史旧路径。最小满足：显式绑定rename源/目标与操作方向，对正确的旧端点和目标index分别重验；保持rename本身、其它hunk/路径、模式与worktree；补staged/unstaged rename含内容变化的真实Git回归，不能仅隐藏按钮。

**SP-03 · P2 · 历史A/B选择卸载来源列表，无法保留按下按钮焦点与行状态。**
位置：src/modules/versioning/ui/GitWorkbench.tsx:110–113，配合mode条件分支、HistoryWorkspace A/B按钮；NoteHistoryPanel.tsx:424附近也没有端点aria-pressed。历史行点击A/B立即set mode='compare'，整个HistoryWorkspace卸载；CompareWorkspace没有历史图，原行不再存在。实际DOM观察确认A按钮isConnected=false、activeElement失去该按钮、历史提交行消失，且A按钮本来无aria-pressed。违反AC-097及UX-VER-3“任意行设置端点、焦点留在按下按钮”、批准历史/比较共用提交图交互；用户必须返回重新加载历史再选下一端点。最小满足：保留提交图/行与筛选、将右侧内容切成比较，A/B读受控pair并输出aria-pressed；保留Worktree任意适用端点选择。补连续A→不同B、交换、重复同端点以及来源焦点的DOM与真实宿主检查。

**SP-04 · P2 · CompareEndpoints没有批准的A/B角色胶囊与全局文件/+−汇总。**
位置：src/modules/versioning/ui/diff/CompareEndpoints.tsx:12–40、GitWorkbench.tsx:1147–1175。组件只收a/b/onChange，渲染Base/Target文本输入和交换按钮；没有角色字母、胶囊、文件计数或加减汇总。queries.compareFiles已经提供真实每文件stats，但页面不汇总；单文件库header的计数不等于端点间总计。直接不满足DESIGN §5 CompareEndpoints及AC-097“端点胶囊、文件列表与+/−汇总立即更新”。最小满足：保留直接引用输入能力，同时按批准角色表达当前已固定端点；从真实领域统计提供聚合文件数/+−，unknown/binary未计数明确标识，不能发明0；端点变化立即清旧汇总并显示加载/失败。

**SP-05 · P2 · 多文件工具栏交换显示方向后，上方端点仍声称原方向。**
位置：src/modules/versioning/ui/diff/MultiDiffView.tsx:139–141、DiffToolbar.tsx的swapped更新，CompareEndpoints.tsx与GitWorkbench.tsx的独立comparePair。多文件解析按preferences.swapped调换old/new，但端点输入仍保持未交换的a/b。实际DOM/真实parseComparison观察：按下第二个交换按钮（diff toolbar）后parser读new→old，Base/Target输入值完全不变；单文件DiffSurface有随swapped更新的端点heading，多文件却没有。违反AC-094/097端点正确与一致阅读；用户会把B→A的增减理解成A→B。最小满足：交换使用同一明确的端点角色事实源，或把呈现反向状态准确映射到上方角色/汇总/文件方向，同时保留跨入口偏好；验证两种交换入口、已反向偏好进入新比较、rename与B=worktree。

规范轴已确认的具体实现：FileContents的missing=null与empty.contents=''分开，cacheKey含repository/id/path/lang/hash；较大双文本解析经可终止薄parser Worker，普通高亮池不冒充parser；读取硬上限每端2MiB未抬高，render阈值200000另行处理；旧CM运行链已删除，byte/raw proof引擎只读保留。UnresolvedFile确实用公开instance.render({file,preventEmit:true})重新播种原文，再resolveConflict；BOM仅显示适配后补回，15个真实库候选DOM用例涵盖三选择、BOM/CRLF/混合行尾/多冲突与失败保持，未使用自写冲突parser。以上不覆盖SP-01/02的缺失/rename还原边界。

### 实际命令、结果与材料

所有审查新增代码、原始JSON和日志仅留/tmp/huhu-t16-high-review。本报告是唯一仓库写入；未安装/修改node_modules、运行正式build产物、改源码/fixtures/NOTICE、改状态/index/分支或远程。Git写测试只在临时仓库；没有初始live index字节指纹，因此不把“未调用live Git写命令”冒充独立hash证明。

| 检查 | 实际结果 | 原始材料 |
|---|---|---|
| node --test scripts/diffs-owner-document.test.mjs scripts/diffs-languages.test.mjs | 退出0，9测试；包含主/两Worker实际图、固定6源hash、普通/hashed后端、未知入口/额外copy/expected-zero负例 | /tmp/huhu-t16-high-review/script-checks.log |
| node --test scripts/ui-review/run.test.mjs | 退出0，6测试；错误matrix/路径/隔离suite/preflight，不是生产native矩阵 | /tmp/huhu-t16-high-review/runner-checks.log |
| vitest run --config /tmp/huhu-t16-high-review/vitest.config.mts --project dom src/modules/versioning | 退出0，8文件55测试 | /tmp/huhu-t16-high-review/dom.log |
| 同config --project unit src/modules/versioning/core src/modules/versioning/services src/modules/versioning/ui src/modules/versioning/platform/desktop/system-files.test.ts | 退出0，13文件90测试 | /tmp/huhu-t16-high-review/unit.log |
| 同config --project native-integration test/sync | 退出0，5文件87真实TEMP Git测试 | /tmp/huhu-t16-high-review/native-git.log |
| tsc --noEmit --skipLibCheck -p /tmp/huhu-t16-implementation/tsconfig-tests.json | 退出0，源及相关测试局部图；不是全仓build | /tmp/huhu-t16-high-review/types.log |
| vitest run --config /tmp/huhu-t16-high-review/repro.config.mts | 退出0，6个观察样本：A行卸载、new/deleted无restore、隐藏读取、跨叶焦点、反向显示/端点不变 | /tmp/huhu-t16-high-review/repros.dom.test.tsx、repros.log |
| vitest run --config /tmp/huhu-t16-high-review/native-repro.config.mts | 退出0，1个真实TEMP Git观察，断言rename块请求被拒绝 | /tmp/huhu-t16-high-review/native-repro.test.ts、native-repro.log |
| node /tmp/huhu-t16-high-review/audit-graphs.mjs | 退出0，独立两Worker元图/字节/包名比较；parser-only package当前为空，生成器仍未枚举parser | /tmp/huhu-t16-high-review/worker-graphs.log |
| node scripts/third-party-notices.mjs --check | 退出126；main内存build被5个旧未迁移消费者export错误阻断，没有到NOTICE文本比较 | /tmp/huhu-t16-high-review/notices.log |
| Root补字典后pnpm test:i18n | 回读Root实际退出0日志，33词典/5550键；本review核对3对原文与文件hash | /tmp/huhu-t16-final-words-i18n.log |

临时观察配置第一次用绝对vitest/config目录导入，启动退出126；已改用正常package export并完成上述6项，不把配置启动失败归给产品。第一次冻结脚本把删除项当必有sha256而KeyError，未生成baseline；随后按删除状态正确重建，67项均吻合。保留真实失败经过，没有伪称首次即全绿。

Root中央适配器实证已回读：sheet-negative/positive各6项覆盖FileDiff/CodeView/UnresolvedFile在main/iframe初建和双向adopt，未适配iframe为0、适配后每项为1；pointer-negative在iframe把3监听挂main且无结束，positive两Document trusted1→4结束，adopt/unmount后两边计数0。源码只做注册/stylesheet与捕获pointerDocument的窄适配；guard锁两个发布源hash、锚数量、生产1+1图数，非diff runner显式0+0；非盲目ambient文本替换。原始材料仍在/tmp/huhu-t16-implementation/{sheet,pointer}-{negative,positive}.json；本review没有重复native66，也没有把iframe当Obsidian popout。

全局构建债务与本票finding分开：实际NOTICE检查及Root /tmp/huhu-t16-central-adapters.log都停在AppearanceSettings缺deriveCustomTokens，Agent的TerminalTabView/WorkspaceLayout各缺PanelGroup/PanelResizeHandle，共5个旧消费者错误。这些是Map已登记的T12/T09迁移债务，没有据此判本T16源码回归，也没有写全build/NOTICES通过。预算数字与HEAD对照未提高，仅增加forbiddenEagerAreas；实际最终预算是否满足仍待Root消除全局构建债务后执行，不能以阈值没动推断字节门通过。

## 问题与下一步

先由原T-16 owner处理SP-01/02的领域行为，以及ST-01/02、SP-03/04/05的页面组合；Root补齐ST-03的parser NOTICE图枚举。恢复missing/empty和rename必须保留原proof、原队列、源叶/正文/HEAD/index重核、checkpoint/receipt/条件undo，不能放宽ordinary conflict gate、改持久格式或以隐藏操作消除AC。新增实测反例保留在/tmp，是否迁入正式测试由原实现owner执行，本review不写生产测试。

修复后按改变的输入/受影响轴重新独立审查；Root继续拥有最终生产build、bundle/notices、styles/main资产集成、最终全状态/宽度/主题/可信命中和真实Obsidian多叶/popout/恢复验收。本次DOM与库内存模型不证明像素、命中、实际宿主生命周期或全部设计状态。066初轮布局、24态smoke与本轮现有DOM通过都不替代修后最终矩阵。

本报告交回即释放85路径review冻结，不改变其它owner的写入边界。任务完成仅指独立审查候选已交回，两轴request-changes，不宣告T-16完成或推进任何正式状态。REPORT写后运行dispatch return校验，真实退出码由本次工具回执和最终返回提供，不回改不可覆盖REPORT。
