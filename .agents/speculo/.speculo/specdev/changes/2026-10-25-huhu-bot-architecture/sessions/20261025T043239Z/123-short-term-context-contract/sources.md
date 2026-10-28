# 123实际来源索引

完整SHA、读取范围和角色见[sources.json](sources.json)。这里只读文本源码/权威及其指纹，不读取数据库或执行产品。表内range/search只表示按需读取，不声称全文件审查。所有新增合同与C1–C7消费者均not-run。

| ID | 真实路径 | 读取/用途 | SHA前12位 |
|---|---|---|---|
| S01 | `.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/spec.md` | 99-136,238-242；产品短期/授权/AC-018权威 | `3c1414c294ca` |
| S02 | `.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/ADR.md` | 429-449；ADR-024隔离/摘要不等于事实 | `d05a6885c3e8` |
| S03 | `.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/DESIGN.md` | 32-40,130-134；BOT-MEMORY实际本轮读取消费者 | `22a20917efc7` |
| S04 | `.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/ticket/14-private-memory.md` | 行为/有序步骤/验收/验证/ownership；上下文构建压缩正式义务 | `02714047454c` |
| S05 | `.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/sessions/20261025T043239Z/115-memory-interface-contract/interface-contract.md` | 1-420；已接纳长期路线；只补Prepare和context只读增量 | `406bdd596fd3` |
| S06 | `.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/sessions/20261025T043239Z/099-memory-preparation/interfaces-and-owners.md` | 1-36,39-69；短期优先选择/工作摘要，旧建议以115为准 | `b25967d83494` |
| S07 | `native/huhubot/internal/application/api/conversation.go` | full；EngineInput/History/Run/UI纯类型边界 | `e66c6fb6fa5f` |
| S08 | `native/huhubot/internal/application/api/collaboration.go` | 18-45,129-158；稳定Derived/namespace/AgentMessage | `9db6035349d9` |
| S09 | `native/huhubot/internal/application/api/delegation_input.go` | full；材料化Task和要求独立旧预算 | `c8ea8100fd3f` |
| S10 | `native/huhubot/internal/application/api/recovery.go` | full；pure Inspector/ExecutionPosition | `a20bc1d0eb92` |
| S11 | `native/huhubot/internal/application/api/access.go` | 153-167；ContextAccess接口 | `5ab3b6e75366` |
| S12 | `native/huhubot/internal/application/execution/executor/ports.go` | full；唯一Work/Repository | `8cf2e56c9269` |
| S13 | `native/huhubot/internal/application/execution/executor/executor.go` | 105-285；Prepare/ModelHistory/去重/同MarkRunning/Resume实际消费 | `e789ce1614ac` |
| S14 | `native/huhubot/internal/application/conversation/direct/service.go` | 178-282；当前整消息选择/目标read-send/Derived | `521c962a8970` |
| S15 | `native/huhubot/internal/adapters/outbound/sqlite/conversation/store.go` | 304-410；真实history keyset/page/DB来源 | `d49e8e245dcf` |
| S16 | `native/huhubot/internal/adapters/outbound/sqlite/groups/history.go` | full；群none/range/current audience/attachments | `482286dd7911` |
| S17 | `native/huhubot/internal/adapters/outbound/sqlite/groups/context.go` | 55-78 search；成员实际scope定位 | `5ed7630119f4` |
| S18 | `native/huhubot/internal/adapters/outbound/sqlite/usage/delegation.go` | full；真实Run→accepted要求reader | `d740d8d29a8e` |
| S19 | `native/huhubot/internal/adapters/outbound/sqlite/usage/messages.go` | full；to_run_id inbox/实际来源consume/旧界限 | `871ebacadfbc` |
| S20 | `native/huhubot/internal/adapters/outbound/sqlite/execution/store.go` | 135,186 search；真实accepted intent/原用户ID/core scanner | `4ecbc1dc8f83` |
| S21 | `native/huhubot/internal/adapters/outbound/sqlite/execution/executor.go` | 279-405；Claim actual Messages/Derived/MarkRunning UoW | `93bfe1b9715e` |
| S22 | `native/huhubot/internal/adapters/outbound/sqlite/execution/recovery.go` | 24-88,120-140；同Tx accepted Intent/config/position | `1e0bf54b3b2e` |
| S23 | `native/huhubot/internal/adapters/outbound/sqlite/collaboration/store.go` | 431,520 search；实际context_json/结果关系定位 | `99ec6d1c48d2` |
| S24 | `native/huhubot/internal/application/access/context/service.go` | 1-201,215-295；Source固定身份/lease/Prep/FilterModelHistory | `49854b78cfed` |
| S25 | `native/huhubot/internal/application/tooling/broker/recovery.go` | 1-90；Broker metadata和pure Inspector透传 | `e91e94e47fdd` |
| S26 | `native/huhubot/internal/adapters/outbound/sqlite/recovery/snapshot.go` | 160-200；原检查/两阶段资格边界 | `4343bf672ddf` |
| S27 | `native/huhubot/internal/adapters/outbound/eino/common/engine.go` | 17-30,75-190；当前模型排序/请求上界/legacy Run-Resume | `b906da361ba1` |
| S28 | `native/huhubot/internal/adapters/outbound/eino/common/checkpoint.go` | 1-120,210-308,404 search；exact Chat v1/v2/Intent绑定/Inspector | `291168afac79` |
| S29 | `native/huhubot/internal/adapters/outbound/sqlite/migrations/embed.go` | full；当前schema9/连续版本规则 | `3897535ff94f` |
| S30 | `native/huhubot/internal/adapters/outbound/sqlite/migrations/011-delegation.sql` | 44-61 search；现delegation context引用列 | `2f06a87748f7` |
| S31 | `native/huhubot/internal/adapters/outbound/sqlite/migrations/012-budget-message.sql` | 1-85；消息身份/预算/旧回填 | `aa01b6320819` |
| S32 | `.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/sessions/20261025T043239Z/123-short-term-context-contract/TASK.md` | full；本次只读授权 | `0d5a31b887be` |
| S33 | `AGENTS.md` | user supplied current/full；项目权限与完成边界 | `50db128fbe7d` |
| S34 | `.agents/speculo/.speculo/workspace.json` | full；能力根 | `331c75683416` |
| S35 | `.agents/speculo/catalog.json` | full；选择已授权I准备能力 | `1e7d53e94d68` |
| S36 | `.agents/speculo/.speculo/AGENTS.md` | full；runtime/只读不授权 | `42a419fb27b0` |
| S37 | `.agents/skills/dev/SKILL.md` | full/reused；开发边界 | `5df9ccddd677` |
| S38 | `.agents/speculo/workflows/specdev/specdev-i-implement/SKILL.md` | full/reused；只读准备/原owner/证据 | `2984173f37c2` |
| S39 | `.agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/sessions/20261025T043239Z/115-memory-interface-contract/sources.json` | fingerprint/55 source byte comparison only；115既有来源身份复用边界 | `0944bcb0d950` |
| S40 | `native/huhubot/internal/bootstrap/core.go` | fingerprint only, not new implementation review；115唯一已知119第三driver差量 | `cfcf4316660a` |

115长期合同SHA严格匹配Root已接纳406bdd…acdfc4；本次不回写115。55源只读字节复核见00（历史日志已清理：`logs/00-115-source-recheck.json`），仅Core119第三driver有差量，123不重做长期研究。当前迁移注册schema9；T10三协议代码门由Root在123期间接纳，新产品没有因此由本作者改写。
