// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: styles.css
// Static Tailwind recipes retain upstream selector names for visual comparison. No runtime CSS is generated.
import { cn } from '../../../../ui/lib/utils';
const layout: Record<string, string> = {
	'dashboard-library-config-modal':
		"[&_.dashboard-modal-input.dashboard-modal-input:not(.dashboard-section-name-input):is(input[type='text'],_input[type='search'])]:[border:1px_solid_var(--input,_var(--background-modifier-border))] [&_.dashboard-modal-input.dashboard-modal-input:not(.dashboard-section-name-input):is(input[type='text'],_input[type='search'])]:rounded-[var(--board-radius-sm,_6px)] [&_.dashboard-modal-input.dashboard-modal-input:not(.dashboard-section-name-input):is(input[type='text'],_input[type='search'])]:p-[8px_12px] [&_.dashboard-modal-input.dashboard-modal-input:not(.dashboard-section-name-input):is(input[type='text'],_input[type='search'])]:[background:var(--muted,_var(--background-modifier-form-field))] [&_.dashboard-modal-input.dashboard-modal-input:not(.dashboard-section-name-input):is(input[type='text'],_input[type='search'])]:[box-shadow:none] [&_.dashboard-modal-input.dashboard-modal-input:not(.dashboard-section-name-input):is(input[type='text'],_input[type='search'])]:[color:var(--foreground,_var(--text-normal))] [&_.dashboard-modal-input.dashboard-modal-input:is(input[type='text'],_input[type='search']):focus]:[border-color:var(--ring,_var(--interactive-accent))] [&_.dashboard-modal-input.dashboard-modal-input:is(input[type='text'],_input[type='search']):focus]:[box-shadow:none] p-[0]",
	'dashboard-sidebar-album-frame':
		'[position:relative] h-[100%] w-[100%] [overflow:hidden] [&:hover_.dashboard-sidebar-album-nav]:[opacity:0.9] [&:hover_.dashboard-sidebar-album-nav]:[visibility:visible]',
	'dashboard-sidebar-album-layer':
		'[position:absolute] [inset:0] w-[100%] h-[100%] [object-fit:cover] motion-safe:[transition:opacity_0.6s_ease,_transform_0.6s_ease] [user-select:none] [pointer-events:none]',
	'dashboard-sidebar-album-layer--instant': '',
	'dashboard-sidebar-album-layer--top': '[z-index:var(--layer-content)]',
	'dashboard-sidebar-album-layer--bottom': '[z-index:var(--layer-content)]',
	'dashboard-sidebar-album-layer--start-fade': '[opacity:0]',
	'dashboard-sidebar-album-layer--start-zoom': '[opacity:0] [transform:scale(1.06)]',
	'dashboard-sidebar-album-layer--start-slide-in-right': '[transform:translateX(100%)]',
	'dashboard-sidebar-album-layer--start-slide-in-left': '[transform:translateX(-100%)]',
	'dashboard-sidebar-album-layer--run-slide-out-left': '[transform:translateX(-100%)]',
	'dashboard-sidebar-album-layer--run-slide-out-right': '[transform:translateX(100%)]',
	'dashboard-sidebar-album-index':
		'[position:absolute] [right:6px] [bottom:6px] [background:var(--board-p2-color-1)] [color:var(--primary-foreground)] [font-size:0.65em] p-[1px_7px] rounded-[999px] [pointer-events:none] [user-select:none]',
	'dashboard-sidebar-album-nav':
		'[position:absolute] [top:50%] [transform:translateY(-50%)] w-[24px] h-[32px] flex [align-items:center] [justify-content:center] p-[0] [border:none] [background:var(--board-p2-color-3)] [color:var(--primary-foreground)] [cursor:pointer] [opacity:0] [visibility:hidden] motion-safe:[transition:opacity_0.15s_ease] [box-shadow:none] [&:hover]:[background:var(--board-p2-color-4)] [&_svg]:w-[14px] [&_svg]:h-[14px]',
	'dashboard-sidebar-album-nav--prev': '[left:0] rounded-[0_var(--board-radius-sm)_var(--board-radius-sm)_0]',
	'dashboard-sidebar-album-nav--next': '[right:0] rounded-[var(--board-radius-sm)_0_0_var(--board-radius-sm)]',
	'dashboard-sidebar-album--single':
		'[&_.dashboard-sidebar-album-nav]:hidden [&_.dashboard-sidebar-album-index]:hidden',
	'dashboard-sidebar-album-placeholder':
		'h-[100%] flex [flex-direction:column] [align-items:center] [justify-content:center] gap-[6px] [color:var(--muted-foreground)] [font-size:0.75em] [user-select:none]',
	'dashboard-sidebar-album-placeholder-icon': 'flex [opacity:0.5] [&_svg]:w-[22px] [&_svg]:h-[22px]',
	'dashboard-sidebar-album-placeholder-text': 'p-[0_10px] [text-align:center]',
	'dashboard-section-name-input':
		'[flex:1] min-w-[0] [box-sizing:border-box] p-[7px_10px] [border:1px_solid_var(--border,_var(--board-p2-color-5))] rounded-[var(--board-radius-sm,_6px)] [background:var(--muted,_var(--background-modifier-form-field))] [color:var(--foreground,_var(--text-normal))] [font-size:0.9em] [&:focus]:[border-color:var(--board-accent,_var(--interactive-accent))] h-[30px]',
	'dashboard-modal-btn':
		'[&.is-disabled]:[opacity:0.45] [&.is-disabled]:[pointer-events:none] p-[6px_16px] rounded-[var(--board-radius-sm,_6px)] [font-size:0.9em] [cursor:pointer] [background:var(--secondary,_var(--background-modifier-hover))] [border:1px_solid_var(--border,_var(--background-modifier-border))] [color:var(--foreground,_var(--text-normal))] motion-safe:[transition:_opacity_0.15s_ease] [&:hover]:[background:var(--accent,_var(--background-modifier-hover))] h-[var(--input-height)]',
	'dashboard-task-input':
		'w-[100%] [-webkit-appearance:none] [appearance:none] [background:none] [border:none] [box-shadow:none] [color:var(--muted-foreground)] [font-size:0.9em] p-[4px_0] [&::placeholder]:[color:var(--board-text-faint)] [&::placeholder]:[opacity:0.5] [&:focus]:[color:var(--foreground)] max-[641px]:[font-size:0.85em] max-[641px]:p-[3px_0]',
	'dashboard-modal':
		'rounded-[var(--board-radius-lg,_12px)] [border:1px_solid_var(--border,_var(--background-modifier-border))] [background:var(--popover,_var(--board-bg-card,_var(--background-secondary)))] [backdrop-filter:var(--board-backdrop-blur,_blur(24px))] [-webkit-backdrop-filter:var(--board-backdrop-blur,_blur(24px))] [color:var(--foreground,_var(--text-normal))] p-[28px_32px_24px] [&.dashboard-modal--compact]:p-[18px_20px_16px] [&.modal]:[background:transparent] [&.modal]:[border:none] [&.modal]:[box-shadow:none] [&_h2]:[color:var(--board-accent,_var(--text-normal))] [&_h2]:[border-bottom:1px_solid_var(--border,_var(--background-modifier-border))] [&_h2]:[padding-bottom:10px] [&_h2]:[margin-bottom:4px] [&_.dashboard-modal-form]:flex [&_.dashboard-modal-form]:[flex-direction:column] [&_.dashboard-modal-form]:gap-[16px] [&_.dashboard-modal-form]:[margin-top:16px] max-[641px]:[backdrop-filter:none] max-[641px]:[-webkit-backdrop-filter:none] max-[641px]:rounded-[var(--board-radius-md)] [&_.dashboard-section-name-input]:[border:1px_solid_var(--border,_var(--board-p2-color-29))] [&_.dashboard-section-name-input]:[background:var(--muted,_var(--background-modifier-form-field))] [&_.dashboard-section-name-input]:[box-shadow:none] [&_.dashboard-section-name-input:focus]:[border-color:var(--board-accent,_var(--interactive-accent))]',
	'dashboard-library-config-section':
		'[background:var(--accent,_var(--board-p2-color-6))] [border:1px_solid_var(--border,_var(--board-p2-color-7))] rounded-[10px] p-[12px] [margin-bottom:16px]',
	'dashboard-modal-form':
		'[&_label]:[font-size:0.9em] [&_label]:[font-weight:500] [&_label]:block [&_label]:[margin-bottom:4px] [&_label]:[color:var(--foreground,_var(--text-normal))]',
	'dashboard-modal-input':
		'w-[100%] p-[8px_12px] [border:1px_solid_var(--input,_var(--background-modifier-border))] rounded-[var(--board-radius-sm,_6px)] [background:var(--muted,_var(--background-modifier-form-field))] [color:var(--foreground,_var(--text-normal))] [font-size:0.95em] [&:focus]:[border-color:var(--ring,_var(--interactive-accent))]',
	'dashboard-modal-footer':
		'flex gap-[8px] [justify-content:flex-end] [margin-top:16px] [padding-top:12px] [border-top:1px_solid_var(--border,_var(--background-modifier-border))]',
	'dashboard-modal-btn--cancel': '[color:var(--muted-foreground,_var(--text-muted))]',
	'dashboard-modal-btn--confirm':
		'[background:var(--board-accent,_var(--interactive-accent))] [border-color:transparent] [color:var(--on-image,_var(--text-on-accent))] [font-weight:500] [&:hover]:[background:var(--board-accent,_var(--interactive-accent))] [&:hover]:[opacity:0.88]',
	'dashboard-library-calendar-popup':
		'[background:var(--popover,_var(--background,_var(--background-primary)))] [color:var(--foreground,_var(--text-normal))] [border-color:var(--border,_var(--background-modifier-border))] [&_.dashboard-task-reminder-calendar-day]:[color:var(--foreground,_var(--text-normal))] [&_.dashboard-task-reminder-calendar-day--today]:[color:var(--board-accent,_var(--interactive-accent))] [&_.dashboard-task-reminder-calendar-day--selected]:[background:var(--board-accent,_var(--interactive-accent))] [&_.dashboard-task-reminder-calendar-day--selected]:[color:var(--on-image,_var(--text-on-accent))] [&_.dashboard-task-reminder-calendar-day--in-range]:[background:color-mix(in_srgb,_var(--board-accent,_var(--chart-5))_20%,_transparent)] [&_.dashboard-task-reminder-calendar-day--in-range]:rounded-[0] [&_.dashboard-task-reminder-calendar-day--other-month]:[color:var(--muted-foreground,_var(--text-faint))] [&_.dashboard-task-reminder-calendar-nav_span]:[color:var(--foreground,_var(--text-normal))] [&_.dashboard-task-reminder-calendar-nav_button]:[color:var(--muted-foreground,_var(--text-muted))] [&_.dashboard-task-reminder-calendar-nav_button:hover]:[color:var(--foreground,_var(--text-normal))] [&_.dashboard-task-reminder-calendar-nav_button:hover]:[background:var(--board-bg-card-hover,_var(--board-p2-color-10))] [&_.dashboard-task-reminder-popup-btns_button]:[color:var(--foreground,_var(--text-normal))] [&_.dashboard-task-reminder-popup-btns_button.mod-cta]:[color:var(--primary-foreground)] [&_.dashboard-task-reminder-time]:[color:var(--foreground,_var(--text-normal))] [&_.dashboard-task-reminder-time_[role=combobox]]:[background:var(--muted,_var(--board-bg-card))] [&_.dashboard-task-reminder-time_[role=combobox]]:[color:var(--foreground,_var(--text-normal))] [&_.dashboard-task-reminder-time_[role=combobox]]:[border-color:var(--input,_var(--border))]',
	'dashboard-library-calendar-status':
		'[font-size:0.6875em] [color:var(--muted-foreground,_var(--text-muted))] [text-align:center]',
	'dashboard-library-toolbar':
		'[flex-shrink:0] flex [align-items:center] gap-[8px] p-[6px_8px] [background:var(--board-bg-card,_var(--board-p2-color-11))] rounded-[var(--board-radius-md,_10px)] [margin-bottom:8px] [flex-wrap:wrap]',
	'dashboard-library-pagination': '[flex-shrink:0] p-[4px_0_0_0]',
	'dashboard-library-search':
		'[flex:1] min-w-[120px] max-w-[240px] p-[4px_10px] [border:1px_solid_var(--input,_var(--board-p2-color-10))] rounded-[var(--board-radius-sm,_6px)] [background:var(--muted,_var(--board-p2-color-12))] [color:var(--foreground,_var(--text-normal))] [font-size:0.75em] [&:focus]:[border-color:var(--ring,_var(--interactive-accent))] [&::placeholder]:[color:var(--muted-foreground,_var(--text-muted))]',
	'dashboard-library-view-toggle':
		'flex gap-[2px] [background:var(--muted,_var(--board-p2-color-12))] rounded-[var(--board-radius-sm,_6px)] p-[2px]',
	'dashboard-library-view-btn':
		'[cursor:pointer] p-[4px_8px] rounded-[4px] [color:var(--muted-foreground,_var(--text-muted))] flex [align-items:center] [font-size:0.75em] motion-safe:[transition:_transform_0.15s_ease] [&:hover]:[color:var(--foreground,_var(--text-normal))] [&:hover]:[background:var(--accent,_var(--board-p2-color-12))] [&.active]:[background:var(--secondary,_var(--board-p2-color-13))] [&.active]:[color:var(--board-accent,_var(--interactive-accent))]',
	'dashboard-library-config-hint':
		'[&.is-hidden]:hidden [font-size:0.6875em] [color:var(--muted-foreground,_var(--text-muted))] [margin-bottom:6px]',
	'dashboard-library-count':
		'[font-size:0.6875em] [color:var(--muted-foreground,_var(--text-muted))] whitespace-nowrap [margin-left:auto]',
	'dashboard-library-filter-popup':
		'[position:relative] [margin-top:4px] p-[12px] rounded-[var(--board-radius-md,_10px)] [border:1px_solid_var(--border,_var(--muted))] [background:var(--popover,_var(--background,_var(--background-primary)))] max-w-[320px] [box-shadow:0_4px_16px_var(--board-p2-color-15)] [z-index:var(--layer-content)] [color:var(--foreground,_var(--foreground))]',
	'dashboard-library-quickfilter-row': '[margin-bottom:8px]',
	'dashboard-library-quickfilter-label':
		'block [font-size:0.75em] [color:var(--muted-foreground,_var(--text-muted))] [margin-bottom:4px]',
	'dashboard-library-filter-popup-prop':
		'p-[4px_8px] [border:1px_solid_var(--muted)] rounded-[6px] [background:var(--muted)] [color:var(--foreground)] [font-size:0.75em] min-w-[120px]',
	'dashboard-library-empty':
		'p-[40px_20px] [text-align:center] [color:var(--muted-foreground,_var(--text-muted))] [font-size:0.8125em]',
	'dashboard-library-list': 'flex [flex-direction:column] gap-[2px]',
	'dashboard-library-list-item':
		'flex [align-items:center] gap-[12px] p-[6px_10px] rounded-[var(--board-radius-sm,_6px)] [cursor:pointer] [&:hover]:[background:var(--board-bg-card-hover,_var(--board-p2-color-8))]',
	'dashboard-library-table':
		'w-[100%] [border-collapse:collapse] [font-size:0.75em] [&_th]:[text-align:left] [&_th]:p-[6px_10px] [&_th]:[font-weight:600] [&_th]:[color:var(--muted-foreground,_var(--text-muted))] [&_th]:[border-bottom:1px_solid_var(--border,_var(--board-p2-color-10))] [&_th]:[font-size:0.6875em] [&_th]:[text-transform:uppercase] [&_th]:[letter-spacing:0.5px] [&_th]:[cursor:pointer] [&_th]:whitespace-nowrap [&_th:hover]:[color:var(--foreground,_var(--text-normal))] [&_td]:p-[6px_10px] [&_td]:[color:var(--foreground,_var(--text-normal))] [&_td]:[border-bottom:1px_solid_var(--border,_var(--board-p2-color-20))] [&_td]:[overflow:hidden] [&_td]:[text-overflow:ellipsis] [&_td]:whitespace-nowrap [&_td]:max-w-[200px] [&_tr]:[cursor:pointer] [&_tbody_tr:hover]:[background:var(--board-bg-card-hover,_var(--board-p2-color-8))] [&_tr:hover_.dashboard-library-table-delete]:[opacity:1]',
	'dashboard-library-table-edit-input':
		'w-[100%] p-[2px_4px] [border:1px_solid_var(--board-accent,_var(--interactive-accent))] rounded-[3px] [background:var(--muted,_var(--board-p2-color-12))] [color:var(--foreground,_var(--text-normal))] [font-size:0.75em] [box-sizing:border-box]',
	'dashboard-library-config-section-title':
		'[font-size:0.8125em] [font-weight:600] [color:var(--foreground,_var(--text-normal))] [margin-bottom:8px]',
	'dashboard-library-config-filters': 'flex [flex-direction:column] gap-[8px]',
	'dashboard-library-config-inline-row': 'flex [align-items:center] gap-[8px] [margin-top:6px]',
	'dashboard-library-config-inline-label': '[font-size:0.75em] [color:var(--foreground,_var(--text-normal))]',
	'dashboard-library-config-number':
		'w-[64px] h-[26px] p-[0_6px] [box-sizing:border-box] [font-size:0.75em] [background:var(--muted,_var(--background-modifier-form-field))] [border:1px_solid_var(--border,_var(--background-modifier-border))] rounded-[var(--board-radius-sm,_6px)] [color:var(--foreground,_var(--text-normal))]',
	'dashboard-library-filter-property':
		'p-[4px_8px] [border:1px_solid_var(--input,_var(--board-p2-color-10))] rounded-[var(--board-radius-sm,_6px)] [background:var(--board-bg-card,_var(--board-p2-color-11))] [color:var(--foreground,_var(--text-normal))] [font-size:0.75em] max-w-[200px] [&:focus]:[border-color:var(--ring,_var(--interactive-accent))] h-[30px]',
	'dashboard-library-filter-chip':
		'p-[2px_8px] rounded-[10px] [font-size:0.6875em] [background:var(--secondary,_var(--board-p2-color-13))] [color:var(--muted-foreground,_var(--text-muted))] [cursor:pointer] motion-safe:[transition:_transform_0.1s_ease] [border:1px_solid_transparent] [&:hover]:[border-color:var(--board-accent,_var(--interactive-accent))] [&.active]:[background:var(--board-accent,_var(--interactive-accent))] [&.active]:[color:var(--primary-foreground)] [&.active]:[border-color:var(--board-accent,_var(--interactive-accent))]',
	'dashboard-library-filter-empty':
		'[font-size:0.6875em] [color:var(--muted-foreground,_var(--text-muted))] p-[2px_4px]',
	'dashboard-modal-header': 'flex [align-items:center] [justify-content:space-between] [margin-bottom:16px]',
	'dashboard-modal-title': '[font-size:1em] [font-weight:600]',
	'dashboard-alltasks-exclude-chips': 'flex [flex-wrap:wrap] gap-[6px] [margin-bottom:8px]',
	'dashboard-alltasks-exclude-chip':
		'inline-flex [align-items:center] gap-[4px] [font-size:0.75em] p-[2px_8px] rounded-[999px] [background:var(--accent,_var(--board-p2-color-10))] [color:var(--foreground,_var(--text-normal))]',
	'dashboard-alltasks-exclude-chip-x':
		'[cursor:pointer] [opacity:0.6] [font-weight:700] [&:hover]:[opacity:1] [&:hover]:[color:var(--destructive)]',
	'dashboard-dataview-validation':
		'min-h-[18px] [font-size:11.5px] [&.is-error]:[color:var(--text-error,_var(--destructive))]',
	'dashboard-rss-cfg-list': 'flex [flex-direction:column] gap-[8px] [margin-bottom:8px]',
	'dashboard-rss-cfg-row':
		'flex [align-items:center] gap-[8px] [&.is-error_.dashboard-rss-cfg-url]:[border-color:var(--destructive)]',
	'dashboard-rss-cfg-groups': 'flex [flex-direction:column] gap-[6px] [margin-bottom:8px]',
	'dashboard-rss-cfg-group-row':
		'flex [align-items:center] gap-[8px] p-[4px_8px] rounded-[var(--board-radius-sm)] [background:var(--accent)]',
	'dashboard-rss-cfg-group-name':
		'[flex:1] min-w-[0] [font-size:12px] [color:var(--foreground)] [overflow:hidden] [text-overflow:ellipsis] whitespace-nowrap',
	'dashboard-rss-cfg-group-remove': '[&_svg]:w-[14px] [&_svg]:h-[14px] [&_svg]:[flex-shrink:0]',
	'dashboard-rss-cfg-group-add-row': 'flex [align-items:center] gap-[8px]',
	'dashboard-rss-cfg-group-add-input': '[flex:1] min-w-[0] h-[30px]',
	'dashboard-rss-cfg-group-select': '[flex:0_0_auto] max-w-[130px]',
	'dashboard-rss-cfg-groupby-row': 'flex [align-items:center] gap-[8px] [margin-bottom:8px]',
	'dashboard-rss-cfg-groupby-label': '[font-size:12px] [color:var(--muted-foreground)] [flex-shrink:0]',
	'dashboard-rss-cfg-groupby-select': '[flex:0_0_auto]',
	'dashboard-rss-cfg-opml-row': 'flex [align-items:center] [justify-content:flex-end] gap-[8px] [margin-top:6px]',
	'dashboard-rss-cfg-opml-btn': '[font-size:12px]',
	'dashboard-rss-cfg-name': '[flex:0_0_24%] min-w-[0] h-[34px]',
	'dashboard-rss-cfg-url': '[flex:1] min-w-[0] h-[34px]',
	'dashboard-rss-cfg-status':
		'[flex-shrink:0] [font-size:10.5px] p-[1px_7px] rounded-[999px] whitespace-nowrap max-w-[88px] [overflow:hidden] [text-overflow:ellipsis] [cursor:help] [&.is-error]:[color:var(--destructive)] [&.is-error]:[background:color-mix(in_srgb,_var(--destructive)_12%,_transparent)] [&.is-error]:[border:1px_solid_color-mix(in_srgb,_var(--destructive)_30%,_transparent)]',
	'dashboard-rss-cfg-remove':
		'inline-flex [align-items:center] [justify-content:center] w-[34px] h-[34px] [flex-shrink:0] p-[0] [border:none] rounded-[var(--board-radius-sm)] [background:transparent] [box-shadow:none] [color:var(--board-text-faint)] [cursor:pointer] [&:hover]:[color:var(--destructive)] [&:hover]:[background:var(--accent)] [&_svg]:w-[18px] [&_svg]:h-[18px] [&_svg]:[flex-shrink:0]',
	'dashboard-rss-cfg-add': '[margin-top:4px]',
};
export function p2Classes(names: string | undefined): string {
	return cn(...(names ?? '').split(/\s+/).flatMap((name) => [name, layout[name]]));
}
