import { expect, test, vi } from 'vitest';
import { LazyHealthScanner } from './lazy-scanner';

function fixture() {
	const providers = vi.fn(async () => []);
	const scanner = new LazyHealthScanner({ providers, acquire: async () => undefined, now: Date.now, id: () => crypto.randomUUID(), yieldControl: async () => {} }, () => ({ concurrency: 1, batchSize: 1, maxItems: 10, maxIssues: 10, freshnessMinutes: 5 }));
	return { scanner, providers };
}
test('lazy scan exposes admission immediately and honors cancellation before implementation loads', async () => {
	const { scanner, providers } = fixture();
	try {
		expect(scanner.snapshot).toEqual({ running: false }); expect(providers).not.toHaveBeenCalled();
		const pending = scanner.scan({ providerIds: ['archives.fixture'] });
		expect(scanner.snapshot.running).toBe(true);
		scanner.cancel();
		expect((await pending).status).toBe('cancelled'); expect(providers).not.toHaveBeenCalled();
		expect(scanner.snapshot.running).toBe(false);
	} finally { await scanner.dispose(); }
});
test('disposal during lazy loading prevents discovery and late subscriber updates', async () => {
	const { scanner, providers } = fixture(), changed = vi.fn();
	scanner.subscribe(changed);
	const pending = scanner.scan();
	const stopped = scanner.dispose();
	await expect(pending).rejects.toThrow('health-disposed'); await stopped;
	expect(changed).toHaveBeenCalledTimes(1); expect(providers).not.toHaveBeenCalled();
	await expect(scanner.providers()).rejects.toThrow('health-disposed');
});

test('throwing subscribers cannot steal scan promise or block later subscribers and completion', async () => {
	const { scanner } = fixture(), healthy = vi.fn();
	let pending: ReturnType<typeof scanner.scan> | undefined;
	try {
		scanner.subscribe(() => { throw new Error('consumer-listener-failed'); });
		scanner.subscribe(healthy);
		expect(() => { pending = scanner.scan(); }).not.toThrow();
		expect(pending).toBeInstanceOf(Promise);
		const report = await pending!;
		expect(report).toBeDefined(); expect(scanner.snapshot.report?.id).toBe(report.id);
		expect(scanner.snapshot.running).toBe(false); expect(healthy.mock.calls.length).toBeGreaterThan(1);
	} finally { await pending?.catch(() => {}); await scanner.dispose(); }
});
