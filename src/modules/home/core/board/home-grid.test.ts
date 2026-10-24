import assert from 'node:assert/strict';
import { describe, test } from 'vitest';
import { lunarAnniversaryThisYear } from '../anniversaries/lunar-map';
import {
	displayFocal,
	focalForWrite,
	nextWindow,
	reconcileColumns,
	renderWindow,
	templateChoices,
} from './board-experience';
import { orderedHostIcons } from './icon-catalog';
import { parse, serialize } from './parser/parse';
import { fillTemplate, planSkillDispatch } from './skill-prompt';
import {
	indexWidgetProviders,
	widgetProviderKey,
} from './widget-registry';

describe('home grid and board rules', () => {
	test('parse and serialize leave an untouched board byte-stable', () => {
		const source = [
			'---',
			'dashboard: true',
			'kept: yes',
			'---',
			'',
			'<!-- stay -->',
			'',
			'## Memo',
			'',
			'### Hello',
			'id: card-1',
			'type: generic',
			'A note that stays.',
			'',
		].join('\n');
		assert.equal(serialize(parse(source)), source);
	});

	test('skill prompts substitute once and do not submit', () => {
		assert.equal(
			fillTemplate('{{name}} {{missing}} {{name}}', { name: 'Ada {{raw}}' }),
			'Ada {{raw}} {{missing}} Ada {{raw}}',
		);
		const fresh = planSkillDispatch({
			agent: 'claude-code',
			skill: 'review',
			template: 'Look at {{path}}',
			vars: { path: 'a.md' },
		});
		assert.equal(fresh.mode, 'new-session');
		assert.equal(fresh.prompt, '/review\nLook at a.md');
		assert.equal(fresh.submit, false);
		assert.equal(fresh.reportedSuccess, false);
		const pasted = planSkillDispatch({
			agent: 'codex',
			skill: 'review',
			template: 'Look at {{path}}',
			vars: { path: 'a.md' },
			sessionId: 's1',
		});
		assert.deepEqual(pasted, {
			mode: 'paste',
			sessionId: 's1',
			prompt: '$review\nLook at a.md',
			submit: false,
			reportedSuccess: false,
		});
	});

	test('lunar dates, columns, windows, focal points and templates follow the board rules', () => {
		const lookup = {
			toLunar: () => ({ year: 2024, month: 2, leap: true, day: 30 }),
			monthDays: (_year: number, _month: number, leap: boolean) => (leap ? undefined : 29),
			toSolar: (year: number, month: number, leap: boolean, day: number) =>
				`${year}-${month}-${leap ? 'leap' : 'plain'}-${day}`,
		};
		const lunar = lunarAnniversaryThisYear('2024-03-01', 2026, lookup);
		assert.equal(lunar.leapCollapsed, true);
		assert.equal(lunar.rule, 'month-end');
		assert.equal(lunar.solar, '2026-2-plain-29');
		const columns = reconcileColumns(['title', 'gone'], ['gone'], ['title', 'status']);
		assert.deepEqual(columns.hidden, ['gone']);
		assert.deepEqual(columns.order, ['title', 'gone', 'status']);
		assert.deepEqual(renderWindow(800, 0), { count: 50, total: 800, truncated: true });
		assert.equal(nextWindow(500, 800), 500);
		assert.equal(renderWindow(800, 500).count, 500);
		assert.deepEqual(displayFocal(undefined), { x: 50, y: 50 });
		assert.equal(focalForWrite(undefined), undefined);
		assert.deepEqual(focalForWrite({ x: 140, y: -3 }), { x: 100, y: 0 });
		assert.deepEqual(templateChoices('old.md'), ['old.md']);
		assert.deepEqual(templateChoices('old.md', []), []);
		assert.deepEqual(templateChoices('old.md', [' b.md ', 'a.md', 'b.md', '']), ['b.md', 'a.md']);
	});

	test('the icon authority keeps the full host list, promotes preferred names and invents none', () => {
		const hosts = [
			...Array.from({ length: 900 }, (_, index) => `icon-${String(index).padStart(3, '0')}`),
			'star',
			'star',
		];
		const rows = orderedHostIcons(hosts);
		assert.equal(rows.length, 901);
		assert.equal(rows[0], 'star');
		assert.ok(rows.includes('icon-899'));
		assert.deepEqual(orderedHostIcons([]), []);
		assert.deepEqual(orderedHostIcons(['lucide-telescope', 'lucide-star']), ['lucide-star', 'lucide-telescope']);
	});

	test('widgets share one registry', () => {
		const index = indexWidgetProviders([
			{
				module: 'home',
				bundle: {
					kinds: [
						{
							key: 'calendar',
							titleKey: 'home.widget.calendar',
							icon: 'calendar',
							category: 'time',
							sizes: { M: { w: 4, h: 4 } },
							defaultTier: 'M',
							minSize: { w: 2, h: 2 },
							instances: () => [{ id: 'default' }],
							render: () => undefined,
						},
					],
				},
			},
			{
				module: 'automations',
				bundle: {
					kinds: [
						{
							key: 'calendar',
							titleKey: 'automations.widget.raw',
							icon: 'automationspaper',
							category: 'time',
							sizes: { M: { w: 4, h: 4 } },
							defaultTier: 'M',
							minSize: { w: 2, h: 2 },
							instances: () => [{ id: 'default' }],
							render: () => undefined,
						},
					],
				},
			},
		]);
		assert.equal(index.byKey.get(widgetProviderKey('home', 'calendar'))?.module, 'home');
		assert.equal(index.errors.length, 0);
		assert.equal(index.byKey.get(widgetProviderKey('automations', 'calendar'))?.module, 'automations');
	});
});
