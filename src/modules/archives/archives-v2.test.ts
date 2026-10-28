import { mkdtemp, readFile, writeFile, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, expect, test } from 'vitest';
import { ContactsApplication } from './core/application';
import type { ContactsFile, ContactsFiles } from './core/files';
import type { ArchiveCreateReceipt, ArchiveValue } from './api';

const cleanups: Array<() => Promise<void>> = [];
afterEach(async () => {
	for (const cleanup of cleanups.splice(0)) await cleanup();
});
async function diskVault() {
	const directory = await mkdtemp(join(tmpdir(), 'huhu-archives-v2-'));
	cleanups.push(() => rm(directory, { recursive: true, force: true }));
	const entries = new Map<string, ContactsFile>(), seen = new Set<string>(), folders = new Set<string>();
	const scan = async (folder = ''): Promise<void> => {
		for (const entry of await readdir(join(directory, folder), { withFileTypes: true })) {
			const path = folder ? `${folder}/${entry.name}` : entry.name;
			if (entry.isDirectory()) { folders.add(path); await scan(path); }
			else {
				const info = await stat(join(directory, path));
				seen.add(path);
				const previous = entries.get(path);
				if (previous) { previous.stat.mtime = info.mtimeMs; previous.stat.size = info.size; }
				else entries.set(path, {
					path,
					extension: entry.name.split('.').at(-1)!,
					stat: { mtime: info.mtimeMs, size: info.size },
				});
			}
		}
	};
	const files: ContactsFiles = {
		formatGuide: '',
		ready: async () => {
			seen.clear(); folders.clear();
			await scan();
			for (const path of entries.keys()) if (!seen.has(path)) entries.delete(path);
		},
		getMarkdownFiles: () => [...entries.values()].filter((file) => file.extension === 'md'),
		getFileByPath: (path) => entries.get(path) ?? null,
		getAbstractFileByPath: (path) => entries.get(path) ?? (folders.has(path) ? { path } : null),
		read: (file) => readFile(join(directory, file.path), 'utf8'),
		cachedRead: (file) => readFile(join(directory, file.path), 'utf8'),
		process: async (file, update, beforeCommit) => {
			beforeCommit?.();
			const result = update(await readFile(join(directory, file.path), 'utf8'));
			await writeFile(join(directory, file.path), result);
			return result;
		},
		create: async (path, content, beforeCommit) => {
			await mkdir(dirname(join(directory, path)), { recursive: true });
			beforeCommit?.();
			await writeFile(join(directory, path), content, { flag: 'wx' });
			const info = await stat(join(directory, path));
			const file = { path, extension: path.split('.').at(-1)!, stat: { mtime: info.mtimeMs, size: info.size } };
			entries.set(path, file);
			return file;
		},
		createBinary: async () => {
			throw new Error('unused');
		},
		listFolder: () => [],
		trashFolder: async () => {
			throw new Error('unused');
		},
		checkFolderEditors: async () => () => {},
		captureEditors: async () => () => {},
		createFolder: async (path) => {
			await mkdir(join(directory, path));
		},
		mkdir: async (path) => {
			await mkdir(join(directory, path), { recursive: true });
		},
		checkEditor: () => {},
	};
	const application = () =>
		new ContactsApplication(files, () => ({ rootFolder: 'huhu/档案', maxColumns: 6, layouts: {} }));
	return { directory, files, application };
}

test('published custom types create portable entities through the production application and reload', async () => {
	const vault = await diskVault(),
		app = vault.application();
	// Capability absence is the first red light; subsequent assertions exercise the same registered service implementation.
	expect(app).toHaveProperty('archives');
	const definition = await app.archives.publishType({
		typeId: 'project',
		label: '项目',
		folder: '项目档案',
		titleFieldId: 'name',
		fields: [{ fieldId: 'name', storageKey: 'project-name', label: '名称', codec: 'text' }],
	});
	const created = await app.archives.createEntity({ typeId: definition.typeId, values: { name: '真实项目' } });
	expect(created.entity.typeId).toBe('project');
	expect(await readFile(join(vault.directory, created.entity.path), 'utf8')).toContain('huhu-type: archive-record');
	app.dispose();
	const reopened = vault.application();
	const snapshot = await reopened.archives.snapshot();
	expect(snapshot.entities.find((entity) => entity.id === created.entity.id)?.values).toEqual({ name: '真实项目' });
	expect((await reopened.archives.catalog()).types.find((type) => type.typeId === 'project')?.revisionId).toBe(
		definition.revisionId,
	);
	reopened.dispose();
});

test('field codecs preserve leading zeros, decimal money, false, null, absence and month precision', async () => {
	const vault = await diskVault(),
		app = vault.application();
	await app.archives.publishType({
		typeId: 'tax',
		label: '税务',
		folder: '税务档案',
		titleFieldId: 'code',
		fields: [
			{ fieldId: 'code', storageKey: 'tax-code', label: '编号', codec: 'text' },
			{ fieldId: 'amount', storageKey: 'tax-amount', label: '金额', codec: 'money' },
			{ fieldId: 'confirmed', storageKey: 'tax-confirmed', label: '确认', codec: 'boolean' },
			{ fieldId: 'period', storageKey: 'tax-period', label: '期间', codec: 'date' },
			{ fieldId: 'optional', storageKey: 'tax-optional', label: '可空', codec: 'text' },
			{ fieldId: 'missing', storageKey: 'tax-missing', label: '缺失', codec: 'text' },
			{ fieldId: 'empty', storageKey: 'tax-empty', label: '空串', codec: 'text' },
			{ fieldId: 'list', storageKey: 'tax-list', label: '空列表', codec: 'string-list' },
			{ fieldId: 'zero', storageKey: 'tax-zero', label: '零', codec: 'integer' },
			{ fieldId: 'decimal', storageKey: 'tax-decimal', label: '小数', codec: 'decimal' },
		],
	});
	const values = {
		code: '000123',
		amount: { amount: '9007199254740993.0100', currency: 'CNY' },
		confirmed: false,
		period: { value: '2026-03', precision: 'month' },
		optional: null,
		empty: '',
		list: [],
		zero: 0,
		decimal: '-0.000',
	};
	const receipt = await app.archives.createEntity({ typeId: 'tax', values });
	const raw = await readFile(join(vault.directory, receipt.entity.path), 'utf8');
	expect(raw).toContain('"000123"');
	app.dispose();
	const reopened = vault.application();
	expect((await reopened.archives.snapshot()).entities[0]?.values).toEqual(values);
	expect((await reopened.archives.snapshot()).entities[0]?.createdAt).toBe(receipt.entity.createdAt);
	reopened.dispose();
});

test('the archives module publishes usable catalog, query and command contracts without exposing mutable maps', async () => {
	const api = await import('./api');
	expect(api).toHaveProperty('ARCHIVES_CATALOG');
	const { archiveServices } = await import('./services/archive-services');
	const vault = await diskVault(),
		app = vault.application();
	const services = archiveServices(() => app.archives);
	const type = await services.commands.publishType({
		typeId: 'public-project',
		label: '项目',
		folder: '公开项目',
		titleFieldId: 'name',
		fields: [{ fieldId: 'name', storageKey: 'public-name', label: '名称', codec: 'text' }],
	});
	const receipt = await services.commands.createEntity({ typeId: type.typeId, values: { name: '公共入口' } });
	const snapshot = await services.query.snapshot();
	snapshot.entities.length = 0;
	expect((await services.query.snapshot()).entities[0]?.id).toBe(receipt.entity.id);
	const { default: createModule } = await import('./module');
	const module = createModule({
		settings: { bind: () => ({ get: () => ({ rootFolder: 'huhu/档案', layouts: {}, maxColumns: 6 }) }) },
	} as never);
	expect(module.services?.map(([key]) => key)).toEqual(
		expect.arrayContaining([api.ARCHIVES_CATALOG, api.ARCHIVES_QUERY, api.ARCHIVES_COMMANDS]),
	);
	app.dispose();
	await expect(services.query.snapshot()).rejects.toMatchObject({ code: 'disabled' });
});

test('future and damaged archives retain raw diagnostics; duplicate identities stay read-only and v1 stays readable', async () => {
	const { newRecord } = await import('./core/model');
	const { createMarkdown, parseRecord } = await import('./core/persist/markdown');
	const vault = await diskVault(),
		app = vault.application();
	const legacy = newRecord('person');
	legacy.fields.name = '旧个人';
	await vault.files.create('huhu/档案/个人档案/旧个人/基本信息.md', createMarkdown(legacy));
	const future = '---\nhuhu-type: archive-record\nhuhu-format-version: 99\nhuhu-id: future-one\n---\n自由正文\n';
	const damaged = '---\nhuhu-type: archive-record\nhuhu-id: [\n---\n原始损坏内容\n';
	await vault.files.create('huhu/档案/项目档案/未来/基本信息.md', future);
	await vault.files.create('huhu/档案/项目档案/损坏/基本信息.md', damaged);
	const first = await app.archives.snapshot();
	expect(first.diagnostics.find((item) => item.code === 'futureFormat')?.raw).toBe(future);
	expect(first.diagnostics.find((item) => item.code === 'invalidYaml')?.raw).toBe(damaged);
	expect(first.entities.find((item) => item.id === legacy.id)).toMatchObject({
		formatVersion: 1,
		createdAt: null,
		readOnly: false,
	});
	expect(parseRecord(future, 'x.md')).toBeNull();
	await vault.files.create('huhu/档案/个人档案/重复/基本信息.md', createMarkdown(legacy));
	app.archives.invalidate();
	const duplicate = await app.archives.snapshot();
	expect(duplicate.entities.filter((item) => item.id === legacy.id).every((item) => item.readOnly)).toBe(true);
	expect(duplicate.diagnostics.filter((item) => item.code === 'duplicateId')).toHaveLength(2);
	expect(duplicate.isComplete).toBe(false);
	expect(await readFile(join(vault.directory, 'huhu/档案/项目档案/未来/基本信息.md'), 'utf8')).toBe(future);
	app.dispose();
});

test('a corrupt current hint preserves the published type for reading while blocking new writes', async () => {
	const vault = await diskVault(),
		app = vault.application();
	const type = await app.archives.publishType({
		typeId: 'orphan',
		label: '定义',
		folder: '定义实体',
		titleFieldId: 'name',
		fields: [{ fieldId: 'name', storageKey: 'orphan-name', label: '名称', codec: 'text' }],
	});
	const pointer = `huhu/档案/档案定义/类型/orphan/当前.md`;
	await writeFile(
		join(vault.directory, pointer),
		'---\nhuhu-type: archive-type-current\nhuhu-format-version: 99\n---\n',
	);
	app.archives.invalidate();
	expect((await app.archives.catalog()).types).toContainEqual(type);
	await expect(app.archives.createEntity({ typeId: 'orphan', values: { name: '不应创建' } })).rejects.toMatchObject({
		code: 'futureFormat',
	});
	expect((await app.archives.snapshot()).diagnostics).toEqual(
		expect.arrayContaining([expect.objectContaining({ path: pointer, code: 'futureFormat' })]),
	);
	app.dispose();
});

test('the same public create command routes preset people through the unchanged v1 codec', async () => {
	const vault = await diskVault(),
		app = vault.application();
	const catalog = await app.archives.catalog();
	expect(catalog.types.map((type) => type.typeId)).toEqual(expect.arrayContaining(['person', 'company']));
	const receipt = await app.archives.createEntity({
		typeId: 'person',
		values: { name: '旧格式新增', mobiles: ['00123'] },
	});
	expect(receipt.entity.formatVersion).toBe(1);
	expect(receipt.entity.raw).toContain('huhu-type: person');
	expect(
		(await app.archives.snapshot()).entities.find((entity) => entity.id === receipt.entity.id)?.values.mobiles,
	).toEqual(['00123']);
	app.dispose();
});

test('definition publishing rejects reserved, duplicate and incompatible vault property keys before creating files', async () => {
	const vault = await diskVault(),
		app = vault.application();
	const base = {
		typeId: 'bad',
		label: '类型',
		folder: '类型档案',
		titleFieldId: 'name',
		fields: [{ fieldId: 'name', storageKey: 'title', label: '标题', codec: 'text' as const }],
	};
	await expect(
		app.archives.publishType({ ...base, fields: [{ ...base.fields[0]!, storageKey: 'huhu-id' }] }),
	).rejects.toMatchObject({ code: 'invalidDefinition' });
	await expect(
		app.archives.publishType({
			...base,
			fields: [...base.fields, { fieldId: 'other', storageKey: 'title', label: '重复', codec: 'text' }],
		}),
	).rejects.toMatchObject({ code: 'invalidDefinition' });
	await expect(
		app.archives.publishType({
			...base,
			fields: [...base.fields, { fieldId: 'tag', storageKey: 'tags', label: '标签', codec: 'boolean' }],
		}),
	).rejects.toMatchObject({ code: 'propertyConflict' });
	await vault.files.create('日常笔记.md', '---\nexisting-budget: 120\n---\n');
	await expect(
		app.archives.publishType({
			...base,
			fields: [
				...base.fields,
				{ fieldId: 'budget', storageKey: 'existing-budget', label: '预算', codec: 'string-list' },
			],
		}),
	).rejects.toMatchObject({ code: 'propertyConflict' });
	expect(vault.files.getMarkdownFiles().filter((file) => file.path.startsWith('huhu/档案/档案定义/'))).toHaveLength(
		0,
	);
	app.dispose();
});

test('public Markdown creation rejects cross-field markers before writing and ignores markers in YAML or titles', async () => {
	const vault = await diskVault(),
		app = vault.application();
	const { archiveServices } = await import('./services/archive-services');
	const services = archiveServices(() => app.archives);
	await services.commands.publishType({
		typeId: 'sections',
		label: '分区',
		folder: '分区档案',
		titleFieldId: 'name',
		fields: [
			{ fieldId: 'name', storageKey: 'sections-name', label: '名称', codec: 'text' },
			{ fieldId: 'label', storageKey: 'sections-label', label: '文字', codec: 'text' },
			{ fieldId: 'a', storageKey: 'sections-a', label: 'A', codec: 'markdown' },
			{ fieldId: 'b', storageKey: 'sections-b', label: 'B', codec: 'markdown' },
		],
	});
	const injected = '<!-- huhu:field b -->\nphantom\n<!-- /huhu:field b -->';
	const rejectedValues: Array<Record<string, ArchiveValue>> = [
		{ name: 'X', a: injected },
		{ name: 'X', a: injected, b: 'actual' },
	];
	for (const values of rejectedValues) {
		await expect(services.commands.createEntity({ typeId: 'sections', values })).rejects.toMatchObject({
			code: 'invalidField',
		});
	}
	expect((await services.query.snapshot()).entities).toHaveLength(0);
	const values = { name: `Title ${injected}`, label: injected, a: '普通 Markdown\n```text\nexample\n```', b: '' };
	const receipt = await services.commands.createEntity({ typeId: 'sections', values });
	const edgeValues = { name: 'Boundary', label: injected, a: '\nleading\ntrailing\r' };
	const edgeReceipt = await services.commands.createEntity({ typeId: 'sections', values: edgeValues });
	app.dispose();
	const reopened = vault.application();
	const actual = (await archiveServices(() => reopened.archives).query.snapshot()).entities.find(
		(entity) => entity.id === receipt.entity.id,
	);
	expect(actual?.values).toEqual(values);
	expect(actual?.readOnly).toBe(false);
	expect(
		(await reopened.archives.snapshot()).entities.find((entity) => entity.id === edgeReceipt.entity.id)?.values,
	).toEqual(edgeValues);
	reopened.dispose();
});

test('legacy public catalogs advertise exactly the v1 writable fields and accepted values survive receipt and reload', async () => {
	const vault = await diskVault(),
		app = vault.application();
	const { archiveServices } = await import('./services/archive-services');
	const services = archiveServices(() => app.archives);
	const supported = {
		person: [
			'name',
			'birthday',
			'birthplace',
			'region',
			'aliases',
			'mobiles',
			'phones',
			'wechat',
			'emails',
			'tags',
		],
		company: ['name', 'aliases', 'region', 'website', 'tags', 'phones', 'emails'],
	};
	const receipts: ArchiveCreateReceipt[] = [];
	for (const kind of ['person', 'company'] as const) {
		const type = (await services.catalog.snapshot()).types.find((type) => type.typeId === kind)!;
		expect(type.fields.map((field) => field.fieldId).sort()).toEqual([...supported[kind]].sort());
		const values = Object.fromEntries(
			type.fields.map((field) => [
				field.fieldId,
				field.codec === 'string-list'
					? ['00123']
					: field.fieldId === 'birthday'
						? '2000-01-01'
						: `value-${field.fieldId}`,
			]),
		);
		const receipt = await services.commands.createEntity({ typeId: kind, values });
		expect(receipt.entity.values).toEqual(values);
		expect(receipt.entity.raw).toContain(`huhu-type: ${kind}`);
		receipts.push(receipt);
	}
	const unsupported: Array<[string, string, ArchiveValue]> = [
		['person', 'website', 'https://example.com'],
		['company', 'birthday', '2000-01-01'],
		['company', 'mobiles', ['00123']],
	];
	for (const [typeId, fieldId, value] of unsupported) {
		await expect(
			services.commands.createEntity({
				typeId,
				values: { name: 'unsupported', [fieldId]: value },
			}),
		).rejects.toMatchObject({ code: 'invalidField' });
	}
	app.dispose();
	const reopened = vault.application();
	const snapshot = await archiveServices(() => reopened.archives).query.snapshot();
	for (const receipt of receipts)
		expect(snapshot.entities.find((entity) => entity.id === receipt.entity.id)?.values).toEqual(
			receipt.entity.values,
		);
	reopened.dispose();
});

test('v1 and v2 public creates fail closed while identity reads are unknown, then retry safely after recovery', async () => {
	const vault = await diskVault(),
		app = vault.application();
	const { archiveServices } = await import('./services/archive-services');
	const services = archiveServices(() => app.archives);
	await services.commands.publishType({
		typeId: 'guarded',
		label: '身份',
		folder: '身份档案',
		titleFieldId: 'name',
		fields: [{ fieldId: 'name', storageKey: 'guarded-name', label: '名称', codec: 'text' }],
	});
	const cachedRead = vault.files.cachedRead;
	for (const typeId of ['person', 'guarded']) {
		const id = `reserved-${typeId}`;
		const first = await services.commands.createEntity({ typeId, id, values: { name: 'First' } });
		vault.files.cachedRead = (file) =>
			file.path === first.entity.path ? Promise.reject(new Error('EIO')) : cachedRead(file);
		app.archives.invalidate();
		expect((await services.query.snapshot()).isComplete).toBe(false);
		const before = vault.files
			.getMarkdownFiles()
			.map((file) => file.path)
			.sort();
		await expect(services.commands.createEntity({ typeId, id, values: { name: 'Second' } })).rejects.toMatchObject({
			code: 'identityUnverified',
		});
		expect(
			vault.files
				.getMarkdownFiles()
				.map((file) => file.path)
				.sort(),
		).toEqual(before);
		vault.files.cachedRead = cachedRead;
		await expect(services.commands.createEntity({ typeId, id, values: { name: 'Second' } })).rejects.toMatchObject({
			code: 'duplicateId',
		});
		const retried = await services.commands.createEntity({
			typeId,
			id: `safe-retry-${typeId}`,
			values: { name: 'Recovered' },
		});
		expect(retried.entity.id).toBe(`safe-retry-${typeId}`);
	}
	const opaquePath = 'huhu/档案/身份档案/opaque/基本信息.md';
	await vault.files.create(opaquePath, '---\nhuhu-type: archive-record\nhuhu-id: [\n---\n');
	app.archives.invalidate();
	await expect(
		services.commands.createEntity({ typeId: 'guarded', id: 'never-allocated', values: { name: 'Opaque' } }),
	).rejects.toMatchObject({ code: 'identityUnverified' });
	await rm(join(vault.directory, opaquePath));
	const retried = await services.commands.createEntity({
		typeId: 'guarded',
		id: 'never-allocated',
		values: { name: 'Opaque' },
	});
	expect(retried.entity.id).toBe('never-allocated');
	app.dispose();
});

test.each(['invalid-date', 'future', 'missing-definition'] as const)(
	'a valid entity is read-only when a %s file occupies its identity',
	async (failure) => {
		const vault = await diskVault(),
			app = vault.application();
		const { archiveServices } = await import('./services/archive-services');
		const services = archiveServices(() => app.archives);
		await services.commands.publishType({
			typeId: 'occupied',
			label: '占用',
			folder: '占用档案',
			titleFieldId: 'name',
			fields: [{ fieldId: 'name', storageKey: 'occupied-name', label: '名称', codec: 'text' }],
		});
		const receipt = await services.commands.createEntity({
			typeId: 'occupied',
			id: 'shared-id',
			values: { name: 'Valid' },
		});
		const brokenRaw =
			failure === 'invalid-date'
				? receipt.entity.raw.replace(/^huhu-created-at:.*$/m, 'huhu-created-at: invalid')
				: failure === 'future'
					? receipt.entity.raw.replace('huhu-format-version: 2', 'huhu-format-version: 99')
					: receipt.entity.raw.replace(/^huhu-schema-revision:.*$/m, 'huhu-schema-revision: missing-schema');
		const brokenPath = 'huhu/档案/占用档案/Broken/基本信息.md';
		await vault.files.create(brokenPath, brokenRaw);
		app.dispose();
		const reopened = vault.application(),
			snapshot = await archiveServices(() => reopened.archives).query.snapshot();
		expect(snapshot.entities.find((entity) => entity.path === receipt.entity.path)?.readOnly).toBe(true);
		expect(
			snapshot.diagnostics
				.filter((item) => item.code === 'duplicateId')
				.map((item) => item.path)
				.sort(),
		).toEqual([receipt.entity.path, brokenPath].sort());
		expect(await readFile(join(vault.directory, brokenPath), 'utf8')).toBe(brokenRaw);
		expect(await readFile(join(vault.directory, receipt.entity.path), 'utf8')).toBe(receipt.entity.raw);
		reopened.dispose();
	},
);

test('public v2 edit sessions merge different fields, retain raw surroundings and separate draft from completion', async () => {
	const vault = await diskVault(),
		app = vault.application();
	const { archiveServices } = await import('./services/archive-services');
	const services = archiveServices(() => app.archives);
	expect(services.commands).toHaveProperty('beginEdit');
	await services.commands.publishType({
		typeId: 'editable',
		label: '编辑',
		folder: '编辑档案',
		titleFieldId: 'name',
		fields: [
			{ fieldId: 'name', storageKey: 'edit-name', label: '名称', codec: 'text' },
			{ fieldId: 'a', storageKey: 'edit-a', label: 'A', codec: 'text' },
			{ fieldId: 'b', storageKey: 'edit-b', label: 'B', codec: 'markdown' },
			{ fieldId: 'required', storageKey: 'edit-required', label: '必填', codec: 'text', required: true },
		],
	});
	const created = await services.commands.createEntity({
		typeId: 'editable',
		values: { name: 'Edit', a: 'A0', b: 'B0' },
	});
	const unknownYaml = "custom-key:  'keep literal'   # user comment\n",
		freeBody = '\nFree body\n<!-- user comment -->\n';
	const raw = created.entity.raw.replace('\n---\n', `\n${unknownYaml}---\n`) + freeBody;
	await writeFile(join(vault.directory, created.entity.path), raw);
	app.archives.invalidate();
	const one = await services.commands.beginEdit(created.entity.id),
		two = await services.commands.beginEdit(created.entity.id);
	const [, merged] = await Promise.all([
		services.commands.updateEntity({ base: one, changes: { a: 'A1' }, intent: 'draft' }),
		services.commands.updateEntity({ base: two, changes: { b: '**B1**' }, intent: 'draft' }),
	]);
	expect(merged.entity.values).toMatchObject({ a: 'A1', b: '**B1**' });
	expect(merged.entity.raw).toContain(unknownYaml);
	expect(merged.entity.raw).toContain(freeBody);
	const first = await services.commands.beginEdit(created.entity.id),
		second = await services.commands.beginEdit(created.entity.id);
	await services.commands.updateEntity({ base: first, changes: { a: 'First' }, intent: 'draft' });
	const draft = { a: 'Other' };
	await expect(
		services.commands.updateEntity({ base: second, changes: draft, intent: 'draft' }),
	).rejects.toMatchObject({ code: 'conflict', detail: 'a' });
	expect(draft).toEqual({ a: 'Other' });
	const incomplete = await services.commands.beginEdit(created.entity.id);
	await expect(
		services.commands.updateEntity({ base: incomplete, changes: {}, intent: 'complete' }),
	).rejects.toMatchObject({ code: 'incompleteRecord', detail: 'required' });
	const completed = await services.commands.updateEntity({
		base: incomplete,
		changes: { required: 'present' },
		intent: 'complete',
	});
	expect(completed.entity.raw).toContain('huhu-state: active');
	expect(completed.entity.raw).toContain(unknownYaml);
	app.dispose();
	const reopened = vault.application();
	expect(
		(await archiveServices(() => reopened.archives).query.snapshot()).entities.find(
			(entity) => entity.id === created.entity.id,
		)?.values,
	).toEqual(completed.entity.values);
	reopened.dispose();
});

test('legacy public field updates retain unknown YAML spelling, comments and free text byte-for-byte', async () => {
	const vault = await diskVault(),
		app = vault.application();
	const { archiveServices } = await import('./services/archive-services');
	const services = archiveServices(() => app.archives);
	const created = await services.commands.createEntity({
		typeId: 'person',
		values: { name: 'Legacy', phones: ['00123'] },
	});
	const unknown = "custom-owned-by-user:  'unchanged'   # keep spacing\n";
	const raw = created.entity.raw.replace('\n---\n', `\n${unknown}---\n`) + '\nFree user text\n';
	await writeFile(join(vault.directory, created.entity.path), raw);
	app.archives.invalidate();
	const base = await services.commands.beginEdit(created.entity.id);
	const saved = await services.commands.updateEntity({ base, changes: { region: 'Changed' }, intent: 'draft' });
	expect(saved.entity.raw).toContain(unknown);
	expect(saved.entity.raw).toContain('\nFree user text\n');
	expect(saved.entity.raw).toContain('huhu-type: person');
	expect(saved.entity.values.phones).toEqual(['00123']);
	app.dispose();
});

test('public v2 patches round-trip precise codecs, explicit nulls and newly added fields', async () => {
	const vault = await diskVault(),
		app = vault.application();
	const { archiveServices } = await import('./services/archive-services');
	const services = archiveServices(() => app.archives);
	await services.commands.publishType({
		typeId: 'patch-codecs',
		label: '补丁',
		folder: '补丁档案',
		titleFieldId: 'name',
		fields: [
			{ fieldId: 'name', storageKey: 'patch-name', label: '名称', codec: 'text' },
			{ fieldId: 'middle', storageKey: 'patch-middle', label: '新值', codec: 'text' },
			{ fieldId: 'list', storageKey: 'patch-list', label: '列表', codec: 'string-list' },
			{ fieldId: 'amount', storageKey: 'patch-amount', label: '金额', codec: 'money' },
			{ fieldId: 'period', storageKey: 'patch-period', label: '年月', codec: 'date' },
			{ fieldId: 'body', storageKey: 'patch-body', label: '正文', codec: 'markdown' },
			{ fieldId: 'flag', storageKey: 'patch-flag', label: '布尔', codec: 'boolean', required: true },
			{ fieldId: 'zero', storageKey: 'patch-zero', label: '整数', codec: 'integer', required: true },
		],
	});
	const initial = {
		name: 'Codecs',
		list: ['00123'],
		amount: { amount: '1.00', currency: 'CNY' },
		period: { value: '2026-01', precision: 'month' },
		body: null,
		flag: false,
		zero: 0,
	};
	const created = await services.commands.createEntity({ typeId: 'patch-codecs', values: initial });
	const changes = {
		middle: '',
		list: [],
		amount: { currency: 'CNY', amount: '9007199254740993.0100' },
		period: { value: '2026-03', precision: 'month' },
		body: '\nbody\r',
	};
	const patched = await services.commands.updateEntity({
		base: await services.commands.beginEdit(created.entity.id),
		changes,
		intent: 'complete',
	});
	expect(patched.entity.values).toEqual({ ...initial, ...changes });
	const nulled = await services.commands.updateEntity({
		base: await services.commands.beginEdit(created.entity.id),
		changes: { body: null, period: null },
		intent: 'draft',
	});
	expect(nulled.entity.values).toEqual({ ...initial, ...changes, body: null, period: null });
	app.dispose();
	const reopened = vault.application();
	expect(
		(await reopened.archives.snapshot()).entities.find((entity) => entity.id === created.entity.id)?.values,
	).toEqual(nulled.entity.values);
	reopened.dispose();
});

test('failed writes and changed entity schemas preserve the public draft and never silently retry', async () => {
	const vault = await diskVault(),
		app = vault.application();
	const { archiveServices } = await import('./services/archive-services');
	const services = archiveServices(() => app.archives);
	const firstType = await services.commands.publishType({
		typeId: 'first-edit',
		label: '初始',
		folder: '初始档案',
		titleFieldId: 'name',
		fields: [{ fieldId: 'name', storageKey: 'first-name', label: '名称', codec: 'text' }],
	});
	const created = await services.commands.createEntity({ typeId: firstType.typeId, values: { name: 'Before' } });
	const base = await services.commands.beginEdit(created.entity.id),
		changes = { name: 'After' },
		process = vault.files.process;
	vault.files.process = async () => {
		throw new Error('EIO');
	};
	await expect(services.commands.updateEntity({ base, changes, intent: 'draft' })).rejects.toThrow('EIO');
	expect(await readFile(join(vault.directory, created.entity.path), 'utf8')).toBe(created.entity.raw);
	expect(changes).toEqual({ name: 'After' });
	vault.files.process = process;
	const saved = await services.commands.updateEntity({ base, changes, intent: 'draft' });
	const stale = await services.commands.beginEdit(created.entity.id);
	const nextType = await services.commands.publishType({
		typeId: 'next-edit',
		label: '另一协议',
		folder: '另一档案',
		titleFieldId: 'name',
		fields: [{ fieldId: 'name', storageKey: 'next-name', label: '名称', codec: 'text' }],
	});
	const newRaw = saved.entity.raw
		.replace('huhu-archive-type-id: first-edit', 'huhu-archive-type-id: next-edit')
		.replace(`huhu-schema-revision: ${firstType.revisionId}`, `huhu-schema-revision: ${nextType.revisionId}`)
		.replace('first-name:', 'next-name:');
	await writeFile(join(vault.directory, created.entity.path), newRaw);
	app.archives.invalidate();
	await expect(
		services.commands.updateEntity({ base: stale, changes: { name: 'Stale' }, intent: 'draft' }),
	).rejects.toMatchObject({ code: 'definitionConflict' });
	expect(await readFile(join(vault.directory, created.entity.path), 'utf8')).toBe(newRaw);
	app.dispose();
});

test('reopened legacy records can be updated through the public service before mounting the old UI', async () => {
	const vault = await diskVault(),
		app = vault.application();
	const { archiveServices } = await import('./services/archive-services');
	const created = await archiveServices(() => app.archives).commands.createEntity({
		typeId: 'person',
		values: { name: 'Reopen', phones: ['00123'] },
	});
	app.dispose();
	const reopened = vault.application(),
		services = archiveServices(() => reopened.archives);
	const base = await services.commands.beginEdit(created.entity.id);
	const updated = await services.commands.updateEntity({
		base,
		changes: { region: 'After restart' },
		intent: 'draft',
	});
	expect(updated.entity.values.region).toBe('After restart');
	expect(updated.entity.values.phones).toEqual(['00123']);
	expect(updated.entity.raw).toContain('huhu-type: person');
	reopened.dispose();
});


test.each(['', ' # retained comment', ' null', ' null # retained comment'])(
	'public v1/v2 edits fill null spelling %j while preserving comments, BOM and CRLF',
	async (spelling) => {
		for (const legacy of [false, true]) {
			const vault = await diskVault(), app = vault.application();
			const { archiveServices } = await import('./services/archive-services');
			const services = archiveServices(() => app.archives);
			if (!legacy) await services.commands.publishType({
				typeId: 'null-edit', label: '空值', folder: '空值档案', titleFieldId: 'name',
				fields: [
					{ fieldId: 'name', storageKey: 'null-name', label: '名称', codec: 'text' },
					{ fieldId: 'region', storageKey: 'null-region', label: '区域', codec: 'text' },
				],
			});
			const created = await services.commands.createEntity({ typeId: legacy ? 'person' : 'null-edit', values: { name: 'Before', region: 'Old' } });
			const key = legacy ? 'region' : 'null-region';
			const raw = '\uFEFF' + created.entity.raw.replace(new RegExp(`^${key}:.*$`, 'm'), `${key}:${spelling}`)
				.replace('\n---\n', "\nunknown:  'keep' # untouched\n---\n")
				.replace(/\n/g, '\r\n') + 'Free body  \r\n';
			await writeFile(join(vault.directory, created.entity.path), raw);
			app.archives.invalidate();
			const base = await services.commands.beginEdit(created.entity.id);
			const receipt = await services.commands.updateEntity({ base, changes: { region: 'Filled' }, intent: 'draft' });
			expect(receipt.entity.values.region).toBe('Filled');
			expect(receipt.entity.raw).toContain(`${key}:`);
			if (spelling.includes('#')) expect(receipt.entity.raw).toContain(' # retained comment\r\n');
			expect(receipt.entity.raw).toContain("unknown:  'keep' # untouched\r\n");
			expect(receipt.entity.raw.startsWith('\uFEFF---\r\n')).toBe(true);
			expect(receipt.entity.raw.endsWith('Free body  \r\n')).toBe(true);
			app.dispose();
			const reopened = vault.application();
			expect((await reopened.archives.snapshot()).entities.find((entity) => entity.id === created.entity.id)?.values.region).toBe('Filled');
			reopened.dispose();
		}
	},
);

test.each(['read', 'capture', 'process'] as const)('public updates reject a definition changed during %s and preserve the draft', async (stage) => {
	for (const validHash of [false, true]) {
		const vault = await diskVault(), app = vault.application();
		const { archiveServices } = await import('./services/archive-services');
		const { archiveFrontmatter, archiveMarkdown } = await import('./core/persist/v2/markdown');
		const { textHash } = await import('../../shared/storage/text-edits');
		const services = archiveServices(() => app.archives);
		const type = await services.commands.publishType({
			typeId: 'schema-race', label: '定义竞态', folder: '竞态档案', titleFieldId: 'name',
			fields: [{ fieldId: 'name', storageKey: 'race-name', label: '名称', codec: 'text' }],
		});
		const created = await services.commands.createEntity({ typeId: type.typeId, values: { name: 'Before' } });
		const base = await services.commands.beginEdit(created.entity.id), changes = { name: 'After' };
		const path = `huhu/档案/档案定义/类型/${type.typeId}/修订/${type.revisionId}.md`;
		const originalDefinition = await readFile(join(vault.directory,path),'utf8');
		const originalRead = vault.files.read, originalCapture = vault.files.captureEditors, originalProcess = vault.files.process;
		const mutate = async () => {
			const file = vault.files.getFileByPath(path)!;
			const values = archiveFrontmatter(await readFile(join(vault.directory, file.path), 'utf8'));
			const definition = values.definition as typeof type;
			definition.fields[0]!.label = 'Changed semantics';
			definition.fields[0]!.required = true;
			if (validHash) {
				const canonical = (value: unknown): string => Array.isArray(value) ? `[${value.map(canonical).join(',')}]` : value && typeof value === 'object'
					? `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b, 'en')).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}` : JSON.stringify(value);
				const { contentHash: _hash, ...content } = definition;
				definition.contentHash = await textHash(canonical(content));
			}
			const raw = archiveMarkdown(values);
			await writeFile(join(vault.directory, path), raw);
			file.stat.mtime++; file.stat.size = raw.length;
			app.archives.invalidate();
		};
		if (stage === 'read') {
			const read = vault.files.read;
			vault.files.read = async (file) => { if (file.path === path) await mutate(); return read(file); };
		} else if (stage === 'capture') vault.files.captureEditors = async () => { await mutate(); return () => {}; };
		else {
			const process = vault.files.process;
			vault.files.process = async (...args) => { await mutate(); return process(...args); };
		}
		await expect(services.commands.updateEntity({ base, changes, intent: 'draft' })).rejects.toMatchObject({ code: expect.stringMatching(/definitionConflict|definitionChanged|definitionPublicationInvalid/) });
		expect(await readFile(join(vault.directory, created.entity.path), 'utf8')).toBe(created.entity.raw);
		expect(changes).toEqual({ name: 'After' });
		vault.files.read = originalRead;
		vault.files.captureEditors = originalCapture;
		vault.files.process = originalProcess;
		if (validHash) {
			const refreshed = await services.commands.beginEdit(created.entity.id);
			expect(refreshed.schemaContentHash).not.toBe(base.schemaContentHash);
			await expect(services.commands.updateEntity({base:refreshed,changes,intent:'draft'})).rejects.toMatchObject({code:'definitionPublicationInvalid'});
			// An edited immutable revision is not a new publication, even with a recomputed hash.
			await writeFile(join(vault.directory,path),originalDefinition);const definitionFile=vault.files.getFileByPath(path)!;definitionFile.stat.mtime++;definitionFile.stat.size=originalDefinition.length;app.archives.invalidate();
			const restored=await services.commands.beginEdit(created.entity.id);
			const retried = await services.commands.updateEntity({ base: restored, changes, intent: 'draft' });
			expect(retried.entity.values.name).toBe('After');
		} else {
			await expect(services.commands.beginEdit(created.entity.id)).rejects.toMatchObject({ code: 'invalidRecord' });
		}
		app.dispose();
	}
});

test('a schema disk ABA during capture is rejected even when bytes and stat return to the verified baseline', async () => {
	const vault = await diskVault(), app = vault.application();
	const { archiveServices } = await import('./services/archive-services');
	const services = archiveServices(() => app.archives);
	const type = await services.commands.publishType({
		typeId: 'schema-aba', label: '定义代次', folder: '代次档案', titleFieldId: 'name',
		fields: [{ fieldId: 'name', storageKey: 'aba-name', label: '名称', codec: 'text' }],
	});
	const created = await services.commands.createEntity({ typeId: type.typeId, values: { name: 'Before' } });
	const base = await services.commands.beginEdit(created.entity.id), changes = { name: 'After' };
	const path = `huhu/档案/档案定义/类型/${type.typeId}/修订/${type.revisionId}.md`;
	const capture = vault.files.captureEditors;
	vault.files.captureEditors = async () => {
		const raw = await readFile(join(vault.directory, path), 'utf8');
		await writeFile(join(vault.directory, path), raw + '\nchanged');
		app.archives.invalidate();
		await writeFile(join(vault.directory, path), raw);
		app.archives.invalidate();
		return () => {};
	};
	await expect(services.commands.updateEntity({ base, changes, intent: 'draft' })).rejects.toMatchObject({
		code: expect.stringMatching(/definitionConflict|definitionChanged/),
	});
	expect(await readFile(join(vault.directory, created.entity.path), 'utf8')).toBe(created.entity.raw);
	expect(changes).toEqual({ name: 'After' });
	vault.files.captureEditors = capture;
	const refreshed = await services.commands.beginEdit(created.entity.id);
	expect((await services.commands.updateEntity({ base: refreshed, changes, intent: 'draft' })).entity.values.name).toBe('After');
	app.dispose();
});

test('visible form revisions and creation templates share existing entity values without rewriting them', async () => {
	const vault = await diskVault(), app = vault.application();
	const { archiveServices } = await import('./services/archive-services');
	const services = archiveServices(() => app.archives);
	const type = await services.commands.publishType({
		typeId: 'forms-project', label: '项目', folder: '表单项目', titleFieldId: 'name', fields: [
			{ fieldId: 'name', storageKey: 'forms-name', label: '名称', codec: 'text', required: true },
			{ fieldId: 'code', storageKey: 'forms-code', label: '编号', codec: 'text' },
			{ fieldId: 'confirmed', storageKey: 'forms-confirmed', label: '确认', codec: 'boolean', required: true },
			{ fieldId: 'budget', storageKey: 'forms-budget', label: '预算', codec: 'money' },
		],
	});
	const original = await services.catalog.forms(type.typeId), design = structuredClone(original.design);
	design.forms = [
		{ id: 'overview', label: '项目概览', columns: 2, controls: [{ fieldId: 'name', group: '资料' }, { fieldId: 'code', group: '资料' }] },
		{ id: 'delivery', label: '交付核对', columns: 1, controls: [{ fieldId: 'name', group: '' }, { fieldId: 'confirmed', group: '' }] },
	];
	design.templates = [{ id: 'consulting', label: '咨询项目', values: { code: '000123', confirmed: false, budget: { amount: '9007199254740993.0100', currency: 'CNY' } }, body: '\nOriginal template body\n' }];
	const published = await services.commands.publishForms({ typeId: type.typeId, baseRevisionId: null, baseContentHash: null, schemaContentHash: type.contentHash, design });
	expect(published.revisionId).toBeTruthy();
	const created = await services.commands.createEntity({ typeId: type.typeId, values: { name: 'A项目' }, templateId: 'consulting', formRevisionId: published.revisionId, formContentHash: published.contentHash, intent: 'draft' });
	expect(created.entity.values).toEqual({ name: 'A项目', ...design.templates[0]!.values });
	expect(created.entity.raw).toContain('Original template body');
	const before = await vault.files.read(vault.files.getFileByPath(created.entity.path)!);
	const changed = structuredClone(design);
	changed.fieldSettings.find((field) => field.fieldId === 'code')!.label = '项目编号';
	changed.fieldSettings.find((field) => field.fieldId === 'budget')!.disabled = true;
	changed.templates[0]!.values.code = 'NEW DEFAULT';
	const next = await services.commands.publishForms({ typeId: type.typeId, baseRevisionId: published.revisionId, baseContentHash: published.contentHash, schemaContentHash: type.contentHash, design: changed });
	expect(await vault.files.read(vault.files.getFileByPath(created.entity.path)!)).toBe(before);
	const stale = await services.commands.beginEdit(created.entity.id);
	await expect(services.commands.updateEntity({ base: stale, changes: { name: 'Wrong hash' }, intent: 'draft', formRevisionId: next.revisionId, formContentHash: 'wrong-hash' })).rejects.toMatchObject({ code: 'formChanged' });
	await expect(services.commands.updateEntity({ base: stale, changes: { name: 'Old form draft' }, intent: 'draft', formRevisionId: published.revisionId, formContentHash: published.contentHash })).rejects.toMatchObject({ code: 'formChanged' });
	await expect(services.commands.publishForms({ typeId: type.typeId, baseRevisionId: published.revisionId, baseContentHash: published.contentHash, schemaContentHash: type.contentHash, design })).rejects.toMatchObject({ code: 'definitionConflict' });
	const saved = await services.commands.updateEntity({ base: stale, changes: { confirmed: false }, intent: 'complete', formRevisionId: next.revisionId, formContentHash: next.contentHash });
	expect(saved.entity.values.code).toBe('000123');
	expect(saved.entity.raw).toContain('huhu-state: active');
	app.dispose();
	const reopened = vault.application(), reopenedServices = archiveServices(() => reopened.archives);
	expect((await reopenedServices.catalog.forms(type.typeId)).design).toEqual(changed);
	expect((await reopenedServices.query.snapshot()).entities[0]?.values).toEqual(saved.entity.values);
	expect(await readFile(join(vault.directory, `huhu/档案/档案定义/表单/${type.typeId}/修订/${published.revisionId}.md`), 'utf8')).toContain('项目概览');
	reopened.dispose();
});

test('form definitions reject scripts, unknown fields, invalid defaults and corrupted revisions without touching entities', async () => {
	const vault = await diskVault(), app = vault.application();
	const { archiveServices } = await import('./services/archive-services');
	const services = archiveServices(() => app.archives);
	const type = await services.commands.publishType({ typeId: 'forms-invalid', label: '安全', folder: '安全表单', titleFieldId: 'name', fields: [
		{ fieldId: 'name', storageKey: 'safe-form-name', label: '名称', codec: 'text' },
	] });
	const initial = await services.catalog.forms(type.typeId);
	const bad = structuredClone(initial.design);
	bad.forms[0]!.controls[0]!.visibleWhen = { op: 'script', source: 'globalThis.unsafe = true' } as never;
	await expect(services.commands.publishForms({ typeId: type.typeId, baseRevisionId: null, baseContentHash: null, schemaContentHash: type.contentHash, design: bad })).rejects.toMatchObject({ code: 'invalidDefinition' });
	bad.forms[0]!.controls = [{ fieldId: 'made-up', group: '' }];
	await expect(services.commands.publishForms({ typeId: type.typeId, baseRevisionId: null, baseContentHash: null, schemaContentHash: type.contentHash, design: bad })).rejects.toMatchObject({ code: 'invalidDefinition' });
	bad.forms[0]!.controls = [];
	bad.templates = [{ id: 'bad', label: '坏默认值', values: { name: 42 }, body: '' }];
	await expect(services.commands.publishForms({ typeId: type.typeId, baseRevisionId: null, baseContentHash: null, schemaContentHash: type.contentHash, design: bad })).rejects.toMatchObject({ code: 'invalidField' });
	const published = await services.commands.publishForms({ typeId: type.typeId, baseRevisionId: null, baseContentHash: null, schemaContentHash: type.contentHash, design: initial.design });
	const revisionPath = `huhu/档案/档案定义/表单/${type.typeId}/修订/${published.revisionId}.md`;
	await writeFile(join(vault.directory, revisionPath), '---\nhuhu-type: archive-form-definition\nhuhu-format-version: 99\n---\nUnrecognized definition\n');
	expect((await services.catalog.forms(type.typeId)).blockedReason).toBe('futureFormat');
	await expect(services.commands.publishForms({ typeId: type.typeId, baseRevisionId: published.revisionId, baseContentHash: published.contentHash, schemaContentHash: type.contentHash, design: initial.design })).rejects.toMatchObject({ code: 'futureFormat' });
	expect(await readFile(join(vault.directory, revisionPath), 'utf8')).toContain('Unrecognized definition');
	app.dispose();
});

test.each([false, true])('staged form corruption after first read keeps the previous current (existing=%s)', async (existing) => {
	const vault = await diskVault(), app = vault.application();
	const { archiveServices } = await import('./services/archive-services');
	const services = archiveServices(() => app.archives);
	const type = await services.commands.publishType({ typeId: 'staged-race', label: 'Stage', folder: 'Stage', titleFieldId: 'name', fields: [{ fieldId: 'name', storageKey: 'stage-name', label: 'Name', codec: 'text' }] });
	let previous = await services.catalog.forms(type.typeId);
	if (existing) previous = await services.commands.publishForms({ typeId: type.typeId, baseRevisionId: null, baseContentHash: null, schemaContentHash: type.contentHash, design: previous.design });
	const pointer = `huhu/档案/档案定义/表单/${type.typeId}/当前.md`, originalPointer = vault.files.getFileByPath(pointer), previousRaw = originalPointer ? await vault.files.read(originalPointer) : null;
	const read = vault.files.read; let injected = false;
	vault.files.read = async (file) => {
		const raw = await read(file);
		if (!injected && file.path.includes('/表单/') && file.path.includes('/修订/') && !file.path.endsWith(`/${previous.revisionId}.md`)) {
			injected = true;
			await writeFile(join(vault.directory, file.path), raw.replace('huhu-format-version: 2', 'huhu-format-version: 99'));
			file.stat.mtime++; app.archives.invalidate();
		}
		return raw;
	};
	await expect(services.commands.publishForms({ typeId: type.typeId, baseRevisionId: previous.revisionId, baseContentHash: previous.contentHash, schemaContentHash: type.contentHash, design: previous.design })).rejects.toBeDefined();
	expect(injected).toBe(true);
	const after = vault.files.getFileByPath(pointer);
	expect(after ? await read(after) : null).toBe(previousRaw);
	vault.files.read = read;
	expect((await services.catalog.forms(type.typeId)).revisionId).toBe(previous.revisionId);
	app.dispose();
});

test.each(['person', 'company'] as const)('queued legacy %s creation rejects a changed form without creating a record', async (kind) => {
	const vault = await diskVault(), app = vault.application();
	const { archiveServices } = await import('./services/archive-services');
	const services = archiveServices(() => app.archives), initial = await services.catalog.forms(kind);
	initial.design.templates = [{ id: 'preset', label: 'Preset', values: { region: 'FROM_OLD_TEMPLATE' }, body: '' }];
	const first = await services.commands.publishForms({ typeId: kind, baseRevisionId: null, baseContentHash: null, schemaContentHash: initial.type.contentHash, design: initial.design });
	let release!: () => void, entered!: () => void, readFirst!: () => void;
	const enteredPromise = new Promise<void>((resolve) => { entered = resolve; }), barrier = new Promise<void>((resolve) => { release = resolve; });
	const holding = app.queue.run('create', async () => { entered(); await barrier; });
	await enteredPromise;
	const readPromise = new Promise<void>((resolve) => { readFirst = resolve; }), read = vault.files.read;
	vault.files.read = async (file) => { const raw = await read(file); if (file.path.endsWith(`/表单/${kind}/修订/${first.revisionId}.md`)) readFirst(); return raw; };
	const input = { typeId: kind, values: { name: 'Queued legacy' }, templateId: 'preset', formRevisionId: first.revisionId, formContentHash: first.contentHash };
	const creating = services.commands.createEntity(input);
	const rejected = expect(creating).rejects.toMatchObject({ code: expect.stringMatching(/formChanged|definitionConflict|definitionChanged/) });
	await readPromise;
	const nextDesign = structuredClone(first.design); nextDesign.templates[0]!.values.region = 'NEW_DEFAULT';
	await services.commands.publishForms({ typeId: kind, baseRevisionId: first.revisionId, baseContentHash: first.contentHash, schemaContentHash: first.type.contentHash, design: nextDesign });
	release(); await holding; await rejected;
	expect((await services.query.snapshot()).entities).toHaveLength(0);
	expect(input.values).toEqual({ name: 'Queued legacy' });
	app.dispose();
});

test.each([
	{ op: 'eq', fieldId: 'name', value: 'X', conditions: 'invalid' },
	{ op: 'contains', fieldId: 'name', value: 'X', conditions: [] },
	{ op: 'and', conditions: 'invalid' }, { op: 'or' },
])('malformed condition %j never becomes the current form', async (condition) => {
	const vault = await diskVault(), app = vault.application();
	const { archiveServices } = await import('./services/archive-services');
	const { conditionMatches } = await import('./core/form-definitions');
	const services = archiveServices(() => app.archives), initial = await services.catalog.forms('person');
	const design = structuredClone(initial.design);
	design.forms[0]!.controls[0]!.visibleWhen = condition as never;
	await expect(services.commands.publishForms({ typeId: 'person', baseRevisionId: null, baseContentHash: null, schemaContentHash: initial.type.contentHash, design })).rejects.toMatchObject({ code: 'invalidDefinition' });
	expect(() => conditionMatches(condition as never, { name: 'X' })).toThrowError(expect.objectContaining({ code: 'invalidDefinition' }));
	expect((await services.catalog.forms('person')).revisionId).toBeNull();
	app.dispose();
});

test.each([false, true])('staged revision changes at the final current gate are refused (existing=%s)', async (existing) => {
	const vault = await diskVault(), app = vault.application();
	const { archiveServices } = await import('./services/archive-services');
	const services = archiveServices(() => app.archives), initial = await services.catalog.forms('person');
	let previous = initial;
	if (existing) previous = await services.commands.publishForms({ typeId: 'person', baseRevisionId: null, baseContentHash: null, schemaContentHash: initial.type.contentHash, design: initial.design });
	const pointerPath = 'huhu/档案/档案定义/表单/person/当前.md', pointer = vault.files.getFileByPath(pointerPath), oldRaw = pointer ? await vault.files.read(pointer) : null;
	const create = vault.files.create, process = vault.files.process;
	let stagedPath = '', injected = false;
	const corrupt = async () => {
		injected = true; const file = vault.files.getFileByPath(stagedPath)!;
		const raw = await vault.files.read(file);
		await writeFile(join(vault.directory, stagedPath), raw.replace('huhu-format-version: 2', 'huhu-format-version: 99'));
		file.stat.mtime++; app.archives.invalidate();
	};
	vault.files.create = async (...args) => {
		if (args[0] === pointerPath) await corrupt();
		const file = await create(...args);
		if (args[0].includes('/表单/') && args[0].includes('/修订/')) stagedPath = args[0];
		return file;
	};
	vault.files.process = async (...args) => { if (args[0].path === pointerPath) await corrupt(); return process(...args); };
	await expect(services.commands.publishForms({ typeId: 'person', baseRevisionId: previous.revisionId, baseContentHash: previous.contentHash, schemaContentHash: initial.type.contentHash, design: initial.design })).rejects.toMatchObject({ code: 'formPublicationUnverified' });
	expect(injected).toBe(true);
	const latest = vault.files.getFileByPath(pointerPath);
	expect(latest ? await vault.files.read(latest) : null).toBe(oldRaw);
	const readonly=await services.catalog.forms('person');expect(readonly.revisionId).toBe(previous.revisionId);expect(readonly.blockedReason).toBeDefined();
	expect([...vault.files.getMarkdownFiles()].filter(file=>file.path.includes('/表单/person/发布/')).length).toBe(existing?2:1);
	app.dispose();
});

test('a post-commit form read failure reports the actual committed revision and does not imply rollback', async () => {
	const vault = await diskVault(), app = vault.application();
	const { archiveServices } = await import('./services/archive-services');
	const services = archiveServices(() => app.archives), initial = await services.catalog.forms('person');
	const pointerPath = 'huhu/档案/档案定义/表单/person/当前.md', read = vault.files.read, create = vault.files.create;
	let committed = false;
	vault.files.create = async (...args) => { const file = await create(...args); if (args[0] === pointerPath) committed = true; return file; };
	vault.files.read = async (file) => { if (committed && file.path === pointerPath) throw new Error('EIO after commit'); return read(file); };
	const error = await services.commands.publishForms({ typeId: 'person', baseRevisionId: null, baseContentHash: null, schemaContentHash: initial.type.contentHash, design: initial.design }).catch((failure: unknown) => failure);
	expect(error).toMatchObject({ code: 'formPublicationUnverified', commit: { state: 'committed-unverified', pointerPath } });
	vault.files.read = read;
	const result = await services.catalog.forms('person');
	expect(error).toMatchObject({ commit: { revisionId: result.revisionId } });
	expect(result.revisionId).not.toBeNull(); app.dispose();
});

test.each(['person', 'company'] as const)('legacy %s final create consumes its form proof before writing', async (kind) => {
	const vault = await diskVault(), app = vault.application();
	const { archiveServices } = await import('./services/archive-services');
	const services = archiveServices(() => app.archives), initial = await services.catalog.forms(kind), create = vault.files.create;
	let injected = false;
	vault.files.create = async (...args) => {
		if (!injected && args[0].endsWith('/基本信息.md')) {
			injected = true;
			await services.commands.publishForms({ typeId: kind, baseRevisionId: null, baseContentHash: null, schemaContentHash: initial.type.contentHash, design: initial.design });
		}
		return create(...args);
	};
	const input = { typeId: kind, values: { name: 'Final gate' }, formRevisionId: null, formContentHash: null };
	await expect(services.commands.createEntity(input)).rejects.toMatchObject({ code: expect.stringMatching(/formChanged|definitionConflict|definitionChanged/) });
	expect(injected).toBe(true); expect((await services.query.snapshot()).entities).toHaveLength(0);
	expect(input.values).toEqual({ name: 'Final gate' });
	vault.files.create = create;
	const current = await services.catalog.forms(kind);
	const created = await services.commands.createEntity({ ...input, formRevisionId: current.revisionId, formContentHash: current.contentHash });
	expect(created.entity.formatVersion).toBe(1); expect(created.entity.raw).toContain(`huhu-type: ${kind}`);
	expect(created.entity.raw).not.toContain('huhu-type: archive-record'); app.dispose();
});

test('condition trees have one closed discriminator, bounded depth and validated field references', async () => {
	const { conditionMatches, validateFormDesign } = await import('./core/form-definitions');
	const { legacyArchiveTypes } = await import('./core/legacy-adapter');
	const { defaultFormDesign } = await import('./core/form-definitions');
	const type = legacyArchiveTypes()[0]!, design = defaultFormDesign(type);
	for (const condition of [
		{ op: 'and', conditions: [], fieldId: 'name' }, { op: 'or', conditions: [], value: false },
		{ op: 'eq', fieldId: '', value: null }, { op: 'eq', fieldId: 'name', value: undefined },
	]) expect(() => conditionMatches(condition as never, {})).toThrowError(expect.objectContaining({ code: 'invalidDefinition' }));
	let deep: import('./api').ArchiveCondition = { op: 'eq', fieldId: 'name', value: null };
	for (let index = 0; index < 9; index++) deep = { op: 'and', conditions: [deep] };
	expect(() => conditionMatches(deep, {})).toThrowError(expect.objectContaining({ code: 'invalidDefinition' }));
	design.forms[0]!.controls[0]!.visibleWhen = { op: 'eq', fieldId: 'not-a-field', value: false };
	expect(() => validateFormDesign(design, type)).toThrowError(expect.objectContaining({ code: 'invalidDefinition' }));
	expect(conditionMatches({ op: 'or', conditions: [{ op: 'eq', fieldId: 'flag', value: false }, { op: 'eq', fieldId: 'nullable', value: null }] }, { flag: false })).toBe(true);
	expect(conditionMatches({ op: 'eq', fieldId: 'nullable', value: null }, {})).toBe(false);
});
