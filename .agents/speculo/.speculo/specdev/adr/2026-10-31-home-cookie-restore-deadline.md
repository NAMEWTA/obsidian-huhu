# 首页可选恢复时限

状态：Accepted（已采纳决策；实现和验收状态沿来源分别核验）

日期：2026-10-31

内容 owner：来源 change 的已接受 ADR；提升网关：specdev/archive-and-consolidate，codex:/root。

来源：[2026-10-29-home-cookie-restore-deadline / ADR.md](../changes/archive/2026-10-29-home-cookie-restore-deadline/ADR.md)，原始字节 SHA-256 `66fdbb5ddc67917f23d4befac869637d9ea55aa9b8e57e014208208321cf5471`。授权与归档范围见[原请求](../changes/archive/2026-10-29-home-cookie-restore-deadline/archive-approval.md)。

本条保留长期取舍、边界与恢复义务；归档不证明下述目标已全部实现。原始理由、被拒方案、研究引用及验证合同随来源保留；本次未重新联网核验历史外部资料。

## ADR-001: 启动恢复在时限后放弃，迟到的 Cookie 不能登录

**Status:** accepted
**Source:** diagnosis.md 已确认根因；spec.md AC-01 至 AC-04
**Supersedes:** none

### Decision

桌面端网易云登录的启动恢复最多等待 5 秒。超时后账号保持未登录，不弹通知，首页激活继续。读取期间如果恢复代次变了，后到的 Cookie 不能登录。计时器使用所属窗口，而不是裸的全局 `setTimeout`。

### Context / Trade-off / Consequences

Cookie 存在 Electron 隔离会话里，读取可能要等系统凭据服务。把这次读取放在首页启动的必经之路上，等于让钥匙串的故障变成工作台故障。登录本身是可选的，未登录时音乐小组件仍可以要求用户再登录。

5 秒会让很慢但最终成功的钥匙串在这次启动里显示未登录。用户可以再次打开登录。这个代价小于工作台一直不出现。超时不通知，是为了避免每次启动都弹出同一条钥匙串故障。

### Verification / Migration

回归测试覆盖永不返回的读取和迟到的 `MUSIC_U`。没有数据迁移。已保存的会话文件保持原样。
