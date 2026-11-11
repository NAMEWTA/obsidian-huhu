## 聚焦交接

已确认一个独立可复现的生产焦点缺口：首次 gutter 获得真实焦点后、Enter 前，库 forceRender 回收行号节点时，旧实现尚未创建焦点 owner，onPostRender 无法恢复，可信 Enter 实际发往 BODY，选行/copybar 不出现。可信 Tab 进入同样失败，因而不是仅由 driver 的 `.focus()` 制造的问题。无 overlay 原 1case+完整 exercise 本次通过；这不证明最后一次 130 的偶发失败根因，后者缺少事件链，不能追溯断言。确定性控制证明当前同源实现确实存在上述窗口。

最小写集仅 keyboard.ts：既有 owner 构建块从 Enter handler 移至 gutter.onfocus；Enter 保持原选择 API；解绑清除 onfocus。原 onPostRender、外焦、Document、metadata、隐藏/卸载 guard 不变，无 sleep、循环 refocus 或新引擎。DiffSurface/MultiDiffView/theme/TSX/MJS/公共 API 均未修改。仓库生产源全只读；仅本报告和私有目录有写入。

## 产物与验证

冻结目录：/tmp/huhu-initial-diff-focus/ready
补丁：/tmp/huhu-initial-diff-focus/ready.patch
SHA/mode 清单：/tmp/huhu-initial-diff-focus/ready-manifest.json
完整输入清单：/tmp/huhu-initial-diff-focus/input-manifest.json
目标：src/modules/versioning/ui/diff/keyboard.ts
before SHA256：a160dad6b91b9ca2fe91493e2ae4908d31690a30112f19dc8972e5876dc7d304；mode 0664。
after SHA256：8dc703e02946e352c879f065bdad801ce83aff0938f6aaa08ee09bc7a5a12efc；mode 0664。
ready 文件冻结后不再写入。Root 单写合入。

各运行均使用真实 workspace 的四个 130 源，无其私有 overlay。runner 仅 force 控制时对 keyboard 做临时 observation instrumentation：暴露真实 FileDiff 实例并记录 postRender；不改变焦点/选择行为。候选运行仅 keyboard 替换。基线完全无生产 overlay。全部原尺寸、2px 焦点、命中断言保留。

命令公共参数：`--suite frontend-redesign --ticket T-16 --matrix redesign --out /tmp/huhu-initial-diff-focus/<结果目录>`。

- `node /tmp/huhu-initial-diff-focus/runner.mjs <公共参数>`，baseline，退出 0：1case，99 states，16 virtualHunks，完整 exercise、两 Doc 焦点和 cleanup listener0。
- `node /tmp/huhu-initial-diff-focus/control-runner.mjs <公共参数>`，negative-force，工具返回退出 126：预期红灯 main copybar 超时；timeline 明确 focusin → forceRender → focusout → postRender → original disconnected/BODY。
- `FOCUS_KEYBOARD=/tmp/huhu-initial-diff-focus/candidate.ts node /tmp/huhu-initial-diff-focus/control-runner.mjs <公共参数>`，positive-force，退出 0：相同强制重绘下原完整 exercise，99 states、16 virtualHunks、两 Doc、cleanup listener0。
- `node /tmp/huhu-initial-diff-focus/tab-runner.mjs <公共参数>`，negative-tab，工具返回退出 126：预期红灯 Tab first Enter copybar 超时；真实 Tab keydown/up → gutter focusin(line1) → forceRender → original disconnected → 可信 Enter keydown/up target=BODY。并非编译/启动失败。
- `FOCUS_KEYBOARD=/tmp/huhu-initial-diff-focus/candidate.ts node /tmp/huhu-initial-diff-focus/tab-runner.mjs <公共参数>`，positive-tab，退出 0：两 Doc 可信 Tab→重绘→Enter→copybar 均通过，cleanup listener0。
- `FOCUS_KEYBOARD=/tmp/huhu-initial-diff-focus/candidate.ts node /tmp/huhu-initial-diff-focus/guards-runner.mjs <公共参数>`，guards，退出 0：两 Doc × 外焦、同 shadow 其它控件、其它 Document、metadata identity、hidden、unmount 共 12 轴均未抢回 gutter；cleanup 所有 listener/worker/URL=0。
- `node /tmp/huhu-initial-diff-focus/normal-runner.mjs <公共参数>`，positive-normal，退出 0：仅候选 keyboard overlay，无诊断 instrumentation；原完整 exercise，1case、99 states、16 virtualHunks、cleanup listener0。
- `pnpm exec eslint --stdin --stdin-filename src/modules/versioning/ui/diff/keyboard.ts < /tmp/huhu-initial-diff-focus/candidate.ts`，退出 0；lint.log 空。
- `node /tmp/huhu-initial-diff-focus/check-types.mjs`，退出 0；真实模块路径加载候选，0 diagnostics，types.log。

各运行 result.json（含实际源输入 hash、错误和必要 focusTrace）位于同名结果目录。关键 Tab 两组 trace 同时记录可信事件 target/inner target、active/原节点连接状态、postRender，selection 输出由实际 React copybar 判定。负控先红、同候选控制绿。

## 问题与下一步

Root 可按 before SHA/mode 核实并仅合入 frozen keyboard.ts，再交独立 high 审查与原 owner 必需门禁。未修改永久 driver：临时 `__diagnosticInstance` 只存在私有 instrumentation，不是公共 API 或待合入资产。未执行正式 66、全仓 lint/build/test、真实 Obsidian popout；未访问用户 vault、CLI 账号、剪贴板、原 Claude transcript。自然初次 highlighter 的到达时间未强制或伪装；控制直接调用相同库真实 forceRender/postRender 接缝，因此确认该窗口的真实缺口，不夸称复现了最后一次 130 的确切异步来源。

return: 0。停写并释放，无待运行进程；Root 继续单写。
