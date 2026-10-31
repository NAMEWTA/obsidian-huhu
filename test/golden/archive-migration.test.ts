import { afterEach, expect, test, vi } from 'vitest';
import { fileURLToPath } from 'node:url';
import { createMarkdown } from '../../src/modules/archives/core/persist/markdown';
import { newRecord } from '../../src/modules/archives/core/model';
import { parseRecord } from '../../src/modules/archives/core/persist/markdown';
import { decodeOperation } from '../../src/modules/archives/core/generic/operations';
import { frontmatter } from '../../src/modules/archives/core/generic/markdown';
import { backupPath, migrationPath } from '../../src/modules/archives/core/generic/paths';
import { digest } from '../../src/modules/archives/core/schema/value';
import { memoryArchives } from '../../src/modules/archives/services/generic/test-port';
import { RecoveryCommands } from '../../src/modules/archives/services/generic/recovery';
import { setLanguage } from '../../src/shared/i18n';

const root = 'huhu/档案';

afterEach(() => {
	vi.useRealTimers();
	setLanguage('zh');
});

test('company migration keeps an original-byte backup, the attachment, and a portable receipt', async () => {
	setLanguage('en');
	vi.useFakeTimers({ now: new Date('2026-10-27T00:00:00.000Z'), toFake: ['Date'] });
	const record = newRecord('company');
	record.id = 'company-001';
	record.path = `${root}/企业档案/Example/基本信息.md`;
	record.fields.name = 'Example';
	record.prose.notes = 'Original company notes';
	const source = createMarkdown(record) + '\n![source attachment](source.pdf)\n';
	const { runtime, files } = await memoryArchives(new Map([[record.path, source]]));
	const recovery = new RecoveryCommands(runtime);
	const plan = await recovery.prepareMigration({
		operationId: 'migration-company-001',
		id: record.id,
		expectedHash: await digest(source),
	});
	await recovery.execute({ operationId: plan.id });
	const backup = backupPath(root, plan.id, record.id);
	const receipt = migrationPath(root, plan.id);
	expect(files.text.get(backup)).toBe(source);
	expect(files.text.get(backup)).toContain('![source attachment](source.pdf)');
	const owner = files.text.get(record.path)!;
	expect(owner).toContain('![source attachment](source.pdf)');
	expect(owner).toContain('Original company notes');
	expect(parseRecord(owner, record.path)).toBeNull();
	expect(frontmatter(owner)['huhu-format-version']).toBe(2);
	expect(frontmatter(owner)['huhu-id']).toBe('company-001');
	expect(frontmatter(owner)['huhu-created-at']).toBeUndefined();
	expect(runtime.index.get(record.id)?.format).toBe(2);
	const operation = decodeOperation(files.text.get(receipt)!);
	expect(operation).toMatchObject({
		id: 'migration-company-001',
		kind: 'migration',
		ownerId: 'company-001',
		state: 'committed',
		createdAt: Date.parse('2026-10-27T00:00:00.000Z'),
		edges: [],
	});
	expect(operation.collectionId).toMatch(/^[0-9a-f-]{36}$/);
	expect(operation.owner.backupPath).toBe(backup);
	expect(operation.owner.after).toBe(owner);
	// The collection id is assigned once per vault and is not part of the company record.
	const receiptText = files.text.get(receipt)!.replaceAll(operation.collectionId, 'collection-id');
	const selected = [record.path, receipt, backup];
	const rendered = [owner, receiptText, files.text.get(backup)!]
		.map((text, index) => `FILE ${selected[index]}\n${text}`)
		.join('\n\n');
	await expect(rendered).toMatchFileSnapshot(
		fileURLToPath(new URL('./__snapshots__/archive-migration-v2.md', import.meta.url)),
	);
	runtime.dispose();
});
