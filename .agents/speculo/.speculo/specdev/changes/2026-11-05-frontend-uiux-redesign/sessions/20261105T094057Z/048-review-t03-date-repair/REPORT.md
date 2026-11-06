# 任务回报

Session: 20261105T094057Z
Task: 048-review-t03-date-repair
Status: completed

## 聚焦交接

独立 reviewer：native:/root/review_toolchain，既有 gpt-6.1-sol high，原 042 reviewer；未参与 044 实现，未委派。**standards：pass；specification：pass。** 原 042 的 S-01、S-02、S-03、V-01、V-02 均在本次固定修复范围内关闭；无新增 finding。042 原 request-changes 报告保持不变。

独立重跑日期 DOM 24、严格值 unit 5、原 042 未改写的反例 7、限定类型和七生产文件 lint，全部退出 0；原浏览器反例新采集也通过。Root 原完整 66 运行及其 2366 输入（含 ASAR 虚拟 app.css）独立核验有效；复核真实 600 点击协议、两 Document/两密度滚动与键盘、16 张真实 PNG 的 64 条像素边，并另测本次新采集首列焦点图的 8 条像素边，均通过。未把 standalone 测量替代实际 Popup。

**明确释放本次 13 路径和约定共享上下文的审查冻结。** 首尾逐字哈希均匹配；报告仅结论性复核，不宣布 T-03、Goal 或全局门禁完成。仓库唯一写入为本 REPORT；其余过程材料只在 /tmp/huhu-review-t03-repair；未改源码、资产、配置、依赖、Git、正式状态或 Evidence。

## 产物与验证

### 固定范围、来源与独立性

Review mode: source-files；Risk: high；Independence: required；Strategy: independent；Mode: native。observed HEAD 37fcede4210a19bcc2a74809e7fdd301e5717957；不是以当前脏工作区冒充 Git diff。已读 042/044/048 TASK 与既有报告、T-03、Map revision 16、Spec AC-021–023、批准 DESIGN revision 3 §3.6/§5/§7 与 UI-002；沿用 AGENTS、dev、ui 和 SpecDev code-review 的适用合同。T03 日期、DateTime 调用、原 Popover/ownerDocument 和实际 fixture 一并追踪；Root main/recovery 与 041 Shell 属图外活动，不扩大范围或归因其瞬态错误。

- 044 的 13 路径清单 /tmp/huhu-t03-repair/frozen-sha256.json，SHA256 **68836b5c4fef90eecbd4ec65150159d16d7b9374fe50deea268a8d89f75b6d56**；日期目录 7 生产文件、4 测试、T-03 两 fixture。逐项与 frozen/ 和当前字节一致。
- Root 19 路径上下文清单 /tmp/huhu-t03-lead-verification/manifest.json，SHA256 **4ad0161f631cce14379652743ecf83d930e200ec0c2472823d009f54c7f864f9**；首尾漂移均 []。
- styles.css SHA256 **4628d577624f6b44e1204f7339e3c6dbf5873d98ab59eae5e9bcb717ad280c85**。共享 modal-layer 为 575ce1d21bfbd618e7669a962a77d10eb03b4fd94f5b37fc767f55301fc11185，UI 词典为 af8c172ff7a5e6d613ec06a978231fbc3fd1b46354c17baa77e9c7c7881bfdf8。
- Root /tmp/huhu-t03-lead-final/result.json：passed，errors=[]，66 cases，2366 inputs；重算 inputDigest 为 **2b28798c361f80bdcd1ca6bcd315d569ff7bd1c620715e9b9b1590a0107e0462**。逐个物理输入匹配；ASAR 项按实际 header/entry offset 提取 app.css 校验，未误当普通文件。完整字节、result 和清单在审查开始已私有保存到 proof-inputs/ 并通知 Lead，之后才排除无关图外写入。
- 本次新 native 的输入摘要与 Root 完全相同。复用原 042 driver 原字节，协议 SHA256 **786ccbaa6822c3216d0dad7bfa00f6f70587d1ebb7c24d52c99e7a9094f658a8**；原反例 7 的测试也逐字复制，SHA256 ddb20375fd4c958a070b81c88879bcbcaf8bb200bad8098f4737dbbace987aa5。没有弱化原断言。

私有核验：proof-verification.json、final-verification.json、native-verification.json；过程材料均位于 /tmp/huhu-review-t03-repair，非入库 Evidence。

### standards 输出

Reviewer: native:/root/review_toolchain
Result: pass
Findings: []

**S-01 已关闭。** DateRangeField.opening(false) 与打开路径都 reset 最新 props.value；Esc、outside、Cancel 不提交。原实际组件三 dismiss 对照现均通过，普通 Enter 恰好提交一次、两端 IME Enter 不提交仍通过。新增外部真实 error + 受控 replacement 测试通过，关闭保留 Caller error 和最新 12-10 值。本次真实 Chrome 再输入倒序 End 后 Esc，已提交 11-10..20 保持，aria-invalid=false，未残留 alert。

**S-02 已关闭。** DateField/Range 的 Popover 改为日期局部 overflow-visible，DatePopupViewport 提供 4px 横纵 paint 余量和独立原生滚动；没有缩小标准 2px outline、2px offset，也没有换内圈。Calendar 聚焦 td 提高绘制顺序，使相邻 range/selected 背景不遮圈；td pointer-events-none、button pointer-events-auto 将装饰与命中分离。

已检查 focusPopupDay 真实键盘模态、祖先裁切边界、Page.captureScreenshot 原始 PNG 和 Canvas 采样代码；采样来自实际截图，按实际 computed accent 解码逐边比色。另用私有 Python PNG 解码器重新读取 Root 保存的 16 图，对左右上下各一段 2×40px 直线独立统计，64 段均 80/80，包含 Date/Range、首列 14/末列 20、main/second、compact/comfortable。取样避开圆角的 6px，不声称每个角点都是直角。已看最终 range-popup-focus-main-compact-14.png 与 date-popup-focus-main-compact-20.png，完整外圈、footer 和今天底点与证据一致。本次原 driver 新图 Nov21 的 Date/Range 首列也解码，8 段均 80/80；实际 td x6，paint 左边 x2，圈完整可见。

**S-03 已关闭。** 新实际 scroll viewport clientWidth=scrollWidth=320；calendar 312、七列 grid 308、day 44×44；经典滚动条不再拿走 15px，也没有横滚补偿。保留 overflow-y-auto 原生滚动，仅日期局部隐藏 gutter。Root 四组实际 wheelTop=122/126、touchTop=85，scrollHeight=616/628 大于 clientHeight=494/502；原生 Wheel、touchMove 的位置变化可观察，Tab 均可见到 Cancel、Apply。

Calendar 仅末列 button 的 ::before 向右续 2px，clip-path 相应外放 2px；真实 rect 检查其区域全部位于已有 calendar padding，和其他 day、导航、footer 的交叠面积为 0。44 本体、312/308 框架未变。448 Popup 内点协议覆盖 7 日×前后两个邻格键盘 focus-visible×四严格内边点（中心±21.5）×mouse/touch×两 Document×两密度；每次先核 CSS day、focus 所有者、零横滚、viewport 内部，再送真实 CDP 输入，并断言恰好一次可信 click 到指定 day。不是全在同一焦点态，也不是只看 point/rect。另有 56 末行和 96 standalone 点，完整记录排列经独立程序核对，合计 600。本次原 S-03 反例新测末列 Nov20 的 **(313.5,880)**，仍严格位于 x270..314 的 44px 本体，CSS day 正确且实际 mouse click Δ1；y 因本次布局较原 (313.5,873) 改变，不改所需相对内点。

原 fixture 的可信计数来自 Document capture click 的真实 event.isTrusted/closest day，未伪造 target 或点击计数。Node.instanceOf 仅补 fixture 所需 Obsidian DOM 扩展并使用各自 Document 的构造器；实际生产仍使用既有 Popover wheel shim，没有另加滚动/焦点引擎。

### specification 输出

Reviewer: native:/root/review_toolchain
Result: pass
Findings: []

S-01/S-02/S-03 同时恢复取消、标准焦点和 coarse 目标合同，以上不重复计数。

**V-01 已关闭。** DateField 底部有本地化 Today/Clear，使用现有 pick/严格 validateDate；Today 按 min/max 和 inactive 状态禁用，Clear 共用 null/required 错误路径，clearable=false 同时去除局部两种 Clear。受控值、不合法草稿、只读/禁用既有控制仍通过。新增测试实际验证 bounds、required null、DateTime 仅保留整个复合值 Clear、Today 保留 caller zone 并调用必需 validateValue。真实语言 store 从 en 切 zh，底部变为“今天/清除日期”；浏览器两 Document/两密度实际点击 Today 与 Clear 提交对应值；DateTime Popup 仅 Today。没有以外侧 X 或 Range 预设冒充 footer。

**V-02 已关闭。** InputControl 将 leading calendar trigger 放入输入左侧并保留独立命中空间、原 ref/名称/Portal；右侧 Clear 保留。实际 input/icon/trigger rect 证实图标在左 44px 单元内。Calendar today 为 accent text + 4px 底部圆点（bottom5），不再下划线，selected 的前景约定保留。真实 computed 及截图与批准 DESIGN §5/UI-002 对应；未引入生产 Air Datepicker、第二套日期或时区算法。

### 本次实际执行

所有日志位于 /tmp/huhu-review-t03-repair。

| 命令/检查 | 实际结果 |
| --- | --- |
| pnpm exec vitest run --project dom src/ui/components/huhu/date | 退出 0；3 文件 / 24 tests；dom.log |
| pnpm exec vitest run --project unit src/ui/components/huhu/date/date-value.test.ts | 退出 0；5 tests；unit.log |
| pnpm exec vitest run --config /tmp/huhu-review-t03-repair/vitest.config.mts | 退出 0；原 042 未修改 7 tests；original7.log。首次私有配置缺模块解析路径，补私有 node_modules 链接后重跑；无项目改动 |
| pnpm exec tsc -p /tmp/huhu-t03-implementation/tsconfig-test.json | 退出 0；日期生产/测试/fixture 与真实 Obsidian 声明；types.log |
| pnpm exec eslint 七个日期生产文件 --max-warnings 0 | 退出 0、零警告；lint.log |
| node /tmp/huhu-review-t03-repair/range-edge-native.mjs --suite frontend-redesign --ticket T-03 --matrix redesign --out /tmp/huhu-review-t03-repair/original-native | 退出 0；1 基础 case + 原定向反例；passed/errors=[]；original-native.log/result.json |
| python /tmp/huhu-review-t03-repair/verify-native.py | 退出 0；Root 600 点完整排列/所有者/尺寸/滚动 + 64 PNG 边，本次新 8 PNG 边；native-verification.json |
| 首尾 13/19 manifest、全部 Root 原 2366 input、ASAR、摘要、本次 native 同摘要 | 匹配；漂移 []；proof-/final-verification.json |
| dispatch 结构验证 | 退出 0；errors=[]/warnings=[]；不是工具身份认证替代 |

Root 原 66 是其完整 E2E，本次独立验真并复用；没有重新跑全部 600 或把本次 1 case 称为完整 66。本次原始反例、源审查、像素重算与两轴判断由独立 reviewer 执行。

## 问题与下一步

本次固定修复无待修 finding；13 路径及共享审查上下文已释放。Lead 按既有 T-03/T-04 和原子集成合同汇总后续门禁。

保留边界：same-origin iframe 是第二 Document，不是实际 Obsidian popout；宿主 app.css 取自 ASAR，未启动真实 Obsidian。纯日历日、两个宿主时区、结构化 DateTime、IME、owner adoption 与卸载的源/现有绿色证据未因本次 delta 失效；真实领域 America/New_York DST 缺失/重复时间仍属于 T-05/T-07，mock validateValue 不冒充实际域转换。未重跑全仓 build/lint/notices/bundle，不将旧消费者、全局编译债或图外 main/recovery 修复标为通过；这些不由本报告裁决。
