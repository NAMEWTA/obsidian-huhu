---
schema_version: 2
session: "20261025T043239Z"
task: "054-note-effects-client"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-07
---

# T07 真实 Obsidian 写适配与反向 HostWrite 客户端

## Goal
实现生产 HostWriteService、单笔记 Vault 写适配和最小可信回执/核查，接入唯一反向 HAP。原 /root/foundation_client，沿实现模型偏好；仅Root实际派遣启动，不再委派。

## Inputs
repo /home/wta/orca/workspaces/obsidian-huhu/bot，HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715；Map14/Goal13/LOG072、T07与原T01 TS协议、原T05来源目标准备维护。AGENTS → Map → dev架构/测试/许可/Obsidian API → T07/I；本票不改变UI。完整读036-note-effect-preflight和045-group-recovery-preflight REPORT，引用其固定官方Obsidian类型/API版本与实际限制，不直接复制其他项目。API/schema由foundation_go唯一owner冻结后只读消费；共享HUHUBOT_RUNTIME_ROOT由T27小窗口提供，未交回时先只做接口准备，不自行造第二根。

## Workspace and Scope
T07自有：src/modules/huhubot/platform/obsidian/note-effects/**、src/modules/huhubot/services/host-write/**、scripts/obsidian-acceptance/huhu-bot-note-effects.mjs。
原T01 TS精确：src/modules/huhubot/core/protocol/connection.ts、connection.test.ts、codec.ts、codec.test.ts、method-validation.ts、method-validation.test.ts。若确需旧desktop/transport/runner.test.ts请Root先登记（不凭原票大范围默许）。
原T05：src/modules/huhubot/platform/obsidian/sources/**，只为可信目标准备/opaque registry窄Port及行为回归，不改变原来源read权限语义。
可写本TASK REPORT/log；api.ts/schema/Go/API/模块激活入口/根依赖/工程/正式状态他人只读，不写sync共享代码。不得提交推送发布。完整源码固定后Root跑全插件build/lint，作者跑适用定向测试/类型/lint/架构并如实记录。

实际产品要求：
- 目标绑定可信Host显式上下文的opaque identity、workspace/origin lease、TFile或create目标的规范路径/目录身份、完整全文baseline hash与工具版本；普通wire不能把任意路径自报成目标。读取preview再hash期间也要检查原TFile身份/path/version。
- update走Vault.process的同步CAS，callback前后检查原TFile/路径、baseline、当前lease/取消与所有相关MarkdownView/editor是否存在未保存变化；不只看最初leaf。任意SOURCE_CHANGED/UNSAVED_EDITOR_CHANGES拒绝实际写并要求新预览，不悄悄覆盖。
- create用Vault.create，只创建确切目标，已存在即拒绝，不自动改名/补目录/多文件写；无删除或移动。
- 小型回执持久记录received先于mutation，completed后于mutation，含原effect/command fingerprint、必要目标定位/hash/结果证据。复用TextStorage/privateVaultStorage和deviceId，在.huhu/huhubot/<safe-device>/host-receipts/<safe-profile>/<safe-effect>.json内，路径安全和记录大小/数量有界；不存正文/CP/密钥。身份验证不能靠普通JSON自称可信；origin/profile/command严格匹配。
- 同effect同payload重复不重写；异payload冲突；只可信原completed receipt标committed，目标后置条件满足仅reconciled，原文未变、超时、kill均不证明没执行。unknown保留核查，不自动重新执行。新Host lease可只读核查旧本机回执，不能用它重派发。
- Vault promise不能真取消，外层timeout/connection关闭后依然保留实际任务quota直到settle；丢响应/迟到完成保留可信回执，但不让旧generation重新发到新连接或改新Run状态。
- 045确认当前TS非read Abort和Go reverseCall取消会关闭共用连接。和原Go owner共同实现单请求有界取消/迟到响应关联；取消一个child不能影响sibling/其他root，严格限制pending/tombstone/队列字节与错误类型。真正EOF/失联仍统一有界关闭，不能静默丢帧或无限忽略未知id。
- HostWriteService注册真实HAP handler并校验参数/lease/signal/能力，在生产客户端可调用；dispose解绑/停止新任务，不假设立即终止已有Vault操作。当前普通reader页卸载仍不取消Run。

验收探针经公开API提交批准/拒绝、真实Vault adapter调用路径，为用户未来一次性Obsidian操作提供入口；本轮可控Vault API对象的自动化检查与真实TS↔Go生产HostWriteService链作为代码验收，不伪造现场运行。已有source对象替换、UTF16/UTF8预算和授权清理回归保持。

## Acceptance
有意义的公共链测试覆盖update/create、源变、多个编辑器未保存、TFile同路径替换、重复/冲突、receipt前后写失败、实际写后回执丢失/重开核查、超时quota/迟到结果以及两个并行任务取消隔离。真实MD/Obsidian对象替身边界明确；真实模型/Obsidian/目标OS用户后验。消费者实际跑过，不以Port/stub/探针文件存在证明实现；最终固定输入交Root E2E和独立双轴审查。

## Return
REPORT首个h2前Session: 20261025T043239Z、Task: 054-note-effects-client、Status: completed；h2聚焦交接、产物与验证、问题与下一步。列准确自有文件SHA、合同输入、真实命令exit、未运行边界，所有Node/Go child退出Wait/停写；return0后真实MESSAGE/FINAL，Root全读核验。新增路径或共享合同缺口先向Root/原owner精确请求。


## Root 实际交接补充
LOG072 的双轴复审已真实接纳，Map14/Goal13/LOG073 是当前窗口，HEAD/base 未变。057 已真实 MESSAGE/FINAL 交回，Root 全文回读和 4 产物核验，接纳见 evidence/notes-collaboration-contract-prep.md；056 同样已真实交回，最终 REPORT SHA f5a02bb40d40169dc858a98138af186efb0ef9d46c796608716620256c89047a、11 产物核验，见 evidence/data-maintenance-preflight.md。两份研究矩阵均未运行，不冒称代码验收。
迁移默认采用独立完整 HUHUCP1 副本和最后清单，放在 live checkpoints 外；base 通过内部 adapter 阶段与 bootstrap 组合，避免反向 import effects。原凭证 guard 的测试仅 053 自有 delegation 测试，不扩 052 原 assistant 测试。取消协议须覆盖响应先于取消、取消先于响应、非常迟到的真实 Vault promise；正常单请求取消不得破坏兄弟任务连接。

051 已真实交回并由 Root 接纳，见 evidence/host-receipt-root.md。共享常量文件 SHA 26b94019ddf6bd8b270ba5b0cf7c9445de60f300bc33d2e0ee734e50de7c2e8c，可直接只读消费；5 路径 writer 已停止，T27 不完成。本阶段原模型偏好 gpt-6.1-sol/xhigh，四槽位中你与 052/053 并行、Root 编排。先与 052 冻结唯一 Host DTO/取消合同，未冻结前可做自有 Vault adapter 与回执行为测试。
