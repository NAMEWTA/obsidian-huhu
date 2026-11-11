---
schema_version: 2
session: "20261105T094057Z"
task: "079-implement-t09-agent"
kind: implementation
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-09"
---
## Goal
完成T09智能体完整UI垂直替换，优先消除两个旧panels消费者阻断后继续其余页面，不以单个导出改名当完整任务。用户明确medium实现/high审查、全部16票、UI002严格还原、无旧兼容。
## Inputs
AGENTS/workspace/catalog、dev/ui及适用参考、SpecDev I/测试/双轴与设计合同；Map最新/Goal/Spec/T09、DESIGN3/UI002批准摘要49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66。ui SHA12621917181e3a74f3a410a710752e8e856d9a84af739ef6c97c85f79bca1ad4，dev d217057f068f3fe9e59205fa372896c298dcd9afda5da1c46f7e441d5018283e。T04/T15已done/GCONTRACTclosed，Root继续同一Goal。HEAD37fcede4210a19bcc2a74809e7fdd301e5717957，保留现有dirty/staged，先保存实际起点、入口/调用/依赖和预计影响，随后实现，不单独规划返回。
实际已知构建债：agent/ui/terminal/TerminalTabView.tsx与workspace/WorkspaceLayout.tsx import PanelGroup/PanelResizeHandle/ImperativePanelGroupHandle是panels v3 API，固定安装4.18.1。先迁移到已交付src/ui/components/resizable唯一包装与真实v4公开API，保留布局/重置/resize/xterm尺寸/隐藏恢复语义，尽快通知Root这两处导出债消除，仍继续完整票。不能添加v3 alias、换回旧依赖或绕检查。当前T12/Root做设置与共享端口、T07做自动化，源分离；不要碰其它票。
## Workspace and Scope
只写T09 frontmatter writable：agent/ui/**、agent/styles/**、T09 fixtures/**；本不可覆盖REPORT及/tmp/huhu-t09-implementation。api/services/core/platform/PTy/xterm/CLI协议和domain只读；字典agent/i18n、共享组件/脚本/产物/依赖Root单写，需缺口/键先具体提案。无委派/worktree/commit/push/version/release/改index/node_modules/真实用户vault或进程启动。渲染不启动PTY、不在测试连接真实CLI/账号/网络。新不熟悉能力先按复用合同看维护活跃开源与许可，既有共享栈/原服务可满足不重造引擎。
## Acceptance
完整DESIGN §6 agent/UXAGENT1/AC081–082与本票补充：空间与会话目录、新建/历史恢复、标签/分屏、终端控制、等待回答横幅、会话信息DetailPane、历史/收件箱/用量、设置/账号CLI/技能/快捷命令/备份恢复；保留所有实际领域字段/动作/设备能力与原失败重试，不删未画在原型中的功能。默认等待回答只定位已有终端，不发明allow/deny CLI协议；移动不可用诚实呈现。目录/筛选/scroll/会话/终端实例保留，详情与标签切换不重挂PTY，隐藏暂停UI活动、展开恢复测量但不改变后台会话。
重用唯一Group/Panel/Separator/DetailPane/Tree/输入/Sheet/Dialog/Portal、--hu-term-*及批准纸墨字号/字体/像素/间距/leaf宽度/触控44，不另造Tabs/resize/键盘/状态引擎或旧CSS。新字段/按钮文案t() en/zh提案Root。IME输入和实际终端焦点不回归、F6/嵌套Esc/原触发器return、多Document owner与关窗/迟到callback安全；同owner Promise动作去重、挂起后切会话/关闭不回写新会话。真实服务调用使用现有api/命令，不制造发送成功/恢复回执。无兼容分支。
适用有意义TDD与原风险保留、scoped DOM/unit/types/lint/architecture；其它票旧迁移债诚实报告，删除旧实现/选择器同票承接旧风险。生产T09 fixture覆盖全部状态main/iframe/1440/390+320/zoom2/IME/pointer/Promise/cleanup，用实际UI与注入既有ports，不启动真实PTY；worker仅--check，Root最终CSS/assets/native66/真实Obsidian。完成立即冻结全部owned源码/测试/新增删除/模式/hash与实际baseline，给Root候选后停止写入待high，不进行推测边缘循环。
## Return
不可覆盖REPORT含聚焦交接/产物与验证/问题与下一步；实际表面/字段/action地图、API/词典交接、红绿/命令退出/限制、设计一致差异与原风险承接。原始code/log/JSON/PNG/hash只/tmp，Root独占状态/Evidence/资产。validate-dispatch return后停止。
