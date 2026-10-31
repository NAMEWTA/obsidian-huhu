# T07 独立双轴审查 R1 实际任务

所有 T07 产品 writer 已 SOURCE STOPPED，Root 两次整合与下述回读已完成。本任务在真实 spawn_agent 投递后生效，不把准备文件本身当作审查结果。

执行者拟为用户指定的全新 gpt-6-astra/high、fork none。实际实现者含 codex:/root、codex:/root/prepare_t03、codex:/root/implement_t07_host、codex:/root/implement_t01；这些身份不能担当本票独立 reviewer。不得递归委派、写产品/正式工件、提交、推送、发布、归档或使用真实用户账号/Vault。审查输出到明确 /tmp 自有路径，Root 回读后保存原报告。

读取项目 AGENTS 的 discovery/runtime、SpecDev code-review 与 source-discovery/fowler-smells/risk-review/reviewer-contracts/review-evidence/working-tree-review；项目 dev 与当前范围命中的架构/测试/依赖规则。唯一规范为当前 C/spec.md、implementation-contracts.md、ticket/07-local-cli.md、GP025/Map26、T-07-engineering-packet.md 及当前 Root 接缝决定（scope-adapter、wire-wrapper-boundary、close-ack-order），不能把旧 inputs 原方案或早期草稿当合同。写集为 A24/B12/C30/Root4 共70条；原controller-managed-runtimes与controller-activity测试夹具已按真实负例逐一补入，其他既有未改测试仅是回归输入。

审查模式 working-tree。真实实施前工作副本是 T-07-dispatch-input.json，HEAD33c21e0 只是 Git 观察锚，不能把整个未提交 T01–06 重新算成本票。Root 将提供完整最终 working snapshot/范围选择/新增删除权限变化、原始差异、初始和最终源 CAS、实际 checks 原件与明确 exclusions。交付文件遗漏、新文件、源码漂移、binary 来源或独立身份缺失均不得放行；两轴分别按 standards、specification 返回 pass/request-changes，不限制 finding 数量。

至少从可证伪反例追踪以下实际消费者及恢复路径：

- 严格 raw discriminator 在 JSON/serde 构建丢重复键之前；转义/混合旧新 type、超512字节UTF8的判别值、全包UTF8/depth/node/shape、内部 wrapper 与外部 payload 独立预算，旧大 history/Cookie 不受新profile误伤；确定生成器与共享fixture不只检查有效布尔而漏掉实际消息方向。
- bound PTY lease.acquireControl 不起新代；真实私有 handle/同host/gen/live owners；最多一份 registering/active/closing；取消只撤观察，不把 handed 未确认/admitted 业务当 none，不提前返业务额度，关闭时晚结果不穿到下一代。
- TS revoke 与 native 物理 ACK 分开；资源真实关闭后先提交native终态再让ACK可见，ACK permit仍到实际write结束才返额；Host须实际closing时的ACK加本地责任结算，不能提前复用注册。慢ACK/满固定槽/写失败/立即重注册均可证伪，closing/BUSY/未知结果有界，不无界 tombstone；Browser/history sibling 使用原 shared helper 继续；真实 EOF 才封存该代。
- helper崩溃后旧Session保持disconnected/unknown且不自动重放；同一Controller业务instance不变，新明确入口须能在旧责任结算后创建新control/Router。尚未settled的retiring保持有界门，settled但失败的准确清理诊断不能永久堵住新请求。native固定locator须仅按已捕获实体身份和明确死亡endpoint回收，仍监听/权限不符/超时/替换均拒绝，不靠PID/mtime，不误删后来的对象。
- commit→reserve→onReserved→prepare 与首用 routeEnvironment 不自 await；同步 capture 在 scope await 前，包括注册Promise返回前同步forward原call；至多沿原pending16暂存一次性execute/dispose句柄，不伪造registration，失败释放未交接token。execute 一次性交接，finally/取消不能撤已交接前景意图；beforeSpawn await 后原 stop/remove/runtime 门、原注册 current、受保护 env 最后覆盖与 captured spawn 同同步段。
- Space 明确绑定，稳定 Session 解析原 Space；显式冲突/跨Vault/root/device/instance/旧runtime 在效果前拒绝；scope 原 rootPath 不由 canonicalPath 猜，symlink/copy/替换可核验；只读不排 writer/history tail，rename持久成功后投影且晚创建不重放旧标题。
- 8 connections/16 pending、14+2分类由服务端descriptor，认证/半帧/慢socket/观察者已走仍计费；Node final/stage 与 native forward/smallcontrol 固定独立池；clone/encode前占额、write(false)只送一次、callback与drain/returned都结算才返额。高频latest progress在原pending permit/Promise内替换，失败仍保留最后有效进度；不能每更新新增settlement责任，已送帧不能替换；旧lane/SID/reply/raw→exit公平与因果保留。
- whole response48KiB含最坏转义/长旧ID/cursor/range/error；read截页后原 snapshot/UTF16 cursor不跳字，过期/换代准确resync，list完整row及revision，explain不伪造不存在的分页字段；mutation在效果前确保最坏回执/进度可表达。
- 真实CLI→broker→host→生产router/Workspace/SpaceService/Sessions→同helper闭环及背景B/无Pane/不抢A；不能用固定回答 responder 代替业务。required missing binary必须失败、0skip；CI先构建实际双bin再Node tests，Rust CI不依赖pnpm；离线version/schema/未连doctor不启动Agent/helper。
- CLI OS参数非法UTF8、重复/不支持标志及stdin/file错误在机器模式仍给有界可分类JSON/exit/effect，不能空stdout或panic；不盲目转义后执行另一段正文。
- Unix身份/权限/替换清理、Windows当前用户ACL/cfg实施与错误、令牌不进env/log/共享备份；新依赖许可证/固定锁图/兼容性与notices；四个Apple间接crate的精确发布MIT声明与历史/原项目完整notice分别标明，不将历史许可来源称作当前发布内文件；新2txt与sources.json摘要/版本/政策链接一致，不填版权、不放松检查。不得复制GPL终端实现。

复用仍有效的真实验证，必要时用隔离 fixture/临时目录与 Root 冻结双bin运行针对性反例，保留真实 argv/UTC/输入/exit/log/前后漂移。禁止生成或构建覆盖根产物，禁止读取用户HOME凭据/真实Vault；测试失败不能删测试/松断言/skip变绿。旧 docs 六个 Bot 锚点问题须如实区分，不能伪称本票全绿。Linux代码/进程测试不冒称真实Provider、Obsidian或五平台实机E2E；这些由用户验收。

原报告须给实际 reviewer 身份、input SHA、两轴结果/全部findings/来源/已跑与未跑。每项 finding 含严重性、项目相对路径及位置、可达触发、实际风险、规范/标准依据、最小修复与验证条件；区分已证实/推断。无发现只说明该固定范围未发现问题。不要写正式 Ticket/Goal 状态；返回 READ-ONLY SOURCE STOPPED。


实际 cwd=/home/wta/orca/workspaces/obsidian-huhu/terminal；C=.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor。用户完整18票实施/独立审查授权及指定model见C/goal-plan.md §4；T07是当前唯一实施票。你是全新独立 reviewer，不参加过当前任何生产实现，选择 gpt-6-astra/high。当前T08仅由原实现者做/tmp只读前置研究，所有产品源码和根产物保持STOP。

权威实际输入：C/evidence/T-07-review-input-round1-complete.md#review-input
Input-SHA256: 7e21cc86a21893389483888b0f263de1175c2a349d7524b83fec7dbba652a0c7
它是工具实际完整scope加59个源的JSON.stringify摘要；先实际重算、核scope及sources。scope选70路径、相对HEAD变化69，但相对T07真正实施前工作副本变化68（styles.css本票未变）；source基线与范围详情在T-07-final-delivery.json及T-07-final-delivery.diff。不得把T01–06旧改动当T07新实现，也不得忽略共享文件当前完整行为。原范围外25448条为前序/用户/方法库及证据；Root全产品前后核验outside allocation []，详见最终manifest。

Root最终完整源/产物/工具：C/evidence/T-07-root-integration2-final-input.json，SHA256 0d8885283ce3dd932dc0085bd44ca8a7f0d93e5817b27b4634dfc7df0265c26a。最终main.js 6379974B SHA4360f8f35602080669e75a53bdf9f604cfde39e2719d7abffc69674a39d79417；styles.css 1421846B SHA820605c3fffd20f0f6fda86be72846967daefd87738e0fd63edc49e4db345430；NOTICE 785935B SHA fbd0b28f589a716d82c6f53f72321cfd8f30b41ecbe22ec01d411c0bfdec776e。

只读可执行最终bin：/tmp/huhu-t07-c-linux-final-20261026T021652Z/huhu-pty SHA9adcae0e655f48b81234fcbb782f3db7dabf5a1bcc828a13f9a0dfd916c19d40；同目录huhu SHA4cfd6fc7cdc759ef02ad9ce4c35bc6d415ebd36a867ade220283dc2f90e8528e；两者0555。原真实Rust生产记录/30输入与105tests（0ignored）和Windows交叉check见T-07-c-final-handoff-root-audit.json。不得用旧/中间bin。若必要运行受控现有CLI回归，设置HUHU_TEST_PTY_BINARY/HUHU_TEST_CONTROL_BINARY指向上述两文件，使用实际Node=/home/wta/.volta/tools/image/node/26.11.1/bin/node与其优先PATH；全部临时隔离，无真实用户Vault或Provider。

Root集成结果：build、production lint、architecture、i18n、generated --check、Promise guard、final bundle和notices --check都实际exit0。i1的66文件555tests为554pass/1fail/0skip；唯一旧activity fake缺control协议，最小36行新增后4Controller文件18tests/0skip/types/format通过、原断言全保留。生产源码/工具/双bin从i1未变，复用理由/精确漂移见T-07-integration2-verification-reuse.json，不冒称又跑了一次全555绿。i1包含required真实CLI→broker→BHost→A生产用例和同helper闭环，不能由B transport测试替代。原docs6个无关Bot锚点仍失败。

T07-C3许可完整73包通过，四个Apple间接crate发布缺正文按固定上游原文缓存补齐，原六条保留；见T-07-c-license-inputs-root-audit.json、T-07-license-readonly-root-audit.json。实际notice100npm/73crates。相似度56本票代码文件对33627参考文件已实际跑完，55文件>=k；最大raw份额0.017，raw>40的4处及normalized前列12项仅回读我方标准库/字典/常量/JSON语法片段，详见T-07-similarity-readback.json和T-07-integration2-similarity-root-audit.json。默认4GiB工具OOM保留，12GiB同输入重跑exit0；没有阅读GPL源码。实际Root整合/失败原件见T-07-integration1-root-audit.json、T-07-integration2-build-root-audit.json。

输出固定 /tmp/huhu-t07-review-r1-report.md 和 /tmp/huhu-t07-review-r1-checks.json（未跑新命令可明确空list，不能虚构）。报告两独立段分别加显式 <a id="standards"></a>、<a id="specification"></a>，各包含 Reviewer: codex:你的真实agent句柄，Axis: standards|specification，Result: pass|request-changes，Input-SHA256: 上述摘要，Observed: 实际固定输入/阅读与验证范围，全部findings及未验证项。实际工具与自报限制分开。任务结束 READ-ONLY SOURCE STOPPED，不要写正式状态或修复。
