---
schema_version: 2
session: "20261026T045732Z"
task: "002-t08-protocol-stage1"
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

### C 首批写集（仅17项）

- `src/shared/native/control-schema.json`
- `scripts/generate-control-protocol.mjs`
- `src/shared/native/control-wire.generated.ts`
- `src/shared/native/control-wire.ts`
- `src/shared/native/control-wire.test.ts`
- `test/fixtures/native/control-v1.json`
- `test/native/control-protocol.test.ts`
- `src/shared/native/host.ts`
- `src/shared/native/input.ts`
- `src/shared/native/input.test.ts`
- `native/pty-server/src/control/wire_generated.rs`
- `native/pty-server/src/control/codec.rs`
- `native/pty-server/src/control/client.rs`
- `native/pty-server/src/control/broker.rs`
- `native/pty-server/src/control/mod.rs`
- `native/pty-server/tests/control_protocol.rs`
- `native/pty-server/tests/control.rs`

执行实际canonical readOnly/state与完整shared editor端口、strict codec、共同fixture。Root已全文接收你的 /tmp/huhu-t08-c-editor-port-plan.md，26来源/C30/两immutable bin实际匹配；采用其同spawn32-slot enrollment + kind4正文 + 原队列持槽方向。共同editor fixture并入test/fixtures/native/control-v1.json，不增加新fixture或adapter路径。原native/runtime main/session/editor/foreground/outbox等后续阶段再派，本阶段不写。

每operation显式readOnly:boolean，缺失/非法在生成器拒绝；query和agent.wait=true，其余mutation=false。transport仅分原池，wait仍ordinary14，query/stop保留2；C本阶段把现broker/client取消/timeout副作用改读readOnly。wait统一有限enum和TS/Rust导出，prompt.wait和wait.state同源，严格fixture两端一致。不要因准备接口就提前把未接线后继能力宣称available。

shared NativeSpawnOptions.editor? 随原spawn admission；NativeConnection editorTransactions / editorBinding(sid)与 ready/closed/submit/close、submission queued/finished/settled/cancel 的实际接口由你唯一拥有，标明lease/generation/SID身份、remainingMs本地单调期限、source和operation correlation、明确稳定拒绝reason与none/partial/completed/unknown。adapter-applied是应用完成，不能套PTY written；queued不是输入，finished未知可早于真正settled。close同步撤准入、不因观察timeout假结算物理slot。

同一canonical新增editor metadata/limits及二进制布局常量，TS strict原raw/JSON入口和Rust codec方向/重复键/未知字段/非法UTF8/整数/完整包容量拒绝，正文禁止放JSON。B消费可嵌入的同源codec生成物，不手抄grammar；不让Browser Cookie/history首用初始化整张schema。声明的caps不是保护同账号恶意进程；目的隔离、cap文件路径env、不与CLI locator/令牌/池混用。将元数据池、app连接/未认证槽、logical copies、InputBudget共享和retiring责任的真实合同写清，不把候选预算冒称测量/RSS上界。

原32slots/32listeners、256KiB操作/16KiB片/512KiB32ops每SID/2MiB128ops每helper及普通CLI32768请求/8192进度/49152最终整包合同保持。额外小生命周期有固定独立池；每SID单binding/claimed事务，dispatch未知不可timeout返原槽。跨进程只有remainingMs，不比较绝对单调时钟；新的native输入10s预算不重置CLI整个wait期限。输入完成后的wait取消/timeout必须保留receipt与effect completed，纯wait始终none。

不要先写native生产消费者来合理化候选接口；优先交一组真实、可测、能供B/A消费的完整shared/canonical源码，说明任何仍需决定的生命周期接缝，SOURCE STOPPED。Root回读后明确冻结exports，再续派native和B。你的types/limits必须消费同源常量，禁止第二manager/PTY writer/隐式自动重连/重放。

## Acceptance

先用真实共享stable seam做readOnly/state及严格metadata/fixture红绿；TS/Rust同fixture识别方向、目的、身份、旧epoch/非法UTF8/重复/预算边界。现control query/mutation timeout/closing受影响回归，wait独立readOnly不会挤reserved池。定向Node/Vitest、generator --check与必要cargo scoped tests、scoped fmt可执行；任何native test build采用你独占的新 /tmp target或已有你独占target，不能覆盖T07immutable双bin。不跑根build/全局检查。

返回当前实际exports/版本/完整报文与上限、代码路径和原始red/green/source快照，以便B/A直接从源码消费；本阶段不声称app/OS/五平台/真实Provider完成。接口回读后Root再解锁native，未经续派不继续那部分写入。

## Return

通过原生collaboration向 /root 发问题和进展，最终交付 `/home/wta/orca/workspaces/obsidian-huhu/terminal/.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/sessions/20261026T045732Z/002-t08-protocol-stage1/REPORT.md`，按 .agents/speculo/references/coordination/report-template.md 的真实 Session/Task/Status 记录，报告不覆盖；全量日志、输入SHA和before/after源快照可放 /tmp/huhu-t08-c-stage1-* 并给准确路径/hash。最终注明 SOURCE STOPPED、精确改动与未验项，不把候选等同Root验收。不改TASK、正式Evidence或其他人的REPORT。
