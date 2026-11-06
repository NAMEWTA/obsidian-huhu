# 动效、输入与可访问性

设计依据见 [ui入口](../SKILL.md)；布局/保存归 [shell](shell.md)，组件和值归 [design-system](design-system.md)。行为验证范围使用 [dev测试选择](../../dev/references/testing.md)，不在此另立全部必跑清单。

## 动效与真实反馈

用 `--hu-dur-fast/base`、`--hu-ease` 和共享presence样式，不读取宿主 --anim-duration* 作为HU时长。仅动画transform/opacity，布局先提交最终尺寸；终端标签切换、输入/输出热路径不加动画，不逐帧改宽高/网格/内边距或测量重排。需要resize的终端在布局边界适配一次。

系统 prefers-reduced-motion 与 data-motion=reduce 都禁位移/缩放/旋转及平滑滚动，包括伪元素和第三方CSS动画；共享base.css处理CSS，脚本用ownerWindow的设置/媒体查询选择auto。spinner在reduce下保留静态忙碌含义，异步按钮/开关预留宽度，busy/禁用/阶段/错误和重试来自实际操作，不假进度。

## 键盘和输入法

| 区域 | 契约 |
|---|---|
| Shell | F6/Shift+F6 在当前叶的可见Rail/导航/main循环；有模态只在顶层范围内，不跳隐藏页或另一窗口 |
| Rail/导航/分隔 | 按真实控件角色移动/激活；分隔键盘尺寸行为见shell；行内操作不被行选择吞掉 |
| Tree/虚拟列表 | Headless Tree 的单Tab入口、方向/Home/End/typeahead，叶子省略expanded；Tab离树；虚拟化/密度变化后选中锚点与实际行高一致，不为每行造多组Tab停靠 |
| Tabs/菜单/Select/Command | 保留Radix/cmdk等库模型，不造第二键盘引擎；模块标签的关闭/中键/排序按实际合同，提示与动作一致 |
| 日期 | DayPicker管日期网格/焦点/月年边界；字段Enter/blur严格校验。日期弹层Esc先关闭且不丢父表单；不能用裁行隐藏库焦点目标却声称周条行为不变 |
| 输入/表单 | compositionstart/end、native isComposing/keyCode229均考虑；组合确认不触发保存、命令或逐层Esc关闭。使用共享ime.ts端口，避免父表单与控件重复处理Enter；批注现有Ctrl/Cmd+Enter保存保持 |
| 差异 | DiffSurface/MultiDiffView 区域内 F7/Shift+F7 前后移动变化；行号可聚焦，Enter选行、Shift+Enter扩展，块操作顺序可达。MultiDiffView 通过共享 IME guard 和 composedPath 排除 input/textarea/select/contenteditable，处理后 stopPropagation 保留库的滚动目标；不注册全局j/k/n/p，不拦截编辑器/终端键位。真实路径见design-system，行选择/焦点所有权见 versioning/ui/diff/keyboard.ts |

Obsidian全局命令不抢默认Ctrl/Cmd+K、Ctrl/Cmd+Shift+P。批注Esc先取消编辑再关闭浮窗，鼠标离开不丢未保存内容；纯Tooltip不承载编辑表单。

## 所属窗口、浮层与焦点

每个Document使用自己的Portal、模态栈、窗口、监听与计时器；从owner元素/共享contexts取得，禁止模块顶层捕获window/document。跨窗口adoption重绑定、卸载取消迟到恢复。HuhuProviders/ContainerProviders管理实际Document，不凭全局document.activeElement判断其它窗口。

modal-layer 的owner-aware层级以真实包含关系和栈确定：独立React导航根移入Sheet后，其菜单属于该物理owner；无关背景popup不能因有模态就升到全局顶层，早先owner的浮层也不能盖过后来模态。使用共享层/Portal API，不设私有z-index解决局部问题。Command不是永远最高；新确认层/日期层按父层继续组合。

Sheet/Dialog共用Radix trap；背景inert，Tab/F6只受顶层约束。Esc只消费最内层（日期/菜单→Dialog/Sheet），不得一次关两层；IME Escape先归输入。关闭后恢复真实来源，来源卸载则同区域合理回退，不硬focus body或外国窗口。保留同一层的dirty guard、触发器/来源节点和异步关闭代次；关闭与隐藏/断点切换不可混为一次来源恢复。

标准焦点是2px描边+2px间隔，输入按批准设计改为强调边框与3px glow；令牌为 --hu-focus-width/offset/focus。不能套旧通用ring-[3px]替代所有控件。焦点必须实际可见：伪元素扩展、clip/overflow、下一selected背景和滚动边缘都可能盖住描边；计算outline存在不等于paint完整。列表保留来源行与scroll，表单错误聚焦实际控件；不要为反馈重挂输入或移动选择区。

## 语义、命中和对比度

- nav/aside/main、列表或menu/tree等角色按实际交互选择，不能把含多按钮/复选框的记录列表机械套listbox。当前项aria-current、开合aria-expanded、选中/开关/checkbox按角色输出；布尔用React布尔值，checkbox可mixed，树叶不伪造expanded。
- 每个操作用button/input或库等价语义，有名称；图标按钮有aria-label及适用Tooltip。Label/帮助/error分别关联，错误aria-invalid；live region/status/alert反映真实路由/忙碌/失败，不能仅靠颜色。
- fine至少32×32、coarse至少44×44真实独立目标。视觉小图标可用布局/伪元素扩大，但相邻CSS命中区不能重叠、被父overflow裁掉或因邻项focus提升而改归属；joined控件换行后横纵两轴都要独立。检查实际elementFromPoint与可信鼠标/触摸、中心±(最小尺寸/2−0.5)内点及相邻焦点状态；精确共享边界上的触摸盘调整不当作内部目标通过或失败的替代。
- Pierre DiffSurface/MultiDiffView 的交互行由 useDensityRowHeight 驱动 compact32/comfortable36/coarse44，内联 `--diffs-line-height` 传进 Shadow 并同步虚拟度量。保留库数据属性与 token 桥和焦点适配；外层 CSS 不能穿透 Shadow，静态 diff.css 的22px基值不是交互命中验收值。
- 文字/工具栏按实际叶宽、长中文/en、200%缩放检查，滚动区域要可键盘到达；不能隐藏真内容/操作来清除overflow。宽代码/表格/时间轴的局部原生滚动保留内容，不演变为页面横溢。
- 对比度检查实际背景、悬停/选中/焦点/禁用与嵌套表面，paper/ink及宿主来源均覆盖适用状态；自定义色对和社区主题fallback不能凭一组静态token通过。原生Markdown外层huhu-native，保留宿主语义和控件，不用HU中和层破坏编辑器。
