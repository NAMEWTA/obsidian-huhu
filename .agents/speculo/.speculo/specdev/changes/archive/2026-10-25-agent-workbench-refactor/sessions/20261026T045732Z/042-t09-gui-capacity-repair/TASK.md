---
schema_version: 2
session: "20261026T045732Z"
task: "042-t09-gui-capacity-repair"
kind: "repair"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-09"
---

## Goal

沿原codex:/root/implement_t08_profile、用户指定gpt-6.1-sol/xhigh，补齐T09 F2容量约束在原GUI新增叶路径的缺口。039已正式SOURCE STOPPED并交回原REPORT，Root接受其F1/PaneAPI窄修；后置真实探针又证实GUI splitPane/reopen会从4096保存4097。不是同一无新证据反复尝试：新可达入口和实际反例来自Root真实调用链核查。保持原writer/布局/焦点/兼容，关闭本族缺口再交统一整合。Root全18票Goal仍active，不递归派遣。

## Inputs

完整读取本任务输入 /tmp/huhu-t09-root-gui-capacity-w9qv3f9o/inputs.json SHA256 95b5f28aa4af744c2937138ce13f074de54c0c5194d02842f63a81b2a220fbf1，原039 REPORT c5561c750e57c650f2c31f0f5bdf1157ebfdd45b4ee0c01e22ffa9bb7efda584、post-report-findings.json、009实际raw/fixture/四份primary。039原REPORT不可改写；其之后实际return0见commands/011。当前14路径after SHA66eefcf1fc70d2b639d7eaa9d6c4f90f2b91bbcaa1cfdf97a6ded968d9c0d1a9。当前完整停源候选 /tmp/huhu-t09-root-integration3-prebuild-inputs.json SHA74cc783ea0cf180f9d92759ad09744f73dd542957ad172cf5527b7a395e1b494；尚无第三次Root整合命令。

按bootstrap/Map→dev/ui→T09/Goal，实际I repair/TDD/错误/资源规则；未变已读可复用。GP034/Map35、T09 in_progress/attempts2、Spec AC009/061、原工程Packet/DESIGN不变。T01–08保留；用户所有业务明确Space决定不变。无需用户新决定。

## Workspace and Scope

repo /home/wta/orca/workspaces/obsidian-huhu/terminal，HEAD33c21e098ef3188cbab5a09f3e0a01fadb787715、NAMEWTA/terminal。原A14唯一重新委托你，精确名单：
- src/modules/agent/core/workspace/model.ts
- src/modules/agent/core/workspace/ops.ts
- src/modules/agent/core/workspace/ops.test.ts
- src/modules/agent/core/workspace/pane-identity.ts
- src/modules/agent/core/workspace/pane-identity.test.ts
- src/modules/agent/services/workspace-store.ts
- src/modules/agent/services/workspace-store-spaces.test.ts
- src/modules/agent/services/workspace-service.ts
- src/modules/agent/services/workspace-service-panes.ts
- src/modules/agent/services/workspace-service-panes.test.ts
- src/modules/agent/services/workspace-service-spaces.test.ts
- src/modules/agent/services/workspace-service-foreground.dom.test.tsx
- src/modules/agent/services/workspace-service-control.test.ts
- src/modules/agent/services/workspace-service.test.ts

仅另可写本042 REPORT、新/tmp/huhu-t09-gui-capacity-repair-*证据/fixture。B/U/Root产品、正式Spec/Goal/Ticket/Evidence、旧TASK/REPORT/raw、Git/index、依赖和node_modules全部只读。共享产物、全仓build/lint/Promise、Cargo/Chrome不运行，Root统一处理。无额外worktree/提交/推送/归档。磁盘有限，重复工具/依赖字节复用039/Root已有同SHA CAS，不复制整套大闭包；实际新源码/命令/输出仍完整保存。

## Acceptance

1. 先核所有当前生产新增显示叶入口：原GUI splitPane/reopen、同步update→persistence.updateLayout、直接attach的当前/非当前Space分支，以及pane.attach/split。选择原布局owner中能完整覆盖新增候选的最小统一准入，避免只在两个按钮补if而保留下一条绕行。可复用同一全局索引/扫描规则，不另建计数cache或第二writer；必要新接口只在A14内，不扩B协议/GUI布局。
2. 所有本次新增候选在publish/save前用当前各Space已发布dirty/pending图重核4096容量；check→publish保持同步。只读/无新增的聚焦、比例、移动、幂等附加不因新增配额被误拒。允许旧超限布局沿实际GUI删除/关闭减少叶数，不能让capacity守卫阻止恢复到可查询状态；不放宽查询上限或自动删除用户叶。
3. GUI split在起点已经满额时应在创建持久Session/spawn之前准确拒绝，零新Pane/零相关持久写、旧布局和焦点保留。若异步launch期间其他Space占满，发布前再次准确拒绝；已经发生的Session/runtime事实不能伪称未发生，也不得自动stop/删除已有运行来掩盖失败。沿现有错误/通知边界准确表达，避免未处理的Promise/同步异常。reopen拒绝时保留原closedTabs记录/原图，零额外spawn/保存，不丢其再次打开机会。
4. 用原009同消费者重现绿色，同时生产测试覆盖GUI最后合法新增、满额split/reopen拒绝、跨Space等待期间名额变化、已有会话重复attach不耗额度、关闭释放后再打开成功。新增路径如原public attach会绕过也补必要回归；F1非活动group/原foreground consumed、原dirty/base/pending/取消/effect风险必须保留。测试走真实原服务/Store，不重写算法或mock关键owner，不删旧断言。
5. 定向完整A owner/原GUI/foreground回归、标准测试types与改动生产lint在源稳定时运行；保存真实argv/cwd/UTC/exit/raw、实际消费闭包/前后hash及红绿。原009红可复用，不为形式重复同字节。仅清本任务fixture，SOURCE STOPPED后Root再freeze/build/CLI/DOM/Chrome/独立完整两轴。真实Obsidian/Provider/OS IME/五平台仍由用户验收。

## Return

完成全部本范围入口核验后先停源，无覆盖原子写 /home/wta/orca/workspaces/obsidian-huhu/terminal/.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/sessions/20261026T045732Z/042-t09-gui-capacity-repair/REPORT.md，标准三节及真实路径/API/红绿/限制/资源清理齐全。实际validate-dispatch --stage return并保留raw/exit后原生返回SOURCE STOPPED。Root唯一正式验收owner；本候选通过不自动T09 done。发现合同/写集缺口先报告，不在停源后覆盖旧报告。
