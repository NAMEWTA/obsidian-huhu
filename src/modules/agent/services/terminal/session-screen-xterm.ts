import type { Terminal } from '@xterm/headless';
import {
	SCREEN_ENGINE,
	type ScreenBuffer,
	type ScreenBufferName,
	type ScreenCell,
	type ScreenColor,
	type ScreenEffect,
	type ScreenLink,
	type ScreenMark,
	type ScreenOperation,
	type ScreenProfile,
	type ScreenRow,
	type ScreenSnapshot,
	type ScreenState,
} from '../../core/terminal/frames-screen';

interface Disposable {
	dispose(): void;
}
type Event<T> = (listener: (event: T) => void) => Disposable;
interface Extended {
	readonly ext: number;
	readonly underlineStyle: number;
	readonly underlineColor: number;
	readonly underlineVariantOffset: number;
	readonly urlId: number;
}
interface Line {
	readonly _data: Uint32Array;
	readonly _combined: Record<string, string>;
	readonly _extendedAttrs: Record<string, Extended | undefined>;
	readonly length: number;
	readonly isWrapped: boolean;
	getString(index: number): string;
}
interface Lines {
	readonly length: number;
	readonly maxLength: number;
	get(index: number): Line | undefined;
	readonly onTrim: Event<number>;
	readonly onDelete: Event<{ index: number; amount: number }>;
	readonly onInsert: Event<{ index: number; amount: number }>;
}
interface Buffer {
	readonly lines: Lines;
	readonly x: number;
	readonly y: number;
	readonly ybase: number;
	readonly markers: readonly object[];
}
interface Handler {
	readonly _data?: string;
}
interface Parser {
	readonly precedingJoinState: number;
	readonly _oscParser: { readonly _active: readonly Handler[] };
	readonly _dcsParser: { readonly _active: readonly Handler[] };
}
interface ColorEvent {
	readonly type: number;
	readonly index?: number;
	readonly color?: readonly [number, number, number];
}
interface Core {
	readonly buffers: { readonly normal: Buffer; readonly alt: Buffer; readonly active: Buffer };
	readonly coreService: {
		readonly isCursorInitialized: boolean;
		readonly isCursorHidden: boolean;
		readonly decPrivateModes: Record<string, boolean | string | undefined>;
	};
	readonly coreMouseService: { readonly activeProtocol: string; readonly activeEncoding: string };
	readonly _oscLinkService: {
		readonly _dataByLinkId: Map<
			number,
			{ readonly data: { readonly uri: string; readonly id?: string }; readonly lines: readonly object[] }
		>;
		getLinkData(id: number): { uri: string; id?: string } | undefined;
	};
	readonly _inputHandler: {
		readonly _parser: Parser;
		readonly _parseBuffer: Uint32Array;
		readonly _windowTitle: string;
		readonly _iconName: string;
		readonly _windowTitleStack: readonly string[];
		readonly _iconNameStack: readonly string[];
		readonly onRequestSendFocus: Event<void>;
		readonly onRequestBell: Event<void>;
		readonly onA11yChar: Event<string>;
		readonly onA11yTab: Event<number>;
		readonly onColor: Event<readonly ColorEvent[]>;
	};
	readonly _writeBuffer: { readonly _pendingData: number };
}
export interface XtermModelUsage {
	readonly modelCells: number;
	readonly modelBytes: number;
	readonly combiningUnits: number;
	readonly maxCellUnits: number;
	readonly parserUnits: number;
	readonly links: number;
	readonly linkUnits: number;
	readonly markers: number;
}

/** The only source-side private xterm access. Version/shape failures are explicit, never a raw replay fallback. */
export class XtermScreenSource {
	private readonly core: Core;
	private readonly disposables: Disposable[] = [];
	private readonly lineIds = new WeakMap<Line, string>();
	private readonly cached = new WeakMap<Line, ScreenRow>();
	private readonly watched = new Map<ScreenBufferName, Buffer>();
	private bufferEvents: Disposable[] = [];
	private structure: ScreenOperation[] = [];
	private effects: ScreenEffect[] = [];
	private colors = new Map<number, ScreenColor>();
	private nextLine = 0;
	private nextEffect = 0;
	private syncCommand = 0;
	private parsedReset = false;
	private commandWork = 0;
	private commandBytes = 0;
	private cursorBlinkOverride?: boolean;
	constructor(
		private readonly model: Terminal,
		private readonly profile: ScreenProfile,
		private readonly onFault: (reason: string) => void,
		private readonly reserve: (bytes: number) => boolean,
	) {
		const value: unknown = model;
		if (!value || typeof value !== 'object' || !('_core' in value))
			throw new Error('Unsupported xterm6 source shape');
		this.core = value._core as Core;
		if (
			!this.core?.buffers?.normal?.lines ||
			!(this.core._inputHandler?._parseBuffer instanceof Uint32Array) ||
			!(this.core._oscLinkService?._dataByLinkId instanceof Map) ||
			!this.core.coreMouseService ||
			!this.core.coreService ||
			!this.core._writeBuffer
		)
			throw new Error('Unsupported xterm6 source shape');
		this.watch();
		const input = this.core._inputHandler;
		this.disposables.push(
			input.onRequestSendFocus(() => this.effect({ kind: 'send-focus' })),
			input.onRequestBell(() => this.effect({ kind: 'bell' })),
			input.onA11yChar((text) => this.effect({ kind: 'a11y-char', text })),
			input.onA11yTab((count) => this.effect({ kind: 'a11y-tab', count })),
			input.onColor((changes) => this.color(changes)),
		);
		this.disposables.push(
			model.parser.registerEscHandler({ final: 'c' }, () => {
				this.parsedReset = true;
				this.effect({ kind: 'sync-output', enabled: false });
				this.syncCommand = this.nextEffect;
				return false;
			}),
		);
		for (const enabled of [true, false])
			this.disposables.push(
				model.parser.registerCsiHandler({ prefix: '?', final: enabled ? 'h' : 'l' }, (params) => {
					for (const param of params) if (param === 12) this.cursorBlinkOverride = enabled;
					for (const param of params)
						if (param === 2026) {
							this.effect({ kind: 'sync-output', enabled });
							this.syncCommand = this.nextEffect;
						}
					return false;
				}),
			);
		for (const final of ['b', 'S', 'T', 'I', 'Z', 'L', 'M'])
			this.disposables.push(
				model.parser.registerCsiHandler({ final }, (params) => {
					const count = Number(params[0] ?? 1) || 1;
					const buffer = this.core.buffers.active;
					const width = (this.core._inputHandler._parser.precedingJoinState >> 1) & 3;
					const units =
						final === 'b'
							? (buffer.lines.get(buffer.ybase + buffer.y)?.getString(buffer.x - width).length ?? 0) *
								count
							: count;
					this.commandWork += units;
					const bytes = final === 'b' ? units * 136 : count * this.model.cols * 24;
					const retained = final === 'b' ? this.usage() : undefined;
					if (
						!Number.isSafeInteger(units) ||
						this.commandWork > profile.maxCommandWork ||
						(retained !== undefined &&
							(retained.combiningUnits + units > profile.maxCombiningUnits ||
								retained.markers + units + 1 > profile.maxMarkers)) ||
						!this.reserve((this.commandBytes += bytes))
					) {
						this.onFault('command-admission');
						return true;
					}
					return false;
				}),
			);
	}
	beginParse(): void {
		this.commandWork = 0;
		this.commandBytes = 0;
	}
	private effect(
		value:
			| Omit<Extract<ScreenEffect, { kind: 'sync-output' }>, 'id'>
			| Omit<Extract<ScreenEffect, { kind: 'send-focus' | 'bell' }>, 'id'>
			| Omit<Extract<ScreenEffect, { kind: 'a11y-char' }>, 'id'>
			| Omit<Extract<ScreenEffect, { kind: 'a11y-tab' }>, 'id'>
			| Omit<Extract<ScreenEffect, { kind: 'color' }>, 'id'>,
	): void {
		if (this.effects.length >= this.profile.parseBatchBytes * 2 || this.nextEffect >= Number.MAX_SAFE_INTEGER) {
			this.onFault('effect-capacity');
			return;
		}
		this.effects.push(Object.freeze({ ...value, id: ++this.nextEffect }));
	}
	private color(changes: readonly ColorEvent[]): void {
		const accepted: ScreenColor[] = [];
		for (const event of changes) {
			if (event.type === 1 && event.index !== undefined && event.color) {
				const value: ScreenColor = Object.freeze({
					type: 1,
					index: event.index,
					color: Object.freeze<readonly [number, number, number]>([...event.color]),
				});
				this.colors.set(event.index, value);
				accepted.push(value);
			} else if (event.type === 2) {
				if (event.index === undefined) this.colors.clear();
				else this.colors.delete(event.index);
				accepted.push(Object.freeze({ type: 2, ...(event.index !== undefined ? { index: event.index } : {}) }));
			}
		}
		if (accepted.length) this.effect({ kind: 'color', changes: Object.freeze(accepted) });
	}
	private watch(): void {
		const pairs = [
			['normal', this.core.buffers.normal],
			['alternate', this.core.buffers.alt],
		] as const;
		if (pairs.every(([name, buffer]) => this.watched.get(name) === buffer)) return;
		for (const disposable of this.bufferEvents) disposable.dispose();
		this.bufferEvents = [];
		for (const [name, buffer] of pairs) {
			this.watched.set(name, buffer);
			this.bufferEvents.push(
				buffer.lines.onTrim((count) => {
					this.structure.push({ kind: 'trim-start', buffer: name, count });
					// recycle() reuses a line object as a new history row.
					const last = buffer.lines.get(buffer.lines.length - 1);
					if (last) {
						this.lineIds.delete(last);
						this.cached.delete(last);
					}
				}),
				buffer.lines.onDelete((event) =>
					this.structure.push({ kind: 'delete-rows', buffer: name, index: event.index, count: event.amount }),
				),
				buffer.lines.onInsert((event) =>
					this.structure.push({
						kind: 'insert-rows',
						buffer: name,
						index: event.index,
						keys: Array.from({ length: event.amount }, () => ''),
					}),
				),
			);
		}
	}
	takeStructure(): readonly ScreenOperation[] {
		const value = this.structure;
		this.structure = [];
		return value;
	}
	takeReset(): boolean {
		const value = this.parsedReset;
		this.parsedReset = false;
		return value;
	}
	takeEffects(): readonly ScreenEffect[] {
		const value = this.effects;
		this.effects = [];
		return value;
	}
	private key(line: Line): string {
		let key = this.lineIds.get(line);
		if (!key) {
			if (this.nextLine >= Number.MAX_SAFE_INTEGER) throw new Error('Screen row identity exhausted');
			key = String(++this.nextLine);
			this.lineIds.set(line, key);
		}
		return key;
	}
	usage(): XtermModelUsage {
		let modelCells = 0,
			modelBytes = 0,
			combiningUnits = 0,
			maxCellUnits = 0,
			markers = 0,
			parserUnits = 0,
			linkUnits = 0;
		for (const buffer of [this.core.buffers.normal, this.core.buffers.alt]) {
			markers += buffer.markers.length;
			modelBytes += buffer.lines.maxLength * 8;
			for (let row = 0; row < buffer.lines.length; row++) {
				const line = buffer.lines.get(row);
				if (!line || !(line._data instanceof Uint32Array) || !line._combined || !line._extendedAttrs)
					throw new Error('Missing live xterm line');
				modelCells += line.length;
				modelBytes += line._data.buffer.byteLength + 64;
				for (const text of Object.values(line._combined)) {
					combiningUnits += text.length;
					maxCellUnits = Math.max(maxCellUnits, text.length);
				}
				modelBytes += Object.keys(line._extendedAttrs).length * 32;
			}
		}
		for (const parser of [this.core._inputHandler._parser._oscParser, this.core._inputHandler._parser._dcsParser])
			for (const handler of parser._active)
				if (typeof handler._data === 'string') parserUnits += handler._data.length;
		const input = this.core._inputHandler;
		parserUnits +=
			input._windowTitle.length +
			input._iconName.length +
			input._windowTitleStack.reduce((sum, text) => sum + text.length, 0) +
			input._iconNameStack.reduce((sum, text) => sum + text.length, 0);
		for (const entry of this.core._oscLinkService._dataByLinkId.values()) {
			linkUnits += entry.data.uri.length + (entry.data.id?.length ?? 0);
			markers += entry.lines.length;
		}
		modelBytes +=
			combiningUnits * 2 +
			parserUnits * 2 +
			linkUnits * 2 +
			markers * 64 +
			input._parseBuffer.buffer.byteLength +
			this.core._writeBuffer._pendingData * 2;
		return {
			modelCells,
			modelBytes,
			combiningUnits,
			maxCellUnits,
			parserUnits,
			links: this.core._oscLinkService._dataByLinkId.size,
			linkUnits,
			markers,
		};
	}
	capture(at: ScreenMark, output: ScreenSnapshot['output']): ScreenSnapshot {
		const use = this.usage();
		if (
			use.modelCells > this.profile.maxModelCells ||
			use.modelBytes > this.profile.maxModelBytes ||
			use.combiningUnits > this.profile.maxCombiningUnits ||
			use.maxCellUnits > this.profile.maxCellUnits ||
			use.links > this.profile.maxLinks ||
			use.linkUnits > this.profile.maxLinkUnits ||
			use.markers > this.profile.maxMarkers ||
			use.modelCells * 100 + use.combiningUnits * 2 + use.linkUnits * 2 + 2048 > this.profile.maxSnapshotBytes
		)
			throw new Error('Screen projection capacity exceeded');
		this.watch();
		const links = new Map<string, ScreenLink>();
		const readBuffer = (name: ScreenBufferName, buffer: Buffer): ScreenBuffer => {
			const rows: ScreenRow[] = [];
			for (let y = 0; y < buffer.lines.length; y++) {
				const line = buffer.lines.get(y);
				if (!line) throw new Error('Missing live xterm line');
				const prior = this.cached.get(line);
				const cells: ScreenCell[] = [];
				let changed = !prior || prior.isWrapped !== line.isWrapped || prior.cells.length !== line.length;
				for (let x = 0; x < line.length; x++) {
					const content = line._data[x * 3]!,
						fg = line._data[x * 3 + 1]!,
						bg = line._data[x * 3 + 2]!;
					const cp = content & 0x1fffff;
					const chars =
						content & 0x200000 ? (line._combined[String(x)] ?? '') : cp ? String.fromCodePoint(cp) : '';
					const ext = line._extendedAttrs[String(x)];
					let linkKey: string | undefined;
					if (ext?.urlId) {
						linkKey = `${at.runtimeId}:${ext.urlId}`;
						const data = this.core._oscLinkService.getLinkData(ext.urlId);
						if (!data) throw new Error('Missing xterm link source');
						links.set(
							linkKey,
							Object.freeze({
								key: linkKey,
								uri: data.uri,
								...(data.id !== undefined ? { oscId: data.id } : {}),
							}),
						);
					}
					const old = prior?.cells[x];
					if (
						old &&
						old.content === content &&
						old.fg === fg &&
						old.bg === bg &&
						old.chars === chars &&
						old.linkKey === linkKey &&
						old.extended?.ext === ext?.ext &&
						old.extended?.underlineColor === ext?.underlineColor &&
						old.extended?.underlineStyle === ext?.underlineStyle &&
						old.extended?.underlineVariantOffset === ext?.underlineVariantOffset
					) {
						cells.push(old);
						continue;
					}
					changed = true;
					cells.push(
						Object.freeze({
							content,
							fg,
							bg,
							chars,
							width: (content >>> 22) as 0 | 1 | 2,
							...(ext
								? {
										extended: Object.freeze({
											ext: ext.ext,
											underlineStyle: ext.underlineStyle,
											underlineColor: ext.underlineColor,
											underlineVariantOffset: ext.underlineVariantOffset,
										}),
									}
								: {}),
							...(linkKey ? { linkKey } : {}),
						}),
					);
				}
				const key = this.key(line);
				const row: ScreenRow =
					!changed && prior?.key === key
						? prior
						: Object.freeze({ key, isWrapped: line.isWrapped, cells: Object.freeze(cells) });
				this.cached.set(line, row);
				rows.push(row);
			}
			return Object.freeze({
				name,
				length: rows.length,
				baseY: buffer.ybase,
				cursorX: buffer.x,
				cursorY: buffer.y,
				rows: Object.freeze(rows),
			});
		};
		const modes = this.core.coreService.decPrivateModes;
		const encoding = this.core.coreMouseService.activeEncoding;
		if (encoding !== 'DEFAULT' && encoding !== 'SGR' && encoding !== 'SGR_PIXELS')
			throw new Error('Unsupported xterm mouse encoding');
		const state: ScreenState = Object.freeze({
			applicationCursorKeys: modes.applicationCursorKeys === true,
			applicationKeypad: modes.applicationKeypad === true,
			bracketedPaste: modes.bracketedPasteMode === true,
			sendFocus: modes.sendFocus === true,
			mouseProtocol: this.core.coreMouseService.activeProtocol,
			mouseEncoding: encoding,
			cursorHidden: this.core.coreService.isCursorHidden,
			cursorInitialized: this.core.coreService.isCursorInitialized,
			...(typeof modes.cursorStyle === 'string'
				? { cursorStyle: modes.cursorStyle as ScreenState['cursorStyle'] }
				: {}),
			...(typeof modes.cursorBlink === 'boolean'
				? { cursorBlink: modes.cursorBlink }
				: this.cursorBlinkOverride !== undefined
					? { cursorBlink: this.cursorBlinkOverride }
					: {}),
			synchronizedOutput: modes.synchronizedOutput === true,
			lastSyncCommandId: this.syncCommand,
			colors: Object.freeze([...this.colors.values()]),
		});
		const buffers = Object.freeze([
			readBuffer('normal', this.core.buffers.normal),
			readBuffer('alternate', this.core.buffers.alt),
		]);
		return Object.freeze({
			version: 1,
			engine: SCREEN_ENGINE,
			at: Object.freeze({ ...at }),
			geometry: Object.freeze({ cols: this.model.cols, rows: this.model.rows }),
			active: this.core.buffers.active === this.core.buffers.normal ? 'normal' : 'alternate',
			buffers,
			state,
			links: Object.freeze([...links.values()]),
			output,
		});
	}
	dispose(): void {
		for (const value of [...this.disposables, ...this.bufferEvents]) value.dispose();
		this.bufferEvents = [];
		this.structure = [];
		this.effects = [];
		this.colors.clear();
	}
}
