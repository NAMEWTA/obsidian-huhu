---
schema_version: 2
session: "20261025T043239Z"
task: "040-chat-access-rereview"
kind: review
change: 2026-10-25-huhu-bot-architecture
ticket: T-03
---

# T01/T02维护与T03/T05完整候选独立双轴审查

## Goal
对当前完整固定产品交付分别执行标准轴和规范轴，审查T03单聊/持久执行、T05资料/授权/Host及其T01/T02原owner维护。未参与实现的原foundation_review负责；只在Root真实followup_task后启动。

## Inputs
项目/home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，base/HEAD33c21e098ef3188cbab5a09f3e0a01fadb787715，Map10/Goal9。沿已读AGENTS发现/Map→dev适用架构/测试/许可/Obsidian API参考→T01/T02维护及T03/T05范围、Spec/ARCH/ADR/LOG051、common code-review/Fowler/risk/contracts/working-tree/review-evidence/result-reuse。唯一当前输入evidence/T-03.md#review-input-r2，131文件/36来源，SHA256 78581af912849fe0591b3bb697859a903e167b2642a099d4185d95c7e2d81588。真实reviewer native:/root/foundation_review，沿原gpt-6-astra/high偏好，未参与任何本候选实现；模型偏好不冒称底层attestation。

回读026-chat-implementation、027-access-implementation、028-host-sources的完整REPORT与相关原始输出；Root实际E2E/build/lint见evidence/T-03-logs/lead-{e2e,build,lint}-r1.log。旧033 T02-r2两轴pass仅在逐项真实摘要相同时复用，不能以旧通过覆盖新共享代码；旧失败与D-Bus隔离事故保留。当前go.mod/go.sum/package/pnpm锁与T02-r2相同，不机械重跑无影响的第三方许可反例。T27工程与最终资产另有owner，旧dist不是当前源码产物。

## 修复后复审焦点

完整回读035原两轴与原raw-probes、037/038/039完整REPORT及相关原始输出。035的3项P2必须在同原输入上验证关闭，并沿真实消费者检查影响面；原probe断言缺陷，复审需把接受断言用于独立副本，不能把旧probe退出0当通过。坐标1MiB与64KiB字节预算分离；原TFile身份在读前/读后/哈希发布点复核且编辑器快照仍成立；Grant仅attempt ID不入摘要，真实业务/epoch/CAS仍入。Root r2回放/build/lint在evidence/T-03-logs，原r1/035结论仅在明确摘要相同且无影响时复用。真实用户验收仍不运行。当前没有其他产品writer，发现漂移先通知Root。

## Workspace and Scope
完整固定131文件全部可审；新代码和实际影响闭包不能缩到作者测试。仅写本TASK REPORT、独立探针与原始日志，临时独立反例放外部临时目录，不能修改生产/测试/规范/锁/工程/正式状态或他人报告。不能再委派、提交、推送、发布。相关writer已明确停写；若发现输入漂移，停止受影响审查并通知Root，不能自己冻结漂移或实施修复。

对各适用风险先提出可证伪假设再沿调用方与真实消费者验证：同库receipt/Session/Run/pin/event原子性与新key语义、accepted扫描及中断恢复、关闭/EOF/队列/并发、磁盘失败与unknown usage、配置修订/Usage删除竞态；来源捕获origin/未保存正文、可信Host与lease、scope/parent/currentGrant/recipient交集、read与send分离、合法继承/派生来源、搜索UTF16+UTF8/hash/范围/cursor/字节上限、拒绝/超时/迟到正文、有限缓存与真实不可取消Vault读配额、共享schema/DTO/严格双向协议。检查当前历史权限与最终模型准入/持久化，不仅看UI过滤。每条真实新finding都保留，不设数量上限，不以全绿自动测试代替独立反例。

应用中Engine未装配真实协议时明确ADAPTER_NOT_ASSEMBLED是本阶段正确边界；T04事件续读、T06审批、T08三协议、T16恢复操作、T20模块/UI后续范围不能虚报已经完成，也不把它们的明确OUT当本票新缺陷。同时T03/T05必须给后续真实可消费的纯Port与已装配公共调用链，不能用stub或永远空fallback代替本票合同。

原历史默认dbus --session会读宿主service目录并尝试激活Secret Service。禁止重跑旧默认bus探针，不访问或终止既有keyring进程；若确因新影响需要凭证回归，只用当前显式无service目录/无激活的私有bus fixture、一次性HOME/XDG/socket，验证无真实服务。真实模型、Obsidian窗口、用户Vault和目标OS留user-owned/not-run，不索取凭证。

## Acceptance
标准/规范两轴分别给pass/request-changes，所有可证实finding包含准确路径/行、触发条件、实际影响、严重性、合同依据和最小验证条件。独立的公共Facade/HAP/实际TS-Go/SQLite观察与未运行边界准确区分；不是要求重做所有作者测试。最终重新核验同一131文件/36来源/HEAD/index，所有探针子进程退出并Wait、无writer后交回。没有新问题也完整解释覆盖范围，不宣称绝对无缺陷或全28票完成。

## Return
REPORT首个h2前 Session: 20261025T043239Z、Task: 040-chat-access-rereview、Status: completed；h2聚焦交接、产物与验证、问题与下一步。两轴显式standards-output/specification-output锚点和Reviewer/Axis/Result/Input-SHA256/Observed字段；SHA必须来自固定输入。validate-dispatch return0，全部writer/probe停写后真实消息交Root。Root收到实际工具回执、完整回读后才更新正式Evidence。
