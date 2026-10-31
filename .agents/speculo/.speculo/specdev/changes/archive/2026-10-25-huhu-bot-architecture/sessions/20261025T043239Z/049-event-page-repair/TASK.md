---
schema_version: 2
session: "20261025T043239Z"
task: "049-event-page-repair"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-04
---

# 046 合法最大文本事件的有界客户端恢复修复

## Goal
修复合法单事件因完整JSON预算超客户端固定64KiB页而永久卡住。原 /root/foundation_client；仅Root实际派遣启动，沿实现模型偏好，不再委派，不进入T07。

## Inputs
repo /home/wta/orca/workspaces/obsidian-huhu/bot；HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715，Map13/Goal12与T04原合同。沿已读AGENTS/dev/I，完整读046-events-approval-review最终REPORT和真实TS↔Go65536-byte text.delta反例、65000对照及maxBytes524288合法直读对照。原固定输入T06#review-input-r1 SHA a129b2b03c62625b541392a92321f9cf16d74383d2de85dbd3c3b44f92339371。Root实际接纳失败后开写，模板自身不是启动。

## Workspace and Scope
唯一可写：src/modules/huhubot/services/events/event-client.ts、event-client.test.ts、runner.test.ts；本TASK REPORT/log。Go tests/contract/events/ts_test.go由048原Go owner唯一维护，向其给精确回归向量。API/schema/reducer/codec/connection、Go生产、锁/根构建/正式状态冻结；确需其它文件先Root精确登记，不靠放宽validator/reducer限制修复。

先原封真实链红灯，再实现有界恢复。既有协议maxBytes可到512KiB；可在既有许可内有限请求更大页或准确响应EVENT_PAGE_TOO_SMALL，具体方案简报Root。不能扩文本/frame/投影总预算、吞掉单个事件、跳seq、把失败当terminal或无限刷新循环。单Run单在途/readonly取消、当前client/generation/lease fence、撤权/expiry清正文、sameRun独立BigInt/immutable selector、detach不cancelRun均保留。

测试覆盖65536正常文本和JSON转义放大（控制字符/引号等）的合法事件、之后状态/正文/seq完整；既有上界仍不能容纳或其他RESOURCE_LIMIT时明确暂停错误；大页请求前后撤权、取消、dispose、client/lease更换不能让旧响应复活。请求尝试次数和大小有界，失败不重复查询无进展。生产TS↔Go子进程必须复现原条件，不能只mock页错误证明成功；与048协调其唯一Go测试写集。

轻量定向TS检查可执行；涉及真实Go/大套件先和Root/048协调，避免污染250ms性能窗口。最终停写后Root统一全插件build/lint/Lead回放与050独立复审。

## Acceptance
原Run succeeded/head5时EventClient不再停seq3/running，65536及转义边界真实链到正确终态/seq/完整正文，65000对照保留；合法预算不扩大、真正超量显错、生命周期/授权错误清理正确。永久单元/真实消费者测试、相关tsc/lint/架构记录实际命令exit，不宣称真实模型或Obsidian现场通过。

## Return
REPORT首个h2前Session: 20261025T043239Z、Task: 049-event-page-repair、Status: completed；h2聚焦交接、产物与验证、问题与下一步。精确文件/hash、原反例红→绿与最终检查、复用和未验边界；全部子进程Wait/停写，return0后真实MESSAGE/FINAL，Root全读后接纳。不改正式状态、不提交推送发布。


## Root方案回读补充

已实际收到作者方案：默认64KiB，只有精确EVENT_PAGE_TOO_SMALL在同cursor/signal/generation下最多补一次已有512KiB上限请求。Root同意此有界方向；“不重复无进展”约束自动恢复循环，不额外禁止用户显式refresh。最大页仍失败时暂停自动轮询并显式错误，显式refresh每次仍有界；服务端后续压缩/状态变化可能恢复可读。记住的页预算随client/profile/lease代数重置，任何旧响应与授权变化均受原fence控制。此为已授权修复内的实现澄清，不改变外部预算。
