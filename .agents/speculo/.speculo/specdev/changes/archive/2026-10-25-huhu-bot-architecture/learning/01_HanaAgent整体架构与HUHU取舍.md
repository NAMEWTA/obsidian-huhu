# HanaAgent 整体架构与 HUHU 的取舍

本篇服务于当前 HUHU Bot 架构设计。阅读日期为 2026-10-25；上游固定在 `liliMozi/openhanako@9a6cabf8c513db5edc6cf8179a538c9075885c6e`。OpenHanako 是仍在使用的仓库路径，当前产品名是 HanaAgent，并非本次对比的两个独立项目。[项目说明](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/README.md)、[改名说明](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/SECURITY.md)

证据范围：只读官方源码、配置和测试文件；没有安装依赖、启动项目、执行测试或调用模型。下文的“源码事实”表示固定版本可定位的实现；“HUHU 取舍”表示对本 change 的设计解释，不证明功能已经交付。研究没有复制上游实现代码。

服务装配源码区分公开入口与完整产品入口。本篇只对可见的公开源码作结论，未把其他产品部分视为已研究或已验证。[装配范围](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/server/composition/contract.ts#L1)

## 先看全图

HanaAgent 想把模型做成可长期使用的个人助手：能聊天，有人格和记忆，能调用工具，也能让不同设备访问同一批会话。这与 HUHU Bot 的方向相近，不过它自己拥有桌面程序和服务器，HUHU 则运行在 Obsidian 插件中。

```text
[桌面窗口]       [命令行]       [浏览器 / 手机]
     |              |                  |
     +--------------+------------------+
                    |
                    v
          [同一个服务入口]
          身份检查、请求路由、事件分发
                    |
                    v
             [引擎公共入口]
                    |
       +------------+------------+
       v            v            v
  [助手管理]   [会话与执行]   [模型与配置]
                    |
          +---------+---------+
          v                   v
    [执行框架适配]      [人格与记忆处理]
          |
          +------------+
          v            v
      [模型服务]    [受控工具]
                       |
                       v
                 [文件 / 终端 / 浏览器]
```

主图表示调用关系，不表示所有数据都在同一个数据库。会话历史、会话目录、记忆与配置在上游拥有不同的存储位置，必须单独看。

## 一步一步看

### 1. 先把“用户看到什么”和“谁执行任务”分开

源码事实：Electron 桌面通过 preload 得到连接信息；CLI 使用 HTTP 和 WebSocket；服务端可托管移动端页面。它们都访问 HanaAgent Server。手机页面不是第二个独立的 Agent 后端。[桌面入口](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/desktop/preload.cjs#L34)、[CLI 客户端](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/cli/client.ts#L14)、[移动页面路由](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/server/routes/mobile-static.ts#L51)

这解决了一个直接的问题：在电脑上开始的会话，可以由另一种界面继续操作，不必复制一份后台状态。

HUHU 取舍：未来 Web 与 Obsidian 连接同一个 Go Runner，经过同一应用入口使用同一个 Session、Run 和数据库。增加浏览器入口不要求先把 Runner 变成独立常驻服务；受管模式仍由 Obsidian 启动并负责结束。

### 2. 统一入口是接待处，具体业务分给不同负责人

源码事实：HanaEngine 对外提供公共方法，把助手、会话、配置、模型等工作委派给各 Manager/Coordinator。服务路由通过显式 composition context 获得依赖。[引擎入口](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/core/engine.ts#L1)、[服务装配](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/server/composition/open-root.ts#L69)

```text
[“发送消息”请求]
       |
       v
[统一应用入口]
       |
       v
[会话用例] --> [会话规则]
       |
       +----> [运行用例] --> [执行规则]
       |
       +----> [保存事务]
```

“接待处”是教学类比。实际源码不能仅凭目录名视为严格的领域分层：部分 context 的 engine/hub 仍使用 any，会话协调器仍通过注入的 getEngine 回到引擎获取媒体能力，并直接使用 SDK 会话。[装配合同](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/server/composition/contract.ts#L28)、[会话协调器](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/core/session-coordinator.ts#L2060)

HUHU 取舍：借鉴门面与明确装配，但将领域规则、应用用例、入站协议、出站实现分开。统一出口使用几个窄接口组合；不把全部依赖塞进一个可到处查服务的全局对象。

### 3. 一次聊天如何走到模型与工具

源码事实：主聊天由 SessionCoordinator 创建和使用 SDK 会话。模型管理器将配置投影到 SDK 模型注册表；工具在交给 SDK 之前套上权限包装。并发请求加载同一会话时，共享正在创建的 Promise，避免重复创建 SDK 会话及其 JSONL 写者。[会话创建与执行](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/core/session-coordinator.ts#L1770)、[单次加载](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/core/session-coordinator.ts#L6336)、[模型注册](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/core/model-manager.ts#L280)、[工具包装](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/core/engine.ts#L3250)

```text
[用户消息] -> [会话协调] -> [执行框架] -> [模型]
                                   ^          |
                                   |          v
                              [工具结果]    [工具请求]
                                   ^          |
                                   |          v
                                [执行] <- [权限判断]
```

源码中还有一条辅助文本调用路径：llm-client 按协议直接构造 Chat Completions、Responses 或 Anthropic Messages 的 HTTP 请求。这是文本工具能力，不能据此认定三协议的主聊天工具循环都已通过同样验收。[辅助模型请求](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/core/llm-client.ts#L460)

HUHU 取舍：区分“与模型说话的协议适配”与“反复调用模型和工具的执行循环”。三协议都要穿过同一个 HUHU 工具授权、预算、取消与恢复合同；摘要等辅助调用也不例外。上游主聊天使用的 SDK 不是 HUHU 选用的 Eino，不能直接搬入 Go 后端。

### 4. 工具自己描述动作，可信身份由服务端提供

源码事实：权限基础设施区分工具拥有的操作语义与宿主拥有的执行身份。工具包装会捕获会话绑定，在审批前后校验；操作目标或参数变化时不能继续用旧批准。[权限语义](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/lib/permission/tool-invocation-permission.ts#L1)、[审批与绑定检查](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/lib/tools/session-permission-wrapper.ts#L306)

```text
[工具声明：要改哪份资料]
             |
             v
[服务绑定：谁、哪次运行、哪个工作区]
             |
             v
[规则判断] -> [需要时请用户批准]
                         |
                         v
                  [再次检查绑定]
                         |
                         v
                     [实际执行]
```

这能防止一张批准票在等待过程中被换成另一项操作。HUHU 进一步把批准、实际派发与效果回执分别持久记录，处理“笔记已写入但回执没回来”的情况。

上游 session-options 中的工具重复调用保护使用内存 Map 和 Promise。它可合并当前进程里的重复工作，不能单独证明进程崩溃后不会再执行一次。[短期工具去重](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/lib/pi-sdk/session-options.ts#L101)

### 5. 多端访问先解决身份，再解决看见什么

源码事实：连接被区分为本机、局域网和远程等传输类别；认证结果再结合路由 scope 和对象能力判断。非本机事件接收还要满足工作区、聊天读取权限和会话订阅条件。[传输身份](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/server/http/transport-context.ts#L1)、[认证入口](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/core/server-auth.ts#L35)、[事件过滤](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/server/ws-scope.ts#L55)

浏览器建立 WebSocket 可以先申请短期、单次使用的票据；该票据绑定连接与路由。这里值得借鉴的是不把长期身份秘密直接放进反复使用的连接 URL，并不是断言其全部认证代码都已被本次安全验证。[连接票据](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/core/ws-auth-ticket.ts#L1)

HUHU 取舍：未来 Web 有自己的身份与授权；能读历史不自动获得写笔记、审批或清除 Profile 的权限。每次历史补读和持续事件投递都需检查权限，撤权必须停止后续投递。具体 HTTP/SSE 认证合同在 Web 实施时确定，不必照搬上游的全部网络入口。

### 6. 流式显示与可恢复事实是两件事

源码事实：上游流缓冲按 streamId、seq 保存内存事件，默认上限为 5000 条、8 MiB，并限制单条大小；一轮结束后清空事件数组。因此它适合短时断线补流，不能作为跨进程的持久事件账本。[流缓冲实现](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/server/session-stream-store.ts#L1)

```text
上游这段缓冲：
[当前回复事件] -> [有界内存] -> [断线后补发]
                       |
                  进程结束则丢失

HUHU 的目标：
[业务事务] -> [持久事件] -> [按游标读取] -> [客户端投影]
                  |
                  +----> [内存通知：有新内容可读]
```

HUHU 仍需要有界队列与慢消费者处理，但通知只用来唤醒读取。持久事件、效果回执和业务终态必须由服务端拥有，不能让浏览器最后显示的文字决定运行成功。

### 7. 人格、历史和记忆怎样分工

源码事实：一个 Agent 有自己的目录、会话与记忆资源；人格来源支持用户定制、语言版本、通用版本和示例的回退。后台记忆处理可以执行摘要、今日记忆、日记、长期记忆与事实抽取等不同任务；事实库使用 SQLite 和全文检索。[助手资源](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/core/agent.ts#L167)、[人格选择](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/core/persona-source.ts#L72)、[记忆任务](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/lib/memory/memory-ticker.ts#L1)、[事实存储](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/lib/memory/fact-store.ts#L98)

```text
[人格] ----描述助手如何表达----> [生成回答]
[历史] ----提供对话经过-------> [生成回答]
[记忆] ----提供被保留的事实---> [生成回答]

[历史] -> [摘要 / 事实抽取] -> [待保留的信息]
```

最后一条箭头在 HUHU P1 不自动批准为长期记忆；首版只使用用户明确固定的内容。

上游另有会话 manifest 数据库管理身份、归属与生命周期，而 SDK JSONL 保存聊天记录。存储多个数据库本身不是问题，重点是每种事实有明确 owner。[会话目录](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/core/session-manifest/store.ts#L274)

删除尤其需要单独定义。上游会话派生状态失效会处理摘要与事实，却明确保留聚合历史记忆。HUHU 已选择更明确的删除传播规则，必须覆盖受管副本和后台作业；未决效果只能保留最小核查记录。[删除派生状态](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/lib/memory/session-derived-state.ts#L6)

### 8. SDK 适配层不能只负责统一 import

源码事实：上游集中提供 SDK 导入入口，但另一些文件仍会读取 SDK 会话管理器的私有字段并触发内部重写。这说明集中导入有帮助，却还不能保证业务与 SDK 存储格式解耦。[SDK 入口](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/lib/pi-sdk/index.ts#L1)、[会话文件适配](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/core/session-jsonl-file.ts#L306)

HUHU 取舍：Engine Port 使用 HUHU 的输入和结果；Eino 消息、内部事件和 Checkpoint 编解码留在 adapter 中。读取普通历史不要求旧版本 Eino 能启动。这样更换模型执行框架时，主要改动落在接缝处。

### 9. 扩展有不同种类，不都叫“插件”

源码事实：Skill 快照保存启用目录与来源身份，不能等同于冻结所有内容字节；MCP 工具有独立包装和实时策略读取；部分插件通过同进程动态导入获得能力，受限 API 并不构成 OS 进程沙箱。[Skill 快照](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/lib/skills/session-skill-snapshot.ts#L56)、[MCP 工具策略](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/core/mcp/manager.ts#L2035)、[插件加载](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/core/plugin-manager.ts#L822)

HUHU 取舍：模板提供内容，Skill 提供指导，Tool 描述可执行能力，MCP 是外部能力协议，执行代码有独立信任边界。后续恢复应核对实际内容 hash 与工具版本；重新连接 MCP 不表示可以重放写调用。这些属于后续扩展，不因参考项目已有就全部纳入首版。

### 10. 谁拥有进程，决定谁能让它停止

源码事实：桌面复用已有服务前会核验认证后的健康信息和实例身份；关闭时区分自己启动的服务与附着的服务。单凭端口可连或 PID 存在不足以认领进程。[复用核验](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/desktop/main.cjs#L1101)、[退出所有权](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/desktop/main.cjs#L6264)

上游还设置了全部聊天连接断开后的宽限时间，届时可中止流；这是它的产品策略。HUHU 已确定页面关闭、订阅断开不取消 Run，因此不采用这项行为。[断连策略](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/server/routes/chat.ts#L305)

更关键的差异是宿主控制权：Electron 主程序能够在 before-quit 中等待，而 HUHU 的 ModuleRegistry 明确处理 Obsidian 不等待异步卸载的情况。HUHU Runner 因而需要自行检测父进程/pipe 失联并收尾，不能只照搬桌面关闭回调。[上游退出入口](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/desktop/main.cjs#L6306)；HUHU 依据：<Path>src/app/modules/registry.ts</Path> 的 disposeNow。

### 11. 宿主能力应是一条受控连接

源码事实：上游内部浏览器能力使用专门的 WebSocket 升级入口，单独认证并限制来源；浏览器管理器通过连接挂载。这展示了“客户端请求业务”和“宿主提供能力”可以是不同通道。[浏览器能力入口](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/server/index.ts#L1118)

```text
[Web 客户端] -> [应用用例] -> [Host 能力端口]
                                     |
                                     v
                            [Obsidian 宿主适配]
                                     |
                                     v
                                [Vault API]
```

HUHU 的 Host Bridge 据此保持独立职责：浏览器只是调用者，不能自报为 Obsidian，也不能取得 App、DOM 或任意文件系统入口。发送资料时绑定明确视图快照；Host 离线时报告不可用，不临时让 Go 绕过宿主写 Vault。

### 12. 对当前设计的具体影响

| 问题 | 可借鉴的思路 | HUHU 当前设计 |
| --- | --- | --- |
| 多端共享会话 | 一个服务，多种入口 | Go Application API＋可替换入站 adapter |
| 控制耦合 | 公共门面、显式装配 | 窄用例接口、领域纯规则、消费者定义 Port |
| 执行与模型 | SDK 注册及协议映射 | Eino adapter 隔离，三协议分别验收完整工具链 |
| 工具授权 | 操作语义与可信身份分离 | Broker、单次批准、派发重验和持久效果核查 |
| 流式体验 | 有界缓冲、序号和补读 | 持久 RunEvent 为权威，内存只唤醒 |
| 人格与记忆 | 独立资源与来源 | 修订化人格、手动固定记忆、明确删除传播 |
| 生命周期 | 区分服务 owner 与附着客户端 | 页面不拥有 Run，父失联可独立收尾 |
| 宿主资源 | 单独的能力连接 | Host 租约、视图快照、Vault API 边界 |

这些取舍的权威说明在 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ARCHITECTURE.md</Path>；用户已确认的决定在 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/ADR.md</Path>。学习材料本身不增加实施授权。

## 术语小词典

| 日常解释 | 术语 | 在图里的含义 |
| --- | --- | --- |
| 对外接待处 | Facade，门面 | 给调用者稳定入口，转交具体负责人 |
| 一项完整工作 | Application Use Case，应用用例 | 包含权限、业务行为和提交结果 |
| 必须遵守的业务规则 | Domain，领域 | 例如同一会话只能有一个前台运行 |
| 需要别人提供的能力插口 | Port，端口 | 声明需要什么，不规定怎样实现 |
| 插口的具体接线 | Adapter，适配器 | 把网络、SDK 或数据库接到用例 |
| 谁在请求 | Principal，请求身份 | 服务端确认的调用者，不能信任请求自报 |
| 哪些资料与操作可用 | Scope，权限范围 | 约束对象、动作和资料接收方 |
| 一次实际执行 | Run，运行 | 与页面和连接分开，有自己的状态 |
| 一次可能改变外部世界的动作 | Effect，效果 | 例如改写笔记，需记录派发和核查 |
| 执行过程中可继续的位置 | Checkpoint，检查点 | 引擎恢复材料，不能代替写入回执 |
| 告诉客户端读到哪里 | Cursor，游标 | 重连时继续补读的定位信息 |
| 按原意图只处理一次 | Idempotency，幂等 | 重发请求不会又创建同一项工作 |

## 你现在能复述什么

- HanaAgent 把界面、服务、模型执行和宿主能力分开，多种客户端访问同一服务。
- 统一入口让调用方式稳定；按业务分工和向内依赖才能进一步降低耦合。
- 模型连接成功、工具受控执行、跨崩溃恢复是三种不同证据。
- 内存去重和补流适合当前进程；HUHU 的写入核查与重启恢复还需要持久事实。
- 人格、历史、记忆和事件用途不同，删除和权限必须分别约定。
- 对 HUHU 而言，未来 Web 是同一服务的新入口；Obsidian 继续提供受控宿主能力。

仍需实际验证的技术问题：Eino 三协议的完整工具/取消/审批恢复接缝，Go 在拟发行平台上的 SQLite 与凭证行为，真实 Obsidian 强退后的效果核查，以及未来 Web 的认证和多端一致性。这些已进入架构验证义务；本次源码学习没有给它们标记通过。
