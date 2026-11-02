---
schema_version: 2
session: "20261025T043239Z"
task: "036-note-effect-preflight"
kind: research
change: 2026-10-25-huhu-bot-architecture
ticket: T-07
---

# T07 单笔记宿主效果与回执核查只读预检

## Goal
为完整28票后续单笔记写入实现提前核对现有Obsidian API、目标定位、未保存编辑器和本机回执接缝。仅在Root实际followup_task后开展；不启动T07生产实现，不把未通过的T05/T06当已接纳依赖。

## Inputs
工作区/home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，base33c21e098ef3188cbab5a09f3e0a01fadb787715，Map10/Goal9。复用已读AGENTS能力发现和dev架构/测试/许可，补dev/references/obsidian-api.md、T07、Spec§6–8、ADR008/009/016、ARCH宿主/效果/数据边界和IMPLEMENTATION-REFERENCES固定REF04；034完整REPORT可复用，不重复Eino或事件研究。用户LOG051授权全代码，真实Obsidian/Vault/Provider/目标OS现场由用户后验。

已存在生产源：src/modules/huhubot/platform/obsidian/sources/、services/host-read/、core/protocol/connection.ts和api.ts；native/huhubot中的Host capability/lease/stdio装配。复用项目实际src/host/obsidian/storage/content-files.ts、content-moves.ts的Vault.process用法只作机制对照，不跨模块复制或挪动。Obsidian声明/官方文档优先，任何当前不确定的API语义用官方源核实；外部同类实现沿REF04固定许可/活动证据，必要新增研究按AGENTS近两年/明确许可要求。

## Workspace and Scope
产品/永久测试/API/schema/锁/工程文件、正式Ticket/Map/Goal/Evidence和他人文件全只读；只能写本TASK REPORT及原始观察日志，必要离线探针放隔离临时目录。不访问真实Vault/keyring/模型，不启动Obsidian、不安装依赖、不运行旧默认D-Bus、不提交/发布/归档或再委派。不要编写拟并入产品的实现；研究完成交Root后再等合法派遣。当前035正在审固定131文件，发现来源替换/长选区/Grant摘要问题由原作者另修，本任务不能修复。

核对并给精确最小原owner请求：
- 受信opaque目标如何从当前workspace/leaf/来源registry解析；create目标如何在明确用户批准的单笔记范围内表示，不把任意absolute path变成权限。路径校验、private目录和身份替换竞态。
- 全部相关MarkdownView（包括另一个leaf）的未保存正文判断；Vault.process同步变换回调的CAS能力与边界，禁止把外部等待塞回调或拿旧文件stat当内容hash；create冲突须确实无覆盖。
- Host从确切Approval/Effect/参数摘要/目标基线/能力版本/当前lease取得调用，T06的用户批准与资料read/send分开；Go dispatch校验与Host临写复核的最小协议形状。
- 在库内隐藏运行数据或现有明确Profile接缝保存受管Host回执时的数据归属，不能擅自改成Go直接读Vault/真实用户文件。先核对ADR/项目规则，提出最小路径而非新平行账本。写入与回执持久化非原子时，哪些证据可称committed、哪些仅reconciled、哪些unknown；相同effectId重试只查询不得盲重写。
- 有界队列/lease变化/断连/取消/late receipt/重启、同路径替换、另窗口编辑、写后回执丢失的代码级反例矩阵，以及供用户后验的probe最小入口。终态Run可追加核查事件，正文删除不得改已交付笔记。

## Acceptance
给源码/官方固定来源、精确接口与文件请求、可复用设计及差异、未解技术问题和最小自动化故障矩阵。仅事实核查，不宣称代码或真实宿主已通过。保持聚焦T07接缝，不扩大到全产品数据/删除/安装/UI。若未跑探针明确说明；若有进程全部Wait退出并清理临时资源。

## Return
REPORT首个h2前Session: 20261025T043239Z、Task: 036-note-effect-preflight、Status: completed；h2聚焦交接、产物与验证、问题与下一步。记录实际来源摘要与命令退出。validate-dispatch return0，所有自有writer/probe停写后真实消息及FINAL交Root；不修改任何正式票状态。
