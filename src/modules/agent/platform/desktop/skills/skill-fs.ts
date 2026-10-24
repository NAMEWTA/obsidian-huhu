// Content hashing, scanning and copy semantics adapted from xingkongliang/skills-manager 7f92c21 (MIT), Copyright (c) 2026 Tianliang Zhang: src-tauri/src/core/content_hash.rs, skill_metadata.rs, sync_engine.rs
import { createHash, randomBytes } from 'node:crypto';
import { lstat, mkdir, open, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { readSkillMeta } from '../../../core/skills/registry';
import { SKILL_COPY_MARKER, SkillError, parseMarker, type SkillCopyMarker, type SkillLocation, type SkillRoot } from '../../../core/skills/library';

const IGNORED = new Set(['.git', '.DS_Store', 'Thumbs.db', '__pycache__', 'node_modules']);
const MAX_FILES = 2000;
const MAX_BYTES = 32_000_000;
const MAX_SKILL_MD = 256_000;
const TEMP_PREFIX = '.huhu-skill-';

const ignored = (name: string): boolean => IGNORED.has(name) || name.endsWith('.pyc') || name === SKILL_COPY_MARKER || name.startsWith(TEMP_PREFIX);

interface Entry { relative: string; absolute: string; }

/** The files that make up a skill, sorted. Links and unreadable entries are not part of its content. */
async function contentFiles(dir: string, signal?: AbortSignal): Promise<Entry[]> {
	const files: Entry[] = [];
	const walk = async (folder: string, prefix: string): Promise<void> => {
		signal?.throwIfAborted();
		const entries = (await readdir(folder, { withFileTypes: true })).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
		for (const entry of entries) {
			if (ignored(entry.name) || entry.isSymbolicLink()) continue;
			const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
			if (entry.isDirectory()) await walk(path.join(folder, entry.name), relative);
			else if (entry.isFile()) {
				if (files.length >= MAX_FILES) throw new SkillError('too-large');
				files.push({ relative, absolute: path.join(folder, entry.name) });
			}
		}
	};
	await walk(dir, '');
	return files;
}

export async function hashSkillDir(dir: string, signal?: AbortSignal): Promise<string> {
	const hash = createHash('sha256');
	let bytes = 0;
	for (const file of await contentFiles(dir, signal)) {
		const content = await readFile(file.absolute);
		bytes += content.length;
		if (bytes > MAX_BYTES) throw new SkillError('too-large');
		hash.update(`${file.relative}\0${content.length}\0`).update(content).update('\0');
	}
	return hash.digest('hex');
}

/** The marker of a real (non-link) directory, or undefined for anything else. */
export async function readCopyMarker(dir: string): Promise<SkillCopyMarker | undefined> {
	try {
		if (!(await lstat(dir)).isDirectory()) return undefined;
		const file = path.join(dir, SKILL_COPY_MARKER);
		if (!(await lstat(file)).isFile()) return undefined;
		return parseMarker(await readFile(file, 'utf8'));
	} catch { return undefined; }
}

export interface ScanResult { locations: SkillLocation[]; unavailable: string[]; }

async function readLocation(root: SkillRoot, dir: string, linked: boolean, signal?: AbortSignal): Promise<SkillLocation | undefined> {
	const file = path.join(dir, 'SKILL.md');
	const info = await stat(file);
	if (!info.isFile() || info.size > MAX_SKILL_MD) throw new SkillError('too-large');
	const folder = path.basename(dir);
	const meta = readSkillMeta(await readFile(file, { encoding: 'utf8', signal }), folder);
	if (!meta) return undefined;
	const marker = linked ? undefined : await readCopyMarker(dir);
	return {
		target: root.target, scope: root.scope, dir, root: root.dir, folder, name: meta.name, description: meta.description,
		hash: await hashSkillDir(dir, signal), ...(marker && marker.name === meta.name ? { copy: marker } : {}), ...(linked ? { link: true } : {}),
	};
}

/**
 * Skills in a skills directory are its direct children containing SKILL.md, as the agents themselves read it.
 * `depth` lets a user-supplied extra directory hold nested categories.
 */
export async function scanRoot(root: SkillRoot, signal?: AbortSignal, depth = 0): Promise<ScanResult> {
	const result: ScanResult = { locations: [], unavailable: [] };
	const walk = async (folder: string, level: number): Promise<void> => {
		signal?.throwIfAborted();
		let entries;
		try { entries = await readdir(folder, { withFileTypes: true }); }
		catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT' && (error as NodeJS.ErrnoException).code !== 'ENOTDIR') result.unavailable.push(folder); return; }
		for (const entry of entries) {
			if (entry.name.startsWith(TEMP_PREFIX) || (entry.name.startsWith('.') && level > 0)) continue;
			const dir = path.join(folder, entry.name);
			let isDir = entry.isDirectory();
			if (entry.isSymbolicLink()) { try { isDir = (await stat(dir)).isDirectory(); } catch { isDir = false; } }
			if (!isDir) continue;
			try {
				const location = await readLocation(root, dir, entry.isSymbolicLink(), signal);
				if (location) { result.locations.push(location); continue; }
				result.unavailable.push(dir);
			} catch (error) {
				if (signal?.aborted) throw error;
				if ((error as NodeJS.ErrnoException).code === 'ENOENT') { if (level < depth && !entry.isSymbolicLink()) await walk(dir, level + 1); continue; }
				result.unavailable.push(dir);
			}
		}
	};
	await walk(root.dir, 0);
	return result;
}

async function exists(file: string): Promise<boolean> {
	try { await lstat(file); return true; } catch { return false; }
}

async function copyTree(source: string, target: string): Promise<void> {
	await mkdir(target, { recursive: true });
	for (const file of await contentFiles(source)) {
		const destination = path.join(target, ...file.relative.split('/'));
		await mkdir(path.dirname(destination), { recursive: true });
		await writeFile(destination, await readFile(file.absolute));
	}
}

const temporary = (root: string, kind: string): string => path.join(root, `${TEMP_PREFIX}${kind}-${randomBytes(6).toString('hex')}`);

/** Build a marked copy of `source` next to its destination, ready to be renamed into place. */
async function stage(source: SkillLocation, root: string): Promise<string> {
	const staged = temporary(root, 'tmp');
	try {
		await copyTree(source.dir, staged);
		const marker: SkillCopyMarker = { version: 1, name: source.name, source: source.dir, hash: await hashSkillDir(staged), copiedAt: Date.now() };
		await writeFile(path.join(staged, SKILL_COPY_MARKER), `${JSON.stringify(marker, null, '\t')}\n`);
		return staged;
	} catch (error) { await rm(staged, { recursive: true, force: true }); throw error; }
}

/** Copy a skill into a skills directory. A directory that is already there is never overwritten. */
export async function copySkill(source: SkillLocation, root: SkillRoot): Promise<string> {
	const target = path.join(root.dir, source.folder);
	if (path.dirname(target) !== root.dir || source.folder === '.' || source.folder === '..') throw new SkillError('unavailable');
	await mkdir(root.dir, { recursive: true });
	if (await exists(target)) throw new SkillError('exists');
	const staged = await stage(source, root.dir);
	try {
		if (await exists(target)) throw new SkillError('exists');
		await rename(staged, target);
	} catch (error) { await rm(staged, { recursive: true, force: true }); throw error; }
	return target;
}

/** Throws unless `location` is a real directory on disk that still carries HUHU's marker for this skill. */
async function assertOwned(location: SkillLocation): Promise<void> {
	if (location.link || !location.copy || path.dirname(location.dir) !== location.root) throw new SkillError('not-owned');
	const marker = await readCopyMarker(location.dir);
	if (!marker || marker.name !== location.name) throw new SkillError('not-owned');
}

/** Replace a copy HUHU made with the current content of its source. */
export async function updateCopy(source: SkillLocation, copy: SkillLocation): Promise<void> {
	await assertOwned(copy);
	const staged = await stage(source, copy.root);
	const old = temporary(copy.root, 'old');
	try {
		await rename(copy.dir, old);
		try { await rename(staged, copy.dir); }
		catch (error) { await rename(old, copy.dir); throw error; }
	} catch (error) { await rm(staged, { recursive: true, force: true }); throw error; }
	await rm(old, { recursive: true, force: true });
}

/**
 * Remove a copy HUHU made. `trash` moves it to the system trash; without it the folder is deleted.
 * Anything without a valid marker, and any link, is refused.
 */
export async function removeCopy(copy: SkillLocation, trash?: (dir: string) => Promise<void>): Promise<void> {
	await assertOwned(copy);
	if (trash) {
		try { await trash(copy.dir); }
		catch { throw new SkillError('trash-failed'); }
	} else await rm(copy.dir, { recursive: true, force: true });
}

/** `SKILL.md` of a skill folder (first 256 KB) and its modification time. The caller has already checked the folder is a known one. */
export async function readSkillDoc(dir: string): Promise<{ text: string; mtime: number }> {
	const file = await open(path.join(dir, 'SKILL.md'), 'r');
	try {
		const info = await file.stat();
		const buffer = new Uint8Array(Math.min(info.size, MAX_SKILL_MD));
		const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
		return { text: new TextDecoder().decode(buffer.subarray(0, bytesRead)), mtime: info.mtimeMs };
	} finally { await file.close(); }
}
