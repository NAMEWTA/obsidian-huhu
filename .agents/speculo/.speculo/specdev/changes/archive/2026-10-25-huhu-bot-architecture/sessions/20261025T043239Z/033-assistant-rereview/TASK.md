---
schema_version: 2
session: "20261025T043239Z"
task: "033-assistant-rereview"
kind: review
change: 2026-10-25-huhu-bot-architecture
ticket: T-02
---

# T01/T02 Linux取消语义修复后独立复审

## Goal
按新固定输入复核完整候选及024唯一P1修复，不覆盖原request-changes。当前TASK已固定输入；仅在root真实followup派遣后开始。

## Inputs
项目/home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，base/HEAD33c21e098ef3188cbab5a09f3e0a01fadb787715，Map8/Goal7。沿已读AGENTS发现/Map/dev与适用参考、T01/T02/T27对应范围、Spec/ARCH/ADR/LOG051，common code-review/Fowler/risk/contracts/working-tree/review-evidence/result-reuse。完整回读024双轴REPORT/raw-probes.log与032最终REPORT，来源与diff须当前核验。唯一输入evidence/T-02.md#review-input-r2，93文件/25来源，SHA256 886b568a11a1cbe8209412e02b1ee00bcf09b68cdbc2dc5c50f0c8a75b21387b；相对r1仅keyring_linux.go、secret_service_linux.go、credentials_dbus_linux_test.go三文件有变。真实reviewer native:/root/foundation_review，未参与实现，沿原gpt-6-astra/high偏好。

## Workspace and Scope
当前输入完整T01维护+T02代码/测试/API/schema/依赖。未变024风险观察仅在逐项hash匹配后复用，不机械重跑所有无关测试；新Linux实际adapter、依赖/来源、生产流程/测试及其影响闭包完整审查。仅写本TASK REPORT/原始probe日志，临时独立反例在外部临时目录，不能改任何生产/测试/规范/锁/工程或正式状态，不再委派/提交/推送/发布。

原P1须用同一真实生产TS或CLI→Runner→worker→实际D-Bus依赖/隔离Secret Service确认消除，包含取消create/delete、正常对照、status前catalog和真实item状态；不能只相信作者tests或用一次后续status纠正原伪成功。已知取消保留拒绝/取消事实，无法确认效果unknown，同ref可核查；不自动fallback/replay/改ref。扩展修复所影响的unlock/prompt完成、信号相关、错误输出/秘密、超时/关闭/回收边界，测试只触隔离服务，既有3s无supervisor自退出保持。任何新依赖/复制改编来源与许可证核对，T27根工程另由030，不能代其批准。

032最终夹具严格检查发现默认`dbus-daemon --session`会读取宿主service目录并在disconnect后尝试自动激活Secret Service；日志11已保留。禁止照抄024/032旧probe的默认session启动方式。复审使用显式无service目录/无自动激活的私有bus配置、独立临时HOME/XDG/socket，并验证离线服务名只能未知且无可激活服务。该隔离修复不改变取消信号/调用链/SQLite前态等原反例输入。此前是否读取宿主元数据未证实；不得笼统宣称所有历史运行完全未触宿主。不得访问或终止既有keyring进程。

## Acceptance
标准/规范两轴分别独立判断，完整记录所有可证实finding（路径/行/严重性/触发/实际影响/依据/最小满足条件）。复用未变判断需明确范围和摘要，不把新测试全绿覆盖反例。所有子进程退出/隔离服务回收后再次核验输入一致，再交回；真实OS/模型/Obsidian依用户后验不伪造现场通过。

## Return
REPORT首个h2前 Session: 20261025T043239Z、Task: 033-assistant-rereview、Status: completed；h2聚焦交接、产物与验证、问题与下一步。两轴显式standards-output/specification-output锚点和Reviewer/Axis/Result/Input-SHA256/Observed字段；实际SHA来自root派遣。保留024原失败，不改写旧报告。validate-dispatch return0、所有writer/probe停写后真实工具消息交回root。
