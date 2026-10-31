# 任务回报

Session: 20261026T045732Z
Task: 011-t08-full-review
Status: completed

## 聚焦交接

已完成最终 A32/B15/C33/Root5 的完整 T08 独立审查，按 standards、specification 顺序分别返回 **request-changes**。共 4 个不同问题：3 个中等严重度、1 个低严重度；两个轴引用同一问题不重复计数。独立审查者为 `codex:/root/review_t08_native`，沿用户指定的 `gpt-6-astra/high` 原生 Agent 身份，未参与任何候选实现，也未修复产品或递归派遣。009 的 C33 局部结论仅在匹配的输入和语义部分复用；此次另审了最终 A/B/Root 与跨 owner 调用链，不能用旧 C33 pass 或现有绿色测试替代本次两轴结果。下一步由 Root 协调修复和必要复审，本报告的 completed 只表示审查交回，不表示 T08 验收完成。

## 产物与验证

### 固定范围、身份与来源发现

- `review_mode: working-tree`；唯一输入为 `evidence/T-08-review-input.json`，SHA256 `67522a2ee5d8579aca8469511d6529d6425b40fd6cd265db784e7900a9c0cf26`。路径均相对于 change `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor`，除非明确写仓库路径或绝对路径。
- 实际比较基线是 T08 初始工作副本，已包含 T01–T07；基线 dispatch SHA `7b2096e05c302df7519f8a80e13925399f19fb7071e2b3420884e65239ad2137`。HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`、branch `NAMEWTA/terminal` 仅是来源，不把 HEAD 到当前的全部差异算成 T08。精确 85 路径及 before/after 字节和模式见输入 `files`，72 路径变化。
- 语义 diff 为 1,013,137 B、SHA `6f1054424872a53a1105fb876b1b2edebab9683e84fcde0266293d7b73b542fb`；生成物 diff 为 12,561,333 B、SHA `7d3d16712333c9c1783adfcc589db200e8e8762a8fa1fdb51a8f138bc0f3e478`。重建比较确认两者，不只信配对 SHA。未以压缩 main.js 的文本代替源码审查。
- 真实实现者是 `codex:/root`、`/root/implement_t01`、`/root/implement_t08_business`、`/root/implement_t08_profile`、`/root/prepare_t08_full_cli`。本 reviewer 均不是上述实现者；原生派遣来自 Root 的 011 TASK/消息，dispatch 的原始凭据由 Root 保存。本 reviewer 仅写本 REPORT 与新 `/tmp/huhu-t08-full-review-astra/`，未推进 Ticket/Goal/Evidence、提交、推送或发布。
- 按 workspace/catalog 定位既有 SpecDev 入口，实际采用 `common/skills/code-review/SKILL.md` 的 source-discovery、fowler-smells、risk-review、working-tree-review、reviewer-contracts、review-evidence、result-reuse，以及 error-handling/test-reliability。已读未变规则复用；新增适用规则实际读取。
- 标准来源按输入原顺序：仓库 `AGENTS.md`；dev Skill 及 architecture/testing/licensing/build-and-release；ui Skill 及 design-system/shell/motion-a11y。Fowler 是辅助启发式，以下发现为具体正确性/合同问题，不是纯格式或个人风格建议。
- 规范来源按输入原顺序核对：spec、implementation-contracts、Map28、GP027、T08、DESIGN revision1（digest `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab`）、UI-001 设计/批准/原型，T08 Evidence、engineering packet、editor transaction、launch identity/environment、progress receipt、blocking observation 决定。规范存在且没有跳过规范轴。最新 Space 显式绑定选择优先；T14/T15 的旧消费者完整改造不扩成本票缺陷。
- 复用边界：C33 after 原字节全部与 009 相同，共同标准、核心规范和 native 决定匹配；因此复用原 native/shared 局部分析。最终 A/B/Root、其消费者、UI/构建新增规则以及变化的 Ticket/Map/Goal 不满足整轴等价，均另行审查。尤其 F1 属最终 B helper 与 C 生命周期的接缝，009 从未给 B 完整 pass。B035 的 pre-enrollment failed-none 修复实际已在冻结输入内，未把过时“正修”说明误报为尚未实现。

### standards：request-changes

#### F1 — medium / P2：普通最终栅栏先到时，迟到的 editor-closed 无法回收 binding

**位置：**仓库 `src/host/desktop/native/helper.ts:1106` 的 `retireSession`，特别是 1115–1132；配合 `finishEditorClose:406` 和 `editorMessage:422–427`。

**可达前提与行为：**同一 helper 已有一个 native editor allocation；数字 exit、reply-settled、confirmed termination 及输出清空先满足，而 editor 的实际关闭/清理后完成。`retireSession` 此时先删除普通最终栅栏状态，仅在 editor 当时已经 closed 时删 `editors`。后到 `editor-closed` 只标记 closed 并完成 close Promise；`finishEditorClose` 没有移除 binding，也不会保留足够的普通退休状态来完成后续 join。于是即使 `binding.closed` 和 `binding.close()` 均完成、操作数为 0，`helper.editorBinding(sid)` 仍返回原已关闭对象。长寿命共享 helper 反复结束此类 SID 会持续保留对象及 launch/registration 等引用。

这不是仅推测网络乱序：native `session.rs` 的普通终止发布与独立 `editor_done` 收束分开；`editor.rs` 在能力文件实际清理后才发 closed。隔离 probe 用真实生产 `PtyHelper` 和冻结 Linux native bin，通过暂时替换能力文件 inode、随后恢复原 inode，强制这条真实清理顺序；实际观测到 reply-settled 在 editor-closed 前、最后 binding 仍保留。probe 没有声明官方 Pi 已认证或模型交互，所验证的是 native allocation/Host 生命周期，且不等于 B035 的没有 native editorId 的 pre-enrollment failure。

**标准依据：**dev 生命周期/资源归属、error-handling 的终态真实收束，以及 risk-review 的取消/恢复/有界资源检查；这是一处不同终态分支没有会合的正确性缺陷。

**满足条件：**两种到达顺序都能在所有真实栅栏满足后最终移除 binding；同时覆盖迟到 app 结果、未完成 operation/frame，不能为了删 map 而提前释放仍在使用的物理资源。针对普通栅栏先到和 editor 先到的回归应检查最终对象回收及在途保护。原件见下方 probe E1。

#### F2 — medium / P2：新输入失败仍显示上一笔输入已确认

**位置：**`src/modules/agent/ui/control/TerminalControlPanel.tsx:147–150`、185–186、474–478。

**可达前提与行为：**同一目标第一次提交成功，页面保留 receipt；用户修改正文后再次提交，而第二次返回 `INPUT_NOT_READY`、effect none、没有 receipt。新输入分支只清 continuation/canContinue/initialWorking；结束时也仅在 `next.receipt` 存在才更新 `lastInput`。页面于是将第二次错误和“输入已确认完成，不代表模型任务成功。”同时呈现，没有说明确认来自旧操作。正常导入生产 Panel 的 DOM probe 实际得到 calls=2、第二次拒绝和旧确认同屏，断言失败。发起新输入时旧 result 同样没有重置，还可能显示上一笔 matched；主要 finding 以已实测的旧输入确认为据。

**标准依据：**UI 状态必须对应当前交互、失败不可被旧成功状态掩盖；dev 错误语义和 ui 可理解状态反馈。这里只应保留同一操作的可信回执，不能把保留跨成下一次新输入的确认。

**满足条件：**新输入启动时建立新操作状态，旧回执清除或明确带原操作身份呈现；新请求 none/unknown/throw 均不显示为本次确认。同一操作的后续等待取消、超时、继续等和被动读屏仍须保留其真实已完成输入，不因这个修复倒退。原件见 E2。

#### F3 — medium / P2：新增 agentControl 状态没有接入真实 shell 保存白名单

**位置：**新增消费者输出 `src/modules/agent/ui/AgentWorkspacePage.tsx:493` 和恢复 `src/modules/agent/services/workspace-view.ts:9`；实际未变调用方 `src/app/workbench/compose-workbench.ts:84`、`src/shell/host/workbench-pages.ts:37`、`src/shell/navigation-state.ts:79`。

**可达前提与行为：**用户关闭控制工具后保存页面，再销毁/重建页面。Page 输出 `agentControl:false`，但贡献的 `stateKeys` 仍只有 `agentHistory` 和 `agentHistoryWidth`；shell 的 `cleanPageState` 会过滤该字段。恢复值缺失，view 又按默认 true 展开。因此直接测试 `createWorkspaceView({agentControl:false})` 会绿，真实保存接缝却不能恢复关闭选择。probe 使用生产 sanitizer/view，读取实际 compose 的字面白名单，确认 before=false → serialized 无 agentControl → restored=true；它不是整套 Obsidian 重启测试。

**标准依据：**dev 公共消费者追踪与 ui shell 状态归属；新字段应穿过真实序列化边界，不能只在字段两端各自工作。上述范围外消费者原件均与 final_manifest 匹配，没有以活源未知版本推断。

**满足条件：**真实 shell 保存/恢复路径能保留用户关闭选择，初次无保存状态仍按设计展开；回归同时验证关闭后的恢复和首次默认值。由 Root 安排相应 owner 的最小接缝修复，不由 reviewer 改白名单。原件见 E3。

#### F4 — low / P3：CLI 文档列出了协议不接受的等待状态

**位置：**`docs/agent-workbench-cli.md:54`；权威 `src/shared/native/control-schema.json:589`。

**可达前提与行为：**用户按新增文档使用 `error` 或 `cancelled` 作为等待状态。文档这样列举，但 canonical enum 实际为 `failed` 和 `interrupted`，当前 CLI/协议没有对应别名。按文档传入会被参数验证拒绝，不能等待到目标状态。

**标准依据：**dev 源码与用户文档一致性；错误值已由静态端到端参数路径确定，不属于尚未实现的后继文档票。

**满足条件：**本行使用真实 canonical 接受的名字，并明确输入操作/观察取消与原生活动 interrupted 的区别；文档例子和正式解析应一致。此项单独不表示安全故障，未另跑账号或 Provider 测试。

### specification：request-changes

本轴按同一固定输入独立对照合同，不以 standards 结论代替推导；以下仍是上述 4 个不同问题。

| Finding / severity | 规范依据 | 规范上的缺口与满足条件 |
| --- | --- | --- |
| F1 / medium P2 | spec NFR-001（缓存有限容量）、NFR-002（关闭与残留可核对），editor-transaction 的物理资源收束；路径 helper.ts:1106/406 | 普通终态先到、editor 后关闭时，所有实际资源已经收束而 helper 的旧 binding 永久保留。E1 证明可达次序及最终状态；应在完整 join 后删除，且保留在途责任直到真实结束。既不能无界保留，也不能把逻辑取消当物理完成。 |
| F2 / medium P2 | AC-013 的本次输入阶段信息、NFR-006 的 UI/输入完成/业务成功分离、DESIGN PAGE-003 的 input-submitted/失败状态；Panel:147/186/476 | 第二笔明确 none 仍展示第一笔“输入已确认”没有操作身份，破坏当前操作效果可核对。E2 为正常生产 Panel 的真实反例；新输入应重置或明确区分历史回执，同时继续等待原操作时保留原可信 completed receipt。 |
| F3 / medium P2 | DESIGN §2 第32行：“可关闭，继续沿用用户当前布局，不要求每次打开强制展开”；Page:493 与 compose:84 | 关闭值被实际 shell 保存白名单删除，重建强制回到展开。E3 确认接缝；通过真实保存/恢复保留 false，并仍保留首次默认展开。不是要求 T14/T15 的无关旧消费者改造。 |
| F4 / low P3 | T08 对已交付 CLI 使用说明的一致性、共享 canonical 合同；docs:54 与 schema:589 | 新文档承诺 error/cancelled 可等待，但协议只接受 failed/interrupted。修正文档真实可用值即可，不要求扩大本票协议或增加别名。 |

### 完整组合覆盖与没有新增 finding 的检查面

| 检查面 | 实际追踪与结论边界 |
| --- | --- |
| 身份、Space 与启动 | 从 controller/commands/router 经 sessions、session、program-identity 到 Host/helper/native，核对捕获目标、runtime/source、原 helper 代、lease、最后效果前验证。最终 env/argv/cwd、Node/entry inode、Pi/Jiti 全文件闭包和实际安装扩展一致；prepare 原期限/取消与逻辑观察结束分离。未发现超出上述 findings 的新错误。unsupported 保留人工启动，不放宽协作资格。 |
| 应用安全提交 | 回读实际生产扩展、原 regular TUI/默认 editor 同步 gate、stdin/paste 观察及 B 的分片 paste、login/settings 拒绝证据。draft、selector、streaming、历史跳转、外部 editor/clipboard 和不明确状态按保守路径处理；没有将 raw PTY 写入当 adapter-applied。完整官方 CLI/原 Pi 答案证据另见下方受控边界。 |
| writer、资源、取消 | 沿同一 writer 的 queued none/dispatch unknown、app result、settled、local frame/worker、output/root fence、reply/ACK/其他 SID 活性逐层核对，复用相同 C33 的原分析并重审 B/C 接缝；新增 F1。没有以 timer Promise 结束替代 OS 物理完成。 |
| 等待与屏幕 | 原活动水位、首期限、continue、32观察额度与副作用队列隔离；read envelope/delta 上界、partial/unknown；可信 completed receipt 与 target 不被后续等待错误降级；同 socket Ctrl-C 尾随不重连、不重发。服务层未新增 finding，UI 新操作归属是 F2。 |
| UI 与实际 shell | Page/TabStrip/Panel/view 正常生产路径，当前 Space 默认、手选目标、重名稳定ID、显式跨Space、重启/source变化使选择失效、取消/继续/定位/停止确认、ownerDocument 单实例与焦点回收。真实 shell 序列化消费者发现 F3。宽窄/明暗/200% 原图和 Chrome 测量核对的是明确受控边界，不冒称 Obsidian 实机。 |
| 公共契约与生成物 | canonical/generated TS/Rust/embedded、CLI/client/broker、公开 host/input 类型与 fixture；生成代码/生成来源一致。i18n en/zh、模块入口、动态导入、许可/notices及预算归因逐项核对；文档名字有 F4。 |
| Root 整合 | main/styles 与源码、真实旧源预算复现及新 main 对应，未把 T01–07 成本归 T08。Root 唯一 cancellation test alias 修复与 DEV-T08-001 顺序偏差如实保留，不因结构校验成功掩盖。 |

以上是适用风险的审查覆盖，不声称穷尽所有可能运行时调度或未运行平台。

### 原始验证与 probe

已有证据的完整路径/SHA/argv 均可经输入 `evidence_sources` 及递归对象回读；此次没有无变化理由地重跑全仓或全 native 测试。

- A 最终 19 文件284项、profile33；B131；C122/native顶层131。Root 明确双 bin 的最终 3 文件4项 native integration 为 exit0，补上 B051 历史 receipt 没有单独保存继承 bin 环境的证据边界；没有追补或改写历史 B051。
- Root 真实完整官方 CLI → production Host/helper → 原 Pi 主链，保留完整模型响应断言；`/tmp/huhu-t08-a-stage2-native-y3nffn` 的 summary actualModelConversation/nativeFullAnswer/businessPath/passed 为 true、failures[]。这是官方完整程序与受控 loopback SSE Provider，不是真实账号/远端 Provider 验收。
- Root build/types、lint、CSS、i18n、bundle budget、notices、promise 检查为0；architecture 首次与临时 Promise fixture 相撞后串行0（1243 modules）。docs 仍为其他 Bot change 原有6个锚点失败，未归给本票。Windows GNU 仅交叉编译0并有 dead-code warning，不是 Windows 运行验收。
- 预算原件与产物核对：main 6,666,993 B；styles 1,422,357 B；eager 123,518 B/106 inputs（旧123,531 B）；agent activation 1,314,518 B。以真实旧源复现和最小 KiB 阈值调整，其他模块限制和禁止 eager 规则没有放松。
- 完整回读010及 Root 最终 Chrome15/15 原始摘要/几何/校准/cleanup，脚本 SHA `91cf2578ddc588c530ff7866b835d5b395ffe75e5eaf7dc43b5b29a3d12db05b`。实际宽312外aside、311内section加1边框；窄屏等待真实动画结束后44；真实浏览器200%重排、Enter/Tab/Escape及被动读屏。此次亲自查看 `/tmp/huhu-t08-root-ui-r2/wide-light.png`、`narrow-dark.png`、`zoom-200-light-bottom.png` 三张原图。分段截图不代替全键盘路径，受控 Host/controller port 不等于真实 Obsidian；旧12/14与裁切负例保留。

新 probe 的所有源码、build 输入 manifest、argv/cwd/UTC/exit/stdout/stderr 在 `/tmp/huhu-t08-full-review-astra/`，索引 `evidence-index.json` SHA `1f191c93db3bf5e168a53dfee8d3017e32380aa7a9353232f86387e6d444c385`。索引只声称原件完整性，不声称每一个递归字节都作语义阅读。

| 编号 | 输入、执行与真实结果 |
| --- | --- |
| E1 | `late-close.ts`、`build-late-close.mjs`、`late-close-inputs.json`、`late-close.mjs`；执行 `node /tmp/huhu-t08-full-review-astra/late-close.mjs`，2026-10-26T10:14:19.712802Z，exit0。真实 native bin `/tmp/huhu-t08-c-stage2-linux-20261026T080715Z/huhu-pty` SHA `f99ec633e2201d66ccd67605c65c709d6b25c443ec71978feff897fb27d315ca`。`run-late-close.stdout` SHA `4a3833f6db1cc458776627ae30ff55d1dcdf804b811a8991c0fb4eaaa0578226` 显示先 ordinary fences 后 editor-closed，最终 sameBinding=true、active=false、operations=0。exit0 是 probe 成功采到缺陷，不是产品 pass。真实 app 仅为受控 Node 生命周期夹具。 |
| E2 | `panel-receipt.dom.test.tsx`、`probe-vitest.config.mjs`；`node node_modules/vitest/vitest.mjs run --config /tmp/huhu-t08-full-review-astra/probe-vitest.config.mjs --configLoader runner`，2026-10-26T10:16:09.741781Z。正常导入生产 Panel/HuhuProviders，controller 边界受控。`panel-probe-r4.stdout` SHA `3725d309c871305c8adc31a457c6ec59e8b412d9e96de1db6a8f20e819011e2b`；stderr SHA `88630135506bd374d5f2706ecd247b526dee61f459ded8f4f33d757be6d40977`，真实 Vitest 1 test failed，工具返回 exit126。r1–r3 是别名/JSX依赖解析准备失败，未执行行为断言，原件与各版本 config 均保留，不能当产品 red。r4 才是上述行为反例。 |
| E3 | `layout-state.ts`、build脚本、`layout-state-inputs.json`；`node /tmp/huhu-t08-full-review-astra/layout-state.mjs`，2026-10-26T10:17:57.011140Z。生产 cleanPageState/createWorkspaceView + 从真实 compose 读取的字面 stateKeys；stdout SHA `091b785e0f2be1993ca38a42c01e40c293372b3883a72299cedde50ef86c0580`，before=false/restored=true。脚本设失败退出码，工具返回126；不将其误报为权限拦截。`extra-consumers.json` 核对三份未变生产消费者与固定 final_manifest。 |

E1 finally 恢复原 capability inode、等待 helper.dispose；最终 `/proc/288017` 已不存在，runtime 只留 `entry.cjs`/`cap-path` 证据文件，没有残留 capability。E2 是隔离临时 config/cache/测试 HOME，未改 node_modules；E3 没有进程/账号副作用。新 probe 没有真实 Vault、Obsidian 或 Provider 操作。

### 最终无漂移核验

输入205份直接描述原件最初全部匹配；递归校验19725个不同 snapshot 路径记录（各证据目录可能保存相同 SHA，不能称为19725个去重内容对象），校验累计引用字节16,661,985,590。`audited-objects.json` 与 `audit-result-r2.json` 保存结果。第一次 diff 重建误用了新文件的 `a/path` 头，正确 canonical 是 `/dev/null`；修正后语义 diff 精确匹配。第一份审计和差异原件保留，不隐藏这个审查脚本错误；raw `.git/index` SHA 与 scope 的 `git ls-files --stage -z` SHA 是不同指标，修正版分别核对。

最终按输入原封 `git_scope_command` 实跑，2026-10-26T10:24:07.394300Z–10:24:08.719583Z，exit0。`final-scope.stdout` SHA `46951302e1f7119e709d7391835bea856d53cc2dcd1361f6ace74cdcdb4bc320`；`final-audit.json` SHA `44f45e73408ab584eb3d36178811ec3b81bfe0c26127170aef832ff9a82d54eb`，errors[]。85活源字节/模式、28标准与规范、固定输入、HEAD、working_snapshot/scope_paths/base_sha/index_sha256/tracked_diff_sha256 均匹配。逻辑 index SHA `10a283748f5edff250e8b5af2378b1c3d898beaf650c92826a5885b282a8ead1`，原始 index SHA `0dc36455cc312a56435427ec186162d50fc70f38520757b7eeab33d46187eacd` 也保持不变。

excluded_paths 从34570到34593，多23项，仅为本次冻结输入/对象/派遣记录及012/013只读准备 TASK 等行政资料；完整新增清单在 final-audit，不能把这种范围外增长当成产品漂移。REPORT自身落盘后亦属授权行政输出。return结构校验将在本原子报告落盘后执行，实际 argv/exit/raw 输出另存同一新证据目录并由原生通道回传；结构校验不改变两轴结论。

未验证边界：真实 Obsidian、真实远端 Provider/账号、OS IME 与五平台实机均仍由用户验收；Windows 只有编译证据。此审查没有承诺完整18票 Goal 完成，也没有把先前 slice 或受控浏览器提升为上述实机验收。

## 问题与下一步

候选需处理 F1–F4；其中 F1–F3 是本次 request-changes 的实质阻塞，F4 是本票新增用户说明的低严重度一致性问题。Root 应先保持审查原件与失败回执，按真实 owner 协调最小修复，记录新的固定输入，并由未参与修复的审查者核对改变的轴/接缝和上述满足条件。没有要求现在重跑所有已有效的绿色检查；根据实际修复影响选择验证，并继续保留真实平台验收边界。本 reviewer 没有实施修复，T08 状态与正式 Evidence 的维护权仍在 Root。
