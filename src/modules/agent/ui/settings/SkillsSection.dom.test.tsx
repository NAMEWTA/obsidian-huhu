import { afterEach, beforeEach, expect, test } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore } from 'zustand/vanilla';
import { mkdir, mkdtemp, rm, writeFile, lstat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { TestProviders } from '../../../../ui/react/test-providers';
import type { SettingsHandle } from '../../../../shared/settings/store';
import { t } from '../../../../shared/i18n';
import { normalizeTerminalSettings, type TerminalSettings } from '../../core/terminal/settings';
import { systemAccountPaths } from '../../platform/desktop/agents/system-homes';
import { createSkillOps } from '../../platform/desktop/skills/ops';
import { SkillManager } from '../../services/skill-manager';
import { SkillsSection } from './SkillsSection';

let base = '';
beforeEach(async () => { base = await mkdtemp(path.join(tmpdir(), 'huhu-skills-ui-')); });
afterEach(async () => { await rm(base, { recursive: true, force: true }); });

test('cards show scope and description; clicking an agent copies and removes the copy, a hand-placed one is inert', async () => {
	const home = path.join(base, 'home'), vault = path.join(base, 'vault');
	const write = async (dir: string, name: string) => { await mkdir(dir, { recursive: true }); await writeFile(path.join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: about ${name}\n---\n`); };
	await write(path.join(home, '.agents/skills/review'), 'review');
	await write(path.join(home, '.claude/skills/review'), 'review');
	await write(path.join(vault, '.agents/skills/note'), 'note');
	const manager = new SkillManager({
		extraDirectories: () => [],
		load: async () => createSkillOps({ home, vault: () => vault, agentPaths: async () => systemAccountPaths({}, home), trash: async (dir) => { await rm(dir, { recursive: true }); }, open: async () => '' }),
	});
	const state = createStore(() => normalizeTerminalSettings({}));
	const handle = { get: state.getState, subscribe: state.subscribe, update: async () => undefined } as unknown as SettingsHandle<TerminalSettings>;
	const view = render(<TestProviders><SkillsSection manager={manager} handle={handle} /></TestProviders>);
	const card = async (name: string) => { await waitFor(() => expect(view.container.querySelector(`[data-skill="${name}"]`)).not.toBeNull()); return within(view.container.querySelector(`[data-skill="${name}"]`) as HTMLElement); };
	const review = await card('review');
	expect(review.getByText('about review')).toBeTruthy();
	expect(review.getByText(t('agent.skills.scope.global'))).toBeTruthy();
	expect((await card('note')).getByText(t('agent.skills.scope.vault'))).toBeTruthy();
	const user = userEvent.setup();
	const button = (c: ReturnType<typeof within>, target: string) => c.getAllByRole('button').find((b: HTMLElement) => b.getAttribute('data-target') === target)!;
	expect(button(review, 'claude-code').getAttribute('data-state')).toBe('manual');
	await user.click(button(review, 'claude-code'));
	await user.click(button(review, 'codex'));
	await waitFor(() => expect(button(review, 'codex').getAttribute('data-state')).toBe('copy'));
	expect((await lstat(path.join(home, '.codex/skills/review/.huhu-skill-copy.json'))).isFile()).toBe(true);
	await user.click(button(review, 'codex'));
	await waitFor(() => expect(button(review, 'codex').getAttribute('data-state')).toBe('off'));
	await expect(lstat(path.join(home, '.codex/skills/review'))).rejects.toThrow();
	expect((await lstat(path.join(home, '.claude/skills/review/SKILL.md'))).isFile()).toBe(true);
	await user.type(screen.getByRole('textbox', { name: t('agent.skills.search') }), 'nomatch');
	expect(view.container.querySelector('[data-skill]')).toBeNull();
	manager.dispose();
});
