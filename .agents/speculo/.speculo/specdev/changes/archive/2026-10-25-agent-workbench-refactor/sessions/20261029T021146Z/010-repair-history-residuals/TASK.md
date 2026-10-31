---
schema_version: 2
session: 20261029T021146Z
task: 010-repair-history-residuals
kind: implementation
change: 2026-10-25-agent-workbench-refactor
ticket: T-18
---

## Goal
Lead codex:/root，GP-046 / Map43，同一T-18最终集成窗口，工作台/历史六根因中的分配窄修。你是原Sol/xhigh实现者，不做独立审查、不递归派遣。成功是新反例正式red→green及原风险不退化。

## Inputs
依序回读本change tickets-map实施背景/Skill矩阵→真实dev/ui适用Skill→T18→goal-plan。I实现入口/预检/TDD/错误/可靠性与原Spec/DESIGN/implementation-contracts继续有效；不修改上层决定。原已交回实现../005-repair-workbench/REPORT.md，当前独立复核../008-final-workbench/REPORT.md及../007-final-overall/REPORT.md；完整原始反例路径见报告。当前base33c21e0→候选2（HEAD78102da未变，453路径冻结SHA69e012...仅历史输入），产品冻结已由Lead在007/008/009正式交回后解除。上轮全量4873 passed、42 skipped，build/主要门禁通过但不能盖过6个已确认反例。失败历史均保留，不清零或新建工作区。

只修007 G-S03/G-S04/G-P05（008 WB-S03-R/WB-S06/WB-P04），原WB已关闭项保持。用明确持久的fresh-import/never-started证据区分新建metadata-only与给legacy记录adopt补来源；补来源不得伪造终止，fresh导入仍零spawn可归档，重启/恢复也保持保守。对同key同mtime不同locator：完整选中身份必须贯通native read、TS接收、preview/cache/export；native能在读正文前核验expected source更好，TS仍需校验拒绝错来源。索引碰撞必须保守可解释，不静默改属已有标注；可以维持现有opaque key，不擅自引入持久迁移。至少覆盖A/B并存、同mtime、旧行read/export/cache拒绝或明确changed状态。history/确认portal窄fine-pointer至少44px真实命中且邻接不重叠；建议局部明确data属性/窄状态和CSS，保持桌面原布局。Root将扩展既有Chrome harness真实测量，不要改该mjs脚本；请告诉Root最终dialog/confirmation/filter菜单选择器。相关model/records写集本轮已由Root重新分配给你，011不写它们。

## Workspace and Scope
current /home/wta/orca/workspaces/obsidian-huhu/terminal；NAMEWTA/terminal。允许产品/同目录就近回归测试：
- src/modules/agent/core/space/model.ts
- src/modules/agent/services/spaces/records.ts
- src/modules/agent/services/spaces/records.test.ts
- src/modules/agent/services/spaces/space-service*.ts
- src/modules/agent/services/workspace-service*.ts
- src/modules/agent/services/launch/native-resume*.ts
- src/modules/agent/platform/history/**
- src/modules/agent/platform/desktop/server/agent-data-client.ts
- src/modules/agent/platform/desktop/server/native-history.test.ts
- native/pty-server/src/agent_data.rs
- src/modules/agent/services/history-store*.ts
- src/modules/agent/services/control/history*.ts
- src/modules/agent/ui/AgentWorkspacePage*.tsx
- src/modules/agent/ui/history/**
- src/modules/agent/styles/agent.css
- src/modules/agent/i18n.ts
- docs/agent-workbench.md
只写该范围和本REPORT；另外一个worker写集不重叠，Root独占docs/agent-workbench-acceptance.md、harness、根产物、budget及所有状态/Evidence/规范。禁止改TASK/旧报告/Spec/DESIGN/README/Map/Goal/Git index/main.js/styles.css/真实用户数据。Rust可用CARGO_TARGET_DIR=/tmp/huhu-010-repair-history-residuals-cargo隔离测试；不cargo fmt全树。新增共享路径先消息Root，生命周期/协议临时方向需以回归证明，不扩大成新平台。

## Acceptance
每个真实反例先确认目标断言red，不把fixture/编译错当产品red；修后green并跑影响闭包定向回归。保留原已关闭项的同源测试，不能放宽/删除来过关。安全、持久、取消、late IO/ready/cache/adopt都从实际公共入口核验。最后局部lint与类型问题自查，不build/不全量Vitest；Lead源停写后重建、全局检查与Chrome，再由原独立reviewer按新快照复核。真实宿主/Provider/五平台仍由用户；未跑不宣称通过。

## Return
准确.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/sessions/20261029T021146Z/010-repair-history-residuals/REPORT.md，一次性同目录临时文件无覆盖落盘并回读。严格保留唯一三个H2：## 聚焦交接、## 产物与验证、## 问题与下一步，首部Session/Task/Status。列完整路径/SHA、逐finding满足条件/redgreen、实际命令exit、未验证边界和SOURCE STOPPED。completed只交候选，不自行done/verified。原生消息通知Lead。
