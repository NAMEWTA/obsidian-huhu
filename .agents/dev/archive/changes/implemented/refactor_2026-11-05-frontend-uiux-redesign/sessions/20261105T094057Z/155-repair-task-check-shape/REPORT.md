# 任务完成框局部修正候选

Session: 20261105T094057Z
Task: 155-repair-task-check-shape
Status: completed

## 聚焦交接

实施者native:/root/cleanup_final；按155与Root补齐的HomePM shared精确授权实施，无委派。仅生成/tmp/huhu-task-check-shape候选，本REPORT为正式仓库唯一写入；未写产品/样式/产物/状态/Evidence/index/原报告，无提交或真实库/账号/剪贴板访问。设计依据DESIGN3 §5任务18px圆形及pending虚线，未新增控件或设计。

精确三路径：src/modules/task/ui/TaskPage.tsx、src/ui/components/huhu/calendar/TaskRow.tsx、src/modules/home/ui/pm/ProjectBoard.tsx。TaskPage完成Checkbox加rounded-full，保pending border-dashed与原ARIA/disabled；Calendar TaskRow同样圆形并将现有pending映射aria-busy，仍按原逻辑禁用；PM通过project.body.milestones/todos与service.toggle确认是完成清单，删除size14覆盖并加圆形。非任务布尔/filter/全选控件不改。PM补min-h-0/min-w-0只取消dashboard.css通用button最小尺寸，由共享Checkbox提供18px视觉并保data-hit-control命中，不写共享CSS。原callbacks、checked、TaskContent metadata和领域格式不变。

## 产物与验证

真实before来自正式当前三源，逐项对照后冻结；私有tree包含当前源副本与仅此三生产源候选。独占ready.patch/ready-manifest.json含每源before/after SHA256/mode，未覆盖：

- /tmp/huhu-task-check-shape/ready.patch SHA256 af68b68c739b48864c923a907768e9ce9c7abb50ee61a113ce321bd0d493c25d。
- /tmp/huhu-task-check-shape/ready-manifest.json SHA256 2b9b54df6dad8e8f9ca035394dbb4a22fe8e14f8ebaefa136e5f7a7440fe2765。

候选树中实际命令：

- node node_modules/vitest/vitest.mjs run src/modules/task/ui/task-domain.dom.test.tsx src/ui/components/huhu/calendar/calendar.dom.test.tsx src/ui/components/huhu/calendar/ProductCalendar.dom.test.tsx：0，3文件75项，dom.log。
- node node_modules/typescript/bin/tsc -noEmit -skipLibCheck：0，types.log无诊断。
- node node_modules/eslint/bin/eslint.js 三候选路径 --max-warnings 0：0，lint.log无警告。上述类型/lint后唯一增量是PM class字符串中的min-h-0/min-w-0，后续实际Chrome验证已消费最终三源，不冒称扩大类型范围。
- node scripts/ui-review/run.mjs --ticket T-99 --matrix standard --out /tmp/huhu-task-check-shape/render-final：0。这是仅私有tree的临时T99与runner slice(0,1)，不是正式矩阵；生产TaskPage、TaskRow四状态及ProjectBoard真实组件配代表数据挂载，使用现有正式styles.css与ASAR app.css，结果inputs固定真实编译图。原Task05 fixture只作真实TaskPage初始化，另挂实际日历行和PM组件；未改变正式fixture。
- 正式根git apply --check --whitespace=error /tmp/huhu-task-check-shape/ready.patch：0，未应用。

真实Chrome最终测量：TaskPage2个、Calendar4个、PM2个Checkbox均18×18、computed radius33554400（圆形，≥9）；Calendar四状态分别unchecked、checked、pending disabled且borderStyle=dashed、无toggle disabled。样式不靠class字符串测试推断。PM首次实测32×32暴露dashboard.css的通用min，局部取消后18；render/render-2退出126保留该失败。render-3测量已全部通过，但临时fixture缺exercise导出导致工具126；仅补空exercise接口后render-final0，不伪称执行了额外产品业务exercise。既有75项回归含真实任务完成/保存失败与pending，未新增镜像单测。

## 问题与下一步

交Root批量应用后统一真实截图/正式矩阵与生成产物。临时单组合只证明上述计算几何与状态，不证明fine/coarse可信命中、所有主题宽度、原66/858或真实Obsidian；未构建正式main.js/styles.css。本执行不是独立review，不裁定T05或T14通过。return0；return校验后停止155全部读写，保留冻结包，按授权继续156。
