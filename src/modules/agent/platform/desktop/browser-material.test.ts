import * as fs from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, expect, it, vi } from 'vitest';
import { BrowserMaterialFiles } from './browser-material';
import { BROWSER_MATERIALS_ROOT } from '../../../../shared/storage/vault-layout';
vi.mock('node:fs/promises', async importOriginal => { const actual = await importOriginal<typeof import('node:fs/promises')>(); return { ...actual, open: vi.fn(actual.open) }; });
const cleanups: Array<() => Promise<void>> = [];
afterEach(async () => { vi.restoreAllMocks(); for (const cleanup of cleanups.splice(0)) await cleanup(); });
it('cancels during an actual private file write and removes only this capture, preserving an earlier artifact', async () => {
	const vault = await fs.realpath(await fs.mkdtemp(path.join(tmpdir(), 'huhu-material-write-'))), files = new BrowserMaterialFiles(vault); cleanups.push(async () => { await files.dispose(); await fs.rm(vault, { recursive: true, force: true }); });
	const png = { mime: 'image/png' as const, data: new Uint8Array([137,80,78,71,13,10,26,10]) }, previous = await files.prepare(png, new AbortController().signal), abort = new AbortController(), open = vi.mocked(fs.open).getMockImplementation()!;
	vi.mocked(fs.open).mockImplementation(async (...args: Parameters<typeof open>) => { const handle = await open(...args), write = handle.writeFile.bind(handle); handle.writeFile = async (...input: Parameters<typeof write>) => { await write(...input); abort.abort(); }; return handle; });
	await expect(files.prepare({ title: 'New', text: 'x'.repeat(20000), image: png }, abort.signal)).rejects.toThrow('material_cancelled');
	expect(await fs.readFile(previous.files[0]!)).toEqual(Buffer.from(png.data));
	const directory = path.join(vault, BROWSER_MATERIALS_ROOT, (await fs.readdir(path.join(vault, BROWSER_MATERIALS_ROOT)))[0]!); expect(await fs.readdir(directory)).toEqual([path.basename(previous.files[0]!)]);
});
