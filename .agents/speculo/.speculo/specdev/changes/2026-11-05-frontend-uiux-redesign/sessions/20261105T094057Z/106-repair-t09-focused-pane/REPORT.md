# T09 聚焦窗格修复候选

Session: 20261105T094057Z
Task: 106-repair-t09-focused-pane
Status: completed

## 聚焦交接

已按103确认的两项P2完成最小修复，只修改SessionInformation.tsx与相邻DOM测试。横幅从真实TerminalSession的sessionState选择waiting/permission pane，调用现有workspace.focusSession定位；provider与其它详情字段统一读取focused pane metadata，shell复用既有agent.inbox.shell双语键。103真实newAgent→splitPane反例由3红1正控制变为4绿，新增仓库回归覆盖mixed/single pane与焦点切回agent。现冻结完整91源复合候选，停止写入，等待Root安排独立high复审；completed只表示本派遣交回，不表示T09正式验收完成。

## 产物与验证

实际workspace为/home/wta/projects/obsidian-huhu，沿原current，不建worktree、不委派、不提交或触碰index。HEAD为37fcede4210a19bcc2a74809e7fdd301e5717957；真实dirty baseline保存于/tmp/huhu-t09-focused-pane-repair/baseline.json，含91项原始内容、hash、mode，SHA256 2b6a7b696aa93321b3b9e75ef81d5b135e3e19029718b96d8e54584ee13f2ba0；baseline相对103原91 manifest字节/模式drift=[]。开始时git-status.txt与head.txt保存在同一tmp目录，既有dirty未覆盖。

交付快照：/tmp/huhu-t09-focused-pane-repair/candidate/保存完整91项实际字节和模式；candidate.json SHA256 fc9d522d13312f1f8edd651a2aa47b67afe66628de25ac4c1efbea5259b62856。修复专属repair.diff SHA256 12505f6a2ecb7e55cad3d68da193e97a75bac81e9c2b22d49cd5999672688872。相对本次真实baseline仅2文件变化，89项保持原hash/mode，均未删除或改变模式：

- src/modules/agent/ui/workspace/SessionInformation.tsx：SHA256 86a04550329c0663b83262d7eba7385f38be45d0d994ebdca663b16079a03645，mode 0o664。
- src/modules/agent/ui/workspace/SessionInformation.dom.test.tsx：SHA256 80fb386a8c604016b79c04bb36cf522da38ef33ee80301d2168ed6c72d456be8，mode 0o664。

没有修改service/core/platform/PTY/api/shared、词典、Root预算两个UI入口、fixture、资产、产物或正式状态/Evidence/index。等待目标key由tabId改为真实sessionId，保证同tab不同pane目标变化时沿原pending/error生命周期重置；背景attachManaged的await、期望runtime、owner/target迟到回执隔离与同步pending锁保持原实现，未添加launch或回答协议。详情仍用既有DetailPane且不挂载终端，WorkspaceLayout/TerminalHost与隐藏模型未改。

实际检查：

1. pnpm exec vitest run --config /tmp/huhu-t09-high-review/counter.config.mts：修复前退出126（3失败/1通过，日志red.log）；原始反例确认Codex≠Shell、s1≠s0、agent.shell≠Shell。修复后最终相同原harness退出0，4/4通过，日志green-counter-final.log。harness来自103且未修改。
2. pnpm exec vitest run --config /tmp/huhu-t09-high-review/tests.config.mts --project dom src/modules/agent/ui/workspace/SessionInformation.dom.test.tsx src/modules/agent/ui/workspace/page-tabs.dom.test.tsx：退出0，实际发现1文件5/5通过；后一路径没有匹配文件，不冒称运行额外测试。日志dom-final.log。替换原仅伪tab聚合state/activate调用断言的等待测试为真实WorkspaceService.newAgent、splitPane和TerminalSession路径，保留原真实metadata/no xterm断言；单pane与mixed分别验证实际focusedSessionId和底层focus目标，点击无新launch，waiting解除后横幅消失。mixed provider测试还在同一Dialog切回agent，provider与显示sessionId同步变化。
3. pnpm exec tsc -p /tmp/huhu-t09-implementation/tsconfig-agent-tests.json --pretty false：退出0，日志types.log。
4. pnpm exec eslint src/modules/agent/ui --max-warnings 0：退出0，零警告，日志lint.log。
5. validate-dispatch.mjs --stage dispatch及return：退出0，无errors/warnings（return在写后执行）。

### Design Conformance

继承change DESIGN revision3 / digest49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66、agent页面、UX-AGENT-1与AC-081。仅纠正“查看原终端”指向和“当前会话”字段归属，沿现有Button/Notice/DetailPane，不改批准布局、文案或样式。原103/Root正式66视觉基线未重跑；本次DOM证明身份与定位，不冒充真实Obsidian/PTY、像素或多窗口验收。

未重跑283全agent DOM、28unit/default、Root66矩阵、全局build/lint/test:all或产物一致性；任务要求避免无差别重验与worker写产物，相关集成/浏览器复验由Root在稳定候选上执行。未新增推测状态树测试，背景attach分支未修改也未另作新通过声明。真实Obsidian/popout/系统CLI/账号/clipboard仍归Root/T14。

## 问题与下一步

两项已知反例均已转绿，无新增已确认问题。Root对冻结91完整复合候选安排独立high审查，复验103原counter与本次相邻DOM；随后按受影响范围决定正式矩阵/产物验收。未把实现者自查称为独立审查，不推进正式Ticket/Goal/Evidence状态。return校验后本worker停止所有写入，等待下一明确派遣。
