# T04 / T06 接缝预读

Root在026/027/028仍实施时只读核对。本文不派遣、不改变Ticket状态，不作为上游通过证据；只有T03/T05固定输入的代码门关闭后，才按真实产物更新下一窗口的写集。观察时间：2026-10-25 08:35 UTC。

## 现有接缝

T03当前以`execution_runs`、`conversation_messages`和`execution_events`持久化受理及终结。后续事件通过sqlite/execution的`AddEventInTx`在调用方短事务内增加每Run的`event_seq`并插入事件。首个accepted事件与Run、消息、pin、Session占用、receipt同事务。T04必须复用这一份日志和事务入口；T06也通过原owner接入它，不能新建第二份广播或审批Run事实。

当前共享TS合同已声明`runs.subscribe`，但应用服务尚未装配；现有RunEvent只有基本字段，不能把声明当已完成订阅。T04需要由T01原owner统一冻结API、schema、Go生成合同、TS接口和fixtures，真实连接路由由原TS owner维护。观察到的当前63方法/126形状不预先承诺适用于新增合同。

003和005迁移当前分别注册SQLite版本3和4。后续票号文件不等于DB版本，若确需004/006，按实际接纳顺序取下一个连续版本；注册由T01原owner串行维护，已接纳003/005不回写。业务adapter可在自己的包使用同库事务接缝，Application/Domain不得暴露`*sql.Tx`。

## T04需闭合的合同

读取、快照、持续投递都检查当前用户/Session/资料权限，包括T03当前正在补齐的派生来源。不能用模型send权限代替用户read，也不能把握手检查当后续权限。快照的内容和snapshotSeq来自同一一致短读；每个Run分别处理seq，终态之后的效果核查事件仍可见。

持续读取应保持有界批量、等待、缓冲与连接生命周期；断开页面/订阅不取消Run。必须以真实数据库尾读覆盖补历史与后续读取之间新增事件的窗口，内存通知只能缩短等待。重复、乱序、缺口、过期/未来cursor、缓慢消费者和撤权清理都从生产客户端入口验证。cursor过期只能清理可重建投影，不能顺带删除用户消息。

T04原票未申请新的迁移正文；如果实际设计需要持久保留下界等字段，先给Root精确路径和必要性，由原计划owner更新，不能修改已接纳003或通过新建平行表绕过。可以复用当前事件表实现有界读取，再按实际合同决定是否新增结构。

## T06需闭合的合同

Broker从受信运行上下文取得caller、recipient、parent范围及Run身份，模型工具参数不得自行授予权限。Effect绑定本次意图、toolCall、能力/实现版本、目标基线与epoch；同意图恢复保留ID，相同参数的新意图仍不同。第一份待审批效果出现即关闭整个Run后续效果准入，不能只靠单次调用mutex挡并行工具。

Checkpoint先完成受限、校验、不可变的Blob发布，再由同一短事务公布CP引用、Approval、Effect、Run及事件。DB提交失败可以留下待回收孤儿Blob，不能留下可读半张审批；不能把SDK私有CP字节放入HAP。Blob回收要考虑已提交引用和在途使用，不能误删刚发布但尚未提交的文件。

批准、拒绝、过期及取消竞争使用当前Principal、revision和CAS；真正取得dispatch资格时另起短事务重查当前Grant、取消屏障、工具/目标版本。T06只提供持久资格与fake Host合同，真实Vault单笔记写入由T07负责。未确认效果不得自动改effectId重放。

## 派遣与检查选择

计划内下一窗口可以把T04 Go/TS与T06分给原团队，但先明确共享API/注册、T03运行事务、T05权限和TS连接的唯一原owner维护；分别使用一次性Profile，不并发修改共享生成物。本文只预读，不提前授权新写集。

新增代码的公共Facade、真实SQLite、实际TS-Go和关键race检查由本票承担；根TS build/lint在源码稳定后一次运行。五目标资产、最终依赖闭包/第三方声明与产品完整构建仍由T27的最终窗口收齐；没有依赖/构建输入变化的旧工程检查可按真实摘要复用，旧二进制不能称为当前新源码产物。

参考机制沿用`IMPLEMENTATION-REFERENCES.md`固定REF-04（事件/队列）及REF-01/02（工具/Checkpoint边界）。T08纯Engine预读另见`engine-port-preflight.md`。没有安装上游依赖、复制外部代码、调用模型或运行真实Obsidian。


## 034实际只读交回

Root实际派遣034-events-approval-preflight，已收到MESSAGE和FINAL、完整回读REPORT并核对SHA b322ac16d7f68aff30260f656fadf402fd3f2335fc4d357a30625554aee12691，Root再次return结构校验exit0/errors[]。报告与observations.json位于sessions/20261025T043239Z/034-events-approval-preflight/。该研究未运行Eino/Obsidian/模型，产品源码无修改，所有命令已退出。

接纳为后续实施输入的事实：现有Spec允许有界重复tail请求；CURSOR_EXPIRED的快照需要原owner同步错误API/wire/严格TS codec；逐次交付含writer排队撤权窗口须由同一权限/传输接缝闭合。Eino中断不保证CP保存成功，必须确认本attempt不可变Blob后原子发布。正常批准/拒绝/过期须有同Executor的continuation/Engine.Resume或确定终结消费者，不能推给T16；崩溃后手动恢复仍按T16。现有来源Grant没有write，确切笔记效果的用户批准独立处理。精确共享路径、CP/Run/pin闭环及待跑故障矩阵见完整报告，T04/T06仍未实施。


## 036实际只读交回

Root已实际接收036-note-effect-preflight的MESSAGE/FINAL，完整回读8559-token报告，SHA5b5b3292c08084ce31dcdab386e8c429631efb147cb131b3288d3cfa687f925d，亲自return校验0。52项源码/官方资料观察；无运行探针、真实Vault/keyring、生产写入或子进程。T07的Host错误、目标CAS、最小回执及同步排除、清理和受控现场脚本建议作为后续原owner接缝输入，未提前激活T07，候选路径不是已批准产品合同。
