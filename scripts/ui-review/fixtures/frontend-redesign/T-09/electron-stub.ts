/** Browser linkage only; this fixture never performs Electron or system-file actions. */
const unavailable = (): never => {
	throw new Error('Electron system APIs are unavailable in this browser-only UI fixture');
};

export const shell = {
	openPath: unavailable,
	showItemInFolder: unavailable,
	trashItem: unavailable,
};
export const webUtils = { getPathForFile: unavailable };
