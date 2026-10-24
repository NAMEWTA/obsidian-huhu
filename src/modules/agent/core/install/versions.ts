import type { InstallPlatform } from './packages';
// Install-location discovery (`where` / `which -a`) and the version comparison follow farion1231/cc-switch (MIT),
// Copyright (c) 2025 Jason Young: src-tauri/src/commands/misc.rs.

/** First dotted version in `--version` output ("codex-cli 0.162.0", "2.1.3 (Claude Code)", "v1.19.3"). */
export function parseVersion(output: string): string | undefined {
	return /\bv?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)/.exec(output)?.[1];
}

function parts(version: string): { nums: number[]; pre: string } {
	const [core = '', pre = ''] = version.replace(/^v/, '').split(/-(.*)/s);
	return { nums: core.split('.').map((n) => Number.parseInt(n, 10) || 0), pre };
}

/** Negative when a < b. A pre-release sorts below its release. */
export function compareVersions(a: string, b: string): number {
	const x = parts(a),
		y = parts(b);
	for (let i = 0; i < Math.max(x.nums.length, y.nums.length); i++) {
		const d = (x.nums[i] ?? 0) - (y.nums[i] ?? 0);
		if (d) return d;
	}
	if (x.pre === y.pre) return 0;
	if (!x.pre) return 1;
	if (!y.pre) return -1;
	return x.pre < y.pre ? -1 : 1;
}

export function hasNewerVersion(current: string | undefined, latest: string | undefined): boolean {
	return !!current && !!latest && compareVersions(current, latest) < 0;
}

const WINDOWS_RANK: Record<string, number> = { '.exe': 0, '.com': 1, '.cmd': 2, '.bat': 3, '.ps1': 4 };

/**
 * Every installation of a command from `where` (Windows) or `which -a` (Unix) output. On Windows the extensionless
 * npm shim, `.cmd` and `.ps1` of one install collapse to a single entry, preferring `.exe` then `.cmd`.
 */
export function parseInstallLocations(output: string, platform: InstallPlatform): string[] {
	const lines = output
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter((l) => l && !/^(INFO:|which: no )/i.test(l));
	if (platform !== 'win32') return [...new Set(lines.filter((l) => l.startsWith('/')))];
	const byBase = new Map<string, { path: string; rank: number }>();
	for (const line of lines) {
		if (!/^[A-Za-z]:[\\/]|^\\\\/.test(line)) continue;
		const ext = /\.[A-Za-z0-9]+$/.exec(line)?.[0].toLowerCase() ?? '';
		const base = (ext in WINDOWS_RANK ? line.slice(0, -ext.length) : line).toLowerCase();
		// The extensionless file is the Unix shim npm also writes; it cannot run from cmd.exe, so it ranks last.
		const rank = ext in WINDOWS_RANK ? WINDOWS_RANK[ext]! : 9;
		const seen = byBase.get(base);
		if (!seen || rank < seen.rank) byBase.set(base, { path: line, rank });
	}
	return [...byBase.values()].map((v) => v.path);
}
