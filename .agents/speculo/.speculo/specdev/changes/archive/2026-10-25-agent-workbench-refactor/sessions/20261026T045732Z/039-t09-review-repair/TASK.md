---
schema_version: 2
session: "20261026T045732Z"
task: "039-t09-review-repair"
kind: "repair"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-09"
---

## Goal

Root完整18票Goal，沿原codex:/root/implement_t08_profile、用户指定gpt-6.1-sol/xhigh，修复036完整独立审查确认的F1/F2。原028 SOURCE STOPPED；本次新TASK不覆盖旧报告。保持单布局writer、已批准组/焦点/容量语义与T01–08，交真实修复候选；Root整合与独立复核后才可完成T09。无递归派遣。

## Inputs

完整读取原036 REPORT（SHA256 185e7567c278be59f581105ba9bf3724a7454387383f3bbfece2917864609b82）、Root T-09-full-review-r1-root-audit.json及原反例。固定输入 /tmp/huhu-t09-root-review-repair-mq99pq7w/inputs.json SHA256 94a5ee60a357d9fa8d01bfe163208ca0fbb7bc7a0199fbaa3ea0e5aa1cdc7057。完整停源候选 /tmp/huhu-t09-root-final-review-r1-inputs.json（5b5ad8baa7b79c8aefd7d0dc416a4fac0a894e07aea0286cce295c624ed004f4）已由Root核2081产品无漂移；原69来源/57路径review Input-SHA256 56969d866b660f49aa6b504bb8154bef8ceddb10332a0a4880119e575cd68e3f。反例根 /tmp/huhu-t09-full-review-r1-1nw01eac，原group before2/2pass/final2fail，容量起点4096合法、实际primary写4097后list/capture/close全失败；全部只读。

执行前按原bootstrap/Map→dev/ui→T09/Goal读取；实际调用I repair、TDD/错误/并发资源规则，已读未变可复用。GP034/Map35、T09 in_progress/attempts2、Spec AC009/061、工程Packet及DESIGN revision1 PAGE001/003不变。无需新产品决定。第二次Root默认DOM312等旧通过保留但不覆盖新缺失场景。

## Workspace and Scope

repo /home/wta/orca/workspaces/obsidian-huhu/terminal，HEAD33c21e098ef3188cbab5a09f3e0a01fadb787715，branch NAMEWTA/terminal；复用原工作区，无提交/推送/发布/归档。唯一产品可写范围仍为原A14，按需要最小修改：
- src/modules/agent/core/workspace/model.ts
- src/modules/agent/core/workspace/ops.ts
- src/modules/agent/core/workspace/ops.test.ts
- src/modules/agent/core/workspace/pane-identity.ts
- src/modules/agent/core/workspace/pane-identity.test.ts
- src/modules/agent/services/workspace-store.ts
- src/modules/agent/services/workspace-store-spaces.test.ts
- src/modules/agent/services/workspace-service.ts
- src/modules/agent/services/workspace-service-panes.ts
- src/modules/agent/services/workspace-service-panes.test.ts
- src/modules/agent/services/workspace-service-spaces.test.ts
- src/modules/agent/services/workspace-service-foreground.dom.test.tsx
- src/modules/agent/services/workspace-service-control.test.ts
- src/modules/agent/services/workspace-service.test.ts

仅可写本039 REPORT、新/tmp/huhu-t09-review-repair-*证据/fixture及上述A14。B18/U20/Root5与所有其他产品、Spec/Goal/Ticket/正式Evidence、旧TASK/REPORT/raw、Git/index、node_modules均只读。B/U明确停源，Root不与你并写A。不得跑全仓build/lint/Promise/Cargo/Chrome或改产物/预算；Root统一执行。无需重建未变native pair。必要新路径先报Root，不自行扩写。

## Acceptance

1. F1：在原owner接缝保留GUI显式groupId并重核目标。新增非活动组 attachManaged(focus:false) 与 foreground create回归，断言真实组成员、活动组/输入焦点许可、单runtime；CLI无group默认、同Session并发幂等、跨Space原归属不退化。实际NewTabMenu→Omnibox显式group消费者只读追踪，不靠先选择该组掩盖问题。沿原foregound DOM测试覆盖相关可观察焦点；不扩大UI改版。
2. F2：attach与split在实际publish/save之前验证新增候选的全局有效叶计数。同Space队列及跨Space最新已发布view必须保留；同步check→publish不得因await留下同时接纳最后名额窗口。现有4096上限不放宽，不另造可漂移计数/第二索引。拒绝effect none、零新增/零保存，原4096仍能list/capture/close。覆盖4095最后合法新增、4096拒绝新增、已附加Session重复attach不占名额、split边界及实际跨Space竞争；路径目标和identity失败先于effect的原保证不变。
3. 原036 red可直接复用精确同字节证据，另为新增边界写有意义红/绿；不改reviewer原fixture/REPORT/raw。定向生产owner/模型/store/foreground回归和实际test types/生产lint按风险运行；使用绝对Node26.11.1避免PATH wrapper把1变126。保存实际argv/cwd/UTC/exit/raw、真实输入消费/快照与前后drift，旧失败不抹除。不用复制实现或mock核心owner产生通过。
4. 本轮只交A窄修候选，根build/main/包体预算、B真实CLI原owner组合、生产DOM/Chrome及独立完整复核由Root按影响闭包收口。真实Obsidian/Provider/OS IME/五平台仍由用户验收，不运行账号/真实Vault。清理仅本任务fixture并确认无遗留owned进程。

## Return

最终A停写后无覆盖原子写 /home/wta/orca/workspaces/obsidian-huhu/terminal/.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/sessions/20261026T045732Z/039-t09-review-repair/REPORT.md，Session/Task/Status与聚焦交接、产物与验证、问题与下一步齐全。列F1/F2真实关闭证据、精确修改路径前后hash/mode、命令/消费闭包/原失败与未验证项。实际validate-dispatch --stage return保存raw/exit后，用原生通道返回SOURCE STOPPED与报告路径。Root唯一验收/正式状态owner。
