# Chat 模型适配联合窗口（Map22 / Goal21）

T16及底座完整代码门已由Root接纳，独立审查091-recovery-review-r2，Input-SHA256 a62e8c7de0b7ca0542f418e239344eb0ea2625f11d6f6e8ccc6872eb573db89a，REPORT SHA256 5c78b49ff6b4b83669298f5f193e29b166d6da5f95e1eced617fe15c5e789109；前置代码gate为.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-16-logs/code-gate-recovery-r2.json。按原DAG开启T08及T01/T02/T12必要原owner维护，实际生产写入须Root原生派遣。28票55AC、原权限/数据合同与用户现场后验边界保持；不提交、推送、发布或归档。

## 采用的技术路线

已接纳087报告SHA595a39e40281ce264475161dfdebc34e6eda1f6cc1eac7e622e472cc8ef7e322。选择B：eino子树内有界的单Run协议/工具循环，三协议后续复用同一控制与预算合同；不新建调度器、账本或恢复资格状态机。保留A完整Eino Runner作为已比较备选，不因SDK中断语义缺口降低HUHU行为。应用层只见现有HUHU Engine Port。

实际生产依赖固定按047/087：Eino v0.9.22、EinoExt openai v0.1.13、实际组合ACL v0.1.18-0.20260924031408-10df7cac3f6d、底层meguminnnnnnnnn/go-openai v0.1.6；由T01唯一go.mod/go.sum owner维护真实消费闭包。不得只空引入模块凑版本或复制整个研究锁。固定Ext公共Stream无法证明隐藏producer结束时，在同一adapter内最小接桥并明确复用位置与来源，不能改module cache或手写另一套通用SDK。源码改编必须由T27补实际来源/许可/NOTICE。

默认生产CLI必须在bootstrap/core.go接入同一个真实Engine与Inspector。provider创建后绑定已验证ProfileID的私有resolve闭包；显式测试Engine注入保留。仅使用受理时pinned Config/Agent/Lineage，不从最新Bot配置或环境获取key/model/endpoint；secret不进入CP/事件/日志。Default factory不能仅存在于测试注入。

连接测试选择元数据访问路线，继续使用现有ModelProbePort；只在用户明确动作读取对应协议的模型元数据，不生成文本，不发送Persona/资料/历史/记忆。Chat以固定SDK明确模型GET为准，返回匹配的model ID且目的地不可被modelId路径片段改变。没有可实证能力返回空capabilities，不照抄draft；不支持或缺模型明确失败，不自动改成收费生成。该路线不新增Run/SQL账本/公有HAP schema，不推断第三方计费政策。T09/T10稍后各自补协议实现，当前未实现协议保持明确不可用。

每个实际生成HTTP均走已绑定Attempts的Reserve→Dispatch→真实producer结束→Settle；工具回填后的下一轮也是新attempt，绝无SDK/HTTP隐藏retry/redirect/failover。首版不启用自动推理重试；用户重试仍沿现有Run语义。已Dispatch后任何失败保守计费，不能AbortUnsent。完整usage才known，缺失/部分保持unknown；settle失败保持未决并使Core drain等待，不伪造ProducerEnded。取消后不接纳晚块/新工具/新HTTP；读/Close与实际producer Wait分别证明。

输出采用私有版本化有限界限：默认max_completion_tokens=4096并与OutputBound一致，n=1；完整序列化输入按UTF-8字节作声明的保守估算，含工具schema/历史/结果，不能假零。每Run/跨Resume保留有限turn计数；响应/单行事件/参数/结果/文本/完整CP和总时限均有界，具体常量由T08在早期接口说明中给出并对应F10验证，不新增未批准公有选项。现有CP payload1MiB上限保持。

完整工具batch先合法化再调用；仅pinned AllowedTools与已实现类型化registry交集。首个pending审批停止全部后续effectful调用，完整CP保留已完成结果、pending原CallID/EffectID、原顺序未执行项和真实继续位置。Resume回填原Decision而不重Invoke已完成/pending效果；拒绝/过期不重写，未知效果依原资格门阻断。CP内层版本/协议/工具digest/固定配置身份完整语义检查；HUHUCP1外壳继续由Blob Port拥有。EngineVersion使用明确兼容身份而非无差别默认，真实值与唯一bootstrap装配同步。

## 原owner窗口草案

- T08 /root/engine_adapter：原common/**、chat/**、engine/chat合同测试与chat provider fixtures；实现factory私有合同与metadata probe驱动。其余生产只读。
- T01 /root/foundation_go：go.mod/go.sum、bootstrap/core.go以及必要纯application/api合同（默认无需新增）、foundation产品装配测试。负责实际依赖图、Default Engine/Inspector/Probe与私有Profile resolver和关闭顺序；不接管T08文件。
- T02/T12 /root/credential_provider：assistant/service.go/ports.go与assistant合同测试，usage既有消费者及collaboration-policy测试，仅围绕元数据Probe行为和真实HTTP预算/取消/unknown接缝。先判断既有端口足够；没有明确缺口不改生产、不新建Probe持久域。持久扩张或迁移须先提具体最小请求。
- T27 /root/build_integration：后续独立串行窗口按真实最终编译闭包维护notices输入/当前第三方说明/生成通知；等待时无writer。模块T20/UI及其余已完成票本轮只读。需要额外路径回Root按原owner精确开窗。

## 验证与交回

先冻结私有factory/resolver/EngineVersion和三方消费边界，再实现单HTTP→持久消息垂直路径；087 F01–F20故障矩阵逐项说明实际结果/不适用依据。真实loopback HTTP/SSE必须穿同一application/Executor/Broker/SQLite，真实服务端请求计数与producer done、attempt/effect/CP/消息回读，不能只mock底层Port通过。审批/取消/unknown/多工具/断流/尾usage/CP语义损坏与默认CLI装配为必验。已有未变底座证据按影响复用，重矩阵唯一窗口；所有子进程Wait。

最终同输入Root独立E2E及未参与实现者双轴审查，T27许可一致；产品TS未变不强行重复插件build。真实Provider live套件可交用户显式启用但not-run不冒称通过。正式状态只由Root在完整回读实际MESSAGE+FINAL、report/source SHA和return0后推进。
