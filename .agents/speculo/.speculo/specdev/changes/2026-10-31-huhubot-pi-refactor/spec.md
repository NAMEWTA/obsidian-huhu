---
schema_version: 3
artifact: spec
change: 2026-10-31-huhubot-pi-refactor
status: draft
ready_for_tickets: false
sources:
- USER-REQUEST-2026-10-31
- GH-39
- DESIGN-0002
---

# Spec：Pi 原生个人 Agent

## 1. 用户问题与目标

现有 Go/Eino/HAP Bot 要整体替换，不再往旧 Runner 累加；新 Bot 应在 Obsidian 中安全使用真实业务能力，并有可追溯会话、事实记忆、协作与统一 UI。当前已存在的审批/来源等领域意图不抹掉，但不保留旧协议兼容。

本轮完整提供规划与 mock 原型，不实现产品。以下是未来产品的行为合同；draft 仅表示 UI/技术条件与正式门禁尚未关闭，不表示只写少量样例。A01–A28 全覆盖，不能由实现者私下移出范围。

## 2. 用户故事与产品纵切

**S-A 周计划。** 我选择明确的笔记/Todo来源，Bot显示将读什么、生成何种总结与候选任务；看到diff与接收方后单次批准，真实创建才给实体链接/receipt。拒绝、编辑冲突、重复点击和结果未知均可理解，不用聊天文本冒充完成。

**S-B 浏览器共作。** 我在 Browser 的 Space/Page 完成人工登录；Bot仅获该Page受控能力，读取填写可见，提交前审批。页面导航/关闭/权限变更即使Bot还在运行也必须失效，不创建隐藏浏览器。

**S-C 多Agent研究。** 我为Lead及两个临时执行者指定来源与交付标准，看到执行树及通信，回答问题/取消/复审；子结果投递与根验收分开，超预算或进程崩溃不会无限重试。

**S-D 自动化触发。** 既有automation occurrence触发一项Bot工作，重复投递不会重复效果；完成通知回链。宿主关闭时明确错过/补偿策略，不当作云端常驻服务。

**S-E 个人能力管理。** 我能管理永久Bot/会话/群组与授权，配置模型凭据、Skills/MCP，查看候选/确认记忆、来源、编辑与忘记；导出/备份/重建索引不混同删除权威状态。模型、工具不可用与控制库故障分别解释。

## 3. 外部行为与状态

### 3.1 生命周期与会话

启用桌面时启动本地服务，不等待登录/全库索引/LLM；页面只订阅。关闭页不停止run，禁用模块/退出宿主才有界停止。禁用/移动端不加载Pi/native。一个本地根一个owner/generation、一个session一个writer；过期结果不得写新owner。

新建、恢复、分支选择使用Pi原生SessionManager；会话树不同于委派树。用户选中leaf的上下文不包含兄弟分支。输入附加来源不自动发送；steer/follow-up明确与已受理run关系。模型“完成”只是文本，业务终态来自状态机与回执。

### 3.2 运行、审批与效果

UI区分queued、running、waiting_approval、waiting_user、waiting_children、retrying、interrupted、failed、cancelled、unknown_effect。取消请求、确认停止、已发生不可逆效果分别显示。工具失败保留有效部分文本与数据，持久错误不只用toast。

任何副作用进入统一Gateway并在Host最终复核。批准包含资源/动作/diff/接收方/范围/有效期，只有拒绝或单次批准，不提供“一直允许”捷径。参数或source/provider/grant变更使旧批准失效。未保存编辑不覆盖。未知效果先核对，禁止自动再执行。

### 3.3 模型、资源与长期记忆

Pi是唯一模型工具循环/压缩/分支实现；HUHU仅封装模型配置与受保护凭据。Bot/attempt隔离，不用全局env切换secret。跨provider与embedding外发重新检查recipient。所有子任务、retry、摘要、标题、compaction和embedding共享根预算；unknown usage不记零。

Skills只从批准根装载，hash/顺序/snapshot可见；Markdown Skill不是可执行extension。第一版第三方任意代码默认关，shell默认关。事实记忆先本地tags+FTS5，自动抽取只进候选；确认、修改、忘记与来源权限可追溯，tombstone防止静默重学。向量后续可选，不接管会话。

### 3.4 协作与整合

永久Bot、临时Agent、Team成员、可委派目标分离；子session默认isolated。Mailbox的accepted/consumed、child结果、root review独立；parent等child释放全局容量且保session owner。执行树、Pi分支、通信覆盖层独立，布局移动不重写历史。

现有notes/task/archives/browser/automation/notification/safe的owner保留；只经public API/贡献点。MCP默认关闭、标准SDK、单一client owner及server transport，外部身份独立授权。未来HTTP/Web/IM不拥有另一套runtime。

## 4. 验收合同（唯一行为权威）

`covered` 只意味着有规划责任，不意味着测试已通过。原编号 A01–A28 对应下表；具体夹具、命令及证据归 acceptance-plan。

| ID / 原编号 | 前置条件 | 动作 | 必须观察到的结果 | 验证接缝 |
|---|---|---|---|---|
| AC-001 / A01 · 启停与平台边界 | 启用/禁用桌面及移动端入口 | 启动插件，不打开 Bot 页面 | 仅启用桌面加载服务；移动端/禁用不装载 Pi/native；模型未配置不阻塞宿主 | module loader / installed-host |
| AC-002 / A02 · 页面与多窗口 | 同一服务正在执行 | 反复打开/关闭/弹出/重挂载页面 | 不重复进程/订阅、不终止运行；每个 portal 使用 ownerDocument；卸载后资源归零 | lifecycle / real Obsidian |
| AC-003 / A03 · Pi 原生会话分支 | 官方 SDK 创建含兄弟分支会话 | new/resume/fork/select 并续写 | 仅原生 Pi JSONL；上下文按所选 ancestry/compaction，兄弟分支不混入 | SDK persisted fixtures |
| AC-004 / A04 · 串行与代际 | 同一物理 session 两个请求及旧 owner | 同时 send 并投递旧 generation 结果 | 会话串行；迟到 writer/receipt 不能改变新 owner 状态 | session queue / generation fence |
| AC-005 / A05 · 多 Bot 隔离 | 两个 Bot/会话不同模型凭据和工具 | 并发运行并切换配置 | 配置/secret/tool snapshot 不串扰，受全局配额限制 | attempt snapshot / provider canary |
| AC-006 / A06 · 损坏与恢复 | Pi 尾半行、坏 index、不可读 state 三种夹具 | 启动恢复/查询/申请写工具 | 分别隔离/降级；可重建 index；state 失效副作用关闭，不能伪恢复授权 | storage / recovery |
| AC-007 / A07 · 工具无旁路 | 不批准 shell/extension/MCP旁路 | 尝试 builtin、codemode、tool-search、恶意扩展入口 | 所有实际执行均经 Gateway，未批准的通路不可达；不能只隐藏UI | real SDK tool dispatch |
| AC-008 / A08 · 参数/路径/结果边界 | 错误schema、超大返回、符号链接与越界来源 | 调用各内部/外部工具 | 调用前拒绝或显式裁剪，不泄漏隐藏状态/凭据，保留有权来源 | schema / host executor |
| AC-009 / A09 · 批准失效 | 已预览并批准一个 intent | 改变参数/来源/provider/revision、超期或撤销 | 旧批准不可消费；重新预览/申请，不隐式继续 | approval CAS / owner checks |
| AC-010 / A10 · 编辑冲突 | 目标笔记有未保存编辑或 revision 变化 | 确认写入 | 不 fs 覆盖；保留人工编辑及草稿，显示冲突并重做预览 | Obsidian document API |
| AC-011 / A11 · 重复与未知效果 | 写命令重复/超时/Host已写后崩溃 | 重发相同 key、重启或取消 | 重放 receipt 或 unknown_effect；无自动重复外部写，部分成功逐项可见 | state transaction / effect owner |
| AC-012 / A12 · 取消与撤销 | 运行树含等待、工具与已确认效果 | cancelTree/禁用依赖/卸载插件 | 传播并确认终止或 interrupted/unknown；旧 lease 不再执行；已有效果不假撤回 | lifetime / cancellation |
| AC-013 / A13 · 根预算 | 多个孩子/重试/摘要/压缩争同一根账户 | 并发 reserve、usage缺失与结算 | 原子根额度，所有费用来源入账；unknown不为零；不另拿完整预算 | budget ledger / Pi hooks |
| AC-014 / A14 · 身份与临时执行 | 已有持久 Bot 和临时子 Agent | 创建委派/结束/重试 | 临时配置快照可追溯，不污染永久身份；membership不自动授权 | profile / delegation |
| AC-015 / A15 · 嵌套与等待活性 | 并发槽2、深度2、总attempt16候选夹具 | 父等子、子再委派、额度耗尽和重试 | 父释放容量仍保session owner；无死锁/无限递归/绕额度 | scheduler / root quotas |
| AC-016 / A16 · 通信与根审查 | 同一envelope重投递、终结目标、已提交产物 | send/consume/submit/review | 投递消费执行验收分别记录；幂等且不能由child成功伪造root成功 | mailbox / review CAS |
| AC-017 / A17 · 三种关系 | 真实Pi entries/run lineage/mailbox引用 | 切换树图、查看节点、拖动布局 | 关系分离；每个节点可回读；拖线/拖动不改历史parent | projection / UI |
| AC-018 / A18 · 资源更新 | 活跃attempt的Skill/MCP版本快照 | 修改Skill、server身份或schema并重连 | 变更可见、权限重验、活跃描述稳定，下一安全边界生效 | resource loader / MCP catalog |
| AC-019 / A19 · 事实与忘记 | 中英混合事实、来源与权限范围 | 查询、确认、编辑、忘记、撤销源 | 来源回链；跨scope无泄漏；清除索引缓存且不自动重学 | FTS / memory tombstone |
| AC-020 / A20 · 接收方与凭据 | provider fallback/远程embedding/不同auth profile | 发送受限来源并扫描日志导出 | 接收方重新授权/预算有效；secret不进JSONL/settings/error/export | model/credentials/security |
| AC-021 / A21 · Browser同Page | 用户在#38 Space已登录并打开Page | 授权Bot读填并批准提交 | 同一真实会话与可见页面，无影子Chromium/Cookie复制；导航撤销有效 | Browser public API / host E2E |
| AC-022 / A22 · 自动化逻辑唯一 | 一个existing automation occurrence重复投递 | 启动Bot并发送通知，模拟宿主关闭错过触发 | 只一个逻辑工作；通知回链；不出现第二scheduler或全天候承诺 | automation action / idempotency |
| AC-023 / A23 · 外部MCP | 标准客户端、未授权主体、恶意Origin | 外部读取与批准写、越权与协议协商 | 真实互操作；拒绝越权/Origin/身份缺失；外部不继承内部无限权限 | MCP SDK / transport / Gateway |
| AC-024 / A24 · 背压与重连 | 慢消费者、游标过期、断线 | 丢delta、gap、重连snapshot/resume | 可合并delta；关键事件可查询恢复无声丢失为失败；不重复业务效果 | durable event / IPC |
| AC-025 / A25 · 规模与资源 | 10k消息/500执行节点/页面循环夹具 | 测量加载、流式、图操作、关闭和监听器 | 虚拟化/聚合有效；无持续泄漏；记录指定机器p50/p95/RSS/CPU与预算 | perf harness / installed host |
| AC-026 / A26 · 设计与无障碍 | DESIGN-0002与本次确认的DESIGN | 深浅/窄容器/IME/键盘/读屏/reduced-motion/portal | 规则统一；操作可达、焦点正确；原型证据不替代宿主证据 | UI + manual assistive tech |
| AC-027 / A27 · 真实发行 | 四平台干净插件安装，不提供系统Node/npm | 冷启动、SDK/SQLite/native/WASM资源装载 | 支持矩阵证据齐全；无开发目录依赖；license/资源正确 | package / signed host |
| AC-028 / A28 · 旧链路删除 | 完成Bot替换且存有旧用户文件 | 检查生产import/build/release闭包及非Bot回归 | 无Go/Eino/HAP Bot fallback；agent/PTY/Browser等保留；旧数据未自动清空 | static closure / regression |

## 5. 范围

IN：整体Bot替换；独立模块/启动服务/typed IPC；Pi会话/分支；权限审批/预算/幂等/receipt；个人来源/任务/记忆/Skill/模型；多Agent协作；三视图；Browser公共接入；既有automation/notification；真实MCP读写闭环；全新UI；删除与发行回归。

REUSE：Pi官方SDK、现有模块/lifetime/service lease、现有React/shared UI/i18n/virtualization/schema、业务public API、既有scheduler/notification/secret protection、DESIGN-0002/UI-001 A。

OUT：生产代码在本轮的实现；旧Go/HAP兼容/自动数据迁移/双引擎；重写Browser/CLI agent/Todo/cron/全局框架；云端全天候、远程部署、移动版Bot、外部IM、必选向量、未来可编辑workflow；自动清理用户数据或关闭相邻Issue。

## 6. 验证与工程约束

状态机/授权/预算/幂等用纯单元与属性/竞态夹具；SDK与SQLite用真实依赖集成；Host与dirty editor/Space/Page用真实Obsidian；发行用干净安装目录和四平台矩阵。UI原型用独立headless浏览器，只证明设计mock，不能替代上述接缝。

既有 lint/unit/architecture/i18n/UI/lifecycle/styles/security/docs/notices/license/build/bundle 均按改动范围执行，不放宽预算、不删除有效断言。性能夹具10k消息/500节点，P0冻结硬件、版本、采样与延迟门限；没有实测提升百分比。生产UI沿用t()+en/zh与ownerDocument/portal；本次中文静态原型不是production翻译实现。

## 7. 风险、冲突与未决

utilityProcess/Node/ABI/资源闭包需T-01证明；失败阻断相关runtime，不fallback Go。MCP版本与钩子可覆盖性需T-20冻结；新UI需T-03用户确认；#38真实public能力是T-18外部门。draft票可记录完整后续路径，但不能因此自动ready。

本spec不得让用户再决定已明确的Pi、无兼容、独立模块。只有P0发现真正互斥的最低宿主/运行方案取舍才返回Grill。`ready_for_tickets: false`保留未批准设计门；允许提前交付完整draft Tickets Map，所有执行仍需单票DoR与独立实现授权。
