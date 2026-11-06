Session: 20261105T094057Z
Task: 127-review-final-diff-focus
Status: completed

## 聚焦交接

独立high窄复验完成：连续postRender焦点修复通过本次源码/生命周期及真实Chrome控制；总体standards=request-changes、specification=request-changes，原因是另按本TASK实际测得Shadow行号目标高度只有22px，不满足严格NFR-002触控≥44px（桌面非coarse也低于32px）。这是继承的命中合同缺口，非125焦点修复新增；不能据单焦点修复通过关闭T16全部验收。

Reviewer: native:/root/review_t11；Risk high；Strategy independent；Independence required；Mode native。未参与125实现或Root合入，未委派；原实施者按125派遣回执由Lead核验。复用105/095未变结论；本次读取125 REPORT、candidate.diff、两源及真实FileDiff两个消费者/主题/样式上下文。只写本不可覆盖REPORT及/tmp/127-review-final-diff-focus，未写source、assets、state、正式Evidence、Git/index、用户vault或系统clipboard。

规范继续为Map48/Goal/Spec/T16、DESIGN3/UI002（designDigest 49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66），标准为AGENTS/dev/ui/testing及既有双轴合同。dev/ui原文摘要仍与105相同。没有重选设计或发明inline豁免。

review_mode: working-tree。125 REPORT SHA0eadeafb48b40fff85f97b89ecc71321f4ad6da0940ecd5aa02deff24eaec363；两源manifest SHA f7c486c4ed8190e8b886c6f9306626458a449f11211f53f6e79abae09a9190c1。开始/结束原字节SHA及mode全部匹配、无漂移：keyboard.ts a160dad6b91b9ca2fe91493e2ae4908d31690a30112f19dc8972e5876dc7d304；T16 index.mjs bae6d10921a49d62f15ce895cdd4adc8cf0c793bfe958fdd1eb67bf7d300f73b，均664。完整输入及必要上下文摘要仅在/tmp/127-review-final-diff-focus/review-input.json，Input-SHA256=de711f2d660d1c4dc8cdcc2f01e3717d1afb0d22a81cd701cdf3403f36b95e92；start-snapshot.json/final-snapshot.json保存始末核验。

## 产物与验证

### Standards output

Reviewer: native:/root/review_t11
Result: request-changes

**连续焦点修复：pass。** 真实调用仍为DiffSurface FileDiff及MultiDiffView的既有onPostRender→bind/unbind，未改消费者、第三方库或选行模型。keyboard.ts不再在第一次RAF开始释放归属，改为完成当次gutter tabindex/role/handler绑定后，同步调用当前node的rendered。一次键盘focus stint通过节点WeakMap保留到真实移焦/metadata或Document变化/隐藏/虚拟行消失/unmount；恢复前复核连接、可见性、Document焦点、当前activeElement与当次line/side，先更新focused再focus，正常focusin不会错误撤销自身归属；同一node已正确聚焦直接返回，不产生定时、循环或延迟聚焦。unbind释放临时focusin并清本node handler/语义属性。

本reviewer实际运行当前仓库两源，不注入候选代码：既定一个390/zh/paper/coarse case加原完整exercise通过，main/second的两个连续paint均要求gutter真实聚焦、solid、2px、同line，原后续断言仍在。另以只暴露真实库instance的私有观测控制执行late forceRender：两个Document都保持line1/solid/2px；Shift范围1→3及晚重绘、IME不选、真实外部button不抢、hidden后不恢复、新cacheKey metadata不恢复、unmount无迟到恢复均通过；各撤销路径focusin监听计数0。没有将一个偶然成功快照当作连续稳定证明。

负对照诚实保留：本次旧keyboard配同一新两帧full driver的一次运行也通过，不能声称此次full负控红；这与旧问题依赖真实churn时序相容，单次采样不是绝对稳定证明。本次再运行原旧keyboard的late-forceRender控制明确失败，first/late均BODY、line=undefined；同控制候选通过。旧文件注入仅来自/tmp/huhu-final-diff-focus/before中SHA00fb14f432bfdf108f703b5a3190225ddbebdceca64ff9f784ec29a46d3a579f，不替换磁盘源。125的paired-lifecycle中“先RAF恢复、第二onPostRender再删焦、第二paint仍BODY”的原时间线已回读，是作者历史根因证据，不冒称该详细timeline由本reviewer重新捕获。

**HIT-01 · P2 · 可交互Shadow行号目标只有22px高。**

位置：src/modules/versioning/ui/diff/keyboard.ts:38–44把[data-column-number]设为tabindex0、role=button；实际尺寸来源src/modules/versioning/styles/diff.css:6的--diffs-line-height:22px，MultiDiffView.tsx:337的库itemMetrics.lineHeight同为22；theme.ts:18只给outline，没有合规命中扩展。

实际Chrome153、960px叶子、compact/14、主Document与iframe中，对真实.huhu-diff-gutter[role=button]第3行测量：均为68.5×22 CSS px，computed lineHeight=22px。coarse测试中matchMedia('(pointer:coarse)')确实true；目标中心ShadowRoot.elementFromPoint命中自己，但中心上/下21.5px命中第2/4行。::before也仅22px高，不能把伪元素或父列宽度当成44px独立目标。非coarse桌面同68.5×22，中心±15.5px同样落相邻行。

影响：严格44px触控目标没有达标，触摸稍偏就选到邻行；桌面目标高度也低于32px。原常规button/DOM守卫不穿透Shadow，能漏掉这些被赋予button语义的行号；已有矩阵/焦点成功不能证明命中尺寸满足。该缺口在旧源码即存在，125没有改变高度，本次按显式TASK补充验证才揭示，不把它归因为连续焦点修复回归。

最小满足条件：使用既有库metrics/主题桥接或经批准的准确交互方案，让每个真实Shadow行号目标具有可独立命中的桌面32/触控44区域，邻行不能互相遮挡；加入实际ShadowRoot rect与边缘命中控制，保留焦点/选区回归。若批准的22px行高与独立32/44目标无法兼容，应交原设计owner明确裁决，不能由实现或review静默授予inline例外。此次只报告，不改样式/源码或设计合同。

### Specification output

Reviewer: native:/root/review_t11
Result: request-changes

连续postRender焦点、两次paint的同line/solid/2px与owner撤销在本次实证范围满足目标，105原单次RAF采样不能再扩称全部churn稳定；125修复与更严格driver可保留。

HIT-01违反Spec NFR-002（spec.md:165）及DESIGN §3.6命中区行（DESIGN.md:453）的桌面≥32、pointer:coarse≥44；当前无已知获批豁免。两轴分别作request-changes，不因该问题是继承的、存在22px代码行高描述或普通DOM guard没报错而判通过。

严格区分实际媒体：本机headless在关闭touch emulation后pointer:coarse=false，但pointer:fine也=false，因此非coarse测量不能伪称fine媒体已验证。尝试CDP pointer媒体/启动设置未使fine为true，headed Xvfb控制则在Chrome CDP启动超时；均属于环境/控制前置限制，未作为产品finding。coarse=true下22px不足是直接有效红证据，已足以确定NFR-002不通过；真实fine媒体和物理指针设备另保留未验证。源码22px全局桥接没有fine例外，但该源码推断不代替实际fine测量。

### 实际执行

| 命令/控制 | 实际结果 | 本地材料 |
|---|---|---|
| node /tmp/127-review-final-diff-focus/current-runner.mjs --suite frontend-redesign --ticket T-16 --matrix redesign --out /tmp/127-review-final-diff-focus/current-stable | 退出0；1 case加原完整exercise，两Doc连续paint断言通过 | current-stable/result.json、current-stable.log |
| 同参数，old-negative-runner.mjs → old-negative | 退出0；旧产品本次两帧full控制也通过，保留不改写 | old-negative/result.json、old-negative.log |
| 同参数，lifecycle-runner.mjs → lifecycle | 退出0；late redraw、Shift/IME/外焦/隐藏/metadata/unmount及listener0通过 | lifecycle/result.json、lifecycle.log |
| 同参数，old-lifecycle-runner.mjs → old-lifecycle | 工具退出126；有效旧产品负控，late line undefined而非1 | old-lifecycle/result.json、old-lifecycle.log |
| 同参数，hit-runner.mjs → shadow-hit | 工具退出126；有效目标尺寸红：main非coarse68.5×22<32，另已完整记录两Doc coarse=true同22<44 | shadow-hit/result.json、shadow-gutter-hit-targets.png、shadow-hit.log |
| node /tmp/huhu-final-diff-focus/check-types.mjs | 退出0；真实模块路径/依赖限定图0诊断；私有候选与已合入源精确相同 | types.log |
| pnpm exec eslint src/modules/versioning/ui/diff/keyboard.ts --max-warnings 0 | 退出0，零警告 | lint.log |
| 开始/结束两源SHA+mode | 退出0，2/2匹配，无漂移 | start-snapshot.json、final-snapshot.json |

材料根为/tmp/127-review-final-diff-focus。当前稳定runner去掉候选source注入，直接使用实际仓库两源；只选一既定case，不执行66。lifecycle私有probe相对真实keyboard仅加两行暴露node/instance，不改focus策略；旧负控明确绑定before源。Shadow测量只读目标与CSS，真正的边缘元素归属由shadowRoot.elementFromPoint确认。

额外前置失败均保留：shadow-hit-media与shadow-hit-fine在fine媒体真实性断言失败（退出126）；shadow-hit-headed为CDP启动超时（退出126）。它们没有进入有效fine尺寸测量，不冒称绿色或产品故障，也没有用重复跑直到偶然通过来消除失败。

未重跑全仓检查、全66、真实Obsidian/popout、OS IME或物理触屏；当前主文档/iframe与生成styles/实际app.css的原生Chrome控制只认证它们实际覆盖的边界。095/105其它源结论有界复用，未借此前pass覆盖新Shadow命中finding。

## 问题与下一步

1. 保留当前连续postRender焦点修复和严格两paint driver，处理HIT-01实际尺寸缺口，并把Shadow目标纳入原owner验证范围。
2. Root按实际影响完成最小修复或取得原设计owner明确决定，再复验严格命中与焦点；不把Source焦点通过或原66 case通过写成T16整体完成。
3. return结构校验及报告回读后明确释放keyboard.ts、T16 index.mjs与本轮必要上下文冻结；reviewer停止写入，正式状态/Evidence/后续实现仍归Root。
