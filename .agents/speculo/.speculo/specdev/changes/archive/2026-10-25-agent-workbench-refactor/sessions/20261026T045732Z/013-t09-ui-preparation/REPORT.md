# 任务回报

Session: 20261026T045732Z
Task: 013-t09-ui-preparation
Status: completed

## 聚焦交接

已完成 T09 的只读 UI 实施前准备。现有工作台具备真实标签/组/拖拽、Space 布局持久化、后台运行与重新显示、控制目标冻结、宿主响应式导航和焦点许可；T09 应补齐这些路径上的 Pane 寻址、指定已有 Session 分屏与 A 布局细节。没有实施、运行新浏览器或推进 T09；T08 独立审查结果仍由 Root 拥有。原 A32/010 脚本继续 SOURCE STOPPED。

**推荐的最小方向：保留同一 runtime 的 attach 幂等，不新增“同 Session 多个独立 Pane”能力。** Spec §3.1/3.2、AC-009 和 T09 约束显示引用、稳定寻址和第三 Session；013 Acceptance 中“同 Session 多 Pane”是待核验风险，不是扩展授权。Root 在本轮也明确采用此边界。重复目标分屏应准确拒绝；已有显式移动语义可以复用，但不能暗中复制 xterm、增加输入/尺寸 owner，或把移动当新建 Session。

### 当前布局、导航与批准 A 的差距

以下是源代码事实及实施建议，不是本轮运行验收或独立缺陷审查。

| 合同 | 已有真实实现 | T09 最小补齐 |
| --- | --- | --- |
| A 的 Shell 与左侧导航 | `shell/layout.ts:6–11` 已有容器 600/960 档位；`ShellRoot.tsx:104–142,326–394` 已有内联/Sheet、所属窗口和回焦；220–500 可调侧栏由 Shell 拥有。`AgentWorkspacePage.tsx:372–374` 将侧栏 Portal 到宿主槽位 | 复用 `context.togglePanel/openNavigation`，保留 52px rail、可调宽度与折叠偏好；不把原型 232px 当新默认，不另造导航框架或改 Shell |
| Space/Session 导航与身份 | `SpaceNavigation.tsx:19–36` 有命名/目录、新建空 Space、加载/错误、精确 ID、方向/Home/End；`AgentSidebar.tsx:629–670,730–737,845–880` 组合 Space 列表、当前 Space Session 和跨 Space attention；后台/未显示记录仍可发现 | 按批准 A 整理为清楚的 Space→当前 Session 层次及当前 Vault/Space 身份。保留现有分组/筛选和 attention，不把 Tab 当持久 Session 再列一遍。保留列表截断、详情全名和稳定 ID |
| 工作区标题、工具栏、标签 | `AgentWorkspacePage.tsx:210–246` 目前直接进入 WorkspaceLayout；`TabStrip.tsx:50–218` 保留组内标签、侧栏/新建/快捷命令/工具/页面菜单；条高 min36 | 在原页面组合中补可见工作区/Space 身份和紧凑主操作；44px 工具栏与组内标签职责分清。不要复制静态原型标签条，保留排序、pin/color、浏览器/board/usage 页签及宿主页菜单 |
| Pane header 与焦点 | `TerminalTabView.tsx:523–547` 仅多 Pane 时显示 22px 头，关闭命中声明 size16；`PaneTree:928–944` 以 runtime session 叶定位，焦点交 WorkspaceService | 按 A 补标题/文字状态/明确焦点/关闭显示语义，桌面至少32、窄屏44，头部至少34；长名不挤压关闭。测稳定实际盒而非只查 class |
| 宽窄分屏 | `WorkspaceLayout.tsx:85–104` 和 `TerminalTabView.tsx:939–963` 已用 react-resizable-panels；row 始终 horizontal，column 始终 vertical；现有 resize/双击等分保留 | 用容器宽度让低宽度并排终端上下呈现；显示适应不能悄悄写坏持久方向/比例。拖动及键盘 resize 与 CLI 回读同一实际模型，跨档恢复原布局 |
| 右侧工具 | `workspace-view.ts:6–13` 初始 control=true，尊重保存关闭；Page:301–362 有312px外 aside和<600 Dialog，控制/历史互斥；TabStrip:166–199 开关复用 | 保留 T08 的控制语义、取消/继续等/读屏和保存偏好。若整合工具标签，只做壳与现有面板组合，不提前实现邮箱/历史业务。600–959 是否改工具 Dialog 需以实际终端可用宽度核对 DESIGN:90–92，不能仅依据 viewport |
| 目标与焦点分离 | `TerminalControlPanel.tsx:70–97,205–232,275–339` 保存精确 Space/Session/runtime/source，显示重复名称的唯一身份，切 scope 清选；焦点改变不重选 | 当前 Space 外切后，旧目标不在 rows→valid=false，已禁发；不要称已有“自动误发”事实。须补真实 UI 回归：Select 显示、详情和将发送 tuple 一致；保留目标就显式维持可见范围/选项，失效就清楚禁发/重选，不显示新 Space 首项却发送旧目标（LOG-028） |

控制面板目前 selected 失效仍保留旧标题/ID，Provider 展示却来自当前 `row?.agentId`（`TerminalControlPanel.tsx:341–354`）；旧目标退出当前 scope 时 row 不存在，显示可能回退 Shell。应以完整冻结身份显示“范围外/已失效”或显式重选，避免造成身份误读；本轮没有执行 Radix Select 来判断其实际视觉回退。

### 已有状态与不能退化的语义

| 状态 | 源与已具备行为 | 后续可观察断言 |
| --- | --- | --- |
| loading / noSpace / empty / error | `SpaceEmptyState.tsx:12–22` 和 SpaceNavigation/Control 已显示分支；`SpaceService.canWrite:102–103` 约束创建；无 Space 仍有 browser 入口 | 加载/错误不提交输入、不 acquire/spawn；空 Space 创建不启动；显式选择/取消保留；网页入口保留但 T13 容器独立性另验 |
| background / detached | `WorkspaceService.ts:404–444` 区分 attached/everAttached；Sidebar ManagedCard:497–518 attach 原 runtime；`close:1700–1715`、`closePane:1883–1908` 只改布局 | 关最后 Pane/Tab、切 Space、隐藏/关路由后，原 runtime/屏幕/输出水位继续，可重新 attach，不重新启动或换代；后台结果不抢焦点 |
| disconnected / stopped / restored | TerminalTabView:100–123,553–605 保留状态与明确恢复入口；WorkspaceService restore 仍为显式动作；恢复布局不自动 launch | 已知内容保留，unknown 不冒充 idle/clear/成功；停止中、root 已退出、cleanup 未确认分别显示；重启仅占位，继续明确触发 |
| long / crossSpace | Sidebar/title truncate 与 title详情、Control 唯一 Session/runtime ID 已有；跨 Space attach 的 `selectSpaceForPresentation` 不迁移记录归属 | 中英长名、重复名仍能明确对象；定位可切显示 Space，但不会改控制 target、归属或历史；返回/停止/归档始终使用原 tuple |

### 可复用的完整动作链

- 创建：`NewTabMenu → Omnibox.tsx:185–203 → WorkspaceService.createManagedInteractive`；当前 Space/名称/background 在接纳前捕获，账号与六 Provider 沿用已有入口。不增一套“聊天任务创建”。
- 显示：`ManagedCard.open → attachManaged:687–765 → ensureManagedPane:768–791 → 当前 store / SpaceService.updateLayout → WorkspaceLayout → TerminalTabView`。它按 runtime 去重，只 attach 原运行，后台 Space 可加显示引用但不因 focus=false 切屏。
- 焦点：`WorkspaceTab/TerminalHost → activate/focusSession:1607–1634 → presentation token → TerminalView`；`captureForegroundIntent.ts:20–79` 校验原 document/window/container、blur/用户动作/leaf变化，单次 commitFocus。新增 pane.focus 必须走此服务，不在晚到的 Promise 后查询“当前终端”再 focus。
- 调整/关闭：组级 `move/resize → core/workspace/ops`；叶级 `resizePane/closePane → core/terminal/layout`，最终由同 workspace store 持久化。停止另走精确 runtime 与确认后的 `end/stopManaged`；close 不调 end/remove。
- GUI 控制：生产 `AgentController.terminalControl:573–602` 已捕获 request/target/params 与原观察期限，经 `getControlScope → ensureControl → Router.invokeLocal`；CLI 是真实 Rust descriptor parser→native control→同 Router/ControlCommands。`commands.ts:113–114` 目前拒绝 pane 六操作，canonical 六项 `available=false`。可在 **同 WorkspaceService** 增加 Pane 用例，再加薄 ControlCommands adapter；不要在 UI、CLI、Rust 分别维护布局。

## 产物与验证

### 关键输入与原件

证据根：`/tmp/huhu-t09-ui-preparation-20261026T101536Z`。105项初始索引含103个存在文件与2个不存在的探查路径；8项补充后共109个不同的实际文件，原字节 CAS 在 `objects/`。索引不表示每个文件逐行通读，实际选读范围在 `commands/*/stdout.log`。`source-after.json` 当前 drift[]。关键 SHA256：

| 输入 | SHA256 |
| --- | --- |
| 013 TASK | `7c4e0e3e28c44ea6d2408b6abf5c8842e702fbcef2c8e0697c91bedceccffe30` |
| T08 review input | `67522a2ee5d8579aca8469511d6529d6425b40fd6cd265db784e7900a9c0cf26` |
| tickets-map.md / GP027 Map28 | `f360d307d8c0d9c98ff692935b639a7152db953827398e3227e3979418e0a02f` |
| T09 Ticket | `b27797c6285820494ff1085e3391fe0fff9862175f5297ef10c793f9b955feec` |
| spec.md | `d204c7a0b3178a60ddeb291a8153f79cb8e3864427c5317b7660832182d12618` |
| implementation-contracts.md | `f13ca8cf0ef1185065e7c6d4e537a787f50ac813678aec428e498c0a8f03e397` |
| DESIGN.md 原字节 | `3066ec7de2155732fa5e1c9f3259d38e26d229305ffcf41eec61684944857de3` |
| UI001 final/index.html | `c44923a86fb41e3818b4d292bff6d2618bdeb3a87d46812a391aa368510903da` |
| 初始 source-manifest.json | `46c2161b1ed33cda733a6812791e9df63acff2064a8a92529edc8afe366aac00` |
| supplemental-sources.json | `9bbd210b3d6f474090079977e186c0c3e115300c101cece17078c8e253c29509` |

DESIGN 的语义 digest仍是 `f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab`，完整原型 digest仍是 `b8bcf55791eabb1d620c990e2aaaad49f7ccec9ab6a0f557e65ba3baa12fe1af`，与原字节 SHA 不混用。已回读批准记录、final HTML/CSS/JS相关布局，并以 view_image 查看原有 final-approval.png；`prototype-image-observation.json` 保存路径/SHA/静态边界，没有把原型图当生产验收。

真实读取命令的 argv/cwd/UTC/exit/stdout/stderr SHA 与原日志在 `commands/001-model` 至 `034-authority-anchors`，索引 `command-index.json`。其中029实际逐项核对 T08 的85路径 after SHA：drift[]，HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`、分支 `NAMEWTA/terminal`。009/026各有一次不存在路径的 rg，真实 exit2；008/011/017也保留对应 stderr（复合只读命令最终exit0），后续按真实目录定位，不隐去探查错误。它们不是测试失败或产品红灯。

本轮没有 build、生成、测试、Chrome、真实 Obsidian/Provider/Vault 或外部网络调用。dev/ui及适用 shell/motion/testing 规则已核对；使用 reference-notes 既有 Herdr/Wave/tmux 调研作为机制背景，实际方案复用本仓库既有依赖/API，不需要新增陌生依赖或重新研究外部项目，未复制外部代码。010 的15项仅作为下一票采集方法参考，不计入 T09 通过数。

### 后续 DOM/服务/CLI 验证矩阵（均未执行）

| 层与建议用例 | 实际组件/服务与可复用入口 | 必须观察的断言 |
| --- | --- | --- |
| Pane 身份/重复 attach | `core/workspace/ops*.ts`、`workspace-service*.test.ts`、`workspace-store-spaces.test.ts` | 同 Session/runtime 重复及并发 attach 返回同显示引用、零额外 spawn；Pane ID 不用数组序号/焦点/PID，重排/resize不变；closed/stale Pane 精确失败，不命中邻居或新代次 |
| 指定第三对象 split | 同 WorkspaceService + 新 pane adapter 的 unit/集成 | A/B 已显示时指定 C 真正显示 C的原 runtime，不显示旧B、不启动Shell；重复源/目标与超上限准确拒绝；row/column及焦点保留按实际返回；归属不变 |
| GUI↔CLI双向 | `services/control/commands/router` 与现 `control-native.test.ts` 接缝 | GUI attach/split/resize/focus 后 CLI list 同 ID/树/比例；真实 CLI 修改后订阅GUI更新；六项能力只在闭包真正完成后广告，不能以 TS unit 冒充 Rust 往返 |
| close最后叶/路由释放 | `workspace-service-spaces.test.ts:339`、`AgentWorkspacePage.dom.test.tsx`、TerminalTabView DOM | 关叶/Tab/页面仅解绑 display/尺寸/订阅；Session runtime仍活、原屏幕持续、恢复同代次；显式stop才确认并退出；最后组/叶没有幽灵焦点与空树崩溃 |
| 导航和焦点 | SpaceNavigation、AgentSidebar、NewTabMenu、JumpPalette、keyboard-scope，真实 WorkspaceService foreground DOM | 精确Space ID；后台创建与活动更新不抢焦点；跨Space定位不迁归属；另叶/blur/弹层/异步晚到结果不回焦旧终端；IME Enter不发动作；现Ctrl/Cmd+J跳转和标签快捷键不退化。DESIGN的Cmd+K与现配置冲突由既有命令机制处理，不照抄原型Alt1/2/3 |
| LOG-028 与失效目标 | `TerminalControlPanel.dom.test.tsx` +实际 Space/store 更新 | 先当前Space选A，再切B/点击B面板/切allVault/同名选择/停止/归档；任何发送、等待、读屏、停止的可见身份与实际 tuple一致；无效scope/新runtime禁发，未选择不取第一项；取消仅结束观察 |
| 布局、组、拖拽、长文本 | `WorkspaceLayout.dom.test.tsx`、TerminalTabView DOM、现 TabStrip/WorkspaceTab | 不新增生产API或源码摘取fixture；组/标签排序、split上限、pin/color、第三对象、焦点与长名可访问。现Layout DOM只测page tabs且mock TerminalTabView，必须为新Pane行为装配实际类/组件，不能据原两项宣称Pane覆盖 |
| 保存/恢复/并发错误 | 真实 SpaceWorkspaceStore + layout-merge/SpaceService，受控存储端口 | GUI草稿与CLI并发修改不丢引用/比例/焦点；切Space在途save仍归原Space；失败不伪造持久成功；重启只恢复layout、零launch/input；持久化中止观察不声称取消OS调用 |
| ownerDocument/多窗口 | 现 PageDOM:174、NewTabMenu/foreground测试及后续宿主验证 | Portal/Select/Dialog/Sheet/resize/clipboard属于发起doc；背景窗blur、关闭窗清监听；关闭弹层仅在原目标仍有效时回原触发器，不抢新叶子 |

可用定向入口为 `pnpm exec vitest run --project dom <上述实际 .dom.test.tsx>` 与就近服务/unit；新增行为再配对应红绿。后续源码变化按dev选择表执行类型、i18n、lint、样式和build；生成物由Root串行统一维护。本轮没有调用这些命令。

### 后续真实 Chrome/宿主矩阵（均未执行）

| 矩阵 | 生产装配与观察 |
| --- | --- |
| 宽1440/1200、medium800、窄390/480；亮/暗 | 正常 import生产 AgentWorkspace/Page/Layout/Sidebar/TerminalHost；受控端口说明清楚。新 `agent-workbench-panels.mjs` 验证实际600/960容器档位（含599/600、959/960边界）、侧栏折叠/拖宽/键盘调整、312外aside或Dialog、分屏上下呈现和独立滚动；不另画HTML替身 |
| 状态分配 | 宽暗完整正常+后台/第三Session；窄亮noSpace/empty/loading/error/long；宽亮disconnected/detached/stopped/restored与明确继续。亮暗关键前景/状态/焦点都覆盖，不做所有状态笛卡尔积 |
| 键盘/焦点/命中 | 真实Tab/ShiftTab/方向/Home/End/Enter/Esc；菜单、Select、工具/Sheet/Dialog焦点约束与有效返回；桌面32、窄44实盒无重叠；长标题关闭始终可达；状态有文字不只颜色。drag用真实pointer坐标并回读树；仅DOM事件不证明Chrome几何 |
| 200%与减少动效 | 复用010隔离profile的真实browser zoom，保存Preferences/outer/inner/DPR/visualViewport/CSSzoom校准，不能把deviceScaleFactor当缩放；200%再做主路径和滚动焦点可达，亮暗截图。Emulation reducedMotion真实匹配，检查动画无位移缩放；不为通过而停全局动画 |
| 截图与清理 | 沿010最终91cf脚本的方法等待真实动画/连续稳定RAF；测设计外盒。CDP `fromSurface:true,captureBeyondViewport:false` 原PNG，核CSS尺寸×DPR和左右像素校准；滚动分段保留位置，不能把裁半或单屏当整表单。保存源/完整依赖SHA、metafile、server/Chrome实际退出及test-owned profile清理；不改旧010脚本 |
| 真宿主边界 | Chrome受控controller-port层不能替代真实Obsidian Scope、popout/多叶、原生剪贴板/IME/持续PTY；现真实Controller测试与Chrome层分开声明。只有后续实际取得宿主环境才交这层证据，不把静态/原型/fixture说成真实用户窗口 |

## 问题与下一步

### 精确最小写集建议与现 Ticket 缺口

以下仅供 Root 合并012后正式分配；本任务未解锁任何路径。

| 切片 | 最小候选路径 | 当前T09范围/建议owner |
| --- | --- | --- |
| UI组合/导航/目标 | `AgentWorkspacePage.tsx`及DOM、`ui/workspace/WorkspaceLayout.tsx`及DOM、`ui/sidebar/AgentSidebar.tsx`/SpaceNavigation及相关DOM、`ui/tabs/TabStrip.tsx`/WorkspaceTab、`ui/control/TerminalControlPanel.tsx`及DOM、`i18n.ts`、必要所属styles、新panels Chrome脚本 | 均已在T09写集；一个UI owner，保留jump/create现逻辑，只有真实接线需要才触及 |
| Pane头/叶呈现 | **`src/modules/agent/ui/terminal/TerminalTabView.tsx`、`TerminalTabView.dom.test.tsx`** | **现写集遗漏，建议窄补这两路径**；UI owner。不是泛解锁terminal/desktop/Host |
| Pane用例/命令 | `services/workspace-service.ts`和对应tests、`core/workspace/model.ts`/ops及tests、`services/control/commands.ts`/tests；router只有确需通用接线才写 | 已在范围；一个业务owner拥有布局/身份/持久语义。UI等此真实接口，不复制store writer |
| canonical能力 | **`src/shared/native/control-schema.json`、`control-wire.generated.ts`、`native/pty-server/src/control/wire_generated.rs`**；实际内嵌bundle依赖由Root按生成闭包确认 | **现写集遗漏**；shared唯一owner串行六op激活/生成/跨语言契约。Rust CLI目前已有通用descriptor消费，`cli.rs`先只读，只有实际反例才申请窄扩展；不能手改generated |
| 保存/叶状态 | `services/workspace-store.ts`/workspace-store-spaces.test.ts、`services/spaces/layout-merge.ts`与相应tests、`services/workspace-view.ts` | **不被workspace-service*.ts覆盖，属于条件遗漏**。优先复用现实现；只有新持久字段或工具叶状态实际要求变化，Root再窄补，不为准备先扩所有路径 |
| 仍只读的复用件 | `core/terminal/layout.ts`、`ui/terminal/terminal-view.ts`、`services/terminal/sessions.ts`、controller/foreground、Shell、NativeHost | 当前无需为同Session多Pane改写。`split`纯函数已可插入另一个已有runtime；在WorkspaceService校验去重和身份即可。独立Pane ID可在既有唯一叶引用上建立（具体字段/存储由Root合并012定案），不必先重写core terminal树或xterm owner |
| 文档/产物 | `docs/agent-workbench.md`、main.js、styles.css | 已分配给Lead；Root单writer串行build与同源生成。业务/UI不要各自构建覆盖 |

建议先确定 Pane ID 生命周期与list结果中原Space/runtime引用、resize“ratio对应哪一条相邻split”的规则，再给GUI/CLI同一服务接口。现 canonical接受0.01–0.99，而既有core与Panel minSize15实际限制0.15–0.85；需明确拒绝还是返回实际clamped比例，不能宣称请求值已精确应用。关闭旧Pane后不可静默命中邻居/新代次；恢复及重新attach如何产生/保留显示ID需有定向断言。跨Space定位切所属Space，不把Session移入当前Space树。以上是候选接缝约束，不新增产品决定。

现T09只有Lead shared owner，Root若并行实施应先给互不重叠的精确路径：业务owner独占WorkspaceService/core/control，UI owner独占Page/Sidebar/Tab/TerminalTabView/Chrome，shared owner独占canonical/generated与跨语言验证；i18n/docs/根产物由Lead协调单writer。同文件不按方法并行改。T08若因审查修改相关源，当前109源与85路径核对只证明本次冻结点，必须重新确认受影响建议。

仅Root判断T08何时关闭、T09何时开始。后续无需重做原型方向选择，不将邮箱/历史业务或T13共享网页承载带入T09。013报告原子写入后执行return结构检查，实际输出单独保留证据根；产品源码与010脚本保持停止。

SOURCE STOPPED（本任务仅只读准备；仅REPORT/tmp证据写入）
