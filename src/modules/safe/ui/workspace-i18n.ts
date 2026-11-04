import { registerMessages } from '../../../shared/i18n';

/** Page-only labels stay behind the workbench loader, outside the safe command activation budget. */
export const messages = {
	en: {
		'safe.workspace.scope': 'Scope and tags',
		'safe.workspace.all': 'All entries',
		'safe.workspace.favorites': 'Favorites · favorite',
		'safe.workspace.details': 'Account details',
		'safe.workspace.select': 'Select an account to view details',
		'safe.workspace.id': 'Account ID',
		'safe.workspace.edit': 'Edit entry',
	},
	zh: {
		'safe.workspace.scope': '范围与标签',
		'safe.workspace.all': '全部条目',
		'safe.workspace.favorites': '收藏 · favorite',
		'safe.workspace.details': '账号详情',
		'safe.workspace.select': '选择账号以查看详情',
		'safe.workspace.id': '账号 ID',
		'safe.workspace.edit': '编辑条目',
	},
};
registerMessages(messages);
