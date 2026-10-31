# 研究与复用台账

## Research 合同

Caller：`specdev/grill-with-docs`（方案取舍）、`specdev/spec`（行为约束）、`specdev/goal-plan`（Gate 依赖）。唯一接收工件：本文件。研究问题：如何直接复用 Pi；如何复用个人 Agent 分层/记忆/协作；如何复刻既有 UI；哪些默认能力/依赖会穿透安全与发行边界。停止条件：每个决定有固定一手来源、采用/拒绝范围、许可和未验证项；不以“搜索到项目”作为运行成熟证明。

先读 Issue 自带的固定 GitHub 参考，再读真实代码。联网检索中误命中的同名 OpenBoardView/其他项目已排除，没有列作候选。没有新增 `research/` 状态根。

| ID | 源码与检查深度（2026-10-31） | 类型 / 采用 | 目标 / 代价 / 验证 |
|---|---|---|---|
| R-001 | Pi v1.4.0 package 全文；sdk.ts 1–240；agent-session-runtime.ts 1–210 | code fact：ESM、Node ≥22.19.0、默认资源/工具与 runtime factory；直接依赖 SDK | pi-session/resources/events adapter；P0 实包和 ABI；不复制 loop |
| R-002 | Hana engine.ts 1–160，固定 9a6cabf… | code fact：薄门面、职责分离；inference：适合 HUHU 小型应用服务 | BotApplication + SessionService；不照搬几十个 managers/HOME 扫描 |
| R-003 | Hana fact-store.ts 1–165；LICENSE 开头 | code fact：事实+标签+FTS5、CJK n-grams、synchronous=NORMAL；adaptation | MemoryBackend；来源/确认/tombstone/scope 加 HUHU 合同；不照搬控制库耐久参数 |
| R-004 | Hana session-coordinator.ts/core/agent.ts | Issue 引用已阅读；本轮未独立逐行审完整文件 | 作为待精读定位，不伪称已验证其 lock 全路径；T-02 补充后再复制相关实现 |
| R-005 | OpenClaw 固定 ec26807… agent-loop.md 的串行、writer claim、事件、wait 章节 | primary documentation fact + adaptation | accepted/terminal、session serial、fencing、背压；不搬 provider/recovery loop/transcript owner |
| R-006 | OpenBoard BoardView.tsx 1–130，固定 85303dc… | code fact：React+dnd-kit；交接/计划 UI 从 Issue 继承为设计参考 | RunPlan/任务详情交互，不复制业务 store、Express/sql.js/opencode；成熟性未知 |
| R-007 | 本仓库 DESIGN-0002、change DESIGN、UI-001 design-system 前180行及 final/styles.css 前210行 | same-project source fact；直接改编预览 token/密度规则 | 本原型 styles.css；保留源路径/commit；不引入外部 UI 框架/字体文件 |
| R-008 | MCP 官方 TS SDK v1 server 文档、v2 upgrade 指南、2025-11-25 transports | official fact：存在不同 SDK/协议代际；选型仍 conditional | 唯一 MCP client owner；server 首选候选 loopback Streamable HTTP，实际组合由 T-20 冻结 |
| R-009 | Electron utilityProcess 官方主进程/app-ready 条件 | official fact；条件采用 | 复用本仓库窄 host bridge，不把 Obsidian 支持当已证实；T-01 |
| R-010 | SQLite WAL / synchronous 官方文档 | official fact + HUHU 耐久性建议 | 本地 FS、一致性备份、control/index 分离；T-14 故障注入 |
| R-011 | React Flow 官方 layouting / Issue 既有 Dagre 方案 | official documentation + proposal | @xyflow/react + Dagre 按需加载；尺寸/折叠/通信叠加与体积需 T-17/T-22 验证 |

## 原始链接、版本与许可

- Pi：<https://github.com/earendil-works/pi/tree/v1.4.0>；package 声明 MIT。源码入口为 `packages/coding-agent/src/core/sdk.ts`、`agent-session-runtime.ts`；实际 npm tarball、传递 native/WASM 许可尚未下载验证。
- Hana：<https://github.com/liliMozi/openhanako/tree/9a6cabf8c513db5edc6cf8179a538c9075885c6e>；已读取 Apache-2.0 LICENSE 开头；本 PR 不复制其执行代码。未来改编需保留适用版权、LICENSE/NOTICE 和改动标识。
- OpenClaw：<https://github.com/openclaw/openclaw/blob/ec26807c6c615db12011e83174924074e1f9ca8f/docs/concepts/agent-loop.md>；本轮仅借鉴机制，不复制代码；如要复制，T-02 核对该固定版本许可。
- OpenBoard：<https://github.com/OpenBoardLabs/openboard/blob/85303dc2a0f09d619e3d0ffc801886549885e51e/packages/client/src/components/BoardView.tsx>；Issue 声明 MIT，完整 LICENSE/传递资产未独立审完；本 PR 不复制代码。
- UI 原型来源：<https://github.com/NAMEWTA/obsidian-huhu/tree/974105b47e03c108df0f5e0c3fc9606fe4b79aee/.agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/prototypes/UI-001>。项目自身许可由仓库 LICENSE 决定，不把 UI Universe 或某依赖的 MIT 当作整个 HUHU 许可。
- MCP：<https://ts.sdk.modelcontextprotocol.io/server>、<https://ts.sdk.modelcontextprotocol.io/v2/migration/upgrade-to-v2>、<https://modelcontextprotocol.io/specification/2025-11-25/basic/transports>。
- 平台/存储：<https://www.electronjs.org/docs/latest/api/utility-process>、<https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules>、<https://www.sqlite.org/wal.html>、<https://www.sqlite.org/pragma.html#pragma_synchronous>。
- 图形：<https://reactflow.dev/learn/layouting/layouting>。不使用未核验授权的付费示例或外部图片素材。

## 版本冲突与不确定性

2026-10-31 查阅官方 MCP v2 指南可见 2026-07-28 protocol 的说明。Issue 指定的 2025-11-25 是可定位的稳定参考，不应写成“最新规范”。本次不擅自升级、不混用 v1/v2 API；P0/T-20 比较 Pi 内带 MCP 与官方 SDK 兼容性，固定 package version+protocolVersion+transport+客户端清单后写 ADR-009 的结论。

Pi 1.4.0 是 Issue 候选基线，不宣称它是 npm 最新版。Hana FactStore 的本地全文检索不能证明我们的中文召回、source scope 或耐久性已经通过。OpenBoard 的 UI 部分不能证明它的整套 agent runtime 成熟可用。

## 复制清单与最小适配

本 PR 只改编同仓库 UI-001 的预览 token 值、字体回退、4px spacing、圆角层级与壳布局意图；原型页面/事件使用本次虚构数据。外部项目没有生产源码拷贝，未新增 package 依赖，未携带字体文件。未来复制每段代码必须登记：source commit/path+目标 path+license/NOTICE+改动+测试+传递依赖；不得用此设计台账代替实际许可证审计。
