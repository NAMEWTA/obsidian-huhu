# Change-local ADR

仅 accepted-from-source/user 项视为已确认约束；conditional 项保留条件。没有声称已实现，也不写永久 ADR。

## ADR-001：唯一 Pi harness；不保留旧 Bot 兼容路径

- 状态：accepted-from-source；依据：Issue §0/§6/§15。
- 决定：直接依赖精确 Pi SDK；HUHU 拥有业务 policy 与交付，Pi 拥有模型工具循环、会话、分支和压缩。
- 真实备选：旧 Go 外挂 Pi；复制 loop；同时保留两套 runtime。
- 理由与代价：避免双重调度/上下文/重试真相；代价是断代与全部消费者原子切换。
- 范围与验证义务：T-01 SDK 接缝、T-23 删除闭包、A03/A07/A28。
- supersedes：无；首次本 change 决定。技术事实推翻时新增 ADR，不就地改历史。


## ADR-002：独立模块与宿主/运行侧分离

- 状态：accepted-from-source；依据：Issue §1/§4/§5。
- 决定：保留 src/modules/huhubot；core 纯 TS；UI 发命令，runtime 拥有 state；Host Executor 持有业务 API 和 live leases。
- 真实备选：全局 src/bot 平行框架；UI 直接 fs；序列化执行函数。
- 理由与代价：沿用模块边界且支持未来 transport；代价是 DTO、校验和取消传播。
- 范围与验证义务：T-02 依赖检查、T-04 lifecycle、api-contracts.md。
- supersedes：无；首次本 change 决定。技术事实推翻时新增 ADR，不就地改历史。


## ADR-003：utilityProcess 为带硬门禁的首选

- 状态：conditional-from-source；依据：Issue §6/§7。
- 决定：只在 P0 真实插件安装目录证明主进程/app-ready/Node/ABI/资源闭包后采用。
- 真实备选：直接当 Obsidian 支持；静默外部 Node；renderer 重负载；旧 Go fallback。
- 理由与代价：故障隔离但不是代码沙箱。失败须先形成单一路径 ADR 和最低宿主要求。
- 范围与验证义务：T-01 四平台矩阵；未测不可标 Ready，见 acceptance-plan.md。
- supersedes：无；首次本 change 决定。技术事实推翻时新增 ADR，不就地改历史。


## ADR-004：四类存储权威与效果对账

- 状态：accepted-from-source；依据：Issue §2/§8。
- 决定：Pi JSONL 是 transcript；state.sqlite 是控制与确认事实；outbox 导出审计；index 可重建。
- 真实备选：全部 SQLite 都可删；所有事件硬塞 Pi；跨 DB/文件天然 exactly-once。
- 理由与代价：可解释恢复，保护审批/预算；代价是检查点与 reconciliation。
- 范围与验证义务：T-06/T-07/T-14 故障注入和 data-contracts.md。
- supersedes：无；首次本 change 决定。技术事实推翻时新增 ADR，不就地改历史。


## ADR-005：第一条写工具前完整安全链

- 状态：accepted-from-source；依据：Issue §10/§11。
- 决定：单一 Gateway，授权交集、recipient、审批 hash、预算、幂等、live lease/source revision，Host 最后拒绝。
- 真实备选：先开放 bash 后补安全；只在前端藏工具；天然信任 MCP schema。
- 理由与代价：阻断旁路和 TOCTOU，增加工具集成成本；不承诺无沙箱任意代码隔离。
- 范围与验证义务：T-07 敌对矩阵，T-08/T-09 真写回执。
- supersedes：无；首次本 change 决定。技术事实推翻时新增 ADR，不就地改历史。


## ADR-006：树、运行与通信分离

- 状态：accepted-from-source；依据：Issue §2/§12。
- 决定：entry ancestry / run lineage / mailbox links / composer queue 独立模型。
- 真实备选：Pi parentId 同时表示委派；拖线改历史；消息送达自动根成功。
- 理由与代价：数据语义稳定；代价是三种投影和显式映射。
- 范围与验证义务：T-15/T-16/T-17；collaboration.md。
- supersedes：无；首次本 change 决定。技术事实推翻时新增 ADR，不就地改历史。


## ADR-007：事实记忆优先，向量不做真相

- 状态：accepted-from-source；依据：Issue §11.3。
- 决定：事实+标签+FTS5，自动抽取待确认，来源/权限/tombstone；向量仅后续派生。
- 真实备选：embedding 必选；删除向量等同遗忘；MemoryBackend 接管 SessionStore。
- 理由与代价：本地可解释、避免额外远程数据流；代价是检索质量需 CJK/英文夹具。
- 范围与验证义务：T-13；Hana FactStore 的 CJK 机制可适配，耐久参数不照抄。
- supersedes：无；首次本 change 决定。技术事实推翻时新增 ADR，不就地改历史。


## ADR-008：复用 DESIGN-0002，不产生新品牌体系

- 状态：accepted-from-user；依据：本轮用户 + 现有 UI-001 / DESIGN-0002。
- 决定：继承 A 行内主操作、B 设置分组、C 等宽标识；复用语义色、圆角、密度和 shared controls。
- 真实备选：另做三个无关样式；默认流程图首屏；大渐变、发光、胶囊泛滥。
- 理由与代价：与全插件保持一致；实际新原型仍需单独确认。
- 范围与验证义务：T-03 人工确认 + T-22 宿主可访问性；DESIGN.md。
- supersedes：无；首次本 change 决定。技术事实推翻时新增 ADR，不就地改历史。


## ADR-009：MCP 只有一套 client owner；版本先核实

- 状态：conditional-from-source；依据：Issue §14 + R-008。
- 决定：先验证 Pi MCP 全链 policy coverage；满足则复用，否则官方 SDK 单适配器；Server 默认关闭，标准 transport 单一选型。
- 真实备选：自写协议；多套重连发现；把 SDK v1/v2 和不同 protocol snippets 混用。
- 理由与代价：减小重复基础设施；代价是需互操作测试和外部身份/授权设计。
- 范围与验证义务：T-20/T-21；2025-11-25 保留为 Issue 参考，不叫最新。
- supersedes：无；首次本 change 决定。技术事实推翻时新增 ADR，不就地改历史。


## ADR-010：无自动旧数据迁移与删除

- 状态：accepted-from-source；依据：Issue §0/§15。
- 决定：新格式独立本地根；旧数据默认不动；显式清理有预览、范围与确认；备份可恢复。
- 真实备选：启动即删旧 DB；旧格式自动读成新；全 native 目录一刀切。
- 理由与代价：遵守无兼容与用户数据保全；代价是用户可见旧数据说明。
- 范围与验证义务：T-14/T-23/T-24；禁止误删 agent/PTY/Browser/通用安全服务。
- supersedes：无；首次本 change 决定。技术事实推翻时新增 ADR，不就地改历史。


## ADR-011：本轮只规划与原型，不隐含实施

- 状态：accepted-from-user；依据：sources/user-request.md。
- 决定：生成全部规划票和 plan-only Goal；本轮 PR 只提交 change 内 docs/prototype，不关闭 Epic。
- 真实备选：用户要求文档却提前改生产；把 read skill 当全部门禁通过。
- 理由与代价：可提前评审重大取舍；代价是 P0 与 UI 意图批准需后续证据。
- 范围与验证义务：全文件路径白名单；PR-DRAFT.md 无 Closes，ready_for_execution=false。
- supersedes：无；首次本 change 决定。技术事实推翻时新增 ADR，不就地改历史。
