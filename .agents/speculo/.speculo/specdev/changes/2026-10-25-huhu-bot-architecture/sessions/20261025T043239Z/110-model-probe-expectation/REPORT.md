# 默认 Responses 探测预期维护

Session: 20261025T043239Z
Task: 110-model-probe-expectation
Status: completed

## 聚焦交接

只将默认 Core 重开后 `TestModel` 的旧错误预期由 `ADAPTER_NOT_ASSEMBLED` 改为 `CREDENTIAL_MISSING`。Responses 已装配，而 session-memory 凭证没有跨重开保留；这是过期测试预期维护，没有生产修复。

唯一测试写入为 [model_test.go](../../../../../../../../../native/huhubot/tests/contract/assistant/model_test.go:98)。原 SHA256 为 `51e6aed207df9b94dfe72103448bd713a74ca6c46f5145c6b15a8fd2d9438d02`，当前冻结 SHA256 为 `e06c1fe8ca597cd0ef2f04d3727054247d0f15d871bbaa58d8622b6bde92b6b4`。完整差异（历史日志已清理：`logs/01-expectation.patch`）只有这一行；其他凭证状态、共享引用、引用不可复用、秘密不落 SQLite 的原断言保持。

## 产物与验证

原红复用 108 的[实际日志](../108-responses-foundation/logs/12-assistant-old-expectation.log)及命令回执（历史日志已清理：`../108-responses-foundation/logs/12-assistant-old-expectation-result.json`）：固定 Go 1.26.10、CGO0，实际 exit1、Wait 1.225754875 秒、sourceDrift=[]；原输入 tree 为 `b5557939ffc6bcd57e2bac946b2c40d8578b2773be5700fe58f441bc79d89a93`。实际错误是 `MODEL_UNAVAILABLE: CREDENTIAL_MISSING`，未重新运行同一旧断言。变更核对（历史日志已清理：`logs/01-own-change.json`）保存完整原文件、逐字节单次替换证明和只读 selector 控制文件摘要。

按既有 `dev` / SpecDev I 流程核对 T02 凭证生命周期消费者与测试选择表；本次是单个测试预期迁移，不新增测试、依赖、接口或发布产物。Root 在 107、109 实际 Wait 后交接唯一 Go 窗口，已执行以下单命令：

```sh
go test -mod=readonly -p=1 ./tests/contract/assistant -run '^Test(DraftModelAvailabilitySharedCredentialAndSessionReopen|ModelListingRequiresDeclaredProtocolAndDoesNotRunProbe|UndeclaredProbePreservesExplicitTestingButDoesNotAdvertiseProtocols)$' -count=1 -timeout=60s -v
```

工作目录为 `native/huhubot`，固定 `GOTOOLCHAIN=go1.26.10 / GOWORK=off / GOEXPERIMENT='' / CGO_ENABLED=0 / GOFLAGS=-mod=readonly`。三个目标全部 PASS，实际 exit0 / Wait **1.283851878 秒**，包内 0.112 秒；[原始输出](logs/03-targets.log)与完整命令回执（历史日志已清理：`logs/03-targets-result.json`）可回读。

运行前输入（历史日志已清理：`logs/02-source-before.json`）覆盖 module 内 Go、SQL、JSON 与 go.mod/go.sum，排除 dist，共 312 文件，tree SHA256 `844506d2738775c8214b4c0ab8db3af915a9152ccc594f02019592cd0c94076d`；运行后（历史日志已清理：`logs/03-source-after.json`）sourceDrift=[]。这是本命令的源码摘要范围，不冒称 108 旧 316 文件输入或 T09 全候选已复验。最终冻结（历史日志已清理：`logs/04-final-source-freeze.json`）确认唯一单次替换、其余测试字节相同，原红日志/selector 控制/service 均无漂移。

准备脚本有一次辅助核对失败（历史日志已清理：`logs/00-auxiliary-assertion-failure.txt`）：补丁写入后，反向校验错误选择了更早的同名断言。随后仅更正核对方式，确认完整文件恰等于唯一旧断言替换后的字节；没有追加测试修改，也没有启动 Go。此失败保留，不计为产品红灯。

## 问题与下一步

唯一测试文件持续冻结；实际 Go PID 已 Wait 且不存在，没有另起 Go、Node 或 Runner，窗口已明确交还 Root。源码、测试与既有原始失败日志停止写入，交回结构回执与产物摘要存于本任务 logs。

未运行全包、race、插件构建或真实 Provider；真实模型、Obsidian、目标 OS 由用户后验。独立代码审查、Root E2E 和 T09 共同代码门由 Lead 维护，本报告不宣称 T02、T09 或全 Goal 完成。
