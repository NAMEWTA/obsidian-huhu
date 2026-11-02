---
schema_version: 2
session: "20261026T045732Z"
task: "016-t08-full-review-r2"
kind: "review"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-08"
---

## Goal

Lead codex:/root。沿原未参与实现的codex:/root/review_t08_native、用户指定gpt-6-astra/high身份，执行T08第二轮完整独立两轴复核。011原F1–F4均已由014/015窄修，Root第三次代码整合已完成；重新判断当前整票standards/specification。不是仅四条勾选，也不从C33或旧测试通过推导整票pass；不限制finding数量。不实施修复或派子Agent。

## Inputs

同一repo /home/wta/orca/workspaces/obsidian-huhu/terminal；change .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor。GP028/Map29、T08 in_progress，HEAD33c21e098ef3188cbab5a09f3e0a01fadb787715、branch NAMEWTA/terminal。原完整18票Agent Team授权持续；Root负责代码验收，真实Obsidian/Provider/OS IME/五平台由用户验收，未运行。没有提交、推送、发布、归档授权。

本次两个互补冻结输入，必须核对并明确区分其摘要：

1. **规范化审查输入** `evidence/T-08-review-input-round2.md#review-input`，Markdown文件SHA256 `a4cebeaf3278dab25a0903220b56f82c88c33847f55f0e1c854ca8171a8cdc8a`；其中唯一JSON对象的 **reviewInputDigest = a79ced936983d3190c3c70012a9f452d41049959bed72ecf0f67eae3c1c9a7fa**。含真实working-tree完整87路径scope及72实际标准/规范/指令来源。**本轮原报告两轴Input-SHA256必须用这个reviewInputDigest**，不能用文件SHA或下一语义包SHA。读取现有review-evidence.mjs的语义，不改工具。
2. **完整语义与证据包** `evidence/T-08-review-input-r2.json`，文件SHA256 `363054d9a93ad63497941889b71b2c47708aca272880cdec42f7b8709d307d7f`。全部A34/B15/C33/Root5共87路径、74本票变化，before是T08真实初始工作副本，after是当前固定原字节/模式；源diff1033725B、生成物diff12561423B。HEAD只作Git锚，不能把T01–07同文件旧修改归入T08。本轮相对011产品只变10路径：014三项+015五项+Root main/budget，styles/C33/依赖/锁不变。完整delta在Root integration3/reuse，不用HEAD diff替代。

读取并执行原common code-review及source-discovery/fowler-smells/risk-review/working-tree-review/reviewer-contracts/review-evidence/result-reuse；已读未变指令可复用。项目dev/ui与实际架构、测试、许可、构建、设计系统、shell、动效可访问性用于判断。Spec/implementation-contracts及DESIGN revision1 digest f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab，PAGE001/003、AC013–018/021/030/061仍为合同。所有业务运行必须显式Space；旧交互先选、后台缺配置失败的完整消费者接线由T14/T15承担，不按cwd/焦点猜。

原011报告及Root回收原件已纳入语义包，原报告SHA aad8e99dbe325e7db34cce854631e7221dcaf15e701ca49b147d8d8721396119；不覆盖原报告/原probe。009 C33和011已实际审读且输入/消费者未变的结论可按影响边界复用，必须说明覆盖与为何仍适用；最终87路径与跨owner组合由本轮给出整票两轴判断。不得只回四条修复。

修复与Root当前实际证据：

- 014 REPORT SHA5d5f5c6b55d79ce49a232f719da8efcfeca47d6edd4a451e71b3ad2d3f70679d，`/tmp/huhu-t08-helper-repair-20261026T104137Z`。F1保留ordinary fences直到editor closed/operation settled/local frames完成，相关各边重试同join，原failed-none无editorId特例保持。真实同helper三SID原cap inode暂存/恢复目标红→绿；反向output、未settled operation、callback/drain两序保护。105测试、types/lint0。10原命令与4native traces保留，12已记录PID均gone。
- 015 REPORT SHA3f1ea8a4c88addd6a04b3808b2fede19ac91f91fb6fbcf11124b492326a66fe9，`/tmp/huhu-t08-ui-repair-20261026T103743Z`。F2新prompt/raw text/raw keys开始清lastInput/result；9个none/unknown/throw及旧progress/final隔离，原操作cancel/timeout/read/continue保留receipt/target/N且不重发。F3实际compose白名单仅添agentControl，真实compose→sanitizer→view测试；F4文档failed/interrupted与冻结CLI schema一致。DOM27、app/view/sanitizer20；类型/lint0。A全局types期间B两源合法漂移已限缩，最终Root重新统一构建。共享/tmp11个test-home归属不明，未删除、未称物理清理全过。
- Root回收两候选 `T-08-root-repair-audit.json` SHA5f00d9e11ac09c02926ef4e8de952b7dc8e408bbd53d5b57ad69eb8c522b38a5，实际26命令/5144快照描述/2281去重对象、两个return0。
- Root第三次最终manifest SHA04f02602c074a528aef4053f419b6d9f1d17312900123b8a61ee96321b3cb656，2146输入/2072产品，范围外[]。`T-08-root-integration3-audit.json` SHA90b58c77ea53cef2b8a9c069e154d16e74c320a0ec4afcb65223e3799416b48d：11实际命令、2483去重对象。build:css/build（两类型）/lint/architecture/Promise/bundle/Chrome均0；明确同双bin实际3文件5native测试0，完整官方Pi输入/答案主链也已实际重跑。首native4/5失败是Root独占XDG目录0775被既有private gate拒绝fallback，只改自己目录0700后同源/bin5/5，原件保留。docs仍为另一Bot change既有6锚点。
- main6667083B SHA4d334fcc1e21ebe9d3d58086cf2c9137e374b5da71e305bd8974e02ba74de63d，比011增加90B（helper55/Panel20/compose15）；eager123533B/106inputs，agentactivation1314518B，styles1422357B。实际归因重现T08起点旧产物且匹配当前产物；预算阈值全部不变，只更新真实测量说明。
- 当前Chrome `/tmp/huhu-t08-root-ui-i3` 15/15、源码无漂移，脚本仍91cf。10原PNG与边缘/尺寸/scroll/focus校准、真正200% profile及旧裁切负例保持；Root实看wide-light/narrow-dark/zoom-200-dark-top。两Chrome/server和独占目录已清理。生产Page/Panel/TabStrip与原服务正常导入、Host/controller port有明确受控边界，另有真正compose与Controller装配测试；不是Obsidian。原条件未变的CSS/i18n/notices/native131/generated/Windows交叉按证据复用，不冒称全量重跑。

## Workspace and Scope

review_mode: working-tree；所有产品writer停止。87路径以语义包files和规范化scope为准，逐项before/after/source/mode可核。实现者codex:/root、/root/implement_t01、/root/implement_t08_business、/root/implement_t08_profile、/root/prepare_t08_full_cli；你保持完全独立。

仅可写本016的REPORT和新的`/tmp/huhu-t08-full-review-r2-*`取证文件。产品、正式状态/Evidence、旧TASK/REPORT/probe、Git/index、node_modules、Cargo target与已有bin全部只读。不重跑全仓/全native，无需重复制已有大依赖/CAS。必要可证伪probe应有完整输入、工具、argv/UTC/exit/raw及清理；原011probe复制到新路径再按真实当前入口运行，不覆盖原件。

只读Linux pair `/tmp/huhu-t08-c-stage2-linux-20261026T080715Z/huhu-pty` SHA f99ec633e2201d66ccd67605c65c709d6b25c443ec71978feff897fb27d315ca，同目录huhu SHA923ac2d6fbc4f472537c73236040a487b8d991e4226aec81d5ebda488e995eee。如用XDG隔离根须短且0700；不能放宽产品保护以修fixture。官方Pi/Jiti原件仍在/tmp/huhu-t08-b-producer-proof。不得真实账号/Vault/Provider/Obsidian操作。

## Acceptance

先标准轴再规范轴，按完整87范围/当前上下文独立给出pass或request-changes。实际确认原F1–F4与副作用已关闭；检查新join是否过早删责任/不再能释放、原none/unknown/close语义，输入receipt跨新旧操作隔离与继续wait不丢事实，真实shell状态保存与默认/history兼容，公开CLI状态名。保持011完整范围的输入身份/并发/关闭/取消/真实producer/前台核验/有界协议/分页/read/GUI焦点/设计/产物等风险审查，不假定未改消费者必然安全；复用必须实际匹配输入并声明范围。

每条finding含severity、真实项目路径/行、可达前提、可观察影响、来源/AC与满足条件；无上限，不参与修复。最终重新核对87当前路径/模式、全部规范化72来源、HEAD/index和scope；scope的excluded_paths/inventory/input_sha因新审查行政输出增长单独说明，其余字段必须相同。不是每个历史快照对象都需重复全读，重点核新增完整输入及有效复用边界；不能以工具格式pass代替语义审查。

## Return

原子、一次写入本task REPORT.md；保持Session/Task/Status（completed等有效值）和“聚焦交接”“产物与验证”“问题与下一步”三节。另为两轴分别提供可回读锚点`standards`、`specification`，各节必须有唯一字段：

Reviewer: codex:/root/review_t08_native
Axis: standards 或 specification（各自本轴）
Result: pass 或 request-changes（实际结论）
Input-SHA256: a79ced936983d3190c3c70012a9f452d41049959bed72ecf0f67eae3c1c9a7fa
Observed: 本轴实际读到的证据/观察，不能只写格式校验通过。

完整source discovery、复用判断、旧finding处置、必要probe原件、当前无漂移核验与未验证边界均可追溯。写后实际运行return结构校验并保留raw，通过原生通道通知Root。Root唯一维护状态与最终接收；不改TASK、不猜session-locator、不宣称完整Goal已完成。
