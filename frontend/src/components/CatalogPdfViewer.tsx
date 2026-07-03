import { Fragment, useEffect, useRef, useState, useCallback } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassMinusIcon, MagnifyingGlassPlusIcon } from '@heroicons/react/24/outline'
import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString()

const API_URL =
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? 'http://localhost:5002/api' : '/api')
const CATALOG_PDF_URL = `${API_URL}/products/catalog-pdf/`
const CATALOG_PAGES_URL = `${API_URL}/products/catalog-pdf/pages/`
const REFERENCE_NORMALISE_RE = /[^0-9a-z]/gi
const SCALE = 1.5
const PAGE_GAP = 8
const PRELOAD_RADIUS = 2
const MIN_ZOOM = 0.5
const MAX_ZOOM = 1.8
const ZOOM_STEP = 0.1
const MOBILE_DEFAULT_ZOOM = 0.62

interface Props {
    open: boolean
    onClose: () => void
    reference?: string
    pdfUrl?: string
    title?: string
}

function catalogDebug(message: string, details?: unknown) {
    if (import.meta.env.DEV) {
        console.debug(`[CatalogPdfViewer] ${message}`, details ?? '')
    }
}

function waitForContainer(
    getContainer: () => HTMLDivElement | null,
    isCancelled: () => boolean,
): Promise<HTMLDivElement | null> {
    return new Promise((resolve) => {
        let attempts = 0

        const check = () => {
            const container = getContainer()
            if (container || isCancelled() || attempts >= 20) {
                resolve(container)
                return
            }
            attempts += 1
            window.setTimeout(check, 0)
        }

        check()
    })
}

async function fetchMatchPages(reference: string, includeCompatible = false): Promise<number[]> {
    const params = new URLSearchParams({ reference })
    if (includeCompatible) params.set('include_compatible', '1')
    const url = `${CATALOG_PAGES_URL}?${params.toString()}`
    catalogDebug('fetch match pages', { reference, url })
    const res = await fetch(url, {
        credentials: 'include',
    })
    if (!res.ok) {
        catalogDebug('match pages request failed', { status: res.status })
        return []
    }
    const data = await res.json() as { pages: number[] }
    catalogDebug('match pages response', data)
    return data.pages ?? []
}

function normaliseReference(value: string): string {
    return value.replace(REFERENCE_NORMALISE_RE, '').toLowerCase()
}

function pageTextContainsReference(pageText: string, reference: string): boolean {
    return pageText.includes(reference) || normaliseReference(pageText).includes(normaliseReference(reference))
}

function getInitialZoom(): number {
    if (typeof window !== 'undefined' && window.innerWidth <= 640) {
        return MOBILE_DEFAULT_ZOOM
    }
    return 1
}

export default function CatalogPdfViewer({ open, onClose, reference = '', pdfUrl, title = 'Katalóg produktov' }: Props) {
    const containerRef = useRef<HTMLDivElement>(null)
    const pageDivsRef = useRef<HTMLDivElement[]>([])
    const pdfDocRef = useRef<PDFDocumentProxy | null>(null)
    const renderedPagesRef = useRef(new Set<number>())
    const renderingPagesRef = useRef(new Set<number>())
    const observerRef = useRef<IntersectionObserver | null>(null)
    const currentPageRef = useRef(1)
    const pdfSourceKeyRef = useRef('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [matchPages, setMatchPages] = useState<number[]>([])
    const [currentIdx, setCurrentIdx] = useState(0)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(0)
    const [searchComplete, setSearchComplete] = useState(false)
    const [zoom, setZoom] = useState(getInitialZoom)

    const scrollToPage = useCallback((pageNum: number) => {
        const div = pageDivsRef.current[pageNum - 1]
        if (div) div.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, [])

    const renderPageIntoDiv = useCallback(async (pdfDoc: PDFDocumentProxy, pageNum: number, pageDiv: HTMLDivElement) => {
        if (renderedPagesRef.current.has(pageNum) || renderingPagesRef.current.has(pageNum)) return
        renderingPagesRef.current.add(pageNum)
        const page = await pdfDoc.getPage(pageNum)
        const viewport = page.getViewport({ scale: SCALE * zoom })

        pageDiv.style.cssText = `position:relative;width:${viewport.width}px;height:${viewport.height}px;margin-bottom:${PAGE_GAP}px;flex-shrink:0`

        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        canvas.style.display = 'block'

        await page.render({ canvas, viewport }).promise
        pageDiv.innerHTML = ''
        pageDiv.appendChild(canvas)
        pageDiv.dataset.rendered = 'true'
        renderedPagesRef.current.add(pageNum)
        renderingPagesRef.current.delete(pageNum)
    }, [zoom])

    const renderDirectPageWindow = useCallback(async (pageNum: number) => {
        const pdfDoc = pdfDocRef.current
        if (!pdfDoc) return

        const start = Math.max(1, pageNum - PRELOAD_RADIUS)
        const end = Math.min(pdfDoc.numPages, pageNum + PRELOAD_RADIUS)
        await Promise.all(
            Array.from({ length: end - start + 1 }, (_, index) => {
                const targetPage = start + index
                const pageDiv = pageDivsRef.current[targetPage - 1]
                return pageDiv ? renderPageIntoDiv(pdfDoc, targetPage, pageDiv) : Promise.resolve()
            }),
        )
    }, [renderPageIntoDiv])

    const createPlaceholderForPage = useCallback((pageNum: number, width: number, height: number) => {
        const pageDiv = document.createElement('div')
        pageDiv.dataset.pageNum = String(pageNum)
        pageDiv.style.cssText = `position:relative;width:${width}px;height:${height}px;margin-bottom:${PAGE_GAP}px;flex-shrink:0;background:#fff;box-shadow:0 1px 3px rgba(15,23,42,0.12);display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:12px`
        pageDiv.textContent = `Strana ${pageNum}`
        return pageDiv
    }, [])

    useEffect(() => {
        if (!open || (!reference && !pdfUrl)) return

        let cancelled = false

        const run = async () => {
            const activePdfUrl = pdfUrl || CATALOG_PDF_URL
            const pdfSourceKey = `${activePdfUrl}|${reference}`
            const shouldPreservePage = pdfSourceKeyRef.current === pdfSourceKey
            if (!shouldPreservePage) {
                currentPageRef.current = 1
            }
            pdfSourceKeyRef.current = pdfSourceKey
            catalogDebug('open viewer', { reference, pdfUrl: activePdfUrl, pagesUrl: CATALOG_PAGES_URL })
            setLoading(true)
            setError(null)
            setMatchPages([])
            setCurrentIdx(0)
            setCurrentPage(currentPageRef.current)
            setTotalPages(0)
            setSearchComplete(false)
            pdfDocRef.current = null

            try {
                const container = await waitForContainer(
                    () => containerRef.current,
                    () => cancelled,
                )
                if (cancelled) return
                if (!container) {
                    throw new Error('Catalog PDF container was not mounted')
                }

                container.innerHTML = ''
                pageDivsRef.current = []
                renderedPagesRef.current.clear()
                renderingPagesRef.current.clear()
                observerRef.current?.disconnect()

                if (pdfUrl) {
                    const pdfDoc = await pdfjsLib.getDocument({ url: activePdfUrl }).promise
                    if (cancelled) return

                    pdfDocRef.current = pdfDoc
                    setTotalPages(pdfDoc.numPages)
                    const initialPage = Math.min(Math.max(currentPageRef.current, 1), pdfDoc.numPages)
                    currentPageRef.current = initialPage
                    setCurrentPage(initialPage)

                    const firstPage = await pdfDoc.getPage(1)
                    const firstViewport = firstPage.getViewport({ scale: SCALE * zoom })

                    const placeholders = Array.from(
                        { length: pdfDoc.numPages },
                        (_, index) => createPlaceholderForPage(index + 1, firstViewport.width, firstViewport.height),
                    )
                    if (cancelled) return

                    placeholders.forEach((pageDiv) => {
                        container.appendChild(pageDiv)
                    })
                    pageDivsRef.current = placeholders

                    const pageHeight = firstViewport.height + PAGE_GAP
                    container.scrollTop = (initialPage - 1) * pageHeight
                    const onScroll = () => {
                        const page = Math.min(
                            pdfDoc.numPages,
                            Math.max(1, Math.round(container.scrollTop / pageHeight) + 1),
                        )
                        currentPageRef.current = page
                        setCurrentPage(page)
                        void renderDirectPageWindow(page)
                    }
                    container.addEventListener('scroll', onScroll, { passive: true })

                    observerRef.current = new IntersectionObserver((entries) => {
                        entries.forEach((entry) => {
                            if (!entry.isIntersecting) return
                            const page = Number((entry.target as HTMLDivElement).dataset.pageNum)
                            if (!Number.isNaN(page)) {
                                void renderDirectPageWindow(page)
                            }
                        })
                    }, { root: container, rootMargin: '1200px 0px', threshold: 0.01 })
                    placeholders.forEach((pageDiv) => observerRef.current?.observe(pageDiv))

                    await renderDirectPageWindow(initialPage)

                    if (!cancelled) {
                        catalogDebug('catalog render complete', { title, totalPages: pdfDoc.numPages })
                        setLoading(false)
                        setSearchComplete(true)
                    }
                    return () => {
                        container.removeEventListener('scroll', onScroll)
                    }
                }

                const [pdfDoc, apiPages] = await Promise.all([
                    pdfjsLib.getDocument({ url: activePdfUrl, withCredentials: true }).promise,
                    fetchMatchPages(reference, true),
                ])

                if (cancelled) return
                catalogDebug('pdf loaded', { reference, pagesFromApi: apiPages, totalPages: pdfDoc.numPages })

                let pages = apiPages
                if (pages.length === 0) {
                    pages = []
                    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
                        if (cancelled) break

                        const page = await pdfDoc.getPage(pageNum)
                        const textContent = await page.getTextContent()
                        const pageText = textContent.items
                            .map((item) => 'str' in item ? item.str : '')
                            .join(' ')

                        if (pageTextContainsReference(pageText, reference)) {
                            pages.push(pageNum)
                        }
                    }
                }

                const matchSet = new Set(pages)
                const pagesToRender = pages.length > 0 ? pages : [1]

                for (const pageNum of pagesToRender) {
                    if (cancelled) break

                    const page = await pdfDoc.getPage(pageNum)
                    const viewport = page.getViewport({ scale: SCALE * zoom })

                    const pageDiv = document.createElement('div')
                    pageDiv.style.cssText = `position:relative;width:${viewport.width}px;height:${viewport.height}px;margin-bottom:${PAGE_GAP}px;flex-shrink:0`
                    pageDivsRef.current[pageNum - 1] = pageDiv

                    const canvas = document.createElement('canvas')
                    canvas.width = viewport.width
                    canvas.height = viewport.height
                    canvas.style.display = 'block'

                    await page.render({ canvas, viewport }).promise
                    if (cancelled) break

                    if (matchSet.has(pageNum)) {
                        // Yellow border highlight for matching pages
                        const overlay = document.createElement('div')
                        overlay.style.cssText = `position:absolute;inset:0;outline:4px solid rgba(250,204,21,0.9);outline-offset:-4px;pointer-events:none;box-shadow:inset 0 0 0 4px rgba(250,204,21,0.3)`
                        pageDiv.appendChild(canvas)
                        pageDiv.appendChild(overlay)

                        // Page number badge
                        const badge = document.createElement('div')
                        badge.textContent = `Strana ${pageNum}`
                        badge.style.cssText = 'position:absolute;top:6px;right:6px;background:rgba(250,204,21,0.95);color:#78350f;font-size:11px;font-weight:600;padding:2px 7px;border-radius:4px;pointer-events:none'
                        pageDiv.appendChild(badge)
                    } else {
                        pageDiv.appendChild(canvas)
                    }

                    container.appendChild(pageDiv)
                }

                if (!cancelled) {
                    catalogDebug('render complete', { reference, pages })
                    setMatchPages(pages)
                    setCurrentIdx(0)
                    setLoading(false)
                    setSearchComplete(true)
                    if (pages.length > 0) {
                        setTimeout(() => scrollToPage(pages[0]), 80)
                    }
                }
            } catch {
                if (!cancelled) {
                    catalogDebug('viewer failed', { reference })
                    setError('Nepodarilo sa načítať katalóg.')
                    setLoading(false)
                    setSearchComplete(true)
                }
            }
        }

        let cleanup: (() => void) | undefined
        let effectCleanedUp = false
        void run().then((result) => {
            if (effectCleanedUp) {
                result?.()
                return
            }
            cleanup = result
        })
        return () => {
            cancelled = true
            effectCleanedUp = true
            cleanup?.()
            observerRef.current?.disconnect()
            observerRef.current = null
        }
    }, [createPlaceholderForPage, open, pdfUrl, reference, renderDirectPageWindow, scrollToPage, title, zoom])

    const changeZoom = (delta: number) => {
        setZoom((current) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((current + delta).toFixed(2)))))
    }

    const goTo = (delta: number) => {
        if (matchPages.length === 0) return
        const next = (currentIdx + delta + matchPages.length) % matchPages.length
        setCurrentIdx(next)
        scrollToPage(matchPages[next])
    }

    const goToPdfPage = (pageNum: number) => {
        const pdfDoc = pdfDocRef.current
        if (!pdfDoc) return
        const next = Math.min(Math.max(pageNum, 1), pdfDoc.numPages)
        currentPageRef.current = next
        setCurrentPage(next)
        void renderDirectPageWindow(next)
        scrollToPage(next)
    }

    return (
        <Transition.Root show={open} as={Fragment}>
            <Dialog as="div" className="relative z-[60]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/70" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 flex flex-col">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-200"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-150"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                    >
                        <Dialog.Panel className="flex flex-col w-full h-full bg-gray-100">
                            {/* Header */}
                            <div className="relative z-20 flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200 flex-shrink-0">
                                <div className="flex items-center gap-3 min-w-0 flex-wrap">
                                    <Dialog.Title className="text-sm font-semibold text-gray-900 flex-shrink-0">
                                        {title}
                                    </Dialog.Title>
                                    {reference && (
                                        <span className="text-xs font-mono text-gray-500 truncate">
                                            {reference}
                                        </span>
                                    )}
                                    {searchComplete && !loading && matchPages.length === 0 && reference && !error && (
                                        <span className="text-xs text-amber-600 flex-shrink-0">
                                            Žiadna zhoda v katalógu
                                        </span>
                                    )}
                                    {matchPages.length > 0 && (
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <button
                                                onClick={() => goTo(-1)}
                                                className="p-1 rounded hover:bg-gray-100"
                                                aria-label="Predchádzajúca zhoda"
                                            >
                                                <ChevronLeftIcon className="h-4 w-4 text-gray-600" />
                                            </button>
                                            <span className="text-xs text-gray-600 tabular-nums w-20 text-center">
                                                {currentIdx + 1} / {matchPages.length}{matchPages.length > 0 && ` (s. ${matchPages[currentIdx]})`}
                                            </span>
                                            <button
                                                onClick={() => goTo(1)}
                                                className="p-1 rounded hover:bg-gray-100"
                                                aria-label="Nasledujúca zhoda"
                                            >
                                                <ChevronRightIcon className="h-4 w-4 text-gray-600" />
                                            </button>
                                        </div>
                                    )}
                                    {pdfUrl && totalPages > 0 && (
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <button
                                                onClick={() => { void goToPdfPage(currentPage - 1) }}
                                                className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
                                                aria-label="Predchádzajúca strana"
                                                disabled={currentPage <= 1 || loading}
                                            >
                                                <ChevronLeftIcon className="h-4 w-4 text-gray-600" />
                                            </button>
                                            <span className="text-xs text-gray-600 tabular-nums w-20 text-center">
                                                {currentPage} / {totalPages}
                                            </span>
                                            <button
                                                onClick={() => { void goToPdfPage(currentPage + 1) }}
                                                className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
                                                aria-label="Nasledujúca strana"
                                                disabled={currentPage >= totalPages || loading}
                                            >
                                                <ChevronRightIcon className="h-4 w-4 text-gray-600" />
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => changeZoom(-ZOOM_STEP)}
                                            className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
                                            aria-label="Oddialiť PDF"
                                            disabled={zoom <= MIN_ZOOM || loading}
                                        >
                                            <MagnifyingGlassMinusIcon className="h-4 w-4 text-gray-600" />
                                        </button>
                                        <span className="text-xs text-gray-600 tabular-nums w-12 text-center">
                                            {Math.round(zoom * 100)}%
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => changeZoom(ZOOM_STEP)}
                                            className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
                                            aria-label="Priblížiť PDF"
                                            disabled={zoom >= MAX_ZOOM || loading}
                                        >
                                            <MagnifyingGlassPlusIcon className="h-4 w-4 text-gray-600" />
                                        </button>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    aria-label="Zatvoriť katalóg"
                                    className="relative z-30 ml-4 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
                                >
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                            </div>

                            {/* PDF area */}
                            <div className="flex-1 overflow-hidden relative">
                                {loading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                                        <div className="text-center">
                                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2196f3] mx-auto mb-3" />
                                            <p className="text-sm text-gray-500">Načítavam katalóg…</p>
                                        </div>
                                    </div>
                                )}
                                {error && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <p className="text-sm text-red-600">{error}</p>
                                    </div>
                                )}
                                <div
                                    ref={containerRef}
                                    className="h-full overflow-auto flex flex-col items-center py-4"
                                />
                            </div>
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition.Root>
    )
}
