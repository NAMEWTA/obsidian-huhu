

/** Preserve only a selection inside the triggering card, including its inline editor. */
export function cardSkillInput(root: HTMLElement): string {
	const active = root.ownerDocument.activeElement;
	if (active?.instanceOf(HTMLTextAreaElement) && root.contains(active)) {
		return active.value.slice(active.selectionStart, active.selectionEnd);
	}
	const selection = root.ownerDocument.getSelection();
	return selection?.anchorNode && selection.focusNode && root.contains(selection.anchorNode) && root.contains(selection.focusNode) ? selection.toString() : '';
}
