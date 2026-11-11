# 技术复核

结论：本次离线 HTML 技术检查通过；不是生产或宿主认证。执行者以 Linux 上的 Google Chrome 153.0.8010.47，headless CDP，实际打开 comparison 索引、唯一候选与 final 的 file URL。

候选和 final 各九页、各 1440×1000 与 390×1000，共 36 个页面/视口用例。通过可见状态选择控件逐一打开 88 个状态；每个用例检查非空内容、文档横向溢出、Tab 与可见焦点、长中英文标题、200% 布局等效缩放（CSS 可用宽高减半且 deviceScaleFactor=2）及 reduced-motion 计算样式。另逐页检查窄屏英文深色并截图。窗口缩放不是触屏或真实宿主缩放证明。

主任务使用真实渲染按钮/输入与 CDP 键盘事件；IME 使用 isComposing 键盘事件桩，不冒充真实输入法。dialog 进入/Tab 约束/Esc 关闭与回焦已验证。测试驱动最初对短中文 loading 的字符数要求过严，以及 DOM click 未先取得焦点，已修正这两项驱动假设；没有将这两项误记为产品缺陷。代码内减少动效优先级缺陷已实际修复。

网络观察没有 HTTP(S) 请求、没有 Runtime 异常。所有 CSS/JS 是包内本地相对路径，没有 CDN、远端字体、图片或网络 API；fixture 只改内存，不调用真实剪贴板或磁盘。生成密码为显式点击后的 12 位四类随机字符，其统计安全性不在此认证。源码块与 final 的精确字节一致性由 materialize --check 单独验证。最终运行的 actions 和 errors 保留在 task-actions.json，过程材料与截图按 .gitignore 留本地。
