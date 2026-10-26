import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { TestProviders } from '../../../ui/react/test-providers';
import { t } from '../../../shared/i18n';
import { BrowserWorkspace } from './BrowserWorkspace';
import { workspaceFixture } from './testing/workspace';
vi.mock('./SpaceViewer',()=>({SpaceViewer:()=> <div data-testid="shared-viewer" />}));

it('requires explicit temporary-storage consent and records it before creating an ephemeral Space',async()=>{
	const f=workspaceFixture();f.set({...f.api.getState(),persistence:'unavailable'});
	render(<TestProviders><BrowserWorkspace api={f.api} selection={{}} onSelect={vi.fn()} navigationRevision={0}/></TestProviders>);
	fireEvent.click(screen.getByRole('button',{name:t('browser.v2.newSpace')}));
	fireEvent.change(screen.getByLabelText(t('browser.v2.name')),{target:{value:'Temporary research'}});
	const create=screen.getByRole('button',{name:t('browser.v2.create')}) as HTMLButtonElement;
	expect(create.disabled).toBe(true);expect(f.api.consentEphemeral).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole('checkbox',{name:t('browser.v2.ephemeralConsent')}));fireEvent.click(create);
	await waitFor(()=>expect(f.api.createSpace).toHaveBeenCalledWith(expect.objectContaining({ephemeral:true,label:'Temporary research'})));
	expect(vi.mocked(f.api.consentEphemeral).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(f.api.createSpace).mock.invocationCallOrder[0]!);
});
it('authorizes upload files explicitly for the currently running Agent, never an ambient human lease',async()=>{
	const f=workspaceFixture(),state=f.api.getState();f.set({...state,spaces:[{...state.spaces[0]!,control:{mode:'agent',epoch:2}}]});
	render(<TestProviders><BrowserWorkspace api={f.api} selection={{spaceId:'space',pageId:'page'}} onSelect={vi.fn()} navigationRevision={0}/></TestProviders>);
	fireEvent.mouseDown(screen.getByRole('tab',{name:t('browser.v2.files')}),{button:0,ctrlKey:false});
	fireEvent.click(await screen.findByRole('button',{name:t('browser.v2.chooseAgentUpload')}));
	await waitFor(()=>expect(f.api.chooseUpload).toHaveBeenCalledWith('space','agent'));
});
