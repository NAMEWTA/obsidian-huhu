import { expect, it } from 'vitest';
import fixtures from '../../../../../contracts/hap/v0.1/fixtures/methods.json';
import methods from '../../../../../contracts/hap/v0.1/methods.json';
import type { BotMethod } from '../../api';
import { MethodValidation } from './method-validation';
import frames from '../../../../../contracts/hap/v0.1/fixtures/golden.json';

it('validates the complete shared method corpus against the sole version schema', () => {
	const validation = new MethodValidation();
	expect(validation.compiledCount).toBe(0);
	const names = new Set<string>();
	for (const fixture of fixtures.cases) {
		const { method, part, value, valid } = fixture;
		if (part !== 'params' && part !== 'result') throw new Error('INVALID_FIXTURE_PART');
		const before = JSON.stringify(value);
		expect(validation.validate(method as BotMethod, part, value), fixture.name).toBe(valid);
		expect(JSON.stringify(value), fixture.name).toBe(before);
		names.add(`${method}.${part}`);
	}
	expect(names.size).toBe(Object.keys(methods.methods).length * 2);
	expect(validation.compiledCount).toBe(names.size);
	expect(validation.validate('unregistered.method' as BotMethod, 'params', {})).toBe(false);
	expect(validation.compiledCount).toBe(names.size);
});

it('compiles a method part only when first used and never coerces or removes input', () => {
	const validation = new MethodValidation();
	expect(validation.compiledCount).toBe(0);
	expect(validation.validate('service.health', 'params', {})).toBe(true);
	expect(validation.compiledCount).toBe(1);
	expect(validation.validate('service.health', 'params', {})).toBe(true);
	expect(validation.compiledCount).toBe(1);
	const params = { unknown: true };
	expect(validation.validate('service.health', 'params', params)).toBe(false);
	expect(params).toEqual({ unknown: true });
	expect(validation.validate('service.health', 'result', { status: 'ok' })).toBe(true);
	expect(validation.compiledCount).toBe(2);
});

it('uses one fixed error validator from the canonical schema without growing the method cache', () => {
	const validation = new MethodValidation();
	const payload = frames.valid.find((item) => item.name === 'cursor-expired')!.payload as unknown as { error: { data: Record<string, unknown> } };
	const original = structuredClone(payload.error.data);
	for (let index = 0; index < 10; index++) expect(validation.validateErrorData(original)).toBe(true);
	expect(validation.compiledCount).toBe(0);
	const invalid = { ...original, unknown: true };
	expect(validation.validateErrorData(invalid)).toBe(false);
	expect(invalid.unknown).toBe(true);
	expect(validation.validateErrorData({ ...original, kind: 'CAPABILITY_DENIED' })).toBe(false);
	expect(validation.compiledCount).toBe(0);
});

it('uses the canonical cancel definition without treating control frames as callable methods', () => {
	const validation = new MethodValidation(), control = { jsonrpc: '2.0', method: '$/cancelRequest', params: { requestId: 's:one' } };
	expect(validation.validateCancelNotification(control)).toBe(true);
	expect(validation.validateCancelNotification({ ...control, id: 's:wrong' })).toBe(false);
	expect(validation.validateCancelNotification({ ...control, params: { requestId: 's:one', secret: 'must reject' } })).toBe(false);
	expect(validation.validate('$/cancelRequest' as BotMethod, 'params', control.params)).toBe(false);
	expect(validation.compiledCount).toBe(0);
});

it('requires binding and fingerprints on actual Host methods despite optional legacy application DTO members', () => {
	const validation = new MethodValidation();
	for (const method of ['host.invoke', 'host.checkWrite', 'host.queryReceipt'] as const) {
		const input = structuredClone(fixtures.cases.find(item => item.method === method && item.part === 'params' && item.valid)!.value) as unknown as Record<string, unknown>;
		delete (input.preview as Record<string, unknown>).binding;
		expect(validation.validate(method, 'params', input), method).toBe(false);
	}
	for (const method of ['host.invoke', 'host.queryReceipt'] as const) {
		const result = structuredClone(fixtures.cases.find(item => item.method === method && item.part === 'result' && item.valid)!.value) as unknown as Record<string, unknown>;
		delete result.fingerprint;
		expect(validation.validate(method, 'result', result), method).toBe(false);
	}
});

it('uses typed memory namespaces, one result branch and context-only pagination while memory remains reserved', () => {
 const validation = new MethodValidation();
 const namespace = { kind: 'agent', id: 'agent:a' };
 expect(validation.validate('memory.get', 'params', { profileId: 'profile:1', namespace, kind: 'context', id: 'run:1', cursor: 'page:1', limit: 20 })).toBe(true);
 expect(validation.validate('memory.get', 'params', { profileId: 'profile:1', namespace, kind: 'item', id: 'item:1', cursor: 'page:1' })).toBe(false);
 expect(validation.validate('memory.list', 'params', { profileId: 'profile:1', ownerId: 'agent:a', scope: 'private' })).toBe(false);
 const forgotten = { id: 'item:1', revision: '2', namespace, scope: { kind: 'profile' }, state: 'forgotten', pinned: false };
 expect(validation.validate('memory.forget', 'result', forgotten)).toBe(true);
 expect(validation.validate('memory.forget', 'result', { ...forgotten, body: { text: 'stale' } })).toBe(false);
 expect(validation.validate('memory.get', 'result', { kind: 'item', item: forgotten, settings: {} })).toBe(false);
});
