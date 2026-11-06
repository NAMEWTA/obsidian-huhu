---
schema_version: 2
session: "20261105T094057Z"
task: "101-review-t07-t11-final"
kind: review
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-07"
---
## Goal
独立high窄审096导航取消修复、099通知精确去重及Root测试IO/driver补充；复用093/097未变完整结论，两票标准/规范分别给结果。T07另确认一条真实native回焦失败的归因，不直接修复。
## Inputs
AGENTS/dev/ui/SpecDev独立审查，Map38/Goal/Spec/T07/T11/DESIGN3/UI002摘要49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66。用户medium实现/high审查16票持续。
093 REPORT d88b03b679983ead81d34249a76af2124183976c42d1181bcbbed2f0e0a7f370完整59源发现dirty await navigation signal缺口；096 REPORT SHA636b39d2dcd9c620dc8c27e406819cf33747788e51309adac6f41b1fa90f1646，61候选/tmp/huhu-t07-navigation-repair/final-candidate.json SHAc63424b7ee0c54c2735be666a469344c074e8dd17376db56ec1d4e865d55794a：signal贯穿await、fixture每Doc createDiv、原automation.test真实provider+交互迁移。旧REPORT诚实163/164，当时T11精确去重未修；099后原样完整23文件164/164+类型0，后续combined-verification.json SHA81956e6260babf404d2e8971db8836dbaa1918998ea16b6e2795131d33729e20，原zh/en/zh、structured/free text/Open/delivery/time和尾空格控制均保留。
097 T11双轴PASS原四项关闭，44候选/tmp/huhu-t11-review-repair。099不可变REPORT及/tmp/huhu-t11-exact-reminder真实before/新diff：仅InboxPanel完全相同正文省略，不trim，4DOM红→绿，跨票原测试全绿。Root新测试helper quick-pick.test-support.ts原固定stage ID造成CipherRepository.commit嵌套backup写销毁main stage；现用每fixture递增唯一stage ID，不改生产服务/crypto。真实mutation→lock→unlock私有counter红storage→绿，日志/tmp/huhu-native-fixture-repair/stage-{red,green-final}.log。原一次错误类型断言数值deletedAt也保留更正日志，不计入产品finding；实际模型ISO。Root T11 driver用真实role=menuitem并补缺失exercise cleanup，原20表面390/private已全部passed，Root正式66正在跑。T07 driver两DOM赋值加void避免CDP序列化Node，未改断言。
当前两票完整union 105源 /tmp/huhu-t07-t11-final-source-review/manifest.json SHA2a8a8c6b866d938cec40aced3023970667f243e4d00a65ffbda8c52d4a309aea；明确Root上述叠加而非静默忽略原候选drift。
Root T07 private390最新 /tmp/huhu-t07-retained-native/result.json 在coarseRowControl:135失败 exact edit source focus。经过实际编辑/dirtyDiscard后配置320/coarse，通过trusted touch打开clean editor→Esc，页面已关闭但要求activeElement精确回edit button超时。请按actual driver/UI归因：touch是否本来不focus触发button、driver是否等待错误实体，还是产品丢回焦；可读private原图/生产source，不重跑完整66。若真实产品缺陷记录精确P2/满足条件，不能删回焦断言或改生产求绿；若仅触摸原生焦点语义，应给可复现正确对照/最小driver修正建议，Root处理。
## Workspace and Scope
只读105 union source和必要上下文（以manifest实际数为准）；仅101不可覆盖REPORT，过程/tmp/huhu-t07-t11-final-high。RootT07 driver仍做诊断不冻结整文件，但产品61与T11 source不改；其它T08/T10大票并行不冻结。无code/assets/state/Evidence/index写入、不委派、不跑全矩阵/用户vault/clipboard。必要真实native单控制可沿现Chrome fixture私有driver，记录边界。
## Acceptance
096原093真实binding→surface→dirty guard取消反例转绿，正常未abort允许，生命周期/草稿保护不退；真实provider测试迁移不能删业务断言。099只exact而非trim去重、语言与不同正文保留；Root stage唯一ID满足真实CipherFiles嵌套写语义、保留主backup验证/失败，不发明成功。Rootdriver修正不减少表面/assertions，真正cleanup可观察。T07回焦按实际证据分类。
复用完整未变093/097基础审查，不重验原域189或无限扩推测树；适量定向tests/types/lint。两票两轴结论，source通过不代表Obsidian/popout/真实clipboard/full66。
## Return
不可覆盖REPORT含聚焦交接/产物与验证/问题与下一步、独立性/来源/两票两轴/finding归因与位置/命令退出/限制，始末hashmode与Rootdriver允许差异明示。return0并释放冻结。
