# T08 Root 验证安排（尚未执行的后续检查）

这是当前合同的检查安排，不是完成证据。固定输入后由实际命令和观察替换“待验”；真实Obsidian、账号、Provider任务及五平台实机仍交用户。根构建只在全部writer停止后执行。

## 行为接缝

| 风险与对应责任 | 要核对的实际入口 | 可观察标准 |
|---|---|---|
| AC-013/014 文本与提交、输入竞争 | 生产CLI → 同helper broker → Host → ControlRouter/Commands → 实际TerminalSession → 原native队列 → 官方Pi默认editor | 一个body与唯一Enter不可被后续user action插入；queued、应用完成、PTY written和任务结果语义分开；不是只验证fake调用次数 |
| AC-015/021 就绪与拒绝 | 官方CLI main实际loader/TUI/default editor，生产HUHU extension及新native binding | 新启动与真实working可成功；空白草稿、权限/登录/selector、错焦点/旧source/reload、改键重叠、未完成粘贴、IME/异步clipboard边界准确拒绝或确认；拒绝不得已有正文效果 |
| AC-016 水位与只读wait | 现Session.observeActivity及CLI/GUI共同业务方法 | prompt先捕获原tuple/N并取得监听额度，输入确认后只接受同源N之后事实；独立wait当前匹配；初始working、旧idle、同步事件、退出/失联/换源顺序真实可测；只保留latest |
| AC-017 取消与期限 | 原call.signal/首次capture、native/app操作及实际关闭 | 排队取消经owner证实零执行；已dispatch失联为unknown并保留原槽至真正settled；已输入后timeout/cancel只结束观察并保留completed；继续等不重发/不stop |
| 有界性与活性 | 原InputBudget、原writer/reply/outbox、CLI与目的隔离app IPC | 输入/metadata/完整progress/final提前计量；32物理槽、原字节/操作额度及retiring不绕过；塞满ordinary等待时query/stop、ACK/parser reply、其他SID/Browser继续；numeric exit不等待JS应用回执 |
| AC-018 被动读屏 | 原terminal.read和T05屏幕快照 | 返回捕获身份、范围、cursor/截断；不主动滚屏，不称完整答案；目标换代不能自动指向新运行 |
| AC-030 既有输入 | 现keyboard、材料paste、runner/原生结果接缝 | 中文组字不误提交，Ctrl-C复制/中断、kitty/win32和材料无Enter保持；runner完整原生结果不被屏幕或协调回执替代 |

官方Pi完整CLI验证可用它已提供的离线启动与隔离agent目录、loopback兼容endpoint fixture来运行真实AgentSession路径；明确记录受控服务边界，不冒称真实模型或用户账号。第三方源码保持原件；不得通过patch editor/onSubmit/Session来制造生产正例。已有B受控Session Proxy机制证明仍保持原范围，不升级其结论。

## 生产UI检查

沿DESIGN revision1 / PAGE-001、PAGE-003。现AgentWorkspacePage、workspace-view、TabStrip为可复用入口，不调整未分配布局组件或添加新leaf。新控制工具宽屏初始展开并尊重保存关闭；已有历史打开状态不能意外同时挤出两块右栏。低于600px按**容器**宽度用ownerDocument的Dialog，生产组件只挂载一个控制实例，避免隐藏副本重复监听或请求。

实际DOM任务和Chrome包括：当前Space默认范围、明确同Vault跨Space、重复名称下的稳定身份、目标与焦点分离；空/加载/缺Space/不支持/blocked/unknown；只发送与发送等待；timeout/cancel保留原目标并可只继续等；读屏的身份/截断；切Space/换代不重定位；隐藏/关闭/卸载释放观察但不误杀原运行。用户能回原终端处理原生审批；不添加通用允许/拒绝接口。

宽/窄与亮/暗、长名称/错误、200%等效缩放；桌面32px/窄屏44px操作目标、键盘Tab/Enter/Esc、Dialog焦点约束与原窗口返回、无外层意外水平滚动。真实Chrome使用生产组件和明确的受控后端，截图/trace/来源一同保存。原T06脚本可参考完整Enter packet（CR text）与真实controller foreground意图，不把CDP键事件未触发click误诊成产品焦点问题。

## 静态、构建和独立审查

按dev/testing选择受影响TS/DOM/native定向检查、类型、生产lint、架构、i18n、生成一致性、样式/包体、许可与helper校验；新Rust交同源immutable双bin，所有组合检查使用准确路径与SHA。未变证据只在依赖/环境仍有效时复用，不用旧T07 bin证明T08行为。Windows交叉检查不等于实机；已知范围外fmt/docs失败保留实际边界。

Root收到所有SOURCE STOPPED后从T08初始工作副本至最终候选冻结真实增量，补必要main.js/styles.css/notices产物，再由未参与T08实现的Astra/high独立审查两轴。只有整票实测、完整交付和复审均通过才推进review/done；局部阶段通过不关闭Goal Gate。
