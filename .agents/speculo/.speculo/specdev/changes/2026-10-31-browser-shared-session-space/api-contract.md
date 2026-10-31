# 公共能力与失败语义草案

本文件是未来接口合同，不是已存在的源码；不保持旧 API 兼容。生产入口仍沿用有价值的 BROWSER_WORKSPACE / BROWSER_AGENT_ACCESS / BROWSER_OPEN / BROWSER_MATERIAL_CONSUMERS 服务位置，方法与类型整体重订。依据：https://github.com/NAMEWTA/obsidian-huhu/blob/974105b47e03c108df0f5e0c3fc9606fe4b79aee/src/modules/browser/api.ts，Issue §11–14。

## 可信调用上下文

实例 nonce、Vault、Space、实际 Agent/Task、控制代次、动作范围和有效期由可信服务生成并核验；不放在模型可填写字段中充当证据。Agent 无 handoff/convert/permission-approve 接口，不能列出个人 Space 的标题或页面。内部与 Broker 复用同一授权入口。

## 请求 / 结果形状

```ts
// 规格示例；不编译、不作为本轮产品代码。
interface AgentActionEnvelope {
  requestId: string;
  pageId: string;
  expectedDocumentId?: string;
  action: StructuredAction;
  timeoutMs?: number;
}
type ActionOutcome<T> =
  | { status: 'succeeded'; requestId: string; pageId: string; documentId: string; value: T }
  | { status: 'rejected'; requestId: string; code: string }
  | { status: 'cancelled'; requestId: string; dispatched: false }
  | { status: 'outcome-unknown'; requestId: string; code: string };
```

succeeded 只代表约定动作及已验证后置条件成立，不推断订单/消息成功。取消仅在确证未派发时使用 dispatched:false；派发后断连/超时/崩溃按实际证据返回 unknown。requestId 在实例+授权代次内去重，参数摘要不同拒绝；重启不复活令牌和去重账本。队列、缓存、响应、图片、节点数量/深度、文本和 deadline 必须有界，具体默认预算由 T-01 实机/项目现有预算校准并由 T-05 固化，未定量值不宣称为性能达标。

## 能力目录与权限

| 能力 | 正常结果 | 关键边界 |
|---|---|---|
| capabilities | 实际支持与原因 | 不泄漏未授权 Space；不按 OS 名字符串承诺支持 |
| pages.list/open/activate/close | 同一任务 Space 的页面投影 | 关闭遵守 beforeunload；新开 URL 明确新 pageId |
| navigate/back/forward/reload/stopLoading | 当前 guest 的导航结果 | URL/redirect 复核；不修改 partition |
| observe | 有界标题、URL、文本、交互 ref、frame coverage/errors/truncation | 不返回密码/隐藏认证字段；网页返回值需 schema 校验 |
| screenshot | 当前 viewport 或显式 clip，含页面/文档/尺寸/采集身份 | 图片也须授权；不承诺与另一次 DOM 采集原子一致 |
| click/fill/type/press/select/check | ref 绑定、可见/可用、后置检查 | DOM synthetic input 不默认为真实用户输入等价 |
| scroll / waitFor | 有界滚动或明确条件+总 deadline | 等待可中断；不以全站 network-idle 作为通用成功 |
| downloads.list/cancel | 仅范围内元数据/取消状态 | 完成下载不授予文件读取 |
| upload | 可信 file grant 的受控输入 | 无可靠适配时 unavailable + 人工处理；不接系统路径 |

## 稳定错误与调用方处理

| code | 含义 | 后续 |
|---|---|---|
| browser_unavailable | disabled / unsupported / missing host capability 的受控子原因 | 展示可用性，不启动 Native/system Chrome |
| personal_space_forbidden | 个人 Space 禁止任何 Agent 访问 | 不自动转换，不重试探测 |
| control_revoked | 过期/撤权/身份与范围不符 | 清本地旧请求，等待新的可信授权 |
| page_closed | Page 不再 live | 不隐式复建同 URL 冒充原页 |
| stale_document / stale_element | 引用身份失效或语义改变 | 有授权时重新观察，不猜 selector |
| unsupported_frame | 未具备该 frame 的合法读取能力 | 标明覆盖不足，交人工，不关闭安全策略 |
| permission_denied | 真正 origin/frame 的权限未批准 | 不由模型替用户批准 |
| deadline_exceeded | 未派发时到期或明确可确认的无效果等待到期 | 携带阶段；不能覆盖已派发未知 |
| outcome_unknown | 已派发效果无法确认 | 先对账/观察/人工确认，不自动重放 |
| cleanup_pending | 删除/清理未完成 | 维护 tombstone，显示阶段并允许受控重试 |

无 Cookie、token、完整正文、认证回调或原始私人路径进入错误串。错误与 empty result 分离。

## 材料合同

保留 title/text/image 与精确 source：Space/Page/documentId、URL、capturedAt、选择或 clip、frame coverage/errors/truncated。删除旧 runtimeId、epoch 与帧传输身份；采集批次可以独立存在，不为兼容照搬旧名字。先采集→选择目标→确认→重新核对页面/授权/consumer/target→deliver。仅把材料放入该输入，不触发发送；unknown 不重复 append。保留 BROWSER_MATERIAL_DELIVERY_UNKNOWN 的行为价值，可重命名但所有消费端同步。

## 旧公共入口处置

| 旧入口组 | 新行为 |
|---|---|
| installRuntimeBundle / refreshRuntime | 删除；capabilities/诊断无安装步骤 |
| import/save identity / browser source scan | 删除；在任务 Space 直接登录；Cookie 导入后置 |
| takeover(viewer/window lease)、humanInput、subscribeFrames、renderViewer | 真实 guest 人工输入；可信 handoff/revoke；展示 pageId 对应 owner surface |
| startRun/heartbeat/prepare/execute/operation | 短期授权 + 单次结构化动作 + 有界去重；无 Native 两阶段账本 |
| copyAgentConnection | 受限本机引导；不把长期 token 放剪贴板/提示词/普通 argv |
| BROWSER_OPEN / 材料贡献点 | 保留职责、重订请求与错误；不会唤醒 Native 或无关消费者 |

完整实际引用不能仅由这张表推定，T-01 必须输出固定 SHA 的逐调用方清单。Bot 只能通过现有 Host/HAP 调公开能力，Go 不拿 Electron 对象、Cookie DB 或浏览器进程。
