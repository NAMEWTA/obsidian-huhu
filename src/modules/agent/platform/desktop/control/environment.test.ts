import { expect, test, vi } from 'vitest';
import type {
	NativeControlCall,
	NativeControlRegistration,
	NativeHostAccess,
	NativeLease,
} from '../../../../../shared/native/host';
import { ControlEnvironment, controlWireScope } from './environment';

const scope = {
	vaultId: 'v',
	deviceId: 'd',
	instanceId: 'i',
	rootPath: '/linked',
	physicalRoot: { canonicalPath: '/real', dev: '1', ino: '2' },
};
function fixture() {
	let alive = true;
	const registration: NativeControlRegistration = {
		route: { type: 'control-registered', controlId: 'id', endpoint: '/socket', locator: '/locator' },
		current: (lease) => alive && lease === pty,
		admit: () => true,
		progress: () => true,
		result: async () => {},
		close: vi.fn(async () => {
			alive = false;
		}),
	};
	const control = {
		registerControl: vi.fn(async () => registration),
		release: vi.fn(async () => {}),
	} as unknown as NativeLease;
	const pty = { acquireControl: vi.fn(async () => control) } as unknown as NativeLease;
	const native = { acquire: vi.fn(async () => control) } as unknown as NativeHostAccess;
	const owner = new ControlEnvironment({
		native,
		scope: async () => scope,
		capture: () => ({ execute: vi.fn(), dispose: vi.fn() }),
		closed: vi.fn(),
	});
	return {
		owner,
		pty,
		control,
		native,
		registration,
		lose: () => {
			alive = false;
		},
	};
}
test('transport scope preserves original rootPath; bound launch never reacquires another helper generation', async () => {
	const f = fixture();
	try {
		expect(controlWireScope(scope)).toEqual({ ...scope, physicalRoot: undefined, root: scope.physicalRoot });
		const routed = await f.owner.routeEnvironment(
			{ spaceId: 'space', sessionId: 'stable', runtimeId: 'runtime' },
			f.pty,
		);
		expect(f.native.acquire).not.toHaveBeenCalled();
		expect(f.pty.acquireControl).toHaveBeenCalledOnce();
		expect(routed.env).toEqual({
			HUHU_INSTANCE_ID: 'i',
			HUHU_VAULT_ID: 'v',
			HUHU_SPACE_ID: 'space',
			HUHU_STABLE_SESSION_ID: 'stable',
			HUHU_SESSION_ID: 'runtime',
			HUHU_CONTROL_LOCATOR: '/locator',
		});
		routed.assertCurrent();
		f.lose();
		expect(() => routed.assertCurrent()).toThrow();
	} finally {
		await f.owner.close();
	}
	expect(f.registration.close).toHaveBeenCalledOnce();
	expect(f.control.release).toHaveBeenCalledOnce();
});
test('explicit workbench registers once; closed or legacy bound leases cannot fall back to ordinary native acquire', async () => {
	const f = fixture();
	await f.owner.prepare();
	await f.owner.prepare();
	expect(f.native.acquire).toHaveBeenCalledOnce();
	await f.owner.close();
	await expect(f.owner.prepare()).rejects.toMatchObject({ code: 'MODULE_INACTIVE' });
	const legacy = fixture();
	try {
		await expect(
			legacy.owner.routeEnvironment({ spaceId: 's', sessionId: 'p', runtimeId: 'r' }, {} as NativeLease),
		).rejects.toMatchObject({ code: 'CAPABILITY_UNAVAILABLE' });
		expect(legacy.native.acquire).not.toHaveBeenCalled();
	} finally {
		await legacy.owner.close();
	}
});

test('a request forwarded in the registered ACK stack is synchronously captured rather than dropped before register resolves', async () => {
	const f = fixture(),
		forward = vi.fn(),
		capture = vi.fn((_call: NativeControlCall, _scope: Readonly<typeof scope>) => ({
			execute: forward,
			dispose: vi.fn(),
		}));
	const request = {
		wire: {
			type: 'control-request' as const,
			controlId: 'id',
			bridgeId: 'early',
			request: { protocolVersion: 1 as const, requestId: 'early', operation: 'space.list' as const },
		},
		signal: new AbortController().signal,
	};
	vi.mocked(f.control.registerControl!).mockImplementation(async (_scope, events) => {
		events.forward(request);
		return f.registration;
	});
	const owner = new ControlEnvironment({ native: f.native, scope: async () => scope, capture, closed: () => {} });
	try {
		await owner.prepare();
		expect(forward).toHaveBeenCalledOnce();
		expect(capture.mock.calls[0]?.[0]).toBe(request);
	} finally {
		await owner.close();
	}
});
