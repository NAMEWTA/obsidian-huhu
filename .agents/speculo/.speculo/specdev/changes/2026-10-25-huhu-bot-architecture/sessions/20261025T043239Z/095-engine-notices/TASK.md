---
schema_version: 2
session: "20261025T043239Z"
task: "095-engine-notices"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-27
---

# T27 Chat实际依赖许可维护

## Goal

按当前真实默认Chat消费者和固定依赖补齐Go运行时许可、来源与生成通知；本次只交付许可维护，T27全票仍等最终全部生产输入与G5。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715。复用Map22/Goal21、T27当前实施状态、LOG051代码交付边界及已接纳T16/G1。用户授权28票55AC完整代码和Agent Team，真实Provider/Obsidian/目标OS由用户后验；不请求凭证，不提交、推送、发布或归档。原owner native:/root/build_integration，延续既有实现模型偏好，不再委派。

按AGENTS workspace/catalog→SpecDev I预检与实施、dev许可/测试/构建、当前T27和Chat联合窗口读取，复用未变规则。此次没有UI或Skill修改，不展开无关UI验收。正式Evidence/Map/Goal、他人TASK/REPORT、永久ADR/context只读。

Chat联合窗口：evidence/T-08-logs/engine-chat-window-map22.md，SHA ca9ae6fa9e9e50720c4f93a705510d9726df87d525ea5ea6ad2a14610f712f8c。私有合同：evidence/T-08-logs/chat-private-contract-map22.md，SHA 9307d175c163b01a1bbfc9c014f31e710ae86ab4d70584513ea185e56715a3c6。092/093/094已实际运行真实SDK本地HTTP、默认CLI私有凭证管道和预算消费者，但整票审查仍pending，不把局部结果写成全票完成。

093的logs/08-actual-runtime-module-handoff.json是真实Linux amd64 CGO0生产cmd编译闭包（413包/38第三方模块），不是最终五目标union。当前go.mod SHA69c9b24a9265a7d8295aedaa1eb0f8594fd08336b3002a9f334fd3c6ba499632，go.sum SHAa5547b752487c8ab3e116b95f30d95f460ca58e3a7a0c6487a2a1272f89b3937。四个实际固定SDK：eino v0.9.22、eino-ext/components/model/openai v0.1.13、eino-ext/libs/acl/openai v0.1.18-0.20260924031408-10df7cac3f6d、meguminnnnnnnnn/go-openai v0.1.6。047/087研究只供固定来源定位，不把研究整锁复制为生产图。

## Workspace and Scope

仅scripts/huhu-bot-notices.mjs、scripts/huhu-bot-notices.test.mjs、docs/third-party/licenses/go/**、docs/third-party/huhu-bot.md、docs/references.md、NOTICE、THIRD-PARTY-NOTICES.md，以及本任务REPORT/logs。T01独占Go锁/装配；T08独占common/chat；不得为迎合生成器修改源码、依赖锁或模块缓存。其他共享Skill/AGENTS、根lock、UI、main.js/styles.css和发行资产本轮不写。真实需要新路径时先报精确事实，由Root协调原owner。

先在无需Go的许可证与生成器维护阶段工作。Go五平台编译闭包、完整notices生成/检查、根build等重检查须等Root唯一窗口和092实际稳定通知；不与其Go/race争用或在半写生产上采集闭包。独立轻量Node工具测试可以运行，保留真实输入和完整exit/Wait。共享脚本和通知由你单writer。

## Acceptance

1. 从真实五个拟发行目标的cmd/huhubot go list -deps编译闭包登记确切版本、checksums、完整LICENSE/COPYING/NOTICE和嵌入代码义务；不把MVS全表、测试或未消费研究依赖列成发行包含。实际工具链统一GOTOOLCHAIN=go1.26.10，目标CGO按现有构建合同。
2. 来源缺失时使用固定commit和内容摘要保存原许可，生成时不联网浮动获取。未知模块、缺许可、版本或哈希不匹配仍明确失败；保留实际正反例，不放宽现有fail-closed校验。
3. 回读真实生产桥代码并准确区分调用依赖、源码借鉴和实际改编。当前直接Ext.Stream没有复制整个SDK桥；不得虚构包含完整Runner或adapted code。若发现实际改编必须记录具体文件、上游路径/固定commit、版权与完整许可。
4. 中文当前维护文档从“研究依赖”更新到真实采用事实，原许可原文保持。NOTICE是main.js真实横幅输入：若变更，报告确切需要重建的产物，Root后续安排串行重建，不把Go-only当可跳过理由。
5. 生成通知及一致性检查、相关工具测试在稳定候选通过，原始命令/输出/失败/Wait与自有文件SHA可回读。不得声称五目标交叉编译等于目标OS运行验收，不提前关闭T27或任何Gate。

## Return

仅本任务目录REPORT.md及logs。REPORT首h2前包含Session: 20261025T043239Z、Task: 095-engine-notices、Status。给出精确写集与自有SHA、实际五目标闭包/锁、许可来源/摘要、所有检查exit/Wait、未运行项及main.js横幅失效边界。亲自运行validate-dispatch.mjs --stage return并停写，原生MESSAGE+FINAL交回Root。候选报告不等于正式接纳；TASK派发后冻结，补充走原生通道。
