import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as pdfjsLib from 'pdfjs-dist'
import CatalogPdfViewer from './CatalogPdfViewer'

vi.mock('pdfjs-dist', () => ({
    GlobalWorkerOptions: {},
    getDocument: vi.fn(),
}))

class MockIntersectionObserver {
    observe = vi.fn()
    disconnect = vi.fn()
    unobserve = vi.fn()
}

const mockPage = {
    getViewport: vi.fn(() => ({ width: 120, height: 180 })),
    getTextContent: vi.fn(async () => ({ items: [] })),
    render: vi.fn(() => ({ promise: Promise.resolve() })),
}

describe('CatalogPdfViewer', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        window.HTMLElement.prototype.scrollIntoView = vi.fn()
        vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
        vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ({ pages: [177] }),
        } as Response)
        vi.mocked(pdfjsLib.getDocument).mockReturnValue({
            promise: Promise.resolve({
                numPages: 220,
                getPage: vi.fn(async () => mockPage),
            }),
        } as unknown as ReturnType<typeof pdfjsLib.getDocument>)
    })

    afterEach(() => {
        vi.restoreAllMocks()
        vi.unstubAllGlobals()
    })

    it('shows backend match pages instead of a no-match message', async () => {
        render(
            <CatalogPdfViewer
                open
                onClose={vi.fn()}
                reference="50.315.081.01-2"
            />,
        )

        expect(screen.queryByText('Žiadna zhoda v katalógu')).toBeNull()

        await waitFor(() => {
            expect(screen.getByText('1 / 1 (s. 177)')).toBeTruthy()
        })

        expect(screen.queryByText('Žiadna zhoda v katalógu')).toBeNull()
        expect(screen.getByText('Strana 177')).toBeTruthy()
        expect(document.querySelector('[data-testid="catalog-reference-highlight"]')).toBeNull()
        expect(globalThis.fetch).toHaveBeenCalledWith(
            'http://localhost:5002/api/products/catalog-pdf/pages/?reference=50.315.081.01-2',
            { credentials: 'include' },
        )
    })

    it('opens a direct catalog PDF without reference lookup', async () => {
        vi.mocked(pdfjsLib.getDocument).mockReturnValue({
            promise: Promise.resolve({
                numPages: 3,
                getPage: vi.fn(async () => mockPage),
            }),
        } as unknown as ReturnType<typeof pdfjsLib.getDocument>)

        render(
            <CatalogPdfViewer
                open
                onClose={vi.fn()}
                pdfUrl="/catalogs/test.pdf"
                title="Test katalóg"
            />,
        )

        await waitFor(() => {
            expect(screen.getByText('1 / 3')).toBeTruthy()
        })

        expect(screen.getByText('Test katalóg')).toBeTruthy()
        expect(globalThis.fetch).not.toHaveBeenCalled()
        expect(pdfjsLib.getDocument).toHaveBeenCalledWith({ url: '/catalogs/test.pdf' })

        fireEvent.click(screen.getByLabelText('Nasledujúca strana'))

        await waitFor(() => {
            expect(screen.getByText('2 / 3')).toBeTruthy()
        })
    })
})
