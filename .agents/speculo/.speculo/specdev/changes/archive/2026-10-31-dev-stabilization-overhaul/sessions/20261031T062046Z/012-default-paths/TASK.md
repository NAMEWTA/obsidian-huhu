---
schema_version: 2
session: "20261031T062046Z"
task: "012-default-paths"
kind: implementation
change: 2026-10-31-dev-stabilization-overhaul
ticket: T-16
---

## Goal
Astra low实施T16固定英文默认路径与内置显示名本地化，Lead审查验收。先预检完整旧→新名称表和真实调用方，消息给Lead写入Evidence后再修改生产代码；该同步是本票先置记录要求，无需用户另授权。

## Inputs
读取Map revision10、dev及相关architecture/settings-i18n/testing、Ticket16、spec AC191/192/902、ADR006/008及execution-boundaries；T01/T02已done。用户全票实现授权持续有效。当前唯一dev工作区base86c500556db1d64865c4cc7f1aff1dd83de071fa。

## Workspace and Scope
唯一/home/wta/projects/obsidian-huhu，严格当前Ticket writable_paths减shared/frozen。只写本REPORT及授权文件；docs/data归本票，不改docs/references或Home词典，必要词典缺口先报告。source/helper派生路径跨模块消费者需完整核对，发现未授权文件先报Lead。禁止Git index/commit/push/checkout、递归派遣、Browser或其共享分支变化；保留他人补丁。Lead独占main/styles/build/fonts与Ticket/Evidence/账本。

## Acceptance
默认目录/固定文件名集中vault-layout单一表，英文小写kebab-case，huhuName未命名fallback也纳入；.huhu隐藏文件命名明确OUT。用户显式自定义标题/路径保持字节，不做旧中文目录探测、读取、迁移、删除或自动改名。用真实临时vault夹具覆盖en/zh新库、切换语言/重启、自定义名字/碰撞、旧中文目录字节不变且新路径独立读写；保护真实用户文件，无覆盖或清空。内置类型/字段使用稳定机器身份与t显示键，两词典一致，不把既有用户文本当默认类型身份重写。InboxSection仅替换路径常量，不改布局。

先给名称表/影响/测试范围，接Lead记录确认后实施真实代码；新增黄金样本仅反映有意合同变化，不删旧保护断言。读测试选择表选必要定向回归及i18n，最终全量和构建由Lead协调，不重复无失效的重型套件。现docs门12处历史归档相对链接尚由T03负责修检查器，保留该失败不归因本票/不改历史档案。当前整体main超预算3234B已测量交T37收口，不提高任何阈值，不宣称预算通过。

## Return
本目录REPORT.md按模板，实际源码/名称表/运行命令/退出码/剩余边界；完成停写，由独立reviewer双轴审查（本票high）。你此前T04 reviewer职责未取消，后续可能需短暂复核其修复，届时另派只读任务。
