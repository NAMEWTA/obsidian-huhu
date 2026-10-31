# 默认双协议元数据测试预期维护

Session: 20261025T043239Z
Task: 114-metadata-probe-expectation
Status: completed

## 聚焦交接

仅维护 [probe_http_test.go](../../../../../../../../../native/huhubot/tests/contract/assistant/probe_http_test.go:73) 的 Responses 末段。默认 Registry 已装配 Responses，原 `ADAPTER_NOT_ASSEMBLED` / HTTP2 预期过期；实际缺失模型应产生一次 GET 和安全的 `MODEL_PROBE_FAILED`。这是测试预期维护，没有修改生产代码、协议、凭证或配置。

修改前 SHA256：`9cdfb0c1204d013097350a9532e5953efc8c0654b4479385875a9575c3c22c3f`；最终 SHA256：`a9b5795f6a555ea84e90faa5ebe02a7cf2443974d2c73592c1bc413137463426`。完整 before（历史日志已清理：`logs/00-probe_http_test.go.before.txt`）、精确 diff（历史日志已清理：`logs/03-expectation.patch`） 与变更证明（历史日志已清理：`logs/03-own-change.json`）保留；原 Chat 成功 GET、404、安全错误以及全部 setup 字节相同。

新末段不仅改计数：它读取第三个真实请求，严格比较 GET、`/v1/models/missing-model`、显式 fixture Bearer 凭证及空 body；总请求为 3，且序列化错误不含 fixture 私密哨兵或原 Provider 错误正文。没有新增生成、重试或其他目的地路径。显式仅 Chat 的注入 selector 仍由两个原负控约束，与默认双协议装配分开。

## 产物与验证

沿已读且未变的 `dev` / SpecDev I 与测试选择表，先核对真实旧消费者，再在 Root 授予的唯一 Go 窗口执行原红、最小修正及三目标绿。无陌生依赖、新接口、生产或测试框架改造。

两次命令均在 `native/huhubot`，固定 `GOTOOLCHAIN=go1.26.10`、`GOWORK=off`、`GOEXPERIMENT=''`、`CGO_ENABLED=0`、`GOFLAGS=-mod=readonly`；参数均为 `go test -mod=readonly -p=1 ./tests/contract/assistant -count=1 -timeout=60s -v`，仅 `-run` 范围不同：

| 次序 | 实际范围与结果 | 回读 |
| --- | --- | --- |
| 原红 | 未改原单例，exit1 / Wait 1.383216422 秒；`want ADAPTER_NOT_ASSEMBLED, got MODEL_UNAVAILABLE: MODEL_PROBE_FAILED`。是目标行为失败，无编译、超时或夹具失败。 | [原始日志](logs/02-red.log)、完整命令/环境回执（历史日志已清理：`logs/02-red-result.json`） |
| 新绿 | 原单例及 `TestModelListingRequiresDeclaredProtocolAndDoesNotRunProbe`、`TestUndeclaredProbePreservesExplicitTestingButDoesNotAdvertiseProtocols` 全 PASS，exit0 / Wait 1.197289149 秒，包内 0.097 秒。 | [原始日志](logs/05-green.log)、完整命令/环境回执（历史日志已清理：`logs/05-green-result.json`） |

每次实际输入均覆盖 module 内 Go、SQL、JSON 与 go.mod/go.sum，排除 dist，共 318 文件：

- 原红输入（历史日志已清理：`logs/01-red-source-before.json`） tree `ed7fef6331d69873bb4785574cc509ea212365b12562bbb5274b0c04806792c8`，运行后（历史日志已清理：`logs/02-red-source-after.json`） drift=[]。
- 新绿输入（历史日志已清理：`logs/04-green-source-before.json`） tree `86f56a444a46b05b7f4bc92517866f31903bcc96d79e0fff70dd8b86aa4d2621`，运行后（历史日志已清理：`logs/05-green-source-after.json`） drift=[]。

两份输入的唯一差异就是本次末段测试文件；所有生产字节不变。最终冻结回执（历史日志已清理：`logs/06-final-source-freeze.json`）同时核对原 selector 控制文件、110 的 model_test.go 与[110 报告](../110-model-probe-expectation/REPORT.md)摘要不变。110 历史证据保留，未重写旧报告或覆盖本次原红。

## 问题与下一步

两次 Go 进程均实际 Wait，PID 均已不存在，没有另起 Go、Node 或 Runner；唯一 Go 窗口已明确交还 Root。源码、测试与原始日志停写，结构 return 回执与完整工件 manifest 随本任务交回。

本次没有运行全 Go、race、插件构建或真实 Provider；请求仅去一次性 loopback 服务器。真实模型、Obsidian、目标 OS 由用户后验。T02/T09 整体状态、共同代码门、Root E2E 与 112 独立审查由 Lead 维护，不以本局部绿色宣称全票或 Goal 完成。
