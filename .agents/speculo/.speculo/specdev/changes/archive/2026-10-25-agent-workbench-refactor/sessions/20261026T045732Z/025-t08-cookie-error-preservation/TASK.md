---
schema_version: 2
session: "20261026T045732Z"
task: "025-t08-cookie-error-preservation"
kind: "implementation"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-08"
---

## Goal

沿原codex:/root/implement_t08_profile、gpt-6.1-sol/xhigh，窄修021独立R4唯一F7：nativeCookieReader的request与最后release同时失败时保留两份原错误。Root编排/最终验收，你只交候选。022只读准备已交回并STOP，本025是新独立任务，不覆写旧TASK/REPORT。完整18票用户授权持续，不向用户再问已授权工程选择。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/terminal；change .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor。HEAD33c21e098ef3188cbab5a09f3e0a01fadb787715、branch NAMEWTA/terminal；同一change-workspace。GP032/Map33，T08 in_progress，恢复周期1attempts2，下一Root整合3；原周期3及所有失败历史保留。T09未解锁，024只是其它owner只读研究。

先按bootstrap/Map→dev→当前T08 Ticket→Goal读取，复用已读未变规则；调用specdev-i-implement权威入口及相关codebase-design/design-it-twice/TDD/error-handling/test-reliability。外部行为为Spec/implementation-contracts，本文与Root packet只是实施约束。无UI改动、不改DESIGN，不启动新的产品访谈。

必须完整读 evidence/T-08-cookie-failure-packet.md（SHA2569bca290f1000966f64e2aa101ebed71bd61d8c24dbd732d1d77c68fb541f8229）、T-08-write-allocation-r6.json和T-08-cookie-failure-replan.json；以Root实际派遣提供的冻结manifest为当前输入。R4原REPORT sessions/20261026T045732Z/021-t08-full-review-r4/REPORT.md SHA256c72d0496569781666f16c138da534994b80adae023e98927a00d4f8c832c927b、Root接收T-08-review-r4-root-audit.json SHA256aa4aa329d16bc9100936d18f1f9dd1973fc8d5998c09927e5cc3ec451f7f8a91。F1–F6已经关闭，不回退。

正式F7原件 /tmp/huhu-t08-full-review-r4-astra/cookie-dual-error-observed.ts/stdout/receipt及inputs，stdout SHA2564fefb3179704925b0198da99acc33cc5823681ba413a314d6c00009b4f6b7317。实际同次native cookies-result是读取失败；公开结果只有cleanup失败、无cause/errors。仅将Cookie lease准入后的原PTY释放顺序协调成合法最后owner，不mock结果。原件全只读，可复制到本次新短/tmp证据根形成自己的原红/绿。

## Workspace and Scope

仅以下3产品路径由你唯一写：

- src/shared/native/cookies.ts
- src/shared/native/cookies.test.ts（拟新增）
- src/host/desktop/native/host.integration.test.ts

允许本025 REPORT与全新/tmp/huhu-t08-cookie-repair-*证据/fixture。其余全部产品（包括Host/Helper/shared host、Rust、协议、UI、原C33）、旧证据、正式状态/Map/Ticket/Goal/Spec/DESIGN、Git/index、node_modules、Cargo target/缓存、已有bin只读。禁止根build/main/styles/budget/notices写入；Root独占后续产物。若确需新路径先报告具体实际缺口，不先越界。只读研究无需安装或新依赖。

017只读pair /tmp/huhu-t08-native-shutdown-linux-20261026T115900Z/huhu-pty SHA950b1832947eaa287ef9c03499e9574a61ee7b7c4845a31ff422a350ce3af843（31119408B/0555），同目录huhu SHA63db57114503eaedf757c6c087eef8c0c268d393dc86b58035de51c67fdacd74（15428448B/0555），producer SHA5d82fd3794c4109fbd02151e5d41e69adb67310bbff667c0dc03f40ac626f7c3（0444）。不重建Rust、不替换pair。

## Acceptance

1. 改生产前通过真实nativeCookieReader建立双失败目标红，原始输出保留。采用原owner最小双结果处理：唯一request、唯一release；成功原结果、仅读失败原对象、仅cleanup失败原对象、双失败两份原对象与primary cause均可观察。message保留原读取诊断以便现有上层使用；不静默吞cleanup，不自动重读。
2. acquire失败不release未取得的lease；原lifetime/signal监听所有路径移除。取消/关闭也保留原原因与清理失败，尚未完成清理不提前返回。测试要观察错误对象、结果、次数及监听清理，不能只断言mock调用而忽略目标语义。
3. 在既有host.integration增加实际公开reader→Host→Helper→017pair的双失败链，记录同次真实Cookie回包、公开AggregateError/原cause与NativeShutdownError.outcome。使用自己缺失或有效SQLite、自己短0700 runtime与已知endpoint；sentinel身份/内容、进程退出、原F6准确失败与下一明确acquire边界保持。不要复制Host实现或mock request结果。原SQLite锁/Agent关闭仍不影响Cookie读取的真实用例保持通过。
4. 原红、最终定向单位/真实集成、生产/测试类型、自身生产lint与return有真实argv/cwd/UTC/exit/raw及来源/工具/实际编译闭包/CAS。所有输入声明基于当时真实读到的内容，不用结束时源码追补。新增temporary root及PID/socket/inode在清理前记录，只清自己fixture；不能用外部删除当产品成功。当前全局typed源未变，不要求重复全native/全仓/Chrome。
5. SOURCE STOPPED后交候选，Root再接收并执行恢复周期1attempt3、实际产物和必要消费者组合、完整91路径独立R5。你的测试通过不代表T08或整个Goal完成。真实用户Obsidian/Provider/OS IME/五平台未运行；无真实Cookie/账号/Vault读写、提交、推送、发布或归档。

## Return

原子写本025 REPORT.md，Session/Task/Status有效，含“聚焦交接”“产物与验证”“问题与下一步”。列实际3路径before/after/hash/mode、设计取舍、原红与最终绿、全部命令/闭包/资源、未验证和剩余问题。不要改022/021等旧报告，也不创建永久ADR/context。写后实际执行return结构校验存raw，再明确SOURCE STOPPED通知Root；原报告不得预填尚未执行的return通过。
