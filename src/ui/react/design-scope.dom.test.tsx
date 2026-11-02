import { StrictMode } from 'react';
import { act, render, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OwnerDocumentContext, PortalContainerContext, usePortalContainer } from './contexts';
import { DesignScope, useDesignNotice } from './design-scope';
import { TestProviders } from './test-providers';
import { toast } from '../components/sonner';

function PortalOwner() {
	const portal = usePortalContainer();
	return <output data-testid="owner">{portal.className}</output>;
}

describe('DesignScope product boundary', () => {
	it('namespaces notice IDs and dismisses only the closed region, including late callbacks', () => {
		const wrapper = ({ children }: { children: React.ReactNode }) => <TestProviders><DesignScope>{children}</DesignScope></TestProviders>;
		const first = renderHook(useDesignNotice, { wrapper });
		const second = renderHook(useDesignNotice, { wrapper });
		let one: string | number | undefined;
		let two: string | number | undefined;
		act(() => {
			toast('Global', { id: 'same', duration: Infinity });
			one = first.result.current('One', { id: 'same', duration: Infinity });
			two = second.result.current('Two', { id: 'same', duration: Infinity });
		});
		expect(one).not.toBe(two);
		expect(one).not.toBe('same');
		const late = first.result.current;
		first.unmount();
		expect(late('Late completion')).toBeUndefined();
		expect(toast.getToasts().map(item => item.id)).toEqual(expect.arrayContaining(['same', two]));
		expect(toast.getToasts().some(item => item.id === one)).toBe(false);
		second.unmount();
		expect(toast.getToasts().some(item => item.id === two)).toBe(false);
		act(() => { toast.dismiss('same'); });
	});
	it('keeps portals in the owning document and releases windows independently', () => {
		const frame = document.createElement('iframe');
		document.body.append(frame);
		const other = frame.contentDocument!;
		const main = render(<OwnerDocumentContext.Provider value={document}><DesignScope><PortalOwner /></DesignScope></OwnerDocumentContext.Provider>);
		const second = render(<OwnerDocumentContext.Provider value={other}><DesignScope><PortalOwner /></DesignScope></OwnerDocumentContext.Provider>, { container: other.body });
		expect(document.querySelectorAll('.huhu-design.huhu-portal-root')).toHaveLength(1);
		expect(other.querySelectorAll('.huhu-design.huhu-portal-root')).toHaveLength(1);
		main.unmount();
		expect(document.querySelector('.huhu-design.huhu-portal-root')).toBeNull();
		expect(other.querySelector('.huhu-design.huhu-portal-root')?.isConnected).toBe(true);
		second.unmount();
		expect(other.querySelector('.huhu-design.huhu-portal-root')).toBeNull();
		frame.remove();
	});
	it('isolates its portal from existing consumers and removes only its own portal', () => {
		const existing = document.createElement('div');
		existing.className = 'huhu-ui huhu-portal-root';
		document.body.append(existing);
		const view = render(
			<StrictMode>
				<OwnerDocumentContext.Provider value={document}>
					<PortalContainerContext.Provider value={existing}>
						<DesignScope><PortalOwner /></DesignScope>
						<PortalOwner />
					</PortalContainerContext.Provider>
				</OwnerDocumentContext.Provider>
			</StrictMode>,
		);
		expect(view.getAllByTestId('owner').map((el) => el.textContent)).toEqual([
			'huhu-ui huhu-design huhu-portal-root', 'huhu-ui huhu-portal-root',
		]);
		expect(document.querySelectorAll('.huhu-design.huhu-portal-root')).toHaveLength(1);
		view.unmount();
		expect(document.querySelector('.huhu-design.huhu-portal-root')).toBeNull();
		expect(existing.isConnected).toBe(true);
		existing.remove();
	});
});
