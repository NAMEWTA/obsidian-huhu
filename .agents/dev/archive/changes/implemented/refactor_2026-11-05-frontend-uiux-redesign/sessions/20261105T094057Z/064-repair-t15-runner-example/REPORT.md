# T15 runner 示例窄修复

Session: 20261105T094057Z
Task: 064-repair-t15-runner-example
Status: completed

## 聚焦交接

已补齐061的唯一V-01：仅在 .agents/skills/ui/references/shell.md 末尾新增“生产组件验证入口”小节，给出现有T04准确命令、当前票/风险选择、fixture生产者与Lead验收边界、--check语义和iframe/真实宿主区别。五源新候选已冻结，供独立窄复核；不宣布T15/G-CONTRACT通过。

除shell.md、本报告和/tmp/huhu-t15-runner-repair外无写入；其它四Skill源、产品/runner/dev/docs/规划/状态/绑定/资产/Git/index只读。没有委派、构建或完整66重跑，没有向062原快照盲测提供预设答案。自动化领域能力澄清由Root另行负责，本修复没有改它。

## 产物与验证

### V-01落实

文中给出的现有生产fixture示例：

`node scripts/ui-review/run.mjs --suite frontend-redesign --ticket T-04 --matrix redesign --out /tmp/huhu-ui-review-t04-example`

要求输出换成本次未使用的临时目录，并链接dev唯一验证选择表，不新增一套全部必跑清单。新票fixture须由相应生产者实际交付，不能仅替换ticket参数就声称可执行/通过。只读核对实际run.mjs和T04 fixture：--check分支记录preflight，浏览器启动、verify和exercise均位于另一分支；边界描述与源一致。

实际执行的私有预检：

`node scripts/ui-review/run.mjs --suite frontend-redesign --ticket T-04 --matrix redesign --out /tmp/huhu-t15-runner-repair/preflight-t04 --check`

退出0；result.json为 **status=preflight、plannedCases=66、cases=0、inputs=2251、errors=[]**。只编译/检查适配器和记录计划/输入，没有浏览器断言，不把它写成矩阵通过，也不声称重跑了原已接受66。此命令读取现有宿主app.css和生成样式，临时编译物均由runner写/tmp，没有生成共享资产。

- `pnpm test:docs`：退出0，日志 /tmp/huhu-t15-runner-repair/docs.log。
- `git diff --check -- .agents/skills/ui`：退出0，日志 diff-check.log。
- 快照核对：其它四文件SHA完全等于060候选；五文件模式0664、非symlink保持，frontmatter所在SKILL逐字未变。
- 本次只补文档使用路径，未重跑三组合示例类型/产品测试；060未改部分检查保持有效，独立窄复核由Lead安排。

### 完整五源冻结

/tmp/huhu-t15-runner-repair/frozen/、frozen-manifest.json、receipt.json 保存真实字节/元数据；shell编辑前副本为shell-before.md。完整源体积由060的 **36,356 bytes / 20,334字符** 变为 **37,492 bytes / 20,958字符**，净增1136 bytes / 624字符；不推导Token/费用变化。更早旧五源基线36,472 bytes / 20,641字符保留于060/before记录。

| 文件 | SHA256 |
|---|---|
| SKILL.md | 12621917181e3a74f3a410a710752e8e856d9a84af739ef6c97c85f79bca1ad4 |
| references/design-system.md | 1c7ed53e651942b46a57440f4e8d14f24b323e0c57c216ceea79b1e5fa62c20c |
| references/shell.md | 1d816a031d8e2af6435666330e7d1795558a07fc4f142fa2aba13ae26bfa1247 |
| references/theme.md | c1de6aac62b8f40ad0d02602befddb32ec3bcda3508a179fdbea38b7a43e024d |
| references/motion-a11y.md | c5176fc786f8b2cc9033b5b60b5fc2e944ed6d34f5920108a295cfd3bf1d9c24 |

## 问题与下一步

五源冻结释放给Lead的独立窄复核，未经新任务不再改源。062继续按原快照返回自己的独立边界；本修复不替代它。T15接受、11下游binding刷新、历史调用SHA与正式状态/Evidence维护仍由Lead执行，没有提前关闭G-CONTRACT。return validate-dispatch退出0、errors[]/warnings[]；最终五源drift[]，日志/tmp/huhu-t15-runner-repair/return-validator.log。
