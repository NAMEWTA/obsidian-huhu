import { expect, test } from 'vitest';
import { restoreDefinitionDocument } from '../../core/backup/transforms';

test('backup restore retains automation hidden fallback and original operation leaf', () => {
	const document =
		'---\nhuhu-type: automation\nhuhu-id: automation-12345678\nname: "..."\nenabled: false\ndeviceId: a\n---\nUser body\n';
	const restored = restoreDefinitionDocument(document, { fromDevice: 'a', toDevice: 'a' });
	expect(restored.path).toBe('.huhu/automation/definitions/未命名-12345678/操作.md');
	expect(restored.text).toContain('User body');
});
