---
schema_version: 2
session: "20261031T062046Z"
task: "027-checkpoint-preflight"
kind: implementation
change: 2026-10-31-dev-stabilization-overhaul
ticket: T-05
---

## Goal
native:/root/sources（Astra low）对T05做只读实施预检，提出最小可执行方案与红绿接缝；此任务不改产品，T04/T06停止合同联合门仍在修复，Lead再派正式实施。T09候选8项继续冻结。

## Inputs
Map16、完整Ticket05、Spec AC283/284、ADR003、dev/testing/architecture、research-and-reuse合同、T04实际阶段/Store.Close语义和Evidence，T06最新022失败及025待修复边界。禁止把T06已完成或Windows已验收当输入事实。

## Workspace and Scope
current/dev/base86c500556db1d64865c4cc7f1aff1dd83de071fa。只写本REPORT，其余只读；允许只读git、现有来源查询与轻量必要探针，不运行Go全量/重测T09或改源。无Git写入/远程CI/递归代理/真实宿主。研究如需外部材料按合同查近期活跃且许可证明确的相关项目与官方SQLite/ncruces原始来源，保留精确原始引用；不要复制不兼容代码或无目的引入依赖。

## Acceptance
追踪WithinTx→COMMIT→同步TRUNCATE、单写连接、WithinDurableTx六屏障、EraseWAL隐私截断、Store.Close唯一owner及bootstrap stop。给出adapter-owned可合并维护、背压、有限队列/实际WAL有界、停止等待/失败归属的最小设计。不能靠提高阈值或第二写连接解决；已提交业务结果不被维护错误改写、不诱导重试，FULL/NORMAL承诺不变。长读者无限维持时持续写入与固定WAL硬上限不能同时无限满足，需要明确提交前背压的合同、取消与停止行为，不能只把restartAt不断抬高叫有界。
列真实预计生产/测试/workflow/docs路径，核对都在Ticket05写集；对必要新增消费者先报告。列单一连接获得/提交/FULL/checkpoint/close-WAL采样接缝与计量重叠边界。Windows专用workflow先设计可审查候选，远程执行未授权，仅准备本地方案；最终AC284无Windows实际证据不得done。对T10模型收益与I/O收益分别重测的约束说明。

## Return
按coordination/report-template返回聚焦交接/产物与验证/问题与下一步，含具体最小改动及验证范围、潜在风险、外部来源引用/许可（若采用）。没有生产写入；等待Lead正式实施或T06复审调度。
