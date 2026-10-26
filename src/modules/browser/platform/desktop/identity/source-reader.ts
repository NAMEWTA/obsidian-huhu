import { promises as fs, constants } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createDecipheriv, createHash, randomUUID } from 'node:crypto';
import { setTimeout as schedule, clearTimeout as cancel } from 'node:timers';
import type { DetectedBrowser } from '../../../core/cookies';
import { IdentityError, MAX_IDENTITY_BYTES, planIdentityImport, requireStrictIdentityPlan, type IdentitySeedV1 } from '../../../core/identity';
import { copyStableDatabase } from '../cookies/snapshot';
import { getEncryptionKey, type EncryptionKeyResult } from '../cookies/keys';
import { privateDirectory } from '../persistence/private-files';

export interface IdentitySourceGrant { id: string; kind: 'cookie-file' | 'browser-source'; expiresAt: number }
interface CapturedSource { seed: IdentitySeedV1; source: 'cookie-file' | 'browser-source'; capturedAt: number; consistency: 'fixed-file' | 'stable-sqlite-snapshot' }
type GrantedSource = { kind: 'cookie-file'; path: string } | { kind: 'browser-source'; browser: DetectedBrowser; profileDir: string; domains: readonly string[] };
export class DesktopIdentitySourceReader {
	private readonly grants = new Map<string, { source: GrantedSource; expiresAt: number }>();
	private readonly active = new Set<AbortController>(); private readonly tasks = new Set<Promise<unknown>>();
	private readonly clock: () => number; private generation = 0; private disposed = false;
	constructor(private readonly options: { temporaryDirectory: string; readerExecutable: () => Promise<string>; clock?: () => number; recordCleanupFailure: (path: string) => Promise<void> }) { this.clock = options.clock ?? Date.now; }
	issueFileGrant(path: string): IdentitySourceGrant { return this.issue({ kind: 'cookie-file', path }); }
	issueBrowserGrant(browser: DetectedBrowser, profileDir: string, domains: readonly string[] = []): IdentitySourceGrant {
		if (!browser.profiles.some((item) => item.directory === profileDir) || domains.length > 50 || domains.some((domain) => !/^[a-z0-9.-]{1,253}$/i.test(domain))) throw new IdentityError('source_grant_invalid');
		return this.issue({ kind: 'browser-source', browser: structuredClone(browser), profileDir, domains: [...domains] });
	}
	private issue(source: GrantedSource): IdentitySourceGrant {
		if (this.disposed) throw new IdentityError('source_grant_invalid');
		for (const [id, value] of this.grants) if (value.expiresAt <= this.clock()) this.grants.delete(id);
		if (this.grants.size + this.active.size >= 16) throw new IdentityError('too_large');
		const id = randomUUID(), expiresAt = this.clock() + 60000; this.grants.set(id, { source, expiresAt }); return { id, kind: source.kind, expiresAt };
	}
	revoke(): void { this.generation++; this.grants.clear(); for (const controller of this.active) controller.abort(); }
	async dispose(): Promise<void> { this.disposed = true; this.revoke(); await Promise.allSettled([...this.tasks]); }
	private track<T>(work: (signal: AbortSignal) => Promise<T>): Promise<T> {
		const controller = new AbortController(); this.active.add(controller);
		const task = work(controller.signal).finally(() => { this.active.delete(controller); this.tasks.delete(task); }); this.tasks.add(task); return task;
	}
	private consume(id: string) {
		if (this.disposed) throw new IdentityError('source_grant_invalid');
		const grant = this.grants.get(id); this.grants.delete(id);
		if (!grant || grant.expiresAt <= this.clock()) throw new IdentityError('source_grant_invalid'); return grant;
	}
	captureFileText(id: string): Promise<string> {
		return this.track(async (signal) => {
			const grant = this.consume(id), generation = this.generation;
			if (grant.source.kind !== 'cookie-file') throw new IdentityError('source_grant_invalid');
			const text = await fixedText(grant.source.path, MAX_IDENTITY_BYTES);
			if (this.disposed || signal.aborted || generation !== this.generation) throw new IdentityError('cancelled');
			if (grant.expiresAt <= this.clock()) throw new IdentityError('source_grant_invalid'); return text;
		});
	}
	capture(id: string): Promise<CapturedSource> { return this.track((signal) => this.captureOnce(id, signal)); }
	private async captureOnce(id: string, signal: AbortSignal): Promise<CapturedSource> {
		const grant = this.consume(id), generation = this.generation;
		const check = () => { if (this.disposed || signal.aborted || generation !== this.generation) throw new IdentityError('cancelled'); if (grant.expiresAt <= this.clock()) throw new IdentityError('source_grant_invalid'); };
		if (grant.source.kind === 'cookie-file') { const text = await fixedText(grant.source.path, MAX_IDENTITY_BYTES); check(); return { seed: requireStrictIdentityPlan(planIdentityImport(text, this.clock())), source: 'cookie-file', capturedAt: this.clock(), consistency: 'fixed-file' }; }
		const { browser, profileDir, domains } = grant.source, profile = browser.profiles.find((item) => item.directory === profileDir);
		if (!profile) throw new IdentityError('source_grant_invalid');
		const parent = await privateDirectory(this.options.temporaryDirectory), temporary = join(parent, randomUUID());
		await fs.mkdir(temporary, { mode: 0o700 }); let key: EncryptionKeyResult | null = null;
		try {
			if (await fs.realpath(dirname(profile.cookiesPath)) !== resolve(dirname(profile.cookiesPath))) throw new IdentityError('source_unavailable');
			for (const suffix of ['', '-wal', '-shm']) {
				try { const stat = await fs.lstat(profile.cookiesPath + suffix); if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > 256 * 1024 * 1024) throw new IdentityError('source_unavailable'); }
				catch (error) { if (suffix && (error as NodeJS.ErrnoException).code === 'ENOENT') continue; throw error; }
			}
			await copyStableDatabase(profile.cookiesPath, join(temporary, 'Cookies')); check();
			if (await fs.realpath(dirname(profile.cookiesPath)) !== resolve(dirname(profile.cookiesPath))) throw new IdentityError('source_changed');
			if (browser.kind === 'chromium') {
				if (process.platform === 'win32') { const state = await fixedText(join(browser.root, 'Local State'), 16 * 1024 * 1024); check(); await fs.writeFile(join(temporary, 'Local State'), state, { mode: 0o600, flag: 'wx' }); }
				key = await getEncryptionKey({ ...browser, root: process.platform === 'win32' ? temporary : browser.root }); check();
			}
			const executable = await this.options.readerExecutable(); check();
			const raw = await readNative(executable, join(temporary, 'Cookies'), browser.kind, signal); check();
			const seed = requireStrictIdentityPlan(planIdentityImport(JSON.stringify(sourceRows(raw, browser.kind, key, domains)), this.clock())); check();
			return { seed, source: 'browser-source', capturedAt: this.clock(), consistency: 'stable-sqlite-snapshot' };
		} catch (error) { if (error instanceof IdentityError) throw error; throw new IdentityError('source_unavailable'); }
		finally {
			if (key?.mode === 'aes-256-gcm') key.key.fill(0); else if (key?.mode === 'aes-128-cbc') { key.keysByVersion.v10?.fill(0); key.keysByVersion.v11?.fill(0); }
			try { await fs.rm(temporary, { recursive: true, force: true }); } catch { await this.options.recordCleanupFailure(temporary); }
		}
	}
}
async function fixedText(file: string, maximum: number): Promise<string> {
	const stat = await fs.lstat(file);
	if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > maximum) throw new IdentityError(stat.size > maximum ? 'too_large' : 'source_unavailable');
	const handle = await fs.open(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
	try {
		const before = await handle.stat({ bigint: true });
		if (!before.isFile() || before.size > BigInt(maximum) || before.ino !== BigInt(stat.ino) || before.dev !== BigInt(stat.dev)) throw new IdentityError('source_changed');
		const bytes = Buffer.alloc(Number(before.size)); let offset = 0;
		try {
			while (offset < bytes.length) { const result = await handle.read(bytes, offset, bytes.length - offset, offset); if (!result.bytesRead) throw new IdentityError('source_changed'); offset += result.bytesRead; }
			const after = await handle.stat({ bigint: true }), current = await fs.lstat(file, { bigint: true });
			if (after.size !== before.size || after.mtimeNs !== before.mtimeNs || after.ctimeNs !== before.ctimeNs || current.ino !== before.ino || current.dev !== before.dev) throw new IdentityError('source_changed');
			try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { throw new IdentityError('invalid_format'); }
		} finally { bytes.fill(0); }
	} finally { await handle.close(); }
}
function readNative(executable: string, file: string, kind: 'chromium' | 'firefox', signal: AbortSignal): Promise<unknown> {
	if (signal.aborted) return Promise.reject(new IdentityError('cancelled'));
	return new Promise((resolve, reject) => {
		const env: NodeJS.ProcessEnv = {};
		for (const name of ['PATH', 'SystemRoot', 'WINDIR', 'TMP', 'TEMP', 'TMPDIR']) if (process.env[name] !== undefined) env[name] = process.env[name];
		const child = spawn(executable, ['--read-cookies'], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], env });
		const chunks: Buffer[] = []; let bytes = 0, failed = false;
		const fail = () => { failed = true; child.kill('SIGKILL'); }; const timer = schedule(fail, 30000);
		signal.addEventListener('abort', fail, { once: true });
		child.stdout.on('data', (chunk: Buffer) => { bytes += chunk.length; if (failed || bytes > 64 * 1024 * 1024) { chunk.fill(0); fail(); } else chunks.push(chunk); });
		child.stderr.resume(); child.stdin.on('error', fail); child.on('error', fail);
		child.on('close', (code) => {
			cancel(timer); signal.removeEventListener('abort', fail);
			try { if (failed || code !== 0) throw new IdentityError(signal.aborted ? 'cancelled' : 'source_unavailable'); resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
			catch (error) { reject(error instanceof IdentityError ? error : new IdentityError('source_unavailable')); }
			finally { for (const chunk of chunks) chunk.fill(0); }
		});
		child.stdin.end(JSON.stringify({ path: file, kind }));
	});
}
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
function decrypt(hex: unknown, host: string, databaseVersion: number | undefined, key: EncryptionKeyResult | null): string {
	if (typeof hex !== 'string' || hex.length > 262144 || !/^(?:[a-fA-F0-9]{2})+$/.test(hex)) throw new IdentityError('source_unavailable');
	const encrypted = Buffer.from(hex, 'hex'), version = encrypted.subarray(0, 3).toString('ascii');
	if (!['v10', 'v11'].includes(version)) throw new IdentityError('unsupported_cookie');
	if (!key) throw new IdentityError('key_unavailable'); let plain: Buffer | undefined;
	try {
		if (key.mode === 'aes-256-gcm') { if (encrypted.length < 31) throw new Error(); const cipher = createDecipheriv('aes-256-gcm', key.key, encrypted.subarray(3, 15)); cipher.setAuthTag(encrypted.subarray(-16)); plain = Buffer.concat([cipher.update(encrypted.subarray(15, -16)), cipher.final()]); }
		else { const selected = version === 'v10' ? key.keysByVersion.v10 : key.keysByVersion.v11; if (!selected) throw new IdentityError('key_unavailable'); const cipher = createDecipheriv('aes-128-cbc', selected, Buffer.alloc(16, ' ')); plain = Buffer.concat([cipher.update(encrypted.subarray(3)), cipher.final()]); }
		if (databaseVersion === undefined || !Number.isInteger(databaseVersion)) throw new IdentityError('unsupported_cookie');
		let value = plain;
		if (databaseVersion >= 24) { const expected = createHash('sha256').update(host).digest(); if (plain.length < 32 || !plain.subarray(0, 32).equals(expected)) throw new IdentityError('source_unavailable'); value = plain.subarray(32); }
		return new TextDecoder('utf-8', { fatal: true }).decode(value);
	} catch (error) { if (error instanceof IdentityError) throw error; throw new IdentityError('source_unavailable'); }
	finally { plain?.fill(0); encrypted.fill(0); }
}
export function sourceRows(raw: unknown, kind: 'chromium' | 'firefox', key: EncryptionKeyResult | null, domains: readonly string[] = []): unknown[] {
	if (!record(raw) || raw.schemaVersion !== 2 || raw.kind !== kind || !Array.isArray(raw.rows) || raw.rows.length > 50000 || !Array.isArray(raw.columns)) throw new IdentityError('source_unavailable');
	const version = raw.databaseVersion === null ? undefined : Number(raw.databaseVersion);
	return raw.rows.filter((row: unknown) => {
		if (!record(row) || typeof row.host_key !== 'string') throw new IdentityError('source_unavailable');
		return !domains.length || domains.some((domain) => row.host_key === domain || row.host_key === `.${domain}` || (typeof row.host_key === 'string' && row.host_key.endsWith(`.${domain}`)));
	}).map((row: unknown) => {
		if (!record(row) || typeof row.host_key !== 'string' || typeof row.value !== 'string') throw new IdentityError('source_unavailable');
		if (kind === 'firefox' && row.origin_attributes !== null && row.origin_attributes !== '') throw new IdentityError('unsupported_cookie');
		if (kind === 'chromium' && row.is_same_party === 1) throw new IdentityError('unsupported_cookie');
		const value = typeof row.encrypted_value_hex === 'string' && row.encrypted_value_hex ? decrypt(row.encrypted_value_hex, row.host_key, version, key) : row.value;
		let expiry: number;
		try { expiry = kind === 'firefox' ? Number(row.expiry) : Number(BigInt(String(row.expires_utc)) - 11644473600000000n) / 1000000; } catch { throw new IdentityError('source_unavailable'); }
		if (!Number.isFinite(expiry) || Math.abs(expiry) > Number.MAX_SAFE_INTEGER) throw new IdentityError('source_unavailable');
		const session = kind === 'chromium' ? row.has_expires === 0 || String(row.expires_utc) === '0' : String(row.expiry) === '0';
		const sameSite = row.samesite === -1 ? undefined : row.samesite === 0 ? 'None' : row.samesite === 1 ? 'Lax' : row.samesite === 2 ? 'Strict' : null;
		if (sameSite === null || row.is_secure !== 0 && row.is_secure !== 1 || row.is_httponly !== 0 && row.is_httponly !== 1) throw new IdentityError('unsupported_cookie');
		let partitionKey: { topLevelSite: string; hasCrossSiteAncestor: boolean } | undefined;
		if (row.top_frame_site_key !== null && row.top_frame_site_key !== undefined && row.top_frame_site_key !== '') {
			if (typeof row.top_frame_site_key !== 'string' || row.has_cross_site_ancestor !== 0 && row.has_cross_site_ancestor !== 1) throw new IdentityError('unsupported_cookie');
			partitionKey = { topLevelSite: row.top_frame_site_key, hasCrossSiteAncestor: row.has_cross_site_ancestor === 1 };
		}
		return { name: row.name, value, domain: row.host_key, hostOnly: !row.host_key.startsWith('.'), path: row.path, secure: row.is_secure === 1, httpOnly: row.is_httponly === 1, session, ...(session ? {} : { expires: expiry }), ...(sameSite ? { sameSite } : {}),
			...(partitionKey ? { partitionKey } : {}), ...(row.priority !== null && row.priority !== undefined ? { priority: ['Low', 'Medium', 'High'][Number(row.priority)] ?? 'unsupported' } : {}),
			...(row.source_scheme !== null && row.source_scheme !== undefined ? { sourceScheme: ['Unset', 'NonSecure', 'Secure'][Number(row.source_scheme)] ?? 'unsupported' } : {}), ...(row.source_port !== null && row.source_port !== undefined ? { sourcePort: row.source_port } : {}) };
	});
}
