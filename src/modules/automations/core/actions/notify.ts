import { t } from '../../../../shared/i18n';
import { propertiesCodec } from './document';
import type { ActionDefinition } from './definition';

/** A reminder: a message delivered through the notification channels of the automation. */
export const notifyAction: ActionDefinition<'notify'> = {
	kind: 'notify',
	nameKey: 'automation.notify',
	scheduled: true,
	desktop: false,
	sourceBound: true,
	create: ({ text }) => ({ kind: 'notify', body: text }),
	text: (action) => action.body,
	setText: (action, value) => {
		action.body = value;
	},
	document: propertiesCodec<'notify'>({
		section: 'prompt',
		omit: ['body'],
		read: [],
		create: ({ text }) => ({ kind: 'notify', body: text }),
		setText: (action, value) => {
			action.body = value;
		},
	}),
	contentError: (action) => (action.body.trim() ? undefined : t('automation.contentRequired')),
	settingsError: (_action, check) => (check.channels.length ? undefined : t('automation.channelsRequired')),
	notice: (action) => action.body,
	// Delivery is the notification every run already ends with; the action itself has nothing left to do.
	run: { mode: 'direct', execute: () => Promise.resolve({ message: '' }) },
};
