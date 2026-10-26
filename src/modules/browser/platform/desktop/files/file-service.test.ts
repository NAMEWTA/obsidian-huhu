import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestBrowserProtector } from '../../../../../../test/fixtures/browser-protector';
import { DesktopBrowserFileService } from './file-service';
import type { BrowserFileScope } from '../../../core/files';

const roots: string[] = [], services: DesktopBrowserFileService[] = [];
afterEach(async () => { await Promise.all(services.splice(0).map((service) => service.dispose().catch(() => undefined))); await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });
const scope = (runId = 'run-A', spaceId = 'space-A'): BrowserFileScope => ({ spaceId, execution: { kind: 'agent', runId } });
async function setup(provider: TestBrowserProtector['provider'] = 'available', ephemeral = false) {
	// Compare paths within the physical root, including Windows 8.3 temporary-directory aliases.
	const root = await fs.realpath(await fs.mkdtemp(path.join(tmpdir(), 'huhu-files-'))); roots.push(root); const protector = new TestBrowserProtector(); protector.provider = provider;
	const cancelDownload = vi.fn(async () => undefined), options = { directory: path.join(root, 'managed'), metadataProtector: protector, metadataScope: 'test-vault-device', allowEphemeralFiles: () => ephemeral, downloadDirectory: (spaceId: string) => path.join(root, 'downloads', spaceId), cancelDownload };
	const service = new DesktopBrowserFileService(options); services.push(service); await service.ready; const source = path.join(root, 'private-original.txt'); await fs.writeFile(source, 'private file content');
	return { root, source, protector, options, service, cancelDownload };
}
describe('scoped browser files', () => {
	it('copies the explicit source privately and grants exactly one consume to its original Run', async () => {
		const { service, source, options } = await setup(); const { file } = await service.grantUpload(source, scope());
		await fs.writeFile(source, 'changed original'); await expect(service.consumeUpload(file.id, scope('run-B'))).rejects.toMatchObject({ code: 'file_scope_mismatch' });
		expect(service.listFiles(scope('run-B'))).toEqual([]); const managed = await service.consumeUpload(file.id, scope()); expect(await fs.readFile(managed, 'utf8')).toBe('private file content');
		expect(path.basename(managed)).toBe('private-original.txt'); expect(path.dirname(managed)).toBe(path.join(options.directory, 'data', file.id)); expect(managed).not.toBe(source);
		await expect(service.consumeUpload(file.id, scope())).rejects.toMatchObject({ code: 'file_grant_invalid' });
		if (process.platform !== 'win32') expect((await fs.stat(managed)).mode & 0o777).toBe(0o600);
	});
	it('binds human uploads to exact viewer and epoch; tampered copies and source links are rejected', async () => {
		const { service, source, root, options } = await setup(); const human: BrowserFileScope = { spaceId: 'space-A', execution: { kind: 'human', viewerId: 'viewer-A', epoch: 2 } };
		const { file } = await service.grantUpload(source, human); await expect(service.consumeUpload(file.id, { ...human, execution: { kind: 'human', viewerId: 'viewer-A', epoch: 3 } })).rejects.toMatchObject({ code: 'file_scope_mismatch' });
		await fs.writeFile(path.join(options.directory, 'data', file.id, file.name), 'tampered'); await expect(service.consumeUpload(file.id, human)).rejects.toMatchObject({ code: 'file_changed' });
		await fs.symlink(source, path.join(root, 'link')); await expect(service.grantUpload(path.join(root, 'link'), human)).rejects.toMatchObject({ code: 'file_path_invalid' });
	});
	it('encrypted metadata survives restart, but consumed or unconsumed upload grants never do', async () => {
		const { service, source, options } = await setup(); const { file } = await service.grantUpload(source, scope());
		const metadata = await fs.readFile(path.join(options.directory, 'metadata.sealed'), 'utf8'); expect(metadata).not.toContain(source); expect(metadata).not.toContain('private-original'); await service.dispose();
		const reopened = new DesktopBrowserFileService(options); services.push(reopened); await reopened.ready; expect(reopened.listSpaceFiles('space-A').map((item) => item.id)).toEqual([file.id]);
		expect(await fs.readdir(path.join(options.directory, 'data', file.id))).toEqual(['private-original.txt']);
		await expect(reopened.consumeUpload(file.id, scope())).rejects.toMatchObject({ code: 'file_grant_invalid' });
	});
	it('correlates concurrent download GUIDs with their originating scopes and exports without overwrite', async () => {
		const { service, root, options } = await setup(); const a = randomUUID(), b = randomUUID(); await fs.mkdir(options.downloadDirectory('space-A'), { recursive: true });
		service.beginDownload(a, 'page-A', scope(), '../../same.txt'); service.beginDownload(b, 'page-B', scope('run-B'), 'same.txt');
		await fs.writeFile(path.join(options.downloadDirectory('space-A'), a), 'A'); await fs.writeFile(path.join(options.downloadDirectory('space-A'), b), 'B');
		const [downloadA, downloadB] = await Promise.all([service.updateDownload(a, { state: 'completed', receivedBytes: 1 }), service.updateDownload(b, { state: 'completed', receivedBytes: 1 })]);
		expect(downloadA.state).toBe('completed'); expect(downloadB.state).toBe('completed'); expect(service.listFiles(scope()).map((item) => item.id)).toEqual([downloadA.fileId]);
		const exported = path.join(root, 'exported.txt'); await service.exportForUser('space-A', downloadA.fileId!, exported); expect(await fs.readFile(exported, 'utf8')).toBe('A');
		await expect(service.exportForUser('space-A', downloadB.fileId!, exported)).rejects.toMatchObject({ code: 'file_exists' }); expect(await fs.readFile(exported, 'utf8')).toBe('A');
		await expect(service.exportForUser('space-B', downloadB.fileId!, path.join(root, 'other.txt'))).rejects.toMatchObject({ code: 'file_scope_mismatch' });
	});
	it('cancels oversized downloads and refuses oversized uploads without copying their contents', async () => {
		const { service, root, cancelDownload } = await setup(); const id = randomUUID(); service.beginDownload(id, 'page-A', scope(), 'huge');
		expect((await service.updateDownload(id, { state: 'inProgress', receivedBytes: 1, totalBytes: 101 * 1024 * 1024 })).state).toBe('failed'); expect(cancelDownload).toHaveBeenCalledWith('space-A', id);
		const huge = path.join(root, 'sparse'); const handle = await fs.open(huge, 'w'); await handle.truncate(101 * 1024 * 1024); await handle.close();
		await expect(service.grantUpload(huge, scope())).rejects.toMatchObject({ code: 'file_too_large' });
	});
	it('requires explicit ephemeral consent on a weak provider and removes those copies on disposal', async () => {
		const denied = await setup('weak-provider'); await expect(denied.service.grantUpload(denied.source, scope())).rejects.toMatchObject({ code: 'key_unavailable' });
		const allowed = await setup('weak-provider', true); const { file } = await allowed.service.grantUpload(allowed.source, scope()); await allowed.service.dispose();
		await expect(fs.stat(path.join(allowed.options.directory, 'data', file.id))).rejects.toMatchObject({ code: 'ENOENT' }); expect(await fs.readdir(allowed.options.directory)).toEqual(['data']);
	});
	it('wrong-Space removal does not revoke a valid grant; deleting one file and one Space removes only their data', async () => {
		const { service, source, options } = await setup(); const a = await service.grantUpload(source, scope()), b = await service.grantUpload(source, scope('run-B', 'space-B'));
		await expect(service.removeFile('space-B', a.file.id)).rejects.toMatchObject({ code: 'file_scope_mismatch' }); await expect(service.consumeUpload(a.file.id, scope())).resolves.toContain(a.file.id);
		await service.removeFile('space-A', a.file.id); expect(service.listSpaceFiles('space-A')).toEqual([]); expect(service.listSpaceFiles('space-B')).toHaveLength(1);
		await service.removeSpace('space-B'); expect(service.listSpaceFiles('space-B')).toEqual([]); await expect(fs.stat(path.join(options.directory, 'data', b.file.id))).rejects.toMatchObject({ code: 'ENOENT' });
	});
	it('a replaced managed data directory cannot redirect reads or cleanup outside its owned root', async () => {
		const { service, source, root, options } = await setup(); const { file } = await service.grantUpload(source, scope()); const external = path.join(root, 'external'); await fs.mkdir(external); await fs.writeFile(path.join(external, file.id), 'sentinel');
		await fs.rename(path.join(options.directory, 'data'), path.join(options.directory, 'old-data')); await fs.symlink(external, path.join(options.directory, 'data'));
		await expect(service.consumeUpload(file.id, scope())).rejects.toMatchObject({ code: 'file_path_invalid' }); await expect(service.removeFile('space-A', file.id)).rejects.toMatchObject({ code: 'file_path_invalid' });
		expect(await fs.readFile(path.join(external, file.id), 'utf8')).toBe('sentinel');
	});
	it('a missing encrypted index cannot be treated as an empty file collection or delete durable content', async () => {
		const { service, source, options } = await setup(); const { file } = await service.grantUpload(source, scope()); await service.dispose(); await fs.unlink(path.join(options.directory, 'metadata.sealed'));
		const reopened = new DesktopBrowserFileService(options); services.push(reopened); await expect(reopened.ready).rejects.toMatchObject({ code: 'file_corrupt' });
		expect(await fs.readFile(path.join(options.directory, 'data', file.id, file.name), 'utf8')).toBe('private file content'); await expect(fs.stat(path.join(options.directory, 'metadata.sealed'))).rejects.toMatchObject({ code: 'ENOENT' });
	});
	it('an indexed file missing from disk is corruption, without silently forgetting the other files', async () => {
		const { service, source, options } = await setup(); const a = await service.grantUpload(source, scope()), b = await service.grantUpload(source, scope()); await service.dispose(); await fs.unlink(path.join(options.directory, 'data', a.file.id, a.file.name));
		const reopened = new DesktopBrowserFileService(options); services.push(reopened); await expect(reopened.ready).rejects.toMatchObject({ code: 'file_corrupt' }); expect(await fs.readFile(path.join(options.directory, 'data', b.file.id, b.file.name), 'utf8')).toBe('private file content');
	});
	it('boot recovery deletes only explicitly marked ephemeral copies when the OS provider is unavailable', async () => {
		const { service, options } = await setup('unavailable', true); await service.dispose(); const id = randomUUID(), directory = path.join(options.directory, 'data', id); await fs.mkdir(directory, { mode: 0o700 }); await fs.writeFile(path.join(directory, 'original.pdf'), 'crashed temporary content', { mode: 0o600 }); await fs.writeFile(path.join(options.directory, 'data', `${id}.ephemeral`), '', { mode: 0o600 });
		const reopened = new DesktopBrowserFileService(options); services.push(reopened); await reopened.ready; expect(await fs.readdir(path.join(options.directory, 'data'))).toEqual([]); expect(reopened.listSpaceFiles('space-A')).toEqual([]);
	});
	it('same-named uploads preserve their names and extensions inside independent opaque directories', async () => {
		const { service, root, options } = await setup(); const first = path.join(root, 'first'), second = path.join(root, 'second'); await fs.mkdir(first); await fs.mkdir(second);
		const filename = '合同-附件.pdf'; await fs.writeFile(path.join(first, filename), 'first content'); await fs.writeFile(path.join(second, filename), 'second content');
		const a = await service.grantUpload(path.join(first, filename), scope()), b = await service.grantUpload(path.join(second, filename), scope('run-B'));
		const [aPath, bPath] = await Promise.all([service.consumeUpload(a.file.id, scope()), service.consumeUpload(b.file.id, scope('run-B'))]);
		expect(a.file.id).not.toBe(b.file.id); expect(path.basename(aPath)).toBe(filename); expect(path.basename(bPath)).toBe(filename);
		expect(path.dirname(aPath)).toBe(path.join(options.directory, 'data', a.file.id)); expect(path.dirname(bPath)).toBe(path.join(options.directory, 'data', b.file.id));
		expect(await fs.readFile(aPath, 'utf8')).toBe('first content'); expect(await fs.readFile(bPath, 'utf8')).toBe('second content');
		await service.removeFile('space-A', a.file.id); await expect(fs.stat(path.dirname(aPath))).rejects.toMatchObject({ code: 'ENOENT' }); expect(await fs.readFile(bPath, 'utf8')).toBe('second content');
	});
	it('a replaced per-file directory cannot redirect uploads, exports, removal or restart reads', async () => {
		const { service, source, root, options } = await setup(); const { file } = await service.grantUpload(source, scope());
		const directory = path.join(options.directory, 'data', file.id), external = path.join(root, 'external'); await fs.mkdir(external); await fs.writeFile(path.join(external, file.name), 'sentinel');
		await fs.rename(directory, path.join(root, 'saved-payload')); await fs.symlink(external, directory);
		await expect(service.consumeUpload(file.id, scope())).rejects.toMatchObject({ code: 'file_path_invalid' });
		await expect(service.exportForUser('space-A', file.id, path.join(root, 'exported'))).rejects.toMatchObject({ code: 'file_path_invalid' });
		await expect(service.removeFile('space-A', file.id)).rejects.toMatchObject({ code: 'file_path_invalid' });
		const reopened = new DesktopBrowserFileService(options); services.push(reopened); await expect(reopened.ready).rejects.toMatchObject({ code: 'file_corrupt' });
		expect(await fs.readFile(path.join(external, file.name), 'utf8')).toBe('sentinel');
	});
});
