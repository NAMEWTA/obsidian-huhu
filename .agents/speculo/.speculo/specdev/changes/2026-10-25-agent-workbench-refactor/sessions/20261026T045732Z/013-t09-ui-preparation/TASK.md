---
schema_version: 2
session: "20261026T045732Z"
task: "013-t09-ui-preparation"
kind: "research"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-09"
---

## Goal

Lead codex:/root。用户授权完整18票Agent Team，沿你既有gpt-6.1-sol/xhigh身份做T09只读实施前准备，聚焦批准A布局、真实工作台导航/面板/焦点与验收接缝。T08仍由独立Astra审查，T09尚未开启实现；不得改任何产品/正式工件。只交Root可执行建议，不推进状态、不派子Agent。

## Inputs

项目 /home/wta/orca/workspaces/obsidian-huhu/terminal；change .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor，GP027/Map28。按workspace/catalog定位，复用I预检与真实dev/ui规则，依次回读Map、dev/ui、ticket/09-workbench-panels.md，Spec AC009/061、implementation-contracts pane语法、DESIGN与原UI001 A。DESIGN revision1 digest f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab，PAGE001/003；不修改原型或设计去迎合实现。

当前T08停止候选evidence/T-08-review-input.json SHA67522a2ee5d8579aca8469511d6529d6425b40fd6cd265db784e7900a9c0cf26，包含85范围及全仓final_manifest。HEAD33c21e098ef3188cbab5a09f3e0a01fadb787715、NAMEWTA/terminal。你刚交010的真实Chrome15/15/截图校准可作为下一票脚本借鉴，但不能算T09新行为验收。

T09 IN：Space/Session导航、控制抽屉、同Vault目标展示、GUI/CLI共享面板attach/focus/split/resize/close、宽窄主题。复用WorkspaceLayout/WorkspaceService/store/TabStrip、现有react-resizable-panels、拖拽/组/快捷键；close只是detach，停止必须明确确认。跨Space焦点与控制target分离，保留目标须在范围和选项里真实可见或清楚禁发，不能复现LOG028的显示目标与发送目标不一致。原后台运行/只关显示能力不退化。

读取当前AgentWorkspacePage、workspace/sidebar/tabs/jump/create/control组件及其DOM tests、WorkspaceService/store/view/core model/ops/shortcuts/space layout merge和实际scope/foreground/controller接缝。同时核对批准原型PAGE001/003的布局、侧栏折叠、panel header、loading/empty/disconnected/background/detached/stopped/restored/long/crossSpace状态。本任务重点是当前实现已经做到什么、T09真正缺什么，不从零重写既有系统。

## Workspace and Scope

全产品、规范/Map/Goal/Ticket/Evidence、旧TASK/REPORT、Git/index、node_modules、已有/tmp证据全只读。仅新/tmp/huhu-t09-ui-preparation-*与本013 REPORT可写。可只读查询/必要无副作用探针，不build/生成/全仓测试，不运行真实Obsidian/Provider/Vault。没有真实用户窗口时不把静态/原型视图算生产验收。保存实际读取的关键输入SHA；T08若被审查要求修复，只标明建议需复核，别抢先修。

## Acceptance

报告当前布局/导航/目标/焦点与DESIGN逐项差距，给具体源位置与最小实现建议；现有完整GUI交互→服务→CLI消费者可复用路径；同Session多Pane、第三对象分屏、跨Space、最后Pane关闭、ownerDocument/多窗口、路由关闭后台保持、键盘/拖拽/分组/长标题/空加载错误/200%/减少动效的风险与可观测测试断言；精确最小文件和T09现有写集缺口；建议owner分工和真实Chrome/DOM验收矩阵。浏览器验收脚本可建议复用010真实zoom/校准/cleanup，但不提前写实现。不要扩到邮箱/历史/网页共享容器T13。

若需陌生依赖知识按用户要求查官方近两年开源活动/许可/接口/已知问题；先用reference-notes已有来源，缺什么才查什么。不新增依赖，不复制GPL/不明许可代码。

## Return

原子、不覆盖地写 sessions/20261026T045732Z/013-t09-ui-preparation/REPORT.md，精确Session/Task/Status，含“聚焦交接”“产物与验证”“问题与下一步”；返回来源/SHA、真实命令/退出、建议与未验证边界。实际return结构检查后通知Root。仅Root判断T09何时开始，本报告不宣称T08或T09通过。
