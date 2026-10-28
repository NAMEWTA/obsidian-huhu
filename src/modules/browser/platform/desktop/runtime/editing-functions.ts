/**
 * Fixed page-world helpers, never model-provided JavaScript. The Worker has no DOM
 * globals: these strings execute only against a resolved, fenced element in CDP.
 * Expected/before/actual values remain in the page closure, including passwords.
 */
export const prepareFill = `function(expected) {
  const element = this, doc = element.ownerDocument;
  const input = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;
  const editable = !input && element.isContentEditable;
  const focused = () => {
    let active = doc.activeElement;
    while (active && active.shadowRoot && active.shadowRoot.activeElement) active = active.shadowRoot.activeElement;
    return active === element;
  };
  if (!element.isConnected || element.disabled || element.readOnly || !focused() || (!input && !editable)) throw Error('not_actionable');
  if (input && element instanceof HTMLInputElement && !['text','search','url','tel','password','email','number'].includes(element.type)) throw Error('unsupported_input');
  const read = () => input ? element.value : element.textContent;
  const before = read(), sensitive = input && element.type === 'password';
  if (input) {
    element.select();
    if (element.selectionStart !== null && (element.selectionStart !== 0 || element.selectionEnd !== element.value.length)) throw Error('selection_unconfirmed');
  } else {
    const range = doc.createRange(), selection = doc.getSelection();
    if (!selection) throw Error('selection_unavailable');
    range.selectNodeContents(element); selection.removeAllRanges(); selection.addRange(range);
  }
  if (!element.isConnected || !focused()) throw Error('focus_changed');
  return function readFillResult() {
    if (!element.isConnected) return {ok:false,verification:'unverified',sensitive};
    const actual = read();
    if (actual === expected) return {ok:true,verification:'matched',sensitive};
    if (actual === before) return {ok:false,verification:'rejected',sensitive};
    if (typeof actual === 'string' && actual.length < expected.length && expected.startsWith(actual)) return {ok:false,verification:'truncated',sensitive};
    return {ok:false,verification:'transformed',sensitive};
  };
}`;

export const readFillResult = 'function(){return this()}';

export const confirmTypingTarget = `function() {
  let active = this.ownerDocument.activeElement;
  while (active && active.shadowRoot && active.shadowRoot.activeElement) active = active.shadowRoot.activeElement;
  return this.isConnected && active === this && !this.disabled && !this.readOnly &&
    (this.isContentEditable || this instanceof HTMLTextAreaElement ||
      (this instanceof HTMLInputElement && ['text','search','url','tel','password','email','number'].includes(this.type)));
}`;


export const confirmFrameFocus = `function confirmFrameFocus() {
  let active = this.ownerDocument.activeElement;
  while (active && active.shadowRoot && active.shadowRoot.activeElement) active = active.shadowRoot.activeElement;
  return this.isConnected && active === this;
}`;
