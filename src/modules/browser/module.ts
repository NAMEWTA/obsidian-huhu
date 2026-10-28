import { Notice } from 'obsidian';
import type { ModuleContext, ModuleInstance } from '../../app/contracts/module';
import { AGENT_SESSIONS, AGENT_BROWSER_TABS } from '../agent/api';
import { BROWSER_HOST, BROWSER_OPEN, BROWSER_PROFILES, type BrowserOpener } from './api';
import { BrowserEngine } from './services/host';
import { observeNoteLinks } from './platform/note-links';
import { browserSettings } from './settings';
import { registerMessages, t } from '../../shared/i18n';
import { messages as shared } from '../../shared/i18n/lazy/browser';
import { messages } from './i18n';
import type { SharedBrowserTab, SharedWorkspaceOwner } from '../../app/contracts/shared-workspace';
registerMessages(shared);
registerMessages(messages);
export default function createBrowserModule(context: ModuleContext): ModuleInstance {
	const settings = context.settings.bind('browser', browserSettings);
	let host: BrowserEngine | undefined;
	let sharedWorkspace: SharedWorkspaceOwner | undefined;
	const current = () => {
		if (!host) throw new Error(t('browser.browser_disabled'));
		return host;
	};
	const open: BrowserOpener = {
		open: async (request) => {
			const pageId = await current().workspace.open(request.url, request.profileId, request.reuse);
			if (typeof context.shell.open === 'function')
				await context.shell.open({ feature: 'browser', resourceId: pageId });
			return pageId;
		},
		show: async (request) => {
			try {
				await open.open(request);
			} catch (error) {
				new Notice(String(error));
			}
		},
	};
	return {
		get services() {
			return host
				? [
						[BROWSER_HOST, host] as const,
						[BROWSER_OPEN, open] as const,
						[
							BROWSER_PROFILES,
							{
								list: () => current().profiles.getState().profiles,
								create: (name: string) => current().createProfile(name),
								rename: (id: string, name: string) => current().renameProfile(id, name),
								affectedPages: (id: string) => current().affectedPages(id),
								remove: (id: string, pages: readonly string[]) => current().deleteProfile(id, pages),
								subscribe: (fn: () => void) => current().profiles.subscribe(fn),
							},
						] as const,
					]
				: [];
		},
		pages: {
			browser: async () => {
				const { createBrowserPage } = await import('./ui/workbench-page');
				if (!sharedWorkspace) throw new Error(t('browser.browser_agent_unavailable'));
				return async (ctx, target) => createBrowserPage(current(), sharedWorkspace!.browser, ctx, target);
			},
		},
		settingsPage: async () => (await import('./ui/settings-page')).browserSettingsPage(current()),
		async activate() {
			if (!context.env.desktop) return;
			sharedWorkspace = context.sharedWorkspace ?? (await context.ensureSharedWorkspace?.());
			const shared = sharedWorkspace;
			if (shared) await shared.ready;
			const workspace = shared
				? {
						open: async (url?: string, profileId?: string, reuse?: boolean) => {
							await shared.ready;
							const page = host?.createPage({ url, profileId });
							if (!page) throw new Error(t('browser.browser_disabled'));
							const tab: SharedBrowserTab = {
								id: `tab-${crypto.randomUUID()}`,
								pageId: page.id,
								title: page.title,
								url: page.url,
								profileId: page.profileId,
								zoom: 1,
								createdAt: Date.now(),
							};
							try {
								const pageId = await shared.browser.open(tab, { reuse });
								if (pageId !== page.id) host?.disposePage(page.id);
								return pageId;
							} catch (error) {
								host?.disposePage(page.id);
								throw error;
							}
						},
						close: async (id: string) => {
							await shared.browser.close(id);
							host?.disposePage(id);
						},
						list: () => shared.browser.list(),
						activate: (id: string) => shared.browser.activate(id),
					}
				: {
						// Production always provides the shared workspace. The old fallback that reached the Agent module's
						// `agent.browser-tabs` service had no remaining caller; without the shared owner pages are unavailable.
						open: () => Promise.reject(new Error(t('browser.browser_agent_unavailable'))),
						list: () => [],
						close: async () => {},
						activate: () => {},
					};
			host = new BrowserEngine(
				context.app,
				settings,
				{
					list: async (pageId) => {
						const sessions = (await context.services.peek(AGENT_SESSIONS)?.list()) ?? [];
						const local = pageId
							? (context.services.peek(AGENT_BROWSER_TABS)?.sessionOrder(pageId) ?? [])
							: [];
						return sessions.sort((a, b) => Number(local.includes(b.id)) - Number(local.includes(a.id)));
					},
					attach: async (id, text, files) => {
						const sessions = context.services.peek(AGENT_SESSIONS);
						if (!sessions) throw new Error(t('browser.browser_agent_unavailable'));
						await sessions.attachMaterial(id, { title: t('browser.contextMaterial'), text, files });
					},
				},
				workspace,
				context.native,
				async (page) => (await import('./ui/chrome-loader')).browserChrome(current(), page),
				() => {
					void context.shell.open({ feature: 'settings', section: 'browser' });
				},
			);
			await Promise.all([host.ready, shared?.ready]);
			context.lifetime.register(
				observeNoteLinks(
					context.app.workspace,
					() => settings.get().interceptNoteLinks,
					(url, event) => current().routeLink(url, event, 'note'),
				),
			);
		},
		async dispose() {
			await host?.dispose();
			host = undefined;
		},
	};
}
