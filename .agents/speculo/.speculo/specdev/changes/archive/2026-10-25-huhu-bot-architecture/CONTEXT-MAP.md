# HUHU Bot 上下文关系

本图解释当前目标设计的所有权；外部行为和验收归 spec.md，术语各归下列文件。

```text
assistant --身份/配置--> execution <--资格/审批-- access
     |                     ^                       ^
     +--可见目录--> collaboration --调用树/预算-----+
                            |                       |
conversation --发送/成员--> 应用协调用例 <------------+
                            |
                 同一短事务受理 Run/委派/回执
                            |
execution --结果/事件--> conversation
     |                       |
     +--授权来源----------> memory --获准召回--> 准备上下文
```

| 上下文 | 拥有的事实 | 术语入口 |
| --- | --- | --- |
| assistant | Bot、人格/模型修订、描述和可用性 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/context/assistant.md</Path> |
| conversation | 单聊/群聊、成员与协调者、可见历史/来源 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/context/conversation.md</Path> |
| execution | Run/Effect/Receipt/RunEvent、恢复和终结 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/CONTEXT.md</Path> |
| access | Grant/Policy、Approval 决定、接收方与撤销 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/context/access.md</Path> |
| memory | 私有/全局/临时记忆、来源、修订与遗忘 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/context/memory.md</Path> |
| collaboration | 委派、通信回执、共享上下文、调用树 | <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/context/collaboration.md</Path> |

箭头不授权互写表。StartRun、Delegate、PublishGroupMessage、ResolveApproval、FinalizeRun 等应用用例拥有各自短事务；不跨模型网络或人工等待持有事务。跨域用窄合同协作，组合 API 不反向成为各用例的依赖。

Profile 是本机数据/配置域，Workspace 是资料授权域。P1 已有 collaboration 消费者；通用长期 work、knowledge 与 extensions 只在后续真实需求出现时建立。UI、HTTP 和 stdio 是适配入口，不是新的业务上下文。

## 实施责任映射

| 上下文 | 行为票与界面消费者 |
| --- | --- |
| assistant | T-02 配置；T-08/09/10 模型；T-22 配置界面 |
| conversation | T-03 单聊；T-13 群聊；T-21/22 交互 |
| execution | T-03/04 持久运行/事件；T-06/07 效果；T-16 恢复；T-23 操作 |
| access | T-05 来源/Grant；T-06 审批；T-07 Host；T-23 权限界面 |
| memory | T-14 私有；T-15 全局；T-24 记忆管理 |
| collaboration | T-11 委派；T-12 通信/预算/结果；T-13 群路由；T-23 关系 |

数据清除/portable/迁移由 T-17/18/19 协调用例负责，不额外创造第七个拥有重复事实的业务域。统一接口、装配、工程与总验收分别由 T-01/20/27/28 承接。导航以 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/tickets-map.md</Path> 为准；参考项目比较见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path>。
