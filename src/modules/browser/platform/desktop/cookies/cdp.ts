import { setTimeout as schedule, clearTimeout as cancel } from 'node:timers';
// The browser-decrypt route drives the browser's own DevTools pipe protocol (NUL-delimited JSON on fd 3/4).
// Protocol framing follows the public Chrome DevTools Protocol documentation and the behaviour of
// puppeteer's PipeTransport (Apache-2.0); no code was copied. Opening a private copy of the profile
// in headless Chrome lets the browser itself unwrap v10/v11/v20 (application-bound) cookie keys.
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { delimiter, join } from 'node:path';
import type { Readable, Writable } from 'node:stream';
import { CookieImportError } from '../../../core/cookies';

export interface CdpCookie {
	name: string;
	value: string;
	domain: string;
	path: string;
	expires: number;
	httpOnly: boolean;
	secure: boolean;
	session?: boolean;
	sameSite?: 'Strict' | 'Lax' | 'None';
	partitionKey?: unknown;
}
/** The two DevTools pipe ends plus lifecycle of a launched browser. */
export interface BrowserChild {
	/** Messages to the browser (its fd 3). */
	input: Writable;
	/** Messages from the browser (its fd 4). */
	output: Readable;
	/** Resolves when the process has exited; `stderr` holds the last diagnostic output. */
	exited: Promise<{ code: number | null; stderr: string }>;
	kill(): void;
}
export type BrowserLauncher = (executable: string, args: string[]) => BrowserChild;

export const defaultLauncher: BrowserLauncher = (executable, args) => {
	const child = spawn(executable, args, { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'], windowsHide: true });
	let stderr = '';
	child.stderr?.on('data', (data: Buffer) => {
		stderr = (stderr + data.toString()).slice(-2000);
	});
	const exited = new Promise<{ code: number | null; stderr: string }>((resolve) => {
		child.once('error', (error) =>
			resolve({ code: null, stderr: `${(error as NodeJS.ErrnoException).code ?? ''} ${error.message}` }),
		);
		child.once('close', (code) => resolve({ code, stderr }));
	});
	return {
		input: child.stdio[3] as Writable,
		output: child.stdio[4] as Readable,
		exited,
		kill: () => {
			if (process.platform === 'win32' && child.pid)
				spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }).on(
					'error',
					() => undefined,
				);
			else child.kill('SIGKILL');
		},
	};
};

export function browserArgs(userDataDir: string, profileName: string): string[] {
	return [
		'--headless=new',
		'--remote-debugging-pipe',
		`--user-data-dir=${userDataDir}`,
		`--profile-directory=${profileName}`,
		'--no-first-run',
		'--no-default-browser-check',
		'--disable-gpu',
		'--mute-audio',
		'--disable-extensions',
		'--disable-background-networking',
		'--disable-sync',
		'about:blank',
	];
}

/** Reads cookies of a private profile copy through the browser, then closes the browser. */
export async function fetchCookiesWithBrowser(options: {
	executable: string;
	userDataDir: string;
	profileName: string;
	launcher?: BrowserLauncher;
	timeoutMs?: number;
	signal?: AbortSignal;
}): Promise<CdpCookie[]> {
	const child = (options.launcher ?? defaultLauncher)(
		options.executable,
		browserArgs(options.userDataDir, options.profileName),
	);
	const timeoutMs = options.timeoutMs ?? 30000;
	let buffer = '',
		settled = false,
		timer: ReturnType<typeof setTimeout> | undefined,
		onAbort: (() => void) | undefined;
	try {
		return await new Promise<CdpCookie[]>((resolve, reject) => {
			const fail = (error: CookieImportError) => {
				if (!settled) {
					settled = true;
					reject(error);
				}
			};
			timer = schedule(
				() => fail(new CookieImportError('browser-timeout', 'The browser did not return Cookies in time.')),
				timeoutMs,
			);
			if (options.signal) {
				onAbort = () => fail(new CookieImportError('cancelled', 'Cookie import cancelled'));
				if (options.signal.aborted) onAbort();
				else options.signal.addEventListener('abort', onAbort, { once: true });
			}
			void child.exited.then(({ code, stderr }) => {
				const missing = code === null && /ENOENT/.test(stderr);
				fail(
					new CookieImportError(
						missing ? 'browser-missing' : 'browser-failed',
						missing
							? 'Browser executable not found.'
							: `Browser exited early (${code ?? 'spawn error'}) ${stderr.trim()}`.trim(),
					),
				);
			});
			child.input.on('error', () => undefined);
			child.output.on('error', () => undefined);
			child.output.on('data', (chunk: Buffer | string) => {
				buffer += chunk.toString();
				let index: number;
				while ((index = buffer.indexOf('\0')) >= 0) {
					const raw = buffer.slice(0, index);
					buffer = buffer.slice(index + 1);
					let message: { id?: number; result?: { cookies?: CdpCookie[] }; error?: { message?: string } };
					try {
						message = JSON.parse(raw) as typeof message;
					} catch {
						continue;
					}
					if (message.id !== 1) continue;
					if (settled) return;
					settled = true;
					if (message.error || !Array.isArray(message.result?.cookies))
						reject(
							new CookieImportError('browser-failed', message.error?.message ?? 'No Cookies in reply'),
						);
					else resolve(message.result.cookies);
				}
			});
			child.input.write(JSON.stringify({ id: 1, method: 'Storage.getCookies' }) + '\0');
		});
	} finally {
		if (timer) cancel(timer);
		if (onAbort) options.signal?.removeEventListener('abort', onAbort);
		await closeBrowser(child);
	}
}

async function closeBrowser(child: BrowserChild): Promise<void> {
	try {
		child.input.write(JSON.stringify({ id: 2, method: 'Browser.close' }) + '\0');
	} catch {
		/* Pipe already closed. */
	}
	let timer: ReturnType<typeof setTimeout> | undefined;
	const graceful = await Promise.race([
		child.exited.then(() => true),
		new Promise<boolean>((resolve) => {
			timer = schedule(() => resolve(false), 3000);
		}),
	]);
	if (timer) cancel(timer);
	if (!graceful) {
		child.kill();
		await Promise.race([child.exited, new Promise((resolve) => schedule(resolve, 2000))]);
	}
}

const WINDOWS: Record<string, string[]> = {
	chrome: ['Google/Chrome/Application/chrome.exe'],
	edge: ['Microsoft/Edge/Application/msedge.exe'],
	brave: ['BraveSoftware/Brave-Browser/Application/brave.exe'],
	chromium: ['Chromium/Application/chrome.exe'],
	comet: ['Perplexity/Comet/Application/comet.exe'],
};
const MAC: Record<string, string[]> = {
	chrome: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
	edge: ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'],
	brave: ['/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'],
	chromium: ['/Applications/Chromium.app/Contents/MacOS/Chromium'],
	arc: ['/Applications/Arc.app/Contents/MacOS/Arc'],
	comet: ['/Applications/Comet.app/Contents/MacOS/Comet'],
	helium: ['/Applications/Helium.app/Contents/MacOS/Helium'],
};
const LINUX: Record<string, string[]> = {
	chrome: ['google-chrome-stable', 'google-chrome'],
	edge: ['microsoft-edge-stable', 'microsoft-edge'],
	brave: ['brave-browser', 'brave'],
	chromium: ['chromium', 'chromium-browser'],
};

/** Finds the installed executable of a Chromium family, or undefined. `env`/`exists` are injectable for tests. */
export async function findBrowserExecutable(
	family: string,
	platform: NodeJS.Platform = process.platform,
	env: NodeJS.ProcessEnv = process.env,
	exists: (path: string) => Promise<boolean> = async (path) => {
		try {
			return (await fs.stat(path)).isFile();
		} catch {
			return false;
		}
	},
): Promise<string | undefined> {
	let candidates: string[] = [];
	if (platform === 'win32') {
		const bases = [env.PROGRAMFILES, env['PROGRAMFILES(X86)'], env.LOCALAPPDATA].filter((v): v is string => !!v);
		candidates = (WINDOWS[family] ?? []).flatMap((rel) => bases.map((base) => join(base, ...rel.split('/'))));
	} else if (platform === 'darwin') candidates = MAC[family] ?? [];
	else
		candidates = (LINUX[family] ?? []).flatMap((name) =>
			(env.PATH ?? '')
				.split(delimiter)
				.filter(Boolean)
				.concat(['/opt/google/chrome', '/opt/microsoft/msedge'])
				.map((dir) => join(dir, name)),
		);
	for (const path of candidates) if (await exists(path)) return path;
	return undefined;
}
