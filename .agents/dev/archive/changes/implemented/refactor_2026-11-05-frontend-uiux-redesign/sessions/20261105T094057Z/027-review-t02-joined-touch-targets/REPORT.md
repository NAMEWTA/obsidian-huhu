# 任务回报

Session: 20261105T094057Z
Task: 027-review-t02-joined-touch-targets
Status: completed

## 聚焦交接

Reviewer：native:/root/review_host_types，独立 high 只读补充审查，未参与原语/base.css 实现，未委派。假设已由真实组件、当前生成 CSS、elementFromPoint 扫描和真实 CDP 指针/触摸事件确认：joined 图标和短标签的横向独立命中区不足 44px，wrap 时还存在纵向隐形命中区重叠。standards 与 specification 均 **request-changes**，同一目标问题为 P2；不将浏览器的触摸目标启发式补偿误写为 CSS 已满足 44px，也不把无关模态焦点行为列为 finding。本报告不可变并释放限定输入；没有修改源码或共享资产，也没有宣称 T-02 完成。

## 产物与验证

### 冻结输入与审查策略

Review mode: source-files。Observed HEAD 为 `37fcede4210a19bcc2a74809e7fdd301e5717957`，仅作为仓库观察，不用 HEAD 冒充当前字节。Risk: high；Strategy: independent；Independence: required；Mode: native。原语实现者为原 012/020 writer，base.css/生成 CSS 由 Lead/T-01 的既有实现负责；reviewer 未实施这些输入。真实独立身份与派遣关联由 Lead 以工具回执核验。

开始和最终返回前核验下列七输入，drift=[]。四个原语源还逐项匹配 021 的已冻结哈希，确定本次不是四项修复后新的源码漂移。

| 文件 | SHA256 |
|---|---|
| src/ui/components/toggle.tsx | 72646e6eb54c8cdb4d6a57810efda106c460cc3cda9947275a8ae22f4721af1d |
| src/ui/components/toggle-group.tsx | 15f1f291d8d34f8a017adf7a84a30a8b022b6533b390350cd14a77d016d08b75 |
| src/ui/components/huhu/SettingsFormControls.tsx | 2b5456c0bee2564687ec419bb6ba28c1d9ab670db5d45352276e6e68ac822c94 |
| src/ui/components/huhu/SegmentedControl.tsx | 7f92cbb3d51bdc235e3cc1dd864cd9ea279d81a6c6542c7edd8424772833d68b |
| src/ui/styles/base.css | d1587fda54a316bd78c16dab54f2f5aa5eb649d105a2be48029b61d5d21675ec |
| src/ui/styles/tokens.css | 260a007a50e58731b185001024902bf59a722b1d3e387940d0c701dd1d2e582e |
| styles.css | 4461839f6f7092b499d41aa57d6ec6e8491f23585f30c8be85b790d8880837d2 |

输入清单为 /tmp/huhu-review-t02-joined-touch/input-sha256.json；浏览器仅使用 styles.css 固定副本。标准/规范沿用已读且未变的 AGENTS、dev/ui、code-review 风险与测试证据规则、T-02、Spec AC-011/012 和批准 DESIGN revision 3 §3.6（desktop≥32、pointer:coarse≥44，紧凑模式不缩小）。本轮再次回读限定源码和 data-hit 规则，按 Lead 后续消息增加一个窄根 wrap SegmentedControl 反例；没有扩展到 026 的模态焦点修复、其他控件或广泛 suite/build。

### 私有探针与实际执行

仅写本 REPORT 和 /tmp/huhu-review-t02-joined-touch。Probe 直接导入当前共享 ToggleGroup/ToggleGroupItem、SegmentedControl；真实 React/Radix，生产 guarded ownerDocument 适配使用实际依赖图精确入口计数与摘要，没有 mock 控件、修改 node_modules 或构造第二套输入引擎。临时 esbuild 只生成 /tmp fixture，不构建插件、不覆盖 styles.css/main.js；依赖输入为 browser-inputs.json 和 wrap-inputs.json。

环境：Linux、Node v26.11.1、pnpm 11.1.3、Google Chrome 153.0.8010.47，100% 缩放。两个密度分别 compact/comfortable；CDP 切换 touch emulation 后明确读取 matchMedia('(pointer: coarse)')，false/true 均与目标匹配。测量的是实际 DOM button、computed ::before、elementFromPoint 和真实事件，未用类名猜测命中区。

| 命令/检查 | 退出码与实际观察 |
|---|---|
| 七输入开始/结束 SHA256 与四原语对 021 核验 | 0，全部一致 |
| 初次私有 browser fixture | 126，fixture 在 body 生成前 append 导致初始化失败；没有控件断言。已仅修正私有 HTML body，原输出为 fixture-initialization-failure.json/.log，未当成产品缺陷 |
| `node /tmp/huhu-review-t02-joined-touch/browser.mjs`（mouse-only 中间版） | 0，12 组两项布局观察 + 2 keyboard；mouse-result.json 保留初始几何与鼠标边界证据 |
| 同一入口最终真实 touch 版 | 0，20 个布局样本 + 2 keyboard，errors=[]；browser-result.json / browser.log。粗指针使用真实 Input.dispatchTouchEvent touchStart/touchEnd，记录后续 click.isTrusted=true；精细指针使用 Input.dispatchMouseEvent |
| `node /tmp/huhu-review-t02-joined-touch/wrap-browser.mjs` | 0，窄根两行 compact/comfortable，errors=[]；wrap-result.json / wrap.log |

命令退出 0 仅表示采集及媒介/事件/键盘断言完成，下面的 44px 合同评估实际失败，没有将采集程序成功冒充控件验收通过。初始 mouse-only、两项 touch 以及最终三项补充材料均留在 /tmp；未通过删除失败样本、修改生产样式或拉长标签获得绿色。

### 实际几何

原要求的两项控件：ToggleGroup type=single/size=sm、两个 16px SVG 图标且分别有 aria-label；SegmentedControl 默认 md，标签“年 / 月”；另有两个英文长标签对照。随后仅为排除“两项外缘补偿”的歧义，增加相同组件的三个图标和“年 / 月 / 日”中间项。

| 样本 | visual width | visual height compact / comfortable | coarse ::before width × height |
|---|---:|---:|---:|
| joined sm 图标每项 | 32 | 32 / 36 | 32 × 44 |
| 年 / 月每项 | 37.015625 | 32 / 36 | 约 37.0156 × 44 |
| Long first label | 114.96875 | 32 / 36 | 约 114.969 × 44 |
| Long second label | 134.46875 | 32 / 36 | 约 134.469 × 44 |

精细指针下 ::before height 为 32/36，横向相同，因此本样本满足 desktop≥32。粗指针高度确实扩到 44；失败维度是独立项的横向分区，不是把 visual 32/36 高度误当成 hit 高度。

0.5px 间隔的 elementFromPoint 横向扫描显示：图标内部有效区约 32px；短中文项约 38px（包含浏览器边界取整误差），都不足 44；长标签有效区 >114px。三个图标的中间项实际分区 x=[95.5,127.5)，宽32。该中间项中心左右 21.5px（44px 正方形内沿）处，elementFromPoint 及真实 touch 都落到相邻 Icon1/Icon3，分别只发出 a/c；中文中间“月”的对应点落到“年 / 日”，分别只发出 a/c。上下 ±21.5px 则仍落在该项扩展后的 44px 高度内。

真实 touch 与鼠标的差异明确保留：Chrome 会对某些**外缘**近失点做触摸目标调整，elementFromPoint 为背景时仍可能产生原项 trusted click。故不能说所有触摸外缘都落空；但它没有为多个内部项提供各自互不重叠的 44px 分区，三项中间控制消除了只靠两端补偿的歧义。不能依赖某一 Chrome 的自动调整作为 CSS/跨宿主命中合同的实现。

### bounded wrap 反例

84px 宽容器内渲染实际 `<SegmentedControl wrap>`，标签“年 / 月 / 日”，稳定排成两行。首行第一项与次行第一项同 x，visual 高 compact32/comfortable36，行间 gap2；每项 coarse pseudo height44：

- compact：第一行 y638–670，第二行 y672–704，两 pseudo 的纵向相交区高 **10px**。
- comfortable：第一行 y658–694，第二行 y696–732，两 pseudo 相交区高 **6px**。
- comfortable 固定物理点 (84.5078125, 695)，focus“年”时 elementFromPoint 与真实 tap 都为“年”；focus“日”后，同一点两者均为“日”。每次最多一个回调，但实际目标由焦点层叠决定，两个独立命中区域互相覆盖。

compact 也测得同点触摸随焦点目标不同；其 elementFromPoint 与真实 touch 的一次差异原样记录，未把触摸目标调整和纯 CSS 命中等同。纵向 10/6px 重叠由真实坐标与 computed pseudo 尺寸直接算出，不依赖这一差异的根因解释。

### 单次分发与键盘对照

所有采集点每次至多一次 change；点击已选 SegmentedControl 可不分发、原始 ToggleGroup 点击已选项可按库合同发空值，两者没有混为重复执行。短/长 SegmentedControl 的真实 CDP ArrowRight 均把焦点和 checked 移到第二项，只发一次 b。本范围未发现新的键盘或回调双发缺陷，也没有为验证命中区改动其行为。

## standards

Reviewer: native:/root/review_host_types
Result: request-changes

**HIT-01 · P2：joined 短项没有独立的粗指针最小命中区，换行后还会相互遮盖。**

主定位：src/ui/styles/base.css:35；关联 src/ui/components/toggle-group.tsx:38、toggle-group.tsx:77，以及 SettingsFormControls.tsx 的 wrap 组合。data-hit-group 的 direct-child 规则把 pseudo width 强制改成 100%；ToggleGroupItem 又带 min-w-0，标有 data-hit-control 的节点也不经过通用 native min-width 规则。于是视觉较窄的 joined 项只剩 32/约37px 横向区。wrap 仍让所有 44px 高的伪元素跨过 2px 行间距，出现上述真实重叠和焦点相关的同点选择。

依据：ui Skill 的 desktop32/触控44、共享控件原生语义和不可重叠目标要求，以及本次 TASK 的独立边界合同。风险是粗指针用户在短工具栏/短中文分段中难以准确触达独立操作；wrap 时相同位置可能按焦点触发另一项。不能把“伪元素 nominal height44”或“长标签 sample通过”作为全部项符合标准。

最小修复满足条件：只处理 joined/SegmentedControl 的命中布局，粗指针下为每项分配横向和纵向均至少44、互不重叠的独立 cell/占位区域；保留批准的32/36视觉高度可通过内部视觉层或透明布局留白实现。必须处理 wrap 的行步进/间距，不能仅去掉 width100%（会横向重叠），也不能只给宽度加 min44 而留下两行 pseudo 交叠。修复后用相同二项/三项图标、年/月/日、长标签和84px wrap反例验证两侧/两行真实 hit partition、focus变化后的同点归属、实际tap、单次回调与键盘；无需重做其他控件。

## specification

Reviewer: native:/root/review_host_types
Result: request-changes

同一 HIT-01 同时不满足批准 DESIGN §3.6：pointer:coarse 下 ≥44，紧凑模式不得缩小；T-02/AC-011 需让共享控件兑现尺寸合同。desktop 对照及长标签通过，不抵消短项粗指针和 wrap 反例。只报告这一已证实的目标问题；没有额外推断 026 的焦点修复、主题、模态或模块实现存在缺陷。

## 问题与下一步

限定审查完成，候选输入已释放；七哈希前后均一致，原语与 021 一致。Lead 将 HIT-01 交有权限的共享控件/样式 writer 做最小修复，并统一重建生成 CSS 后用相同反例复审；报告没有修改源/测试/资产/Git/正式状态，也没有新增任务对象。

未验证或不在本次范围：真实移动 Obsidian/WebView、其他浏览器的触摸调整、完整 T-02 fixture/全局样式回归、原生 popout与026模态焦点修复。未运行 broad build/suite，也未重复 021 已通过且本轮未改变的类型/lint；本次新增事实仅是过去长标签证据未覆盖的短/图标 joined 与 wrap 目标风险，不回写旧不可变审查历史。
