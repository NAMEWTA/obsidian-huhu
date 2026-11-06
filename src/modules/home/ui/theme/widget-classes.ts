// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: styles.css
// Static Tailwind recipes retain upstream selector names for visual comparison. No runtime CSS is generated.
import { cn } from '../../../../ui/lib/utils';
const layout: Record<string, string> = {
	'dashboard-library-config-modal':
		"[&_.dashboard-modal-input.dashboard-modal-input:not(.dashboard-section-name-input):is(input[type='text'],_input[type='search'])]:[border:1px_solid_var(--input,_var(--hu-line))] [&_.dashboard-modal-input.dashboard-modal-input:not(.dashboard-section-name-input):is(input[type='text'],_input[type='search'])]:rounded-[var(--board-radius-sm,_6px)] [&_.dashboard-modal-input.dashboard-modal-input:not(.dashboard-section-name-input):is(input[type='text'],_input[type='search'])]:p-[8px_12px] [&_.dashboard-modal-input.dashboard-modal-input:not(.dashboard-section-name-input):is(input[type='text'],_input[type='search'])]:[background:var(--hu-sunken,_var(--hu-raised))] [&_.dashboard-modal-input.dashboard-modal-input:not(.dashboard-section-name-input):is(input[type='text'],_input[type='search'])]:[box-shadow:none] [&_.dashboard-modal-input.dashboard-modal-input:not(.dashboard-section-name-input):is(input[type='text'],_input[type='search'])]:[color:var(--hu-fg,_var(--hu-fg))] [&_.dashboard-modal-input.dashboard-modal-input:is(input[type='text'],_input[type='search']):focus]:[border-color:var(--hu-accent,_var(--hu-accent))] [&_.dashboard-modal-input.dashboard-modal-input:is(input[type='text'],_input[type='search']):focus]:[box-shadow:none] p-[0]",
	'dashboard-pomodoro-stats-modal':
		'[background:var(--hu-raised,_var(--hu-canvas,_var(--hu-canvas)))] [border:1px_solid_var(--hu-line)] rounded-[var(--board-radius-lg,_12px)] p-[20px] max-w-[380px] w-[90%] max-h-[80vh] [overflow-y:auto] [box-shadow:0_8px_32px_var(--board-record-color-3)]',
	'dashboard-pomodoro-stats-header':
		'flex [justify-content:space-between] [align-items:center] gap-[10px] [margin-bottom:16px] @max-[901px]:[flex-wrap:wrap] @max-[901px]:[&_.dashboard-pomodoro-stats-close]:[order:2] max-[901px]:[flex-wrap:wrap] max-[901px]:[&_.dashboard-pomodoro-stats-close]:[order:2]',
	'dashboard-pomodoro-stats-header-title': '[font-size:var(--hu-text-lg)] [font-weight:700] [color:var(--hu-fg)]',
	'dashboard-pomodoro-stats-close':
		'[cursor:pointer] [color:var(--hu-fg-2)] w-[24px] h-[24px] flex [align-items:center] [justify-content:center] rounded-[4px] motion-safe:[transition:background_0.15s] [&:hover]:[background:var(--hu-hover)]',
	'dashboard-pomodoro-donut-empty':
		'[font-size:var(--hu-text-xs)] [color:var(--board-text-faint)] [text-align:center] p-[24px_0]',
	'dashboard-pomodoro-donut-legend-dot': 'w-[8px] h-[8px] rounded-[50%] [flex-shrink:0]',
	'dashboard-pomodoro-stats-modal--wide':
		'max-w-[1040px] w-[94%] max-h-[86vh] p-[22px_26px] flex [flex-direction:column] [container-type:inline-size] [&_.dashboard-pomodoro-stats-summary]:grid [&_.dashboard-pomodoro-stats-summary]:[grid-template-columns:1fr_1fr] [&_.dashboard-pomodoro-stats-summary]:gap-[6px] [&_.dashboard-pomodoro-stats-summary]:[flex-wrap:wrap] [&_.dashboard-pomodoro-stats-summary]:[margin-bottom:0] max-[901px]:max-w-[420px] max-[901px]:max-h-[80vh]',
	'dashboard-habit-stats-modal':
		'[background:var(--hu-raised,_var(--hu-canvas,_var(--hu-canvas)))] [border:1px_solid_var(--hu-line)] rounded-[var(--board-radius-lg,_12px)] p-[20px] max-w-[480px] w-[90%] max-h-[80vh] [overflow-y:auto] [box-shadow:0_8px_32px_var(--board-record-color-3)]',
	'dashboard-habit-stats-header': 'flex [justify-content:space-between] [align-items:center] [margin-bottom:14px]',
	'dashboard-habit-stats-title': '[font-size:var(--hu-text-base)] [font-weight:700] [color:var(--hu-fg)]',
	'dashboard-habit-stats-close':
		'[cursor:pointer] [color:var(--hu-fg-2)] w-[24px] h-[24px] flex [align-items:center] [justify-content:center] rounded-[4px] motion-safe:[transition:background_0.15s] [&:hover]:[background:var(--hu-hover)]',
	'dashboard-habit-stats-body': 'flex [flex-direction:column] gap-[12px]',
	'dashboard-habit-stats-empty':
		'[font-size:var(--hu-text-xs)] [color:var(--hu-fg-2)] [text-align:center] p-[24px_0] [opacity:0.75]',
	'dashboard-habit-stats-card':
		'[background:var(--hu-hover)] [border:1px_solid_var(--hu-line)] rounded-[8px] p-[12px]',
	'dashboard-habit-stats-card-head': 'flex [align-items:center] gap-[6px] [margin-bottom:10px]',
	'dashboard-habit-stats-card-name':
		'[font-size:var(--hu-text-sm)] [font-weight:600] [color:var(--hu-fg)] [overflow:hidden] [text-overflow:ellipsis] whitespace-nowrap',
	'dashboard-habit-stats-card-head-spacer': '[flex:1]',
	'dashboard-habit-stats-grip':
		'inline-flex [align-items:center] [flex-shrink:0] w-[16px] [cursor:grab] [color:var(--hu-fg-2)] [opacity:0.45] [touch-action:none] motion-safe:[transition:opacity_0.15s_ease,_color_0.15s_ease] [&:hover]:[opacity:1] [&:hover]:[color:var(--hu-fg)] [&:active]:[cursor:grabbing] [&_svg]:w-[14px] [&_svg]:h-[14px] [&_svg]:block',
	'dashboard-habit-stats-icon-btn':
		'w-[22px] h-[22px] flex [align-items:center] [justify-content:center] [cursor:pointer] [opacity:0.3] [color:var(--hu-fg-2)] motion-safe:[transition:opacity_0.15s] [flex-shrink:0] [&:hover]:[opacity:0.75]',
	'dashboard-habit-stats-chips': 'flex gap-[8px] [margin-bottom:10px]',
	'dashboard-habit-stats-chip':
		'[flex:1] flex [align-items:center] [justify-content:center] gap-[7px] [background:var(--board-bg-card)] rounded-[7px] p-[6px_8px]',
	'dashboard-habit-stats-chip-icon':
		'flex [align-items:center] [color:var(--board-accent)] [flex-shrink:0] [&_svg]:w-[13px] [&_svg]:h-[13px]',
	'dashboard-habit-stats-chip-value':
		'[font-size:var(--hu-text-xs)] [font-weight:700] [color:var(--hu-fg)] [line-height:1.15]',
	'dashboard-habit-stats-chip-label': '[font-size:var(--hu-text-xs)] [color:var(--hu-fg-2)] [line-height:1.15]',
	'dashboard-habit-stats-heatmap-section': 'flex [flex-direction:column] gap-[6px]',
	'dashboard-habit-stats-heatmap-head': 'flex [justify-content:flex-end]',
	'dashboard-habit-stats-heatmap-hint': '[font-size:var(--hu-text-xs)] [color:var(--hu-fg-2)] [opacity:0.7]',
	'dashboard-habit-stats-heatmap-wrap': '[position:relative] w-[100%]',
	'dashboard-habit-stats-heatmap-grid':
		'grid [grid-template-columns:repeat(auto-fill,_12px)] [grid-auto-rows:12px] gap-[3px] [justify-content:center] w-[100%]',
	'dashboard-habit-stats-heatmap-cell': 'rounded-[3px] [background:var(--board-record-color-14)]',
	'dashboard-habit-stats-heatmap-cell--done': '[background:var(--board-accent)]',
	'dashboard-habit-stats-heatmap-empty':
		'[position:absolute] [inset:0] flex [align-items:center] [justify-content:center] [font-size:var(--hu-text-xs)] [color:var(--hu-fg-2)] [opacity:0.75] [text-align:center] [pointer-events:none]',
	'dashboard-pomodoro-tagmanager-hint': '[font-size:var(--hu-text-xs)] [color:var(--hu-fg-2)] m-[-8px_0_12px]',
	'dashboard-pomodoro-tagmanager-list':
		'flex [flex-direction:column] gap-[6px] max-h-[46vh] [overflow-y:auto] [padding-right:2px]',
	'dashboard-pomodoro-tagmanager-row': 'flex [flex-direction:column] gap-[6px]',
	'dashboard-pomodoro-tagmanager-chip':
		'inline-flex [align-items:center] gap-[7px] [align-self:flex-start] max-w-[100%] p-[6px_14px] rounded-[999px] [background:var(--hu-hover)] [border:1px_solid_var(--hu-line)] [cursor:pointer] motion-safe:[transition:border-color_0.15s,_background_0.15s] [&:hover]:[border-color:var(--board-accent)] [&:hover]:[background:var(--board-bg-hover-strong,_var(--hu-hover))]',
	'dashboard-pomodoro-tagmanager-chip--pinned':
		'[border-color:color-mix(in_srgb,_var(--board-accent)_45%,_transparent)] [background:color-mix(in_srgb,_var(--board-accent)_10%,_var(--hu-hover))]',
	'dashboard-pomodoro-tagmanager-chip-name':
		'[font-size:var(--hu-text-xs)] [font-weight:600] [color:var(--hu-fg)] [overflow:hidden] [text-overflow:ellipsis] whitespace-nowrap',
	'dashboard-pomodoro-tagmanager-actions': 'hidden gap-[6px] [flex-wrap:wrap] [padding-left:4px]',
	'dashboard-pomodoro-tagmanager-row--open': '[&_.dashboard-pomodoro-tagmanager-actions]:flex',
	'dashboard-pomodoro-tagmanager-action':
		'flex [align-items:center] gap-[5px] p-[5px_11px] rounded-[999px] [border:1px_solid_var(--hu-line)] [background:var(--hu-sunken,_var(--hu-canvas,_var(--hu-canvas)))] [font-size:var(--hu-text-xs)] [font-weight:500] [color:var(--hu-fg-2)] [cursor:pointer] motion-safe:[transition:border-color_0.15s,_color_0.15s,_background_0.15s] [&:hover]:[border-color:var(--board-accent)] [&:hover]:[color:var(--hu-fg)]',
	'dashboard-pomodoro-tagmanager-action--danger':
		'[&:hover]:[border-color:var(--hu-danger,_var(--hu-danger))] [&:hover]:[color:var(--hu-danger,_var(--hu-danger))]',
	'dashboard-pomodoro-tagmanager-prompt':
		'[margin-top:12px] p-[12px] [background:var(--hu-hover)] rounded-[10px] flex [flex-direction:column] gap-[8px]',
	'dashboard-pomodoro-tagmanager-prompt-label': '[font-size:var(--hu-text-xs)] [color:var(--hu-fg)]',
	'dashboard-pomodoro-tagmanager-prompt-input':
		'[background:var(--hu-sunken,_var(--hu-canvas,_var(--hu-canvas)))] [border:1px_solid_var(--hu-line)] rounded-[6px] [color:var(--hu-fg)] [font-size:var(--hu-text-xs)] p-[6px_8px] w-[100%] [&:focus]:[border-color:var(--board-accent)]',
	'dashboard-pomodoro-tagmanager-prompt-select':
		'[background:var(--hu-sunken,_var(--hu-canvas,_var(--hu-canvas)))] [border:1px_solid_var(--hu-line)] rounded-[6px] [color:var(--hu-fg)] [font-size:var(--hu-text-xs)] p-[6px_8px] w-[100%] [&:focus]:[border-color:var(--board-accent)]',
	'dashboard-pomodoro-tagmanager-prompt-error':
		'[font-size:var(--hu-text-xs)] [color:var(--hu-danger,_var(--hu-danger))] min-h-[0]',
	'dashboard-pomodoro-tagmanager-prompt-btns': 'flex gap-[8px] [justify-content:flex-end]',
	'dashboard-pomodoro-tagmanager-prompt-cancel':
		'[border:none] rounded-[6px] p-[6px_14px] [font-size:var(--hu-text-xs)] [font-weight:600] [cursor:pointer] motion-safe:[transition:opacity_0.15s] [background:var(--hu-hover)] [color:var(--hu-fg-2)] [&:hover]:[opacity:0.85]',
	'dashboard-pomodoro-tagmanager-prompt-ok':
		'[border:none] rounded-[6px] p-[6px_14px] [font-size:var(--hu-text-xs)] [font-weight:600] [cursor:pointer] motion-safe:[transition:opacity_0.15s] [background:var(--board-accent)] [color:var(--hu-canvas,_var(--hu-surface))] [&:hover]:[opacity:0.85]',
	'dashboard-pomodoro-tagmanager-prompt-ok--danger': '[background:var(--hu-danger,_var(--hu-danger))]',
	'dashboard-expense-stats-modal':
		'[background:var(--hu-raised,_var(--hu-canvas,_var(--hu-canvas)))] [border:1px_solid_var(--hu-line)] rounded-[var(--board-radius-lg,_12px)] p-[20px] max-w-[380px] w-[90%] max-h-[80vh] [overflow-y:auto] [box-shadow:0_8px_32px_var(--board-record-color-3)]',
	'dashboard-expense-stats-modal--wide':
		'max-w-[1040px] w-[94%] max-h-[86vh] p-[22px_26px] flex [flex-direction:column] [container-type:inline-size] max-[901px]:max-w-[420px] max-[901px]:max-h-[80vh] max-[641px]:w-[96%] max-[641px]:p-[16px]',
	'dashboard-expense-stats-header':
		'flex [justify-content:space-between] [align-items:center] [margin-bottom:16px] gap-[10px] [flex-wrap:wrap] max-[641px]:[justify-content:flex-start]',
	'dashboard-expense-stats-header-title': '[font-size:var(--hu-text-lg)] [font-weight:700] [color:var(--hu-fg)]',
	'dashboard-expense-catmgr-subtitle':
		'[font-size:var(--hu-text-xs)] [font-weight:600] [color:var(--board-text-faint)] m-[8px_0_2px]',
	'dashboard-expense-catmgr-row': 'flex [align-items:center] gap-[6px] p-[2px_0] rounded-[4px]',
	'dashboard-expense-catmgr-row--dragging': '[opacity:0.45]',
	'dashboard-expense-catmgr-name':
		'[flex:1] min-w-[0] [font-size:var(--hu-text-xs)] [color:var(--hu-fg)] [overflow:hidden] [text-overflow:ellipsis] whitespace-nowrap',
	'dashboard-reading-book-modal':
		'[background:var(--hu-raised,_var(--hu-surface,_var(--hu-surface)))] rounded-[var(--board-radius-lg,_12px)] w-[90%] max-w-[400px] max-h-[70vh] flex [flex-direction:column] [overflow:hidden] [box-shadow:0_8px_32px_var(--board-record-color-3)]',
	'dashboard-reading-book-header':
		'flex [align-items:center] [justify-content:space-between] p-[12px_16px] [border-bottom:1px_solid_var(--hu-line,_var(--board-record-color-35))]',
	'dashboard-reading-book-header-title': '[font-size:var(--hu-text-sm)] [font-weight:600]',
	'dashboard-reading-book-close': '[cursor:pointer] [opacity:0.5] p-[4px] [&:hover]:[opacity:1]',
	'dashboard-reading-book-input-area': 'p-[10px_16px]',
	'dashboard-reading-book-input':
		'w-[100%] p-[8px_12px] rounded-[8px] [border:1px_solid_var(--hu-line,_var(--board-record-color-1))] [background:var(--hu-sunken,_var(--hu-canvas,_var(--hu-surface)))] [color:var(--hu-fg)] [font-size:var(--hu-text-xs)] [&:focus]:[border-color:var(--board-accent,_var(--hu-info))]',
	'dashboard-reading-book-results':
		'[flex:1] [overflow-y:auto] p-[0_16px_12px] flex [flex-direction:column] gap-[6px]',
	'dashboard-reading-book-searching':
		'[font-size:var(--hu-text-xs)] [color:var(--hu-fg-2)] [text-align:center] p-[16px_0]',
	'dashboard-reading-book-no-results':
		'[font-size:var(--hu-text-xs)] [color:var(--hu-fg-2)] [text-align:center] p-[16px_0]',
	'dashboard-reading-book-item':
		'flex [align-items:center] gap-[10px] p-[8px] rounded-[8px] [cursor:pointer] motion-safe:[transition:background_0.2s] [&:hover]:[background:var(--hu-hover,_var(--board-record-color-36))]',
	'dashboard-reading-book-item-cover':
		'w-[32px] h-[42px] rounded-[3px] [background-size:cover] [background-position:center] [flex-shrink:0] [box-shadow:0_1px_3px_var(--board-record-color-35)]',
	'dashboard-reading-book-item-nocover':
		'w-[32px] h-[42px] rounded-[3px] [background:var(--hu-hover,_var(--board-record-color-30))] [flex-shrink:0]',
	'dashboard-reading-book-item-info': 'flex [flex-direction:column] [overflow:hidden]',
	'dashboard-reading-book-item-title':
		'[font-size:var(--hu-text-xs)] [font-weight:500] whitespace-nowrap [overflow:hidden] [text-overflow:ellipsis]',
	'dashboard-reading-book-item-author':
		'[font-size:var(--hu-text-xs)] [color:var(--hu-fg-2)] whitespace-nowrap [overflow:hidden] [text-overflow:ellipsis]',
	'dashboard-reading-book-manual':
		'flex [align-items:center] gap-[6px] [padding-top:8px] [border-top:1px_solid_var(--hu-line,_var(--board-record-color-37))] [margin-top:4px]',
	'dashboard-reading-book-manual-label': '[font-size:var(--hu-text-xs)] [color:var(--hu-fg-2)] [flex-shrink:0]',
	'dashboard-reading-book-manual-input':
		'[flex:1] p-[4px_8px] rounded-[6px] [border:1px_solid_var(--hu-line,_var(--board-record-color-1))] [background:var(--hu-sunken,_var(--hu-canvas,_var(--hu-surface)))] [color:var(--hu-fg)] [font-size:var(--hu-text-xs)] [&:focus]:[border-color:var(--board-accent,_var(--hu-info))]',
	'dashboard-reading-book-manual-btn':
		'p-[4px_10px] rounded-[6px] [border:none] [background:var(--board-accent,_var(--hu-info))] [color:var(--hu-surface)] [font-size:var(--hu-text-xs)] [cursor:pointer] [flex-shrink:0]',
	'dashboard-reading-book-list': 'flex [flex-direction:column] gap-[6px]',
	'dashboard-reading-book-list-row':
		'flex [align-items:center] gap-[8px] p-[6px_0] [&_.dashboard-reading-stats-record-del]:flex [&_.dashboard-reading-stats-record-del]:[align-items:center] [&_.dashboard-reading-stats-record-del]:[justify-content:center] [&_.dashboard-reading-stats-record-del]:w-[20px] [&_.dashboard-reading-stats-record-del]:h-[20px] [&_.dashboard-reading-stats-record-del]:rounded-[4px] [&_.dashboard-reading-stats-record-del]:[cursor:pointer] [&_.dashboard-reading-stats-record-del]:[opacity:0] [&_.dashboard-reading-stats-record-del]:motion-safe:[transition:opacity_0.15s,_background_0.15s] [&_.dashboard-reading-stats-record-del]:[flex-shrink:0] [&:hover_.dashboard-reading-stats-record-del]:[opacity:0.5]',
	'dashboard-reading-book-list-cover':
		'w-[24px] h-[32px] rounded-[2px] [background-size:cover] [background-position:center] [flex-shrink:0]',
	'dashboard-reading-book-list-nocover':
		'w-[24px] h-[32px] rounded-[2px] [background:var(--hu-hover,_var(--board-record-color-30))] [flex-shrink:0]',
	'dashboard-reading-book-list-info': '[flex:1] [overflow:hidden]',
	'dashboard-reading-book-list-title':
		'[font-size:var(--hu-text-xs)] [font-weight:500] whitespace-nowrap [overflow:hidden] [text-overflow:ellipsis]',
	'dashboard-reading-book-list-author':
		'[font-size:var(--hu-text-xs)] [color:var(--hu-fg-2)] whitespace-nowrap [overflow:hidden] [text-overflow:ellipsis]',
	'dashboard-reading-book-list-meta': 'flex [flex-direction:column] [align-items:flex-end] [flex-shrink:0]',
	'dashboard-reading-book-list-duration': '[font-size:var(--hu-text-xs)] [font-weight:500]',
	'dashboard-reading-end-modal':
		'[background:var(--hu-raised,_var(--hu-surface,_var(--hu-surface)))] rounded-[var(--board-radius-lg,_14px)] w-[88%] max-w-[380px] [overflow:hidden] [box-shadow:0_12px_40px_var(--board-record-color-38)]',
	'dashboard-reading-end-header': 'flex [align-items:center] [justify-content:space-between] p-[16px_18px_12px]',
	'dashboard-reading-end-title': '[font-size:var(--hu-text-sm)] [font-weight:600] [color:var(--hu-fg)]',
	'dashboard-reading-end-close': '[cursor:pointer] [opacity:0.4] p-[2px] [&:hover]:[opacity:1]',
	'dashboard-reading-end-body': 'p-[0_18px_16px] flex [flex-direction:column] gap-[12px]',
	'dashboard-reading-end-row': 'flex [align-items:center] [justify-content:space-between]',
	'dashboard-reading-end-label': '[font-size:var(--hu-text-xs)] [color:var(--hu-fg-2)]',
	'dashboard-reading-end-value': '[font-size:var(--hu-text-xs)] [font-weight:500] [color:var(--hu-fg)]',
	'dashboard-reading-end-section': 'flex [flex-direction:column] gap-[8px]',
	'dashboard-reading-end-section-title': '[font-size:var(--hu-text-xs)] [font-weight:600] [color:var(--hu-fg)]',
	'dashboard-reading-end-mode-toggle':
		'flex gap-[2px] [background:var(--hu-hover,_var(--board-record-color-36))] rounded-[6px] p-[2px] [margin-bottom:4px]',
	'dashboard-reading-end-mode-btn':
		'[flex:1] [text-align:center] p-[4px_8px] rounded-[5px] [font-size:var(--hu-text-xs)] [color:var(--hu-fg-2)] [cursor:pointer] motion-safe:[transition:background_0.15s,_border-color_0.15s,_box-shadow_0.15s,_color_0.15s,_transform_0.15s]',
	'dashboard-reading-end-mode-btn--active':
		'[background:var(--hu-sunken,_var(--hu-canvas,_var(--hu-surface)))] [color:var(--hu-fg)] [font-weight:500] [box-shadow:0_1px_3px_var(--board-record-color-37)]',
	'dashboard-reading-end-inputs': 'flex [flex-direction:column] gap-[8px]',
	'dashboard-reading-end-page-readonly':
		'w-[100%] p-[8px_10px] rounded-[8px] [background:var(--hu-hover,_var(--board-record-color-36))] [color:var(--hu-fg-2)] [font-size:var(--hu-text-xs)] [text-align:center]',
	'dashboard-reading-end-page-row': 'flex [align-items:center] gap-[10px]',
	'dashboard-reading-end-page-col': '[flex:1] flex [flex-direction:column] gap-[4px]',
	'dashboard-reading-end-page-label': '[font-size:var(--hu-text-xs)] [color:var(--hu-fg-2)]',
	'dashboard-reading-end-page-input':
		'w-[100%] p-[8px_10px] rounded-[8px] [border:1px_solid_var(--hu-line,_var(--board-record-color-1))] [background:var(--hu-sunken,_var(--hu-canvas,_var(--hu-surface)))] [color:var(--hu-fg)] [font-size:var(--hu-text-xs)] [text-align:center] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:[-webkit-appearance:none] [&::-webkit-inner-spin-button]:m-[0] [&::-webkit-outer-spin-button]:[-webkit-appearance:none] [&::-webkit-outer-spin-button]:m-[0] [&:focus]:[border-color:var(--board-accent,_var(--hu-info))]',
	'dashboard-reading-end-page-input--total': 'max-w-[80px]',
	'dashboard-reading-end-page-arrow':
		'[color:var(--hu-fg-2)] [font-size:var(--hu-text-xs)] [flex-shrink:0] [margin-top:16px]',
	'dashboard-reading-end-total-row': 'flex [align-items:center] gap-[8px]',
	'dashboard-reading-end-finished': 'flex [align-items:center] gap-[8px]',
	'dashboard-reading-end-checkbox':
		'w-[16px] h-[16px] [accent-color:var(--board-accent,_var(--hu-info))] [cursor:pointer]',
	'dashboard-reading-end-checkbox-label': '[font-size:var(--hu-text-xs)] [color:var(--hu-fg)] [cursor:pointer]',
	'dashboard-reading-end-footer':
		'flex [align-items:center] [justify-content:flex-end] gap-[8px] p-[12px_18px_16px] [border-top:1px_solid_var(--hu-line,_var(--board-record-color-30))]',
	'dashboard-reading-end-btn':
		'p-[7px_16px] rounded-[8px] [border:none] [font-size:var(--hu-text-xs)] [font-weight:500] [cursor:pointer] motion-safe:[transition:background_0.15s,_border-color_0.15s,_box-shadow_0.15s,_color_0.15s,_transform_0.15s]',
	'dashboard-reading-end-btn--cancel':
		'[background:transparent] [color:var(--hu-fg-2)] [&:hover]:[color:var(--hu-fg)]',
	'dashboard-reading-end-btn--discard':
		'[background:transparent] [color:var(--hu-fg-2)] [border:1px_solid_var(--hu-line,_var(--board-record-color-4))] [&:hover]:[border-color:var(--hu-danger,_var(--hu-danger))] [&:hover]:[color:var(--hu-danger,_var(--hu-danger))]',
	'dashboard-reading-end-btn--confirm':
		'[background:var(--board-accent,_var(--hu-info))] [color:var(--hu-surface)] [&:hover]:[opacity:0.9]',
	'dashboard-reading-end-btn--delete':
		'[background:transparent] [color:var(--hu-danger,_var(--hu-danger))] [border:1px_solid_var(--board-record-color-39)] [margin-left:auto] [&:hover]:[background:var(--hu-danger,_var(--hu-danger))] [&:hover]:[color:var(--hu-surface)] [&:hover]:[border-color:var(--hu-danger,_var(--hu-danger))]',
	'dashboard-reading-stats-content':
		'flex [flex-direction:column] gap-[10px] p-[0_14px_16px] [overflow-y:auto] max-h-[calc(70vh_-_52px)]',
	'dashboard-reading-stats-card':
		'[background:var(--hu-hover,_var(--board-record-color-29))] rounded-[10px] p-[12px] [border:1px_solid_var(--hu-line,_var(--board-record-color-40))]',
	'dashboard-reading-stats-card-title':
		'[font-size:var(--hu-text-xs)] [font-weight:600] [color:var(--hu-fg)] [margin-bottom:10px]',
	'dashboard-reading-stats-summary': 'grid [grid-template-columns:1fr_1fr] gap-[8px]',
	'dashboard-reading-stats-summary-item':
		'flex [flex-direction:column] [align-items:center] p-[8px_4px] rounded-[8px] [background:var(--hu-sunken,_var(--hu-canvas,_var(--hu-surface)))] gap-[2px]',
	'dashboard-reading-stats-summary-value':
		'[font-size:var(--hu-text-sm)] [font-weight:700] [color:var(--hu-fg)] [line-height:1.3]',
	'dashboard-reading-stats-summary-label': '[font-size:var(--hu-text-xs)] [color:var(--hu-fg-2)]',
	'dashboard-reading-stats-range':
		'flex gap-[2px] [background:var(--hu-sunken,_var(--hu-canvas,_var(--hu-surface)))] rounded-[6px] p-[2px] [margin-bottom:8px]',
	'dashboard-reading-stats-range-btn':
		'[flex:1] [text-align:center] p-[4px_8px] rounded-[5px] [font-size:var(--hu-text-xs)] [color:var(--hu-fg-2)] [cursor:pointer] motion-safe:[transition:background_0.15s,_border-color_0.15s,_box-shadow_0.15s,_color_0.15s,_transform_0.15s]',
	'dashboard-reading-stats-range-btn--active':
		'[background:var(--board-accent,_var(--hu-info))] [color:var(--hu-surface)] [font-weight:500]',
	'dashboard-reading-stats-empty':
		'[font-size:var(--hu-text-xs)] [color:var(--hu-fg-2)] [text-align:center] p-[12px_0]',
	'dashboard-reading-stats-record':
		'flex [align-items:center] gap-[8px] p-[6px_0] [border-bottom:1px_solid_var(--hu-line,_var(--board-record-color-36))] [&:last-child]:[border-bottom:none] [&:hover_.dashboard-reading-stats-record-del]:[opacity:0.5]',
	'dashboard-reading-stats-record-date':
		'[font-size:var(--hu-text-xs)] [color:var(--hu-fg-2)] [flex-shrink:0] min-w-[56px]',
	'dashboard-reading-stats-record-book':
		'[font-size:var(--hu-text-xs)] [font-weight:500] [color:var(--hu-fg)] [flex:1] whitespace-nowrap [overflow:hidden] [text-overflow:ellipsis]',
	'dashboard-reading-stats-record-dur': '[font-size:var(--hu-text-xs)] [color:var(--hu-fg-2)] [flex-shrink:0]',
	'dashboard-reading-stats-record-del':
		'flex [align-items:center] [justify-content:center] w-[20px] h-[20px] rounded-[4px] [cursor:pointer] [opacity:0] motion-safe:[transition:opacity_0.15s,_background_0.15s] [flex-shrink:0] [&:hover]:[opacity:1] [&:hover]:[background:var(--board-record-color-41)] [&_svg]:w-[12px] [&_svg]:h-[12px] [&_svg]:[color:var(--hu-danger)]',
	'dashboard-calendar-cell-dot':
		'w-[5px] h-[5px] rounded-[50%] [background:var(--board-accent)] [flex-shrink:0] [&.is-done]:[background:var(--board-text-faint,_var(--hu-fg-2,_var(--hu-fg-2)))] [&.is-done]:[opacity:0.55]',
	'dashboard-calendar':
		'[&.is-compact_.dashboard-calendar-cell-list]:hidden flex [flex-direction:column] gap-[4px] [&.is-compact_.dashboard-calendar-cell]:min-h-[64px] [&.is-compact_.dashboard-calendar-cell.has-tasks]:[cursor:pointer] [&.is-compact_.dashboard-calendar-cell.has-tasks:hover]:[background:var(--board-bg-card-hover,_var(--board-record-color-76))] [&.is-full_.dashboard-calendar-cell]:h-[clamp(104px,_16vh,_200px)] [&.is-full_.dashboard-calendar-cell]:[border-color:color-mix(in_srgb,_var(--hu-fg,_var(--board-record-color-92))_16%,_transparent)] [&.is-full_.dashboard-calendar-cell.is-today]:[background:color-mix(in_srgb,_var(--board-accent,_var(--hu-accent))_16%,_transparent)] [&.is-full_.dashboard-calendar-cell.is-today]:[border-color:var(--board-accent,_var(--hu-accent))] [&.is-full_.dashboard-calendar-cell.is-today_.dashboard-calendar-cell-num]:[color:var(--board-accent,_var(--hu-accent-text))] [&.is-full_.dashboard-calendar-cell.is-today_.dashboard-calendar-cell-num]:[font-weight:700] [&.is-full_.dashboard-calendar-cell-num.is-clickable]:[cursor:pointer] [&.is-full_.dashboard-calendar-cell-num.is-clickable]:rounded-[4px] [&.is-full_.dashboard-calendar-cell-num.is-clickable]:m-[-2px_-5px] [&.is-full_.dashboard-calendar-cell-num.is-clickable]:p-[2px_5px] [&.is-full_.dashboard-calendar-cell-num.is-clickable]:[align-self:flex-start] [&.is-full_.dashboard-calendar-cell-num.is-clickable:hover]:[background:var(--hu-hover,_var(--board-record-color-78))] [&.is-full_.dashboard-calendar-cell-num.is-clickable:hover]:[color:var(--hu-fg,_var(--hu-fg))] [&.is-full_.dashboard-calendar-cell-num.is-clickable:focus-visible]:[outline:2px_solid_var(--board-accent,_var(--hu-accent))] [&.is-full_.dashboard-calendar-cell-num.is-clickable:focus-visible]:[outline-offset:1px] [&.dashboard-calendar--week]:flex [&.dashboard-calendar--week]:[flex-direction:column] [&.dashboard-calendar--week]:gap-[4px] [&.is-full_.dashboard-calendar-event]:[font-size:var(--hu-text-xs)] [&.is-full_.dashboard-calendar-event]:p-[3px_6px] [&.is-full_.dashboard-calendar-event]:[line-height:1.45] [&.is-full_.dashboard-calendar-event-time]:[font-size:var(--hu-text-xs)] [&.is-full_.dashboard-calendar-event-text_.dashboard-wikilink]:[pointer-events:none]',
	'fortune-card':
		"flex [flex-direction:column] [align-items:center] p-[36px_28px_28px] min-w-[260px] max-w-[300px] m-[0_auto] [background:linear-gradient(160deg,_var(--board-record-color-52)_0%,_var(--board-record-color-53)_40%,_var(--board-record-color-54)_100%)] [border:2px_solid_var(--hu-warning)] rounded-[4px] [box-shadow:0_2px_12px_var(--board-record-color-56),_inset_0_0_30px_var(--board-record-color-57)] [color:var(--hu-fg)] [position:relative] [&::before]:[content:''] [&::before]:[position:absolute] [&::before]:[top:6px] [&::before]:[left:6px] [&::before]:[right:6px] [&::before]:[bottom:6px] [&::before]:[border:1px_solid_var(--board-record-color-59)] [&::before]:rounded-[2px] [&::before]:[pointer-events:none]",
	'fortune-card-title':
		'[font-size:var(--hu-text-xl)] [font-weight:700] [color:var(--board-record-color-60)] [margin-bottom:6px] [letter-spacing:0.12em] [text-align:center]',
	'fortune-card-subtitle':
		'[font-size:var(--hu-text-xs)] [color:var(--hu-fg-2)] [margin-bottom:24px] [letter-spacing:0.04em] [text-align:center]',
	'fortune-category-grid': 'grid [grid-template-columns:repeat(3,_1fr)] gap-[10px] w-[100%]',
	'fortune-category-btn':
		'flex [flex-direction:column] [align-items:center] gap-[8px] p-[16px_8px] rounded-[4px] [background:var(--board-record-color-62)] [border:1.5px_solid_var(--hu-warning)] [cursor:pointer] motion-safe:[transition:background_0.2s,_border-color_0.2s,_box-shadow_0.2s,_color_0.2s,_transform_0.2s] [color:var(--hu-fg)] [&:hover]:[background:var(--board-record-color-63)] [&:hover]:[border-color:var(--board-record-color-60)] [&:hover]:[transform:translateY(-2px)] [&:hover]:[box-shadow:0_2px_8px_var(--board-record-color-64)]',
	'fortune-category-emoji': '[font-size:var(--hu-text-xl)] [line-height:1]',
	'fortune-category-label':
		'[font-size:var(--hu-text-sm)] [color:var(--hu-fg)] [font-weight:600] [letter-spacing:0.06em]',
	'fortune-card--result': 'p-[32px_24px_24px] min-w-[240px] max-w-[280px]',
	'fortune-result-header':
		'flex [flex-direction:column] [align-items:center] gap-[8px] w-[100%] [margin-bottom:16px]',
	'fortune-result-seal':
		"inline-flex [align-items:center] [justify-content:center] w-[56px] h-[56px] [border:2.5px_solid_var(--hu-danger)] rounded-[50%] [color:var(--hu-danger)] [font-size:var(--hu-text-xs)] [font-weight:800] [letter-spacing:0.04em] [line-height:1.2] [text-align:center] [transform:rotate(-8deg)] [position:relative] [&::after]:[content:''] [&::after]:[position:absolute] [&::after]:[inset:3px] [&::after]:[border:1px_solid_var(--board-record-color-66)] [&::after]:rounded-[50%] [&::after]:[pointer-events:none]",
	'fortune-result-seal--super': '[background:var(--board-record-color-67)]',
	'fortune-result-seal--good':
		'[background:var(--board-record-color-68)] [border-color:var(--hu-danger)] [color:var(--hu-danger)] [&::after]:[border-color:var(--board-record-color-70)]',
	'fortune-result-seal--medium':
		'[background:var(--board-record-color-71)] [border-color:var(--hu-fg-2)] [color:var(--hu-fg-2)] [&::after]:[border-color:var(--board-record-color-72)]',
	'fortune-result-category':
		'[position:absolute] [top:10px] [right:10px] [font-size:var(--hu-text-xs)] [color:var(--hu-warning)] [font-weight:500] [letter-spacing:0.04em] [z-index:var(--layer-menu)]',
	'fortune-result-divider':
		'w-[80%] h-[1px] [background:linear-gradient(90deg,_transparent,_var(--hu-warning),_transparent)] m-[0_auto_20px]',
	'fortune-result-verse':
		'[writing-mode:vertical-rl] [text-orientation:mixed] [font-size:var(--hu-text-base)] [line-height:2.2] [color:var(--hu-fg)] [font-weight:600] [letter-spacing:0.08em] h-[180px] m-[0_auto_20px] [text-align:start] p-[0_8px]',
	'fortune-flip-container': '[perspective:1000px] w-[100%]',
	'fortune-flip-card':
		'[position:relative] w-[100%] [transform-style:preserve-3d] motion-safe:[transition:transform_0.6s_ease]',
	'fortune-flip-card--flipped': '[transform:rotateY(180deg)]',
	'fortune-flip-front': '[backface-visibility:hidden]',
	'fortune-flip-back':
		'[position:absolute] [top:0] [left:0] w-[100%] h-[100%] [backface-visibility:hidden] [transform:rotateY(180deg)] flex [flex-direction:column] [align-items:center] [justify-content:center] gap-[16px] p-[0_4px] [overflow-y:auto]',
	'fortune-result-reveal-btn':
		'inline-flex [align-items:center] [justify-content:center] p-[8px_20px] [border:2px_solid_var(--hu-danger)] rounded-[4px] [font-size:var(--hu-text-sm)] [font-weight:700] [cursor:pointer] [background:transparent] [color:var(--hu-danger)] [letter-spacing:0.1em] motion-safe:[transition:background_0.2s,_border-color_0.2s,_box-shadow_0.2s,_color_0.2s,_transform_0.2s] [transform:rotate(-2deg)] [&:hover]:[background:var(--hu-danger)] [&:hover]:[color:var(--board-record-color-52)]',
	'fortune-back-title':
		'[font-size:var(--hu-text-base)] [font-weight:700] [color:var(--board-record-color-60)] [letter-spacing:0.1em] [margin-bottom:4px]',
	'fortune-back-interpretation':
		'w-[100%] [font-size:var(--hu-text-sm)] [line-height:2] [color:var(--hu-fg)] p-[16px] [background:var(--board-record-color-74)] rounded-[4px] [border:1px_solid_var(--hu-danger)]',
	'fortune-result-back-btn':
		'[margin-top:20px] [font-size:var(--hu-text-xs)] [color:var(--hu-warning)] [cursor:pointer] [opacity:0.7] motion-safe:[transition:opacity_0.2s] [text-decoration:underline] [text-underline-offset:2px] [letter-spacing:0.04em] [&:hover]:[opacity:1] [&:hover]:[color:var(--board-record-color-60)]',
	'dashboard-modal-btn':
		'[&.is-disabled]:[opacity:0.45] [&.is-disabled]:[pointer-events:none] p-[6px_16px] rounded-[var(--board-radius-sm,_6px)] [font-size:var(--hu-text-sm)] [cursor:pointer] [background:var(--hu-surface,_var(--hu-hover))] [border:1px_solid_var(--hu-line,_var(--hu-line))] [color:var(--hu-fg,_var(--hu-fg))] motion-safe:[transition:background_0.15s_ease,_border-color_0.15s_ease,_opacity_0.15s_ease] [&:hover]:[background:var(--hu-hover,_var(--hu-hover))]',
	'dashboard-modal':
		'rounded-[var(--board-radius-lg,_12px)] [border:1px_solid_var(--hu-line,_var(--hu-line))] [background:var(--hu-raised,_var(--board-bg-card,_var(--hu-surface)))] [backdrop-filter:var(--board-backdrop-blur,_blur(24px))] [-webkit-backdrop-filter:var(--board-backdrop-blur,_blur(24px))] [color:var(--hu-fg,_var(--hu-fg))] p-[28px_32px_24px] max-[641px]:[backdrop-filter:none] max-[641px]:[-webkit-backdrop-filter:none] max-[641px]:rounded-[var(--board-radius-md)]',
	'dashboard-library-config-section':
		'[background:var(--hu-hover,_var(--board-record-color-29))] [border:1px_solid_var(--hu-line,_var(--board-record-color-40))] rounded-[10px] p-[12px] [margin-bottom:16px]',
	'dashboard-modal-form':
		'[&_label]:[font-size:var(--hu-text-sm)] [&_label]:[font-weight:500] [&_label]:block [&_label]:[margin-bottom:4px] [&_label]:[color:var(--hu-fg,_var(--hu-fg))]',
	'dashboard-modal-input':
		'w-[100%] p-[8px_12px] [border:1px_solid_var(--input,_var(--hu-line))] rounded-[var(--board-radius-sm,_6px)] [background:var(--hu-sunken,_var(--hu-raised))] [color:var(--hu-fg,_var(--hu-fg))] [font-size:var(--hu-text-sm)] motion-safe:[transition:border-color_0.15s_ease,_box-shadow_0.15s_ease] [&:focus]:[border-color:var(--hu-accent,_var(--hu-accent))]',
	'dashboard-modal-footer':
		'flex gap-[8px] [justify-content:flex-end] [margin-top:16px] [padding-top:12px] [border-top:1px_solid_var(--hu-line,_var(--hu-line))]',
	'dashboard-modal-btn--cancel': '[color:var(--hu-fg-2,_var(--hu-fg-2))]',
	'dashboard-modal-btn--confirm':
		'[background:var(--board-accent,_var(--hu-accent))] [border-color:transparent] [color:var(--hu-raised,_var(--hu-accent-fg))] [font-weight:500] [&:hover]:[background:var(--board-accent,_var(--hu-accent))] [&:hover]:[opacity:0.88]',
	'dashboard-library-view-toggle':
		'flex gap-[2px] [background:var(--hu-sunken,_var(--board-record-color-75))] rounded-[var(--board-radius-sm,_6px)] p-[2px]',
	'dashboard-library-view-btn':
		'[cursor:pointer] p-[4px_8px] rounded-[4px] [color:var(--hu-fg-2,_var(--hu-fg-2))] flex [align-items:center] [font-size:var(--hu-text-xs)] motion-safe:[transition:background_0.15s_ease,_border-color_0.15s_ease,_box-shadow_0.15s_ease,_color_0.15s_ease,_transform_0.15s_ease] [&:hover]:[color:var(--hu-fg,_var(--hu-fg))] [&:hover]:[background:var(--hu-hover,_var(--board-record-color-75))] [&.active]:[background:var(--hu-surface,_var(--board-record-color-22))] [&.active]:[color:var(--board-accent,_var(--hu-accent))]',
	'dashboard-library-config-hint':
		'[&.is-hidden]:hidden [font-size:var(--hu-text-xs)] [color:var(--hu-fg-2,_var(--hu-fg-2))] [margin-bottom:6px]',
	'dashboard-library-config-btn':
		'[cursor:pointer] p-[4px] rounded-[var(--board-radius-sm,_6px)] [color:var(--hu-fg-2,_var(--hu-fg-2))] flex [align-items:center] [&:hover]:[color:var(--hu-fg,_var(--hu-fg))] [&:hover]:[background:var(--hu-hover,_var(--board-record-color-75))]',
	'dashboard-library-empty':
		'p-[40px_20px] [text-align:center] [color:var(--hu-fg-2,_var(--hu-fg-2))] [font-size:var(--hu-text-xs)]',
	'dashboard-library-config-section-title':
		'[font-size:var(--hu-text-xs)] [font-weight:600] [color:var(--hu-fg,_var(--hu-fg))] [margin-bottom:8px]',
	'dashboard-library-config-filters': 'flex [flex-direction:column] gap-[8px]',
	'dashboard-library-config-inline-row': 'flex [align-items:center] gap-[8px] [margin-top:6px]',
	'dashboard-library-config-inline-label': '[font-size:var(--hu-text-xs)] [color:var(--hu-fg,_var(--hu-fg))]',
	'dashboard-library-config-number':
		'w-[64px] h-[26px] p-[0_6px] [box-sizing:border-box] [font-size:var(--hu-text-xs)] [background:var(--hu-sunken,_var(--hu-raised))] [border:1px_solid_var(--hu-line,_var(--hu-line))] rounded-[var(--board-radius-sm,_6px)] [color:var(--hu-fg,_var(--hu-fg))]',
	'dashboard-modal-header': 'flex [align-items:center] [justify-content:space-between] [margin-bottom:16px]',
	'dashboard-modal-title': '[font-size:var(--hu-text-sm)] [font-weight:600]',
	'dashboard-alltasks-exclude-chips': 'flex [flex-wrap:wrap] gap-[6px] [margin-bottom:8px]',
	'dashboard-alltasks-exclude-chip':
		'inline-flex [align-items:center] gap-[4px] [font-size:var(--hu-text-xs)] p-[2px_8px] rounded-[999px] [background:var(--hu-hover,_var(--board-record-color-76))] [color:var(--hu-fg,_var(--hu-fg))]',
	'dashboard-alltasks-exclude-chip-x':
		'[cursor:pointer] [opacity:0.6] [font-weight:700] [&:hover]:[opacity:1] [&:hover]:[color:var(--hu-danger)]',
	'dashboard-calendar-weekdays': 'grid [grid-template-columns:repeat(7,_1fr)] gap-[2px]',
	'dashboard-calendar-weekday':
		'[font-size:var(--hu-text-xs)] [text-align:center] [color:var(--hu-fg-2,_var(--hu-fg-2))] p-[2px_0]',
	'dashboard-calendar-body': 'grid [grid-template-columns:repeat(7,_1fr)] gap-[2px]',
	'dashboard-calendar-body--bars': 'flex [flex-direction:column] gap-[2px]',
	'dashboard-calendar-week': 'flex [flex-direction:column] gap-[2px]',
	'dashboard-calendar-barlayer':
		'grid [grid-template-columns:repeat(7,_1fr)] [column-gap:2px] [row-gap:2px] [--dashboard-bar-lane:22px] h-[calc(var(--bar-lanes,_0)_*_var(--dashboard-bar-lane))] [&:empty]:h-[0]',
	'dashboard-calendar-week-days': 'grid [grid-template-columns:repeat(7,_1fr)] gap-[2px]',
	'dashboard-calendar-bar':
		'flex [align-items:center] gap-[3px] min-w-[0] h-[20px] p-[0_6px] [grid-column:var(--bar-cs,_1)_/_span_var(--bar-len,_1)] [grid-row:var(--bar-row,_1)] rounded-[999px] [overflow:hidden] [background:var(--hu-hover,_var(--board-record-color-76))] [border:1px_solid_color-mix(in_srgb,_var(--board-accent,_var(--hu-accent))_40%,_transparent)] [color:var(--hu-fg,_var(--hu-fg))] [font-size:var(--hu-text-xs)] [line-height:1.2] whitespace-nowrap [cursor:pointer] [user-select:none] [&:hover]:[background:var(--board-bg-hover-strong,_var(--hu-hover,_var(--board-record-color-90)))] [&:focus-visible]:[outline:1px_solid_var(--board-accent,_var(--hu-accent))] [&:focus-visible]:[outline-offset:1px] [&.is-done]:[opacity:0.5] [&.is-done_.dashboard-calendar-bar-text]:[text-decoration:line-through] [&.prio-high]:[background:color-mix(in_srgb,_var(--hu-danger,_var(--hu-danger))_18%,_transparent)] [&.prio-high]:[border-color:color-mix(in_srgb,_var(--hu-danger,_var(--hu-danger))_55%,_transparent)] [&.prio-medium]:[background:color-mix(in_srgb,_var(--hu-warning,_var(--hu-warning))_18%,_transparent)] [&.prio-medium]:[border-color:color-mix(in_srgb,_var(--hu-warning,_var(--hu-warning))_55%,_transparent)] [&.prio-low]:[background:color-mix(in_srgb,_var(--hu-success,_var(--hu-info))_18%,_transparent)] [&.prio-low]:[border-color:color-mix(in_srgb,_var(--hu-success,_var(--hu-info))_55%,_transparent)] [&.is-cont-left]:[border-top-left-radius:0] [&.is-cont-left]:[border-bottom-left-radius:0] [&.is-cont-left]:[border-left-style:dashed] [&.is-cont-left]:[margin-left:-1px] [&.is-cont-right]:[border-top-right-radius:0] [&.is-cont-right]:[border-bottom-right-radius:0] [&.is-cont-right]:[border-right-style:dashed] [&.is-cont-right]:[margin-right:-1px]',
	'dashboard-calendar-bar-time': '[flex-shrink:0] [font-weight:600] [color:var(--hu-fg-2,_var(--hu-fg-2))]',
	'dashboard-calendar-bar-text': '[overflow:hidden] [text-overflow:ellipsis] min-w-[0]',
	'dashboard-calendar-mark':
		'flex [flex-shrink:0] [color:var(--hu-fg-2,_var(--hu-fg-2))] [opacity:0.7] [&_svg]:w-[11px] [&_svg]:h-[11px]',
	'dashboard-calendar-mark--done': '[opacity:0.8]',
	'dashboard-calendar-cell':
		'min-w-[0] rounded-[var(--board-radius-sm,_6px)] [background:var(--board-bg-card,_var(--board-record-color-91))] [border:1px_solid_var(--hu-line,_var(--board-record-color-78))] p-[3px] flex [flex-direction:column] gap-[2px] [&.is-outside]:[opacity:0.4] [&.is-today]:[border-color:var(--board-accent,_var(--hu-accent))] [&.is-today]:[box-shadow:0_0_0_1px_var(--board-accent,_var(--hu-accent))_inset] [&.is-today_.dashboard-calendar-cell-num]:[color:var(--board-accent,_var(--hu-accent-text))]',
	'dashboard-calendar-cell-num':
		'[font-size:var(--hu-text-xs)] [font-weight:600] [color:var(--hu-fg-2,_var(--hu-fg-2))]',
	'dashboard-calendar-cell-list': 'flex [flex-direction:column] gap-[2px] min-h-[0]',
	'dashboard-calendar-event':
		'flex [align-items:center] gap-[3px] [font-size:var(--hu-text-xs)] [line-height:1.2] p-[1px_4px] rounded-[4px] [background:var(--hu-hover,_var(--board-record-color-78))] [color:var(--hu-fg,_var(--hu-fg))] [overflow:hidden] whitespace-nowrap [text-overflow:ellipsis] [&.is-done]:[opacity:0.5] [&.is-done]:[text-decoration:line-through] [&.is-overdue]:[background:var(--board-record-color-96)] [&.prio-high]:[border-left:2px_solid_var(--hu-danger)] [&.prio-medium]:[border-left:2px_solid_var(--hu-warning)] [&.prio-low]:[border-left:2px_solid_var(--hu-info)] [&.is-multi]:[background:var(--hu-hover,_var(--board-record-color-97))] [&.is-multi_.dashboard-calendar-multi-mark]:[margin-left:auto] [&.is-multi_.dashboard-calendar-multi-mark]:[flex-shrink:0] [&.is-multi_.dashboard-calendar-multi-mark]:flex [&.is-multi_.dashboard-calendar-multi-mark]:[opacity:0.7] [&.is-multi_.dashboard-calendar-multi-mark_svg]:w-[9px] [&.is-multi_.dashboard-calendar-multi-mark_svg]:h-[9px] [&.is-jumpable]:[cursor:pointer]',
	'dashboard-calendar-event-time':
		'[flex-shrink:0] [font-size:var(--hu-text-xs)] [font-variant-numeric:tabular-nums] [color:var(--hu-fg-2,_var(--hu-fg-2))] [background:var(--board-record-color-3)] p-[0_3px] rounded-[3px] min-w-[28px] [text-align:center]',
	'dashboard-calgrid': 'flex [flex-direction:column] h-[100%] min-h-[0]',
	'dashboard-calgrid-head':
		'grid [grid-template-columns:52px_repeat(7,_1fr)] [border-bottom:1px_solid_var(--hu-line,_var(--board-record-color-76))]',
	'dashboard-calgrid-dayhead':
		'[text-align:center] p-[6px_0_4px] [&.is-today_.dashboard-calgrid-dayhead-date]:[color:var(--board-accent,_var(--hu-accent))] [&.is-clickable]:[cursor:pointer] [&.is-clickable]:rounded-[4px] [&.is-clickable:hover]:[background:var(--hu-hover,_var(--board-record-color-78))] [&.is-clickable:focus-visible]:[outline:2px_solid_var(--board-accent,_var(--hu-accent))] [&.is-clickable:focus-visible]:[outline-offset:1px]',
	'dashboard-calgrid-dayhead-wd': '[font-size:var(--hu-text-xs)] [color:var(--hu-fg-2,_var(--hu-fg-2))]',
	'dashboard-calgrid-dayhead-date':
		'[font-size:var(--hu-text-sm)] [font-weight:600] [color:var(--hu-fg,_var(--hu-fg))]',
	'dashboard-calgrid-allday':
		'grid [grid-template-columns:52px_repeat(7,_1fr)] [border-bottom:1px_solid_var(--hu-line,_var(--board-record-color-76))] min-h-[22px]',
	'dashboard-calgrid-allday-corner':
		'[font-size:var(--hu-text-xs)] [color:var(--hu-fg-2,_var(--hu-fg-2))] p-[3px_4px] [align-self:center]',
	'dashboard-calgrid-allday-cell': 'p-[2px_1px] flex [flex-direction:column] gap-[1px] min-w-[0]',
	'dashboard-calgrid-allday-chip':
		'[font-size:var(--hu-text-xs)] [line-height:1.2] [background:var(--hu-hover,_var(--board-record-color-78))] rounded-[3px] p-[0_3px] whitespace-nowrap [overflow:hidden] [text-overflow:ellipsis] [&.is-done]:[opacity:0.5] [&.is-done]:[text-decoration:line-through] [&.is-jumpable]:[cursor:pointer] [&.is-jumpable:hover]:[background:var(--board-bg-card-hover,_var(--board-record-color-90))]',
	'dashboard-calgrid-allday-more': '[font-size:var(--hu-text-xs)] [color:var(--hu-fg-2,_var(--hu-fg-2))]',
	'dashboard-calgrid-scroll': '[flex:1] min-h-[0] [overflow-y:auto] max-h-[calc(100vh_-_180px)]',
	'dashboard-calgrid-body': 'grid [grid-template-columns:52px_repeat(7,_1fr)] [position:relative]',
	'dashboard-calgrid-hours': '[border-right:1px_solid_var(--hu-line,_var(--board-record-color-76))]',
	'dashboard-calgrid-hour':
		'h-[48px] [font-size:var(--hu-text-xs)] [color:var(--hu-fg-2,_var(--hu-fg-2))] [text-align:right] p-[0_4px] [box-sizing:border-box]',
	'dashboard-calgrid-daycol':
		'[position:relative] h-[1152px] min-w-[0] [border-right:1px_solid_var(--hu-line,_var(--board-record-color-78))] [background-image:linear-gradient(to_bottom,_var(--hu-line,_var(--board-record-color-78))_1px,_transparent_1px)] [background-size:100%_48px] [background-position:0_0] [&.is-today]:[background-color:var(--hu-sunken,_var(--board-record-color-93))]',
	'dashboard-calgrid-event':
		'[position:absolute] [left:2px] [right:2px] rounded-[5px] p-[3px_6px] [overflow:hidden] [background:var(--board-bg-card-hover,_var(--board-record-color-76))] [border-left:3px_solid_var(--board-accent,_var(--hu-accent))] [font-size:var(--hu-text-xs)] [line-height:1.25] [cursor:pointer] [color:var(--hu-fg,_var(--hu-fg))] [&.is-done]:[opacity:0.5] [&.is-done]:[text-decoration:line-through] [&.prio-high]:[border-left-color:var(--hu-danger,_var(--hu-danger))] [&.prio-medium]:[border-left-color:var(--board-accent-light,_var(--hu-info))]',
	'dashboard-calgrid-event-check': '[margin-right:3px]',
	'dashboard-calgrid-event-time':
		'[font-size:var(--hu-text-xs)] [color:var(--hu-fg-2,_var(--hu-fg-2))] [font-variant-numeric:tabular-nums]',
	'dashboard-calgrid-event-title': '[font-weight:500] whitespace-nowrap [overflow:hidden] [text-overflow:ellipsis]',
	'dashboard-calgrid-nowline':
		"[position:absolute] [left:52px] [right:0] h-[2px] [background:var(--hu-danger,_var(--hu-danger))] [z-index:var(--layer-menu)] [pointer-events:none] [&::before]:[content:''] [&::before]:[position:absolute] [&::before]:[left:-4px] [&::before]:[top:-3px] [&::before]:w-[8px] [&::before]:h-[8px] [&::before]:rounded-[50%] [&::before]:[background:var(--hu-danger,_var(--hu-danger))]",
	'dashboard-calendar-event-text': '[overflow:hidden] [text-overflow:ellipsis]',
	'dashboard-calendar-check':
		'w-[11px] h-[11px] [flex-shrink:0] m-[0] [accent-color:var(--board-accent,_var(--hu-accent))]',
	'dashboard-calendar-more': '[font-size:var(--hu-text-xs)] [color:var(--hu-fg-2,_var(--hu-fg-2))] p-[0_4px]',
	'dashboard-calendar-fullscreen-modal': 'w-[92vw] max-w-[1100px] h-[88vh]',
	'dashboard-calendar-fullscreen-inner':
		'w-[100%] h-[100%] flex [flex-direction:column] [&_.dashboard-modal-header]:[flex-wrap:wrap] [&_.dashboard-modal-header]:[row-gap:8px]',
	'dashboard-calendar-fullscreen-body':
		'[flex:1] min-h-[0] [overflow:auto] [&_.dashboard-calendar.is-full_.dashboard-calendar-cell-list]:[flex:1] [&_.dashboard-calendar.is-full_.dashboard-calendar-cell-list]:gap-[4px] [&_.dashboard-calendar.is-full_.dashboard-calendar-cell-list]:[overflow-y:auto] [&_.dashboard-calendar.is-full_.dashboard-calendar-cell-list]:[overscroll-behavior:contain] [&_.dashboard-calendar.is-full_.dashboard-calendar-cell-list]:[scrollbar-width:thin] [&_.dashboard-calendar.is-full_.dashboard-calendar-cell-list]:[scrollbar-color:color-mix(in_srgb,_var(--board-accent,_var(--hu-accent))_30%,_transparent)_transparent]',
	'dashboard-calendar-section': '[flex:1] min-h-[0] flex [flex-direction:column]',
	'dashboard-calendar-section-body':
		'[flex:1] min-h-[0] [overflow:auto] [&_.dashboard-calendar.is-full_.dashboard-calendar-cell]:h-[clamp(64px,_9vh,_120px)] [&_.dashboard-calendar.is-full_.dashboard-calendar-cell-list]:[flex:1] [&_.dashboard-calendar.is-full_.dashboard-calendar-cell-list]:gap-[4px] [&_.dashboard-calendar.is-full_.dashboard-calendar-cell-list]:[overflow-y:auto] [&_.dashboard-calendar.is-full_.dashboard-calendar-cell-list]:[overscroll-behavior:contain] [&_.dashboard-calendar.is-full_.dashboard-calendar-cell-list]:[scrollbar-width:thin] [&_.dashboard-calendar.is-full_.dashboard-calendar-cell-list]:[scrollbar-color:color-mix(in_srgb,_var(--board-accent,_var(--hu-accent))_30%,_transparent)_transparent]',
	'dashboard-reading-mini':
		'[position:fixed] [top:46px] [right:12px] [z-index:var(--layer-menu)] flex [align-items:center] gap-[6px] p-[4px_6px] [background:var(--hu-raised,_var(--hu-surface))] [border:1px_solid_var(--hu-line,_var(--hu-line))] rounded-[var(--board-radius-md,_8px)] [box-shadow:var(--board-shadow-card,_0_4px_16px_var(--board-record-color-38))] [color:var(--hu-fg,_var(--hu-fg))] [user-select:none] [cursor:grab] [touch-action:none] [overflow:hidden] max-[641px]:[top:52px] max-[641px]:[right:10px] max-[641px]:p-[4px_6px]',
	'dashboard-reading-mini-icon':
		'flex [align-items:center] [color:var(--board-accent,_var(--hu-accent))] [flex-shrink:0] [&_svg]:w-[12px] [&_svg]:h-[12px]',
	'dashboard-reading-mini-time':
		'[font-size:12px] [font-weight:700] [letter-spacing:0.4px] [font-variant-numeric:tabular-nums] [line-height:1.2] whitespace-nowrap [text-align:center]',
	'dashboard-reading-mini--paused': '[&_.dashboard-reading-mini-time]:[opacity:0.6]',
	'dashboard-reading-mini-btn':
		'w-[20px] h-[20px] flex [align-items:center] [justify-content:center] [flex-shrink:0] rounded-[50%] [background:var(--hu-surface,_transparent)] [border:1px_solid_var(--hu-line,_var(--hu-line))] [color:var(--hu-fg,_var(--hu-fg))] [cursor:pointer] motion-safe:[transition:background_0.15s_ease,_transform_0.1s_ease] [&:hover]:[background:var(--hu-hover,_var(--hu-hover))] [&:active]:[transform:scale(0.92)] [&_svg]:w-[9px] [&_svg]:h-[9px] max-[641px]:w-[26px] max-[641px]:h-[26px] max-[641px]:[&_svg]:w-[11px] max-[641px]:[&_svg]:h-[11px]',
};
export function widgetClasses(names: string | undefined): string {
	return cn(...(names ?? '').split(/\s+/).flatMap((name) => [name, layout[name]]));
}
