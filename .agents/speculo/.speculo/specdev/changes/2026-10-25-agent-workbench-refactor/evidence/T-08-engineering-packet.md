# T08 GP026 / Map27 工程接缝与分阶段派遣合同

工作区 /home/wta/orca/workspaces/obsidian-huhu/terminal，HEAD 33c21e098ef3188cbab5a09f3e0a01fadb787715，branch NAMEWTA/terminal；同一 current change-workspace。用户授权完整18票实施和 Agent Team；实现 gpt-6.1-sol/xhigh，独立审查 gpt-6-astra/high。真实 Obsidian/Provider/五平台由用户验收；代码、隔离生产组件/实际官方程序接缝、真实 Linux helper/CLI 和构建由团队验证。不提交、推送、发布、归档或操作真实库/账号。

上游 T07 已 done；当前复审和交付70路径一致，R2两轴 pass，done 后 implement/tickets/goal-plan/ticket-control 全0且无漂移，见 evidence/T-07.md 与 T-07-completion-done-root-audit.json。所有旧失败和有效复用边界保留。精确84路径已绑定T08/Map27/GP026；实际DoR通过和对应原生派遣后才解锁分配阶段。本文件及静态ready自身不是解锁。

## 权威与设计

按 Map完整背景/Skill矩阵→真实dev/ui→T08→Goal§4读取；运行 SpecDev I 及当前步骤参考。Spec §3.4/3.5/11、implementation-contracts 为外部合同。DESIGN revision1 / digest f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab，PAGE001/PAGE003；沿已批准 A、DESIGN-0001、UI-001，不改设计或原型来迁就实现。

研究来源沿 T08 A/B/C 已保存报告和原固定许可/源码；B 的新真实 producer 原件已逐字节回收于 T-08-b-producer-proof-report.md/.json 与 T-08-b-producer-proof-root-audit.json（audit SHA 7d7fd0dea12f455893adf65650af918c71789af4e9ba106f0fcef8fee869bcfb）；37命令、1295官方原件、完整两脚本与最终日志均经Root回读，7拒绝/2原输入调用只证明受控Session边界，旧缓存偏差和exit1保留。前期 guarded-PTY-body 候选被原生 editor 事务方案替代，原报告保留历史事实，不能同时实现两条普通 prompt 路线。

## 最小可观察交付

同 Vault 精确稳定 Session/runtime 的 agent.prompt、agent.wait、terminal.send-text、terminal.send-keys，复用 terminal.read；至少一条真实原生编辑器正向分支。既有 Shell/六种 Agent 启动、材料只粘贴、自动化原生完整结果保持。UI 在现工作台增加 PAGE003 最小控制工具，显式当前Space/同Vault全Space与稳定目标、只发送/发送并等待、取消、只继续等、读屏、blocked/unknown/unsupported和定位。保留布局/标签功能，不提前制作邮箱、历史、通用审批或T09面板协议。

## 已选接口语义

1. public operation.readOnly 是单源描述中的独立布尔；query和agent.wait为true，输入/启动/修改/stop为false。transport 继续拥有排队池，wait占ordinary，不占query/stop保留池。生成TS/Rust及严格验证/共享fixture，不各自推导副作用。
2. wait条件有限：idle、working、waiting、permission、done、failed、interrupted、unknown、blocked。前8匹配权威activity state，blocked匹配blocking；UI默认done，对用户说明是原生活动结束，需另读屏核对。不是模型任务成功。
3. prompt+wait在提交前原子观察并冻结原runtime/source与水位N、初始working；确认本次输入已完成后，只接受同代activitySequence>N的事实。独立wait可立即匹配当前。每次仅保留一个最新snapshot，复用现32监听额度；输入前先取得所需观察额度。退出/失联/换source先于一般状态匹配。
4. 同一请求首次capture冻结观察预算；原call.signal仍是硬取消门，不在run重新续期，不比较不同进程的单调时钟值。wait取消/timeout只解除观察，输入确认责任仍由原owner结算；不stop/replay。UI“继续等”保持原tuple+N，只建立新观察期限。
5. 普通prompt使用原NativeInputQueue user-action持槽+经过认证的应用事务，原editor完整bracketed paste与唯一Enter在同一个无await JS回调内完成。不得替换editor/onSubmit、清空已有草稿、直接调用模型API或降级为raw输入。raw text/keys仍用同队列原PTY路径；保留sanitize、IME、Kitty/Win32、Ctrl-C复制/中断及材料无Enter。
6. 原slot fresh OS foreground/root/recipe检查加同binding最终应用gate；不能承诺OS检查与JS提交原子。首支持是经真实验证的官方Pi1.4.0及实际入口闭包、用户本来已明确-ne/--no-extensions且仅HUHU extension；不修改用户标志、catalog或扩展设置。未知程序/平台/版本准确拒绝普通prompt但保留原人工终端操作。
7. 最终gate证明原默认editor/焦点、正常提交模式、严格空草稿（空白也拒绝）、无权限/登录/selector/autocomplete、有效Enter规则及同runtime/source/epoch/op/期限/取消。新启动与working/原steer都要实际正例；组件单独构造、ELF假程序、全部拒绝或stub结果不足以证明该Provider受支持。
8. queued不等于written；adapter-applied独立于PTY written；成功仅是输入操作。queued取消经原owner证明零执行才effect none；dispatch失联/回执未知为unknown，不自动补Enter/重发。已确认输入后wait超时/取消保留目标、input-submitted及completed；只读wait始终none。完整progress/final envelope在效果前预检容量。
9. 不新增daemon、PTY writer、无限manager或信箱；目的分离的应用角色复用helper本机设施与原Session生命周期。每SID一当前binding、一claimed事务，原32Session、32/SID及128/helper输入额度，所有body/编码副本均计入有限字节账。逻辑上界不冒称RSS保证。未知retiring在证明不可能迟到前不返原user-action槽；不占住全局锁/唯一reader等待JS。parser replies、ACK、drain、query/stop、其他SID/Browser须继续。

## 顺序与验收

所有源文件唯一writer，精确分配见 T-08-write-allocation.json（A32/B15/C33/Root4）；Root独占正式工件与main/styles/budget/notices。C先交真实canonical/private wire/shared端口，Root回读后B消费；A可先实施不依赖新端口的纯等待与raw用例，prompt/launch接线待端口实源。B须交真实扩展/宿主接口后A消费，不复制候选DTO。根构建及全局检查仅Root在writer停止后运行。

每个高风险行为有真实稳定接缝红→绿；保全命令argv/UTC/退出/原日志和运行前后源SHA，失败不覆盖、不以skip当通过。必须覆盖：新编辑器提交/working，空白和草稿/权限/登录/焦点/重载；输入竞争、排队取消、dispatch迟到/失联、源及OS前台失效；旧水位/初始working/独立wait即时匹配；14ordinary等满时query/stop及Cookie活性；原材料/runner和IME/键盘回归；真CLI→broker→Host→生产Session→原生helper、最终受支持官方editor接缝；完整envelope边界及有界屏幕读取。

UI实际生产组件做DOM任务和真实Chrome视觉/键盘验证，桌面及窄屏、亮暗、长目标/错误/等待/取消/继续等待/读屏；浏览器fixture不冒充Obsidian/Provider。实际UI来源、交互、截图及与原型差异进入Design Conformance。用户E2E脚本/清单保留明确版本、能力和未运行项。

候选返回必须SOURCE STOPPED并给精确改动、差异、命令、输入和未验边界。Root冻结整个当前票真实交付，按testing选择适用build/lint/architecture/i18n/styles/bundle/native/Windows crosscheck/helper verify与真实双bin组合，进行独立两轴审查；无新事实不重跑已有效检查。attempts继承本票真实整合记录，不通过换人清零。

## 原生端口与首批写入

C拥有唯一canonical/generated/private strict codec与shared纯类型，B实现Host/helper，不互写。原生enrollment随NativeSpawnOptions.editor（实际runtimeId和审定recipe）进入现Sessions.reserve/SpawnTicket，复用原32物理slot，不另建prepare manager。T06 bindingId/programEpoch 在注册后用 ready.sourceInstance 严格 join，不在 spawn 伪造。native创建0600单运行cap文件，只向原child注入cap文件路径，不经CLI locator传editor令牌。NativeConnection.editorBinding(sid)暴露绑定原lease/代次/SID的有限handle，提供ready/closed/submit/close；具体类型、语法和额度先由C交实际源码，Root回读再给B/A消费。实际 helper 环境快照、平台完整性及 Pi process.title 的 fresh 观察边界见 T-08-launch-identity-environment-decision.md。

应用正文复用现kind4分片与InputBudget，native app通道发有限binary body，控制/结果统一由现canonical描述及strict codec拥有；扩展用同源可嵌入codec，不手抄另一JSON协议。claim后只占该SID原user-action，原writer仍能服务reply。全部正文/编码副本与生命周期计量必须实际测试，不因binary传输推定不存在JS字符串或其他副本。

A首批仅allocation.stage_one.A八路径：原Session活动等待、有限领域结果、raw named-key编码和相关定向测试，不实现新app端口或提前组装UI。C首批canonical readOnly/state与shared完整端口/strict codec，报告真实接口后停写该接口等待Root接收；后续Rust与B唯一实施分工再实际派遣。B此时STOP。未解锁路径不得因列在整票writable里提前修改。Root接收接口后可分阶段继续，无需再向用户重复请求已授权实施。

A负责单一pi-artifact-profiles.json：消费已核/tmp/huhu-t08-b-producer-proof/producer-profile.json中的完整Pi1279/Jiti16文件集，作为首支持profile。程序核验懒加载、有限遍历/字节/时限、准确resolve路径及最终env；不得只hash薄CLI文件，不自动安装/升级或改用户-ne参数。B补正式官方CLI main→loader/TUI、keybinding重叠/改键、partial paste/IME/异步clipboard/重载等生产定向验证；通过公开SDK Mode并不抹去这些尚缺项。
