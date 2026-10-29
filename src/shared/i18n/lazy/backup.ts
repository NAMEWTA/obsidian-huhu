/** Backup and restore page strings; registered by the page itself. Keys for the machine codes of `core/backup` are `agent.backup.<kind>.<code>`. */
export const messages = {
	en: {
		'agent.manage.tab.backup': 'Backup',
		'agent.backup.heading': 'Business data backup and restore',
		'agent.backup.intro':
			'A backup is one file with your HUHU workbench records, history notes, usage totals, automation results, notifications and portable agent settings. Native conversation text, logins, secrets and caches are never included.',
		'agent.backup.loading': 'Preparing…',
		'agent.backup.unavailable': 'Backup and restore need the desktop app with the HUHU workbench running.',
		'agent.backup.loadFailed': 'Backup could not be prepared: {message}',

		'agent.backup.export.title': 'Export',
		'agent.backup.export.button': 'Export a backup',
		'agent.backup.export.running': 'Exporting…',
		'agent.backup.export.done': 'Saved to {path}',
		'agent.backup.export.hint':
			'The file holds your business data in readable form and is kept in .huhu/exports/ inside the vault. If the vault is synced or shared, move the file somewhere private.',

		'agent.backup.import.title': 'Import',
		'agent.backup.import.pick': 'Choose a backup file',
		'agent.backup.import.reading': 'Verifying the file…',
		'agent.backup.import.adopt': 'Use the data of device',
		'agent.backup.import.adoptChoose': 'Choose a device…',
		'agent.backup.import.adoptHint':
			'The chosen device becomes this device. Other devices keep their own identity.',
		'agent.backup.import.archives': 'Also restore the other devices as separate archives',
		'agent.backup.import.archiveMissing': 'Import Spaces whose folder is missing here as archived',
		'agent.backup.import.check': 'Check before importing',
		'agent.backup.import.checking': 'Checking…',
		'agent.backup.import.run': 'Import now',
		'agent.backup.import.running': 'Importing…',
		'agent.backup.import.ready':
			'Nothing conflicts. Importing fills empty collections and replaces the matching portable settings (a recovery copy is kept); nothing is started.',
		'agent.backup.import.unchanged': 'This vault already holds everything the file contains.',
		'agent.backup.import.done': 'Imported. {count} files were replaced; nothing was started or sent.',
		'agent.backup.import.steps': '{done} of {total} steps finished',
		'agent.backup.import.plan': 'What will happen',

		'agent.backup.manifest.title': 'Contents of the file',
		'agent.backup.manifest.created': 'Created {date} from “{vault}” (device {device})',
		'agent.backup.manifest.row': '{section} · {device} · {count} · {via}',
		'agent.backup.manifest.items': '{count} items',
		'agent.backup.manifest.noCount': 'whole file',
		'agent.backup.manifest.shared': 'shared',
		'agent.backup.via.live': 'read from the running module',
		'agent.backup.via.offline': 'read from the file (module off or other device)',
		'agent.backup.exclusions.title': 'Not included, on purpose',
		'agent.backup.notes.title': 'Notes',

		'agent.backup.section.settings-agent': 'Agent settings (portable part)',
		'agent.backup.section.workbench-records': 'Spaces, sessions, layouts, mailbox and acknowledgements',
		'agent.backup.section.history-annotations': 'History titles and notes',
		'agent.backup.section.workspace-stats': 'Usage totals',
		'agent.backup.section.automation-sessions': 'Automation session references',
		'agent.backup.section.automation-runtime': 'Automation runs, invocations and results',
		'agent.backup.section.notifications-inbox': 'Notifications, read state and delivery receipts',
		'agent.backup.section.automation-definition': 'Automation definitions',

		'agent.backup.exclusion.native-transcripts': 'Provider conversation text (Claude, Codex, …)',
		'agent.backup.exclusion.account-credentials': 'Logins and account folders',
		'agent.backup.exclusion.env-values': 'Environment variable values',
		'agent.backup.exclusion.launch-arguments': 'Launch arguments (they can contain tokens)',
		'agent.backup.exclusion.caches': 'Caches and search indexes',
		'agent.backup.exclusion.endpoints-locks': 'Running endpoints, locks and live terminals',
		'agent.backup.exclusion.browser-data': 'Browser cookies, history and downloads',
		'agent.backup.exclusion.helper-binaries': 'Helper programs and command line tools',
		'agent.backup.exclusion.yolo-acknowledgement': 'Your YOLO confirmation (asked again on first use)',
		'agent.backup.exclusion.machine-paths': 'Program, shell and skill folder paths of this machine',
		'agent.backup.exclusion.directory-grants': 'Folder permissions outside the vault (authorize them again)',
		'agent.backup.exclusion.legacy-stats': 'The retired statistics file',
		'agent.backup.exclusion.sources-notes': 'The notes and files that automations point to',

		'agent.backup.note.definition-extra-files': '{count} extra files next to definitions were left out.',
		'agent.backup.note.other-devices-not-enumerated':
			'This host cannot list devices; only this device was exported.',
		'agent.backup.note.section-absent': 'Nothing stored yet: {section}.',
		'agent.backup.note.settings-fields-omitted': 'Some settings fields were left out.',

		'agent.backup.action.create': 'will be created',
		'agent.backup.action.replace-empty': 'replaces an empty collection',
		'agent.backup.action.merge': 'portable settings replace the matching ones in yours (recovery copy kept)',
		'agent.backup.action.unchanged': 'already identical',
		'agent.backup.action.archive': 'kept as an archive of another device',
		'agent.backup.outcome': '{section}: {action}',

		'agent.backup.problem.adopt-device-required': 'Choose which device’s data becomes this device.',
		'agent.backup.problem.adopt-device-unknown': 'The device {device} is not in this file.',
		'agent.backup.problem.device-collision':
			'The device {device} is this device; it cannot also be restored as an archive.',
		'agent.backup.problem.section-invalid': 'The file’s {section} is not valid ({subject}). Nothing was changed.',
		'agent.backup.problem.identity-collision':
			'This vault already has different data in {subject}. HUHU never merges or overwrites it. Move the existing data away, then check again.',
		'agent.backup.problem.definition-collision':
			'An automation named “{subject}” already exists with different content.',
		'agent.backup.problem.records-needs-desktop': 'Spaces can only be restored in the desktop app.',
		'agent.backup.problem.directory-missing':
			'The folder for a Space does not exist here ({subject}). Restore your notes first, or choose to import such Spaces as archived.',
		'agent.backup.problem.target-unreadable': 'A file here could not be read ({subject}). Nothing was changed.',
		'agent.backup.problem.settings-owner-missing': 'Settings are not available right now.',
		'agent.backup.problem.nothing-selected': 'There is nothing to import with these choices.',

		'agent.backup.warning.permission-raise-skipped':
			'{count} permission settings asked for YOLO; they were kept as they are here. Turn YOLO on yourself if you want it.',
		'agent.backup.warning.directory-reauthorize':
			'The folder of Space “{subject}” is outside the vault. Authorize it again on this machine.',
		'agent.backup.warning.space-archived-missing-directory':
			'Space “{subject}” was imported as archived because its folder is missing here.',
		'agent.backup.warning.automations-disabled':
			'{count} automations were enabled in the file. They arrive disabled; enable the ones you still want.',
		'agent.backup.warning.runs-demoted':
			'{count} runs were still active in the file. They are kept as interrupted history; nothing is resumed.',
		'agent.backup.warning.settings-damaged-replaced':
			'The settings file here was unreadable and is replaced; the old bytes stay in the recovery copies.',
		'agent.backup.warning.other-device-settings-skipped':
			'Settings of device {subject} are not restored (they belong to that machine).',

		'agent.backup.warning.step-file-changed':
			'{subject} was changed after this import wrote it. It was left exactly as it is.',
		'agent.backup.warning.step-file-missing':
			'{subject} was removed after this import wrote it. It was not created again.',
		'agent.backup.failure.title': 'The backup action did not finish',
		'agent.backup.failure.code': 'Reason: {message} ({code})',
		'agent.backup.failure.retry': 'Try again',
		'agent.backup.failure.copies':
			'Every replaced file has a verified copy in .huhu/recovery/transaction/. If HUHU asks to restart, restart Obsidian: the next start finishes or undoes the change.',
		'agent.backup.failure.resume':
			'Finished steps stay finished. Running the same import again continues after them.',

		'agent.backup.error.busy': 'Stop the running work first: {busy}.',
		'agent.backup.error.quiesce-failed': 'Part of HUHU could not pause for the operation.',
		'agent.backup.error.drain-failed': 'Part of HUHU could not finish saving ({owner}); nothing was changed.',
		'agent.backup.error.source-invalid':
			'A stored collection ({section}) cannot be read as valid data, so the backup was not made.',
		'agent.backup.error.source-unavailable': 'A collection is not available on this host.',
		'agent.backup.error.source-drift': 'Something changed the data while it was being read. Try again.',
		'agent.backup.error.preflight-failed': 'The import was refused before changing anything.',
		'agent.backup.error.package-invalid': 'This file is not a usable backup.',
		'agent.backup.error.write-failed': 'The disk refused a write. The previous data was restored.',
		'agent.backup.error.adopt-failed': 'The change was saved but HUHU could not reload it. Restart Obsidian.',
		'agent.backup.error.recovery-pending':
			'An earlier change is still being finished. Restart Obsidian, then try again.',
		'agent.backup.error.unrecoverable': 'HUHU stopped to protect your data. Restart Obsidian.',
		'agent.backup.error.partial-import': 'The import stopped after {done} of {total} steps.',
		'agent.backup.error.unexpected': 'Something unexpected happened.',
		'agent.backup.package.not-json': 'The file is not a HUHU backup (it is not readable text data).',
		'agent.backup.package.too-large': 'The file is too large to be a HUHU backup.',
		'agent.backup.package.wrong-format': 'The file is not a HUHU backup.',
		'agent.backup.package.unsupported-version':
			'This backup was made by a newer or unknown version ({version}) and is not imported.',
		'agent.backup.package.invalid-structure': 'The backup file is damaged or was edited ({field}).',
		'agent.backup.package.duplicate-identity': 'The backup file lists the same data twice.',
		'agent.backup.package.entry-digest-mismatch':
			'The backup file is damaged: a collection does not match its digest.',
		'agent.backup.package.digest-mismatch': 'The backup file is damaged or was edited: its digest does not match.',

		'agent.backup.report.title': 'Last import',
		'agent.backup.report.status.done': 'Finished.',
		'agent.backup.report.status.partial': 'Stopped part-way. Run the same import again to continue.',
		'agent.backup.report.status.failed': 'Did not change anything ({code}).',
		'agent.backup.report.disabled': 'Automations that were enabled before and are now off:',
		'agent.backup.report.reauthorize': 'Folders to authorize again:',
		'agent.backup.report.none': 'No import has been run in this vault.',
	},
	zh: {
		'agent.manage.tab.backup': '备份',
		'agent.backup.heading': '业务数据备份与恢复',
		'agent.backup.intro':
			'备份是一个文件，包含 HUHU 工作台记录、历史备注、用量统计、自动化结果、通知以及可携带的智能体设置。各 Provider 的原生对话全文、登录凭证、密钥和缓存永远不会被包含。',
		'agent.backup.loading': '正在准备…',
		'agent.backup.unavailable': '备份与恢复需要桌面版，并且 HUHU 工作台已在运行。',
		'agent.backup.loadFailed': '无法准备备份功能：{message}',

		'agent.backup.export.title': '导出',
		'agent.backup.export.button': '导出备份',
		'agent.backup.export.running': '正在导出…',
		'agent.backup.export.done': '已保存到 {path}',
		'agent.backup.export.hint':
			'文件以可读形式保存你的业务数据，位于仓库内的 .huhu/exports/。如果仓库会同步或共享，请把文件移到私密位置。',

		'agent.backup.import.title': '导入',
		'agent.backup.import.pick': '选择备份文件',
		'agent.backup.import.reading': '正在校验文件…',
		'agent.backup.import.adopt': '采用以下设备的数据',
		'agent.backup.import.adoptChoose': '选择设备…',
		'agent.backup.import.adoptHint': '所选设备的数据将成为本设备的数据，其他设备保持各自身份。',
		'agent.backup.import.archives': '同时把其他设备恢复为独立归档',
		'agent.backup.import.archiveMissing': '将目录在本机缺失的空间导入为已归档',
		'agent.backup.import.check': '导入前检查',
		'agent.backup.import.checking': '正在检查…',
		'agent.backup.import.run': '立即导入',
		'agent.backup.import.running': '正在导入…',
		'agent.backup.import.ready':
			'没有冲突。导入只会填充空的数据集，并替换同名的可携带设置（保留恢复副本），不会启动任何东西。',
		'agent.backup.import.unchanged': '本仓库已包含文件中的全部内容。',
		'agent.backup.import.done': '导入完成，共替换 {count} 个文件；没有启动或发送任何东西。',
		'agent.backup.import.steps': '已完成 {done} / {total} 步',
		'agent.backup.import.plan': '将要发生的事',

		'agent.backup.manifest.title': '文件内容',
		'agent.backup.manifest.created': '创建于 {date}，来自“{vault}”（设备 {device}）',
		'agent.backup.manifest.row': '{section} · {device} · {count} · {via}',
		'agent.backup.manifest.items': '{count} 项',
		'agent.backup.manifest.noCount': '整份文件',
		'agent.backup.manifest.shared': '共享',
		'agent.backup.via.live': '来自运行中的模块',
		'agent.backup.via.offline': '直接读取文件（模块关闭或其他设备）',
		'agent.backup.exclusions.title': '特意不包含',
		'agent.backup.notes.title': '说明',

		'agent.backup.section.settings-agent': '智能体设置（可携带部分）',
		'agent.backup.section.workbench-records': '空间、会话、布局、邮箱与确认记录',
		'agent.backup.section.history-annotations': '历史标题与备注',
		'agent.backup.section.workspace-stats': '用量统计',
		'agent.backup.section.automation-sessions': '自动化会话引用',
		'agent.backup.section.automation-runtime': '自动化运行、调用与结果',
		'agent.backup.section.notifications-inbox': '通知、已读状态与投递回执',
		'agent.backup.section.automation-definition': '自动化定义',

		'agent.backup.exclusion.native-transcripts': 'Provider 对话全文（Claude、Codex 等）',
		'agent.backup.exclusion.account-credentials': '登录凭证与账号目录',
		'agent.backup.exclusion.env-values': '环境变量的值',
		'agent.backup.exclusion.launch-arguments': '启动参数（可能含令牌）',
		'agent.backup.exclusion.caches': '缓存与检索索引',
		'agent.backup.exclusion.endpoints-locks': '运行中的端点、锁与终端',
		'agent.backup.exclusion.browser-data': '浏览器 Cookie、历史与下载',
		'agent.backup.exclusion.helper-binaries': '辅助程序与命令行工具',
		'agent.backup.exclusion.yolo-acknowledgement': '你的 YOLO 确认（首次使用时重新询问）',
		'agent.backup.exclusion.machine-paths': '本机的程序、Shell 与技能目录路径',
		'agent.backup.exclusion.directory-grants': '仓库外目录的授权（需要重新授权）',
		'agent.backup.exclusion.legacy-stats': '已退役的统计文件',
		'agent.backup.exclusion.sources-notes': '自动化所指向的笔记与文件',

		'agent.backup.note.definition-extra-files': '定义旁的 {count} 个额外文件未包含。',
		'agent.backup.note.other-devices-not-enumerated': '当前环境无法列出设备，只导出了本设备。',
		'agent.backup.note.section-absent': '尚无数据：{section}。',
		'agent.backup.note.settings-fields-omitted': '部分设置字段未包含。',

		'agent.backup.action.create': '将新建',
		'agent.backup.action.replace-empty': '替换空的数据集',
		'agent.backup.action.merge': '可携带设置会替换你设置中的同名项（保留恢复副本）',
		'agent.backup.action.unchanged': '已完全一致',
		'agent.backup.action.archive': '作为其他设备的归档保留',
		'agent.backup.outcome': '{section}：{action}',

		'agent.backup.problem.adopt-device-required': '请选择哪台设备的数据成为本设备的数据。',
		'agent.backup.problem.adopt-device-unknown': '文件中没有设备 {device}。',
		'agent.backup.problem.device-collision': '设备 {device} 就是本设备，不能同时恢复为归档。',
		'agent.backup.problem.section-invalid': '文件中的“{section}”无效（{subject}）。未做任何更改。',
		'agent.backup.problem.identity-collision':
			'本仓库的 {subject} 已有不同的数据。HUHU 不会合并或覆盖。请先移走现有数据，再重新检查。',
		'agent.backup.problem.definition-collision': '已存在内容不同的自动化“{subject}”。',
		'agent.backup.problem.records-needs-desktop': '空间只能在桌面版中恢复。',
		'agent.backup.problem.directory-missing':
			'某个空间的目录在本机不存在（{subject}）。请先恢复你的笔记，或选择把这类空间导入为已归档。',
		'agent.backup.problem.target-unreadable': '本机的一个文件无法读取（{subject}）。未做任何更改。',
		'agent.backup.problem.settings-owner-missing': '设置当前不可用。',
		'agent.backup.problem.nothing-selected': '按这些选择没有可导入的内容。',

		'agent.backup.warning.permission-raise-skipped':
			'{count} 项权限设置要求 YOLO，已保持本机现状。如需 YOLO 请自行开启。',
		'agent.backup.warning.directory-reauthorize': '空间“{subject}”的目录在仓库外，请在本机重新授权。',
		'agent.backup.warning.space-archived-missing-directory': '空间“{subject}”的目录在本机缺失，已导入为已归档。',
		'agent.backup.warning.automations-disabled':
			'文件中有 {count} 个自动化原本是启用的。它们以停用状态到达，请只启用仍需要的。',
		'agent.backup.warning.runs-demoted':
			'文件中有 {count} 个运行仍处于活动状态，已作为“已中断”的历史保存，不会恢复运行。',
		'agent.backup.warning.settings-damaged-replaced': '本机的设置文件无法读取，将被替换；旧内容保留在恢复副本中。',
		'agent.backup.warning.other-device-settings-skipped': '设备 {subject} 的设置不会恢复（它属于那台机器）。',

		'agent.backup.warning.step-file-changed': '{subject} 在本次导入写入后被改动过，已保持现状不动。',
		'agent.backup.warning.step-file-missing': '{subject} 在本次导入写入后被删除，不会重新创建。',
		'agent.backup.failure.title': '备份操作未完成',
		'agent.backup.failure.code': '原因：{message}（{code}）',
		'agent.backup.failure.retry': '重试',
		'agent.backup.failure.copies':
			'每个被替换的文件都在 .huhu/recovery/transaction/ 有已校验的副本。如果 HUHU 提示重启，请重启 Obsidian：下次启动会完成或撤销该更改。',
		'agent.backup.failure.resume': '已完成的步骤保持完成；再次运行同一导入会从中断处继续。',

		'agent.backup.error.busy': '请先停止正在运行的工作：{busy}。',
		'agent.backup.error.quiesce-failed': 'HUHU 的某个部分无法暂停以进行此操作。',
		'agent.backup.error.drain-failed': 'HUHU 的某个部分未能完成保存（{owner}），未做任何更改。',
		'agent.backup.error.source-invalid': '已存数据集（{section}）无法作为有效数据读取，因此未生成备份。',
		'agent.backup.error.source-unavailable': '当前环境无法取得某个数据集。',
		'agent.backup.error.source-drift': '读取期间数据被改动了，请重试。',
		'agent.backup.error.preflight-failed': '导入在改动任何数据之前就被拒绝。',
		'agent.backup.error.package-invalid': '这个文件不是可用的备份。',
		'agent.backup.error.write-failed': '磁盘拒绝了一次写入，已恢复原有数据。',
		'agent.backup.error.adopt-failed': '更改已保存，但 HUHU 无法重新加载。请重启 Obsidian。',
		'agent.backup.error.recovery-pending': '上一次更改仍在完成中。请重启 Obsidian 后再试。',
		'agent.backup.error.unrecoverable': 'HUHU 为保护数据已停止。请重启 Obsidian。',
		'agent.backup.error.partial-import': '导入在第 {done} / {total} 步后停止。',
		'agent.backup.error.unexpected': '发生了意外情况。',
		'agent.backup.package.not-json': '该文件不是 HUHU 备份（不是可读的文本数据）。',
		'agent.backup.package.too-large': '文件过大，不可能是 HUHU 备份。',
		'agent.backup.package.wrong-format': '该文件不是 HUHU 备份。',
		'agent.backup.package.unsupported-version': '该备份来自更新或未知的版本（{version}），不会导入。',
		'agent.backup.package.invalid-structure': '备份文件已损坏或被编辑过（{field}）。',
		'agent.backup.package.duplicate-identity': '备份文件把同一数据列了两次。',
		'agent.backup.package.entry-digest-mismatch': '备份文件已损坏：某个数据集与其摘要不符。',
		'agent.backup.package.digest-mismatch': '备份文件已损坏或被编辑过：摘要不符。',

		'agent.backup.report.title': '上次导入',
		'agent.backup.report.status.done': '已完成。',
		'agent.backup.report.status.partial': '中途停止。再次运行同一导入即可继续。',
		'agent.backup.report.status.failed': '没有改动任何数据（{code}）。',
		'agent.backup.report.disabled': '以下自动化原本启用，现在是停用状态：',
		'agent.backup.report.reauthorize': '需要重新授权的目录：',
		'agent.backup.report.none': '此仓库还没有运行过导入。',
	},
};
