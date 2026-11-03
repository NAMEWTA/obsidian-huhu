import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../ui/react/test-providers';
import { setLanguage, t } from '../../../../shared/i18n';
import { WeatherStatus } from './WeatherStatus';
import type { WeatherView } from './weather-state';

afterEach(cleanup);
const show = (view: WeatherView, time = '10:30') => {
	setLanguage('en');
	const actions = { onRetry: vi.fn(), onConfigure: vi.fn(), onCancel: vi.fn() };
	render(
		<TestProviders>
			<WeatherStatus view={view} time={time} {...actions} />
		</TestProviders>,
	);
	return actions;
};
const region = () => document.querySelector<HTMLElement>('[data-weather-state]')!;

test.each([
	[{ kind: 'unconfigured' }, 'weather.state.unconfigured', ['weather.configure']],
	[{ kind: 'waiting' }, 'weather.state.waiting', []],
	[{ kind: 'invalidated' }, 'weather.state.invalidated', []],
	[{ kind: 'loading', stage: 'primary' }, 'weather.state.loading', ['weather.cancel']],
	[{ kind: 'refreshing' }, 'weather.state.refreshing', ['weather.cancel']],
	[{ kind: 'ready', stale: false }, 'weather.stale', []],
	[{ kind: 'ready', stale: true }, 'weather.state.outdated', ['weather.retry']],
	[{ kind: 'error', code: 'timeout' }, 'weather.error.timeout', ['weather.retry', 'weather.configure']],
	[{ kind: 'error', code: 'network' }, 'weather.error.network', ['weather.retry', 'weather.configure']],
	[{ kind: 'error', code: 'invalid-response' }, 'weather.error.invalid-response', ['weather.retry', 'weather.configure']],
	[{ kind: 'cancelled' }, 'weather.state.cancelled', ['weather.retry']],
] as [WeatherView, string, string[]][])('%j states its situation in words and offers only the fitting actions', (view, key, actions) => {
	show(view);
	expect(region().dataset.weatherState).toBe(view.kind);
	expect(region().textContent).toContain(t(key, { time: '10:30', seconds: 27 }));
	expect(screen.queryAllByRole('button').map((button) => button.textContent)).toEqual(actions.map((action) => t(action)));
});

test('failure is an alert, progress is busy status and loading names the budget and the current step', () => {
	show({ kind: 'error', code: 'timeout' });
	expect(region().getAttribute('role')).toBe('alert');
	cleanup();
	show({ kind: 'loading', stage: 'fallback' });
	expect(region().getAttribute('role')).toBe('status');
	expect(region().getAttribute('aria-busy')).toBe('true');
	expect(region().textContent).toContain(t('weather.stage.fallback'));
	expect(region().textContent).toContain('27');
});

test('the actions call back and a status never carries a title or aria-label', () => {
	const { onRetry, onConfigure, onCancel } = show({ kind: 'error', code: 'network' });
	fireEvent.click(screen.getByRole('button', { name: t('weather.retry') }));
	fireEvent.click(screen.getByRole('button', { name: t('weather.configure') }));
	expect(onRetry).toHaveBeenCalledTimes(1);
	expect(onConfigure).toHaveBeenCalledTimes(1);
	expect(region().hasAttribute('title') || region().hasAttribute('aria-label')).toBe(false);
	cleanup();
	const loading = show({ kind: 'loading', stage: 'primary' });
	fireEvent.click(screen.getByRole('button', { name: t('weather.cancel') }));
	expect(loading.onCancel).toHaveBeenCalledTimes(1);
	expect(onCancel).not.toHaveBeenCalled();
});
