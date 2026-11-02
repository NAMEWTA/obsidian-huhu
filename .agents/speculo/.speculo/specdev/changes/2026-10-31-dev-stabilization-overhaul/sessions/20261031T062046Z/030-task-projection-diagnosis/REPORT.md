# 任务回报

Session: 20261031T062046Z
Task: 030-task-projection-diagnosis
Status: completed

## 聚焦交接

本轮只读诊断交回，未复现任务保存后列表/计数不一致的行为红灯；feedback_loop_ready=false，根因仍未知，不置 Ready、不提供已确认修复。新增独立 Chrome + 真实 IndexedDB 提交接缝，覆盖独立任务页和 Home 紧凑 Widget；六组规模及两组筛选/取消延伸均通过实际合同断言。没有修改产品、现有测试、正式 diagnosis/Ticket/Evidence 或共享 runner。

## 产物与验证

### 原入口核验

读取 SpecDev D、feedback-loop、incident-evidence 分诊约束，沿用 dev/ui 工程规则和冻结边界。实际回读完整 Ticket19、AC261、source W5.7、docs/task-domain.md、正式 T19 分诊和既有 happy-dom 三例脚本/原始摘要。没有重复运行这三例。原文通过 `gh` 只读命令 只读取得，exit 0；原始报告（来源统一为 [#41](https://github.com/NAMEWTA/obsidian-huhu/issues/41)） 明确“打开任务页，新建一个带截止日期的任务并保存”，虽然模块概括为看板/日历/待办。

实际查看 `docs/images/readme/tasks.png`：独立 Tasks 导航、All 7 / Incomplete 6 / Completed 1 / Overdue 2，无 Home 看板容器。这支持优先核对独立任务页，不把 Home 当作已证实的原报告入口。Home 仍是 AC261 必需消费者，其真实调用为 TasksWidget → homeServices.taskViews.mount(host,{compact:true}) → mountTasks → TaskPage；编辑调用真实 editTask → 独立 React root 的 TaskEditor。入口说明与原图 SHA 存 `diagnostics/T-19/home-entry-observations.json`。

### 新探针与真实边界

所有新增工件限 `diagnostics/T-19/chrome-*` / `home-*` 和本报告。`chrome-fixture.tsx` 挂载真实生产组件、TaskService、TaskRepository、查询与编辑 runtime；Home 使用真实 TasksWidget，经 homeServices 非拥有引用接入同一 service，没有另建 task store。宿主 storage 端口替换为浏览器真实 IndexedDB 读写事务，等待 transaction complete 才回传字节；虚构种子按生产 TaskState 格式生成并由真实 Repository decode 校验。外部资源搜索为空，所有任务均无资源关联。使用固定 now、UTC、有限 7/500/2000 条虚构记录，不读取真实用户库。

runner 复用现有 cdp.mjs、生产 sonner/radix 构建适配器与 T23 独立 Chrome 启动模式，未修改共享助手。仅从 ASAR 读取 app.css，不启动 Obsidian；独立 Chrome 临时 profile、临时构建、进程在 finally 完整清理。窄组件图首次触发生产适配器匹配计数保护，随后保留 ComponentGallery 模块引用以满足相同适配图覆盖，但没有渲染 gallery，也没有绕过或修改 adapter guard。

每阶段记录真实领域 revision/counts/page items、实际 DOM rows/header/filter、对话框存在性和 performance.now：点击保存、storage transform/commit、发布、onSaved、关闭、下一帧。保存成功后的下一帧核对真实查询页与列表完全一致、无重复标题行、计数一致。大集合分页按生产 50/20 上限比较，不把分页截断当数据丢失。虚构标题全部唯一，所以标题重复检查在此夹具等价于重复行检查，不泛化为任意真实重名任务检查。

实际 UI 点击创建、编辑、完成；失败保存通过唯一 storage 故障开关在提交前抛错，确认输入保留且不关闭，再经真实 Retry loading 恢复。延伸小集合通过实际页按钮/Home Select 切到 Completed，编辑取消并确认，下一帧列表/计数一致，真实领域 cancelled 记录仍保留。这没有 freeze UI、fake projection、增加产品延迟或改变成功标准。

### 实际运行与输出

命令均从仓库根执行 `node .agents/speculo/.speculo/specdev/changes/2026-10-31-dev-stabilization-overhaul/diagnostics/T-19/chrome-run.mjs`，过程中探针修正版本及真实结果分别保留；摘要和退出记录在 chrome-commands.json。

| 运行 | 退出 | 实际观察 |
|---|---|---|
| 首次窄图构建 | 126 | radix adapter 入口匹配数不满足；chrome-build-failure.json。是探针搭建失败，不是行为红灯 |
| 初次 UI 流程及补观察后复跑 | 各126 | 人工注入写入失败后，fixture 未使用 Retry loading 就点被禁用的完成控件，观察预算耗尽；chrome-fixture-failure-1/2.json 保留。失败保存本身正确保留输入，非产品 red |
| 修正 fixture 恢复步骤，page/home × 7/500/2000 | 0 | 六组合 no-red，chrome-six-cases.json；原六组 fixture 字节保存为 chrome-six-fixture.tsx |
| page/home × 7，追加 Completed 筛选与取消 | 0 | 两组合 no-red，chrome-result.json；没有运行时异常 |
| 最终 node --check chrome-run.mjs | 0 | runner 语法通过；仅移除无价值的清理后截图步骤，不改变行为断言 |

六组规模检查中，全部创建/编辑的 onSaved 和关闭阶段已观察到列表与领域页一致；发布订阅回调中可以观察到 DOM 尚未更新，这是正常同步发布到 React 提交之间的边界，不判为缺陷。下一帧全部一致。原 7 条截图状态并未完整重建：本夹具初始都是 open，随后真实完成/取消；500/2000 是扩展规模，不声称原用户有这些记录数。

六组创建的点击至关闭观测约 27–2100ms，规模越大越长，但探针阶段记录会重复 query 并复制有限页，不是隔离性能基准，不能作为该任务投影问题根因或新性能缺陷证据。没有用该耗时替代合同断言。回放型故障仍缺原 GIF 保存时序和原始条件；不因绿灯把缺陷宣告已修复。

所有真实执行的 Chrome input graph SHA 和浏览器版本保存在两份结果 JSON；最终脚本/输入/输出逐文件 SHA 在 `diagnostics/T-19/chrome-sha256.json`。`chrome-six-run.mjs` 是保留六组输入的可重跑入口，输出新 chrome-six-rerun.json，不覆盖历史六组结果；本轮未再次执行该辅助入口。原先在清理后取得的空截图已删除，不当作视觉验收证据。长期输出仅虚构任务和 repo/probe 脱敏定位，不保存临时机器绝对路径。git status 对 src/modules/task 与 src/modules/home/ui/tasks 输出为空，生产只读。

中途按 Lead 指令在安全点完成 032 CSV 独立增量审查；原 Chrome 命令句柄保留至自然 exit 0，没有重启同输入或遗留进程。

## 问题与下一步

本轮扩展了此前没有覆盖的真实 Chrome、Home 紧凑入口、IndexedDB 异步提交与更大数据规模，以及真实筛选/取消/失败输入保留；仍没有用户精确症状的可重复 red，正式假设表保持空，不进入假设/根因/修复阶段。

未覆盖实际 Obsidian contentFiles.process、原 Vault/宿主渲染负载、多窗口、多写者、重复系列、原录制完整排序/日期筛选和所有中文组合。原用户异步问题仍未答复，没有再要求用户新真机测试。下一安全入口是已有录制条件/追踪证据到达后回放相同输入；若 Lead 选择继续自动诊断，可单独固定原 7 条混合状态和日期范围，但不能用任意压力迟滞冒称原 bug。工件停写交 Lead 整理正式 diagnosis，不申请扩大产品写集。
