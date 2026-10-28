import { Change, MergeView, unifiedMergeView } from '@codemirror/merge';
import {
	EditorState,
	RangeSet,
	StateEffect,
	StateField,
	type Extension,
	type Range,
	type Text,
} from '@codemirror/state';
import {
	Decoration,
	EditorView,
	GutterMarker,
	WidgetType,
	drawSelection,
	gutter,
	highlightSpecialChars,
	lineNumbers,
	type DecorationSet,
} from '@codemirror/view';
import { t } from '../../../shared/i18n';
import { mapDiffAnchor, type DiffChunk, type DiffLayout, type DiffModel, type DiffSide } from './diff-model';

interface FoldRange {
	id: number;
	from: number;
	to: number;
	lines: number;
}

const expandFold = StateEffect.define<number>();

/** A real button, owned by the editor's document, so folding works in popouts and with a keyboard. */
class UnchangedWidget extends WidgetType {
	constructor(
		private readonly range: FoldRange,
		private readonly expand: (id: number) => void,
	) {
		super();
	}
	eq(other: UnchangedWidget): boolean {
		return this.range.id === other.range.id && this.range.lines === other.range.lines;
	}
	toDOM(view: EditorView): HTMLElement {
		const wrapper = view.dom.ownerDocument.createElement('div');
		wrapper.className = 'huhu-versioning-fold';
		const button = wrapper.appendChild(view.dom.ownerDocument.createElement('button'));
		button.type = 'button';
		button.textContent = t('versioning.diff.unchangedLines', { count: this.range.lines });
		button.addEventListener('click', () => this.expand(this.range.id));
		return wrapper;
	}
	ignoreEvent(): boolean {
		return true;
	}
	get estimatedHeight(): number {
		return 32;
	}
}

function foldsFor(doc: Text, chunks: readonly DiffChunk[], side: DiffSide): FoldRange[] {
	const folds: FoldRange[] = [];
	let previous = 0;
	for (let index = 0; index <= chunks.length; index++) {
		const chunk = chunks[index];
		const end = chunk ? Math.min(doc.length, side === 'a' ? chunk.fromA : chunk.fromB) : doc.length;
		const startLine = doc.lineAt(Math.min(previous, doc.length)).number + 3;
		const endLine = doc.lineAt(end).number - 3;
		if (endLine - startLine >= 5) {
			folds.push({
				id: index,
				from: doc.line(startLine).from,
				to: doc.line(endLine).from,
				lines: endLine - startLine,
			});
		}
		if (chunk) previous = side === 'a' ? chunk.toA : chunk.toB;
	}
	return folds;
}

function folding(model: DiffModel, side: DiffSide, expand: (id: number) => void): Extension {
	return StateField.define<DecorationSet>({
		create(state) {
			return Decoration.set(
				foldsFor(state.doc, model.chunks, side).map((range) =>
					Decoration.replace({
						block: true,
						widget: new UnchangedWidget(range, expand),
						foldId: range.id,
					}).range(range.from, range.to),
				),
			);
		},
		update(value, transaction) {
			for (const effect of transaction.effects) {
				if (effect.is(expandFold))
					value = value.update({
						filter: (_from, _to, decoration) =>
							(decoration.spec as { foldId?: number }).foldId !== effect.value,
					});
			}
			return value;
		},
		provide: (field) => EditorView.decorations.from(field),
	});
}

class ChangedLineMarker extends GutterMarker {
	constructor(private readonly side: DiffSide) {
		super();
	}
	toDOM(view: EditorView): Node {
		const marker = view.dom.ownerDocument.createElement('span');
		marker.textContent = this.side === 'a' ? '−' : '+';
		marker.setAttribute('aria-hidden', 'true');
		return marker;
	}
}

/** Both stacked panes consume the same precomputed hunks. Neither contains the other revision. */
function changedDecorations(doc: Text, model: DiffModel, side: DiffSide): Extension {
	const decorations: Range<Decoration>[] = [];
	const markers: Range<GutterMarker>[] = [];
	const line = Decoration.line({
		class: side === 'a' ? 'huhu-versioning-removed-line' : 'huhu-versioning-added-line',
	});
	const mark = Decoration.mark({
		class: side === 'a' ? 'huhu-versioning-removed-text' : 'huhu-versioning-added-text',
	});
	const marker = new ChangedLineMarker(side);
	for (const chunk of model.chunks) {
		const from = Math.min(doc.length, side === 'a' ? chunk.fromA : chunk.fromB);
		const end = Math.min(doc.length, side === 'a' ? chunk.toA : chunk.toB);
		if (from < end) {
			for (let number = doc.lineAt(from).number; number <= doc.lineAt(Math.max(from, end - 1)).number; number++) {
				const position = doc.line(number).from;
				decorations.push(line.range(position));
				markers.push(marker.range(position));
			}
		}
		for (const change of chunk.changes) {
			const start = Math.min(doc.length, side === 'a' ? change.fromA : change.fromB);
			const to = Math.min(doc.length, side === 'a' ? change.toA : change.toB);
			if (start < to) decorations.push(mark.range(start, to));
		}
	}
	const markerSet = RangeSet.of(markers, true);
	return [
		EditorView.decorations.of(Decoration.set(decorations, true)),
		gutter({ class: 'huhu-versioning-change-gutter', markers: () => markerSet }),
	];
}

function syncScroll(a: EditorView, b: EditorView, model: DiffModel, hostA: HTMLElement, hostB: HTMLElement): () => void {
	const ownerWindow = a.dom.ownerDocument.defaultView;
	if (!ownerWindow) return () => {};
	let scheduled = 0;
	let release = 0;
	let syncing = false;
	const listen = (source: EditorView, target: EditorView, sourceHost: HTMLElement, targetHost: HTMLElement, side: DiffSide) => () => {
		if (syncing) return;
		if (scheduled) ownerWindow.cancelAnimationFrame(scheduled);
		scheduled = ownerWindow.requestAnimationFrame(() => {
			scheduled = 0;
			const block = source.lineBlockAtHeight(sourceHost.scrollTop);
			const position = mapDiffAnchor(model.chunks, block.from, side, target.state.doc.length);
			const targetBlock = target.lineBlockAt(position);
			const withinLine = block.height ? (sourceHost.scrollTop - block.top) / block.height : 0;
			syncing = true;
			targetHost.scrollTop = targetBlock.top + withinLine * targetBlock.height;
			targetHost.scrollLeft = sourceHost.scrollLeft;
			release = ownerWindow.requestAnimationFrame(() => {
				syncing = false;
				release = 0;
			});
		});
	};
	const scrollA = listen(a, b, hostA, hostB, 'a');
	const scrollB = listen(b, a, hostB, hostA, 'b');
	hostA.addEventListener('scroll', scrollA, { passive: true });
	hostB.addEventListener('scroll', scrollB, { passive: true });
	return () => {
		hostA.removeEventListener('scroll', scrollA);
		hostB.removeEventListener('scroll', scrollB);
		if (scheduled) ownerWindow.cancelAnimationFrame(scheduled);
		if (release) ownerWindow.cancelAnimationFrame(release);
	};
}

export interface DiffEditors {
	readonly views: readonly EditorView[];
	reveal: (index: number) => void;
	anchor: () => number;
	revealAnchor: (position: number) => void;
	setSyncScroll: (enabled: boolean) => void;
	destroy: () => void;
}

export interface DiffEditorOptions {
	model: DiffModel;
	layout: DiffLayout;
	wrap: boolean;
	collapse: boolean;
	leftLabel: string;
	rightLabel: string;
	syncScroll?: boolean;
	stackedParents?: readonly [HTMLElement, HTMLElement];
}

export function createDiffEditors(parent: HTMLElement, options: DiffEditorOptions): DiffEditors {
	const { model, layout, wrap, collapse, leftLabel, rightLabel } = options;
	const views: EditorView[] = [];
	const roots: HTMLElement[] = [];
	const expand = (id: number) => {
		for (const view of views) view.dispatch({ effects: expandFold.of(id) });
	};
	const extensions = (side: DiffSide): Extension[] => [
		EditorState.readOnly.of(true),
		EditorView.editable.of(false),
		EditorView.contentAttributes.of({
			'aria-label': side === 'a' ? leftLabel : rightLabel,
			'aria-readonly': 'true',
			tabindex: '0',
		}),
		lineNumbers(),
		drawSelection(),
		highlightSpecialChars(),
		wrap ? EditorView.lineWrapping : [],
		collapse ? folding(model, side, expand) : [],
	];
	const changes = model.chunks.flatMap((chunk) =>
		chunk.changes.map((change) => new Change(change.fromA, change.toA, change.fromB, change.toB)),
	);
	const diffConfig = { override: () => changes };
	let destroy: () => void;
	let scrollHosts: HTMLElement[];
	if (layout === 'side-by-side') {
		const merge = new MergeView({
			parent,
			root: parent.ownerDocument,
			a: { doc: model.left, extensions: extensions('a') },
			b: { doc: model.right, extensions: extensions('b') },
			highlightChanges: true,
			gutter: true,
			diffConfig,
		});
		views.push(merge.a, merge.b);
		roots.push(merge.dom);
		// CM merge keeps its inner editors auto-height; the columns own independent vertical scrollports.
		scrollHosts = [merge.a.dom.parentElement!, merge.b.dom.parentElement!];
		destroy = () => merge.destroy();
	} else if (layout === 'unified') {
		const view = new EditorView({
			parent,
			root: parent.ownerDocument,
			doc: model.right,
			extensions: [
				extensions('b'),
				unifiedMergeView({
					original: model.left,
					highlightChanges: true,
					gutter: true,
					mergeControls: false,
					allowInlineDiffs: false,
					diffConfig,
				}),
			],
		});
		views.push(view);
		roots.push(view.dom);
		scrollHosts = [view.scrollDOM];
		destroy = () => view.destroy();
	} else {
		for (const side of ['a', 'b'] as const) {
			const host = options.stackedParents?.[side === 'a' ? 0 : 1] ?? parent;
			const pane = host.appendChild(parent.ownerDocument.createElement('section'));
			roots.push(pane);
			pane.className = 'huhu-versioning-stacked-pane';
			const title = pane.appendChild(parent.ownerDocument.createElement('div'));
			title.className = 'huhu-versioning-pane-title';
			title.textContent = side === 'a' ? leftLabel : rightLabel;
			const doc = EditorState.create({ doc: side === 'a' ? model.left : model.right }).doc;
			views.push(
				new EditorView({
					parent: pane,
					root: parent.ownerDocument,
					state: EditorState.create({
						doc,
						extensions: [extensions(side), changedDecorations(doc, model, side)],
					}),
				}),
			);
		}
		destroy = () => {
			for (const view of views) view.destroy();
		};
		scrollHosts = views.map(view => view.scrollDOM);
	}
	let stopScrollSync = () => {};
	const setSyncScroll = (enabled: boolean) => {
		stopScrollSync();
		stopScrollSync = enabled && layout !== 'unified'
			? syncScroll(views[0]!, views[1]!, model, scrollHosts[0]!, scrollHosts[1]!) : () => {};
	};
	setSyncScroll(options.syncScroll !== false);
	const revealPosition = (position: number) => {
		views.forEach((view, index) => {
			const pos = Math.min(
				view.state.doc.length,
				layout === 'unified' || index === 1
					? position
					: mapDiffAnchor(model.chunks, position, 'b', view.state.doc.length),
			);
			const folds = foldsFor(view.state.doc, model.chunks, layout === 'unified' || index === 1 ? 'b' : 'a');
			const fold = folds.find((range) => pos >= range.from && pos < range.to);
			if (fold) expand(fold.id);
			view.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: 'center' }) });
		});
	};
	return {
		views,
		reveal: (index) => {
			const chunk = model.chunks[index];
			if (chunk) revealPosition(Math.min(model.right.length, chunk.fromB));
		},
		anchor: () => {
			const view = views.at(-1)!;
			return view.lineBlockAtHeight(scrollHosts.at(-1)!.scrollTop).from;
		},
		revealAnchor: revealPosition,
		setSyncScroll,
		destroy: () => {
			stopScrollSync();
			destroy();
			for (const root of roots) root.remove();
		},
	};
}
