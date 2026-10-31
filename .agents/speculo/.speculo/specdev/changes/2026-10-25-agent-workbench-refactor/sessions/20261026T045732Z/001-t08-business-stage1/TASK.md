---
schema_version: 2
session: "20261026T045732Z"
task: "001-t08-business-stage1"
kind: "implementation"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-08"
---

## Goal

Lead 为 codex:/root。用户已授权按 Spec/Map/Goal 完成18票，可用 Agent Team；当前唯一活动票 T08，T01–07已done。实现使用用户指定 gpt-6.1-sol / xhigh；Root最终代码验收，真实Obsidian/Provider/五平台E2E由用户进行。不派新子Agent、不提交/推送/发布/归档，不改真实用户库、HOME或账号。该任务只交阶段候选，不代表整票done。

## Inputs

项目根 /home/wta/orca/workspaces/obsidian-huhu/terminal；change为 .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor。先读项目AGENTS/workspace/catalog，调用实际 SpecDev I（.agents/speculo/workflows/specdev/specdev-i-implement/SKILL.md，必要procedure/preflight/TDD/coordination参考）；按 tickets-map.md完整背景与Skill矩阵 → .agents/skills/dev/SKILL.md与命中architecture/licensing/testing、ui绑定 → ticket/08-terminal-coordination.md → goal-plan.md §4 顺序回读。已读未变化规则可复用，保留真正read_scope。

当前 GP026 / Map27，T08 status in_progress；真实DoR三命令exit0/无漂移，T08唯一frontier。固定产品before为 evidence/T-08-dispatch-input.json SHA7b2096e05c302df7519f8a80e13925399f19fb7071e2b3420884e65239ad2137，保全T01–07已有工作。当前具体工程合同必须完整读 evidence/T-08-engineering-packet.md 与 T-08-editor-transaction-decision.md，Spec §3.4/3.5/11、implementation-contracts和本票AC为权威。用户Space决定已经锁定：所有新运行必须显式绑定Space；旧交互先选择，后台缺配置失败，不猜cwd/focus；T14/T15实际旧消费者后继完成。

上游 evidence/T-07.md、T-07-completion-done-root-audit.json；现T07双bin在 /tmp/huhu-t07-c-review-r1-linux-final-20261026T035611Z，禁止改写这些0555不可变原件。研究来源 evidence/T-08-a-control-plan-root-audit.json、T-08-b-producer-proof-report.md/.json、T-08-b-producer-proof-root-audit.json、T-08-c-editor-port-plan.md/.json/root-audit.json，和原 reference-notes.md；官方Pi1.4.0+Jiti2.7.0原件在 /tmp/huhu-t08-b-producer-proof/。沿固定可追溯研究，不复制GPL终端代码，不自动安装或改用户启动参数。B的真实Mode/default editor证据止于受控Session边界，不能宣称Provider任务/全CLI-main完成。

## Workspace and Scope

唯一工作区上述root，branch NAMEWTA/terminal，HEAD33c21e098ef3188cbab5a09f3e0a01fadb787715。唯一写集是下方本阶段清单；整票allocation的其他路径此时只读。Root独占全部正式Spec/Map/Ticket/Evidence与main.js/styles.css/budget/notices，C独占canonical/generated/shared/native，B独占Host/helper和extension，A独占业务/启动/UI。并行各自定向测试，不跑根build或全仓lint、不写Git index/锁文件/node_modules、不改其他Agent代码。未列路径需求先回报Root，由Root更改合同后再写；不要先改后补。

产品提交前稳定接缝真实红→绿：每次实际命令记录argv、cwd、UTC、exit、完整原log与输入/源SHA；失败原件不覆盖，skip不作通过。冻结真实read dependencies，受另一writer影响的证据标失效后只重跑影响项。复用 /tmp 的独立日志/临时fixture，禁止操作用户真实Provider/网络任务。Node使用 /home/wta/.volta/tools/image/node/26.11.1/bin/node；pnpm可用同Node执行 /home/wta/.volta/tools/image/packages/corepack/lib/node_modules/corepack/dist/pnpm.js。不能用T07旧bin证明新Rust协议。

### A 首批写集（仅8项）

- `src/modules/agent/core/control/context.ts`
- `src/modules/agent/core/control/terminal-coordination.ts`
- `src/modules/agent/services/control/terminal-coordination.ts`
- `src/modules/agent/services/control/terminal-coordination.test.ts`
- `src/modules/agent/services/terminal/session.ts`
- `src/modules/agent/services/terminal/session-coordination.test.ts`
- `src/modules/agent/core/terminal/keyboard.ts`
- `src/modules/agent/core/terminal/keyboard.test.ts`

实现原Session活动观察的有限等待原语、领域结果和raw named-key编码及风险测试。先读 /tmp/huhu-t08-a-control-plan.md；旧守卫PTY正文方案以当前packet应用事务决定替代。本阶段不接prompt、launcher、commands/router或UI，不提前写这些整票路径。

复用现TerminalSession.observeActivity的原子snapshot+注册和32总监听上限，每次wait只留一个最新snapshot。观察绑定原runtime/source，不随当前焦点/运行代次变动重定位。独立wait可立即匹配当前；prompt用的观察预先捕获N和初始working，输入前取得监听额度，只有确认输入后才接受同源activitySequence>N事实。失联/root退出/source变化优先于普通unknown匹配。原call.signal与首次capture本地deadline不得在run续期；超时/取消只解除观察，不stop或重发。UI后续继续等将沿原tuple+N新建观察。

C负责canonical readOnly和统一wait枚举 idle|working|waiting|permission|done|failed|interrupted|unknown|blocked；前8是现AgentState，blocked来自blocking。不要手抄生成协议/候选NativeEditor DTO；可先复用现AgentState的类型关系实现独立原语，待C真实exports后精确接入。纯wait effect none，mutation已输入完成后的等待失败要保留completed事实，不能被abort.reason抹掉；此阶段只提供有限领域结果和原语。

raw keys使用原终端实际键盘编码/模式，finite语法、拒未知/非法组合、IMEs不误Enter，保持Ctrl-C复制/中断及kitty/win32现有路径，不自己造第二输入writer。材料paste仍无Enter。C和B接口未冻结前不得使用假的adapter结果让实际prompt看起来成功。

## Acceptance

阶段候选覆盖：独立当前匹配；旧idle不能满足新N；初始working；输入前监听32上限与释放；同步观察不漏事实；取消/timeout/source换代/root退出不重定位或杀运行；只保留latest；已经发生输入的领域语义；有限keys与现keyboard回归。定向实际vitest路径为本阶段新测试及原keyboard/session邻近回归，按testing选必要项，记录真实red/green和未验项。不写mirror-only测试，不通过宽松断言或无条件skip造绿。

先完成这8路径候选并SOURCE STOPPED，供Root读实源后再派第二阶段；整票build/native/真正prompt/UI/独立审查由后续Root负责。首批不会满足全部T08AC，不填正式状态。

## Return

通过原生collaboration向 /root 发问题和进展，最终交付 `/home/wta/orca/workspaces/obsidian-huhu/terminal/.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/sessions/20261026T045732Z/001-t08-business-stage1/REPORT.md`，按 .agents/speculo/references/coordination/report-template.md 的真实 Session/Task/Status 记录，报告不覆盖；全量日志、输入SHA和before/after源快照可放 /tmp/huhu-t08-a-stage1-* 并给准确路径/hash。最终注明 SOURCE STOPPED、精确改动与未验项，不把候选等同Root验收。不改TASK、正式Evidence或其他人的REPORT。
