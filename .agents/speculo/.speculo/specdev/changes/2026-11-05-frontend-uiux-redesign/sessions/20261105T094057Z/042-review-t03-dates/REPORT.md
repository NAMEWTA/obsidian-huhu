# 任务回报

Session: 20261105T094057Z
Task: 042-review-t03-dates
Status: completed

## 聚焦交接

独立reviewer：native:/root/review_toolchain，既有gpt-6.1-sol high；未参与040实现，未委派。standards **request-changes**；specification **request-changes**。确认5项：4项P2（范围dismiss错误残留、弹层裁焦点圈、Range滚动条裁44目标、缺批准Today/Clear footer）和1项P3（DateField图标/今日标记外观偏离）。原5 unit/12 DOM、生产/测试类型、生产lint通过，不能覆盖新增组合边界。

12源码/fixture及共享CSS、modal-layer、UI词典前后无漂移。完整2366证明输入已在审查开始逐字校验并私有保存；原96点证明有效，但其焦点/命中测量对象是standalone Calendar，不覆盖本文真实Popup裁切反例。**明确释放本次日期12路径及约定共享只读输入冻结，供Lead批量派发修复。** 唯一仓库写入为本REPORT，其余过程仅 /tmp/huhu-review-t03；无源码/依赖/资产/配置/Git/状态/Evidence改动，不宣布T-03或Goal完成。

## 产物与验证

### 精确输入与独立策略

Review mode: source-files；Risk: high；Independence: required；Strategy: independent；Mode: native。observed HEAD37fcede4210a19bcc2a74809e7fdd301e5717957。已读040/042 TASK、040最终REPORT、冻结源、T-03、Spec AC-021–023、Map revision13及批准DESIGN3 §3.6/§5/§7，沿用AGENTS/dev/ui/code-review合同。034/037/T02历史不冒作日期实现参与；T04继续写入的图外源排除，不要求全仓冻结。

12路径清单 /tmp/huhu-t03-implementation/frozen-sha256.json 的实际SHA为 **d57ec4cab89ec71a0f35187a95c8617c4f5c2524f27b63f72ed91e5b0e6c269f**，逐源匹配frozen/及当前字节。覆盖日期目录7生产文件、3测试及T-03两个fixture文件。

040 final-exact-native/result.json：输入摘要 **f6aed0864c849128f909f990284041bbfb072a87b1a323f3d2c63c32ca1d1ce9**，2366输入，status=passed/errors=[]、1矩阵case。开始逐项重算SHA并保存完整输入字节（约5.5MB）到 /tmp/huhu-review-t03/proof-inputs、原result/driver/receipt到original-proof；ASAR虚拟输入按header/entry实际提取app.css校验，未按普通不存在文件误判。全部匹配后先通知Lead，才排除后续不相关图外改动。初次核验记录proof-verification.json。

共享styles.css SHA **71780f2d2b599e8f690a96d45d8839310fc7e19a4694b9c5e80b10253b43573e**。结束再次确认12源、该CSS、modal-layer及UI词典匹配；新私有native图的9个重叠生产/fixture输入全部一致，重算输入摘要仍为上述f6aed…1ce9。原driver单独SHA b681f9b1801d9f318760913cb3de5991416a90756962e1d0071e32535bc60cac；新range-edge-native.mjs协议SHA **786ccbaa6822c3216d0dad7bfa00f6f70587d1ebb7c24d52c99e7a9094f658a8**。图输入摘要相同不意味着两driver协议相同，已分别留存。结束核验final-verification.json。

### standards 输出

Reviewer: native:/root/review_toolchain
Result: request-changes

**S-01 · P2 · Esc/点外部关闭范围后，未提交草稿错误仍污染合法已提交值。**

定位src/ui/components/huhu/date/DateRangeField.tsx:45–47、38及78。opening(false)只关open，不reset本地from/to/draft；错误仍从未提交的from/to计算，trigger却显示props.value。Cancel按钮另有reset(value)，因此三种dismiss路径不一致。

独立实际组件反例：value为2026-11-10..20，打开后把End改成11-01，出现倒序错误；Esc或点击外部后popup确已移除、onChange未调用、trigger仍显示合法11-10..20，却继续aria-invalid=true并显示“End date must not precede start date”。同样输入用Cancel控制则清除草稿错误。独立两反例失败、Cancel控制通过；新实际Chrome也重复确认该合法committed值、关闭状态和残留错误，见range-edge-native/result.json的focusedReview.rangeEsc。

最小修复：取消性质的关闭要丢弃本地未应用draft及其错误，同时保持props.error等真实外部错误；Apply仍提交正确草稿，不能以关闭时onChange重写父值来消除错误。保留外部受控替换和开放端点合同。

**S-02 · P2 · coarse日期弹层裁掉标准外焦点圈，standalone绿色未覆盖真实组合。**

定位DateField.tsx:117–128、DateRangeField.tsx:105–109与Calendar.tsx:77–79。day button使用clip-path保护44命中，标准outline移到td；但DateField继承共享PopoverContent的overflow:hidden，Range明确overflow:auto，祖先继续裁切td外圈。

新实际Chrome320/coarse，DateField popup x4/w312；Nov21首列td x6/w44，真实键盘模态后focus-visible=true，outline2px/offset2px/solid，左paint边界应为x2，而popup从x4开始裁切。已查看稳定截图 /tmp/huhu-review-t03/range-edge-native/review-popup-coarse-first-column-focus.png：焦点矩形左竖边缺失。Range同样td x6、popup x4，overflow:auto，截图review-range-popup-coarse-first-column-focus.png亦缺左边。

完整rect/属性在同result的popupFocus、rangePopupFocus。040的date-focus-main-coarse.png是standalone Calendar；该路径没有Popup祖先裁切，不能证明弹层焦点圈完整。最小修复需分离命中裁切与焦点装饰的边界，保留44物理day、312/308框架及完整2px+2px圈；不要缩圈、改内圈或降低offset冒充通过。共享Popover为只读上下文，优先在日期组合范围解决，确需共享修复由Lead协调。

**S-03 · P2 · Range垂直滚动条压缩日历可用宽度，实际末列内部命中不足44。**

定位DateRangeField.tsx:109、168，关联Calendar.tsx:61的max-w-full及固定七列44。Range同时设置max-height和overflow:auto；经典垂直滚动条消耗宽度后，日历根被压缩，308网格仍不缩，生成水平滚动与裁切。

新实际320/coarse组合：popup x4/w312，但clientWidth297、scrollWidth310；calendar根width297，内部grid x6/w308/right314。Nov20末列button x270/w44，所需严格内点 **(313.5,873)** 为中心X+21.5，仍在该button的数学内部，elementFromPoint却落到Popover/滚动条而非day；实际Input.dispatchMouseEvent后day-click计数Δ0。完整证据rangeRightInterior及上述Range截图。不是旧exact-boundary歧义，也不是只比较nominal矩形：实际允许的内部点已经不能触发日历。

最小修复须在受限高度的实际Range弹层中同时容纳可用7×44和滚动布局，让末列/首列都保有独立目标，不能依赖横向来回滚动补偿被裁的日格，或将44/312缩小。新增实际Range scroll viewport的两边/邻focus命中控制，保留窄屏字段纵向排列及可达Apply/Cancel。

### specification 输出

Reviewer: native:/root/review_toolchain
Result: request-changes

S-01违反范围草稿取消合同；S-02/S-03分别违反DESIGN标准焦点及T-03 coarse窄宽独立命中要求，同一问题不重复计数。另有两项批准设计尚未实现：

**V-01 · P2 · DateField浮层缺少批准的“今天/清除”底部操作。** 定位DateField.tsx:117–128，PopoverContent仅Calendar。DESIGN §5 DateField行明确底部“今天 / 清除”。独立DOM语义测试失败，新Chrome popup完整button清单仅前后月及日期格，没有Today/Clear footer；外侧clear按钮和Range预设不等于DateField批准的底部操作，选中别月时也没有该Today快捷路径。最小修复在日期共享组合内补齐本地化动作，走既有校验/commit路径，遵守bounds/readOnly/disabled/required和clearable（尤其DateTime复合清空）合同，避免新增第二日期引擎。

**V-02 · P3 · DateField图标及今日标记仍偏离批准外观。** 定位field-parts.tsx:29–35、DateField.tsx:92–103、Calendar.tsx:82。InputControl先Input后children，日历图标成为输入右外侧按钮；批准设计为输入左侧日历图标。today样式明确为粗体+下划线，批准设计为强调色文字+底点。已查看040稳定原生截图date-focus-main-coarse.png，今天5为黑色下划线、图标在右侧，与源一致。该P3仅要求按同一批准DateField行完成外观，不借机改其他控件；保留trigger/ref/可访问名及命中、焦点合同。

### 已确认有效的合同与限制

- 真实安装@daypicker/react10.0.2的scoped exports/locale/DayPicker接口与React19匹配，定向真实types通过；只用库TZDate/DateLib做适配，无转写时区引擎、epoch持久化或领域模块导入。
- 独立unit5通过：严格四位年/0000及0..99、闰日/rollover、含边界、预设today..+6与today-29..today、月边界、HH:mm及IANA语法。Calendar以固定区组件适配再返回年月日，不将内部Date对象序列化为领域epoch。
- 原DOM12通过：非法draft保留/关联错误、valid blur/Enter、required清空及parent echo、只读禁用、范围倒序/外部替换/开放端点/required、DateTime无效日期阻止后续时间复用旧date、结构zone/语法及caller错误码/文案、Saturday/中英locale。
- DateTime必须显式initialTimeZone和validateValue；真实候选验证后才onChange，无默认成功端口。native夹具的validateValue={()=>null}及DOM domain-gap stub仅证UI端口，**不证明真实NY DST gap/fold转换**；该领域证明仍归T05/T07，未当成本票缺失的域实现。
- 初看Range Enter无局部composition ref的假说已排除：共享Input真实useImeTextFieldProps在入口消费组合Enter。独立两端IME回归通过，普通Enter恰好一次提交；不要求添加平行IME引擎。月份前/后导航的focus疑点也被新原生排除：focus-visible时实际2px/offset2px/solid完整，未列缺陷。
- 原native96点按源码断言/结果逐条核验：fine±15.5（所需32square）、coarse±21.5，四邻focus×四边×fine mouse/coarse mouse+touch×两Document，坐标无缺项/重复；280/34/238和312/44/308、无计算面积交叠成立。原driver每点断言实际CSS日、一次可信click/一次callback后记录坐标。该证明仅standalone，不掩盖S-02/S-03真实弹层边界。
- 原实际NY以外的Kiritimati/Adak host-zone选择都为2026-11-22，且真实IME、开放Popover主文档→iframe迁移、确切trigger恢复、嵌套Esc和开放卸载cleanup证明有效。仅同源iframe，不冒充原生Obsidian浮窗。

### 实际检查与证据

| 检查 | 实际结果 |
|---|---|
| 12源、manifest、2366原证明输入/ASAR/摘要开始校验并私有复制 | 全匹配；proof-verification.json，完整字节proof-inputs/ |
| pnpm exec vitest run --project unit src/ui/components/huhu/date/date-value.test.ts | 退出0；5 tests；unit.log |
| pnpm exec vitest run --project dom src/ui/components/huhu/date | 退出0；2文件12 tests；dom.log |
| pnpm exec tsc -p /tmp/huhu-t03-implementation/tsconfig.json --pretty false | 退出0；真实生产/date/fixture声明范围；types-prod.log |
| 同命令tsconfig-test.json | 退出0；真实日期测试及fixture；types-test.log |
| pnpm exec eslint 七个生产日期文件 --max-warnings 0 | 退出0；零警告；lint.log。未把默认忽略的fixture说成lint通过 |
| TMPDIR=/tmp/huhu-review-t03 pnpm exec vitest run --config /tmp/huhu-review-t03/vitest.config.mts | 宿主退出126；7 tests，4 passed/3 failed；Esc/outside同根因两例及缺footer失败，IME两端/普通Enter/Cancel控制通过；independent.log |
| python3 /tmp/huhu-review-t03/verify-original.py | 退出0；原96点坐标/集合/几何/lifecycle/host-zone记录核验；original-proof-check.log |
| 私有focused-native.mjs、popup-focus-native.mjs、range-focus-native.mjs、range-edge-native.mjs | 各退出0，真实生产图/ASAR/最终共享CSS，1case基础几何并采集必要新反例；最后result含全部focused证据。没有重跑96或full66 |
| python3 同目录verify-focused.py range / focus / edge / footer | 四命令均退出1，各自明确验证上述失败；对应*-check.log。采集result的passed仅代表基础case/采集完成，不冒充新增合同全绿 |
| 结束12源/约定共享上下文、fresh9个重叠源、摘要、git diff HEAD --check限定12路径 | 退出0，drift=[]；final-verification.json。实际未跟踪新源以快照/真实编译为审查依据，不用tracked diff冒称完整历史 |
| validate-dispatch stage=dispatch | 退出0，errors=[]/warnings=[] |

所有新过程均 /tmp/huhu-review-t03。新driver是原冻结driver的私有单case/定向exercise副本，仅改变审查协议；不编辑正式runner/fixture/共享CSS。自有Chrome由各driver Browser.close并等退出，无全局清理。已实际查看standalone和popup focus截图；早期focused-native popup截图曾在过渡中，仅作诊断，S-02及S-03使用等待实际animations完成后的稳定range-edge-native截图和几何。没有用happy-dom伪尺寸、class-only几何测试或mock域端口替代真实命中/时区转换。

## 问题与下一步

全部实际发现及原生证据已即时发Lead；现释放冻结。请批量修复三项组合行为/布局、批准footer和P3外观，重新冻结后独立复审。重点保留已通过的严格值/受控草稿/清空/IME/端口/Portal迁移，并把命中与完整焦点控制扩展到真实DateField、DateRangeField弹层及其受限高度滚动状态，不能只复测standalone。

最后完整66矩阵归Lead；本报告不接管其运行，也未宣称生产总build、启动预算/notices、旧消费者迁移、T05/T07真实DST或原生宿主门通过。真实Obsidian主窗/popout、移动WebView与全票视觉/密度/缩放汇总继续按原子集成账本验收。无提交、推送、发布、正式Ticket/Goal状态修改。
