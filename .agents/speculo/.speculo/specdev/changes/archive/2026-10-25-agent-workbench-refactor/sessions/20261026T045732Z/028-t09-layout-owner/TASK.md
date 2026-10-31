---
schema_version: 2
session: "20261026T045732Z"
task: "028-t09-layout-owner"
kind: "implementation"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-09"
---

## Goal

沿原codex:/root/implement_t08_profile、用户指定gpt-6.1-sol/xhigh，完成T09 A：原SpaceWorkspaceStore/WorkspaceService的稳定Pane身份、只读布局投影、同owner编辑/保存和六操作真实领域端口。Root编排与最终验收；你只交候选。025已交回SOURCE STOPPED，T08现已done；028是新任务，不覆盖旧TASK/REPORT。用户完整18票、Agent Team与代码验收授权持续；真实E2E由用户执行。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/terminal；change .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor。HEAD 33c21e098ef3188cbab5a09f3e0a01fadb787715，branch NAMEWTA/terminal，同一current工作区。GP033/Map34；T09 in_progress、attempts0；T08实际done、最终R5两轴pass。无提交、推送、发版或归档。

按bootstrap/Map→dev/ui→T09 Ticket→Goal与批准DESIGN读取；调用I权威入口和当前设计/TDD/错误/资源规则，已读未变规则可复用。Spec §3.1–3.5、AC009/061、implementation-contracts与DESIGN revision1/PAGE001/003为上层权威。工程细节完整读evidence/T-09-engineering-packet.md与T-09-write-allocation.json，不能只依本文摘要。

初始真实输入 evidence/T-09-dispatch-input.json SHA256 aec8e02b821c7ea7869e0c153e213acc655fb60e1e9347cd78919577462acfc8；工程Packet SHA256 5900b0b979de79e39742eefc6696e38a473b16aab0a1bf69257649877c18e16d；allocation SHA256 12b2f9bcea31f45176c798efe1f5e8f32442bf01a16505703cebe423e6f1da5d。实际DoR/validators原件见evidence/T-09-start.json SHA256 67bee8ba4e603e9886f4c746c76c719b22d35f3478021b1804e1b37e96992079。基线已包含T01–08全部源码和产物，不把HEAD→当前差异归T09。

012/013联合准备接收evidence/T-09-preparation-root-audit.json；018身份/原owner接收evidence/T-09-identity-preparation-root-audit.json及sessions/20261026T045732Z/018-t09-pane-identity-preparation/REPORT.md。018已实际反证query补写ID与绕dirty草稿updateLayout；旧Root首次load写ID草稿已废弃，不采用。准备探针不是本票产品红绿。参考研究采用原012/013官方固定来源及reference-notes，不重新泛搜或复制许可不兼容代码。

## Workspace and Scope

只有下列14产品路径由你唯一写入：

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

允许本028 REPORT及全新/tmp/huhu-t09-layout-owner-*证据/fixture。其他全部产品、SpaceService/records/merge算法/controller、B/U/Root路径、Spec/DESIGN/旧报告/正式状态、Git/index、依赖锁/node_modules只读；不要为测试便利扩大路径。不得运行根build或改main/styles/budget/notices。协议TS/Rust生成物归B；native编译/CLI集成由B与Root协调。A不运行会临时改src的全局Promise/architecture门；Root后续串行处理。

B第一阶段最多并行前10个独立协议/CLI路径，availability保持false；U尚未解锁。跨组消费动态源的测试须记录实际闭包与前后摘要，漂移就不称最终通过。A唯一拥有store/service，Root不同时改你的源。确需新路径或上层行为变化时先报告实际调用链与最小缺口，不能越界后补票。需要i18n key发给Root/U，不自行改词典。

## Acceptance

1. 先从真实原store/service建立必要红灯，逐切片实现。比较原owner增端口与绕过owner写records两种方案，采用前者并保存理由。query/load/list无writer、无磁盘写、无ensureDraft/map增长、无Space选择、无ID分配；缓存返回实际dirty草稿和本地revision，未缓存仅有限只读描述。
2. ResumeInfo可选paneId；新显示在准入mutation分配一次pn1.UUID。legacy lp1.完整canonical UTF8 JSON四元组base64url，3069B可4096、3070B拒绝，不弱hash/截断/折叠。非法显式ID和重复/超长须可诊断，不从normalize丢字段后当缺字段造别名，不将合成restored叶当磁盘事实。读投影不得污染clean base；首次真实编辑先物化保留叶的同ID，再转换。reorder/resize/switch保持，close失效，reopen每叶新ID，单Session单显示owner。
3. 原SpaceWorkspaceStore同一Space串行等待/重核/接纳/保存，保留既有dirty与save在途更晚GUI编辑。非当前Space不临时select，不全局flush，不走records.layouts旁路。按Packet准确区分none、partial、unknown、completed；save确认点先记录persisted，后续rebase失败不能伪称未写；晚到保存由原owner收束。
4. WorkspaceService提供六操作真实薄端口，明确signal/deadline、原Pane/Session/runtime与分页revision；不与B/U另造同名DTO。list有界且查询无副作用；attach仅显示已有Session/live原代，stopped/restored不spawn，pending准确；split显式第三Session、同Space、最多4叶，分别捕获源Pane与插入runtime；ratio为最近父split中目标子树份额、second取1-ratio，公开0.15–0.85非法拒绝；close仅detach不stop。跨Space同ID歧义准确失败，不靠hint任选。
5. focus必须沿原ForegroundIntent，经真实presentManagedFocus/commitFocus后观察consumed，不能把commitPresentation的true当输入焦点。原1000ms且受总deadline，取消/替换/blur/关闭/新视图准确终止观察；已切布局但没实际呈现为partial，stopped不假称输入焦点。保留T08target与焦点独立，全部旧控制回归。
6. 定向生产model/ops/store/service/foreground DOM回归覆盖018反例、四种effects及取消迟到、并发attach、第三C、嵌套second比例、close/reopen/新runtime与实际焦点。测试走真实生产入口，不复制实现或mock掉关键owner；允许外部磁盘/宿主端口受控但明确边界。保留旧测试风险，不放宽/跳过制造绿色。类型/自身生产lint在相关输入稳定时运行；Root最终全局build/lint/原生CLI/Chrome整合另做。
7. 每条命令保存真实argv/cwd/UTC/exit/raw、前后源/工具依赖与实际编译消费输入及快照；只声明实际采集范围。原红、夹具失败与修复原因均保留。测试资源归属和清理可核验，仅清自己fixture；不动真实用户Vault/账号。不得声称真实Obsidian/Provider/OS IME/五平台已验收。

## Return

接口可用时先通过原消息通道交Root最小真实签名、路径和已过关键红绿，说明哪些源仍在写；Root核验后才解锁B/U消费者。最终停写、原子写028 REPORT，按标准聚焦交接/产物与验证/问题与下一步包含实际14路径前后hash/mode、API合同、全部命令与闭包、失败保留、未验证项、资源与SOURCE STOPPED。报告completed仅候选交回，不改Ticket/Evidence/Goal。写后实际return结构校验保存原件，再通知Root。无递归派遣。
