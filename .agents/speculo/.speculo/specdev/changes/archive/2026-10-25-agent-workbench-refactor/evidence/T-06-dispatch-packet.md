# T06 实施派单合同：状态、原生待处理入口与呈现后已读

GP-020/Map21。T05代码验收、独立双轴与当前交付校验已完成，原结果见T-05.md及T-05-final-current-review.json；真实E2E仍由用户验收。Root已修订原T06精确44路径与唯一owner，接着执行DoR并冻结当前源、Skill、设计和本合同；只有实际派单才启动受托实现，不将后文未来检查写为passed。

## 固定范围与权威

沿原用户全18票代码交付和 Agent Team 授权；实现 gpt-6.1-sol/xhigh，独立审查 gpt-6-astra/high；current workspace `/home/wta/orca/workspaces/obsidian-huhu/terminal`，HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`。无提交、推送、PR、发布、归档、真实账号或真实 Vault 操作。原生 Provider/Obsidian/五平台端到端由用户验收。

必读顺序为正式 Tickets Map 的 ALL/T06 Skill 矩阵、真实 dev/ui Skill 及命中参考、`ticket/06-activity-and-approval.md`、Goal 当前执行节。调用 `specdev-i-implement` 权威入口，保留有意义红绿与局部设计取舍，不重新创建 Goal 或 Worktree。Spec/ADR/CONTEXT/DESIGN/implementation-contracts/reference-notes 仍为原权威。

本票实现可靠状态来源、原生审批的提示与定位、原终端人工输入、独立 activitySequence 和 presented/seen。foreground 本票仍明确 unknown，真实前台进程证据归 T08；不得将所有拒绝当作可用协作功能。PAGE001/PAGE003 只承接本切片，T08/T09 尚未实现的 CLI/控制宿主不得伪装成已交付。

参考采用既有固定 Herdr/K01/K02 研究与精确许可证记录；六种 Provider 的结构化事件语义以被核对的真实版本为限，不以名称猜测能力。四类 command 来源只能 unproven/lastFact；Pi/OpenCode 基于已核对的初始化接缝，由本票新增 UUID registration 与真实来源序号；当前 extension 尚无该保证，新增后仍不证明 OS 前台状态。遇到未研究的新机制先只读核查官方来源，向 Root 返回必要范围变化。

## 接缝合并规则

以下五份候选作为设计输入，本Packet随输入记录原件摘要，具体接口仍由源码回执替代猜测：`T-06-activity-api-candidate-v2.md`、`T-06-hook-resource-profile.md`、`T-06-ui-presentation-seam.md`、`T-06-contract-reconciliation.md`、`T-06-browser-acceptance-proposal.json`。B onRender 要求收紧 A 候选的 ready 简写；后续 Browser proposal 允许独立新 activity 脚本，取代对账报告的“无需新B文件”旧观察。

- A 拥有 `RuntimeActivityBinding`、typed observations、Session 的 activitySequence/原子 join、ManagedRuntimeSummary/SessionRecord 投影、Workspace 的精确 attach 与 seen、SpaceService 唯一提示持久化。C 不生成 activitySequence，B 不创建运行或修改底层 source 状态。
- `prepareRuntimeHooks(request,binding)` 返回 env 和幂等 `close():Promise<void>`；request 有 `signal?:AbortSignal`。close 首个 await 前同步撤证据和准入，真实 cleanup 完成前保留物理额度。RuntimeActivityBinding.close 同步撤证据，不冒充已清磁盘。
- 每 runtime 只有一个 prepared scope。完整原生答案与小摘要由同一次物理 publication 分流；Controller 不能让 typed observation 与旧 hookActivity/setActivity 对同一事件双计。AgentRuntime 原完整答案、turn receipt、取消与 native reference 保持。
- A 的8个 source-lifetime 槽与 C 的8个 registration 槽累计计数，关闭的身份/high-water fence 保留到运行真实结算；换 UUID/close/rebind 不能洗额度。无真实序号 D=4096 去重用尽后 fail closed，不用 LRU 遗忘造 exactly-once。
- current、lastFact、source 独立。并存来源、缺序号、超限、断链及错误降 unknown；曾 blocked 的 lastFact 保留人工入口。clear 只接受同 binding/epoch/registration/blockId 的真实配对事件；Stop、TTL、seen、generic PreToolUse、native exit0 均不自动清审批或生成成功完成。
- `turn-finished` 只由明确且已核验的 adapter 完成事件产生，且无未闭合 block/gap/error；StopFailure/取消/HookError 不晋升。活动快照 immutable、原子 subscribe+snapshot，无 await 间隙；activitySequence 不等于 contentSequence 或 seenSequence。
- 摘要整个 JSON 按 UTF8 编码预量8192B，计转义和字段，不截断身份。原生完整答案合法2MiB独立保留；拒绝摘要不得丢完整答案。物理存储/逻辑副本与进程 RSS 分开报告。

## 有界资源与关闭

C 以 Vault/device 为共享物理 owner，覆盖 Controller 与 AgentRuntime 两个 AutomationHooks 实例。32 scopes 包括 preparing/closing/orphan；1 ingress/scope；collector 最多4个且收 stdin 前准入，16MiB/3s边界。small8/scope、128全局、64KiB；large2/scope、4全局、16MiB+64KiB；具体文件和 metadata 额度按已接受 profile。

固定 slot、nonce、pending/consuming/tombstone 都占额；reader 单个真实在途，每轮 small16+large1、scope round-robin、每scope1个，积压立即下一任务，空闲才300ms。打开文件后按实际 E+1 字节读，不凭 stat 后无限读。删除失败保留额度，3次失败降unknown，之后按idle重试；不凭 PID/mtime 抢 orphan。

`AutomationHooks.dispose():Promise<void>` 同步撤自有scope/回调，收集实际cleanup结果，不dispose其他实例。A 必须修改 AgentRuntime 的 hookClose/late prepare/remove/dispose，hooks 与 registry cleanup 同步启动后并行收集，幂等返回真实 Promise；Controller 既有 settle 承接异步结果。没有 settle 的 writer/collector 不能因观察超时被当作结束。

A 持久化只有一个实际磁盘 writer，最多32 dirty targets（每目标合并一份）和32 waiters；B 每 View 一个render在途+一个latest pending，每 Host 一个 seen 观察+一个合并mark。取消/超时只撤观察，不释放实际 writer。保留 persisted=false、晚错误与未保存 notice；strict drain 失败可回读。

## UI / seen / 精确定位

沿既有 managed snapshot/subscribe/attach 接缝；markManagedSeen 是本票新增候选，待 A 落源后冻结准确方法；请求仍包含稳定 target、捕获的 ActivityMark、tabId/paneSessionId。不给计划 CLI 开放 seen，不增加可由客户端自称已paint的公共字段。

B 的 `presentActivity(mark)` 在 React commit 捕获 N；完整 screen 安装后请求刷新，公开 onRender 覆盖 viewport 再回报 `{at:N,installed:ScreenMark}`。回报前再次检查 render generation、IO/可见、document focus、当前 leaf、精确 pane，A 独立核 tuple/layout/现有可见登记。ready/applied/attach.focused/click 不单独推进 seen；安装基线不证明精确 contentSequence。N+1 到来后确认 N 只推进 seenThrough=N，N+1 仍保持未读。

readonly 恢复提示只确认实际 React 呈现的原 tuple，不启动运行、不造终端 ready。blur、hidden、inert、离屏、adopt、dispose 撤呈现资格，不抢 geometry owner。未知状态仍可定位历史 blocked。

attach 只合并 ensure-pane；每次调用独立捕获 foreground intent。既有 split 必须准确 focusSession 当前 runtime；背景和迟到失效不能 select/open/focus。B 不用兜底 focus 隐藏错误。原 TUI 保留批准/拒绝，绝不自动输入或修改 Manual/YOLO/首次确认。

## 写集与执行顺序

精确文件见 `evidence/T-06-write-allocation.json`（随正式输入冻结）：A20、B7、C14、Root3，不重叠。A/C/B 均禁止写正式状态、main/styles/budget、依赖、Rust/shared/native、AgentWorkspacePage、workspace-view 或控制宿主。任何新必要路径/字段先停对应分支交 Root 修订。

1. A 先落纯 DTO/公开 API 与所属 en/zh 词典的真实源；返回具体 SHA、导出签名和单元红绿；A 继续唯一自身内部 writer。
2. Root 回读接口并发消息解锁 C/B 生产消费。C 可提前在自有测试/内部spool准备，但不得猜跨owner接口；B 可先准备场景，不改共享renderer。
3. A/C 内部业务可在不重叠路径并行；需要定向测试读稳定依赖时协调窄停写窗口。所有全局 build/lint/guard、产物和 Chrome 由 Root 在相应源 STOP 后顺序执行。
4. 每位交回新 `/tmp/huhu-t06-{a,b,c}-{handoff.md,source.json,checks.json}`，包括前后源、真实命令前输入/UTC/退出/原日志、失败与未验证项、明确 SOURCE STOPPED。不得覆写历史失败或将配置错误称行为红灯。

## 最小可证伪验证

A 覆盖状态证据矩阵、同代/旧代/双来源、block配对、原子join与8槽、编码8KiB、N/N+1与32提示目标/观察者容量、实际磁盘延迟/错误/取消、attach竞争/既有split、恢复不spawn、两Hook实例异步关闭和原完整答案消费者。以生产 Session/Workspace/SpaceService 接缝验证，不只测新纯函数。

C 覆盖真实生成脚本和物理spool的正常/过大/乱序/重复/并发/慢stdin、全局额度、E+1读取、raw与summary分流、初始化registration、unproven退化、late-close/abort、unlink失败不还额、两个Hooks实例隔离与完整原生结果。保留既有 status hook 清理、accounts 权限/环境回归；测试不能依赖真账号或修改用户 HOME。

B 覆盖 Sidebar/TerminalTabView 的提示与键盘导航、原生产 View 的 onRender/hidden/offscreen/blur/dispose/双观察者、readonly、capturedN与迟到错误。独立新 `scripts/obsidian-acceptance/agent-workbench-activity.mjs` 实挂 Sidebar/TerminalTabView/WorkspaceService/Session/View，底层host/native/provider/disk可控；markSeen/attach 只能observe+forward，不能假替换权威。保留旧 T05 screen 脚本原字节。

Root 依据真实变动选择组合测试、build/lint、Promise/architecture/i18n/bundle/相关docs、实际 Chrome 六类场景与可读截图，再冻结所有 T06 实际交付进行独立双轴审查。没有事实的新变动不重复无关检查。失败先保留原现场和单变量证据，最多3次整合；同一阻塞无新输入不循环重试。真实 E2E 未运行明确交给用户。


## 执行与源码冻结

现有T01–T05交付共143路径及原字节已核对并冻结于T-06-prior-delivery.json。开发基线继续33c21e098ef3188cbab5a09f3e0a01fadb787715；沿用current checkout，不提交/清理既有改动。精确分工见T-06-write-allocation.json的actual_owners；模型继承这些原6.1-sol/xhigh身份。A先落真实DTO/签名/词典；C提前仅在自身独占spool内部按固定profile实现与准备验证，跨owner活动接口以Root实际回读为闸；B在A接口回读后正式启动。正式状态和所有全局检查仅Root写入。
