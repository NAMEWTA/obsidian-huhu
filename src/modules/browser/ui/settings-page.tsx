import type { BrowserWorkspaceApi } from '../api';
export async function browserSettingsPage(api: BrowserWorkspaceApi, openWorkspace: () => Promise<void>) {
	return (await import('./settings/BrowserSettings')).browserSettingsPage(api, openWorkspace);
}
