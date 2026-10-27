# 067 草稿四链接维护候选交回

Session: 20261025T043239Z
Task: 067-draft-link-maintenance
Status: completed

## 聚焦交接

仅修正原042 `logs/report-draft.md` 四个相对URL多写的一层 `logs/`，标签、正文、事实、占位符及文件权限保持不变。这四个链接问题由本Goal引入，本次负责收尾，没有归为任务前已有。完整原始字节已先保存为本目录.txt，精确逆替换能恢复原SHA。产品/测试继续停写，059重窗口未被打扰；本候选不代表T27完成或全仓文档检查通过。

## 产物与验证

作者 `native:/root/foundation_go`，复用SpecDev I纯文档分支；Root TASK067 SHA为 `c812cf77a4d2314e86ea39f2bcb2def37bf0f8dafe4109633e4ef4dc942ac996`。未commit、push或release，没有修改042最终REPORT、原日志/快照/Evidence或任何产品/工程规则/冻结来源。

- 原始完整字节：[042-report-draft-original.txt](042-report-draft-original.txt)，13,948字节，SHA `29d2702ce0ec7074b7a29cd9f20b86c46ba1e87c4cdc75bbc2f9f3c68ed2fa60`；备份发生在旧文件写入之前，保留原0600权限。
- 唯一旧文件 [042草稿](../042-approval-implementation/logs/report-draft.md) 修后13,928字节，SHA `06293fa2a04d0ffd0fc05923ef3900cab626f07bdec9dab80b096de07883b96c`。仅四处URL各移除5字节 `logs/`；完整精确差异在 [patch](02-four-links.patch)。
- [编辑前保护清单](01-before-and-backup.json) 与 [实际校验manifest](03-validation.json) 记录URL、目标SHA、原/新/逆向SHA、文件权限、HEAD/index和332个去重保护文件；`protectedDrift=[]`。其中059冻结257产品/65来源均与原review输入匹配，Input SHA仍 `63e74529e1059fcd86c814621dce91c22c9ad9440c47ba8ecc0f779978b74a98`。
- 042最终REPORT SHA保持 `a118582e2853583ee70ccc9bb1b15892a906f36d0ef014c1e23d8285b5a6649a`。HEAD保持 `33c21e098ef3188cbab5a09f3e0a01fadb787715`；Git index SHA保持 `d2a2cc618e08f39b6730478bed302db78480d2d10642879f55b1811035e50494`。

| 草稿内原URL | 修后URL | 从草稿目录实际解析 |
| --- | --- | --- |
| `logs/owned-source.json` | `owned-source.json` | 同目录既存文件 |
| `logs/changes-from-t03-r2.json` | `changes-from-t03-r2.json` | 同目录既存文件 |
| `logs/joint-source-final.json` | `joint-source-final.json` | 同目录既存文件 |
| `logs/protected-inputs.json` | `protected-inputs.json` | 同目录既存文件 |

实际轻量命令为 `python3 - <<'PY'` 两次：先按预期SHA核原始字节并备份/建立保护清单，再精确四替换、`Path.resolve()/is_file()`逐链接验证、逆替换完整bytes/SHA断言、保护SHA/HEAD/index/权限对照，均exit0。逆向SHA与原始SHA完全相同，证明除了四个URL目标之外没有其他字节改动。return结构校验命令与退出结果另见本目录回执，结构通过不冒充内容或全仓文档验收。

## 问题与下一步

本切片没有未闭合项，完成后停止所有写入。未运行全仓test:docs、build、测试或产品进程；原十项docs失败历史不抹除，其余六项原用户输入锚点也未改动。全仓docs在Root后续适用窗口复核，T27仍未完成。T13没有开工，本任务未改变任何未来实施授权；等待Root接纳此精确维护结果。
