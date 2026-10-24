import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { requestUrl } from 'obsidian';

export interface ExecResult {
	code: number | null;
	stdout: string;
	stderr: string;
	/** Spawn failure (`ENOENT` when the program does not exist) or `timeout`. */
	error?: string;
}
export interface ExecOptions {
	env: NodeJS.ProcessEnv;
	timeoutMs: number;
}
export type Exec = (file: string, args: string[], options: ExecOptions) => Promise<ExecResult>;
export type FetchLatest = (packageName: string) => Promise<string | undefined>;
export type RealPath = (file: string) => string;

/** Windows runs npm and npm shims as `.cmd`, which only a shell can start. Every argument here is a fixed token. */
function needsShell(file: string): boolean {
	return process.platform === 'win32' && (file === 'npm' || /\.(cmd|bat)$/i.test(file));
}

export const defaultExec: Exec = (file, args, { env, timeoutMs }) =>
	new Promise((resolve) => {
		const shell = needsShell(file);
		const command = shell ? (file === 'npm' ? 'npm.cmd' : `"${file}"`) : file;
		try {
			const child = execFile(
				command,
				args,
				{ env, timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024, windowsHide: true, shell, encoding: 'utf8' },
				(error, stdout, stderr) => {
					const code = error ? (typeof error.code === 'number' ? error.code : null) : 0;
					const reason = error
						? error.killed
							? 'timeout'
							: typeof error.code === 'string'
								? error.code
								: undefined
						: undefined;
					// Under a shell a missing program is exit code 127 (sh) or 1 with a "not recognized" message (cmd).
					const missing = shell && /not recognized|not found/i.test(String(stderr)) ? 'ENOENT' : undefined;
					resolve({ code, stdout: String(stdout), stderr: String(stderr), error: reason ?? missing });
				},
			);
			child.stdin?.end();
		} catch (e) {
			resolve({ code: null, stdout: '', stderr: String(e), error: 'ENOENT' });
		}
	});

export const defaultRealPath: RealPath = (file) => {
	try {
		return fs.realpathSync(file);
	} catch {
		return file;
	}
};

/** `dist-tags.latest` from the npm registry. Failures are silent: no network means no "new version" hint. */
export const fetchNpmLatest: FetchLatest = async (name) => {
	try {
		const url = `https://registry.npmjs.org/${name.replace('/', '%2F')}/latest`;
		let timer = 0;
		const response = await Promise.race([
			requestUrl({ url, throw: false, headers: { Accept: 'application/json' } }),
			new Promise<never>((_, reject) => {
				timer = window.setTimeout(() => reject(new Error('timeout')), 8000);
			}),
		]).finally(() => window.clearTimeout(timer));
		const version = (response.json as { version?: unknown } | null)?.version;
		return response.status === 200 && typeof version === 'string' ? version : undefined;
	} catch {
		return undefined;
	}
};

export function defaultPlatform(): 'win32' | 'darwin' | 'linux' {
	return process.platform === 'win32' ? 'win32' : process.platform === 'darwin' ? 'darwin' : 'linux';
}

/** The process environment with the login-shell PATH in front; HOME and the CLI config variables are left as they are. */
export function commandEnv(extraPath: string): NodeJS.ProcessEnv {
	return { ...process.env, PATH: [extraPath, process.env.PATH].filter(Boolean).join(path.delimiter) };
}
