# 任务回报

Session: 20261105T094057Z
Task: 010-review-fixture-startup
Status: completed

## 聚焦交接

独立 reviewer：native:/root/review_toolchain；未参与 009 实现，未改源码/产物、未安装或委派。标准轴 pass，规范轴 pass（009 启动修复差异）；未发现新缺陷。独立真实 Chrome 启动回归 5 项、runner CLI 6 项通过；Lead 最终 66 样本/132 浮层结果及全部文件输入已核验，包含实际解包的 ASAR app.css。**本 reviewer 明确释放冻结候选供 Lead 接收**；008/006 的既有局部结论保留，本报告不宣布整个 Goal 或全库集成完成。

## 产物与验证

### 固定范围与依据

Review mode: working-tree；基线 HEAD：37fcede4210a19bcc2a74809e7fdd301e5717957。Strategy: independent；Risk: high；Independence: required；Mode: native。009 的实际实现者为 native:/root/implement_t01，本 reviewer 未参与任何实现；真实派遣/返回关联由 Lead 核验。

精确候选为 /tmp/huhu-fixture-startup/snapshot/manifest.json，digest dffa6d6ae9fe6a750ffe8200441c9ecc611b74c286ea9ee419a31105f9a809f7。五路径：scripts/ui-review/run.mjs、共享 theme.tsx/theme.mjs、ready-documents.ts、readiness.test.mjs。开始和结束均对实际字节重算 SHA256，全部匹配；同时比较 008 的已存副本与当前差异，既有 fixture 内容及完整矩阵检查除启动封装/格式化外未变。

组合校验覆盖 005 最终 31 文件、007 修复覆盖与这五文件：共 33 条当前源码/产物路径全部匹配各自最新已审输入；styles.css 使用已通过的最终浏览器输入绑定，未发现额外生产修改。006 的宿主类型范围仍由其独立报告负责，不将该 reviewer 的执行声明当作本人的执行记录。

沿用已读不变的 AGENTS、dev/ui、code-review、测试可靠性/错误处理/风险与工作副本证据合同；回读 009 TASK/REPORT、008 pass、T-01 失败历史及真实 Lead retry/result.json。历史结果明确为 failed、0 cases，记录 null.append TypeError 和随后 fixture ready 超时；首次 exit143 中断另行保留，不作为修复成功或竞态复现证据。正式 evidence 尚待 Lead 最终回收，未由本 reviewer 改写。

### standards 输出

Reviewer: native:/root/review_toolchain
Result: pass
Findings: []

- 根因链成立：旧 fixture 在模块求值时取得 contentDocument 并立即访问 body；runner 后置 ready 无法挽救已发生的 mount 异常。真实 parser-blocked srcdoc 回归实际得到 URL=about:srcdoc、body=null 和 null.append TypeError，匹配 Lead 故障，不只是解释日志。
- readyDocuments 先等待主文档不再 loading 且 body 存在，再取得已解析的 iframe。两个阶段均先建立监听、后立即检查；已完成路径不会丢失事件。iframe 每次检查都重读 contentDocument，仅接受 URL=about:srcdoc、readyState=complete、body 存在，初始 complete 的 about:blank 不能通过。
- 计时器在回调注册前初始化；成功/超时均清理对应 timer 和监听器。main 超时后不会进入 iframe 阶段；iframe 超时明确 reject。各阶段默认 10 秒，因此错误有界；没有固定 sleep 掩盖竞态，也没有 catch 吞掉失败。
- bootstrap 只调用一次，await 后各创建一个 root/Portal，再暴露 uiReview；startup Promise 由 runner 显式等待，reject 沿现有 catch 写 failed/result/errors，而非只等一个后续布尔 ready。旧 fixture 未声明 startup 时保持原路径。
- focused 回归以真实 HTTP 分段主文档、parser-blocking iframe 与请求握手控制先后，不依赖伪造 Document。断言返回的是替换后的最终文档、两文档 mount 数均为一、超时拒绝、已完成即时路径；不存在只镜像字符串实现的测试。Chrome/server/profile 清理限本用例资源，没有全局进程清理。
- 没有生产主题、CSS、设置、领域数据、依赖或 adapter 修改；无需为该 fixture 启动修复重建 main.js/styles.css。未发现需要额外重构的 Fowler 命中。

### specification 输出

Reviewer: native:/root/review_toolchain
Result: pass（009 修复范围）
Findings: []

009 的慢主文档、慢 srcdoc、拒绝 about:blank、event-before-check、mount once、明确超时和资源释放要求均有实现与实际回归对应。008 已通过的 locale/owner/contrast/motion、safe/unsafe host 与矩阵语义未弱化：theme.mjs 仅增加 startup 表达式，run.mjs 仅增加 await startup，theme.tsx 的逻辑变更是 await 后的一次性 bootstrap。完整 66 样本、每例 main/second 两条真实 overlay 的断言仍在。

Lead 最终 /tmp/huhu-t01-lead-final/result.json 为 passed，66 cases、132 overlays、errors=[]；InputDigest 9bf6d013373d3ad1a8750d2c6379fc387eb0c0e0bece4fb848cb62c3e7d4c1d1，与 009 最终矩阵相同。独立重算 inputs 数组规范 JSON 的 SHA256，匹配此摘要；逐项核验实际输入，未跳过虚拟资源：对 /opt/Obsidian/resources/obsidian.asar:app.css 解析 ASAR header/entry offset，读取真实 637090 字节后计算哈希，与 result 一致。其余普通文件全部逐字节匹配，包含新增 ready-documents.ts 和最终 styles.css。

最终浮层最小对比度仍为正文 14.073、selected 6.167、input 15.262、boundary 3.507、primary 6.014，阈值不变。该 Lead 运行由 Lead 报告实际进程退出 0，本 reviewer 核验持久化结果及当前字节，不将它称作本人重跑完整矩阵。008 的 settled 视觉证据与生产结论按未变输入复用；本次新增风险是启动同步，不重新制造无变化的主题验收。

### 实际检查

环境：Linux、现有 Node/pnpm/Chrome。新过程输出只在 /tmp/huhu-startup-high-review，唯一仓库写入为本报告。

| 检查 | 实际结果 |
|---|---|
| 五文件 SHA256（前后）、组合 33 路径输入校验 | 退出 0，无 drift |
| git diff HEAD --check -- 五路径 | 退出 0 |
| TMPDIR=/tmp/huhu-startup-high-review node --test scripts/ui-review/fixtures/frontend-redesign/shared/readiness.test.mjs | 退出 0；真实 Chrome 5 tests 全通过 |
| TMPDIR=/tmp/huhu-startup-high-review node --test scripts/ui-review/run.test.mjs | 退出 0；6 tests 全通过 |
| 最终 Lead result/inputs/ASAR 虚拟资源/digest 校验 | 退出 0；66/132、errors=[]，全部输入匹配 |
| validate-dispatch，stage=dispatch | 退出 0，无 errors/warnings |

没有重复运行完整矩阵、未变主题/adapter/宿主测试、共享 build 或生成文件。实际慢加载回归均使用自身 Chrome profile，测试后自有进程已退出；没有触及 Lead E2E 或其他 Agent 的进程。

## 问题与下一步

本范围无待修 finding。Lead 可核验真实独立派遣/返回并把 009/010 与最终 Lead E2E 归并到原票证据；旧失败与旧报告保留，不能回写成从未失败。

既有整库 appearance/panels 消费者迁移、完整 build/lint、main.js/包体/notices、真实 Obsidian/popout、最低移动 WebView 与其他平台验收仍按原合同保留。本报告仅关闭 fixture 启动竞态及其差异审查，既不豁免上述门槛，也不宣布整个 Goal 完成。
