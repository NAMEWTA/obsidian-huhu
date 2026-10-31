---
Session: 20261025T043239Z
Task: 001-prototype-validation
Status: failed
---

# 验证报告

已完成真实浏览器补证，发现 3 项确定设计/界面规则偏差，**当前不能 Ready**。未修改 DESIGN、design-system、bindings、批准原型源码或正式状态；完整字节 SHA-256 前后相同。Writer 已结束，浏览器/server/Xvfb 已关闭，Lead 可以接手 P 修复。

## 产物

- [浏览器证据](../../../prototypes/UI-001/evidence/browser.json)：58 个真实 screenshot case，绑定当前 prototype digest；创建表单 focus=false、未保存表单 states=false、rechecked=false 明确保留失败。
- [原始操作/测量记录](../../../prototypes/UI-001/evidence/observations.json)；[首轮原始记录](../../../prototypes/UI-001/evidence/first-pass-observations.json)保留测试器初轮限制。
- [技术复核](../../../prototypes/UI-001/evidence/technical-review.md)、[视觉与任务复核](../../../prototypes/UI-001/evidence/design-review.md)、[命令结果](../../../prototypes/UI-001/evidence/validation.log)。
- [复跑脚本](../../../prototypes/UI-001/evidence/run-browser-check.mjs)、58 张 PNG 与 7 张联系表；联系表索引为 [contact-sheets/index.json](../../../prototypes/UI-001/evidence/contact-sheets/index.json)。未安装依赖。

## 确定缺陷

| ID | 复现/证据 | 具体位置 |
| --- | --- | --- |
| PV-001 | 创建 Bot，填写名称，Escape，重开，名称为空且无确认；`unsaved-form-before/after` 截图与 `unsaved-bot-form` 观察 | `final/app.js:108–110` 的弹层关闭/cancel 路径，以及 `new-bot/edit-bot` 表单；元素 `#bot-name` |
| PV-002 | 390px touch emulation，发送按钮实测 40×44 CSS px | `final/styles.css:10` `.composer-tools .send-button{width:40px}`；`touch-targets-44px` |
| PV-003 | 创建 Bot 打开后首焦点为关闭按钮，不是主输入 | `final/app.js:108` `showDialog()`；实际 activeElement `[data-action="close-modal"]`，预期 `#bot-name`；`bot-initial-focus` |

另外 2 条 dialog-focus-trap 原始失败只记录 Tab 到 BODY 后返回弹层，未观察到背景业务控件可达；不要把它们当成已证明的焦点泄漏。Shift+Enter 的首轮失败来自测试器未发送 CDP text，第二轮已纠正并实证换行正常。

## 验证结果与命令

Chrome 153.0.8010.47 / Node 26.11.1 / Xvfb；final 与 candidate-a 均在 1440/390 打开，final 另测 800、六页全部 29 个声明状态、明暗、长中英文本、键盘/焦点、reduced motion。58 个 case 无水平溢出，运行时/console 错误为 0。审批拒绝/确认、子任务停止、自动记忆开关隔离、全局提案门禁、授权接收方确认、未知效果核查与 Profile 清除均已实际操作。

原生 Chrome 200% 缩放由 XTest 发送 Ctrl+= 五次得到：CSS viewport 1440×897→720×448，DPR 1→2，外窗口 1440×1040 不变。长文本、zoom、reduced-motion 在 browser.json 中为**明确共享的横切检查**；逐 case 的 rendered/no_overflow/keyboard/focus 来自各 case 实际 DOM 与 Tab，未宣称每个状态都重复缩放/长文本。

- `node …/evidence/run-browser-check.mjs`：exit 0，检查进程完成，输出 cases=58/findings=5/errors=0；不代表验收通过。
- `node …/materialize-prototype.mjs --check …/design-system.md`：exit 0，三个源码块一致。
- `validate-design-package --check-preview`、`--check-ready`：工具实际 exit 126，均为 `ready prototype requires browser evidence`；当前 frontmatter 仍为 null，本任务无权改写。
- 独立 digest/状态/schema：digest 一致、missingStates=[]；schema 拒绝 focus=false/rechecked=false，后续同源投影另有 states=false。失败证据未被美化。

## 未验证与建议

未验收物理触屏、系统 IME、读屏、真实模型/写入/Vault、Obsidian 多窗口/Portal/卸载；isComposing 只模拟事件，原型 mock 不证明生产后端。

Lead 按原 owner 的 P 修复任务处理 PV-001–003，更新受影响内容/摘要的批准关系并重跑相关路径；不要用将 browser_evidence 字段非空或把布尔值改成 true 代替修复。正式状态推进由 Lead 负责。本任务已停止所有写入。
