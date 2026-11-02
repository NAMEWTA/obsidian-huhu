---
schema_version: 2
session: "20261025T043239Z"
task: "011-foundation-go-repair"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-01
---

# T-01 Go 持久化/背压/严格 DTO 修复

## Goal
修复008独立审查STD/SPEC-01、02、04并保留全T-01合同。用户已授权完整实现与同范围修复，真实操作后验，无提交发布。你为原Go/合同owner，修复不替代独立复审。

## Inputs
Map7→当前dev及适用refs→T-01，完整读008-foundation-review/REPORT.md与raw-probes.log。旧输入evidence/T-01.md#review-input和失败双轴原文保留。实际原反例：硬链接alias在WAL commit revision2并SIGKILL后hello回1、原路径回2；54,790B合法prehello请求填满不读的stdout，stdin EOF3秒仍不退出；大写ProtocolVersion/Client/Name/Version完成hello但schema不允许。

## Workspace and Scope
同根 /home/wta/orca/workspaces/obsidian-huhu/bot，base33c21e098ef3188cbab5a09f3e0a01fadb787715。可写T-01原Go/native与contracts/hap/v0.1/**及本TASK报告日志；TS/api/ModuleId、根package/build/notices/规则、正式状态Evidence只读。TS修复owner /root/foundation_client（012），先和其冻结共享运行时validator接缝。schema是唯一合同，不能新造并行公共API。若需新运行库，先说明维护/许可/实际版本，Go module归你、npm/notice由T27受控接纳。不要写任何TS文件，生成器若需新增TS输出先与Lead/TS owner声明精确路径和生成窗口。

## Acceptance
先把四项报告中的Go反例变为真实红灯回归，再修复。1.实际DB身份必须同时保护WAL/SHM事实：可在SQLite前明确拒绝无法安全归一的hardlink，保留文件与提交，或采用有证据的共同规范路径。不能删WAL、复制旧库、静默换库或仅改期望。原路径/alias崩溃重开与存活期INSTANCE_CONFLICT都检查；正常symlink仍按真实路径安全工作。2.所有响应分支共用有界/可取消writer，真实父pipe不读取stdout且关闭stdin时Runner自行退出并释放DB锁；异常不要依赖测试父kill才通过。资源队列、bytes、超时、关闭都明确，保留原shutdown/半帧/反向关联。3.外部JSON按schema精确keys/required/type/enum/decimal/UTC/嵌套验证，DisallowUnknownFields本身不够；Go实际router与共享负向fixture一致，错误hello不ready/无副作用。

T01的61方法未来未装配继续明确拒绝，仅已装配方法宣告。严格validator选择复用已维护库/已有验证设计，必要公开来源核验；生成类型不是runtime validator。Go应用内层仍禁wire/SQL/SDK。完整foundation/Go suite、race/vet与适用schema合同检查；若Go依赖/生产源变化告知T27待最终构建，不自行触碰根资产。每项根因/修改/实际红绿证据完整，未跑OS如实。

## Return
本TASK REPORT用ASCII Session/Task/Status，必需二级标题聚焦交接/产物与验证/问题与下一步。列STD/SPEC每项处理与源码快照/原命令，return校验通过；所有writer/子进程停止后交回。不能标Ticket done、不再派遣。
