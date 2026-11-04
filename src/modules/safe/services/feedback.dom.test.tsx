import { expect, test } from 'vitest';
import { FeedbackHost } from '../../../host/obsidian/feedback';
import { WriteQueue } from '../../../shared/storage/write-queue';
import { setLanguage } from '../../../shared/i18n';
import { ModuleRegistry } from '../../../app/modules/registry';
import { MANIFESTS } from '../../../app/manifests';
import { SafeService } from './safe-service';
import { CipherRepository } from './cipher-repository';
import { createContainer } from '../platform/crypto';
import { makePayload } from '../core/model';

test('real safe copy failure stays visible after notifications is disabled and leaks no clipboard error', async () => {
	setLanguage('en');
	const registry = new ModuleRegistry(MANIFESTS.filter(manifest => manifest.id === 'notifications'), {
		env: { desktop: true, mobile: false, phone: false }, enabled: () => false,
		createContext: () => { throw new Error('Disabled notifications must not activate'); },
		releaseContext: () => {}, report: () => { throw new Error('Unexpected module error'); },
	});
	await registry.apply(['startup', 'layout-ready']);
	expect(registry.state('notifications')).toBe('off');
	const notices: HTMLElement[] = [];
	const host = new FeedbackHost({
		mount: async () => { throw new Error('No workbench is open'); },
		notice: () => {
			const containerEl = document.createElement('div');
			notices.push(containerEl);
			return { containerEl, setMessage: message => { containerEl.replaceChildren(message); return {} as never; }, hide: () => containerEl.remove() };
		},
	});
	host.bind(window);
	const password = 'test-master';
	const { raw } = await createContainer(password, makePayload([]));
	const files = new Map([['vault.enc', raw], ['vault.enc.backup', raw]]);
	const service = new SafeService({
		repository: new CipherRepository({
			read: async name => files.get(name) ?? null,
			stage: async raw => { files.set('stage', raw); return 'stage'; },
			publish: async (stage, name) => { files.set(name, files.get(stage)!); },
			discard: async name => { files.delete(name); },
		}),
		queue: new WriteQueue(),
		timers: { set: (callback, ms) => window.setTimeout(callback, ms), clear: id => window.clearTimeout(id) },
		actions: () => ({
			clipboard: { readText: async () => '', writeText: async () => { throw new Error('SECRET-CLIPBOARD-ERROR'); } },
			pickBackup: async () => null, pickExport: async () => null, exportCiphertext: async () => {}, openUrl: async () => {},
		}),
	});
	try {
		await service.probe();
		await service.unlock(password);
		await expect(service.copy('SECRET-PASSWORD', window)).rejects.toMatchObject({ code: 'clipboard' });
		expect(notices).toHaveLength(1);
		expect(notices[0]?.textContent).toBe('The clipboard could not be accessed.');
		expect(document.body.innerHTML).not.toContain('SECRET-');
		service.dispose();
		expect(notices[0]?.isConnected).toBe(true);
	} finally {
		service.dispose(); host.dispose(); registry.disposeNow(); setLanguage('zh');
	}
});
