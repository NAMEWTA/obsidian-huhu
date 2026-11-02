---
schema_version: 2
session: "20261025T043239Z"
task: "058-host-receipt-docs-cleanup"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-27
---

# T27 本机回执数据说明与后验脚本退出收尾

## Goal
原 /root/build_integration 在 T07 客户端真实交回后完成准确数据说明和共享宿主探针最小退出修复。只有 Root 实际 followup_task 才启动；准备 TASK 不是派遣。沿既有实现模型偏好，不另派 Agent，不扩大最终发行窗口。

## Inputs
repo /home/wta/orca/workspaces/obsidian-huhu/bot；branch NAMEWTA/bot，HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715。当前 Map15/Goal14/LOG077，28票/55AC与DAG不变，LOG051代码交付、真实模型/Obsidian/目标OS用户后验。按AGENTS→Map→dev适用architecture/testing/skill-maintenance→T27/I读取，文档部分沿documentation-procedure/current-facts-docs。没有UI设计/页面改动，不启动UI验收。

完整回读自己已接纳051 REPORT和evidence/host-receipt-root.md；Root实际派遣消息将确认054最终REPORT与摘要，读该报告并核对真实receipt-authority.ts、receipt-store.ts、obsidian-host.ts，不能把准备稿当最终实现。LOG074已接受App本机HMAC key边界。036-note-effect-preflight已识别fresh-vault stop缺Wait，054本次实际重查，Root亦读回80–90行，crashRestart已有Wait。

## Workspace and Scope
唯一可写产品路径：docs/data.md、.agents/skills/dev/references/architecture.md、scripts/obsidian-acceptance/fresh-vault.mjs；以及自己的REPORT/log。其余源码、测试、锁、构建输出、规范、其它报告与正式Evidence/Map只读。三路径目前没有其他writer；Root仅持有正式状态，不与你并写产品。

只在fresh-vault stop的强杀分支补await exited，维持原正常退出/20秒宽限/自有子进程身份/返回接口，不扩大为通用进程框架，不运行真实Obsidian，不杀未知进程。一次性后验脚本必须最终等到其自有child结束；不能把kill调用当成已经退出。

docs/data.md保存本机回执的准确路径、内容边界和HMAC键归属；architecture.md只保持owner/持久化例外入口并链接权威正文，避免重复长规则。当前已实现的键形状为huhu.huhubot.receipt-key.v1.<device SHA256>.<profile SHA256>，通过App.loadLocalStorage/saveLocalStorage保存32字节随机HMAC-SHA256 key；最终以054实物为准。回执目录为.huhu/huhubot/<device SHA256>/host-receipts/<profile SHA256>/，effect摘要安全文件名及index由Host实现，均不保存完整正文/CP/Provider secret。该key不写Vault回执、不经HAP/日志/portable；只验证匹配身份和指纹的completed可证明committed，缺key/损坏/篡改不应声称确认写入或自动重放。普通Vault JSON与可信本机key分离不是对OS/恶意插件控制的防护。Git现有整个根排除保持，不声称管理外部同步。

保持两块数据根和库外Profile SQLite权威；移除本次实际实现已替代的“预留”措辞，未实现T17/T19清除/备份UI不提前写成已交付。未知最小安全记录可能敏感，不能宣传任意删缓存。不得改永久ADR/context/AGENTS，不顺手处理已有六处无关目录锚点，不提交、推送或发布。

## Acceptance
回读三文件精确diff、源事实与链接；对fresh-vault做Node语法检查，文档做适用docs检查。低影响Wait修正不为形式新建镜像实现的测试；若使用受控进程验证，只允许自有一次性child并实际Wait，不能启动Obsidian。基线已存在docs失败单独保留与比较，不伪造全绿，不改无关文档来掩盖。

本窗口不跑全插件build/lint、不改main.js/styles.css或五平台资产。Root在全部生产输入稳定后执行全局检查及独立联合审查。本次更新architecture参考摘要后，返回前后SHA与事实差异；Root随后重绑受影响Ticket Skill引用。T27整票保持in_progress，不能自行宣称最终发行完成。

## Return
准确写入本目录REPORT.md：首个h2前Session: 20261025T043239Z、Task: 058-host-receipt-docs-cleanup、Status: completed（或实际失败状态）；h2聚焦交接、产物与验证、问题与下一步。列3文件前后SHA、完整命令/exit/工具环境、未运行真实宿主、所有自有进程Wait、停写。validate-dispatch return0后真实MESSAGE和FINAL；Root完整回读、独立核验后接纳。TASK投递后冻结，不修改正式状态或他人报告。
