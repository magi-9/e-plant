import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useInfiniteQuery, useQuery, keepPreviousData } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { getCompatibilityOptions, getProductCategories, getProductCount, getProducts, type CompatibilityOption, type Product, type ProductListParams } from '../api/products';
import { Link } from 'react-router-dom';
import { ShoppingCartIcon } from '@heroicons/react/24/solid';
import { MagnifyingGlassIcon, ArrowUpIcon, ChevronDownIcon, ExclamationTriangleIcon, TagIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useCartStore } from '../store/cartStore';
import ProductDetailModal from '../components/ProductDetailModal';
import RequestProductModal from '../components/RequestProductModal';
import { isAdmin } from '../api/auth';
import { getWildcardBadgeReference } from '../utils/variantReference';
import toast from 'react-hot-toast';

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
    const filtersRef = useRef<HTMLDivElement>(null);
    const isLoggedIn = !!localStorage.getItem('access_token');
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

    // Group compatibility options by section for the dropdown
    const compatibilityBySection = compatibilityOptions.reduce<Record<string, string[]>>((acc, opt) => {
        if (!acc[opt.section]) acc[opt.section] = [];
        acc[opt.section].push(opt.compatibility_code);
        return acc;
    }, {});

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
        filtersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

    // Collect all products from all pages
    const allProducts = data?.pages.flatMap(page => page.results) || [];

    // Categories are fetched separately for all visible products, not only loaded pages.
    const categories = allCategories.length > 0
        ? allCategories
        : Array.from(new Set(allProducts.flatMap((product: Product) => getCategoryList(product))));

    // Compute category counts from loaded products
    const categoryCounts = useMemo(() => {
        const counts = new Map<string, number>();
        allProducts.forEach(product => {
            getCategoryList(product).forEach(cat => {
                counts.set(cat, (counts.get(cat) || 0) + 1);
            });
        });
        return counts;
    }, [allProducts]);

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
            <aside className="hidden lg:block w-56 bg-white border-r border-slate-200 fixed left-0 top-16 bottom-0 overflow-y-auto">
                <div className="p-5">
                    {/* Categories Section */}
                    <div className="flex items-center gap-2 mb-4">
                        <TagIcon className="h-5 w-5 text-cyan-600" />
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-[0.08em]">Kategórie</h3>
                    </div>
                    <div className="space-y-1.5 mb-6">
                        <button
                            onClick={() => {
                                setSelectedCategories([]);
                                scrollToFilters();
                            }}
                            className={`w-full text-left px-3 py-2.5 rounded transition text-sm font-medium ${
                                selectedCategories.length === 0
                                    ? 'bg-cyan-50 text-cyan-700 border border-cyan-100'
                                    : 'text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span>Všetko</span>
                                <span className="text-xs font-semibold text-slate-500">({allProducts.length})</span>
                            </div>
                        </button>
                        {categories.map((category: string) => {
                            const count = categoryCounts.get(category) || 0;
                            return (
                                <button
                                    key={category}
                                    onClick={() => {
                                        setSelectedCategories(
                                            selectedCategories.includes(category)
                                                ? selectedCategories.filter((c) => c !== category)
                                                : [...selectedCategories, category]
                                        );
                                        scrollToFilters();
                                    }}
                                    className={`w-full text-left px-3 py-2.5 rounded transition text-sm font-medium ${
                                        selectedCategories.includes(category)
                                            ? 'bg-cyan-50 text-cyan-700 border border-cyan-100'
                                            : 'text-slate-700 hover:bg-slate-100'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span>{category}</span>
                                        <span className="text-xs font-semibold text-slate-500">({count})</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Price Range Filter */}
                    <div className="pt-6 border-t border-slate-100">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-[0.08em] mb-3">Cena</h3>
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
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
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
                </div>
            </aside>
            {/* Hero Section */}
            <div className="relative bg-gradient-to-br from-cyan-50 via-sky-50 to-emerald-50 lg:ml-56 scroll-mt-16" id="hero-section">
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
            <div className="py-10 px-4 sm:py-16 sm:px-6 lg:px-10 xl:px-12 lg:py-20 lg:ml-56 flex flex-col">

                {/* Search and Filters */}
                <div ref={filtersRef} id="product-filters" className="scroll-mt-24 flex flex-col gap-3 mb-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center">
                        {/* Search */}
                        <div className="relative flex-1">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="🔍 Hľadať produkt..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all shadow-none text-sm text-slate-900 placeholder:text-slate-400"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    aria-label="Vymazať hľadanie"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            )}
                        </div>
                        {/* Sort */}
                        <button
                            onClick={() => setPriceSortOrder(prev => prev === 'none' ? 'asc' : prev === 'asc' ? 'desc' : 'none')}
                            title={priceSortOrder === 'none' ? 'Zoradiť podľa ceny' : priceSortOrder === 'asc' ? 'Cena vzostupne' : 'Cena zostupne'}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                                priceSortOrder !== 'none'
                                    ? 'bg-cyan-600 border-cyan-500 text-white shadow-sm'
                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                            <ArrowsUpDownIcon className={`h-4 w-4 transition-transform ${
                                priceSortOrder === 'asc' ? 'rotate-0' : priceSortOrder === 'desc' ? 'rotate-180' : ''
                            }`} />
                            <span className="hidden sm:inline">{priceSortOrder === 'none' ? 'Cena' : priceSortOrder === 'asc' ? 'Cena ↑' : 'Cena ↓'}</span>
                        </button>
                    </div>
                    {/* Compatibility Filter */}
                    {compatibilityOptions.length > 0 && (
                        <div className="flex items-center gap-2">
                            <label htmlFor="compat-select" className="text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Kompatibilita:</label>
                            <div className="relative flex-1 max-w-sm">
                                <select
                                    id="compat-select"
                                    value={selectedCompatibility ? `${selectedCompatibility.section}|||${selectedCompatibility.compatibility_code}` : ''}
                                    onChange={(e) => {
                                        if (!e.target.value) {
                                            setSelectedCompatibility(null);
                                        } else {
                                            const [section, code] = e.target.value.split('|||');
                                            setSelectedCompatibility({ section, compatibility_code: code });
                                            scrollToFilters();
                                        }
                                    }}
                                    className={`w-full pl-3 pr-8 py-2 border rounded-lg text-sm appearance-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all ${
                                        selectedCompatibility
                                            ? 'bg-cyan-50 border-cyan-300 text-cyan-800 font-medium'
                                            : 'bg-slate-50 border-slate-200 text-slate-700'
                                    }`}
                                >
                                    <option value="">Všetky systémy</option>
                                    {Object.entries(compatibilityBySection).map(([section, codes]) => (
                                        <optgroup key={section} label={section}>
                                            {codes.map((code) => (
                                                <option key={code} value={`${section}|||${code}`}>
                                                    Kód {code}
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                                <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            </div>
                            {selectedCompatibility && (
                                <button
                                    onClick={() => setSelectedCompatibility(null)}
                                    className="text-xs text-cyan-600 hover:text-cyan-800 font-medium transition-colors"
                                >
                                    Zrušiť
                                </button>
                            )}
                        </div>
                    )}

                    {/* Sort Dropdown */}
                    <select
                        value={priceSortOrder}
                        onChange={(e) => setPriceSortOrder(e.target.value as 'asc' | 'desc' | 'none')}
                        className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all focus:ring-2 focus:ring-cyan-500/30 focus:outline-none"
                    >
                        <option value="none">Zoradiť</option>
                        <option value="asc">Cena: vzostupne</option>
                        <option value="desc">Cena: zostupne</option>
                    </select>

                    {/* Grid/List Toggle */}
                    <div className="hidden sm:flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition ${
                                viewMode === 'grid'
                                    ? 'bg-white shadow-sm text-cyan-600'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                            title="Zobrazenie: Grid"
                        >
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
                            </svg>
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition ${
                                viewMode === 'list'
                                    ? 'bg-white shadow-sm text-cyan-600'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                            title="Zobrazenie: List"
                        >
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Mobile Filters Button */}
                <div className="mb-6 lg:hidden flex gap-2">
                    <button
                        onClick={() => setMobileFiltersOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors relative"
                    >
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
                        </svg>
                        Filtre
                        {(selectedCategories.length > 0 || maxPrice < 500 || inStockOnly) && (
                            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-cyan-600"></span>
                        )}
                    </button>
                </div>

                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <SparklesIcon className="h-6 w-6 text-cyan-600" />
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Naše produkty</h2>
                    </div>
                    <span className="text-sm text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200">{visibleCount} produktov</span>
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
                                : 'grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-8'
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
                                    <div className={`${viewMode === 'list' ? 'w-32 h-32 flex-shrink-0' : 'w-full h-56 sm:h-60 lg:h-64'} overflow-hidden bg-slate-100`}>
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
                                    <div className="p-4 flex-1 flex flex-col">
                                        <div className="mb-2 min-h-[5.5rem]">
                                            <div className="min-h-[5.5rem]">
                                                <div className="flex items-start gap-2">
                                                    <h3 className="text-base font-semibold text-slate-900 group-hover:text-cyan-700 transition-colors line-clamp-2 min-h-[3.5rem] flex-1">
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

                                        <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                                            {product.price ? (
                                                <div className="flex items-center gap-2">
                                                    <SparklesIcon className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                                    <p className="text-xl font-bold bg-gradient-to-r from-cyan-600 to-emerald-600 bg-clip-text text-transparent">{product.price} €</p>
                                                </div>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-50 text-cyan-800">
                                                    <SparklesIcon className="h-3 w-3" />
                                                    Členská cena
                                                </span>
                                            )}
                                            {product.stock_quantity > 0 && product.stock_quantity <= 5 && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-yellow-50 text-yellow-800">
                                                    <ExclamationTriangleIcon className="h-3 w-3" />
                                                    Málo
                                                </span>
                                            )}
                                        </div>

                                        {!userIsAdmin && (
                                        <div className="mt-4">
                                            {product.price ? (() => {
                                                const cartItem = items.find(
                                                    item => item.productId === product.id && !item.variantReference
                                                );

                                                if (cartItem) {
                                                    return (
                                                        <div className="flex items-center justify-between bg-cyan-50 border border-cyan-200 rounded-md p-1 h-10 w-full shadow-sm">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (cartItem.quantity > 1) {
                                                                        updateQuantity(product.id, cartItem.quantity - 1);
                                                                    } else {
                                                                        removeItem(product.id);
                                                                    }
                                                                }}
                                                                className="w-10 h-full flex items-center justify-center text-cyan-700 hover:bg-cyan-100 rounded-md transition font-bold"
                                                            >
                                                                -
                                                            </button>
                                                            <span className="font-bold text-cyan-900 border-x border-cyan-200 px-4 flex-1 text-center h-full flex items-center justify-center bg-white">
                                                                {cartItem.quantity} <span className="text-xs font-normal text-cyan-600 ml-1">v košíku</span>
                                                            </span>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (cartItem.quantity >= product.stock_quantity) {
                                                                        toast.error(`Na sklade je iba ${product.stock_quantity} ks.`);
                                                                        return;
                                                                    }
                                                                    updateQuantity(product.id, cartItem.quantity + 1);
                                                                }}
                                                                disabled={cartItem.quantity >= product.stock_quantity}
                                                                className="w-10 h-full flex items-center justify-center text-cyan-700 hover:bg-cyan-100 rounded-md transition font-bold"
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                    );
                                                }

                                                if (product.stock_quantity <= 0) {
                                                    if (!isLoggedIn) {
                                                        return (
                                                            <Link
                                                                to="/login"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="w-full flex justify-center items-center px-4 py-2 border border-cyan-500 rounded-md shadow-sm text-sm font-medium text-cyan-700 bg-white hover:bg-cyan-50 focus:outline-none transition-colors h-10"
                                                            >
                                                                Prihláste sa
                                                            </Link>
                                                        );
                                                    }

                                                    return (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setProductToRequest(product);
                                                                setOpenRequestModal(true);
                                                            }}
                                                            className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-500 hover:bg-slate-600 focus:outline-none transition-all duration-300 h-10"
                                                        >
                                                            Požiadať produkt
                                                        </button>
                                                    );
                                                }

                                                return (
                                                    <button
                                                        onClick={(e) => handleAddToCart(e, product)}
                                                        disabled={addingId === product.id}
                                                        className={`w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none transition-all duration-300 transform h-10 ${addingId === product.id
                                                            ? 'bg-emerald-500 scale-105'
                                                            : 'bg-cyan-600 hover:bg-cyan-700'
                                                            }`}
                                                    >
                                                        {addingId === product.id ? (
                                                            <>
                                                                <svg className="h-5 w-5 mr-2 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                                Pridané!
                                                            </>
                                                        ) : (
                                                            <>
                                                                <ShoppingCartIcon className="h-4 w-4 mr-2" />
                                                                Pridať do košíka
                                                            </>
                                                        )}
                                                    </button>
                                                );
                                            })() : (
                                                <Link
                                                    to="/login"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="w-full flex justify-center items-center px-4 py-2 border border-cyan-500 rounded-md shadow-sm text-sm font-medium text-cyan-700 bg-white hover:bg-cyan-50 focus:outline-none transition-colors h-10"
                                                >
                                                    Prihláste sa
                                                </Link>
                                            )}
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

                        {/* Categories */}
                        <div className="mb-6">
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

                        {/* Price Range */}
                        <div className="mb-6 pt-6 border-t border-slate-100">
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
                            className="w-full mt-6 px-4 py-3 bg-gradient-to-r from-cyan-600 to-emerald-600 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
                        >
                            Použiť filtre
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
