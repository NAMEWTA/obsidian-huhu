---
schema_version: 2
session: "20261026T045732Z"
task: "022-t10-inbox-preparation"
kind: "preparation"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-10"
---

## Goal

沿原 codex:/root/implement_t08_profile 的 gpt-6.1-sol/xhigh 做 T10 被动邮箱的只读工程准备。完整18票/Agent Team已授权；T08修复和复审仍是唯一活动实施票，T09尚未实施，T10不解锁。请交最小可实施的同owner持久化、CLI和生产UI接线建议与风险验证矩阵，避免后续实现才发现第二writer或“read就是ack”的错误。不是T10验收，也不递归派遣。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/terminal；change .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor；session 20261026T045732Z；HEAD33c21e098ef3188cbab5a09f3e0a01fadb787715，branch NAMEWTA/terminal。当前GP030/Map31，T01–07done，T08恢复周期1attempt1，T09/10尚未开启。

按 Map→dev/ui→ticket/10-passive-inbox.md→Goal执行协议读取，复用既读未变规则；以Spec §3.6（被动通知）、对应AC002/023/024/025/046/061、DESIGN revision1 PAGE003及implementation-contracts为权威。用户最新Space决定已LOG030：所有运行启动前必须显式有效Space；通知接收对象本身是稳定Session，禁止用cwd/焦点推断Space，也不唤醒模型。

当前canonical src/shared/native/control-schema.json已有message.send、inbox.list/read/ack占位；协议/CLI表面和真实handlers可用性需要分别核对。现有src/modules/agent/services/controller.ts所用NOTIFICATION_INBOX是另一模块的系统提示，不可直接当Session邮箱数据库。T02的SpaceService、records、storage/layout原owner、lease/write queue和故障语义可复用；先沿实际源找接缝。

reference-notes.md R01 Herdr、R03 tmux和K记录是已有研究。复用仍有效的活动/许可证据；若通知特定机制没有证据，限定检索官方GitHub近两年活跃、许可明确的同类实现，比较机制/依赖/已知问题，保存链接及采用/不采用理由。不得直接移植GPL终端代码或新增依赖。

## Workspace and Scope

所有产品、Spec/Goal/Map/Ticket/正式Evidence、已有REPORT和/tmp旧材料只读。唯一可写是本022 REPORT与新的/tmp/huhu-t10-inbox-preparation-*脚本/研究原件。允许将当前实际生产模块只读编译到自己tmp，用内存/临时隔离存储调用真实API做准备实验；不可写产品或为未来方案复制一套生产实现做伪证明。

020仅有另一writer在10个Host/helper/shared native host路径修复关闭结果；你不要依赖它们的当前动态字节或触其进程/测试根。T09未来将改WorkspaceService/UI/control/schema等接缝，本报告应明确此依赖，在正式T10前要回读其最终API；现有调研不是未来接口已冻结。记录本次真实所读源前后SHA，不宣称整库固定。无全仓检查、根构建、native build、真实Vault/账号/Provider或用户实机操作。

## Acceptance

1. 沿实际存储owner说明Session邮箱的归属路径、读写租约、顺序/修订/持久成功点、故障与重开：先查现有数据规则，比较独立JsonStore与复用SpaceService/现有业务存储的最小正确方案，推荐一种。禁止二个owner写同文件、在query取写租约/写盘、把ack提前广播、把写失败统一none、用模拟整库事务掩盖部分提交。
2. 明确有界messageId/目标Session/source/body/附件引用/顺序/ack的最低合同；source描述不是认证。稳定排序分页/完整envelope49152B、重复ack、同cwd双Space、停用/停止/归档/删除/跨Space边界、并发发送及read不ack。send response丢失后可用ID核对，不增加exactly-once Outbox/自动重放。客户端可核对ID如何进入既有canonical/CLI，需具体建议。
3. 附件是已授权来源引用、非任意本机文件API；不能把合法正文--file CLI本地读取与宿主附件读取混为一谈。回读已有来源/路径授权机制，给失效引用如何报告的可实施方案；不因未知而静默删除Spec AC025。
4. 沿生产CLI→broker/Router→commands→邮箱owner→同UI subscriber逐层列接线，availability仅在真实handler具备时打开；保存成功才广播未读，不触PTY输入/Session启动/焦点/等待或模型。UI read/ack状态与纯Session完成提示分开；复用T08控制312px/<600Dialog/T09目标显示，不新造工作台。
5. 给精确最小产品路径清单与A/B/U唯一owner/API阶段建议，并指出原T10 writable_paths缺项（canonical/generated/Rust CLI、commands/router、真实integration/样式/预算等按真实必要性，不机械全加）。给足以击穿错误方案的测试矩阵；如现有真实store有关键不确定点，使用只读tmp探针验证并记录原始输出/限制，避免只交抽象建议。

## Return

原子写本022 REPORT，有有效Session/Task/Status及“聚焦交接”“产物与验证”“问题与下一步”。保存实际读取输入SHA、所有实际命令/UTC/exit/raw、来源和临时资源清理。没有执行的测试不能写成pass；准备实验不当T10产品验收。写报告后实际运行return结构校验并保存独立raw，回报SOURCE READ ONLY、关键建议、写集缺项和仍待未来T09确定的API。
