---
schema_version: 2
session: "20261026T045732Z"
task: "004-t08-full-cli-proof"
kind: "test-observation"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-08"
---

## Goal

Lead codex:/root。用户已授权完整18票Agent Team及代码验收，实现/定向测试使用gpt-6.1-sol/xhigh，真实Obsidian/Provider/五平台由用户执行。当前T08；本任务仅补现有研究缺失的官方Pi完整CLI main→实际loader/TUI→原始AgentSession与受控loopback服务接缝，为后续生产editor事务测试准备可复用真实fixture。不是新应用事务实现，不代表T08或真实Provider通过。不派子Agent。

## Inputs

项目根 `/home/wta/orca/workspaces/obsidian-huhu/terminal`；change `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor`。先读AGENTS/workspace/catalog；沿本次SpecDev I及dev/testing/licensing调用，但本任务没有生产写入或整票完成门。Goal §4已授权模型与团队；GP026/Map27、T08 in_progress、T01–07 done，真实DoR见evidence/T-08-dor-root-audit.json。

聚焦回读 evidence/T-08-b-producer-proof-report.md、T-08-b-producer-proof-root-audit.json、T-08-root-producer-readback.json、T-08-root-verification-plan.md、T-08-engineering-packet.md。此前B真实loader/default editor机制的2正例与7反例已验，但SessionProxy控制isStreaming/prompt，CLI main只跑--version。本任务补这一个缺口，不重新冒称已有研究是真Provider。

真实原件在 `/tmp/huhu-t08-b-producer-proof`，官方Pi1.4.0 tar SHA d155c16ef6fa00960fbf58b2911536e80b05f33700e0b14fbd08967ede0c7428，完整Pi1279文件/Jiti2.7.0共16文件已Root保存SHA；producer-profile.json及report引用完整清单、许可证和实际loader。不可改第三方原件，必要复制到自己的新tmp。现原生T07双bin `/tmp/huhu-t07-c-review-r1-linux-final-20261026T035611Z/{huhu-pty,huhu}`为0555 immutable；可只读用于fixture但绝不能据此声称T08新协议工作。可选择标准PTY设施，说明真实OS/TTY/Root process边界。

Root已实读官方 main.js/args.js/models.md/model-runtime.js：官方支持--offline / PI_OFFLINE、隔离PI_CODING_AGENT_DIR、models.json自定义openai-completions loopback endpoint。请基于真实源码构建隔离模型fixture，禁外部网络与实际账号；此前Jiti目录cache不是有效隔离，使用实际JITI_FS_CACHE=false，TMPDIR/XDG与子进程专用HOME值限定新tmp。禁止修改当前进程HOME或读用户凭证。实际子进程env使用明确最小值，不打印用户环境。

## Workspace and Scope

唯一current checkout同项目根，HEAD33c21e098ef3188cbab5a09f3e0a01fadb787715，branch NAMEWTA/terminal。**所有仓库产品源码只读，B15也未解锁**。C正写canonical/shared codec，另一个agent仅写三条profile文件；本任务只写独立 `/tmp/huhu-t08-full-cli-*` 和自己的REPORT。Root独占正式Evidence/状态/产物。冻结B15前后源摘要，初始记录evidence/T-08-full-cli-proof-input.json。不得改任何production/test文件、node_modules、package/lock、Git index或原研究；不构建插件、不提交推送发布归档。不为完成本任务扩大写集。

运行真实官方 `dist/bundle/cli.js` main，经真实loader/TUI/default editor、原AgentSession和现生产HUHU extension生成内容（允许在新tmp原样编译/写出扩展；不改原factory/handler），用户型启动已有-ne且唯一该extension。可用真实PTY键入原终端输入以建立fixture正例；不得patch editor/onSubmit/Session或用Proxy控制working。受控loopback仅替代模型HTTP服务，完整记录接口/请求/响应与真正streaming/steer观察边界，不当作真实模型或新native app通道完成。

优先一个正常中文多行提交和一个首响应仍streaming时的第二次普通输入；证明原main/会话实际收到输入与原生steer路径，再用源清单说明没有额外测试extension。若官方offline或本版本传输特性影响fixture，保留具体红灯、一次性隔离日志与最小差异实验，不无限试旗标。只启本地loopback server，固定报文/连接/输出与时间界限，退出清理全部本任务子进程。未知不伪造通过。

## Acceptance

给出实际CLI argv、精确环境白名单、原第三方/生产extension SHA、PTY入口、受控服务实现、每次UTC/退出/完整原输出/前后源快照。必须区分：官方CLI main/真实AgentSession边界已运行；受控服务而非真实Provider；此次人工PTY输入而非尚未实现的T08authenticated editor。原provider完整答案由现hook合同取得或明确尚未证明；不得以屏幕文本当完整原生答案。

所有失败记录不可覆盖，第三方原件/B15不漂移，未调用外部模型/账号；支持后续B在真正editor实现后重用同fixture，不提前建立另一产品manager。Root回读后才派B产品实现；本任务未验项保留。

## Return

通过原生collaboration向 `/root` 发必要问题/进展，最终按 `.agents/speculo/references/coordination/report-template.md` 独占一次性写入 `/home/wta/orca/workspaces/obsidian-huhu/terminal/.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/sessions/20261026T045732Z/004-t08-full-cli-proof/REPORT.md`。返回原始机器收据JSON、脚本/日志/输入绝对路径与SHA、实际结果/未验/失败、READ-ONLY SOURCE STOPPED。不得改TASK或正式Evidence，不猜日志locator。
