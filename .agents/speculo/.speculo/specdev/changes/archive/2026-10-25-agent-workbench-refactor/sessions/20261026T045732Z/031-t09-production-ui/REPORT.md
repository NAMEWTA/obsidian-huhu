# 任务回报

Session: 20261026T045732Z  
Task: 031-t09-production-ui  
Status: completed

## 聚焦交接

031 的 U20 生产 UI 候选已交回：原工作台增加 Space 身份工具栏，终端窗格常驻可达标题与关闭按钮；窄屏仅投影原分屏，不因挂载、跨宽度或外部比例同步写回；控制目标在跨 Space 后保留真实原身份且失效禁发。继续使用原 WorkspaceService、SpaceWorkspaceStore、TerminalTabView、TerminalView/xterm、Shell 与 T08 焦点和运行生命周期。

最终正式根配置 DOM 8 文件 / 90 测试 actual0；最终 8 个生产 TS/TSX 的定向 ESLint 零警告 actual0；生产 Chrome3 30 检查及 26 组截图校准通过、actual0、该轮输入 drift=[]，自有 Chrome/profile/server 已清理。16 个产品路径改动、4 个分配路径保持原样；没有写 A/B/Root 的产品路径。未提交、推送、发版或归档。

`completed` 只表示本 worker 候选交回，不表示 T09、AC-009、AC-061 整票或 Goal 已通过。A/B 服务与 CLI 仍可活动；Root 保留唯一正式状态、最终产物、完整 CLI 双向集成、build/lint/结构与独立双轴审查。本报告不把局部 DOM/受控 Chrome 称作真实 Obsidian/Provider/OS IME/五平台验收。实际 worker `/root/prepare_t13_browser`，用户要求模型 `gpt-6.1-sol` / `xhigh`；原派遣句柄与模型信息由 Root 工具记录拥有。

## 产物与验证

证据根 **R** = `/tmp/huhu-t09-production-ui-20261026T163047Z`；Chrome1/2/3 = `/tmp/huhu-t09-production-ui-chrome1`、`...-chrome2`、`...-chrome3`，另有 prepare-only `/tmp/huhu-t09-production-ui-prepare1`。产品仅写 TASK031 的 U20，另写本 REPORT 与全新授权临时目录；不覆盖030报告/证据，不更改正式合同/状态、Git/index、依赖或用户 Vault。

- TASK 已完整读取并核 SHA `e82d96b02c0c4bc1bb3860f2551c3efcf3bb859eb033d876a11a882c526b116d`。Root 实际 dispatch0/errors/warnings[] 的原件为 `/tmp/huhu-t09-root-ui-dispatch.{json,log}`。bootstrap workspace/catalog、运行/I/dev/ui 与适用规则已读；未变化部分复用。
- 继承指定 GP033/Map34、T09、工程 Packet、allocation、Root API checkpoint、DESIGN revision1/PAGE-001/003 与013原生产接缝研究。随后 Root 正式 GP034/Map35 只追加 Root 独占 `vitest.config.ts`；U20 与原 TASK 权限未变。行政当前输入另在 `R/delivery-inputs.json`，不是追溯替换派遣起点。
- 真实已固定接口 `WorkspaceStore.readLayout(spaceId)`、`WorkspaceLayoutSnapshot`、`projectPaneIdentities` 等来自 A 的原 owner；GUI mutation 仍走原服务。没有自造六操作 DTO/API、CLI availability 或新 writer。T13 本031未实施。
- `R/before-U20.json` 保存开工前原字节/模式/CAS，`R/after-U20.json` 保存交回字节及嵌入 before；`R/U20.diff` 只对这些起点比较。既有文件模式全部保留。新文件模式见下表。
- `R/command-index.json` 保存 45 条已捕获命令（读源、格式化、定向验证与 fixture）真实 argv/cwd/UTC/exit/raw 哈希。`run.py` 用实际子进程 returncode，不对 drift 改码。少量 bootstrap/交互式静态回读未经过此捕获器，不补造其 raw/开始时间，也不把45称所有工具调用总数。
- `R/delivery-inputs.json` 另存根配置、规则、包/锁、Node 二进制、临时配置/边界/捕获器及设计合同的交回时字节。`R/objects` 交回检查 1302 个 CAS 错误=[]；Chrome 各自 objects 随其 source.json 保存。

## 实现与 Design Conformance

设计继承 `DESIGN-0001` / `UI-001` / candidate-a；baseline digest `ebaca5f2f15fe081bf393c892f8b6583d4f2c6ad12cd92cb55068005fe83a331`，prototype digest `b8bcf55791eabb1d620c990e2aaaad49f7ccec9ab6a0f557e65ba3baa12fe1af`，批准 digest **`f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab`**。本地贡献为 PAGE-001 / PAGE-003，绑定 AC-009 与 AC-061 的本票页面部分；其他已完成 T08 行为仅做回归，不扩大为全页、通知或历史最终完成声明。

| 生产接缝 | 本次结果与原 owner |
| --- | --- |
| `AgentWorkspacePage` + 新 `WorkspaceToolbar` | 顶部 min44px，显示原 Space 名/完整ID、加载/错误/无Space原因及后台数量。导航、控制、历史、页面菜单沿原 context/view store，控制/历史互斥。原 TabStrip 的全局工具迁到此处，原“+”、快捷命令、Tab/group 菜单、pin/color/拖动/关闭等入口保留。 |
| `WorkspaceLayout` Tree + `TerminalTabView` PaneTree | 由实际容器 ResizeObserver 选择窄屏上下投影，原模型 direction/sizes/ratio 不改；imperative PanelGroup setLayout 接收外部原 owner 比例。onLayout 仅在真实 onDragging 或非 composition 的 resize 键活动期间回写，挂载/方向变化/CLI等外部同步不回写。键盘正例实际使用依赖的 browser 行为；双击沿原服务均分。比例夹取仍为原0.15–0.85。 |
| `TerminalHost` | 单Pane也常驻 min34px header，标题/状态/当前Pane文字、桌面 min32px close；窄工作台 min44px。长名省略但完整 title 包含Space/持久Session/runtime/可用Pane ID。标题按钮调用原 focusSession，不另写 focus 或输入 owner。原恢复、清理结果、关闭视图提示与错误反馈保留。 |
| 只读Pane身份 | TerminalTabView 从原 draft owner 的 readLayout 投影 lp1兼容ID；不在 render/query mint或落盘，不直接把runtime key当稳定ID。异步结果核原Space、revision和当前tab/scope，effect失活即舍弃。readLayout返回clone，不能用view引用相等当有效性。未适用/无原端口时不虚构身份。 |
| T08 `TerminalControlPanel` | 显式选择冻结 Space名称/Provider/title 与原 target tuple；跨Space过滤后仍渲染原目标及disabled选项，展示原身份，禁发直到重新选有效目标。Provider未知不猜成Shell。原发送、等待/取消/继续等、错误/停止/ForegroundIntent行为不搬走。 |
| `agent.css` / i18n | 基于原语义token与agent工作台容器补目标尺寸，<600保留44px命中，<480隐藏次要“当前Pane”chip；无新设计系统。新增toolbar、selectedPane、backgroundCount三组 en/zh 文案。 |
| 用户说明 | `docs/agent-workbench.md` 增补工具栏身份、窄屏投影、键盘/关闭与显式控制目标说明；原表格格式保留，未顺手重排其他章节。 |

与离线原型的必要差异：保留原 Shell 52px rail / 可调220–500px侧栏及600/960分档，没有采用原型固定232px；仍为原React/Radix/xterm和原布局树，而非HTML外壳；没有全局状态页脚。主路径无需hover才可关闭，原快捷键与Obsidian Scope不替换为原型演示快捷键。无 DS 规则例外、无改设计摘要或原型以迎合实现。`R/skill-execution-records.json` 保存 dev/ui 的实际输入、Skill SHA、实现轨迹、局部验证输出与范围限制，Root可据此形成正式 Evidence。

### 状态、焦点与交互

loading/noSpace/empty/error 用原 SpaceService 状态进入真实页面，均保留可用入口和原因；无Space可开网页，不将网页套用运行Space准入。后台计数/列表来自原managed snapshot，关闭最后Pane后原Runtime仍running且view=detached。disconnected/stopped/restored分别通过原服务和受控外部端口建立，失联保留未知/清理未核实，不伪装idle或成功；恢复记录不spawn或重放输入。

真实 focus 仍沿原 TerminalHost → presentManagedFocus/commitFocus → consumed 与原Scope/composition门。本次只增加调用原 focusSession 的标题入口；现有renderer端口DOM回归涵盖实际消费、失活/隐藏/关闭/晚到取消，不把“当前面板”文字称为已取得终端输入焦点。Chrome以真实Tab事件验证Dialog约束、Escape返回实际工具栏trigger，并打开原Space Sheet；Space/显示焦点不暗改控制target。真实Obsidian popout/Scope、系统IME由用户验收。

## 红绿、装配失败与最后验证

| 原件命令 | 事实与结果 |
| --- | --- |
| 007→008 | 生产控制selector在跨Space后空/错显，真实断言红；冻结显示身份后绿。 |
| 010→011 | 原页面缺工具栏role红；真实工具栏装配后绿。 |
| 012 / 013→014 | 012是Electron解析的DOM装配失败；显式外部host边界后013才暴露真实窄屏方向红，014绿。没有mock TerminalTabView掩盖。 |
| 016 / 017→018 | 单Pane缺header红；017仍缺runtime完整title，018绿。命令名带green不等于成功。 |
| 020 / 021 / 022 | 020真实依赖走node/edge-light入口，layout effects被去除，ARIA未初始化，是测试装配失败；不称产品红灯。临时browser入口后021实际键盘正例、022外层group键盘/跨宽度/外部比例同步绿。 |
| 024 / 025→026 / 028 | 024是fixture不稳定settings snapshot和缺宿主workspace方法；修fixture后025在真实原draft owner暴露错误view引用比较，026只读身份绿，028晚到A投影不覆盖新Space B。 |
| 030→031 / 043 | 首次定向lint含被忽略测试warning及两项生产问题（effect同步setState、unbound readLayout）；改用derived scope保护并保留方法接收者后031/最终043零警告0。 |
| 037→039 / 042 | 首次Chrome30项已true，但200%最后截图循环Runtime.evaluate顶层const重声明，脚本exit1；修IIFE后039 Chrome2及最终格式字节042 Chrome3均0。Chrome1失败原件/PNG/cleanup未删。 |

早期失败命令的捕获 exit126 是 `/home/wta/.local/bin/node` Volta wrapper 的实际退出码，不是Vitest本身的返回码，也不是drift捕获器重写。027受控对比证明该wrapper对子命令 `process.exitCode=1` 返回126，实际Node `/home/wta/.volta/tools/image/node/26.11.1/bin/node` 返回1。原 stdout 可见 Vitest failed/断言与原 stderr；没有独立内层进程returncode时不伪造为1。027之后使用实际Node路径。完整11条非零回执保留，后续绿色不删红灯/夹具失败。

最终适用验证：

- 038 `vitest run --config R/vitest.config.mts --project dom` 的8文件90测试0；041同集合附实际Node外部模块trace再次8/90为0。集合为 AgentWorkspacePage、WorkspaceLayout、WorkspaceToolbar、TerminalControlPanel、TerminalTabView、AgentSidebar、SpaceNavigation、keyboard-scope。临时配置只继承根配置+证据缓存/trace+Electron外部边界，**已移除冗余react-resizable-panels override**。
- Root正式 `vitest.config.ts` SHA `7bad200d92a78d19a3d8ba5d77d91f728a6171b7aeb3d059c1105663222d71b4` 只在dom使用browser入口。041 Node实际load记录 `.pnpm/react-resizable-panels@3.0.6_.../dist/react-resizable-panels.browser.development.js`，88470B、SHA `73a6f4184aa23c308084927f2afe80bf4be95acb42c008c5eba3a18192218e98`，deliveredSourceSha256一致；没有用mock PanelGroup。
- 041 trace含 167 项Vitest transform原文件输入、7619 项Node实际load记录，去重path/hash 1244项，见 `R/041-closure-index.json` 与命令目录 `compile-loads.jsonl` / `node-loads.jsonl`。Node builtins无文件条目，虚拟转换输出由工具/配置和实际生成config CAS表达；不将只有transform的167项称完整外部依赖闭包。
- 041后验原件 `R/041-source-after.json` 有5个缺失，全部是Vite自动删除的临时编译config `.timestamp-*.mjs`，各实际字节已由load hook保存CAS；分类见 `041-post-run-classification.json`，repo源/依赖漂移=[]。不擦除原始缺失观察，不称全仓冻结。
- 043 只对本次8个生产TS/TSX ESLint `--max-warnings 0`：0；044最终脚本 `node --check`：0；045用户文档4个本地链接目标存在：0（不等于全库docs门）。未运行根build、全库lint/architecture/Promise/协议门，按TASK由Root统一进行。
- DOM关键新路径装配真实WorkspaceLayout/TerminalTabView/原SpaceService+SpaceWorkspaceStore+WorkspaceService。可以替换外部存储、目录/租约和宿主；既有TerminalHost测试保留TerminalView renderer端口fixture以观察focus消费/取消，不称该DOM分支真实xterm渲染。Chrome另装配真实TerminalView/xterm。

## 生产Chrome与原始截图

最终命令回执 `R/commands/042-final-script-chrome/{receipt.json,stdout.raw,stderr.raw}`；脚本 `scripts/obsidian-acceptance/agent-workbench-panels.mjs` 正常import生产组件及ShellRoot，实际build仅自己的受控browser bundle，不运行根build。入口、bundle、完整esbuild metafile、2359份实际编译/附加输入、hash/模式/CAS在 Chrome3 `source.json`，每轮 `source-after.json` 内部drift=[]。原Obsidian/controller/native/editor/Provider/磁盘端口受控，无实际helper/PTY/Provider启动。

Root按稳定11生产输入生成本次真实 `styles.css`：1422696B、SHA `3e52380b388e0be38d69b547311bc8241dad983244811b06ade7fb768946c568`，tailwind/write/check由Root实际0。脚本必须传匹配 `HUHU_PANELS_STYLES_SHA256` 并校验字节，不接收过期样式。Root生成期间U全部src（含Tailwind扫描测试）按消息HOLD；生成后测试释放、生产11继续稳定。Chrome2→3精确有3个输入变化：本验收脚本及 **A-owned `workspace-service-panes.ts`、`workspace-service.ts`**；完整前后SHA见 `R/chrome2-to3-input-diff.json`。U生产11/CSS相同不代表两轮所有依赖同字节；各轮消费各自manifest，不能合并称全源冻结。

30项最终检查包括：真实TerminalHost与后台对象；1440/1200/800/390/480及599/600/959/960布局/关闭命中；跨宽度原树/方向/比例/Pane身份不写；312px控制外盒；真实Dialog Tab约束/Escape返回；外部原owner比例→GUI，实际pointer pane/group resize→同owner readback；实际Tab拖动→原groups；最后Pane detach仍running；真实reduced-motion media；empty/noSpace/loading/error/disconnected/stopped/restored与恢复零旧runtime启动；真实200%与无外部溢出。

截图索引 `R/chrome3-artifact-index.json` 及Chrome3 `screenshot-calibration.json`：26组 `<name>.png` / `<name>.calibration.png`，保留**原CDP PNG字节**，没有裁剪/缩放/拼图。每组校验image dimensions与inner/visualViewport×DPR、左右彩色边界、前后scroll及focus不变；全部true。PNG decoder仅读校准像素，不重编码发表PNG。每场等待真实有限动画结束与连续3帧几何稳定，没有全局禁动效；reduced-motion另用实际媒体匹配。

200%独立正常Chrome profile Preferences zoom_level=`log(2)/log(1.2)`，不是CSS zoom或设备DPR模拟：`zoom-mechanism.json`、`zoom-metrics.json`、`zoom-preferences-final.json` 证明 outerWidth1200 / innerWidth600 / DPR2 / CSS zoom1 / visual scale1；亮暗对话框顶部/底部4图均已保存，滚动至底部可达发送、读屏、定位与停止。校准图本身含边界标记，clean图是恢复边界后另一份原始截屏。

本worker实际打开原图核对 viewport1440/390、宽暗色控制、窄暗色Dialog、200%明暗顶部/底部、error/noSpace/disconnected/stopped/restored：长名截断不挤掉close，身份保留在title/详情，控制可内部滚动，无外部裁切/意外横向滚动；fixture顶部“Outside fixture focus”是焦点观测按钮，终端内容/系统信息来自受控端口，非真实CLI输出。Root也回读并打开Chrome2/3代表原图；其最终结论由Root保存。

资源所有权/清理在每轮 `commands.json`、`cleanup.json`：Chrome3两个专属PID与exit/时间、动态server/CDP port、profile/zoom-profile/isolated HOME/XDG/tmp路径与命令均可回读；browsersClosed=true/serverClosed=true/errors=[]，自有profile等已删除，截图、构建fixture、CAS与原Preferences留证。没有触碰其他任务Chrome/端口或真实Vault。两次成功运行外另保留Chrome1脚本失败及其完整清理证据。

## U20逐路径前后hash/模式

下表是本次交回时快照，完整bytes/CAS见 `after-U20.json`，不能拿当前Git HEAD diff代替开工前T01–08起点。模式为权限位，missing表示授权新增。

| 路径 | before SHA256 / mode | after SHA256 / mode | 处理 |
| --- | --- | --- | --- |
| `src/modules/agent/ui/AgentWorkspacePage.tsx` | `9b5da986ee78149cca84ffc678338b674fdee977e3b64ae6a367c740e446159b` / `0o600` | `c7b36f7be686ec35335b99fdbf4648d7178c6adfa24e0ac57922e0b4d5e6593a` / `0o600` | 修改 |
| `src/modules/agent/ui/AgentWorkspacePage.dom.test.tsx` | `ff3f9e9b6a2a826cc42bf8613dfbfc7d03dd6301500c276f361d3c28c510441c` / `0o600` | `8bc52a4328b2201fad2fcb372c9fc7739c05e9ee952c84bf124223d2ab72e5ba` / `0o600` | 修改 |
| `src/modules/agent/ui/workspace/WorkspaceLayout.tsx` | `e8c3c3a6d112725c32a1c20bf69b883501f18308f2d55546430dcca620f824c6` / `0o600` | `45e671522a168051c9833cb525570b026458964001e10b91e575a5c5eb180e87` / `0o600` | 修改 |
| `src/modules/agent/ui/workspace/WorkspaceLayout.dom.test.tsx` | `25226aa777d29c261e92937a145c0cb74aee1d136de9055b1e80622704e864a9` / `0o600` | `c3cbe8979972ff04b8282dc73bcdae8a069e955f1af81e2d167aed2e8d8255d6` / `0o600` | 修改 |
| `src/modules/agent/ui/workspace/WorkspaceToolbar.tsx` | `missing` / `—` | `891d7f9f3ef22100c0c0b8269a5f04015b97d8fbef693175f8ee44d4e1af959f` / `0o664` | 修改 |
| `src/modules/agent/ui/workspace/WorkspaceToolbar.dom.test.tsx` | `missing` / `—` | `cd92b1a7d2af789e6073f656ea0448358f272a1075de1a318626b4f7feed8f51` / `0o664` | 修改 |
| `src/modules/agent/ui/sidebar/AgentSidebar.tsx` | `63ec319e98791cc4aa7c50bca1ee525754ea901f25d0d010031834a5daa6e1f1` / `0o600` | `63ec319e98791cc4aa7c50bca1ee525754ea901f25d0d010031834a5daa6e1f1` / `0o600` | 未改 |
| `src/modules/agent/ui/sidebar/AgentSidebar.dom.test.tsx` | `aab983401b272b16d7d10c5b4d73b9e3fe27d129b4efaf1a859432e6b176b724` / `0o600` | `aab983401b272b16d7d10c5b4d73b9e3fe27d129b4efaf1a859432e6b176b724` / `0o600` | 未改 |
| `src/modules/agent/ui/sidebar/SpaceNavigation.tsx` | `59347afe0120b5b8391668feb9884a6dcc6fe19e2c0a17373f04c25a9d7aa10c` / `0o600` | `59347afe0120b5b8391668feb9884a6dcc6fe19e2c0a17373f04c25a9d7aa10c` / `0o600` | 未改 |
| `src/modules/agent/ui/sidebar/SpaceNavigation.dom.test.tsx` | `1137fc1383297c9d13529e049a86e8d4bc45c01b91eb44aeb405508c57485378` / `0o600` | `1137fc1383297c9d13529e049a86e8d4bc45c01b91eb44aeb405508c57485378` / `0o600` | 未改 |
| `src/modules/agent/ui/tabs/TabStrip.tsx` | `2bdf833984af86d2a4bd92bb6181b044d74dad4d2b76eca5752c57d5a2fd5f66` / `0o600` | `2e5753f9a38bb4fda3a0b72668d9da9d050f81bc51548e8f2a9ef0acbb46b135` / `0o600` | 修改 |
| `src/modules/agent/ui/tabs/WorkspaceTab.tsx` | `95a7e2b68336a917f748865547415a3626ae70685054588b86bc29dfcf398c8e` / `0o600` | `a21b77e454840a43cac5da291c846e63e3dc3d41fda624f7921dd125accf7d71` / `0o600` | 修改 |
| `src/modules/agent/ui/control/TerminalControlPanel.tsx` | `d7ce593e83aab8bed666699692fdac074e54b820fd3d2817626fcf7f55b5a67f` / `0o664` | `34d7d7017e4da0f2dce88f27ffb021c6b9a5f0ae1c984e4ea9fc07c677afb879` / `0o664` | 修改 |
| `src/modules/agent/ui/control/TerminalControlPanel.dom.test.tsx` | `6165a36f8480b6b9ee5f9d35863872f54b981197c75c8bcf266d3a734699a967` / `0o664` | `0eabe22c56f18814281c5e196ccf076c8833e61259cfd5dc086da8faeebe6ca5` / `0o664` | 修改 |
| `src/modules/agent/ui/terminal/TerminalTabView.tsx` | `7a7aa74f727596fc135e3bd9ac75d340e84841454c7fd9a6a938f8eb8d98eaec` / `0o600` | `47799f959fc6e06fe92069525241a84529924a4efd808941d0a11eb451a5ba70` / `0o600` | 修改 |
| `src/modules/agent/ui/terminal/TerminalTabView.dom.test.tsx` | `9794ea270d85f4301c1dbdf6d1925b676aadfc12e068f57de0ce7c288854971f` / `0o600` | `1825057fa214397f79f4d0be573264f0fbc0ef41d5ce09c7909611c8f6a61dbe` / `0o600` | 修改 |
| `src/modules/agent/i18n.ts` | `8d24c4d3f24eeca37379774501847436b8d6d450423f8e3f4f94ea08094e1eaa` / `0o600` | `9de547d9dd03300f33ed4b4e49d5b379019b59888b024fe01c8bd0888ee665d4` / `0o600` | 修改 |
| `src/modules/agent/styles/agent.css` | `c8c0e5432890742ea04c78a3edcfbb673293b20a858ac4dfd1750c19e23ad70e` / `0o600` | `398b173fd5467676eb34d4fd5f1217e3d05382ac40bed0f97e696240e6f9ce9d` / `0o600` | 修改 |
| `scripts/obsidian-acceptance/agent-workbench-panels.mjs` | `missing` / `—` | `37609bef0b16f0d61dd26726b8a65be7cd83e5727895a422b189d9e4cd66d99c` / `0o664` | 修改 |
| `docs/agent-workbench.md` | `51a23fd5b3311baec74e0bbbd0af917d38723fb7b31a2f9c6de45fd5f5e19d70` / `0o600` | `d7cba5acd6e52364d755846c9e23d3211be9cc8ecddd354b660b0769350b1f94` / `0o600` | 修改 |

## 问题与下一步

没有新的用户产品决定或待批准范围。当前候选没有未处理的已复现本地UI缺陷；Root仍需在A/B最终输入上统一完成六CLI/GUI稳定Pane身份、确切scope/clock与ForegroundIntent消费、真实native传输接线/协议，以及适用build、i18n/styles/预算/结构/全lint和独立两轴。B尚未交实际新增i18n key，本worker未预造；若后续确需key按Root新指令恢复唯一writer协调，不抢A/B实现。

本031只证明上述局部消费闭包，后续A/B接口、Provider配置、样本、规则、DESIGN或依赖相关变化由Root核影响并选择重验；不自动把早期snapshot结果覆盖到后续版本。真实Obsidian主窗/popout、host Scope/外部链接/Clipboard、Provider审批/登录、OS IME/辅助技术及五平台仍由用户按已约定E2E分工验收。T13原writer生命周期/Browser承载迁移留给后续票；未实施T14全消费者或T15正式迁移。

首次return结构校验实际exit1，仅因本REPORT缺少约定的“产物与验证”标题；原件保留为 `R/delivery/return-001.*`，补齐报告结构后重新实际校验，没有改产品或正式状态。

报告落盘后实际执行只读return结构校验，原件固定写入 `R/delivery/return.stdout.raw`、`return.stderr.raw`、`return.receipt.json`；以实际回执为准，本报告不预造该退出码。该validator只检查TASK/REPORT身份/结构，不替代产品验收或Root接收。

SOURCE STOPPED（仅031 U唯一writer已停写；A/B/Root仍可活动，不表示全仓停写）。
