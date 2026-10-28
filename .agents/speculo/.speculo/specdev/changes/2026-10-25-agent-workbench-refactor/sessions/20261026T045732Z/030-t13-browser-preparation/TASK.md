---
schema_version: 2
session: "20261026T045732Z"
task: "030-t13-browser-preparation"
kind: "research"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-13"
---

## Goal

为用户已授权18票Goal的T13做有界只读实施准备，交共享网页承载、Browser独立启停与原恢复/资料入口的真实最小改造链。用户指定实现/研究模型gpt-6.1-sol/xhigh；实际原生句柄由Root工具派遣后登记。Root唯一状态/Evidence owner；这不是实施，不开启T13，不改用户已定合同。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/terminal；change .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor。HEAD33c21e098ef3188cbab5a09f3e0a01fadb787715，branch NAMEWTA/terminal，同一current工作区。当前GP033/Map34，T01–08 done，T09 in_progress；028 A正写14个布局owner路径、029 B正写10个协议路径，U未开始。不得宣称全仓SOURCE STOPPED或对动态源作未冻结结论。

稳定研究源码基线为evidence/T-09-dispatch-input.json，SHA256aec8e02b821c7ea7869e0c153e213acc655fb60e1e9347cd78919577462acfc8，2081产品条目含8个拟新增缺失路径。读所列静态源时核SHA/模式并保存实际输入；已由T09修改的相关源使用manifest原snapshot字节讨论“本票起点事实”，另记待T09最终API重核，不阻止原writer工作、不追逐中途diff。规范/Goal/Map最新行政变化由Root负责，可保存新快照并单列。

先bootstrap→完整Map→dev/相关ui→ticket/13-independent-browser.md→Goal、Spec AC041/061与§3网页/lifecycle、implementation-contracts、DESIGN PAGE001/004。只读准备不会生成Skill执行passed或T13完成。复用T01 native owner与T08 R5最终Cookie边界：Browser Cookie独立lease已实现，F7聚合错误保留，不把旧Ticket“Cookie仍经Agent”当当前事实。查reference-notes R02/K06、已有012/013/024研究原件；确有未知才少量官方开源来源比较，不泛搜、不复制GPL终端。

用户明确新业务运行必须绑定Space，旧交互先选择；网页本身按Spec无需Space且Agent-off可用，不能因运行规则阻塞纯网页。真实Obsidian/Provider/OS IME/五平台E2E用户执行；无提交/推送/发布/归档。

## Workspace and Scope

所有产品、Spec/Map/Goal/Ticket/DESIGN、旧TASK/REPORT/证据、Git/index、依赖/node_modules/Cargo缓存、已有bin只读。仅可写本030 REPORT与全新/tmp/huhu-t13-browser-preparation-*静态证据。不得启动Browser/Chrome/PTY/helper/Provider/Obsidian、访问真实Cookie/账号/历史/Vault、安装依赖、运行构建或测试。空间当前约3GiB，不复制整node_modules/Cargo/完整历史证据；仅选定静态源与原始引用CAS。不要递归派遣。

## Acceptance

1. 从BROWSER_OPEN、AGENT_BROWSER_TABS、Browser.module/Engine/host、BrowserTabView、workbench-page/compose-workbench/Shell、叶子state保存恢复、URL/素材调用方画真实链。区分模块激活、页面/共享Tab承载、Browser渲染owner与native Cookie lease；指出当前无Space/Agent-off/停用/重启真正被哪一层阻断。静态事实不冒充实机反例。
2. 比较至少两个现有owner内的最小方案：提取纯共享布局/renderer贡献接缝，或Browser独立页面复用共享承载；推荐满足同标签/分屏/分组/快捷键/恢复的最小路线。Shell/app仅经公开api/贡献装配，不能导入模块内部、带起Agent/Provider；不新增视图类型、第二套Workspace manager/writer、daemon或独立浏览器应用。
3. 明确T09原Space布局/Pane身份与共享浏览器布局的交界，shared kind不能混作Space/Session，网页不获得终端输入/size owner。保留原URL/资料引用和素材一次附加、ownerDocument/popout/portal/焦点、Tabs/groups/pin/color/drag与noSpace。T09真实API未完成处写待重核合同，不假造export或把旧runtime叶key当新paneId。
4. 旧布局兼容与单writer：当前设备/共享网页数据哪里读写、Agent停用时谁保持并保存、旧路径如何仅兼容读取，T15才做正式迁移。不能Browser/Agent各写副本；重启恢复网页不spawn Agent；关闭Browser按原owner释放自己的资源但不误停共享Cookie/其他native能力。
5. 列最小精确候选路径/已有测试和未来验证矩阵。必须有真实module-off/noSpace打开/恢复、关闭Agent网页存活、Cookie独立不触发Agent、URL资料原消费者、同布局双向读回、宽窄与主/弹出窗口；标清可用DOM/真实受控Chrome/用户宿主边界。建议仅计划，不写产品、不运行探针、不预填AC通过。

资料已足够明确路线即收束，不展开T14全部消费者或T15迁移实现。对范围不足先报告，不以新服务扩张掩盖现有owner。

## Return

原子写本030 REPORT.md，标准Session/Task/Status和聚焦交接/产物与验证/问题与下一步。保存静态输入path/hash/mode/snapshot，实际命令argv/cwd/UTC/exit/raw、原失败和外部来源许可/活动/引用；工具未运行或证据未取得则如实写明。报告后实际return结构校验保存原件，再明确READ-ONLY SOURCE STOPPED。只交候选准备，不改T13或Goal状态，不宣称动态T09输入无漂移。
