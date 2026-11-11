---
schema_version: 2
session: "20261031T062046Z"
task: "031-shell-preflight"
kind: implementation
change: 2026-10-31-dev-stabilization-overhaul
ticket: T-24
---

## Goal
native:/root/bundle（Astra low）对T24整体Shell做只读实施预检，形成可执行最小方案；T16新增CSV测试补齐后Lead才开放正式实施。T06十项修后已停写，继续冻结供sources复审。

## Inputs
Map17、Ticket24-global-shell、DESIGN UI-SHELL及真实批准原型、DESIGN-0002、dev/ui与相应shell/design-system/motion-a11y参考、T23实际DesignScope/portal/toast运行时及验证runner、execution-boundaries。T23/T18已done，T16主体已独立通过但Lead发现CSV旧测试待修，T06未验收。

## Workspace and Scope
current/dev/base86c500556db1d64865c4cc7f1aff1dd83de071fa。仅写本REPORT，全产品/Ticket/Map/共享产物只读；无Git写入/递归代理/Browser修改/真实宿主。可读冻结消费者识别边界。

## Acceptance
先真实检查shell布局导航/页头/标签/panel/Settings与app非Browser入口、调用方/依赖、旧UI消费者和T23叶级范围。列精确计划路径及可能受影响文件/验证范围，不将wide Ticket授权当全目录重构；维护Browser路由/标签/导入/样式效果冻结，不能全root包DesignScope污染。给出可控叶层接入、owned portal/notice、窄宽布局、键盘/焦点/IME/reduced motion/双Document证明方案。设计以现有批准原型和合同为准，不另造方向；发现无法保持Browser冻结的子项准确延期，不制造兼容分叉。
列T24 fixture挂真实生产Shell所需宿主端口，不能重写假Shell；standard Chrome矩阵、交互与失败/重试/忙碌状态按实际能力定义。明确与T25–T35各模块交界，不提前迁模块内容。共享main/styles及Home词典由Lead，原9项T23作者文件若必须改需先报告。

## Return
标准REPORT，具体影响计划/最小写集、设计映射/验证与未决风险；不实际修源码，待Lead正式实施TASK。
