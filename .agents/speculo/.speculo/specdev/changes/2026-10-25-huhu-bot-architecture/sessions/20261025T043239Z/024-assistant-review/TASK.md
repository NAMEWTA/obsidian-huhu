---
schema_version: 2
session: "20261025T043239Z"
task: "024-assistant-review"
kind: review
change: 2026-10-25-huhu-bot-architecture
ticket: T-02
---

# T01维护与T02完整代码独立双轴审查

## Goal
在同一冻结输入上独立判断标准轴与规范轴，覆盖T02完整实际交付及T01共享合同/迁移/transport维护。未收到root明确冻结输入和摘要前不启动review；提前TASK不代表dispatch。

## Inputs
工作区/home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，base33c21e098ef3188cbab5a09f3e0a01fadb787715，Map8/Goal7。先按AGENTS发现/当前Map/适用dev和architecture/testing/licensing/build-and-release，再读当前T01/T02/T27原票对应范围、Spec/ARCH/ADR及LOG051代码验收边界。实际已授权完整实现/独立审查，不提交发布。019/020/021/029完整REPORT及018/023原两轴回读；未知接口不得猜成通过。按common/skills/code-review入口及source-discovery、working-tree-review、Fowler、risk-review、reviewer-contracts、review-evidence、result-reuse执行；真实模型偏好gpt-6-astra/high，身份由root工具核验。

## Workspace and Scope
只读所有生产/测试/规范和git；仅可写本TASK REPORT与原始probe日志，临时独立探针在临时目录。唯一输入为evidence/T-02.md#review-input-r1及root派遣给出的实际SHA；范围含native/huhubot、contracts/hap/v0.1、src/modules/huhubot与相关root依赖/ModuleId事实。root协调T27工程文件另属独立范围，不能用未审阅作者结果批准T27。原008/014失败与018pass仅在逐项源码/输入摘要相同后复用；T02所有新代码和T01真实变化须审查，不只读最后修复。作者为native:/root、foundation_go、credential_provider、foundation_client和共享工程接缝build_integration；reviewer不得参与这些实现。

## Acceptance
标准轴覆盖权限/秘密/并发/恢复/资源/正确性/边界/实际测试及适用Fowler维护性；规范轴独立对照T02 AC002/003/004/042、T01维护AC034/035/044/054、Spec身份/模型/原子合同/数据/生命周期和LOG051。重点真实private pipe/worker命令入口、Windows CRT表和句柄回收、mac security先验校验与kill/wait、Linux/Win同步keyring隔离，以及019/029新增独立worker进程3s硬退出（父进程已死亡或半帧stdin时不依赖context取消），错误/日志/DB/receipt中无secret，protected未知结果不伪失败/不自动重放、session-memory退出失效、跨Profile/refs保护；CRUD/default once/CAS/同key冲突、配置pin/delete/epoch/旧receipt、备份迁移失败/不兼容/坏库、usage实际消费者与unassembled边界、模型probe零资料及未装配不可用。用独立最小生产反例验证高风险分支，不把作者测试或存在某函数当证据。按影响复用018未变观察，真实当前TS→Go/SQLite适当回归；真实模型/Obsidian/用户keyring不跑、不作为代码门阻塞。

## Return
不得改正式Ticket/Map/Goal/Evidence、他人报告/任务、提交/推送/发布或再委派。REPORT首个h2前Session: 20261025T043239Z、Task: 024-assistant-review、Status: completed；h2聚焦交接、产物与验证、问题与下一步。两轴分别有显式standards-output/specification-output锚点与Reviewer/Axis/Result/Input-SHA256/Observed字段，保留所有可证实finding及路径行号/触发/影响/最小修复；不把结构校验等同独立通过，不自改生产实现。 所有probe子进程退出、writer停写且末次输入核验一致后交回；validate-dispatch return0，真实工具消息通知root。
