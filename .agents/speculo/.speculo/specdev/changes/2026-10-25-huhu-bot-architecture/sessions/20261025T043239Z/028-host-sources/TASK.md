---
schema_version: 2
session: "20261025T043239Z"
task: "028-host-sources"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-05
---

# T-05 明确视图来源捕获与Host读取

## Goal
实现T05 TS真实Obsidian adapter与平台无关host-read编排，用户明确捕获的资料/视图/修订固定后不随窗口焦点变化。提供用户后验所需宿主探针；本轮运行代码自动化，不执行用户实际库验收。

## Inputs
工作区 /home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，初始base33c21e098ef3188cbab5a09f3e0a01fadb787715。用户LOG-047/050/051授权完整28票代码与Agent Team，本轮代码层验收，真实模型/Obsidian/目标OS操作留user-owned；不得索密钥或重复实施批准。先读当前Map→dev/architecture/testing/licensing→当前Ticket→相关Spec/ARCH/ADR及I implementation-procedure/execution-preflight/TDD/风险参考。当前Map10/Goal9，LOG060依赖门已关闭，产品r2由033两轴pass，工程slice3由030两轴pass，Root当前全部校验0（evidence/T-02-logs/code-gate-r2.json）。本TASK仍以真实Lead followup_task为启动信号。依赖证据在evidence/T-01.md/T-02.md，实际当前快照以派遣消息为准；不能拿旧r3冒称新共享代码已通过。另完整回读031-chat-access-preflight/REPORT.md；参考evidence/chat-access-preflight.md与IMPLEMENTATION-REFERENCES.md固定来源/近两年活动/许可/采用差异；陌生点先查官方源码与维护/许可，必要时最小探针，不复制不明代码。

## Workspace and Scope
唯一写集src/modules/huhubot/platform/obsidian/sources/**、services/host-read/**、scripts/obsidian-acceptance/huhu-bot-sources.mjs及本TASK报告/日志。TS api.ts/Go/HAP schema只读，请求026 foundation_go维护；private credential/transport除非root另开原owner维护窗口否则不写。031确认现有connection只支持effect/receipt，不能靠host-read目录完成读取路由。LOG061/Map9已给本原TS协议owner追加connection.ts、connection.test.ts、method-validation.ts、method-validation.test.ts和platform/desktop/transport/runner.test.ts的明确维护窗口；仅为read/search真实路由/严格验证/闭合取消最小修改，不动凭证client。其他transport文件仍只读。028与027定义Host source/read/search结果及严格验证，既有可信连接是唯一Host入口；使用具体read/search回执，禁止HostReceipt塞正文。

复用现有Vault API和Obsidian View事实，不能直接把src/host/obsidian/references.ts fallback选择当安全捕获。明确origin leaf/view/selection与当时正文；异步读取时不再看全局activeView。资源ID/修订/hash由可信adapter产生，HAP传的是DTO不带App/DOM/SQL/绝对路径授权。Vault正常笔记和用户明确选择资料由Vault API读；对隐含全库、父目录、URL等未授权范围拒绝，不向模型透出多余上下文。读取未保存选择的内容应精确对应捕获视图，不悄悄换磁盘旧内容；与T07写前未保存冲突检查分责。

Host能力/lease/workspace/origin变化和撤权使旧缓存/读取资格失效，每个read/search响应仍检查请求scope与绑定快照。有界异步任务、取消和模块关闭释放；错误/日志不含私有正文。只读来源打开提示修订变化的需要由公共结果类型表达，UI正式消费留T21/22，不提前建页面/注册模块。宿主probe沿fresh-vault既有入口，测试数据用固定哨兵，不修改用户库。

## Acceptance
有效附加两笔记/选区、切换窗口仍同来源，过期/替换lease、未知/伪造资源、未授权搜索、错误profile/workspace与Host断开均拒绝；实际业务调用链读取次数/模型捕获器证明第三份无读取无外发。真实Go↔TS协议夹具配合027，TS代码/测试类型、定向lint/架构和相关Vitest通过。Obsidian API行为用适当单元替身核验代码、宿主probe静态/fixture检查，不冒称真实宿主/窗口已执行。根build/lint由root/T27在freeze后执行。

## Return
不要改正式Ticket/Map/Goal/Evidence、别人的TASK/REPORT、根package/lock/build/notices/current文档；不提交/推送/发布/归档，不再委派。仅写准确生产/测试写集与本TASK的REPORT/原始日志/快照。REPORT首个h2前保留Session: 20261025T043239Z、Task: 028-host-sources、Status: completed；h2为聚焦交接、产物与验证、问题与下一步。报告源码路径/hash、实际红绿/命令exit/观察/故障恢复/依赖变更、未运行项与剩余接缝；completed只是候选交回，不自行done。最后validate-dispatch --stage return，确认所有测试子进程退出、production writer停写，再通知root。超出写集先提交精确路径和理由，由Lead处理，不能另造API/表/进程绕过owner。

## 当前依赖接纳与协作顺序

LOG060接纳产品r2 SHA886b568a11a1cbe8209412e02b1ee00bcf09b68cdbc2dc5c50f0c8a75b21387b与工程slice3 SHA29f9eedca116923c1ceb15a7855944ae9fa4bc3c0a221b63414996e5b35c9a18；原候选完整保存，LOG061为新维护阶段。026唯一共享Go/API/schema/注册writer；027/028先与026交换精确字段/方法请求，冻结后再写依赖新DTO的消费者，独立研究/纯策略和本任务测试准备可并行。不可重新运行历史默认dbus --session探针，不访问真实keyring/Vault/模型；若确需T02回归仅使用当前禁止service activation的安全fixture。每个测试进程退出并Wait后再交回；不机械重跑未变检查。

## LOG062精确维护追加（Map10 / Goal9）

Root实际读回method-validation.ts：MAX_METHOD_VALIDATORS=122并要求definitions.size相等。026冻结新增方法schema后，由028原T01 TS owner仅同步该固定总数（当前预期126，最终以冻结schema为准）及对应测试断言，不更改Ajv选项、输入变换或schema严格性。此路径已写入T01/T05共享owner合同；其他scope不变。
