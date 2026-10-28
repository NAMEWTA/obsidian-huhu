import { fork, type ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { afterEach, beforeAll, afterAll, expect, it } from 'vitest';
import { AgentBrowserError, type OperationRecord } from '../../../core/contracts';
import { OperationLedger } from '../../../services/operation-ledger';
import { DesktopBrowserPersistence } from './browser-persistence';
import { fixturePayload, fixtureProtector, fixtureScope, increment } from '../../../../../../test/release/browser-operation-ledger-process.fixture';

const roots: string[] = [], stores: DesktopBrowserPersistence[] = [], children = new Set<ChildProcess>();
let scriptRoot: string, script: string;
beforeAll(async () => {
	scriptRoot = await fs.mkdtemp(path.join(tmpdir(), 'huhu-ledger-worker-')); script = path.join(scriptRoot, 'worker.cjs');
	const built = await build({ entryPoints: [path.resolve('test/release/browser-operation-ledger-process.fixture.ts')], bundle: true, platform: 'node', format: 'cjs', write: false });
	await fs.writeFile(script, built.outputFiles[0]!.contents);
});
afterAll(async () => { await fs.rm(scriptRoot, { recursive: true, force: true }); });
afterEach(async () => {
	await Promise.all([...children].map(async child => { const exited = once(child, 'exit'); child.kill('SIGKILL'); await exited; children.delete(child); }));
	await Promise.all(stores.splice(0).map(store => store.dispose()));
	await Promise.all(roots.splice(0).map(root => fs.rm(root, { recursive: true, force: true })));
});
async function root() {
	// Production hashes roots into a bounded mutex-port range. Select a free test namespace
	// before any ticket/effect exists, so an unrelated local listener cannot flake the fixture.
	for (let attempt = 0; attempt < 32; attempt++) {
		const value = await fs.mkdtemp(path.join(tmpdir(), 'huhu-ledger-')); roots.push(value);
		const canonical = await fs.realpath(value), port = 49152 + createHash('sha256').update(process.platform === 'win32' ? canonical.toLowerCase() : canonical).digest().readUInt16BE(0) % 16384;
		const probe = createServer();
		const available = await new Promise<boolean>((resolve, reject) => { probe.once('error', error => (error as NodeJS.ErrnoException).code === 'EADDRINUSE' ? resolve(false) : reject(error)); probe.listen({ host: '127.0.0.1', port, exclusive: true }, () => resolve(true)); });
		if (available) { await new Promise<void>(resolve => probe.close(() => resolve())); return canonical; }
	}
	throw Error('no free fixture owner namespace');
}
function store(root: string) { const storage = new DesktopBrowserPersistence({ root, protector: fixtureProtector() }); stores.push(storage); return storage; }
const bodyFile = (root: string, id: string) => path.join(root, 'records', `${Buffer.from(`operations/${id}`).toString('hex')}.sealed`);
async function count(root: string) { try { return Number(await fs.readFile(path.join(root, 'effect-count'), 'utf8')); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; return 0; } }

it.each(['prepared', 'intent', 'effect', 'completed'])('recovers a killed process at %s without replaying its physical effect', async phase => {
	const directory = await root(), child = fork(script, [directory, phase], { execArgv: [], env: { ...process.env, HUHU_LEDGER_TEST_PROCESS: '1' }, stdio: ['ignore', 'ignore', 'ignore', 'ipc'] }); children.add(child);
	const message = await new Promise<{ stage: string; ticket: OperationRecord }>((resolve, reject) => {
		child.once('error', reject); child.once('exit', code => reject(Error(`fixture exited ${code}`)));
		child.once('message', value => { const message = value as { stage: string; ticket: OperationRecord; error?: string }; if (message.error) reject(Error(message.error)); else resolve(message); });
	});
	expect(message.stage).toBe(phase);
	const exited = once(child, 'exit'); child.kill('SIGKILL'); await exited; children.delete(child);
	const storage = store(directory), ledger = new OperationLedger(storage, () => 1000, () => false); await ledger.initialize();
	const expected = phase === 'prepared' ? 'cancelled_before_dispatch' : phase === 'completed' ? 'completed' : 'outcome_unknown';
	const outcome = await ledger.execute(message.ticket.id, fixturePayload, () => {}, async () => ({ count: await increment(directory) }));
	expect(outcome.state).toBe(expected); expect(await count(directory)).toBe(phase === 'prepared' || phase === 'intent' ? 0 : 1);
	if (phase === 'completed') expect(outcome.result).toEqual({ count: 1 });
	else expect(outcome.result).toBeUndefined();
	await storage.dispose();
	const nextStore = store(directory), collected = new OperationLedger(nextStore, () => 31 * 86_400_000, () => false); await collected.initialize(); await collected.prune();
	await expect(collected.execute(message.ticket.id, fixturePayload, () => {}, async () => ({ count: await increment(directory) }))).rejects.toThrow('operation_gone');
	expect(await count(directory)).toBe(phase === 'prepared' || phase === 'intent' ? 0 : 1);
});

it('coalesces concurrent reservations and executions on encrypted disk and preserves the low water after restart', async () => {
	const directory = await root(), storage = store(directory); let now = 1000, writable = true;
	const ledger = new OperationLedger(storage, () => now, () => writable);
	const tickets = await Promise.all(Array.from({ length: 16 }, () => ledger.prepare('same', fixtureScope, fixturePayload)));
	expect(new Set(tickets.map(ticket => ticket.id)).size).toBe(1); expect(tickets[0]!.sequence).toBe(1);
	const results = await Promise.all(tickets.map(ticket => ledger.execute(ticket.id, fixturePayload, () => {}, async () => ({ count: await increment(directory) }))));
	expect(results.every(result => result.state === 'completed')).toBe(true); expect(await count(directory)).toBe(1);
	await expect(ledger.prepare('same', fixtureScope, { kind: 'changed' })).rejects.toThrow('request_id_conflict');
	await expect(ledger.execute(tickets[0]!.id, { kind: 'changed' }, () => {}, async () => null)).rejects.toThrow('operation_payload_mismatch');
	now += 31 * 86_400_000; await ledger.prune(); expect((await ledger.prepare('same', fixtureScope, fixturePayload)).id).toBe(tickets[0]!.id);
	writable = false; await ledger.prune(); await storage.dispose();
	const reopened = new OperationLedger(store(directory), () => now, () => false); await reopened.initialize();
	expect(() => reopened.get(tickets[0]!.id)).toThrow('operation_gone'); expect(await count(directory)).toBe(1);
});

it.each(['missing', 'corrupt'])('keeps a %s result unavailable without retrying the dispatched operation', async damage => {
	const directory = await root(), storage = store(directory), ledger = new OperationLedger(storage, () => 1000);
	const ticket = await ledger.prepare('body', fixtureScope, fixturePayload); await ledger.execute(ticket.id, fixturePayload, () => {}, async () => ({ count: await increment(directory) }));
	await storage.dispose(); if (damage === 'missing') await fs.unlink(bodyFile(directory, ticket.id)); else await fs.writeFile(bodyFile(directory, ticket.id), 'corrupt encrypted body');
	const reopened = new OperationLedger(store(directory), () => 1000); await reopened.initialize();
	expect(await reopened.execute(ticket.id, fixturePayload, () => {}, async () => ({ count: await increment(directory) }))).toMatchObject({ state: 'completed', error: 'result_unavailable' });
	expect(await count(directory)).toBe(1);
});

it.each(['publish', 'readback', 'remove'])('does not remove result files before the collection checkpoint is committed and read back (%s fault)', async fault => {
	const directory = await root(); let armed = false, readback = false;
	class FaultStorage extends DesktopBrowserPersistence {
		override async write(key: string, value: unknown) {
			const collecting = armed && key === 'operation-checkpoint' && (value as { issuers: Array<{ lowWater: number }> }).issuers.some(issuer => issuer.lowWater > 0);
			if (collecting && fault === 'publish') throw new AgentBrowserError('storage_quota');
			await super.write(key, value); if (collecting && fault === 'readback') readback = true;
		}
		override async read<T>(key: string): Promise<T | undefined> { if (readback && key === 'operation-checkpoint') throw new AgentBrowserError('storage_corrupt'); return super.read<T>(key); }
		override async remove(key: string) { if (armed && fault === 'remove') throw new AgentBrowserError('storage_quota'); return super.remove(key); }
	}
	const storage = new FaultStorage({ root: directory, protector: fixtureProtector() }); stores.push(storage);
	let now = 1000, writable = true; const ledger = new OperationLedger(storage, () => now, () => writable);
	const ticket = await ledger.prepare('gc', fixtureScope, fixturePayload); await ledger.execute(ticket.id, fixturePayload, () => {}, async () => ({ count: await increment(directory) }));
	now += 31 * 86_400_000; writable = false; armed = true; await expect(ledger.prune()).rejects.toBeInstanceOf(AgentBrowserError);
	expect((await fs.stat(bodyFile(directory, ticket.id))).isFile()).toBe(true);
	await storage.dispose(); const reopenedStore = store(directory), reopened = new OperationLedger(reopenedStore, () => now, () => false); await reopened.initialize();
	if (fault === 'publish') expect(reopened.get(ticket.id)).toMatchObject({ state: 'completed', result: { count: 1 } });
	else expect(() => reopened.get(ticket.id)).toThrow('operation_gone');
	await reopened.prune(); await expect(fs.stat(bodyFile(directory, ticket.id))).rejects.toMatchObject({ code: 'ENOENT' }); expect(await count(directory)).toBe(1);
});

it.each(['prepared', 'dispatching', 'completed'])('reconciles a committed %s checkpoint whose readback ACK was lost', async state => {
	const directory = await root(); let armed = false, failRead = false;
	class LostAckStorage extends DesktopBrowserPersistence {
		override async write(key: string, value: unknown) {
			await super.write(key, value);
			if (armed && key === 'operation-checkpoint' && (value as { entries: OperationRecord[] }).entries.some(record => record.state === state)) failRead = true;
		}
		override async read<T>(key: string): Promise<T | undefined> { if (failRead && key === 'operation-checkpoint') throw new AgentBrowserError('storage_corrupt'); return super.read<T>(key); }
	}
	const storage = new LostAckStorage({ root: directory, protector: fixtureProtector() }); stores.push(storage);
	const ledger = new OperationLedger(storage, () => 1000); await ledger.initialize(); armed = state === 'prepared';
	let ticket: OperationRecord;
	if (state === 'prepared') {
		await expect(ledger.prepare('lost-ack', fixtureScope, fixturePayload)).rejects.toThrow('storage_corrupt');
		// The parent never received this ticket, but the durable reservation must retain its requestId.
		failRead = false; ticket = (await storage.read<{ entries: OperationRecord[] }>('operation-checkpoint'))!.entries[0]!;
	} else {
		ticket = await ledger.prepare('lost-ack', fixtureScope, fixturePayload); armed = true;
		const result = await ledger.execute(ticket.id, fixturePayload, () => {}, async () => ({ count: await increment(directory) }));
		expect(result.state).toBe(state === 'dispatching' ? 'cancelled_before_dispatch' : 'outcome_unknown');
		await expect(ledger.execute(ticket.id, fixturePayload, () => {}, async () => ({ count: await increment(directory) }))).rejects.toThrow('journal_unavailable');
	}
	await storage.dispose(); const recovered = new OperationLedger(store(directory), () => 1000); await recovered.initialize();
	expect((await recovered.prepare('lost-ack', fixtureScope, fixturePayload)).id).toBe(ticket.id);
	const outcome = await recovered.execute(ticket.id, fixturePayload, () => {}, async () => ({ count: await increment(directory) }));
	expect(outcome.state).toBe(state === 'prepared' ? 'cancelled_before_dispatch' : state === 'dispatching' ? 'outcome_unknown' : 'completed');
	expect(await count(directory)).toBe(state === 'completed' ? 1 : 0);
});

it('refuses a missing checkpoint or lost HMAC key rather than treating issued tickets as new work', async () => {
	for (const missing of ['checkpoint', 'key']) {
		const directory = await root(), storage = store(directory), ledger = new OperationLedger(storage, () => 1000);
		const ticket = await ledger.prepare('protected-request', fixtureScope, fixturePayload); await ledger.execute(ticket.id, fixturePayload, () => {}, async () => ({ count: await increment(directory) }));
		if (missing === 'checkpoint') await storage.remove('operation-checkpoint');
		await storage.dispose();
		if (missing === 'key') await fs.unlink(path.join(directory, 'digest-key.sealed'));
		const reopened = new OperationLedger(store(directory), () => 1000);
		await expect(reopened.initialize()).rejects.toThrow(missing === 'key' ? 'key_unavailable' : 'journal_corrupt');
		expect(await count(directory)).toBe(1);
	}
});

it('collects old result bodies at storage capacity while retaining the live issuer request mapping', async () => {
	const directory = await root();
	class CapacityStorage extends DesktopBrowserPersistence {
		override async write(key: string, value: unknown) {
			if (key.startsWith('operations/') && !(await super.keys('operations/')).includes(key) && (await super.keys('operations/')).length >= 1) throw new AgentBrowserError('storage_quota');
			return super.write(key, value);
		}
	}
	const storage = new CapacityStorage({ root: directory, protector: fixtureProtector() }); stores.push(storage);
	const ledger = new OperationLedger(storage, () => 1000), first = await ledger.prepare('capacity-first', fixtureScope, fixturePayload);
	await ledger.execute(first.id, fixturePayload, () => {}, async () => ({ count: await increment(directory) }));
	const second = await ledger.prepare('capacity-second', fixtureScope, fixturePayload);
	expect(await ledger.execute(second.id, fixturePayload, () => {}, async () => ({ count: await increment(directory) }))).toMatchObject({ state: 'completed', result: { count: 2 } });
	expect(await ledger.prepare('capacity-first', fixtureScope, fixturePayload)).toMatchObject({ id: first.id, state: 'completed', error: 'result_unavailable' });
	expect(ledger.get(first.id)).not.toHaveProperty('result');
	expect(await storage.read('operation-checkpoint')).toMatchObject({ issuers: [{ issued: 2, lowWater: 0 }] });
	expect(await ledger.execute(first.id, fixturePayload, () => {}, async () => ({ count: await increment(directory) }))).toMatchObject({ state: 'completed', error: 'result_unavailable' });
	expect(await count(directory)).toBe(2);
});
