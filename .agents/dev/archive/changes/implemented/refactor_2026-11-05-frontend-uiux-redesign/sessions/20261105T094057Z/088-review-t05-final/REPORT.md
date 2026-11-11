# 任务回报

Session: 20261105T094057Z
Task: 088-review-t05-final
Status: completed

## 聚焦交接

Reviewer：native:/root/review_toolchain，原gpt-6.1-sol high独立角色，未参与086或Root词典修复，没有实施或委派。**standards：request-changes；specification：request-changes。** 084原三个P2的原始症状均关闭，新增真实异步record到达也通过；必要route复验确认一项P2残余R01：脏A等待切B确认时，更新route回A没有撤销旧B确认，旧Discard仍可丢掉A草稿并跳B。

**明确释放086两项生产/测试及本次53项必要输入的review冻结，供Lead/原owner最小修复。** 首尾53项字节、模式、无symlink核对drift=[]。仓库只写本不可变REPORT，过程代码/日志/JSON仅/tmp/huhu-t05-final-high-review；无源码、fixture、配置、依赖、资产、Git/index、正式状态或Evidence写入，084/086原报告保持不变。Root/089预算与词典、T11/T12等图外写集不因本报告被冻结或宣称已审。

## 产物与验证

### 固定输入与复用边界

Review mode: source-files；Risk: high；Independence: required；Strategy: independent。实际派遣为088 TASK及Lead工具消息，不递归委派。规范/标准来源沿084，只加载当前T05修复与实际route风险；非重启全票审计。

086原REPORT SHA256 **ddd7f3a1733b305edf6dc215e1c854b252d974e32c588e95b0441de86929354d**已回读；/tmp/huhu-t05-review-repair/baseline.json及两份before.tsx实际字节与084候选相同，变更仅TaskPage.tsx和task-domain.dom.test.tsx，无增删。候选两项SHA分别253d25b699776439be548a1a16f49c5c8d1ea8233714a115d0c6b0ef55d0ca94、816f1d63bf62979f96780cf4fc34600edabbe3b2253b0c86fc2f092bc34894dc。

自有candidate/与manifest.json固定作者最终53项，清单原文件SHA256 **be072b5c3f45518bb6fb0c04a2d7bcceeb8b790034aa803d11c8ce35ee78cbaf**；作者source-mode聚合摘要e66415562cf745d48244a239f2cdd017f4ac827b80836c1834ca41e3678a9f45使用另一序列化，二者不混同。initial-/final-verification.json记录：相对084，另有Root移出task.error键的task/i18n.ts与workbench-page.tsx入口import变化，并新增task/ui/i18n.ts上下文。已实际读这三个变化，纯UI双语键在真实workbench入口注册，符合当前dev SHA **0c2a3309d1b00920539376a02c98485a98442c002945f0ee2e6ce8b816cfb744**；不将批准拆包误报漏键，也不以测试预载证明真实加载时序。完整预算/词典审查由089负责。

其余084已通过源、080日历/TaskRow命中修复、069/075/078已闭共享日期/strict service输入未变，适用结论复用，原报告中的未验证宿主边界不被升级为通过。标准AGENTS/dev/ui/review/risk；规范当前Map30/Goal/Spec/T05、DESIGN3/UI002，设计绑定仍49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66。authority.json SHA256 **eb35bdb0dbeca81f4ed96b3f1fe6aa88b95634e783b86148af59b2b244dd4924**，review-input.json Input-SHA256 **de5a76edd4b84144ad91ee6371fa7d56e2d03aae59f251c1dec60a41ad22dd09**，公共review-scope成功固定全部53项，权威原文与source均无漂移。不使用HEAD替代dirty起点，不制造Git历史。

### standards 输出

Reviewer: native:/root/review_toolchain
Axis: standards
Result: request-changes
Input-SHA256: de5a76edd4b84144ad91ee6371fa7d56e2d03aae59f251c1dec60a41ad22dd09
Finding: R01/P2。

**R01/P2 — 已消费的新路由没有使旧的待确认切换失效。**

位置：src/modules/task/ui/TaskPage.tsx:131–138、606–610。routeSelection正确避免不变route持续拉回内部选择，但消费新selectedId时只处理selectedId!==selected的情况；当新route等于仍在编辑的当前记录（或清空请求），原nextSelection未清。确认的Action仍无条件setSelected(nextSelection)。

实际可达顺序：外部route A打开真实Alpha→把标题改为Local draft→外部route B触发dirty确认→外部route回A。此时当前记录仍A，新route也已是A，旧B确认却继续存在；点该旧Discard后实际标题Beta，最新route仍task:alpha，A草稿被丢。并非只有多余提示，也不是mock的保存/假详情。私有page-lifetime.dom.test.tsx使用生产TaskPage/TaskEditor和真实createTaskService/repository，沿实际TaskPresentation传入的selectedId契约rerender，只提供外部resource/views ports。LATEST_ROUTE证据为returnToA=true、route=task:alpha、stalePrompt=true、title=Beta；同样dirty A→B不回A的阳性控制正确显示Beta。route-counter.log为1red/1green；最终连同原四控制一起运行是1red/5green。早期仅断言旧提示存在的route-replacement.log保留，不冒称另一缺陷。

满足条件：每次实际新外部导航请求消费时，先使旧待切换意图失效，再按最新目标建立必要dirty确认；目标已是当前记录时撤掉旧确认并保留当前草稿，清空请求也不能留下过期切换。后来的有效B/C请求与KeepEditing/Discard继续工作。不要删除dirty保护、忽略所有外部route或靠旧确认最终自动拉回A掩盖草稿丢失；补上述A→B→A反例及普通dirty A→B控制。

原finding逐项复验：

- **084 S01原关闭/本地选择问题关闭。** routeSelection显式消费selectedId变化，仍保留依赖，不是删effect依赖绕过检查。原深链Close与普通本地Close都通过；消费A后本地切B、外部B→A及清空后再请求回归通过。R01是该真实route合同尚未完整处理的pending确认分支，故不能因此宣布整个route通过。
- **084 S02关闭。** completionScope按query/date/order/offset/view/compact/selected实际依赖建立身份，完成前捕获且await后核对；离开再回相同搜索也产生新身份，不把旧完成结果填进新held/undo/error。pending finally清理、真实execute及同查询1.4秒、失败重试、条件revision undo未删。原Alpha/Beta延迟反例与不换查询控制通过；filter/view/selection/search-away-and-back四个边界绿。offset未加进重置offset的effect，未引入分页被立即拉回首屏问题。
- **084 S03 source关闭。** 状态SegmentedControl直接使用既有wrap，四选项/计数/键盘实现保留，无共享CSS或基础组件变更。Lead当前正式66结果passed/errors[]可回读；本review不重复浏览器，不把单纯DOM换行属性当像素证明。
- **异步record到达关闭。** TaskEditor只在selected且tasks.get(selected)存在时挂载，避免原始useState(get)读取空记录后永远保留空draft。真实TaskService在挂页后创建task:late，实际标题Late route record通过；key=selected及原Signal/清理保留，无新store或域写入。

### specification 输出

Reviewer: native:/root/review_toolchain
Axis: specification
Result: request-changes
Input-SHA256: de5a76edd4b84144ad91ee6371fa7d56e2d03aae59f251c1dec60a41ad22dd09
Finding: V01/P2（R01）。

084原三个症状的目标修复、strict服务/日期/日历其余未变范围符合原T05合同。**V01**仍不满足088显式外部A→B→A真实请求及T05稳定详情/草稿归属：最新路由已回A，过时B确认仍可丢A草稿并打开B。修复无需改业务schema、保存语义、DESIGN或新增路由store，只需正确消费当前切换意图。

### 实际检查和局限

| 命令/检查 | 实际结果 |
| --- | --- |
| pnpm exec vitest run --project dom src/modules/task/ui/task-domain.dom.test.tsx | 0；28/28通过；owned-dom.log，含原完成/undo/失败/CAS/raw及新增route/late record |
| 原084私有4个counter，在当前源重跑 | 0；4/4通过；counters.log；没有改原断言换绿 |
| pnpm exec vitest run --config /tmp/huhu-t05-final-high-review/vitest.config.mts | 工具实际退出126；最终1失败/5通过，共6；counters-final.log；唯一红为R01，原4控制及普通dirty A→B均绿 |
| -t 'dirty switch confirmation' | 工具退出126；1失败/1通过/4跳过；route-counter.log，真实最新route与Beta结果已输出 |
| pnpm exec eslint src/modules/task/ui/TaskPage.tsx --max-warnings 0 | 0、零警告；lint.log；未声称被忽略测试的lint通过 |
| pnpm exec tsc --skipLibCheck -p /tmp/huhu-t05-implementation/tsconfig-fixture.json | 0；types.log空，必要实际fixture源图；不代表全仓types/build通过 |
| 公共review-scope，53个source-files | 0；review-scope.json/err |
| validate-dispatch.mjs --stage dispatch | 0、errors=[]/warnings=[]；dispatch.json |
| 086实际baseline两份副本、最终53源/模式/无symlink与authority | 全部一致、drift=[]；initial-/final-verification.json |

Root /tmp/huhu-t05-lead-review-final/result.json为status passed、66 cases、errors=[]，inputDigest **531d51d1a18cbfce6ed22ea5bc8ace58198c23f58542896808d4f303a72e9206**。本review核对30项已打进该bundle的本次输入hash全部匹配，无in-scope mismatch；未在bundle使用的其它固定路径不假称已浏览器覆盖，也未替Root重算整个依赖/ASAR图。最终全inputs/视觉对照和真实Obsidian验收由Root持有，66不覆盖R01的脏route替换序列，不能代替其语义判断。未重跑084全108/46或原生、未build/改assets、未将089预算/词典或其它票图外债算入本次源修复结论。

## 问题与下一步

原三个P2具体修复成立，但R01仍须最小修复；已释放冻结，原owner可处理新route对过期nextSelection的失效并导入本轮实际红灯/阳性控制，再单独冻结定向复验。Root可复用未变正式矩阵/084证据，按修复影响决定必要补验；不能先将完整route或T05交付宣布通过。本不可变报告保留真实原结果，不随下一次修复覆盖。
