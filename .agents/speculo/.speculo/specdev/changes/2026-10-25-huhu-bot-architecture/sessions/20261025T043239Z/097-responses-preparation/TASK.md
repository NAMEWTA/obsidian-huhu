---
schema_version: 2
session: "20261025T043239Z"
task: "097-responses-preparation"
kind: research
change: 2026-10-25-huhu-bot-architecture
ticket: T-09
---

# Responses下一切片只读准备

## Goal

对照实际T08私有接口与已固定Responses SDK源码，给T09最小可实施桥接方案、精确原owner需求和协议差异故障矩阵。只读准备，不激活T09或提前证明通过。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715；当前Map23/Goal22。用户已授权28票55AC完整代码与Agent Team，真实模型/Obsidian/目标OS由用户后验，不问凭证、不提交推送发布归档。原research owner native:/root/foundation_research，不再委派。

先AGENTS workspace/catalog→当前工作区与Map、T09票、dev架构/许可/测试的相关规则。I只读实施预备，不建新change或正式状态。当前T08矩阵和独立审查尚待，任何T09生产写入仍需原依赖代码门接纳及后续正式派单。只有自己的REPORT/logs可写。

历史047-model-protocol-preflight/REPORT.md SHA df2313f9ddcef414a7fbc5e63ed8d2b7d84d2567f571e5fda82f473dcd8f8956，实际目录在同session。该研究已锁agenticopenai v0.2.4→openai-go/v3 v3.44.0，勿浮动换版本。沿047 sources找到固定源码/许可，不猜文件；不重复网上找同一库或重新跑研究编译。087-engine-adapter-preparation仅对Chat给当时接缝，应以当前已存在的真实代码为准。

T08正式私有合同：evidence/T-08-logs/chat-private-contract-map22.md。当前common含Engine/Driver、版本化CP、schema.Message有序批工具、预算与真实Producer完成；chat直接Ext.Stream而无Generate/capture/fork。实际Engine当前SHA40bc23f7c0a719a9d51d2b71a3bd97df9ba62b3bf2e7ec949fc5033e3b398d7f，其他实际源采SHA；092声明此时生产冻结给095许可闭包，但仍可后续修缺陷，报告必须标明实际读时点和漂移，不能把它当最终固定review。

## Workspace and Scope

业务文件全部只读，允许写本任务REPORT.md及logs/source清单。读取当前native/huhubot/internal/adapters/outbound/eino/common与chat、bootstrap/core.go、纯application/api及直接必要消费者；真实固定module-cache/source只读。T09/T10/本change参考按需，不整读全部历史。不得修改源码、锁、模块缓存、Skill、正式Evidence/Map；不运行Go/Node产品检查、下载模块或调用Provider；095当前唯一Go窗口，下一092。

## Acceptance

1. 具体画出当前common.Driver与AgenticMessage/完整Responses items之间的数据边界。提出最多两种可实施局部方案并推荐一项：必须保留完整有序items、item_id与call_id、output_item.done最终opaque reasoning（含summary原貌/加密内容）、终结和恢复位置，不经VisibleMessage.Text重建；SDK类型不进Application。
2. 基于固定SDK真实源码确认Store=false/禁auto-cache/禁环境/MaxRetries0/固定endpoint、直接流生产者启动/终止/错误Close/最终ACK、typed terminal与usage字段presence。判断是否能以现有SDK直接调用+窄数据桥达成，不复制整个SDK、不改module cache、不使用零网络Generate捕获再重发。若需要不可避免小桥或SDK扩点给确切文件/原因与许可来源。
3. CP schema、Driver结果或协议私有opaque状态如需变化，只提出精确自有/共享原owner维护请求及旧ChatCP兼容处理，不自行发明新的公开Port/账本/迁移。默认bootstrap应将同协议selector/factory绑定Engine/Inspector/metadata；不把远端response ID作为本机历史、恢复或权限权威。
4. 只列Responses独有或实际新增风险矩阵（结合047 R项），说明哪些T08不变底座可以复用，哪些必须真实loopback重新证明。覆盖响应失败/不完整、重复/交错items、缺usage/真实0、未知会改变工具语义item、opaque完整roundtrip、取消实际join、审批resume/权限再查、无隐藏retry/redirect。不能借Chat绿代替协议证据。
5. 最终完整来源位置/行段/字节SHA与结论对应；区分源码观察、历史研究、建议和未运行。当前没有真实模型或T09行为验收。

## Return

REPORT首h2前Session: 20261025T043239Z、Task: 097-responses-preparation、Status；完整交接方案、最小owner清单、局部矩阵与来源/漂移。亲自validate-dispatch return0（纯结构，无产品检查）后停写，native MESSAGE+FINAL交Root。T09是否开工由Root后续依赖门决定。
