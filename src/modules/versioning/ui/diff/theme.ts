import { registerCustomCSSVariableTheme } from '@pierre/diffs';

registerCustomCSSVariableTheme('huhu', {
	foreground: 'var(--hu-fg)',
	background: 'var(--hu-surface)',
	'token-constant': 'var(--hu-accent-text)',
	'token-string': 'var(--hu-success)',
	'token-comment': 'var(--hu-fg-3)',
	'token-keyword': 'var(--hu-accent-text)',
	'token-parameter': 'var(--hu-fg)',
	'token-function': 'var(--hu-info)',
	'token-string-expression': 'var(--hu-success)',
	'token-punctuation': 'var(--hu-fg-2)',
	'token-link': 'var(--hu-accent-text)',
});

// Pierre 1.6.4 separator/button metrics follow our owner row height; see https://diffs.com/docs#styling.
export const DIFF_UNSAFE_CSS =
	'[data-separator=line-info],[data-separator=line-info-basic],[data-separator=metadata]{height:var(--diffs-line-height)}' +
	'[data-expand-index] [data-separator-wrapper]{grid-template-columns:var(--diffs-line-height) auto}' +
	'[data-expand-index] [data-separator-wrapper][data-separator-multi-button]{grid-template-columns:var(--diffs-line-height) var(--diffs-line-height) auto}' +
	'[data-expand-button]{min-width:var(--diffs-line-height)}' +
	'.huhu-diff-gutter:focus-visible{outline:var(--hu-focus-width) solid var(--hu-focus);outline-offset:calc(-1 * var(--hu-focus-width))}';
