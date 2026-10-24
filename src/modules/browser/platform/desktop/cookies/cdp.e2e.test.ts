// Real-browser check of the browser-decrypt route. Skipped unless a Chromium executable is given:
//   HUHU_COOKIE_E2E_CHROME=/usr/bin/google-chrome pnpm vitest run src/modules/browser/platform/desktop/cookies/cdp.e2e.test.ts
// Everything happens in a temporary HOME/user-data directory; no real profile is read or written.
import { describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DetectedBrowser } from '../../../core/cookies';
import { browserArgs, defaultLauncher } from './cdp';
import { importBrowserCookies } from './import';

const chrome = process.env.HUHU_COOKIE_E2E_CHROME;

/** Creates a profile whose Cookie store really contains `cookies`, using the browser's own DevTools pipe. */
async function seedProfile(executable: string, userDataDir: string, cookies: Array<Record<string, unknown>>) {
	const child = defaultLauncher(executable, browserArgs(userDataDir, 'Default'));
	let buffer = '';
	const replies = new Map<number, () => void>();
	child.output.on('data', (chunk: Buffer) => {
		buffer += chunk.toString();
		let i: number;
		while ((i = buffer.indexOf('\0')) >= 0) {
			const id = (JSON.parse(buffer.slice(0, i)) as { id?: number }).id;
			buffer = buffer.slice(i + 1);
			if (id !== undefined) replies.get(id)?.();
		}
	});
	const call = (id: number, method: string, params: unknown) =>
		new Promise<void>((resolve) => {
			replies.set(id, resolve);
			child.input.write(JSON.stringify({ id, method, params }) + '\0');
		});
	await call(1, 'Storage.setCookies', { cookies });
	await new Promise((resolve) => setTimeout(resolve, 500));
	child.input.write(JSON.stringify({ id: 2, method: 'Browser.close' }) + '\0');
	await child.exited;
}

describe.skipIf(!chrome)('browser-decrypt route with a real browser', () => {
	it('imports persisted cookies from a copied profile and leaves the source untouched', async () => {
		const root = await fs.mkdtemp(join(tmpdir(), 'huhu-cookie-e2e-'));
		try {
			const userData = join(root, 'User Data');
			const future = Math.floor(Date.now() / 1000) + 86400 * 365;
			await seedProfile(chrome!, userData, [
				{
					name: 'sid',
					value: 'plain-secret',
					domain: '.example.com',
					path: '/',
					secure: true,
					httpOnly: true,
					expires: future,
					sameSite: 'Lax',
				},
				{ name: 'host', value: 'only', url: 'https://app.example.org/', expires: future },
				{ name: 'SID', value: 'google', domain: '.google.com', path: '/', secure: true, expires: future },
			]);
			const cookiesPath = (
				await Promise.all(
					[join(userData, 'Default', 'Network', 'Cookies'), join(userData, 'Default', 'Cookies')].map(
						(path) =>
							fs.stat(path).then(
								() => path,
								() => '',
							),
					),
				)
			).find(Boolean)!;
			const before = await fs.stat(cookiesPath);
			const browser: DetectedBrowser = {
				family: 'chrome',
				label: 'Chrome',
				root: userData,
				kind: 'chromium',
				profiles: [{ name: 'Default', directory: join(userData, 'Default'), cookiesPath }],
			};
			let written: Array<{ name: string; value: string; domain: string; hostOnly?: boolean }> = [];
			const win = {
				require: () => ({
					require: () => ({
						runInThisContext: () => ({
							write: async (_d: string, c: typeof written) => {
								written = c;
								return { imported: c.length, failed: 0 };
							},
						}),
					}),
				}),
			} as unknown as Window;
			const tmp = join(root, 'tmp');
			const result = await importBrowserCookies(
				win,
				browser,
				join(userData, 'Default'),
				'/session',
				tmp,
				{ readCookies: async () => ({ rows: [] }) },
				undefined,
				{ strategy: 'browser', executable: chrome },
			);
			expect(result).toMatchObject({ imported: 2, googleSkipped: 1, method: 'browser' });
			expect(written.find((c) => c.name === 'sid')).toMatchObject({
				value: 'plain-secret',
				domain: '.example.com',
			});
			expect(written.find((c) => c.name === 'host')).toMatchObject({ value: 'only', hostOnly: true });
			expect(await fs.readdir(tmp)).toEqual([]);
			expect((await fs.stat(cookiesPath)).mtimeMs).toBe(before.mtimeMs);
		} finally {
			await fs.rm(root, { recursive: true, force: true });
		}
	}, 90000);
});
