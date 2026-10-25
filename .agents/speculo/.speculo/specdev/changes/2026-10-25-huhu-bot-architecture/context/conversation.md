# conversation 对话上下文

**Session**：围绕同一对话保存消息、来源和修订的业务容器；它可包含多次 Run。
_Avoid_：SDK Session、Host 连接、一次请求。

**Message**：对话中的一条稳定身份记录；编辑后重发产生新的消息和执行意图。
_Avoid_：临时文本 chunk、覆盖原审计记录。

**SourceRef**：在明确上下文中捕获的资料引用，绑定工作区、定位、内容修订和发起来源。
_Avoid_：动态变化的当前文件、自动授权的绝对路径。

**会话归档**：改变会话的日常展示/组织状态，保留其数据。
_Avoid_：永久删除。

**会话正文删除**：清除会话正文和相应受管派生内容；若有未决效果，仍保留明确列出的最小核查记录。
_Avoid_：所有相关信息已经完全抹除。


**单聊**：用户与一个持久 Bot 的可见 Session；一次发送创建一个前台根 Run。
_Avoid_：把所有 Bot 的短期上下文合并到同一 SDK 会话。

**群聊**：具有成员修订和协调者引用的可见 Session；普通消息默认发给协调者，@ 显式路由给已加入成员。
_Avoid_：所有成员自动同时回复每一条消息。

**群聊 transcript**：明确公开给群内的消息、任务卡与结果；不包含成员全部私有思考、私聊和记忆。
_Avoid_：子工作线程的原样复制。

**工作线程**：成员执行委派时独立的上下文容器，与可见 Session 通过 Delegation 相连。
_Avoid_：新的持久 Bot 身份。

## 实施与参考

领域术语和不变量保持由本文与 Spec 负责；T-03/13/17/18/21/22 的调用方、写集与验证见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/tickets-map.md</Path>。相关参考 REF-03/04/05 的机制、许可、依赖和不采用边界见 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/IMPLEMENTATION-REFERENCES.md</Path>。这些资料不赋予模型权限，不替代持久回执或实际验收。
