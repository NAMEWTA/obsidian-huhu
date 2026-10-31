---
schema_version: 2
session: "20261026T045732Z"
task: "003-t08-artifact-profile"
kind: "implementation"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-08"
---

## Goal

Lead codex:/root；你是本次新的 profile 实现者，用户指定 gpt-6.1-sol / xhigh。用户授权完整18票 Agent Team 和代码验收，真实Obsidian/Provider/五平台 E2E 由用户执行。当前唯一活动票T08；只完成官方Pi安装完整文件集核验三路径候选，不代表T08完成。不再派子Agent、不提交/推送/发版/归档，不操作真实库/HOME/账号。

## Inputs

项目根 `/home/wta/orca/workspaces/obsidian-huhu/terminal`。change `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor`，本TASK中的相对evidence路径均相对该change。先读AGENTS/workspace/catalog，按Map背景/Skill矩阵 → 实际dev Skill及architecture/licensing/testing → 本票ticket/08-terminal-coordination.md → Goal §4；执行真实 `.agents/speculo/workflows/specdev/specdev-i-implement/SKILL.md` 的procedure/preflight与本阶段TDD/coordination。沿 GP026/Map27，现T08 in_progress，DoR三命令已通过，上游T01–07 done；完整工程合同见 evidence/T-08-engineering-packet.md、T-08-editor-transaction-decision.md。

初始before为 evidence/T-08-dispatch-input.json，SHA7b2096e05c302df7519f8a80e13925399f19fb7071e2b3420884e65239ad2137。新的真实输入为 evidence/T-08-profile-input.json（派单消息给精确SHA）：Root已回读并仅接受当前C实际NativeEditorFileIdentity/NativeEditorRecipe子接口；完整generated文件仍由C追加，不能把全文件宣称冻结。禁止手抄同名DTO，type import实际shared导出即可。

前序A八路径已SOURCE STOPPED并Root接收，先看 sessions/20261026T045732Z/001-t08-business-stage1/REPORT.md；Root audit evidence/T-08-a-stage1-root-audit.json SHA0612256a5575f867deea1f0fa65f81e824e8f0e2b98299fdee3012187ca46c91。你不得修改其八路径。B完整producer报告及Root audit是已验证研究，不是整条产品正例：evidence/T-08-b-producer-proof-report.md/.json、T-08-b-producer-proof-root-audit.json；原官方Pi1.4.0、Jiti2.7.0在 `/tmp/huhu-t08-b-producer-proof`，profile为其producer-profile.json SHA2e33cbe021af96a1de8b462064a667448be244b8c0bc8408aa178c163465ab48。Pi1279普通文件23419059B、Jiti16文件1751293B，两者完整摘要与许可原件已Root核对；读取原件，测试修改必须复制至自己的新tmp，不改第三方原件/用户安装。

## Workspace and Scope

复用上述唯一current工作区，branch NAMEWTA/terminal，HEAD33c21e098ef3188cbab5a09f3e0a01fadb787715。**仅三条产品写集**：

- `src/modules/agent/platform/desktop/agents/program-identity.ts`
- `src/modules/agent/platform/desktop/agents/program-identity.test.ts`
- `src/modules/agent/platform/desktop/agents/pi-artifact-profiles.json`

仅可另写自己的REPORT与独立 `/tmp/huhu-t08-profile-*`。C独占shared/canonical/native，B后续独占Host/helper/extension，原A其他业务/UI仍未解锁。Root独占正式状态/Evidence和main.js/styles.css/budget/notices。禁止launcher、sessions、controller、hooks、package/lock/node_modules、Git index、根build及全仓lint写入；未列路径只读，需要扩大先报Root。

实现一个懒加载、有限文件/字节/耗时的完整artifact verifier，产物供后续launcher明确消费。profile仅保存可移植的相对路径/版本/字节/SHA与固定来源，不把 `/tmp`、主机绝对resolved路径或实验status写入生产JSON。严格核Pi官方完整文件集和bundle实际resolution得到的完整Jiti，不能只信version/package.json/薄入口文件，也不得随便挑最近node_modules。已安装CLI路径可先realpath解析；包内未知额外源/链接/缺失/替换/容量超限要准确不支持。独立node_modules边界和包管理器布局须基于实际官方loader机制，不能宽松跳过另一个可执行依赖。遍历、读取和Hash均先用审定profile有限预算；不保留无限cache，不自动装依赖/升级/改用户启动参数。

返回真实shared NativeEditorRecipe时，executable与entry为实际最终启动输入的realpath+十进制dev/ino；artifactDigest绑定完整Pi/Jiti审定闭包。Node解释器解析必须与最终env/PATH和直接启动方式一致；未知wrapper/不支持平台/不确定解释器或影响loader的配置准确返回不可用，原人工启动能力由后继继续保留。没有实际最终env时不以当前Codex进程环境假定用户环境。这个核验不是对Node二进制的官方认证，也不是hash到提交的原子安全保证。用户原有-ne/--no-extensions且仅HUHU扩展是后续接线合同，不能在这里静默加flags或清除用户扩展配置。

冻结这三条before（实际当前缺失）及真实读依赖；每个风险接缝保留可失败的真实red→green、argv/cwd/UTC/exit/完整log/前后source SHA。新tmp不覆盖旧失败、既有研究或原不可变bin。用户明确所有新业务须显式Space，旧入口先选、后台缺配置失败；本阶段不启动业务，不猜Space。

## Acceptance

使用真实官方文件原件/独立副本验证完整正例、薄CLI未改而内部源码变化、实际Jiti变化/错解析、缺文件/多文件/链接、最终entry/Node identity、超额/取消/期限等有意义反例。fixture可在新tmp重建，原件只读。测试不得冒称Provider/PTY/editor已接通；禁止伪造包版本/极小自造文件表作为唯一支持正例。定向Vitest与生产文件lint、隔离入口tsconfig类型检查，Node实际 `/home/wta/.volta/tools/image/node/26.11.1/bin/node`，pnpm由其执行 `/home/wta/.volta/tools/image/packages/corepack/lib/node_modules/corepack/dist/pnpm.js`。官方artifact缺失只阻塞该正例，报告真实边界；根集成/build/独立review由Root在整票writer停止后运行。

交付后SOURCE STOPPED；API须简洁说明后续如何给最终file/args/env/cwd并消费返回值/准确拒绝，不猜尚未交付B DTO。不用测试hook在生产中替换正式profile来声称实际支持。

## Return

问题/进度通过原生collaboration发给 `/root`，最终按 `.agents/speculo/references/coordination/report-template.md` 独占一次性写入 `/home/wta/orca/workspaces/obsidian-huhu/terminal/.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/sessions/20261026T045732Z/003-t08-artifact-profile/REPORT.md`。不得改TASK或其他报告/正式Evidence。返回真实身份、精确三路径差异和SHA、所有收据/原日志、实际API、未验项及SOURCE STOPPED；Root验收后再解锁后续集成。不生成猜测的session-locator。
