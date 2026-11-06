# 任务完成框最终命中与窄布局候选

Session: 20261105T094057Z
Task: 160-refine-task-hit-layout
Status: completed

## 聚焦交接

实施者native:/root/cleanup_final，无委派。按160及Root追加的同ProjectBoard窄pane/有界滚动精确授权，完成取代155的最终候选；**Root只应用160包，不应用155旧包**。155原ready/manifest/REPORT完整保留，未造REPORT-HIT或覆盖历史。正式仓库仅本不可覆盖REPORT，未改source、dashboard.css、共享primitive、产物、状态/Evidence/index或原报告；无提交、真实用户vault/账号/外部服务/clipboard操作。156–158已各自完成独立冻结及return后才继续160。

最终仍仅三源：src/modules/task/ui/TaskPage.tsx、src/ui/components/huhu/calendar/TaskRow.tsx、src/modules/home/ui/pm/ProjectBoard.tsx。包含155的18px圆形/pending视觉必要变化；TaskPage与PM完成框用现有非交互span按hu-hit分配32/44并居中18视觉，PM局部min-h-0/min-w-0取消dashboard通用button最小尺寸；Calendar现有label已分配32/44，无额外无必要gap。原callbacks、checked、ARIA、disabled、TaskContent metadata和领域格式保留，非任务布尔框仍方形。

PM窄缺陷已在正式原before确认：body保留desktop的单minmax(0,1fr)显式网格行，窄时两pane改overflow:visible却仍被压短，milestone正文侵入todo区域。Root补授权后，最终只在同一ProjectBoard body追加max-[901px]:grid-rows-none与max-[901px]:auto-rows-max，窄时按实际内容形成两行、保原body overflow-y:auto，宽布局不变。没有用overflow-hidden丢正文或动作，没有改共享CSS/领域/schema/其它页面。

## 产物与验证

真实before仍是Root未应用155的三源原字节；私有tree在/tmp/huhu-task-check-shape/hit-final，before/各阶段证据同目录。冻结时逐文件正式before一致，冻结后候选after SHA/mode无漂移。独占创建并设只读：

- /tmp/huhu-task-check-shape/hit-final/ready.patch SHA256 **90624acfa0e4bf21905202fa509c465898761207289ecd15162499d294201a27**。
- /tmp/huhu-task-check-shape/hit-final/ready-manifest.json SHA256 **0ef58ec3746c6da945ef7837f02f7880c2a381064adf6839e1501a36becc4555**；三源before/after SHA256/mode、真实source/candidate根完整。

### 实际源配对与浏览器边界

临时T99只位于私有tree，真实生产TaskPage由原T05初始化真实内存repository/service，另挂实际TaskRow四状态与ProjectBoard六条真实todo/milestone表面；PM I/O端口只供代表数据/回执，不声称真实项目文件持久化。入口、compiled graph、CSS和ASAR app.css摘要均由私有runner result.inputs记录。runner只选420与1440两代表宽度，verify各切实际pointer:none与pointer:coarse；不是正式66/858，不替换正式driver。实际适用owner是主Document，未借此称两个Obsidian窗口通过。

原源配对 original-before：临时树逐文件换成Root before三源后实测再恢复候选，文件未回写正式根。原TaskPage圆角4、coarse每行2内部点被相邻标题接管；真实标题x74侵入Checkbox44目标1px。原PM非coarse视觉32、coarse视觉44且圆角4，420的原pane正文重叠造成3/6点miss；它不是18px迁移新引入的问题。Calendar原布局在真实quad与更内侧点无独立命中缺口，所以不增加gap。该before运行是观察式记录，不把其status=passed称旧源设计通过。

最终 final-trusted/result.json：420/1440 × actual none32/coarse44，TaskPage2、Calendar4、PM6，每组12控件，合计48次目标观察；所有视觉18×18且radius≥9，computed ::before为32×32或44×44。真实CDP DOM.getBoxModel额外取到Calendar的18视觉与32/44 pseudo quad，中心重合。中心+8个内部1px点，及相邻标题/删除获得焦点后同点，总864次检查无miss；36组同帧相邻行几何无交集、同一行相邻动作无交集。PM六条跨两个pane均可滚动到完整目标，无父层覆盖；窄body按内容排布且仍由原容器滚动。

可信交互在目标**内部边点**执行：none用Input.dispatchMouseEvent，coarse用Input.dispatchTouchEvent（radius0.1）；每次记录新pointerdown与新回调，而非复用已有事件。8次（两宽度×两指针×PM/Calendar）均isTrusted=true，pointerType mouse/touch匹配，实际label、回调row/id和值对应；Calendar false/true、pending disabled且虚线、无toggle disabled均保持。独立普通Checkbox仍18px、圆角4，未被任务局部样式污染。TaskPage真实保存/完成回调由既有75项DOM回归及源未改handler约束，不假称在临时Chrome额外执行了原完整业务exercise。

### 实际命令与退出

- node node_modules/vitest/vitest.mjs run src/modules/task/ui/task-domain.dom.test.tsx src/ui/components/huhu/calendar/calendar.dom.test.tsx src/ui/components/huhu/calendar/ProductCalendar.dom.test.tsx：0，3文件75项，dom.log。TaskPage/TaskRow最终源码与此运行一致；其后唯一生产增量是PM body局部narrow类，最终Chrome消费该增量。
- node node_modules/typescript/bin/tsc -noEmit -skipLibCheck：最终0，types-final.log无诊断。
- node node_modules/eslint/bin/eslint.js 三候选路径 --max-warnings 0：最终0，lint-final.log无警告。
- node scripts/build-tailwind.mjs，再node scripts/build-styles.mjs --write：0/0，只写私有CSS，css-final.log；最终Chrome使用该生成CSS，正式样式未动。
- node --check scripts/ui-review/fixtures/T-99.mjs：0，probe-syntax.log（可信触摸最终driver）。
- node scripts/ui-review/run.mjs --ticket T-99 --matrix standard --out /tmp/huhu-task-check-shape/hit-final/final-trusted：0；2个有限宽度、每组2实际指针状态，errors=[]。
- 对最终raw几何同帧相邻行的Python校验：0，geometry-summary.json，48观察/864点/36行对，overlaps=[]。
- 正式根git apply --check --whitespace=error /tmp/huhu-task-check-shape/hit-final/ready.patch：0，未应用。

过程失败保留：最初用视觉中心±(hit/2−0.5)采样，coarse精确共享边界附近被邻项接管；CDP真实quad证明pseudo中心对齐，纠正了从computed top8误推1px偏移的诊断。保留该量化/触摸调整记录，不改Calendar组件去掩盖它；最终用完整32/44 quad及更内侧1px点、可信触摸交叉验证，不冒称所有亚像素边界硬件行为。wrapper首版在PM420仍因旧pane覆盖失败；单加pane min-content的私有试验也不足。实际body窄行改按内容分配后420/1440均绿。所有失败/diagnostic目录原样只留/tmp，未覆盖历史。

## 问题与下一步

最终三源包已可供Root批量应用并独立审查，明确取代155包。Root之后统一生成正式资产、重跑适用真实截图/矩阵；原passed858只保留旧输入历史，不是本修订的设计通过证据。此处未正式build main.js/styles.css、未运行正式66/858、真正Obsidian/popout、fine实体硬件或全部Home字段/领域持久化矩阵；临时实际pointer:none不能改称fine媒体。

本执行不是独立review，不裁定T05或T14最终通过；本范围原有窄pane阻挡已在授权内闭合。return0；完成return校验后停止全部读写并释放。
