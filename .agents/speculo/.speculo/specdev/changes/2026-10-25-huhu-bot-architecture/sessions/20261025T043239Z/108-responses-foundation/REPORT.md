# Responses 默认装配与 Broker 协议身份

Session: 20261025T043239Z
Task: 108-responses-foundation
Status: completed

## 聚焦交接

完成冻结 [TASK](TASK.md) 内的默认双协议装配、Broker pinned-protocol 身份与依赖维护。按 [Map26/Goal25](../../../evidence/T-09-logs/responses-window-map26.md) 和 Root 接纳的 [106 有限私有合同](../106-protocol-private-contract/logs/interface-contract.md) 实施；实际使用 dev 的架构、测试选择、许可与生命周期规则，复用未变化的 SpecDev I/preflight/TDD/error/reliability，来源摘要见 [00](logs/00-read-only-preparation.json)。Root 先接纳109默认 Responses 缺失行为红及107旧 Chat producer 实际 CP 采样，才开放共同产品写入；所有 Go/锁操作均在 Root 授予的唯一窗口。

自有写集为九个文件：[逐 SHA 冻结](logs/24-final-own-source.json)、[相对编辑前完整字节的差异](logs/24-final-own.patch)。tree SHA256 `82901fbba6b1428a1e4e4a293ca67ed4237adc44a9e5098fdca9dcf3f4989567`，最终 drift=[]。只有 core.go、go.mod/go.sum、Broker service.go/recovery.go 与本次 foundation/approval 测试；未改 Application API/HAP/SQL/生成 TS、他人生产/测试、许可文件或正式状态。原阶段性 FINAL 仅让槽，108 未重建 TASK；本次才正式交回本作者实现候选，T09 代码门/联合验收仍由 Root 维护。

默认 Core 创建 Chat 与 Responses，Registry 成功后才转移 driver 生命周期所有权；默认 Engine、Inspector、Probe、SupportsProtocol 和 Broker EngineVersionForProtocol 均由这个不可变 Registry 提供。只有默认 Engine 设置生产 callback；显式 Engine 即使补默认 Probe，也保留原 fake/legacy EngineVersion 与 Inspector。Profile 私有 resolver 仍闭包绑定实际 ProfileID，仅接收 pinned CredentialRef。构造失败先 Stop 全部已创建 driver，等待实际 Done，再 Close；随后才关闭 provider/DB/Profile，不新增产品测试开关。

Broker 的 Bind、PublishSuspension、InspectRecovery 共用 `metadataForAgent`，版本仅由可信 pinned Agent.Model.Protocol 选择。callback 缺省完全保留原 EngineVersion/default huhu-engine-v1 路径。Bind 仅对明确 typed MODEL_UNAVAILABLE 的 MODEL_DRAFT_INCOMPLETE/ADAPTER_NOT_ASSEMBLED 保留 Tools/Attempts、不给 Checkpoints；任意 callback 错误保持失败。发布/恢复没有有效 metadata 均拒绝，CP 无自选协议身份。原 accepted Intent 透传未变。

## 产物与验证

运行环境固定 `GOTOOLCHAIN=go1.26.10 / GOWORK=off / GOEXPERIMENT='' / CGO_ENABLED=0 / GOFLAGS=-mod=readonly`，所有命令实际退出且 Wait，运行前后对应输入均无漂移。本轮两条真实 CLI 子进程也明确 CGO0；不沿用093父 CGO1的环境描述。命令参数、持续时间、退出与 SHA 在各 result/input/log，未把编译失败当产品红灯。

| 检查 | 实际结果 | 可回读证据 |
|---|---|---|
| 固定 SDK require/download | 两命令 exit0/Wait，只有锁与固定模块操作 | [03 result](logs/03-fixed-sdk-lock-result.json)、[log](logs/03-fixed-sdk-lock.log)、[模块来源](logs/03-fixed-sdk-module.json) |
| 真实 imports 后 tidy | exit0/Wait 0.943s，旧 pins/toolchain 不变 | [07 result](logs/07-real-import-tidy-result.json)、[log](logs/07-real-import-tidy.log)、[diff](logs/07-real-import-tidy.patch) |
| 两个 Broker 合同测试、10 子控制 | exit0/Wait 1.100s | [10 result](logs/10-broker-target-result.json)、[log](logs/10-broker-target.log) |
| 原 Chat+新 Responses 真实默认 CLI、旧 fake CP/显式 Inspector、实际 held Probe Close | 四顶层 exit0/Wait 6.897s | [11 result](logs/11-foundation-target-result.json)、[log](logs/11-foundation-target.log) |
| 只读旧 assistant 单例 | exit1/Wait 1.226s：旧未装配预期收到实际 CREDENTIAL_MISSING | [12 result](logs/12-assistant-old-expectation-result.json)、[log](logs/12-assistant-old-expectation.log) |
| 新默认 Responses CP 重开首轮 | exit1/Wait 2.375s：真实重开正确 blocked/CREDENTIAL_MISSING，测试误期待 ready | [18 result](logs/18-default-recovery-result.json)、[log](logs/18-default-recovery.log) |
| 只修新测试凭证前提后同单例 | exit0/Wait 1.322s | [22 result](logs/22-default-recovery-result.json)、[log](logs/22-default-recovery.log) |
| 执行时重建的构造失败 overlay | exit0/Wait 1.118s | [23 result](logs/23-construction-overlay-result.json)、[log](logs/23-construction-overlay.log)、[注入范围](logs/15-execution-core-overlay.patch) |

10–12 对应 [09 的316输入](logs/09-target-input.json)，tree `b5557939ffc6bcd57e2bac946b2c40d8578b2773be5700fe58f441bc79d89a93`。22/23 共同对应 [最终实际325输入](logs/25-final-tested-input.json)，tree `e9b9eddef84a11c3d54a65c4682c9d6aa60cc9baa57e00d8c346f80ddf6c606a`，最终回读 drift=[]；它只代表这两目标的实际源码/嵌入 SQL/JSON/CP 等输入，未声称全模块在该 SHA 测试通过。未变化的10/11按真实影响复用，不机械重复。

Broker 测试使用真实 Blob 与受控 Repository/Attempts/Inspector，覆盖 pinned Chat/Responses/legacy、伪 CP 版本、未知 callback/错误 Fault kind、CP hold 释放；它不替代默认 SDK 产品路径。CLI 使用真实 cmd/default Core/私有凭证管道，每协议 metadata GET1+模型 POST1、known 10+2、持久 attempt 与实际进程 Wait。两个 nested CLI 在 Start 后立即注册统一失败清理/真实 Wait，正常均自然退出。held Probe 用例证明 Close 3s超时仍持 Profile，实际 Probe 返回且 secret 副本清零后才清理。旧 schema8 完整 fake CP 被默认生产 Inspector 拒绝，明确注入原 Inspector 可纯核查；真实 Chat 旧字节兼容由[107报告](../107-protocol-common/REPORT.md)的独立旧 producer 样本控制承担，不能混为同一证据。

12 是装配后的过期负控预期，原 result 的初始 pending 分类与完整失败保留。110原 owner 已[仅维护一行并实际绿](../110-model-probe-expectation/REPORT.md)；本作者未改该文件。阶段记录14把三个导航中的 `-result` 误写成 `.result`，本报告以上实际链接已纠正，原运行事实未改。

22 使用默认生产 Engine/Inspector、真实 Broker/Blob/SQLite：Responses function_call→公开审批 reject→真实 Engine.Resume 发出第二 POST，此时 Stop/Done。完整 HUHUCP1 外层 metadata 与内层 v2/sidecar 均为 Responses 身份，原 Run/config/Decision/CP/known+unknown预算均保留。重开首先真实 blocked/CREDENTIAL_MISSING，实际重注册原 ref 返回 CREDENTIAL_REF_REUSED。随后仅在此一次性 ExecutorPaused Profile 显式模拟 credential_metadata.state=available，走实际 Recovery.Get→默认 Registry Inspector 正控为 ready，HTTP仍2/Host0，CP完整字节/程序位置/费用未改。**这是模拟当前凭证元数据的纯 Inspector 正控，没有恢复 Provider secret，也没有声称真实凭证恢复后可实际继续模型。** [19前提决策](logs/19-precondition-decision.md)保留最初未应用的“同ref重新Register”提案及Root拒绝原因；生产与资格门未改。

23 的 overlay 在实际执行前由[脚本](logs/15-prepare-construction-overlay.py)从当时 core SHA `d271ab45e892c0a73e93863e5c21526096535469e51874a530a9b1ad38f7f807`重建，未使用旧13副本。只将 Registry 第二参数换为已创建的 Chat，真实 Registry 重复协议拒绝时实际 Responses 也已创建；观察原 cleanup 的 Stop全部→实际Done全部→Close全部，两个具体 driver 的 Close 无错；随后同 Profile 用显式 Engine+Probe真实重开/Status/Close/Done。注入与观察仅存在外部 overlay/虚拟同包测试，产品无 test knob。这是空闲构造失败边界，不替代在途 HTTP producer join；后者由11与107/109相应真实 SDK 消费者验证。15 input 的 prepared_not_run 是执行前快照，实际执行由23记录，不将准备时状态冒称最终事实。

依赖固定 `openai-go/v3 v3.44.0`，实际导入后 tidy 只新增必需间接项 gjson1.18.0/sjson1.2.5/match1.1.1/pretty1.2.1；既有 Eino0.9.22、Ext0.1.13、ACL精确pseudo、fork0.1.6、jsonschema1.0.3及其他旧 pins 不浮动。最终 go.mod SHA `f75bb42bc7afa211ef83ccea510043658e9c624c56875b2e974b97da0c0387c7`，go.sum `414a2e043d0ae6c7635a410f99f637fef061270c92517c0a5c8ca9567da5cbad`。SDK真实 imports 在109 Responses，非空包保锁；未修改 module cache。已向Root提交[T27运行闭包/许可请求](logs/16-t27-runtime-closure-request.md)，不将 tidy 声明图或 SDK go.mod 的 Azure 条目冒称发行运行闭包。

## 问题与下一步

本作者范围没有剩余必需产品改动或检查。当前九源及 fixture持续停写，实际 Go/HTTP/SDK/结算/CLI 子进程均已退出并 Wait；22/23窗口已明确交还Root。未运行全Go、广域race/vet、插件build/lint、五平台编译、真实Provider/Obsidian/目标OS；本轮按Root安排只验证实际影响，107/109各自协议/共享helper矩阵与Root E2E另有边界，不借本报告代替。

T27/111原owner负责最终实际发行闭包/许可，Root负责新的联合默认入口E2E、独立双轴和T09正式代码门。真实现场为user-owned/not-run，未索密钥；未提交、推送、发布、归档或再委派。亲自 return 的只读结构结果与最终工件清单写入本任务logs后，原生MESSAGE+FINAL停止工作；结构校验不认证实现或验收完成。
