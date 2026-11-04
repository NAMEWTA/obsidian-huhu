import { ArchiveError } from '../schema/model';
export interface Decimal { n: bigint; scale: number }
export const ZERO: Decimal = { n: 0n, scale: 0 };
export function decimal(value: string): Decimal {
	if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value) || value.length > 128) throw new ArchiveError('invalid-money');
	const [whole = '0', fraction = ''] = value.split('.');
	return { n: BigInt(whole + fraction), scale: fraction.length };
}
export function add(a: Decimal, b: Decimal): Decimal {
	const scale = Math.max(a.scale, b.scale);
	return { n: a.n * 10n ** BigInt(scale - a.scale) + b.n * 10n ** BigInt(scale - b.scale), scale };
}
export const subtract = (a: Decimal, b: Decimal): Decimal => add(a, { ...b, n: -b.n });
export function format(value: Decimal): string {
	const sign = value.n < 0n ? '-' : '';
	const digits = (value.n < 0n ? -value.n : value.n).toString().padStart(value.scale + 1, '0');
	const text = value.scale ? `${digits.slice(0, -value.scale)}.${digits.slice(-value.scale)}`.replace(/\.?0+$/, '') : digits;
	return value.n === 0n ? '0' : sign + text;
}
/** Half away from zero, six decimal places; no binary floating-point money conversion. */
export function daily(value: Decimal, days: number): string {
	const numerator = (value.n < 0n ? -value.n : value.n) * 1_000_000n;
	const denominator = BigInt(days) * 10n ** BigInt(value.scale);
	const rounded = (numerator * 2n + denominator) / (denominator * 2n);
	return format({ n: value.n < 0n ? -rounded : rounded, scale: 6 });
}
