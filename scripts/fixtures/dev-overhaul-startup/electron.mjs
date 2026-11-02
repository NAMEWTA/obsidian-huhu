// External UI actions must never occur during the isolated activation sample.
export const shell = {
	openPath: async () => { throw new Error('Unexpected external file open during activation'); },
	showItemInFolder: () => { throw new Error('Unexpected reveal during activation'); },
	trashItem: async () => { throw new Error('Unexpected trash during activation'); },
};
export const webUtils = { getPathForFile: () => '' };
