---
schema_version: 2
session: "20261025T043239Z"
task: "076-recovery-client-seams"
kind: research
change: 2026-10-25-huhu-bot-architecture
ticket: T-16
---

# 当前群客户端之后的恢复与关闭消费者接缝（只读准备）

## Goal
原 /root/foundation_client 在已真实交回075后，依据当前已冻结TS消费者、066既有研究和原T16票，给下一窗口补一份精确的TS恢复/生命周期消费者清单。只是只读准备，不启动T16实施、不改变正式状态，不写生产/测试、不重新运行075检查。沿原实现模型偏好，不再委派。

## Inputs
repo /home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715。AGENTS发现、dev相关架构/测试、Map18/Goal17和T16原票；完整读066-recovery-current-seams REPORT及interfaces-and-owners、075自身最终REPORT、当前唯一API/managed/EventClient/GroupClient。075已由Root全读接纳切片，回执evidence/075-lead-return.json；T13 Go仍073/074实施，所以原生API/实现只记带SHA的观察，不假装最终冻结。LOG051真实操作用户后验保持，不索凭证。

## Workspace and Scope
允许写本TASK目录的REPORT.md和只读观察JSON/说明，或外部/tmp准备文件。所有生产、永久测试、协议、正式Evidence/Map、旧报告只读。不启动Go/Node产品或测试、构建、网络请求、Provider/keyring/Obsidian。无提交推送发布。076不是独立代码审查，不能宣布T13/T16通过。不要把其它作者仍修改的Go快照当最终权威。

## Acceptance
只回答下一T16窗口真正需要的接缝：当前runs.resume预留DTO/能力协商/错误如何进入真实BotClient；GroupClient/EventClient怎样处理Run.revision/资格与当前Group增长及断线/重连；手动继续同Run的幂等/CAS和事件投影需要哪些当前owner维护；DesktopHapTransport.close/exited/forced kill、managed EOF与连接EOF如何分开，哪些责任属于T01窄维护、哪些完整模块关闭属于未来T20。把现有行为、可达缺口、待Go合同决定分开，提出最小路径/owner请求与合适可证伪自动化窗口，不写虚构接口或另一执行器。

特别区分：连接断开不等于用户取消；关闭请求成功不等于producer排空；资格判断不得由UI猜测；source/group权限变化的旧缓存不能随resume复活；新Run.revision不能无依据删除旧贡献tuple；同Run用户恢复不得自动换command identity或对uncertain请求静默新发。当前事件/transport有可靠界限时复用，不为形式新增关闭框架。066八组风险矩阵只是起点，重点填当前TS事实，不重复全项目研究。

交付一份短而可实施的interfaces-and-owners.md，精确文件/函数/行号/SHA、实际输入出口和建议测试边界；与075稳定9文件差异必须为空。没有运行测试就写not-run，不把静态观察写成验证pass。

## Return
REPORT写本TASK目录，首h2前Session/Task/Status准确，三至五句聚焦交接，附观察清单、实际只读命令、未验证项和下一步。完整回读后运行共享validate-dispatch --stage return，实际MESSAGE+FINAL交回；报告后停写。不请求用户批准已授权只读准备；不能因本准备开启T16生产窗口。
