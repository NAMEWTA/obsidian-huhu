---
schema_version: 2
session: "20261026T045732Z"
task: "033-t10-owner-plan-review"
kind: "plan-review"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-10"
---

## Goal

以用户指定的review模型gpt-6-astra/high，独立审视Root为后继T10准备的邮箱工程合同，找出会导致实现错误、验收无法闭合或偏离既定用户行为的实际缺口。仅只读技术计划咨询，不激活T10、不做实现、不替代最终代码两轴审查。完整18票Agent Team授权持续；Root编排与代码验收，真实宿主E2E用户负责。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/terminal；当前T09进行中，T01–08已完成，T10依赖T09且尚未开始。当前工作副本A/B活动，必须使用以下固定草稿和源快照，不把并行当前源当稳定审查输入：

- /tmp/huhu-t10-root-planning-20261026T161600Z/plan-review-inputs.json SHA256 b5febff41d7a4d76ed7e60b1bfc50ab5c26a5b34c7f2aa7589c4c75f2f4ad8b1
- 草稿 /tmp/huhu-t10-root-planning-20261026T161600Z/engineering-packet.draft.md SHA256 46fa0c98898b3a9df7a89f7adc178d7a5902a4c7c64d6f4649ed6ce9953d7b81
- CLI身份核验 /tmp/huhu-t10-root-planning-20261026T161600Z/cli-message-identity-note.md SHA256 c5bedd69bf17ac74abb4ee8af1f75e8e435e733e37ef852cad026d48f5879999

manifest中path只是来源标识，阅读snapshot原字节。原始T09冻结已包含T01–08；SpaceService/records当前T09未改。canonical/CLI用已接收029快照替代初始版本。022已接受报告与四个真实JsonStore反例供复用；其旧“CLI默认requestId为huhu”来自parse层，是不完整结论，Root已实读run使用nonce替换，不应沿错建议强制用户--message。

先bootstrap与实际dev规则；涉及UI入口边界按需ui。只读发现不调用实施或新Change。上层行为以Spec §3.4–3.5、AC023–025/046/061和implementation-contracts为准，不用工程草稿改写批准规范。用户全体业务必须明确Space、旧交互先选/后台缺绑定拒绝已固定；邮箱不是运行任务或PTY注入。

## Workspace and Scope

所有产品、正式Ticket/Map/Goal/Evidence、永久知识及其它worker产物只读。只能写本033 REPORT和全新/tmp/huhu-t10-owner-plan-review-*证据；不得改草稿、原022/Root输入或任何旧tmp。不得递归派遣。没有提交/推送/发布/归档权限。不要启动native/helper/Chrome/真实Provider/Vault/账号，不跑全库或重复已证明JsonStore探针。若确需小型纯逻辑证伪，可在自己临时目录正常import固定快照所对应的原实现，但保留实际字节/命令/结果和范围；不做未来实现来证明自身正确。

## Acceptance

完整读草稿并核关键原owner/CLI/schema源。重点核查：原SpaceService单writer/逻辑队列如何拿可信最新基线；未知primary写后零写核对；ack幂等与归档顺序；取消/deadline不让排队请求迟写；恢复/坏子版本不静默回退空；append/ack稳定分页的lineage/回退栅栏；完整request/response预算与客户端消息ID；Vault引用权限/变化及真实UI生命周期接口。

只报告有具体可达反例或真实接缝依据的缺口，区分用户行为冲突、必须落实的工程决定、普通实施细节；不以“还未实现”制造finding，不把合理的风险测试要求当bug。对于草稿中“lineage是否必需待实际owner恢复测试”给出最小可实现选择：考虑cursor仅在进程内保留，原owner本地只增generation在非append/ack的已验证快照改变时失效是否足够，避免新增持久索引或第二库；如不够给具体序列。正文/引用/ID限额是Root候选工程常量，指出组合不可表达的反例即可，不擅自重设产品范围。

结论应让Root能直接修订正式T10工程包/精确写集。可以判定无阻断；不要求凑数量、漫无边际架构重写或重新访谈既定产品决定。不限制真实重要finding数量。

## Return

原子写本033 REPORT，标准Session/Task/Status与“聚焦交接”“产物与验证”“问题与下一步”。列每项severity、固定输入源位置、触发序列/影响、最小补充合同与关闭条件，另列可由实现者正常决定的细节及未验证边界。给实际读取/探针来源和hash，实际执行return结构校验保存原始输出。SOURCE READ ONLY，无实现及AC通过声明；Root最终接收，不改正式状态。
