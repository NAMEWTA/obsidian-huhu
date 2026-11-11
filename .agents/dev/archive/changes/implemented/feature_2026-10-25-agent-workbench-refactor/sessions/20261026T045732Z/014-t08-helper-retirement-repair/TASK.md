---
schema_version: 2
session: "20261026T045732Z"
task: "014-t08-helper-retirement-repair"
kind: "implementation"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-08"
---

## Goal

Lead codex:/root。沿既有Sol/xhigh身份，仅修011完整独立审查的F1：普通终态栅栏先到而editor-closed后到时，Host helper留下已关闭binding。用户完整Goal授权已覆盖本票修复，不再问确认；不递归派遣。只有Root维护正式SpecDev工件、状态、根产物与最终验收。

## Inputs

项目 /home/wta/orca/workspaces/obsidian-huhu/terminal；change .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor。当前GP028/Map29、T08 in_progress。按I入口/预检、Map→dev→T08读取；继续采用原错误/资源/并发/TDD/test-reliability规则。新87路径分配evidence/T-08-write-allocation-r2.json SHA67d681e94e1b0eea0fa7fb9329884cbedb790edd68c10071f97bd5ae9404a105。原B15交付已STOP，本任务只解锁下列3路径，不是全部B15恢复写入。

修复前完整实际快照 /tmp/huhu-t08-root-review-repair-preflight-inputs.json SHA8cc4b042e38f9627d38fd8512912233c12cb74fa34c3197c1afc9990569dcbd9；85原产品未变，新增app回归仅在A范围。011原报告evidence/T-08-review-r1-report.md SHAaad8e99dbe325e7db34cce854631e7221dcaf15e701ca49b147d8d8721396119；Root回收evidence/T-08-review-r1-root-audit.json SHA10311ff753afdfa40aa99f69050f09e7e4aab5ead6611e8a57581420d2b265a1，真实scope/return均0。原F1 probe /tmp/huhu-t08-full-review-astra/late-close.ts与build/run原件均只读，E1 exit0表示已采到缺陷，不是产品绿。

最终native/helper语法未变，不重建或覆盖C产物。可复用 /tmp/huhu-t08-c-stage2-linux-20261026T080715Z/huhu-pty SHAf99ec633e2201d66ccd67605c65c709d6b25c443ec71978feff897fb27d315ca、huhu SHA923ac2d6fbc4f472537c73236040a487b8d991e4226aec81d5ebda488e995eee。若跑真实native测试，在每条receipt明确保存所选bin env与SHA；不靠继承未记录环境证明选择。

## Workspace and Scope

唯一可写产品：
- src/host/desktop/native/helper.ts
- src/host/desktop/native/helper-editor.test.ts
- src/host/desktop/native/host-editor.integration.test.ts

另允许本014 REPORT与新/tmp/huhu-t08-helper-repair-*证据/测试资源。其它产品、A/C/Root路径、规范/Map/Goal/Ticket/Evidence、旧报告/任务/原件、node_modules、Cargo target及已有bin全只读。Root同步派A只修UI/保存状态/文档，源不相交；不要全仓build/格式化或改其文件。

## Acceptance

先在当前真实公开接缝得到目标失败，再最小修复。必须保留原生命周期真相：普通numeric exit、reply-settled、confirmed termination、输出与editor实际关闭，以及该binding未完成operation/local frame等条件在最终回收处正确会合。editor关闭先到和后到都最终删除旧绑定；尚未结束的物理责任不能提前删除、返额或声称完成。pre-enrollment failed-none无editorId的已修路径保持；旧句柄继续拒绝新输入，别SID/query/stop/其他owner继续活性。不要通过timeout直接抹状态、改变native协议或替换helper实例来隐藏泄漏。

把011 E1变成可重复实际回归：使用生产PtyHelper与固定真实bin，在仅测试自己的隔离cap路径上保留/恢复原inode制造迟到清理；证明ordinary fence先到时仍受保护，真实editor关闭后editorBinding(sid)消失/操作结算，同helper重复使用不累积旧binding。另覆盖反向顺序及在途operation/frame保护。优先用现有public handles/events和实际settled，不用固定sleep冒充物理清理；若需要受控transport仅明确测试哪一层，不能代替真实native反例。

保存每条实际命令argv/cwd/UTC/exit/原输出、完整构建输入与最终source SHA、明确bins，区分行为red/fixture错误。运行受影响helper/editor/Host定向回归、适用类型/定向lint；原Pi应用扩展/native源码未变可按闭包复用，不重复整个官方供应方研究。Root最终单独统一build/lint/真实业务组合。测试结束应实际等待进程/端口/测试资源收束，不清旧原件。

## Return

一次性原子写 sessions/20261026T045732Z/014-t08-helper-retirement-repair/REPORT.md，精确Session/Task/Status，含“聚焦交接”“产物与验证”“问题与下一步”。给出具体修复、F1满足条件逐项、red/green与全部实际命令/源快照、3路径diff/原始前像、最终资源观察及限制。明确SOURCE STOPPED后跑return结构检查并通知Root；不自称独立审查或T08完成。
