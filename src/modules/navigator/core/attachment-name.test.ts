// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.
import { expect, test } from 'vitest';
import { attachmentExtension, attachmentFileName, attachmentFolder, attachmentStamp, randomToken, uniqueAttachmentPath } from './attachment-name';

const date = new Date(2026, 9, 21, 7, 5, 9);

test('names are YYYY-MM-DD-HHMMSS-xxxx with a four digit hex token', () => {
	expect(attachmentStamp(date)).toBe('2026-10-21-070509');
	expect(randomToken(() => 0)).toBe('0000');
	expect(randomToken(() => 0.999999)).toBe('ffff');
	expect(randomToken(() => 0.5)).toBe('8000');
	expect(attachmentFileName(date, 'a1b2', 'png')).toBe('2026-10-21-070509-a1b2.png');
	expect(attachmentFileName(date, randomToken(Math.random), 'pdf')).toMatch(/^2026-10-21-070509-[0-9a-f]{4}\.pdf$/);
});

test('the extension comes from the file name, then from the MIME type', () => {
	expect(attachmentExtension('Report.PDF', '')).toBe('pdf');
	expect(attachmentExtension('image.png', 'image/png')).toBe('png');
	expect(attachmentExtension('', 'image/jpeg')).toBe('jpg');
	expect(attachmentExtension('blob', 'image/png; charset=binary')).toBe('png');
	expect(attachmentExtension('weird.', 'application/pdf')).toBe('pdf');
	expect(attachmentExtension('.hidden', '')).toBe('bin');
	expect(attachmentExtension('x.<script>', '')).toBe('bin');
	expect(attachmentExtension('data', 'application/octet-stream')).toBe('bin');
});

test('attachments go to a folder beside the note, one level deep', () => {
	expect(attachmentFolder('Projects/Alpha/plan.md', 'assets')).toBe('Projects/Alpha/assets');
	expect(attachmentFolder('top.md', 'assets')).toBe('assets');
	expect(attachmentFolder('a/b.md', '附件')).toBe('a/附件');
	expect(attachmentFolder('a/b.md', '../x/y')).toBe('a/xy');
	expect(attachmentFolder('a/b.md', '  ')).toBe('a/assets');
	expect(attachmentFolder('a/b.md', '')).toBe('a/assets');
});

test('several files in the same second never share a name', () => {
	const taken = new Set<string>();
	const draws = [0.1, 0.1, 0.1, 0.2, 0.2, 0.3];
	let at = 0;
	const random = () => draws[at++ % draws.length]!;
	const paths = Array.from({ length: 3 }, () => {
		const path = uniqueAttachmentPath('n/assets', date, 'png', (candidate) => taken.has(candidate), random);
		taken.add(path);
		return path;
	});
	expect(new Set(paths).size).toBe(3);
	expect(paths[0]).toBe('n/assets/2026-10-21-070509-1999.png');
	expect(paths[1]).toBe('n/assets/2026-10-21-070509-3333.png');
	expect(uniqueAttachmentPath('/', date, 'png', () => false, () => 0)).toBe('2026-10-21-070509-0000.png');
	expect(() => uniqueAttachmentPath('x', date, 'png', () => true, Math.random)).toThrow('No free attachment name');
});
