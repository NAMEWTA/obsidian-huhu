import { registerMessages } from '../../../shared/i18n';

export const messages = {
	"en": {
		"home.greeting.overdue": "{count} overdue tasks",
		"home.greeting.tasksUnavailable": "Task summary unavailable",
		"home.greeting.tasksLoading": "Loading tasks…",
		"home.greeting.sessions": "{count} sessions running",
		"home.greeting.sessionsUnavailable": "Session summary unavailable",
		"home.greeting.sessionsLoading": "Loading sessions…",
		"home.greeting.nextAutomation": "Next automation · {name} · {time}",
		"home.greeting.noAutomation": "No upcoming automation",
		"home.greeting.automationsUnavailable": "Automation schedule unavailable",
		"home.layout.edit": "Edit layout",
		"home.layout.done": "Done",
		"home.layout.cancel": "Cancel changes",
		"home.layout.hint": "Drag a handle to move a widget. Drag its lower-right corner to resize.",
		"home.layout.default": "Use default layout",
		"home.greeting.morning": "Good morning",
		"home.greeting.afternoon": "Good afternoon",
		"home.greeting.evening": "Good evening"
	},
	"zh": {
		"home.greeting.overdue": "{count} 项逾期",
		"home.greeting.tasksUnavailable": "任务摘要不可用",
		"home.greeting.tasksLoading": "正在加载任务…",
		"home.greeting.sessions": "{count} 个会话在运行",
		"home.greeting.sessionsUnavailable": "会话摘要不可用",
		"home.greeting.sessionsLoading": "正在加载会话…",
		"home.greeting.nextAutomation": "下个自动化 · {name} · {time}",
		"home.greeting.noAutomation": "暂无待运行自动化",
		"home.greeting.automationsUnavailable": "自动化计划不可用",
		"home.layout.edit": "编辑布局",
		"home.layout.done": "完成",
		"home.layout.cancel": "取消修改",
		"home.layout.hint": "拖动手柄移动小组件，拖动右下角调整尺寸。",
		"home.layout.default": "使用默认布局",
		"home.greeting.morning": "早上好",
		"home.greeting.afternoon": "下午好",
		"home.greeting.evening": "晚上好"
	}
};

registerMessages(messages);
