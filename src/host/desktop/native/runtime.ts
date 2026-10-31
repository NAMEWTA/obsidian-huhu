import { Notice } from 'obsidian';
import { registerMessages, t } from '../../../shared/i18n';
import { messages } from '../../../shared/i18n/lazy/native';
import * as path from 'node:path';
import { BinaryError, ensureHelper, type InstallOptions } from './binary';
import { diagnoseCli, exposeCli } from './binary-cli';
import { PtyHelper } from './helper';
import { NativeHost } from './host';
import type { NativeCliState } from '../../../shared/native/host';

/** Called through the app's lazy desktop loader; no module needs to activate for native installation. */
export function createNativeHost(options: () => InstallOptions, win: Window): NativeHost & { cli(options?: { notify?: boolean }): Promise<NativeCliState> } {
	registerMessages(messages);
	const announced = new Set<string>();
	const host = new NativeHost(async events => {
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
	/** Verified, protocol-compatible `huhu`; any other outcome is a state plus one localized notice, never an execution. */
	const cli = async (request?: { notify?: boolean }): Promise<NativeCliState> => {
		const install = options();
		let notice: Notice | undefined;
		try {
			const diagnosis = await diagnoseCli({
				...install,
				progress: state => {
					if (request?.notify === false) return;
					notice?.hide();
					notice = new Notice(t(state === 'downloading' ? 'agent.cli.downloading' : 'agent.cli.verifying'), 0);
				},
			});
			if (diagnosis.state === 'ready') {
				const exposed = await exposeCli(install, diagnosis.path, diagnosis.sha256);
				return { state: 'ready', path: exposed, directory: path.dirname(exposed), text: t('agent.cli.ready', { path: exposed }) };
			}
			return failure(diagnosis.state, diagnosis.reason);
		} catch (error) {
			return failure('unavailable', error instanceof BinaryError ? error.code : 'unknown');
		} finally { notice?.hide(); }
		function failure(state: Exclude<NativeCliState['state'], 'ready'>, reason: string): NativeCliState {
			const text = `${t(`agent.cli.state.${state}`)} ${t(`agent.cli.next.${state}`)}`;
			console.warn('[HUHU command-line tool]', state, reason);
			const key = `${state}|${install.version}`;
			if (request?.notify !== false && !announced.has(key)) {
				announced.add(key);
				new Notice(t('agent.cli.failed', { message: text }), 10_000);
			}
			return { state, reason, text };
		}
	};
	return Object.assign(host, { cli });
}
