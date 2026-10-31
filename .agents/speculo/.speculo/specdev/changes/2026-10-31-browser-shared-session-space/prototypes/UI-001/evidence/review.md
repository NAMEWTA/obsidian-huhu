# 本地设计/技术自审

日期：2026-10-31。审查者：本轮作者自审；**不是独立 design critique**。输入为 final 与 comparison 的物化文件，摘要见 content-manifest.json。

## 实际观察与修复

已渲染桌面亮色、Agent 状态、暗色、420px、长英文/触控、200% CSS zoom、cleanup-pending，并读取桌面/窄屏/暗色截图。没有观察到画布空白、主操作遮挡或非预期横向溢出。与参考保留相同圆角层次/侧栏尺寸/紧凑工具栏/低装饰风格；具体浏览器内容是新设计，不宣称像素级复制参考不存在的浏览器页面。

在自审中修复：不同模拟页面误共享同一草稿；崩溃恢复未退出错误状态；个人转换后分类/标签不一致；非就绪场景仍可触发 Agent 模拟输入；材料未明确固定目标；HTTP 缺显式不安全提示。截图还增加了主题切换后的 180ms 等待，避免把过渡中间态当最终暗色。

技术复核：Node --check 无错误；本地 Chromium 自动化 33 项通过、0 脚本/console error、0 外部网络请求。原始结果在 browser-local.json，脚本 check-preview.py 可复跑。它使用实际本地 HTML/CSS/JS 读入并内联后 set_content 渲染；初次 file:// 导航被容器浏览器管理员策略拒绝，没有修改策略或增加绕过参数。

## 尚未验证

原型文件直接 file:// 打开在本环境受策略限制；单文件便捷版另行按相同内联内容生成。没有运行官方 prototype-browser-evidence schema / design-artifacts / stage validator；browser-local.json 特意使用自有工件名称，不伪装为已通过官方 browser.json。没有独立审查者，没有用户确认；不能封板。

没有真实 Session/guest/Electron、Windows/macOS、中文 IME、用户主题、原生 surface 层级、真实网络/文件/权限/清理、平台性能测试；所有 F/B 条目继续 NOT RUN。
