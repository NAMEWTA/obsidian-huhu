---
schema_version: 2
session: "20261025T043239Z"
task: "094-engine-policy"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-12
---

# T02/T12 模型连接测试与预算消费接缝

repo /home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715。Root已接纳091-recovery-review-r2与T16/G1代码门，正式更新Map22/Goal21；按本TASK与Root原生派遣实施。用户授权28票55AC完整代码，真实模型/Obsidian/目标OS由用户后验；不索凭证、不调用真实Provider、不提交推送发布归档。实现偏好gpt-6.1-sol/xhigh，不再委派。
按AGENTS workspace/catalog→当前Map→dev架构/测试/许可→本票及最小依赖→SpecDev I预检/实施/错误/可靠测试合同读取。完整读已接纳087报告及未来正式Chat联合窗口、Root官方文档核对笔记；历史047读取路径由087 sources定位，不猜文件名。旧报告建议不是当前源权威。当前代码底座的作者最终报告与Root代码门需按派遣冻结摘要核对。
同工作区只写明确owner范围及自有REPORT/log；正式Evidence/Map/Goal、他人报告、未开放共享文件只读。接口/路径缺口提精确消费者与最小需求，不能自建另一套Port/账本绕owner。重检查由Root唯一窗口，先获得依赖实际稳定摘要，不并行全仓构建；所有自有进程/producer实际Wait。完成REPORT首h2前Session/Task/Status、精确自有SHA、红绿/失败分类/实际命令exit/Wait/未运行；亲自return0后停写并native MESSAGE+FINAL。候选交回不等于Root验收。

## 写集
原T02 internal/application/assistant/{service,ports}.go、tests/contract/assistant/**；原T12 internal/adapters/outbound/sqlite/usage/**、tests/contract/collaboration-policy/**，仅围绕模型消费必要维护。默认保持既有生产实现，缺口先给具体调用点与最小变更；没有新迁移/Probe账本/公有HAP字段。T08 adapter/factory与T01 API/bootstrap/锁只读。

## 实施与验证
已冻结Probe为显式GET模型元数据，不执行生成；当前ModelProbePort足够则不改签名。TestModel不能把draft.Capabilities当实测，空capabilities可诚实表示仅访问成功；假key/endpoint/model显式传入、Persona/历史/资料/记忆不可达，错误不泄露底层secret。测试真实adapter loopback与现有assistant消费者；工厂/T01负责关闭资源，原service只维护明确必要接缝。

真实模型HTTP继续现有Run-bound Attempts，固定output bound4096和完整request字节估算；逐次reserve/dispatch/current authorization/实际producer结束/settle，unknown非零、返回API错误不假退未决。与T08约定真实HTTP故障控制点，为旧消费者补实际必要的预算不足HTTP0、并发争额度只一请求、撤权后下一轮0、cancel后late settle、known/partial/unknown费用、settle事务失败保留producer事实。若仅现有adapter测试能充分覆盖且原实现不变，交只读维护结论及证据，不为凑文件写重复测试或重写政策。

保留Root/Profile 4/8孩子并发、维护额度隔离、原消息/群成员/资格gate。Scope没有授权创建新Probe Run、通用预算域或绕Run外键的第二账本。按原owner返回精确diff/有效证据，由Root判断维护记录关闭。

## Root当前消费者回读提示

当前assistant/service.go的ListModels用全局probe非nil与credential available计算Available；首次装配仅Chat adapter时，需按ModelInfo的实际语义核对未实现Responses/Anthropic是否被误报可用。此为新默认装配的消费者风险，先给出代码/合同依据再做最小维护，不先新增公有字段或跑网络探测来填列表。TestModel现有入口已对Profile查询、显式draft与私有secret作校验，失败统一MODEL_PROBE_FAILED且defer clear；可以复用，不重建另一套凭证或路由。


正式Map22/Goal21窗口：<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-08-logs/engine-chat-window-map22.md</Path>，SHA256 `ca9ae6fa9e9e50720c4f93a705510d9726df87d525ea5ea6ad2a14610f712f8c`；前置091-recovery-review-r2 Input-SHA256 `a62e8c7de0b7ca0542f418e239344eb0ea2625f11d6f6e8ccc6872eb573db89a` / REPORT `5c78b49ff6b4b83669298f5f193e29b166d6da5f95e1eced617fe15c5e789109`。实际Root原生派遣才开始。本TASK一旦派遣不追改，补充仅经原生指令与正式窗口记录。
