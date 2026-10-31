# T-10 passive-inbox：严格只读预检

2026-10-25；6.1-sol/xhigh，`/root/implement_t01`。依据当前 T-10、Spec §3.6/AC002/023–025/046/061、implementation-contracts，复用已读 dev/ui 和固定研究，无新依赖/代码复制。**页号核对：PAGE-002 是历史，邮箱实际绑定获批 DESIGN rev1 PAGE-003**（摘要 f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab）。UI-001/final/app.js:85–89/154–155 仅是内存 read/ack 演示，badge 计未 ack；不能复制 Date.now ID/数组作为持久实现。批准原件不改。

## 当前真实 owner 与状态

| 对象 | 源事实与可复用边界 |
|---|---|
| Session 身份 | T-02 的 SpaceService/records.ts 已持久保存 Space/Session/归属；Space 有 archived，当前 SessionRecord 没有归档字段。T-03 runtime/后台投影正在实施，只是显示事实，不能用“无 runtime/退出/无 Pane”拒收消息。Session 归档由 T-04 最终端口提供。 |
| Agent 完成提示 | WorkspaceService.sync 的 tab.unread 由后台 done 置位，setVisible 清除；Controller:186 将部分活动变化发到全局 system notification。这两个活跃文件仅作时点观察。查看终端不能清邮箱 ack，邮箱 ack 不能改 Agent activity/完成提示。 |
| 全局 Notifications | notifications/module.ts 拥有 `.huhu/notifications/<device>/inbox.json`。api.ts 的 NOTIFICATION_INBOX 是系统/in-app 通知，不是 Session 邮箱；records.read 与独立 receipts（清除可见记录仍保留去重墓碑）有原语义。core/service.ts:92–102 采用 commit 成功后发布；open 后 markRead，**不能拿它代替 mailbox read/ack**。 |
| 自动化通知 | automations/services/runtime.ts:124 后按 run/definition 产生 NotificationRequest，module.ts:51 acquire 原 inbox；opener 只定位来源/运行。Notifications collect openers 使用 activate:false，原 API/投递/去重/关闭语义应保留。T-10 不改成自动化 Run/Outbox 或模型投递。 |
| 新邮箱/接线 | core/inbox、services/inbox、ui/inbox 当前均不存在；Agent api/module 当前无邮箱服务。T-07 registry/schema 与 T-09 工具抽屉/显式目标是 **future**，不能把预检拟名当真实路径或另起控制 owner。 |

## 最小生产合同与复用方式

- 消息归 Agent 的**持久 Session**，冻结发送者来源、明确接收 Space/Session、稳定 messageId/顺序与正文/引用；同 cwd 两 Space 独立。同 Vault 跨 Space 可显式寻址，名称歧义不猜。source/from 是 provenance，不代替 T-07 的 Vault/物理绑定/device/instance 校验。list/read/ack 从消息反查真实归属，不只信客户端 Space 或全局 messageId。
- 停止 Session 可接收；归档对象拒新消息，原记录仍可查。接纳与最终提交需在**同一业务 writer 队列**检查目标，不能在 UI 缓存检查后另开 JsonStore 写入；与归档/关闭竞争由同 owner 排序。T-02 的 private mutate 已保护 scope/lease/恢复/验证写，查询不懒启动 helper；复用此 gate，禁止另起 writer 监听或业务数据库。
- 发送/ack 只有 durable commit+回读成功后才回执/广播；失败不先改未读/ack，不误报成功，保留旧有效数据与诊断。JsonStore 提供验证、备份、冲突检测；shared WriteQueue 只串行，**没有容量上限，也不是多文件事务**。T-10 固定正文/引用/消息集合/排队请求/页大小/观察者容量与拒绝行为，在实际 capabilities 公布；不能照搬当前 Notifications 无界 records 或静默裁掉未确认消息。
- 稳定分页按持久顺序/游标，发送、read、ack 并发不能重排/漏行；游标带接收者/范围，跨目标或过期明确拒绝/刷新。read 展示内容不暗中 ack；若 read 持久标记“已读取”，也走同提交规则。重复 ack 保留原确认事实，无重复副作用；ack 不代表理解或任务完成。生产文案应区分未读/未确认，不能把原型未 ack badge 错当已读数量。
- UI/CLI 不调用 spawn/prompt/paste/send-keys/attach 来“通知”；被动消息不要求目标在线。来源引用只经受控 Vault/授权 reader 验证，失效显示准确状态；不开放任意机器路径/附件读取。CLI --file 读取请求正文是 T-07 的客户端行为，不是 server 文件接口。
- 观察取消只拆本次订阅/分页；排队但未接纳可零写取消，已提交不能因页面卸载删除消息或反向撤 ack。回执丢失提供已知 messageId/phase/effect 供查询，不盲重发、不宣称 exactly-once。关闭先拒新操作、排空已接纳持久写再释放 owner；慢观察者不能占住写队列。发送、未读变化不夺输入焦点；复用 T-09 的独立显式 target，不按当前 Pane/新 Space 首项重算。

## 写集缺口、分工及后票交接

当前票覆盖新 inbox core/services/UI、AgentWorkspacePage、control/inbox*.ts、Controller、i18n；最小待补为：

1. **同 T-02 owner 的真实入口**：`src/modules/agent/services/spaces/space-service.ts`（及就近测试）。当前 mutate/permit 私有，没有可供邮箱使用的受控业务提交端口。若消息纳入 workbench-v2，还需 `services/spaces/records.ts`、`records.test.ts` 的版本/验证/兼容字段；若另分文件，仍需此 owner 的有界 gate/drain，并补 `src/shared/storage/vault-layout.ts` 的真实路径常量。不要仅因新 inbox 目录获授权就绕开旧 owner。
2. **以后续真实产物决定**：T-07 canonical 描述/结果/CLI 黑盒 fixture；T-09 若未提供 badge/工具扩展，补实际 `ui/sidebar/AgentSidebar.tsx` 与 `.dom.test.tsx`、`services/workspace-view.ts` 的窄接线。若 Controller 内注册即可闭合，不必改 module/api；确需跨模块公开或注册表装配时再补 `agent/api.ts`、`module.ts`/`manifest.ts` 和相应精确测试，不虚构现有注册接缝。
3. 新持久名称/格式需同步 `docs/data.md` 与 dev architecture 持久 owner 表（Root 精确委托），当前票只有 workbench/CLI docs；不是改流程或永久 ADR 的授权。

可拆：A 独占 inbox core/services、SpaceService/records/schema/CLI handler、Controller/lifecycle 与业务测试；B 独占 inbox/control UI、AgentWorkspacePage、已批准的 sidebar/view state 与 DOM/i18n。先冻结纯 target/message/error/分页端口，各文件唯一 writer；Root 拥有正式记录/生成物，schema 实际 owner 依 T-07 冻结安排。

给 T-15/16 交实际 mailbox 文件/版本、scope/Session 引用、稳定顺序/ID、正文/来源、已读取与 ack、上限策略及严格 drain/snapshot/adopt 端口；不能从 runtime/UI unread 重建邮箱。备份按所有已存设备/owner 枚举，保留 Session/Space 映射、正文/来源失效事实与确认；导入不 publish、不补发、不启动模型、不伪称送达。Notifications 的 records/read/receipts 含墓碑仍由原 owner 单独纳入共同快照，不能用 mailbox ack 代替它们。

## 可回读验证与停止边界

未来测试复用真实 SpaceService+磁盘 JsonStore/WriterOwner 夹具，覆盖同 cwd 两 Space、停止收件/归档拒收、send 与 archive 竞争、并发发送/翻页/read/重复 ack、disk full/部分主写/备份失败/重开、队列容量/取消与 listener lost。断言**NativeHost acquire、PTY input、模型调用均为零**；存盘成功前事件/未读不变化，失败后旧字节/诊断仍在。shared JsonStore/write-queue 测试可借鉴，不修改它们来迁就邮箱。Notifications service/InboxPanel DOM 回归保留旧投递/read/clear/墓碑；新生产工具 DOM 验证来源失败、跨 Space target、read 与 ack 分离、隐藏取消、所属 Window Portal、键盘/窄屏/i18n；不能只测孤立邮箱类。真实 Obsidian/CLI/Provider/五平台由用户验收，本轮全部未运行。

44 份读取/复用输入时点 SHA 见 `/tmp/huhu-t10-source-sha.json`（`aa0162acbcc885109687466b046562c733b93d5f96fb4e23acd61b984b4e0443`）。T-03 活跃路径非冻结；未读/核验其受控变异窗口的 session.ts/sessions.ts，未重跑 C。**未改仓库/正式记录/Git/用户数据，未跑 tests/build/lint/全扫描/宿主/helper/Provider，未向外部发送消息。STOPPED。**
