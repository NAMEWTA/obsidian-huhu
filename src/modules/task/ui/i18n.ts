import { registerMessages } from '../../../shared/i18n';

export const messages = {
	en: {
		'task.error.invalid-input': 'Check the task fields and time values.',
		'task.error.not-found': 'The task or related resource was not found.',
		'task.error.conflict': 'A newer version exists. Reopen to review it.',
		'task.error.idempotency-conflict': 'The command ID has already been used with another payload.',
		'task.error.invalid-transition': 'This action is not valid for the current task state.',
		'task.error.schedule-unavailable': 'The scheduling service is unavailable.',
		'task.error.corrupt-store': 'The task store is invalid. It has not been overwritten.',
		'task.error.missing-store': 'The task store was removed. Restore it before writing.',
		'task.error.write-failed': 'Could not save the task. Your draft is retained.',
		'task.error.unavailable': 'The task domain is disabled or unavailable.',
		'task.error.forbidden': 'This tool does not have the required grant.',
		'task.error.cancelled': 'The operation was cancelled.',
	},
	zh: {
		'task.error.invalid-input': '请检查任务字段与时间设置。',
		'task.error.not-found': '任务或关联对象不存在。',
		'task.error.conflict': '已存在更新版本，请重新打开并核对。',
		'task.error.idempotency-conflict': '该命令标识已用于其他操作内容。',
		'task.error.invalid-transition': '当前任务状态不允许此操作。',
		'task.error.schedule-unavailable': '调度服务不可用。',
		'task.error.corrupt-store': '任务库格式损坏，系统未覆盖原文件。',
		'task.error.missing-store': '任务库已被移走或删除，请恢复后再写入。',
		'task.error.write-failed': '任务保存失败，草稿已保留。',
		'task.error.unavailable': '任务领域已停用或不可用。',
		'task.error.forbidden': '此工具缺少所需授权。',
		'task.error.cancelled': '操作已取消。',
	},
};

registerMessages(messages);
