import { promises as fs, constants } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createDecipheriv, createHash, randomUUID } from 'node:crypto';
import { setTimeout as schedule, clearTimeout as cancel } from 'node:timers';
import type { DetectedBrowser } from '../../../core/cookies';
import { IdentityError, MAX_IDENTITY_BYTES, planIdentityImport, requireStrictIdentityPlan, clearIdentitySeed, type IdentitySeedV1, type IdentityCapture } from '../../../core/identity';
import { copyStableDatabase } from '../cookies/snapshot';
import { getEncryptionKey, type EncryptionKeyResult } from '../cookies/keys';
import { privateDirectory } from '../persistence/private-files';

export interface IdentitySourceGrant { id: string; kind: 'cookie-file' | 'browser-source'; expiresAt: number }
interface CapturedSource { seed: IdentitySeedV1; source: 'cookie-file' | 'browser-source'; capturedAt: number; consistency: 'fixed-file' | 'stable-sqlite-snapshot'; capture: IdentityCapture }
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
	private track<T>(work: (signal: AbortSignal) => Promise<T>, signal?: AbortSignal): Promise<T> {
		const controller = new AbortController(); this.active.add(controller);
		const abort = () => controller.abort(); if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true });
		const task = Promise.resolve().then(() => { if (controller.signal.aborted) throw new IdentityError('cancelled'); return work(controller.signal); }).catch(error => { throw error instanceof IdentityError ? error : new IdentityError('source_unavailable'); }).finally(() => { signal?.removeEventListener('abort', abort); this.active.delete(controller); this.tasks.delete(task); }); this.tasks.add(task); return task;
	}
	private consume(id: string) {
		if (this.disposed) throw new IdentityError('source_grant_invalid');
		const grant = this.grants.get(id); this.grants.delete(id);
		if (!grant || grant.expiresAt <= this.clock()) throw new IdentityError('source_grant_invalid'); return grant;
	}
	captureFileText(id: string, signal?: AbortSignal): Promise<string> {
		return this.captureText(id, signal).then(result => result.text);
	}
	captureText(id: string, signal?: AbortSignal): Promise<{ text: string; capture: IdentityCapture }> {
		return this.track<{ text: string; capture: IdentityCapture }>(async (signal) => {
			const grant = this.consume(id), generation = this.generation, startedAt = this.clock();
			if (grant.source.kind !== 'cookie-file') throw new IdentityError('source_grant_invalid');
			const fixed = await fixedText(grant.source.path, MAX_IDENTITY_BYTES);
			if (this.disposed || signal.aborted || generation !== this.generation) throw new IdentityError('cancelled');
			if (grant.expiresAt <= this.clock()) throw new IdentityError('source_grant_invalid'); return { text: fixed.text, capture: { startedAt, completedAt: this.clock(), consistency: 'fixed-file', digestKind: 'source-bytes', sha256: fixed.sha256 } };
		}, signal).finally(() => { this.grants.delete(id); });
	}
	capture(id: string, signal?: AbortSignal): Promise<CapturedSource> { return this.track((signal) => this.captureOnce(id, signal), signal).finally(() => { this.grants.delete(id); }); }
	private async captureOnce(id: string, signal: AbortSignal): Promise<CapturedSource> {
		const grant = this.consume(id), generation = this.generation, startedAt = this.clock();
		const check = () => { if (this.disposed || signal.aborted || generation !== this.generation) throw new IdentityError('cancelled'); if (grant.expiresAt <= this.clock()) throw new IdentityError('source_grant_invalid'); };
		check();
		if (grant.source.kind === 'cookie-file') { const fixed = await fixedText(grant.source.path, MAX_IDENTITY_BYTES); check(); return { seed: requireStrictIdentityPlan(planIdentityImport(fixed.text, this.clock())), source: 'cookie-file', capturedAt: this.clock(), consistency: 'fixed-file', capture: { startedAt, completedAt: this.clock(), consistency: 'fixed-file', digestKind: 'source-bytes', sha256: fixed.sha256 } }; }
		const { browser, profileDir, domains } = grant.source, profile = browser.profiles.find((item) => item.directory === profileDir);
		if (!profile) throw new IdentityError('source_grant_invalid');
		const parent = await privateDirectory(this.options.temporaryDirectory), temporary = join(parent, randomUUID());
		await fs.mkdir(temporary, { mode: 0o700 }); let key: EncryptionKeyResult | null = null, seed: IdentitySeedV1 | undefined, outcome: CapturedSource | undefined, failure: IdentityError | undefined;
		try {
			if (await fs.realpath(dirname(profile.cookiesPath)) !== resolve(dirname(profile.cookiesPath))) throw new IdentityError('source_unavailable');
			for (const suffix of ['', '-wal', '-shm']) {
				try { const stat = await fs.lstat(profile.cookiesPath + suffix); if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > 256 * 1024 * 1024) throw new IdentityError('source_unavailable'); }
				catch (error) { if (suffix && (error as NodeJS.ErrnoException).code === 'ENOENT') continue; throw error; }
			}
			await copyStableDatabase(profile.cookiesPath, join(temporary, 'Cookies')); check();
			if (await fs.realpath(dirname(profile.cookiesPath)) !== resolve(dirname(profile.cookiesPath))) throw new IdentityError('source_changed');
			if (browser.kind === 'chromium') {
				if (process.platform === 'win32') { const state = await fixedText(join(browser.root, 'Local State'), 16 * 1024 * 1024); check(); await fs.writeFile(join(temporary, 'Local State'), state.text, { mode: 0o600, flag: 'wx' }); }
				key = await getEncryptionKey({ ...browser, root: process.platform === 'win32' ? temporary : browser.root }); check();
			}
			const executable = await this.options.readerExecutable(); check();
			const raw = await readNative(executable, join(temporary, 'Cookies'), browser.kind, signal); check();
			seed = requireStrictIdentityPlan(planIdentityImport(JSON.stringify(sourceRows(raw, browser.kind, key, domains)), this.clock())); check();
			const metadata = raw as { columns: string[]; databaseVersion: string | null };
			outcome = { seed, source: 'browser-source', capturedAt: this.clock(), consistency: 'stable-sqlite-snapshot', capture: { startedAt, completedAt: this.clock(), consistency: 'stable-sqlite-snapshot', digestKind: 'reader-response', sha256: createHash('sha256').update(JSON.stringify(raw)).digest('hex'), readerSchemaVersion: 2, ...(metadata.databaseVersion !== null ? { databaseVersion: Number(metadata.databaseVersion) } : {}), fields: [...metadata.columns].sort() } };
		} catch (error) { if (seed) clearIdentitySeed(seed); failure = error instanceof IdentityError ? error : new IdentityError('source_unavailable'); }
		finally {
			if (key?.mode === 'aes-256-gcm') key.key.fill(0); else if (key?.mode === 'aes-128-cbc') { key.keysByVersion.v10?.fill(0); key.keysByVersion.v11?.fill(0); }
		}
		try { await fs.rm(temporary, { recursive: true, force: true }); } catch { if (seed) clearIdentitySeed(seed); try { await this.options.recordCleanupFailure(temporary); } catch { /* The owned staging directory remains discoverable during cleanup recovery. */ } throw new IdentityError('cleanup_pending'); }
		if (failure) throw failure; if (!outcome) throw new IdentityError('source_unavailable');
		try { check(); } catch (error) { if (seed) clearIdentitySeed(seed); throw error; } return outcome;
	}
}
async function fixedText(file: string, maximum: number): Promise<{ text: string; sha256: string }> {
	// BigInt from the first stat on: NTFS file IDs are 64-bit, and a Number `ino` above 2^53 would never equal the
	// handle's exact value, so an unchanged file read as `source_changed`.
	const stat = await fs.lstat(file, { bigint: true });
	if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== BigInt(1) || stat.size > BigInt(maximum)) throw new IdentityError(stat.size > BigInt(maximum) ? 'too_large' : 'source_unavailable');
	const handle = await fs.open(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
	try {
		const before = await handle.stat({ bigint: true });
		if (!before.isFile() || before.size > BigInt(maximum) || before.ino !== stat.ino || before.dev !== stat.dev) throw new IdentityError('source_changed');
		const bytes = Buffer.alloc(Number(before.size)); let offset = 0;
		try {
			while (offset < bytes.length) { const result = await handle.read(bytes, offset, bytes.length - offset, offset); if (!result.bytesRead) throw new IdentityError('source_changed'); offset += result.bytesRead; }
			const after = await handle.stat({ bigint: true }), current = await fs.lstat(file, { bigint: true });
			if (after.size !== before.size || after.mtimeNs !== before.mtimeNs || after.ctimeNs !== before.ctimeNs || current.ino !== before.ino || current.dev !== before.dev) throw new IdentityError('source_changed');
			try { return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), sha256: createHash('sha256').update(bytes).digest('hex') }; } catch { throw new IdentityError('invalid_format'); }
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
	if (raw.columns.some(column => typeof column !== 'string') || new Set(raw.columns).size !== raw.columns.length || version !== undefined && (!Number.isSafeInteger(version) || version < 1)) throw new IdentityError('source_unavailable');
	const columns = new Set(raw.columns);
	const required = kind === 'chromium' ? ['host_key', 'name', 'value', 'path', 'expires_utc', 'has_expires', 'is_secure', 'is_httponly', 'samesite'] : ['host', 'name', 'value', 'path', 'expiry', 'isSecure', 'isHttpOnly', 'sameSite', 'originAttributes'];
	if (kind === 'chromium') required.push('encrypted_value', 'priority', ...(version !== undefined && version < 12 ? [] : ['source_scheme']), ...(version !== undefined && version < 13 ? [] : ['source_port']));
	if (required.some(column => !columns.has(column))) throw new IdentityError('unsupported_cookie');
	// Chromium's schema history: v15 adds partition keys, v21 removes SameParty,
	// v23 adds the ancestor bit. Known older ordinary cookies remain representable;
	// absent modern fields are not evidence that a cookie was unpartitioned.
	// https://chromium.googlesource.com/chromium/src/+/8f93c3443faacdb1096ada43a496bb07238c3137/net/extras/sqlite/sqlite_persistent_cookie_store.cc
	if (kind === 'chromium' && (!columns.has('top_frame_site_key') && !(version !== undefined && version >= 11 && version < 15) || !columns.has('has_cross_site_ancestor') && !(version !== undefined && version >= 11 && version < 23) || !columns.has('is_same_party') && !(version !== undefined && (version >= 11 && version < 13 || version >= 21)))) throw new IdentityError('unsupported_cookie');
	return raw.rows.filter((row: unknown) => {
		if (!record(row) || typeof row.host_key !== 'string') throw new IdentityError('source_unavailable');
		return !domains.length || domains.some((domain) => row.host_key === domain || row.host_key === `.${domain}` || (typeof row.host_key === 'string' && row.host_key.endsWith(`.${domain}`)));
	}).map((row: unknown) => {
		if (!record(row) || typeof row.host_key !== 'string' || typeof row.value !== 'string') throw new IdentityError('source_unavailable');
		if (kind === 'firefox' && row.origin_attributes !== '') throw new IdentityError('unsupported_cookie');
		if (kind === 'chromium' && (columns.has('is_same_party') && row.is_same_party !== 0 || columns.has('has_cross_site_ancestor') && row.has_cross_site_ancestor !== 0 && row.has_cross_site_ancestor !== 1 || columns.has('top_frame_site_key') && typeof row.top_frame_site_key !== 'string' || row.has_expires !== 0 && row.has_expires !== 1)) throw new IdentityError('unsupported_cookie');
		if (kind === 'chromium' && (typeof row.encrypted_value_hex !== 'string' || ![0, 1, 2].includes(row.priority as number) || columns.has('source_scheme') && ![0, 1, 2].includes(row.source_scheme as number) || columns.has('source_port') && (typeof row.source_port !== 'number' || !Number.isInteger(row.source_port)))) throw new IdentityError('unsupported_cookie');
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
