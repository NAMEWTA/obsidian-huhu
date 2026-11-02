---
schema_version: 2
session: "20261025T043239Z"
task: "075-groups-client"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-13
---

# 明确提及与群协议客户端消费者

## Goal
原 /root/foundation_client 完成T13 mentions与原T01 TS/T04 TS的真实消费者。只在Root实际派遣及Map17/Goal16后开始；本文件当前仅准备。沿gpt-6.1-sol/xhigh偏好，不再委派。

## Inputs
repo /home/wta/orca/workspaces/obsidian-huhu/bot，branch NAMEWTA/bot，HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715。AGENTS→Map→dev适用参考→T13与原T01/T04/I；本票不改UI，UI由后续T21沿已有DESIGN完成。完整读060 REPORT/接口附件，群API/生成api.ts仅消费073唯一owner最终冻结；研究没有实跑群结论。LOG051真实模型/Obsidian/目标OSuser-owned/not-run。

## Workspace and Scope
T13 src/modules/huhubot/core/mentions/**；原T01 core/protocol/{codec,method-validation,connection}.ts及同名.test.ts（仅实际合同需要）；原T04 core/events/**、services/events/**。自有REPORT/log可写。api.ts/schema/Go由073，业务成员与fence由074；原Host/source/receipt/assistant客户端和模块激活/UI/根产物不在本窗口，新增实际消费者路径先由Root登记。不得建平行HAP DTO或复制后端业务权限，不提交推送发布。

明确@ token绑定稳定agentId，重名不猜测，普通文本提到名字不自动派遣；一次发送提交整个targetAgentIds集合，同一次用户意图一个根。校验无效/已停用/已移除token时保留原draft/mentions供UI后续消费，错误不得退回A自动发送；客户端校验不替代服务端当前CAS/授权。不要把预留未装配方法误标可用。

真实HapConnection严格消费新group Session/member历史授权、coordinator CAS、根/子任务及公共message seq；公开顺序与每Run event seq分离，断线重读持久快照/History，不按到达先后重排或复制正文。群绑定/当前权限在服务端权威，客户端收到撤权/移除响应按实际投影清理未发布/不再可读内容，晚到旧generation不能复活。保留已合法用户公开历史，不能为清理旧正文而删除所有历史。协议字段唯一schema生成；需要额外DTO与API请求先交073。

## Acceptance
定向tests经真实协议客户端，覆盖重复名/普通名字/显式token、无效整批拒绝/草稿保留、一次请求多个ID、busy重试同receipt、公共seq乱序完成/重连/去重及当前权限投影。与073/074实际TS-Go公开群链合作验证，不以模拟request计数替代服务器行为；作者适用类型/lint/架构，Root最终完整build/lint。现有Host取消、App quota和其他事件客户端回归不改行为。所有自有进程Wait。

## Return
REPORT首h2前Session/Task/Status，准确自有SHA、唯一合同输入、真实命令/exit与未运行现场边界；return0后原生MESSAGE+FINAL，停写。Root全读核验后才能认定本切片完成。
