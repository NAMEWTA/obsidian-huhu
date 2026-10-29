// Tests never touch the developer's real home or provider configuration: every test file starts with a throwaway HOME.
// Rustup follows that HOME when RUSTUP_HOME is unset. Remember the host roots first so a later
// cargo build (the packaged control skill) still finds the toolchain check:native already used.
import { mkdtempSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

const host = globalThis as { __huhuHostHome?: string; __huhuHostCargoHome?: string; __huhuHostRustupHome?: string };
host.__huhuHostHome ??= process.env.HOME ?? process.env.USERPROFILE ?? homedir();
if (process.env.CARGO_HOME) host.__huhuHostCargoHome ??= process.env.CARGO_HOME;
if (process.env.RUSTUP_HOME) host.__huhuHostRustupHome ??= process.env.RUSTUP_HOME;

const home = mkdtempSync(join(tmpdir(), 'huhu-test-home-'));
for (const key of ['HOME', 'USERPROFILE']) process.env[key] = home;
for (const key of ['CLAUDE_CONFIG_DIR', 'CODEX_HOME', 'GROK_HOME', 'GEMINI_CLI_HOME', 'PI_CODING_AGENT_DIR', 'PI_CODING_AGENT_SESSION_DIR', 'OPENCODE_CONFIG_DIR', 'XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'XDG_CACHE_HOME', 'XDG_STATE_HOME', 'APPDATA', 'LOCALAPPDATA']) delete process.env[key];
process.on('exit', () => { try { rmSync(home, { recursive: true, force: true }); } catch { /* best effort */ } });
