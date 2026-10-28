# Map35：共同 Engine 的独立 Go 组件窗口

130 已固定 direct-first-red-ready 候选，实际外部测试经 common Engine、Chat driver 和真实 SDK 请求本地 HTTP。静态本仓库 import 闭包只有 `internal/adapters/outbound/eino/common`、`internal/adapters/outbound/eino/chat`、`internal/application/api` 三包及 go.mod/go.sum，共29文件；没有 bootstrap/Core、SQLite、private memory、Executor、TS 或跨进程 CLI。当前 common 全源与测试冻结，chat/API/锁沿已接纳输入只读。

Root先核29文件 hash 和测试源码，授130精确 `go list -deps -test -json` 元数据检查。实际 Go 闭包必须再次证明没有126/129写集，也没有新 embed/TestMain/init 引入动态依赖，才执行 `go test ./internal/adapters/outbound/eino/common -run '^TestEngineSealedContextAndRecallReachRealSDK$' -count=1 -v`。Go list 若发现其他本仓库依赖，先交Root重核，不能自行忽略。检查完整保存实际输入、工具链、退出码及 Wait。

因此126私有Store/SQL与129 runtime/Core当前仅源码写入不必为这一个隔离的组件检查停写；这不允许它们同时执行Go产品检查。130为当前唯一Go检查者，Root后续逐次准许同闭包定向检查时仍冻结其真实输入。共享API、schema、driver及锁不可改；新导入或默认Core/整个engine-chat包会扩大闭包，必须回Root重排。130的公共StartRun测试目前保留源代码，尚不运行。

Map34的限定TS/Node输入边界继续成立。最终真实Memory Store/Core/SQL账户/权限/stdio/TS组合门仍冻结全部相关源码，由Root单窗执行。这一组件的Attempts记录夹具只观测真实SDK发起与producer结算，不证明持久账户选择、当前Grant资格或Memory数据库完整性。

此修订只细分T01/T08/T14的实际资源实例，不更改28票55AC、产品合同、DAG、原owner、用户现场后验或既有Gate。127已交回的有效检查保留；Root新发现的namespaceRevision范围漏校验由同TS owner的131最小后继修复，127原报告不覆盖。
