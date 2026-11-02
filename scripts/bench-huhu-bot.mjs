import { performance } from 'node:perf_hooks';
import os from 'node:os';

const samples = Number(process.env.HUHU_BOT_BENCH_SAMPLES ?? 100);
const historyLength = Number(process.env.HUHU_BOT_BENCH_HISTORY ?? 100);
if (!Number.isInteger(samples) || samples < 1 || samples > 10_000) throw new Error('HUHU_BOT_BENCH_SAMPLES must be 1..10000');
if (!Number.isInteger(historyLength) || historyLength < 1 || historyLength > 4096) throw new Error('HUHU_BOT_BENCH_HISTORY must be 1..4096');

const history = Array.from({ length: historyLength }, (_, index) => ({ id: `message:${index}`, role: index % 2 ? 'assistant' : 'user', text: 'fixed local benchmark payload', seq: index + 1 }));
const durations = [];
for (let sample = 0; sample < samples; sample += 1) {
	const started = performance.now();
	const decoded = JSON.parse(JSON.stringify({ history }));
	if (decoded.history.length !== historyLength) throw new Error('fixed history round-trip failed');
	durations.push(performance.now() - started);
}
durations.sort((a, b) => a - b);
const percentile = (p) => durations[Math.min(durations.length - 1, Math.floor(durations.length * p))];
console.log(JSON.stringify({
	mode: 'deterministic-local', provider: 'not-run', os: `${os.platform()}-${os.arch()}`, node: process.version,
	samples, historyLength, p50Ms: percentile(0.5), p95Ms: percentile(0.95),
	queue: { maxFrames: 32, maxBytes: 2 * (1024 * 1024 + 4) },
}, null, 2));
