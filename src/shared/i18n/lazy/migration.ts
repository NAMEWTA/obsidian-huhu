/** Notice shown when start-up recovery of an interrupted multi-file operation is blocked. */
export const messages = {
	en: {
		'agent.migration.blocked':
			'HUHU stopped to protect your data after an interrupted operation. Fully quit and restart Obsidian: the next start finishes or undoes it. If this appears again, restore manually from the copies in .huhu/recovery/transaction/<operation>/.',
	},
	zh: {
		'agent.migration.blocked':
			'HUHU 在一次被中断的操作之后停止运行以保护你的数据。请完全退出并重新启动 Obsidian：下次启动会完成或撤销该操作。若再次出现，请从 .huhu/recovery/transaction/<操作>/ 里的副本手动恢复。',
	},
};
