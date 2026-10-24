import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../ui/react/test-providers';
import { setLanguage, t } from '../../../../shared/i18n';
import { CitySearch } from './CitySearch';
import type { GeocodeResult } from '../../platform/widgets/weather-service';

const current = { cityName: '广州', latitude: 23.13, longitude: 113.26, admin1: '广东省', country: '中国' };
const delaySearch = () => act(async () => { await vi.advanceTimersByTimeAsync(300); });
function deferred() {
	let resolve!: (value: GeocodeResult[]) => void;
	const promise = new Promise<GeocodeResult[]>((done) => { resolve = done; });
	return { promise, resolve };
}
beforeEach(() => { setLanguage('en'); vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

test('search drafts and late results never overwrite the current location or survive a cleared query', async () => {
	const slow = deferred(), fast = deferred();
	const search = vi.fn().mockReturnValueOnce(slow.promise).mockReturnValueOnce(fast.promise);
	const save = vi.fn(async () => {});
	render(<TestProviders><CitySearch current={current} search={search} onSelect={save} /></TestProviders>);
	const input = screen.getByRole('textbox', { name: t('home.dashboard.city') });
	fireEvent.change(input, { target: { value: '深圳' } }); await delaySearch();
	expect(screen.getByRole('status').textContent).toBe(t('weather.searching'));
	fireEvent.change(input, { target: { value: '北京' } }); await delaySearch();
	await act(async () => { slow.resolve([{ name: '深圳', latitude: 22.54, longitude: 114.06, country: '中国' }]); });
	expect(screen.queryByRole('button', { name: /深圳/ })).toBeNull();
	fireEvent.click(screen.getByRole('button', { name: t('weather.clearSearch') }));
	await act(async () => { fast.resolve([{ name: '北京', latitude: 39.9, longitude: 116.4, country: '中国' }]); });
	expect(screen.queryByRole('button', { name: /北京/ })).toBeNull();
	expect(screen.getByText(t('weather.currentLocation', { location: '广州 · 广东省 · 中国' }))).toBeTruthy();
	expect(save).not.toHaveBeenCalled();
});

test('empty results differ from failures, retry shows regional labels and only choosing a candidate saves', async () => {
	const search = vi.fn().mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([
		{ name: '朝阳', latitude: 41.57, longitude: 120.45, admin1: '辽宁省', country: '中国' },
		{ name: '朝阳', latitude: 39.92, longitude: 116.44, admin1: '北京市', country: '中国' },
	]);
	const save = vi.fn(async () => {});
	render(<TestProviders><CitySearch current={current} search={search} onSelect={save} /></TestProviders>);
	const input = screen.getByRole('textbox', { name: t('home.dashboard.city') });
	fireEvent.change(input, { target: { value: 'unknown' } }); await delaySearch();
	expect(screen.getByRole('status').textContent).toBe(t('weather.noResults'));
	fireEvent.change(input, { target: { value: '朝阳' } }); await delaySearch();
	expect(screen.getByRole('alert').textContent).toContain(t('weather.searchFailed'));
	fireEvent.click(screen.getByRole('button', { name: t('weather.retry') })); await delaySearch();
	expect(screen.getByRole('button', { name: '朝阳 · 辽宁省 · 中国' })).toBeTruthy();
	await act(async () => { fireEvent.click(screen.getByRole('button', { name: '朝阳 · 北京市 · 中国' })); });
	expect(save).toHaveBeenCalledExactlyOnceWith({ cityName: '朝阳', latitude: 39.92, longitude: 116.44, admin1: '北京市', country: '中国' });
});
