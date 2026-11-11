---
schema_version: 2
session: "20261025T043239Z"
task: "021-assistant-client"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-02
---

# T-02 完整代码实现切片

## Goal
负责TS凭证专用客户端、Bot/model应用客户端与原T01 desktop transport的受控接纳。仅在Lead放行T01、019共享API及020私有协议冻结后写依赖实现；可先读现有接缝，不把当前没有真实模型作为阻塞。

## Inputs
工作区 /home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，实施基线 33c21e098ef3188cbab5a09f3e0a01fadb787715。用户完整实现授权及代码层交付口径见 LOG-047/050/051；真实模型、OS keyring/Obsidian用户操作留 user-owned，不索取真实秘密。Map8 → 当前 dev 与 architecture/testing/licensing/build-and-release → T-02 → Spec/ARCH/ADR 的本票范围；阅读 I implementation-procedure/execution-preflight 与适用风险/TDD规则，复用不变部分。完整读 sessions/20261025T043239Z/010-assistant-preflight/REPORT.md 与 evidence/credential-interface-research.md，预检已有固定官方源码/许可证/可行性探针，不从零猜 Windows fd 或直接复制不明代码。先比较两种实现/失败边界，再采用已有预检的窄接口、有界 worker 与独立匿名管道。T-01共享合同只有原owner在Lead窗口维护；该维护属于新输入，旧T01快照保留历史，受影响测试/审查重新覆盖。全部生产实现由执行者完成，Lead只编排/集成/正式状态。

## Workspace and Scope
原foundation_client的T02写集 src/modules/huhubot/platform/desktop/credentials/**、services/assistant-client.ts及assistant-client.test.ts；以原T01 owner身份维护platform/desktop/transport/**以创建/回收额外匿名pipe（现有一个受管ChildProcess管理器，不能第二套进程）。API/schema/Go/package/lock/docs均只读，精确请求给019/root。代码平台边界与t()规则适用，纯core不能导Node；私密客户端仅desktop，业务BotClient可平台无关。

直接消费019冻结Draft/Agent/CredentialStatus等公共类型和唯一HAP validator，不另造公共DTO检查表。credentials专用协议与020相同，fd3/4仅managed模式、nonsecret --credential-channel=stdio-v1；普通连接无凭证登记能力。收集Ui提交的secret只经rawbuffer专用pipe、不HAP/argv/env/文件/日志；明确调用者buffer生命周期、超时unknown和同refstatus核查，禁止自动重放注册。ref由可信服务安全随机生成不可复用，Profile绑定核验；回执无secret/hash/OS原错。无parent resolve/get-secret。

Transport沿原有EOF/exit/错误/有界队列管理，私有channel不读/堵塞不得无限堆积或妨碍Runner回收。系统环境仅增加精确必要DBUS_SESSION_BUS_ADDRESS/XDG_RUNTIME_DIR，不扩到任意env或CLI SDK补钥。无保护保留安全状态与session-memory明确选择，客户端不假报持久成功。

## Acceptance
新增有意义真实连接红绿：profile/ref/operation/body/tail错误、receipt未知字段/错误状态、半帧/超限/慢peer/超时/EOF全部确定清理；哨兵在业务HAP/argv/env/日志/安全回执均不出现。Bot/model wrappers实际调用统一BotClient，草稿缺凭证可保存、模型未装配显示真实不可用；CAS/idempotency重复不被客户端悄悄换key覆盖冲突。与019/020真实Runner测试额外pipe注册session-memory/status/delete、重启missing、跨Profile拒绝，受管关闭所有pipe/进程终结；普通HAP无法取得secret。可控provider验证protected失败/unknown语义，不使用真实OS密钥。

生产/测试tsc、定向lint、架构、完整huhubot回归与真实TS→Go进程；原T01日期finite/Unicode/wire上限不回退。root/T27在三者freeze后fullbuild/lint/notices，不能以定向替代最终工程验证。无UI表单任务，不提前注册模块；T20/22后续消费。

## Return
不得改正式 Ticket/Map/Goal/Evidence、其他TASK、根 package/lock/build/notices/current文档；不得提交/推送/发布或再派遣。只写本TASK报告/原始日志/hash及明确生产写集。首个h2前 Session: 20261025T043239Z、Task: 021-assistant-client、Status: completed；必需h2聚焦交接、产物与验证、问题与下一步。列采用方案、真实消费者、文件、红绿/失败与恢复、命令/exit/观察、源码/输入hash、未验证项和依赖接缝；completed仅候选返回。最终validate-dispatch return0、所有子进程结束、生产writer停写后通知root。需要超出写集先向Lead给精确路径/必要性，不写平行入口。
