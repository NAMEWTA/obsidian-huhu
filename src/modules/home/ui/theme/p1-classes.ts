// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: styles.css
// Static Tailwind recipes retain upstream selector names for visual comparison. No runtime CSS is generated.
import { cn } from '../../../../ui/lib/utils';
const layout: Record<string, string> = {
	'dashboard-wikilink':
		'[color:var(--board-accent,_var(--hu-info))] [cursor:pointer] [text-decoration:none] [border-bottom:1px_dotted_currentColor] [&:hover]:[color:var(--board-accent-light,_var(--hu-info))]',
	'dashboard-library-config-modal':
		"[&_.dashboard-modal-input.dashboard-modal-input:not(.dashboard-section-name-input):is(input[type='text'],_input[type='search'])]:[border:1px_solid_var(--input,_var(--hu-line))] [&_.dashboard-modal-input.dashboard-modal-input:not(.dashboard-section-name-input):is(input[type='text'],_input[type='search'])]:rounded-[var(--board-radius-sm,_6px)] [&_.dashboard-modal-input.dashboard-modal-input:not(.dashboard-section-name-input):is(input[type='text'],_input[type='search'])]:p-[8px_12px] [&_.dashboard-modal-input.dashboard-modal-input:not(.dashboard-section-name-input):is(input[type='text'],_input[type='search'])]:[background:var(--hu-sunken,_var(--hu-raised))] [&_.dashboard-modal-input.dashboard-modal-input:not(.dashboard-section-name-input):is(input[type='text'],_input[type='search'])]:[box-shadow:none] [&_.dashboard-modal-input.dashboard-modal-input:not(.dashboard-section-name-input):is(input[type='text'],_input[type='search'])]:[color:var(--hu-fg,_var(--hu-fg))] [&_.dashboard-modal-input.dashboard-modal-input:is(input[type='text'],_input[type='search']):focus]:[border-color:var(--hu-accent,_var(--hu-accent))] [&_.dashboard-modal-input.dashboard-modal-input:is(input[type='text'],_input[type='search']):focus]:[box-shadow:none] p-[0]",
	'dashboard-modal-btn':
		'[&.is-disabled]:[opacity:0.45] [&.is-disabled]:[pointer-events:none] p-[6px_16px] rounded-[var(--board-radius-sm,_6px)] [font-size:var(--hu-text-sm)] [cursor:pointer] [background:var(--hu-surface,_var(--hu-hover))] [border:1px_solid_var(--hu-line,_var(--hu-line))] [color:var(--hu-fg,_var(--hu-fg))] motion-safe:[transition:_opacity_0.15s_ease] [&:hover]:[background:var(--hu-hover,_var(--hu-hover))]',
	'dashboard-modal':
		'rounded-[var(--board-radius-lg,_12px)] [border:1px_solid_var(--hu-line,_var(--hu-line))] [background:var(--hu-raised,_var(--board-bg-card,_var(--hu-surface)))] [backdrop-filter:var(--board-backdrop-blur,_blur(24px))] [-webkit-backdrop-filter:var(--board-backdrop-blur,_blur(24px))] [color:var(--hu-fg,_var(--hu-fg))] p-[28px_32px_24px] [&.dashboard-modal--compact]:p-[18px_20px_16px] [&.modal]:[background:transparent] [&.modal]:[border:none] [&.modal]:[box-shadow:none] [&_h2]:[color:var(--board-accent,_var(--hu-fg))] [&_h2]:[border-bottom:1px_solid_var(--hu-line,_var(--hu-line))] [&_h2]:[padding-bottom:10px] [&_h2]:[margin-bottom:4px] [&_.dashboard-modal-form]:flex [&_.dashboard-modal-form]:[flex-direction:column] [&_.dashboard-modal-form]:gap-[16px] [&_.dashboard-modal-form]:[margin-top:16px] max-[641px]:[backdrop-filter:none] max-[641px]:[-webkit-backdrop-filter:none] max-[641px]:rounded-[var(--board-radius-md)] [&_.dashboard-section-name-input]:[border:1px_solid_var(--hu-line,_var(--board-p1-color-42))] [&_.dashboard-section-name-input]:[background:var(--hu-sunken,_var(--hu-raised))] [&_.dashboard-section-name-input]:[box-shadow:none] [&_.dashboard-section-name-input:focus]:[border-color:var(--board-accent,_var(--hu-accent))]',
	'dashboard-library-config-section':
		'[background:var(--hu-hover,_var(--board-p1-color-3))] [border:1px_solid_var(--hu-line,_var(--board-p1-color-4))] rounded-[10px] p-[12px] [margin-bottom:16px]',
	'dashboard-modal-form':
		'[&_label]:[font-size:var(--hu-text-sm)] [&_label]:[font-weight:500] [&_label]:block [&_label]:[margin-bottom:4px] [&_label]:[color:var(--hu-fg,_var(--hu-fg))]',
	'dashboard-modal-input':
		'w-[100%] p-[8px_12px] [border:1px_solid_var(--input,_var(--hu-line))] rounded-[var(--board-radius-sm,_6px)] [background:var(--hu-sunken,_var(--hu-raised))] [color:var(--hu-fg,_var(--hu-fg))] [font-size:var(--hu-text-sm)] [&:focus]:[border-color:var(--hu-accent,_var(--hu-accent))]',
	'dashboard-modal-footer':
		'flex gap-[8px] [justify-content:flex-end] [margin-top:16px] [padding-top:12px] [border-top:1px_solid_var(--hu-line,_var(--hu-line))]',
	'dashboard-modal-btn--cancel': '[color:var(--hu-fg-2,_var(--hu-fg-2))]',
	'dashboard-modal-btn--confirm':
		'[background:var(--board-accent,_var(--hu-accent))] [border-color:transparent] [color:var(--hu-raised,_var(--hu-accent-fg))] [font-weight:500] [&:hover]:[background:var(--board-accent,_var(--hu-accent))] [&:hover]:[opacity:0.88]',
	'dashboard-library-calendar-popup':
		'[background:var(--hu-raised,_var(--hu-canvas,_var(--hu-canvas)))] [color:var(--hu-fg,_var(--hu-fg))] [border-color:var(--hu-line,_var(--hu-line))] [&_.dashboard-task-reminder-calendar-day]:[color:var(--hu-fg,_var(--hu-fg))] [&_.dashboard-task-reminder-calendar-day--today]:[color:var(--board-accent,_var(--hu-accent))] [&_.dashboard-task-reminder-calendar-day--selected]:[background:var(--board-accent,_var(--hu-accent))] [&_.dashboard-task-reminder-calendar-day--selected]:[color:var(--hu-raised,_var(--hu-accent-fg))] [&_.dashboard-task-reminder-calendar-day--in-range]:[background:color-mix(in_srgb,_var(--board-accent,_var(--hu-chart-5))_20%,_transparent)] [&_.dashboard-task-reminder-calendar-day--in-range]:rounded-[0] [&_.dashboard-task-reminder-calendar-day--other-month]:[color:var(--hu-fg-2,_var(--hu-fg-3))] [&_.dashboard-task-reminder-calendar-nav_span]:[color:var(--hu-fg,_var(--hu-fg))] [&_.dashboard-task-reminder-calendar-nav_button]:[color:var(--hu-fg-2,_var(--hu-fg-2))] [&_.dashboard-task-reminder-calendar-nav_button:hover]:[color:var(--hu-fg,_var(--hu-fg))] [&_.dashboard-task-reminder-calendar-nav_button:hover]:[background:var(--board-bg-card-hover,_var(--board-p1-color-7))] [&_.dashboard-task-reminder-popup-btns_button]:[color:var(--hu-fg,_var(--hu-fg))] [&_.dashboard-task-reminder-popup-btns_button.mod-cta]:[color:var(--primary-foreground)] [&_.dashboard-task-reminder-time]:[color:var(--hu-fg,_var(--hu-fg))] [&_.dashboard-task-reminder-time_select]:[background:var(--hu-sunken,_var(--board-bg-card))] [&_.dashboard-task-reminder-time_select]:[color:var(--hu-fg,_var(--hu-fg))] [&_.dashboard-task-reminder-time_select]:[border-color:var(--input,_var(--hu-line))]',
	'dashboard-library-calendar-status':
		'[font-size:var(--hu-text-xs)] [color:var(--hu-fg-2,_var(--hu-fg-2))] [text-align:center]',
	'dashboard-library-toolbar':
		'[flex-shrink:0] flex [align-items:center] gap-[8px] p-[6px_8px] [background:var(--board-bg-card,_var(--board-p1-color-10))] rounded-[var(--board-radius-md,_10px)] [margin-bottom:8px] [flex-wrap:wrap]',
	'dashboard-library-pagination': '[flex-shrink:0] p-[4px_0_0_0]',
	'dashboard-library-group-header':
		'flex [align-items:center] gap-[6px] p-[6px_4px] m-[10px_0_6px_0] [border-bottom:1px_solid_var(--hu-line,_var(--hu-line))] [cursor:pointer] [user-select:none] rounded-[var(--board-radius-sm,_4px)] [&:hover]:[background:var(--hu-hover,_var(--board-p1-color-9))] [&.is-nogroup_.dashboard-library-group-name]:[color:var(--hu-fg-2,_var(--hu-fg-2))] [&.is-nogroup_.dashboard-library-group-name]:[font-style:italic] [&.is-collapsed]:[opacity:0.75]',
	'dashboard-library-group-name':
		'[font-size:var(--hu-text-xs)] [font-weight:600] [color:var(--hu-fg,_var(--hu-fg))] [overflow:hidden] [text-overflow:ellipsis] whitespace-nowrap',
	'dashboard-library-group-count':
		'[margin-left:auto] [flex-shrink:0] [font-size:var(--hu-text-xs)] [color:var(--hu-fg-2,_var(--hu-fg-2))] [background:var(--hu-hover,_var(--board-p1-color-10))] p-[0_7px] rounded-[999px]',
	'dashboard-library-search':
		'[flex:1] min-w-[120px] max-w-[240px] p-[4px_10px] [border:1px_solid_var(--input,_var(--board-p1-color-7))] rounded-[var(--board-radius-sm,_6px)] [background:var(--hu-sunken,_var(--board-p1-color-9))] [color:var(--hu-fg,_var(--hu-fg))] [font-size:var(--hu-text-xs)] [&:focus]:[border-color:var(--hu-accent,_var(--hu-accent))] [&::placeholder]:[color:var(--hu-fg-2,_var(--hu-fg-2))]',
	'dashboard-library-view-toggle':
		'flex gap-[2px] [background:var(--hu-sunken,_var(--board-p1-color-9))] rounded-[var(--board-radius-sm,_6px)] p-[2px]',
	'dashboard-library-view-btn':
		'[cursor:pointer] p-[4px_8px] rounded-[4px] [color:var(--hu-fg-2,_var(--hu-fg-2))] flex [align-items:center] [font-size:var(--hu-text-xs)] motion-safe:[transition:_transform_0.15s_ease] [&:hover]:[color:var(--hu-fg,_var(--hu-fg))] [&:hover]:[background:var(--hu-hover,_var(--board-p1-color-9))] [&.active]:[background:var(--hu-surface,_var(--board-p1-color-11))] [&.active]:[color:var(--board-accent,_var(--hu-accent))]',
	'dashboard-library-config-hint':
		'[&.is-hidden]:hidden [font-size:var(--hu-text-xs)] [color:var(--hu-fg-2,_var(--hu-fg-2))] [margin-bottom:6px]',
	'dashboard-library-count':
		'[font-size:var(--hu-text-xs)] [color:var(--hu-fg-2,_var(--hu-fg-2))] whitespace-nowrap [margin-left:auto]',
	'dashboard-library-config-btn':
		'[cursor:pointer] p-[4px] rounded-[var(--board-radius-sm,_6px)] [color:var(--hu-fg-2,_var(--hu-fg-2))] flex [align-items:center] [&:hover]:[color:var(--hu-fg,_var(--hu-fg))] [&:hover]:[background:var(--hu-hover,_var(--board-p1-color-9))]',
	'dashboard-library-filter-popup':
		'[position:relative] [margin-top:4px] p-[12px] rounded-[var(--board-radius-md,_10px)] [border:1px_solid_var(--hu-line,_var(--hu-sunken))] [background:var(--hu-raised,_var(--hu-canvas,_var(--hu-canvas)))] max-w-[320px] [box-shadow:0_4px_16px_var(--board-p1-color-13)] [z-index:var(--layer-content)] [color:var(--hu-fg,_var(--hu-fg))]',
	'dashboard-library-quickfilter-row': '[margin-bottom:8px]',
	'dashboard-library-quickfilter-label':
		'block [font-size:var(--hu-text-xs)] [color:var(--hu-fg-2,_var(--hu-fg-2))] [margin-bottom:4px]',
	'dashboard-library-filter-popup-prop':
		'p-[4px_8px] [border:1px_solid_var(--hu-sunken)] rounded-[6px] [background:var(--hu-sunken)] [color:var(--hu-fg)] [font-size:var(--hu-text-xs)] min-w-[120px]',
	'dashboard-library-empty':
		'p-[40px_20px] [text-align:center] [color:var(--hu-fg-2,_var(--hu-fg-2))] [font-size:var(--hu-text-xs)]',
	'dashboard-library-list': 'flex [flex-direction:column] gap-[2px]',
	'dashboard-library-list-item':
		'flex [align-items:center] gap-[12px] p-[6px_10px] rounded-[var(--board-radius-sm,_6px)] [cursor:pointer] [&:hover]:[background:var(--board-bg-card-hover,_var(--board-p1-color-5))]',
	'dashboard-library-table':
		'w-[100%] [border-collapse:collapse] [font-size:var(--hu-text-xs)] [&_th]:[text-align:left] [&_th]:p-[6px_10px] [&_th]:[font-weight:600] [&_th]:[color:var(--hu-fg-2,_var(--hu-fg-2))] [&_th]:[border-bottom:1px_solid_var(--hu-line,_var(--board-p1-color-7))] [&_th]:[font-size:var(--hu-text-xs)] [&_th]:[text-transform:uppercase] [&_th]:[letter-spacing:0.5px] [&_th]:[cursor:pointer] [&_th]:whitespace-nowrap [&_th:hover]:[color:var(--hu-fg,_var(--hu-fg))] [&_td]:p-[6px_10px] [&_td]:[color:var(--hu-fg,_var(--hu-fg))] [&_td]:[border-bottom:1px_solid_var(--hu-line,_var(--board-p1-color-22))] [&_td]:[overflow:hidden] [&_td]:[text-overflow:ellipsis] [&_td]:whitespace-nowrap [&_td]:max-w-[200px] [&_tr]:[cursor:pointer] [&_tbody_tr:hover]:[background:var(--board-bg-card-hover,_var(--board-p1-color-5))] [&_tr:hover_.dashboard-library-table-delete]:[opacity:1]',
	'dashboard-library-table-delete':
		'w-[22px] h-[22px] inline-flex [align-items:center] [justify-content:center] rounded-[50%] [background:transparent] [color:var(--hu-fg-2,_var(--hu-fg-2))] p-[0] min-h-[0] [opacity:0] [cursor:pointer] motion-safe:[transition:opacity_0.15s_ease] [&_svg]:w-[14px] [&_svg]:h-[14px] [&:hover]:[background:var(--board-p1-color-23)] [&:hover]:[color:var(--primary-foreground)]',
	'dashboard-library-table-edit-input':
		'w-[100%] p-[2px_4px] [border:1px_solid_var(--board-accent,_var(--hu-accent))] rounded-[3px] [background:var(--hu-sunken,_var(--board-p1-color-9))] [color:var(--hu-fg,_var(--hu-fg))] [font-size:var(--hu-text-xs)] [box-sizing:border-box]',
	'dashboard-library-config-section-title':
		'[font-size:var(--hu-text-xs)] [font-weight:600] [color:var(--hu-fg,_var(--hu-fg))] [margin-bottom:8px]',
	'dashboard-library-config-filters': 'flex [flex-direction:column] gap-[8px]',
	'dashboard-library-config-inline-row': 'flex [align-items:center] gap-[8px] [margin-top:6px]',
	'dashboard-library-config-inline-label': '[font-size:var(--hu-text-xs)] [color:var(--hu-fg,_var(--hu-fg))]',
	'dashboard-library-config-number':
		'w-[64px] h-[26px] p-[0_6px] [box-sizing:border-box] [font-size:var(--hu-text-xs)] [background:var(--hu-sunken,_var(--hu-raised))] [border:1px_solid_var(--hu-line,_var(--hu-line))] rounded-[var(--board-radius-sm,_6px)] [color:var(--hu-fg,_var(--hu-fg))]',
	'dashboard-library-filter-property':
		'p-[4px_8px] [border:1px_solid_var(--input,_var(--board-p1-color-7))] rounded-[var(--board-radius-sm,_6px)] [background:var(--board-bg-card,_var(--board-p1-color-10))] [color:var(--hu-fg,_var(--hu-fg))] [font-size:var(--hu-text-xs)] max-w-[200px] [&:focus]:[border-color:var(--hu-accent,_var(--hu-accent))]',
	'dashboard-library-filter-chip':
		'p-[2px_8px] rounded-[10px] [font-size:var(--hu-text-xs)] [background:var(--hu-surface,_var(--board-p1-color-11))] [color:var(--hu-fg-2,_var(--hu-fg-2))] [cursor:pointer] motion-safe:[transition:_transform_0.1s_ease] [border:1px_solid_transparent] [&:hover]:[border-color:var(--board-accent,_var(--hu-accent))] [&.active]:[background:var(--board-accent,_var(--hu-accent))] [&.active]:[color:var(--primary-foreground)] [&.active]:[border-color:var(--board-accent,_var(--hu-accent))]',
	'dashboard-library-filter-empty':
		'[font-size:var(--hu-text-xs)] [color:var(--hu-fg-2,_var(--hu-fg-2))] p-[2px_4px]',
	'dashboard-modal-header': 'flex [align-items:center] [justify-content:space-between] [margin-bottom:16px]',
	'dashboard-modal-title': '[font-size:var(--hu-text-sm)] [font-weight:600]',
	'dashboard-alltasks-exclude-chips': 'flex [flex-wrap:wrap] gap-[6px] [margin-bottom:8px]',
	'dashboard-alltasks-exclude-chip':
		'inline-flex [align-items:center] gap-[4px] [font-size:var(--hu-text-xs)] p-[2px_8px] rounded-[999px] [background:var(--hu-hover,_var(--board-p1-color-7))] [color:var(--hu-fg,_var(--hu-fg))]',
	'dashboard-alltasks-exclude-chip-x':
		'[cursor:pointer] [opacity:0.6] [font-weight:700] [&:hover]:[opacity:1] [&:hover]:[color:var(--hu-danger)]',
	'dashboard-heatmap-section-body':
		'[flex:1] min-h-[0] [overflow-y:auto] [&_.dashboard-sidebar-heatmap-stats]:[justify-content:flex-start] [&_.dashboard-sidebar-heatmap-stats]:[margin-top:4px] [&_.dashboard-sidebar-heatmap-stats]:[margin-bottom:10px]',
	'dashboard-heatmap-grid':
		'[&_.dashboard-sidebar-heatmap-cell]:rounded-[3px] grid [grid-template-rows:repeat(7,_var(--hm-cell,_13px))] [grid-auto-flow:column] [grid-auto-columns:var(--hm-cell,_13px)] gap-[3px] [justify-content:flex-start] w-[100%] [overflow-x:auto] [padding-bottom:2px]',
	'dashboard-heatmap-year': 'w-[100%] [margin-top:4px] [padding-left:20px] [--hm-cell:13px]',
	'dashboard-heatmap-months-top':
		'grid h-[16px] [margin-bottom:4px] gap-[3px] [padding-left:20px] w-[100%] [justify-content:flex-start]',
	'dashboard-heatmap-month-label-top':
		'[font-size:var(--hu-text-xs)] [line-height:16px] [color:var(--hu-fg-2,_var(--hu-fg-2))] whitespace-nowrap [overflow:visible]',
	'dashboard-theme-studio': 'max-w-[520px]',
	'dashboard-theme-studio-hint':
		'm-[4px_0_12px] [font-size:var(--hu-text-xs)] [color:var(--hu-fg-2,_var(--hu-fg-2))] [opacity:0.85]',
	'dashboard-theme-studio-section':
		'[margin-bottom:18px] [padding-bottom:14px] [border-bottom:1px_solid_var(--hu-line,_var(--hu-line))] [&:last-child]:[border-bottom:none] [&_h3]:m-[0_0_4px] [&_h3]:[font-size:var(--hu-text-sm)]',
	'dashboard-theme-studio-desc':
		'm-[0_0_10px] [font-size:var(--hu-text-xs)] [color:var(--hu-fg-2,_var(--hu-fg-2))] [opacity:0.85]',
	'dashboard-theme-studio-slider-row': 'flex [align-items:center] gap-[10px]',
	'dashboard-theme-studio-size-row': 'flex [align-items:center] gap-[10px]',
	'dashboard-theme-studio-fontscale-row': 'flex [align-items:center] gap-[10px]',
	'dashboard-theme-studio-fontscale': 'inline-flex gap-[4px]',
	'dashboard-theme-studio-fontscale-btn':
		'p-[4px_12px] [border:1px_solid_var(--hu-line,_var(--hu-line))] rounded-[999px] [background:transparent] [color:var(--hu-fg-2,_var(--hu-fg-2))] [font-size:var(--hu-text-xs)] [cursor:pointer] [&:hover]:[color:var(--hu-fg,_var(--hu-fg))] [&:hover]:[background:var(--hu-hover,_var(--board-p1-color-9))] [&.active]:[color:var(--board-accent,_var(--hu-accent))] [&.active]:[border-color:var(--board-accent,_var(--hu-accent))] [&.active]:[background:color-mix(in_srgb,_var(--board-accent,_var(--hu-accent))_14%,_transparent)]',
	'dashboard-theme-studio-color-label': '[flex:1] [font-size:var(--hu-text-xs)]',
	'dashboard-theme-studio-color-clear':
		'inline-flex [align-items:center] [justify-content:center] w-[28px] h-[28px] p-[0] [border:1px_solid_var(--hu-line,_var(--hu-line))] rounded-[6px] [background:transparent] [cursor:pointer] [color:var(--hu-fg-2,_var(--hu-fg-2))] [&_svg]:w-[14px] [&_svg]:h-[14px]',
	'dashboard-theme-studio-image-row': 'flex gap-[8px] [margin-bottom:14px]',
	'dashboard-theme-studio-image-input': '[flex:1]',
	'dashboard-theme-studio-browse': 'whitespace-nowrap',
	'dashboard-theme-studio-image-clear': 'whitespace-nowrap',
	'dashboard-theme-studio-slider': '[flex:2]',
	'dashboard-theme-studio-size':
		'[flex:0_0_auto] w-[auto] min-w-[150px] h-[36px] p-[0_10px] [line-height:36px] [box-sizing:border-box] [-webkit-appearance:menulist] [appearance:menulist]',
	'dashboard-theme-studio-header':
		'flex [align-items:center] [justify-content:space-between] gap-[12px] [margin-bottom:4px] [&_h2]:m-[0]',
	'dashboard-theme-studio-resetall':
		'inline-flex [align-items:center] gap-[6px] [font-size:var(--hu-text-xs)] [color:var(--hu-fg-2,_var(--hu-fg-2))]',
	'dashboard-theme-studio-slider-hint':
		'[font-size:var(--hu-text-xs)] [color:var(--board-text-faint,_var(--hu-fg-3))] [font-style:italic] min-w-[64px]',
	'dashboard-dataview-pages': 'flex [flex-direction:column] [flex:1] min-h-[0]',
	'dashboard-dataview-body':
		'[flex:1] min-h-[0] [overflow-y:auto] [scrollbar-width:thin] [scrollbar-color:color-mix(in_srgb,_var(--board-accent)_25%,_transparent)_transparent] [&::-webkit-scrollbar]:w-[8px] [&::-webkit-scrollbar-track]:[background:transparent] [&::-webkit-scrollbar-thumb]:[background:color-mix(in_srgb,_var(--board-accent)_20%,_transparent)] [&::-webkit-scrollbar-thumb]:rounded-[4px] [&::-webkit-scrollbar-thumb:hover]:[background:color-mix(in_srgb,_var(--board-accent)_38%,_transparent)]',
	'dashboard-dataview-count':
		'[flex-shrink:0] flex [align-items:center] gap-[6px] [font-size:var(--hu-text-xs)] [color:var(--hu-fg-2,_var(--hu-fg-2))] [text-transform:uppercase] [letter-spacing:0.5px] p-[0_2px] whitespace-nowrap',
	'dashboard-dataview-pagination': '[flex-shrink:0]',
	'dashboard-dataview-toolbar': 'flex [align-items:center] gap-[8px] [flex-shrink:0] p-[2px_0]',
	'dashboard-dataview-table':
		'[&_th.is-sortable]:[cursor:pointer] [&_th.is-sortable]:[user-select:none] [&_th.is-sortable:hover]:[color:var(--hu-fg,_var(--hu-fg))] [&_th.is-sorted-asc_.dashboard-dataview-sort-ind]:[opacity:1] [&_th.is-sorted-asc_.dashboard-dataview-sort-ind]:[color:var(--board-accent,_var(--hu-accent))] [&_th.is-sorted-desc_.dashboard-dataview-sort-ind]:[opacity:1] [&_th.is-sorted-desc_.dashboard-dataview-sort-ind]:[color:var(--board-accent,_var(--hu-accent))] [&_thead_th]:[position:sticky] [&_thead_th]:[top:0] [&_thead_th]:[z-index:var(--layer-content)] [&_thead_th]:[background:linear-gradient(var(--board-bg-section,_var(--hu-surface)),_var(--board-bg-section,_var(--hu-surface))),_var(--hu-canvas,_var(--hu-canvas))] [&_thead_th]:[box-shadow:inset_0_-1px_0_var(--hu-line,_var(--board-p1-color-7))] [&_td.is-numeric]:[text-align:right] [&_td.is-numeric]:[font-variant-numeric:tabular-nums] [&.is-striped_tbody_tr:nth-child(even)]:[background:var(--board-bg-card,_var(--board-p1-color-53))] [&.is-striped_tbody_tr:hover]:[background:var(--board-bg-card-hover,_var(--board-p1-color-5))] [&_tbody_tr:hover]:[background:var(--board-bg-card-hover,_var(--board-p1-color-5))] [&.is-compact_td]:[padding-top:3px] [&.is-compact_td]:[padding-bottom:3px] [&.is-compact_th]:[padding-top:4px] [&.is-compact_th]:[padding-bottom:4px] [&_thead_th.dashboard-dataview-check-head]:w-[30px] [&_thead_th.dashboard-dataview-check-head]:min-w-[30px] [&_thead_th.dashboard-dataview-check-head]:max-w-[30px] [&_thead_th.dashboard-dataview-check-head]:p-[4px_0_4px_6px] [&_th.is-source-col]:[cursor:default] [table-layout:fixed] [word-break:break-word] [font-size:var(--hu-text-xs)] [&_td]:whitespace-normal [&_td]:max-w-[none] [&_td]:[vertical-align:top] [&_td]:[line-height:1.5] [&_td_.dashboard-dataview-cell]:[display:-webkit-box] [&_td_.dashboard-dataview-cell]:[-webkit-box-orient:vertical] [&_td_.dashboard-dataview-cell]:[-webkit-line-clamp:2] [&_td_.dashboard-dataview-cell]:[overflow:hidden] [&_td.dashboard-dataview-src-created]:whitespace-nowrap [&_td.dashboard-dataview-src-created]:[overflow:hidden] [&_td.dashboard-dataview-src-created]:[text-overflow:ellipsis] [&_td.dashboard-dataview-src-created]:[font-variant-numeric:tabular-nums] [&_th.is-datetime]:whitespace-nowrap [&_th.is-datetime]:[overflow:hidden] [&_th.is-datetime]:[text-overflow:ellipsis] [&_th.is-datetime]:[font-variant-numeric:tabular-nums] [&_th]:[cursor:default] [&_th]:[font-size:var(--hu-text-xs)] [&_tr:not(.is-clickable)]:[cursor:default]',
	'dashboard-dataview-sort-ind':
		'inline-flex [vertical-align:middle] [margin-left:4px] [opacity:0.45] [&_svg]:w-[11px] [&_svg]:h-[11px]',
	'dashboard-dataview-list':
		'[&.is-striped_>_.dashboard-dataview-list-item:nth-child(even)]:[background:var(--board-bg-card,_var(--board-p1-color-53))] [&.is-compact_>_.dashboard-dataview-list-item]:[padding-top:2px] [&.is-compact_>_.dashboard-dataview-list-item]:[padding-bottom:2px] flex [flex-direction:column] gap-[2px]',
	'dashboard-dataview-check-col': 'w-[30px] min-w-[30px] max-w-[30px] p-[4px_0_4px_6px] [vertical-align:top]',
	'dashboard-dataview-src-path':
		'[color:var(--hu-fg-2,_var(--hu-fg-2))] [font-size:12.5px] max-w-[220px] [overflow:hidden] [text-overflow:ellipsis] whitespace-nowrap',
	'dashboard-dataview-src-created':
		'[color:var(--hu-fg-2,_var(--hu-fg-2))] [font-size:12.5px] max-w-[220px] [overflow:hidden] [text-overflow:ellipsis] whitespace-nowrap',
	'dashboard-dataview-list-item':
		'[flex-direction:column] [align-items:stretch] gap-[2px] flex [align-items:baseline] gap-[6px] p-[5px_8px] rounded-[var(--board-radius-sm,_6px)] [color:var(--hu-fg,_var(--hu-fg))] [font-size:var(--hu-text-xs)] [&:hover]:[background:var(--board-bg-card-hover,_var(--board-p1-color-10))]',
	'dashboard-dataview-list-main':
		'flex [align-items:baseline] gap-[6px] [flex-wrap:wrap] min-w-[0] [&.dashboard-dataview-task-row]:[align-items:center]',
	'dashboard-dataview-capped': '[text-transform:none] [letter-spacing:0] [opacity:0.7]',
	'dashboard-dataview-group-key': '[font-weight:600] [color:var(--board-accent,_var(--hu-accent))]',
	'dashboard-dataview-group-member': 'p-[1px_0]',
	'dashboard-dataview-list-group':
		'[font-weight:600] [color:var(--board-accent,_var(--hu-accent))] [margin-bottom:2px]',
	'dashboard-dataview-list-members': 'flex [flex-direction:column] gap-[2px] [padding-left:12px]',
	'dashboard-dataview-list-member': '[color:var(--hu-fg,_var(--hu-fg))] [opacity:0.9]',
	'dashboard-dataview-free-list':
		'm-[0] p-[2px_4px] [list-style:none] flex [flex-direction:column] gap-[3px] [color:var(--hu-fg,_var(--hu-fg))] [font-size:var(--hu-text-xs)] [&.is-nested]:[padding-left:14px] [&.is-nested]:[margin-top:3px]',
	'dashboard-dataview-free-item':
		"flex [align-items:baseline] p-[3px_6px] rounded-[var(--board-radius-sm,_6px)] [&:hover]:[background:var(--board-bg-card-hover,_var(--board-p1-color-10))] [&::before]:[content:'•'] [&::before]:[flex-shrink:0] [&::before]:[margin-right:7px] [&::before]:[color:var(--board-accent,_var(--hu-accent))] [&::before]:[line-height:1]",
	'dashboard-dataview-free-main': 'inline-flex [flex-wrap:wrap] [align-items:baseline] gap-[2px_6px] min-w-[0]',
	'dashboard-dataview-free-group': 'flex [flex-direction:column]',
	'dashboard-dataview-free-group-title':
		'[font-weight:600] [color:var(--board-accent,_var(--hu-accent))] p-[3px_6px]',
	'dashboard-dataview-code':
		'[font-size:var(--hu-text-sm)] p-[0_4px] rounded-[4px] [background:var(--hu-hover,_var(--board-p1-color-7))] [color:var(--hu-fg,_var(--hu-fg))]',
	'dashboard-dataview-mark':
		'[background:color-mix(in_srgb,_var(--board-accent,_var(--hu-accent))_28%,_transparent)] [color:inherit] p-[0_2px] rounded-[3px]',
	'dashboard-dataview-cell': '[&_em]:[font-style:italic] [&_strong]:[font-weight:600]',
	'dashboard-dataview-task-checkbox': 'm-[0] [flex-shrink:0] [transform:translateY(1px)]',
	'dashboard-dataview-task-text': '[font-size:var(--hu-text-xs)] [color:var(--hu-fg,_var(--hu-fg))]',
	'dashboard-dataview-calendar': 'p-[4px_2px]',
	'dashboard-dataview-calendar-header':
		'flex [align-items:center] [justify-content:space-between] [margin-bottom:8px]',
	'dashboard-dataview-calendar-nav':
		'[background:transparent] [border:none] [color:var(--hu-fg-2,_var(--hu-fg-2))] [cursor:pointer] p-[4px] flex [align-items:center] [&:hover]:[color:var(--board-accent,_var(--hu-accent))]',
	'dashboard-dataview-calendar-title':
		'[font-size:var(--hu-text-xs)] [font-weight:600] [color:var(--hu-fg,_var(--hu-fg))]',
	'dashboard-dataview-calendar-weekdays': 'grid [grid-template-columns:repeat(7,_1fr)] gap-[2px] [margin-bottom:4px]',
	'dashboard-dataview-calendar-wd':
		'[text-align:center] [font-size:var(--hu-text-xs)] [font-weight:600] [color:var(--hu-fg-2,_var(--hu-fg-2))] [text-transform:uppercase]',
	'dashboard-dataview-calendar-cells': 'grid [grid-template-columns:repeat(7,_1fr)] gap-[2px]',
	'dashboard-dataview-calendar-cell':
		'min-h-[36px] p-[3px_4px] rounded-[var(--board-radius-sm,_6px)] [border:1px_solid_var(--hu-line,_var(--board-p1-color-22))] flex [flex-direction:column] [align-items:flex-start] [justify-content:flex-start] gap-[2px] [&.is-blank]:[border-color:transparent] [&.has-dots]:[cursor:pointer] [&.has-dots]:[background:var(--board-bg-card,_var(--board-p1-color-22))] [&.has-dots:hover]:[background:var(--board-bg-card-hover,_var(--board-p1-color-5))] [&.has-dots_.dashboard-dataview-calendar-day]:[color:var(--hu-fg,_var(--hu-fg))] [&.has-dots_.dashboard-dataview-calendar-day]:[font-weight:600]',
	'dashboard-dataview-calendar-day': '[font-size:var(--hu-text-xs)] [color:var(--hu-fg-2,_var(--hu-fg-2))]',
	'dashboard-dataview-calendar-dots': 'flex [align-items:center] gap-[2px]',
	'dashboard-dataview-calendar-dot':
		'w-[5px] h-[5px] rounded-[50%] [background:var(--board-accent,_var(--hu-accent))]',
	'dashboard-dataview-calendar-more': '[font-size:var(--hu-text-xs)] [color:var(--hu-fg-2,_var(--hu-fg-2))]',
	'dashboard-skillsec-content': 'flex [flex-direction:column] gap-[8px] min-h-[0] [flex:1] [overflow:hidden]',
	'dashboard-skillsec-results': 'flex [flex-direction:column] gap-[8px] min-h-[0] [flex:1] [overflow:hidden]',
	'dashboard-skillsec-stats': '[font-size:var(--hu-text-xs)] [color:var(--board-text-faint)] m-[0_2px]',
	'dashboard-skillsec-grid':
		'grid [grid-template-columns:repeat(auto-fill,_minmax(248px,_1fr))] gap-[8px] [align-content:start] [grid-auto-rows:min-content] [overflow-y:auto] min-h-[0] [flex:1] [padding-right:2px] [scrollbar-width:thin] [scrollbar-color:transparent_transparent] [&:hover]:[scrollbar-color:color-mix(in_srgb,_var(--board-accent,_var(--hu-accent))_18%,_transparent)_transparent]',
	'dashboard-skillsec-groups':
		'flex [flex-direction:column] gap-[12px] [overflow-y:auto] min-h-[0] [flex:1] [padding-right:2px] [scrollbar-width:thin] [scrollbar-color:transparent_transparent] [&:hover]:[scrollbar-color:color-mix(in_srgb,_var(--board-accent,_var(--hu-accent))_18%,_transparent)_transparent]',
	'dashboard-skillsec-group-grid': '[overflow:visible] [flex:none]',
	'dashboard-skillsec-group':
		'[&.is-collapsed_.dashboard-skillsec-group-grid]:hidden [&.is-collapsed_.dashboard-skillsec-group-chevron]:[transform:rotate(-90deg)]',
	'dashboard-skillsec-group-head':
		'flex [align-items:center] gap-[6px] p-[5px_8px] rounded-[var(--board-radius-sm,_6px)] [background:var(--hu-hover,_var(--board-p1-color-43))] [cursor:pointer] [user-select:none] [position:sticky] [top:0] [z-index:var(--layer-content)] [&:hover]:[background:color-mix(in_srgb,_var(--board-accent,_var(--hu-accent))_14%,_var(--hu-hover,_var(--board-p1-color-43)))]',
	'dashboard-skillsec-group-chevron':
		'inline-flex [color:var(--hu-fg-2,_var(--hu-fg-2))] motion-safe:[transition:transform_0.15s_ease] [&_svg]:w-[13px] [&_svg]:h-[13px]',
	'dashboard-skillsec-group-name': '[font-size:12px] [font-weight:700] [color:var(--hu-fg,_var(--hu-fg))]',
	'dashboard-skillsec-group-count':
		'[font-size:10.5px] [color:var(--hu-fg-2,_var(--hu-fg-2))] [background:var(--board-bg-card,_var(--board-p1-color-55))] rounded-[9px] p-[1px_7px]',
	'dashboard-skillsec-kanban':
		'grid [grid-template-columns:repeat(auto-fill,_minmax(14rem,_1fr))] gap-[12px] [overflow-y:auto] [flex:1] min-h-[0] min-w-[0] [align-content:start] [align-items:start] [scrollbar-width:thin] [scrollbar-color:transparent_transparent] [&:hover]:[scrollbar-color:color-mix(in_srgb,_var(--board-accent,_var(--hu-accent))_18%,_transparent)_transparent]',
	'dashboard-skillsec-kcol':
		'min-w-[0] w-[100%] flex [flex-direction:column] gap-[8px] min-h-[0] [&.is-collapsed_.dashboard-skillsec-kcol-list]:hidden [&_>_.dashboard-skillsec-group-head]:m-[0_2px_2px_2px] [&.is-drop-target]:[background:color-mix(in_srgb,_var(--board-accent,_var(--hu-accent))_9%,_transparent)] [&.is-drop-target]:[outline:1.5px_dashed_var(--board-accent,_var(--hu-accent))] [&.is-drop-target]:[outline-offset:-3px] [&.is-drop-target]:rounded-[var(--board-radius-md,_10px)]',
	'dashboard-skillsec-kcol-list':
		'flex [flex-direction:column] gap-[8px] [overflow-y:auto] min-h-[0] [flex:1] p-[2px] [scrollbar-width:thin] [scrollbar-color:transparent_transparent] [&_.dashboard-skillsec-card]:[flex:none]',
	'dashboard-skillsec-card':
		'[&.is-dragging]:[opacity:0.45] [position:relative] flex [flex-direction:column] gap-[6px] p-[10px_10px_8px] rounded-[var(--board-radius-md)] [background:var(--board-bg-card)] [border:1px_solid_var(--hu-line)] [cursor:pointer] [overflow:hidden] [&:hover]:[background:var(--board-bg-card-hover)] [&:hover]:[border-color:color-mix(in_srgb,_var(--board-accent,_var(--hu-accent))_32%,_var(--hu-line))] [&_>_*]:[flex-shrink:0] [&.is-pinned]:[border-color:color-mix(in_srgb,_var(--board-accent,_var(--hu-accent))_45%,_var(--hu-line))] [&_.dashboard-skillsec-badges]:[align-self:flex-start] [&:hover_.dashboard-skillsec-menu]:[opacity:1]',
	'dashboard-skillsec-card-top': 'flex [flex-direction:column] gap-[4px] [padding-right:22px]',
	'dashboard-skillsec-name-row': 'flex [align-items:center] gap-[5px] min-w-[0]',
	'dashboard-skillsec-pin':
		'inline-flex [color:var(--board-accent,_var(--hu-accent))] [flex-shrink:0] [&_svg]:w-[12px] [&_svg]:h-[12px]',
	'dashboard-skillsec-name':
		'[font-size:13px] [font-weight:600] [color:var(--hu-fg,_var(--hu-fg))] [overflow:hidden] [text-overflow:ellipsis] whitespace-nowrap',
	'dashboard-skillsec-date':
		'[margin-left:auto] [flex-shrink:0] [font-size:var(--hu-text-xs)] [color:var(--hu-fg-2,_var(--hu-fg-2))] [font-variant-numeric:tabular-nums]',
	'dashboard-skillsec-badges': 'flex [align-items:center] gap-[4px] [flex-shrink:0]',
	'dashboard-skillsec-badge':
		'inline-flex [align-items:center] [justify-content:center] min-w-[16px] h-[16px] p-[0_3px] rounded-[4px] [font-size:var(--hu-text-xs)] [font-weight:700] [line-height:1] [letter-spacing:0.02em] [&.is-claude]:[color:var(--hu-danger)] [&.is-claude]:[background:var(--board-p1-color-57)] [&.is-codex]:[color:var(--hu-info)] [&.is-codex]:[background:var(--board-p1-color-59)] [&.is-workbuddy]:[color:var(--hu-success)] [&.is-workbuddy]:[background:var(--board-p1-color-61)] [&.is-custom]:[color:var(--board-text-faint)] [&.is-custom]:[background:var(--hu-hover,_var(--board-p1-color-62))]',
	'dashboard-skillsec-desc':
		'[font-size:11.5px] [line-height:1.45] [color:var(--hu-fg-2,_var(--hu-fg-2))] [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] [overflow:hidden]',
	'dashboard-skillsec-actions': 'flex gap-[4px] [flex-wrap:wrap] [margin-top:2px]',
	'dashboard-skillsec-launch':
		'inline-flex [align-items:center] gap-[3px] p-[2px_5px] rounded-[var(--board-radius-sm,_6px)] [border:1px_solid_var(--hu-line)] [background:var(--hu-hover,_var(--board-p1-color-43))] [color:var(--hu-fg,_var(--hu-fg))] [font-size:var(--hu-text-xs)] [cursor:pointer] whitespace-nowrap [&:hover]:[border-color:var(--board-accent,_var(--hu-accent))] [&:hover]:[color:var(--hu-fg,_var(--hu-fg))] [&:hover]:[background:color-mix(in_srgb,_var(--board-accent,_var(--hu-accent))_10%,_var(--hu-hover,_var(--board-p1-color-43)))] [&:active]:[border-color:var(--board-accent,_var(--hu-accent))] [&:active]:[color:var(--hu-fg,_var(--hu-fg))] [&:active]:[background:color-mix(in_srgb,_var(--board-accent,_var(--hu-accent))_10%,_var(--hu-hover,_var(--board-p1-color-43)))] [&:focus-visible]:[border-color:var(--board-accent,_var(--hu-accent))] [&:focus-visible]:[color:var(--hu-fg,_var(--hu-fg))] [&:focus-visible]:[background:color-mix(in_srgb,_var(--board-accent,_var(--hu-accent))_10%,_var(--hu-hover,_var(--board-p1-color-43)))] [&:focus-visible]:[box-shadow:0_0_0_2px_color-mix(in_srgb,_var(--board-accent,_var(--hu-accent))_35%,_transparent)] [&_svg]:w-[11px] [&_svg]:h-[11px] [&_svg]:[flex-shrink:0]',
	'dashboard-skillsec-menu':
		'[position:absolute] [top:6px] [right:6px] inline-flex [align-items:center] [justify-content:center] w-[22px] h-[22px] p-[0] [border:none] rounded-[var(--board-radius-sm,_6px)] [background:transparent] [color:var(--hu-fg-2,_var(--hu-fg-2))] [cursor:pointer] [opacity:0.55] [&:hover]:[color:var(--board-accent,_var(--hu-accent))] [&:hover]:[background:var(--hu-hover)] [&_svg]:w-[14px] [&_svg]:h-[14px]',
	'dashboard-skillsec-detail-header': '[align-items:center]',
	'dashboard-skillsec-detail':
		'[&_.dashboard-modal-body]:max-h-[72vh] [&_.dashboard-modal-body]:[overflow-y:auto] [&_.dashboard-skillsec-detail-doc]:max-h-[52vh]',
	'dashboard-skillsec-detail-title-row': 'flex [align-items:center] gap-[10px] min-w-[0]',
	'dashboard-skillsec-detail-pin':
		'inline-flex [align-items:center] [justify-content:center] w-[26px] h-[26px] p-[0] [border:none] rounded-[var(--board-radius-sm,_6px)] [background:var(--hu-hover,_var(--board-p1-color-43))] [color:var(--hu-fg-2,_var(--hu-fg-2))] [cursor:pointer] [&:hover]:[color:var(--board-accent,_var(--hu-accent))] [&:hover]:[background:var(--hu-hover)] [&.is-pinned]:[color:var(--board-accent,_var(--hu-accent))] [&.is-pinned]:[background:var(--hu-hover)] [&_svg]:w-[14px] [&_svg]:h-[14px]',
	'dashboard-skillsec-detail-desc':
		'[font-size:12px] [line-height:1.5] [color:var(--hu-fg-2,_var(--hu-fg-2))] [margin-bottom:10px]',
	'dashboard-skillsec-instance':
		'flex [align-items:center] gap-[8px] p-[7px_8px] rounded-[var(--board-radius-sm,_6px)] [border:1px_solid_var(--hu-line)] [margin-bottom:6px]',
	'dashboard-skillsec-instance-main': '[flex:1] min-w-[0] flex [flex-direction:column] gap-[2px]',
	'dashboard-skillsec-instance-path':
		'[font-size:var(--hu-text-xs)] [color:var(--hu-fg,_var(--hu-fg))] [overflow:hidden] [text-overflow:ellipsis] whitespace-nowrap',
	'dashboard-skillsec-instance-date': '[font-size:var(--hu-text-xs)] [color:var(--board-text-faint)]',
	'dashboard-skillsec-instance-actions': 'flex gap-[4px] [flex-shrink:0]',
	'dashboard-skillsec-instance-btn':
		'inline-flex [align-items:center] [justify-content:center] w-[24px] h-[24px] p-[0] [border:none] rounded-[var(--board-radius-sm,_6px)] [background:var(--hu-hover,_var(--board-p1-color-43))] [color:var(--hu-fg-2,_var(--hu-fg-2))] [cursor:pointer] [&:hover]:[color:var(--board-accent,_var(--hu-accent))] [&:hover]:[background:var(--hu-hover)] [&_svg]:w-[13px] [&_svg]:h-[13px]',
	'dashboard-skillsec-detail-doc':
		'max-h-[320px] [overflow-y:auto] p-[10px_12px] rounded-[var(--board-radius-sm,_6px)] [border:1px_solid_var(--hu-line)] [background:var(--hu-sunken,_var(--board-p1-color-64))] [font-size:12.5px] [line-height:1.55]',
	'dashboard-pipeline': '[flex:1_1_100%] flex [flex-wrap:nowrap] [overflow:hidden]',
	'dashboard-pipeline-board':
		'grid [grid-template-columns:repeat(auto-fill,_minmax(14rem,_1fr))] content-start items-start gap-[12px] min-h-[0] min-w-[0] [flex:1] [overflow-y:auto]',
	'dashboard-pipeline-col':
		'min-w-[0] w-[100%] flex [flex-direction:column] [background:color-mix(in_srgb,_var(--board-pipe-accent,_var(--hu-info))_5%,_transparent)] [border:1px_solid_color-mix(in_srgb,_var(--board-pipe-accent,_var(--hu-info))_13%,_transparent)] rounded-[12px] p-[8px] [position:relative]',
	'dashboard-pipeline-col-head':
		'flex [align-items:center] gap-[6px] [margin-bottom:8px] p-[2px_4px] [flex-shrink:0]',
	'dashboard-pipeline-col-dot':
		'w-[8px] h-[8px] rounded-[50%] [flex-shrink:0] [background:var(--board-pipe-accent,_var(--board-accent,_var(--hu-info)))]',
	'dashboard-pipeline-col-title':
		'[font-size:var(--hu-text-xs)] [font-weight:700] [color:var(--hu-fg,_var(--hu-fg))] whitespace-nowrap [overflow:hidden] [text-overflow:ellipsis] [flex:0_1_auto] min-w-[0]',
	'dashboard-pipeline-col-spacer': '[flex:1]',
	'dashboard-pipeline-col-count':
		'[font-size:var(--hu-text-xs)] [font-weight:600] [color:var(--hu-fg-2,_var(--hu-fg-2))] [background:color-mix(in_srgb,_var(--hu-fg-2,_var(--hu-fg-2))_14%,_transparent)] rounded-[999px] p-[0_7px] [line-height:16px] [font-variant-numeric:tabular-nums] [flex-shrink:0]',
	'dashboard-pipeline-col-actions': 'flex [align-items:center] gap-[2px] [flex-shrink:0]',
	'dashboard-pipeline-skill-btn':
		'inline-flex [align-items:center] [justify-content:center] w-[22px] h-[22px] p-[0] [border:none] rounded-[4px] [background:transparent] [color:var(--hu-fg-2,_var(--hu-fg-2))] [cursor:pointer] [flex-shrink:0] [&:hover]:[background:color-mix(in_srgb,_var(--board-pipe-accent,_var(--board-accent,_var(--hu-info)))_18%,_transparent)] [&:hover]:[color:var(--hu-fg,_var(--hu-fg))] [&_svg]:w-[13px] [&_svg]:h-[13px] [&.dashboard-pipeline-skill-btn--colored]:[color:var(--hu-fg-2)] [&.dashboard-pipeline-skill-btn--colored]:rounded-[6px]',
	'dashboard-pipeline-col-add':
		'inline-flex [align-items:center] [justify-content:center] w-[22px] h-[22px] p-[0] [border:none] rounded-[4px] [background:transparent] [color:var(--hu-fg-2,_var(--hu-fg-2))] [cursor:pointer] [flex-shrink:0] [&:hover]:[background:color-mix(in_srgb,_var(--board-pipe-accent,_var(--board-accent,_var(--hu-info)))_18%,_transparent)] [&:hover]:[color:var(--hu-fg,_var(--hu-fg))] [&_svg]:w-[13px] [&_svg]:h-[13px]',
	'dashboard-pipeline-cards':
		'flex [flex-direction:column] gap-[8px] [overflow-y:auto] min-h-[48px] [flex:1] [scrollbar-width:none] [&::-webkit-scrollbar]:w-[0] [&::-webkit-scrollbar]:h-[0] [&::-webkit-scrollbar]:hidden',
	'dashboard-pipeline-card':
		'[position:relative] [--pipe-card-lift:color-mix(in_srgb,_var(--hu-sunken,_var(--hu-raised,_var(--board-bg-card,_var(--primary-foreground))))_88%,_var(--hu-raised))] [background:var(--pipe-card-lift)] [border:none] rounded-[8px] p-[8px_10px_8px] [cursor:pointer] [box-shadow:0_1px_2px_var(--board-p1-color-66),_0_0_1px_var(--board-p1-color-67)] [&:hover]:[box-shadow:0_3px_8px_var(--board-p1-color-68),_0_0_1px_var(--board-p1-color-69)] [&_.dashboard-pipeline-archive-btn]:[right:28px] [&_.dashboard-pipeline-archive-btn]:[background:transparent] [&_.dashboard-pipeline-archive-btn]:[color:var(--hu-fg-2,_var(--hu-fg-2))] [&_.dashboard-pipeline-archive-btn]:rounded-[5px] [&_.dashboard-pipeline-archive-btn:hover]:[background:color-mix(in_srgb,_var(--board-pipe-accent,_var(--hu-info))_16%,_transparent)] [&_.dashboard-pipeline-archive-btn:hover]:[color:var(--hu-fg,_var(--hu-fg))] [&:hover_.dashboard-library-card-delete]:[opacity:1] [&:hover_.dashboard-library-card-delete]:[pointer-events:auto] [&_.dashboard-library-card-delete:focus-visible]:[opacity:1] [&_.dashboard-library-card-delete:focus-visible]:[pointer-events:auto]',
	'dashboard-pipeline-card-title':
		'[font-size:var(--hu-text-xs)] [font-weight:500] [color:var(--hu-fg,_var(--hu-fg))] [overflow:hidden] [text-overflow:ellipsis] whitespace-nowrap [padding-right:14px]',
	'dashboard-pipeline-cfg-icon-btn':
		'inline-flex [align-items:center] [justify-content:center] w-[24px] h-[24px] p-[0] [border:none] rounded-[4px] [background:transparent] [color:var(--hu-fg-2,_var(--hu-fg-2))] [cursor:pointer] [flex-shrink:0] [&:hover]:[background:color-mix(in_srgb,_var(--board-accent,_var(--hu-info))_18%,_transparent)] [&:hover]:[color:var(--hu-fg,_var(--hu-fg))] [&_svg]:w-[14px] [&_svg]:h-[14px]',
	'dashboard-pipeline-cfg-icon-btn--danger':
		'[&:hover]:[background:color-mix(in_srgb,_var(--hu-danger,_var(--hu-danger))_20%,_transparent)] [&:hover]:[color:var(--hu-danger,_var(--hu-danger))]',
	'dashboard-pipeline--trello':
		'[--tl-col-base:var(--hu-sunken)] [--tl-card:var(--hu-surface)] [--tl-ink:var(--hu-fg)] [--tl-muted:var(--hu-fg-2)]  [--tl-chip-bg:var(--board-p1-color-73)] [.theme-dark_&]:[--tl-col-base:var(--hu-sunken)] [.theme-dark_&]:[--tl-card:var(--hu-surface)] [.theme-dark_&]:[--tl-ink:var(--hu-fg)] [.theme-dark_&]:[--tl-muted:var(--hu-fg-2)]  [.theme-dark_&]:[--tl-chip-bg:var(--board-p1-color-78)] [&_.dashboard-pipeline-col]:[background:color-mix(in_srgb,_var(--board-pipe-accent,_var(--hu-info))_10%,_var(--tl-col-base))] [&_.dashboard-pipeline-col]:[border:none] [&_.dashboard-pipeline-col--drag-over]:[box-shadow:0_0_0_2px_color-mix(in_srgb,_var(--board-pipe-accent,_var(--hu-info))_75%,_transparent)] [&_.dashboard-pipeline-col-title]:[color:var(--tl-ink)] [&_.dashboard-pipeline-col-count]:[color:var(--tl-muted)] [&_.dashboard-pipeline-col-count]:[background:var(--tl-chip-bg)] [&_.dashboard-pipeline-card]:[background:var(--tl-card)] [&_.dashboard-pipeline-card]:[box-shadow:0_1px_2px_color-mix(in_srgb,_var(--hu-fg)_18%,_transparent),_0_0_1px_color-mix(in_srgb,_var(--hu-fg)_14%,_transparent)] [&_.dashboard-pipeline-card:hover]:[background:var(--tl-card)] [&_.dashboard-pipeline-card:hover]:[box-shadow:0_4px_9px_color-mix(in_srgb,_var(--hu-fg)_24%,_transparent),_0_0_1px_color-mix(in_srgb,_var(--hu-fg)_16%,_transparent)] [&_.dashboard-pipeline-card-title]:[color:var(--tl-ink)] [&_.dashboard-pipeline-chip]:[color:var(--tl-muted)] [&_.dashboard-pipeline-chip]:[background:var(--tl-chip-bg)] [&_.dashboard-pipeline-chip--prop]:[color:var(--hu-raised)] [&_button.dashboard-pipeline-skill-btn]:[color:var(--tl-muted)] [&_button.dashboard-pipeline-col-add]:[color:var(--tl-muted)] [&_button.dashboard-pipeline-skill-btn:hover]:[background:color-mix(in_srgb,_var(--hu-fg)_8%,_transparent)] [&_button.dashboard-pipeline-skill-btn:hover]:[color:var(--tl-ink)] [&_button.dashboard-pipeline-col-add:hover]:[background:color-mix(in_srgb,_var(--hu-fg)_8%,_transparent)] [&_button.dashboard-pipeline-col-add:hover]:[color:var(--tl-ink)] [&_button.dashboard-pipeline-foot-btn]:[color:var(--tl-muted)] [&_button.dashboard-pipeline-foot-btn:hover]:[background:transparent] [&_button.dashboard-pipeline-foot-btn:hover]:[color:var(--tl-ink)] [&_button.dashboard-pipeline-foot-btn.is-set]:[color:color-mix(in_srgb,_var(--board-pipe-accent,_var(--hu-info))_55%,_var(--tl-ink))] [&_.dashboard-pipeline-task]:[color:var(--tl-ink)] [&_.dashboard-pipeline-tasks]:[background:color-mix(in_srgb,_var(--hu-fg)_5%,_transparent)] [&_.dashboard-pipeline-card-title-input]:[color:var(--tl-ink)] [&_.dashboard-pipeline-card-title-input]:[border-color:color-mix(in_srgb,_var(--board-pipe-accent,_var(--hu-info))_60%,_transparent)] [&_.dashboard-pipeline-rail]:[background:var(--hu-sunken)] [&_.dashboard-pipeline-rail]:[border:none] [.theme-dark_&]:[&_.dashboard-pipeline-rail]:[background:var(--hu-sunken)] [&_button.dashboard-pipeline-rail-item]:[color:var(--tl-ink)] [&_.dashboard-pipeline-rail-count]:[color:var(--tl-muted)] [&_button.dashboard-pipeline-rail-dim]:[color:var(--tl-muted)] [&_button.dashboard-pipeline-rail-item.is-all]:[color:var(--tl-muted)] [&_button.dashboard-pipeline-rail-item.is-all.is-active]:[color:var(--tl-ink)] [&_.dashboard-pipeline-card_.dashboard-pipeline-archive-btn]:[color:var(--tl-muted)] [&_.dashboard-pipeline-card_.dashboard-pipeline-archive-btn:hover]:[background:color-mix(in_srgb,_var(--hu-fg)_8%,_transparent)] [&_.dashboard-pipeline-card_.dashboard-pipeline-archive-btn:hover]:[color:var(--tl-ink)] [&_button.dashboard-pipeline-rail-dim.is-active]:[background:color-mix(in_srgb,_var(--hu-fg)_10%,_transparent)] [&_button.dashboard-pipeline-rail-dim.is-active]:[color:var(--tl-ink)] [&_button.dashboard-pipeline-rail-item:hover]:[background:color-mix(in_srgb,_var(--hu-fg)_8%,_transparent)]',
	'dashboard-pipeline-card-foot': 'flex [align-items:center] gap-[4px] [margin-top:7px] [flex-wrap:wrap]',
	'dashboard-pipeline-foot-spacer': '[flex:1]',
	'dashboard-pipeline-foot-btn':
		'inline-flex [align-items:center] gap-[4px] h-[20px] p-[0] [background:transparent] [border:none] [box-shadow:none] [color:var(--hu-fg-2,_var(--hu-fg-2))] [font-size:var(--hu-text-xs)] [font-weight:500] [font-variant-numeric:tabular-nums] [cursor:pointer] whitespace-nowrap [&_svg]:w-[12px] [&_svg]:h-[12px] [&_svg]:[flex-shrink:0] [&:hover]:[background:transparent] [&:hover]:[color:var(--hu-fg,_var(--hu-fg))] [&.is-set]:[color:color-mix(in_srgb,_var(--board-pipe-accent,_var(--hu-info))_55%,_var(--hu-fg,_var(--hu-fg)))]',
	'dashboard-pipeline-tasks':
		'flex [flex-direction:column] gap-[3px] [margin-top:7px] p-[7px_8px] rounded-[6px] [background:color-mix(in_srgb,_var(--hu-fg-2,_var(--hu-fg-2))_8%,_transparent)] max-h-[180px] [overflow-y:auto]',
	'dashboard-pipeline-wrap': '[flex:1_1_100%] flex gap-[10px] min-w-[0] min-h-[0] [overflow:hidden]',
	'dashboard-pipeline-rail':
		'flex [flex-direction:column] gap-[3px] [flex:0_0_128px] w-[128px] [overflow-y:auto] [overflow-x:hidden] [scrollbar-width:none] p-[6px] rounded-[10px] [background:color-mix(in_srgb,_var(--hu-fg-2,_var(--hu-fg-2))_10%,_transparent)] [border:1px_solid_color-mix(in_srgb,_var(--hu-fg-2,_var(--hu-fg-2))_16%,_transparent)] [&::-webkit-scrollbar]:w-[0] [&::-webkit-scrollbar]:h-[0] [&::-webkit-scrollbar]:hidden max-[642px]:[flex:0_0_auto] max-[642px]:w-[100%] max-[642px]:[flex-direction:row] max-[642px]:[align-items:center] max-[642px]:[flex-wrap:nowrap] max-[642px]:[overflow-x:auto] max-[642px]:[overflow-y:hidden] max-[642px]:p-[5px]',
	'dashboard-pipeline-rail-dims':
		'flex gap-[3px] [margin-bottom:4px] [flex-shrink:0] max-[642px]:[margin-bottom:0] max-[642px]:[margin-right:3px] max-[642px]:[flex-shrink:0]',
	'dashboard-pipeline-rail-dim':
		'[flex:1] h-[22px] p-[0] [border:none] rounded-[6px] [background:transparent] [color:var(--hu-fg-2,_var(--hu-fg-2))] [font-size:var(--hu-text-xs)] [font-weight:600] [cursor:pointer] [&.is-active]:[background:color-mix(in_srgb,_var(--hu-fg-2,_var(--hu-fg-2))_18%,_transparent)] [&.is-active]:[color:var(--hu-fg,_var(--hu-fg))] max-[642px]:[flex:0_0_auto] max-[642px]:whitespace-nowrap',
	'dashboard-pipeline-rail-item':
		'flex [align-items:center] gap-[5px] min-h-[24px] p-[2px_7px] [border:none] rounded-[6px] [background:transparent] [color:var(--hu-fg,_var(--hu-fg))] [font-size:var(--hu-text-xs)] [cursor:pointer] [text-align:left] [&_.dashboard-pipeline-rail-label]:[flex:1] [&_.dashboard-pipeline-rail-label]:min-w-[0] [&_.dashboard-pipeline-rail-label]:[overflow:hidden] [&_.dashboard-pipeline-rail-label]:[text-overflow:ellipsis] [&_.dashboard-pipeline-rail-label]:whitespace-nowrap [&:hover]:[background:color-mix(in_srgb,_var(--hu-fg-2,_var(--hu-fg-2))_14%,_transparent)] [&.is-active]:[background:color-mix(in_srgb,_var(--hu-fg-2,_var(--hu-fg-2))_16%,_transparent)] [&.is-all]:[color:var(--hu-fg-2,_var(--hu-fg-2))] [&.is-all]:[font-weight:600] [&.is-all]:[margin-bottom:2px] [&.is-all.is-active]:[color:var(--hu-fg,_var(--hu-fg))] [&.is-all.is-active]:[box-shadow:none] max-[642px]:[flex:0_0_auto] max-[642px]:whitespace-nowrap max-[642px]:[&.is-active]:[box-shadow:inset_0_-2px_0_var(--board-pipe-accent,_var(--board-accent,_var(--hu-info)))]',
	'dashboard-pipeline-rail-count':
		'[flex-shrink:0] [color:var(--hu-fg-2,_var(--hu-fg-2))] [font-variant-numeric:tabular-nums] [font-size:var(--hu-text-sm)]',
	'dashboard-pipeline-rail-value':
		'[color:var(--rail-ink,_var(--hu-raised))] [font-weight:600] rounded-[7px] [&_.dashboard-pipeline-rail-count]:[color:color-mix(in_srgb,_var(--rail-ink,_var(--hu-raised))_75%,_transparent)] [&:hover]:[background:inherit] [&:hover]:[filter:brightness(1.06)] [&.is-active]:[box-shadow:inset_0_0_0_2px_color-mix(in_srgb,_var(--rail-ink,_var(--hu-raised))_70%,_transparent)]',
	'dashboard-pipeline--solid':
		'[--sd-col:var(--board-p1-color-82)] [--sd-card:var(--hu-surface)] [--sd-ink:var(--hu-fg)] [--sd-muted:var(--hu-fg-2)] [--sd-accent:var(--board-p1-color-85)] [--sd-accent-ink:var(--hu-fg)]  [--sd-card-ink:var(--hu-fg)] [--sd-card-muted:var(--hu-fg-2)] [.theme-dark_&]:[--sd-col:var(--board-p1-color-86)] [.theme-dark_&]:[--sd-ink:var(--hu-fg)] [.theme-dark_&]:[--sd-muted:var(--hu-fg-2)] [.theme-dark_&]:[--sd-accent:var(--board-p1-color-89)] [.theme-dark_&]:[--sd-accent-ink:var(--hu-raised)] [.theme-dark_&]: [&_.dashboard-pipeline-col]:[background:var(--sd-col)] [&_.dashboard-pipeline-col]:[border:none] [&_.dashboard-pipeline-col--drag-over]:[box-shadow:0_0_0_2px_var(--hu-success)] [&_.dashboard-pipeline-col-title]:[color:var(--sd-ink)] [&_.dashboard-pipeline-col-count]:[color:var(--sd-muted)] [&_.dashboard-pipeline-col-count]:[background:color-mix(in_srgb,_var(--hu-fg)_10%,_transparent)] [&_.dashboard-pipeline-card]:[background:var(--sd-card)] [&_.dashboard-pipeline-card]:[box-shadow:0_1px_2px_color-mix(in_srgb,_var(--hu-fg)_18%,_transparent),_0_0_1px_color-mix(in_srgb,_var(--hu-fg)_14%,_transparent)] [&_.dashboard-pipeline-card:hover]:[box-shadow:0_4px_9px_color-mix(in_srgb,_var(--hu-fg)_24%,_transparent),_0_0_1px_color-mix(in_srgb,_var(--hu-fg)_16%,_transparent)] [&_.dashboard-pipeline-card-title]:[color:var(--sd-card-ink)] [&_.dashboard-pipeline-chip--prop]:[background:var(--sd-grad)] [&_.dashboard-pipeline-chip--prop]:[color:var(--hu-raised)] [&_button.dashboard-pipeline-skill-btn--colored]:[background:var(--sd-grad)] [&_button.dashboard-pipeline-skill-btn--colored]:[color:var(--hu-raised)] [&_button.dashboard-pipeline-rail-value]:[background:var(--sd-grad)] [&_button.dashboard-pipeline-rail-value]:[color:var(--hu-raised)] [&_button.dashboard-pipeline-rail-value_.dashboard-pipeline-rail-count]:[color:var(--board-p1-color-51)] [&_.dashboard-pipeline-card_button.dashboard-pipeline-foot-btn]:[color:var(--sd-card-muted)] [&_.dashboard-pipeline-card_button.dashboard-pipeline-skill-btn:not(.dashboard-pipeline-skill-btn--colored)]:[color:var(--sd-card-muted)] [&_.dashboard-pipeline-card_.dashboard-pipeline-archive-btn]:[color:var(--sd-card-muted)] [&_button.dashboard-pipeline-col-add]:[color:var(--sd-muted)] [&_button.dashboard-pipeline-rail-dim]:[color:var(--sd-muted)] [&_button.dashboard-pipeline-rail-item.is-all]:[color:var(--sd-muted)] [&_.dashboard-pipeline-chip]:[color:var(--sd-card-muted)] [&_.dashboard-pipeline-chip]:[background:color-mix(in_srgb,_var(--hu-fg)_8%,_transparent)] [&_.dashboard-pipeline-tasks]:[background:color-mix(in_srgb,_var(--hu-fg)_5%,_transparent)] [&_.dashboard-pipeline-task]:[color:var(--sd-card-ink)] [&_.dashboard-pipeline-rail]:[background:var(--sd-col)] [&_.dashboard-pipeline-rail]:[border:none] [&_button.dashboard-pipeline-rail-dim.is-active]:[background:color-mix(in_srgb,_var(--hu-fg)_12%,_transparent)] [&_button.dashboard-pipeline-rail-dim.is-active]:[color:var(--sd-ink)] [&_button.dashboard-pipeline-rail-item:hover]:[background:color-mix(in_srgb,_var(--hu-fg)_10%,_transparent)]',
	'dashboard-pipeline--blush':
		'[--bl-col:var(--board-p1-color-91)] [--bl-card:var(--hu-surface)] [--bl-ink:var(--hu-fg)] [--bl-muted:color-mix(in_srgb,_var(--hu-fg)_68%,_var(--hu-surface))] [--bl-accent:var(--board-p1-color-94)] [--bl-accent-ink:var(--hu-fg)]  [&_.dashboard-pipeline-col]:[background:var(--bl-col)] [&_.dashboard-pipeline-col]:[border:none] [&_.dashboard-pipeline-col--drag-over]:[box-shadow:0_0_0_2px_var(--board-p1-color-95)] [&_.dashboard-pipeline-col-title]:[color:var(--bl-ink)] [&_.dashboard-pipeline-col-count]:[color:var(--bl-muted)] [&_.dashboard-pipeline-col-count]:[background:color-mix(in_srgb,_var(--hu-fg)_10%,_transparent)] [&_.dashboard-pipeline-card]:[background:var(--bl-card)] [&_.dashboard-pipeline-card]:[box-shadow:0_1px_2px_color-mix(in_srgb,_var(--hu-fg)_18%,_transparent),_0_0_1px_color-mix(in_srgb,_var(--hu-fg)_14%,_transparent)] [&_.dashboard-pipeline-card:hover]:[box-shadow:0_4px_9px_color-mix(in_srgb,_var(--hu-fg)_24%,_transparent),_0_0_1px_color-mix(in_srgb,_var(--hu-fg)_16%,_transparent)] [&_.dashboard-pipeline-card-title]:[color:var(--bl-ink)] [&_.dashboard-pipeline-chip]:[color:var(--bl-muted)] [&_.dashboard-pipeline-chip]:[background:color-mix(in_srgb,_var(--hu-fg)_8%,_transparent)] [&_.dashboard-pipeline-chip--prop]:[background:var(--bl-accent)] [&_.dashboard-pipeline-chip--prop]:[color:var(--bl-accent-ink)] [&_button.dashboard-pipeline-skill-btn--colored]:[background:var(--bl-accent)] [&_button.dashboard-pipeline-skill-btn--colored]:[color:var(--bl-accent-ink)] [&_button.dashboard-pipeline-rail-value]:[background:var(--bl-accent)] [&_button.dashboard-pipeline-rail-value]:[color:var(--bl-accent-ink)] [&_button.dashboard-pipeline-rail-value_.dashboard-pipeline-rail-count]:[color:color-mix(in_srgb,_var(--hu-fg)_75%,_transparent)] [&_.dashboard-pipeline-card_button.dashboard-pipeline-foot-btn]:[color:var(--bl-muted)] [&_.dashboard-pipeline-card_button.dashboard-pipeline-skill-btn:not(.dashboard-pipeline-skill-btn--colored)]:[color:var(--bl-muted)] [&_.dashboard-pipeline-card_.dashboard-pipeline-archive-btn]:[color:var(--bl-muted)] [&_button.dashboard-pipeline-col-add]:[color:var(--bl-muted)] [&_button.dashboard-pipeline-rail-dim]:[color:var(--bl-muted)] [&_button.dashboard-pipeline-rail-item.is-all]:[color:var(--bl-muted)] [&_.dashboard-pipeline-tasks]:[background:color-mix(in_srgb,_var(--hu-fg)_5%,_transparent)] [&_.dashboard-pipeline-task]:[color:var(--bl-ink)] [&_.dashboard-pipeline-rail]:[background:var(--bl-col)] [&_.dashboard-pipeline-rail]:[border:none] [&_button.dashboard-pipeline-rail-dim.is-active]:[background:color-mix(in_srgb,_var(--hu-fg)_12%,_transparent)] [&_button.dashboard-pipeline-rail-dim.is-active]:[color:var(--bl-ink)] [&_button.dashboard-pipeline-rail-item:hover]:[background:color-mix(in_srgb,_var(--hu-fg)_10%,_transparent)]',
	'dashboard-pmsec-list':
		'grid [grid-template-columns:repeat(auto-fill,_minmax(14rem,_1fr))] gap-[10px] [align-items:stretch] [flex:none] min-w-[0] [align-content:start] [scrollbar-width:thin] [scrollbar-color:color-mix(in_srgb,_var(--board-accent,_var(--hu-accent))_18%,_transparent)_transparent] [padding-right:2px]',
	'dashboard-pmsec-card':
		'[position:relative] min-w-[0] flex [flex-direction:column] p-[12px_14px] [border:1px_solid_var(--hu-line,_var(--board-p1-color-96))] rounded-[var(--board-radius-md,_10px)] [background:var(--board-bg-card,_var(--board-p1-color-22))] [cursor:default] motion-safe:[transition:transform_0.18s_ease] [&.is-dragging]:[opacity:0.45] [&.drop-above]:[box-shadow:0_-2px_0_0_var(--board-accent,_var(--hu-accent))] [&.drop-below]:[box-shadow:0_2px_0_0_var(--board-accent,_var(--hu-accent))] [&:hover]:[transform:translateY(-1.5px)] [&:hover]:[border-color:color-mix(in_srgb,_var(--board-accent,_var(--hu-accent))_38%,_var(--hu-line,_transparent))] [&:hover]:[box-shadow:0_6px_18px_color-mix(in_srgb,_var(--board-accent,_var(--hu-accent))_10%,_transparent)] [&:hover_.dashboard-pmsec-actions]:[opacity:1] [&:hover_.dashboard-pmsec-actions]:[pointer-events:auto] [&.is-pinned]:[border-color:color-mix(in_srgb,_var(--board-accent,_var(--hu-accent))_40%,_var(--hu-line,_var(--board-p1-color-96)))]',
	'dashboard-pmsec-title-row':
		'flex [align-items:center] min-w-[0] gap-[6px] [margin-bottom:6px] [margin-bottom:5px]',
	'dashboard-pmsec-title':
		'[text-align:left] [flex:1_1_auto] [font-weight:700] [font-size:var(--hu-text-base)] [letter-spacing:-0.01em] [color:var(--hu-fg,_var(--hu-fg))] [cursor:pointer] [overflow:hidden] [text-overflow:ellipsis] whitespace-nowrap min-w-[0]',
	'dashboard-pmsec-badge':
		'[flex-shrink:0] inline-flex [align-items:center] gap-[5px] [font-size:var(--hu-text-xs)] [font-weight:600] p-[2px_9px] rounded-[999px] [background:color-mix(in_srgb,_var(--pmsec-stage,_var(--board-accent,_var(--hu-info)))_16%,_transparent)] [border:1px_solid_color-mix(in_srgb,_var(--pmsec-stage,_var(--board-accent,_var(--hu-info)))_34%,_transparent)] [color:var(--hu-fg,_var(--hu-fg))] whitespace-nowrap',
	'dashboard-pmsec-badge-dot':
		'w-[6px] h-[6px] rounded-[50%] [background:var(--pmsec-stage,_var(--board-accent,_var(--hu-info)))] [flex-shrink:0]',
	'dashboard-pmsec-progress-row': 'flex [align-items:center] gap-[9px] m-[2px_0_9px] min-w-[0] gap-[10px]',
	'dashboard-pmsec-progress-pct':
		'[flex-shrink:0] [font-size:var(--hu-text-base)] [font-weight:800] [letter-spacing:-0.02em] [color:var(--board-accent,_var(--hu-accent))] [font-variant-numeric:tabular-nums] min-w-[2.6em] min-w-[2.4em]',
	'dashboard-pmsec-stepper': '[flex:1_1_auto] min-w-[0] flex [align-items:center] [overflow:hidden]',
	'dashboard-pmsec-step':
		"[flex:1_1_0] flex [align-items:center] min-w-[0] [&:last-child]:[flex:0_0_auto] [&:last-child::after]:hidden [&::before]:[content:''] [&::before]:w-[10px] [&::before]:h-[10px] [&::before]:rounded-[50%] [&::before]:[border:2.5px_solid_color-mix(in_srgb,_var(--board-text-faint,_var(--hu-fg-2))_45%,_transparent)] [&::before]:[background:var(--board-bg-card,_transparent)] [&::before]:[flex-shrink:0] [&::after]:[content:''] [&::after]:[flex:1_1_auto] [&::after]:h-[2.5px] [&::after]:rounded-[2px] [&::after]:m-[0_3px] [&::after]:[background:color-mix(in_srgb,_var(--board-text-faint,_var(--hu-fg-2))_22%,_transparent)] [&.is-done::before]:[background:var(--board-accent,_var(--hu-accent))] [&.is-done::before]:[border-color:var(--board-accent,_var(--hu-accent))] [&.is-done::after]:[background:color-mix(in_srgb,_var(--board-accent,_var(--hu-accent))_75%,_transparent)] [&:not(.is-done):hover::before]:[border-color:var(--board-accent,_var(--hu-accent))] [&:not(.is-done):hover::before]:[box-shadow:0_0_0_3px_color-mix(in_srgb,_var(--board-accent,_var(--hu-accent))_18%,_transparent)]",
	'dashboard-pmsec-progress-label':
		'[flex-shrink:0] [font-size:var(--hu-text-xs)] [color:var(--board-text-faint,_var(--hu-fg-3))] whitespace-nowrap',
	'dashboard-pmsec-intro':
		'[font-size:var(--hu-text-xs)] [line-height:1.5] [color:var(--hu-fg-2,_var(--hu-fg-2))] [margin-bottom:9px] [display:-webkit-box] [-webkit-line-clamp:2] min-h-[calc(2_*_1.5em)] [-webkit-box-orient:vertical] [overflow:hidden]',
	'dashboard-pmsec-fields':
		'grid [grid-template-columns:16px_auto_minmax(0,_1fr)] [column-gap:7px] [row-gap:5px] [align-items:baseline] [align-content:space-between] [flex:1_1_auto] p-[8px_0_2px] [border-top:1px_dashed_color-mix(in_srgb,_var(--board-text-faint,_var(--hu-fg-2))_35%,_transparent)]',
	'dashboard-pmsec-field':
		'[display:contents] [&_.dashboard-pmsec-remind_svg]:w-[12px] [&_.dashboard-pmsec-remind_svg]:h-[12px] [&_.dashboard-pmsec-remind_svg]:[vertical-align:-1px]',
	'dashboard-pmsec-field-icon':
		'inline-flex [align-self:center] [color:var(--board-text-faint,_var(--hu-fg-3))] [&_svg]:w-[13px] [&_svg]:h-[13px]',
	'dashboard-pmsec-field-label':
		'[font-size:var(--hu-text-xs)] [color:var(--board-text-faint,_var(--hu-fg-3))] whitespace-nowrap',
	'dashboard-pmsec-field-value':
		'[font-size:var(--hu-text-xs)] [color:var(--hu-fg,_var(--hu-fg))] [overflow:hidden] [text-overflow:ellipsis] whitespace-nowrap',
	'dashboard-pmsec-money':
		'flex [align-items:center] gap-[12px] [margin-top:7px] [flex-shrink:0] [padding-top:9px] [border-top:1px_dashed_color-mix(in_srgb,_var(--board-text-faint,_var(--hu-fg-2))_35%,_transparent)]',
	'dashboard-pmsec-money-block': 'flex [flex-direction:column] gap-[1px] min-w-[0]',
	'dashboard-pmsec-money-block--right': '[margin-left:auto] [text-align:right] [align-items:flex-end]',
	'dashboard-pmsec-money-label':
		'[font-size:var(--hu-text-xs)] [letter-spacing:0.05em] [color:var(--board-text-faint,_var(--hu-fg-3))]',
	'dashboard-pmsec-money-value':
		'[font-size:var(--hu-text-base)] [font-weight:800] [letter-spacing:-0.01em] [color:var(--board-accent,_var(--hu-accent))] [font-variant-numeric:tabular-nums] [overflow:hidden] [text-overflow:ellipsis] whitespace-nowrap max-w-[160px]',
	'dashboard-pmsec-money-value--muted':
		'[font-size:var(--hu-text-xs)] [font-weight:600] [color:var(--hu-fg-2,_var(--hu-fg-2))] max-w-[150px]',
	'dashboard-pmsec-actions':
		'[position:absolute] [top:6px] [right:8px] flex gap-[4px] [opacity:0] [pointer-events:none] motion-safe:[transition:opacity_0.15s_ease] [&:focus-within]:[opacity:1] [&:focus-within]:[pointer-events:auto]',
	'dashboard-pmsec-hero':
		'[flex-shrink:0] [padding-bottom:12px] [border-bottom:1px_solid_var(--hu-line,_var(--board-p1-color-98))] [&_.dashboard-pmsec-close]:[margin-left:auto]',
	'dashboard-pmsec-hero-row': 'flex [align-items:center] gap-[10px] min-w-[0]',
	'dashboard-pmsec-hero-title':
		'[font-size:var(--hu-text-lg)] [font-weight:750] [letter-spacing:-0.02em] min-w-[0] [overflow:hidden] [text-overflow:ellipsis] whitespace-nowrap',
	'dashboard-pmsec-hero-intro':
		'[margin-top:7px] [font-size:var(--hu-text-sm)] [line-height:1.55] [color:var(--hu-fg-2,_var(--hu-fg-2))] [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] [overflow:hidden] max-w-[72ch]',
	'dashboard-pmsec-board-body':
		'[flex:1_1_auto] min-h-[0] grid [grid-template-columns:minmax(0,_5fr)_minmax(0,_6fr)] gap-[22px] [margin-top:12px] [overflow:hidden] max-[901px]:[grid-template-columns:minmax(0,_1fr)] max-[901px]:[overflow-y:auto] [grid-template-rows:minmax(0,_1fr)]',
	'dashboard-pmsec-pane':
		'min-w-[0] min-h-[0] [overflow-y:auto] [overscroll-behavior:contain] [scrollbar-width:thin] [scrollbar-color:color-mix(in_srgb,_var(--board-accent,_var(--hu-accent))_18%,_transparent)_transparent] [padding-right:4px] max-[901px]:[overflow:visible] [background:color-mix(in_srgb,_var(--board-text-faint,_var(--hu-fg-2))_4%,_transparent)] [border:1px_solid_var(--hu-line,_var(--board-p1-color-100))] rounded-[var(--board-radius-lg,_12px)] p-[14px_14px_14px_16px]',
	'dashboard-pmsec-check-title': 'flex [align-items:baseline] gap-[8px]',
	'dashboard-pmsec-check-count':
		'[flex-shrink:0] [font-size:var(--hu-text-xs)] [font-weight:700] [font-variant-numeric:tabular-nums] p-[1px_8px] rounded-[999px] [background:color-mix(in_srgb,_var(--board-accent,_var(--hu-accent))_12%,_transparent)] [color:var(--board-accent,_var(--hu-accent))]',
	'dashboard-pmsec-checklist': 'flex [flex-direction:column] gap-[2px] [margin-bottom:6px] gap-[0]',
	'dashboard-pmsec-check-item':
		'flex [align-items:center] gap-[8px] p-[2px_4px] rounded-[6px] [&:hover]:[background:color-mix(in_srgb,_var(--hu-fg)_5%,_transparent)] p-[1px_4px] [&_.dashboard-pipeline-cfg-icon-btn]:w-[20px] [&_.dashboard-pipeline-cfg-icon-btn]:h-[20px] [&_.dashboard-pipeline-cfg-icon-btn_svg]:w-[12px] [&_.dashboard-pipeline-cfg-icon-btn_svg]:h-[12px]',
	'dashboard-pmsec-check-text':
		'[flex:1_1_auto] min-w-[0] [font-size:var(--hu-text-xs)] [color:var(--hu-fg,_var(--hu-fg))] [overflow:hidden] [text-overflow:ellipsis] whitespace-nowrap',
	'dashboard-pmsec-add-row': 'flex gap-[6px] [&.is-hidden]:hidden [&_.dashboard-modal-input]:[flex:1_1_auto]',
	'dashboard-pmsec-link-results':
		'[&.is-hidden]:hidden flex [flex-direction:column] gap-[2px] max-h-[180px] [overflow-y:auto] m-[2px_0_8px] [border:1px_solid_var(--hu-line,_var(--board-p1-color-98))] rounded-[var(--board-radius-sm,_6px)] p-[4px] [background:color-mix(in_srgb,_var(--hu-sunken,_var(--board-p1-color-9))_60%,_transparent)]',
	'dashboard-pmsec-files': 'flex [flex-direction:column] gap-[2px]',
	'dashboard-pmsec-file':
		'flex [align-items:center] gap-[8px] p-[4px_6px] rounded-[6px] [cursor:pointer] [&:hover]:[background:color-mix(in_srgb,_var(--hu-fg)_6%,_transparent)]',
	'dashboard-pmsec-file-name':
		'[font-size:var(--hu-text-xs)] [color:var(--hu-fg,_var(--hu-fg))] [overflow:hidden] [text-overflow:ellipsis] whitespace-nowrap',
	'dashboard-pmsec-board':
		'[&_.dashboard-modal-footer_.dashboard-modal-btn--danger]:[margin-left:0] [&_.dashboard-pmsec-hero]:block [&_.dashboard-pmsec-hero]:[position:relative] [&_.dashboard-pmsec-hero]:m-[0] [&_.dashboard-pmsec-hero]:p-[30px_46px_24px] [&_.dashboard-pmsec-hero]:[border:0] [&_.dashboard-pmsec-hero]:[background:linear-gradient(115deg,_color-mix(in_srgb,_var(--pm-accent)_12%,_var(--hu-raised,_var(--hu-canvas))),_var(--hu-raised,_var(--hu-canvas))_62%)] [&_.dashboard-pmsec-hero-row]:gap-[14px] [&_.dashboard-pmsec-hero-row]:[align-items:center] [&_.dashboard-pmsec-hero-title]:[font-size:clamp(1.65em,_2.3vw,_2.35em)] [&_.dashboard-pmsec-hero-title]:[font-weight:700] [&_.dashboard-pmsec-hero-title]:[line-height:1.2] [&_.dashboard-pmsec-hero-title]:[letter-spacing:-0.035em] [&_.dashboard-pmsec-hero-title]:[color:var(--pm-ink)] [&_.dashboard-pmsec-badge]:p-[5px_10px] [&_.dashboard-pmsec-badge]:rounded-[5px] [&_.dashboard-pmsec-badge]:[font-size:var(--hu-text-xs)] [&_.dashboard-pmsec-badge]:[font-weight:700] [&_.dashboard-pmsec-hero-intro]:max-w-[75ch] [&_.dashboard-pmsec-hero-intro]:[margin-top:13px] [&_.dashboard-pmsec-hero-intro]:[font-size:var(--hu-text-sm)] [&_.dashboard-pmsec-hero-intro]:[line-height:1.6] [&_.dashboard-pmsec-hero-intro]:[color:var(--pm-muted)] [&_.dashboard-pmsec-close]:w-[32px] [&_.dashboard-pmsec-close]:h-[32px] [&_.dashboard-pmsec-close]:[border:1px_solid_var(--pm-rule)] [&_.dashboard-pmsec-close]:rounded-[50%] [&_.dashboard-pmsec-progress-banner]:m-[0] [&_.dashboard-pmsec-progress-banner]:p-[16px_46px_18px] [&_.dashboard-pmsec-progress-banner]:gap-[17px] [&_.dashboard-pmsec-progress-banner]:[border:0] [&_.dashboard-pmsec-progress-banner]:[border-top:1px_solid_var(--pm-rule)] [&_.dashboard-pmsec-progress-banner]:[border-bottom:1px_solid_var(--pm-rule)] [&_.dashboard-pmsec-progress-banner]:rounded-[0] [&_.dashboard-pmsec-progress-banner]:[background:color-mix(in_srgb,_var(--pm-accent)_4%,_var(--hu-raised,_var(--hu-canvas)))] [&_.dashboard-pmsec-progress-banner_.dashboard-pmsec-progress-pct]:min-w-[2.3em] [&_.dashboard-pmsec-progress-banner_.dashboard-pmsec-progress-pct]:[font-size:var(--hu-text-xl)] [&_.dashboard-pmsec-progress-banner_.dashboard-pmsec-progress-pct]:[font-weight:700] [&_.dashboard-pmsec-progress-banner_.dashboard-pmsec-progress-pct]:[line-height:1] [&_.dashboard-pmsec-progress-banner_.dashboard-pmsec-progress-pct]:[color:var(--pm-accent)] [&_.dashboard-pmsec-stepper]:max-w-[360px] [&_.dashboard-pmsec-stepper]:[margin-left:auto] [&_.dashboard-pmsec-progress-label]:[font-size:var(--hu-text-xs)] [&_.dashboard-pmsec-progress-label]:[font-weight:600] [&_.dashboard-pmsec-progress-label]:[color:var(--pm-muted)] [&_.dashboard-pmsec-board-body]:[grid-template-columns:minmax(0,_0.94fr)_minmax(0,_1.06fr)] [&_.dashboard-pmsec-board-body]:gap-[0] [&_.dashboard-pmsec-board-body]:m-[0] [&_.dashboard-pmsec-board-body]:[background:var(--hu-raised,_var(--hu-canvas))] [&_.dashboard-pmsec-pane]:p-[20px_30px_22px_36px] [&_.dashboard-pmsec-pane_+_.dashboard-pmsec-pane]:[padding-left:38px] [&_.dashboard-pmsec-pane_+_.dashboard-pmsec-pane]:[padding-right:46px] [&_.dashboard-pmsec-pane_+_.dashboard-pmsec-pane]:[border-left:1px_solid_var(--pm-rule)] [&_.dashboard-library-config-section]:[margin-bottom:12px] [&_.dashboard-library-config-section]:p-[0] [&_.dashboard-library-config-section]:[border:0] [&_.dashboard-library-config-section]:rounded-[0] [&_.dashboard-library-config-section]:[background:transparent] [&_.dashboard-library-config-section-title]:m-[0] [&_.dashboard-library-config-section-title]:[font-size:var(--hu-text-xs)] [&_.dashboard-library-config-section-title]:[font-weight:800] [&_.dashboard-library-config-section-title]:[letter-spacing:0.02em] [&_.dashboard-pmsec-check-title]:[align-items:center] [&_.dashboard-pmsec-check-title]:min-h-[24px] [&_.dashboard-pmsec-check-title]:[margin-bottom:7px] [&_.dashboard-pmsec-check-count]:[margin-left:2px] [&_.dashboard-pmsec-check-count]:p-[3px_8px] [&_.dashboard-pmsec-check-count]:rounded-[4px] [&_.dashboard-pmsec-ov-grid]:gap-[0_20px] [&_.dashboard-pmsec-ov-grid]:[margin-top:2px] [&_.dashboard-pmsec-tile]:min-h-[0] [&_.dashboard-pmsec-tile]:gap-[10px] [&_.dashboard-pmsec-tile]:p-[7px_0] [&_.dashboard-pmsec-tile]:[border:0] [&_.dashboard-pmsec-tile]:[border-top:1px_solid_var(--pm-rule)] [&_.dashboard-pmsec-tile]:rounded-[0] [&_.dashboard-pmsec-tile]:[background:transparent] [&_.dashboard-pmsec-tile--accent]:[background:transparent] [&_.dashboard-pmsec-tile--accent.dashboard-pmsec-tile--full]:min-h-[98px] [&_.dashboard-pmsec-tile--accent.dashboard-pmsec-tile--full]:[margin-bottom:10px] [&_.dashboard-pmsec-tile--accent.dashboard-pmsec-tile--full]:p-[18px_20px] [&_.dashboard-pmsec-tile--accent.dashboard-pmsec-tile--full]:[border:1px_solid_color-mix(in_srgb,_var(--pm-accent)_28%,_transparent)] [&_.dashboard-pmsec-tile--accent.dashboard-pmsec-tile--full]:[border-left:4px_solid_var(--pm-accent)] [&_.dashboard-pmsec-tile--accent.dashboard-pmsec-tile--full]:rounded-[9px] [&_.dashboard-pmsec-tile--accent.dashboard-pmsec-tile--full]:[background:color-mix(in_srgb,_var(--pm-accent)_9%,_var(--hu-raised,_var(--hu-canvas)))] [&_.dashboard-pmsec-tile--danger]:[background:transparent] [&_.dashboard-pmsec-tile-icon]:[margin-top:3px] [&_.dashboard-pmsec-tile-label]:[font-size:var(--hu-text-xs)] [&_.dashboard-pmsec-tile-label]:[font-weight:650] [&_.dashboard-pmsec-tile-label]:[letter-spacing:0.07em] [&_.dashboard-pmsec-tile-label]:[color:var(--pm-muted)] [&_.dashboard-pmsec-tile-value]:[font-size:var(--hu-text-sm)] [&_.dashboard-pmsec-tile-value]:[line-height:1.45] [&_.dashboard-pmsec-tile-value--big]:[font-size:var(--hu-text-base)] [&_.dashboard-pmsec-tile--accent.dashboard-pmsec-tile--full_.dashboard-pmsec-tile-value]:[font-size:var(--hu-text-lg)] [&_.dashboard-pmsec-tile-sub]:[margin-top:3px] [&_.dashboard-pmsec-ov-edit]:[margin-left:auto] [&_.dashboard-pmsec-section--milestone]:[margin-bottom:22px] [&_.dashboard-pmsec-section--milestone]:[padding-bottom:20px] [&_.dashboard-pmsec-section--milestone]:[border-bottom:1px_solid_var(--pm-rule)] [&_.dashboard-pmsec-section--todo]:[margin-bottom:22px] [&_.dashboard-pmsec-section--todo]:[padding-bottom:20px] [&_.dashboard-pmsec-section--todo]:[border-bottom:1px_solid_var(--pm-rule)] [&_.dashboard-pmsec-section--files]:[margin-bottom:22px] [&_.dashboard-pmsec-section--files]:[padding-bottom:20px] [&_.dashboard-pmsec-section--files]:[border-bottom:1px_solid_var(--pm-rule)] [&_.dashboard-pmsec-checklist]:gap-[0] [&_.dashboard-pmsec-checklist]:m-[0_0_8px] [&_.dashboard-pmsec-check-item]:min-h-[29px] [&_.dashboard-pmsec-check-item]:p-[3px_4px] [&_.dashboard-pmsec-check-item]:rounded-[5px] [&_.dashboard-pmsec-check-item_+_.dashboard-pmsec-check-item]:[border-top:1px_solid_color-mix(in_srgb,_var(--pm-ink)_7%,_transparent)] [&_.dashboard-pmsec-check-item_input[type="checkbox"]]:[flex:0_0_auto] [&_.dashboard-pmsec-check-item_input[type="checkbox"]]:w-[16px] [&_.dashboard-pmsec-check-item_input[type="checkbox"]]:h-[16px] [&_.dashboard-pmsec-check-item_input[type="checkbox"]]:m-[0_4px_0_0] [&_.dashboard-pmsec-check-item_input[type="checkbox"]]:[accent-color:var(--pm-accent)] [&_.dashboard-pmsec-check-text]:[font-size:var(--hu-text-xs)] [&_.dashboard-pmsec-check-text]:[line-height:1.45] [&_.dashboard-pmsec-add-row]:gap-[8px] [&_.dashboard-pmsec-add-kind]:[flex:0_0_auto] [&_.dashboard-pmsec-add-kind]:min-w-[70px] [&_.dashboard-pmsec-add-kind]:p-[6px_8px] [&_.dashboard-pmsec-add-kind]:rounded-[6px] [&_.dashboard-pmsec-add-date]:[flex:0_0_auto] [&_.dashboard-pmsec-add-date]:w-[118px] [&_.dashboard-pmsec-add-date]:p-[6px_8px] [&_.dashboard-pmsec-add-date]:rounded-[6px] [&_.dashboard-pmsec-add-time]:[flex:0_0_auto] [&_.dashboard-pmsec-add-time]:w-[118px] [&_.dashboard-pmsec-add-time]:p-[6px_8px] [&_.dashboard-pmsec-add-time]:rounded-[6px] [&_.dashboard-pmsec-add-time]:w-[84px] [&_.dashboard-pmsec-add-row_.dashboard-modal-input]:min-w-[0] [&_.dashboard-pmsec-add-row_.dashboard-modal-input]:p-[8px_11px] [&_.dashboard-pmsec-add-row_.dashboard-modal-input]:rounded-[6px] [&_.dashboard-pmsec-add-row_.dashboard-modal-btn--confirm]:min-w-[64px] [&_.dashboard-pmsec-add-row_.dashboard-modal-btn--confirm]:rounded-[6px] [&_.dashboard-pmsec-section--files_.dashboard-library-config-inline-row]:[justify-content:space-between] [&_.dashboard-pmsec-section--files_.dashboard-library-config-inline-row]:m-[0_0_14px] [&_.dashboard-pmsec-files_.dashboard-library-empty]:p-[22px_12px] [&_.dashboard-pmsec-files_.dashboard-library-empty]:[border:1px_dashed_var(--pm-rule)] [&_.dashboard-pmsec-files_.dashboard-library-empty]:rounded-[8px] [&_.dashboard-pmsec-files_.dashboard-library-empty]:[background:color-mix(in_srgb,_var(--pm-ink)_2%,_transparent)] [&_.dashboard-pmsec-files_.dashboard-library-empty]:[text-align:center] [&_.dashboard-pmsec-file]:min-h-[36px] [&_.dashboard-pmsec-foot]:m-[0] [&_.dashboard-pmsec-foot]:p-[14px_46px_14px_36px] [&_.dashboard-pmsec-foot]:[justify-content:flex-start] [&_.dashboard-pmsec-foot]:[border-top:1px_solid_var(--pm-rule)] [&_.dashboard-pmsec-foot]:[background:color-mix(in_srgb,_var(--pm-ink)_2%,_var(--hu-raised,_var(--hu-canvas)))] [&_.dashboard-pmsec-foot_.dashboard-modal-btn]:[background:transparent] [&_.dashboard-pmsec-foot_.dashboard-modal-btn]:[border-color:var(--pm-rule)] [&_.dashboard-pmsec-foot_.dashboard-modal-btn]:[font-size:var(--hu-text-xs)] [&_.dashboard-pmsec-foot_.dashboard-modal-btn--danger]:[color:var(--hu-danger,_var(--hu-danger))] [&_.dashboard-pmsec-foot_.dashboard-modal-btn--danger]:[border-color:color-mix(in_srgb,_var(--hu-danger,_var(--hu-danger))_30%,_transparent)] max-[901px]:[&_.dashboard-pmsec-board-body]:[grid-template-columns:minmax(0,_1fr)] max-[901px]:[&_.dashboard-pmsec-board-body]:gap-[0] max-[901px]:[&_.dashboard-pmsec-board-body]:[overflow-y:auto] max-[901px]:[&_.dashboard-pmsec-pane]:p-[25px_32px] max-[901px]:[&_.dashboard-pmsec-pane]:[overflow:visible] max-[901px]:[&_.dashboard-pmsec-pane]:[border-left:0] max-[901px]:[&_.dashboard-pmsec-pane_+_.dashboard-pmsec-pane]:p-[25px_32px] max-[901px]:[&_.dashboard-pmsec-pane_+_.dashboard-pmsec-pane]:[overflow:visible] max-[901px]:[&_.dashboard-pmsec-pane_+_.dashboard-pmsec-pane]:[border-left:0] max-[901px]:[&_.dashboard-pmsec-pane_+_.dashboard-pmsec-pane]:[border-top:1px_solid_var(--pm-rule)] max-[561px]:[&_.dashboard-pmsec-hero]:[padding-left:20px] max-[561px]:[&_.dashboard-pmsec-hero]:[padding-right:20px] max-[561px]:[&_.dashboard-pmsec-progress-banner]:[padding-left:20px] max-[561px]:[&_.dashboard-pmsec-progress-banner]:[padding-right:20px] max-[561px]:[&_.dashboard-pmsec-pane]:[padding-left:20px] max-[561px]:[&_.dashboard-pmsec-pane]:[padding-right:20px] max-[561px]:[&_.dashboard-pmsec-pane_+_.dashboard-pmsec-pane]:[padding-left:20px] max-[561px]:[&_.dashboard-pmsec-pane_+_.dashboard-pmsec-pane]:[padding-right:20px] max-[561px]:[&_.dashboard-pmsec-foot]:[padding-left:20px] max-[561px]:[&_.dashboard-pmsec-foot]:[padding-right:20px] max-[561px]:[&_.dashboard-pmsec-hero-title]:whitespace-normal max-[561px]:[&_.dashboard-pmsec-progress-banner]:[flex-wrap:wrap] max-[561px]:[&_.dashboard-pmsec-stepper]:[flex-basis:100%] max-[561px]:[&_.dashboard-pmsec-stepper]:[order:3] max-[561px]:[&_.dashboard-pmsec-stepper]:max-w-[none] max-[561px]:[&_.dashboard-pmsec-stepper]:m-[0] max-[561px]:[&_.dashboard-pmsec-progress-label]:[margin-left:auto] max-[561px]:[&_.dashboard-pmsec-ov-grid]:[grid-template-columns:minmax(0,_1fr)] max-[561px]:[&_.dashboard-pmsec-tile--full]:[grid-column:auto] [&_.dashboard-library-config-section-title]:[font-size:var(--hu-text-xs)] [&_.dashboard-library-config-section-title]:[letter-spacing:0.04em] [&_.dashboard-library-config-section-title]:[color:var(--pm-accent,_var(--board-accent,_var(--hu-accent)))] flex [flex-direction:column] [overflow:hidden] min-w-[0] [&_.dashboard-pmsec-hero]:[flex-shrink:0] [flex:1_1_auto] min-h-[0] h-[auto] [&_.dashboard-pmsec-edit_.dashboard-pmsec-date]:[box-sizing:border-box] [&_.dashboard-pmsec-edit_.dashboard-pmsec-date]:h-[32px] [&_.dashboard-pmsec-edit_.dashboard-pmsec-date]:p-[4px_8px] [&_.dashboard-pmsec-edit_.dashboard-pmsec-time]:[box-sizing:border-box] [&_.dashboard-pmsec-edit_.dashboard-pmsec-time]:h-[32px] [&_.dashboard-pmsec-edit_.dashboard-pmsec-time]:p-[4px_8px] [&_.dashboard-pmsec-add-date]:[box-sizing:border-box] [&_.dashboard-pmsec-add-date]:h-[32px] [&_.dashboard-pmsec-add-date]:p-[4px_8px] [&_.dashboard-pmsec-add-time]:[box-sizing:border-box] [&_.dashboard-pmsec-add-time]:h-[32px] [&_.dashboard-pmsec-add-time]:p-[4px_8px] [&_.dashboard-pmsec-add-row_.dashboard-modal-input]:[box-sizing:border-box] [&_.dashboard-pmsec-add-row_.dashboard-modal-input]:h-[32px] [&_.dashboard-pmsec-add-row_.dashboard-modal-input]:p-[4px_10px] [&_.dashboard-pmsec-edit_.dashboard-library-config-inline-row_.dashboard-modal-input]:[box-sizing:border-box] [&_.dashboard-pmsec-edit_.dashboard-library-config-inline-row_.dashboard-modal-input]:h-[32px] [&_.dashboard-pmsec-edit_.dashboard-library-config-inline-row_.dashboard-modal-input]:p-[4px_10px]',
	'dashboard-pmsec-ov-grid':
		'grid [grid-template-columns:repeat(2,_minmax(0,_1fr))] gap-[10px] [margin-top:10px] gap-[8px] [margin-top:6px]',
	'dashboard-pmsec-tile':
		'flex [align-items:flex-start] gap-[9px] p-[10px_12px] rounded-[var(--board-radius-md,_10px)] [border:1px_solid_var(--hu-line,_var(--board-p1-color-98))] [background:color-mix(in_srgb,_var(--board-text-faint,_var(--hu-fg-2))_5%,_transparent)] min-w-[0] p-[8px_11px] gap-[8px]',
	'dashboard-pmsec-tile--full': '[grid-column:1_/_-1]',
	'dashboard-pmsec-tile--accent':
		'[border-color:color-mix(in_srgb,_var(--board-accent,_var(--hu-accent))_30%,_transparent)] [background:color-mix(in_srgb,_var(--board-accent,_var(--hu-accent))_8%,_transparent)] [&_.dashboard-pmsec-tile-icon]:[color:var(--board-accent,_var(--hu-accent))] [&_.dashboard-pmsec-tile-value]:[color:var(--board-accent,_var(--hu-accent))]',
	'dashboard-pmsec-tile-icon':
		'inline-flex [margin-top:2px] [color:var(--hu-fg-2,_var(--hu-fg-2))] [&_svg]:w-[15px] [&_svg]:h-[15px]',
	'dashboard-pmsec-tile-body': 'flex [flex-direction:column] gap-[2px] min-w-[0]',
	'dashboard-pmsec-tile-label':
		'[font-size:var(--hu-text-xs)] [letter-spacing:0.05em] [color:var(--board-text-faint,_var(--hu-fg-3))]',
	'dashboard-pmsec-tile-value':
		'[font-size:var(--hu-text-xs)] [font-weight:600] [color:var(--hu-fg,_var(--hu-fg))] [overflow-wrap:anywhere]',
	'dashboard-pmsec-tile-value--big':
		'[font-size:var(--hu-text-base)] [font-weight:800] [letter-spacing:-0.01em] [font-variant-numeric:tabular-nums]',
	'dashboard-pmsec-tile-sub': '[font-size:var(--hu-text-xs)] [color:var(--hu-fg-2,_var(--hu-fg-2))]',
	'dashboard-pmsec-ov-edit': '[margin-left:auto]',
	'dashboard-pmsec-edit':
		'[&_.dashboard-library-config-inline-row]:grid [&_.dashboard-library-config-inline-row]:[grid-template-columns:6.5em_minmax(0,_1fr)] [&_.dashboard-library-config-inline-row]:[align-items:center] [&_.dashboard-library-config-inline-row]:[column-gap:10px] [&_.dashboard-library-config-inline-row]:[row-gap:6px] [&_.dashboard-library-config-inline-label]:[font-size:var(--hu-text-xs)] [&_.dashboard-library-config-inline-label]:whitespace-nowrap',
	'dashboard-pmsec-link-row': '[margin-bottom:8px]',
	'dashboard-pmsec-file-unlink':
		'inline-flex [align-items:center] [justify-content:center] w-[22px] h-[22px] p-[0] [margin-left:auto] [border:none] rounded-[5px] [background:transparent] [color:var(--board-text-faint,_var(--hu-fg-3))] [cursor:pointer] [flex-shrink:0] [&:hover]:[color:var(--hu-danger,_var(--hu-danger))] [&:hover]:[background:color-mix(in_srgb,_var(--hu-danger,_var(--hu-danger))_12%,_transparent)] [&_svg]:w-[13px] [&_svg]:h-[13px]',
	'dashboard-pmsec-foot-actions':
		'flex [align-items:center] gap-[6px] [flex-shrink:0] [margin-top:9px] [flex-wrap:wrap]',
	'dashboard-pmsec-foot-btn':
		'inline-flex [align-items:center] gap-[5px] p-[3px_10px] [border:1px_solid_var(--hu-line,_var(--board-p1-color-98))] rounded-[999px] [background:color-mix(in_srgb,_var(--board-text-faint,_var(--hu-fg-2))_6%,_transparent)] [color:var(--hu-fg-2,_var(--hu-fg-2))] [font-size:var(--hu-text-xs)] [cursor:pointer] [&:hover]:[border-color:color-mix(in_srgb,_var(--board-accent,_var(--hu-accent))_40%,_transparent)] [&:hover]:[color:var(--hu-fg,_var(--hu-fg))] [&:hover]:[background:color-mix(in_srgb,_var(--board-accent,_var(--hu-accent))_9%,_transparent)]',
	'dashboard-pmsec-eyebrow': 'flex [align-items:center] [flex-wrap:wrap] gap-[6px] [margin-bottom:6px]',
	'dashboard-pmsec-hero-progress':
		'[margin-left:auto] flex [align-items:center] gap-[9px] [flex:0_1_auto] min-w-[0] max-w-[46%] [&_.dashboard-pmsec-progress-pct]:[font-size:var(--hu-text-base)] [&_.dashboard-pmsec-progress-pct]:min-w-[2.2em] [&_.dashboard-pmsec-step::before]:w-[10px] [&_.dashboard-pmsec-step::before]:h-[10px]',
	'dashboard-pmsec-ov-head': '[justify-content:flex-end] [margin-bottom:2px]',
	'dashboard-pmsec-link-item':
		'flex [align-items:center] gap-[8px] p-[4px_6px] rounded-[5px] [cursor:pointer] [&:hover]:[background:color-mix(in_srgb,_var(--board-accent,_var(--hu-accent))_12%,_transparent)]',
	'dashboard-pmsec-tile--custom':
		'[&_.dashboard-pmsec-file-unlink]:[position:absolute] [&_.dashboard-pmsec-file-unlink]:[top:4px] [&_.dashboard-pmsec-file-unlink]:[right:4px] [&_.dashboard-pmsec-file-unlink]:[margin-left:0] [&_.dashboard-pmsec-file-unlink]:[opacity:0] [&_.dashboard-pmsec-file-unlink]:motion-safe:[transition:opacity_0.15s_ease] [position:relative] [&:hover_.dashboard-pmsec-file-unlink]:[opacity:1]',
	'dashboard-pmsec-grouphead':
		'flex [align-items:center] gap-[8px] [font-size:12px] [font-weight:700] [color:var(--board-accent,_var(--hu-accent))] p-[2px_4px]',
	'dashboard-pmsec-list--compact':
		'[grid-template-columns:repeat(auto-fill,_minmax(198px,_1fr))] gap-[8px] [&_.dashboard-pmsec-intro]:min-h-[calc(2_*_1.4em)] [&_.dashboard-pmsec-intro]:[font-size:var(--hu-text-xs)]',
	'dashboard-pmsec-content':
		'flex [flex-direction:column] gap-[12px] [flex:1_1_auto] min-h-[0] [overflow-y:auto] [overflow-x:hidden] [padding-right:2px] [scrollbar-width:thin] [scrollbar-color:transparent_transparent] [&:hover]:[scrollbar-color:color-mix(in_srgb,_var(--board-accent,_var(--hu-accent))_18%,_transparent)_transparent]',
	'dashboard-pmsec-star':
		'[margin-left:auto] inline-flex [align-items:center] [justify-content:center] w-[20px] h-[20px] p-[0] [border:none] [background:transparent] [box-shadow:none] [color:var(--board-text-faint,_var(--hu-fg-3))] [cursor:pointer] [opacity:0.75] [&:hover]:[opacity:1] [&:hover]:[color:var(--board-accent,_var(--hu-accent))] [&.is-active]:[opacity:1] [&.is-active]:[color:var(--board-accent,_var(--hu-accent))] [&.is-active_svg]:[fill:currentColor] [&_svg]:w-[14px] [&_svg]:h-[14px]',
	'dashboard-pmsec-kanban':
		'grid [grid-template-columns:repeat(auto-fill,_minmax(14rem,_1fr))] gap-[12px] [flex:none] min-w-[0] [align-items:start]',
	'dashboard-pmsec-kcol': 'min-w-[0] w-[100%] flex [flex-direction:column] gap-[8px]',
	'dashboard-pmsec-list--col':
		'flex [flex-direction:column] gap-[8px] [flex:none] [grid-template-columns:none] p-[2px] [scrollbar-width:thin] [scrollbar-color:transparent_transparent] [&:hover]:[scrollbar-color:color-mix(in_srgb,_var(--board-accent,_var(--hu-accent))_18%,_transparent)_transparent] [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-thumb]:[background:transparent] [&::-webkit-scrollbar-thumb]:rounded-[3px] [&:hover::-webkit-scrollbar-thumb]:[background:color-mix(in_srgb,_var(--board-accent,_var(--hu-accent))_22%,_transparent)] [&::-webkit-scrollbar-track]:[background:transparent] [&_.dashboard-pmsec-card]:[flex:none] [&_.dashboard-pmsec-card]:w-[auto]',
	'dashboard-skillsec-star':
		'[margin-left:auto] [margin-top:3px] inline-flex [align-items:center] [justify-content:center] w-[20px] h-[20px] p-[0] [border:none] [background:transparent] [box-shadow:none] [color:var(--board-text-faint,_var(--hu-fg-3))] [cursor:pointer] [opacity:0.75] [flex-shrink:0] [&:hover]:[opacity:1] [&:hover]:[color:var(--board-accent,_var(--hu-accent))] [&.is-active]:[opacity:1] [&.is-active]:[color:var(--board-accent,_var(--hu-accent))] [&.is-active_svg]:[fill:currentColor] [&_svg]:w-[14px] [&_svg]:h-[14px]',
};
export function p1Classes(names: string | undefined): string {
	return cn(...(names ?? '').split(/\s+/).flatMap((name) => [name, layout[name]]));
}
