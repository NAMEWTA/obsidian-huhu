---
schema_version: 2
session: "20261025T043239Z"
task: "034-events-approval-preflight"
kind: research
change: 2026-10-25-huhu-bot-architecture
ticket: T-06
---

# T04/T06 持久事件、审批和引擎Checkpoint接缝只读预检

## Goal
在T03/T05候选验证和独立审查期间，为下一合法frontier提供最小实际接口与原owner维护请求。只读研究，不实施T04/T06，不把候选源码当已接纳依赖。仅在Root真实followup_task后启动。

## Inputs
项目/home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，base/HEAD33c21e098ef3188cbab5a09f3e0a01fadb787715，当前Map10/Goal9。用户LOG047/051已授权完整28票代码与Agent Team；代码层验收，真实模型/Obsidian/目标OS由用户后验。按AGENTS发现→Map/dev适用参考→T04/T06→相关Spec/ARCH/ADR读取；不展开其余全部票。先回读evidence/events-approval-preflight.md、evidence/engine-port-preflight.md及IMPLEMENTATION-REFERENCES固定REF01/02/04。现T03/T05源码已由026/027/028通知候选停写，最终检查/报告尚在收尾；任何后续修复不由本任务接管。

## Workspace and Scope
全部生产/测试/API/schema/锁/工程文件、正式Ticket/Map/Goal/Evidence、他人TASK/REPORT只读。仅写本TASK REPORT和原始观察日志。确有必要的离线最小探针仅外部临时目录，不安装新依赖，不访问真实模型/Vault/keyring，不运行历史默认dbus --session夹具，无提交/推送/发布/归档/再委派。

核对当前sqlite/execution的事件写入口、003/005版本3/4、ContextAccess与effective来源、RunExecutor状态/终结/扫描、同库pin/Usage、HAP framing与runs.subscribe现有声明。给T04事件补读/一致快照/持续撤权/有界等待方案的精确最小共享文件请求；比较可行实现但不锁定新产品取舍，不新建平行事件权威。T04如确需迁移正文，列必要字段及为什么既有表不足；不能改已接纳003。

T06重点核对未来实际Eino adapter如何在第一份写工具意图关闭Run后续效果准入、取得可恢复CP、先完成不可变Blob再同事务公布Run/Effect/Approval/event。只读官方固定源码验证CP接口与暂停/恢复时序，记录精确文件/commit/许可/采用差异；不以SDK自带CP宣称业务事务已完成，不把SDK对象/CP bytes泄到HAP。给HUHU纯Port和Broker/Blob最小形状与owner申请，SqlTx留在adapter间，模型/文件/人工等待不进DB事务。批准/取消/过期CAS与dispatch重新校验的最低故障用例清单明确；T07真实Vault效果与T08模型adapter仍不提前实施。

计划并行候选是T04 Go/TS与T06 Go，唯一共享Go/API/schema/注册仍原foundation_go，TS连接仍原foundation_client，T05权限仍原credential_provider；本任务只提精确维护路径，不授予写权。相同数据库测试使用独立一次性Profile，注册和全局构建窗口串行。

## Acceptance
结果可供Root在已通过上游代码门后更新原Ticket/Map并派遣；清楚区分当前实际源码事实、候选设计、未来实施与未验证项。覆盖CP文件写完前退出、Blob发布后DB失败、双工具同响应、批准与取消竞争、快照/尾读交界、撤权后队列/客户端投影清理；不复制旧基础用例或扩大到全产品实现。

## Return
REPORT首个h2前保留Session: 20261025T043239Z、Task: 034-events-approval-preflight、Status: completed；h2聚焦交接、产物与验证、问题与下一步。列实际路径/行/源摘要、精确owner请求、官方引用及必要顺序。执行validate-dispatch --stage return；全部探针已退出、所有报告写入停止后原生消息交Root。completed仅研究交回，不是T04/T06 done。
