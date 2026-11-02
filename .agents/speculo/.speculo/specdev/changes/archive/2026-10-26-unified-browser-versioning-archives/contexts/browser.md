# 独立浏览器领域

来源为 [Issue #1 冻结正文](../sources/issue-1-body.md) 的领域对象、控制权、生命周期与操作账本合同；保留完整目标的决定见 [LOG-002](../LOG.md#log-002--2026-10-26--保留全部目标)。

**Space**：拥有浏览器资料、页面目录与运行资源的隔离空间；personal 供人使用，task 可授权 Agent。
_Avoid_: 人的当前活动标签或共享全局浏览器。

**Page**：属于明确 Space 的稳定页面身份；运行目标重建不等于更换 pageId。
_Avoid_: 将 CDP targetId 当永久页面身份。

**BrowserRun**：一次 Agent 执行的权限与结果作用域；不拥有 Space 的持久资料。
_Avoid_: 请求结束即整个 Run 结束。

**ControlLease**：绑定控制者及运行代次的可撤销写权限；观察者不因看到画面自动取得它。
_Avoid_: Viewer 即写权限。

**IdentityVersion**：不可变的登录状态种子版本；导入成功不等于网站确认登录，也不表示整个运行 profile 加密。
_Avoid_: 身份种子等同活跃浏览器资料。

**Viewer**：展示指定 Space/Page 画面并承载明确人工操作的界面；跨窗口迁移查看器不迁移浏览器资料。
_Avoid_: 查看窗口拥有底层浏览器生命周期。

**Native revoke ACK**：最终写入门禁对旧权限撤销的确认；收到它之前不能承诺旧写者已失效。
_Avoid_: 发出取消请求即已停止。

**Unknown outcome**：命令可能已经派发但最终外部效果不能确认；保留原 operationId 查询核对，不自动重放。
_Avoid_: 超时等于失败且可安全重试。

**Cleanup pending / quarantined**：清理或收容尚未被确认的可见状态，保留资源归属与后续核实责任。
_Avoid_: catch 异常后直接标 stopped/deleted。

**Origin storage 扩展**：Cookie/Identity 必需主线之外的 localStorage/IndexedDB 迁移能力；第一方 origin 是 localStorage 扩展的起步支持边界。依据 [ADR-006](../ADR.md#adr-006-cookie-与-identity-为必需，origin-storage-保留条件扩展)。
_Avoid_: 支持 Cookie 就等于支持任意站点数据库迁移。
