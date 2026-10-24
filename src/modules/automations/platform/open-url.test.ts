import { expect, test } from 'vitest';
import { memoryVault } from '../../../../scripts/fixtures/memory-vault';
import { MarkdownAutomationDefinitions } from './definitions';
import type { AutomationDefinition } from '../../../shared/automation/types';

test('open-url automation survives a save and reload with its address', async () => {
	const vault = memoryVault();
	const definitions = new MarkdownAutomationDefinitions(vault.app);
	const definition: AutomationDefinition = {
		id: 'open-url-0000-0001',
		name: 'Docs',
		enabled: true,
		deviceId: 'fixture',
		revision: 1,
		graceMinutes: 0,
		channels: ['in-app'],
		notifyOn: 'always',
		createdAt: 1,
		updatedAt: 1,
		schedule: { kind: 'manual' },
		action: { kind: 'open-url', url: 'https://example.com/a?b=1&c=2#x' },
	};
	try {
		await definitions.save(definition);
		expect(await definitions.list()).toEqual([definition]);
	} finally {
		await definitions.shutdown();
	}
});

test('open-url document keeps the address when the body is edited by hand', async () => {
	const vault = memoryVault();
	const definitions = new MarkdownAutomationDefinitions(vault.app);
	const definition: AutomationDefinition = {
		id: 'open-url-0000-0002',
		name: 'Docs',
		enabled: true,
		deviceId: 'fixture',
		revision: 1,
		graceMinutes: 0,
		channels: ['in-app'],
		notifyOn: 'always',
		createdAt: 1,
		updatedAt: 1,
		schedule: { kind: 'manual' },
		action: { kind: 'open-url', url: 'https://example.com/' },
	};
	try {
		await definitions.save(definition);
		const [file, text] = [...vault.contents.entries()].find(([name]) => name.endsWith('.md'))!;
		expect(text).toContain('url: https://example.com/');
		await vault.adapter.write(file, text.replaceAll('https://example.com/', 'https://example.org/'));
		expect((await definitions.list())[0]?.action).toEqual({ kind: 'open-url', url: 'https://example.org/' });
	} finally {
		await definitions.shutdown();
	}
});
