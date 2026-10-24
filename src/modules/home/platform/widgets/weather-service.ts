import type { TextStorage } from '../../../../shared/storage/ports';
import { WEATHER_CACHE_ROOT } from '../../../../shared/storage/vault-layout';
import { requestUrl } from 'obsidian';
import type { WeatherConfig, WeatherData } from '../../core/board/types/index';
import { getLanguage } from '../../../../shared/i18n/index';

/** Bound waiting time; a late native response has no path back into a published widget request. */
async function weatherRequest(options: Parameters<typeof requestUrl>[0]) {
	const clock = window;
 let timer: number | undefined;
	try {
		return await Promise.race([
			requestUrl(options),
			new Promise<never>((_resolve, reject) => {
				timer = clock.setTimeout(() => reject(new Error('Weather request timed out')), 12_000);
			}),
		]);
	} finally {
		if (timer !== undefined) clock.clearTimeout(timer);
	}
}

// ---------- API response shapes ----------
// `requestUrl(...).json` is typed `any`; these interfaces model each provider's
// payload so structured access doesn't leak `any` downstream.

interface OpenMeteoCurrent {
	temperature_2m?: number;
	weather_code?: number;
	wind_speed_10m?: number;
	relative_humidity_2m?: number;
	apparent_temperature?: number;
}

interface OpenMeteoDaily {
	temperature_2m_max?: number[];
	temperature_2m_min?: number[];
	weather_code?: number[];
	time?: string[];
	precipitation_probability_max?: number[];
}

interface OpenMeteoResponse {
	timezone?: string;
	hourly?: {
		time?: string[];
		temperature_2m?: number[];
		weather_code?: number[];
		precipitation_probability?: number[];
	};
	current?: OpenMeteoCurrent;
	daily?: OpenMeteoDaily;
}

interface MetNoDetails {
	air_temperature?: number;
	wind_speed?: number;
	relative_humidity?: number;
}

interface MetNoSummary {
	symbol_code?: string;
}

interface MetNoEntry {
	time: string;
	data: {
		instant: { details: MetNoDetails };
		next_1_hours?: { summary?: MetNoSummary };
		next_6_hours?: { summary?: MetNoSummary };
	};
}

interface MetNoResponse {
	properties?: { timeseries?: MetNoEntry[] };
}

interface GeocodeItem {
	name: string;
	latitude: number;
	longitude: number;
	country: string;
	admin1?: string;
	admin2?: string;
	timezone?: string;
}

interface GeocodeResponse {
	results?: GeocodeItem[];
	error?: boolean;
}

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

interface CacheEntry {
	data: WeatherData;
	fetchedAt: number;
}

const weatherCache = new Map<string, CacheEntry>();

export interface GeocodeResult {
	name: string;
	latitude: number;
	longitude: number;
	country: string;
	admin1?: string;
	admin2?: string;
	timezone?: string;
}

export function getCachedWeather(config: WeatherConfig): WeatherData | null {
	const key = cacheKey(config);
	const entry = weatherCache.get(key);
	if (!entry) return null;
	if (Date.now() - entry.fetchedAt > CACHE_TTL) {
		weatherCache.delete(key);
		return null;
	}
	return entry.data;
}

// Open-Meteo supplies timezone, current conditions and seven-day/hourly forecasts. Met.no is the fallback.
export async function fetchWeather(config: WeatherConfig, storage?: TextStorage, force = false): Promise<WeatherData> {
	const cached = getCachedWeather(config) ?? (!force && storage ? await readWeatherCache(config, storage) : null);
 if (cached && !force && Date.now() - cached.fetchedAt < CACHE_TTL) return cached;
	let data: WeatherData;
	try {
		data = await fetchFromOpenMeteoBase('https://api.open-meteo.com', config);
	} catch {
		data = await fetchFromMetNo(config);
	}
	if (storage) {
		try {
			await storage.mkdir(WEATHER_CACHE_ROOT);
			await storage.write(`${WEATHER_CACHE_ROOT}/${cacheKey(config)}.json`, JSON.stringify(data));
		} catch {
			/* A disposable cache never prevents showing a successful forecast. */
		}
	}
	return data;
}
/** Per-vault cache can be displayed offline, but never published as a newly fetched forecast. */
export async function readWeatherCache(config: WeatherConfig, storage: TextStorage): Promise<WeatherData | null> {
	try {
		const data: unknown = JSON.parse(await storage.read(`${WEATHER_CACHE_ROOT}/${cacheKey(config)}.json`));
		if (!data || typeof data !== 'object') return null;
		const r = data as WeatherData;
		if (
			!Number.isFinite(r.temperature) ||
			!Number.isFinite(r.weatherCode) ||
			!Number.isFinite(r.fetchedAt) ||
			![r.dailyMax, r.dailyMin, r.dailyCodes, r.dailyDates].every(Array.isArray)
		)
			return null;
		if (r.timezone) {
			try {
				new Intl.DateTimeFormat('en', { timeZone: r.timezone });
			} catch {
				return null;
			}
		}
		if (Date.now() - r.fetchedAt <= CACHE_TTL)
			weatherCache.set(cacheKey(config), { data: r, fetchedAt: r.fetchedAt });
		return r;
	} catch {
		return null;
	}
}

async function fetchFromOpenMeteoBase(base: string, config: WeatherConfig): Promise<WeatherData> {
	const url = `${base}/v1/forecast?latitude=${config.latitude}&longitude=${config.longitude}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,apparent_temperature&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&hourly=temperature_2m,weather_code,precipitation_probability&timezone=auto&forecast_days=7`;

	const resp = await weatherRequest({ url });
	const json = resp.json as OpenMeteoResponse;

	const current = json.current;
	const daily = json.daily;

	if (!current || !daily || !Number.isFinite(current.temperature_2m) || !Number.isFinite(current.weather_code)) {
		throw new Error('Invalid weather API response');
	}

	const data: WeatherData = {
		temperature: current.temperature_2m!,
		weatherCode: current.weather_code!,
		windSpeed: Number.isFinite(current.wind_speed_10m) ? current.wind_speed_10m! : null,
		humidity: Number.isFinite(current.relative_humidity_2m) ? current.relative_humidity_2m! : null,
		feelsLike: Number.isFinite(current.apparent_temperature) ? current.apparent_temperature! : null,
		dailyMax: Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max.slice(0, 7) : [],
		dailyMin: Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min.slice(0, 7) : [],
		dailyCodes: Array.isArray(daily.weather_code) ? daily.weather_code.slice(0, 7) : [],
		dailyDates: Array.isArray(daily.time) ? daily.time.slice(0, 7) : [],
		timezone: json.timezone,
		source: 'Open-Meteo',
		dailyPrecipitation: daily.precipitation_probability_max,
		hourly: (json.hourly?.time ?? [])
			.map((time, i) => ({
				time,
				temperature: json.hourly?.temperature_2m?.[i] ?? null,
				weatherCode: json.hourly?.weather_code?.[i] ?? null,
				precipitation: json.hourly?.precipitation_probability?.[i] ?? null,
			}))
			.filter(
				(h) =>
					h.time >=
					new Intl.DateTimeFormat('sv-SE', {
						timeZone: json.timezone || config.timezone || 'UTC',
						year: 'numeric',
						month: '2-digit',
						day: '2-digit',
						hour: '2-digit',
						minute: '2-digit',
						hourCycle: 'h23',
					})
						.format(new Date())
						.replace(' ', 'T'),
			)
			.slice(0, 24),
		fetchedAt: Date.now(),
	};

	weatherCache.set(cacheKey(config), { data, fetchedAt: Date.now() });
	return data;
}

// ---------- Met.no (fallback, 5+ day forecast) ----------

async function fetchFromMetNo(config: WeatherConfig): Promise<WeatherData> {
	const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${config.latitude}&lon=${config.longitude}`;

	const resp = await weatherRequest({ url, headers: { 'User-Agent': 'obsidian-dashboard' } });
	const json = resp.json as MetNoResponse;

	const timeseries = json.properties?.timeseries;
	if (!Array.isArray(timeseries) || timeseries.length === 0) {
		throw new Error('Invalid Met.no response');
	}

	const now = timeseries[0]!;
	if (!Number.isFinite(now.data.instant.details.air_temperature)) throw new Error('Invalid current temperature');
	const nowDetails = now.data.instant.details;
	const nowSymbol =
		now.data.next_1_hours?.summary?.symbol_code ?? now.data.next_6_hours?.summary?.symbol_code;

	// Group by date, compute daily max/min and representative weather code
	const dayMap = new Map<string, { min: number; max: number; codes: string[] }>();
	for (const entry of timeseries) {
		const dateStr = new Intl.DateTimeFormat('en-CA', {
			timeZone: config.timezone || 'UTC',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
		}).format(new Date(entry.time));
		const temp = entry.data.instant.details.air_temperature;
		if (typeof temp !== 'number' || !Number.isFinite(temp)) continue;
		const sym = entry.data.next_1_hours?.summary?.symbol_code ?? entry.data.next_6_hours?.summary?.symbol_code;

		if (!dayMap.has(dateStr)) {
			dayMap.set(dateStr, { min: temp, max: temp, codes: [] });
		}
		const d = dayMap.get(dateStr)!;
		d.min = Math.min(d.min, temp);
		d.max = Math.max(d.max, temp);
		if (sym) d.codes.push(sym);
	}

	const dailyDates = [...dayMap.keys()].slice(0, 7);
	const dailyMax = dailyDates.map((d) => Math.round(dayMap.get(d)!.max));
	const dailyMin = dailyDates.map((d) => Math.round(dayMap.get(d)!.min));
	const dailyCodes = dailyDates.map((d) => {
		const codes = dayMap.get(d)!.codes;
		return codes.length > 0 ? mapMetNoCode(metNoDaytimeCode(codes)) : -1;
	});

	const data: WeatherData = {
		temperature: Math.round(nowDetails.air_temperature as number),
		weatherCode: nowSymbol ? mapMetNoCode(nowSymbol) : -1,
		windSpeed: typeof nowDetails.wind_speed === 'number' ? Math.round(nowDetails.wind_speed * 3.6) : null,
		humidity: typeof nowDetails.relative_humidity === 'number' ? Math.round(nowDetails.relative_humidity) : null,
		feelsLike: null,
		timezone: config.timezone,
		source: 'Met.no',
		hourly: timeseries.slice(0, 24).map((e) => ({
			time: e.time,
			temperature: e.data.instant.details.air_temperature ?? null,
			weatherCode: e.data.next_1_hours?.summary?.symbol_code
				? mapMetNoCode(e.data.next_1_hours.summary.symbol_code)
				: null,
			precipitation: null,
		})),
		dailyMax,
		dailyMin,
		dailyCodes,
		dailyDates,
		fetchedAt: Date.now(),
	};

	weatherCache.set(cacheKey(config), { data, fetchedAt: Date.now() });
	return data;
}

// Met.no locationforecast returns weathericon 2.0 `symbol_code`s (full legend:
// github.com/metno/weathericons, weather/legend.csv). Symbols split into base
// names the API never suffixes (continuous precipitation, fog, overcast) and
// names the API suffixes with _day/_night/_polartwilight (sky states and
// showers). The light-shower families also circulate under two spellings —
// "lights"+"sleetshowers" with and without the extra "s" — so both are listed.
const METNO_PLAIN: Record<string, number> = {
	cloudy: 3,
	fog: 45,
	lightrain: 61,
	rain: 63,
	heavyrain: 65,
	lightrainandthunder: 95,
	rainandthunder: 95,
	heavyrainandthunder: 95,
	lightsleet: 66,
	sleet: 67,
	heavysleet: 67,
	lightsleetandthunder: 95,
	sleetandthunder: 95,
	heavysleetandthunder: 95,
	lightsnow: 71,
	snow: 73,
	heavysnow: 75,
	lightsnowandthunder: 95,
	snowandthunder: 95,
	heavysnowandthunder: 95,
	thunderstorm: 95,
};

const METNO_VARIANTED: Record<string, number> = {
	clearsky: 0,
	fair: 1,
	partlycloudy: 2,
	lightrainshowers: 80,
	rainshowers: 81,
	heavyrainshowers: 82,
	lightrainshowersandthunder: 95,
	rainshowersandthunder: 95,
	heavyrainshowersandthunder: 95,
	lightsleetshowers: 85,
	lightssleetshowers: 85,
	sleetshowers: 85,
	heavysleetshowers: 86,
	lightsleetshowersandthunder: 95,
	lightssleetshowersandthunder: 95,
	sleetshowersandthunder: 95,
	heavysleetshowersandthunder: 95,
	lightsnowshowers: 85,
	lightssnowshowers: 85,
	snowshowers: 86,
	heavysnowshowers: 86,
	lightsnowshowersandthunder: 95,
	lightssnowshowersandthunder: 95,
	snowshowersandthunder: 95,
	heavysnowshowersandthunder: 95,
};

const METNO_TO_WMO: Record<string, number> = (() => {
	const table: Record<string, number> = { ...METNO_PLAIN };
	for (const [base, code] of Object.entries(METNO_VARIANTED)) {
		for (const suffix of ['', '_day', '_night', '_polartwilight']) {
			table[base + suffix] = code;
		}
	}
	return table;
})();

export function mapMetNoCode(symbol: string): number {
	const direct = METNO_TO_WMO[symbol];
	if (direct !== undefined) return direct;
	// Unknown symbol (e.g. a future Met.no addition): retry without the
	// time-of-day suffix, then classify by precipitation keyword, so new
	// symbols degrade sensibly instead of always reading "overcast".
	const stripped = symbol.replace(/_(day|night|polartwilight)$/, '');
	const base = METNO_TO_WMO[stripped];
	if (base !== undefined) return base;
	if (stripped.includes('thunder')) return 95;
	if (stripped.includes('sleet')) return 67;
	if (stripped.includes('snow')) return 73;
	if (stripped.includes('rain')) return 63;
	if (stripped.includes('fog')) return 45;
	return 3;
}

function metNoDaytimeCode(codes: string[]): string {
	const daylight = codes.find((c) => !c.includes('_night'));
	return daylight ?? codes[0] ?? 'cloudy';
}

// ---------- Geocoding ----------

export async function geocodeCity(query: string): Promise<GeocodeResult[]> {
	const name = query.trim().replace(/，/g, ',');
	if ([...name].length < 2) return [];
	const lang = getLanguage();
	// Open-Meteo matches two characters exactly and longer names by prefix. Chinese city aliases often omit 市/县/区.
	// Keep the original request first, then a conservative suffix fallback; never guess or save coordinates.
	const names = [name];
	const parts = name.match(/[^省市区县]+[省市区县]?/gu) ?? [];
	const parents = parts.slice(0, -1).map((p) => p.replace(/[省市区县]$/u, ''));
	if (parts.length > 1) names.push(parts[parts.length - 1]!.replace(/[区县]$/u, ''));
	if (/[\u3400-\u9fff]/.test(name)) {
		const [place = '', qualifier] = name.split(',').map((part) => part.trim());
		const short = place.replace(/(?:特别行政区|自治州|地区|市|县|区)$/u, '');
		if ([...short].length >= 2 && short !== place) names.push([short, qualifier].filter(Boolean).join(', '));
	}
	for (const term of names) {
		const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(term)}&count=10&language=${lang === 'zh' || /[\u3400-\u9fff]/.test(name) ? 'zh' : 'en'}`;
		const resp = await weatherRequest({ url });
		const json = resp.json as GeocodeResponse;
		if (json.error || (json.results !== undefined && !Array.isArray(json.results)))
			throw new Error('Invalid geocoding response');
		const results = (json.results ?? [])
			.filter(
				(r) =>
					typeof r.name === 'string' &&
					r.name.trim() &&
					typeof r.latitude === 'number' &&
					Number.isFinite(r.latitude) &&
					Math.abs(r.latitude) <= 90 &&
					typeof r.longitude === 'number' &&
					Number.isFinite(r.longitude) &&
					Math.abs(r.longitude) <= 180,
			)
			.map((r: GeocodeItem) => ({
				name: r.name,
				latitude: r.latitude,
				longitude: r.longitude,
				country: typeof r.country === 'string' ? r.country : '',
				admin1: r.admin1,
				admin2: r.admin2,
				timezone: r.timezone,
			}));
		const qualified = parents.length
			? results.filter((r) => parents.every((p) => [r.admin1, r.admin2, r.name].some((v) => v?.includes(p))))
			: results;
		if (qualified.length) return qualified;
	}
	return [];
}

// ---------- Helpers ----------

function cacheKey(config: WeatherConfig): string {
	return `${config.latitude.toFixed(4)},${config.longitude.toFixed(4)}`;
}

const WEATHER_EMOJI: Record<number, string> = {
	0: '☀️', // Clear sky
	1: '🌤', // Mainly clear
	2: '⛅', // Partly cloudy
	3: '☁️', // Overcast
	45: '🌫', // Fog
	48: '🌫', // Depositing rime fog
	51: '💧', // Light drizzle
	53: '💧', // Moderate drizzle
	55: '💧', // Dense drizzle
	56: '💧', // Light freezing drizzle
	57: '💧', // Dense freezing drizzle
	61: '🌧', // Slight rain
	63: '🌧', // Moderate rain
	65: '🌧', // Heavy rain
	66: '🌨', // Light freezing rain
	67: '🌨', // Heavy freezing rain
	71: '🌨', // Slight snow
	73: '❄️', // Moderate snow
	75: '❄️', // Heavy snow
	77: '❄️', // Snow grains
	80: '🌧', // Slight rain showers
	81: '🌧', // Moderate rain showers
	82: '🌧', // Violent rain showers
	85: '❄️', // Slight snow showers
	86: '❄️', // Heavy snow showers
	95: '⛈️', // Thunderstorm
	96: '⛈️', // Thunderstorm with slight hail
	99: '⛈️', // Thunderstorm with heavy hail
};

export function getWeatherEmoji(code: number): string {
	return WEATHER_EMOJI[code] ?? '☁️';
}

const WEATHER_DESC_EN: Record<number, string> = {
	0: 'Clear sky',
	1: 'Mainly clear',
	2: 'Partly cloudy',
	3: 'Overcast',
	45: 'Fog',
	48: 'Rime fog',
	51: 'Light drizzle',
	53: 'Drizzle',
	55: 'Dense drizzle',
	56: 'Freezing drizzle',
	57: 'Freezing drizzle',
	61: 'Light rain',
	63: 'Rain',
	65: 'Heavy rain',
	66: 'Freezing rain',
	67: 'Freezing rain',
	71: 'Light snow',
	73: 'Snow',
	75: 'Heavy snow',
	77: 'Snow grains',
	80: 'Showers',
	81: 'Showers',
	82: 'Heavy showers',
	85: 'Snow showers',
	86: 'Heavy snow showers',
	95: 'Thunderstorm',
	96: 'Thunderstorm',
	99: 'Thunderstorm',
};

const WEATHER_DESC_ZH: Record<number, string> = {
	0: '晴',
	1: '大部晴朗',
	2: '多云',
	3: '阴',
	45: '雾',
	48: '雾凇',
	51: '小毛毛雨',
	53: '毛毛雨',
	55: '大毛毛雨',
	56: '冻毛毛雨',
	57: '冻毛毛雨',
	61: '小雨',
	63: '中雨',
	65: '大雨',
	66: '冻雨',
	67: '冻雨',
	71: '小雪',
	73: '中雪',
	75: '大雪',
	77: '雪粒',
	80: '阵雨',
	81: '阵雨',
	82: '大阵雨',
	85: '阵雪',
	86: '大阵雪',
	95: '雷暴',
	96: '雷暴',
	99: '雷暴',
};

export function getWeatherDescription(code: number): string {
	const lang = getLanguage();
	const desc = lang === 'zh' ? WEATHER_DESC_ZH[code] : WEATHER_DESC_EN[code];
	return desc ?? 'Unknown';
}
