import { t } from '../../../../shared/i18n';
import type { FileDiff, SelectedLineRange } from '@pierre/diffs';

const gutterFocus = new WeakMap<HTMLElement, { release(): void; rendered(): void }>();

/** Bind only current library gutter nodes; released virtual rows carry no global listeners. */
export function bindGutterKeyboard<T, Caret>(
	node: HTMLElement,
	instance: FileDiff<T, Caret>,
	selected: () => SelectedLineRange | null,
): void {
	const shadow = node.shadowRoot;
	if (!shadow) return;
	for (const label of shadow.querySelectorAll<HTMLElement>('[data-unmodified-lines]')) {
		const count = /^(\d+)/.exec(label.textContent ?? '');
		label.textContent = t(
			count ? 'versioning.diff.unchangedLines' : 'versioning.diff.moreContext',
			count ? { count: Number(count[1]) } : undefined,
		);
	}
	for (const button of shadow.querySelectorAll<HTMLElement>('[data-expand-button]')) {
		button.dataset.huhuKeyboard = 'true';
		button.setAttribute('aria-label', t('versioning.diff.expandContext'));
		if (button.hasAttribute('data-expand-all-button')) button.textContent = t('versioning.diff.expandAll');
		button.tabIndex = 0;
		button.onkeydown = (event) => {
			if (event.isComposing || !['Enter', ' '].includes(event.key)) return;
			event.preventDefault();
			const index = Number(button.closest<HTMLElement>('[data-expand-index]')?.dataset.expandIndex);
			if (Number.isSafeInteger(index))
				instance.expandHunk(
					index,
					button.hasAttribute('data-expand-up') ? 'up' : button.hasAttribute('data-expand-down') ? 'down' : 'both',
				);
		};
	}

	for (const gutter of shadow.querySelectorAll<HTMLElement>('[data-gutter] [data-column-number]')) {
		const line = Number(gutter.dataset.columnNumber);
		if (!Number.isSafeInteger(line) || line < 1) continue;
		gutter.tabIndex = 0;
		gutter.classList.add('huhu-diff-gutter');
		gutter.setAttribute('role', 'button');
		gutter.setAttribute('aria-label', t('versioning.diff.selectLine', { line }));
		gutter.onkeydown = (event) => {
			if (event.isComposing || event.key !== 'Enter') return;
			event.preventDefault();
			const side =
				gutter.closest('[data-deletions]') || gutter.dataset.lineType === 'change-deletion' ? 'deletions' : 'additions';
			const previous = selected();
			const range: SelectedLineRange =
				event.shiftKey && previous ? { ...previous, end: line, endSide: side } : { start: line, end: line, side };
			instance.setSelectedLines(range);
		};
		gutter.onfocus = () => {
			const side =
				gutter.closest('[data-deletions]') || gutter.dataset.lineType === 'change-deletion' ? 'deletions' : 'additions';
			const restore = shadow.activeElement === gutter;
			const metadata = instance.fileDiff;
			const doc = node.ownerDocument,
				owner = doc.defaultView;
			if (!restore || !owner) return;
			gutterFocus.get(node)?.release();
			let focused = gutter;
			const movedFocus = (event: FocusEvent) => {
				if (event.target !== node || shadow.activeElement !== focused) {
					release();
				}
			};
			doc.addEventListener('focusin', movedFocus);
			const release = () => {
				doc.removeEventListener('focusin', movedFocus);
				gutterFocus.delete(node);
			};
			const rendered = () => {
				// Keep this keyboard focus owner across library redraws until focus leaves or the row unmounts.
				if (
					!node.isConnected ||
					node.ownerDocument !== doc ||
					!!node.closest('[hidden],[inert],[aria-hidden="true"]') ||
					!node.getClientRects().length ||
					!doc.hasFocus() ||
					instance.fileDiff !== metadata ||
					owner.getComputedStyle(node).visibility !== 'visible' ||
					(doc.activeElement !== node && doc.activeElement !== doc.body)
				) {
					release();
					return;
				}
				if (shadow.activeElement === focused) return;
				const target = [...shadow.querySelectorAll<HTMLElement>('.huhu-diff-gutter')].find(
					(candidate) =>
						Number(candidate.dataset.columnNumber) === line &&
						(candidate.closest('[data-deletions]') || candidate.dataset.lineType === 'change-deletion'
							? 'deletions'
							: 'additions') === side,
				);
				if (!target) {
					release();
					return;
				}
				focused = target;
				target.focus({ preventScroll: true });
			};
			gutterFocus.set(node, { release, rendered });
		};
	}
	gutterFocus.get(node)?.rendered();
}

export function unbindGutterKeyboard(node: HTMLElement): void {
	gutterFocus.get(node)?.release();
	for (const gutter of node.shadowRoot?.querySelectorAll<HTMLElement>('.huhu-diff-gutter') ?? []) {
		gutter.onkeydown = null;
		gutter.onfocus = null;
		gutter.removeAttribute('tabindex');
		gutter.removeAttribute('role');
		gutter.removeAttribute('aria-label');
		gutter.classList.remove('huhu-diff-gutter');
	}
	for (const button of node.shadowRoot?.querySelectorAll<HTMLElement>('[data-huhu-keyboard]') ?? []) {
		button.onkeydown = null;
		button.removeAttribute('tabindex');
		button.removeAttribute('data-huhu-keyboard');
	}
}
