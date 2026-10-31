# Anthropic 默认装配与真实依赖

Session: 20261025T043239Z
Task: 119-anthropic-foundation
Status: completed

## 聚焦交接

已完成[冻结 TASK](TASK.md)限定的第三协议默认装配、真实依赖与适用 foundation 消费者。产品和测试停止写入，全部本作者产品命令实际 Wait。此 completed 只表示119写集交付，不替代 Root 的 T10 整体代码门、构建/E2E或独立审查。

按 Map29/Goal28、dev/I/preflight、架构、测试、许可、TDD及异步生命周期规则执行；115先完整交回。117默认 Core 的有效缺失行为红、118精确 Registry 身份维护先由 Root 接纳，随后才获得非重叠产品写集和唯一 Go 窗口。00（历史日志已清理：`logs/00-before-and-authorization.json`）保留 TASK SHA、窗口 SHA `885623c70ac60d7465cddee7a013cd16381d7462ace073209b4182a3683c3505`、原始字节和117初始源核对。TDD前置行为红复用117真实公共消费者；本作者下列命令全部通过，未制造编译红或覆盖旧失败。

默认 Core 依次创建 Chat、Responses、Anthropic并交同一不可变 Registry。默认 Engine、Inspector、Probe、selector、EngineVersionForProtocol及原 Broker纯版本回调共用该 Registry。第三工厂失败排空已创建两个driver；Registry失败排空实际三个。原共享顺序保持：先 Stop 全部，再等实际 Done，最后 Close 全部，随后 Provider、DB、Profile。私有 Profile resolver、显式 Engine+nil Probe、全显式 Engine/Probe和 fake/legacy 身份语义保持。

未接管 Broker/API/HAP/SQL/TS、共同runtime、协议driver、其他测试、notices或正式状态。117协议/风险矩阵、118 Registry tuple、120/T27许可/发行闭包仍归原owner；本任务不实施记忆。

## 产物与验证

完整自有差异见17 patch（历史日志已清理：`logs/17-final-own.patch`），五文件逐SHA见17 manifest（历史日志已清理：`logs/17-final-own-source.json`），自有tree `c272888674e1ddf2d58bf49cac6978250eb8435e01266645f84baebd6126c0c0`。

| 文件（均在 native/huhubot 下） | 最终 SHA256 |
|---|---|
| `internal/bootstrap/core.go` | `cfcf4316660a2ef463f93ce0400dcfca94bd57370eb8c1602fd249f7f8f0a94a` |
| `go.mod` | `943f91b31c7f9ea341c3779a4bd9bfd0a4a51f658e20a0d4f5def0a5f287a668` |
| `go.sum` | `bbb9c65d33563690674169c8091f00a445a9e503d5bc639c9081945e7c6587e8` |
| `tests/contract/foundation/default_protocol_recovery_test.go` | `221155f36fcb71c5b9b4a983869fb2b01e1ee638a65f9d0bb4c50fd513d8652c` |
| `tests/contract/foundation/default_anthropic_composition_test.go`（新增） | `e27c57f1c97379273e1a21aea3fcc077ef864283edb5c946639087c8e2791914` |

原 Responses恢复测试提取协议参数共享步骤，保留原名字、模型/工具输入与断言；新增 Anthropic同流程和默认 Probe真实生命周期。编辑前完整字节见08（历史日志已清理：`logs/08-before-default_protocol_recovery.go.txt`），提取差异见13（历史日志已清理：`logs/13-shared-cp-helper.patch`）。core/锁编辑前字节由00的before条目定位。

固定真实 SDK `github.com/anthropics/anthropic-sdk-go v1.56.0`，来源commit `b0e07bb34ffc0d018c89b5cec8f62a7b823927f3`，模块/go.mod校验和见固定模块来源（历史日志已清理：`logs/02-anthropic-fixed-module.json`）。真实imports存在并获窗口后才edit/download/tidy；无replace、module cache改写或空import。既有直接版本、Eino v0.9.22、Ext v0.1.13、ACL `v0.1.18-0.20260924031408-10df7cac3f6d`、fork v0.1.6、eino-contrib/jsonschema v1.0.3、OpenAI v3.44.0均保持。

真实MVS必要间接变化为jsonparser v1.1.1→v1.1.2，新增invopop/jsonschema v0.14.0、pb33f/ordered-map/v2 v2.3.1、standard-webhooks/standard-webhooks/libraries v0.0.1、go.yaml.in/yaml/v4 v4.0.0-rc.2、x/sync v0.23.0。02结果（历史日志已清理：`logs/02-dependency-result.json`）和锁差异（历史日志已清理：`logs/02-lock.patch`）记录准确版本/分类及源无漂移。已交Root与120/build_integration；此为tidy声明图，不冒称五平台实际运行闭包，notices由120/T27消费。

## 实际验证

全部产品命令在Root独占窗口，环境固定 `GOTOOLCHAIN=go1.26.10 GOWORK=off GOEXPERIMENT='' GOFLAGS=-mod=readonly CGO_ENABLED=0`。测试使用 `-mod=readonly -p=1 -count=1 -v`；完整命令数组/超时/输入/exit/Wait见结果JSON。

| 命令/消费者 | 实际 exit / Wait / wall | 原始证据 |
|---|---|---|
| `go mod edit -require=github.com/anthropics/anthropic-sdk-go@v1.56.0`；固定模块 `go mod download -json`；真实imports `go mod tidy` | 全0/Wait；0.0085、0.0330、2.0772秒 | 02结果（历史日志已清理：`logs/02-dependency-result.json`）、[edit](logs/02-0-dependency.log)、[download](logs/02-1-dependency.log)、[tidy](logs/02-2-dependency.log) |
| `./tests/contract/engine/anthropic`：`TestDefaultAnthropicPersistsTextAndSettledUsage` | 0/Wait，8.200秒 | 04结果（历史日志已清理：`logs/04-default-anthropic-result.json`）、[原日志](logs/04-default-anthropic.log) |
| foundation原默认Chat CLI、Responses CLI、fake/legacy Inspector兼容、Core held-Probe Close四目标 | 0/Wait，8.002秒 | 05完整命令（历史日志已清理：`logs/05-existing-foundation-result.json`）、[原日志](logs/05-existing-foundation.log) |
| Chat `TestLegacyChatCheckpointBytesInspectorAndResumeStayCompatible` | 0/Wait，1.570秒 | 06结果（历史日志已清理：`logs/06-legacy-chat-cp-result.json`）、[原日志](logs/06-legacy-chat-cp.log) |
| Responses `TestTwoCallCheckpointReopensAndResumesOriginalOpaqueDecisions` | 0/Wait，1.520秒 | 07结果（历史日志已清理：`logs/07-responses-cp-result.json`）、[原日志](logs/07-responses-cp.log) |
| foundation原Responses CP/reopen、新Anthropic CP/reopen、默认Anthropic Probe/Close三个目标 | 0/Wait，1.976秒 | 14完整命令（历史日志已清理：`logs/14-new-foundation-result.json`）、[原日志](logs/14-new-foundation.log) |
| bootstrap `TestDefaultAnthropicConstructionFailureDrainsCreatedDrivers`，fresh current-core第三工厂失败overlay | 0/Wait，1.369秒 | 15结果（历史日志已清理：`logs/15-third-factory-result.json`）、[原日志](logs/15-third-factory.log) |
| 同一虚拟bootstrap test，fresh current-core实际Registry拒绝overlay | 0/Wait，1.323秒 | 16结果（历史日志已清理：`logs/16-registry-result.json`）、[原日志](logs/16-registry.log) |

04–07共用实际336输入tree `2553da190f92a3df5d971e7fa3bf55a2d76bd90277d3e816b4242594b5274bd4`，各sourceDrift=[]；Root保存[第一阶段接纳](../../../evidence/T-10-logs/shared-first-stage-accepted.json)。两个真实CLI子进程经既有统一失败清理获得实际Wait，父/子均CGO0，不套用093历史父CGO1描述。Chat旧字节消费者未运行CaptureLegacy或改样本；它与Responses双调用消费者专门覆盖必要jsonparser升级的最近编码/恢复路径。

14–16共用实际339输入tree `56257b1b7300d7f23f86da2a2a9bec93ccfb7a86a8981f9d07c221136a66d95c`；18清单（历史日志已清理：`logs/18-final-tested-input.json`）完整绑定runner选择的Go/SQL/JSON/CP/SQLite/archive/text及两个锁，排除dist。各命令sourceDrift=[]、expectedTestsMissing=[]。本集合339，不与117的341混称。Root逐项核对并保存[不可变输入核验](../../../evidence/T-10-logs/shared-final-stage-input-verification.json)与[ZIP](../../../evidence/T-10-logs/shared-final-stage-input.zip)。

### CP与凭证资格的边界

默认Anthropic实际SDK loopback产生note_write，经原Broker持久审批/完整HUHUCP1，用户reject后真实第二POST进入，再RequestStop/Close/Done、重开同一Profile。HTTP2、Host写0；CP外层协议EngineVersion/Format1、完整编码/payloadhash/size、common v2 sidecar、原Run/config/position/Decision及CP字节均保留。两次实际attempt的known1+unknown1、producer_ended2与非零charge未重开归零。

真实默认重开首先blocked/CREDENTIAL_MISSING；旧opaque ref再次Register明确CREDENTIAL_REF_REUSED。正向仅在一次性ExecutorPaused fixture内将原 `credential_metadata.state` 模拟为available（原Profile/ref精确谓词、RowsAffected1），再实际Recovery.Get得到ready，Inspector真实读取同CP和原decision。**这是模拟当前凭证元数据的纯Inspector正控，没有恢复Provider secret、没有用户Resume或重开后新HTTP。** 原Responses共享控制保持同一边界。

### Stop、Done与构造失败的边界

默认Probe控制使用真实Core/Anthropic SDK/loopback metadata GET，无Engine、Probe或transport替换；实际ListModels协议/凭证selector为available。GET在途时RequestStop同步关闭captured TestModel受理，新调用SERVICE_STOPPING；Core Close/Done等原调用返回及服务器观察取消后才重开同Profile。重开凭证仍missing，旧facade仍停止；GET1/POST0、Run0/attempt0。失败清理也等实际调用及HTTP handler结束。原held-Probe控制另证明不合作调用未真实返回时不会提前释放Provider/Profile。

两个overlay每次从执行时当前core SHA生成，见生成器（历史日志已清理：`logs/10-prepare-construction-overlay.py`）、虚拟test（历史日志已清理：`logs/10-construction-overlay-test.go.txt`）。第三工厂注入nil/error，前两个是真实driver；另一控制先创建真实三个，再给真实Registry重复tuple使其拒绝。没有生产test knob、旧core覆盖或SDK替换。对原错误分支具体对象身份、Stop返回→实际Done接收→Close返回逐项观察，断言全Stop先于Wait、全Done先于Close；之后同Profile真实重开/关闭验证DB/Profile释放。此为**空闲构造失败清理**，不冒称活动HTTP构造失败；活动Probe与结算由上述正常生命周期及原owner风险矩阵覆盖。

## 问题与下一步

119未出现产品命令失败或夹具重跑；原始日志按实际保留。结构return的19（历史日志已清理：`logs/19-return-result.json`）、22（历史日志已清理：`logs/22-return-result.json`）均实际exit126，分别指出报告缺少工具要求的精确“产物与验证”“问题与下一步”标题；只修报告标题后重新校验，不涉及产品或测试。117前置缺失红/mixed红绿/后续风险矩阵归其原报告；108历史凭证fixture失败不改写。第一阶段绿目标按未变风险复用，第二阶段只跑获批三个新/受影响控制与两overlay。早期准备文件保留当时事实，最终状态以本REPORT及实际14–16为准。

本作者未跑全module normal/race/vet、五平台、插件build/lint、真实Provider/Obsidian/目标OS或系统keyring；它们不在本次获分配命令内，整体E2E/独立审查及用户现场后验仍归Root/用户。无真实凭证请求、提交、推送、发布、归档或再委派。

最终自有5源继续drift=[]。窗口归还后117获准继续其源，最终元数据回读发现339实跑集合的 `anthropic/blocks.go`、`checkpoint.go` 已授权变化；20回读（历史日志已清理：`logs/20-final-readback.json`）如实记录。18及Root ZIP继续代表119真实执行输入，不把后续当前源冒称原339冻结字节，不据此追加产品重测。全部本作者Go/nested CLI/HTTP/Core已实际Wait，无活跃本作者产品进程；只写本报告/工件清单/结构回执后停写。

亲自最终return结果见23（历史日志已清理：`logs/23-return-result.json`），报告及工件SHA见21（历史日志已清理：`logs/21-artifact-manifest.json`）。正式接纳与状态由Root维护，本作者不推进全票或全Goal。
