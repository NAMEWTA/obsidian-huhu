# T-04 UI 只读预检

2026-10-25；同一workspace/branch/base；当前Map revision15。Root确认T03 done、双轴pass；本轮仅准备T04 UI，未审查T03交付、不改仓库/正式工件、不运行测试/build/lint/浏览器/helper/Provider。按workspace→catalog→Map→dev/ui→T04 Ticket→Spec §3.3及公共合同、批准DESIGN回读。公共DTO/WorkspaceService方法/en-zh keys等待A冻结，以下是接线责任，不是自行定义的接口。

## 当前真实接缝

- `AgentSidebar.tsx`：保留SessionCard及原rename/split/copy/path/material/end/关闭视图菜单；现end调用`workspace.end(tab.id, confirm)`，按tab当前`sessionIds`请求终止。`WorkspaceService.end`确认后重新读tab、集合变化会递归再确认，尚无T04逐runtime停止核实/归档结果。后续不能确认A后默换成新集合B，也不按PID判身份。
- ManagedCard及TerminalHost已经`useSyncExternalStore(subscribeManaged,getManagedSnapshot)`消费服务缓存，当前DTO仅launch-pending/connected/failed/cancelled/disconnected/exited及exit.confirmed；没有T04 stop-requested/root-exit/逐项归档DTO。当前ManagedSessions按所有pane当前runtime去重，恢复无runtime则按Space+稳定Session去重；旧代次不隐藏新代次，这些规则保留。
- `SpaceNavigation.tsx`已有创建/重命名/选择、loading/empty/error、箭头/Home/End键盘模型，没有归档入口。SpaceRecord已有archived；`SpaceService.list()`排除归档对象，但不能只本地filter伪造归档成功。T04持久化及启动门由A实现，UI不直接写Space/Session记录。
- 确认实际有两路：AgentWorkspacePage内受控AlertDialog，通过`ConfirmFn(message,{title?,action?})`、所属HuhuProviders Portal，隐藏/卸载会resolve(false)；`terminal/confirm.tsx`则另建root，以app最近leaf取ownerDocument、按钮固定agent.end，支持AbortSignal。还有共享`ConfirmDialog`可借组合模式（受控busy/错误/AlertDialogTrigger），不要改共享原语或建第二确认平台。若服务继续用ConfirmFn，优先复用页面现有确认；独立root若用于新动作必须显式沿发起元素document，而不是确认时猜最近leaf。
- `TerminalTabView.tsx`当前普通closePane/close仍只detach，TerminalView/document adoption/HiddenRendererRetention、复制粘贴/搜索/材料/分屏/缩放等均保留。restored普通render不spawn，明确按钮才restore；当前disconnected/non-running仍显示restart，因此T04必须用A核实结果约束“继续/重启”，不能把running=false当已回收。失联保留内容与已知身份，不盲继续、不自动重放。

## 最小UI路线（待冻结DTO后实现）

1. **先冻结、后弹确认。** 发起按钮捕获Space+稳定Session+明确runtimeId（多目标为准确集合）、名称/Provider/Space显示文本及发起document/触发器。确认必须展示这些身份和影响；切Space、改名、焦点变化、新runtime/多pane变化不能改变已显示目标。没有稳定身份时明确不可操作，不能退回当前焦点/cwd/PID。取消、Escape、隐藏/卸载、abort均不调用stop/archive写用例，0 effects。
2. **服务负责竞争和效果。** UI只提交冻结目标/服务发出的有效计划；A在动作前与处理中核对代次/集合/owner/admission、有限等待退出。新增runtime或归档集合变化要返回明确stale/partial/unknown并保留逐项身份，不让UI扩大集合、自动递归重试或再找“当前运行”。不在整个确认期间冻结业务接纳；取消不应改变服务运行。明确再次选择/核实属于新动作，不自动重播。
3. **停止与关闭分开。** 附加SessionCard原end保留真实结束语义，但改为A准确目标用例；后台/未附加ManagedCard补stop与归档操作，不要求先attach。Space行补归档入口；Session归档针对明确稳定Session（tab多pane不能把tab误作Session，需显示实际目标），不归档Browser/page。归档先收束后保存，UI仅已提交归档才移出活动列表；失败/partial留原行或可定位结果，保留history/messages。不新增永久归档列表/历史drawer平台，后续T11接管完整归档历史。
4. **状态有文字、有可查目标。** 同一服务snapshot驱动stop-requested、root-exit但后代未核实、confirmed exited、partial、unknown/disconnected、restored未运行。stop-requested不提前画“已停止”；root退出不代表进程树回收；unknown不给一键盲启动。显示A提供的逐项结果/本地化错误/下一处理入口，details仅诊断，不把raw英文cause直接流入UI。不用Toast替代持久可查失败，不用inputReady或活动安静证明任务完成。
5. **恢复克制。** 普通打开/attach/restored呈现均零spawn；明确继续/重启才走A核验的启动合同。失联/旧代次/未核实残留先核对，核对不调用spawn；是否允许继续由A冻结DTO/用例决定，UI不自建owner/生命周期manager。运行恢复和精确原生历史resume区分，T12以前不假装完成来源恢复能力。
6. **交互保兼容。** 弹层留在发起document的huhu-portal-root；取消后只回仍连接/可见的原触发器，用户切tab/窗口后不抢焦点，绝不query当前terminal textarea来回焦。确认提交有同步防重复；异步结果按本次mounted/instance守卫，卸载后不改新UI，也不撤销已提交业务。执行后失败应仍可操作/核对，不能藏在已关闭表单里。保持所有原菜单、Browser/page导航、search/filter、六Agent入口；不提前T09侧栏改版。

## 最小准确写路径建议

当前票已有sidebar/**，因此预计B拥有：
- `src/modules/agent/ui/sidebar/SpaceNavigation.tsx`；新增`SpaceNavigation.dom.test.tsx`：归档Space、明确集合/取消/键盘/错误保留。
- `src/modules/agent/ui/sidebar/AgentSidebar.tsx`与`AgentSidebar.dom.test.tsx`：后台/附加停止与Session归档、状态文字、目标冻结、原菜单与多pane去重。
- `src/modules/agent/ui/terminal/confirm.tsx`现已允许；如确需新动作沿独立root，补所属doc/文案/返回焦点，不能影响旧迁移调用。建议新增精确`src/modules/agent/ui/terminal/confirm.dom.test.tsx`（当前票只准confirm.tsx，不自动覆盖新测试）。若全部走页面ConfirmFn且无独立root变更，可不改该源码/不新增无意义镜像测试。

**必要缺口：** `src/modules/agent/ui/terminal/TerminalTabView.tsx`及`TerminalTabView.dom.test.tsx`不在当前T04写集，应由Root正式增补，消费停止/失联/恢复门并防unknown盲restart；保留TerminalHost而不换renderer。新UI如需抽小组件可放已允许sidebar/**，不要求新目录。

**条件缺口：** 若现有ConfirmFn字符串+title/action不能容纳准确目标展示与焦点生命周期，精确增补`src/modules/agent/ui/AgentWorkspacePage.tsx`及`AgentWorkspacePage.dom.test.tsx`；优先避免改共享ConfirmDialog/alert-dialog。`workspace-context.tsx`仅在冻结公共UI确认签名确有变化时再报Root，不默认加写。i18n/DTO/services统一A拥有；B只申请缺键，不改字典。无需create/TabStrip/CSS源/依赖/native/文档/生成物额外写集，main/styles由Root生成。

## 必要回归与视觉增量

| seam | 确定时序与观察 |
|---|---|
| 确认目标 | A/r1打开→切B/重命名/新r2/改pane→确认，仍只提交原集合或明确stale；取消/ESC/隐藏/卸载stop/archive/launch均0；重复点击一次调用。 |
| 停止阶段 | deferred stop先显示stop-requested；仅root-exit仍不画全部停止；退出核实后才stopped；timeout/owner lost/unknown/partial显示原目标及逐项结果，不重试、不启动。 |
| 归档 | 单Session/多Session Space，归档前显示准确范围；取消0effects；部分收束/提交失败仍可定位、未声称完成；成功仅已提交对象移出，另一Space/新代次无变化。真正磁盘/进程证明归A生产集成，DOM不冒充。 |
| 视图/恢复 | close menu/面板X只detach，不stop/archive；restored打开0spawn；unknown/disconnected明确核对且不能盲restart；确认恢复必须用冻结Space/Session，新代次旧事件不改当前标题/状态。 |
| 旧功能/缓存 | 保留SessionCard原rename/split/copy/material/end/Browser/page导航；所有pane去重/旧代次不遮新runtime；snapshot引用稳定、订阅释放，无render→写回/循环。 |
| document/焦点 | 原按钮发起、弹窗所属doc正确；Tab/ShiftTab约束、Enter确认、Escape取消、IME不误确认；切tab/window后晚返回不回焦；mounted guard不让旧结果关新确认。 |

复用已有`AgentSidebar.dom.test.tsx`、`TerminalTabView.dom.test.tsx`、`AgentWorkspacePage.dom.test.tsx`与T03的真实生产组件Chrome harness `/tmp/huhu-t03-b-visual.mjs`：它在/tmp编译实际React+主题CSS，用明确managed端口/TerminalView/native文件fixture，经CDP做实际键盘/焦点/尺寸/截图，finally kill并await Chrome exit。**本轮只静态读取，没有运行或改写该harness；旧截图不当作T04新状态通过。** 后续获准后复制为T04专用/tmp脚本，不覆盖T03原证据，也不运行真实Provider/Obsidian。

新增画面至少stop-confirmation/stop-cancelled/stop-requested/root-exit未核实/confirmed stopped/partial/unknown/Space归档范围与错误/restored可核对；与现有normal/loading/error/empty/long-name叠加。矩阵适用en/zh、亮暗、1200/800/480/320及320×360/200%等效窄视口、reduced-motion、desktop32px/coarse44px；长ID/长中文换行或可复制完整title，不挤关闭/确认按钮。DOM模拟与实际Chrome焦点分列，真实宿主/五平台/Provider E2E仍用户负责。

设计映射准确为：**PAGE001空间/会话/终端；PAGE003控制/通知/原生人工处理（本票仅停止确认部分）；PAGE004共享网页/恢复说明与模块设置（本票只恢复边界，不提前独立Browser或备份实现）**。沿DESIGN revision1、批准A、digest `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab`。参考复用已核验R01 Herdr运行/显示分离、R05现有portable-pty与K05平台边界；UI借本仓库AlertDialog/Portal模式，不引入新库、GPL源码或新的后台服务，无陌生功能设计需要另行外查。

37份时点SHA见`/tmp/huhu-t04-ui-source-observation.json`，SHA256 `f1024b2e767065b4164e774e5f2b16e1a4e60a06802cb8f684b4b29060ebb905`。Root正正式化T04写集、A将冻结DTO，相关源/票据可能漂移，派单必须回读冻结合同；本报告不锁源、不认定当前拟接口已存在。

未运行：tests、类型、lint、build、Chrome/截图、helper/native、Provider、真实Obsidian/五平台；未修改仓库/正式C/Git/依赖/生成物，未派Agent。**READ-ONLY；SOURCE STOPPED，等待Root正式解锁。**
