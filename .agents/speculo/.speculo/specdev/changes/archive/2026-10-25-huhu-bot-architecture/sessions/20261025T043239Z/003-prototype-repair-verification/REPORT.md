---
Session: 20261025T043239Z
Task: 003-prototype-repair-verification
Status: failed
---

# 独立复验报告

70 个真实浏览器 case 完成。未保存表单保护、表单首焦点以及发送按钮修复通过；导航抽屉仍有 3 个目标小于 44px。当前为**技术验证失败，且新摘要待批准**，没有改写任何正式状态/批准文件或原始失败证据。

## 修复验证

创建/编辑 Bot × Escape/取消/关闭共六条路径、42 条行为断言全部通过：主输入首焦点，关闭前明确提醒，继续编辑保留名称与职责，明确放弃后恢复触发点，重开未误保存，干净表单直接关闭，继续编辑后仍可保存。真实输入用 CDP 键鼠与 Input.insertText；截图在 `dirty-*-warning.png`。

390px touch emulation 下发送与图标轨按钮已达到 44×44。扩大到导航抽屉后的剩余失败：

| 元素 | 实际尺寸 |
| --- | --- |
| `.search-box input#search` | 231×33.1875 CSS px |
| `#directory .list-heading button[data-action="new-bot"]` | 32×44 CSS px |
| `#directory .list-heading button[data-action="new-group"]` | 32×44 CSS px |

只读定位：`final/styles.css` 常规 `.search-box input{min-height:30px}` 和 `.list-heading button{width:32px}` 优先于当前 coarse 通用规则；建议原 owner 定向覆盖这些尺寸后独立再测。`observations.json` 的 `touch-navigation-44px` 保存完整可见控件测量；对应 browser case `states=false`，总 `rechecked=false`。

## 证据

全部新材料仅在 [evidence/repair-1](../../../prototypes/UI-001/evidence/repair-1/)：

- [browser.json](../../../prototypes/UI-001/evidence/repair-1/browser.json) 与 [observations.json](../../../prototypes/UI-001/evidence/repair-1/observations.json)。
- [技术复核](../../../prototypes/UI-001/evidence/repair-1/technical-review.md)、[视觉复核](../../../prototypes/UI-001/evidence/repair-1/design-review.md)、[命令结果](../../../prototypes/UI-001/evidence/repair-1/validation.log)。
- [复跑脚本](../../../prototypes/UI-001/evidence/repair-1/run-browser-check.mjs)、70 张 screenshots、8 张 contact-sheets；已逐张查看联系表并放大三个关键修复/失败画面。

digest 从真实源码调用项目 `prototypeDigest` 得到 `81f7196f901463c29f10cb0e114f75e555233e691b8cd7c352499b9685457bb2`，没有读取旧 bindings 冒充新 hash。测试前后 source SHA 一致。新截图保留原范围：final/candidate-a 1440/390、final 六页与全部 29 状态、800/390、明暗、长中英文、键盘、reduced motion、原生 Chrome 200% zoom。70 case 均无横向溢出、console/runtime 错误为 0。各 true 的逐项或共享横切来源在技术复核中明确列出。

## 命令与边界

- 复跑脚本 exit 0，结果 cases=70/findings=1/errors=0/sourceUnchanged=true；这是完成取证，不是全部验收通过。
- materialize `--check` exit 0，3 个源码块一致。
- `--check-preview` / `--check-ready` 均为工具实际 exit 126：`change DESIGN does not approve this prototype/selection digest`。旧批准快照保持只读。
- 独立检查 missingStates=[] / digestMatches=true；browser schema 因 `states=false/rechecked=false` 失败。

未验收物理触屏、系统输入法、读屏、真实 API/Vault/模型、Obsidian 多窗口/Portal/卸载；未声称每个状态重复所有 zoom/长文本组合。Chrome、Xvfb、server、临时 profile 均已清理；本任务 writer 已结束，原证据不再覆盖，交还 Lead。
