# GitHub 优先复用研究与适配决定

检索与阅读日期：2026-10-31。先看当前 HUHU 可复用能力，再检索同类插件/浏览器与官方 Electron 文档。下面区分“读过具体实现”“只发现候选”“拟采用但未验证”，不以 star 数或 README 声称成熟度。本轮没有向产品复制第三方源码或引入依赖。

## R-001：现有 HUHU 的窄宿主桥和模块边界——直接复用职责

来源：https://github.com/NAMEWTA/obsidian-huhu/blob/974105b47e03c108df0f5e0c3fc9606fe4b79aee/src/host/desktop/electron-main.ts、https://github.com/NAMEWTA/obsidian-huhu/blob/974105b47e03c108df0f5e0c3fc9606fe4b79aee/src/modules/browser/module.ts、https://github.com/NAMEWTA/obsidian-huhu/blob/974105b47e03c108df0f5e0c3fc9606fe4b79aee/src/modules/browser/api.ts。

保留 desktopRemote/bundledMain 的固定打包策略机制，保留服务键/材料贡献点发现和 owner 生命周期；重写浏览器业务政策，不扩大为任意远程 require/eval。先复用 vaultIdentity、秘密保护、文件 grant 和 UI 原语，避免复制一套身份/主题/效果账本。该代码真实宿主可用性仍由 P0 验证，源码存在不代表新场景已通过。

## R-002：PKM-er/Obsidian-Surfing——优先适配的同宿主先例

固定 commit：`1bf883852e2e068dc74deec97a3b76a64849e8e0`；该 main 提交为 2026-10-14 的 Release 1.0.0，满足近期维护的筛选条件。已读 page.ts 完整、server.ts 第 1–210 行、根 LICENSE；不称整仓安全审计完成。

- 页面驱动：https://github.com/PKM-er/Obsidian-Surfing/blob/1bf883852e2e068dc74deec97a3b76a64849e8e0/src/mcp/page.ts
- 本地服务器：https://github.com/PKM-er/Obsidian-Surfing/blob/1bf883852e2e068dc74deec97a3b76a64849e8e0/src/mcp/server.ts
- 许可：https://github.com/PKM-er/Obsidian-Surfing/blob/1bf883852e2e068dc74deec97a3b76a64849e8e0/LICENSE

| 已读做法 | 采用方式 | HUHU 必补或拒绝 |
|---|---|---|
| 同 WebContents 上 isolated-world 读取与固定 page agent | 作为 T-05 的 driver 设计先例 | JSON 类型/深度/大小校验，不只 as 类型断言；world ID 与宿主冲突要实测 |
| sendInputEvent / insertText 与 viewport capturePage | 按同 guest 真实输入和按需截图适配 | 坐标/zoom 实测；每个 await 后 fence；失焦、IME、user activation fixture |
| snapshot 标记不可读跨源 frame 与 truncation | 保留明确 coverage/errors | ref 必须增加 Space/Page/document/frame/代次/批次/期限及语义验证 |
| loopback、Host 检查、拒绝 Origin、随机 bearer、安全比较、有界请求 | 借鉴 T-10 的请求边界与测试结构 | HUHU 短期按实例/任务/Space/代次授权；不能全局令牌操作所有页 |
| 抓全页时 debugger/CDP | 不纳入第一版最小能力 | 只需 viewport/clip；不向标准 Agent 暴露 CDP |
| 默认当前 tab / 兼容核心 Web Viewer 的使用假设 | 不采用 | 只能操作 HUHU 登记的 guest，不能访问核心私有对象或其他插件页 |
| Defuddle 内容转换 | 本轮不新增依赖 | 优先复用已有材料处理；将来确需才审依赖许可/体积/HTML 安全 |

关键差距：clickAt 与按键循环含异步 sleep；直接搬入 HUHU 会留下撤权后续输入窗口。适配不是复制方法名，需要把最终派发接到 ControlFence，并测试校验之后、输入之前的竞态。upstream 的可运行实现是先例，不是 HUHU B01–B40 的证据。

许可已核对为 MIT，Copyright (c) 2022 Dion Tryban (Trikzon)。未来直接复制/改编实质源码必须保留其许可与署名，按 HUHU notices 流程登记固定来源；依赖独立审查。现在仅文档借鉴与原创离线原型，未把第三方生产代码直接分发。

## R-003：Min——浏览器交互参考，不采用运行时

来源：https://github.com/minbrowser/min ，已读 README，Git blob `32e48dd79ca8f857265994341604a32ee91e77c7`；仓库展示 Apache-2.0。未对其主进程/标签模块逐文件审查，因此不作为直接代码复用结论。

可借鉴任务分组、低干扰标签/地址栏和普通浏览器心智；不采用独立 Electron 应用启动、内核发行与打包体系，这会重新制造 Issue 要删除的分发责任。它不是 Obsidian 插件能力证明；无需为“成熟”引入完整 browser shell。

## R-004：ObsidianCustomFrames——发现级对照，不直接复用

来源：https://github.com/Ellpeck/ObsidianCustomFrames ，检索显示 MIT；本轮没有固定其实现 commit 或审查安全链，故只保留为后续 P0 嵌入行为对照，不把它纳入代码选用清单。iframe/webview 面板本身不能证明 Agent 单写者、Session 清理和最终撤权成立。

## R-005：Electron 官方能力语义——必须按宿主版本验证

| 原始来源 | 采用结论 | 限制 |
|---|---|---|
| https://www.electronjs.org/docs/latest/api/session | partition 与 Session、持久化、权限、下载和清理的职责 | 最新 API 如 clearData 不自动适用于最小宿主；空 partition 是 defaultSession，不可用 |
| https://www.electronjs.org/docs/latest/api/webview-tag | webview guest、首次配置、异步事件与稳定性警告 | 宿主需启用 webviewTag；DOM 中可写标签不等于 Obsidian 支持 |
| https://www.electronjs.org/docs/latest/api/web-contents-view | 主进程原生 View，可绑定 WebContents | 不是 React DOM；bounds/裁剪/层级/多窗必须测试 |
| https://www.electronjs.org/docs/latest/api/web-contents | 受控输入、执行、截图与 guest 生命周期 | 具体版本、输入语义、user activation 需 fixture |
| https://www.electronjs.org/docs/latest/tutorial/security | Node 禁用、隔离、sandbox、导航/权限/窗口和 IPC sender 校验 | 不能照抄片段就宣称跨宿主安全通过 |

## 复用优先级与停止条件

R-001 保留本项目职责 → R-002 适配最贴近宿主的驱动/HTTP 模式 → 官方 API 验证 → 仅对 HUHU 特有授权/归属/契约写最小 glue。不会为了复用而引入整仓、复制扩展生态或调低安全配置。P0 如证明某模式不适用，记录原因回 ADR/Spec；不得静默用 Native 或系统 Chrome 替代。
