# UI-001 验证记录

本记录只说明原型与文档，不报告产品已实现。

## 已执行

- JavaScript 语法检查与物化 `--check` 通过，final 三文件和具名源码块一致。
- Chrome 153.0.8010.47：3 候选与 final 各 1440/390 宽，共 8 个必需独立 case；comparison 两尺寸和 3 张补充状态图。检查记录见 browser.json、observations.json。
- DESIGN-0001 已获批准并经 A 网关发布，current/快照与获批输入逐字节一致，索引完整，发布及回读摘要见 publication-receipt.json、preview-binding.json。14 组关键明暗文本/状态对比度均不低于 4.5:1。
- 输入方案再次逐字节核对通过：SHA-256 c71b8637aef44c57f78cd5fd51da08e74ab37b004056c4012d7e6ad03bbb7aee。Spec 的 64 个 AC 唯一且均绑定接缝，所有 Path 引用存在。
- `validate-design-package --check-preview` 退出 0，候选/资源/源码/真实浏览器/页面状态门通过。8 个必需 case、289 条完整检查观察，比较页采用状态更新后增加 2 条定向复核；13 张当前截图均已实际打开核对。
- 正式封板：获批 DESIGN 登记后，materialize `--check` 验证 3 文件，design package `--check-ready` 退出 0；prototype（指定 UI-001）与 spec 两个 stage 均为 0 errors、0 warnings。UI-001 为 ready，change DESIGN 为 approved，Spec 为 ready 且 ready_for_tickets 为 true。

## 命令

从项目根执行：

```sh
node .agents/speculo/workflows/specdev/specdev-p-prototype/scripts/materialize-prototype.mjs --check .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/prototypes/UI-001/design-system.md
node .agents/speculo/workflows/specdev/specdev-p-prototype/scripts/validate-design-package.mjs --check-ready .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/prototypes/UI-001/design-system.md
node .agents/speculo/workflows/specdev/common/tools/validate-specdev.mjs --stage prototype --prototype-id UI-001 --repo . .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor
node .agents/speculo/workflows/specdev/common/tools/validate-specdev.mjs --stage spec --repo . .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor
pnpm test:docs
```

浏览器检查可通过 evidence/check-browser.mjs 重做，需要单独启动隔离的 Chrome CDP（默认本机 9338）。测试不启动正式 Obsidian，不安装依赖。独立 Chrome 进程在任务结束关闭，不留下预览服务器。

## 非本 change 的文档检查问题

首次全仓 `pnpm test:docs` 报本 change 尚未生成的验证记录链接；本文件已补齐。另报 `2026-10-25-huhu-bot-architecture/inputs/HUHU-Bot_架构审核与工程设计规范_v1.1.md` 的 6 个内部标题锚点不存在。该输入不属当前指定 change，没有为通过检查改写它；封板后的最终重跑仅剩这 6 个范围外问题，本 change 无链接错误，原始摘要和批准绑定也再次核对通过。结果见 final-checks.json。

## 状态与未验证项

用户已选择 final 的 A 方案，并明确批准 6 条基线发布和 P/S 封板，当前没有待答问题。早期 Spec gate 的“prototype must be ready / DESIGN requires approved”保留为发布前的真实失败；本次发布、登记批准与就绪后重新执行，两项状态条件均已满足，新的实际检查通过。发布和检查回执分别见 publication-receipt.json、readiness-checks.json。

没有构建插件、运行产品单元/集成测试、真实 Provider、真实审批、五平台验收。纯文档及离线原型不要求重建 main.js/styles.css。
