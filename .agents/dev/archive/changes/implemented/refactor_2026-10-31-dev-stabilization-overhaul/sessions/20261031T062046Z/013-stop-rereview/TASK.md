---
schema_version: 2
session: "20261031T062046Z"
task: "013-stop-rereview"
kind: review
change: 2026-10-31-dev-stabilization-overhaul
ticket: T-04
---

## Goal
/root/sources作为未参与T04实现的独立Astra low reviewer，按真实固定候选执行标准轴与规范轴审查。Lead最终验收。

## Inputs
先读当前Map revision11、dev Skill、Ticket04、spec/ADR/execution-boundaries、SpecDev C review方法；evidence/T-04.md#review-input固定27项与来源。Input-SHA256 9d8a1db2f63871a7d441333b99a2a3701e34e4582ad4732eb8331ba04dca24ac，全部源文件writer已停写；输入复核实际SHA不匹配即报告，不根据失效快照给pass。读取006及011 REPORT、010旧双轴finding；011完整包/race与追加真实observer结果已交回，源码全部停写。

## Workspace and Scope
current/dev，唯一/home/wta/projects/obsidian-huhu，base86c500556db1d64865c4cc7f1aff1dd83de071fa。所有代码/测试/合同/Evidence/Ticket只读，仅写本REPORT。不得修复、Git、递归派遣或真实Obsidian。严格独立：你仅实现T03/T14，未参与T04。如发现独立性不成立先报告。

## Acceptance
实际审查Core四事实及唯一drain所有权、错误聚合、超时不取消、持锁到真实清理、迟到producer、重复stop与并发响应；HAP认证/managed-owner限制、stopping观察不访问已关DB、EOF/信号/非shutdown请求关闭、完成ACK写出时序；所有Go Close消费者、生成源及schema/types/fixtures一致性。慢fsync是否命中真实Sync接缝，>3秒red和锁重开断言是否有效；测试失败不能被环境猜测掩盖。原fsync失败仍close/release语义保留，但persistenceComplete不得误真。TS生产消费者T06未迁移是明确分票合同，不当作T04已通过TS全链，也不为此要求旧兼容链。

两轴各给Reviewer native:/root/sources、Axis standards/specification、Result pass/fail、Input-SHA256、Observed及文件行号问题/严重性/触发条件/建议。审查要看实际diff与消费者，不只阅读报告。可运行轻量只读schema检查，本轮无Go测试在运行，可运行必要轻量复核，不无故重复全量。范围外问题单独标不阻本票；真实本票问题必须fail。

## Return
本目录REPORT.md，遵循coordination/report-template.md，包含两轴原始结论与不可伪造的观察，完成后消息通知并停写。

## 本轮复核重点
逐项检查旧STD01/02和SPEC01/02实际关闭，不只检查摘要；同步batch/async/slots分支共用requestsMu屏障、Close锁外且准入永久关闭。新增private测试两个顺序是否真正阻止窗口；真实observer第一incomplete到Core实际清理，EOF严格。其他24项不漂移但仍需确认修复无回归。先完成此只读review，随后Lead另行释放T16，不能同时修改T04。请先补012预检REPORT（当前仅TASK），该report如实preflight完成尚无生产。
