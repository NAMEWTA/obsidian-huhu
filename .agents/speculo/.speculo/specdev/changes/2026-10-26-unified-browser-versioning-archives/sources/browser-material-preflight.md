# T08 浏览器材料移交只读预查

2026-10-27，native:/root/implement_t01（gpt-6.1-sol/high）回执；未写源码、未运行浏览器/宿主。T08 尚未开始，以下待 T07 闭合后对稳定源码再核验。

## 已有实际消费者

SpaceViewer→SendMaterialButton→workspace.sendMaterial→BROWSER_MATERIAL_CONSUMERS→agent/services/browser-material-consumer→SessionMaterialService.attach。browser以activate:false取贡献，不自动启动Agent。消费者核对同session/活动状态/模块取消，等inputReady后调用bracketed session.paste，没有自动提交。代码没有BrowserContextBridge符号，不另造第二套输入草稿机制。

BrowserMaterial目前只有title/text/image，service新采全页observation取前200节点后截字符串，再截无clip全页图；尚无选定元素ref、样式、元素裁剪、结构化来源或截断说明。

## 可复用的身份与存储接缝

BrowserObservation已有runtime/Page/document/epoch/viewportVersion/scope/coverage/frameErrors；driver.resolve已验ref、frame document、viewport和节点连接。应固定选定observation/ref，采语义/受限样式/裁剪，每个异步阶段后复查；导航后拒旧引用，不重新找同名元素。iframe bounds为frame-local，不能当顶层截图clip。

Agent BrowserMaterialFiles已有图片私有目录、签名、8MiB单图/64MiB总量、失败及停用清理；尚无完整文本/样式工件。formatContextMaterials将路径放在正文后再整体截到64000字符，可能截掉已落盘图片引用。需预留来源与工件引用预算，大正文落私有文件，输入保留有界摘要、引用、到期说明。

当前browser在observe/screenshot后验human/document，但消费者仍有文件复制与最长10秒inputReady等待，接口暂无来源取消。需明确采集时点/URL/scope/裁剪截断/缺失覆盖/失效状态，并阻止关闭或失效后的迟到附加。已交付的是固定快照，不承诺ref持续有效。

## 写集补核（T06 r2闭合后，Map revision 9）

至少需 agent/services/browser-material-consumer、agent/platform/desktop/browser-material、agent/core/launch/context-material，以及可能的session-material和ContextMaterial公开类型/定向测试。Lead另查到类型实际位于agent/core/launch/session-api.ts，现有browser-material-consumer.test.ts/session-material.test.ts可复用。T08原browser/native范围不能覆盖真实Agent消费者；Lead已在T06 r2闭合后补入Map revision 9，不改活跃审查输入。

验证从实际SendMaterial入口覆盖错误Space/Page/ref、导航/viewport漂移、样式/clip失败、目标会话替换/忙碌/关闭、来源取消、长文本仍含工件引用，只追加指定待发送输入不提交。继承PAGE004做必要交付入口；完整检查器未有额外原型批准，不把材料按钮原型称作完整检查器已验收。SRC010全代码授权持续，实际视觉仍用户负责。
