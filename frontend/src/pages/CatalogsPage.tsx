import { useState } from 'react';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import CatalogPdfViewer from '../components/CatalogPdfViewer';

type Catalog = {
    title: string;
    description: string;
    imageUrl: string;
    pdfUrl: string;
};

const catalogs: Catalog[] = [
    {
        title: 'DAS Guided Surgical Kit 2026',
        description: 'Univerzálny guided surgical kit katalóg.',
        imageUrl: '/catalogs/guided-kit-universal.png',
        pdfUrl: '/catalogs/DAS-GUIDED-SURGICAL-KIT-2026_01_EN_DIGITAL.pdf',
    },
    {
        title: 'Guided Surgical Work Offsets',
        description: 'Katalóg offsetov pre surgical guided workflow.',
        imageUrl: '/catalogs/guided-kit-work-offsets.png',
        pdfUrl: '/catalogs/CATALOGO-OFFSETS-SURGICAL-GUIDED_2023_02.pdf',
    },
    {
        title: 'Product References 03/26',
        description: 'Prehľad produktových referencií.',
        imageUrl: '/catalogs/product-references.png',
        pdfUrl: '/catalogs/PRODUCT-REFERENCE-0326_01.pdf',
    },
];

export default function CatalogsPage() {
    const [selectedCatalog, setSelectedCatalog] = useState<Catalog | null>(null);

    return (
        <main className="min-h-screen bg-slate-50 pt-16">
            <section className="border-b border-slate-200 bg-white">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1565c0]">PDF katalógy</p>
                            <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-950">Katalógy</h1>
                        </div>
                        <DocumentTextIcon className="hidden sm:block h-9 w-9 text-[#1565c0]" />
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {catalogs.map((catalog) => (
                        <button
                            key={catalog.pdfUrl}
                            type="button"
                            onClick={() => setSelectedCatalog(catalog)}
                            className="group overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[rgba(33,150,243,0.4)] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#2196f3] focus:ring-offset-2"
                        >
                            <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
                                <img
                                    src={catalog.imageUrl}
                                    alt={catalog.title}
                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    loading="lazy"
                                />
                            </div>
                            <div className="p-4 sm:p-5">
                                <h2 className="text-base font-bold text-slate-950">{catalog.title}</h2>
                                <p className="mt-1.5 text-sm text-slate-500">{catalog.description}</p>
                                <span className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#2196f3] px-3 py-2 text-sm font-semibold text-white">
                                    Otvoriť PDF
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </section>

            <CatalogPdfViewer
                open={selectedCatalog !== null}
                onClose={() => setSelectedCatalog(null)}
                pdfUrl={selectedCatalog?.pdfUrl}
                title={selectedCatalog?.title || 'Katalóg'}
            />
        </main>
    );
}
