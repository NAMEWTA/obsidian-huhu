# T-16 最终独立双轴复审

Session: 20261105T094057Z
Task: 095-review-t16-final
Status: completed

## 聚焦交接

Reviewer：native:/root/review_toolchain，既有gpt-6.1-sol high独立角色；未参与068/073/082、Root085预算叠加或许可修复，没有实施或委派。**standards：pass；specification：pass；本范围无新增已验证finding。** 070分配给073的七项实际问题以及ST-03双Worker NOTICE缺口均已关闭；原070不可变报告仍保留其当时request-changes。

**明确释放T16完整69项、Root许可8项及必要T16只读上下文的review冻结。** 最终复合97路径（92存在、5删除）字节/模式核对drift=[]；仅中央runner发生事先授权的T09专用条件分支变化，已显式记录并重绑上下文，不算T16源漂移。T09、health等其它活跃写集未被本审查冻结或代审。仓库只写本不可变REPORT；过程材料仅/tmp/huhu-t16-final-high。没有改源码、fixture、配置、依赖、CSS/JS/NOTICE资产、Git/index、正式状态或Evidence；临时真实Git写入仅发生于测试自行创建的/tmp仓库。

独立64 DOM、93单元、92真实临时Git、17语言/owner/许可脚本、6 runner测试、8语言额外语义控制及41生产源lint/范围types均通过，真实NOTICE --check通过。Root最后生产资产、正式66、实际Obsidian多叶/popout/OS仍独立验收；本报告不以source/DOM或作者Chrome iframe诊断替代这些门。

## 产物与验证

### 固定输入、真实基线与叠加

Review mode: source-files；Risk: high；Independence: required；Strategy: independent。真实派遣为095 TASK及Lead工具消息。已回读068、070、073、082完整报告及089共享预算独立报告；标准为AGENTS/workspace/catalog、dev/ui及testing/licensing、公共review/source-discovery/risk/reuse合同；规范为Map32/Goal/Spec/T16完整补充、批准DESIGN3/UI002，设计绑定仍49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66。显式本地快照无需远程Issue发现，不缺规范、不跳轴。

- 073清单/tmp/huhu-t16-repair/candidate-manifest.json SHA256 **1ed4f94698fe617db4df16401596d0aa3f3249e699b97e5c121d6906a084731b**；073真实post068 baseline/start及12路径差异已核对。082完整69清单/tmp/huhu-t16-bundle-optimization/candidate-manifest.json SHA256 **36cf0c8e8f57222661c46283409126756dd53d48e42c1447a783483aff712d19**，仅5项压缩接缝变化，其余64项保持。五个旧diff-editors/diff-model/diff-worker实现仍实际删除，没有回退旧CM链。
- 原068 baseline声明的39个原有路径中，37项能从固定37fcede4210a19bcc2a74809e7fdd301e5717957对象取回且原字节SHA精确匹配，已保存original-baseline/和diffs068/。**sync-service.ts、sync-presentation.tsx两份068开工dirty原字节未留副本，不能重建其完整起始diff**；Lead确认无额外locator。本轮没有拿HEAD内容替代它们。两项当前完整源/调用安全已审，sync-service另有073真实post068前后差异及真实Git回归；该历史输入限制不被伪装成完整基线证明。
- Root预算34清单SHA256 **55f1cede6ee897ca02cde54c171fb9c53d0ba3e723194c18003a4111f8cc2456**由089独立通过。本轮69中只有history/review-page.tsx、settings-page.tsx、workbench-page.ts三项与082不同，均逐字匹配该Root清单，实际只增纯UI词典入口。旧/新hash在initial-verification.json中明示。versioning/i18n、ui/i18n、history-panel-page与真实四入口作为必要上下文读入，符合当前dev纯UI入口注册规则；不是漏键或未解释漂移。
- Root许可8项/tmp/huhu-license-upgrade/final-manifest.json SHA256 **7151113ed2d3ec1b685a643591b55a244a77a3cfd4357115aed44809b4e21229**全部逐字/模式匹配，包括生成NOTICE；未改node_modules或扩大许可允许集合。
- 自有初始复合清单97项SHA256 5b00b78cd2b24b5733ef966797f70732c4a2658f9b4f25c80310b56b38d7b0e1；54个当前存在输入与070固定源逐字相同（含旧owner适配与只读核心），其适用结论有界复用，改变的服务/UI/资产与许可重新检查。reuse070.json、diffs073/保留实际归因，原070的失败不被复用成通过。
- 中央run.mjs由Root在本轮按既定授权增加agentFixture=T09专属Electron alias/external/boundary；T16该条件恒false，原diffs1+1、language、Worker插件均未变。before SHA256 **2b5871f9541b70934da6ad169827be16f1f15c4970c712ae45c0993661cdd9fa**，after **d7b34e1ba5093f8c9802cce03ce04d98bf55315dc36dd3d633aff3e7b76b6962**，原文与runner-T09-context.diff保留；没有静默忽略整文件变化或冻结T09 stub。
- 更新后的97项manifest.json SHA256 **25d9c563ad415892305d23d962cf185e83e7259c6bf21e20bfed946c1730cfc8**。公共review-scope固定92个存在路径，5删除另外核对。authority.json SHA256 **6938ec41fbe6afcbd151ee4fb2806165c2e9845810c4680e05ec97b151e6fe9f**；review-input.json Input-SHA256 **9655fda11b65c8a07b3676e24a263390a5b5425372c32bad7f0c8ca2d60a3942**，绑定scope/deleted/sources/Root叠加及许可的runner变化。final-verification.json最终drift=[]。

### standards 输出

Reviewer: native:/root/review_toolchain
Axis: standards
Result: pass
Input-SHA256: 9655fda11b65c8a07b3676e24a263390a5b5425372c32bad7f0c8ca2d60a3942
Findings: []。

**ST-01关闭：焦点限本viewer。** MultiDiffView持有root，RAF只在该根查相同file/hunk；active identity、visible、isConnected均核验，identity/visible/document清理旧RAF。真实双viewer DOM控制证明第二页Next只聚焦第二页；未以ownerDocument全局查询替代根归属。

**ST-02关闭：隐藏暂停读取/解析与owner池。** CompareWorkspace与MultiDiffView均useVisible，abort当前generation；pin后、逐文件前后和parse后检查signal，迟到结果不能继续下一文件或回写。ready viewer保持同一DOM，恢复同identity重新加载；ResizeObserver与owner pool按visible清理，pagehide/unmount terminate。当前DOM覆盖初始隐藏、进行中隐藏abort、迟到响应不读下一文件、恢复与卸载；parser单元验证真实取消/失败清理，不将DOM替身当实际宿主Worker门。

**ST-03关闭：真实主/两Worker许可图全部枚举。** buildDistributedGraphs明确执行main、buildVersioningWorker()、buildVersioningWorker({parse:true})；测试真实编译两Worker并核对entryPoint，不依赖当前包名集合恰好重合。实际NOTICE --check退出0：130 npm、73 terminal crates，包含@pierre/diffs1.6.4、@shikijs/langs4.6.0、shiki4.6.0、diff9.0.0、fflate0.8.3等真实分发依赖。没有只统计gzip虚拟string而漏掉原Worker依赖。

**压缩接缝通过。** 构建用Node标准gzip，运行时fflate0.8.3的gunzipSync/strFromU8，仅改变可信静态grammar/Worker传输。实际八个物理语言输入保持，unknown filename归text，未提供grammar/未知backend/hash/anchor/禁用portable、wasm、highlights均fail closed。主图解包仍提供原default数组；本review另对8种语言做deepStrictEqual（不只是JSON.stringify），同时核对default数组冻结状态与原发布相同、条目冻结保持。两个Worker整体gzip后解包代码与当次真实buildVersioningWorker源逐字相同；同步factory仍使用actual owner的Blob/URL/Worker，成功与构造失败都finally revoke，坏base64/gzip直接抛错，没有空源、eval、消息缓冲或新parser。

**许可8项通过。** allowed集合未扩，identifier只做大小写规范化、AND/OR语法仍严格，未知/受限分支与缺文本/错hash/错版本拒绝。该匹配规则与[SPDX2.3.1 D.2](https://spdx.github.io/spdx-spec/v2.3.1/SPDX-license-expressions/#d2-case-sensitivity)一致。另独立取得固定上游：headless-tree的[固定LICENSE](https://github.com/lukasbach/headless-tree/blob/8a96358a139c4793f8e572201fd714d1a2d26e83/LICENSE)与本地SHA cac45d63…2559完全相同；lru_map的[发布gitHead README](https://github.com/rsms/js-lru/blob/77c51e90dbcf4ffc0d27e6bc04a012a6b54a05e1/README.md)中完整MIT段与本地逐字匹配、原版权行保留，未将只有声明的源码头伪作全文。构建仍只读本地pin，不临时联网获取许可。原始下载/hash仅/tmp/upstream-license-verification.json及私有文本。

其余安全接缝已检查：

- Index hunk在既有串行queue内验证repository、HEAD、状态/冲突/锁、操作方向、端点ref/path/id、index/worktree raw proof、selected与candidate。rename仅按当前status确认源/目标，写入准确indexPath，原binary patch/OID CAS及mode沿用，未引入checkout/reset或写真实用户仓库。
- 普通restoreGate仍拒绝conflict/operation；conflictAdmission仅当前普通冲突工作树文件、repository/path/worktree token一致时准入，仍经原RestoreService checkpoint/receipt/条件undo。apply前重核document generation、source/repository与保护，元数据阶段失败保留needs-review，不自动重放。missing null与现存空串严格区分，未改持久receipt格式。
- UnresolvedFile每次utility候选前先以原源和preventEmit重新render，避免非受控内部选项累积；resolveConflict仍用固定公开库API，BOM补回与LF/CRLF/mixed/多冲突控制保留。没有复制冲突parser或仅修改预览冒充落盘。
- endpointFile保留missing=null、empty真实对象，cacheKey含repo/id/path/lang/hash；reader每端2MiB硬上限不放宽，渲染阈值与强制渲染分开，大文本经可终止parser Worker，旧CM引擎保持删除。系统打开只对当前worktree普通文件，由desktop realpath/lstat/inode/containment核对；历史/缺失/symlink端点不伪造路径，测试仅注入opener，不调用真实系统程序。
- Root owner-document/pointer适配与070源相同，完整发布hash、锚数与真实1+1图守卫仍在；生产NOTICE内存build和当前Node正负图测试通过。原070 main/iframe样式/采用/pointer正负实证有界复用，未称本轮重新运行或等同Obsidian popout。

### specification 输出

Reviewer: native:/root/review_toolchain
Axis: specification
Result: pass
Input-SHA256: 9655fda11b65c8a07b3676e24a263390a5b5425372c32bad7f0c8ca2d60a3942
Findings: []。

**SP-01关闭：missing/new/deleted/empty块恢复实际走原恢复链。** GitHunkControls对missing↔text显示真实Restore入口、确认后apply，不再仅允许双text；proof以null区分缺失，plan.afterText=null准确删除、非null准确创建/替换。真实临时Git通过Gate→RestoreService→CheckpointStore→verified receipt→undo，分别验证新文件删除/撤销、删除文件创建/撤销、现存空文件不变成missing；HEAD/index与其它路径保持。不是整文件discard替代块恢复，也没有放宽普通gate。

**SP-02关闭：rename块操作保留原端点与重命名。** staged rename取消暂存验证old commit→new index，unstaged内容暂存从真实当前index路径读取，status侧rename准入、ref/path/id再次重验。真实Git回归逐块改变一处，保留未选tail、rename本身、100755、其它staged路径、HEAD与worktree；伪造rename左路径和过期proof拒绝。未通过隐藏按钮规避合同。

**SP-03关闭：历史来源与焦点保留。** history/compare保持同一HistoryWorkspace和navigation树，只切右侧内容；branch/search/selection/list滚动实例未因设置A/B卸载，角色按钮有受控aria-pressed，NoteHistory行及current snapshot也输出实际角色。DOM连续A→不同B/重复B证明原button仍isConnected且焦点留在原按钮；未以重新打开历史模拟保留，真实宿主焦点/窄宽绘制仍归Root。

**SP-04关闭：端点胶囊与真实汇总。** A/B danger/success胶囊、固定短OID与引用输入并存；CompareEndpoints从真实compareFiles聚合files/+/-，未知或binary缺数明确?及unknownStats，不发明0。身份切换即不再使用旧state，loading/error明确，pin/list迟到结果受abort保护。DOM实际核对已知汇总、清旧loading与unknown。

**SP-05关闭：两个Swap入口只有同一有效方向。** CompareWorkspace把pair+swapped映射为有效A/B，pin、文件表、统计、逐文件读取都用该方向；MultiDiffView不再次独立反转。端点栏与diff toolbar均更新同一个偏好，历史行选端点及编辑输入映射相同角色。实际DOM证明两个入口互换、已反向偏好、rename old/new路径与B=WORKTREE请求/统计一致。

其余完整T16能力沿固定未变源及当前回归保留：更改/已暂存/冲突分组、提交/接入/clone/远端/作者/同步控制，Git历史refs/parent/分页、笔记本地采样/手动checkpoint/固定current snapshot、恢复回执/ack/undo与新来源保护均仍调用原服务；未造新域格式或降低风险门。Root四个真实UI入口在渲染前注册versioning纯UI词典；089已验证的原键集合/占位符与加载时序在相同输入上复用，未把测试预载当入口证明。

DESIGN3/T16的源码与行为合同在本范围满足，无需改批准设计消除finding。像素/可信命中/宽度/纸墨/实际OS仍属独立native门。Root记录的六项现有预算门为main8187265/eager133427/agent1383014/nav203537/task167468/version194487，上限没有变化；本review回读实际bundle.json并复用089通过的未变纯UI词典/构建传输结论，不冒称自己重新执行完整预算build或把082旧超限记录改成当时通过。

### 实际检查与限制

所有本轮过程材料仅/tmp/huhu-t16-final-high；下列都是本reviewer实际执行，非只转抄作者绿色日志：

| 命令/检查 | 实际退出与结果 |
| --- | --- |
| pnpm exec vitest run --config /tmp/huhu-t16-final-high/vitest.config.mts --project dom src/modules/versioning | 0；9文件64测试；dom.log |
| 同config --project unit src/modules/versioning/core src/modules/versioning/services src/modules/versioning/ui src/modules/versioning/platform/desktop/system-files.test.ts | 0；13文件93测试；unit.log |
| 同config --project native-integration test/sync | 0；5文件92真实TEMP Git测试；git.log；无真实用户Git写操作 |
| node --test scripts/diffs-languages.test.mjs scripts/diffs-owner-document.test.mjs scripts/license-texts.test.mjs scripts/third-party-notices.test.mjs | 0；17/17；scripts.log；实际两Worker图、raw源回环、unknown/篡改拒绝及URL失败清理 |
| node --test scripts/ui-review/run.test.mjs（Root T09条件分支变化后） | 0；6/6；runner-checks.log；非矩阵 |
| node /tmp/huhu-t16-final-high/asset-semantics.mjs | 0；8语言deepStrictEqual、default数组/条目冻结语义；asset-semantics.log |
| pnpm exec tsc --noEmit --skipLibCheck -p /tmp/huhu-t16-repair/tsconfig.json | 0；types.log空；源及相关测试局部图，不是全仓 |
| pnpm exec eslint --max-warnings 0 <41个owned生产TS/TSX> | 0、零警告；lint-result.json列实际文件；未把忽略的mjs/测试算lint通过 |
| node scripts/third-party-notices.mjs --check | 0；130 npm/73 terminal crates；notices-check.log，write:false内存build，没有写NOTICE |
| 上游固定MIT原文对照与SPDX D.2回读 | 通过；upstream-license-verification.json；headless整文件hash相同、lru完整MIT段相同 |
| validate-specdev --review-scope --mode source-files | 0；92存在路径；5删除单独核对；review-scope.json/err |
| validate-dispatch --stage dispatch | 0；errors=[]/warnings=[]；dispatch.json |
| 69复合candidate/Root许可8/必要context末次hash、模式、删除状态 | 通过；97路径drift=[]；已明确记录T09-only中央runner替换而非静默忽略 |

082的原Chrome main/iframe诊断已读：生产factory每owner创建/释放3个URL、官方initialize/file消息完成真实高亮，parser与官方结果一致、cancel=AbortError；5个压缩源与当时相同，属于可复用作者实证，**不是本reviewer重跑、更不是完整Obsidian**。原070的owner适配双Document负/正控制同样保持其原边界。

没有运行全66、真实Obsidian/popout、真实OS打开/用户clipboard、全仓build/full lint/full types或生成资产；未复核Rust终端整个领域。两份068 dirty起点缺字节的限制如前明确，不伪造完整历史diff；当前完整候选安全/功能通过来自实际源码、073真实差异、临时Git/库真实路径与仍适用的原独立证据。未调用工作区Git写命令，但没有初始live index字节指纹，故不把“未写”冒充独立index前后hash证明。

## 问题与下一步

070实际八项（七项073修复+Root ST-03 NOTICE）均已闭，本次source双轴无待修复finding，冻结已释放。Root可继续按最终固定输入完成T16最后正式66、真实宿主与资产/Evidence收尾；并行T09条件分支不改变本报告的T16源结论，若T16候选再变则按实际影响重验。原070/073/082/089报告与本次REPORT均保持不可变，不提交、不推送、不擅改正式票据状态。
