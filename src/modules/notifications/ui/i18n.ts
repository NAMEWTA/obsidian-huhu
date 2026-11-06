import { registerMessages } from '../../../shared/i18n';

export const messages = {
	en: {
		"notification.search": "Search notifications",
		"notification.category": "Source",
		"notification.categoryAll": "All sources",
		"notification.previous": "Previous page",
		"notification.next": "Next page",
		"notification.page": "Page {page} of {total}",
	},
	zh: {
		"notification.search": "搜索通知",
		"notification.category": "来源",
		"notification.categoryAll": "全部来源",
		"notification.previous": "上一页",
		"notification.next": "下一页",
		"notification.page": "第 {page} 页，共 {total} 页",
	},
};

registerMessages(messages);
