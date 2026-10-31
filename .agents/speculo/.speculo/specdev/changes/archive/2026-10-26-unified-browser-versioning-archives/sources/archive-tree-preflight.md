# T23 动态档案树与类型视图只读预查

2026-10-27，native:/root/implement_t01（既有 gpt-6.1-sol/high Agent）实际只读回执。HEAD `265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa`，Map revision 9，采用 Ticket 权威 PAGE-005 / AC035、036、031。T21 repair-1 活动中，以下是动态基线观察；不是冻结候选或 T23 实施，开始前必须按 T21/T22 最终代码复核。

## 实际入口与复用

- `archives/services/workbench.ts` 仍以 KINDS person/company 建树；通用 `ArchiveWorkspace` 是页内独立状态。`ui/navigate.ts` 与 `ContactsPresentation` 的 v2 回跳也只接受 type-person/type-company，需要贯通动态 typeId/entityId，不能只换树节点。
- 共享 Tree 已有 folderClick=expand、箭头 stopPropagation、键盘与虚拟化；现档案 panel 测试已证明名称展开、箭头折叠，可复用而不改 shell Tree。
- 统一设置已有 app settings contacts → archives.settingsPage → archives/ui/settings-page → ArchiveWorkspace(settings)。复用既有 owner/UI；显示字段不能借 form.fieldSettings.disabled 变成记录筛选。

## 目前差距与最小范围

panel-state 的 query/layout/anchors 全是两种类型枚举；generic type/search/session 尚未进入 leaf getState，返回、跨类型和多叶状态未闭合。ArchiveWorkspace 目前是 JSON 字符串搜索与前六字段表，缺列表/卡片共享字段投影、条件筛选及三时间排序。schema 已有 createdAt/updatedAt，legacy createdAt=null，不得以加载时间补造。

预计路径均在现票上限：archives/services/workbench、module/page-host/api；ui/navigate/panel-contract/panel-state/contacts-presentation/ArchiveWorkspace/surface/ArchiveCardGrid/TypeDesigner/settings-page 与对应测试；必要的 core 可见展示配置兼容读写/共享投影；shared/contacts-settings 的动态 typeId 布局归一；app/workbench/compose-workbench 的静态菜单与 stateKeys。未发现必须新增生产写集。若实际需改 app settings 搜索索引或导航合同，应先交实际路径原因，不顺手改共享 Tree。

T24 所需接缝：稳定 typeId/entityId 路由、target/getState、缺件诊断及公开 snapshot 订阅，不暴露内部 store。

## 后续验证建议

真实 SidePanel→navigate DOM 覆盖空类型、第三类型、新实例和 rename；panel-state roundtrip 覆盖旧状态、每类型查询/筛选/布局/滚动与多叶；generic 详情返回和脏草稿拒离开；同集合两视图 fieldId 投影、隐藏不删值且不改变筛选、旧时间 unknown；实际模块 settingsPage 发布显示配置并回读，off/on 清理订阅。随后按实际改动运行类型、i18n、架构和源码 lint。窄屏、主题、焦点、真实宿主与性能仍 user-owned/not-run。

本预查未修改代码、正式状态或工件；T23 等待 T22 完成后才可实施。
