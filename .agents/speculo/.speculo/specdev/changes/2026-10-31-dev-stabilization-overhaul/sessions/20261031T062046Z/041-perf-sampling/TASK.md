---
schema_version: 2
session: "20261031T062046Z"
task: "041-perf-sampling"
kind: implementation
change: 2026-10-31-dev-stabilization-overhaul
ticket: T-20
---

## Goal
native:/root/sources（Astra low）完成T20本地可复跑采样设施及三平台workflow候选。T01已done。先读取真实入口/调用方/既有工具并向Lead简列预计文件/验证，再最小实施。039三文件、037全部Go候选与报告继续冻结，不再修改。

## Inputs
Map23、完整Ticket20/AC163、dev/testing、execution-boundaries、T14的007/009报告与scripts/fixtures/dev-overhaul-startup、scripts/ui-review/run.mjs及030/T19真实ChromeTaskService夹具；原300ms/250ms口径，现有CI工具。复用项目已有Chrome/CDP/host stub/真实API与组件，不复制第二产品或引入依赖。遇真实知识缺口才按research合同调研并保留采用处原始引用，不盲目从零实现。

## Workspace and Scope
current/dev/base86c500556db1d64865c4cc7f1aff1dd83de071fa。唯一写集scripts/perf/**、.github/workflows/perf-sampling.yml、docs/e2e/dev-overhaul/perf/**与本REPORT。生产代码、shared runner/stub、package.json、其他fixture、正式Ticket/Evidence/Map/ledger/main/styles只读。无Git写操作/递归agent/remoteCI/真实Obsidian/Browser或外网产品操作。用户明确暂不运行远程CI；只交workflow候选且不声称三平台已跑。若需要额外路径，先报告并等Lead安排。

## Acceptance
严格落实Ticket可执行合同：small100与large>=10000虚构笔记并有批注/档案/任务/版本历史，固定seed；测量真正生产非Browser activate、真实组件可交互、input事件到符合预期投影后下一帧、task提交到投影、真实查询与scroll下一帧。模块/场景选择与mock边界记录；不能生成数据却不让真实查询/页面读取。heap/longtask缺能力标unavailable理由，不能填0。cold每轮新进程/新fixture，warm同进程预热，再采样；超时记录错误并非成功样本。JSON/CSV逐轮值及p50/p95、环境/源摘要/大小/单位/起止/错误/缺口完整，原预算只作场景标签。
workflow三平台同seed同场景、显式Chromium实际可执行文件检查、不下载/生成HUHU Browser，artifact原值/错误即使失败也保留。不为CI暂缓伪标AC163完成。所有自启浏览器/子进程finally真实join后清理临时目录，不扩大系统清理。
本地执行small5与large20（可能慢，先快速正反例再全样本）；超时故障与重复seed输出稳定性实际检查。不以node --check代替行为、不把happy-dom当帧/像素、不把stub activate当Obsidian真机。避免并行重压机器：T24现在跑Chrome矩阵，先实现/小正反例，正式20轮前与Lead协调独占采样时间。

## Return
固定文件SHA、真实命令/退出/失败历史、计时边界/真实模块消费者/样本表/缺口/本地与三平台未验收区分。最终候选停写，Lead复核；不改正式状态。
