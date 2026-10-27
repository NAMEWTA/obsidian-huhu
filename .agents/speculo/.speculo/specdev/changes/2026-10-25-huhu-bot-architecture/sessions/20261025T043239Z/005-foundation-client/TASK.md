---
schema_version: 2
session: "20261025T043239Z"
task: "005-foundation-client"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-01
---

# 任务简报

## Goal
完整实现 T-01 的 TS 公共 BotClient/API、host-free HAP codec 与桌面受管 stdio transport，真实可启动/重连 Go Runner。Lead /root；与 foundation_go 同票分写集，不重复其 schema/API 定义。用户授权全面开发与 Agent Team，LOG-050 真实模型验收由用户后续执行，代码和本地故障测试必须完成。无提交/发布。

## Inputs
完整读 tickets-map.md → .agents/skills/dev/SKILL.md 与 architecture/testing/licensing/build-and-release/module-authoring → ticket/01-runner-profile-contract.md → spec.md §9–11、ARCHITECTURE。读 sessions/20261025T043239Z/002-foundation-research/REPORT.md。先查看现有模块 api.ts/desktop transports 与测试风格。LOG-049 已分离独立后端开工条件；全局 UI draft 不阻止本票，LOG-050 用户明确先完成代码。

## Workspace and Scope
唯一 workspace /home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，base 33c21e098ef3188cbab5a09f3e0a01fadb787715。可写 src/modules/huhubot/api.ts、core/protocol/**、platform/desktop/transport/**、src/app/contracts/module.ts 与本任务报告/测试日志。ModuleId 只增加 huhubot 类型，本次不要在 MODULE_IDS runtime 列表注册。Go/contracts归 /root/foundation_go，根 package/build产物/文档与正式状态归 Lead；不要修改其他路径。需要额外写集消息 Lead，不绕开owner。不要再次派遣。

先与 /root/foundation_go 协调确定协议字段/CLI；schema 冻结前可研究、准备codec测试，避免造第二协议。需要sharedtypes时由T-01这两个写集拥有者协同，不从api.ts静态引入core/platform；公共api需只数据/ServiceKey。core无Node/Electron/Obsidian，Uint8Array/TextEncoder/Decoder；Node只desktop。所有实时pending/frame/queue有界；异常/EOF所有pending明确失败；不换idempotency key自动重放。managed launch仅绝对binary、受控cwd和envallowlist（不继承CLI/SDK secret）；stdio stdout协议stderr有界脱敏。不要新增依赖。

## Acceptance
实际TS codec与Go共享schema/fixtures，UTF8/fragment/multiframe/oversize/invalidjson/kind/ID/batch严格。hello gate、连接生命周期、owner-onlyshutdown、reverseHost同IDresponse、超时/abort/慢消费者/EOF清理。真实runner缺少前先跑纯fixture/transport tests；Go产物就绪后共同真实启动/持久重开/故障集成，由Lead独立复核。无UI、不要求模型凭证。运行定向vitest、tsc检查、lint相关路径；不自行pnpm build覆盖共享产物，向Lead请求窗口。productionAPI具体类型，不用任意泛型Call掩盖缺失合同。未实施业务方法能清楚拒绝，不假成功。

## Return
本目录REPORT.md，记录Session/Task/Status、实际作者、修改文件、命令/退出、冻结接缝/缺口；提交报告前停止writer，正式Ticket/Evidence由Lead回读后维护。使用collaboration通知Lead与Go伙伴，不更改TASK。
