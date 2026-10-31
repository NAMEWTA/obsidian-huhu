# 默认三协议 HAP 测试预期维护

Session: 20261025T043239Z
Task: 122-hap-default-expectation
Status: completed

## 聚焦交接

唯一源码变更是 [hap_test.go](../../../../../../../../../native/huhubot/tests/contract/assistant/hap_test.go:58) 末段的一处 reason：`ADAPTER_NOT_ASSEMBLED` → `CREDENTIAL_MISSING`。默认 Responses 已装配，缺凭证必须明确拒绝；仍严格要求非空 Error 和 `MODEL_UNAVAILABLE`，没有弱化成任意错误通过，也没有修改生产行为。

修改前 SHA256 `7ea55761a5efae8349efc558f48ad2349228b4a3a03efab1416bcbe586ee2f70`；最终 SHA256 `6816ceb54a0067bf007c0b551e38f8f8f35d2db5e2973ceb2b71608b15af6ca0`。完整 before（历史日志已清理：`logs/00-hap_test.go.before.txt`）、一行 diff（历史日志已清理：`logs/03-expectation.patch`）和逐字节证明（历史日志已清理：`logs/03-own-change.json`）保存，其他所有测试字节保持，包括 strict DTO 的未知字段、大小写、CAS、secret/apiKey 拒绝及公开错误不回显 sentinel。

## 产物与验证

沿已读未变的 workspace/catalog、`dev`、SpecDev I 与测试选择表，先回读真实消费者错误，再做单次预期迁移。本次无新依赖、框架、公共合同、生产或凭证写入。

Root 的[原始 HAP 红灯](../../../evidence/T-02-logs/hap-default-after-three-protocols-r1.log)和[回执](../../../evidence/T-02-logs/hap-default-after-three-protocols-r1.json)保持原样：2032 输入 SHA `9579090bfcdb20ab0053d944979653dc861c047e54cb8d4ed5e1c638e4a85c26`，实际 exit1 / Wait 1.946400363 秒、drift=[]。原日志只打印指针，没有展开 actual fault；本任务没有把源码推测当成实测，也没有重复运行同一无诊断的旧失败。

在 Root 唯一 Go 窗口内，先使用外部观察 overlay（历史日志已清理：`logs/01-overlay.json`），差异（历史日志已清理：`logs/01-observation.patch`）只把失败响应 JSON 展开，原期望和全部判定条件不变，共享测试仍未修改。实际得到 `MODEL_UNAVAILABLE / CREDENTIAL_MISSING / retryable=false`，公开响应没有 Provider 错误正文或秘密。该诊断预期仍 exit1，完整响应与关联 ID 保留在[观察日志](logs/02-observation.log)，不是编译、超时或夹具失败。

之后才做唯一一行迁移，并运行 assistant 整包一次。两次均固定 `GOTOOLCHAIN=go1.26.10`、`GOWORK=off`、`GOEXPERIMENT=''`、`CGO_ENABLED=0`、`GOFLAGS=-mod=readonly`，工作目录 `native/huhubot`：

| 实际命令与范围 | 结果 | 可回读证据 |
| --- | --- | --- |
| `go test -mod=readonly -p=1 -overlay=<本任务01-overlay.json绝对路径> ./tests/contract/assistant -run '^TestAssistantHAPStrictDTOAndNoSecretSurface$' -count=1 -timeout=120s -v` | exit1 / Wait 3.305835621 秒；仅确认旧判定下的真实 fault | 命令/环境/输入回执（历史日志已清理：`logs/02-observation-result.json`） |
| `go test -mod=readonly -p=1 ./tests/contract/assistant -count=1 -timeout=120s -v`，无 overlay | exit0 / Wait **28.741469595 秒**，包内 25.627 秒；18 个顶层用例 PASS，无 skip | [整包原始日志](logs/04-assistant-package.log)、完整回执（历史日志已清理：`logs/04-assistant-package-result.json`） |

整包包含本次 HAP、110 的重开凭证边界、114 的真实 metadata GET、显式 Chat-only selector 两个负控，以及现有 CAS/pin/删除/迁移、受控 CLI 和私有隔离 D-Bus 生命周期回归。现有测试自身创建合成凭证与独立私有 bus，并验证 worker/client Wait；不是用户真实密钥库或 Provider 验收。

两次都记录 module 内 Go、SQL、JSON 与 go.mod/go.sum，排除 dist，共 333 文件，运行前后 drift=[]：

- 观察基础输入（历史日志已清理：`logs/02-observation-source-before.json`） tree `464e4bf346162d6bc2204b478a09a40ff942e00482e70f9adb02cdff35ed7d5f`；替换仅诊断的有效输入 tree `e6e93d638b7126269993c5fb7fc8ad32e268b3dba6a26c5e806a1c4cadb30460`，overlay 文件本身的摘要与 drift=[] 同时保存。
- 最终整包输入（历史日志已清理：`logs/04-assistant-package-source-before.json`） tree `cde12d219676d16651e9e6afae7c24bc74937bc34dc38a33ef9e6c5e2fcc3ca3`；两份共享源输入仅本测试一行不同。

最终冻结（历史日志已清理：`logs/05-final-source-freeze.json`）核对 110/114 的测试和报告、selector 控制及原 Root 红灯均未变。2032 文件支持输入回读（历史日志已清理：`logs/05-root-support-readback.json`）与 Root 原 E2E 清单逐项比较，也只差本次 HAP 测试。这是最终只读指纹证据，不将 Root 的旧 E2E 宣称为新测试字节已通过的 E2E。

## 问题与下一步

两条 Go 命令均实际 Wait，直接 PID 已不存在；整包受控子进程清理断言通过，Go 窗口已明确交还 Root。源码、测试与既有日志停止写入，结构 return 及全部工件摘要随任务交回。

没有运行全 module、race、插件 build 或真实 Provider；真实模型、Obsidian、用户目标 OS 的验收后置。本任务不修改 110/114 历史、不维护正式状态，也不宣称 T02/T10 或 Goal 完成；共同审查、Root E2E 接纳和正式状态由 Lead 维护。
