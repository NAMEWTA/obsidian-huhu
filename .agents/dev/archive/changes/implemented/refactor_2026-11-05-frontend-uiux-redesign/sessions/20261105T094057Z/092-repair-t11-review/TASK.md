---
schema_version: 2
session: "20261105T094057Z"
task: "092-repair-t11-review"
kind: implementation
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-11"
---
## Goal
修090实际四项T11 finding，优先P1新QuickPick入口复制被取消；不重启完整三模块、不改域服务。
## Inputs
AGENTS/dev/ui/SpecDev I/适用测试合同；Map30/Goal/Spec/T11/UI002设计摘要49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66。用户medium实现/high审查授权。dev0c2a3309d1b00920539376a02c98485a98442c002945f0ee2e6ce8b816cfb744、ui12621917181e3a74f3a410a710752e8e856d9a84af739ef6c97c85f79bca1ad4。
完整090REPORT与/tmp/huhu-t11-high-review实际反例，087candidate41/21变更manifest SHA629bb90ee5c2804db279d381101a2d3f213d486e54b7d0dd24612844513c3b6b和真实baseline/tmp/huhu-t11-implementation。090已释放。Rootsafe.quick.hint已按真实30s与ShiftEnter更新；detached非密码节点只属既存观察，当前body无明文且密码已清，不把它升级成已证实新泄露。
## Workspace and Scope
只写T11既有UI writable，优先SafePage/QuickPick/HealthPage/InboxPanel及必要相邻DOM；REPORT/tmp/huhu-t11-review-repair。core/services/platform/api/密文/扫描修复只读；Lead3ui/i18n与module字典、全局共享/资产/状态/EvidenceRoot独占。新键先发具体双语提案。无delegation/commit/index/worktree/node_modules/用户vault/真实clipboard。
## Acceptance
S1/P1真实SafeService/WebCrypto/内存clipboard：SafePage新inline onClose随父busy更新改变，QuickPick依赖它cleanup abort复制导致writes=[]。稳定生命周期owner，不让回调引用变化取消同一操作；保留实际close/lock/unmount取消与Clipboard仍拥有才清，重用稳定callback/ref已有模式，不造服务。
S2/P2：无resourceId常规路由，旧plan pending期间另一叶扫描得到新报告，旧rescan-required错误不得显示/污染新报告；依据实际resolved report identity，非只props section/reportId，保留活动错误/重试。
SP2/P2：用户freshness60min不代表5min repairPlan还有效，过期/changed plan明确失效并提供真正重新扫描/生成的UI入口，不能只泛化error后保留不可重试preview或延长域TTL。
SP3/P2：通知中文ID标签硬编码11px改批准≥12 token，不改其它无关版式。后3按继承缺口归因，不冒称新回归。
TDD原真实反例与正常busy/取消/重试/新scan控制，保留原66DOM/189domain/safety风险（不机械重跑没变的domain全部），必要types/lint/fixture--check，未测native/宿主诚实保留。不得放松确认、安全门或改域数据求绿。足够即冻结完整UI候选/差异/模式hash，停止待high；不扩推测边缘。
## Return
不可覆盖REPORT含聚焦交接/产物与验证/问题与下一步、逐项证据/原始red/finalgreen/命令退出/局限/完整起点与candidate。过程仅/tmp，Root写正式Evidence/state/产物。validate-dispatch return后停止。
