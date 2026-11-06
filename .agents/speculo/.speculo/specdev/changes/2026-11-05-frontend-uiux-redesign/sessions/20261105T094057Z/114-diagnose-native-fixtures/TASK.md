---
schema_version: 2
session: "20261105T094057Z"
task: "114-diagnose-native-fixtures"
kind: planning
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-07"
---
## Goal
medium并行定位两个Root真实浏览器fixture阻塞，给具体可审最小driver/fixture补丁或真实产品反例；仓库只读，不空泛推测。
## Inputs
AGENTS/dev/ui、Map41/Spec/T07/T10，用户medium实施/high审查持续。Root正式T11第二66与T16第一66已pass，T07/T10尚待原生；不可删断言求绿。
T07最新 /tmp/huhu-t07-hit-diagnostic/result.json：Root已修两个DOM赋值CDP序列化void、failed JsonStore恢复IO后真实load再shutdown；102焦点四模式真修且105独立pass。仍在exercise unsupported action details超时（最后390/main）。click helper现有hit=true断言已通过，RowName未禁用；不是未命中或touch先验。需要记录实际event/target/selected/lifetime/driver时序对照查因，别猜产品。原driver Root独占scripts/.../T-07/index.mjs，TSfixture亦Root独占。
T10旧 /tmp/huhu-t10-first-native/result.json 明确workspace.on缺失；Root按真实DocumentMutationCoordinator增加内存workspace on/offref/getLeavesOfType([]无原生editor)与dispose listener检查后，新 /tmp/huhu-t10-workspace-native.mjs 执行一直挂于启动（0case），Node PID2928834、独立Chrome browser2928863、profile /tmp/huhu-ui-review-6EyZuv、renderer2928964持续100% CPU。Root给该profile发Runtime body/Debugger.enable/pause/terminateExecution都未获回复；诊断helper sessions87779/38304/70064只是挂起，不是结论。不要继续无界等待。可关闭这一个Root-created Chrome/profile相关进程以止损，必须把观察/退出/局限写/tmp，不能杀用户其他Chrome。已编译fixture在该profile父目录，当前112正在修T10其它UI，旧100与109/112 before快照均可用；Root新handle API刚实际合入，注意源码版本。
## Workspace and Scope
repo全只读，唯一本不可覆盖REPORT；过程/tmp/huhu-native-fixture-diagnosis，私有runner/按原字节别名控制允许，无全66。仅新建独立profiles或处理上述Root已授权进程，绝不真实Obsidian/用户vault/账号/CLI/clipboard。Root单写两fixture源与产物/state/index，你给精确diff/beforehash。若确为产品bug，只回报真实最小红/绿与来源，不能私修source或模拟成功。无delegation。
## Acceptance
先看现有实际代码/事件与运行证据，单变量配对；具体trace/milestones优于长猜测。不要降低超时/删除状态/断言/过滤异常来绿；任何清理/SDK端口模拟明确边界。T07同时有正常可点详情控制；T10用有界启动最小组件/有意义生命周期，区分fixture与production源，捕获原100%CPU实际根因（若能），止损后可独立推进另一项。已有API/成熟引擎不重造。足够支持最小修复或明确未知即停。
## Return
REPORT三节聚焦交接/产物与验证/问题与下一步，事实/推断分开、真实命令退出/受控进程/patch原路径、未验证边界。return0后停止，Root审合再native。
