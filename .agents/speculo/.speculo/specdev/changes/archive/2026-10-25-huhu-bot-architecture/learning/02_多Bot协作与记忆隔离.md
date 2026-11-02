# 多 Bot 怎样协作，又怎样保持各自记忆

本篇接续用户在 LOG-033–035 中提出的问题：已有 Bot 互相通信，与临时 sub-agent 有什么区别？群聊和 Leader 是否需要另一套引擎？自动记忆如何与全局确认共存？默认读者不需要了解 Agent 框架。

读取日期为 2026-10-25。来源固定为 HanaAgent `9a6cabf8c513db5edc6cf8179a538c9075885c6e`、OpenClaw `090e6213e25e6b09f03590a41da2fddeaf9f611e`、OpenBot `46642d6c91daa663bccff673595f4e12a419a496`、DeepSeek-Bot `1bebe826f74e9a72cabafd3b80602b05af867b38`。全部为源码阅读；没有安装、运行上游或执行其测试。本篇不以热度代替适用性，也没有把 OpenBot 冒称为用户所说的 Grokbot；MERS 未唯一定位，未据此编造能力。

第一篇保留当时的 HUHU 单助手/人工记忆取舍，属于后续用户扩展范围之前的记录。本篇解释新理解；本项目当前行为以 spec.md、架构取舍以 ADR-023–024 为准。

## 先看全图

```text
用户
  |
  +-- 选择一个 Bot --------> 单聊
  |
  +-- 选择多个 Bot --------> 群聊 + 指定协调者
                                |
                        一次任务的根执行
                                |
                       同一引擎和受控工具
                                |
              +-----------------+----------------+
              |                                  |
       发现 / 通知 / 询问                    派遣子任务
              |                                  |
       已有 Bot 的描述目录            +-----------+----------+
                                     |                      |
                               已有 Bot 执行             临时配置执行
                                     |                      |
                               新的独立工作线程          临时工作线程
                                     +-----------+----------+
                                                 |
                                            结果回到父任务

长期身份：Bot A          Bot B          Bot C
          |              |              |
      私有长期记忆    私有长期记忆    私有长期记忆
          +--------------+--------------+
                         |
              全局记忆：经过用户确认才共享
```

图中“派遣”增加的是一次工作和它的独立上下文，通常不会增加一个永久 Bot。可以把 Bot 理解为一个有职责和个人笔记的同事；Run 是它这一次接到的工作。这个类比只帮助理解，权限与数据仍必须由程序检查。

## 一步一步看

### 1. 先区分“找谁工作”和“再创建一个人”

Hana 的 `subagent` 工具支持列出已存在 Agent 的 ID、模型和简介，解析目标后创建 task/thread，再用该已有 Agent 执行。真正增加持久 Agent 是另一个 `createAgent()` 方法，会写配置和独立目录。调用同一个人两次，不等于复制两个人。[目标发现与解析](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/lib/tools/subagent-tool.ts#L284)、[独立执行](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/core/session-coordinator.ts#L7599)、[持久身份创建](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/core/agent-manager.ts#L628)。

OpenClaw 同样把三件事分开：`agents_list` 从允许名单和已有配置中找目标；`sessions_send` 向已有会话投递；`sessions_spawn` 为已配置的目标创建新的 subagent 会话。未知 Agent 会被拒绝，不因名字出现在参数中就注册新身份。[发现工具](https://github.com/openclaw/openclaw/blob/090e6213e25e6b09f03590a41da2fddeaf9f611e/src/agents/tools/agents-list-tool.ts#L73)、[既有会话发送](https://github.com/openclaw/openclaw/blob/090e6213e25e6b09f03590a41da2fddeaf9f611e/src/agents/tools/sessions-send-tool.ts#L139)、[子执行身份](https://github.com/openclaw/openclaw/blob/090e6213e25e6b09f03590a41da2fddeaf9f611e/src/agents/spawn-plan.ts#L59)。

```text
已有 Bot 的定义 + 本次任务 + 指定资料
                   |
                   v
            新的执行线程 / Run
                   |
             执行完成，回传结果
                   |
            Bot 的长期身份仍是原来那个
```

HUHU 据此分开 AgentId、SessionId、DelegationId 与 RunId；临时 target 也使用同一个引擎。用户已明确：只有明确要求创建持久 Bot 时，才增加左侧名册；临时任务放在任务关系里。

### 2. 提示词告诉模型有哪些人，工具让协作真正发生

模型可在上下文里看到“资料助手擅长找来源，写作助手擅长组织文字”。这让它能选人，但文字本身不会启动另一个执行者。工具接收目标、任务、限制、期望产物，应用用例验证后才受理。

OpenBot 的 `message_bot` 参数明确分为 bot、task、constraints、expecting。交付端为目标 Bot 创建临时工作线程，收到结果后投回来源；受理返回排队状态，不允许把尚未收到的结果当作完成。[结构化工具](https://github.com/CopilotKit/OpenBot/blob/46642d6c91daa663bccff673595f4e12a419a496/server/src/agents/handoff-tool.ts#L43)、[目标工作线程](https://github.com/CopilotKit/OpenBot/blob/46642d6c91daa663bccff673595f4e12a419a496/server/src/agents/handoff-delivery.ts#L248)。

Hana 另外把 `dm` 定位为信息通知，任务用 `subagent`；DM Router 有防重入和最多三轮回复。HUHU 不必照搬轮数，但要区分送达、应答与任务完成，并用真实预算和有界唤醒阻止来回聊天不结束。[DM 工具](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/lib/tools/dm-tool.ts#L39)、[回复边界](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/hub/dm-router.ts#L144)。

### 3. 群聊可以共用引擎，但必须决定谁回应

三个相似产品实际采用不同规则，不能只看它们都有群聊。

| 项目 | 已查到的群聊机制 | 与 HUHU 的取舍 |
| --- | --- | --- |
| Hana | @ 成员优先，其他成员也收到；成员可 reply/pass，轮次有 guard | HUHU 选择 @ 仅唤醒指定成员，减少无意模型调用 |
| OpenBot | 共享 transcript，各 Bot 独立 thread；参与者按队列依次运行 | 借鉴公共记录与私有线程分开，不推定其默认是并行 Leader 团队 |
| DeepSeek-Bot | 默认 admin 回应，@ 选择成员；长任务可后台继续并向 askedBy 回传 | 与 HUHU 协调者模式接近，但不借用其管理员额外权限 |

依据：[Hana 调度顺序](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/lib/channels/channel-ticker.ts#L477)、[OpenBot 群队列](https://github.com/CopilotKit/OpenBot/blob/46642d6c91daa663bccff673595f4e12a419a496/server/src/channels/group.ts#L1190)、[DeepSeek 发言选择](https://github.com/Fei2411/DeepSeek-Bot/blob/1bebe826f74e9a72cabafd3b80602b05af867b38/ds-bot/src/host/groups.js#L748)、[后台工作返回](https://github.com/Fei2411/DeepSeek-Bot/blob/1bebe826f74e9a72cabafd3b80602b05af867b38/ds-bot/src/host/groups.js#L804)。

```text
群消息 -> 判断明确 @ 的成员
              |
       +------+------+
       |             |
      有             无
       |             |
   指定成员       协调者回应
       +------+------+
              |
    需要协作 -> 同一派遣工具
              |
      子任务结果 -> 协调/汇总
```

在已查 Hana/OpenBot 相关代码中没有一等 Leader 权限对象；这不证明所有外部 Agent endpoint 内部也没有。HUHU 将 Leader 作为已有 Agent 的群内协调角色，是本项目设计，而非对上游能力的误报。

### 4. 不能把“主 Bot”变成默认拥有一切权限的人

DeepSeek-Bot 的 Main Bot 是平台角色，可以有多个；群 admin 又是另一角色。`create_bot` 需要 Main Bot，主 Bot 提示词甚至允许判断是否值得创建长期专家。这与 HUHU“持久新建需要用户明确意图”不同。[Main Bot 判断](https://github.com/Fei2411/DeepSeek-Bot/blob/1bebe826f74e9a72cabafd3b80602b05af867b38/ds-bot/src/host/store.js#L340)、[创建工具](https://github.com/Fei2411/DeepSeek-Bot/blob/1bebe826f74e9a72cabafd3b80602b05af867b38/ds-bot/src/host/tools.js#L253)、[主 Bot 提示词](https://github.com/Fei2411/DeepSeek-Bot/blob/1bebe826f74e9a72cabafd3b80602b05af867b38/ds-bot/src/host/prompt.js#L27)。

OpenBot 则在每一跳重新取得当前用户可见名册，检查目标、暂停和通信授权；队列事务处理重复与数量限制。这提示 HUHU：prompt 中看见一个名字，不等于拿到它的资料权限。[每跳授权](https://github.com/CopilotKit/OpenBot/blob/46642d6c91daa663bccff673595f4e12a419a496/server/src/agents/handoff.ts#L194)、[持久队列受理](https://github.com/CopilotKit/OpenBot/blob/46642d6c91daa663bccff673595f4e12a419a496/server/src/work/queue.ts#L229)。

HUHU 派遣权限是用户、父任务、被派 Bot、资料接收方和当前撤销状态的交集；Leader 不能借对方更大的权限执行自己的受限请求。

### 5. 每个人有笔记，不表示他的笔记可以在任何群里讲

Hana 把群聊摘要写进各自 Agent 的 FactStore，来源标频道。工具按当前 Agent 绑定，但通用 PathGuard 存在外部读取策略，所以“分目录”不能被当作强制记忆隔离证明。[各自写入](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/hub/channel-router.ts#L1034)、[路径策略边界](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/lib/sandbox/path-guard.ts#L146)。

OpenBot 的记忆查询区分用户自身事实与 Bot 形成的观察。后者要匹配形成该事实的 Bot，还检查来源应用授权。可以借鉴 owner 和 provenance 的检查，而不是仅按一个字符串标签过滤。[查询约束](https://github.com/CopilotKit/OpenBot/blob/46642d6c91daa663bccff673595f4e12a419a496/server/src/memory/store.ts#L281)。

DeepSeek-Bot 有 own/group/team 三个真实 scope；成员群会话可以载入自身、团队和当前群记忆。Main Bot 和任意群 admin 可写 team，私聊自动 review 也可能使用该权限。这与 HUHU 的全局写入确认规则不同，不能照抄。[scope 与写权限](https://github.com/Fei2411/DeepSeek-Bot/blob/1bebe826f74e9a72cabafd3b80602b05af867b38/ds-bot/src/host/memory.js#L523)、[群上下文注入](https://github.com/Fei2411/DeepSeek-Bot/blob/1bebe826f74e9a72cabafd3b80602b05af867b38/ds-bot/src/host/memory.js#L756)、[自动 review](https://github.com/Fei2411/DeepSeek-Bot/blob/1bebe826f74e9a72cabafd3b80602b05af867b38/ds-bot/src/host/memory.js#L1380)。

```text
一次对话 -> 来源和范围检查 -> Bot 自己的长期记忆
                                    |
                          想让其他 Bot 共同使用
                                    |
                               全局提案
                                    |
                              用户确认内容/范围
                                    |
                             Profile 全局记忆
```

HUHU 不增加未请求的自动群级长期库。群历史是共享记录；各 Bot 私有记忆仍带来源范围，临时任务有自己的记忆空间；全局提案在确认前不能被召回。删除来源也要处理自动派生记忆，避免删了聊天却仍能从记忆复述出来。

### 6. 界面应该体现身份和工作，而不是展示引擎内部

OpenBot 的名册按待处理、置顶、自有等信息组织身份；一个 Bot 条目显示职责和状态。这比把每个执行线程放进主目录更符合用户找助手的任务。[BotRoster](https://github.com/CopilotKit/OpenBot/blob/46642d6c91daa663bccff673595f4e12a419a496/app/src/components/bots/bot-roster.tsx#L38)。

HUHU 已有 52px 图标轨、默认 280px 上下文侧栏和叶子宽度响应式。本轮复用这个外壳，左侧找持久 Bot/群，主区对话，任务卡解释“谁派给谁”和等待什么；临时 sub-agent 放在任务树，记忆页明确私有/全局。早期曾生成三种候选；用户 LOG-040 已选定 UI-001/final 为唯一方案，其他候选已移除。实施只使用已批准 DESIGN revision 2，不继续比较布局。

### 7. 参考项目没有替我们证明什么

Hana 的子代理固定策略禁止进一步派生和若干记忆写入；HUHU 用户已要求可再委派，因此采用自己的有界策略。[上游限制](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/core/session-permission-mode.ts#L72)。DeepSeek 的部分工作结果还存在进程内 Map，这不能证明 HUHU 的持久防重放与恢复合同。[结果存储](https://github.com/Fei2411/DeepSeek-Bot/blob/1bebe826f74e9a72cabafd3b80602b05af867b38/ds-bot/src/host/handoffs.js#L18)。

本轮没有运行真实群聊、测试其记忆质量、复用外部 UI 源码或接入它们的服务。HUHU 仍要单独验证三协议、Go/Eino、数据库事务、跨窗口、父子取消/恢复和权限/删除传播；原型只表现交互意图。

## 术语小词典

| 日常说法 | 术语 | 在本设计中的意思 |
| --- | --- | --- |
| 长期同事 | Agent / Bot | 持久身份、职责、模型、权限和私有记忆 |
| 这次工作 | Run | 一次可受理、取消、恢复、终结的执行 |
| 分出去的一项工作 | Delegation | 父子关系、输入、结果目标和完成责任 |
| 各自的草稿本 | 工作线程 | 某次任务的隔离上下文，不等于新 Bot |
| 协调人 | Leader | 默认接话、规划与汇总的角色，没有超级权限 |
| 资料信封 | ContextEnvelope | 明确允许跨任务传递的内容、来源与约束 |
| 记忆的来历 | Provenance | 来源、修订、范围及删除/撤销传播依据 |
| 全组共用备忘 | 全局记忆 | Profile 内经用户确认可共享的长期内容 |

## 你现在能复述什么

1. 同一引擎可以运行不同 Bot；不同的是身份、配置、上下文和权限。
2. 创建子执行通常增加任务线程，只有明确持久创建才增加 Bot 名册。
3. prompt 负责让模型知道怎样协作，工具与应用服务负责实际受理和限制。
4. 群聊需要决定谁回应、何时停止、如何回传，不必另造一种引擎。
5. 自动私有记忆与确认全局记忆可以共存，但范围检查和删除传播必须跟上。

仍未验证的是运行表现与具体 UI 可用性；这些分别交实施验收和用户自行安排的浏览器检查，不把源码阅读当测试通过。

## 实施接续

本篇是机制理解记录。最新维护/许可证/依赖/已知限制核验补充在 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path>；对应实施责任见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/tickets-map.md</Path>。阅读源码不替代三协议、持久化与宿主的真实验收。
