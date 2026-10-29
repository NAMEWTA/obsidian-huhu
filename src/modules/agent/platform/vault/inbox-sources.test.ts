import { expect, test } from 'vitest';
import { inspectInboxSource, validateInboxSource, validateInboxSourcePath } from './inbox-sources';

test('metadata validation never reads source content and rechecks versions', async () => {
	const file = { path: 'notes/a.md', stat: { size: 12, mtime: 5 } };
	const port = { vaultId: 'v', getFileByPath: (path: string) => path === file.path ? file : null, stat: async (value: typeof file) => value.stat };
	const validated = await validateInboxSource(port, { kind: 'vault-file', vaultId: 'v', path: file.path, version: { size: 12, mtime: 5 } });
	expect(validated.metadata).toMatchObject({ path: file.path, size: 12, mtime: 5 });
	await expect(validateInboxSource(port, { kind: 'vault-file', vaultId: 'v', path: file.path, version: { size: 99 } })).rejects.toThrow('inbox-source-changed');
	expect(validateInboxSourcePath('../escape')).toBe(false);
	expect(await inspectInboxSource(port, { kind: 'vault-file', vaultId: 'v', path: 'missing.md' })).toEqual({ status: 'missing' });
});
