# 浏览器二阶段实现与交付边界

本次变更对应 [Issue #1](https://github.com/NAMEWTA/obsidian-huhu/issues/1)、[完整补充评论](https://github.com/NAMEWTA/obsidian-huhu/issues/1#issuecomment-6444719490) 和用户提供的 `obsidian-huhu-browser-phase2-implementation-plan.md`。实现汇总在 [PR #14](https://github.com/NAMEWTA/obsidian-huhu/pull/14)。本文不是整份 Issue 的完成声明，也不替代真实宿主和平台验收。

## 分支与范围

- 开发基线：`NAMEWTA/1236@8b5c2b3667e4d9af82e25bd1ca149e32b272e1f4`。
- PR head：`feat/browser-phase2-issue-1`；base：`NAMEWTA/1236`，不是 main。
- [PR #5](https://github.com/NAMEWTA/obsidian-huhu/pull/5) 的 head `206abb5182e55bdce820895c2e71eaafdc97b4e0` 已是基线祖先；没有再次 cherry-pick。
- 关联用 `Refs #1; Follow-up to #5`。不自动合并、关闭 Issue、升版本或发布，不修改用户资料。

保留每 live Space 独占的受管 Chromium、Profile、Worker 和原生 Gate。没有增加 Electron webview 后备路线、第二个 CDP writer 或 Bot 执行引擎。现有 issued/lowWater 账本、全量元数据事件、scope/coverage 观察和元素材料是基线能力，本文不把它们记成本次新写。

## 实际实现

### 控制权与同页交接

`core/authority.ts` 集中执行纯作用域检查，不取得原生权威。撤权、授权和续租 ACK 都必须匹配 runtime/epoch，确认传输仍 open，且派发序号为非负安全整数。最终 catalog 持久化及同步订阅通知之后，再核对 intent、runtime、当前 lease 和 viewer；持久化期间发生暂停不能返回可用的旧 Run。

可信公开 `BrowserWorkspace.handoffAgent` 接受来源 Run/runtime/epoch、明确 Page 和目标执行身份。首先核验来源权限，再经现有控制转换撤销 A，生成 B 的新 Run/capability/lease。Page ID、原始 Target、Profile 和活 DOM 不重建；操作不重开 URL，也不复制表单值。重放 A 的请求不能撤掉已接管的 B。

`BrowserExecutionRef` 只保存外部 consumer/Agent/Run/Attempt 标识及交接来源，不赋予这些字符串权限。它不创建或调度 Agent。工作台提供显式确认入口，取消无副作用，拒绝重复确认和过期授权，输入法组字 Enter 不触发交接。交接后的连接必须由用户重新复制；旧连接不能读取新凭证。

B 在交接的 Page 重新 `observe` 前不能写入、开页或关页。人→Agent、暂停后的重新授权也要求新的观察；纯 status/history 查询不解除门禁。旧 Run 的读取、写入、stop、heartbeat 和迟到 Promise 都不能改变 B 或泄露人工阶段内容。

### 唯一方法注册表与结果验证

`core/protocol.ts` 的 18 个方法统一关联输入、输出和策略（scope、risk、exposure、idempotency、deadline、response budget）；`protocol-results.ts` 负责结构化结果。服务端返回与 CLI 接收均执行结果校验和字节预算，`operation.get` 的不存在值归一为 null。

这不是“所有业务结果已完全强类型化”：操作结果 payload 仍是 JSON 扩展边界；MCP 仍为最小 stdio 2024-11-05 适配，不宣称使用官方 SDK 或已完成所有模型工具装配。可信 handoff 不是模型协议方法，网页内容无法通过该入口自授控制权。

### 填写核验与焦点链

`runtime/editing-functions.ts` 中只有固定内部函数，没有模型提供的 JavaScript。fill 在准确 ref/session 上确认编辑目标、聚焦和全选，保留只在页面内的读回闭包，**仅插入一次**，随后返回：

| verification | 语义 |
|---|---|
| matched | 即时读回与请求一致，ok=true |
| rejected | 页面保留原值，ok=false |
| truncated | 读回是请求的较短前缀，ok=false |
| transformed | 页面改变了输入，ok=false |
| unverified | 元素已脱离或读回结构不可确认，ok=false |

结果只投影 ok/verification/sensitive，不返回实际字段值、原值或密码长度。未确认不自动重发；派发后撤权/失联仍由账本表达 outcome_unknown。`completed` 是操作处理终态，不等于网站业务表单已经通过校验；调用方必须查看 verification。

fill/type 还检查从子 frame 到顶层的每一个 iframe owner 是否实际持有焦点；同进程 iframe、嵌套 iframe、OOPIF 均使用归属明确的父 session。每个异步读取前后校验租约和 frame 文档，缺失 owner、重定向焦点、旧 frame 均拒绝输入。不通过操作系统键盘、剪贴板或宿主焦点完成输入。即时读回不承诺未来异步格式化或服务端业务成功。

## Halo 源码参考与差异

固定源码：[openkursar/hello-halo@23f468bf6eb3d0feebf9f1b8309d18f949a0de4d](https://github.com/openkursar/hello-halo/tree/23f468bf6eb3d0feebf9f1b8309d18f949a0de4d)。此次读取的是静态源码，不是运行 Halo 后的兼容证明。以下为实际审读的重点映射，不宣称逐行审计了整个项目。

| Halo 文件/函数 | 读取到的机制 | HUHU 对应与差异 | 验证入口 |
|---|---|---|---|
| ai-browser/tools/index.ts / buildAllTools | 实际注册 14 工具，保留文件不等于工具开放 | 一个方法注册表；不照搬 retired 工具 | core/protocol.test.ts |
| sdk-mcp-server.ts / createAIBrowserMcpServer | 唯一装配入口，幂等安装下载 handler，scoped context | 公开 BrowserAgentAccess + 同一协议服务；没有 Bot 引擎冒名 | protocol-service、rpc-server 测试 |
| context.ts / PageOperation、assertActive | 固定原 WebContents、页面版本、超时和迟到结果清理 | 显式 Page/runtime/epoch/ref；最终权威仍是 native | workspace、driver-lifecycle 测试 |
| snapshot.ts | AX/backend node UID 与过滤、引用注册 | 保留基线 AX/DOM/布局、逐 frame coverage，不退回全局活动页 | driver-observation 测试 |
| tools/input.ts、fill-check.ts | 聚焦后选中，填写后比对，密码抑制 | 固定页内闭包只返回核验分类；跨父 frame 校验，绝不回显值 | editing-functions、driver-observation 测试 |
| browser-input/operation.ts | 记录按下的键/按钮，绑定原目标释放 | HUHU 使用原生有界输入批次和现有 IME 收敛，不引入第二 writer | driver-ime、worker-control 测试 |
| browser-host/manager.ts | webview 固定宿主和共享 persist:browser | 只借鉴展示/执行生命周期分离；拒绝共享个人 partition | frame-broker、ownership 测试 |
| tools/script.ts / browser_run | 文件路径白名单、读文件、限时执行页面 JS | 不复制宽泛页面执行权限；当前 raw evaluate/脚本 Action 不开放 | 协议未知方法/字段拒绝测试 |

Halo 实际注册的 14 项与本次能力声明：

| Halo 工具 | HUHU 对应 | 状态/差异 |
|---|---|---|
| browser_navigate | operation.prepare/execute navigate | 已有，显式 Page |
| browser_wait_for | wait | 已有，有界条件 |
| browser_click | click | 已有，ref/actionability |
| browser_fill | fill | 本次新增写后分类核验 |
| browser_hover | 无单独 Agent hover | 未开放，不伪装支持 |
| browser_press_key | press | 已有，原生门禁 |
| browser_upload_file | opaque fileId + upload | 已有，不接收任意路径 |
| browser_snapshot | observe | 已有，带 scope/coverage |
| browser_screenshot | screenshot | 已有，当前授权范围 |
| browser_evaluate | 无 | 未开放，不绕过 Gate |
| browser_run | 无脚本/Action runner | 未开放；结构化可复用 Action 尚未实现 |
| browser_tab | page.list/open/close | 已有，明确作用域 |
| browser_inspect | 受限 observe/material | 不宣称等价开发者工具 |
| browser_download | download.list + 人工导出 | 已有，不开放任意导出路径 |

许可证边界：参考版本根 LICENSE 包含 MIT 正文及 Additional Terms，不能笼统称为无附加条件 MIT。此 PR 为机制参考和独立实现，未复制 Halo 源文件、依赖或图标，不新增许可不明代码。后续需要直接复用时必须单独核对相应文件和附加条款。

## 计划工作包状态

| 包 | 实际交付 | 尚缺部分 |
|---|---|---|
| P0 | 固定本仓和 Halo SHA、已有能力盘点、重点函数映射 | Halo 全量调用链逐文件审查尚未完整闭合 |
| P1 | authority 提取、18 方法注册表及输入/输出校验 | 全部 command-specific outcome、能力事实统一驱动所有 UI/工具仍需补齐 |
| P2 | 授权 ACK、最终持久化竞态及回归 | 全 await 故障矩阵、饱和 IPC 和多平台原生收容未完成 |
| P3 | fill 结果、子 frame 焦点链、回归与真实脚本场景 | 更完整 actionability/复杂控件、异步格式化与平台原生 IME |
| P4 | 同 Page A→B、迟到调用隔离、人工交回 fresh observation、可信身份接口 | #9 的真实 Bot consumer 与执行树端到端，不由 Browser 伪造 |
| P5 | 保留并复测已有 ledger/events/material/identity/files | 新结构化 Action runner、全耐久故障点和消费者 unknown 回执矩阵 |
| P6 | 确认式交接 UI、en/zh、重复点击/取消/IME DOM 回归 | 真实宿主嵌入/多窗口/读屏及 Bot 工具实际消费 |
| P7 | 追踪矩阵、构建/测试与预算来源记录、同一 PR 提交 | 当前 HEAD 的真实宿主、Windows/macOS、性能 p95/CPU/RSS 必须证据 |

所以 PR 保持 Draft；不能把本轮可运行增量称为全计划或 #1 已完成。未支持平台继续显式 unsupported，没有关闭测试或降级浏览器沙箱以凑通过。

## 验证与复现

完整编号与证据边界见[逐项追踪](browser-phase2-traceability.md)。构建/单元/DOM 与 native/宿主是不同证据层次。

本地环境为 Linux x64、Node 24.21.0、按 pnpm-lock.yaml 固定依赖。网络不可用时由 GitHub Actions 导出锁定依赖到工作区；本地按 package scripts 执行相同 node/tsc/eslint/vitest 入口，不修改 lockfile 或安装源码依赖。

```sh
pnpm install --frozen-lockfile
pnpm run build:css
pnpm run build
pnpm run lint
pnpm run lint:css
pnpm run test:architecture
pnpm run test:i18n
pnpm run test:docs
pnpm run check:bundle
pnpm run check:notices
TZ=UTC pnpm exec vitest run --maxWorkers 2
```

原生验收使用 `scripts/verify-browser-runtime-native.mjs`；本次增加填写匹配/拒绝/截断/转换/失联、密码不回显、焦点重定向与同源/OOPIF 输入。仅添加脚本不等于该脚本通过。GitHub 的 Browser runtime Linux x64 工作流负责真实沙箱 Chromium 和 Rust。真实 Obsidian 仍使用现有 `scripts/obsidian-acceptance/agent-browser-v2.mjs`，不能引用旧 PR 的 50/50 为本 HEAD 结果。

同一源文件集合的本地验证摘要保存在 `docs/evidence/browser-phase2-local.json`；远端工作流将 tested SHA、构建日志、测试 JSON、产物摘要绑定在同名 artifact。临时开发依赖/源码传输流程在交付前移除，不属于产品运行机制。

## 包体预算的可核验调整

旧预算在未修改的指定基线上已经失败，不能把历史预算当成本次真实增量。相同 Node/依赖/构建脚本下：

| 项 | 原预算 | 未改基线实测 | 本次源码实测 |
|---|---:|---:|---:|
| main.js | 6,407,168 | 6,732,204 | 6,751,229 |
| styles.css | 1,423,360 | 1,423,188 | 1,424,761 |
| eager | 128,000 | 127,487 | 127,487 |
| browser activation | 252,928 | 299,361 | 315,739 |
| agent activation | 992,256 | 994,649 | 994,660 |
| home activation | 492,544 | 492,595 | 492,595 |
| archives activation | 176,128 | 337,337 | 337,337 |
| versioning activation | 157,696 | 194,690 | 194,690 |

只将超限项按 KiB 向上取整，其他门限、128,000 eager 上限与禁止启动加载区域不变。没有改变 archives/home/versioning 源码；main 增量 19,025 字节，样式增量 1,573 字节。该调整是重建可用的真实门禁，不是对性能 p95 或 CPU/RSS 的证明。

## 升级和回退

没有更改磁盘目录身份、schemaVersion、Cookie 密文格式或旧数据迁移策略。新增执行身份仅为 Run 元数据，运行时撤权仍使旧连接无效。main.js、styles.css、Worker、CLI 及其摘要必须一起提交和安装；不能混用旧 Worker 与新主插件。回退程序前停止 live Space，按现有 Profile 版本护栏处理，不删除 Profile 来掩盖不兼容。仍不恢复旧 API、旧网页宿主或 raw evaluate。
