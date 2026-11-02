---
schema_version: 2
session: "20261026T045732Z"
task: "012-t09-protocol-preparation"
kind: "research"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-09"
---

## Goal

Lead codex:/root。用户授权完整18票Agent Team，沿你既有gpt-6.1-sol/xhigh身份做T09只读实施前准备，聚焦pane公共协议、业务服务与native真实CLI闭环。T08仍独立审查，T09未开启实现；禁止任何产品/正式工件写入。只给Root可执行的接线/写集/验证建议，不替代DoR、不推进状态、不派子Agent。

## Inputs

项目 /home/wta/orca/workspaces/obsidian-huhu/terminal；change .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor，GP027/Map28。按workspace/catalog定位，复用I预检/dev规则，依次回读Map→dev/ui（只在触及视图接口时）→ticket/09-workbench-panels.md及Spec AC009/061、implementation-contracts pane命令、DESIGN PAGE001/003。权威当前源是停止的T08候选；evidence/T-08-review-input.json SHA67522a2ee5d8579aca8469511d6529d6425b40fd6cd265db784e7900a9c0cf26列最终85文件和全仓final_manifest。HEAD33c21e098ef3188cbab5a09f3e0a01fadb787715、NAMEWTA/terminal。旧Ticket里的66083基线只属规划，不能当当前实际源。

计划CLI为pane list [--space]、attach --session、focus --pane、split --pane --session --direction row|column、resize --pane --ratio、close --pane。要求GUI/CLI共享同一布局，目标稳定，跨Space focus切显示而不迁移Session归属；close仅detach，stop仍明确原目标。沿既有Space/Session/runtime/pane identity与T07 envelope/预算/捕获/foreground回执，不新增第二套DTO或布局owner。

先读现有canonical control-schema/generator/generated TS/Rust、control-wire/CLI/parser/router/commands/core control context、WorkspaceService/store/model/ops/space layout merge、WorkspaceView/controller、现有control-native等真实测试入口。核对现有pane操作是不是already-declared/availablefalse，明确消费者闭包。T09现有writable_paths可能未含真实必须的shared/native/生成器/controller/store/view/预算等；你只提出最小逐文件增补理由，由Root在T08关闭后修订Ticket/Map/Goal再派实现。

按用户“尽可能复用”先核对reference-notes R01 Herdr、R02 Wave、R03 tmux、K06 Wave修复，必要时用官方GitHub/原文搜索验证近两年实际活动、明确许可、机制/依赖与已知问题。只借鉴适用思路，不复制GPL/不明许可终端代码，不安装新依赖。已有充分本地来源可引用原定位与日期，但不能把未执行查询写成新research。

## Workspace and Scope

全产品、规范/Map/Goal/Ticket/Evidence、旧TASK/REPORT、Git/index、node_modules、Cargo target与旧/tmp证据均只读。只允许新/tmp/huhu-t09-protocol-preparation-*与本012 REPORT。只读搜索/源码提取/必要无副作用探针可用；不build/改生成物/跑全仓测试/启动真实账号或Vault。保存实际读取的关键文件SHA与provenance；若T08审查触发产品修复，标出受影响建议待Root复核。

## Acceptance

交回：现有能力事实与具体代码位置；六pane操作从CLI到service再到GUI可复用的真实路径；唯一布局/稳定pane identity/跨Space/attach幂等/第三对象分屏/ratio边界/关闭最后显示/丢失或已停止Session/失效UI叶子/多窗口焦点/部分完成回执等风险与建议（合同未定之处清楚区分）；最小准确文件清单及当前Ticket缺项；可拆分互不冲突的owner建议；适用单元/DOM/真实native CLI验证和可复用证据；至少一个关键反例及可观测断言。不要为了提前实现写补丁，也不要扩展到邮箱/历史/网页迁移。

## Return

原子、不覆盖地写 sessions/20261026T045732Z/012-t09-protocol-preparation/REPORT.md，精确Session/Task/Status，含“聚焦交接”“产物与验证”“问题与下一步”；返回实际来源/SHA、命令/退出、采用理由、建议与未验证边界。实际return结构检查后通知Root。Root决定何时进入T09，准备报告不宣称T08或T09通过。
