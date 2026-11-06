import type { App } from 'obsidian';
import { createElement } from 'react';
import type { VaultDevice } from '../shared/storage/vault-identity';
import { registerMessages, t } from '../shared/i18n';
import { messages } from '../shared/i18n/lazy/common';
import { dialogOwner, openReactDialog } from '../ui/react/dialog';
import { DeviceChoiceContent } from './device-choice-content';
registerMessages(messages);
/** This module is loaded only for explicit vault-device selection; cancellation never chooses a default. */
export function chooseVaultDevice(
	app: App,
	devices: readonly VaultDevice[],
	signal: AbortSignal,
): Promise<string | { label: string }> {
	if (signal.aborted) return Promise.reject(new Error(t('storage.deviceCancelled')));
	return new Promise((resolve, reject) => {
		let settled = false;
		let dialog: ReturnType<typeof openReactDialog> | undefined;
		const cancelled = () => {
			if (settled) return;
			settled = true;
			signal.removeEventListener('abort', abort);
			reject(new Error(t('storage.deviceCancelled')));
		};
		const abort = () => {
			cancelled();
			dialog?.close();
		};
		signal.addEventListener('abort', abort, { once: true });
		try {
			dialog = openReactDialog(dialogOwner(app), {
				title: t('storage.chooseDevice'),
				description: t('storage.deviceChoiceHint'),
				content: (close) =>
					createElement(DeviceChoiceContent, {
						devices,
						onChoose: (value) => {
							if (settled || signal.aborted) return;
							settled = true;
							signal.removeEventListener('abort', abort);
							resolve(value);
							close();
						},
						onCancel: close,
					}),
				onClose: cancelled,
			});
		} catch (error) {
			settled = true;
			signal.removeEventListener('abort', abort);
			reject(error instanceof Error ? error : new Error(String(error)));
			return;
		}
		if (signal.aborted) abort();
	});
}
