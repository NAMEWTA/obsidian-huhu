import { Notice } from 'obsidian';
import { registerMessages, t } from '../../../shared/i18n';
import { messages } from '../../../shared/i18n/lazy/native';
import { BinaryError, ensureHelper, type InstallOptions } from './binary';
import { PtyHelper } from './helper';
import { NativeHost } from './host';

/** Called through the app's lazy desktop loader; no module needs to activate for native installation. */
export function createNativeHost(options: () => InstallOptions, win: Window): NativeHost {
	registerMessages(messages);
	return new NativeHost(async events => {
		let notice: Notice | undefined;
		try {
			const binary = await ensureHelper({
				...options(),
				progress: state => {
					notice?.hide();
					notice = new Notice(t(state === 'downloading' ? 'agent.helper.downloading' : 'agent.helper.verifying'), 0);
				},
			});
			return await PtyHelper.start(binary, events, win, {});
		} catch (error) {
			const message = error instanceof BinaryError
				? t(error.code === 'http' && error.detail?.status === 404 ? 'agent.helper.unpublished' : `agent.helper.${error.code}`, {
					status: error.detail?.status ?? 0, version: options().version,
				})
				: error instanceof Error ? error.message : String(error);
			if (error instanceof BinaryError) console.warn('[HUHU native helper]', error.code, error.detail);
			new Notice(t('agent.helper.failed', { message }), 10_000);
			throw error;
		} finally { notice?.hide(); }
	});
}
