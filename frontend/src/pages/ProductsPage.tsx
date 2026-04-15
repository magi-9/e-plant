import { useState, useEffect, useRef, useCallback } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getProductCount, getProducts, type Product, type ProductListParams } from '../api/products';
import { Link } from 'react-router-dom';
import { ShoppingCartIcon } from '@heroicons/react/24/solid';
import { MagnifyingGlassIcon, ArrowsUpDownIcon, ArrowUpIcon, ChevronDownIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useCartStore } from '../store/cartStore';
import ProductDetailModal from '../components/ProductDetailModal';
import { isAdmin } from '../api/auth';

const getCategoryList = (product: Product): string[] => {
    const raw = product.all_categories || product.parameters?.all_categories || product.category || '';
    return raw
        .split(';')
        .map((value) => value.trim())
        .filter(Boolean);
};

const PAGE_SIZE = 20;

export default function ProductsPage() {
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const filtersRef = useRef<HTMLDivElement>(null);
    const userIsAdmin = isAdmin();
    const { addItem, items, updateQuantity, removeItem } = useCartStore();
    
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [openModal, setOpenModal] = useState(false);
    const [addingId, setAddingId] = useState<number | null>(null);
    const [showScrollTop, setShowScrollTop] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [priceSortOrder, setPriceSortOrder] = useState<'asc' | 'desc' | 'none'>('none');

    // Build query params with filters
    const buildParams = useCallback((offset: number): ProductListParams => {
        const params: ProductListParams = { limit: PAGE_SIZE, offset };
        if (searchQuery) params.search = searchQuery;
        return params;
    }, [searchQuery]);

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetching,
        isFetchingNextPage,
        isLoading,
        error,
    } = useInfiniteQuery({
        queryKey: ['products', searchQuery],
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
    });

    const { data: databaseProductCount } = useQuery({
        queryKey: ['products-count', searchQuery, selectedCategories],
        queryFn: () => getProductCount({ search: searchQuery, categories: selectedCategories }),
    });

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

        setAddingId(product.id);
        addItem({
            productId: product.id,
            name: product.name,
            price: product.price!,
            image: product.image
        });

        setTimeout(() => {
            setAddingId(null);
        }, 600);
    };

    if (isLoading) return (
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

    // Extract all unique categories from current products
    const categories = Array.from(
        new Set(allProducts.flatMap((product: Product) => getCategoryList(product)))
    );

    // Apply filters to all loaded products
    const filteredProducts = allProducts.filter((product: Product) => {
        // Category filter
        if (
            selectedCategories.length > 0
            && !getCategoryList(product).some((category) => selectedCategories.includes(category))
        ) {
            return false;
        }
        return true;
    });

    // Apply price sort
    if (priceSortOrder !== 'none') {
        filteredProducts.sort((a: Product, b: Product) => {
            const priceA = parseFloat(a.price || '0');
            const priceB = parseFloat(b.price || '0');
            return priceSortOrder === 'asc' ? priceA - priceB : priceB - priceA;
        });
    }

    const visibleCount = databaseProductCount ?? filteredProducts.length;

    return (
        <div className="bg-slate-50 flex flex-col text-slate-900 relative">
            {/* Left Sidebar - Categories (Desktop only) */}
            <aside className="hidden lg:block w-56 bg-white border-r border-slate-200 fixed left-0 top-16 bottom-0 overflow-y-auto">
                <div className="p-5">
                    <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-[0.08em]">Kategórie</h3>
                    <div className="space-y-1.5">
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
                            Všetko
                        </button>
                        {categories.map((category: string) => (
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
                                {category}
                            </button>
                        ))}
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
                            src="/digitalabutment-logo.png"
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
                <div ref={filtersRef} id="product-filters" className="scroll-mt-24 flex flex-col gap-3 md:flex-row md:items-center mb-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    {/* Search */}
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Hľadať produkt..."
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
                    {/* Info Button */}
                    <Link
                        to="/about"
                        className="flex items-center justify-center p-2.5 rounded-lg border border-slate-200 text-slate-600 hover:text-cyan-600 hover:border-cyan-300 hover:bg-cyan-50 transition-all"
                        title="O nás a GDPR informácie"
                        aria-label="O nás"
                    >
                        <InformationCircleIcon className="h-5 w-5" />
                    </Link>
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

                {/* Category Badges */}
                {categories.length > 0 && (
                    <div className="mb-8 flex flex-wrap gap-2 lg:hidden">
                        {categories.map((cat: string) => (
                            <button
                                key={cat}
                                onClick={() => {
                                    setSelectedCategories(prev =>
                                        prev.includes(cat)
                                            ? prev.filter(c => c !== cat)
                                            : [...prev, cat]
                                    );
                                    scrollToFilters();
                                }}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border shadow-sm ${selectedCategories.includes(cat)
                                        ? 'bg-cyan-600 border-cyan-500 text-white'
                                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Naše produkty</h2>
                    <span className="text-sm text-slate-600">{visibleCount} produktov</span>
                </div>

                {filteredProducts.length === 0 && !isFetching ? (
                    <div className="text-center py-20 bg-white rounded-lg border border-slate-200">
                        <p className="text-slate-600 text-lg">Nenašli sa žiadne produkty vyhovujúce filtrom.</p>
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedCategories([]);
                                setPriceSortOrder('none');
                            }}
                            className="mt-4 text-cyan-600 hover:text-cyan-500 font-medium"
                        >
                            Zrušiť filtre
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-8">
                            {filteredProducts.map((product: Product, index: number) => (
                                <div
                                    key={product.id}
                                    onClick={() => handleProductClick(product)}
                                    style={{
                                        animation: `slideUp 0.5s ease-out ${Math.min((index % PAGE_SIZE) * 40, 320)}ms both`,
                                    }}
                                    className="group relative bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm hover:shadow-xl hover:border-cyan-300 transition-all duration-300 cursor-pointer flex flex-col"
                                >
                                    <div className="w-full h-56 sm:h-60 lg:h-64 overflow-hidden bg-slate-100">
                                        {product.image ? (
                                            <img
                                                src={product.image}
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
                                    <div className="p-4 flex-1 flex flex-col">
                                        <div className="mb-2 min-h-[5.5rem]">
                                            <div className="min-h-[5.5rem]">
                                                <h3 className="text-base font-semibold text-slate-900 group-hover:text-cyan-700 transition-colors line-clamp-2 min-h-[3.5rem]">
                                                    {product.name}
                                                </h3>
                                                {product.reference && (
                                                    <p className="mt-0.5 text-[11px] text-slate-500 font-medium truncate">{product.reference}</p>
                                                )}
                                                <p className="mt-1 text-xs text-cyan-700 font-medium line-clamp-1">
                                                    {getCategoryList(product).join(', ') || product.category}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                                            {product.price ? (
                                                <p className="text-xl font-bold text-cyan-700">{product.price} €</p>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-50 text-cyan-800">
                                                    Členská cena
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
                                                                    updateQuantity(product.id, cartItem.quantity + 1);
                                                                }}
                                                                className="w-10 h-full flex items-center justify-center text-cyan-700 hover:bg-cyan-100 rounded-md transition font-bold"
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <button
                                                        onClick={(e) => handleAddToCart(e, product)}
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
