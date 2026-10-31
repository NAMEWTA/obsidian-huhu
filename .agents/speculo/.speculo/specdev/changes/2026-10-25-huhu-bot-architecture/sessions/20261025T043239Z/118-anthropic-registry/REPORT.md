# Anthropic 精确 Registry 身份维护

Session: 20261025T043239Z  
Task: 118-anthropic-registry  
Status: completed

## 聚焦交接

仅修改 TASK 指定三文件：common/protocol.go 新增 AnthropicProtocol、AnthropicEngineVersion、AnthropicStateFormat 三个冻结 literal；common/registry.go 仅在原精确白名单增加该三元组；既有 protocol_common_test.go 新增 literal 第三 driver 合同。没有放宽任意协议/version/format，也没有重做107机制。

实际身份为 `anthropic-messages` / `huhu-anthropic-sdk-go-1.56.0-messages-bridge-v1` / `huhu-anthropic-messages-state-v1`。Chat/Responses literal、Generation/StateView、Engine循环、CP编解码、ToolDigest、HTTP/worker、Broker/API/装配及锁均未由本作者改动；非Chat既有 v2分支保持。原两driver不得广告Anthropic、故意Anthropic protocol配Chat version的负控均原样保留。

新增合同验证三driver按pinned protocol分别运行Engine/Probe、Identity和EngineVersion不可被caller修改、三方Stop/Done/Close与被阻塞Probe的实际join；第三version/format错误和重复协议仍拒绝，失败构造不夺取caller所有权。测试使用私有stub，不冒称真实Anthropic SDK/Provider已通过；117/119负责其协议与默认装配。

## 产物与验证

完整读取 TASK、Map29合同和当前三源，复用已读且未变的 AGENTS/dev/I/preflight/TDD/异步/许可规则；实际调用dev的原生Go接口与生命周期验证。Root接纳117默认缺失行为红后才写测试，收到117明确源码稳定ACK后才运行。首次本地行为红使用 literal，不引用尚缺常量制造编译失败。Root已授权的同一窄窗内，红真实退出后才改两生产源。

| 证据 | 实际命令目标与结果 |
| --- | --- |
| 01-registry-red | 仅 TestRegistryThirdProtocolUsesExactIdentityAndSharedLifecycle；编译正常，合法第三身份被旧Registry拒为MODEL_REGISTRY_INVALID；exit1/Wait2.546467s，有效产品红 |
| 02-registry-green | 同一目标；三driver路由/身份/生命周期及version/format/duplicate子控制全过；exit0/Wait3.191577s |
| 03-registry-existing-controls | 原 TestRegistryRejectsInvalidConstructionWithoutTakingOwnership 与 TestRegistryKeepsPinnedRoutingAndWaitsForProbe；exit0/Wait0.938466s |

所有命令实际 Wait、固定 go1.26.10/GOWORK=off/GOEXPERIMENT空/CGO0/-mod=readonly/GOPROXY=off，未下载。每轮完整输出、输入清单及ZIP、命令/环境/退出/耗时/漂移分别在同前缀log/input/result。输入捕获整个native Go/SQL、锁和本包所用冻结fixture的superset（314项），不把其它包测试冒称已编译运行。02/03相同输入 SHA `b920c6cd708ad1d9ca92c88807563c8569094b4bd9ccbd7437554d4e8a48570a`、ZIP SHA `cca0f232018b47aba0635edb1c1d68c3ffd729fc0cb02f193e0c2a57ea59320f`；三轮 drift=[]。首次失败原样保留，无编译/环境失败冒充行为红。

自有差异和三文件SHA由最终source manifest记录，基线为00阶段保存的原字节。原107机制、旧Chat/Responses CP与HTTP生命周期生产源未变，合理复用已接纳107/Responses代码门证据；本次不机械重跑旧套件、不另跑race或真实Provider。新第三driver真实SDK/默认Core/实际用量及联合race仍由117/119和Root组合验证，不由stub结果替代。

本人最终只读 validate-dispatch --stage return 的实际结果见 logs/05-return.json/log；自有与只读机制来源回读、工件SHA清单见最终manifest。全部产品Go进程已经实际退出，Go窗口已原生交回Root，117已收到恢复源编辑回执。

## 问题与下一步

本次三文件维护没有剩余已知故障。117可消费新精确身份；119负责第三driver真实构造、装配、固定SDK锁及失败清理，Root负责后续组合代码验收/独立双轴/许可闭包。本作者不自行推进正式T10/代码门状态。

真实模型、Obsidian与目标OS仍由用户后验，未索凭证。未改他票/旧报告/正式Map、未提交推送发布归档、未再次委派。完成本人return0及原生MESSAGE+FINAL后停止全部自有工作。
