import { normalizePath } from 'obsidian';
import type { BotErrorData } from '../../../api';
import { BotRpcError } from '../../../core/protocol/connection';

export const NOTE_BYTES = 65_536;
export const BASELINE_BYTES = 1_048_576;
export const utf8 = new TextEncoder();

export function noteFault(reason: string, kind: BotErrorData['kind'] = 'CAPABILITY_DENIED'): BotRpcError {
	return new BotRpcError(-32000, { kind, reason, retryable: false, correlationId: 'host-note-effects' });
}
export function opaque(prefix: string): string {
	return `${prefix}:${Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}
export function hex(bytes: ArrayBuffer): string {
	return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function digest(text: string): Promise<string> {
	return `sha256:${hex(await crypto.subtle.digest('SHA-256', utf8.encode(text)))}`;
}
export function sameJson(left: unknown, right: unknown): boolean {
	if (left === right) return true;
	if (!left || !right || typeof left !== 'object' || typeof right !== 'object' || Array.isArray(left) !== Array.isArray(right)) return false;
	const a = left as Record<string, unknown>, b = right as Record<string, unknown>;
	return Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(key => Object.hasOwn(b, key) && sameJson(a[key], b[key]));
}
/** Private receipt authentication: sorted object keys, unchanged arrays/strings; no locale or platform encoding. */
export function canonical(value: unknown): string {
	if (value === null || typeof value !== 'object') return JSON.stringify(value);
	if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
	return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}`;
}
export function record(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}
export function exactKeys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): boolean {
	return required.every(key => Object.hasOwn(value, key)) && Object.keys(value).every(key => required.includes(key) || optional.includes(key));
}
export function hasControl(value: string): boolean { return Array.from(value).some(point => point.charCodeAt(0) < 32 || point.charCodeAt(0) === 127); }
export function notePath(path: string, configDir: string): string {
	const parts = path.split('/');
	if (!path || normalizePath(path) !== path || /[\\:]/.test(path) || hasControl(path) || path.startsWith('/') ||
		parts.some(part => !part || part === '.' || part === '..' || ['.huhu', '.git'].includes(part.toLowerCase())) ||
		!!configDir && (path.toLowerCase() === configDir.toLowerCase() || path.toLowerCase().startsWith(`${configDir.toLowerCase()}/`)))
		throw noteFault('NOTE_TARGET_INVALID');
	return path;
}
