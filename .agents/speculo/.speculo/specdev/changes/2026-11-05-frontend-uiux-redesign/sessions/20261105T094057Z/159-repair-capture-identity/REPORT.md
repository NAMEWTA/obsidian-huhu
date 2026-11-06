# T-14 截图身份缺口最小修复候选

Session: 20261105T094057Z
Task: 159-repair-capture-identity
Status: candidate-ready
Implementer: native:/root/integration_final（sol medium）；正式源仅 Root 写入。

## 聚焦交接

按159 TASK、当前 Map57/Goal/T14 与既有 dev/ui/testing 约束修复留存身份。原第一轮858已通过仅复用为旧输入历史，不把它称为本轮新driver通过；本轮是产品/视觉已确认修复必要新输入轮的附带工具修正。候选仅四路径：run.mjs、integration/index.mjs、integration/integration.test.mjs、T11/index.mjs，不需run.test。未写正式源、产品、预算、状态、Evidence或旧报告。

中央 runtime sample 在 configure/verify/capture 前得到 id，直接将原唯一主图名的 .png 后缀去掉，兼容已有 capture 名只允许字母数字连字符的约束。原主PNG完整命名表达原样前移，主PNG名字不变，T09/T12现有sample.id自然生效，不改两票driver。T11六处capture仅替换原宽度/语言片段为sample.id，保留原state/name；ID已含width/lang/theme/accent/source/host/density/uiSize/mobile/zoom，避免跨theme以及其余case维度覆盖。矩阵、断言、页面、状态、ThemeRuntime、exercise与清理全部不改。

return0后停止全部读写并释放；本回执不判T14通过。

## 产物与验证

候选根：/tmp/huhu-capture-identity/candidate。四文件均从当前正式源独立copy（冻结时nlink=1），无src硬链接或产品副本写入。父非check验证增加sample.id非空且为capture合法字符、同child唯一，并要求主PNG文件名等于`${sample.id}.png`；planned66仍无新增字段，check仍preflight/0cases。

定向Node14/14通过（退出0）：node --test /tmp/huhu-capture-identity/candidate/scripts/ui-review/fixtures/frontend-redesign/integration/integration.test.mjs。新增行为正反例验证完整身份接受、缺失/空/非法身份拒绝、两个case共享同ID且共享同PNG仍因重复拒绝，以及有效ID与主PNG不对应拒绝；原PNG文件边界测试改为每case独立PNG夹具，其余13例保留并通过，包含preflight不冒E2E。

语法检查均退出0：node --check /tmp/huhu-capture-identity/candidate/scripts/ui-review/run.mjs；node --check /tmp/huhu-capture-identity/candidate/scripts/ui-review/fixtures/frontend-redesign/T-11/index.mjs。integration实现与测试由实际Node运行解析。自查diff确认四路径之外无候选，T11只有六处capture字符串变化，中央只有原主图名声明前移和id赋值；无断言或状态删减。

独占冻结：/tmp/huhu-capture-identity/ready.patch、/tmp/huhu-capture-identity/manifest.json。manifest保存四路径before/after SHA256、mode与候选定位，冻结时正式源SHA等于初始before且各模式保持原值。patch SHA256：157aa1220401b90a1da1b36dcd2f342dc8ddd7c5a766442b35403a86671b84c0。原145工具审查未变的调度/来源图/退出码/隔离/清理范围有界复用，不称本增量为独立审查。

## 问题与下一步

未运行实际component capture、单票66、858、插件构建或native。纯Node留存身份验证不证明新截图视觉或组件运行通过。Root核对before SHA后应用候选，并在本来必要的新源输入轮运行独立增量审查与正式矩阵；可先做T09/T12/T11小型实际capture检查。原第一轮858及其主PNG仍是旧输入有效历史，不用新driver哈希重标旧证据。无待扩大写集事项。return0，停止读写。
