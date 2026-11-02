---
schema_version: 2
session: "20261025T043239Z"
task: "016-foundation-unicode-repair"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-01
---

# T-01 第二轮独立审查修复

## Goal
修复014 STD/SPEC-R2-02：四个普通方法文本字段与唯一schema的Unicode codepoint maxLength128一致；wire ID/method UTF8 byte128不变。

## Inputs
工作区/home/wta/orca/workspaces/obsidian-huhu/bot、base33c21e098ef3188cbab5a09f3e0a01fadb787715。复用已读当前dev/T-01及references，Map8仅新增T02未来测试路径。完整读014 REPORT和raw-probes对应反例；原008四项已独立通过，不重复重写。原用户LOG-051要求完整代码层交付，仍使用既有requested gpt-6.1-sol/xhigh实现身份。

## Workspace and Scope
唯一Go owner：internal/adapters/inbound/hap/router.go、internal/application/api/service.go及native/huhubot/tests/contract/foundation下本问题回归。不得改API/schema/generator/fixture/locks、TS或根工程；当前公开schema已定义字符限制，应让Go用相同Unicode计数。先等待root明确015工程审查结束/释放native源码冻结，然后才能写。与017 TS owner协调真实TS→Go边界验证，双方不重叠文件。

## Acceptance
先保存四字段真实ASCII/中文/补充平面字符边界红灯，再最小修复并绿；Unicode128通过129拒绝，ASCII边界一致；含len(rule)的wire ID/method仍按UTF8字节拒绝超限。通过真实router/application及同一schema，而非仅测计数函数。定向回归+完整foundation、go vet，架构检查；无并发改动不机械重复race。无新依赖，不重算许可；后续dist由T27更新。

## Return
仅写所属生产/测试文件及本任务REPORT/原始红绿日志/源码hash，不改正式Ticket/Map/Evidence/其他TASK。REPORT首个h2前Session: 20261025T043239Z、Task: 016-foundation-unicode-repair、Status: completed；三标题聚焦交接、产物与验证、问题与下一步。列实际命令/exit/测试观察与未验证项，completed只是候选返回。最终return校验、停止所有writer/子进程并报冻结。不要再派遣，不提交/推送/发布；真实用户模型/Obsidian/OS操作留user-owned。
