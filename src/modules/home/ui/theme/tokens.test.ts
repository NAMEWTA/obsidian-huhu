import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const root = fileURLToPath(new URL('../../', import.meta.url));
const tokens = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');
const files = (dir: string): string[] =>
	readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		return statSync(path).isDirectory()
			? files(path)
			: /\.(tsx?|css)$/.test(name) && !/\.test\./.test(name)
				? [path]
				: [];
	});

test('the board palette derives only from HUHU tokens', () => {
	expect(tokens).not.toMatch(/#[0-9a-f]{3,8}\b/i);
	expect(tokens).not.toMatch(/data-theme/);
	// no fixed colors at all: masks and image text come from the global --scrim / --on-image tokens
	expect(tokens).not.toMatch(/\b(white|black)\b|rgba?\(|oklch\(|hsl\(/);
	expect(tokens).toContain('--board-accent: var(--primary)');
	expect(tokens).toContain('--board-bg-card: var(--card)');
});

test('every board token that styles read is defined by tokens.css or set inline by its component', () => {
	const defined = new Set([...tokens.matchAll(/(--board-[a-z0-9-]+):/g)].map((m) => m[1]));
	const inline = new Set(['--board-pipe-accent', '--board-widget-span', '--board-sidebar-w', '--board-widget-unit-h']);
	const missing = new Set<string>();
	for (const file of files(root)) {
		if (file.endsWith('tokens.css')) continue;
		const text = readFileSync(file, 'utf8');
		for (const m of text.matchAll(/var\((--board-[a-z0-9-]+)/g)) {
			const name = m[1]!;
			if (!defined.has(name) && !inline.has(name) && !/-$/.test(name)) missing.add(name);
		}
	}
	expect([...missing].sort()).toEqual([]);
});

test('pipeline and paper surfaces are styled by role: ink never equals its surface', () => {
	const read = (name: string) => new RegExp(`${name}: ([^;]+);`, 'g');
	const last = (name: string) => [...tokens.matchAll(read(name))].at(-1)?.[1];
	// roles that are plain global tokens are consumed directly (var(--card) / var(--foreground)) and have no board token left to compare
	for (const [surface, ink] of [['82', '83'], ['86', '87'], ['91', '93'], ['92', '93'], ['75', '76'], ['74', '76'], ['70', '71']]) {
		const a = last(`--board-p1-color-${surface}`);
		const b = last(`--board-p1-color-${ink}`);
		if (a && b) expect(a, `${surface} vs ${ink}`).not.toBe(b);
	}
	for (const surface of ['82', '86', '91', '92', '70', '74', '75']) {
		const value = last(`--board-p1-color-${surface}`);
		if (value) expect(value).toMatch(/var\(--(card|muted)\)|var\(--card\)\)/);
	}
});

test('the style maps and widget frames hold no fixed colors either', () => {
	const mapped = ['p1-classes.ts', 'p2-classes.ts', 'widget-classes.ts', 'immersive-classes.ts', 'dashboard.css'].map((name) => join(root, 'ui/theme', name));
	const frames = [...files(join(root, 'ui/canvas')), join(root, 'ui/widgets/WidgetBackground.tsx')];
	const found: string[] = [];
	for (const file of [...mapped, ...frames]) {
		const text = readFileSync(file, 'utf8');
		for (const match of text.matchAll(/rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}\b|\b(?:bg|text|border)-(?:white|black)\b/g)) found.push(`${file.slice(root.length)}: ${match[0]}`);
	}
	expect(found).toEqual([]);
});

test('the board keeps no pure aliases of global tokens: only derived, overridden or role-keyed tokens', () => {
	const aliases = [...tokens.matchAll(/^\s*(--board-[a-z0-9-]+):\s*var\(--[a-z0-9-]+\);/gm)].map((m) => m[1]!);
	const allowed = (name: string) =>
		/^--board-(memo|skill-key|project-chip)-/.test(name) || ['--board-bg-card', '--board-accent', '--board-radius-md'].includes(name);
	expect(aliases.filter((name) => !allowed(name))).toEqual([]);
	expect(readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')).not.toContain(`--${'db'}-`);
});
