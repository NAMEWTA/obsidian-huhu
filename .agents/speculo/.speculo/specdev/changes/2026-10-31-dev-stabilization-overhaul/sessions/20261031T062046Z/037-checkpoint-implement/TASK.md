---
schema_version: 2
session: "20261031T062046Z"
task: "037-checkpoint-implement"
kind: implementation
change: 2026-10-31-dev-stabilization-overhaul
ticket: T-05
---

## Goal
native:/root/sources（Astra low）实现T05有界维护候选与本地验证，准备Windows测量。T04/T06最终联合门已通过：Lead真实67项TS↔Go、Go生产输入未变全量证据、wave4构建。维护owner按已冻结停止合同闭合，不更改T04核心。Windows无远程授权，完成可审查workflow/测量程序后交Lead。

## Inputs
Map19、Ticket05完整含D01、ADR003/AC283/284、027预检真实调用链/官方引用、T04/T06最终Evidence、dev/testing与research合同、execution-boundaries、T09基线。已有未变规则与研究可复用。仅使用Go1.26.10、GOWORK=off。

## Workspace and Scope
current/dev/base86c500556db1d64865c4cc7f1aff1dd83de071fa。允许写Ticket05当前base/**、.github/workflows/huhubot-storage-windows.yml、docs/huhu-bot-performance.md、docs/e2e/dev-overhaul/storage/**，以及D01精确加入的portable/store.go、portable/backpressure_test.go、assistant/store.go、assistant/checkpoint_test.go、bootstrap/checkpoint_stop_test.go。bootstrap/core.go、purge生产、T09原8项/指标与TS/wire只读。其他源码/正式Ticket/Evidence/Map/ledger/共享产物只读。无Git写入/远程CI/递归代理/真实宿主。修改前给出落实D01后的最小影响计划。

## Acceptance
单一Store maintenance owner、合并wake容量有界、准入等待有界、无每次commit匿名goroutine或第二writer。COMMIT成功即业务成功，维护失败/超时不得改写或重试业务。保留FULL六屏障及还连接前NORMAL恢复/坏连接处理。所有生产写事务（含portable）统一准入，取消caller仅退出观察/等待，不停止owner。
长读者按D01证明：高水位后新work不进入，单个已准入事务可越阈值但之后连续请求不再追加；用真实pinned reader与实际WAL证明，补单大事务越阈值和后续阻挡断言，明确无固定硬字节上限。不引入VFS预算wrapper。不要动态抬阈值掩盖busy，维护重试由单owned定时器负责，阻塞者不占唯一连接使worker饿死。
EraseWAL强制TRUNCATE成功条件和cleanup-pending不能被普通maintenance吞并。assistant.delete既有privacy意图保留：已提交结果不变，强制清除义务不能丢/静默忽略、实际canary验证；先说明最小owner状态和失败观察设计，如需改变外部API/新增持久化表则先报告，不自行扩展。Store.Close先封新准入、等在途/maintenance并停止其定时器、实际WAL sync/db.Close；等待者期限不释放owner/Profile。Core停producer阶段maintenance仍可服务，避免自锁，永久reader的可用性边界诚实记录。
真实Go接缝验证COMMIT已返回而checkpoint受控held、失败不重放work、队列合并/背压、普通/FULL/portable入口、privacy、close并发与sync失败继续收尾。保留旧测试的机制覆盖，按新合同改同步假设而不是删断言。新Windows测量仅准备，固定模式/阈值/reader矩阵及phase定义、实际恢复子进程所有权。考虑新workflow首次默认分支注册问题；T12正准备专用临时分支push方案，参考后向Lead报告确切安全触发范围，不修改别的workflow。
先定向base/consumer，再必要purge/bootstrap/foundation。Lead最后全量/bench；本地性能观察避免与其他Go重测重叠，发消息协调。外部材料使用处保留原始引用。模式/阈值只为候选，Windows未测不能验收AC284，不能夸大I/O收益。

## Return
标准REPORT及精确SHA、真实命令/退出、红绿与机制证据、分阶段测量、输入/限制与候选Windows计划。候选停写交独立review与Lead，不能标done或写正式Evidence。发现失败先修本票引入问题，不提前停在建议。
