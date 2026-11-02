import { Notice, Platform, requestUrl, type App } from 'obsidian';
import { t } from '../../../../shared/i18n';
import type { VaultSessionLease } from '../../../../host/desktop/browser-session';

declare const require: (id: string) => unknown;
const ORIGIN = 'https://music.163.com';
interface Cookie {
	name: string;
	value: string;
}
interface Session {
	cookies: { get(filter: { url: string }): Promise<Cookie[]>; flushStore(): Promise<void> };
	clearStorageData(): Promise<void>;
}
interface LoginWindow {
	webContents: {
		id: number;
		session: Session;
		setWindowOpenHandler(handler: () => { action: 'deny' }): void;
		on(event: 'will-navigate', handler: (event: { preventDefault(): void }, url: string) => void): void;
	};
	loadURL(url: string): Promise<unknown>;
	on(event: 'closed', handler: () => void): void;
	isDestroyed(): boolean;
	close(): void;
}
interface ElectronApi {
	BrowserWindow: new (options: Record<string, unknown>) => LoginWindow;
}
function electronApi(): ElectronApi {
	if (Platform.isMobile) throw new Error('UNSUPPORTED');
	try {
		const electron = require('electron') as Partial<ElectronApi> & { remote?: ElectronApi };
		const api =
			electron.BrowserWindow
				? (electron as ElectronApi)
				: (electron.remote ?? (require('@electron/remote') as ElectronApi));
		if (!api?.BrowserWindow) throw new Error('UNSUPPORTED');
		return api;
	} catch {
		throw new Error('UNSUPPORTED');
	}
}

/** Only the two music-site authentication cookies are sent to its API. */
export function musicCookieHeader(cookies: Cookie[]): string {
	return cookies
		.filter((c) => ['MUSIC_U', '__csrf'].includes(c.name) && /^[\x21-\x3A\x3C-\x7E]+$/.test(c.value))
		.map((c) => `${c.name}=${c.value}`)
		.join('; ');
}

/** Credentials stay in Electron's isolated local cookie store, never the settings file. */
export class NeteaseAccount {
	private session: Session | null = null;
	private lease?: VaultSessionLease;
	private pending?: Promise<Session>;
	private readonly abort = new AbortController();
	private cancelLogin: (() => void) | null = null;
	private loginPending = false;
	private loggingOut = false;
	private restoration?: Promise<void>;
	private cancelRestore?: () => void;
	private readonly owner: Window;
	private readonly onWindowClose = () => this.destroy();
	private disposed = false;
	/** Bumped when a restore attempt is abandoned, so a late cookie read cannot sign the account in. */
	private restoreGeneration = 0;
	loggedIn = false;
	error = '';
	constructor(private readonly app: App, private readonly restoreDeadlineMs = 5_000) {
		this.owner = app.workspace.containerEl.win;
		this.owner.addEventListener?.('unload', this.onWindowClose);
	}

	private current(generation: number): boolean {
		return !this.disposed && !this.owner.closed && generation === this.restoreGeneration;
	}

	private invalidate(): number {
		this.restoreGeneration += 1;
		this.cancelRestore?.();
		return this.restoreGeneration;
	}

	private async getSession(interactive = false): Promise<Session> {
		if (this.disposed) throw new Error('browser_session_closed');
		if (this.session) return this.session;
		return this.pending ??= import('./session').then(({ homeSession }) => homeSession(this.app, this.app.workspace.containerEl.win, 'music', this.abort.signal, interactive)).then(lease => {
			if (this.disposed || this.abort.signal.aborted) { lease.dispose(); throw new Error('browser_session_closed'); }
			lease.onDownloadError(() => { if (!this.disposed) new Notice(t('web.browser_session_download')); });
			this.lease = lease; this.session = lease.session; return this.session;
		}).finally(() => { this.pending = undefined; });
	}

	cookie(): Promise<string> {
		return this.readCookie(this.restoreGeneration);
	}

	private async readCookie(generation: number): Promise<string> {
		const cookies = await (await this.getSession()).cookies.get({ url: ORIGIN });
		if (!this.current(generation) || this.loggingOut) throw new Error('browser_session_closed');
		const header = musicCookieHeader(cookies);
		this.loggedIn = /(?:^|; )MUSIC_U=/.test(header);
		return this.loggedIn ? header : '';
	}

	/** A bounded background attempt; cancellation settles even if native Cookie never returns. */
	restore(): Promise<void> {
		if (Platform.isMobile || this.disposed) return Promise.resolve();
		if (this.restoration) return this.restoration;
		if (this.loginPending || this.loggingOut) return Promise.resolve();
		const generation = this.restoreGeneration;
		const task = new Promise<void>(resolve => {
			let settled = false;
			let timer: number | undefined;
			const finish = (error?: unknown) => {
				if (settled) return;
				settled = true;
				if (timer !== undefined) this.owner.clearTimeout(timer);
				this.cancelRestore = undefined;
				if (this.current(generation)) {
					if (error) {
						this.restoreGeneration += 1;
						this.loggedIn = false;
						this.error = error instanceof Error ? error.message : 'browser_session_unavailable';
						if (this.error !== 'browser_session_timeout')
							new Notice(t(`web.${this.error.startsWith('browser_session_') ? this.error : 'browser_session_unavailable'}`));
					} else this.error = '';
				}
				resolve();
			};
			this.cancelRestore = () => finish();
			timer = this.owner.setTimeout(() => finish(new Error('browser_session_timeout')), this.restoreDeadlineMs);
			void this.readCookie(generation).then(() => finish(), error => finish(error));
		});
		this.restoration = task.finally(() => { if (this.restoration === owned) this.restoration = undefined; });
		const owned = this.restoration;
		return owned;
	}

	async login(): Promise<void> {
		if (this.disposed || this.loginPending || this.loggingOut) throw new Error('BUSY');
		this.loginPending = true;
		const generation = this.invalidate();
		this.error = '';
		try {
			const cancelled = new Promise<never>((_resolve, reject) => {
				this.cancelLogin = () => reject(new Error('CANCELLED'));
			});
			const session = await Promise.race([this.getSession(true), cancelled]);
			if (!this.current(generation)) throw new Error('CANCELLED');
			return await new Promise((resolve, reject) => {
				const api = electronApi();
				const win = new api.BrowserWindow({
					width: 1020,
					height: 760,
					title: 'NetEase Cloud Music',
					webPreferences: {
						session,
						nodeIntegration: false,
						contextIsolation: true,
						sandbox: true,
						webSecurity: true,
					},
				});
				this.session = win.webContents.session;
				this.lease!.protect(win.webContents.id);
				let done = false;
				let timer: number | undefined;
				const finish = (error?: Error): void => {
					if (done) return;
					done = true;
					this.owner.clearTimeout(timer);
					this.owner.clearTimeout(timeout);
					if (error && this.current(generation)) this.invalidate();
					this.cancelLogin = null;
					if (!win.isDestroyed()) win.close();
					if (error) reject(error);
					else resolve();
				};
				const timeout = this.owner.setTimeout(() => finish(new Error('TIMEOUT')), 5 * 60_000);
				this.cancelLogin = () => finish(new Error('CANCELLED'));
				win.on('closed', () => finish(new Error('CANCELLED')));
				win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
				win.webContents.on('will-navigate', (event, url) => {
					try {
						const parsed = new URL(url);
						if (parsed.protocol !== 'https:' || parsed.hostname !== 'music.163.com') event.preventDefault();
					} catch {
						event.preventDefault();
					}
				});
				const poll = async (): Promise<void> => {
					if (done) return;
					try {
						const cookie = await this.readCookie(generation);
						if (done) return;
						if (cookie) {
							const response = await requestUrl({
								url: `${ORIGIN}/api/nuser/account/get`,
								headers: { Cookie: cookie, Referer: ORIGIN },
								throw: false,
							});
							const body = response.json as { code?: number; profile?: { userId?: number } };
							if (done) return;
							if (body.code === 200 && typeof body.profile?.userId === 'number') {
								await (await this.getSession()).cookies.flushStore();
								if (!done) finish();
								return;
							}
						}
					} catch {
						/* Site may still be completing login; retry until timeout. */
					}
					if (!done)
						timer = this.owner.setTimeout(() => {
							void poll();
						}, 1500);
				};
				void win
					.loadURL(ORIGIN)
					.then(() => poll())
					.catch(() => finish(new Error('LOAD_FAILED')));
			});
		} finally { this.loginPending = false; this.cancelLogin = null; }
	}

	async logout(): Promise<void> {
		if (this.disposed || this.loggingOut) throw new Error('BUSY');
		this.loggingOut = true;
		const generation = this.invalidate();
		this.cancelLogin?.();
		this.loggedIn = false;
		this.error = '';
		try {
			const session = await this.getSession();
			if (!this.current(generation)) throw new Error('CANCELLED');
			await session.clearStorageData();
			if (!this.current(generation)) throw new Error('CANCELLED');
			await session.cookies.flushStore();
			if (!this.current(generation)) throw new Error('CANCELLED');
			await this.lease!.clearRecovery();
		} finally { this.loggingOut = false; }
	}

	destroy(): void {
		if (this.disposed) return;
		this.disposed = true;
		this.invalidate();
		this.owner.removeEventListener?.('unload', this.onWindowClose);
		this.loggedIn = false;
		this.cancelLogin?.();
		this.abort.abort(); this.lease?.dispose(); this.lease = undefined; this.session = null;
	}
}
