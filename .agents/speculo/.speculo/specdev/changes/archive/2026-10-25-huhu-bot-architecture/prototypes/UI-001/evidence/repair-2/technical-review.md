# 最终原型技术回归记录

**本轮技术检查通过：70 个 screenshot case、308 条断言、0 findings、0 console/runtime errors。** Chrome 153.0.8010.47 / Node v26.11.1 / Linux Xvfb；所有操作、实际几何数据、时间和环境在 `observations.json`。源与合同文件只读，SHA-256 测前测后相同。旧 browser/observations/screenshots 和 repair-1 均保留原位。

## 复跑

```sh
node .agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/prototypes/UI-001/evidence/repair-2/run-browser-check.mjs
node .agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/prototypes/UI-001/evidence/repair-2/create-contact-sheets.mjs
node .agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/prototypes/UI-001/evidence/repair-2/check-evidence.mjs
```

执行范围保持上一轮完整矩阵，未降低断言。final 与 candidate-a 在 1440/390 实开；final 另测 800，六页全部 29 个声明状态均出现。原型的审批拒绝/确认、子任务停止、恢复/失败/离线、记忆隔离/修订/全局提案、资料授权/撤销及删除核查路径完成。创建/编辑 Bot × Escape/取消/关闭六条路径共 42 条断言通过，检查提醒、保留值、继续编辑、明确放弃、焦点恢复、无修改退出和保存。

真实填写使用 CDP 键鼠、Ctrl+A、Input.insertText，选择使用原生 popup 键盘；没有改应用内部 state。触屏检测包含对话、导航、审批、任务、记忆、Bot 设置、资料、删除和编辑表单的可见控件。搜索框 231×44 CSS px、创建 Bot/群聊 44×44、发送 44×44，undersized=[]。

## true 的证据范围

| browser 字段 | 来源 |
| --- | --- |
| rendered/no_overflow | 每 case 实际工作区尺寸、document/workspace scrollWidth，并保存 PNG；70 case 无横向溢出 |
| keyboard/focus | 每 case 从可见控件按 Tab 后读取 activeElement、focus-visible、outline；另有首焦点/返回焦点/退出保护矩阵 |
| states | 实际执行操作到达对应页面状态；同时保留完整行为断言与截图，不只检查状态标签 |
| long_text | 共享横切检查：chat-long、long-800/390、long-message-1440/390，长中文与英文标识片段 |
| zoom | 共享横切检查 native-200pct：XTest 发送原生 Chrome Ctrl+= 五次，CSS viewport 1440×897→720×448、DPR 1→2，外窗口 1440×1040 不变 |
| reduced_motion | 所有 reset 使用 reduced 媒体特征，专门回读 matches=true、sidebar transition=0s、messages scrollBehavior=auto |
| console_errors/offline | 实际 Runtime/Log 订阅无错误，所有页面请求限 loopback 静态包；不推导生产网络行为 |
| rechecked | 本轮全套重跑且 findings=0；并非只把上一轮 false 改为 true |

原生 dialog 的 BODY 焦点边界仍在原始 path 中记录，检查的是背景业务控件不可聚焦；没有把 BODY 声称为有可见焦点的按钮。每 case 的可见 focus 检查从真实控件进行。没有声称每个状态都单独重复全部长文/zoom 组合。

## 摘要与正式门

`prototype_digest` 通过项目 `prototypeDigest(design-system.md)` 从运行源重新计算，为 `96374764bb60e419652b926087a06683eea3c263b9ff98df14a2127812fa6310`，未读取旧 bindings 填新摘要。`check-evidence.mjs` 校验 browser schema、该摘要、29 状态覆盖、两入口的 1440/390、每张 PNG 的签名/尺寸、review 记录和源码前后字节。

materialize `--check` 实际 exit 0。现有 `--check-preview`、`--check-ready` 仍实际返回工具 exit 126：`change DESIGN does not approve this prototype/selection digest`；原因是旧合同与批准仍绑定原摘要。独立技术通过不等于完整包已 Ready，验证者未改任何正式状态或人类批准。用户明确最终总验收以代码为准、真实操作自验；本任务不再提出界面选择/批准或扩大真人验收。

本轮未测试物理触屏、系统输入法、读屏、生产模型/API/Vault、Obsidian 多窗口/Portal/卸载；composing 仅模拟事件。脚本结束关闭 Chrome、Xvfb 和 loopback server，删除临时 profile；writer 随报告结束。
