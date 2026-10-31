# T22 同步与定义分叉只读预查

2026-10-27，native:/root/audit_archives（gpt-6.1-sol/high）回执；T21初审期间只读，未写源码或测试，T22未开始。以下基于T21待审候选，不能代替其最终审查结论，T21 findings优先修复。

## 已有接缝

migration-authority根据可见plan/owner切换/完成回退回执解释staged/active/retired/conflict；catalog按确切schemaRevisionId解析并验证hash，未来/缺定义/损坏实体仍参与可识别ID重复检查；relation-store有关系ID/operation与起始inventory/generation、缺端点和约束诊断，staged不参加普通计数。application有逐路径version/模块generation，UI有请求代次/root/context失效。

## 原合同仍需补齐

1. 类型、关系、表单三个定义族缺完整parent graph解析，主要沿current读取；尚无缺parent/环/同revisionId异内容/未合并多head，current覆盖可漏分支。最终写门也需检测新分支到达。
2. 必须区分已发布与安全失败留下的staged修订。form-store明确保留未提交revision；全目录都算发布会假分叉，只看current会漏真分叉。需要可见逐revision发布事实及current CAS/提交后读失败的恢复顺序，未知与不可读不能冒充已发布或未发布；旧格式无证据时保守诊断。此处为待设计实现接缝，不预先宣称某种多文件发布顺序已正确。
3. relation-model接受deleted并排除约束计数，但暂无正式tombstone/可携带删除回执，query仍为deleted生成投影且UI显示归档。需删除事实优先、身份诊断与正常计数排除，旧active副本到达不得复活。
4. 乱序状态应区分待定义/端点/迁移清单与关系、已提交冲突、删除、定义分叉。保留原文和按确切旧修订可读实体，暂停受影响类型写入，不锁死无关类型。
5. PAGE002可补只读head/parent摘要、影响数、被阻止操作说明、精确原文查看与重新检查。T28负责完整比较、选择、多parent合并发布和破坏性转换编辑器，T22不提前包办。

## 预计范围与验证

原archives/**及golden范围预计足够：共享revision graph/同步状态解析，catalog/form-store/relation-store/migration-authority、schema/relation-model、api/services诊断、最小删除事实命令及最终门；既有Workspace/TypeDesigner/Relations/Migration/i18n。application/controller仅在实际事件遗漏时改，不扩宿主框架。

确定性夹具：同parent两revision仅留一个current仍识双头；定义/owner/关系/manifest/完成回退删除事实乱序到达或移除后重建App收敛；tombstone后旧active/同ID异内容/未来格式/读取失败不得授权复活；扫描/capture/最终写入时插入新分支或删除事实拒旧计划；DOM验证只阻受影响类型、原文可浏览、草稿保留、旧错误失效。正式实现前按T21最终版重验。
