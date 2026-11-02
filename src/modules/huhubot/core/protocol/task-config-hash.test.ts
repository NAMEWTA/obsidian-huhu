import { expect, it } from 'vitest';
import fixture from '../../../../../contracts/hap/v0.1/fixtures/task-config-hash.json';
import type { TaskConfigDraft } from '../../api';
import { canonicalTaskConfigHash } from './task-config-hash';

it('matches every shared Go/Python TaskConfig v1 golden without defaults, normalization, or list sorting', async () => {
	expect(fixture.version).toBe('huhu-task-config-v1'); expect(fixture.cases).toHaveLength(8);
	for (const item of fixture.cases) {
		const config = structuredClone(item.config) as TaskConfigDraft;
		const before = JSON.stringify(config);
		expect(await canonicalTaskConfigHash(config), item.name).toBe(item.configurationHash);
		expect(JSON.stringify(config)).toBe(before);
	}
});

it('uses field byte lengths, keeps sponsor and model presence, and preserves empty optional list semantics', async () => {
	const one: TaskConfigDraft = { sponsorAgentId: 'a😀', draft: { name: 'b', description: '', persona: 'c' } };
	const two: TaskConfigDraft = { sponsorAgentId: 'a', draft: { name: '😀b', description: '', persona: 'c' } };
	expect(await canonicalTaskConfigHash(one)).not.toBe(await canonicalTaskConfigHash(two));
	expect(await canonicalTaskConfigHash(one)).toBe(await canonicalTaskConfigHash({ ...one, draft: { ...one.draft, description: '', allowedTools: [], allowedCollaborationTargets: [] } }));
	const model = { modelId: 'm', providerId: 'p', protocol: 'openai-responses' as const, endpoint: 'https://example.invalid', capabilities: [] };
	expect(await canonicalTaskConfigHash(one)).not.toBe(await canonicalTaskConfigHash({ ...one, draft: { ...one.draft, model } }));
});
