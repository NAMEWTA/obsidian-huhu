# T06：T05 之后的待处理入口 UI 只读准备

观察日期：2026-10-25 UTC。执行者：`/root/prepare_t05_screen`。来源 SHA、字节与 UTC 见同名 source observation JSON。

**结论：T06 待处理导航的最小 UI 写集仍可限定为 `AgentSidebar.tsx`、其既有 DOM 测试和 `agent/i18n.ts`。**现有全 Vault managed 投影、稳定三元身份和附加结果可复用；活动证据、seen 水位及精确 pane 定位保证须由 A 冻结后消费。当前右侧只有历史工具，`ui/control/` 并不存在；不能把票据里的拟建目录当作已存在控制宿主。

本次复用 `evidence/T-06-preflight.md` 的 Provider/许可/活动研究，不重做能力认证。已回读当前票据、批准 DESIGN revision 1（digest `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab`）、相关合同与当前实际源。T05 生产保持 SOURCE STOPPED；T06 未解锁。没有实现、测试、构建、helper、Provider、真实宿主或新外部引用；不改正式状态和仓库。

## 实际入口和可复用接缝

路径以下以 `src/modules/agent/` 为根。

| 当前源 | 已有行为 | 对 T06 的直接含义 |
|---|---|---|
| `services/workspace-service.ts:111–143` | `getManagedSnapshot` / `subscribeManaged` 是缓存投影，包含当前 Vault 所有 Session；`listManaged(spaceId)` 才按 Space 过滤。读/订阅不启动进程。 | 待处理索引读同一投影，不另造运行 manager。以 `spaceId/sessionId/runtimeId` 标识当前代次。 |
| `ui/sidebar/AgentSidebar.tsx:252–313` | `ManagedCard` 捕获 `expectedRuntimeId`，调用 `attachManaged(...,{focus:true})`，有 busy、卸载防护、loading、pending/error/not-running 反馈。`ManagedSessions` 只列当前 Space，并排除已附加 runtime。 | 复用交互骨架；待处理不能照搬“当前 Space + 排除已附加”的过滤，否则跨 Space、背景和同 tab 未聚焦 pane 会漏项。 |
| `ui/sidebar/AgentSidebar.tsx:43,163,323`；`core/workspace/sidebar.ts` | 旧会话卡是 tab，点击只 activate tab；permission/waiting/failed/interrupted 同属 attention。无 agentId 的 shell 优先归 terminal。 | 不把 attention 全称为审批；waiting 不等于 permission。Shell 手动启动的 Provider 必须来自 A 的实际发现投影，不能从旧 tab.agentId 或标题推断。 |
| `services/workspace-service.ts:214–263` | `attachManaged` 检查 expected runtime；跨 Space 的显式 focus 会切 Space，并用显示意图/代次检查拒绝过时操作；返回 attached/pending/not-running/failed。没有 launch fallback。 | 用户显式选择才导航；保留结构化失败及原终端入口。失效项不能自动重新启动或切到新代次。 |
| `services/workspace-service.ts:637–673` | `focusSession(runtimeId)` 会改目标 tab 的 focusedSessionId；`setVisible` 和 activate 清理旧 tab.unread。 | 精确 pane 可复用已有动作；旧 unread 只是布局完成提示，不是活动 seen 或邮箱 ack。 |
| `ui/terminal/TerminalTabView.tsx:127–129` | active/focused 变化进入 T05 `setVisible/setFocused/focus` 链。 | 通过布局/目标 pane 接线进入现有焦点与尺寸 owner；不直接找 textarea 强行聚焦，不绕过 T05 owner。 |

**精确 pane 的静态缺口，尚未运行复现：**`WorkspaceService.attach` 第 505–513 行发现 runtime 已在现有 tab 时，只调用 `activate(found.id)`；后者聚焦旧 `focusedSessionId`。因此当 split tab 中 A pane 仍聚焦，而待处理 runtime 是 B，`attachManaged` 可返回 `focused:true` 却没有选择 B。建议 A 的定位动作统一保证“成功 focus 对应捕获代次的准确 pane”，复用 `focusSession`；B 不应自行用旧异步结果兜底切焦点。还需覆盖 attach 合并等待与用户中途改变前台意图的情况，不能以修一分支宣称完整通过。

`openManagedRecord` 可复用作明确的只读记录入口，但 stale/not-running 后不能无声把“处理当前审批”改成重启/继续。`controller.show(runtimeId)` 是 void 且仅日志反馈，不适合作为待处理按钮的唯一结果通道；按钮直接消费现有结构化 attach 结果更清楚。

## 最小 UI 实际写集

| 路径 | 本票窄用途 | 当前票据授权 |
|---|---|---|
| `ui/sidebar/AgentSidebar.tsx` | 在既有会话树/待关注信息中接入 A 活动投影；保留 Space、Provider、名称、稳定身份和准确状态文字，显式“查看原终端”动作；复用已有样式、busy 与反馈。 | 已列 `ui/sidebar/**` |
| `ui/sidebar/AgentSidebar.dom.test.tsx` | 生产组件接线、跨 Space/无 pane/分屏、旧代次、错误/加载/空态和键盘回归。 | 已列 `ui/sidebar/**` |
| `i18n.ts` | 所有新增状态来源/unknown/定位反馈同时 en/zh；最终键名随 A 枚举冻结。 | 已列 |

这个最小入口无需新建 `ui/control/`，也无需修改 terminal renderer、Fit、样式或共享组件。完整普通 prompt/wait 属 T08；邮箱/read/ack 属 T10，不在本次准备中提前实现。

若 Root 把批准 DESIGN 的右侧按需控制宿主也明确分配到 T06，实际还要补精确写集：`ui/AgentWorkspacePage.tsx`、`ui/AgentWorkspacePage.dom.test.tsx`、`services/workspace-view.ts` 及其就近新增状态测试；`ui/control/**` 虽已列，不能单独完成宿主。当前 page 只挂历史抽屉，page-view store 只有 history/historyWidth/jump，show/getState 也没有控制开闭状态。需复用现有页面根、ownerDocument、Portal 与叶子保存机制，遵循已批准的宽屏/窄容器工具行为；不能把 history 的当前可调宽度/绝对覆盖直接冒充 DESIGN 的控制 Dialog。这里不选新风格，也不自行增加路径授权或冻结组件文件名。

## 必须等 A 冻结的领域字段/动作

现有 `ManagedRuntimeSummary` 只有 runtimeId、phase、activity、inputReady、pid、exit、error、stop/termination；`ManagedSnapshot.revision` 是投影版本，不能充当 activitySequence。当前 `session.setActivity` 仅存本地 activityAt 和 activity；`TerminalSessions.focus` 也没有 seen 效果。

| 所需语义（不是新 API 定名） | B 必须等待的内容 |
|---|---|
| 活动证据 | 同代次 activitySequence、来源/来源健康、观察时间与失效原因；重复相同枚举仍可能是新活动。unknown/来源失败和连接终态分别表达。 |
| 能力发现/前台身份 | Shell 内手动启动后的实际 Provider/版本或未确认、能力支持/不可用/未知证据、前台归属/变更失效语义；启动时 agentId/accountId 不是运行中证明。 |
| 待处理与 blocked | permission、等待问题、普通输入受阻的稳定有限原因及准确可展示文案/能力提示；不靠屏幕文字或 attention 组猜原因。inputReady 不等于审批安全或任务成功。 |
| seen | 捕获 runtimeId + 活动水位、何种真实可见/显式阅读算 seen、幂等更新及与新活动竞态的结果；不能把点击、attach、tab.unread=false 自动视为所有活动已读，更不能改 mailbox ack。 |
| 读取/订阅 | 初始活动快照接后续证据无遗漏的接缝，以及迟到旧 Hook、已终止 runtime、模块停用后的结果。T05 contentSequence 不能替代活动水位。 |
| 定位结果 | 保留已有 stable triple/result union；补明确的精确 pane focus 保证、等待/合并中的前台意图规则与过时结果。 |

建议 B 的交互顺序：从当前行捕获稳定三元身份及活动水位 → 用户显式选择 → 调用带 expectedRuntimeId 的定位 → 按结果保留 loading/error/unknown → 通过正常布局令准确 pane 可见/聚焦 → 达到 A 冻结的 seen 条件后只提交该捕获水位。期间到达的新活动仍应待处理；展示事件本身不抢焦点。是否显示“查看原终端”不依赖已有审批适配，unknown 也保留人工原 TUI 路径。

## 后续必须实际验证（本轮全部未运行）

1. 同 Vault 跨 Space、无 pane、已 detach、已附加但未聚焦的 split B pane 均可找到；重复标题不误选，返回准确代次，不启动新进程。
2. 权限/等待、failed/interrupted、连接失败、来源失效/unknown 文案有区别；Hook/能力未确认不伪报 idle/可审批；Shell 手动启动后的身份随真实证据更新。
3. 旧代次点击、定位等待中退出/替换、切 Space/切 tab/隐藏/卸载、重复点击及合并 attach 均保留正确结果；事件不改前台，错误不自动重试或输入。
4. 新活动在定位/seen 之间到达、重复同状态证据、同 tab 其他 pane 完成时，只有确认的水位被 seen；现有 tab unread 与邮箱 ack 分离。
5. 原终端人工允许/拒绝后按真实证据继续同一会话；UI 不发送允许键、不新增通用审批弹窗、不绕过 Manual/YOLO 既有首次确认。普通协作 prompt 的 blocked 拒绝由 T08 组合复验。
6. 生产 Sidebar DOM 的正常/空/加载/错误/长名/键盘焦点；所属窗口 Portal、隐藏/卸载；窄容器、200% 缩放和既有主题。若增加右工具，再验证 Dialog 约束/焦点返回与叶子开闭记忆。

可沿用 `AgentSidebar.dom.test.tsx` 现有稳定身份/代次去重、无 launch fallback、取消和生命周期反馈夹具；`AgentWorkspacePage.dom.test.tsx` 已有隐藏/卸载取消、深链及所属 document/focus-return 接缝。它们目前没有证明上述新增活动/seen/精确 pane 行为。真实 Codex/Claude 允许/拒绝及能力差异仍按票据交用户实机验收，受控 Hook/DOM/浏览器不能代替。

## 来源与停止

完整 29 份来源摘要及末次漂移检查在 `/tmp/huhu-t06-ui-after-t05-source-observation.json`。本轮无新依赖、外部代码或 Provider 官方能力主张；复用原预检并保留它的未验证范围。JSON 的 SHA 由交接消息提供。

READ-ONLY SOURCE STOPPED。仅交付本报告和 source observation JSON；未解锁 T06，未改变 T05 停源状态。
