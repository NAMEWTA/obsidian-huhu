---
schema_version: 2
session: "20261105T094057Z"
task: "085-propose-shared-budgets"
kind: planning
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-16"
---
## Goal
为Lead准备可直接应用/复核的最小共享预算补丁，先实际分析再私有代码/验证；仓库源码只读。不是独立code-review，不宣告任何预算通过，Root在精确replan后应用并另high。
## Inputs
用户授权medium实现/high审查所有16票，Root继续同一Goal。AGENTS/dev/ui/构建许可/研究复用、Map28/Goal/各相关Ticket，设计/预算不变。Root真实初始图/tmp/huhu-module-migration-bundle-initial.json和T16压缩前元图/tmp/huhu-t16-bundle-optimization/before-meta.json；当前082优化后main8389046>8252416（差136630），eager140746>135168，agent activation约1399311>1385472、navigator204576>203776、task169192>167936、versioning204512>195584。T09最终源码已冻结（原budget测量期间变过，须重新实际测图），其它峰值也须以新图为准。压缩已用fflate0.8.3/MIT，Root安装完成/tmp/huhu-fflate-install.log；08269项冻结，不修改。
已知精确最大源：Iconic core/res/lucide-keywords.json实际162073 outputbytes，emojis.json150265，两个都只从platform/utils/resource-utils.ts已有动态import加载；原JSON、许可与pinned upstream oracle必须原样保留。可仿082成熟gzip+函数级fflate对两JSON构建传输压缩，保留原实体metafile/包归属，default导出形状/身份/可变性/Unicode与首次加载位置不变；不新压缩算法。新脚本及esbuild/runner插件接缝在私有补丁，Root再分配；不要真改源。
实际eager最大：huhu启动词典9381、workbench6159、theme/settings4439/runtime3936、compose-workbench12551。versioning activationi18n65343最大（082已查），new hunk helper只有1638所以不要重写事务求9k。优先source-backed拆UI词典懒加载，保留命令/native/服务/编辑器extension启动所需字面与动态prefix。注册UI词典只能真正UI入口，不可在module激活直接await import假懒加载。module.ts直接dynamic非*-page（dialog-factory/conflict-extension）仍计activation；须读checker规则。task/navigator/agent若需小额同类拆分先识别真实闭包，不能改业务语义。不要自动全包压缩所有启动词典造成fflate进启动。
## Workspace and Scope
仓库全部只读，唯一此不可覆盖REPORT；所有补丁/副本/esbuild私有覆盖/元图/日志在/tmp/huhu-shared-budget-proposal。优先精确src/shared/i18n/workbench.ts与真实shell UI注册、versioning/i18n与最少UI加载入口、两个Iconic静态JSON构建接缝，不碰源JSON/许可/pinnedoracle/lock/node_modules/当前其它票源。Root14T12共享虽081释放但083在修模块；084冻结T05源/词典、082冻结T16候选，不能落任何实际源变更。允许创建private完整源覆盖后真实内存build和定向测试，输入/改动与并行波动诚实记录。无delegation/worktree/commit/index/assets/vault。
## Acceptance
给Root实际文件/调用/依赖/精确新路径列表与可应用patch；分析必要非UIkeys与动态key来源，旧完整en/zh集合在启动+UI加载后逐键/placeholder一致，切lang/多owner/模块停启不丢词，UI索引搜得到仍能定位。不要删功能/改文案/namespace或永久知识，不为预算把key移到另一个同样startup被导入文件。资源压缩保持2真实物理输入、原source字节/JSON语义、真实UI调用加载顺序/缓存和许可、未知source/坏asset有失败，fflate不进eager或新activation。预算阈值/forbidden包不改。实际元图报告每类差值，必要test在private可执行（不能仅grep或mock函数证明加载时序），最终Root还会真实UI与全门。足够达到目标的最小补丁即可，遇Scope需Root决定交具体方案不要空等。
## Return
不可覆盖REPORT含聚焦交接/产物与验证/问题与下一步：事实、补丁位置、精确需增scope、真实红绿/图/byte/命令退出、风险/未验证。所有过程JSON/code/hash/PNG只/tmp。validate-dispatch return后停止，Rootsole shared source/资产/Evidence/state owner。
