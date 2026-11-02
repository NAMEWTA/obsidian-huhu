---
schema_version: 2
session: "20261025T043239Z"
task: "004-foundation-go"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-01
---

# 任务简报

## Goal
实现 T-01 的完整 Go Runner/SQLite/Profile/HAP/应用 API 基础，以及版本化 schema/夹具。Lead /root，执行者 foundation_go；用户明确授权完整开发和 Agent Team，最新 LOG-050 将三协议真实模型验收留给用户，本轮完成代码与代码层检查。不要只写空壳、伪通过 handler 或局部探针。无 Git 提交/推送/发布。

## Inputs
先完整读 change/tickets-map.md，再 .agents/skills/dev/SKILL.md 及适用 architecture/testing/licensing/build-and-release，再 ticket/01-runner-profile-contract.md、spec.md、ARCHITECTURE.md、IMPLEMENTATION-REFERENCES.md。研究报告 sessions/20261025T043239Z/002-foundation-research/REPORT.md 与 artifacts 已有真实依赖探针，复用。LOG-049 已把不依赖 UI 的后端分支从全局 UI 技术门拆开，LOG-050 用户进一步要求先完成代码，全球 draft 不代表禁止本分支。Spec 行为/AC 不减少。

## Workspace and Scope
唯一工作区 /home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，base 33c21e098ef3188cbab5a09f3e0a01fadb787715。可写 T-01 所列 native/huhubot 路径与 contracts/hap/v0.1/**，以及本任务 REPORT/原始测试日志；TS/api/ModuleId 由 foundation_client 写，根构建/包/文档/正式状态/所有 Evidence 由 Lead 写，均只读。不要增加未声明 application/domain 目录；需要扩展写集先消息 Lead。禁止再次派遣。SQLite migrations/*.go 唯一 owner 归本票，其他票未来请求接纳；当前只实现 001-core.sql。Go module 建议 github.com/NAMEWTA/obsidian-huhu/native/huhubot，Go1.26.10，ncruces v0.35.6，无 CGO。不现在引入未消费的 Eino adapters，版本留研究记录供后续依赖 owner 接纳。

先尽快发消息给 Lead 和 /root/foundation_client，冻结 HAP frame kind/ID 前缀、hello 入参/响应、元数据命名与 --stdio/--profile 等 CLI 契约；字段用显式 DTO/schema，非 map 任意透传。全 Spec 方法目录应明确定义版本合同，可未装配但 hello 仅宣告实际实现，不能假成功。Application 不 import SQL/SDK/HAP；可信 RequestIdentity 来自构造的连接，payload 不能自报 owner/Host。Facade 组合窄服务，真实 stdio 与 fake 第二客户端消费同一应用用例。foundation_client 按冻结协议实现，不要改其文件。

## Acceptance
T-01 全部所列故障/主路径：持久 Profile 真实重开；OS 非同步根+私有权限；真实 DB 身份单 writer 含 symlink/hardlink；坏库/新库区分、不兼容拒绝；u32 BE length 含 kind，JSON only，max1MiB/batch8 经夹具/测量冻结；方向 request ID；hello gate；反向请求关联不死锁；半帧、UTF8、JSON、kind/size/batch/无ID写通知均确定行为；仅 managed owner shutdown/Host；管道EOF有界关闭；stdout仅协议，stderr脱敏。Go schema与TS可共享fixtures。不要打开HTTP listener或执行模型。

先编写有风险价值的 red tests，再实现，真实 SQLite/进程竞争不能全部 mock。运行 GOTOOLCHAIN=go1.26.10 go test ./tests/contract/foundation/... -count=1，适用 race 与全模块 go test，输出源码/依赖快照、命令/退出、未验证 OS。Lead 最终运行 TS→Go/SQLite E2E 与独立review；你的自报不标票done。

## Return
保存本目录 REPORT.md（Session/Task/Status、实现文件、真实命令/退出、已知缺口、建议）。通过 collaboration 定期报告接缝和阻塞，返回前所有 writer/子进程退出。不得写 TASK、正式状态或 Evidence。
