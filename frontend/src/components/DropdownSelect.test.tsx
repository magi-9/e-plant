import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DropdownSelect from './DropdownSelect';

beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class {
        observe() {}
        unobserve() {}
        disconnect() {}
    });
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('DropdownSelect', () => {
    it('closes on an outside click without blocking the clicked action', async () => {
        const user = userEvent.setup();
        const outsideAction = vi.fn();

        render(
            <div>
                <DropdownSelect
                    value=""
                    onChange={() => undefined}
                    placeholder="Vyberte"
                    options={[{ value: 'one', label: 'Prvá možnosť' }]}
                />
                <button type="button" onClick={outsideAction}>Iná akcia</button>
            </div>
        );

        await user.click(screen.getByRole('button', { name: /vyberte/i }));
        expect(screen.getByRole('option', { name: /prvá možnosť/i })).toBeTruthy();

        await user.click(screen.getByRole('button', { name: /iná akcia/i }));

        expect(outsideAction).toHaveBeenCalledOnce();
        await waitFor(() => {
            expect(screen.queryByRole('option', { name: /prvá možnosť/i })).toBeNull();
        });
    });
});
