import type { ContextMaterial } from './session-api';

export function cleanContextText(text: string): string {
	return [...text]
		.filter((char) => {
			const code = char.charCodeAt(0);
			return code === 10 || code === 9 || (code >= 32 && code !== 127 && (code < 128 || code > 159));
		})
		.join('');
}
/** Reserve provenance and full artifact paths before allocating any preview budget. */
export function formatContextMaterials(materials: readonly ContextMaterial[]): string {
	const rows = materials.map(material => ({
		head: [material.title, material.source].filter((item): item is string => typeof item === 'string' && !!item).map(cleanContextText).join('\n'),
		body: cleanContextText(material.text),
		tail: (material.files ?? []).map(file => cleanContextText(file) === file ? file : JSON.stringify(file)).join('\n'),
	}));
	let remaining = 64000 - rows.reduce((size, row) => size + row.head.length + row.tail.length + 6, 0);
	if (remaining < 0) throw new Error('material_too_large');
	return rows.map(row => {
		const length = Math.min(remaining, row.body.length), body = row.body.length > length ? row.body.slice(0, Math.max(0, length - 1)) + (length ? '…' : '') : row.body;
		remaining -= length;
		return [row.head, body, row.tail].filter(Boolean).join('\n');
	}).join('\n\n');
}
