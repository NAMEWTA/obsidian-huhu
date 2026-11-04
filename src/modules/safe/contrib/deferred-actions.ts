import type { SafeDesktopActions } from '../platform/desktop/actions';

/** Native dialogs, export validation and clipboard integration are needed only for user actions, never health scans. */
export function deferredSafeActions(vaultRoot: string, owner: Window): SafeDesktopActions {
	let loaded: Promise<SafeDesktopActions> | undefined;
	const load = () => loaded ??= import('../platform/desktop/actions').then(module => module.createDesktopActions(vaultRoot, owner));
	return {
		pickBackup: async () => (await load()).pickBackup(),
		pickExport: async () => (await load()).pickExport(),
		exportCiphertext: async (destination, raw) => (await load()).exportCiphertext(destination, raw),
		openUrl: async url => (await load()).openUrl(url),
		clipboard: {
			readText: async () => (await load()).clipboard.readText(),
			writeText: async value => (await load()).clipboard.writeText(value),
		},
	};
}
