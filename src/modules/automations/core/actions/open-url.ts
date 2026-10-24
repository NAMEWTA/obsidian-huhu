import { t } from '../../../../shared/i18n';
import { propertiesCodec } from './document';
import type { ActionDefinition } from './definition';

/** A bare host such as `example.com/a` is read as https; anything else is left for the validator. */
export function normalizeUrl(input: string): string {
	const value = input.trim();
	return value && !/\s/.test(value) && !/^[a-z][a-z0-9+.-]*:/i.test(value) ? `https://${value}` : value;
}
export function urlError(input: string): string | undefined {
	const value = normalizeUrl(input);
	if (!value) return t('automation.urlRequired');
	try {
		if (!['http:', 'https:'].includes(new URL(value).protocol)) return t('automation.urlInvalid');
	} catch {
		return t('automation.urlInvalid');
	}
	return undefined;
}

/** Open a web address (http and https only) in the built-in browser. */
export const openUrlAction: ActionDefinition<'open-url'> = {
	kind: 'open-url',
	nameKey: 'automation.open-url',
	scheduled: false,
	desktop: false,
	sourceBound: false,
	create: () => ({ kind: 'open-url', url: '' }),
	text: (action) => action.url,
	setText: (action, value) => {
		action.url = value;
	},
	document: propertiesCodec<'open-url'>({
		section: 'prompt',
		omit: [],
		read: ['url'],
		create: () => ({ kind: 'open-url', url: '' }),
		setText: (action, value) => {
			action.url = value;
		},
	}),
	contentError: (action) => urlError(action.url),
	normalize: (action) => (normalizeUrl(action.url) === action.url ? action : { ...action, url: normalizeUrl(action.url) }),
	run: {
		mode: 'direct',
		execute: async (action, { host }) => {
			await host.openUrl(action.url);
			return { message: '' };
		},
	},
};
