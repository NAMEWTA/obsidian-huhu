---
schema_version: 2
session: 20261029T021146Z
task: 011-repair-recovery-residuals
kind: implementation
change: 2026-10-25-agent-workbench-refactor
ticket: T-18
---

## Goal
Lead codex:/root，GP-046 / Map43，同一T-18最终集成窗口，数据恢复六根因中的分配窄修。你是原Sol/xhigh实现者，不做独立审查、不递归派遣。成功是新反例正式red→green及原风险不退化。

## Inputs
依序回读本change tickets-map实施背景/Skill矩阵→真实dev/ui适用Skill→T18→goal-plan。I实现入口/预检/TDD/错误/可靠性与原Spec/DESIGN/implementation-contracts继续有效；不修改上层决定。原已交回实现../006-repair-data/REPORT.md，当前独立复核../009-final-data/REPORT.md及../007-final-overall/REPORT.md；完整原始反例路径见报告。当前base33c21e0→候选2（HEAD78102da未变，453路径冻结SHA69e012...仅历史输入），产品冻结已由Lead在007/008/009正式交回后解除。上轮全量4873 passed、42 skipped，build/主要门禁通过但不能盖过6个已确认反例。失败历史均保留，不清零或新建工作区。

只修007 G-S01/G-S02（009 S10/S11/P09），原数据已关闭项保持。合法包inspect→preflight在runImport前污染Object.prototype，必须修复所有当前allowlist相关keyed map的自有项读取/安全写入；不要只过滤一个例子而保留constructor/prototype或继承对象别名。普通账号/Provider字典兼容，公开预检和导入前后原型/目标状态不变，保留原字段白名单/YOLO防升权。模块局部WeakMap<RecoveryStorage>隔离不能跨生产factory/模块热重载；复现真实shutdown旧主写挂起→drain取消→新factory offline restore→旧写覆盖。优先复用现有write-queue.ts的storageWriteQueue稳定Symbol.for carrier（既有注释survives plugin reload，host/private-storage已向adapter转发，但recoveryStorage未转发），pending lease也必须保存在稳定carrier而非新module私有WeakMap。保证同App/底层adapter新包装及模块重载不绕过；recoverBeforeStart、settled、run入口均不得在旧尾未收束时开始新恢复或加载冲突状态；收束后可恢复。仅缓存当前模块对象或仅缓存storage不够。请比较并选择现有接缝中最小充分方案，不新增业务服务；不同真实Vault/adapter隔离保留。根因是本轮已证实正常生命周期，不需用户新决定。若需要host/desktop新文件先给Root准确路径和理由。本轮records/model由010独占，你不改。

## Workspace and Scope
current /home/wta/orca/workspaces/obsidian-huhu/terminal；NAMEWTA/terminal。允许产品/同目录就近回归测试：
- src/modules/agent/core/backup/settings-codec.ts
- src/modules/agent/services/backup/plan.ts
- src/modules/agent/services/backup/import.ts
- src/modules/agent/services/backup/actions.ts
- src/shared/storage/recovery-contracts.ts
- src/shared/storage/recovery-transaction.ts
- src/shared/storage/recovery-transaction.test.ts
- src/shared/storage/write-queue.ts
- src/shared/storage/write-queue.test.ts
- src/app/recovery.ts
- src/app/recovery.test.ts
- src/app/recovery-start.ts
- src/host/private-storage.ts
- src/modules/automations/core/backup.test.ts
- test/agent-backup/**
- test/agent-migrations/fixtures.ts
- docs/data.md
只写该范围和本REPORT；另外一个worker写集不重叠，Root独占docs/agent-workbench-acceptance.md、harness、根产物、budget及所有状态/Evidence/规范。禁止改TASK/旧报告/Spec/DESIGN/README/Map/Goal/Git index/main.js/styles.css/真实用户数据。Rust可用CARGO_TARGET_DIR=/tmp/huhu-011-repair-recovery-residuals-cargo隔离测试；不cargo fmt全树。新增共享路径先消息Root，生命周期/协议临时方向需以回归证明，不扩大成新平台。

## Acceptance
每个真实反例先确认目标断言red，不把fixture/编译错当产品red；修后green并跑影响闭包定向回归。保留原已关闭项的同源测试，不能放宽/删除来过关。安全、持久、取消、late IO/ready/cache/adopt都从实际公共入口核验。最后局部lint与类型问题自查，不build/不全量Vitest；Lead源停写后重建、全局检查与Chrome，再由原独立reviewer按新快照复核。真实宿主/Provider/五平台仍由用户；未跑不宣称通过。

## Return
准确.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/sessions/20261029T021146Z/011-repair-recovery-residuals/REPORT.md，一次性同目录临时文件无覆盖落盘并回读。严格保留唯一三个H2：## 聚焦交接、## 产物与验证、## 问题与下一步，首部Session/Task/Status。列完整路径/SHA、逐finding满足条件/redgreen、实际命令exit、未验证边界和SOURCE STOPPED。completed只交候选，不自行done/verified。原生消息通知Lead。
