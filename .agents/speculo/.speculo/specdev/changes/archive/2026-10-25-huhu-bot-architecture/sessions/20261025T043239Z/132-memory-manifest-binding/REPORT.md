# 无正文记忆manifest绑定交回

Session: 20261025T043239Z
Task: 132-memory-manifest-binding
Status: completed

## 聚焦交接

新增 `api.CanonicalMemoryInputManifestBinding(ExecutionMemoryInput)(string,error)`，供真实维护job在读取正文前核固定清单。它要求所有entry.Text为空，与完整入口共用一个私有canonical校验/投影/编码；仍校验版本、模式、namespace、job代/settings、Ref/role、重复与数量、完整Targets及排序。原完整入口继续校验实际UTF8、正文hash和128KiB总正文，不经metadata模式绕过。

只改授权的[生产文件](../../../../../../../../../native/huhubot/internal/application/api/memory.go)和新增[同包测试](../../../../../../../../../native/huhubot/internal/application/api/memory_manifest_test.go)。生产SHA为`855d2374f3b77d90cee7a884046f3743d588b5399d7b9979fb7104b4ce528346`；测试SHA为`32f9f503355f7acbb66201f5cebdd6430e2c39f05682dfb71ed0d55a3b939c42`。精确消费合同（历史日志已清理：`logs/interface-contract.md`）已原生发126与128：返回digest与持久expected及input.BindingDigest均须相等，再核真实job/namespace/principal/profile/pin/source scope/Targets/current事实；授权后hydrate仍调用完整入口。本helper不是读取许可，也不验证不可得原文长度或内容。

129完整运行TASK仍未完成，本次未恢复其写集。其18个checkpoint文件逐SHA复核无漂移（历史日志已清理：`logs/09-final-source-verification.json`）。T14实际业务、运行集成及正式代码门仍由各原owner和Root后续验收。

## 产物与验证

所有Go命令固定`GOTOOLCHAIN=go1.26.10/GOWORK=off/GOEXPERIMENT空/GOFLAGS=-mod=readonly/GOPROXY=off/CGO_ENABLED=0`。初始22来源、最终23来源包含整个api包、两锁及原fixture；唯一差异为上述两个授权文件，其余21来源不变。每命令保存输入清单、原始输出、actual exit、实际Wait、耗时及sourceDrift。

| 实际命令 | 结果 | 原始证据 |
| --- | --- | --- |
| `go list -deps -test -json ./internal/application/api`，改动前 | exit0 / Wait / 0.117s；106包，只有api与标准库，无Core/SQL/活动writer | [输出](logs/01-api-closure.log)、结果（历史日志已清理：`logs/01-api-closure-result.json`）、闭包核对（历史日志已清理：`logs/02-closure-verification.json`） |
| 旧完整入口，`go test -mod=readonly -p=1 ./internal/application/api -run '^TestMemoryInputManifestBindingPreservesIndependentFixture$' -count=1 -timeout=60s -v` | **exit1 / Wait / 0.417s**；编译成功，两个合法删正文manifest均被原入口以MEMORY_INPUT_INVALID拒绝；不是未定义符号编译红 | [原红](logs/03-manifest-old-entry-red.log)、结果（历史日志已清理：`logs/03-manifest-old-entry-red-result.json`）、原测试字节（历史日志已清理：`logs/03-red-test.txt`） |
| 新入口，`go test -mod=readonly -p=1 ./internal/application/api -run '^TestMemoryInputManifest' -count=1 -timeout=60s -v` | exit0 / Wait / 0.467s；4顶层、60子场景，全部通过 | [原绿](logs/05-manifest-api-green.log)、结果（历史日志已清理：`logs/05-manifest-api-green-result.json`） |
| 最终测试输入同一`go list` | exit0 / Wait / 0.115s；132包含testing及其生成的api测试包，仍无闭包外生产包 | [输出](logs/06-api-test-closure.log)、结果（历史日志已清理：`logs/06-api-test-closure-result.json`）、核对（历史日志已清理：`logs/08-final-closure-verification.json`） |
| `go vet ./internal/application/api` | exit0 / Wait / 0.115s | [输出](logs/07-api-vet.log)、结果（历史日志已清理：`logs/07-api-vet-result.json`） |

初始和最终闭包中的stdlib Root都明确为已安装的go1.26.10工具链目录。所有产品命令sourceDrift均为空，没有超时或残留进程。

旧`memory-bindings.json`保持SHA `99a2ee07347b1b1a34dfd98c35aae7f8488621d50aaa503ea89d1e446a76a22a`，两份独立Unicode/HTML控制字符golden同时验证原完整入口和新manifest入口；新增维护/Targets固定摘要另由独立Python投影（历史日志已清理：`logs/04-independent-maintenance-golden.json`）计算为`sha256:d67fa6621d7ea799d2856fbb85f77b4414342b181c7dd7fd77575ba2f1a26ea6`，嵌在新测试中。不是只比较两个共享实现彼此相等。

测试还覆盖所有canonical关键metadata变更、Targets输入排序/不变性/固定head/pinned、entry有序性、重复/无效/超界、recall20/maintenance128/Targets32、128KiB完整正文边界、UTF8/正文hash反控、metadata入口拒任意非空Text。BindingDigest本身不参与自身散列，显式留给caller与持久事实比较；metadata无法推断被删去的正文总字节，完整入口仍拒超额正文。

交付清单见[manifest](manifest.json)，正式只读结构return校验见结果（历史日志已清理：`logs/10-return-result.json`）。正式状态由Root持有；结构校验不替代原始执行事实或独立代码门。

## 问题与下一步

本窄任务无已知未闭合问题。未运行Core、foundation、common、driver、数据库、插件构建、TS/Node产品检查或全仓测试；这些均在本任务窗外。没有改DTO/wire/schema、旧fixture、锁、generator、implemented flags、Engine/Inspector调用或129任何受控产品文件，没有提交/推送/发布。

126/128现在可以消费该纯入口，但旧scope放行仍须依实际bound job与当前事实验证；这部分尚未由132装配或证明。129后续仍需消费DeriveMaintenanceInTx及ContextUsageInTx并完成真实组合检查。Root将固定最终字节交133独立审查，本报告不代替该门。

产品两文件已停写，全部产品进程实际Wait；完成本目录manifest/return回读后原生MESSAGE及FINAL停止交接写。
