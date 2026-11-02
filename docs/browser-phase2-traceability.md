# 浏览器二阶段逐项追踪

来源：[Issue #1](https://github.com/NAMEWTA/obsidian-huhu/issues/1)、[补充评论](https://github.com/NAMEWTA/obsidian-huhu/issues/1#issuecomment-6444719490) 及上传计划的 X 场景。基线、改动和交付门禁见[二阶段交付](browser-phase2.md)。

**状态解释：** “回归/子场景”不等于整行验收完成。代码和测试入口只说明现有证据定位；每一行最后一列明确保留缺口。没有实机结果的行不能因单测通过改成完成。所有 W/P/D/I/L/E/C/F/M/V/O/A/Q/R/N 组本地执行平台为 Linux x64、Node 24.21.0，命令为 `TZ=UTC pnpm exec vitest run src/modules/browser --maxWorkers 2` 或全仓同命令；实际计数和源码摘要见 `docs/evidence/browser-phase2-local.json`。X 组是拒绝未开放扩展，不是实现扩展的证据。真实 Chromium、宿主、OS provider、Windows/macOS 的结果均须另附对应 SHA 证据。

## 证据组与准确路径

路径均相对 `src/modules/browser/`；每个编号通过组键对应实现、测试和层次。这样不把同一个服务夹具重复包装成多个独立实机通过项。

| 组 | 实现 | 测试 | 能证明的层次 |
|---|---|---|---|
| W | `services/workspace.ts` | `services/workspace.test.ts` | 服务夹具；控制、生命周期与故障子场景 |
| P | `core/protocol.ts`、`services/protocol-service.ts` | `core/protocol.test.ts`、`services/protocol-service.test.ts`、`platform/desktop/rpc-server.test.ts` | schema/真实 loopback 服务；不是 Bot 模型 E2E |
| D | `platform/desktop/runtime/driver.ts` | `platform/desktop/runtime/driver-observation.test.ts`、`platform/desktop/runtime/driver-lifecycle.test.ts` | 生产 driver + CDP 线缆夹具；不是全站实机 |
| I | `platform/desktop/runtime/driver.ts` | `platform/desktop/runtime/editing-functions.dom.test.ts`、`platform/desktop/runtime/driver-observation.test.ts`、`platform/desktop/runtime/driver-ime.test.ts` | DOM/驱动；native 脚本另证 |
| L | `services/operation-ledger.ts` | `services/operation-ledger.test.ts`、`platform/desktop/persistence/operation-ledger.integration.test.ts` | 账本/真实临时持久化；不是全部崩溃点 |
| E | `services/run-events.ts` | `services/run-events.test.ts`、`services/workspace.test.ts` | 元数据、cursor、重入与溢出子场景 |
| C | `services/identity-provision.ts`、`services/identity-service.ts` | `services/identity-provision.test.ts`、`services/identity-service.test.ts`、`platform/desktop/identity/credential-store.test.ts` | 合成身份/真实密文文件；系统 provider 为桩 |
| F | `platform/desktop/files/file-service.ts` | `platform/desktop/files/file-service.test.ts` | 真实临时文件；原生选择器未验 |
| M | `services/workspace.ts`、`ui/SendMaterialButton.tsx` | `services/workspace.test.ts`、`ui/SendMaterialButton.dom.test.tsx` | 材料/草稿服务和 DOM；实际消费者待验 |
| V | `services/frame-broker.ts`、`ui/SpaceViewer.tsx` | `services/frame-broker.test.ts`、`services/stream-pipeline.test.ts`、`ui/SpaceViewer.dom.test.tsx` | 帧/组件；真实多窗口 DPI 待验 |
| O | `platform/desktop/persistence/browser-persistence.ts`、`platform/desktop/cleanup-jobs.ts` | `platform/desktop/persistence/browser-persistence.test.ts`、`platform/desktop/cleanup-jobs.test.ts`、`platform/desktop/runtime/ownership.test.ts` | 真实临时目录/归属；多平台进程待验 |
| A | `core/authority.ts`、`ui/HandoffAgentButton.tsx` | `core/authority.test.ts`、`services/workspace.test.ts`、`ui/HandoffAgentButton.dom.test.tsx` | 本次新增服务/DOM；不是 Bot 端到端 |
| Q | `module.ts`、`api.ts` | `services/create-workspace.test.ts`、`ui/BrowserWorkspace.dom.test.tsx` | 模块/组件；架构、i18n、构建另证 |
| R | `platform/desktop/runtime/assets.ts` | `platform/desktop/runtime/assets.test.ts`、`platform/desktop/runtime/profile-version.test.ts` | 资产/版本夹具；平台运行包另证 |
| N | `platform/desktop/runtime/worker.ts` | `platform/desktop/runtime/worker-control.test.ts`、`platform/desktop/runtime/host-control.test.ts` | 控制夹具；Rust/native 实机另证 |
| X | `core/protocol.ts` | `core/protocol.test.ts` | 未开放扩展；拒绝不等于实现了该能力 |

## FR

| ID | 需求/场景摘要 | 证据组 | 本次状态与未验证原因 |
|---|---|---|---|
| FR-01 | 独立模块与入口 | Q | 真实 Agent 关闭后的完整宿主链路待验 |
| FR-02 | Space 创建与目录 | W | 全创建 await 故障矩阵待补 |
| FR-03 | personal/task 权限 | P | 保留/回归子场景；完整宿主待验 |
| FR-04 | 独占进程与数据 | O | Windows/macOS 原生收容未交付 |
| FR-05 | 显式 Page 寻址 | D | 保留/回归；真实 UI 多页待验 |
| FR-06 | 基础浏览与 popup | D | 完整 POST/opener/Referer 矩阵待验 |
| FR-07 | 只读观察 | V | 多窗口性能/无观察者实机待验 |
| FR-08 | 单一人工接管 | A | 真实双窗及输入收敛待验 |
| FR-09 | 明确交回 | A | 新增 fresh observe；真实人工登录流程待验 |
| FR-10 | 感知与引用 | D | 已有 scope/coverage；部分失败实机矩阵待补 |
| FR-11 | 结构化动作 | I | 新增 fill/focus；复杂控件仍待验 |
| FR-12 | 运行与批次 | A | 同页交接已加；可复用结构化批次待补 |
| FR-13 | 可靠结果 | L | 已有低水位；全持久故障点未闭合 |
| FR-14 | 人工登录 | V | 真实宿主/第三方账号未验 |
| FR-15 | Cookie 导入 | C | 真实浏览器来源与系统 provider 未验 |
| FR-16 | 不可变身份版本 | C | 跨设备/密钥轮换实机未验 |
| FR-17 | 更多登录存储 | X | localStorage/IndexedDB 明确 unsupported |
| FR-18 | 文件能力 | F | 系统原生选择器未验 |
| FR-19 | 对话框和权限 | W | HTTP auth/敏感权限默认拒绝；完整人工策略待补 |
| FR-20 | 剪贴板边界 | I | 宿主 clipboard/PRIMARY 待验 |
| FR-21 | 重启与恢复 | W | 已有 desired/live 子场景；真实宿主重启待验 |
| FR-22 | 资源回收 | O | 平台进程崩溃矩阵待验 |
| FR-23 | 单协议接入 | P | 方法输出已加；命令细分结果/真实工具消费未全 |
| FR-24 | MCP 扩展 | P | 最小适配保留；官方 SDK 未接入 |
| FR-25 | 工作台整合 | Q | 真实嵌入/多窗待验，不新增 View |
| FR-26 | 设计材料 | M | 已有元素材料；完整 Bot consumer 待验 |
| FR-27 | 可解释诊断 | E | 完整长时事件与性能诊断待验 |
| FR-28 | 独立停用 | O | 真实宿主/平台关闭矩阵待验 |

## NFR

| ID | 需求/场景摘要 | 证据组 | 本次状态与未验证原因 |
|---|---|---|---|
| NFR-01 | 正确性优先 | A | ACK 和最终持久化回归已加；native 实机另证 |
| NFR-02 | 资源有界 | L | 限额保留；RSS/CPU/饱和 IPC 基准未完成 |
| NFR-03 | 可恢复 | O | 关键子场景回归；不是每个 await 已覆盖 |
| NFR-04 | 模块独立 | Q | 架构检查和服务注册；真实停用另证 |
| NFR-05 | 平台声明 | R | 仍仅 Linux x64，其他平台 unsupported |
| NFR-06 | 隐私 | C | synthetic secret/密文回归；OS provider 未验 |
| NFR-07 | 可维护性 | A | 提取纯 authority；workspace 进一步分解/细结果待补 |
| NFR-08 | 可访问与本地化 | V | en/zh/DOM；真实读屏/ownerWindow 待验 |
| NFR-09 | 可部署 | R | 构建摘要；最终发行包/签名平台另证 |
| NFR-10 | 可测试性 | Q | 分层回归；native/宿主不以单测替代 |

## G

| ID | 需求/场景摘要 | 证据组 | 本次状态与未验证原因 |
|---|---|---|---|
| G-01 | 生命周期 | O | 独立进程杀死/回收完整平台矩阵未全 |
| G-02 | 控制权 | N | 单元/夹具；饱和 pipe 原生证明未全 |
| G-03 | 页面时序 | D | 部分 driver/native 场景；worker 初始 realm 未全 |
| G-04 | 人的环境 | I | 真实 Obsidian 焦点/PRIMARY 未验 |
| G-05 | 包与沙箱 | R | Linux native 流程另证；其他平台未支持 |
| G-06 | 工作台 | V | 真实所属窗口、IME、读屏未验 |

## INV

| ID | 需求/场景摘要 | 证据组 | 本次状态与未验证原因 |
|---|---|---|---|
| INV-01 | Page/Target 单一归属 | D | 夹具回归，原生全矩阵另证 |
| INV-02 | Profile 单一 owner | O | 真实临时目录回归，平台进程另证 |
| INV-03 | personal 授权先行 | P | 协议拒绝回归 |
| INV-04 | 唯一 writer lease | A | ACK/交接/人交回新增回归 |
| INV-05 | native epoch 单调 | N | 服务/Worker 镜像回归，native 另证 |
| INV-06 | ready 前核验 | C | seed/保存失败回归，全 await 未全 |
| INV-07 | desired/live 分离 | W | 失败页重试回归，宿主另证 |
| INV-08 | 失败归属保留 | O | cleanup 持久化回归，平台另证 |
| INV-09 | 秘密不进入公开对象 | P | schema/输出脱敏回归，非全面渗透测试 |
| INV-10 | 耐久意图与不重放 | L | 账本临时文件回归，全崩溃点未全 |
| INV-11 | 来源不被写回 | C | 身份服务回归，真实账号未验 |
| INV-12 | 旧回调不改新状态 | W | 旧 finally/迟到观察回归 |

## T

| ID | 需求/场景摘要 | 证据组 | 本次状态与未验证原因 |
|---|---|---|---|
| T-01 | 模块独立 | Q | 真实宿主组合未验 |
| T-02 | 存储隔离 | C | 合成身份/文件回归，平台另证 |
| T-03 | 控制路由 | A | 夹具和 DOM，真实双窗未验 |
| T-04 | 原生撤销 | N | 饱和 pipe/卡住 Worker 矩阵未全 |
| T-05 | 输入状态 | I | IME 夹具，系统输入法/长拖拽未验 |
| T-06 | 个人隐私 | P | 迟到观察/事件/协议脱敏回归 |
| T-07 | 页面时序 | D | OOPIF/迟到 target 夹具，完整 popup 实机待验 |
| T-08 | 原生交互 | I | 真实宿主焦点/clipboard/PRIMARY 未验 |
| T-09 | 引用与批次 | D | 引用回归，完整批次/Action 待补 |
| T-10 | 去重与故障窗口 | L | 低水位/账本回归，全崩溃点未全 |
| T-11 | 身份语义 | C | Cookie 语义夹具，真实来源另证 |
| T-12 | Context | C | owned-default 设计；不声明任意多 Context |
| T-13 | 导入失败 | C | staging/target 清理夹具，全部 await 未全 |
| T-14 | 种子加密 | C | 真实密文文件+provider 桩，OS 未验 |
| T-15 | 文件 | F | 真实临时文件回归，原生选择器未验 |
| T-16 | 首次创建 | W | 创建/保存故障子场景 |
| T-17 | 恢复与保留 | W | 三页失败恢复子场景 |
| T-18 | 进程与清理 | O | 归属/cleanup 回归，平台强杀未全 |
| T-19 | 画面 | V | 帧/DOM/流回归，真实 DPI 未全 |
| T-20 | 本地桥 | P | 真实 loopback 和授权回归 |
| T-21 | 资源 | R | 配额/坏资产回归，性能/回退发行未全 |
| T-22 | 项目质量 | Q | 构建/架构等另附，真实宿主未验 |

## HB

| ID | 需求/场景摘要 | 证据组 | 本次状态与未验证原因 |
|---|---|---|---|
| HB-01 | Agent 关闭，Browser 独立 personal 浏览、身份与文件可用 | Q | 模块/组件；架构、i18n、构建另证 |
| HB-02 | Agent 嵌入与独立工作台同 Runtime/Page/Target，不重开 URL | V | 帧/组件；真实多窗口 DPI 待验 |
| HB-03 | 只读观察不改变 writer、目标或焦点 | V | 帧/组件；真实多窗口 DPI 待验 |
| HB-04 | 半填表单接管，原 DOM/字段保留，先撤权后输入 | A | 本次新增服务/DOM；不是 Bot 端到端 |
| HB-05 | 人登录后明确交回，新 lease/ref，fresh snapshot，不读密码 | A | 本次新增服务/DOM；不是 Bot 端到端 |
| HB-06 | 接管前读请求延迟返回、慢队列均不泄露人工阶段 | P | schema/真实 loopback 服务；不是 Bot 模型 E2E |
| HB-07 | 双窗口同时接管只有一人有效 | A | 本次新增服务/DOM；不是 Bot 端到端 |
| HB-08 | 控制窗口关闭/失联进入 paused，不自动恢复 Agent | W | 服务夹具；控制、生命周期与故障子场景 |
| HB-09 | Agent 输入不改人的 Obsidian 焦点、选区、正文、剪贴板 | I | DOM/驱动；native 脚本另证 |
| HB-10 | A/B 不同 task Space 同站操作，身份/页面/下载不串 | C | 合成身份/真实密文文件；系统 provider 为桩 |
| HB-11 | 同 Page A→B 显式交接，A 旧调用拒绝，B 重新观察 | A | 同页 A→B 和迟到 A 服务回归已加；真实 Bot/宿主未验 |
| HB-12 | personal/未授权 Page 的枚举、读写、关闭按权限拒绝 | P | schema/真实 loopback 服务；不是 Bot 模型 E2E |
| HB-13 | 导航/Target 替换/人工改页面后，旧 ref/旧帧拒绝 | D | 生产 driver + CDP 线缆夹具；不是全站实机 |
| HB-14 | 遮挡、disabled、动画、自定义下拉的实际可操作性 | D | 生产 driver + CDP 线缆夹具；不是全站实机 |
| HB-15 | 输入格式化/截断/拒绝/无法读回，结果准确且不回显秘密 | I | 写后分类、秘密抑制、迟到结果回归已加；native 脚本另证 |
| HB-16 | 同源/跨源 iframe、OOPIF、shadow 的范围、坐标和失败声明 | D | 生产 driver + CDP 线缆夹具；不是全站实机 |
| HB-17 | Popup POST、opener、Referer、重定向保留正确语义 | D | 生产 driver + CDP 线缆夹具；不是全站实机 |
| HB-18 | 后台/隐藏/静止页面有真实布局与画面，无人观察停流 | V | 帧/组件；真实多窗口 DPI 待验 |
| HB-19 | 慢 observer、多窗口、DPI/resize，帧有界、控制不堵 | V | 帧/组件；真实多窗口 DPI 待验 |
| HB-20 | down 后接管、修饰键、拖拽、IME 收敛或 blocked | I | DOM/驱动；native 脚本另证 |
| HB-21 | 工具禁用/撤权后，换工具或新 Run 不得绕过 | P | schema/真实 loopback 服务；不是 Bot 模型 E2E |
| HB-22 | Action hash 改变、恶意参数、路径越界拒绝 | X | Action runner 未实现；raw JS/任意路径未开放，不能记为场景完成 |
| HB-23 | JS 超时或网络效果未定，unknown 不当作可安全重试 | L | 账本/真实临时持久化；不是全部崩溃点 |
| HB-24 | 提交后断连/崩溃，重复 operationId 不再次提交 | L | 账本/真实临时持久化；不是全部崩溃点 |
| HB-25 | 同 ID 异 payload、旧 epoch、已回收票据冲突/gone | L | 账本/真实临时持久化；不是全部崩溃点 |
| HB-26 | 三页恢复第二页失败，完整 desired 保留，只重试失败页 | W | 服务夹具；控制、生命周期与故障子场景 |
| HB-27 | 首次创建/旧空间重开失败区别处理，不误删旧 Profile | W | 服务夹具；控制、生命周期与故障子场景 |
| HB-28 | 宿主/Worker/Supervisor/Chromium 各自退出，真实收容或 quarantine | O | 真实临时目录/归属；多平台进程待验 |
| HB-29 | 同库第二 owner、旧回调、旧 descriptor 清理不双写/误删 | O | 真实临时目录/归属；多平台进程待验 |
| HB-30 | Cookie path/hostOnly/SameSite/CHIPS 与目标完整集合不降级 | C | 合成身份/真实密文文件；系统 provider 为桩 |
| HB-31 | 弱密钥 provider、错设备、解密失败，不明文回退 | C | 合成身份/真实密文文件；系统 provider 为桩 |
| HB-32 | 导入取消、额外 Cookie、清理失败，不发布幽灵 ready | C | 合成身份/真实密文文件；系统 provider 为桩 |
| HB-33 | 文件替换、路径穿越、符号链接、跨 Space fileId 拒绝 | F | 真实临时文件；原生选择器未验 |
| HB-34 | 并发下载与危险文件名不串、不覆盖控制文件、不自动执行 | F | 真实临时文件；原生选择器未验 |
| HB-35 | 材料只进授权草稿，不覆写已有内容；笔记写入版本冲突可见 | M | 材料/草稿服务和 DOM；实际消费者待验 |
| HB-36 | 网页要求读取 Vault/密钥或提权时，不作为授权执行 | P | 网页内容不能调用可信 handoff；没有完整模型 prompt-injection E2E |
| HB-37 | RPC Host/Origin/旧令牌/配额；不暴露 CDP/密钥/内部控制 | P | schema/真实 loopback 服务；不是 Bot 模型 E2E |
| HB-38 | 事件乱序/缺口/重连/回收，cursor/resync/unknown 正确 | E | 元数据、cursor、重入与溢出子场景 |
| HB-39 | en/zh、主题、窄窗、ownerWindow、IME、读屏与键盘 | V | 帧/组件；真实多窗口 DPI 待验 |
| HB-40 | 停用 Browser、失败清理重试，其他模块可用且资料不丢 | O | 真实临时目录/归属；多平台进程待验 |

## X

| ID | 需求/场景摘要 | 证据组 | 本次状态与未验证原因 |
|---|---|---|---|
| X-01 | A handoff 后迟到 stop/cancel/heartbeat | A | 新增 late stop/heartbeat/observe/execute 回归；独立 cancel API 不存在 |
| X-02 | native revoke ACK 后注入旧队列命令 | N | 保留对应子场景；完整故障注入仍需核对，不视为该要求全部通过 |
| X-03 | grant 成功后 viewer 恰好销毁 | A | 已有 viewer 销毁与本次最终保存竞态回归 |
| X-04 | snapshot 生成后、发送前进入人工控制 | P | 已有迟到观察/最终协议授权回归 |
| X-05 | 低水位 checkpoint 写前/写后/结果删除时崩溃 | L | 保留对应子场景；完整故障注入仍需核对，不视为该要求全部通过 |
| X-06 | 材料消费已发生、回执丢失 | M | 已有取消/回执子场景；消费成功但回执丢失的完整链路未验 |
| X-07 | 同一 runtime 撤权后才收到 targetCreated | D | 保留对应子场景；完整故障注入仍需核对，不视为该要求全部通过 |
| X-08 | 页面已创建但 ready 持久化失败 | W | 保留对应子场景；完整故障注入仍需核对，不视为该要求全部通过 |
| X-09 | 旧 runtime finally 在新 runtime ready 后执行 | W | 已有旧 finally/停止和新 Run 队列回归 |
| X-10 | 事件 snapshot 读投影期间发生重入事件 | E | 已有同步投影重入/游标回归 |
