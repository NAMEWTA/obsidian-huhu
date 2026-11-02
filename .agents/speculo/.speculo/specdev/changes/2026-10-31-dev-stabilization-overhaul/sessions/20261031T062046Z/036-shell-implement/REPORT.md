# T-24 非 Browser 独立叶层实施报告

当前状态：实现候选停写，Chrome 动作验收仍在进行；本报告不代表 Lead 正式验收。未提交、推送、发布或执行远程 CI。

## 范围与设计

采用 UI-GALLERY、DESIGN revision 2（摘要 `566034f112192e7d062540a1ce9051674b061d0475e61bf2a794825aad46f77b`）及 DESIGN-0002 DS001/004 和共用 DS002–013。实际改动为 General 前两段、About、Appearance、Intro 独立内容使用 T23 DesignScope。Shell/Settings 父框、Browser 实际共享导航及 General 第三段均冻结；第三段按保存的原始后缀逐字节复核一致。共享 Rail/Panel/Header 与 600/960 断点仅观察现有行为，不宣称全 Shell 视觉迁移完成。

Intro 外壳保持静态轻量，仅打开后动态 import React 内容；generation/owner 防关闭与重新打开后的晚到挂载，关闭卸载 root、portal，onSeen 保持一次。General/About 的窄容器换行只在独立 scope 内约束，不改公共 Label/Button/SettingsRow。

Appearance 使用真实 SettingsHandle，错误持久展示并可 Retry，通知归当前 leaf/Document；保留输入草稿、IME 防误提交。真实 SettingsStore 先同步更新内存并通知，再等待持久化，所以保存失败时预览内存可已改变、磁盘仍旧值，报告不宣称自动回滚。最初 perform 全局去重吞连续 Slider payload，已用真实 store 红灯证实并修正：追踪所有在途保存，不吞不同输入；FamilyInput 仅去重相同值的在途提交，唯一 onCommit 调用方已 catch 拒绝后返回 Promise。实际 store 失败/重试、Enter+blur 单次提交及连续 Slider 末值均有 DOM 回归。

D04 窄屏修复仅改变 Appearance 专用 SwatchGrid 两个最小宽度 `min(100%,原rem)`、自身 Choice/颜色/字体控制的 max-width/换行，以及 General/About 自身 scope。没有改变被冻结父框的 padding。

## 真实 fixture 与边界

使用实际 createWorkbenchSurface、createSettingsPage、NativeSurface、IntroContent、SettingsStore 与 Appearance，不复制原型 HTML。只提供宿主 Component/HTMLElement、workspace、clipboard、持久化故障与受控页面创建端口。两个真实 Document（主文档与 iframe）各自挂载 service/store/root/portal；它不是 Obsidian popout 或真实 Obsidian Modal 外框验收。Modal 类生命周期由 DOM 测试覆盖。

Lead 在共享 stub 增加唯一 getIcon 返回 null 端口，沿实际 preview-document null fallback；脚本宿主没有 Obsidian 图标注册表，不声称图标视觉已验收。fixture layoutCSS 仅恢复 workbench 后代真实 StylePreview iframe 的正常定位，覆盖共享 runner 的全局离屏 iframe 规则；第二 Document 宿主 iframe 保持原规则。这是宿主适配，不是产品修复。主题切换后等待实际 document.getAnimations().finished，避免正常动效过渡帧被当作稳态对比度。

## 验证与保留的失败

- `/tmp/huhu-t24-red.log`：真实 Enter+blur 重复提交红灯，2 次而非 1 次（退出 126，Vitest 1）。修复后叶层 14 例、扩大到 Shell 77 例均通过；懒加载与真实 store 补测后 14 文件 79 例通过，日志 `dom-lazy.log`。
- `types.log` 首轮 Intro children 类型失败，修复后 `types-retry.log`、`types-lazy.log`、`types-final.log` 均 0。`lint-lazy.log` 七生产文件 0；D05 的三生产文件 `slider-lint.log` 0。
- `real-store.log`：实际 SettingsStore 故障持久化与重试 1 例通过。`slider-red.log/.exit`：持久化 held 时第二次 ArrowRight 期待 20，实际 19；`slider-green.log/.exit` 修后 Appearance+General 共 15 例通过。
- `i18n.log` 0（35 词典/6397 键），`architecture.log` 0（1483 模块），`css-lint.log` 0（26 文件、无新增问题）；`check-styles.log`、`ui-styles.log`、`ui-runtime.log` 均 0。
- fixture preflight 首轮缺尚未完成的 mjs、第二轮误引 appSchema 导致模块注册表/Node 依赖进入 fixture、第三轮缺 getIcon stub，均保留退出 126；移除不必要 runtime appSchema 导入并由 Lead 补唯一端口后 preflight 4–8 均 0。
- Chrome 1–4：420/2x 实际 CSS 210、叶宽 89 的网格/固定宽度及 Slider 104 溢出红灯；Chrome 5：General 158/89、第二文档 switch hit area 外扩；Chrome 6：About Badge 113/89；Chrome 7–8：中文 Label 99/89。全部原 result/screenshot/log 保留，最窄修复后继续原断言，未放宽门槛。
- Chrome 9：32 个窄宽组合通过，1440 普通动效首帧颜色对比度失败；等待真实动画完成后 Chrome 10 的全部 48 标准矩阵通过，动作阶段因 fixture CDP 顶层 const 重复声明失败；修 fixture 变量声明后继续完整矩阵与动作，不把此前 48 例当整票通过。
- Lead wave5/wave6 的 types/test-types/styles/esbuild 通过；wave5 首轮测试类型来自其他在途票，修后 0。wave6 全量 lint/css 0。bundle 门仍失败，由 T37/T38 负责，不修改预算阈值。D05 后最终产物尚需 Lead 增量构建；旧 main.js 不被称为最终一致产物。

上述日志均以 `/tmp/huhu-t24-` 为前缀；完整最终命令、输入摘要和归档位置将在验收完成后补齐。未提供接口的业务 approval/cancel/offline/read-only 不制造假状态；远程 CI 按用户决定暂不执行。
