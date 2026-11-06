# T09 实现候选回报

Session: 20261105T094057Z
Task: 079-implement-t09-agent
Status: completed

## 聚焦交接

T09 候选已冻结，停止 owned 文件写入，交 Lead 的 high 独立双轴审查与真实浏览器验收；这里的 completed 仅表示派遣候选交回。先消除了 TerminalTabView/WorkspaceLayout 的 panels v3 导出阻断，继而完成空间 Tree、会话分组及历史/收件箱/账号入口、等待横幅、会话信息 DetailPane、历史/工具 DetailPane、全票共享控件 API 与纸墨 token 迁移。保留现有终端实例、领域调用、会话恢复、控制回执、收件箱核对及备份恢复协议，没有启动真实 CLI、修改服务/PTY/core 或操作 index。最终候选 47 个变化路径、0 删除，源文件/模式/摘要与真实 dirty 起点均保存于本机；没有改动正式 Evidence、票据状态、产物或共享词典。

## 产物与验证

- 起点：HEAD 37fcede4210a19bcc2a74809e7fdd301e5717957；实际全仓 dirty/staged 状态、owned 工作树/index diff、编辑前逐文件内容/模式/摘要在 /tmp/huhu-t09-implementation/baseline-status.txt、baseline-diff.patch、baseline-index.patch、baseline.json。原有改动未清理、未暂存。
- 冻结：/tmp/huhu-t09-implementation/candidate/（全部 owned 源/测试/fixture 副本）；candidate.json（逐文件模式/摘要、相对真实起点增改删）、candidate.diff、changed-paths.txt。candidate.json SHA256：012f30b746dfea4760a4cbd0419810dc34b1ceff8aa3a9f4fc6b37bce1bf34d6。
- 批准输入：T09 / Map revision 27 / DESIGN revision 3、digest 49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66，UI-002 final agent 组合；已读 dev/ui、适用 UI/宿主/i18n/测试/许可与 SpecDev I/设计/范围/协调合同。沿用已交付共享栈与其来源，没有新增依赖或从外部复制实现。
- `pnpm exec vitest run --project dom src/modules/agent`：最终完整运行 29 文件/283 项通过（退出 0，dom-final-candidate.log）；其后最后的会话详情键、侧栏入口/分组与右栏互斥小改由 3 文件32项通过（last-surface-tests.log）及最终父页面16项通过（final-parent-dom.log）承接。
- `pnpm exec vitest run --project unit src/modules/agent/ui/terminal/terminal-scheduling.test.ts src/modules/agent/ui/create/classify-input.test.ts`：2 文件19项通过，退出 0（unit.log）。
- `pnpm exec tsc -p /tmp/huhu-t09-implementation/tsconfig-agent-tests.json --pretty false`：退出 0；只选择 agent UI 测试并继承项目测试配置/skipLibCheck（scoped-test-types.log）。
- `pnpm exec tsc -skipLibCheck -p /tmp/huhu-t09-implementation/tsconfig-fixture.json --pretty false`：退出 0，包含生产入口与最终丰富 fixture（fixture-enriched-types.log）。
- `pnpm exec eslint src/modules/agent/ui --max-warnings 0`：退出 0（lint-complete.log）。中途 unbound-method 与 effect 内同步 setState 的红灯已修复，没有禁用规则。
- `node scripts/verify-architecture.mjs`：退出 0，1390 模块无区/宿主/desktop/barrel/循环违规（architecture.log）。
- `node scripts/lint-css.mjs`：退出 0（css-candidate.log）；`git diff --check -- <owned roots>`：退出 0。
- `node scripts/ui-review/run.mjs --suite frontend-redesign --ticket T-09 --matrix redesign --out /tmp/huhu-frontend-redesign/T-09 --check`：最终冻结源码真实 bundle 预检退出 0（frozen-preflight.log）。0 matrix cases / preflight 只是打包与适配器检查，没有宣称浏览器通过。
- 全仓 tsc 仍报告其它票旧 Button/Badge 消费者与 TaskEditor 返回值问题；未发现 agent owned 的诊断。最后两个全局长检查会话以 126 返回，因此不报告全局 build/types 已通过。完整全仓日志保留在 types-candidate.log / test-types-candidate.log；本票以 scoped 类型检查实际退出 0 为证据。

## 实际表面、字段与动作

| 表面 | 实现与保留的实际行为 |
|---|---|
| 空间目录/创建 | SpaceNavigation 复用 Tree 键盘与选择；保留完整 ID/名称、创建、重命名、归档精确计划。选择和创建/选目录增加同步 Promise 锁及 owner 销毁隔离；SpaceForm 保留目录、外部选择回执、IME Enter、失败草稿/重试。 |
| 会话目录/入口 | AgentSidebar 默认按真实 pane.spaceId 分组，并保留状态/agent/无分组、筛选、折叠、搜索、背景/恢复记录与 lifecycle 动作；新增真实历史/收件箱/账号入口，账号进入 terminal settings/accounts。 |
| 标签/分屏 | 复用原工作区领域模型、DND 和现有标签动作；唯一 Resizable 包装 + v4 GroupImperativeHandle/groupRef/orientation/id-keyed layout、百分比字符串 min/defaultSize。只持久化 meta.isUserInteraction 的 requestedLayout；外部比例同步、窄宽投影/重置不回写模型，不添加 v3 alias 或第二拖动状态引擎。 |
| 终端/等待 | TerminalHost 的 screen/焦点/隐藏恢复/活动回执路径保留。TerminalView 改用 hu-term 背景、前景、cursor、selection、ANSI16 与 hu-font-mono；保留个人字体/字号/行高设置。等待横幅既覆盖当前标签 waiting/permission，也覆盖背景 managed 当前 blocked；动作只 activate/attach 已有会话，挂起时去重并隔离迟到回调，不发送 allow/deny。 |
| 会话信息 | 新 SessionInformation 复用 DetailPane，展示实际标题、状态、provider、accountId、spaceId、cwd、持久 sessionId、nativeSessionId 与真实 runtime error；详情开关不参与 TerminalView key/生命周期。原型示意的模型/tokens/改动文件若当前端口未提供则不虚构。 |
| 历史/控制 | 删除父页面自制 history splitter/指针键盘状态，历史与控制/收件箱统一 DetailPane；保留历史源身份、预览、复制、筛选/分组、分页/虚拟化、恢复确认和失败提示。控制仍使用原 terminalControl 请求/进度/收据/继续等待/取消/stop，增加同 owner 同步去重。 |
| 收件箱 | 保留 current/all scope、精确收件人、完整分页、read 与 ack 分离、pending/unknown/settled 观察、fresh-primary 核对/移除、来源/正文/发送真实回执；新增 UI Promise 同步锁、切目标/范围/销毁隔离，旧收件人回执不清空新草稿。引用数量改 t()。 |
| 用量/设置 | 保留真实聚合、范围/provider/cwd/热力图/会话统计；热力图转 hu-chart。保留 agents/terminal/accounts/usage/quick/skills/backup 全部 Tabs 和实际字段/动作；共享 Button/Badge 新 API、纸墨 token 与最小字号全面切换，AgentCatalog 动作行可换行。 |
| 不可用 | AgentUnavailable 是现有页面无 controller 分支的共享生产组件，fixture 使用同一分支；没有按窄叶宽度推断移动设备或启动桌面能力。 |

API/词典交接：没有新增服务 API。Lead 已写入 agent.sessionInfo / agent.waitingBanner / agent.inbox.referenceCount / agent.sessionId 的 en/zh；Lead 已在只读 core/settings 调整默认13及21/13，UI 不猜测或迁移用户既有显式设置。上述共享修改不属于本 worker 冻结写集。

## 原风险承接与 Design Conformance

- panels 原 v3 data-panel-group-direction 断言改接 v4 separator 的 aria-orientation；真实 offsets/几何参与库测量。原“mount不回写方向/比例、外部同步无echo、键盘可写”保留；v4 库默认键盘步长5%，断言相应更新，没有自造旧10%键盘引擎。
- 空间原自写 Home/End 导航由 Tree 承接；长名称/完整ID、Home/End 后焦点到达再 Enter 的精确选择、归档 membership/cancel/stale 风险继续通过。
- 原 narrow history / filter / confirmation 44px布局空间风险保留于原 DOM 测试；共享 DetailPane 的 owner Sheet/Escape/触发器 return 和 observer 释放由父页面测试承接。没有删除风险测试来获得绿灯。
- 新测试覆盖等待仅定位、不隐式 launch、实际会话身份详情、不合成缺失模型/tokens、Inbox 双击去重及旧目标迟到回执不清空新草稿。既有终端 IME/焦点、renderer隐藏、第二Document、失败恢复测试全部保留。
- 生产 fixture：实际 AgentWorkspace、WorkspaceService、TerminalSession、TerminalView/xterm、共享组件和完整设置页；内存/合成screen端口，真实外部进程/文件写入入口拒绝。覆盖 terminal/split/waiting/info/new/unavailable/empty/history/inbox/control/usage/agents/terminal settings/accounts/quick/skills/backup、双 Document、trusted pointer 的 info/new、IME composition、隐藏恢复与cleanup。历史具有实际类型样本，账号/技能/收件箱呈现端口的真实 empty 状态。
- 像素/命中/字体/纸墨、1440/390/320/zoom2/粗指针、实际 CDP IME 与 fixture 运行错误、真实 Obsidian popout/native66 均待 Lead 运行并审查。本 worker 遵守仅 --check，没有截图也不声称严格像素一致。现有额外工作区 toolbar、生命周期技术字段、历史以详情容器展示等实际组合，需要 high 规范轴与 UI-002 对照判断；本报告不以源码 token 替代该门。

## 问题与下一步

候选已停止写入。请 Lead 先 high 独立审查，再统一生成 styles/assets 并执行 T09 浏览器矩阵；任何 fixture 运行故障、共享控制缺口或像素/组合差异据实际结果开修复派单，不覆盖本不可变 REPORT。必需真实浏览器/宿主验收尚未完成，T09 正式状态仍由 Lead 保持待验收；未进行提交、推送、发版、真实CLI/账号/网络操作。
