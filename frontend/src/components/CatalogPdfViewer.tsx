import { Fragment, useEffect, useRef, useState, useCallback } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import * as pdfjsLib from 'pdfjs-dist'

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

interface Props {
    open: boolean
    onClose: () => void
    reference: string
}

function catalogDebug(message: string, details?: unknown) {
    if (import.meta.env.DEV) {
        console.debug(`[CatalogPdfViewer] ${message}`, details ?? '')
    }
}

async function fetchMatchPages(reference: string): Promise<number[]> {
    const url = `${CATALOG_PAGES_URL}?reference=${encodeURIComponent(reference)}`
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

export default function CatalogPdfViewer({ open, onClose, reference }: Props) {
    const containerRef = useRef<HTMLDivElement>(null)
    const pageDivsRef = useRef<HTMLDivElement[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [matchPages, setMatchPages] = useState<number[]>([])
    const [currentIdx, setCurrentIdx] = useState(0)
    const [searchComplete, setSearchComplete] = useState(false)

    const scrollToPage = useCallback((pageNum: number) => {
        const div = pageDivsRef.current[pageNum - 1]
        if (div) div.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, [])

    useEffect(() => {
        if (!open || !reference) return

        let cancelled = false

        const run = async () => {
            const container = containerRef.current
            if (!container) return

            setLoading(true)
            setError(null)
            setMatchPages([])
            setCurrentIdx(0)
            setSearchComplete(false)
            container.innerHTML = ''
            pageDivsRef.current = []

            try {
                const [pdfDoc, apiPages] = await Promise.all([
                    pdfjsLib.getDocument({ url: CATALOG_PDF_URL, withCredentials: true }).promise,
                    fetchMatchPages(reference),
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
                    const viewport = page.getViewport({ scale: SCALE })

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
                    setError('Nepodarilo sa načítať katalóg.')
                    setLoading(false)
                    setSearchComplete(true)
                }
            }
        }

        void run()
        return () => { cancelled = true }
    }, [open, reference, scrollToPage])

    const goTo = (delta: number) => {
        if (matchPages.length === 0) return
        const next = (currentIdx + delta + matchPages.length) % matchPages.length
        setCurrentIdx(next)
        scrollToPage(matchPages[next])
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
                            <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200 flex-shrink-0">
                                <div className="flex items-center gap-4 min-w-0">
                                    <Dialog.Title className="text-sm font-semibold text-gray-900 flex-shrink-0">
                                        Katalóg produktov
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
                                </div>
                                <button
                                    onClick={onClose}
                                    className="ml-4 flex-shrink-0 p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
                                >
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                            </div>

                            {/* PDF area */}
                            <div className="flex-1 overflow-hidden relative">
                                {loading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                                        <div className="text-center">
                                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-600 mx-auto mb-3" />
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
                                    className="h-full overflow-y-auto flex flex-col items-center py-4"
                                />
                            </div>
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition.Root>
    )
}
