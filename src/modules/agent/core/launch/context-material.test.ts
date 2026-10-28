import { expect, it } from 'vitest';
import { formatContextMaterials } from './context-material';

it('reserves complete source and private artifact references before truncating the preview', () => {
	const source = JSON.stringify({ url: 'https://example.invalid/path?material=chosen', ref: 'opaque-ref', truncated: true }), file = '/private/vault/.huhu/materials/full-material.json';
	const result = formatContextMaterials([{ id: 'material', kind: 'element', title: 'Selected element', text: 'x'.repeat(100000), source, files: [file] }]);
	expect(result.length).toBeLessThanOrEqual(64000); expect(result).toContain(source); expect(result).toContain(file); expect(result).toContain('…');
});
it('rejects references that alone exceed the input budget instead of silently dropping them', () => {
	expect(() => formatContextMaterials([{ id: 'material', kind: 'web', title: 'Material', text: 'preview', files: ['/'.repeat(64001)] }])).toThrow();
});
