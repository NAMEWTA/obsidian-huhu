# T08 活动阻塞未知与最终编辑器检查

这是 GP026 / Map27、原 A32/B15 写集内的接线澄清，不扩张支持的 Provider、平台或输入后端。Root 在 A008 接线时回读实际 T06 Session、生产 Pi Hook、Spec §3.4/3.5 与 AC-021 后确认；正常澄清沿原006/008，不重开或覆盖TASK。

`TerminalSession.bindActivitySource` 的 registration source 初始 `blocking.state` 是 unknown。只有 Pi 的真实 `ui_prompt_start` 对应 blocked，随后相同 blockId 的 `ui_prompt_end` 才记录 clear。尚未发生过弹窗的正常 startup/working 因而可以同时具有当前且已知的活动状态，以及 unknown 的阻塞观察。这不等于来源或活动状态未知，也不能凭无事件改写为 clear。

A 的前置检查继续拒绝 activity/source unknown、已知 blocked/permission、换代/换源、缺真实 registration 和不支持能力。只有已经核验的 Pi artifact、原生绑定与同 sourceInstance 路径，才可把单独的 blocking unknown 交给 B 的最终认证编辑器 gate 继续验证。此时没有输入效果，也不提前声称输入已就绪。

B 在原应用进程、原认证绑定、原 sourceInstance 上，以实际默认 editor、焦点、输入状态、阻塞/selector/login/overlay/autocomplete 与 Enter 规则作最终同步核验。只在这些条件实际满足时执行原生完整 paste 与唯一 Enter，并返回原 adapter-applied 回执。最终核验失败或仍无法判断时准确拒绝，不向其他后端重放；T06 的 blocking unknown 仍按原事实呈现。

所需测试包括：未发生过弹窗的官方正常启动与实际 working/steer 正例，以及同样 T06 blocking unknown 但真实应用处于 selector/login/错误焦点等状态时的零输入拒绝。前者不能以人工伪造 clear 解决，后者不能以“未见 blocked”替代实际 gate。已有明显阻塞状态仍在业务层直接拒绝。此澄清尚不是相应测试通过或 AC 关闭证据。

## 已验证输入观察范围

006回读官方公开接口时发现：regular与fullscreen的输入监听顺序不同，`Editor.setText`也不保证清除jumpMode。Root进一步回读官方 `dist/bundle/chunks/chunk-T726RZZU.js`，SHA `b09f9387bb838ee733d15a63d1af07876e0932381c2a9b7d42f74f22cd4d2947`：TuiBase按注册顺序调用listener，遇consume立即返回；TuiAltScreen在构造时提前注册handleViewportInput。其右键粘贴分支另外要求win32且非VS Code，不能把该源码条件冒称已执行的Linux异步右键粘贴负例。

首版app gate因此限定于实际公开SDK `TuiMainScreen.prototype` 的regular实例。显式fullscreen参数可在既有有限预检中返回unsupported，默认模式仍须运行时核实，不能因缺少参数就猜regular。此限制只界定已经证明的普通协作输入能力；fullscreen人工启动与操作保持，不修改用户参数或设置。它不宣称所有fullscreen输入在Linux上已被证明不安全。

上述接口名经006实际023/024官方main诊断修正：该版本virtual SDK导出`TuiMainScreen`与`TuiAltScreen`，没有先前推测的`TUI`；Root也回读同一`chunk-T726RZZU.js`的真实导出。025无诊断生产扩展以同执行实例的`TuiMainScreen.prototype`及`CustomEditor.prototype`严格匹配通过普通/working输入阶段正例，没有以类名、鸭子类型或另载SDK绕过原型检查。025仍用中间helper，且静态输入闭包记录有明确缺口，范围见`T-08-stage2-milestone-root-audit.json`，不是最终支持矩阵验收。

已观测到history/jump/clipboard/external-editor等动作，且公共API无法证明其异步状态或私有模式已经清除时，原binding可持续not-ready/unsupported直到结束。不能用setText清草稿来恢复资格，不能把这些状态标成原生权限blocked。UI保持原T06事实，说明当前协作输入能力限制并提供原终端入口；实际触发正反例由006/008后续交付，未提前记passed。
