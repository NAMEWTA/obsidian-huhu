---
schema_version: 2
session: "20261031T062046Z"
task: "011-stop-repair"
kind: implementation
change: 2026-10-31-dev-stabilization-overhaul
ticket: T-04
---

## Goal
Astra low修复独立010 review确认的T04两个finding，保留006候选正确的Core/WAL/锁合同。Lead当前正在冻结构建；收到Lead释放写入消息前先只读预检，之后按此TASK实施。

## Inputs
当前Map revision9、Ticket04、dev/testing、spec/ADR、execution-boundaries、006 REPORT、010 REPORT全部原始两轴。原输入digest b33a8e97de87af17fb9fa0b66ebba2318d4aac89dd5285c98439ea67357425af当前为fail，修后必须新快照复审。

## Workspace and Scope
唯一current dev /home/wta/projects/obsidian-huhu，base86c500556db1d64865c4cc7f1aff1dd83de071fa。仅T04现有writable_paths内本次受影响的stdio/server.go、foundation已存在测试及必要同目录夹具；Core/WAL/api/schema不做无关重构。若新需要改合同或其他目录先报告Lead。禁止其他worker路径、shared生成物、Ticket/Evidence/ledger/旧REPORT、Git/递归派遣/真实Obsidian。

## Acceptance
STD-01/SPEC-01：所有同步batch（含重复hello+shutdown）与异步响应共用可靠受理/最终ACK/在途回复/关闭屏障；关闭准入和确认无在途请求需原子，不使用atomic计数后单独Close的竞态窗口。用held reply与合法batch构造旧输入真实失败；对最后writer与新请求受理交错用可控同步验证，不sleep扩大概率。保留EOF/非shutdown stop行为、认证、单一drain和锁所有权。

STD-02/SPEC-02：所有Go wire调用方在caller自身既定总期限内持续观察四阶段，只有finished后核对failures/persistenceComplete/profileReleased并等待退出；中间结果不是完成。duplex必须断言errors.Is(io.EOF)，读超时不是成功。新增首次未完成→随后完成的控制屏障回归；不扩大原父期限或以加大waitMs取代迁移。

先保存真实红灯，再修并定向Go/foundation/race；全量默认Go保留T06联合稳定输入，不为了改变旧观察重复全量。GOTOOLCHAIN=go1.26.10 GOWORK=off。原全量失败历史和Python缺环境保留；Lead已用uv固定工具运行Python验证0，不写回旧REPORT。

## Return
本目录REPORT.md按模板，列实际diff/命令/红绿/残余与停写快照。完成后需原独立reviewer复审，不能自标通过。
