# 共享浏览器领域上下文

权威范围：仅本 change。依据 <Path>.agents/speculo/.speculo/specdev/changes/2026-10-31-browser-shared-session-space/source.md</Path> §2、§6、§8–13；未提升为永久 context。

| 术语 | 规范含义 | 禁止误解 |
|---|---|---|
| Space | 页面目录、显示元数据、授权策略与一个 Session 绑定 | 不是仅一串 partition；personal/task 不是同 Space 的两份 profile |
| Session / partition | Electron 管理的网站存储环境 | 同 Session 不代表所有 origin 互读，也不代表同一页 JS 内存 |
| live Page | 注册表中唯一 guest 与稳定 pageId、ownerWindow、document generation | 相同 URL 或 Cookie 的另一个 guest 不是原页 |
| 恢复描述 | 过滤后的可重开 URL 与偏好 | 不承诺恢复 JS 堆、表单、滚动、所有 sessionStorage |
| trusted caller | 宿主核实的 Agent/Task 身份与授权上下文 | 模型提供 taskId 不是身份凭证 |
| 控制代次 | 撤权/交回产生的执行屏障版本 | 不是旧 viewer lease、Native heartbeat 或可重启复活的授权 |
| 观察态 | 人可看同一页，输入被真实表面门禁阻止 | 不仅是 pointer-events:none；需处理已在 guest 内的键盘焦点 |
| unknown | 动作已经或可能派发，无法确证最终结果 | 不是“未执行”、不是自动重试许可 |
| 文件 handle | 指定主体/空间/操作/期限的受限文件引用 | 路径、文件名、下载完成都不是读取授权 |
| cleanup-pending | 清理未完成，保留归属与恢复信息 | 不是隐藏失败后的删除成功 |

## 不变量

一个 Page 只有一个 live guest；一个 Space 默认一个写者；用户接管撤销旧读写及结果；个人 Space 对 Agent 不泄漏标题/列表；网页内容始终不可信；Session 不污染 defaultSession；服务只拥有自有资源。源码删除不自动删除旧用户磁盘文件。持久化网站数据不在 Vault 同步合同内。停用不是登出。

## 信任边界

可信 UI 可以发起交接/转换/文件选择；Bot/CLI/MCP 只能消耗现有授权。网页、模型字段、selector、页面声明都不生成权限。当前 OS 用户和其他高权限 Obsidian 插件不被此机制隔离为强安全对手；不要对外夸大沙箱能力。
