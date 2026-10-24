import { beforeEach, expect, test, vi } from 'vitest';
import { setLanguage } from '../../../../shared/i18n';
const request = vi.hoisted(() => vi.fn());
vi.mock('obsidian', async (original) => ({ ...await original(), requestUrl: request }));
import { geocodeCity } from './weather-service';
beforeEach(() => { request.mockReset(); setLanguage('en'); });

test('Chinese city names use Chinese labels and conservative administrative-suffix fallback', async () => {
	request.mockResolvedValueOnce({ json: {} }).mockResolvedValueOnce({ json: { results: [
		{ name: '广州', latitude: 23.13, longitude: 113.26, admin1: '广东省', admin2: '广州市', country: '中国' },
	] } });
	expect(await geocodeCity(' 广州市 ')).toEqual([{ name: '广州', latitude: 23.13, longitude: 113.26, admin1: '广东省', admin2: '广州市', country: '中国' }]);
	const urls = request.mock.calls.map(([options]) => new URL(options.url));
	expect(urls.map((url) => url.searchParams.get('name'))).toEqual(['广州市', '广州']);
	expect(urls[0]!.searchParams.get('language')).toBe('zh');
	expect(urls[0]!.searchParams.get('count')).toBe('10');
});

test('a supported longer Chinese prefix and same-name place qualifiers are sent without guessing coordinates', async () => {
	request.mockResolvedValue({ json: { results: [{ name: '呼和浩特', latitude: 40.84, longitude: 111.75, admin1: '内蒙古自治区', country: '中国' }] } });
	expect((await geocodeCity('呼和浩'))[0]!.name).toBe('呼和浩特');
	expect(new URL(request.mock.calls[0]![0].url).searchParams.get('name')).toBe('呼和浩');
	await geocodeCity('朝阳，中国');
	expect(new URL(request.mock.calls[1]![0].url).searchParams.get('name')).toBe('朝阳,中国');
});

test('no matches and transport/provider failures stay distinct; short searches make no request', async () => {
	expect(await geocodeCity('北')).toEqual([]); expect(request).not.toHaveBeenCalled();
	request.mockResolvedValueOnce({ json: {} }); expect(await geocodeCity('unknown')).toEqual([]);
	request.mockRejectedValueOnce(new Error('offline')); await expect(geocodeCity('深圳')).rejects.toThrow('offline');
	request.mockResolvedValueOnce({ json: { error: true } }); await expect(geocodeCity('深圳')).rejects.toThrow('Invalid geocoding response');
});

beforeEach(() => { vi.stubGlobal('window', { setTimeout, clearTimeout }); });
