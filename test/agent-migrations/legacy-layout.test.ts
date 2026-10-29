import { expect, test } from 'vitest';
import {
	addImportSpace,
	classifyAnnotations,
	inspectLegacyLayout,
	legacySpaceId,
} from '../../src/modules/agent/core/migrations/legacy-layout';
import { emptyRecords } from '../../src/modules/agent/services/spaces/records';
import { HISTORY, ROOT, VAULT, legacyLayout } from './fixtures';

test('inspect distinguishes absent, empty, importable, newer and damaged without defaults', () => {
	expect(inspectLegacyLayout(null).status).toBe('absent');
	expect(inspectLegacyLayout(JSON.stringify(legacyLayout()))).toMatchObject({
		status: 'importable',
		counts: { tabs: 4, groups: 2, panes: 4 },
	});
	expect(inspectLegacyLayout('[]').status).toBe('corrupt');
	expect(inspectLegacyLayout('{"version":"1"}').status).toBe('corrupt');
	expect(inspectLegacyLayout('{"version":9}').status).toBe('unsupported-version');
	expect(inspectLegacyLayout('{"version":1,"tabs":{},"groups":[],"closedTabs":[]}').status).toBe('empty');
});

test('the Space id is a pure function of the source bytes digest', () => {
	expect(legacySpaceId('abcdef0123456789ffff')).toBe('legacy-import-abcdef0123456789');
});

test('annotations: only [agent, account, session] tuples are attributable; the system account (empty) counts', () => {
	expect(classifyAnnotations(JSON.parse(HISTORY))).toEqual({ total: 3, attributable: 2, unattributable: 1 });
	expect(classifyAnnotations(null)).toEqual({ total: 0, attributable: 0, unattributable: 0 });
	expect(classifyAnnotations({ '["a","b"]': {}, '["","x","y"]': {} })).toEqual({
		total: 2,
		attributable: 0,
		unattributable: 2,
	});
});

test('addImportSpace is idempotent for its id and never edits other Spaces', () => {
	const base = emptyRecords(VAULT);
	const input = {
		spaceId: 'legacy-import-1',
		name: 'N',
		directory: { kind: 'vault' as const, relativePath: '', target: ROOT },
		layout: legacyLayout(),
		now: 5,
	};
	const first = addImportSpace(base, input);
	expect(first.created).toBe(true);
	expect(base.spaces).toEqual({});
	const second = addImportSpace(first.records, input);
	expect(second.created).toBe(false);
	expect(second.records).toBe(first.records);
});
