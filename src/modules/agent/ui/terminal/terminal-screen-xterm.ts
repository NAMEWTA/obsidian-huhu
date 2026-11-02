import type { Terminal } from '@xterm/xterm';
import type { SearchAddon } from '@xterm/addon-search';
import {
	DEFAULT_SCREEN_PROFILE,
	SCREEN_ENGINE,
	screenGridAllowed,
	screenMarkEqual,
	type ScreenBufferHeader,
	type ScreenBufferName,
	type ScreenCell,
	type ScreenEffect,
	type ScreenLink,
	type ScreenMark,
	type ScreenPatch,
	type ScreenProfile,
	type ScreenSnapshot,
	type ScreenState,
} from '../../core/terminal/frames-screen';

interface Disposable {
	dispose(): void;
}
interface Emitter<T> {
	fire(value: T): void;
}
interface Extended {
	ext: number;
	urlId: number;
	underlineStyle: number;
	underlineColor: number;
	underlineVariantOffset: number;
	clone(): Extended;
}
interface Cell {
	content: number;
	fg: number;
	bg: number;
	combinedData: string;
	extended: Extended;
}
interface Line {
	isWrapped: boolean;
	readonly length: number;
	readonly _combined: Record<number, string>;
	readonly _extendedAttrs: Record<number, Extended>;
	setCell(index: number, value: Cell): void;
}
interface Marker extends Disposable {
	readonly line: number;
	readonly isDisposed: boolean;
	onDispose(listener: () => void): Disposable;
}
interface Buffer {
	readonly lines: {
		length: number;
		maxLength: number;
		get(index: number): Line | undefined;
		splice(index: number, count: number, ...lines: Line[]): void;
		trimStart(count: number): void;
	};
	x: number;
	y: number;
	ybase: number;
	ydisp: number;
	readonly markers: readonly Marker[];
	getBlankLine(attrs: Cell, wrapped?: boolean): Line;
}
interface Core {
	readonly buffers: {
		normal: Buffer;
		alt: Buffer;
		active: Buffer;
		_activeBuffer: Buffer;
		activateNormalBuffer(): void;
		activateAltBuffer(): void;
	};
	readonly _bufferService: { isUserScrolling: boolean };
	readonly _oscLinkService: {
		registerLink(data: { id: string; uri: string }): number;
		addLineToLink(id: number, row: number): void;
		getLinkData(id: number): { uri: string } | undefined;
	};
	readonly coreService: {
		isCursorInitialized: boolean;
		isCursorHidden: boolean;
		decPrivateModes: Record<string, boolean | string | undefined>;
	};
	readonly coreMouseService: { activeProtocol: string; activeEncoding: string };
	readonly _onCursorMove: Emitter<void>;
	readonly _onScroll: Emitter<{ position: number }>;
	readonly _onWriteParsed: Emitter<void>;
	readonly _onBell: Emitter<void>;
	readonly _onA11yCharEmitter: Emitter<string>;
	readonly _onA11yTabEmitter: Emitter<number>;
	readonly _inputHandler: { readonly _onRequestSendFocus: Emitter<void> };
	readonly _selectionService?: { refresh(): void };
	_handleColorEvent?(changes: readonly unknown[]): void;
}
interface Search {
	readonly _lineCache: { readonly value?: { _destroyLinesCache(): void } };
}
interface Row {
	key: string;
	isWrapped: boolean;
	cells: ScreenCell[];
}
interface OwnedLink {
	readonly id: number;
	readonly buffer: Buffer;
	readonly markers: Map<string, Marker>;
	readonly uri: string;
}
const names: readonly ScreenBufferName[] = ['normal', 'alternate'];
const protocols = new Set(['NONE', 'X10', 'VT200', 'DRAG', 'ANY']);
let targetId = 0;

export class ScreenTargetError extends Error {
	constructor(
		readonly reason: 'unavailable' | 'resource-limit' | 'gap',
		message: string,
	) {
		super(message);
		this.name = 'ScreenTargetError';
	}
}

/** Fixed xterm6/search0.16 projection. It never writes raw VT or retains source xterm objects. */
export class XtermScreenTarget {
	private readonly core: Core;
	private readonly search?: Search;
	private readonly cell: Cell;
	private readonly blank: Cell;
	private readonly identity = ++targetId;
	private readonly rows = new Map<ScreenBufferName, Row[]>();
	private readonly links = new Map<string, OwnedLink>();
	private mark?: ScreenMark;
	private lastEffect = 0;
	private syncCommand = -1;
	private disposed = false;
	private sourceColors = '';
	private style?: ScreenState['cursorStyle'];
	private blink?: boolean;
	private lastState?: ScreenState;
	private cursorState = '';
	private scrollState = '';
	constructor(
		private readonly terminal: Terminal,
		search?: SearchAddon,
		private readonly profile: Readonly<ScreenProfile> = DEFAULT_SCREEN_PROFILE,
	) {
		const value: unknown = terminal;
		if (!value || typeof value !== 'object' || !('_core' in value))
			throw new ScreenTargetError('unavailable', 'Unsupported xterm6 target');
		this.core = value._core as Core;
		const c = this.core;
		if (
			!c?.buffers?.normal?.lines ||
			!c.buffers.alt?.lines ||
			typeof c.buffers.activateNormalBuffer !== 'function' ||
			typeof c._oscLinkService?.registerLink !== 'function' ||
			typeof c._onWriteParsed?.fire !== 'function' ||
			typeof c._onCursorMove?.fire !== 'function' ||
			typeof c._onScroll?.fire !== 'function' ||
			typeof c._onBell?.fire !== 'function' ||
			typeof c._onA11yCharEmitter?.fire !== 'function' ||
			typeof c._onA11yTabEmitter?.fire !== 'function' ||
			typeof c._inputHandler?._onRequestSendFocus?.fire !== 'function' ||
			typeof c._handleColorEvent !== 'function' ||
			!c.coreMouseService ||
			!c.coreService ||
			!c._bufferService
		)
			throw new ScreenTargetError('unavailable', 'Unsupported xterm6 target shape');
		this.search = search as unknown as Search | undefined;
		if (this.search && !this.search._lineCache)
			throw new ScreenTargetError('unavailable', 'Unsupported search0.16 target shape');
		this.cell = terminal.buffer.normal.getNullCell() as unknown as Cell;
		this.blank = terminal.buffer.normal.getNullCell() as unknown as Cell;
		this.blank.content = 1 << 22;
		this.style = terminal.options.cursorStyle;
		this.blink = terminal.options.cursorBlink;
	}
	get watermark(): ScreenMark | undefined {
		return this.mark;
	}
	private buffer(name: ScreenBufferName): Buffer {
		return name === 'normal' ? this.core.buffers.normal : this.core.buffers.alt;
	}
	private fail(reason: ScreenTargetError['reason'], message: string): never {
		throw new ScreenTargetError(reason, message);
	}
	private validate(snapshot: ScreenSnapshot): void {
		if (
			snapshot.version !== 1 ||
			snapshot.engine !== SCREEN_ENGINE ||
			!snapshot.at.runtimeId ||
			!Number.isSafeInteger(snapshot.at.contentSequence) ||
			snapshot.at.contentSequence < 0
		)
			this.fail('unavailable', 'Invalid screen identity');
		if (
			!screenGridAllowed(snapshot.geometry, 0, this.profile) ||
			snapshot.buffers.length !== 2 ||
			!names.includes(snapshot.active) ||
			!protocols.has(snapshot.state.mouseProtocol) ||
			!['DEFAULT', 'SGR', 'SGR_PIXELS'].includes(snapshot.state.mouseEncoding)
		)
			this.fail('resource-limit', 'Invalid screen geometry or modes');
		let cells = 0,
			bytes = 0,
			units = 0;
		for (const name of names) {
			const buffer = snapshot.buffers.find((value) => value.name === name);
			if (
				!buffer ||
				buffer.rows.length !== buffer.length ||
				!Number.isSafeInteger(buffer.length) ||
				buffer.length < 0 ||
				buffer.length > this.profile.maxScrollback + snapshot.geometry.rows ||
				!Number.isSafeInteger(buffer.baseY) ||
				buffer.baseY < 0 ||
				buffer.baseY > Math.max(0, buffer.length - snapshot.geometry.rows) ||
				!Number.isSafeInteger(buffer.cursorX) ||
				buffer.cursorX < 0 ||
				buffer.cursorX > snapshot.geometry.cols ||
				!Number.isSafeInteger(buffer.cursorY) ||
				buffer.cursorY < 0 ||
				buffer.cursorY >= snapshot.geometry.rows
			)
				this.fail('unavailable', 'Invalid screen buffer');
			const keys = new Set<string>();
			for (const row of buffer.rows) {
				if (!row.key || keys.has(row.key) || row.cells.length !== snapshot.geometry.cols)
					this.fail('unavailable', 'Invalid screen row');
				keys.add(row.key);
				for (const cell of row.cells) {
					if (
						cell.chars.length > this.profile.maxCellUnits ||
						!Number.isSafeInteger(cell.content) ||
						cell.content < 0 ||
						cell.content > 0xffffffff ||
						cell.width !== cell.content >>> 22 ||
						cell.width > 2
					)
						this.fail('resource-limit', 'Screen cell exceeds limits');
					cells++;
					bytes += 48 + cell.chars.length * 2;
					if (cell.content & 0x200000) units += cell.chars.length;
				}
			}
		}
		if (
			cells > this.profile.maxModelCells ||
			bytes > this.profile.maxSnapshotBytes ||
			units > this.profile.maxCombiningUnits ||
			snapshot.links.length > this.profile.maxLinks ||
			snapshot.links.reduce((sum, link) => sum + link.key.length + link.uri.length, 0) > this.profile.maxLinkUnits
		)
			this.fail('resource-limit', 'Screen projection exceeds limits');
	}
	/** Installs one complete bounded snapshot; a resync does not reset xterm or restart the same sync token. */
	installSnapshot(snapshot: ScreenSnapshot): void {
		if (this.disposed) return;
		this.validate(snapshot);
		const sameRuntime = this.mark?.runtimeId === snapshot.at.runtimeId;
		if (!sameRuntime) {
			this.lastEffect = 0;
			this.syncCommand = -1;
		}
		this.releaseLinks();
		this.geometry(
			snapshot.geometry.cols,
			snapshot.geometry.rows,
			Math.max(...snapshot.buffers.map((value) => value.length - snapshot.geometry.rows)),
		);
		this.activate(snapshot.active);
		for (const source of snapshot.buffers) {
			const rows = source.rows.map((row) => ({
				key: row.key,
				isWrapped: row.isWrapped,
				cells: row.cells.map((cell) => this.copyCell(cell)),
			}));
			this.rows.set(source.name, rows);
			const buffer = this.buffer(source.name);
			buffer.lines.splice(
				0,
				buffer.lines.length,
				...rows.map((row) => buffer.getBlankLine(this.blank, row.isWrapped)),
			);
			this.header(source);
		}
		this.reconcileLinks(snapshot.links);
		for (const name of names) this.writeRows(name);
		this.terminal.clearSelection();
		this.state(snapshot.state);
		this.mark = { ...snapshot.at };
		this.notify(true);
	}
	private geometry(cols: number, rows: number, retained: number): void {
		if (retained > (this.terminal.options.scrollback ?? 0)) this.terminal.options.scrollback = retained;
		if (cols !== this.terminal.cols || rows !== this.terminal.rows) this.terminal.resize(cols, rows);
	}
	private activate(active: ScreenBufferName): void {
		if (active === 'normal') this.core.buffers.activateNormalBuffer();
		else this.core.buffers.activateAltBuffer();
	}
	private header(value: ScreenBufferHeader): void {
		const buffer = this.buffer(value.name);
		const following = buffer.ydisp === buffer.ybase;
		buffer.x = value.cursorX;
		buffer.y = value.cursorY;
		buffer.ybase = value.baseY;
		buffer.ydisp = following ? value.baseY : Math.min(buffer.ydisp, value.baseY);
	}
	private withLinkBuffer<T>(buffer: Buffer, row: number, run: () => T): T {
		const buffers = this.core.buffers,
			active = buffers._activeBuffer,
			base = buffer.ybase,
			y = buffer.y;
		// Registry methods are synchronous and emit no activation/cursor events in this pinned version.
		try {
			buffers._activeBuffer = buffer;
			buffer.ybase = 0;
			buffer.y = row;
			return run();
		} finally {
			buffer.ybase = base;
			buffer.y = y;
			buffers._activeBuffer = active;
		}
	}
	private reconcileLinks(dictionary: readonly ScreenLink[]): void {
		const sources = new Map(dictionary.map((value) => [value.key, value]));
		const wanted = new Map<string, { buffer: Buffer; rows: Map<string, number>; uri: string }>();
		for (const name of names)
			for (const [index, row] of (this.rows.get(name) ?? []).entries())
				for (const cell of row.cells)
					if (cell.linkKey) {
						const source = sources.get(cell.linkKey);
						if (!source) this.fail('unavailable', 'Missing screen hyperlink');
						const key = `${name}:${cell.linkKey}`;
						let entry = wanted.get(key);
						if (!entry) {
							entry = { buffer: this.buffer(name), rows: new Map(), uri: source.uri };
							wanted.set(key, entry);
						}
						entry.rows.set(row.key, index);
					}
		let markers = 0;
		for (const value of wanted.values()) markers += value.rows.size;
		if (markers > this.profile.maxMarkers || wanted.size > this.profile.maxLinks * 2)
			this.fail('resource-limit', 'Screen hyperlinks exceed limits');
		for (const [key, entry] of this.links) {
			const keep = wanted.get(key);
			for (const [row, marker] of entry.markers)
				if (
					!keep ||
					keep.buffer !== entry.buffer ||
					keep.uri !== entry.uri ||
					keep.rows.get(row) !== marker.line ||
					marker.isDisposed
				) {
					marker.dispose();
					entry.markers.delete(row);
				}
			if (!entry.markers.size) this.links.delete(key);
		}
		for (const [key, value] of wanted) {
			let entry = this.links.get(key);
			for (const [rowKey, row] of value.rows) {
				if (entry?.markers.get(rowKey)?.isDisposed === false) continue;
				const before = new Set(value.buffer.markers);
				if (!entry || !this.core._oscLinkService.getLinkData(entry.id)) {
					const id = this.withLinkBuffer(value.buffer, row, () =>
						this.core._oscLinkService.registerLink({ id: `huhu-${this.identity}:${key}`, uri: value.uri }),
					);
					entry = { id, buffer: value.buffer, markers: new Map(), uri: value.uri };
					this.links.set(key, entry);
				} else
					this.withLinkBuffer(value.buffer, row, () =>
						this.core._oscLinkService.addLineToLink(entry!.id, row),
					);
				const marker = value.buffer.markers.find((candidate) => !before.has(candidate));
				if (!marker) this.fail('unavailable', 'Missing screen hyperlink marker');
				entry.markers.set(rowKey, marker);
			}
		}
	}
	private writeRows(name: ScreenBufferName, dirty?: ReadonlySet<number>): void {
		const buffer = this.buffer(name),
			rows = this.rows.get(name) ?? [];
		for (const [index, row] of rows.entries()) {
			if (dirty && !dirty.has(index)) continue;
			const line = buffer.lines.get(index);
			if (!line) this.fail('unavailable', 'Missing target row');
			line.isWrapped = row.isWrapped;
			for (const [column, data] of row.cells.entries()) {
				const cell = this.cell;
				cell.content = data.content;
				cell.fg = data.fg;
				cell.bg = data.bg;
				cell.combinedData = data.content & 0x200000 ? data.chars : '';
				cell.extended = this.blank.extended.clone();
				if (data.extended) cell.extended.ext = data.extended.ext;
				cell.extended.urlId = data.linkKey ? (this.links.get(`${name}:${data.linkKey}`)?.id ?? 0) : 0;
				line.setCell(column, cell);
				if (!(data.content & 0x200000)) delete line._combined[column];
				if (!data.extended && !data.linkKey) delete line._extendedAttrs[column];
			}
		}
	}
	private state(state: ScreenState): void {
		this.lastState = state;
		const c = this.core,
			modes = c.coreService.decPrivateModes;
		modes.applicationCursorKeys = state.applicationCursorKeys;
		modes.applicationKeypad = state.applicationKeypad;
		modes.bracketedPasteMode = state.bracketedPaste;
		modes.sendFocus = state.sendFocus;
		c.coreService.isCursorHidden = state.cursorHidden;
		c.coreService.isCursorInitialized = state.cursorInitialized;
		if (c.coreMouseService.activeEncoding !== state.mouseEncoding)
			c.coreMouseService.activeEncoding = state.mouseEncoding;
		if (c.coreMouseService.activeProtocol !== state.mouseProtocol)
			c.coreMouseService.activeProtocol = state.mouseProtocol;
		if (this.syncCommand !== state.lastSyncCommandId) {
			this.syncCommand = state.lastSyncCommandId;
			modes.synchronizedOutput = state.synchronizedOutput;
		}
		this.terminal.options.cursorStyle = state.cursorStyle ?? this.style;
		this.terminal.options.cursorBlink = state.cursorBlink ?? this.blink;
		const colors = JSON.stringify(state.colors);
		if (colors !== this.sourceColors) {
			c._handleColorEvent?.([{ type: 2 }, ...state.colors]);
			this.sourceColors = colors;
		}
	}
	private notify(content: boolean): void {
		const c = this.core,
			buffer = c.buffers.active;
		c._bufferService.isUserScrolling = buffer.ydisp < buffer.ybase;
		if (content) this.search?._lineCache.value?._destroyLinesCache();
		const active = buffer === c.buffers.normal ? 'normal' : 'alternate';
		const scroll = `${active}:${buffer.ydisp}:${buffer.ybase}:${buffer.lines.length}`;
		const cursor = `${active}:${buffer.x}:${buffer.y}:${buffer.ybase}:${this.terminal.cols}:${this.terminal.rows}`;
		if (scroll !== this.scrollState) {
			this.scrollState = scroll;
			c._onScroll.fire({ position: buffer.ydisp });
		}
		// The stock cursor listener updates the textarea and respects ongoing composition.
		if (cursor !== this.cursorState) {
			this.cursorState = cursor;
			c._onCursorMove.fire();
		}
		c._selectionService?.refresh();
		this.terminal.refresh(0, this.terminal.rows - 1);
		c._onWriteParsed.fire();
	}
	/** Applies one whole parsed commit. A gap is an observer error and never a reason to replay raw. */
	applyPatch(patch: ScreenPatch): void {
		if (this.disposed) return;
		if (!this.mark || !screenMarkEqual(this.mark, patch.from)) this.fail('gap', 'Screen patch is discontinuous');
		if (
			patch.to.runtimeId !== this.mark.runtimeId ||
			!Number.isSafeInteger(patch.to.contentSequence) ||
			patch.to.contentSequence <= this.mark.contentSequence ||
			!screenGridAllowed(patch.geometry, 0, this.profile)
		)
			this.fail('gap', 'Invalid screen patch watermark');
		const next = new Map(
			names.map((name) => [name, (this.rows.get(name) ?? []).map((row) => ({ ...row, cells: [...row.cells] }))]),
		);
		const dirty = new Map(names.map((name) => [name, new Set<number>()]));
		const fresh = (key: string): Row => ({
			key,
			isWrapped: false,
			cells: Array.from({ length: patch.geometry.cols }, () => ({
				content: 1 << 22,
				fg: 0,
				bg: 0,
				chars: '',
				width: 1,
			})),
		});
		const integer = (value: number, max: number): boolean =>
			Number.isSafeInteger(value) && value >= 0 && value <= max;
		for (const op of patch.operations) {
			const rows = next.get(op.buffer);
			if (!rows) this.fail('unavailable', 'Invalid screen operation buffer');
			const limit = this.profile.maxScrollback + patch.geometry.rows;
			switch (op.kind) {
				case 'trim-start':
					if (!integer(op.count, rows.length)) this.fail('unavailable', 'Invalid screen trim');
					rows.splice(0, op.count);
					break;
				case 'delete-rows':
					if (!integer(op.index, rows.length) || !integer(op.count, rows.length - op.index))
						this.fail('unavailable', 'Invalid screen delete');
					rows.splice(op.index, op.count);
					break;
				case 'insert-rows':
					if (!integer(op.index, rows.length) || op.keys.length + rows.length > limit)
						this.fail('resource-limit', 'Invalid screen insertion');
					rows.splice(op.index, 0, ...op.keys.map(fresh));
					break;
				case 'truncate-end':
					if (!integer(op.length, rows.length)) this.fail('unavailable', 'Invalid screen truncation');
					rows.splice(op.length);
					break;
				case 'replace-buffer':
					if (op.keys.length > limit) this.fail('resource-limit', 'Invalid screen replacement');
					rows.splice(0, rows.length, ...op.keys.map(fresh));
					break;
				case 'row': {
					const row = rows[op.index];
					if (!integer(op.index, rows.length - 1) || !row)
						this.fail('unavailable', 'Invalid screen row edit');
					row.key = op.key;
					row.isWrapped = op.isWrapped;
					dirty.get(op.buffer)!.add(op.index);
					break;
				}
				case 'cells': {
					const row = rows[op.row];
					if (
						!integer(op.row, rows.length - 1) ||
						!row ||
						!integer(op.start, patch.geometry.cols) ||
						op.start + op.cells.length > patch.geometry.cols
					)
						this.fail('unavailable', 'Invalid screen cell edit');
					row.cells.splice(op.start, op.cells.length, ...op.cells.map((cell) => this.copyCell(cell)));
					dirty.get(op.buffer)!.add(op.row);
					break;
				}
			}
		}
		this.validate({
			...patch,
			version: 1,
			engine: SCREEN_ENGINE,
			at: patch.to,
			buffers: patch.buffers.map((header) => ({ ...header, rows: next.get(header.name)! })),
		});
		this.geometry(
			patch.geometry.cols,
			patch.geometry.rows,
			Math.max(...patch.buffers.map((value) => value.length - patch.geometry.rows)),
		);
		this.activate(patch.active);
		for (const op of patch.operations) {
			const buffer = this.buffer(op.buffer);
			switch (op.kind) {
				case 'trim-start': {
					const following = buffer.ydisp === buffer.ybase;
					buffer.lines.trimStart(op.count);
					buffer.ybase = Math.max(0, buffer.ybase - op.count);
					buffer.ydisp = following ? buffer.ybase : Math.max(0, buffer.ydisp - op.count);
					break;
				}
				case 'delete-rows':
					buffer.lines.splice(op.index, op.count);
					break;
				case 'insert-rows':
					buffer.lines.splice(op.index, 0, ...op.keys.map(() => buffer.getBlankLine(this.blank)));
					break;
				case 'truncate-end':
					buffer.lines.splice(op.length, buffer.lines.length - op.length);
					break;
				case 'replace-buffer': {
					if (op.reason === 'resize') {
						// Public resize has already reflowed target lines/foreign markers. Overwrite retained
						// cells in place; deleting every row here would dispose surviving decorations.
						const excess = buffer.lines.length - op.keys.length;
						if (excess > 0) {
							if (op.buffer === 'normal') buffer.lines.trimStart(excess);
							else buffer.lines.splice(op.keys.length, excess);
						}
						if (buffer.lines.length < op.keys.length)
							buffer.lines.splice(
								buffer.lines.length,
								0,
								...Array.from({ length: op.keys.length - buffer.lines.length }, () =>
									buffer.getBlankLine(this.blank),
								),
							);
					} else
						buffer.lines.splice(
							0,
							buffer.lines.length,
							...op.keys.map(() => buffer.getBlankLine(this.blank)),
						);
					for (let i = 0; i < op.keys.length; i++) dirty.get(op.buffer)!.add(i);
					if (op.reason === 'reset' || op.reason === 'clear') this.terminal.clearSelection();
					break;
				}
			}
		}
		for (const [name, rows] of next) this.rows.set(name, rows);
		for (const header of patch.buffers) {
			if (this.buffer(header.name).lines.length !== header.length)
				this.fail('unavailable', 'Target screen row count differs');
			this.header(header);
		}
		this.reconcileLinks(patch.links);
		// IDs can change after a structural marker disposal, so linked rows are refreshed too.
		for (const name of names) {
			const rows = this.rows.get(name)!;
			rows.forEach((row, index) => {
				if (row.cells.some((cell) => cell.linkKey)) dirty.get(name)!.add(index);
			});
			this.writeRows(name, dirty.get(name));
		}
		this.state(patch.state);
		for (const effect of patch.effects) this.effect(effect);
		this.mark = { ...patch.to };
		this.notify(patch.operations.length > 0);
	}
	private copyCell(cell: ScreenCell): ScreenCell {
		return { ...cell, ...(cell.extended ? { extended: { ...cell.extended } } : {}) };
	}
	private effect(effect: ScreenEffect): void {
		if (effect.id <= this.lastEffect) return;
		this.lastEffect = effect.id;
		const c = this.core;
		switch (effect.kind) {
			case 'sync-output':
				this.syncCommand = effect.id;
				c.coreService.decPrivateModes.synchronizedOutput = effect.enabled;
				break;
			case 'send-focus':
				c._inputHandler._onRequestSendFocus.fire();
				break;
			case 'bell':
				c._onBell.fire();
				break;
			case 'a11y-char':
				c._onA11yCharEmitter.fire(effect.text);
				break;
			case 'a11y-tab':
				c._onA11yTabEmitter.fire(effect.count);
				break;
			case 'color':
				c._handleColorEvent?.(effect.changes);
				break;
		}
	}
	updateAppearance(): void {
		this.style = this.terminal.options.cursorStyle;
		this.blink = this.terminal.options.cursorBlink;
		this.sourceColors = '';
		if (this.lastState) this.state(this.lastState);
	}
	private releaseLinks(): void {
		for (const value of this.links.values()) for (const marker of value.markers.values()) marker.dispose();
		this.links.clear();
	}
	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		this.releaseLinks();
		this.rows.clear();
	}
}
