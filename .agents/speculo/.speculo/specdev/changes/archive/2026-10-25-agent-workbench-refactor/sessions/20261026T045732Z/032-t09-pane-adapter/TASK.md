---
schema_version: 2
session: "20261026T045732Z"
task: "032-t09-pane-adapter"
kind: "implementation"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-09"
---

## Goal

沿原codex:/root/prepare_t08_full_cli、用户指定gpt-6.1-sol/xhigh，完成T09 B第二阶段：将六项Pane协议接入原ControlCommands/Router、真实WorkspaceService.panes与同一布局owner，完成分页、效果语义、真实CLI组合验收。029已正式交回SOURCE STOPPED且Root实际接收；本任务独立保存，不改写029。完整18票授权持续，Root负责编排与最终代码验收；真实Obsidian/Provider/OS IME/五平台仍由用户执行。不提交、推送、发布或归档。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/terminal；change .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor；HEAD 33c21e098ef3188cbab5a09f3e0a01fadb787715、branch NAMEWTA/terminal，current工作区。当前GP034/Map35，T09 in_progress/attempts0，T01–08 done。按bootstrap/Map→实际dev/ui→T09 Ticket→Goal/I与适用design/TDD/错误/测试规则；未变规则可复用。

完整读原T09工程Packet、r2精确分配、029 REPORT与Root接收、A真实API检查点。上层以Spec §3.1–3.5/AC009/061、implementation-contracts、DESIGN revision1为准。原始T09输入已包含T01–08，不能把HEAD全部差异归T09。

- evidence/T-09-dispatch-input.json SHA256 aec8e02b821c7ea7869e0c153e213acc655fb60e1e9347cd78919577462acfc8
- evidence/T-09-engineering-packet.md SHA256 5900b0b979de79e39742eefc6696e38a473b16aab0a1bf69257649877c18e16d
- evidence/T-09-write-allocation-r2.json SHA256 66f63da14fe31287db561a85193d1277802b2c127c061a0dab405b3525cbdbac
- evidence/T-09-protocol-stage1-root-audit.json SHA256 54163a3373c55ef2b77ff38d778cea1d3fed2e838d83a3f32b532115d940a962
- evidence/T-09-pane-api-checkpoint.json SHA256 05b28cbfe298b6c3cc715bcb5ef1ae5d4c3e8ff87c749188a730c013ce064cb4
- evidence/T-09-root-dom-css-checkpoint.json SHA256 774da99adf90fd4161f9439c2a5fa4cffb1281c9b19c9c452e937668a5de5e81

## Workspace and Scope

以下18条产品路径由你唯一写，包括029的10条与本次解锁的8条adapter/组合测试：

- src/shared/native/control-schema.json
- src/shared/native/control-wire.generated.ts
- src/shared/native/control-wire.test.ts
- native/pty-server/src/control/wire_generated.rs
- native/pty-server/src/control/cli.rs
- native/pty-server/tests/control.rs
- native/pty-server/tests/control_protocol.rs
- test/fixtures/native/control-v1.json
- test/native/control-protocol.test.ts
- docs/agent-workbench-cli.md
- src/modules/agent/services/control/commands.ts
- src/modules/agent/services/control/commands.test.ts
- src/modules/agent/services/control/paging.ts
- src/modules/agent/services/control/paging.test.ts
- src/modules/agent/services/control/router.ts
- src/modules/agent/services/control/router.test.ts
- src/modules/agent/services/control/router-foreground.dom.test.tsx
- src/modules/agent/services/control/control-panels-native.test.ts

允许本TASK对应REPORT、新建/tmp/huhu-t09-pane-adapter-*证据、隔离HOME/短0700运行fixture/endpoint、自己新CARGO_TARGET_DIR。TS/Rust wire仅由原生成器产生，生成器/codec/Host/helper/editor/终端内核/SpaceService/records/controller/依赖锁保持只读。A仍独占14路径，U独占20路径（含i18n）。不要按方法并写同文件。实际缺口先交Root精确位置；不先改后补范围。

Root独占main.js/styles.css/budget/notices/vitest.config.ts及正式状态。不得根plugin build、全仓lint、architecture/Promise会写临时源的门。旧017 immutable pair及029语法工件原样保留；不要复用其路径或target产生新候选。可自行进行定向TS/DOM与新target原生测试；完整native/Linux/WindowsGNU和最终pair在你原生源稳定后执行一次，提前通知Root资源窗口，避免与其他全量门争用。不要启动真实Provider/账号/用户Vault/Obsidian。

## Actual API Boundary

WorkspaceService.panes is a real readonly WorkspacePanes instance. list, capture, captureSession, captureFocus, attach, split, resize, close and focus are implemented exports, not proposed DTOs.

capture/captureSession synchronously freeze separate original Pane and Session/runtime identities. captureFocus returns a one-use {pane, execute(context?), dispose()} capability. list(spaceId?, context?) returns {revision, panes}. Mutation methods return PaneOperationResult with effect/layoutPublished/persisted/revision plus actual pane/insertedPane/focused/focusRequestId/error.

PaneOperationContext extends the real WorkspaceLayoutEditContext with optional intent. Signal and absolute performance.now deadline pass unchanged from ControlExecutionContext. The original Date.now focus owner bridge occurs only inside A, capped by 1000ms and the remaining original deadline.

PaneCommandError carries actual code/reason. B must preserve returned mutation facts and map typed errors without replacing partial/unknown or confirmed saves with none.

Root已读回015旧reopen身份红→016两文件24绿；017旧焦点夹具barrier不再被调用导致5000ms超时，018仅改真实storage.write barrier后原风险全部保留、三文件41项绿。018包含单调排队deadline、新focus实际consumed与wrong ownerDocument/blur拒绝。尚未证明实际TerminalTabView消费链，该项由本阶段真实DOM补齐。六个源快照与完整签名在检查点，A确认签名维持。

A仍可在原14路径继续风险补测与修复。测试捕获实际消费输入，遇实际源漂移保留原件并仅重验受影响部分；不声称并行工作区全体冻结。需要签名调整直接联系A并通知Root，不复制DTO/布局业务或模拟同名API绕过依赖。原ControlExecutionContext的绝对deadline为performance.now()；原样传入新布局操作，排队不重置期限，不在B转换Date.now()。旧focus内部桥接由A唯一处理。

## Acceptance

1. 六操作只作薄adapter，引用原WorkspaceService.panes。同步捕获源Pane/目标Session/可选runtime与原scope、取消及deadline；不能延迟后重新选择当前对象。pane.list缺显式Space才冻结调用Space；其余明确pane/session不补当前UI/cwd/hint，两个同cwd Space独立。split源Pane和第三Session分别捕获，--runtime只约束插入Session；top target源完整tuple，data.insertedPane明确另一对象。attach返回实际新/既有显示的完整tuple，close后响应仍指向原Pane。
2. 直接Router非法Pane ID/C0/DEL、超长、unknown、重复/歧义、跨Space和stale runtime建立真实负例，不仅跑CLI。通用wire形状容许escaped控制字符不等于领域身份有效，不扩两codec/generator。保留字面Unicode/大小写/合法lp1.身份，4096B上限与3069/3070兼容编码风险由真实owner承接。
3. pane.list沿原ControlPaging有界池，以真实布局revision为栅栏，完整49152B envelope包括target/cursor，不能只测data。query不得取writer、写文件、mint ID、改selection或扩dirty cache；GUI未保存布局变化也使旧cursor stale。长合法ID/标题/大量pane单项及整页容量正负要用真实owner列表，不能另建布局快照store。scope/目标/cursor跨查询拒绝。
4. 所有变更映射原WorkspaceLayoutEditResult的layoutPublished/persisted/revision/effect及实际错误。none只限未发布，partial/unknown/确认后partial保留事实，不将throw统一当none、不将已确认写因观察取消抹去、不伪造T08 PTY/adapter输入receipt。PaneCommandError仅经真实typed映射给机器code/本地化message；保留原T08输入receipt/等待取消/读屏/原生结果和完整envelope规则。需要新t() key先交U，不能自行写i18n。
5. pane.attach只接原运行或停止恢复记录，不spawn/抢focus；split不用原会启动新Shell的GUI快捷入口。close只detach，原真实PID/屏幕仍可读且明确stop有效；重复/并发attach保持单显示owner。resize最近父split及second子树1-ratio，嵌套和0.15/0.85端点，非法值拒绝不clamp。真实GUI→CLI和CLI→原同树回读，dirty草稿/非当前Space/在途save与取消有实际证明。
6. pane.focus须用一次性captureFocus原ForegroundIntent/request，实际TerminalTabView→presentManagedFocus→commitFocus→consumed才成功；只mockcommitPresentation=true不算。原1000ms且不超原deadline，blur/旧view/关闭/取消/换代/晚到Promise不抢焦点；停止Pane不自动启动。完整Router DOM风险使用真实原服务和生产终端叶。已选择但无实际呈现只能partial，并给出持久化事实。
7. availability、CONTROL_HANDLERS、help、fixture、中文CLI说明在真实handler/生产消费者闭合后同步启用六项，其他未实现操作仍false。先保持真实red，再启用并跑既有canonical/CLI及T08回归，不删除原风险。029“阶段1尚不可用”的说明按最终状态重写；失败历史不改。目标语法/条件/响应含源与插入身份必须准确。
8. 实际CLI→同次native pair→NativeHost/Router→生产WorkspaceService/SpaceWorkspaceStore/SpaceService构成受控组合链，六操作全覆盖，关闭后真实进程存活及停止。允许磁盘/宿主端口的隔离fixture，禁止mock掉上述业务owner或以wire示例当执行。Native pair由稳定源/锁/真实toolchain/profile产生，保留dep-info/实际消费字节与hash，0555 pair+只读producer新路径；只清本次target/profile/进程并留正常退出证据。无需Pi模型验证纯布局。

记录实际argv/cwd/UTC/exit/raw、源/工具与实际消费闭包快照、红绿/夹具失败/并行漂移边界。Root最终统一build/lint/架构/样式/预算、最终原生pair一致性及未参与实现的Astra/high双轴审查；自报不是整票通过。

## Return

完成候选后SOURCE STOPPED，原子写本任务REPORT，标准Session/Task/Status与聚焦交接/产物与验证/问题与下一步。列18路径实际前后hash/mode、消费的A/U接口与命令、机器effect/分页/目标行为、生产DOM/真实CLI组合、native pair producer及profile/清理、未验证范围。实际return结构校验保存原件；不改正式Ticket/Evidence/Goal、不递归派遣。发现真实API或范围缺口立即报Root/A，不等报告收尾才暴露。
