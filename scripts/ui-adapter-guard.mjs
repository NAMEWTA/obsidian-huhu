import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const inputs = JSON.parse(readFileSync(new URL('./ui-adapter-inputs.json', import.meta.url), 'utf8'));

/** Fail closed both when source text changes and when an entry stops matching onLoad.
 * The manifest records the actual production graph, not just the installed packages.
 * State lives inside setup and resets onStart, including watch rebuilds. */
export function guardedAdapter(name, transforms, graphCounts) {
	// Fixtures may intentionally omit a production-only dependency copy. Require
	// an explicit, complete graph contract; source validation never changes.
	const suffixes = Object.keys(transforms);
	const counts = graphCounts === undefined
		? Object.fromEntries(suffixes.map(suffix => [suffix, inputs[suffix]?.files]))
		: { ...graphCounts };
	if (Object.keys(counts).length !== suffixes.length || suffixes.some(suffix => !Object.hasOwn(counts, suffix) || !Number.isSafeInteger(counts[suffix]) || counts[suffix] < 0)) {
		throw new Error(`${name}: graph contract must give an exact nonnegative file count for every adapter input`);
	}
	return {
		name,
		setup(build) {
			const seen = new Map();
			build.onStart(() => { seen.clear(); });
			for (const [suffix, transform] of Object.entries(transforms)) {
				const expected = inputs[suffix];
				if (!expected) throw new Error(`${name}: missing input manifest for ${suffix}`);
				const filter = new RegExp(`[\\\\/]${suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replaceAll('/', '[\\\\/]')}$`);
				build.onLoad({ filter }, ({ path }) => {
					const source = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
					const digest = createHash('sha256').update(source).digest('hex');
					if (!expected.sha256.includes(digest)) throw new Error(`${name}: unreviewed source ${suffix}`);
					const files = seen.get(suffix) ?? new Set();
					files.add(path);
					seen.set(suffix, files);
					return { contents: transform(source), loader: 'js' };
				});
			}
			build.onEnd((result) => {
				if (result.errors.length) return;
				const errors = [];
				for (const suffix of Object.keys(transforms)) {
					const actual = seen.get(suffix)?.size ?? 0;
					if (actual !== counts[suffix]) errors.push({ text: `${name}: ${suffix}: expected ${counts[suffix]} matched files, got ${actual}; review entry paths/exports and the dependency graph` });
				}
				return { errors };
			});
		},
	};
}

export function patchText(source, label) {
	return {
		replace(before, after, count = 1) {
			const actual = source.split(before).length - 1;
			if (actual !== count) throw new Error(`${label}: expected ${count} anchors, got ${actual}: ${before}`);
			source = source.replaceAll(before, after);
			return this;
		},
		get source() { return source; },
	};
}
