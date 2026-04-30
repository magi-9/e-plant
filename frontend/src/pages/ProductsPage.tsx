import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useInfiniteQuery, useQuery, keepPreviousData } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { getCategoryCounts, getCompatibilityCounts, getCompatibilityOptions, getProductCategories, getProductCount, getProducts, type CompatibilityOption, type Product, type ProductListParams } from '../api/products';
import { MagnifyingGlassIcon, ArrowUpIcon, ChevronDownIcon, TagIcon } from '@heroicons/react/24/outline';
import { useCartStore } from '../store/cartStore';
import ProductDetailModal from '../components/ProductDetailModal';
import RequestProductModal from '../components/RequestProductModal';
import { isAdmin } from '../api/auth';
import { authService } from '../api/authService';
import { getWildcardBadgeReference } from '../utils/variantReference';
import toast from 'react-hot-toast';

function StockDot({ stock }: { stock: number }) {
    const bg = stock >= 5 ? '#10b981' : stock >= 1 ? '#f59e0b' : '#ef4444';
    const label = stock >= 5 ? 'Skladom' : stock >= 1 ? 'Málo' : 'Vypredané';
    return <span className="w-2 h-2 rounded-full flex-shrink-0 inline-block" style={{ background: bg }} aria-label={label} title={label} />;
}

const getCategoryList = (product: Product): string[] => {
    const raw = product.all_categories || product.parameters?.all_categories || product.category || '';
    return raw
        .split(';')
        .map((value) => value.trim())
        .filter(Boolean);
};

const getProductPreviewImage = (product: Product): string | null => {
    if (product.image) return product.image;

    if (product.parameters?.type === 'wildcard_group') {
        const firstVariantWithImage = (product.parameters.options || []).find((option) => !!option.image);
        return firstVariantWithImage?.image || null;
    }

    return null;
};

const PAGE_SIZE = 20;
const SEO_SITE_URL = import.meta.env.VITE_SITE_URL || window.location.origin;

const getVariantWord = (count: number): string => {
    const lastTwoDigits = count % 100;
    const lastDigit = count % 10;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
        return 'variantov';
    }
    if (lastDigit === 1) {
        return 'variant';
    }
    if (lastDigit >= 2 && lastDigit <= 4) {
        return 'varianty';
    }
    return 'variantov';
};

export default function ProductsPage() {
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const isLoggedIn = authService.isAuthenticated();
    const userIsAdmin = isAdmin();
    const { addItem, items, updateQuantity, removeItem } = useCartStore();
    
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [openModal, setOpenModal] = useState(false);
    const [addingId, setAddingId] = useState<number | null>(null);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [productToRequest, setProductToRequest] = useState<Product | null>(null);
    const [openRequestModal, setOpenRequestModal] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedCompatibility, setSelectedCompatibility] = useState<CompatibilityOption | null>(null);
    const [priceSortOrder, setPriceSortOrder] = useState<'asc' | 'desc' | 'none'>('none');
    const [maxPrice, setMaxPrice] = useState(500);
    const [inStockOnly, setInStockOnly] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const [categoriesOpen, setCategoriesOpen] = useState(false);
    const [compatOpen, setCompatOpen] = useState(false);

    // Derive "effective" open states instead of calling setState inside effects.
    // This avoids triggering setState synchronously within an effect body.
    const effectiveCategoriesOpen = categoriesOpen || selectedCategories.length > 0;
    const effectiveCompatOpen = compatOpen || !!selectedCompatibility;

    // Debounce search to avoid re-fetching on every keystroke
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Build query params with filters
    const buildParams = useCallback((offset: number): ProductListParams => {
        const params: ProductListParams = { limit: PAGE_SIZE, offset };
        if (debouncedSearch) params.search = debouncedSearch;
        if (selectedCategories.length > 0) params.categories = selectedCategories;
        if (selectedCompatibility) {
            params.compatibility_section = selectedCompatibility.section;
            params.compatibility_code = selectedCompatibility.compatibility_code;
        }
        return params;
    }, [debouncedSearch, selectedCategories, selectedCompatibility]);

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetching,
        isFetchingNextPage,
        isLoading,
        error,
    } = useInfiniteQuery({
        queryKey: ['products', debouncedSearch, selectedCategories, selectedCompatibility],
        queryFn: ({ pageParam = 0 }) => getProducts(buildParams(pageParam)),
        getNextPageParam: (lastPage) => {
            if (lastPage.next) {
                // Extract offset from next URL
                const url = new URL(lastPage.next, window.location.origin);
                return parseInt(url.searchParams.get('offset') || '0');
            }
            return undefined;
        },
        initialPageParam: 0,
        placeholderData: keepPreviousData,
    });

    const { data: databaseProductCount } = useQuery({
        queryKey: ['products-count', debouncedSearch, selectedCategories, selectedCompatibility],
        queryFn: () => getProductCount({
            search: debouncedSearch,
            categories: selectedCategories,
            compatibility_section: selectedCompatibility?.section,
            compatibility_code: selectedCompatibility?.compatibility_code,
        }),
        placeholderData: keepPreviousData,
    });

    const { data: allCategories = [] } = useQuery({
        queryKey: ['products-categories'],
        queryFn: getProductCategories,
        staleTime: 5 * 60 * 1000,
    });

    const { data: compatibilityOptions = [] } = useQuery({
        queryKey: ['compatibility-options'],
        queryFn: getCompatibilityOptions,
        staleTime: 10 * 60 * 1000,
    });

    const { data: compatibilityCounts = {} } = useQuery({
        queryKey: ['compatibility-counts'],
        queryFn: getCompatibilityCounts,
        staleTime: 30 * 60 * 1000,
    });

    // Collect all products from all pages.
    const allProducts = useMemo(() => {
        return data?.pages.flatMap(page => page.results) || [];
    }, [data]);

    // Fetch cached category counts from backend (pre-computed + cached server-side)
    const { data: categoryCounts = {} } = useQuery({
        queryKey: ['category-counts'],
        queryFn: getCategoryCounts,
        staleTime: 30 * 60 * 1000,
    });

    // Keep only one option per compatibility code for storefront filters.
    // API options can include duplicate codes across different sections.
    const uniqueCompatibilityOptions = useMemo(() => {
        const byCode = new Map<string, CompatibilityOption>();
        for (const option of compatibilityOptions) {
            if (!byCode.has(option.compatibility_code)) {
                byCode.set(option.compatibility_code, option);
            }
        }
        return Array.from(byCode.values());
    }, [compatibilityOptions]);

    // Sort compatibility options numerically (smallest to largest)
    const sortedCompatibilityOptions = [...uniqueCompatibilityOptions].slice().sort((a, b) => {
        const numA = parseFloat(a.compatibility_code.replace(/[^\d.]/g, ''));
        const numB = parseFloat(b.compatibility_code.replace(/[^\d.]/g, ''));
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.compatibility_code.localeCompare(b.compatibility_code);
    });

    // Show a suggestion when the search query matches a compatibility code (computed inline)
    const compatSuggestion = (() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q || selectedCompatibility) return null;
        return sortedCompatibilityOptions.find(
            (opt) => opt.compatibility_code.toLowerCase() === q
        ) || null;
    })();

    // Check if we're filtering (comparing currentPrevious state to detect filter changes)

    // Scroll observer for infinite load
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            { rootMargin: '200px' }
        );

        if (loadMoreRef.current) {
            observer.observe(loadMoreRef.current);
        }

        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    // Scroll to top
    useEffect(() => {
        const onScroll = () => setShowScrollTop(window.scrollY > 400);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const scrollToFilters = useCallback(() => {
        const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
        const element = document.getElementById(isDesktop ? 'product-filters' : 'product-filters-mobile');
        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);

    const handleProductClick = (product: Product) => {
        setSelectedProduct(product);
        setOpenModal(true);
    };

    const handleAddToCart = (e: React.MouseEvent, product: Product) => {
        e.stopPropagation();

        if (product.parameters?.type === 'wildcard_group' && (product.parameters.options || []).length > 0) {
            setSelectedProduct(product);
            setOpenModal(true);
            return;
        }

        if (product.stock_quantity <= 0) {
            toast.error('Produkt nie je skladom.');
            return;
        }

        const currentQuantity = items.find(
            item => item.productId === product.id && !item.variantReference
        )?.quantity ?? 0;

        if (currentQuantity >= product.stock_quantity) {
            toast.error(`Na sklade je iba ${product.stock_quantity} ks.`);
            return;
        }

        setAddingId(product.id);
        const previewImage = getProductPreviewImage(product);
        addItem({
            productId: product.id,
            name: product.name,
            price: product.price!,
            image: previewImage,
            stockQuantity: product.stock_quantity,
        });

        setTimeout(() => {
            setAddingId(null);
        }, 600);
    };

    // Only show full-page spinner on very first load (no data yet, not a search refetch)
    if (isLoading && !data) return (
        <div className="flex justify-center items-center min-h-screen bg-slate-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
        </div>
    );

    if (error) return (
        <div className="text-center py-10">
            <p className="text-red-500 text-lg">Chyba pri načítavaní produktov. Skúste to prosím neskôr.</p>
        </div>
    );

    // Categories are fetched separately for all visible products, not only loaded pages.
    const categories = allCategories.length > 0
        ? allCategories
        : Array.from(new Set(allProducts.flatMap((product: Product) => getCategoryList(product))));

    let filteredProducts = [...allProducts];

    // Apply price filter
    if (maxPrice < 500) {
        filteredProducts = filteredProducts.filter(p => {
            if (!p.price) return true;
            return parseFloat(p.price) <= maxPrice;
        });
    }

    // Apply in-stock filter
    if (inStockOnly) {
        filteredProducts = filteredProducts.filter(p => {
            if (p.parameters?.type === 'wildcard_group') {
                return (p.parameters.options || []).some(o => (o.stock_quantity ?? 0) > 0);
            }
            return p.stock_quantity > 0;
        });
    }

    // Apply price sort
    if (priceSortOrder !== 'none') {
        filteredProducts.sort((a: Product, b: Product) => {
            const priceA = parseFloat(a.price || '0');
            const priceB = parseFloat(b.price || '0');
            return priceSortOrder === 'asc' ? priceA - priceB : priceB - priceA;
        });
    }

    const visibleCount = databaseProductCount ?? filteredProducts.length;
    const canonicalUrl = `${SEO_SITE_URL}${window.location.pathname}`;
    const socialImageUrl = `${SEO_SITE_URL}/dynamicabutment-logo.png`;

    // Generate structured data for products - computed on each render
    const schemaData = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Dynamic Abutment Solutions Products',
        description: 'Browse our complete catalog of Dynamic Abutment Solutions products including implant components, TiBase scanning bodies, Multi-Unit abutments, and CAD/CAM solutions for modern implantology.',
        url: canonicalUrl,
        image: socialImageUrl,
        mainEntity: {
            '@type': 'ItemList',
            numberOfItems: filteredProducts.length,
            itemListElement: filteredProducts.slice(0, 12).map((product, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: product.name,
                description: product.category,
                image: product.image || socialImageUrl,
                offers: {
                    '@type': 'Offer',
                    price: product.price,
                    priceCurrency: 'EUR',
                    availability: product.stock_quantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
                }
            }))
        }
    };

    return (
        <div className="bg-slate-50 flex flex-col text-slate-900 relative">
            <Helmet>
                <title>Dynamic Abutment Solutions – Implant Components & CAD/CAM Solutions</title>
                <meta name="description" content="Shop premium Dynamic Abutment Solutions products: TiBase scanning bodies, Multi-Unit abutments, custom CAD/CAM solutions, and more. Official distributor for Slovakia." />
                <meta name="keywords" content="abutment, implant components, TiBase, Multi-Unit abutment, CAD/CAM, implantology, dental surgery" />
                <meta name="robots" content="index, follow" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <link rel="canonical" href={canonicalUrl} />
                
                {/* Open Graph - Social Media */}
                <meta property="og:type" content="website" />
                <meta property="og:title" content="Dynamic Abutment Solutions Products" />
                <meta property="og:description" content="Browse premium implant components, TiBase scanning bodies, Multi-Unit abutments, and CAD/CAM solutions." />
                <meta property="og:url" content={canonicalUrl} />
                <meta property="og:image" content={socialImageUrl} />
                <meta property="og:site_name" content="Dynamic Abutment Solutions" />
                
                {/* Twitter Card */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="Dynamic Abutment Solutions" />
                <meta name="twitter:description" content="Premium implant components and solutions for modern implantology." />
                <meta name="twitter:image" content={socialImageUrl} />
                
                {/* Structured Data */}
                <script type="application/ld+json">
                    {JSON.stringify(schemaData)}
                </script>
            </Helmet>
            
            {/* Left Sidebar - Categories & Filters (Desktop only) */}
            <aside className="hidden lg:block w-60 bg-white border-r border-slate-200 fixed left-0 top-16 bottom-0 overflow-y-auto">
                <div className="px-3 py-4">
                    {/* Categories */}
                    <button
                        onClick={() => setCategoriesOpen(o => !o)}
                        className="w-full flex items-center justify-between mb-2.5 group"
                    >
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">Kategórie</p>
                        <svg className={`h-3.5 w-3.5 text-slate-400 transition-transform ${effectiveCategoriesOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {effectiveCategoriesOpen && (
                        <div className="space-y-0.5 mb-5">
                            <button
                                onClick={() => { setSelectedCategories([]); scrollToFilters(); }}
                                className="w-full text-left px-3 py-2 rounded-[10px] text-sm transition-all flex justify-between items-center"
                                style={selectedCategories.length === 0 ? { background: '#e0f7fa', border: '1px solid rgba(8,145,178,0.2)', color: '#0891b2', fontWeight: 600 } : { border: '1px solid transparent', color: '#475569', fontWeight: 400 }}
                            >
                                <span>Všetko</span>
                                <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ background: '#f8fafc', color: '#94a3b8' }}>{databaseProductCount || allProducts.length}</span>
                            </button>
                            {categories.map((category: string) => {
                                const count = categoryCounts[category] || 0;
                                const active = selectedCategories.includes(category);
                                return (
                                    <button
                                        key={category}
                                        onClick={() => { setSelectedCategories(active ? selectedCategories.filter(c => c !== category) : [...selectedCategories, category]); scrollToFilters(); }}
                                        className="w-full text-left px-3 py-2 rounded-[10px] text-sm transition-all flex justify-between items-center"
                                        style={active ? { background: '#e0f7fa', border: '1px solid rgba(8,145,178,0.2)', color: '#0891b2', fontWeight: 600 } : { border: '1px solid transparent', color: '#475569', fontWeight: 400 }}
                                    >
                                        <span>{category}</span>
                                        <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ background: active ? 'rgba(8,145,178,0.12)' : '#f8fafc', color: active ? '#0891b2' : '#94a3b8' }}>{count}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Compatibility */}
                    {sortedCompatibilityOptions.length > 0 && (
                        <>
                            <div className="h-px bg-slate-100 mb-3" />
                            <button
                                onClick={() => setCompatOpen(o => !o)}
                                className="w-full flex items-center justify-between mb-2.5 group"
                            >
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">Kompatibilita</p>
                                <svg className={`h-3.5 w-3.5 text-slate-400 transition-transform ${effectiveCompatOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            {effectiveCompatOpen && (
                                <div className="space-y-0.5 mb-5">
                                    {sortedCompatibilityOptions.map((opt) => {
                                        const active = selectedCompatibility?.section === opt.section && selectedCompatibility?.compatibility_code === opt.compatibility_code;
                                        return (
                                            <button
                                                key={`${opt.section}-${opt.compatibility_code}`}
                                                onClick={() => setSelectedCompatibility(active ? null : opt)}
                                                className="w-full text-left px-3 py-2 rounded-[10px] text-sm transition-all flex justify-between items-center"
                                                style={active
                                                    ? { background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', color: '#7c3aed', fontWeight: 600 }
                                                    : { border: '1px solid transparent', color: '#475569', fontWeight: 400 }}
                                            >
                                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: active ? '#7c3aed' : '#a78bfa' }} />
                                                    <span className="truncate">{opt.compatibility_code}</span>
                                                </div>
                                                {compatibilityCounts[opt.compatibility_code] != null && (
                                                    <span className="text-[11px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: active ? 'rgba(139,92,246,0.15)' : '#f8fafc', color: active ? '#7c3aed' : '#94a3b8' }}>
                                                        {compatibilityCounts[opt.compatibility_code]}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}

                    {/* Price Range */}
                    <div className="border-t border-slate-100 pt-4">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-3">Max. cena</p>
                        <input
                            type="range" min="0" max="500" step="10" value={maxPrice}
                            onChange={(e) => setMaxPrice(Number(e.target.value))}
                            className="w-full appearance-none cursor-pointer accent-cyan-600"
                            style={{ height: 4, borderRadius: 2 }}
                        />
                        <div className="flex justify-between mt-2">
                            <span className="text-xs text-slate-400">0 €</span>
                            <span className="text-xs font-semibold" style={{ color: maxPrice < 500 ? '#0891b2' : '#94a3b8' }}>
                                {maxPrice >= 500 ? 'Všetky ceny' : `do ${maxPrice} €`}
                            </span>
                        </div>
                    </div>

                    {/* In-Stock Toggle */}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                        <button type="button" onClick={() => setInStockOnly(!inStockOnly)} className="w-full flex items-center justify-between cursor-pointer text-left" aria-pressed={inStockOnly}>
                            <div>
                                <p className="text-sm font-medium text-slate-800">Len skladom</p>
                                <p className="text-xs text-slate-400">Skryť vypredané</p>
                            </div>
                            <div className="relative flex-shrink-0 transition-all"
                                style={{ width: 40, height: 22, borderRadius: 11, background: inStockOnly ? 'linear-gradient(135deg, #06b6d4, #10b981)' : '#e2e8f0' }}>
                                <div className="absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-all"
                                    style={{ left: inStockOnly ? 21 : 3 }} />
                            </div>
                        </button>
                    </div>
                </div>
            </aside>
            {/* Hero Section */}
            <div className="relative bg-gradient-to-br from-cyan-50 via-sky-50 to-emerald-50 lg:ml-60 scroll-mt-16" id="hero-section">
                <div className="absolute inset-0 opacity-30" aria-hidden="true">
                    <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-cyan-200 blur-3xl" />
                    <div className="absolute -bottom-10 left-1/3 w-72 h-72 rounded-full bg-emerald-200 blur-3xl" />
                </div>
                <div className="relative py-16 px-4 sm:py-24 sm:px-6 lg:py-32 lg:px-10 xl:px-12 flex flex-col items-center text-center">
                    {/* Logo */}
                    <div className="mb-8 rounded-[2rem] bg-white/90 px-6 py-5 shadow-sm ring-1 ring-slate-200/70 backdrop-blur-sm">
                        <img
                            src="/dynamicabutment-logo.png"
                            alt="Dynamic Abutment Solutions"
                            className="block h-auto w-[18rem] max-w-[70vw] sm:w-[22rem] md:w-[24rem] object-contain"
                        />
                    </div>
                    {/* Brand Description */}
                    <div className="mt-4 max-w-3xl">
                        <p className="text-sm font-semibold text-cyan-700 uppercase tracking-widest mb-2">
                            Exkluzívny distribútor pre Slovensko
                        </p>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl mb-4">
                            Dynamic Abutment Solutions
                        </h1>
                        <p className="text-lg text-slate-700 mb-6">
                            Líder v uhlových abutmentoch a digitálnych workflow pre modernú implantológiu.
                            Komplexné riešenia – od skenovacích tiel TiBase, Multi‑Unit abutmentov, až po CAD/CAM
                            individuálne suprakonstrukcie.
                        </p>
                        <p className="text-sm text-slate-600">
                            Všetky produkty sú originálne zo{' '}
                            <a
                                href="https://www.dynamicabutmentstore.com/es"
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-emerald-600 hover:text-emerald-500 inline-flex items-center gap-1 transition-colors"
                            >
                                oficiálneho distribútora
                                <span className="text-xs">↗</span>
                            </a>
                        </p>
                    </div>
                    {/* Animated arrow CTA */}
                    <div className="mt-12 flex flex-col items-center animate-bounce" style={{ animationDuration: '2s' }}>
                        <p className="text-xs font-medium text-slate-600 mb-2 uppercase tracking-widest">Prejdite na produkty</p>
                        <ChevronDownIcon className="w-6 h-6 text-cyan-600" />
                    </div>
                </div>
            </div>

            {/* Product Grid */}
            <div className="py-10 px-4 sm:py-16 sm:px-6 lg:px-10 xl:px-12 lg:py-20 lg:ml-60 flex flex-col">

                {/* Desktop: unified search + sort + view card */}
                <div id="product-filters" className="hidden lg:flex scroll-mt-24 items-center gap-3 mb-4 bg-white border border-slate-200 rounded-2xl px-4 py-2.5">
                    {/* Search */}
                    <div className="flex flex-1 items-center gap-2 min-w-0">
                        <MagnifyingGlassIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <input
                            type="text"
                            placeholder="Hľadať produkt, referenčné číslo..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 bg-transparent border-none outline-none text-sm text-slate-900 placeholder:text-slate-400 min-w-0"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                aria-label="Vymazať vyhľadávanie"
                                onClick={() => setSearchQuery('')}
                                className="text-slate-400 hover:text-slate-600 text-base leading-none flex-shrink-0"
                            >
                                ×
                            </button>
                        )}
                    </div>
                    <div className="w-px h-6 bg-slate-200 flex-shrink-0" />
                    {/* Compatibility filter */}
                    {sortedCompatibilityOptions.length > 0 && (
                        <>
                            <select
                                value={selectedCompatibility ? `${selectedCompatibility.section}::${selectedCompatibility.compatibility_code}` : ''}
                                onChange={(e) => {
                                    if (!e.target.value) { setSelectedCompatibility(null); return; }
                                    const [section, code] = e.target.value.split('::');
                                    const opt = sortedCompatibilityOptions.find(o => o.section === section && o.compatibility_code === code);
                                    setSelectedCompatibility(opt ?? null);
                                }}
                                className="border-none bg-transparent outline-none text-sm font-medium cursor-pointer"
                                style={{ color: selectedCompatibility ? '#7c3aed' : '#64748b' }}
                            >
                                <option value="">Kompatibilita</option>
                                {sortedCompatibilityOptions.map(opt => (
                                    <option key={`${opt.section}::${opt.compatibility_code}`} value={`${opt.section}::${opt.compatibility_code}`}>
                                        {opt.compatibility_code}
                                    </option>
                                ))}
                            </select>
                            <div className="w-px h-6 bg-slate-200 flex-shrink-0" />
                        </>
                    )}
                    {/* Sort */}
                    <select
                        value={priceSortOrder}
                        onChange={(e) => setPriceSortOrder(e.target.value as 'asc' | 'desc' | 'none')}
                        className="border-none bg-transparent outline-none text-sm text-slate-500 font-medium cursor-pointer"
                    >
                        <option value="none">Zoradiť</option>
                        <option value="asc">Cena: vzostupne</option>
                        <option value="desc">Cena: zostupne</option>
                    </select>
                    <div className="w-px h-6 bg-slate-200 flex-shrink-0" />
                    {/* View toggle */}
                    {(['grid', 'list'] as const).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${viewMode === mode ? 'text-cyan-600' : 'text-slate-400 hover:text-slate-600'}`}
                            style={viewMode === mode ? { background: '#e0f7fa' } : {}}
                        >
                            {mode === 'grid' ? (
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" /></svg>
                            ) : (
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z" /></svg>
                            )}
                        </button>
                    ))}
                </div>

                {/* Desktop: compatibility suggestion when search matches a code */}
                {compatSuggestion && (
                    <div className="hidden lg:flex items-center gap-2 mb-3 px-3 py-2 rounded-xl text-sm"
                        style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.18)' }}>
                        <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="#7c3aed" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        <span style={{ color: '#475569' }}>Nájdený kompatibilný kód:</span>
                        <strong style={{ color: '#7c3aed' }}>{compatSuggestion.compatibility_code}</strong>
                        <button
                            onClick={() => { setSelectedCompatibility(compatSuggestion); setSearchQuery(''); }}
                            className="ml-auto px-3 py-0.5 rounded-lg text-xs font-semibold transition-all"
                            style={{ background: 'rgba(139,92,246,0.12)', color: '#7c3aed', border: '1px solid rgba(139,92,246,0.25)' }}
                        >
                            Filtrovať →
                        </button>
                    </div>
                )}

                {/* Desktop: active filter chips */}
                {(selectedCategories.length > 0 || selectedCompatibility || inStockOnly || maxPrice < 500) && (
                    <div className="hidden lg:flex flex-wrap gap-2 mb-4">
                        {selectedCategories.map(c => (
                            <button key={c} onClick={() => setSelectedCategories(s => s.filter(x => x !== c))}
                                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all"
                                style={{ background: '#e0f7fa', border: '1px solid rgba(8,145,178,0.25)', color: '#0891b2' }}>
                                {c} <span className="text-sm leading-none">×</span>
                            </button>
                        ))}
                        {selectedCompatibility && (
                            <button onClick={() => setSelectedCompatibility(null)}
                                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium cursor-pointer"
                                style={{ background: 'rgba(139,92,246,0.09)', border: '1px solid rgba(139,92,246,0.25)', color: '#7c3aed' }}>
                                {selectedCompatibility.compatibility_code} <span className="text-sm leading-none">×</span>
                            </button>
                        )}
                        {inStockOnly && (
                            <button onClick={() => setInStockOnly(false)}
                                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium cursor-pointer"
                                style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d' }}>
                                Len skladom <span className="text-sm leading-none">×</span>
                            </button>
                        )}
                        {maxPrice < 500 && (
                            <button onClick={() => setMaxPrice(500)}
                                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium cursor-pointer"
                                style={{ background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e' }}>
                                do {maxPrice} € <span className="text-sm leading-none">×</span>
                            </button>
                        )}
                    </div>
                )}

                {/* Mobile: dark search bar + filter button */}
                <div className="lg:hidden -mx-4 mb-0" style={{ background: '#020617', borderBottom: '1px solid rgba(6,182,212,0.18)' }}>
                    <div className="flex items-center gap-2 px-3 py-2.5">
                        <div className="flex flex-1 items-center gap-2 px-3 h-10 rounded-xl" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <MagnifyingGlassIcon className="h-4 w-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />
                            <input
                                type="text"
                                placeholder="Hľadať produkt, ref..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 bg-transparent border-none outline-none text-sm"
                                style={{ color: '#fff', fontFamily: 'inherit' }}
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    aria-label="Vymazať vyhľadávanie"
                                    onClick={() => setSearchQuery('')}
                                    className="text-base leading-none"
                                    style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                >
                                    ×
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => setMobileFiltersOpen(true)}
                            className="relative flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl flex-shrink-0 transition-all"
                            style={{
                                background: (selectedCategories.length > 0 || maxPrice < 500 || inStockOnly || priceSortOrder !== 'none' || selectedCompatibility)
                                    ? 'linear-gradient(135deg, #06b6d4, #10b981)'
                                    : 'rgba(255,255,255,0.07)',
                                border: 'none',
                            }}
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke={(selectedCategories.length > 0 || maxPrice < 500 || inStockOnly || priceSortOrder !== 'none' || selectedCompatibility) ? '#fff' : 'rgba(255,255,255,0.6)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
                            </svg>
                            {(selectedCategories.length > 0 || maxPrice < 500 || inStockOnly || priceSortOrder !== 'none' || selectedCompatibility) && (
                                <span className="text-xs font-bold text-white">
                                    {selectedCategories.length + (selectedCompatibility ? 1 : 0) + (inStockOnly ? 1 : 0) + (maxPrice < 500 ? 1 : 0) + (priceSortOrder !== 'none' ? 1 : 0)}
                                </span>
                            )}
                        </button>
                    </div>
                    {/* Mobile CatStrip — on dark bg */}
                    <div className="flex gap-1.5 px-3 pb-2.5 overflow-x-auto no-scrollbar" style={{ width: '100%' }}>
                        {(['Všetko', ...categories] as string[]).map((cat) => {
                            const active = cat === 'Všetko' ? selectedCategories.length === 0 : selectedCategories.includes(cat);
                            return (
                                <button
                                    key={cat}
                                    onClick={() => cat === 'Všetko' ? setSelectedCategories([]) : setSelectedCategories(
                                        selectedCategories.includes(cat) ? selectedCategories.filter(c => c !== cat) : [...selectedCategories, cat]
                                    )}
                                    className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all"
                                    style={{
                                        background: active ? 'linear-gradient(135deg, #06b6d4, #10b981)' : 'rgba(255,255,255,0.08)',
                                        color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                                        border: 'none',
                                        boxShadow: active ? '0 2px 8px rgba(6,182,212,0.3)' : 'none',
                                    }}
                                >
                                    {cat}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Mobile: keep a scroll anchor here */}
                <div id="product-filters-mobile" className="scroll-mt-24 lg:hidden" />

                <div className="mb-5 hidden lg:block">
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none">Naše produkty</h1>
                    <p className="text-sm text-slate-400 mt-1">{visibleCount} produktov{selectedCategories.length > 0 ? ` v kategórii ${selectedCategories.join(', ')}` : ''}</p>
                </div>
                {/* Mobile heading */}
                <div className="mb-3 mt-3 lg:hidden flex items-center justify-between">
                    <h1 className="text-base font-bold text-slate-900">Produkty</h1>
                    <span className="text-xs text-slate-400">{visibleCount} produktov</span>
                </div>

                {filteredProducts.length === 0 && !isFetching ? (
                    <div className="text-center py-20 bg-white rounded-lg border border-slate-200">
                        <p className="text-slate-600 text-lg">Nenašli sa žiadne produkty vyhovujúce filtrom.</p>
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedCategories([]);
                                setSelectedCompatibility(null);
                                setPriceSortOrder('none');
                            }}
                            className="mt-4 text-cyan-600 hover:text-cyan-500 font-medium"
                        >
                            Zrušiť filtre
                        </button>
                    </div>
                ) : (
                    <>
                        <div className={`${
                            viewMode === 'list'
                                ? 'flex flex-col gap-4'
                                : 'grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 lg:gap-6'
                        } transition-opacity duration-200 ${isFetching && !isFetchingNextPage ? 'opacity-50' : 'opacity-100'}`}>
                            {filteredProducts.map((product: Product, index: number) => (
                                (() => {
                                    const previewImage = getProductPreviewImage(product);
                                    return (
                                <div
                                    key={product.id}
                                    onClick={() => handleProductClick(product)}
                                    style={{
                                        animation: `slideUp 0.5s ease-out ${Math.min((index % PAGE_SIZE) * 40, 320)}ms both`,
                                    }}
                                    className={`group relative bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all duration-300 cursor-pointer flex flex-col ${
                                        viewMode === 'list'
                                            ? 'flex-row hover:shadow-[0_8px_32px_rgba(0,0,0,0.1),0_2px_8px_rgba(6,182,212,0.08)] hover:border-cyan-300/60'
                                            : 'hover:shadow-[0_8px_32px_rgba(0,0,0,0.1),0_2px_8px_rgba(6,182,212,0.08)] hover:border-cyan-300/60 hover:-translate-y-0.5'
                                    }`}
                                >
                                    <div className={`${viewMode === 'list' ? 'w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0' : 'w-full h-28 sm:h-40 lg:h-48'} overflow-hidden bg-slate-100`}>
                                        {previewImage ? (
                                            <img
                                                src={previewImage}
                                                alt={product.name}
                                                loading="lazy"
                                                className="h-full w-full object-contain object-center p-3 group-hover:scale-105 transition-transform duration-500 ease-in-out"
                                            />
                                        ) : (
                                            <div className="h-full w-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-200 transition-colors">
                                                <span className="sr-only">Bez obrázka</span>
                                                <svg className="h-16 w-16" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>

                                    {/* Stock Badge (Top Right for Grid View) */}
                                    {viewMode === 'grid' && isLoggedIn && (() => {
                                        const effectiveStock = product.parameters?.type === 'wildcard_group'
                                            ? (product.parameters.options || []).reduce((sum, o) => sum + (o.stock_quantity ?? 0), 0)
                                            : product.stock_quantity;
                                        return (
                                            <>
                                                {effectiveStock > 5 && (
                                                    <div className="absolute top-3 right-3 z-10">
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-700">
                                                            <span className="h-2 w-2 rounded-full bg-emerald-600" />
                                                            Na sklade
                                                        </span>
                                                    </div>
                                                )}
                                                {effectiveStock > 0 && effectiveStock <= 5 && (
                                                    <div className="absolute top-3 right-3 z-10">
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-amber-100 text-amber-700">
                                                            Posledné {effectiveStock} ks
                                                        </span>
                                                    </div>
                                                )}
                                                {effectiveStock === 0 && (
                                                    <div className="absolute top-3 right-3 z-10">
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-red-100 text-red-700">
                                                            Vypredané
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                    <div className="p-2.5 sm:p-4 flex-1 flex flex-col">
                                        <div className="mb-1.5 sm:mb-2 min-h-[4rem] sm:min-h-[5.5rem]">
                                            <div className="sm:min-h-[5.5rem]">
                                                <div className="flex items-start gap-1.5 sm:gap-2">
                                                    <h3 className="text-[11px] sm:text-sm font-semibold text-slate-900 group-hover:text-cyan-700 transition-colors line-clamp-2 min-h-[2rem] sm:min-h-[3.5rem] flex-1">
                                                        {product.name}
                                                    </h3>
                                                    {isLoggedIn && (() => {
                                                        const effectiveStock = product.parameters?.type === 'wildcard_group'
                                                            ? (product.parameters.options || []).reduce((sum, o) => sum + (o.stock_quantity ?? 0), 0)
                                                            : product.stock_quantity;
                                                        return effectiveStock >= 5 ? (
                                                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5 cursor-default" title="Na sklade" />
                                                        ) : effectiveStock >= 1 ? (
                                                            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 flex-shrink-0 mt-1.5 cursor-default" title="Posledné kusy" />
                                                        ) : (
                                                            <span className="h-2.5 w-2.5 rounded-full bg-red-500 flex-shrink-0 mt-1.5 cursor-default" title="Nie je na sklade" />
                                                        );
                                                    })()}
                                                </div>
                                                {product.parameters?.type === 'wildcard_group' ? (
                                                    <div className="mt-0.5">
                                                        {(() => {
                                                            const count = (product.parameters.options || []).length;
                                                            const variantText = `${count} ${getVariantWord(count)}`;
                                                            const maskedReference = getWildcardBadgeReference(product.parameters?.masked_reference);
                                                            return (
                                                                <>
                                                                    {maskedReference && (
                                                                        <p className="text-[11px] text-slate-600 font-medium truncate">
                                                                            {maskedReference}
                                                                        </p>
                                                                    )}
                                                                    <p className="text-[11px] text-cyan-600 font-semibold truncate">
                                                                        {variantText}
                                                                    </p>
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                ) : product.reference && (
                                                    <p className="mt-0.5 text-[11px] text-slate-500 font-medium truncate">{product.reference}</p>
                                                )}
                                                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                                                    <TagIcon className="h-3.5 w-3.5 text-cyan-600 flex-shrink-0" />
                                                    <p className="text-xs text-cyan-700 font-medium line-clamp-1">
                                                        {getCategoryList(product).join(', ') || product.category}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-auto pt-2 sm:pt-4 border-t border-slate-100 flex items-center justify-between">
                                            {product.price ? (
                                                <div className="flex items-center gap-1.5">
                                                    {(() => {
                                                        const s = product.parameters?.type === 'wildcard_group'
                                                            ? (product.parameters.options || []).reduce((sum, o) => sum + (o.stock_quantity ?? 0), 0)
                                                            : product.stock_quantity;
                                                        return <StockDot stock={s} />;
                                                    })()}
                                                    <p className="text-sm sm:text-lg font-bold bg-gradient-to-r from-cyan-600 to-emerald-600 bg-clip-text text-transparent">{product.price} €</p>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] sm:text-xs font-semibold text-cyan-700 bg-cyan-50 px-1.5 sm:px-2.5 py-0.5 rounded-full">
                                                            <span className="sm:hidden">Člen.</span>
                                                            <span className="hidden sm:inline">Členská cena</span>
                                                </span>
                                            )}
                                        </div>

                                        {!userIsAdmin && (
                                        <div className="mt-3 sm:mt-4 flex justify-end sm:min-h-[2.25rem]">
                                            {product.price ? (() => {
                                                const cartItem = items.find(
                                                    item => item.productId === product.id && !item.variantReference
                                                );

                                                if (cartItem) {
                                                    return (
                                                        <div className="inline-flex items-center rounded-full overflow-hidden border-[1.5px] border-cyan-400 shrink-0"
                                                            style={{ background: '#e0f7fa' }}>
                                                            <button
                                                                type="button"
                                                                aria-label="Znížiť množstvo"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (cartItem.quantity > 1) {
                                                                        updateQuantity(product.id, cartItem.quantity - 1);
                                                                    } else {
                                                                        removeItem(product.id);
                                                                    }
                                                                }}
                                                                className="w-7 h-7 flex items-center justify-center text-cyan-600 text-base font-light"
                                                            >−</button>
                                                            <span className="text-xs font-bold text-cyan-600 px-1.5">{cartItem.quantity}</span>
                                                            <button
                                                                type="button"
                                                                aria-label="Zvýšiť množstvo"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (cartItem.quantity >= product.stock_quantity) {
                                                                        toast.error(`Na sklade je iba ${product.stock_quantity} ks.`);
                                                                        return;
                                                                    }
                                                                    updateQuantity(product.id, cartItem.quantity + 1);
                                                                }}
                                                                disabled={cartItem.quantity >= product.stock_quantity}
                                                                className="w-7 h-7 flex items-center justify-center text-cyan-600 text-base font-light disabled:opacity-30"
                                                            >+</button>
                                                        </div>
                                                    );
                                                }

                                                if (product.stock_quantity <= 0) {
                                                    if (!isLoggedIn) return null;
                                                    return (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setProductToRequest(product);
                                                                setOpenRequestModal(true);
                                                            }}
                                                            className="text-[10px] sm:text-xs font-medium text-slate-500 underline"
                                                        >
                                                            Požiadať
                                                        </button>
                                                    );
                                                }

                                                return (
                                                    <button
                                                            type="button"
                                                            aria-label="Pridať do košíka"
                                                            title="Pridať do košíka"
                                                        onClick={(e) => handleAddToCart(e, product)}
                                                        disabled={addingId === product.id}
                                                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-95 mt-auto"
                                                        style={{
                                                            background: addingId === product.id
                                                                ? '#10b981'
                                                                : 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
                                                            boxShadow: '0 2px 8px rgba(6,182,212,0.3)',
                                                        }}
                                                    >
                                                        {addingId === product.id ? (
                                                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        ) : (
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                                                            </svg>
                                                        )}
                                                    </button>
                                                );
                                            })() : null}
                                        </div>
                                        )}
                                    </div>
                                </div>
                                    );
                                })()
                            ))}
                        </div>

                        {/* Load more trigger */}
                        <div ref={loadMoreRef} className="py-8 text-center">
                            {isFetchingNextPage ? (
                                <div className="flex justify-center items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-cyan-500 animate-bounce [animation-delay:-0.2s]" />
                                    <div className="h-2 w-2 rounded-full bg-cyan-500 animate-bounce [animation-delay:-0.1s]" />
                                    <div className="h-2 w-2 rounded-full bg-cyan-500 animate-bounce" />
                                </div>
                            ) : hasNextPage ? (
                                <div className="h-4" />
                            ) : (
                                <p className="text-slate-600">Všetky produkty boli načítané.</p>
                            )}
                        </div>
                    </>
                )}
            </div>

            <ProductDetailModal
                open={openModal}
                setOpen={setOpenModal}
                product={selectedProduct}
            />

            {/* Mobile Filters Bottom Sheet */}
            {mobileFiltersOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div
                        className="absolute inset-0 bg-black/50 transition-opacity"
                        onClick={() => setMobileFiltersOpen(false)}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-slate-900">Filtre</h2>
                            <button
                                onClick={() => setMobileFiltersOpen(false)}
                                className="text-slate-500 hover:text-slate-700"
                            >
                                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                </svg>
                            </button>
                        </div>

                        {/* Sort */}
                        <div className="mb-6">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-3">Zoradiť</h3>
                            <div className="flex flex-col gap-1.5">
                                {([['none', 'Predvolené'], ['asc', 'Cena: vzostupne'], ['desc', 'Cena: zostupne']] as const).map(([val, label]) => (
                                    <button
                                        key={val}
                                        onClick={() => setPriceSortOrder(val)}
                                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                                            priceSortOrder === val
                                                ? 'text-white'
                                                : 'bg-slate-50 text-slate-700'
                                        }`}
                                        style={priceSortOrder === val ? { background: 'linear-gradient(135deg, #06b6d4, #10b981)' } : {}}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Categories */}
                        <div className="mb-6 pt-5 border-t border-slate-100">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-3">Kategórie</h3>
                            <div className="space-y-2">
                                <button
                                    onClick={() => {
                                        setSelectedCategories([]);
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded text-sm font-medium transition ${
                                        selectedCategories.length === 0
                                            ? 'bg-cyan-50 text-cyan-700'
                                            : 'text-slate-700 hover:bg-slate-100'
                                    }`}
                                >
                                    Všetko
                                </button>
                                {categories.map((cat: string) => (
                                    <button
                                        key={cat}
                                        onClick={() => {
                                            setSelectedCategories(
                                                selectedCategories.includes(cat)
                                                    ? selectedCategories.filter((c) => c !== cat)
                                                    : [...selectedCategories, cat]
                                            );
                                        }}
                                        className={`w-full text-left px-3 py-2 rounded text-sm font-medium transition ${
                                            selectedCategories.includes(cat)
                                                ? 'bg-cyan-50 text-cyan-700'
                                                : 'text-slate-700 hover:bg-slate-100'
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Compatibility */}
                        {sortedCompatibilityOptions.length > 0 && (
                            <div className="mb-6 pt-5 border-t border-slate-100">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-3">Kompatibilita</h3>
                                <div className="space-y-1.5">
                                    <button
                                        onClick={() => setSelectedCompatibility(null)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${
                                            !selectedCompatibility ? 'text-white' : 'bg-slate-50 text-slate-700'
                                        }`}
                                        style={!selectedCompatibility ? { background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' } : {}}
                                    >
                                        Všetky
                                    </button>
                                    {sortedCompatibilityOptions.map((opt) => {
                                        const isActive = selectedCompatibility?.compatibility_code === opt.compatibility_code;
                                        return (
                                            <button
                                                key={opt.compatibility_code}
                                                onClick={() => setSelectedCompatibility(isActive ? null : opt)}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${
                                                    isActive ? 'text-white' : 'bg-slate-50 text-slate-700'
                                                }`}
                                                style={isActive ? { background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' } : {}}
                                            >
                                                {opt.compatibility_code}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Price Range */}
                        <div className="mb-6 pt-5 border-t border-slate-100">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-3">Cena</h3>
                            <input
                                type="range"
                                min="0"
                                max="500"
                                step="10"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(Number(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
                            />
                            <p className="text-xs text-slate-500 mt-2">
                                {maxPrice >= 500 ? 'Všetky ceny' : `do ${maxPrice} €`}
                            </p>
                        </div>

                        {/* In-Stock Toggle */}
                        <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-700">Iba skladom</span>
                            <button
                                onClick={() => setInStockOnly(!inStockOnly)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                    inStockOnly
                                        ? 'bg-gradient-to-r from-cyan-500 to-emerald-500'
                                        : 'bg-slate-200'
                                }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                                        inStockOnly ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>

                        {/* Apply Button */}
                        <button
                            onClick={() => setMobileFiltersOpen(false)}
                            className="w-full mt-6 px-4 py-3.5 text-white font-bold rounded-full hover:opacity-90 transition-opacity shadow-md"
                            style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)' }}
                        >
                            Zobraziť výsledky
                        </button>
                    </div>
                </div>
            )}

            <RequestProductModal
                open={openRequestModal}
                onClose={() => setOpenRequestModal(false)}
                productId={productToRequest?.id || 0}
                productName={productToRequest?.name || ''}
                productReference={productToRequest?.reference || ''}
            />

            {/* Scroll to top FAB */}
            <button
                onClick={scrollToFilters}
                aria-label="Späť na filtre"
                className={`fixed bottom-6 right-6 z-50 p-3 rounded-full bg-cyan-600 text-white shadow-lg transition-all duration-300 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-50 ${
                    showScrollTop ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
                }`}
            >
                <ArrowUpIcon className="h-5 w-5" />
            </button>
        </div>
    );
}
