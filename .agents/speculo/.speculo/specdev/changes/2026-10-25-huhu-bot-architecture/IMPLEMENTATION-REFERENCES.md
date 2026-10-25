# 实施参考、复用判断与检索入口

## 适用合同

本文件由 T 拥有，承接用户 LOG-042 的要求：遇到不熟悉的功能，先检索 GitHub 上近两年活跃、许可证明确的同类项目，比较实现、依赖和已知问题，再决定复用。它是实施决策依据，不替代 Spec、已批准 DESIGN 或实际运行证据。

本轮核验日期为 2026-10-25，活动窗口为 2024-10-25 至 2026-10-25。以下均找到窗口内默认分支提交；近期有提交仅证明维护活动，不等于质量、安全或 HUHU 兼容性已通过。源码固定到提交，运行依赖仍由实施票选择发布版本并锁定。OpenClaw 活跃 HEAD 已移动，机制阅读继续使用原固定提交。

## Research：哪些现成机制值得复用

- **Decision / target：** 给 T-01–28 的模型、协作、记忆、存储、凭证和 UI 实施选择提供依据；唯一 owning artifact 为本文件。
- **Questions：** 是否有近期维护与明确许可；实现和依赖是什么；与 HUHU 合同的差异、已知问题是什么；采用哪些机制及怎样验证。
- **Stop condition：** 每个重点陌生领域至少有具名可回读源码/官方限制，明确可用与不采用边界，并有负责 Ticket。实际版本兼容和 OS 表现交实施探针，不无限扩大仓库数量。
- **Evidence：** <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/reference-audit.json</Path> 保存提交时间、SHA、许可/清单 URL 与文件摘要。GitHub REST 后段遇限流，驱动/凭证的活动证据改用只读浅克隆提交记录；没有安装依赖、执行上游程序或复制其实现。

| ID | 项目 | 最近核验的默认分支提交日 | 本次参考提交 | 固定许可 |
| --- | --- | --- | --- | --- |
| REF-01 | [cloudwego/eino](https://github.com/cloudwego/eino) | [2026-10-19](https://github.com/cloudwego/eino/commit/0a5ca53b9d3bf7b661dccc863465ec568a421eea) | `0a5ca53b9d3bf7b661dccc863465ec568a421eea` | [Apache-2.0](https://github.com/cloudwego/eino/blob/0a5ca53b9d3bf7b661dccc863465ec568a421eea/LICENSE-APACHE) |
| REF-02 | [cloudwego/eino-ext](https://github.com/cloudwego/eino-ext) | [2026-10-19](https://github.com/cloudwego/eino-ext/commit/eee37f63ff9548c5eaec48fc157863339f8eda07) | `eee37f63ff9548c5eaec48fc157863339f8eda07` | [Apache-2.0](https://github.com/cloudwego/eino-ext/blob/eee37f63ff9548c5eaec48fc157863339f8eda07/LICENSE) |
| REF-03 | [liliMozi/openhanako](https://github.com/liliMozi/openhanako) | [2026-10-11](https://github.com/liliMozi/openhanako/commit/9a6cabf8c513db5edc6cf8179a538c9075885c6e) | `9a6cabf8c513db5edc6cf8179a538c9075885c6e` | [Apache-2.0](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/LICENSE) |
| REF-04 | [CopilotKit/OpenBot](https://github.com/CopilotKit/OpenBot) | [2026-10-24](https://github.com/CopilotKit/OpenBot/commit/46642d6c91daa663bccff673595f4e12a419a496) | `46642d6c91daa663bccff673595f4e12a419a496` | [MIT](https://github.com/CopilotKit/OpenBot/blob/46642d6c91daa663bccff673595f4e12a419a496/LICENSE) |
| REF-05 | [Fei2411/DeepSeek-Bot](https://github.com/Fei2411/DeepSeek-Bot) | [2026-10-23](https://github.com/Fei2411/DeepSeek-Bot/commit/1bebe826f74e9a72cabafd3b80602b05af867b38) | `1bebe826f74e9a72cabafd3b80602b05af867b38` | [Apache-2.0](https://github.com/Fei2411/DeepSeek-Bot/blob/1bebe826f74e9a72cabafd3b80602b05af867b38/LICENSE) |
| REF-06 | [openclaw/openclaw](https://github.com/openclaw/openclaw) | [2026-10-25](https://github.com/openclaw/openclaw/commit/1cb75e90b29b73dbfc4c1d099a25b25e2e62702f) | `090e6213e25e6b09f03590a41da2fddeaf9f611e` | [MIT](https://github.com/openclaw/openclaw/blob/090e6213e25e6b09f03590a41da2fddeaf9f611e/LICENSE) |
| REF-07 | [mattn/go-sqlite3](https://github.com/mattn/go-sqlite3) | [2026-09-28](https://github.com/mattn/go-sqlite3/commit/dbbe931904f2ee06546448fbe7cf7780f61bc110) | `dbbe931904f2ee06546448fbe7cf7780f61bc110` | [MIT](https://github.com/mattn/go-sqlite3/blob/dbbe931904f2ee06546448fbe7cf7780f61bc110/LICENSE) |
| REF-08 | [ncruces/go-sqlite3](https://github.com/ncruces/go-sqlite3) | [2026-10-24](https://github.com/ncruces/go-sqlite3/commit/da0ceb8b723e44c2dfde7b287286a2be4ded0016) | `da0ceb8b723e44c2dfde7b287286a2be4ded0016` | [MIT](https://github.com/ncruces/go-sqlite3/blob/da0ceb8b723e44c2dfde7b287286a2be4ded0016/LICENSE) |
| REF-09 | [zalando/go-keyring](https://github.com/zalando/go-keyring) | [2026-07-24](https://github.com/zalando/go-keyring/commit/66b55cc0c51cd3d8dabc0ac70da30f058b2fe54a) | `66b55cc0c51cd3d8dabc0ac70da30f058b2fe54a` | [MIT](https://github.com/zalando/go-keyring/blob/66b55cc0c51cd3d8dabc0ac70da30f058b2fe54a/LICENSE) |

## REF-01 / REF-02：Eino 与 EinoExt

**来源事实：** Eino 是既定 Go 引擎候选；EinoExt 的 `openai` 对应 Chat Completions，`agenticopenai` 对应 Responses，`claude`/`agenticclaude` 提供 Messages 的两类模型接口。它们是独立 Go 子模块，不能用仓库的一个版本号替代所有 go.mod。[Eino 依赖](https://github.com/cloudwego/eino/blob/0a5ca53b9d3bf7b661dccc863465ec568a421eea/go.mod)；[Chat 依赖](https://github.com/cloudwego/eino-ext/blob/eee37f63ff9548c5eaec48fc157863339f8eda07/components/model/openai/go.mod)；[Responses 依赖](https://github.com/cloudwego/eino-ext/blob/eee37f63ff9548c5eaec48fc157863339f8eda07/components/model/agenticopenai/go.mod)；[Messages 依赖](https://github.com/cloudwego/eino-ext/blob/eee37f63ff9548c5eaec48fc157863339f8eda07/components/model/claude/go.mod)；[Agentic Messages 依赖](https://github.com/cloudwego/eino-ext/blob/eee37f63ff9548c5eaec48fc157863339f8eda07/components/model/agenticclaude/go.mod)。

在上述提交，Chat 子模块声明 Eino v0.7.13 与 go-openai fork；Responses 声明 Eino v0.9.22、openai-go/v3，Messages 声明 Eino v0.9.22、anthropic-sdk-go，后两者还含云服务认证依赖。Go 模块最小版本选择会合并依赖，不能宣称“各自能编译”就能共存。T-01/T-08 在最终 go.mod/go.sum 与 `go list -m all` 上验证，禁止自动启用未配置的云认证或 SDK 环境回退。

**已知问题：** 固定 Eino 的 AgenticMessage 路径有取消/重试覆盖限制；上游曾报告 TurnLoop 的 Message 工具中断恢复挂起，#1119 在本轮网页核验中为 Closed，不能称其仍未修复，也不能据关闭状态推断 HUHU 锁定组合已通过。将同类中断/恢复复现加入三协议合同。[固定代码限制](https://github.com/cloudwego/eino/blob/0a5ca53b9d3bf7b661dccc863465ec568a421eea/adk/chatmodel.go#L386-L392)；[Issue #1119](https://github.com/cloudwego/eino/issues/1119)。

**HUHU 采用：** 在 Engine adapter 内复用模型/流/工具抽象；Broker、授权、持久 Run/Effect/预算仍由 HUHU 应用层负责。Eino AgentTool 可以包装 Agent，但其转发事件不自动提供 HUHU 的持久任务日志、逐跳授权与删除传播。[AgentTool 边界](https://github.com/cloudwego/eino/blob/0a5ca53b9d3bf7b661dccc863465ec568a421eea/adk/agent_tool.go)。T-08/09/10 分别交三协议证据，T-06/16 拥有审批/恢复合同；缺口允许 adapter 内桥接，不能降级首版范围。置信度：源码/清单高；运行兼容未验证。

## REF-03：HanaAgent / OpenHanako

**来源事实与依赖：** TypeScript/Electron 产品，使用 pi agent 库、Hono、better-sqlite3、React；子代理可选择已有 Agent，新建独立线程，持久创建另有入口。通知与任务分开，自动记忆有自身来源。[依赖清单](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/package.json)；[目标发现/派遣](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/lib/tools/subagent-tool.ts)；[持久创建](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/core/agent-manager.ts)。

**采用与限制：** 借鉴身份/任务区分和各自记忆来源，供 T-11/14/21/22。其子代理权限模式禁止若干再派生行为，PathGuard 的文件读取策略也不证明强制记忆隔离；HUHU 必须实现受控再委派与 Memory API 边界。Apache-2.0 明确但不整套移植 Electron/TS 后端。[子执行限制](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/core/session-permission-mode.ts)；[文件读取边界](https://github.com/liliMozi/openhanako/blob/9a6cabf8c513db5edc6cf8179a538c9075885c6e/lib/sandbox/path-guard.ts)。置信度：源码高；未运行上游，不作安全保证。

## REF-04：OpenBot

**来源事实与依赖：** TypeScript 服务使用 Hono、Mastra、Drizzle/Postgres、CopilotKit 等；message_bot 结构化描述任务、限制与期望输出，以目标临时线程执行，群公共记录与各 Bot 工作线程分开。[服务依赖](https://github.com/CopilotKit/OpenBot/blob/46642d6c91daa663bccff673595f4e12a419a496/server/package.json)；[工具 schema](https://github.com/CopilotKit/OpenBot/blob/46642d6c91daa663bccff673595f4e12a419a496/server/src/agents/handoff-tool.ts)；[临时线程](https://github.com/CopilotKit/OpenBot/blob/46642d6c91daa663bccff673595f4e12a419a496/server/src/agents/handoff-delivery.ts)；[群队列](https://github.com/CopilotKit/OpenBot/blob/46642d6c91daa663bccff673595f4e12a419a496/server/src/channels/group.ts)。

**采用与限制：** T-11/12 借鉴逐跳授权与持久队列回执，T-14 借鉴记忆 owner/provenance，T-21 借鉴名册信息层级。它的 Postgres/外部 Agent 架构不是 HUHU 的 SQLite/单 Runner；不引入整套服务或把顺序群队列当成 Leader 并行团队。[逐跳检查](https://github.com/CopilotKit/OpenBot/blob/46642d6c91daa663bccff673595f4e12a419a496/server/src/agents/handoff.ts)；[队列事务](https://github.com/CopilotKit/OpenBot/blob/46642d6c91daa663bccff673595f4e12a419a496/server/src/work/queue.ts)；[记忆过滤](https://github.com/CopilotKit/OpenBot/blob/46642d6c91daa663bccff673595f4e12a419a496/server/src/memory/store.ts)；[名册](https://github.com/CopilotKit/OpenBot/blob/46642d6c91daa663bccff673595f4e12a419a496/app/src/components/bots/bot-roster.tsx)。置信度：源码高；故障恢复未在 HUHU 验证。

## REF-05：DeepSeek-Bot

**来源事实与依赖：** 非 DeepSeek 官方项目，是 DSH 插件与桌面产品；ds-bot 清单不列普通 dependencies，不代表没有 DSH 宿主运行依赖。默认 admin 回应，@ 指定成员，长工作回投 askedBy；own/group/team 记忆按不同 scope 载入。[定位与安装](https://github.com/Fei2411/DeepSeek-Bot/blob/1bebe826f74e9a72cabafd3b80602b05af867b38/README.zh.md)；[插件清单](https://github.com/Fei2411/DeepSeek-Bot/blob/1bebe826f74e9a72cabafd3b80602b05af867b38/ds-bot/package.json)；[群调度](https://github.com/Fei2411/DeepSeek-Bot/blob/1bebe826f74e9a72cabafd3b80602b05af867b38/ds-bot/src/host/groups.js)；[记忆 scope](https://github.com/Fei2411/DeepSeek-Bot/blob/1bebe826f74e9a72cabafd3b80602b05af867b38/ds-bot/src/host/memory.js)。

**采用与限制：** T-13/21 借鉴群入口，T-14/15 借鉴记忆来源和 review 机制；不复制 Main/admin 可直接写 team 或判断创建长期专家的授权。进程内 handoff Map 不能证明持久恢复。[持久创建权限](https://github.com/Fei2411/DeepSeek-Bot/blob/1bebe826f74e9a72cabafd3b80602b05af867b38/ds-bot/src/host/tools.js)；[结果生命周期](https://github.com/Fei2411/DeepSeek-Bot/blob/1bebe826f74e9a72cabafd3b80602b05af867b38/ds-bot/src/host/handoffs.js)。置信度：源码高；未安装 DSH 或复用代码。

## REF-06：OpenClaw

**来源事实与依赖：** 发现、向已有会话发送、新建子执行会话是不同工具；依赖含多 SDK、浏览器与渠道适配，远大于 HUHU 首版需要。[发现](https://github.com/openclaw/openclaw/blob/090e6213e25e6b09f03590a41da2fddeaf9f611e/src/agents/tools/agents-list-tool.ts)；[消息](https://github.com/openclaw/openclaw/blob/090e6213e25e6b09f03590a41da2fddeaf9f611e/src/agents/tools/sessions-send-tool.ts)；[spawn 身份](https://github.com/openclaw/openclaw/blob/090e6213e25e6b09f03590a41da2fddeaf9f611e/src/agents/spawn-plan.ts)；[依赖](https://github.com/openclaw/openclaw/blob/090e6213e25e6b09f03590a41da2fddeaf9f611e/package.json)。

**采用与限制：** T-11/12/16 参考受权目录、工具选择及子会话身份，不把 spawn 当永久创建，不接入其网关、shell、浏览器或所有渠道。该引用是机制阅读，不代表已完成全仓漏洞审计；相关变更需实施时重查 issue/安全公告。置信度：固定文件高；不推定当前 HEAD 与引用提交完全一致。

## REF-07 / REF-08：SQLite 驱动对比

| 候选 | 实现与依赖 | 上游明确限制 | HUHU 探针与取舍 |
| --- | --- | --- | --- |
| mattn/go-sqlite3 | database/sql、CGO、SQLite C 代码；清单 Go 1.21 | 构建需要 CGO/gcc，交叉编译需匹配 C 工具链；FAQ 有内存连接/锁竞争说明 | T-01 测真实文件库、WAL、事务、busy/cancel、别名锁；T-19 测备份/迁移；T-27 测发行平台 |
| ncruces/go-sqlite3 | 当前固定版使用 wasm2go/Go VFS，清单 Go 1.26.0，含 go-sqlite3-wasm/v6 | README 提醒每连接内存成本与平台限制；单连接/派生对象不能并发使用 | 同一套夹具测备份、锁、内存和目标平台；不能按旧 Wazero 介绍选当前版 |

[mattn 构建与 FAQ](https://github.com/mattn/go-sqlite3/blob/dbbe931904f2ee06546448fbe7cf7780f61bc110/README.md)；[mattn 清单](https://github.com/mattn/go-sqlite3/blob/dbbe931904f2ee06546448fbe7cf7780f61bc110/go.mod)；[ncruces 机制/限制](https://github.com/ncruces/go-sqlite3/blob/da0ceb8b723e44c2dfde7b287286a2be4ded0016/README.md)；[ncruces 清单](https://github.com/ncruces/go-sqlite3/blob/da0ceb8b723e44c2dfde7b287286a2be4ded0016/go.mod)。

**建议：** 优先复用成熟驱动；T-01 在相同契约上比较后只保留一个生产 driver，通过 Store Port 隔离。此处没有凭阅读擅定支持平台或新 Go 版本；探针选型是既定 P0 内部实现决定，改变事务/备份/平台承诺时回报。置信度：依赖/文档高；本机性能未知。

## REF-09：系统凭证

**来源事实：** go-keyring 提供跨 OS Get/Set/Delete；依赖 wincred 和 D-Bus，macOS 用系统 security 工具，Linux 依赖 Secret Service 与可用 collection。[依赖](https://github.com/zalando/go-keyring/blob/66b55cc0c51cd3d8dabc0ac70da30f058b2fe54a/go.mod)；[平台前提](https://github.com/zalando/go-keyring/blob/66b55cc0c51cd3d8dabc0ac70da30f058b2fe54a/README.md)。

**采用与限制：** T-02/T-20/T-27 优先在 CredentialProvider 后评估它；测试无服务、拒绝、锁定、退出和清除。任何 keyring mock 不能证明实际 OS 保护。凭证只走受管登记路径，业务 HAP/CP/日志只含 ref；保护不可用回退明确会话内存。不给参数命令行、环境或诊断写入秘密。固定 macOS Set 实现使用 `security -i` 的 stdin，与 README 的手工 CLI 示例不同；不能据示例误报库把密码放入 argv。仍须逐平台验证错误/大输入/退出路径并用独立 adapter 替代不合格路径。[固定 macOS 实现](https://github.com/zalando/go-keyring/blob/66b55cc0c51cd3d8dabc0ac70da30f058b2fe54a/keyring_darwin.go#L69-L100)。置信度：文档高；跨 OS 行为待测。

## 实施时继续检索与采用记录

1. 先回读本文件相关 REF、固定文件和项目已有实现。陌生点未覆盖时，以“功能＋语言/宿主＋failure/recovery/issue”检索 GitHub；比较至少两个相关方案，若只有一个真实相关结果，记录检索与限制，不凑项目名。
2. 按执行日滚动两年核验提交/发布、维护状态、固定 LICENSE、文件头和传递依赖；阅读相关未解决 issue 与已修复版本。没有发现 issue 不写成“没有问题”。本轮未做九仓全量 issue 分页审计。
3. 在负责票的 Evidence 记录：问题、查询、仓库/固定 SHA、活动/许可、依赖、限制、采用/不采用理由、我方路径、验证结果。只借鉴机制也记录；直接采用依赖须锁版本。不能以同名或 stars 代替核验。
4. 直接改编代码必须遵守 <Path>.agents/skills/dev/references/licensing.md</Path>，保留署名/原路径/固定版本、许可全文，更新 NOTICE、第三方说明与 notices 生成链。来源不明或不兼容许可不得复制；纯参考不向 NOTICE 冒加“已包含代码”。
5. 若参考要求更大权限、不同记忆/群聊语义或降低三协议能力，以 Spec 为准；需要改变合同才向用户提出明确取舍。Grokbot、MERS 等未唯一定位的名称继续标未核实，不编造映射。

当前选型证据是源码/官方清单/文档级。不得把本文件当成真实模型调用、上游测试、许可法律审查或 HUHU 实现通过报告。
