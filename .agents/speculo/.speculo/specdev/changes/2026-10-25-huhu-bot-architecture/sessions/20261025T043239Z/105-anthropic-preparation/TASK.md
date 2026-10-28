---
schema_version: 2
session: "20261025T043239Z"
task: "105-anthropic-preparation"
kind: research
change: 2026-10-25-huhu-bot-architecture
ticket: T-10
---

# Anthropic 下一协议只读准备

## Goal

由原047/097 research owner native:/root/foundation_research，在104完整交回停写后，结合现有Chat底座与097的Responses窄桥建议，为T10给出最小兼容路线和协议独有故障矩阵。不激活T10，不提前写产品；不再委派。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot，NAMEWTA/bot，HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715，Map25/Goal24。完整28票55AC代码开发、Agent Team持续授权，真实模型/Obsidian/目标OS用户后验，不索凭证、不提交推送发布归档。

先按AGENTS workspace/catalog发现；当前T10与Spec/架构对应条款、dev架构/测试/许可规则及I只读准备适用。复用047-model-protocol-preflight固定实际来源：claude v0.1.26、备选agenticclaude v0.1.7、共同anthropic-sdk-go v1.56.0；不浮动版本或重复全部源码/网络研究。097接口建议已接纳为技术准备，104只修两处展示。当前100/101修复候选与102完整冻结复审进行中，不能把正在评审候选当最终通过。

## Workspace and Scope

全部产品、规则、正式Map/Goal/Evidence、他人报告只读；仅本105 REPORT/logs/source清单可写。读取固定缓存SDK/EinoExt及当前common/chat必要接口；没有获准下载、Go/Node产品检查或真实Provider调用。102持唯一Go窗口；只读方案不会改变冻结输入。源变动按实际SHA记录，不倒填旧证据。

## Acceptance

1. 对固定claude/agenticclaude与直接anthropic-sdk-go公开Messages流入口比较，最多两条可实施路线，推荐窄桥；明确无法从现有Ext配置关闭SDK MaxRetries2的实证位置、如何显式0且不fork整包/改缓存/Generate捕获重发。不引入第二个通用Runner、账本或应用SDK类型。
2. 与097 TurnResult/ProtocolState/纯validator/identity方案对接：完整有序content blocks、tool_use ID、tool_result、thinking signature/redacted_thinking data/合法空thinking必须保存，只有真实provider可见字段回放；原tool Token/权限/完整ToolResult不可透出。列当前common原owner精确请求，保留Chat v1与Responses后续独立身份，不提前发明公共Port/SQL。
3. 固定SDK实际NewStreaming/Next/Err/Close、初始HTTP错误/ctxcancel路径与资源ownership；说明如何在最底层tracked body覆盖初始未暴露response分支，producer真实结束后才Settle，raw UTF8/bounds在SDK前。cache usage/input/output presence与流start/delta/stop的可信终结、计费字段关系要从固定源码/已有官方研究定位，不猜默认0是known。
4. 明确direct Anthropic认证、endpoint、required headers、禁环境/cloudfallback、禁retry/redirect与一HTTP一Attempts；只读metadata Probe能做什么和不能证明什么。ModelID不得换路径，返回未证实capabilities空，不加收费fallback。
5. 输出协议独有风险矩阵：有序/重复/缺失block、input_json_delta空对象与Unicode、多工具整批拒绝、thinking空/签名晚到/redacted、message_delta usage累计、缺stop/错误terminal/unknown语义、新hosted工具、审批跨重启、撤权后的opaque回放、Cancel/Close屏障、错误HTTP及有限边界。未实施均not-run，说明不变底座证据复用条件。
6. 完整来源位置/行段/SHA与结论对应；明确源码观察、历史官方研究、建议和未运行。若现有材料不足而确需在线官方文档，可只查精确缺口并保留来源日期，禁止据搜索摘要定行为。

## Return

REPORT首h2前Session/Task/Status；聚焦交接、产物与验证、问题与下一步。交回精确owner清单、私有形状和差异矩阵、来源/漂移manifest，亲自validate-dispatch return0。之后停写并native MESSAGE+FINAL；T10生产仍须Root另派，研究不算协议通过。
