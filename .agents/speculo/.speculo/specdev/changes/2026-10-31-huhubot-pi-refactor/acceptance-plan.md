# 验收计划与证据门

## 1. 证据等级与报告纪律

E0 静态源码/文档；E1 本地 mock 原型；E2 真实依赖集成；E3 真实 Obsidian/业务；E4 干净发行/跨平台。等级不能替代：E1 的按钮可点不证明 E3 写笔记/Browser，E0 的package声明不证明E4 ABI。

本轮只有 E0 + 实际执行后记录的 E1。E2–E4 全部未执行，不把 future checkbox 填已通过。每份实现证据必须记录 source/assets commit、机器/OS/arch、Obsidian/Electron/Node/modules ABI、命令/退出码、夹具seed、观察结果、失败注入点与原始附件；避免只贴“pass”。

## 2. P0 HOST 矩阵

| 平台 | 宿主/Node/ABI | utilityProcess/ESM | SQLite/FTS5/native/WASM | 安装/签名/路径 | new/resume/fork/abort/exit |
|---|---|---|---|---|---|
| Windows x64 | not-run | not-run | not-run | not-run | not-run |
| macOS arm64 | not-run | not-run | not-run | not-run | not-run |
| macOS x64 | not-run | not-run | not-run | not-run | not-run |
| Linux x64 | not-run | not-run | not-run | not-run | not-run |

“在当前容器 Node 上能 import”不替代宿主Node≥22.19.0。T-01必须实测真实插件安装目录，去掉系统Node/npm/PATH/开发node_modules。平台不能测则报告not-run，若决定不支持须明确产品批准及更新支持声明，不默认为兼容。

## 3. 逐条 AC 验证程序

每项使用 spec 中同ID行为，不在这里改写。Evidence写入对应实际Ticket，最后T-24集合验证。

| AC / 原编号 | 夹具与操作 | 主要观察与失败条件 | Owner | 最低证据 |
|---|---|---|---|---|
| AC-001 / A01 | 启用/禁用桌面及移动端入口；启动插件，不打开 Bot 页面 | 仅启用桌面加载服务；移动端/禁用不装载 Pi/native；模型未配置不阻塞宿主 | T-01, T-04 | E4 |
| AC-002 / A02 | 同一服务正在执行；反复打开/关闭/弹出/重挂载页面 | 不重复进程/订阅、不终止运行；每个 portal 使用 ownerDocument；卸载后资源归零 | T-04, T-22 | E3 |
| AC-003 / A03 | 官方 SDK 创建含兄弟分支会话；new/resume/fork/select 并续写 | 仅原生 Pi JSONL；上下文按所选 ancestry/compaction，兄弟分支不混入 | T-01, T-05 | E2 |
| AC-004 / A04 | 同一物理 session 两个请求及旧 owner；同时 send 并投递旧 generation 结果 | 会话串行；迟到 writer/receipt 不能改变新 owner 状态 | T-04, T-05 | E2 |
| AC-005 / A05 | 两个 Bot/会话不同模型凭据和工具；并发运行并切换配置 | 配置/secret/tool snapshot 不串扰，受全局配额限制 | T-05, T-11, T-15 | E2 |
| AC-006 / A06 | Pi 尾半行、坏 index、不可读 state 三种夹具；启动恢复/查询/申请写工具 | 分别隔离/降级；可重建 index；state 失效副作用关闭，不能伪恢复授权 | T-06, T-13, T-14 | E2 |
| AC-007 / A07 | 不批准 shell/extension/MCP旁路；尝试 builtin、codemode、tool-search、恶意扩展入口 | 所有实际执行均经 Gateway，未批准的通路不可达；不能只隐藏UI | T-07, T-12, T-20 | E2 |
| AC-008 / A08 | 错误schema、超大返回、符号链接与越界来源；调用各内部/外部工具 | 调用前拒绝或显式裁剪，不泄漏隐藏状态/凭据，保留有权来源 | T-07, T-09, T-10 | E2 |
| AC-009 / A09 | 已预览并批准一个 intent；改变参数/来源/provider/revision、超期或撤销 | 旧批准不可消费；重新预览/申请，不隐式继续 | T-07, T-08, T-09, T-18, T-21 | E2 |
| AC-010 / A10 | 目标笔记有未保存编辑或 revision 变化；确认写入 | 不 fs 覆盖；保留人工编辑及草稿，显示冲突并重做预览 | T-08 | E3 |
| AC-011 / A11 | 写命令重复/超时/Host已写后崩溃；重发相同 key、重启或取消 | 重放 receipt 或 unknown_effect；无自动重复外部写，部分成功逐项可见 | T-07, T-08, T-09, T-14 | E2 |
| AC-012 / A12 | 运行树含等待、工具与已确认效果；cancelTree/禁用依赖/卸载插件 | 传播并确认终止或 interrupted/unknown；旧 lease 不再执行；已有效果不假撤回 | T-04, T-08, T-14, T-16, T-19 | E3 |
| AC-013 / A13 | 多个孩子/重试/摘要/压缩争同一根账户；并发 reserve、usage缺失与结算 | 原子根额度，所有费用来源入账；unknown不为零；不另拿完整预算 | T-05, T-07, T-15 | E2 |
| AC-014 / A14 | 已有持久 Bot 和临时子 Agent；创建委派/结束/重试 | 临时配置快照可追溯，不污染永久身份；membership不自动授权 | T-11, T-15 | E2 |
| AC-015 / A15 | 并发槽2、深度2、总attempt16候选夹具；父等子、子再委派、额度耗尽和重试 | 父释放容量仍保session owner；无死锁/无限递归/绕额度 | T-15, T-16 | E2 |
| AC-016 / A16 | 同一envelope重投递、终结目标、已提交产物；send/consume/submit/review | 投递消费执行验收分别记录；幂等且不能由child成功伪造root成功 | T-16 | E2 |
| AC-017 / A17 | 真实Pi entries/run lineage/mailbox引用；切换树图、查看节点、拖动布局 | 关系分离；每个节点可回读；拖线/拖动不改历史parent | T-17 | E2 |
| AC-018 / A18 | 活跃attempt的Skill/MCP版本快照；修改Skill、server身份或schema并重连 | 变更可见、权限重验、活跃描述稳定，下一安全边界生效 | T-12, T-20 | E2 |
| AC-019 / A19 | 中英混合事实、来源与权限范围；查询、确认、编辑、忘记、撤销源 | 来源回链；跨scope无泄漏；清除索引缓存且不自动重学 | T-13 | E2 |
| AC-020 / A20 | provider fallback/远程embedding/不同auth profile；发送受限来源并扫描日志导出 | 接收方重新授权/预算有效；secret不进JSONL/settings/error/export | T-07, T-10, T-11, T-13, T-20 | E2 |
| AC-021 / A21 | 用户在#38 Space已登录并打开Page；授权Bot读填并批准提交 | 同一真实会话与可见页面，无影子Chromium/Cookie复制；导航撤销有效 | T-02, T-18 | E3 |
| AC-022 / A22 | 一个existing automation occurrence重复投递；启动Bot并发送通知，模拟宿主关闭错过触发 | 只一个逻辑工作；通知回链；不出现第二scheduler或全天候承诺 | T-19 | E3 |
| AC-023 / A23 | 标准客户端、未授权主体、恶意Origin；外部读取与批准写、越权与协议协商 | 真实互操作；拒绝越权/Origin/身份缺失；外部不继承内部无限权限 | T-02, T-20, T-21 | E2 |
| AC-024 / A24 | 慢消费者、游标过期、断线；丢delta、gap、重连snapshot/resume | 可合并delta；关键事件可查询恢复无声丢失为失败；不重复业务效果 | T-06, T-19, T-21, T-22 | E2 |
| AC-025 / A25 | 10k消息/500执行节点/页面循环夹具；测量加载、流式、图操作、关闭和监听器 | 虚拟化/聚合有效；无持续泄漏；记录指定机器p50/p95/RSS/CPU与预算 | T-17, T-22 | E2 |
| AC-026 / A26 | DESIGN-0002与本次确认的DESIGN；深浅/窄容器/IME/键盘/读屏/reduced-motion/portal | 规则统一；操作可达、焦点正确；原型证据不替代宿主证据 | T-03, T-17, T-22 | E3 |
| AC-027 / A27 | 四平台干净插件安装，不提供系统Node/npm；冷启动、SDK/SQLite/native/WASM资源装载 | 支持矩阵证据齐全；无开发目录依赖；license/资源正确 | T-01 | E4 |
| AC-028 / A28 | 完成Bot替换且存有旧用户文件；检查生产import/build/release闭包及非Bot回归 | 无Go/Eino/HAP Bot fallback；agent/PTY/Browser等保留；旧数据未自动清空 | T-02, T-14, T-23 | E4 |

## 4. 四个业务纵切的完整检查

A：给两篇带revision笔记和三条Todo，限定读取scope；生成周计划但尚不写；拒绝一次确认零业务修改；再次预览确认单次批准→真实笔记/TaskID及receipt；再投相同key不重复。注入dirty editor、source变更、Host写后崩溃，保留草稿/部分效果/unknown入口。

B：人工在#38 Space登录打开Page；记录真实identity与generation；Bot读填后用户可见同页；拒绝submit则不提交，单次批准可回读效果；页面导航/关闭/撤销与恶意网页提示均无法绕过。没有#38真实交付时只记contract-mock，不通过A21。

C：Lead与两个隔离临时session，parentwait时容量释放；一个问答、一个失败retry，结果分别submit；根review拒绝一次再修订；只有接受明确产物才终结。私密父记忆canary不能进child；重投Mailbox不重复消费；depth/root budget/attempt达到限制停止。

D：existing occurrence同ID投递三次，只产生一个逻辑work；通知失败只重投通知；关闭Obsidian期间记录错过不造执行；再开按owner的catch-up政策，回链原自动化及同rootRun。

## 5. 故障注入与负向安全

每个 effect 注入点：prepared前、事务commit后、Host执行前、业务已写回执前、receipt commit后event前。对已知none/committed/partial/unknown分别断言外部状态与UI结果，不能只assert异常被捕获。

三数据故障独立：Pi尾部半行/中间损坏、index损坏、state不可用。权限夹具：principal伪造、不同provider、expired grant、module revoke、旧generation、恶意Origin、schema变更、越界路径/symlink、大返回值、MCP/Skill prompt injection。Secret canary覆盖JSONL/log/error/export/UI/memory。

## 6. 性能与可访问性

夹具：10k消息、500执行节点；至少20次页面开关（先固定warm-up策略），记录listener/process/root数回落；明确hardware/host版本/采样次数/冷热缓存、p50/p95、峰值RSS/CPU/bundle。指标分开插件主加载、runtime-ready、会话创建、TTFT、审批、历史查询、画布、退出；不把供应商网络延迟归为UI性能。

P0先测基线并冻结延迟/内存门限，然后T-22重审DoR；没有冻结阈值不可称性能验收通过。不放宽现有bundle-budget。源代码“使用虚拟化库”不替代规模观测。

原型：1440/960/768/420 容器、深浅、keyboard/Escape/focus-return/IME与reduced motion。生产：Obsidian主窗口/弹出窗口/200%zoom/读屏/实际portal与相同矩阵。没有实际辅助技术测试，不宣称读屏全面通过。

## 7. 已确认存在的项目命令（未来按改动运行）

```sh
pnpm run lint
pnpm test
pnpm run test:architecture
pnpm run test:docs
pnpm run test:i18n
pnpm run test:workbench-lifecycle
pnpm run test:workbench-entry
pnpm run test:ui-styles
pnpm run test:ui-adapters
pnpm run test:ui-runtime
pnpm run test:styles
pnpm run check:notices
pnpm run test:license-texts
pnpm run build
pnpm run check:bundle
```

这些名字来自固定dev package.json；不声称本轮执行过。Bot专属Go检查改为新runtime合同测试，并更新test:all聚合；保留有效非Bot检查，不把脚本删掉就当绿。纯文档/原型本轮不要求构建插件（根AGENTS明确）。

## 8. 正式工作流检查（本轮未运行）

在完整checkout按所选Work运行 validate-specdev 的 grill/spec/tickets/goal-plan 阶段，ticket-control --map 只读核对，设计工具计算实际digest并跑validate-design-package。原生工具的当前参数以该固定版本SKILL/--help为准；此包内的validate_documents.py只是补充自检，不能冒充原生validator。

## 9. 交付证据

本轮真实记录在 evidence/validation.json 和 prototypes/UI-001/evidence/browser.json；实现证据T-01...T-24不存在就不预建“通过”报告。完整安装/审批/效果/MCP/Browser/多Agent没有实际执行，必须保留not-run。文档PR不关闭Epic，也不宣称P0已完成。
