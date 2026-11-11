# T10 审查修复回报

Session: 20261105T094057Z
Task: 112-repair-t10-review
Status: completed

## 聚焦交接

109的ST01–ST05五条真实行为反例及SP01 gutter严格命中问题已修，候选冻结停写待Root独立high复审。五组反例/正控制共10项现在全绿，全T10和相关T16 history界面19文件179项DOM、17文件107项unit均通过。跨独立根使用统一EditorPanelHandle，Root核验并串行合入6个Root拥有源；本worker只修改获分配UI/宿主/测试，不写API、Module或T16源。未改领域、锚点/存储/schema、词典、fixture、全局产物或正式状态。

## 逐项解除

- ST01 P1：SearchWritePanel保存writeRaw，与受验证writeDate及DiaryDraft.date同时一致才可提交；DateField消费Root真实draftValue。非法2026-02-31 blur后Save禁用，handler也阻断；真实periodic/diary-writing路径断言旧2026-11-04.md不出现marker、不发布success receipt，合法日期配对仍追加成功。反例测试只将旧“等待Save可用”的前置改为“非法时断言Save禁用”，原数据/receipt风险断言保留；未禁用合法写作。
- ST02 P2：DiaryReader通过真实periodic.inspect(period,selected).path匹配列表项，不再拿月中日期与月首canonical date精确比较；真实monthly/2026/2026-11.md在Go11/17和Go11/01均显示，且不创建/改写文件。周期算法仍使用现有服务，未新造日期规则。
- ST03 P2：Host显式传入initialVisible，随后经handle.setVisible同步当前tab状态，卸载/替换通过dispose；comments runtime迟到import使用最新visible并在关闭后拒绝挂载，独立comments mount复用原ContainerProviders visible。CommentsPanel和NoteThreads隐藏后暂停UI触发的加载，恢复沿用原筛选/实例。Root合入的T16 mount和module消费同一端口，NoteHistoryPanel真实useVisible守住加载effect并在隐藏时abort旧请求；真实独立History配对、initial-hidden、恢复及listeners=0均绿，actual comments runtime延迟挂载/取消/cleanup也绿。
- ST04 P2：ThreadCard note保存捕获草稿revision与env/path/thread owner，durable flush旧ack只在同owner且无后续编辑时关闭；First note写盘等待时仍可编辑Latest note draft，旧ack不会清掉Latest。无后续编辑正控制仍正常关闭并保留First已持久值。
- ST05 P2：每个selection request分配独立highlight幂等key，旧请求的accepted flush、错误及finally仅影响原request；A等待durable flush时B选Yellow能够创建自己的记录，不复用A吞掉B，原顺序控制保持。
- SP01 P2：原生gutter现为role=img的非交互span，只显示计数/位置/状态；删除其click/keydown/hover触发和空行add小目标，不改原生行高、不加重叠伪元素、不保留18px按钮豁免。精确添加/光标处详情/前后定位命令、panel/HL浮层与回复/重挂/解决等真实动作继续存在。真实CodeMirror gutter DOM回归确认span/名称、无button/tabstop/点击和Enter动作；不将此DOM语义测试冒充Obsidian原生像素验收。

## 产物与验证

- 新真实dirty基线、原字节和模式：/tmp/huhu-t10-review-repair/baseline/、baseline-manifest.json、dirty-baseline.txt；未覆盖100/109材料。
- 完整候选：candidate/、candidate-manifest.json、changed-paths.json、complete.patch。84文件快照（含未改上下文、排除Root独占ui/i18n.ts），17文件实际差异，无删除。candidate-manifest.json SHA256：91610a84495965300738a551f02b8d9dd11e1ee94cbcf97a929c4e585ccdec7a。final-verification.json drift=[]。
- 原109红灯证据只读复用：/tmp/huhu-t10-high-review/counters-final-proof.log，5 failed/5 passed；来源摘要在red-provenance.json，原109 REPORT SHA256=c542d261167d025bade779d00d4605f53afec0516e3a8195da6c984724f84bff。本轮green在counters-green.log，3文件10项全过；CLI只过滤无关测试，不改永久skip。
- 全范围DOM命令：pnpm exec vitest run --project dom src/modules/navigator src/modules/comments src/app/editor-panel src/app/workbench/comments-leaf.dom.test.tsx src/modules/versioning/ui/history，退出0，19文件179通过，最终日志无stderr warning。
- unit：pnpm exec vitest run --project unit src/modules/comments src/modules/navigator/ui src/app/editor-panel，退出0，17文件107通过。
- 定向eslint、pnpm run lint:css、生产tsc --noEmit --skipLibCheck、聚焦测试tsconfig类型检查全部退出0；精确命令和日志在validation.json。Root T10原fixture/66浏览器、资产和真实宿主验收没有由worker执行。

## Root生产者交接

- 私有提案producer.patch与producer-visible.patch均仅生成在/tmp，worker未跨写。producer-before/proposed、producer-manifest.json保留五源before/after/mode；producer-visible-before/proposed、producer-visible-manifest.json保留实际T16内容守卫第六源。
- Root已核对beforehash/mode、apply --check后串行合入；producer-root-receipt.json再次从真实六源回读，全部matches_proposal=true。六源：app/contracts/editor-context.ts、comments/api.ts、comments/module.ts、versioning/module.ts、versioning/ui/history/history-panel-page.tsx、versioning/ui/history/NoteHistoryPanel.tsx。
- 合同为必需mount(container,documents,visible):EditorPanelHandle；handle只含setVisible(boolean)/dispose()，无旧function兼容分支，无新增Provider/Portal/引擎。真实Root fixture host mock亦由Root单写同步。

## 问题与下一步

- 当前本票定向检查无未消除失败。早期host2.log保留“只传Provider但内容不消费”真实红灯；收到Root第六源修复后再转绿，未把接口存在冒充行为通过。早期gutter DOM factory、lazy测试语言及测试相对import问题均已纠正，最终全范围通过。
- SP01改变了重复触发入口，Root需沿T13维护docs/comments.md与dev editor-comments里旧“点击gutter添加”说明；已发送精确替代文案及现有未使用emptyHint的en/zh提案，worker未越权写入。显示图标设置与领域数据保持。
- 设计继续绑定revision3/UI-002，digest49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66；不修改设计digest、不声称18px图像是交互目标达标。
- Root独立high复审、统一产物和浏览器/真实Obsidian是下一入口。用户vault、clipboard、node_modules、Git提交/推送均未触及；正式Evidence/state/index只由Root维护。
