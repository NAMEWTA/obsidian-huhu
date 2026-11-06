# T09 完整源切片独立审查

Session: 20261105T094057Z
Task: 103-review-t09-agent
Status: completed

## 聚焦交接

Reviewer：native:/root/review_t12_budget，沿用既有 sol high 独立审查身份；Strategy: independent；Risk: high；Independence: required；Mode: native。未参与079、Root默认值/fixture实现，089仅作只读独立审查；本次没有委派、修复或真实CLI/账号/用户vault/clipboard操作。

**standards: request-changes；specification: request-changes。** 完整T09切片发现两项新增组件中的P2：等待横幅只激活tab，未定位同tab里真正等待的pane；会话信息把tab provider与focused pane的其它元数据拼接，普通shell还显示不存在的agent.shell键。三条失败断言分别覆盖这两项，另有单pane定位正控制通过；不是由静态猜测或虚构状态推导。

原283 DOM、28 unit/default、scoped types和零警告lint均独立通过，Root第二次正式66矩阵passed不被否定，但其样本没有覆盖上述真实混合split。Root按两项最小条件修复后定向复验；无需重选UI风格或重写终端服务。return校验后明确释放本91源review冻结，后续改动需重验受影响结论。仓库唯一写入为本不可覆盖REPORT；过程全部在 /tmp/huhu-t09-high-review。

## 产物与验证

### 固定输入、实际基线及复用

Review mode: source-files；不以HEAD或全仓dirty diff冒充079交付。079起点HEAD仅作身份上下文：37fcede4210a19bcc2a74809e7fdd301e5717957。其实际dirty baseline.json SHA256 b5b8b46702f9c57ae72dd20e64177ff28528019bb3c539d81f7e33c1e76b6010，82条原始content逐项自hash均一致。candidate.json SHA256 012f30b746dfea4760a4cbd0419810dc34b1ceff8aa3a9f4fc6b37bce1bf34d6，86 owned私有副本逐项hash一致；47个变化精确为43修改、4新增、0删除。新增是SessionInformation.tsx及测试、T09两fixture；原candidate.diff不包含未跟踪新增文件，已另完整阅读新增源，并用实际baseline内容重建actual-dirty-to-current.diff，避免把新增省略。

079不可变REPORT SHA256 d4a8ba1b0b3456c67a608cd2beae2eaf325a0639cb9e5cd6e4a6e9a3508dab33。当前复合91清单 /tmp/huhu-t09-final-source-review/manifest.json SHA256 c238982eff06db0595335757c5b1002e09160ad84ef75c62da9a157234f28ec2，开始及结束逐项字节/模式drift=[]。079 candidate到当前恰有4个已解释覆盖：settings-page、workbench-page的085词典注册，两份T09 fixture的Root真实宿主/驱动接缝；额外core terminal settings、module/UI词典、中央runner与electron stub均明确列入当前91，未静默遗漏。

validate-specdev --review-scope --mode source-files对91个路径固定，退出0；scope.json SHA256 1396b5d584907d7618803fcd06a511564b4462b34f479098f9796966c92b82de。私有review-input.json（scope、原文来源、实际reviewer与排除项）Input-SHA256 d01425486069bf004c0f7376332d543db580c9bb4a197c49732043599e734f69；sources.json SHA256 83354a991bb117d5fd7a59566e1afde3c6d1d2e48afc5908431b9173c1072025。摘要是输入证据，不替代语义审查。

来源发现：显式source-files无commit message/远程Issue来源，记not-applicable；指定Spec/T09/Goal/Map38及DESIGN3/UI002 found；仓库AGENTS/dev/ui及适用settings/i18n、testing、shell、design-system、theme、公共review/risk合同和实际build/type/lint/test配置found。批准摘要仍为49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66；未改设计来消除发现。已有089对085的逐键集合、真实UI entry注册和activation边界结论适用：相关agent词典与两个入口当前hash仍相同，因此不重复时序测试。T08/T10/T07/T16生产源、Root T11 driver和全局构建/许可资产不纳入本次结论。

### 完整影响与能力核对

完整阅读实际47变化及新增文件，对91中的不变上下文按真实调用风险核对：

- 空间：SpaceNavigation使用共享Tree，完整ID/名称、选中与键盘、create/rename、外部目录receipt及草稿保留；选择/提交同步Promise锁和lifetime隔离。归档仍previewArchive取得精确plan，再确认成员、archiveManaged执行，未重建领域引擎。
- 目录与页签：原会话筛选、搜索、折叠、状态/provider/无分组、背景/恢复与lifecycle动作保留；新增按pane.spaceId分组及真实历史/Inbox/账号入口。账号入口确实进入terminal/accounts，usage/board仍为真实page tabs，未跳到通知/外观。
- 分屏：终端pane与workspace group两层均使用唯一Resizable包装和已安装panels v4的groupRef/orientation/id-keyed layout；百分比字符串，meta.isUserInteraction+requestedLayout才写模型，外部setLayout与窄宽投影无echo。原键盘和双击复位通过实际库/模型测试，未新造v3兼容层或拖动引擎。
- 实例/owner：TerminalHost与TerminalView的session身份、IME/native焦点、隐藏renderer保留、活动/已读receipt、第二Document/blur/dispose保护未被此次样式改写。terminal-view仅调整HU terminal/ANSI/font适配；Root defaults为13、21/13，显式用户fontSize/lineHeight仍保留。详情/工具使用共享DetailPane，终端WorkspaceLayout没有随info/history/control开关改变key；唯一详情组合没有复制终端。
- 控制与Inbox：控制active.current同步锁、epoch/target/owner/timeout/cancel/continuation/stop回执保留。Inbox新增同target/range/lifetime锁与迟到回执隔离，原read/ack分离、分页highWater/generation、fresh-primary完整比对、pending/unknown保留及显式核对/移除不变；旧收件人结果不会清除新收件人草稿。
- 设置/工具：agents、terminal、accounts、usage、quick、skills、backup七Tabs及其原字段/动作均保留。CLI检测/安装/升级与失败输出、账号切换/命名/删除、技能来源/范围/启用/更新/确认、快捷命令scope/content/cwd、备份manifest/检查plan/明确import/cancel/retry/report仍走原服务。变化主要是共享Button/Badge API及HU token/字号；没有把服务逻辑移到UI，没有引入依赖或复制另一引擎。

上述不等于未改基础服务的全面重新认证。原有复杂异步代码只按与本次变化的接缝评估，不把未变化的旧债混作本轮新增问题；例如控制面板原来已使用不存在的agent.shell，这次finding仅要求修复新增SessionInformation中的同类新调用，不要求顺手清全模块词典债。

### standards 输出

Reviewer: native:/root/review_t12_budget
Axis: standards
Result: request-changes
Input-SHA256: d01425486069bf004c0f7376332d543db580c9bb4a197c49732043599e734f69

**S01 — P2：等待横幅在混合分屏中定位到非等待pane。**

Path：src/modules/agent/ui/workspace/SessionInformation.tsx:17、22、28。waiting是按tab聚合state找到的，locate只调用workspace.activate(waiting.id)。真实WorkspaceService.sync在services/workspace-service.ts:1967–1972把任意pane的waiting/permission聚合为tab state；activate在1906–1913只焦点tab.focusedSessionId。因此Codex pane s0等待、同tab新split的shell s1保持焦点时，横幅虽宣称定位等待会话，点击仍把键盘目标放在s1。左右split在窄宽投影为上下时也相同；不需要异常或过期数据。

实际反例：真实WorkspaceService.newAgent('codex')创建真实TerminalSession s0、setActivity('waiting')，真实splitPane(s0,'row')通过注入的无进程shell port创建s1并聚焦；渲染真实WaitingAnswerBanner、点击真实Button。结果waiting=s0、focused=s1，focusCalls依次s0/s1/s1，断言应定位s0失败；单pane同动作正控制通过。没有mock activate/focusSession、没有CLI进程或虚构tab聚合状态。

影响：用户点“查看原终端”后可能直接在另一个shell输入回答/命令，横幅不满足自身定位承诺。最小满足条件：从真实session/managed活动证据解析等待的确切runtime/pane并通过已有focusSession或等价公开定位路径聚焦该pane；背景attach仍只定位现有会话，不allow/deny、不launch。补同tab等待agent+focused shell及原单pane/背景分支回归，无需改终端服务协议。

**S02 — P2：会话信息provider与所展示的focused session身份不一致。**

Path：src/modules/agent/ui/workspace/SessionInformation.tsx:55–63，尤其58。其它字段来自terminal.panes[focusedSessionId]，provider却取terminal.agentId。真实splitPane在services/workspace-service.ts:2122–2195总是创建shell pane，并保留原agent tab.agentId；因此聚焦该shell时，信息显示shell的cwd/session/account字段，却仍显示Codex provider。新组件对普通shell的fallback还调用未定义的t('agent.shell')，真实界面直接显示原始键。

实际反例沿S01同一真实newAgent→splitPane路径：focused pane metadata.agentId缺省、实际session为shell，真实信息Dialog的provider dd却是Codex，预期既有正确词条agent.inbox.shell（en=Shell），断言失败；再用真实newTerminal的普通单pane对照，provider dd实际为agent.shell，预期Shell，断言再次失败。SessionInformation不在baseline82中，是079明确新增源，不能以其它原有消费者也引用坏键为由当作本轮无关旧债。

影响：用户不能可靠确认当前pane的程序身份，且常见普通shell详情出现未翻译实现键。最小满足条件：provider与当前focused session/pane/managed summary的同一真实身份对齐（含agent/shell区分），shell采用已有有效双语键或补正确双语词条；不能用tab provider替代已明确为shell的pane。不要求虚构model/tokens或新增数据字段。

除上述两项，本次未确认其它新增标准轴finding。独立执行的283既有DOM仍为绿色，说明这些反例属于尚未覆盖的真实组合，而非把随机测试失败当产品缺陷。

### specification 输出

Reviewer: native:/root/review_t12_budget
Axis: specification
Result: request-changes
Input-SHA256: d01425486069bf004c0f7376332d543db580c9bb4a197c49732043599e734f69

- P2 / S01同证据：违反Spec AC-081、DESIGN §6 agent / UX-AGENT-1配套“默认动作定位对应终端”及103 TASK的waiting限定。当前横幅、状态提示本身存在，也没有发明allow/deny；缺口是对应pane的实际定位。完成条件为上述精确pane定位回归通过，不能拿66矩阵仅出现banner的断言替代。
- P2 / S02同证据：违反T09/103的“会话信息真实字段、不造model/tokens”及批准UI002“当前会话信息放右详情”的语义。提供真实字段仍必须归属于同一个当前会话，不能把tab provider与focused shell的sessionId拼接。完成条件为mixed agent/shell与ordinary shell详情都准确且翻译可用。

Design Conformance：已对照DESIGN §6/AC-081/082与UI002 final/app.js的agent panel/main/detail、工具补充和七个设置Tabs。实际新增工作区身份toolbar与既有生命周期技术字段用于保留原能力；纸/墨HU、terminal13/21、会话目录/页签/共享详情、窄宽上下split的组合没有借机重选风格。没有要求恢复原型虚构model/tokens/文件列表。复用Root66并独立查看1440 en paper waiting总览、390 split及390 info截图，确认实际组件与上述组合；这不等于本worker重新运行全视觉矩阵或逐像素批准，更不证明真实Obsidian/popout/PTY。

### 实际验证与复用限制

1. pnpm exec vitest run --config /tmp/huhu-t09-high-review/tests.config.mts --project dom src/modules/agent：最终退出0，29文件283/283。临时配置沿原dom项目与全部原断言，仅缓存放/tmp；第一次/tmp配置未能解析vitest/config而启动失败（126），补只读node_modules链接后原测试全绿，未改repo配置。
2. pnpm exec vitest run --config /tmp/huhu-t09-high-review/tests.config.mts --project unit src/modules/agent/ui/terminal/terminal-scheduling.test.ts src/modules/agent/ui/create/classify-input.test.ts src/modules/agent/core/terminal/terminal-core.test.ts：退出0，3文件28/28（19 UI unit+9 defaults/core）。
3. pnpm exec tsc -p /tmp/huhu-t09-implementation/tsconfig-agent-tests.json --pretty false：退出0；pnpm exec eslint src/modules/agent/ui --max-warnings 0：退出0、零警告。没有以scoped类型/lint替代全局build。
4. pnpm exec vitest run --config /tmp/huhu-t09-high-review/counter.config.mts：退出126，4条中1正控制通过、3条实证断言失败，对应S01一条与S02两条；split-counters-final.log保存输出。最初counter的shell期望沿新源写成同样不存在的agent.shell，已改为项目既有agent.inbox.shell，再次完整复跑仍红（Codex对Shell、s1对s0、agent.shell对Shell）。此harness修正没有修改产品源。
5. validate-specdev --review-scope --mode source-files --file逐项91：退出0；baseline82自hash、079 candidate86私有副本和当前91开始/结束原字节/模式核对均符合上文，drift=[]。
6. Root正式 /tmp/huhu-t09-lead-exit-final/result.json：回读status=passed、66 cases、errors=[]，inputDigest=41dcce01e38216406cfdec7bd7c35a0ffb81245f717a63d4e773efdd712377d9；其input与本91交集58个源逐项hash无差异。其它传递输入的foreign差异由Root记录，不把全工作区正在变化的闭包伪称全冻结。本worker按任务未重跑矩阵，未抹去第一次320 closed Sheet动画/overlay驱动失败。

Root fixture补丁已读：T09专属Electron alias的所有公开操作抛错；每Document toggleClass、leaf/view/getMostRecentLeaf均为真实链接所需最小端口。driver等待closed Sheet实际animation.finished，仍断言elementFromPoint命中；new tab查有可见rect的按钮，cleanup写入result.cleanup。没有改产品求绿。fixture确实使用生产AgentWorkspace、WorkspaceService、TerminalSession/xterm与17种真实表面，阻止真实外部操作；两个Document是同源iframe，不是Obsidian popout。正式result边界也明确写出这一点。

未重新执行无新风险的基础票/架构/CSS全图、--check及089预算时序；没有重跑正式66。全局tsc/build/lint/test:all、main.js/styles.css正式产物一致性、NOTICE，以及真实Obsidian主窗/popout/PTY/系统CLI/账号/clipboard仍归Root/T14，不在本报告声称通过。

## 问题与下一步

两项P2均需原T09 owner最小修复，路径集中在新增SessionInformation.tsx及相邻生产DOM测试：S01精确等待pane定位；S02focused provider与有效shell文案。候选绿色基础检查和Root66结果保留，不扩大为服务改写、风格重选或无限边缘重测。修复后由独立reviewer复验上述真实counter及相邻原测试，Root维护正式Evidence/状态与最终宿主验收。

本次报告已完成，未修改源码、fixture、CSS、依赖、规则、资产、Git/index或正式状态。return校验后释放本91输入冻结；后续改动另生成候选，不覆盖本REPORT。
