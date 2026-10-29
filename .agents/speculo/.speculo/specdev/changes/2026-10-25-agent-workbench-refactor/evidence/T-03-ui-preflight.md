# T-03 UI 只读预备

已回读API提案、Ticket、批准A方案PAGE-001、4组件及相关DOM；**未改仓库，未跑测试/构建**，不解锁T03。21份当前观察SHA见 `/tmp/huhu-t03-ui-observation.json`，清单SHA `d387ad30e8777e30c00ed16afd6872b8608671e800f7f59e599f70c7e3799fea`。DESIGN digest `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab`。

**最小接线可行，无需提前重构Sidebar：**

- **Omnibox/NewTabMenu：** 沿cmdk加入可选名称、后台checkbox，Shell/六Agent调用A的createManagedInteractive，捕获本次显式Space/group；缺Space由服务picker，不重读焦点猜目标。managed仅created才onDone；cancelled保留输入，failed按messageKey呈现，effect unknown不自动重试。保留quick commands、Browser/URL/搜索、设置、切tab与原分类。
- **Sidebar：** useSyncExternalStore读取A缓存snapshot，稳定绑定subscribe/getter，不现场创建snapshot数组，不另建业务store。保留SessionCard、过滤/分组和browser/page导航，只补未附加managed条目。去重覆盖所有pane：有runtime按当前runtimeId，无runtime的restored按(spaceId,persistentSessionId)；旧代次tab不能隐藏新运行。条目区分pending/background/detached/failed/restored，attach带冻结目标及expectedRuntimeId；pending仅提示，not-running保留记录，不自动spawn/续接。
- **TerminalTabView：** 保留TerminalHost、跨document/retention及全部copy/paste/search/material/rename/split/zoom菜单。pending/failed/disconnected/restored准确展示，不能把inputReady当通用TUI或任务成功。close/closePane交A仅detach；活动runtime用closeView/closeViewHint提示可回来，恢复/退出不谎称仍运行；明确end/stop仍确认并终止。普通restored打开零launch，仅原明确继续/重启可启动。
- **焦点/尺寸：** A负责foreground迟到意图门；B修NewTabMenu无条件onCloseAutoFocus，不能在用户已切tab/窗口后抢回终端。取消/失败不误成功；保留IME、箭头/Enter、Escape、所属document Portal与回焦。沿共享Radix/令牌和现有Sheet档位；长名可查完整title、状态非仅颜色、桌面32px/窄屏44px目标，不提前改T09整体侧栏。

| 后续最小接缝（本轮未运行） | 必要矩阵 |
|---|---|
| Omnibox.dom + 新create/NewTabMenu.dom.test.tsx | 前/后台+名称+Space冻结；取消/失败不onDone；pending禁重复；六入口/Browser保留；迟到结果不抢焦点、IME/键盘 |
| AgentSidebar.dom.test.tsx | snapshot稳定/退订；多pane/旧代次去重；各状态与attach结果；原rename/split/copy/material/真实end、board/usage/browser导航 |
| TerminalTabView.dom.test.tsx | detach/stop分离，活动提示；普通restored零launch；既有跨document与每pane状态、关键上下文菜单不退化 |
| 局部生产组件检查 | 正常/空/加载/错误/失联/恢复；亮暗、≥960/600–959/<600、长中英文/200%缩放/焦点；不冒充用户真实E2E |

**写集缺口：无。** 未来B仅create/**、AgentSidebar.tsx/既有DOM、TerminalTabView.tsx/既有DOM；新菜单DOM在create/**内。A先冻结DTO/方法/en-zh键；B不改服务/core/i18n、TabStrip或workspace fixture。若需统一覆盖TabStrip等关闭提示，A在close/closePane成功接缝报告既有hint即可，不扩B写集。等待Root正式Packet，无需用户新决定。
