// Sample board and vault content for the D2b acceptance run (content sections and record/media widgets): every
// section type and widget with enough data to show lists, long titles, many cards and many tasks.
import zlib from 'node:zlib';

const crcTable = Array.from({ length: 256 }, (_, n) => {
	let c = n;
	for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	return c >>> 0;
});
const crc = (buffer) => {
	let c = 0xffffffff;
	for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
	const head = Buffer.alloc(8);
	head.writeUInt32BE(data.length, 0);
	head.write(type, 4, 'ascii');
	const tail = Buffer.alloc(4);
	tail.writeUInt32BE(crc(Buffer.concat([head.subarray(4), data])), 0);
	return Buffer.concat([head, data, tail]);
};
/** A small gradient PNG (opaque RGB), so image tiles have real pictures to place. */
export function png(width, height, hue) {
	const raw = Buffer.alloc((width * 3 + 1) * height);
	for (let y = 0; y < height; y++) {
		raw[y * (width * 3 + 1)] = 0;
		for (let x = 0; x < width; x++) {
			const at = y * (width * 3 + 1) + 1 + x * 3;
			raw[at] = (hue * 53 + (x * 255) / width) % 256;
			raw[at + 1] = (hue * 97 + (y * 255) / height) % 256;
			raw[at + 2] = (hue * 31 + ((x + y) * 128) / (width + height)) % 256;
		}
	}
	const header = Buffer.alloc(13);
	header.writeUInt32BE(width, 0);
	header.writeUInt32BE(height, 4);
	header[8] = 8;
	header[9] = 2;
	return Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		chunk('IHDR', header),
		chunk('IDAT', zlib.deflateSync(raw)),
		chunk('IEND', Buffer.alloc(0)),
	]);
}

export const today = () => {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const daysAgo = (n) => {
	const d = new Date(Date.now() - n * 86400000);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const LONG = 'A deliberately long note title that has to truncate instead of pushing the layout sideways';
const STATUS = ['Todo', 'Doing', 'Done'];
/** Vault notes the sections read: a library, project notes for the PM board, notes for the pipeline, media. */
export function vaultFiles() {
	const files = {};
	for (let i = 1; i <= 14; i++)
		files[`Library/${i === 3 ? LONG : `Library note ${String(i).padStart(2, '0')}`}.md`] =
			`---\nstatus: ${STATUS[i % 3]}\nrating: ${(i % 5) + 1}\ntags: [library, sample]\ncreated: ${daysAgo(i)}\n---\n# Note ${i}\n\nBody of note ${i}.\n`;
	const stages = ['Idea', 'Build', 'Review', 'Shipped'];
	for (const [i, title] of ['Alpha rollout', 'Beta redesign with a long title that should truncate', 'Gamma migration', 'Delta research'].entries())
		files[`Projects-PM/${title}.md`] =
			`---\ntype: project\nstage: ${stages[i % 4]}\nintro: One line about ${title}\nclient: Client ${i + 1}\nincome: ${(i + 1) * 12000}\nkeyDate: ${daysAgo(-i - 3)}\ncycleStart: ${daysAgo(10)}\ncycleEnd: ${daysAgo(-20)}\nnextStep: Ship the next milestone\ndeliverables: Spec, build, notes\npayment: 30%\n---\n## 里程碑\n- [x] Kickoff\n- [ ] Prototype\n- [ ] Review\n\n## 待办\n- [ ] Write the brief\n- [ ] Book the review\n`;
	for (let i = 1; i <= 9; i++)
		files[`Pipeline/Pipeline item ${i}.md`] =
			`---\nstatus: ${['backlog', 'doing', 'review', 'done'][i % 4]}\ndue: ${daysAgo(-i)}\n---\n# Item ${i}\n\n- [ ] first step\n- [ ] second step\n`;
	for (let i = 1; i <= 8; i++) files[`Media/Picture ${i}.png`] = png(160, 120 + (i % 3) * 30, i);
	for (let i = 1; i <= 6; i++) files[`Notes/Recent note ${i}.md`] = `# Recent ${i}\n\nContent ${i}.\n`;
	files['Notes/A very long recent note title that must truncate inside the recent list row.md'] = '# long\n';
	// A cached feed, so the RSS list has rows to lay out without the network.
	const day = 86400000;
	const items = Array.from({ length: 12 }, (_, i) => ({
		guid: `g${i}`,
		title: i === 1 ? 'An article with a very long headline that has to truncate instead of pushing the row sideways' : `Article ${i + 1}`,
		link: `https://example.invalid/a${i}`,
		pubDate: Date.now() - i * day,
	}));
	files['.huhu/cache/rss/rss.json'] = JSON.stringify({
		version: 1,
		feeds: { 'https://example.invalid/feed.xml': { title: 'Example feed', link: 'https://example.invalid/', items, fetchedAt: Date.now() + day } },
		readGuids: { g2: Date.now(), g3: Date.now() },
		savedGuids: {},
		webCache: {},
	});
	return files;
}

const task = (text, done = false) => `- [${done ? 'x' : ' '}] ${text}`;
const card = (id, title, type, body) => `### ${title}\nid: ${id}\n${type ? `type: ${type}\n` : ''}${body}\n`;

/** Columns (front matter) and cards (body) of the content sections. */
export function sections() {
	const memo = Array.from({ length: 6 }, (_, i) =>
		card(
			`memo-${i + 1}`,
			i === 1 ? 'A memo with a rather long title that has to wrap or truncate cleanly' : `Memo ${i + 1}`,
			'generic',
			`${'Memo body text that runs on for a while. '.repeat(i === 2 ? 6 : 2)}\n\n- one\n- two`,
		),
	).join('\n');
	const todo = [
		card('todo-1', 'Getting started', 'task', [task('Try adding a new card'), task('Drag cards between sections', true), task('A long task text that has to wrap onto more than one line inside the card without clipping')].join('\n')),
		card('todo-2', 'Interface guide', 'task', [task('Drag a widget by its title bar'), task('Open Records in the Home panel'), task('Resize a tile from its corner', true), task('Check the progress bar')].join('\n')),
		card('todo-3', 'Weekly review', 'task', [task('Check project status', true), task('Update roadmap'), task('Clean up old notes')].join('\n')),
	].join('\n');
	const sticky = Array.from({ length: 4 }, (_, i) => card(`sticky-${i + 1}`, `Sticky ${i + 1}`, 'generic', `Sticky note ${i + 1} body.`)).join('\n');
	const projects = [
		card('project-1', 'Obsidian dashboard', 'project', '[[Library/Library note 01.md]]\n[[Library/Library note 02.md]]\nprogress: 60%'),
		card('project-2', 'Personal website with a long name that must not break the card', 'project', '[[Library/Library note 04.md]]\nprogress: 30%'),
		card('project-3', 'Learning Rust', 'project', 'progress: 15%'),
		card('project-4', 'Empty project', 'project', ''),
	].join('\n');
	const yaml = (columns) =>
		columns
			.map(
				(c) =>
					`  - name: ${JSON.stringify(c.name)}\n    color: "#6366f1"\n    type: ${c.type}\n${Object.entries(c.extra ?? {})
						.map(([key, value]) => `    ${key}: ${JSON.stringify(value)}\n`)
						.join('')}`,
			)
			.join('');
	const defs = [
		{ name: 'Memo', type: 'memo', cards: memo },
		{ name: 'Todo', type: 'todo', cards: todo },
		{ name: 'Sticky', type: 'sticky', cards: sticky },
		{ name: 'Projects', type: 'projects', cards: projects },
		{ name: 'Library', type: 'library', extra: { library: { viewMode: 'grid', sortBy: 'modified', sortDesc: true, folders: ['Library'], pageSize: 20 } } },
		{ name: 'Library table', type: 'library', extra: { library: { viewMode: 'table', sortBy: 'name', sortDesc: false, folders: ['Library'], pageSize: 20 } } },
		{ name: 'Library list', type: 'library', extra: { library: { viewMode: 'list', sortBy: 'name', sortDesc: false, folders: ['Library'], pageSize: 20 } } },
		{ name: 'Folder', type: 'folder', extra: { library: { viewMode: 'gallery', sortBy: 'modified', sortDesc: true, folders: ['Library'], pageSize: 20 } } },
		{ name: 'Dataview', type: 'dataview', extra: { dataview: { query: 'TABLE file.mtime FROM "Library" SORT file.name' } } },
		{ name: 'PM', type: 'pm', extra: { pm: { rootFolder: 'Projects-PM', stages: ['Idea', 'Build', 'Review', 'Shipped'].map((label) => ({ label })) } } },
		{ name: 'Pipeline', type: 'pipeline', extra: { pipeline: { rootFolder: 'Pipeline', statusField: 'status', stages: ['backlog', 'doing', 'review', 'done'].map((value) => ({ id: value, value, label: value })), excludeFolders: [], templatePaths: [], sortBy: 'modified', sortDesc: true, filterFields: [], filters: {}, search: '', skills: [] } } },
		{ name: 'Skills', type: 'skills' },
		{ name: 'Calendar', type: 'calendar' },
		{ name: 'RSS', type: 'rss', extra: { rss: { feeds: [{ name: 'Example feed', url: 'https://example.invalid/feed.xml', group: 'News' }], downloadFolder: 'Notes', groupBy: 'group' } } },
		{ name: 'RSS empty', type: 'rss' },
		{ name: 'Images', type: 'images', extra: { library: { viewMode: 'grid', sortBy: 'modified', sortDesc: true, includeFolders: ['Media'], filters: [] } } },
		{ name: 'Web', type: 'web', extra: { web: { url: 'https://example.invalid/' } } },
		{ name: 'Weread', type: 'weread', extra: { weread: { widgets: [{ id: 'w1', view: 'shelf' }, { id: 'w2', view: 'stats' }] } } },
		{ name: 'TickTick', type: 'ticktick', extra: { ticktick: { view: 'today' } } },
	];
	const body = defs.map((d) => `## ${d.name}\n\n${d.cards ?? ''}`).join('\n');
	return { defs, yaml: yaml(defs), body };
}

/** Shelf-pack tiles (cols x rows) into a 12-column grid; every row has one height. */
export function pack(tiles) {
	const items = [];
	let x = 0;
	let y = 0;
	let rowH = 0;
	for (const [i, h, w] of tiles.map(([id, w, h]) => [id, h, w])) {
		if (x + w > 12) {
			x = 0;
			y += rowH;
			rowH = 0;
		}
		items.push({ i, x, y, w, h });
		x += w;
		rowH = Math.max(rowH, h);
	}
	return items;
}

export const TIER = { S: [3, 2], M: [6, 2], L: [6, 4], XL: [12, 4] };
export const WIDGET_TIERS = {
	expense: ['S', 'M', 'L', 'XL'],
	reading: ['S', 'M', 'L'],
	music: ['S', 'M', 'L'],
	album: ['S', 'M', 'L', 'XL'],
	skills: ['S', 'M', 'L'],
	fileSearch: ['S', 'M', 'L'],
	recent: ['S', 'M', 'L', 'XL'],
	'quick-notes': ['M', 'L', 'XL'],
};
export const SECTION_TIERS = {
	Memo: ['S', 'M', 'L', 'XL'],
	Todo: ['M', 'L', 'XL'],
	Sticky: ['M', 'L', 'XL'],
	Projects: ['L', 'XL'],
	Library: ['L', 'XL'],
	'Library table': ['L', 'XL'],
	'Library list': ['L', 'XL'],
	Folder: ['L', 'XL'],
	Dataview: ['L', 'XL'],
	PM: ['L', 'XL'],
	Pipeline: ['L', 'XL'],
	Skills: ['M', 'L', 'XL'],
	Calendar: ['L', 'XL'],
	RSS: ['L', 'XL'],
	'RSS empty': ['L', 'XL'],
	Images: ['L', 'XL'],
	Web: ['L', 'XL'],
	Weread: ['L', 'XL'],
	TickTick: ['L', 'XL'],
};

const widgetMember = (kind, id = 'default') => ({ memberId: `home:${kind}:${id}`, provider: 'home', kind, instanceId: id });
const presentation = (kind, id = 'default') => (['album', 'anniversary', 'countdown'].includes(kind) ? `${kind}-${id}` : kind);

/** The board file of one size tier: every section and widget that allows the tier, at exactly that tier. */
export function boardFile(tier, kind) {
	const { yaml, body, defs } = sections();
	const [w, h] = TIER[tier];
	const tiles = [];
	const members = [];
	if (kind === 'sections') {
		const names = defs.map((d) => d.name).filter((name) => SECTION_TIERS[name]?.includes(tier));
		for (const name of names) tiles.push([`section:${name}`, w, h]);
		const columns = defs.filter((d) => names.includes(d.name));
		const text = columns.map((d) => `## ${d.name}\n\n${d.cards ?? ''}`).join('\n');
		return `---\ndashboard: true\nwidgets: []\ngrid: ${JSON.stringify({ v: 2, lg: pack(tiles) })}\ncolumns:\n${columns
			.map((c) => yaml.split(/(?=  - name:)/).find((part) => part.startsWith(`  - name: ${JSON.stringify(c.name)}\n`)))
			.join('')}---\n\n${text}\n`;
	}
	for (const [key, tiers] of Object.entries(WIDGET_TIERS)) {
		if (!tiers.includes(tier)) continue;
		members.push(widgetMember(key, key === 'album' ? '1' : 'default'));
		tiles.push([`widget:${presentation(key, key === 'album' ? '1' : 'default')}`, w, h]);
	}
	void body;
	return `---\ndashboard: true\nwidgets: ${JSON.stringify(members)}\ngrid: ${JSON.stringify({ v: 2, lg: pack(tiles) })}\ncolumns: []\n---\n`;
}
