import { describe, expect, it } from 'vitest';
import { PassThrough } from 'node:stream';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CookieImportError, type CookieImportResult, type DetectedBrowser } from '../../../core/cookies';
import { browserArgs, fetchCookiesWithBrowser, findBrowserExecutable, type BrowserChild, type CdpCookie } from './cdp';
import { cdpToCookie, importBrowserCookies } from './import';

interface FakeOptions {
	cookies?: CdpCookie[];
	silent?: boolean;
	exitEarly?: { code: number | null; stderr: string };
	error?: string;
}
function fakeLauncher(options: FakeOptions = {}) {
	const log = { args: [] as string[], received: [] as string[], killed: false, closed: false, executable: '' };
	const launcher = (executable: string, args: string[]): BrowserChild => {
		log.executable = executable;
		log.args = args;
		const input = new PassThrough(),
			output = new PassThrough();
		let finish!: (v: { code: number | null; stderr: string }) => void;
		const exited = new Promise<{ code: number | null; stderr: string }>((resolve) => (finish = resolve));
		let buffer = '';
		input.on('data', (chunk: Buffer) => {
			buffer += chunk.toString();
			let i: number;
			while ((i = buffer.indexOf('\0')) >= 0) {
				const message = JSON.parse(buffer.slice(0, i)) as { id: number; method: string };
				buffer = buffer.slice(i + 1);
				log.received.push(message.method);
				if (message.method === 'Browser.close') {
					log.closed = true;
					finish({ code: 0, stderr: '' });
				} else if (!options.silent)
					output.write(
						JSON.stringify(
							options.error
								? { id: message.id, error: { message: options.error } }
								: { id: message.id, result: { cookies: options.cookies ?? [] } },
						) + '\0',
					);
			}
		});
		if (options.exitEarly) queueMicrotask(() => finish(options.exitEarly!));
		return {
			input,
			output,
			exited,
			kill: () => {
				log.killed = true;
				finish({ code: null, stderr: '' });
			},
		};
	};
	return { launcher, log };
}
const cdp = (extra: Partial<CdpCookie> = {}): CdpCookie => ({
	name: 'sid',
	value: 'secret',
	domain: '.example.com',
	path: '/',
	expires: 4102444800,
	httpOnly: true,
	secure: true,
	sameSite: 'Lax',
	...extra,
});

describe('browser-decrypt route', () => {
	it('launches a headless browser on the private copy with a DevTools pipe and closes it', async () => {
		const { launcher, log } = fakeLauncher({ cookies: [cdp()] });
		const cookies = await fetchCookiesWithBrowser({
			executable: '/bin/chrome',
			userDataDir: '/tmp/x',
			profileName: 'Profile 4',
			launcher,
		});
		expect(cookies).toHaveLength(1);
		expect(log.args).toEqual(expect.arrayContaining(['--headless=new', '--remote-debugging-pipe']));
		expect(log.args).toContain('--user-data-dir=/tmp/x');
		expect(log.args).toContain('--profile-directory=Profile 4');
		expect(log.received).toEqual(['Storage.getCookies', 'Browser.close']);
		expect(log.killed).toBe(false);
		expect(browserArgs('/a', 'Default')).not.toContain('--remote-debugging-port=9222');
	});
	it('times out, kills the process and reports a coded error', async () => {
		const { launcher, log } = fakeLauncher({ silent: true });
		// Browser.close is ignored by a hung browser, so the kill path must run.
		const hung: typeof launcher = (e, a) => {
			const child = launcher(e, a);
			child.input.removeAllListeners('data');
			return child;
		};
		const error = await fetchCookiesWithBrowser({
			executable: 'x',
			userDataDir: 'y',
			profileName: 'Default',
			launcher: hung,
			timeoutMs: 20,
		}).catch((e) => e);
		expect(error).toMatchObject({ code: 'browser-timeout' });
		expect(log.killed).toBe(true);
	}, 10000);
	it('maps a missing executable and an early exit to coded errors', async () => {
		const missing = await fetchCookiesWithBrowser({
			executable: 'x',
			userDataDir: 'y',
			profileName: 'Default',
			launcher: fakeLauncher({ silent: true, exitEarly: { code: null, stderr: 'ENOENT spawn x' } }).launcher,
		}).catch((e) => e);
		expect(missing).toBeInstanceOf(CookieImportError);
		expect(missing.code).toBe('browser-missing');
		const failed = await fetchCookiesWithBrowser({
			executable: 'x',
			userDataDir: 'y',
			profileName: 'Default',
			launcher: fakeLauncher({ silent: true, exitEarly: { code: 1, stderr: 'boom' } }).launcher,
		}).catch((e) => e);
		expect(failed.code).toBe('browser-failed');
	});
	it('stops on abort', async () => {
		const controller = new AbortController();
		controller.abort();
		const error = await fetchCookiesWithBrowser({
			executable: 'x',
			userDataDir: 'y',
			profileName: 'Default',
			launcher: fakeLauncher({ silent: true }).launcher,
			signal: controller.signal,
		}).catch((e) => e);
		expect(error.code).toBe('cancelled');
	});
	it('locates executables per platform from injectable roots', async () => {
		const env = {
			PROGRAMFILES: 'C:\\Program Files',
			LOCALAPPDATA: 'C:\\Users\\u\\AppData\\Local',
		} as NodeJS.ProcessEnv;
		const wanted = join('C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe');
		expect(await findBrowserExecutable('chrome', 'win32', env, async (p) => p === wanted)).toBe(wanted);
		expect(await findBrowserExecutable('chrome', 'win32', env, async () => false)).toBeUndefined();
		expect(await findBrowserExecutable('chrome', 'darwin', {}, async () => true)).toContain('Google Chrome');
		expect(await findBrowserExecutable('arc', 'linux', { PATH: '/usr/bin' }, async () => true)).toBeUndefined();
	});
	it('converts DevTools cookies and skips partitioned or invalid ones', () => {
		expect(cdpToCookie(cdp())).toMatchObject({
			domain: '.example.com',
			hostOnly: false,
			sameSite: 'lax',
			expirationDate: 4102444800,
			httpOnly: true,
		});
		expect(cdpToCookie(cdp({ domain: 'example.com', session: true, expires: -1, sameSite: 'None' }))).toMatchObject(
			{
				hostOnly: true,
				sameSite: 'no_restriction',
			},
		);
		expect(cdpToCookie(cdp({ partitionKey: { topLevelSite: 'https://a.com' } }))).toBeNull();
		expect(cdpToCookie(cdp({ domain: 'bad/host' }))).toBeNull();
	});
});

describe('importBrowserCookies via the browser', () => {
	async function run(
		cookies: CdpCookie[],
		launcher = fakeLauncher({ cookies }).launcher,
		strategy: 'browser' | 'auto' = 'browser',
	) {
		const dir = await fs.mkdtemp(join(tmpdir(), 'huhu-import-'));
		try {
			const profile = join(dir, 'User Data', 'Default');
			await fs.mkdir(join(profile, 'Network'), { recursive: true });
			await fs.writeFile(join(profile, 'Network', 'Cookies'), 'db');
			await fs.writeFile(join(dir, 'User Data', 'Local State'), '{}');
			const browser: DetectedBrowser = {
				family: 'chrome',
				label: 'Google Chrome',
				root: join(dir, 'User Data'),
				kind: 'chromium',
				profiles: [{ name: 'Ying', directory: profile, cookiesPath: join(profile, 'Network', 'Cookies') }],
			};
			let written: unknown[] = [];
			const win = {
				require: () => ({
					require: () => ({
						runInThisContext: () => ({
							write: async (_d: string, c: unknown[]) => {
								written = c;
								return { imported: c.length, failed: 0 };
							},
						}),
					}),
				}),
			} as unknown as Window;
			const result: CookieImportResult = await importBrowserCookies(
				win,
				browser,
				undefined,
				'/session',
				join(dir, 'tmp'),
				{ readCookies: async () => ({ rows: [] }) },
				undefined,
				{ strategy, launcher, executable: '/bin/chrome' },
			);
			return { result, written, leftovers: await fs.readdir(join(dir, 'tmp')) };
		} finally {
			await fs.rm(dir, { recursive: true, force: true });
		}
	}
	it('imports decrypted cookies, excludes Google and cleans the private copy', async () => {
		const { result, written, leftovers } = await run([
			cdp(),
			cdp({ name: 'SID', domain: '.google.com' }),
			cdp({ name: 'p', partitionKey: {} }),
		]);
		expect(result).toMatchObject({ imported: 1, googleSkipped: 1, skipped: 1, method: 'browser' });
		expect(written).toHaveLength(1);
		expect(leftovers).toEqual([]);
	});
	it('does not fall back from a failed browser launch when the browser route is required', async () => {
		await expect(
			run([], fakeLauncher({ silent: true, exitEarly: { code: 1, stderr: 'x' } }).launcher),
		).rejects.toMatchObject({
			code: 'browser-failed',
		});
	});
});
