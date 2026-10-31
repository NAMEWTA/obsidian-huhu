# 跨模块契约与相邻 Issue

所有名称为能力语义，不冒称当前 public API 已有某个方法。T-02 在真实 checkout 枚举消费者与贡献点；缺能力由所属模块 api.ts 最小扩展。Bot 不复制 CRUD、scheduler、browser session 或 secret store。

| Owner / 接入 | Bot 持有 | 调用前与结果约束 | 失败与验收 |
|---|---|---|---|
| Notes/选区/文件夹 | SourceRef、范围、目标/diff、revision | 宿主 public API；dirty editor 由 owner 判断；receipt 带实体/版本 | 冲突保留草稿重新预览；A09–A11 |
| Task/Todo | 查询范围、新建/更新意图 | 真 Task ID 与 receipt；RunPlan 不自动成为 Todo | 重复 command/部分成功核对；样例 A |
| Archives | 记录/字段授权引用 | 只返回允许字段，来源可回链 | 禁止模型全文检索逃逸；A08/A20 |
| Browser #38 | space/page/access scope/operation intent | 同一人工 Space/Page；实例/页面 generation、导航变更后重验 | 页面关闭/导航/权限撤销；提交审批；样例 B |
| Automations | occurrenceId、action payload、关联 rootRunId | existing scheduler 唯一 owner；唯一幂等映射 | 重复投递只一个逻辑工作；过期/错过策略归 automation；样例 D |
| Notifications | 安全摘要、run/原自动化跳转 | 现有通道，失败不否定已发生效果 | 独立通知 outbox；不重跑整个工作以补通知 |
| Safe/credentials | 受保护引用，不是明文 secret | 宿主代执行批准动作；禁止默认 model-facing secret read | 保护不可用则 session-memory 或阻断，显式提示 |

## Browser 接口冻结门

#38 尚不能因 mock 通过而被视为交付。T-18 启动真实集成前需要：已冻结 public API/revision；Space/session/Page identity；授权/撤销；动作可观测与 effect receipt；人工登录后 Bot 同 Page 操作的宿主证据；导航/关闭/崩溃恢复语义。此包不写 Browser 实现，不要求 #38 保留旧 Native Browser。

外部页面内容不能把自己的脚本当 host 指令。读取/填写/提交区分风险；同 Page 不等于任意 JS/CDP 超级工具。提交之前展示 target/domain/action/scope；重复或未知提交需 owner 核查，不能再点一次当“修复”。

## Automation 时间与离线

复用已有 occurrence identity、时区与 missed/catch-up policy。Bot 不另写 cron，不把 CLI agent runtime 代称 Bot。Obsidian 关闭期间不执行；再打开时由已有 scheduler 决定补偿，Bot 仅幂等受理，UI 清楚标出 skipped/deferred/received。通知链接回同 occurrence 与 rootRun，重复 notice 重投递不重复业务效果。

## Issue 协调

#9 的身份/隔离/委派/消息回执/画布/取消需求承接，技术前提被 #39 替代；#36 的个人 Agent 交付目标保留，Go增量路线不先实现一遍；#37 拥有全局设计/生命周期/基础门禁，其非Bot修复不迁进本 change；#38 拥有 Browser，Bot只消费能力。

本轮未关闭、重打标签或修改这些 Issue；本 PR 使用 Refs #39。实施 PR 按真实覆盖与证据再协调归属，不能一个 Epic 用“依赖”二字吞掉另一 Epic 的未完成工作。
