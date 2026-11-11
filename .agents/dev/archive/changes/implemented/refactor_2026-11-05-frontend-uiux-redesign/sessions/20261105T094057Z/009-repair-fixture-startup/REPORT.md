# 任务回报

Session: 20261105T094057Z
Task: 009-repair-fixture-startup
Status: completed

## 聚焦交接

已确认并修复 fixture 的实际文档启动竞态。旧实现于模块求值时缓存 iframe.contentDocument，然后立即访问 body；真实 Chrome 的 srcdoc 解析期间 body 可以为 null，初始 about:blank 也可能尚未被目标文档替换。新 helper 先等主文档 DOM ready，再对 iframe 先注册 load、后检查当前 Document，只接受 complete、有 body 的 about:srcdoc；返回并缓存的只有最终文档。五个真实 Chrome 启动回归和完整 66 样本/132 浮层矩阵通过，源码已冻结，Lead 可在相同输入上独立 E2E 与 high 审查。

## 产物与验证

### 根因、影响与最小修复

回读 007/008 报告与本 TASK，保留 008 对生产主题、颜色守卫和动效修复的结论。实际 Lead 失败为 /tmp/huhu-t01-lead-acceptance-retry/result.json：尚无 matrix cases 即 null.append；原首次运行 exit143 的外部中断与本次根因不同，不当作通过或启动竞态复现。

实施前沿 runner 创建 srcdoc iframe/加载 fixture → theme.tsx 顶层 docs 缓存 → doc.body.append → runner 后置 ready 的链路核对：后置等待无法保护此前已失败的 mount。新增真实 Chrome 反例在 iframe 的 head 脚本解析阶段调用原 mount 路径，断言 URL=about:srcdoc、body=null 并得到 null.append TypeError，确认根因而非仅凭日志猜测。

实际只改五个授权文件：

- scripts/ui-review/fixtures/frontend-redesign/shared/ready-documents.ts（新增）：等待主文档和目标 srcdoc，事件监听先于状态检查，避免 check/register 竞态；每次检查重新取 contentDocument，不保存初始 about:blank。完成/超时均清理监听器及计时器，超时明确 reject。
- scripts/ui-review/fixtures/frontend-redesign/shared/theme.tsx：将一次性 mount/configure 导出放入 async bootstrap，await readyDocuments 后才创建两个根；暴露 uiReviewStartup Promise。
- scripts/ui-review/fixtures/frontend-redesign/shared/theme.mjs：声明 startup Promise 表达式，既有语言/对比度/动效/132 浮层断言保持。
- scripts/ui-review/run.mjs：在 fixture.ready 前等待声明的 startup Promise；失败传播到真实 runner 非通过结果，不用任意 sleep 或吞掉启动错误。
- scripts/ui-review/fixtures/frontend-redesign/shared/readiness.test.mjs（新增）：使用真实 HTTP 流式主文档、iframe parser-blocking script 和显式请求握手控制启动次序；不是 mock Document。每个 Chrome 用独立 profile，退出后只清理本用例 server/连接/profile，没有全局 Chrome/node 清理。

没有修改生产/theme/CSS、依赖/适配器、构建产物、配置、领域数据、正式 Evidence/状态或先前报告；没有 stage/commit/push。

### 实际验证

过程材料仅在 /tmp/huhu-fixture-startup。

| 命令/检查 | 实际结果 |
|---|---|
| node --test scripts/ui-review/fixtures/frontend-redesign/shared/readiness.test.mjs | 退出 0；5 tests（startup-final.log） |
| node --test scripts/ui-review/run.test.mjs | 退出 0；6 tests（cli-final.log） |
| node scripts/ui-review/run.mjs --suite frontend-redesign --ticket T-01 --matrix redesign --out /tmp/huhu-fixture-startup/matrix-final | 退出 0；66 cases、132 overlays、errors=[]、198 截图（matrix-final.log/result.json） |
| git diff --check -- 本轮授权写集 | 退出 0 |
| 最终五文件 snapshot SHA256 复核 | 无 drift；runner inputs 也记录新增 ready-documents.ts |

启动回归分别证明：

1. 真实 srcdoc head 解析时重现原 null.body/append 故障。
2. 主文档分段传输且 iframe head 阻塞时，helper 保持 pending；最终两个文档各 mount 一次，目标 URL=about:srcdoc、readyState=complete，返回对象不是初始 about:blank。
3. iframe 一直停在 complete 的初始 about:blank 时，deadline reject，而不是假通过。
4. 主文档解析未完成时，main deadline reject；随后主文档完成也不会重新进入 mount。
5. main/srcdoc 已完成的路径也正常返回，覆盖监听注册后的立即检查。

先前 startup-first.log 的第二例曾因回归 harness 在 DOMContentLoaded 回调里才创建 iframe，导致 helper 合理报告缺少 iframe，测试退出 126。随后把 iframe 放入真实主文档解析流，并以 HTTP 请求握手阻塞/放行子文档，startup-second 与最终五例通过；没有放宽 helper 条件。这个 harness 失败不冒充产品红灯；原 Lead 失败与真实 legacy mount 反例才是根因证据。

最终矩阵完整保留 007/008 的七宽度、desktop 窄叶、独立 mobile/coarse、CSS320/200% 模拟、两种减少动效、en/zh 真语言、纸/墨×六强调色及 huhu/obsidian safe/unsafe，两个 Document 的已打开浮层、真实色对与 owner 都检查。生产主题输入未由本次修改，未以修 fixture 之名弱化断言。未重复无变化的主题/editor/CSS 守卫或全仓迁移检查；未宣称全量 build、真实 Obsidian/popout 或其他平台通过。

### Skill 执行与固定候选

沿用已读取且未变化的 dev/ui 与 SpecDev I 合同，实际应用最小范围、所属 Document、明确资源清理、真实浏览器与失败传播要求；本次为 fixture/runner 修复，不改产品视觉或文案，不需要重建 shared CSS/main.js。正式状态/证据和独立审查仍归 Lead，无递归派遣。

基线 HEAD：37fcede4210a19bcc2a74809e7fdd301e5717957。
五文件快照：/tmp/huhu-fixture-startup/snapshot/manifest.json。
快照摘要：dffa6d6ae9fe6a750ffe8200441c9ecc611b74c286ea9ee419a31105f9a809f7。
最终 result：/tmp/huhu-fixture-startup/matrix-final/result.json。
最终 inputDigest：9bf6d013373d3ad1a8750d2c6379fc387eb0c0e0bece4fb848cb62c3e7d4c1d1。
源码已明确冻结，写本报告后不修改；旧 007/008 报告保持原样。

## 问题与下一步

本轮独立检查无阻塞。Lead 可核对固定输入、执行独立完整 E2E 并 high 审查这五文件启动差异；全量消费者迁移和真实宿主边界继续保持原待验证状态，不因本次 fixture 通过而关闭。
