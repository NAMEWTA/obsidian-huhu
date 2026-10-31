---
schema_version: 2
session: "20261026T045732Z"
task: "035-t09-dom-fixture-repair"
kind: "repair"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-09"
---

## Goal

Root完整18票Goal的T09第一次整合发现两个DOM套件在默认配置下无法收集。用户指定实现gpt-6.1-sol/xhigh。修正这两份测试自己的宿主端口装配，使仓库公开命令可运行；保持全部生产组件/布局owner/实际react-resizable-panels浏览器入口和原断言。不扩大成产品重构、不修改全局Electron别名、不递归派遣。

## Inputs

冻结输入 /tmp/huhu-t09-root-dom-repair-deydpk2f/inputs.json SHA256 97954aed08c654324ff52fa6e157aa82ed9d9c7c195a7f4402d00f773a04123b，包含两测试、根vitest.config.ts、031实际临时配置、Root真正失败raw/receipt和031报告。Root实际命令为绝对Node26.11.1+pnpm exec vitest run --project dom src/modules/agent src/modules/navigator；28文件303项通过，WorkspaceLayout/WorkspaceToolbar两文件在收集时找不到src/modules/agent/platform/desktop/files.ts的electron。无源漂移。031验证配置继承正式root配置/真实browser resizable入口，但另有临时electron stub别名，不能证明直接公共命令可跑。保留其历史证据，不覆盖或把旧配置通过当新默认配置通过。

执行前回读AGENTS/bootstrap及实际I repair、dev/ui测试规则，T09/engineering packet与031已批准UI合同。Spec AC-009/AC-061、GP034/Map35、同一change-workspace，T01–08 done，T09 in_progress；A028/B032/U031全部产品停写。Root完整build、lint、架构、i18n、CSS/许可已通过；其余检查仍在继续，真实E2E由用户进行。

## Workspace and Scope

repo /home/wta/orca/workspaces/obsidian-huhu/terminal，HEAD33c21e098ef3188cbab5a09f3e0a01fadb787715、branch NAMEWTA/terminal。本次唯一产品写集：
- src/modules/agent/ui/workspace/WorkspaceLayout.dom.test.tsx
- src/modules/agent/ui/workspace/WorkspaceToolbar.dom.test.tsx
Root在U031明确STOP后将这两测试重新委托本任务。其余U/A/B/Root路径只读；不改vitest.config.ts、生产TS/TSX、styles/main、依赖、真实桌面文件adapter。可读既有TerminalTabView.dom等相邻测试寻找真实宿主端口mock；只隔离Electron设备适配边界，不mock WorkspaceService/persistence/Pane identity/TerminalTabView/Panel resizing，也不删除或削弱现有键盘/身份/零写断言。

只写两测试、本035 REPORT与新/tmp/huhu-t09-dom-fixture-repair-*证据；旧TASK/REPORT/raw/CAS、正式状态/规范/永久知识、Git/index、node_modules均只读。不得新建或修改业务存储、Provider/Obsidian/Vault用户数据，不运行Cargo/browser/全仓lint或build。额外必要路径先交Root，不能自行扩写。

## Acceptance

保留Root真实red（可直接复用同字节失败，勿为形式重跑）；查清真实导入链后修最窄设备边界。使用仓库默认vitest.config.ts，无临时electron alias/配置/disable layout effects，运行两文件实际原断言全部通过；保留最终两文件源码字节、argv/UTC/exit/raw。定向测试类型检查覆盖这两文件可选由Root合并全测试types，不重跑全仓build。Root会重跑之前30文件DOM组，核实际初始red→最终同消费者green后统一独立两轴；你不自称整票/AC/Goal完成。保存无产品外改动、模式及最终STOP。

## Return

原子写 sessions/20261026T045732Z/035-t09-dom-fixture-repair/REPORT.md，Session/Task/Status与“聚焦交接”“产物与验证”“问题与下一步”齐全；注明031额外Electron alias边界、真正修复差异、测试数量/原始输出/未验证项。实际validate-dispatch --stage return保存raw/exit后，通过原生工具返回SOURCE STOPPED与报告路径。Root唯一正式状态与接收owner。
