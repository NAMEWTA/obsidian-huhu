---
schema_version: 2
session: 20261029T021146Z
task: 003-final-data
kind: review
change: 2026-10-25-agent-workbench-refactor
---

## Goal
Lead codex:/root 接续 G-06。独立审查 数据迁移/备份恢复/自动化/旧消费者 的 standards 与 specification 两轴。你未参与此前实现，禁止参与修复或递归派遣。

## Inputs
同目录 review-input.json 是固定工作副本输入，Input-SHA256: 39f060d78d5d3ff466dd833bd2925fff76c69b2adb011c3985c4f6dcc5bc0193；base 33c21e098ef3188cbab5a09f3e0a01fadb787715，observed HEAD 78102da2811953e72fe317cd08cd91311d9cac0d，范围为最初实施基线至当前全部实际产品交付。123 因额度中断无完整报告，且39个生产文件摘要已漂移，不可复用为通过。所有18票done，仍需核实整体交付。读取 .agents/speculo/workflows/specdev/common/skills/code-review/SKILL.md 及 source-discovery、fowler-smells、risk-review、reviewer-contracts 参考。AGENTS、dev/ui、spec、DESIGN、implementation-contracts、ADR、goal-plan、tickets-map 为来源，按需回读 T-01..18 Evidence、T-18 AC matrix；历史pass不能代替当前代码。

## Workspace and Scope
/home/wta/orca/workspaces/obsidian-huhu/terminal，current，branch NAMEWTA/terminal。所有仓库文件只读，仅本任务REPORT和 /tmp/huhu-003-final-data/ 可写；不构建、不改Git/产物，不操作用户真实库/Provider。重点：agent core/backup、services/backup、migration、存储路径、automations API与core/service、旧消费者及对应测试/文档；检查 path escape、secret、跨Vault、恢复和授权边界。 跨领域追踪真实调用方/消费者。检查正确性、生命周期/取消/恢复、数据安全、兼容、公开合同、测试证据、64 AC/NFR与DESIGN；不能只看最后一票/提交。writer已停，HEAD或源漂移报告Lead。

## Acceptance
standards、specification 分别 pass 或 request-changes。每项finding带 severity、file:line、触发场景/风险、依据与满足条件；low单列，不限定finding数量，不制造猜测。可运行必要定向测试，但不运行全量Vitest/build/共享全局检查（Lead负责）。记录真实检视范围与命令/退出码；未跑的真实宿主/Provider/五平台按Spec §11交用户验收。

## Return
准确位置 .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/sessions/20261029T021146Z/003-final-data/REPORT.md，首部 Session/Task/Status: completed，表示报告交回。先标准轴后规范轴，含Reviewer真实任务身份、Input-SHA256、Observed、findings、限制。通过同目录临时文件不覆盖落盘并回读，一次性交付。原生消息通知Lead；不得修改TASK/正式Evidence/README/Goal。
