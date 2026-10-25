# final 唯一方案固化验证

日期：2026-10-25。来源：LOG-040 的用户确认和“只要这一套的元素，完善并修正相关文档”的指令。本文记录本次真实检查；确认前历史记录见 static-validation.md，不再使用其中旧摘要或未确认状态。

## 结果与范围

final 为唯一维护源。用户确认已登记在 confirmation-final.md，DESIGN revision 2 的 status 为 approved；Spec、ADR-025、ARCHITECTURE、README、设计树与原型说明已同步。未选方案和专用分支已删除，没有重新设计用户选择的页面。

| 处理 | 本次结果 |
| --- | --- |
| 保留 final | 对话、协作任务、Bot 管理、记忆、资料权限、本机清除均保留；产品任务区 HTML 与确认前逐字一致 |
| 删除其他方案 | 移除两个未选 HTML、旧比较页专用 CSS，以及任务优先首页/常驻右侧检查器的 JS/CSS 分支与 DESIGN token |
| 旧地址 | comparison 仅有单一入口说明和同源 A 投影；投影由 final HTML 更换两个资源相对路径生成，共用 final CSS/JS，无独立方案 |
| 原型工具条 | 移除“三个方案”导航，标为已确认方案；示例场景与主题切换保留 |
| 正式基线 | 核对后引用已发布 DESIGN-0001；删除本包未发布同名草案，未写永久知识 |
| 用户批准 | 不可变确认快照绑定用户原文、清理前选中内容、授权清理范围和固化后摘要 |
| 历史来源 | 原始输入、LOG 旧问答和确认前证据保持历史地位；当前导航明确新旧边界 |

## 固定摘要

| 对象 | 值 |
| --- | --- |
| DESIGN revision 2 | aa62a53b30d0ca32f03a5580be8ce5b4921b9c3c1767793b9173eadfde92dc6e |
| 正式 DESIGN-0001 designDigest | ebaca5f2f15fe081bf393c892f8b6583d4f2c6ad12cd92cb55068005fe83a331 |
| 正式基线字节 SHA-256 | 50f0d924ee393fddca02d4765bd2d7bb49ba70f5e9f3bbf08ac20456b1cd651f |
| UI-001 prototype digest | 3c93a0c085cf3458148befdeb29ff445fe444601861c3bacb8dc9e421706444b |
| final 目录摘要 | 3e9bd4c227d74c226fbc9ee0ef1f8757685358c6e5ca7e64d9a7beaa806b8e49 |
| 确认快照 SHA-256 | 29a16e6190948b8e1444028afa4673c835c944b359a8092cab2809af5a1cb46c |

算法与逐文件摘要见确认快照和 bindings.json。后续修改须重新核对受影响的设计/源码/证据，不能沿用已漂移的摘要。

## 通过的实际检查

| 检查 | 实际结果 |
| --- | --- |
| `validateChangeDesign(DESIGN.md)`，默认 requireApproved=true | 通过；真实确认快照、record_digest、规范摘要及正式基线快照均匹配 |
| `validateProjectDesign` / current 与 revision 字节比较 | 通过；正式 DESIGN-0001 结构合法且与 current 相同；无活跃 publish-lock/resume |
| 设计包 draft schema | 通过；候选数为 1，candidate_count_override 指向用户 LOG-040；不伪造 ready |
| `materialize` 连续两次及 `{check:true}` | 通过；三个源码块与 final 一致，前后原型摘要不变 |
| `node --check final/app.js` | 通过；仅语法验证，不冒充 DOM 运行检查 |
| 产品任务区与同源投影 | 通过；清理前后任务 HTML 逐字相同；旧 A HTML 仅资源相对路径不同 |
| 旧分支扫描 / HTML / 本地资源 | 通过；final 无未选方案分支或链接；3 个 HTML 无重复 ID；final 所有运行资源都在 final 内 |
| 字体/许可与原始输入 | 通过；字体和许可与 src/ui/fonts 一致；输入与 temp 原件逐字一致，93844 字节，SHA-256 a85a57648a00942a44c3df89c52804d13d129e7e31262a73feb91ccc7f1516cc |
| 规格追踪 | 通过；55 个连续唯一 AC、25 ADR、28 answered 设计节点；DESIGN 的 AC 均有效，Spec 硬引用与实际绑定一致 |
| G 工件结构校验 | `validate-specdev.mjs --stage grill` 通过，0 errors / 0 warnings |

CSS 另做分隔符平衡和移除分支检查，没有把该静态检查称为浏览器渲染通过。所有通过项的执行器退出码为 0。

## 独立保留的技术缺口

`validate-design-package.mjs --check-preview` 唯一错误仍为：

```text
ready prototype requires browser evidence
```

该命令已顺序核对源码、离线资源、唯一候选结构和当前 DESIGN/原型绑定，再停在缺少浏览器证据。执行器返回非零（126）。

`validate-specdev.mjs --stage spec` 返回两个与同一技术缺口有关的错误，0 warnings；执行器返回非零（126）：

```text
prototypes/UI-001: bound UI prototype must be ready before downstream consumption
prototypes/UI-001: ready prototype requires browser evidence
```

旧的“change DESIGN requires approved status”已消除。当前不再缺用户设计确认，只缺可复核的浏览器环境、视口、页面状态、键盘和截图记录。按 P 技能“设计绑定、批准、浏览器证据与源码全门通过后才设置 ready”的封板要求，UI-001 仍为 blocked、Spec 保持 ready_for_tickets:false；不重开相同设计选择。

## 仓库文档检查

`pnpm test:docs` 未通过：CLI 报 exit code 1，执行器记录 126。仅有原附件既有的六个目录锚点错误：`#9-工具审批与效果日志`、`#12-数据路径与迁移`、`#14-记忆知识与可扩展能力`、`#15-权限凭证与运行治理`、`#17-验证性能与发布门禁`、`#19-决议未决验证与完成定义`。未报告本次现行文档的新链接错误。

为保持原文件副本字节，未修改输入，也未更改仓库检查器或添加忽略规则。原始材料与现行规范的权威区别见 change README。

## 未执行与后续边界

未启动浏览器替代方式、模型服务、本地服务器、产品实现、构建/业务测试、Git 提交/推送或发布。工作区外部 .gitignore、AGENTS.md 与其他 change 保持原状；正式设计基线只读引用。

设计选择已完成。后续按 REVIEW.md 补实际技术证据或修复具体问题，再运行 P/S 就绪门；本记录不是要求用户重新确认相同界面。
