---
schema_version: 2
session: "20261031T062046Z"
task: "040-checkpoint-review"
kind: review
change: 2026-10-31-dev-stabilization-overhaul
ticket: T-05
---

## Goal
native:/root/baseline（Astra low）对T05固定20项做独立高风险双轴审查。你未参与本票实施，作者native:/root/sources；T15须先最终停写交回REPORT。此review不改候选或作者报告。Windows未执行，源码pass不能变成AC284完成。

## Inputs
EvidenceT05#review-input当前SHA256 5c2c9085d209396bf1d53841fb9d42dcb12f9699d31ebedf201a4b99e5533cbb，20项scope+10来源。完整Ticket05（含D01解释）、Spec AC283/284、ADR003、T04/T06已完成实际合同、dev/testing/AGENTS/execution-boundaries、027预检和037报告。先真实逐项哈希及工作树diff核验，不仅复述作者。

## Workspace and Scope
current/dev/base86c500556db1d64865c4cc7f1aff1dd83de071fa；仅写本REPORT。生产/测试/正式Evidence/Ticket/Map/ledger/共享产物全部只读。必要独立探针仅OS临时目录、使用自己拥有的临时Profile/进程，结束真实join再删；禁止Git写入/递归代理/remoteCI/真实Obsidian/Browser。T15候选同时冻结交Lead，不能顺手修T05。

## Acceptance
分别审查standards/specification，完整读真实生产/测试调用链，不用静态命中或旧绿灯替代机制。重点：单写连接准入与所有实际入口、queue32/wake1/timer唯一与busy退避；COMMIT事实不被异步checkpoint/ctx错误反写或自动重跑；FULL六屏障、NORMAL恢复坏连接；portable Commit/Rollback/cancel/error和Store.Close的lease归属；EraseWAL各generation、观察取消、强制清除不能被普通wake/失败吞掉；assistant delete实际canary及旧跨崩溃边界；Close顺序、重复/并发join、错误仍sync/db.close、Core阶段和Profile锁。
D01不是固定硬字节上限：长reader时高水位后新work不再进入，有限在途单笔可以越界但持续请求不继续涨。独立判断实现是否真实满足这一原AC，不以凭空固定H误拒或以软阈值掩盖持续增长。内存assistant清除债务寿命与purge持久义务分开；旧故障不能因报告“已知限制”逃过引入新问题的审查。
测量矩阵仅原语候选模式/阈值，不是production scheduler吞吐或I/O收益。核对计时区间、磁盘分配/恢复子进程真实行为、伪负值/缺测处理、Windows安全触发和artifact；Windows只有crosscompile，无执行证据，指出剩余AC284。核对未修改NORMAL/FULL承诺、T09原基线/数据格式、无第二写连接。T04旧已验收base代码改变由本次重新审查，不要求保留旧文件摘要不变。
按风险选择独立可控测试/probe，Lead全Go当前在跑，不重复全量；不把并行环境时间当性能对照。发现问题要给具体可复现路径/断言/文件行、严重度和最小修复范围，不能自己修正。无发现也给真实检查证据/覆盖限制。

## Return
标准REPORT，明确当前digest/20项/来源核验和实际命令退出；分别含显式<a id="original-standards-output"></a>与<a id="original-specification-output"></a>，Reviewer native:/root/baseline、Axis、Result、Input-SHA256、Observed原始输出。不得以Windows未授权把独立源码review伪标全部done；候选通过与最终AC缺口分开。报告完成停写交Lead。
