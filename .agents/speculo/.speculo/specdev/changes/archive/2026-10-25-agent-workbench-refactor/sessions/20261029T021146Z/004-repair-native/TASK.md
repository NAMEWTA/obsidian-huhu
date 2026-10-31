---
schema_version: 2
session: 20261029T021146Z
task: 004-repair-native
kind: implementation
change: 2026-10-25-agent-workbench-refactor
ticket: T-18
---

## Goal
Lead codex:/root；GP-044 / Map41；在同一T-18最终集成修复窗口内承担原生/CLI与Hook生命周期，只修已授权整体报告反例和同范围回退。你是新的Sol/xhigh实现者，不承担独立审查，不递归派遣。成功是全部分配反例的正式回归通过，真实行为与Spec一致。

## Inputs
先读取 tickets-map.md 的实施背景和Skill矩阵→项目dev/ui适用Skill→ticket/18-platform-acceptance.md→goal-plan.md；路径均以change根.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor为基准。实际I入口 .agents/speculo/workflows/specdev/specdev-i-implement/SKILL.md 及必要预检/TDD/设计/错误/可靠性参考必须遵守。相关权威spec.md、DESIGN.md、implementation-contracts.md、ADR.md已获批，不修改其决定。首轮原始报告：../001-final-native/REPORT.md；其中/tmp反例脚本可读作参考，转为正式测试应断言正确行为而非断言bug发生。Lead恢复来源与37路径见evidence/final-merge-recovery.json；HEAD仍78102da，已有本轮未提交改动，不覆盖其他writer。全量初始验证见evidence/final-initial-checks/results.json，types/lint/Vitest等已确认红；不能把编译/夹具错误当新行为red。

修复 F2–F5，F1 已由Lead恢复37源文件。CLI文件先限制读取、stdin可按deadline/取消退出、agent prompt和terminal send-text支持与message send一致的三选一text/stdin/file，保持正文长度UTF-8与机器错误语义。Hook真实崩溃后不能永久阻断默认新运行；保留活owner不抢锁，使用能证明安全的既有owner/OS资源或隔离运行代次方案，不能单按年龄删锁、只补日志或无限重试。所有对应生产调用点及实进程反例需正式回归。新UI词条如必须更改agent/i18n.ts，仅将具体en/zh键块交Lead，禁止与workbench writer同写。不得把runtime Hook修复改造成守护进程或全新服务。

## Workspace and Scope
唯一current工作区 /home/wta/orca/workspaces/obsidian-huhu/terminal，branch NAMEWTA/terminal。允许路径（加同目录就近回归测试；新增具体路径先消息Lead）：
- native/pty-server/src/cli.rs
- native/pty-server/src/bin/huhu.rs
- native/pty-server/tests/cli_input.rs
- src/modules/agent/platform/desktop/hooks/**
- docs/agent-workbench-cli.md

只有本TASK给定范围可写，不修改TASK/原报告/正式Evidence/README/Map/Goal/Spec/DESIGN/Git index/用户数据/产物main.js/styles.css。其他两位writer按004/005/006非冲突范围同时工作；Lead独占所有根产物、共享协议生成与全量检查。Rust定向构建/测试设置CARGO_TARGET_DIR=/tmp/huhu-004-repair-native-cargo，勿cargo fmt全树，勿触碰另一Rust writer源文件。发现需要共享路径立即通知Lead并等待分配，不猜测扩大。没有提交/推送/发布/真实库迁移授权。

## Acceptance
从真实生产入口或稳定公开接缝建立能暴露每项bug的red，再修复green，保留真实命令/exit与风险观察；既有回归覆盖可复用，不删除/放宽测试制造绿色。运行本范围定向测试；生产TS变化按dev要求lint/type最终由Lead全局串行，局部可查自己文件。不要运行build/全量Vitest/共享全局脚本。产物与真实浏览器验收、最终全局检查、独立双轴复核由Lead在源停写后负责。真实宿主/Provider/五平台E2E由用户，不能声称通过。若上层合同冲突或同一blocker无新证据则停止该分支并回报，独立项继续。

## Return
准确报告 .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/sessions/20261029T021146Z/004-repair-native/REPORT.md，Session/Task/Status首部，交付时不覆盖原子落盘并回读。含完整修改路径、每项finding→修复/测试、red/green事实、实际命令退出码、未验证项、源是否停止。仅候选交回，不自行done/verified。通过原生消息向Lead确认REPORT路径及一句话；不创建定位文件或伪造旧会话身份。
