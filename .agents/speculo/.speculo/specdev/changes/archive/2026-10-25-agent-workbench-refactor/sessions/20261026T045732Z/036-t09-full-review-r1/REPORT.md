# 任务回报

Session: 20261026T045732Z
Task: 036-t09-full-review-r1
Status: completed

## 聚焦交接

**SOURCE READ ONLY。**完整 T09 固定候选的 standards 与 specification 两轴均为 **request-changes**，共两项独立 P2 正确性问题：新 owner 接缝丢失 GUI 的显式标签组；全局扫描容量达到边界后仍允许新增并保存 Pane，令后续 Pane 寻址整体失败。两项均通过自有隔离夹具调用原生产 owner 复现，第一项还以原 T09 before 字节作正对照。审查未参与实现或修复，未递归派遣；完整 57 路径、47 变化，没有缩为最后的小补丁。completed 仅表示本次独立审查已交回，不表示 T09 或任何 AC 通过；后续接收、修复、再冻结和验收归 Root。

## 产物与验证

<a id="standards"></a>
### standards 原报告

Reviewer: codex:/root/review_t10_plan
Axis: standards
Result: request-changes
Input-SHA256: 56969d866b660f49aa6b504bb8154bef8ceddb10332a0a4880119e575cd68e3f
Observed: 实际核对固定 before/after、69 项标准/规范/指令来源和完整源码语义变化；追踪原 dirty/base/latest/pending owner、Pane identity/capture、CLI/Router、生产组件及调用者。原生产类探针证实 F1 与 F2，已核实际加载字节；最终 2081 产品文件漂移为零。没有使用实施者的通过声明代替本轴判断。

#### F1 · P2 · 新 Pane 接缝丢弃既有 GUI 的显式 groupId

- **位置：** `src/modules/agent/services/workspace-service.ts:905`；下游 `src/modules/agent/services/workspace-service-panes.ts:239`。前者在已有 `groupId` 参数时只调用 `this.panes.attach(ref)`，后者固定 `openTab(view, undefined, tab)`，因此总是选择原活动组。原 before 路线在选中 Space 通过 `this.attach(session, groupId, undefined, false)` 保留目标。
- **可达序列：** 同一 Space 有左、右两个标签组，左组当前活动；向右组发起 `attachManaged(C, {groupId: right, focus:false})`，或 `createManaged({kind:'shell', spaceId, foreground:true, groupId:right})`。候选均报告附加/创建成功，但 C 的 tab 被放入左组。保留的 `before/after/groups/activeGroupId/result/spawnCount` 原输出见 R 的 `regression-after-absolute.raw.log`。两个场景的相同测试对原 T09 before 均通过（2/2、exit0），对 final 均失败（2/2、exit1）。
- **真实消费者：** `ui/tabs/TabStrip.tsx:113` 给 `NewTabMenu` 传本组 ID；`ui/create/NewTabMenu.tsx:101` 继续传给 `Omnibox`；`ui/create/Omnibox.tsx:185`、`:189`、`:190` 给前台创建传该 ID；`workspace-service.ts:778` 仍接收它。`ui/workspace/WorkspaceLayout.tsx:61` 只有 pointer-down 会先激活该组，因此鼠标常会掩盖问题；键盘 Tab 到非活动组的“新建”按钮再执行创建是源码可达的 GUI 路径。本次实际执行了原 service 路径，未冒称又跑了真实浏览器键盘场景。
- **影响与标准依据：** 已有公开参数被静默忽略，分组创建/附加发生用户未指定的布局修改；这违反既有消费者兼容与明确目标的正确性要求，不是风格建议或新增功能请求。Pane owner 统一保存方向本身合理，但适配不能丢失原调用者语义。
- **关闭条件：** 在原布局 owner 内保留并验证 GUI 的显式组目标，继续保留 CLI attach 不抢焦点、同 Session 幂等和跨 Space 原归属。增加非活动组的前台创建与 `focus:false` 附加回归；断言实际组成员、原活动/输入焦点语义、无第二 runtime。无需另建布局 writer 或修改批准设计。

#### F2 · P2 · 新增 Pane 未检查候选的全局容量，成功保存后令全部 Pane 寻址失效

- **位置：** `src/modules/agent/services/workspace-service-panes.ts:237`–`:245`，尤其 `:238` 只对新增前的 `index()` 分配 ID；`index():111` 在总叶数超过 4096 时拒绝整个扫描。`split()` 的新增候选也采用同类前置索引/局部 descriptor 路线（`:258` 起）；split 的同类风险是源码推导，本次实际反例执行的是 attach。
- **可达序列：** 原 SpaceService primary 含 4096 个唯一合法旧显示叶：5 个 Space 各 200 Tabs×4 叶，加第 6 个 Space 的 24 Tabs×4 叶；每组与树完整、每 Tab 最多 4 叶、每 Space 最多 200 Tabs、没有重复 ID。它们是受支持的旧显示记录，不需要运行 4096 个进程。当前第 7 个 Space 为空，已有一个后台受管 Session。调用 `pane.attach`，原索引在 4096 通过，然后候选新增第 4097 叶，局部 descriptor 不检查全局候选，原 owner 发布并保存。
- **实际观察：** `capacity-r2-absolute.raw.log` 中 `durableBefore={leaves:4096,maxTabs:200,maxLeavesPerTab:4}`、`durableAfter={leaves:4097,maxTabs:200,maxLeavesPerTab:4}`、`primaryWriteCount=1`。返回 `effect:completed, layoutPublished:true, persisted:true`。紧接着同 Space `list`、新 Pane `capture` 都报 `CAPACITY_EXCEEDED / pane-scan-capacity`，`close` 也返回同错误与 `effect:none`，无法通过 Pane close 将计数减回边界。primary 前后原 JSON 已保留在 R 的 `capacity-primary-before.json` / `capacity-primary-after.json`，并非只相信 receipt。
- **影响与标准依据：** 一次获准新增把可查询状态变成整个 Pane API 不可寻址状态。容量限制应该约束发布/保存前的候选；不能在已保存后才通过读取拒绝体现限制。此处不是要求放宽 4096，也不是指摘既有超限损坏数据；起点通过当前完整索引，越界由本次新增造成。
- **关闭条件：** 原 owner 在实际发布和写入之前检查本次新增后的全局活动叶容量，保留同 Space 排队、跨 Space 最新已发布视图和幂等 no-op；容量拒绝为 none、零新增/零保存，原 4096 叶仍能查询。边界测试至少覆盖最后一个合法新增、再新增拒绝、已有 Session 重复 attach，以及 split 新增；不要靠放宽后续扫描或另建第二索引掩盖准入缺口。

除此两项，本轴未发现足以要求修改的独立问题。已区分实现缺陷与测试装配历史：两默认 DOM 设备导入失败已由 035 修好；直接 eslint 指定被忽略测试文件的 exit1 不是新的生产 lint 失败。复杂 owner 的无副作用查询、已确认保存/焦点事实保留、延迟取消和原 runtime 捕获均有真实接缝实现与针对性测试，不把这些合理工程选择列为 finding。

<a id="specification"></a>
### specification 原报告

Reviewer: codex:/root/review_t10_plan
Axis: specification
Result: request-changes
Input-SHA256: 56969d866b660f49aa6b504bb8154bef8ceddb10332a0a4880119e575cd68e3f
Observed: 按 Spec AC-009、本票 AC-061、T09 Ticket、工程 Packet 与已批准 DESIGN revision1 / PAGE-001、PAGE-003 核对整个候选。两项产品问题沿用 F1/F2 编号，以下分别给出规范判断，不把同一缺陷重复算成四项。后继 T10–18 未实现能力与用户负责的真实 E2E 未运行均不作为 T09 缺陷。

#### F1 · P2 · 显式组目标回归违反“复用并保留原分组/键盘能力”

- **代码位置：** `src/modules/agent/services/workspace-service.ts:905`，`src/modules/agent/services/workspace-service-panes.ts:239`；调用者 `src/modules/agent/ui/create/Omnibox.tsx:185`。
- **规范依据：** T09 Ticket `#scope` 的 REUSE 既有 tabs/groups/shortcuts，`#route` 的保留分组快捷键；DESIGN §3 明确生产需保留现有分组及快捷键，不能以原型简化为由删除；工程 Packet 的 pane.attach 合同明确“GUI既有显式定位行为保持”。AC-009 要求目标稳定和双方布局一致。
- **触发与影响：** 左组活动、右组被显式指定时，附加与前台创建都错误进入左组；固定 before 2/2 通过而 final 2/2 失败，证据与 standards F1 相同。用户的布局目标被替换，常规鼠标先激活组的路径并不能覆盖该合同。
- **关闭条件：** 原 owner 接缝完整传递组目标，原非活动组前台/后台显示回归通过，保持原焦点许可与单 runtime；再按受影响 UI 消费者验证键盘入口。无需产品新决定或重做 DESIGN。

#### F2 · P2 · 容量准入后破坏可查询性，不能满足本票双向 Pane 合同

- **代码位置：** `src/modules/agent/services/workspace-service-panes.ts:238`、`:245`、`:111`。
- **规范依据：** 工程 Packet §身份/索引要求在有界预算内核对活动索引并准确报告 capacity/ambiguous/unaddressable，§验证要求真实容量边界；T09 Ticket AC-009 与六操作路线要求 GUI/CLI 查询和布局同真值。4096 是本实现既定扫描上限，审查没有新增产品配额。
- **触发与影响：** 合法起点已有 4096 显示叶，attach 获准保存第 4097 叶；实际 primary 增加一次写入，随后 list/capture/close 全部无法使用，详细原事实见 standards F2 与 `capacity-r2-absolute.raw.log`。这使本票刚完成的命令在成功后留下自身无法查询和关闭的状态。
- **关闭条件：** 候选发布/保存前准确 capacity 拒绝，原图保持可列举；以真实原 owner 边界回归证明最后合法新增、超额拒绝、幂等附加与 split，而不是以增强后续读取容忍度代替准入。

其余核对：稳定 opaque/legacy Pane ID 与 Unicode 边界、查询不物化、关闭 detach/重开新 ID、明确第三 Session 分屏、最近父 second 比例反向、原代捕获、真实 consumed 焦点、CLI 显式目标与完整 envelope、GUI 目标焦点分离、宽窄仅投影及 200% 基本可操作性均有相应实现和局部代码验收证据。本轴没有把批准原型 fixture 当生产证明，也没有把受控 Chrome 当真实 Obsidian/Provider。

<a id="review-evidence"></a>
### 固定范围与实际证据

证据根 **R**：`/tmp/huhu-t09-full-review-r1-1nw01eac`。本次唯一正式仓库产物是本 036 REPORT；产品、规范、正式状态、其他报告与原证据均只读，未提交、推送、发版、安装依赖或运行真实 Vault/账号/Provider/Obsidian。未继续原 033 T10 咨询。

1. **固定输入。** TASK SHA256 `d0637155bebbe1156bf5fae97b01dd3abfa5ea06d4d32ab95778c347e39fb5ed`；权威 `T-09-review-input-round1-final.md` 文件 SHA `35000ead78ab653a60c1d2aeca8b173d8d64a490128db74dc7e72b6b44cee0a9`。实际 JSON parse/stringify 的唯一 Input-SHA 是两轴所列 `56969d…e3f`，不是文件 SHA。语义包 SHA `cba59899a76f1c1b2b87bb5501d9bd744361690e88b90c8e2a8b89a1ffacca82`；完整 final manifest SHA `5b5ad8baa7b79c8aefd7d0dc416a4fac0a894e07aea0286cce295c624ed004f4`。69 个 source locator 按原工具 `readArtifactSectionSync` 处理锚点后全部匹配，`canonical-sources-check.json` failures=[]。
2. **真实范围。** 语义 before 是已含 T01–08 的原 T09 工作副本，after 为最终停源候选；HEAD/branch 仅来源标识 `33c21e098ef3188cbab5a09f3e0a01fadb787715` / `NAMEWTA/terminal`。57 路径逐个 before/after/CAS SHA 核验、47 变化，写集外最终 2081 产品文件比较漂移=[]。原 scope 命令实际复跑 exit0：working_snapshot、observed_head、base_sha 与 diff 字段一致；仅 excluded_paths/inventory/input 摘要因新增被排除的审查行政材料不同，未把重跑结果改充本次 canonical Input。原输出 `scope-recheck.raw.json`、`initial-checks.json`；收尾 `final-source-check.json`。
3. **阅读范围。** 完整读取所有非压缩的生产源码语义变化及新增/改变测试、CLI/help/docs、schema 实质字段变化和 fixture；对生成 TS/Rust 同步生成合同、主 main/styles 原字节与真实 build/归因闭包审查。额外追踪固定 manifest 中原 `TerminalSessions`、terminal layout、ForegroundIntent、SpaceService、NewTabMenu、Omnibox 消费者，原 hash/本地副本见 `additional-sources.json`。57 路径清单及前后描述见 `coverage.json`；未变化的分配测试/侧栏/分页为原消费者和范围基线，不冒称它们是本票新改动。
4. **标准与规范。** 复用已实际读取的 AGENTS/bootstrap/runtime、dev/ui 和适用 architecture/testing/licensing/build、UI design-system/shell/motion；本次实际按 code-review 的 source-discovery/Fowler/risk/reviewer-contracts/review-evidence/working-tree-review，以及注释、错误处理、测试可靠性规则审视。规范为冻结 Spec/implementation-contracts/ADR/CONTEXT、Ticket、Packet、DESIGN 与批准原型映射；复用固定开源研究和来源记录，没有新增外来代码或新依赖。没有因通读目录自动激活另一 Workflow。

### 本次实际反例执行与消费闭包

最终采用绝对 `/home/wta/.volta/tools/image/node/26.11.1/bin/node node_modules/vitest/vitest.mjs run --config R/<config>`；每次真实 argv、cwd、UTC、退出码、Node SHA、stdout SHA 在对应 `.receipt.json`。正常 imports 使用原 SpaceService、SpaceWorkspaceStore、WorkspaceService、TerminalSessions 与 NativeHost，边界是 Map TextStorage、目录/lease 与受控 native transport；未启动 shell/helper/Provider 进程。生产错误路径没有被 mock 掉。

| 探针 | 实际配置/输入 | 实际结果 | 原输出 SHA256 |
| --- | --- | --- | --- |
| 原 before 正对照 | `regression.config.mjs` / `HUHU_REVIEW_VERSION=before`，只读 loader 在原模块路径消费固定 before 字节；其他依赖与 final 相同 | 2/2 passed，exit0 | `53bc19a8709eefb1a39308d9d0e2450489bd2f13ede16fe283487099608806f5` |
| final 分组反例 | 相同 `regression-probe.test.ts` / after | 2/2 failed，exit1，真实附加与前台创建均进错组 | `dccce7a146cfb5f0ce21a15adec18a601fb4ab0773cf0a6f2abdce00435072cb` |
| final 容量反例 | `capacity-r2.config.mjs` / `capacity-r2-probe.test.ts` | 1 failed，exit1；已持久化 4097，随后 list/capture/close capacity | `f35dc08ea725d50133e0d884d81527580974f330ea52ab1151ff550bb23baedd` |

前后对照不是复制/重写算法，而是在原模块路径由只读 loader 选取原冻结源码。Vite 实际 transform 加载账本核到 before 74 个唯一仓库源、after 76 个；各自和对应 before/final manifest 全部匹配。原 native/device 边界保持相同；这不是全系统工具/依赖追踪。最终探针 TMPDIR 限定 R/runtime-tmp，沿原 isolate-home 防止真实 HOME/Provider 配置访问；测试 finally dispose 原 owner。早期 `node` 包装器把失败映射为 126 的原件和第一版 probe 保留，不用其退出码代替最终绝对 Node 的 0/1 结果。容量 primary 字节以最终绝对 Node 运行生成的两文件为准，SHA 见 `evidence-index.json`。

### 复核已有代码验收及界限

- 实际回读并验 hash 的 Root integration1 build/lint/architecture/i18n/css/notices/shortcuts 输出均 exit0；integration2 默认 DOM **30 文件/312 测试**、types/budget/styles/Promise/helper/Chrome 均 exit0。命令与原输出 hash 的本次核验索引是 `root-command-receipts-verified.json`。没有机械重跑整仓，也没有把这些通过结果解释为覆盖本次两个缺失场景。
- integration1 DOM 原 exit1 为两套件装配错误，其余 28/303；035 只补设备端口 mock，最终默认配置已绿。031 临时 alias 的 8/90 不是默认组通过。两测试显式 eslint exit1 原因是既有 ignore 的 2 警告；全局 lint 的输入闭包未变。docs 的 exit1 为另一个 Bot change 六处既有断链，本审查未扩域修复。
- A 原 stopped 115、B 195 与 A 最终后针对性 31、Rust 顶层 147、新 Linux immutable pair 与 WindowsGNU compile 的范围，按原 REPORT/Root audit 逐项区分；不将重叠数字相加为唯一测试总数，不把 Windows 编译冒称运行。B 实际 CLI→Rust broker→原 TS owner/PTY 的无 renderer focus 返回 partial 是准确边界，不是完整输入焦点成功；真实 consumed 另由原 DOM 叶路径覆盖。
- main.js `904c9d84bf2e8e85894d3be269174b6a785dbf8ee1f342609a9d7048f82d0a6b`，6,702,773B；styles.css `3e52380b388e0be38d69b547311bc8241dad983244811b06ade7fb768946c568`，1,422,696B。真实归因 before/after 产物匹配，main +32,800B、Agent 激活 +24,286B；106 项 eager 输入集合未变，字节 +13 属重新压缩归因。预算增量有 Root 原归因和实际门，不当作隐藏失败或新增 eager 激活。
- 本次只读视觉检查了 Root 已有 `viewport-390.png`、`wide-control-dark.png`、`zoom-200-dark-bottom.png`，并读完整受控 Chrome 脚本及实际输出：容器窄屏投影、常驻关闭入口、控制 Dialog 焦点返回、200% 页面缩放均有局部证据。截图 hash 记录在 `evidence-index.json`。没有本次启动共享 Chrome/native；截图不是本 reviewer 新生成。

本报告无覆盖原子落盘、回读后，实际执行 `validate-dispatch --stage return`；原 stdout/stderr、真实 exit、argv/UTC、TASK 与 REPORT SHA 分别保存为 R 的 `return-validation.raw.json`、`return-validation.stderr.log`、`return-validation.receipt.json`。此结构校验不认证产品正确性或 Root 接收，本文不预填尚未发生的执行结果。

## 问题与下一步

Root 可将 F1/F2 一次交原布局 owner 窄修：保持原单 writer 与批准行为，不修改本报告/原反例来制造通过；完成后重新冻结真实候选，按影响闭包重验，并派独立两轴复核。无需用户再决定组语义或容量失败语义。当前结论 request-changes，不能据此将 T09 标完成。

未验证：真实 Obsidian 主窗/专注叶、真实 Provider/账号、OS IME、辅助技术及五平台宿主 E2E，仍按用户明确分工留给用户；本次不将它们升级为未授权实机访问或新的审批要求。T10–18 的后续实现、正式状态、归档/提交/发布均未触碰。**SOURCE READ ONLY。**
