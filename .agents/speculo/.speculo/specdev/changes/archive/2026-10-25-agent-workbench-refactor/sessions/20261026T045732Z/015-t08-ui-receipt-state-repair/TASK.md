---
schema_version: 2
session: "20261026T045732Z"
task: "015-t08-ui-receipt-state-repair"
kind: "implementation"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-08"
---

## Goal

Lead codex:/root。沿原Sol/xhigh身份仅修011的F2/F3/F4：新输入失败残留旧成功回执；关闭工具状态未穿过真实shell保存白名单；CLI等待状态文档拼写错误。不实现T09准备建议，不修改新设计，不派子Agent。Root拥有正式工件、根构建和最终验收。

## Inputs

项目 /home/wta/orca/workspaces/obsidian-huhu/terminal；change .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor。当前GP028/Map29，T08 in_progress。按I、Map→dev/ui→T08与DESIGN原revision1读取；既读未变规则复用，app/shell保存接缝触及dev architecture/module/Obsidian与ui shell规则。DESIGN digest仍f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab，PAGE001/003，不改原型。

Root先完成正式写集修订：evidence/T-08-write-allocation-r2.json SHA67d681e94e1b0eea0fa7fb9329884cbedb790edd68c10071f97bd5ae9404a105，A34/B15/C33/Root5共87。F3的compose与新app回归已在产品修改前列入Ticket/Map/Goal；并非允许改整个shell。修复前快照 /tmp/huhu-t08-root-review-repair-preflight-inputs.json SHA8cc4b042e38f9627d38fd8512912233c12cb74fa34c3197c1afc9990569dcbd9。原011完整报告 evidence/T-08-review-r1-report.md SHAaad8e99dbe325e7db34cce854631e7221dcaf15e701ca49b147d8d8721396119；Root审计SHA10311ff753afdfa40aa99f69050f09e7e4aab5ead6611e8a57581420d2b265a1。

F2真实生产Panel反例在/tmp/huhu-t08-full-review-astra/panel-receipt.dom.test.tsx和panel-probe-r4.*；r1–3只是测试装配错误，r4才行为red。F3 layout-state.ts及原输出证明compose stateKeys只有agentHistory/agentHistoryWidth、sanitizer丢agentControl=false、view重建true。该probe读取实际字面key但不是完整compose执行；修复回归应走真实compose贡献与实际sanitizer/view。已有src/app/workbench/safe-contribution.test.ts提供只mock外部Obsidian surfaces/leaf而正常执行composeWorkbench的合适夹具思路，保留该文件只读。F4 docs54的error/cancelled改为实际canonical failed/interrupted，不能新增协议alias。

## Workspace and Scope

本次唯一可写产品：
- src/modules/agent/ui/control/TerminalControlPanel.tsx
- src/modules/agent/ui/control/TerminalControlPanel.dom.test.tsx
- src/app/workbench/compose-workbench.ts
- src/app/workbench/agent-contribution.test.ts
- docs/agent-workbench-cli.md
- scripts/obsidian-acceptance/agent-workbench-coordination.mjs（仅必要的新修复行为验证；保留010真实测量/zoom/采集/清理方法）

另可写本015 REPORT、新/tmp/huhu-t08-ui-repair-*测试证据；其余A34路径、B/C/Root、规范/设计/Map/Goal/Ticket/Evidence、旧报告/原件、node_modules、Cargo target/已冻bins均只读。B另修helper，无同文件writer。不要全仓格式化或build；main/styles/budget由Root独占。

## Acceptance

F2先得到真实生产Panel的目标红灯，再修当前操作状态归属。新的prompt/raw text/raw keys开始时，旧输入receipt和旧matched/result不能冒作本次确认；新none/unknown/throw正确呈现。与此同时，同一原操作的wait取消/超时、继续等或被动read必须保留原可信completed receipt和原target/水位，不因清理新操作而重发/误清继续等待。晚到旧请求不能污染新操作。按实际状态路径选择充分边界用例，不只测新setState调用次数。

F3只在真实terminal贡献stateKeys补agentControl，至少正常执行composeWorkbench得到该贡献、经生产cleanPageState保存false后用真实createWorkspaceView恢复false；首次无状态仍默认true、history优先与无关字段过滤保持。不要测试源码里包含字符串当作行为证明，不修改shell sanitizer的通用allowlist规则或序列化非视图信息。新app测试须隔离正确宿主端口，避免把生产compose复制进测试。

F4用户中文说明使用真实enum并区分原生活动interrupted与本次观察/输入取消。无需为文字修正新造测试；可对实际固定CLI/schema作只读验证，保存原输出。

按受影响DOM/app单测与类型/定向lint运行红绿，必要Chrome验证将新行为加入原生产脚本，不停动画/放宽312/44/裁图/伪造zoom。010的原样式可暂复用；Root在最终构建产物上再运行完整Chrome并验收。捕获实际source/依赖/argv/UTC/exit/raw，所有tmp资源真实收束；不触碰旧证据。真实Obsidian/Provider/OS IME/五平台不跑、不宣称通过。

## Return

一次性原子写 sessions/20261026T045732Z/015-t08-ui-receipt-state-repair/REPORT.md，精确Session/Task/Status，含“聚焦交接”“产物与验证”“问题与下一步”。逐F2/F3/F4说明源修改/断言/真实red-green、精确6路径前后字节与diff（未变也列明）、所有实际检查与限制。全部SOURCE STOPPED后实际return结构检查通知Root。不改Task、不自称独立审查/T08完成。
