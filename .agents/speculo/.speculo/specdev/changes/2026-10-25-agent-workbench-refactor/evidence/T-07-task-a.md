# T07 A — 业务与生产路由

Root 后续实际 followup_task 才是本任务的开始；本文件准备本身不解锁。用户完整18票授权、Agent Team及模型见Goal§4；原A gpt-6.1-sol/xhigh，current workspace=/home/wta/orca/workspaces/obsidian-huhu/terminal，HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715。复用现工作区，不递归委派，不提交/推送/PR/发布/归档。真实Obsidian/Provider/五平台E2E用户负责，代码与受控自动化必须真实完成。

Change=.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor。按AGENTS workspace/catalog→运行入口、Map→dev→Ticket07→Goal及Spec/implementation-contracts相关章节回读；正式GP022/Map23，T06已done。完整合同evidence/T-07-engineering-packet.md；唯一精确写集evidence/T-07-write-allocation.json的A22。正式前输入evidence/T-07-dispatch-input.json由Root实际派遣前生成，必须回读源/工具/Skill摘要。Root正式状态/Evidence/根产物独占，其他owner路径只读。

初始解锁仅A的7路径：src/modules/agent/core/control/context.ts（纯scope上下文，不猜wire）、services/spaces/space-service.ts及space-service-control.test.ts、services/workspace-service.ts及workspace-service-control.test.ts、services/terminal/sessions.ts及sessions-control.test.ts（其余均在src/modules/agent/下）。实现只读scope/原grant、保存后rename及pending晚创建防覆盖、同步一次性captureManagedCreate与onReserved非撤回观察。其余A15路径暂不写；先等C实际wire→Root回读，再等B真实端口→Root回读，Root发消息后才做router/commands/paging/environment/controller/module/i18n与其余测试。

保留当前原生产创建、取消、前景token、pending和停止合同。每个fresh start明确Space，旧交互先选择属于T14/15，不在CLI弹框/按cwd或GUI猜目标。原scope是physicalRoot/device/instance/Vault并可无writer只读；已存grant才授库外目录。execute同步交接一次所有权；未execute dispose才撤；onReserved在真实commit+reserve之后、任何准备await之前，观察失败不能回滚或取消已接纳业务。rename保存失败不投影，成功后entry和create末尾不能重放旧名称；Pane customTitle保留。后续routeEnvironment返回env+assertCurrent，原beforeSpawn await完成后同同步段重核捕获注册/lease并spawn，不形成ensureHelper自await。

先真实失败反例再最小实现；待scope/late rename/capture独立切片可编译后交接口事实。不得把新建测试编译失败当全部行为红灯；必要的生命周期/错代/保存失败/真实foreground组合须击穿旧路径或最小对照。现有T06回归风险不删。仅跑自有定向检查；任何输入漂移记录为不能最终验收，交Root统一稳定整合。不能全局build/lint/guards、改main/styles/预算/notices、运行真实账号/用户库。

返回/tmp/huhu-t07-a-api-handoff.md及.json作为初始接缝事实；阶段结束完整/tmp/huhu-t07-a-handoff.md、source.json、checks.json、diff及可回读输入原件。每条实际命令含argv/cwd/UTC/exit/原输出和输入/工具/配置SHA，保留失败，不把wrapper126写成代码红灯；实际Node=/home/wta/.volta/tools/image/node/26.11.1/bin/node。优先共享不可变CAS与manifest引用，不反复复制全仓。至少提供scope读不入writer、grant无新增授权、pending rename保存/失败、scope await撤原ForegroundIntent及onReserved通道关闭仍结算的真实证据。后续A control-native.test.ts拥有真实CLI→broker→Host→生产业务/同helper的主断言，缺双binary失败且0skip。最后SOURCE STOPPED后Root整合/独立Astra/high复核。
