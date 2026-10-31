# 独立最终审查：Space／工作台／历史／继续／浏览器

Session: 20261029T021146Z  
Task: 002-final-workbench  
Status: completed

Reviewer: 原生子 Agent `/root/review_workbench`，实际模型 `gpt-6-astra/high`。此前实现者为旧 Codex／Claude、其实现子 Agent 与用户提交；本 reviewer 未参与该范围实现、修复或冲突解决，未递归派遣。`completed` 仅表示本报告交回。

Input-SHA256: `39f060d78d5d3ff466dd833bd2925fff76c69b2adb011c3985c4f6dcc5bc0193`（`sha256(JSON.stringify(JSON.parse(review-input.json)))`，不是磁盘格式字节摘要或 `scope.input_sha256`）。  
Observed: branch `NAMEWTA/terminal`，HEAD `78102da2811953e72fe317cd08cd91311d9cac0d`，base `33c21e098ef3188cbab5a09f3e0a01fadb787715`。入口与报告前均核验 447 项 working_snapshot 的当前文件摘要，0 漂移；9 项来源摘要，0 漂移。该范围是最初基线至当前候选，不是最后一票的差异。历史 123 审查中断，未复用为通过。

## 一、标准轴：request-changes

采用公共 code-review Skill，回读 source-discovery、Fowler baseline、risk-review、reviewer-contracts、working-tree-review、review-evidence，以及 error-handling/test-reliability 风险参考。已发现并读取根 AGENTS/CLAUDE、dev/ui 规则及相关测试、架构、无障碍参考。以下均为具体行为或合同问题，不把格式、偏好或 Fowler 启发式单独升级为缺陷。

### WB-S01 — high：历史准入丢失账号／来源身份，使同 ID 的未授权库外正文进入当前 Vault

位置：`src/modules/agent/services/controller.ts:427`、`:444`、`:456`；`src/modules/agent/platform/history/service.ts:287`；`native/pty-server/src/agent_data.rs:75`、`:86`、`:1024`。

`ownedSessions()` 仅传 Provider + native session ID，原生 `owned_by_space` 也只比较这两个字段；账号 namespace、设备与精确来源都不参与准入。同一 Provider 的账号 A、B 各有相同 native ID（例如导入／复制的历史），只有 A 被 HUHU 绑定且 B 的 cwd 在库外时，B 仍通过 scan/query/read。`bindHistoryOwners` 也按这个二元组寻找 owner，旧记录没有 transcriptPath 时会将 B 绑定到 A 的 Space，放大错误归属。

隔离 stdio 反例 `/tmp/huhu-002-final-workbench/history-cross-account.py` 创建两个测试账号、相同 native ID、库外 cwd，只声明一个 owned tuple；返回 total=2，且 B 的正文 `private account-b` 可读。日志见同目录 `history-cross-account.log`。实际使用仓库已有 release helper，摘要 `90972428d88a06e3d3dbb336c0081bb12a5d6bbd173c5ef0f6083f6774c64aae`，protocol 3；未重建，因此此运行不单独证明二进制与当前源码一致，当前源码的同一准入谓词已独立核对。

依据：dev 的数据归属边界、摄入前判定；Spec §3.1 Native reference、§3.7、AC-034、NFR-003。满足条件：把已有完整来源身份贯穿绑定、准入、缓存身份及 owner 匹配；同 ID 的其他账号／来源不得因某一个 Session 已绑定而获准摄入，兼容缺失来源信息时不得扩大权限；增加正反账号与来源隔离反例。

### WB-S02 — medium：共享浏览器打开忽略持久化／恢复门禁失败，向真实调用方返回成功

位置：`src/modules/agent/module.ts:99`、`:106`、`:120`；消费者 `src/modules/browser/module.ts` 的 `shared.browser.open` 分支；实际错误生产者 `src/modules/agent/services/workspace-store.ts` 的 `editLayout`。

`editLayout` 以 `{effect,error}` 返回失败，`edit` 只加 `.catch(report)`，没有检查结果，也不返回可等待的写入。`browser.open` 随即返回 pageId。恢复冻结的 `recovery-busy`、布局保存失败等因此被当成打开成功；Browser 模块只在 open 抛错时 dispose 新建 Page，这里既不显示失败也不能进入清理，用户看不到已承诺的标签，调用方却继续成功路径。对 reuse 激活也存在同类错误传播问题。

反例：`/tmp/huhu-002-final-workbench/browser.test.ts` 的 `review:` 测试让真实 open 收到 `editLayout -> {effect:'none',error:Error('recovery-busy')}`，预期拒绝，实际 resolve `p`。

依据：错误处理规则禁止吞掉可行动失败；implementation-contracts §6 的冻结／门禁语义、Spec NFR-006 与 AC-041 的共享网页体验。满足条件：open 等待布局操作并检查结构化结果，准确向消费者返回拒绝／部分／未知，失败后有相应 Page 清理；测试真实恢复门禁与保存错误，不能只测 Promise reject。

### WB-S03 — medium：只导入、从未启动的历史 Session 无法归档，并阻塞所属 Space 归档

位置：`src/modules/agent/services/spaces/space-service.ts:605`、`:1301`；`src/modules/agent/services/workspace-service.ts:1506`、`:1540`。

显式导入按约定只建带 `nativeImport` 的 Session，不建 runtime/lastAttempt。归档却只接受 lastAttempt 的终止证据，或本次 activation 已接纳的 runtime；这种确定没有 HUHU 运行的导入记录得到 `incomplete`，并因 `persisted=false` 永远不能提交归档。它不同于恢复后运行状态未知的旧记录，有明确 metadata-only 来源。用户必须先启动并停止 Provider 才可能消除阻塞，违背导入本身无进程副作用的使用路径。

反例：`/tmp/huhu-002-final-workbench/router.test.ts` 的 never-started import 测试，使用真实 SpaceService/WorkspaceService，create → importHistorySession → previewArchive → archiveManaged，返回 `incomplete`，预期 `archived`。

依据：生命周期正确性；Spec §3.2/§3.7、AC-028/040，implementation-contracts 的 Session/运行分离。满足条件：将确实从未启动的显式导入与运行未知的恢复记录区分；前者可无 spawn 地归档 Session／Space，后者继续保守处理；不能为通过测试伪造一次启动或把所有缺 lastAttempt 的记录视为已退出。

### WB-S04 — medium：history import/resume/open 成功回执的 target 仍是动作前身份

位置：`src/modules/agent/services/control/router.ts:150`、`:194`、`:246`；`src/modules/agent/services/control/commands.ts:417`、`:425`、`:443`。

history 操作完成后更新 `prepared.target`，Router 却仅对 `pane.*` 再取 target。真实 CLI/router resume 成功时 `data` 有新 sessionId/runtimeId，而 envelope target 只有旧 spaceId；import/open 同理丢失刚获得的身份。依赖统一 target 继续寻址的客户端得不到已知目标，且与执行后读取 target 的 local 路径不一致。

反例：上述 `router.test.ts` 的 history resume envelope 测试，真实 ControlCommands + ControlRouter，stub 返回明确新 Session/runtime，响应 `ok:true` 但 target 两个字段缺失。

依据：公开协议一致性；Spec §3.5 机器输出身份，implementation-contracts §3 明确 target 在可用时包括 sessionId/runtimeId。满足条件：成功响应携最终已验证目标，覆盖 import/resume/open，并保留输入操作已确认回执的相关性保护。

### WB-S05 — medium：历史正文读取被取消后，被包装成成功的“来源不可用”

位置：`src/modules/agent/services/control/history.ts:293`；`src/modules/agent/services/control/commands.ts:470`；`src/modules/agent/services/control/router.ts:238`。

preview 的 query 错误会上抛，但 read catch 无差别返回 `status:'unavailable'`。NativeHistory.consume 的 abort 会 reject（`platform/history/service.ts:64`）；到了此处取消不再是取消，commands 将它变成普通 unavailable data，router 走 `ok:true`。来源缺失与取消观察因此混为一谈。无论底层传普通 cancelled Error 还是明确的 WAIT_CANCELLED，都会被吞掉。

反例：`/tmp/huhu-002-final-workbench/history.test.ts` 的 read cancellation 测试，在 read seam 抛带 WAIT_CANCELLED 的 Error，preview resolve unavailable 而非 reject。此测试直接证明 catch 丢失错误身份；真实 AbortSignal 到 native consume 的路径经源码核对，未把 seam 测试声称为实进程取消测试。

依据：错误分类与取消语义；Spec §3.5、NFR-006。满足条件：识别取消信号／分类并返回稳定取消失败，真正来源不可读仍可保留 metadata-only preview；补 read 阶段而不只是 query/preparation 阶段的取消用例。

### 低严重度单列：WB-L01 — low：控制工具按钮无法再次点击关闭

位置：`src/modules/agent/ui/workspace/WorkspaceToolbar.tsx:115`；`src/modules/agent/ui/AgentWorkspacePage.tsx:220`。

工具栏先将已打开的 control 设为 false，随后无条件调用 `onOpenTool('control')`；真实页面 callback 立刻设回 true。按钮 `aria-pressed` 表示切换控件，但第二次点击不能关闭；另有关闭入口，故列 low。`/tmp/huhu-002-final-workbench/toolbar.dom.test.tsx` 复制真实页面 callback + 真实 stores，点击后期望 false 实得 true。依据 UI 控件行为一致性及 DESIGN §2“可关闭”。满足条件：同一点击只有一个状态 owner，组合父组件接线验证再次点击可关闭，不能仅测不传 callback 的孤立 Toolbar。

## 二、规范轴：request-changes

除下列独立缺口，WB-S01 对应 AC-034/NFR-003，WB-S02 对应恢复冻结合同/NFR-006，WB-S03 对应 Session 生命周期与 AC-028/040，WB-S04 对应 target 协议，WB-S05 对应取消分类，均为同一固定输入的规范不满足；不以标准轴代替本轴判断。

### WB-P01 — medium：历史面板缺少首轮承诺的时间筛选和普通终端元数据入口

位置：`src/modules/agent/ui/history/SessionHistoryPanel.tsx:399`、`:418`、`:532`、`:577`；数据入口 `src/modules/agent/services/history-store.ts`。

Spec §3.7 明确“默认 Agent，可选择包含普通终端元数据”和 Provider/Space/时间/归档筛选首轮提供。当前面板所有行来自 NativeHistory provider projection，Agent 集合只能取 AGENT_CATALOG，没有 shell Session 元数据合流或包含终端选项；“updated/created”只改变排序，没有时间范围过滤。已有标题、Provider、Space、归档选项不能替代这两项。

依据：Spec §3.7、AC-033。满足条件：在现有历史 owner/UI 路径补足这两个已约定能力，普通终端仅展示已有元数据且不启动 PTY；按选项和时间范围验证实际结果。不需要更改 Spec 或增建历史平台。

### WB-P02 — medium：历史正文截断信息未传达给预览用户，前段内容被呈为“最新”

位置：`src/modules/agent/services/history-store.ts:150`、`:162`；`src/modules/agent/ui/history/SessionHistoryPanel.tsx:266`。

native 读取触及 body cap 时返回 `usage.partial`。store 只用它防止覆盖 messageCount，把预览标成 ready，没有把该次读取的 partial 状态作为 UI 可见信息；行预览无 partial 分支，始终展示 `turns.slice(-5)` 为“latest”。长记录取得的是有界前段时，用户看到前段末尾却无法知道正文被截断。面板底部的 partial 提示仅来自来源 warnings 数量，不是该记录正文截断。

依据：Spec §3.7“正文支持情况、全文搜索覆盖和截断必须可见”、AC-035、NFR-006。满足条件：每次 preview 保留并显示实际读取覆盖／截断状态，不把不完整片段称作完整最新会话；以 native partial fixture 到实际 SessionRow 的链路验证。此项为源码路径确认，未执行实机长 Provider 会话。

### WB-P03 — medium：当前候选回退了历史继续确认与窄窗历史抽屉的模态焦点合同

位置：`src/modules/agent/ui/history/SessionHistoryPanel.tsx:294`；`src/modules/agent/ui/AgentWorkspacePage.tsx:293`。

继续确认当前为内联 `div role="group"`，autoFocus 直接落在继续按钮；不提供 Dialog/AlertDialog 的焦点约束。窄窗历史抽屉仍只是 absolute div，背景控件可被 Tab 访问，缺少模态层的关闭／返回焦点接线。控制工具已有 Dialog 并不能覆盖 history 分支。

依据：DESIGN PAGE-002 的确认对话框、§5 的窄屏工具模态层及 Dialog/Sheet 焦点约束；AC-061/NFR-005；T-18-ac-matrix.md Round 2 P-2a 声称已改 AlertDialog、取消为默认焦点，与当前代码不符。历史证据不覆盖本候选。Lead 已独立确认 merge 回退并计划恢复，本报告只记录当前冻结输入，不重复实施修复。满足条件：恢复／落实两个实际历史分支的模态合同并验证 Tab、Escape、取消零启动和返回触发器；仍须由用户完成 Spec §11 的真实宿主验收。

## 三、检视范围与验证

检视围绕完整基线差异及实际调用链，覆盖 Space/Session models、records、SpaceService 的建立／授权／导入／归档／恢复／收件箱接缝；desktop directories/writer-owner；WorkspaceStore/WorkspaceService 的布局、启动附加、停止归档、恢复与共享网页；controller 的 owner/history/resume 消费；NativeResumeService 的身份、能力、cwd、占用、失败清理；NativeHistory 的 scan/query/read 准入、缓存与原生谓词；ControlCommands/Router/HistoryCommands 的真实控制消费者；AgentWorkspacePage、WorkspaceToolbar、WorkspaceTools、WorkspaceLayout、历史列表/继续、Space 导航；Browser module/workbench page/shared owner 与 app/shell 装配。对照 spec、DESIGN、implementation-contracts、ADR、goal-plan、tickets-map、相关 T-11/T-13/T-18 Evidence 与 AC matrix。并非声称本 reviewer 单独逐行覆盖全部 447 个跨领域文件；原生运行、恢复/备份等主体由其他独立 reviewer 负责，此处只追踪相关边界。

实际执行：

1. `pnpm exec vitest run src/modules/agent/services/spaces src/modules/agent/platform/desktop/spaces/directories.test.ts src/modules/agent/services/history-store.test.ts src/modules/agent/services/launch/native-resume.test.ts src/modules/agent/services/controller-resume.test.ts src/modules/agent/services/workspace-store-spaces.test.ts src/modules/agent/ui/workspace/WorkspaceToolbar.dom.test.tsx src/modules/agent/ui/AgentWorkspacePage.dom.test.tsx src/modules/agent/ui/history src/modules/browser/ui/workbench-page.dom.test.tsx src/modules/browser/module.test.ts src/modules/agent/shared-browser-close.test.ts`：退出 0，20 文件／177 tests passed。
2. `python3 /tmp/huhu-002-final-workbench/history-cross-account.py`：退出 0；隔离 fixture 得到未授权账号 B 正文，证据见 `history-cross-account.log`。没有操作用户真实库／Provider。
3. `pnpm exec vitest run --config /tmp/huhu-002-final-workbench/vitest.config.ts --testNamePattern='review:'`：工具报告退出 126，最终 Vitest 结果为 4 文件、5 个行为断言失败、36 skipped，无 transform/fixture 错误，详见 `/tmp/huhu-002-final-workbench/repro-final.log`。临时 config 引用原项目测试配置/setup；生产代码未改。首次复制 fixture 的 import 改写导致 parse error，已在 /tmp 修正后重跑；该次错误不计为产品证据。
4. canonical Input-SHA256、447 项当前文件与9项来源摘要、HEAD 前后核验：全部匹配。T-18 票面状态由 Lead 另行从 ready 改为 in_progress，不属于冻结 source 列表；未把 TASK 中“18票done”当作事实或完成依据。

## 四、限制与交回

未构建、未运行全量 Vitest/typecheck/lint、未编辑生产文件或正式 Evidence。Lead 的全量检查结果由 Lead 独立维护，本报告不把其失败重计为本人发现。没有运行真实 Obsidian、真实 Provider、五平台实机、权限批准或生产性能验收；按 Spec §11 留给用户，不将这些授权保留事项虚构成代码通过，也不单因未跑实机阻止本次只读审查交回。

未列为确认缺陷的线索：邮箱计数在工具关闭后的更新路径尚未完成独立反例；拖放历史继续是否需同一确认交互尚未独立走完整路径。它们不是额外的修复要求。已有39文件 merge 回退由 Lead 核对，本报告不将尚未落地的恢复当成当前修复；恢复后应冻结新候选并针对本报告及受影响路径复核。

结论：标准轴与规范轴均 request-changes。本报告交回不修改任何 Ticket、Goal 或 Evidence 状态，也不宣布该 change 完成。
