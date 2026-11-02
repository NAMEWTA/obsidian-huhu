import { ArchiveError } from './model';

export function object(value: unknown): value is Record<string, unknown> {
	return (
		!!value &&
		typeof value === 'object' &&
		!Array.isArray(value) &&
		Object.getPrototypeOf(value) === Object.prototype
	);
}
export function own(value: object, key: string): boolean {
	return Object.prototype.hasOwnProperty.call(value, key);
}
export function identifier(value: unknown): value is string {
	return (
		typeof value === 'string' &&
		/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(value) &&
		!['constructor', 'prototype', '__proto__'].includes(value)
	);
}
export function requiredId(value: unknown, context = ''): asserts value is string {
	if (!identifier(value)) throw new ArchiveError('invalid-id', context);
}
/** Undefined object members are absent in the portable JSON/YAML protocol; null and empty values remain distinct. */
export function canonical(value: unknown): string {
	const ancestors = new Set<object>();
	let nodes = 0;
	const encode = (item: unknown, depth: number): string => {
		if (++nodes > 200000 || depth > 48) throw new ArchiveError('invalid-input', 'value limits');
		if (item === undefined) return 'undefined';
		if (item === null || typeof item === 'boolean' || typeof item === 'string') return JSON.stringify(item);
		if (typeof item === 'number' && Number.isFinite(item)) return JSON.stringify(item);
		if (!Array.isArray(item) && !object(item)) throw new ArchiveError('invalid-input');
		if (ancestors.has(item)) throw new ArchiveError('invalid-input', 'cyclic value');
		ancestors.add(item);
		const encoded = Array.isArray(item)
			? '[' + item.map((child) => encode(child, depth + 1)).join(',') + ']'
			: '{' +
				Object.keys(item)
					.filter((key) => item[key] !== undefined)
					.sort()
					.map((key) => JSON.stringify(key) + ':' + encode(item[key], depth + 1))
					.join(',') +
				'}';
		ancestors.delete(item);
		return encoded;
	};
	return encode(value, 0);
}
export function equal(a: unknown, b: unknown): boolean {
	return canonical(a) === canonical(b);
}
export function copy<T>(value: T): T {
	try {
		canonical(value);
		return structuredClone(value);
	} catch {
		throw new ArchiveError('invalid-input');
	}
}
/** Hash is evidence; mutations also compare the exact captured source bytes. */
export async function digest(value: string): Promise<string> {
	return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))]
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('');
}
export function text(value: unknown, name: string, max = 512): string {
	if (
		typeof value !== 'string' ||
		!value.trim() ||
		value.length > max ||
		[...value].some((char) => char.charCodeAt(0) < 32 && ![9, 10, 13].includes(char.charCodeAt(0)))
	)
		throw new ArchiveError('invalid-definition', name);
	return value;
}
export function safeRelativePath(value: unknown): value is string {
	return (
		typeof value === 'string' &&
		!!value &&
		value.length <= 2048 &&
		!/^[\\/]|[\\:*?"<>|]/.test(value) &&
		![...value].some((char) => char.charCodeAt(0) < 32) &&
		value.split('/').every((part) => !!part && part !== '..' && !part.startsWith('.') && part.trim() === part)
	);
}
export function present(value: unknown): boolean {
	return value !== undefined && value !== null && value !== '' && (!Array.isArray(value) || value.length > 0);
}

/** Never turn an arbitrary object into an accidental display name. */
export function displayName(value: unknown, fallback: string): string {
	return typeof value === 'string' && value ? value : fallback;
}
