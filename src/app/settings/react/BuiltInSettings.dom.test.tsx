import { expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../../ui/react/test-providers';
import { AboutSettings } from './BuiltInSettings';

test('About renders as a README with GitHub links, the version and no side projects', () => {
	const { container } = render(
		<TestProviders>
			<AboutSettings version="1.2.3" />
		</TestProviders>,
	);
	expect(screen.getByRole('heading', { level: 1, name: 'HUHU' })).toBeTruthy();
	expect(container.textContent).toContain('1.2.3');
	expect(container.textContent).not.toContain('WTA-plus');
	const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
	expect(hrefs).toContain('https://github.com/NAMEWTA/obsidian-huhu');
	expect(hrefs).toContain('https://github.com/NAMEWTA/obsidian-huhu/issues');
	expect(hrefs).toContain('https://github.com/NAMEWTA/obsidian-huhu/releases');
	expect(hrefs.some((h) => h?.endsWith('/THIRD-PARTY-NOTICES.md'))).toBe(true);
	for (const a of container.querySelectorAll('a')) expect(a.getAttribute('rel')).toContain('noopener');
	expect(container.querySelectorAll('li h3').length).toBeGreaterThanOrEqual(8);
});
