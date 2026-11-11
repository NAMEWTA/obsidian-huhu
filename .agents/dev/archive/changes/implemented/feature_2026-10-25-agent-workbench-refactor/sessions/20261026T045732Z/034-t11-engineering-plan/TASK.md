---
schema_version: 2
session: "20261026T045732Z"
task: "034-t11-engineering-plan"
kind: "planning"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-11"
---

## Goal

Root编排完整18票Goal，用户已授权Agent Team并指定实现/研究gpt-6.1-sol/xhigh。本任务在024已接受只读准备基础上形成可实施的T11工程合同候选，重点解决metadata-first解析、单一历史事实owner和稳定分页的真实接缝，不再重复资料摘要。T11未激活；不写产品、不自称Ready或AC通过、不递归派遣。独立最终审查另行安排。

## Inputs

固定输入 /tmp/huhu-t11-root-engineering-cci0q3nj/inputs.json SHA256 b5006e5cf1f300742c52c135c8d0e381e0c238e4ad10cd27e8b4047a54bbf6ee，每项snapshot为实际读取源；024的source-manifest-final.json含已接受67文件的原字节与SHA，读取其snapshot，不取并行工作副本。Root audit保存024结论/原资料活动与许可证据，不需重新联网重复已核来源。必要补读只读未分配文件时先记录实际路径/原字节SHA并区别为新观察；禁止读取账号/历史正文/Vault用户数据。

按AGENTS bootstrap及dev和SpecDev I真实入口/当前规划分支阅读；复用024已实际检索的原生历史实现和许可证据。Spec §3.7、AC025–028及T11本票为权威，T12恢复/导入是下游只作接缝约束。当前GP034/Map35，T09 in_progress，T01–08 done；T09 A/B正在收尾，T10已有022研究与033预审但未激活。T09/T10最终共享CLI/schema/controller/UI接口须在T11正式DoR重新核对，不能假装当前固定旧版就是届时最终接口。

## Workspace and Scope

仓库 /home/wta/orca/workspaces/obsidian-huhu/terminal，change同本TASK目录，HEAD33c21e098ef3188cbab5a09f3e0a01fadb787715，branch NAMEWTA/terminal。唯一允许写本034 REPORT与新/tmp/huhu-t11-engineering-plan-*下的候选/必要隔离只读逻辑探针。产品、正式spec/Ticket/Map/Goal/Evidence、永久知识、旧TASK/REPORT、原024证据、Git/index、node_modules、Cargo target及已存在二进制均只读。不得构建全仓/native、启动真实Provider/Obsidian或修改任何用户数据。

围绕024实际缺口产出工程包草稿：
1. 完整source identity tuple与sourceVersion分离，精确HUHU绑定优先、verified realVault cwd其次、用户单来源grant第三；元数据不足时明确拒绝body准入，不按nativeID/cwd/title猜同源，不把Space库外grant扩大到整个账号。
2. 每个已支持Provider的最小有界metadata读取契约和正文按需读取接缝；原agent_data.rs解析器的真实路径/格式、同打开句柄验证/TOCTOU/symlink、有限解析预算、停止点与失败/未知结果。保留现有支持面，不能以重写所有Provider为默认方案。
3. 原NativeHistory事实文件与可重建index/cache清晰分工：当前多实例共写的真实问题如何用单一原owner/facade+subscription收束；标题/收藏/标签/归档/来源引用在缺源/删cache/重建时保留，避免第二数据库/第二writer。
4. 原HistoryStore/UI分页与on-demand预览改造、keyset或version guard选择、cursor与indexInstance/内容/绑定版本和scope关系、缓存和cancel/epoch及多消费者共享请求释放。完整49152BCLI envelope与524288B内部native限额分别处理，不把内容截断当完整预览。
5. T11只开history.list/preview，不提前交付T12 open/resume/import或模型/PTY。准确列最小精确路径/唯一writer分组、阶段API和真实normal/failure/recovery测试，保留T12接缝。

工程选择在既有批准行为内自行形成可审阅候选，说明替代方案与取舍。未知事实写明待核，不能凭空决定路径/跨版本兼容。控制复杂度，避免持久lineage/双写/无关重构；验证必须击中实际owner和provider解析器，不只造fake模型。

## Acceptance

Root能据候选在T09/T10稳定后修订精确T11 DoR/写集并分派；每个结论引用实际固定文件/符号与失败序列。可证伪反例区分静态推导和实际运行。若做独立probe，只用自己新目录/确定输入，保存argv/UTC/真实exit/raw/消费源码；不把未执行验证预填通过。既有024证据复用须指出适用范围；无代码实现/正式两轴/AC声明。用户负责真实Obsidian/Provider/OS IME/五平台验收，Root负责最终代码验收。

## Return

原子写 sessions/20261026T045732Z/034-t11-engineering-plan/REPORT.md，使用Session/Task/Status和“聚焦交接”“产物与验证”“问题与下一步”。报告引用新/tmp工程候选和精确输入SHA、实际检查与未验证项；完成后实际运行validate-dispatch --stage return并保存原raw/exit。原生工具返回报告路径和SOURCE READ ONLY；Root唯一正式接收owner。
