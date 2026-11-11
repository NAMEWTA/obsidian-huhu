# Go Unicode 文本边界修复

Session: 20261025T043239Z
Task: 016-foundation-unicode-repair
Status: completed

## 聚焦交接

014 的 STD/SPEC-R2-02 已完成最小修复：client.name、client.version、workspaceId、每项 capability 按 Unicode codepoint 计数，与现有唯一 schema 的 maxLength128 一致。wire ID/method 的 UTF-8 字节上限128保持原实现，并有独立回归。按root明确释放015冻结后才写入，先保存真实红灯，再改四处长度检查并转绿。当前Go生产与测试源码已停写冻结，等待017真实TS→Go联调汇总和018独立复审；completed仅代表本候选交回。

## 产物与验证

作者为原 `/root/foundation_go` 续执行，requested model沿Lead派遣 gpt-6.1-sol/xhigh；未重新认证底层模型。唯一工作区/基线沿TASK，无Git提交、推送、发布、再派遣或正式状态写入。

生产只改两个文件：

- `native/huhubot/internal/adapters/inbound/hap/router.go`：hello的client.name/client.version由len改为标准库utf8.RuneCountInString。
- `native/huhubot/internal/application/api/service.go`：Host workspaceId和capability字符串作同样变更；capabilities数组数量0..32、去重、可信Host权限和租约逻辑未改。

新增 `tests/contract/foundation/unicode_test.go`，直接使用现有生产schema validator、真实stdio server/router/Application/SQLite fixture，不只测试计数函数。ASCII x、中文“测”、补充平面“😀”分别覆盖四字段×128/129，共24方法边界：128通过，129被真实Go拒绝；无效hello保持HELLO_REQUIRED，非法Host注册不安装lease。另12个wire ID/method边界覆盖同三类字符的128/129 UTF-8 bytes：128通过、129拒绝；例如128个“😀”为512字节，普通字段可合法传入，wire标识仍按自身字节合同判断。

实际命令与结果：

| 检查 | 命令/结果 | 原始证据 |
| --- | --- | --- |
| 红灯 | `GOTOOLCHAIN=go1.26.10 go -C native/huhubot test ./tests/contract/foundation/... -count=1 -run 'TestMethodTextUnicodeBoundaries\|TestWireIdentifiersKeepUTF8ByteLimit' -v`，exit1 | red-boundaries.log：中文/补充平面128在四字段共8处真实拒绝；ASCII/129与wire对照通过 |
| 定向绿灯 | 同一命令，exit0，0.197s | green-boundaries.log：24方法边界+12wire边界全通过 |
| 完整foundation | `GOTOOLCHAIN=go1.26.10 go -C native/huhubot test ./tests/contract/foundation/... -count=1`，exit0，5.185s | foundation.log，保留原WAL/背压/strict DTO回归 |
| 静态检查 | `GOTOOLCHAIN=go1.26.10 go -C native/huhubot vet ./...`，exit0 | 实际工具回执，无输出 |
| 架构 | `pnpm test:huhu-bot-architecture`，exit0 | 实际回执：4 Application生产文件通过 |

本次没有并发或资源模型改动，按TASK不机械重复race；此前race证据只作未变边界辅助，不称本次新跑。无新依赖，不重算许可。

schema、generator、fixtures、Go module/sum、wire frame实现均未改；source-sha256.json记录三个写入文件及受保护文件与011快照一致的实际摘要，快照SHA256 `fa0ae30bb735314d105bfe7f85520c7c85cc474e411579e6b096096fecfdddd9`。没有写TS。017 owner已获Go冻结通知，可用真实HapConnection/managed transport验证同样的x/测/😀边界；129由正常TS schema拒绝，对应Go服务端拒绝由本回归覆盖，不为了联调绕开生产validator。

## 问题与下一步

本分片无已知待修复项。Go源码保持冻结，等待017联调回执、T27按新源码更新dist及018独立复审；本报告不把T-01标done，也不修改014原两轴结果。未执行真实用户模型、Obsidian和其他OS现场，继续按LOG-051由用户后验。所有自有suite、writer和合成子进程已结束；无后台Runner或listener。
