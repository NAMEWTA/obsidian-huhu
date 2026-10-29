---
schema_version: 2
session: "20261026T045732Z"
task: "018-t09-pane-identity-preparation"
kind: "preparation"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-09"
---

## Goal

沿现有Sol/xhigh身份作只读工程准备，解决T09稳定Pane身份在旧布局、只读查询与写入租约之间的最小正确落点。Root继续执行T08恢复；不解锁T09实现、不递归派遣、不问用户工程细节。本任务不是独立review或完成验收。

## Inputs

项目 /home/wta/orca/workspaces/obsidian-huhu/terminal，change .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor。用户完整Goal/Team授权沿用；先回读当前Map→dev→T09→Goal、spec相关§3.1/3.3/3.5与现有012/013准备REPORT。可读Root临时工程草稿 /tmp/huhu-t09-root-engineering-draft.md，但它不是已批准API或必选实现。

012原报告 sessions/20261026T045732Z/012-t09-protocol-preparation/REPORT.md SHA c6d87003fab9d7c824ae913ac00e5c2364a6452ccd3a61d4ac0b6550f35c3408；013原报告同session/013-t09-ui-preparation/REPORT.md SHA083ebd64199d22942dfa7fc57ef84c46813323c88c72656f69a989498083f2ce。Root已读真实研究/源，combined /tmp/huhu-t09-preparation-root-audit.json SHAec26fa7eb1bbde94a6405656794b71e0f45d5198cf4230256e9920cf2f86239c。

当前关键事实：ResumeInfo没有paneId；normalizeWorkspace纯同步，并在WorkspaceStore/adopt按选中Space规范化；SpaceService.load仅read并不取得writer，getControlScope也明确readOnly；mutate才取得原writer/持久化。不能让pane.list生成随机ID或隐式写盘，也不能为query强制全库取得租约。新Pane独立稳定身份应沿原布局owner，不新建Pane数据库。closedTabs重新打开不能恢复已关闭Pane旧ID；reorder/resize/Space切换不能换ID。显式重复有效ID必须准确歧义，不能任意挑选。

## Workspace and Scope

所有仓库产品与正式SpecDev工件只读，唯一可写是本018 REPORT以及新/tmp/huhu-t09-pane-identity-*准备脚本/原件。不要改Root草稿或旧012/013材料。T08有另一writer仅改原native七路径；本任务读取T09涉及的core/workspace、workspace-store、SpaceService/records/layout-merge、WorkspaceService/controller及实际control消费者即可，记录自己真实读取输入的前后SHA，不宣称整库冻结。

## Acceptance

对比并给出一种推荐的最小方案：新Pane UUID元数据、旧布局身份准入、无需查询写入的稳定兼容身份或明确原owner启动准入等。必须解释具体身份在load→normalize→readOnly list→first mutation→flush/merge→reload→close/reopen的事实；若计划中的“load后写入再公布”与现有readOnly/租约合同冲突，直接指出并修订建议，不能只把难题留给实现者。

建议无需凭空强加UUID格式；canonical paneId目前有界字符串，独立opaque身份与稳定寻址是目标。不能用当前焦点/cwd/排列序号猜身份，不能把Session身份当Pane身份；若有确定性兼容ID，证明其材料来自持久的原叶身份、跨Space唯一边界、长度/碰撞/恶意或坏数据处理，关闭后新建/恢复必须新ID。可用tmp脚本调用实际现有纯逻辑/存储接缝作只读实验，保存真实源码闭包与命令，不复制生产实现去证明自己。

输出精确最小必要路径和唯一owner/API阶段建议；特别明确未选中Space的CLI修改如何与当前草稿dirty/merge和UI共享同一布局owner，避免新旁路writer。附最能击穿错误方案的测试矩阵及影响T09现有Ticket写集的缺项。复用已有外部研究，不无故下载依赖或触真实Vault/Provider，不提前写T09代码。

## Return

原子写本018 REPORT，精确Session/Task/Status与“聚焦交接”“产物与验证”“问题与下一步”。保全实际输入SHA、命令/raw及限制，明确准备建议不是已实施结果。跑return结构检查再通知Root，产品始终READ ONLY。
