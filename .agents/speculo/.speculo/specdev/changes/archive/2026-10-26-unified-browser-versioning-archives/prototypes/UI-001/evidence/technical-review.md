# 修订 2：技术验证

当前有效结果是 browser-raw.json，真实 Chrome Headless / CDP，185 项断言通过。三个候选与 final 均有 390×1000、1440×1000 的独立 case，覆盖键盘、焦点约束与返回、长中文、根元素 200% CSS zoom、reduced motion、错误保留内容与重试。五页 36 个 page:state 均在 final 打开检查。模拟触摸打开窄屏 Sheet，并选择类型关闭 Sheet。

新增主路径：默认类型总览；五种类型父节点及实例子节点；点名称打开全类型列表，点箭头只折叠；实例打开正确资料；返回保留搜索与卡片模式；新增类型进入树和空总览，新增实例归属正确类型；两个时间默认勾选；字段勾选联动列表与卡片；隐藏字段再次显示时值仍在；记录条件筛选独立；树方向键与 Enter 导航。档案草稿冲突拒绝/保留、受管历史恢复拒绝、网页未知结果不重放仍做回归。

字段表单与选择通过浏览器 input/change，主要按钮通过实际 CDP 坐标点击，Tab/Escape/方向键为真实输入事件。当前无运行时 console error、无 HTTP(S)/WebSocket 请求。file/data/about 资源为本地；浏览器日期图标的内嵌 data URI 不属于联网。样例字段值不包含生产资料。

所有运行资源在 final/comparison；三个具名源码块匹配实际文件。浅深主题沿用上版语义色，contrast.json 仍适用（14 组文本配色）；本轮新树、卡片和字段对话框也实际截图。CSS root zoom 与 CDP touch 仅证明原型模拟，不冒充 Obsidian 原生缩放或真实触屏。生产 UI 未改动，无需构建。

修订 1 的 212 项结果、旧截图与源文件在 revision-1 中，只能解释历史，不能替代本轮 185 项结果。当前预览门可通过；Spec stage 仍正确拒绝未 approved 的 DESIGN 和未 ready 原型，不据此绕过最终用户确认。实际命令见 validation.log。

复跑：从仓库根启动隔离 Chrome headless（本地 CDP 9374），运行本目录 browser-check.mjs；只覆盖本包证据，不使用用户浏览器资料目录。结束隔离 Chrome 进程即可，无服务器残留。
