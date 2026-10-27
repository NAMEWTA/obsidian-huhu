# 修复一轮的真实浏览器技术记录

结果：**70 case 完成，1 组触屏尺寸失败，批准摘要仍待处理**。本轮在 Chrome 153.0.8010.47 / Node v26.11.1 / Linux Xvfb 下执行；完整环境、时间、CDP 操作和真实测量见 `observations.json`。未安装依赖，源文件、DESIGN、bindings 和 design-system 只读，测试前后 SHA-256 相同。

## 复跑和范围

```sh
node .agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/prototypes/UI-001/evidence/repair-1/run-browser-check.mjs
node .agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture/prototypes/UI-001/evidence/repair-1/create-contact-sheets.mjs
```

浏览器检查脚本实际 exit 0，输出 `cases:70, findings:1, errors:0, sourceUnchanged:true`。exit 0 只代表进程和证据收集结束，发现项明确在 JSON 中；不能把它解释成全部验收通过。联系表工具 exit 0，生成 8 张索引图，原图保持不变。所有本轮写入限定在 repair-1，原始 browser/observations/screenshots 未覆盖。

final 与 candidate-a 分别实开 1440/390，final 另测 800；六页全部 29 个声明状态已覆盖，missingStates=[]。正常、空、加载、失败/重试、离线、授权、恢复、长文、审批/拒绝/完成/停止/未知结果、记忆/全局提案/遗忘和删除门禁路径均保留原范围。修改表单共验证创建/编辑 × Escape/取消/关闭六条路径，每条检查首焦点、提醒、继续编辑、明确放弃及焦点恢复、重开未提交值、无修改关闭、提醒后保存，共 42 条断言全部通过。

填写使用真实 CDP 点击、Ctrl+A 与 `Input.insertText`，选择框使用原生 popup 的 Home/ArrowDown/Enter；未直接改 JS 内部 state。IME 仍仅模拟 composing 键盘事件，不能替代系统输入法。原生 `<dialog>` 的 Tab 边界 BODY 作为非交互文档边界单独记录，检查要求保持“背景业务控件不能获得焦点”；原始第一轮的错误分类没有带入本轮，也未把 BODY 观察伪装成某个已聚焦按钮。

## browser.json 检查含义

- `rendered/no_overflow/keyboard/focus` 每个 case 都回读实际几何数据、按 Tab 并检查可见 focus ring，不是默认通过。
- `states` 对应实际到达的页面状态；`touch-navigation.states=false` 明确保留本状态触屏合同不通过。
- `long_text` 为共享检查：`chat-long`、`long-800/390`、`long-message-1440/390`，覆盖长中文与英文标识片段。
- `zoom` 为共享检查：`native-200pct` 用 XTest 的 Chrome 原生 Ctrl+= 五次；CSS viewport 1440×897→720×448、DPR 1→2。没有用 CSS zoom 或 pinch 代替浏览器缩放。
- `reduced_motion` 为共享检查：所有 reset 使用该媒体特征，并专门回读 media=true、sidebar transition=0s、messages scrollBehavior=auto。没有宣称每个状态单独重复所有横切组合。
- `console_errors=[]` 来自真实 Runtime/Log 订阅；资源请求只访问 loopback 静态包，`offline=true` 不证明生产网络层。
- `prototype_digest` 调用项目的 `prototypeDigest(design-system.md)` 根据真实源码计算，未引用旧 bindings 冒充新摘要。
- 未修复触屏尺寸使 `rechecked=false`；schema 按 `states=false/rechecked=false` 失败是预期的诚实失败保留。

## 唯一剩余确定失败

`touch-navigation-44px` 的实际结果（390×844、touch emulation 开启、`(pointer:coarse)` 为 true）：

| 元素 | 实测 CSS px | 读到的源码定位 |
| --- | --- | --- |
| `.search-box input#search` | 231×33.1875 | 常规 `.search-box input` 的 min-height:30px 优先于 coarse 的裸 input 规则 |
| `#directory .list-heading button[data-action="new-bot"]` | 32×44 | `.list-heading button` 的 width:32px 仍有效 |
| `#directory .list-heading button[data-action="new-group"]` | 32×44 | 同上 |

`touch-chat-44px` 显示发送按钮已 44×44；图标轨亦为 44×44。其他测过的页面/审批/编辑表单的可见按钮、输入、选择控件满足尺寸。触屏枚举对于 checkbox 使用其可点击关联 label 的尺寸；本次失败元素并不存在可补足尺寸的外层目标。物理手势或设备未测试。

## 机械门与清理

`materialize-prototype --check` exit 0，输出 `verified 3 prototype files`。preview 和 ready 命令均实际返回工具 exit 126，输出 `change DESIGN does not approve this prototype/selection digest`；旧批准未变，不由验证者更新。独立 coverage/digest 检查为 caseCount=70、missingStates=[]、digestMatches=true；schema 因 `/cases/61/checks/states` 和 `/rechecked` 必须为 true 而失败。

Chrome、Xvfb、loopback server 均由 finally 关闭，临时 profile 已删除。本轮测试 writer 已结束。未验证物理触屏、系统 IME、读屏、真实 API/Vault/模型、Obsidian 多窗口/Portal/卸载和全部状态逐一 zoom/长文本组合；不将原型记录扩写成生产验收。
