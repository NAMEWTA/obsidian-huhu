# T31 条件存储扩展只读预查

2026-10-27，native:/root/implement_t01（既有 gpt-6.1-sol/high Agent）实际回执；未改代码、未运行浏览器或平台。T07 初审、T09–12 尚未实施，正式 T31 前按前序最终代码重验。

## 条件边界

Issue1 FR-17、ADR-006、AC-007 明确 Cookie/Identity 为必需主线，localStorage/IndexedDB 为条件扩展。当前必须明确拒绝不支持请求，不能丢弃存储后声称完整导入；T31 存在不等于全部通用存储无条件迁移，启用后的严格合同仍不可省略。

## 已有真实链

- Workspace 提供文本、选定文件、授权浏览器来源及人工保存 Identity；UI 为 IdentityImportActions，没有独立 origin 开关。
- core/identity 能解析受限 origins/localStorage；sessionStorage、IndexedDB、storageKey 输入明确 unsupported。
- IdentityService.prepareText 对非空 origins 添加拒绝项，savePrepared 严格校验拒存，不会静默保存剔除 origin 的 Cookie-only 结果。
- FreshIdentityTarget 的 readOrigins/writeOrigins 仅可选接口；真实 runtime-target 与 driver readIdentity/writeIdentity 只实现 Cookie，不证明 origin 已支持。
- provisionIdentity 已有 staging/target 分离、空目标、Context 一致、完整读回、取消与清理失败处理。当前 origin 比较仅 origin＋键值，不能代替 storage-key/IndexedDB 完整语义。
- IdentityCapture 的 reader/schema/字段证据面向 Cookie 来源，native reader 仅读取 Cookie SQLite，未提供 localStorage LevelDB/IndexedDB 适配。

## T31 最小合同与验证

维持未启用时，应落实逐存储类型、来源及运行时版本的支持/拒绝说明和实际测试；当前缺完整公开 origin capability/proof 契约，不能把解析结构宣传为可恢复能力。

未来启用第一方 localStorage 时，闭包须含版本化来源范围与采集证明、能力协商、现有 provisioning、站点脚本读取前恢复、完整目标集合读回与发布。第三方、未知分区、opaque key 不得压成普通 origin；IndexedDB 需独立版本化适配。sessionStorage、Cache、Service Worker、history、extensions 不默认纳入种子。

候选接缝为 core/identity、identity-service/provision、identity/source-reader、runtime-target、driver/wire 与公开 API，均在现 T31 写集。若新增 UI 开关或词典文案，当前票缺 ui/i18n，需按实际需求核范围。

自动验证：混合 Cookie＋不支持存储整单拒绝及零发布，能力缺失/版本不符，错误 Context，额外残留键，staging/target 同样丢字段，每步取消与清理失败。T09–12 完成前不能确认四平台来源格式、provider/密钥、固定 Chromium storage-key 能力、脚本前恢复时序及故障清理；合成端口不能替代平台事实。
