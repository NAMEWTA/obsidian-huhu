import type { BrowserWorkspace } from '../api';
export async function browserSettingsPage(api: BrowserWorkspace, openWorkspace: () => Promise<void>) {
	return (await import('./settings/BrowserSettings')).browserSettingsPage(api, openWorkspace);
}
