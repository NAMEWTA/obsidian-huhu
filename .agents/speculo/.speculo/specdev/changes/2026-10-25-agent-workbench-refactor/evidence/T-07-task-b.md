# T07 B — 宿主控制与原始帧接缝

Root实际followup_task后开始。你是codex:/root/implement_t07_host（gpt-6.1-sol/xhigh），cwd=/home/wta/orca/workspaces/obsidian-huhu/terminal，HEAD/base33c21e098ef3188cbab5a09f3e0a01fadb787715。用户授权全18票AgentTeam与代码验收；Root唯一正式状态/生成物/全局整合owner，真实宿主/Provider/五平台E2E用户执行。不另建工作区、不递归委派，不提交/推送/发布/归档。

Change=.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor。沿已读AGENTS discovery/Map→dev→Ticket07→Goal与I预检，正式GP022/Map23，T06已done、DoR实际通过。完整合同evidence/T-07-engineering-packet.md，B12唯一写集T-07-write-allocation.json，真实实施前输入T-07-dispatch-input.json。C先落单源wire，实际端口经Root核读后才消费；不能猜第二套DTO/JSON。

本次仅解锁独立于C语法的B2：src/shared/native/frames.ts、src/shared/native/frames.test.ts。实现可选raw body parser hook，默认decoder行为不变；新增有界raw-body→kind1 framing入口，仅验证长度/包帧，不JSON.parse/计量/克隆第二遍新DTO。C负责唯一strict JSON codec并在调用方已取得新lane许可后交body；没有C实源时不新增C import。保持旧encodeControl/controlBytes 16/4096、legacy大帧与4字节头即时拒绝合同，不更改旧SID/输入/reply语义。FrameDecoder第二可选参数可用普通Uint8Array→Record callback表达，不把control schema写进frames；具体名称在真实API交接时回读。

先对真实FrameDecoder/framing形成失败反例并最小实现；覆盖任意分片、旧默认UTF8/JSON行为、raw hook拿到原重复/转义键字节不预parse、hook异常、超限/包长以及原terminal-core回归。C尚未落源时不冒称已验证新strict grammar。只跑自有定向检查，实际Node=/home/wta/.volta/tools/image/node/26.11.1/bin/node；不能全局build/lint/guards/Root产物或运行helper。原工具/输入/argv/UTC/exit/raw log必须可回读，失败及可能其他writer输入漂移保留。

其他B10路径保持STOP，尤其host/helper/shared-host、CI、文档和真实native测试等待C实源及Root后续解锁。B2完成后返回/tmp/huhu-t07-b-frames-handoff.md/.json，含实际导出/源码SHA/红绿与相关回归，然后SOURCE STOPPED；Root核验后协调C/B实际消费。后续完整B12实施再按原packet负责lease/current/队列/callback+drain/close/CI/脚本/中文说明；A仍拥有真实TS业务闭环，B不能另造固定业务回答harness。最终由Root在全部停源后整合并独立Astra/high审查。
