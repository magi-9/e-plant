import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as pdfjsLib from 'pdfjs-dist'
import CatalogPdfViewer from './CatalogPdfViewer'

vi.mock('pdfjs-dist', () => ({
    GlobalWorkerOptions: {},
    getDocument: vi.fn(),
}))

let latestIntersectionCallback: IntersectionObserverCallback | null = null

class MockIntersectionObserver {
    observe = vi.fn()
    disconnect = vi.fn()
    unobserve = vi.fn()

    constructor(callback: IntersectionObserverCallback) {
        latestIntersectionCallback = callback
    }
}

const mockPage = {
    getViewport: vi.fn(() => ({ width: 120, height: 180 })),
    getTextContent: vi.fn(async () => ({ items: [] })),
    render: vi.fn(() => ({ promise: Promise.resolve() })),
}

describe('CatalogPdfViewer', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        latestIntersectionCallback = null
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
        cleanup()
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
        const getPage = vi.fn(async () => mockPage)
        const onClose = vi.fn()
        vi.mocked(pdfjsLib.getDocument).mockReturnValue({
            promise: Promise.resolve({
                numPages: 3,
                getPage,
            }),
        } as unknown as ReturnType<typeof pdfjsLib.getDocument>)

        render(
            <CatalogPdfViewer
                open
                onClose={onClose}
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
        expect(getPage).toHaveBeenCalledWith(1)
        expect(getPage).toHaveBeenCalledWith(2)
        expect(getPage).toHaveBeenCalledWith(3)

        fireEvent.click(screen.getByLabelText('Nasledujúca strana'))

        await waitFor(() => {
            expect(screen.getByText('2 / 3')).toBeTruthy()
        })

        fireEvent.click(screen.getByLabelText('Zatvoriť katalóg'))
        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('lazy-renders nearby pages when a later page intersects', async () => {
        const getPage = vi.fn(async () => mockPage)
        vi.mocked(pdfjsLib.getDocument).mockReturnValue({
            promise: Promise.resolve({
                numPages: 8,
                getPage,
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
            expect(screen.getByText('1 / 8')).toBeTruthy()
        })

        const pageSix = document.querySelector('[data-page-num="6"]')
        expect(pageSix).toBeTruthy()

        latestIntersectionCallback?.([
            { isIntersecting: true, target: pageSix as Element } as IntersectionObserverEntry,
        ], {} as IntersectionObserver)

        await waitFor(() => {
            expect(getPage).toHaveBeenCalledWith(8)
        })
        expect(getPage).toHaveBeenCalledWith(4)
        expect(getPage).toHaveBeenCalledWith(5)
        expect(getPage).toHaveBeenCalledWith(6)
        expect(getPage).toHaveBeenCalledWith(7)
    })
})
