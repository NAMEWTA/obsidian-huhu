import type { Category } from '../types';
export interface IconicSettings {
	biggerIcons: string;
	clickableIcons: string;
	showAllFileIcons: boolean;
	showAllFolderIcons: boolean;
	minimalFolderIcons: boolean;
	/** HUHU addition: files and folders without a custom icon show the default file-type icon table. */
	showDefaultFileTypeIcons: boolean;
	/** HUHU addition: folders without a custom color take the color of their top-level folder (one palette color per top-level folder). */
	colorTopFolders: boolean;
	showMarkdownTabIcons: boolean;
	showTitleIcons: boolean;
	showTagPillIcons: boolean;
	showMenuActions: boolean;
	showSuggestionIcons: boolean;
	showQuickSwitcherIcons: boolean;
	showMoveFileIcons: boolean;
	showItemName: string;
	useSearchKeywords: string;
	maxSearchResults: number;
	colorPicker1: string;
	colorPicker2: string;
	uncolorHover: boolean;
	uncolorDrag: boolean;
	uncolorSelect: boolean;
	uncolorQuick: boolean;
	maxBackups: number;
	dialogState: {
		iconMode: boolean;
		emojiMode: boolean;
		rulePage: Category;
	};
	appIcons: Record<string, { icon?: string; color?: string }>;
	tabIcons: Record<string, { icon?: string; color?: string }>;
	fileIcons: Record<string, { icon?: string; color?: string }>;
	bookmarkIcons: Record<string, { icon?: string; color?: string }>;
	tagIcons: Record<string, { icon?: string; color?: string }>;
	propertyIcons: Record<string, { icon?: string; color?: string }>;
	ribbonIcons: Record<string, { icon?: string; color?: string }>;
	fileRules: Array<{
		id?: string;
		name?: string;
		icon?: string;
		color?: string;
		match?: string;
		conditions?: Array<{
			source?: string;
			operator?: string;
			value?: string;
		}>;
		enabled?: boolean;
	}>;
	folderRules: Array<{
		id?: string;
		name?: string;
		icon?: string;
		color?: string;
		match?: string;
		conditions?: Array<{
			source?: string;
			operator?: string;
			value?: string;
		}>;
		enabled?: boolean;
	}>;
}

export const DEFAULT_ICONIC_SETTINGS: IconicSettings = {
	biggerIcons: 'mobile',
	clickableIcons: 'desktop',
	showAllFileIcons: false,
	showAllFolderIcons: false,
	minimalFolderIcons: true,
	showDefaultFileTypeIcons: true,
	colorTopFolders: true,
	showMarkdownTabIcons: true,
	showTitleIcons: true,
	showTagPillIcons: false,
	showMenuActions: true,
	showSuggestionIcons: false,
	showQuickSwitcherIcons: true,
	showMoveFileIcons: true,
	showItemName: 'desktop',
	useSearchKeywords: 'on',
	maxSearchResults: 100,
	colorPicker1: 'list',
	colorPicker2: 'rgb',
	uncolorHover: false,
	uncolorDrag: false,
	uncolorSelect: false,
	uncolorQuick: false,
	maxBackups: 2,
	dialogState: {
		iconMode: true,
		emojiMode: false,
		rulePage: 'file',
	},
	appIcons: {},
	tabIcons: {},
	fileIcons: {},
	bookmarkIcons: {},
	tagIcons: {},
	propertyIcons: {},
	ribbonIcons: {},
	fileRules: [],
	folderRules: [],
};
