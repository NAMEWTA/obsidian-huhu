---
schema_version: 2
session: "20261025T043239Z"
task: "092-engine-chat"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-08
---

# T08 Chat 完整协议循环

repo /home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715。Root已接纳091-recovery-review-r2与T16/G1代码门，正式更新Map22/Goal21；按本TASK与Root原生派遣实施。用户授权28票55AC完整代码，真实模型/Obsidian/目标OS由用户后验；不索凭证、不调用真实Provider、不提交推送发布归档。实现偏好gpt-6.1-sol/xhigh，不再委派。
按AGENTS workspace/catalog→当前Map→dev架构/测试/许可→本票及最小依赖→SpecDev I预检/实施/错误/可靠测试合同读取。完整读已接纳087报告及未来正式Chat联合窗口、Root官方文档核对笔记；历史047读取路径由087 sources定位，不猜文件名。旧报告建议不是当前源权威。当前代码底座的作者最终报告与Root代码门需按派遣冻结摘要核对。
同工作区只写明确owner范围及自有REPORT/log；正式Evidence/Map/Goal、他人报告、未开放共享文件只读。接口/路径缺口提精确消费者与最小需求，不能自建另一套Port/账本绕owner。重检查由Root唯一窗口，先获得依赖实际稳定摘要，不并行全仓构建；所有自有进程/producer实际Wait。完成REPORT首h2前Session/Task/Status、精确自有SHA、红绿/失败分类/实际命令exit/Wait/未运行；亲自return0后停写并native MESSAGE+FINAL。候选交回不等于Root验收。

## 写集
仅 native/huhubot/internal/adapters/outbound/eino/common/**、同级chat/**、native/huhubot/tests/contract/engine/chat/**、native/huhubot/testdata/providers/chat/**。go.mod/go.sum、bootstrap与application API归T01；assistant/usage归原T02/T12；NOTICES与根构建归T27。无需产品TS改动，不创建UI。

## 当前决定与实施
采用087方案B有界单Run循环及最小stream生命周期桥，沿固定Eino/EinoExt/底层链，明确真实复用消费者。优先复用已有固定SDK，实际bridge缺口可做最小有出处改编并通知T27，不能手写另一SDK或改module cache。先与T01/T02/T12冻结实际Factory/驱动组合、profile-bound resolver、EngineVersion与Probe实例关闭合同，避免common/chat循环import；不把SDK类型公开到application。

Run/Resume/InspectCheckpoint完整实现；只用pinned配置和Executor已过滤内容，Persona字面JSON保持，Intent一次，无历史私聊/Persona目录泄漏。首版只实现显式Chat协议，其他协议明确不可用不自动fallback。私有默认output bound4096且实际request max_completion_tokens一致，n1；无自动retry/redirect。完整request字节估算含工具schema/历史/结果；每次实际HTTP独立Reserve/Dispatch/实际producer结束/Settle。未知/部分usage不填零；回填工具后下一HTTP再查当前准入。清理用独立有界context，但不得在producer未结束时假Settle。

工具只映射现有类型化Broker注册，完整batch合法化、严格JSON/重复键/schema/大小；首个approval_required立即停止后续effects，CP保存真实全批控制位置、已完成结果/原ID、pending Effect及未执行项。approved/denied/expired和children回填原Decision；Resume绝不重Invoke原pending或completed效果。CP内层完整语义/版本/协议/工具digest/Run/config检查为纯本机，零凭证解析/网络/工具；outer HUHUCP1由Blob拥有。

ModelProbe采用显式模型元数据访问，空capabilities表示未实测能力；不支持路由明确失败，不偷偷生成。固定目的地、严格model路径片段、重定向0、有限body/deadline/关闭。实际可中断Probe生命周期与T01装配协调，不把metadata请求称生成账本或免费承诺。

## 验证
逐项承接087 F01–F20；先一条真实SDK→loopback SSE→同application/Executor→持久消息的红绿，再多工具、暂停/恢复、拒绝/过期、取消late producer、费用缺失与SQL结算失败、CP损坏/Publish失败/重启、撤权/群成员变化、恶意参数/超长流。除定位单测外，用同公共生产链和实际HTTP计数/请求内容/SQL/CP事实，不能只stub Attempts来证明预算安全。必要normal/race由Root排窗口，现有底座不重复无关全矩阵。


正式Map22/Goal21窗口：<Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/evidence/T-08-logs/engine-chat-window-map22.md</Path>，SHA256 `ca9ae6fa9e9e50720c4f93a705510d9726df87d525ea5ea6ad2a14610f712f8c`；前置091-recovery-review-r2 Input-SHA256 `a62e8c7de0b7ca0542f418e239344eb0ea2625f11d6f6e8ccc6872eb573db89a` / REPORT `5c78b49ff6b4b83669298f5f193e29b166d6da5f95e1eced617fe15c5e789109`。实际Root原生派遣才开始。本TASK一旦派遣不追改，补充仅经原生指令与正式窗口记录。
