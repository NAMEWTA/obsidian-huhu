---
schema_version: 2
session: "20261026T045732Z"
task: "031-t09-production-ui"
kind: "implementation"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-09"
---

## Goal

沿原codex:/root/prepare_t13_browser、用户指定gpt-6.1-sol/xhigh，实现T09 U生产工作台/面板与设计验收。030只读准备已实际return0并SOURCE STOPPED，Root已回读接收；本031是新独立任务，不覆盖030。用户完整18票Agent Team授权持续，Root编排并最后代码验收，真实Obsidian/Provider/OS IME/五平台由用户验收。不提交、推送、发版或归档。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/terminal；change .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor。HEAD 33c21e098ef3188cbab5a09f3e0a01fadb787715、NAMEWTA/terminal，current工作区。GP033/Map34，T09 in_progress/attempts0，T01–08 done。完整读T09 Ticket、正式工程Packet与allocation、批准DESIGN revision1/PAGE001/003，按Map→dev/ui→Ticket→Goal调用I与适用设计/TDD/错误/生命周期规则，已读未变规则复用。Root保留正式状态/Evidence。

- evidence/T-09-dispatch-input.json SHA256 aec8e02b821c7ea7869e0c153e213acc655fb60e1e9347cd78919577462acfc8
- evidence/T-09-engineering-packet.md SHA256 5900b0b979de79e39742eefc6696e38a473b16aab0a1bf69257649877c18e16d
- evidence/T-09-write-allocation.json SHA256 12b2f9bcea31f45176c798efe1f5e8f32442bf01a16505703cebe423e6f1da5d
- evidence/T-09-ui-api-checkpoint.json SHA256 0cc074f84f4f629ee2ed0b1e5ee6c800fbfb83ae1681283ba76f0d1da3da3971
- evidence/T-13-browser-preparation-root-audit.json SHA256 9a394ab76065d5a28503dfd230c59603191156054a0bbb24f610ae863b2419af

初始baseline已含T01–08。013生产UI接缝与018身份反例可复用；旧“load补ID”建议已经否定。030报告只作为现有Browser/read-only边界上下文，本031不实施T13共享承载提取。

## Workspace and Scope

本031只有下列20产品路径由你唯一写；20路径在Root API checkpoint时仍等于T09初始版本（新增路径尚不存在）：

- src/modules/agent/ui/AgentWorkspacePage.tsx
- src/modules/agent/ui/AgentWorkspacePage.dom.test.tsx
- src/modules/agent/ui/workspace/WorkspaceLayout.tsx
- src/modules/agent/ui/workspace/WorkspaceLayout.dom.test.tsx
- src/modules/agent/ui/workspace/WorkspaceToolbar.tsx
- src/modules/agent/ui/workspace/WorkspaceToolbar.dom.test.tsx
- src/modules/agent/ui/sidebar/AgentSidebar.tsx
- src/modules/agent/ui/sidebar/AgentSidebar.dom.test.tsx
- src/modules/agent/ui/sidebar/SpaceNavigation.tsx
- src/modules/agent/ui/sidebar/SpaceNavigation.dom.test.tsx
- src/modules/agent/ui/tabs/TabStrip.tsx
- src/modules/agent/ui/tabs/WorkspaceTab.tsx
- src/modules/agent/ui/control/TerminalControlPanel.tsx
- src/modules/agent/ui/control/TerminalControlPanel.dom.test.tsx
- src/modules/agent/ui/terminal/TerminalTabView.tsx
- src/modules/agent/ui/terminal/TerminalTabView.dom.test.tsx
- src/modules/agent/i18n.ts
- src/modules/agent/styles/agent.css
- scripts/obsidian-acceptance/agent-workbench-panels.mjs
- docs/agent-workbench.md

允许031 REPORT和全新/tmp/huhu-t09-production-ui-*证据/隔离fixture、自己的Chrome profile/server。A在028独占14路径，B在029只写前10个canonical/CLI路径；controller/SpaceService/records/Host/helper/终端内核/Shell/依赖及其余未分配路径全部只读。不要因为UI测试需要去改另组服务；真实缺口先交Root补精确范围。共享TS/Rust wire由B通过原生成器产生；main.js/styles.css/bundle-budget/notices和正式合同/状态由Root独占。不得运行根build/build:css、全库lint、architecture/Promise门，不写node_modules/旧tmp/用户Vault。

本阶段可以开始生产UI与定向DOM。真实Chrome要等你交稳定UI/CSS输入并请求Root生成一次实际styles.css后，由Root安排资源窗口；不能以旧样式或原型截图冒充新生产布局。可先编写自己的受控验收脚本，不启动真实Obsidian、Provider、账号或native helper。A/B仍工作时只宣称实际捕获闭包的测试结果；最终统一输入和整票验收由Root负责。

## Actual API Boundary

A已实际导出WorkspaceLayoutSnapshot {spaceId?,view,baseline,revision,cached,dirty,pending,conflict?}；WorkspaceStore.readLayout?(spaceId?)、editLayout?(spaceId,transform,{signal?,deadline?,validate?})、updateLayout?(transform)。真实签名与011测试源快照在Root checkpoint中，不是口头DTO。pane-identity.ts已有PaneIdentityScope/PaneIdentity、projectPaneIdentities、legacyPaneId、materializePaneIdentities、validPaneId。Root实际回读001/002、003/004、005/006红绿及009–011原件；仅支持第一批consumer开始，未声称A全部完成。

A继续实现六个WorkspaceService面板用例以及风险测试；其实现文件仍活动。你只消费上述已固定端口和既有GUI方法，UI不能复制Pane DTO/身份分配/持久writer/运行控制。需要新的六操作服务接口时通知Root/A，等待真实export与证据，不以mock同名API开路。B阶段2八路径尚未解锁，六命令availability仍false。本TASK不授权你激活CLI或实现adapter。

## Acceptance

1. 对照DESIGN与013选择原Owner内的最小UI组合。保留Shell 600/960容器档位、52px rail、220–500可调侧栏、组/Tab drag、pin/color/快捷键/菜单及工作台入口，不固定成原型232px。补真实Space身份和44px工具栏，Pane header至少34px、桌面close命中至少32px、窄屏44px；长中文/重名保留身份和完整title/详情，不能挤走按钮。
2. 原TerminalTabView/WorkspaceLayout生产消费链保持，终端依旧原renderer/input/尺寸owner。窄屏把分屏上下呈现是展示投影，不能触发持久direction/ratio变化或多分配paneId；跨600/960恢复原模型。react-resizable-panels的挂载/方向变化/onLayout回调必须与用户真实drag区分，真实pointer后回读原树/比例。ratio仍0.15–0.85且second子树语义与A一致。
3. 显示loading/noSpace/empty/error/background/detached/disconnected/stopped/restored各自真实原因，unknown不等于idle。无Space保留创建与网页入口，网页不套运行Space准入。后台会话可定位原运行，关闭最后Pane只detach且说明仍运行、停止放原明确目标控制工具。重新附加/重开用A既有入口，不在组件spawn/归档/新建Session，也不在渲染/query中mint ID或写盘。
4. 保留T08控制312px外盒和<600 Dialog、输入回执/等待取消/继续等待/读屏。控制target与显示focus独立：跨Space后保留原target则UI要真实展示原scope/Session/Provider/tuple及有效选项；失效则明确禁发并重选，不能selector显示新Space首项却仍发旧Session。重名不静默选首项。不要移动/改写T08实际错误处理、stop与ForegroundIntent门。
5. 真实focus必须沿presentManagedFocus→commitFocus→consumed。菜单/Dialog关闭返回原ownerDocument的有效触发点；Space/目标换代、blur/隐藏/关闭/卸载、新视图与晚到Promise不能抢焦点。保留现有keyboard Scope和composition/IME边界。按钮有名称、键盘可达/focus-visible，portal属于所在window；所有新增用户文案同一i18n文件中en/zh齐备，A/B key通过消息集中由你写。
6. 必要红灯从真实生产入口建立。DOM必须装配真实TerminalTabView/WorkspaceLayout及原store/service；可以替换外部磁盘/宿主端口，但不得只mock终端叶或测试复制的实现。覆盖同cwd跨Space目标、关闭最后叶仍运行、restore不启动、focus实际消费/取消、dirty query无写与原快捷键/菜单。测试不要硬依赖另一worker尚未稳定的新API，先在当前真实闭包上迭代；输入变化则保留旧证据和失效范围。
7. 稳定后向Root交CSS/TSX冻结点。Root产出实际styles后，脚本正常import生产组件，受控Chrome覆盖1440/1200/800/390/480和599/600/959/960关键边界、亮暗、长名/空/错误/后台/失联/停止恢复；真实pointer与同服务双向回读、200%独占profile校准outer/inner/DPR/CSS zoom、实际reduced-motion匹配。等待真实动画稳定，不全局禁动效。保留原PNG并检查尺寸/左右边界/scroll/focus，实际打开图像做视觉核对。真Chrome不是Obsidian/Provider/OS IME验收。
8. 记录实际argv/cwd/UTC/exit/raw、源/工具/编译实际消费输入及hash快照、红绿与夹具失败。资源PID/profile/server/端口/短fixture和清理责任可回读，只清自己创建资源。采用已有013/R02研究和原MIT组件，不重新泛搜、不引依赖、不复制GPL/未知来源。Root最终统一build/lint/结构/协议/真实CLI/预算和独立两轴，U自报不是整票通过。

## Return

需要CSS构建/原生共享窗口或新的A接口时先消息交Root最小实源与已有证据；不要等到报告才暴露阻断。最终SOURCE STOPPED，原子写031 REPORT：实际路径前后hash/mode、设计继承差异/真实组件和全部状态、关键交互/焦点、命令/消费闭包、截图/校准/资源与清理、未验证项。实际return结构校验保存原件再通知Root；completed只代表候选交回，不改Ticket/Evidence/Goal，不递归派遣。
