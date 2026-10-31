# T-09 workbench-panels：只读实施前预检

2026-10-25；`/root/implement_t01`，6.1-sol/xhigh。本轮只读，不解锁后票。依据 current T-09、Spec §3.2/3.3/3.5、AC009/061、implementation-contracts，回读 DESIGN rev1 PAGE-001/003 与 UI-001 两份批准记录；设计摘要仍为 `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab`。复用既定参考及 dev/ui 规则，不新增依赖、研究或代码移植。**T-03 A/B 正在实施：其写集内源码仅是时点观察，不冻结、不对未交付候选作审查结论。**

## 已有能力与最小改造位置

- `AgentWorkspacePage` 已用一个 ReactSurface，导航 Portal 到 shell 的 navigationEl；局部 view 保存 history/width/jump。隐藏时撤销可见注册、关闭菜单/Jump、取消待确认 Promise，关闭时清理；保留此生命周期，不另建路由或全局页脚。当前 getTarget 只回报 terminal/running，不能冒充稳定 Session/runtime/pane 的控制目标。
- `WorkspaceLayout` 已有 tabs/groups、DndContext、四组上限、resizable panels；三类内容为 terminal/browser/page，非活动内容 hidden+inert。`TabStrip/WorkspaceTab` 保留拖动、pin/color、关闭范围、滚动溢出、方向/Home/End/Delete/中键与快捷键。已有两个布局层：group tree 与终端内部 pane tree，CLI 不得建立第二份布局。
- 当前 `AgentSidebar` 的 SessionCard 来自**展示 tabs**；`SpaceNavigation` 已有 Space 选择、创建/重命名、加载/错误与键盘导航。T-09 应消费 T-03 最终持久 Session/后台运行投影，使 detach 后仍可定位，不能把 tab 缺失当会话不存在。JumpPalette 同样目前主要发现 tabs/closedTabs/history，应扩展投影而保留旧入口。
- `TerminalTabView` 当前以 session/runtime 字符串作 pane 树叶及焦点键，持有 pane header、close、输入焦点与 resize 回写。其内部树已通过 imperative setLayout 跟随外部 ratio；外层 group tree 当前主要传 defaultSize。后者需用“服务修改比例→实际面板几何”测试闭合，**这里只列静态验证接缝，未复现布局缺陷**。独立 paneId 应由同一布局 owner 映射稳定 Session/当前 runtime，不能直接把 PID/nativeSessionId 当公共 paneId。
- T-03 活跃观察：WorkspaceService 已出现 managed list/get/attach、presentation revision 和 detach 式 close；Controller.target 仍是旧交互命令的当前/最近焦点 fallback。这些不是冻结公共接口，也不作为前票问题。T-09 精准操作须消费验收后的 resolver，不复用该 fallback。
- 保留 board/usage 单例页签、历史抽屉、搜索/材料/终端设置及既有 Dialog；自动化仍在其 rail owner。新建直接进入原生 TUI，不增加前置聊天任务。BrowserTabView 已通过 Browser 公共 api 取得既有 page/chrome，并处理所属 Document 的 mount/unmount；保留网页/配置/下载关闭反馈，无 Space 网页入口不受限。Agent 停用后的 Browser owner 迁移是 T-13，不能假称本轮已实现。

## 必须保留的前序接缝（未来合同，签名待交付）

| Owner | T-09 只消费的最小能力 |
|---|---|
| T-03/04 | 精确 Space/持久 Session/runtime 引用与后台列表、同运行 attach；detach 不 stop；expected runtime、stop-requested/exited/lost、归档/恢复不自动启动。确认期间代次变化必须重验。 |
| T-05/06 | 一个 headless 屏幕/尺寸 owner；视图隐藏仅释放显示订阅。活动/连接/未读分开并带代次和 sequence；unknown 保持可见，待处理只定位原 TUI，不造统一自动审批。 |
| T-07/08 | 同一 control registry/同源 schema、scope 和错误回执；有界输入/read/wait/取消；T-09 注册 pane list/attach/focus/split/resize/close。不得另造 IPC、输入队列或屏幕 owner。 |

控制抽屉单独保存显式目标，与浏览 Space、active tab、键盘输入焦点分离。目标选项与实际请求必须显示同一 Space/Provider/稳定 ID；跨 Space 标“同 Vault”，focus 只切显示不迁归属。目标停止/归档/删除/换代后保留准确失效说明或清除并禁发，不选新空间首项补位。此要求来自 Ticket LOG-028 的**已复现原型问题**，不是对当前尚无控制抽屉生产代码的复现。后台创建/消息/状态不可抢焦点；split 既有目标不能沿用只会新建 Shell 的旧 splitPane 路径。

## 写集核对与拆分建议

当前 ui/workspace、sidebar、tabs、jump、create、control，core/workspace，workspace-service 与 services/control 已覆盖主要切片；缺口须在派单前由 Root 修合同：

1. **需补** `src/modules/agent/ui/terminal/TerminalTabView.tsx`、`TerminalTabView.dom.test.tsx`：pane identity/header/焦点文字、目标定位及生产树几何/close 生命周期均在这里。不是授权扩大到全部 terminal UI。
2. **复用现有 view store 承载工具抽屉/显式目标时补** `src/modules/agent/services/workspace-view.ts` 及拟新增 `workspace-view.test.ts`；若仅在 AgentWorkspacePage 局部状态实现且无需恢复，则无需此扩写。当前 store 只有 history/width/jump，不能说已有目标模型。
3. **等 T-07 真实产物后补精确路径**：canonical 命令/结果描述、生成器产物及 CLI 黑盒 fixture。当前 `services/control/**` 不能自动授权 shared/native 或 Rust；预检的 control-schema.json 等均是拟名。若注册可在该目录闭合，Controller/module 无须扩写；确需装配时才申请 `services/controller.ts` 与对应精确测试。core/terminal/layout.ts 可先作为纯树算法复用，只有实际类型迁移需要才单独申请，不预先扩大。

可安全 A/B：先单 writer 冻结 pane projection/操作端口；A 独占 core/workspace、workspace-service、services/control 与其测试/CLI schema 协调；B 独占页面、workspace/sidebar/tabs/jump/create/control、窄授权 TerminalTabView 与 DOM 测试。workspace-view、i18n、styles 各指定唯一 writer；B 不改 A 的业务 owner，A 不伸入 UI。Root 保持正式记录、统一生成物/构建与最终集成。等待 T-03 验收后再切边界，不干预其候选。

## 可回读验证与未运行边界

复用 `page-tabs.fixture.tsx` 的真实 WorkspaceService + TestProviders、WorkspaceLayout/Sidebar DOM 测试及 AgentWorkspacePage 真实 AlertDialog 的 hide/unmount 取消测试；扩成同一服务上的 GUI 与 control handler 互操作：attach/focus/split 指定第三对象/ratio/close 双端回读一致，Space 归属不变、detach 不结束运行、后台不抢焦点。终端 DOM harness 当前 mock TerminalView，只能证明渲染器采用/销毁，不能当真实 PTY、输入/屏幕或几何通过。

优先增加跨 Space 保留 target、同名歧义、目标换代/归档后禁发、晚确认不误操作、隐藏/切 leaf 后不回焦到新 leaf 的回归。复用 keyboard-scope 测试保留 Obsidian Scope、IME 与终端键；用真实 Portal/ownerDocument 验证 Esc/Tab/焦点返回。group/pane 比例须验证外部服务更新能反映到 renderer，并保留 drag/group/Browser/page tabs 回归。测试取消 wait 不触发 stop、不重发输入。

未来验收脚本可复用 `agent-page-tabs.mjs` 的隔离 fresh-vault/CDP、主题/宽度/溢出观测，不能沿用旧脚本注释假称自动化页签仍存在。代码自动化与 Root 构建负责可运行夹具；真实 Obsidian 主窗/专注叶子/popout、>=960/600–959/<600、亮暗/Minimal/长中文/200%/reduce-motion、真实 Browser 与 Provider TUI、五平台由用户验收；窄屏不等于移动端 PTY。原型截图仅证明设计，不代替生产截图。

本轮**未运行任何测试、lint、build、宿主/helper/Provider/CLI 进程或 Git 操作**，未改仓库/正式状态/数据。49 份读取/复用输入的时点 SHA/字节与 T-03 可变标记见 `/tmp/huhu-t09-source-sha.json`，清单 SHA256 `93bfbbb460d217d75e9f19eb41af830464c3d90edee2df42c6be2e443fbcb4aa`；它不是冻结快照或稳定性承诺。预检完成，停止读取及写入，等待 Root。

**STOPPED**
