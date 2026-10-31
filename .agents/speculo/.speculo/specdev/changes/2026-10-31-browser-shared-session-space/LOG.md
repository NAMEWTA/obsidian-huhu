# 当前 change 设计与规划日志

## LOG-001

日期：2026-10-31；轮次：1（摄入已明确来源，不伪造新访谈）。

问题：是否保留旧 Native 路径？

决定：完全替换；没有 Native fallback、双写或协议兼容。

依据：Issue §1、§4 D01/D10、§17–18；<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/source.md</Path> / <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/sources/USER-001.md</Path>。影响：作为对应规格/票据约束；不是已实现证明。

## LOG-002

日期：2026-10-31；轮次：1（摄入已明确来源，不伪造新访谈）。

问题：同一个 Space 是否还要区分人/Agent profile？

决定：不区分。同一 Page 还必须是同一 live guest，不能只共享 Cookie。

依据：Issue §2、§4 D02/D03；<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/source.md</Path> / <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/sources/USER-001.md</Path>。影响：作为对应规格/票据约束；不是已实现证明。

## LOG-003

日期：2026-10-31；轮次：1（摄入已明确来源，不伪造新访谈）。

问题：个人 Space 能否被自动观察？

决定：禁止全部 Agent 读写；可信 UI 显式转换并重新授权后才成为任务 Space。

依据：Issue §9–10、§23；<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/source.md</Path> / <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/sources/USER-001.md</Path>。影响：作为对应规格/票据约束；不是已实现证明。

## LOG-004

日期：2026-10-31；轮次：1（摄入已明确来源，不伪造新访谈）。

问题：接管是否可以等待普通动作队列？

决定：不可以；高优先级最终执行 fence，撤销读写及迟到结果，新代次交回。

依据：Issue §10；<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/source.md</Path> / <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/sources/USER-001.md</Path>。影响：作为对应规格/票据约束；不是已实现证明。

## LOG-005

日期：2026-10-31；轮次：1（摄入已明确来源，不伪造新访谈）。

问题：超时是否自动重试点击？

决定：派发后不确定为 outcome-unknown，先观察/对账，不自动重放。

依据：Issue §11.5；<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/source.md</Path> / <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/sources/USER-001.md</Path>。影响：作为对应规格/票据约束；不是已实现证明。

## LOG-006

日期：2026-10-31；轮次：1（摄入已明确来源，不伪造新访谈）。

问题：不兼容是否自动迁移/删除旧数据？

决定：不读取/迁移旧数据，默认保留；Session 数据由 Electron 本机管理，清理明确确认与 tombstone。

依据：Issue §8、§16、§18；<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/source.md</Path> / <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/sources/USER-001.md</Path>。影响：作为对应规格/票据约束；不是已实现证明。

## LOG-007

日期：2026-10-31；轮次：1（摄入已明确来源，不伪造新访谈）。

问题：是否暴露任意 evaluate/CDP？

决定：不暴露；结构化动作、短期元素引用、能力上限、诚实 frame 覆盖。

依据：Issue §11–12；<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/source.md</Path> / <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/sources/USER-001.md</Path>。影响：作为对应规格/票据约束；不是已实现证明。

## LOG-008

日期：2026-10-31；轮次：1（摄入已明确来源，不伪造新访谈）。

问题：是否无条件使用 webview？

决定：仅作为首选候选；F01–F12 实测后固定一个表面，不能以当前文档推定宿主支持。

依据：Issue §4–5；<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/source.md</Path> / <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/sources/USER-001.md</Path>。影响：作为对应规格/票据约束；不是已实现证明。

## LOG-009

日期：2026-10-31；轮次：1（摄入已明确来源，不伪造新访谈）。

问题：是否重写 Shell/Bot/终端？

决定：否；复用公开 API、模块服务撤销、材料贡献点、Go/HAP 边界。

依据：Issue §0.1、§3、§13；<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/source.md</Path> / <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/sources/USER-001.md</Path>。影响：作为对应规格/票据约束；不是已实现证明。

## LOG-010

日期：2026-10-31；轮次：1（摄入已明确来源，不伪造新访谈）。

问题：是否优先做 Cookie 导入与高级 MCP？

决定：否。Cookie 导入/系统浏览器提取/高级 MCP 后置，但既有 CLI 必须同步切换。

依据：Issue §14–15；<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/source.md</Path> / <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/sources/USER-001.md</Path>。影响：作为对应规格/票据约束；不是已实现证明。

## LOG-011

日期：2026-10-31；轮次：1（摄入已明确来源，不伪造新访谈）。

问题：是否另创浏览器主题与胶囊控件？

决定：否；继承用户指定 UI-001 和 DESIGN-0002，圆角 6/8/12/14，全圆仅开关/单选。

依据：本轮用户来源 + DESIGN-0002；<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/source.md</Path> / <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/sources/USER-001.md</Path>。影响：作为对应规格/票据约束；不是已实现证明。

## LOG-012

日期：2026-10-31；轮次：1（摄入已明确来源，不伪造新访谈）。

问题：是否立即实施产品？

决定：否；只提交文档和离线原型，一个 PR，Refs #38，不关闭 Epic。

依据：sources/USER-001.md；<Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/source.md</Path> / <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/sources/USER-001.md</Path>。影响：作为对应规格/票据约束；不是已实现证明。

## LOG-014

技术未知不转嫁给用户：P0 唯一表面、宿主能力、清理 API 与支持组合均由 T-01 产出。不会为缺少实机证据伪造采纳 WebContentsView 或“webview 已验证”的 ADR。

## LOG-015

研究按 G/research 执行，接收目标为本 change 的 reuse-analysis.md 与本日志。已核对 Surfing 固定 commit 的 page.ts、server.ts 片段及 MIT；采用隔离世界/真实输入/HTTP 防护模式，但不采用核心 Web Viewer 私有对象、全局令牌、通用 evaluate 或无代次的异步输入循环。完整记录见 <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/reuse-analysis.md</Path>。

## LOG-016

工作流应用：T intake 冻结来源；G 将已有决定与未确认原型分开；Prototype 继承基线；S 建立 AC-001–AC-040 与 F01–F12；Tickets 建立 13 张含依赖、验收、写集和缺口的 future drafts；Goal 只编排。全程无生产写入授权。官方 validator 未取得完整可运行依赖，未执行；自有检查不能替代其结果。

## LOG-017

计划质量自审（非独立审查）：按 common/skills/plan-quality-review/references/checklist.md 检查背景、变更影响、复用、必需方法、图、验收、权限及恢复。背景/来源/40 条合同映射/无环依赖/文档范围可以由本地检查复核；精确消费者调用图、三平台、最终 surface、设计批准、官方 schema/stage 验证仍阻断执行 Ready。T-09/T-12 的宽写集仅是候选，T-01 产出清单后必须收窄再重审，不能据此重写整个 Bot。

## LOG-018

交付限制：GitHub 连接器没有 branch/commit/PR 写接口；插件检索没有可用替代写工具，连接浏览器只有读取能力，容器 GitHub DNS 失败。只形成本地可应用补丁与 PR 正文；不谎称 remote PR 已建立，也不把工具限制说成仓库无权限。
