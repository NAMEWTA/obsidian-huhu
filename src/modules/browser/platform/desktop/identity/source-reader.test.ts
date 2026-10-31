import { promises as fs } from 'node:fs';
import { createCipheriv, createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DesktopIdentitySourceReader, sourceRows } from './source-reader';
import { planIdentityImport } from '../../../core/identity';

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });
const row = { host_key: '.example.com', name: 'sid', value: 'plain', encrypted_value_hex: '', path: '/', expires_utc: '13390000000000001', has_expires: 1, is_secure: 1, is_httponly: 1, samesite: 1, top_frame_site_key: 'https://top.example', has_cross_site_ancestor: 1, priority: 2, source_scheme: 2, source_port: 443, is_same_party: 0 };
const response = (rows: unknown[], version: string | null = '24', kind = 'chromium') => ({ schemaVersion: 2, kind, databaseVersion: version, columns: kind === 'chromium' ? Object.keys(row).map(key => key === 'encrypted_value_hex' ? 'encrypted_value' : key) : ['host', 'name', 'value', 'path', 'expiry', 'isSecure', 'isHttpOnly', 'sameSite', 'originAttributes'], rows });
describe('explicit source grants and source cookie semantics', () => {
	it('checks reader field capabilities instead of accepting lost modern partition semantics', () => {
		const modern = response([{ ...row, top_frame_site_key: null, has_cross_site_ancestor: null }]); modern.columns = modern.columns.filter(column => !['top_frame_site_key', 'has_cross_site_ancestor'].includes(column));
		expect(() => sourceRows(modern, 'chromium', null)).toThrow('unsupported_cookie');
		const old = response([{ ...row, top_frame_site_key: '', has_cross_site_ancestor: null }], '22'); old.columns = old.columns.filter(column => column !== 'has_cross_site_ancestor');
		expect(sourceRows(old, 'chromium', null)).toMatchObject([{ domain: '.example.com', value: 'plain' }]);
		expect(() => sourceRows({ ...old, rows: [{ ...row, has_cross_site_ancestor: null }] }, 'chromium', null)).toThrow('unsupported_cookie');
		const legacy = response([{ ...row, top_frame_site_key: null, has_cross_site_ancestor: null, source_scheme: null, source_port: null, is_same_party: null }], '11'); legacy.columns = legacy.columns.filter(column => !['top_frame_site_key', 'has_cross_site_ancestor', 'source_scheme', 'source_port', 'is_same_party'].includes(column));
		expect(sourceRows(legacy, 'chromium', null)).toMatchObject([{ value: 'plain', domain: '.example.com' }]);
		for (const field of ['encrypted_value_hex', 'priority', 'source_scheme', 'source_port']) expect(() => sourceRows(response([{ ...row, [field]: null }]), 'chromium', null)).toThrow('unsupported_cookie');
	});
	it('cancels only the selected source read and consumes its grant without affecting another import', async () => {
		const root = await fs.mkdtemp(path.join(tmpdir(), 'huhu-source-cancel-')); roots.push(root); const file = path.join(root, 'cookies.json'); await fs.writeFile(file, '[]');
		const reader = new DesktopIdentitySourceReader({ temporaryDirectory: path.join(root, 'staging'), readerExecutable: async () => 'unused', recordCleanupFailure: async () => {} }), controller = new AbortController();
		const cancelled = reader.issueFileGrant(file), other = reader.issueFileGrant(file); controller.abort();
		await expect(reader.captureFileText(cancelled.id, controller.signal)).rejects.toMatchObject({ code: 'cancelled' });
		await expect(reader.captureFileText(cancelled.id)).rejects.toMatchObject({ code: 'source_grant_invalid' }); expect(await reader.captureFileText(other.id)).toBe('[]'); await reader.dispose();
	});
	it('returns a raw UTF8 file for accurate preflight exactly once, without invoking a native browser', async () => {
		const root = await fs.mkdtemp(path.join(tmpdir(), 'huhu-source-')); roots.push(root); const raw = JSON.stringify([{ domain: 'example.com', name: 'bad' }]); const file = path.join(root, 'cookies.json'); await fs.writeFile(file, raw);
		const executable = vi.fn(async () => 'must-not-run'), reader = new DesktopIdentitySourceReader({ temporaryDirectory: path.join(root, 'staging'), readerExecutable: executable, recordCleanupFailure: async () => undefined });
		const grant = reader.issueFileGrant(file); expect(await reader.captureFileText(grant.id)).toBe(raw); expect(planIdentityImport(raw, 0).counts.invalid).toBe(1); expect(executable).not.toHaveBeenCalled();
		await expect(reader.captureFileText(grant.id)).rejects.toMatchObject({ code: 'source_grant_invalid' }); await reader.dispose();
	});
	it('rejects expired grants, symlinks and revoked in-flight file reads', async () => {
		const root = await fs.mkdtemp(path.join(tmpdir(), 'huhu-source-')); roots.push(root); const file = path.join(root, 'cookies.json'); await fs.writeFile(file, '[]'); await fs.symlink(file, path.join(root, 'link')); let at = 0;
		const reader = new DesktopIdentitySourceReader({ temporaryDirectory: path.join(root, 'staging'), readerExecutable: async () => 'unused', recordCleanupFailure: async () => undefined, clock: () => at });
		const expired = reader.issueFileGrant(file); at = 60001; await expect(reader.captureFileText(expired.id)).rejects.toMatchObject({ code: 'source_grant_invalid' });
		await expect(reader.captureFileText(reader.issueFileGrant(path.join(root, 'link')).id)).rejects.toMatchObject({ code: 'source_unavailable' });
		const active = reader.captureFileText(reader.issueFileGrant(file).id); reader.revoke(); await expect(active).rejects.toMatchObject({ code: 'cancelled' }); await reader.dispose();
	});
	it('preserves full partition/source semantics and microsecond timestamps without early integer rounding', () => {
		const cookies = sourceRows(response([row]), 'chromium', null) as Record<string, unknown>[];
		expect(cookies[0]).toMatchObject({ domain: '.example.com', hostOnly: false, expires: 1745526400.000001, priority: 'High', sourceScheme: 'Secure', sourcePort: 443, partitionKey: { topLevelSite: 'https://top.example', hasCrossSiteAncestor: true } });
		expect(() => sourceRows(response([{ ...row, has_cross_site_ancestor: null }]), 'chromium', null)).toThrow('unsupported_cookie');
		expect(() => sourceRows(response([{ ...row, origin_attributes: '^userContextId=1', expiry: '2000000000' }], null, 'firefox'), 'firefox', null)).toThrow('unsupported_cookie');
	});
	it('decrypts schema24 only after verifying the exact host binding; older schemas retain all leading plaintext bytes', () => {
		const key = Buffer.alloc(16, 7);
		const encrypt = (plain: Buffer) => { const cipher = createCipheriv('aes-128-cbc', key, Buffer.alloc(16, ' ')); return Buffer.concat([Buffer.from('v10'), cipher.update(plain), cipher.final()]).toString('hex'); };
		const encrypted = encrypt(Buffer.concat([createHash('sha256').update(row.host_key).digest(), Buffer.from('decrypted-secret')]));
		expect(sourceRows(response([{ ...row, encrypted_value_hex: encrypted }]), 'chromium', { mode: 'aes-128-cbc', keysByVersion: { v10: key } })).toMatchObject([{ value: 'decrypted-secret' }]);
		expect(() => sourceRows(response([{ ...row, host_key: '.different.com', encrypted_value_hex: encrypted }]), 'chromium', { mode: 'aes-128-cbc', keysByVersion: { v10: key } })).toThrow('source_unavailable');
		const old = 'x'.repeat(40); expect(sourceRows(response([{ ...row, encrypted_value_hex: encrypt(Buffer.from(old)) }], '23'), 'chromium', { mode: 'aes-128-cbc', keysByVersion: { v10: key } })).toMatchObject([{ value: old }]);
		expect(() => sourceRows(response([{ ...row, encrypted_value_hex: '76323001' }]), 'chromium', { mode: 'aes-128-cbc', keysByVersion: { v10: key } })).toThrow('unsupported_cookie');
	});
	it('filters source domains before touching unrelated unsupported encrypted credentials', () => {
		const bad = { ...row, host_key: '.other.example', encrypted_value_hex: '76323001' };
		expect(sourceRows(response([row, bad]), 'chromium', null, ['example.com'])).toHaveLength(1);
	});
	it.skipIf(process.platform === 'win32')('spawns the independent reader with a minimal environment and deletes the owned source snapshot', async () => {
		const root = await fs.mkdtemp(path.join(tmpdir(), 'huhu-source-env-')); roots.push(root); const profile = path.join(root, 'source'); await fs.mkdir(profile); const database = path.join(profile, 'cookies.sqlite'); await fs.writeFile(database, 'fixture database');
		const helper = path.join(root, 'reader.sh');
		const answer = response([{ ...row, host_key: 'example.com', top_frame_site_key: '', expiry: '2000000000', origin_attributes: '' }], null, 'firefox');
		await fs.writeFile(helper, `#!/bin/sh\nread -r request\nif [ -n "$HUHU_BROWSER_SOURCE_TEST_SECRET" ] || [ -n "$NODE_OPTIONS" ]; then exit 22; fi\nprintf '%s' '${JSON.stringify(answer)}'\n`, { mode: 0o700 });
		const original = process.env.HUHU_BROWSER_SOURCE_TEST_SECRET, originalNode = process.env.NODE_OPTIONS;
		process.env.HUHU_BROWSER_SOURCE_TEST_SECRET = 'must-not-inherit'; process.env.NODE_OPTIONS = '--inspect=12345';
		try {
			const temporaryDirectory = path.join(root, 'import-staging'), reader = new DesktopIdentitySourceReader({ temporaryDirectory, readerExecutable: async () => helper, recordCleanupFailure: async () => undefined });
			const grant = reader.issueBrowserGrant({ family: 'fixture', label: 'Fixture', root: profile, kind: 'firefox', profiles: [{ name: 'Default', directory: 'default', cookiesPath: database }] }, 'default');
			const captured = await reader.capture(grant.id); expect(captured.seed.cookies[0]?.value).toBe('plain'); expect(captured.capture).toMatchObject({ readerSchemaVersion: 2, consistency: 'stable-sqlite-snapshot', digestKind: 'reader-response', fields: expect.arrayContaining(['originAttributes']) }); expect(await fs.readdir(temporaryDirectory)).toEqual([]);
			const remove = fs.rm.bind(fs), recordCleanupFailure = vi.fn(async () => {}), failed = new DesktopIdentitySourceReader({ temporaryDirectory, readerExecutable: async () => helper, recordCleanupFailure });
			const intercept = vi.spyOn(fs, 'rm').mockImplementation(async (file, options) => { if (typeof file === 'string' && path.dirname(file) === temporaryDirectory) throw new Error('SYNTHETIC_PRIVATE_PATH'); return remove(file, options); });
			try { await expect(failed.capture(failed.issueBrowserGrant({ family: 'fixture', label: 'Fixture', root: profile, kind: 'firefox', profiles: [{ name: 'Default', directory: 'default', cookiesPath: database }] }, 'default').id)).rejects.toMatchObject({ code: 'cleanup_pending' }); expect(recordCleanupFailure).toHaveBeenCalledOnce(); }
			finally { intercept.mockRestore(); await failed.dispose(); await reader.dispose(); }
		} finally {
			if (original === undefined) delete process.env.HUHU_BROWSER_SOURCE_TEST_SECRET; else process.env.HUHU_BROWSER_SOURCE_TEST_SECRET = original;
			if (originalNode === undefined) delete process.env.NODE_OPTIONS; else process.env.NODE_OPTIONS = originalNode;
		}
	});
});
