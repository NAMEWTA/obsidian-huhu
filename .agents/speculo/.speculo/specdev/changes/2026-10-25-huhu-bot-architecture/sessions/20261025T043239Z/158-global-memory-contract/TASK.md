---
schema_version: 2
session: "20261025T043239Z"
task: "158-global-memory-contract"
kind: research
change: 2026-10-25-huhu-bot-architecture
ticket: T-15
---

# 全局记忆的具体可信入口与事务接缝准备

## Goal

原API/Core owner native:/root/foundation_api_repair 在142只读预检基础上完成可实施的窄内部合同：可信用户确认、模型提议、唯一Memory事实表与物理投递门如何连起来。只补142没有固定的具体签名/调用方向/事务归属，不重做泛化研究。T14当前最终共同门尚未关闭，T15不提前激活、不写产品。

## Inputs

repo `/home/wta/orca/workspaces/obsidian-huhu/bot`，branch NAMEWTA/bot，HEAD 33c21e098ef3188cbab5a09f3e0a01fadb787715，Map39/Goal38。完整28票55AC及Agent Team代码授权，真实环境用户后验，不索凭证、不提交推送发布归档。

workspace/catalog → Map → dev/architecture/testing → T15及直接T14/05/04/01合同；读取142-global-memory-preflight/REPORT.md，Spec对应全局记忆行为、ADR-024、115和123已有内部合同。回读实际api/memory.go、api/tooling.go、RequestIdentity、HAP memory dispatch、Core Facade、Broker和common工具表、memory的namespace/facts/context_read/private/revisions、grants memory及stdio delivery subject reader。当前153/154/155源已冻结，156独立复审只读，157另占Go窗；既读未变资料复用。

## Workspace and Scope

产品、测试、所有正式状态/Spec/Ticket/Map、他人交接只读。仅写本158的 `global-memory-contract.md`、REPORT、必要source manifest/logs及`/tmp`文本。不能运行Go/DB/CLI/Node产品检查或generator，也不能修改任何源码/DDL。技术选择在已批准产品边界内由团队自主决定，不再向用户问已决定的确认策略。

## Acceptance

1. 比较两种最小可信入口设计，给出采用方案的具体Go内部类型/方法签名和构造位置。transport的user命令与ToolExecution不能因同一RequestIdentity或JSON自报role混淆；模型只可Propose，Resolver不能从工具路由到达。可信能力须由明确代码入口赋予，不能仅依赖ManagedOwner布尔值或prompt。不得为此新造wire身份字段或平行API。
2. 模型提议工具的严格参数、pinned AllowedTools、当前claim/Run、实际已消费完整来源绑定明确；可空sources的用户独立内容与模型来源不得混为一种。给出Core/Broker/common三处窄接缝、临时Agent/群发起者身份规则及失败返回，避免引擎各自重复实现。
3. 只复用014已有global namespace/items/revisions/bodies/index/dependencies真相；提出Memory Store需暴露的最小Tx端口，不复制其源资格算法。015只存proposal固定预览/expiry/CAS/终态/receipt关联，实际schema11由T01注册。明确Propose/Resolve/Get/List的事务边界、幂等输入hash、expected preview/hash/target head、当前source及来源撤销后的原子无写行为。
4. 明确Memory List/Get如何路由global/proposal，typed结果校验/当前物理delivery subject如何读取来源资格；proposal未确认不得进入召回。私有与global联合召回共20项/128KiB，实际Run输入namespace保持、单项真实来源namespace保留，恢复重读沿原门；不继承其他Bot私有库。
5. 列出精确新增/修改文件及原owner（T15、T14、T01、T05、T04、Engine），把是否需触及generator/schema分清，能用现有wire就不扩大合同。只给差异验收矩阵：三种操作确认/拒绝/过期/并发CAS/当前源改变、实际工具冒充与stdio queued投递、联合召回和恢复。指出代码事实不足，不以伪实现替代未决技术接缝。

## Return

REPORT首h2前Session:20261025T043239Z、Task:158-global-memory-contract、Status；给合同路径、两个选择的结论及证据、真实源码定位、精确写集、未验证项。source manifest只覆盖实际读取源。亲自validate-dispatch return并冻结报告/工件，通过原生MESSAGE+FINAL交回；这只表示准备完成，Root决定T14门后T15实施窗口，不能标T15完成。
