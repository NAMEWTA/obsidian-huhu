---
schema_version: 2
session: "20261025T043239Z"
task: "156-memory-repair-review"
kind: review
change: 2026-10-25-huhu-bot-architecture
ticket: T-14
---

# 私有记忆集成修复后的独立复审

## Goal

由原151独立审查者 native:/root/memory_integration_review 复审153/154/155合并后的完整T14候选，分别返回标准轴和规范轴结论。原151三个finding、152真实SQLite快照故障、Root完整回归与物理CLI失败均须有明确处置。沿真实变更及受影响消费者审查，保留151未变部分的有效分析，不机械从零重跑所有矩阵；不得实现修复或再次派遣。

## Inputs

repo `/home/wta/orca/workspaces/obsidian-huhu/bot`；branch `NAMEWTA/bot`；HEAD/base `33c21e098ef3188cbab5a09f3e0a01fadb787715`；Map39 / Goal38。完整28票55AC及Agent Team代码授权持续；真实Provider、Obsidian、目标OS由用户后验，不索凭证，不提交推送发布归档。

按workspace/catalog与原Map，调用dev和I的独立code-review、source-discovery、Fowler、risk-review、working-tree、review-evidence；既读未变规则复用。继续原生 `gpt-6-astra / high` 审查身份。本轮全部实现者为原151列出的团队，另含153/154/155原owner；你未参与实现。

Root仅在所有作者冻结后生成 `evidence/T-14.md#review-input-memory-full-r2`、`evidence/T-14-logs/review-input-memory-full-r2.json` 与 `review-freeze-memory-full-r2.json`；实际派遣会给出同一scope/sources/exclusions的reviewInputDigest。收到摘要前不开始产品检查。基线仍是实际G2的2063文件历史工作副本，`review-baseline-memory-full-r1.json/.zip`保留；不把工作副本冒充commit。原151候选摘要 `f0db44427b4ba9d0290571b922254780c0f098a1d833300a9ab2b710c5322e37`、REPORT与探针原字节保留，r2 freeze另外列明相对151变化。

权威规范沿原151的Spec/ARCHITECTURE/ADR、相关Ticket行为和AC、115/123/146内部合同。必读新增事实：151 REPORT、152 REPORT、153/154/155 REPORT及Root逐项lead-return；Root最终共同检查与CLI原始记录由原生消息给出。旧139纯组件pass和151 request-changes都不是当前完整候选pass。

## Workspace and Scope

产品、测试、合同、Skill、正式Evidence/状态、旧TASK/REPORT只读。仅写本156的REPORT、logs、manifest和必要`/tmp`独立探针。初始由Root占用Go验证窗口，你可先静态审查与核验已有证据。需有价值反例时报告具体假设、实际输入闭包及命令，Root协调后再启动Go/DB/CLI；不与Root争用共享验证或修改产品。全部子进程必须Wait，保留失败及source/mode漂移。

范围仍含完整私有记忆集成及受影响Runtime、权限、持久化、三SDK、TS/HAP消费者。T15与T17–28明确未装配的未来功能不是本轮缺陷，也不能由本门冒称完成。当前r2主要新增差异：153聊天完成的维护容量拒绝与temporary群历史；154空intent_alias wire合同；155精确SQLITE_BUSY_SNAPSHOT有界重规划及生命周期收尾。Root重建产物纳入最终固定输入。

## Acceptance

1. 两轴分别pass/request-changes，finding数量不限；每项区分实测、静态推断、未验证，并给可达入口、精确行、影响及最小修复/验证。不能因作者声称已修就关闭151finding。
2. F1：真实普通聊天第65轮128已消费来源仍完整，输出自身导致维护129时仅拒绝该维护候选；成功消息/回执/终态、attempt/slot/pin正常收尾。不能增加128、截断真实来源或吞未知SQL；拒绝记录不可被扫描重启为维护。下轮可选历史过滤、History/ReadFacts及撤销/Forget仍正确。
3. F2：temporary只借实际Sponsor在固定GroupBinding中的公开历史资格；其私有namespace/thread不变，不能继承Sponsor私聊、私有记忆或另一线程。当前成员/历史incarnation及每条read+send/完整来源仍过原门。
4. F3：实际Memory.Get producer的合法空alias跨typed、wire、Router、TS/BotClient和物理stdio可用；非空alias、空非alias、private body、来源hash/片段/namespace/编码边界仍严格。既有方法/黄金样本不变、生成镜像由唯一generator产生。
5. 155只对真实driver517且回调失败已回滚的TxB重做Plan→当前Host授权→Seal；一般BUSY/未知I/O/commit结果不确定不伪装成可重试。失败尝试不把未提交Work带入下一轮；取消/停止不再Plan，claim/当前来源改变不能绕过。耗尽的body-free故障沿既有Executor终态和资源清理；原SaveResume负控barrier不掩盖生产缺陷。
6. 原ResumeInbox精确投递/幂等/首sealed前缀、当前权限、alias恢复、维护预算与事实图不被修复破坏。Root必须在新固定源上完成受影响完整Go回归与生产TS→物理CLI→三协议本地HTTP→SQLite/reopen链，区分局部通过与整体验证。
7. 必需检查缺口明确指出；用户后验的真实外部模型/Obsidian/目标OS不作为索凭证或停下代码工作的理由。输入未变的旧证据按实际影响复用；不增加无关产品要求。

## Return

REPORT首h2前包含 Session: 20261025T043239Z、Task: 156-memory-repair-review、Status。字面锚点`<a id="standards-output"></a>`及`<a id="specification-output"></a>`分别包含 Reviewer: native:/root/memory_integration_review、Axis、Result、同一Input-SHA256、Observed；列出来源发现、风险覆盖、151各项处置、155判断、实际验证和未验边界。

所有进程结束后亲自validate-dispatch return，保留实际exit/Wait与原输出，冻结REPORT/manifest，通过原生MESSAGE+FINAL交回。Root回读后维护正式状态与T14代码门，继续全28票Goal；本任务不关闭Goal。
