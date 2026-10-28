---
schema_version: 2
session: "20261025T043239Z"
task: "074-groups-domain"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-13
---

# 群受理、成员代与实际投递授权

## Goal
原 /root/credential_provider 完成T13业务与原T04 Go/T05/T11/T12消费者。仅Root在072实际通过、Map17/Goal16维护后原生派遣才启动；准备文件不授权开工。沿gpt-6.1-sol/xhigh偏好，不再委派。

## Inputs
repo /home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715。AGENTS发现→Map17/Goal16→dev适用参考→T13/原维护票/I。完整读060 REPORT/接口附件和Root接纳；最终漂移源回读当前代码。Spec/ARCH/ADR权威；研究场景未实跑。LOG051真实操作user-owned/not-run。

## Workspace and Scope
T13新domain/conversation/group/**、application/conversation/group/**、sqlite/groups/**、migrations/013-groups.sql、tests/contract/groups/**。原T04 Go application/execution/events/**、sqlite/events/**、tests/contract/events/**；原T05 application/access/{context,grants}/**、sqlite/grants/**、tests/contract/access/**；原T11 application/collaboration/delegate/**、sqlite/collaboration/**、tests/contract/delegation/**；原T12 application/collaboration/{messages,scheduler,finalize}/**、application/execution/usage/**、sqlite/usage/**、tests/contract/collaboration-policy/**。以上在native/huhubot内，正式Ticket精确写集为准。只写自有REPORT/log；API/schema/Go执行器/配置pin/registry由foundation_go，TS由foundation_client。旧SQL/凭证/T06/T07/产物/规范正式状态只读，不提交推送发布。

先冻结真实事务/Port合同，013仅你写正文，T01唯一注册并保持升级兼容。明确可信user-batch与model-delegation边：用户@B/C不走假A claim/allowlist或继承A Grant；各目标精准Recipient和来源授权全部同Tx通过才受理。根为用户意图/Session占用/树预算，所有子任务和再委派沿同一Executor/限额/账本；无@仍只有真实A模型。失配一个目标零新Run/消息/receipt/模型。当前子取消结构化Outcome、嵌套partial、Reply用户等待和来源完整链保持。

保留068/069持久Delegation输入合同：实际群子任务受理事实与EngineInput要求要一致，不能只建execution_runs/task_config而遗漏Claim必读关系；编排根通过显式角色区分，原模型委派和合法CP续跑的要求不得丢失。与073先冻结这一最小关系后再实现。

持久groupId/sessionId、member incarnation与history authorization version绑定到根/所有派生任务；remove/rejoin新incarnation不能复活旧工作。临时执行仍不是持久群成员，须沿真实发起成员/祖先的授权链继承群绑定并执行撤销检查，不能靠要求temporary身份出现在成员表来禁用既有临时再委派。来源为空也必须查成员资格。Context历史组装、实际Attempt.Dispatch、公共结果事务、History/Snapshot/Tail查询与physical writer fence分别重验；复用现有fence→短Tx顺序，不能在检查后排队时泄露已撤权正文。公共已合法发布历史与尚未发布结果区分，用户可读历史不能被一概误删。

公共publisher与父模型结果交付分工，稳定child result ID去重，MessageInTx分配持久公共seq；不能按goroutine到达或childID排序冒充权威，也不强迫A多一次model汇总。新成员明确none或同群有界历史，边界绑定真实messageId/seq；不包含Bot私聊/工作线程/私有记忆。成员移除在同fence与短Tx内先关准入、选择仅本群旧incarnation绑定子树并复用CancelSubtreeInTx，提交后取消真实执行；已dispatch unknown、审批和CP按原合同收尾，另群/私聊同Bot不受影响。完整用户恢复仍T16，不能让T13依赖T16形成循环。协调者只能无活动根CAS更新，waiting/blocked/interrupted仍忙。

## Acceptance
真实公开API＋SQLite＋同Executor，覆盖A无模型而显式B/C合法、只有B/C来源Grant、A模型allowlist不限制用户显式目标、缺一目标零整批受理；默认A、有效/无效mentions、幂等/busy。覆盖source-free排队出帧前移除、模型Dispatch前移除、结果发布前移除、rejoin旧工作、另树继续、公共seq与有界history、新成员范围、coordinator CAS。保留旧100/800来源250ms和snapshot provenance，新增成员查验不引入N+1权限旁路；重检查与073/Root串行，所有进程Wait。Root另做固定输入E2E/独立审查。

## Return
真实REPORT首h2前Session/Task/Status，完整自有SHA与共享合同、实际原始命令/exit/红绿/未运行边界；return0后原生MESSAGE+FINAL，停写且自有进程Wait。不能把研究矩阵、fixture存在或独立Port当实际消费者通过。
