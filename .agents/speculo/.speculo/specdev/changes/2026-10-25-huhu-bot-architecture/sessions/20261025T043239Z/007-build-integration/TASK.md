---
schema_version: 2
session: "20261025T043239Z"
task: "007-build-integration"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-27
---

# 任务简报

## Goal
实现 T-27 的 Go 构建/校验/依赖许可/CI与工程规则接入，承担共享构建工具生产代码。用户授权全面实现并明确最终只需代码层总验收，真实操作用户自验（LOG-051）；不要等待真实模型/Obsidian/目标OS环境，不削减功能。Lead /root 编排，实施者 build_integration；不再派遣，不提交/发布/触发远程CI。

## Inputs
完整 tickets-map.md → dev/UI 与适用 architecture/testing/licensing/build-and-release/module-authoring/skill-maintenance → ticket/27-build-platform-notices.md。读 Spec/ARCHITECTURE 的发行/运行边界，sessions/20261025T043239Z/002-foundation-research/REPORT.md 与实际许可清单。当前 Go由 /root/foundation_go 实现，CLI --stdio --profile absolute-dir [--managed]，JSON framed 1MiB/batch8、c:/s:IDs、Go1.26.10、ncruces v0.35.6；与其确认早期契约而非自造。保持已有 Rust PTY 资产及 pnpm check:native 含义。

## Workspace and Scope
同一 /home/wta/orca/workspaces/obsidian-huhu/bot，base33c21e098ef3188cbab5a09f3e0a01fadb787715，branch NAMEWTA/bot。只写本票声明的生产路径及本TASK REPORT；特别允许补入的 scripts/huhu-bot-notices.mjs 与 .test.mjs、huhu-bot-build.test.mjs、docs/third-party/licenses/go/**、.github/workflows/lint.yml、scripts/bundle-budget.json、docs/development.md、dev build-and-release/testing refs。Go源码/api/schema/TS模块均只读，写集冲突先联系Lead；不要更改其他Task/状态/Evidence。shared package/lock/notices/技能由你唯一写，main.js/styles.css 构建窗口需先告诉Lead暂停相关writer，未经窗口不要全局build或生成npm notices。独立Go许可扫描可先做，最终notices后续回读实际依赖生成，不能现在宣称T-27done。

## Acceptance
构建脚本精确 GOTOOLCHAIN=go1.26.10、CGO_ENABLED=0、-mod=readonly/-trimpath，显式支持目标/架构、版本/hash/协议schema清单；输出ignored dist，不能提交二进制。fixture证明错误目标/checksum/schema被拒绝、现有PTY不回归。architecture脚本检查Domain/Application禁导SQL/SDK/HAP/Obsidian及入站不直写库，测试真实禁止输入，不只正向空目录。verify-huhu-bot.mjs运行本地构建binary与真实stdio持久重开/EOFshutdown自动smoke，超时/资源清理可靠，受管profile根由隔离HOME/XDG/平台变量注入。Go基础实际出现后才验证，不空壳绿灯。

扩展notices使用真实 `go list -deps -json` 非test编译闭包和各拟发行target union，锁文件/版本校验，保留完整LICENSE/COPYING/NOTICE，不将未采用研究依赖列为分发；无许可/未知/限制性失败。必要缺全文用固定commit+sha本地副本；不要build时网络fetch全文，不扫描未消费模块冒充runtime。研究清单包含候选SDK，生产当前只有SQLite，后续Eino依赖继续接纳重算。可测的解析/坏许可/差错路径写必要tests。

CI增加Go准备/测试/编译/自动smoke（仅workflow配置，别启动远程）；release收集严格目标清单+checksums，现有资产合同不改坏，旧helper检查保持。文档/规则仅同步当前已落地事实，后续模块完成再补，不提前宣称功能存在。规则内容变更时给Lead精确路径/新sha，Lead负责重绑Ticket，别改票据。所有维护文档中文，原始许可证英文保留。

实现者负责定向node/vitest脚本tests与静态/Go构建测试；全局构建/最终证据由Lead核对。实际未运行OS/user操作明确not-run，不伪支持。本票长生命周期，可交付本轮工程切片后停止writer，后续继续集成而不是把未完成T-27标done。

## Return
本目录REPORT.md记录实现路径、真实命令/退出/源码依赖输入、未完成后续集成、未运行项目；collaboration定期通知Lead。结束停止所有writer/子进程，不写TASK与正式Evidence/状态。
