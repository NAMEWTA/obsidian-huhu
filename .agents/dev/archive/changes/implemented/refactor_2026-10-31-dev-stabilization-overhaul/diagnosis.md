---
schema_version: 1
artifact: diagnosis
change: 2026-10-31-dev-stabilization-overhaul
status: root-cause-confirmed
feedback_loop_ready: true
red_command: "node .agents/dev/archive/changes/implemented/refactor_2026-10-31-dev-stabilization-overhaul/diagnostics/T-18/split-silent.mjs 1"
red_evidence: "diagnostics/T-18/red-final.log"
cleanup_status: clean
updated_at: 2026-10-31T06:59:54.336Z
---

# Diagnosis: T-18 单标签分屏静默无效

本诊断的已确认状态仅针对T-18以下非Browser最小故障。T-07与T-19尚未诊断，不由本文件frontmatter代为确认。Lead读取SpecDev D反馈回路与假设步骤，未修改生产代码。

## 1. 现象与影响

当前WorkspaceService.move将活动终端标签向自身组右侧分屏时，单标签组返回原状态，无返回原因、无report；双标签组实际创建第二组。用户报告的“执行无效果”在无需Obsidian的真实服务/模型接缝确定复现。无法由此证明原用户窗口焦点的全部历史原因。

## 2. 红灯反馈回路

命令见frontmatter；可执行脚本在diagnostics/T-18/split-silent.mjs。实际加载当前WorkspaceService.prototype.move与真实private update、splitGroupWithTab；只替换store/launch端口，省略无关原生Session及构造期订阅，不实现替身split算法。断言“布局发生变化，或返回拒绝原因，或通过report反馈”失败。首次red-single.log退出1；再次red-final.log退出1，均是精确行为断言而非编译失败。整体小于一秒、两次服务单标签观察均失败，agent autonomous可运行。控制2标签退出0。

## 3. 最小复现

Linux/Node26.11.1，当前dev 86c500556db1d64865c4cc7f1aff1dd83de071fa，相关生产文件尚未改动。一个WorkspaceState、一个含终端标签的组、一次对该组的右侧split。没有文件、网络、真实PTy、Browser、UI焦点或定时器。去掉第二标签是承载故障的变量；补回第二标签则布局分成两个组。移除服务仅调用真实模型仍重现“原状态”拒绝，说明无需命令路由和持久化延迟才可触发。保留服务调用才能观察缺失原因的API缺口。

| 实验 | 变量 | 实际观察 | 退出 |
|---|---|---|---|
| red-final | 1标签、真实move/update | updates=1、groups1→1、sameState=true、reports=0、outcome=null | 1 |
| service-two | 仅加第二标签 | updates=1、groups1→2、sameState=false | 0 |
| model-single | 仅绕过服务、直接真实模型 | sameState=true | 0（确认拒绝预测，不是修复通过） |
| model-two | 直接模型仅加第二标签 | sameState=false、groups1→2 | 0 |

各原始输出与.exit在diagnostics/T-18/。原始单标签回路重跑仍红，无生产变异。

## 4. 假设与证伪

以下排名在单变量探针前已在用户可见commentary说明。没有把未验证宿主现象升格为根因。

| 排名 | 假设与预测 | 支持证据 | 单变量实验 | 结果 |
|---|---|---|---|---|
| 1 | 模型因单标签自分屏拒绝，服务丢失拒绝原因；加第二标签应恢复布局 | 初次red与既有ops测试 | 仅标签数1→2；另直接调用模型 | 确认：1标签原状态，2标签新布局；服务void且无报告 |
| 2 | update持久化/normalize会丢弃已创建布局；绕过服务后单标签应成功 | 这是可能的状态投影解释 | model-single相对red-final仅省略服务 | 反证：直接模型也返回原状态；2标签经真实update可成功 |
| 3 | 命令未分派或宿主焦点丢失是该最小故障必要条件；直接调用服务应成功 | 历史用户环境可能存在焦点问题 | 去除命令/DOM，move确到达update一次 | 反证其必要性：仍静默失败；不排除另有窗口路由问题 |

## 5. 已确认根因

触发为source===target且组仅一个标签。src/modules/agent/core/workspace/ops.ts的splitGroupWithTab保留空组保护直接返回state；src/modules/agent/services/workspace-service.ts的move返回void，只执行update，不暴露拒绝原因。controller.registerCommands和AgentWorkspacePage快捷键处理只调用move，未做可用性或结果反馈。既有ops.test.ts明确期望单标签不创建空split，但没有断言用户入口能看见原因，因而漏检。

不应删除空组保护、复制终端或强行重启会话来使布局变化；应保留不能分屏的原因并让当前入口可解释。最大组数、缺失目标等同类拒绝需要实现票补合同测试。焦点/多窗口仍需票级回归，不能将本诊断宣称覆盖宿主全部历史情况。

## 6. 修复契约

必须改变：集中返回可判断的分屏业务结果/可用性，非Browser命令、快捷键、菜单、拖拽在拒绝时显示清楚原因或可解释禁用；成功保留新组活动目标和合理焦点。命令在异步open之前固定所属窗口/工作区/目标，重新核验目标有效性，不能悄悄改用别窗活动对象。

必须保持：空组保护、MAX_GROUPS、固定标签身份、终端session/运行时不停止不重建、布局持久化、Browser与其集成行为。共享move可增加结果但不得改变冻结Browser消费者的运行效果；禁止借本票改Browser菜单或分支。

正确seam：core/workspace/ops.test.ts、就近WorkspaceService非Browser测试、controller命令与AgentWorkspacePage/WorkspaceLayout DOM入口。回归矩阵：单/双标签、最后标签、MAX_GROUPS、失效tab/group、固定标签、非终端页、右/下、拖拽目标、恢复布局、窗口目标；四入口使用同一业务结果，不以四份条件分支复写。

OUT：Browser分屏/宿主内部UI、重新注册命令、终端创建或结束策略。风险：反馈层改变现有菜单和键盘行为；只用已有设计系统反馈/可访问名称，具体代码最小写集由Lead在正式派遣前补足。局部修复返回Tickets/I；已有DESIGN的UI-TERMINAL及反馈/键盘合同可复用，AC-251功能行为由Spec负责，不创建新视觉方向。

## 7. 清理

未插桩生产文件、未使用DEBUG标记；脚本仅build到OS临时目录并在finally删除。长期日志已移除机器绝对路径，保留repo:/及probe:/定位。诊断脚本留作可回读反例，由后续实现迁入正式测试后继续作为历史证据；不以旧源码是否被修复来篡改原red。T-18生产修复尚未开始，T-07/T-19无确认结论。

## T-19 证据分诊：当前未复现

此条目不继承T18的root-cause-confirmed frontmatter。T19状态仍为反馈回路未就绪（feedback_loop_ready=false），未提出根因假设、未修改生产代码、未把绿灯称为修复。原#26录制为Linux/Obsidian1.14.5、HUHU08f806f；任务源文件从该提交到本轮base无差异，不能把归并关闭当作已修复。

Lead使用真实TaskRepository/TaskService/TaskPage/TaskEditor接缝，以受控存储提交门分别测open/completed筛选；提交门未放行前无成功通知，放行后列表和计数一致，已完成筛选按规则不显示新增未完成项。另验证完成/重新打开/取消流程。进一步使用生产mountTasks与editTask的独立React roots/dialog，而非共同根，观察storage-commit→publish→save-success→dialog-closed：publish同步时DOM尚未提交，但save-success与dialog-closed两刻列表和计数均已有新记录。三用例实际退出0，不能证明历史渲染迟滞不存在。

真实输入、脚本和三轮日志保存在diagnostics/T-19/，固定摘要与限制见triage-observations.json。当前是happy-dom小规模确定性接缝，未测真实Chrome绘制时序或历史任务规模/筛选组合。已向用户异步询问原录制已有的任务量、筛选和迟滞发生顺序，未要求新真机测试；尚无答复。下一步可补实际浏览器渲染观测或用原始条件缩小复现，出现行为红灯前不进入假设/修复，不将本票置Ready。

### T19 独立Chrome扩展（030返回）

030实际核验原#26为独立任务页；Home仍沿真实TasksWidget→taskViews.mount→TaskPage补测。Chrome153挂真实TaskService/Repository/runtime及IndexedDB异步提交，任务页/Home×7/500/2000六组合、两组Completed筛选/取消延伸均0，无行为红灯。创建/编辑/完成/失败保留输入及真实Retry loading后恢复，下一帧列表/计数与领域页一致；publish同步时尚未React提交不作为缺陷。原始混合7条状态未完整重建，规模扩展耗时含探针query开销，不能归因为历史迟滞或性能结论。

输入/命令/失败历史与限制在sessions/20261031T062046Z/030-task-projection-diagnosis/REPORT.md和diagnostics/T-19/chrome-sha256.json、chrome-six-cases.json、chrome-result.json；首次构建失败及两次fixture未Retry造成的超时均保留为探针失败，非产品red。独立Chrome/临时profile已清理，无产品修改。仍feedback_loop_ready=false、根因未知、不置Ready。原录制条件问题仍待用户已有信息，不再要求真机操作；此前“未测Chrome”描述是本扩展前的历史边界。

## T-07 历史Windows事件证据：根因未确认

> 2026-11-02：T-07 因产品线收缩（另见 LOG-022：删除主线仍待实施）（ADR-010，LOG-020）取消，下文诊断不再继续；被测对象 native/huhubot 将由 T-41 删除。历史证据原样保留。

本条目不继承T18的frontmatter。Lead通过GitHub插件只读取得 Windows EOF 原始报告正文和三个明确job的完整解码日志（来源统一为 #41）；没有新跑远程CI，没有生产修复或假设实验。当前feedback_loop_ready=false、root_cause_confirmed=false，Ticket仍draft。

| 实际事件 | 日志直接观察 | 该SHA源码能限定的范围 | 仍不能判断 |
|---|---|---|---|
| 891a5f4 / job124033596543 | 11:26:18Z Host测试5.40s失败；最后完成标记lost-receipt-reopen-authenticated-no-rewrite，随后裸Error: EOF | 同SHA host-fixture.mjs:391标记之后进入Cancel流程，尚无下一completed标记 | 哪条请求/哪个退出码/谁关闭管道均缺失；不能把next action当确定失败调用 |
| 16eb173 / job124038594633 | 11:35:38Z Host测试5.86s失败；最后标记create-exact-once，随后裸EOF | 同SHA:353标记之后进入Conflict流程，未到create-conflict-refusal | 与前次不同区间，缺child exit/code/signal/stderr，不能推出共同WAL原因 |
| fb430d1 / job124052899351 | 12:15:30Z foundation目标13.56s失败，runner_test.go:72 EOF；effect-reconcile本job通过 | 同SHA第72行为hello(t,readwrite)，该次loop尚未发送shutdown；旧日志未记录iteration | 无法判断哪次启动、前一次exit与锁释放、子进程Run/Close错误或信号 |

三份日志均为Windows Server2025 / windows-2025-vs2026、Go1.26.10 windows/amd64、Node24.22.1，Go命令含-p1和45m；不能把此次历史EOF简单归因于Go包并行。该事实也不说明机器没有其他并发或资源压力。来源时间为日志UTC。日志节选保留一基行号并脱敏runner临时路径；完整解码文本的UTF8 SHA（含BOM/CRLF，不等于原zip字节）、总行数、精确URL、抽取规则见diagnostics/T-07/incident-inputs.json；9份对应历史源码只读摘要见historical-source-inputs.json。完整日志未复制到仓库，不保留无关机器信息。

源代码只用于对齐该历史捕获位置与下一观测点，未读取可疑分支后构造根因结论。T04/T06当前Go/真实TS↔Go成功已另有证据，不重复Linux绿灯来冒充Windows原故障红灯。下一步应在固定候选Windows目标路径记录每次child启动/hello、最后请求响应、停止事实、exit code/signal/stderr，并以明确owner等待实际退出；需要可审查CI候选与远程授权后才执行。当前T05持续修改存储，不能把其在途输入与历史事件混成一个实验。没有实际red前不进入正式假设或Ready。

### Engineering Evidence

```json specdev-engineering-evidence
{
  "version": 1,
  "kind": "incident",
  "checkpoint": "T07历史Windows jobs124033596543/124038594633/124052899351；源码891a5f4/16eb173/fb430d1；捕获2026-10-31",
  "evidence": [
    "diagnostics/T-07/incident-inputs.json",
    "diagnostics/T-07/historical-source-inputs.json",
    "diagnostics/T-07/checksums.json"
  ],
  "facts": [
    "三份原日志裸EOF真实存在，两个Host completed区间不同，foundation同SHA第72行为hello",
    "Windows2025/Go1.26.10/Node24.22.1，历史Go命令-p1，不是本轮新执行",
    "原Issue关闭是归并，不表示修复；已核对原评论"
  ],
  "unknowns": [
    "当次child退出码、signal、stderr和最后HAP请求响应缺失",
    "foundation旧失败未记录iteration；Windows精确反馈回路尚未建立",
    "未证明与WAL、父管道或清理超时的因果关系"
  ],
  "next_checks": [
    "固定Windows候选并核验完整目标到达性、实际child生命周期和最后请求响应；远程执行需具体授权",
    "待T05稳定后协调输入，不混合在途存储；有精确red才进入假设实验"
  ],
  "feedback_loop_ready": false,
  "root_cause_confirmed": false
}
```

### T19 原GIF进一步核对

Lead实际读取原#26所指现有仓库tasks.gif（126帧/16.83秒），以ImageMagick合并差分帧逐一查看保存附近59–67帧。初始为Incomplete筛选、7总/6未完/1完成/2逾期，Handling date/Earliest first、日期筛选空；新建Write the README、due2026-11-02、Asia/Singapore。第64帧7.92秒首次对话框关闭，列表新行与All8/Incomplete7已同时出现，65/66帧一致；没有抓到“已关闭而投影仍旧”的帧。不能从鼠标停留推算点击/提交时刻，也不能排除低于GIF帧间隔或其他宿主条件的迟滞。摘要与提取局限见diagnostics/T-19/gif-observations.json。可据此补固定7条混合状态/原筛选与日期语义的回放；仍不是red或根因。

T19按GIF可见条件追加独立Chrome回放：7条混合6 open/1 completed、2 overdue、Incomplete筛选、Handling date默认排序、Asia/Singapore、新建due2026-11-02，任务页与Home两场景均0/no-red。原第7条未知身份以虚构未排期任务补足，不声称完全复原原Vault；保存成功/关闭及下一帧投影均一致。真实输入与结果见diagnostics/T-19/gif-replay-fixture.tsx、gif-replay-run.mjs、gif-replay-result.json，命令日志见gif-replay.log。仍无精确症状红灯，不重复其他规模矩阵或推断根因。

## T-19 用户结束跟进（2026-10-31）

2026-10-31 用户答复：“我也不知道，如果没重现的话，就先默认完成，先不管”。据此结束T19本轮调查/修复要求；工程状态为用户批准取消（cancelled），不是已复现并修复，也不是完整AC261通过。保留现有诊断和生产行为，不再追问或安排复现。
先前所有no-red与root-cause-unknown观察保留，取消不改变任何实验结果。
