import { expect, it, vi } from 'vitest';
import type { BotClient } from '../../../api';
import { managedStop, type RunnerExit, type StopFacts } from './managed-stop';
const final: StopFacts = { requested: true, executionDrained: true, persistenceComplete: true, profileReleased: true, finished: true, failures: [] };
function gate<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; }
it('retains the same owner after caller timeout and waits beyond final facts for actual exit', async () => {
 const stage = gate<StopFacts>(), exit = gate<RunnerExit>();
 const shutdown = vi.fn().mockResolvedValueOnce({ ...final, finished: false, persistenceComplete: false, profileReleased: false }).mockReturnValueOnce(stage.promise);
 const close = vi.fn();
 const owner = managedStop({ service: { shutdown } } as unknown as BotClient, { close, exit: exit.promise });
 await expect(owner.stop({ timeoutMs: 1 })).rejects.toThrow('STOP_OBSERVATION_TIMEOUT');
 expect(shutdown).toHaveBeenCalledTimes(2); expect(close).not.toHaveBeenCalled();
 let done = false;
 const stopped = owner.stop().then(() => { done = true; });
 stage.resolve(final); await Promise.resolve(); await Promise.resolve();
 expect(done).toBe(false); expect(owner.facts).toEqual(final);
 exit.resolve({ code: 0, signal: null, forced: false }); await stopped;
 expect(shutdown).toHaveBeenCalledTimes(2);
});
it.each([
 { facts: { ...final, persistenceComplete: false, failures: ['PERSISTENCE_CLOSE_FAILED'] }, exit: { code: 0, signal: null, forced: false } },
 { facts: { ...final, profileReleased: false }, exit: { code: 0, signal: null, forced: false } },
 { facts: final, exit: { code: 1, signal: null, forced: false } },
 { facts: final, exit: { code: null, signal: 'SIGKILL', forced: true } },
])('does not report success for incomplete facts or failed process exit %#', async ({ facts, exit }) => {
 const owner = managedStop({ service: { shutdown: vi.fn().mockResolvedValue(facts) } } as unknown as BotClient, { close: vi.fn(), exit: Promise.resolve(exit) });
 await expect(owner.stop()).rejects.toThrow();
});
it('does not turn EOF into final facts and cancellation only ends one observation', async () => {
 const reply = gate<StopFacts>(), exit = gate<RunnerExit>();
 const shutdown = vi.fn().mockReturnValue(reply.promise), close = vi.fn();
 const owner = managedStop({ service: { shutdown } } as unknown as BotClient, { close, exit: exit.promise });
 const abort = new AbortController();
 const observing = owner.stop({ signal: abort.signal }); abort.abort();
 await expect(observing).rejects.toThrow('STOP_OBSERVATION_ABORTED'); expect(close).not.toHaveBeenCalled();
 reply.resolve(final); exit.resolve({ code: 0, signal: null, forced: false }); await owner.stop();
 const disconnected = managedStop({ service: { shutdown: vi.fn().mockRejectedValue(new Error('STDOUT_EOF')) } } as unknown as BotClient, { close, exit: Promise.resolve({ code: 0, signal: null, forced: false }) });
 await expect(disconnected.stop()).rejects.toThrow('STDOUT_EOF'); expect(disconnected.facts).toBeUndefined();
});
