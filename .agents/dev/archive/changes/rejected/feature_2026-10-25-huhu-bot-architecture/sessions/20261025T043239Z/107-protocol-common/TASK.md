---
schema_version: 2
session: "20261025T043239Z"
task: "107-protocol-common"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-08
---

# 多协议common与共享HTTP最小维护

## Goal

原owner native:/root/engine_adapter 将已接纳106有限合同实现于原common/Chat边界，供109 Responses及未来Anthropic复用；保留实际旧Chat CP/digest与已验收生命周期语义，不新建Application服务。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715。Map26/Goal25，evidence/T-09-logs/responses-window-map26.md SHA256 e2b663255603ca32d3fc7fdaa9ec6dd858d2a0e88f29c1573ec32a2aa397af83。Chat r2代码门已接纳：102独立pass、Root r4新构建本地产品流程和结构/AC验证通过；原098红及100/101修复证据保持。Map26计划/4执行记录校验0。

采用你106完整有限附件SHA256 63a9f3bff30f9c2fb14f596a82e27f5216aab4c7951ff5240060686b584eaee2及Root冻结补充 evidence/T-09-logs/protocol-contract-map26.md。097固定Responses SDK研究和105已完成Anthropic准备只作消费需求参考。Map→dev→T08→Goal；已有I/preflight/设计/TDD/错误/异步/风险规则未变可复用。用户完整28票55AC和Agent Team授权持续，真实模型/Obsidian/目标OS由用户后验，无提交推送发布归档。

## Workspace and Scope

只写native/huhubot/internal/adapters/outbound/eino/common/**；chat/driver.go的薄接口适配；新增httpcall/runtime.go、attempt.go、body.go；tests/contract/engine/chat/**内对应合同/必要fixture适配；本任务REPORT/logs。旧Chat body/协议stream判读及整套request/worker不迁移；如有确切新增需要先给Root最小事实。Responses/Anthropic目录、bootstrap/locks/Broker/API/HAP/SQL/TS/notices/正式状态只读，不再委派。

当前109持唯一初始Go窗口，先写现有公开API/default bootstrap可编译的Responses有效缺失行为红；108仅只读准备。**本任务先只读准备，禁止生产修改/Go，等Root通知109红已实际Wait。其后你先获窄Go窗口保存旧Chat producer实际CP与可信检查/恢复输入、legacy digest/encoding样本，再通知Root；尚未保存前108/109仍不得改生产。** 样本必须来自旧真实producer，不用新codec自我往返替代兼容。后续非重叠写集可并行编辑，每次Go检查/tidy前Root冻结相关writer并授唯一窗口。

固定GOTOOLCHAIN=go1.26.10、GOWORK=off、GOEXPERIMENT为空、常规CGO0与GOFLAGS=-mod=readonly；race明确CGO1。原Chat依赖不变，新SDK锁由108在真实import后独占。不要机械重跑全部旧大队列。

## Acceptance

1. 按106有限ProtocolIdentity/Generation/StateView/TurnResult/ProtocolDriver/Registry实现，同一不可变registry用于Engine/Inspector/Probe/selector/纯metadata。精确Chat identity原样，Responses identity为huhu-openai-go-3.44.0-responses-bridge-v1和huhu-openai-responses-state-v1。不提前装配Anthropic占位。构造typed nil/重复/非法identity拒绝，成功才转移driver所有权；失败由调用方真实Stop/Done/Close。Registry/Engine停机覆盖所有driver/Probe/Run/settlement，无全局当前协议。
2. Generate前ValidateState当前视图，返回后common整批message/工具验证，再candidateView/sidecar纯验证，最后提交并首Invoke；文本终结也校验。Inspector/Resume同核，保留100可信accepted Intent、原Decision和完整transcript位置，不扩大旧history真实性承诺。ProtocolState复制，不让driver返回后修改。新协议CP含完整必需state并受最终1MiB编码上限；按可信config选decoder，不按CP自选协议。
3. Chat legacy DTO严格字段/顺序/nil形态/无新字段、Format/Engine/seed/digest及原nil sidecar保持逐字兼容。运行状态可扩，Chat编码必须沿完全旧DTO，不能加omitempty字段后声称同一格式。旧真实CP在新Inspector及Resume保持合法；非空opaque/未知新字段、错protocol/Intent等在Resolve/HTTP/Invoke前拒绝。Resume工具批不重复已完成副作用。
4. 新httpcall只依赖std+既有api，负责单次准确POST最终wire校验和字节Reserve/Dispatch、真实tracked原Body、raw UTF8/SSE界限、取消/idle/cleanup、每Runtime单结算worker及Stop/Done。补Call/ProbeCall.Context及RequestSpec同步raw SSE callback（Root补充），生产前向109给准确有限签名。协议items/usage规则由driver掌管，不能以SDK过滤后的事件代替raw observer。Probe仅受限准确GET/10s/64KiB无Attempts，不可绕生成账本。
5. 覆盖SDK在Do后ctx取消而response未暴露、>=400 ReadAll/替换body、真正Close受barrier阻挡、Next/sink失败/panic、超限与非法UTF8。Finish幂等，实际SDK循环结束+原Body.Close返回+自身timer/callback join后才ProducerEnded。超时也保留唯一清理责任；Settle暂失败由Runtime单worker重试，Stop不提前Done，不新增HTTP/Run。SDK/credential仅借用不入state/log，所有实际进程/线程职责可回读。
6. 关键验证是旧Chat CP/审批、100两修复、原F09关闭/F19本地结算及新registry混协议路由、shared helper实际消费者。109/108覆盖Responses/装配业务，你只做自有受影响target/race；构造、纯validator、第二工具非法的零Invoke、电账和Close必须有真实边界控制。第一红可复用109真实缺失行为；保存每次实际输入/log/exit/Wait及失败分类。Root另做新E2E与独立双轴，不自报全部完成。

## Return

先同步有限辅助签名与旧CP实际采样回执，再交稳定生产接口给108/109消费；验证由Root统一授窗。REPORT首h2前Session: 20261025T043239Z、Task: 107-protocol-common、Status，含聚焦交接、产物与验证、问题与下一步。记录dev真实调用、最小设计/实际红绿、自有文件SHA/diff和只读接口摘要、全部原始结果/Wait、兼容样本与artifact manifest。亲自validate-dispatch return0后原生MESSAGE+FINAL停写；Root全文回读才推进正式状态。现场用户后验，不索密钥。
