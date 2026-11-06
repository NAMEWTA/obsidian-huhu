---
schema_version: 2
session: "20261105T094057Z"
task: "075-review-t06-shared-repair"
kind: review
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-06"
---
## Goal
独立high复验074档案4项修复与Root共享日期/用户关闭/NOTICE修复。输出standards与specification双轴；不实现、不委派、不扩大到推测新功能。
## Inputs
AGENTS/dev/新ui、Map23/Goal/Spec/T05/T06/T07/T16相应合同、DESIGN3/UI002；批准摘要不变。你原069报告及真实反例可复用，已有未变化的通过证据不机械重跑。074最终候选40项/tmp/huhu-t06-repair/frozen-manifest.json SHA9a1e70c55271d567357aafc086629f25257bc39a6ccfd41f471508fac1899e12（35原+5测试）；真实起点startpoint-manifest.json SHA585a0ce1d906f7c3b95f673aa445c2bb5f738333950d69cf1344512961d878e8及067/069既有baseline。074 REPORT写毕再实际读取；候选已停止写入。
Root8项在/tmp/huhu-shared-review-repair/frozen-manifest.json与frozen/；before/是本轮实际起点。DateTime/DateField/测试、workbench-host/WorkbenchPages/测试、third-party-notices/新测试。其余069已核对共享端口未变可对原069manifest复核。Root本轮红绿：日期2red→32DOM全绿；host4red→14hostDOM全绿；NOTICE真实parser漏图red→双Worker独立真实entry绿。指定shared/host全图tsc skipLibCheck0、6生产源eslint0，i18n33字典5567keys0。实际日志/tmp/huhu-shared-review-repair。pnpm check:docs错误命令126已改test:docs0；首次词典merge只加en已修zh后i18n-final0，未隐藏经过。
Root初次T06native390超时是Enter文本参数与iframe遮挡，074仅补CDP Enter text及frame zIndex和parentHit断言；当前同样本main/iframe实际pass、不是Obsidian popout。Root正跑正式66，review无须重复native/资产。
## Workspace and Scope
仓库全只读，唯一本任务不可覆盖REPORT；原始材料/tmp/huhu-t06-shared-repair-review。先核对完整40+Root8实际源码/模式/删项及依赖，审查输入冻结；不冻结T07/T16正在实现的无关源码。T06新owner为native:/root/repair_t06；Root独占shared8、正式状态/Evidence/资产。Root不会再写这8文件直到review释放；词典只作必要上下文，不把其它模块活跃词典算冻结候选。无commit/index/worker配置/build/样式写入。
## Acceptance
逐项验证069 S01–S05及074实际更改风险：partial offset保留片段/精度/外部reset；discard每个await之后live原session检查；custom record/relation schema reload与失败重试保留input/dirty/焦点且不可用禁止真实save；121同名实体按真实offset/limit/total跨页可达、路径消歧/selected pin，不提高上限。DateTime同日time-only/zone-only raw和可见文本一致，同一input DOM/焦点/IME及clear；不得key重挂。WorkbenchPageBinding可选canClose仅用户close await、同entry合并一次、veto不销毁，await后检查currententry身份；hidden不prompt，dispose/availability无条件清理，旧决策不作用到同key新页面，原生不可取消onClose不冒充veto。NOTICE实际显式纳入main和两Worker entry元图，无测试替代真实CLI范围；最终资产因T09/T12旧消费者构建债待Root，不称NOTICE通过。原批准API/数据/预算/设计不变。对具体问题给路径/行/影响/满足条件，区分真实残留与全局旧迁移债；通过仅对应此源码与定向测试，非完整宿主/像素。
## Return
不可覆盖REPORT含聚焦交接/产物与验证/问题与下一步；分双轴与明确source identity，实际命令/退出码/限制、无漂移检查。原始JSON/测试/日志/截图只留/tmp。validate-dispatch return后释放review输入冻结；不修改任何正式状态。
