# 群路由与调用树恢复研究接纳

Root 实际派遣 045-group-recovery-preflight，收到 /root/foundation_research 的真实 MESSAGE 和 FINAL 后，完整回读 REPORT（截断中段已分段补读），亲自运行 return 校验 exit 0、errors/warnings 空，并核对报告 SHA-256：aad36067a904b2846a227286f60eece97db18183ae3c64b8911b88abbba9ccbf。原报告：sessions/20261025T043239Z/045-group-recovery-preflight/REPORT.md。作者停写、所有自有命令退出，无产品执行或修改。

这是后续实施研究，不是 T13/T16 的验收。实现中的 sqlite/execution/executor.go 和 sqlite/events/store.go 观察失效记录完整保留；后续先回读固定实现。T02 配置/pin 原 owner 是 foundation_go，041 的表格误标不沿用。

后续派遣须落实：T07 最早处理实际反向 Host RPC 的有界结算、取消隔离及回执核查；T11/T12 联合窗口建立真实工作线程、调用树、逐模型请求预算，以及 T13 所需最小持久子树屏障；T13 当前成员/历史谓词进入同一物理发送 fence，包含无 SourceRefs 的群正文；T16 区分正常审批 continuation 和运行过的树用户恢复，核查资格、代数、Resume 都有实际消费者。21 项故障矩阵是未运行计划，不能当通过证据。

真实 Provider、Obsidian 和用户目标 OS 保持 user-owned / not-run；不再请求凭证、不新增审批、不触碰已有系统 keyring。

## 060 当前调用链补充接纳

Root 已收到 foundation_research 原生 MESSAGE+FINAL，完整回读 REPORT 与 interfaces-and-owners.md，亲自 return0，并核对九项工件字节/摘要及原 TASK；回执见 060-lead-return.json。REPORT SHA256 8be43aba0b18b3663d35011aa78d8afccd44679ff4ba7016c304dbe6ccd76d7a。它补充现有 T11/T12 接缝研究，不是 T13 实施或验收。最终 usage/finalize.go、collaboration/store.go 已漂移且未回读，相应旧观察只作索引；取消/partial 缺口已转原 owner 当前窗口修复，不能再称当前未修问题。

下窗必须明确可信用户批量受理边：显式 @B/C 不能伪造 A 的 Engine claim、模型或来源 Grant。A 无模型、无 B/C 来源 Grant 或无模型委派 allowlist 时，只要目标各自资格和授权成立，仍须零 A 调用；任一目标失败同 Tx 全拒绝。群编排根复用既有执行器/树/预算，公共发布和父模型结果分开；当前成员 incarnation/history 谓词须贯穿模型 Context、真实 Dispatch、结果发布及物理投递，即使无 SourceRefs。候选精确维护路径及未运行场景见研究附件，由原 owner 冻结真实合同后实施。
