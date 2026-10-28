---
schema_version: 2
session: "20261026T045732Z"
task: "038-t10-inbox-ui-plan"
kind: "engineering-plan"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-10"
---

## Goal

Root委托沿原Sol/xhigh为T10被动邮箱补最小生产UI/生命周期接缝计划，继承你已经实现并交回的T09真实抽屉/Toolbar/焦点行为。只读准备，未激活T10、不写任何产品/正式规划、不递归派遣。Root已接受035，T09完整独立审查036正在运行。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/terminal；change同当前会话。固定入口 /tmp/huhu-t10-root-ui-plan-dk_ysk2i/inputs.json SHA256 a4dc5dcad07c6b34b34b235d2e395cbbeb344e34adc244b7eccf49edc22bcb24。T09最终全产品manifest原始SHA 5b5ad8baa7b79c8aefd7d0dc416a4fac0a894e07aea0286cce295c624ed004f4，语义包 cba59899a76f1c1b2b87bb5501d9bd744361690e88b90c8e2a8b89a1ffacca82含Spec/合同/DESIGN/批准原型原字节。优先snapshot；当前产品全停写但不可视为T09已通过独立审查。草稿r2 SHA 9d79d4e8a6234642c75dc9bb72bc2c7f3e6e42f2f3a63714ec1dd90af8feff38。

先bootstrap/dev/ui及本票规范，已读未变规则可复用。T10主AC002/023/024/025/046与PAGE003/AC061，行为已批准，不重新选模板或问用户。草稿r2已纳033计划预审：原SpaceService唯一持久邮箱owner；CLI/GUI显式接收Session且Space归属不猜；停止/后台/detached对象可收，不prompt、不spawn、不抢焦点；读取不ack；unknown保留业务messageId、正文、原目标与核对动作，无自动重发。附件首版当前Vault typed-file引用，真实picker只取metadata、显式打开重核，不复用会读正文并paste的素材投递。

## Workspace and Scope

只写本038 REPORT及全新/tmp/huhu-t10-inbox-ui-plan-*。全部产品、原031/035/Root证据、Spec/Ticket/Map/Goal、批准原型与永久知识只读；不跑Chrome/helper/全库、不操作真实账号/Vault、不提交推送发布归档。必要纯逻辑探针只用自己tmp和冻结源码，先记录真正输入与边界，不预做未来产品实现。

## Acceptance

回读真实AgentWorkspacePage/Toolbar/TerminalControlPanel、workspace-view、compose-workbench及agent-contribution.test、原Vault picker和生命周期。给一份最小可直接派单的精确路径候选与每路径用途，不使用目录glob，不把缺实现当bug。

决定在批准PAGE003右侧工具内如何并列切换控制/通知以及与history互斥、计数可见、312px/<600Dialog/32-44目标/键盘和焦点返回。保持原显式控制目标，不因消息到达或读取切Space/终端焦点；不重写终端控制。若新增workspace-view开闭/标签状态，列出compose stateKeys和真实恢复测试，正文/未知发送状态不能进入序列化stateKeys。

最关键：pending/unknown发送状态必须在模块activation范围有界保留，至少抽屉关闭、切history、窄宽分支重挂载后仍能核对，不能只放会被卸载的InboxPanel useState。比较最小上层owner/现有viewStore/controller端口方案，选择一个并给原始调用/销毁位置；只展示/核对，不变成Outbox/重发队列，明确多专注叶子并存的目标隔离。API仅为候选：原A业务facade实际接口尚未实现，不能先虚构已冻结签名；给A/B需要承诺的最小数据/操作及错误/unknown adoption点。

收件人picker必须读取原持久Session列表含停止/归档已存消息，明确跨Space范围/重复标题/稳定ID；send归档拒绝，但read/ack仍能访问原记录，不以connected runtimes列表过滤掉消息。附件picker与open端口由A业务来源adapter掌握真实Vault权限，UI不任意读本机path或正文。列出正常/空/加载/错误/未读、read与ack、unknown关闭重开、多叶子/窄宽、失效引用、同cwd双Space的实际生产DOM与受控Chrome验收接缝，不将未来命令标已运行。

建议复用已有Chrome脚本还是新增T10脚本，标出真实生产组件与受控宿主边界，不启动任何测试资源。给Root哪些文件可由U独占、controller或services接口必须给A、canonical给B；Root不在产品文件与U并写。

## Return

一次性原子落盘本目录REPORT.md，Session/Task/Status，聚焦交接、产物与验证、问题与下一步。只引用真正回读源/快照/路径/hash与任何实际探针；未来验证明确未执行；无需复制原工程草稿全文。实际运行validate-dispatch --stage return保留原stdout/exit/TASK和REPORT SHA。SOURCE READ ONLY，Root核验后决定正式T10写集和DoR。
