---
schema_version: 2
session: "20261031T062046Z"
task: "039-notification-names"
kind: implementation
change: 2026-10-31-dev-stabilization-overhaul
ticket: T-17
---

## Goal
native:/root/sources（Astra low）完成T17自动化通知运行时名称快照。T01/T16已done，T05全部20候选继续冻结供独立review及Lead Go全量；不要再动Go/测量/037报告。Lead已启动T05全量，不与之并跑Go。

## Inputs
Map22、Ticket17/AC231/LOG011、dev/testing、execution-boundaries，真实automations runtime/service/models/snapshots与notifications记录/persistence/API/现有UI消费者。已有决策与路径常量先读，不改变T16名称生成与旧路径边界。

## Workspace and Scope
current/dev/base86c500556db1d64865c4cc7f1aff1dd83de071fa。当前允许Ticket17所列automations services/core与所属i18n、notifications core/i18n、test/automations内本目标最小实现/测试及本REPORT；修改前必须回报精确预计文件、实际入口/调用方/依赖与验证范围。不要把前缀授权当全目录重构，既有Browser注册/集成分支冻结。API/model若实际在未授权路径则先列出并等Lead扩围。notifications UI与其他模块API均只读；视觉呈现缺口交T31，不改UI。正式Ticket/Evidence/Map/ledger及shared main/styles只读，无Git写入/递归代理/remoteCI/真实宿主。

## Acceptance
名称取实际运行时定义快照，通知主文案使用该快照与真实结果；之后改名或删除不重写历史主文案，稳定ID仍用于现名/已删除详情解析及复制，不泄露敏感参数。空白名称本地化未命名，长名称不丢稳定身份；toast和持久通知同一语义、未读/去重/关联不变，成功通知不得早于真实terminal result。不要把action参数/错误原始payload拼入可见通知。
对真实持久化序列化/反序列化、历史记录缺字段、晚到运行/删除/重名/多次运行、失败toast消失后中心仍可找到做有意义回归；时序用可控gate。复用已有服务/通知端口，不新建第二个快照数据源。旧数据兼容与显示现名接缝若UI无法消费请准确记录T31需求，不能用未渲染字段声称整页验收。
先新增行为red再最小修复；实际运行本票三范围Vitest、i18n、类型/定向lint，按testing选择必要架构检查；不跑无关全量/Browser或shared构建。停写候选由Lead最终复核。

## Return
标准REPORT精确SHA、真实红绿/全部命令退出、存储兼容边界、名称来源/敏感信息策略与T31消费缺口。完成后停写，不标Ticket done，不对外发消息/issue评论。

### Lead澄清：显式提醒正文不是意外参数泄漏

保留notify动作本身的既有产品目的：用户明确配置用于显示的提醒正文可以显示，来源必须同一run.definition/action快照，并与名称+结果/稳定target共同持久化及toast一致。禁止的是无差别拼接其他action参数、原始error/message/errorParams、凭据或调试payload，不能借改名票删除提醒功能。新增回归明确非notify敏感哨兵不泄露，同时notify用户有意正文保留。若不带presentation即可复用既有NotificationService保存固定title/body，不为此新增标志/第二快照或修改无需改的core。原行为/AC范围保持。
