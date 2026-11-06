---
schema_version: 2
session: "20261105T094057Z"
task: "106-repair-t09-focused-pane"
kind: implementation
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-09"
---
## Goal
medium仅修103确认的两项T09 P2，保持全部其它079已审实现，不改域/服务/PTY。
## Inputs
AGENTS/dev/ui/SpecDev I、Map38/Spec/T09/UI002设计摘要49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66；用户medium实现/high审查持续。
103不可变REPORT SHA4d1335008ccf7e38e85da61464f3f23f6aeb28358487c1984961dca5e44e5dcb，/tmp/huhu-t09-high-review真实WorkspaceService.newAgent→splitPane+TerminalSession（无进程port）3红1正控制。S01 SessionInformation.tsx:17/28 waiting聚合tab横幅只activate(tab)未focus真正waiting的s0，当前focused shell仍s1。S02 :55–63 provider取tab.agentId显示Codex但其它metadata取当前shell；普通shell fallback agent.shell缺键。103已释放91源；原283DOM、28unit/default、types/lint均绿。原079/Root085叠加和真实baseline在前报告；Root正式66/tmp/huhu-t09-lead-exit-final已passed，未覆盖混合pane反例。
## Workspace and Scope
仅agent/ui/workspace/SessionInformation.tsx及必要相邻DOM/实际唯一消费者；过程/tmp/huhu-t09-focused-pane-repair。core/services/platform/api/PTY/shared/词典/Root两个fixture/资产/state/Evidence/index只读，不委派/提交/worktree或真实CLI。先真实dirty baseline/hashmode；Root旧预算两UI入口不得覆盖。
## Acceptance
定位当前真实waiting pane而非仅tab，焦点/可见投影实际指向该session，单pane正控制保留；仅已有会话定位，不隐式launch或allow/deny。会话信息provider与cwd/account/sessionId等均来自同一focused pane身份，shell不冒用tab.agentId；用现有合法en/zh键，若真缺发Root提案，不硬编码/伪造provider/model。关键await后owner/target仍有效，原pending重复阻止/terminal实例与hidemodel保留。
原真实反例转绿、正常mixed/single pane控制与必要现有DOM/types/lint适量，不扩推测状态树。仅行为改变部分验，不无差别重跑全283；worker不跑66/改产物。足够就冻结完整91复合candidate更新，Root独立审/矩阵。
## Return
不可覆盖REPORT聚焦交接/产物与验证/问题与下一步，实际baseline/finalhashmode/原红终绿/命令退出/未测边界。return0后停止写入待high。
