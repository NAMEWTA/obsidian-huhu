# 141：真实记忆删除与物理 stdio 投递交错

Session: 20261025T043239Z
Task: 141-memory-physical-delivery
Status: completed

## 聚焦交接

仅新增 `native/huhubot/tests/contract/foundation/memory_physical_delivery_test.go`。默认 Core 创建真实 agent、private Memory item、direct Run 和 sealed context；受控 Engine 只返回运行结果，不制造 Memory/Grant/proof。真实 stdio.Server 使用 net.Pipe，Memory 观察包装逐次委托原 API 并记录返回对象，Events 写前屏障释放后逐次委托原 `EventsAPI.WithDelivery`。没有修改生产、其他测试、140 产物或生成输出。全部本人启动的 Go/Node 产品进程已 Wait，Go 窗口已归还 Root。

## 产物与验证

测试把 `memory.get` item 与 context 组成同一真实 stdio batch。写前屏障观察到 Router 返回的旧 item 与 `memory_recall` context entry 均含同一受保护正文，并确认实际 delivery subjects 包含 `memory_revision:<revisionID>` 和 `context_entry:<entryID>`。当前正例经过原 SQL gate，两个正文都在物理响应中。遗忘反例在屏障处通过同 Core public `Memory.Forget` 提交真实删除后释放；原 SQL gate 返回 `MEMORY_FORGOTTEN` 或 `MEMORY_REVISION_INACTIVE`，两个响应均无旧正文且为安全错误。原 context 同时还含独立 intent entry，测试保留其额外合法 subject，不压缩 Kind+ID。Server/Core 由 cleanup 关闭并等待 Run 退出。

实际工具链 `/home/wta/go/pkg/mod/golang.org/toolchain@v0.0.1-go1.26.10.linux-amd64/bin/go`，`GOWORK=off`、`GOEXPERIMENT=`、`GOFLAGS=-mod=readonly`、`GOPROXY=off`、`CGO_ENABLED=0`、`GOTOOLCHAIN=local`。全部回执由 Python `Popen` 后 `communicate` 实际 Wait，原输出与 SHA 见 `logs/`。

| 回执 | 实际命令 | exit | Wait 秒 | 结果 |
| --- | --- | ---: | ---: | --- |
| `logs/01-go-version.json` | Go version | 0 | 0.004039 | go1.26.10 linux/amd64 |
| `logs/02-gofmt.json` | 本任务唯一测试文件 gofmt | 0 | 0.003406 | 格式化完成 |
| `logs/03-go-list-result.json` | `go list -deps -test -json ./tests/contract/foundation` | 0 | 0.182941 | 486 包、57 本地目录；固定 232 文件/模式 |
| `logs/05-first-target.json` | 单目标 current + forgotten 首次 | 1 | 1.765607 | 新夹具误断言恰好 2 个 subjects；实际第三个是独立 intent context entry |
| `logs/07-corrected-target.json` | 相同单目标，修正合法 subject 计数 | 0 | 1.482987 | current 与 forgotten 两子例均 PASS |

首次失败原始日志保留在 `logs/05-first-target.log`，分类与修正前后测试 SHA 在 `logs/06-first-failure-classification.json`。`logs/04-fixed-input.json` 的 232 个真实 Go 编译/embed 输入与模式在检查后仅自身测试文件由 `5c1ae0f2…` 变为 `bb237d62…`；其余 231 文件和模式完全相同，见 `logs/08-final-input-drift.json`。最终源码及所有工件逐文件 SHA256 见 `manifest.json`。

亲自运行 `validate-dispatch --stage return` 并 Wait，实际 exit 0、0.055817 秒，errors/warnings 均空，见 `logs/09-return-validation.json`。

## 问题与下一步

本轮没有观察到产品失败。测试只验证本地 Core/SQLite/stdin-stdout transport 的这项交错，不代替 Root 的共同 Go 回归、必要 race、独立 T14 审查，也不声称真实模型、Obsidian、目标 OS 或整票/Goal 已验。无提交、推送、发布或归档。
