# Engine边界只读预检

2026-10-25；Lead在026–028实施期间读取，不开启T08、不安装SDK或调用模型。沿IMPLEMENTATION-REFERENCES的REF01固定提交/Apache-2.0与已核验维护活动，未复制源码。当前公共Engine合同仍由026原owner决定；本记录不宣称运行兼容。

## 固定来源与事实

[Eino interface.go](https://github.com/cloudwego/eino/blob/0a5ca53b9d3bf7b661dccc863465ec568a421eea/adk/interface.go)将Run输入、流事件与ResumeInfo分开。事件持有SDK消息/stream、Action、Err；SDK文档要求返回事件流可以独占消费并释放，并指出AgenticMessage尚未接入模型流取消监控/重试。不能把事件出现或流结束直接等价成HUHU持久终态，CP序列化也不能透过公共HAP。

[Eino chatmodel.go](https://github.com/cloudwego/eino/blob/0a5ca53b9d3bf7b661dccc863465ec568a421eea/adk/chatmodel.go)把Message路径工具循环和AgenticMessage单次链路分开；默认Message输入生成器在SessionValues非空时会格式化instruction。HUHU Persona可能含字面JSON/花括号，T08应验证实际收到的原文并在adapter用明确输入构造，不能因框架会话变量误改人格内容。默认框架能力不证明HUHU取消/工具/恢复合同成立。

## 对当前和后续实施的含义

T03只需要纯HUHU Run/Resume输入、事件及finished/suspended/failed结果；固定配置引用、授权后上下文、usage未知状态和当前Run身份来自应用事实。SDK具体消息、Action、stream与ResumeInfo只留adapter。测试fake与未来生产adapter通过同一用例，生产未装配明确失败；不能先实现一个假成功引擎。T06原子发布CP/Approval/Effect/事件，T12预算和T16取消/恢复仍是T08真实adapter的依赖，不能在当前票自动重试付费动作来填空。

后续T08要用本地协议服务器捕获实际Persona/角色/工具输入，覆盖花括号与SessionValues、多工具审批中断、流取消后迟到块、部分/未知usage、原Effect身份恢复；真实模型现场由用户后验。本预检没有运行这些场景。

网页读取成功：上述两个固定官方源码。一次重复URL拼错提交为404、Raw链接取回失败，未作为来源；使用成功的GitHub文件正文定向find读回。没有修改生产源码、锁或现行Spec/ADR。
