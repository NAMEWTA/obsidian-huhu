---
schema_version: 2
session: "20261105T094057Z"
task: "087-implement-t11-notifications-safe-health"
kind: implementation
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-11"
---
## Goal
完成T11通知/保险箱/体检完整UI垂直替换，不停在规划或demo。用户medium实现/high审查所有16票，严格UI002、无旧兼容。
## Inputs
AGENTS/workspace/catalog、dev/ui及适用参考/SpecDev I/测试/设计合同；Map29/Goal/Spec/T11、批准DESIGN3/UI002摘要49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66。dev新SHA0c2a3309d1b00920539376a02c98485a98442c002945f0ee2e6ce8b816cfb744，ui12621917181e3a74f3a410a710752e8e856d9a84af739ef6c97c85f79bca1ad4；T04/T15正式done/GCONTRACTclosed。HEAD37fcede4210a19bcc2a74809e7fdd301e5717957，保留dirty与88项原staged条目。先保存真实源/模式起点，核对现有入口/调用/依赖/实际所有字段动作并简列影响，随后直接实现，不单独规划返回。
源在notifications/ui两页、safe/ui约27源/测试、health/ui约6源/测试；实际领域API/schema/服务回执为权威，原型代表字段不授权删功能。Root29只更图标静态资源/纯UI词典加载与规则，未改你的领域或UI；需新文案具体en/zh提案Root。其它候选05/07/09/12/16分离。
## Workspace and Scope
只写T11 frontmatter writable的notifications/ui/**、safe/ui/**、health/ui/**、T11 fixture/**；不可覆盖REPORT及/tmp/huhu-t11-implementation。所有services/core/platform/api/密码学/密文格式/health扫描修复只读；i18n/共享组件/依赖/构建脚本/资产/正式状态Lead单写。实际公开API不足或共享UI缺口先给精确事实/方案/路径，不能绕层或自建engine。无委派/提交/index/worktree/node_modules/真实vault/账号/网络写入；测试仅内存/临时路径、显式测试secret/clipboard ports，不操作用户保险箱或剪贴板。
## Acceptance
完整DESIGN notifications/safe/health与UXNOTIFY1/UXSAFE1/UXHEALTH1/AC101–104：通知分类/搜索/已读/批量/详情与深链、分页和原服务动作/错误，稳定列表/selection与DetailPane；空间/设备能力明确。保险箱初始化/解锁/失败/损坏/恢复/分类/搜索/详情mask-reveal-copy/编辑/备份/设置/快速取密全部现有字段动作保留，锁定后清除所有明文/旧表单/搜索/Portal与迟到结果，不在原型无依据显示剩余次数。剪贴板清除仅仍由本功能拥有内容，复用原领域/port，不发明新持久值/算法。
体检只按真实HealthScope注册项，扫描进度/取消/分组/选择/修复计划/过期源/部分成功/回执恢复完整；只允许原rebuild-index/belonging-projection，不增加Git checkpoint或任务再生。真实Promise pending去重、错误/Retry/关闭与切条目隔离，不能把迟到回执作用新owner或假成功。不要改域归属/格式/安全门。
所有模板/纸墨token/字体/间距/像素/leaf宽度/32fine44coarse/滚动容器/嵌套Esc/F6/IME/确切回焦/owner多Document沿唯一共享组件、现有Portal和真实公共API。视图保留状态、隐藏释放浮层/暂停UI而后台既有任务继续按域，不造焦点/键盘/store/加密/日期引擎或旧组件兼容。必要日期用已交付DateField等，local datetime保留真实精度，不假造IANA。
意义明确TDD/原安全风险承接、scoped DOM/unit/types/lint/architecture，按适用范围验证；旧全局API迁移债区分报告。真实生产T11 fixture覆盖全部三模块状态main/iframe/1440/390+320/200%/IME/可信pointer/Promise失败与cleanup；实际inmemory服务及测试ports，不静态视觉clone。worker只--check，Root最终styles/main/全66/真实Obsidian/safety gate。完成即冻结完整owned源/测试/新删/模式/hash与实际baseline，交Root候选后停止写入待high，不扩未请求功能或推测边缘循环。
## Return
不可覆盖REPORT含聚焦交接/产物与验证/问题与下一步，完整实际字段/入口/动作、保留/删除风险承接、API/词典交接、红绿/真实命令退出/局限/设计差异与完整候选。过程code/log/JSON/PNG/hash只/tmp，Root写正式Evidence/state/产物。validate-dispatch return后停止。
