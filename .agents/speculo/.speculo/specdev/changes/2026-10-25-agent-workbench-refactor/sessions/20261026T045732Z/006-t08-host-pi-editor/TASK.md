---
schema_version: 2
session: "20261026T045732Z"
task: "006-t08-host-pi-editor"
kind: "implementation"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-08"
---

## Goal

Lead codex:/root；沿原004实施身份与用户指定gpt-6.1-sol/xhigh，负责B15的Host/helper与真实Pi扩展实现。用户授权完整18票Agent Team与代码验收；真实Obsidian/Provider/五平台由用户进行。不再派子Agent，不提交/推送/发布/归档，不操作真实库或账号。这里只交T08候选，不能自行推进正式票状态。

## Inputs

复用唯一项目根 `/home/wta/orca/workspaces/obsidian-huhu/terminal`，change `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor`。先从workspace/catalog按Map背景与Skill矩阵→dev及architecture/testing/licensing→T08→Goal§4，执行真实SpecDev I的procedure/preflight与当前TDD/coordination。已读且未变规则可复用，不递归读全部资料。GP026/Map27、HEAD33c21e098ef3188cbab5a09f3e0a01fadb787715、branch NAMEWTA/terminal；T01–07 done，T08 in_progress。

完整工程合同为evidence/T-08-engineering-packet.md、T-08-editor-transaction-decision.md、T-08-launch-identity-environment-decision.md、T-08-progress-receipt-decision.md。原002已SOURCE STOPPED并交实际shared/canonical/codec接口；以本Task派单消息绑定的Root审计与stage2输入SHA为准，实际源码是字段权威，不抄旧候选DTO。原005后A三路径最终候选与33项证据见T-08-profile-root-audit.json、T-08-profile-cleanup-root-audit.json；需要调用artifact verifier时消费实际API。

原004真实完整CLI研究已Root接受，T-08-full-cli-root-audit.json SHA f0addea9687e3224b3ad606fd4c00741cd5fd5f2785b5b3b6d653d1efb668c43；此前producer完整官方1279+16文件与MIT来源沿T-08-b-producer-proof-root-audit.json。你的004 REPORT和 `/tmp/huhu-t08-full-cli-proof-20261026T054807Z` 可复用fixture和原始观察，但strace PTY根/LD_PRELOAD/raw输入不是真正产品正例。官方原件 `/tmp/huhu-t08-b-producer-proof` 只读，所有变异复制至自己的新tmp。



冻结接缝输入：`/home/wta/orca/workspaces/obsidian-huhu/terminal/.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-08-stage2-input.json`，SHA `592f39ae5e435e4d090e0b2ebdccb2733bfde6b1977ce29ec588dabcc2a01ed3`；C阶段Root验收SHA `86a0f8723dce15f022fb5a41663433aef199c214d5686c9e9f4fb238f07a60fd`。本次REPORT唯一目标为 `/home/wta/orca/workspaces/obsidian-huhu/terminal/.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/sessions/20261026T045732Z/006-t08-host-pi-editor/REPORT.md`。

## Workspace and Scope

产品写集只限原T-08-write-allocation.json的B数组15条路径，下面列表由Root落盘时展开。C独占shared/canonical及Rust；A独占业务/launch/UI；Root独占正式工件和main.js/styles.css/budget/notices。除本REPORT和自己的新 `/tmp/huhu-t08-b-stage2-*` 外未分配路径只读。不修改package/lock/node_modules、Git index、旧证据和旧不可变bin；不跑根build/全局检查。需要改变shared接口时先报Root/C，不能用本地平行DTO绕开。

实现时以实际shared NativeConnection / NativeEditorBinding / NativeEditorSubmission和同源strict codec为准：

- Host在spawn写前捕获原lease/generation/SID enrollment；早ready、spawn拒绝、numeric exit、reload/close、迟到result/settled与helper重启都不能转发给新owner。editorBinding只返回原handle，关闭同步撤准入。原user-action FIFO与额度统一；finished unknown与真正settled分离，不在timeout返还物理占用，不自动重连/重放。普通input/reply/resize、Cookie/history和原终止fence继续活跃。
- 实现spawnEnvironment纯读端口。helper保存真正spawn helper时捕获的env冻结副本；Host核原owner/generation当前活性，合并同次overrides用C纯函数与有限上限。不得使用后来process.env，不输出环境值，Windows unverified-platform、Unix缺SHELL标记保留。普通spawn继承与账号配置保持。
- editor metadata只用C实际parse/encode，正文复用kind4与原字节预算，不手写第二JSON协议。Node编码、排队、在途、callback/drain、receipt/lifecycle各自有有限permit和准确释放；禁止未取额就分配正文编码副本。完整progress/final envelope在effects之前预量。readOnly独立于transport，纯wait取消始终none；已可信completed receipt不能在Host兜底降成unknown或丢target。
- Pi适配器在现native-extensions.ts内实现。使用C的editorEmbeddedCodecSource，惰性初始化新能力；没有cap或不受支持Pi不得因新SDK静态导入/模块初始化破坏原状态Hook和人工终端。同一个nativeSource实例UUID同时用于AdapterStart与editor-auth；不另外生成一个类似的source身份。app cap只读受保护单运行文件，purpose严格隔离，不读CLI locator/token，不把secret写日志/Hook。
- 只支持已核官方Pi/Jiti、用户现有-ne/--no-extensions（--之后不算）且只明确载入HUHU扩展的原生默认editor。提供A可消费的实际有限预检出口/安装路径事实，放在本B写集的现接缝；不要改core managed-runtime DTO，不静默加/改用户flags或关闭第三方扩展。首实际入口需可成功，不得以全部unsupported交差。标志核验按审定官方参数消费规则，选项值中的-ne/-e或--后的文本不得误判为开关；未知组合准确不支持，不能仅用args.includes补证。
- 通过真实公开widget/TUI/focus与正式SDK身份核原默认editor，保持原onSubmit和handleInput。最终gate验证当前原cap/runtime/source实例、完整体/UTF8、取消/本进程剩余期限、严格空草稿（空白也拒绝）、原焦点、无blocking/selector/login/overlay/autocomplete、确切Enter keybinding且不会命中CustomEditor更早的动作分支。正文完整bracketed paste与一次Enter在一个无await同步段，失败不清草稿、不补Enter，不直接调用模型/session.prompt API，不替换editor/onSubmit。
- 用真实官方闭包核partial paste、分片UTF8、IME/组合输入、history/jump、异步clipboard、pending人工Enter与keybinding重叠。公共事件能观察什么就精确记录什么；不声称看见未交付到终端的OS preedit或私有字段。无法支持的已知状态应准确拒绝，不以脆弱类名/鸭子类型/输出沉默补真。
- app只保留一个绑定和一笔完整事务，raw/decoded/paste/string及metadata均按单源预算记账。回执前释放本事务临时引用，处理取消/close/失联/迟到时不伪造none/settled。reload首版撤旧许可，不自动重新认证。原六Provider、材料不发Enter、完整原生回答Spool保持。



本次精确产品写集（唯一B writer）：

- `src/host/desktop/native/host.ts`
- `src/host/desktop/native/helper.ts`
- `src/host/desktop/native/host.test.ts`
- `src/host/desktop/native/helper-stream.test.ts`
- `src/host/desktop/native/helper-control.test.ts`
- `src/host/desktop/native/host-control.test.ts`
- `src/host/desktop/native/host-control.integration.test.ts`
- `src/host/desktop/native/helper-editor.test.ts`
- `src/host/desktop/native/host-editor.integration.test.ts`
- `src/shared/native/lazy-host.test.ts`
- `src/modules/agent/platform/desktop/hooks/native-extensions.ts`
- `src/modules/agent/platform/desktop/hooks/native-extensions.test.ts`
- `src/modules/agent/platform/desktop/hooks/automation-hooks.ts`
- `src/modules/agent/platform/desktop/hooks/automation-hooks.test.ts`
- `scripts/verify-pi-editor.mjs`

## Acceptance

每个高风险新接缝有实际可失败的目标red→green，保留argv/cwd/UTC/exit/raw log与前后源SHA；旧失败/filtered/skip不算通过。磁盘近期仅余8.3GiB，快照按SHA复用immutable对象；新建临时安装/进程/端口在用例结束时清理，保留原日志与必要证据，不自行删旧tmp。定向Host/helper/native-extensions/automation-hooks与实际shared lazy regression、隔离types、生产定向ESLint；根构建和全局检查由Root在writer停止后执行。

新增scripts/verify-pi-editor.mjs必须可重建官方完整CLI main/default editor/原AgentSession正例；复用loopback流式服务，正文用有界Buffer或流式TextDecoder处理跨片UTF8。正常与真实working原steer都要正例，并断言完整原生结果仍由生产Hook返回。用新临时HOME/XDG/会话、假fixture凭据和受控loopback，不触用户安装/账号。正式正例必须直接Node/root且没有LD_PRELOAD；不要放宽A profile让旧fixture通过。可在外部driver观察syscall，不能把strace变成PTY根；不得对原editor/onSubmit/Session.prompt打补丁制造正例。

C交实际不可变T08 native双bin后，运行真实helper+Host+app组合，验证auth角色隔离、queued取消零输入、dispatch未知持槽/迟到结算、阻塞app时reply/ACK/drain/另一SID/Cookie/query-stop活性。C未交bin时先完成所有独立TS/真实CLI应用gate工作，向Root报告准确待组合项；不以旧T07bin或stub冒充已支持。A的业务完整CLI→broker→Host→Session→app与UI由后继接线/Root总体验证，不擅自改A路径。

## Return

问题和进度通过原生collaboration发给/root；最终一次性写本Task目录REPORT.md，沿report-template。给实际API/消费示例、精确15路径before/after、完整收据位置、真实支持分支/拒绝边界、未验项与SOURCE STOPPED。不改TASK/其他REPORT/正式Evidence，不猜session-locator。Root验收实际接口后才向A解锁依赖接线。
