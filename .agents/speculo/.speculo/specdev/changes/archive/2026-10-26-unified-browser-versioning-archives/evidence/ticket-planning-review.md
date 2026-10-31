# Tickets 计划质量审查

执行者：当前 T owner，使用 <Path>{roots.workflows}/specdev/common/skills/plan-quality-review/SKILL.md</Path> 与其 checklist 做只读计划审查。本审查不是 I 的独立代码双轴审查，不证明实现已完成。

输入：当前 Spec、六项 ADR、DESIGN revision 2/approval、完整三 Issue/两 PR 快照、source-gap-analysis、实际模块消费者及32张原票。用户指定一项统一 change，未指定票数；全部36项AC有归属。冻结基线265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa，当前生产代码未改。

## 逐轴结论

| 检查轴 | 结果 | 可回读依据与处置 |
|---|---|---|
| 背景与边界 | pass（核心）；block（4张扩展 UI） | 原票目标/IN/REUSE/OUT/源合同齐全；T-16/28/29/30 不把未展示界面当已批准，ready=false |
| 变更影响 | pass | expected_changes 实际文件均存在并在写集内；真实模块消费者见 source-gap-analysis、T-24/27；T-32 承担产物/文档/整体矩阵 |
| 研究与复用 | pass | 采用本项目源码与原始 Issue/PR 中已保留的设计依据；没有新增外部库决策，不需为规划重新外搜；实现遇新技术再按项目复用规则研究 |
| Skill 调用 | pass | 枚举项目14个 SKILL 入口元数据；dev/ui 为实际项目技能，逐票 SHA-256 与当前源一致，phase/输入/输出/失败 block 俱全 |
| 执行计划 | pass（核心）；block（4张扩展 UI） | 每票有有序步骤及正常/失败/回归接缝，迁移显式 Expand→Migrate→Contract；扩展 UI 先由 P 具体化，届时若超出单上下文则再拆分并递增计划版本 |
| 控制图 | pass | 无环；三个域分离、同域 DAG 串行；T-24/27 汇合两端；T-32 唯一生成产物 owner，执行前控制器重新算共享写集和语义资源 |
| 验收与数量 | pass | Map 36/36，32张票完整生成；源 G/T/P/F 条款在负责票中保留；没有把四平台或可选来源语义删掉 |
| 权限 | pass | 原型明确确认，Tickets 明确要求；本次未启动 I/Goal、未提交推送发布或真实迁移；正式原型批准不扩展未展示 UI |
| 恢复 | pass | 每票固定输入、源回读、停止条件和 Evidence，deep 票对 operationId/hash 与部分成功对账；Spec/Skill/DESIGN 漂移重算影响闭包 |
| 全局自动派发 | block | 完整 Spec 尚有扩展 UI 设计前置，ready_for_tickets=false；owner 未分配、依赖未完成是计划状态，不能假装 frontier 可执行 |

## 全部票的评估快照

本表是本次审查的冻结记录，不是进度权威；执行时回读原票与 Evidence。所有票的正常/失败/回归、有序步骤、预计源存在和 Skill 摘要检查详见 <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/ticket-contract-checks.json</Path>。

| ID | 可观察产出 | 深度 / 风险 | 项目 Skill | 依赖 | 本次结论 |
|---|---|---|---|---|---|
| T-01 | 联合入口与私有资料排除 | standard / medium | dev | 起点 | 局部合同完整；全局派发前置见 Spec |
| T-02 | 跨框架观察与引用失效 | deep / high | dev | T-01 | 局部合同完整；全局派发前置见 Spec |
| T-03 | 操作账本低水位与故障对账 | deep / high | dev | T-02 | 局部合同完整；全局派发前置见 Spec |
| T-04 | 事件补全与游标恢复 | deep / high | dev | T-03 | 局部合同完整；全局派发前置见 Spec |
| T-05 | Cookie 与 Identity 原子导入 | deep / high | dev, ui | T-04 | 局部合同完整；全局派发前置见 Spec |
| T-06 | 接管与 Space 重启资源恢复 | deep / high | dev, ui | T-05 | 局部合同完整；全局派发前置见 Spec |
| T-07 | 文件授权、背压和原位输入 | deep / high | dev, ui | T-06 | 局部合同完整；全局派发前置见 Spec |
| T-08 | 元素材料交付指定会话 | deep / high | dev, ui | T-07 | 局部合同完整；全局派发前置见 Spec |
| T-09 | Windows x64 运行时闭环 | deep / high | dev | T-08 | 局部合同完整；全局派发前置见 Spec |
| T-10 | macOS ARM64 运行时闭环 | deep / high | dev | T-09 | 局部合同完整；全局派发前置见 Spec |
| T-11 | macOS x64 运行时闭环 | deep / high | dev | T-10 | 局部合同完整；全局派发前置见 Spec |
| T-12 | Linux x64 故障压力与四组汇总 | deep / high | dev | T-11 | 局部合同完整；全局派发前置见 Spec |
| T-13 | 主动开启与未保存笔记采样 | deep / high | dev, ui | T-01 | 局部合同完整；全局派发前置见 Spec |
| T-14 | 保护恢复依据的保留与配额 | deep / high | dev, ui | T-13 | 局部合同完整；全局派发前置见 Spec |
| T-15 | 历史比较与恢复回路整合 | deep / high | dev, ui | T-14 | 局部合同完整；全局派发前置见 Spec |
| T-16 | 精确按块恢复与可选历史增强 | deep / high | dev, ui | T-15 | 扩展 UI 待确认 |
| T-17 | 通用类型与 v2 实体协议 | deep / high | dev | T-01 | 局部合同完整；全局派发前置见 Spec |
| T-18 | 档案并发写入与原生草稿保护 | deep / high | dev | T-17 | 局部合同完整；全局派发前置见 Spec |
| T-19 | 类型设置与多表单实体编辑 | standard / medium | dev, ui | T-18 | 局部合同完整；全局派发前置见 Spec |
| T-20 | 独立关系与双向展示 | deep / high | dev, ui | T-19 | 局部合同完整；全局派发前置见 Spec |
| T-21 | v1 预检与可恢复显式迁移 | deep / high | dev, ui | T-20 | 局部合同完整；全局派发前置见 Spec |
| T-22 | 同步乱序、删除事实与定义分叉 | deep / high | dev, ui | T-21 | 局部合同完整；全局派发前置见 Spec |
| T-23 | 动态档案树与类型列表卡片 | standard / medium | dev, ui | T-22 | 局部合同完整；全局派发前置见 Spec |
| T-24 | 项目资料与任务执行引用 | deep / high | dev, ui | T-23, T-15 | 局部合同完整；全局派发前置见 Spec |
| T-25 | 档案可携带重建与删除生命周期 | deep / high | dev | T-24 | 局部合同完整；全局派发前置见 Spec |
| T-26 | 关系差量索引与规模预算 | deep / high | dev | T-25 | 局部合同完整；全局派发前置见 Spec |
| T-27 | 历史恢复必须经档案预检 | deep / high | dev, ui | T-15, T-26 | 局部合同完整；全局派发前置见 Spec |
| T-28 | 定义分叉解决与兼容发布编辑器 | deep / high | dev, ui | T-27 | 扩展 UI 待确认 |
| T-29 | CSV 导入与逐项恢复 | deep / high | dev, ui | T-28 | 扩展 UI 待确认 |
| T-30 | Lookup、Rollup 与局部图谱 | deep / high | dev, ui | T-29 | 扩展 UI 待确认 |
| T-31 | 条件 origin 存储扩展 | deep / high | dev | T-12 | 局部合同完整；全局派发前置见 Spec |
| T-32 | 三模块联合验收与构建交付 | deep / high | dev, ui | T-16, T-27, T-30, T-31 | 局部合同完整；全局派发前置见 Spec |

## 已修正的计划问题

1. T-16 DiffSurface 真实路径为 ui/DiffSurface.tsx，已修正，避免新上下文查找不存在的 history 子路径。
2. T-32 虽主要做联合验收，仍拥有 styles.css 与工作台验证，已显式标 UI 并绑定全部已批准页面和 ui Skill，未绕过设计门。
3. T-24 补齐档案提醒/导航与 home 真实消费者、对应测试接缝和写集，避免只描述 API 不负责两端。
4. T-32 明确最低宿主与档案移动端要求；四组桌面 browser 范围不能替代档案移动端或最低版本证据。
5. UI 基线摘要表示错误已在封板前修复并保留初次失败证据；未改实际已确认的设计内容。

## 保留的执行前置

T-16：精确按块与 F 界面；T-28：复杂分叉解决；T-29：CSV 映射/预检/结果；T-30：派生/局部图谱。这些页面没有可批准的实际成品，当前不请求用户盲目批准。由 P 补充后再按 S/T 同步设计绑定、Spec Ready 和计划审查。所有原型之外的产品目标仍保留。

机械结构通过不将本 block 改为 pass。已批准主界面与非 UI 决策不需重问；未执行真实平台/宿主/生产代码验收。
