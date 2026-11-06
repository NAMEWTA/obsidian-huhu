import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { applyInterfaceTheme } from './runtime';
import { themeSettings } from './settings';
test('paper/ink palette follows roots reparented between dock, leaf and another document without host pollution', () => {
	const style = document.createElement('style');
	style.textContent = readFileSync('src/ui/styles/tokens.css', 'utf8');
	document.head.append(style);
	const host = document.createElement('main');
	host.innerHTML = '<aside></aside><section></section>';
	document.body.append(host);
	const root = document.createElement('div');
	root.className = 'huhu-ui';
	host.querySelector('aside')!.append(root);
	try {
		applyInterfaceTheme(root, themeSettings.normalize({ preset: 'ink', accent: 'pine' }));
		expect(root.dataset.theme).toBe('ink');
		host.querySelector('section')!.append(root);
		expect(root.dataset.accent).toBe('pine');
		const doc = document.implementation.createHTMLDocument();
		doc.body.append(doc.adoptNode(root));
		applyInterfaceTheme(root, themeSettings.normalize({ preset: 'paper' }));
		expect(root.dataset.theme).toBe('paper');
		expect(document.body.hasAttribute('data-theme')).toBe(false);
		expect(document.body.style.getPropertyValue('--background-primary')).toBe('');
	} finally {
		host.remove();
		root.remove();
		style.remove();
	}
});
