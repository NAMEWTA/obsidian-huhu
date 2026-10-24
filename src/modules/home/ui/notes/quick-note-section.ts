import { contentFiles, type ContentFile } from '../../../../host/obsidian/storage/content-files';
import type { App } from 'obsidian';
import { huhuName } from '../../../../shared/storage/vault-layout';
import { substituteTemplateVars } from '../../platform/calendar/daily-notes';
import type { MomentLike } from '../../../../host/obsidian/datetime';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Resolve a vault file path, trying `.md` append if needed. */
function resolveFile(app: App, path: string): ContentFile | null {
	return contentFiles(app).resolveLink(path.trim());
}

/** Read a template file (vault path, `.md` fallback) and substitute
 *  {{date}}/{{time}}/{{title}} vars. An empty path returns { '', true }
 *  (no template configured — not an error); a missing or unreadable file
 *  returns { '', false } so callers can warn the user. */
export async function readTemplateContent(
	app: App,
	tplPath: string,
	opts: { title?: string; now?: MomentLike },
): Promise<{ content: string; found: boolean }> {
	const p = (tplPath || '').trim();
	if (!p) return { content: '', found: true };
	const tpl = resolveFile(app, p);
	if (!tpl) return { content: '', found: false };
	try {
		const raw = await contentFiles(app).read(tpl);
		return { content: substituteTemplateVars(raw, opts), found: true };
	} catch {
		return { content: '', found: false };
	}
}

/** Strip characters that are illegal in filenames across OSes. */
export function sanitizeFilename(name: string): string {
	return huhuName(name, '');
}

/** Return a non-conflicting vault path, appending `-2`, `-3`, … as needed. */
export async function uniquePath(app: App, path: string): Promise<string> {
	if (!(await app.vault.adapter.exists(path))) return path;
	const dot = path.lastIndexOf('.');
	const hasExt = dot > path.lastIndexOf('/');
	const base = hasExt ? path.slice(0, dot) : path;
	const ext = hasExt ? path.slice(dot) : '';
	for (let i = 2; i < 1000; i++) {
		const candidate = `${base}-${i}${ext}`;
		if (!(await app.vault.adapter.exists(candidate))) return candidate;
	}
	return `${base}-${Date.now()}${ext}`;
}

/** Split a leading YAML frontmatter block (a closed `---` fence at line 1)
 *  from the note body. Returns { fm: '', body: raw } when there is none. */
export function splitFrontmatter(raw: string): { fm: string; body: string } {
	if (!raw.startsWith('---')) return { fm: '', body: raw };
	const lines = raw.split('\n');
	for (let i = 1; i < lines.length; i++) {
		if (lines[i]!.trim() === '---') {
			return { fm: `${lines.slice(0, i + 1).join('\n')}\n`, body: lines.slice(i + 1).join('\n') };
		}
	}
	return { fm: '', body: raw };
}
