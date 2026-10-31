// Tests never touch the developer's real home or provider configuration: every test file starts with a throwaway HOME.
// Rustup follows that HOME when RUSTUP_HOME is unset. Remember the host roots first so a later
// cargo build (the packaged control skill) still finds the toolchain check:native already used.
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

const host = globalThis as { __huhuHostHome?: string; __huhuHostCargoHome?: string; __huhuHostRustupHome?: string };
host.__huhuHostHome ??= process.env.HOME ?? process.env.USERPROFILE ?? homedir();
if (process.env.CARGO_HOME) host.__huhuHostCargoHome ??= process.env.CARGO_HOME;
if (process.env.RUSTUP_HOME) host.__huhuHostRustupHome ??= process.env.RUSTUP_HOME;

// Go's build and module caches are content-addressed tool caches, not user configuration. Pin them to the host's
// defaults (computed before HOME and LOCALAPPDATA move) so the real Go runner builds stay warm, as rustup does above.
if (!process.env.GOCACHE) {
	const cacheRoot = process.platform === 'win32' ? process.env.LOCALAPPDATA
		: process.platform === 'darwin' ? join(host.__huhuHostHome, 'Library', 'Caches')
		: process.env.XDG_CACHE_HOME || join(host.__huhuHostHome, '.cache');
	if (cacheRoot) process.env.GOCACHE = join(cacheRoot, 'go-build');
}
if (!process.env.GOMODCACHE) process.env.GOMODCACHE = join(process.env.GOPATH?.split(process.platform === 'win32' ? ';' : ':')[0] || join(host.__huhuHostHome, 'go'), 'pkg', 'mod');

const home = mkdtempSync(join(tmpdir(), 'huhu-test-home-'));
for (const key of ['HOME', 'USERPROFILE']) process.env[key] = home;
for (const key of ['CLAUDE_CONFIG_DIR', 'CODEX_HOME', 'GROK_HOME', 'GEMINI_CLI_HOME', 'PI_CODING_AGENT_DIR', 'PI_CODING_AGENT_SESSION_DIR', 'OPENCODE_CONFIG_DIR', 'XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'XDG_CACHE_HOME', 'XDG_STATE_HOME', 'APPDATA', 'LOCALAPPDATA']) delete process.env[key];
// Windows has no home-derived default for these: product code (Profile roots, lock directories) requires
// them, as a real Windows session always defines them. Point them inside the throwaway home.
if (process.platform === 'win32') {
	for (const [key, ...parts] of [['APPDATA', 'AppData', 'Roaming'], ['LOCALAPPDATA', 'AppData', 'Local']] as const) {
		const dir = join(home, ...parts);
		mkdirSync(dir, { recursive: true });
		process.env[key] = dir;
	}
}
process.on('exit', () => { try { rmSync(home, { recursive: true, force: true }); } catch { /* best effort */ } });
