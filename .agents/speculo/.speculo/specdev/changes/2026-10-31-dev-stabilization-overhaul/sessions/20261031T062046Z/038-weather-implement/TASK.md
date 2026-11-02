---
schema_version: 2
session: "20261031T062046Z"
task: "038-weather-implement"
kind: implementation
change: 2026-10-31-dev-stabilization-overhaul
ticket: T-15
---

## Goal
native:/root/baseline（Astra low）完成T15天气全请求生命周期服务层，保持真实数据/多看板隔离。T01/T16已done；T12四文件冻结等待用户远程许可，不再改其测量/候选。

## Inputs
Map20、Ticket15、AC221、dev/testing、execution-boundaries、现有board-store/weather-service及真实ClockWidget消费者/验证脚本/持久层。先检查实现与相关既有决定，陌生机制按research合同最小查证，不直接从零重写。

## Workspace and Scope
current/dev/base86c500556db1d64865c4cc7f1aff1dd83de071fa。只写src/modules/home/services/board-store.ts、src/modules/home/platform/widgets/weather-service.ts、scripts/verify-weather-mapping.ts、scripts/verify-dashboard-isolation.ts、本REPORT。需要就近unit测试或私有接缝扩围先列精确路径，不自行写。Home i18n归Lead，提交具体en/zh键再由Lead串行修改。ClockWidget/UI只读，不混入T26视觉；board-store含Browser相关逻辑及T16已验收路径常量，必须原样保留。shared产物/其他票/正式Evidence/Ticket/Map/ledger只读，无Git写入/递归代理/远程CI/真实宿主。

## Acceptance
修改前简列真实入口/调用方/依赖、最小预计变更与可能受影响文件/验证范围。预算覆盖缓存读、主备Provider、缓存写和发布；不可依赖任一悬挂Promise才能到达明确终态/可恢复态。旧缓存带时间、刷新/过期标识，不能伪造天气。保留request sequence、board generation、location key、disposed/visibility和Vault归属；可丢弃缓存写不得阻止显示，晚到写不跨Vault/代次。若底层写API无法取消，必须先识别实际ownership保护接缝，不能仅忽略Promise结果就声称旧写不发生。
错误类别/重试入口数据为真实消费者可用但不改UI。两看板/多实例测试逐阶段held gate和错误，验证未配置、成功、主备失败、缓存读/写悬挂、晚到、切换/隐藏恢复；避免用简单sleep/扩大timeout替代资源断言，不以重建store绕过真实生命周期。仅服务层最小充分修改，保留持久化路径/其他widget行为。
先定向红绿，实际weather-mapping/dashboard-isolation/i18n、类型及定向lint，按testing选择。不默认跑全量/Browser构建；shared styles/main由Lead下次串行构建。必要test工具可用OS临时输出，不改node_modules源。如果涉及持久化或公共类型需记录下游真实影响并补最小接缝。

## Return
标准REPORT，精确SHA、调用链/状态合同、红绿及全部真实命令退出、未测/限制、新词典需求。完成后停写交Lead独立检查，不标Ticket done。

### Lead追加精确回归写集

Map21/T15-D01批准src/modules/home/services/weather-store.test.ts、src/modules/home/platform/widgets/weather-service.test.ts。先等Lead wave5产物构建解除冻结，再改产品/测试；期间可继续只读和计划。遵循D01真实I/O不可撤销边界，guard保护尚未发起步骤、固定旧storage/location和同key排序，并实际断言旧代结果不覆盖当前投影/后继缓存。没有host底层扩围，不另造队列。
