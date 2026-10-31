# 目标架构与安全执行时序

状态：设计合同，不是当前产品实现。依据 <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/source.md</Path> §6–16 与 <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/ADR.md</Path>。路径以实际职责为准，不为空目录造框架。

## 1. 层次与所有权

```text
可信工作台 UI / 笔记链接 / Agent 工作区 / Bot Host-HAP
                  │ 仅 browser/api.ts
                  ▼
Workspace（人工动作） / AgentAccess（已有授权） / MaterialConsumers
                  │
Space/Page 元数据服务 ── ControlService ── 有界动作/结果队列
                  │                         │
                  ▼                         ▼
Desktop Adapter：SessionRegistry / PageRegistry / 固定主进程策略+fence
                  │                         │
                  └── 唯一生产 Surface + Structured Driver
                                      │
                         Obsidian 自带 Electron guest
外部 CLI → 按需 loopback Broker ────────┘（同一 AgentAccess，不直达裸 guest）
```

| 对象 | 唯一 owner | 限制 |
|---|---|---|
| 持久元数据 | browser repository/service | UI 不直接读写 JSON；损坏文件保护而非空库覆盖 |
| Session、guest、原生表面与监听器 | desktop registry | 对上仅返回稳定 ID/能力结果，不传 Electron 对象 |
| 授权事实 | ControlService | 可信 UI 授权；主进程只投影必要代次/归属，不复制业务库 |
| 最终执行准入 | 固定主进程 fence | 处理受控动作类型；不接任意源码/require/CDP |
| 网站存储 | Electron Session | 不解析 SQLite、不镜像 sealed identity、不改全局 userData |
| 用户界面 | 服务状态投影 | 不以按钮颜色推断控制权，不自建 Page Registry |
| Bot Run/效果 | 既有 huhubot | 浏览器回执可被引用，不增第二套 Go ledger |

## 2. 首次导航的不可交换顺序

验证桌面能力 → 解析已登记 Vault/设备/Space → 生成受限 partition → 建立 Session owner → 安装同步安全/权限/导航/新窗口策略 → 登记 Page/ownerWindow → 创建隔离 guest → 绑定事件 → 首次导航。

所有早期失败逆序释放本次资源；不能先加载远端页面再补安全配置。新 Session 默认拒绝未实现权限，T-06 仅扩展受控批准流程。默认 Session、别的插件 guest、模型提供的 partition/webContentsId 不可接入。

## 3. 人工接管的线性化点

```text
UI：点击接管 → 显示「正在收回控制」，不立即启用网页输入
ControlService：停止旧代次入队、取消未派发/等待、提出 revoke(g+1)
Main fence：同步把当前代次置为 g+1，拒绝 g 的后续派发 → ACK(g+1)
Service：丢弃旧代次异步文本/图片、完成权属投影 → UI 开启人工输入
```

ACK 是交接生效点；即使普通 Agent 队列被 waitFor 占用，revoke 也走独立高优先级通道。队列接收、实际输入、每个异步续步、结果交付均检查实例/Space/任务/代次/文档。多步键盘输入不能一次校验后跨多个 await 继续发送。主进程回调必须串行执行不可分割的“校验与本次派发”；测试在二者之间设计受控竞态。

撤权不承诺撤回已送出的 HTTP、已点击的提交或页面自行后台脚本。已有副作用证据不足时 outcome-unknown；不将取消等待当作业务回滚。旧图片在发送给调用方前也要校验，不只禁止下一次 capture。

## 4. 页面、文档与观察身份

PageRegistry 键 pageId；值包含 Space、ownerWindow、guest、document generation 和状态。documentId 在主文档重载/替换后变化；frame 身份跟踪生命周期。ref 绑定观察批次、frame、文档、代次、期限，并检查节点仍存在且语义一致；不能保存数组下标后点击新节点。

同窗口标签切换保留 guest；React 使用稳定挂载边界，不在 render 里 create guest，也不对同 src 反复赋值。主题、title/loading 投影不重载网页，地址栏草稿不被背景事件覆盖。不同窗口的第二入口只聚焦 owner；新开同 URL 是新 pageId，不能伪装原页。关闭 owner 和崩溃触发撤权、取消、明确恢复，未知效果不自动重放。

## 5. Partition 身份与磁盘归属

`persist:huhu.browser.<vaultScope>.<deviceId>.<spaceId>.<storageGeneration>`。vaultScope 绑定已有 vaultId 与本机规范化 Vault 根的固定编码摘要；不把私人路径写日志。Windows 大小写不能简单对全部平台一律 lower-case；依据文件系统语义测试大小写、分隔符、symlink/重解析点、重复打开。复制 Vault 不共享 partition；搬迁默认新绑定，不扫描旧 Session 自动接管。显式重新绑定只在旧 owner 退出后独立批准。

重命名 Space 不换 partition；删除后不复用 storageGeneration。网站存储位置由宿主给出用于本地诊断，不硬编码系统路径、不直接删 Cookie DB。元数据只含恢复必需的有限字段；敏感 URL 过滤认证回调/code/token/密码重置，秘密保护不可用不明文降级。

## 6. 生命周期与删除

create Space 不访问网络；启动不扫系统浏览器、不自动恢复所有页面/启动 Broker。页面需要时加载。关闭 Page 不清 Session。停用先拒绝新操作/撤权，结束等待/订阅、关自有 guest/popup/download/broker、移除监听；默认保留网站数据。关停失败保留诊断与 owner，重新启用不得产生第二 owner；不得杀 Obsidian。

删除：确认范围 → 持久 tombstone → 停准入并撤权 → 关闭页面/下载/连接/网站后台活动 → 按宿主支持 API 清网站数据 → 验证哨兵和残留 → 清自有临时文件/元数据。任何失败保留 cleanup-pending 与精确阶段，重试不重用旧授权/代次。不能以 clearCache 代替登出，不能声称 session.destroy 或物理安全擦除。已导出文件不连删。

## 7. 新旧消费者的切换

API 契约由 T-02 统一 owner；后续票要新增契约字段必须回 T-02 owner 协调，不直接在各票并行修改公共类型。T-09 按真实引用逐项更新 Agent/笔记/Bot；T-10 改既有 CLI；T-12 集中同步 composition/module/build/生成物并最终删除旧调用。允许 PR 中间 commit 未完成，不允许将双运行时产品合入 dev。

通用 host/desktop/electron-main.ts 不反向引用 browser 业务。Node/Electron 所有新实现置 desktop。材料贡献点发现保持 activate:false；跨模块只经 api.ts。详细删除、保护和回退边界见 <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/migration-and-deletion.md</Path>。
