---
schema_version: 2
session: 20261029T021146Z
task: 006-repair-data
kind: implementation
change: 2026-10-25-agent-workbench-refactor
ticket: T-18
---

## Goal
Lead codex:/root；GP-044 / Map41；在同一T-18最终集成修复窗口内承担备份/迁移与恢复门禁，只修已授权整体报告反例和同范围回退。你是新的Sol/xhigh实现者，不承担独立审查，不递归派遣。成功是全部分配反例的正式回归通过，真实行为与Spec一致。

## Inputs
先读取 tickets-map.md 的实施背景和Skill矩阵→项目dev/ui适用Skill→ticket/18-platform-acceptance.md→goal-plan.md；路径均以change根.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor为基准。实际I入口 .agents/speculo/workflows/specdev/specdev-i-implement/SKILL.md 及必要预检/TDD/设计/错误/可靠性参考必须遵守。相关权威spec.md、DESIGN.md、implementation-contracts.md、ADR.md已获批，不修改其决定。首轮原始报告：../003-final-data/REPORT.md；其中/tmp反例脚本可读作参考，转为正式测试应断言正确行为而非断言bug发生。Lead恢复来源与37路径见evidence/final-merge-recovery.json；HEAD仍78102da，已有本轮未提交改动，不覆盖其他writer。全量初始验证见evidence/final-initial-checks/results.json，types/lint/Vitest等已确认红；不能把编译/夹具错误当新行为red。

修复 S01..S08/P09，S02/S06/S09已有Lead37源文件恢复，仍须验证。导入边界严格白名单，拒绝/忽略本机shell/env/路径字段且保留目标；完整nativeImport来源tuple不能设备重写。backup-only按真实owner规则读取有效来源或明确拒绝，不能静默成功漏包；设备/定义/缺失路径清单变化应拒绝漂移。AutomationService已接纳definition操作必须BUSY或排空，不能冻结后仍落盘才报失败；settings入口在mutation/notify前拒绝，排空不临时开门。P09需有界pre-commit等待/取消，底层永不settle与迟到完成用barrier反例；不只裸Promise.race后让旧writer参与新restore。可以超时撤销本轮门禁但隔离未收束旧drain，阻止新恢复直到它收束；任何未提交阶段终止不得继续stage/adopt。遵守原Spec/implementation-contracts，结果准确，不添加新的产品决定。你独占shared settings/recovery与automations service及backup i18n，不改agent/i18n.ts。

## Workspace and Scope
唯一current工作区 /home/wta/orca/workspaces/obsidian-huhu/terminal，branch NAMEWTA/terminal。允许路径（加同目录就近回归测试；新增具体路径先消息Lead）：
- src/modules/agent/core/backup/**
- src/modules/agent/services/backup/**
- src/modules/agent/services/spaces/records.ts
- src/modules/agent/services/spaces/records.test.ts
- src/shared/settings/store.ts
- src/shared/settings/store.test.ts
- src/shared/settings/settings-recovery.ts
- src/shared/settings/settings-recovery.test.ts
- src/shared/storage/recovery-contracts.ts
- src/shared/storage/recovery-contracts.test.ts
- src/shared/storage/recovery-transaction.ts
- src/shared/storage/recovery-transaction.test.ts
- src/modules/automations/core/service.ts
- src/modules/automations/core/backup.test.ts
- test/agent-backup/**
- src/modules/agent/ui/settings/BackupSection*.tsx
- src/shared/i18n/lazy/backup.ts
- docs/data.md

只有本TASK给定范围可写，不修改TASK/原报告/正式Evidence/README/Map/Goal/Spec/DESIGN/Git index/用户数据/产物main.js/styles.css。其他两位writer按004/005/006非冲突范围同时工作；Lead独占所有根产物、共享协议生成与全量检查。Rust定向构建/测试设置CARGO_TARGET_DIR=/tmp/huhu-006-repair-data-cargo，勿cargo fmt全树，勿触碰另一Rust writer源文件。发现需要共享路径立即通知Lead并等待分配，不猜测扩大。没有提交/推送/发布/真实库迁移授权。

## Acceptance
从真实生产入口或稳定公开接缝建立能暴露每项bug的red，再修复green，保留真实命令/exit与风险观察；既有回归覆盖可复用，不删除/放宽测试制造绿色。运行本范围定向测试；生产TS变化按dev要求lint/type最终由Lead全局串行，局部可查自己文件。不要运行build/全量Vitest/共享全局脚本。产物与真实浏览器验收、最终全局检查、独立双轴复核由Lead在源停写后负责。真实宿主/Provider/五平台E2E由用户，不能声称通过。若上层合同冲突或同一blocker无新证据则停止该分支并回报，独立项继续。

## Return
准确报告 .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/sessions/20261029T021146Z/006-repair-data/REPORT.md，Session/Task/Status首部，交付时不覆盖原子落盘并回读。含完整修改路径、每项finding→修复/测试、red/green事实、实际命令退出码、未验证项、源是否停止。仅候选交回，不自行done/verified。通过原生消息向Lead确认REPORT路径及一句话；不创建定位文件或伪造旧会话身份。
