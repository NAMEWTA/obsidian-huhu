/** Legacy workbench import report and recovery notices; registered only when the report, the import or a notice needs them. */
export const messages = {
	en: {
		'agent.manage.tab.import': 'Legacy import',
		'agent.migration.heading': 'Legacy workbench import',
		'agent.migration.spaceName': 'Import Space · Legacy workbench',
		'agent.migration.loading': 'Reading the import report…',
		'agent.migration.loadFailed': 'The import report could not be read: {message}',
		'agent.migration.empty': 'No legacy workbench data was found.',
		'agent.migration.layout':
			'Imported {tabs} tabs in {groups} groups ({terminal} terminal, {browser} web, {page} page) into the Import Space.',
		'agent.migration.layoutKept': 'The old layout is {status}; it was kept unchanged.',
		'agent.migration.status.empty': 'empty',
		'agent.migration.status.corrupt': 'damaged',
		'agent.migration.status.unsupported-version': 'from a newer version',
		'agent.migration.status.absent': 'missing',
		'agent.migration.browserNote': 'Web tabs are in the Import Space; select it to see them in Browser.',
		'agent.migration.annotations':
			'{unattributable} of {total} history annotations have no known account; they were kept as a copy, not merged.',
		'agent.migration.accountIndex': 'The retired account index was left in place and not read.',
		'agent.migration.sourceChanged': 'The old layout file changed after the import; it was not imported again.',
		'agent.migration.unbound':
			'Old automation and shortcut definitions stay unbound; choose a Space for each before saving or running.',
		'agent.migration.rollback':
			'Nothing was deleted; recovery copies are in .huhu/recovery/transaction/. To go back, quit Obsidian, back up .huhu/terminal-agent, then install the older HUHU.',
		'agent.migration.blocked':
			'HUHU stopped to protect your data after an interrupted operation. Fully quit and restart Obsidian: the next start finishes or undoes it. If this appears again, restore manually from the copies in .huhu/recovery/transaction/<operation>/.',
		'agent.migration.busy':
			'Another HUHU window is using the workbench data; the import will run at the next start.',

		'agent.migration.problem.scope':
			'The import was not done because the identity of this vault changed (copied or moved?). Nothing was changed. Open the vault from its original location, or move workbench-v2.json and workbench-v2.json.backup out of .huhu/terminal-agent/ and restart to import into fresh records.',
		'agent.migration.problem.records':
			'The import was not done because workbench-v2.json is missing, damaged or from a newer version. Nothing was changed. Restore it from .huhu/recovery/transaction/, or move it and its .backup out of .huhu/terminal-agent/, then restart.',
		'agent.migration.problem.marker':
			'legacy-import.json is unreadable, so the import state is unknown. Nothing was changed. Fix or delete that file (the legacy files and recovery copies stay) and restart.',
		'agent.migration.problem.busy':
			'Another HUHU window is using the workbench data, so the import was postponed. Close the other windows and restart.',
		'agent.migration.problem.failed':
			'The import failed and was rolled back ({code}); your data is unchanged. Restart HUHU. If it repeats, keep .huhu/recovery/transaction/ for support.',
		'agent.migration.problem.pending':
			'Legacy data was found but has not been imported yet. Restart HUHU to import it.',
		'agent.migration.reimport':
			'To import again after repairing workspace.json: quit Obsidian, delete legacy-import.json next to it, then start HUHU.',
	},
	zh: {
		'agent.manage.tab.import': '旧数据导入',
		'agent.migration.heading': '旧工作台导入',
		'agent.migration.spaceName': '导入空间 · 旧工作台',
		'agent.migration.loading': '正在读取导入报告…',
		'agent.migration.loadFailed': '无法读取导入报告：{message}',
		'agent.migration.empty': '未发现旧工作台数据。',
		'agent.migration.layout':
			'已将 {groups} 个分组中的 {tabs} 个标签（终端 {terminal}、网页 {browser}、页面 {page}）导入到导入空间。',
		'agent.migration.layoutKept': '旧布局{status}，已原样保留。',
		'agent.migration.status.empty': '为空',
		'agent.migration.status.corrupt': '已损坏',
		'agent.migration.status.unsupported-version': '来自更新版本',
		'agent.migration.status.absent': '不存在',
		'agent.migration.browserNote': '网页标签在导入空间中，选中该空间即可在浏览器里看到。',
		'agent.migration.annotations': '{total} 条历史标注中有 {unattributable} 条无已知账号，只保留副本，未合并。',
		'agent.migration.accountIndex': '已退役的账号索引原地保留，未读取。',
		'agent.migration.sourceChanged': '导入之后旧布局文件又变了，不会再次导入。',
		'agent.migration.unbound': '旧的自动化和快捷定义保持未绑定；保存或运行前请为每项选择 Space。',
		'agent.migration.rollback':
			'没有删除任何内容，恢复副本在 .huhu/recovery/transaction/。要回退：先退出 Obsidian，备份 .huhu/terminal-agent，再安装旧版 HUHU。',
		'agent.migration.blocked':
			'HUHU 在一次被中断的操作之后停止运行以保护你的数据。请完全退出并重新启动 Obsidian：下次启动会完成或撤销该操作。若再次出现，请从 .huhu/recovery/transaction/<操作>/ 里的副本手动恢复。',
		'agent.migration.busy': '另一个 HUHU 窗口正在使用工作台数据，导入将在下次启动时进行。',
		'agent.migration.problem.scope':
			'没有导入：这个库的身份变了（是否被复制或移动？）。没有改动任何内容。请从原位置打开该库，或把 workbench-v2.json 和 workbench-v2.json.backup 移出 .huhu/terminal-agent/ 后重启，以导入到全新记录。',
		'agent.migration.problem.records':
			'没有导入：workbench-v2.json 缺失、已损坏或来自更新版本。没有改动任何内容。请从 .huhu/recovery/transaction/ 恢复它，或把它及其 .backup 移出 .huhu/terminal-agent/ 后重启。',
		'agent.migration.problem.marker':
			'legacy-import.json 无法读取，导入状态未知。没有改动任何内容。请修复或删除该文件（旧文件和恢复副本保留）后重启。',
		'agent.migration.problem.busy': '另一个 HUHU 窗口正在使用工作台数据，导入已推迟。请关闭其他窗口后重启。',
		'agent.migration.problem.failed':
			'导入失败并已回滚（{code}），你的数据没有改变。请重启 HUHU；若反复出现，请保留 .huhu/recovery/transaction/ 以便排查。',
		'agent.migration.problem.pending': '发现旧数据但尚未导入。请重启 HUHU 以导入。',
		'agent.migration.reimport':
			'修复 workspace.json 后要重新导入：退出 Obsidian，删除同目录的 legacy-import.json，再启动 HUHU。',
	},
};
