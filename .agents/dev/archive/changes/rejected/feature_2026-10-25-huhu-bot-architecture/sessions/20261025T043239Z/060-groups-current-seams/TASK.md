---
schema_version: 2
session: "20261025T043239Z"
task: "060-groups-current-seams"
kind: research
change: 2026-10-25-huhu-bot-architecture
ticket: T-13
---

# 群路由对当前协作实现的增量只读接缝核对

## Goal
由原045研究者 /root/foundation_research，在T11/T12真实代码已落地后，仅更新T13下一窗口所需的最小集成接缝。不重复045完整研究，不实施T13，也不打开依赖门。只有Root实际followup_task后启动，不再委派。

## Inputs
工作区 /home/wta/orca/workspaces/obsidian-huhu/bot；branch NAMEWTA/bot，HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715；Map16/Goal15、LOG051/073–079。按AGENTS发现规则、当前Map、dev、T13及原045最终报告读取；原生实现/审查模型偏好不变，不冒称模型认证。

Root已准备的 /tmp/huhu-groups-next-window-notes.md 只作问题索引，里面Map15旧时点不是当前授权。052/053仍在原Spec根limits快照收尾，054/058已交回；当前源码不是最终冻结候选。记录所读文件实际摘要与时间，变动使相关观察失效，不妨碍作者写入，不把只读研究说成验收。

## Workspace and Scope
仅写060自己的REPORT、短签名建议及来源清单；所有产品、永久测试、schema、锁、其他报告、正式Ticket/Evidence/Map只读。不运行构建/测试/产品进程，不访问真实Provider/Obsidian/Vault/keyring/D-Bus，不提交/发布。

沿真实调用方核对这五项，优先rg发现当前路径，未存在的方法明确为建议：

1. group Session如何复用当前direct/Execution受理，公开群管理/成员历史范围/mentions的最小DTO与Application接口；@绑定agentId，普通姓名不触发，全部目标原子验证，一根意图仅目标成员实际调用模型。
2. 当前同Executor的child TaskConfig、workThread、parent_result、root limits和budgetRoot可怎样组成无额外协调者模型调用的群编排根；哪些原T01/T02/T03接口或事务helper必须演进，不能另建执行器。
3. 成员incarnation与明确历史范围怎样进入当前Context、Attempt.Dispatch、最终公共message发布以及历史/snapshot/tail物理发送gate；空SourceRefs也必须执行成员检查，用户合法公共历史与撤销的未发布正文分清。
4. 当前最小子树barrier的真实消费者能否满足移除成员即停止群绑定工作、保留unknown/回执、其他群与私聊不受影响；协调者busy涵盖waiting/blocked/interrupted，不依赖未实现T16。
5. 精确原owner维护路径、接口方向和需要先冻结的内容。T01/T02配置pin/T03/T06原owner foundation_go；T04 Go/T05 Go/T11/T12原owner credential_provider；T04 TS/T01 TS消费者与未来mentions归foundation_client。新T13 group业务/013正文可交credential_provider，注册仍T01；旧001/002/003/005/006/011/012在本阶段通过后不可改写。

## Acceptance
约2500中文字符的增量结论，附必要准确签名/数据流和最小公共消费者故障场景；明确“现存事实 / 待owner冻结建议 / 未运行”。不要再次铺开已存在045矩阵或发明完整未来API。遇到原Spec已有答案直接引用，不向用户重新询问，不削弱成员撤销或上下文隔离。

交回前复核来源摘要，若052/053变动则注明具体失效条目；不把研究称为T13 Ready gate或生产授权。Root收齐当前联合门后才实际开下一实施窗口。

## Return
REPORT首个h2前包含Session: 20261025T043239Z、Task: 060-groups-current-seams、Status: completed（或实际状态）；h2聚焦交接、产物与验证、问题与下一步。给实际来源hash、命令退出和未运行边界；return结构校验0后真实MESSAGE与FINAL。Root全读核验后接纳，只读文件存在不是完成证明。
