# UI-001 真实浏览器视觉与任务复核

2026-10-25，本次检查只针对已批准 UI-001 final 与其 candidate-a 同源投影；没有修改批准源码或重新选择方案。实际观察使用 Chrome 153.0.8010.47、Linux/Xvfb，通过 CDP 打开本地静态文件服务。截图来自浏览器，服务不提供生产数据或模型连接。

已打开检查 58 张截图的 7 张联系表（见 `contact-sheets/index.json`），并独立放大检查桌面、390px 对话、390px 任务与记忆、审批 diff、删除后的最小核查记录和原生 200% 缩放原图。所有原图均保留在 `screenshots/`；联系表只是检查索引，未替换或改写原图。

观察到的结构符合已选方向：桌面为图标轨、Bot/群聊目录及主内容；协作卡片内联于对话，任务页面独立呈现。1440px 任务按三列排列，800px 与 390px 顺序重排。800px 保留轨、侧栏覆盖；390px 合并导航抽屉。记忆作用域、已有 Bot 与临时子任务、审批目标/diff、已清正文与保留安全记录均可以在实际画面中区分。明暗主题、长中文与长英文标识片段、原生 200% 浏览器缩放没有测得页面水平溢出。

三项需要交回原 owner 的偏差：

1. **PV-001，未保存表单丢失。** 在创建 Bot 表单填写名称后按 Escape，再打开创建表单，名称为空；没有未保存提醒或恢复。`screenshots/unsaved-form-before.png` 与 `unsaved-form-after.png` 记录前后画面。与 DESIGN 的未保存状态不能无声丢弃要求不一致。
2. **PV-002，触屏发送按钮宽度不足。** 390px、Chrome touch emulation 下，`.composer-tools .send-button` 实测 40×44 CSS px，未满足 44×44px。`screenshots/touch-emulated.png` 与 observations 中 `touch-targets-44px` 保存证据。模拟结果不声称为真机测试。
3. **PV-003，创建表单首焦点。** 打开创建 Bot 后，`document.activeElement` 为 `[data-action="close-modal"]`，不是主输入 `#bot-name`。与 ui/motion-a11y 的表单主输入首焦点规则不一致；DOM 观察在 `bot-initial-focus`。截图时为了逐项验证键盘已按 Tab，所以不能只凭该截图反推初始焦点。

原生 `<dialog>` 的 Tab 边界存在两次 `document.activeElement === BODY` 观察，随后返回弹层；没有观察到背景业务控件取得焦点。它不是已证明的背景交互泄漏，作为待解释的浏览器边界保留原始记录，不扩写为确定缺陷。导航抽屉的背景 inert、Escape 关闭及触发点焦点恢复通过实际操作。

窄屏顶部离线检查工具条会折行并产生外层纵向滚动；工具条位于产品画面之外，不能把这项原型展示边界当成正式产品布局。真实触屏、系统输入法、读屏、Obsidian 多窗口/Portal/卸载以及生产 API 均未在本次单页原型中验收。

本次只完成实测与报告；上述确定缺陷没有修复，不能把设计批准或截图存在解释为 Ready。
